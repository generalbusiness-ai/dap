/**
 * What the server checks before it signs: each field against the type its
 * act declares, with a detached text replaced by its digest and kept for
 * `texts`; `@handle` read as a member of the scope's membership; and the
 * revision of each item the act names, from the target's summary (the
 * command line's `expectedOf`). It checks no guard, grant or state: the
 * scope judges those, and checks every field again with its own bounds.
 */

import type { FactRef, FieldValue, Head, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { isFactRef, isHead, isRecord, textDigest } from "@generalbusiness/dap-bytes";
import { FieldShapeError, shapeFieldsOf, validKey, type ShapeFaultCode, type ShapeField, type ShapeFieldType } from "@generalbusiness/dap-client";
import type { ActLike } from "@generalbusiness/dap-client";
import { expectedKeys } from "@generalbusiness/dap-derive";
import { clip } from "./errors.ts";

/** A value that is not of its declared shape. Nothing was signed. */
export class Unshaped extends Error {
  constructor(readonly field: string, readonly what: string, readonly declared: string) { super(`${field} ${what}`); }
}

const declaredOf = (type: ShapeFieldType | null): string => type === null ? "no such field" : type.type === undefined || type.type === "code" ? `the platform type ${type.code}` : type.type;

/**
 * Sets a name a definition chose as an own, enumerable property. A plain assignment would treat `__proto__` as the prototype
 * setter, so a field, a record member, a presented fact or an `also` alias of that lawful name would vanish from the intent.
 */
function put<T>(out: Record<string, T>, name: string, value: T): void {
  Object.defineProperty(out, name, { value, enumerable: true, writable: true, configurable: true });
}

/**
 * A name's value only when it is an own property: an absent name is absent, never what the prototype holds. So an optional
 * field, record member or presented fact named `__proto__`, `constructor` or `toString` that the caller left out stays out, and
 * the scope applies its own default (derive's readFields reads the same way).
 */
function ownValue(record: Readonly<Record<string, unknown>> | undefined, name: string): unknown {
  return record !== undefined && Object.hasOwn(record, name) ? record[name] : undefined;
}

/** Fault data is declaration data, not an input value or a second field check. */
const property = (error: FieldShapeError, key: string): unknown => error.type === null ? undefined : Reflect.get(error.type, key);
const wordsOf = (error: FieldShapeError): string => (property(error, "of") as readonly string[]).join(", ");

/** Preserve MCP's refusal words while Client owns every field check. */
const FIELD_REFUSALS = {
  text: () => "is not a text",
  "text-bytes": (error) => `is longer than ${String(property(error, "max"))} bytes`,
  int: (error) => `is not a whole number from ${String(property(error, "min"))} to ${String(property(error, "max"))}`,
  bool: () => "is not true or false",
  time: () => "is not a time in RFC 3339 UTC with Z",
  enum: (error) => `is not one of ${wordsOf(error)}`,
  member: () => "is not a member: give @handle, or { membership, member }",
  item: () => "is not a local item ID",
  reference: () => "is not a document or entry reference with a bounded optional fragment",
  fact: () => "is not a fact: { at, seq, hash }",
  scope: (error) => `is not a reference to a ${String(property(error, "kind"))} scope: { scope, genesis }`,
  digest: () => "is not a digest: sha256: and 64 hex characters",
  git: () => "is not a Git object ID",
  list: () => "is not a list",
  "list-length": (error) => `has more than ${String(property(error, "max"))} elements`,
  record: () => "is not a record",
  unknown: () => "is not declared",
  required: () => "is required",
  platform: () => "is not a declared field type",
} satisfies Record<ShapeFaultCode, (error: FieldShapeError) => string>;

/** The fields as the intent holds them, and the detached texts that go beside it. */
export function shapeFields(act: ActLike, fields: Readonly<Record<string, unknown>>, texts: readonly string[], membership: ScopeRef | null): { fields: Record<string, FieldValue>; texts: string[] } {
  try {
    // ActLike is the description view of an already admitted declared definition or native platform data, not a wire schema.
    // The Contract union keeps the shared checker exhaustive; this adapter adds no declaration parser or permissive fallback.
    return shapeFieldsOf(act.fields as Readonly<Record<string, ShapeField>>, fields, {
      member: (handle) => membership === null ? null : { membership, member: handle } as MemberRef,
      texts: new Map(texts.map((text) => [textDigest(text), text])),
      platformMarks: true,
    });
  } catch (error) {
    if (!(error instanceof FieldShapeError)) throw error;
    const path = error.segments.map((part, i) => error.code === "unknown" && i === error.segments.length - 1 ? clip(String(part)) : String(part)).join(".");
    throw new Unshaped(path, FIELD_REFUSALS[error.code](error), declaredOf(error.type));
  }
}

/** The facts presented beside the intent, by the names the act declares. */
export function shapePresented(act: ActLike, presented: Readonly<Record<string, unknown>> | undefined): Record<string, FactRef> {
  const declared = act.presents ?? {};
  const out: Record<string, FactRef> = {};
  for (const name of Object.keys(presented ?? {})) if (!Object.hasOwn(declared, name)) throw new Unshaped(`presented.${clip(name)}`, "is not declared", "no such presented fact");
  for (const [name, p] of Object.entries(declared)) {
    const value = ownValue(presented, name);
    if (value === undefined) { if (p.required) throw new Unshaped(`presented.${name}`, "is required", `a fact of kind ${p.kind.join(" or ")}`); continue; }
    if (!isFactRef(value)) throw new Unshaped(`presented.${name}`, "is not a fact: { at, seq, hash }", `a fact of kind ${p.kind.join(" or ")}`);
    put(out, name, value);
  }
  return out;
}

/** Whether the act is on an item: then `on` is required. */
export function needsOn(act: ActLike): boolean {
  return act.step === "transition" || (act.step === "comment" && act.on !== null);
}

/** Copy captured revisions before custody computes the meaning. Omission keeps the existing fresh-read behavior. */
export function shapeAt(given: unknown): Record<string, number> | undefined {
  if (given === undefined) return undefined;
  if (!isRecord(given)) throw new Unshaped("at", "is not an object", "subject names and captured nonnegative safe-integer revisions");
  const out: Record<string, number> = {};
  for (const [name, revision] of Object.entries(given)) {
    if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) {
      throw new Unshaped(`at.${clip(name)}`, "is not a nonnegative safe integer", "the revision displayed for this subject");
    }
    put(out, name, revision);
  }
  return out;
}

