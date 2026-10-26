# Two workers for the Scope test project

Request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:50695e48bce9673efd1864fec5d264ffa28e384a.

## What changed

The `scope` project allows two workers and keeps `isolate: false`.
Each worker reuses its own runtime across files. The accepted isolation
moves the existing Lending file into a separate ordered `scope-lending`
project with one worker and its own runtime, followed by `scope-denial`
with one worker in another runtime. The root file-task limit remains four.
Every witness is selected once. Expected assertions, deadlines and
production source are unchanged. Planner disposition
`29be96629213ba13f3acff8c9dec58f47a641926` accepted this bounded change at
`bd9d4dec5f79008c803a8eae506403430169aedb`. Its owning checks passed once
after the BR10 gate closed. A new exact-head ordinary gate remains pending;
the owning pass does not establish mixed-project stability.

Question `72a1266e` was superseded. Its replacement `0db80e82` was answered
and retired after the decision. Work continues under the original request
and promise, without using a retired question or answer as its basis.

The initial source preparation used Main `9daa037e`. R7 has since landed
on Main `6852f78d`; BR-3's three preparation commits were rebased onto that
head without conflicts. The two-worker change was source preparation at
those checkpoints, before the owner's serialized runtime validation.
No speedup is claimed.

The latest recut includes the R7 documentation follow-up on Main
`d36773b337299d8ed6fac103dff6b94954e0321a`. That upstream delta changes
only R7's note and a manifest. Source, tests and lock are unchanged from
`6852f78d`; the existing dependency view and `645224…` stamp remain in place.
No compiler or check was repeated. All evidence checkpoints below retain
their original identities.

The first two-worker gate at `eceeb5e9` failed the Lending story's second
current-read assertion. The owner retains that failed gate separately.
A later diagnostic-only isolated run passed without exposing the masked
cause. Neither outcome establishes that cause.

Gate V2 at `cbb08aff65dfbf68008bf27b979b4e4a989ffd38`, tree
`640f42b1a863700b44c891816ced233e0edbc0ca`, also closed with exit one.
Its Lending case failed the first current-read assertion after 678 ms,
again with the masked no-query-reply reason. Its whole command took
852.986 seconds and 1,810.542 child CPU seconds; its maintained native
phase took 736.957 seconds with 779 passed, one failed and two skipped.
Both failed gates remain failed. The deterministic fixture-coherence
control below demonstrated that fixture gap; it did not establish or
repair the recurrent masked mixed-project failure.
BR4 request `15b0f8ab` owns that unknown cross-file cause, retaining the
original failure at the second-look assertion's line 237.

The historical Lending projection stand-in now collects at most two complete
attempts. It restarts once only when independently validated sources name
different native heads. The existing story deterministically crosses an
accepted return act between the first materialized item response and history.
The original act, drain, returned-item expectation, current requirements,
second look, action assertions, post counts and deadlines remain.

## Decisions and why

Two workers are the smallest change that permits files to run in parallel.
The pinned Cloudflare pool creates a Miniflare instance for each pool
worker. The archive fixture's module-local clock and owner remain within
that worker's runtime. No clock, fixture lifetime or cleanup assertion changes.

The project-wide setup remains shared. The clone server allocates an
ephemeral listener and nonce per setup. Only `runtime-versions.test.ts`
configures its singleton repository. Archive clone calls allocate unique
temporary directories, and archive command sessions have random IDs and
separate session records. Teardown runs after the project. The maintained
application setup captures immutable packet data once and provides copies
to the workers. Source inspection found no concrete setup change to make
before runtime validation.

The root project comments and testing guide now describe two Scope workers
and the accepted ordered single Lending and denial workers. No packages
were installed for this preparation. The initial worktree had no `node_modules`; the Node witness
below needs no external dependency. The later compiler used a separate copy
of R7's existing dependency installation, as recorded below.

The Lending helper serves only the main browser and visitor reads in the
existing Lending file. Each original item and journal source first passes
the unchanged strict projector independently, with its native head untouched.
That checks query binding, successful complete items, declared fields, and
the journal's bytes, chain and final hash. Only then does the collector
compare every source's complete `{seq, hash}` to history. A malformed,
refused, incomplete, binding or transport failure propagates immediately.
No error catch selects a restart: even a journal-tail `stale` refusal stays
a refusal. After the one permitted restart, the unchanged aggregate
projector decides the result or keeps its refusal.

