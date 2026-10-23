import type { PresentationPackage, ViewKind } from "./resources.ts";
import type { ApplicationProjectionData, FactRef, FieldValue, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";
import type { ApplicationView, ApplicationViewParameters } from "@generalbusiness/dap-bytes/application-v2";
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
export interface ActorChip { kind: "person" | "agent" | "checker"; name: string; controller?: string }
export type MemberFacts = Readonly<Record<number, { label: string; refs: readonly MemberRef[] }>>;
export interface CardAction {
  id: string;
  label: string;
  purpose: "act" | "approve" | "mark-reviewed" | "check-original";
  /** A native kind and its already captured input; the browser never supplies these. */
  kind: string;
  args: Record<string, unknown>;
  /** Server-owned declaration and transient model input; never app action arguments. */
  parameters?: ApplicationViewParameters;
  parameterInput?: unknown;
}
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
  title: string;
  summary: string;
  actor?: ActorChip;
  reasons: string[];
  /** Plain text, rendered without HTML. */
  body?: string;
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
  readonly screens?: readonly { name: string; resource: string }[];
  readonly inputActs?: readonly { screen: string; id: string; label: string; parameters: ApplicationViewParameters }[];
  readonly presentation?: PresentationPackage;
  initialPage?(screen: ViewKind): PageKind;
  read(query: ViewQuery, access: { call(name: string, args: Record<string, unknown>): Promise<{ structuredContent: Record<string, unknown>; isError: boolean }> }): Promise<Projection>;
  /** A declared source repeats its current when/needs check before signing. */
  admit?(query: ViewQuery, card: Card, action: CardAction): Promise<void>;
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
  note?: string;
  receipt?: string;
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
  card?: Omit<Card, "actions" | "declared"> & {
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
