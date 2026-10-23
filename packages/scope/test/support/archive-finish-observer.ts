/** TEST-only scalar observer for one exact Directory append candidate. Original methods
 * run exactly once. It supplies no production port, admission or allowance. */
import type { Head, ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize, utf8 } from "@generalbusiness/dap-bytes";
import { JournalPassPreparation, JOURNAL_SELECTION_BYTES, forecastJournalCommit,
  forecastJournalPassBody, forecastJournalSelection, forecastJournalAppendFixed, type JournalObject } from "@generalbusiness/dap-git/journal";
import type { ArchiveBudget, ArchiveCost } from "../../src/archive-budget.ts";
import { ArchiveRows, type ArchiveRow } from "../../src/archive-row.ts";
import { archivePendingRowBytesUpper, forecastArchiveBookkeeping } from "../../src/archive-row-cost.ts";
import { ArchiveScout } from "../../src/archive-scout.ts";
import { forecastArchiveTransfer } from "../../src/archive-transfer-cost.ts";

type Shape = ReturnType<ArchiveScout["layout"]>;
type Patch = ReturnType<JournalPassPreparation["forecast"]>;
const zero = (): ArchiveCost => ({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 0, inputWork: 0 });

export function observeDirectoryFinish(at: ScopeRef, expectedBudget: () => ArchiveBudget | undefined, expectedThrough: Head, parentObjects: Map<string, JournalObject>) {
  const layout = ArchiveScout.prototype.layout, inventoryCost = ArchiveScout.prototype.inventoryCost,
    selectionCost = ArchiveScout.prototype.selectionCost, forecast = JournalPassPreparation.prototype.forecast,
    load = ArchiveRows.prototype.load;
  let shape: Shape | undefined, inventory: Readonly<ArchiveCost> | undefined, setup: Readonly<ArchiveCost> | undefined,
    patch: Patch | undefined, row: ArchiveRow | undefined, through: Head | undefined,
    inventoryThrough: Head | undefined, setupThrough: Head | undefined;
  let parent: string | null | undefined, parentAfter: Head | null | undefined, parentSnapshot: { objects: number; bytes: number } | undefined, format: "sha1" | "sha256" | undefined;
  let captures = 0, overflow = false, captureWallMs = 0, restored = false, forecasts = 0, invalidParentRead = false;
  const parentGet = parentObjects.get, parentGetDescriptor = Object.getOwnPropertyDescriptor(parentObjects, "get"), parentReads = new Map<string, number>();
  let rejected: { readonly cost: Partial<ArchiveCost>; readonly used: ArchiveCost } | undefined;
  const matches = (where: ScopeRef, budget: unknown) => budget !== undefined && budget === expectedBudget()
    && where.scope === at.scope && where.inc === at.inc && where.kind === at.kind;
  const capture = (work: () => void) => {
    // A finite diagnostic ceiling, never a production work allowance.
    if (captures >= 32) { overflow = true; return; }
    const started = performance.now(); captures++; work(); captureWallMs += performance.now() - started;
  };
  // Instance-only TEST peer observation. There is no Promise wrapper or
  // added lookup; every actual get, including repeats/missing, counts.
  Object.defineProperty(parentObjects, "get", { configurable: true, writable: true, value: function (this: Map<string, JournalObject>, ...args: Parameters<Map<string, JournalObject>["get"]>) {
    const result = parentGet.apply(this, args);
    if (this === parentObjects && expectedBudget() !== undefined) capture(() => {
      // This report is only for the first rejected candidate. A later peer
      // read cannot silently enlarge its already captured parent snapshot.
      if (forecasts !== 0) { invalidParentRead = true; return; }
      const key = args[0];
      if (key.length > 64 || !result || result.id !== key || !(result.data instanceof Uint8Array)) { invalidParentRead = true; return; }
      const prior = parentReads.get(key);
      if (prior !== undefined && prior !== result.data.length) invalidParentRead = true;
      parentReads.set(key, result.data.length);
    });
    return result;
  } });
  ArchiveScout.prototype.layout = function (this: ArchiveScout, ...args: Parameters<ArchiveScout["layout"]>) {
    const result = layout.apply(this, args);
    if (matches(this.at, this.budget)) capture(() => { shape = result; through = args[0]; });
    return result;
  };
  ArchiveScout.prototype.inventoryCost = function (this: ArchiveScout, ...args: Parameters<ArchiveScout["inventoryCost"]>) {
    const result = inventoryCost.apply(this, args);
    if (matches(this.at, this.budget)) capture(() => { inventory = result; inventoryThrough = args[0]; });
    return result;
  };
  ArchiveScout.prototype.selectionCost = function (this: ArchiveScout, ...args: Parameters<ArchiveScout["selectionCost"]>) {
    const result = selectionCost.apply(this, args);
    if (matches(this.at, this.budget)) capture(() => { setup = result; setupThrough = args[0]; });
    return result;
  };
  JournalPassPreparation.prototype.forecast = function (this: JournalPassPreparation, ...args: Parameters<JournalPassPreparation["forecast"]>) {
    const result = forecast.apply(this, args);
    if (matches(this.at, this.work.budget)) capture(() => {
      forecasts++; patch = result; parent = this.parent; parentAfter = this.after; format = this.format;
      let bytes = 0; for (const size of parentReads.values()) bytes += size;
      parentSnapshot = { objects: parentReads.size, bytes };
    });
    return result;
  };
  ArchiveRows.prototype.load = function (this: ArchiveRows, ...args: Parameters<ArchiveRows["load"]>) {
    const result = load.apply(this, args);
    // Capture the driver's original context row, not a later unbudgeted
    // TEST inspection or confirmation reload. No extra read is issued.
    if (!row && result && matches(result.at, args[0])) capture(() => { row = result; });
    return result;
  };
  return {
    rejected(cost: Partial<ArchiveCost>, used: ArchiveCost) {
      capture(() => { rejected = { cost: { ...cost }, used }; });
    },
    restore() {
      if (restored) return;
      restored = true;
      ArchiveScout.prototype.layout = layout; ArchiveScout.prototype.inventoryCost = inventoryCost;
      ArchiveScout.prototype.selectionCost = selectionCost; JournalPassPreparation.prototype.forecast = forecast;
      ArchiveRows.prototype.load = load;
      if (parentGetDescriptor) Object.defineProperty(parentObjects, "get", parentGetDescriptor);
      else Reflect.deleteProperty(parentObjects, "get");
    },
    /** Call only after run() settles and prototypes are restored. No second
     * forecast, serialization or SQL read happens on the live pass. */
    report() {
      const started = performance.now();
      const qualification = "TEST-only bounded scalar/reference observers. Original calls exactly once with unchanged this/arguments/result/throw. Retained layout and cost objects are immutable; the original context load returns an owned snapshot never mutated by the driver. No body copies or added storage reads. Decomposition arithmetic/row serialization occurs only after driver settlement, never scheduling or admission. Capture wall measurement excludes timer-call and wrapper dispatch overhead; no causal performance comparison.";
      const common = { at, through, expectedThrough, captures, overflow, captureWallMs, rejected, qualification, forecasts, invalidParentRead };
      if (!shape || !inventory || !setup || !patch?.ok || !patch.appendEdges?.ok || !row || !format || !parentSnapshot
        || parent === null || parent === undefined || overflow || invalidParentRead || forecasts !== 1 || !rejected
        || row.pending !== null || row.confirmed?.layout !== 2 || row.confirmed.through.seq !== 1 || parent !== row.confirmed.commit
        || parentAfter?.seq !== row.confirmed.through.seq || parentAfter.hash !== row.confirmed.through.hash
        || through?.seq !== 2 || through.seq !== expectedThrough.seq || through.hash !== expectedThrough.hash || shape.entries !== 1
        || inventoryThrough?.seq !== through.seq || inventoryThrough.hash !== through.hash
        || setupThrough?.seq !== through.seq || setupThrough.hash !== through.hash)
        return { ...common, incomplete: true, reason: "exact first D2 append scalar set incomplete" };
      const rejectedCost = rejected.cost;
      const selection = forecastJournalSelection({ codeUnits: shape.selectionUnits, utf8Bytes: shape.selectionUnits,
        measuredOmissions: shape.measuredOmissions, orderingInputWork: shape.orderingInputWork });
      const body = forecastJournalPassBody(shape), commit = forecastJournalCommit(format, true);
      const oldRowBytes = utf8(canonicalize(row)).length, pending = archivePendingRowBytesUpper(oldRowBytes, shape.selectionUnits);
      const rows = forecastArchiveBookkeeping({ oldRowBytes, markedRowBytes: pending, attemptedRowBytes: pending,
        manifestUnits: shape.selectionUnits, newRetained: shape.newRetained, atomicFirstAttempt: true });
      const append = forecastJournalAppendFixed();
      const transfer = forecastArchiveTransfer({ objects: parentSnapshot.objects + patch.layoutWork.objects + 1,
        bytes: parentSnapshot.bytes + patch.layoutWork.outputWork + commit.layoutWork.outputWork, incremental: true, maximum: 8 * 1024 * 1024 });
      if (!selection.ok || !body.ok || !rows.ok || !transfer.ok || !append.ok) return { ...common, incomplete: true, reason: "post-run forecast refused" };
      const components = { setup, inventory, nativeInput: shape.input, selectionReservation: { inputWork: JOURNAL_SELECTION_BYTES * 3 },
        selection: selection.cost, body: body.cost, patch: patch.cost, commit: commit.cost, appendEdges: patch.appendEdges.cost, append: append.cost, transfer: transfer.cost, rows: rows.cost };
      const sum = zero();
      for (const cost of Object.values(components)) for (const key of Object.keys(sum) as (keyof ArchiveCost)[]) sum[key] += (cost as Partial<ArchiveCost>)[key] ?? 0;
      if ((Object.keys(sum) as (keyof ArchiveCost)[]).some(key => sum[key] !== (rejectedCost[key] ?? 0)))
        return { ...common, incomplete: true, reason: "post-run component sum differs from actual rejected quote", components, sum };
      // Drop file descriptors: the report contains only bounded scalar shape,
      // costs, counts and the already-public scope/head identifiers.
      const { files: _files, ...scalars } = shape;
      return { ...common, incomplete: false, shape: scalars, oldRowBytes, pendingRowBytesUpper: pending,
        parent: parentSnapshot, patchLayout: patch.layoutWork, components, sum,
        postRunArithmeticWallMs: performance.now() - started };
    },
  };
}
