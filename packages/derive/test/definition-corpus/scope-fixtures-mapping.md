# Scope fixture mapping — first archive batch

This is an incremental map, not a claim that all Scope fixtures are registered.
Floor/capacity, application literals, creation/turn/text variants and native data
mutations remain pending later batches. The complete initial scan is retained
outside the checkout as `/private/tmp/k9-scope-platform-raw-locators.txt`.

Raw callbacks now live in `packages/scope/test/definition-corpus-data.ts`.
Existing callers still execute their original `variant(base, change)` wrapper
at the same point. The callback factory supplies the exact original mutation
body and captured arguments. No validator is imported by the raw data module.
`scopeData` uses the same structuredClone then mutation sequence as the existing
fixture `changedDraft`; it returns raw bytes' data, never a validation result.

| Existing source | Raw callback/factory | Registration |
| --- | --- | --- |
| support.ts definition | scopeLaneChange / scopeLaneData | raw derive lane, same hold4/not-self/proof/settlement mutations |
| support/archive.ts archiveDefinition | scopeArchiveChange / scopeArchiveData | omit only unresolved link.create |
| support/archive-native-authority.ts archiveFactoryDefinition | scopeFactoryChange / scopeFactoryData | same removed unused hold forms |
| support/archive-native-authority.ts archiveScaleFactoryDefinition | scopeScaleChange / scopeScaleData | same remark transition and archive-text rule |
| hosted.ts staged | scopeStagedChange | same report commit field and staged guard |
| archive-act-fields.test.ts detached false/true | archiveActFieldsChange(detached) | both exact field variants |
| archive-foreign.test.ts receiver/accepting | archiveReceiverChange / archiveMembershipProofChange | original different pin and separate native Membership seat proof variant |
| archive-inventory.test.ts base | archiveInventoryChange / scopeInventoryData | same link filtering and detached text128 |
| archive-inventory.test.ts leaf(name,child?) | archiveLeafData | direct names scouted-child, planned-declaration-child, missing-scout-child, late-child, covered-root, uncovered-final-root |
| archive-inventory.test.ts four parents | archiveInventoryParentChange(child) | four separate exact child digests, same original pushes |
| archive-inventory.test.ts root always | archiveInventoryAlwaysChange | same true rule |
| archive-inventory.test.ts graph boundary cases | archiveLeafData | all actual graphs [17,17,17,12], [17,17,17,13], [18]; raw child digest linkage reconstructed in original reverse order, each actual group/position named |
| archive-source-pins.test.ts wrongDeclaration | archiveWrongProducerChange | negative source admission still uses a complete positive different-name declaration |
| archive-text.test.ts definition | archiveTextChange | same whole-scope capacity and detached text1024 |

Default `variant` validation contexts retain PROPOSED_BOUNDS and omitted
profiles/options. Separate native rows use RULE_PROFILES, as Native Core does
when creating the same declarations. No declared row gets platform options.
The leaf/graph metadata definitions retain default shape contexts; being part
of a graph that intentionally exceeds an aggregate bound does not make those
individual declarations invalid. No entry, child, graph node or boundary case
is dropped to make validation easier.

Imports and callback construction are pure. Existing tests retain their actual
create/delivery/retry/read/repair/history work and all original assertions,
limits, budgets, deadlines and lifecycle handling. No compiler, corpus or test
execution has occurred; this first batch still needs source review and owning
validation under root allocation.


## Later Scope extraction checkpoint

The later checkpoint extends the first archive batch. It remains an incremental
registration, not a claim that every runtime-selected bound has been enumerated.

