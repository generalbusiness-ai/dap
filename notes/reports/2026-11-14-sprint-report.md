# Sprint report, 14 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 13 November to 17:00 on 14 November.
Seventeen heads landed on `main`, and five deployments followed. The
identifier cutover is deployed: three hosted Workers and the sandbox
run the new identifier format, each on a new register. The Grow demo
runs a signed release in a live room. The owner ratified a design note
for one act environment, and its first build step is in work. The
cost-of-change review is below.

## Story: the identifier cutover is deployed

The cutover window ran from 01:17 to 01:22 on 14 November, under plan
036. It deployed `dap-lending`, `dap-grow`, `dap-demo` and the sandbox
Worker at `main` `5b342ee9`.

- Each Worker has a new register. A request to a room of the earlier
  format gets HTTP 410 with the word `room-retired`.
- New rooms use the creation family `base` by default. The rooms
  `lending-library` and `grow-demo` exist again in the new format.
- Every scope counts the births and the copies that it retains against
  its byte limit, and a full scope stops with `scope-full`. That head
  landed 30 minutes before the window.
- The tracked configuration of each Worker names its current register.
  One helper changes a register value and checks the whole candidate
  file before it writes. `scripts/deploy.mjs` deploys the three Workers
  again.

The Workers `artroom-scope` and `dap-connect` are outside the plan.
They keep their earlier code.

## Story: the Grow demo runs a signed release

The Grow application is release 2.0.0, signed with a new publisher
key. The Grow Worker trusts only the release that it installs. The
earlier signed release stays in the repository as a proof of the
policy, apart from the current activation.

The demo room is live on `dap-grow` from 09:54 on 14 November. It
holds a Site, Room A and three members: an operator, a sensor agent
and a climate agent. A simulator Worker signs as the two agents on
each tick. On the first ticks, each device reported its target and
the heaters confirmed.

The same pack command reproduces the source identifiers of Grow,
Lending and Counter. Lending and Counter take their signatures after
the head that renames their presentation fields.

## Story: a client knows what a refusal means later

Three heads changed what an application author can rely on.

- Each of the 36 refusal reasons has one class: `never`, `protocol` or
  `head`. The class tells a client whether the same signed bytes can
  succeed at a later head of the same scope.
- Request custody keeps every signing of a request, with a bound on
  admission. The command line and the MCP server read the earlier
  request records and move them to the new form.
- An adapter narrows an item effect through an exported kernel guard.
  The fold refuses a genesis that names another declared definition.

The client note gained one section. It says when a custody record
ends: only a verified absence ends it, and `refused` or `withdrawn`
describe one head and one clock.

## Story: one head carried six small parts

The combined head (`1f81ac01`) landed six parts under one gate.

- `predictionGrant` gives a replica the stand-in grant that local
  prediction needs. Deployed entry paths still present proven
  authority.
- The contract and the validator admit version 1 of the sequenced
  level and of the live level. No service runs a room at either level
  yet.
- The gate runs the hosted-loop tests and three Node test files that
  no step ran before. One test compares each tracked test file with
  the gate's selections, so a file that no step runs needs a stated
  reason.
- A register change states its choice. `--only` writes the new
  register alone, and `--keep` adds it to the installed list.
- `scripts/control.mjs` shows that a test fails without its guard. It
  now classifies a failed promise assertion from the whole message,
  before it shortens the message for display.

## Story: one environment for an act

The note `notes/2026-11-14-act-environment.md` landed, and the owner
ratified it. A page, an agent and the command line explore an act,
submit it and resolve it through one body of code.

- Explore judges an act at a stated view and clock, and it gives no
  authority. It answers `admitted`, `refused` or `unavailable`.
- A draft keeps the basis that the member saw.
- A dependent act names the version of the step that it was built on.

Eight build requests follow the note. Step E1, the export of the
judge's body with a recorded set of 4,029 answers, is in work. Five
planner rulings settled points that the build found, and an amendment
of the note for them landed (`336dd74e`). A sixth ruling followed it:
Explore does not know the number of an item that an explored act
opens (`1bdf9467`).

The publisher member note also landed. Its first slice has a request
(`bea87570`), and the three slices of the state seed have theirs.

## Story: the gate record is lighter

A gate now leaves two acts and one log: a START act, and an END act
with the exit code, the wall time, the stage counts and the SHA-256 of
the log. A change that touches only `notes/` skips the test step. The
Native stage runs its 22 scale cases only when a changed file selects
them.

The first gate that omitted the scale cases was the gate of client
step C2. Its Native stage took 590 s. The gate before it ran all 22
cases in 1,338 s of Native time. Those are two heads, so the
difference is an observation and not a measured saving.

