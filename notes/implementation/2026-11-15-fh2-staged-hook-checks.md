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

## Real Git witnesses at the source checkpoint

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
| Original hook syntax and selected checks | UNRUN at the original source checkpoint | Current results below do not relabel that checkpoint. |
| Original whole Git-hooks/helper owners | UNRUN at the original source checkpoint | Current whole-owner results below bind 27e. |
| Current shared-helper whole owner | Exit 0; 2 passed in 0.153247916 s | `B/helpers-owner.stdout.log` — `84e3cf7664b1bce6660249020c850218027c92cab4a3356f8e13fcb65f0962a8`; bounded END d7aa80aacaf11222cd00a70ffc8c16a0d8de9e51 |
| Current whole Git-hooks baseline | 5 PASS, no skip/cancel/todo | `F/before.tap` — `1be8cdad969ec6106c4935adb72b323ae90ddb9c04f63fe1516c44ed5234e5e4` |
| Current sole control | DISTINGUISHES; mutant 4 passed and 1 direct failure at 117:10, actual 1 versus expected 0; helper exit 0 in 9.175240458 s | `F/after.tap` — `37604f0d4e6d1a1ea485dd64401862cdba9b5f2917c690270bcd781d1f1b581e`; `F/stderr.log` — `7b4465ad7ff1abf6f124279339368636326ccfc905d672c26494a4bb750dff01`; result `2451458b5f930db7b6b6653cf2b6c4d9c8968bebc6acda1086794ee68ba05d5b` |
| Current exact-head preflight | All exited 0: fetch in 0.283590583 s, helpers in 0.596663333 s, WHOLE typecheck in 16.459192000 s; outer wall 17.551862333 s | END 7300a4c1361c600fdbc52f8da3f360b4e703bd2b; `T/helpers.stdout.log` — `af00848d1b94433533085adfecd184e68584914cce159b58ead29f4dab584502`; `T/typecheck.stdout.log` — `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a` |
| Full combined gate, END 9d48f8f053c936598e8de3d441ed9b5e08c2241c | Exit 0; child wall 1620.579566916 s, outer wall 1620.829315250 s. Node 202; Counting 56; Plain 4858 passed/1 skipped; Native 1158 passed/2 skipped | `G/gate.log` — `44a9865875f439993459f0f78655acc3475b54615a65b838ec78aae452f2daf9`; `G/result.json` — `2586c1eaaf03602b6ee983d43e0ad8ff66fe8972517006125d9b266eaf0476e6` |
| Local browser interval, END 9264fbca49df5a75c004929c7e7ae18f3521be00 | All twelve local steps exited 0; outer 257.253067459 s | `D/result.json` — `a498ca9d34370a74ed4e32849a1c095d420d1604d1fbf7b236b730d100c88f66`; full steps and safe output hashes appear in the [common NF6/NF8 report](2026-11-14-nf6-nf8-custody-follow-ups.md). Independent checker and Security review remain owed |
| Shared hook activation | UNCHANGED/OFF | Planner activates hooks only after landing; real scratch Git tests do not activate shared hooks. |

No project import, parser, compiler, test, control, dependency setup,
installation, network operation, activation, publication, or push accompanies
the original source checkpoint.

## Original NF6/NF8 source composition

Normal merge `16cf270d3b3566f8d90add8e644323f9b1ca8f59` carries the reviewed
FH-2 source onto `builder/nf6-nf8-on-c3-sh1-source-20261115`, after that lane
merges actual published tooling main `17a917cd73b0528dcf8d2610707c1b3f24afbeaa`.
The merge has no conflict and preserves all six FH-2 blobs and modes before
this note-only follow-up. The existing owned 8b2 dependency view remains;
no new dependency setup accompanied the composition. Combined checks,
Git-hook cases, gate and review were UNRUN at that checkpoint; current
results appear below. This does not
activate hooks or give FH-2 a separate gate position.


## Current development and one distinguishing fault