| Sources | Shared raw exports | Context retained |
| --- | --- | --- |
| capacity-admission, capacity-owner, capacity-recovered | capacityLaneChange, capacityRequestChange, capacityHoldReaderChange, capacityTokenOwnerChange, capacityRecoveredTextChange, recoveredAliasData | Original variant defaults; alias explicitly platform true with default profiles; runtime-measured alias byte ceiling is not fabricated as a static constant |
| compose | composeWholeTicketChange, composeWholeDeskChange | Both original whole-scope declarations and exact raw child digests |
| creation, operations, replay, hosted | creation mutation callbacks, operationStagedChange, replayRecordedChange | Original variant defaults and separate ordinary Native rule-profile contexts |
| floor-kept, floor-monotonic, floor-requests, floor | floorKeptChange, floorMonotonicChange, floorReceiverChange, floorSenderChange, floorPendingChange | Both repeated sender/receiver origins; original default wrapper contexts |
| texts, turn, observability-native | scopeTextBase/body and callbacks; turn callbacks; observabilityCountChange | Actual legacy/whole variants, body types and captured counts retained |
| application-establish, application-publication | countingContainerData/countingPublicationData, scopePublisher/publisherContainerData | Literal shapes and exact child digest retained |
| creation-lineage, application-owned-scopes-fixture, application-fact-time-fixture | lineageDeviceRoot/lineageBudgetDefinitions, ownedScopeDefinition, configureFactTimeDefinition | All 17 actual budget bodies, both root/child names and Counter mutation |
| standing, archive-pin | indexedStandingData and unchanged pure standingData | Explicit PROFILES/platform wrapper; exact Native entry ceilings 7 and 8, and indexed 8, RULE_PROFILES/outcomeValues empty |
| indexed-integers, values, holds | indexedIntegerChange, gateValueFieldChange/gateValueOutcomeChange, scopeHeldOperationsChange | Explicit platform wrapper and distinct Native RULE_PROFILES/actual outcome-domain contexts |
| observes | steppedObservationChange, observationDomainChange, membershipObservationChange | Both retained domains, actual two-step rows, and both Native/replay action aliases; wrapper PROFILES/platform context |
| archive-inventory old-pin refusal | oldMembershipStandingData | Positive platform data renamed exactly as before; Native RULE_PROFILES and empty owner evidence-domain map |

The six custom capacity/floor files are owned by the separate
scope-capacity-floor shard and must not be inferred from this shard's defaults.
Unchanged derive foundation factories are mapped by the corpus owner to their
actual Scope caller aliases. They cover only matching validation contexts.

Open inventory work includes precise Native outcome-domain contexts for
observation fixtures, all static constructor-bound overrides, and explicit
classification of history-measured ceilings. No history is executed to create
corpus rows. Platform parameter-family rows are additional supported-constructor
controls; they do not substitute for actual named caller provenance.


The whole-scope staged-renew snapshot from creation.test.ts is intentionally
validator-negative: whole capacity plus a held staged workspace triggers the
format-1 reserve-unbounded/capacity refusal. Its raw helper and original
unsupported-definition assertion remain, but it has no positive corpus row.
The legacy staged-renew variant remains positive. Native helper expansion emits
only its two named contexts; shared global rows appear once at top level.

Root's context decision: register statically named validator bounds, profiles
and options exactly. History-measured post-construction quota controls remain
owning runtime checks, with exact source locators and unchanged native
witnesses; no numeric corpus values are invented by running or simulating those
histories. Their locator inventory is retained separately while the static
context audit completes.


## Static Native and replay contexts

The context-only successor adds the actual named bounds below; all other bound
fields keep PROPOSED_BOUNDS. Declared contexts use RULE_PROFILES; platform contexts
also use platform true and the actual owner outcome-value map. Observation
weigherRules has no evidence-value accessor, so its owner map is empty even
when a declaration's observation rows retain values. The gate outcome probe
has the explicit evidence map for each of its two domains.

