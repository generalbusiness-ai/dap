/** Internal draft batches. Structure is not authority, freshness, or a complete act. */
import type { DeclaredDefinition, Digest, KeyId, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, isDigest, isKeyId, isLocalId, isRecord, isScopeRef, parseStrict, same, wellFormed } from "@generalbusiness/dap-bytes";
import { expectedKeys } from "@generalbusiness/dap-derive";
import type { ActRef, ItemName, Revision, Source } from "./act-types.ts";
import { AuthorizationError } from "./authorization.ts";
import { validKey, type DeliveryOccurrence } from "./custody.ts";
import { readDeliveryOccurrence } from "./custody-occurrence.ts";
import { ShapeError, shapeFieldsOf, type ShapeField } from "./declared-shape.ts";
import { lowerActNames } from "./act-symbols.ts";
import type { DraftSelection } from "./replica-explore.ts";

export interface DraftNamespace { readonly owner: KeyId; readonly scope: ScopeRef }
export interface DraftBinding extends DraftNamespace { readonly definition: Digest; readonly descriptor: Digest }
export interface DraftSlot { readonly kind: string; readonly on: ItemName | null; readonly items: Readonly<Record<string, ItemName>> }
export interface StoredDraftAct {
  readonly kind: string; readonly on: ItemName | null;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly expected: Readonly<Record<string, Revision>>;
}
export type DraftCapture = { readonly is: "ref" | "derived"; readonly ref: ActRef }
  | { readonly is: "absent" | "undetermined" };
/** Only an actual moved-basis exploration writes return metadata. Request causes stay in custody and projection.
 * The return keeps its basis and cause. The view recomputes the movement and `now` from the replica's rows. */
export type DraftReturnCause = { readonly by: "exploration"; readonly reason: "revision-moved"; readonly class: "head" };
export interface StoredDraftReturn {
  readonly cause: DraftReturnCause;
  readonly expected: Readonly<Record<string, Revision>>;
  readonly capture: Readonly<Record<string, DraftCapture>>;
  readonly againstCustody: DeliveryOccurrence | null;
}
interface DraftCommon extends DraftBinding { readonly key: string; readonly slot: DraftSlot }
export interface StoredDraft extends DraftCommon {
  readonly is: "draft"; readonly act: StoredDraftAct;
  readonly capture: Readonly<Record<string, DraftCapture>>;
  /** Paths stay distinct: a field named on cannot collide with the primary input. */
  readonly namedRefs: { readonly on: ActRef | null; readonly fields: Readonly<Record<string, ActRef>> };
  readonly placement: "slot" | "waiting";
  readonly after?: string; readonly returned?: StoredDraftReturn;
}
export interface DraftDismissal extends DraftCommon { readonly is: "dismissed" }
export type StoredDraftEntry = StoredDraft | DraftDismissal;
/** The caller owns custody's existing exclusive fence. Raw operations acquire no lock. */
export interface DraftPort {
  read(owner: KeyId, scope: ScopeRef): Promise<readonly StoredDraftEntry[]>;
  write(owner: KeyId, scope: ScopeRef, entries: readonly StoredDraftEntry[]): Promise<void>;
  observe(changed: () => void): () => void;
}

function bad(): never { throw new ShapeError("drafts", "has malformed stored data"); }
const object = (value: unknown): Record<string, unknown> => isRecord(value) ? value : bad();
function exact(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  const row = object(value);
  if (!required.every(name => Object.hasOwn(row, name)) || Object.keys(row).some(name => !required.includes(name) && !optional.includes(name))) bad();
  return row;
}
const text = (value: unknown): string => typeof value === "string" && wellFormed(value) ? value : bad();
const key = (value: unknown): string => typeof value === "string" && validKey(value) ? value : bad();
const digest = (value: unknown): Digest => isDigest(value) ? value : bad();
const list = <T>(value: unknown, read: (member: unknown) => T): T[] => Array.isArray(value) ? value.map(read) : bad();
const named = <T>(value: unknown, read: (member: unknown) => T): Record<string, T> =>
  Object.fromEntries(Object.entries(object(value)).map(([name, member]): [string, T] => [text(name), read(member)]));
