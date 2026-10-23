/** Decision 3e2761e6: two public Membership8 entry kinds may be retained
 * inside the three admitted native producer journals. This never admits a
 * Membership journal, a credential entry or another consumer cohort. */
import type { Digest, PlatformDefinition } from "@generalbusiness/dap-contract";
import { ARCHIVE_NATIVE_DATA } from "@generalbusiness/dap-git/archive-policy";
import { ARCHIVE_MEMBERSHIP_COPY_METADATA, archiveMembershipCopyWork } from "./archive-foreign-cost.ts";
import type { ArchiveBudget } from "./archive-budget.ts";
import type { ArchiveEntryHeader } from "./archive-entry-metadata.ts";
import { stopArchivePrefix as stop } from "./archive-prefix.ts";
import { sqlJsonText as text, type Sql } from "./sqlite.ts";

export const membershipCopyConsumer = (pin: Digest | PlatformDefinition | undefined): boolean =>
  pin !== undefined && Object.hasOwn(ARCHIVE_NATIVE_DATA, pin);

/** Exact code list and declaration citations:
 * - genesis/establish: membership.ts, membership.acts.establish. Fields are
 *   founder, founderHandle, recoveryKey and directory; effects retain those
 *   public keys/references and the role table. Inherited unchanged by
 *   invitation-key.ts membership6 and application-install-grants.ts membership7.
 * - delivery/tell/application-grants: application-install-grants.ts,
 *   membership7.receives.application-grants and membershipRules7. The input
 *   contains installGrantFields plus rules; its effect unions action names
 *   and its send returns the same public install context and result.
 * No other kind is listed, including join/enrol and invitation kinds.
 * Source pins have already checked this exact native declaration. A kind
 * match never substitutes for the complete byte-level secret-field scan. */
export function archiveMembershipCopy(sql: Pick<Sql, "exec">, content: Digest, bytes: number,
  header: ArchiveEntryHeader, consumer: Digest | PlatformDefinition | undefined, budget: ArchiveBudget): void {
  if (!membershipCopyConsumer(consumer)) return stop("unsupported-credential-cohort");
  // Reserve repeated type/length/value projections and the full-tree pass.
  // json_tree decodes escaped object keys and covers nested objects/arrays;
  // only bounded scalar metadata leaves SQLite, never a copied entry body.
  budget.spend({ inputWork: archiveMembershipCopyWork(bytes) });
  const rows = budget.native(sql, () => ({ metadata: ARCHIVE_MEMBERSHIP_COPY_METADATA, inputWork: 0 })).exec(`SELECT ${text("$.input.kind", 64)} AS genesisKind, ${text("$.input.message.class", 16)} AS class, ${text("$.input.message.type", 16)} AS type, ${text("$.input.message.body.message", 64)} AS message, EXISTS (SELECT 1 FROM json_tree(retained_input.bytes) WHERE key = 'secret') AS secret FROM retained_input WHERE kind = 'entry' AND digest = ? AND typeof(bytes) = 'text' AND octet_length(bytes) = ? LIMIT 1`, content, bytes).toArray();
  const row = rows[0];
  const listed = row && (header.input === "genesis" && row["genesisKind"] === "establish"
    || header.input === "delivery" && row["class"] === "request" && row["type"] === "tell" && row["message"] === "application-grants");
  if (rows.length !== 1 || !listed || row?.["secret"] !== 0) return stop("unsupported-credential-cohort");
  budget.check();
}
