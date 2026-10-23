/** Whole-prefix native metadata classification. No entry/value/text/foreign
 * body is returned here. Successful classification is not integrity,
 * replay, access/consent admission or permission to export. */
import type { Digest, Input } from "@generalbusiness/dap-contract";
import { isDigest, platformName } from "@generalbusiness/dap-bytes";
import { ArchiveBudget } from "./archive-budget.ts";
import { stopArchivePrefix as stop, type ArchivePrefix, type ArchivePosition } from "./archive-prefix.ts";
import type { Sql } from "./sqlite.ts";
import type { ArchiveForeignMetadata } from "./archive-foreign.ts";
import { archiveEntryHeader, archiveEntryPrivacy, archiveSupportMetadata, type ArchiveSupport } from "./archive-entry-metadata.ts";

export { archiveSupportMetadata, DEVICE_COMMAND_ARCHIVE_RECORDS, DEVICE_COMMAND_ARCHIVE_PREPARATIONS } from "./archive-entry-metadata.ts";
export type { ArchiveSupport } from "./archive-entry-metadata.ts";

export interface ArchivePrivacyPosition extends ArchivePosition { readonly input: Input["type"] }
export interface ArchivePrivacyPrefix extends Omit<ArchivePrefix, "positions"> { readonly positions: readonly ArchivePrivacyPosition[] }

export function archivePrivacyMetadata(sql: Pick<Sql, "exec">, prefix: ArchivePrefix, support: ArchiveSupport, budget: ArchiveBudget, foreign?: ArchiveForeignMetadata): ArchivePrivacyPrefix {
  budget.check();
  const named = prefix.pin.seed.definition;
  if (support.named !== named || (isDigest(named) ? support.definition.digest !== named : support.definition.declared.name !== platformName(named))) return stop("unavailable");
  archiveSupportMetadata(support, budget);
  const positions: ArchivePrivacyPosition[] = [];
  let previous: Digest | null = prefix.after?.hash ?? null;
  for (const position of prefix.positions) {
    const source = { kind: "local" as const, position }, header = archiveEntryHeader(sql, source, budget);
    if (header.seq !== position.seq || header.at.scope !== prefix.pin.at.scope || header.at.inc !== prefix.pin.at.inc || header.at.kind !== prefix.pin.at.kind) return stop("unavailable");
    if (header.prev !== previous) return stop("mismatch");
    if (header.uses !== 0) {
      if (!foreign) return stop("unsupported-foreign-copy");
      foreign.scan(position, header.uses);
    }
    archiveEntryPrivacy(sql, source, header, support, budget);
    positions.push({ ...position, input: header.input }); previous = position.hash;
  }
  budget.check();
  return { ...prefix, positions };
}
