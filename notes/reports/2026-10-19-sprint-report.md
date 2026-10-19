# Sprint report, 19 October 2026

Sprint from 18 October, 17:00, to 19 October, 17:00 Eastern. Two
hosting deployments were made during this sprint, both after checker
review of the exact head: the scope Worker at `main` `2127d5c5` with
the private object-store bucket bound, and the homepage at `main`
`9060775e`. The trust list stays unset, so the host admits no package
install until a release exists.

Every landing below passed its gate and an independent checker review at
the exact head, followed by a checker audit of the landed `main`, unless
the line says otherwise. All of it is on `main` at GitHub.

## Direction

[Plan 033](../plans/033-2026-10-18-grow-room-demo.md) stays the order:
the grow room as the demo, ahead of the journey's MVP slices. This
sprint took it from M2a to the native device-command record in review
and the hosted demo filed. The grow room now has its declared views, its
probes from the chat, its routing to the right people, and durable
presence; what remains for the demo is the device-command record (G5a,
in review), the hosted room with its `/grow/` page (G5, filed), the
demo-room archive slice and G4.

Three design notes landed beside the demo, each with its slices filed
behind plan 033's milestones: self-hosting on celld, members and
presence in the interface, and three sales applications.

## What landed

### Self-contained applications

- M2a (`4d8c878c`): declared projections and the generic interface,
  with the trusted-package presentation limit preserved and the cohort
  defaults explicit.
- M2b (`4b794cf5`): several scopes in one package. A native install
  creates the application's own scopes, here the grow site and room,
  with checked root ownership and selected-scope views.

### The grow room

- G1 (`b54f8880`): the operator's declared views on the card kit, one
  owned native site and room path, fixed device controls, journal
  history, custody and the incident record.
- G2 (`4b4d58b0`): measurements from the chat. A declared act may carry
  declared parameters beside constant arguments; the derived tool
  exposes them as its input schema and the model fills them from typed
  text. Probes are oldest first, with their recorded ages.
- G3, first head (`426504d8`): three typed per-member carousels
  (alerts, tasks, watering) as declared `for` rules over the viewer's
  grants, with bounded presence evidence, explicit unavailable items and
  safe refresh recovery.
- G3, second head (`f6d402b0`): durable presence as a bounded per-member
  item on the site scope, written by its own signer, with the fact
  reference the members note needs for its record screen.

### The sequenced level

- S1, source order (`1da3f4ca`): source order and source time on
  deliveries, with the reserved receiver-pin debit and an explicit
  refusal of native item-bound source order.
- S1, late handlers (`bdda6bd0`): strict verified-source deadlines,
  authenticated refusal or replacement, native settlement boundaries
  and collision-free reservations.
- The post-landing documentation corrections (`a93b6359`): refused and
  superseded sequenced deliveries, plan 033's decision 7 amended from an
  archived level to the archive binding, and the summaries aligned.

### Designs

- The sequenced level and order scope (`3dad6109`): the archive is a
  binding of a room, not a level; a third, sequenced level with its
  order scope; and the Order paragraph in the documentation.
- Application packages, checks and the builder room (`165d5a86`).
- Members and presence in the interface (`9554919b`): one member
  element with identity, standing and presence layers; the service
  resolves party and signer fields into a bounded member table; every
  recorded entry number comes from a fact reference, never from an item
  revision.
- Self-hosting on celld (`6eaae3f7`), with its qualification record.
  Slices H1 and H2 are filed behind the demo.
- The expert section of the learning note, draft 2 (`2127d5c5`): host
  restrictions for the three expert cases, and the separation of an
  accepted answer from an operation's own authorization.
- Three sales applications (`3ed2a08a`): the prospect room, the bid
  response and the marketing calendar as packages on the grow room's
  forms. The note leads with why coordinating in a room is easier than a
  single hosted agent, surveys the personal agents and the field for each
  use case, and cuts the three designs to shape, with slices C1 to C4
  after plan 033.

### Homepage and hosting

- The Jam destination was removed from the homepage (`9060775e`), since
  that demo is not ready; the page stays reachable by its address. The
  homepage was rebuilt and deployed from the landed head, and the
  checker's public check matched the live pages byte for byte.
- Object storage was enabled on the hosting account. The bucket was
  created, and the scope Worker was deployed from `main` `2127d5c5`
  with the bucket bound and the existing settings kept. The register
  configuration was then reduced to the Artifacts register only, and the
  health route reports the register ready.

The homepage head's final gate, as observed: 1,917 cases with 3 skipped,
plus 31 runtime and 55 Counter cases. The device-command record's second
gate, as the builder reported it and the checker audited it: 1,939 cases
with 3 skipped across 401 files.

## Decisions

Recorded in the workroom as the builder asked.

- **S2 split** (`75060e2d`). S2a is the archive binding in the room's
  directory, the manifest requirement and the archiver's target
  resolution, on the fixture-only engine. S2b is the privacy metadata for
  entries with a foreign source and the reviewed policy configuration
  path, before plan 033's demo-room archive slice. Production admission
  and consent stay out of both.
- **S2b provenance** (`b5584b26`). The producer of a retained foreign
  copy is the scope reference in the copy's own bytes, never its name or
  an alias. The map from scope reference to pin is an immutable input to
  the pass, supplied through a fixture-labelled configuration port and
  built from the installed graph's native births. The policy registry is
  keyed by pin; every policy is checked before any body is fetched;
  missing or conflicting provenance refuses the whole prefix. The marked
  selection and the manifest record each source's scope reference and
  pin. Persisting provenance at retention time is deferred to the
  production admission work.
