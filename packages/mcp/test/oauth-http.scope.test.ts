/** Production HTTP, Wire, grant checker and grant-layer manager with actual
 * Durable Object SQLite. Scope replies, agent identity, standing, session persistence and
 * timers are explicit stand-ins. No RPC cancellation or membership judgment
 * belongs to this component witness. */
import { env, runInDurableObject } from "cloudflare:test";
import { expect, test, vi } from "vitest";
import type { MemberId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, digestBytes, same, utf8 } from "@generalbusiness/dap-bytes";
import { secretSigner } from "@generalbusiness/dap-client";
import { McpHttp, type SessionRow } from "../src/http.ts";
import { OAuthAccess, OAUTH_GRANTS_MOST, type OAuthAccessGrant, type OAuthAgentIdentity } from "../src/oauth-access.ts";
import { OAuthHttpLayers } from "../src/oauth-http.ts";
import { hostedRolePort } from "../src/hosted.ts";
import { McpService } from "../src/service.ts";
import { memoryStore } from "@generalbusiness/dap-client";
import type { Sql } from "../src/sqlite-custody.ts";
import { LEGACY, Wire } from "../src/wire.ts";
import { StandIn, SERVICE } from "./support/standin.ts";

/** Explicit component STAND-IN for this exact agent/grant owner. It answers
 * only Access's closed Agent request; actor management and other identities
 * remain unavailable. No Native membership or enrollment is inferred. */
function roleStandingFor(agent: OAuthAgentIdentity, beforeRead: () => Promise<void> = async () => {}) {
  return hostedRolePort(async asked => {
    if (!("agent" in asked) || !same(asked.membership, agent.membership) || asked.agent !== agent.handle
      || asked.agentKey !== agent.key || asked.expectedController !== "@owner" || asked.actor !== null)
      return { status: "unavailable" };
    await beforeRead();
    return { status: "observed", of: { ...agent.membership }, head: { seq: 0, hash: digestBytes(utf8("TEST HTTP layer role head")) },
      agent: { member: agent.handle, state: "active", role: "agent", activeKey: true, controller: "@owner", actions: [] },
      agentKey: { key: agent.key, keyState: "active", member: agent.handle, memberState: "active", controller: "@owner", actions: [] },
      controller: { member: "@owner", state: "active", role: "member", activeKey: false, controller: null, actions: [] }, actor: null };
  });
}

