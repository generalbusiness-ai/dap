# GS-1: lighter records and selected Native scale cases

GS-1 request `b29bd21ebda5346fd5e673cad8471b6e1cc0ec74` and promise
`f3d79f874bd82a5b6d0b3d106912e8048bf1c16d` cover this head. This
source checkpoint implements Parts A and B and the Part C case selection.
All development checks and after-change timing remain unrun.

The branch `builder/gs1-short-gate-20261114` starts from repaired combined
head `1c80cef3c7749f1c6220fbdc77ed85491b4c6502` as a local, unlanded
dependency. Main remains `189cf7b64a1501b307b9c73e96ee83641c3bd2de`.
The running combined gate and its checkout receive no changes from this
branch. Integration with the actual combined main remains owed before the
GS-1 gate.

## What changed

`docs/evidence-filing.md` and `docs/testing.md` now state rulings
`f45b355a8d4f2668412c28b6d32fdf13239b70cf` and
`13ea7ab7736cf0dca64313cdaf86e171044e2ef4`: START identifies the
head, tree, and main; one gate writes one external log; END gives its exit,
wall time, stage count lines, and SHA-256. The implementation note cites
that log directly. Cited control outputs stay in the same directory and
have direct path and SHA-256 citations too.

The docs remove mandatory supervisors, source and tool inventories, cache
copies, checksum files, read-only seals, committed evidence manifests,
power conditions, sleep records, and sealed landing records. No head owes
a formal focused interval. The existing focused tool remains optional.
Historical records stand. The document-only follow-up rule, failed-run
history, retention period, and 40,960-byte implementation-note warning
remain.

`scripts/check-notes.mjs` keeps the committed-object size check and removes
the warning about a new evidence filename's extension. Its owner now
requires no extension warning while retaining the byte-limit and
operational-error cases.

`scripts/gate-test-selection.mjs` selects whether the gate runs its test
step. `scripts/gate.sh` skips `npm test` only when the committed merge-base
diff is nonempty and every changed path starts with `notes/`. The skip
prints one line. An empty diff, a `docs/` change, and a mixed change run the
test step. Every other gate step still runs.

## Decisions and bounds

The helper reads the complete base-to-head Git range. It does not inspect
only the last commit, so a final note cannot hide an earlier source change.
It disables rename detection to expose both the removed and added names.
A move from source into `notes/` therefore retains the old source path and
does not skip. NUL framing preserves spaces and newlines in names. Missing
or invalid Git input fails selection instead of skipping tests.

The gate keeps its existing citation and note-size steps before the
conditional test step. It also runs `scripts/check-notes.test.mjs` and the
new selection owner there. The note-size owner moves out of `nodeFiles`,
so a full gate does not run that owner twice. The existing citation owner
already runs before the test step. The tracked-test inventory recognizes
these explicit `node --test` invocations as gate-owned files.

The note-reader source audit distinguishes checkout data from test data:

- `scripts/check-section-citations.test.mjs` reads synthetic reference and
  dated-note strings in Maps. Its real-command case writes reference notes
  into a temporary Git fixture. It does not read the checkout's note
  content. The gate's separate `citations` step does read actual tracked
  notes, including the contract and authority references. Both that step
  and `cite-test` still run for a notes-only head.
- `scripts/check-notes.test.mjs` reads committed synthetic note blobs in
  temporary Git repositories. Its byte-limit, extension, and missing-base
  witnesses stay active through the gate's `notes-test` step. The real
  `notes` step reads the checkout's committed note objects.
- `scripts/gate-test-selection.test.mjs` uses a temporary Git repository
  with synthetic note, docs, and source paths. The gate runs its owner
  before deciding whether to skip the full test step.
- `scripts/format-json.test.mjs` lists actual tracked JSON names and tests
  the evidence-path exclusion. It does not read notes' JSON content. The
  separate format step stays active for selected tracked JSON, including
  eligible JSON under `notes/` outside the evidence directory.
- `scripts/active-source.test.mjs` explicitly excludes `notes/` from its
  source reads. `scripts/check-kernel-boundary.test.mjs` covers kernel
  sources and synthetic fixtures, not checkout notes.
