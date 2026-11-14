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
