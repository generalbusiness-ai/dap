/** Real in-memory native judgments; per-key grants are the fixture's explicit
 * all-actions stand-in. No enrollment or hosted transport is exercised. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { validateDefinition } from "../src/index.ts";
import { created, keys, valid } from "./fixtures.ts";
import { sourceOrderDefinition } from "./definition-corpus/source-order-data.ts";
export { sourceOrderDefinition } from "./definition-corpus/source-order-data.ts";

export function sourceOrderFixture(declaration = structuredClone(sourceOrderDefinition)) {
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS));
  const receiver = created(definition, {}, "receiver"), sender = created(definition, {}, "sender");
  for (const [first, second] of [[1, 2], [3, 4]]) sender.did(keys.rita, "emit", { on: 0, expected: { on: sender.item(0).revision }, fields: { to: receiver.at, first: first!, second: second! } });
  return { receiver, sender, definition };
}
