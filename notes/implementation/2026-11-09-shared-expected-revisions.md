# Share the expected-revision derivation

Request `b9f85b9a`, promise `eb5df2be`. This is head A of coverage report
`b8b6248d`, under DX-T0 `6f87a4e3`. Source preparation starts from main
`86179b0c`. Placement `176190ba` permits source work beside R3a's gate.

## What changed

`packages/client/src/expected.ts` now owns the expected-revision
derivation that MCP's `shape.ts` held. It resolves the target and the
`one`, `by` and chained `via` subjects over the items the caller holds.
It omits subjects that code selects and subjects the supplied items do
not resolve. The scope still checks every signed revision at its own head.

The same module owns `viaLeft` and their private subject resolver. MCP
forwards both public functions. CLI browser helpers forward `expectedOf`.
The client package exports the two functions through its existing entry.
The module imports only contract types and adds no dependency.

The Counter browser model calls `expectedOf`. Its existing missing-target
and missing-subject messages now inspect the returned keys. They do not
resolve the same subjects again. Existing Counter, CLI and MCP test
assertions remain unchanged.

The new client owner covers subject resolution, cycles, omitted code and
missing subjects, lawful prototype-like aliases, inherited fields, and
the shared resolution used by `viaLeft`. Its fixtures are plain item
records. They prove no read, signature, authority or Native outcome.

The committed Page asset module now contains the current shared helper.
The unchanged Page build regenerated that production output after the
first full gate detected stale bytes. No Page test or source assertion
changed. The new asset still needs a full gate and a Page browser
workflow run at the branch head.

## Decisions and why

The portable module keeps MCP's own-property checks and enumerable own
output fields. A lawful alias such as `__proto__` remains in the expected
map and in its serialized form. A missing alias or input field does not
take a value from its prototype.

MCP still owns `effectiveFields`, which applies defaults and turns a
local fact into its position before resolving subjects. A fact from
another scope or incarnation stays a fact. This head changes neither
that normalization boundary nor the fields a caller signs.

`viaLeft` moves with `expectedOf` because both use the same resolver.
Keeping one in MCP would leave two implementations of subject selection.
The shared module remains a convenience over supplied records. It reads
no server, checks no grant and writes no signed input.

The following explicit revision maps stay, for these reasons. Each row
names every remaining site in the requested file or scenario.

| Site | Reason to keep it explicit |
|---|---|
| `examples/lending/browser/model.ts`, `expectedLibrary` used by `donate` and the ordinary item acts | The projection supplies captured library and item revisions, including historical gone items, rather than a complete summary for generic subject reads. |
| `examples/lending/browser/model.ts`, `publish` expected map | Publishing a gone thing keeps its captured historical revision even after the thing leaves the live summary. |
| `examples/lending/browser/model.ts`, final return for `borrow`, `return` and `cancel` | These proposals preserve the captured item and library revisions from the displayed projection until the typed-model head replaces the proposal model. |
| `examples/lending/test-support.ts`, `donation` | This fixture states the Lending opening's exact library dependency independently of the convenience derivation. |
| `examples/lending/test-support.ts`, `over` | This fixture states the target and library revision keys that the real judge must require. |
| `examples/grow/test-support.ts`, `on` | This target-only fixture helper has no act kind and intentionally leaves any additional subject revisions to the scenario. |
| `apps/counter/scenarios/application.json`, every `$revision` | The scenario authors the expected subject keys and resolves their current revisions from the fold. |
| `examples/lending/scenarios/application.json`, every `$revision` | The scenario independently states each expected dependency, including the historical publication target. |
| `examples/grow/check/fault-scenario.json`, every `$revision` | The scenario names each device and zone dependency explicitly so a missing expected subject remains observable. |
| `examples/grow/check/site-scenario.json`, every `$revision` | The scenario keeps its authored expected subject keys through creation and room-state transitions. |
| `packages/mcp/test/support/grow-owned-fault-scenario.json`, every `$revision` | This owned-room fixture retains its authored expected subject coverage rather than deriving it from the code under test. |
| `skills/dap-application/assets/starter/scenarios/basic.json`, every `$revision` | The starter demonstrates the retained scenario format whose expected subject keys the author supplies. |

These are captured-view inputs or explicit fixture maps. None retains a
second generic `one`, `by` or `via` algorithm. The scenario resolver and
all six JSON files remain unchanged. DX-T0's typed-model head and DX-T4's
story builder retain their separate obligations.

The MCP catalogue implementation, description derivations, Lending
definition, pins and `docs/mcp-tools.json` remain unchanged. The focused continuation compared exact
baseline and candidate catalogue and document bytes. This head accepts no
regenerated output that differs.

