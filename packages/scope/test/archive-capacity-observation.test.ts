/** Numeric diagnostics over the real budget, with counted SQL/clock stands.
 * These are plain function witnesses, not native archive or source admission. */
import { expect, test } from "vitest";
import { isDigest } from "@generalbusiness/dap-bytes";
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
    override admitted(): never { reads++; throw Error("custom ledger must not be read"); }
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
  expect(report.terminal).toBeNull();
  expect(report.rowContext).toBeNull();
  expect(report.firstQuote).toBeNull();
  expect(report.selectedQuote).toBeNull();
  expect(report.lastCompleteQuote).toBeNull();
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
  // Distinct trusted call sites work in both Node and the bundled Worker.
  const spenders = [
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
    () => budget.spend({ metadata: 1 }),
  ];
  for (const spend of spenders) spend();
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
  // A reservation at an omitted site must refund that same unattributed
  // bucket, rather than invent a later settlement-site attribution.
  const handle = budget.reserve({ metadata: 8, inputWork: 16 });
  budget.settle(handle, 2);
  const settled = readArchiveCapacityObservation(budget, { throughSeq: null })!;
  expect(settled.admitted?.metadata).toBe(67);
  expect(settled.unattributedAdmittedDelta.metadata).toBe(3);
  expect(settled.unattributedSettlementReduction).toMatchObject({ metadata: 6, inputWork: 12 });
  expect(settled.ledgerReconciled).toBe(true);
  expect(settled.debitAttributionComplete).toBe(false);
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
  expect(report.lastCompleteQuote?.throughSeq).toBe(3);
  expect(report.selectedThroughSeq).toBe(2);
  expect(report.distinctSelections).toBe(2);
  expect(report.selectionCalls).toBe(3);
});

test("the first completed finish keeps an immutable debit boundary after later writer work", () => {
  const budget = createObservedArchiveBudget({}, () => 0);
  budget.spend({ metadata: 1, calls: 1 });
  observeArchiveFinishQuote(budget, { throughSeq: 7, scalars: { stage: 0 } });
  const first = readArchiveCapacityObservation(budget, { throughSeq: 7 })!.firstFinishAttribution!;
  const before = JSON.stringify(first);
  expect(first.admitted?.metadata).toBe(1);
  expect(first.admitted?.calls).toBe(1);
  expect(first.ledgerReconciled).toBe(true);
  for (const axis of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const) {
    const sites = first.sites.reduce((sum, site) => sum + site.admittedDelta[axis], 0);
    expect(sites + first.unattributedAdmittedDelta[axis]).toBe(first.admitted?.[axis]);
    expect(first.admittedDelta[axis]).toBe(first.admitted?.[axis]);
  }
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.admitted)).toBe(true);
  expect(Object.isFrozen(first.sites)).toBe(true);
  expect(first.sites.every(site => Object.isFrozen(site) && Object.isFrozen(site.admittedDelta)
    && Object.isFrozen(site.frames) && site.frames.every(Object.isFrozen))).toBe(true);
  budget.spend({ metadata: 2, calls: 2 });
  observeArchiveFinishQuote(budget, { throughSeq: 8, scalars: { stage: 0 } });
  const after = readArchiveCapacityObservation(budget, { throughSeq: 8 })!;
  expect(after.admitted?.metadata).toBe(3);
  expect(after.admitted?.calls).toBe(3);
  expect(JSON.stringify(after.firstFinishAttribution)).toBe(before);
  expect(after.firstFinishAttribution?.admitted?.metadata).toBe(1);
});

test("target identity copies only a valid digest and rejects malformed hashes or foreign content fields", () => {
  const hash = "sha256:" + "a".repeat(64), other = "sha256:" + "b".repeat(64);
  if (!isDigest(hash) || !isDigest(other)) throw Error("The synthetic target hashes must be digests.");
  const budget = createObservedArchiveBudget({}, () => 0);
  const quote = { throughSeq: 7, throughHash: hash, scalars: { stage: 0 } };
  observeArchiveFinishQuote(budget, quote);
  quote.throughHash = other;
  const terminal = { throughSeq: 7, throughHash: hash };
  const before = readArchiveCapacityObservation(budget, terminal)!;
  terminal.throughHash = other;
  expect(before.firstQuote?.throughHash).toBe(hash);
  expect(before.terminal?.throughHash).toBe(hash);
  expect(Object.isFrozen(before.firstQuote)).toBe(true);
  expect(Object.isFrozen(before.terminal)).toBe(true);
  observeArchiveFinishQuote(budget, { throughSeq: 8, throughHash: "private-parent/path" } as never);
  observeArchiveFinishQuote(budget, { throughSeq: 8, throughHash: hash, content: "foreign request content" } as never);
  const malformed = readArchiveCapacityObservation(budget, { throughSeq: 8, throughHash: "private-parent/path" } as never)!;
  expect(malformed.firstQuote?.throughHash).toBe(hash);
  expect(malformed.lastCompleteQuote?.throughHash).toBe(hash);
  expect(malformed.terminal).toBeNull();
  expect(malformed.observationComplete).toBe(false);
  expect(malformed.flags).not.toBe(0);
  const foreign = readArchiveCapacityObservation(budget, { throughSeq: 8, throughHash: hash, content: "foreign request content" } as never)!;
  expect(foreign.terminal).toBeNull();
  const text = JSON.stringify(foreign);
  expect(text).not.toContain("private-parent/path");
  expect(text).not.toContain("foreign request content");
});