Current development results bind clean source
`27e0165938ec563420c1fecce6364d11c14f4afb`, tree
`66ccd762db65d34a8f9e95f59071984a32c2c7be`. Main and origin were
`c6711b53a368d24c1fad2830ea5634c045999ce1`.
The full gate passed under END `9d48f8f053c936598e8de3d441ed9b5e08c2241c`.
The local Page/Card browser interval passed all twelve steps under START
`1487c651e724953c67149527286eea494bb3ca68` and END
`9264fbca49df5a75c004929c7e7ae18f3521be00`. All steps exited 0 with no error or
unreached step. The 26 source guards matched the same clean head, tree and main;
all children terminated and root reaped session 89290. The outer wall was
257.253067459 s. `D=E/2026-11-15-nf-browser-27e0165938ec-attempt1` retains the
safe outputs and actual argv in `D/result.json` — `a498ca9d34370a74ed4e32849a1c095d420d1604d1fbf7b236b730d100c88f66`.
Browser scripts ran locally on macOS at this head. The Linux workflows have
not run at this head.

`E=artroom-evidence`;
`B=E/2026-11-15-nf-lc2-bounded-owners-attempt1`,
`T=E/2026-11-15-nf-lc2-exact-head-preflight-attempt1`,
`G=E/2026-11-15-nf6-nf8-fh2-sd1-lc2-full-gate-attempt1` and
`F=G/controls/fh2`.
Exact argv and intervals remain in the result records. The gate-directory
copies retain the original helper streams and native TAP bytes; originals
remain intact.

END `efcb650949bc154ed5156b62a196a7fc86613a73` classifies the sole FH2
control. The unchanged whole owner passes five cases, supplying its required
baseline without another unchanged green run. The unique
`if (selectedJsonFiles(staged).length)` becomes `if (true)` only in the
detached scratch's pre-commit source. The Markdown-only fixture stages only
its note and deliberately has no dependencies. Its actual Git commit then
refuses missing local Prettier; the existing accepted.status assertion fails
with actual 1 versus expected 0 at git-hooks.test.mjs:117:10. The other four
cases pass. No timeout, cancellation, skip or todo occurs.

The maintained helper changes only preserveScratch=false to true in an
external retention copy. Classifier, child runner and deadlines stay exact.
Both native TAP reports and empty child stderr remain retained. Root read
the direct assertion and verified original source bytes, mode 0644 and clean
state in candidate and scratch. All children terminated/reaped. There was no
third green, new source fault, global hook activation or dependency change.

The same frozen head's seven bounded commands pass under END
`d7aa80aacaf11222cd00a70ffc8c16a0d8de9e51`, including the existing two-case
helper owner and new SD1 source-registration guard. Exact-head preflight END
`7300a4c1361c600fdbc52f8da3f360b4e703bd2b` passes helpers and whole types.
The later full gate also passed at this source; independent review remains
owed. The five-
promise partition retains all six FH2 paths and this distinct report. Shared hooks remain off; the planner owns activation after landing.

The gate selected all Scale cases naturally and passed all 22 in 13 owners.
Its Native wall was 1282098.070041 ms including Scale, not a separate Scale
wall. All four terminal test stages are complete; scope-stories has partial
module observations with 129 unknown/suite records and zero contradictions.
Every pre-test check passed and notes reported zero warnings; installation
skipped on the matching stamp. These results do not activate shared hooks.
The planner still owns that repository-wide setting after landing.

The [common NF6/NF8 report](2026-11-14-nf6-nf8-custody-follow-ups.md) records all twelve local browser steps and their
fixture limits. The safe-export index `D/safe-export.json` has digest
`13b72f5ddc27ba877be22239d2e4ead1cc293b1725b2b1607bccf65035e27e08`. Local browser success does not activate
shared hooks, establish hosted installation or supply an independent
Security conclusion.

The final documentation successor changes only the four existing NF6/NF8,
FH2, SD1 and LC2 implementation notes. Its source, tests, identifiers, packets,
configs and dependency metadata remain those of gated
`27e0165938ec563420c1fecce6364d11c14f4afb`, tree
`66ccd762db65d34a8f9e95f59071984a32c2c7be`. Root's later source checkpoint
names the final commit and tree.
