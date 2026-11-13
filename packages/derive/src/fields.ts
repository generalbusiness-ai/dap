/**
 * How the fields of an input are read (scope contract, sections 5.2 and
 * 6.2): each field against its declared type, the foreign facts the fields
 * name, the local facts and the local items they name, and the fields of a
 * delivered message. The judges share this, with the one reading of a commit
 * that every judge is given.
 */

import type { CheckedSequence } from "@generalbusiness/dap-bytes";
import { resolveGenesisValue } from "./genesis-values.ts";
import { readJudgmentFacts, verifiedCopy } from "./operand.ts";
import type { Archived, SizeProof } from "@generalbusiness/dap-contract";
import type { ActType, Bounds, Digest, Entry, FactRef, FactUse, FieldRecord, FieldType, FieldValue, Prepared, Request, ScopeKind, ScopeRef, Sealed, SequenceRef } from "@generalbusiness/dap-contract";
import { canonicalBytes, digestBytes, isDigest, isIntent, isEntryOf } from "@generalbusiness/dap-bytes";
import type { Capabilities } from "./capability.ts";
import type { Fetched, RuleInput } from "./guards.ts";
import { markOf, type PlatformRules } from "./marks.ts";
import type { StateView } from "./state.ts";
import type { Clock } from "./time.ts";
import { byteOrder, isFactRef, isObject, isValue, own, same } from "./values.ts";

/**
 * This scope's own sealed entry at a position, or null when it has none
 * there. The runtime reads it from its history inside the commit, and a
 * verifier from the chain it has checked, so the head check covers it
 * (section 6.2, a local fact).
 */
export interface Own {
  (seq: number): Sealed | null;
  /** Actual held local genesis admission; no structural-reference fallback. */
  sequence(): CheckedSequence | null;
  retained?(use: import("@generalbusiness/dap-contract").FactUse): Entry | null;
  positions?(before: number): Iterable<number>;
  sizeProofs?(): readonly SizeProof[];
  archived?(seq: number): Archived | null;
}

/** Actual adjacent local retained row; producer metadata is not hashed. */
export interface OwnRetainedRow {
  readonly kind: "entry";
  readonly digest: Digest;
  readonly bytes: string;
  readonly under?: string;
}
/** A real raw-row port, required only by the retained-use constructor. */
export interface RetainedOwn extends Own {
  retainedRow(content: Digest): OwnRetainedRow | null;
  /** Ruling 4f697a7a: the retained first entry of a foreign sequence, by the scope's association from (scope, genesis). One read. */
  retainedBirth(at: SequenceRef): OwnRetainedRow | null;
}

/**
 * The detached texts at hand for one input, by digest (section 6.2). A
 * number: the text came with the input, its bytes hash to that digest, and
 * it has that many UTF-8 bytes. Null: the bytes are not at hand and are not
 * asked for, as for a text that a tombstone removed since; nothing about
 * them is checked. Undefined: no text came under that digest.
 */
export interface Texts {
  (digest: Digest): number | null | undefined;
  /** Replay may check a conditional refusal while the original size is
   * unknown. This reports no size and is used only for a null reading. */
  redactedOver?(digest: Digest, max: number): boolean;
}

/**
 * The bytes of a snapshot of staged refs that this scope retains under that
 * digest (sections 9.2 and 16.4), or null when it retains none. The reader
 * checks the bytes against the digest itself.
 */
export type Snapshots = (digest: Digest) => string | null;

/** What every judge is given: the one reading of the commit, the bounds, and the retained inputs. */
import type { Counts } from "./binding.ts";

export interface Reading {
  clock: Clock;                         // the one reading of this commit (section 5.3); see `clockOf`
  bounds: Bounds;
  facts: readonly Fetched[];            // body and genesis association checked before the turn; names/authority remain separate
  prepared: readonly Prepared[];        // the rule results of preparation (section 5.2, step 5)
  asked?: RuleInput[] | undefined;      // set by `prepareRules` only
  own?: Own | undefined;                // this scope's own history. Without it an input that names a local fact is not judged
  texts?: Texts | undefined;            // the detached texts that came with the input. Without it an input that names one is not judged
  snapshot?: Snapshots | undefined;     // the snapshots of staged refs that this scope retains (section 16.4). Without it an ancestry record of this scope's own is not judged to fit
  capabilities?: Capabilities | undefined;   // the rules of the capabilities this runtime has code for (section 6.11). Without them a capability form is not judged
  platform?: PlatformRules | undefined;      // the rules of the platform definition that the scope pins (section 6.1). Without them an input of a row with a mark is not judged
  counts?: Counts | undefined;               // what each item still holds of its `decisions` (section 17.2a). Absent: reads the counts from the folded holder
}

/** The shape of section 2.1, which the bytes package guards beside the contract's other fixed records. */
export { isIntent };

