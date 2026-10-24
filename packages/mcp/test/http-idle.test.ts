import { expect, test } from "vitest";
import { McpService, memoryStore } from "../src/index.ts";
import { McpHttp, SESSION_IDLE_MS, LIFETIME_RECHECK_MS, type HttpPort, type SessionRow } from "../src/http.ts";
import { LEGACY, MODERN, PROTOCOL_META, CAPABILITIES_META, Wire } from "../src/wire.ts";
import { SERVICE, StandIn } from "./support/standin.ts";
import { fixedSigner } from "./fixtures.ts";

// The shared HTTP layer and Wire are real; scope reads and durable session storage are labelled STAND-INs.
function setup() {
  let now = Date.parse("2099-01-01T00:00:00Z"), serial = 0;
  const signer = fixedSigner(22);
  const scopes = new StandIn(signer.key);
  scopes.sessionEnds = "2100-01-01T00:00:00Z";
  const config = scopes.config();
  let beforeFetch: ((url: string) => Promise<void>) | undefined;
  const service = new McpService({ service: SERVICE, signer, fetch: async (url, init) => { await beforeFetch?.(url); return scopes.fetch(url, init); },
    config: { read: async () => config, addRoot: async () => {} }, custody: memoryStore(), now: () => now, every: () => () => {} });
  const rows = new Map<string, SessionRow>();
  let beforePersist: ((row: SessionRow) => Promise<void>) | undefined;
  const layer = (lifetime?: HttpPort["lifetime"]) => new McpHttp({ wire: new Wire(service), bodyBytes: 1024 * 1024, now: () => now,
    ...(lifetime ? { lifetime } : {}),
    authorized: authorization => authorization === "Bearer SCRIPTED", mintSession: () => `SCRIPTED-${++serial}`,
    persist: async row => { await beforePersist?.(row); rows.set(row.id, structuredClone(row)); }, remove: id => { rows.delete(id); } });
  const request = (http: McpHttp, method: string, id?: string, rpc = "ping", extra: Record<string, string> = {}) => http.handle(new Request(SERVICE + "/mcp", {
    method, headers: { authorization: "Bearer SCRIPTED", "mcp-protocol-version": LEGACY, ...(id ? { "mcp-session-id": id } : {}), ...extra },
    ...(method === "POST" ? { body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: rpc,
      ...(rpc === "initialize" ? { params: { protocolVersion: LEGACY, capabilities: {} } } : {}) }) } : {}),
  }));
  const open = async (http: McpHttp) => { const reply = await request(http, "POST", undefined, "initialize"); expect(reply.status).toBe(200); return reply.headers.get("mcp-session-id")!; };
  return { layer, rows, request, open, service, scopes, now: () => now, at: (value: number) => { now = value; }, hold: (work: (row: SessionRow) => Promise<void>) => { beforePersist = work; }, holdFetch: (work: (url: string) => Promise<void>) => { beforeFetch = work; } };
}

/** Explicit scheduler STAND-IN: no sleeps and no fake thirty-day timer. */
function clockQueue() {
  const scheduled: { delay: number; run: () => Promise<void>; canceled: boolean }[] = [];
  const schedule = (delay: number, run: () => Promise<void>) => {
    expect(delay).toBeGreaterThan(0); expect(delay).toBeLessThanOrEqual(LIFETIME_RECHECK_MS);
    const task = { delay, run, canceled: false }; scheduled.push(task);
    return () => { task.canceled = true; };
  };
  return { schedule, scheduled, active: () => scheduled.filter(task => !task.canceled), fire: async (task: typeof scheduled[number]) => { task.canceled = true; await task.run(); } };
}

function modern(http: McpHttp, method: string, params: Record<string, unknown> = {}) {
  return http.handle(new Request(SERVICE + "/mcp", { method: "POST", headers: {
    authorization: "Bearer SCRIPTED", "content-type": "application/json", "mcp-protocol-version": MODERN, "mcp-method": method,
    ...(method === "tools/call" ? { "mcp-name": String(params["name"]) } : {}),
  }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: { ...params, _meta: { [PROTOCOL_META]: MODERN, [CAPABILITIES_META]: {} } } }) }));
}

