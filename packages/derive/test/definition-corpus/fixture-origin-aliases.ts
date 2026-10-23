/** References to unchanged validated fixture constants at the landed security basis.
 * These aliases identify uses of the same declaration and default validation context.
 * Mutated declarations and custom contexts remain separate rows in their owning shards. */
import type { DefinitionCorpusRow } from "./row.ts";
const aliases: Readonly<Record<string, readonly string[]>> = {
  "derive/shared/lane": [
    "packages/derive/test/compose.test.ts:307#laneDefinition",
    "packages/derive/test/fixtures-receiver-pins.ts:8#laneDefinition",
    "packages/derive/test/forms-beside.test.ts:26#laneDefinition",
    "packages/derive/test/forms-capability.test.ts:101#laneDefinition",
    "packages/derive/test/forms-grant.test.ts:109#laneDefinition",
    "packages/derive/test/forms-prepare.test.ts:28#laneDefinition",
    "packages/derive/test/forms-prepare.test.ts:33#laneDefinition",
    "packages/derive/test/forms-records.test.ts:178#laneDefinition",
    "packages/derive/test/forms-records.test.ts:180#laneDefinition",
    "packages/derive/test/judge.test.ts:12#laneDefinition",
    "packages/derive/test/judge.test.ts:22#laneDefinition",
    "packages/derive/test/judge.test.ts:207#laneDefinition",
    "packages/derive/test/judge.test.ts:322#laneDefinition",
    "packages/derive/test/timed.test.ts:9#laneDefinition",
    "packages/derive/test/timed.test.ts:26#laneDefinition",
    "packages/derive/test/timed.test.ts:27#laneDefinition",
    "packages/derive/test/timed.test.ts:55#laneDefinition",
    "packages/derive/test/timed.test.ts:77#laneDefinition",
    "packages/derive/test/timed.test.ts:90#laneDefinition",
    "packages/derive/test/timed.test.ts:96#laneDefinition",
    "packages/derive/test/timed.test.ts:97#laneDefinition",
    "packages/derive/test/timed.test.ts:99#laneDefinition",
    "packages/derive/test/validate.test.ts:175#laneDefinition",
    "packages/derive/test/validate.test.ts:176#laneDefinition",
    "packages/derive/test/validate.test.ts:177#laneDefinition",
    "packages/derive/test/validate.test.ts:178#laneDefinition",
    "packages/platform/test/support-destination.ts:221#laneDefinition",
    "packages/platform/test/support-destination.ts:222#laneDefinition",
    "packages/scope/test/answers.test.ts:59#laneDefinition",
    "packages/scope/test/creation.test.ts:70#laneDefinition"
  ],
  "derive/shared/small": [
    "packages/derive/test/forms-capability.test.ts:101#smallDefinition",
    "packages/derive/test/judge.test.ts:75#smallDefinition",
    "packages/derive/test/judge.test.ts:156#smallDefinition",
    "packages/derive/test/judge.test.ts:171#smallDefinition",
    "packages/derive/test/judge.test.ts:274#smallDefinition",
    "packages/derive/test/judge.test.ts:289#smallDefinition",
    "packages/derive/test/validate.test.ts:179#smallDefinition",
    "packages/derive/test/validate.test.ts:180#smallDefinition"
  ],
  "derive/shared/notes": [
    "packages/derive/test/fixtures-child-definitions.ts:6#notesDefinition",
    "packages/derive/test/fixtures-platform-requests.ts:7#notesDefinition",
    "packages/derive/test/floor.test.ts:49#notesDefinition",
    "packages/derive/test/floor.test.ts:50#notesDefinition",
    "packages/derive/test/floor.test.ts:51#notesDefinition",
    "packages/derive/test/floor.test.ts:58#notesDefinition",
    "packages/derive/test/floor.test.ts:61#notesDefinition",
    "packages/replay/test/archive-fixtures.ts:31#notesDefinition",
    "packages/replay/test/archive-fixtures.ts:111#notesDefinition",
    "packages/replay/test/archive-git.test.ts:117#notesDefinition",
    "packages/replay/test/capacity.test.ts:11#notesDefinition",
    "packages/replay/test/capacity.test.ts:38#notesDefinition",
    "packages/replay/test/capacity.test.ts:58#notesDefinition",
    "packages/replay/test/capacity.test.ts:59#notesDefinition",
    "packages/replay/test/capacity.test.ts:79#notesDefinition",
    "packages/replay/test/floor.test.ts:15#notesDefinition",
    "packages/replay/test/floor.test.ts:98#notesDefinition",
    "packages/replay/test/genesis-bodies.test.ts:14#notesDefinition",
    "packages/replay/test/genesis-bodies.test.ts:25#notesDefinition",
    "packages/replay/test/recovered-bytes.test.ts:12#notesDefinition",
    "packages/replay/test/recovered-bytes.test.ts:26#notesDefinition",
    "packages/replay/test/recovered-bytes.test.ts:74#notesDefinition",
    "packages/replay/test/recovered-bytes.test.ts:77#notesDefinition",
    "packages/replay/test/recovered-bytes.test.ts:110#notesDefinition",
    "packages/replay/test/recovered-bytes.test.ts:114#notesDefinition",
    "packages/replay/test/recovered-bytes.test.ts:124#notesDefinition",
    "packages/replay/test/text-refusals.test.ts:8#notesDefinition",
    "packages/replay/test/verify.test.ts:63#notesDefinition",
    "packages/replay/test/verify.test.ts:64#notesDefinition",
    "packages/replay/test/verify.test.ts:65#notesDefinition",
    "packages/replay/test/verify.test.ts:86#notesDefinition",
    "packages/replay/test/verify.test.ts:87#notesDefinition",
    "packages/replay/test/verify.test.ts:113#notesDefinition",
    "packages/replay/test/verify.test.ts:151#notesDefinition",
    "packages/replay/test/verify.test.ts:603#notesDefinition",
    "packages/replay/test/verify.test.ts:680#notesDefinition",
    "packages/replay/test/verify.test.ts:681#notesDefinition",
    "packages/scope/test/archive-act-fields.test.ts:71#notesDefinition",
    "packages/scope/test/archive-act-fields.test.ts:72#notesDefinition",
    "packages/scope/test/archive-act-fields.test.ts:84#notesDefinition",
    "packages/scope/test/archive-act-fields.test.ts:96#notesDefinition",
    "packages/scope/test/archive-act-fields.test.ts:97#notesDefinition",
    "packages/scope/test/archive-act-fields.test.ts:99#notesDefinition",
    "packages/scope/test/capacity-recovered.test.ts:37#notesDefinition",
    "packages/scope/test/capacity-recovered.test.ts:59#notesDefinition",
    "packages/scope/test/observes.test.ts:249#notesDefinition",
    "packages/scope/test/values.test.ts:73#notesDefinition"
  ],
  "derive/shared/ticket": [
    "packages/derive/test/compose.test.ts:14#ticketDefinition",
    "packages/derive/test/compose.test.ts:31#ticketDefinition",
    "packages/derive/test/compose.test.ts:37#ticketDefinition",
    "packages/derive/test/compose.test.ts:47#ticketDefinition",
    "packages/derive/test/compose.test.ts:167#ticketDefinition",
    "packages/derive/test/compose.test.ts:168#ticketDefinition",
    "packages/derive/test/compose.test.ts:207#ticketDefinition",
    "packages/derive/test/compose.test.ts:224#ticketDefinition",
    "packages/derive/test/compose.test.ts:233#ticketDefinition",
    "packages/derive/test/compose.test.ts:244#ticketDefinition",
    "packages/derive/test/compose.test.ts:294#ticketDefinition",
    "packages/derive/test/compose.test.ts:371#ticketDefinition",
    "packages/derive/test/compose.test.ts:397#ticketDefinition",
    "packages/derive/test/compose.test.ts:398#ticketDefinition",
    "packages/derive/test/forms-effects.test.ts:270#ticketDefinition",
    "packages/derive/test/forms-guards.test.ts:209#ticketDefinition",
    "packages/derive/test/forms-guards.test.ts:229#ticketDefinition",
    "packages/derive/test/forms-handlers.test.ts:89#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:11#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:17#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:25#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:36#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:42#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:55#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:94#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:101#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:105#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:110#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:115#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:160#ticketDefinition",
    "packages/derive/test/forms-ledger.test.ts:185#ticketDefinition",
    "packages/derive/test/forms-sends.test.ts:97#ticketDefinition",
    "packages/derive/test/forms-sends.test.ts:111#ticketDefinition",
    "packages/derive/test/forms-sends.test.ts:148#ticketDefinition",
    "packages/derive/test/forms-sends.test.ts:232#ticketDefinition",
    "packages/derive/test/rule.test.ts:13#ticketDefinition",
    "packages/derive/test/rule.test.ts:15#ticketDefinition",
    "packages/platform/test/directory.test.ts:34#ticketDefinition",
    "packages/platform/test/directory.test.ts:37#ticketDefinition",
    "packages/platform/test/directory.test.ts:128#ticketDefinition",
    "packages/platform/test/directory.test.ts:165#ticketDefinition",
    "packages/platform/test/directory.test.ts:168#ticketDefinition",
    "packages/platform/test/directory.test.ts:246#ticketDefinition",
    "packages/platform/test/directory.test.ts:281#ticketDefinition",
    "packages/platform/test/rules-scope.test.ts:185#ticketDefinition",
    "packages/platform/test/rules-scope.test.ts:337#ticketDefinition",
    "packages/platform/test/rules-scope.test.ts:341#ticketDefinition",
    "packages/scope/test/client.test.ts:23#ticketDefinition",
    "packages/scope/test/compose.test.ts:130#ticketDefinition",
    "packages/scope/test/compose.test.ts:132#ticketDefinition",
    "packages/scope/test/creation-real.test.ts:391#ticketDefinition",
    "packages/scope/test/net.ts:98#ticketDefinition",
    "packages/scope/test/observability-native.test.ts:62#ticketDefinition",
    "packages/scope/test/versions.test.ts:84#ticketDefinition",
    "packages/scope/test/versions.test.ts:85#ticketDefinition",
    "packages/scope/test/versions.test.ts:90#ticketDefinition",
    "packages/scope/test/versions.test.ts:96#ticketDefinition"
  ],
  "derive/shared/desk": [
    "packages/derive/test/compose.test.ts:211#deskDefinition",
    "packages/platform/test/directory.test.ts:112#deskDefinition",
    "packages/platform/test/directory.test.ts:114#deskDefinition",
    "packages/platform/test/directory.test.ts:265#deskDefinition",
    "packages/platform/test/register.test.ts:108#deskDefinition",
    "packages/platform/test/rules-scope.test.ts:185#deskDefinition",
    "packages/platform/test/rules-scope.test.ts:337#deskDefinition",
    "packages/platform/test/rules-scope.test.ts:341#deskDefinition",
    "packages/replay/test/archive-anchor-ranges.test.ts:28#deskDefinition",
    "packages/replay/test/archive-anchor-ranges.test.ts:29#deskDefinition",
    "packages/replay/test/archive-fixtures.ts:80#deskDefinition",
    "packages/scope/test/client.test.ts:23#deskDefinition",
    "packages/scope/test/client.test.ts:28#deskDefinition",
    "packages/scope/test/compose.test.ts:131#deskDefinition",
    "packages/scope/test/compose.test.ts:133#deskDefinition",
    "packages/scope/test/observability-native.test.ts:32#deskDefinition",
    "packages/scope/test/observability-native.test.ts:62#deskDefinition",
    "packages/scope/test/observability-native.test.ts:69#deskDefinition"
  ],
  "derive/board": [
    "packages/derive/test/forms-fields.test.ts:20#boardDefinition",
    "packages/derive/test/forms-fields.test.ts:68#boardDefinition",
    "packages/derive/test/forms-fields.test.ts:79#boardDefinition"
  ],
  "derive/works": [
    "packages/derive/test/forms-hold.test.ts:15#worksDefinition"
  ],
  "derive/childDefinitions(false).root": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(false).root"
  ],
  "derive/childDefinitions(false).branch": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(false).branch"
  ],
  "derive/childDefinitions(false).leaf": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(false).leaf"
  ],
  "derive/childDefinitions(false).extra": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(false).extra"
  ],
  "derive/childDefinitions(true).root": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(true).root",
    "packages/scope/test/capacity-genesis-bodies.test.ts#childDefinitions().root"
  ],
  "derive/childDefinitions(true).branch": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(true).branch",
    "packages/scope/test/capacity-genesis-bodies.test.ts#childDefinitions().branch"
  ],
  "derive/childDefinitions(true).leaf": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(true).leaf",
    "packages/scope/test/capacity-genesis-bodies.test.ts#childDefinitions().leaf"
  ],
  "derive/childDefinitions(true).extra": [
    "packages/scope/test/capacity-child-definitions.test.ts#childDefinitions(true).extra",
    "packages/scope/test/capacity-genesis-bodies.test.ts#childDefinitions().extra"
  ],
  "derive/genesisBody(false,notes)": [
    "packages/scope/test/capacity-genesis-bodies.test.ts#genesisBodyDefinition(false)"
  ],
  "derive/genesisBody(true,notes)": [
    "packages/scope/test/capacity-genesis-bodies.test.ts#genesisBodyDefinition(true)"
  ],
  "derive/peerPin.sender": [
    "packages/scope/test/peer-pin.test.ts#peerPinDefinitions().sender"
  ],
  "derive/peerPin.alternate": [
    "packages/scope/test/peer-pin.test.ts#peerPinDefinitions().alternate"
  ],
  "derive/peerPin.receiver": [
    "packages/scope/test/peer-pin.test.ts#peerPinDefinitions().receiver"
  ],
  "derive/late(false)": [
    "packages/scope/test/late.test.ts#validateDefinition(lateDefinition(false),PROPOSED_BOUNDS)"
  ],
  "derive/late(true)": [
    "packages/scope/test/late.test.ts#validateDefinition(lateDefinition(true),PROPOSED_BOUNDS)"
  ],
  "derive/sourceOrderDefinition": [
    "packages/scope/test/source-order.test.ts#validateDefinition(sourceOrderDefinition,PROPOSED_BOUNDS)"
  ],
  "derive/platformRequests(true,true)": [
    "packages/scope/test/capacity-platform-requests.test.ts#platformRequests(true,true)"
  ],
  "derive/futurePlatformRequests(true)": [
    "packages/scope/test/capacity-platform-requests.test.ts#futurePlatformRequests(true)"
  ],
  "derive/settlingPlatformMarks(false)": [
    "packages/scope/test/capacity-platform-requests.test.ts#settlingPlatformMarks(false)"
  ],
  "derive/settlingPlatformMarks(true)": [
    "packages/scope/test/capacity-platform-requests.test.ts#settlingPlatformMarks(true)"
  ]
};
export const withFixtureOriginAliases = (rows: readonly DefinitionCorpusRow[]): readonly DefinitionCorpusRow[] =>
  rows.map(row => ({ ...row, origins: [...new Set([...row.origins, ...(aliases[row.name] ?? [])])] }));
