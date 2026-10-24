/** Whole-entry selection under the original all-work allowance. Native
 * metadata frames close before parent I/O; failed/discarded scouting stays
 * spent. Final inventory and every body/writer/send operation still run. */
import type { Bounds, Head, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, same, utf8 } from "@generalbusiness/dap-bytes";
import { JournalPassPreparation, JOURNAL_SELECTION_BYTES, forecastJournalAppendFixed, forecastJournalCommit,
  forecastJournalPassBody, forecastJournalSelection, type JournalFormat, type JournalObject, type JournalObjectSource } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveStopped, type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import { planPublishedArchivePass, planRootPublishedArchivePass, planLegacyArchiveAnchors, type ArchiveBuildFailure } from "./archive-build.ts";
import { archivePublicationBytesUpper, archiveReplayScopeUnits } from "./archive-publication.ts";
import { archiveDeclarationHandoffCost } from "./archive-declaration-plan.ts";
import { archiveRetainedHandoffCost } from "./archive-retained.ts";
import { archiveForeignHandoffCost } from "./archive-foreign-plan.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { ArchivePrefixStopped } from "./archive-prefix.ts";
import { archivePendingRowBytesUpper, forecastArchiveBookkeeping } from "./archive-row-cost.ts";
import type { ArchiveRow } from "./archive-row.ts";
import { ArchiveScout } from "./archive-scout.ts";
import type { ArchiveScoutLayoutQuote } from "./archive-scout-layout.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { forecastArchiveTransfer } from "./archive-transfer-cost.ts";
import { forecastArchiveFrontierFinish } from "./archive-frontier-cost.ts";
import type { Sql } from "./sqlite.ts";

const empty = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
function sum(...costs: readonly Partial<ArchiveCost>[]): ArchiveCost {
  const result = empty();
  for (const cost of costs) for (const key of Object.keys(result) as (keyof ArchiveCost)[]) result[key] += cost[key] ?? 0;
  return result;
}
// TEMPORARY unlanded diagnostic: fixed scalar schema, at most eight rows.
// This adds synchronous observation overhead only; it grants no admission.
type TemporaryAdaptivePhase = "source-lookahead" | "scout-lookahead" | "quote-lookahead"
  | "prepare-lookahead" | "finish-quote" | "finish-budget" | "outer-limit";
type TemporaryAdaptiveReason = "lookahead-limit" | "budget-limit" | "publication-shape" | "publication-scopes"
  | "selection-limit" | "body-limit" | "manifest-limit" | "patch-limit" | "layout-limit"
  | "append-limit" | "bookkeeping-limit" | "transfer-limit" | "frontier-limit" | "unknown-finish";
interface TemporaryAdaptiveLayout { objects: number; trees: number; names: number; outputWork: number }
interface TemporaryAdaptiveQuote {
  reason?: TemporaryAdaptiveReason;
  frontier?: Readonly<ArchiveCost>;
  append?: Readonly<ArchiveCost>;
  markUnits?: number;
  markedRowBytes?: number;
  layout?: { used: TemporaryAdaptiveLayout; quote: TemporaryAdaptiveLayout; limits: TemporaryAdaptiveLayout };
}
let temporaryAdaptiveReports = 0;
function temporaryAdaptiveLimit(budget: ArchiveBudget, phase: TemporaryAdaptivePhase, reason: TemporaryAdaptiveReason,
  quote?: Readonly<Partial<ArchiveCost>>, reserve?: Readonly<Partial<ArchiveCost>>, detail?: TemporaryAdaptiveQuote): void {
  if (temporaryAdaptiveReports >= 8) return;
  temporaryAdaptiveReports++;
  try {
    const cost = (value?: Readonly<Partial<ArchiveCost>>) => value === undefined ? null : ({
      entries: value.entries ?? 0, attempts: value.attempts ?? 0, nodes: value.nodes ?? 0,
      calls: value.calls ?? 0, metadata: value.metadata ?? 0, inputWork: value.inputWork ?? 0,
    });
    console.info("TEMP archive-adaptive-limit-v1", JSON.stringify({ phase, reason,
      used: cost(budget.admitted()), quote: cost(quote), reserve: cost(reserve),
      frontier: cost(detail?.frontier), append: cost(detail?.append), layout: detail?.layout ?? null,
      markUnits: detail?.markUnits ?? null, markedRowBytes: detail?.markedRowBytes ?? null,
    }));
  } catch { /* Observation must not replace the original decision or error. */ }
}

