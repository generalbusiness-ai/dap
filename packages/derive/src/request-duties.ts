/** Transfer a send form's existing Amount to the request it actually made. */
import type { Entry, ReceiveType } from "@generalbusiness/dap-contract";
import { isPlatformDefinition } from "@generalbusiness/dap-bytes";
import { bound } from "./handlers.ts";
import { handlerBranch } from "./handler-branch.ts";
import { AmountError, NOTHING, requestEntries, subtract, type Amount } from "./held.ts";
import { sendOrigin } from "./program/send-origin.ts";
import { bodyStructure, type BodyStructure } from "./program/structure.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { own } from "./values.ts";

/** The pending-request unit becomes Used at this entry. Keep the rest of
 * the actual source form's full Amount as derived folded bookkeeping. */
export function requestReservation(definition: ValidDefinition, entry: Entry, n: number): Amount {
  const input = entry.input;
  let body: BodyStructure | null = null;
  if (input.type === "act" || input.type === "genesis") {
    const kind = input.type === "act" ? input.signed.intent.kind : definition.declared.genesis;
    const act = own(definition.declared.acts, kind);
    body = act ? bodyStructure(definition, act, kind) : null;
  } else if (input.type === "delivery" && (input.message.class === "request" || input.message.class === "advisory")) {
    const binding = bound(definition, input.message, input.from);
    const handler: ReceiveType | null = binding?.handler ? handlerBranch(definition, binding.handler, "decision" in input ? input.late : undefined) : null;
    body = handler && binding ? bodyStructure(definition, handler, binding.kind) : null;
  } else if (input.type === "outcome") {
    // A native outcome without a data send mark has no result clause,
    // exactly as runClause interprets it. Its owner funds this request.
    const amount = (n === 0 && isPlatformDefinition(input.owner) ? own(definition.reserving?.kinds, input.kind)?.request : undefined) ?? requestEntries(definition.pendingWorkAmounts.entry.bytes);
    return subtract(amount, { ...NOTHING, requests: 1 });
  }
  const selected = body ? sendOrigin(definition, body, entry, n) : null;
  // Only the actual admitted occurrence selects an existing reservation ledger key.
  const origin = selected?.node.path ?? null;
  const amounts = definition.reserving?.requests ?? definition.pendingWorkAmounts.requests;
  const amount = origin === null ? undefined : own(amounts, origin);
  if (!amount) throw new AmountError(`request ${entry.seq}.${n} has no originating send Amount`);
  return subtract(amount, { ...NOTHING, requests: 1 });
}
