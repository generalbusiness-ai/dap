# 032: The journey as acceptance target

Status: current, draft 3 (30 October 2026). Section 2a is done: A2 and A3
landed to the fixture-only cutoff (`0e63ba92`, `6dac9c76`, `fd198c72`), the
Judge at `02a91803` and the capacity budgets at `62423347`. Section 2b is
the main line: J3 landed at `06e4d33f` (28 October) and the evidence-rules
slice that uses it at `9e313eff`; J4's source landed at `5dc9765f` (30
October), is deployed on the three room Workers, and its live acceptance
witness is in progress (section 2b). MVP S1 runs in scratch (`449c58c7`),
S2 is promised (`69080f12`), S3 is filed (`7951d998`). The views-design
gate of section 4 is open. In section 2c, M1 moved to plan 033 and landed
(`feccbbcf`, `bfa02edd`, `ad39fdf1`); hosted Counter agents are designed
(`5cfbaae7`) and not built. The archive runs on the hosted `dap-grow`
Worker (plan 033, 25 October 2026).

Planner, 17 October 2026. A sequencing plan. It commissions nothing; each
piece below needs its own request. Source facts cite `path:line` at main
`698a3d713`; status facts in draft 3 cite landings on `main` and acts in
the workroom.

## 1. Direction

The project's direction: flexible shared workroom surfaces inside the
person's AI chat app, supported by cloud-hosted agents and by connections
to other people, built into an offering people can rely on for real work.

One journey is the acceptance target for the next stretch of work:

1. Start a repository change and hand it to cloud agents.
2. Leave, and return from another device.
3. See what needs you, and why.
4. Inspect the diff, steer the work, and get review from the people you
   asked.
5. Confirmed publication.

The journey runs in the desktop AI app, through MCP Apps views, on the
existing deployment. Development needs no new deployment; the hosting
deployment changes when a piece needs it, after its review. The journey
extends
[the MVP plan](../2026-10-16-repo-in-ai-mvp-plan.md) (slices S0 to S9)
and the earlier browser plan
[005](005-2026-10-03-browser-cloud-work.md) (its line 10 states the same
experience).

## 2. Order

*Changed on 18 October 2026 by
[plan 033](033-2026-10-18-grow-room-demo.md): after section 2a, the grow
room is built as the demo before section 2b, and M1 moves from section 2c
into that line. Section 2b resumes at J3.*

*Changed on 28 October 2026: the journey goes first. From J4 onward the
builder order is J4, S1, S2, S3, S4, S5, S6, the reads that wait for a
head (DX-A2), J1, then the typed-definition and kernel items, the
boundary-objects slices, S8, S9, J2 and J5 in the slots that the order
act `a249511f` records. S7 is replaced by J3. S0 is disposed by J4's
first hosted witness.*

### 2a. Finish and stop

- **Archive, to "clone, disconnect, verify to a cutoff".** The internal
  layout (slice A1) landed at main `698a3d713`. Still owed: the Git source
  and clone replay (A2), and the writer (A3), with a local witness that
  clones an archive, disconnects, and verifies history through an explicit
  cutoff (`notes/2026-10-09-shared-language-volatile-acts.md:1824-1838`;
  `notes/implementation/2026-10-17-archive-layout.md:349-357`). Stop there.
  The boundary of this milestone: the local writer, clone, disconnect and
  verify witnesses use synthetic histories or explicitly reviewed fixture
  histories only. Writing a real room's history needs, before any body is
  selected or exported, configured admission of the cohort, inline and
  foreign data (`packages/git/src/archive-policy.ts:1-2`;
  `packages/scope/src/archive-inventory.ts:16-25,59-67`), and the room's
  permission, consent and disclosures
  (`notes/2026-10-09-shared-language-volatile-acts.md`, sections 15.2 and
  15.10). No real policy is configured today
  (`notes/implementation/2026-10-17-archive-layout.md:349-357`), so this
  milestone writes no real history. The read client (A4), the live run
  (A5), broader export, progress and G1 wait; when real history is
  archived, those safeguards come with it, not after it.
- **Observability, then capacity.** Retain and count landed at `e444edf8e`,
  and See (status and health) at `aeebc18cb`. Judge, the third head, is in
  flight on `request/observability-judge-e6c4`
  (`notes/2026-10-12-observability-design.md:529-580`). Then the capacity
  limits: the native judge checks entry budgets, but judging against the
  budgets for bytes, items, records and pending requests is still
  outstanding (`docs/scopes.md:824`). Stop when those four are judged.

### 2b. Main line: the journey

