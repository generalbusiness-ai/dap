# Sprint report, 22 October 2026

Sprint from 21 October, 17:00, to 22 October, 17:00 Eastern. One hosting
deployment was made during this sprint, after checker review of the exact
head: the grow demo's Worker, `dap-grow`, from `main` `c40492ee`, with the
room's archive switched on.

Every landing below had an independent checker review at the exact head.
Code landings also passed their gate. All of it is on `main` at GitHub.

## Direction

[Plan 033](../plans/033-2026-10-18-grow-room-demo.md) stays the order.
F2, the floor, landed on 21 October, ahead of its 4 November date. F3,
the floor enabled for Room A, keeps its 6 November date. The grow room
now writes its archive: slice 9 landed and runs on `dap-grow`. An offline
replay of that archive is the next step, and it does not work yet.

The security remediation continues in its order. D1, D2 and the first
part of the creation admission landed. The sandbox item, R8, is in
progress.

Three design notes look at dap as an operating system: a place where
single-purpose applications run for a long time and change more often
than they are replaced. The kernel page names the small part that every
room trusts. The one-channel audit places every way to read or change a
room. The definition succession note says how a running application
moves to a new definition.

## What landed

### Archive

- F2 and D2 (`2e228b3c`): the retained journal floor and the section
  citation check. A floor lets a scope drop the entries that a confirmed
  archive pass holds. No deployed scope has a floor yet; that is F3. The
  citation check reads each numbered section that a comment or a document
  cites in the scope contract (revision 23) and the authority note
  (revision 28).
- Slice 9 (`c40492ee`): the archive CLI and the local archive mechanism
  for the grow room. Retained floors stay off.

### Security

- D1 (`efc79bf1`): a document of every deployed Worker entry point, with
  structural checks that keep the list complete.
- R1, first part (`f8918e89`): parentless creation admission. On a
  deployment, the public creation path accepts a parentless install only
  when it is the configured register's own install, with a valid
  signature. Every other parentless install and every direct directory
  founding is refused. The gate at the reviewed head: 2,136 cases passed
  and 3 skipped in 462 files; 36 Node and 55 Counter checks passed;
  985 s. Ancestry, the scope index, the turn bound and rate windows
  continue under four requests.

### Tooling

- Security dependency updates (`dac76e3d`): Vitest 4.1.12, Vite 8.3.5,
  Rolldown 1.2.15, PostCSS 8.5.31 and Nanoid 3.3.20, with overrides for
  sharp 0.35.5, undici 7.29.1 and the esbuild under tsx. `npm audit` went
  from 9 advisories (6 high) to 0. The exact Vitest pin in the
  test-selection script moved to 4.1.12. Gate: 2,136 passed and 3
  skipped. These are development tools only, so no deployment followed.

### CLI

- Application listing (`5e8476a1`): the CLI lists a room's applications.
  Its documentation is updated.

### Designs

- The kernel boundary (`6e963c2b`), [docs/kernel.md](../../docs/kernel.md),
  draft 2: three classes of part (kernel, platform service and
  application), a test that places a part, every current part placed,
  eleven parts that fail the test today (K1 to K11), nine promises that
  the kernel makes, and the rule for adding to it.
- One channel (`5cd53dcf`), draft 2: four classes of surface (an act, a
  read at a position, a capability form, and other), every surface
  placed, 23 dispositions and 14 slices. Two slices are filed, as R15 and
  R16.
- Definition succession (`25e1248e`), draft 4. A scope keeps its
  definition for life. An application moves to a new definition through
  a successor scope. The old scope ends at a cutoff entry, and the new
  scope starts from an export of its live items, through a mapping that
  is data. The old scope stays readable and refuses new acts with a
  reason that names its successor. The first slice is a Counter fixture.

### Deployment

- `dap-grow`, Worker version `cfe10de6`, at 08:11, from `main`
  `c40492ee`. The room's archive binding took effect at directory entry
  13. Five journals (Room A, Site, Directory, Rules and Destination) each
  have a v2 pass from position 0.

## Decisions

Recorded in the workroom.

- **Slice 9 native declarations** (`b9e821dd`, `3b744180`). Admission
  takes place at the fresh synchronous consumption fence; preparation
  only stages and charges bytes. One locate call can reuse the checked
  Rules genesis.
- **Scope index, R2** (`3fd5bec0`, `2c18d9be`, `9a583cfd`, `14a5e292`).
  An unknown scope ID never reaches its target object. One fixed index
  holds the IDs of scopes with a verified applied genesis. In register
  mode, a target registers itself from its own genesis. The planner
  sweeps the IDs that each room's record names, checks the listed set,
  and then switches to enforce. Ordinary reads cannot show whether an ID
  is in the index, so that check runs after enforce. If it fails, the
  Worker goes back to register mode.
- **Ancestry, R1** (`fc7099fc`, `99d86feb`). An explicit reviewed policy
  starts from the configured register's applied genesis and exact pin.
  Each creation edge is checked against the creator's exact sealed send,
  and one bounded attempt covers the whole lineage. Two deployed cohorts
  are admitted: register 17 with directory 16, membership 8, rules 10 and
  destination 12 (the grow room); and register 5 with directory 5,
  membership 4, rules 3 and destination 2 (the lending rooms).
