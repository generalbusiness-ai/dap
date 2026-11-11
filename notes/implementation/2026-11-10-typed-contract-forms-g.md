# Typed contract forms

Define now represents the remaining contract forms, and Grow, Change and Issue
use complete typed authors that retain their canonical definition values and
pins. Runtime wrappers read generated JSON through type-only authoring aliases.
Default publishing validates its literal table before any parent or descendant
write. The final gate at `818009b868881508f04c65a087a2df88e4f53516` checks 5,859
obligations: 5,856 passes and three planned skips. The two distinguishing controls
use that same gate's 12-case import baseline without repeating its positive body.

Request `f682cbc46d28df9029418272616bf0f4ead29dc7` and builder promise
`39da96860e62eaad1dc05da05a3772d3389bbe33` own this change. The evidence
checkpoint tree is `ab69e56f6e9ca2480e1ae83104c2882f99e2cc4d`. Planner
rulings `88cf23c309a7fc7085cc0590d47f6bdf051f637b`, `09048d34` and
`47ade9f5` govern the forms, F spelling integration and compiler JSON options.

## Decisions and witnesses

### Missing forms

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

### PD-2 form mapping

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

The table records source representation. The exact Grow, Change, and Issue
witnesses use the complete authored models. The final gate checks their
compiler and runtime boundaries; the evidence table records its scope.

### Validator witnesses

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

### One authored model per definition

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

### JSON compiler inputs

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
unchanged. This table records static source imports. The final gate checks the
complete compiler closure.

### Slot modifiers and runtime JSON types

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

### Working compiler checks

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

### Canonical object order and generated reference

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

### Generated references and failed histories

The first full gate at `699bd733` stopped at three links to the removed
`examples/grow/device.ts`. They now name `examples/grow/authoring/forms.ts`.
The failed gate reached no compiler or runtime phase. The second full gate
at `d92fc933` passed 150 Node and 56 Counting cases, then reported 4,520 Plain
passes, two stale MCP reference failures and one skip. Native did not run.
Neither failed gate becomes a pass through the later evidence.

The maintained MCP reference writer regenerated `docs/mcp-tools.json` once.
All 75 tools retain their identities and order. Nine descriptions reorder
existing field clauses, and five required-field arrays reorder existing
names; every other value and schema stays exact. The Markdown reference
and worked example now show those descriptions. The existing inventory
witness compares every native table description with one row per tool;
its title and count stay unchanged. Ordinary follow-up checks passed the
13 cases across the two affected files and their compiler context before
the final gate. They remain working history rather than a separate gate pass.

The failed focused histories stay distinct. The first three stopped at
compiler-06; their current versus historical compiler passes are separate.
The fourth passed 21 current compiler contexts and then failed in Plain.
It reported 28 passes, one failure and 1,425 unresolved Plain obligations;
its 12 Node and three Native cases did not run. No runtime carry follows
from that interrupted unit. Planner ruling `1ce32e09` left the third
focused unit raw-only, and root requested the fourth raw-only readback.
The final filing preserves their audits and indexes without claiming
retrospective focused seals.

The first controls attempt stopped during owned-mirror setup with actual
exit 2, before any Node or publishing scene launched. Its partial mirror
and restoration enforcement error remain evidence. The corrected attempt
used independent owned custody and distinguished both controls. Its
controller exits are 0; expected mutant and entry failures remain actual 1.

## Final evidence

The committed manifest is
`notes/implementation/evidence/2026-11-11-typed-contract-forms-g.manifest.json`.
Its public unit is
`/Users/hughpyle/play/artroom-evidence/2026-11-11-g-final-818/unit`.
The table cites curated metadata or actual static stdout, as its output column
says. Each curated metadata file preserves the exact raw-output hashes and
private archive paths. The raw index maps copied files and references the immutable gate/control
archives, whose original inventories retain source paths and original modes.