The journey is MVP S0 to S9 plus five pieces, J1 to J5. The MVP plan's
slices keep their scope and witnesses. The five pieces close the gaps
that plan left out or that plan 005 named.

**Where the MVP slices stand (30 October).** S0 is disposed by J4's first
hosted witness, which probed the deployment and the host. S1 (`449c58c7`)
creates and seeds the room; its scratch run has the owner, the room and
four enrolled identities, and continues one closed phase at a time. S2
(`69080f12`) is promised: MCP Apps plumbing and the four views on the card
kit that landed at `6e309b6b`. S3 (`7951d998`) is filed: questions with
requested approvers, people only, as a declared successor of the issue
lane. S4, S5 and S6 are filed when the slice before each is promised. S7
is replaced by J3. S8 and S9 follow J1.

**J1. Signed requests that survive a reload or a device switch.**
Today, an ordinary page act keeps no copy of its signed request. After an
`unavailable` or `mismatch` answer the page says: "Recovery requires the
same signed envelope; this page does not retain it"
(`apps/room/page/src/view.ts:219`). The page keeps custody only for join,
start and connection requests (`apps/room/page/src/join-custody.ts`,
`start-custody.ts`, `connection-custody.ts`). The local MCP server keeps
every signed envelope before it sends it (`packages/mcp/src/custody.ts:1-25`),
but on files on one machine (`packages/mcp/src/node.ts:13,120`). The hosted
endpoint's hosted-store custody serves agents, not people
(`packages/mcp/src/hosted.ts:1-27`). J1 keeps the exact signed request of
every person's act where the person's other device can reach it, and lets
that device settle it without signing a new one. *Done when* a request
sent from one device, with its reply lost, is settled from a second device
after a reload, and nothing is sent twice. *Depends on* MVP S6 (the `at`
binding and `settle`), and on the reads that wait for a head (DX-A2,
`1c124ebf`), which give the second device a read that answers once the
settling head has arrived (rulings `22bf9af5`, `261004b1`, `366b3989`).

**J2. Immutable file, diff and interdiff views.** No diff exists in the
page or in MCP. The page shows the file of a one-file proposal only; for a
Git tree it says "File preview is not available yet"
(`apps/room/page/src/view.ts:133-142`). J2 adds MCP App views of a file
at an exact commit, a diff between two exact commits, and an interdiff
between two versions of one change, each bounded and labelled "truncated"
over its bound. Browser parity is optional. *Done when* a reviewer in the
desktop AI app reads the diff of version 2 and the interdiff from version
1, and both name the exact commits they show. *Depends on* MVP S2 and S6,
and the MCP Apps views design (section 4).

**J3. A real checker runner adapter.** Landed at `06e4d33f` on 28 October,
with a follow-up at `41da9810` that ends every run: an empty or corrupt
run record becomes `run-lost` after a grace, an oversize claim is refused
as `claim-too-large`, and a failing step keeps its stderr. The
evidence-rules first slice landed on it at `9e313eff` and is deployed.
What J3 was: the checker service defined `Runner` with no adapter for a
real runner (`packages/checkers/src/service.ts:110-115`). J3 is that
adapter, built once and shared: one fresh container per job, no network
but the read-only gateway, signing outside the container. It replaces MVP
S7's local stand-in. *Done when* a real check runs on a proposal's exact
tree, a failing test blocks the merge, and a result for another tree is
refused. Those witnesses passed before landing.

**J4. A production workspace fork and credential adapter for holds.**
Source landed at `5dc9765f` on 30 October: hold version 2 records the
workspace, its setup credential and that credential's revocation; Issue
and Change profiles for J4; an Artifacts workspace adapter; custody
witnesses and three security seals. Hold version 1 and the lane pins keep
their meanings. The three room Workers run that head since 11:31. The
live acceptance witness runs against the deployment in phases, each as
one reviewed command with a collector: the two agent identities are
prepared, the inspection of the room, its policy and the source binding
is complete, and the scratch policy for the room is adopted (`84be575c`).
Policy initialization, the fork per hold, the credential revocation and
the chosen publication are the remaining phases. Plan
[029](029-2026-10-11-artifacts-forks.md) designs the adapter. *Done when*
two agents each push to their own hold's fork, a token stops working when
its hold ends, and the change publishes from the chosen fork, on the
deployment (ruling `241248a9`: land, deploy, then witness). J4 is also
the base for hosted agent teams working on a repository.