An audit (`de28ac2b`) found that a head which edits the judge now runs
all 22 cases, where the earlier rule omitted the older six. Request
`3a4f6d1c` gives the selector three answers, so that such a head runs
the sixteen newer cases only.

## Cost-of-change review

- Three usage limits. Cost: 2 hours 28 minutes on 13 November from
  19:23, 47 minutes on 14 November from 12:04, and the last 57 minutes
  of the sprint from 16:03, with no act from the planner. Eight surveys
  did not run. In the second, the END act of a landing arrived 48
  minutes late and held the builder's gate for that time. The third
  ran on to 17:51. Five builder questions waited through it, and this
  report landed after its window. Alternative: file the END act before
  the push that follows a landing, so a stop leaves the slot free.
  Revisit: at the next landing window.
- A refused push. Cost: none yet. The builder's session refused the
  push of the C2 branch, because no message of the owner in that
  session authorizes it. The review reads the head from the local
  object store, and the planner publishes `main` after each landing.
  Revisit: when the owner answers in the builder's session.
- Power rules. Cost: six built heads waited through the evening of
  13 November, because a gate started only on AC power. The owner
  retired every power rule on 14 November. Revisit: no.
- The combined head's gate. Cost: two attempts. Attempt 1 failed on
  two consumers that an earlier part had made stale. Revisit: no.
- Fast checks that fail a gate. Cost: two attempts in this sprint and
  three in the sprint before, each with a START act and an END act.
  The gate of the lighter record lost attempt 1 to JSON formatting
  after 12 s, and the gate of client step C2 lost attempt 1 to JSON
  formatting after 13 s. The rule of 13 November asks a lane to run the
  format check before a START. The rule did not hold, and the
  repository has no commit hook. Request `c8b2f4f6` adds a tracked
  hook that runs the format check and the subject check at each
  commit. Revisit: when it lands.
- The gate of the lighter record, attempt 2. Cost: 157 s. It failed on
  a stale path in `scripts/active-source.test.mjs`. The Node stage
  before a START finds such a failure. Revisit: no.
- Two requests on a stale basis. Cost: two supersessions and four
  minutes. The planner filed the hook request twice on acts that the
  workroom had already retired. A top-level request now names no
  basis. Revisit: no.
- Rulings on step E1. Cost: the planner replaced one ruling within an
  hour and withdrew one test that it had ordered. The first oracle
  ruling asked for more than the note's words. The withdrawn test
  asked Explore to predict a commit refusal that no act can know.
  Alternative: read the turn's admission code before a ruling names a
  refusal. Revisit: at the review after step E3.
- Three cost rulings on the archive head, revised within 40 minutes.
  Cost: three builder acts. The planner now asks for the measured
  numbers before it rules on a budget. Revisit: no.
- A missed question. Cost: 40 minutes for one builder question. The
  planner started an act read at its own last filing and not at the
  previous read. A second read filtered out the acts of another
  planner session for 30 minutes. Each read now starts at the previous
  read's time and includes planner acts. Revisit: no.
- The scale selection. Cost: a head that edits the judge runs the
  older six scale cases, which the earlier rule omitted. Their case
  times sum to 974 s. The planner's ruling on the protected paths was
  wider than the earlier rule, and no number supported it. Request
  `3a4f6d1c` narrows it. Revisit: at the first gate that runs the
  sixteen newer cases alone.

## Decisions

- The owner ratified the act environment note and agreed with its
  place in the queue: after the client build steps C2 and C3.
- The owner approved three gate changes: the lighter record, the scale
  cases on selection, and the skip for a notes-only change.
- The owner retired every rule that tied a gate to the power supply.
- The owner confirmed that the builder pushes its own branches.
- Explore takes its key from the caller and computes the version from
  the bound act (`fa103f71`).
- An act whose judgment reads the signed intent is `unavailable` in
  Explore (`ef1fc932`, `18a41f8f`). Explore does not predict the
  capacity check of the turn (`99506fe3`).
- A reservation slot is a tool and an opaque day text, with an
  explicit lapse time. The definition has no calendar (`02d4942a`).
- A Worker accepts the installation of a live or a sequenced
  application until the heads that run those levels land. Each of
  those heads owes a creation test (`f503a503`).
- A client with no replica recovers a request through `settle` and a
  repeated install. No automatic sweep runs (`d264dea5`).

## In progress

- The rename of the presentation fields (NF-5), then the signatures of
  Lending and Counter.
- Client build step C2, the replica. Its gate passed, and it waits
  for its review. Step C3, the requests, follows it.
- Step E1 of the act environment.
- The contract checks of the tool-library reservation (step R).
- The archive driver for every room Worker (AE-1), the celld base
  family (CB-1) and the publisher member's first slice (P1). Each has
  passing development checks and waits for a gate.
