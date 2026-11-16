/** Internal registration only. Package entries expose neither operation nor reader. */
import type { DeclaredDefinition, Digest, Head, KeyId, MemberRef, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import type { Kind } from "./declared.ts";
import type { ActRef, Exploration, Lack, PartialAct } from "./act-types.ts";
import type { Replica } from "./replica.ts";
import type { Session } from "./session.ts";

/** The actor, member and source cut come from the owning constructor. */
export interface ExploreReadRequest<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly actor: KeyId;
  readonly member: MemberRef;
  readonly scope: ScopeRef;
  readonly definition: Digest;
  readonly head: Head;
  readonly key: string;
  readonly act: PartialAct<D, K>;
}

/** Read authentication only. Neither arm supplies authority or an evaluator. */
export type ExploreRead =
  | { readonly is: "ready"; readonly session: Session }
  | { readonly is: "unavailable"; readonly lacks: readonly Lack[] };
export interface ReadExploreInputs<D extends DeclaredDefinition> {
  <K extends Kind<D>>(request: ExploreReadRequest<D, K>): Promise<ExploreRead>;
}

/** A standalone Replica needs this fixed identity before its private bridge is used. */
export interface ReplicaExploration<D extends DeclaredDefinition> {
  readonly actor: KeyId;
  readonly member: MemberRef;
  readonly clock: () => Timestamp;
  readonly read?: ReadExploreInputs<D>;
  /** An owning client's stopping state can only further restrict the Replica. */
  readonly active?: () => boolean;
}

/** Actual recorded selection at the same cut as a moved-basis judgment. */
export type DraftSelection =
  | { readonly is: "present"; readonly ref: ActRef }
  | { readonly is: "absent" };
export interface DraftMovement {
  readonly head: Head;
  readonly now: ActRef | null;
  readonly subjects: Readonly<Record<string, DraftSelection>>;
}
/** Private C4 handoff only. The original authored act remains E4's input. */
export interface DraftExploreResult<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly exploration: Exploration<D, K>;
  readonly movement: DraftMovement | null;
}

export type ExploreOperation<D extends DeclaredDefinition> =
  <K extends Kind<D>>(key: string, act: PartialAct<D, K>) => Promise<DraftExploreResult<D, K>>;
const operations = new WeakMap<object, unknown>();

/** Constructors register only their own closure over the actual Replica. */
export function registerExplore<D extends DeclaredDefinition>(owner: object, operation: ExploreOperation<D>): void {
  operations.set(owner, operation);
}
export function exploreReplica<D extends DeclaredDefinition, K extends Kind<D>>(
  replica: Replica<D>, key: string, act: PartialAct<D, K>,
): Promise<DraftExploreResult<D, K>> {
  return operation<D>(replica)(key, act);
}

/** C4's later draft operation uses this registration, never clientReplica's test seam. */
export function exploreClient<D extends DeclaredDefinition, K extends Kind<D>>(
  client: object, key: string, act: PartialAct<D, K>,
): Promise<DraftExploreResult<D, K>> {
  return operation<D>(client)(key, act);
}
function operation<D extends DeclaredDefinition>(owner: object): ExploreOperation<D> {
  const registered = operations.get(owner) as ExploreOperation<D> | undefined;
  if (!registered) throw new TypeError("exploration requires its constructor identity binding");
  return registered;
}
