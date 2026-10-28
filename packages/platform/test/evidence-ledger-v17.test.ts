import { expect, test } from "vitest";
import { PROPOSED_BOUNDS, type FactRef, type ScopeRef } from "@generalbusiness/dap-contract";
import { canonicalize } from "@generalbusiness/dap-bytes";
import { RuleFault, type Item, type RuleGiven, type StateView } from "@generalbusiness/dap-derive";
import { d, otherLane, t } from "@generalbusiness/dap-derive/testing";
import { EVIDENCE_LEDGER_ITEM_V17, evidenceLedgerInitializationV17, evidenceLedgerOfV17 } from "../src/evidence-ledger-v17.ts";

// SCRIPTED folded-state ports. These test singleton correspondence and the
// actual initialization effects, not a Native certificate/fold/admission.
const destination: ScopeRef = { ...otherLane, kind: "destination" };
const zero = { keys: 0, holds: 0, policyGenerations: 0, incidents: 0 };
const used = { keys: 1, holds: 2, policyGenerations: 3, incidents: 4 };
const item = (id: number, type: string, values: Item["values"] = {}, refs: Item["refs"] = {}, state = "ready"): Item => ({
  id, type, state, revision: 40, opened: d("c"), parties: {}, refs, values, attributed: [],
});
const branch = (reference?: Item["refs"][string], values: Item["values"] = {}): Item => item(0, "branch", values,
  reference === undefined ? {} : { evidenceLedger: reference });
const ledger = (values: Item["values"] = { counts: used }): Item => item(20, "evidence-ledger", values);
function state(items: readonly Item[], at = destination): Pick<StateView, "scope" | "page" | "item"> {
  return { scope: () => ({ at, creator: null, status: "active", head: { seq: 49, hash: d("a") }, time: t(0),
    genesis: { hash: d("a"), source: null, n: null }, held: [] }),
    item: id => items.find(value => value.id === id) ?? null,
    page: (type, states, after, limit) => {
      const found = items.filter(value => value.type === type && states.includes(value.state) && (after === null || value.id > after)).sort((a, b) => a.id - b.id);
      return { items: found.slice(0, limit), more: found.length > limit };
    } };
}
const given = (view: ReturnType<typeof state>, on: Item | null): RuleGiven => ({ state: view,
  resolved: { self: 50, at: destination, bounds: PROPOSED_BOUNDS, subjects: new Map(on ? [["on", on]] : []) } }) as unknown as RuleGiven;

test("before the first certificate absence is null; initialization emits one ledger and no service write", () => {
  const current = branch(), view = state([current]);
  expect(evidenceLedgerOfV17(view)).toBeNull();
  expect(evidenceLedgerInitializationV17(given(view, current))).toEqual([
    { effect: "open", item: 50, type: "evidence-ledger", state: "ready" },
    { effect: "value", item: 50, slot: "counts", value: zero },
    { effect: "ref", item: 0, slot: "evidenceLedger", to: 50 },
  ]);
  expect(EVIDENCE_LEDGER_ITEM_V17).toMatchObject({ many: false, max: 1, states: { ready: { final: false } },
    values: { counts: { fixed: false, required: true }, service: { fixed: false, required: false } } });
});

test("the post-entry singleton is reused without a second item or a reset of used counters", () => {
  const current = branch(20), retained = ledger(), view = state([current, retained]), before = canonicalize([current, retained]);
  expect(evidenceLedgerOfV17(view)).toEqual(retained);
  expect(evidenceLedgerInitializationV17(given(view, current))).toEqual([]);
  expect(evidenceLedgerOfV17(view)?.values["counts"]).toEqual(used);
  expect(canonicalize([current, retained])).toBe(before);
  const local: FactRef = { at: destination, seq: retained.id, hash: retained.opened! };
  expect(evidenceLedgerOfV17(state([branch(local), retained]))).toEqual(retained);
});

test("stray, missing, duplicated and post-certificate anchors never become zero counts", () => {
  const cases = [
    state([branch(), ledger()]), state([branch(20)]), state([branch(20), ledger(), item(21, "evidence-ledger", { counts: zero })]),
    state([branch(20), item(1, "branch"), ledger()]), state([branch(undefined, { rulesCertificateRequest: "{}" })]),
    state([branch(undefined, { rulesCertificateDeclined: "{}" })]), state([ledger()]), state([]),
  ];
  for (const view of cases) expect(() => evidenceLedgerOfV17(view)).toThrow(RuleFault);
});

test("the pointer must name the actual same-scope singleton and its opening hash", () => {
  const retained = ledger(), local: FactRef = { at: destination, seq: 20, hash: retained.opened! };
  const references: Item["refs"][string][] = [null, "20", -0, 99, { bad: true },
    { ...local, at: { ...destination, inc: "in_aaaaaaaaaaaaaaaaaaaaaaaaaa" } }, { ...local, hash: d("d") }];
  for (const reference of references) expect(() => evidenceLedgerOfV17(state([branch(reference), retained]))).toThrow(RuleFault);
  expect(() => evidenceLedgerOfV17(state([branch(19), item(19, "evidence-job"), retained]))).toThrow(RuleFault);
  expect(() => evidenceLedgerOfV17(state([branch(20), { ...retained, state: "broken" }]))).toThrow(RuleFault);
});

test("counts are required, closed and bounded, with no malformed-value fallback", () => {
  const candidates: readonly Item["values"][] = [
    {}, { counts: null }, { counts: "{}" }, { counts: { ...used, holds: -1 } }, { counts: { ...used, holds: 513 } },
    { counts: { ...used, incidents: 8193 } }, { counts: { ...used, extra: 0 } },
  ];
  for (const values of candidates) expect(() => evidenceLedgerOfV17(state([branch(20), ledger(values)]))).toThrow(RuleFault);
});

test("initialization requires the actual unique ready branch as its resolved subject", () => {
  const current = branch(), view = state([current]);
  expect(() => evidenceLedgerInitializationV17(given(view, null))).toThrow(RuleFault);
  expect(() => evidenceLedgerInitializationV17(given(view, item(99, "branch")))).toThrow(RuleFault);
  const empty = { ...current, state: "empty" };
  expect(evidenceLedgerOfV17(state([empty]))).toBeNull();
  expect(() => evidenceLedgerInitializationV17(given(state([empty]), empty))).toThrow(RuleFault);
  expect(() => evidenceLedgerInitializationV17(given(state([current, item(50, "evidence-job")]), current))).toThrow(RuleFault);
});
