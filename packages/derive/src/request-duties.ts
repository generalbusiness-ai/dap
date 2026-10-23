/** Transfer a send form's existing Amount to the request it actually made. */
import type { Entry, SendForm } from "@generalbusiness/dap-contract";
import { isPlatformDefinition } from "@generalbusiness/dap-bytes";
import { bound } from "./handlers.ts";
import { handlerBranch } from "./handler-branch.ts";
import { AmountError, NOTHING, requestEntries, subtract, type Amount } from "./held.ts";
import { formOf } from "./sends.ts";
import type { ValidDefinition } from "./validate/index.ts";
import { own } from "./values.ts";

/** The pending-request unit becomes Used at this entry. Keep the rest of
 * the actual source form's full Amount as derived folded bookkeeping. */
export function requestReservation(definition: ValidDefinition, entry: Entry, n: number): Amount {
  const input = entry.input;
  let path: string | null = null, forms: readonly SendForm[] | undefined;
  if (input.type === "act" || input.type === "genesis") {
    const kind = input.type === "act" ? input.signed.intent.kind : definition.declared.genesis;
    path = `acts.${kind}`;
    forms = own(definition.declared.acts, kind)?.sends;
  } else if (input.type === "delivery" && (input.message.class === "request" || input.message.class === "advisory")) {
    const handler = bound(definition, input.message, input.from)?.handler;
    const named = Object.entries(definition.declared.receives).find(([, form]) => form === handler);
    if (named) {
      const late = "decision" in input ? input.late : undefined;
      path = `receives.${named[0]}${late ? ".late.then" : ""}`;
      forms = handlerBranch(named[1], late)?.sends;
    }
  } else if (input.type === "outcome") {
    // A native outcome without a data send mark has no result clause,
    // exactly as runClause interprets it. Its owner funds this request.
    const amount = (n === 0 && isPlatformDefinition(input.owner) ? own(definition.reserving?.kinds, input.kind)?.request : undefined) ?? requestEntries(definition.pendingWorkAmounts.entry.bytes);
    return subtract(amount, { ...NOTHING, requests: 1 });
  }
  const form = forms && formOf(definition, forms, entry, n);
  const index = form && forms ? forms.indexOf(form as SendForm) : -1;
  const origin = path !== null && index >= 0 ? `${path}.sends.${index}` : null;
  const amounts = definition.reserving?.requests ?? definition.pendingWorkAmounts.requests;
  const amount = origin === null ? undefined : own(amounts, origin);
  if (!amount) throw new AmountError(`request ${entry.seq}.${n} has no originating send Amount`);
  return subtract(amount, { ...NOTHING, requests: 1 });
}
