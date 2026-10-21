# Sprint report, 21 October 2026

Sprint from 20 October, 17:00, to 21 October, 17:00 Eastern. One hosting
deployment was made during this sprint, after checker review of the exact
head: the grow demo's Worker, `dap-grow`, from `main` `603220b9`, with the
page invitation fix.

Every landing below had an independent checker review at the exact head.
Code landings also passed their gate. All of it is on `main` at GitHub.

## Direction

[Plan 033](../plans/033-2026-10-18-grow-room-demo.md) stays the order.
The archive dates are unchanged: F2, the floor, lands by 4 November, and
F3, the floor enabled for Room A, deploys by 6 November. If F3 is not
deployed by then, the demo moves to a fresh room. F1 and slice 9a landed
today, so F2 and the slice 9 wiring can now go to review.

Three design notes set the work after the archive. Retained files and
capture with a stated source give a room its intake: a file or a message
enters the record as a capture by a named participant. Roles, flow and
instances give the hosted agent teams their shape: a role is authority,
behaviour and flow, and an instance is one key of a member. The Counter
is the first test of that model.

## What landed

### Archive

- F1 and native 9a (`373f1e59`): incremental archive passes in the v2
  layout, and the native dependency closure for offline replay. Each pass
  has its own directory, under five levels of two-digit directories. The
  scale witness ran 4,609 new signed native inputs through 210 passes at
  the default budget, then a restart and one pass with old and new
  inputs. The builder's gate run at the reviewed head: 2,075 cases in 441
  files, 2,072 passed and 3 skipped; 33 Node and 55 Counter checks passed;
  775 s in all. One review requested changes before the second approved.

### Grow demo

- Page invitation fix (`603220b9`): the web page now accepts invitations
  of membership version 8. The page, retained enrolment custody and the
  CLI join use one list of supported invitation versions. The `dap-grow`
  Worker was redeployed from this head.

### Designs

- The journal floor (`d92cd85e`), draft 6: incremental archive passes, a
  stable v2 layout, and a floor that lets a scope drop archived entries.
  Slices F1 to F3.
- Chat-composed views (`a9094eb1`), draft 3: five chart kinds (line, bar,
  scatter, plan and map) composed in a chat from declared projections.
  Its implementation is not yet filed.
- Retained files (`afe0c319`), draft 4: a file kind of retained input,
  with a digest, a size and a media type. Small files stay in the scope's
  storage and large files go to object storage. An upload is a transfer
  with a lease, and a daily reconciliation finds lost transfers. Slices
  RF1 to RF4.
- Roles, flow and instances (`184ba58d`), draft 4: the role preset as
  data; the planner, builder and checker presets on the issue and change
  lanes; an instance as one active key of a member. Instances of one
  member never count as independent review. The hosted agent teams note
  is amended to this model. Slices RI1 to RI4.
- Capture with a stated source (`0de1f52a`), draft 6: one capture act for
  every channel. The first capture opens a source item, and each
  recapture opens a version item. Captures are ordered by the item's
  revision, and a capturer party records who holds the channel. Slices
  CS1 to CS4.
- The scope contract, revision 23, and the authority note, revision 28
  (`1a19b5ae`): code comments cite these two documents by section. They
  are now on `main`, with five supporting files.
- Status sweep (`25323213`), revision 2: a status statement for 36 design
  notes, 34 plans, the plans index, the test invariants, 14
  implementation notes and the roadmap. Each plan now has one of four
  status forms: current, landed, superseded or retired.

### Other

- Five README updates were made on `main` between 15:09 and 15:51.

## Decisions

Recorded in the workroom.

- **Pass layout** (`f651f6c3`). Each pass has its own directory under
  five levels of pair directories, named 00 to 99. A pass uses at most
  29 + 2(k + m) tree nodes before its inventory, inside the cap of 64.
  This replaced `6bcb546e`. That layout met the metadata budget but broke
  the node cap.
- **F2 contract** (`dc426978`). The state digest is equal for equal
  logical state. Each accepted key is charged 256 bytes plus its UTF-8
  length. The floor keeps the transitive typed own-reference closure,
  never the previous-entry chain, up to 4,096 entries. A pending request,
  delivery-unavailable included, and an applied create request keep their
  sending entry. Key and counter positions folded into state are not
  kept.
