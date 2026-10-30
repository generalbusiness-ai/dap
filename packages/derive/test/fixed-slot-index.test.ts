/** Real validator, judges and fold in memory. Membership grants and the
 * fixture creator/archive receipt are stand-ins, not host evidence. */
import { expect, test, vi } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { applyEntry, judgeAct, MemoryState, validateDefinition } from "../src/index.ts";
import { on, keys, Scope, valid } from "./fixtures.ts";
import { fixedSlotData } from "./definition-corpus/fixed-slot-data.ts";
import { structuralFloorHistory } from "./fixed-slot-fixture.ts";

const stopped = { ...PROPOSED_BOUNDS, guardScan: 3, guardPage: 2 };
const { rita } = keys;

test("fixed field and constant equalities complete beyond guardScan while the paired mutable guard remains incomplete", () => {
  for (const fixed of [true, false]) {
    const definition = valid(validateDefinition(fixedSlotData(fixed), PROPOSED_BOUNDS)), scope = new Scope(definition);
    const ids = ["held", "x", "held", "y", "z", "last"].map(name => scope.did(rita, "request", { fields: { name } }).seq);
    scope.did(rita, "pass", on(scope, ids[0]!));
    const page = fixed ? vi.spyOn(scope.state, "page").mockImplementation(() => { throw Error("eligible fixed count scanned items"); }) : null;
    try {
      const probe = (kind: string, fields = {}) => scope.judge(scope.intent(rita, kind, { ...on(scope, 0), fields }), { bounds: stopped });
      if (fixed) {
        expect(probe("unique-constant").result).toBe("write");
        expect(probe("unique-field", { needle: "unused" }).result).toBe("write");
        expect(probe("unique-field", { needle: "last" })).toMatchObject({ result: "refused", reason: "guard-failed", name: "handle-in-use" });
        expect(probe("except-field", { needle: "held", job: ids[0]! }).result).toBe("write");
      } else {
        expect(probe("unique-constant")).toMatchObject({ result: "unavailable", reason: "guard-incomplete" });
        expect(probe("unique-field", { needle: "unused" })).toMatchObject({ result: "unavailable", reason: "guard-incomplete" });
      }
    } finally { page?.mockRestore(); }
  }
});

test("an act without Own keeps raw equality while full Own recognizes the same structural record", () => {
  const definition = valid(validateDefinition(fixedSlotData(), PROPOSED_BOUNDS)), scope = new Scope(definition);
  scope.did(rita, "request", { fields: { name: "record", stamp: scope.fact(1) } });
  const intent = scope.intent(rita, "stamp-unused", on(scope, 0));
  expect(scope.judge(intent)).toMatchObject({ result: "refused", name: "stamp-in-use" });
  expect(scope.judge(intent, { own: undefined }).result).toBe("write");
});

test("structural fixed records rekey at a valid floor and a default-options fold still supplies later full-Own counts", () => {
  const history = structuralFloorHistory(), { scope, definition } = history;
  const fresh = new MemoryState();
  for (const sealed of scope.entries.slice(0, history.before + 1)) applyEntry(fresh, definition, sealed.entry, sealed.hash);
  expect(fresh.fixedCount("job", "stamp", "1", ["requested"], "normalized")).toBe(1);
  expect(fresh.fixedCount("job", "stamp", canonicalize(history.reference), ["requested"], "raw")).toBe(1);
  const intent = scope.intent(rita, "stamp-unused", on(scope, 0));
  expect(judgeAct(fresh, definition, intent, scope.context())).toMatchObject({ result: "refused", name: "stamp-in-use" });
  const floor = scope.entries[history.floor]!;
  applyEntry(fresh, definition, floor.entry, floor.hash, { own: scope.own });
  expect(fresh.fixedHash(1)).toBeNull();
  expect(fresh.item(history.item)!.values["stamp"]).toEqual(history.reference);
  expect(fresh.fixedCount("job", "stamp", "1", ["requested"], "normalized")).toBe(0);
  expect(fresh.fixedCount("job", "stamp", canonicalize(history.reference), ["requested"], "normalized")).toBe(1);
  expect(judgeAct(fresh, definition, intent, scope.context({ own: history.heldOwn })).result).toBe("write");
  expect(fresh.all()).toEqual(scope.state.all());
});
