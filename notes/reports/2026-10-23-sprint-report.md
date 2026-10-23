# Sprint report, 23 October 2026

Sprint from 22 October, 17:00, to 23 October, 17:00 Eastern. Seventeen
heads landed on `main`, and the planner made nineteen hosting deployments.
Every landing had an independent checker review at the exact head, and
every deployment followed that review.

## Direction

[Plan 033](../plans/033-2026-10-18-grow-room-demo.md) stays the order.
The grow room's archive is the open item: it has not completed a pass
since it was switched on, and this sprint was spent finding why. The
cause is now known (see "What stalled, and why"), and its fix is in
progress.

New rooms now start on a dedicated Worker, `dap-demo`, with an open
register. `artroom-scope` keeps its existing rooms and saved creation
requests. It no longer offers new rooms, and its Start page links to
`dap-demo`.

The security rollout from the remediation plan is now live on `dap-grow`
and `dap-lending`, with the index in enforce mode and the screen sandbox
deployed.

## What landed

### Archive

- Offline archive replay (`b52ca7e3`), with refusal of remotes that carry
  credentials.
- Diagnostics for the stalled archive passes, one step at a time:
  - pass diagnostics (`4d9aa2cf`);
  - parent-read phases (`525cb3a9`);
  - fixed failure phases for scope registration (`a9c25125`);
  - the advertisement refusal (`27abf6d9`);
  - the HTTP response refusal (`5253d7fb`), then its exact status
    (`919710c2`).
- Two protocol fixes:
  - Git protocol 2 reads for archive parents (`132a5e2a`);
  - acceptance of the service line that comes before the protocol 2
    reply (`8dd302ae`).

### Security and kernel

- Screen isolation and scope admission controls (`f7b59bf9`): screens
  and page keys (R8), the scope index (R2), creation lineage (R1) and
  serving windows (R12).
- Hosted rollout settings (`aa016e0e`).
- Commit-message bounds and a historical audit (`085a3042`).
- Kernel page: K7 and K8 are closed by the replay landing (`4e4515a6`).
- K9: definition validation is bound to its declared format (`84213a7b`).

### Documents

- The coherence documents (`dfde0e64`): the kernel filing rule, promises
  10 and 11, and one status form for notes.

### dap-demo

- Part 1 (`12d30573`): the dedicated `dap-demo` Worker and the setup of
  its open register. `artroom-scope` refuses a bare creation request.
- Part 2 and the outsider claim (`93f761c4`):
  - the Start page on `dap-demo`;
  - on `artroom-scope`, a notice with a link to `dap-demo`;
  - a CLI claim by a key outside the founders, through the public
    creation offer.

  Both settings for the Start page now live in the Worker's
  configuration file, so no deployment repeats them.

Hosted check after the part 2 deployment, at 16:23: a visitor key
outside the founders ran `dap claim` on `dap-demo` and created its room.
The room has directory@16, membership@8, rules@10, destination@12 and
inbox@1. The visitor then read the room through MCP with its ordinary
authority. Both Start pages serve, and the `artroom-scope` page carries
the `dap-demo` notice. A real browser Start remains to be run.

## Deployments

All from reviewed heads, with the settings inventory checked before and
after each Worker change.

| Worker | Versions | Purpose |
|---|---|---|
| `dap-grow` | `3298f87f` (22 Oct, 23:22) | Archive replay |
| `dap-grow` | `51abe712`, `520aa54f`, `9c2b53e3`, `cded794a`, `5c871830`, `c0a4744f`, `c0ed7918` | Archive diagnostics and fixes |
| `dap-grow` | `fbb6468f` and `1312b23c`, then `ac5d4883` | Security rollout: index in register mode, then enforce |
| `dap-lending` | `bc4c0d0c`, then `061eba5e` | Security rollout: register, then enforce |
| Sandbox Worker | `64f472f7` | Screen sandbox for the grow room |
| `dap-demo` | `1c7e04bf`, then `0a41f616` | Part 1, then part 2 |
| `artroom-scope` | `8c344ef1`, `22fb24f4`, then `f85a084e` | Security rollout in register mode, bare creation refused, then the notice |

