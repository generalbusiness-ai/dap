/** Positive definitions from creation, standing, timed and source-order tests.
 * Raw constructors only: no validator, key, ledger or history runs on import. */
import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { PROFILES } from "../../src/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";
import { standingData } from "../fixtures-standing.ts";
import { desk, lane } from "./fixture-data.ts";
import { sourceOrderDefinition } from "./source-order-data.ts";
import { PIN_BOUNDS } from "./receiver-pins-data.ts";
import { createdEdgesData, contextDeclared, contextParentData, contextPlatformData, contextNamedData,
  standingWhole, standingNoDefault, standingZero, standingSingleton, timedByteOrderData, timedOwnNamesData,
  sourceArrival, sourceTime, sourceOnlyOne, sourceVariant, reservedOrderData, reservedArrivalData } from "./general-creation-data.ts";
const origin = (file: string, site: string) => `packages/derive/test/${file}.test.ts#${site}`;
const row = (name: string, origins: readonly string[], declaration: () => unknown): DefinitionCorpusRow => ({
  name: `derive/general creation/${name}`, origins, declaration, bounds: PROPOSED_BOUNDS,
});
export const generalCreationDefinitions: readonly DefinitionCorpusRow[] = [
  ...(["base", "direct", "indirect", "late"] as const).map(stage => row(`created edges ${stage}`,
    [origin("created-definitions", stage)], () => createdEdgesData(stage))),
  row("context child", [origin("creation-context", "declared")], () => structuredClone(contextDeclared)),
  ...["other-device-definition", "foreign-device-definition"].map(name => row(`context ${name}`,
    [origin("creation-context", name)], () => contextNamedData(name))),
  row("context child creating platform", [origin("creation-context", "platform")], contextPlatformData),
  ...([
    ["ordinary child", () => structuredClone(contextDeclared), "lane"],
    ["platform-creating child", contextPlatformData, "lane"],
    ["membership-self child", () => structuredClone(contextDeclared), "membership"],
  ] as const).map(([name, child, kind]) => row(`context parent ${name}`,
    [origin("creation-context", `incoming(${name},kind=${kind})`)], () => contextParentData(definitionDigest(child()), kind))),
  row("standing legacy desk", [origin("standing", "old"), origin("standing", "forbidden old definition")], () => structuredClone(desk)),
  ...([
    ["base", undefined], ["whole", standingWhole], ["without default", standingNoDefault],
    ["zero maximum", standingZero], ["non-genesis singleton", standingSingleton],
  ] as const).map(([name, change]): DefinitionCorpusRow => ({
    name: `derive/general creation/standing ${name}`, origins: [origin("standing", name)],
    declaration: () => standingData(change), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true },
  })),
  row("timed lane", [origin("timed", "twoHolds default laneDefinition")], () => structuredClone(lane)),
  row("timed byte-order rules", [origin("timed", "two rules ordered by UTF8")], timedByteOrderData),
  row("timed own names", [origin("timed", "named JSON __proto__/constructor")], timedOwnNamesData),
  row("source order baseline", [origin("source-order", "sourceOrderFixture default")], () => structuredClone(sourceOrderDefinition)),
  ...([
    ["arrival", sourceArrival], ["source time", sourceTime], ["only one applies", sourceOnlyOne],
  ] as const).map(([name, change]) => row(`source order ${name}`, [origin("source-order", name)], () => sourceVariant(change))),
  ...(["source", "arrival"] as const).map(order => ({ ...row(`reserved export ${order}`,
    [origin("source-order-reserved", `order=${order}`)], () => reservedOrderData(order)), bounds: PIN_BOUNDS })),
  { ...row("item-bound arrival", [origin("source-order-reserved", "item-bound arrival positive")], reservedArrivalData),
    bounds: PIN_BOUNDS, options: { platform: true } },
];
