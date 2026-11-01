# Sprint report, 1 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 31 October to 17:00 on 1 November. It lasted 25
hours, because clocks went back overnight. Forty-two heads landed on `main`,
counting the previous report, and the three room Workers were deployed twelve
times. A person read a real change's diff and interdiff in the desktop AI app
for the first time. A request signed on one device can now be settled from
another. A script drove a hosted agent through the whole work-on loop. The real
repo-in-AI room exists. J5 is not accepted: a person returning to a room still
has no list on the Page of everything that needs them. The cost-of-change
review is below.

## Story: reading a change in the desktop AI app

A reviewer can now open a change in the app as a card and read its diff, an
interdiff from an earlier version, and a file. Each view names the exact
commits it shows. When a new version moved its base, the interdiff says which
files the change edited, which the new base changed, and which it cannot
separate.

The first scripted run passed on the real room. Then a person tried it, and the
card failed in ways no script had shown. The app refused the card, because each
resource declared a sandbox domain the app does not accept. Next, the app
starts each local server twice, and the card's calls reached a process that did
not hold its view. Then a press took 11.6 seconds against a 10-second limit,
and every later press was refused. A person's session found each one, and each
was repaired the same day. A later session ran a slowed press of 37 seconds,
recorded Request changes, and opened the Needs you, Work and Decision cards.

The commit match rests on one screenshot and on the person's word. The press
past the 120-second wait did not occur in the app, so its recovery is shown by
test only. The person also found the diff hard to read: nothing collapses, and
additions and hunk headers look alike. A design request is open, and renders
come before any build.

## Story: a signed request survives a lost reply

A person's act now keeps its signed request where their other device can reach
it. If a reply is lost, the second device settles the request, and nothing goes
twice. `dap mcp` keeps requests the same way. Following the words led to a real
path: after a reload in an outage, a page with no lock could send a second
request under a new key. A browser probe on a local Worker showed two comments.
After the repair, the page reads the open requests before each keep, and the
same probe shows one. No browser has run that lock on a deployed Worker.

The messages changed too. A hundred and forty-four lines that said "nothing was
sent" were sorted, and seventy-one were corrected, because a person who
believes that sentence can send again.

## Story: an agent runs the loop, and a person wakes it

A script drove one hosted agent on a deployed Worker: it took terms, asked,
requested approval, blocked, waited, accepted a person's decision, and
proposed. Fourteen sessions used only the hosted tools and the record. The
endpoint was open for this run for 29 minutes and is closed again. No model
chose a step, so the run says nothing about a model.

`dap issue wait` now wakes a stopped agent from the room's own stream, with no
webhook. On the deployed Worker it held for 822 seconds through a reconnect and
woke 958 ms after a decision, in one sample. The Page now shows an issue's
questions, and offers Approve and Decide with their values filled in. The
deployed run shows the remaining gap: a person must open each issue to find
their items, so J5 stays open.

## Story: the real room, and two people's devices

The real repo-in-AI room was created and seeded on `dap-demo` with one script
of 42 phases. J4 closed before it: two agents pushed to their own forks, a
token stopped when its hold ended, and a change published from the chosen fork.
`dap join` now takes a device link, so a person can put a second device under
the command line. `dap verify` now works in any room on a shared register. It
takes other rooms' creation results on the service's word, and the report says
how many it took.

## Story: what a stolen key keeps

A trace set out what a revoked key can still do. Its signed reads last up to
1,200 seconds plus any clock difference. Its acts can still be accepted for up
to 300 seconds of that. A Git read token it took lasts until the token expires,
up to 24 hours on Artifacts. `docs/security/` now says all of this, with an
operator's steps.

A key named in a compromised notice now gets no new read token, in every room.
Two calls on real Artifacts repositories showed that revoking by ID works at
once for new requests, and that a clone already running finishes anyway. No
real host token has met the refusal. A token already taken stays good, and a
stolen founder key cannot be removed from a register. Designs for both have
landed, and neither is built.

## Story: a host outage can close a register

A test showed that 64 claims whose attempts fail close a register for good:
every later `found` is refused, and the host's return does not reopen it.
Existing rooms keep working, and the way out is a new register. The words and
the docs now say so. The repair needs a new set of definition versions, and
that work is filed. `dap-demo` holds 12 claims, and by a count of its log rows
none is pending.

