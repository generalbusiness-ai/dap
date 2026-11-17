# Sprint report, 17 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 16 November to 17:00 on 17 November.
Twenty-five heads landed on `main`, and fifteen deployments followed.
The room archive runs again, with a bounded wake. The Grow room
Worker now makes about 32 Durable Object requests a minute, against
49 at the start of the sprint. A member joined a hosted Counter room
from a browser, end to end, for the first time. Every deployment now
ends with a request-rate read from a repository script. The
cost-of-change review is below.

## Story: the room Workers cost a third less to run

An operator pays for each Durable Object request. The room Workers
now make fewer of them, and the project measures the rate after each
deployment.

- The room archive is back on. A failed archive pass now waits at
  least a minute before it tries again, and the wait doubles up to an
  hour. A test counts the alarms of an idle room over a simulated
  hour.
- A room with no archive target now records that fact and stops
  retrying. It checks again once a day.
- The scope index caches the answer "this scope exists" in each
  Worker instance. The index only adds rows and never removes them,
  so a cached yes stays true. An unknown name still goes to the index
  on every call and is refused there. A check fails the gate if any
  code path could remove an index row.
- Two Workers from October, `artroom-rehearsal` and
  `artroom-counting`, are deleted. Together they made about 10,600
  requests an hour. The Counter page on the project homepage keeps
  its card and drops its link to the deleted Worker.
- `scripts/do-rate.mjs` reads Durable Object requests per minute for
  each Worker, or for every Worker in the account. The deployment
  steps in `docs/operate-a-service.md` now end with that read.

One change in this work raised the cost before the next one lowered
it. The first fix for rooms with no archive target cleared its own
marker each time a room object started. The Directory then ran a
pass every minute. The rate read after that deployment caught the
rise within half an hour, and a fix landed in under two hours.

## Story: a member joins a hosted Counter room from a browser

A member opens an invitation link on `counter.inguz.space`, joins the
room, enrolls a device key, and sees the room's journal. The browser
witness ran that path against the hosted room and passed on its sixth
run. The five failed runs found four defects, and each one is fixed:

- The application gateway refused reads that name a minimum journal
  position. Every hosted browser join failed at its confirmation
  step. Installed screens can now send that minimum.
- A Counter device key was bound to the Worker's own address, while
  the page ran on the room's screen address. The key now binds to the
  room's service origin.
- The witness saved nothing on a timeout. It now saves the page text
  and a screenshot, and names the step and the request that stopped.
- One witness wait passed before the page reached the state it waited
  for. Each wait now polls the page.

Counter 0.5.0 and 0.6.0 were signed during the sprint. The room
`counter-witness` runs Counter 0.6.0, and its screen serves that
release.

## Story: Grow card controls stay in place

The Grow room's card no longer replaces its controls on each render.
A press held across a refresh still counts. The controls stay enabled
while the card reads in the background, and a "changed" notice stays
on screen through those reads. A layout test now waits for the card
to reach its applied width.

## Story: one act will upgrade an installed application

Each Counter upgrade today installs a new item and leaves the old one
active. The old item keeps its storage and its wake record. A
proposed design note, `notes/2026-11-17-application-upgrade.md`,
describes one upgrade act. A release that changes only its
presentation updates the installed item in place. A release that
changes behavior replaces the old item and closes it. The review adds
one condition: an in-place upgrade must keep the same publisher and
must name a release that the room's trust list holds. The project
accepted the design at the end of the sprint, and the first build step
is filed.

## Cost-of-change review

- The unbound-archive marker (AR-4). Cost: the Grow Worker ran about
  360 extra requests an hour for two hours, one more head (AR-5), and
  two gate attempts lost to another job's load on the machine. The
  marker was cleared by a call that every object activation also
  makes. Neither the head nor its review listed the callers of that
  call. Alternative: a review that changes a shared lifecycle call
  lists its callers, and a test re-constructs the object. Revisit:
  no; AR-5's test re-constructs the object.
- The scope index cache (AR-8, AR-9, AR-10). Cost: three heads, a
  reversal of a documented design choice, and two guards that read
  source text. The original design checked every call at the index
  to keep admission simple. The cost appeared only when the rate read
  named the index as half of the Grow Worker's load. Alternative: a
  per-object rate read in each review that adds a call on a hot path.
  Revisit: yes, if a future head adds a delete path to the index. The
  guards fail such a head, and it must then clear the cache.
