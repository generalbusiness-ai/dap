/** Positive declarations used by the recorded/replay fixtures. This module
 * constructs raw data only: no Ledger, judge, validator or Vitest import. */
import { PROPOSED_BOUNDS, type Bounds } from "@generalbusiness/dap-contract";
import { definitionDigest } from "@generalbusiness/dap-bytes";
import { RULES_EXTENTS_VALUE } from "../../../platform/src/rules-scope.ts";
import { notes, ticket, desk } from "./fixture-data.ts";
import { gate } from "./marks-data.ts";
import { weigher } from "./observes-data.ts";
import { stagingData } from "./staging-data.ts";
import { childDefinitionsData } from "./child-definitions-data.ts";
import { genesisBodyData } from "./genesis-bodies-data.ts";
import { sourceOrderDefinition, lateDefinition } from "./source-order-data.ts";
import { capacityLargeText, capacityLargeTextAgain, capacityWhole, capacityTwoSpans, floorProofActs, floorPricedKeys,
  recoveredText, recoveredChild, recoveredTransitiveTarget, recoveredSmallChild, recoveredSender, recoveredRefusalTarget,
  genesisQuietActs, earlierFieldProof, replayArchiveEvidenceValue, archiveStagingFactory, archiveObservationPeer, archiveOutcomeValue, archiveObservation,
  weighingDeclaration, stagingGateDeclaration, replayHolding, replayChained, type ReplayDeclarationChange } from "./replay-mutations-data.ts";
import { replayViewBase, replayViewDuty, replayViewHeld, replayDecisionBase, replayDecisionFields, replayDecisionText, replayDecisionFloor,
  replayChildAlias, replayRecoveredAlias, replayGenesisAlias, replayAnchorRemarks, replayReservedSource, replayReservedReceiver, replayQualifiedReceiver } from "./replay-literals-data.ts";
import { register, registerRules } from "../../../platform/src/register.ts";
import { outcomeValueDomains } from "../../src/outcomes.ts";
import { RULE_PROFILES } from "../../src/rule/index.ts";
import type { DefinitionCorpusRow } from "./row.ts";

const changed = <T>(base: T, change: ReplayDeclarationChange): T => {
  const data = structuredClone(base); change(data); return data;
};
const row = (name: string, origins: readonly string[], declaration: () => unknown, platform = false): DefinitionCorpusRow => ({
  name: `replay/${name}`, origins: origins.map(origin => `packages/replay/test/${origin}`), declaration, bounds: PROPOSED_BOUNDS,
  ...(platform ? { options: { platform: true } } : {}),
});

