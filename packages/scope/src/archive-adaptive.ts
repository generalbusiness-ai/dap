/** Whole-entry selection under the original all-work allowance. Native
 * metadata frames close before parent I/O; failed/discarded scouting stays
 * spent. Final inventory and every body/writer/send operation still run. */
import type { Bounds, Head, ScopeRef, Timestamp } from "@generalbusiness/dap-contract";
import { canonicalize, same, utf8 } from "@generalbusiness/dap-bytes";
import { JournalPassPreparation, type JournalFormat, type JournalObject, type JournalObjectSource } from "@generalbusiness/dap-git/journal";
import { ARCHIVE_BOUNDS, ArchiveStopped, type ArchiveBudget, type ArchiveCost, type ArchiveCapacityRefusal } from "./archive-budget.ts";
import { planPublishedArchivePass, planRootPublishedArchivePass, planRootFixedPublishedArchivePass, planRootFixedLegacyArchivePass, planLegacyArchiveAnchors, type ArchiveBuildFailure } from "./archive-build.ts";
import { archiveDeclarationHandoffCost } from "./archive-declaration-plan.ts";
import { archiveRetainedHandoffCost } from "./archive-retained.ts";
import { archiveForeignHandoffCost } from "./archive-foreign-plan.ts";
import type { ArchivePolicyRegistry } from "./archive-inventory.ts";
import { ArchivePrefixStopped } from "./archive-prefix.ts";
import { consumeArchivePlanningSnapshot, type ArchiveRow } from "./archive-row.ts";
import { ArchiveScout } from "./archive-scout.ts";
import type { FixtureArchiveSourcePins } from "./archive-source-pins.ts";
import { archiveFrontierRowContextBound } from "./archive-frontier-cost.ts";
import type { Sql } from "./sqlite.ts";
import { archiveParentMetadata, forecastArchiveFinish, type ArchiveParentMetadata } from "./archive-finish-cost.ts";
import { observeArchiveRowContext, observeArchiveSelection } from "./archive-capacity-observation.ts";

const empty = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });
function sum(...costs: readonly Partial<ArchiveCost>[]): ArchiveCost {
  const result = empty();
  for (const cost of costs) for (const key of Object.keys(result) as (keyof ArchiveCost)[]) result[key] += cost[key] ?? 0;
  return result;
}
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
  /** Optional single-use same-SQL/budget owned-row serialization receipt. */
  readonly rowSnapshot?: unknown;
  /** The production driver performs these two logical steps in one save. */
  readonly atomicFirstAttempt?: boolean;
  /** The driver's actual bounded parent cache. A selected prefix retains
   * its own outgoing ID snapshot, excluding later discarded lookahead. */
  readonly parentHeld: ReadonlyMap<string, JournalObject>; readonly parentUsed: ReadonlySet<string>;
  readonly maximum: number;
}
/** Fresh metadata handoffs must visit even keys from refused lookahead.
 * The original fixed caps bound those visits; nothing is prepaid here. */
const setupCost = (): ArchiveCost => sum(archiveDeclarationHandoffCost(ARCHIVE_BOUNDS.nodes),
  archiveForeignHandoffCost(ARCHIVE_BOUNDS.attempts), archiveRetainedHandoffCost(ARCHIVE_BOUNDS.attempts), { inputWork: ARCHIVE_BOUNDS.entries * 32 });