function owned(value: unknown): unknown { try { return parseStrict(canonicalize(value)); } catch { return bad(); } }
function namespace(value: unknown): DraftNamespace {
  const row = exact(owned(value), ["owner", "scope"]);
  if (!isKeyId(row["owner"]) || !isScopeRef(row["scope"])) return bad();
  return { owner: row["owner"], scope: row["scope"] };
}
function source(value: unknown): Source {
  const row = exact(value, ["key", "version"]);
  return { key: key(row["key"]), version: digest(row["version"]) };
}
function item(value: unknown): ItemName {
  if (isLocalId(value)) return value;
  return { output: source(exact(value, ["output"])["output"]) };
}
function revision(value: unknown): Revision {
  if (isLocalId(value)) return value;
  return { after: source(exact(value, ["after"])["after"]) };
}
function ref(value: unknown): ActRef {
  const row = exact(value, ["name", "seen", "assumes"]);
  return { name: item(row["name"]), seen: revision(row["seen"]), assumes: list(row["assumes"], source) };
}
/** Internal slot/storage reader. Copies are values; no identity or private cut is required. */
export function readDraftRef(value: unknown): ActRef { return ref(owned(value)); }
/** Internal slot reader for a closed `now` value. Copies are values. */
export function readDraftSlot(value: unknown): DraftSlot { return slot(owned(value)); }
function slot(value: unknown): DraftSlot {
  const row = exact(value, ["kind", "on", "items"]), kind = text(row["kind"]);
  if (kind === "") return bad();
  return { kind, on: row["on"] === null ? null : item(row["on"]), items: named(row["items"], item) };
}
function capture(value: unknown): DraftCapture {
  const tag = object(value)["is"];
  if (tag === "ref" || tag === "derived") return { is: tag, ref: ref(exact(value, ["is", "ref"])["ref"]) };
  if (tag !== "absent" && tag !== "undetermined") return bad();
  exact(value, ["is"]); return { is: tag };
}
function captures(expected: Readonly<Record<string, Revision>>, captured: Readonly<Record<string, DraftCapture>>): void {
  for (const name of Object.keys(expected)) if (!Object.hasOwn(captured, name)) bad();
  for (const [name, held] of Object.entries(captured)) {
    if ("ref" in held) {
      if (!Object.hasOwn(expected, name) || !same(expected[name], held.ref.seen)) bad();
    } else if (Object.hasOwn(expected, name)) bad();
  }
}
function cause(value: unknown): DraftReturnCause {
  const row = exact(value, ["by", "reason", "class"]);
  if (row["by"] !== "exploration" || row["reason"] !== "revision-moved" || row["class"] !== "head") return bad();
  return { by: "exploration", reason: "revision-moved", class: "head" };
}
function selection(value: unknown): DraftSelection {
  if (object(value)["is"] === "present") return { is: "present", ref: ref(exact(value, ["is", "ref"])["ref"]) };
  if (exact(value, ["is"])["is"] !== "absent") return bad();
  return { is: "absent" };
}
/** Internal selection reader for a closed `now` value. Copies are values. */
export function readDraftSelection(value: unknown): DraftSelection { return selection(owned(value)); }
function occurrence(value: unknown): DeliveryOccurrence | null {
  if (value === null) return null;
  try { return readDeliveryOccurrence(value); }
  catch (error) { if (error instanceof TypeError) return bad(); throw error; }
}
function returned(value: unknown): StoredDraftReturn {
  const row = exact(value, ["cause", "expected", "capture", "againstCustody"]);
  const result = { cause: cause(row["cause"]),
    expected: named(row["expected"], revision), capture: named(row["capture"], capture), againstCustody: occurrence(row["againstCustody"]) };
  captures(result.expected, result.capture); return result;
}

