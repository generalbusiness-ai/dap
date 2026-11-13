/** Actual public delivery judgments over made-up local declarations and histories. */
import type { FieldValue, Send } from "@generalbusiness/dap-contract";
import { factRefOf } from "@generalbusiness/dap-bytes";
import { judgeDelivery, type PlatformRules, type ValidDefinition } from "../src/index.ts";
import { Scope, T0, arriving, fields, fixtureSequence, forged, keys, on, t, ticketDefinition } from "./fixtures-entry.ts";

export function clockScene(definition: ValidDefinition, given: Record<string, FieldValue> = {}, platform?: PlatformRules) {
  const receiver = new Scope(definition), sender = new Scope(ticketDefinition, keys.rita.member, true, 7);
  const connected = receiver.act(keys.rita, "connect", { ...on(receiver, 0), ...fields({ peer: sender.at }) }, platform ? { platform } : {});
  if (connected.result !== "write") throw new Error(`clock fixture connect failed: ${JSON.stringify(connected)}`);
  const send: Send = { n: 0, to: receiver.at, message: { class: "request", type: "tell", body: { message: "clock", fields: given } } };
  const source = forged(fixtureSequence(sender), 1, sender.entries[1]!.entry.input, [send]), arrival = { ...send, from: factRefOf(source.entry, source.sequence.at) };
  const judge = (behind = true) => {
    receiver.now = behind ? t(-10) : T0;
    return judgeDelivery(receiver.state, definition, arrival, { ...arriving(receiver, arrival, source), ...(platform ? { platform } : {}) });
  };
  return { receiver, sender, source, arrival, judge };
}
