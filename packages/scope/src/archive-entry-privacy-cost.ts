/** Original entry classification prices. Scalar shapes grant no privacy,
 * integrity, body-read or export admission; classification still runs. */
import { natural } from "@generalbusiness/dap-bytes";
import { RETAINED_INPUT_BYTES, type Input } from "@generalbusiness/dap-contract";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";
import { ARCHIVE_PRIVACY_JSON_PASSES } from "./archive-inventory-cost.ts";

export const ARCHIVE_ENTRY_HEADER_METADATA = 512;
export const ARCHIVE_ENTRY_DETAIL_METADATA = 320;
export const archiveEntryEffectsMetadata = (effects: number): number => (effects + 1) * 512;

export interface ArchiveEntryPrivacyFootprint {
  readonly input: Input["type"];
  readonly effects: number;
  /** A foreign copy reserves its own full-entry JSON work. Local rows pay
   * that reservation in their separate fresh prefix, never twice here. */
  readonly copyBytes?: number;
}

/** Header and local owner/record/step classification only. Excludes the
 * local prefix's JSON allowance, trusted support and foreign-source scans.
 * Every native call folds its metadata charge into input work as before. */
export function forecastArchiveEntryPrivacy(shape: ArchiveEntryPrivacyFootprint):
  { readonly ok: true; readonly cost: Readonly<ArchiveCost> } | { readonly ok: false; readonly reason: "limit" } {
  const { input, effects, copyBytes } = shape;
  if (!["genesis", "act", "delivery", "timed", "diagnosis", "outcome", "preparation", "checkpoint", "floor"].includes(input)
    || !natural(effects) || copyBytes !== undefined && (!natural(copyBytes) || copyBytes === 0)) throw new ArchiveStopped("unavailable");
  if (effects > 64 || copyBytes !== undefined && copyBytes > RETAINED_INPUT_BYTES) return { ok: false, reason: "limit" };
  const detail = input === "outcome" || input === "preparation";
  const metadata = ARCHIVE_ENTRY_HEADER_METADATA + (effects ? archiveEntryEffectsMetadata(effects) : 0)
    + (detail ? ARCHIVE_ENTRY_DETAIL_METADATA : 0);
  return { ok: true, cost: Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 1 + Number(effects > 0) + Number(detail),
    metadata, inputWork: metadata + (copyBytes ?? 0) * ARCHIVE_PRIVACY_JSON_PASSES }) };
}