| Source | Named context |
| --- | --- |
| answers.test.ts | shared lane entryBytes 4096 |
| operations.test.ts | shared lane scopeEntries 7 and 20 |
| turn.test.ts | legacy entry ceilings 3, 6, 7, 12; whole 6, 12; abandon 6, 8; target 8; asking legacy/whole 8 |
| capacity-admission.test.ts | whole lane scopeItems 2; request variant scopeRequests 1 |
| capacity-owner.test.ts | token owner scopeRecords 1 native and 0 replay |
| floor-archive.test.ts | archive scopeEntries 2000, both fixed and driver aliases |
| holds.test.ts | held-operation data scopeEntries 6, 7, 8 |
| device-command-install.test.ts | deviceCommandFixture scopeEntries 16, original explicit/default profile wrapper and Native rule-profile context |
| capacity-child-definitions.test.ts | actual first true root/branch/leaf and legacy false root/branch with namedDefinitions 2; branch stays whole even when root is legacy |
| capacity-genesis-bodies.test.ts | true/false bodies and actual nested-child root with namedDefinitions 2 |
| capacity-platform-requests.test.ts | base true/withKind true at entries/items 5/1 and 6/2; future true at 10/3; settling false/true marker at 8/3 |
| archive-act-fields.test.ts | actual Rules2 definitionBytes PROPOSED_BOUNDS.definitionBytes minus one, with actual owner domains |
| observes.test.ts | unchanged and three mutation families under Native profiles and empty owner evidence map |
| capacity-recovered.test.ts | recovered alias Native platform context, separate from explicit wrapper |

History-measured quota controls remain unchanged owning runtime witnesses:
capacity-admission.test.ts (`required`, `required - 1`, `limit`),
capacity-recovered.test.ts (`limit`, `limit - 1`),
capacity-confirmation.test.ts (`ceiling`, `ceiling - 1`),
capacity-child-definitions.test.ts (`ceiling`, `ceiling - 1`),
capacity-standing.test.ts (`bytes` from reservation/storage accounting),
capacity-receiver-pins.test.ts (`before.bytes + before.reserved.bytes`), and
push-standing.test.ts (`capacity.written + capacity.reserved`, later `limit`).
These are not omitted declaration families: their raw declarations have named
rows, while their measured quota arithmetic is proved by the existing Native
histories rather than fabricated corpus constants. The six custom capacity/floor
files' additional static contexts are delegated to their owning shard.


## Unchanged foundation Native aliases

source-order.test.ts, late.test.ts (both actual branch arguments) and
peer-pin.test.ts (receiver, sender and alternate) create actual Native scopes
and replay them under RULE_PROFILES. These contexts are distinct from their
foundation fixture wrappers' default-profile validation. Scope repository.office
also creates the actual office declaration under RULE_PROFILES; its actual
named arguments are membership@2 by default and CLI join's explicit @2/@6/@7.
The installed device alias is exactly devicePackageFixture (with receives
closed), not the separate unstripped deviceCommandFixture.

The unsupported live/sequenced variants in replay.test.ts are explicit
validator-negative durability inputs and stay excluded. The wrong reviewed
native declaration in archive-native-root.test.ts is a policy-corruption
stand-in, not a newly admitted definition. Neither changes the positive
source/order/replay aliases above.


## Full-tuple child and genesis audit

Scope's first `setup(root)` in capacity-child-definitions.test.ts actually uses
the complete default-byte plus namedDefinitions 2 tuple, before later measured
byte-ceiling setups. Its root and required branch/leaf declarations are
validated through Core.create and namedBy. Legacy `setup(root)` also uses that
complete fixed tuple; the supplied branch and the later child delivery reach
branch validation. The supplied unrelated extra is only hashed/canonicalized,
never traversed by namedBy, and the legacy leaf is absent. Those three
previously over-enumerated Native aliases are removed. Their original raw
fixture/default-wrapper positives remain registered in the foundation matrix.

Every setup in capacity-genesis-bodies.test.ts directly sets default bounds
plus namedDefinitions 2, without a measured byte override. Its plain true/false
body definitions and true body-bearing child root therefore retain actual
complete fixed context rows. Later measured child byte tuples remain only in
the owning history mapping above. No default scopeBytes value substitutes for
a measured one.
