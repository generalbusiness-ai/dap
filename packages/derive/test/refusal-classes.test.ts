/** RC-1: each refusal reason of class `never` holds at a later head for the same signed bytes.
 * The floor cases use made-up journal metadata in a MemoryState, as floor.test.ts does: a stand-in for held storage. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { Entry, FloorInput, ScopeRef } from "@generalbusiness/dap-contract";
import { REFUSAL_CLASSES } from "@generalbusiness/dap-bytes";
import { judgeFloor, MemoryState } from "../src/index.ts";
import { Scope, born, created, deliver, directory, d, fields, keys, lateFixture, notesDefinition, ownWith, t, ticketDefinition } from "./fixtures-entry.ts";

const { rita } = keys;

test("the table classes 6 reasons never, 5 protocol and 25 head", () => {
  const count = (name: string) => Object.values(REFUSAL_CLASSES).filter((c) => c === name).length;
  expect([count("never"), count("protocol"), count("head")]).toEqual([6, 5, 25]);
  expect(Object.keys(REFUSAL_CLASSES).filter((r) => REFUSAL_CLASSES[r as keyof typeof REFUSAL_CLASSES] === "never").sort())
    .toEqual(["archived", "floor-ahead", "floor-back", "floor-keep", "late", "scope-refused"]);
});

// ---------------------------------------------------------------- the floor judge

const hash = (seq: number) => `sha256:${seq.toString(16).padStart(64, "0")}` as const;
const at: ScopeRef = directory;
const metadata = (seq: number) => ({ at, kind: "directory" as const, creator: null, status: "active" as const, head: { seq, hash: hash(seq) }, time: t(0), genesis: { hash: hash(0), source: null, n: null }, held: [] });
const entry = (seq: number): Entry => ({ v: 1, genesis: at.genesis, seq, prev: seq === 0 ? null : hash(seq - 1), time: t(0), clamped: false, epoch: 0,
  input: { type: "checkpoint", through: seq - 1, state: d("f") }, uses: [], prepared: [], effects: [], sends: [] });

/** A journal at head `head` with floor `floor` (none at 0): a position below the floor and not kept is archived, so `own` holds no entry there. */
function journal(head: number, floor: number) {
  const state = new MemoryState(); state.setScope(metadata(head));
  if (floor > 0) state.putFloor({ floor, receipt: { commit: "a".repeat(40), through: { seq: floor - 1, hash: hash(floor - 1) } }, kept: [], sizeProofs: [] });
  const own = ownWith((seq: number) => seq < floor || seq > head ? null : { entry: entry(seq), hash: hash(seq) });
  return { state, own };
}
const floorInput = (floor: number, through: number, keep: number[] = []): FloorInput =>
  ({ type: "floor", floor, receipt: { commit: "e".repeat(40), through: { seq: through, hash: hash(through) } }, keep });
const judgedAt = (head: number, floor: number, input: FloorInput, seconds: number) => {
  const { state, own } = journal(head, floor);
  return judgeFloor(state, notesDefinition, input, { clock: { reading: t(seconds), asOf: t(seconds), behind: false }, bounds: PROPOSED_BOUNDS, own });
};

test.each([
  // floor-back: the input does not pass the current floor, and the floor only rises.
  ["floor-back", floorInput(50, 150), [150, 50], [300, 120]],
  // floor-ahead: two numbers inside the input disagree.
  ["floor-ahead", floorInput(100, 50), [150, 0], [300, 40]],
  // floor-keep by shape: a keep list that is not ascending.
  ["floor-keep", floorInput(50, 150, [10, 5]), [150, 0], [300, 20]],
  // floor-keep by position: a kept position that is already archived stays archived.
  ["floor-keep", floorInput(50, 150, [10]), [150, 20], [300, 30]],
] as const)("%s: the floor judge gives the same reason at a later head", (reason, input, [head, floor], [laterHead, laterFloor]) => {
  expect(judgedAt(head, floor, input, 1200)).toMatchObject({ result: "refused", reason });
  expect(judgedAt(laterHead, laterFloor, input, 2400)).toMatchObject({ result: "refused", reason });
});

