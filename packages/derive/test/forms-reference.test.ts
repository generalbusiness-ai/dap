import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import type { DeclaredDefinition, FieldType, ReferenceValue } from "@generalbusiness/dap-contract";
import { canonicalize, fitsFieldType, isFactRef, isReference, parseStrict, utf8 } from "@generalbusiness/dap-bytes";
import { fieldAssignable } from "../src/field-types.ts";
import { fieldRetention } from "../src/field-retention.ts";
import { factsNamed } from "../src/fields.ts";
import { validateDefinition } from "../src/index.ts";
import { mostBytes } from "../src/validate/sizes.ts";
import { Scope, board, d, keys, otherLane, valid } from "./fixtures-entry.ts";

const reference = { type: "reference", fragment: 512 } as const;
const definition = (): DeclaredDefinition => ({
  ...board,
  acts: { ...board.acts, cite: {
    step: "comment", on: null, grant: "cite", also: {},
    fields: { about: { type: "list", of: reference, max: 64, required: true } },
    guards: [], effects: [], sends: [], attention: [],
  } },
});

test("a citation has one target and an opaque UTF-8 bounded fragment, while FactRef stays closed", () => {
  const entry = { at: otherLane, seq: 999, hash: d("f") };
  const values: ReferenceValue[] = [
    { document: d("a") }, { document: d("a"), fragment: "page=3" },
    { entry, fragment: "row=7" }, { entry, fragment: "not a selector # ? \u0000" },
    { document: d("b"), fragment: "é".repeat(256) },
  ];
  for (const value of values) {
    expect(isReference(value, 512)).toBe(true);
    expect(fitsFieldType(reference, parseStrict(canonicalize(value)), PROPOSED_BOUNDS)).toBe(true);
    expect(utf8(canonicalize(value)).length).toBeLessThanOrEqual(mostBytes(reference, PROPOSED_BOUNDS));
  }
  for (const value of [
    {}, { document: d("a"), entry }, { document: "not a digest" },
    { entry: { ...entry, fragment: "page=3" } }, { document: d("a"), extra: true },
    { entry, fragment: 3 }, { entry, fragment: undefined }, { entry, fragment: "\ud800" },
    { entry, fragment: "é".repeat(256) + "x" },
  ]) expect(isReference(value, 512)).toBe(false);
  expect(isFactRef({ ...entry, fragment: "row=7" })).toBe(false);
  expect(isReference({ entry, fragment: "" }, 0)).toBe(true);
});

test("recording a local or unavailable foreign citation preserves its bytes without fetching a fact or retaining its target", () => {
  // The scope's genesis and grants are scripted fixture authority. The act, seal, fold and replay are the real derive code.
  const s = new Scope(valid(validateDefinition(definition(), PROPOSED_BOUNDS)));
  const about: ReferenceValue[] = [
    { document: d("a"), fragment: "page=3" },
    { entry: s.fact(0), fragment: "row=7" },
    { entry: { at: otherLane, seq: 999, hash: d("f") }, fragment: "opaque" },
  ];
  const fields = { about };
  expect(factsNamed(s.definition.declared.acts["cite"]!.fields, fields, s.at)).toEqual([]);
  const entry = s.did(keys.sam, "cite", { fields });
  expect(entry.input.type === "act" && entry.input.signed.intent.fields).toEqual(fields);
  expect([entry.uses, entry.effects, entry.sends]).toEqual([[], [], []]);
  expect(s.replay().snapshot()).toBe(s.state.snapshot());
  expect(fieldRetention([{ type: "list", of: reference, max: 64 }], PROPOSED_BOUNDS, true)).toEqual({ facts: 0, texts: 0, values: 0 });
  expect(s.act(keys.sam, "cite", { fields: { about: [{ entry: s.fact(0), fragment: "x".repeat(513) }] } })).toMatchObject({ result: "refused", reason: "bad-field" });
});

test("reference declarations bound copies and canonical entry reservations", () => {
  expect(validateDefinition(definition(), PROPOSED_BOUNDS).ok).toBe(true);
  for (const fragment of [-1, 0.5, PROPOSED_BOUNDS.textBytes + 1]) {
    const data = definition();
    data.acts["cite"]!.fields["about"] = { type: "reference", fragment, required: true };
    expect(validateDefinition(data, PROPOSED_BOUNDS).ok).toBe(false);
  }
  const narrower: FieldType = { type: "reference", fragment: 8 };
  expect([fieldAssignable(narrower, reference), fieldAssignable(reference, narrower), fieldAssignable(reference, { type: "fact", kind: ["cite"], under: "board" })]).toEqual([true, false, false]);
  const escaped = { document: d("a"), fragment: "\u0000".repeat(512) };
  expect(isReference(escaped, 512)).toBe(true);
  expect(utf8(canonicalize(escaped)).length).toBeLessThanOrEqual(mostBytes(reference, PROPOSED_BOUNDS));
});