| Check | Command | Actual exit | Output and SHA-256 | Qualification |
| --- | --- | --- | --- | --- |
| Historical producer: grow-render | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node --import /Users/hughpyle/play/artroom/.builder-worktrees/typed-contract-forms-g-20261110/node_modules/tsx/dist/loader.mjs scripts/check-definition-pins.mjs --write grow` | 0 | `producer-terminal-summary.json`: `7fa9f8ec03fb2c2499cfffe42c23b16e5e40c26d05a04ce8d1273d02147b981d` | Two render commands plus formatter: three commands, seven custody exits; canonical values/pins retained. |
| Historical producer: lane-render | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node apps/room/lanes/scripts/pin.mjs` | 0 | `producer-terminal-summary.json`: `7fa9f8ec03fb2c2499cfffe42c23b16e5e40c26d05a04ce8d1273d02147b981d` | Two render commands plus formatter: three commands, seven custody exits; canonical values/pins retained. |
| Historical producer: format-changed-json | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-contract-forms-g-20261110/node_modules/prettier/bin/prettier.cjs --write --no-config --no-editorconfig --ignore-path /dev/null -- apps/room/lanes/package.json apps/room/lanes/tsconfig.json apps/room/page/tsconfig.scope.json apps/room/page/tsconfig.test.json examples/grow/definitions/room.json examples/grow/definitions/site.json examples/grow/tsconfig.json packages/cli/tsconfig.json packages/cli/tsconfig.scope.json packages/derive/tsconfig.test.json packages/platform/tsconfig.test.json scripts/tsconfig.json` | 0 | `producer-terminal-summary.json`: `7fa9f8ec03fb2c2499cfffe42c23b16e5e40c26d05a04ce8d1273d02147b981d` | Two render commands plus formatter: three commands, seven custody exits; canonical values/pins retained. |
| Focus1 a590 | Compiler 04/05/06; exact argv/cwd in ledger | 1 | `focus1-compiler-ledger.json`: `a515846ee0bf51a6d49b63b9b0ff9d0ef99d470ef5160d5dfeb5f1ca1f6216f4` | 2 passes, 06 failed, 20 unrun; all 1,469 runtime cases unrun. |
| Focus2 5cd | Current 05/06; historical 04 separate | 1 | `focus2-compiler-ledger.json`: `aba50d98b9822f6deca83ff1f7b6f73e0588eb5e220472268571357132745a93` | Current 05 pass / 06 fail; 20 later and all 1,469 runtime unrun. |
| Focus3 7098 | Current 06; historical 04/05 separate | 1 | `focus3-audit.json`: `01aeeb22ed0a42bac67361aa3737be2d8402c9df61c381086b586a17ada8d774` | 06 failed; 20 later plus 1,469 runtime unrun; raw-only historical audit. |
| Focus4 8b1ea | 21 current compiler contexts, frozen Plain argv | 1 | `focus4-audit.json`: `47441fdb395e3635e482a44a143a2c336c66b19db7eb8d684251c72c31c535af` | Plain 28 pass / 1 fail / 1,425 unresolved; Node 12 / Native 3 unrun; no carry. |
| First full gate 699 | `npm run gate` | 1 | `gate1-manifest.json`: `8b4a398b7d008a4029c79c3f0aa347cd793ff165a222c26de7fbefdb999f347f` | Three broken links; no compiler/runtime reached; selector not run. |
| Second full gate d92 | `npm run gate` | 1 | `gate2-manifest.json`: `4d7230c8912dfdb563dd497ed27c9e69a830bdbbb9c3e120cc7b8095ccd2314c` | Node 150 / Counting 56; Plain 4,520 pass / 2 fail / 1 skip; Native 1,130 unreached. |
| Current 818 whitespace | `git diff --check 9f3338ff8b46f9e08c5d006352d15e05a09c8a35 818009b868881508f04c65a087a2df88e4f53516` | 0 | `static818-whitespace.stdout`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | Actual stdout; exact current head and all custody exits 0. |
| Current 818 commit-messages | `node scripts/check-commit-messages.mjs 9f3338ff8b46f9e08c5d006352d15e05a09c8a35 818009b868881508f04c65a087a2df88e4f53516` | 0 | `static818-commit-messages.stdout`: `4444466e8b15a91bb14a83c987a807c9fd40e5c3a788a23db225866d21aa0e94` | Actual stdout; exact current head and all custody exits 0. |
| Current 818 format | `npm run format:check` | 0 | `static818-format.stdout`: `6b858014bbe6926fbcfb41b3c9377ec28b3138bf83ce53de8790e5ed46af9d79` | Actual stdout; exact current head and all custody exits 0. |
| Final full gate 818 | `npm run gate`; pinned metadata reconciliation | 0 / analysis 0 | `final-gate-summary.json`: `b6d1bfa332107c580ca57a3eda06833eb53dd5dede653dcfd9113ec96334d101` | 5,859 accepted: 5,856 pass / 3 planned skips; 45 compilers / 16 scripts; 111 UNKNOWN; 6 Scale omitted. |
| Controls first setup | Owned-mirror construction; no scene launched | 2 | `controls-first-setup-audit.json`: `779cde7c8c203bd175154500e188bd720d7eeae9eb39ddf3ca8243e8a4029049` | Partial mirror retained; no complete restoration or distinction claimed. |
| Corrected controls | Full 12-case import mutant; two real publishing entry probes | runner 0; children 1 / 0 / 1 | `final-controls-summary.json`: `5b0f97d1b5473ff7dea526017653ec86bb96d3f3fbfcac6748d36a426205303c` | Import 11 pass / 1 intended ERR_ASSERTION; correct entry 1 / probe 0 / no writes; wrong-order entry 1 / probe 1 / only two mtimes. |
| Page browser CI 818 | GitHub Page workflow 42981045289 | success | `ci818-page.json`: `2ced03eb1b3a0bc6a931663192688d37a8ae3040a1f177b7e31e04e68762b943` | Exact 818 terminal observation; not local gate or control evidence. |
| Card/Grow browser CI 818 | GitHub Card workflow 42981048495 | success | `ci818-card.json`: `599d52a1474f0085f1072158951c57f4d6d44cbccc304e0c884711cc42707df5` | Exact 818 terminal observation; not local gate or control evidence. |

Counts come from the structured case reporters and pinned reconciliation,
with all parameterized occurrences retained. The final counts are Node 150,
Counting 56, Plain 4,522 passes/one planned skip and Native 1,128 passes/two
planned skips. The 111 UNKNOWN wrapper observations are not passing cases.
The control child cases stay outside the gate's 5,859 obligations.

The gate driver's monotonic clock measured 895.522511666 seconds. The outer
launcher measured 895.802576875 seconds, including its guards and passive
observer. The corrected controls measured 32.032687792 seconds inside and
32.221732375 seconds outside. Per-command user/system values are separate
measurements; their sum is not pipeline wall time. RSS is a sampled
single-process observation by PID/start and kind, not heap, an aggregate
or a true peak. Missing maxima remain UNKNOWN. CI times come from saved
GitHub job and step timestamps.

## Open limits

Request `f682cbc46d28df9029418272616bf0f4ead29dc7` still owns review,
landing and planner deployment. This evidence supplies no deployment or
live-room acceptance. The reviewer must verify the final filing manifest
and actual source correspondence before approving the head.

The review records source/test correspondence against checkpoint tree
`ab69e56f6e9ca2480e1ae83104c2882f99e2cc4d` under
`docs/evidence-filing.md`'s documentation follow-up rule. Review also requires
Page and Card workflows at the exact reviewed head. The saved 818 runs
remain checkpoint observations. External review attachments pin the actual
follow-up head and workflow results; the committed manifest stays unchanged.

The maintained selector omitted six Scale obligations because this source
stays outside their paths. `.github/workflows/scale-tests.yml` retains its
unchanged `node --import tsx scripts/check-definition-pins.mjs` step. Its
automatic main run follows landing. The G request keeps that qualification;
no extra Scale dispatch or local Scale acceptance follows from this unit.
