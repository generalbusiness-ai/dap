/** Pure draft transformation over owned TEST rows. No store, journal, authority,
 * signature, Native judgment, coordinating fence, or operation wiring runs. */
import { expect, test } from "vitest";
import type { DeclaredDefinition, Digest, FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import { ShapeError } from "../src/declared.ts";
import { ownDraftClearNames, ownDraftPatch, prepareDraftClear, prepareDraftEdit, type DraftEditResult } from "../src/draft-edit.ts";
import { ownDraftClearInputs, ownDraftEditInputs } from "../src/draft-preflight.ts";
import { slotFor } from "../src/draft-slot.ts";
import type { DraftSelectionRow } from "../src/draft-selection.ts";
import type { DraftBinding, StoredDraft, StoredDraftReturn } from "../src/draft-store.ts";
import { selection } from "./support/c4-selection.ts";

const digest = (hex: string): Digest => `sha256:${hex.repeat(64)}`;
const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: digest("a") };
const fact = (seq: number): FactRef => ({ at: scope, seq, hash: digest(String(seq)) });
function fixture(withDefault = true) {
  const definition: DeclaredDefinition = { ...selection,
    items: { ...selection.items, target: { ...selection.items.target, max: 4,
      values: { ...selection.items.target.values, next: { fixed: false, required: false, of: { type: "item", of: "target" } } } } },
    acts: { ...selection.acts, choose: {
      step: "transition", on: "anchor", grant: "c4-selection.member",
      also: {
        target: { item: "target", by: "cause" },
        ["__proto__"]: { item: "target", via: { of: "also.target", slot: "next" } },
        fixed: { item: "anchor", one: true },
      },
      fields: { cause: { type: "fact", kind: ["make-target"], under: "c4-selection", required: false,
        ...(withDefault ? { default: fact(3) } : {}) },
        spare: { type: "item", of: "target", required: false },
        on: { type: "text", max: 16, required: false },
        label: { type: "text", max: 64, detached: true, required: true } },
      guards: [], effects: [], sends: [], attention: [],
    } },
  };
  const binding: DraftBinding = { owner: keys.rita.key, scope,
    definition: definitionDigest(definition), descriptor: digest("d") };
  const row = (id: number, type: string, revision: number, next?: number): DraftSelectionRow => ({
    id, type, revision, refs: {}, values: { ...(type === "target" ? { n: 0 } : {}), ...(next === undefined ? {} : { next }) },
  });
  const rows = [row(0, "anchor", 8), row(3, "target", 2, 7), row(4, "target", 10, 8), row(7, "target", 5), row(8, "target", 11)];
  const on = { name: 0, seen: 1, assumes: [] };
  const slot = { kind: "choose", on: 0, items: {} };
  const namedRefs = { on, fields: {} };
  return { definition, binding, rows, row, slot, namedRefs, key: "same-intention" };
}
function written(result: DraftEditResult): StoredDraft {
  if (!result.ok) return expect.fail("the owned TEST rows must support this edit");
  return result.draft;
}

// A first empty edit captures supplied seen and actual derived defaults without
// completing required values; later equal-address refs and feeds cannot rebase it.
test("partial edits preserve authored data, explicit seen, and unrelated first captures", () => {
  const f = fixture(), first = written(prepareDraftEdit({ ...f, current: null, patch: {} }));
  expect(first.key).toBe(f.key);
  expect(first.act.fields).toEqual({});
  expect(first.act.expected).toEqual(Object.fromEntries([["on", 1], ["target", 2], ["__proto__", 5], ["fixed", 8]]));
  expect(first.capture["on"]).toEqual({ is: "ref", ref: f.namedRefs.on });
  expect(first.capture["target"]).toEqual({ is: "derived", ref: { name: 3, seen: 2, assumes: [] } });
  const before = canonicalize(first), later = [f.row(0, "anchor", 20), f.row(3, "target", 21, 8), f.row(8, "target", 22)];
  const next = written(prepareDraftEdit({ ...f, rows: later, current: first,
    namedRefs: { on: { ...f.namedRefs.on, seen: 20 }, fields: {} },
    patch: { label: "authored detached words", on: "ordinary field", ignored: undefined } }));
  expect(next.act.fields).toEqual({ label: "authored detached words", on: "ordinary field" });
  expect(next.act.expected).toEqual(first.act.expected);
  expect(next.namedRefs).toEqual(first.namedRefs);
  expect(next.key).toBe(first.key);
  expect(canonicalize(first)).toBe(before);
  Reflect.set(next.act.fields, "label", "caller mutation");
  expect(canonicalize(first)).toBe(before);
});

