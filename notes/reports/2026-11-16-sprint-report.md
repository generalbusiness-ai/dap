# Sprint report, 16 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 15 November to 17:00 on 16 November.
Twenty heads landed on `main`, and eight deployments followed. The
client now submits a draft with one call, and a session carries the
signer's standing. Each act has its own descriptor digest. A lost
Native timeout now fails the gate. The shared archive driver landed
and ran away: from 09:26 to 15:45 it drove about 1.5 million Durable
Object requests. A hotfix turned the archive off, and a bounded fix
is in progress. The cost-of-change review is below.

## Story: the archive ran away, and the hotfix stopped it

The shared archive driver (AE-1) deployed at 09:26 to every room
Worker. From that minute, `dap-lending` and `dap-grow` made about
250,000 Durable Object requests an hour, against about 3,000 before.
The owner saw the account total near one million at 15:41.

- The hotfix at 15:45 turns the archive wiring off in the room
  Worker. Requests per minute fell from about 2,150 to 0 on
  `dap-lending`, and from about 1,950 to about 48 on `dap-grow`,
  which is its level before AE-1.
- The hotfix landed on `main` as AR-1a at 16:34, after a full gate
  and a review, so a deployment from `main` keeps the archive off.
- The cause has two paths. A pass that returned before it wrote its
  wake left a past wake time in place, so the alarm fired again at
  once. A room whose archive target did not resolve retried every
  second with no backoff. Each pass read state from one shared
  object per Worker.
- The fix (AR-1) waits at least 60 s before any retry and doubles
  the wait up to one hour. A test counts alarms and calls for an
  idle room over a simulated hour. The archive returns in that head.
  After its deployment, the planner compares the request rate per
  minute with the rate that the note states.

No room archived its history from 15:45. Two October Workers,
`artroom-counting` and `artroom-rehearsal`, still make about 10,600
requests an hour. The owner decides their future.

## Story: the client submits a draft with one call

Client step C4 landed with E4-C. A member's draft goes to the scope
with one submit call. After a refusal, the client reads the scope
again only when the revision moved or the intent was bad. The act
environment note took its seventh amendment and four corrections:
one submit, the session's standing, the explore judge, one digest for
each act and the held reasons.

- EK-1 and ES-1: a session can carry the signer's standing. A client
  asks for it, and an older Worker answers without it. The planner
  ran the rolling pair in both orders at the deployment. Each order
  read the room, and an older client reads over a newer cache record
  by asking again.
- DD-1: each act has its own descriptor digest. The digest covers the
  act's declaration and the item types, rules and capabilities that
  the act names directly. A change to one act retires only the drafts
  and authorizations of that act.

## Story: the gate catches what it missed

- XD-1: a Native test that passes its time limit used to pass
  silently, because the abort crossed Durable Object contexts. The
  gate now names the test that owns each timer. A lost timeout fails
  the gate. A stale timer of a passed test is reported and does not
  fail it.
- CV-1: a pins stage compares the source hashes of the formal models
  with the mapped files. A drift fails the gate before any test
  stage.

## Story: Counter and Lending run in more rooms

- Counter 0.4.0 runs in the room `counter-witness` from 03:04, and
  its screen answers on `counter.inguz.space`.
- Lending 0.4.0 runs in the room `lending-shelf` from 07:19, with
  one donated tool. Its screen answers on `lending-shelf.inguz.space`.
- Lending 0.4.0 and Counter 0.4.0 were signed at 22:31 on 15 November.

## Cost-of-change review

- The archive runaway. Cost: about 1.5 million Durable Object
  requests in six hours, one emergency deployment, two heads (AR-1a
  and AR-1), and no archive from 15:45. The driver re-armed its wake
  on every return path with no floor. No test counted wakes, and no
  review read how often the driver wakes. The planner deployed four
  more times that day and read health and smoke each time, but never
  the request rate. Alternative: a wake floor in the shared alarm
  owner, so no driver can set a wake in the past; a call-count test
  for every alarm owner; and a request-rate read after each
  deployment, which the planner now runs. Revisit: yes. The AR-1
  head adds the floor and the test for the archive. A floor in the
  shared alarm owner is a later request.
- AE-1 gate attempts. Cost: three gate attempts (64 s, 1,807 s and a
  pass at 1,678 s) and two Node-alone catches. The causes were a
  stale node ceiling in an unrelated owner, a scanner fixture, a
  layer import and a helper that used forbidden delete flags.
  Revisit: no; the early pins stage and a Node run before START
  catch these classes now.
- C4 gate attempts. Cost: two failed attempts before a pass. The
  first failed at pins in 3 minutes: a client change moved the open
  presentation identifiers. The second failed in three cases: an
  import leak, an extra read after a refusal, and a tool list page
  over its budget by 1 byte. Revisit: no.
- Planner rulings on stated premises. Cost: two rounds. One ruling
  accepted exploration inside the fence on a premise that the source
  contradicts. One ruling named a wrong cause before the note was
  read. The builder caught the first before a gate, and a correction
  followed the second in 11 minutes. Alternative: read the source and
  the note before a ruling. Revisit: no.
- A watcher gap. Cost: 23 minutes for four builder acts, from a
  narrowed match. The watcher now matches every act. Revisit: no.
- The certificate helper. Cost: about 30 minutes of gate delay. The
  helper used forbidden delete flags; a two-path repair rode the head.
  Revisit: no.
- A retired smoke room. Cost: 3 minutes. The sandbox smoke still
  named a room that the identifier cutover retired. The smoke now
  uses the live Grow Site room. Revisit: no.