Verify sweeps after the security rollout: `dap-grow` 11 of 11,
`dap-lending` 8 of 8 and `artroom-scope` 9 of 9.

## Decisions

- `dap-demo` takes all new rooms. `artroom-scope` keeps register mode and
  its existing rooms.
- The Start configuration and the Git host configuration of `dap-demo`
  are plain values in its configuration file (`bf7feb55`). The
  deployment name is already public in `/health`. The deployment name
  and session secret stay secrets.
- The live deployment values for the Start configuration (`8d8abc68`).
- The public SDK plan publishes seven packages, with `package-graph`
  added (`a37ecb16`). The platform's `./application-install` export stays
  internal (`200554c2`).
- For the archive fetch (`da1b3d2f`): use the `blob:none` filter with a
  depth of 1. Keep the wanted object, bounded by the existing byte
  limits. Keep the response check unchanged.
- A new checker session took over at 09:30, with a written orientation
  (`8dbe0765`). It approved five heads during the sprint.

## Filed

| Request | Work |
|---|---|
| `de76a01f` | `dap-demo` part 1 |
| `2fcb4c68` | `dap-demo` part 2 |
| `a9c678d0` | Outsider claim from the CLI, found live in the part 1 acceptance |
| `2e714fd7` | K9, before R6 and R7 |
| `30c7c3ec` | K2, K3 and K11 as one item, after the rename |

## In progress

- Archive fetch fix (`ac1a5d6f`): `blob:none` with a depth of 1.
- Workspace rename (`5c54039c`), with the seven-package SDK plan. The
  checker's early assessment found no required change.
- R16 consumer slice: early assessment complete.
- A possible scale-test flake from the part 2 gate (`6f7839e1`): one
  send was refused as unavailable; the cause is unknown.

## What stalled, and why

- **Archive passes.** No pass completed this sprint. Each diagnostic
  head moved the refusal one step later:
  1. the protocol 0 advertisement lacked the shallow and filter
     capabilities, so the reader moved to protocol 2;
  2. the protocol 2 reply starts with a service line, and the reader now
     accepts it;
  3. the fetch answer was refused, with status 400.

  A planner probe against a scratch repository on the same host then
  read the reply text: the host supports only the `blob:none` fetch
  filter, and the reader sent `tree:0`. The advertisement names
  "filter" but not the filter kinds, so no capability check can see
  this. Each step needed a review, a deployment and a tail.
- **Grow outage report at 05:18.** A sweep right after a deployment found
  five scopes missing. It was a seven-minute changeover between
  versions, not an outage (correction `37c35005`). Sweeps now wait at
  least five minutes after a deployment.
- **Outsider claim.** The part 1 acceptance found that the CLI read the
  register summary first, and only members can read it. The part 1 test
  sent the founding act directly and never ran the CLI. The fix landed
  with part 2, and its test runs the real CLI claim as an outsider.

## Commitments for the sprint ending 24 October, 17:00

| Owner | Work | Request |
|---|---|---|
| Builder | Archive fetch fix, to review and landing | `ac1a5d6f` |
| Builder | Workspace rename with the seven-package SDK plan | `5c54039c` |
| Builder | R16 consumer slice | — |
| Builder | K2, K3 and K11, after the rename | `30c7c3ec` |
| Checker | Archive fetch fix, rename, R16 | — |
| Planner | Deploy the archive fix, read the tail, rerun archive step 6 | `ac1a5d6f` |
| Planner | Publish the `/grow/` archive sentence after step 6 passes | `2fcf3c3a` |
| Planner | `dap-demo` browser Start and a cold index read | `2fcb4c68` |
| Planner | Counter slices 2 to 6, history slice H1, Lending readback | `ecc3ff15`, `c98b5c99` |
