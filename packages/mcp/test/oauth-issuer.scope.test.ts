/** Real Durable Object SQL and production issuer/access code. Agent identity,
 * standing, clock, randomness and transport callbacks are explicit stand-ins;
 * these cases prove no Native enrollment, browser consent or network delivery. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { digestBytes, keyIdOfSecret, utf8 } from "@generalbusiness/dap-bytes";
import { OAuthAccess, OAUTH_ACCESS_MS, OAUTH_GRANT_MS, type OAuthAgentIdentity } from "../src/oauth-access.ts";
import { OAuthIssuer, type OAuthIssuerPorts, type OAuthResult } from "../src/oauth-issuer.ts";
import type { OAuthBinding } from "../src/oauth-parameters.ts";
import type { Sql } from "../src/sqlite-custody.ts";

const START = Date.parse("2099-01-01T00:00:00Z"), CLIENT = "https://clients.example/metadata.json", REDIRECT = "https://claude.ai/api/mcp/auth_callback", RESOURCE = "https://room.example/mcp?host=claude";
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const BINDING: OAuthBinding = { client_id: CLIENT, redirect_uri: REDIRECT, code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", resource: RESOURCE, scope: "mcp", state_digest: digestBytes(utf8("state")) };
const MEMBERSHIP: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "membership" };
function fixture(sql: Sql, id: string) {
  sql.exec(`CREATE TABLE test_issuer_budget (used INTEGER NOT NULL)`); sql.exec(`INSERT INTO test_issuer_budget VALUES (0)`);
  const state = { now: START, limit: 16 * 1024 * 1024, reads: 0, standing: "active" as "active" | "inactive" | "unavailable", hold: null as Promise<void> | null, random: 0, ended: [] as string[], rotated: [] as string[] };
  const identity: OAuthAgentIdentity = { state: "enrolled", membership: MEMBERSHIP, key: keyIdOfSecret(new Uint8Array(32).fill(3)), handle: "@agent" };
  const charge = (bytes: number) => {
    const before = Number(sql.exec(`SELECT used FROM test_issuer_budget`).toArray()[0]!["used"]);
    if (before + bytes > state.limit) return false;
    expect(before + bytes).toBeGreaterThanOrEqual(0);
    sql.exec(`UPDATE test_issuer_budget SET used = ?`, before + bytes); return true;
  };
  const ports: OAuthIssuerPorts = { id, now: () => state.now, agent: () => identity, charge,
    random: n => new Uint8Array(n).fill(++state.random),
    standing: async () => { state.reads++; await state.hold; return state.standing; },
    ended: async id => { state.ended.push(id); }, rotated: async id => { state.rotated.push(id); },
  };
  const access = () => new OAuthAccess(sql, { now: ports.now, agent: ports.agent, charge: n => { expect(charge(n)).toBe(true); }, observe: async (_membership, ask) => "key" in ask
    ? { keyState: "active", memberState: "active", member: "@agent", controller: "@owner" } : { memberState: "active" } });
  let admitted = access();
  let issuer = new OAuthIssuer(sql, ports, admitted);
  return { state, ports, get access() { return admitted; }, get issuer() { return issuer; }, restart: () => { admitted = access(); issuer = new OAuthIssuer(sql, ports, admitted); },
    used: () => Number(sql.exec(`SELECT used FROM test_issuer_budget`).toArray()[0]!["used"]) };
}
function token(result: OAuthResult, key: string): [string, string, string] {
  const value = result.body[key]; expect(typeof value).toBe("string");
  const parts = String(value).split("."); expect(parts).toHaveLength(3); return parts as [string, string, string];
}

test("codes bind the request once, refresh survives access expiry, and reuse of any rotated refresh ends the durable grant", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const f = fixture(sql, state.id.toString()), secrets: string[] = [];
    const issued = await f.issuer.issue("first", "@owner" as MemberId, BINDING, "TEST client"); expect(issued.status).toBe(201);
    const [, id, code] = token(issued, "code"); secrets.push(code);
    const replayed = await f.issuer.issue("first", "@owner" as MemberId, BINDING, "TEST client");
    expect(replayed.body).toMatchObject({ grant: id, codeShown: true }); expect(replayed.body).not.toHaveProperty("code");
    for (const [client, redirect, verifier, resource] of [
      [CLIENT + "/other", REDIRECT, VERIFIER, RESOURCE], [CLIENT, REDIRECT + "/other", VERIFIER, RESOURCE],
      [CLIENT, REDIRECT, "x".repeat(43), RESOURCE], [CLIENT, REDIRECT, VERIFIER, "https://room.example/mcp?host=chatgpt"],
    ]) expect((await f.issuer.exchange(id, code, client!, redirect!, verifier!, resource)).body).toEqual({ error: "invalid_grant" });
    expect(f.state.reads).toBe(0);
    f.restart();
    const exchanged = await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER, RESOURCE); expect(exchanged.status).toBe(200);
    const [, grant, access] = token(exchanged, "access_token"), [, , refresh] = token(exchanged, "refresh_token"); secrets.push(access, refresh);
    expect(f.access.inspect(grant, access, RESOURCE)).not.toBeNull();
    expect((await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER)).body).toEqual({ error: "invalid_grant" });
    expect(f.access.inspect(grant, access, RESOURCE)).toBeNull();
    expect(f.state.ended).toContain(id);
    const second = await f.issuer.issue("second", "@owner" as MemberId, BINDING, "TEST client"), [, secondId, secondCode] = token(second, "code"); secrets.push(secondCode);
    const firstTokens = await f.issuer.exchange(secondId, secondCode, CLIENT, REDIRECT, VERIFIER);
    const [, , firstAccess] = token(firstTokens, "access_token"), [, , firstRefresh] = token(firstTokens, "refresh_token"); secrets.push(firstAccess, firstRefresh);
    f.state.now += OAUTH_ACCESS_MS + 1;
    expect(f.access.inspect(secondId, firstAccess, RESOURCE)).toBeNull();
    const rotated = await f.issuer.refresh(secondId, firstRefresh, CLIENT, RESOURCE); expect(rotated.status).toBe(200);
    const [, , nextAccess] = token(rotated, "access_token"), [, , nextRefresh] = token(rotated, "refresh_token"); secrets.push(nextAccess, nextRefresh);
    expect(f.access.inspect(secondId, nextAccess, RESOURCE)?.grant.ends).toBe(START + OAUTH_GRANT_MS);
    f.restart();
    const twice = await f.issuer.refresh(secondId, nextRefresh, CLIENT); expect(twice.status).toBe(200);
    const [, , lastAccess] = token(twice, "access_token"), [, , lastRefresh] = token(twice, "refresh_token"); secrets.push(lastAccess, lastRefresh);
    expect((await f.issuer.refresh(secondId, firstRefresh, CLIENT)).body).toEqual({ error: "invalid_grant" });
    expect(f.access.inspect(secondId, lastAccess, RESOURCE)).toBeNull();
    expect(sql.exec(`SELECT count(*) AS n FROM oauth_refresh_used WHERE grant_id = ?`, secondId).toArray()[0]!["n"]).toBe(0);
    expect(f.state.rotated).toHaveLength(4);
    const stored = JSON.stringify({ details: sql.exec(`SELECT * FROM oauth_issuer`).toArray(), access: sql.exec(`SELECT * FROM oauth_grant`).toArray(), used: sql.exec(`SELECT * FROM oauth_refresh_used`).toArray() });
    for (const secret of secrets) expect(stored).not.toContain(secret);
  });
});

test("the live-grant bound, code expiry, budget refusal and authority waits preserve durable revocation", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const f = fixture(sql, state.id.toString());
    f.state.limit = 0;
    await expect(f.issuer.issue("full", "@owner" as MemberId, BINDING, "TEST")).rejects.toMatchObject({ error: "temporarily_unavailable", status: 503 });
    expect(f.used()).toBe(0); expect(sql.exec(`SELECT id FROM oauth_issuer`).toArray()).toHaveLength(0);
    f.state.limit = 16 * 1024 * 1024;
    const grants: { id: string; secret: string }[] = [];
    for (let i = 0; i < 9; i++) {
      const issued = await f.issuer.issue("bounded-" + i, "@owner" as MemberId, BINDING, "TEST");
      expect(issued.status).toBe(201); const [, id, secret] = token(issued, "code"); grants.push({ id, secret }); f.state.now++;
    }
    expect(f.issuer.list()).toHaveLength(8); expect(f.state.ended).toEqual([grants[0]!.id]);
    const beforeExpired = f.used(); f.state.now = START + 60_010;
    const fresh = await f.issuer.issue("after-expiry", "@owner" as MemberId, BINDING, "TEST"), [, id, code] = token(fresh, "code");
    expect(f.issuer.list()).toHaveLength(1); expect(f.used()).toBeLessThan(beforeExpired);
    expect((await f.issuer.exchange(grants[8]!.id, grants[8]!.secret, CLIENT, REDIRECT, VERIFIER)).body).toEqual({ error: "invalid_grant" });
    f.state.standing = "unavailable";
    expect((await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER)).status).toBe(503);
    f.state.standing = "active";
    let deadline!: () => void, entered!: () => void, late!: () => void;
    const scheduled = new Promise<void>(resolve => { entered = resolve; });
    f.state.hold = new Promise<void>(resolve => { late = resolve; });
    f.ports.deadline = (milliseconds, run) => { expect(milliseconds).toBe(8_000); deadline = run; entered(); return () => {}; };
    const delayed = f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER);
    await scheduled; deadline();
    expect((await delayed).status).toBe(503);
    expect(sql.exec(`SELECT id FROM oauth_grant WHERE id = ?`, id).toArray()).toHaveLength(0);
    late(); f.state.hold = null; delete f.ports.deadline;
    const admitted = await f.issuer.exchange(id, code, CLIENT, REDIRECT, VERIFIER); expect(admitted.status).toBe(200);
    const [, , refresh] = token(admitted, "refresh_token");
    let release!: () => void; f.state.hold = new Promise<void>(resolve => { release = resolve; });
    const waiting = f.issuer.refresh(id, refresh, CLIENT);
    await f.issuer.revokeGrant(id); release();
    expect((await waiting).body).toEqual({ error: "invalid_grant" });
    expect(f.issuer.list()).toHaveLength(0);
    expect((await f.issuer.revokeToken(id, refresh, CLIENT)).status).toBe(200);
    expect((await f.issuer.revokeToken("unknown", "unknown", CLIENT)).status).toBe(200);
  });
});
