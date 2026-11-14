# Head A: track the registers from the cutover window

Request `9d3bbe4c` follows cutover END `53d5a148`. This head starts at
CUT-A final `ce93a51c72051693c8c615946372270e0ddaff5a`. It changes only
the three files that `scripts/register-values.mjs` writes, plus this note.
The builder deploys nothing. The planner owns deployment after CUT-A and
Head A land.

## Script output

The script ran exactly once for each name on 14 November 2026. All three
calls returned zero. Each call used the register scope and genesis from
the END act. I compared all three complete genesis values below with
END `53d5a148`; each value matches exactly. Lending and Grow append
their new installed root. Demo uses
`--only`, so its installed list holds only its new root.

```sh
node scripts/register-values.mjs lending \
	--register sc_psbin3zi4ld7kqxg4vdbmb2eudyca64e5mxarz3k4qmklrpyfokq \
	--genesis sha256:2d029ef5f6fd2dfb15a764b0bdeb5583825a7092aa11331253c3d84d3b59882f
node scripts/register-values.mjs grow \
	--register sc_wmtd3fkl2cwafzzredeicmrdhtdo2ics6n7kezy6ds4rxaqvaxoa \
	--genesis sha256:a4ff0a4af3264821f265cff95c7a47e5ab8a16eeb5a5cb102c8e6275e3450aa9
node scripts/register-values.mjs demo \
	--register sc_dtqcta4htibueaeycfficyanudk5cz3ssrsugho3qlznvrhw3jxq \
	--genesis sha256:e1d53ac5241fad1445bd8963abbaa6c844c2dcdeced0c2495d3778fa190870b0 \
	--only --start-origin https://dap-demo.inguz.workers.dev \
	--deployment dap-demo --definition platform:register@28
```

The output changes these paths:

- `apps/room/wrangler.lending.jsonc`
- `apps/room/wrangler.grow.jsonc`
- `apps/room/wrangler.demo.jsonc`

Each file now agrees on `REGISTER_SCOPE`, the Artifacts register, and the
installed-root list. The Demo output also adds its complete version 3
Start offer with the exact genesis. The helper validates the other two
genesis arguments without adding a new binding. Demo's `DEPLOYMENT`
remains a secret binding. The script adds no tracked variable of that
name. Grow's existing deployment value and archive configuration stay as
they were.

## Decisions and dependency view

Script START is `07f651a9`. The three raw diffs, stdout, stderr, exact
argument vectors, monotonic command times, public changed-path list and
actual escalated power samples live in
`/Users/hughpyle/play/artroom-evidence/2026-11-14-head-a-script-attempt1`.
The lending, grow and demo command wall times were 1.856, 1.215 and
1.214 seconds respectively. These are observations, not deadlines.

The worktree has its own real dependency directory, cloned with `cp -cR`
from CUT-A's tested dependency view. Both package locks and the inherited
markers equal
`f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54`.
All fifteen workspace links resolve inside this Head A worktree and name
the expected packages. The dependency metadata hashes agree. No install,
link rewrite or marker fabrication ran.

The preflight and each command's endpoints read actual AC Power and
power mode 0. Preflight found no validation process. Commands ran
sequentially after root released the slot at R1 END `241062cd`.

The script helper writes atomic temporary files with mode 0600. Those
modes stayed unchanged throughout the gate. After the gate and CUT-A
landing END `a616170e`, I set all three generated files to mode 0644.
Git records mode 100644 both before and after that permission change.

## Final evidence

The three commands completed at 07:50:27.552975 UTC. Gate START
`52e66497` followed at 07:55:18 UTC, and execution began at
07:55:23.215992 UTC. I filed script END `04c794bd` after gate START.
Ruling `a7128e20` accepted the running gate and held main until its END.
The gate ended at 08:22:05.277563 UTC; gate END is `3c08fca3`.

The gate ran once at clean, pushed source
`04d556aa3c4db1c46bee7ba42574d7a4cf160d7b`, tree
`a0cbda3ee0458c2591ff2d7c5c990fdb0cecb000`. It used the maintained
selection, including scale. Node passed 178 cases, and Counting passed
56. Plain passed 4,616 cases with one skip across 401 files. Native
passed 1,155 cases with two skips across 295 files. These counts come
from the complete terminal evidence. The optional live Native callback
stream covers only 1,111 pass events. Both terminal runs reported zero
unhandled errors. Static, documentation, formatter, compiler, and pin
checks passed; notes reported zero warnings.

