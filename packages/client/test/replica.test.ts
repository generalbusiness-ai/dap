/**
 * The replica of a declared scope (request 208a0378): its states and each
 * cause of `stopped`, `close()`, typed rows, `Judged`, the entry of one
 * signer, and the catch sites of `Own` (dd21b684, item 6). The scope is a
 * `Ledger` of the derive fixtures behind a scripted binding
 * (`replica-support.ts`).
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Entry, type LogPage, type MemberRef, type Read } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, intentDigest, textDigest } from "@generalbusiness/dap-bytes";
import { validateDefinition, type PlatformRules, type RuleGiven } from "@generalbusiness/dap-derive";
import { Scope, changedDraft, directory, keys, lane, laneDefinition, valid, type Actor } from "@generalbusiness/dap-derive/testing";
import { gateRules, gateWith } from "../../derive/test/fixtures-marks.ts";
import { M as marks } from "../../derive/test/definition-corpus/forms-settles-data.ts";
import { settlesChanges } from "../../derive/test/definition-corpus/settles-variants.ts";
import { observeScope } from "../src/index.ts";
import { scopeReplica, judged, intentMeaning, UnheldEntry, type Replica, type ReplicaView } from "../src/scope.ts";
import * as entry from "../src/scope.ts";
import { seamOf } from "../src/replica.ts";
import { HeldEntries } from "../src/replica-own.ts";
import { judgedOn } from "../src/replica-judged.ts";
import { TransportError } from "../src/handle.ts";
import { Feed, citing, citingDefinition, served } from "./replica-support.ts";

const { rita, una } = keys;
const actor = (who: Actor) => ({ key: who.key, member: who.member, principal: who.principal });

/** A lane with a commitment (item 2) that rita offered, and a remark (entry 3). */
function laneScope(definition = citingDefinition): Scope {
  const s = new Scope(definition);
  s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: s.item(0).revision } });
  s.did(una, "remark", { on: 0, fields: { text: "seen" } });
  return s;
}

/** Start a replica of the scope, fed to its head. */
async function started(s: Scope, declared = citing, over: Parameters<typeof served>[3] = {}) {
  const { handle, serving } = served(s, declared, s.definition.digest, over);
  const feed = new Feed();
  const replica = scopeReplica(handle, { observe: feed.observe });
  feed.current(s);
  await replica.read();
  return { replica, feed, serving };
}

const views = <D extends DeclaredDefinition>(replica: Replica<D>) => {
  const seen: ReplicaView<D>[] = [];
  replica.subscribe((view) => seen.push(view));
  return seen;
};

afterEach(() => { vi.useRealTimers(); });

/** A member of the target, with a method bound to the target, so that a proxy reads its private fields. */
const bound = (target: object, name: string | symbol): unknown => {
  const value: unknown = Reflect.get(target, name, target);
  return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
};

