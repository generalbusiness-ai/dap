# Sprint report, 6 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 5 November to 17:00 on 6 November. Three heads
landed on `main`, counting the previous report. dap-demo now creates rooms of
the new type on a new register, and its old rooms keep working. The second
migration of the typed derivation core landed and runs on all three room
Workers. The live Claude and ChatGPT runs did not happen: the builder's
browser connection stayed unavailable. The cost-of-change review is below.

## Story: dap-demo offers the new room type

When a Git host is down, a room claim on the new room type fails cleanly and
frees its place. dap-demo now offers that room type. Its register packet
landed (`26fc8e0b`), and the planner switched dap-demo to a new Register 26
between 00:05 and 00:08 on 6 November, keeping the old Register 17 installed.
The Page's room offer was closed for 1 minute 47 seconds during the switch.
dap-grow and dap-lending took the same source without a register change.

The old rooms were checked after the switch. In the J5 test room, an ordinary
member created a new issue lane, and a real `dap clone` returned the baseline
commit. The room's Site file came back byte-identical through `curl`. A
scripted Site fetch got HTTP 403 from Cloudflare's edge, whose body "error
code: 1010" means the edge rejected the client's signature before the Worker
saw the request. A read-only follow-up confirmed the new lane's genesis under
the old register and every room version unchanged.

## Story: the typed derivation core reaches production

The second migration of plan 035 landed (`e50d9eeb`). The code that decides
whether a rule reads the clock now uses the typed program's metadata, and the
three old clock-checking helpers are gone. The planner deployed it to all three
room Workers at 06:31 to 06:35. Each answered healthy, MCP stayed closed, and
dap-demo kept its new register and its old room's Site. The third migration,
which moves guards and lists onto the typed path, was under way at the close.

## Cost-of-change review

- The old-room checks. Cost: about six hours. Both the planner's and the
  builder's tools refused to act with an existing member's credentials until
  Hugh approved the exact run in the builder's session. Alternative: get that
  approval before the switch. Revisit: yes.
- The Site refusal. Cost: one stop and one read-only follow-up for a Cloudflare
  edge block on a scripted client. Alternative: send a normal User-Agent from
  every probe. Revisit: no.
- Refiled requests. Cost: the 5 November report and M3 each had a request
  chain go stale when a landing retired bases upstream, and each was refiled.
  Alternative: rest a report request on nothing. Revisit: yes.
- Survey gaps. Cost: no planner survey from 01:00 to 06:00, and none after
  07:05, because no survey prompt reached the planner. Revisit: no.

## Decisions

- One merge message's missing space stays as a recorded exception rather than
  a second governed merge (`624951a1`).
- The builder runs old-room steps with existing homes; the planner runs the
  switch and the new room from a fresh home (`103f8413`).
- No rollback for the Site 403; it is a Cloudflare edge refusal (`ec5b86e0`).
- dap-demo deploys only from its rendered rollout configuration until that
  configuration's record lands.

## Corrections

- The planner's 06:00 and 06:40 surveys said the old-room checks still waited
  for Hugh. Hugh had approved them, and they ran at 06:02.

## In progress

- The new test room, its one-hour token and the same token's refusal after
  the hour, then the reviewed record of the switch's actual values.
- Plan 035's third migration.
- The archive-scale case that answered retry after 14,601 entries.

## What did not happen, and why

- The live Claude and ChatGPT runs: the builder's browser connection stayed
  unavailable.
- The new test room and token scenes waited until the old-room checks were
  met, after the close.
- This report is a day late: no prompt reached the planner after 07:05.

## Commitments for the sprint ending 7 November, 17:00

- Finish the token scene and file the switch's record for review.
- Land and deploy plan 035's third migration.
- Run the live Claude and ChatGPT witnesses when the browser connection
  returns.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after it.