/** Each value in a field with the type it must have: the field itself, each element of a list, or each member that a record holds. */
function leaves(type: FieldType, value: FieldValue): [FieldType, FieldValue][] {
  if (type.type === "list") return (value as readonly FieldValue[]).flatMap((v) => leaves(type.of, v));
  if (type.type !== "record") return [[type, value]];
  return Object.entries(type.of).flatMap(([name, of]) => {
    const member = own(value as FieldRecord, name);
    return member === undefined ? [] : leaves(of, member);
  });
}

/** Section 6.2: each field is required or optional, an optional field may have a default, and an unknown field is refused. */
export function readFields(types: ActType["fields"], given: Readonly<Record<string, unknown>>, bounds: Bounds): { ok: true; fields: Record<string, FieldValue> } | { ok: false; detail: string } {
  // Each name is set as an own property, whatever the name is (`own`, in values.ts).
  const fields: [string, FieldValue][] = [];
  for (const name of Object.keys(given)) if (!Object.hasOwn(types, name)) return { ok: false, detail: `${name} is not a field of this act` };
  for (const [name, type] of Object.entries(types)) {
    const value = Object.hasOwn(given, name) ? given[name] : type.default;
    if (value === undefined && type.required) return { ok: false, detail: `${name} is required` };
    if (value === undefined) continue;
    // Section 6.1, place 3: a type that is a mark, in platform data, states no shape. Its rule checks the value, at check 7.
    if (!markOf(type) && !isValue(type, value, bounds)) return { ok: false, detail: `${name} is not a value of its type` };
    fields.push([name, value as FieldValue]);
  }
  return { ok: true, fields: Object.fromEntries(fields) };
}

/** Section 6.2: a fact whose `at` is this scope and incarnation is a local fact. It is not fetched and is not in `uses`. */
export const isLocalFact = (fact: FactRef, at: { scope: ScopeRef["scope"]; genesis: ScopeRef["genesis"] | null } | null | undefined): boolean => !!at && fact.at.scope === at.scope && fact.at.genesis === at.genesis;

/**
 * Every foreign fact the fields name, once each, in the byte order of the
 * field names: what step 1 of section 5.2 fetches before the turn. `fields`
 * are values of their types, as `readFields` returns them. `at` is the scope
 * that judges the input, or null before it has a genesis: a fact that names
 * it is a local fact, and is read from its own history.
 */
export function factsNamed(types: ActType["fields"], fields: Readonly<Record<string, FieldValue>>, at: Pick<ScopeRef, "scope" | "genesis"> | null): FactRef[] {
  const named = new Map<Digest, FactRef>();
  for (const name of Object.keys(fields).sort(byteOrder)) {
    const declared = own(types, name);
    if (!declared) continue;
    for (const [type, value] of leaves(declared, fields[name]!)) if (type.type === "fact" && !isLocalFact(value as FactRef, at) && !named.has((value as FactRef).hash)) named.set((value as FactRef).hash, value as FactRef);
  }
  return [...named.values()];
}

/** Shared by byte selectors and native reference projection. */
export const isDetachedTextField = (type: FieldType | undefined): boolean => !!(type?.type === "text" && type.detached);

/**
 * The digest of each detached text that the given fields name (section
 * 6.2), once each, in the byte order of the field names. `given` is as an
 * intent or a message holds it: a field that is not a digest names none.
 * The validator lets only a field itself be detached: no element and no
 * member is.
 */
export function textsNamed(types: ActType["fields"], given: Readonly<Record<string, unknown>> | null): Digest[] {
  const named = new Set<Digest>();
  for (const name of Object.keys(given ?? {}).sort(byteOrder)) {
    const [type, value] = [own(types, name), given![name]];
    if (isDetachedTextField(type) && isDigest(value)) named.add(value);
  }
  return [...named];
}

/** The facts an act declares that it is presented, as field types, so that they are read as fact fields are (section 6.4). */
export const presentedTypes = (presents: ActType["presents"]): ActType["fields"] =>
  Object.fromEntries(Object.entries(presents ?? {}).map(([name, p]) => [name, { type: "fact", kind: p.kind, under: p.under, required: p.required }]));

/**
 * `fields`: the fields with each local fact in normal form, which is the
 * `seq` of the entry it names. `no-item`, `fact-mismatch` and `bad-field`
 * carry the foreign facts read before them, so an entry that records that
 * refusal records them (section 9.2).
 */
export type Facts =
  | { result: "read"; fields: Record<string, FieldValue>; facts: Map<Digest, Fetched>; uses: FactUse[] }
  | { result: "archived" | "no-item" | "fact-mismatch" | "bad-field"; detail: string; uses: FactUse[] }
  | { result: "unavailable" };

