/** Original Git input/body-stage arithmetic. Source ports, admission and
 * parent/patch/commit/transport work are priced by their respective owners. */
import { natural } from "@generalbusiness/dap-bytes";
import { JOURNAL_SELECTION_BYTES } from "./journal-selection-cost.ts";
import { refuseJournal, type JournalCost } from "./journal-work.ts";

export const journalNamedInputCost = (bytes: number): { calls: number; inputWork: number } => ({ calls: 1, inputWork: bytes * 8 });
export const journalEntryRowsMetadata = (rows: number): number => rows * 128;
export const journalOriginsMetadata = (rows: number): number => rows * 32;
export const journalRetainedNameMetadata = (units: number): number => units + 128;
export const journalManifestRowsMetadata = (rows: number): number => rows * 128;
export const journalPassSerializationMetadata = (selectionUnits: number): number => selectionUnits * 3 + 2048;
export function journalSegmentReservation(entries: number, entryBytes: number): { metadata: number; inputWork: number; outputWork: number } {
  // The original grouping reservation includes every possible separator,
  // including a boundary that a physical segment will not write.
  const outputWork = entryBytes + Math.max(0, entries - 1);
  return { metadata: entries * 64 + 256, inputWork: outputWork * 8, outputWork };
}

/** Normalized metadata only. Origins include retained/omitted consumers
 * and ancestry rows. Retained sizes/names count only newly written keys;
 * manifest rows include older referenced keys and unique omissions too. */
export interface JournalPassBodyFootprint {
  readonly entries: number;
  readonly entryBytes: number;
  readonly origins: number;
  readonly newRetained: number;
  readonly retainedNameUnits: number;
  readonly retainedBytes: number;
  readonly manifestRows: number;
  readonly selectionUnits: number;
}
export type JournalPassBodyForecast = { readonly ok: true; readonly cost: Readonly<JournalCost>;
  readonly layoutWork: { readonly outputWork: number } } | { readonly ok: false; readonly reason: "limit" };

/** Covers Git's selected entry/retained checks, manifest construction,
 * serialization and grouping. Excludes the selection parser, source-port
 * work (including native attempts), anchors, patch, commit and at-send
 * validation. Future cost remains owed on the original pass allowance. */
export function forecastJournalPassBody(shape: JournalPassBodyFootprint): JournalPassBodyForecast {
  const { entries, entryBytes, origins, newRetained, retainedNameUnits, retainedBytes, manifestRows, selectionUnits } = shape;
  if (![entries, entryBytes, origins, newRetained, retainedNameUnits, retainedBytes, manifestRows, selectionUnits].every(natural)
    || entries === 0 || entryBytes < entries || retainedBytes < newRetained || retainedNameUnits < newRetained
    || newRetained > manifestRows || selectionUnits === 0) return refuseJournal("input");
  if (entries > 4096 || newRetained > 512 || manifestRows > 512 + 8192 || selectionUnits > JOURNAL_SELECTION_BYTES) return { ok: false, reason: "limit" };
  const serialization = journalPassSerializationMetadata(selectionUnits), segments = journalSegmentReservation(entries, entryBytes);
  const metadata = journalEntryRowsMetadata(entries) + journalOriginsMetadata(origins)
    + 2 * (retainedNameUnits + newRetained * journalRetainedNameMetadata(0))
    + journalManifestRowsMetadata(manifestRows) + serialization + segments.metadata;
  const inputWork = metadata + journalNamedInputCost(entryBytes + retainedBytes).inputWork + serialization * 2 + segments.inputWork;
  if (!natural(metadata) || !natural(inputWork) || !natural(segments.outputWork)) return refuseJournal("input");
  return { ok: true,
    cost: Object.freeze({ entries: 0, attempts: newRetained, nodes: 0, calls: entries + newRetained, metadata, inputWork }),
    layoutWork: Object.freeze({ outputWork: segments.outputWork }),
  };
}
