import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, isEntry, utf8 } from "@generalbusiness/dap-bytes";
import { MemoryState, type Item, type Operation } from "@generalbusiness/dap-derive";
import { d, otherLane } from "@generalbusiness/dap-derive/testing";
import { EVIDENCE_ACCOUNT_SETTLE_V17, evidenceAccountLedgerClosedV17, evidenceSettlementBudgetV17 } from "../src/evidence-account-settlement-v17.ts";

// SCRIPTED folded rows in the maintained MemoryState. This controls the exact
// ledger predicate, not Native admission, signed results or provider drain.
const holder: Item = { id: 7, type: "evidence-batch", state: "funded", revision: 7, opened: d("a"), parties: {}, refs: {}, values: {}, attributed: [] };
const settlement: Operation = { id: "7:0", owner: "platform:destination@17", kind: EVIDENCE_ACCOUNT_SETTLE_V17,
  for: holder.id, most: 1, selected: null, attempts: [{ attempt: 1, opened: 7, outcomes: [] }] };
const result = (status: "confirmed" | "refused" | "unknown"): Operation => ({ ...settlement, id: "8:0", kind: "evidence-result",
  attempts: [{ attempt: 1, opened: 8, outcomes: [{ seq: 9, result: status, evidence: d("b"), selected: null }] }] });
function state() { const view = new MemoryState(); view.putItem(holder); view.putOperation(settlement); return view; }

test("unknown or unopened peer work keeps the original account reserved; decisive ledger answers may close", () => {
  const view = state();
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement)).toBe(true);
  view.putOperation(result("unknown"));
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement)).toBe(false);
  view.putOperation({ ...result("unknown"), attempts: [{ attempt: 1, opened: 8, outcomes: [] }] });
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement)).toBe(false);
  for (const status of ["confirmed", "refused"] as const) {
    view.putOperation(result(status));
    expect(evidenceAccountLedgerClosedV17(view, holder, settlement)).toBe(true);
  }
  expect(evidenceAccountLedgerClosedV17(view, holder, { ...settlement, for: 99 })).toBe(false);
});

test("only the exact settlement self request is excluded; unavailable and unrelated pending requests stay charged", () => {
  const view = state(), pending = { seq: 10, n: 0, hash: d("b"), type: "tell" as const, to: otherLane, result: null, diagnosis: null };
  view.putAccount({ seq: 10, n: 0, item: holder.id }); view.putRequest(pending);
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement)).toBe(false);
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement, { seq: 10, n: 0 })).toBe(true);
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement, { seq: 10, n: 1 })).toBe(false);
  view.putRequest({ ...pending, diagnosis: { seq: 11, finding: "delivery-unavailable" } });
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement)).toBe(false);
  view.putRequest({ ...pending, result: { seq: 12, clause: "applied" } });
  expect(evidenceAccountLedgerClosedV17(view, holder, settlement)).toBe(true);
});

test("the complete future local carriers are valid wire entries and reject one byte below their independent maximum", () => {
  const quote = evidenceSettlementBudgetV17(PROPOSED_BOUNDS);
  expect(quote.admitted).toBe(true);
  for (const variant of quote.variants) {
    expect(isEntry(variant.entry)).toBe(true);
    const fact = { at: variant.entry.at, seq: Number.MAX_SAFE_INTEGER, hash: d("f") };
    const uses = Array.from({ length: PROPOSED_BOUNDS.usesPerEntry }, () => ({ fact, content: d("f") }));
    expect(variant.bytes).toBe(utf8(canonicalize({ ...variant.entry, uses })).length);
  }
  expect(evidenceSettlementBudgetV17({ ...PROPOSED_BOUNDS, entryBytes: quote.entryBytes - 1 }).admitted).toBe(false);
});
