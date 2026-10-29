# Sprint report, 29 October 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 28 October to 17:00 on 29 October. Eight
heads landed on `main`: the 28 October report, the boundary-objects
design note and its recut, the evidence-rules slice, the checker
recovery follow-up, the typed-definition readability pass, the public
SDK release closure, and the Mac mini host kit. One direct commit
changed the writing rules in `AGENTS.md`. The three room Workers were
deployed once each and run the 03:51 landing. The cost-of-change review
is below.

## Story: a check result carries its evidence choices

A room now records, for each check result, what the checker ran and
what the result may be used for. A result can cover staged work, a
landing, or a published tree. A later job can reuse a result for the
same tree instead of running again. An audit can pair two results for
the same tree and compare them. A failed published check holds the
item until a member with the triage grant clears it. Historical
definitions and the legacy admission limits are unchanged, so every
room that exists today keeps its behaviour.

The review found one defect before landing: a checker member with a
second signing key could claim a room-source job and strand it. The
repair keeps a lane claim provisional until the destination has
authenticated the exact marked key, and only an authenticated counted
notice settles the job. Three rulings settled how the slice is proved:
a repair that touches production code needs one further full gate at
the final head, a failed gate stays a failed row, and the evidence
manifest lists the files the note cites rather than every file in the
tree. The slice is deployed on all three Workers.

The checker runner that the journey's first slice added now ends every
run. An empty run directory or a corrupt record becomes `run-lost`
after a configured grace instead of leaving the job waiting; the record
is kept and no replacement run starts. An oversize claim is refused by
name, `claim-too-large`, as a check error that runs nothing. A failing
step that writes to stderr ends as failed, with the stderr preserved,
not as `run-lost`.

## Story: the first self-hosted room service on a Mac

An operator can now run the room service on a Mac mini. The kit adds
launchd units for the Worker and the celld store, a `down` command that
stops them in order, a script that mints an 825-day EC certificate for
the local origin, and a section "Run on a Mac" in the self-host guide.
Five witnesses run the kit end to end, including a shutdown that
preserves the store on the same node and recovers entry by entry. The
celld pin moves to v0.6.3. The builder holds an account with sudo on the
mini, so the next slice runs the kit on the real machine.

The next slice is in progress: on celld 0.6.3 the entry stream route
answers and ends at once, because RPC streams cannot cross isolate
boundaries yet. The page falls back to re-reads while the stream is
unavailable, and the celld limitation is recorded as a matter for the
store's owner.

## Story: the published SDK is whole again

The platform package has imported the Git package since 25 October, and
the public release plan excluded the Git package. Nothing noticed until
the authoring-skill item tried to build a real archive from the plan,
four days later. The closure adds the Git package to the plan as the
eighth public package with exactly two exports, the tree proof and the
checkout types, and keeps every other Git input private. The failed
archive witness is preserved beside the passing one. All eight archives
build locally and their digests are sealed. Nothing is published to a
registry.

## Story: a definition you can read

The typed-definition surface from last week's spikes was rewritten for
readability before the package is cut. A note records each change with
its reason, and a generated vocabulary page lists every helper with the
definition form it produces. A frozen copy of the surface before the
pass sits beside the new one so the diff reads in one place. The
authoring skill, now in progress, teaches from the vocabulary page as
its first artifact.

## Story: the record adds one act

The boundary-objects design note landed twice. The first version, on
the evening of 28 October, proposed a locator type, three acts in a
commons package, a consent rule on party slots, and recipes over
hashes. A walk through the use cases showed that one act carries every
case: a note, with text and an `about` list, plus a fragment string on
a reference. A view is a note. A party binds by the act it signs. A
closing is a note about the item's opening entry, and no item closes.
The recut landed at 16:48 with that mechanism and nothing else. Its
five slices are refiled: the fragment and the commons, views as notes,
parties by their own signature, the matter view, and views as code in
the sandbox domain.

## What landed

- `229a7c5b`, 28 October 17:32: the 28 October sprint report.
- `4eb0956d`, 19:29: the writing rules in `AGENTS.md`; 1 path.
- `8659af46`, 20:01: the boundary-objects design note, first version;
  1 path.
- `9e313eff`, 03:51: evidence choices for room and member check
  results, with the second-key repair; 132 paths, 90 commits.
- `41da9810`, 08:35: checker recovery terminal, failed stderr
  preserved, `claim-too-large`; 21 paths.
- `1f573145`, 11:26: the typed-definition readability pass; 41 paths,
  15 of them the frozen copy.
- `2be6ca74`, 15:36: the Git package in the public release plan; 9
  paths.
- `14ffb0f6`, 16:13: the Mac mini host kit (H3); 31 paths.
- `25930f62`, 16:48: the boundary-objects note recut; 1 path.

## Deployments

All from reviewed heads, with existing settings kept; health checked
after the round.

| Worker | Version | Time | Main | Change |
|---|---|---|---|---|
| `dap-grow` | `c26acbea` | 04:33 | `9e313eff` | evidence rules |
| `dap-demo` | `cbede705` | 04:33 | `9e313eff` | same |
| `dap-lending` | `8c217ab8` | 04:33 | `9e313eff` | same |

The five later landings change no Worker code, so no deploy followed
them. Several first health probes after an idle period answered
`register: unavailable` and were ready on the re-probe, as on the two
previous days.