- `packages/cli/test/application-new.test.ts` creates a temporary project
  named `notes`. `packages/scope/test/site-route.test.ts` reads synthetic
  `notes/a.txt`, `notes/b.md`, and `notes/index.md` from its Git fixture.
  Neither owner reads the checkout's `notes/` tree.

Other matches for `notes` in product tests are comments, field names,
declared source names, or path strings. The audit found no product test
that reads the checkout's note content. The actual link checker can read
a note's headings when an active document links to that note. Its gate
step stays active. No Native or product owner moves into the notes-only
path on the strength of a synthetic fixture name.

## Native cases in the scale tier

Ruling `50210e5ca73c0c8a875f2c4d11c878089fee3e28` adopts the
source audit `1e47c170ac6de80f0ca19adbcb81cd63b4078fbf`. The head
moves exactly the 16 cases below. It keeps the other 39 final cases from
the nine original owners ordinary, including the optional demo recorder.
Five mixed owners now share fixtures between separate ordinary and scale
registration entry points. The four sole-case owners keep their original
paths and source bytes. Scale membership moves their cases under planner
ruling `e8edea0d`. The Grow production producer and public-command
follower keep their loop-local `retainedCommand` and their relative order.
No callback, assertion, data row or deadline changes. The three lane fixtures
use the `.scope.fixture.ts` suffix and stay outside the plain Node test
type context; the ordinary and scale Native entry files both import them.

The four previous scale owners retain their six cases. The new inventory
has 13 scale owners and 22 cases. The scale runner checks each owner's
case count as well as the total, so a missing case cannot hide behind an
extra case in another file. Ordinary scope and story selection exclude the
scale owners; scale retains the original worker, setup, two-worker ceiling,
clock and provided contexts.

The ordinary counterparts below show their stated smaller rules. They do
not replace the distinct scale acceptance. The 2000-member workload,
fixed 4096-kept bound, 32 physical proof-frame limit and 1000 real
generations are not interchangeable configurable kernel limits. No new
small test or production knob was invented. The configured entry-byte
counterpart already crosses its measured bound by one byte.

