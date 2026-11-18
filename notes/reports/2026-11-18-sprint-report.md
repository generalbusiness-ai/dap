# Sprint report, 18 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 17 November to 14:00 on 18 November,
when work stopped three hours early. Twenty-four heads landed on
`main`, and seven deployments followed. One act now upgrades an
installed application, and a hosted room took two such upgrades with
its state kept. A room, a store and a Counter ran on a self-hosted
Mac and came back unchanged after a full stop and start. Deployed
settings now fail closed. Three landed heads are not deployed yet.
The cost-of-change review is below.

## Story: one act upgrades an installed application

A room owner upgrades an installed application with one act, and
`dap application upgrade` sends it. A release that changes only its
presentation updates the installed item in place. The item keeps its
storage, its members and its journal.

- The upgrade act lives in a new rules definition. An in-place
  upgrade must keep the same publisher and must name a release that
  the room's trust list holds.
- The archive follows an upgraded item, so a clone of the room still
  verifies.
- Admission reads the current state of an installation. A replaced
  item stops accepting acts.
- The room's screen keeps working across an in-place upgrade. A
  trust-list change now also reviews the screen of the release that
  it adds.
- Counter 0.7.0 and Lending 0.6.0 were signed. The hosted room
  `upgrade-witness` took Counter from 0.6.0 to 0.7.0 and Lending from
  0.4.0 to 0.6.0, both in place. A browser witness joined before the
  upgrades and read the same state after them.
- The Counter page footer names its release, so a reader can see
  which release a screen serves.

Rooms made before the new rules definition do not have the upgrade
act. The Lending Worker now admits rooms under a second register for
the new definition, and the first register stays installed for the
earlier rooms.

## Story: a self-hosted room on a Mac

The fleet witness ran on a Mac with its owner at the administrator
steps. The owner installed the host kit, made a first room, installed
Counter and counted. `dap verify --all` found the eight scopes
consistent. After a full stop and start of every service, the
journals, the room proof and the downloaded packet were identical.

- `down` now completes when another step has already removed a
  service label.
- The deployment script removes its private staged copy, which holds
  a proxy token, after a success, a failure or an interrupt.
- A self-hosted room serves no application screens today. A design
  note, `notes/2026-11-17-sh1-self-host-screens.md`,
  describes how it will. Its eleven setup steps wait for the owner's
  answer.

## Story: deployed settings fail closed

An operator who leaves a setting out, or sets two settings that
disagree, now gets a refusal and a named cause.

- `/health` on each Worker names its policy and lists any missing
  setting. All three hosted Workers report none missing, creation
  closed and hosted MCP closed.
- The self-host template names its deployment. A GitHub root must be
  an installed register. The Mac kit keeps hosted MCP closed, and its
  service trusts the caller's address only with the proxy token.
- A screen row names the presentation that a review approved. The
  smoke check after a deployment fails when a row names a
  presentation outside the trusted releases.
- An archive pass that stops on an unexpected error now records the
  class of that error, and never its message.

## Story: authorizations survive in the browser

The browser store of the Counter and Lending screens now keeps a
member's signing authorizations. The store moves to a new database
version, and a test in a real browser opens a database of the
released version with records in it. Every earlier row stays
unchanged and nothing is signed during the upgrade. The change is in
the open versions, Counter 0.8.0 and Lending 0.7.0. No hosted screen
changes until those versions are signed and trusted.

## Story: `--json` for the command line, by design

Revision 6 of `notes/2026-10-12-cli-json-output-design.md` landed.
Every bounded read returns one page for each call, with a cursor that
the caller holds. That pattern already ships in `dap items` and
`dap apps`. It replaces a signed continuation token, its local store
and its lock, which existed only in the earlier revisions. A cursor
carries no authority, because the scope authorizes each page again.
Five build steps are filed, and the first is written.

## Story: tests against a local Artifacts simulator

A note records a probe of the local Artifacts simulator in Wrangler.
The first build step landed: the archive code accepts a remote at
`http://127.0.0.1:<port>` through an option that only tests and
development code can pass. A deployed configuration cannot name the
option, and a test fails if the Worker wiring mentions it. Three more
steps are written and untested.

## Cost-of-change review

