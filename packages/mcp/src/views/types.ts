import type { CallResult } from "../results.ts";
import type { PresentationPackage, ViewKind } from "./resources.ts";
import type { ReadMinimum, ApplicationProjectionData, FactRef, FieldValue, Head, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import type { ApplicationView, ApplicationViewParameters } from "@generalbusiness/dap-platform/application-v2";
import type { MemberTable } from "./member-types.ts";

export type PageKind = "summary" | "item" | "diff" | "updates";
export interface EntryRange { scope: string; from: number; to: number }
export interface ReadPoint { scope: string; seq: number; hash: string }
export interface CardIdentity {
  item: string;
  kind: string;
  revision: string;
  subject: { scope: string; item?: number };
  /** The displayed subject revision. Declared acts retain their complete,
   * potentially different expected sets in each server-held action. */
  at: Record<string, number>;
}
/** One version of a change, as an interdiff compares it. */
export interface VersionRead { label: string; base: string; integration: string }
/** One server-held exact read. Each signs one read-token act at `target` and spends its credential on this read. */
export type ExactRead =
  | { kind: "diff"; target: string; base: string; integration: string; label?: string }
  | { kind: "interdiff"; target: string; from: VersionRead; to: VersionRead }
  | { kind: "file"; target: string; commit: string; commitLabel: string; path: string; shown: string };
/** One commit that a read names, from the read's own answer. */
export interface NamedCommit { label: string; id: string }
/** What a reader page shows beside its text. It holds no executable input: an action is an opaque ID. */
export interface ShownRead {
  kind: ExactRead["kind"];
  title: string;
  commits: NamedCommit[];
  truncated: boolean;
  /** What a truncated read left out, in words. */
  leftOut: string | null;
  /** A file of this read that a press reads at its exact commit. */
  files: { action: string; label: string }[];
  /** Changed paths this read reached that have no action here. */
  moreFiles: number;
}
/** The key comes from the signed envelope; its optional display comes from that envelope's membership. */
export interface ActSigner { key: string; actor: ActorChip | null }
export interface ActorChip { kind: "person" | "agent" | "checker"; name: string; controller?: string }
export type MemberFacts = Readonly<Record<number, { label: string; refs: readonly MemberRef[] }>>;
export interface NativeCardAction {
  readonly local?: false;
  id: string;
  label: string;
  purpose: "act" | "approve" | "mark-reviewed" | "check-original";
  /** A native kind and its already captured input; the browser never supplies these. */
  kind: string;
  args: Record<string, unknown>;
  /** Server-owned declaration and transient model input; never app action arguments. */
  parameters?: ApplicationViewParameters;
  parameterInput?: unknown;
  /** The receipt line a person reads when the scope accepts this act. */
  done?: string;
}
/** Exact server-held read vector and displayed ranges, not a native grant. */
export interface LocalReviewCapture {
  readonly heads: readonly { scope: ScopeRef; head: Head }[];
  readonly ranges: readonly EntryRange[];
  readonly service: string;
  readonly directory: ScopeRef;
  readonly viewer: MemberRef;
  readonly key: string;
}
export interface LocalReviewAction {
  readonly local: true;
  id: string;
  label: string;
  purpose: "mark-reviewed";
  capture: LocalReviewCapture;
  kind?: never;
  args?: never;
  parameters?: never;
  parameterInput?: never;
}
export type CardAction = NativeCardAction | LocalReviewAction;

/** Verified package HTML and declared navigation, separate from native rows. */
export interface DeclaredSurface {
  screen: string;
  resource: string;
  html: string;
  opens: Readonly<Record<string, string>>;
  refresh: number;
  display: "inline" | "fullscreen";
  back: string | null;
  backScope?: ScopeRef;
}
export interface Card {
  identity: CardIdentity;
  /** The line above the title, in a person's words. Without one, the card shows the identity's kind and revision. */
  kicker?: string;
  title: string;
  summary: string;
  actor?: ActorChip;
  /** Names which displayed act the chip attributes. */
  actorLabel?: string;
  reasons: string[];
  /** Plain text, rendered without HTML. */
  body?: string;
  /** The first card shows this whole body, so it may offer its acts there. A card sets this only when the body is short enough to read whole. */
  wholeText?: true;
  /** The exact record behind a disclosure on the opened card. A person need not read it. */
  record?: { label: string; text: string };
  /** The exact rule of this row, for the model's context. */
  rule?: { definition: string; clause: string };
  entries?: { scope: string; seq: number; text: string }[];
  projection: ReadPoint[];
  reviewIntended: EntryRange[];
  unavailable: EntryRange[];
  waitsOn: string[];
  settles: string[];
  actions: CardAction[];
  approvalAllowed?: boolean;
  /** An uncertain external request can offer only its original check. */
  unresolvedOriginal?: boolean;
  diffAvailable?: boolean;
  /** Server-held endpoints of View diff. It signs one read-token act at `target` and reads this diff once. */
  diffRead?: { target: string; base: string; integration: string; label?: string };
  /** Server-held endpoints of each interdiff this card offers, nearest earlier version first. */
  interdiffReads?: Omit<Extract<ExactRead, { kind: "interdiff" }>, "kind">[];
  /** The exact read that the diff page shows. */
  shownRead?: ShownRead;
  detailPage?: "item" | "updates";
  fallback: string;
  /** Generic declared presentation; all data stays on the app-only path. */
  declared?: {
    kind: ApplicationView["kind"];
    source: string;
    context: string;
    actor: FieldValue | null;
    memberFacts?: MemberFacts;
    refresh: number;
    display: "inline" | "fullscreen";
    back: string | null;
    backScope?: ScopeRef;
    scope: ScopeRef;
    /** Server-held native data is omitted from a routed display. */
    routed?: true;
    data: ApplicationProjectionData;
    series?: { label: string; scale: number; unit: string; window: number; fallback: string;
      samples: readonly { value: number; time: string; entry: Readonly<FactRef> }[] };
    links?: readonly { label: string; screen: string; items: Readonly<Record<string, number>> }[];
    log?: readonly { entry: Readonly<FactRef>; time: string; title: string; summary: string; facts: readonly string[]; memberFacts?: MemberFacts }[];
    resource?: string;
    opens?: Readonly<Record<string, string>>;
    surface?: DeclaredSurface;
  };
}
export interface ViewQuery {
  screen: ViewKind;
  subject?: string;
  scope?: ScopeRef;
  position: number;
  page: PageKind;
  items?: Readonly<Record<string, number>>;
  /** Host-only automatic read hint; never retained or used for signing. */
  refresh?: true;
}
export interface Projection {
  members?: MemberTable;
  status: "ready" | "empty" | "unavailable" | "denied" | "absent" | "incomplete" | "stale";
  position: number;
  count: number;
  card?: Card;
  /** Useful fallback when no card is available. */
  fallback: string;
  /** Empty declared views still retain their exact native data and head. */
  data?: ApplicationProjectionData;
  /** Exact read metadata remains available without exposing source rows. */
  scope?: ScopeRef;
  points?: ReadPoint[];
  back?: { screen: string; scope: ScopeRef };
  refresh?: number;
  surface?: DeclaredSurface;
}
/** A trusted application's projection adapter. Reads use the service's normal authenticated tool path. */
export interface ViewSource {
  readonly declared?: boolean;
  /** A list screen takes a scope: the lane that the list continues after. */
  readonly listsAfterScope?: boolean;
  readonly screens?: readonly { name: string; resource: string }[];
  readonly inputActs?: readonly { screen: string; id: string; label: string; parameters: ApplicationViewParameters }[];
  readonly presentation?: PresentationPackage;
  initialPage?(screen: ViewKind, subject?: string): PageKind;
  /** After a restart, such a card offers only the check of an act that this server sent and has no outcome for. */
  checksOriginals?(query: ViewQuery): boolean;
  read(query: ViewQuery, access: { call(name: string, args: Record<string, unknown>): Promise<{ structuredContent: Record<string, unknown>; isError: boolean }> }, minimum?: ReadMinimum): Promise<Projection>;
  /** A declared source repeats its current when/needs check before signing. */
  admit?(query: ViewQuery, card: Card, action: CardAction): Promise<void>;
  /** After awaited reads, call admit without awaiting it, immediately before synchronous publication. */
  markReviewed?(capture: LocalReviewCapture, context: { view: string; cut: number; admit: () => void }): Promise<CallResult>;
}
export interface CardContext {
  /** Opaque mounted-view key for model input tools; never a dispatch cut. */
  view: string;
  screen: ViewKind;
  page: PageKind;
  status: Projection["status"];
  identity: CardIdentity | null;
  projection: ReadPoint[];
  entriesRead: EntryRange[];
  presented: EntryRange[];
  reviewIntended: EntryRange[];
  unavailable: EntryRange[];
  waitsOn: string[];
  settles: string[];
  navigation: string[];
  /** The commits that the diff page names. A commit ID is no private card text. */
  exact?: { kind: ExactRead["kind"]; commits: NamedCommit[]; truncated: boolean };
  note?: string;
  receipt?: string;
  rule?: { definition: string; clause: string };
}
/** App data excludes executable action inputs: only opaque action IDs and labels cross to the browser. */
export interface Display {
  members?: MemberTable;
  view: string;
  cut: number;
  active: boolean;
  query: ViewQuery;
  status: Projection["status"];
  position: number;
  count: number;
  card?: Omit<Card, "actions" | "declared" | "diffRead" | "interdiffReads"> & {
    /** View diff goes through `view_act`, because it signs a read-token act. */
    diffSigned?: true;
    /** The exact reads this card offers, as opaque actions. A read this view already holds signs nothing. */
    readers?: { action: string; label: string; current: boolean }[];
    declared?: Omit<NonNullable<Card["declared"]>, "data"> & { data?: ApplicationProjectionData };
    actions: (Pick<CardAction, "id" | "label" | "purpose"> & { input?: "chat" })[];
  };
  fallback: string;
  data?: ApplicationProjectionData;
  scope?: ScopeRef;
  back?: { screen: string; scope: ScopeRef };
  refresh?: number;
  surface?: DeclaredSurface;
  context: CardContext;
  receipt?: string;
}
