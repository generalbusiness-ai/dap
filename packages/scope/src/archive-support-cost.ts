/** Original trusted support work, separate from declaration-body reads,
 * native data validation, entry classification and export admission. */
import { natural } from "@generalbusiness/dap-bytes";
import { ArchiveStopped, type ArchiveCost } from "./archive-budget.ts";

export const ARCHIVE_SUPPORT_OWNER_WORK = 512;
export const ARCHIVE_SUPPORT_CAPABILITY_WORK = 256;
export const ARCHIVE_SUPPORT_DECLARATION_WORK = 256;

/** Counts come from the actual trusted validation walk. No SQL port,
 * declaration payload, owner function or policy authority leaves it. */
export interface ArchiveSupportFootprint {
  readonly declarationNodes: number;
  readonly ownerKinds: number;
  readonly ownerDomains: number;
  readonly capabilityKinds: number;
}
export function forecastArchiveSupportMetadata(shape: ArchiveSupportFootprint): Readonly<ArchiveCost> {
  const { declarationNodes, ownerKinds, ownerDomains, capabilityKinds } = shape;
  if (![declarationNodes, ownerKinds, ownerDomains, capabilityKinds].every(natural)) throw new ArchiveStopped("unavailable");
  const inputWork = declarationNodes * ARCHIVE_SUPPORT_DECLARATION_WORK
    + (ownerKinds + ownerDomains) * ARCHIVE_SUPPORT_OWNER_WORK + capabilityKinds * ARCHIVE_SUPPORT_CAPABILITY_WORK;
  if (!natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork });
}
