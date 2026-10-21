/** Original in-memory foreign metadata prices, with no native SQL call or
 * metadata-to-input fold. No source/policy/body/export admission is given. */
import { natural } from "@generalbusiness/artroom-bytes";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";

export const ARCHIVE_FOREIGN_LOOKUP_METADATA = 256;
export const ARCHIVE_FOREIGN_LOOKUP_WORK = 512;
export const ARCHIVE_FOREIGN_TABLE_METADATA = 512;
export const ARCHIVE_FOREIGN_SELECTION_WORK = 1024;
export const ARCHIVE_FOREIGN_BASIS_WORK = 4096;

export function forecastArchiveForeignLookup(): Readonly<ArchiveCost> {
  return Object.freeze({ entries: 0, attempts: 1, nodes: 0, calls: 0,
    metadata: ARCHIVE_FOREIGN_LOOKUP_METADATA, inputWork: ARCHIVE_FOREIGN_LOOKUP_WORK });
}
function table(count: number, work: number): Readonly<ArchiveCost> {
  const metadata = count * ARCHIVE_FOREIGN_TABLE_METADATA, inputWork = count * work;
  if (![count, metadata, inputWork].every(natural)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata, inputWork });
}
/** Every selection copies the current descriptor list again. */
export const forecastArchiveForeignSelection = (copies: number): Readonly<ArchiveCost> => table(copies, ARCHIVE_FOREIGN_SELECTION_WORK);
/** Includes original per-source canonical-key and ordering reservation. */
export const forecastArchiveForeignBasis = (sources: number): Readonly<ArchiveCost> => table(sources, ARCHIVE_FOREIGN_BASIS_WORK);
