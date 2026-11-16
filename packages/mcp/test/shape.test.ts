import { describe, expect, test } from "vitest";
import type { FactRef, FieldType, ScopeRef } from "@generalbusiness/dap-contract";
import { scopeIdOf, textDigest } from "@generalbusiness/dap-bytes";
import { effectiveFields, expectedOf, finalStates, lackedSubject, viaLeft, type ActLike } from "@generalbusiness/dap-client";
import { capturedExpected, nowOf, shapeAfter, shapeAt, shapeFields, shapeNow, Unshaped, type McpNow } from "../src/shape.ts";

const scopeOf = (cause: string) => scopeIdOf({ v: 1, kind: "lane", definition: "platform:issue@1", creator: null, cause: textDigest(cause), ordinal: 0 } as never);
const genesisOf = (n: number) => textDigest(`TEST genesis ${n}`);
const here: ScopeRef = { scope: scopeOf("here"), genesis: genesisOf(1) };
const other: ScopeRef = { scope: scopeOf("other"), genesis: genesisOf(2) };
const fact = (at: ScopeRef, seq: number): FactRef => ({ at, seq, hash: `sha256:${"a".repeat(64)}` });
const act = {
  step: "transition", on: "shelf", also: { selected: { item: "jar", by: "jarFact" } },
  fields: { jarFact: { type: "fact", kind: ["fill"], under: "pantry", required: true }, list: { type: "list", max: 2, of: { type: "fact", kind: ["fill"], under: "pantry" }, required: false } },
} as unknown as ActLike;
const items = [{ id: 0, type: "shelf", revision: 4 }, { id: 2, type: "jar", revision: 7 }] as never;

