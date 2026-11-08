/** Admitted Native declarations remain opaque to every program interpretation. */
import type { AlsoMark, BindingMark, GrantMark, Mark, MarkMost, OutcomeMark, SendMark, TypeMark } from "@generalbusiness/dap-contract";
import type { Defining, MarkKind } from "../validate/context.ts";
import type { ValidDefinition } from "../validate/index.ts";
import { immutable } from "./model.ts";
import type { ReadValidation } from "./reads.ts";

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
interface Pending { readonly kind: MarkKind; readonly path: string; readonly body: Readonly<object> | null; readonly source: object }
const pending = new WeakMap<Defining, Pending[]>();
const outcomeNames = new WeakMap<Defining, Map<string, object>>();
interface Admitted {
  readonly boundaries: readonly NativeBoundary[];
  readonly sources: WeakMap<object, readonly NativeBoundary[]>;
  readonly origins: WeakMap<object, object>;
  readonly outcomes: Readonly<Record<string, OutcomeMark>>;
}
const admitted = new WeakMap<ValidDefinition, Admitted>();

/** The existing validator calls this at each successful mark branch. */
export function recordNative(d: Defining, kind: MarkKind, path: string, source: object, body: Readonly<object> | null): void {
  const all = pending.get(d) ?? [];
  all.push({ kind, path, source, body }); pending.set(d, all);
}
/** Final admission owns metadata without following a rejected declaration. */
export function bindNative(d: Defining, definition: ValidDefinition, validation: ReadValidation): void {
  const sources = new WeakMap<object, readonly NativeBoundary[]>();
  const origins = new WeakMap<object, object>();
  const boundaries = Object.freeze((pending.get(d) ?? []).map(value => {
    const boundary: NativeBoundary = Object.freeze({ id: Object.freeze({}), validation, kind: value.kind,
      path: value.path, body: value.body, mark: immutable(value.source, origins) as NativeMarks[MarkKind], dependencies: "unknown" });
    sources.set(value.source, Object.freeze([...(sources.get(value.source) ?? []), boundary]));
    return boundary;
  }));
  const outcomes = Object.freeze(Object.fromEntries([...(outcomeNames.get(d) ?? [])].map(([name, source]) => {
    const boundary = sources.get(source)?.find(value => value.kind === "outcome");
    if (!boundary) throw new TypeError("outcome has no admitted Native boundary");
    return [name, boundary.mark as OutcomeMark];
  })));
  admitted.set(definition, { sources, boundaries, origins, outcomes }); pending.delete(d); outcomeNames.delete(d);
}
export const nativeBoundaries = (definition: ValidDefinition): readonly NativeBoundary[] => admitted.get(definition)?.boundaries ?? [];

/** Source identity is checked within the actual validation, never by a digest or path. */
export function nativeMark<K extends MarkKind>(definition: ValidDefinition, source: unknown, kind: K): NativeMarks[K] | null {
  if (typeof source !== "object" || source === null) return null;
  const found = admitted.get(definition);
  const boundary = found?.sources.get(found.origins.get(source) ?? source)?.find(value => value.kind === kind);
  // Aliased sources have distinct occurrence records and the same admitted declaration.
  return boundary ? boundary.mark as NativeMarks[K] : null;
}
export function recordNativeOutcome(d: Defining, name: string, source: object): void {
  const named = outcomeNames.get(d) ?? new Map<string, object>();
  named.set(name, source); outcomeNames.set(d, named);
}
export const nativeOutcomes = (definition: ValidDefinition): Readonly<Record<string, OutcomeMark>> => admitted.get(definition)?.outcomes ?? {};
/** A copied declaration keeps the exact source needed by a captured clause root. */
export const nativeSource = (definition: ValidDefinition, source: object): object => admitted.get(definition)?.origins.get(source) ?? source;