function planningRowContext(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget) {
  const snapshotBytes = Object.hasOwn(context, "rowSnapshot")
    ? consumeArchivePlanningSnapshot(context.rowSnapshot, sql, context.row, budget) : null;
  if (context.row.pending !== null || context.row.confirmed !== null && context.row.confirmed.layout !== 2
    || !same(context.row.at, context.at) || context.row.format !== context.format
    || !same(context.row.confirmed?.through ?? null, context.after)
    || (context.row.confirmed?.commit ?? null) !== (context.parent?.id ?? null)) return { ok: false as const, reason: "parent" as const };
  // Standalone callers still pay and serialize. Supplied tokens must be
  // genuine, single-use and bound to this exact SQL, row and allowance.
  let oldRowBytes: number;
  if (snapshotBytes !== null) oldRowBytes = snapshotBytes;
  else {
    budget.spend({ metadata: 32 * 1024, inputWork: 256 * 1024 });
    oldRowBytes = utf8(canonicalize(context.row)).length;
  }
  // Pay the scalar ceiling and its forecast-to-store handoff once, before
  // lookahead. Only the consumed private snapshot earns the tighter bound;
  // standalone serialization keeps the original generic ceiling.
  budget.spend({ metadata: 128, inputWork: 256 });
  const rowContextBytes = archiveFrontierRowContextBound(context.row, snapshotBytes ?? undefined);
  observeArchiveRowContext(budget, { oldRowBytes, rowContextBytes, snapshotConsumed: snapshotBytes !== null });
  return { ok: true as const, oldRowBytes, rowContextBytes };
}
export function planAdaptiveArchivePass(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget) {
  return adaptiveArchivePass(false, sql, context, budget);
}
export function planRootAdaptiveArchivePass(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget) {
  return adaptiveArchivePass(true, sql, context, budget);
}
/** Proven capacity exit before selection; not an ordinary build refusal. */
interface DeferredForCapacity { readonly ok: false; readonly deferred: "capacity"; readonly capacityRefusal: ArchiveCapacityRefusal | null }
async function adaptiveArchivePass(coupled: boolean, sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget): Promise<
  (ArchiveBuildFailure & { readonly capacityRefusal?: ArchiveCapacityRefusal | null }) | DeferredForCapacity | (Extract<Awaited<ReturnType<typeof planPublishedArchivePass>>, { ok: true }> & { readonly parentObjects: readonly string[]; readonly rowContextBytes: number })> {
  try {
    const rowContext = planningRowContext(sql, context, budget);
    if (!rowContext.ok) return rowContext;
    const { oldRowBytes, rowContextBytes } = rowContext;
    const unpublished = context.row.confirmed?.layout === 2 && context.row.confirmed.anchorsPublished !== true;
    // Published receipts retain their original operation order. Only the
    // one-time unpublished transition needs the preparation first.
    const earlyLegacy = unpublished ? undefined : await planLegacyArchiveAnchors(sql, context, budget);
    const begun = await budget.wait(() => JournalPassPreparation.begin({ format: context.format, at: context.at,
      after: context.after, parent: context.parent, budget }));
    if (!begun.ok) return begun;
    // The preparation already authenticated this receipt and parsed the
    // baseline path. Only the unpublished transition reuses those maps;
    // old manifests and the complete local authority replay remain owed.
    const preparation = begun.preparation;
    const legacyAnchors = unpublished
      ? await planLegacyArchiveAnchors(sql, { ...context, preparation }, budget) : earlyLegacy;
    const paths = new Set<string>();
    let scout: ArchiveScout | undefined;
    let nextSource = (context.after?.seq ?? -1) + 1;
    let selected: { through: Head; cost: ArchiveCost; parent: ArchiveParentMetadata } | undefined;
    let capacityLimited = false;
    let capacityRefusal: ArchiveCapacityRefusal | null = null;
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
        if (prepared.kind === "limited") { capacityLimited = true; capacityRefusal = prepared.refusal && { ...prepared.refusal, site: "prepare-sources" }; break; }
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
          if (opened.kind === "limited") return { ...opened, site: "scout-open" as const };
          const frame = opened.value; scout = frame.scout;
          try { const next = frame.next(reserve); return next.kind === "limited" ? { ...next, site: "scout-next" as const } : next; }
          finally { frame.close(); }
        } catch (error) {
          // An inadmissible later candidate grants no rights, but need not
          // discard an earlier prefix. Fresh inventory still binds that
          // prefix's pin, classes, declarations and byte-derived plans.
          if (selected && error instanceof ArchivePrefixStopped) return { kind: "blocked" as const };
          throw error;
        }
      });
      if (step.kind === "limited") { capacityLimited = true; capacityRefusal = step.refusal && { ...step.refusal, site: step.site }; }
      if (step.kind !== "position") break;
      nextSource = step.position.seq + 1;
      const through = { seq: step.position.seq, hash: step.position.hash };
      const quoted = budget.lookahead(selected?.cost ?? {}, () => ({ shape: scout!.layout(through), inventory: scout!.inventoryCost(through),
        setup: through.seq === context.through.seq ? scout!.selectionCost(through) : setupCost() }));
      if (quoted.kind === "limited") { capacityLimited = true; capacityRefusal = quoted.refusal && { ...quoted.refusal, site: "shape-inventory" }; break; }
      const { shape, inventory, setup } = quoted.value;
      const prepared = await budget.lookaheadAsync(selected?.cost ?? {}, async () => {
        budget.spend({ metadata: shape.files.length * 128, inputWork: shape.files.length * 256 });
        const delta: string[] = [];
        for (const file of shape.files) if (file.path !== "journal/v2/head.json" && !file.path.endsWith("/pass.json") && !paths.has(file.path)) { paths.add(file.path); delta.push(file.path); }
        if (delta.length) await preparation.prepare(delta);
        const parent = archiveParentMetadata(context, budget), cost = forecastArchiveFinish(context, preparation, shape, through, inventory, oldRowBytes, rowContextBytes, parent, setup, legacyAnchors?.anchors.length ?? 0, budget);
        return { parent, cost };
      });
      if (prepared.kind === "limited") { capacityLimited = true; capacityRefusal = prepared.refusal && { ...prepared.refusal, site: "prepare-finish" }; break; }
      // A null forecast is a hard layout/input refusal. Only an actual
      // quote that cannot fit establishes capacity deferral.
      if (prepared.value.cost === null) break;
      if (!budget.canSpend(prepared.value.cost)) {
        capacityLimited = true;
        const refusal = budget.capacityRefusal(prepared.value.cost, "finish-quote");
        capacityRefusal = refusal && { ...refusal, site: "finish-affordability" };
        break;
      }
      selected = { through, cost: prepared.value.cost, parent: prepared.value.parent };
      observeArchiveSelection(budget, through.seq);
      if (through.seq === context.through.seq) break;
    }
    if (!selected || !scout) return capacityLimited ? { ok: false, deferred: "capacity", capacityRefusal } : { ok: false, reason: "limit" };
    const constraints = scout.select(selected.through);
    const built = await (coupled ? planRootPublishedArchivePass : planPublishedArchivePass)(sql, { at: context.at, through: selected.through, after: context.after,
      bounds: context.bounds, policies: context.policies, format: context.format, parent: context.parent,
      markedAt: context.markedAt, ...(context.fixtureSources ? { fixtureSources: context.fixtureSources } : {}),
      ...(context.replayScopes ? { replayScopes: context.replayScopes } : {}),
      preparation, ...(legacyAnchors ? { legacyAnchors } : {}), ...constraints }, budget);
    return built.ok ? { ...built, parentObjects: selected.parent.ids, rowContextBytes } : built;
  } catch (error) {
    if (error instanceof ArchiveStopped) return { ok: false, reason: error.reason,
      capacityRefusal: error.capacityRefusal && { ...error.capacityRefusal, site: "plan-debit" } };
    if (error instanceof ArchivePrefixStopped) return { ok: false, reason: error.reason, ...(error.sourceFailure ? { sourceFailure: error.sourceFailure } : {}) };
    throw error;
  }
}

