# Sprint report, 15 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 14 November to 17:00 on 15 November.
Thirteen heads landed on `main`, and seven deployments followed. The
Lending application runs a signed release in a hosted room, and its
screen is live on `lending.inguz.space`. The client package gained
its replica and its requests. The first build step of the act
environment landed. The cost-of-change review is below.

## Story: Lending runs a signed release with a live screen

Lending 0.3.0 is active in the room `lending-library` on
`dap-lending` from 08:59 on 15 November. Its screen answers on
`lending.inguz.space` from 10:52. No member has acted in the room
yet.

- The presentation fields have their new names, and a browser page
  keeps its requests in the same custody as the command line and the
  MCP server.
- A member reserves a tool for a day. A reservation is a tool and an
  opaque day text with an explicit lapse time. A member holds at most
  two reservations and releases one with an existing act form.
- Lending installs in a room of the `base` family, and a member reads
  the declared projection of an installed application there.
- The publisher key signed Lending and Counter twice: version 0.2.0
  after the rename, and version 0.3.0 with the reservations. The
  Lending Worker trusts the 0.3.0 pair only.

The reservation release opened version 0.4.0 of both applications.
The signing of 0.4.0 waits for one more head, so that one minor
version carries both changes.

Counter 0.3.0 has a signed release and no hosted room. The owner
decides where it runs.

## Story: the client package has a replica and requests

Client build steps C2 and C3 landed.

- The replica of a declared scope follows the scope and predicts the
  member's own acts on it.
- The client keeps custody endings, replica facts and one request
  schedule together. A custody record ends by a rule that the client
  note states.
- A port function is supported for its call only. Its name, length
  and text are outside the supported observation.

A follow-up removed the temporary custody aliases of the MCP package.
A test with two real processes checks the kept envelope after one
process loses the dispatch lease.

## Story: the act environment has its first step

Step E1 landed. Client exploration and Describe judge a complete act
with the body code of the scope's own judge. Runtime answers and
replay answers match the recorded set at their original call
positions.

The design note took two amendments in this sprint. They record the
rulings of step E1, and they state that steps E1, R and C2 are built.

The checker approved the design note of step A, subject admission.
The note does not land until the owner answers its four decisions.

## Story: screens name the application that a room installed

The Grow room Worker and the sandbox Worker now carry descriptors
that match the installed Grow presentation. The Lending Worker
carries two screen host rows for the Lending release. The Lending
room host redirects to the screen address of the installed release.

## Story: the gate and the workflows

- A tracked commit hook runs the format check and the subject check.
  It asks for a tool only when a staged file needs that tool. The
  hook is on in the shared checkout.
- The scale cases run in two groups. A head that edits the judge
  runs the sixteen newer cases only.
- Four scale deadlines use the existing deadline factor. The Scale
  workflow passed at the last three published heads, after three
  failures in nine runs.
- celld prepares a room of the `base` family.
- The Local Worker smoke workflow still fails. Two heads made its
  report specific: the failed operation is `install`, and the detail
  is `transport-no-answer`. Request `0139796f` adds a classifier that
  names the owner: the client adapter, the proxy or the celld
  backend.

## Cost-of-change review

- Stale pinned values. Cost: five heads each lost gate attempt 1 to
  a committed value that a source change had made stale. The values
  were the Page module, a command-line tuple, two source seals, a
  Lending presentation identifier and the MCP tool document. The
  observed wall times of the five attempts sum to 1,530 s, and each
  attempt added a follow-up record. Request `349bdc90` moves every
  pinned value into one early gate stage and adds `npm run pins`.
  Revisit: when it lands.
- Presentation identifiers. Cost: any change of client or platform
  source changes the presentation identifier of each application.
  Three heads measured and applied new identifiers. A signed version
  cannot change, so the first change after a signing raises the
  minor version. Alternative: sign after the last planned change of
  a group, as the 0.4.0 signing now does. Revisit: at the 0.4.0
  signing.
- A hosted install. Cost: screen host rows in two files, two heads,
  two gates and two deployments for one application screen. Revisit:
  when a second application gets a screen.
- No upgrade path. Cost: Lending 0.3.0 stays in `lending-library`.
  Version 0.4.0 needs a new room or an upgrade route. Revisit: with
  the owner, before the 0.4.0 install.
- The smoke workflow. Cost: three landings to learn the failure
  class, and the owner of the failure is still unknown. Each
  diagnostic step costs a head, a gate and a landing, because the
  workflow runs only on a pushed commit and the builder cannot push.
  Alternative: a pull-request route for workflow diagnostics, which
  needs the owner's word. Revisit: at the next red run.
- Two refused merges. Cost: 95 minutes for the first approved head,
  and the second approved head still waits at the end of the sprint.
  The builder's session refuses a local merge without the owner's
  explicit word for that head. The planner does not merge in the
  builder's place. Alternative: a standing word of the owner for
  merges of approved heads, or a planner landing for them. Revisit:
  when the owner rules on builder merges.
- A late objection. Cost: one failed Native run of 1,136 cases and
  one more full gate. The planner accepted a failure shape for
  `settle` in an early answer and objected only when a public test
  failed. Alternative: read the
  public tests of a tool before a ruling changes its answer. Revisit:
  no.
- A landing check filed as an assert. Cost: 10 minutes. The checker
  acts on a request. Revisit: no.
- A watcher gap. Cost: 13 minutes for one builder act. The planner
  read the acts and then restarted the watcher. It now restarts the
  watcher first. Revisit: no.
- Two fast failures. Cost: two gate attempts of 2 s and 13 s on the
  rename head, one on a duplicate helper and one on types. The
  commit hook does not run those checks. The builder now runs both
  before each START. Revisit: no.

