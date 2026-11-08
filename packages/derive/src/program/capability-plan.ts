/** Versioned opaque operations with arguments resolved by the existing validator. */
import type { CapabilityName } from "@generalbusiness/dap-contract";
import type { RangePlan } from "./guard-plan.ts";
import type { ElementBinding, OperandRead, SlotRead, SubjectRead } from "./reads.ts";

export type CapabilityArgument = { readonly op: "read"; readonly read: OperandRead }
  | { readonly op: "each"; readonly list: OperandRead; readonly binding: ElementBinding; readonly value: OperandRead }
  | { readonly op: "items"; readonly range: RangePlan; readonly slot: SlotRead };
export interface CapabilityGuardPlan {
  readonly version: CapabilityName;
  readonly guard: string;
  readonly arguments: readonly (readonly [string, CapabilityArgument])[];
}
export interface CapabilityEffectArgument {
  readonly read: OperandRead;
  readonly from: SubjectRead | null;
}
export interface CapabilityEffectPlan {
  readonly version: CapabilityName;
  readonly action: string;
  readonly arguments: readonly (readonly [string, CapabilityEffectArgument])[];
}

/** Read, range, slot and lexical identities belong to admission and must stay intact. */
export function ownCapabilityGuard(plan: CapabilityGuardPlan): CapabilityGuardPlan {
  return Object.freeze({ ...plan, arguments: Object.freeze(plan.arguments.map(([name, arg]) =>
    Object.freeze([name, Object.freeze({ ...arg })] as const))) });
}
export function ownCapabilityEffect(plan: CapabilityEffectPlan): CapabilityEffectPlan {
  return Object.freeze({ ...plan, arguments: Object.freeze(plan.arguments.map(([name, arg]) =>
    Object.freeze([name, Object.freeze({ ...arg })] as const))) });
}