## Cost-of-change review

Each entry gives the cost, a cheaper path if one existed, and whether to
revisit.

- Card kit in the app (`54b07a94`, `237d61a6`, `4f9f49a5`). Cost: three repairs
  and three person sessions, for faults in a kit that landed on 18 October.
  Alternative: one person's render on the day the kit landed. Revisit: yes; a
  view must run in the real app before its acceptance is written.
- The "nothing was sent" words (`cf617842`, `b0af01d2`, `2950cfb5`,
  `d2e6c82c`). Cost: four heads and 70 paths, after one false sentence. They
  found the page lock path, so part of this paid for itself. Alternative: one
  sweep at the start. Revisit: no; follow-ups are now held and grouped.
- J1 (`aaf37467`). Cost: 38 paths, 18 commits, three review rounds. The fence
  rule was wrong twice at its edges. Alternative: state the fence's table in
  the design. Revisit: no.
- Founder key refusal (`991129fc`). Cost: 46 paths, and no room uses it. Only a
  hand-built `found` reaches that shape. Alternative: hold it for the next set
  of versions. Revisit: yes; it ships with that set.
- Twelve deployments. Cost: each opens a window of some minutes, and nobody
  read the telemetry for any of them. Alternative: batch unless a person waits
  on a head. Revisit: yes.
- S1 (`b686862e`). Cost: 53 paths and 20 commits. It then ran the real room at
  the first try, with two timing stops. Alternative: none. Revisit: no.
- Hosted witness (`8ae17cb2`). Cost: 21 paths, two run approvals, one defect
  found by its author. It ran once and passed. Alternative: none. This is what
  a runbook-first witness costs. Revisit: no.

## Decisions

- A revoked key keeps its signed read for the bound. A scope does not ask
  membership at read time (`6d96e044`, `40ea8fdf`).
- A key named in a compromised notice gets no new token. A token already read
  needs a design (`5f36be81`).
- The next creation versions carry the failed claim's state, the founder key
  refusal and the one-hour token together (`cccd205a`, `908b6d86`).
- No change to how sends behave after a failure. It reopens if a register holds
  more than 10 pending claims, or a real outage leaves pending claims
  (`9af818a5`).
- Any member with a read token can fetch a staged commit (`afaa217a`).
- `dap verify` takes other rooms' results on the service's word, and says so
  (`578e8ca5`).
- J5 stays open until the Page has the room's list (`c636e33d`).
- A head that touches the card's paths cites the card workflow's run
  (`0998f9ec`).
- S2's desktop acceptance closes, except the actor on a card, which stays owed
  (`49816870`).

## In progress

- The session's seven findings: Needs you still says Merge after changes are
  requested, raw JSON on an opened item, unclear work rows, internal labels,
  the decision card's extra step, the Reply box over the buttons, and an empty
  card's words.
- The Page's room-wide list, then J5's deployed run.
- The diff's readability design, with renders on real answers.

## What did not happen, and why

- The planner told a person that a revoked key's read ended within 900 seconds.
  The builder's test showed two ways to renew it, and the bound was 1,200
  seconds.
- The planner ruled that an operator must remove a stolen key from a register's
  founders list. No act does that. The builder found it, and left the sentence
  out.
- Five planner acts needed a correction: a time, a credit, a file that exists,
  a Worker's health and a builder's report. Most were written before the result
  was read.
- J5's note said the second device lists both items on the Page. Nobody had run
  it, and the deployed run failed there.
- No person ran the card kit in the app between 18 October and today, so the
  three app faults surfaced at the last step of J2.
- Several landings have no gate on their merged tree. The checker compared
  paths and ran the owning tests in each case.
- `dap-grow` answered `register` unavailable at 14:35 and 17:00 on a first
  probe, and ready soon after. The cause is unread.
- Nobody deleted the leftover forks of the J4 run, and no Commons Worker is
  deployed.

## Commitments for the sprint ending 2 November, 17:00

- Land the seven findings, and the actor on a card.
- Land the Page's room-wide list, deploy it, and close J5's acceptance if the
  run passes.
- Land the diff design, and show its renders to a person before any build.
- Land the next creation versions' design, or say what holds it.
- Delete the leftover forks.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after it.