## Decisions

- The owner approved the local merge of the reservation release in
  the builder's session.
- A signed version never changes its identifiers. The first change
  after a signing raises the minor version, and an open version
  changes freely (`163de663`).
- A reservation release uses two existing act forms, and a member
  holds two live reservations (`18a5bdb1`).
- A port function is supported for its call only (`a870c343`).
- A client ends an expired request as absent only on evidence from
  the scope: the verified journal has an entry at or past the
  request's expiry. The local clock is a precondition and no proof
  (`98c1dba9`).
- A proof that ends nothing answers `settle` with the ordinary
  unknown report. Only a proved absence uses the custody failure
  (`206d7d21`). When the record changes during the proof, the report
  shows the record that custody holds now (`41b4ba66`).
- The smoke classifier names a boundary owner and adds no shim to
  the Worker (`cdadb4c1`, `92d9d4ff`).
- The planner does not merge a head in the builder's place
  (`ee53f773`).

## In progress

- The absence proof for an expired request, with the words for a
  refused third reservation. Its second gate attempt passed, and the
  checker approved the head (`1e7574bd`). The landing waits for the
  owner's approval in the builder's session. The 0.4.0 signatures
  follow the landing.
- The smoke classifier (`0139796f`). Its source is written on the
  head above, and its gate is next.
- The early gate stage for pinned values (`349bdc90`).
- The publisher member's first slice (`bea87570`).

## What did not happen, and why

- Lending 0.4.0 and Counter 0.4.0 have no signature. Their head is
  approved and waits for the owner's approval of the local merge.
- Counter has no hosted room. A second room needs a copy of the
  founder key, and the owner has not decided.
- The archive driver for every room Worker did not land. Its shared
  cases exceed two caps, and a cap change is the owner's decision.
- The shelf projection of `lending-library` has no witness. No
  member has donated a tool there.
- The fleet witness of the absence proof (`f471e88d`) needs a
  machine and an operator for its privileged steps.
- The live Claude and ChatGPT runs. They need one join in a browser
  on the test Worker.

## What landed

| Commit | Head | Approval |
| --- | --- | --- |
| `26d1e65c` | Client step C2: the replica of a declared scope | `472e271a` |
| `57f887ce` | Browser requests in shared custody, renamed presentation fields | `b6e9f538` |
| `863ca6b2` | Signed Lending 0.2.0 and Counter 0.2.0 | `3d96d641` |
| `8e0928f3` | Client step C3: requests | `c3b0e81d` |
| `4b198d0f` | Grow screen host descriptors | `533f1783` |
| `17a917cd` | Two scale groups and the tracked commit hook | `882aba2f` |
| `d1585bda` | Act environment step E1 | `e31e8b6c` |
| `c6711b53` | Tool reservations, Lending in a base room, base projections | `fb722a09` |
| `90a47b2a` | Custody follow-ups, hook checks, scale deadlines, the 0.3.0 trust rows | `47051a9e` |
| `2055762c` | Act environment note: E1 and R are built | `213c4878` |
| `71cd443b` | celld base preparation, smoke references, Lending screen host | `cb46f537` |
| `fb7877d9` | Act environment note: C2 is built | `9a017963` |
| `ce6f02ba` | Reservation release and install diagnostics of the smoke | `39952b45` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | Sandbox |
| --- | --- | --- | --- | --- | --- |
| 14 Nov 20:31 | `57f887ce` | `aeb45d49` | `ccf42502` | `eca15ed9` | unchanged |
| 14 Nov 22:09 | `863ca6b2` | unchanged | `1a4e8a9a` | unchanged | unchanged |
| 15 Nov 00:01 | `4b198d0f` | `20a5b8ac` | `9e9067fd` | `905ea2bb` | `e3a19e52` |
| 15 Nov 04:28 | `d1585bda` | `2bfb5dec` | `6ab152d6` | `032f7b55` | `35bcbcff` |
| 15 Nov 05:50 | `c6711b53` | `57a1d427` | `3caefb03` | `551a22ca` | unchanged |
| 15 Nov 08:55 | `2055762c` | unchanged | `1e54c1c7` | unchanged | unchanged |
| 15 Nov 10:51 | `fb7877d9` | `e02606ec` | `14742ebd` | `048fb15c` | `25680d20` |

Each row used `scripts/deploy.mjs` and wrote a receipt. Health and
the smoke command passed after each row. A row covers every head
that landed since the row before it. The heads `17a917cd` and
`ce6f02ba` changed no Worker bundle.

## Commitments from the 14 November report

| Commitment | Result |
| --- | --- |
| Land the rename of the presentation fields, sign Lending and Counter, and deploy them | Done for Lending. Counter is signed and has no hosted room |
| Land client build steps C2 and C3 | Done |
| Land step E1 of the act environment | Done |
| Land the commit hooks and the scale selection | Done. The hook is on |
| Land one of the three waiting side heads | Done: the celld base family |
| Write the design note of step A before any source of that step | Done. The checker approved it, and it waits for the owner |
| Half-hourly surveys, including overnight. The daily report at 17:00, and the worktree sweep after it | Done |

## Commitments for the sprint ending 16 November, 17:00

- Land the absence proof with the reservation words, then sign
  Lending 0.4.0 and Counter 0.4.0.
- Land the smoke classifier, and name the owner of the smoke failure
  from one workflow run.
- Land the early gate stage for pinned values.
- Land the publisher member's first slice.
- Witness the shelf projection of `lending-library` with one donated
  tool.
- Half-hourly surveys, including overnight. The daily report at 17:00,
  and the worktree sweep after it.
