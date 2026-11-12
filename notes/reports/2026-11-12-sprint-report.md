# Sprint report, 12 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 11 November to 17:00 on 12 November. Six
heads landed on `main`, and five deployments followed them. Two of the
heads close findings of the 10 November security review: the tables that
count recent callers, and the hosted MCP endpoint. One command now deploys
the hosted Workers. A person's invitation reads the same in the page, the
command line and MCP. The identifier test vectors and their verifier
landed, and the identifier cutover head is in source work. The
cost-of-change review is below.

## Story: one sender no longer shuts out new callers

The 10 November review had one high finding. One sender could fill the
tables that count recent callers, and the Worker then refused every new
caller until the window passed. The caller-tables head closes it.

- Creation, signed reads and the register's `found` act each have their
  own table of 8,192 windows.
- A Worker charges the caller's address before it checks a key. One
  address opens a bounded number of windows.
- A caller that arrives at a full table shares one bounded overflow
  window. It is no longer refused for the lack of a row.
- Callers that already hold a window keep it.

One limit remains, and the documentation will state it. About 265
distinct addresses or IPv6 /64 networks fill the creation table, and one
IPv6 /48 holds 65,536 of those networks. New callers then share 10
creations an hour. Request `a4ba3a4a`
holds the remedy.

## Story: the hosted MCP findings are closed

The hosted MCP head closes the hosted MCP findings of the review.
Hosted MCP stays closed on every Worker. It opens first for the live
window on the test Worker.

- A read-only control call stores nothing, so a member cannot spend a
  room's control budget by listing connections.
- The consent page's first read has an address limit. A Worker remembers
  an invalid client document for one minute and does not fetch it again.
- An Agent acts only within its controller's role. The Worker checks that
  at each use: creation, bearer rotation, refresh and access. An admin
  who widens an Agent's role past its controller's role gives it nothing.
- A card's script cannot call a write tool. Ordinary writes, `credential`
  and `diff` are callable by the model only. A card calls the acts that
  its view declares.
- A refused grant leaves no client mapping. The `credential` tool returns
  its secret as text and not in structured content.
- A Worker checks the signature of a control call before it resolves an
  OAuth client or registers a membership.

The first review found one new defect in this head. The new limit on
control calls counted keys, and any caller can make a new key for each
call. One outsider could therefore refuse hosted control to every room on
a Worker. The repair charges the caller's address before the key, as the
caller-tables head does. The second review approved it.

Two limits remain, each with a request. A stored control operation keeps
4 KiB of a room's 15 MiB for good, so one member with one Agent can
exhaust `create` and `grant` (`af11896e`). About 34 addresses fill the
shared control table (`a4ba3a4a`). Both requests land before hosted MCP
opens for a room whose members the operator does not know.

## Story: one invitation reads the same everywhere

The page, the command line and MCP now parse a person's invitation with
one parser.

- Each surface requires the invitation to name a supported Membership
  definition.
- A trailing slash on the service address no longer changes the result.
- A new command-line home, or an MCP server with no room, learns the
  service from the invitation.
- One table of six cases runs against all three surfaces.

A join that an earlier build saved with a trailing slash stays saved and
does not match. The person asks for a new invitation.

## Story: one command deploys the hosted Workers

`scripts/deploy.mjs` deploys the four hosted Workers from a reviewed
checkout, and `scripts/deploy-smoke.mjs` checks each one afterward.
`docs/operate-a-service.md` has the procedure.

- The command refuses a checkout with uncommitted changes. It needs the
  receipt of the previous deployment, and it writes a new receipt outside
  the checkout.
- Every Worker passes its checks before the command deploys one. A dry
  run prints each bundle's digest, so an operator can see whether a
  landing changed a Worker at all.
- It asks for an explicit yes to each new storage migration.
- The smoke command reads health three times, the MCP route, the page and
  the creation offer. It writes nothing.

