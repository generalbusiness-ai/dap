import { readFileSync } from "node:fs";
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { COUNTING_DEFINITION } from "../../../../apps/counter/pin.ts";
import { COUNTING_COMMITMENTS_DEFINITION } from "../../../../apps/counter/commitments-pin.ts";
import { LENDING_DEFINITION } from "../../../../examples/lending/pin.ts";
import { change, issue, changeDemo, issueDemo, change3, changeDemo3 } from "../../../../apps/room/lanes/src/index.ts";
import { DIGESTS, DEMO_DIGESTS } from "../../../../apps/room/lanes/src/digests.ts";
import { MANIFEST_DIGESTS } from "../../../../apps/room/lanes/src/digests3.ts";
import { counting } from "../../../../apps/counter/definition.ts";
import { countingCommitments } from "../../../../apps/counter/commitments.ts";
import { lending } from "../../../../examples/lending/definition.ts";
import { site } from "../../../../examples/grow/site.ts";
import { room } from "../../../../examples/grow/room.ts";
import { demoDefinitions } from "../../../../examples/grow/demo-definitions.ts";
import { EARLIER_GROW_DEFINITIONS } from "../../../../examples/grow/earlier-release.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const declared = [
  ["Counting", "apps/counter/definition.ts#counting", counting, COUNTING_DEFINITION],
  ["Counting commitments", "apps/counter/commitments.ts#countingCommitments", countingCommitments, COUNTING_COMMITMENTS_DEFINITION],
  ["Lending", "examples/lending/definition.ts#lending", lending, LENDING_DEFINITION],
  ["Grow Site", "examples/grow/site.ts#site", site, undefined],
  ["Grow Room", "examples/grow/room.ts#room", room, undefined],
] as const;
const pinnedFiles = [
  ["apps/counter/definition.json", COUNTING_DEFINITION], ["apps/counter/commitments.json", COUNTING_COMMITMENTS_DEFINITION],
  ["examples/lending/definition.json", LENDING_DEFINITION],
  ["apps/room/lanes/definitions/change.json", DIGESTS.change], ["apps/room/lanes/definitions/issue.json", DIGESTS.issue],
  ["apps/room/lanes/definitions/change-demo.json", DEMO_DIGESTS.change], ["apps/room/lanes/definitions/issue-demo.json", DEMO_DIGESTS.issue],
  ["apps/room/lanes/definitions/change3.json", MANIFEST_DIGESTS.change], ["apps/room/lanes/definitions/change-demo3.json", MANIFEST_DIGESTS.demo],
] as const;
const retainedGrowPins = [
  ["Room", EARLIER_GROW_DEFINITIONS[1]],
  ["Site", EARLIER_GROW_DEFINITIONS[0]],
] as const;
export const shippedDefinitions: readonly DefinitionCorpusRow[] = [
  // These owning callers deliberately omit profiles/options. Keep their
  // default validator inputs separate from the rule-profile rows below.
  { name: "shipped/Grow Room default profiles", origins: [
    "packages/scope/test/grow-owned-scopes.test.ts#maintained Room projection validation",
    "packages/scope/test/grow-owned-scopes.test.ts#maintained Room command validation",
    "packages/scope/test/support/maintained-applications-child.ts#prepareGrowCheck",
    "examples/grow/prepare-check.ts#canonical maintained room",
  ], declaration: () => structuredClone(room), bounds: PROPOSED_BOUNDS },
  { name: "shipped/Counting commitments default profiles", origins: [
    "packages/scope/test/archive-install.test.ts#installed TEST application declaration",
    "packages/scope/test/support/application-fixture.ts#applicationResolverFixture default declaration",
  ], declaration: () => structuredClone(countingCommitments), bounds: PROPOSED_BOUNDS,
    expectedDigest: COUNTING_COMMITMENTS_DEFINITION },
  ...([ ["change", change, DIGESTS.change], ["issue", issue, DIGESTS.issue], ["changeDemo", changeDemo, DEMO_DIGESTS.change],
    ["issueDemo", issueDemo, DEMO_DIGESTS.issue], ["change3", change3, MANIFEST_DIGESTS.change], ["changeDemo3", changeDemo3, MANIFEST_DIGESTS.demo] ] as const)
    .map(([name, declaration, expectedDigest]) => ({ name: `lanes/native/${name}`,
      origins: [`apps/room/lanes/src/index.ts#${name}`, "apps/room/lanes/test/support/room.ts#platformTransport", "packages/mcp/test/support/catalogue.ts#demoInventory", "apps/room/page/test/support/demo.ts#activate"],
      declaration: () => structuredClone(declaration), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, expectedDigest })),
  ...declared.map(([name, origin, data, pin]) => ({ name: `shipped/${name}`, origins: [origin],
    declaration: () => structuredClone(data), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, ...(pin === undefined ? {} : { expectedDigest: pin }) })),
  ...pinnedFiles.map(([path, pin]) => ({ name: `pinned/${path}`, origins: [path],
    declaration: (): unknown => JSON.parse(readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8")),
    bounds: PROPOSED_BOUNDS, expectedDigest: pin, ...(path.startsWith("apps/room/lanes/") ? {} : { profiles: RULE_PROFILES }) })),
  ...(["site", "room"] as const).map(part => ({ name: `Grow demo/${part}`,
    origins: [`examples/grow/demo-definitions.ts#demoDefinitions().${part}`, "examples/grow/demo-definitions.test.ts#actual definition validator witness"],
    declaration: () => demoDefinitions()[part], bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES })),
  ...retainedGrowPins.map(([name, pin], index) => ({ name: `retained Grow demo packet/${name}`,
    origins: [`examples/grow/fixtures/earlier-application.dap.json#semantic.definitions[${index}].bytes`],
    declaration: (): unknown => {
      const packet = JSON.parse(readFileSync(new URL("../../../../examples/grow/fixtures/earlier-application.dap.json", import.meta.url), "utf8"));
      return JSON.parse(packet.semantic.definitions[index].bytes);
    }, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, expectedDigest: pin })),
];
