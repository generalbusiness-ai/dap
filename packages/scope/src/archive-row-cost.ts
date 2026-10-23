/** Original native bookkeeping prices only. No SQL, mark, receipt,
 * selection admission, host work or extra allowance is supplied here. */
import { natural } from "@generalbusiness/dap-bytes";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";

export const ARCHIVE_ROW_MANIFEST_BYTES = 1024 * 1024;
export const ARCHIVE_ROW_BYTES = 2 * ARCHIVE_ROW_MANIFEST_BYTES + 16 * 1024;
/** Only a checked confirmation post-state with no pending/stopped/next
 * metadata qualifies. Its closed schema encodes to at most 25,087 bytes,
 * including four maximally escaped 1024-unit repository strings. */
export const ARCHIVE_CONFIRMED_ROW_BYTES = 32 * 1024;
export const ARCHIVE_ROW_SAVE_FIXED_WORK = 4096;
export const ARCHIVE_ROW_SIZE_METADATA = 96;
export const ARCHIVE_RETAINED_PASS_METADATA = 96;
export const ARCHIVE_RETAINED_PASS_WORK = 128;
export const ARCHIVE_RETAINED_CONFIRM_WORK = 256;
/** One original keyed pass lookup, including the native metadata fold.
 * This does not select a body, confirm a receipt or create an allowance. */
export function forecastArchiveRetainedPass(): Readonly<ArchiveCost> {
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: ARCHIVE_RETAINED_PASS_METADATA,
    inputWork: ARCHIVE_RETAINED_PASS_WORK + ARCHIVE_RETAINED_PASS_METADATA });
}
export const archiveRowLoadWork = (bytes: number): number => bytes * 12;
export const archivePendingManifestWork = (units: number): number => units * 8;
export const archiveMarkWork = (units: number): number => units * 12 + 4096;
export const archiveRowSaveReservation = (): Pick<ArchiveCost, "calls" | "inputWork"> =>
  ({ calls: 2, inputWork: ARCHIVE_ROW_BYTES * 3 + ARCHIVE_ROW_SAVE_FIXED_WORK });
export const archiveConfirmedRowSaveReservation = (): Pick<ArchiveCost, "calls" | "inputWork"> =>
  ({ calls: 2, inputWork: ARCHIVE_CONFIRMED_ROW_BYTES * 3 + ARCHIVE_ROW_SAVE_FIXED_WORK });
export const archiveConfirmedSelectionReservation = (units: number): Pick<ArchiveCost, "metadata" | "inputWork"> =>
  ({ metadata: units * 3, inputWork: units * 24 });

/** The current row has no pending mark. Embedding canonical manifest text
 * at most doubles its UTF-8 bytes; 1024 covers the mark's bounded commit,
 * parent, head, timestamp, punctuation and next-attempt timestamp fields.
 * This is a size upper bound, never a constructed or accepted mark. */
export function archivePendingRowBytesUpper(currentRowBytes: number, manifestBytes: number, publicationBytes = 0, replayScopeBytes = 0): number {
  const bytes = currentRowBytes + (manifestBytes + publicationBytes + replayScopeBytes) * 2 + 1024;
  if (![currentRowBytes, manifestBytes, publicationBytes, replayScopeBytes, bytes].every(natural) || currentRowBytes === 0 || manifestBytes === 0) throw new ArchiveStopped("unavailable");
  return bytes;
}
export interface ArchiveBookkeepingFootprint {
  readonly oldRowBytes: number;
  readonly markedRowBytes: number;
  readonly attemptedRowBytes: number;
  readonly manifestUnits: number;
  readonly publicationUnits?: number;
  readonly replayScopes?: number;
  readonly newRetained: number;
  readonly atomicFirstAttempt?: boolean;
}
export type ArchiveBookkeepingForecast = { readonly ok: true; readonly cost: Readonly<ArchiveCost> }
  | { readonly ok: false; readonly reason: "limit" };

/** A new v2 mark, one attempt and successful confirmation. Counts every
 * repeated row load, pending-manifest check, save, and new retained-key
 * read/update. Excludes initial target/wake work, build, object copies,
 * transport, read-back and credential work. Caller sizes may be upper
 * bounds; all actual operations still charge the original ledger. */
export function forecastArchiveBookkeeping(shape: ArchiveBookkeepingFootprint): ArchiveBookkeepingForecast {
  const { oldRowBytes, markedRowBytes, attemptedRowBytes, manifestUnits, newRetained } = shape;
  const publicationUnits = shape.publicationUnits ?? 0;
  const replayScopes = shape.replayScopes ?? 0;
  if (![oldRowBytes, markedRowBytes, attemptedRowBytes, manifestUnits, publicationUnits, replayScopes, newRetained].every(natural)
    || oldRowBytes === 0 || markedRowBytes === 0 || attemptedRowBytes === 0 || manifestUnits === 0) throw new ArchiveStopped("unavailable");
  if (Math.max(oldRowBytes, markedRowBytes, attemptedRowBytes) > ARCHIVE_ROW_BYTES
    || manifestUnits > ARCHIVE_ROW_MANIFEST_BYTES || publicationUnits > ARCHIVE_ROW_MANIFEST_BYTES || replayScopes > 64 || newRetained > 512) return { ok: false, reason: "limit" };
  // Atomic initial Mark+attempt eliminates the intermediate marked-row
  // save and its later reload/validation. Only the final confirmation
  // save has the compact closed post-state; pending saves keep the full
  // bound. All per-byte/fixed prices and both persistence cuts remain.
  const atomic = shape.atomicFirstAttempt === true, loads = atomic ? 2 : 3, saves = atomic ? 2 : 3;
  const bytes = oldRowBytes + (atomic ? 0 : markedRowBytes) + attemptedRowBytes, save = archiveRowSaveReservation();
  const confirmedSave = archiveConfirmedRowSaveReservation();
  const confirmation = archiveConfirmedSelectionReservation(manifestUnits);
  const metadata = loads * ARCHIVE_ROW_SIZE_METADATA + bytes + confirmation.metadata + newRetained * ARCHIVE_RETAINED_PASS_METADATA
    + (atomic ? 3 : 5) * replayScopes * 512;
  const inputWork = loads * ARCHIVE_ROW_SIZE_METADATA + bytes + archiveRowLoadWork(bytes)
    + (atomic ? 3 : 5) * (archivePendingManifestWork(manifestUnits + publicationUnits) + replayScopes * 1024)
    + archiveMarkWork(manifestUnits + publicationUnits + replayScopes * 256)
    + (saves - 1) * save.inputWork + confirmedSave.inputWork + confirmation.inputWork
    + newRetained * (ARCHIVE_RETAINED_PASS_METADATA + ARCHIVE_RETAINED_PASS_WORK + ARCHIVE_RETAINED_CONFIRM_WORK);
  if (![metadata, inputWork].every(natural)) throw new ArchiveStopped("unavailable");
  return { ok: true, cost: Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: loads * 2 + (saves - 1) * save.calls + confirmedSave.calls + newRetained * 2, metadata, inputWork }) };
}
