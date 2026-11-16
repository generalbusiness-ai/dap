/** TEST model for the general `now`: a mutable table of rows, an independent oracle of what the scope would expect, and
 * stored drafts built from that oracle. The oracle reads rows by hand. It never calls `draftNowOf`, `selectDraftSubjects`
 * or `expectedOf`, so a disagreement with the pure pieces is a real finding. No journal, signature or scope runs. */
import type { Digest, ScopeRef } from "@generalbusiness/dap-contract";
import { actDescriptorDigest, canonicalize, definitionDigest } from "@generalbusiness/dap-bytes";
import { keys } from "@generalbusiness/dap-derive/testing";
import type { ActRef, Revision } from "../../src/act-types.ts";
import type { DraftSelectionRow } from "../../src/draft-selection.ts";
import { refineDraft, type DraftBinding, type DraftCapture, type StoredDraft } from "../../src/draft-store.ts";
import { selection } from "./c4-selection.ts";

export const digest = (hex: string): Digest => `sha256:${hex.repeat(64)}`;
export const scope: ScopeRef = { scope: `sc_${"a".repeat(52)}`, genesis: digest("a") };
export const definition = selection;
export const binding: DraftBinding = { owner: keys.rita.key, scope, definition: definitionDigest(definition),
  descriptors: Object.fromEntries(Object.keys(definition.acts).map(kind => [kind, actDescriptorDigest(definition, kind)])) };
/** The stored fields that the binding admits for one act: the binding without its lookup, and the digest of that act. */
export const boundAct = (kind: string) => ({ owner: binding.owner, scope: binding.scope, definition: binding.definition, descriptor: binding.descriptors[kind]! });

/** Anchor 0 points at target 2 or 3, or at none. Targets 2 and 3 exist for the whole run: a final row stays in the replica. */
export type World = { rows: DraftSelectionRow[] };
export function world(pointer: number | null = 2): World {
  return { rows: [
    { id: 0, type: "anchor", revision: 1, refs: {}, values: { target: pointer } },
    { id: 2, type: "target", revision: 1, refs: {}, values: { n: 1 } },
    { id: 3, type: "target", revision: 1, refs: {}, values: { n: 2 } },
  ] };
}
const rowOf = (w: World, id: number): DraftSelectionRow => {
  const row = w.rows.find(candidate => candidate.id === id);
  if (!row) throw new Error(`model row ${id} is missing`);
  return row;
};
const replace = (w: World, id: number, change: (row: DraftSelectionRow) => DraftSelectionRow): void => {
  w.rows = w.rows.map(row => row.id === id ? change(row) : row);
};
/** The three moves of a row. Each raises a revision, as the scope's fold does. */
export function bump(w: World, id: number): void { replace(w, id, row => ({ ...row, revision: row.revision + 1 })); }
export function repoint(w: World, pointer: number | null): void {
  replace(w, 0, row => ({ ...row, revision: row.revision + 1, values: { ...row.values, target: pointer } }));
}

export type ModelKind = "touch" | "revise-target";
/** What the scope will expect for this act at these rows. */
export function truth(w: World, kind: ModelKind, on: number): Record<string, Revision> {
  if (kind === "revise-target") return { on: rowOf(w, on).revision };
  const anchor = rowOf(w, 0), pointed = anchor.values["target"];
  return { on: anchor.revision, ...(typeof pointed === "number" ? { target: rowOf(w, pointed).revision } : {}) };
}
/** The scope's judgment of a signed `expected`: equal to the truth, or `revision-moved`. */
export function judge(expected: Readonly<Record<string, Revision>>, current: Readonly<Record<string, Revision>>): "accepted" | "revision-moved" {
  return canonicalize(Object.entries(expected).sort()) === canonicalize(Object.entries(current).sort()) ? "accepted" : "revision-moved";
}

const refAt = (w: World, id: number): ActRef => ({ name: id, seen: rowOf(w, id).revision, assumes: [] });
/** A stored draft whose basis is the world as it stands now. `touch` is on the anchor, `revise-target` on a target. */
export function draftAt(w: World, kind: ModelKind, on: number, key: string): StoredDraft {
  const base = truth(w, kind, on);
  const primary = refAt(w, on);
  const pointed = rowOf(w, 0).values["target"];
  const capture: Record<string, DraftCapture> = { on: { is: "ref", ref: primary } };
  if (kind === "touch") capture["target"] = typeof pointed === "number" ? { is: "derived", ref: refAt(w, pointed) } : { is: "absent" };
  return refineDraft({ ...boundAct(kind), is: "draft", key, slot: { kind, on, items: {} },
    act: { kind, on, fields: kind === "touch" ? { label: "words" } : { n: 1 }, expected: base },
    capture, namedRefs: { on: primary, fields: {} }, placement: "slot" }, binding, definition);
}
