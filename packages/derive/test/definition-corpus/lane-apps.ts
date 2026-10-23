/** Positive raw lane test declarations. Native workflow refusals do not make
 * these declarations validator-negative. Every constructor stays lazy. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { changeDemo, DEMO_DIGESTS } from "../../../../apps/room/lanes/src/index.ts";
import { namedChangeApplication, foreignDestinationChange, editChangeDefinitions } from "../../../../apps/room/lanes/test/definition-corpus-data.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const shape = (name: string, origins: readonly string[], declaration: () => unknown): DefinitionCorpusRow => ({
  name: `lanes/apps/${name}`, origins, declaration, bounds: PROPOSED_BOUNDS,
});
const native = (name: string, origins: readonly string[], declaration: () => unknown): DefinitionCorpusRow => ({
  ...shape(name, origins, declaration), profiles: RULE_PROFILES,
});
const origin = "apps/room/lanes/test/declared-name-origin.scope.test.ts";
const edit = "apps/room/lanes/test/edit.scope.test.ts";
export const laneAppsDefinitions: readonly DefinitionCorpusRow[] = [
  native("named application/native", [`${origin}#namedApplication`, `${origin}#application-cohort activation and establish-application`], namedChangeApplication),
  shape("foreign destination extension/shape", [`${origin}#definition`, "apps/room/lanes/test/support/room.ts#valid"], foreignDestinationChange),
  native("foreign destination extension/native", [`${origin}#definition`, `${origin}#Native open-pr child`], foreignDestinationChange),
  shape("edit legacy/activation", [`${edit}#legacy`, `${edit}#act activate legacy.json`], () => editChangeDefinitions().legacy),
  shape("edit detached/activation", [`${edit}#detached`, `${edit}#act activate detached.json`], () => editChangeDefinitions().detached),
  shape("edit extended/activation", [`${edit}#extended`, `${edit}#act activate extended.json`], () => editChangeDefinitions().extended),
  native("edit extended/native", [`${edit}#extended`, `${edit}#second real edit`], () => editChangeDefinitions().extended),
  { ...shape("canonical demo/activation", [`${edit}#act activate change-demo.json`], () => structuredClone(changeDemo)), expectedDigest: DEMO_DIGESTS.change },
  { ...native("canonical demo/application-cohort activation", [`${origin}#canonical F1 capability refusal`], () => structuredClone(changeDemo)), expectedDigest: DEMO_DIGESTS.change },
];
