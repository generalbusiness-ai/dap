# Sprint report, 31 October 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 30 October to 17:00 on 31 October. Sixteen
heads landed on `main`. One scratch room on a deployed Worker was
created and seeded, worked in a provisioned fork, had an agent's review
refused, took the owner's review, merged, published, and matched a fresh
clone. The script that does this has not landed, so a person cannot run
it from `main` yet. The J4 live witness reached the end of its setup
phase on the real provider. The three room Workers were deployed once.
The cost-of-change review is below.

## Story: the first complete repo-in-AI room

A third scratch room closed all 42 phases of the setup and seed runbook
on the deployed Worker, in about five minutes. An agent's review was
refused as unauthorized. The owner's review and the merge were accepted.
The merge published, and a fresh clone of the destination matched the
candidate in paths, modes and bytes. The workspace token ended with a
confirmed revoke.

This is one scratch run. One enrollment step stopped on its first try
for a reason nobody has found, and the runbook's continue path closed
it. A real room can meet the same stop. The whole slice has not landed.
Its review requests changes to the runbook and the note, with no change
to the code.

## Story: a repair found by reading, then proved live

Two earlier scratch rooms stopped when their workspace head operation
ended unknown. The telemetry from both showed nothing about why. While
adding diagnosis to that path, the team found that the check binding a
lane to its repository assumed one fact where the real register records
two: the outcome that sends the directory's creation, and the founding
act it names. The test fixture had scripted the assumed shape, so it
passed. On every room created through the real register, the check
failed and the head ended unknown without reaching the provider.

The repair reads both facts and binds them. Its test builds the lineage
through the real register rules, and forged-claim and unselected-outcome
cases are refused. The same head adds fixed-stage diagnosis at the
places that absorbed failures. The first approval of that head missed
that the diagnosis read an error's name twice, so a crafted error could
pass the allowlist and return other text. The builder found it before
landing, and it was fixed with a new gate.

After deployment, four head and fork operations in the J4 room were
confirmed on their first attempt, and the third S1 room passed the same
point. Neither original stop has a direct record of its cause, so the
mismatch is strongly supported and not proved for those two attempts.

## Story: the J4 witness, one try per room

The J4 witness signs real acts against a real room, so a halt can cost
the room. Its policy phase halted before sending anything, because the
operator used a variable before its declaration. A successor initialized
the policy, and enrollment followed. A read of the room after the
deployment stopped at a route that a room session may not read, and a
corrected read of four scopes passed.

Setup took five reviews of its source. The later reviews were decisive.
A fake transport had accepted acts that a real judge would refuse, so
the source would very probably have lost the room at its third act. The
team added a rehearsal that runs the actual operator against local
judges with a stand-in provider, and it found further defects. The live
run then closed in 44 seconds: all 14 acts accepted, both forks selected,
both setup tokens revoked, and nothing left over.

The witness is not finished. The holds that setup took have ended, new
holds come next, and the phases with real pushes have not run. Their
source is under repair after review. Most of those writes have no proof
under this Worker, and the provider's answers to some probes are unknown.

## Story: what a person and an agent see

Four slices of the local journey landed, and a fifth's witnesses. A
question can now ask named
people to approve a stated version of its text, and only a person can
approve or decide. A set of bounded reads tells a person what needs
them, what each agent holds, the context of one question, and what
changed since they last marked it reviewed. The Change card shows a
version's checks and reviews, offers a bounded diff, and binds each
action to the revisions the card displayed. An agent has a written loop
for waiting on a decision and resuming in a fresh session from the
record alone.

These rest on local tests and on a browser run of a corrected reference
host over fixtures. None of them runs on a hosted Worker yet, and the
render against a real room is owed. A destination token may not be able
to read an integration commit before merge. If so, the card's diff needs
a design change.

## Story: findings that hold a merge

The change lane has a new definition with a finding item: file, range,
class, severity, confidence, failure scenario, source and version. A
merge guard refuses while a finding from a required source stays open. A
finding is review input and never counts as a person's approval. No view
shows findings yet. By reading the code, a room on this definition would
lose its change cards until the view change lands. Nobody has run that.