| Moved case, exact title | R2 seconds | Smaller ordinary case retained | Scale-only boundary |
|---|---:|---|---|
| a real 2000-member room keeps handle uniqueness and verifies every actual scope under shipped defaults | 274.045 | `story.scope.test.ts`: “install, create by signed reads, seat and session, invite and join…” (including its duplicate-handle refusal) | The genuine 2000-member room and shipped-default whole-room verification remain scale acceptance. |
| G15 admits the maximum constructed capture, retains 32 real proofs, and refuses the next capture before storing passes | 84.119 | `destination-budget-v15.test.ts`: “G15 budgets the whole capture and all 32 future proofs, with canonical escaping and a refusal before an oversized capture” | Scripted byte arithmetic stays ordinary; all 32 authenticated Native proofs and the maximal stored capture remain scale-only. |
| native raw proof residency stays at thirty-two dense frames with one physical read | 56.486 | `partition-proof.test.ts`: “one operation shares concurrent receiver and source evidence without multiplying its total allowance”; ordinary “partition issue facts and bounded concern births…” case | Scripted small proof bounds and real single-root lineage stay ordinary; dense 32-frame residency and two-root/deep 38-call acceptance remain scale-only. |
| native full root preserves three thousand standing entries through one thousand undelivered generations | 26.967 | `directory-partition-recovery.scope.test.ts`: native root abandons only terminal routing generations | Three-generation recovery stays ordinary; real 1000-generation/3000-standing accounting remains scale-only. |
| installed Grow production public archive command verifies its native producer clone | 26.506 | `archive-installed.test.ts`: “installed fixture scopes export genesis zero after a late native membership directory binding”; historical Grow counterpart | Small actual fixture/historical packages stay ordinary; current production Grow closure and its dependent public CLI archive verification remain scale-only. |
| real published holds survive newer counted passes and clear only through distinct authorized transition and override records | 23.223 | `evidence-index-v17.test.ts`: “key rotation preserves earlier candidates…”; `evidence-holds-v17.test.ts`: “native publication and admitted-job order defeats duplicates…”; ordinary “real admitted member work reuses its actual earlier pass…” | Pure state rules and smaller actual member-source work stay ordinary; landing publication, multi-generation holds, actual TIME recovery and outcome-order serialization remain scale-only. |
| a manifest-list reservation records both files before the configured checker passes; no branch push occurs before that pass (real scopes, STAND-IN Git host and scheduler; file-publication creation) | 20.402 | `manifest-tree.scope.test.ts`: dap edit uses a one-element reservation tree; zero-source refusal/nonempty counterpart | Single-file/check and admission cases stay ordinary; two-source reservation/check/publication under both creation families remain scale-only. |
| a manifest-list reservation records both files before the configured checker passes; no branch push occurs before that pass (real scopes, STAND-IN Git host and scheduler; default creation) | 19.959 | `manifest-tree.scope.test.ts`: dap edit uses a one-element reservation tree; zero-source refusal/nonempty counterpart | Single-file/check and admission cases stay ordinary; two-source reservation/check/publication under both creation families remain scale-only. |
| the real failure and reservation outcomes serialize atomically in both admitted-before-failure and failure-before-admission schedules | 19.310 | `evidence-index-v17.test.ts`: “key rotation preserves earlier candidates…”; `evidence-holds-v17.test.ts`: “native publication and admitted-job order defeats duplicates…”; ordinary “real admitted member work reuses its actual earlier pass…” | Pure state rules and smaller actual member-source work stay ordinary; landing publication, multi-generation holds, actual TIME recovery and outcome-order serialization remain scale-only. |
| literal native TIME holds at its own head, replays unchanged, and recovers one funded incident within the pending bound | 19.201 | `evidence-index-v17.test.ts`: “key rotation preserves earlier candidates…”; `evidence-holds-v17.test.ts`: “native publication and admitted-job order defeats duplicates…”; ordinary “real admitted member work reuses its actual earlier pass…” | Pure state rules and smaller actual member-source work stay ordinary; landing publication, multi-generation holds, actual TIME recovery and outcome-order serialization remain scale-only. |
| actual landing reuse follows the tree key and a fresh passed job still publishes after disagreement disables reuse | 14.780 | `evidence-index-v17.test.ts`: “key rotation preserves earlier candidates…”; `evidence-holds-v17.test.ts`: “native publication and admitted-job order defeats duplicates…”; ordinary “real admitted member work reuses its actual earlier pass…” | Pure state rules and smaller actual member-source work stay ordinary; landing publication, multi-generation holds, actual TIME recovery and outcome-order serialization remain scale-only. |
| Native floor-kept refuses the 4097th live opening after an exact4096 kept set | 13.718 | `derive/test/floor.test.ts`: “counting charges the held tail and kept entries without renumbering the head” | The actual fixed 4096-entry Native ceiling, durable deletion and restart remain scale-only. |
| installed Grow production scopes export genesis zero after a late native membership directory binding | 13.277 | `archive-installed.test.ts`: “installed fixture scopes export genesis zero after a late native membership directory binding”; historical Grow counterpart | Small actual fixture/historical packages stay ordinary; current production Grow closure and its dependent public CLI archive verification remain scale-only. |
| the demo runner's rehearsal on real scopes. The Git host, git and the scheduler are STAND-INs > on github.com: the optional manifest sequence follows shot 16, publishes both text files together and refuses a controlled two-file branch; Git capture is a STAND-IN | 10.683 | `demo.scope.test.ts`: “on artifacts: every shot, from the planned install to the page…” and its “on github.com” counterpart | The standard rehearsal stays ordinary; all 32 shots with optional two-file manifest publication/refusal remain scale-only. |
| the demo runner's rehearsal on real scopes. The Git host, git and the scheduler are STAND-INs > on artifacts: the optional manifest sequence follows shot 16, publishes both text files together and refuses a controlled two-file branch; Git capture is a STAND-IN | 10.661 | `demo.scope.test.ts`: “on artifacts: every shot, from the planned install to the page…” and its “on github.com” counterpart | The standard rehearsal stays ordinary; all 32 shots with optional two-file manifest publication/refusal remain scale-only. |
| two native partition roots keep cross-room block and restart release with one nineteen-call admission | 10.179 | `partition-proof.test.ts`: “one operation shares concurrent receiver and source evidence without multiplying its total allowance”; ordinary “partition issue facts and bounded concern births…” case | Scripted small proof bounds and real single-root lineage stay ordinary; dense 32-frame residency and two-root/deep 38-call acceptance remain scale-only. |

