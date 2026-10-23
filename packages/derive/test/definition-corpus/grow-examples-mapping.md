# Grow example declaration mapping

These 15 rows retain complete declarations, including declarations whose later
acts or package graphs are refused. Registration does not claim a passing
validation result. All rows use `PROPOSED_BOUNDS`; no row uses platform options.

| Origin | Raw construction | Validation context |
| --- | --- | --- |
| `examples/grow/room.test.ts#nativeCreatedSite(site)` | Maintained Site and its `growSiteLauncherDefinition(site)` | `nativeChild` and `nativeScenario`, `RULE_PROFILES` |
| `examples/grow/room.test.ts#setup`, `site.test.ts#setup.childDefinition`, `work.test.ts#nativeScenario(room)`, `watering.test.ts#nativeScenario(room)` | Maintained Room | `nativeScenario` and `nativeChild`, `RULE_PROFILES` |
| `examples/grow/site.test.ts#setup()` | `siteForRoomDefinition(room)` and its launcher | Native wrappers, `RULE_PROFILES` |
| `examples/grow/site.test.ts#misaddressed`, `setup(misaddressed)` | `misaddressedRoomDefinition()`, `siteForRoomDefinition(misaddressed)`, and that Site's launcher | Native wrappers, `RULE_PROFILES` |
| `examples/grow/device.test.ts#definition` | `deviceTestDefinition()`, including `deviceForms("grow-device-fixture")` with its original default argument | `nativeScenario`, `RULE_PROFILES` |
| `examples/grow/zone.test.ts#definition`, `zone.test.ts#foreign.nativeScenario` | `zoneTestDefinition()`, including `zoneForms("grow-zone-fixture")` | `nativeScenario`, `RULE_PROFILES` |
| `examples/grow/simulator-tick.test.ts#fixture.parentDefinition` | `simulatorTickParentDefinition(demoDefinitions().room, fields)` | Direct validator with default profiles and no options |
| `examples/grow/demo-definitions.test.ts#demoDefinitions().site/.room` | Existing pure `demoDefinitions()` exports | Explicit validator and native wrappers, `RULE_PROFILES` |
| `examples/grow/demo-definitions.test.ts#nativeCreatedSite(site)` | `growSiteLauncherDefinition(demoDefinitions().site)` | `nativeScenario`, `RULE_PROFILES` |
| `packages/derive/test/package-relation-order.test.ts#nativeCreatedSite(parentDefinition)` | `growSiteLauncherDefinition(preFailureRelationData(true).definitions[0].definition)` | `nativeScenario`, `RULE_PROFILES` |

The simulator parent's `create` pins the exact demo Room digest. Its constants
retain `label: "TEST hosted room"` and the full public member references used by
`test-support.ts`: sensors is `keys.vic.member`, climate is `keys.una.member`,
and operator is `keys.paul.member`. The lazy corpus constructor reproduces
`fixtures.ts#ref("membership", 1)` with the same seed, incarnation and member
handles. It does not import the eager validated fixtures or construct keys.
The test itself still supplies its original `fields` object to the shared raw
constructor. No principal, grant, actor or founding argument has changed.

The shared launcher retains the original clone/mutation order, root item,
genesis field selectors and exact input-definition digest. Its validating
wrapper, native child creation, confirmation and assertions remain in
`test-support.ts`. These declarations have no separate literal pin in the
original source; their existing native histories retain their computed digest.
No expected pin is invented by computing both sides of an assertion here.

The Site test's misaddressed Room is a complete valid declaration: its
`report-site` relation deliberately names row 2. Actual creation and relation
judgment succeed, then a later delivery from another Room is refused. Both
Room variants and both Site rebinding inputs remain named, including cases
whose bytes equal maintained exports. Room test heater limits and all site
presence/summary loops change state or requests, not declarations.

`preFailureRelation(true)` has a refused package graph (`fan-in-unproved`),
but its Site and Room are complete native definitions used for actual creation
and replay. Its launcher therefore remains a positive corpus row. Refused
Device/Zone/demo actions, malformed evidence, and simulator reply-loss/tick
conditions alter requests or state, not the raw declarations; they create no
additional definition variants.

This extraction is source-only and unrun. It does not claim global corpus
completeness, native enrollment, deployment, or a passing compiler/test result.
