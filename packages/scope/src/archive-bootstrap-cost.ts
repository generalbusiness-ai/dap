/** One-time complete-closure bootstrap, within the original pass allowance.
 * These conservative logical prices do not measure JavaScript heap usage. */
import { natural } from "@generalbusiness/dap-bytes";
import { forecastJournalParentFrontier } from "@generalbusiness/dap-git/journal";
import { ArchiveStopped, type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import { ARCHIVE_TRANSFER_OBJECTS, archiveSendCopyReservation } from "./archive-transfer-cost.ts";

const MAXIMUM_BYTES = 8 * 1024 * 1024;
// The ratio comes from the existing transport ceilings, not another quota.
const BYTES_PER_OBJECT = MAXIMUM_BYTES / ARCHIVE_TRANSFER_OBJECTS;
const keys = ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const;
export interface ArchiveBootstrapBounds { readonly bytes: number; readonly objects: number }
function sum(...parts: readonly Partial<ArchiveCost>[]): ArchiveCost {
  const value: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  for (const part of parts) for (const key of keys) value[key] += part[key] ?? 0;
  return value;
}
export function archiveBootstrapReadCost(most: ArchiveBootstrapBounds): Readonly<ArchiveCost> {
  const { bytes, objects } = most;
  if (!natural(bytes) || bytes < 41 || bytes > MAXIMUM_BYTES || !natural(objects) || objects < 1
    || objects > ARCHIVE_TRANSFER_OBJECTS || 32 + objects * 9 > bytes) throw new ArchiveStopped("unavailable");
  // Per entry: decoder records/dependency maps (1024), closure seen/stack,
  // collected descriptors/list, IDs and result memberships (another 1024).
  // A SHA-1 tree row occupies at least 28 bytes; a commit parent line is
  // longer. One final incomplete row may precede a malformed-body refusal.
  // The 512 fee includes row/name/ID metadata and duplicate queued edges.
  const rows = Math.floor(bytes / 28) + 1;
  // Advertisement strings, packets, refs and capability tokens are also
  // priced. A one-character capability plus separator uses two bytes; its
  // logical string/list metadata fits 128 units. Ref/packet records are
  // less dense. This separate 64*bytes fee does not assume pack count bounds
  // the advertisement. It deliberately overprices ordinary short replies.
  const metadata = 1024 + objects * 2048 + bytes * 64 + rows * 512;
  // All metadata participates in input work. Another 64 per wire byte covers
  // the existing exchange/decode multiple (32), closure parsing/hashing and
  // bounded adapter copies (32). The driver's later owned copy is separate.
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 2, metadata, inputWork: metadata + bytes * 64 });
}

/** Select before entering lookahead: canSpend itself does not include its
 * active reserve. The adapter subsequently spends only the read profile;
 * the finish/capture/driver-copy terms remain capacity, never a credit. */
export function selectArchiveBootstrapBounds(maximum: number, budget: ArchiveBudget,
  finish: Partial<ArchiveCost>): ArchiveBootstrapBounds | null {
  if (!natural(maximum) || maximum === 0 || maximum > MAXIMUM_BYTES
    || Object.keys(finish).some(key => !(keys as readonly string[]).includes(key))
    || keys.some(key => !natural(finish[key] ?? 0))) throw new ArchiveStopped("unavailable");
  // Fewer than 64 binary-search probes, their small cost records and checks.
  // Selection is charged even when no closure can be admitted.
  budget.spend({ metadata: 16 * 1024, inputWork: 64 * 1024 });
  if (maximum < 41) return null;
  const capture = forecastJournalParentFrontier();
  const fits = (bytes: number, objects: number) => budget.canSpend(sum(finish, capture,
    archiveSendCopyReservation(objects, bytes), archiveBootstrapReadCost({ bytes, objects })));
  const largest = (low: number, high: number, predicate: (value: number) => boolean): number | null => {
    if (!predicate(low)) return null;
    while (low < high) {
      const middle = low + Math.ceil((high - low) / 2);
      if (predicate(middle)) low = middle; else high = middle - 1;
    }
    return low;
  };
  const ceiling = Math.min(ARCHIVE_TRANSFER_OBJECTS, Math.floor((maximum - 32) / 9));
  // Start on the ratio of the two original ceilings, then use any capacity
  // left for bytes and count. This is deterministic, not an arbitrary fixed
  // compatibility cap. Native work may refuse well below 8 MiB/8192 objects.
  const count = largest(1, ceiling, n => fits(Math.min(maximum, n * BYTES_PER_OBJECT), n));
  if (count === null) return null;
  const bytes = largest(Math.min(maximum, count * BYTES_PER_OBJECT), maximum, n => fits(n, count))!;
  const objects = largest(count, Math.min(ARCHIVE_TRANSFER_OBJECTS, Math.floor((bytes - 32) / 9)), n => fits(bytes, n))!;
  return Object.freeze({ bytes, objects });
}
