/** Pending publication bytes are descriptive metadata, not admission proof.
 * Rebuild checks the actual collected list before reproducing its commit. */
import { canonicalize, isScopeRef, parseStrict, same, utf8, type CheckedSequence } from "@generalbusiness/dap-bytes";
import { JOURNAL_SELECTION_BYTES, JournalWork, journalAnchorPublication, journalPublicationUnits, type JournalAnchorPublication } from "@generalbusiness/dap-git/journal";
import type { ArchiveBudget } from "./archive-budget.ts";
import type { ScopeRef } from "@generalbusiness/dap-contract";

/** Full refs/digests and the finite private catalog are bounded ASCII.
 * One fact plus its distinct source record occupies at most 473 bytes
 * including delimiters; repeated facts only overreserve the source row.
 * The ordinary manifest byte ceiling still applies. */
export const archivePublicationBytesUpper = journalPublicationUnits;
export const archiveReplayScopeUnits = (count: number): number => count * 256;
/** Pass-local basis for the one unread Rules slot. Only archiveTarget's
 * checked Directory/cohort branch produces this expected role. It is not a
 * Rules birth, pin proof, CheckedSequence or persisted caller record. */
export interface ExpectedDirectoryRulesRoot {
  readonly at: ScopeRef;
  readonly directory: CheckedSequence;
  readonly role: "rules";
}
export interface ArchiveReplayContext {
  readonly checked: readonly CheckedSequence[];
  readonly directoryRules?: ExpectedDirectoryRulesRoot;
}
/** Shape-only owned snapshots for stored Mark refs. No kind or authority
 * follows from these bytes. Actual publication requires the separate guard. */
export function archiveReplayScopeRefs(value: readonly ScopeRef[], at: ScopeRef, budget: ArchiveBudget): readonly ScopeRef[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) return budget.stop("limit");
  budget.spend({ metadata: value.length * 512, inputWork: value.length * 1024 });
  const seen = new Set<string>(), owned: ScopeRef[] = [];
  for (const where of value) {
    if (!isScopeRef(where) || seen.has(where.scope)) return budget.stop("unavailable");
    seen.add(where.scope); owned.push(Object.freeze({ ...where }));
  }
  if (!owned.some(where => same(where, at))) return budget.stop("unavailable");
  return Object.freeze(owned);
}
/** Public roots require this pass's genuine already-read association, or
 * the exact expected Rules slot. Stored refs never backfill that context. */
export function archiveReplayScopes(value: readonly ScopeRef[], at: ScopeRef, budget: ArchiveBudget, context?: ArchiveReplayContext): readonly ScopeRef[] {
  const owned = archiveReplayScopeRefs(value, at, budget);
  if (!context || !Array.isArray(context.checked) || context.checked.length > 64) return budget.stop("unavailable");
  budget.spend({ metadata: context.checked.length * 512, inputWork: context.checked.length * 1024 });
  const checked = new Map<string, CheckedSequence>();
  for (const sequence of context.checked) {
    const where = sequence.at, prior = checked.get(where.scope);
    if (!isScopeRef(where) || prior) return budget.stop("unavailable");
    checked.set(where.scope, sequence);
  }
  const rules = context.directoryRules;
  if (rules && (rules.role !== "rules" || !isScopeRef(rules.at) || rules.directory.kind !== "directory"
    || !same(checked.get(rules.directory.at.scope)?.at, rules.directory.at))) return budget.stop("unavailable");
  let unreadRules = false, rulesSelected = false;
  for (const where of owned) {
    const sequence = checked.get(where.scope);
    if (rules && same(rules.at, where)) rulesSelected = true;
    if (sequence && !same(sequence.at, where)) return budget.stop("unavailable");
    // Actual Rules bytes take precedence over the expected role. A wrong
    // actual kind cannot fall through to the unread-slot allowance.
    if (rules && same(rules.at, where) && sequence && sequence.kind !== "rules") return budget.stop("unavailable");
    if (sequence) {
      if (["register", "membership", "inbox"].includes(sequence.kind)) return budget.stop("unavailable");
    } else if (!rules || !same(rules.at, where)) return budget.stop("unavailable");
    else unreadRules = true;
  }
  if (rules && !rulesSelected || checked.size !== owned.length - (unreadRules ? 1 : 0)) return budget.stop("unavailable");
  return owned;
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
