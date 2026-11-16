/** AE-1 policy preparation prices shared with the later cohort proof.
 * Forecasts grant no byte, source, installation or export admission. */
import { natural } from "@generalbusiness/dap-bytes";
import { ArchiveStopped, type ArchiveCost } from "../../packages/scope/src/archive-budget.ts";
import { APPLICATION_ARCHIVE_PROOF_BYTES, APPLICATION_ARCHIVE_PROOF_METADATA_WORK, APPLICATION_ARCHIVE_PROOF_VALIDATION_WORK } from "../../packages/scope/src/applications/archive-proof.ts";
import { ARCHIVE_PIN_BYTES, ARCHIVE_SCOPE_METADATA_BYTES } from "../../packages/scope/src/archive-pin.ts";
import { PROOF_BYTE_BOUNDS } from "../../packages/scope/src/proof-bytes.ts";
const cost = (metadata: number, inputWork: number, calls = 0): Readonly<ArchiveCost> => {
  if (![metadata, inputWork, calls].every(natural)) throw new ArchiveStopped("unavailable");
  return { entries: 0, attempts: 0, nodes: 0, calls, metadata, inputWork };
};
/** Sender metadata work is fixed, not refundable with a shorter reply. */
export const forecastArchivePackageProofFixed = (): Readonly<ArchiveCost> => cost(0,
  APPLICATION_ARCHIVE_PROOF_METADATA_WORK + (PROOF_BYTE_BOUNDS.scope + ARCHIVE_PIN_BYTES + ARCHIVE_SCOPE_METADATA_BYTES) * 64);
/** The receiver settles this proportional reservation at actual reply bytes. */
export const forecastArchivePackageProofReply = (): Readonly<ArchiveCost> => cost(APPLICATION_ARCHIVE_PROOF_BYTES, APPLICATION_ARCHIVE_PROOF_BYTES * APPLICATION_ARCHIVE_PROOF_VALIDATION_WORK, 1);
/** UTF-16 input has at most three UTF-8 bytes per code unit. The existing
 * trust parser owns its 64 KiB/128-row admission limits; none change here. */
export const forecastArchiveTrustParse = (units: number): Readonly<ArchiveCost> => cost(units * 3, units * 3 * 64 + 4096);
/** One setting comparison plus fixed-width release/publisher comparisons. */
export function forecastArchiveTrustCheck(units: number, releases: number, rows: number): Readonly<ArchiveCost> {
  if (![units, releases, rows].every(natural)) throw new ArchiveStopped("unavailable");
  return cost(0, units * 3 + releases * rows * 512 + 128);
}

/** Descriptor tables hold trusted policy references, never copied bodies. */
export function forecastArchivePolicyTables(discarded: number, selected: number): Readonly<ArchiveCost> {
  if (![discarded, selected].every(natural)) throw new ArchiveStopped("unavailable");
  return cost(selected * 512, (discarded + selected) * 1024);
}
