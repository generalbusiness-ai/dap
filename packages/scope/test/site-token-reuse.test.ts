/** Actual SQLite/fixed-owner custody and scheduling; Artifacts is scripted.
 * No provider-side exactly-once or deployed token lifetime claim. */
import { expect, test, vi } from "vitest";
import { env } from "cloudflare:workers";
import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { otherLane } from "@generalbusiness/dap-derive/testing";
import { SiteTokenReuse, type SiteTokenAnswer, type SiteTokenRequest, type SiteTokenPort } from "../src/site/token-reuse.ts";
import { readerOf, type Room, type SiteEnv } from "../src/site/host.ts";
import { artifactsReadiness, type ArtifactsBindings } from "../src/artifacts-wiring.ts";
import type { ArtifactsNamespace } from "../src/artifacts-host.ts";
import type { Sql } from "../src/sqlite.ts";
import { SCOPE_INDEX_NAME } from "../src/scope-index.ts";
import { create } from "./fixtures-native.ts";
import { siteTokenTestSettings } from "./worker.ts";

const configuration = { registerScope: otherLane.scope, namespace: "artroom-demo", host: "service.invalid", maxBytes: 1024, credentialIdentity: "adapter-attempt" } as const;
const repository = { host: "artifacts", namespace: configuration.namespace, name: "site-reuse", id: "site-reuse" };
const request = (ref = "refs/heads/main"): SiteTokenRequest => ({ register: otherLane.scope, repository, ref, configuration: canonicalize(configuration) });
const gate = <T>() => { let release!: (value: T) => void; const promise = new Promise<T>(resolve => { release = resolve; }); return { promise, release }; };
function provider(clock: () => number) {
  let mints = 0, infos = 0, revokes = 0;
  let pending: (() => Promise<unknown>) | null = null;
  let reported = `https://${configuration.host}/git/${configuration.namespace}/${repository.name}.git`;
  const binding: ArtifactsNamespace = {
    get: async () => ({ info: async () => { infos++; return { remote: reported }; },
      createToken: async () => { mints++; return pending ? pending() : { scope: "read", plaintext: `private-${mints}`, expiresAt: new Date(clock() + 120_000).toISOString() }; },
      revokeToken: async () => { revokes++; return true; } }),
    create: async () => { throw Error("Site cannot create a repository"); }, delete: async () => false,
  };
  return { settings: { ARTIFACTS: binding, ARTIFACTS_CONFIG: canonicalize(configuration) } satisfies ArtifactsBindings,
    counts: () => ({ mints, infos, revokes }), hold: (next: typeof pending) => { pending = next; }, remote: (value: string) => { reported = value; } };
}

async function siteRpcWithin<T>(work: Promise<T>, phase: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(Error(`Site RPC ${phase} did not finish within 5 seconds`)), 5_000);
    })]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}

/** RPC object replies carry a lifetime even when their fields are scalars.
 * Copy their values, then release the reply; namespace Fetcher stubs stay intact. */
async function siteRpcAnswer(object: DurableObjectStub, asked: SiteTokenRequest): Promise<SiteTokenAnswer> {
  const answer = await (object as unknown as SiteTokenPort).acquireSiteRead(asked);
  try {
    return answer.ok ? { ok: true, plaintext: answer.plaintext, ends: answer.ends }
      : answer.reason === "provider" ? { ok: false, reason: answer.reason, step: answer.step }
      : { ok: false, reason: answer.reason };
  } finally { (answer as SiteTokenAnswer & Partial<Disposable>)[Symbol.dispose]?.(); }
}

/** Retire only generations and alarm instants observed for this test's keys.
 * Call after the measured assertions and after provider/RPC work has joined. */