interface ParentMetadata { readonly ids: readonly string[]; readonly objects: number; readonly bytes: number }
export interface AdaptiveArchiveContext {
  readonly at: ScopeRef; readonly through: Head; readonly after: Head | null;
  readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly format: JournalFormat;
  readonly parent: { readonly id: string; readonly source: JournalObjectSource } | null;
  /** Explicit receipt-bound old pass metadata for anchor migration only.
   * The core append parent remains the independent native frontier above. */
  readonly legacyAnchorParent?: { readonly id: string; readonly source: JournalObjectSource };
  readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins;
  readonly replayScopes?: readonly ScopeRef[];
  /** Host source identity preparation for exactly the next candidate. It
   * runs outside native frames and inside this owner's earlier-finish fence. */
  readonly prepareSources?: (seq: number, budget: ArchiveBudget) => Promise<void>;
  readonly row: ArchiveRow;
  /** The production driver performs these two logical steps in one save. */
  readonly atomicFirstAttempt?: boolean;
  /** The driver's actual bounded parent cache. A selected prefix retains
   * its own outgoing ID snapshot, excluding later discarded lookahead. */
  readonly parentHeld: ReadonlyMap<string, JournalObject>; readonly parentUsed: ReadonlySet<string>;
  readonly maximum: number;
}
function parentMetadata(context: AdaptiveArchiveContext, budget: ArchiveBudget): ParentMetadata {
  budget.spend({ metadata: 128 + context.parentUsed.size * 128, inputWork: 256 + context.parentUsed.size * 256 });
  const ids: string[] = []; let bytes = 0;
  for (const id of context.parentUsed) {
    const object = context.parentHeld.get(id);
    if (!object) return budget.stop("unavailable");
    ids.push(id); bytes += object.data.length;
  }
  return Object.freeze({ ids: Object.freeze(ids), objects: ids.length, bytes });
}
/** Fresh metadata handoffs must visit even keys from refused lookahead.
 * The original fixed caps bound those visits; nothing is prepaid here. */
const setupCost = (): ArchiveCost => sum(archiveDeclarationHandoffCost(ARCHIVE_BOUNDS.nodes),
  archiveForeignHandoffCost(ARCHIVE_BOUNDS.attempts), archiveRetainedHandoffCost(ARCHIVE_BOUNDS.attempts), { inputWork: ARCHIVE_BOUNDS.entries * 32 });
