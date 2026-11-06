/** Static graph witnesses. Public clock callers have separate cutover obligations. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { validateDefinition, type ValidDefinition } from "../src/validate/index.ts";
import { bodyJudgesClock, bodyStructure, clauseStructure, declaredClockReads, structureOf, type StructureNode } from "../src/program/structure.ts";
import { resolvedReads } from "../src/program/reads.ts";
import { handlerBranch } from "../src/handler-branch.ts";
import { lower } from "../src/program/lower.ts";
import { small } from "./definition-corpus/fixture-data.ts";
import { asks } from "./definition-corpus/forms-operand-data.ts";
import { gate } from "./definition-corpus/marks-data.ts";
import { lateDefinition } from "./definition-corpus/source-order-data.ts";
import { definitionCorpus } from "./definition-corpus/index.ts";

function admitted(input: DeclaredDefinition): ValidDefinition {
  const result = validateDefinition(input, PROPOSED_BOUNDS);
  if (!result.ok) return expect.fail(JSON.stringify(result.problems));
  return result.definition;
}
function clockData(): DeclaredDefinition {
  const input = structuredClone(small), edit = input.acts["edit"]!;
  edit.guards = [{ state: ["draft"] }, { anyOf: [[{ state: ["draft"] }], [{ before: { slot: "due" } }]] }];
  edit.effects = [
    { value: { slot: "due", from: { time: { plusSeconds: 2 } } } },
    { value: { slot: "text", from: { const: "kept" } }, if: [{ state: ["kept"] }, { before: { slot: "due" } }], unless: [{ after: { slot: "due" } }] },
  ];
  edit.sends = [{ tell: { to: { slot: "peer" }, message: "check", fields: {}, if: [{ state: ["kept"] }, { after: { slot: "due" } }], result: {
    applied: [{ value: { slot: "due", from: { time: { plusSeconds: 9 } } }, if: [{ before: { slot: "due" } }] }],
  } } }];
  edit.attention = [{ notify: { of: "on", slot: "owner", when: "before", reason: "check", if: [{ state: ["kept"] }, { before: { slot: "due" } }] } }];
  return input;
}

test("the admitted corpus supplies every structural opcode and binds every root to its exact validation", async () => {
  const seen = new Set<string>();
  const visit = (node: StructureNode) => { seen.add(`${node.category}:${node.op}`); node.children.forEach(visit); };
  for (const row of definitionCorpus) {
    const checked = validateDefinition(await row.declaration(), row.bounds, row.profiles, row.options);
    if (!checked.ok) return expect.fail(`${row.name}: ${JSON.stringify(checked.problems)}`);
    const graph = structureOf(checked.definition), reads = resolvedReads(checked.definition)!;
    expect(graph, row.name).not.toBeNull();
    expect(graph!.validation, row.name).toBe(reads.validation);
    expect(graph!.roots.length, row.name).toBe(reads.frames.length);
    for (const root of graph!.roots) {
      expect(reads.frames.includes(root.frame), row.name).toBe(true);
      expect(root.frame.context.validation, row.name).toBe(graph!.validation);
      root.nodes.forEach(visit);
    }
  }
  expect([...seen].sort()).toEqual([
    "attention:notify",
    "effect:attribute", "effect:capability", "effect:hold", "effect:native", "effect:party", "effect:redact", "effect:ref", "effect:state", "effect:value",
    "guard:after", "guard:anyOf", "guard:before", "guard:capability", "guard:count", "guard:differs", "guard:distinct", "guard:each", "guard:equals", "guard:every", "guard:fact", "guard:has", "guard:native", "guard:none", "guard:notIn", "guard:rule", "guard:sameSet", "guard:set", "guard:signer", "guard:some", "guard:state", "guard:unset",
    "send:create", "send:index", "send:native", "send:relate", "send:tell",
  ].sort());
});

test("every declared clock branch contributes while future clauses keep separate roots", () => {
  const input = clockData(), checked = admitted(input), act = input.acts["edit"]!, body = bodyStructure(checked, act, "edit")!;
  expect(declaredClockReads(body)).toEqual([
    { path: "acts.edit.guards.1.anyOf.1.0", kind: "before" },
    { path: "acts.edit.effects.0.value.from", kind: "value-time" },
    { path: "acts.edit.effects.1.if.1", kind: "before" },
    { path: "acts.edit.effects.1.unless.0", kind: "after" },
    { path: "acts.edit.sends.0.tell.if.1", kind: "after" },
    { path: "acts.edit.attention.0.if.1", kind: "before" },
  ]);
  const send = act.sends[0]!, clause = clauseStructure(checked, send, "applied", body, "edit")!;
  expect(declaredClockReads(clause)).toEqual([
    { path: "acts.edit.sends.0.tell.result.applied.0.value.from", kind: "value-time" },
    { path: "acts.edit.sends.0.tell.result.applied.0.if.0", kind: "before" },
  ]);
  const sent = body.nodes.find(node => node.category === "send");
  expect(sent?.category === "send" && sent.future).toEqual([{ clause: "applied", root: clause.id }]);
  expect(clause.origin).toBe(body.id);
  expect(bodyJudgesClock(body)).toBe(true);
  // Static coverage does not claim that this body has a concrete evaluator.
  expect(lower(checked, "edit", PROPOSED_BOUNDS).supported).toBe(false);
});

test("historical entry time stays a resolved read and does not become a commit-clock source", () => {
  const input = structuredClone(asks);
  input.items["block"]!.values["seen"] = { fixed: false, required: false, of: { type: "time" } };
  const act = input.acts["block"]!;
  act.effects = [...act.effects, { value: { slot: "seen", from: { field: "on", part: "time" } } }];
  const checked = admitted(input), body = bodyStructure(checked, act, "block")!;
  expect(declaredClockReads(body)).toEqual([]);
  const value = body.nodes.find(node => node.category === "effect" && node.op === "value");
  expect(value?.category === "effect" && value.op === "value" && value.source).toMatchObject({ op: "read", read: { op: "field", name: "on", projection: { op: "time" } } });
});

test("aliased act and send objects keep distinct body and clause contexts", () => {
  const input = structuredClone(small), act = input.acts["edit"]!;
  act.guards = [{ state: ["draft"] }]; act.effects = []; act.attention = [];
  act.sends = [{ tell: { to: { slot: "peer" }, message: "later", fields: {}, result: { applied: [{ value: { slot: "due", from: { time: { plusSeconds: 1 } } } }] } } }];
  input.acts["alias"] = act;
  const checked = admitted(input), original = bodyStructure(checked, act, "edit")!, alias = bodyStructure(checked, act, "alias")!;
  expect(bodyStructure(checked, act)).toBeNull();
  expect(original.id).not.toBe(alias.id);
  expect(declaredClockReads(original)).toEqual([]); expect(declaredClockReads(alias)).toEqual([]);
  const owner = act.sends[0]!, first = clauseStructure(checked, owner, "applied", original, "edit")!, second = clauseStructure(checked, owner, "applied", alias, "alias")!;
  expect(first.id).not.toBe(second.id); expect(first.origin).toBe(original.id); expect(second.origin).toBe(alias.id);
  expect([bodyJudgesClock(first), bodyJudgesClock(second)]).toEqual([true, true]);
  expect(clauseStructure(checked, owner, "applied", original, "alias")).toBeNull();
});

test("replacement bodies and native result clauses resolve without merging their roots", () => {
  const input = lateDefinition(true), checked = admitted(input), handler = input.receives["sample"]!;
  const normal = bodyStructure(checked, handler, "sample")!, replacement = bodyStructure(checked, handlerBranch(handler, { reason: "old-sample" })!, "sample")!;
  expect([normal.frame.kind, replacement.frame.kind]).toEqual(["handler", "replacement"]);
  expect(normal.id).not.toBe(replacement.id);
  const nativeInput = structuredClone(gate), mark = nativeInput.acts["enter"]!.sends[0]!;
  if (!("code" in mark)) return expect.fail("expected send mark");
  mark.result.applied = [{ code: "clause", row: "P18" }];
  nativeInput.outcomes["probe"]!.send = { code: "probe-send", row: "P18", result: { applied: [{ code: "clause", row: "P18" }] } };
  const native = validateDefinition(nativeInput, PROPOSED_BOUNDS, undefined, { platform: true });
  if (!native.ok) return expect.fail(JSON.stringify(native.problems));
  const body = bodyStructure(native.definition, nativeInput.acts["enter"]!, "enter")!;
  const clause = clauseStructure(native.definition, mark, "applied", body, "enter")!;
  const outcome = clauseStructure(native.definition, nativeInput.outcomes["probe"]!.send!, "applied", null, "probe")!;
  expect([clause.frame.kind, outcome.frame.kind]).toEqual(["clause", "outcome-clause"]);
  expect(clause.origin).toBe(body.id); expect(outcome.origin).toBeNull();
  expect(clause.nodes.map(node => [node.category, node.op])).toEqual([["effect", "native"]]);
  const sent = body.nodes.find(node => node.category === "send" && node.op === "native");
  expect(sent?.category === "send" && sent.future).toContainEqual({ clause: "applied", root: clause.id });
  expect(sent?.category === "send" && sent.future.map(link => link.clause)).toEqual(["applied", "refused"]);
});

test("compiled data owns its inputs and cannot be borrowed through a copied validation result", () => {
  const input = clockData(), first = admitted(input), second = admitted(input), act = input.acts["edit"]!;
  const body = bodyStructure(first, act, "edit")!, other = bodyStructure(second, act, "edit")!, before = JSON.stringify(structureOf(first));
  expect(first.digest).toBe(second.digest); expect(body.id).not.toBe(other.id);
  expect(body.frame.context.validation).not.toBe(other.frame.context.validation);
  const effect = act.effects[0]!;
  if (!("value" in effect) || effect.value.from === null || !("time" in effect.value.from)) return expect.fail("expected commit time");
  effect.value.from.time.plusSeconds = 999; act.guards = [];
  expect(JSON.stringify(structureOf(first))).toBe(before);
  expect(structureOf({ ...first })).toBeNull();
  expect(() => declaredClockReads({ ...body })).toThrow("not admitted");
  const hasFunction = (value: unknown): boolean => typeof value === "function" || value !== null && typeof value === "object" && Object.values(value).some(hasFunction);
  expect(hasFunction(structureOf(first))).toBe(false);
  expect([Object.isFrozen(body), Object.isFrozen(body.nodes), Object.isFrozen(body.nodes[0]?.data), Object.isFrozen(structureOf(first)?.rules)]).toEqual([true, true, true, true]);
});