/** The scope that judges an input, its own history, and the texts that came with the input: what tells a local fact from a foreign one, and checks it. */
export interface Local { at: ScopeRef | import("@generalbusiness/dap-contract").GenesisSelfRef; own?: Own | undefined; texts?: Texts | undefined }

/** What a use records of a foreign entry: the entry by fact, and the digest of its canonical bytes (section 9.2). */
export const useOf = (fact: FactRef, entry: Entry, kind: ScopeKind): FactUse => ({ fact, content: digestBytes(canonicalBytes(entry)), kind });

/** True when `entry` is the entry that `fact` names. */
export { isEntryOf, isEntryBodyOf } from "@generalbusiness/dap-bytes";

/**
 * What the fields name: local items, which must exist; foreign facts, which
 * must have been fetched; local facts, which must be this scope's own
 * entries; and detached texts, which must have come with the input. In the
 * byte order of the field names.
 *
 * Section 6.2, a detached text: the scope receives the bytes with the
 * input, and checks them against the digest and the field's `max`. A
 * mismatch is `bad-field`. With no word on the texts, the input is not
 * judged.
 *
 * Section 6.2, a local fact: the scope checks that its own entry at that
 * `seq` has that hash. If it has not, the input is refused `fact-mismatch`.
 * If it has, the value is put in normal form, the `seq`. So a field that
 * names an entry and a slot that was set from `self` by that entry are
 * equal. With no history to read, the input is not judged.
 *
 * Section 6.5: a fact reference is verified whole. Every reference is checked
 * against the fetched entry, by scope, incarnation, position and hash, before
 * anything is deduplicated. So a later reference with the hash of a verified
 * one and another scope or position is not taken for it, and two references
 * that both pass are one reference: the map by hash and the list of uses
 * then hold that fact once.
 */
export function readFacts(view: StateView, types: ActType["fields"], fields: Readonly<Record<string, FieldValue>>, available: readonly Fetched[], local: Local): Facts {
  if (available.some(value => !isEntryOf(value.entry, value.fact, value.sequence))) return { result: "unavailable" };
  const read = readJudgmentFacts(view, types, fields, available.map(verifiedCopy), local);
  return read.result === "read" ? { ...read, facts: new Map([...read.facts].map(([hash, copy]) => [hash, copy.value])) } : read;
}

// ---------------------------------------------------------------- the fields of a message (sections 6.4 and 7.3)

const isSelf = (v: unknown): boolean => isObject(v) && Object.keys(v).length === 1 && v["self"] === true;

/**
 * Section 6.4: in a message `self` is not expanded by the sender. The receiver reads it as the envelope's `from`.
 * Section 6.6: the mark is not a value of any field type. It stands for a fact, so it is read only where the declared
 * type is a fact or a list of them. A record that holds a member named `self` is a record, and a field with no declared type reads none.
 */
function unmarked(value: unknown, from: FactRef, type: FieldType | undefined): unknown {
  value = resolveGenesisValue(type, value, from);
  if (type?.type === "list" && Array.isArray(value)) return value.map((v) => unmarked(v, from, type.of));
  if (type?.type === "record" && isObject(value)) return Object.fromEntries(Object.entries(value).map(([name, member]) => [name, unmarked(member, from, own(type.of, name))]));
  return type?.type === "fact" && isSelf(value) ? from : value;
}

/** The fields of a delivered message, with each `self` read against the declared `types` of its handler. Null when they are not a set of named values. */
export function messageFields(sent: unknown, from: FactRef, types: ActType["fields"]): Record<string, FieldValue> | null {
  return isObject(sent) ? Object.fromEntries(Object.entries(sent).map(([name, v]) => [name, unmarked(v, from, own(types, name)) as FieldValue])) : null;
}

/** The fields a creation request gives the child's genesis act (section 7.2), read against the fields `types` of that act. */
export function creationFields(message: Request | null, from: FactRef, types: ActType["fields"]): Record<string, FieldValue> | null {
  return message && isObject(message.body) ? messageFields(message.body["fields"], from, types) : null;
}

/** A relationship update as its receiver reads it (section 7.3). `item` is the owner's item, by the fact of the entry that opened it. Its detail is read by `messageFields`, against the types of its handler. */
export interface Update { name: string; item: FactRef; state: string }

export function updateOf(message: Request, from: FactRef): Update | null {
  const body = message.body;
  if (message.type !== "relate" || !isObject(body) || typeof body["name"] !== "string" || typeof body["state"] !== "string") return null;
  const item = isSelf(body["item"]) ? from : body["item"];
  // The owner names its own item: the entry it is writing, or an earlier entry of its own history.
  if (!isObject(body["detail"]) || !isFactRef(item) || !same(item.at, from.at)) return null;
  return { name: body["name"], item, state: body["state"] };
}