The one-shot fetch interleave sets its flag before awaiting the story's
original passer-by return and original dispatch drain. The return is an
accepted native write, so history follows a head newer than the retained
first response. The route constructs that response from the native owner's
already serialized envelope. This uses no sleep, extra act or unjoined gate.
The returned-item expectation moves after the first successful look; the
same expected state follows the same write. The first current requirement
now uses `expect.fail` so its failure is an assertion in the paired control.
The earlier bounded diagnostic observer remains diagnostic-only.

The Lending config has its own Cloudflare pool plugin, the same
test Worker and Wrangler bindings, one exact file selection, `isolate: false`,
one worker and the existing 30-second framework allowance. It starts no
clone server or maintained-package capture: the Lending story consumes
neither setup's injected data. The remaining Scope project keeps both
setup owners. The root and package entrypoints both order Scope, Lending
and denial as groups one, two and three. The existing partition witness
now expects fourteen plain and three native projects, seventeen in total.

The summary's project inventory and native phase classification both include
Lending. Its existing terminal-reporting witness now requires all three
native projects to be observed only with a successful native terminal;
without that terminal all remain partial. Both whole owning Node files
passed at the accepted checkpoint. The first-look assertion message also includes only the
already bounded safe projection-error labels, as the second-look message
already did. It adds no observer, read, retry or story act.

This change bounds Worker reuse around the repeatedly failing story.
It claims neither a proven cause nor physical draining of earlier runtimes.
The actual ordinary gate must decide whether this boundary holds across
the full inventory. If it reports another shared-state failure, stop and
seek a planner disposition rather than repair again within BR3.

## Evidence

The initial checks ran at `da2cf7737f30c0918c7e6e6200b866166a9d7a2c`, tree
`3ed91174f2b826039bc04b22b1c09ac02fd5f6d2`. The
[evidence manifest](evidence/2026-10-26-br3-source-preparation.manifest.json)
names the read-only output directory and its `SHA256SUMS`.

The dependency copy and Scope test compiler ran at
`f6fb666c6b175ccf45253d3c53ffddfd6101bcba`, tree
`1a97efff5b47b5be8a2b1f4fc05001ec26e95833`. Production source, test source
and configuration are unchanged between these checkpoints. The
[compiler and dependency manifest](evidence/2026-10-26-br3-scope-test-compiler.manifest.json)
indexes the copy proof, exact driver and compiler output. Its directory is
read-only with a top-level `SHA256SUMS`. Its original follow-up changed
only documentation. The later R7 rebase incorporates upstream source and
test changes; that compiler result remains historical and is not relabelled
as validation of the rebased head.

The rebase and dependency comparison ran at
`2017e679338ad516592b5ee9e6798fea70e6c6ef`, tree
`68e301ef712bfffb18b24f357a88eb4e543a3fd6`. The
[rebase manifest](evidence/2026-10-26-br3-r7-rebase.manifest.json)
names its small read-only evidence directory and checksum index. Only this
note and the new manifest change after that checkpoint.

