# Sprint report, 21 November 2026

Status: landed; describes work that is done.

This report covers the time from 14:00 on 18 November, when work
stopped, to 17:00 on 21 November. No work ran on 19 and 20 November.
Work started again at 21:41 on 20 November, at the owner's word to
start the live level. Seven heads landed on `main`. Applications can
now declare a scope whose state lives in memory and whose acts leave
no journal entry. Such a scope answers acts, reads and a watch through
the client, the command line and the MCP tools. No deployment ran in
this window. The cost-of-change review is below.

## Story: scopes that keep their state in memory

A definition declares one durability level. Until now only one level
ran: recorded, where every act becomes a journal entry. The live level
now runs too. A live scope records its creation and nothing after it.
Its acts change state in memory, and a restart of the scope starts a
new generation from the creation. A live level suits state that nobody
needs to keep: who is present, a cursor, a practice round.

- An act on a live scope gets one of four answers: applied, refused,
  retry, or reset. A reset tells the caller that the generation
  changed, and the caller reads again before the next act.
- An exact retry of an applied act gets its first answer again, at
  its original tick, so a lost reply is safe to resend.
- Timed rules run on a timer in memory and write no entry.
- A recorded scope rejects a live act with `unavailable`. A live
  scope rejects a recorded submit and a message delivery in the same
  way.

## Story: reads and a watch for live state

A member reads a live scope through the same summary and page of
final items as a recorded scope. Each live answer names the generation
and the tick that it shows, and never a journal head. A watch sends a
line each time the live state changes. The three new routes use the
existing read session, and the security inventory lists them.

## Story: live state has a budget

A live scope holds its state, its accepted acts and its remaining
timed writes within one budget for each generation. A fresh act that
would pass the budget gets `scope-full` before any change shows. An
exact retry still gets its first answer at capacity. The ceiling is
32 MiB for each generation.

## Story: live actions from the command line and MCP

- `dap act` reads the level that a scope's definition declares and
  takes the matching path. For a live scope it reads the generation,
  signs the act and reports a reset when the generation changed.
- An installed application's view can read live rows, and the MCP
  app tool `view_live_act` acts on them. The host checks the mounted
  view and the current rows before it signs. A repeated call at the
  same cut returns its first outcome.
- The package check refuses a `tell` or `relate` send to a live
  definition with the reason `send-to-live`, because a live scope
  admits no message after its creation. A `create` send stays valid,
  and the package report names the level of every scope.

## Story: deployments use Wrangler 4.163.0

The deployment scripts and the operator guides now pin Wrangler
4.163.0 in place of 4.147.0. The first deployment on the new pin ran
after this window and passed its smoke checks.

## Cost-of-change review

- Heads that landed on a local branch and waited. Cost: seven heads
  landed between 08:54 and 13:32 on the shared checkout's `main`.
  They stayed unpublished until 16:47. None had a landing check, so the
  planner checked all seven in one pass before the push. Alternative:
  the session that lands a head asks for the landing check and
  publishes at once. Revisit: no; the rule stands.
- Requests that went stale in a cleanup. Cost: the live-level build
  requests were filed twice after the 18 November cleanup, and four
  duplicates were closed. Alternative: search for an earlier refiling
  before filing again. Revisit: no.
- A long merge subject. Cost: one exception for a 185-character
  subject on the LV4 tools landing. The merge tool takes its first line
  as the subject. Revisit: no.
- Design-note status lines. Cost: notes heads to correct the status
  lines of dated notes. Some still read "designed and not built" for
  work that had landed. Alternative: each landing updates the
  status of the note that it builds. Revisit: yes; the planner now
  reads the status line before each landing.

## Decisions

- The owner, 20 November 21:34: start the live level as soon as
  possible.
- Planner rulings: a live definition is derivable, and a sequenced
  definition stays non-derivable. The live-state ceiling is 32 MiB for
  each generation. A bound live action reads the installation's owner
  again as its last remote check. A new delivery to a live scope gets
  `retry` with the reason `unavailable`.

## For the owner

- Whether the eleven setup steps of the self-hosted screens design
  are acceptable.
- Which Cloudflare account holds the Web Analytics token that the
  edge injects on `*.inguz.space`.

## In progress at 17:00

- LV5: live replay and presence. The gate passed, and the head was in
  review.
- O2: the retry cutoff for live targets, gated next.
- S6: CLI, Page and custody safeguards, waiting for a gate slot.
- E2 and E3: proposals for the act environment, in the builder's
  reading.

## What did not happen, and why

- A deployment. The three Workers ran `9255e1f8` through the window.
  The first gate-free window came after 17:00.
- The 24-hour rate baseline (RB-3).
- Daily reports for 19 and 20 November. No work ran on those days.

## What landed

| Commit | Head |
| --- | --- |
| `fb7b5388` | LV4-G: the package graph knows live scopes |
| `28ce66ee` | LA-2: Wrangler 4.163.0 deployment pin |
| `3e93724b` | Dated design note status |
| `c20e5315` | LV2: the live turn and stable retry answers |
| `af2f675f` | LV3: live reads and the watch |
| `dbc4aecd` | LV3: the retained live-state budget |
| `446e2ab8` | LV4: live actions through the client, CLI and MCP |

## Deployments

None in this window.
