/** G17's one nonfinal counter/service anchor. Only the first certificate
 * opens it. Missing or corrupt persisted state never becomes zero counts. */
import type { PlatformData } from "@generalbusiness/dap-contract";
import { natural, isFactRef, same } from "@generalbusiness/dap-bytes";
import { RuleFault, type Item, type RuleEffect, type RuleGiven, type StateView } from "@generalbusiness/dap-derive";
import { readEvidenceCountsV17 } from "./evidence-index-v17.ts";

type LedgerState = Pick<StateView, "scope" | "page" | "item">;
export const EVIDENCE_LEDGER_ITEM_V17: PlatformData["items"][string] = {
  many: false, max: 1, initial: "ready", states: { ready: { final: false } }, parties: {}, refs: {}, values: {
    counts: { fixed: false, required: true, of: { type: "code", code: "evidence-counts-v17", row: "E1" } },
    service: { fixed: false, required: false, of: { type: "code", code: "evidence-service-v17", row: "E1" } },
  },
};
const fault = (): never => { throw new RuleFault("The singleton evidence ledger is unavailable"); };
const empty = (value: unknown): boolean => value === null || value === undefined;
function singleton(state: LedgerState, type: string, states: readonly string[]): Item | null {
  const page = state.page(type, states, null, 2);
  if (page.more || page.items.length > 1) return fault();
  const indexed = page.items[0];
  if (!indexed) return null;
  const actual = state.item(indexed.id);
  if (!actual || actual.type !== type || !states.includes(actual.state) || !same(actual, indexed)) return fault();
  return actual;
}
function branch(state: LedgerState): Item | null {
  return singleton(state, "branch", ["empty", "ready"]);
}
export function evidenceLedgerOfV17(state: LedgerState): Item | null {
  try {
    const own = state.scope(), current = branch(state), ledger = singleton(state, "evidence-ledger", ["ready"]);
    if (!own) return current || ledger ? fault() : null;
    if (own.at.kind !== "destination" || !current) return fault();
    const reference = current?.refs["evidenceLedger"];
    if (empty(reference)) {
      if (ledger || !empty(current.values["rulesCertificateRequest"]) || !empty(current.values["rulesCertificateDeclined"])) return fault();
      return null;
    }
    if (!current || current.state !== "ready" || !ledger) return fault();
    const position = natural(reference) ? reference : isFactRef(reference) && same(reference.at, own.at) ? reference.seq : null;
    if (position === null || position !== ledger.id || isFactRef(reference) && reference.hash !== ledger.opened
      || state.item(position)?.type !== "evidence-ledger" || !Object.hasOwn(ledger.values, "counts") || readEvidenceCountsV17(ledger.values["counts"]) === null) return fault();
    return ledger;
  } catch (error) {
    if (error instanceof RuleFault) throw error;
    return fault();
  }
}
export function evidenceLedgerInitializationV17(given: RuleGiven): readonly RuleEffect[] {
  const current = branch(given.state), on = given.resolved.subjects.get("on");
  if (!current || current.state !== "ready" || !on || !same(on, current)) return fault();
  if (evidenceLedgerOfV17(given.state)) return [];
  if (!natural(given.resolved.self) || given.state.item(given.resolved.self) !== null) return fault();
  return [
    { effect: "open", item: given.resolved.self, type: "evidence-ledger", state: "ready" },
    { effect: "value", item: given.resolved.self, slot: "counts", value: { keys: 0, holds: 0, policyGenerations: 0, incidents: 0 } },
    { effect: "ref", item: current.id, slot: "evidenceLedger", to: given.resolved.self },
  ];
}
