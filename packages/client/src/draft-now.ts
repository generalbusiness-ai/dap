/** The general `now`: the basis one view of a returned draft renders, and the closed reader for it.
 * Every function here is pure. Nothing reads a clock, a custody record or a port, and nothing writes. */
import type { ActType, DeclaredDefinition, Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, isHead, isRecord, parseStrict, same, wellFormed } from "@generalbusiness/dap-bytes";
import type { ActRef, Revision } from "./act-types.ts";
import { UnavailableActSource } from "./act-symbols.ts";
import { lackedSubject } from "./expected.ts";
import { validKey } from "./custody.ts";
import { ShapeError } from "./declared-shape.ts";
import { selectDraftSubjects, type DraftSelectionRow } from "./draft-selection.ts";
import { readDraftRef, readDraftSelection, readDraftSlot, type DraftSlot, type StoredDraft } from "./draft-store.ts";
import type { DraftMovement, DraftSelection } from "./replica-explore.ts";

/** What one render of a returned draft shows the member, and what the member passes back to submit.
 * `subjects` has one key for each name of `expectedKeys(declaration, nonCodeAlsoNames)`. `absent` means the
 * subject selects no item at the render cut, and adds no key to `expected`. */
export interface DraftNow {
  readonly key: string;
  readonly kind: string;
  /** Names only, as the draft's slot address holds them. */
  readonly address: DraftSlot;
  /** The cut of the render. Submit never compares it. */
  readonly head: Head;
  /** Null only when the act has no primary (`address.on` is null). */
  readonly primary: ActRef | null;
  readonly subjects: Readonly<Record<string, DraftSelection>>;
}

/** A view that holds the rows gives `now`. A view that lacks a row names the subject, or null when no one subject maps to
 * the missing row (an unheld symbolic source). No cut names nothing. */
export type DraftNowView =
  | { readonly is: "now"; readonly now: DraftNow }
  | { readonly is: "lacks"; readonly subject: string | null }
  | { readonly is: "no-cut" };

/** The checked cut of one render: its head and every row it holds, final rows included. */
export interface DraftViewCut {
  readonly head: Head;
  readonly rows: readonly DraftSelectionRow[];
}

export interface DraftNowInput {
  readonly definition: DeclaredDefinition;
  readonly stored: StoredDraft;
  readonly scope: ScopeRef;
  readonly cut: DraftViewCut | null;
}

function bad(path: string, what: string): never { throw new ShapeError(path, what); }

/** Closed reader. A copy of the shown value is valid. Anything else throws `ShapeError` before any await of the caller. */
export function readDraftNow(value: unknown): DraftNow {
  let copy: unknown;
  try { copy = parseStrict(canonicalize(value)); } catch { return bad("now", "must contain plain owned data"); }
  if (!isRecord(copy)) return bad("now", "must be an object");
  const members = ["key", "kind", "address", "head", "primary", "subjects"];
  if (Object.keys(copy).length !== members.length || !members.every(name => Object.hasOwn(copy, name))) {
    return bad("now", "must have exactly key, kind, address, head, primary and subjects");
  }
  try {
    const key = copy["key"], kind = copy["kind"], subjectsValue = copy["subjects"], headValue = copy["head"];
    if (typeof key !== "string" || !validKey(key)) return bad("now.key", "is not a request key");
    if (typeof kind !== "string" || kind === "" || !wellFormed(kind)) return bad("now.kind", "is not an act kind");
    const address = readDraftSlot(copy["address"]);
    if (address.kind !== kind) return bad("now.address", "names another kind");
    if (!isHead(headValue)) return bad("now.head", "is not a head");
    const primary = copy["primary"] === null ? null : readDraftRef(copy["primary"]);
    if ((primary === null) !== (address.on === null)) return bad("now.primary", "must be null exactly when the address has no primary");
    if (primary !== null && !same(primary.name, address.on)) return bad("now.primary", "names another item than the address");
    if (!isRecord(subjectsValue)) return bad("now.subjects", "must be an object");
    const subjects: Record<string, DraftSelection> = Object.fromEntries(
      Object.entries(subjectsValue).map(([name, member]): [string, DraftSelection] => [name, readDraftSelection(member)]));
    if (Object.hasOwn(subjects, "on")) {
      const on = subjects["on"];
      if (primary === null || on?.is !== "present" || !same(on.ref, primary)) return bad("now.subjects.on", "must be the primary");
    }
    return { key, kind, address, head: structuredClone(headValue), primary, subjects };
  } catch (error) {
    if (error instanceof ShapeError && !error.path.startsWith("now")) return bad("now", "is malformed");
    throw error;
  }
}

