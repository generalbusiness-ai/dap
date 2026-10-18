import type { ViewKind } from "./resources.ts";

export type PageKind = "summary" | "item" | "diff" | "updates";
export interface EntryRange { scope: string; from: number; to: number }
export interface ReadPoint { scope: string; seq: number; hash: string }
export interface CardIdentity {
  item: string;
  kind: string;
  revision: string;
  subject: { scope: string; item?: number };
  /** The native expected-subject set captured by this projection. */
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
  actor: ActorChip;
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
}
export interface ViewQuery {
  screen: ViewKind;
  subject?: string;
  position: number;
  page: PageKind;
}
export interface Projection {
  status: "ready" | "empty" | "unavailable" | "denied" | "absent" | "incomplete" | "stale";
  position: number;
  count: number;
  card?: Card;
  /** Useful fallback when no card is available. */
  fallback: string;
}
/** A trusted application's projection adapter. Reads use the service's normal authenticated tool path. */
export interface ViewSource {
  read(query: ViewQuery, access: { call(name: string, args: Record<string, unknown>): Promise<{ structuredContent: Record<string, unknown>; isError: boolean }> }): Promise<Projection>;
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
  context: CardContext;
  receipt?: string;
}