describe("the states of the replica", () => {
  test("starting, then current at the feed's head: the replica's state equals a fold of the same entries with applyEntry", async () => {
    const s = laneScope();
    const { handle } = served(s, citing);
    const feed = new Feed();
    const replica = scopeReplica(handle, { observe: feed.observe });
    expect(replica.view.state).toEqual({ is: "starting" });
    const seen = views(replica);
    feed.current(s);
    await replica.read();
    expect(seen.map((view) => view.state.is)).toEqual(["current"]);
    expect(replica.view.head).toEqual(s.head);
    expect(seamOf(replica).held.size).toBe(s.entries.length);
    expect(seamOf(replica).state().snapshot()).toBe(s.replay().snapshot());
  });

  test("before the feed streams, a replica at the log's head is behind", async () => {
    const s = laneScope();
    const replica = scopeReplica(served(s, citing).handle, { observe: new Feed().observe });
    await replica.read();
    expect(replica.view).toMatchObject({ state: { is: "behind" }, head: s.head });
  });

  test("current to behind when the feed is down, and to current when it returns", async () => {
    const s = laneScope();
    const { replica, feed } = await started(s);
    feed.down();
    expect(replica.view.state).toEqual({ is: "behind" });
    s.did(una, "remark", { on: 0, fields: { text: "later" } });
    feed.current(s);
    await replica.read();
    expect(replica.view).toMatchObject({ state: { is: "current" }, head: s.head });
  });

  test("an answer that names a later head makes the replica behind until it holds that head; a failed read keeps it behind", async () => {
    const s = laneScope();
    const { replica, serving } = await started(s);
    const before = s.head;
    s.did(una, "remark", { on: 0, fields: { text: "answered" } });
    serving.refuse = () => ({ ok: false, reason: "unavailable" });
    await replica.read(s.head);
    expect(replica.view).toMatchObject({ state: { is: "behind" }, head: before });
    serving.refuse = null;
    await replica.read();
    expect(replica.view).toMatchObject({ state: { is: "current" }, head: s.head });
  });

  test("a reconnect retries a failed read to a known head and reaches current with no new entry", async () => {
    const s = laneScope();
    const { replica, feed, serving } = await started(s);
    const before = s.head;
    s.did(una, "remark", { on: 0, fields: { text: "answered" } });
    serving.refuse = () => { throw new TransportError("reply lost"); };
    await replica.read(s.head);
    expect(replica.view).toMatchObject({ state: { is: "behind" }, head: before });
    const reads = serving.reads.length;
    const entries = s.entries.length;
    feed.down();
    serving.refuse = null;
    const current = new Promise<void>((resolve) => {
      const unsubscribe = replica.subscribe((view) => {
        if (view.state.is === "current") { unsubscribe(); resolve(); }
      });
    });
    feed.emit({ status: "streaming" });
    await current;
    expect(replica.view).toMatchObject({ state: { is: "current" }, head: s.head });
    expect(serving.reads.slice(reads)).toEqual([before.seq + 1]);
    expect(s.entries).toHaveLength(entries);
    replica.close();
  });

  test("a subscriber's next-head read at completion runs without a third trigger", async () => {
    const s = laneScope();
    const { replica, serving } = await started(s);
    const from = s.head.seq + 1;
    const reads = serving.reads.length;
    let nextRead!: (read: Promise<void>) => void;
    const completed = new Promise<void>((resolve) => { nextRead = resolve; });
    const unsubscribe = replica.subscribe(() => {
      unsubscribe();
      // The first microtask precedes the loop's final continuation; the second
      // follows it but precedes a separate Promise.finally ownership release.
      queueMicrotask(() => {
        queueMicrotask(() => {
          s.did(una, "remark", { on: 0, fields: { text: "next head" } });
          nextRead(replica.read(s.head));
        });
      });
    });
    s.did(una, "remark", { on: 0, fields: { text: "first head" } });
    await replica.read();
    await completed;
    expect(serving.reads.slice(reads)).toEqual([from, from + 1]);
    expect(replica.view).toMatchObject({ state: { is: "current" }, head: s.head });
    expect(seamOf(replica).state().snapshot()).toBe(s.replay().snapshot());
    replica.close();
  });

  test("one fold failure: the replica folds again from the genesis entry, and is current", async () => {
    const s = laneScope();
    const { replica, feed, serving } = await started(s);
    s.did(una, "remark", { on: 0, fields: { text: "next" } });
    // One copy of the next entry names another previous entry: its bytes hash, and it does not follow the head.
    serving.replace.set(s.head.seq, { ...s.last, prev: s.entries[0]!.hash } as Entry);
    const seen = views(replica);
    feed.current(s);
    await replica.read();
    // The notice names a later head first: behind, until the read ends.
    expect(seen.map((view) => view.state.is)).toEqual(["behind", "folding", "current"]);
    expect(serving.reads.slice(-2)).toEqual([s.head.seq, 0]);
    expect(seamOf(replica).state().snapshot()).toBe(s.replay().snapshot());
  });
});

