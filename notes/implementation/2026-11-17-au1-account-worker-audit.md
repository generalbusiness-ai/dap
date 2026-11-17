# Account Worker audit

AU-1 lists every Worker in the account, its last deployment, its Durable
Object classes and its Durable Object requests over 24 hours. The rate read
showed Durable Object requests from two Workers outside the room Workers:
`dap-library-publication-final-1014` and `woah`. The forgotten Worker
`artroom-counting` cost about 7,000 requests an hour before its deletion on
2026-11-17. This audit finds the rest.

## What was read

All reads took place on 2026-11-17 between 21:03Z and 21:15Z. Every command
was a list or read. No command needs or shows a secret in this note.

- Worker list: `cf workers scripts search` (Cloudflare API listing). It
  returned 30 Workers. `artroom-counting` is not among them.
- Durable Object classes: `cf durable-objects namespaces list` (Cloudflare
  API listing). It returned 47 namespaces, each with its script and class.
- Last deployment: `wrangler deployments list --name <worker> --json` with
  pinned wrangler 4.147.0, from a scratch directory (wrangler listing). The
  table gives the newest deployment, in UTC, to the minute.
- Durable Object requests: `node scripts/do-rate.mjs --all` from
  `2026-11-16T21:00Z` until `2026-11-17T21:00Z` (observed analytics read,
  1,440 minutes, `--until` exclusive). `--all` prints only Workers with requests in
  the window. A Worker with Durable Object classes and no row shows 0.
- Tracked: a Worker is tracked when a wrangler configuration on main at
  `eae5ce3b` names it. Origins of untracked Workers come from `git log -S`,
  `notes/`, the planner memory and local wrangler configurations.

## Table

| Worker                               | Tracked? | Config or origin                                               | Last deployment  | DO classes                                       | DO requests, 24 h | Per hour |
| ------------------------------------ | -------- | -------------------------------------------------------------- | ---------------- | ------------------------------------------------ | ----------------: | -------: |
| `dap-grow`                           | yes      | `apps/room/wrangler.grow.jsonc`                                | 2026-11-17 20:35 | DeployedScope, ScopeIndex, McpRegistry, McpAgent |            72,967 |   3040.3 |
| `woah`                               | no       | woo project                                                    | 2026-08-04 19:31 | NetScopeDO, NetGatewayDO, NetAuditDO             |             2,328 |     97.0 |
| `dap-lending`                        | yes      | `apps/room/wrangler.lending.jsonc`                             | 2026-11-17 20:35 | DeployedScope, ScopeIndex                        |             1,962 |     81.8 |
| `dap-demo`                           | yes      | `apps/room/wrangler.demo.jsonc`                                | 2026-11-17 20:35 | DeployedScope, ScopeIndex, McpRegistry, McpAgent |               104 |      4.3 |
| `dap-library-publication-final-1014` | no       | 2026-10-14 publication run                                     | 2026-10-15 02:24 | DeployedScope                                    |                33 |      1.4 |
| `artroom-scope`                      | yes      | `apps/room/wrangler.artroom-scope.jsonc`                       | 2026-11-13 05:16 | DeployedScope, ScopeIndex, McpRegistry, McpAgent |                 0 |        0 |
| `dap-connect`                        | yes      | `apps/room/wrangler.connect.jsonc`                             | 2026-11-04 14:00 | DeployedScope, ScopeIndex, McpRegistry, McpAgent |                 0 |        0 |
| `artroom-jam`                        | yes      | `apps/jam/wrangler.jsonc`                                      | 2026-10-12 21:01 | none                                             |               n/a |      n/a |
| `dap-application-sandbox`            | yes      | `apps/sandbox/wrangler.rollout.jsonc`                          | 2026-11-17 13:45 | none                                             |               n/a |      n/a |
| `dap-grow-simulator`                 | yes      | `examples/grow/wrangler.jsonc`                                 | 2026-11-14 14:50 | none                                             |               n/a |      n/a |
| `dap-home`                           | yes      | `homepage/wrangler.jsonc`                                      | 2026-11-17 18:24 | none                                             |               n/a |      n/a |
| `artroom-moo-rehearsal-1013-2130`    | no       | gitseq acts only; no note or config found                      | 2026-10-14 01:30 | DeployedScope                                    |                 0 |        0 |
| `artroom-scope-review-g1`            | no       | Gate 1 review, `2026-10-07-expanded-gate1-delivery.md`         | 2026-10-07 23:57 | DeployedScope                                    |                 0 |        0 |
| `artroom-spike-checkers`             | no       | deploy spike, `2026-10-01-deploy-spike.md`                     | 2026-10-04 20:08 | RunnerBox                                        |                 0 |        0 |
| `artroom-spike-room`                 | no       | deploy spike, `2026-10-01-deploy-spike.md`                     | 2026-10-04 20:08 | Registry, Room, Publisher                        |                 0 |        0 |
| `dap-hostnone`                       | no       | host-none first room, 2026-10-27; config in a planner worktree | 2026-10-28 01:36 | DeployedScope, ScopeIndex, McpRegistry, McpAgent |                 0 |        0 |
| `dap-lending-demo-1014`              | no       | 2026-10-14 lending demo                                        | 2026-10-15 02:33 | DeployedScope                                    |                 0 |        0 |
| `dap-library-publication-1014`       | no       | 2026-10-14 publication rehearsal                               | 2026-10-15 01:55 | DeployedScope                                    |                 0 |        0 |
| `gitseq-spike-echo`                  | no       | gitseq artifacts spike                                         | 2026-10-01 15:26 | Sequencer                                        |                 0 |        0 |