function siteTokenRetirement(object: () => DurableObjectStub) {
  const generations = new Map<string, string>(), alarms = new Set<number>();
  const snapshot = () => siteRpcWithin(runInDurableObject(object(), async (_instance, state) => ({
    rows: state.storage.sql.exec("SELECT key,generation,state,ends,plaintext IS NOT NULL AS hasPlaintext FROM private_site_token ORDER BY key").toArray(),
    alarm: await state.storage.getAlarm(),
  })), "metadata snapshot");
  const remember = (observed: Awaited<ReturnType<typeof snapshot>>, asked: SiteTokenRequest) => {
    const key = canonicalize({ configuration, repository, ref: asked.ref });
    const row = observed.rows.find(row => row["key"] === key);
    if (!row) return;
    if (typeof row["generation"] !== "string" || typeof row["ends"] !== "number") throw Error("Site ownership metadata is malformed");
    const prior = generations.get(key);
    if (prior !== undefined && prior !== row["generation"]) throw Error("Site ownership generation changed");
    generations.set(key, row["generation"]);
    if (observed.alarm === row["ends"]) alarms.add(observed.alarm);
  };
  return { snapshot, remember,
    retire: async () => {
      if (generations.size === 0) return;
      const retired = await siteRpcWithin(runInDurableObject(object(), async (_instance, state) => {
        state.storage.transactionSync(() => {
          for (const [key, generation] of generations) state.storage.sql.exec("DELETE FROM private_site_token WHERE key=? AND generation=?", key, generation).toArray();
        });
        const alarm = await state.storage.getAlarm();
        const remaining = state.storage.sql.exec("SELECT count(*) AS n FROM private_site_token").toArray()[0]!["n"];
        // A surviving row or an unrecorded alarm belongs to another owner.
        // Preserve its earlier wake rather than replacing or clearing it.
        if (remaining === 0 && alarm !== null && alarms.has(alarm)) await state.storage.deleteAlarm();
        return { remaining, alarm: await state.storage.getAlarm() };
      }), "owned storage retirement");
      if (retired.remaining !== 0 || retired.alarm !== null) throw Error("Site retirement retained unowned rows or alarm");
      await siteRpcWithin(evictDurableObject(object()), "owned instance retirement");
    },
  };
}

/** Hold one info answer after the real owner has reserved and scheduled.
 * The scripted wrong remote proves failure before any token mint enters. */
function heldInfoProvider() {
  const entered = gate<void>(), resume = gate<void>(), joined = gate<void>();
  let armed = false, used = false, closed = false, active = 0, lateCalls = 0, mints = 0;
  const operation = async <T>(run: () => T | Promise<T>): Promise<T> => {
    if (closed) { lateCalls++; throw Error("Site test provider is closed"); }
    active++;
    try { return await run(); } finally { active--; }
  };
  const binding: ArtifactsNamespace = {
    get: async () => operation(() => ({
      info: async () => operation(async () => {
        if (!armed) return { remote: `https://${configuration.host}/git/${configuration.namespace}/${repository.name}.git` };
        armed = false; used = true; entered.release();
        try { await resume.promise; return { remote: "https://foreign.invalid/replaced" }; }
        finally { joined.release(); }
      }),
      createToken: async () => operation(() => {
        mints++;
        return { scope: "read", plaintext: `held-provider-${mints}`, expiresAt: new Date(Date.now() + 120_000).toISOString() };
      }),
      revokeToken: async () => operation(() => true),
    })),
    create: async () => operation(() => { throw Error("Site cannot create a repository"); }),
    delete: async () => operation(() => false),
  };
  return {
    settings: { ARTIFACTS: binding, ARTIFACTS_CONFIG: canonicalize(configuration) } satisfies ArtifactsBindings,
    hold: () => { if (armed || used) throw Error("Site info hold already used"); armed = true; },
    entered: entered.promise,
    release: () => resume.release(),
    join: async () => { if (used) await siteRpcWithin(joined.promise, "provider join"); },
    close: () => { if (active !== 0) throw Error("Site provider still active"); closed = true; },
    counts: () => ({ active, lateCalls, mints }),
  };
}

