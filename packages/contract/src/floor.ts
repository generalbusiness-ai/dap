/** Retained-journal floor (floor note, sections 3–7). Positions never change. */
import type { Digest } from "./scope.ts";
import type { Head } from "./result.ts";

/** Planner dc426978: migrated accepted row, plus UTF-8 idempotency-key bytes. */
export const ACCEPTED_KEY_OVERHEAD_BYTES = 256;

export interface FloorReceipt { readonly commit: string; readonly through: Head }
export interface FloorInput {
  type: "floor";
  readonly floor: number;
  readonly receipt: FloorReceipt;
  readonly keep: readonly number[];
}
/** One archived position is covered by the current floor's receipt. */
export interface Archived { readonly floor: number; readonly commit: string; readonly through: Head }
export interface SizeProof { readonly digest: Digest; readonly seq: number; readonly bound: number }
/** Folded state, omitted before the first floor to preserve older snapshots. */
export interface JournalFloor {
  readonly floor: number;
  readonly receipt: FloorReceipt;
  readonly kept: readonly number[];
  readonly sizeProofs: readonly SizeProof[];
}
export type FloorRefusal = "floor-receipt" | "floor-ahead" | "floor-back" | "floor-step" | "floor-recent" | "floor-keep" | "floor-kept";
