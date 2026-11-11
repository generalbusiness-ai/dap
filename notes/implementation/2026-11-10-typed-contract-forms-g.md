# Typed contract forms: G source preparation

Request `f682cbc46d28df9029418272616bf0f4ead29dc7` covers the remaining
Define builder witnesses, missing contract forms, and exact authored Grow
and lane definitions. Promise `39da96860e62eaad1dc05da05a3772d3389bbe33`
covers this builder work. Planner ruling
`88cf23c309a7fc7085cc0590d47f6bdf051f637b` opened items 2 and 3 for source work before F landed. Item 1 now uses
the canonical spelling on F main `a419407e`, under ruling `09048d34`.

## Missing forms

`reference(fragment)` emits `{ type: "reference", fragment }` as plain
contract data. The helper preserves the literal numeric bound. The real
validator checks that bound; the helper adds no admission policy.
`field-types.ts` holds the helper, and the existing package root exports
it. This change adds no package subpath or alias requirement.

Two existing builders now expose the remaining optional forms. A second
`isFact` argument supplies the comparisons of a field fact. Its overload
rejects that argument for presented facts and bound elements. `sameSet`
accepts `where` and `except` in its options and passes them to `range`.
The typed filter exposes the scanned item's declared slot names. Calls
that omit these options retain their previous output shapes.

## PD-2 form mapping

This inventory maps the current declared contract in
`packages/contract/src/definition.ts` to the authoring API. A represented
form can still refuse validation in an unsupported context or with an
invalid bound. Platform-only definitions remain outside the authoring API.

| Contract family | Authoring form |
| --- | --- |
| Definition format, name, profile, genesis, rules, capabilities | `define`; its supported restricted profile; inline `rule` or the `rules` option; explicit `capabilities` |
| Durability and capacity | `define` options `level` and `capacity` |
| Text, detached text, integers, booleans, times, enums | `text`, `detached`, `int`, `bool`, `time`, `enumOf` |
| Members, local items, facts, scopes, citations | `member`, `itemOf`, `fact`, `scope`, `reference` |
| Digests, commits, trees, records, lists | `digest`, `commit`, `tree`, `record`, `list` |
| Required, optional, and defaulted fields | `required`, `optional`, `withDefault` |
| Item cardinality, initial and final states | `item` options `many`, `initial`, and `states`; `live`, `final` |
| Party, value, and reference slot modes | `party`, `value`, and `ref`: fixed, once, required, optional; `party.list` |
| Authorship, capability ownership, value defaults | `author`, `owned`, the `value.required` start argument |
| Open, transition, comment, presented facts | `open`, `transition`, `comment`, `presented` |
| Other local subjects | `by`, `via`, `one`, and dependent `siblings` |
| Tell, relate, and advisory handlers | `receive`, including `from`, `opens`, `copies`, `order`, and `late.then` |
| Item, copy, and marker settlement | Subject `settles`, `settlesCopy`, subject `settlesBy` |
| Field, presented-fact, slot, element, and item reads | Context `f`, `p`, subject `slot` and `id`, `el`, `elements`, `elementMember`, `eachItem` |
| Signer, sender, source, update, and result reads | `signer`, `sender`, `source`, `update`, `resultReason` |
| Scope, intent, absence, and constant reads | `theScope`, `theIntent`, `nothing`, `constant`; primitive literal arguments |
| Every entry part and compound reference part | `part` and `source` accept the contract's `Part` and `EntryPart` arguments |
| Ranges and comparisons | `range` with `where` and `except`; `equals`, `differs` |
| State, signer, signer exclusion, presence, and clock guards | Subject `in`, `signer`, `notSigner`, `set`, `unset`, `before`, `after` |
| Range and list quantifiers | `some`, `none`, `count`, subject `every`, `each`, `has`, `distinct`, `sameSet` including range `where` and `except` |
| Fact and rule guards | `isFact` including field-fact comparisons, `rule` |
| Alternatives, optional guards, refusal names | `anyOf`, `ifPresent`, `require` |
| Conditional effects and sends | `when`, and send `if` arguments |
| State, party, reference, value, and clock effects | Subject `to`, `party`, `add`, `remove`, `ref`, `value`, `take`; `self`, `now`, `plusSeconds` |
| Attribution and its four further source forms | Subject `attribute`; `authorsOf`, subject `authors`, `authorsIn`, `authorsFrom` |
| Hold, redaction, and capability effects or guards | Subject `hold`, `redact`, `capability`; `permit`, `eachOf`, `slotsOf`, `invoke` |
| All send sources and send kinds | `self`, ordinary operands, `collect`; `create`, `tell`, `relate`, `index` |
| Every request result clause | The send's `result` record; `conflict` remains creation-only at validation |
| Notices and timed rules | Subject `notify`, body `attention`, `timed` |

The table records source representation. It does not claim that the full
PD-2 acceptance is complete. The exact Grow, Change, and Issue source witnesses now use the complete
authored models. Their compiler and runtime results remain unrun.

## Validator witnesses

The new whole owner `packages/define/test/contract-forms.test.ts` declares
twelve cases. Each compiles a small made-up definition through the existing
validator and checks a plausible invalid counterpart at that same boundary.

