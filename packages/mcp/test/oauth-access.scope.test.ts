/** Actual Durable Object SQLite and the production grant checker. Standing
 * answers and clock are explicit stand-ins. These cases prove admission,
 * caching and race boundaries, not Native membership judgment or issuance. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, keyIdOfSecret, utf8 } from "@generalbusiness/dap-bytes";
import { OAuthAccess, OAUTH_STANDING_MS, type OAuthAccessGrant, type OAuthAgentIdentity } from "../src/oauth-access.ts";
import type { Sql } from "../src/sqlite-custody.ts";

const RESOURCE = "https://room.example/mcp?connector=claude";
const GRANT = b64url(new Uint8Array(32).fill(1));
const SECRET = b64url(new Uint8Array(32).fill(2));
const MEMBERSHIP: ScopeRef = { scope: `sc_${"a".repeat(52)}`, inc: `in_${"a".repeat(26)}`, kind: "membership" };
const START = Date.parse("2099-01-01T00:00:00Z");

test("a removed controller ends a valid grant at the standing bound and rejoining cannot revive it", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    let now = START, active = true, reads = 0, charged = 0;
    const agent: OAuthAgentIdentity = { state: "enrolled", membership: MEMBERSHIP, key: keyIdOfSecret(new Uint8Array(32).fill(3)), handle: "@agent" };
    const access = new OAuthAccess(sql, {
      now: () => now, agent: () => agent, charge: delta => { charged += delta; },
      observe: async (_membership, ask) => {
        reads++;
        return "key" in ask
          ? { keyState: "active", memberState: "active", member: "@agent", controller: "@owner" }
          : { memberState: active ? "active" : "removed" };
      },
    });
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: RESOURCE, created: START, ends: START + 86_400_000,
      accessIssued: START, accessExpires: START + 3_600_000, accessDigest: digestBytes(utf8(SECRET)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, GRANT, canonicalize(grant), START);
    const candidate = access.inspect(GRANT, SECRET, RESOURCE)!;
    expect(candidate).not.toBeNull();
    expect(await access.standing(candidate)).toBe(true);
    expect(reads).toBe(2);
    active = false; now = START + OAUTH_STANDING_MS - 1;
    expect(await access.standing(candidate)).toBe(true);
    expect(reads).toBe(2);
    now++;
    expect(await access.standing(candidate)).toBe(false);
    expect(reads).toBe(4);
    expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, GRANT).toArray()[0]!["state"]).toBe("ended");
    expect(charged).toBe(-1);
    active = true;
    expect(access.inspect(GRANT, SECRET, RESOURCE)).toBeNull();
    expect(await access.standing(candidate)).toBe(false);
  });
});

test("wrong connector, digest, expiry or retired agent never reaches standing; authority waits recheck revocation and clock bounds", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    let now = START, reads = 0;
    const agent: OAuthAgentIdentity = { state: "enrolled", membership: MEMBERSHIP, key: keyIdOfSecret(new Uint8Array(32).fill(3)), handle: "@agent" };
    let release: (() => void) | null = null, hold: Promise<void> | null = null;
    const access = new OAuthAccess(sql, {
      now: () => now, agent: () => agent, charge: () => {},
      observe: async (_membership, ask) => {
        reads++; await hold;
        return "key" in ask ? { keyState: "active", memberState: "active", member: "@agent", controller: "@owner" } : { memberState: "active" };
      },
    });
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: RESOURCE, created: START, ends: START + 86_400_000,
      accessIssued: START, accessExpires: START + 3_600_000, accessDigest: digestBytes(utf8(SECRET)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, GRANT, canonicalize(grant), START);
    expect(access.inspect(GRANT, SECRET, "https://room.example/mcp?connector=chatgpt")).toBeNull();
    expect(access.inspect(GRANT, b64url(new Uint8Array(32).fill(4)), RESOURCE)).toBeNull();
    expect(access.inspect(GRANT, SECRET, null)).toBeNull();
    now = grant.accessExpires;
    expect(access.inspect(GRANT, SECRET, RESOURCE)).toBeNull();
    now = START; agent.state = "retired";
    expect(access.inspect(GRANT, SECRET, RESOURCE)).toBeNull();
    agent.state = "enrolled"; now = Number.NaN;
    expect(access.inspect(GRANT, SECRET, RESOURCE)).toBeNull();
    expect(reads).toBe(0);
    now = START;
    const candidate = access.inspect(GRANT, SECRET, RESOURCE)!;
    hold = new Promise<void>(resolve => { release = resolve; });
    const waiting = access.standing(candidate);
    expect(reads).toBe(1);
    access.end(GRANT);
    release!();
    expect(await waiting).toBe(false);
    sql.exec(`UPDATE oauth_grant SET state = 'active' WHERE id = ?`, GRANT);
    hold = null;
    expect(await access.standing(candidate)).toBe(true);
    now = START - 1;
    expect(await access.standing(candidate)).toBe(false);
    now = START + OAUTH_STANDING_MS;
    hold = new Promise<void>(resolve => { release = resolve; });
    const slow = access.standing(candidate);
    now += OAUTH_STANDING_MS;
    release!();
    expect(await slow).toBe(false);
  });
});
