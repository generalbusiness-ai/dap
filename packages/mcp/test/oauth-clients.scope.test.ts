/** Real Durable Object SQL and production client policy/cache. Fetch, clock
 * and deadline are explicit stand-ins. No real network egress belongs here. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import { canonicalize, digestBytes, keyIdOfSecret, signControl, timeOf, utf8 } from "@generalbusiness/dap-bytes";
import { OAuthClients, oauthMetadataOrigins, oauthPolicy, type OAuthClientPorts } from "../src/oauth-clients.ts";
import { OAUTH_GRANT_MS } from "../src/oauth-access.ts";
import { OAUTH_CLIENT_UNUSED_MS, OAuthError, oauthRedirectPolicy } from "../src/oauth-parameters.ts";
import type { Sql } from "../src/sqlite-custody.ts";
import { hostedRolePort, HostedRegistry } from "../src/hosted.ts";
import type { ScopeRef } from "@generalbusiness/dap-contract";

const ID = "https://claude.ai/oauth/client.json", REDIRECT = "https://claude.ai/api/mcp/auth_callback", START = Date.parse("2099-01-01T00:00:00Z");
const document = (id = ID) => ({ client_id: id, client_name: "Claude", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none", logo_uri: "http://127.0.0.1/private" });
const reply = (id = ID) => new Response(JSON.stringify(document(id)), { headers: { "content-type": "application/json; charset=utf-8" } });

test("metadata refuses unknown origins before fetch and caches only exact, bounded, redirect-free documents", async () => {
  const stub = env.REGISTRIES.get(env.REGISTRIES.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (q, ...v) => state.storage.sql.exec(q, ...v), transaction: run => state.storage.transactionSync(run) };
    let now = START, calls = 0, response = () => reply();
    const ports: OAuthClientPorts = { now: () => now, random: n => crypto.getRandomValues(new Uint8Array(n)), fetch: async (url, init) => {
      calls++; expect(url).not.toContain("127.0.0.1"); expect(init.redirect).toBe("manual"); expect(init.credentials).toBe("omit"); expect(init.headers).toEqual({ accept: "application/json" }); return response();
    } };
    let clients = new OAuthClients(sql, ports);
    const policy = oauthPolicy({})!;
    expect(oauthMetadataOrigins('["https://claude.ai/"]')).toBeNull();
    expect(oauthPolicy({ OAUTH_CLIENT_METADATA_ORIGINS: "bad" })).toBeNull();
    for (const id of ["https://foreign.example/client.json", "https://claude.ai@127.0.0.1/private", "https://claude.ai/a/../private", "https://claude.ai/%2e%2e/private", ID + "#fragment"]) {
      await expect(clients.resolve(id, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    }
    expect(calls).toBe(0);
    for (const bad of [() => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }), () => reply(ID + "/other"), () => new Response(" ".repeat(5121), { headers: { "content-type": "application/json" } })]) {
      response = bad; const before = calls;
      await expect(clients.resolve(ID, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
      expect(calls).toBe(before + 1);
      expect(sql.exec(`SELECT count(*) AS n FROM oauth_client_cache`).toArray()[0]!["n"]).toBe(0);
      now += 60_000; // Each original rejection must reach its own document, not another negative result.
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

    const badId = ID + "?invalid";
    response = () => new Response("{", { headers: { "content-type": "application/json" } });
    await expect(clients.resolve(badId, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    const onceInvalid = calls;
    await expect(clients.resolve(badId, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    clients = new OAuthClients(sql, ports);
    await expect(clients.resolve(badId, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(calls).toBe(onceInvalid);
    const otherPolicy = oauthPolicy({ OAUTH_REDIRECT_URIS: JSON.stringify([REDIRECT]) })!;
    await expect(clients.resolve(badId, otherPolicy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(calls).toBe(onceInvalid + 1);
    now += 60_000;
    await expect(clients.resolve(badId, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(calls).toBe(onceInvalid + 2);
    now--; // A future-created invalid row cannot answer under a backward clock.
    await expect(clients.resolve(badId, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(calls).toBe(onceInvalid + 3);
    const transientId = ID + "?transient";
    response = () => new Response(null, { status: 503 });
    const beforeTransient = calls;
    for (let n = 0; n < 2; n++) await expect(clients.resolve(transientId, policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(calls).toBe(beforeTransient + 2); // Preserve the old outward error, but never cache a transient HTTP failure.
    response = () => { throw Error("TEST metadata network loss"); };
    const beforeLoss = calls;
    for (let n = 0; n < 2; n++) await expect(clients.resolve(transientId, policy)).rejects.toMatchObject({ error: "temporarily_unavailable", status: 503 });
    expect(calls).toBe(beforeLoss + 2);
    const policyId = ID + "?policy";
    response = () => reply(policyId);
    const restrictive = oauthPolicy({ OAUTH_REDIRECT_URIS: JSON.stringify(["https://claude.ai/TEST-other-redirect"]) })!;
    await expect(clients.resolve(policyId, restrictive)).rejects.toMatchObject({ error: "invalid_redirect_uri" });
    const deniedOnce = calls;
    await expect(clients.resolve(policyId, restrictive)).rejects.toMatchObject({ error: "invalid_redirect_uri" });
    expect(calls).toBe(deniedOnce);
    expect((await clients.resolve(policyId, policy)).client_id).toBe(policyId);
    expect(calls).toBe(deniedOnce + 1);
    const inFlightId = ID + "?in-flight-policy";
    let heldBody!: ReadableStreamDefaultController<Uint8Array>;
    const held = new ReadableStream<Uint8Array>({ start: controller => { heldBody = controller; } });
    response = () => new Response(held, { headers: { "content-type": "application/json" } });
    const incompatible = clients.resolve(inFlightId, restrictive);
    const incompatibleRefusal = expect(incompatible).rejects.toMatchObject({ error: "invalid_redirect_uri" });
    response = () => reply(inFlightId);
    try { expect((await clients.resolve(inFlightId, policy)).client_id).toBe(inFlightId); }
    finally { heldBody.enqueue(utf8(JSON.stringify(document(inFlightId)))); heldBody.close(); }
    await incompatibleRefusal;
    sql.exec(`DELETE FROM oauth_client_invalid`);
    sql.exec(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 1000) INSERT INTO oauth_client_invalid (key, error, created, expires) SELECT 'TEST retained invalid-' || x, 'invalid_client_metadata', ?, ? FROM n`, now, now + 60_000);
    response = () => new Response("{", { headers: { "content-type": "application/json" } });
    const beforeFullInvalid = calls;
    for (let n = 0; n < 2; n++) await expect(clients.resolve(ID + "?uncached-at-capacity", policy)).rejects.toMatchObject({ error: "invalid_client_metadata" });
    expect(calls).toBe(beforeFullInvalid + 2);
    expect(sql.exec(`SELECT count(*) AS n FROM oauth_client_invalid`).toArray()[0]!["n"]).toBe(1000);

    // Actual signed Registry entry and durable counters; observations are explicit stand-ins.
    const key = new Uint8Array(32).fill(6), otherKey = new Uint8Array(32).fill(7);
    const body = utf8(JSON.stringify({ after: null })), service = "https://room.example";
    const membership: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "membership" };
    let observations = 0;
    const registryPorts = { now: () => now, mintId: (): never => { throw Error("A read cannot allocate an Agent"); }, agent: (): never => { throw Error("A read cannot call an Agent"); },
      observe: async () => expect.fail("A connection listing must use current actor-role facts"),
      roleStanding: hostedRolePort(async request => {
        observations++;
        if ("agent" in request) return { status: "unavailable" };
        return { status: "observed", of: membership, head: { seq: 0, hash: digestBytes(body) }, actor: {
          key: request.actor, keyState: "active", memberState: "active", member: "@owner", controller: null, actions: [],
        } };
      }) };
    let registry = new HostedRegistry(sql, registryPorts);
    const signedRead = (op: string, secret = key) => signControl({ v: 1, action: "connections", service, membership, agent: null, actor: keyIdOfSecret(secret), body: digestBytes(body), op, notAfter: timeOf(now + 60_000) }, secret);
    const read = (op: string, secret = key) => registry.connections(signedRead(op, secret), body, service);
    for (let n = 0; n < 120; n++) expect((await read("TEST bounded read-" + n)).status).toBe(200);
    const beforeLimited = observations;
    expect((await read("TEST refused window")).status).toBe(429);
    expect(observations).toBe(beforeLimited);
    registry = new HostedRegistry(sql, registryPorts);
    expect((await read("TEST reconstructed window")).status).toBe(429);
    const beforeTamper = sql.exec(`SELECT * FROM mcp_request_window ORDER BY purpose, identity`).toArray();
    const signed = signedRead("TEST valid before tamper");
    expect((await registry.connections({ ...signed, request: { ...signed.request, op: "TEST changed after signing" } }, body, service)).status).toBe(403);
    expect(sql.exec(`SELECT * FROM mcp_request_window ORDER BY purpose, identity`).toArray()).toEqual(beforeTamper);
    expect((await read("TEST independent key", otherKey)).status).toBe(200);
    now--;
    expect((await read("TEST backward window clock", otherKey)).status).toBe(503);
    now += 60_001;
    expect((await read("TEST expired window")).status).toBe(200);
    sql.exec(`DELETE FROM mcp_request_window WHERE purpose = 'control'`);
    sql.exec(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 4096) INSERT INTO mcp_request_window (purpose, identity, since, calls) SELECT 'control', 'identity:TEST existing-' || x, ?, 1 FROM n`, now);
    for (let n = 0; n < 120; n++) expect((await read("TEST overflow read-" + n)).status).toBe(200);
    expect((await read("TEST exhausted overflow")).status).toBe(429);
    expect(sql.exec(`SELECT count(*) AS n FROM mcp_request_window WHERE purpose = 'control'`).toArray()[0]!["n"]).toBe(4097);
    expect(sql.exec(`SELECT calls FROM mcp_request_window WHERE purpose = 'control' AND identity = 'identity:TEST existing-1'`).toArray()[0]!["calls"]).toBe(1);
    now += 60_000;
    expect((await read("TEST expired overflow")).status).toBe(200);
    expect(sql.exec(`SELECT count(*) AS n FROM mcp_request_window WHERE purpose = 'control'`).toArray()[0]!["n"]).toBe(1);
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
    const invalidTable = sql.exec(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'oauth_client_invalid'`).toArray().length;
    expect(invalidTable ? sql.exec(`SELECT count(*) AS n FROM oauth_client_invalid`).toArray()[0]!["n"] : 0).toBe(0);
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