/** Admit the complete batch, without current-row reads or repairing an omitted basis. */
export function readStoredDrafts(value: unknown, wanted: DraftNamespace): readonly StoredDraftEntry[] {
  const who = namespace({ owner: wanted.owner, scope: wanted.scope }), entries = list(owned(value), value => {
    const tag = object(value)["is"];
    if (tag !== "draft" && tag !== "dismissed") return bad();
    const common = ["is", "key", "owner", "scope", "definition", "descriptor", "slot"];
    const row = tag === "draft" ? exact(value, [...common, "act", "capture", "namedRefs", "placement"], ["after", "returned"]) : exact(value, common);
    const actual = namespace({ owner: row["owner"], scope: row["scope"] });
    if (actual.owner !== who.owner || !same(actual.scope, who.scope)) return bad();
    const base = { ...actual, key: key(row["key"]), definition: digest(row["definition"]), descriptor: digest(row["descriptor"]), slot: slot(row["slot"]) };
    if (tag === "dismissed") return { ...base, is: "dismissed" } satisfies DraftDismissal;
    const rawAct = exact(row["act"], ["kind", "on", "fields", "expected"]), refs = exact(row["namedRefs"], ["on", "fields"]);
    const act: StoredDraftAct = { kind: text(rawAct["kind"]), on: rawAct["on"] === null ? null : item(rawAct["on"]),
      fields: named(rawAct["fields"], member => member), expected: named(rawAct["expected"], revision) };
    const captured = named(row["capture"], capture), placement = row["placement"];
    if (placement !== "slot" && placement !== "waiting" || act.kind !== base.slot.kind || !same(act.on, base.slot.on)) return bad();
    captures(act.expected, captured);
    const namedRefs = { on: refs["on"] === null ? null : ref(refs["on"]), fields: named(refs["fields"], ref) };
    if (namedRefs.on !== null && !same(namedRefs.on.name, base.slot.on)) bad();
    if (!same(Object.keys(namedRefs.fields).sort(), Object.keys(base.slot.items).sort())) bad();
    for (const [name, held] of Object.entries(namedRefs.fields)) {
      if (!same(held.name, base.slot.items[name]) || !Object.hasOwn(act.fields, name) || !same(act.fields[name], held.name)) bad();
    }
    const after = Object.hasOwn(row, "after") ? key(row["after"]) : undefined;
    if (after === base.key) return bad();
    const heldReturn = Object.hasOwn(row, "returned") ? returned(row["returned"]) : undefined;
    const held = heldReturn?.againstCustody;
    if (held) {
      if (held.identity.key !== base.key || held.identity.signer !== base.owner || !isScopeRef(held.identity.target)
        || !same(held.identity.target, base.scope)) return bad();
      const authorization = held.authorization;
      if (authorization && (authorization.identity.key !== base.key || authorization.identity.owner !== base.owner
        || !same(authorization.identity.scope, base.scope))) return bad();
    }
    return { ...base, is: "draft", act, capture: captured, namedRefs, placement,
      ...(after === undefined ? {} : { after }),
      ...(heldReturn === undefined ? {} : { returned: heldReturn }) } satisfies StoredDraft;
  });
  const keys = new Set<string>(), occupied = new Set<string>();
  for (const entry of entries) {
    if (keys.has(entry.key)) bad(); keys.add(entry.key);
    if (entry.is === "draft" && entry.placement === "slot") {
      const address = canonicalize(entry.slot); if (occupied.has(address)) bad(); occupied.add(address);
    }
  }
  return entries;
}

/** Strictly parse original storage text before duplicate JSON names can disappear. */
export function readStoredDraftText(text: string, wanted: DraftNamespace): readonly StoredDraftEntry[] {
  let value: unknown; try { value = parseStrict(text); } catch { return bad(); }
  return readStoredDrafts(value, wanted);
}

