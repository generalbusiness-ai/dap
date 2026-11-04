# Sprint report, 4 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 3 November to 16:20 on 4 November; Hugh asked for
the report early. Fourteen heads landed on `main`, counting the previous
report. A room on the self-hosted Mac mini now publishes a reviewed change to
a real GitHub repository. The dedicated Worker for the Claude and ChatGPT runs
is deployed, closed, with its room ready. The live runs did not happen: the
builder's browser connection was unavailable all day. Cards now recover from
late replies and long questions. Five new kinds of test check dap against
independent answers. The typed-core prototype stopped at its gate. The three
room Workers were not deployed; they still serve `bcf88654` with hosted MCP
closed. The cost-of-change review is below.

## Story: a room on the Mac mini publishes to GitHub

A team runs dap on their own machine and binds a room to their GitHub
repository. An agent proposes a change, a member reviews it, and the owner's
merge publishes the commit to GitHub.

That now works end to end on the mini. The binding packet landed
(`41771de1`), and the planner deployed it on the mini. The owner bound the room
once, and GitHub showed the first commit. A test agent cloned the repository,
committed one file and proposed it. Its own merge was refused, and so was the
owner's merge before review. After a separate member approved, the owner's
merge published the commit. Read-only GitHub calls confirm the branch head,
its parent and the exact file. The record landed (`60b90827`), and the G3
request is closed. The builder operated every test identity, so the run shows
that the roles act as separate members, not that a separate person reviewed.

## Story: connecting Claude and ChatGPT

The `dap-connect` Worker is deployed with its own storage, a fresh session
secret, its own register and the test room. Every MCP and sign-in route
answers 404 until the planner opens the live window. It now runs today's card
fixes. A second test member joined. The ordinary member's join needs a fresh
browser, and the builder's browser connection answered "unavailable" from
03:09 onward, so the live Claude and ChatGPT runs did not start. The planner
ruled in advance on ChatGPT's card origin, so that step will not stall.

## Story: cards that recover

A long question whose full text fits the card could show a summary with no
way to open it. The summary is now compact and **Open** reaches the whole text
(`0455c637`). The card's **Ask in chat** now sends its message in the shape
MCP Apps requires (`bf3bceb6`). A card action whose reply arrived after the
card's 120-second wait was lost. The card now keeps the original request, and
a late reply gives a read-only recovery cue without repeating the action
(`7135dc39`).

## Story: tests with independent answers

Hugh asked for testing strategies, and the checker traced past bugs that
existing tests missed. Five scopes landed, each checking dap against an answer
that dap's own code does not compute:

- Card messages against the published MCP Apps schemas (`d372812e`).
- About a hundred valid and invalid Git message variants around real Git
  (`da94f450`).
- Room accounting against a separate ledger, across 100 histories
  (`c44e311c`).
- Card histories around late and incomplete replies. This one found the
  late-reply bug above (`7135dc39`).
- Storage index answers against a direct scan, across restarts and rebuilds
  (`61497e21`).

A sixth landing makes every expected refusal in the tests name the check that
refused it (`eadafafe`). The document link check now reads only committed
files, so a stray worktree no longer fails the gate (`333fe65f`). A broader
test kit for application authors was declined.

## Story: Goose as a host

The Goose report landed (`af3e47a3`). Goose is good enough as a builder test
host and as a second supported host, with named gaps. It is not yet good
enough as an agent host: no enrolled agent acted through it. Its test
configuration is restored exactly.

## Story: the typed derivation core

Plan 035 proposed compiling each act into a typed program that can run,
explain itself and list its inputs. The planner scheduled only a prototype,
behind a gate. The prototype matched today's output for Grow `water` the same
day and produced a useful refusal explanation. But even a favorable estimate
removed only 16% of the affected code, under the 20% bar, so it stopped. The
plan and the stop record landed (`b63bce02`); the full migration is not
scheduled.

## Cost-of-change review

- The O4 window. Cost: setup finished at 03:10, then a full day blocked on
  the browser connection. Alternative: check the builder's browser before the
  closed setup, not after. Revisit: yes.
- The typed-core prototype. Cost: about one builder day for a stop decision.
  Alternative: none cheaper; the gate turned a 24-to-40-day migration into a
  one-day measurement. Revisit: no.
- The shared checkout. Cost: about two hours with no landing while another
  planner conversation edited files in it. Alternative: every planner
  conversation works in its own worktree. Revisit: yes.
- refs/seq pushes. Cost: three surveys' pushes needed retries after GitHub 500s.
  Alternative: push to the repository's new address. Revisit: if it continues.

## Decisions

- Accept a test suggestion only if it can be radically simplified and still
  gives a worthwhile guarantee (Hugh; `d6aa9122`). The explicit-grants finding
  passed (`0ca13069`).
- Plan 035 gets a prototype only, behind a three-part gate (`eca160a2`); the
  stop is accepted (`acb58af3`).
- ChatGPT consent goes ahead without a visible card; the card's origin is read
  at its first render, and a Worker-origin card means revoke and stop
  (`e54c0545`).
- Three limits of the next creation versions are accepted (`4d9a50e8`).

## In progress

- The next creation versions' source (`12a718fe`). Hugh approved its
  security-hash change; its full test run started at 15:58.
- The archive-scale case that answered retry after 14,601 entries.
- The O4 member join and live runs, waiting on the browser connection.

## What did not happen, and why

- The live Claude and ChatGPT runs: the builder's browser connection was
  unavailable.
- The next creation versions did not land. The builder resumed them at 13:50
  after the typed-core stop.
- The leftover J4 forks are not deleted. Deleting them needs a separate
  packet, and the J4 record calls them not urgent. They stay listed as
  leftovers and leave the daily commitments.
- The 05:00 survey stated a count wrongly; the 05:30 survey corrected it.

## Commitments for the sprint ending 5 November, 17:00

- Run the live Claude web and ChatGPT witnesses as soon as the browser
  connection returns.
- Land the next creation versions' source, then deploy them and run their real
  commands, including one clone after its token's hour.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after it.
