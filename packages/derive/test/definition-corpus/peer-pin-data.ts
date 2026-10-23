/** Raw peer-pinned declarations; their actual child digest uses unchanged raw bytes. */
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { sourceOrderDefinition } from "./source-order-data.ts";
export function peerPinData() {
  const sender = structuredClone(sourceOrderDefinition), alternate = structuredClone(sourceOrderDefinition);
  alternate.acts["found"]!.effects = [{ value: { slot: "last", from: { const: 3 } } }];
  const receiver = structuredClone(sourceOrderDefinition);
  receiver.name = "test.peer-receiver";
  receiver.receives["sample"]!.from = { kind: "directory", under: sender.name, pin: definitionDigest(sender) };
  return { receiver, sender, alternate };
}