// Invariant: exact idle expiry removes the stored session and closes its stream; activity renews it,
// while origin/bearer refusals and the stateless revision neither renew nor expire legacy state.
test("legacy activity renews durable idle time; exact expiry closes streams after authorization and revision checks", async () => {
  const s = setup(), http = s.layer(), start = s.now();
  const idle = await s.open(http), active = await s.open(http);
  const stream = await s.request(http, "GET", idle);
  expect([stream.status, http.streams]).toEqual([200, 1]);
  s.at(start + SESSION_IDLE_MS - 1);
  expect((await s.request(http, "POST", active)).status).toBe(200);
  expect(s.rows.get(active)?.lastActive).toBe(s.now());
  s.at(start + SESSION_IDLE_MS);
  expect((await s.request(http, "GET", idle)).status).toBe(404);
  expect(s.rows.has(idle)).toBe(false);
  expect(http.streams).toBe(0);
  expect(await stream.text()).toContain("event: end");
  expect(http.sessions.has(active)).toBe(true);
  s.at(start + 2 * SESSION_IDLE_MS - 1);
  expect((await s.request(http, "POST", active, "ping", { origin: SERVICE })).status).toBe(403);
  expect((await s.request(http, "POST", active, "ping", { authorization: "Bearer wrong" })).status).toBe(401);
  expect((await s.request(http, "GET", active, "ping", { "mcp-protocol-version": MODERN })).status).toBe(405);
  const modern = await http.handle(new Request(SERVICE + "/mcp", { method: "POST", headers: { authorization: "Bearer SCRIPTED", "mcp-protocol-version": MODERN, "mcp-session-id": active, "mcp-method": "ping" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: { _meta: { [PROTOCOL_META]: MODERN, [CAPABILITIES_META]: {} } } }) }));
  expect(modern.status).toBe(200);
  expect(s.rows.get(active)?.lastActive).toBe(start + SESSION_IDLE_MS - 1);
  expect(http.sessions.has(active)).toBe(true);
  expect((await s.request(http, "POST", active)).status).toBe(404);
  expect((await s.request(http, "DELETE", active)).status).toBe(404);
  expect(s.rows.size).toBe(0);
  await http.closeAll();
});

// Invariant: eviction preserves activity, legacy rows fall back to creation, and a late activity
// write cannot recreate a row after concurrent expiry ends the session.
test("restored idle deadlines survive eviction and expiry orders removal after a pending activity write", async () => {
  const s = setup(), first = s.layer(), start = s.now();
  const active = await s.open(first), legacy = await s.open(first);
  s.at(start + 10 * 60_000);
  await s.request(first, "POST", active);
  first.abrupt();
  const restored = s.layer();
  const old = { ...s.rows.get(legacy)! }; delete old.lastActive;
  restored.restore([s.rows.get(active)!, old]);
  s.at(start + SESSION_IDLE_MS);
  expect((await s.request(restored, "POST", active)).status).toBe(200);
  expect(s.rows.has(legacy)).toBe(false);
  expect(s.rows.get(active)?.lastActive).toBe(s.now());
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  s.hold(async () => { entered(); await gate; });
  const ending = new Promise<void>(resolve => {
    const end = restored.port.wire.endLegacy.bind(restored.port.wire);
    restored.port.wire.endLegacy = session => { end(session); if (session.id === active) resolve(); };
  });
  s.at(s.now() + 1);
  const touch = s.request(restored, "POST", active, "tools/list");
  await waiting;
  s.at(start + 2 * SESSION_IDLE_MS);
  const expiry = s.request(restored, "DELETE", active);
  // #end marks and removes the live session before waiting for its queued durable removal.
  await ending;
  expect(restored.sessions.has(active)).toBe(false);
  release();
  expect((await touch).status).toBe(404);
  expect((await expiry).status).toBe(404);
  expect(s.rows.has(active)).toBe(false);
  await restored.closeAll();
});

