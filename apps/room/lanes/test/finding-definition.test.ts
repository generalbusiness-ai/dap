import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { canonicalize, definitionDigest, parseStrict } from "@generalbusiness/dap-bytes";
import { capabilitiesOf, counted, derivable, gitRead, holdCapabilityV2, validateDefinition } from "@generalbusiness/dap-derive";
import { FINDING_DIGESTS, J4_DIGESTS, changeFinding, changeJ4 } from "../src/index.ts";

test("the finding successor pins whole bytes, keeps the workspace rows outside its stated changes, and fits the bounds", () => {
  expect(canonicalize(parseStrict(readFileSync(new URL("../definitions/change-finding.json", import.meta.url), "utf8")))).toBe(canonicalize(changeFinding));
  expect(definitionDigest(changeFinding)).toBe(FINDING_DIGESTS.change);
  expect(FINDING_DIGESTS.change).not.toBe(J4_DIGESTS.change);

  // Remove each stated change, then compare every remaining row whole.
  const { finding, ...items } = changeFinding.items;
  const { "file-finding": file, "resolve-finding-own": own, "resolve-finding-any": any, "mark-finding-irrelevant": irrelevant, merge, ...acts } = changeFinding.acts;
  expect([finding, file, own, any, irrelevant].every(Boolean)).toBe(true);
  expect(merge.guards.at(-1)).toMatchObject({ reason: "finding-open" });
  expect({ ...merge, guards: merge.guards.slice(0, -1) }).toEqual(changeJ4.acts.merge);
  expect({ ...changeFinding, items, acts: { ...acts, merge: changeJ4.acts.merge } }).toEqual(changeJ4);

  const checked = validateDefinition(changeFinding, PROPOSED_BOUNDS);
  if (!checked.ok) throw new Error(JSON.stringify(checked.problems));
  expect(checked.definition.digest).toBe(FINDING_DIGESTS.change);
  const code = capabilitiesOf(holdCapabilityV2({ tokensPerHold: 2, rootRetentionSeconds: null }), gitRead());
  expect(derivable(checked.definition, code)).toBe(true);
  expect(counted(checked.definition, code, PROPOSED_BOUNDS)).toBeNull();
});
