/** A replay keeps the clone intact, while judgments see the entries that
 * the runtime held at this exact historical head (floor note, sections 6–7). */
import type { Archived, Entry, FactUse, Sealed } from "@generalbusiness/dap-contract";
import type { Own, StateView } from "@generalbusiness/dap-derive";

export function floorOwn(view: StateView, entries: readonly Sealed[], retained?: (use: FactUse) => Entry | null): Own {
  // Capture the pre-entry floor. Observation views and deferred checks must
  // not inherit a floor written later by the mutable replay state.
  const floor = view.floor?.() ?? null, through = view.scope()?.head.seq ?? -1;
  const kept = new Set(floor?.kept ?? []);
  const archived = (seq: number): Archived | null => floor && Number.isSafeInteger(seq) && seq >= 0 && seq < floor.floor && !kept.has(seq)
    ? { floor: floor.floor, commit: floor.receipt.commit, through: floor.receipt.through } : null;
  const own: Own = seq => Number.isSafeInteger(seq) && seq >= 0 && seq <= through && !archived(seq) ? entries[seq] ?? null : null;
  if (retained) own.retained = retained;
  own.archived = archived;
  own.sizeProofs = () => floor?.sizeProofs ?? [];
  own.positions = function* (before) {
    const end = Math.min(before, through + 1);
    for (const seq of floor?.kept ?? []) if (seq < end) yield seq;
    for (let seq = floor?.floor ?? 0; seq < end; seq++) yield seq;
  };
  return own;
}
