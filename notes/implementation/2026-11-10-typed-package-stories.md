# Type package metadata and judge every story step

Define now derives package metadata from the definition value, checks typed
views and roles, and generates scenario v1 through the maintained judges.
Lending and Counter use the typed package authoring API. The Lending story
states each expected outcome beside the step that causes it.

Request `d49269fda2dd038f47a9bdd495467a109e1fa0bf` owns this change under
builder promise `d43e33e153e295f576fc0594086d06fe02663e3d`. E landed at
`8289d9e5` before the typed views integration. The current checkpoint is
`9ff09d548af3701d3645f7ee15ac5748bc158252`, tree
`6e6c51f0c683c4603d5686413e3d0abce053e6b3`, over main `74c958d0`.

## Decisions and witnesses

The request's five conditions map to these implementations and witnesses.
The current gate includes these runtime witnesses. The two distinguishing
control observations are recorded separately below.

| Condition | Implementation and invariant | Witness |
| --- | --- | --- |
| 1. Derive package metadata | `manifest` derives entry, definitions, host profile, capabilities and scope connections. `projection` derives slot types, nullability, list bounds and defaults from `many`; states and act lists sort their names. Authors still choose displayed slots, layout, roles, assets, scenarios and browser entry. | `package.test.ts` compares Lending and Counter manifests with the retained files. `package.types.ts` rejects missing fields and uncovered grants. |
| 2. Judge stories before generation | `tell` uses `judgeGenesis`, `judgeAct`, `judgeTimed`, rule preparation and the maintained fold. It resolves `also` item IDs, checks the author's answer, and compares complete ordered entries, effects, sends and timed firings. Projection assertions read the fold. Output keeps scenario v1. | Six cases in `story.test.ts`, including retained Lending bytes and refusals for unasserted sends, founding outcomes, timed work and a judge's refusal. `story.types.ts` checks authoring inputs. |
| 3. Type views from projections | The view factory binds source fields, acts, grants, facts and template names. Conditions use E's tagged expression serializer. Runtime validation rejects forged data, extra fields, wrong field kinds and incompatible act inputs. Existing presentation schemas and property order remain. | `package.test.ts`, `package.types.ts` and `expression.types.ts` cover valid views and refusal counterparts. |
| 4. Declare roles first | `declareRoles` derives the action union used by `grant`. Act helpers retain the grant literal. The manifest type rejects an act whose grant no role holds, and runtime validation checks the same boundary. | Counter and Lending declare roles before grants. The compile-only package witness and the runtime missing-role assertion keep both checks. |
| 5. Emit additive provenance | `extend` records the compiled parent in a WeakMap. `compile.provenance` reports its digest and sorted added item, act, receive, timed and rule names. Inherited forms cannot change. Provenance never enters the definition's pinned bytes. | Two cases in `provenance.test.ts` compare canonical bytes and existing compile-result fields, then reject replacement of an inherited act. |

### Keep assertions beside their steps

A founding step or act owns every timed firing that becomes due immediately
after its write. Each step supplies its expected entries, effects and sends.
The generator does not derive an expected effect from the definition under
test. It refuses an unchecked answer or any unasserted outcome before writing
scenario data.

The timed witness starts an untimed root and opens a separate timer. This
preserves the validator's `genesis-timed` refusal. Story validation also
rejects empty slot-only assertions, invalid saved names, unsupported own
fields and a scenario that only advances time. Supported properties retain
the author's order, including a deliberate empty slot map beside a real
state assertion.

The Lending example under **Write scenarios** uses explicit public TEST
seeds and scripted grants. Membership and destination references are named
stand-ins. Story generation judges local drafts and reads their fold. It
runs no service or external destination driver.

### Preserve the type and runtime boundaries

Views and stories share one private input type mapper, including numeric
local items and nested native references. View validation closes selected
source, field and origin shapes. Row conditions reject computed parts even
when a typed variable supplies them. E's expression serializer resolves an
act context before an ordinary extra `row` property.

The act helpers retain the grant literal without changing runtime data or
the previous type-parameter order. Named acts retain their exact fields
instead of widening them through a broad field index. These constraints
let the editor reject an ungranted act or a field absent from a selected act.

F's normalization and row-name transfer run before H copies provenance.
The existing release plan, export witness and public SDK table include
`@generalbusiness/dap-define/package` and
`@generalbusiness/dap-define/story`. The runtime kernel packages do not
change. Package derivation and parameters remain empty reserved fields for
P5. H adds no second mechanism for them.

### Retain the independent bytes and pins

The package and story tests format generated data and compare it with the
independent retained files. No generator reads its output as a formatting
template. Relative to main `74c958d0`, these tracked files remain byte-exact:

- `apps/counter/dap.application.json`
- `examples/lending/dap.application.json`
- `examples/lending/scenarios/application.json`
- `apps/counter/commitments-pin.ts`
- `examples/lending/pin.ts`

The source range changes no file under the contract, bytes, derive,
platform, Git, Scope, client, replay or checkers packages. Application assets
and the existing manifest and scenario formats retain their boundaries.
The current gate passed the retained-byte witnesses. The independent files
and pins remain unchanged.

### Qualify the integrated source precisely

The main integration at `edd371c6` combined G's forms with H's grant and
provenance changes. The message repair maps that integration commit to
`b7ff57b7`. It changes two autogenerated merge subjects and the descendant
parent IDs. The repair retains authors, committers, timestamps, parent
order, all other message data and the complete 4,642-file Git tree.
The backup ref
`builder/typed-package-stories-h-before-message-fix-20261111` retains
`5f749419`.

The message repair ends at `4a9061ff` with the original tree
`55c5ba5866689d1a08a5f2003020ec1500fd598d`. Commit `9ff09d54` then formats
only `apps/counter/tsconfig.json` and `examples/lending/tsconfig.json`.
Their parsed settings, non-whitespace bytes and file modes stay equal.
Their formatting changes the tree to `6e6c51f0`. The current tree does not
equal the earlier `5f749419` tree.

CLI3 remains an actual pass at `5f749419`, END `dab2aeeb`, manifest
`ed44ee8e`. It covers one CLI test compiler and all three cases in
`application-examples.test.ts`. The Counter and Lending case calls
`checkCommand(["check", ".", "--config", config], root)` and requires
native scenario replay, three projection checks and disabled outside
effects. All earlier package, asset and replay assertions remain.
The original starter and Grow cases also ran. Code and compiler settings
correspond to the current checkpoint; the run is not relabeled as a new
head's pass, and no historical focus repeats.

The dependency refresh also retains its actual `5f749419` checkpoint.
The current gate binds the current source and rechecks 15 workspaces,
52 runtime export aliases, 17 bin links and the physical dependency copy.
It does not invent a new namespace refresh or a new CLI3 run.

### Keep the failed controller and the two red witnesses separate

The positive observations for both controls come from the actual full gate.
No positive body repeats. The first control attempt ran the complete six-case
Story owner once: five cases passed and the unasserted-send case failed at
`story.test.ts:65:6`, with actual child exit 1. Its JSON message starts
`Error: promise resolved`; the default reporter names the same assertion
`AssertionError` in stderr. The controller wrongly required a JSON
error-class prefix. It refused with exit 2 before the package control ran.
That unit remains FAILED in manifest `191c00df`, END `bdf61b52`.

Planner ruling `21579e5e` retains the Story observation through metadata only
and permits only the unreached projection mutant. The metadata classifier
exited 0 and links the same file, case name, assertion line, actual child
exit and assertion message across the two reports. It reads no error-class
prefix and changes no runner exit. The corrected external controller has
source packet `bf9f4826`, driver `863dc9ae`. The original frozen plan stays
`e72a9d2c`, and the application source stays at `9ff09d54`, tree `6e6c51f0`.

The projection continuation ran the complete five-case package owner once.
Four cases passed; the named missing-field case failed at
`package.test.ts:35:90`, with actual child exit 1. Its runner, outer driver,
launcher and external command exited 0, END `85e55551`. Source, tools and
caches stayed fixed, the mirror restored, and both cleanups closed empty
with no enforcement errors. Its sealed manifest is `6e148d74`, with actual
seal exit 0. The checker still assesses the final evidence.

Both short control runs retain raw sampler status failed: two samples, zero
sampling errors and no captured Node or workerd row. Node/workerd peaks and
lifetime bounds remain UNKNOWN. The continuation separately admitted that
absence under ruling `21579e5e`; an actual sampling error still fails the
unit. No run repeats for telemetry.

The V3 metadata freezer refused null-ID matching before a control body.
The first failed-attempt sealer later refused a duplicate `private` directory
creation before copying payloads. Its source and empty partial directory
remain. The corrected sealer used fresh output, exited 0 and preserved the
failed controller unit. Neither metadata refusal becomes an application,
gate or control failure, and neither becomes a test pass.

## Evidence

Ordinary working checks at `9ff09d54` passed before the gate under ruling
`7e5c79f2`. Five cheap checks exited 0. Resolution records cover all
45 compiler contexts and select 22 affected contexts; all 22 ordinary
compiler checks exited 0. These are unsealed working results, not another
validation unit.

