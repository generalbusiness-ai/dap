/** Closed guard instructions captured by admission; child references stay local to the owning graph. */
import type { FieldType, Subject } from "@generalbusiness/dap-contract";
import { ownCapabilityGuard, type CapabilityGuardPlan } from "./capability-plan.ts";
import type { ElementBinding, FieldResolution, OperandRead, SlotRead } from "./reads.ts";
import { immutable } from "./data.ts";

export interface MissingRead { readonly kind: "field" | "presented"; readonly name: string }
export interface GuardSite {
  readonly path: string;
  readonly subject: string;
  readonly ifPresent: boolean;
  readonly absent: readonly MissingRead[];
  readonly reason: string | null;
}
export interface WherePlan { readonly op: "equals" | "differs"; readonly a: OperandRead; readonly b: OperandRead; readonly path: string }
export interface RangePlan {
  readonly type: string;
  readonly states: readonly string[];
  readonly where: readonly WherePlan[];
  readonly except: readonly Subject[];
}
export type BoundPlan = { readonly op: "absent" } | { readonly op: "literal"; readonly value: number } | { readonly op: "read"; readonly read: OperandRead };
export type FactSource = { readonly op: "field"; readonly field: FieldResolution } | { readonly op: "read"; readonly read: OperandRead };
export interface FactMatch { readonly name: string; readonly value: OperandRead }
export type ListSource = { readonly op: "field"; readonly field: FieldResolution } | { readonly op: "slot"; readonly slot: SlotRead };
interface BoundList { readonly list: OperandRead; readonly binding: ElementBinding }
export type GuardCode<N> =
  | { readonly op: "state"; readonly states: readonly string[] }
  | { readonly op: "signer" | "notIn"; readonly slots: readonly string[] }
  | { readonly op: "set" | "unset"; readonly slot: SlotRead }
  | { readonly op: "equals" | "differs"; readonly a: OperandRead; readonly b: OperandRead }
  | { readonly op: "some" | "none"; readonly range: RangePlan }
  | { readonly op: "count"; readonly range: RangePlan; readonly min: BoundPlan; readonly max: BoundPlan }
  | { readonly op: "every"; readonly list: ListSource; readonly states: readonly string[] }
  | { readonly op: "fact"; readonly source: FactSource; readonly type: Extract<FieldType, { type: "fact" }>; readonly where: readonly FactMatch[] }
  | { readonly op: "before" | "after"; readonly slot: SlotRead }
  | { readonly op: "rule"; readonly rule: string }
  | { readonly op: "capability"; readonly capability: CapabilityGuardPlan }
  | { readonly op: "anyOf"; readonly alternatives: readonly (readonly N[])[] }
  | { [K in "each" | "has"]: BoundList & { readonly op: K; readonly where: readonly WherePlan[]; readonly guards: readonly N[] } }["each" | "has"]
  | (BoundList & { readonly op: "distinct"; readonly key: OperandRead })
  | (BoundList & { readonly op: "sameSet"; readonly key: OperandRead; readonly items: RangePlan; readonly match: readonly WherePlan[]; readonly ordered: boolean });
export interface GuardPlan<N> { readonly site: GuardSite; readonly code: GuardCode<N> }

/** Replace pending child references once, without copying admitted read or binder identities. */
export function mapGuardChildren<A, B>(plan: GuardPlan<A>, child: (value: A) => B, origins?: WeakMap<object, object>): GuardPlan<B> {
  const code = plan.code;
  switch (code.op) {
    case "anyOf": return Object.freeze({ site: plan.site, code: Object.freeze({ ...code, alternatives: Object.freeze(code.alternatives.map(group => Object.freeze(group.map(child)))) }) });
    case "each": case "has": return Object.freeze({ site: plan.site, code: Object.freeze({ ...code, guards: Object.freeze(code.guards.map(child)) }) });
    case "fact": return Object.freeze({ site: plan.site, code: Object.freeze({ ...code, type: immutable(code.type, origins) }) });
    case "capability": return Object.freeze({ site: plan.site, code: Object.freeze({ ...code, capability: ownCapabilityGuard(code.capability) }) });
    case "state": case "signer": case "notIn": case "set": case "unset": case "equals": case "differs": case "some": case "none": case "count": case "every": case "before": case "after": case "rule": case "distinct": case "sameSet":
      return Object.freeze({ site: plan.site, code });
    default: return exhaustive(code);
  }
}
function exhaustive(value: never): never { throw new TypeError(`unknown guard instruction: ${String(value)}`); }
