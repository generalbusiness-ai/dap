# Tracked commit hooks

Request `c8b2f4f674a1fe1348fd697e9122071291581038` and promise
`1be80098072bfb87aed9bedef0046f5219e6a0f7` track FH1. This source checkpoint
starts from main `0166423ac8abe7ffe955a9c8ddf1a319cba75712`. All syntax,
test, formatter and gate checks remain **UNRUN**. No dependency setup or
shared Git configuration changed.

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

After the execution slot becomes available, run the changed Node and shell
syntax checks, then `node --test scripts/git-hooks.test.mjs`. Validation
stays behind NF5, C2, C3 and E1. The eventual gate and review remain owed.
