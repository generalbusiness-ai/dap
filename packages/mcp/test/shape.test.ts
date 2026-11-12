import { describe, expect, test } from "vitest";
import type { FactRef, FieldType, ScopeRef } from "@generalbusiness/dap-contract";
import { newIncarnation, scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { effectiveFields, expectedOf, finalStates, viaLeft, type ActLike } from "@generalbusiness/dap-client";
import { capturedExpected, shapeAt, shapeFields, Unshaped } from "../src/shape.ts";

const scopeOf = (cause: string) => scopeIdOf({ v: 1, kind: "lane", definition: "platform:issue@1", creator: null, cause: textDigest(cause), ordinal: 0 } as never);
const incOf = (n: number) => newIncarnation(new Uint8Array(16).fill(n));
const here = { scope: scopeOf("here"), inc: incOf(1), kind: "lane" } as ScopeRef;
const other = { scope: scopeOf("other"), inc: incOf(2) };
const fact = (at: Pick<ScopeRef, "scope" | "inc">, seq: number): FactRef => ({ at: { ...at, kind: "lane" }, seq, hash: `sha256:${"a".repeat(64)}` }) as FactRef;
const act = {
  step: "transition", on: "shelf", also: { selected: { item: "jar", by: "jarFact" } },
  fields: { jarFact: { type: "fact", kind: ["fill"], under: "pantry", required: true }, list: { type: "list", max: 2, of: { type: "fact", kind: ["fill"], under: "pantry" }, required: false } },
} as unknown as ActLike;
const items = [{ id: 0, type: "shelf", revision: 4 }, { id: 2, type: "jar", revision: 7 }] as never;

describe("the fields the scope will read, for an act's subjects", () => {
  // Invariant: a local fact, one of the target's scope and incarnation, is read as its seq, in a field and in a list, so it
  // selects the item it opened; a foreign fact with the same seq stays a fact and selects nothing; the given fields are untouched.
  test("a local fact as its seq; a foreign fact never a local item", () => {
    const given = { jarFact: fact(here, 2), list: [fact(here, 2), fact(other, 2)] };
    const effective = effectiveFields(act, given as never, here);
    expect(effective).toEqual({ jarFact: 2, list: [2, fact(other, 2)] });
    expect(given.jarFact).toEqual(fact(here, 2));
    expect(expectedOf(act, items, 0, effective)).toEqual({ on: 4, selected: 7 });
    // Another incarnation of the same scope is foreign.
    const foreign = effectiveFields(act, { jarFact: fact({ scope: here.scope, inc: incOf(3) }, 2) } as never, here);
    expect(expectedOf(act, items, 0, foreign)).toEqual({ on: 4 });
  });
});

// Invariant: captured revisions cover the same resolved subjects as normal signing, including one/by/via bindings;
// unresolved and rule-selected subjects do not get keys, and lawful prototype-like aliases keep their own values.
test("captured revisions preserve values and exact subject coverage", () => {
  const declaration = {
    step: "transition", on: "shelf", fields: {},
    also: { only: { item: "jar", one: true }, chosen: { item: "label", by: "label" }, linked: { item: "lid", via: { of: "only", slot: "lid" } }, missing: { item: "absent", one: true }, selected: { code: "rule-selects" }, ...JSON.parse('{"__proto__":{"item":"label","by":"other"}}') },
  } as unknown as ActLike;
  const state = [
    { id: 0, type: "shelf", revision: 4, refs: {} },
    { id: 2, type: "jar", revision: 7, refs: { lid: 6 } },
    { id: 3, type: "label", revision: 8, refs: {} },
    { id: 6, type: "lid", revision: 9, refs: {} },
    { id: 8, type: "label", revision: 10, refs: {} },
  ] as unknown as Parameters<typeof expectedOf>[1];
  const fresh = expectedOf(declaration, state, 0, { label: 3, other: 8 });
  expect(fresh).toEqual(JSON.parse('{"on":4,"only":7,"chosen":8,"linked":9,"__proto__":10}'));
  const given = JSON.parse('{"on":0,"only":1,"chosen":2,"linked":3,"__proto__":4}');
  const at = shapeAt(given)!;
  given.on = 999;
  expect(capturedExpected(at, fresh)).toEqual(JSON.parse('{"on":0,"only":1,"chosen":2,"linked":3,"__proto__":4}'));
  expect(capturedExpected(undefined, fresh)).toBe(fresh);
  expect(() => capturedExpected({ ...at, selected: 0 }, fresh)).toThrow("bound subjects");
  const { linked: _linked, ...missing } = at;
  expect(() => capturedExpected(missing, fresh)).toThrow("bound subjects");
  // A subject that left the live summary, such as a superseded version, keeps its captured revision. The name stays one the act binds.
  const act = { also: { version: { item: "manifest", by: "manifest" }, computed: { code: "x" } } };
  expect(capturedExpected({ on: 2, version: 3 }, { on: 2 }, act)).toEqual({ on: 2, version: 3 });
  expect(() => capturedExpected({ on: 2, computed: 3 }, { on: 2 }, act)).toThrow("bound subjects");
  expect(() => capturedExpected({ on: 2, other: 3 }, { on: 2 }, act)).toThrow("bound subjects");
  expect(() => capturedExpected({ version: 3 }, { on: 2 }, act)).toThrow("bound subjects");
});

// Invariant: only a slot of another subject asks for a read, and only for an item the summary does not hold.
test("viaLeft names an item a via rule selects that the summary lacks, and no item the caller named", () => {
  const act = { step: "transition", on: "finding", fields: {},
    also: { version: { item: "manifest", via: { of: "on", slot: "version" } }, chained: { item: "plan", via: { of: "also.version", slot: "plan" } }, named: { item: "job", by: "job" }, one: { item: "proposal", one: true }, rule: { code: "selects", item: "key" } } } as unknown as ActLike;
  const finding = { id: 9, type: "finding", revision: 1, refs: { version: { at: {}, seq: 4, hash: "h" } } };
  const left = { id: 4, type: "manifest", revision: 2, refs: { plan: 7 } };
  type Items = Parameters<typeof viaLeft>[1];
  expect(viaLeft(act, [finding] as unknown as Items, 9, { job: 5 }), "A left version; the named job and the one proposal stay out").toEqual([{ type: "manifest", id: 4 }]);
  expect(viaLeft(act, [finding, left] as unknown as Items, 9, {}), "A live version asks for nothing, and its own slot asks next").toEqual([{ type: "plan", id: 7 }]);
  expect(viaLeft(act, [] as Items, 9, {}), "A subject that is itself absent selects nothing").toEqual([]);
  expect(finalStates({ states: { open: { final: false }, resolved: { final: true }, irrelevant: { final: true } } })).toEqual(["irrelevant", "resolved"]);
  expect(finalStates(undefined)).toEqual([]);
});


// The adapter must preserve the MCP input contract while the same Client checker serves typed handles.
test("MCP field shaping preserves its words, nested paths and explicit value adaptations", () => {
  const text = "A detached text supplied beside the intent.";
  const digest = textDigest(text);
  const declaration = { ...act, fields: {
    payload: { type: "record", required: true, of: {
      reader: { type: "member", required: true },
      // A supplied digest takes the existing early path; the scope still owns the text's full bounds check.
      body: { type: "text", max: 4, detached: true, required: true },
      counts: { type: "list", max: 2, of: { type: "int", min: 0, max: 4 }, required: true },
    } },
    marked: { type: "code", code: "example", row: "E1", required: true },
    ...JSON.parse('{"__proto__":{"type":"bool","required":false}}'),
  } } as ActLike;
  const given = JSON.parse('{"payload":{"reader":"@reader","counts":[0,4]},"marked":{"asGiven":true},"__proto__":true}');
  given.payload.body = digest;
  const shaped = shapeFields(declaration, given, [text, "unused"], here);
  expect(shaped).toEqual({ fields: { payload: { reader: { membership: here, member: "@reader" }, body: digest, counts: [0, 4] }, marked: { asGiven: true }, ...JSON.parse('{"__proto__":true}') }, texts: [text] });
  expect(Object.hasOwn(shaped.fields, "__proto__")).toBe(true);
  expect(given.payload.reader).toBe("@reader");
  const refused = (fields: Record<string, unknown>, expected: { field: string; what: string; declared: string }): void => {
    let caught: unknown;
    try { shapeFields(declaration, fields, [text], here); } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(Unshaped);
    expect(caught).toMatchObject(expected);
  };
  refused({ ...given, payload: { ...given.payload, counts: [1, -0] } }, { field: "fields.payload.counts.1", what: "is not a whole number from 0 to 4", declared: "int" });
  refused({ ...given, payload: { ...given.payload, counts: [1, 2, 3] } }, { field: "fields.payload.counts", what: "has more than 2 elements", declared: "list" });
  refused({ ...given, payload: { ...given.payload, reader: 7 } }, { field: "fields.payload.reader", what: "is not a member: give @handle, or { membership, member }", declared: "member" });
  const { body: _body, ...missingBody } = given.payload;
  refused({ ...given, payload: missingBody }, { field: "fields.payload.body", what: "is required", declared: "text" });
  const name = "x".repeat(200);
  refused({ ...given, [name]: true }, { field: `fields.${name.slice(0, 128)}… (200 characters)`, what: "is not declared", declared: "no such field" });

  // This call is compiled but not run: MCP must accept the whole Contract union, not a duplicated list of known types.
  void ((type: FieldType) => shapeFields({ ...act, fields: { field: { ...type, required: true } } }, { field: null }, [], here));
});