- **G2's age field** (`2efe6272`). A bounded same-scope fact-time
  projection field: a fact-reference slot resolves to the named entry's
  sealed time at the read head. No extra clocks and no raised
  allowances.
- **G3's form** (`72c9d5e5`). Three typed carousels satisfy G3. The
  first head reads presence conservatively from the last hundred
  entries, never shown as absence; the second head moves presence to a
  durable site-scope item per member.
- **G5a's form** (`f3361993`). The capability owns the outcome slots on
  the device item; every open command reserves one answer; the owner is
  bound at install to an existing member with site-to-room delegation;
  four named refusals; archive metadata tables in the same head.
- **Cohort identifiers** (`9192ef3f`). G5a reserves native cohort
  identifiers above S2a's nine; S2a keeps its nine whichever lands
  first.
- **G5a's local grant model** (`86916ce8`). The package check runs on a
  scripted parent creation proof and replay anchor, labelled scripted;
  one real Worker witness proves native issuance and membership.
- **G5a's gate budget** (`f20558ab`). Three gates failed only on the
  framework's five-second timeouts in the one-isolate workerd project,
  while the same code cleared another gate and no behaviour assertion
  failed. The project gets an explicit thirty-second timeout as a
  reviewed configuration change inside the head, followed by a new gate;
  every case-specific limit stays; the failed gates stay on record; the
  gate-stability investigation (`1d3a13e3`) stays open after G5a.
- **G5's simulator** (`74c94c4d`). Command coverage: a durable
  scanned-through position carried on the sensors' reading summary,
  advanced by a bounded forward scan in journal order that never passes
  an unanswered command, since every open command reserves an answer.
  Authority: a distinct climate agent with its own key in the same
  Worker, as the grow note's member table says; exact principals by
  immutable party slots and signer guards, because membership has one
  agent role; heater authorization stays person-only; both agents enrol
  before install. The declared scenario must clear the fault without a
  person inside its period so the incident count climbs between visits.
- **Closing the backlog.** Forty-four requests to the planner from 13 to
  17 October, each delivered, superseded by later work or out of date,
  were closed by supersession with a reason each (`ba9a1947`).

## In progress

- **G5a, the native device-command record** (`5aae9b0a`). Three review
  rounds: two literal ordering cases, then a conditional targetAt write
  that could drop its command and answer reservation. The third head
  (`7f15e2be`) is in review.
- **G5, the hosted demo** (`78fba9fc`), filed when G5a reached review:
  the package release with an operator-set trust row, the simulator as a
  separate cron-triggered Worker speaking only through the public member
  interface, the operator's runbook, the `/grow/` page as the fifth
  homepage destination. The builder's preparation has a pure clock and
  target simulation, the landing page, and a tick driver on in-memory
  native rules.
- **S2a** (archive binding and manifest requirement) is in progress.
  **S2b** has its provenance decision and continues from preparation.
- **D1**, the member element's browser packet from the members note, is
  in preparation; B1 to B3 follow it.
- **P1 to P3** (package checks and the builder room), **H1 and H2**
  (self-hosting), **S3 to S5** (the sequenced level) and the two CLI
  documentation gaps are filed and queued behind the demo.

## What stalled, and why

- **Three failed gates on one head.** The device-command head's gates
  failed on framework timeouts in the workerd project, not on the code
  under test. The project-level budget above is the fix; the open
  gate-stability investigation keeps the question of load on the shared
  machine.
- **Two untouched files failed a gate** on the homepage head under load
  (a lending query reply and a directory-partition capacity race); a
  single-file rerun of the capacity witness passed, the lending witness
  failed again, and a third full gate passed. Both logs stay on record.
  The capacity race was the same witness that failed the G3 second
  head's gate, and the builder corrected it there.
- **A linked dependency directory.** A gate run in a planner worktree
  with `node_modules` linked to the shared checkout let the gate's
  install step empty the shared view before installing its own. The
  shared view was restored from the lock file. Worktrees now get a
  cloned view, never a link.
- **A delivered head cannot report.** A request that owes a landing to
  `main` refuses an ordinary report once the head has landed; the
  outcome is recorded as an assertion resting on the request and its
  promise, the same pattern as yesterday's parent closures.
- **Object storage** was blocked on the hosting account until midday;
  the deployment steps ran within the hour of its enablement.

## Commitments for the sprint ending 20 October, 17:00

The order below is the build order. Push after each landing. Deploy only
after checker review of the exact head.

| Owner | Work | Request |
|---|---|---|
| Builder | G5a: the third head through review and landing | `5aae9b0a` |
| Builder | G5: the hosted demo, integrated after G5a lands | `78fba9fc` |
| Builder | S2a, then S2b on the provenance decision | `f54185fb`, `c8c6ff6b` |
| Builder | D1 packet, then P1 to P3 | `e0759789`, `4e63c67c` |
| Checker | Review the heads above in order | — |
| Planner | Land G5a when approved and push; set the trust row, deploy and run the runbook for G5 after its approval | — |
| Planner | File the demo-room archive slice when S2a, S2b and G5 are in review; then G4 | to be filed |
| Planner | One documentation head amending the grow note's section 6.2 and its member table from the recorded decisions | to be filed |
