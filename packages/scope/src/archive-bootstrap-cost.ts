/** One-time current-parent migration. Bounds describe one shallow filtered
 * response, not complete history or a larger pass allowance. */
import { natural } from "@generalbusiness/dap-bytes";
import { forecastJournalParentFrontier } from "@generalbusiness/dap-git/journal";
import { ArchiveStopped, type ArchiveBudget, type ArchiveCost, type ArchiveCapacityCheck } from "./archive-budget.ts";

export const ARCHIVE_MIGRATION_TREE_BYTES = 18 * 1024;
export const ARCHIVE_MIGRATION_COMMIT_BYTES = 1024;
export const ARCHIVE_MIGRATION_HEAD_BYTES = 1024;
// SHA-1 tree edge: mode+space+one-byte name+NUL+20-byte ID >=28.
// Every reachable tree except the root needs an edge; add commit and root.
export const ARCHIVE_MIGRATION_OBJECTS = 2 + Math.floor(ARCHIVE_MIGRATION_TREE_BYTES / 28);
export const ARCHIVE_MIGRATION_WIRE_BYTES = 32 * 1024;
export const ARCHIVE_MIGRATION_AD_BYTES = 1024;
const keys = ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const;
const sum = (...parts: readonly Partial<ArchiveCost>[]): ArchiveCost => {
  const value: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  for (const part of parts) for (const key of keys) value[key] += part[key] ?? 0;
  return value;
};
/** Capacity only: actual transport/object/copy debits are spent at their
 * corresponding boundaries. Includes the separately bounded head read. */
export function archiveMigrationReadReservation(): Readonly<ArchiveCost> {
  const bytes = ARCHIVE_MIGRATION_TREE_BYTES + ARCHIVE_MIGRATION_COMMIT_BYTES;
  // Two separately byte/frame-bounded zero-copy capability scans.
  const advertisement = 2 * 16384;
  const records = (ARCHIVE_MIGRATION_OBJECTS + 1) * 1024;
  const copies = (bytes + ARCHIVE_MIGRATION_HEAD_BYTES) * 4 + (ARCHIVE_MIGRATION_OBJECTS + 1) * 512;

  // Actual wire/declared inflation/delta construction callbacks each pay32.
  // Git's physical decoder working bound constrains total inflation/output;
  // the separately bounded head exchange has its original9216-byte cap.
  const work = (ARCHIVE_MIGRATION_WIRE_BYTES * 4 + bytes * 2
    + (ARCHIVE_MIGRATION_HEAD_BYTES + 8192) * 6) * 32;
  // The same byte callback admits transient inflation/copy metadata too.
  const metadata = advertisement + records + copies + 4096 + work / 32;
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 4, metadata,
    inputWork: metadata + work + bytes * 8 });
}
export function admitArchiveMigration(maximum: number, budget: ArchiveBudget,
  finish: Partial<ArchiveCost>, through: number, refused?: (refusal: ArchiveCapacityCheck | null) => void): boolean {
  if (!natural(maximum) || maximum < 1 || maximum > 8 * 1024 * 1024
    || Object.keys(finish).some(key => !(keys as readonly string[]).includes(key))
    || keys.some(key => !natural(finish[key] ?? 0))) throw new ArchiveStopped("unavailable");
  // This route promises the fixed tree bound, never a dynamically shrunken
  // profile that silently excludes an otherwise supported old journal.
  if (maximum < ARCHIVE_MIGRATION_TREE_BYTES + ARCHIVE_MIGRATION_COMMIT_BYTES) return false;
  const cost = sum(finish, forecastJournalParentFrontier(false, through), archiveMigrationReadReservation());
  const fits = budget.canSpend(cost);
  if (!fits) refused?.(budget.capacityRefusal(cost, "migration-quote"));
  return fits;
}
