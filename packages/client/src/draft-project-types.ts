/** Proposed C4 projection data. No caller, port or public entry exposes these names yet. */
import type { DeclaredDefinition, Digest, FactRef } from "@generalbusiness/dap-contract";
import type { DeliveryOccurrence, Identity } from "./custody.ts";
import type { Kind } from "./declared.ts";
import type { DraftNowView, DraftViewCut } from "./draft-now.ts";
import type { DraftIndex, EditableValues, Slot } from "./draft-slot.ts";
import type { DraftBinding, DraftDismissal, DraftReturnCause, DraftSlot, StoredDraft } from "./draft-store.ts";
import type { ReplicaState, SignedEntry } from "./replica.ts";
import type { DraftMovement } from "./replica-explore.ts";
import type { Judged } from "./replica-judged.ts";
import type { RequestStatus, Why } from "./request-status.ts";
import type { RequestView } from "./scope-client.ts";

/** Genuine non-entry C3 answers. Existence alone produces neither arm. */
export type DraftRequestStatus = { readonly status: "pending" }
  | Extract<RequestStatus, { why: Why }>;
/** Both arms recompute `now` at the view from the kept basis and the rows the view holds. The stored return keeps
 * its basis and cause only. `movement` is the same cut as `now`, and null when the view lacks a row or a cut. */
export type DraftReturnView =
  | { readonly by: "exploration"; readonly cause: DraftReturnCause; readonly movement: DraftMovement | null; readonly now: DraftNowView }
  | ({ readonly by: "request" } & Extract<RequestStatus, { why: Why }> & { readonly now: DraftNowView });
export interface DraftContent<D extends DeclaredDefinition, K extends Kind<D>> {
  readonly key: string;
  readonly kind: K;
  readonly slot: Slot<D, K>;
  readonly values: Readonly<EditableValues<D, K>>;
  readonly after?: { readonly key: string };
}
export type DraftPresentation = { readonly state: "submitting" }
  | { readonly state: "editing"; readonly returned?: DraftReturnView };
export type DraftViewKinds<D extends DeclaredDefinition> = {
  [K in Kind<D>]: DraftContent<D, K> & DraftPresentation
};
export type AnyDraftView<D extends DeclaredDefinition> = DraftViewKinds<D>[Kind<D>];
export type AnyDraftContent<D extends DeclaredDefinition> = { [K in Kind<D>]: DraftContent<D, K> }[Kind<D>];
/** Partial draft data never asserts AskedOf, including a genuine pending request. */
export type DraftListView<D extends DeclaredDefinition> = { readonly is: "draft" } & (
  AnyDraftView<D>
  | (AnyDraftContent<D> & { readonly status: "pending"; readonly predicted: Judged | null })
  | (AnyDraftContent<D> & { readonly status: "other-recorded"; readonly predicted: { readonly is: "recorded"; readonly fact: SignedEntry["fact"] } })
);
/** One arm, three closed reasons. Historical content has not passed current refinement. */
export type HeldStoredIntention<D extends DeclaredDefinition> = {
  [K in Kind<D>]: { readonly is: "held-intention"; readonly reason: "nonrequest-held"; readonly key: string; readonly kind: K; readonly entry?: FactRef;
    readonly values: Readonly<EditableValues<D, K>> }
}[Kind<D>]
  | { readonly is: "held-intention"; readonly reason: "another-descriptor"; readonly key: string; readonly descriptor: Digest; readonly entry?: FactRef }
  /** Planner 6d3b979f item 4: the stored definition digest differs. It holds the key and that digest, and no values. */
  | { readonly is: "held-intention"; readonly reason: "another-definition"; readonly key: string; readonly definition: Digest; readonly entry?: FactRef };
export type DraftRequestListEntry<D extends DeclaredDefinition> = RequestView<D> | DraftListView<D> | HeldStoredIntention<D>;

export type ObservedCustody = { readonly is: "absent" }
  | { readonly is: "found"; readonly occurrence: DeliveryOccurrence };
/** Mutually exclusive facts. Missing acquisition or an unclassified ordinary record has no arm. */
export type DraftKeyEvidence = { readonly identity: Identity } & (
  | { readonly is: "entry"; readonly entry: SignedEntry; readonly presentMeaning: SignedEntry["meaning"]; readonly observed: ObservedCustody }
  | { readonly is: "absent" }
  | { readonly is: "request"; readonly occurrence: DeliveryOccurrence; readonly status: DraftRequestStatus; readonly predicted: Judged | null }
  | { readonly is: "non-request"; readonly occurrence: DeliveryOccurrence; readonly excludedBy: "standalone"; readonly verifiedEntry?: SignedEntry }
);
export type LocalDraftActivity = { readonly is: "idle" }
  | { readonly is: "submitting"; readonly against: StoredDraft };
/** Historical/dismissed rows use kept C3 presentation, never their unrefined fields, for ordinary requests. */
export type HistoricalKeyEvidence<D extends DeclaredDefinition> = { readonly identity: Identity } & (
  | { readonly is: "absent"; readonly verifiedEntry?: SignedEntry }
  | { readonly is: "non-request"; readonly occurrence: DeliveryOccurrence; readonly excludedBy: "standalone"; readonly verifiedEntry?: SignedEntry }
  | { readonly is: "ordinary"; readonly occurrence: DeliveryOccurrence; readonly view: RequestView<D> }
);
/** The complete raw batch is partitioned before current refinement; history never enters that refiner. */
export type ProjectStoredKey<D extends DeclaredDefinition> =
  | { readonly is: "current"; readonly stored: StoredDraft; readonly evidence: DraftKeyEvidence; readonly local: LocalDraftActivity }
  | { readonly is: "historical"; readonly stored: StoredDraft; readonly evidence: HistoricalKeyEvidence<D>; readonly local?: never }
  | { readonly is: "dismissed"; readonly stored: DraftDismissal; readonly evidence: HistoricalKeyEvidence<D>; readonly local?: never };
export interface DraftProjectInput<D extends DeclaredDefinition> {
  readonly definition: D;
  readonly binding: DraftBinding;
  readonly identity: Omit<Identity, "key">;
  readonly state: ReplicaState;
  /** The checked cut of this render: head and every held row. Null when the replica holds none. */
  readonly cut: DraftViewCut | null;
  readonly stored: readonly ProjectStoredKey<D>[];
  /** Genuine pre-filter C3 views only for keys absent from the stored batch. */
  readonly custodyOnly: readonly RequestView<D>[];
}
export type DraftRoute = "slot" | "list" | "recorded" | "dismissed";
/** Private ownership/routing data. The caller must not spread it into ClientView. */
export type DraftKeyRoute<D extends DeclaredDefinition> =
  | { readonly from: "stored"; readonly key: string; readonly route: DraftRoute;
    readonly address: DraftSlot; readonly source: ProjectStoredKey<D> }
  | { readonly from: "custody"; readonly key: string; readonly route: "list" | "recorded"; readonly source: RequestView<D> };
export interface DraftProjection<D extends DeclaredDefinition> {
  readonly drafts: DraftIndex<D, DraftViewKinds<D>>;
  readonly requests: readonly DraftRequestListEntry<D>[];
  readonly routing: readonly DraftKeyRoute<D>[];
}