## Cost-of-change review

For each notable landing: the cost incurred, the alternative that
would have cut it, and whether to revisit.

- Evidence choices (`9e313eff`). Cost: one head of 90 commits and 132
  paths across four packages; two failed gates and a four-file repair
  that needed a further full gate; one changes-requested review for a
  second-key defect that the witnesses had not covered; a merge
  subject of 771 characters. Alternative: three heads, the choice
  model, the reuse and audit pairing, and the published-failure hold,
  each with its own witnesses, so the key defect surfaces in the
  smallest one. Revisit: no code; smaller heads, and the two
  non-blocking points (a read before authorization, a re-mark that
  revives a pass) go to the next slice.
- Checker recovery (`41da9810`). Cost: one ruling on the name of the
  oversize-claim refusal; otherwise the planned follow-up. Alternative:
  none. Revisit: one point remains, a record for a different job waits
  one grace before it is lost; it goes with the next checker slice.
- Readability pass (`1f573145`). Cost: 15 of 41 paths are a frozen copy
  of the surface before the pass. Alternative: the diff as a commit
  range in the note, with no copy. Revisit: yes, delete the copy when
  the package lands.
- Release closure (`2be6ca74`). Cost: a four-day gap between the import
  that broke the plan and its discovery, then one head of 9 paths. The
  release-module witness exists but is not in the test list, so the
  gate does not run it. Alternative: the witness in `scripts/test.mjs`
  from the day the plan was written. Revisit: yes, add it; a head that
  imports outside the plan then fails its own gate.
- Mac mini host kit (`14ffb0f6`). Cost: 31 paths and one ruling on the
  shutdown witness. The review left four points: the restart order
  after `down`, no upgrade path, a unit that leaves celld stopped after
  any clean exit, and an unauthenticated shutdown route on loopback.
  Alternative: none for the kit. Revisit: yes, the four points go into
  the next self-host slice.
- Boundary-objects note (`8659af46`, `25930f62`). Cost: the first
  version landed with four mechanisms and four filed slices; the recut
  twenty hours later kept one act and a fragment, retired the four
  slices and refiled five. Alternative: walk the cases before landing
  the first version. Revisit: no; the recut is the design, and the
  method is now the rule for design notes.

## Decisions

- A repair outside the follow-up exception takes one further full gate
  at the final head; failed gates stay failed rows (`31962e1f`).
- The evidence manifest lists the files the note cites; a cited
  directory appears once with its count, bytes, and digest
  (`4e199bd8`).
- An oversize claim ends as a check error with the signed reason
  `claim-too-large`; `run-lost` is not used for it (`57876548`).
- The readability pass goes before the authoring skill; the planner
  files the next self-host slice (`03d1ac0e`, `c2ba0bd7`).
- The Mac kit's shutdown witness is a same-node preserve with the
  celld completion signal; peer handoff is a later slice; the celld pin
  moves in the head (`9fe109e9`).
- The authoring skill ships in the platform package; the command-line
  package stays private (`97c503ba`).
- The Git package is the eighth public package with two exports, and
  the closure goes before the skill's archive witness (`2058b896`).
- The five boundary-objects slices take the slots of the four they
  replace; the fifth follows the second (`1f28e2c4`).
- A landing subject stays under 100 code points, then a blank line,
  then the paragraph (`5253552d`).

## Filed

| Request | Owner | Work |
|---|---|---|
| `a53e1464` | builder | evidence-rules first slice; landed |
| `25b40ad2` | builder | checker recovery follow-up; landed |
| `addbe5b4` | builder | readability pass; landed |
| `cd31231e` | builder | public SDK release closure; landed |
| `cbcadd7f` | builder | Mac mini host kit; landed |
| `bc4aa093` | planner | boundary-objects note recut; landed |
| `5874b15d` | builder | page stream fallback; promised |
| `c9d4e517` | builder | DX-A1 authoring skill; promised |
| `41f77a01` | builder | BO1 the fragment and the commons |
| `c4ccdba6` | builder | BO2 views as notes |
| `bac8cd04` | builder | BO3 parties by their own signature |
| `a7065426` | builder | BO4 the matter view |
| `4497f7c8` | builder | BO5 views as code |

## In progress

- The page stream fallback (`5874b15d`), in its gate.
- The authoring skill (`c9d4e517`), whose archive witness is unblocked
  by the release closure.
- Plan 032 draft 3, which files J4 and the first MVP slices.
- The agentic-practice survey note recut (`c81b168d`), unchanged, in
  changes-requested.

## What did not happen, and why

- Plan 032 draft 3 did not start; the day went to the evidence-rules
  landing, the self-host filings, and the release closure.
- The whole-scope capacity item was not filed; it waits for the
  measured ceilings.
- The shared checkout was dirtied twice by an unreviewed package
  install from a process outside the workroom, at 11:00 and 16:32. The
  planner restored it both times; the owner is not identified.
- No Room A plan pass was captured; no new entries arrived.

## Commitments for the sprint ending 30 October, 17:00

- Land the page stream fallback; deploy.
- Land the authoring skill.
- Plan 032 draft 3 with J4 and the first MVP slices.
- File the whole-scope capacity item and the release witness in the
  test list.
- Hourly surveys; the daily report at 17:00; the worktree sweep after
  it.
