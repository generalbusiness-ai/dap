/** Admitted settlement instructions and the shared before/after item decision. */
import type { Settles, Subject } from "@generalbusiness/dap-contract";
import type { Item } from "../state.ts";
import { own } from "../values.ts";
import type { SlotRead, SubjectRead } from "./reads.ts";

export type ItemSettlementPlan = { readonly op: "state"; readonly subject: SubjectRead; readonly states: readonly string[] }
  | { readonly op: "mark"; readonly subject: SubjectRead; readonly states: readonly string[]; readonly slot: SlotRead };
export type SettlementPlan = ItemSettlementPlan
  | { readonly op: "copy"; readonly states: readonly string[]; readonly name: string; readonly kind: string };

export const ownSettlementPlan = (plan: SettlementPlan): SettlementPlan => Object.freeze({ ...plan, states: Object.freeze([...plan.states]) });
export function settlementSubject(plan: ItemSettlementPlan): string {
  if (plan.subject.identity.kind !== "subject") throw new TypeError("settlement has no admitted subject identity");
  return plan.subject.identity.name;
}

/** The fold's existing reconstruction shape is a projection, not new admitted syntax. */
export function settlementForm(plan: ItemSettlementPlan): Extract<Settles, { of: unknown }> {
  const of = settlementSubject(plan) as Subject;
  return plan.op === "mark" ? { of, in: plan.states, sets: plan.slot.name } : { of, in: plan.states };
}

export function settlementMatches(states: readonly string[], slot: string | null, before: Item | undefined, after: Item | undefined): boolean {
  if (!before || !after || !states.includes(before.state)) return false;
  return slot !== null ? own(before.values, slot) === false && own(after.values, slot) === true : !states.includes(after.state);
}
