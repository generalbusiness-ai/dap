/**
 * LV2, the live turn (live note, sections 3.3, 3.6 and 3.7). Real runtime
 * and SQLite storage in workerd. The test authority and the scripted clock
 * are stand-ins, and so is the live timer: the test fires it.
 */
import { env } from "cloudflare:workers";
import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, test } from "vitest";
import type { DeclaredDefinition, Grant, Intent, Item, ScopeId, ScopeRef, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { definitionDigest, intentDigest, scopeIdOf, signIntent } from "@generalbusiness/dap-bytes";
import { timeMs, timeOf, type StateSnapshot } from "@generalbusiness/dap-derive";
import { grantOf, keys, type Actor, type Over } from "@generalbusiness/dap-derive/testing";
import type { LiveAnswer } from "@generalbusiness/dap-platform";
import { liveForms } from "../../derive/test/definition-corpus/live-data.ts";
import { liveTurnsOf, type LiveTurns } from "../src/live.ts";
import { controls, type Controls } from "../src/testing.ts";
import { START, objectOf, reader, stubOf } from "./fixtures-native.ts";
import { Node, desk, later, net, settle, ticket } from "./net.ts";

const { rita, una } = keys;

/** A tally that counts, and leases that a timed rule ends 60 seconds after they open. `live`: the level; the rest is the same. */
function room(live: boolean): DeclaredDefinition {
  const declared = liveForms.timed();
  if (!live) delete declared.level;
  return declared;
}

type Live = { live(signed: SignedIntent, grants: readonly Grant[], generation: unknown): Promise<LiveAnswer> };

/** One created scope of `room(live)` in the namespace of the test ports, with its own controls. */
class Room {
  #keys = 0;
  constructor(readonly name: ScopeId, readonly c: Controls, readonly at: ScopeRef, readonly namespace: DurableObjectNamespace) {}
  /** `now`: the time of the namespace's clock. */
  static async create(live: boolean, namespace: DurableObjectNamespace = env.SCOPES, now = START): Promise<Room> {
    const declared = room(live);
    const intent: Intent = { v: 1, to: null, actor: rita.key, kind: declared.genesis, on: null, expected: {}, fields: {},
      idempotencyKey: crypto.randomUUID(), notAfter: timeOf(timeMs(now)! + 60_000) };
    const seed: Seed = { v: 1, kind: "directory", definition: definitionDigest(declared), creator: null, cause: intentDigest(intent), ordinal: 0 };
    const name = scopeIdOf(seed);
    const c = controls(name, START);
    const answer = await stubOf(name, namespace).create(signIntent(intent, rita.secret), declared);
    if (answer.answer !== "accepted") throw new Error(`not created: ${JSON.stringify(answer)}`);
    return new Room(name, c, answer.receipt.fact.at, namespace);
  }
  get object(): DurableObjectStub { return objectOf(this.name, this.namespace); }
  grants(): Grant[] { return [grantOf(rita, this.at, ["count", "lease"]), grantOf(una, this.at, ["count", "lease"])]; }
  intent(who: Actor, kind: string, over: Over = {}): SignedIntent {
    const intent: Intent = { v: 1, to: this.at, actor: who.key, kind, on: null, expected: {}, fields: {}, idempotencyKey: `k${this.#keys++}`,
      notAfter: timeOf(timeMs(this.c.clock.now)! + 60_000), ...over };
    return signIntent(intent, who.secret);
  }
  count(next: number, revision: number): SignedIntent { return this.intent(rita, "count", { on: 0, expected: { on: revision }, fields: { next } }); }
  lease(): SignedIntent { return this.intent(una, "lease"); }
  live(signed: SignedIntent, generation: unknown): Promise<LiveAnswer> { return (this.object as unknown as Live).live(signed, this.grants(), generation); }
  /** The live state as the live turn holds it now, in the object's isolate. */
  state(): Promise<{ generation: string; tick: number; snapshot: StateSnapshot } | null> {
    return runInDurableObject(this.object, (instance) => {
      const current = (instance as unknown as { [liveTurnsOf](): LiveTurns | null })[liveTurnsOf]()?.current();
      return current ? { generation: current.generation, tick: current.tick, snapshot: current.view.all() } : null;
    });
  }
  /** Every application row, the key-value contents and the alarm. */
  stored(): Promise<unknown> {
    return runInDurableObject(this.object, async (_instance, state) => {
      const tables = state.storage.sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name").toArray();
      const rows = tables.map(({ name }) => [name, state.storage.sql.exec(`SELECT * FROM "${name.replaceAll('"', '""')}"`).toArray()]);
      return { rows, kv: [...await state.storage.list()], alarm: await state.storage.getAlarm() };
    });
  }
  later(seconds: number): void { this.c.clock.now = timeOf(timeMs(this.c.clock.now)! + seconds * 1000); }
}

/** An item as both runs compare it: everything but the hash of its opening entry, which names a sealed entry in one run only. */
const shape = ({ opened: _opened, ...item }: Item) => item;

describe("the live turn on native storage", () => {
  test("an applied act, a refused stale expected, a reset after eviction, a repeat that applies again, and no stored row changes", async () => {
    const R = await Room.create(true);
    const created = await R.stored();
    const first = R.count(1, 1);
    // The sender has read no generation yet. Nothing is judged, and the answer names the current one.
    const reset = await R.live(first, null);
    expect(reset).toMatchObject({ answer: "reset" });
    const generation = (reset as Extract<LiveAnswer, { answer: "reset" }>).generation;
    // Entry 0 is the genesis, so the tick starts at 0 and the first applied act is tick 1.
    expect(await R.live(first, generation)).toEqual({ answer: "applied", generation, tick: 1 });
    expect(await R.live(first, generation)).toEqual({ answer: "applied", generation, tick: 1 });
    expect(await R.live(R.count(2, 1), generation)).toEqual({ answer: "refused", reason: "revision-moved", generation, tick: 1 });
    expect(await R.live(R.count(2, 2), generation)).toEqual({ answer: "applied", generation, tick: 2 });
    // An act that opens an item gives it the tick as its ID.
    expect(await R.live(R.lease(), generation)).toEqual({ answer: "applied", generation, tick: 3 });
    expect((await R.state())?.snapshot.items.map(({ id, type, revision }) => [id, type, revision])).toEqual([[0, "tally", 3], [3, "lease", 1]]);
    // A recorded act is not admitted, and the journal stays the two creation entries' (here the genesis alone: no creator).
    expect(await stubOf(R.name).submit(R.count(3, 3), R.grants())).toEqual({ answer: "unavailable", reason: "unavailable" });
    expect(await stubOf(R.name).summary(reader)).toMatchObject({ ok: true, at: { seq: 0 } });
    expect(await R.stored()).toEqual(created);

    await evictDurableObject(R.object);
    const after = await R.live(R.count(3, 3), generation);
    expect(after).toMatchObject({ answer: "reset" });
    const renewed = (after as Extract<LiveAnswer, { answer: "reset" }>).generation;
    expect(renewed).not.toBe(generation);
    // The new generation starts from the fold of the genesis. The repeat of the first applied intent applies again.
    expect(await R.live(first, renewed)).toEqual({ answer: "applied", generation: renewed, tick: 1 });
    expect((await R.state())?.snapshot.items).toMatchObject([{ id: 0, revision: 2, values: { count: 1 } }]);
    expect(await R.stored()).toEqual(created);
  });

  test("a timed rule runs from memory: its timer fires at the deadline, and an act drains what is due before it is judged", async () => {
    const R = await Room.create(true);
    const created = await R.stored();
    const generation = ((await R.live(R.lease(), null)) as Extract<LiveAnswer, { answer: "reset" }>).generation;
    expect(await R.live(R.lease(), generation)).toEqual({ answer: "applied", generation, tick: 1 });
    // One timer in memory, for the lease's deadline. No alarm is stored.
    expect(R.c.liveTimer?.milliseconds).toBe(60_000);
    R.later(60);
    await runInDurableObject(R.object, () => R.c.liveTimer!.fire());
    expect(await R.state()).toMatchObject({ generation, tick: 2, snapshot: { items: [{ id: 0 }, { id: 1, state: "ended" }] } });
    expect(R.c.liveTimer).toBeNull();
    // A second lease is due when the next act arrives and no timer fired: the act applies after it, one tick later.
    expect(await R.live(R.lease(), generation)).toEqual({ answer: "applied", generation, tick: 3 });
    R.later(61);
    expect(await R.live(R.count(1, 1), generation)).toEqual({ answer: "applied", generation, tick: 5 });
    expect((await R.state())?.snapshot.items.map(({ id, state }) => [id, state])).toEqual([[0, "open"], [1, "ended"], [3, "ended"]]);
    expect(await R.stored()).toEqual(created);
  });
});

test("one definition and one sequence of acts: the live run and the recorded run reach the same items and states", async () => {
  const [L, D] = [await Room.create(true), await Room.create(false)];
  const generation = ((await L.live(L.lease(), null)) as Extract<LiveAnswer, { answer: "reset" }>).generation;
  const steps: ((r: Room) => SignedIntent)[] = [(r) => r.count(1, 1), (r) => r.lease(), (r) => r.count(2, 2), (r) => r.lease()];
  for (const step of steps) {
    expect(await L.live(step(L), generation)).toMatchObject({ answer: "applied" });
    expect(await stubOf(D.name).submit(step(D), D.grants())).toMatchObject({ answer: "accepted" });
  }
  // Both leases are due. The recorded scope's alarm drains them; the live scope's timer does.
  for (const r of [L, D]) r.later(61);
  expect(await runDurableObjectAlarm(D.object)).toBe(true);
  await runInDurableObject(L.object, () => L.c.liveTimer!.fire());
  expect(await L.live(L.count(3, 3), generation)).toMatchObject({ answer: "applied", tick: 7 });
  expect(await stubOf(D.name).submit(D.count(3, 3), D.grants())).toMatchObject({ answer: "accepted", receipt: { fact: { seq: 7 } } });

  const live = (await L.state())!.snapshot;
  const summary = await stubOf(D.name).summary(reader);
  if (!summary.ok) throw new Error("no summary");
  // The summary lists the items that are not final, and a page of a type lists the final ones.
  const recorded: Item[] = [...summary.value.items];
  for (const type of ["tally", "lease"]) {
    const read = await stubOf(D.name).items(reader, type);
    if (!read.ok) throw new Error(`no ${type} items: ${read.reason}`);
    recorded.push(...read.value.filter((item) => !recorded.some((held) => held.id === item.id)));
  }
  expect(live.items.map(shape)).toEqual(recorded.sort((a, b) => a.id - b.id).map(shape));
  expect(live.items.map(({ id, type, state }) => [id, type, state])).toEqual([[0, "tally", "open"], [2, "lease", "ended"], [4, "lease", "ended"]]);
  // A snapshot leaves out a count of zero. The summary keeps it.
  expect(live.counts).toEqual(summary.value.counts.filter(([, , n]) => n !== 0));
});

/**
 * O2 as ruled: a delivery after the confirmation is answered `unavailable`, as transport carries it: `retry`. The sender's
 * dispatcher gives a request up only after `routingRefusals` routing refusals, so a request that is answered `retry` stays
 * outstanding and is offered again at a doubling delay, up to `dispatchRetryMaxSeconds`. No diagnosis settles it. The note's
 * open question 5 asks the planner how the sender's deadline settles it.
 */
test("O2: an active live scope answers a delivery retry and records nothing; the sender keeps its request outstanding", async () => {
  const D = await desk();
  const S = await ticket(D, "S");
  const L = await Room.create(true, env.NET, net.clock.now);
  const created = await L.stored();
  const node = new Node(L.name, room(true));
  const asked = await S.did(una, "ask", { fields: { desk: L.at } });
  await settle(S, node);
  for (const seconds of [1, 2, 4]) await later(seconds, S, node);
  const send = (await S.outboxItems()).find((item) => item.outboxId === `${asked.fact.seq}.0`);
  expect(send).toMatchObject({ class: "request", acknowledged: null, result: null, diagnosis: null });
  expect(send?.attempts.map((attempt) => attempt.answer)).toEqual(["retry", "retry", "retry", "retry"]);
  expect((await S.entries()).some((entry) => entry.input.type === "diagnosis")).toBe(false);
  expect(await L.stored()).toEqual(created);
});
