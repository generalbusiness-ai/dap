import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type PlatformData } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/artroom-bytes";
import { checkpointOf, judgeCheckpoint, judgeDiagnosis, validateDefinition, type StateView } from "@generalbusiness/dap-derive";
import { d, created, keys, on, otherLane, valid } from "@generalbusiness/dap-derive/testing";
import { View } from "../src/view.ts";
import { MemorySource, verify } from "../src/index.ts";

// Made-up platform data, with no marked rules. The fixture's test authority
// stands in for membership. Its genesis and acts are judged in memory;
// this witnesses historical StateView lookups, not a runtime observation.
const form = { also: {}, fields: {}, guards: [], effects: [], sends: [], attention: [] };
const digest = { type: "digest" } as const;
const data: PlatformData = {
  format: "artroom-definition-1", name: "platform:view-index", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
  items: {
    board: { many: false, max: 1, initial: "open", states: { open: { final: false } }, parties: {}, refs: {}, values: {} },
    row: {
      many: true, max: 8, initial: "live", states: { live: { final: false }, done: { final: true } }, parties: {},
      refs: { key: { fixed: true, required: true, to: digest } },
      values: { category: { fixed: true, required: true, of: digest }, other: { fixed: true, required: true, of: digest } },
      indexes: ["key", "category"],
    },
  },
  acts: {
    "found": { ...form, step: "open", on: "board", grant: "found" },
    add: {
      ...form, step: "open", on: "row", grant: "add", fields: { key: { ...digest, required: true }, category: { ...digest, required: true } },
      effects: [{ ref: { slot: "key", from: { field: "key" } } }, { value: { slot: "category", from: { field: "category" } } }, { value: { slot: "other", from: { field: "key" } } }],
    },
    finish: { ...form, step: "transition", on: "row", grant: "finish", guards: [{ state: ["live"] }], effects: [{ state: "done" }] },
  },
  receives: {}, timed: {}, rules: {}, outcomes: {},
};

test("replay derives opt-in item and originating-request duties through a diagnosis and accepts their covering checkpoint", async () => {
  // A declared made-up scope with real in-memory judgments/fold/verifier.
  // Fixture grants are explicitly trusted as recorded, not native authority.
  const declared = structuredClone(data);
  declared.name = "duty-replay-fixture";
  delete (declared as Partial<PlatformData>).outcomes;
  delete declared.items["row"]!.indexes;
  declared.capacity = { name: "whole-scope", version: 1 };
  declared.items["row"]!.refs["peer"] = { fixed: true, required: true, to: { type: "scope", kind: "lane" } };
  declared.acts["add"]!.fields["peer"] = { type: "scope", kind: "lane", required: true };
  declared.acts["add"]!.effects = [...declared.acts["add"]!.effects, { ref: { slot: "peer", from: { field: "peer" } } }];
  declared.acts["add"]!.sends = [{ tell: { to: { slot: "peer" }, message: "note", fields: {}, result: {} } }];
  declared.acts["finish"]!.settles = { of: "on", in: ["live"] };
  const other = structuredClone(declared.acts["finish"]!);
  other.fields = { target: { type: "item", of: "row", required: true } };
  other.also = { other: { item: "row", by: "target" } };
  other.settles = { of: "also.other", in: ["live"] };
  other.guards = [{ state: ["live"] }, { of: "also.other", state: ["live"] }];
  other.effects = [{ state: "done" }, { of: "also.other", state: "done" }];
  declared.acts["finish-other"] = other;
  const definition = valid(validateDefinition(declared, PROPOSED_BOUNDS));
  const history = created(definition, {});
  const add = (key: string) => history.did(keys.rita, "add", { fields: { key, category: d("3"), peer: otherLane } }).seq;
  const first = add(d("1")), second = add(d("2"));
  history.did(keys.rita, "finish-other", { ...on(history, first, { other: second }), fields: { target: second } });
  expect(history.state.itemDuties().map(duty => duty.item)).toEqual([first]);
  expect(history.state.pendingRequests().map(request => request.reservation)).toEqual(Array(2).fill({ entries: 2, items: 0, records: 0, bytes: 3 * PROPOSED_BOUNDS.entryBytes, requests: 0 }));
  const diagnosed = judgeDiagnosis(history.state, definition, { of: { seq: first, n: 0 }, attempts: [{ at: history.now, answer: "retry" }] }, { ...history.context(), origin: history.entries[first]!.entry });
  if (diagnosed.result !== "write") throw new Error("the fixture diagnosis must be written");
  history.seal(diagnosed.draft);
  const checkpoint = judgeCheckpoint(history.state, definition, checkpointOf(history.state), history.context());
  if (checkpoint.result !== "write") throw new Error("the fixture checkpoint must be written");
  history.seal(checkpoint.draft);
  const view = new View();
  for (const { entry, hash } of history.entries) view.fold(definition, entry, hash, history.foldOptions);
  for (const seq of [4, 1, 5, 2, 0, 3]) expect(view.at(seq).state.all()).toEqual(history.replay(seq + 1).all());
  const source = new MemorySource([{ scope: history.at, entries: history.entries.map(({ entry, hash }) => ({ seq: entry.seq, hash, bytes: canonicalize(entry) })), retained: [{ kind: "definition", digest: definition.digest, bytes: canonicalize(definition.declared) }] }]);
  const replayed = await verify(source, { mode: "replay", scope: history.at.scope, grants: "as-recorded" });
  expect([replayed.report.result, replayed.why]).toEqual(["consistent", null]);
});