/** Validate present fields only. This returns no false generic complete/typed act. */
export function refineDraft(value: StoredDraft, binding: DraftBinding, definition: DeclaredDefinition): StoredDraft {
  const [row] = readStoredDrafts([value], binding);
  if (!row || row.is !== "draft") return bad();
  if (row.definition !== binding.definition || definitionDigest(definition) !== binding.definition) throw new AuthorizationError("definition-mismatch");
  if (row.descriptor !== binding.descriptor) throw new AuthorizationError("descriptor-mismatch");
  const act = Object.hasOwn(definition.acts, row.act.kind) ? definition.acts[row.act.kind] : undefined;
  if (!act || row.act.kind === definition.genesis) return bad();
  const needs = act.step !== "open" && act.on !== null;
  if (needs ? row.act.on === null || row.namedRefs.on === null : row.act.on !== null || row.namedRefs.on !== null) return bad();
  const itemFields = Object.entries(act.fields).filter(([, field]) => field.type === "item");
  const givenItems = itemFields.filter(([name]) => Object.hasOwn(row.act.fields, name)).map(([name]) => name).sort();
  if (!same(givenItems, Object.keys(row.slot.items).sort())
    || itemFields.some(([name, field]) => field.required && !Object.hasOwn(row.act.fields, name))) return bad();
  const names = expectedKeys(act, Object.entries(act.also).filter(([, rule]) => !Object.hasOwn(rule, "code")).map(([name]) => name)).sort();
  const complete = (captured: Readonly<Record<string, DraftCapture>>): void => { if (!same(names, Object.keys(captured).sort())) bad(); };
  complete(row.capture);
  const suppliedRefs = new Map<string, ActRef>();
  const explicit = (name: string, supplied: ActRef): void => {
    suppliedRefs.set(name, supplied);
    const captured = row.capture[name];
    if (!captured || captured.is !== "ref" || !same(captured.ref, supplied)) bad();
  };
  if (act.step === "transition" && row.namedRefs.on) explicit("on", row.namedRefs.on);
  for (const [name, rule] of Object.entries(act.also)) {
    if (!Object.hasOwn(rule, "code") && "by" in rule && Object.hasOwn(row.namedRefs.fields, rule.by)) {
      const supplied = row.namedRefs.fields[rule.by]; if (supplied) explicit(name, supplied);
    }
  }
  for (const [name, captured] of Object.entries(row.capture)) {
    if (captured.is === "ref" && !suppliedRefs.has(name)) bad();
  }
  if (row.returned) {
    complete(row.returned.capture);
    if (act.step === "transition") {
      const primary = row.returned.capture["on"];
      if (!primary || !("ref" in primary) || !same(primary.ref.name, row.slot.on)) bad();
    }
  }
  const fields: Record<string, ShapeField> = Object.fromEntries(Object.keys(row.act.fields).map((name): [string, ShapeField] => {
    const field = Object.hasOwn(act.fields, name) ? act.fields[name] : undefined;
    if (!field) return bad(); return [name, field];
  }));
  const tokens = new Map<string, object>();
  const lowered = lowerActNames(row.act, fields, { item: name => {
    if (typeof name === "number") return name;
    const id = canonicalize(name); let token = tokens.get(id);
    if (!token) { token = Object.freeze({}); tokens.set(id, token); } return token;
  } });
  shapeFieldsOf(fields, lowered.fields, { symbolicItems: new Set(tokens.values()) });
  return row;
}

/** Whole canonical replacement; the owner holds custody's existing exclusive fence. */
export function memoryDrafts(): DraftPort {
  const batches = new Map<string, string>(), observers = new Set<() => void>();
  const address = (who: DraftNamespace): string => canonicalize(who);
  return {
    async read(owner, scope) {
      const who = namespace({ owner, scope }), text = batches.get(address(who));
      return text === undefined ? [] : readStoredDraftText(text, who);
    },
    async write(owner, scope, entries) {
      const who = namespace({ owner, scope }), text = canonicalize(readStoredDrafts(entries, who)), at = address(who);
      batches.set(at, text);
      if (batches.get(at) !== text) throw new ShapeError("drafts", "read back differs");
      for (const changed of [...observers]) { try { changed(); } catch { /* An observer never owns a write. */ } }
    },
    observe(changed) { observers.add(changed); return () => { observers.delete(changed); }; },
  };
}
