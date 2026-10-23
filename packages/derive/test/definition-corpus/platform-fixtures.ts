/** The platform tests' raw declarations and their distinct validator contexts. */
import { PROPOSED_BOUNDS, type PlatformDefinition } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { PROFILES, outcomeValueDomains } from "../../src/index.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import { VERSIONS } from "../../../platform/src/native-catalog.ts";
import { membership } from "../../../platform/src/membership.ts";
import { office, officeDataFor, bureau, registrar, registrarDataFor, asker, smallApplication, applicationChild, applicationRoot,
  applicationDestination, applicationWrongDestination, membershipWrittenRoles } from "../../../platform/test/definition-corpus-data.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const declared = (name: string, origins: readonly string[], declaration: () => unknown,
  profiles?: DefinitionCorpusRow["profiles"]): DefinitionCorpusRow => ({ name, origins, declaration, bounds: PROPOSED_BOUNDS,
    ...(profiles === undefined ? {} : { profiles }) });
export const platformFixtureDefinitions: readonly DefinitionCorpusRow[] = [
  declared("platform fixture/office", ["packages/platform/test/support.ts#officeDefinition"], () => structuredClone(office)),
  ...Object.entries(VERSIONS).filter(([, code]) => code.data.name === "platform:membership").map(([named]) =>
    declared(`platform fixture/office creates ${named}`, ["packages/platform/test/support.ts#officeDefinitionFor and Roster", "packages/scope/test/repository.ts#officeDefinitionFor"],
      () => officeDataFor(named as PlatformDefinition))),
  declared("platform fixture/bureau", ["packages/platform/test/support-destination.ts#bureauDefinition"], () => structuredClone(bureau)),
  declared("platform fixture/registrar", ["packages/platform/test/support-rules.ts#registrarDefinition"], () => structuredClone(registrar)),
  ...Object.entries(VERSIONS).filter(([, code]) => code.data.name === "platform:rules").map(([named]) =>
    declared(`platform fixture/registrar creates ${named}`, ["packages/platform/test/support-rules.ts#Rulebook creator"], () => registrarDataFor(named as PlatformDefinition))),
  declared("platform fixture/asker", ["packages/platform/test/support-rules.ts#askerDefinition"], () => structuredClone(asker)),
  declared("platform fixture/small application", ["packages/platform/test/application.test.ts#declaration"], () => structuredClone(smallApplication), RULE_PROFILES),
  declared("platform fixture/small child", ["packages/platform/test/application.test.ts#child closure"], applicationChild, RULE_PROFILES),
  declared("platform fixture/small root creates child", ["packages/platform/test/application.test.ts#root closure"], () => applicationRoot(definitionDigest(applicationChild())), RULE_PROFILES),
  declared("platform fixture/small publication", ["packages/platform/test/application.test.ts#publication fields and creation"], applicationDestination, RULE_PROFILES),
  declared("platform fixture/small wrong destination schema", ["packages/platform/test/application.test.ts#wrong publication schema"], () => applicationWrongDestination(applicationDestination()), RULE_PROFILES),
  { name: "platform fixture/membership written role lists", origins: ["packages/platform/test/definitions.test.ts#asData"], declaration: membershipWrittenRoles,
    bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  { name: "platform fixture/membership list bound 32", origins: ["packages/platform/test/definitions.test.ts#at32"], declaration: () => structuredClone(membership),
    bounds: { ...PROPOSED_BOUNDS, listElements: 32 }, profiles: PROFILES, options: { platform: true } },
  // checkedPlatformData and the memory-ledger builders use this shape-only
  // native context. Keep it separate from native.ts's rule/owner-domain check.
  ...Object.entries(VERSIONS).map(([named, code]): DefinitionCorpusRow => ({ name: `platform fixture/native shape ${named}`,
    origins: ["packages/platform/test/fixtures.ts#checkedPlatformData parameter family", "packages/platform/test/support.ts#Roster", "packages/platform/test/support-rules.ts#Rulebook"],
    declaration: () => structuredClone(code.data), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } })),
  { name: "platform fixture/destination evidence domains", origins: ["packages/platform/test/definitions.test.ts#destination evidence reserve", "packages/platform/test/support-destination.ts#destinationDefinition"],
    declaration: () => structuredClone(VERSIONS["platform:destination@2"]!.data), bounds: PROPOSED_BOUNDS, profiles: PROFILES,
    options: { platform: true, outcomeValues: outcomeValueDomains(VERSIONS["platform:destination@2"]!.data, VERSIONS["platform:destination@2"]!.rules) } },
];
