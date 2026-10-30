/** Actual in-memory judge/fold; fixture grants, creator and archive receipt
 * are stand-ins. No native archive or physical deletion claim follows. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { archivedPosition, clockOf, judgeFloor, validateDefinition, type Own } from "../src/index.ts";
import { fixedSlotData } from "./definition-corpus/fixed-slot-data.ts";
import { on, keys, Scope, t, valid } from "./fixtures.ts";

const { rita } = keys;

export function structuralFloorHistory(final = false) {
  const definition = valid(validateDefinition(fixedSlotData(), PROPOSED_BOUNDS));
  const scope = new Scope(definition);
  const reference = scope.fact(1);
  const item = scope.did(rita, "request", { fields: { name: "record", stamp: reference } }).seq;
  if (final) scope.did(rita, "pass", on(scope, item));
  while (scope.head.seq < 102) scope.did(rita, "tick", on(scope, 0));
  scope.now = t(1200);
  const before = scope.head.seq;
  const input = { type: "floor" as const, floor: 2, keep: [], receipt: { commit: "a".repeat(40), through: scope.head } };
  const judged = judgeFloor(scope.state, definition, input, { clock: clockOf(scope.state, scope.now), bounds: PROPOSED_BOUNDS, own: scope.own });
  if (judged.result !== "write") throw new Error(`structural fixed-slot floor was not written: ${judged.result}`);
  scope.seal(judged.draft);
  const heldOwn: Own = seq => archivedPosition(scope.state, seq) ? null : scope.own(seq);
  return { definition, scope, item, reference, before, floor: scope.head.seq, heldOwn };
}