## Final evidence

The first focused run used source `061bca1a`, tree
`01c4ac29ebbe8b0f911efcdb0528f7959ef1e974`. Its actual launcher, driver
and pipeline exits were 1. The complete security owner passed all 12
Node cases. All 26 declared compiler contexts returned 0. The plain
body returned 1 after one passed case, one failed case and ten unrun
cases. Counting and the catalogue captures did not run in that attempt.

The failed client case constructed its input with `Object.assign`.
That operation invoked an inherited `__proto__` setter and removed the
own alias the test intended to supply. Commit `2fc5f712` changed the
fixture to `Object.create` with own property descriptors and added an
own-alias precondition. Every previous assertion, title and case count
remains. The correction changes no production source or source seal.

The targeted continuation used source
`2fc5f712644bf23e4192ed4fb53f792912f9a056`, tree
`a21ff20a669dea169e3ec946748e21c7ad81d190`. Its actual launcher, driver,
pipeline, Counting and two catalogue-capture exits were all 0. It ran
only the affected client test compiler, the same four complete plain
owners with 12 cases, the maintained four-owner Counting runner with
56 cases, and the two catalogue captures. It did not repeat the passed
Node owner or the unaffected compiler contexts.

The complete static project, file, pool and title ledger reconciles with
the same-run public reporter and built-in JSON. All 12 plain cases passed
once. Counting's actual 56 terminal test events reconcile with the four
source mappings and its complete static ledger. Every retained phase
receipt reports unchanged source and no remaining owned process. The
metadata sealer separately checked current source hashes and process
closure before the note changed.

Commit `061bca1a` records the maintained parser's changed CLI helper seal
and the new whole `packages/client/src/expected.ts` seal. The new owner
protects the derivation that moved from the CLI helper. All route and
gate assertions remain.

The catalogue capture used the actual pinned Lending definition and
production catalogue derivations over identical explicit in-memory
inventories. Scope identities, Membership standing and its key were
stand-ins. The capture proves no live or Native authority outcome.
The complete `inventory.test.ts` owner separately checked the retained
MCP tool document against its derivation.

The baseline and candidate Lending catalogues each contain 298,441 bytes
with SHA-256
`7f4bd447c30a078dd68ce1f2ed57decdf3652ccbb1caf9efacd950bc0969f468`.
The retained `docs/mcp-tools.json` bytes each contain 262,660 bytes with
SHA-256
`4e18d71826d10cd3d8ab64f507ee59e5a69dc740185348988143488098659b64`.
The run forbade `MCP_WRITE_DOCS` before any test. It rewrote neither output.

The launchers measured the first attempt at 26.005 seconds elapsed and
62.503 seconds of CPU, and the continuation at 10.657 seconds elapsed
and 14.751 seconds of CPU. Each measurement includes its outer guards
and waited children. The figures describe two attempts, not one run or
summed case times. Both runs used owned APFS dependency copies of the
unchanged lock on this Mac. The continuation retained the first run's
caches. The slot guard found no competing validation body before launch.

Run commands:

	python3 /private/tmp/artroom-t0a-focused-launch-20261109.py
	python3 /private/tmp/artroom-t0a-continuation-20261109-launch.py

The public evidence manifest is
[evidence/2026-11-09-t0a-focused.manifest.json](evidence/2026-11-09-t0a-focused.manifest.json).
The focused check rows below cite its curated `reconciliation.json`, SHA-256
`d28aab46a0eef0b38e2f1fcfbcc27702f76bdfb7adb0ac80202c9ac92a30004d`.
The manifest also retains `raw-inputs.json`, which names and hashes all
raw inputs used to reconcile the two attempts. Temporary generated
fixtures stay private in their original raw directories. The public unit
copies no signing key, temporary fixture or raw comparison payload.
Those focused raw units and their curated unit have `SHA256SUMS` and
read-only permissions after their final metadata writes.

