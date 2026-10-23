import { sourceOrderDefinition, lateDefinition } from "./source-order-data.ts";
import { peerPinData } from "./peer-pin-data.ts";
import { officeDataFor } from "../../../platform/test/definition-corpus-data.ts";
import { VERSIONS } from "../../../platform/src/native-catalog.ts";
import { outcomeValueDomains } from "../../src/outcomes.ts";
import { childDefinitionsData } from "./child-definitions-data.ts";
import { genesisBodyData } from "./genesis-bodies-data.ts";
import { platformRequestData, futurePlatformRequestData, settlingPlatformMarksData } from "./platform-requests-data.ts";
import { devicePackageFixture as deviceCommandFixture } from "../fixtures-device-command.ts";
import { scopeHeldOperationsChange } from "../../../scope/test/definition-corpus-data.ts";
import { oldMembershipStandingData } from "../../../scope/test/definition-corpus-data.ts";
import { DOMAINS } from "@generalbusiness/dap-contract";
import { weigher, EXTENTS } from "./observes-data.ts";
import { steppedObservationChange, observationDomainChange, membershipObservationChange } from "../../../scope/test/definition-corpus-data.ts";
import { gate } from "./marks-data.ts";
import { indexedIntegerChange, gateValueFieldChange, gateValueOutcomeChange } from "../../../scope/test/definition-corpus-data.ts";
import { recoveredAliasData } from "../../../scope/test/definition-corpus-data.ts";
import { PROFILES } from "../../src/validate/index.ts";
import { standingData } from "../fixtures-standing.ts";
import { indexedStandingData } from "../../../scope/test/definition-corpus-data.ts";
/** Scope raw fixture declarations. This shard never opens a Durable Object. */
import { PROPOSED_BOUNDS, type DeclaredDefinition, type Digest } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/artroom-bytes";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";
import { scopeData, scopeLaneData, scopeArchiveData, scopeFactoryData, scopeScaleData, scopeInventoryData, scopeReceiverData,
  scopeStagedChange, archiveActFieldsChange, archiveMembershipProofChange, archiveInventoryParentChange, archiveInventoryAlwaysChange,
  archiveLeafData, archiveWrongProducerChange, archiveTextChange,
  capacityLaneChange, capacityRequestChange, capacityHoldReaderChange, capacityTokenOwnerChange, capacityRecoveredTextChange,
  composeWholeTicketChange, composeWholeDeskChange, creationStagedRenewChange, creationNoAttentionChange, creationProofChange, creationStagedReportChange,
  floorKeptChange, floorMonotonicChange, floorReceiverChange, floorSenderChange, floorPendingChange, observabilityCountChange,
  operationStagedChange, replayRecordedChange, scopeTextChange, scopeWholeTextChange, scopeLinkedTextChange, scopeTextBody, scopeTextBase,
  turnWholeChange, turnAbandonChange, turnTargetChange, turnRequestsChange,
  countingContainerData, countingPublicationData, scopePublisher, publisherContainerData, ownedScopeDefinition, lineageDeviceRoot, lineageBudgetDefinitions, configureFactTimeDefinition } from "../../../scope/test/definition-corpus-data.ts";

import { ticket, desk, notes as deriveNotes } from "./fixture-data.ts";

import { countingCommitments } from "../../../../apps/counter/commitments.ts";
import { declaredChangeAttack } from "../../../scope/test/support/declared-change-attack.ts";

const row = (name: string, origins: readonly string[], declaration: () => unknown,
  profiles?: DefinitionCorpusRow["profiles"]): DefinitionCorpusRow => ({ name, origins, declaration, bounds: PROPOSED_BOUNDS,
    ...(profiles === undefined ? {} : { profiles }) });
