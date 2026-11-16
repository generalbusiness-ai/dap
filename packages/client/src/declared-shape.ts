/** Private pure declared-input shaping. Public names re-export through declared.ts. */
import type { Beside, DeclaredDefinition, FactRef, FieldType, FieldValue, MemberRef, Timestamp, TypeMark, ValuePlace } from "@generalbusiness/dap-contract";
import { isReference, isDigest, isFactRef, isLocalId, isMemberRef, isRecord, isScopeRef, textDigest, timeMs, utf8, wellFormed } from "@generalbusiness/dap-bytes";

/** A value that is not of the shape its act declares. Nothing was signed. `path` names the field. */
export class ShapeError extends Error {
  override readonly name = "ShapeError";
  constructor(readonly path: string, what: string) { super(`${path} ${what}`); }
}

// ---------------------------------------------------------------- the shape of a value

/** Declared fields and the two platform extensions. A mark is checked only by its platform rule. */
export type ShapeFieldType = FieldType | TypeMark | (Omit<TypeMark, "type"> & { type?: undefined }) | ValuePlace;
export type ShapeField = ShapeFieldType & { required?: boolean };
export type ShapeFaultCode = "text" | "text-bytes" | "int" | "bool" | "time" | "enum" | "member" | "item" | "reference" | "fact" | "scope" | "digest" | "git" | "list" | "list-length" | "record" | "unknown" | "required" | "platform";

/** A consumer can render its own words without checking a field a second time. */
export class FieldShapeError extends ShapeError {
  constructor(readonly code: ShapeFaultCode, readonly segments: readonly (string | number)[], readonly type: ShapeFieldType | null, what: string) {
    super(segments.join("."), what);
  }
}

/** Pure adaptations of the values a caller gives. These options perform no scope read. */
export interface FieldShapeOptions {
  member?: (handle: string) => MemberRef | null;
  texts?: ReadonlyMap<string, string>;
  platformMarks?: true;
  /** Non-signing act validation only. The instance registered these exact owned symbolic item objects. */
  symbolicItems?: ReadonlySet<object>;
}

interface Shaping {
  options: FieldShapeOptions;
  texts: Map<string, string>;
}

const own = <T>(record: Readonly<Record<string, T>> | undefined, name: string): T | undefined => (record !== undefined && Object.hasOwn(record, name) ? record[name] : undefined);

/** One exhaustive declared-field checker, shared by the typed handle and transport adapters. */
function shaped(type: ShapeFieldType, value: unknown, path: readonly (string | number)[], at: Shaping): FieldValue {
  const not = (code: ShapeFaultCode, what: string): never => { throw new FieldShapeError(code, path, type, what); };
  if (type.type === "code" || type.type === undefined) {
    if (at.options.platformMarks) return value as FieldValue;
    return not("platform", "is not a declared field type");
  }
  switch (type.type) {
    case "text": {
      if (typeof value !== "string" || !wellFormed(value)) return not("text", "is not a text");
      // A transport that supplies detached texts may name one by its digest.
      if (type.detached && at.options.texts !== undefined && isDigest(value) && at.texts.has(value)) return value;
      if (utf8(value).length > type.max) return not("text-bytes", `is longer than ${type.max} bytes`);
      if (!type.detached) return value;
      const digest = textDigest(value);
      at.texts.set(digest, value);
      return digest;
    }
    case "int": return typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0) && value >= type.min && value <= type.max ? value : not("int", `is not an integer from ${type.min} to ${type.max}`);
    case "bool": return typeof value === "boolean" ? value : not("bool", "is not true or false");
    case "time": return timeMs(value) !== null ? (value as Timestamp) : not("time", "is not a timestamp");
    case "enum": return typeof value === "string" && type.of.includes(value) ? value : not("enum", `is not one of: ${type.of.join(", ")}`);
    case "member": {
      const found = typeof value === "string" && value.startsWith("@") ? at.options.member?.(value) : null;
      if (found) return found;
      return isMemberRef(value) ? value : not("member", "is not a member reference");
    }
    case "item": return isLocalId(value) ? value : value !== null && typeof value === "object" && at.options.symbolicItems?.has(value)
      ? value as FieldValue : not("item", "is not a local item ID");
    case "fact": return isFactRef(value) ? value : not("fact", "is not a fact reference");
    case "reference": return isReference(value, type.fragment) ? value : not("reference", "is not a document or entry reference with a bounded fragment");
    // A reference names no kind; the declared field fixes it.
    case "scope": return isScopeRef(value) ? value : not("scope", "is not a scope reference");
    case "digest": return isDigest(value) ? value : not("digest", "is not a digest");
    case "commit": case "tree": return typeof value === "string" && /^([0-9a-f]{40}|[0-9a-f]{64})$/.test(value) ? value : not("git", "is not a Git object ID");
    case "list": {
      if (!Array.isArray(value)) return not("list", "is not a list");
      if (value.length > type.max) return not("list-length", `has more than ${type.max} elements`);
      return value.map((element, i) => shaped(type.of, element, [...path, i], at));
    }
    case "record": {
      if (!isRecord(value)) return not("record", "is not a record");
      return named(type.of, value, path, at);
    }
  }
  // A new Contract FieldType must stop every consumer, including MCP, here.
  const unhandled: never = type;
  throw new TypeError(`Unsupported field declaration: ${String(unhandled)}`);
}

