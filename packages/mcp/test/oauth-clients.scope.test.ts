/** Real Durable Object SQL and production client policy/cache. Fetch, clock
 * and deadline are explicit stand-ins. No real network egress belongs here. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { utf8 } from "@generalbusiness/dap-bytes";
import { OAuthClients, oauthMetadataOrigins, oauthPolicy, type OAuthClientPorts } from "../src/oauth-clients.ts";
import { OAuthError, oauthRedirectPolicy } from "../src/oauth-parameters.ts";
import type { Sql } from "../src/sqlite-custody.ts";

const ID = "https://claude.ai/oauth/client.json", REDIRECT = "https://claude.ai/api/mcp/auth_callback", START = Date.parse("2099-01-01T00:00:00Z");
const document = (id = ID) => ({ client_id: id, client_name: "Claude", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none", logo_uri: "http://127.0.0.1/private" });
const reply = (id = ID) => new Response(JSON.stringify(document(id)), { headers: { "content-type": "application/json; charset=utf-8" } });

test("metadata refuses unknown origins before fetch and caches only exact, bounded, redirect-free documents", async () => {
  const stub = env.REGISTRIES.get(env.REGISTRIES.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    let now = START, calls = 0, response = () => reply();
    const clients = new OAuthClients(sql, { now: () => now, random: n => crypto.getRandomValues(new Uint8Array(n)), fetch: async (url, init) => {
      calls++; expect(url).not.toContain("127.0.0.1"); expect(init.redirect).toBe("manual"); expect(init.credentials).toBe("omit"); expect(init.headers).toEqual({ accept: "application/json" }); return response();
    } });
    const policy = oauthPolicy({})!;
    expect(oauthMetadataOrigins('["https://claude.ai/"]')).toBeNull();
    expect(oauthPolicy({ OAUTH_CLIENT_METADATA_ORIGINS: "bad" })).toBeNull();
    for (const id of ["https://foreign.example/client.json", "https://claude.ai@127.0.0.1/private", "https://claude.ai/a/../private", "https://claude.ai/%2e%2e/private", ID + "#fragment"]) {
      await expect(clients.resolve(id, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    }
    expect(calls).toBe(0);
    for (const bad of [() => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }), () => reply(ID + "/other"), () => new Response(" ".repeat(5121), { headers: { "content-type": "application/json" } })]) {
      response = bad;
      await expect(clients.resolve(ID, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
      expect(sql.exec(`SELECT count(*) AS n FROM oauth_client_cache`).toArray()[0]!["n"]).toBe(0);
    }
    response = () => reply();
    expect(await clients.resolve(ID, policy)).toMatchObject({ client_id: ID, client_name: "Claude" });
    const fetched = calls;
    expect((await clients.resolve(ID, policy)).redirect_uris).toEqual([REDIRECT]); expect(calls).toBe(fetched);
    now += 3_600_000;
    await clients.resolve(ID, policy); expect(calls).toBe(fetched + 1);
    const foreign = "https://foreign.example/client.json";
    response = () => reply(foreign);
    const admitted = await clients.resolve(foreign, oauthPolicy({ OAUTH_CLIENT_METADATA_ORIGINS: '["https://foreign.example"]' })!);
    expect([admitted.client_name, new URL(admitted.client_id).hostname]).toEqual(["Claude", "foreign.example"]);
    // A document's logo URL never becomes another fetch.
    expect(calls).toBe(fetched + 2);
  });
});

test("a five-second metadata deadline cancels a held body and cannot populate the cache later", async () => {
  const stub = env.REGISTRIES.get(env.REGISTRIES.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    let fire!: () => void, cancelled = false, stopped = false, arrived!: () => void;
    const entered = new Promise<void>(r => { arrived = r; });
    const ports: OAuthClientPorts = { now: () => START, random: n => new Uint8Array(n), deadline: (ms, run) => { expect(ms).toBe(5000); fire = run; return () => { stopped = true; }; },
      fetch: async () => new Response(new ReadableStream<Uint8Array>({ pull: () => { arrived(); }, cancel: () => { cancelled = true; } }), { headers: { "content-type": "application/json" } }) };
    const pending = new OAuthClients(sql, ports).resolve(ID, oauthPolicy({})!);
    const rejected = expect(pending).rejects.toMatchObject({ error: "temporarily_unavailable", status: 503 });
    await entered; fire(); await rejected;
    expect(cancelled).toBe(true); expect(stopped).toBe(true);
    expect(sql.exec(`SELECT count(*) AS n FROM oauth_client_cache`).toArray()[0]!["n"]).toBe(0);
  });
});

test("public registration survives a new registry instance and refuses client 1001 without replacing a prior client", async () => {
  const stub = env.REGISTRIES.get(env.REGISTRIES.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    const ports: OAuthClientPorts = { now: () => START, random: n => crypto.getRandomValues(new Uint8Array(n)), fetch: async () => { throw Error("Registered clients require no fetch"); } };
    let clients = new OAuthClients(sql, ports);
    const bytes = utf8(JSON.stringify({ client_name: "TEST registered", redirect_uris: [REDIRECT] }));
    const first = clients.register(bytes, oauthRedirectPolicy()!);
    expect(first).not.toHaveProperty("client_secret"); expect(first.client_id_issued_at).toBe(START / 1000);
    clients = new OAuthClients(sql, ports);
    expect((await clients.resolve(first.client_id, oauthPolicy({})!)).client_name).toBe("TEST registered");
    for (let n = 1; n < 1000; n++) clients.register(bytes, oauthRedirectPolicy()!);
    expect(() => clients.register(bytes, oauthRedirectPolicy()!)).toThrowError(OAuthError);
    try { clients.register(bytes, oauthRedirectPolicy()!); } catch (error) { expect(error).toMatchObject({ error: "temporarily_unavailable", status: 503 }); }
    expect(sql.exec(`SELECT count(*) AS n FROM oauth_client`).toArray()[0]!["n"]).toBe(1000);
    expect((await clients.resolve(first.client_id, oauthPolicy({})!)).client_name).toBe("TEST registered");
  });
});
