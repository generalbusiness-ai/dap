# RS1: release held reservations

## Source decision

Request `e3dff17f7fef7784c7b5474b01fb8600765f1349` and promise
`3e6b93a4b8d31741bcfced1e0515d76e35116142` track this change. Planner ruling
`18a5bdb1257a61b9d25b4a0a45442d545d54b9f4` answers precode question
`0a1fbb09`: use two existing-form acts and allow two live holds per member.
The isolated source branch starts at published main
`c6711b53a368d24c1fad2830ea5634c045999ce1`.

`reserve` fixes `holder` to the signer's member reference. Its existing
`tool-day-taken` guard still runs first. A second guard counts held
reservations for that holder before opening: `max: 1` permits a second
hold and refuses a third. The existing item bound permits eight live
reservations globally. Final reservations count toward neither limit.

`release` requires `lending.member`, a held reservation, and its holder as
signer. `release-by-staff` requires `lending.staff` and a held reservation.
Both write only the final state `released`. The tool, holder, day, and
until remain unchanged. No shared action grants both authorities, so the
two acts state the authority without a new grant predicate or form.
The existing timed lapse remains unchanged and still ends at `lapsed`.

Day labels remain opaque text of at most ten bytes. Authors use
`YYYY-MM-DD` and supply `until` explicitly. The definition imposes no
calendar alignment or maximum duration. The two-per-member policy does
not guarantee every member a share of the global eight or prevent repeated
reuse of a freed slot. Release changes no tool state or publication.

## Authored package and witnesses

The authored package and retained descriptor open Lending `0.4.0`.
The prior `0.3.0` release stays unchanged. Signing END
`37119ff2` closes the planner's Lending and Counter `0.3.0` signing interval;
its packet carrier is not an RS1 source baseline or a new installed release.

The optional manifest capability input follows ruling
`3991b73ba260a11a1562711d39e4950b054ff079`. `manifest` accepts an explicit
application capability declaration and otherwise keeps its existing
entry-definition defaults. Lending passes the same `publication-paths@1`
declaration with prefix `shelf/` through that input instead of overriding
the returned object. The Define package owner distinguishes replacement
from merging by supplying explicit publication metadata over an inferred
`hold@1` default. No capability schema or platform behavior changes.

The Lending definition owner adds one flow that refuses a third hold and
a nonholder release, permits holder release, lets another member take the
freed tool/day, and permits a staff-only grant to release another holder's
reservation. Further reservations show that the member bound also frees.
It checks the unchanged tool and refolded state. Existing lapse and opaque
day-label assertions remain. R's older prerequisite fixture removes the
two RS1 acts from its cloned definition before restoring its original
reservation form, so those independent form tests keep their old boundary.

The authored story keeps its original circulation, refusals, and lapse.
It records the new holder party in reservation effects, then appends a
fresh available tool and the holder/staff release flows. The member and
staff actors retain distinct existing grants. The original R notes and
all historical records remain unchanged.

## Evidence and remaining work

This is an uncompiled, unrun source checkpoint. No project import,
compiler, test, parser, producer, canonical comparison, browser, model,
seal calculation, dependency setup, gate, or release operation ran here.
The table records obligations, not results.

| Check or output | Command or whole owner | Result |
|---|---|---|
| Changed authored source | Lending and Define compiler contexts | UNRUN |
| Definition judgment, bounds, release, and retained byte/pin agreement | `examples/lending/definition.test.ts` | UNRUN |
| Manifest default/override and retained descriptor agreement | `packages/define/test/package.test.ts` | UNRUN |
| Normal definition, pin, and scenario production | `node --import tsx examples/lending/scripts/pin.mjs` | OWED; no generated file edited |
| Retained scenario consumers | Whole `packages/cli/test/application-examples.test.ts` and applicable existing story/native Lending owners | UNRUN; actual produced counts must precede any expectation update |
| Canonical application tuples | Normal three-way comparison | OWED; Grow and Counter must stay unchanged |
| Required pre-START checks | Shared helper, whole typecheck, whole Security owner, and whole CLI examples owner | UNRUN |
| Full gate and review | `npm run gate`, then review | UNRUN; gate follows the NF four-promise head and CB1/LS1 |

`definition.json`, `pin.ts`, `scenarios/application.json`, and release
identifiers still hold the published baseline. They do not yet represent
these authored forms. The normal producer must judge the story and supply
actual output before byte/pin and scenario-consumer correspondence can
pass. The CLI examples owner currently retains the old scenario counts;
this checkpoint neither guesses replacements nor weakens that assertion.

No packets, signer, trust rows, Worker configuration, grants, Directory,
Destination, receipt path, Counter source, or browser controls change.
The signing END releases the temporary signing hold; it does not promote
RS1 ahead of its assigned gate order. Planner question
`a7f24240fc3d79a7f6b38652407832ad31a20a14` concerns later signed-presentation
drift on the separate NF head. RS1 keeps the explicitly approved open
`0.4.0` until the planner changes its number or order. Actual future main integration,
validation, canonical outputs, review, landing, and any later release
remain owed. This source checkpoint claims no hosted or physical-device
acceptance.
