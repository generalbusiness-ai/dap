/** One card action's input. The signed `expected` is the revisions the card read, and the scope refuses one that has moved. */
import type { FieldValue, Item, ScopeRef } from "@generalbusiness/dap-contract";
import { effectiveFields, expectedOf, type ActLike } from "@generalbusiness/dap-client";

export interface CapturedInput { target: string; on: number | null; fields: Record<string, FieldValue>; at: Record<string, number> }
export function captureInput(act: ActLike, items: readonly Item[], scope: ScopeRef, on: number | null, fields: Record<string, FieldValue>): CapturedInput {
  return { target: scope.scope, on, fields, at: expectedOf(act, items, on, effectiveFields(act, fields, scope)) };
}
