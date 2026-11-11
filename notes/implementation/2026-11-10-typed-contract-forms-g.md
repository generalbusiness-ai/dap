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
original additional configurations below and any further affected compiler
context. Each edit adds that option alone. The
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
JSON imports. Define's pin witness reads retained JSON through `readFileSync`.
Its existing type fixture now imports both real lane runtime wrappers so
that the same compile context checks their JSON assertions. That additional
edge requires `resolveJsonModule: true` in `packages/define/tsconfig.test.json`
under the same ruling. This one test-configuration JSON edit changes no
definition JSON or retained pin. Define's production configuration stays
unchanged. This table records static source imports. The focused compiler
pass must confirm the complete closure.

## Slot modifiers and runtime JSON types

The focus at `a59044c7` stopped in the CLI Scope compiler with two TS2352
errors. `author(party.optional)` inferred both `author: false` and
`author: true`, so the intersection became `never`. The helper now declares
its actual overwrite result: `Omit<S, "author">` with `author: true`.
Its emitted object expression stays unchanged.

Lane authoring retains the exact constructor types in `changeSource` and
`issueSource`. Runtime JSON imports have arrays rather than authored tuple
cardinality. The lane-only `DefinitionData` view keeps readonly arrays,
literal element values and object keys without promising those lengths.
It projects branded grant and refusal names to their underlying string
names before handling ordinary primitives. Only the exported runtime data
aliases use this view. The wrappers keep their
existing single assertions and type-only imports. Grow's existing mutable
contract aliases need no change.

The continuation at `5cd11250` passed compiler-05, then stopped in
compiler-06 because imported acts lack the author-only `[ACT_NAME]` key.
The JSON view now omits symbol keys at every object depth. The exact
constructor types still carry named-act identity, so `fact(act)` retains
the authored definition and act names. Imported JSON cannot claim that
identity or the runtime WeakMap entry.

The symbol audit covers all seven Define markers. `ACT_NAME`, `TYPE`,
and `RECORD_ELEMENT_KEYS` describe authoring types. `INLINE_RULE` and
`DECLARATIONS` hold nonenumerable authoring metadata. The JSON view omits
object keys of each symbol type if they occur. Primitive `GRANT` and
`REASON` markers belong to authoring strings, not JSON. The continuation at
`7098b54d` stopped in compiler-06 because the earlier primitive branch kept
those brands in the data view. The view now extracts each underlying name
with the same conditional inference pattern as Define's `GrantNames`.
Constructor values still carry the brands. The data aliases carry the
literal names without those authoring markers. This type view neither
removes runtime properties nor changes serialization.

The existing type fixture checks the overwritten author flag, retained
slot modes, both performer slots, exact constructor tuples, and readonly
JSON element values. It also checks exact authored act identity, rejects
`fact(jsonAct)`, and omits nested object symbol keys. The fixture proves
that real vocabulary constructors retain both brands, plain names cannot
impersonate them, and materialized grant/reason names remain literal and
unbranded even inside readonly arrays. It directly imports both actual
runtime wrappers, so their JSON assertions belong to this same compile
context. Existing runtime tests and their assertions stay.

## Working compiler checks

Ruling `1ce32e09` separates ordinary working checks from acceptance evidence.
Compiler-06 now passes with the corrected JSON view. All twenty-one selected
compiler contexts pass on the repaired source. These working runs establish
no acceptance, gate, or deployment result.

The checks also corrected three fixture types: the declaration helper now
retains its literal act keys, the foreign-send fixture narrows the send kind,
and the description fixture names its already-required presented pin.
Their assertions and case counts stay unchanged. Grow's Worker entry uses
`String(packet)` with Wrangler's existing Text module rule; imported text
keeps its exact signed packet bytes while the JSON-aware compiler accepts
the entry. The signed packet, release and publisher stay unchanged.

## Canonical object order and generated reference

The continuation at `8b1ea8cc` passed all twenty-one current compiler
contexts, then stopped at the Grow pin witness. Its twelve repeated-subject
paths matched exactly, but canonical JSON enumerated the named acts in a
different order. The comparison now sorts both path lists. Three Lane
metadata comparisons also sort their complete shape and row lists. These
comparisons preserve duplicates and every expected value. Guard, effect,
send and other semantic arrays keep their existing order assertions.

An ordinary working run then found the generated Lane reference stale.
The maintained `apps/room/lanes/scripts/reference.mjs` writer regenerated it
once. All 504 rows keep their keys, values and counts; row and named-field
order now follows the canonical definitions. Non-table prose, byte stamps
and digests stay exact. This reference write is separate from the earlier
Lane/Grow render and JSON-format producer.

Ordinary working checks passed the eight pin cases, the four Lane
definition cases, twelve active-source Node cases and three Native Grow
cases. The interrupted broader Plain working run reported 1,432 passes,
one stale-reference failure and two skips; it did not finish every selected
case. The two compiler contexts that read the assertion repairs also pass.
A read-only config directory and sandboxed local listen each caused one
working startup failure before any cases ran. A writable scratch config
and the local-listen permission resolved those setup failures. These are
working results, not sealed acceptance evidence.

## Validation status

The first three focused attempts stopped at compiler-06 before runtime
owners ran. The fourth passed all twenty-one current compilers and failed
in Plain; Node and Native were not launched in that sealed unit. Its raw
receipts, the earlier failures and their source checkpoints remain distinct.
The repaired source proceeds to the required full gate without another
sealed focus repeat. Its first full gate at `699bd733` passed the initial
checks through citation tests, then stopped at the documentation-link
check. Three links still named the removed `examples/grow/device.ts`.
They now name `examples/grow/authoring/forms.ts`, which owns those typed
forms. The ordinary maintained link check reports 1,232 links and zero
broken links. The failed gate reached no compiler or runtime test phase.
Its raw receipts remain distinct from the focused attempts.

The second full gate at `d92fc933` passed its compiler and initial checks,
all 150 Node cases and all 56 Counting cases. Plain reported 4,520 passes,
two failures and one skip. Both failures compared MCP descriptions with
stale references after canonical JSON changed named-field order. Native
did not run. This failed unit supplies no successful gate or control
baseline.

The maintained MCP reference writer regenerated `docs/mcp-tools.json` once.
All 75 tools retain their identities and order. Nine descriptions reorder
existing field clauses, and five required-field arrays reorder their
existing names. Every other value and schema stays exact. The Markdown
reference and worked example now show the same descriptions. The existing
inventory witness also compares each native table description exactly,
with one row per tool. Its title and case count stay unchanged.

Both affected MCP test files pass in ordinary read-only mode: thirteen
cases across two files. Their compiler context also passes. These working
checks follow the writer run and establish no gate acceptance. The failed
gate receipts remain separate.

Page and Card workflows passed at both `699bd733` and `d92fc933`. The MCP
reference follow-up still owes its successful full gate, controls and
final-head browser workflows. No acceptance or deployment follows from
these earlier passes.

The observed maintained AST parser output seals Grow's Text-module bridge.
No route or gate assertion changed. The later working repair changes comparisons in two
test owners and the generated Lane reference. Definition JSON, retained
pins, authored runtime object expressions and kernel source stay unchanged.
The retained whole-definition byte and pin witnesses still govern acceptance.
