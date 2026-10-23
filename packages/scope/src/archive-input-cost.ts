/** Native immutable-input work only. These prices neither admit a selected
 * record nor change the original budget. Foreign basis/copy setup and
 * configured source-pin work remain separate. */
import { natural } from "@generalbusiness/dap-bytes";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";
import { archiveRetainedColdReadForecast, archiveRetainedReadForecast } from "./archive-retained.ts";

export const ARCHIVE_INPUT_REQUEST_WORK = 256;
export const ARCHIVE_ENTRY_SIZE_METADATA = 128;
const ENTRY_BODY_PASSES = 8;
const RETAINED_POST_PASSES = 3;

export function archiveInputBaseReservation(entries: number, objects: number): Pick<ArchiveCost, "metadata" | "inputWork"> {
  const metadata = entries * 128 + objects * 256, inputWork = entries * 256 + objects * 512;
  if (![entries, objects, metadata, inputWork].every(natural)) throw new ArchiveStopped("unavailable");
  return { metadata, inputWork };
}
export const archiveEntryBodyWork = (bytes: number): number => bytes * ENTRY_BODY_PASSES;
export const archiveInputRetainedPostWork = (units: number): number => units * RETAINED_POST_PASSES;

/** A successful exact entry read, including size and body SQL. A miss uses
 * no more work. Actual admission still bounds the entry before any read. */
export function archiveEntryReadForecast(bytes: number): Readonly<Partial<ArchiveCost>> {
  const inputWork = ARCHIVE_INPUT_REQUEST_WORK + ARCHIVE_ENTRY_SIZE_METADATA + archiveEntryBodyWork(bytes) + bytes;
  if (!natural(bytes) || bytes === 0 || !natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ attempts: 1, calls: 2, metadata: ARCHIVE_ENTRY_SIZE_METADATA, inputWork });
}
/** Cover original cold OR repeated retained validation plus the final
 * input-port UTF-8 check. UTF-16 units never exceed the known UTF-8 bytes;
 * no cached-validation credit or assumed cache state is supplied. */
export function archiveInputRetainedReadForecast(bytes: number): Readonly<Partial<ArchiveCost>> {
  const read = archiveRetainedReadForecast(bytes), inputWork = (read.inputWork ?? 0) + archiveInputRetainedPostWork(bytes);
  if (!natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ ...read, inputWork });
}

/** The normalized new-key loop calls each key once on a newly constructed
 * input reader. The original cold read and final UTF-8 check are still paid. */
export function archiveInputColdRetainedReadForecast(bytes: number): Readonly<Partial<ArchiveCost>> {
  const read = archiveRetainedColdReadForecast(bytes), inputWork = (read.inputWork ?? 0) + archiveInputRetainedPostWork(bytes);
  if (!natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ ...read, inputWork });
}
