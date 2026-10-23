import { PROPOSED_BOUNDS } from "@generalbusiness/dap-contract";
import { PROFILES } from "../../src/index.ts";
import { board, works } from "./forms-data.ts";
import { works as holdsWorks, chain } from "./holds-data.ts";
import { gate } from "./marks-data.ts";
import { weigher } from "./observes-data.ts";
import { sourceOrderDefinition, lateDefinition } from "./source-order-data.ts";
import { PIN_BOUNDS, receiverPinData } from "./receiver-pins-data.ts";
import { boundRecordData } from "./bound-records-data.ts";
import { childDefinitionsData } from "./child-definitions-data.ts";
import { genesisBodyData } from "./genesis-bodies-data.ts";
import { peerPinData } from "./peer-pin-data.ts";
import { platformRequestData, futurePlatformRequestData, settlingPlatformMarksData } from "./platform-requests-data.ts";
import { stagingData } from "./staging-data.ts";
import { standingData } from "../fixtures-standing.ts";
import { deviceCommandFixture, devicePackageFixture } from "../fixtures-device-command.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const simple = (name: string, file: string, data: unknown, platform = false): DefinitionCorpusRow => ({
  name: `derive/${name}`, origins: [`packages/derive/test/${file}#${name}`], declaration: () => structuredClone(data),
  bounds: PROPOSED_BOUNDS, ...(platform ? { profiles: PROFILES, options: { platform: true } } : {}),
});
export const deriveFixtureDefinitions: readonly DefinitionCorpusRow[] = [
  simple("board", "fixtures-f.ts", board), simple("works", "fixtures-f.ts", works),
  simple("holdsWorks", "fixtures-holds.ts", holdsWorks, true), simple("chain", "fixtures-holds.ts", chain, true),
  simple("gate", "fixtures-marks.ts", gate, true), simple("weigher", "fixtures-observes.ts", weigher, true),
  simple("sourceOrderDefinition", "fixtures-source-order.ts", sourceOrderDefinition),
  simple("deviceCommandFixture", "fixtures-device-command.ts", deviceCommandFixture),
  simple("devicePackageFixture", "fixtures-device-command.ts", devicePackageFixture),
  { name: "derive/receiver-pin", origins: ["packages/derive/test/fixtures-receiver-pins.ts#receiverPinData"], declaration: receiverPinData, bounds: PIN_BOUNDS },
  { name: "derive/staging", origins: ["packages/derive/test/fixtures-hold.ts#staging"], declaration: stagingData, bounds: PROPOSED_BOUNDS },
  { name: "derive/standing", origins: ["packages/derive/test/fixtures-standing.ts#standingData"], declaration: () => standingData(), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  ...[false, true].map(branch => ({ name: `derive/late(${branch})`, origins: [`packages/derive/test/fixtures-late.ts#lateDefinition(${branch})`], declaration: () => lateDefinition(branch), bounds: PROPOSED_BOUNDS })),
  ...[false, true].flatMap(firstKey => [false, true].map(whole => ({ name: `derive/boundRecord(${firstKey},${whole})`,
    origins: [`packages/derive/test/fixtures-bound-records.ts#boundRecordDefinition(${firstKey},${whole})`],
    declaration: () => boundRecordData(firstKey, whole), bounds: PIN_BOUNDS, options: { platform: true } }))),
  ...[false, true].flatMap(whole => (["root", "branch", "leaf", "extra"] as const).map(part => ({ name: `derive/childDefinitions(${whole}).${part}`,
    origins: [`packages/derive/test/fixtures-child-definitions.ts#childDefinitions(${whole}).${part}`],
    declaration: () => childDefinitionsData(whole)[part], bounds: PROPOSED_BOUNDS }))),
  ...[false, true].map(whole => ({ name: `derive/genesisBody(${whole},notes)`, origins: [`packages/derive/test/fixtures-genesis-bodies.ts#genesisBodyDefinition(${whole})`],
    declaration: () => genesisBodyData(whole), bounds: PROPOSED_BOUNDS })),
  { name: "scope/genesisBody(true,child-root)", origins: ["packages/scope/test/capacity-child-definitions.test.ts#genesisBodyDefinition(true,children.root)"],
    declaration: () => genesisBodyData(true, childDefinitionsData().root), bounds: PROPOSED_BOUNDS },
  ...(["sender", "alternate", "receiver"] as const).map(part => ({ name: `derive/peerPin.${part}`,
    origins: [`packages/derive/test/fixtures-peer-pin.ts#peerPinDefinitions().${part}`], declaration: () => peerPinData()[part], bounds: PROPOSED_BOUNDS })),
  ...([[true, false], [true, true], [false, false]] as const).map(([whole, withKind]) => ({ name: `derive/platformRequests(${whole},${withKind})`,
    origins: [`packages/derive/test/fixtures-platform-requests.ts#platformRequests(${whole},${withKind})`],
    declaration: () => platformRequestData(whole, withKind), bounds: PROPOSED_BOUNDS, options: { platform: true } })),
  ...[false, true].map(withKind => ({ name: `derive/futurePlatformRequests(${withKind})`, origins: [`packages/derive/test/fixtures-platform-requests.ts#futurePlatformRequests(${withKind})`],
    declaration: () => futurePlatformRequestData(withKind), bounds: PROPOSED_BOUNDS, options: { platform: true } })),
  ...[false, true].map(marker => ({ name: `derive/settlingPlatformMarks(${marker})`, origins: [`packages/derive/test/fixtures-platform-requests.ts#settlingPlatformMarks(${marker})`],
    declaration: () => settlingPlatformMarksData(marker), bounds: PROPOSED_BOUNDS, options: { platform: true } })),
];