Four of this sprint's five deployments used the command. The sandbox
Worker has no place in it yet, and that Worker ran its 23 October version
until 12 November. Request `60f5b713` adds it.

## Story: the client and MCP check a field the same way

The neutral-form head landed at 16:44. Before it, the client and the MCP
server each checked the fields of an act with their own code, and the
client's `Form` carried an MCP schema.

- One checker in the client shapes every declared field. The MCP server
  calls it and keeps its own refusal words.
- A `Form` describes the fields, what the act presents and what stands
  beside it. It carries nothing of MCP. The MCP server builds its tool
  schemas from the form.
- A field type that the checker does not handle stops the build.
- The page's bundle is smaller by 4,228 bytes.

## Story: a citation can be checked from bytes

The Replay library verifies a citation of one record from the record's
bytes, for dap entries and for Git commits. It hashes the bytes before it
decodes them, and it never treats fetched bytes as a trusted anchor. The
test vectors come from a second, independent producer. The review found
that the Git verifier accepted a `parent` line anywhere in a commit
header. The verifier now reads parent lines only where Git writes them.

## Story: the identifier cutover is in source work

The cutover head moves every reference to the new identifier shapes and
retires rooms in the old format. It has more than twenty source
checkpoints, now merged with `main` `28aa0446`. None is compiled or
tested yet. The planner's
rulings give the rollout these answers.

- An entry records the kind of the scope that sent it. A reader takes the
  kind from the entry and makes no extra read.
- The cutover adds no read and removes no read.
- A room database gets a format word at its first setup. A database with
  rows and no format word is a retired room, and the new code writes
  nothing to it.
- A request that reaches a retired room gets HTTP 410 with the error word
  `room-retired` and the commit that still reads the room. A Worker that
  serves only indexed scopes answers 404 for an old room link, because
  the new index does not list the room.
- A command-line home in the old format is refused and left untouched.
- A store that the code names takes a new name and starts empty. A store
  that a caller names holds the format word.

The owner has not confirmed the rollout answers.

## Cost-of-change review

- The hosted MCP head. Cost: eight hours from the first compiler run at
  07:12 to the landing at 15:19, two failed gates and one review round.
  - Nine booked runs failed before 11:24. Five failed on a test fixture
    or an inventory that the change had made stale. One closed without a
    launch. One failed in the builder's own launch metadata before a test
    ran. One found a real defect, and one found nine Native failures. The
    Native tests had not passed.
  - A ruling at 11:32 made a focused run a working run with the plain
    commands of `docs/testing.md`. The Native and Plain tests passed 15
    minutes later.
  - Each gate failed on one test file, and the head was completed by
    follow-ups on that file alone. The checker accepted both chains.
  - Two failures were worth their cost. One test found that the tool
    list dropped the model-only mark from `create`. One control did not
    notice a disabled guard, and its test then gained the assertion that
    does.
  - The review round cost about two hours and found the defect above.
  Alternative: run the changed test files with plain commands first, and
  keep the evidence care for the gate and the controls. That is now the
  rule. Revisit: at the next head that changes an inventory.
- The caller-tables head. Cost: one focused run failed on one stale row
  of a documentation table, one control helper failed in its own metadata
  write, and one run started with the wrong interpreter. The gate passed
  once, with 5,900 cases. A browser run that the builder dispatched by
  hand failed on a focus race, while the two runs that the push started
  had passed. A push run is now a head's CI, and request `0f327b6b`
  repairs the race. Revisit: no.
- The invitation head. Cost: one focused run failed where a test counted
  two reads of a secret and expected one. One run stopped on a malformed
  plan. One control window stopped at its own controller, which expected
  the wrong error text. The review filing then waited about 90 minutes
  on an export approval in the builder's session, until a ruling let the
  review start without the export. The owner has since moved those
  decisions to the planner. Revisit: no.
