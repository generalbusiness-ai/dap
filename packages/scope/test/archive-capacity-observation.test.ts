/** Numeric diagnostics over the real budget, with counted SQL/clock stands.
 * These are plain function witnesses, not native archive or source admission. */
import { expect, test } from "vitest";
import { ARCHIVE_BOUNDS, ArchiveBudget, ArchiveStopped } from "../src/archive-budget.ts";
import { createObservedArchiveBudget, observeArchiveFinishQuote, observeArchiveRowContext, observeArchiveSelection,
  readArchiveCapacityObservation, registerCustomArchiveBudget } from "../src/archive-capacity-observation.ts";

function exercise(budget: ArchiveBudget) {
  let sqlCalls = 0;
  budget.spend({ metadata: 1 });
  const affordable = budget.canSpend({ metadata: 4 });
  const sql = budget.native({ exec() { sqlCalls++; return { toArray: () => [] }; } }, () => ({ metadata: 1, inputWork: 0 }));
  const limited = budget.lookahead({ metadata: 2 }, () => {
    budget.spend({ metadata: 1 });
    sql.exec("SELECT 1");
  });
  budget.spend({ metadata: 2 });
  let failure: unknown;
  try { budget.spend({ metadata: 1 }); } catch (error) { failure = error; }
  return { affordable, limited, sqlCalls, cost: budget.admitted(), failure };
}
test("observation preserves native debit, reserve refusal, SQL admission and clock calls without double-counting spend's own check", () => {
  let originalClock = 0, observedClock = 0;
  const original = exercise(new ArchiveBudget({ metadata: 4 }, () => { originalClock++; return 0; }));
  const budget = createObservedArchiveBudget({ metadata: 4 }, () => { observedClock++; return 0; });
  const observed = exercise(budget);
  expect(observed).toEqual(original);
  expect(observed.failure).toBeInstanceOf(ArchiveStopped);
  expect(observed.sqlCalls).toBe(0);
  expect(observedClock).toBe(originalClock);
  const beforeRead = observedClock;
  const report = readArchiveCapacityObservation(budget, { throughSeq: 7, costs: { cost: observed.cost } })!;
  expect(observedClock).toBe(beforeRead);
  expect(report.ledgerReconciled).toBe(true);
  expect(report.admittedDelta).toEqual(observed.cost);
  expect(report.debitCalls).toBe(5);
  expect(report.affordabilityCalls).toBe(2);
  // A missing finish quote must not become a complete reconstruction.
  expect(report.observationComplete).toBe(false);
});

test("the exact native exception survives an observer and does not fabricate a debit", () => {
  const original = new Error("clock failure"); let failed = false;
  const budget = createObservedArchiveBudget({}, () => { if (failed) throw original; return 0; });
  failed = true;
  let caught: unknown;
  try { budget.spend({ nodes: 1 }); } catch (error) { caught = error; }
  expect(caught).toBe(original);
  const report = readArchiveCapacityObservation(budget, { throughSeq: null })!;
  expect(report.admittedDelta.nodes).toBe(0);
  expect(report.refusals).toHaveLength(1);
  expect(JSON.stringify(report)).not.toContain("clock failure");
});

test("geometry observation leaves a custom budget's ledger method untouched", () => {
  let reads = 0;
  class CustomBudget extends ArchiveBudget {
    override admitted() { reads++; throw Error("custom ledger must not be read"); }
  }
  const budget = new CustomBudget({}, () => 0);
  registerCustomArchiveBudget(budget);
  observeArchiveRowContext(budget, { oldRowBytes: 9, rowContextBytes: 12, snapshotConsumed: true });
  observeArchiveFinishQuote(budget, { throughSeq: 7, scalars: { stage: 0 }, costs: { total: { metadata: 1 } } });
  observeArchiveSelection(budget, 7);
  const report = readArchiveCapacityObservation(budget, { throughSeq: 7, costs: { cost: { metadata: 1 } } })!;
  expect(reads).toBe(0);
  expect(report.debitAttribution).toBe("unavailable");
  expect(report.admitted).toBeNull();
  expect(report.rowContext).toBeNull();
  expect(report.firstQuote).toBeNull();
  expect(report.selectedQuote).toBeNull();
  expect(report.terminalQuote).toBeNull();
  expect(report.selectedThroughSeq).toBeNull();
  expect(report.rowContextCalls).toBe(0);
  expect(report.quoteCalls).toBe(0);
  expect(report.selectionCalls).toBe(0);
  expect(report.observationComplete).toBe(false);
});