## Story: rooms that share notes

The Commons source landed: notes, reference fields, and a separate Worker
configuration. Commons rooms can publish, and older rooms keep refusing
a package with a reference field. The hosted witness and the Worker's
provisioning remain to do.

## Story: reads that wait for a known head

Clients can name the head they require, and a read waits for it or
answers why it cannot. Below the archive floor, the archived answer comes
first.

## Story: a defect the test suite was reporting

A test that failed about one run in five looked like a timing race. It
was a production defect on the Node server. Once a request is collected,
a client's departure no longer reaches its signal, so a departed client
could close a session's live stream. A proposed test-only fix would have
hidden it, and it was dropped. The repair keeps the request reachable
until the check, and a new test fails without it. The same shape was
checked on the checker runner's origin and was not present there. The
hosted Worker runtime showed no such link in a limited probe.

## What landed

- `e3cb9fa8`, 30 October 17:31: the 30 October sprint report.
- `5068dab4`, 17:42: plan 032 draft 3.
- `871cdec9`, 20:36: S3, question approvals; 11 paths, 4 commits.
- `c8c7b631`, 22:20: BO1, Commons source; 120 paths, 11 commits.
- `0f0a949e`, 31 October 00:28: DX-A2, causal reads; 55 paths, 15
  commits.
- `9ad5ae93`, 01:24: S2, view kit witnesses; 5 paths, 6 commits.
- `23865f98`, 01:29: head outcome recovery design; 4 paths, 4 commits.
- `112eff12`, 05:44: lineage repair and head diagnosis; 16 paths, 10
  commits.
- `b1069bf1`, 08:13: S4, bounded reads; 42 paths, 27 commits.
- `e3e65a0b`, 10:00: lost-abort repair; 5 paths, 3 commits.
- `ed321125`, 10:30: control parser repair; 7 paths, 3 commits.
- `93a6b661`, 11:00: S5, agent wait and resume; 11 paths, 7 commits.
- `09420198`, 12:08: checker origin abort check; 3 paths, 4 commits.
- `a6b238fb`, 14:15: S6, Change card; 37 paths, 11 commits.
- `98fc1192`, 15:07: finding item; 12 paths, 6 commits.
- `074255e8`, 15:45: hosted reads for the agent loop; 13 paths, 8
  commits.

## Deployments

From a reviewed head, with existing settings kept; health checked after
the round. No lockfile, configuration or migration change.

| Main | Time | `dap-grow` | `dap-demo` | `dap-lending` |
|---|---|---|---|---|
| `112eff12` | 31 Oct 06:01 | `f48581f9` | `da13242c` | `24ee0dcf` |

The deployment carried S3, BO1, DX-A2 and the lineage repair. Publications
from `destination@16` that stayed refused can now become confirmed.

The Workers stay on this version until the J4 witness closes. S4, S5, S6,
the finding item, hosted reads and the lost-abort repair are on `main` and
not deployed.

## Cost-of-change review

For each notable landing: the cost incurred, the alternative that would
have cut it, and whether to revisit.

- J4 live witness (no landing). Cost: packets V10 to V15 and source
  through V12 in one day, with five reviews for setup alone. Several
  defects survived qualification because a fake transport accepted
  everything. Alternative: the rehearsal against real local judges at the
  first packet, and a shared capture for any further read. Revisit: yes.
  The third S1 room ran 42 phases in five minutes on an ordinary runbook,
  so the next witness of this kind should start from a runbook.
- Lineage repair (`112eff12`). Cost: two scratch rooms stopped, 16 paths,
  two full gates, a hold on J4. Alternative: a fixture built from the real
  register rules when the check was written. Revisit: yes; look for other
  fixtures that script a shape the real rules produce.
- BO1 (`c8c7b631`). Cost: 120 paths and a repair round. Landing it early
  forced DX-A2 to merge, regenerate two bundles and run a new full gate.
  Alternative: none cheaper; holding approved heads costs more as main
  moves. Revisit: no.