- The hosted browser join. Cost: six witness runs and six invitations
  across nine hours, and four fixes across the gateway, the Counter
  release, the witness and its waits. Each defect lay on a path that
  no test had run against a hosted room with its own screen address.
  Alternative: run the browser witness against a hosted room before a
  release is signed. Revisit: yes. The witness now exists, and the
  next Counter release can run it before signing.
- Screen rows pin a presentation. Cost: each Counter upgrade needs a
  trust row, a new install, a screen head, and its own deployment.
  Alternative: the upgrade act in the proposal above. Revisit: yes;
  the design is accepted, and its first step is filed.
- A gate exception. Cost: one review round on RR-2. The planner let
  two scripts-and-docs heads skip the full gate, against the
  repository's rule. The checker refused the second head. The
  exception is withdrawn. Revisit: no.
- A missed review request. Cost: a notes-only head waited 18 hours.
  The checker's watch woke only on requests filed after it started,
  and a session restart fell between. The planner's survey found it.
  Alternative: the watch reads open requests when it starts.
  Revisit: yes.
- An audit in a public repository. Cost: two review rounds on AU-1.
  The first draft named Workers of other projects in a public note,
  and the fix sat on top of the first commit. The head is rebuilt as
  one commit. Revisit: no.
- A cold Worker after deployment. Cost: two minutes. The Lending
  Worker answered 503 to its first health checks after one
  deployment, and the smoke check failed. The rerun passed. Revisit:
  no.

## Decisions

- The owner, 16 November 18:10: delete the old October Workers.
- The owner, 17 November 10:07: delete `artroom-counting`, and keep
  the Counter card and page on the homepage with no link to it.
- The owner, 17 November 16:25: build the application upgrade act.
  Rooms that have no such act get it in a new room. A final scope
  status stays with definition succession.
- Planner rulings: a one-hour rate ceiling for the archive's return;
  rooms with no archive target record that fact and stop retrying;
  the scope index caches positive answers only, with a bound of 4,096
  entries per Worker instance; the full gate runs before review on
  every head that is not notes-only.

## For the owner

- Whether to delete Workers that the account audit (AU-1) marks as
  untracked. `dap-library-publication-final-1014` stays until the
  homepage library page and the Lending examples stop linking to it.
- The self-hosted fleet witness (FW-1) runs on this build Mac, with
  the owner at the administrator steps. Its preparation stopped on two
  findings in the host kit, and the owner's steps wait for them.

## In progress

- RR-2: a tracked baseline of each Worker's request rate, so that the
  rate read flags a rise on its own. It reruns its full gate.
- AU-1: the account Worker audit, approved as one commit.
- U1: the upgrade act in a new rules definition.
- AR-11: the Grow simulator drops a data session that it opens and
  never reads.

## What did not happen, and why

- The read of the `lending-shelf` projection through a browser. The
  browser witness ran on Counter first, and the Lending read was not
  scheduled.
- The self-hosted fleet witness (FW-1). Its preparation stopped on a
  certificate helper that uses forbidden delete flags, and on an
  installer that copies credentials outside the private fleet path.

## What landed