Request figures are the observed analytics read. Dates are the wrangler
listing. Classes are the namespace listing. The five Workers with requests
total 77,394 requests in the window. The `dap-grow` figure spans the AR-8
and AR-10 deployments, so its 24-hour mean of about 51 a minute is above
the 32 a minute measured after AR-10.

Twelve of the 30 Workers belong to the woo, keepmem and generalbusiness
projects. The table shows only `woah`, which has its own paragraph below.
The other eleven made no Durable Object requests in the window, and seven
of them have no Durable Object classes. This note does not list them. The full
table is in the private evidence directory
`~/play/artroom-private-evidence/2026-11-17-au1/`.

Five tracked configurations name no deployed Worker: `dap-commons`,
`dap-self-host`, `dap-celld-local`, `artroom-lanes-test` and
`artroom-scope-test`. They cost nothing.

## Untracked Workers

**`woah`.** The woo project deploys it from its own configuration. It made
2,328 Durable Object requests in 24 hours, 97 an hour, with no deployment
since 2026-08-04. It is the second-largest source in the account. Keep: it
belongs to the woo project, not to dap. Hugh decides whether woah still
needs to run.

**`dap-library-publication-final-1014`.** The 2026-10-14 library publication
run made it (`notes/implementation/2026-10-14-library-publication-hosted-delivery.md`).
It made 33 requests in 24 hours. The live homepage page `/library/`
(`homepage/src/library/index.html`), `examples/lending/README.md` and
`examples/lending/runbook.md` still link to it. Keep for now. A deletion first
needs those links moved to the current lending room, with the matching
change to `homepage/test/home.test.mjs`, which names the Worker too; then
delete, for Hugh to decide.

**`dap-library-publication-1014`.** The same 2026-10-14 note names it a
retained rehearsal. No requests. Delete, for Hugh to decide.

**`dap-lending-demo-1014`.** A 2026-10-14 lending demo, kept separate by the
same note. No requests. Delete, for Hugh to decide.

**`artroom-moo-rehearsal-1013-2130`.** Only gitseq acts name it. No note or
configuration remains. No requests since its one deployment on 2026-10-14.
Delete, for Hugh to decide.

**`artroom-scope-review-g1`.** The isolated Gate 1 review Worker from
2026-10-07. No requests. Delete, for Hugh to decide.

**`artroom-spike-room` and `artroom-spike-checkers`.** The 2026-10-01 deploy
spike made them. No Durable Object class named Room, Registry, Publisher or
RunnerBox exists in the repository. No requests. Delete both, for Hugh to decide.

**`dap-hostnone`.** The first host-none room test on 2026-10-27. Its
configuration lives only in a planner worktree and in the evidence
directory. The planner memory says to commit the
configuration if the Worker stays. No requests since 2026-10-28. Delete, for
Hugh to decide.

**`gitseq-spike-echo`.** The gitseq artifacts spike made it on 2026-10-01.
No requests. Delete, for Hugh to decide.

The audit deleted nothing.