/** Check coverage only when building a new envelope; a custody re-report retains its original subjects and revisions. */
export function capturedExpected(at: Record<string, number> | undefined, fresh: Record<string, number>, act?: Pick<ActLike, "step" | "also">): Record<string, number> {
  if (at === undefined) return fresh;
  // A subject the captured display showed may since have left the live summary: a superseded version is final. Its captured
  // revision stays, so the scope refuses the stale act. Only the shared expected-key rule admits a captured name.
  const names = act === undefined ? Object.keys(fresh) : expectedKeys(act,
    Object.entries(act.also).filter(([, rule]) => rule["code"] === undefined).map(([name]) => name));
  const allowed = new Set(names);
  if (Object.keys(fresh).some((name) => !Object.hasOwn(at, name)) || Object.keys(at).some(name => !allowed.has(name))) {
    throw new Unshaped("at", "does not name exactly the act's bound subjects", Object.keys(fresh).sort().join(", ") || "no bound subjects: {}");
  }
  return at;
}


/** The fields of an act that name a value beside the intent, with the domain each states. */
export function valuePlaces(act: ActLike, fields: Readonly<Record<string, FieldValue>>): { name: string; domain: string; digest: string }[] {
  const out: { name: string; domain: string; digest: string }[] = [];
  for (const [name, type] of Object.entries(act.fields)) {
    const value = type["value"];
    const digest = ownValue(fields, name);
    if (type.type === "digest" && isRecord(value) && typeof value["domain"] === "string" && typeof digest === "string") out.push({ name, domain: value["domain"], digest });
  }
  return out;
}

/**
 * The basis a refused result showed, to pass back with `after`. `of` is the idempotencyKey of the refused request. `at` holds
 * exactly the subjects the view bound, by the names `at` takes. The server stores none of it: each result computes it from a
 * fresh read, and the call that carries it checks its shape and identity before anything is signed.
 */
export interface McpNow {
  of: string;
  target: string;
  kind: string;
  /** Null for an act on no item: an open act, or a comment on none. */
  primary: { item: number; revision: number } | null;
  at: Record<string, number>;
  head: Head;
}

