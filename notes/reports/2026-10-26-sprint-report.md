# Sprint report, 26 October 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 25 October to 17:00 on 26 October. Eight
heads landed on `main`: the 25 October sprint report, the advisory
notes and evidence warnings in the gate, the archive source recovery,
the certified rules policy (R7) with its documentation follow-up, and
three slices of the codebase review (BR-9, BR-10, BR-3). The three room
Workers run the day's last landing. The demo room's archive advanced
from entry 9,824 to 24,333, the Site row recovered and reached its
frontier, and at 15:35 both rows began to defer at the finish quote.

## Story: the certified rules policy lands

The R7 head arrived at its checkpoint `52c2714c` at 02:24 with its
evidence recorded, then waited until 08:14 with no acts. The builder
resumed with the whole-Page asset check, committed `8ba23a34`, and ran
the ordinary gate. It failed in one test file: the head makes Rules 11
supported, so a test that named it as the next unsupported version was
stale. The one-line repair and its bounded follow-up reached the native
stage, which failed in one more file for the same reason (Register 19).
The planner ruled (`036e7f12`) that a chain of two isolated test-only
repairs meets the testing guide's follow-up rule on four conditions, and
that a third failure would need one ordinary gate at the exact head, not
another follow-up. The checker assessed the four conditions at the exact
head and approved the policy at 09:32 (`21c4328b`); it landed at 09:36
as `6852f78d`, 61 commits and 85 paths.

The head adds one strict decoder for a complete rules policy, a tree
proof that binds rules, proposal, destination, repository, ref and
commit, and required checks enforced at the destination with the
captured policy, so a lane's stale copy of the rules no longer matters.
The new family (register 19, directory 18, membership 8, rules 11,
destination 14, inbox 1) sits behind the cohort
`archive-certified-rules`; hosted creation stays closed to it until the
creation pins change. The verdict's five limits were placed the same
hour: the documentation follow-up (`8d8eef89`, landed 10:00) qualifies
the enforcement claim to change publications and records the limits;
the hardening head (`5e6d482c`) owns certificate reuse, certification
liveness, the passes-record ceiling and the Page wording; file
publication on the new destination belongs to R16; the stale-sentinel
limit belongs to BR-13.

## Story: the archive rows

The Site row had stopped on 25 October because a foreign source was
unavailable. The recovery head (`9daa037e`, landed 22:34) lets a
directive restart a row stopped for that reason and records a
`sourceFailure` on each pass. Deployed at 23:33, the row showed its
digest; a directive built from it was deployed at 23:51 and the restart
applied by 00:07 (generation 2, resumed at entry 1,797). The directive
was removed at 00:09. Site reached its frontier, entry 7,947, at 06:35
(observed tails each hour, no exceptions) and kept up with it all day.

Room A ran without a deferral from entry 9,824 at 23:45 to 24,333 at
15:35, about 900 entries an hour (observed tails). At 15:35 both rows
deferred at the finish quote: Room A short by 44,865 bytes of metadata
(used 2,504,897, requested 1,734,272, limit 4,194,304), Site short by
277 bytes. The rows stay live and retry with backoff. Both deferrals
appeared within an hour of the 14:38 deploy, the first to carry the R7
archive changes; the cause is not known. Request `499b2a80` asks the
builder to measure both entries under the previous and current code and
cut the growth with the 65,536-byte margin.

## Story: three review slices

BR-9 (`986c7120`, 10:14) pins the migration lists of the four deployed
room files as prefixes under a configuration test: an appended step
passes, a removed, rewritten or reordered step fails.

BR-10 (`197acc83`, 14:33) removes the three obsolete rename files, keeps
a pointer to the commit that holds them, and makes the Page name
`DAP_HOME`. Its first landing was refused: deleting a guide under `docs`
retires the planner's directory artifact at `docs`, which the eight
reviewed paths did not cover. The builder recut the head with `docs` as
a ninth artifact, the checker approved the recut, and the merge retired
the planner's `docs` artifact `42e1aca1` (successor `ff5f4f04`, landing
check `03e852f7`), although the answer had said that artifact stays
live. The rule is recorded: a head that deletes, moves or edits a file
under `docs`, `notes` or `apps/room/docs` that another actor published
names that directory in its own artifact filing.

BR-3 (`a97c7425`, 14:36) runs the Scope test project on two workers
without isolation. Two gates failed on one historical Lending story
(887 and 853 seconds whole, one failure each); the story now runs in its
own ordered one-worker project between the two-worker Scope project and
the one-worker denial project. The final gate passed in 882 seconds
whole (native 780 passed, 2 skipped) and serves as the after
measurement; the note records phase times before and after and keeps
both failed runs as separate outcomes. The cross-file cause stays
unknown and belongs to BR-4.

## What landed

