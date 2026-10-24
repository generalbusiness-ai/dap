/** Fixed native witness costs. These are debits in the original pass budget,
 * not a new allowance, transport limit or credit for locally held bytes. */
import { natural } from "@generalbusiness/dap-bytes";
import { ArchiveStopped, ARCHIVE_BOUNDS, type ArchiveCost } from "./archive-budget.ts";
import { ARCHIVE_ROW_BYTES } from "./archive-row-cost.ts";
import { JOURNAL_PARENT_FRONTIER_BYTES, JOURNAL_PARENT_FRONTIER_OBJECTS, forecastJournalParentFrontier, journalParentFrontierProfile } from "@generalbusiness/dap-git/journal";

export const ARCHIVE_FRONTIER_BYTES = 64 * 1024;
export const ARCHIVE_FRONTIER_SIZE_METADATA = 96;
/** Base64 expands at most 28,828 raw bytes to 38,440 characters. Eleven
 * descriptors (64-byte IDs, fixed type/data keys), both scope IDs, two
 * digests, format, positions, Mark digest and punctuation fit in 4,096
 * additional bytes. All envelope strings use restricted ASCII alphabets.
 * This 42,536-byte proof remains below the independent 64 KiB store cap. */
export const ARCHIVE_FRONTIER_ENCODING_BOUND = Math.ceil(JOURNAL_PARENT_FRONTIER_BYTES / 3) * 4 + 4096;
export function archiveFrontierReadCost(bytes: number): Partial<ArchiveCost> {
  // SQL string + parsed/base64 envelope + owned byte conversion. Git's
  // validator separately pays object hashing, capture copies and tree rows.
  return { metadata: bytes * 4 + JOURNAL_PARENT_FRONTIER_OBJECTS * 256, inputWork: bytes * 12 };
}
export function archiveFrontierEncodingBound(through?: number): number {
  return Math.ceil(journalParentFrontierProfile(through).bytes / 3) * 4 + 4096;
}
export function archiveFrontierEncodeCost(through?: number): Partial<ArchiveCost> {
  const bytes = archiveFrontierEncodingBound(through);
  return { metadata: bytes * 3, inputWork: bytes * 12 };
}
export function archiveFrontierWriteCost(bytes: number, calls = 1): Partial<ArchiveCost> {
  return { calls, inputWork: bytes * 3 + 4096 };
}
/** Mark text is captured once before awaiting. Six UTF-8 bytes per code
 * unit bounds canonical JSON escaping; identifiers/structure add 16 KiB.
 * The transient text, UTF-8/hash input and owned parse are all reserved. */
export function archiveFrontierMarkCost(units: number): Partial<ArchiveCost> {
  const bytes = units * 6 + 16 * 1024;
  return { metadata: bytes * 3, inputWork: bytes * 12 };
}

export interface ArchiveFrontierFinishShape {
  /** A validated v2 base is already loaded; its read is not credited back. */
  readonly hasBase: boolean;
  /** Exact selected receipt position; unspecified callers keep the full ceiling. */
  readonly through?: number;
  /** Only prepareFromSource owns capture through the private store boundary.
   * Unspecified/unknown-frontier callers retain capture + full validation. */
  readonly captureFromSource?: boolean;
  /** UTF-16 units of manifest + optional anchor publication. */
  readonly markUnits: number;
  /** Upper bound of the native row after Mark+first attempt. */
  readonly markedRowBytes: number;
}

/** Full remaining steady-state finish, starting with a loaded base (or an
 * empty first archive). Includes prospective extraction and, for unknown
 * frontiers, strict validation; source-owned preparation captures once.
 * Mark capture, both encodes and public copy, stage and promotion stay. Existing
 * base loads, build/append, native row saves/retained confirmation, parent
 * dispatch and transport remain separately priced and are never credited.
 * Conversion's bounded old-row token read also precedes this forecast. */
