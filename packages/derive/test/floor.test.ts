/** Pure policy/counting fixtures. The journal metadata below is made up;
 * this is not evidence of native storage, archive authority or floor writing. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Entry, JournalFloor, ScopeRef } from "@generalbusiness/dap-contract";
import { chooseFloor, countedEntries, judgeFloor, MemoryState, stateKept, type Own, type PlatformRules } from "../src/index.ts";
import { d, directory, notesDefinition, t, variant } from "./fixtures.ts";
import { stagingData } from "./definition-corpus/staging-data.ts";

const hash = (seq: number) => `sha256:${seq.toString(16).padStart(64, "0")}` as const;
const at: ScopeRef = directory;
const metadata = (seq: number) => ({ at, creator: null, status: "active" as const, head: { seq, hash: hash(seq) }, time: t(0), genesis: { hash: hash(0), source: null, n: null }, held: [] });
const entry = (seq: number): Entry => ({ v: 1, at, seq, prev: seq === 0 ? null : hash(seq - 1), time: t(0), clamped: false, epoch: 0,
  input: { type: "checkpoint", through: seq - 1, state: d("f") }, uses: [], prepared: [], effects: [], sends: [] });
const own = (seq: number) => seq < 0 ? null : { entry: entry(seq), hash: hash(seq) };
const receipt = { commit: "a".repeat(40), through: { seq: 29000, hash: hash(29000) } };

test("floor policy advances in bounded steps and does not manufacture repeated one-entry floors", () => {
  const state = new MemoryState(); state.setScope(metadata(29999));
  const policy = { margin: 10000, minimum: 1000 }, moves: number[] = [];
  for (;;) {
    const next = chooseFloor(state, receipt, policy, t(1200), 900, own);
    if (next === null) break;
    moves.push(next);
    const floor: JournalFloor = { floor: next, receipt, kept: [0], sizeProofs: [] };
    state.putFloor(floor); state.setScope(metadata(state.scope()!.head.seq + 1));
    expect(moves.length).toBeLessThanOrEqual(5);
  }
  expect(moves).toEqual([4096, 8192, 12288, 16384, 20004]);
  state.setScope(metadata(31002));
  expect(chooseFloor(state, receipt, policy, t(1200), 900, own)).toBeNull();
  state.setScope(metadata(31003));
  expect(chooseFloor(state, receipt, policy, t(1200), 900, own)).toBe(21004);
});

test("counting charges the held tail and kept entries without renumbering the head", () => {
  const state = new MemoryState(); state.setScope(metadata(29999));
  expect(countedEntries(state)).toBe(30000);
  state.putFloor({ floor: 20000, receipt, kept: [0, 25, 101], sizeProofs: [] });
  expect(countedEntries(state)).toBe(10003);
  expect(state.scope()!.head.seq).toBe(29999);
});

// A missing held genesis is not an archived identity. A floor must not
// claim it kept just because its position is a derived obligation.
test("floor derivation fails closed when a currently held payload root is missing", () => {
  const state = new MemoryState(); state.setScope(metadata(150));
  const missing = (seq: number) => seq === 0 ? null : own(seq);
  const input = { type: "floor" as const, floor: 50, receipt: { commit: "e".repeat(40), through: { seq: 150, hash: hash(150) } }, keep: [] };
  expect(stateKept(state.all(), notesDefinition, 50, [], missing)).toBeNull();
  expect(judgeFloor(state, notesDefinition, input, { clock: { reading: t(1200), asOf: t(1200), behind: false }, bounds: PROPOSED_BOUNDS, own: missing })).toEqual({ result: "unavailable", reason: "unavailable" });
  expect(stateKept(state.all(), notesDefinition, 50, [])).toEqual([0]);
  state.putFloor({ floor: 50, receipt: input.receipt, kept: [0], sizeProofs: [] });
  const complete: Own = own;
  let masked = false;
  const platform: PlatformRules = { named: "platform:task@2", rules: {}, floorReferences: function* (_snapshot, _definition, history) {
    masked = history(1) === null && ![...history.positions!(51)].includes(1);
  } };
  expect(stateKept(state.all(), notesDefinition, 100, [], complete, platform)).toEqual([0]);
  expect(masked).toBe(true);
  // An explicit keep is a payload obligation, unlike an archived item ID.
  expect(stateKept(state.all(), notesDefinition, 100, [1], complete)).toBeNull();
});

test("a live workspace root keeps its payload under the exact pinned hold version until retired", () => {
  // Minimal folded metadata for the policy boundary; no archive writer or
  // provider runs. The real validator accepts each workspace declaration.
  for (const version of [1, 2] as const) {
    const definition = variant(stagingData(), draft => {
      draft.capabilities = draft.capabilities.map((capability: { name: string; version: number }) => capability.name === "hold" ? { ...capability, version } : capability);
    });
    const state = new MemoryState(); state.setScope(metadata(150));
    const root = { capability: `hold@${version}` as const, kind: "root", key: [1], state: "live", values: {}, seq: 12 };
    state.putRecord(root);
    expect(stateKept(state.all(), definition, 50, [], own)).toEqual([0, 12]);
    expect(stateKept(state.all(), definition, 50, [], seq => seq === 12 ? null : own(seq))).toBeNull();
    state.putRecord({ ...root, state: "retired" });
    expect(stateKept(state.all(), definition, 50, [], own)).toEqual([0]);
  }
});
