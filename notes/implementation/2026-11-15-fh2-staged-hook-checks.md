# FH-2: require hook tools only for selected staged files

Request `efdebe550b52b5a2603c179d92944ae81abca4d7` and promise
`8d8c4c3f9545d31e4ad983602e13dede25b15fbc` govern this source lane.
Branch `builder/fh2-staged-hook-checks-20261115` starts at locally landed
tooling main `17a917cd73b0528dcf8d2610707c1b3f24afbeaa`.
All older branches, worktrees, and evidence remain intact.

## Conditional checks preserve their existing rules

The pre-commit hook reads staged non-deleted paths before it checks for
local tools. It uses the formatter's existing `selectedJsonFiles` function.
Only a selected staged JSON file requires Prettier and runs the existing
formatter check. That check still refuses unstaged selected JSON and never
rewrites source or the index.

The shared-helper pathspecs and filename exclusions move unchanged into
`scripts/shared-helper-selection.mjs`. Both the actual helper checker and
the hook use that dependency-free selector. Git matches the same pathspecs;
the hook does not emulate Git matching. Only a selected staged source path
runs the existing full helper scan. Parser and helper-declaration rules do
not change. Each required check retains its previous refusal words.

The commit-msg hook stays byte-for-byte unchanged. It uses Node and its
tracked message-rule module, with no `node_modules` dependency.
`docs/testing.md` explains this distinction and that each worktree uses its
checked-out hook scripts. This source lane changes no hook activation.

## Real Git witnesses, still UNRUN

The existing `scripts/git-hooks.test.mjs` owner keeps the malformed JSON,
partial-staging, message-rule, and duplicate-helper assertions. Its fixture
can leave setup files unstaged, so two named real Git cases stage only the
intended file. A Markdown-only commit has no local dependencies and must
succeed. One selected JSON file without Prettier must refuse with the same
message. The existing unformatted-JSON case must still refuse and preserve
both the working and staged bytes. The owner has five top-level cases in
source; that inventory is not a runtime result.

| Boundary | Result | Remaining work |
| --- | --- | --- |
| Hook syntax and selected checks | UNRUN | Root's granted development/preflight slot. |
| Whole existing Git-hooks owner and helper owner | UNRUN | Real scratch Git cases and existing helper assertions. |
| Combined gate and checker review | UNRUN | Ride the waiting NF6/NF8 source later; no earlier gate position before R, E1, or NF6. |
| Shared hook activation | UNCHANGED | Planner activates hooks only after landing. |

No project import, parser, compiler, test, control, dependency setup,
installation, network operation, activation, publication, or push accompanies
this source checkpoint. Root has not merged FH-2 into NF6/NF8.
