/** The applied entry records which body ran. Reconstruct that same body for
 * result clauses, child creation and replay; never derive the normal body
 * again from a late branch's sends. */
import type { ReceiveType } from "@generalbusiness/dap-contract";
export function handlerBranch(handler: ReceiveType, late?: { reason: string }): ReceiveType | null {
  if (!late) return handler;
  if (!handler.late?.then || handler.late.reason !== late.reason) return null;
  const { late: declared, ...common } = handler;
  return { ...common, guards: [], effects: declared.then!.effects ?? [], sends: declared.then!.sends ?? [], attention: declared.then!.attention ?? [] };
}