test("hosted lifetime closes both stream eras at bounded rechecks and canceled callbacks cannot close a replacement layer", async () => {
  const s = setup(), q = clockQueue(), start = s.now(), expires = start + 30 * 86_400_000;
  const http = s.layer({ expires, schedule: q.schedule });
  const id = await s.open(http);
  expect(q.active()).toHaveLength(0);
  const legacy = await s.request(http, "GET", id);
  const listening = await modern(http, "subscriptions/listen", { notifications: { toolsListChanged: true } });
  expect([legacy.status, listening.status, http.streams]).toEqual([200, 200, 2]);
  expect(q.active()).toHaveLength(1);
  expect(q.active()[0]!.delay).toBe(30_000);
  const oldCallback = q.active()[0]!;
  s.at(expires - 1);
  await q.fire(oldCallback);
  expect(http.streams).toBe(2);
  expect(q.active()).toHaveLength(1);
  expect(q.active()[0]!.delay).toBe(1);
  s.at(expires);
  await q.fire(q.active()[0]!);
  expect([http.streams, http.sessions.size, s.rows.size, q.active().length]).toEqual([0, 0, 0, 0]);
  expect(await legacy.text()).toContain("event: end");
  expect(await listening.text()).toContain('"resultType":"complete"');
  expect(s.service.watching).toBe(false);
  expect((await modern(http, "ping")).status).toBe(401);

  const replacement = s.layer({ expires: expires + 60_000, schedule: q.schedule });
  const replacementId = await s.open(replacement);
  const replacementListen = await modern(replacement, "subscriptions/listen", { notifications: { toolsListChanged: true } });
  expect(q.active()).toHaveLength(1);
  await oldCallback.run(); // A callback already dequeued when cancellation occurred.
  expect(replacement.streams).toBe(1);
  await replacementListen.body!.cancel();
  expect(q.active()).toHaveLength(0);
  const last = await s.request(replacement, "GET", replacementId);
  const abandoned = q.active()[0]!;
  replacement.abrupt();
  expect(q.active()).toHaveLength(0);
  await abandoned.run();
  expect(replacement.streams).toBe(0);
  await last.text();

  // Cross the deadline after listen admission but inside owner scheduling:
  // the first two reads admit, the next one must close before Wire starts.
  const crossingExpiry = s.now() + 1000, rowsBeforeCrossing = structuredClone([...s.rows]);
  const crossing = s.layer({ expires: crossingExpiry, schedule: q.schedule });
  let clockReads = 0;
  crossing.port.now = () => ++clockReads <= 2 ? crossingExpiry - 1 : crossingExpiry;
  const refused = await modern(crossing, "subscriptions/listen", { notifications: { toolsListChanged: true } });
  expect(clockReads).toBeGreaterThanOrEqual(3);
  expect(refused.status, "expiry during owner registration starts no subscription").toBe(401);
  await crossing.closeAll();
  expect([crossing.streams, crossing.sessions.size, q.active().length, s.service.watching]).toEqual([0, 0, 0, false]);
  expect([...s.rows], "a canceled opening changes no stored session").toEqual(rowsBeforeCrossing);
});

test("hosted expiry fences deferred openings and initialization while an admitted custodial call still settles once", async () => {
  const s = setup(), q = clockQueue(), expires = s.now() + 1000;
  const http = s.layer({ expires, schedule: q.schedule });
  const id = await s.open(http);
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const snapshot = s.service.snapshot.bind(s.service);
  s.service.snapshot = async () => { entered(); await held; return snapshot(); };
  const opening = s.request(http, "GET", id);
  await waiting;
  expect([http.streams, q.active().length]).toEqual([1, 1]);
  s.at(expires);
  await q.fire(q.active()[0]!);
  release();
  expect((await opening).status).toBe(401);
  expect([http.streams, http.sessions.size, s.rows.size]).toEqual([0, 0, 0]);
  s.service.snapshot = snapshot;

  const initializing = s.layer({ expires: s.now() + 1000, schedule: q.schedule });
  let releasePersist!: () => void, persisted!: () => void;
  const persistence = new Promise<void>(resolve => { releasePersist = resolve; });
  const pendingPersist = new Promise<void>(resolve => { persisted = resolve; });
  s.hold(async () => { persisted(); await persistence; });
  const initialize = s.request(initializing, "POST", undefined, "initialize");
  await pendingPersist;
  s.at(s.now() + 1000);
  releasePersist();
  expect((await initialize).status).toBe(401);
  await initializing.closeAll();
  expect([initializing.sessions.size, s.rows.size]).toEqual([0, 0]);
  s.hold(async () => {});

  const active = s.layer({ expires: s.now() + 1000, schedule: q.schedule });
  let releaseAct!: () => void, submitted!: () => void;
  const reply = new Promise<void>(resolve => { releaseAct = resolve; });
  const inFlight = new Promise<void>(resolve => { submitted = resolve; });
  let sends = 0;
  s.holdFetch(async url => { if (url.endsWith("/acts")) { sends++; submitted(); await reply; } });
  const call = modern(active, "tools/call", { name: "room.seat", arguments: { idempotencyKey: "admitted-before-expiry" } });
  await inFlight;
  s.at(s.now() + 1000);
  expect((await modern(active, "tools/call", { name: "room.seat", arguments: { idempotencyKey: "after-expiry" } })).status).toBe(401);
  releaseAct();
  const result = await call;
  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ result: { structuredContent: { answer: "accepted" } } });
  expect(sends).toBe(1);
  expect(await s.service.custody.store.unresolved()).toEqual([]);
  expect((await modern(active, "tools/call", { name: "room.seat", arguments: { idempotencyKey: "after-expiry" } })).status).toBe(401);
  expect(sends).toBe(1);
  expect(q.active()).toHaveLength(0);
});