The one current gate passed under booking
`593716379c26d5c2529c2c1c39ebe471fe1105cf`, END `cd268256`. The actual gate,
inner driver, outer driver, launcher and external command exits all read 0.
The pinned analysis also exited 0; its SHA-256 is `b46476d9`. It matched all
5,872 selected case identities: 5,869 passed and three planned skips.
All 45 compiler contexts and 16 typecheck scripts passed. The 111 Node
wrapper observations remain UNKNOWN. No unexpected case, reconciliation
issue, report error or failure remains.

Source and tools stayed unchanged, and both cleanup records closed empty.
All four selected Native project censuses matched. The fifth registry
project, Scale, ran zero cases; the maintained selector records its six
omitted obligations. The gate seal exited 0. Its manifest is `e8f900cd`.
The projection-only continuation is sealed separately in manifest
`6e148d74`, also with actual seal exit 0.

| Check | Command or recorded scope | Actual exit | Aggregate output and qualification |
| --- | --- | --- | --- |
| Historical H focus at `8028b8f9` | First focused compiler | 1 | `compiler00-failure-terminal-summary.json`, SHA-256 `039725951ab58ef6da8e06f10f5528f33639022708a642436b57c10fb3644e99`. No runtime pass follows. |
| Historical H focus at `92e20984` | Two compilers passed before compiler-02 failed | 1 | `compiler02-failure-terminal-summary.json`, SHA-256 `f39f327782ae28c70cdfe6d566cb9a2c35278dbdf40dde4a264c1291e4a9097d`. Compiler observations retain that head. |
| Historical H focus at `f8793260` | Compiler batch followed by a later Plain failure | 1 | `plain-failure-f879-terminal-summary.json`, SHA-256 `67f59fe2bfdbd80ff112b84efe21fe4ca5f1ac400d558cbd44e0accc665f4004`. Earlier complete authoring observations remain separate. |
| Historical focus at `4dbec9a2` | One current compiler and 67 current cases | 0 | `focus-pass-4dbec9-terminal-summary.json`, SHA-256 `e162d3fa7d31454d3ad843ea76a6a1dc26298c1d26f63609bc320e58c6bddfee`. Twelve compiler contexts and thirteen authoring cases carry from their recorded heads; these are not 80 new runtime passes. |
| CLI3 at `5f749419` | One CLI compiler and the complete three-case owner | 0 | `cli3-pass-5f749-terminal-summary.json`, SHA-256 `72216a28936bb6eafe1e8f9e209a3bffccb3936c2a5070efd8717393fd06445c`. END `dab2aeeb`; actual identities remain in the accompanying ledgers. |
| Failed static checks at `5f749419` | Whitespace, commit messages, then unreached format | 1 | `static-failure-5f749-manifest.json`, SHA-256 `cedcf21eb94c787bd73373a7dfda7b1769237abca589f1d7729734649fb295d7`. Whitespace passed; two 101-character subjects failed. Format stayed UNRUN/null. |
| Message-only repair | Two subjects; thirteen rewritten objects across fourteen commits | 0 | `message-repair-root-proof.json`, SHA-256 `a55ed3773daddff06980d0293133687459e25d39e9304ac8604a94960ba59d9e`. Backup ref retains the prior head. Complete source tree and modes stay exact. |
| Two-config formatting | Counter and Lending tsconfig formatting | 0 | `two-config-formatting-result.json`, SHA-256 `5d67ba5449ed1371b3ba3ec01549ceed96ac13a0e27310cb7e9f938e5f2a93c6`. Settings and non-whitespace bytes stay equal; the tree changes. |
| Ordinary whitespace | `git diff --check 74c958d0 HEAD` | 0 | `ordinary-working-results.json`, SHA-256 `655c3803039bab1c99bc5633342cd24d66b266a5e74650e737b57764d029c76f`. Ordinary working result; no separate validation unit. |
| Ordinary commit messages | `node scripts/check-commit-messages.mjs 74c958d0 HEAD` | 0 | `ordinary-working-results.json`, SHA-256 `655c3803039bab1c99bc5633342cd24d66b266a5e74650e737b57764d029c76f`. Ordinary working result. |
| Ordinary formatting | `npm run format:check` | 0 | `ordinary-working-results.json`, SHA-256 `655c3803039bab1c99bc5633342cd24d66b266a5e74650e737b57764d029c76f`. Ordinary working result. |
| Ordinary links | `node scripts/check-doc-links.mjs` | 0 | `ordinary-working-results.json`, SHA-256 `655c3803039bab1c99bc5633342cd24d66b266a5e74650e737b57764d029c76f`. Ordinary working result. |
| Ordinary notes | `node scripts/check-notes.mjs 74c958d0 HEAD` | 0 | `ordinary-working-results.json`, SHA-256 `655c3803039bab1c99bc5633342cd24d66b266a5e74650e737b57764d029c76f`. Ordinary working result. |
| Ordinary affected compilers | `tsc -p` for the 22 affected contexts selected from 45 resolution records | 0 for all 22 | `ordinary-compiler-results.json`, SHA-256 `a85ec6630fd8d16fda6b19bec76c7897d6c446d4bed864d1ee13c9d8a18467a5`. No working-check packet, freezer or seal. |
| Full gate at `9ff09d54` | `npm run gate` | 0 | `final-gate-summary.json`, SHA-256 `30b358325167792a6cb5f4dbb58b2e81c97752e703ee71423e0d185e43866ae1`. END `cd268256`; 5,872 accepted identities, 5,869 passes and three planned skips. Actual gate and analysis exits read 0. |
| First control attempt | Complete Story owner; package control unreached | 2 controller; 1 child | `controls-attempt1-failed-terminal-summary.json`, SHA-256 `a5b72dcf1ca9d40d9d16329f5091ecd4355628aa65220b4ed8bfe3ec48447604`. END `bdf61b52`. Story had five passes and the intended failure; package stayed UNRUN. The unit remains FAILED. |
| Retained Story classification | Read the same-invocation JSON and default reports; no child repeats | 0 metadata classification | `retained-story-classification.json`, SHA-256 `aedd5f80a3f15b8986e69fa2a009f4d06d130b426e7a9430f0a99666064116be`. Six cases, five passes and one named failure at `story.test.ts:65:6`. Original child exit 1 and controller exit 2 remain; ruling `21579e5e` authorizes retention. |
| Projection continuation | Run the unreached complete five-case package owner once | 1 child; 0 custody | `final-projection-summary.json`, SHA-256 `a0efebc5a9ad7de2b6845c26393b2d51b2a06d27db3ea44bb4e8b32afceef076`. END `85e55551`. Four passes and the named missing-field assertion at `package.test.ts:35:90`. Actual seal exited 0. |
| Metadata refusals | V3 freezer and V1 failed-attempt sealer | 1 each | `metadata-refusals-summary.json`, SHA-256 `da5041949343ae382c0af1ade604897ad8bbac0c6ee3f9989f4f2f650ccd319b`. Freezer refused before any control body; V1 sealer refused before payload copy. The corrected V2 seal exited 0 and retained that metadata failure. |

