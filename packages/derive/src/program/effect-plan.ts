/** Closed effect instructions captured by the existing admission branches. */
import { ownCapabilityEffect, type CapabilityEffectPlan } from "./capability-plan.ts";
import type { RangePlan } from "./guard-plan.ts";
import type { ElementBinding, OperandRead, SlotRead, SubjectRead } from "./reads.ts";

export type CopySource = { readonly op: "clear" }
  | { readonly op: "read"; readonly read: OperandRead; readonly stated: boolean };
export type PartySource = CopySource | { readonly op: "members"; readonly reads: readonly OperandRead[] };
export type RefSource = CopySource | { readonly op: "self" };
export type EffectValueSource = CopySource | { readonly op: "commit-clock"; readonly path: string; readonly plusSeconds: number };
export type AttributeSource =
  | { readonly op: "items"; readonly range: RangePlan; readonly slot: SlotRead }
  | { readonly op: "subject"; readonly slot: SlotRead }
  | { readonly op: "list"; readonly read: OperandRead }
  | { readonly op: "each"; readonly read: OperandRead; readonly binding: ElementBinding; readonly list: OperandRead };
export interface EffectSite { readonly explicitSubject: boolean; readonly target: SubjectRead | null }
export type EffectCode =
  | { readonly op: "state"; readonly state: string }
  | { readonly op: "party"; readonly slot: SlotRead; readonly source: PartySource; readonly change: "add" | "remove" | null }
  | { readonly op: "ref"; readonly slot: SlotRead; readonly source: RefSource }
  | { readonly op: "value"; readonly slot: SlotRead; readonly source: EffectValueSource }
  | { readonly op: "attribute"; readonly slot: SlotRead; readonly of: SubjectRead; readonly with: readonly AttributeSource[] }
  | { readonly op: "hold"; readonly action: "open" | "renew" | "end"; readonly extent: OperandRead | null }
  | { readonly op: "redact"; readonly slot: SlotRead }
  | { readonly op: "capability"; readonly capability: CapabilityEffectPlan };
export interface EffectPlan { readonly site: EffectSite; readonly code: EffectCode }
export interface AttentionPlan { readonly slot: SlotRead; readonly when: "before" | "after"; readonly reason: string }

/** The old stated-source rule, resolved from the admitted read rather than raw syntax. */
export function sourceStated(read: OperandRead): boolean {
  if (read.projection && read.projection.op !== "ref") return read.projection.op === "intent";
  switch (read.op) {
    case "field": case "element": return read.baseType.kind !== "unknown";
    case "source": return read.entry.op === "intent";
    case "slot": case "presented": case "item": case "signer": case "intent": return true;
    case "update": case "result": case "sender": case "scope": case "none": case "const": case "read": return false;
    default: return exhaustive(read);
  }
}
export const copySource = (read: OperandRead): CopySource => Object.freeze({ op: "read", read, stated: sourceStated(read) });

/** Keep admitted read, range and binder identities while owning the instruction containers. */
export function ownEffectPlan(plan: EffectPlan): EffectPlan {
  const code = plan.code;
  let owned: EffectCode;
  switch (code.op) {
    case "party": owned = Object.freeze({ ...code, source: code.source.op === "members"
      ? Object.freeze({ ...code.source, reads: Object.freeze([...code.source.reads]) }) : Object.freeze({ ...code.source }) }); break;
    case "ref": owned = Object.freeze({ ...code, source: Object.freeze({ ...code.source }) }); break;
    case "value": owned = Object.freeze({ ...code, source: Object.freeze({ ...code.source }) }); break;
    case "attribute": owned = Object.freeze({ ...code, with: Object.freeze(code.with.map(source => Object.freeze({ ...source }))) }); break;
    case "capability": owned = Object.freeze({ ...code, capability: ownCapabilityEffect(code.capability) }); break;
    case "state": case "hold": case "redact": owned = Object.freeze({ ...code }); break;
    default: return exhaustive(code);
  }
  return Object.freeze({ site: Object.freeze({ ...plan.site }), code: owned });
}
function exhaustive(value: never): never { throw new TypeError(`unknown effect instruction: ${String(value)}`); }
