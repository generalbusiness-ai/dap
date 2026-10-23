/** Original in-memory foreign metadata prices, with no native SQL call or
 * metadata-to-input fold. No source/policy/body/export admission is given. */
import type { Input } from "@generalbusiness/dap-contract";
import { forecastArchiveEntryPrivacy } from "./archive-entry-privacy-cost.ts";
import { forecastArchiveSourceLookup } from "./archive-source-cost.ts";
import { forecastArchiveSupportMetadata, type ArchiveSupportFootprint } from "./archive-support-cost.ts";
import { natural } from "@generalbusiness/dap-bytes";
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

export const ARCHIVE_FOREIGN_COPY_REQUEST_WORK = 512;
export const ARCHIVE_FOREIGN_COPY_SIZE_METADATA = 128;
export const ARCHIVE_FOREIGN_GENESIS_METADATA = 512;
export const ARCHIVE_FOREIGN_USE_METADATA = 768;
export const archiveForeignRepeatWork = (bytes: number): number => bytes * 64;
export const archiveForeignUseMetadata = (uses: number): number => (uses + 1) * ARCHIVE_FOREIGN_USE_METADATA;

/** SQL metadata is folded into input work by the native ledger. */
function foreignNativeMetadata(metadata: number): Readonly<ArchiveCost> {
  if (!natural(metadata)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 1, metadata, inputWork: metadata });
}
/** Only the local direct-uses projection. Per-copy admission is separate. */
export function forecastArchiveForeignScan(uses: number): Readonly<ArchiveCost> {
  if (!natural(uses)) throw new ArchiveStopped("unavailable");
  return foreignNativeMetadata(archiveForeignUseMetadata(uses));
}
/** Every cold or repeated copied-content request pays this attempt. */
export const forecastArchiveForeignCopyRequest = (): Readonly<ArchiveCost> =>
  Object.freeze({ entries: 0, attempts: 1, nodes: 0, calls: 0, metadata: 0, inputWork: ARCHIVE_FOREIGN_COPY_REQUEST_WORK });
/** Repeated copies add the original full-byte comparison reservation;
 * earlier metadata admission gives no attempt or validation credit. */
export function forecastArchiveForeignRepeat(bytes: number): Readonly<ArchiveCost> {
  const inputWork = ARCHIVE_FOREIGN_COPY_REQUEST_WORK + archiveForeignRepeatWork(bytes);
  if (!natural(bytes) || bytes === 0 || !natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 1, nodes: 0, calls: 0, metadata: 0, inputWork });
}
/** Cold keyed size and genesis binding only, not header/privacy/support. */
export const forecastArchiveForeignCopySize = (): Readonly<ArchiveCost> => foreignNativeMetadata(ARCHIVE_FOREIGN_COPY_SIZE_METADATA);
export const forecastArchiveForeignGenesis = (): Readonly<ArchiveCost> => foreignNativeMetadata(ARCHIVE_FOREIGN_GENESIS_METADATA);

export const ARCHIVE_MEMBERSHIP_COPY_METADATA = 512;
export const archiveMembershipCopyWork = (bytes: number): number => bytes * 16;
/** The public-copy kind/secret-field scan still runs and may refuse. */
export function forecastArchiveMembershipCopy(bytes: number): Readonly<ArchiveCost> {
  const inputWork = ARCHIVE_MEMBERSHIP_COPY_METADATA + archiveMembershipCopyWork(bytes);
  if (!natural(bytes) || bytes === 0 || !natural(inputWork)) throw new ArchiveStopped("unavailable");
  return Object.freeze({ entries: 0, attempts: 0, nodes: 0, calls: 1, metadata: ARCHIVE_MEMBERSHIP_COPY_METADATA, inputWork });
}

export interface ArchiveForeignColdFootprint {
  readonly bytes: number;
  readonly input: Input["type"];
  readonly effects: number;
  readonly declarationUnits: number;
  readonly support: ArchiveSupportFootprint;
  readonly membership8: boolean;
  /** Internally selected source provenance; every cold policy join rebinds it. */
  readonly staticNative?: boolean;
}
/** One cold copy request after direct-use projection. Includes original
 * size/header/privacy, source lookup/comparison, support and optional native
 * Membership8/genesis checks. The owner separately unions the exact source
 * declaration with ALL local/foreign distinct nodes. Map lookups, selected
 * descriptor tables, later body validation and export admission are separate.
 * Metadata sizes/classes must be rebound before this quote survives an await. */
export function forecastArchiveForeignColdCopy(shape: ArchiveForeignColdFootprint):
  { readonly ok: true; readonly work: Readonly<Pick<ArchiveCost, "attempts" | "calls" | "metadata" | "inputWork">> }
  | { readonly ok: false; readonly reason: "limit" } {
  if (typeof shape.membership8 !== "boolean" || shape.staticNative !== undefined && typeof shape.staticNative !== "boolean") throw new ArchiveStopped("unavailable");
  const privacy = forecastArchiveEntryPrivacy({ input: shape.input, effects: shape.effects, copyBytes: shape.bytes });
  if (!privacy.ok) return privacy;
  const work = { attempts: 0, calls: 0, metadata: 0, inputWork: 0 };
  const add = (cost: Readonly<ArchiveCost>) => {
    for (const key of Object.keys(work) as (keyof typeof work)[]) work[key] += cost[key];
  };
  add(forecastArchiveForeignCopyRequest()); add(forecastArchiveForeignCopySize()); add(privacy.cost);
  add(forecastArchiveSourceLookup(shape.declarationUnits));
  if (shape.staticNative) add(forecastArchiveSourceLookup(null)); add(forecastArchiveSupportMetadata(shape.support));
  if (shape.input === "genesis") add(forecastArchiveForeignGenesis());
  if (shape.membership8) add(forecastArchiveMembershipCopy(shape.bytes));
  if (!Object.values(work).every(natural)) throw new ArchiveStopped("unavailable");
  return { ok: true, work: Object.freeze(work) };
}