## Decisions

- The owner, 07:14: copy the Lending key for a second room; one
  submit for a draft; an exception for the derive layer.
- The owner, 15:41: reduce Durable Object consumption at once.
- Planner rulings: the fresh read after a refused act only for
  revision-moved and bad-intent; the session carries standing on an
  explicit ask; one kind per authorization key; the act digest stops
  at directly named item types; lost, stale and no-owner timeout
  classes, of which only lost fails the gate; the archive wake floor
  of 60 s with a doubling backoff to one hour.

## In progress

- AR-1: the bounded archive wake, its test, and the archive back on.
- CB-2: the Grow card keeps a held press across a refresh. A
  separate fix makes a layout test wait for the applied width.
- NF-7: the browser witness of the screens.
- FW-1: the fleet witness of the absence proof, which needs the
  owner's privileged steps.

## What did not happen, and why

- The room archive does not run. The hotfix turned it off at 15:45,
  and AR-1 restores it.
- The read of the `lending-shelf` projection through a browser. It
  waits for NF-7.
- The decision on `artroom-counting` and `artroom-rehearsal`. It is
  the owner's.

## What landed

| Commit | Head | Approval |
| --- | --- | --- |
| `53aeda16` | Step A design note with the owner's decisions | `db5e2062` |
| `7980a723` | Act environment note, fourth amendment | `7a05258f` |
| `0423bcd1` | Expired custody recovery, reservation refusal words | `1e7574bd` |
| `29c4fcc0` | Local Worker transport observation | `a6d8de26` |
| `7a6fcadf` | Early pin checks, Lending publisher, Local Worker smoke checks | `b8c2801d` |
| `e09addf0` | Room ownership, signed release trust | `90768710` |
| `cfe769ce` | Act environment note, fifth amendment | `89d1d2c4` |
| `91610da9` | E4 authorizations, A1 expected keys, CR-2 founder | `84dab659` |
| `67280592` | Act environment note, sixth amendment | `3d3ed3cb` |
| `3c8b8b8a` | AE-1 shared archive, Counter and Lending-shelf screen hosts | `a163da26` |
| `81065984` | AE-1 implementation note rewrite | `6ef018c1` |
| `d5f1cec9` | Act environment note, seventh amendment | `e35475ff` |
| `aa72a5b0` | Four corrections of the act environment note | `c55f1e8d` |
| `d6c863bb` | C4, E4-C and XD-1 step 1: one submit for a draft | `f3e211f3` |
| `5394563c` | XD-1 step 1b: the test that owns a timer | `7bc4ba09` |
| `06afc9d6` | XD-1: a lost Native timeout fails the gate | `458da5bc` |
| `9d69f807` | EK-1 and ES-1: the session carries the signer's standing | `6a0c1fb8` |
| `957b2755` | DD-1: one descriptor digest for each act | `a471c7b8` |
| `447e9b1a` | CV-1: a pins stage checks the formal source hashes | `9b145f03` |
| `e34c51df` | AR-1a: keep the room archive off on `main` | `07c2b4d7` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | Sandbox |
| --- | --- | --- | --- | --- | --- |
| 15 Nov 22:30 | `7a6fcadf` | `fcf48366` | `56943010` | `e016020a` | unchanged |
| 16 Nov 01:10 | `e09addf0` | `d14b9d06` | `80c76c21` | `fb4e78a4` | unchanged |
| 16 Nov 02:56 | `91610da9` | `7ccfe67c` | `a815c11e` | `70214bbb` | `12554b20` |
| 16 Nov 09:26 | `3c8b8b8a` | `3b2c2697` | `748ad041` | `ea337247` | `db2f75ab` |
| 16 Nov 12:42 | `d6c863bb` | `ccc7282c` | `a2240839` | `ef7fbf84` | unchanged |
| 16 Nov 14:53 | `9d69f807` | `c16e8706` | `4b6338c7` | `08935492` | unchanged |
| 16 Nov 15:32 | `957b2755` | `18b193dd` | `61df0799` | `7efb2c02` | `66dfbdf5` |
| 16 Nov 15:45 | hotfix `32866453` | `cef83935` | `70571e5b` | `694802f1` | unchanged |

Each row used `scripts/deploy.mjs` and wrote a receipt. Health and the
smoke command passed after each row. The 15:45 row deployed the
hotfix branch before it landed; AR-1a landed the same runtime bytes.

## Commitments from the 15 November report

| Commitment | Result |
| --- | --- |
| Land the absence proof with the reservation words, then sign Lending 0.4.0 and Counter 0.4.0 | Done at 22:31 on 15 November |
| Land the smoke classifier, and name the owner of the smoke failure | Done. The room-format classifier judged each new room retired; the smoke is green |
| Land the early gate stage for pinned values | Done |
| Land the publisher member's first slice | Done |
| Witness the shelf projection of `lending-library` with one donated tool | Partly. The shelf runs in `lending-shelf` with one donated tool; the browser read waits for NF-7 |
| Half-hourly surveys, the daily report and the worktree sweep | Done |

## Commitments for the sprint ending 17 November, 17:00

- Land AR-1, deploy it, and read the request rate for one hour after
  the deployment.
- Read the Durable Object request rate after every deployment.
- Land CB-2 and the layout test fix.
- Run the NF-7 browser witness and read the `lending-shelf`
  projection.
- Half-hourly surveys, including overnight. The daily report at 17:00,
  and the worktree sweep after it.
