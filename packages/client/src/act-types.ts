/** Pure act values and the stated inputs of exploration. None authorizes a send. */
import type { DeclaredDefinition, Digest, Effect, FactRef, FieldValue, Head, Item, KeyId, RefusalReason, ScopeRef, Timestamp, UnavailableReason } from "@generalbusiness/dap-contract";
import type { RefusalClass } from "@generalbusiness/dap-bytes";
import type { Kind, ValueOf } from "./declared.ts";

/** One version of a step, within the same scope and owner. */
export interface Source { readonly key: string; readonly version: Digest }
export type ItemName = number | { readonly output: Source };
export type Revision = number | { readonly after: Source };
export interface SymbolicEntry { readonly entry: Source }

type ActValue<T> = T extends { type: "item" } ? ItemName
  : T extends { type: "list"; of: infer E } ? readonly ActValue<E>[]
  : T extends { type: "record"; of: infer M } ? ActMembers<M>
  : ValueOf<T>;
type ActMembers<M> =
  { readonly [N in keyof M as M[N] extends { required: true } ? N : never]: ActValue<M[N]> }
  & { readonly [N in keyof M as M[N] extends { required: true } ? never : N]?: ActValue<M[N]> };
export type ActFields<D extends DeclaredDefinition, K extends Kind<D>> = ActMembers<D["acts"][K]["fields"]>;

/** Meaning and basis only: no actor, address, request key, deadline or signature. */
export interface Act<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly kind: K;
  readonly on: ItemName | null;
  readonly fields: ActFields<D, K>;
  readonly expected?: Readonly<Record<string, Revision>>;
}

/** Every observed subject has a basis before an authorization retains the act. */
export type BoundAct<D extends DeclaredDefinition, K extends Kind<D>> =
  Omit<Act<D, K>, "expected"> & { readonly expected: Readonly<Record<string, Revision>> };

/** A missing field stays missing; no partial judgment supplies consequences. */
export type PartialAct<D extends DeclaredDefinition, K extends Kind<D>> =
  Omit<Partial<Act<D, K>>, "fields"> & { readonly fields?: Partial<ActFields<D, K>> };

/** The recorded cut and explicit inputs of one exploration, including pending sources in order. */
export interface Context {
  readonly scope: ScopeRef;
  readonly definition: Digest;
  readonly head: Head;
  readonly assumes: readonly Source[];
  readonly actor: KeyId;
  readonly standing: readonly FactRef[] | null;
  readonly clock: Timestamp;
  readonly evidence: readonly Digest[];
}

/** An unavailable exploration can lack a recorded scope altogether. */
export type UnavailableContext = Omit<Context, "head"> & { readonly head: null };

type ReasonOf<G> = "reason" extends keyof G ? Extract<G["reason"], string> : never;
type GuardNames<G> = G extends readonly (infer E)[] ? GuardNames<E>
  : string extends ReasonOf<G> ? string
  : ReasonOf<G>
    | (G extends { anyOf: infer A } ? GuardNames<A> : never)
    | (G extends { each: { guards: infer A } } ? GuardNames<A> : never)
    | (G extends { has: { guards: infer A } } ? GuardNames<A> : never);

/** Literal refusal names declared by this act's guards, including nested guards. */
export type Named<D extends DeclaredDefinition, K extends Kind<D>> = GuardNames<D["acts"][K]["guards"]>;

export interface IncompleteExploration<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly is: "incomplete";
  readonly act: PartialAct<D, K>;
  readonly missing: readonly string[];
}

export interface ActRef {
  readonly name: ItemName;
  readonly seen: Revision;
  readonly assumes: readonly Source[];
}

type ItemType<D extends DeclaredDefinition> = keyof D["items"] & string;
type ProjectedValue<T> = T extends { type: "item" } ? ItemName
  : T extends { type: "fact" } ? number | FactRef | SymbolicEntry
  : T extends { type: "list"; of: infer E } ? readonly ProjectedValue<E>[]
  : T extends { type: "record"; of: infer M } ? ProjectedMembers<M>
  : ValueOf<T>;
type ProjectedMembers<M> =
  { readonly [N in keyof M as M[N] extends { required: true } ? N : never]: ProjectedValue<M[N]> }
  & { readonly [N in keyof M as M[N] extends { required: true } ? never : N]?: ProjectedValue<M[N]> };
type SlotValues<V> = { readonly [S in keyof V]: (V[S] extends { of: infer F } ? ProjectedValue<F> : FieldValue) | null };
type SlotRefs<R> = { readonly [S in keyof R]: (R[S] extends { to: infer T } ? ProjectedValue<T> : FieldValue | SymbolicEntry) | null };
type RecordedSlotValues<V> = { readonly [S in keyof V]: (V[S] extends { of: infer F } ? ValueOf<F> : FieldValue) | null };

/** The recorded item retains its actual numeric identity and revision. */
export type RecordedActRow<D extends DeclaredDefinition, T extends ItemType<D> = ItemType<D>> = {
  [U in T]: Omit<Item, "type" | "values"> & { readonly type: U; readonly values: RecordedSlotValues<D["items"][U]["values"]> }
}[T];

/** Public names replace internal item aliases and speculative revisions. */
export type ActRow<D extends DeclaredDefinition, T extends ItemType<D> = ItemType<D>> = {
  [U in T]: Omit<Item, "id" | "type" | "revision" | "refs" | "values"> & {
    readonly type: U;
    readonly ref: ActRef;
    readonly recorded: RecordedActRow<D, U> | null;
    readonly refs: SlotRefs<D["items"][U]["refs"]>;
    readonly values: SlotValues<D["items"][U]["values"]>;
  }
}[T];

/** A hypothetical view retains the recorded head and names every assumed step. */
export interface ActView<D extends DeclaredDefinition> {
  readonly head: Head;
  readonly assumes: readonly Source[];
  rows<T extends ItemType<D>>(type: T): readonly ActRow<D, T>[];
  row(name: ItemName): ActRow<D> | null;
}

type LocalEffect<E> = E extends { effect: "relation" } ? E
  : E extends { effect: "ref" } ? Omit<E, "item" | "to"> & { readonly item: ItemName; readonly to: FieldValue | ItemName | SymbolicEntry | null }
  : E extends { item: number } ? Omit<E, "item"> & { readonly item: ItemName }
  : E;
export type ActEffect = LocalEffect<Effect>;
export type Lack = UnavailableReason | "intent" | "entry" | "source" | "due";

export type Exploration<D extends DeclaredDefinition, K extends Kind<D>> =
  | IncompleteExploration<D, K>
  | { readonly is: "admitted"; readonly source: Source; readonly act: BoundAct<D, K>; readonly context: Context;
      readonly bound: readonly string[]; readonly effects: readonly ActEffect[]; readonly sends: number;
      readonly opens: ItemName | null; readonly judgesTime: boolean; readonly after: ActView<D> }
  | { readonly is: "refused"; readonly act: BoundAct<D, K>; readonly context: Context; readonly bound: readonly string[];
      readonly reason: RefusalReason; readonly class: RefusalClass;
      /** Capability diagnostics need not appear in the act's declared guard names. */
      readonly name?: Named<D, K> | (string & {}) }
  | { readonly is: "unavailable"; readonly act: Act<D, K>; readonly context: Context | UnavailableContext; readonly lacks: readonly Lack[] };
