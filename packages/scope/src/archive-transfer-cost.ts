/** Original object-copy and send preparation prices. No object bytes,
 * provider read, append validation, credentials or admission are supplied. */
import { natural } from "@generalbusiness/dap-bytes";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";

export const ARCHIVE_TRANSFER_OBJECTS = 8192;
const MAXIMUM_BYTES = 8 * 1024 * 1024;
export const archiveObjectListMetadata = (objects: number): number => objects * 128;
export const archiveObjectCopyWork = (bytes: number): number => bytes * 4;
export const archiveSendPackWork = (bytes: number): number => bytes * 8;
export const archiveSendCopyReservation = (objects: number, bytes: number): Pick<ArchiveCost, "metadata" | "inputWork"> =>
  ({ metadata: archiveObjectListMetadata(objects), inputWork: archiveObjectCopyWork(bytes) });

export type ArchiveTransferForecast = { readonly ok: true; readonly cost: Readonly<ArchiveCost> }
  | { readonly ok: false; readonly reason: "limit" };

/** One outgoing driver copy; an incremental send also copies and packs
 * the supplied set. The generic first send has no additional native-ledger
 * charge at those sites; its transport still enforces its own work bounds.
 * Sizes may conservatively include duplicate construction attempts. This
 * does not price parent reads already performed, append validation,
 * bookkeeping, host operations or the original deadline. */
export function forecastArchiveTransfer(shape: { readonly objects: number; readonly bytes: number;
  readonly incremental: boolean; readonly maximum?: number }): ArchiveTransferForecast {
  const { objects, bytes, incremental, maximum = MAXIMUM_BYTES } = shape;
  if (![objects, bytes, maximum].every(natural) || maximum === 0 || maximum > MAXIMUM_BYTES
    || typeof incremental !== "boolean") throw new ArchiveStopped("unavailable");
  if (objects > ARCHIVE_TRANSFER_OBJECTS || bytes > maximum) return { ok: false, reason: "limit" };
  const copy = archiveSendCopyReservation(objects, bytes);
  const metadata = copy.metadata * (incremental ? 2 : 1);
  const inputWork = copy.inputWork * (incremental ? 2 : 1) + (incremental ? archiveSendPackWork(bytes) : 0);
  return { ok: true, cost: Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata, inputWork }) };
}
