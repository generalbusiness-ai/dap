# Tracked commit hooks

Request `c8b2f4f674a1fe1348fd697e9122071291581038` and promise
`1be80098072bfb87aed9bedef0046f5219e6a0f7` track FH1. Its source starts
from main `0166423ac8abe7ffe955a9c8ddf1a319cba75712`. The combined GS3/FH1
head `8338e447aa1a65b62b8e9cbca6717fb1012a4f56` passed ordinary development
checks. The full gate and repository formatter remain **UNRUN**. The
worktree owns a matched dependency copy; no shared Git configuration changed.

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
control. No extra checks followed that control.

GS3 request `3a4f6d1c` combines this source with its two-group scale
selector under one tooling gate after NF5, C2 and C3, before E1's full
gate. E1 development proceeds independently. The eventual gate and review
remain owed; no shared hook activation follows from this merge.

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
`/Users/hughpyle/play/artroom-evidence/2026-11-14-gs3-fh1-helper-development-attempt1`:
`commands.json`, `result.json`, and `git-hooks.stdout.log` and
`git-hooks.stderr.log`. The retained scratch repository
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/artroom-git-hooks-GnQ1id`
also keeps each Git child's streams. Its `logs/09.stderr.log` shows that
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

The repaired source and its helper, whole-hook and selection checks are
**UNRUN**. Earlier results describe their exact earlier heads. The full
gate and review remain owed. This checkout does not activate hooks or
change shared Git configuration.