**J5. The smallest attention loop.** The inbox holds attention items but
"No send leaves it, no timed rule exists and no entry starts a task"
(`packages/platform/src/inbox.ts:3-5`). J5 is one room's "needs you" view
with three clear reasons on each item: what needs me, why it is mine, and
what will settle it. Catch-up must be reliable: after any absence, the
view shows everything that changed since "mark reviewed". Reading an item
stays distinct from completing the work it asks for
(`notes/2026-10-01-wake-and-schedule.md:46`). It builds on MVP S4. *Done
when* each item names its rule and the act that settles it, reading an
item leaves it open, and an absent person returning on another device sees
every item that arrived. *Added in draft 3:* the agent wake is part of
J5. An agent that waits on a person is woken by an authorized event feed
from the room, with no webhook, and resumes its work; this lands before
the exit test (section 2f, decision 3). Schedules and webhook conditions
come later. *Depends on* MVP S2, S3 and S4, and the views design.

### 2c. In parallel

- **Hosted Counter agents**
  ([contracts](../2026-10-15-hosted-counter-contracts.md), slices in
  section 8). Today the `agent-team` scope has a fixed reference to one
  Counter (line 122). Build the agent setup (count, role, model, and a
  workspace field) so it can later point at the repository room
  without a new scope. *Order, 20 October:* the Counter team and then the
  Room team come right after the journey; the hosted endpoint's OAuth
  comes after them.
- **M1, developer and install halves**
  ([self-contained applications](../2026-10-15-self-contained-applications.md),
  section 7, lines 328-337):
  publish an app, install it into another host without changing that host,
  and use it through the browser and MCP. S8 uses M1 if it is ready. *M1
  landed* in plan 033 (`feccbbcf`, `bfa02edd`, `ad39fdf1`).
- **Roles as viewpoints** (`da5e9791`, planner). Participants are present
  because of a role, and a role is a viewpoint with its own description
  note: for a person, text and requirements; for an agent, skills and
  prompts. Authority stays in membership. One planner head amends the
  roles note and the notes that follow from it, after the membership
  version that makes roles data (section 2f, decision 4) and before the
  second roles-and-instances slice. S3 stays people only; the viewpoint
  amendment does not change which identities decide an ask.

### 2d. Exit test: a bounded real working sprint

Run the journey for one bounded sprint on a repository the team needs to
change, as a software-development loop with a few remote participants.
Include a newcomer and a fresh agent that gets only the guide and the task.
The cloud agents may be dap-hosted agent teams or agent sessions running
elsewhere with their own agent keys (MVP section 1.1); either counts.

Measure what plan 022 names
([022](022-2026-10-06-self-hosting-measurement-and-lane-simplification.md),
section 2, line 30): acts used and by whom, refusals by reason, retries
before success, intentions never completed, and stalls with a note for
each. Apply its stop rule (line 22): if the hosted run blocks the
repository's work for more than one sprint, the work returns to plain Git
and the block becomes a platform request.

*Added in draft 3.* The exit test also measures, per change, the human
approvals, the wait on a person, and the reverts; the room's landing
policy has one tier-0 extent with zero approvals and a person's merge, and
a revert is a link kind (section 2f, decision 5). The rules of the room
say who lands; the exit test's rules require a person.

*Candidate, not decided.* The repository under test may be this project's
own development, run on a self-hosted room service so that the loop that
produces the software also exercises it. What that needs beyond the
journey: a Git host for the self-hosted service (the Git host choice note
at `053c5595`, slice G3), the operator tooling that today runs as reviewed
packets, and a runbook. The decision waits for the J4 witness to finish
and for G3 to be filed.

Decide simplifications only after measuring. That includes the earlier
proposal to remove 36 acts by merging `-own`/`-any` pairs (line 64).

### 2e. Deferred until measured

- **Carrying review approvals to later versions.** The original design
  lets a verdict count for a later version under a `carry` rule
  (`notes/2026-10-01-artroom-plan.md:524-560`). The current merge guard
  counts approvals and change requests only for the exact current
  manifest (`apps/room/lanes/src/change.ts:1290-1306`). Changing who is
  eligible is high risk. The sprint will show whether re-review costs
  enough to justify it. Check reuse follows J3, inside evidence rules.
- **Passkeys.** Needed before any offering to outside users. Not urgent.
- **After the exit test measures:** the destination version with two
  landing routes and the evidence rules in one cohort change, the
  membership version that records reviewer agents apart from approval,
  and parallel reservations (section 2f).

### 2f. The journey re-cut of 26 October

The agentic-practice survey note (`a455fdba`, in review at `c81b168d`)
reads current practice in agent-assisted development against this plan
and records five decisions. The journey as first cut measured a
people-only loop. The decisions, and where each lands:

1. The rules say who lands. The exit test's rules require a person; the
   landing policy's two routes replace a built prohibition. Lands in the
   exit test's room rules (section 2d).
2. A `finding` item joins the change lane: file, range, class, severity,
   confidence, failure scenario, source and version, tree; open, resolved
   or irrelevant. A merge guard refuses on open findings from a required
   source. Data only. Lands as its own slice at J3's position, after the
   grow room's G4.
3. The agent wake is part of J5 and lands before the exit test (section
   2b, J5).
4. The membership version that makes roles data: trusted authors, and
   reviewer agents recorded apart from approval. Filed as a design now;
   built after the exit test measures (section 2e).
5. The exit test measures human approvals per change, wait on a person,
   and reverts; one tier-0 extent; revert as a link kind (section 2d).

The note's own landing settles the wording; the decisions govern filing
from now.

## 3. Where the review items land

| Review item | Lands in |
|---|---|
| 1. Finish the development loop, with interruption and return | 2b: MVP S0–S9 with J1, J2, J3, J4 |
| 2. Attention that leads to action | 2b: J5 with the agent wake; notification next |
| 3. Carrying review evidence | 2e: deferred until the sprint measures re-review cost |
| 4. Archive that survives the service | 2a: stop at clone, disconnect, verify to a cutoff |
| 5. Feedback from real use to simplification | 2d: the exit test |
| 6. The app as a developer-owned unit | 2c: M1 developer and install halves |
| 7. Operating work | 2a: Judge, then the four capacity budgets |

## 4. Critical path

- **The MCP Apps views design came before any view slice.** The design
  landed on 17 October
  ([journey views](../2026-10-17-journey-views-design.md) at `92bedfda`,
  revised by the [compact cards](../2026-10-17-compact-cards-design.md)
  design): five views, Needs you (with J5's three reasons), Work,
  Decision, Change, and file, diff and interdiff (J2), each with a desktop
  and a narrow mobile layout, in light and dark. The gate for MVP S2, S4
  and S6, and for J2 and J5, is open. The card kit that renders a declared
  compact card landed at `6e309b6b`.
- **J3 and J4 came before the steps of the journey that run real work.**
  Both are landed. J4's live witness runs while S1 to S3 proceed; the
  steps that need a fork per hold wait for its remaining phases.
- **J1 needs S6 and DX-A2.** The exit test needs every piece, and the
  agent wake in J5.

## 5. Settled questions

1. The exit test's cloud agents may be dap-hosted agent teams or agent
   sessions running elsewhere with their own agent keys (section 2d).
2. J4 is deployed when it is reviewed, so the exit test has a fork per
   hold (section 2b). Done: deployed 30 October.
3. The evidence-rules first slice is commissioned, with J3 as its
   production adapter (section 2b). Done: landed 29 October.
4. The journey goes before the typed-definition, kernel and
   boundary-objects items from J4 onward (order `a249511f`, 30 October).
5. J4's acceptance runs in three steps: land the gated source, deploy,
   then run the live witness against the deployment (`241248a9`).

## 6. Changes in draft 2

- Review finding F1 (archive boundary): section 2a now states that the
  archive milestone writes only synthetic or reviewed fixture histories,
  and that real history needs admission, consent and disclosures before
  any body is selected. The plans README synopsis says the same.
- Review finding F2 (product names): the hosting deployment and the
  hosted store are named generically.
- "The judge" in section 2a is now "the native judge", to tell capacity
  judging apart from the observability Judge stage.
- The open questions are settled (section 5), and J3 and J4 say so.

## 7. Changes in draft 3

- The status records J3 and J4 as landed, J4 as deployed with its live
  witness in progress, and the MVP slices S1 to S3 as filed.
- Section 2 records the 28 October order: the journey first from J4
  onward, S7 replaced by J3, S0 disposed by J4's first witness.
- Section 2b adds where each MVP slice stands, J1's dependency on the
  reads that wait for a head, J3's and J4's landed state and remaining
  phases, and the agent wake in J5.
- Section 2c adds the hosted-agents order of 20 October, M1's landing,
  and the roles-as-viewpoints amendment.
- Section 2d adds the exit test's tier-0 measures and the candidate of
  running the exit test on this project's own development, self-hosted.
- Section 2e adds the items that follow the exit test's measurements.
- Section 2f records the five decisions of the 26 October re-cut and
  where each lands.
- Section 4 records the views-design gate as open, and J3 and J4 as
  landed.
- Section 5 adds the order, the J4 acceptance sequence, and the done
  marks.
