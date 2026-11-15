# GS3: two scale groups

Request `3a4f6d1c4ebb2839376a2b27521c52bbcc6ab479` and its single-request
promise `a187a745e8debdfb4f546a159c7d3fd3566c8123` track GS3. The combined
tooling head also carries FH1 request `c8b2f4f674a1fe1348fd697e9122071291581038`
under its separate promise `1be80098072bfb87aed9bedef0046f5219e6a0f7`.

This isolated branch starts from FH1 `cc0f423267d95eb28c7a5f47ce994aefd397afa0`
and merges actual main `336dd74e990f057834ac8b2edc92a4287315ec8c`.
The original FH1 and R worktrees remain separate. The tracked FH1 hooks
remain inactive; no shared Git configuration changes.

## Selection and execution contract

The selector returns `omit`, `moved` or `all`. The exact runtime path
predicate from pre-GS1 main `270dc8c7` selects `all`. GS1-only protected
paths select `moved`. A match for `all` takes precedence, including a
selector, scale configuration or inventory edit. Thus `judge.ts` alone
selects sixteen cases in nine complete owners; archive-family changes
select all 22. Main and ordinary `npm test` keep all 22.

The inventory owns two case-count maps: the original four owners/six
cases, and the moved nine owners/sixteen cases. It validates distinct
owner paths and positive integer case counts once. The configuration and
runner derive their chosen files and counts from those maps. Ordinary
Native projects still exclude all 13 scale owners. The selected scale
project keeps its Worker, setup, two-worker ceiling, case bodies, bounds
and deadlines, including the Grow producer/follower order.

The standalone runner defaults to `all`, validates the mode before
creating output, and forces that mode into its child's environment.
It rejects unknown, missing, duplicate or extra owners, incorrect owner
counts and totals, incomplete reporting and nonzero child exits. `omit`
starts no child and writes no scale report or zero-case pass. The Native
gate retains its decision and actual phase wall time in the existing
selection and stage records.

The existing workflow retains main pushes and manual dispatch, adds a
daily schedule at 05:00 UTC, and explicitly invokes the runner with
`all`. This source edit schedules nothing until review and landing.

## Witnesses

The existing selection/capture owner now checks the three answers,
old-rule precedence, a `judge.ts`-only moved answer, wrong-group reports,
missing and extra owners, redistributed case counts, inherited mode
replacement, and omission without a result directory. Existing phase
and orchestration owners check the group inventories and mode transfer.
The tracked-test owner asks Vitest to resolve the actual moved config
and compares its owner set with the inventory: exactly the four old
owners disappear and the nine moved owners remain.

## Development and control evidence

Ordinary development checks froze clean head
`8338e447aa1a65b62b8e9cbca6717fb1012a4f56`, tree
`80a77b8e366906fcf1473ad2606fce7b75dd0d25`. The worktree owns an APFS
copy of R's verified dependencies, with lock and stamp SHA-256
`f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54`.
All 17 root/workspace lock and manifest files matched, and all fifteen
relative workspace links resolved inside GS3. No install or download ran.

The development log is
`/Users/hughpyle/play/artroom-evidence/2026-11-14-gs3-fh1-development-attempt1/development.log`,
SHA-256 `8d9e25ec7e75fa3e35b86c77eee02b6449175c4528060800c0e4c4a9d5143007`.
It retains each actual command, output, exit and time; raw per-command
logs and time files sit beside it. Checks ran sequentially once and all
passed. The five Node owners ran seventeen cases with no skips. The
table retains that dated interval and the later shared-helper attempts.

| Check | Actual result | Time |
|---|---|---:|
| Eight hook/helper/runner/config syntax checks | Each exit 0 | Per-command times in the log |
| Scope test compiler | Exit 0 | 1.24 s wall |
| `scripts/scale-selection.test.mjs` | Exit 0; 6 passed | 0.51 s wall |
| `scripts/test-phases.test.mjs` | Exit 0; 1 passed | 0.17 s wall |
| `scripts/test-selection.test.mjs` | Exit 0; 1 passed, including actual moved-config resolution | 1.96 s wall |
| `scripts/test.test.mjs` | Exit 0; 6 passed | 2.22 s wall |
| `scripts/git-hooks.test.mjs` | Exit 0; 3 passed | 2.84 s wall |
| Selector control, whole six-case owner | Exit 0; distinguishes the new-only answer | 0.91 s wall for both runs |
| Helper attempt 1, `5f449c4e`: two Node syntax checks, shell syntax and maintained scan | Each exit 0 | Actual phase times in attempt 1 `result.json` |
| Helper attempt 1: whole hook owner | Exit 1; 3 passed, 1 failed | 4.235859250 s wall |
| Helper attempt 1: selection owner | Unreached | No execution |
| Helper attempt 2, `6f3b556e`: helper syntax | Exit 0 | 0.064641334 s wall |
| Helper attempt 2: maintained scan | Exit 0; 927 sources, 159 bytes exports | 0.641652625 s wall |
| Helper attempt 2: whole helper owner | Exit 0; 2 passed | 0.150011458 s wall |
| Helper attempt 2: whole hook owner | Exit 0; 4 passed | 4.348524833 s wall |
| Helper attempt 2: whole selection owner | Exit 0; 6 passed | 0.491379000 s wall |

