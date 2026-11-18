# Tracked commit hooks

Request `c8b2f4f674a1fe1348fd697e9122071291581038` and promise
`1be80098072bfb87aed9bedef0046f5219e6a0f7` track FH1. Its source starts
from main `0166423ac8abe7ffe955a9c8ddf1a319cba75712`. The combined GS3/FH1
head `8338e447aa1a65b62b8e9cbca6717fb1012a4f56` passed ordinary development
checks at that dated source. Current composed DEV/preflight results appear
below and in the GS3 table. The gate passed at the gated source below;
no shared Git configuration changed. The original dependency view remains preserved separately.

The executable pre-commit hook calls a small Node helper. It refuses a
checkout without local Prettier, including a notes-only checkout. The helper
reuses `selectedJsonFiles` to refuse unstaged differences in selected JSON
before calling the existing `node scripts/format-json.mjs` check. This
prevents a formatted working copy from hiding an unformatted staged copy.
Neither refusal changes the working files or index. A format failure prints
the repair command and asks the person to review and stage the result.

The executable commit-msg hook decodes the actual message as UTF-8 with
fatal errors and calls the exported `checkMessage`. It copies no message
rules. The gate keeps its existing format and commit-history checks.
`docs/testing.md` documents the shared activation command; this checkpoint
does not run it.

The new maintained Node owner has three actual scratch-Git witnesses:
unformatted JSON refuses, a formatted but unstaged repair still refuses,
and staging the repair permits a valid commit; invalid subject, body and
UTF-8 messages refuse while a valid message commits; missing local Prettier
refuses with the setup instruction. The scratch repositories retain each
message and child stream. They use the existing real Prettier package
through a scratch-only link and install nothing.

