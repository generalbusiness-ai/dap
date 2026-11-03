# Sprint report, 3 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 2 November to 17:00 on 3 November. Seventeen
heads landed on `main`, counting the previous report. The three room Workers
were not deployed; they still serve `bcf88654` with hosted MCP closed. The Mac
mini was deployed once. All the OAuth code that Claude and ChatGPT need is on
`main`, and the dedicated Worker for the live runs is configured. Goose now
renders dap's cards. The fault behind every unknown Git write on the mini is
found and fixed. A new register on the mini is installed for the fresh G3
witness. The cost-of-change review is below.

## Story: signing in from Claude or ChatGPT

A person who adds dap as a connector in Claude or ChatGPT is sent to a consent
page on the dap Worker. Their own browser key adds an agent that they control,
signs a grant for that one host, and the host gets a one-hour token. Their
agent then signs every act, and the room judges it as before.

That flow is now complete in source, in five landings. `/mcp` accepts tokens
bound to each connector URL (`ec48e2d5`). An ordinary member can add an agent
whose role stays inside their own (`40c4e0ea`). The consent page, codes,
tokens, refresh and revocation landed next (`331bf5f2`). Unused client
registrations now expire and are reclaimed (`6a67cc08`). Dynamic registration
is off unless a deployment turns it on (`ecf59e05`). Claude and ChatGPT
identify themselves by metadata documents, so the live runs need none.

The live runs get their own Worker, `dap-connect`, configured to deploy closed
(`18f16811`). It installs the signed Grow demo release that the hosted
Workers already trust, because Counter has no signed release.

## Story: Goose shows the cards

Goose Desktop answered dap's cards with MCP Apps version `2025-11-21`, and the
cards accepted only `2026-01-26`. The card bridge now accepts both reviewed
versions and refuses any other before a tool runs (`79f7d1b8`). The four
cards render in Goose, and again in Claude. Goose's fullscreen reply still
disagrees with what it displays.

## Story: the Mac mini can publish to GitHub

Every Git write from the mini had recorded unknown, though each reached
GitHub. One probe found the cause: GitHub's reply ends with two flush packets,
and dap's parser accepted exactly three records. The parser now accepts one
extra flush and refuses every other shape (`59232978`).

A second finding: when a Worker's register changes, its earlier rooms stay
readable but stop creating inboxes and lanes. That stranded the old H3 room on
the mini yesterday. A Worker can now list every register it serves, so an
upgrade strands no room (`d7f1ebf7`). The Mac setup scripts carry that list
(`9c7ae712`).

With both in place, a new register for the fresh G3 witness is installed on the
mini, listing H3's and the first G3 register beside it. A probe meant to prove
that H3 creates an inbox again stopped at a read before it sent anything. The
fresh room, its binding and the GitHub witness come next.

## Story: gates that pass when every case passes

Two full gates had failed with every case passing, on one teardown error.
The test fixture returned while two callbacks were still scheduled. It now
waits for them (`c55c59da`), and no gate since has hit that error.

## Cost-of-change review

Each entry gives the cost, a cheaper path if one existed, and whether to
revisit.

- O2 and O3 (`40c4e0ea`, `331bf5f2`). Cost: six failed gates between them,
  each on a test, an inventory or a closed export list, never on product code.
  Alternative: run the owning inventories before the first gate. Revisit: yes;
  this is the same lesson as G3 yesterday.
- Transport diagnosis (`9c1556fa`). Cost: one scratch probe and one token.
  It replaced a guess that celld was at fault. Alternative: none cheaper.
  Revisit: no.
- Register switch. Cost: one stranded room and a new configuration record,
  after a planner ruling that read "default register" too narrowly.
  Alternative: read child admission before ruling on a register change.
  Revisit: yes.
- The fresh G3 room. Cost: three planner rulings on how to create it, two of
  them withdrawn, and one refused attempt. Alternative: read the CLI's create
  guards first. Revisit: yes.
- Long merge subjects. Two landings carry subjects of 266 and 394
  characters, and their receipts forbid amending them. Merges now count the
  first line before they run. Revisit: no.

## Decisions

- An ordinary member can add an agent they control, inside their own role
  (Hugh; `40c4e0ea`).
- The live O4 runs use a new dedicated Worker, `dap-connect`, and the signed
  Grow release; dynamic registration stays off there (`a555fc77`,
  `c721a1e9`, `aa2284b3`).
- A Worker changes its register only with every earlier register listed
  (`a555fc77`, `3ec3e26c`).
- The fresh G3 witness takes a new register from a new home (`c324ad65`).
- A gate that fails only on the known teardown race, with every case
  passing, goes to the checker on its record (`6500f198`, `d01d06a5`).

## In progress

- The fresh G3 room on the new register, its binding row, and the GitHub
  witness.
- A fixed H3 Inbox probe.
- The archive-scale case that answered retry after 14,601 entries.
- The next creation versions' source.

## What did not happen, and why

- The planner filed no survey from 09:30 to 12:00. The next `date` read
  12:28. Three builder questions waited, the oldest since 09:05.
- Two surveys missed an act that arrived between a read and its filing.
  Reads now start at the previous read's clock time.
- The planner named the wrong package for O4 twice, repo-in-ai and then
  Counter. Neither has a signed release.
- One planner request was filed on a basis that was already dead, so the
  builder's promise on it was stale. It was refiled.
- The fresh G3 witness did not run, and the next creation versions did not
  land.
- Nobody deleted the leftover J4 forks.
- The diff build waits for Hugh's decision.

## Commitments for the sprint ending 4 November, 17:00

- Deploy `dap-connect`, and run the live Claude web and ChatGPT witnesses.
- Create the fresh G3 room, bind it once, and run the GitHub witness.
- Prove an H3 Inbox birth with a fixed probe.
- Land the next creation versions' source, or say what holds it.
- Delete the leftover J4 forks.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after it.