const native = (name: string, origins: readonly string[], declaration: () => DeclaredDefinition): DefinitionCorpusRow[] => [
  row(`${name} fixture validation`, origins, declaration), row(`${name} native validation`, origins, declaration, RULE_PROFILES),
];
const inventoryParents = ["scouted-child", "planned-declaration-child", "missing-scout-child", "late-child"] as const;
/** Same actual graph constructor arguments as archive-inventory's boundary
 * tests, but each edge is named from raw bytes rather than a valid() result. */
function graphDefinitions(lengths: readonly number[]) {
  return lengths.flatMap((length, group) => {
    const nodes: { position: number; data: DeclaredDefinition }[] = [];
    let next: Digest | undefined;
    for (let position = length - 1; position >= 0; position--) {
      const data = archiveLeafData(`graph-${group}-${position}`, next);
      nodes.unshift({ position, data }); next = definitionDigest(data);
    }
    return nodes.map(node => ({ group, ...node }));
  });
}
const textNotes = () => scopeData(scopeTextBase, scopeTextChange(scopeTextBody));
const turnWhole = () => scopeData(scopeLaneData(), turnWholeChange());
const wholeTicket = () => scopeData(ticket, composeWholeTicketChange());
const asking = { create: { kind: "lane", definition: "self", fields: { title: { const: "another" }, opener: { signer: true } } } };
export const scopeFixtureDefinitions: readonly DefinitionCorpusRow[] = [
  ...native("Scope/shared lane", ["packages/scope/test/support.ts#definition"], scopeLaneData),
  ...native("Scope/archive", ["packages/scope/test/support/archive.ts#archiveDefinition"], scopeArchiveData),
  ...native("Scope/archive factory", ["packages/scope/test/support/archive-native-authority.ts#archiveFactoryDefinition"], scopeFactoryData),
  ...native("Scope/archive scale factory", ["packages/scope/test/support/archive-native-authority.ts#archiveScaleFactoryDefinition"], scopeScaleData),
  ...native("Scope/staged", ["packages/scope/test/hosted.ts#staged"], () => scopeData(scopeLaneData(), scopeStagedChange())),
  ...([false, true] as const).flatMap(detached => native(`Scope/act fields detached ${detached}`,
    [`packages/scope/test/archive-act-fields.test.ts#detached=${detached}`], () => scopeData(scopeLaneData(), archiveActFieldsChange(detached)))),
  ...native("Scope/archive foreign receiver", ["packages/scope/test/archive-foreign.test.ts#receiver"], scopeReceiverData),
  ...native("Scope/archive native Membership proof", ["packages/scope/test/archive-foreign.test.ts#accepting"],
    () => scopeData(scopeReceiverData(), archiveMembershipProofChange())),
  ...native("Scope/archive inventory base", ["packages/scope/test/archive-inventory.test.ts#base"], scopeInventoryData),
  ...inventoryParents.flatMap(name => [
    row(`Scope/inventory leaf ${name}`, [`packages/scope/test/archive-inventory.test.ts#leaf(${name})`], () => archiveLeafData(name)),
    ...native(`Scope/inventory parent ${name}`, [`packages/scope/test/archive-inventory.test.ts#parent of ${name}`],
      () => scopeData(scopeInventoryData(), archiveInventoryParentChange({ digest: definitionDigest(archiveLeafData(name)) }))),
  ]),
  row("Scope/inventory covered root", ["packages/scope/test/archive-inventory.test.ts#good"], () => archiveLeafData("covered-root")),
  row("Scope/inventory uncovered root", ["packages/scope/test/archive-inventory.test.ts#uncovered"], () => archiveLeafData("uncovered-final-root")),
  ...native("Scope/inventory rule root", ["packages/scope/test/archive-inventory.test.ts#root always"], () => scopeData(scopeInventoryData(), archiveInventoryAlwaysChange())),
  ...([ [17, 17, 17, 12], [17, 17, 17, 13], [18] ] as const).flatMap(lengths => graphDefinitions(lengths).map(({ group, position, data }) =>
    row(`Scope/inventory graph ${lengths.join("+")}/${group}/${position}`,
      [`packages/scope/test/archive-inventory.test.ts#graph([${lengths.join(",")}])/group=${group}/position=${position}`], () => structuredClone(data)))),
  ...native("Scope/wrong foreign producer", ["packages/scope/test/archive-source-pins.test.ts#wrongDeclaration"], () => scopeData(scopeLaneData(), archiveWrongProducerChange())),
  ...native("Scope/archive detached text", ["packages/scope/test/archive-text.test.ts#definition"], () => scopeData(scopeArchiveData(), archiveTextChange())),
  ...([
    ["capacity closed lane", "capacity-admission.test.ts#wholeLane", capacityLaneChange],
    ["capacity request lane", "capacity-admission.test.ts#under", capacityRequestChange],
    ["capacity hold reader", "capacity-owner.test.ts#hold reader", capacityHoldReaderChange],
    ["capacity token owner", "capacity-owner.test.ts#read token", capacityTokenOwnerChange],
    ["creation staged renewal", "creation.test.ts#under", creationStagedRenewChange],
    ["creation no attention", "creation.test.ts#other", creationNoAttentionChange],
    ["creation naming proof", "creation.test.ts#naming", creationProofChange],
    ["creation staged report", "creation.test.ts#staged", creationStagedReportChange],
    ["operations staged", "operations.test.ts#staged", operationStagedChange],
    ["replay explicit recorded level", "replay.test.ts#explicit", replayRecordedChange],
  ] as const).flatMap(([name, origin, change]) => native(`Scope/${name}`, [`packages/scope/test/${origin}`], () => scopeData(scopeLaneData(), change()))),
  ...native("Scope/capacity recovered text", ["packages/scope/test/capacity-recovered.test.ts#under"], () => scopeData(deriveNotes, capacityRecoveredTextChange())),
  ...native("Scope/compose whole ticket", ["packages/scope/test/compose.test.ts#under whole-scope"], wholeTicket),
  ...native("Scope/compose whole desk", ["packages/scope/test/compose.test.ts#directory whole-scope"],
    () => scopeData(desk, composeWholeDeskChange({ digest: definitionDigest(ticket) }, { digest: definitionDigest(wholeTicket()) }))),
  ...([
    ["kept commitment5000", "floor-kept.test.ts#definition", floorKeptChange],
    ["monotonic references", "floor-monotonic.test.ts#definition", floorMonotonicChange],
    ["request receiver", "floor-requests.test.ts#receiverDefinition at both request witnesses", floorReceiverChange],
    ["request sender", "floor-requests.test.ts#senderDefinition at both request witnesses", floorSenderChange],
    ["pending self-child", "floor.test.ts#definition", floorPendingChange],
  ] as const).flatMap(([name, origin, change]) => native(`Scope/floor ${name}`, [`packages/scope/test/${origin}`], () => scopeData(scopeArchiveData(), change()))),
  ...native("Scope/observability requests251", ["packages/scope/test/observability-native.test.ts#count=251"], () => scopeData(ticket, observabilityCountChange(251))),
  ...native("Scope/text notes", ["packages/scope/test/texts.test.ts#notes"], textNotes),
  ...native("Scope/text whole notes", ["packages/scope/test/texts.test.ts#whole-scope"], () => scopeData(textNotes(), scopeWholeTextChange())),
  ...native("Scope/text linked notes", ["packages/scope/test/texts.test.ts#linked"], () => scopeData(textNotes(), scopeLinkedTextChange(scopeTextBody))),
  ...native("Scope/turn whole", ["packages/scope/test/turn.test.ts#wholeDefinition"], turnWhole),
  ...native("Scope/turn abandon", ["packages/scope/test/turn.test.ts#abandon"], () => scopeData(turnWhole(), turnAbandonChange())),
  ...native("Scope/turn other target", ["packages/scope/test/turn.test.ts#target"], () => scopeData(turnWhole(), turnTargetChange())),
  ...(["legacy", "whole-scope"] as const).flatMap(cohort => native(`Scope/turn requests ${cohort}`, [`packages/scope/test/turn.test.ts#asking ${cohort}`],
    () => scopeData(cohort === "legacy" ? scopeLaneData() : turnWhole(), turnRequestsChange(asking)))),

  ...native("Scope/counting container", ["packages/scope/test/application-establish.test.ts#container"], countingContainerData),
  ...native("Scope/counting publication", ["packages/scope/test/application-establish.test.ts#published"], countingPublicationData),
  ...native("Scope/declared publisher change", ["packages/scope/test/application-publication.test.ts#publisher"], () => structuredClone(scopePublisher)),
  ...native("Scope/publisher container", ["packages/scope/test/application-publication.test.ts#container"], () => publisherContainerData(definitionDigest(scopePublisher))),
  ...native("Scope/owned child", ["packages/scope/test/support/application-owned-scopes-fixture.ts#child", "packages/scope/test/creation-lineage.test.ts#ordinary child"], () => ownedScopeDefinition("test-owned-child")),
  ...native("Scope/owned root", ["packages/scope/test/support/application-owned-scopes-fixture.ts#root label=test-owned-root version1 and version2", "packages/scope/test/application-owned-scopes.test.ts", "packages/scope/test/archive-installed.test.ts", "packages/scope/test/archive-mcp.test.ts", "packages/scope/test/creation-lineage.test.ts#ordinary root"],
    () => ownedScopeDefinition("test-owned-root", definitionDigest(ownedScopeDefinition("test-owned-child")))),
  ...native("Scope/lineage device root", ["packages/scope/test/creation-lineage.test.ts#17-cohort root"], () => lineageDeviceRoot({ childId: definitionDigest(ownedScopeDefinition("test-owned-child")) })),
  ...lineageBudgetDefinitions(ownedScopeDefinition("test-owned-child")).flatMap((definition, index) => native(`Scope/lineage budget body ${index}`,
    [`packages/scope/test/creation-lineage.test.ts#lineage-budget-${index}`], () => structuredClone(definition))),
  ...native("Scope/Counter fact-time", ["packages/scope/test/support/application-fact-time-fixture.ts#definition"], () => scopeData(countingCommitments, configureFactTimeDefinition)),
  ...native("Scope/declared change attack", ["packages/scope/test/support/declared-change-attack.ts#declaredChangeAttack", "packages/scope/test/application-install-custody.test.ts"], () => structuredClone(declaredChangeAttack)),

  { name: "Scope/standing indexed", origins: ["packages/scope/test/standing.test.ts#C1 native admission"], declaration: indexedStandingData, bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  { name: "Scope/standing genesis limit", origins: ["packages/scope/test/standing.test.ts#C1 genesis at B minus one"], declaration: standingData, bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  { name: "Scope/recovered value alias", origins: ["packages/scope/test/capacity-recovered.test.ts#data"], declaration: recoveredAliasData, bounds: PROPOSED_BOUNDS, options: { platform: true } },
  { name: "Scope/gate indexed integer", origins: ["packages/scope/test/indexed-integers.test.ts"], declaration: () => scopeData(gate, indexedIntegerChange({ type: "int", min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER })), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  { name: "Scope/gate value field", origins: ["packages/scope/test/values.test.ts#intent"], declaration: () => scopeData(gate, gateValueFieldChange("gate-proof-1", 64)), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  { name: "Scope/gate value outcome", origins: ["packages/scope/test/values.test.ts#outcome domains gate-proof-1 and definition"], declaration: () => scopeData(gate, gateValueOutcomeChange()), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  { name: "Scope/stepped observations", origins: ["packages/scope/test/observes.test.ts#18.52 case 5"], declaration: () => scopeData(weigher, steppedObservationChange()), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  ...([EXTENTS, DOMAINS.definition] as const).map(domain => ({ name: `Scope/observation retained domain ${domain}`, origins: ["packages/scope/test/observes.test.ts#18.48 cases 6 to 8 native and replay"], declaration: () => scopeData(weigher, observationDomainChange(domain)), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } })),
  { name: "Scope/native membership observation action", origins: ["packages/scope/test/observes.test.ts#native membership and replay"], declaration: () => scopeData(weigher, membershipObservationChange()), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  { name: "Scope/archive old Membership standing substitute", origins: ["packages/scope/test/archive-inventory.test.ts#old-pin refusal"], declaration: oldMembershipStandingData, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  { name: "Scope/gate held operations", origins: ["packages/scope/test/holds.test.ts#definition"], declaration: () => scopeData(gate, scopeHeldOperationsChange()), bounds: PROPOSED_BOUNDS, profiles: PROFILES, options: { platform: true } },
  ...([7, 8] as const).map(scopeEntries => ({ name: `Scope/standing native entry ceiling ${scopeEntries}`, origins: ["packages/scope/test/standing.test.ts#controls.bounds", "packages/scope/test/archive-pin.test.ts#fixture(entries)"], declaration: standingData, bounds: { ...PROPOSED_BOUNDS, scopeEntries }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } })),
  { name: "Scope/indexed standing native entry ceiling 8", origins: ["packages/scope/test/standing.test.ts#C1 native admission"], declaration: indexedStandingData, bounds: { ...PROPOSED_BOUNDS, scopeEntries: 8 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  { name: "Scope/gate integer native", origins: ["packages/scope/test/indexed-integers.test.ts#native create"], declaration: () => scopeData(gate, indexedIntegerChange({ type: "int", min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER })), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  { name: "Scope/gate value field native", origins: ["packages/scope/test/values.test.ts#intent native create"], declaration: () => scopeData(gate, gateValueFieldChange("gate-proof-1", 64)), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  ...(["gate-proof-1", DOMAINS.definition] as const).map(domain => ({ name: `Scope/gate outcome native domain ${domain}`, origins: ["packages/scope/test/values.test.ts#probe.valueDomains and native create"], declaration: () => scopeData(gate, gateValueOutcomeChange()), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: { probe: [{ domain, max: domain === DOMAINS.definition ? PROPOSED_BOUNDS.definitionBytes : 64 }] } } })),
  { name: "Scope/gate held operations native", origins: ["packages/scope/test/holds.test.ts#native create"], declaration: () => scopeData(gate, scopeHeldOperationsChange()), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },

  ...([7, 20] as const).map(scopeEntries => ({ name: `Scope/shared lane native entry ceiling ${scopeEntries}`, origins: ["packages/scope/test/operations.test.ts#entry ceilings"], declaration: scopeLaneData, bounds: { ...PROPOSED_BOUNDS, scopeEntries }, profiles: RULE_PROFILES })),
  ...([0, 1] as const).map(scopeRecords => ({ name: `Scope/token owner record ceiling ${scopeRecords}`, origins: ["packages/scope/test/capacity-owner.test.ts#native 1 and replay 0"], declaration: () => scopeData(scopeLaneData(), capacityTokenOwnerChange()), bounds: { ...PROPOSED_BOUNDS, scopeRecords }, profiles: RULE_PROFILES })),
  { name: "Scope/device command native entry ceiling 16", origins: ["packages/scope/test/device-command-install.test.ts#bounds"], declaration: () => structuredClone(deviceCommandFixture), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 16 }, profiles: RULE_PROFILES },
  { name: "Scope/device command explicit fixture entry ceiling 16", origins: ["packages/scope/test/device-command-install.test.ts#validateDefinition"], declaration: () => structuredClone(deviceCommandFixture), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 16 } },
  ...([6, 7, 8] as const).map(scopeEntries => ({ name: `Scope/held operation entry ceiling ${scopeEntries}`, origins: ["packages/scope/test/holds.test.ts#budget"], declaration: () => scopeData(gate, scopeHeldOperationsChange()), bounds: { ...PROPOSED_BOUNDS, scopeEntries }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } })),
  ...([false, true] as const).flatMap(whole => (whole ? ["root", "branch", "leaf"] as const : ["root", "branch"] as const).map(part => ({
    name: `Scope/child ${part} whole ${whole} native named ceiling 2`,
    origins: [whole ? "packages/scope/test/capacity-child-definitions.test.ts#first.setup(root)/namedBy" : "packages/scope/test/capacity-child-definitions.test.ts#legacy.setup(root)/supplied branch and child delivery"],
    declaration: () => childDefinitionsData(whole)[part], bounds: { ...PROPOSED_BOUNDS, namedDefinitions: 2 }, profiles: RULE_PROFILES,
  }))),
  ...([false, true] as const).map(whole => ({ name: `Scope/genesis bodies whole ${whole} native named ceiling 2`, origins: ["packages/scope/test/capacity-genesis-bodies.test.ts#setup"], declaration: () => genesisBodyData(whole), bounds: { ...PROPOSED_BOUNDS, namedDefinitions: 2 }, profiles: RULE_PROFILES })),
  { name: "Scope/genesis child root native named ceiling 2", origins: ["packages/scope/test/capacity-genesis-bodies.test.ts#closed and asked"], declaration: () => genesisBodyData(true, childDefinitionsData().root), bounds: { ...PROPOSED_BOUNDS, namedDefinitions: 2 }, profiles: RULE_PROFILES },
  ...([{ entries: 5, items: 1 }, { entries: 6, items: 2 }] as const).map(({ entries, items }) => ({ name: `Scope/platform requests native ${entries} entries ${items} items`, origins: ["packages/scope/test/capacity-platform-requests.test.ts#quiet sender and child"], declaration: () => platformRequestData(true, true), bounds: { ...PROPOSED_BOUNDS, scopeEntries: entries, scopeItems: items }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } })),
  { name: "Scope/future platform requests native 10 entries 3 items", origins: ["packages/scope/test/capacity-platform-requests.test.ts#sender and child"], declaration: () => futurePlatformRequestData(true), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 10, scopeItems: 3 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  ...([false, true] as const).map(marker => ({ name: `Scope/settling platform marks marker ${marker} native 8 entries 3 items`, origins: ["packages/scope/test/capacity-platform-requests.test.ts#sender and child"], declaration: () => settlingPlatformMarksData(marker), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 8, scopeItems: 3 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } })),
  { name: "Scope/stepped observation native", origins: ["packages/scope/test/observes.test.ts#two-step native"], declaration: () => scopeData(weigher, steppedObservationChange()), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  ...([EXTENTS, DOMAINS.definition] as const).map(domain => ({ name: `Scope/observation domain ${domain} native`, origins: ["packages/scope/test/observes.test.ts#native and replay same weigherRules"], declaration: () => scopeData(weigher, observationDomainChange(domain)), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } })),
  { name: "Scope/membership observation native", origins: ["packages/scope/test/observes.test.ts#native and replay action"], declaration: () => scopeData(weigher, membershipObservationChange()), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },

  { name: "Scope/shared lane native entry bytes 4096", origins: ["packages/scope/test/answers.test.ts#entry size"], declaration: scopeLaneData, bounds: { ...PROPOSED_BOUNDS, entryBytes: 4096 }, profiles: RULE_PROFILES },
  ...([3, 6, 7, 12] as const).map(scopeEntries => ({ name: `Scope/turn legacy native entry ceiling ${scopeEntries}`, origins: ["packages/scope/test/turn.test.ts#original finite entry ceilings"], declaration: scopeLaneData, bounds: { ...PROPOSED_BOUNDS, scopeEntries }, profiles: RULE_PROFILES })),
  ...([6, 12] as const).map(scopeEntries => ({ name: `Scope/turn whole native entry ceiling ${scopeEntries}`, origins: ["packages/scope/test/turn.test.ts#whole finite entry ceilings"], declaration: turnWhole, bounds: { ...PROPOSED_BOUNDS, scopeEntries }, profiles: RULE_PROFILES })),
  ...([6, 8] as const).map(scopeEntries => ({ name: `Scope/turn abandon native entry ceiling ${scopeEntries}`, origins: ["packages/scope/test/turn.test.ts#openReport"], declaration: () => scopeData(turnWhole(), turnAbandonChange()), bounds: { ...PROPOSED_BOUNDS, scopeEntries }, profiles: RULE_PROFILES })),
  { name: "Scope/turn target native entry ceiling 8", origins: ["packages/scope/test/turn.test.ts#target"], declaration: () => scopeData(turnWhole(), turnTargetChange()), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 8 }, profiles: RULE_PROFILES },
  ...([false, true] as const).map(whole => ({ name: `Scope/turn requests whole ${whole} native entry ceiling 8`, origins: ["packages/scope/test/turn.test.ts#asking"], declaration: () => scopeData(whole ? turnWhole() : scopeLaneData(), turnRequestsChange(asking)), bounds: { ...PROPOSED_BOUNDS, scopeEntries: 8 }, profiles: RULE_PROFILES })),
  { name: "Scope/capacity admission native item ceiling 2", origins: ["packages/scope/test/capacity-admission.test.ts#wholeLane"], declaration: () => scopeData(scopeLaneData(), capacityLaneChange()), bounds: { ...PROPOSED_BOUNDS, scopeItems: 2 }, profiles: RULE_PROFILES },
  { name: "Scope/capacity request native ceiling 1", origins: ["packages/scope/test/capacity-admission.test.ts#request variant"], declaration: () => scopeData(scopeLaneData(), capacityRequestChange()), bounds: { ...PROPOSED_BOUNDS, scopeRequests: 1 }, profiles: RULE_PROFILES },
  { name: "Scope/archive native entry ceiling 2000", origins: ["packages/scope/test/floor-archive.test.ts#fixed and driver"], declaration: scopeArchiveData, bounds: { ...PROPOSED_BOUNDS, scopeEntries: 2000 }, profiles: RULE_PROFILES },
  { name: "Scope/recovered alias native", origins: ["packages/scope/test/capacity-recovered.test.ts#alias birth"], declaration: recoveredAliasData, bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  { name: "Scope/unchanged weigher native", origins: ["packages/scope/test/observes.test.ts#weighing default"], declaration: () => structuredClone(weigher), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: {} } },
  { name: "Scope/Rules2 owning definition-byte ceiling", origins: ["packages/scope/test/archive-act-fields.test.ts#checked"], declaration: () => structuredClone(VERSIONS["platform:rules@2"]!.data), bounds: { ...PROPOSED_BOUNDS, definitionBytes: PROPOSED_BOUNDS.definitionBytes - 1 }, profiles: RULE_PROFILES, options: { platform: true, outcomeValues: outcomeValueDomains(VERSIONS["platform:rules@2"]!.data, VERSIONS["platform:rules@2"]!.rules) } },

  { name: "Scope/source order Native and replay", origins: ["packages/scope/test/source-order.test.ts#found and replay"], declaration: () => structuredClone(sourceOrderDefinition), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES },
  ...([false, true] as const).map(branch => ({ name: `Scope/late branch ${branch} Native and replay`, origins: ["packages/scope/test/late.test.ts#found and replay"], declaration: () => lateDefinition(branch), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES })),
  ...Object.entries(peerPinData()).map(([part, declaration]) => ({ name: `Scope/peer pin ${part} Native and replay`, origins: ["packages/scope/test/peer-pin.test.ts#found and replay"], declaration: () => structuredClone(declaration), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES })),
  ...(["platform:membership@2", "platform:membership@6", "platform:membership@7"] as const).map(named => ({ name: `Scope/office creates ${named} Native`, origins: ["packages/scope/test/repository.ts#office", "packages/cli/test/join.scope.test.ts#definition matrix"], declaration: () => officeDataFor(named), bounds: PROPOSED_BOUNDS, profiles: RULE_PROFILES })),

];
