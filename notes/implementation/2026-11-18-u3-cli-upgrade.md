# U3: dap application upgrade, and the screen after an in-place upgrade

U3 builds step 3 of
[the application upgrade note](../2026-11-17-application-upgrade.md). The
command line files U1's `upgrade-application` act in both forms. The screen
host of an installation serves its current presentation, so an in-place
upgrade needs no new screen-host row. U3 deploys nothing.

## The command

The note's scene names `dap app upgrade`. The command line has no `app`
verb. It reads one installation with `dap application <item>`, and it
groups subcommands under one verb, as `dap issue open` does. So the
command is a subcommand of `dap application`:

```
dap application upgrade <item> <git+https-uri> --release <id> --request <key>
dap application upgrade <item> <git+https-uri> --release <id> --request <key> --replace [--role <role> ...] [--values <JSON>]
```

`packages/cli/src/line.ts:93` and `applicationUpgrade` (`line.ts:158`)
read the line. The in-place form takes no `--role` or `--values`. The
command runs under the request custody of `dap install`
(`packages/cli/src/application-install-runtime.ts:53`).

The client does the work in `upgradeApplication`
(`packages/client/src/install-request.ts:425`). To make that easy, the
install request now shares three parts with it:

- `installSelection` (`install-request.ts:251`): the bounded install
  options for the room's Rules pin;
- `trustFor` (`install-request.ts:263`): the `APPLICATION_TRUST` row for a
  release at its Git source;
- `submitRequest` (`install-request.ts:317`): custody, recovery of a lost
  reply, the send, and the receipt and entry checks. The install's custody
  meaning does not change, so a kept install request resends as before.

`signedApplicationUpgrade` (`packages/client/src/application-install.ts:92`)
signs `upgrade-application` on item N at its revision. It carries the
install's fields; the in-place form leaves out `roles` and `values`, as
Rules 16 requires.

### Refusals before signing

Each refusal is one line and leaves custody empty under the key
(`upgradeRefused`, `application-install-runtime.ts:161`).

| Reason | Where | Check |
| --- | --- | --- |
| Untrusted release | `install-request.ts:442`, before custody | The trust row of `dap install`. The command fetches no package. |
| `application-upgrade-pending` | `install-request.ts:457`, in custody's build | A pending installation whose `replaces` names N, or an in-place fetch of N with no decisive outcome. |
| Semantic identifier changed in place | `install-request.ts:459`, in custody's build | The package's semantic identifier differs from N's, and `--replace` is absent. With `--replace`, an equal identifier refuses too. |
| N not an active installation | in custody's build | One item query reads N and every pending successor. |

The checks that read N run in custody's build, so a repeated command under
a kept key resends its envelope and never reads N again.

The pending check reads what U1's guard reads, through public reads:

- An open replace is a pending installation with `replaces` = N. One item
  query of the `installation` type returns N and every such item; Rules 16
  holds at most 64 installations.
- An open in-place upgrade is N's `upgradeAt` reference and the operation
  `<upgradeAt>:0`. No read returns an operation, so `inPlaceFetchOpen`
  (`install-request.ts:401`) reads the Rules journal from `upgradeAt` with
  the session's `log` read and finds the outcome of attempt 1. The fetch
  opens one attempt. When the read is not whole, or needs more than eight
  pages, the command does not decide and Rules judges the act.

U1's guard reads a derive state view, which the client does not hold. The
command repeats the guard's question, not its code. Rules still judges
every act, so a stale read costs one refused act, never a wrong one.

`dap application <item>` now also reads a `replaced` item under a Rules pin
that declares that state (`install-request.ts:484`).

## The screen

**Before.** A screen-host descriptor names a screen origin, a directory,
an item and a presentation. The sandbox, the room's `screen` entry and
the browser client each matched a path only at the descriptor's
presentation (`applicationScreenHostMatches`), and the client also
compared the context's presentation with the descriptor's. The room's
route already reads the installation for every screen request and serves
only the item's current presentation (`route.ts`, `screenResponse`). After
an in-place upgrade, the item's presentation changes, the path of the new
presentation no longer matched the descriptor, and the screen answered
404 until an operator moved both rows.

**After.** `applicationScreenHostMatches`
(`packages/client/src/application-gateway.ts:36`) matches the descriptor's
directory and item at any presentation. `bindApplicationScreenHost`
(`application-gateway.ts:89`) no longer compares presentations: the
context read already ties the context's presentation to the page's
address. The room's route stays the one check of the presentation, so the
hostname serves N's current presentation and refuses every other one.
The descriptor keeps its `presentation` field, because screens whose
client predates this change read it from `/_application-host` and compare
it with their own.

| Screen request | Durable Object requests before | After |
| --- | --- | --- |
| `/_application-host` | 0 | 0 |
| Page, asset or `_/context` at the current presentation | 2: the Directory's `applicationRoom` and the Rules `applicationInstallation` | 2, unchanged |
| A path at another presentation of the same item | 0: the sandbox refused it | 2, then 404 |

A screen load costs the same. Only a stale path, such as a bookmark from
before an upgrade, now reaches the room. No new read, alarm or wake.

