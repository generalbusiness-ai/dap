# Head A: track the registers from the cutover window

Request `9d3bbe4c` follows cutover END `53d5a148`. This head starts at
CUT-A final `ce93a51c72051693c8c615946372270e0ddaff5a`. It changes only
the three files that `scripts/register-values.mjs` writes, plus this note.
The builder deploys nothing. The planner owns deployment after CUT-A and
Head A land.

## Script output

The script ran exactly once for each name on 14 November 2026. All three
calls returned zero. Each call used the register scope and genesis from
the END act. Lending and Grow append their new installed root. Demo uses
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

## Evidence and dependency view

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

## Gate still owed

The next full gate belongs to this head, ahead of C1. It must run at the
clean committed and pushed source with the maintained scale selection.
The inherited `scripts/test.mjs` change selects the scale owners too.
No scale override or battery timeout can stand for that evidence.

A failed test or documentation check stops this lane and becomes a CUT-A
finding. Head A repairs no such failure. The gate result and sealed raw
record remain owed at this checkpoint. This note makes no deployment or
live-value verification claim beyond the planner's END act.
