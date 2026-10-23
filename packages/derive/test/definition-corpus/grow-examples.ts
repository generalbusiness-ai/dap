/** Grow examples' complete positive declarations and native launcher variants.
 * All construction is lazy; this shard imports no validated fixture or history. */
import { PROPOSED_BOUNDS, type FieldValue, type ScopeRef } from "@generalbusiness/dap-contract";
import { newIncarnation, scopeIdOf } from "@generalbusiness/dap-bytes";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import { demoDefinitions } from "../../../../examples/grow/demo-definitions.ts";
import { deviceTestDefinition, zoneTestDefinition, simulatorTickParentDefinition, growSiteLauncherDefinition, siteForRoomDefinition, misaddressedRoomDefinition } from "../../../../examples/grow/definition-corpus-data.ts";
import { site } from "../../../../examples/grow/site.ts";
import { room } from "../../../../examples/grow/room.ts";
import { preFailureRelationData } from "./package-graph-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";

/** Exact public fixture identity recipe from fixtures.ts ref('membership', 1),
 * then member() for keys.vic, keys.una and keys.paul. No actor keys are made. */
function simulatorFields(): Record<string, FieldValue> {
  const membership: ScopeRef = {
    scope: scopeIdOf({ v: 1, kind: "membership", definition: `sha256:${"e".repeat(64)}`, creator: null, cause: `sha256:${"c".repeat(64)}`, ordinal: 1 }),
    inc: newIncarnation(new Uint8Array(16).fill(1)), kind: "membership",
  };
  return { label: "TEST hosted room", sensors: { membership, member: "@vic" }, climate: { membership, member: "@una" }, operator: { membership, member: "@paul" } };
}

const native = (name: string, origins: readonly string[], declaration: () => unknown): DefinitionCorpusRow => ({
  name, origins, declaration, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES,
});
export const growExamplesDefinitions: readonly DefinitionCorpusRow[] = [
  native("Grow example/maintained Site native", ["examples/grow/room.test.ts#nativeCreatedSite(site)", "examples/grow/test-support.ts#nativeChild"], () => structuredClone(site)),
  native("Grow example/maintained Room native", ["examples/grow/room.test.ts#setup", "examples/grow/site.test.ts#setup.childDefinition", "examples/grow/work.test.ts#nativeScenario(room)", "examples/grow/watering.test.ts#nativeScenario(room)", "examples/grow/test-support.ts#nativeScenario", "examples/grow/test-support.ts#nativeChild"], () => structuredClone(room)),
  native("Grow example/Site for maintained Room", ["examples/grow/site.test.ts#setup()"], () => siteForRoomDefinition(room)),
  native("Grow example/misaddressed Room", ["examples/grow/site.test.ts#misaddressed"], misaddressedRoomDefinition),
  native("Grow example/Site for misaddressed Room", ["examples/grow/site.test.ts#setup(misaddressed)"], () => siteForRoomDefinition(misaddressedRoomDefinition())),
  native("Grow example/launcher for maintained Site", ["examples/grow/room.test.ts#nativeCreatedSite(site)"], () => growSiteLauncherDefinition(site)),
  native("Grow example/launcher for Site rebound to maintained Room", ["examples/grow/site.test.ts#setup().nativeCreatedSite(parentDefinition)"], () => growSiteLauncherDefinition(siteForRoomDefinition(room))),
  native("Grow example/launcher for Site rebound to misaddressed Room", ["examples/grow/site.test.ts#setup(misaddressed).nativeCreatedSite(parentDefinition)"], () => growSiteLauncherDefinition(siteForRoomDefinition(misaddressedRoomDefinition()))),
  native("Grow example/device forms", ["examples/grow/device.test.ts#definition", "examples/grow/device.test.ts#make", "examples/grow/test-support.ts#nativeScenario"], deviceTestDefinition),
  native("Grow example/zone forms", ["examples/grow/zone.test.ts#definition", "examples/grow/zone.test.ts#make", "examples/grow/zone.test.ts#foreign.nativeScenario", "examples/grow/test-support.ts#nativeScenario"], zoneTestDefinition),
  { name: "Grow example/simulator tick parent shape", origins: ["examples/grow/simulator-tick.test.ts#fixture.parentDefinition"],
    declaration: () => simulatorTickParentDefinition(demoDefinitions().room, simulatorFields()), bounds: PROPOSED_BOUNDS },
  native("Grow example/demo Site native", ["examples/grow/demo-definitions.test.ts#demoDefinitions().site", "examples/grow/test-support.ts#nativeChild"], () => demoDefinitions().site),
  native("Grow example/demo Room native", ["examples/grow/demo-definitions.test.ts#demoDefinitions().room", "examples/grow/simulator-tick.test.ts#fixture.room", "examples/grow/test-support.ts#nativeScenario", "examples/grow/test-support.ts#nativeChild"], () => demoDefinitions().room),
  native("Grow example/launcher for demo Site", ["examples/grow/demo-definitions.test.ts#nativeCreatedSite(site)", "examples/grow/test-support.ts#nativeCreatedSite.launcherDefinition"],
    () => growSiteLauncherDefinition(demoDefinitions().site)),
  native("Grow example/launcher for pre-failure relation Site", ["packages/derive/test/package-relation-order.test.ts#nativeCreatedSite(preFailureRelation(true).definitions[0].definition)", "examples/grow/test-support.ts#nativeCreatedSite.launcherDefinition"],
    () => growSiteLauncherDefinition(preFailureRelationData(true).definitions[0]!.definition)),
];