function finishCost(context: AdaptiveArchiveContext, preparation: JournalPassPreparation, shape: ArchiveScoutLayoutQuote,
  inventory: ArchiveCost, oldRowBytes: number, parent: ParentMetadata, setup: ArchiveCost, legacyAnchors: number, budget: ArchiveBudget, diagnostic: TemporaryAdaptiveQuote): ArchiveCost | null {
  const decline = (reason: TemporaryAdaptiveReason): null => { diagnostic.reason = reason; return null; };
  // A copied fact can be needed without being written in a local entry.
  // The scout paid for a necessary-key count on each selected local row.
  // It includes nested FactRefs and of/head observations independently of
  // copied objects, with harmless false positives from unrelated keys.
  // Final paid collection, not this quote, chooses the published list.
  const anchors = shape.copies + shape.anchorCandidates, total = anchors + legacyAnchors;
  const publicationUnits = archivePublicationBytesUpper(total);
  if (![anchors, total, publicationUnits].every(n => Number.isSafeInteger(n) && n >= 0)) return decline("publication-shape");
  const sources = context.fixtureSources?.publicationFootprint(budget);
  // Each admitted public copy can add one producer to the target's public
  // identities. Duplicates/private copies only reduce the actual union.
  const scopeBase = context.replayScopes?.length ?? 1, scopes = scopeBase + shape.copies;
  if (![scopeBase, shape.copies, scopes].every(n => Number.isSafeInteger(n) && n >= 0)
    || scopeBase === 0 || scopes > 64) return decline("publication-scopes");
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
  if (!selection.ok || !body.ok || publishedShape.manifestBytes > JOURNAL_SELECTION_BYTES)
    return decline(!selection.ok ? "selection-limit" : !body.ok ? "body-limit" : "manifest-limit");
  const patch = preparation.forecast(publishedShape.files), commit = forecastJournalCommit(context.format, context.parent !== null);
  if (!patch.ok) return decline("patch-limit");
  const limits = preparation.work.limits, used = preparation.work.used;
  if (used.objects + patch.layoutWork.objects + 1 > limits.objects || used.trees + patch.layoutWork.trees > limits.trees
    || used.names + patch.layoutWork.names > limits.names || used.outputWork + body.layoutWork.outputWork
      + patch.layoutWork.outputWork + commit.layoutWork.outputWork > limits.outputWork) {
    diagnostic.layout = {
      used: { objects: used.objects, trees: used.trees, names: used.names, outputWork: used.outputWork },
      quote: { objects: patch.layoutWork.objects + 1, trees: patch.layoutWork.trees, names: patch.layoutWork.names,
        outputWork: body.layoutWork.outputWork + patch.layoutWork.outputWork + commit.layoutWork.outputWork },
      limits: { objects: limits.objects, trees: limits.trees, names: limits.names, outputWork: limits.outputWork },
    };
    return decline("layout-limit");
  }
  const append = context.parent ? forecastJournalAppendFixed() : null;
  if (context.parent && (!patch.appendEdges?.ok || !append?.ok)) return decline("append-limit");
  if (patch.appendEdges?.ok) diagnostic.append = patch.appendEdges.cost;
  const pending = archivePendingRowBytesUpper(oldRowBytes, shape.selectionUnits, publicationUnits, archiveReplayScopeUnits(scopes));
  const rows = forecastArchiveBookkeeping({ oldRowBytes, markedRowBytes: pending, attemptedRowBytes: pending,
    manifestUnits: shape.selectionUnits, publicationUnits, replayScopes: scopes, newRetained: shape.newRetained, atomicFirstAttempt: context.atomicFirstAttempt === true });
  const transfer = forecastArchiveTransfer({ objects: parent.objects + patch.layoutWork.objects + 1,
    bytes: parent.bytes + patch.layoutWork.outputWork + commit.layoutWork.outputWork,
    incremental: context.parent !== null, maximum: context.maximum });
  if (!rows.ok || !transfer.ok) return decline(!rows.ok ? "bookkeeping-limit" : "transfer-limit");
  const frontierShape = { hasBase: context.parent !== null,
    markUnits: shape.selectionUnits + publicationUnits, markedRowBytes: pending };
  diagnostic.markUnits = frontierShape.markUnits; diagnostic.markedRowBytes = frontierShape.markedRowBytes;
  const frontier = forecastArchiveFrontierFinish(frontierShape);
  if (!frontier.ok) return decline("frontier-limit");
  diagnostic.frontier = frontier.cost;
  return sum(setup, inventory, shape.input, publication, { inputWork: JOURNAL_SELECTION_BYTES * 3 }, selection.cost, body.cost,
    patch.cost, commit.cost, context.parent && patch.appendEdges?.ok ? patch.appendEdges.cost : {},
    append?.ok ? append.cost : {}, transfer.cost, rows.cost, frontier.cost);
}
export function planAdaptiveArchivePass(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget) {
  return adaptiveArchivePass(false, sql, context, budget);
}
export function planRootAdaptiveArchivePass(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget) {
  return adaptiveArchivePass(true, sql, context, budget);
}
async function adaptiveArchivePass(coupled: boolean, sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget): Promise<
  ArchiveBuildFailure | (Extract<Awaited<ReturnType<typeof planPublishedArchivePass>>, { ok: true }> & { readonly parentObjects: readonly string[] })> {
  try {
    if (context.row.pending !== null || context.row.confirmed !== null && context.row.confirmed.layout !== 2
      || !same(context.row.at, context.at) || context.row.format !== context.format
      || !same(context.row.confirmed?.through ?? null, context.after)
      || (context.row.confirmed?.commit ?? null) !== (context.parent?.id ?? null)) return { ok: false, reason: "parent" };
    // A loaded canonical row has no pending manifest. Bound its four
    // repository strings before serializing the Native metadata snapshot.
    budget.spend({ metadata: 32 * 1024, inputWork: 256 * 1024 });
    const oldRowBytes = utf8(canonicalize(context.row)).length;
    const legacyAnchors = await planLegacyArchiveAnchors(sql, context, budget);
    const begun = await budget.wait(() => JournalPassPreparation.begin({ format: context.format, at: context.at,
      after: context.after, parent: context.parent, budget }));
    if (!begun.ok) return begun;
    const preparation = begun.preparation, paths = new Set<string>();
    let scout: ArchiveScout | undefined;
    let nextSource = (context.after?.seq ?? -1) + 1;
    let selected: { through: Head; cost: ArchiveCost; parent: ParentMetadata } | undefined;
    for (;;) {
      const reserve = selected ? sum(selected.cost, { metadata: 256, inputWork: 512 }) : {};
      if (context.prepareSources && nextSource <= context.through.seq) {
        const prepared = await budget.lookaheadAsync(reserve, async () => {
          try { await context.prepareSources!(nextSource, budget); return { ok: true as const }; }
          catch (error) {
            // Carry an ordinary candidate refusal across wait() as data.
            // Its timeout and original debit failures remain exceptions.
            if (error instanceof ArchivePrefixStopped) return { ok: false as const, error };
            throw error;
          }
        });
        if (prepared.kind === "limited") { temporaryAdaptiveLimit(budget, "source-lookahead", "lookahead-limit", undefined, reserve); break; }
        if (!prepared.value.ok) {
          if (selected) break;
          throw prepared.value.error;
        }
      }
      const step = sql.transaction(() => {
        // Resume/bootstrap is protected separately from next(), whose own
        // synchronous lookahead protects the same earlier finish cost.
        try {
          const opened = budget.lookahead(reserve, () => scout ? scout.resume(sql)
            : (coupled ? ArchiveScout.openRoot : ArchiveScout.open)(sql, context.at, context.through, context.after, context.bounds, context.policies, budget, context.fixtureSources));
          if (opened.kind === "limited") return { kind: "limited" as const };
          const frame = opened.value; scout = frame.scout;
          try { return frame.next(reserve); }
          finally { frame.close(); }
        } catch (error) {
          // An inadmissible later candidate grants no rights, but need not
          // discard an earlier prefix. Fresh inventory still binds that
          // prefix's pin, classes, declarations and byte-derived plans.
          if (selected && error instanceof ArchivePrefixStopped) return { kind: "blocked" as const };
          throw error;
        }
      });
      if (step.kind !== "position") {
        if (step.kind === "limited") temporaryAdaptiveLimit(budget, "scout-lookahead", "lookahead-limit", undefined, reserve);
        break;
      }
      nextSource = step.position.seq + 1;
      const through = { seq: step.position.seq, hash: step.position.hash };
      const quoted = budget.lookahead(selected?.cost ?? {}, () => ({ shape: scout!.layout(through), inventory: scout!.inventoryCost(through),
        setup: through.seq === context.through.seq ? scout!.selectionCost(through) : setupCost() }));
      if (quoted.kind === "limited") { temporaryAdaptiveLimit(budget, "quote-lookahead", "lookahead-limit", undefined, selected?.cost); break; }
      const { shape, inventory, setup } = quoted.value;
      const prepared = await budget.lookaheadAsync(selected?.cost ?? {}, async () => {
        budget.spend({ metadata: shape.files.length * 128, inputWork: shape.files.length * 256 });
        const delta: string[] = [];
        for (const file of shape.files) if (file.path !== "journal/v2/head.json" && !file.path.endsWith("/pass.json") && !paths.has(file.path)) { paths.add(file.path); delta.push(file.path); }
        if (delta.length) await preparation.prepare(delta);
        const diagnostic: TemporaryAdaptiveQuote = {};
        const parent = parentMetadata(context, budget), cost = finishCost(context, preparation, shape, inventory, oldRowBytes, parent, setup, legacyAnchors?.anchors.length ?? 0, budget, diagnostic);
        return { parent, cost, diagnostic };
      });
      if (prepared.kind === "limited") { temporaryAdaptiveLimit(budget, "prepare-lookahead", "lookahead-limit", undefined, selected?.cost); break; }
      if (prepared.value.cost === null) {
        temporaryAdaptiveLimit(budget, "finish-quote", prepared.value.diagnostic.reason ?? "unknown-finish", undefined, selected?.cost, prepared.value.diagnostic);
        break;
      }
      if (!budget.canSpend(prepared.value.cost)) {
        temporaryAdaptiveLimit(budget, "finish-budget", "budget-limit", prepared.value.cost, selected?.cost, prepared.value.diagnostic);
        break;
      }
      selected = { through, cost: prepared.value.cost, parent: prepared.value.parent };
      if (through.seq === context.through.seq) break;
    }
    if (!selected || !scout) return { ok: false, reason: "limit" };
    const constraints = scout.select(selected.through);
    const built = await (coupled ? planRootPublishedArchivePass : planPublishedArchivePass)(sql, { at: context.at, through: selected.through, after: context.after,
      bounds: context.bounds, policies: context.policies, format: context.format, parent: context.parent,
      markedAt: context.markedAt, ...(context.fixtureSources ? { fixtureSources: context.fixtureSources } : {}),
      ...(context.replayScopes ? { replayScopes: context.replayScopes } : {}),
      preparation, ...(legacyAnchors ? { legacyAnchors } : {}), ...constraints }, budget);
    return built.ok ? { ...built, parentObjects: selected.parent.ids } : built;
  } catch (error) {
    if (error instanceof ArchiveStopped || error instanceof ArchivePrefixStopped) {
      if (error.reason === "limit") temporaryAdaptiveLimit(budget, "outer-limit", "budget-limit");
      return { ok: false, reason: error.reason };
    }
    throw error;
  }
}