- `d1c3622f`, 25 October 17:14: the 25 October sprint report.
- `575c113f`, 25 October 18:45: advisory notes and evidence warnings in
  the gate (`scripts/check-notes.mjs`).
- `9daa037e`, 25 October 22:34: an explicit restart after an archive
  source is unavailable; `sourceFailure` in the pass diagnostic.
- `6852f78d`, 09:36: certified rules for change publications (R7;
  findings 3.2, 3.3 and 3.4).
- `d36773b3`, 10:00: the R7 note qualifies its enforcement claim and
  records the retained limits.
- `986c7120`, 10:14: deployed migration histories protected while
  appended steps are allowed (BR-9).
- `197acc83`, 14:33: obsolete rename tooling removed; the Page names
  `DAP_HOME` (BR-10).
- `a97c7425`, 14:36: Scope tests on two workers with the Lending story
  isolated (BR-3).

## Deployments

All from reviewed heads, with existing settings kept, inventory read
before and after.

| Worker | Version | Time | Main | Change |
|---|---|---|---|---|
| `dap-grow` | `50243006` | 23:33 | `9daa037e` | source recovery |
| `dap-grow` | `e47aac4d` | 23:51 | `9daa037e` | Site restart directive |
| `dap-grow` | `38facfa8` | 00:09 | `9daa037e` | directive removed |
| `dap-grow` | `abed606d` | 14:38 | `a97c7425` | R7, BR-9, BR-10, BR-3 |
| `dap-demo` | `8962e21e` | 14:38 | `a97c7425` | same |
| `dap-lending` | `4b9afd11` | 14:38 | `a97c7425` | same |

The R7 verdict names no redeploy step: no setting changed, and the new
family cannot be created on a hosted Worker until the planner changes
the creation pins with the grow demo's cohort, after checking that the
demo repository's trees fit the certificate bound.

## Decisions

- A failed gate followed by isolated test-only repairs: the follow-up
  rule applies to each repair; two failures on one cause end the chain
  with a question or one ordinary gate at the exact head (`036e7f12`).
- The hardening head is the next platform version after R7. Register
  19, directory 18, rules 11 and destination 14 stay exact; destination
  15 is reserved; a new register, directory or rules version is allowed
  only if its data or rules change. BR-13 moves behind it (`e17cbaa4`).
  The builder plans to create register 20, directory 19, rules 12 and
  destination 15 (`f82aba22`).
- A certificate request interrupted by a concurrent entry gets a
  deterministic declined answer that names the entry; no kernel change
  (`e17cbaa4`, item 2).
- For BR-3 the instrumented ordinary gate is the measurement run; the
  before figures are the BR-9 gate and the R7 native run, each labelled
  by how it was taken (`cf0328ba`).
- The Lending story is isolated in its own one-worker project rather
  than diagnosed further (`29be9662`).
- A head that deletes, moves or edits a file under `docs`, `notes` or
  `apps/room/docs` that another actor published names that directory in
  its own artifact filing (`92278157`).
- The three Workers redeploy together from the day's last landing
  rather than waiting for the Room A row to finish.

## Filed

| Request | Owner | Work |
|---|---|---|
| `8d8eef89` | builder | R7 note qualification and limits; landed |
| `5e6d482c` | builder | R7 hardening: reuse, liveness, ceiling, wording |
| `499b2a80` | builder | measure and cut the finish-quote growth |
| `a455fdba` | planner | research note on agentic development practice |

The research note (`a455fdba`, head `c81b168d`, in review) compares
current development practice with the journey plan and records five
decisions that re-cut the journey: the rules say who lands, a finding
item joins the change lane, the agent wake joins J5, a membership version
makes roles data, and the exit test measures approvals, waits and
reverts. Plan 032's next draft follows its landing.

## In progress

- The hardening head: the new family compiles, the native race cases
  pass, and the ordinary gate failed once on the recorded archive
  authority hash in the entry-points test; paused at the restart with
  its worktree and evidence preserved.
- The capacity request `499b2a80`, to be refiled on a live base before
  the builder starts it.
- The research note review (`30d4cf83`).

## What did not happen, and why

- Room A did not reach its journal head. Its head is not recorded, and
  the row deferred at 24,334 before the day ended.
- The hardening head was not reviewed; the archive request preempts it.
- The journey (G4, J3) did not start; the review order holds.
- The R7 head waited five and a half hours between its checkpoint and
  its gate. Guidance now asks for one act per completed step and a
  question after an hour blocked.
- One 150-second read at 07:21 caught only cold objects; the hourly read
  stays at seven minutes.

## Commitments for the sprint ending 27 October, 17:00

- Measure and cut the finish-quote growth; deploy; read both rows.
- Land the research note and write plan 032 draft 3.
- Review and land the hardening head; decide the cohort pins after the
  repository size check.
- Continue the review slices from BR-4.
- Hourly surveys with a seven-minute read; the daily report at 17:00.