describe("the fields the scope will read, for an act's subjects", () => {
  // Invariant: a local fact, one of the target's scope and genesis, is read as its seq, in a field and in a list, so it
  // selects the item it opened; a foreign fact with the same seq stays a fact and selects nothing; the given fields are untouched.
  test("a local fact as its seq; a foreign fact never a local item", () => {
    const given = { jarFact: fact(here, 2), list: [fact(here, 2), fact(other, 2)] };
    const effective = effectiveFields(act, given as never, here);
    expect(effective).toEqual({ jarFact: 2, list: [2, fact(other, 2)] });
    expect(given.jarFact).toEqual(fact(here, 2));
    expect(expectedOf(act, items, 0, effective)).toEqual({ on: 4, selected: 7 });
    // Another genesis of the same scope is foreign.
    const foreign = effectiveFields(act, { jarFact: fact({ scope: here.scope, genesis: genesisOf(3) }, 2) } as never, here);
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
  const state: Parameters<typeof expectedOf<ActLike>>[1] = [
    { id: 0, type: "shelf", revision: 4, refs: {} },
    { id: 2, type: "jar", revision: 7, refs: { lid: 6 } },
    { id: 3, type: "label", revision: 8, refs: {} },
    { id: 6, type: "lid", revision: 9, refs: {} },
    { id: 8, type: "label", revision: 10, refs: {} },
  ];
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
  const act: Pick<ActLike, "step" | "also"> = { step: "transition", also: { version: { item: "manifest", by: "manifest" }, computed: { code: "x" } } };
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

// Invariant: `after` with `now` is checked before anything is signed. Each fault is an `Unshaped` naming its field; a
// call with neither stays a fresh act. `now.at` carries the passed revisions, and only names the act binds.
describe("after with now", () => {
  const key = "again";
  const head = { seq: 9, hash: `sha256:${"b".repeat(64)}` as const };
  const now: McpNow = { of: "stale", target: here.scope, kind: "fill", primary: { item: 0, revision: 4 }, at: { on: 4, selected: 7 }, head };
  const call = { key, target: here.scope, kind: "fill", on: 0 as number | null, act: act as Pick<ActLike, "step" | "also"> };
  const fault = (args: { after: unknown; now: unknown; at: unknown }, field: string, over: Partial<typeof call> = {}): void => {
    let caught: unknown;
    try { shapeAfter(args, { ...call, ...over }); } catch (error) { caught = error; }
    expect(caught, field).toBeInstanceOf(Unshaped);
    expect((caught as Unshaped).field).toBe(field);
  };

  test("a call with neither stays a fresh act, and a valid pair returns its at", () => {
    expect(shapeAfter({ after: undefined, now: undefined, at: undefined }, call)).toBeUndefined();
    expect(shapeAfter({ after: undefined, now: undefined, at: { on: 1 } }, call)).toBeUndefined();
    const given = JSON.parse(JSON.stringify(now));
    const at = shapeAfter({ after: "stale", now: given, at: undefined }, call);
    given.at.on = 99;
    expect(at).toEqual({ on: 4, selected: 7 });
  });

  test("each fault names its field", () => {
    fault({ after: "stale", now: undefined, at: undefined }, "now");
    fault({ after: undefined, now, at: undefined }, "after");
    fault({ after: "", now, at: undefined }, "after");
    fault({ after: "stale", now, at: { on: 4 } }, "at");
    fault({ after: key, now: { ...now, of: key }, at: undefined }, "idempotencyKey");
    fault({ after: "stale", now: { ...now, of: "other" }, at: undefined }, "now.of");
    fault({ after: "stale", now: { ...now, target: "other" }, at: undefined }, "now.target");
    fault({ after: "stale", now: { ...now, kind: "other" }, at: undefined }, "now.kind");
    fault({ after: "stale", now: { ...now, primary: { item: 1, revision: 4 } }, at: undefined }, "now.primary");
    fault({ after: "stale", now: { ...now, primary: null }, at: undefined }, "now.primary");
    fault({ after: "stale", now: { ...now, at: { on: 4, ghost: 1 } }, at: undefined }, "now.at");
    fault({ after: "stale", now: { ...now, at: { on: 5, selected: 7 } }, at: undefined }, "now.at.on");
    fault({ after: "stale", now: { ...now, at: { on: -1 } }, at: undefined }, "now.at.on");
    fault({ after: "stale", now: { ...now, extra: 1 }, at: undefined }, "now.extra");
    fault({ after: "stale", now: { ...now, head: { seq: 1 } }, at: undefined }, "now.head");
    fault({ after: "stale", now: { ...now, primary: { item: 0 } }, at: undefined }, "now.primary");
    fault({ after: "stale", now: [], at: undefined }, "now");
    fault({ after: "stale", now: { of: "stale" }, at: undefined }, "now.target");
    // An act on no item takes a null primary only.
    fault({ after: "stale", now, at: undefined }, "now.primary", { on: null });
  });

  test("now is built from one fresh read and lacks only the primary", () => {
    const built = nowOf({ of: "stale", target: here.scope, kind: "fill", on: 0, primaryRevision: 4, expected: { on: 4, selected: 7 }, head });
    expect(built).toEqual({ now });
    expect(nowOf({ of: "k", target: here.scope, kind: "fill", on: 0, primaryRevision: undefined, expected: {}, head })).toEqual({ lacks: "on" });
    expect(nowOf({ of: "k", target: here.scope, kind: "open", on: null, primaryRevision: undefined, expected: { only: 2 }, head }))
      .toEqual({ now: { of: "k", target: here.scope, kind: "open", primary: null, at: { only: 2 }, head } });
    const open = { step: "open", also: { only: { item: "jar", one: true } } } as unknown as ActLike;
    expect(shapeAfter({ after: "stale", now: { ...now, kind: "open", primary: null, at: { only: 2 } }, at: undefined }, { ...call, kind: "open", on: null, act: open }))
      .toEqual({ only: 2 });
    expect(shapeNow(JSON.parse(JSON.stringify(now)))).toEqual(now);
  });

  // Ruling 09041476 item 5b: one rule for both adapters. A result carries `now` only when the read holds every subject's row.
  test("lacks names an also subject that the read does not hold, by the client's rule", () => {
    const shelf = { id: 0, type: "shelf", revision: 4, refs: {} }, jar = { id: 2, type: "jar", revision: 7, refs: {} };
    type Held = Parameters<typeof lackedSubject>[1];
    const named = effectiveFields(act, { jarFact: fact(here, 2) } as never, here);
    // The field names jar 2 and the read holds it: no subject lacks, and `now` has both revisions.
    expect(lackedSubject(act, [shelf, jar] as Held, 0, named)).toBeNull();
    // The read holds the primary but not jar 2: `selected` lacks, where `on` alone would have said nothing.
    expect(lackedSubject(act, [shelf] as Held, 0, named)).toBe("selected");
    const expected = expectedOf(act, [shelf] as Held, 0, named);
    expect(nowOf({ of: "k", target: here.scope, kind: "fill", on: 0, primaryRevision: 4, expected, head, lacking: "selected" })).toEqual({ lacks: "selected" });
    // The primary's own row missing says `on` first.
    expect(lackedSubject(act, [jar] as Held, 0, named)).toBe("on");
    // A field that names no item selects nothing: the subject is absent, not lacking.
    expect(lackedSubject(act, [shelf] as Held, 0, effectiveFields(act, {} as never, here))).toBeNull();
    // A via subject whose slot names a row the read does not hold lacks, and a via subject with an empty slot is absent.
    const viaAct = { step: "transition", on: "finding", fields: {}, also: { version: { item: "manifest", via: { of: "on", slot: "version" } } } } as unknown as ActLike;
    const finding = { id: 9, type: "finding", revision: 1, refs: { version: { at: {}, seq: 4, hash: "h" } } };
    expect(lackedSubject(viaAct, [finding] as unknown as Held, 9, {})).toBe("version");
    expect(lackedSubject(viaAct, [finding, { id: 4, type: "manifest", revision: 2, refs: {} }] as unknown as Held, 9, {})).toBeNull();
    expect(lackedSubject(viaAct, [{ ...finding, refs: {} }] as unknown as Held, 9, {})).toBeNull();
  });
});
