/**
 * What the server checks before it signs: each field against the type its
 * act declares, with a detached text replaced by its digest and kept for
 * `texts`; `@handle` read as a member of the scope's membership; and the
 * revision of each item the act names, from the target's summary (the
 * command line's `expectedOf`). It checks no guard, grant or state: the
 * scope judges those, and checks every field again with its own bounds.
 */

import type { FactRef, FieldValue, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import { isFactRef, isRecord, textDigest } from "@generalbusiness/dap-bytes";
import { FieldShapeError, shapeFieldsOf, type ShapeFaultCode, type ShapeField, type ShapeFieldType } from "@generalbusiness/dap-client";
import type { ActLike } from "./describe.ts";
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
  scope: (error) => `is not a reference to a ${String(property(error, "kind"))} scope: { scope, inc, kind }`,
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
export function capturedExpected(at: Record<string, number> | undefined, fresh: Record<string, number>, act?: Pick<ActLike, "also">): Record<string, number> {
  if (at === undefined) return fresh;
  // A subject the captured display showed may since have left the live summary: a superseded version is final. Its captured
  // revision stays, so the scope refuses the stale act. An `also` name must be one this act binds. For `on`, the scope decides:
  // it requires exactly the keys it reads, and it refuses an extra `on` as `bad-intent`.
  const left = (name: string): boolean => {
    if (act === undefined) return false;
    if (name === "on") return true;
    const rule = ownValue(act.also, name) as { code?: string } | undefined;
    return rule !== undefined && rule.code === undefined;
  };
  if (Object.keys(fresh).some((name) => !Object.hasOwn(at, name)) || Object.keys(at).some((name) => !Object.hasOwn(fresh, name) && !left(name))) {
    throw new Unshaped("at", "does not name exactly the act's bound subjects", Object.keys(fresh).sort().join(", ") || "no bound subjects: {}");
  }
  return at;
}

export { expectedOf, viaLeft, effectiveFields, finalStates } from "@generalbusiness/dap-client";

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
