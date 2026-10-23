/** Native in-memory births/judgments; per-key grants are fixture authority. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { judgeDelivery, validateDefinition } from "../src/index.ts";
import { arriving, created, keys, sent, valid, type Ledger } from "./fixtures.ts";
import { peerPinData } from "./definition-corpus/peer-pin-data.ts";

export function peerPinDefinitions() {
  const data = peerPinData();
  const senderDefinition = valid(validateDefinition(data.sender, PROPOSED_BOUNDS));
  const alternateDefinition = valid(validateDefinition(data.alternate, PROPOSED_BOUNDS));
  const receiverDefinition = valid(validateDefinition(data.receiver, PROPOSED_BOUNDS));
  return { receiverDefinition, senderDefinition, alternateDefinition };
}
export function peerPinFixture() {
  const { receiverDefinition, senderDefinition, alternateDefinition } = peerPinDefinitions();
  const receiver = created(receiverDefinition, {}, "receiver");
  const sender = created(senderDefinition, {}, "sender"), other = created(alternateDefinition, {}, "other");
  for (const peer of [sender, other]) peer.did(keys.rita, "emit", { on: 0, expected: { on: peer.item(0).revision }, fields: { to: receiver.at, first: 17, second: 18 } });
  return { receiver, sender, other };
}
export function receivePeerPin(receiver: Ledger, sender: Ledger, verified = true) {
  const { delivered, source } = sent(sender, 1, 0), birth = sender.entries[0]!.entry.input;
  if (birth.type !== "genesis") throw Error("the actual sender birth is required");
  const checked = verified ? { ...source, pin: birth.seed.definition } : { entry: source.entry, under: source.under };
  const judgment = judgeDelivery(receiver.state, receiver.definition, delivered, arriving(receiver, delivered, checked));
  if (judgment.result === "write") receiver.seal(judgment.draft);
  return judgment;
}
