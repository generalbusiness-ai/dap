# Sprint report, 13 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 12 November to 17:00 on 13 November. Ten
heads landed on `main`, and five deployments followed the first six. The
identifier cutover landed at 13:13 on 13 November. It is not deployed:
the hosted Workers run the head before it, and the deployment waits for
the head that lets the new code create rooms. Two design notes landed,
and the owner ratified a third. The cost-of-change review is below.

## Story: the identifier cutover is on `main`

The cutover head changes 927 files. It moves every reference to the new
identifier shapes in one step.

- A reference to a scope is `{ scope, genesis }`. It names no kind.
- Each entry after a genesis entry carries that genesis. A service
  routes an entry by its genesis.
- A reference to the wrong sequence is refused with `wrong-genesis` or
  `genesis-conflict`.
- A room or a store that an earlier build made does not open on this
  `main`. A request to a retired room gets HTTP 410 with the word
  `room-retired`.

Nothing on a hosted Worker changed. The four room Workers run `main`
`64112e45`, and every hosted room keeps its old format. The cutover
deployment needs the creation family of the new format (`ff59ca0c`),
which is in work. After that head lands, the planner deploys five
Workers, founds a register on each, and makes the Grow, Lending and
Site rooms again.

The reader pages still use the old word for a genesis in 38 lines of
`docs/` and 21 lines of README files. The head that corrects them is in
review (`567ef991`).

## Story: the client library owns custody and installation

Three heads moved work from the MCP server into the client library.

- The MCP server has one typed result for an act, and six fixed tool
  schemas that admit only what their parsers accept.
- The client library owns request custody: the record of a signed
  request from its signing to the scope's answer. The command line and
  the MCP server use the same code. The stored bytes did not change.
- `dap install` and `dap application` call the client library. The
  command line loads no MCP module.

An application author who uses the client library now gets the same
custody that the command line has.

## Story: a client reads a checked page of the journal

`ScopeHandle.log` reads one page of a scope's journal. It checks the
hash, the position and the scope of each row, and it reports whether
the page is whole. The browser replica of the client design starts
from this read.

## Story: every found submit charges its address

A found intent over 1 MiB, or one that fails the strict parse, now
charges the caller's address window before the Worker refuses it. An
outsider can no longer send malformed found intents at no cost.
`docs/security/entry-points.md` states the limit of the creation table.

## Story: one command deploys five Workers

`scripts/deploy.mjs` and `scripts/deploy-smoke.mjs` take the sandbox
Worker as a fifth name. The command skips a name whose bundle and
configuration equal its previous receipt, and it sends nothing for that
name. All five deployments of this sprint used the command. The sandbox
Worker changed once, at the first of them.

## Story: three design notes

- **One client for a declared scope** landed (`e5b86654`). The owner
  ratified it. It gives an application author one object for a scope:
  its reads, its acts with custody, and a replica that predicts the
  scope's judgment. Four build steps, C1 to C4, follow it.
- **The state seed** landed (`4893fbfa`). A replica holds what the
  scope holds, or it says that it cannot judge. A scope that raised its
  floor keeps one copy of its state, and a new page starts from that
  copy. The design changes no kernel file. Three slices follow the
  client build steps.
- **The publisher member** is ratified, and its last head is in review
  (`35cbcb29`). A member of a room writes the room's pages to a Git
  branch and signs one act for each publication. The owner decided two
  things: the room's owner holds the publisher's Git credential, and
  the first slice is a side lane after the cutover deployment.

## Story: a scope has no bound on retained births

A read-only review after the cutover (`27cb5f60`) found one defect. A
scope counts its own entries against its byte limit, and it does not
count the births and copies that it retains from other scopes. The
ruling: retained births and copies count against the same limit in
every scope, and a full scope stops with `scope-full`. The head lands
before the cutover deployment if it adds stored state.

## Cost-of-change review

