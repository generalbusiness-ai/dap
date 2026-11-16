/** Pure draft edits. The caller owns the occurrence check, fence, key, and write. */
import type { ActType, DeclaredDefinition } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, parseStrict, same } from "@generalbusiness/dap-bytes";
import type { ActRef, Revision } from "./act-types.ts";
import { UnavailableActSource } from "./act-symbols.ts";
import { ShapeError } from "./declared.ts";
import { selectDraftSubjects, type DraftSelectionRow, type DraftSubjects } from "./draft-selection.ts";
import { readDraftRef, refineDraft, type DraftBinding, type DraftCapture, type DraftSlot, type StoredDraft } from "./draft-store.ts";

interface DraftEditBase {
  readonly binding: DraftBinding;
  readonly definition: DeclaredDefinition;
  readonly rows: readonly DraftSelectionRow[];
}
export interface PrepareDraftEdit extends DraftEditBase {
  readonly slot: DraftSlot;
  readonly namedRefs: StoredDraft["namedRefs"];
  readonly current: StoredDraft | null;
  readonly key: string;
  readonly patch: Readonly<Record<string, unknown>>;
}
export interface PrepareDraftClear extends DraftEditBase {
  readonly current: StoredDraft;
  readonly names: readonly string[];
}
/** Internal state result only. Existing shape/mismatch exceptions keep their types. */
export type DraftEditResult = { readonly ok: true; readonly draft: StoredDraft }
  | { readonly ok: false; readonly stop: "state" };

