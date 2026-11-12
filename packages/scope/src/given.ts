/** Structural reads supplied to host adapters. No Worker class or ambient
 * storage type belongs to this shared type boundary. */
import type { Bounds, Input, KeyId } from "@generalbusiness/dap-contract";
import type { CheckedSequence } from "@generalbusiness/dap-bytes";
import type { Own, ScopeState, StateView, ValidDefinition } from "@generalbusiness/dap-derive";
import type { Ports } from "./ports.ts";
import type { Store } from "./store.ts";

export interface Given extends Pick<Ports, "clock" | "random"> {
  genesis(): Extract<Input, { type: "genesis" }> | null;
  state: StateView;
  /** The scope's record: its reference, its head and the time of its previous entry. */
  scope(): ScopeState | null;
}
export interface AuthorityGiven extends Given {
  /** Whether a `compromised` notice that this scope applied named that key. Private custody, and no part of the folded state. */
  named(key: KeyId): boolean;
}
export interface OutsideGiven extends Given {
  /** Deferred memory-only association. Null before the local birth is admitted. */
  localSequence(): CheckedSequence | null;
  /** Exact declaration already admitted by this scope's native runtime. */
  definition?(): ValidDefinition | null;
  /** Native scopes supply their actual configured bounds. Optional only for
   * older structural fixtures; bounded G15 adapters refuse when absent. */
  readonly bounds?: Bounds;
  /** One sealed entry of this scope, or null, with the scope's admitted sequence. No other scope is read. */
  own: Own;
  /** One input already retained by this scope. No network read or storage write. */
  retained: Store["retained"];
}
