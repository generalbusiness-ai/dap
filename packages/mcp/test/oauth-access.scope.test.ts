/** Actual Durable Object SQLite and the production grant checker. Standing
 * answers and clock are explicit stand-ins. These cases prove admission,
 * caching and race boundaries, not Native membership judgment or issuance. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test } from "vitest";
import type { MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, keyIdOfSecret, same, utf8 } from "@generalbusiness/dap-bytes";
import { OAuthAccess, OAUTH_STANDING_MS, type OAuthAccessGrant, type OAuthAgentIdentity } from "../src/oauth-access.ts";
import type { Sql } from "../src/sqlite-custody.ts";
import { hostedRolePort, HostedAgent, type HostedRoleRead } from "../src/hosted.ts";

const RESOURCE = "https://room.example/mcp?connector=claude";
const GRANT = b64url(new Uint8Array(32).fill(1));
const SECRET = b64url(new Uint8Array(32).fill(2));
const MEMBERSHIP: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
const START = Date.parse("2099-01-01T00:00:00Z");

/** Scripted same-head RPC facts; SQL/candidate custody below are production, Native membership is not. */
function roleFacts(agent: OAuthAgentIdentity, active = true, wider = false, seq = 3): Extract<HostedRoleRead, { status: "observed" }> {
  const actions = wider ? ["issue.open", "change.check"] : ["issue.open"];
  return { status: "observed", of: { ...agent.membership }, head: { seq, hash: `sha256:${"a".repeat(64)}` },
    agent: { member: "@agent", state: "active", role: "agent", activeKey: true, controller: "@owner", actions: [...actions] },
    agentKey: { key: agent.key, keyState: "active", member: "@agent", memberState: "active", controller: "@owner", actions: [...actions] },
    controller: { member: "@owner", state: active ? "active" : "removed", role: "member", activeKey: false, controller: null, actions: ["issue.open"] },
    actor: null };
}

