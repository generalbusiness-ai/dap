/** Pure policy/counting fixtures. The journal metadata below is made up;
 * this is not evidence of native storage, archive authority or floor writing. */
import { expect, test } from "vitest";
import type { Entry, JournalFloor, ScopeRef } from "@generalbusiness/dap-contract";
import { chooseFloor, countedEntries, MemoryState } from "../src/index.ts";
import { d, directory, t } from "./fixtures.ts";

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
