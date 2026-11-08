/** Admitted Native declarations remain opaque to every program interpretation. */
import type { AlsoMark, BindingMark, GrantMark, Mark, MarkMost, OutcomeMark, SendMark, TypeMark } from "@generalbusiness/dap-contract";
import type { Defining, MarkKind } from "../validate/context.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { immutable } from "./model.ts";
import type { ReadValidation } from "./reads.ts";
import { declarationSource } from "./declaration.ts";

interface NativeMarks {
  readonly grant: GrantMark;
  readonly also: AlsoMark | BindingMark;
  readonly type: TypeMark;
  readonly guard: Mark;
  readonly effect: Mark & { readonly most?: MarkMost };
  readonly send: SendMark;
  readonly outcome: OutcomeMark;
}
export interface NativeBoundary<K extends MarkKind = MarkKind> {
  readonly id: Readonly<object>;
  readonly validation: ReadValidation;
  readonly kind: K;
  readonly path: string;
  readonly body: Readonly<object> | null;
  readonly mark: NativeMarks[K];
  readonly dependencies: "unknown";
}
interface Pending { readonly id: Readonly<object>; readonly kind: MarkKind; readonly path: string; readonly body: Readonly<object> | null; readonly source: object }
const pending = new WeakMap<Defining, Pending[]>();
const outcomeNames = new WeakMap<Defining, Map<string, object>>();
interface Admitted {
  readonly validation: ReadValidation;
  readonly boundaries: readonly NativeBoundary[];
  readonly sources: WeakMap<object, readonly NativeBoundary[]>;
  readonly identities: WeakMap<object, NativeBoundary>;
  readonly marks: WeakMap<object, NativeBoundary>;
  readonly origins: WeakMap<object, object>;
  readonly outcomes: Readonly<Record<string, OutcomeMark>>;
}
const admitted = new WeakMap<ValidDefinition, Admitted>();

/** The existing validator calls this at each successful mark branch. */
export function recordNative(d: Defining, kind: MarkKind, path: string, source: object, body: Readonly<object> | null): Readonly<object> {
  const all = pending.get(d) ?? [];
  const id = Object.freeze({});
  all.push({ id, kind, path, source, body }); pending.set(d, all); return id;
}
/** Final admission owns metadata without following a rejected declaration. */
export function bindNative(d: Defining, definition: ValidDefinition, validation: ReadValidation): void {
  const sources = new WeakMap<object, readonly NativeBoundary[]>();
  const identities = new WeakMap<object, NativeBoundary>(), marks = new WeakMap<object, NativeBoundary>();
  const origins = new WeakMap<object, object>();
  const boundaries = Object.freeze((pending.get(d) ?? []).map(value => {
    const boundary: NativeBoundary = Object.freeze({ id: value.id, validation, kind: value.kind,
      path: value.path, body: value.body, mark: immutable(value.source, origins) as NativeMarks[MarkKind], dependencies: "unknown" });
    sources.set(value.source, Object.freeze([...(sources.get(value.source) ?? []), boundary]));
    identities.set(boundary.id, boundary); marks.set(boundary.mark, boundary);
    return boundary;
  }));
  const outcomes = Object.freeze(Object.fromEntries([...(outcomeNames.get(d) ?? [])].map(([name, source]) => {
    const boundary = sources.get(source)?.find(value => value.kind === "outcome");
    if (!boundary) throw new TypeError("outcome has no admitted Native boundary");
    return [name, boundary.mark as OutcomeMark];
  })));
  admitted.set(definition, { validation, sources, identities, marks, boundaries, origins, outcomes }); pending.delete(d); outcomeNames.delete(d);
}
export const nativeBoundaries = (definition: ValidDefinition): readonly NativeBoundary[] => admitted.get(definition)?.boundaries ?? [];
export const nativeBoundary = (definition: ValidDefinition, id: Readonly<object>): NativeBoundary | null => admitted.get(definition)?.identities.get(id) ?? null;
export function nativeBoundaryOfMark(definition: ValidDefinition, mark: Mark, kind: MarkKind): NativeBoundary | null {
  const found = admitted.get(definition), direct = found?.marks.get(mark);
  if (direct) return direct.kind === kind ? direct : null;
  const original = found?.origins.get(mark);
  return original ? found!.sources.get(original)?.find(boundary => boundary.kind === kind) ?? null : null;
}
export const nativeValidation = (definition: ValidDefinition): ReadValidation | null => admitted.get(definition)?.validation ?? null;

/** Source identity is checked within the actual validation, never by a digest or path. */
export function nativeMark<K extends MarkKind>(definition: ValidDefinition, source: unknown, kind: K): NativeMarks[K] | null {
  const found = admitted.get(definition);
  if (!found) throw new TypeError("Native lookup has no admitted definition");
  if (typeof source !== "object" || source === null) return null;
  const original = found.origins.get(source) ?? declarationSource(definition, source);
  const boundary = found.sources.get(original)?.find(value => value.kind === kind);
  // Aliased sources have distinct occurrence records and the same admitted declaration.
  if (boundary) return boundary.mark as NativeMarks[K];
  if ("code" in source && typeof source.code === "string" && "row" in source && typeof source.row === "string") {
    throw new TypeError("Native mark was not captured by this validation");
  }
  return null;
}
export function recordNativeOutcome(d: Defining, name: string, source: object): void {
  const named = outcomeNames.get(d) ?? new Map<string, object>();
  named.set(name, source); outcomeNames.set(d, named);
}
export const nativeOutcomes = (definition: ValidDefinition): Readonly<Record<string, OutcomeMark>> => admitted.get(definition)?.outcomes ?? {};
/** A copied declaration keeps the exact source needed by a captured clause root. */
export const nativeSource = (definition: ValidDefinition, source: object): object => admitted.get(definition)?.origins.get(source) ?? source;