test("grant stream cancellation releases timers and a held standing refresh cannot extend the previous read deadline", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const start = Date.parse("2099-01-01T00:00:00Z");
    let now = start, serial = 0;
    const signer = secretSigner(new Uint8Array(32).fill(22));
    const scopes = new StandIn(signer.key); scopes.sessionEnds = "2100-01-01T00:00:00Z";
    const membership: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
    let entered!: () => void, release!: () => void;
    const standingEntered = new Promise<void>(resolve => { entered = resolve; });
    const standingRelease = new Promise<void>(resolve => { release = resolve; });
    let hold = false;
    const identity: OAuthAgentIdentity = { op: "TEST HTTP layer", configuration: canonicalize({ service: SERVICE }),
      state: "enrolled", membership, key: signer.key, handle: "@agent" };
    const access = new OAuthAccess(sql, { now: () => now, agent: () => identity, charge: () => {},
      roleStanding: roleStandingFor(identity, async () => {
        if (hold) { entered(); await standingRelease; }
      }) });
    const id = b64url(new Uint8Array(32).fill(1)), secret = b64url(new Uint8Array(32).fill(2));
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: SERVICE + "/mcp", created: start, ends: start + 86_400_000,
      accessIssued: start, accessExpires: start + 3_600_000, accessDigest: digestBytes(utf8(secret)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, id, canonicalize(grant), start);
    const candidate = access.inspect(id, secret, grant.resource)!;
    expect(await access.standing(candidate)).toBe(true);
    const timers = new Map<number, { due: number; run: () => Promise<void> }>();
    const schedule = (delay: number, run: () => Promise<void>) => { const token = ++serial; timers.set(token, { due: now + delay, run }); return () => { timers.delete(token); }; };
    const layers = new OAuthHttpLayers(access, { now: () => now, schedule });
    const service = new McpService({ service: SERVICE, signer, fetch: scopes.fetch, custody: memoryStore(), now: () => now, every: () => () => {},
      config: { read: async () => scopes.config(), addRoot: async () => {} } });
    const http = await layers.open(candidate, async layer => {
      const result = new McpHttp({ wire: new Wire(service), now: () => now, bodyBytes: 1024 * 1024,
        authorized: () => true, mintSession: () => "TEST-session", lifetime: { get expires() { return layer.deadline; }, schedule },
        streamsChanged: () => layers.watch(candidate) }, layer.generation);
      result.restore([{ id: "TEST-session", version: LEGACY, initialized: true, capabilities: {}, listed: null, created: start }]);
      return result;
    });
    expect(http).not.toBeNull();
    const open = () => http!.handle(new Request(SERVICE + "/mcp", { method: "GET", headers: { "mcp-protocol-version": LEGACY, "mcp-session-id": "TEST-session" } }));
    const first = await open(); expect(first.status).toBe(200);
    expect(http!.streams).toBe(1); expect(timers.size).toBe(2);
    await first.body!.cancel();
    expect(http!.streams).toBe(0); expect(timers.size).toBe(0);
    const second = await open(); expect(second.status).toBe(200);
    hold = true; now = start + 30_000;
    const due = [...timers].filter(([, job]) => job.due <= now);
    const refreshing = due.map(([token, job]) => { timers.delete(token); return job.run(); });
    await standingEntered;
    now = start + 60_000;
    for (const [token, job] of [...timers]) if (job.due <= now && timers.delete(token)) await job.run();
    expect(await second.text(), "the old lease closes while the next authority read remains held").toContain("event: end");
    expect(http!.streams).toBe(0);
    release(); await Promise.all(refreshing);
    expect(timers.size).toBe(0);
    await layers.closeAll();
    hold = false;
    expect(await access.standing(candidate, true)).toBe(true);
    let releaseOpening!: () => void;
    const heldOpening = new Promise<void>(resolve => { releaseOpening = resolve; });
    const pendingOpen = layers.open(candidate, async layer => {
      const lateHttp = new McpHttp({ wire: new Wire(service), now: () => now, bodyBytes: 1024, authorized: () => true, mintSession: () => "TEST-late-session" }, layer.generation);
      await heldOpening; return lateHttp;
    });
    const order: string[] = [];
    const retiring = layers.closeGrant(id, true).then(() => { order.push("closed"); });
    // Explicit TEST scheduler event: release the held load on the next turn.
    // This compares event order, not a measured timing threshold.
    await new Promise<void>(resolve => setTimeout(() => { order.push("opening released"); releaseOpening(); resolve(); }, 0));
    await retiring;
    expect(await pendingOpen).toBeNull();
    expect(order).toEqual(["closed", "opening released"]);
  });
});