| Check | Command or boundary | Exit | Output |
|---|---|---|---|
| Initial security owner | `scripts/security-entry-points.test.mjs`, 12 Node cases at `061bca1a` | 0 | `reconciliation.json`, initial retained Node result |
| Initial compiler closure | All 26 frozen compiler contexts at `061bca1a` | All 0 | `reconciliation.json`, initial compiler rows |
| Initial plain body | Four complete owners, 12 obligations at `061bca1a` | 1. One passed, one failed, ten unrun | `reconciliation.json`, initial case ledger |
| Fixture compiler and complete plain owners | Client test compiler, then all four owners at `2fc5f712` | 0. All 12 cases passed once | `reconciliation.json`, continuation compiler and case rows |
| Counter proposal and browser behavior | Unchanged `apps/counter/scripts/test-browser.mjs` at `2fc5f712` | 0. All 56 cases passed | `reconciliation.json`, Counting source and case rows |
| Lending catalogue and MCP tool-document bytes | Exact baseline `86179b0c` and candidate `2fc5f712` outputs | Both captures 0. Bytes identical | `reconciliation.json`, byte comparison |
| First full gate | `npm run gate` at `a7af51bb` | 1. Node 144 and Counting 56 passed. Plain had 4,030 passed, one failed and one skipped. Native did not run | `failed-gate-reconciliation.json`, SHA-256 `9726d079d93802f99b298ecedac9e0ae567000e14baa48d8f1b8671a4c352840` |
| Production Page asset repair | `npm run build --workspace @generalbusiness/dap-page` at `6a5d6ace` | Build 0. Original wrapper 2. Separate metadata audit 0 | `build-reconciliation.json`, SHA-256 `306ff7aaa72fc7c742655d6373eb3f026030538bad9b0acf2c8ac071fb89d531` |
| Second full gate | `npm run gate` at the committed repaired source | Not run | Pending |
| Page browser workflow | `.github/workflows/page-browser.yml` at the branch's own head | Not run | Pending |

The first full gate remains failed. Its sole failure was
`apps/room/page/test/assets.test.ts`. The stored module contained
2,371,545 bytes with SHA-256
`e3e922c73aeb33214d5af1e0ea7d26f851021aab86fd1b89f14f5fca40d0af02`.
The unchanged asset owner derived 2,372,067 bytes with SHA-256
`6e81a5fde77a68f1e58b06a6034b387ad9e067f99813e137e038b1578ef54461`.
All 1,128 planned Native obligations stayed unreached. The audit retains
all reached public case identities and all 105 wrapper observations.
Those wrappers remain unknown and never become case passes.

After B landed on main `f3ddcc06`, ordinary merge `6a5d6ace` brought it
into A. One maintained Page build then ran at that source, tree
`ee3a32bc43424f620e683a9f48eb7ae58fb90673`. It regenerated
`apps/room/page/assets.ts` and the four declared files under
`apps/room/page/dist`. Its generated module output matches the
failed owner's derived byte count and SHA-256 above. That equality
does not retroactively pass the failed gate.

The build returned 0. Its original wrapper returned 2 because the
wrapper's `strip()` removed the leading porcelain status space before
it sliced the path. It misread `apps/room/page/assets.ts` as
`pps/room/page/assets.ts`. A separate metadata-only follow-up parsed
raw `--porcelain=v1 -z` records with their XY columns and NUL boundaries
intact. The follow-up changed no source and repeated no build.

The follow-up verified all 4,454 other tracked inputs, the exact four
new dist leaves, the build checkpoint and tree, the lock and dependency
stamp, and the five recorded Node, npm and esbuild tool files. It also
confirmed that owned process group 85397 had closed. The original
build exit 0 and wrapper exit 2 remain intact in their original unit.
This is a production asset repair, so it requires a second full gate.
No isolated-test exception applies.

The repair evidence manifest is
[evidence/2026-11-09-t0a-asset-repair.manifest.json](evidence/2026-11-09-t0a-asset-repair.manifest.json).
Its separate unit is read-only and contains only curated failure,
output and custody metadata. It binds the original raw inputs by hash
and copies no raw payload, generated fixture or signing key. The audit
left both original raw units untouched.

The Vitest owners retain the repository's thread pools and four-worker
limit. MCP retains its 60-second case deadline. The other selected owners
retain their package defaults. Counting retains its 30-second case
deadline and 120-second process deadline. No run adds a retry or changes
a deadline. These plain fixtures prove no Native authority or live
acceptance.

## Open limits

Request `b9f85b9a` owns the second full gate, the Page browser workflow
citation and this head's landing. The current source includes main
`f3ddcc06` through merge `6a5d6ace`. The second gate must freeze the
actual repaired commit, compiler closure, case ledger and maintained
scale decision. The first gate's A-only counts do not describe this
B-merged candidate. The Page workflow must run at this branch's own
head because `apps/room/page/assets.ts` matches its trigger paths.
No package installation in the checkout is needed.

Request `260991d8` owns the shared descriptions and starts from this
head's frozen source only after its review request. The DX-T0 parent
`6f87a4e3` stays open for that head and the later typed browser models.
The failed gate and the rebuilt output make no final-gate, deployment
or live acceptance claim.
