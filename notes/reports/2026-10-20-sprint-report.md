# Sprint report, 20 October 2026

Sprint from 19 October, 17:00, to 20 October, 17:00 Eastern. Two
hosting deployments were made during this sprint, both after checker
review of the exact head: the grow demo on its own Worker, `dap-grow`,
from `main` `8aad37bb` (which holds the reviewed G5 code landed at
`7594822c`), and the homepage with its new heading from `main`
`248aab8f`.

Every landing below passed its gate and an independent checker review at
the exact head, followed by a checker audit of the landed `main`, unless
the line says otherwise. All of it is on `main` at GitHub.

## Direction

[Plan 033](../plans/033-2026-10-18-grow-room-demo.md) stays the order.
The grow room now runs as a hosted demo: a simulator Worker drives the
room's devices and readings, and agents and people act through the
public member interface. The next demo step is the demo-room archive,
slice 9.

The hosted room writes about 4,800 entries a day. Three readings of Room
A on 20 October: position 165 at 07:18, 986 at 11:21 and 1,180 at 12:25
Eastern. A scope holds at most 100,000 entries, and archiving copies the
journal without reducing what the scope holds. So Room A fills between
9 and 10 November. Two findings follow from this. Slice 9 is the archive
only, and a separate design, the journal floor, lets a scope drop
archived entries. The floor note is in its sixth draft. Its slices are
F1, incremental archive passes, before slice 9 deploys; F2, the floor,
landed by 4 November; and F3, the floor enabled for Room A, deployed by
6 November. If F3 is not deployed by then, the demo moves to a fresh
room.

## What landed

### The grow room

- G5a (`a00eda3b`): the native device-command record. A bounded
  capability owns the outcome slots on the device item, each open
  command reserves one answer, and only the owner writes the outcome.
- G5, local code (`7594822c`): the signed demo packet, the separate
  scheduled simulator Worker with bounded owner ticks, the combined
  first-room cohort, the operator's runbook and the `/grow/` homepage
  destination. Gate: 1,977 cases with 3 skipped, plus 31 runtime and 55
  Counter checks.
- The host-link follow-up (`c7aaa3ab`): the public addresses and
  commissioning variables for the demo's own Worker.
- G5, hosted: the demo runs on the `dap-grow` Worker, with its own
  register, the demo room, its site, Room A, four zones, twelve devices
  and the benches, the simulator and two agents. The acceptance by a
  person in a chat is still open.

### Members and presence

- D1 (`8aad37bb`): the member element's design packet, with the rendered
  states, themes and widths. Design only.
- B1 (`9c6d344c`): the member element, its native resolution of party
  and signer fields, and repaired indexed fact-signer metadata.

### The archive

- S2a (`fb390d88`): the archive binding in the room's directory, its
  admission and target resolution, and the combined device and archive
  cohort.
- S2b (`7bc1490c`): the structural reader repair and the archive metadata
  for entries with a foreign source. Fixture-only.

### Consolidation and package checks

- K2 (`d2088d23`): test fixture consolidation across 217 paths.
- K1 (`13193f31`): helper consolidation across 126 paths.
- P1 (`be63c49b`): package validation. Two complete reviews requested
  changes before the third approved. They found lifetime fan-in counted
  by send rows instead of distinct keys, cycles hidden when an
  alternative branch had no state condition, wrong lending counts, and
  an empty or filtered universal guard that hid an automatic cycle. All
  are fixed.

### Designs

- Sequence and event identifiers (`2fcd50ab`), draft 6. The
  implementation of its section 8 is paused while the level it targets
  is discussed.
- The brokered market and the use-cases regrouping (`7a148325`): read
  rights follow rooms; a market room, one provider room for each
  provider, and the two packages; use-case groups 3 and 4 split, with
  cases 46 to 51.
- History out of the readable tree (`2a77bc5f`), draft 3: an inventory
  with a disposition for each file, one current platform cohort, history
  homes outside the active source, an active manifest with a tree gate,
  saved install plans and behavior witnesses. Slices H1 to H8.

