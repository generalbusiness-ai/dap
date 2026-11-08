# Sprint report, 7 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 6 November to 17:00 on 7 November. Four heads
landed on `main`, counting the previous report. A member's one-hour read token
on dap-demo's new register cloned a room, and after the hour the provider
refused the same token. dap-demo now deploys from its checked-in
configuration. The third migration of the typed derivation core landed after
four hours spent chasing a test failure that did not come back. The shared
client observer now gives each connection its own owner. From 11:57 the
builder ran work in parallel lanes. The cost-of-change review is below.

## Story: a read token that ends on time

A member who wants a copy of a room asks for a read token. The token clones
the room for one hour and then stops working. That had not been checked on a
room of the new register.

On 7 November the planner created a test room on dap-demo's Register 26 from
a fresh home. At 08:16 the room issued a one-hour read token, and a real
`dap clone` with it returned the room's commit. At 09:18, after the hour, the
same credential got HTTP 403 "Invalid or expired token" from the Git host. A
request with no credential got an authentication challenge instead, so the
403 is the provider refusing that token. The clone with the expired token
exited 128, but the CLI discards Git's output, so a separate probe recorded
the refusal. The full record of the register switch landed after the close
(`903ed961`).

## Story: dap-demo deploys from the checked-in file

Since the switch on 6 November, dap-demo had run from a private configuration
that installs both registers. The checked-in file still named only the old
one, so deploying it would have cut the old rooms off. The config sync
landed (`9d96cf25`): the checked-in file now matches the running settings, and
the packet's clone observer accepts the Git host's real address. At 12:04 the
planner deployed dap-demo from the checked-in file. Health, the room offer on
Register 26 and the old room's Site all matched, and MCP stayed closed.

## Story: the typed derivation core takes over guards and lists

Plan 035 moves each rule onto a typed program that can run and explain
itself. The third migration (M4) landed (`8d9080f3`). Guards, ranges and list
binders now run only through the typed program, and the checker found no
change to any judgment that the request protects.

M4 stopped for about four hours on one archive test. Inside a full gate, a
30,000-entry archive case answered "retry" at position 5,308. The same bytes
passed alone, as did the same case on `main`, and several bounded probes did
not bring the failure back. At 12:02 the planner ruled that the repaired
source simply needed its due gate. That gate passed at 12:46, and M4 landed
at 13:26. The archive question stays open (`64552d40`) until the failure
recurs with its new logging.

## Story: one owner per client connection

The CLI, the Page and the cards share one observer that keeps a room's view
current. It ran connection renewal, streaming and refresh in one closure, so
stopping or renewing one connection could release another's resources. The
refactor landed (`3cb223b8`). Each connection attempt now owns its resources
and its cleanup, and a separate refresh coordinator still drops obsolete
replies. The public API did not change.

It is the second of five state refactors from Hugh's shortlist. The first,
for the hosted MCP transport, found a real cleanup bug before any code
changed. In a component test, discarding a transport abruptly while an OAuth
session is still opening made the cleanup remove that session's stored row.
A detach keeps the row. The fix is in the S1 head, which
is not yet in review.

## Cost-of-change review

- M4's archive failure. Cost: about four hours of probes and a main baseline,
  none of which reproduced it. Alternative: rule the due gate as soon as the
  source changed after the failing run. Revisit: yes.
- The Register 26 record. Cost: three review rounds. The first found writable
  evidence and a checksum file that listed itself. The second approval went
  stale within hours, because the config sync landed and made two passages
  untrue. Alternative: seal evidence with a script that sets read-only modes
  and skips the checksum file, and land a record before a change that it
  describes as pending. Revisit: yes.
- S1's seal change. Cost: S1 finished its focused work at 15:17 and then
  waited for Hugh's approval of three hash literals in the builder's session.
  Hugh's standing instruction since 4 November routes seal changes to checker
  review instead. Alternative: the builder follows that instruction
  (`7e3f7743`). Revisit: yes.
- Survey gaps. Cost: no prompt reached the planner from 12:12 to 21:36. The
  report is five hours late, and the deploy of M4 and S2 waited until 21:53.
  Revisit: no.

## Decisions

- Daily reports land on `main` directly, without checker review (Hugh,
  7 November).
- The builder keeps busy with subagents on parallel lanes, one full gate at a
  time on the shared machine (Hugh; `0d6d0fba`). This replaces the one-at-a-time
  order in `8a78f701`.
- M4 gets its due gate, not more probes, and the archive diagnosis waits for a
  recurrence (`677da3fe`).
- From `9d96cf25` on, the planner deploys dap-demo from the checked-in file.

## In progress

- Plan 035's fourth and fifth migrations, after the close. M5 landed at
  17:33. M6 merged at 19:45 and reached origin at about 21:50. The planner
  deployed M4 through M6 and the observer refactor to all three room Workers
  at 21:53.
- S1, the hosted MCP transport refactor, waiting for its gate and review.
- M7, Native hook boundaries, after M6.
- S3, the retained editor refactor, filed after the close (`8ae87346`).

## What did not happen, and why

- The live Claude and ChatGPT runs: the builder's browser connection stayed
  unavailable.
- The token scene's replay: the test room has no journal archive binding, so
  its clone holds only `main`.
- This report is five hours late: no prompt reached the planner after 12:12.

## Commitments for the sprint ending 8 November, 17:00

- Review, land and deploy S1, then M7 and S3, one gate at a time.
- Decide the parent request of the Register 26 switch (`8a8902f3`).
- Run the live Claude and ChatGPT witnesses when the browser connection
  returns.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after it.
