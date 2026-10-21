/** Whole-entry selection under the original all-work allowance. Native
 * metadata frames close before parent I/O; failed/discarded scouting stays
 * spent. Final inventory and every body/writer/send operation still run. */
import type { Bounds, Head, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, same, utf8 } from "@generalbusiness/artroom-bytes";
import { JournalPassPreparation, JOURNAL_SELECTION_BYTES, forecastJournalAppendFixed, forecastJournalCommit,
  forecastJournalPassBody, forecastJournalSelection, type JournalFormat, type JournalObject, type JournalObjectSource } from "@generalbusiness/artroom-git/journal";
import { ARCHIVE_BOUNDS, ArchiveStopped, type ArchiveBudget, type ArchiveCost } from "./archive-budget.ts";
import { planArchivePass, type ArchiveBuildFailure } from "./archive-build.ts";
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
import type { Sql } from "./sqlite.ts";

const empty = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
function sum(...costs: readonly Partial<ArchiveCost>[]): ArchiveCost {
  const result = empty();
  for (const cost of costs) for (const key of Object.keys(result) as (keyof ArchiveCost)[]) result[key] += cost[key] ?? 0;
  return result;
}
interface ParentMetadata { readonly ids: readonly string[]; readonly objects: number; readonly bytes: number }
export interface AdaptiveArchiveContext {
  readonly at: ScopeRef; readonly through: Head; readonly after: Head | null;
  readonly bounds: Bounds; readonly policies: ArchivePolicyRegistry; readonly format: JournalFormat;
  readonly parent: { readonly id: string; readonly source: JournalObjectSource } | null;
  readonly markedAt: Timestamp; readonly fixtureSources?: FixtureArchiveSourcePins;
  readonly row: ArchiveRow;
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
  inventory: ArchiveCost, oldRowBytes: number, parent: ParentMetadata, setup: ArchiveCost): ArchiveCost | null {
  const selection = forecastJournalSelection({ codeUnits: shape.selectionUnits, utf8Bytes: shape.selectionUnits,
    measuredOmissions: shape.measuredOmissions, orderingInputWork: shape.orderingInputWork });
  const body = forecastJournalPassBody(shape);
  if (!selection.ok || !body.ok || shape.manifestBytes > JOURNAL_SELECTION_BYTES) return null;
  const patch = preparation.forecast(shape.files), commit = forecastJournalCommit(context.format, context.parent !== null);
  if (!patch.ok) return null;
  const limits = preparation.work.limits, used = preparation.work.used;
  if (used.objects + patch.layoutWork.objects + 1 > limits.objects || used.trees + patch.layoutWork.trees > limits.trees
    || used.names + patch.layoutWork.names > limits.names || used.outputWork + body.layoutWork.outputWork
      + patch.layoutWork.outputWork + commit.layoutWork.outputWork > limits.outputWork) return null;
  const append = context.parent ? forecastJournalAppendFixed() : null;
  if (context.parent && (!patch.appendEdges?.ok || !append?.ok)) return null;
  const pending = archivePendingRowBytesUpper(oldRowBytes, shape.selectionUnits);
  const rows = forecastArchiveBookkeeping({ oldRowBytes, markedRowBytes: pending, attemptedRowBytes: pending,
    manifestUnits: shape.selectionUnits, newRetained: shape.newRetained });
  const transfer = forecastArchiveTransfer({ objects: parent.objects + patch.layoutWork.objects + 1,
    bytes: parent.bytes + patch.layoutWork.outputWork + commit.layoutWork.outputWork,
    incremental: context.parent !== null, maximum: context.maximum });
  if (!rows.ok || !transfer.ok) return null;
  return sum(setup, inventory, shape.input, { inputWork: JOURNAL_SELECTION_BYTES * 3 }, selection.cost, body.cost,
    patch.cost, commit.cost, context.parent && patch.appendEdges?.ok ? patch.appendEdges.cost : {},
    append?.ok ? append.cost : {}, transfer.cost, rows.cost);
}
export async function planAdaptiveArchivePass(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget): Promise<
  ArchiveBuildFailure | (Extract<Awaited<ReturnType<typeof planArchivePass>>, { ok: true }> & { readonly parentObjects: readonly string[] })> {
  try {
    if (context.row.pending !== null || context.row.confirmed !== null && context.row.confirmed.layout !== 2
      || !same(context.row.at, context.at) || context.row.format !== context.format
      || !same(context.row.confirmed?.through ?? null, context.after)
      || (context.row.confirmed?.commit ?? null) !== (context.parent?.id ?? null)) return { ok: false, reason: "parent" };
    // A loaded canonical row has no pending manifest. Bound its four
    // repository strings before serializing the Native metadata snapshot.
    budget.spend({ metadata: 32 * 1024, inputWork: 256 * 1024 });
    const oldRowBytes = utf8(canonicalize(context.row)).length;
    const begun = await budget.wait(() => JournalPassPreparation.begin({ format: context.format, at: context.at,
      after: context.after, parent: context.parent, budget }));
    if (!begun.ok) return begun;
    const preparation = begun.preparation, paths = new Set<string>();
    let scout: ArchiveScout | undefined;
    let selected: { through: Head; cost: ArchiveCost; parent: ParentMetadata } | undefined;
    for (;;) {
      const reserve = selected ? sum(selected.cost, { metadata: 256, inputWork: 512 }) : {};
      const step = sql.transaction(() => {
        // Resume/bootstrap is protected separately from next(), whose own
        // synchronous lookahead protects the same earlier finish cost.
        try {
          const opened = budget.lookahead(reserve, () => scout ? scout.resume(sql)
            : ArchiveScout.open(sql, context.at, context.through, context.after, context.bounds, context.policies, budget, context.fixtureSources));
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
      if (step.kind !== "position") break;
      const through = { seq: step.position.seq, hash: step.position.hash };
      const quoted = budget.lookahead(selected?.cost ?? {}, () => ({ shape: scout!.layout(through), inventory: scout!.inventoryCost(through),
        setup: through.seq === context.through.seq ? scout!.selectionCost(through) : setupCost() }));
      if (quoted.kind === "limited") break;
      const { shape, inventory, setup } = quoted.value;
      const prepared = await budget.lookaheadAsync(selected?.cost ?? {}, async () => {
        budget.spend({ metadata: shape.files.length * 128, inputWork: shape.files.length * 256 });
        const delta: string[] = [];
        for (const file of shape.files) if (file.path !== "journal/v2/head.json" && !file.path.endsWith("/pass.json") && !paths.has(file.path)) { paths.add(file.path); delta.push(file.path); }
        if (delta.length) await preparation.prepare(delta);
        const parent = parentMetadata(context, budget), cost = finishCost(context, preparation, shape, inventory, oldRowBytes, parent, setup);
        return { parent, cost };
      });
      if (prepared.kind === "limited" || prepared.value.cost === null || !budget.canSpend(prepared.value.cost)) break;
      selected = { through, cost: prepared.value.cost, parent: prepared.value.parent };
      if (through.seq === context.through.seq) break;
    }
    if (!selected || !scout) return { ok: false, reason: "limit" };
    const constraints = scout.select(selected.through);
    const built = await planArchivePass(sql, { at: context.at, through: selected.through, after: context.after,
      bounds: context.bounds, policies: context.policies, format: context.format, parent: context.parent,
      markedAt: context.markedAt, ...(context.fixtureSources ? { fixtureSources: context.fixtureSources } : {}),
      preparation, ...constraints }, budget);
    return built.ok ? { ...built, parentObjects: selected.parent.ids } : built;
  } catch (error) {
    if (error instanceof ArchiveStopped || error instanceof ArchivePrefixStopped) return { ok: false, reason: error.reason };
    throw error;
  }
}