// A real scope supplies actual SQLite; no scope authority is used by these
// private rows. The controlled clock and provider are labelled stand-ins.
test("private Site custody shares one mint, preserves actual expiry and refuses stale generations after a bounded interrupted hold", async () => {
  const holder = await create();
  await holder.inside(async state => {
    const sql: Sql = { exec: (query, ...args) => state.storage.sql.exec(query, ...args), transaction: run => state.storage.transactionSync(run) };
    let now = Date.parse("2099-01-01T00:00:00Z");
    const p = provider(() => now), make = () => new SiteTokenReuse(sql, () => artifactsReadiness(p.settings), () => now, async () => {});
    let tokens = make();
    const first = await tokens.acquire(request());
    expect(first).toMatchObject({ ok: true, plaintext: "private-1", ends: now + 120_000 });
    for (let n = 0; n < 4; n++) expect(await tokens.acquire(request())).toEqual(first);
    expect(p.counts()).toEqual({ mints: 1, infos: 5, revokes: 0 });
    tokens = make(); // private state survives owner replacement
    now += 119_999;
    expect(await tokens.acquire(request())).toEqual(first);
    now++;
    tokens.maintain(now);
    expect(sql.exec("SELECT plaintext FROM private_site_token").toArray()).toEqual([]);
    expect(await tokens.acquire(request())).toMatchObject({ ok: true, plaintext: "private-2" });

    const old = gate<unknown>(), entered = gate<void>();
    p.hold(async () => { entered.release(); return old.promise; });
    const late = tokens.acquire(request("refs/heads/interrupted"));
    await entered.promise;
    const restarted = make();
    now += 179_999;
    expect(await restarted.acquire(request("refs/heads/interrupted"))).toEqual({ ok: false, reason: "mint-pending" });
    expect(p.counts().mints).toBe(3);
    now++;
    p.hold(null);
    const fresh = await restarted.acquire(request("refs/heads/interrupted"));
    expect(fresh).toMatchObject({ ok: true, plaintext: "private-4" });
    old.release({ scope: "read", plaintext: "stale-secret", expiresAt: new Date(now + 120_000).toISOString() });
    expect(await late).toEqual({ ok: false, reason: "mint-pending" });
    expect(await restarted.acquire(request("refs/heads/interrupted"))).toEqual(fresh);
    expect(p.counts().revokes).toBe(0);

    // Explicitly expire the local coroutine while its provider RPC remains
    // unsettled. Completing that RPC later cannot install or advance it.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const stalled = gate<unknown>(), started = gate<void>();
    try {
      p.hold(async () => { started.release(); return stalled.promise; });
      const timed = restarted.acquire(request("refs/heads/deadline"));
      await started.promise;
      now += 180_000;
      await vi.advanceTimersByTimeAsync(180_000);
      expect(await timed).toEqual({ ok: false, reason: "mint-pending" });
      p.hold(null);
      const successor = await restarted.acquire(request("refs/heads/deadline"));
      expect(successor.ok).toBe(true);
      stalled.release({ scope: "read", plaintext: "late-after-local-deadline", expiresAt: new Date(now + 120_000).toISOString() });
      expect(await restarted.acquire(request("refs/heads/deadline"))).toEqual(successor);
      expect(sql.exec("SELECT plaintext FROM private_site_token WHERE plaintext='late-after-local-deadline'").toArray()).toEqual([]);
    } finally { vi.useRealTimers(); }
  });
});