const NOW_DECLARED = "the now object that the refused result showed, copied unchanged";
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** The closed reader of `now`. An extra or missing member, or a value of another shape, stops the call before anything is signed. */
export function shapeNow(given: unknown): McpNow {
  if (!isRecord(given)) throw new Unshaped("now", "is not an object", NOW_DECLARED);
  const members = ["of", "target", "kind", "primary", "at", "head"];
  const extra = Object.keys(given).find(name => !members.includes(name));
  if (extra !== undefined) throw new Unshaped(`now.${clip(extra)}`, "is not a member of now", NOW_DECLARED);
  for (const name of members) if (!Object.hasOwn(given, name)) throw new Unshaped(`now.${name}`, "is missing", NOW_DECLARED);
  const { of, target, kind, primary, head } = given as Record<string, unknown>;
  if (typeof of !== "string" || !validKey(of)) throw new Unshaped("now.of", "is not an idempotencyKey", "the key of the refused request");
  if (typeof target !== "string") throw new Unshaped("now.target", "is not a scope ID", "the scope of the refused request");
  if (typeof kind !== "string") throw new Unshaped("now.kind", "is not an act kind", "the kind of the refused request");
  if (!isHead(head)) throw new Unshaped("now.head", "is not a head: { seq, hash }", NOW_DECLARED);
  let on: McpNow["primary"] = null;
  if (primary !== null) {
    if (!isRecord(primary) || Object.keys(primary).length !== 2 || !nonnegative(primary["item"]) || !nonnegative(primary["revision"])) {
      throw new Unshaped("now.primary", "is not null or { item, revision }", "the item the act is on and its revision");
    }
    on = { item: primary["item"], revision: primary["revision"] };
  }
  let at: Record<string, number> | undefined;
  try { at = shapeAt(given["at"]); }
  catch (error) { if (error instanceof Unshaped) throw new Unshaped(`now.${error.field}`, error.what, error.declared); throw error; }
  if (at === undefined) throw new Unshaped("now.at", "is missing", NOW_DECLARED);
  return { of, target, kind, primary: on, at, head };
}

/**
 * The gate of `after` with `now`: the server's step before it builds an envelope. It returns the revisions to sign, or
 * `undefined` for a call that gives neither. Each fault stops the call with `shape` before `signedIntent`:
 * one without the other; `at` beside them; `after` equal to this call's own key; a `now` of another request, scope, kind or
 * item; a name `now.at` binds that the act does not. The scope still judges the revisions: a subject that moved is refused.
 */
export function shapeAfter(args: { after: unknown; now: unknown; at: unknown }, call: { key: string; target: string; kind: string; on: number | null; act: Pick<ActLike, "step" | "also"> }): Record<string, number> | undefined {
  const { after, now } = args;
  if (after === undefined && now === undefined) return undefined;
  if (after === undefined) throw new Unshaped("after", "is required with now", "the idempotencyKey of the refused request");
  if (now === undefined) throw new Unshaped("now", "is required with after", NOW_DECLARED);
  if (typeof after !== "string" || !validKey(after)) throw new Unshaped("after", "is not an idempotencyKey", "the key of the refused request");
  if (args.at !== undefined) throw new Unshaped("at", "is not taken with after and now", "omit at: now carries the captured revisions");
  if (after === call.key) throw new Unshaped("idempotencyKey", "must differ from after", "a new key for this submit; the same key with another meaning conflicts");
  const read = shapeNow(now);
  if (read.of !== after) throw new Unshaped("now.of", "is not the request named by after", `the key ${clip(after)}`);
  if (read.target !== call.target) throw new Unshaped("now.target", "is not this call's target", call.target);
  if (read.kind !== call.kind) throw new Unshaped("now.kind", "is not this call's kind", call.kind);
  if ((read.primary === null) !== (call.on === null) || (read.primary !== null && read.primary.item !== call.on)) {
    throw new Unshaped("now.primary", "does not name the item this call is on", call.on === null ? "null: this act is on no item" : `the item ${call.on}`);
  }
  const allowed = new Set(expectedKeys(call.act, Object.entries(call.act.also).filter(([, rule]) => rule["code"] === undefined).map(([name]) => name)));
  if (Object.keys(read.at).some(name => !allowed.has(name))) {
    throw new Unshaped("now.at", "names a subject that the act does not bind", [...allowed].sort().join(", ") || "no bound subjects: {}");
  }
  if (read.primary !== null && Object.hasOwn(read.at, "on") && read.at["on"] !== read.primary.revision) {
    throw new Unshaped("now.at.on", "is not the revision of now.primary", String(read.primary.revision));
  }
  return read.at;
}

/**
 * The `now` of a result, from one fresh read: the expected revisions that `expectedOf` gives (with the final `via` rows
 * added), the primary's revision and the head of that read. The result carries `now` only when the read holds the revision
 * of every subject of the act. Otherwise it carries `lacks`, the subject that `lackedSubject` names (the client's rule for
 * `draftNowOf`): the primary as `on`, or an `also` subject by its name. The primary's own missing revision always says `on`.
 */
export function nowOf(input: { of: string; target: string; kind: string; on: number | null; primaryRevision: number | undefined; expected: Record<string, number>; head: Head; lacking?: string | null }): { now: McpNow } | { lacks: string } {
  if (input.on !== null && input.primaryRevision === undefined) return { lacks: "on" };
  if (input.lacking !== undefined && input.lacking !== null) return { lacks: input.lacking };
  const at: Record<string, number> = {};
  for (const [name, revision] of Object.entries(input.expected)) put(at, name, revision);
  return { now: { of: input.of, target: input.target, kind: input.kind,
    primary: input.on === null ? null : { item: input.on, revision: input.primaryRevision! }, at, head: structuredClone(input.head) } };
}
