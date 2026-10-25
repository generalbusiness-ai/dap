# Implementation-note warnings

Request `28b878ed0ddc0a85cd0af98a0b4e53bd7a2d9bef` adds an advisory check
for implementation notes and evidence paths in the committed landing delta.
The script is integrated after the gate's documentation-link check. Its
three owning cases pass. The ordinary gate closed naturally with code 0.
Root accepted the closed evidence. Final review and landing remain pending.

`scripts/check-notes.mjs BASE HEAD` reads Git objects between two commits.
It warns when an added or changed file under `notes/implementation/` exceeds
40,960 bytes. It also warns when a newly added path under
`notes/implementation/evidence/` does not end in `.manifest.json`.
An unchanged or deleted historical file produces no warning. A rename to a
new name counts as an addition. Uncommitted working-tree bytes do not affect
the result.

Warnings exit 0 because this check reminds authors of the evidence policy.
Missing commits, invalid ancestry, Git errors, and decoding errors exit 2.
Paths are JSON-quoted so a filename containing a line break stays on one
warning line. The script does not read note bodies or change Git state.
It does not verify manifest contents, evidence retention, or sensitive data.
Reviewers still apply those requirements in [the testing guide](../../docs/testing.md#the-implementation-note-and-its-evidence).

The existing Node stage now includes `scripts/check-notes.test.mjs` once.
Its three cases use private temporary Git repositories with real commits.
They cover the strict byte boundary, committed bytes despite a later local
edit, new evidence names, unchanged historical files, a clean range, and a
missing base. Each fixture removes its repository in `finally`.

The reviewed documentation-link changes are merged without replacing either
set of testing-guide changes. The `notes` step runs immediately after
`doc-links`, using the gate's existing merge base, and prints its warning
log. Earlier failures still stop later steps. The hook changes no test stage,
case, assertion, or deadline.

## Evidence

The owning run tested commit
`a2c026a778c0a87f9854bc520995c8d6e50399b2`, tree
`6bcb34aa37965fdbcfee52483109ba12c856d7d7`. Its helper, test, and maintained
reporter remain byte-exact at the ordinary gate checkpoint
`4ec02207f7098854b764c9370f305b56adef79d7`, tree
`402f279f8ea29b4040831f4abd4f1c38d3e6766f`.

The first owning capture failed before Node started because its strict file
check encountered a Python backend symlink. A fresh allocation used the
explicit regular Python interpreter and ran the whole file once. Its three
cases passed. The maintained reporter records three case identities, three
separate wrapper observations, and one EOF marker. Stderr was empty.

Private dependency preparation copied an existing private pool without an
install. The first owner failed on directory and link modes. A narrow
continuation repaired those modes, then failed its final metadata guard
after the sole lock stamp changed the APFS root link count. Both failures
remain failures. A separate read-only audit found the final filesystem
matched the copy contract: 5,498 files, 535 directories, and 32 relative
links, with the expected lock stamp. Root accepted that filesystem in
`09303cb82b5db84808776d062b182c3a4704f95a`. That acceptance does not change
either owner's exit code.

Metadata setup and capture exited 0. Root accepted those closed preparations
in `739f45b71e4b8976e62c4dd9e5d1e629725cb931`. The gate then ran once with
its allocated private pool. The original gate child, owner, and envelope
closed naturally with code 0. Root recorded that closure in
`d051606965f0ecbc971ea9c4d41ec066fb0190dc`. All ten gate steps printed exit 0,
including `notes: 0 warnings`. The typecheck output contains 40 compiler
invocations across 15 compound command lines.

The canonical Node stage passed 56 cases, including all six orchestration
cases in `scripts/test.test.mjs`. No separate orchestration run was needed.
Counting passed 55 generated Node cases. This is not browser evidence.
Each Node stream has one EOF marker. The 48 ordinary Node wrapper events
and 12 Counting wrapper events remain outside the case counts.

Plain Vitest reports 2,816 passes and one skip across 2,817 identities and
274 modules, with complete callbacks. Native Vitest reports 771 passes and
two skips across 773 identities and 227 modules. Native lacks 14 ready
callbacks and 33 result callbacks. All of those cases passed, and every
terminal identity is present.
The progress and timing end records report passed with zero unhandled
errors. Those observations are not a claim that every Source registration
name was independently matched.

The maintained summary marks the Scope duration sum partial because the
skipped `apps/room/page/test/record.scope.test.ts` module has a null duration.
That does not mean a case remained unfinished. The other native skip is a
Demo recorder. The plain skip is the MCP long-`ARTROOM_HOME` dead-reclaimer
case. Raw native `RefcountedCanceler` and `abortContextSignal` diagnostics
remain in the log without an attributed actor or cause. The reported zero
unhandled count does not erase those diagnostics.

The allocated closed-data parser exited 0 with zero issues and authenticated
29 original-and-copy pairs. Root then reviewed the four-cut cache
normalization, diagnostic contexts, and exact three warning and six
orchestration case names. Root accepted the evidence in
`3cf435b71a708d0a1a607db3de54c018221f5829`. Parser success alone did not supply that acceptance.
The full static Source-name and parameter-suffix bijection remains
unestablished. All 3,590 actual raw identities, names, and terminal states
agree between timing and progress, and all 501 module paths belong to the
captured Source.

The table uses captured command basenames for private owners. The private
evidence index records exact tool paths and arguments. The owning Node
command also uses the spec and maintained JSONL reporters.

| Check | Actual command | Original exit or outcome | Output digest |
|---|---|---|---|
| Initial owning preflight | `python3.14 -I -S -B run.py` (owning v1) | Owner 1; Node never started | `18c7bb05d6787c3bd1e28341f120b615d98fbc79fab9e71c790f40c6c6dfec93` (result) |
| Whole warning Node file | `node --test scripts/check-notes.test.mjs` with both reporters | Owner 0; Node 0; three passes | `e3d07f4ee48bbead7794d291563a189837e625c2392a978e23d1f0515bc96c05` (stdout) |
| Initial private copy | `python3.14 -I -S -B copy-private-dependencies.py binding.json` | Owner 1; mode guard failed | `35e11876f91ec54c7a6f702062fe3e363ef78b96b77a35f311b5283aa529d867` (outer time) |
| Copy continuation | `python3.14 -I -S -B continue-private-dependencies.py binding.json` | Owner 1; metadata guard failed | `82a84293a51c962ed9fa72a9118be7fbc15d8c35ad1af1bbc79389eeff21411f` (outer time) |
| Final filesystem audit | Read-only closed-data comparison | Filesystem accepted separately; prior failures retained | `3718ca941bc280555a854116fc3652566b06d34106b692104b9db92496409d7b` (curated audit) |
| Metadata setup | `python3.14 -I -S -B prepare.py` with allocation and copy acceptance | Owner 0; no tests run | `495996945614091ad977eabb9b45106c2b30bef4ef4fdb6ce1be97418153ad80` (outer time) |
| Metadata capture | `python3.14 -I -S -B envelope.py --capture-binding` with binding path | Owner 0; envelope 0; no tests run | `291260ccb5ae0658c5ac311ff46fded9fa56787df5055fcbffefdf60a56bba08` (outer time) |
| Existing orchestration, inside the gate | `node --test … scripts/test.test.mjs` in the canonical Node list | Six passes, within the 56 Node passes | `d8e8cffac44475642070048966ad486fc32be8dbd856f552e300f109d8aa3674` (Node observations) |
| Ordinary gate | `npm run gate` through the pinned Node and npm CLI | Child 0; owner 0; envelope 0; ten steps exit 0 | `3d1331fb2f704af691cbdff5aa25e6d6d5ff411935cea89468c430a1f975834e` (gate stdout) |

The failed owning preflight cost 0.27 seconds elapsed and 0.13 seconds CPU.
The successful owning capture cost 1.18 seconds elapsed and 1.10 seconds CPU.
The failed initial copy cost 2.52 seconds elapsed and 2.20 seconds CPU. Its
failed continuation cost 2.18 seconds elapsed and 2.17 seconds CPU. Metadata
setup cost 0.60 seconds elapsed and 0.38 seconds CPU. Capture cost 0.31 seconds
elapsed and 0.30 seconds CPU. The gate's outer measurement is 1,451.60 seconds
elapsed and 1,675.87 seconds CPU.

Each figure measures a separate outer phase, including its guards and
descendants. Nested child and stage costs are not added. Their sum is not
an observed pipeline measurement. The machine is an Apple M5 Max with 18
logical CPUs. Load and OS cache state were uncontrolled. Empty named gate
cache directories do not imply cold OS caches. These figures are not a
portable benchmark.

The [evidence manifest](evidence/2026-10-25-implementation-note-warnings.manifest.json)
indexes the durable files and their hashes. The top-level `SHA256SUMS` covers
all other retained files, including the already sealed subphase indexes.
The evidence root is read-only after the final writes. Retention is at least
30 days after landing, with removal controlled by the planner. Raw
environment and physical binding vectors remain private.
Finite boundary checks do not prove continuous isolation or all dependency
content bytes. The note and final manifest can change after this tested
checkpoint under [the testing guide's documentation-only exception](../../docs/testing.md).
That exception requires executable Source to remain unchanged. No second
gate is needed for those documentation-only changes.

Request `28b878ed0ddc0a85cd0af98a0b4e53bd7a2d9bef` owns final review.
No future commit, review approval, or landing is claimed here. This change adds no Worker setting, binding, migration, or
deployment action.