| Commit | Head | Approval |
| --- | --- | --- |
| `b0956c48` | AR-1: bound the archive wake rate, archive back on | `d2b46bf7` |
| `1e251f11` | CB-2: keep card controls in place across a render | `ef80413d` |
| `9d585505` | LW-1: wait for the applied card width | `f208865d` |
| `3a0daab0` | CB-3: card controls stay enabled during a read | `80e069dc` |
| `d3896041` | CB-4: keep the changed-card notice | `bf6dbbd8` |
| `356fcd11` | NF-8: save the failed Counter page in the witness | `3963edd3` |
| `830d134a` | GW-1: installed screens send the read minimum | `148cb9d2` |
| `ed2aaba1` | LC-5: trust Lending and Counter 0.5.0 | `9f5a65ca` |
| `c80e97b2` | AS-2: record why an archive pass stopped | `9a3128c3` |
| `f197a89d` | SH-2: screen serves the Counter 0.5.0 install | `0d152dcb` |
| `5ea5954f` | NF-9: name the step that stops an enrollment | `417b350e` |
| `66c70688` | NF-10: bind a device to the room's service origin | `868c4f8e` |
| `305342f8` | LC-6: trust Counter 0.6.0 and open 0.7.0 | `a55028f1` |
| `d910468d` | SH-3: screen serves Counter 0.6.0 | `7d291611` |
| `6b352dc2` | NF-11: witness waits poll the page | `435680c3` |
| `fc42cf3e` | PT-1: one projection parameter order | `258f6ccf` |
| `957e0ba4` | AR-4: an unbound room stops retrying its archive | `a4a71300` |
| `ecaaa9c7` | AR-5: activation keeps the unbound marker | `3368d5cf` |
| `a7acfdf2` | HL-1: drop the link to the deleted Worker | `df7c477f` |
| `b2477fd3` | RR-1: the rate read as a repository script | `8cf6ae4d` |
| `62b10b0f` | AR-8: the scope index keeps positive answers | `b389835e` |
| `f1322b1b` | UP-1: a proposed application upgrade act | `66e1c3fb` |
| `7af0952f` | AR-9: guard the cached answers beyond SQL | `98a4e3a5` |
| `29978aad` | AR-10: a kind answer also answers the plain question | `969f9074` |
| `eae5ce3b` | CV-1: the source-correspondence note in plain terms | `df3a935b` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | Sandbox |
| --- | --- | --- | --- | --- | --- |
| 16 Nov 18:31 | `b0956c48` | `e7517030` | `b906a88c` | `d20de38a` | unchanged |
| 16 Nov 19:59 | `1e251f11` | `9ed6117a` | `fdb04d03` | `d05886fc` | unchanged |
| 16 Nov 21:49 | `3a0daab0` | `954e06ca` | `41e30377` | `e1a2ed5a` | unchanged |
| 16 Nov 22:41 | `d3896041` | `3df6ba43` | `d8eca726` | `dc97575e` | unchanged |
| 17 Nov 01:13 | `830d134a` | `47835d70` | `5b2786f4` | `20f68c92` | `eb4d670f` |
| 17 Nov 02:43 | `ed2aaba1` | not deployed | `1d17df15` | not deployed | not deployed |
| 17 Nov 03:06 | `c80e97b2` | `fc8be51e` | `c753159f` | `52c0d4d3` | unchanged |
| 17 Nov 04:01 | `f197a89d` | not deployed | `c5f20551` | not deployed | `a206f610` |
| 17 Nov 06:28 | `305342f8` | not deployed | `96db0ab7` | not deployed | not deployed |
| 17 Nov 07:22 | `d910468d` | not deployed | `7f0b5192` | not deployed | `fdab72b0` |
| 17 Nov 08:45 | `fc42cf3e` | `81f8525c` | `d3373827` | `c435fbc9` | `2ce7a1ce` |
| 17 Nov 10:19 | `957e0ba4` | `b4f71eea` | `f182f313` | `5cee8282` | unchanged |
| 17 Nov 12:09 | `ecaaa9c7` | `cba55335` | `caef5097` | `327ce577` | unchanged |
| 17 Nov 14:28 | `62b10b0f` | `9de621ab` | `6b454407` | `5559f00b` | unchanged |
| 17 Nov 15:35 | `29978aad` | `df0881ad` | `bdae9f24` | `f90bf7a7` | unchanged |

Each row used `scripts/deploy.mjs` and wrote a receipt. Health and the
smoke command passed after each row. A request-rate read followed
each row. The homepage Worker `dap-home` took `a7acfdf2` at 13:27 on
17 November as version `e84b4d53`.

## Request rate of `dap-grow`

| After | Requests a minute | Note |
| --- | --- | --- |
| AR-1 | 49 | peaks of 121 at the archive backoff steps |
| AR-4 | 55 | the Directory ran a pass every minute |
| AR-5 | 49 | the extra pass is gone |
| AR-8 | 34 | the scope index cache |
| AR-10 | 32 | read from 15:37 to 15:52 |

The Grow demo runs a scripted fault cycle each hour. The minutes at
:10, :35 and :40 run above the floor by design. `dap-lending` and
`dap-demo` stay near zero between deployments.

## Commitments from the 16 November report

| Commitment | Result |
| --- | --- |
| Land AR-1, deploy it, and read the rate for one hour | Done at 18:31; the rate stayed under the ceiling |
| Read the request rate after every deployment | Done for all fifteen |
| Land CB-2 and the layout test fix | Done |
| Run the NF-7 browser witness and read the `lending-shelf` projection | Partly. NF-7 passed at 07:33; the Lending read did not run |
| Half-hourly surveys, the daily report and the worktree sweep | Done |

## Commitments for the sprint ending 18 November, 17:00

- Land RR-2 and AR-11, deploy AR-11, and lower the Grow baseline by
  the measured saving.
- Land the AU-1 audit, and build U1, the first step of the upgrade
  act.
- Read the `lending-shelf` projection through a browser.
- Read the Durable Object request rate after every deployment.
- Half-hourly surveys, including overnight. The daily report at 17:00,
  and the worktree sweep after it.