test("Site token waiters and durable reservations enforce 8, 64, 32 and 256 boundaries without evicting live keys", async () => {
  const holder = await create();
  await holder.inside(async state => {
    const sql: Sql = { exec: (query, ...args) => state.storage.sql.exec(query, ...args), transaction: run => state.storage.transactionSync(run) };
    const now = Date.parse("2099-01-01T00:00:00Z"), p = provider(() => now);
    const release = gate<unknown>();
    p.hold(() => release.promise);
    const tokens = new SiteTokenReuse(sql, () => artifactsReadiness(p.settings), () => now, async () => {});
    const leaders = Array.from({ length: 32 }, (_, n) => tokens.acquire(request(`refs/heads/held-${n}`)));
    expect(await tokens.acquire(request("refs/heads/overflow"))).toEqual({ ok: false, reason: "capacity" });
    const restarted = new SiteTokenReuse(sql, () => artifactsReadiness(p.settings), () => now, async () => {});
    expect(await restarted.acquire(request("refs/heads/overflow"))).toEqual({ ok: false, reason: "capacity" });
    const waiters = Array.from({ length: 8 }, () => tokens.acquire(request("refs/heads/held-0")));
    expect(await tokens.acquire(request("refs/heads/held-0"))).toEqual({ ok: false, reason: "capacity" }); // only eight global waiters so far
    waiters.push(...Array.from({ length: 7 }, (_, key) => Array.from({ length: 8 }, () => tokens.acquire(request(`refs/heads/held-${key + 1}`)))).flat());
    expect(await tokens.acquire(request("refs/heads/held-8"))).toEqual({ ok: false, reason: "capacity" });
    release.release({ scope: "read", plaintext: "shared-provider-answer", expiresAt: new Date(now + 120_000).toISOString() });
    expect((await Promise.all([...leaders, ...waiters])).every(answer => answer.ok)).toBe(true);
    expect(p.counts().mints).toBe(32);
    p.hold(null);
    for (let n = 32; n < 256; n++) expect((await tokens.acquire(request(`refs/heads/held-${n}`))).ok).toBe(true);
    expect(await tokens.acquire(request("refs/heads/key-overflow"))).toEqual({ ok: false, reason: "capacity" });
    expect((await tokens.acquire(request("refs/heads/held-0"))).ok).toBe(true);
    expect(p.counts().mints).toBe(256);
    expect(sql.exec("SELECT count(*) AS n FROM private_site_token").toArray()[0]?.["n"]).toBe(256);
  });
});

test("Site reuse keeps config and remote checks fresh and holds malformed or ambiguous mints without leaking secrets", async () => {
  const holder = await create();
  await holder.inside(async state => {
    const sql: Sql = { exec: (query, ...args) => state.storage.sql.exec(query, ...args), transaction: run => state.storage.transactionSync(run) };
    let now = Date.parse("2099-01-01T00:00:00Z");
    const p = provider(() => now);
    let settings: ArtifactsBindings = p.settings;
    let schedule = async () => {};
    const tokens = new SiteTokenReuse(sql, () => artifactsReadiness(settings), () => now, () => schedule());
    expect((await tokens.acquire(request())).ok).toBe(true);
    p.remote("https://foreign.invalid/replaced");
    expect(await tokens.acquire(request())).toEqual({ ok: false, reason: "provider", step: "info" });
    expect(p.counts().mints).toBe(1);
    const infoFailure = request("refs/heads/failed-before-mint");
    expect(await tokens.acquire(infoFailure)).toEqual({ ok: false, reason: "provider", step: "info" });
    p.remote(`https://${configuration.host}/git/${configuration.namespace}/${repository.name}.git`);
    expect((await tokens.acquire(infoFailure)).ok).toBe(true); // no mint entered: no 180s outage
    expect(p.counts().mints).toBe(2);
    settings = { ...p.settings, ARTIFACTS_CONFIG: canonicalize({ ...configuration, maxBytes: 2048 }) };
    expect(await tokens.acquire(request())).toEqual({ ok: false, reason: "unavailable" });
    settings = p.settings;
    schedule = async () => { settings = { ...p.settings, ARTIFACTS_CONFIG: canonicalize({ ...configuration, maxBytes: 2048 }) }; };
    expect(await tokens.acquire(request())).toEqual({ ok: false, reason: "unavailable" }); // changed across ready-hit scheduling await
    settings = p.settings; schedule = async () => {};
    for (const [n, reply] of [
      { scope: "write", plaintext: "private-write", expiresAt: new Date(now + 120_000).toISOString() },
      { scope: "read", plaintext: "x".repeat(4097), expiresAt: new Date(now + 120_000).toISOString() },
      { scope: "read", plaintext: "private-invalid", expiresAt: "2026-02-30T00:00:00Z" },
      { scope: "read", plaintext: "private-ended", expiresAt: new Date(now).toISOString() },
    ].entries()) {
      p.hold(async () => reply);
      const asked = request(`refs/heads/invalid-${n}`);
      expect(await tokens.acquire(asked)).toEqual({ ok: false, reason: "provider", step: "token" });
      const before = p.counts().mints;
      expect(await tokens.acquire(asked)).toEqual({ ok: false, reason: "mint-pending" });
      expect(p.counts().mints).toBe(before);
    }
    p.hold(async () => { throw Error("401 ambiguous PRIVATE"); });
    expect(await tokens.acquire(request("refs/heads/network"))).toEqual({ ok: false, reason: "provider", step: "token" });
    expect(await tokens.acquire(request("refs/heads/network"))).toEqual({ ok: false, reason: "mint-pending" });
    expect(JSON.stringify(sql.exec("SELECT plaintext FROM private_site_token WHERE state='reserved'").toArray())).not.toContain("private-");

    // A known expiry survives lost local custody; retry rearms without a
    // second live token. No null-plaintext row is classified as ready.
    p.hold(null);
    let alarms = 0;
    const lost = new SiteTokenReuse(sql, () => artifactsReadiness(settings), () => now, async () => { if (++alarms === 2) throw Error("scripted alarm failure"); });
    const alarmKey = request("refs/heads/alarm-failure");
    expect(await lost.acquire(alarmKey)).toEqual({ ok: false, reason: "unavailable" });
    expect(sql.exec("SELECT state,plaintext,ends FROM private_site_token WHERE state='unavailable'").toArray()).toEqual([{ state: "unavailable", plaintext: null, ends: now + 120_000 }]);
    const minted = p.counts().mints;
    expect(await lost.acquire(alarmKey)).toEqual({ ok: false, reason: "mint-pending" });
    expect([alarms, p.counts().mints]).toEqual([3, minted]);
    now += 120_000;
    expect((await lost.acquire(alarmKey)).ok).toBe(true);
    expect(p.counts().mints).toBe(minted + 1);
  });
});