describe("each cause of stopped", () => {
  test("forbidden before Observe returns cancels its returned observation once, including after close", async () => {
    const s = laneScope();
    const { handle, serving } = served(s, citing);
    const cancelled = vi.fn();
    const replica = scopeReplica(handle, { observe: (emit) => {
      emit({ status: "forbidden", reason: "forbidden" });
      return { refresh: () => {}, cancel: cancelled, done: Promise.resolve() };
    } });
    replica.close();
    replica.close();
    await replica.read();
    expect(replica.view.state).toEqual({ is: "stopped", cause: { by: "forbidden" } });
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(serving.reads).toEqual([]);
  });

  test("close: stopped, and the feed is cancelled one time", async () => {
    const { replica, feed } = await started(laneScope());
    replica.close();
    replica.close();
    expect([replica.view.state, feed.cancelled]).toEqual([{ is: "stopped", cause: { by: "close" } }, 1]);
  });

  test("protocol: a refusal of class protocol stops the replica, and one of class head does not", async () => {
    const { replica, feed } = await started(laneScope());
    expect(replica.protocol("revision-moved")).toBe(false);
    expect(replica.view.state).toEqual({ is: "current" });
    expect(replica.protocol("wrong-pin")).toBe(true);
    expect([replica.view.state, feed.cancelled]).toEqual([{ is: "stopped", cause: { by: "protocol", reason: "wrong-pin" } }, 1]);
  });

  test("definition: a definition that is not valid, and another definition than the scope's", async () => {
    const s = laneScope();
    const broken = changedDraft(citing, (d: { genesis: string }) => { d.genesis = "no-such-act"; });
    const invalid = scopeReplica(served(s, broken, definitionDigest(broken)).handle, { observe: new Feed().observe });
    expect(invalid.view.state).toEqual({ is: "stopped", cause: { by: "definition" } });

    const other = scopeReplica(served(s, lane, laneDefinition.digest).handle, { observe: new Feed().observe });
    await other.read();
    expect(other.view.state).toEqual({ is: "stopped", cause: { by: "definition" } });

  });

  test("forbidden: the log refuses, the reader reads a filtered page, or the observation is forbidden", async () => {
    const s = laneScope();
    const refused = scopeReplica(served(s, citing, undefined, { refuse: () => ({ ok: false, reason: "forbidden" }) }).handle, { observe: new Feed().observe });
    await refused.read();
    const filtered = scopeReplica(served(s, citing, undefined, {}, "Signed TEST").handle, { observe: new Feed().observe });
    await filtered.read();
    const { replica, feed } = await started(s);
    feed.emit({ status: "forbidden", reason: "forbidden" });
    for (const stopped of [refused, filtered, replica]) expect(stopped.view.state).toEqual({ is: "stopped", cause: { by: "forbidden" } });
    expect(feed.cancelled).toBe(1);
  });

  test("archived: a scope with an archive floor stops the replica at its first read", async () => {
    const s = laneScope();
    const archived: Read<LogPage> = { ok: false, reason: "archived", archived: { floor: 2, commit: "c".repeat(40), through: s.entries[1]!.entry.seq === 1 ? { seq: 1, hash: s.entries[1]!.hash } : s.head }, next: "2" };
    const replica = scopeReplica(served(s, citing, undefined, { refuse: () => archived }).handle, { observe: new Feed().observe });
    await replica.read();
    expect(replica.view.state).toEqual({ is: "stopped", cause: { by: "archived" } });
  });

  test("fold: a second fold from the genesis entry fails, and the replica stops", async () => {
    const s = laneScope();
    const { replica, feed, serving } = await started(s);
    s.did(una, "remark", { on: 0, fields: { text: "next" } });
    const bad = { ...s.last, prev: s.entries[0]!.hash } as Entry;
    serving.replace.set(s.head.seq, bad);
    serving.refuse = (from) => { if (from === 0) serving.replace.set(s.head.seq, bad); return null; };
    const seen = views(replica);
    feed.current(s);
    await replica.read();
    expect(seen.map((view) => view.state)).toEqual([{ is: "behind" }, { is: "folding" }, { is: "stopped", cause: { by: "fold" } }]);
    expect(feed.cancelled).toBe(1);
  });
});