function bad(path: string, message: string): never { throw new ShapeError(path, message); }
function ownedFields(value: unknown): Record<string, unknown> {
  let result: unknown;
  try { result = parseStrict(canonicalize(value)); }
  catch { return bad("fields", "must contain plain owned data"); }
  return isRecord(result) ? result : bad("fields", "must be an object");
}
function declaration(definition: DeclaredDefinition, kind: string): ActType {
  if (kind === definition.genesis || !Object.hasOwn(definition.acts, kind)) return bad("kind", "must name an ordinary act");
  const declared = definition.acts[kind];
  return declared ?? bad("kind", "must name an ordinary act");
}
function editable(declared: ActType, name: string): void {
  const field = Object.hasOwn(declared.fields, name) ? declared.fields[name] : undefined;
  if (!field || field.type === "item") bad(`fields.${name}`, "is not an editable field");
}
/** Own a patch before the caller waits; own undefined has no edit meaning. */
export function ownDraftPatch(declared: ActType, input: unknown): Record<string, unknown> {
  if (!isRecord(input)) return bad("fields", "must be an object");
  // Own undefined means omitted before strict ownership and unknown-name checks.
  const given = Object.entries(input).filter(([, value]) => value !== undefined);
  for (const [name] of given) editable(declared, name);
  return ownedFields(Object.fromEntries(given));
}
/** Validate every clear name before the caller waits; the returned list is owned. */
export function ownDraftClearNames(declared: ActType, input: unknown): readonly string[] {
  if (!Array.isArray(input)) return bad("fields", "must be a field-name list");
  const names: string[] = [];
  for (const name of input) {
    if (typeof name !== "string") return bad("fields", "must contain declared field names");
    editable(declared, name); names.push(name);
  }
  return names;
}
function expected(capture: Readonly<Record<string, DraftCapture>>): Record<string, Revision> {
  return Object.fromEntries(Object.entries(capture).flatMap(([name, value]): [string, Revision][] =>
    "ref" in value ? [[name, value.ref.seen]] : []));
}
function explicitHeld(declared: ActType, refs: StoredDraft["namedRefs"], rows: readonly DraftSelectionRow[]): boolean {
  if (declared.step !== "open" && declared.on !== null) {
    if (refs.on === null) return bad("on", "requires its supplied ref");
    const supplied = readDraftRef(refs.on);
    if (!rows.some(row => row.id === supplied.name && row.type === declared.on)) return false;
  }
  for (const [name, reference] of Object.entries(refs.fields)) {
    const field = Object.hasOwn(declared.fields, name) ? declared.fields[name] : undefined;
    if (!field || field.type !== "item") return bad(`fields.${name}`, "is not an item address field");
    const supplied = readDraftRef(reference);
    if (!rows.some(row => row.id === supplied.name && row.type === field.of)) return false;
  }
  return true;
}
function suppliedSubjects(declared: ActType, refs: StoredDraft["namedRefs"]): ReadonlyMap<string, ActRef> {
  const result = new Map<string, ActRef>();
  if (declared.step === "transition" && refs.on !== null) result.set("on", readDraftRef(refs.on));
  for (const [name, rule] of Object.entries(declared.also)) {
    if (!("code" in rule) && "by" in rule && Object.hasOwn(refs.fields, rule.by)) {
      const reference = refs.fields[rule.by];
      if (reference) result.set(name, readDraftRef(reference));
    }
  }
  return result;
}
function affected(declared: ActType, changed: ReadonlySet<string>): ReadonlySet<string> {
  const result = new Set<string>();
  for (const [name, rule] of Object.entries(declared.also)) {
    if (!("code" in rule) && "by" in rule && changed.has(rule.by)) result.add(name);
  }
  let added: boolean;
  do {
    added = false;
    for (const [name, rule] of Object.entries(declared.also)) {
      if (!("code" in rule) && "via" in rule && result.has(rule.via.of.replace(/^also\./, "")) && !result.has(name)) {
        result.add(name); added = true;
      }
    }
  } while (added);
  return result;
}
/** Classify missing selection inputs only; expectedOf owns every selected identity. */
function undetermined(declared: ActType, selected: DraftSubjects, name: string, visiting = new Set<string>()): boolean {
  if (Object.hasOwn(selected.selected, name) || name === "on" || visiting.has(name)) return false;
  const rule = Object.hasOwn(declared.also, name) ? declared.also[name] : undefined;
  if (!rule || "code" in rule) return false;
  if ("by" in rule) return !Object.hasOwn(selected.effectiveFields, rule.by);
  if (!("via" in rule)) return false;
  const parent = rule.via.of.replace(/^also\./, "");
  visiting.add(name);
  const missing = undetermined(declared, selected, parent, visiting);
  visiting.delete(name);
  return missing;
}
function captureAt(declared: ActType, selected: DraftSubjects, rows: readonly DraftSelectionRow[], refs: StoredDraft["namedRefs"]): Record<string, DraftCapture> {
  const explicit = suppliedSubjects(declared, refs);
  return Object.fromEntries(selected.names.map((name): [string, DraftCapture] => {
    const supplied = explicit.get(name);
    if (supplied) return [name, { is: "ref", ref: supplied }];
    const id = Object.hasOwn(selected.selected, name) ? selected.selected[name] : undefined;
    const row = id === undefined ? undefined : rows.find(row => row.id === id);
    if (row) return [name, { is: "derived", ref: { name: row.id, seen: row.revision, assumes: [] } }];
    return [name, { is: undetermined(declared, selected, name) ? "undetermined" : "absent" }];
  }));
}
function replaceCaptures(previous: Readonly<Record<string, DraftCapture>>, next: Readonly<Record<string, DraftCapture>>, changed: ReadonlySet<string>): Record<string, DraftCapture> {
  return Object.fromEntries(Object.entries(previous).map(([name, capture]) => {
    const replacement = Object.hasOwn(next, name) ? next[name] : undefined;
    return [name, changed.has(name) && replacement ? replacement : capture];
  }));
}
function prepare(base: DraftEditBase, row: StoredDraft, fields: Readonly<Record<string, unknown>>, first: boolean): DraftEditResult {
  const declared = declaration(base.definition, row.act.kind);
  if (!explicitHeld(declared, row.namedRefs, base.rows)) return { ok: false, stop: "state" };
  let selected: DraftSubjects;
  try {
    selected = selectDraftSubjects({ declaration: declared, scope: base.binding.scope, rows: base.rows,
      values: { on: row.act.on, fields } });
  } catch (error) {
    if (error instanceof UnavailableActSource) return { ok: false, stop: "state" };
    throw error;
  }
  const latest = captureAt(declared, selected, base.rows, row.namedRefs);
  const changed = new Set([...new Set([...Object.keys(row.act.fields), ...Object.keys(fields)])].filter(name =>
    Object.hasOwn(row.act.fields, name) !== Object.hasOwn(fields, name)
      || Object.hasOwn(fields, name) && !same(row.act.fields[name], fields[name])));
  const names = first ? new Set(selected.names) : affected(declared, changed);
  const capture = row.returned ? row.capture : first ? latest : replaceCaptures(row.capture, latest, names);
  const returned = row.returned ? { ...row.returned,
    capture: replaceCaptures(row.returned.capture, latest, names) } : undefined;
  const next: StoredDraft = { ...row, act: { ...row.act, fields, expected: expected(capture) }, capture,
    ...(returned ? { returned: { ...returned, expected: expected(returned.capture) } } : {}) };
  return { ok: true, draft: refineDraft(next, base.binding, base.definition) };
}

/** No store write or key allocation occurs here; all inputs belong to the caller. */
export function prepareDraftEdit(input: PrepareDraftEdit): DraftEditResult {
  const current = input.current === null ? null : refineDraft(input.current, input.binding, input.definition);
  if (current && (current.key !== input.key || !same(current.slot, input.slot))) return bad("slot", "does not match the editing occurrence");
  const declared = declaration(input.definition, input.slot.kind), patch = ownDraftPatch(declared, input.patch);
  const fixed = ownedFields(Object.fromEntries(Object.entries(input.slot.items)));
  const row: StoredDraft = current ?? { ...input.binding, is: "draft", key: input.key, slot: input.slot,
    act: { kind: input.slot.kind, on: input.slot.on, fields: fixed, expected: {} }, capture: {},
    namedRefs: input.namedRefs, placement: "slot" };
  const fields = ownedFields({ ...row.act.fields, ...patch });
  return prepare(input, row, fields, current === null);
}

/** The caller already proved this occurrence is editing; no empty-slot creation. */
export function prepareDraftClear(input: PrepareDraftClear): DraftEditResult {
  const current = refineDraft(input.current, input.binding, input.definition);
  const declared = declaration(input.definition, current.act.kind);
  const names = ownDraftClearNames(declared, input.names), removed = new Set(names);
  const fields = ownedFields(Object.fromEntries(Object.entries(current.act.fields).filter(([name]) => !removed.has(name))));
  return prepare(input, current, fields, false);
}
