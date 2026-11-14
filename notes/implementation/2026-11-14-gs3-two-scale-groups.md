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

## Witnesses and unrun validation

The existing selection/capture owner now checks the three answers,
old-rule precedence, a `judge.ts`-only moved answer, wrong-group reports,
missing and extra owners, redistributed case counts, inherited mode
replacement, and omission without a result directory. Existing phase
and orchestration owners check the group inventories and mode transfer.
The tracked-test owner asks Vitest to resolve the actual moved config
and compares its owner set with the inventory: exactly the four old
owners disappear and the nine moved owners remain.

After an execution grant, run those changed owners and the existing FH1
hook owner. Use one whole-file distinguishing control on
`scripts/scale-selection.test.mjs`: change the new-only answer from
`moved` to `all` in the selector and require the named GS1-only-path
witness to fail. Run no sweep and change no test seed.

All tests, compiler, formatter, config resolution, controls, builds and
the combined gate remain **UNRUN** at this source stage. Read-only Git
and file operations supply no production pass. The tooling gate follows
NF5, C2 and C3, before E1's full gate. Its own selector edit selects all
22, so it cannot provide the first moved-gate timing.

The first actual gate that selects `moved` must report its Native wall
time; that result decides whether this policy stays. C2's omitted-scale
gate observed 590 seconds and GS1's all-scale gate observed 1,338 seconds
on different heads. The audit's older-six and moved-sixteen case sums
were about 974 and 643 seconds. None of those differences or concurrent
sums supplies a saving forecast. The first moved-gate wall remains
**UNRUN**. No landing, push, hook activation or deployment occurred here.