- Screen rows pin a presentation. Cost: the in-place upgrade moved
  the installed items, and the screen rows still named the old
  presentations. Three more heads moved the rows, documented the
  field and added the smoke check. Alternative: a screen row names
  the installed item, and the host reads the item's current
  presentation. The project kept the reviewed pin on purpose, so that
  a trust-list review approves each screen. Revisit: no.
- Rooms on an older rules definition. Cost: a second register on the
  Lending Worker, a deployment window by hand with two register
  roots, and one head to bring the tracked file back in line with the
  deployed settings. A definition succession act for rules would move
  an existing room instead. Revisit: yes, with definition succession,
  before a third register appears.
- An application bundle older than a platform fix. Cost: one failed
  hosted join, one refused install, and a new room. Lending 0.4.0 was
  bundled before the gateway fix that hosted joins need, and nothing
  named the platform version that a bundle was built against.
  Alternative: a release records its build base, and the trust-list
  review compares that base with the fixes that hosted rooms need.
  Revisit: yes.
- The `--json` continuation token. Cost: five design revisions and
  three review rounds on a signed token, its store and its lock,
  before revision 6 removed all three. The earlier revisions promised
  cumulative coverage across calls, and that promise needed local
  state. Alternative: start from the read pattern that already ships.
  Revisit: no; the design now uses it.
- Duplicate build requests. Cost: five duplicate requests, filed and
  superseded within three minutes. The planner asked the builder to
  file the `--json` build steps in the same minute that the builder
  asked the planner to file them. The rule is now fixed: the planner
  files each step and the builder promises it. Revisit: no.
- Superseded requests in the open count. Cost: the workroom showed
  454 open requests, of which 373 were answered or delivered. A
  cleanup closed them, and 59 live requests that rested on them had
  to be filed again. Three superseded requests that target `main`
  still count as open. Alternative: close a request in the same
  survey that answers it. Revisit: yes, in the workroom tool, for the
  three that still count.
- A local development route that the design note assumed. Cost: one
  ruling. With the live binding removed from local development, a
  room under `wrangler dev` has no archive remote, because no Worker
  wiring may pass the local option. The project accepted that state.
  A development route would reverse the guard of the first step.
  Revisit: only with a new design.

## Decisions

- The owner, 17 November 18:38: self-hosted rooms serve application
  screens, unless the setup proves onerous.
- The owner, 17 November 21:50: a `.local` host name needs no mDNS;
  a hosts entry serves.
- The owner, 18 November 12:08: the builder keeps every open lane
  moving and does not wait idle on one.
- The owner, 18 November 14:00: work stops for the day.
- Planner rulings: an in-place upgrade may name an older trusted
  release, which gives a rollback path. Screen rows hold the reviewed
  presentation, and trust-list heads move them. `--json` reads use
  the caller-held cursor. Local development gets no archive route in
  this step. A command without JSON output answers a usage error
  under `--json` before it reads anything.

## For the owner

- Whether the eleven setup steps of the self-hosted screens design
  are acceptable.
- Which Cloudflare account holds the Web Analytics token that the
  edge injects on `*.inguz.space`. The zone setting is off and no
  listed site holds the token. The injected beacon causes five
  console errors on each hosted screen, and nothing has been changed.

## In progress

All four lanes are committed in the builder's worktrees. None is
tested.

- CJ-1: the `--json` envelope on `remote`, `show` and `acts`.
- LA-2: the Wrangler pin moves from 4.147.0 to 4.163.0.
- LA-3: local development stops binding the live Artifacts namespace.
- LA-4: five packages move to the Cloudflare Vitest plugin, with one
  scenario over the local simulator.

## What did not happen, and why

- The deployment of E4-B, AS-2 and LA-1. Work stopped while the
  deployment waited for the LA-1 landing. The dry run passed. The
  three Workers run `9255e1f8`.
- The read of the `lending-shelf` projection through a browser. The
  upgrade witness took the browser time.
- The 24-hour rate baseline (RB-3). Its window ends after the sprint.
- The Web Analytics beacon stays on. The account that holds its token
  is not found.

## What landed

