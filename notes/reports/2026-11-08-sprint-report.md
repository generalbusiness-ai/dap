# Sprint report, 8 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 7 November to 17:00 on 8 November. Four heads
landed on `main`. An AI app's connection to a hosted room now has one owner
for its whole life, so closing or refreshing one connection cannot remove
another connection's session. The typed derivation core now runs rules that
call Native code or capabilities. The Page's editor for retained files now
keeps an uncertain step uncertain instead of guessing. The last plan 035
migration, M8, reached its final gate and did not land. All three room
Workers run the current `main`. The cost-of-change review is below.

## Story: one owner for each hosted MCP connection

A person who reaches a room from their own AI app holds an MCP connection to
the hosted endpoint. The endpoint keeps the connection's sessions, streams
and OAuth rows. Before this sprint, the code for loading, streaming and
retiring those resources was spread across three factories. A late cleanup
for one connection could remove a stored OAuth session that a refresh had
just kept for the next credential.

S1 landed at 22:52 on 7 November (`360014b4`). Each connection generation now
owns its opening, its resources and its end. The end comes in three named
forms. A graceful close ends the streams and removes the rows. A detach ends
the streams and keeps the rows for a new credential. A disposal drops
everything.

The checker's review of S1 found one more case. If a detached OAuth layer
closed a second time, the second close removed the rows that the detach had
kept. The follow-up landed at 14:33 (`8faa38dc`). The first fix had its own
flaw, which the checker found before landing. It skipped the cleanup that
frees a closed layer's slot. A host allows eight layers, so after eight
sessions expired on their own, no ninth grant could open. The landed head
keeps the first close's choice and still frees the slot. A new test opens a
ninth grant after eight expire, and the test fails on the first fix.

Hosted MCP stays closed on every Worker, so no traffic reaches this code yet.
It is the base that the live Claude and ChatGPT runs need.

## Story: rules that call Native code can explain themselves

Plan 035 moves each rule onto a typed program that can run, explain and list
its own dependencies. A rule can also call Native code: a hook that grants,
types, guards, sends or reports an outcome, or a capability that checks a
list or applies an effect. Until this sprint those calls ran outside the
typed program, so an explanation stopped at them.

M7 landed at 23:42 on 7 November (`01de2ca8`). The typed program now records
all seven places where a rule can call Native code, and the arguments it
passes to a capability. An optional observer records each call that actually
happens. It does not run a hook a second time, and it does not read the
hook's code. If the trace budget runs out, every hook still runs exactly once.
Four new tests compare whole judgments and call counts. They fail on the
previous source and pass on M7.

M8 is the last migration. It routes every rule body through the typed program
and deletes the prototype engine. Its first final gate failed at 14:56 on two
test expectations that M8's new ownership checks had changed. After the
repair, the second gate failed at 15:40 with four Native failures. That gate
overlapped another lane's test run, so a third gate ran with nothing else on
the machine. It failed the same four cases at 16:33, which put the cause in
M8 itself: a cached archive schema. The repair passes its focused cases, and
the next full gate started at 16:44.

## Story: the retained-file editor keeps an uncertain step uncertain

The Page edits a retained file through a sequence of signed steps: open a
lane, propose, record the source, record the version. Each step waits for a
receipt. Before this sprint, the editor kept its progress in separate
optional fields and flags. Several functions wrote the current stage, and a
failure handler worked out "unknown" against "stopped" from those flags.

S3 landed at 00:14 (`c85553da`). Each stage now carries the facts that its
next step needs. A step that went out without a verified receipt stays
unknown. The editor keeps its original signed request and never sends it
again. One function owns every stage change and makes no network call. The
messages that a member sees did not change. Two new tests cover cases that no
test covered before: a refusal after an earlier verified step, and an
acceptance whose receipt cannot be verified.

## Cost-of-change review

- M8's two open questions. Cost: about six hours of an idle builder. At 01:56
  and 03:44 the builder asked how to keep each prototype test's guarantee
  once the prototype engine goes. The planner answered at 08:45, after no
  survey ran overnight. The builder resumed at 11:43. Alternative: an
  overnight survey, or the builder keeps other lanes running while a question
  waits. Revisit: yes.
