/** Selection-to-layout boundary. A rebuild spends a new pass's finite
 * allowance on the stored manifest and exact immutable dependencies. */
import { same } from "@generalbusiness/artroom-bytes";
import type { Bounds, Head, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, parseStrict, utf8 } from "@generalbusiness/artroom-bytes";
import { buildJournalArchive, buildJournalPass, convertJournalArchiveV1, JOURNAL_SELECTION_BYTES, journalSelection, journalPassSelection, JournalWork, type JournalArchive, type JournalPassArchive, type JournalSelection, type JournalPassSelection, type JournalCost, type JournalFormat, type JournalLayoutResult, type JournalObjectSource } from "@generalbusiness/artroom-git/journal";
import { ARCHIVE_BOUNDS, ArchiveBudget, ArchiveStopped } from "./archive-budget.ts";
import { archiveInput } from "./archive-input.ts";
import { inventoryArchive, type ArchivePolicyRegistry } from "./archive-inventory.ts";
import type { ArchiveMark, ArchiveRow } from "./archive-row.ts";
import type { Sql } from "./sqlite.ts";
import { ArchivePrefixStopped, type ArchivePrefixReason } from "./archive-prefix.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";

type LayoutFailure = Extract<JournalLayoutResult, { ok: false }>;
export type ArchiveBuildFailure = LayoutFailure | { readonly ok: false; readonly reason: ArchivePrefixReason | "rebuild-mismatch" | "manifest" };
export type ArchiveBuildResult = { readonly ok: true; readonly archive: JournalArchive } | ArchiveBuildFailure;
export type ArchivePassBuildResult = { readonly ok: true; readonly archive: JournalPassArchive } | ArchiveBuildFailure;
type Parent = { readonly id: string; readonly source: JournalObjectSource } | null;

/** Conversion is a bounded re-admission of the confirmed v1 prefix, never
 * a new cutoff or an outstanding v1 attempt. Matching its complete tree
 * establishes byte preservation before any new receipt can be marked. */