| Check | Command | Exit | Output SHA-256 | Checkpoint |
| --- | --- | --- | --- | --- |
| Canonical phase selection | `node --test scripts/test-phases.test.mjs` | 0; one case passed | `87b7db670166cf0df4d0ac1eac4cc637705ac1b5a00e5ec0675cdb250c84d980` | `da2cf773` |
| Source whitespace | `git diff --check 9daa037e1976fa0e245192823cce96fc8741360d HEAD` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `da2cf773` |
| Private dependency copy and lock comparison | `python3 /private/tmp/artroom-br3-copy-deps-20261026.py` | 0; 14 workspace links rebound | `ab3fd2f36f49ec505c740350828785c120f7e8a9cc34ad2def9969c96d590258` (`compiler/dependency-provenance.json`) | `f6fb666c` |
| Scope test compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`compiler/compiler.log`) | `f6fb666c` |
| Real worktree dependency directory | Python `os.rename` of the private directory, followed by directory identity, stamp and 14 workspace-link checks | 0 | `65ff21c6869cab2bbede53632203e208f17762e1bd2e87714077a0d7e462d07b` (`dependency-materialization.json`) | `f6fb666c` |
| Rebase and dependency comparison | `git rebase 6852f78d3279ef13a33b7b9d0b283e9ba96f079f`, then `python3 /private/tmp/artroom-br3-rebase-proof-20261026.py` | 0; no conflicts, one exact lock edge, 14 links checked | `f632734cc7284969e8b35b7fab42ef6678047f2b975bd609f8270bf26dfdd914` (`rebase-and-dependencies.json`) | `2017e679` |
| Preparation patch comparison | `git range-diff 9daa037e1976fa0e245192823cce96fc8741360d..0ae2618738414c8fd705dad5e9b28e8aff59cd95 6852f78d3279ef13a33b7b9d0b283e9ba96f079f..2017e679338ad516592b5ee9e6798fea70e6c6ef` | 0; all three patches unchanged | `e00f80a28d580163d5c3a68f447a29381738c3d3a0329057591fd40826167358` (`range-diff.log`) | `2017e679` |
| Scope test compiler after fixture repair | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`compiler.log`) | `e29acab4` |
| Whole Lending file paired control | `node scripts/control.mjs packages/scope/test/support/legacy-lending-projection.ts '<restart guard>' '<guard disabled>' --expect 'the lending library on real scopes' -- . --config vitest.native.config.ts --project scope packages/scope/test/lending.test.ts --reporter=/private/tmp/artroom-br3-control-progress-20261026.mjs` (exact replacement and argv in `result.json`) | 0; distinguishes, healthy 1 passed, fault 1 assertion failed | `306484fb618a2f5a77d75ecd20a150a754517779946b2491e550b3740f858cfe` (`control.log`) | `e29acab4` |
| Initial ordinary gate | `npm run gate` | 1; 887.092 seconds whole wall, 1,877.359 child CPU seconds; native 761.231 seconds, 779 passed, 1 failed, 2 skipped | `964f17354d3df14a80900e4448a50a690f6bd5536d0c6bd2e3371880415047fb` (`gate-v1/result.json`) | `eceeb5e9` |
| Ordinary gate V2 after fixture repair | `npm run gate` | 1; 852.986 seconds whole wall, 1,810.542 child CPU seconds; native 736.957 seconds, 779 passed, 1 failed, 2 skipped | `53b2d7c4c7ff0ea1599fd66ce1206ce6d3fb02f6371b8efe3cb4b081067aaa25` (`gate-v2/result.json`) | `cbb08aff` |
| Whole owning Node files after isolation | `/opt/homebrew/bin/node --test scripts/test-phases.test.mjs scripts/test-summary.test.mjs` | 0; 4 passed | `f3de338a445fb7f75d36f42c64400b109a576688441b200e42bd645bd75325dc` (`node-owning.log`) | `bd9d4dec` |
| Scope test compiler after isolation | `/opt/homebrew/bin/node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`compiler.log`) | `bd9d4dec` |
| Whole dedicated Lending project | `/opt/homebrew/bin/node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope-lending` | 0; 1 passed, 3,925 ms case; 6.988 seconds command wall, 7.989 child CPU seconds | `05508da3ee11cf19a36e2aa83edc2fb53c775fa71725b9edbd1368f74c9f98c5` (`lending.log`) | `bd9d4dec` |
| Final ordinary gate and measurement | `npm run gate` once on the settled head | Pending | Not run | Settled head after this documentation follow-up |

The repair compiler and one maintained paired control ran at
`e29acab45e6eb113af89e8b084b0650c8c038a62`, tree
`4aeb67935d527d8098a4f6ae129ed6435bfb0cf6`. The
[coherence control manifest](evidence/2026-10-26-br3-lending-coherence-control.manifest.json)
indexes the read-only output, checksum index, original/fault source digests,
machine, load and command timings. The compiler exited zero. The unchanged
whole story passed once; disabling only the head-restart guard made its
first current requirement fail by `AssertionError` at line 260 with status
`behind`. Both runs reported one ready/result/final callback and zero
unhandled errors. The helper was restored byte-for-byte and the checkpoint
remained clean. An external reporter adapter only selects separate output
paths and delegates the maintained reporter's actual callbacks unchanged.
The maintained control hides healthy-run stdout; the healthy callbacks,
timing records and helper's passing-count summary are retained. No missing
callback or stdout is reconstructed. The immediate follow-up at `cbb08aff`
changed only the note and manifest. The current isolation proposal changes
configuration, its existing reporting/partition witnesses and the bounded
first-look message; the historical control is not relabelled as validation
of those later inputs.

The isolation owning checks ran at
`bd9d4dec5f79008c803a8eae506403430169aedb`, tree
`1703484866f0dfbe5aaf2d159cdb6d133b816b86`. The
[interim owning manifest](evidence/2026-10-26-br3-lending-isolation-owning.manifest.json)
is the exact manifest emitted by the single authorized driver run; its
SHA-256 is `d8736d801142a320e106ee0aa52ea70cdf6a903c2ab1e2b6e5abfbaf21261deb`.
It indexes nine read-only home files with a top-level `SHA256SUMS`, including
the exact driver, preflight, actual command results and native callbacks.
Preflight checked the exact clean head/tree, real owned dependency directory,
unchanged `645224…` lock/stamp, all fourteen BR3 workspace links and the
closed successful BR10 result before root released serialized execution.
The two Node files, compiler and dedicated project each ran once, in that
order. All passed and the head/tree stayed clean and unchanged. No healthy/fault
control, full native phase, installation or ordinary gate was repeated.
Only this note and the copied interim manifest change after that checkpoint.

The owner retains the closed gate outputs under
`~/play/artroom-evidence/2026-10-26-br3-two-workers-gate` and
`~/play/artroom-evidence/2026-10-26-br3-two-workers-gate-v2`.
The table's gate result digests name those actual files; final consolidation
will index both separately. The initial gate checkpoint is
`eceeb5e92125a48e699b799750a6fb4e64e9593b`, tree
`4d3578dfeed0ef1ade7573af6f8a03e250b04d41`. Native wall comes from the
canonical maintained stage ledger, never a sum of concurrent case times.
Native CPU remains unknown; whole-gate CPU cannot be assigned to that phase.

The phase-selection witness does not resolve inherited Worker configs or
prove that two native runtimes execute concurrently. It preserves the
canonical split and the ordered separate denial project. No native suite,
measurement or gate ran in this preparation.

The source installation's earned stamp matches R7 lock
`645224923cabfd70b51b8add2a43be12673444779d18002a42ed4254b3216d6e`.
After removing only R7's platform-to-git workspace dependency edge, the
parsed lock equals BR-3's lock
`f9d837e29e9e96874eb59c5eed718b1d824b98d2cc86fda615f1047011ee99cc`.
Every external package and workspace link lock entry matches separately.
The copy driver rebound all 14 workspace links to this worktree and wrote
the verified target stamp. It did not install a package or alter R7, BR-9
or Main's dependency directories. The proof does not claim independent
verification of every installed dependency byte.

The compiler passed while `node_modules` was a symlink to the separate
private copy. Afterwards, the same directory was atomically moved to real
`/private/tmp/artroom-builder-br3-workers-20261026/node_modules`, because
the Cloudflare pretest check requires an owned real directory. The move
preserved the directory's device and inode; the 14 links and target stamp
were checked again. No compiler rerun is claimed after that move.

After the R7 rebase, adding its single platform-to-git edge to the old
parsed BR-3 lock produces the new lock exactly. The new lock is
`645224923cabfd70b51b8add2a43be12673444779d18002a42ed4254b3216d6e`.
All external package and workspace link entries remain identical. All 14
workspace links still point to BR-3, which now reads R7's upstream manifests
and exports. Only after those comparisons, the existing real dependency
directory's stamp and private provenance were updated. No files were
installed or recopied, and no other dependency view changed.

The Scope and denial configs and root project declarations remain byte-for-byte
equal to their pre-rebase versions. The rebase adds no BR-3 changes beyond
the three preparation patches. No compiler or phase witness was repeated:
the eventual ordinary gate must compile the upstream R7 inputs too.

## Open limits

Request `50695e48` owns a fresh ordinary gate on the settled accepted candidate
and final evidence consolidation. Disposition `29be9662` accepted the bounded
isolation; serialized owning checks passed. The paired
control proves the deliberately interleaved fixture gap, not the original gate's masked cause
or cross-file stability. A continuously changing head can still exhaust
the two-attempt bound and refuse. The final ordinary gate is still pending.
Both earlier failed gates remain failed. BR4 request `15b0f8ab` owns the
unknown cross-file cause and the original line-237 failure record. Any new
shared-state failure in the final gate requires a planner question, with
no further BR3 repair loop.

Request `50695e48` owns the measurement, ordinary gate, exact-head review
and any repair needed when tests run on two workers. The owner must check
whether Main moved again and recheck the copied dependency view and lock
stamp before those runs.

Planner ruling `cf0328ba` accepts one instrumented ordinary `npm run gate`
as both the measurement and gate. Use its existing progress and timing
records, leave `VITEST_MAX_WORKERS` unset, and retain wall time, whole-command
child CPU, machine, load, cache state, final case states and phase spans.
No separate native measurement or `scripts/measure-tests.sh` is proposed.

Use BR9's passing ordinary gate at `f4735c54` as the before observation,
with its exact source, phase selection and outcome. Its whole command took
1,431.83 seconds; its native phase took 1,310.25 seconds. R7's
1,315.81-second native continuation at `ae49c5a6` failed two tests and is
an additional failed point, not the passing before gate.
A comparison across different code trees or uncontrolled load must state
those differences and cannot establish a controlled speedup.

The older request `7783018d` remains separate. This preparation neither
repeats its campaign nor claims to close it. Archive work retains priority.