Each changed protected path selects the scale tier. The following groups
sit beside the case list; the complete literal paths and owner/fixture
paths live in `scripts/scale-selection.mjs`. This selection includes the
shared SQLite, Operations and Native fixture boundaries exercised by the
moved cases. Unrelated metrics, descriptions and lock-only changes retain
the omission rule. Existing archive, floor and directory prefix rules stay.

| Case group | Protected production paths |
|---|---|
| Membership default acceptance | `packages/platform/src/base-membership.ts`, `packages/platform/src/membership.ts`, `packages/derive/src/program/guard-value.ts`, `packages/cli/src/command-verify.ts`, `packages/cli/src/verification.ts`, `packages/replay/src/verify.ts` |
| Kept floor and directory capacity | `packages/derive/src/floor*`, `packages/platform/src/directory-partitions*`, `packages/scope/src/core.ts`, `packages/scope/src/turn.ts`, `packages/scope/src/sqlite.ts`, `packages/scope/src/operations.ts` |
| Partition proof/receiver lineage | `packages/scope/src/partition-proof.ts`, `packages/scope/src/receiver-reads.ts`, `packages/scope/src/proof-bytes.ts`, `packages/scope/src/read-preparation.ts`, `packages/platform/src/partition-provenance.ts`, `packages/replay/src/verify.ts`, `packages/derive/src/judge.ts` |
| G15 capture bound | `packages/contract/src/bounds.ts`, `packages/platform/src/destination-budget-v15.ts`, `packages/platform/src/destination-v15.ts`, `packages/platform/src/destination.ts`, `packages/platform/src/rules-certificate-v15.ts`, `packages/platform/src/rules-policy-v11.ts` |
| G17 evidence/hold/timeout/ordering | `packages/platform/src/destination-evidence-v17.ts`, `packages/platform/src/evidence-index-v17.ts`, `packages/platform/src/evidence-decision-v17.ts`, `packages/platform/src/evidence-holds-v17.ts`, `packages/platform/src/destination-evidence-capacity-v17.ts`, `packages/platform/src/destination-evidence-funding-v17.ts`, `packages/platform/src/reservation-v17.ts`, `packages/platform/src/destination-v17.ts`, `packages/platform/src/evidence-incident-origin-v17.ts`, `packages/derive/src/fold.ts`, `packages/scope/src/operations.ts`, `packages/scope/src/sqlite.ts` |
| Current Grow archive closure/CLI | `packages/scope/src/archive*`, `packages/replay/src/archive.ts`, `packages/platform/src/archive-binding.ts`, `packages/platform/src/archive-replay-code.ts`, `packages/scope/src/native-birth.ts`, `apps/room/archive.ts`, `apps/room/archive-policy.ts`, `packages/cli/src/archive-remote.ts`, `packages/cli/src/clone-outcome.ts`, `packages/cli/src/command-repository.ts` |
| Manifest publication and checker | `packages/scope/src/worker.ts` (`snapshotReaderOf`), `packages/cli/src/command-change.ts`, `packages/platform/src/destination.ts`, `packages/platform/src/reservation.ts`, `packages/scope/src/object.ts`, `packages/scope/src/stage-snapshot.ts`, `packages/scope/src/destination-host.ts`, `packages/checkers/src/service.ts`, `packages/checkers/src/reservation-snapshot.ts`, `packages/checkers/src/job.ts`, `packages/scope/src/operations.ts`, `packages/scope/src/sqlite.ts` |
| Optional demo manifest | `scripts/demo/rehearse.ts`, `packages/cli/src/command-change.ts`, `packages/platform/src/destination.ts`, `packages/scope/src/artifacts-wiring.ts`, `packages/scope/src/github-wiring.ts`, `packages/scope/src/site/route.ts`, `apps/room/worker.ts` |

