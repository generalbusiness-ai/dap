/** Typed operand execution over admitted definitions and in-memory scope state. */
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type DeclaredDefinition } from "@generalbusiness/dap-contract";
import type { Judging } from "../src/guards.ts";
import { newItem } from "../src/fold.ts";
import { MemoryState } from "../src/state.ts";
import { validateDefinition, type ValidDefinition } from "../src/validate/index.ts";
import { bodyStructure, formStructures } from "../src/program/structure.ts";
import { readValue } from "../src/program/read-value.ts";
import { Scope, d, directory, fields, keys, ownWith, small, t, valid } from "./fixtures.ts";

function checked(input: DeclaredDefinition): ValidDefinition { return valid(validateDefinition(input, PROPOSED_BOUNDS)); }
function judging(definition: ValidDefinition): Judging {
  return { definition, view: new MemoryState(), bounds: PROPOSED_BOUNDS, clock: { reading: t(100), asOf: t(100), behind: false },
    scope: { at: directory, creator: null }, kind: "edit", self: 20, fields: {}, fieldTypes: definition.declared.acts["edit"]!.fields,
    subjects: new Map(), signer: { member: keys.rita.member, principal: null }, facts: new Map(), prepared: [], used: [] };
}
function note(definition: ValidDefinition, id: number, text: string) {
  const type = definition.declared.items["note"]!, item = newItem({ effect: "open", item: id, type: "note", state: type.initial }, type, d("b"));
  return { ...item, values: { ...item.values, text } };
}

test("a resolved range slot reads its covered item while an explicit subject keeps its own item", () => {
  const input = structuredClone(small), act = input.acts["edit"]!;
  const range = { some: { type: "note", states: ["draft"], where: [{ equals: { a: { slot: "text" }, b: { slot: "text", of: "on" } } }] } } as const;
  act.guards = [...act.guards, range];
  const definition = checked(input), body = bodyStructure(definition, act, "edit")!, [form] = formStructures(definition, body, range);
  const [implicit, explicit] = form!.reads.operands, j = judging(definition), on = note(definition, 1, "subject"), covered = note(definition, 2, "range");
  j.subjects = new Map([["on", on]]);
  expect([readValue(j, implicit!, covered), readValue(j, explicit!, covered)]).toEqual(["range", "subject"]);
});

test("typed element reads use lexical identities across a shadow rather than the written name", () => {
  const input = structuredClone(small), act = input.acts["edit"]!;
  act.fields["counts"] = { type: "list", of: { type: "int", min: 0, max: 9 }, max: 4, required: true };
  const shared = { equals: { a: { element: "row" }, b: { const: 1 } } } as const;
  act.guards = [{ state: ["draft"] }, { each: { list: { field: "counts" }, as: "row", guards: [
    shared, { each: { list: { field: "counts" }, as: "row", guards: [shared] } }, shared,
  ] } }];
  const definition = checked(input), body = bodyStructure(definition, act, "edit")!, outer = body.nodes[1]!, inner = outer.children[1]!;
  const outerBinding = outer.reads.bindings[0]!, innerBinding = inner.reads.bindings[0]!;
  const elements = new Map([[outerBinding.identity, 3], [innerBinding.identity, 7]]), j = judging(definition);
  j.elements = new Map([["row", 99]]);
  const reads = formStructures(definition, body, shared).map(form => form.reads.operands[0]!);
  expect(reads.map(read => readValue(j, read, null, elements))).toEqual([3, 7, 3]);
  expect(() => readValue(j, reads[1]!, null, new Map([[outerBinding.identity, 3]]))).toThrow("admitted lexical scope");
});

test("typed history projections preserve the recorded slot and skip a nested read when the outer entry is absent", () => {
  const input = structuredClone(small), act = input.acts["edit"]!;
  for (const name of ["proof", "selected"]) act.fields[name] = { type: "fact", kind: ["write"], under: input.name, required: true };
  const guard = { equals: { a: { field: "proof", part: { set: { item: { field: "selected", part: "on" }, slot: "text" } } }, b: { const: "kept" } } } as const;
  act.guards = [...act.guards, guard];
  const definition = checked(input), scope = new Scope(definition), wrote = scope.did(keys.rita, "write", fields({ text: "kept", owner: keys.rita.member })).seq;
  const body = bodyStructure(definition, act, "edit")!, read = formStructures(definition, body, guard)[0]!.reads.operands.find(read => read.op === "field" && read.name === "proof");
  if (!read) return expect.fail("expected the enclosing history projection");
  const j = judging(definition), calls: number[] = [];
  j.scope = scope.state.scope()!; j.own = ownWith(seq => { calls.push(seq); return scope.own(seq); }, scope.own.sequence());
  j.fields = { proof: wrote, selected: wrote };
  expect(readValue(j, read, null)).toBe("kept");
  expect(calls).toEqual([wrote, wrote]);
  calls.length = 0; j.fields = { proof: 999, selected: wrote };
  expect(readValue(j, read, null)).toBeNull();
  expect(calls).toEqual([999]);
});

test("copied descriptors and equal-digest validation results refuse before a field read", () => {
  const input = structuredClone(small), definition = checked(input), other = checked(input), act = input.acts["edit"]!;
  const body = bodyStructure(definition, act, "edit")!, read = body.nodes.find(form => form.category === "effect")!.reads.operands[0]!;
  const j = judging(definition), foreign = judging(other); let calls = 0;
  const fields = { get: () => { calls++; return { text: "current" }; } };
  Object.defineProperty(j, "fields", fields); Object.defineProperty(foreign, "fields", fields);
  expect(() => readValue(j, { ...read }, null)).toThrow("not admitted");
  expect(() => readValue(foreign, read, null)).toThrow("not admitted");
  expect(calls).toBe(0);
  expect(readValue(j, read, null)).toBe("current");
  expect(calls).toBe(1);
});
