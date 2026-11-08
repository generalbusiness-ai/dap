/** Resolved validator evidence; production clock judgments have separate caller witnesses. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FieldType, type Operand, type Part } from "@generalbusiness/dap-contract";
import { bindElement, naming, ownerOf, type Defining, type Type } from "../src/validate/context.ts";
import { operand } from "../src/validate/operands.ts";
import { shapes } from "../src/validate/shape.ts";
import { resolvedReads } from "../src/program/reads.ts";
import { validateDefinition } from "../src/validate/index.ts";
import { asks } from "./definition-corpus/forms-operand-data.ts";
import { notes, small } from "./definition-corpus/fixture-data.ts";
import { jobs } from "./definition-corpus/forms-guards-data.ts";
import { gate } from "./definition-corpus/marks-data.ts";
import { capabilityStagingData } from "./definition-corpus/capability-staging-data.ts";
import { board } from "./definition-corpus/forms-data.ts";
import { lateDefinition } from "./definition-corpus/source-order-data.ts";
import { handlerBranch } from "../src/handler-branch.ts";

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
  expect(element.binding).toEqual({ name: "row", identity: expect.any(Object), declaration: "acts.check.guards.0.each.as",
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

test("implicit guard reads retain the chosen field or slot, inherited subject, range and effect target", () => {
  const input = structuredClone(small);
  input.items["note"]!.refs["notes"] = { fixed: false, required: false, to: { type: "list", of: { type: "item", of: "note" }, max: 4 } };
  input.acts["edit"]!.guards = [...input.acts["edit"]!.guards, { of: "also.other", anyOf: [[{ set: "text" }]] }];
  const first = validateDefinition(input, PROPOSED_BOUNDS);
  if (!first.ok) return expect.fail(JSON.stringify(first.problems));
  const reads = resolvedReads(first.definition)!;
  expect(reads.fields.find(read => read.path === "acts.edit.guards.3.every.list")).toMatchObject({ name: "notes", type: { kind: "declared", type: { type: "list", of: { type: "item", of: "note" } } } });
  expect(reads.slots.some(read => read.path === "acts.edit.guards.3.every.list")).toBe(false);
  expect(reads.slots.find(read => read.path === "acts.edit.guards.2.before.slot")).toMatchObject({ access: "read", slot: { name: "due", subject: { identity: { kind: "subject", name: "on" } } } });
  expect(reads.slots.find(read => read.path === "acts.edit.guards.4.anyOf.0.0.set")).toMatchObject({ slot: { name: "text", subject: { identity: { kind: "subject", name: "also.other" }, type: "note" } } });
  expect(reads.slots.find(read => read.path === "acts.edit.effects.0.value.slot")).toMatchObject({ access: "write", slot: { name: "text", subject: { identity: { kind: "subject", name: "on" } } } });
  expect(reads.subjects.some(read => read.subject !== "scope" && read.subject.identity.kind === "subject" && read.subject.identity.name === "also.other")).toBe(true);
  delete input.acts["edit"]!.fields["notes"];
  input.acts["edit"]!.guards = input.acts["edit"]!.guards.map((guard, i) => i === 3 ? { every: { list: "notes", states: ["kept"] } } : guard);
  const fallback = validateDefinition(input, PROPOSED_BOUNDS);
  if (!fallback.ok) return expect.fail(JSON.stringify(fallback.problems));
  const fallbackReads = resolvedReads(fallback.definition)!;
  expect(fallbackReads.fields.some(read => read.path === "acts.edit.guards.3.every.list")).toBe(false);
  expect(fallbackReads.slots.find(read => read.path === "acts.edit.guards.3.every.list")).toMatchObject({ access: "read", slot: { name: "notes", kind: "ref", type: { kind: "declared", type: { type: "list", of: { type: "item", of: "note" } } } } });
  const rangeInput = structuredClone(jobs), ranges = validateDefinition(rangeInput, PROPOSED_BOUNDS);
  if (!ranges.ok) return expect.fail(JSON.stringify(ranges.problems));
  const range = resolvedReads(ranges.definition)!.ranges.find(read => read.path === "acts.merge.guards.0.each.guards.0.none");
  expect(range).toMatchObject({ states: ["failed"], subject: { type: "job", identity: { kind: "range", path: "acts.merge.guards.0.each.guards.0.none", type: "job" } } });
  expect([Object.isFrozen(range), Object.isFrozen(range?.states), Object.isFrozen(reads.slots)]).toEqual([true, true, true]);
});

test("foreign fields, attribution sources, collection slots, attention and redaction retain their actual owners", () => {
  const input = structuredClone(small);
  input.acts["cite"]!.fields["performer"] = { type: "text", max: 9, required: false };
  const edit = input.acts["edit"]!;
  edit.effects = [...edit.effects, { attribute: { slot: "readers", of: "on", with: [
    { subject: "also.other", slot: "owner" }, { items: { type: "note", states: ["draft"] }, slot: "owner" },
  ] } }];
  edit.sends = [{ tell: { to: { slot: "peer" }, message: "collected", fields: {
    rows: { collect: { items: { type: "note", states: ["draft"] }, fields: { body: "text", item: "item", state: "state" } } },
  }, result: {} } }];
  edit.attention = [{ notify: { slot: "owner", of: "also.other", when: "before", reason: "check" } }];
  const checked = validateDefinition(input, PROPOSED_BOUNDS);
  if (!checked.ok) return expect.fail(JSON.stringify(checked.problems));
  const reads = resolvedReads(checked.definition)!;
  expect(reads.foreignFields.find(read => read.path === "acts.cite.guards.1.fact.where.0.a")).toMatchObject({ factField: "proof", name: "performer", type: { kind: "unknown" } });
  expect(reads.slots.find(read => read.path === "acts.edit.effects.1.attribute.with.0.slot")).toMatchObject({ access: "read", slot: { name: "owner", subject: { identity: { kind: "subject", name: "also.other" } } } });
  expect(reads.slots.find(read => read.path === "acts.edit.effects.1.attribute.with.1.slot")).toMatchObject({ access: "read", slot: { name: "owner", subject: { identity: { kind: "range", path: "acts.edit.effects.1.attribute.with.1.items", type: "note" } } } });
  expect(reads.slots.find(read => read.path === "acts.edit.sends.0.tell.fields.rows.collect.fields.body")).toMatchObject({ slot: { name: "text", subject: { identity: { kind: "range", path: "acts.edit.sends.0.tell.fields.rows.collect.items", type: "note" } } } });
  expect(reads.slots.filter(read => read.path.startsWith("acts.edit.sends.0.tell.fields.rows.collect.fields.")).map(read => read.slot.name)).toEqual(["text"]);
  expect(reads.slots.find(read => read.path === "acts.edit.attention.0.slot")).toMatchObject({ slot: { name: "owner", subject: { identity: { kind: "subject", name: "also.other" } } } });
  const redacted = validateDefinition(notes, PROPOSED_BOUNDS);
  if (!redacted.ok) return expect.fail(JSON.stringify(redacted.problems));
  expect(resolvedReads(redacted.definition)!.slots.find(read => read.path === "acts.strike.effects.1.redact.slot")).toMatchObject({ access: "redact", slot: { name: "body", kind: "value", type: { kind: "declared", type: { type: "text", detached: true } } } });
});

test("native marks and capability range slots remain owned evidence rather than inspected hook code", () => {
  const input = structuredClone(gate), marked = validateDefinition(input, PROPOSED_BOUNDS, undefined, { platform: true });
  if (!marked.ok) return expect.fail(JSON.stringify(marked.problems));
  const reads = resolvedReads(marked.definition)!;
  const guard = input.acts["enter"]!.guards[1]!;
  if (!("code" in guard)) return expect.fail("expected native guard");
  guard.row = "changed";
  expect(reads.marks.find(mark => mark.path === "acts.enter.guards.1")).toMatchObject({ code: "fresh", row: "P14", kind: "guard" });
  expect([Object.isFrozen(reads.marks), Object.isFrozen(reads.marks[0])]).toEqual([true, true]);
  expect(reads.operands.find(read => read.path === "acts.enter.effects.1.value.from")?.type).toMatchObject({ kind: "native", mark: { code: "even", row: "P22", type: "code" } });
  const capability = validateDefinition(capabilityStagingData(), PROPOSED_BOUNDS);
  if (!capability.ok) return expect.fail(JSON.stringify(capability.problems));
  const capabilityReads = resolvedReads(capability.definition)!;
  expect(capabilityReads.slots.find(read => read.path === "acts.stage.guards.2.capability.with.earlier.slot")).toMatchObject({ access: "read", slot: { name: "text", subject: { identity: { kind: "range", path: "acts.stage.guards.2.capability.with.earlier.items", type: "note" } } } });
  expect(capabilityReads.underived).toContainEqual({ path: "acts.stage.guards.2.capability", capability: "git-read@1", form: "guard", name: "ancestry" });
  expect(Object.isFrozen(capabilityReads.underived)).toBe(true);
});

test("validated frames separate normal, replacement, timed and future result bodies", () => {
  const input = lateDefinition(true), send = input.acts["emit"]!.sends[0]!;
  if (!("tell" in send)) return expect.fail("expected tell");
  send.tell.result.applied = [{ value: { slot: "last", from: { field: "first" } } }];
  const checked = validateDefinition(input, PROPOSED_BOUNDS);
  if (!checked.ok) return expect.fail(JSON.stringify(checked.problems));
  const reads = resolvedReads(checked.definition)!, frames = reads.frames;
  const normal = frames.find(frame => frame.path === "receives.sample"), replacement = frames.find(frame => frame.path === "receives.sample.late.then");
  expect(normal).toMatchObject({ kind: "handler", on: null, signer: false, context: { kind: "sample", clause: false, handler: { update: false, under: null } } });
  expect(replacement).toMatchObject({ kind: "replacement", on: null, signer: false, fields: [["value", { kind: "declared", type: { type: "int", min: 0, max: 100 } }]], also: [{ identity: { kind: "subject", name: "also.board" }, type: "board" }] });
  const clause = frames.find(frame => frame.path === "acts.emit.sends.0.tell.result.applied");
  expect(clause).toMatchObject({ kind: "clause", on: { type: "board" }, context: { kind: "emit", clause: true, senderKind: "directory" } });
  expect(frames.find(frame => frame.path === "acts.emit")).toMatchObject({ kind: "act", context: { clause: false } });
  expect(frames.every(frame => frame.context.validation === reads.validation)).toBe(true);
  const handler = input.receives["sample"]!, first = handlerBranch(checked.definition, handler, { reason: "old-sample" }), second = handlerBranch(checked.definition, handler, { reason: "old-sample" });
  // Reconstruction now returns the same admitted header and immutable effects.
  expect(first).toBe(second);
  expect(first?.effects).toEqual(handler.late!.then!.effects);
  expect(first?.effects).not.toBe(handler.late!.then!.effects);
  const timed = validateDefinition(board, PROPOSED_BOUNDS);
  if (!timed.ok) return expect.fail(JSON.stringify(timed.problems));
  expect(resolvedReads(timed.definition)!.frames.find(frame => frame.path === "timed.job-deadline")).toMatchObject({ kind: "timed", timed: true, fields: [], on: { type: "job" }, context: { kind: "timed:job-deadline" } });
  const nativeInput = structuredClone(gate);
  nativeInput.outcomes["probe"]!.send = { code: "probe-send", row: "P18", result: { applied: [{ code: "clause", row: "P18" }] } };
  const native = validateDefinition(nativeInput, PROPOSED_BOUNDS, undefined, { platform: true });
  if (!native.ok) return expect.fail(JSON.stringify(native.problems));
  const nativeReads = resolvedReads(native.definition)!;
  expect(nativeReads.frames.find(frame => frame.path === "acts.enter.sends.0.result.applied")).toMatchObject({ kind: "clause", context: { clause: true } });
  expect(nativeReads.frames.find(frame => frame.path === "outcomes.probe.send.result.applied")).toMatchObject({ kind: "outcome-clause", on: null, also: [], fields: [], signer: false, context: { kind: "probe", clause: true } });
  expect(nativeReads.frames.find(frame => frame.path === "acts.enter")?.fields).toContainEqual(["note", expect.objectContaining({ kind: "native", mark: expect.objectContaining({ code: "even" }) })]);
  const field = input.acts["emit"]!.fields["first"]!;
  if ("code" in field || field.type !== "int") return expect.fail("expected integer");
  field.max = 1;
  expect(clause?.fields).toContainEqual(["first", expect.objectContaining({ kind: "declared", type: expect.objectContaining({ max: 100 }) })]);
  expect([Object.isFrozen(replacement), Object.isFrozen(replacement?.fields), Object.isFrozen(nativeReads.frames)]).toEqual([true, true, true]);
});