test("closed numeric copies survive caller mutation and same-sequence selection refresh without retaining payload fields or evaluating getters", () => {
  const budget = createObservedArchiveBudget({}, () => 0);
  const row = { oldRowBytes: 9, rowContextBytes: 12, snapshotConsumed: true };
  const first = { throughSeq: 7, scalars: { stage: 0 }, costs: { total: { metadata: 1 } } };
  observeArchiveRowContext(budget, row);
  observeArchiveFinishQuote(budget, first); observeArchiveSelection(budget, 7);
  row.oldRowBytes = 900; first.costs.total.metadata = 100;
  observeArchiveFinishQuote(budget, { throughSeq: 7, scalars: { stage: 0 }, costs: { total: { metadata: 2 } } });
  observeArchiveSelection(budget, 7);
  const before = readArchiveCapacityObservation(budget, { throughSeq: 7 })!;
  expect(before.rowContext?.oldRowBytes).toBe(9);
  expect(before.firstQuote?.costs?.total?.metadata).toBe(1);
  expect(before.selectedQuote?.costs?.total?.metadata).toBe(2);
  expect(before.distinctSelections).toBe(1);
  expect(before.selectionCalls).toBe(2);
  expect(before.quoteCalls).toBe(2);
  let getters = 0;
  const hostile = Object.defineProperty({}, "metadata", { enumerable: true, get() { getters++; return "private body"; } });
  observeArchiveFinishQuote(budget, { throughSeq: 8, costs: { total: hostile }, body: "private body" } as never);
  observeArchiveFinishQuote(budget, { throughSeq: 8, costs: { total: hostile } });
  const after = readArchiveCapacityObservation(budget, { throughSeq: 7, body: "private body" } as never)!;
  expect(getters).toBe(0);
  expect(after.firstQuote).toEqual(before.firstQuote);
  expect(after.observationComplete).toBe(false);
  expect(after.terminal).toBeNull();
  expect(JSON.stringify(after)).not.toContain("private body");
  expect(after.sites.every(site => site.frames.every(frame => frame.every(Number.isSafeInteger)))).toBe(true);
});

test("site and refusal caps keep the native ledger while declaring lost attribution incomplete", () => {
  const budget = createObservedArchiveBudget({}, () => 0);
  // Real engine frames with distinct coordinates in this public test source.
  // The synthetic functions contain only this fixed trusted debit statement.
  for (let line = 0; line < 65; line++) {
    const spend = new Function("budget", "\n".repeat(line) + "budget.spend({ metadata: 1 });\n//# sourceURL=file:///packages/scope/test/archive-capacity-observation.test.ts") as (budget: ArchiveBudget) => void;
    spend(budget);
  }
  for (let index = 0; index < 17; index++) expect(budget.canSpend({ metadata: ARCHIVE_BOUNDS.metadata + 1 })).toBe(false);
  const report = readArchiveCapacityObservation(budget, { throughSeq: null })!;
  expect(report.sites).toHaveLength(64);
  expect(report.refusals).toHaveLength(16);
  expect(report.droppedSiteCalls).toBeGreaterThan(0);
  expect(report.droppedRefusals).toBe(1);
  expect(report.admitted?.metadata).toBe(65);
  expect(report.admittedDelta.metadata).toBe(65);
  expect(report.ledgerReconciled).toBe(true);
  expect(report.observationComplete).toBe(false);
  expect(report.debitAttributionComplete).toBe(false);
});

// A partial diagnostic must not become a complete cost reconstruction merely
// because its ledger is empty and reconciles. No source admission is involved.
test("an empty finish quote leaves geometry incomplete even when debit attribution is complete", () => {
  const budget = createObservedArchiveBudget({}, () => 0);
  observeArchiveRowContext(budget, { oldRowBytes: 9, rowContextBytes: 12, snapshotConsumed: true });
  observeArchiveFinishQuote(budget, { throughSeq: 7 });
  const report = readArchiveCapacityObservation(budget, { throughSeq: 7, costs: { cost: budget.admitted() } })!;
  expect(report.ledgerReconciled).toBe(true);
  expect(report.debitAttributionComplete).toBe(true);
  expect(report.observationComplete).toBe(false);
});

test("a final selection refresh preserves its admitted quote after later unselected lookahead", () => {
  const budget = createObservedArchiveBudget({}, () => 0);
  observeArchiveFinishQuote(budget, { throughSeq: 1, scalars: { stage: 0 } });
  observeArchiveSelection(budget, 1);
  observeArchiveFinishQuote(budget, { throughSeq: 2, scalars: { stage: 0 } });
  observeArchiveSelection(budget, 2);
  observeArchiveFinishQuote(budget, { throughSeq: 3, scalars: { stage: 0 } });
  observeArchiveSelection(budget, 2);
  const report = readArchiveCapacityObservation(budget, { throughSeq: 3 })!;
  expect(report.firstQuote?.throughSeq).toBe(1);
  expect(report.selectedQuote?.throughSeq).toBe(2);
  expect(report.terminalQuote?.throughSeq).toBe(3);
  expect(report.selectedThroughSeq).toBe(2);
  expect(report.distinctSelections).toBe(2);
  expect(report.selectionCalls).toBe(3);
});
