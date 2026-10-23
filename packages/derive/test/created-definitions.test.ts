import { directCreationPins, indirectCreationPins, lateCreationPin } from "./definition-corpus/general-creation-data.ts";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { creates, validateDefinition } from "../src/index.ts";
import { d, desk, valid } from "./fixtures-entry.ts";

test("native create-definition edges are typed direct sends from acts/receives, deduplicated and ordered; self/platform/other digests add no edge", () => {
  // The fixture is declared data, not a registry or foreign-history proof.
  const data = structuredClone(desk);
  const first = data.acts["open-issue"]!.sends[0]!;
  const second = data.receives["spawn"]!.sends[0]!;
  if (!("create" in first) || !("create" in second)) return expect.fail("fixture has no native create sends");
  const root = valid(validateDefinition(data, PROPOSED_BOUNDS));
  expect(creates(root.declared)).toEqual([first.create.definition]);
  const changed = structuredClone(data);
  const act = changed.acts["open-issue"]!.sends[0]!, receive = changed.receives["spawn"]!.sends[0]!;
  if (!("create" in act) || !("create" in receive)) return expect.fail("fixture lost its create sends");
  directCreationPins(changed);
  expect(creates(valid(validateDefinition(changed, PROPOSED_BOUNDS)).declared)).toEqual([d("a"), d("b")]);
  indirectCreationPins(changed);
  expect(creates(valid(validateDefinition(changed, PROPOSED_BOUNDS)).declared)).toEqual([]);
  lateCreationPin(changed, receive.create);
  expect(creates(valid(validateDefinition(changed, PROPOSED_BOUNDS)).declared)).toEqual([d("c")]);
});
