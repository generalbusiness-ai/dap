import type { FactRef, Head, Item, MemberRef, ScopeRef } from "@generalbusiness/dap-contract";

export interface MemberDisplay {
  ref: MemberRef;
  identity: { handle: string; kind: "person" | "agent" | "checker" } | null;
  /** Display evidence only. Native admission never trusts these actions. */
  standing: { state: "invited" | "active" | "removed" | "lapsed"; role: string | null; actions: readonly string[] | null } | null;
  controller: MemberRef | null;
  opened: FactRef | null;
  at?: Head;
}
export interface MemberTable {
  /** Keyed by the canonical full MemberRef, including membership incarnation. */
  records: Readonly<Record<string, MemberDisplay>>;
  overflow: number;
}
export interface MembershipDisplaySnapshot {
  scope: ScopeRef;
  at: Head;
  members: readonly Item[];
  /** A different-head roster cannot establish actions at the member read. */
  roster?: { item: Item; at: Head };
}
export type MembershipDisplayRead = (scope: ScopeRef) => Promise<MembershipDisplaySnapshot | null>;