- The cutover gate. Cost: ten attempts and one review round.
  - Attempts 1, 2 and 6 failed before a test ran: commit subjects over
    100 characters twice, and formatting once.
  - Attempts 3, 4 and 5 found real failures: 9 Node cases, 8 Plain
    cases and 45 Native cases. Each was the first run of its stage over
    the whole head.
  - Attempt 7 failed on timeouts. The laptop ran on battery in Low
    Power Mode. A gate now starts only on AC power, and the START and
    END acts state the power reading (`f27885cc`).
  - Attempt 8 failed on one timeout in `creation-versions.test.ts`.
  - Attempt 9 passed. The review then asked for changes: the browser
    workflows, a race on the store's format word, and the report.
  - Attempt 10 passed with 4,562 Plain cases and 1,141 Native cases.
  Alternative: run the commit-message check, the format check and the
  Node stage alone before a gate START. That is now the rule. Revisit:
  at the gate of the creation family.
- Browser workflows outside the gate. Cost: one review round on the
  cutover. The gate does not run the browser workflows, and the head
  broke two of them. Revisit: when HL-1 (`6506bc1e`) lists each test
  file that no gate step runs.
- The gate of the refusal classes. Cost: three attempts for a small
  head. Attempt 1 failed on a page bundle that was stale after a source
  change. Attempt 2 failed on one Native case that runs for 51 to 54 s
  against a limit of 60 s. Attempt 3 passed, and that case took 59.3 s.
  Request `5698b71d` gives each such case a limit of three times its
  measured time. Revisit: when it lands.
- Crossed START acts. Cost: two. A deployment window at 23:45 on
  12 November cost the builder one gate start. The planner opened a
  landing window at 14:16 on 13 November, and the builder started a
  gate 25 seconds before the planner's act arrived. The planner checked
  for a gate process again before the merge and stopped. Nothing was
  merged. A planner window now checks for a gate process before its
  START act and again before each merge. Revisit: no.
- A usage limit. Cost: two hours and ten minutes, from 14:41 to 16:51
  on 13 November, with no act from any session. Four surveys did not
  run. One gate result waited for its review through that time.
  Revisit: no.
- A sleeping laptop. Cost: 49 minutes on 12 November from 17:54, on
  battery with the lid closed, and one missed survey. Long runs now
  start under `caffeinate -i`. Revisit: no.
- The landing subject of the cutover. Cost: none yet. The subject has
  468 characters, and `main` keeps it. The check ran on the candidate
  and not on the merge text. The planner now reads each merge subject
  before the push. Revisit: no.
- A wrong premise in the planner's request for HL-1. Cost: one builder
  act and one corrected ruling (`7bf2c93b`). The builder then ran each
  of the five test files that no gate step runs. One passes, two fail,
  and two hold no test case. Alternative: the planner runs the command
  that lists the files and quotes its output in the request. Revisit:
  no.
- Three drafts of the state seed note. Cost: two review rounds in one
  afternoon. The first draft listed four readers of a missing entry
  where about twenty exist. The second draft raised a fault that three
  catch sites stop before the client sees it. Each round found a real
  defect in the design before any code. The cost is worth it. Revisit:
  no.

## Decisions

- The owner ratified the client design note and held the cutover
  deployment until the creation family lands.
- The owner decided that a room's owner holds the publisher's Git
  credential, and that the publisher's first slice is a side lane.
- One default creation family, `base`. The self-hosted service keeps
  its present family and names its cohort, with three conditions
  (`96676b22`).
- Retained births and copies count against a scope's byte limit, and
  the scope stops with `scope-full` (`1064d0de`).
- The word for the first entry of a sequence is "genesis" on every
  reader page.
- A gate starts only on AC power with Low Power Mode off (`f27885cc`).
- A replica keeps each entry that it folds and gives the judges one
  `Own` object. That object records each entry that it could not
  serve, and the record decides the prediction (`b1b1d492`,
  `556eca2b`).
- HL-1 keeps seven test files in its list of excluded tests, each with
  a reason, and three requests remove them (`bddcc124`).

## In progress

- The creation family for the new format (`ff59ca0c`), on the critical
  path to the cutover deployment.