- The OAuth follow-up's first fix. Cost: one review round, about two hours.
  The checker posted an early note before the review request, which saved a
  gate. Revisit: no.
- M8's second final gate. Cost: one extra full gate, about 25 minutes. A
  new lane for formal subsystem models ran the gate's test stages from the
  shared checkout at the same time. It also left the shared checkout on its
  own branch, which would have blocked the next landing. The rerun with
  nothing else running reproduced M8's failures, so the overlap did not cause
  them, but it made the result unreadable. Alternative: every lane, however
  it starts, takes the single test slot and its own worktree. Revisit: yes.
- The deploy hold. Cost: 16 minutes of builder wait. The planner held the
  test slot for a deploy and was not surveying when the slot came free. The
  builder now owns the slot, and the planner deploys only in a gap.
  Revisit: no.

## Decisions

- M8 retires the prototype engine. Each prototype test's guarantee moves to
  the admitted program, with four additions. A refused program runs no step
  and no callback. The refusal names the declaration path. Every accepted
  corpus definition builds a complete program. A ledger maps each retired
  test to its replacement (`24e2a8d1`).
- The outside-effect driver refactor (S4) no longer waits for the archive
  investigation to close. It stops if the archive retry comes back
  (`217e53e9`).
- A message that reaches a cross-room receiver from the wrong sender gets a
  named refusal entry and a result, as every verified request does. It runs
  no handler effect and changes no state (`99f628a5`).
- Market slice M0 tests the cross-room send with today's v1 application
  installation. A v2 package cannot yet declare a receive port for a sender
  in another room. M0 records that limit, and its design waits for market
  slice M1 (`d3f960ab`).
- The builder owns the single test slot. The planner deploys only while no
  gate runs (`1b14c28a`).

## In progress

- M8, the last plan 035 migration: the full gate after the archive schema
  repair, then review.
- S4, the outside-effect driver: its focused tests and control pass. Its
  full gate is next.
- Market slice M0, a send between scopes of one application in two rooms:
  its first focused run failed on a test fixture's package bytes. The
  corrected fixture waits for its turn.
- Formal models and state charts for the five ranked subsystems
  (`3c6d197d`): bounded TLA+ models with eight passing safety invariants and
  a flow chart for each subsystem. The candidate now has its own worktree.
  It still needs one passing gate and review.

## What did not happen, and why

- M8 did not land: three final gates failed, on two test expectations and
  then on the archive schema cache.
- The live Claude and ChatGPT runs: the builder's browser connection stayed
  unavailable.
- No work moved from 05:52 to 11:43 while the builder waited on M8's
  questions and then on a new prompt.

## What landed

| Commit | Head | Request | Approval |
| --- | --- | --- | --- |
| `360014b4` | S1: one owner per hosted MCP transport generation | `e39e7cef` | `24cef08e` |
| `01de2ca8` | M7: Native hooks and capability arguments in the typed program | `11fbfe04` | `b0be808d` |
| `c85553da` | S3: retained-editor stages carry their evidence | `8ae87346` | `eac7ecea` |
| `8faa38dc` | S1 follow-up: a second OAuth close keeps the first choice | `089ed1a1` | `1fbeed4f` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo |
| --- | --- | --- | --- | --- |
| 08:42 | `c85553da` | `cdaff1e7` | `03c4edf6` | `91155f43` |
| 15:57 | `8faa38dc` | `cb7e08df` | `b3ec3a20` | `fc0e1733` |

Each deploy used the checked-in configuration. Health answered three times,
`POST /mcp` answered 404, the dap-demo offer named Register 26, and the J5
Site digest matched its baseline.

## Commitments for the sprint ending 9 November, 17:00

- Land M8 after a final gate with nothing else running, and deploy it.
- Review, land and deploy S4, then market slice M0.
- Run the formal-models lane in its own worktree, taking the test slot in turn.
- Run the live Claude and ChatGPT witnesses when the browser connection
  returns.
- Half-hourly surveys, including overnight; the daily report at 17:00; the
  worktree sweep after it.