// A known failure removes only its reservation. The last row must also
// release its alarm; a surviving future row must keep its earlier wake.
for (const { name, keepReady } of [
  { name: "actual fixed-owner Site RPC clears its last alarm after a joined pre-mint failure", keepReady: false },
  { name: "actual fixed-owner Site RPC preserves a future row's earlier alarm and generation after a joined pre-mint failure", keepReady: true },
]) test(name, async () => {
  const p = heldInfoProvider(), object = () => env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME));
  const retirement = siteTokenRetirement(object), snapshot = retirement.snapshot;
  // Strip successful token material before an answer can enter a test diff.
  const call = async (asked: SiteTokenRequest) => {
    const answer = await siteRpcAnswer(object(), asked);
    return answer.ok ? { ok: true, ends: answer.ends } : answer;
  };
  let pending: ReturnType<typeof call> | undefined;
  siteTokenTestSettings.set(SCOPE_INDEX_NAME, p.settings);
  try {
    expect(await siteRpcWithin(runInDurableObject(object(), (_instance, state) => state.storage.getAlarm()), "initial alarm")).toBeNull();
    let retained: Awaited<ReturnType<typeof snapshot>> | undefined;
    if (keepReady) {
      expect((await siteRpcWithin(call(request()), "ready token")).ok).toBe(true);
      retained = await snapshot();
      retirement.remember(retained, request());
      expect(retained.rows).toHaveLength(1);
      expect(retained.rows[0]).toMatchObject({ state: "ready", hasPlaintext: 1 });
      expect(retained.alarm).toBe(retained.rows[0]!["ends"]);
      expect(Number(retained.alarm)).toBeGreaterThan(Date.now());
    }
    p.hold();
    pending = call(request("refs/heads/fail-before-mint"));
    void pending.catch(() => {}); // The bounded join below retains any RPC rejection.
    await siteRpcWithin(p.entered, "held info entry");
    const held = await snapshot();
    retirement.remember(held, request("refs/heads/fail-before-mint"));
    const reservations = held.rows.filter(row => row["state"] === "reserved");
    expect(held.rows).toHaveLength(keepReady ? 2 : 1);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({ hasPlaintext: 0 });
    expect(Number(reservations[0]!["ends"])).toBeGreaterThan(Date.now());
    expect(p.counts()).toEqual({ active: 1, lateCalls: 0, mints: keepReady ? 1 : 0 });
    if (retained) {
      expect(held.rows.filter(row => row["state"] === "ready")).toEqual(retained.rows);
      expect(Number(reservations[0]!["ends"])).toBeGreaterThan(Number(retained.alarm));
      expect(held.alarm).toBe(retained.alarm);
    } else expect(held.alarm).toBe(reservations[0]!["ends"]);

    p.release();
    expect(await siteRpcWithin(pending, "failed RPC join")).toEqual({ ok: false, reason: "provider", step: "info" });
    await p.join();
    p.close(); // No provider writer remains before the final storage read.
    expect(p.counts()).toEqual({ active: 0, lateCalls: 0, mints: keepReady ? 1 : 0 });
    const settled = await snapshot();
    expect(settled.rows).toEqual(retained?.rows ?? []);
    expect(settled.alarm).toBe(retained?.alarm ?? null);
    expect(p.counts()).toEqual({ active: 0, lateCalls: 0, mints: keepReady ? 1 : 0 });
  } finally {
    p.release();
    try {
      if (pending) await siteRpcWithin(pending, "cleanup RPC join");
      await p.join();
      p.close();
      await retirement.retire();
    } finally { siteTokenTestSettings.delete(SCOPE_INDEX_NAME); }
  }
});