/** Named values against their declarations: no undeclared name, and every required one. */
function named(types: Readonly<Record<string, ShapeField>>, given: Readonly<Record<string, unknown>>, path: readonly (string | number)[], at: Shaping): Record<string, FieldValue> {
  for (const name of Object.keys(given)) if (own(types, name) === undefined) throw new FieldShapeError("unknown", [...path, name], null, "is not declared");
  const out: [string, FieldValue][] = [];
  for (const [name, type] of Object.entries(types)) {
    const value = own(given, name);
    if (value === undefined && type.required) throw new FieldShapeError("required", [...path, name], type, "is required");
    if (value !== undefined) out.push([name, shaped(type, value, [...path, name], at)]);
  }
  return Object.fromEntries(out);
}

/** Shape fields without signing. Only detached texts named by the result travel beside it. */
export function shapeFieldsOf(types: Readonly<Record<string, ShapeField>>, fields: Readonly<Record<string, unknown>>, options: FieldShapeOptions = {}): { fields: Record<string, FieldValue>; texts: string[] } {
  const at: Shaping = { options, texts: new Map(options.texts) };
  const result = named(types, fields, ["fields"], at);
  const used = new Set<string>();
  const walk = (value: unknown): void => {
    if (typeof value === "string" && at.texts.has(value)) used.add(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (isRecord(value)) Object.values(value).forEach(walk);
  };
  walk(result);
  return { fields: result, texts: [...used].map((digest) => at.texts.get(digest)!) };
}

/** Raw values are not a complete AskedOf. The shared body checks every declared requirement. */
export interface DeclaredValues {
  readonly on?: unknown;
  readonly fields?: Readonly<Record<string, unknown>>;
  readonly presented?: Readonly<Record<string, unknown>>;
}
export interface DeclaredShape {
  readonly on: number | null;
  readonly fields: Record<string, FieldValue>;
  readonly beside: Beside;
}

/** Private whole-input body shared by the typed handle and actual runtime adapters. */
export function shapeDeclaredValues(definition: DeclaredDefinition, kind: string, given: DeclaredValues): DeclaredShape {
  const act = own(definition.acts, kind);
  if (!act || kind === definition.genesis) throw new ShapeError(kind, "is not an act kind that an intent to this scope may name");
  // Section 6.4: an act that opens an item, and a comment on no item, name none. Every other act is on one item.
  const primary = given.on ?? null;
  const needs = act.step !== "open" && act.on !== null;
  let on: number | null;
  if (needs) {
    if (!isLocalId(primary)) throw new ShapeError("on", "is the local ID of the item this act is on");
    on = primary;
  } else {
    if (primary !== null) throw new ShapeError("on", "is not given: this act is on no existing item");
    on = null;
  }
  const at: Shaping = { options: {}, texts: new Map() };
  const fields = named(act.fields, given.fields ?? {}, ["fields"], at);
  const presents = Object.fromEntries(Object.entries(act.presents ?? {}).map(([name, p]) => [name, { type: "fact", kind: p.kind, under: p.under, required: p.required } as const]));
  const presented = named(presents, given.presented ?? {}, ["presented"], at) as Record<string, FactRef>;
  return { on, fields, beside: { ...(at.texts.size > 0 ? { texts: [...at.texts.values()] } : {}), ...(Object.keys(presented).length > 0 ? { presented } : {}) } };
}
