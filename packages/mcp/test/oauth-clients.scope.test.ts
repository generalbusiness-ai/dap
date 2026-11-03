/** Real Durable Object SQL and production client policy/cache. Fetch, clock
 * and deadline are explicit stand-ins. No real network egress belongs here. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { OAuthClients, oauthMetadataOrigins, oauthPolicy, type OAuthClientPorts } from "../src/oauth-clients.ts";
import { OAUTH_GRANT_MS } from "../src/oauth-access.ts";
import { OAUTH_CLIENT_UNUSED_MS, OAuthError, oauthRedirectPolicy } from "../src/oauth-parameters.ts";
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

test("public registration reclaims expired unused rows without renewing them on lookup or replacing protected clients", async () => {
  const stub = env.REGISTRIES.get(env.REGISTRIES.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    let now = START;
    const ports: OAuthClientPorts = { now: () => now, random: n => crypto.getRandomValues(new Uint8Array(n)), fetch: async () => { throw Error("Registered clients require no fetch"); } };
    let clients = new OAuthClients(sql, ports);
    const bytes = utf8(JSON.stringify({ client_name: "TEST registered", redirect_uris: [REDIRECT] }));
    const first = clients.register(bytes, oauthRedirectPolicy()!);
    expect(first).not.toHaveProperty("client_secret"); expect(first.client_id_issued_at).toBe(START / 1000);
    const protectedId = clients.register(bytes, oauthRedirectPolicy()!).client_id;
    const protectedClient = await clients.resolve(protectedId, oauthPolicy({})!);
    expect(clients.retain(protectedClient)).toBe(START + OAUTH_GRANT_MS);
    expect(() => clients.retain({ ...protectedClient, client_name: "changed" })).toThrowError(OAuthError);
    now += 1000;
    for (let n = 2; n < 1000; n++) clients.register(bytes, oauthRedirectPolicy()!);
    clients = new OAuthClients(sql, ports);
    expect((await clients.resolve(first.client_id, oauthPolicy({})!)).client_name).toBe("TEST registered");
    try { clients.register(bytes, oauthRedirectPolicy()!); throw Error("Full live table accepted another client"); }
    catch (error) { expect(error).toMatchObject({ error: "temporarily_unavailable", status: 503 }); }
    expect(sql.exec(`SELECT count(*) AS n FROM oauth_client`).toArray()[0]!["n"]).toBe(1000);
    now = START + OAUTH_CLIENT_UNUSED_MS - 1;
    await clients.resolve(first.client_id, oauthPolicy({})!); // anonymous lookup must not renew it
    now++;
    await expect(clients.resolve(first.client_id, oauthPolicy({})!)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(() => clients.retain({ ...protectedClient, client_id: first.client_id })).toThrowError(OAuthError);
    const next = clients.register(bytes, oauthRedirectPolicy()!);
    expect(next.client_id).not.toBe(first.client_id);
    expect(sql.exec(`SELECT count(*) AS n FROM oauth_client`).toArray()[0]!["n"]).toBe(1000);
    expect((await clients.resolve(protectedId, oauthPolicy({})!)).client_name).toBe("TEST registered");
    clients = new OAuthClients(sql, ports);
    expect(sql.exec(`SELECT expires FROM oauth_client WHERE id = ?`, protectedId).toArray()[0]!["expires"]).toBe(START + OAUTH_GRANT_MS);
    now = START + OAUTH_GRANT_MS;
    await expect(clients.resolve(protectedId, oauthPolicy({})!)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(clients.register(bytes, oauthRedirectPolicy()!).client_id).not.toBe(protectedId);
  });
});

test("pre-upgrade registrations receive one persisted migration deadline that reconstruction cannot extend", async () => {
  const stub = env.REGISTRIES.get(env.REGISTRIES.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    const id = "dap-client-" + "A".repeat(43), row = { client_id: id, client_name: "TEST old client", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" as const };
    sql.exec(`CREATE TABLE oauth_client (id TEXT PRIMARY KEY, row TEXT NOT NULL, created INTEGER NOT NULL)`);
    sql.exec(`INSERT INTO oauth_client VALUES (?, ?, ?)`, id, canonicalize(row), START - OAUTH_GRANT_MS);
    let now = START;
    const ports: OAuthClientPorts = { now: () => now, random: n => crypto.getRandomValues(new Uint8Array(n)), fetch: async () => { throw Error("No metadata fetch"); } };
    let clients = new OAuthClients(sql, ports);
    expect(await clients.resolve(id, oauthPolicy({})!)).toEqual(row);
    now += OAUTH_CLIENT_UNUSED_MS + 1;
    clients = new OAuthClients(sql, ports);
    expect(await clients.resolve(id, oauthPolicy({})!)).toEqual(row);
    expect(sql.exec(`SELECT expires FROM oauth_client WHERE id = ?`, id).toArray()[0]!["expires"]).toBe(START + OAUTH_GRANT_MS);
    now = START + OAUTH_GRANT_MS;
    clients = new OAuthClients(sql, ports);
    await expect(clients.resolve(id, oauthPolicy({})!)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    clients.register(utf8(JSON.stringify({ client_name: "TEST replacement", redirect_uris: [REDIRECT] })), oauthRedirectPolicy()!);
    expect(sql.exec(`SELECT id FROM oauth_client WHERE id = ?`, id).toArray()).toEqual([]);
  });
});