| Invariant | Refusal counterpart |
| --- | --- |
| A signed act can redact detached text | Ordinary text and a handler cannot redact |
| `every`, signer exclusion, and `some` use declared item lists | Unknown states and non-item lists refuse |
| `collect` and `authorsOf` resolve bounded range members | Unknown members and non-party attribution sources refuse |
| Field defaults match optional field types | Wrong default types and required defaults refuse |
| A settlement mark starts false and only writes true | False writes and true defaults refuse |
| Update reads belong to relate handlers | A tell handler has no update |
| Result reasons belong to result clauses | The sending act has no result |
| Timed attention accompanies a total exit | A timed notice cannot have a condition |
| Explicit level and capacity retain their own bytes | Unsupported durability refuses |
| Citation fragments retain a bounded type | A fragment bound above 65,536 bytes refuses |
| Field facts can match foreign input fields | A non-field left read refuses |
| `sameSet` filters and excludes its range before matching keys | An undeclared excluded subject refuses |

The separate type fixture preserves the literal citation bound and rejects
a text argument. It also rejects comparisons on non-field facts and an
undeclared slot in a set's filter. Existing suites retain their cases and
assertions.

## One authored model per definition

Grow's `authoring/forms.ts`, `room.ts`, and `site.ts` replace its raw
component builders. The existing complete Define fixtures supply this
source. The fixtures now re-export the application authors. The test
corpus composes the same device and zone forms. Presence retains its
runtime projection and bound.

The lanes' `authoring/shared.ts`, `change.ts`, and `issue.ts` contain the
complete base definitions. Shared forms receive the lane name and the
comment and commitment items explicitly. Historical demo, manifest,
evidence, workspace, Question, and Finding descendants keep their source.
The old runtime shared file retains only its `LaneDefinition` type.

Each definition uses one generated JSON artifact. Grow's wrappers retain
the mutable `DeclaredDefinition` type for its demo variants. The lane
wrappers use type-only imports from their authors. Runtime code imports
neither Define nor authoring values. Define remains a development
dependency of dap-lanes. The lockfile adds only that workspace metadata.

`check-definition-pins.mjs` compiles all six application authors. It
compiles Room before Site and gives Site that exact Room digest. Its
normal mode compares the rendered JSON without writing. It also checks
the existing Lending, Counter, and lane pins. `--write grow` regenerates
both Grow artifacts. The lane producer compiles and writes both base
parents before it imports a runtime wrapper or descendant. Default mode
checks the existing publishing table before that parent subprocess can
write any JSON. It carries the checked source text and rows into the
existing default writer. A malformed table therefore stops every default
output. Opt-in modes check the parents without rewriting them and keep
their separate output paths.

The complete pin witness retains independent F byte counts, canonical
SHA-256 values, and tagged definition pins for Grow Room, Grow Site,
Change, and Issue. It strengthens the existing Grow and Change cases and
adds the missing whole Issue case. The earlier subject-spelling witnesses
remain. The active-source owner also guards runtime authoring imports and
keeps Define out of dap-lanes' runtime dependencies.

## JSON compiler inputs

Planner ruling `47ade9f5` permits `resolveJsonModule: true` in the seven
additional configurations below. Each edit adds that option alone. The
production contract, bytes, and derive configurations keep their options,
and their runtime source imports no JSON. The kernel boundary check keeps
its assertions.

| Configuration | Import that reaches generated JSON |
| --- | --- |
| `packages/derive/tsconfig.test.json` | `test/canonical-spelling.test.ts` imports Grow Room and Site, and the lane package |
| `packages/platform/tsconfig.test.json` | `test/package-graph.test.ts` imports Grow Room and the package-graph fixtures reach Site |
| `packages/cli/tsconfig.json` | Its test configuration inherits the option. `test/application-examples.test.ts` reaches Grow through `prepare-check.ts`. Views and repo-in-ai also inherit this configuration and import the lanes |
| `packages/cli/tsconfig.scope.json` | `test/host-none.scope.test.ts` imports the lane package |
| `apps/room/page/tsconfig.test.json` | `test/retained-editor.test.ts` imports the lane package |
| `apps/room/page/tsconfig.scope.json` | `test/signed-read-standing.scope.test.ts` imports the lane package |
| `scripts/tsconfig.json` | `demo/rehearse.ts` imports the lane package |

Grow and dap-lanes enable the same option in their own configurations.
The lanes include their new authoring directory and the narrow
`@generalbusiness/dap-bytes/web` types that Define already uses. These
provide the text coders and other Web globals that the authoring closure
reads, without adding DOM or Node types. `src/issue.ts` type-imports
`authoring/issue.ts`. That author imports `packages/define/src/index.ts`,
which imports `packages/bytes/src/index.ts`. Bytes exports `canonical.ts`,
which reads `TextEncoder` and `TextDecoder`. The lane configuration had
inherited an empty `types` list, so the same narrow type entry as Define
completes this compile-time closure. Grow includes its new authoring
directory. MCP and Scope test configurations already support
JSON imports. Define's pin witness reads retained JSON through `readFileSync`,
so its compiler needs no new JSON option. This table records static source
imports. The focused compiler pass must confirm the complete closure.

## Validation status

Compiler, validator, producer, formatter, focused owners, and the final
gate remain **UNRUN** for this proposal. The new Grow JSON holds the exact
retained canonical values. Its Prettier rendering remains unrun. No pin
change, acceptance, deployment, or readiness follows from this source
proposal. The runtime boundary, parent-first producer, whole definitions,
and compiler contexts need the booked G focused pass before the gate.