The shell hook, commit-msg hook, Node helper and whole hook owner passed
their syntax checks. `node --test scripts/git-hooks.test.mjs` passed all
three cases, with no skips, in 2.84 seconds wall time. Its real formatter
runs stayed inside the authorized scratch fixtures; no repository
formatter command or shared hook activation ran. The
[combined DEV and control evidence](2026-11-14-gs3-two-scale-groups.md#development-and-control-evidence)
records the exact frozen source, logs and the selector's distinguishing
control. That development interval ended after the control; the later
shared-helper follow-up appears below.

GS3 request `3a4f6d1c` combines this source with its two-group scale
selector under one tooling gate after NF5, C2 and C3, before E1's full
gate. E1 development proceeds independently. The current gate passed; review
is owed. No shared hook activation follows from this composition.

## Shared-helper check

Ruling `a71906b7ec8e98ae5d9184f40df0e1de1d57fa19` adds the existing
shared-helper check to the pre-commit hook. After formatting passes, the
hook runs `node scripts/check-shared-helpers.mjs` and refuses a nonzero
exit, signal, or failed launch. It preserves both the working files and
the index. The gate keeps this check. The citations check stays outside
the hook.

A fourth scratch-Git witness stages a local `natural` implementation.
The real checker must refuse the commit, name its bytes owner, and leave
the full staged tree and working source unchanged. Replacing the local
implementation with a shared import must permit the same commit message.
The scratch repositories use the actual bytes source, the existing
contract export source, and the owned pinned parser and formatter. They
install nothing and retain their child streams.

Development at `5f449c4e82d3f2a1ff387098d1718c992358cfbe` passed both
Node syntax checks, the shell syntax check, and the shared-helper check.
The whole four-case hook owner then failed: three cases passed, and the
new local-helper case expected commit exit 1 but observed 0 at line 128.
Its process wall time was 4.235859250 seconds. END
`45144f9fb98d3fbf29fc7bbb58c6af840fa3b5b1` records the failure. The
scale-selection owner remained **UNREACHED**; no retry ran.

The actual argv, results and streams remain under
`artroom-evidence/2026-11-15-gs3-fh1-full-gate-attempt1/controls/2026-11-14-gs3-fh1-helper-development-attempt1`:
`commands.json`, `result.json`, and `git-hooks.stdout.log` and
`git-hooks.stderr.log`. The retained scratch child records at
`artroom-evidence/2026-11-15-gs3-fh1-full-gate-attempt1/controls/2026-11-14-gs3-fh1-helper-development-attempt1/scratch-child-records/artroom-git-hooks-GnQ1id`
keep each Git child's streams. Its `logs/09.stderr.log` shows that
the hook ran both checks but enumerated only the 26 copied bytes source
files; `logs/09.stdout.log` shows that the resulting commit included the
staged `examples/hook-source.ts` duplicate.

The checker used ordinary Git pathspecs such as `examples/**/*.ts`,
which missed that direct-child source. The repair adds explicit
`:(glob)` magic to only the four apps and examples TS/TSX pathspecs, so
`**/` matches zero or more directories. Package patterns, exclusions,
export traversal, parser and declaration rules stay unchanged. The
existing real-Git hook witness already covers this enumeration gap; its
root-level source, refusal assertion and shared-import repair stay
unchanged. No duplicate regression or mirrored selector test was added.

The repaired head `6f3b556e35360dc1cd9dbdc77e6e2d0ed35d0a0f`, tree
`c0a2557dd04dbad87b7f7f9ba0ff247f6af47514`, passed its separately granted
follow-up. Helper syntax exited 0 in 0.064641334 seconds; the maintained
scan exited 0 in 0.641652625 seconds over 927 sources and 159 bytes
exports. The whole helper owner passed two cases in 0.150011458 seconds,
the whole hook owner passed four in 4.348524833 seconds, and the whole
selection owner passed six in 0.491379000 seconds. No case failed or
skipped. The outer run took 5.696680333 seconds. END
`bdc7f61aa26c608b132f4115f46f44869e2172cb` records these actual results.

Raw argv, results and all streams remain under
`artroom-evidence/2026-11-15-gs3-fh1-full-gate-attempt1/controls/2026-11-14-gs3-fh1-helper-development-attempt2`.
The [combined evidence table](2026-11-14-gs3-two-scale-groups.md#development-and-control-evidence)
retains both attempts and the cited stdout hashes. The unchanged hook
case now refuses the staged duplicate and accepts its shared import;
its actual Git child streams remain in the named scratch repositories.
Selection's 22-case and 16-case reports are scripted runner-contract
data, not real Scale acceptance. No separate fault run or third green
run followed this repair.

Earlier results describe their exact earlier heads. That note-only follow-up
kept source at `6f3b556e`; it did not activate hooks or change shared Git
configuration. Current composed results follow.

## Current C3/SH1 composition

Gated source `202611c744b5299afb2fe617212956324c95b340`, tree
`8b31fa84c3a4839a9dfc72a6e839690dd0afd8a0`, contains actual main `4b198d0f`.
At that gated source, all 22 tooling-owned blobs were exact from b185a461. The new worktree owns
its authentic 8b2 view; the original f288 worktree/view remains unchanged.

DEV END `0e66b0dd26777400682b9c21d934717b37bb2b01` records 14 commands
passing once in 20.238040042 seconds. The whole hook owner passed four cases
in 4.163080291 seconds and retained four genuine scratch Git repositories
and child streams. The seven whole Node owners passed 21 cases, no failures,
skips or cancellations. Repository formatting also passed at this head.
The [one combined evidence table](2026-11-14-gs3-two-scale-groups.md#development-and-control-evidence)
retains exact commands, outputs, hashes and all earlier failed/passed histories.
Scripted Scale 22/16 reports prove runner-contract behavior, not Scale cases.

Required exact-head helper and whole typecheck passed 0 in 0.700710250 and
16.690255917 seconds, leaving the source clean. Gate START
`887de39444df088f76d1a56c7a8f7351638d577e` names this same source.
The gate passed at gated `202611c7`/tree `8b31fa84`, END
`7f5e23370814763b2d0a5b16528bfc1a5cec56d7`, exit 0 in 1604.604036875 seconds.
Node 200, Counting 56, Plain 4810 plus 1 skip and Native 1156 plus 2 skips
passed. The GS3 table retains the actual log/result hashes. Its source-bound
Scale result is 13 owners/22 passing cases in all mode, not a first-moved
measurement. Complete terminal evidence does not make partial scope-stories
duration observations complete.

Both helper attempts now have byte-exact retained copies beside the current
gate log, including all eight referenced scratch Git child-log directories
and 19 message files. Originals remain unchanged; no control reran and no
child record was missing. The GS3 retention paragraph names the boundary.

This note-only successor changes none of the 20 gated non-note tooling
blobs/modes. Its final head/tree belongs in the source act after commit.
Root's cheap note checks and independent review remain owed; no gate rerun
follows from this documentation update.

Ruling `a10d429d1fb9b0a83d552b8bcf33de24d4e50871` retains FH1's five paths
under promise `1be80098` and GS3's other 17 under `a187a745`. Each note
reports its own promise; one review/landing must name both implementations.
No artifact/review/landing, shared hook activation or deployment is claimed.