The helper follow-up first failed at
`5f449c4e82d3f2a1ff387098d1718c992358cfbe`: the new real-Git hook case
expected commit exit 1 at line 128 but observed 0. The hook ran the
checker, whose ordinary recursive Git pathspec missed the staged
direct-child `examples/hook-source.ts`. END
`45144f9fb98d3fbf29fc7bbb58c6af840fa3b5b1` retains that failure and the
unreached selection owner. The
[FH1 note](2026-11-14-fh1-tracked-hooks.md#shared-helper-check) names the
retained failed scratch repository and its actual child streams.

Only four apps/examples pathspecs gained explicit `:(glob)` magic. The
existing root-level witness, parser, package patterns and exclusions
stay unchanged. The repaired source
`6f3b556e35360dc1cd9dbdc77e6e2d0ed35d0a0f`, tree
`c0a2557dd04dbad87b7f7f9ba0ff247f6af47514`, passed attempt 2 with no
failures or skips; its outer wall time was 5.696680333 seconds. END
`bdc7f61aa26c608b132f4115f46f44869e2172cb` records the terminal results.

Both attempts retain `commands.json`, `result.json` and all streams in
their respective external directories:
`/Users/hughpyle/play/artroom-evidence/2026-11-14-gs3-fh1-helper-development-attempt1`
and
`/Users/hughpyle/play/artroom-evidence/2026-11-14-gs3-fh1-helper-development-attempt2`.
Attempt 2's `helper-owner.stdout.log` has SHA-256
`9e45cc57048731837b39d27a0fdb47047ee8f8505b7c2560a6388e7649aa23e4`;
`git-hooks.stdout.log` has
`0de79eabcf1e5daea44e71b0f02143d40f135966a4e1c6f561a447c6d851cfd4`;
`scale-selection.stdout.log` has
`8394695cdc6268e3a05754865e0ca3dddb95db9617ad3bb2fef8e831feb78dd2`.
The hook output names its four actual scratch repositories and retained
Git child streams. The local-helper scratch is
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/artroom-git-hooks-SqQxxG`.
The selection owner's 22-case and 16-case reports are scripted data for
the runner contract; they prove no real Scale case. No separate fault
run, third green run or sweep followed the helper repair.

The separately granted control at `8338e447` changed exactly
`movedMatchedPaths.length > 0 ? "moved" : "omit"` to
`movedMatchedPaths.length > 0 ? "all" : "omit"`, with
`--expect 'GS1-only paths select moved'`. The baseline exited 0 with six
passes; its TAP duration was 352.869 ms. The mutant exited 1 with five
passes and one failure; its TAP duration was 351.731583 ms. The named
test failed at line 111 with `ERR_ASSERTION`: actual `all`, expected
`moved`. Both runs had six cases and no skips. No third green run,
sweep or test-seed change occurred.

The control log is
`/Users/hughpyle/play/artroom-evidence/2026-11-14-gs3-fh1-gate-attempt1/controls/selector-control.log`,
SHA-256 `56df87d49dec7a51c1ce9238ae871e6820a34be255e779a77597f840bf1114d6`.
It includes the actual baseline and mutant TAP, both stderr streams,
the control outcome and its time. The retention-only helper copy changes
scratch placement and retention alone. The raw streams remain under
`controls/selector-case-7Nv7Sd/`. Original and restored source bytes and
modes remain beside the log. Both source copies have SHA-256
`071b7741f5f7b8e1b626f9bd5352f969ebc6429844067eb2375610e11bcdf1e1`
and mode `0644`. Restoration left the exact clean head before this
notes-only update.

The earlier `8338e447` interval ended after its selector control. The
later helper attempts above ran only their declared checks. No Worker
acceptance case, full scale run, repository formatter, build or combined
gate ran. The hook
owner used the real formatter only inside its authorized scratch
fixtures. The tooling gate follows NF5, C2 and C3, before E1's full gate.
Its own selector edit selects all 22, so it cannot provide the first
moved-gate timing.

The first actual gate that selects `moved` must report its Native wall
time; that result decides whether this policy stays. C2's omitted-scale
gate observed 590 seconds and GS1's all-scale gate observed 1,338 seconds
on different heads. The audit's older-six and moved-sixteen case sums
were about 974 and 643 seconds. None of those differences or concurrent
sums supplies a saving forecast. The first moved-gate wall remains
**UNRUN**. This follow-up changes only the two implementation notes;
source, tests, configuration and dependencies remain exactly as checked
at `6f3b556e`. The full tooling gate and review remain **UNRUN**. No
landing, push, hook activation or deployment occurred here.

## Assets preflight documentation

Ruling `ed983431f7ed36d2a29a6b8cf3cb7a0f27625204` extends `7fe68ffe`:
a head changing a source of the page build runs the whole assets owner before
START, reports exit and wall time, and tells the planner if it exceeds
60 seconds. `docs/testing.md` now states that requirement beside the two
existing preflight checks.

This documentation follow-up is **UNVALIDATED**. It changes only the testing
guide and this note. No compiler, test, build, control, parser, AST or browser
ran. All failed and passed tooling records above retain their original
heads and limits; the full tooling gate and review remain **UNRUN**.
