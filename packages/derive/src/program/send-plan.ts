/** Closed send instructions captured by the existing admission branches. */
import type { FieldType, Seed } from "@generalbusiness/dap-contract";
import type { RangePlan } from "./guard-plan.ts";
import type { OperandRead, SlotRead } from "./reads.ts";
import { conditionSubjects } from "./condition-plan.ts";

export type SendSourcePlan = { readonly op: "self" }
  | { readonly op: "read"; readonly read: OperandRead }
  | { readonly op: "collect"; readonly range: RangePlan; readonly fields: readonly (readonly [string, CollectMember])[] };
export type CollectMember = { readonly op: "item" } | { readonly op: "state" } | { readonly op: "slot"; readonly slot: SlotRead };
export type SendFields = readonly (readonly [string, SendSourcePlan])[];
export type SendCode =
  | { readonly op: "create"; readonly kind: Seed["kind"]; readonly definition: Seed["definition"] | "self"; readonly fields: SendFields }
  | { readonly op: "tell"; readonly to: SendSourcePlan; readonly targetSlot: string; readonly message: string; readonly fields: SendFields }
  | { readonly op: "relate"; readonly to: SendSourcePlan; readonly item: SendSourcePlan; readonly name: string; readonly state: string; readonly each: RangePlan | null; readonly fields: SendFields }
  | { readonly op: "index"; readonly fields: SendFields };
export interface PendingSendPlan { readonly code: SendCode; readonly skip: unknown }
export interface SendPlan { readonly code: SendCode; readonly absentSubjects: readonly string[] }

/** Reads and ranges already own their descriptors and lexical identities. */
export function ownSendPlan(plan: PendingSendPlan): SendPlan {
  const source = (value: SendSourcePlan): SendSourcePlan => value.op === "collect"
    ? Object.freeze({ ...value, fields: Object.freeze(value.fields.map(([name, member]) => Object.freeze([name, Object.freeze({ ...member })] as const))) })
    : Object.freeze({ ...value });
  const fields = Object.freeze(plan.code.fields.map(([name, value]) => Object.freeze([name, source(value)] as const)));
  const code = plan.code;
  let owned: SendCode;
  switch (code.op) {
    case "create": case "index": owned = Object.freeze({ ...code, fields }); break;
    case "tell": owned = Object.freeze({ ...code, to: source(code.to), fields }); break;
    case "relate": owned = Object.freeze({ ...code, to: source(code.to), item: source(code.item), fields }); break;
    default: return exhaustive(code);
  }
  return Object.freeze({ code: owned, absentSubjects: Object.freeze([...conditionSubjects(plan.skip)]) });
}

/** Preserve the existing wire conversion policy, including opaque party slots. */
export function sendReadType(read: OperandRead): FieldType | null {
  if (read.op === "item") return { type: "item", of: "" };
  if (read.projection && read.projection.op !== "ref") return null;
  if (read.op === "presented") return { type: "fact", kind: [], under: "" };
  if (read.op === "slot") return sendSlotType(read.slot);
  return read.op === "field" && read.baseType.kind === "declared" ? read.baseType.type : null;
}
export const sendSlotType = (slot: SlotRead): FieldType | null => slot.kind !== "party" && slot.type.kind === "declared" ? slot.type.type : null;
function exhaustive(value: never): never { throw new TypeError(`unknown send instruction: ${String(value)}`); }