const fixtureDefinitions: readonly DefinitionCorpusRow[] = [
  row("world.D", ["world.ts#histories().D", "floor.test.ts#histories"], () => structuredClone(desk)),
  row("world.P", ["world.ts#histories().P"], () => structuredClone(ticket)),
  row("world.I", ["world.ts#histories().I"], () => structuredClone(ticket)),
  row("staging.Lane", ["staging.ts#Lane", "archive-fixtures.ts#outcomeSnapshotFixture.ledger"], stagingData),
  ...([
    ["base", false, undefined, ["verify.test.ts#new Gate(opens)", "definition-format.test.ts#supported-platform-baseline", "verify.test.ts#new Gate(opens,true)", "verify.test.ts#new Gate(reads,true)", "verify.test.ts#new Gate(reads,true,false,undefined,answered)"]],
    ["placed", true, undefined, ["verify.test.ts#new Gate(opens,false,true)"]],
    ["holding(1)", false, replayHolding(1), ["verify.test.ts#new Gate(again,false,false,holding(1))"]],
    ["holding(2)", false, replayHolding(2), ["verify.test.ts#new Gate(again,false,false,holding(2))"]],
    ["chained", false, replayChained, ["verify.test.ts#new Gate(...,false,false,chained)"]],
  ] as const).map(([name, placed, held, origins]) => row(`staging.Gate/${name}`, origins, () => changed(gate, stagingGateDeclaration(placed, held)), true)),
  ...(["weigh", "steps", "absent", "asked"] as const).map(which => row(`weighing/${which}`,
    [`weighing.ts#Weighing(${JSON.stringify(which)})`, `verify.test.ts#new Weighing(${JSON.stringify(which)})`], () => changed(weigher, weighingDeclaration(which)), true)),
  row("archive/declared-genesis", ["archive-fixtures.ts#declaredGenesisFixture"], () => structuredClone(notes)),
  row("archive/outcome-value", ["archive-fixtures.ts#outcomeValueFixture"], () => changed(gate, archiveOutcomeValue), true),
  row("archive/outcome-snapshot-factory", ["archive-fixtures.ts#outcomeSnapshotFixture.factory"], () => changed(desk, archiveStagingFactory(definitionDigest(stagingData())))),
  row("archive/observing-peer", ["archive-fixtures.ts#observingDeliveryFixture.peer"], () => changed(notes, archiveObservationPeer)),
  row("archive/observing-directory", ["archive-fixtures.ts#observingDeliveryFixture.ledger"], () => changed(weigher, archiveObservation(RULES_EXTENTS_VALUE)), true),
  row("archive/anchor-remarks", ["archive-anchor-ranges.test.ts#remarks"], replayAnchorRemarks, true),
  ...([
    ["capacity/large-text", "capacity.test.ts#capacity-redaction", capacityLargeText],
    ["capacity/unknown-items", "capacity.test.ts#capacity-unknown-items", capacityLargeTextAgain],
    ["capacity/anchored", "capacity.test.ts#small-receiver", capacityWhole],
    ["capacity/two-spans", "capacity.test.ts#two-byte-spans", capacityTwoSpans],
    ["floor/proof-acts", "floor.test.ts#fixture", floorProofActs],
    ["floor/priced-keys", "floor.test.ts#floor-priced-accepted-keys", floorPricedKeys],
    ["recovered/child", "recovered-bytes.test.ts#cached-consumer", recoveredChild],
    ["recovered/transitive-target", "recovered-bytes.test.ts#transitive-target", recoveredTransitiveTarget],
    ["recovered/small-child", "recovered-bytes.test.ts#smallnotes", recoveredSmallChild],
    ["recovered/refusal-target", "recovered-bytes.test.ts#refusal-target", recoveredRefusalTarget],
    ["text-refusals/earlier-field", "text-refusals.test.ts#earlier-field-proof", earlierFieldProof],
  ] as const).map(([name, origin, change]) => row(name, [origin], () => changed(notes, change))),
  ...[40, 32768].map(max => row(`recovered/original(max=${max})`, [`recovered-bytes.test.ts#aliasWorld(body,${max})`], () => changed(notes, recoveredText(max)))),
  row("recovered/alias", ["recovered-bytes.test.ts#aliasWorld.alias"], replayRecoveredAlias, true),
  row("recovered/refusal-sender", ["recovered-bytes.test.ts#refusal-sender"], () => changed(notes, recoveredSender(definitionDigest(changed(notes, recoveredSmallChild))))),
  ...[false, true].flatMap(whole => (["root", "branch", "leaf", "extra"] as const).map(part => row(`children(${whole}).${part}`,
    [`child-definitions.test.ts#childDefinitions(${whole}).${part}`], () => childDefinitionsData(whole)[part]))),
  row("children/alias", ["child-definitions.test.ts#platform-alias"], () => replayChildAlias(childDefinitionsData().root), true),
  row("genesis/quiet-base", ["genesis-bodies.test.ts#histories.base"], () => changed(notes, genesisQuietActs)),
  ...[false, true].map(whole => row(`genesis/body(${whole})`, [`genesis-bodies.test.ts#histories(${whole}).original`], () => genesisBodyData(whole, changed(notes, genesisQuietActs)))),
  row("genesis/alias", ["genesis-bodies.test.ts#histories.alias"], replayGenesisAlias, true),
  row("view/base", ["view.test.ts#data"], () => structuredClone(replayViewBase), true),
  row("view/duties", ["view.test.ts#duty-replay-fixture"], replayViewDuty),
  row("view/held", ["view.test.ts#historical-item-duties"], replayViewHeld, true),
  row("decisions/base", ["decisions.test.ts#DATA"], () => structuredClone(replayDecisionBase), true),
  row("decisions/fields", ["decisions.test.ts#early-late-bound"], replayDecisionFields, true),
  ...(["bare", "applied", "named", "other", "invalid", "spent", "known"] as const).map(decision => row(`decisions/redacted(${decision})`,
    [`decisions.test.ts#redacted(text,${JSON.stringify(decision)})`], () => replayDecisionText(decision), true)),
  row("decisions/floor", ["decisions.test.ts#proving(200)", "decisions.test.ts#proving(50)"], replayDecisionFloor, true),
  row("source-order/default", ["source-order.test.ts#sourceOrderFixture"], () => structuredClone(sourceOrderDefinition)),
  ...[false, true].map(branch => row(`late(${branch})`, [`late.test.ts#lateFixture(${branch})`], () => lateDefinition(branch))),
  row("reserved/source", ["verify.test.ts#reserved"], replayReservedSource),
  row("reserved/receiver", ["verify.test.ts#receiver"], replayReservedReceiver),
  row("reserved/qualified-receiver", ["verify.test.ts#qualifiedReceiver"], replayQualifiedReceiver),
];

