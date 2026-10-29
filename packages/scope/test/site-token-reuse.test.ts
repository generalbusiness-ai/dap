/** Actual SQLite/fixed-owner custody and scheduling; Artifacts is scripted.
 * No provider-side exactly-once or deployed token lifetime claim. */
import { expect, test, vi } from "vitest";
import { env } from "cloudflare:workers";
import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { otherLane } from "@generalbusiness/dap-derive/testing";
import { SiteTokenReuse, type SiteTokenRequest, type SiteTokenPort } from "../src/site/token-reuse.ts";
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

// Distinct object names select isolated owners through the existing env-only
// settings map. The production ScopeIndex class, SQL, clock and scheduler run
// unchanged; these cases do not claim the deployed fixed-name binding.
for (const { name, keepReady } of [
  { name: "isolated ScopeIndex Site RPC clears its last alarm after a pre-mint failure", keepReady: false },
  { name: "isolated ScopeIndex Site RPC preserves a future row's alarm and generation after a pre-mint failure", keepReady: true },
]) test(name, async () => {
  const owner = `site-token-idle-${keepReady ? "ready" : "empty"}-${crypto.randomUUID()}`;
  const object = () => env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(owner)), p = provider(() => Date.now());
  const snapshot = () => runInDurableObject(object(), async (_instance, state) => ({
    rows: state.storage.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='private_site_token'").toArray().length === 0 ? []
      : state.storage.sql.exec("SELECT key,generation,state,ends,plaintext IS NOT NULL AS hasPlaintext FROM private_site_token ORDER BY key").toArray(),
    alarm: await state.storage.getAlarm(),
  }));
  const call = async (asked: SiteTokenRequest) => {
    const answer = await (object() as unknown as SiteTokenPort).acquireSiteRead(asked);
    try {
      // Copy only metadata, then release the raw RPC reply.
      return answer.ok ? { ok: true, ends: answer.ends }
        : answer.reason === "provider" ? { ok: false, reason: answer.reason, step: answer.step }
        : { ok: false, reason: answer.reason };
    } finally { (answer as typeof answer & Partial<Disposable>)[Symbol.dispose]?.(); }
  };
  let observed: Awaited<ReturnType<typeof snapshot>> | undefined;
  siteTokenTestSettings.set(owner, p.settings);
  try {
    const initial = await snapshot();
    expect(initial).toEqual({ rows: [], alarm: null });
    observed = initial;
    let retained: typeof observed | undefined;
    if (keepReady) {
      expect((await call(request())).ok).toBe(true);
      retained = observed = await snapshot();
      expect(retained.rows).toHaveLength(1);
      expect(retained.rows[0]).toMatchObject({ state: "ready", hasPlaintext: 1 });
      expect(retained.alarm).toBe(retained.rows[0]!["ends"]);
      expect(Number(retained.alarm)).toBeGreaterThan(Date.now());
    }
    p.remote("https://foreign.invalid/replaced");
    const refused = await call(request("refs/heads/fail-before-mint"));
    observed = await snapshot();
    expect(refused).toEqual({ ok: false, reason: "provider", step: "info" });
    expect(p.counts()).toEqual({ mints: keepReady ? 1 : 0, infos: keepReady ? 2 : 1, revokes: 0 });
    expect(observed.rows).toEqual(retained?.rows ?? []);
    expect(observed.alarm).toBe(retained?.alarm ?? null);
  } finally {
    try {
      // After the measured assertions, retire only observed generations and
      // the observed alarm. No eviction or physical-drain claim follows.
      const owned = observed;
      if (owned && (owned.rows.length !== 0 || owned.alarm !== null)) {
        const retired = await runInDurableObject(object(), async (_instance, state) => {
          state.storage.transactionSync(() => {
            for (const row of owned.rows) {
              if (typeof row["key"] !== "string" || typeof row["generation"] !== "string") throw Error("Site ownership metadata is malformed");
              state.storage.sql.exec("DELETE FROM private_site_token WHERE key=? AND generation=?", row["key"], row["generation"]).toArray();
            }
          });
          const alarm = await state.storage.getAlarm();
          const remaining = state.storage.sql.exec("SELECT count(*) AS n FROM private_site_token").toArray()[0]!["n"];
          // Preserve any successor row or a different, unowned alarm.
          if (remaining === 0 && alarm !== null && alarm === owned.alarm) await state.storage.deleteAlarm();
          return { remaining, alarm: await state.storage.getAlarm() };
        });
        if (retired.remaining !== 0 || retired.alarm !== null) throw Error("Site cleanup retained an unowned row or alarm");
      }
    } finally { siteTokenTestSettings.delete(owner); }
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