function declaredAct(definition: DeclaredDefinition, kind: string): ActType {
  const declared = Object.hasOwn(definition.acts, kind) ? definition.acts[kind] : undefined;
  if (!declared || kind === definition.genesis) throw new TypeError("invalid draft now: draft kind is not declared");
  return declared;
}
const subjectOf = (declared: ActType, field: string): string => {
  for (const [name, rule] of Object.entries(declared.also)) {
    if (!("code" in rule) && "by" in rule && rule.by === field) return name;
  }
  return field;
};

/** Pure view computation over the kept draft and the rows one render holds. Recomputed at every view, for form 1 and form 2.
 * A row the cut does not hold gives `lacks`, naming the subject. Edit, clear and dismiss never depend on this answer. */
export function draftNowOf(input: DraftNowInput): DraftNowView {
  const { definition, stored, scope, cut } = input;
  const declared = declaredAct(definition, stored.act.kind);
  if (cut === null) return { is: "no-cut" };
  const rowOf = (name: unknown): DraftSelectionRow | undefined =>
    typeof name === "number" ? cut.rows.find(row => row.id === name) : undefined;
  const refOf = (row: DraftSelectionRow): ActRef => ({ name: row.id, seen: row.revision, assumes: [] });
  const lacks = (subject: string | null): DraftNowView => ({ is: "lacks", subject });
  let primary: ActRef | null = null;
  if (declared.step !== "open" && declared.on !== null) {
    const row = rowOf(stored.act.on);
    if (!row || row.type !== declared.on) return lacks("on");
    primary = refOf(row);
  }
  for (const [name, field] of Object.entries(declared.fields)) {
    if (field.type === "item" && Object.hasOwn(stored.act.fields, name) && rowOf(stored.act.fields[name]) === undefined) {
      return lacks(subjectOf(declared, name));
    }
  }
  let selected: ReturnType<typeof selectDraftSubjects>;
  try {
    selected = selectDraftSubjects({ declaration: declared, scope, rows: cut.rows,
      values: { on: stored.act.on, fields: stored.act.fields } });
  } catch (error) {
    // An unheld symbolic source maps to no one subject: the view lacks a row that the act reads, and names none.
    if (error instanceof UnavailableActSource) return lacks(null);
    throw error;
  }
  // One rule for every adapter (`lackedSubject`): a `by` or `via` subject that names a row the cut does not hold is lacking,
  // never absent. `absent` is left for a selection that is empty in the rows the cut holds.
  const missing = lackedSubject(declared, cut.rows.map(row => ({ ...row, refs: { ...row.values, ...row.refs } })), selected.on, selected.effectiveFields);
  if (missing !== null) return lacks(missing);
  const subjects: Record<string, DraftSelection> = {};
  for (const name of selected.names) {
    const id = Object.hasOwn(selected.selected, name) ? selected.selected[name] : undefined;
    const row = id === undefined ? undefined : rowOf(id);
    if (id !== undefined && !row) return lacks(name);
    Object.defineProperty(subjects, name, { value: row ? { is: "present", ref: refOf(row) } : { is: "absent" },
      enumerable: true, writable: true, configurable: true });
  }
  return { is: "now", now: structuredClone({ key: stored.key, kind: stored.act.kind, address: stored.slot,
    head: cut.head, primary, subjects }) };
}

/** The `expected` that a passed `now` names: each present subject's `seen`. An absent subject adds no key.
 * A comment's primary has no key: the scope never expects it. */
export function nowExpected(now: DraftNow): Record<string, Revision> {
  const expected: Record<string, Revision> = {};
  for (const [name, selected] of Object.entries(now.subjects)) {
    if (selected.is === "present") {
      Object.defineProperty(expected, name, { value: structuredClone(selected.ref.seen), enumerable: true, writable: true, configurable: true });
    }
  }
  return expected;
}

/** The movement view of form 1: the same cut and selections as `now`. */
export function nowMovement(now: DraftNow): DraftMovement {
  return structuredClone({ head: now.head, now: now.primary, subjects: now.subjects });
}
