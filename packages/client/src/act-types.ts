/** Pure act values and the stated inputs of exploration. None authorizes a send. */
import type { DeclaredDefinition, Digest, FactRef, Head, KeyId, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
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
