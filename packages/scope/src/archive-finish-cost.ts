/** Remaining finish arithmetic shared by adaptive scouting and the owning
 * fixed-prefix build. Completed native inventory is not a transferable credit. */
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { JournalPassPreparation, JOURNAL_SELECTION_BYTES, forecastJournalAppendFixed, forecastJournalCommit,
  forecastJournalPassBody, forecastJournalSelection, type JournalFormat, type JournalObject, type JournalObjectSource } from "@generalbusiness/dap-git/journal";
import type { ArchiveBudget, ArchiveCost } from "./archive-budget.ts";
import type { ArchiveScoutLayoutQuote } from "./archive-scout-layout.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { archivePublicationBytesUpper, archiveReplayScopeUnits } from "./archive-publication.ts";
import { archivePendingRowBytesUpper, forecastArchiveBookkeeping } from "./archive-row-cost.ts";
import { forecastArchiveTransfer } from "./archive-transfer-cost.ts";
import { forecastArchiveFrontierFinish } from "./archive-frontier-cost.ts";

const empty = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
function sum(...costs: readonly Partial<ArchiveCost>[]): ArchiveCost {
  const result = empty();
  for (const cost of costs) for (const key of Object.keys(result) as (keyof ArchiveCost)[]) result[key] += cost[key] ?? 0;
  return result;
}
export interface ArchiveParentMetadata { readonly ids: readonly string[]; readonly objects: number; readonly bytes: number }
interface ArchiveFinishContext {
  readonly format: JournalFormat;
  readonly parent: { readonly id: string; readonly source: JournalObjectSource } | null;
  readonly fixtureSources?: FixtureArchiveSourcePins;
  readonly replayScopes?: readonly ScopeRef[];
  readonly atomicFirstAttempt?: boolean;
  readonly maximum: number;
}
export function archiveParentMetadata(context: { readonly parentUsed: ReadonlySet<string>; readonly parentHeld: ReadonlyMap<string, JournalObject> }, budget: ArchiveBudget): ArchiveParentMetadata {
  budget.spend({ metadata: 128 + context.parentUsed.size * 128, inputWork: 256 + context.parentUsed.size * 256 });
  const ids: string[] = []; let bytes = 0;
  for (const id of context.parentUsed) {
    const object = context.parentHeld.get(id);
    if (!object) return budget.stop("unavailable");
    ids.push(id); bytes += object.data.length;
  }
  return Object.freeze({ ids: Object.freeze(ids), objects: ids.length, bytes });
}
export function forecastArchiveFinish(context: ArchiveFinishContext, preparation: JournalPassPreparation, shape: ArchiveScoutLayoutQuote, through: Head,
  inventory: ArchiveCost, oldRowBytes: number, rowContextBytes: number, parent: ArchiveParentMetadata, setup: ArchiveCost, legacyAnchors: number, budget: ArchiveBudget): ArchiveCost | null {
  // A copied fact can be needed without being written in a local entry.
  // The scout paid for a necessary-key count on each selected local row.
  // It includes nested FactRefs and of/head observations independently of
  // copied objects, with harmless false positives from unrelated keys.
  // Final paid collection, not this quote, chooses the published list.
  const anchors = shape.copies + shape.anchorCandidates, total = anchors + legacyAnchors;
  const publicationUnits = archivePublicationBytesUpper(total);
  if (![anchors, total, publicationUnits].every(n => Number.isSafeInteger(n) && n >= 0)) return null;
  const sources = context.fixtureSources?.publicationFootprint(budget);
  // Each admitted public copy can add one producer to the target's public
  // identities. Duplicates/private copies only reduce the actual union.
  const scopeBase = context.replayScopes?.length ?? 1, scopes = scopeBase + shape.copies;
  if (![scopeBase, shape.copies, scopes].every(n => Number.isSafeInteger(n) && n >= 0)
    || scopeBase === 0 || scopes > 64) return null;
  const publication = sum(sources?.lookups ?? {}, { nodes: scopes,
    metadata: shape.entryBytes + scopes * 1024 + (context.replayScopes ? shape.copies * 512 : 0)
      + anchors * 512 + total * (512 * 3 + 128) + publicationUnits * 4,
    // A canonical full FactRef occupies at least 128 bytes. Its repeated
    // 1024-unit visit is bounded by 8*entryBytes, in addition to parsing.
    inputWork: shape.entryBytes * 16 + shape.objects * (2048 + 2 * 128 + (context.replayScopes ? 1024 : 0)) + scopes * 2048
      + anchors * 1024 * (Math.ceil(Math.log2(anchors + 1)) + 1) + total * 3 * 1024 + publicationUnits * 48 });
  const publishedShape = { ...shape, manifestRows: shape.manifestRows + total, selectionUnits: shape.selectionUnits + publicationUnits,
    manifestBytes: shape.manifestBytes + publicationUnits,
    files: shape.files.map(file => file.path.endsWith("/pass.json") ? { ...file, bytes: file.bytes + publicationUnits } : file) };
  const selection = forecastJournalSelection({ codeUnits: shape.selectionUnits, utf8Bytes: shape.selectionUnits,
    measuredOmissions: shape.measuredOmissions, orderingInputWork: shape.orderingInputWork });
  const body = forecastJournalPassBody(publishedShape);
  if (!selection.ok || !body.ok || publishedShape.manifestBytes > JOURNAL_SELECTION_BYTES) return null;
  const patch = preparation.forecast(publishedShape.files), commit = forecastJournalCommit(context.format, context.parent !== null);
  if (!patch.ok) return null;
  const limits = preparation.work.limits, used = preparation.work.used;
  if (used.objects + patch.layoutWork.objects + 1 > limits.objects || used.trees + patch.layoutWork.trees > limits.trees
    || used.names + patch.layoutWork.names > limits.names || used.outputWork + body.layoutWork.outputWork
      + patch.layoutWork.outputWork + commit.layoutWork.outputWork > limits.outputWork) return null;
  const append = context.parent ? forecastJournalAppendFixed() : null;
  if (context.parent && (!patch.appendEdges?.ok || !append?.ok)) return null;
  const pending = archivePendingRowBytesUpper(oldRowBytes, shape.selectionUnits, publicationUnits, archiveReplayScopeUnits(scopes));
  const rows = forecastArchiveBookkeeping({ oldRowBytes, markedRowBytes: pending, attemptedRowBytes: pending,
    manifestUnits: shape.selectionUnits, publicationUnits, replayScopes: scopes, newRetained: shape.newRetained, atomicFirstAttempt: context.atomicFirstAttempt === true });
  const transfer = forecastArchiveTransfer({ objects: parent.objects + patch.layoutWork.objects + 1,
    bytes: parent.bytes + patch.layoutWork.outputWork + commit.layoutWork.outputWork,
    incremental: context.parent !== null, maximum: context.maximum });
  if (!rows.ok || !transfer.ok) return null;
  const frontier = forecastArchiveFrontierFinish({ hasBase: context.parent !== null, through: through.seq, captureFromSource: true, rowContextBytes,
    markUnits: shape.selectionUnits + publicationUnits, markedRowBytes: pending });
  if (!frontier.ok) return null;
  return sum(setup, inventory, shape.input, publication, { inputWork: JOURNAL_SELECTION_BYTES * 3 }, selection.cost, body.cost,
    patch.cost, commit.cost, context.parent && patch.appendEdges?.ok ? patch.appendEdges.cost : {},
    append?.ok ? append.cost : {}, transfer.cost, rows.cost, frontier.cost);
}
