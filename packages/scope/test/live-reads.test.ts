/**
 * LV3, the live reads and the watch (live note, section 3.5, and open point
 * O1). Real runtime, SQLite storage and the Worker's routes in workerd. The
 * test authority, the scripted clock and the live timer are stand-ins. The
 * readers port is the test readers, a STAND-IN that allows every read,
 * except where a test names the real read sessions of `sessions.ts`.
 */
import { env } from "cloudflare:workers";
import { describe, expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition, Grant, Intent, Item, ScopeId, ScopeRef, Seed, SignedIntent } from "@generalbusiness/dap-contract";
import { b64url, canonicalize, definitionDigest, intentDigest, scopeIdOf, signIntent, utf8 } from "@generalbusiness/dap-bytes";
import { timeMs, timeOf, type ScopeState } from "@generalbusiness/dap-derive";
import { grantOf, keys, membership, type Actor, type Over } from "@generalbusiness/dap-derive/testing";
import { LIVE_BYTES, liveBytes, type LiveAnswer, type LiveLine, type LiveRead, type LiveSummary } from "@generalbusiness/dap-platform";
import { liveForms } from "../../derive/test/definition-corpus/live-data.ts";
import { LiveReads } from "../src/live-reads.ts";
import type { LiveTurns } from "../src/live.ts";
import { Streams, mintSession, readerOf, sessionReaders, sessionsOf, type Opened } from "../src/sessions.ts";
import { controls, testReaders, type Controls } from "../src/testing.ts";
import { route } from "../src/worker.ts";
import { START, objectOf, reader, stubOf } from "./fixtures-native.ts";
import { wired } from "./outside.ts";

const { rita, una } = keys;
type Binding = Parameters<typeof route>[1];
type Live = { live(signed: SignedIntent, grants: readonly Grant[], generation: unknown): Promise<LiveAnswer> };

/** One created live scope of `liveForms.timed()`: a tally, and leases that a timed rule ends 60 seconds after they open. */
class Room {
  #keys = 0;
  generation = "";
  constructor(readonly name: ScopeId, readonly c: Controls, readonly at: ScopeRef) {}
  /** `before`: what the test sets for this name before the object starts: its bounds, or its ports. */
  static async create(before: (name: ScopeId, c: Controls) => void = () => undefined): Promise<Room> {
    const declared: DeclaredDefinition = liveForms.timed();
    const intent: Intent = { v: 1, to: null, actor: rita.key, kind: declared.genesis, on: null, expected: {}, fields: {},
      idempotencyKey: crypto.randomUUID(), notAfter: timeOf(timeMs(START)! + 60_000) };
    const seed: Seed = { v: 1, kind: "directory", definition: definitionDigest(declared), creator: null, cause: intentDigest(intent), ordinal: 0 };
    const name = scopeIdOf(seed), c = controls(name, START);
    before(name, c);
    const answer = await stubOf(name).create(signIntent(intent, rita.secret), declared);
    if (answer.answer !== "accepted") throw new Error(`not created: ${JSON.stringify(answer)}`);
    const R = new Room(name, c, answer.receipt.fact.at);
    R.generation = ((await R.live(R.count(0, 1))) as Extract<LiveAnswer, { answer: "reset" }>).generation;
    return R;
  }
  intent(who: Actor, kind: string, over: Over = {}): SignedIntent {
    return signIntent({ v: 1, to: this.at, actor: who.key, kind, on: null, expected: {}, fields: {}, idempotencyKey: `k${this.#keys++}`,
      notAfter: timeOf(timeMs(this.c.clock.now)! + 60_000), ...over }, who.secret);
  }
  count(next: number, revision: number): SignedIntent { return this.intent(rita, "count", { on: 0, expected: { on: revision }, fields: { next } }); }
  lease(): SignedIntent { return this.intent(una, "lease"); }
  live(signed: SignedIntent): Promise<LiveAnswer> {
    const grants = [grantOf(rita, this.at, ["count", "lease"]), grantOf(una, this.at, ["count", "lease"])];
    return (objectOf(this.name) as unknown as Live).live(signed, grants, this.generation);
  }
  /** One GET over the Worker's route, with what the reader presents. */
  get(path: string, presented: string | null = reader): Promise<Response> {
    return route(new Request(`https://scopes.test/v1/scopes/${this.name}${path}`, presented === null ? {} : { headers: { authorization: presented } }), env.SCOPES as unknown as Binding, {}, null);
  }
  async read<T>(path: string, presented: string | null = reader): Promise<[number, LiveRead<T>]> {
    const response = await this.get(path, presented);
    return [response.status, await response.json()];
  }
  /** The watch over the Worker's route: its lines, as they are read. */
  async watch(presented: string | null = reader): Promise<{ next(): Promise<LiveLine | null>; cancel(): Promise<void> }> {
    const response = await this.get("/live-stream", presented);
    if (response.status !== 200) throw new Error(`no watch: ${response.status} ${await response.text()}`);
    const from = response.body!.getReader(), decoder = new TextDecoder();
    return {
      async next() {
        const { done, value } = await from.read();
        if (done) return null;
        const lines = decoder.decode(value).trim().split("\n");
        // One read is one line: nothing is queued behind a line that waits.
        expect(lines).toHaveLength(1);
        return JSON.parse(lines[0]!) as LiveLine;
      },
      cancel: () => from.cancel(),
    };
  }
}