The [evidence manifest](evidence/2026-11-11-typed-package-stories-h.manifest.json)
indexes 45 public files at checkpoint `9ff09d54`, tree `6e6c51f0`, with their
absolute directory, sizes and digests. It preserves the full sealed
descriptor's file list and custody references. Detailed historical inventories
remain in that descriptor and the indexed metadata. The aggregate retains
62 private files and their private manifest outside the repository for at
least 30 days after landing.
The aggregate reuses the immutable prerequisite custody rather than copying
its raw payloads twice. Raw logs, reporter data, timing files and stdout
stay outside the repository and outside this note.

Timing follows each record's own clock. The CLI3 ledger distinguishes the
compiler command, runtime command, inner pipeline and outer elapsed time.
Their sum is not a measured pipeline duration. The gate receipt measured
890.986768542 seconds with Python's monotonic clock. Its planned all-skipped
screenshot module retains null timing; no module duration is invented.
The failed controller receipt measured 11.416367166 seconds; the projection
continuation receipt measured 17.258622625 seconds. These are separate
controller elapsed times, not test-case durations. Passive gate RSS
collection completed without errors. The short control observations remain
UNKNOWN as described above. None measures heap size, total memory or a true
peak; absent values stay UNKNOWN.

## Open limits

Request `d49269fda2dd038f47a9bdd495467a109e1fa0bf` owns exact-head checker
review and landing. The gate and two control
observations come from their own actual exits and retained reports.
Historical focused observations remain at their original heads, and the
failed controller remains separate from the retained Story classification
and the projection continuation.

The review records source and test correspondence with checkpoint tree
`6e6c51f0c683c4603d5686413e3d0abce053e6b3` under
`docs/evidence-filing.md`'s documentation follow-up rule. The same request
requires Page and Card workflows at the exact reviewed head. External review
attachments record that head, the run IDs and outcomes. They do not require
another note commit or rewrite of a committed evidence manifest.

P5 retains package parameters and package derivation, as the request
requires. H leaves those fields reserved and adds no alternate mechanism.
The unchanged kernel and retained definition pins remain required boundaries.
Planner deployment and any live acceptance remain separate from local
validation and this source draft.