- **Slice 9 in production** (`9674108a`). The archiver is host code.
  Its authority is the room's admitted archive binding, and it reads
  exactly two items in-process. Each pass gets a short-lived write token
  from the host's repository binding, so no stored secret exists. The
  archive goes to the room's own repository, with no public address.
- **Verification time** (`6424ac40`). The continuous root case stays
  whole. The next four files with several scenarios are split. Both long
  files go on a proposed scale tier, and neither leaves the gate.
- **One builder queue** (`ca3bfcf3`). One ordered list replaces the
  earlier labels: the archive items, verification time, the security
  documents and the first security fixes, retained files, capture, the
  remaining security items, the agent team slices, and then the journey.
- **CLI gaps head** (`d819eafc`). The head integrates the current `main`
  and runs one gate at the integrated head before review. A failed gate
  plus a follow-up run is not submitted as a gate.

## Filed

- Ten builder requests from an attack-surface review of `main`
  `603220b9`: two documentation items and eight remediation items, in
  order (`51bd88c6`, `0270882b`, `954bf397`, `8ced57e3`, `8a856f92`,
  `183d7066`, `90878601`, `0716e75a`, `d8512f74`, `bb763efa`).
- Retained files RF1 to RF4 (`7a912d5c`, `313b25d7`, `01b7ab9b`,
  `760b702e`), and capture CS1 to CS4 after them (`6f425ed4`,
  `98e0cfae`, `7a173b0f`, `24a92150`).
- Agent teams RI1 (`cad348ea`). RI2 to RI4 follow the Counter contracts.
- A sign-in address that a person who joined from an agent CLI opens in
  a browser (`abe69eeb`), after slice 9.
- Verification time (`7783018d`): measure the scope tests at 1, 2, 4 and
  6 workers, split the longest files, and propose a scale tier.

## In progress

- **F2** (`215e3b46`). The source follows the contract decision. Ten
  focused native cases pass in the builder's runs. The gate and review
  are next.
- **Slice 9 wiring** (`63130d6c`), now unblocked by F1 and 9a.
- **Verification time.** Three of twelve baseline runs are complete. In
  the builder's observed runs, 1 worker passed in 721 s; 2 workers took
  417 s and 4 workers 230 s, and both exited with failures. The failures
  are recorded with their causes.
- **Counter contracts revision 4**, draft 2 (`29c58c73`), in review. It
  answers two findings: retiring one instance must not deactivate the
  participant row that its sibling instances share, and lowering the
  count must retire the key, not keep it for reuse.
- **Security D2**, the citation check (`a35e4c2e`), before review.
- **The grow demo's acceptance** by a person in a chat. The browser join
  works after the page fix.

## What stalled, and why

- **Pass layout, decided twice.** The first decision fixed the metadata
  budget and broke the node cap; the builder's measurement showed 91
  nodes against 64. The second decision came one hour later. The planner
  now checks every budget at its charge sites before a layout decision.
- **F1 and 9a review.** The first review requested changes. A witness
  asserted a wrong boundary: it forbade the bounded local read that
  validates an old retained input. An evidence inventory also listed
  cache files that its own scope excluded. Both were corrected, and the
  second review approved.
- **Counter contracts revision 4** waited about three hours. Its head was
  published under the promise of the landed roles request, so the review
  had no implementation commitment to judge. A fresh request now binds
  it.
- **A builder question on the CLI gaps head** waited from 20 October
  09:40 to 21 October 16:24.

## Commitments for the sprint ending 22 October, 17:00

The order below is the build order. Push after each landing. Deploy only
after checker review of the exact head.

| Owner | Work | Request |
|---|---|---|
| Builder | F2 through review and landing, by 4 November | `215e3b46` |
| Builder | Slice 9 wiring | `63130d6c` |
| Builder | Verification time, beside the archive work | `7783018d` |
| Builder | Security D2 to review; then D1, admission and sandbox | `0270882b`, `51bd88c6`, `954bf397`, `8ced57e3` |
| Checker | F2, slice 9, Counter revision 4, D2 | — |
| Planner | Land Counter revision 4 when approved; file RI2 to RI4 | `9400a9f7` |
| Planner | The floor note's text for the layout and F2 decisions | to be filed |
| Planner | Provision, bind and deploy slice 9 after its review; file F3, then G4 | `2fcf3c3a` |
| Planner | History slice H1 | `c98b5c99` |
