/** Every complete positive declaration used by the Grow package-graph witnesses.
 * Graph refusals do not remove otherwise valid definitions from this corpus. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import type { PackageGraphInput } from "@generalbusiness/artroom-package-graph";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";
import { growData, preFailureRelationData } from "./package-graph-data.ts";
import * as variants from "./package-graph-variants.ts";

const graphRows = (name: string, origins: readonly string[], make: () => PackageGraphInput, members = ["Site", "Room"]): DefinitionCorpusRow[] =>
  members.map((member, index) => ({ name: `derive/Grow graph/${name}/${member}`, origins,
    declaration: () => make().definitions[index]!.definition, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES }));
const origin = (name: string) => `packages/derive/test/package-graph.test.ts#${name}`;
const changes = [
  ["published copies 2", variants.publishedCopies],
  ["direct copies 2", variants.insufficientCopies],
  ["conflict frees slot", variants.conflictFrees],
  ["recyclable room", variants.recyclable],
  ["rewritable endpoint", variants.rewritable],
  ["missing result", variants.missingResult],
  ["opening report", variants.openingReport],
  ["narrow transmitted field", variants.narrowField],
  ["unknown message", variants.unknownMessage],
  ["unused handler", variants.unusedHandler],
  ["packer copies 2", variants.packerCopies],
  ["paired unused handler", variants.pairedUnusedHandler],
  ["paired copies 2", variants.pairedCopies],
  ["paired rebind", variants.pairedRebind],
  ["paired missing result", variants.pairedMissingResult],
  ["paired unknown message", variants.pairedUnknownMessage],
  ["paired narrow field", variants.pairedNarrowField],
] as const;
const lifetime = ["retiring a confirmed backing slot", "retiring through the selected room", "repeated singleton creation",
  "refusal frees a previous slot", "recyclable related items", "creation conflict frees its slot"] as const;
const alternatives = ["unconditional alternative", "nested unconditional alternative", "empty universal list", "universal list filtered empty"] as const;

export const growPackageGraphDefinitions: readonly DefinitionCorpusRow[] = [
  ...graphRows("baseline", [origin("grow()"), "packages/derive/test/fixtures-package-graph.ts#grow"], () => growData()),
  ...changes.flatMap(([name, change]) => graphRows(name, [origin(name)], () => growData(change))),
  ...[3, 6].flatMap(copies => graphRows(`two Room items; copies ${copies}`, [origin(`twoItems(${copies})`)], () => growData(variants.twoItems(copies)))),
  ...lifetime.flatMap((name, index) => graphRows(`lifetime/${name}`, [origin(`lifetimeVariants/${name}`)], () => variants.lifetimeVariantsData()[index]!.input)),
  ...[3, 2].flatMap(copies => graphRows(`repeated reporter; copies ${copies}`, [origin(`repeatedReporter(${copies})`)], () => variants.repeatedReporterData(copies))),
  ...[false, true].flatMap(guarded => graphRows(`automatic cycle; guarded ${guarded}`, [origin(`automaticCycle(${guarded})`)], () => variants.automaticCycleData(guarded))),
  ...alternatives.flatMap((name, index) => (["good", "bad"] as const).flatMap(side => graphRows(`cycle/${name}/${side}`,
    [origin(`cycleAlternatives/${name}/${side}`)], () => variants.cycleAlternativesData()[index]![side]))),
  ...[true, false].flatMap(timer => graphRows(`pending creation; timer ${timer}`, [origin(`pendingCreation(${timer})`)], () => variants.pendingCreationData(timer))),
  ...([[false, 8], [false, 9], [true, 9]] as const).flatMap(([failedFinal, copies]) => graphRows(`pre-failure relation; final ${failedFinal}; copies ${copies}`,
    ["packages/derive/test/fixtures-package-graph.ts#preFailureRelation", failedFinal || copies === 9
      ? `packages/derive/test/package-relation-order.test.ts#preFailureRelation(${failedFinal})`
      : origin("preFailureRelation(false,8)")], () => preFailureRelationData(failedFinal, copies), ["Site", "Room", "Leaf"])),
  { name: "derive/Grow graph/Room label maximum 81", origins: [origin("different"), origin("alternate")],
    declaration: variants.differentRoomData, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES },
  ...graphRows("different peer pin", [origin("wrong-peer direct"), origin("wrong-peer paired")],
    () => growData(() => {}, definitionDigest(variants.differentRoomData()))),
];