test("a removed controller ends a valid grant at the standing bound and rejoining cannot revive it", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    let now = START, active = true, wider = false, reads = 0, charged = 0;
    const agent: OAuthAgentIdentity = { op: "TEST", configuration: canonicalize({ service: "https://room.example" }), state: "enrolled", membership: MEMBERSHIP, key: keyIdOfSecret(new Uint8Array(32).fill(3)), handle: "@agent" };
    const access = new OAuthAccess(sql, {
      now: () => now, agent: () => agent, charge: delta => { charged += delta; },
      roleStanding: hostedRolePort(async request => {
        reads++;
        expect(request).toEqual({ membership: MEMBERSHIP, agent: "@agent", agentKey: agent.key, expectedController: "@owner", actor: null });
        return roleFacts(agent, active, wider, reads);
      }),
    });
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: RESOURCE, created: START, ends: START + 86_400_000,
      accessIssued: START, accessExpires: START + 3_600_000, accessDigest: digestBytes(utf8(SECRET)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, GRANT, canonicalize(grant), START);
    const candidate = access.inspect(GRANT, SECRET, RESOURCE)!;
    expect(candidate).not.toBeNull();
    expect(await access.standing(candidate)).toBe(true); // Controller is active with no active key.
    expect(reads).toBe(1);
    expect(access.standingDeadline(candidate)).toBe(START + OAUTH_STANDING_MS);
    wider = true; now = START + 1;
    expect(await access.standingResult(candidate)).toEqual({ status: "inactive", reason: "role-subset" });
    expect(reads).toBe(2); // A previous successful stream lease cannot authorize this request.
    expect(access.current(candidate)).toBe(true);
    expect(access.standingDeadline(candidate)).toBeNull();
    expect(charged).toBe(0);
    wider = false;
    expect(await access.standing(candidate)).toBe(true);
    expect(reads).toBe(3);
    active = false; now = START + OAUTH_STANDING_MS;
    expect(await access.standingResult(candidate)).toEqual({ status: "inactive", reason: "controller-inactive" });
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
    let now = START, reads = 0, available = true, controllerActive = true;
    const agent: OAuthAgentIdentity = { op: "TEST", configuration: canonicalize({ service: "https://room.example" }), state: "enrolled", membership: MEMBERSHIP, key: keyIdOfSecret(new Uint8Array(32).fill(3)), handle: "@agent" };
    let release: (() => void) | null = null, hold: Promise<void> | null = null;
    const access = new OAuthAccess(sql, {
      now: () => now, agent: () => agent, charge: () => {},
      roleStanding: hostedRolePort(async () => {
        reads++;
        const facts: HostedRoleRead = available ? roleFacts(agent, controllerActive, false, reads) : { status: "unavailable" }; // Capture before the held reply.
        await hold;
        return facts;
      }),
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
    const priorDeadline = access.standingDeadline(candidate);
    const slow = access.standingResult(candidate);
    expect(access.standingDeadline(candidate)).toBe(priorDeadline);
    now += OAUTH_STANDING_MS;
    release!();
    expect(await slow).toEqual({ status: "unavailable" });
    expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, GRANT).toArray()[0]!["state"]).toBe("active");
    now = START + OAUTH_STANDING_MS * 2;
    hold = new Promise<void>(resolve => { release = resolve; });
    const stale = access.standingResult(candidate);
    const replacement = { ...grant, accessDigest: digestBytes(utf8("TEST replacement")) };
    sql.exec(`UPDATE oauth_grant SET row = ? WHERE id = ?`, canonicalize(replacement), GRANT);
    release!();
    expect(await stale).toEqual({ status: "inactive", reason: "owner-changed" });
    expect(sql.exec(`SELECT row, state FROM oauth_grant WHERE id = ?`, GRANT).toArray()[0]).toMatchObject({ row: canonicalize(replacement), state: "active" });
    sql.exec(`UPDATE oauth_grant SET row = ? WHERE id = ?`, canonicalize(grant), GRANT);
    hold = new Promise<void>(resolve => { release = resolve; });
    const backward = access.standingResult(candidate);
    now--;
    release!();
    expect(await backward).toEqual({ status: "unavailable" });
    expect(access.current(candidate)).toBe(true);
    // Same key/member/grant cannot authorize a replacement creation/config owner.
    now++;
    hold = new Promise<void>(resolve => { release = resolve; });
    const changedOp = access.standingResult(candidate);
    agent.op = "TEST replacement op";
    release!();
    expect(await changedOp).toEqual({ status: "inactive", reason: "owner-changed" });
    expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, GRANT).toArray()[0]!["state"]).toBe("active");
    agent.op = "TEST";
    controllerActive = false;
    hold = new Promise<void>(resolve => { release = resolve; });
    const changedConfig = access.standingResult(candidate);
    const originalConfiguration = agent.configuration;
    agent.configuration = canonicalize({ service: "https://room.example", roots: [] });
    release!();
    expect(await changedConfig).toEqual({ status: "inactive", reason: "owner-changed" }); // Old removed-controller facts cannot end this replacement.
    expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, GRANT).toArray()[0]!["state"]).toBe("active");
    agent.configuration = originalConfiguration;
    controllerActive = true;

    // Capture the actual post-read checkpoint, not only the outer start.
    const beforeCheckpoint = now, checkpoint: { at: number; until: number }[] = [];
    now = START + 2000;
    hold = new Promise<void>(resolve => { release = resolve; });
    const checkpointed = access.standingResult(candidate, false, (at, until) => checkpoint.push({ at, until }));
    now = START + 5000;
    release!();
    expect(await checkpointed).toEqual({ status: "active" });
    expect(checkpoint).toEqual([{ at: START + 5000, until: START + 7000 }]);
    // A Hosted continuation at 3000 clears the 2000 outer floor, but not
    // this exact Access checkpoint. The HTTP consumer scene proves its use.
    expect(START + 3000).toBeGreaterThanOrEqual(START + 2000);
    expect(START + 3000).toBeLessThan(checkpoint[0]!.at);
    expect(access.current(candidate, START + 3000)).toBe(true);
    hold = null; now = beforeCheckpoint;

    // An older unavailable reply cannot erase a newer success for this candidate.
    now++;
    available = false;
    hold = new Promise<void>(resolve => { release = resolve; });
    const olderUnavailable = access.standingResult(candidate), releaseUnavailable = release!;
    available = true; hold = null; now++;
    expect(await access.standingResult(candidate)).toEqual({ status: "active" });
    const newerDeadline = access.standingDeadline(candidate);
    expect(newerDeadline).toBe(now + OAUTH_STANDING_MS);
    releaseUnavailable();
    expect(await olderUnavailable).toEqual({ status: "unavailable" });
    expect(access.standingDeadline(candidate)).toBe(newerDeadline);

    // An older fresh success may answer its own request, but cannot replace a newer lease.
    now++;
    hold = new Promise<void>(resolve => { release = resolve; });
    const olderActive = access.standingResult(candidate), releaseActive = release!;
    expect(access.standingDeadline(candidate)).toBe(newerDeadline);
    hold = null; now++;
    expect(await access.standingResult(candidate)).toEqual({ status: "active" });
    const latestDeadline = access.standingDeadline(candidate);
    expect(latestDeadline).toBe(now + OAUTH_STANDING_MS);
    releaseActive();
    expect(await olderActive).toEqual({ status: "active" });
    expect(access.standingDeadline(candidate)).toBe(latestDeadline);
    // Once the latest read removes its slot, an older success cannot recreate it.
    now++;
    hold = new Promise<void>(resolve => { release = resolve; });
    const beforeLatestFailure = access.standingResult(candidate), releaseBeforeFailure = release!;
    available = false; hold = null; now++;
    expect(await access.standingResult(candidate)).toEqual({ status: "unavailable" });
    expect(access.standingDeadline(candidate)).toBeNull();
    releaseBeforeFailure();
    expect(await beforeLatestFailure).toEqual({ status: "active" });
    expect(access.standingDeadline(candidate)).toBeNull();
  });
});