- The commit hooks (`c8b2f4f6`) and the scale selection (`3a4f6d1c`).

## What did not happen, and why

- Lending and Counter have no signed release. Their head (NF-5) waits
  for its browser acceptance and a gate.
- No client build step after C1 landed. C2 and C3 waited behind five
  gates of the cutover and its follow-ups.
- The live Claude and ChatGPT runs. They need one join in a browser on
  the test Worker.

## What landed

| Commit | Head | Request | Approval |
| --- | --- | --- | --- |
| `6553a654` | Each refusal reason has a class | `b0fe0668` | `6b5c645f` |
| `8cbd3c61` | Reader pages state the genesis identifiers | `567ef991` | `52fd19ee` |
| `324a0679` | Publisher member design note | `35cbcb29` | `32052bba` |
| `a200cd0a` | Client note: the end of a custody record | `43de81ee` | `10e67581` |
| `4cef11d2` | The base family is the default for new rooms | `ff59ca0c` | `2deae79d` |
| `372a52f9` | Every scope bounds its retained payload bytes | `df5ef52d` | `210594dc` |
| `5b342ee9` | Plan 036: deploy the identifier cutover | `dc343d96` | `7ec380d1` |
| `694a8c7f` | Item-effect guard and genesis check in the fold | `586475dc`, `212e97dd` | `e0752c03` |
| `0ad4aa91` | Register settings helper | `5b28b7ac` | `1ee6b387` |
| `11c215a4` | Tracked registers for the hosted Workers | `fca73d9d` | `5d8002d3` |
| `bc79b6aa` | Earlier Grow proof and pinned source identifiers | `fef6bd59` | `c6b1ab2b` |
| `918ce5d7` | Custody keeps every signing of a request | `21f6d3cd` | `39e6eead` |
| `189cf7b6` | The signed Grow 2.0.0 release | `7292401a` | `6891b88c` |
| `1f81ac01` | Combined grammar and tooling head | `f8c8d7cd` | `52a513f9` |
| `270dc8c7` | Act environment design note | `98f450a1` | `813ce2a5` |
| `0166423a` | Gate selection and the lighter record | `89bdceee` | `f09f2309` |
| `336dd74e` | Act environment note: the rulings of step E1 | `840bf32d` | `5c9e2eb6` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo |
| --- | --- | --- | --- | --- |
| 14 Nov 01:17 | `5b342ee9` | `30c6220e` | `a278c4af` | `124929fb` |
| 14 Nov 04:27 | `11c215a4` | `6b77e0dc` | `37c7f884` | `11b0c096` |
| 14 Nov 07:25 | `918ce5d7` | `5d872f34` | `98f898f4` | `22a88929` |
| 14 Nov 09:34 | `189cf7b6` | `34c9aba1` | unchanged | `b8ae2355` |
| 14 Nov 12:53 | `270dc8c7` | `198f9097` | `5098e1af` | `662763ec` |

The first row is the cutover window. It used Wrangler with three
reviewed overrides, and it deployed the sandbox Worker as `3adacc54`.
Each later row used `scripts/deploy.mjs` and wrote a receipt. Health
and the smoke command passed after each row. The simulator Worker
`dap-grow-simulator` runs version `1e45fdd7` from `main` `189cf7b6`.
The heads `0166423a` and `336dd74e` changed no Worker bundle.

## Commitments from the 13 November report

| Commitment | Result |
| --- | --- |
| Land the refusal classes and the reader pages' identifiers | Done |
| Land the creation family, then deploy the cutover: five Workers, a register on each, and the Grow, Lending and Site rooms made again | Done for four Workers. Plan 036 left `artroom-scope` outside, because it creates no new room |
| File the room inventory with the census read before that deployment | Done |
| Land the cap on retained births before that deployment | Done |
| Land the publisher member note, and file its first slice | Done |
| File the three slices of the state seed | Done |
| Land build step C1 of the client | Done, and deployed |
| Half-hourly surveys, including overnight. The daily report and the worktree sweep | Partly. Eight surveys did not run under three usage limits, and this report landed late |

## Commitments for the sprint ending 15 November, 17:00

- Land the rename of the presentation fields, sign Lending and Counter,
  and deploy them.
- Land client build steps C2 and C3.
- Land step E1 of the act environment.
- Land the commit hooks and the scale selection.
- Land one of the three waiting side heads: the archive driver, the
  celld base family, or the publisher member's first slice.
- Write the design note of step A before any source of that step.
- Half-hourly surveys, including overnight. The daily report at 17:00,
  and the worktree sweep after it.