- The deploy command. Cost: one gate of 23 minutes, and a hold on `main`
  that the planner released 28 minutes late, because the release request
  arrived between two surveys. The landing's subject line has 329
  characters, and history keeps it. Revisit: no.
- Two reversed rulings on the cutover head. Cost: builder source work
  on a record that a caller supplies, a ruling that stood for three and
  a half hours, and on a hook that the store's owner runs, a ruling that
  stood for two. Both rulings added a mechanism for a fact that an entry
  can record or that the turn already reads. The later rulings withdraw
  both. Alternative:
  ask first which existing bytes can carry the fact. Revisit: at the
  cutover gate.
- The size of the cutover head. Cost so far: about twenty rulings and
  more than twenty source checkpoints, with no compiler run over the
  whole head. The first compile will find what the reviews of single patches
  could not. Alternative: none that keeps one code line, which the owner
  chose on 9 November. Revisit: at the first compile.
- The sandbox Worker. Cost: twenty days on an old version, found by
  reading the deployed version before a deployment. Five probes of it
  read the same before and after its deployment. Revisit: when the deploy
  command covers it.
- A test that read the wall clock. Cost: one failed gate of the
  neutral-form head and a second gate.
  `packages/mcp/test/sqlite-custody.test.ts` wrote records dated
  13 October and let the store read the real time. From 15:00 on
  12 November the records were 30 days old, the store archived three
  records where the test expects one, and every gate failed at every
  head, `main` included. The repair passes the test clock to the store.
  It landed with the neutral-form head (`0f1ef8ea`). Revisit: no.
- A deployment window and a gate that crossed. Cost: one interrupted
  gate, about 90 seconds old. The planner opened the window at 16:46,
  and the builder started the gate of the deploy-command head at 16:47
  before it read the window act. The builder stopped the gate and starts
  a fresh one. Revisit: no.
- Builder acts with the spaces removed. Cost: two reminders. The acts ran
  words and numbers together, and a reader could not take a count or a
  commit from them with confidence. Revisit: no.

## Decisions

- The owner moved the builder's questions and approvals to the planner's
  session (`a66bc575`).
- The owner's two design requests of 11 November are five heads, NF-1 to
  NF-5: a neutral form for a client's fields, the MCP boundary, and the
  custody owner in the client (`6938743a`). NF-1 goes first, with its own
  gate (`df45027e`).
- Cutover: an entry records its sender's kind, and the record that a
  caller supplies is withdrawn (`b02334db`). The head adds no read and
  removes no read (`222a5b21`). The first retained entry of a sequence is
  admitted as its birth (`b7c58915`).
- Cutover rollout: the format word, the retired room and its 410 answer,
  and the command-line home (`e46dd964`). Stores (`e7787de0`). Old room
  links (`cc9d2940`). The owner has not confirmed these three.
- A focused run is a working run with plain commands. The gate, the
  controls, the formal checks and the CI keep their evidence
  (`96cd6211`).
- A head's CI is the runs that its push started. A later commit that
  changes only the note and the manifest needs no run (`b5283835`,
  `3a5c4448`). A browser run stands for a later head while no path in its
  workflow's filter differs (`a8d2f83d`).
- The card workflow runs the declared-views browser script. No head runs
  a browser on the build machine for it (`3ec2bcad`).
- A formal check repeats its fault control only when the code that it
  protects changes (`1a42c068`).
- Hosted MCP: `credential` and `diff` joined the hosted MCP head. The
  stored-row limit and the address floods are separate requests, and
  neither holds the live window on the test Worker (`3ae8a396`,
  `af11896e`, `a4ba3a4a`). The owner has not confirmed that order.
- The deploy command skips a name whose bundle and configuration both
  equal its previous receipt, and deploys the other names (`c7585e08`).
- Cutover: the platform's origin checks take the rows that a source
  sent, each with the sequence that its own first entry proves or with
  none. A row with no sequence serves only as the creator that an
  admitted first entry names (`080e7c84`).