/** Fixed replay bounds are distinct validation contexts even when the replay
 * later refuses a history's capacity. History-measured byte limits stay in
 * their owning witnesses rather than being invented here. */
const fixedReplay = (name: string, origins: readonly string[], declaration: () => unknown,
  over: Partial<Bounds>, platform = false): DefinitionCorpusRow => ({
  ...row(`fixed/${name}`, origins, declaration, platform), bounds: { ...PROPOSED_BOUNDS, ...over }, profiles: RULE_PROFILES,
  options: platform ? { platform: true, outcomeValues: {} } : {},
});
const staticReplayContexts: readonly DefinitionCorpusRow[] = [
  fixedReplay("capacity item ceiling 1", ["capacity.test.ts#unknown historical text"],
    () => changed(notes, capacityLargeTextAgain), { scopeItems: 1 }),
  fixedReplay("view exact item3 request2", ["view.test.ts#exact"], replayViewDuty, { scopeItems: 3, scopeRequests: 2 }),
  ...([{ scopeItems: 2 }, { scopeRequests: 1 }] as const).map((over, index) => fixedReplay(`view overflow ${index}`,
    [`view.test.ts#full bound table ${index}`], replayViewDuty, over)),
  fixedReplay("floor entry ceiling 155", ["floor.test.ts#replay hides archived facts"],
    () => changed(notes, floorProofActs), { scopeEntries: 155 }),
  ...[21, 92, 93, 97].map(scopeEntries => ({
    ...fixedReplay(`Register entry ceiling ${scopeEntries}`, ["decisions.test.ts#actual Register legacy cleanup"],
      () => structuredClone(register), { scopeEntries }, true),
    options: { platform: true, outcomeValues: outcomeValueDomains(register, registerRules) },
  })),
  ...[4, 3].map(scopeEntries => fixedReplay(`decisions base entry ceiling ${scopeEntries}`,
    ["decisions.test.ts#bound refusal"], () => structuredClone(replayDecisionBase), { scopeEntries }, true)),
  fixedReplay("decisions field entry ceiling 5", ["decisions.test.ts#early and late field refusal"], replayDecisionFields,
    { scopeEntries: 5 }, true),
];

/** Keep the fixture-construction context and the replay interpreter's context
 * separate even when their declaration bytes are identical. These made-up
 * owner rules expose no value reader except the explicit archive probe. */
export const replayHistoryDefinitions: readonly DefinitionCorpusRow[] = [
  ...fixtureDefinitions,
  ...staticReplayContexts,
  ...fixtureDefinitions.map((fixture): DefinitionCorpusRow => ({
    ...fixture, name: `${fixture.name}/replay-check`, profiles: RULE_PROFILES,
    options: fixture.options?.platform ? { platform: true, outcomeValues: fixture.name === "replay/archive/outcome-value"
      ? { probe: [replayArchiveEvidenceValue] } : {} } : {},
  })),
];