const bytesOf = (items: readonly Item[]): number => items.reduce((n, item) => n + utf8(canonicalize(item)).length, 0);

describe("the live reads and the watch", () => {
  test("a read names the generation and the tick, and the reads of the record and of live state never mix", async () => {
    const R = await Room.create();
    const { generation } = R;
    expect(await R.read<LiveSummary>("/live")).toEqual([200, { ok: true, generation, tick: 0, complete: true, value: {
      scope: R.at, definition: definitionDigest(liveForms.timed()),
      items: [expect.objectContaining({ id: 0, type: "tally", state: "open", values: { count: 0 } })],
      counts: [["lease", "ended", 0], ["lease", "open", 0], ["tally", "closed", 0], ["tally", "open", 1]],
    } }]);
    expect(await R.live(R.count(7, 1))).toEqual({ answer: "applied", generation, tick: 1 });
    expect(await R.live(R.lease())).toEqual({ answer: "applied", generation, tick: 2 });
    const [, summary] = await R.read<LiveSummary>("/live");
    expect(summary).toMatchObject({ ok: true, generation, tick: 2, value: { items: [{ id: 0, values: { count: 7 } }, { id: 2, type: "lease", state: "open" }] } });
    expect(summary).not.toHaveProperty("at");
    // The timed rule ends the lease: the live items read finds it among the final leases, at the tick that ended it.
    R.c.clock.now = timeOf(timeMs(START)! + 60_000);
    expect(await R.live(R.count(8, 2))).toEqual({ answer: "applied", generation, tick: 4 });
    expect(await R.read<Item[]>("/live-items/lease")).toEqual([200, { ok: true, generation, tick: 4, complete: true,
      value: [expect.objectContaining({ id: 2, state: "ended" })] }]);
    expect(await R.read("/live-items/nothing")).toEqual([404, { ok: false, reason: "not-found" }]);
    // The summary of the record answers the journal's head, its one creation entry, and names no generation.
    const recorded = await stubOf(R.name).summary(reader);
    expect(recorded).toMatchObject({ ok: true, at: { seq: 0 }, value: { items: [{ id: 0, values: { count: 0 } }] } });
    expect(recorded).not.toHaveProperty("generation");
  });

  test("two viewers receive a line for a change", async () => {
    const R = await Room.create();
    const [first, second] = [await R.watch(), await R.watch()];
    const now = { generation: R.generation, tick: 0 };
    expect([await first.next(), await second.next()]).toEqual([now, now]);
    expect(await R.live(R.count(1, 1))).toMatchObject({ answer: "applied", tick: 1 });
    expect([await first.next(), await second.next()]).toEqual([{ ...now, tick: 1 }, { ...now, tick: 1 }]);
    await Promise.all([first.cancel(), second.cancel()]);
    const serving = await (objectOf(R.name) as unknown as { serving(): Promise<{ streams: { open: number; released: number } }> }).serving();
    expect(serving.streams).toEqual({ open: 0, released: 2 });
  });

  test("a slow viewer reads the latest state: one line waits, and the changes behind it send nothing more", async () => {
    const R = await Room.create();
    const watch = await R.watch();
    expect(await watch.next()).toEqual({ generation: R.generation, tick: 0 });
    // The viewer does not read while six acts apply.
    for (let next = 1; next <= 6; next++) await R.live(R.count(next, next));
    // The object holds one line that waits, made at tick 1. The RPC stream between the object and the route had already taken
    // the next one, made at tick 2. Behind them nothing waits: the reader's next read is sent the latest tick, 6.
    const ticks: number[] = [];
    for (let reads = 0; reads < 6 && ticks.at(-1) !== 6; reads++) ticks.push((await watch.next())!.tick);
    expect(ticks.at(-1)).toBe(6);
    expect(ticks.length).toBeLessThan(6);
    expect(await R.read<LiveSummary>("/live")).toMatchObject([200, { tick: 6, value: { items: [{ values: { count: 6 } }] } }]);
    expect(await R.live(R.count(7, 7))).toMatchObject({ tick: 7 });
    expect(await watch.next()).toEqual({ generation: R.generation, tick: 7 });
    await watch.cancel();
  });

  test("a viewer with no session is refused: the real read sessions authorize the live reads and the watch", async () => {
    // The real readers port of `sessions.ts`, under a TEST SECRET. The scope's record and membership reference are STAND-INS:
    // this live scope records no membership, so the port is told the fixture's membership reference.
    const sessions = sessionsOf(b64url(crypto.getRandomValues(new Uint8Array(32))), "lv3-test")!;
    let at: ScopeRef | null = null;
    const R = await Room.create((name, c) => wired.set(name, () => ({
      readers: sessionReaders({ sessions: () => sessions, clock: c.clock, membership: () => membership,
        scope: () => (at ? { at, kind: "directory", time: START } as ScopeState : null) }),
    })));
    at = R.at;
    const session = readerOf(mintSession(sessions, { v: 1, deployment: "lv3-test", membership, member: rita.member.member, key: rita.key,
      reads: ["summary", "items"], ends: timeOf(timeMs(START)! + 600_000) }));
    for (const presented of [null, "Session ars1.bm8.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", reader]) {
      expect([await R.read("/live", presented), await R.read("/live-items/lease", presented), await R.read("/live-stream", presented)])
        .toEqual(Array(3).fill([403, { ok: false, reason: "forbidden" }]));
    }
    expect(await R.read("/live", session)).toMatchObject([200, { ok: true, generation: R.generation, tick: 0 }]);
    const watch = await R.watch(session);
    expect(await watch.next()).toEqual({ generation: R.generation, tick: 0 });
    await watch.cancel();
  });

  test("O1: an act that would pass the byte bound of the definition's item limits is refused scope-full, and a timed rule still runs", async () => {
    // A small configured `entryBytes`: the bound is (tally max 1 + lease max 4) times it.
    const entryBytes = 4096, bound = liveBytes(liveForms.timed().items, entryBytes);
    const R = await Room.create((_name, c) => { c.bounds = { ...PROPOSED_BOUNDS, entryBytes }; });
    let refused: LiveAnswer | null = null;
    for (let round = 0; round < 40 && !refused; round++) {
      for (let lease = 0; lease < 4 && !refused; lease++) {
        const answer = await R.live(R.lease());
        if (answer.answer !== "applied") refused = answer;
      }
      R.c.clock.now = timeOf(timeMs(R.c.clock.now)! + 60_000);
    }
    expect(refused).toMatchObject({ answer: "refused", reason: "scope-full", name: LIVE_BYTES, generation: R.generation });
    const [, held] = await R.read<Item[]>("/live-items/lease");
    const [, summary] = await R.read<LiveSummary>("/live");
    if (!held.ok || !summary.ok) throw new Error("no read");
    expect(bytesOf([...summary.value.items, ...held.value])).toBeLessThanOrEqual(bound);
    // The timed rule that ends the open leases is not held to the bound.
    const open = summary.value.items.filter(item => item.type === "lease").length;
    expect(open).toBeGreaterThan(0);
    R.c.clock.now = timeOf(timeMs(R.c.clock.now)! + 60_000);
    // The act drains the due rules first, then is judged: the count is smaller than a lease, and may still fit.
    const counted = await R.live(R.count(1, 1));
    expect(await R.read<LiveSummary>("/live")).toMatchObject([200, { tick: summary.tick + open + (counted.answer === "applied" ? 1 : 0), value: { items: [{ type: "tally" }] } }]);
    const [, afterHeld] = await R.read<Item[]>("/live-items/lease");
    const [, afterSummary] = await R.read<LiveSummary>("/live");
    if (!afterHeld.ok || !afterSummary.ok) throw new Error("no read after timed drain");
    expect(bytesOf([...afterSummary.value.items, ...afterHeld.value])).toBeLessThanOrEqual(bound);
  });
});

describe("the watch's line", () => {
  test("a new generation sends a line, at the same tick", async () => {
    // A STAND-IN live turn: the generation and tick are set by the test. The streams and the line are the object's own.
    let current = { generation: "a".repeat(32), tick: 5 };
    const turns = { current: () => ({ ...current, view: null }) } as unknown as LiveTurns;
    const reads = new LiveReads(testReaders, () => turns, () => null, 1);
    const streams = new Streams(testReaders, () => null);
    const opened = streams.open(reader, reads.line) as Opened;
    const from = opened.body.getReader(), decoder = new TextDecoder();
    const next = async () => JSON.parse(decoder.decode((await from.read()).value)) as LiveLine;
    expect(await next()).toEqual(current);
    current = { generation: "b".repeat(32), tick: 5 };
    streams.publish();
    expect(await next()).toEqual(current);
  });
});