// A local fact edit changes only its by→via chain. Clear reselects its default,
// or leaves explicit undetermined state when the declaration has no default.
test("fact selector edits and clear update only their dependent basis at the same key", () => {
  const f = fixture(), first = written(prepareDraftEdit({ ...f, current: null, patch: { label: "kept words", on: "clear me" } }));
  const chosen = fact(4), changed = written(prepareDraftEdit({ ...f, current: first, patch: { cause: chosen } }));
  expect(changed.act.fields["cause"]).toEqual(chosen);
  expect(changed.act.expected).toEqual(Object.fromEntries([["on", 1], ["target", 10], ["__proto__", 11], ["fixed", 8]]));
  expect(changed.capture["fixed"]).toEqual(first.capture["fixed"]);
  expect(changed.key).toBe(first.key);
  const refreshed = [f.row(0, "anchor", 30), f.row(3, "target", 31, 7), f.row(7, "target", 32)];
  const cleared = written(prepareDraftClear({ ...f, rows: refreshed, current: changed, names: ["cause", "on", "cause"] }));
  expect(cleared.act.fields).toEqual({ label: "kept words" });
  expect(cleared.act.expected).toEqual(Object.fromEntries([["on", 1], ["target", 31], ["__proto__", 32], ["fixed", 8]]));
  expect(cleared.key).toBe(first.key);
  const empty = written(prepareDraftClear({ ...f, rows: refreshed, current: cleared, names: ["label"] }));
  expect(empty.act.fields).toEqual({});
  expect(empty.key).toBe(first.key);
  expect(empty.act.expected).toEqual(cleared.act.expected);
  const noDefault = fixture(false), supplied = written(prepareDraftEdit({ ...noDefault, current: null, patch: { cause: fact(4) } }));
  const undetermined = written(prepareDraftClear({ ...noDefault, current: supplied, names: ["cause"] }));
  expect(undetermined.capture["target"]).toEqual({ is: "undetermined" });
  expect(undetermined.capture["__proto__"]).toEqual({ is: "undetermined" });
  expect(undetermined.act.expected).toEqual({ on: 1, fixed: 8 });
  const absent = written(prepareDraftEdit({ ...noDefault, current: undetermined, patch: { cause: fact(9) } }));
  expect(absent.act.fields["cause"]).toEqual(fact(9));
  expect(absent.capture["target"]).toEqual({ is: "absent" });
  expect(absent.capture["__proto__"]).toEqual({ is: "absent" });
  expect(absent.act.expected).toEqual({ on: 1, fixed: 8 });
});

// The kept return basis stays; only next-submit captures follow an explicit
// selector edit. The original expected stays intact.
test("returned edits preserve the return cause and the original basis while changing the prospective chain", () => {
  const f = fixture(), first = written(prepareDraftEdit({ ...f, current: null, patch: { label: "old changed words" } }));
  const now = { name: 0, seen: 20, assumes: [] };
  const returned: StoredDraftReturn = {
    againstCustody: null,
    cause: { by: "exploration", reason: "revision-moved", class: "head" },
    capture: { ...first.capture, on: { is: "derived", ref: now }, target: { is: "absent" },
      ["__proto__"]: { is: "absent" }, fixed: { is: "derived", ref: now } },
    expected: { on: 20, fixed: 20 },
  };
  const current = { ...first, returned }, before = canonicalize(current);
  const edited = written(prepareDraftEdit({ ...f, current, patch: { cause: fact(4), label: "next words" } }));
  expect(edited.act.expected).toEqual(first.act.expected);
  expect(edited.capture).toEqual(first.capture);
  expect(edited.act.fields).toEqual({ cause: fact(4), label: "next words" });
  expect(edited.returned?.expected).toEqual(Object.fromEntries([["on", 20], ["target", 10], ["__proto__", 11], ["fixed", 20]]));
  expect(edited.returned?.cause).toEqual(returned.cause);
  expect(edited.key).toBe(first.key);
  expect(canonicalize(current)).toBe(before);
});

