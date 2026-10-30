/** Structural reads supplied to host adapters. No Worker class or ambient
 * storage type belongs to this shared type boundary. */
import type { Bounds, Input } from "@generalbusiness/dap-contract";
import type { ScopeState, StateView, ValidDefinition } from "@generalbusiness/dap-derive";
import type { Ports } from "./ports.ts";
import type { Sealed, Store } from "./store.ts";

export interface Given extends Pick<Ports, "clock" | "random"> {
  genesis(): Extract<Input, { type: "genesis" }> | null;
  state: StateView;
  /** The scope's record: its reference, its head and the time of its previous entry. */
  scope(): ScopeState | null;
}
export interface OutsideGiven extends Given {
  /** Exact declaration already admitted by this scope's native runtime. */
  definition?(): ValidDefinition | null;
  /** Native scopes supply their actual configured bounds. Optional only for
   * older structural fixtures; bounded G15 adapters refuse when absent. */
  readonly bounds?: Bounds;
  /** One sealed entry of this scope, or null. No other scope is read. */
  own(seq: number): Sealed | null;
  /** One input already retained by this scope. No network read or storage write. */
  retained: Store["retained"];
}