export function forecastArchiveFrontierFinish(shape: ArchiveFrontierFinishShape):
  { readonly ok: true; readonly cost: Readonly<ArchiveCost> } | { readonly ok: false; readonly reason: "limit" } {
  if (typeof shape.hasBase !== "boolean" || (shape.captureFromSource !== undefined && typeof shape.captureFromSource !== "boolean")
    || !natural(shape.markUnits) || !natural(shape.markedRowBytes)
    || shape.markedRowBytes === 0 || shape.markedRowBytes > ARCHIVE_ROW_BYTES) throw new ArchiveStopped("unavailable");
  const cost: ArchiveCost = { entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 };
  const add = (part: Partial<ArchiveCost>) => { for (const key of Object.keys(cost) as (keyof ArchiveCost)[]) cost[key] += part[key] ?? 0; };
  const profile = journalParentFrontierProfile(shape.through), encoded = archiveFrontierEncodingBound(shape.through);
  add(forecastJournalParentFrontier(false, shape.through));
  if (shape.captureFromSource !== true) add(forecastJournalParentFrontier(true, shape.through));
  add({ metadata: 16 * 1024, inputWork: 16 * 1024 });
  add(archiveFrontierMarkCost(shape.markUnits));
  add(archiveFrontierEncodeCost(shape.through)); add(archiveFrontierEncodeCost(shape.through));
  add({ metadata: profile.bytes + JOURNAL_PARENT_FRONTIER_OBJECTS * 256, inputWork: profile.bytes });
  // The built-object port may copy each captured body once. Include that
  // bounded source ownership in addition to the Git reader's owned copy.
  add({ metadata: profile.bytes + JOURNAL_PARENT_FRONTIER_OBJECTS * 256, inputWork: profile.bytes * 4 });
  const sizeCalls = shape.hasBase ? 4 : 6;
  add({ calls: sizeCalls, metadata: sizeCalls * ARCHIVE_FRONTIER_SIZE_METADATA, inputWork: sizeCalls * ARCHIVE_FRONTIER_SIZE_METADATA });
  // Exact pair checks compare bounded native bytes without projecting or
  // parsing the body. native() also folds metadata into input work.
  const body = (bytes: number) => {
    const comparison = archiveFrontierRowCompareCost(bytes);
    add({ calls: 1, metadata: comparison.metadata, inputWork: comparison.inputWork + comparison.metadata });
  };
  // A base token admits at most the writer's encoding bound. Each later
  // exact-pair check refuses a changed byte count before comparing its body.
  if (shape.hasBase) { body(encoded); body(encoded); }
  body(encoded);
  // The canonical pending object is contained in the marked row. Its
  // UTF-8 bytes cannot exceed either that row or its independent escape bound.
  const markText = Math.min(shape.markedRowBytes, shape.markUnits * 6 + 16 * 1024);
  for (let index = 0; index < 2; index++) add({ calls: 2, metadata: 32 * 1024 * 5 + 96 + shape.markedRowBytes + markText * 2,
    inputWork: shape.markedRowBytes * 12 + markText * 6 + 32 * 1024 * 13 + 96 });
  add(archiveFrontierWriteCost(encoded));
  add(archiveFrontierWriteCost(encoded, 2));
  if ((Object.keys(cost) as (keyof ArchiveCost)[]).some(key => !natural(cost[key]) || cost[key] > ARCHIVE_BOUNDS[key])) return { ok: false, reason: "limit" };
  return { ok: true, cost: Object.freeze(cost) };
}


/** Original checked row text retained for one opaque native context. Three
 * bytes per UTF-16 unit bounds its UTF-8 copy; repeated copies are explicit. */
export function archiveFrontierSnapshotCost(units: number, copies = 1): Partial<ArchiveCost> {
  return { metadata: units * 3 * copies + 4096, inputWork: units * 12 * copies + 4096 };
}
export function archiveFrontierRowCompareCost(bytes: number): { metadata: number; inputWork: number } {
  // Native row BLOB view, UTF-8 parameter and comparison-side BLOB view.
  return { metadata: bytes * 3 + 96, inputWork: bytes * 12 };
}
/** Remaining LOCAL finish after a checked missing-state context and remote
 * extraction. Remote calls, actual companion count admission and extraction
 * keep their separate original debits; this is only their finish escrow. */
export function forecastArchiveFrontierBootstrapFinish(rowBytes: number, through?: number):
  { readonly ok: true; readonly cost: Readonly<ArchiveCost> } | { readonly ok: false; readonly reason: "limit" } {
  if (!natural(rowBytes) || rowBytes === 0 || rowBytes > ARCHIVE_ROW_BYTES) throw new ArchiveStopped("unavailable");
  const profile = journalParentFrontierProfile(through), encoded = archiveFrontierEncodingBound(through);
  const validation = forecastJournalParentFrontier(true, through), encoding = archiveFrontierEncodeCost(through);
  const copyBytes = profile.bytes + JOURNAL_PARENT_FRONTIER_OBJECTS * 256;
  const comparison = archiveFrontierRowCompareCost(rowBytes), write = archiveFrontierWriteCost(encoded);
  const metadata = validation.metadata + (encoding.metadata ?? 0) + copyBytes * 2 + 8192 + ARCHIVE_FRONTIER_SIZE_METADATA * 3 + comparison.metadata;
  const cost: ArchiveCost = { entries: 0, attempts: validation.attempts, nodes: validation.nodes,
    calls: validation.calls + 5, metadata,
    inputWork: validation.inputWork + (encoding.inputWork ?? 0) + profile.bytes * 2 + 8192
      + ARCHIVE_FRONTIER_SIZE_METADATA * 3 + comparison.inputWork + comparison.metadata + (write.inputWork ?? 0) };
  if ((Object.keys(cost) as (keyof ArchiveCost)[]).some(key => !natural(cost[key]) || cost[key] > ARCHIVE_BOUNDS[key])) return { ok: false, reason: "limit" };
  return { ok: true, cost: Object.freeze(cost) };
}