describe("close()", () => {
  test("no timer and no observation remain: a real observation that waits in its first read ends", async () => {
    vi.useFakeTimers();
    const s = laneScope();
    const states: string[] = [];
    let observation!: ReturnType<typeof observeScope>;
    const replica = scopeReplica(served(s, citing).handle, {
      observe: (emit) => (observation = observeScope({
        context: { origin: "https://scope.invalid", scope: s.at, definition: s.definition.digest, membership: s.at, member: "@rita" as MemberRef["member"], key: rita.key, deployment: "TEST" },
        current: () => true, authenticate: () => new Promise(() => {}), snapshot: () => new Promise(() => {}), open: () => new Promise(() => {}),
        emit: (state) => { states.push(state.status); emit(state); },
      })),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    replica.close();
    await observation.done;
    expect(vi.getTimerCount()).toBe(0);
    expect(states).toEqual(["connecting", "cancelled"]);
    // A read after close reads nothing, and a late page changes nothing.
    await replica.read();
    expect(replica.view.state).toEqual({ is: "stopped", cause: { by: "close" } });
  });

  test("a page that arrives after close is not folded", async () => {
    const s = laneScope();
    const { handle, serving } = served(s, citing);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    serving.refuse = () => null;
    const log = handle.scope.log.bind(handle.scope);
    handle.scope.log = async (...args) => { await gate; return log(...args); };
    const replica = scopeReplica(handle, { observe: new Feed().observe });
    const reading = replica.read();
    replica.close();
    release();
    await reading;
    expect([replica.view.head, seamOf(replica).held.size]).toEqual([null, 0]);
  });
});

describe("typed rows", () => {
  test("rows(type) and row({ item }) read the index of the view, and a view does not change after a later fold", async () => {
    const s = laneScope();
    const { replica, feed } = await started(s);
    const first = replica.view;
    expect(first.rows("intent").map((row) => [row.id, row.state, row.values["title"]])).toEqual([[0, "open", null]]);
    expect(first.rows("commitment").map((row) => row.id)).toEqual([2]);
    expect(first.row({ item: 2 })).toEqual(s.item(2));
    expect(first.row({ item: 3 })).toBeNull();
    s.did(rita, "offer", { fields: { intent: 0 }, expected: { intent: s.item(0).revision } });
    feed.current(s);
    await replica.read();
    expect(replica.view.rows("commitment").map((row) => row.id)).toEqual([2, s.head.seq]);
    expect(first.rows("commitment").map((row) => row.id)).toEqual([2]);
  });
});

describe("the entry of one signer", () => {
  test("gives the key, the intent digest, the meaning and the item that the entry opened", async () => {
    const s = laneScope();
    const { replica } = await started(s);
    const offer = s.entries[2]!.entry;
    if (offer.input.type !== "act") throw new Error("not an act");
    const intent = offer.input.signed.intent;
    const expected = { fact: s.fact(2), actor: rita.key, key: intent.idempotencyKey, intent: intentDigest(intent), meaning: intentMeaning(intent), opened: 2 };
    expect(replica.signed(2)).toEqual(expected);
    expect(replica.accepted(rita.key, intent.idempotencyKey)).toEqual(expected);
    expect(replica.signed(3)?.opened).toBeNull();
    expect([replica.signed(0), replica.signed(99), replica.accepted(una.key, "none")]).toEqual([null, null, null]);
    // The meaning excludes `expected` and `notAfter`.
    expect(intentMeaning({ ...intent, kind: intent.kind })).toBe(intentMeaning({ kind: intent.kind, on: intent.on, fields: intent.fields }));
  });
});

describe("Judged", () => {
  test("write, recorded, refused here with its class, and never", async () => {
    const s = laneScope();
    const { replica } = await started(s);
    const judging = { actor: actor(una), reading: s.now };
    const remark = s.intent(una, "remark", { on: 0, fields: { text: "a remark" } });
    const writes = judged(replica, remark, judging);
    expect(writes).toEqual({ is: "write", effects: (s.judge(remark) as { draft: { effects: unknown } }).draft.effects });
    s.submit(remark);
    await replica.read();
    expect(judged(replica, remark, judging)).toEqual({ is: "recorded", fact: s.fact(s.head.seq) });
    const stale = s.intent(rita, "offer", { fields: { intent: 0 }, expected: { intent: 99 } });
    expect(judged(replica, stale, { actor: actor(rita), reading: s.now })).toEqual({ is: "refused-here", reason: "revision-moved", class: "head" });
    const elsewhere = s.intent(una, "remark", { on: 0, fields: { text: "x" }, to: directory });
    expect(judged(replica, elsewhere, judging)).toMatchObject({ is: "refused-here", class: "protocol" });
  });

  test("a throw of the judge with an empty record goes to the caller, and one with a record is not-judged", async () => {
    const s = laneScope();
    const { replica } = await started(s);
    const { held, state } = seamOf(replica);
    const remark = s.intent(una, "remark", { on: 0, fields: { text: "x" } });
    // A state that fails under the judge: the judge's own failure, with no UnheldEntry in the record.
    const failing = new Proxy(state(), { get: (target, name) => name === "item" ? () => { throw new Error("TEST state fault"); } : bound(target, name) });
    const judging = { actor: actor(una), reading: s.now };
    expect(() => judgedOn({ state: failing, definition: s.definition, held }, remark, judging)).toThrow("TEST state fault");
    // The same failure after a read of a lacking entry: the record decides.
    const recorded = new Proxy(state(), { get: (target, name) => name === "item" ? () => { held.own(1); throw new Error("TEST state fault"); } : bound(target, name) });
    held.lack(1);
    expect(judgedOn({ state: recorded, definition: s.definition, held }, remark, judging)).toEqual({ is: "not-judged" });
    // The replica and its feed go on.
    expect(replica.view.state).toEqual({ is: "current" });
  });

  test("a stopped replica judges nothing", async () => {
    const { replica } = await started(laneScope());
    replica.close();
    expect(judged(replica, laneScope().intent(una, "remark", { on: 0, fields: { text: "x" } }), { actor: actor(una), reading: laneScope().now })).toEqual({ is: "not-judged" });
  });
});

describe("the catch sites of Own: a replica that lacks a held entry reads not-judged, and a fold stops (dd21b684, item 6)", () => {
  /** The scope's entries in a store that lacks one position. */
  const heldOf = (s: Scope, lacking: number) => {
    const held = new HeldEntries(PROPOSED_BOUNDS.entryBytes);
    for (const { entry: e, hash } of s.entries) held.put({ entry: e, hash }, canonicalize(e));
    held.lack(lacking);
    return held;
  };

  test("run and unjudged: a guard that reads the lacking entry makes the judge answer unavailable, and the prediction is not-judged", () => {
    const s = new Scope(gateWith());
    for (const secret of ["one", "two"]) s.did(rita, "issue", { fields: { hash: textDigest(secret) } });
    const reads: PlatformRules = gateRules({ fresh: { place: "guard", refusals: [], run: (given: RuleGiven) => { given.own?.(1); return { holds: true }; } } });
    const signed = s.intent(una, "enter", { on: 0, expected: { on: 1 }, fields: { secret: "one" } });
    const held = heldOf(s, 1);
    expect(s.judge(signed, { platform: reads, grants: null, own: held.own }).result).toBe("unavailable");
    expect(held.take()).toHaveLength(1);
    expect(judgedOn({ state: s.state, definition: s.definition, held }, signed, { actor: actor(una), reading: s.now }, reads)).toEqual({ is: "not-judged" });
    // The same act on a store that holds every entry writes.
    expect(judgedOn({ state: s.state, definition: s.definition, held: heldOf(s, 99) }, signed, { actor: actor(una), reading: s.now }, reads).is).toBe("write");
  });

  test("a platform catch: a guard that catches the throw and holds makes the judge write, and the prediction is not-judged", () => {
    const s = new Scope(gateWith());
    s.did(rita, "issue", { fields: { hash: textDigest("one") } });
    const catches = gateRules({ fresh: { place: "guard", refusals: [], run: (given: RuleGiven) => { try { given.own?.(1); } catch { return { holds: true }; } return { holds: true }; } } });
    const signed = s.intent(una, "enter", { on: 0, expected: { on: 1 }, fields: { secret: "one" } });
    const held = heldOf(s, 1);
    expect(s.judge(signed, { platform: catches, grants: null, own: held.own }).result).toBe("write");
    held.take();
    expect(judgedOn({ state: s.state, definition: s.definition, held }, signed, { actor: actor(una), reading: s.now }, catches)).toEqual({ is: "not-judged" });
  });

  test("a direct throw: an act whose local fact field names the lacking entry makes the judge throw UnheldEntry, and the prediction is not-judged", async () => {
    const s = laneScope();
    const { replica } = await started(s);
    const cite = s.intent(una, "cite", { on: 0, expected: { on: s.item(0).revision }, fields: { cause: s.fact(3) } });
    expect(judged(replica, cite, { actor: actor(una), reading: s.now }).is).toBe("write");
    seamOf(replica).held.lack(3);
    expect(() => s.judge(cite, { own: seamOf(replica).held.own })).toThrow(UnheldEntry);
    seamOf(replica).held.take();
    expect(judged(replica, cite, { actor: actor(una), reading: s.now })).toEqual({ is: "not-judged" });
    expect(replica.view.state).toEqual({ is: "current" });
  });

  test("the fold: applyEntry reads the lacking entry, the fold from the genesis entry fails again, and the replica stops", async () => {
    // The settlement of `mark-target` reads the act's fields again in the fold, with `Own`, under the whole-scope capacity.
    const data = changedDraft(marks, (d: { acts: Record<string, { fields: Record<string, unknown> }> }) => {
      settlesChanges.alias(d);
      d.acts["mark-target"]!.fields["cause"] = { type: "fact", kind: ["start"], under: "marks", required: true };
    });
    const definition = valid(validateDefinition(data, PROPOSED_BOUNDS));
    const s = new Scope(definition);
    const start = () => s.did(una, "start", { fields: { desk: directory } }).seq;
    const primary = start(), oldTarget = start(), newTarget = start();
    s.did(una, "point", { on: primary, expected: { on: s.item(primary).revision }, fields: { target: oldTarget } });
    const { replica, feed } = await started(s, data);
    expect(replica.view.state).toEqual({ is: "current" });
    seamOf(replica).held.lack(oldTarget);
    s.did(una, "mark-target", { on: primary, expected: { on: s.item(primary).revision, target: s.item(oldTarget).revision }, fields: { next: newTarget, cause: s.fact(oldTarget) } });
    const seen = views(replica);
    feed.current(s);
    await replica.read();
    expect(seen.map((view) => view.state)).toEqual([{ is: "behind" }, { is: "folding" }, { is: "stopped", cause: { by: "fold" } }]);
  });
});

test("the package entry exports no test seam", () => {
  expect(Object.keys(entry).sort()).toEqual(["Replica", "UnheldEntry", "intentMeaning", "judged", "scopeReplica"]);
});