test("unavailable standing returns a retryable response without revoking or rate-limiting a valid caller", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    let now = START, standing: "unavailable" | "active" | "removed" = "unavailable";
    const seed = new Uint8Array(32).fill(3), id = state.id.toString();
    const identity: OAuthAgentIdentity = { op: "TEST", configuration: canonicalize({ service: "https://room.example" }),
      state: "enrolled", membership: MEMBERSHIP, key: keyIdOfSecret(seed), handle: "@agent" };
    // Durable SQL and the production HTTP admission are real. Identity rows,
    // authority answers and clock are explicit stand-ins, not enrollment proof.
    const agent = new HostedAgent(sql, { id, now: () => now, random: n => crypto.getRandomValues(new Uint8Array(n)), oauthResource: () => RESOURCE,
      fetch: async () => { throw new Error("This admission witness performs no Native transport read."); },
      roleStanding: hostedRolePort(async asked => {
        if (!("agent" in asked) || !same(asked.membership, identity.membership) || asked.agent !== identity.handle
          || asked.agentKey !== identity.key || asked.expectedController !== "@owner" || asked.actor !== null
          || standing === "unavailable") return { status: "unavailable" };
        // Explicit same-head STAND-IN facts for the exact SQL agent/grant below.
        // A removed controller is recorded as removed, never replaced by active defaults.
        return roleFacts(identity, standing === "active");
      }),
      observe: async (_membership, ask) => standing === "unavailable" ? null : "key" in ask
        ? { keyState: "active", memberState: "active", member: "@agent", controller: "@owner" }
        : { memberState: standing },
    });
    sql.exec(`INSERT INTO agent (id, op, seed, key, state, membership, handle, config, created, updated) VALUES (1, 'TEST', ?, ?, 'enrolled', ?, '@agent', ?, ?, ?)`, seed, keyIdOfSecret(seed), canonicalize(MEMBERSHIP), canonicalize({ service: "https://room.example" }), new Date(now).toISOString(), new Date(now).toISOString());
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: RESOURCE, created: START, ends: START + 86_400_000,
      accessIssued: START, accessExpires: START + 3_600_000, accessDigest: digestBytes(utf8(SECRET)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, GRANT, canonicalize(grant), START);
    const initialize = () => agent.fetch(new Request(RESOURCE, { method: "POST", headers: { authorization: `Bearer ${id}.${GRANT}.${SECRET}`, "cf-connecting-ip": "192.0.2.10", "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "TEST-standing-unavailable", version: "1" } } }) }));
    for (let i = 0; i < 12; i++) {
      const response = await initialize();
      expect(response.status).toBe(503);
      expect(response.headers.get("retry-after")).toBe("1");
      expect(response.headers.has("www-authenticate")).toBe(false);
      expect(await response.json()).toEqual({ error: "unavailable" });
    }
    expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, GRANT).toArray()[0]!["state"]).toBe("active");
    standing = "active";
    const recovered = await initialize();
    expect(recovered.status).toBe(200);
    await recovered.body?.cancel();
    standing = "removed"; now += OAUTH_STANDING_MS;
    const refused = await initialize();
    expect(refused.status).toBe(401);
    await refused.body?.cancel();
    expect(sql.exec(`SELECT state FROM oauth_grant WHERE id = ?`, GRANT).toArray()[0]!["state"]).toBe("ended");
    agent.abrupt();
  });
});