The outer monotonic timer measured 1,602.038516 seconds. The test stage
took 1,572.5 seconds. Actual escalated endpoints and 20-second samples
stayed on AC Power with power mode 0. The source ledgers stayed equal.
No install, selector override, timeout change, repair, or second gate ran.

After CUT-A landed, merge `d720ae6532f3333853811b961d35cb8e0da4a0b4`
took main `0ad4aa9102fe5f75b692d3adb30c8b00a6914574`. Before these
final documents, that merge tree equaled the gated tree exactly:
`a0cbda3ee0458c2591ff2d7c5c990fdb0cecb000`. The diff from that merge
to the final head contains only this note and the evidence manifest,
both under `notes/`. Production source and tests remain unchanged.

The [evidence manifest](evidence/2026-11-14-head-a.manifest.json) records
the checkpoint, tree proof, raw output sizes, and SHA256 values. All
425 raw files matched their sealed checksums and had no write bits.
The manifest lists 109 files directly, including every output below.
The sealed gate manifest and checksums cover the periodic power samples.

The scripts ran from CUT-A `ce93a51c`; their output became source
`04d556aa`. The gate used that source checkpoint.
The cheap documentation and Git follow-up used notes checkpoint
`fde018379f2939510db5e629f1198a3959f369fd`, tree
`3756dde8a5a00d9143692b1dbb6c47d3533dece4`. Only this note and its
manifest add those results afterward. No compiler or test ran again.

| Check | Command | Exit | Raw output and SHA256 |
|---|---|---:|---|
| Lending register values | Full `node scripts/register-values.mjs lending` command above | 0 | `2026-11-14-head-a-script-attempt1/lending.stdout`: `8c63b195b3cd6d1a5f244c0ec92f53b627fa8b1db6ecec17eab6ff798cd55362` |
| Grow register values | Full `node scripts/register-values.mjs grow` command above | 0 | `2026-11-14-head-a-script-attempt1/grow.stdout`: `30e9abb6875212d077f1aa2c59a99f26d4b6c566ad4447d64238a744b115dbe2` |
| Demo register values | Full `node scripts/register-values.mjs demo` command above | 0 | `2026-11-14-head-a-script-attempt1/demo.stdout`: `af2a11bf09a104f15266bce351c27da7899cf7580ff42d6640351142f18e3702` |
| Maintained full gate | `/usr/bin/time -p /opt/homebrew/bin/npm run gate` | 0 | `2026-11-14-head-a-gate-attempt1/gate.stdout`: `508e82c029ce3ffe359c9592c680fa4456d4ad1ae8dcd8302860c1c7dba8e259` |
| Final diff whitespace | `git diff --check 0ad4aa9102fe5f75b692d3adb30c8b00a6914574 HEAD` | 0 | `2026-11-14-head-a-doc-checks/whitespace.stdout`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Commit messages | `node scripts/check-commit-messages.mjs 0ad4aa9102fe5f75b692d3adb30c8b00a6914574 HEAD` | 0 | `2026-11-14-head-a-doc-checks/commit-messages.stdout`: `fc8765466e4e267859aeefd91456d6d8c027c5b75f972ee69d76ef7d3d3dd256` |
| Local documentation links | `node scripts/check-doc-links.mjs` | 0 | `2026-11-14-head-a-doc-checks/doc-links.stdout`: `0b62886e12f396ee8cf60e4cfe3f4112ecc75879da8508427692a1367191bbc9` |
| Note size and inventory | `node scripts/check-notes.mjs 0ad4aa9102fe5f75b692d3adb30c8b00a6914574 HEAD` | 0 | `2026-11-14-head-a-doc-checks/notes.stdout`: `35f5140f008ef3bf10327a6430f244281b40bdfa97fd8e95da1c9634089d74d1` |

Raw output stays under `/Users/hughpyle/play/artroom-evidence/`. The
script directory contains 43 files; its `SHA256SUMS` digest is
`ace0ac970a6731fbf4917394aba8addfab158978bb948bbbc4d4cd521bc16d5f`.
The gate directory contains 371 files; its `SHA256SUMS` digest is
`30b43c20644f92946d5c6bb3cbf620ff793b45e66579c2418606dd30e4e268d5`.
The documentation follow-up contains 11 files; its `SHA256SUMS` digest
is `74ab959a7d9faa07b84ba3f8f99197872736266468f6e356abe00bae5e2060e3`.
All three directories are read-only. Keep them for at least 30 days after
landing, as [the evidence rule](../../docs/evidence-filing.md) requires.

## Open limits

Request `9d3bbe4c` leaves deployment to the planner after CUT-A and
Head A land. No deployment ran in this lane. This note makes no
live-value verification claim beyond cutover END `53d5a148`.
