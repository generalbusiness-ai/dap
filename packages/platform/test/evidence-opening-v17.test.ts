import { expect, test } from "vitest";
import type { Entry } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import type { Operation, RuleEffect } from "@generalbusiness/dap-derive";
import { evidenceOperationOpeningV17 } from "../src/evidence-opening-v17.ts";
// The maintained reservation witness is not in dap-derive/testing's public
// exports. Reuse that narrow test fixture, without importing kernel internals.
import { OWNER, Works, opened, worksDefinition } from "../../derive/test/fixtures-holds.ts";

function selfOpening() {
  // SCRIPTED marked rule and incoming source; the maintained judge, seal
  // and fold do the transformation. This is not G17 Native authority.
  const scope = new Works(worksDefinition);
  let returned: readonly RuleEffect[] = [];
  scope.script.begin = ({ resolved }) => { returned = opened(0, "step", 1, resolved.self); return returned; };
  expect(scope.start()).toBe("written");
  const id = scope.opened()[0]!;
  const operation = scope.state.operation(id);
  if (!operation) throw Error("The maintained fold did not retain the operation");
  return { scope, returned, entry: scope.last, operation };
}

test("numeric self from the actual marked rule seals as self and folds back to the real holder position", () => {
  const { scope, returned, entry, operation } = selfOpening();
  expect(returned.find(effect => effect.effect === "operation")).toEqual({ effect: "operation", k: 0, owner: OWNER, kind: "step", attempts: 1, for: entry.seq });
  expect(entry.effects.find(effect => effect.effect === "operation")).toEqual({ effect: "operation", k: 0, owner: OWNER, kind: "step", attempts: 1, for: "self" });
  expect(operation.for).toBe(entry.seq);
  expect(evidenceOperationOpeningV17(entry, operation)).toBe(true);
  // The maintained replay fold retains the same numeric holder too.
  expect(scope.replay().operation(operation.id)?.for).toBe(entry.seq);
});

test("only the exact sequence, ordinal, owner, kind, attempt ceiling and holder match", () => {
  const { entry, operation } = selfOpening(), before = canonicalize({ entry, operation });
  const changed: Operation[] = [
    { ...operation, id: `${entry.seq + 1}:0` }, { ...operation, id: `${entry.seq}:1` },
    { ...operation, id: `${entry.seq}:00` }, { ...operation, owner: "platform:destination@17" },
    { ...operation, kind: "different" }, { ...operation, most: 2 }, { ...operation, most: 0 },
    { ...operation, for: entry.seq + 1 }, { ...operation, for: Number.NaN },
  ];
  const noHolder = { ...operation }; delete noHolder.for;
  changed.push(noHolder);
  for (const candidate of changed) expect(evidenceOperationOpeningV17(entry, candidate)).toBe(false);
  expect(canonicalize({ entry, operation })).toBe(before);
});

test("numeric and absent holders preserve their own meanings; duplicate or malformed opening rows refuse", () => {
  const { entry, operation } = selfOpening();
  const numeric: Entry = { ...entry, effects: entry.effects.map(effect => effect.effect === "operation" ? { ...effect, for: 0 } : effect) };
  expect(evidenceOperationOpeningV17(numeric, { ...operation, for: 0 })).toBe(true);
  expect(evidenceOperationOpeningV17(numeric, operation)).toBe(false);
  const noHolder: Entry = { ...entry, effects: entry.effects.map(effect => {
    if (effect.effect !== "operation") return effect;
    const rest = { ...effect }; delete rest.for; return rest;
  }) };
  const unbound = { ...operation }; delete unbound.for;
  expect(evidenceOperationOpeningV17(noHolder, unbound)).toBe(true);
  expect(evidenceOperationOpeningV17(noHolder, operation)).toBe(false);
  const opening = entry.effects.find(effect => effect.effect === "operation")!;
  expect(evidenceOperationOpeningV17({ ...entry, effects: [...entry.effects, opening] }, operation)).toBe(false);
  expect(evidenceOperationOpeningV17({ ...entry, seq: -1 }, operation)).toBe(false);
  expect(evidenceOperationOpeningV17({ ...entry, effects: entry.effects.map(effect => effect.effect === "operation" ? { ...effect, k: -1 } : effect) }, operation)).toBe(false);
});
