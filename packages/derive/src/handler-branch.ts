/** The applied entry records which body ran. Reconstruct that same body for
 * result clauses, child creation and replay; never derive the normal body
 * again from a late branch's sends. */
import type { ReceiveType } from "@generalbusiness/dap-contract";
import type { ValidDefinition } from "./validate/index.ts";
import { handlerBody, handlerHeader } from "./program/structure.ts";
export function handlerBranch(definition: ValidDefinition, handler: ReceiveType, late?: { reason: string }): ReceiveType | null {
  const body = handlerBody(definition, handler, late);
  return body ? handlerHeader(definition, body) : null;
}
