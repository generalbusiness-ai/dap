# Two workers for the Scope test project

Request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:50695e48bce9673efd1864fec5d264ffa28e384a.

## What changed

The `scope` project allows two workers and keeps `isolate: false`.
Each worker reuses its own runtime across files. The separate
`scope-denial` project still runs after it, with one worker and its own
runtime. The root file-task limit remains four. Test selections,
assertions, deadlines and production source are unchanged.

The initial source preparation used Main `9daa037e`. R7 has since landed
on Main `6852f78d`; BR-3's three preparation commits were rebased onto that
head without conflicts. The two-worker change remains source preparation.
The owner still holds its runtime measurement and ordinary gate until the
current BR-9 gate finishes. No speedup or passing runtime result is claimed.

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
and the separate single denial worker. No packages were installed for this
preparation. The initial worktree had no `node_modules`; the Node witness
below needs no external dependency. The later compiler used a separate copy
of R7's existing dependency installation, as recorded below.

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

Request `50695e48` owns the measurement, ordinary gate, exact-head review
and any repair needed when tests run on two workers. The owner must check
whether Main moved again and recheck the copied dependency view and lock
stamp before those runs.

The focused measurement can time the unchanged native phase command:
`node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts`.
Use the existing progress and timing reporters with new output paths,
leave `VITEST_MAX_WORKERS` unset, and retain elapsed time, child CPU, machine,
load, cache state, final case states and the per-project phase span. Run
the ordinary `npm run gate` separately, once at the candidate sent for review.
The owner must decide the measurement command before execution: the older
`scripts/measure-tests.sh` also installs packages and repeats package suites,
so invoking it unchanged would exceed this source-preparation plan.

Report the one-worker baseline's exact head, tree, selection and outcome
beside the two-worker result. R7's 1,315.81-second native continuation
failed two tests, so it cannot be described as the cost of a passing gate.
A comparison across different code trees or uncontrolled load must state
those differences and cannot establish a controlled speedup.

The older request `7783018d` remains separate. This preparation neither
repeats its campaign nor claims to close it. Archive work retains priority.
