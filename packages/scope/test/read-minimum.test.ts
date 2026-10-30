/** Real native ScopeObject, turn, journal and SQLite. The first fixtures use
 * test authority/readers and a scripted clock. The expiry case uses the
 * production session reader over an actually created native room, with a
 * TEST session minted from that room's exact membership. No physical drain
 * or deployed timer precision is claimed. */
import { expect, test } from "vitest";
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";
import type { ReadMinimum } from "@generalbusiness/dap-contract";
import { encodeReadMinimumParameter, newIncarnation, textDigest } from "@generalbusiness/dap-bytes";
import { ScopeObject, type Wiring } from "../src/object.ts";
import { api, route, sessionWiring } from "../src/worker.ts";
import { mintSession, readerOf } from "../src/sessions.ts";
import { controls, testPorts } from "../src/testing.ts";
import { create, reader, sessionRoom, type Lane } from "./fixtures-native.ts";
import { net } from "./net.ts";

const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
class Timer {
  value = 0;
  readonly tasks = new Set<{ at: number; work(): void }>();
  readonly gates = new Map<number, ReturnType<typeof deferred>>();
  started = 0;
  now = () => this.value;
  after(ms: number, work: () => void) {
    const task = { at: this.value + ms, work }; this.tasks.add(task);
    this.gates.get(++this.started)?.resolve();
    return () => { this.tasks.delete(task); };
  }
  armed(count: number) {
    if (this.started >= count) return Promise.resolve();
    const gate = deferred(); this.gates.set(count, gate); return gate.promise;
  }
  advance(ms: number) { this.value += ms; for (const task of [...this.tasks]) if (task.at <= this.value) { this.tasks.delete(task); task.work(); } }
}
async function inside<T>(work: (object: ScopeObject, lane: Lane, timer: Timer, state: DurableObjectState) => Promise<T>): Promise<T> {
  const lane = await create({ readWaitMilliseconds: 1000 });
  return lane.inside(async state => {
    const timer = new Timer();
    class WaitScope extends ScopeObject {
      protected override wiring(): Wiring { return { ports: testPorts(lane.c), bounds: lane.c.bounds, queryTimer: timer }; }
    }
    return work(new WaitScope(state, {}), lane, timer, state);
  });
}

test("native minimum reads wait for a seal while the same scope accepts the concurrent write", async () => {
  await inside(async (object, lane, timer) => {
    const minimum: ReadMinimum = { at: lane.at, head: 1 };
    const entry = object.entry(reader, 1, minimum);
    const summary = object.summary(reader, minimum);
    const history = object.history(reader, undefined, minimum);
    const items = object.items(reader, "hold", undefined, minimum);
    await timer.armed(4);
    const answer = await object.submit(lane.remark("arrival"), lane.grants());
    expect(answer.answer).toBe("accepted");
    if (answer.answer !== "accepted") return;
    const results = await Promise.all([entry, summary, history, items]);
    for (const result of results) expect(result).toMatchObject({ ok: true, at: { seq: 1, hash: answer.receipt.fact.hash } });
    expect(results[0]).toMatchObject({ value: { hash: answer.receipt.fact.hash, entry: { seq: 1 } } });
    expect(timer.tasks.size).toBe(0);
    // Full-head minimum checks the actual sealed hash, including after a
    // later write. A forged hash never becomes a seq-only success.
    const full = { at: lane.at, head: { seq: 1, hash: answer.receipt.fact.hash } };
    expect((await object.entry(reader, 1, full)).ok).toBe(true);
    const again = await object.submit(lane.remark("later"), lane.grants());
    expect(again.answer).toBe("accepted");
    expect((await object.entry(reader, 1, full)).ok).toBe(true);
    expect(await object.entry(reader, 1, { ...full, head: { seq: 1, hash: textDigest("wrong") } })).toEqual({ ok: false, reason: "unavailable" });
    expect(timer.started).toBe(4);
  });
});

test("native wait timeout reports the authorized current fact and leaves no timer, entry or alarm", async () => {
  await inside(async (object, lane, timer, state) => {
    const before = await object.summary(reader), alarm = await state.storage.getAlarm();
    const pending = object.entry(reader, 99, { at: lane.at, head: 99 });
    await timer.armed(1);
    timer.advance(1000);
    expect(await pending).toEqual({ ok: false, reason: "behind", current: lane.genesis.fact });
    expect(timer.tasks.size).toBe(0);
    expect(await object.summary(reader)).toEqual(before);
    expect(await state.storage.getAlarm()).toBe(alarm);
    expect(await object.summary(reader, { at: { ...lane.at, inc: newIncarnation(new Uint8Array(16).fill(99)) }, head: 99 })).toEqual({ ok: false, reason: "wrong-incarnation" });
    expect(await object.summary(reader, { at: { ...lane.at, kind: "lane" }, head: 99 })).toEqual({ ok: false, reason: "unavailable" });
    expect(timer.started).toBe(1);
  });
});

test("native wait rechecks actual session expiry before exposing timeout or incarnation metadata", async () => {
  const f = await sessionRoom(), previous = net.clock.now;
  try {
    const child = f.children[1]!;
    await f.life.wait(() => runInDurableObject(child.object, async (_instance, state) => {
      const timer = new Timer(), c = controls(child.name); c.clock = net.clock;
      class WaitScope extends ScopeObject {
        protected override wiring(): Wiring { return { ports: testPorts(c), ...sessionWiring(() => f.sessions, env.PLATFORM), bounds: { ...c.bounds, readWaitMilliseconds: 1000 }, queryTimer: timer }; }
      }
      const object = new WaitScope(state, {}), token = readerOf(mintSession(f.sessions, { ...f.claims, reads: ["summary", "items", "history", "entry"] }));
      const before = await object.summary(token);
      expect(before.ok).toBe(true);
      const pending = object.entry(token, 9999, { at: f.rules, head: 9999 });
      await timer.armed(1);
      net.clock.now = f.claims.ends;
      timer.advance(1000);
      expect(await pending).toEqual({ ok: false, reason: "forbidden" });
      expect(await object.summary(token, { at: { ...f.rules, inc: newIncarnation(new Uint8Array(16).fill(99)) }, head: 9999 })).toEqual({ ok: false, reason: "forbidden" });
      expect(timer.tasks.size).toBe(0);
      expect(timer.started).toBe(1);
    }));
  } finally { net.clock.now = previous; f.life.release(); }
});

test("native HTTP and in-process reads share the minimum while malformed HTTP minima expose no head", async () => {
  const lane = await create(), minimum = { at: lane.at, head: lane.genesis.fact.seq };
  const encoded = encodeReadMinimumParameter(minimum)!;
  const url = `https://scopes.test/v1/scopes/${lane.name}`;
  const response = await route(new Request(`${url}?atLeast=${encoded}`), env.SCOPES);
  expect([response.status, await response.json()]).toMatchObject([200, { ok: true, at: { seq: 0 } }]);
  expect(await api(env.SCOPES).summary(lane.name, reader, minimum)).toMatchObject({ ok: true, at: { seq: 0 } });
  for (const query of ["atLeast=bad", `atLeast=${encoded}&atLeast=${encoded}`]) {
    const invalid = await route(new Request(`${url}?${query}`), env.SCOPES);
    expect([invalid.status, await invalid.json()]).toEqual([400, { error: "bad-request" }]);
  }
});
