/** Supplied row/fact data tests the pure selection boundary only. No
 * journal, signature, proof, authority, scope, native validator or I/O runs. */
import { expect, test } from "vitest";
import type { ActType, FactRef, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, textDigest } from "@generalbusiness/dap-bytes";
import { selectDraftSubjects, type DraftSelectionRow } from "../src/draft-selection.ts";
import { UnavailableActSource } from "../src/act-symbols.ts";
import { selection } from "./support/c4-selection.ts";

// These well-shaped names/hashes are TEST data, not accepted genesis or proof.
const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: `sha256:${"a".repeat(64)}` };
const cause: FactRef = { at: scope, seq: 2, hash: `sha256:${"b".repeat(64)}` };
const rows: DraftSelectionRow[] = [
  { id: 0, type: "anchor", revision: 3, refs: {}, values: { target: 2 } },
  { id: 2, type: "target", revision: 7, refs: {}, values: { n: 1 } },
];

// Invariant: partial fields use the same identity/default/local-fact
// selection without becoming a complete act or replacing authored values.
test("partial draft selection preserves authored values while resolving defaults and full local identity", () => {
  // Required label is absent, but this is still enough data to select a via.
  const via = selectDraftSubjects({ declaration: selection.acts.touch, scope, rows,
    values: { on: 0, fields: {} } });
  expect(via.on).toBe(0);
  expect(via.names).toEqual(["on", "target"]);
  expect(via.selected).toEqual({ on: 0, target: 2 });
  expect(via.effectiveFields).toEqual({});

  const declared: ActType = { ...selection.acts.touch,
    also: { target: { item: "target", by: "cause" } }, effects: [],
    fields: { cause: { type: "fact", under: selection.name, kind: ["make-target"], required: false, default: cause },
      text: { type: "text", max: 64, detached: true, required: true } },
  };
  const authored = { on: 0, fields: { cause, text: "literal author text" } };
  const before = canonicalize({ declared, rows, authored });
  const local = selectDraftSubjects({ declaration: declared, scope, rows, values: authored });
  expect(local.selected).toEqual({ on: 0, target: 2 });
  expect(local.effectiveFields["cause"]).toBe(2);
  expect(local.effectiveFields["text"]).toBe(textDigest("literal author text"));
  expect(canonicalize({ declared, rows, authored })).toBe(before);
  expect(authored.fields.cause).toEqual(cause);
  expect(authored.fields.text).toBe("literal author text");

  const absent = { on: 0, fields: {} };
  const defaulted = selectDraftSubjects({ declaration: declared, scope, rows, values: absent });
  expect(defaulted.selected).toEqual({ on: 0, target: 2 });
  expect(defaulted.effectiveFields["cause"]).toBe(2);
  expect(Object.hasOwn(defaulted.effectiveFields, "text")).toBe(false);
  expect(absent.fields).toEqual({});

  const otherGenesis: FactRef = { ...cause, at: { ...scope, genesis: `sha256:${"c".repeat(64)}` } };
  const foreign = selectDraftSubjects({ declaration: declared, scope, rows,
    values: { on: 0, fields: { cause: otherGenesis } } });
  expect(foreign.names).toEqual(["on", "target"]);
  expect(foreign.selected).toEqual({ on: 0 });
  expect(foreign.effectiveFields["cause"]).toEqual(otherGenesis);
  expect(() => selectDraftSubjects({ declaration: selection.acts.touch, scope, rows,
    values: { on: { output: { key: "not-held", version: `sha256:${"d".repeat(64)}` } }, fields: {} } }))
    .toThrow(UnavailableActSource);
});