## In progress

- The focus race (`0f327b6b`). Its gate started at 16:26.
- The identifier cutover head (`05d618e2`), in source work.
- NF-2 to NF-4 in source (`9a321a0a`, `dd0d078a`, `d2aff067`).
- The sandbox Worker in the deploy command (`60f5b713`), in source.
- Three follow-ups of the caller-tables review (`17eb790d`), which wait
  for a free slot.
- The remaining security heads in source: configuration (`c755f518`),
  the client and tokens (`76997ff1`), Site reads (`b4a813a1`) and the
  forms of the cutover family (`93adab52`).

## What did not happen, and why

- The cutover head did not reach review. Its source is not complete, and
  the hosted MCP head held the one gate slot for eight hours.
- The six Sequenced heads and the five Live heads are not filed. They
  follow the cutover head's review.
- The live Claude and ChatGPT runs did not happen. They need one join in
  a browser on the test Worker.

## What landed

| Commit | Head | Request | Approval |
| --- | --- | --- | --- |
| `3de64311` | Citation verifier and identifier vectors | `a30f1b67` | `4aa9c0f5` |
| `af3badef` | Deploy command and smoke command | `b380ea8c` | `7426c64f` |
| `d4cfae05` | One person-invitation parser | `3c9a0f81` | `d413a78b` |
| `221e11c3` | Caller tables with bounded overflow | `8bd2c9d2` | `c6fcf62e` |
| `28aa0446` | Hosted MCP findings | `9a053402` | `80845262` |
| `33836693` | Neutral client form and one field checker | `6050f6ea` | `bdb4843a` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | artroom-scope |
| --- | --- | --- | --- | --- | --- |
| 11 Nov 17:49 | `3de64311` | `07e46d23` | `3dadc53f` | `39e1c062` | `0d271493` |
| 12 Nov 03:01 | `d4cfae05` | `6c62955f` | `a39a462e` | `f69ee824` | `c4b40401` |
| 12 Nov 06:37 | `221e11c3` | `c6048dff` | `79044a60` | `02ca8f36` | `9a903803` |
| 12 Nov 15:25 | `28aa0446` | `2d170d42` | `6caede83` | `ced7bea7` | `865de60f` |
| 12 Nov 16:47 | `33836693` | `48bb48b8` | `a5042ea2` | `3184121d` | `6a968ef4` |

The last four deployments used `scripts/deploy.mjs`, and each wrote a
receipt. After each deployment the smoke command passed on all four
Workers, `POST /mcp` answered 404, the directory of the demo room
verified through entry 10, and the nine indexed scopes of the operator
room verified. `af3badef` changed no Worker bundle, so no deployment
followed it. The sandbox Worker `dap-application-sandbox` was deployed by
hand at 06:37 on 12 November as version `12a88599`. Its bundle did not
change at `28aa0446` or at `33836693`.

## Commitments from the 11 November report

| Commitment | Result |
| --- | --- |
| Land the identifier vectors and verifier, and deploy all four Workers | Done |
| Open the identifier cutover head | Done. It is in source work |
| Land the first join parity head | Done |
| Land the deploy command, and run the next deployment with it | Done |
| Land the caller-tables security head | Done |
| File the six Sequenced heads and the five Live heads when the cutover head is in review | Not done. The cutover head is not in review |
| Half-hourly surveys, the daily report and the worktree sweep | Done |

## Commitments for the sprint ending 13 November, 17:00

- Land NF-2.
- Compile the whole cutover head and run its working checks.
- Land the three small heads: the focus race, the caller-tables
  follow-ups, and the sandbox Worker in the deploy command.
- File the room inventory for the cutover deployment.
- File the six Sequenced heads and the five Live heads when the cutover
  head is in review.
- Half-hourly surveys, including overnight. The daily report at 17:00, and
  the worktree sweep after it.
