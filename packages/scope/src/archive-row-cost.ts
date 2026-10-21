/** Original native bookkeeping prices only. No SQL, mark, receipt,
 * selection admission, host work or extra allowance is supplied here. */
import { natural } from "@generalbusiness/artroom-bytes";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";

export const ARCHIVE_ROW_MANIFEST_BYTES = 1024 * 1024;
export const ARCHIVE_ROW_BYTES = 2 * ARCHIVE_ROW_MANIFEST_BYTES + 16 * 1024;
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
  ({ calls: 2, inputWork: ARCHIVE_ROW_BYTES * 3 + 4096 });
export const archiveConfirmedSelectionReservation = (units: number): Pick<ArchiveCost, "metadata" | "inputWork"> =>
  ({ metadata: units * 3, inputWork: units * 24 });

/** The current row has no pending mark. Embedding canonical manifest text
 * at most doubles its UTF-8 bytes; 1024 covers the mark's bounded commit,
 * parent, head, timestamp, punctuation and next-attempt timestamp fields.
 * This is a size upper bound, never a constructed or accepted mark. */
export function archivePendingRowBytesUpper(currentRowBytes: number, manifestBytes: number): number {
  const bytes = currentRowBytes + manifestBytes * 2 + 1024;
  if (![currentRowBytes, manifestBytes, bytes].every(natural) || currentRowBytes === 0 || manifestBytes === 0) throw new ArchiveStopped("unavailable");
  return bytes;
}
export interface ArchiveBookkeepingFootprint {
  readonly oldRowBytes: number;
  readonly markedRowBytes: number;
  readonly attemptedRowBytes: number;
  readonly manifestUnits: number;
  readonly newRetained: number;
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
  if (![oldRowBytes, markedRowBytes, attemptedRowBytes, manifestUnits, newRetained].every(natural)
    || oldRowBytes === 0 || markedRowBytes === 0 || attemptedRowBytes === 0 || manifestUnits === 0) throw new ArchiveStopped("unavailable");
  if (Math.max(oldRowBytes, markedRowBytes, attemptedRowBytes) > ARCHIVE_ROW_BYTES
    || manifestUnits > ARCHIVE_ROW_MANIFEST_BYTES || newRetained > 512) return { ok: false, reason: "limit" };
  const bytes = oldRowBytes + markedRowBytes + attemptedRowBytes, save = archiveRowSaveReservation();
  const confirmation = archiveConfirmedSelectionReservation(manifestUnits);
  const metadata = 3 * ARCHIVE_ROW_SIZE_METADATA + bytes + confirmation.metadata + newRetained * ARCHIVE_RETAINED_PASS_METADATA;
  const inputWork = 3 * ARCHIVE_ROW_SIZE_METADATA + bytes + archiveRowLoadWork(bytes)
    + 5 * archivePendingManifestWork(manifestUnits) + archiveMarkWork(manifestUnits)
    + 3 * save.inputWork + confirmation.inputWork
    + newRetained * (ARCHIVE_RETAINED_PASS_METADATA + ARCHIVE_RETAINED_PASS_WORK + ARCHIVE_RETAINED_CONFIRM_WORK);
  if (![metadata, inputWork].every(natural)) throw new ArchiveStopped("unavailable");
  return { ok: true, cost: Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 6 + 3 * save.calls + newRetained * 2, metadata, inputWork }) };
}
