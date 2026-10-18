import type { PresentationPackage, ViewKind } from "./resources.ts";
import type { ApplicationProjectionData, FactRef, FieldValue } from "@generalbusiness/dap-contract";
import type { ApplicationView } from "@generalbusiness/artroom-bytes/application-v2";

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
export interface CardAction {
  id: string;
  label: string;
  purpose: "act" | "approve" | "mark-reviewed" | "check-original";
  /** A native kind and its already captured input; the browser never supplies these. */
  kind: string;
  args: Record<string, unknown>;
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
    refresh: number;
    display: "inline" | "fullscreen";
    back: string | null;
    data: ApplicationProjectionData;
    log?: readonly { entry: Readonly<FactRef>; time: string; title: string; summary: string; facts: readonly string[] }[];
    resource?: string;
    opens?: Readonly<Record<string, string>>;
  };
}
export interface ViewQuery {
  screen: ViewKind;
  subject?: string;
  position: number;
  page: PageKind;
  items?: Readonly<Record<string, number>>;
}
export interface Projection {
  status: "ready" | "empty" | "unavailable" | "denied" | "absent" | "incomplete" | "stale";
  position: number;
  count: number;
  card?: Card;
  /** Useful fallback when no card is available. */
  fallback: string;
  /** Empty declared views still retain their exact native data and head. */
  data?: ApplicationProjectionData;
}
/** A trusted application's projection adapter. Reads use the service's normal authenticated tool path. */
export interface ViewSource {
  readonly declared?: boolean;
  readonly screens?: readonly { name: string; resource: string }[];
  readonly presentation?: PresentationPackage;
  initialPage?(screen: ViewKind): PageKind;
  read(query: ViewQuery, access: { call(name: string, args: Record<string, unknown>): Promise<{ structuredContent: Record<string, unknown>; isError: boolean }> }): Promise<Projection>;
  /** A declared source repeats its current when/needs check before signing. */
  admit?(query: ViewQuery, card: Card, action: CardAction): Promise<void>;
}
export interface CardContext {
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
  view: string;
  cut: number;
  active: boolean;
  query: ViewQuery;
  status: Projection["status"];
  position: number;
  count: number;
  card?: Omit<Card, "actions"> & { actions: Pick<CardAction, "id" | "label" | "purpose">[] };
  fallback: string;
  data?: ApplicationProjectionData;
  context: CardContext;
  receipt?: string;
}
