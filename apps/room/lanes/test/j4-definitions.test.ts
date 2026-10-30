import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import {
  canonicalize,
  definitionDigest,
} from "@generalbusiness/dap-bytes";
import {
  capabilitiesOf,
  counted,
  derivable,
  gitRead,
  holdCapability,
  holdCapabilityV2,
  validateDefinition,
} from "@generalbusiness/dap-derive";
import {
  DEMO_DIGESTS,
  J4_DIGESTS,
  changeDemo,
  changeJ4,
  issue,
  issueDemo,
  issueJ4,
} from "../src/index.ts";

const profiles = { issue: issueJ4, change: changeJ4 } as const;

test("the explicit workspace profile pins whole definitions and preserves the demo rows outside its stated changes", () => {
  for (const name of ["issue", "change"] as const) {
    const bytes = readFileSync(new URL(`../definitions/${name}-j4.json`, import.meta.url), "utf8");
    expect(bytes, name).toBe(canonicalize(profiles[name]));
    expect(definitionDigest(profiles[name]), name).toBe(J4_DIGESTS[name]);
    expect(J4_DIGESTS[name], name).not.toBe(DEMO_DIGESTS[name]);
  }

  // Restore each declared delta, then compare every remaining row whole.
  const { "release-hold": release, ...issueActs } = issueJ4.acts;
  expect(release).toBe(issue.acts["release-hold"]);
  expect({ ...issueJ4, capabilities: issueDemo.capabilities, acts: issueActs }).toEqual(issueDemo);
  expect(changeJ4.items.manifest.refs.pin.to.kind).toEqual(["hold@2:check"]);
  expect(changeJ4.acts["propose-manifest"].presents.pin.kind).toEqual(["hold@2:check"]);
  expect({
    ...changeJ4,
    capabilities: changeDemo.capabilities,
    items: {
      ...changeJ4.items,
      manifest: { ...changeJ4.items.manifest, refs: changeDemo.items.manifest.refs },
    },
    acts: { ...changeJ4.acts, "propose-manifest": changeDemo.acts["propose-manifest"] },
  }).toEqual(changeDemo);
  expect([definitionDigest(issueDemo), definitionDigest(changeDemo)])
    .toEqual([DEMO_DIGESTS.issue, DEMO_DIGESTS.change]);
});

test("both workspace definitions validate and fit the bounds with version 2 code; version 1 code cannot run them", () => {
  const options = { tokensPerHold: 2, rootRetentionSeconds: null } as const;
  const current = capabilitiesOf(holdCapabilityV2(options), gitRead());
  const previous = capabilitiesOf(holdCapability(options), gitRead());
  for (const [name, profile] of Object.entries(profiles)) {
    const checked = validateDefinition(profile, PROPOSED_BOUNDS);
    if (!checked.ok) throw new Error(`${name}: ${JSON.stringify(checked.problems)}`);
    expect(checked.definition.digest, name).toBe(J4_DIGESTS[name as keyof typeof profiles]);
    expect(derivable(checked.definition, current), name).toBe(true);
    expect(counted(checked.definition, current, PROPOSED_BOUNDS), name).toBeNull();
    expect(derivable(checked.definition, previous), name).toBe(false);
  }
});
