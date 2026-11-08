/** Static graph witnesses. Public clock callers have separate cutover obligations. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import { validateDefinition, type ValidDefinition } from "../src/validate/index.ts";
import { bodyJudgesClock, bodyStructure, clauseStructure, declaredClockReads, formStructures, guardList, guardPlan, rangePlan, structureOf, timedStructure, type BodyStructure, type StructureNode } from "../src/program/structure.ts";
import { resolvedReads } from "../src/program/reads.ts";
import { handlerBranch } from "../src/handler-branch.ts";
import { lower } from "../src/program/lower.ts";
import { lane, small } from "./definition-corpus/fixture-data.ts";
import { asks } from "./definition-corpus/forms-operand-data.ts";
import { gate } from "./definition-corpus/marks-data.ts";
import { lateDefinition } from "./definition-corpus/source-order-data.ts";
import { definitionCorpus } from "./definition-corpus/index.ts";
import { capabilityStagingData } from "./definition-corpus/capability-staging-data.ts";

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
  const visit = (definition: ValidDefinition, body: BodyStructure, node: StructureNode) => {
    seen.add(`${node.category}:${node.op}`);
    // This checks complete capture, not concrete execution or caller integration.
    if (node.category === "guard" && node.op !== "native") expect(guardPlan(definition, body, node)?.code.op).toBe(node.op);
    node.children.forEach(child => visit(definition, body, child));
  };
  for (const row of definitionCorpus) {
    const checked = validateDefinition(await row.declaration(), row.bounds, row.profiles, row.options);
    if (!checked.ok) return expect.fail(`${row.name}: ${JSON.stringify(checked.problems)}`);
    const graph = structureOf(checked.definition), reads = resolvedReads(checked.definition)!;
    expect(graph, row.name).not.toBeNull();
    expect(graph!.validation, row.name).toBe(reads.validation);
    expect(graph!.native.map(hook => [hook.kind, hook.path, hook.mark.code, hook.mark.row, hook.dependencies]), row.name)
      .toEqual(reads.marks.map(mark => [mark.kind, mark.path, mark.code, mark.row, "unknown"]));
    expect(new Set(graph!.native.map(hook => hook.id)).size, row.name).toBe(graph!.native.length);
    for (const hook of graph!.native) expect(hook.validation, row.name).toBe(reads.validation);
    expect(graph!.roots.length, row.name).toBe(reads.frames.length);
    for (const root of graph!.roots) {
      expect(reads.frames.includes(root.frame), row.name).toBe(true);
      expect(root.frame.context.validation, row.name).toBe(graph!.validation);
      root.nodes.forEach(node => visit(checked.definition, root, node));
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
  const guard = act.guards[0]!;
  expect(formStructures(checked, original, guard)).toEqual([original.nodes[0]]);
  expect(formStructures(checked, alias, guard)).toEqual([alias.nodes[0]]);
  expect(formStructures(checked, original, guard)[0]).not.toBe(formStructures(checked, alias, guard)[0]);
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
  expect(() => formStructures(second, body, act.effects[0]!)).toThrow("another validation");
  expect(() => formStructures(first, { ...body }, act.effects[0]!)).toThrow("another validation");
  expect(formStructures(first, body, { ...act.effects[0]! })).toEqual([]);
  expect(() => declaredClockReads({ ...body })).toThrow("not admitted");
  const hasFunction = (value: unknown): boolean => typeof value === "function" || value !== null && typeof value === "object" && Object.values(value).some(hasFunction);
  expect(hasFunction(structureOf(first))).toBe(false);
  expect([Object.isFrozen(body), Object.isFrozen(body.nodes), Object.isFrozen(body.nodes[0]?.data), Object.isFrozen(structureOf(first)?.rules)]).toEqual([true, true, true, true]);
});

test("timed execution binds only its admitted rule and original form arrays", () => {
  const input = structuredClone(lane), checked = admitted(input), rule = input.timed["hold-end"]!;
  const body = timedStructure(checked, "hold-end", rule.effects, rule.attention);
  expect(body).toBe(bodyStructure(checked, rule, "timed:hold-end"));
  expect(body?.frame.kind).toBe("timed");
  expect(formStructures(checked, body!, rule.effects[0]!)).toEqual([body!.nodes[0]]);
  expect(timedStructure(checked, "hold-end", [...rule.effects], rule.attention)).toBeNull();
  expect(timedStructure(checked, "hold-end", rule.effects, [...rule.attention])).toBeNull();
  expect(timedStructure(checked, "unknown", rule.effects, rule.attention)).toBeNull();
  expect(timedStructure({ ...checked }, "hold-end", rule.effects, rule.attention)).toBeNull();
});

test("aliased guards retain the binder they read when a nested list shadows its name", () => {
  const input = structuredClone(small), act = input.acts["edit"]!;
  act.fields["counts"] = { type: "list", of: { type: "int", min: 0, max: 9 }, max: 4, required: true };
  const shared = { equals: { a: { element: "row" }, b: { const: 1 } } } as const;
  act.guards = [{ state: ["draft"] }, { each: { list: { field: "counts" }, as: "row", guards: [
    shared, { each: { list: { field: "counts" }, as: "row", guards: [shared] } }, shared,
  ] } }];
  const checked = admitted(input), body = bodyStructure(checked, act, "edit")!;
  const outer = body.nodes[1]!, inner = outer.children[1]!;
  const [outerBinding] = outer.reads.bindings, [innerBinding] = inner.reads.bindings;
  expect(outerBinding?.name).toBe("row"); expect(innerBinding?.name).toBe("row");
  expect(outerBinding?.identity).not.toBe(innerBinding?.identity);
  const reads = formStructures(checked, body, shared).map(node => node.reads.operands[0]!);
  if (reads.some(read => read.op !== "element")) return expect.fail("expected element operands");
  expect(reads.map(read => read.op === "element" && read.binding.identity)).toEqual([
    outerBinding!.identity, innerBinding!.identity, outerBinding!.identity,
  ]);
  expect(reads[0]?.context.validation).toBe(body.frame.context.validation);
  expect(Object.isFrozen(outerBinding?.identity)).toBe(true);
});

test("a refused capability argument does not copy the value its name already excludes", () => {
  const input = capabilityStagingData(), guard = input.acts["stage"]!.guards[1]!;
  if (!("capability" in guard)) return expect.fail("expected capability guard");
  // validateDefinition accepts object input. The ignored value need not have JSON bytes.
  const cycle: Record<string, unknown> = {}; cycle["self"] = cycle;
  Object.defineProperty(guard.capability.with, "unlisted", { value: cycle, enumerable: true });
  let result: ReturnType<typeof validateDefinition> | undefined;
  expect(() => { result = validateDefinition(input, PROPOSED_BOUNDS); }).not.toThrow();
  expect(result).toEqual({ ok: false, problems: [{ code: "capability", path: "acts.stage.guards.1.capability.with.unlisted", message: "is not an argument of the guard staged of hold@1" }] });
  const conditional = capabilityStagingData(), nested = structuredClone(conditional.acts["stage"]!.guards[1]!);
  if (!("capability" in nested)) return expect.fail("expected capability condition");
  Object.defineProperty(nested.capability.with, "unlisted", { value: cycle, enumerable: true });
  conditional.acts["stage"]!.effects[1]!.if = [nested];
  // Rejected condition arguments must not reach the later recursive skip capture.
  let conditionalResult: ReturnType<typeof validateDefinition> | undefined;
  expect(() => { conditionalResult = validateDefinition(conditional, PROPOSED_BOUNDS); }).not.toThrow();
  expect(conditionalResult).toEqual({ ok: false, problems: [{ code: "capability", path: "acts.stage.effects.1.if.0.capability.with.unlisted", message: "is not an argument of the guard staged of hold@1" }] });
});

test("aliased conditions resolve by their owning form and semantic place", () => {
  const input = clockData(), act = input.acts["edit"]!, shared = [{ before: { slot: "due" } }];
  const effect = { value: { slot: "text", from: { const: "kept" } }, if: shared, unless: shared };
  const second = { value: { slot: "due", from: { slot: "due" } }, if: shared, unless: shared };
  act.effects = [effect, second];
  const checked = admitted(input), body = bodyStructure(checked, act, "edit")!;
  const owners = [formStructures(checked, body, effect)[0]!, formStructures(checked, body, second)[0]!];
  const firstIf = guardList(checked, body, owners[0]!, shared, "if")!, firstUnless = guardList(checked, body, owners[0]!, shared, "unless")!;
  const secondIf = guardList(checked, body, owners[1]!, shared, "if")!;
  expect(firstIf).toHaveLength(1); expect(firstUnless).toHaveLength(1); expect(secondIf).toHaveLength(1);
  expect(firstIf[0]).not.toBe(firstUnless[0]); expect(firstIf[0]).not.toBe(secondIf[0]);
  const owned = owners[0]!;
  if (owned.category !== "effect" || owned.op !== "value") return expect.fail("expected value effect");
  expect(guardList(checked, body, owned, owned.data.if!, "if")).toBe(firstIf);
  expect(guardList(checked, body, owned, [...shared], "if")).toBeNull();
  expect(() => guardList(checked, { ...body }, owned, shared, "if")).toThrow("another validation");
});

test("aliased capability ranges retain their semantic argument and admitted owner", () => {
  const input = capabilityStagingData(), act = input.acts["stage"]!, source = act.guards[2]!;
  if (!("capability" in source)) return expect.fail("expected capability guard");
  const argument = source.capability.with["earlier"];
  if (!argument || !("items" in argument)) return expect.fail("expected range argument");
  source.capability.with["selected"] = { items: argument.items, slot: argument.slot };
  const checked = admitted(input), body = bodyStructure(checked, act, "stage")!, owner = formStructures(checked, body, source)[0]!;
  if (owner.category !== "guard" || owner.op !== "capability") return expect.fail("expected capability guard instruction");
  const code = guardPlan(checked, body, owner)?.code;
  if (code?.op !== "capability") return expect.fail("expected capability instruction");
  const ownedArgument = owner.data.capability.with["earlier"];
  if (!ownedArgument || !("items" in ownedArgument)) return expect.fail("expected owned range argument");
  const plan = rangePlan(checked, body, owner, argument.items, "capability:earlier")!;
  expect(plan).toMatchObject({ type: "note", states: ["draft"], where: [], except: [] });
  expect(ownedArgument.items).not.toBe(argument.items);
  const selected = rangePlan(checked, body, owner, argument.items, "capability:selected");
  expect(selected).not.toBeNull(); expect(selected).not.toBe(plan);
  const typedArgument = code.capability.arguments.find(([name]) => name === "earlier")?.[1];
  const typedSelected = code.capability.arguments.find(([name]) => name === "selected")?.[1];
  if (typedArgument?.op !== "items" || typedSelected?.op !== "items") return expect.fail("expected typed range arguments");
  expect(typedArgument.range).toBe(plan); expect(typedSelected.range).toBe(selected);
  expect(rangePlan(checked, body, owner, argument.items, "capability:unknown")).toBeNull();
  expect(rangePlan(checked, body, owner, ownedArgument.items, "capability:earlier")).toBe(plan);
  expect(rangePlan(checked, body, body.nodes[0]!, argument.items, "capability:earlier")).toBeNull();
  expect(() => rangePlan(checked, { ...body }, owner, argument.items, "capability:earlier")).toThrow("another validation");
});
