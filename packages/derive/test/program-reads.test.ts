/** Resolved validator evidence; production clock judgments have separate caller witnesses. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FieldType, type Operand, type Part } from "@generalbusiness/dap-contract";
import { bindElement, naming, ownerOf, type Defining, type Type } from "../src/validate/context.ts";
import { operand } from "../src/validate/operands.ts";
import { shapes } from "../src/validate/shape.ts";
import { resolvedReads } from "../src/program/reads.ts";
import { validateDefinition } from "../src/validate/index.ts";
import { asks } from "./definition-corpus/forms-operand-data.ts";

function fixture() {
  const bounds = structuredClone(PROPOSED_BOUNDS);
  const defining = { ...shapes(bounds), bounds, name: "read-model", platform: false,
    capabilities: new Map([["hold", "hold@1"], ["git-read", "git-read@1"]]), underived: [] } as unknown as Defining;
  const integer: FieldType = { type: "int", min: 0, max: 10 };
  const fact: FieldType = { type: "fact", kind: ["created"], under: "remote" };
  const record: FieldType = { type: "record", of: { value: { ...integer, required: true } } };
  const thing: Type = { name: "thing", initial: "live", states: new Map([["live", false]]), slots: new Map([
    ["amount", { kind: "value", type: integer, fixed: false, required: true, list: false, hasDefault: true }],
  ]) };
  const ctx = bindElement({ ...naming(), on: thing, also: new Map([["other", thing]]),
    fields: new Map<string, FieldType>([["count", { ...integer, required: true } as FieldType], ["pin", fact]]),
    presented: new Map([["proof", fact]]), handler: { update: true, under: "remote" }, clause: true, signer: true, kind: "check" },
  "row", record, "acts.check.guards.0.each.as");
  const owner = ownerOf(() => thing, { kind: "subject", name: "also.other" });
  const read = (value: Operand, path = "acts.check.value", guard = true) => {
    const result = operand(defining, value, path, ctx, owner, guard);
    expect(defining.problems).toEqual([]);
    return result ?? expect.fail("the fixture operand must validate");
  };
  return { defining, ctx, read, integer, fact, record };
}

test("all operand families retain resolved types and the actual subject or lexical binding", () => {
  const { read } = fixture();
  const cases: readonly Operand[] = [{ field: "count" }, { presented: "proof" }, { slot: "amount" }, { element: "row.value" },
    { item: "on" }, { signer: true }, { sender: true }, { source: "ref" }, { update: "revision" }, { result: "reason" },
    { scope: true }, { intent: true }, { none: true }, { const: { value: 3 } }];
  const nodes = cases.map((value, i) => read(value, `operands.${i}`).node);
  expect(nodes.map(node => [node.op, node.type])).toEqual([
    ["field", { kind: "declared", type: { type: "int", min: 0, max: 10, required: true } }],
    ["presented", { kind: "declared", type: { type: "fact", kind: ["created"], under: "remote" } }],
    ["slot", { kind: "declared", type: { type: "int", min: 0, max: 10 } }],
    ["element", { kind: "declared", type: { type: "int", min: 0, max: 10, required: true } }],
    ["item", { kind: "declared", type: { type: "item", of: "thing" } }],
    ["signer", { kind: "declared", type: { type: "member" } }], ["sender", { kind: "unknown" }], ["source", { kind: "unknown" }],
    ["update", { kind: "declared", type: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER } }],
    ["result", { kind: "unknown" }], ["scope", { kind: "unknown" }],
    ["intent", { kind: "declared", type: { type: "digest" } }], ["none", { kind: "unknown" }], ["const", { kind: "unknown" }],
  ]);
  const implicit = nodes[2]!, explicit = read({ slot: "amount", of: "on" }).node, element = nodes[3]!;
  if (implicit.op !== "slot" || explicit.op !== "slot" || element.op !== "element") return expect.fail("expected resolved variants");
  expect([implicit.slot.subject, explicit.slot.subject]).toEqual([
    { identity: { kind: "subject", name: "also.other" }, type: "thing", declaration: "items.thing" },
    { identity: { kind: "subject", name: "on" }, type: "thing", declaration: "items.thing" },
  ]);
  expect(implicit.slot).toMatchObject({ declaration: "items.thing.values.amount", required: true, fixed: false, hasDefault: true });
  expect(element.binding).toEqual({ name: "row", declaration: "acts.check.guards.0.each.as",
    type: { kind: "declared", type: { type: "record", of: { value: { type: "int", min: 0, max: 10, required: true } } } }, members: ["value"] });
  expect([read({ slot: "amount" }).node.phase, read({ slot: "amount" }, "effect.from", false).node.phase]).toEqual(["before", "working"]);
});

test("entry parts keep historical time, base nominal types, projections and nested set operands", () => {
  const { read } = fixture();
  const parts: readonly Part[] = ["ref", "scope", "seq", "kind", "intent", "on", "time", { field: "message" }, { opened: "thing" },
    { set: { item: { field: "count" }, slot: "amount" } }, { carried: "pin.commit" }];
  const nodes = parts.map((part, i) => read({ field: "pin", part }, `parts.${i}`).node);
  expect(nodes.map(node => [node.projection?.op, node.type])).toEqual([
    ["ref", { kind: "declared", type: { type: "fact", kind: ["created"], under: "remote" } }], ["scope", { kind: "unknown" }],
    ["seq", { kind: "declared", type: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER } }], ["kind", { kind: "unknown" }],
    ["intent", { kind: "declared", type: { type: "digest" } }], ["on", { kind: "unknown" }],
    ["time", { kind: "declared", type: { type: "time" } }], ["field", { kind: "unknown" }], ["opened", { kind: "unknown" }],
    ["set", { kind: "unknown" }], ["carried", { kind: "unknown" }],
  ]);
  expect(nodes.every(node => JSON.stringify(node.baseType) === JSON.stringify({ kind: "declared", type: { type: "fact", kind: ["created"], under: "remote" } }))).toBe(true);
  const set = nodes[9]!.projection;
  if (set?.op !== "set") return expect.fail("expected the set part");
  expect(set.item).toMatchObject({ op: "field", name: "count", path: "parts.9.part.set.item", type: { kind: "declared", type: { type: "int", min: 0, max: 10 } } });
  const projected = read({ field: "pin", part: { of: "ref", then: "seq" } }).node;
  expect(projected.projection).toMatchObject({ op: "project", then: "seq", of: { op: "ref", type: { kind: "declared", type: { type: "fact", under: "remote" } } } });
  expect(projected.type).toEqual({ kind: "declared", type: { type: "int", min: 0, max: Number.MAX_SAFE_INTEGER } });
});

test("descriptor ownership survives later mutation of types, bindings, constants and validation inputs", () => {
  const { read, ctx, defining, integer, fact } = fixture();
  const slot = read({ slot: "amount" }).node, historical = read({ field: "pin", part: "time" }).node;
  const constant = { value: [1, 2] }, literal = read({ const: constant }).node;
  const element = read({ element: "row.value" }).node;
  if (integer.type !== "int" || fact.type !== "fact") return expect.fail("expected fixture types");
  integer.max = 999; (fact.kind as string[]).push("changed"); ctx.elementBindings.set("row", "another.binder"); constant.value.push(3);
  defining.bounds.textBytes = 1;
  expect(slot.type).toEqual({ kind: "declared", type: { type: "int", min: 0, max: 10 } });
  expect(historical.baseType).toEqual({ kind: "declared", type: { type: "fact", kind: ["created"], under: "remote" } });
  expect(element.op === "element" && element.binding.declaration).toBe("acts.check.guards.0.each.as");
  expect(literal.op === "const" && literal.value).toEqual({ value: [1, 2] });
  expect(historical.context.validation.bounds.textBytes).toBe(PROPOSED_BOUNDS.textBytes);
  expect([Object.isFrozen(slot), Object.isFrozen(historical.baseType), Object.isFrozen(literal.op === "const" && literal.value)]).toEqual([true, true, true]);
  expect(slot.context.validation).not.toBe(fixture().read({ slot: "amount" }).node.context.validation);
});

test("the actual validation result retains its own resolved reads across equal digests and later input mutation", () => {
  const input = structuredClone(asks), bounds = structuredClone(PROPOSED_BOUNDS);
  const first = validateDefinition(input, bounds);
  const otherBounds = validateDefinition(input, { ...bounds, textBytes: bounds.textBytes - 1 });
  const otherProfiles = validateDefinition(input, bounds, { "restricted@1": {} });
  if (!first.ok || !otherBounds.ok || !otherProfiles.ok) return expect.fail("all three contexts must admit the fixture");
  const firstReads = resolvedReads(first.definition)!, secondReads = resolvedReads(otherBounds.definition)!, thirdReads = resolvedReads(otherProfiles.definition)!;
  expect([first.definition.digest, otherBounds.definition.digest, otherProfiles.definition.digest]).toEqual(Array(3).fill(first.definition.digest));
  expect(firstReads.validation).not.toBe(secondReads.validation);
  expect(firstReads.validation).not.toBe(thirdReads.validation);
  expect(secondReads.validation.bounds.textBytes).toBe(bounds.textBytes - 1);
  expect(firstReads.operands.every(node => node.context.validation === firstReads.validation)).toBe(true);
  const field = firstReads.operands.find(node => node.path === "acts.ask.effects.2.value.from");
  const slot = firstReads.operands.find(node => node.path === "acts.accept.guards.1.equals.b");
  expect(field).toMatchObject({ op: "field", name: "text", phase: "working", type: { kind: "declared", type: { type: "text", max: 100, required: true } } });
  expect(slot).toMatchObject({ op: "slot", phase: "before", slot: { name: "termsAt", subject: { identity: { kind: "subject", name: "on" }, type: "ask" } } });
  const text = input.acts["ask"]!.fields["text"]!;
  if ("code" in text || text.type !== "text") return expect.fail("expected text field");
  text.max = 1; bounds.textBytes = 1;
  expect(field?.type).toEqual({ kind: "declared", type: { type: "text", max: 100, required: true } });
  expect(firstReads.validation.bounds.textBytes).toBe(PROPOSED_BOUNDS.textBytes);
  expect([Object.isFrozen(firstReads), Object.isFrozen(firstReads.operands)]).toEqual([true, true]);
  expect(resolvedReads({ ...first.definition })).toBeNull();
  expect(validateDefinition({ ...input, genesis: "missing" }, PROPOSED_BOUNDS).ok).toBe(false);
});