export async function planArchiveConversion(sql: Sql, context: { readonly row: ArchiveRow; readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly parent: Parent; readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins }, budget: ArchiveBudget): Promise<ArchiveBuildFailure | { readonly ok: true; readonly archive: JournalPassArchive; readonly mark: ArchiveMark }> {
  const row = context.row, confirmed = row.confirmed;
  if (!confirmed || confirmed.layout === 2 || row.pending || row.stopped || context.parent?.id !== confirmed.commit) return { ok: false, reason: "manifest" };
  const at = { ...row.at }, through = { ...confirmed.through }, commit = confirmed.commit, format = row.format;
  const parent = { ...context.parent }, markedAt = context.markedAt, fixtureSources = context.fixtureSources;
  const selected = inventoryArchive(sql, at, through, context.bounds, context.policies, budget, fixtureSources, null);
  if (!selected.ok) return selected;
  budget.spend({ inputWork: JOURNAL_SELECTION_BYTES * 3 });
  const manifest = canonicalize(selected.inventory);
  if (manifest.length > JOURNAL_SELECTION_BYTES || utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  const built = await convertJournalArchiveV1({ format, selection: manifest,
    input: archiveInput(sql, selected.inventory, budget, fixtureSources), parent, budget });
  if (!built.ok) return built;
  return { ...built, mark: { commit: built.archive.commit, parent: commit, through, manifest, markedAt, layout: 2 } };
}

/** Bounds the metadata before parsing or encoding it. The recorded inventory
 * cost is a work reservation on restart, not evidence of privacy admission.
 * Spending it decreases this pass's original allowance; nothing tops it up. */
function storedSelection(manifest: string, budget: ArchiveBudget, incremental: true): JournalPassSelection | null;
function storedSelection(manifest: string, budget: ArchiveBudget, incremental?: false): JournalSelection | null;
function storedSelection(manifest: string, budget: ArchiveBudget, incremental = false): JournalSelection | JournalPassSelection | null {
  budget.check();
  if (manifest.length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  budget.spend({ inputWork: manifest.length * 3 * 12, metadata: manifest.length * 3 });
  if (utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  let value: unknown;
  try { value = parseStrict(manifest); if (canonicalize(value) !== manifest) return null; }
  catch { return null; }
  if (!isRecord(value) || !isRecord(value["cost"])) return null;
  const cost = value["cost"], live = budget.admitted(), additional: Partial<JournalCost> = {};
  if (Object.keys(cost).sort().join(",") !== Object.keys(ARCHIVE_BOUNDS).sort().join(",")) return null;
  for (const key of Object.keys(ARCHIVE_BOUNDS) as (keyof JournalCost)[]) {
    const amount = cost[key];
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0 || Object.is(amount, -0) || amount > ARCHIVE_BOUNDS[key]) return null;
    additional[key] = Math.max(0, amount - live[key]);
  }
  budget.spend(additional);
  try { return incremental ? journalPassSelection(manifest, new JournalWork(budget)) : journalSelection(manifest, new JournalWork(budget)); }
  catch (error) {
    if (error instanceof ArchiveStopped) throw error;
    if (error && typeof error === "object" && "reason" in error && (error.reason === "limit" || error.reason === "timeout" || error.reason === "unavailable")) budget.stop(error.reason);
    return null;
  }
}

/** A bounded new interval, with the previous confirmed position explicit.
 * Every old retained key is named by its stored original pass. */
export async function planArchivePass(sql: Sql, context: { readonly at: ScopeRef; readonly through: Head; readonly after: Head | null; readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly format: JournalFormat; readonly parent: Parent; readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins }, budget: ArchiveBudget): Promise<ArchiveBuildFailure | { readonly ok: true; readonly archive: JournalPassArchive; readonly mark: ArchiveMark }> {
  const at = { ...context.at }, through = { ...context.through }, after = context.after ? { ...context.after } : null;
  const parent = context.parent ? { ...context.parent } : null, format = context.format, markedAt = context.markedAt, fixtureSources = context.fixtureSources;
  const selected = inventoryArchive(sql, at, through, context.bounds, context.policies, budget, fixtureSources, after);
  if (!selected.ok) return selected;
  budget.spend({ inputWork: JOURNAL_SELECTION_BYTES * 3 });
  const manifest = canonicalize(selected.inventory);
  if (manifest.length > JOURNAL_SELECTION_BYTES || utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  const built = await buildJournalPass({ format, selection: manifest, input: archiveInput(sql, selected.inventory, budget, fixtureSources), parent, budget });
  if (!built.ok) return built;
  return { ...built, mark: { commit: built.archive.commit, parent: parent?.id ?? null, through: { ...selected.inventory.through }, manifest, markedAt, layout: 2 } };
}

/** Restart follows the marked interval and pass references exactly. It
 * neither inventories today's rows nor reads a prior journal entry. */
export async function rebuildArchivePass(sql: Sql, row: ArchiveRow, parent: Parent, budget: ArchiveBudget, fixtureSources?: FixtureArchiveSourcePins): Promise<ArchivePassBuildResult> {
  const mark = row.pending ? { ...row.pending, through: { ...row.pending.through } } : null, at = { ...row.at }, format = row.format, base = parent ? { ...parent } : null;
  if (!mark || mark.layout !== 2 || mark.parent !== (base?.id ?? null)) return { ok: false, reason: "manifest" };
  const selection = storedSelection(mark.manifest, budget, true);
  if (!selection || !same(selection.at, at) || !same(selection.through, mark.through)) return { ok: false, reason: "manifest" };
  const conversion = row.confirmed !== null && row.confirmed.layout !== 2;
  if (conversion && (selection.after !== null || !same(mark.through, row.confirmed!.through))
    || !conversion && !same(selection.after, row.confirmed?.through ?? null)) return { ok: false, reason: "manifest" };
  let input: ReturnType<typeof archiveInput>;
  try { input = archiveInput(sql, selection, budget, fixtureSources); }
  catch (error) {
    if (error instanceof ArchivePrefixStopped) return { ok: false, reason: error.reason };
    throw error;
  }
  const build = conversion ? convertJournalArchiveV1 : buildJournalPass;
  const built = await build({ format, selection: mark.manifest, input, parent: base, budget });
  if (!built.ok) return built;
  if (built.archive.commit !== mark.commit) return { ok: false, reason: "rebuild-mismatch" };
  return built;
}

/** Initial planning uses the native synchronous inventory and its explicit
 * caller-owned fixture/reviewed policy registry. It does not mark or send. */
export async function planArchive(sql: Sql, context: { readonly at: ScopeRef; readonly through: Head; readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly format: JournalFormat; readonly parent: Parent; readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins }, budget: ArchiveBudget): Promise<ArchiveBuildFailure | { readonly ok: true; readonly archive: JournalArchive; readonly mark: ArchiveMark }> {
  const at = { ...context.at }, through = { ...context.through }, parent = context.parent ? { ...context.parent } : null, format = context.format, markedAt = context.markedAt;
  const fixtureSources = context.fixtureSources;
  const selected = inventoryArchive(sql, at, through, context.bounds, context.policies, budget, fixtureSources);
  if (!selected.ok) return selected;
  budget.spend({ inputWork: JOURNAL_SELECTION_BYTES * 3 });
  const manifest = canonicalize(selected.inventory);
  if (manifest.length > JOURNAL_SELECTION_BYTES || utf8(manifest).length > JOURNAL_SELECTION_BYTES) budget.stop("limit");
  const built = await buildJournalArchive({ format, selection: manifest, input: archiveInput(sql, selected.inventory, budget, fixtureSources), parent, budget });
  if (!built.ok) return built;
  return { ...built, mark: { commit: built.archive.commit, parent: parent?.id ?? null, through: { ...selected.inventory.through }, manifest, markedAt } };
}

/** No new inventory is computed after Mark. The caller supplies only the
 * marked parent's bounded object port; current head/retained sets are unread. */
export async function rebuildArchive(sql: Sql, row: ArchiveRow, parent: Parent, budget: ArchiveBudget, fixtureSources?: FixtureArchiveSourcePins): Promise<ArchiveBuildResult> {
  const mark = row.pending ? { ...row.pending, through: { ...row.pending.through } } : null, at = { ...row.at }, format = row.format, base = parent ? { ...parent } : null;
  if (!mark || mark.parent !== (base?.id ?? null)) return { ok: false, reason: "manifest" };
  const selection = storedSelection(mark.manifest, budget);
  if (!selection || !same(selection.at, at) || !same(selection.through, mark.through)) return { ok: false, reason: "manifest" };
  let input: ReturnType<typeof archiveInput>;
  try { input = archiveInput(sql, selection, budget, fixtureSources); }
  catch (error) {
    if (error instanceof ArchivePrefixStopped) return { ok: false, reason: error.reason };
    throw error;
  }
  const built = await buildJournalArchive({ format, selection: mark.manifest, input, parent: base, budget });
  if (!built.ok) return built;
  if (built.archive.commit !== mark.commit) return { ok: false, reason: "rebuild-mismatch" };
  return built;
}