**What moved in review.** Before U3, an operator reviewed each
presentation when they moved the screen rows. Now `APPLICATION_TRUST`
is the review: the hostname serves any release of N that the trust list
names and that U1's in-place rule admits. The semantic identifier,
definition and publisher stay N's.

A replace opens a new item, which needs its own row, as before.

## Tests

- `packages/cli/test/application-upgrade.test.ts` (plain): the command
  line, the client and custody against the real Native judges of the
  `upgrade` family (`platform/test/support-upgrade.ts`). The scope routes
  and read session are stand-ins in the same process. The Git host is
  `gitPackages` (`packages/mcp/test/support/install-room.ts:55`), the
  install room's Git host made to serve several packages. It shows the
  in-place act and its output, N's new screen line after the host's
  answer, the replace form and its successor, and the three refusals.
- `packages/scope/test/screen-upgrade.test.ts` (native): the genuine
  `upgrade` family, the MCP install, a real in-place act with its host
  fetch, the production sandbox Worker, the room's
  `ApplicationScreenService` and the client's `loadApplicationScreenContext`.
  The descriptor names N's first presentation.
- `packages/cli/test/install-cohort.test.ts`: three syntax refusals.

## Reds

`scripts/control.mjs` changed one line, ran the named file, and restored
it. Each test passed before the change and failed by an assertion with it.
The outputs are in `artroom-evidence/2026-11-18-u3-red/`.

| Red | Line changed | Failing assertion with the change | Output | SHA-256 |
| --- | --- | --- | --- | --- |
| (1) an open upgrade of N refuses before signing | the in-place fetch check in `upgradeApplication`, made `false` | the command signs and Rules refuses: `"Upgrade request: refused (guard-failed: application-upgrade-pending)…"` instead of the one-line refusal | `1.txt` | `779e8304fe44b7830402557049cec7928e78d87798fc457c2a534108760ecd58` |
| (2) a changed semantic identifier refuses in place before signing | `if (!replace && !same)` made `if (false)` | `"Upgrade request: refused (bad-field: invalid-application-package)…"` instead of the one-line refusal | `2.txt` | `5cb7d13215fdbb55615bc164218c132e1f48fa176acbaa5d2e276df6d364f1cb` |
| (3) an untrusted release refuses before the package fetch | the trust check before custody removed | `"The package bytes do not match the expected signed release…"`: the command fetched the package first | `3.txt` | `898831e6330beffdbf9ddba2a32ea2480570f7e3a0083f3b9930353d2ca67362` |
| (4) a screen read after an in-place upgrade serves the new presentation | `applicationScreenHostMatches` compares the presentation again | `a screen read after an in-place upgrade serves the new presentation: expected 404 to be 200` | `4.txt` | `265c211935f5f09e2e3d926c2304947666887742b1711b624691fa8548554755` |

With the CLI checks removed, Rules refused each act, so the room never
took a wrong upgrade. The reds show that the command refuses first, in
its own words, and signs nothing.

## Pinned values that moved

| Owner | Old | New |
| --- | --- | --- |
| Seal of `packages/client/src/application-install.ts` | `f6c69d8f3abb87eaaecdaf25360deaaca98eec3ca6cb57a5912d72121cb1000c` | `a3927463578dd61121888b27f9f2af7c6c295f0ca653b63a45f36c62560a996e` |
| Seal of `packages/cli/src/line.ts` | `3cb0933073668b77d6aef44676168445f418a735af7c6e4c22c59ab3d409fcb3` | `70f9cc725e72c500e6873b58ed02911fde0458834dd62eafa3c8987ab5d5134d` |
| Seal of `packages/client/src/application-gateway.ts` | `7745e62033ad7664837928e20d0f832fc02bd095534a6ea82f1a83d8fae0ec26` | `fbd240398b141bd081fa8f03725a0255a07cf0666964d23c7a31e49292744e72` |
| Open Lending 0.6.0 presentation | `sha256:f127d30a7db0bbc241a22d881387eca38719c5bd64e533b5bf5d7523a06bb880` | `sha256:6153d94842dffeadaab5cfb8c6db3f417021daf8c1f9e2fb07a3bdfd110f1e84` |
| Open Counter 0.7.0 presentation | `sha256:ec1ea5c6ca72a2fff8e0bd2bcbc595ef4f025d14d3e23fbecae5d081b13d0b14` | `sha256:9df0d33ee9fc9cebf5be0d5d6562f6b37aecdbf8338cc338f3d2a63f1dfc41d7` |

Each seal is the value that `scripts/security-entry-points.test.mjs`
prints for the reviewed source. The open screens bundle the client's
screen matcher, so their presentations move. The page and card modules do
not move. No signed release changes.

## For U4

A screen whose client predates U3 still compares the descriptor's
presentation with its own. Counter 0.6.0 is such a screen. Its row stays
correct until the upgrade. After an in-place upgrade to Counter 0.7.0,
the hostname serves 0.7.0's presentation, so U4 must sign 0.7.0 from a
head that contains U3. A rollback to a release whose client predates U3
needs its row moved back to that presentation.