The production Grow archive pair does not read the deployed signed packet.
It consumes `maintainedApplications.growDemoSource`: the maintained Node
setup invokes its child, which calls `prepareGrowDemo`, then
`prepareApplicationDirectory` with the public TEST signer. The demo builder
reads the maintained Site/Room declarations and `definitions/*.json`, the
six named `check/` inputs, and `demo/simulator.json`. No browser entry is
configured in this source package. The resulting TEST packet supplies its
own release/publisher/entry trust row to the real archive policy and driver.
The earlier signed packet and current deployed release stay immutable and
are not substituted for this current-source acceptance.

Exact scale triggers include the three `maintained-applications` setup,
child and interface modules, the TEST signer fixture modules,
`examples/grow/prepare-demo.ts`, `prepare-check.ts`, `demo-definitions.ts`,
`room.ts`, `site.ts`, `definitions/room.json`, `definitions/site.json`,
`check/dap.application.json`, `check/site-scenario.json`,
`check/fault-scenario.json`, `check/index.html`, `check/grid.html`,
`check/site.html`, `demo/simulator.json`, the CLI application source reader,
and the package-v2 codec. Literal source-selection witnesses name these
consumed inputs. The selector does not expand to every Grow example,
authoring type or unrelated application package.

The Native step before this change measured **836.300133 seconds** in the
retained R2 Grow gate. Its log prints `native: passed; wall 836300.13 ms`.
The after-change Native wall time is **UNRUN** until the GS-1 gate. The
643.516-second sum of individual slow-case observations is not a saving
or a forecast: cases can overlap. The note will compare two actual gate
logs, not subtract concurrent case durations.

Source movement changes no protected production function or model
correspondence. The Effects model covers only its named dispatch functions
and `markSent`; it does not prove the evidence ledger, dense proof
residency, whole-room CLI verification or provider behavior. No model ran.

## Evidence and remaining checks

This checkpoint is source-only. No syntax, compiler, test, control,
generator, build, model, or gate command ran for these changes. No package
production source changes. The changed scripts remain unchecked until the
execution slot permits their development checks. No after-change timing
result or new evidence manifest accompanies this note.

| Check | Command or boundary | Result |
|---|---|---|
| Selection owner | `node --test scripts/gate-test-selection.test.mjs` | UNRUN |
| Note-size owner | `node --test scripts/check-notes.test.mjs` | UNRUN |
| Existing gate owners | Whole test-runner and tracked-selection owners after integration | UNRUN |
| Selection control | One named control must turn the notes-only decision into an incorrect skip for a docs or mixed change and fail the existing selection assertion | UNRUN |
| Case selection and accounting | `node --test scripts/scale-selection.test.mjs scripts/test-phases.test.mjs` | UNRUN |
| Native fixture type contexts | Scope test, CLI scope and lane scope/test contexts | UNRUN |
| Part C | Exact 16-case movement, protected-path selection, ordinary/scale inventory and per-owner accounting | Source drafted; checks UNRUN |
| Native baseline | R2 Grow gate log `/Users/hughpyle/play/artroom-evidence/2026-11-14-r2-grow-gate-attempt1/00-full-gate/stdout.log`, SHA-256 `147ff2effb1553e6edf6ba05d7ca16d5c7c944b083afca509bb7d433f88a3fa2` | Native wall 836.300133 s; after UNRUN |
| Full gate | One `npm run gate` after integration with landed combined main and settled GS-1 scope | UNRUN |
| Review | Architecture, Security, Simplification, and exact-head source and evidence correspondence | UNRUN |

## Open limits

GS-1 owns the remaining development checks, control, Part C disposition,
gate, and review. The request permits splitting Part C if its audit holds
Parts A and B for more than one hour. Part C changes tier membership and
selection only. It changes no deadline, worker count or runtime assertion.
It claims no faster gate or after-change Native wall time.

The notes-only optimization skips only `npm test`. It does not skip
dependency verification, whitespace, commit checks, citation checks, note
checks, formatting, typechecking, or definition pins. A failure in one of
those steps still stops the gate. The unchanged finalizer can report test
stages as unreached when the test step intentionally skips; the explicit
skip line states why.
