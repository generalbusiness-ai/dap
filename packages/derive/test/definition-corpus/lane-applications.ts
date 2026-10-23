/** Lane app declarations and the distinct validator contexts used by their scenarios. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { PROFILES } from "../../src/validate/index.ts";
import { platform } from "../../../platform/src/index.ts";
import { PARTITION_COHORT } from "../../../platform/src/directory-partitions.ts";
import { NATIVE_DECLARATION_PINS } from "../../../platform/src/native-declarations.generated.ts";
import { change, issue, changeDemo, issueDemo, change3, changeDemo3, DIGESTS, DEMO_DIGESTS, MANIFEST_DIGESTS } from "../../../../apps/room/lanes/src/index.ts";
import { officeDefinition, customRequiredChangeData, laneShapeBounds } from "../../../../apps/room/lanes/test/support/definition-corpus-data.ts";
import { experimentalForeignHoldChange } from "../../../../apps/room/lanes/test/support/foreign-hold-change.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const sourceDefinitions = [
  ["change", change, DIGESTS.change], ["issue", issue, DIGESTS.issue],
  ["changeDemo", changeDemo, DEMO_DIGESTS.change], ["issueDemo", issueDemo, DEMO_DIGESTS.issue],
  ["change3", change3, MANIFEST_DIGESTS.change], ["changeDemo3", changeDemo3, MANIFEST_DIGESTS.demo],
] as const;
const directoryOrigins = ["directory-partition-capacity.scope.test.ts", "directory-partition-success-capacity.scope.test.ts", "directory-partition-handoff.scope.test.ts"];
export const laneApplicationDefinitions: readonly DefinitionCorpusRow[] = [
  ...(["issue", "change"] as const).flatMap(name => Object.entries(laneShapeBounds[name]).map(([bound, value]) => ({
    name: `lanes/shape-bound/${name}/${bound}=${value}`,
    origins: [`apps/room/lanes/test/definitions.test.ts#meets.${name}.${bound}`],
    declaration: () => structuredClone(name === "issue" ? issue : change), bounds: { ...PROPOSED_BOUNDS, [bound]: value }, expectedDigest: DIGESTS[name],
  }))),
  ...(["issue", "change"] as const).map(name => ({ name: `lanes/shape-bound/${name}/listElements=32`,
    origins: [`apps/room/lanes/test/definitions.test.ts#at32.${name}`],
    declaration: () => structuredClone(name === "issue" ? issue : change), bounds: { ...PROPOSED_BOUNDS, listElements: 32 }, expectedDigest: DIGESTS[name],
  })),
  ...sourceDefinitions.map(([name, declaration, expectedDigest]) => ({ name: `lanes/source/${name}`,
    origins: [`apps/room/lanes/src/index.ts#${name}`, "apps/room/lanes/test/support/room.ts#valid", "apps/room/lanes/test/definitions.test.ts", "apps/room/lanes/test/manifest-definitions.test.ts"],
    declaration: () => structuredClone(declaration), bounds: PROPOSED_BOUNDS, expectedDigest })),
  { name: "lanes/fixture/office", origins: ["apps/room/lanes/test/support/graph.ts#officeDefinition"], declaration: () => structuredClone(officeDefinition), bounds: PROPOSED_BOUNDS },
  ...["cli-proposal-outcomes.test.ts", "manifest-tree.scope.test.ts"].map(file => ({ name: `lanes/custom-required/${file}`,
    origins: [`apps/room/lanes/test/${file}#custom`], declaration: customRequiredChangeData, bounds: PROPOSED_BOUNDS })),
  { name: "lanes/foreign-hold-change", origins: ["apps/room/lanes/test/support/foreign-hold-change.ts#experimentalForeignHoldChange", "apps/room/lanes/test/directory-partition-change.scope.test.ts#foreignChange"], declaration: () => structuredClone(experimentalForeignHoldChange), bounds: PROPOSED_BOUNDS },
  ...directoryOrigins.map(file => ({ name: `lanes/native-root/${file}`,
    origins: [`apps/room/lanes/test/${file}#validateDefinition`], declaration: () => structuredClone(platform(PARTITION_COHORT.directory)!.data),
    bounds: { ...PROPOSED_BOUNDS, scopeEntries: 3012 }, profiles: PROFILES, options: { platform: true }, expectedDigest: NATIVE_DECLARATION_PINS[PARTITION_COHORT.directory] ?? "" })),
  { name: "lanes/native-partition/handoff", origins: ["apps/room/lanes/test/directory-partition-handoff.scope.test.ts#validateDefinition"],
    declaration: () => structuredClone(platform(PARTITION_COHORT.partition)!.data), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 64 }, profiles: PROFILES, options: { platform: true }, expectedDigest: NATIVE_DECLARATION_PINS[PARTITION_COHORT.partition] ?? "" },
  { name: "lanes/native-root/recovery", origins: ["apps/room/lanes/test/directory-partition-recovery.scope.test.ts#validateDefinition"],
    declaration: () => structuredClone(platform(PARTITION_COHORT.directory)!.data), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true }, expectedDigest: NATIVE_DECLARATION_PINS[PARTITION_COHORT.directory] ?? "" },
];
