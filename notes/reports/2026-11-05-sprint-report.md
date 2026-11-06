# Sprint report, 5 November 2026

Status: landed; describes work that is done.

The sprint ran from 16:20 on 4 November to 17:00 on 5 November. Four heads
landed on `main`, counting the previous report. The next room-creation version
landed and runs on all three room Workers, but no register on it exists yet.
Old rooms now keep their Git hosting, Sites and workspaces when a Worker
changes its register. The first slice of the typed derivation core landed,
and Hugh scheduled the rest. The live Claude and ChatGPT runs did not happen:
the builder's browser connection stayed unavailable. The workroom was silent
after 06:39. The cost-of-change review is below.

## Story: a failed room creation frees its place

When a Git host is down and every attempt to create a room's repository fails,
the claim now ends in a final failed state. Its place in the register's limit
is free again, and the person who ran `dap create` can see that the claim
failed and that a new one is safe. A late success only cleans up. The same
version keeps founder and recovery keys separate, and its clone tokens last
exactly one hour.

The source landed (`28839920`) after a long validation. Its full test run
failed three times on tests that still expected the old behavior, and once on
four test timeouts while the machine slept. The search for every fixed list
that missed the new destination version found four in production code. The
planner deployed it to dap-grow, dap-lending and dap-demo at 00:01 to 00:04,
and every Worker answered healthy with MCP closed.

## Story: old rooms keep working when a Worker changes its register

To offer the new room type, dap-demo needs a new register. The checker found
that switching it as planned would have cut Git access for all 13 existing demo
rooms, because the storage hosts trusted only one register. The fix makes both
storage hosts, room Sites and workspaces trust every register the operator
lists (`a4e62771`). Its test failure on a restored register turned out to come
from a test fixture: a scripted GitHub reply with milliseconds in its expiry,
which the real code correctly refused. Grow's archive link still trusts one
register, so switching dap-grow's register needs that fixed first.

## Story: the typed derivation core

Hugh scheduled plan 035 in full, overriding the deletion-size gate. Its first
slice landed (`8b063123`): a typed program for a room's act that can run,
explain a refusal with the guard's place in the source, and list its inputs.
Production code still runs the old path. The second migration, which replaces
the clock checks, is filed and waits behind the register work.

## Cost-of-change review

- The next room-creation version. Cost: four failed full test runs, each on an
  outdated test expectation or a timeout, and two rounds of missed
  destination-version lists. Alternative: search every fixed version list when
  a version is added. Revisit: yes.
- The register switch. Cost: two review rounds before every single-register
  reader was found. Alternative: list every reader of a setting before
  changing it. Revisit: yes.
- The restored-register test failure. Cost: two extra full runs and two
  diagnostic runs, one broken by its own instrumentation. The cause was a
  fixture date format. Revisit: no.
- The shared checkout. Cost: landings blocked twice. Hugh's update script
  installs wrangler into its working folder; run from the shared checkout, it
  dirties it. Revisit: yes, with Hugh.
- Lost hours. Cost: no planner work from about 10:00 to 16:17, when Claude
  Code's auto-mode check returned no verdict on every shell command, and few
  survey prompts before and after. Revisit: no.

## Decisions

- Plan 035 is scheduled in full; the code size is fine (Hugh; `e99550e9`).
- No permission prompts to Hugh; seal changes go through checker review
  (Hugh; `c858a1d1`).
- The Mac mini is not accessible until further notice (Hugh; `c858a1d1`).
- Host authority follows the installed register list, for storage, Sites and
  workspaces (`3b239919`, `0e593489`, `56a48952`).
- A gate that fails in one test file takes the documented one-file follow-up
  (`a9d94547`).

## Corrections

- The 4 November report said the next-cohort test run failed at 16:07. Its
  process record says 16:01.
- The planner's 23:30 survey said sleep caused four test timeouts. The record
  shows sleep during the run but does not establish the cause.

## In progress

- The register packet for dap-demo, revised onto `a4e62771`, then the
  planner's deploy and the real commands, including a clone after its token's
  hour.
- Plan 035's second migration.
- The archive-scale case that answered retry after 14,601 entries.

## What did not happen, and why

- The live Claude and ChatGPT runs: the builder's browser connection stayed
  unavailable. The member invitation expired unused at 03:05.
- No register on the new room type exists yet: the packet waits on its
  revision.
- No workroom act arrived after 06:39, and this report is late.

## Commitments for the sprint ending 6 November, 17:00

- Review the revised register packet, then deploy it and run the real
  commands.
- Run the live Claude and ChatGPT witnesses, with a fresh invitation, when the
  browser connection returns.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after it.
