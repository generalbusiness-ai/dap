import { floorProofActs, floorPricedKeys } from "../../derive/test/definition-corpus/replay-mutations-data.ts";
/** Real in-memory judges, fold and verifier over a made-up definition.
 * Fixture grants and clone commit metadata are explicit stand-ins; no host,
 * native SQLite, archive writer or membership scope runs here. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type Entry, type FloorInput, type JournalFloor } from "@generalbusiness/dap-contract";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { checkpointOf, countedEntries, judgeAct, judgeCheckpoint, judgeFloor, MemoryState, type Own, type StateSnapshot } from "@generalbusiness/dap-derive";
import { created, keys, notesDefinition, t, variant } from "@generalbusiness/dap-derive/testing";
import { MemorySource, verify, type HistorySource } from "../src/index.ts";
import { floorOwn } from "../src/floor.ts";
import { View } from "../src/view.ts";
import { histories, rewrite, served } from "./world.ts";

function fixture() {
  const definition = variant(notesDefinition.declared, floorProofActs);
  const history = created(definition, {}, "floor-replay");
  for (let n = 0; n < 150; n++) history.did(keys.rita, "pulse", { on: 0, expected: { on: history.item(0).revision } });
  history.now = t(1200);
  const input: FloorInput = { type: "floor", floor: 50, receipt: { commit: "a".repeat(40), through: { ...history.head } }, keep: [] };
  const before = structuredClone(history.state.all());
  const floor = judgeFloor(history.state, definition, input, { ...history.context(), own: floorOwn(history.state, history.entries) });
  if (floor.result !== "write") throw new Error(JSON.stringify(floor));
  const floorEntry = history.seal(floor.draft);
  const after = structuredClone(history.state.all());
  const proof = history.intent(keys.rita, "prove", { on: 0, expected: { on: history.item(0).revision }, fields: { proof: history.fact(1) } });
  const refused = judgeAct(history.state, definition, proof, { ...history.context(), own: floorOwn(history.state, history.entries) });
  const afterRefusalHead = { ...history.head };
  for (let n = 0; n < 20; n++) history.did(keys.rita, "pulse", { on: 0, expected: { on: history.item(0).revision } });
  const checkpoint = judgeCheckpoint(history.state, definition, checkpointOf(history.state), history.context());
  if (checkpoint.result !== "write") throw new Error(JSON.stringify(checkpoint));
  history.seal(checkpoint.draft);
  const source: HistorySource = Object.assign(new MemorySource([served(history, [history])]), {
    floorReceipt: async () => ({ ok: true as const, scope: history.at, through: input.receipt.through, bytes: 128 }),
  });
  return { history, definition, input, before, after, floorEntry, source, refused, proof, afterRefusalHead };
}

test("replay hides archived facts while preserving accepted keys, reclaimed capacity and checkpoint state", async () => {
  const f = fixture();
  expect(f.refused).toMatchObject({ result: "refused", reason: "archived" });
  expect(f.afterRefusalHead.seq).toBe(f.floorEntry.seq);
  const result = await verify(f.source, { mode: "replay", scope: f.history.at.scope, grants: "as-recorded", bounds: { ...PROPOSED_BOUNDS, scopeEntries: 155 } });
  expect([result.report.result, result.why]).toEqual(["consistent", null]);
  expect(countedEntries(f.history.state)).toBe(f.history.head.seq + 1 - 50 + 1);
  expect(f.after.accepted).toEqual(f.before.accepted);
  const withoutFloor = structuredClone(served(f.history, [f.history]));
  // Control: a forged sealed act cannot be admitted merely because the
  // complete clone still holds the fact that this floor archived.
  rewrite(withoutFloor, f.floorEntry.seq + 1, entry => {
    entry.input.signed = f.proof;
    entry.input.decision = "refused";
    entry.input.reason = { code: "archived" };
  });
  const bad = await verify(Object.assign(new MemorySource([withoutFloor]), { floorReceipt: f.source.floorReceipt! }), { mode: "replay", scope: f.history.at.scope, grants: "as-recorded" });
  expect([bad.report.result, bad.report.at?.seq]).toEqual(["mismatch", f.floorEntry.seq + 1]);
});

test("floor commit absence and a different archive head stop at the floor entry", async () => {
  const f = fixture(), plain = new MemorySource([served(f.history, [f.history])]);
  const absent = await verify(plain, { mode: "replay", scope: f.history.at.scope, grants: "as-recorded" });
  expect([absent.report.result, absent.report.at?.seq, absent.why]).toEqual(["incomplete", f.floorEntry.seq, expect.stringContaining("floor-commit-missing")]);
  const mismatch = await verify(Object.assign(plain, { floorReceipt: async () => ({ ok: true as const, scope: f.history.at, through: { ...f.input.receipt.through, seq: 1 }, bytes: 128 }) }), { mode: "integrity", scope: f.history.at.scope });
  expect([mismatch.report.result, mismatch.report.at?.seq, mismatch.why]).toEqual(["mismatch", f.floorEntry.seq, expect.stringContaining("floor-commit-mismatch")]);
});

test("observation views and captured own readers retain their historical floor and sparse proof visibility", () => {
  const f = fixture(), view = new View();
  let captured: ReturnType<typeof floorOwn> | null = null;
  const snapshots = new Map<number, StateSnapshot>();
  for (const sealed of f.history.entries) {
    const own = floorOwn(view, f.history.entries);
    view.fold(f.definition, sealed.entry, sealed.hash, { own, bounds: PROPOSED_BOUNDS });
    if (sealed.entry.seq === f.floorEntry.seq) captured = floorOwn(view, f.history.entries);
    if ([f.floorEntry.seq - 1, f.floorEntry.seq, f.history.head.seq].includes(sealed.entry.seq)) snapshots.set(sealed.entry.seq, structuredClone(view.all()));
  }
  for (const seq of [f.floorEntry.seq, f.history.head.seq, f.floorEntry.seq - 1, f.floorEntry.seq]) expect(view.at(seq).state.all()).toEqual(snapshots.get(seq));
  const state = new MemoryState(); state.setScope(f.history.state.scope()!);
  const first: JournalFloor = { floor: 50, receipt: f.input.receipt, kept: [0, 7], sizeProofs: [{ digest: f.history.entries[0]!.hash, seq: 3, bound: 40 }] };
  state.putFloor(first);
  const own = floorOwn(state, f.history.entries);
  state.putFloor({ ...first, floor: 100, kept: [0] });
  expect(own(7)).toEqual(f.history.entries[7]);
  expect(own(8)).toBeNull();
  expect([...own.positions!(53)]).toEqual([0, 7, 50, 51, 52]);
  expect(own.sizeProofs!()).toEqual(first.sizeProofs);
  expect(captured!(1)).toBeNull();
  expect(captured!(0)).toEqual(f.history.entries[0]);
});

// The exact ceiling is an independent storage account: the held journal,
// one declaration, 99 migrated rows, and one reserved closing checkpoint.
// The literal migrated-row total distinguishes UTF-8 pricing and a repeated
// charge at the second floor. No SQLite or production authority is claimed.
test("two floors charge migrated Unicode accepted keys once and preserve complete post-floor checkpoints", async () => {
  const definition = variant(notesDefinition.declared, floorPricedKeys);
  const history = created(definition, {}, "floor-priced-accepted-keys");
  const pulse = () => {
    const seq = history.head.seq + 1;
    history.did(keys.rita, "pulse", { on: 0, expected: { on: history.item(0).revision }, idempotencyKey: seq === 1 ? "é😀" : `k${String(seq).padStart(4, "0")}` });
  };
  const receipts = new Map<string, FloorInput["receipt"]["through"]>();
  const floorAt = (floor: number, commit: string) => {
    const before = history.state.all();
    const input: FloorInput = { type: "floor", floor, receipt: { commit, through: { ...history.head } }, keep: [] };
    receipts.set(commit, input.receipt.through);
    const judged = judgeFloor(history.state, definition, input, { ...history.context(), own: floorOwn(history.state, history.entries) });
    if (judged.result !== "write") throw new Error(JSON.stringify(judged));
    history.seal(judged.draft);
    const after = history.state.all();
    expect(after.accepted).toEqual(before.accepted);
    expect(after.requests).toEqual(before.requests);
    expect(history.state.floor()!.kept).toEqual([0]);
    // Replay must derive this complete logical-state digest, including the
    // accepted set, at the position immediately after each floor.
    const checkpoint = judgeCheckpoint(history.state, definition, checkpointOf(history.state), history.context());
    if (checkpoint.result !== "write") throw new Error(JSON.stringify(checkpoint));
    history.seal(checkpoint.draft);
  };
  while (history.head.seq < 150) pulse();
  history.now = t(1200); floorAt(50, "b".repeat(40));
  while (history.head.seq < 200) pulse();
  history.now = t(2400); floorAt(100, "c".repeat(40));
  while (history.head.seq < 352) pulse();
  expect(history.state.all().accepted.filter(([, , accepted]) => accepted.seq < 100)).toHaveLength(99);
  const heldPayload = history.entries.filter(({ entry }) => entry.seq === 0 || entry.seq >= 100)
    .reduce((bytes, { entry }) => bytes + utf8(canonicalize(entry)).length, 0);
  // Entry 1 has a six-byte key (262 bytes); the other 98 have five-byte
  // keys (261 each): 262 + 25,578 = 25,840 bytes, never charged twice.
  const ceiling = heldPayload + utf8(canonicalize(definition.declared)).length + 25840 + PROPOSED_BOUNDS.entryBytes;
  const last = history.head.seq;
  const source: HistorySource = Object.assign(new MemorySource([served(history, [history])]), {
    floorReceipt: async (_scope: unknown, commit: string) => ({ ok: true as const, scope: history.at, through: receipts.get(commit)!, bytes: 128 }),
  });
  const options = { mode: "replay" as const, scope: history.at.scope, grants: "as-recorded" as const, bounds: { ...PROPOSED_BOUNDS, scopeBytes: ceiling } };
  const exact = await verify(source, options);
  expect([exact.report.result, exact.why]).toEqual(["consistent", null]);
  const oneByteShort = await verify(source, { ...options, bounds: { ...options.bounds, scopeBytes: ceiling - 1 } });
  expect([oneByteShort.report.result, oneByteShort.report.at?.seq, oneByteShort.why]).toEqual(["mismatch", last, "the entry exceeds scopeBytes: Used plus Reserved is over its ceiling"]);
});

// These three fixture scopes judge and fold in memory. P's completed
// relation request2 is followed through I's retained deciding entry by P's
// kept result3; no native storage or provider is involved.
test("replay follows a kept result's retained foreign decision back to its own completed request", async () => {
  const world = histories(), history = world.P, all = Object.values(world);
  const original = served(history, all);
  const retained = new Map(original.retained.filter(row => row.kind === "entry").map(row => [row.digest, JSON.parse(row.bytes) as Entry]));
  const own: Own = history.own;
  own.retained = use => retained.get(use.content) ?? null;
  expect(history.state.request(2, 0)?.result).toMatchObject({ seq: 3, clause: "applied" });
  while (history.head.seq < 150) {
    const checkpoint = judgeCheckpoint(history.state, history.definition, checkpointOf(history.state), history.context());
    if (checkpoint.result !== "write") throw new Error(JSON.stringify(checkpoint));
    history.seal(checkpoint.draft);
  }
  history.now = t(1200);
  const input: FloorInput = { type: "floor", floor: 50, receipt: { commit: "d".repeat(40), through: { ...history.head } }, keep: [3] };
  const floor = judgeFloor(history.state, history.definition, input, { ...history.context(), own });
  if (floor.result !== "write") throw new Error(JSON.stringify(floor));
  history.seal(floor.draft);
  expect(history.state.floor()!.kept).toEqual([0, 2, 3]);
  const checkpoint = judgeCheckpoint(history.state, history.definition, checkpointOf(history.state), history.context());
  if (checkpoint.result !== "write") throw new Error(JSON.stringify(checkpoint));
  history.seal(checkpoint.draft);
  const source: HistorySource = Object.assign(new MemorySource(all.map(scope => served(scope, all))), {
    floorReceipt: async () => ({ ok: true as const, scope: history.at, through: input.receipt.through, bytes: 128 }),
  });
  const replay = await verify(source, { mode: "replay", scope: history.at.scope, grants: "as-recorded" });
  expect([replay.report.result, replay.why]).toEqual(["consistent", null]);
});