| Commit | Head |
| --- | --- |
| `c17d556d` | AR-11: one simulator session and reused summary reads |
| `69b85e98` | RB-1: the Grow baseline from the measured rate |
| `83371009` | SH-1: design note for self-hosted application screens |
| `7cb207e1` | U1: the upgrade act in a new rules definition |
| `7dc016cf` | U2: archive after an upgrade |
| `6cd48fab` | KD-1: `down` survives a removed service label |
| `44330407` | AD-1: admission reads the installation's current state |
| `a10f45ac` | FW-1: the fleet witness note and guide corrections |
| `c8189f7c` | U3: `dap application upgrade`, screens across upgrades |
| `e90f04f4` | U4 marker: the Counter footer names its release |
| `1c0e4757` | UC-P: the Lending Worker admits the upgrade cohort |
| `238b7fbe` | Q: the Lending file names both registers |
| `d902e140` | U4-T: trust Counter 0.7.0, open Counter 0.8.0 |
| `277ae9f0` | UW-S: screen hosts for `upgrade-witness` |
| `60223c5c` | LC-7: trust Lending 0.6.0, open Lending 0.7.0 |
| `45bde99c` | SD-2: screen rows name their reviewed presentation |
| `782fa2b4` | NP-1: remove local home paths from notes |
| `2631ad70` | The local Artifacts simulator note |
| `9255e1f8` | S3: settings that fail closed |
| `3e54b8ab` | E4-B: the browser store keeps authorizations |
| `facb24f9` | CJ-0: CLI JSON design revision 6 |
| `f5ad3832` | AS-2: name the append-check error class |
| `80b8e104` | S3-F: remove the staged project after each deployment |
| `6e3f4c6c` | LA-1: a local Artifacts remote for development and tests |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | Sandbox |
| --- | --- | --- | --- | --- | --- |
| 17 Nov 23:13 | `44330407` | `552a5f18` | `b5437739` | `43f7dcb8` | `c67aa19e` |
| 18 Nov 00:58 | `c8189f7c` | `a0a3a351` | `7e72aab4` | `0a9d924f` | `396bc0fb` |
| 18 Nov 02:26 | `1c0e4757` | not deployed | `2834c509` | not deployed | not deployed |
| 18 Nov 05:21 | `60223c5c` | not deployed | `d8e72d28` | not deployed | `d0992958` |
| 18 Nov 09:21 | `782fa2b4` | not deployed | `b13d569d` | not deployed | `577a4dee` |
| 18 Nov 10:51 | `9255e1f8` | `f1e77c4e` | `1ca64987` | `cc044ce9` | unchanged |

Each row used `scripts/deploy.mjs` and wrote a receipt. Health and the
smoke command passed after each row, and a request-rate read followed
each row. The Grow simulator Worker took `c17d556d` at 17:29 on 17
November as version `1adb6271`. During the window at 02:29 on 18
November, the Lending Worker ran version `918e7ab4` with two register
roots, deployed with Wrangler directly. The row at 05:21 brought the
Worker back to a deployment from the tracked file.

## Request rate of `dap-grow`

| After | Requests a minute | Note |
| --- | --- | --- |
| AR-11 | 28 | from 32; the baseline floor is now 28 |
| U1, U2 and AD-1 | 31 | no rise against a busy window before it |
| U3 | 30 | no flags |
| UC-P | 25 | |
| S3 | 29 to 32 | flat for ten minutes after one wake minute |

`dap-lending` and `dap-demo` stay at zero between deployments.

## Commitments from the 17 November report

| Commitment | Result |
| --- | --- |
| Land RR-2 and AR-11, deploy AR-11, lower the Grow baseline | Done. RR-2 landed at 16:43 on 17 November; the floor is 28 |
| Land the AU-1 audit, and build U1 | Done. AU-1 landed at 16:32 on 17 November, and U1 at 20:32 |
| Read the `lending-shelf` projection through a browser | Not done |
| Read the request rate after every deployment | Done for all seven |
| Half-hourly surveys, the daily report and the worktree sweep | Done until 14:00 |

## Commitments for the next sprint

- Deploy E4-B, AS-2 and LA-1, then read `/health` and the rate.
- Test, gate and land LA-2, LA-3, LA-4 and CJ-1.
- Take the 24-hour rate baseline (RB-3).
- Read the `lending-shelf` projection through a browser.
- Read the Durable Object request rate after every deployment.