// Component boundary only: the held factory already owns restored rows. This
// does not assert that HostedAgent's epoch fences admit this order at ingress.
test("abrupt disposal of a held OAuth opening rejects the late layer and retains its restored session rows", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const now = Date.parse("2099-01-01T00:00:00Z");
    const signer = secretSigner(new Uint8Array(32).fill(23));
    const scopes = new StandIn(signer.key);
    const membership: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
    const identity: OAuthAgentIdentity = { op: "TEST HTTP layer", configuration: canonicalize({ service: SERVICE }),
      state: "enrolled", membership, key: signer.key, handle: "@agent" };
    const access = new OAuthAccess(sql, { now: () => now, agent: () => identity, charge: () => {},
      roleStanding: roleStandingFor(identity) });
    const id = b64url(new Uint8Array(32).fill(3)), secret = b64url(new Uint8Array(32).fill(4));
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: SERVICE + "/mcp", created: now, ends: now + 86_400_000,
      accessIssued: now, accessExpires: now + 3_600_000, accessDigest: digestBytes(utf8(secret)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, id, canonicalize(grant), now);
    const candidate = access.inspect(id, secret, grant.resource)!;
    expect(await access.standing(candidate)).toBe(true);
    const layers = new OAuthHttpLayers(access, { now: () => now });
    const service = new McpService({ service: SERVICE, signer, fetch: scopes.fetch, custody: memoryStore(), now: () => now, every: () => () => {},
      config: { read: async () => scopes.config(), addRoot: async () => {} } });
    // Session persistence is an explicit stand-in. HTTP owns disposal and the
    // write/removal ordering; the grant checker above uses actual DO SQLite.
    const row: SessionRow = { id: "TEST-late-abrupt", version: LEGACY, initialized: true, capabilities: {}, listed: null, created: now };
    const rows = new Map([[row.id, structuredClone(row)]]);
    let http!: McpHttp;
    let closeResults: () => Promise<void>[] = () => [];
    let restoreClosingSpy: () => void = () => {};
    let release!: () => void, entered!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { entered = resolve; });
    try {
      const opening = layers.open(candidate, async layer => {
        http = new McpHttp({ wire: new Wire(service), now: () => now, bodyBytes: 1024, authorized: () => true,
          mintSession: () => "TEST-unused", remove: session => { rows.delete(session); } }, layer.generation);
        http.restore([row]);
        const closing = vi.spyOn(layer.generation, "graceful");
        closeResults = () => closing.mock.results.filter(result => result.type === "return").map(result => result.value);
        restoreClosingSpy = () => closing.mockRestore();
        entered(); await held; return http;
      });
      await started;
      layers.abrupt();
      expect(rows.has(row.id)).toBe(true);
      release();
      expect(await opening).toBeNull();
      // Join only owner close operations production started. Calling closeAll as
      // test cleanup here would erase the row and contaminate the observation.
      await Promise.all(closeResults());
      expect(rows.get(row.id)).toEqual(row);
      const refused = await http.handle(new Request(SERVICE + "/mcp", { method: "POST", headers: {
        "mcp-protocol-version": LEGACY, "mcp-session-id": row.id,
      }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) }));
      expect(refused.status).toBe(404);
    } finally {
      restoreClosingSpy();
      http.abrupt();
    }
  });
});

test("closing a detached OAuth layer again preserves its first disposition and retained session row", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const now = Date.parse("2099-01-01T00:00:00Z"), signer = secretSigner(new Uint8Array(32).fill(24));
    const scopes = new StandIn(signer.key);
    const membership: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
    const identity: OAuthAgentIdentity = { op: "TEST HTTP layer", configuration: canonicalize({ service: SERVICE }),
      state: "enrolled", membership, key: signer.key, handle: "@agent" };
    const access = new OAuthAccess(sql, { now: () => now, agent: () => identity, charge: () => {},
      roleStanding: roleStandingFor(identity) });
    const id = b64url(new Uint8Array(32).fill(5)), secret = b64url(new Uint8Array(32).fill(6));
    const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: SERVICE + "/mcp", created: now, ends: now + 86_400_000,
      accessIssued: now, accessExpires: now + 3_600_000, accessDigest: digestBytes(utf8(secret)) };
    sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, id, canonicalize(grant), now);
    const candidate = access.inspect(id, secret, grant.resource)!;
    expect(await access.standing(candidate)).toBe(true);
    const layers = new OAuthHttpLayers(access, { now: () => now });
    const service = new McpService({ service: SERVICE, signer, fetch: scopes.fetch, custody: memoryStore(), now: () => now, every: () => () => {},
      config: { read: async () => scopes.config(), addRoot: async () => {} } });
    // The real grant checker uses DO SQLite. This map stands in only for the
    // session store, so the witness observes the generation's removal callback.
    const row: SessionRow = { id: "TEST-detached-close", version: LEGACY, initialized: true, capabilities: {}, listed: null, created: now };
    const rows = new Map([[row.id, structuredClone(row)]]);
    const http = await layers.open(candidate, async layer => {
      const result = new McpHttp({ wire: new Wire(service), now: () => now, bodyBytes: 1024, authorized: () => true,
        mintSession: () => "TEST-unused", remove: session => { rows.delete(session); } }, layer.generation);
      result.restore([row]);
      return result;
    });
    expect(http).not.toBeNull();
    try {
      // Both calls start in one turn, before the first close removes the layer.
      const detached = layers.closeGrant(id, true), closedAgain = layers.closeAll();
      await Promise.all([detached, closedAgain]);
      expect(rows.get(row.id)).toEqual(row);
      const refused = await http!.handle(new Request(SERVICE + "/mcp", { method: "POST", headers: {
        "mcp-protocol-version": LEGACY, "mcp-session-id": row.id,
      }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }) }));
      expect(refused.status).toBe(404);
    } finally { http?.abrupt(); }
  });
});

