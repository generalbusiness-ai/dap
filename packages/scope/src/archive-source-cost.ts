/** Original fixture source lookup/comparison work. No source identity,
 * reviewed policy, privacy, foreign body or export admission is granted. */
import { natural } from "@generalbusiness/dap-bytes";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";
import { archiveDeclarationValidationWork } from "./archive-inventory-cost.ts";

export const ARCHIVE_SOURCE_LOOKUP_METADATA = 512;
export const ARCHIVE_SOURCE_LOOKUP_WORK = 1024;

/** Use measured UTF-16 comparison units, or UTF-8 bytes as an upper bound.
 * A missing source still spends one attempt and the full lookup charge.
 * This lookup uses a fixture map, so it adds no native SQL call and does
 * not fold its metadata into input work. Repeat lookups pay in full. */
export function forecastArchiveSourceLookup(declarationUnits: number | null): Readonly<ArchiveCost> {
  if (declarationUnits !== null && (!natural(declarationUnits) || declarationUnits === 0)) throw new ArchiveStopped("unavailable");
  const inputWork = ARCHIVE_SOURCE_LOOKUP_WORK + (declarationUnits === null ? 0 : archiveDeclarationValidationWork(declarationUnits));
  if (!natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 1, nodes: 0, calls: 0, metadata: ARCHIVE_SOURCE_LOOKUP_METADATA, inputWork });
}