test("actual fixed-owner Site RPC survives eviction, retains earlier alarms and erases ended plaintext without another read", async () => {
  const p = provider(() => Date.now()), object = () => env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME));
  siteTokenTestSettings.set(SCOPE_INDEX_NAME, p.settings);
  try {
    const call = () => (object() as unknown as SiteTokenPort).acquireSiteRead(request());
    const first = await call();
    expect(first.ok).toBe(true);
    await evictDurableObject(object());
    expect(await call()).toEqual(first);
    expect(p.counts()).toEqual({ mints: 1, infos: 2, revokes: 0 });
    await runInDurableObject(object(), async (instance, state) => {
      const earlier = Date.now() + 60_000;
      await state.storage.setAlarm(earlier);
      expect(await (instance as unknown as SiteTokenPort).acquireSiteRead(request())).toEqual(first);
      expect(await state.storage.getAlarm()).toBe(earlier);
      // Mechanical expiry setup; production uses the actual provider expiry.
      state.storage.sql.exec("UPDATE private_site_token SET ends=?", Date.now() - 1).toArray();
    });
    expect(await runDurableObjectAlarm(object())).toBe(true);
    expect(await runInDurableObject(object(), (_instance, state) => state.storage.sql.exec("SELECT plaintext FROM private_site_token").toArray())).toEqual([]);
    expect(p.counts().mints).toBe(1); // alarm did not mint or read the provider
  } finally { siteTokenTestSettings.delete(SCOPE_INDEX_NAME); }
});

test("Artifacts Site close releases only the local reader and network refusal never remints a live shared token", async () => {
  const p = provider(() => Date.now());
  siteTokenTestSettings.set(SCOPE_INDEX_NAME, p.settings);
  const room: Room = { register: otherLane.scope, repository, branch: "main" };
  const settings: SiteEnv = { ...p.settings, SCOPES: env.SCOPES, SCOPE_INDEX: env.SCOPE_INDEX };
  try {
    const open = readerOf(settings, room, async () => new Response("ambiguous", { status: 401 }))!;
    const one = await open();
    await expect(one.source.ref("refs/heads/main")).rejects.toBeDefined();
    await one.close();
    expect(one.secrets).toEqual([]);
    expect(() => one.source.ref("refs/heads/main")).toThrow("Site reader closed");
    const two = await open();
    expect(two.secrets).toEqual(["private-1"]);
    await two.close();
    expect(p.counts()).toEqual({ mints: 1, infos: 2, revokes: 0 });
  } finally { siteTokenTestSettings.delete(SCOPE_INDEX_NAME); }
});
