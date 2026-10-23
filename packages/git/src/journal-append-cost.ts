/** Future prices for the actual at-send validator's two-call object port.
 * Repeated objects are charged again. No provider or validation credit. */
import { natural } from "@generalbusiness/dap-bytes";
import { refuseJournal, type JournalCost, type JournalLayoutLimits } from "./journal-work.ts";

export type JournalAppendLayoutWork = Pick<JournalLayoutLimits, "objects" | "trees" | "names" | "depth" | "objectBytes">;
export type JournalAppendForecast = { readonly ok: true; readonly cost: Readonly<JournalCost>; readonly layoutWork: Readonly<JournalAppendLayoutWork> }
  | { readonly ok: false; readonly reason: "limit" };
export const journalAppendReadCost = (bytes: number, objects = 1): JournalCost =>
  ({ entries: 0, attempts: objects, nodes: 0, calls: objects * 2, metadata: objects * 128, inputWork: objects * 256 + bytes * 4 });

export interface JournalAppendFixedFootprint {
  readonly oldCommitBytes: number; readonly newCommitBytes: number;
  readonly oldHeadBytes: number; readonly newHeadBytes: number;
}
/** Complements prepared append-edge prices. Original read maxima provide
 * a conservative default when exact parent sizes are not retained. Covers
 * both commit reads/parses and both head-blob reads/parses; their tree walks
 * belong to the append-edge forecast. It grants no I/O admission. */
export function forecastJournalAppendFixed(shape: JournalAppendFixedFootprint = {
  oldCommitBytes: 1024, newCommitBytes: 1024, oldHeadBytes: 1024, newHeadBytes: 1024,
}): JournalAppendForecast {
  const { oldCommitBytes, newCommitBytes, oldHeadBytes, newHeadBytes } = shape;
  const sizes = [oldCommitBytes, newCommitBytes, oldHeadBytes, newHeadBytes];
  if (!sizes.every(value => natural(value) && value > 0)) return refuseJournal("input");
  if (sizes.some(value => value > 1024)) return { ok: false, reason: "limit" };
  const heads = oldHeadBytes + newHeadBytes, commits = oldCommitBytes + newCommitBytes;
  return { ok: true,
    cost: Object.freeze({ entries: 0, attempts: 4, nodes: 0, calls: 8,
      metadata: 512 + heads * 3, inputWork: 1024 + heads * 15 + commits * 7 }),
    layoutWork: Object.freeze({ objects: 4, trees: 0, names: 0, depth: 0, objectBytes: Math.max(...sizes) }),
  };
}