test("historical item duties contain only their head's admitted tasks, preserve an ordinary final transition and remove a genuine settlement", () => {
  // Real in-memory judges/fold and historical View, with this file's
  // made-up platform data and test authority. No native scope or host.
  const declared = structuredClone(data);
  declared.capacity = { name: "whole-scope", version: 1 };
  declared.items["row"]!.holds = { requests: 1 };
  declared.acts["finish"]!.settles = { of: "on", in: ["live"] };
  declared.acts["discard"] = structuredClone(data.acts["finish"]!);
  const definition = valid(validateDefinition(declared, PROPOSED_BOUNDS, undefined, { platform: true }));
  const history = created(definition, {});
  const add = (key: string) => history.did(keys.rita, "add", { fields: { key, category: d("3") } }).seq;
  const first = add(d("1")), second = add(d("2"));
  history.did(keys.rita, "finish", on(history, first));
  history.did(keys.rita, "discard", on(history, second));
  const view = new View();
  for (const { entry, hash } of history.entries) view.fold(definition, entry, hash, history.foldOptions);
  expect(view.itemDuties().map(duty => duty.item)).toEqual([second]);
  expect([view.holderSettled(first), view.holder(first), view.holderSettled(second), view.holder(second)]).toEqual([true, null, false, { requests: 1 }]);
  for (const seq of [1, 3, 2, 4, 0, 1]) expect(view.at(seq).state.all()).toEqual(history.replay(seq + 1).all());
});

test("historical declared indexes return exactly the live and final items of their head, in any order, and incomplete indexes answer no lookup", () => {
  // Invariant: the historical StateView has the same complete declared
  // indexes as the fold at that head, including final items and no future rows.
  const definition = valid(validateDefinition(data, PROPOSED_BOUNDS, undefined, { platform: true }));
  const history = created(definition, {});
  const [x, y, category] = [d("1"), d("2"), d("3")];
  const add = (key: string) => history.did(keys.rita, "add", { fields: { key, category } }).seq;
  const first = add(x);
  const second = add(x);
  history.did(keys.rita, "finish", on(history, first));
  const third = add(y);
  history.did(keys.rita, "finish", on(history, second));
  const view = new View();
  const incomplete = new View();
  const absent = new View();
  expect([view.at(-1).state.scope(), view.at(-1).built]).toEqual([null, false]);
  for (const { entry, hash } of history.entries) {
    view.fold(definition, entry, hash);
    // Lose one opening's rows: the type still has two declared indexes,
    // but neither may answer even for the key of a row that is present.
    incomplete.fold(entry.seq === second ? { ...definition, keyed: {} } : definition, entry, hash);
    absent.fold({ ...definition, keyed: {} }, entry, hash);
    if (entry.seq === second) expect(view.at(first).state.lookup("row", "key", canonicalize(x), 9)).toEqual([first]);
  }
  const contents = (state: StateView) => [
    state.lookup("row", "key", canonicalize(x), 9),
    state.lookup("row", "key", canonicalize(y), 9),
    state.lookup("row", "category", canonicalize(category), 9),
    state.lookup("row", "key", canonicalize(x), 1),
    state.lookup("row", "key", canonicalize(d("4")), 9),
    state.lookup("row", "other", canonicalize(x), 9),
    state.all().items.filter((item) => item.type === "row").map((item) => [item.id, item.state]),
  ];
  const expected = new Map([
    [-1, [[], [], [], [], [], [], []]],
    [0, [[], [], [], [], [], [], []]],
    [1, [[first], [], [first], [first], [], null, [[first, "live"]]]],
    [2, [[first, second], [], [first, second], [first], [], null, [[first, "live"], [second, "live"]]]],
    [3, [[first, second], [], [first, second], [first], [], null, [[first, "done"], [second, "live"]]]],
    [4, [[first, second], [third], [first, second, third], [first], [], null, [[first, "done"], [second, "live"], [third, "live"]]]],
    [5, [[first, second], [third], [first, second, third], [first], [], null, [[first, "done"], [second, "done"], [third, "live"]]]],
  ]);
  for (const seq of [5, 2, 2, 4, 0, -1, 1, 1, 3, 5]) {
    const got = view.at(seq);
    expect(contents(got.state), `head ${seq}`).toEqual(expected.get(seq));
    expect(contents(got.state), `fold through head ${seq}`).toEqual(contents(history.replay(seq + 1)));
    expect(view.at(seq).built).toBe(false);
    expect(absent.at(seq).state.lookup("row", "key", canonicalize(x), 9)).toEqual(seq < 1 ? [] : null);
    const missing = incomplete.at(seq).state;
    expect([missing.lookup("row", "key", canonicalize(x), 9), missing.lookup("row", "category", canonicalize(category), 9)]).toEqual(seq < 1 ? [[], []] : seq === 1 ? [[first], [first]] : [null, null]);
  }
  expect([view.through, view.at(5).state === view, view.at(5).built]).toEqual([5, true, false]);
});