- **Rate windows, R12** (`63352b28`). Windows apply at public ingress
  only. Defaults, as deployment settings: creation 10 per key and 30 per
  address in an hour; signed reads 240 per key and 600 per address in a
  minute. A join with no address counts by key. A signed read over its
  window gets 429 with the code `rate-limited`.
- **Retired agent keys, R15** (`9f12029c`). Retire erases the agent's
  seed first, in the transaction that marks the row retiring. A revoke
  signed by another key follows.
- **Publication paths, R16** (`d31ea3d2`). An explicit compatibility map
  lets the deployed lending package keep publishing under `shelf/`.
  Other packages publish only declared paths. The reserved paths are
  listed.
- **Finding 3.12** moves from R1 to R6 (`9d8f12a7`).
- **Archive anchors** (`29fd51b5`, `f15e483c`, `a7d03336`). Each v2 pass
  publishes its anchor list in its manifest: the register and membership
  facts that replay takes on trust. The first pass that new code writes
  also publishes the anchors of the earlier passes. Offline replay uses a
  published list only with an explicit trust option. F3 enables no floor
  on a journal until every pass of it is covered. The byte budget bounds
  each list, and each list must be exact: an anchor that no replay step
  uses is refused.
- **F3 for Room A** (`49eb3992`). The floor is enabled for Room A's exact
  reference only. The `/grow/` page gets two static sentences, and the
  planner publishes each one after its readback passes.

## Filed

- F3 (`8fda2549`): the floor enabled for Room A.
- Offline replay of the grow archive (`7b19837c`): a clone command for
  the archive refs, replay code for the grow room's definitions, and the
  published anchor lists. Kernel parts K7 and K8 are added to it.
- Four continuations of the creation admission: R1 ancestry
  (`84658ea0`), R2 index (`2694fd64`), R3 turn order and bound
  (`03e5f6d7`), and R12 windows (`303772df`).
- R15, the retired agent key (`b66b8f14`), and R16, publication paths
  (`b300dca1`), from the one-channel audit.
- Security dependency updates (`58f160db`).

## In progress

- **R8, the sandbox** (`8ced57e3`). Native fixture, page and RPC repairs
  go to the checker one at a time. The full set of native cases has not
  passed yet.
- **R2 index** (`2694fd64`). The operator runbook and the operator
  integration checkpoint have source reviews.
- **R12 windows** (`303772df`). The source checkpoint has a source
  review.
- **Offline replay and anchors** (`7b19837c`). The anchor source follows
  `a7d03336`. A source review found that nested public scopes could use
  the combined list. A correction is agreed before acceptance.

## What stalled, and why

- **Offline replay of the grow archive.** Step 6 of the runbook failed at
  08:13. There was no clone command for the archive refs, and replay had
  no code for directory 16 or device-command 1. The `/grow/` disclosure
  waits for it.
- **Anchor bound, decided twice.** Ruling `f15e483c` tied the anchor count
  to the pass's entry copies. An earlier decision, `066e49b3`, had already
  widened the list to authority and observation heads, and these have no
  copies. The builder found the conflict in a source review, and
  `a7d03336` replaced the bound. The planner now checks a new bound
  against every decision that changed the same list.
- **Dependency updates.** Two gates failed before the third passed: a
  Grow CLI test passed its time limit under machine load, and a
  dependency copy failed until R1's fixture repair landed. The checker
  then found that the test-selection script still required Vitest
  4.1.11; one line fixed it. The morning's audit output was not saved, so
  the audit ran again against the same lock files.
- **Slice 9 review.** The builder was silent from 04:23. Its gate had
  passed, but the collector wrapper around the gate crashed. The planner
  sent the head to review without a rerun (`d2ce838d`), and slice 9
  landed at 07:51.
- **Verification time** (`7783018d`) had no work in this sprint. The
  archive and security items came first.

## Commitments for the sprint ending 23 October, 17:00

The order below is the build order. Push after each landing. Deploy only
after checker review of the exact head.

| Owner | Work | Request |
|---|---|---|
| Builder | Offline replay of the grow archive, with the published anchors | `7b19837c` |
| Builder | R8, the sandbox, to review and landing | `8ced57e3` |
| Builder | R2 index, R12 windows, R1 ancestry and R3 bound | `2694fd64`, `303772df`, `84658ea0`, `03e5f6d7` |
| Builder | F3 after anchor coverage, by 6 November | `8fda2549` |
| Checker | R8, R2, R12 and the anchor correction | — |
| Planner | Publish the `/grow/` archive sentence after step 6 passes, and record it | `2fcf3c3a` |
| Planner | Run the R2 sweep on `artroom-scope`, `dap-grow` and `dap-lending` after its review | `2694fd64` |
| Planner | Read back the room cohorts on `artroom-scope` | `84658ea0` |
| Planner | File the kernel follow-ups: K9 before R6 and R7; K2, K3 and K11 as one item | to be filed |
| Planner | Counter slices 2 to 6, the floor note's text, history slice H1 | `ecc3ff15`, `c98b5c99` |