// Rejections leave the caller's complete old row untouched; state cannot turn an
// unknown symbolic name into an ID, and all clear names validate before output.
test("invalid fields and unheld explicit refs produce no replacement or input mutation", () => {
  const f = fixture(), current = written(prepareDraftEdit({ ...f, current: null, patch: { on: "keep", label: "keep" } }));
  const before = canonicalize(current);
  const declared = f.definition.acts["choose"];
  if (!declared) return expect.fail("the TEST declaration must contain choose");
  const supplied = { cause: fact(4), label: "captured words", unknown: undefined };
  const patch = ownDraftPatch(declared, supplied), names = ["label", "on"];
  const clear = ownDraftClearNames(declared, names);
  supplied.label = "caller changed words"; supplied.cause.seq = 9; names.push("spare");
  expect(patch).toEqual({ cause: fact(4), label: "captured words" });
  expect(clear).toEqual(["label", "on"]);
  // Synchronous preflight uses the existing grammar, but keeps authored partial data.
  const preflightDefinition: DeclaredDefinition = { ...f.definition, acts: { ...f.definition.acts, choose: { ...declared,
    fields: { ...declared.fields, lines: { type: "list", max: 2, required: false, of: { type: "record", of: {
      word: { type: "text", max: 32, required: true },
    } } }, missing: { type: "bool", required: true } },
  } } };
  const address = slotFor(preflightDefinition, "choose", { on: f.namedRefs.on });
  const raw = { cause: fact(4), label: "owned detached words", on: "ordinary field", lines: [{ word: "owned nested" }], spare: undefined };
  const ready = ownDraftEditInputs(preflightDefinition, address, raw);
  const clearInput = ["label", "on"], readyClear = ownDraftClearInputs(preflightDefinition, address, clearInput);
  raw.cause.seq = 9; raw.lines[0]!.word = "caller mutation"; Reflect.set(address.on!, "seen", 99); clearInput.push("spare");
  expect(ready.patch).toEqual({ cause: fact(4), label: "owned detached words", on: "ordinary field", lines: [{ word: "owned nested" }] });
  expect(ready.slot.on?.seen).toBe(1);
  expect(readyClear.names).toEqual(["label", "on"]);
  const uncloneableSlot = { ...ready.slot, extra: () => undefined };
  expect(() => ownDraftEditInputs(preflightDefinition, uncloneableSlot, {})).toThrow(ShapeError);
  expect(ownDraftEditInputs(preflightDefinition, ready.slot, { ignored: undefined }).patch).toEqual({});
  expect(() => ownDraftEditInputs(preflightDefinition, ready.slot, { lines: [{ word: 1 }] })).toThrow(ShapeError);
  expect(() => ownDraftEditInputs(preflightDefinition, ready.slot, { label: null })).toThrow(ShapeError);
  expect(() => ownDraftEditInputs(preflightDefinition, ready.slot, { spare: 4 })).toThrow(ShapeError);
  expect(() => ownDraftClearNames(declared, ["label", "spare"])).toThrow(ShapeError);
  expect(() => prepareDraftClear({ ...f, current, names: ["label", "spare"] })).toThrow(ShapeError);
  expect(() => prepareDraftClear({ ...f, current, names: ["label", "unknown"] })).toThrow(ShapeError);
  expect(() => prepareDraftEdit({ ...f, current, patch: { spare: 4 } })).toThrow(ShapeError);
  expect(() => prepareDraftEdit({ ...f, current, patch: { label: null } })).toThrow(ShapeError);
  const original = canonicalize(current.act.fields);
  const noChange = written(prepareDraftEdit({ ...f, current, patch: { label: undefined, unknown: undefined } }));
  expect(canonicalize(noChange.act.fields)).toBe(original);
  expect(prepareDraftEdit({ ...f, rows: f.rows.filter(row => row.id !== 0), current, patch: {} })).toEqual({ ok: false, stop: "state" });
  const source = { key: "opening", version: digest("b") };
  const symbolic = { name: { output: source }, seen: { after: source }, assumes: [source] };
  expect(prepareDraftEdit({ ...f, current: null, slot: { ...f.slot, on: symbolic.name },
    namedRefs: { on: symbolic, fields: {} }, patch: {} })).toEqual({ ok: false, stop: "state" });
  expect(canonicalize(current)).toBe(before);
});