test("self-retired OAuth generations release stale grant layers so a new grant can open at the capacity bound", async () => {
  const stub = env.AGENTS.get(env.AGENTS.newUniqueId());
  await runInDurableObject(stub, async (_instance, state) => {
    const sql: Sql = { exec: (query, ...values) => state.storage.sql.exec(query, ...values), transaction: run => state.storage.transactionSync(run) };
    const now = Date.parse("2099-01-01T00:00:00Z"), signer = secretSigner(new Uint8Array(32).fill(25));
    const scopes = new StandIn(signer.key);
    const membership: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
    const identity: OAuthAgentIdentity = { op: "TEST HTTP layer", configuration: canonicalize({ service: SERVICE }),
      state: "enrolled", membership, key: signer.key, handle: "@agent" };
    const access = new OAuthAccess(sql, { now: () => now, agent: () => identity, charge: () => {},
      roleStanding: roleStandingFor(identity) });
    const layers = new OAuthHttpLayers(access, { now: () => now });
    const service = new McpService({ service: SERVICE, signer, fetch: scopes.fetch, custody: memoryStore(), now: () => now, every: () => () => {},
      config: { read: async () => scopes.config(), addRoot: async () => {} } });
    const retired: string[] = [];
    try {
      for (let index = 0; index <= OAUTH_GRANTS_MOST; index++) {
        if (index === OAUTH_GRANTS_MOST) for (const id of retired) access.end(id);
        const id = b64url(new Uint8Array(32).fill(20 + index)), secret = b64url(new Uint8Array(32).fill(40 + index));
        const grant: OAuthAccessGrant = { controller: "@owner" as MemberId, resource: SERVICE + "/mcp", created: now, ends: now + 86_400_000,
          accessIssued: now, accessExpires: now + 3_600_000, accessDigest: digestBytes(utf8(secret)) };
        sql.exec(`INSERT INTO oauth_grant (id, row, state, created) VALUES (?, ?, 'active', ?)`, id, canonicalize(grant), now);
        const candidate = access.inspect(id, secret, grant.resource)!;
        expect(await access.standing(candidate)).toBe(true);
        const http = await layers.open(candidate, async layer => new McpHttp({ wire: new Wire(service), now: () => now,
          bodyBytes: 1024, authorized: () => true, mintSession: () => "TEST-unused" }, layer.generation));
        expect(http, `grant ${index + 1} opens after retired generations release capacity`).not.toBeNull();
        if (index < OAUTH_GRANTS_MOST) {
          // Lifetime expiry also calls graceful directly on the generation.
          // Retire here without a wall-clock timer or a manager close.
          await http!.generation.graceful();
          expect(http!.generation.closed).toBe(true);
          retired.push(id);
        }
      }
    } finally { await layers.closeAll(); }
  });
});