/** A later capacity retry selects one exact next entry, never a second
 * attempt after adaptive lookahead has spent this pass's allowance. */
export async function planRootFixedArchivePass(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget) {
  try {
    const old = context.row.confirmed;
    if (!old || old.layout !== 2 || old.anchorsPublished !== true || context.row.pending !== null || context.row.stopped !== null
      || !context.after || context.through.seq !== context.after.seq + 1 || !context.parent) return { ok: false as const, reason: "parent" as const };
    const rowContext = planningRowContext(sql, context, budget);
    if (!rowContext.ok) return rowContext;
    if (context.prepareSources) {
      const prepared = await budget.wait(async () => {
        try { await context.prepareSources!(context.through.seq, budget); return { ok: true as const }; }
        catch (error) {
          // Carry hard source refusal as data across wait(), exactly as the
          // adaptive path does. Deadline/debit exceptions still propagate.
          if (error instanceof ArchivePrefixStopped) return { ok: false as const, error };
          throw error;
        }
      });
      if (!prepared.ok) throw prepared.error;
    }
    return await planRootFixedPublishedArchivePass(sql, { ...context, ...rowContext }, budget);
  } catch (error) {
    if (error instanceof ArchiveStopped) return { ok: false as const, reason: error.reason,
      capacityRefusal: error.capacityRefusal && { ...error.capacityRefusal, site: "plan-debit" as const } };
    if (error instanceof ArchivePrefixStopped) return { ok: false as const, reason: error.reason, ...(error.sourceFailure ? { sourceFailure: error.sourceFailure } : {}) };
    throw error;
  }
}

/** Unpublished receipts must admit the complete old range before the same
 * pass inventories its exact next entry. No caller supplies legacy anchors. */
export async function planRootFixedUnpublishedArchivePass(sql: Sql, context: AdaptiveArchiveContext, budget: ArchiveBudget) {
  try {
    const old = context.row.confirmed;
    if (!old || old.layout !== 2 || old.anchorsPublished === true || context.row.pending !== null || context.row.stopped !== null
      || !context.after || context.through.seq !== context.after.seq + 1 || !context.parent) return { ok: false as const, reason: "parent" as const };
    const rowContext = planningRowContext(sql, context, budget);
    if (!rowContext.ok) return rowContext;
    return await planRootFixedLegacyArchivePass(sql, { ...context, ...rowContext }, budget);
  } catch (error) {
    if (error instanceof ArchiveStopped) return { ok: false as const, reason: error.reason,
      capacityRefusal: error.capacityRefusal && { ...error.capacityRefusal, site: "plan-debit" as const } };
    if (error instanceof ArchivePrefixStopped) return { ok: false as const, reason: error.reason, ...(error.sourceFailure ? { sourceFailure: error.sourceFailure } : {}) };
    throw error;
  }
}