// The observer reports the real two-phase budget. It grants no admission,
// performs no read and does not change the original clock/deadline checks.
test("reservation settlement keeps net attribution at its original site and preserves native admission and clock calls", () => {
  function exercise(budget: ArchiveBudget) {
    const handle = budget.reserve({ calls: 1, nodes: 1, metadata: 8, inputWork: 16 });
    budget.spend({ metadata: 1, inputWork: 2 });
    budget.settle(handle, 2);
    const beforeFinish = budget.admitted();
    budget.spend({ calls: 2, metadata: 9, inputWork: 24 });
    let failure: unknown;
    try { budget.spend({ metadata: 1 }); } catch (error) { failure = error; }
    return { beforeFinish, final: budget.admitted(), reservations: budget.reservationCosts(), failure };
  }
  let originalClock = 0, observedClock = 0;
  const original = exercise(new ArchiveBudget({ calls: 3, metadata: 12, inputWork: 30 }, () => { originalClock++; return 0; }));
  const budget = createObservedArchiveBudget({ calls: 3, metadata: 12, inputWork: 30 }, () => { observedClock++; return 0; });
  expect(exercise(budget)).toEqual(original);
  expect(observedClock).toBe(originalClock);
  expect(original.beforeFinish).toMatchObject({ calls: 1, nodes: 1, metadata: 3, inputWork: 6 });
  const beforeRead = observedClock, report = readArchiveCapacityObservation(budget, { throughSeq: 1 })!;
  expect(observedClock).toBe(beforeRead);
  expect(report.ledgerReconciled).toBe(true);
  expect(report.admittedDelta).toEqual(original.final);
  expect(report.reservationCalls).toBe(1); expect(report.settlementCalls).toBe(1); expect(report.settlementThrew).toBe(0);
  expect(report.settlementReduction).toEqual({ entries: 0, attempts: 0, nodes: 0, calls: 0, metadata: 6, inputWork: 12 });
  const reservedSite = report.sites.find(site => site.settlementReduction.metadata === 6)!;
  expect(reservedSite).toBeDefined();
  expect(reservedSite.attemptedDebit).toMatchObject({ calls: 1, nodes: 1, metadata: 8, inputWork: 16 });
  expect(reservedSite.admittedDelta).toMatchObject({ calls: 1, nodes: 1, metadata: 2, inputWork: 4 });
  for (const axis of ["entries", "attempts", "nodes", "calls", "metadata", "inputWork"] as const)
    expect(report.sites.reduce((sum, site) => sum + site.admittedDelta[axis], report.unattributedAdmittedDelta[axis])).toBe(report.admitted?.[axis]);
});

test("settlement leaves earlier finish and row checkpoints as immutable snapshots", () => {
  const budget = createObservedArchiveBudget({}, () => 0);
  const handle = budget.reserve({ metadata: 8, inputWork: 16 });
  observeArchiveRowContext(budget, { oldRowBytes: 9, rowContextBytes: 12, snapshotConsumed: true });
  observeArchiveFinishQuote(budget, { throughSeq: 1, scalars: { stage: 0 } });
  const before = readArchiveCapacityObservation(budget, { throughSeq: 1 })!;
  const first = JSON.stringify(before.firstFinishAttribution);
  budget.settle(handle, 2);
  observeArchiveFinishQuote(budget, { throughSeq: 2, scalars: { stage: 0 } });
  const after = readArchiveCapacityObservation(budget, { throughSeq: 2 })!;
  expect(after.rowContextAdmitted).toMatchObject({ metadata: 8, inputWork: 16 });
  expect(after.firstQuote?.admitted).toMatchObject({ metadata: 8, inputWork: 16 });
  expect(after.lastCompleteQuote?.admitted).toMatchObject({ metadata: 2, inputWork: 4 });
  expect(JSON.stringify(after.firstFinishAttribution)).toBe(first);
  expect(after.firstFinishAttribution?.settlementReduction.metadata).toBe(0);
  expect(Object.isFrozen(after.firstFinishAttribution?.settlementReduction)).toBe(true);
  expect(after.settlementReduction).toMatchObject({ metadata: 6, inputWork: 12 });
  expect(after.ledgerReconciled).toBe(true);
});

test("bad, repeated and foreign settlements preserve the native refusal and record no false refund", () => {
  for (const fault of ["negative", "above", "repeated", "foreign"] as const) {
    function exercise(budget: ArchiveBudget) {
      const handle = budget.reserve({ metadata: 8, inputWork: 16 });
      if (fault === "repeated") budget.settle(handle, 2);
      const before = budget.admitted();
      let failure: unknown;
      try { budget.settle(fault === "foreign" ? Object.freeze({}) : handle, fault === "negative" ? -1 : fault === "above" ? 9 : 0); }
      catch (error) { failure = error; }
      return { before, after: budget.admitted(), reservations: budget.reservationCosts(), failure };
    }
    const original = exercise(new ArchiveBudget({}, () => 0)), budget = createObservedArchiveBudget({}, () => 0);
    const observed = exercise(budget);
    expect(observed).toEqual(original); expect(observed.failure).toBeInstanceOf(ArchiveStopped);
    expect(observed.after).toEqual(observed.before);
    const report = readArchiveCapacityObservation(budget, { throughSeq: null })!;
    expect(report.ledgerReconciled).toBe(true); expect(report.settlementThrew).toBe(1);
    expect(report.settlementReduction).toMatchObject({ metadata: fault === "repeated" ? 6 : 0, inputWork: fault === "repeated" ? 12 : 0 });
    expect(observed.reservations.settlementRefusal).toBe(fault === "negative" || fault === "above" ? "invalid-received" : "unknown-reservation");
  }
});