### Homepage

- The heading, descriptions, preview card and README now say
  "Structured workrooms for people and agents." (`248aab8f`). The
  homepage was deployed from that head.

## Decisions

Recorded in the workroom.

- **The demo's own Worker.** The grow demo runs on a separate Worker,
  `dap-grow`, with its own register. The existing scope Worker and its
  rooms are unchanged.
- **Slice 9 is the archive only** (`978597d1`). The journal bound is the
  floor note's work. The `/grow/` page does not say or imply that
  archiving keeps the room running.
- **The archive repository** (`7d947a6b`). Slice 9 archives into the
  room's own recorded repository, under the journal refs, with no
  separate repository and no destination override.
- **Offline replay of the demo room** (`08e261c4`, `bd3ace9f`). A clone
  replays offline with the room's journal and the journals of its
  directory, rules and destination. It trusts each journal's head and
  one anchor, given by the caller: the register fact that the
  directory's genesis names as its source. The register's journal and
  the membership journal are not archived. This work is slice 9a, a
  prerequisite of slice 9.
- **Membership copies in the archive** (`3e2761e6`). A copy of a
  membership entry inside an archived directory, rules or destination
  journal is accepted only when its kind is on a reviewed list of kinds
  that record no secret, and its bytes hold no secret field. Any other
  copy refuses the whole export.
- **Native value domains** (`74a99989`). Five platform value domains
  that the admitted rules and destination versions declare are listed in
  code, each with its pin, data digest and declaring place. Any other
  custom domain still refuses the export.
- **B1's prober and roles** (`656d21f5`, `8d3585c3`): a fact-signer
  projection field beside the fact-time field, with the 16-effect bound
  kept.

## In progress

- **The journal floor note**, draft 6 (`151c37ff`), in review. Five
  reviews requested changes. Among the gaps they found: bookkeeping that
  replay could not see, size proofs that a later entry could decide,
  completed request rows, retained files that a later pass would move,
  no bounded lookup from a retained key to its pass, and an unbounded
  reset on a change of repository.
- **Slice 9a**: native cohort admission, the dependency closure and the
  single anchor. Three findings this afternoon, each answered at the
  next hourly survey.
- **The chat-composed views note**, draft 2, in review.
- **K3** (page custody), in review.
- **G5's operational acceptance**: the person-in-chat check on the
  hosted demo.

## What stalled, and why

- **Archive and capacity.** Archiving copies a journal but does not
  reduce what the scope holds. And A3 cannot archive a scope of more
  than 4,096 entries, because each pass reads from position 0. At its
  present rate Room A passes 4,096 entries on 21 October. The first finding came from the builder's preparation of
  slice 9, the second from the floor note's survey of A3. Together they
  moved the floor note to the front of the planner's queue.
- **Offline replay found three boundaries in turn**: the native cohorts
  that the archive policy did not admit, the membership copies inside
  the directory and rules journals, and the platform value domains. Each
  needed a planner decision before the builder could go on.
- **Wrong times in three planner decisions.** Each was corrected by a
  later act (`f12018c8`, `4e735ea7`). The planner now reads the clock
  before it writes a time.

## Commitments for the sprint ending 21 October, 17:00

The order below is the build order. Push after each landing. Deploy only
after checker review of the exact head.

| Owner | Work | Request |
|---|---|---|
| Builder | Slice 9a: native cohort admission, dependency closure, anchor | `4fb21172` |
| Builder | F1, incremental archive passes, when the floor note lands | to be filed |
| Builder | Slice 9's wiring after 9a and F1 | `63130d6c` |
| Builder | K3 through review and landing | `1c59d16c` |
| Checker | The floor note, the views note, 9a and K3 | — |
| Planner | Land the floor note when approved; file F1 and F2 | `f9fcee34` |
| Planner | Land the views note when approved | `80f0a827` |
| Planner | History slice H1 (notes and plans); then Counter contracts revision 4 | `c98b5c99` |
| Planner | Provision, bind and deploy slice 9 after its review | `2fcf3c3a` |