test.each([
  ["floor-ahead", floorInput(100, 50), [150, 0], [300, 100]],
  ["floor-keep", floorInput(50, 150, [10, 5]), [150, 0], [300, 50]],
  ["floor-keep", floorInput(50, 150, [10]), [150, 20], [300, 60]],
] as const)("%s: once a later floor reaches the input floor, the floor judge answers floor-back", (reason, input, [head, floor], [laterHead, laterFloor]) => {
  expect(judgedAt(head, floor, input, 1200)).toMatchObject({ result: "refused", reason });
  expect(judgedAt(laterHead, laterFloor, input, 2400)).toMatchObject({ result: "refused", reason: "floor-back" });
});

// ---------------------------------------------------------------- the act judge and the delivery judge

test("archived: an act that names an archived own entry is refused archived at a later head", () => {
  const P = new Scope(ticketDefinition), target = new Scope(ticketDefinition, rita.member, true, 1);
  const floorAt = (seq: number) => P.state.putFloor({ floor: seq + 1, receipt: { commit: "a".repeat(40), through: { seq, hash: P.entries[seq]!.hash } }, kept: [], sizeProofs: [] });
  floorAt(1);
  const signed = P.intent(rita, "link", fields({ target: target.at, about: 0, because: P.fact(0) }));
  expect(P.judge(signed)).toMatchObject({ result: "refused", reason: "archived" });
  P.did(rita, "link", fields({ target: target.at, about: 1 }));
  floorAt(2);
  expect(P.head.seq).toBe(2);
  expect(P.judge(signed, { reading: t(30) })).toMatchObject({ result: "refused", reason: "archived" });
});

test("scope-refused: a refused scope refuses the same act at a later head; only a confirmation activates, and it needs a provisional scope", () => {
  const D = created();
  D.did(rita, "open-issue", fields({ title: "refuse" }));
  const { child: R } = born(D, 1);
  const signed = R.intent(rita, "ask", fields({ desk: D.at }));
  expect(R.judge(signed)).toMatchObject({ result: "refused", reason: "scope-refused" });
  // A later entry without `activate`, folded by hand: no judge of a refused scope writes one, and the status stays.
  R.fold({ v: 1, genesis: R.at.genesis, seq: 1, prev: R.head.hash, time: t(10), clamped: false, epoch: 0,
    input: { type: "delivery", from: { at: directory, seq: 18, hash: d("8") }, sourceKind: "directory", n: 0, message: { class: "control", type: "confirm", genesis: R.fact(0) } },
    uses: [], prepared: [], effects: [], sends: [] });
  expect([R.head.seq, R.state.scope()!.status]).toEqual([1, "refused"]);
  expect(R.judge(signed, { reading: t(30) })).toMatchObject({ result: "refused", reason: "scope-refused" });
});

test("late: a later copy of a delivery refused late answers repeat of the refused decision at a later head", () => {
  const { sender, receiver } = lateFixture(false);
  receiver.now = t(31);
  expect(deliver(receiver, sender, 1, 0)).toMatchObject({ result: "write", draft: { input: { decision: "refused", reason: { code: "late" } } } });
  const decision = receiver.head.seq;
  // A fresh send from the same source moves the receiver's head.
  sender.now = t(31);
  sender.did(rita, "emit", { on: 0, expected: { on: sender.item(0).revision }, fields: { to: receiver.at, first: 7, second: 8 } });
  expect(deliver(receiver, sender, sender.head.seq, 0)).toMatchObject({ result: "write", draft: { input: { decision: "applied" } } });
  expect(receiver.head.seq).toBeGreaterThan(decision);
  receiver.now = t(600);
  expect(deliver(receiver, sender, 1, 0)).toEqual({ result: "repeat", seq: decision });
});