- The refusal classes (`b0fe0668`), gate passed, in review.
- The reader pages' identifiers (`567ef991`), in review.
- The Native timeouts (`5698b71d`). Its commit rides on the creation
  family's head.
- The list of test files that no gate step runs (`6506bc1e`).
- The publisher member note, last head in review (`35cbcb29`).
- Sixteen requests that the planner filed after the cutover landed,
  among them six Sequenced heads, five Live heads, one archive driver
  for every room Worker, and the cap on retained births.

## What did not happen, and why

- The cutover deployment. The owner holds it until the creation family
  lands.
- The refusal classes did not land. Their gate passed at 14:35, and the
  usage limit stopped the review at 14:41.
- The live Claude and ChatGPT runs. They need one join in a browser on
  the test Worker.

## What landed

| Commit | Head | Request | Approval |
| --- | --- | --- | --- |
| `9e3d6673` | Create-room focus witness reads the page once | `0f327b6b` | `5d19ac04` |
| `fb354651` | Sandbox as the fifth deploy and smoke name | `60f5b713` | `0e513382` |
| `a76764a7` | MCP result types and fixed tool schemas | `9a321a0a` | `c2a9eb7c` |
| `7ea170c9` | Client owns request custody | `dd0d078a` | `0d036b0c` |
| `2216316e` | Every found submit charges its address | `17eb790d` | `d7b17855` |
| `e7db3872` | Install and application commands call the client | `d2aff067` | `0eddb316` |
| `64112e45` | `ScopeHandle.log` reads a checked journal page | `e79ccfaf` | `087d5bbe` |
| `57e893c0` | Identifier cutover | `05d618e2` | `8c301388` |
| `e5b128cf` | Client design note | `e5b86654` | `366a8236` |
| `947abe4a` | State seed design note | `4893fbfa` | `438686be` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | artroom-scope | sandbox |
| --- | --- | --- | --- | --- | --- | --- |
| 12 Nov 19:39 | `a76764a7` | `6241a476` | `4399ec78` | `b06ef1c2` | `b96dd217` | `02affc3d` |
| 12 Nov 22:00 | `7ea170c9` | `35fe2c2c` | `5337be06` | `f7deee3d` | `e5e215e4` | unchanged |
| 12 Nov 22:30 | `2216316e` | `9008bd9e` | `31b7bd1e` | `5f3438bf` | `70fb5768` | unchanged |
| 12 Nov 23:45 | `e7db3872` | `e9cae83d` | `f044d20b` | `a2c826b5` | `375959b5` | unchanged |
| 13 Nov 00:16 | `64112e45` | `4ad0a629` | `9222c395` | `cb0dff4c` | `cf086a04` | unchanged |

Each deployment used `scripts/deploy.mjs` and wrote a receipt, and the
smoke command passed afterward. `9e3d6673` and `fb354651` changed no
Worker bundle. The cutover and the two notes are not deployed.

## Commitments from the 12 November report

| Commitment | Result |
| --- | --- |
| Land NF-2 | Done |
| Compile the whole cutover head and run its working checks | Done. The head landed |
| Land the focus race, the caller-tables follow-ups, and the sandbox Worker in the deploy command | Done |
| File the room inventory for the cutover deployment | Not done. The creation family's request names the rooms to make again. The census read runs after that head lands |
| File the six Sequenced heads and the five Live heads when the cutover head is in review | Done |
| Half-hourly surveys, including overnight. The daily report and the worktree sweep | Partly. Five surveys did not run: one in the laptop's sleep and four under the usage limit |

## Commitments for the sprint ending 14 November, 17:00

- Land the refusal classes and the reader pages' identifiers.
- Land the creation family, then deploy the cutover: five Workers, a
  register on each, and the Grow, Lending and Site rooms made again.
- File the room inventory with the census read before that deployment.
- Land the cap on retained births before that deployment, if it adds
  stored state.
- Land the publisher member note, and file its first slice.
- File the three slices of the state seed.
- Land build step C1 of the client.
- Half-hourly surveys, including overnight. The daily report at 17:00,
  and the worktree sweep after it.
