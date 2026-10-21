/** Measure only keys named by the native metadata plan. Preserve every
 * request and ordered probe choice: size/existence chooses no valid body.
 * The owning synchronous frame separately admits declarations/privacy and
 * protects its selected prefix's finish forecast during lookahead. */
import { RETAINED_INPUT_BYTES, type Bounds } from "@generalbusiness/dap-contract";
import type { PlannedRetainedDependency, RetainedKey } from "@generalbusiness/dap-derive";
import { ARCHIVE_BOUNDS, type ArchiveCost } from "./archive-budget.ts";
import { ArchiveRetainedReader, archiveRetainedReadForecast } from "./archive-retained.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import { readArchiveTextBytes } from "./archive-text.ts";

export interface ArchiveReferenceMeasurement {
  readonly plan: PlannedRetainedDependency;
  readonly candidates: readonly { readonly key: RetainedKey; readonly bytes: number | null; readonly heldBytes?: number | null }[];
  readonly textBytes?: number | null;
}
export function measureArchiveReferences(reader: ArchiveRetainedReader, plans: readonly PlannedRetainedDependency[],
  bounds: Pick<Bounds, "definitionBytes">, allSizes = false): { readonly measurements: readonly ArchiveReferenceMeasurement[]; readonly reads: Partial<ArchiveCost> } {
  const budget = reader.budget, measurements: ArchiveReferenceMeasurement[] = [], reads: Partial<ArchiveCost> = {};
  const add = (cost: Partial<ArchiveCost>) => {
    for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof ArchiveCost)[]) reads[key] = (reads[key] ?? 0) + (cost[key] ?? 0);
  };
  for (const plan of plans) {
    budget.spend({ metadata: 512, inputWork: 1024 });
    const dependency = plan.dependency;
    if (dependency.mode === "text") {
      const textBytes = readArchiveTextBytes(reader.sql, dependency.key.digest, budget);
      // Inventory counts it again; no text body is ever selected.
      add(archiveRetainedReadForecast(null));
      measurements.push({ plan, candidates: [], textBytes });
      continue;
    }
    const keys = dependency.mode === "probe" ? dependency.choices : [{ key: dependency.key }];
    budget.spend({ metadata: keys.length * 512, inputWork: keys.length * 1024 });
    const candidates: { key: RetainedKey; bytes: number | null; heldBytes?: number | null }[] = [];
    for (const { key } of keys) {
      const max = key.kind === "definition" ? Math.min(plan.max, bounds.definitionBytes) : plan.max;
      const heldBytes = reader.measure(key, allSizes ? RETAINED_INPUT_BYTES : max);
      const bytes = heldBytes !== null && heldBytes <= max ? heldBytes : null;
      candidates.push({ key, bytes, ...(allSizes ? { heldBytes } : {}) });
      add(archiveRetainedReadForecast(bytes));
    }
    // A present but invalid candidate remains undecided until byte validation.
    // If all are absent/oversized, the native consumer cannot succeed.
    if (candidates.every(candidate => candidate.bytes === null)) return stop("incomplete");
    measurements.push({ plan, candidates });
  }
  budget.check();
  return { measurements, reads };
}
