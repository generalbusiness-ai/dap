/** Real in-memory native judgments; per-key grants are the fixture's explicit
 * all-actions stand-in. No enrollment or hosted transport is exercised. */
import type { ActType, DeclaredDefinition, ReceiveType } from "@generalbusiness/dap-contract";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { validateDefinition } from "../src/index.ts";
import { created, keys, valid } from "./fixtures.ts";
const integer = { type: "int", min: 0, max: 100 } as const;
const act = (given: Partial<ActType> & Pick<ActType, "step" | "on">): ActType => ({ grant: "write", fields: {}, also: {}, guards: [], effects: [], sends: [], attention: [], ...given });
const handler = (message: string): ReceiveType => ({ message, class: "tell", from: { kind: "directory" }, order: "source", opens: null,
  fields: { value: { ...integer, required: true } }, also: { board: { item: "board", one: true } }, guards: [],
  effects: [{ of: "also.board", value: { slot: "last", from: { field: "value" } } }], sends: [], attention: [] });
export const sourceOrderDefinition: DeclaredDefinition = {
  format: "artroom-definition-1", name: "test.source-order", profile: { name: "restricted", version: 1 }, capabilities: [], genesis: "found",
  items: { board: { many: false, max: 1, states: { open: { final: false } }, initial: "open", parties: {}, refs: { peer: { fixed: false, required: false, to: { type: "scope", kind: "directory" } } }, values: { last: { fixed: false, required: false, of: integer } } } },
  acts: {
    found: act({ step: "open", on: "board", effects: [{ value: { slot: "last", from: { const: 0 } } }] }),
    emit: act({ step: "transition", on: "board", fields: { to: { type: "scope", kind: "directory", required: true }, first: { ...integer, required: true }, second: { ...integer, required: true } },
      effects: [{ ref: { slot: "peer", from: { field: "to" } } }], sends: [
        { tell: { to: { slot: "peer" }, message: "sample", fields: { value: { field: "first" } }, result: {} } },
        { tell: { to: { slot: "peer" }, message: "sample", fields: { value: { field: "second" } }, result: {} } },
        { tell: { to: { slot: "peer" }, message: "other", fields: { value: { field: "first" } }, result: {} } },
      ] }),
  }, receives: { sample: handler("sample"), other: handler("other") }, timed: {}, rules: {},
};
export function sourceOrderFixture(declaration = structuredClone(sourceOrderDefinition)) {
  const definition = valid(validateDefinition(declaration, PROPOSED_BOUNDS));
  const receiver = created(definition, {}, "receiver"), sender = created(definition, {}, "sender");
  for (const [first, second] of [[1, 2], [3, 4]]) sender.did(keys.rita, "emit", { on: 0, expected: { on: sender.item(0).revision }, fields: { to: receiver.at, first: first!, second: second! } });
  return { receiver, sender, definition };
}
