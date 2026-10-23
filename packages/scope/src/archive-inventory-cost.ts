/** Original fixed native inventory work. No privacy, declaration, body or
 * export admission is granted; those operations still execute in full. */
import { natural } from "@generalbusiness/dap-bytes";
import { ARCHIVE_BOUNDS, ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES } from "./archive-pin.ts";

/** Reserve fixed JSON expressions and owner inspection up front. Actual
 * entry fetch/parse/hash and retained-body work are separate. */
export const ARCHIVE_PRIVACY_JSON_PASSES = 64;
export const ARCHIVE_POSITION_METADATA_BYTES = 192;
export const ARCHIVE_FRAME_SIZE_METADATA = 64;
const pinMetadata = ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES;
export const archivePinValidationWork = (): number => pinMetadata * 4;
export const archiveNativeDataReservation = (definitionBytes: number): Pick<ArchiveCost, "nodes" | "inputWork"> =>
  ({ nodes: 1, inputWork: definitionBytes * 16 });
export const archiveScopeFrameReservation = (bytes: number): Pick<ArchiveCost, "metadata" | "inputWork"> =>
  ({ metadata: bytes + 128, inputWork: bytes * 8 });
export const archiveInventoryEntryWork = (bytes: number): number => bytes * 32;
export const archiveDeclarationValidationWork = (units: number): number => units * 3 * 16;

/** Post-read declaration validation only. Use measured UTF-16 units, or
 * UTF-8 bytes as an upper bound. The original retained read, distinct-node
 * accounting, closure traversal and trusted support checks are separate.
 * Fresh inventory still validates each request, including repeat requests. */
export function forecastArchiveDeclarationValidation(units: number): Readonly<ArchiveCost> {
  const inputWork = archiveDeclarationValidationWork(units);
  if (!natural(units) || units === 0 || !natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork });
}

export interface ArchivePrefixFootprint {
  readonly entries: number;
  readonly entryBytes: number;
  readonly afterReceipt: boolean;
  readonly nativeData: boolean;
  readonly definitionBytes: number;
  /** Upper bound for the future frame. The default remains safe if a
   * later native turn changes the scope metadata during parent I/O. */
  readonly frameBytes?: number;
}
export type ArchivePrefixForecast = { readonly ok: true; readonly cost: Readonly<ArchiveCost> }
  | { readonly ok: false; readonly reason: "limit" };

/** Fresh whole-prefix metadata and original JSON-work reservation. Earlier
 * scouting pays separately; it grants no entry-count or validation credit.
 * Excludes privacy classification, inventory root/closures, body planning,
 * retained reads and the final pin fence. */
export function forecastArchivePrefix(shape: ArchivePrefixFootprint): ArchivePrefixForecast {
  const { entries, entryBytes, afterReceipt, nativeData, definitionBytes, frameBytes = ARCHIVE_SCOPE_METADATA_BYTES } = shape;
  if (![entries, entryBytes, definitionBytes, frameBytes].every(natural) || entries === 0 || entryBytes < entries
    || frameBytes === 0 || typeof afterReceipt !== "boolean" || typeof nativeData !== "boolean"
    || nativeData && definitionBytes === 0) throw new ArchiveStopped("unavailable");
  if (entries > ARCHIVE_BOUNDS.entries || frameBytes > ARCHIVE_SCOPE_METADATA_BYTES) return { ok: false, reason: "limit" };
  const pinCalls = afterReceipt ? 3 : 4, frame = archiveScopeFrameReservation(frameBytes);
  const native = nativeData ? archiveNativeDataReservation(definitionBytes) : { nodes: 0, inputWork: 0 };
  const metadata = pinCalls * pinMetadata + ARCHIVE_FRAME_SIZE_METADATA + frame.metadata + entries * ARCHIVE_POSITION_METADATA_BYTES;
  const inputWork = metadata + archivePinValidationWork() + frame.inputWork + entryBytes * ARCHIVE_PRIVACY_JSON_PASSES + native.inputWork;
  if (![metadata, inputWork].every(natural)) throw new ArchiveStopped("unavailable");
  return { ok: true, cost: Object.freeze({ entries, attempts: 0, nodes: native.nodes, calls: pinCalls + 3, metadata, inputWork }) };
}

/** Original inventory body fetch plus parse/hash/local-plan reservation.
 * Whole-prefix admission must already have succeeded before the real read.
 * Source-port and later Git reads are separate work. */
export function forecastArchiveInventoryEntry(bytes: number): Readonly<ArchiveCost> {
  const inputWork = archiveInventoryEntryWork(bytes) + bytes;
  if (!natural(bytes) || bytes === 0 || !natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: 0, inputWork });
}

/** Repeated bounded pin reads and exact cutoff size/hash check before
 * returning inventory. Nothing previously inspected is discounted. */
export function forecastArchiveInventoryFinal(afterReceipt: boolean): Readonly<ArchiveCost> {
  if (typeof afterReceipt !== "boolean") throw new ArchiveStopped("unavailable");
  const calls = (afterReceipt ? 3 : 4) + 1, metadata = (calls - 1) * pinMetadata + 128;
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls, metadata, inputWork: metadata + archivePinValidationWork() });
}
