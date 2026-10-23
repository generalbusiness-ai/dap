/** Pending publication bytes are descriptive metadata, not admission proof.
 * Rebuild checks the actual collected list before reproducing its commit. */
import { canonicalize, isScopeRef, parseStrict, same, utf8 } from "@generalbusiness/dap-bytes";
import { JOURNAL_SELECTION_BYTES, JournalWork, journalAnchorPublication, journalPublicationUnits, type JournalAnchorPublication } from "@generalbusiness/dap-git/journal";
import type { ArchiveBudget } from "./archive-budget.ts";
import type { ScopeRef } from "@generalbusiness/dap-contract";

/** Full refs/digests are bounded ASCII; 512 covers one canonical fact and
 * its punctuation. The ordinary manifest byte ceiling still applies. */
export const archivePublicationBytesUpper = journalPublicationUnits;
export const archiveReplayScopeUnits = (count: number): number => count * 256;
/** Descriptive public identities bound into one pending Mark. This is not
 * a source birth/pin, privacy admission or an authority certificate. */
export function archiveReplayScopes(value: readonly ScopeRef[], at: ScopeRef, budget: ArchiveBudget): readonly ScopeRef[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) return budget.stop("limit");
  budget.spend({ metadata: value.length * 512, inputWork: value.length * 1024 });
  const seen = new Set<string>(), owned: ScopeRef[] = [];
  for (const where of value) {
    if (!isScopeRef(where) || ["register", "membership", "inbox"].includes(where.kind) || seen.has(where.scope)) return budget.stop("unavailable");
    seen.add(where.scope); owned.push(Object.freeze({ ...where }));
  }
  if (!owned.some(where => same(where, at))) return budget.stop("unavailable");
  return Object.freeze(owned);
}
export function writeArchivePublication(value: JournalAnchorPublication, budget: ArchiveBudget): string {
  const upper = archivePublicationBytesUpper(value.anchors.length + (value.legacyAnchors?.anchors.length ?? 0));
  budget.spend({ metadata: upper, inputWork: upper * 12 });
  const bytes = canonicalize(value);
  if (bytes.length > upper || bytes.length > JOURNAL_SELECTION_BYTES || utf8(bytes).length > upper || utf8(bytes).length > JOURNAL_SELECTION_BYTES) return budget.stop("limit");
  return bytes;
}
export function readArchivePublication(bytes: string, copies: number, first: number, budget: ArchiveBudget, archived: readonly ScopeRef[] = []): JournalAnchorPublication {
  if (typeof bytes !== "string" || bytes.length === 0 || bytes.length > JOURNAL_SELECTION_BYTES) return budget.stop("limit");
  budget.spend({ metadata: bytes.length * 3, inputWork: bytes.length * 36 });
  if (utf8(bytes).length > JOURNAL_SELECTION_BYTES) return budget.stop("limit");
  let value: unknown;
  try { value = parseStrict(bytes); if (canonicalize(value) !== bytes) return budget.stop("unavailable"); }
  catch { return budget.stop("unavailable"); }
  return journalAnchorPublication(value, copies, first, new JournalWork(budget), archived);
}