- S4 (`b1069bf1`). Cost: 42 paths, 27 commits, four gates, six review
  defects at its edges. Alternative: a test of each read through the real
  wire before the first gate. Revisit: no.
- S6 (`a6b238fb`). Cost: 37 paths, seven review items, one new gate.
  Alternative: settle the unknown-outcome exit before building the card.
  Revisit: yes, when the hosted witness shows whether a token can read an
  integration commit.
- Lost-abort repair (`e3e65a0b`). Cost: small, after a diagnosis that
  overturned a test-race hypothesis. Alternative: none. Revisit: no.
- Evidence retention. Cost: many sealed units, each with its own copier
  run and readback, for a scratch witness. Alternative: one retained
  capture format across phases. Revisit: yes.

## Decisions

- Fix the lineage check and deploy `main`, with the witness moving to the
  new Worker version (`90ee0518`).
- A question names its brief by digest in the record, and that brief stays
  fixed for the life of the question (`2c938074`).
- Lane history for a decision card reads up to 512 entries (`4a276240`).
- Approved source lands when it is ready (`f71e8a29`). The deployment
  at 06:01 replaced that ruling's hold on deploying, and the Workers have
  been held at `112eff12` since then until J4 closes.
- One try per scratch room, and no resume design (`2e2ccb6b`).
- Native retries run on fork, and head waits a stated window (`8f2f7140`).
- Holds that end are retaken in the same room, and the mint, push and end
  steps run as one command (`01b584e8`).
- Hosted sessions get `step` and `text`, so the agent loop can complete
  (`e63f921c`).
- Whoever lands checks the message's first line before landing
  (`dee246b9`).

## Filed in this sprint

| Request | Owner | Work |
|---|---|---|
| `a7d77a9b` | builder | MVP S4; landed |
| `de685cba` | builder | MVP S5; landed |
| `ddf2a597` | builder | MVP S6; landed |
| `4f3336c1` | builder | head diagnosis and lineage repair; landed |
| `0bcf9984` | builder | control parser repair; landed |
| `2fd85d18` | builder | lost-abort repair; landed |
| `fb3f71f5` | builder | checker origin check; landed |
| `d711f37d` | builder | finding item; landed |
| `e63f921c` | builder | hosted loop reads; landed |
| `f0bdea6f` | builder | head outcome recovery design; landed |
| `ca74f78b` | builder | reach omitted lanes; landed after the sprint |
| `eb4da1f1` | builder | views for the finding item; open |

## In progress

- J4 later phases: source V13, not frozen. The room, policy and enrolled
  agents stand. Nothing after setup has run live.
- Whole S1 head: changes requested on the runbook and the note, with no
  change to the code.
- Omitted lanes: one change requested at 17:00. It landed after the sprint
  ended, at 17:17 (`76cac675`).

Owed after J4 closes: the deployment, a hosted agent running the loop,
the S2 render against a real room, the Commons Worker and its witness,
and deletion of the leftover forks.

## What did not happen, and why

- The planner's surveys from 18:30 to 21:30 on 30 October did not run. The
  J4 policy halt waited four hours for its report.
- The planner planned an edit to a private binding that would have
  refused every later J4 phase. The builder's check of the source caught
  it before anything ran.
- Setup source V10 departed from a ruling on fork attempts, because the
  ruling was not read before the work began. The checker caught it.
- The checker's first approval of the lineage head missed the double read
  of an error's name. The builder found it, and the checker corrected its
  approval.
- The workroom resident was found down at 09:30 and restarted. Its cause
  is unknown.
- Two landing subjects passed 100 code points, at 147 and 588. Landings
  now check the message first, and later subjects are within the limit.
- The documentation rewrite did not land. Its follow-up has three small
  wording repairs requested since 22:47 on 30 October.
- The S1 summary 403s and the `enrol-checker` stop stay unexplained.

## Commitments for the sprint ending 1 November, 17:00

- Run the J4 later phases, once V13 is adopted, and close the witness.
- Deploy `main` after J4 closes, and run a hosted agent through the loop.
- Review and land the whole S1 head, then decide the real room.
- Land the views for the finding item.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after
  it.
