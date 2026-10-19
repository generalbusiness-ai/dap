# 033: The grow room as the demo

Planner, 18 October 2026. A sequencing plan. It puts the grow-operation
application of
[the grow-operation design note](../2026-10-17-grow-operation-application-design.md)
next, as the public demo with a page on the homepage, ahead of the
journey's MVP slices. It commissions nothing by itself; each slice below
needs its own request. Source facts cite `path:line` at main `fd198c724`,
of 18 October 2026.

## 1. What changes from plan 032

[Plan 032](032-2026-10-17-journey-as-acceptance-target.md) finishes the
archive and the capacity work, then makes the journey the main line, with
hosted Counter agents and M1 in parallel. Since it was written, the
capacity budgets landed (`62423347`), the compact-cards design and the
generic card kit landed (`6e309b6b9`), and archive A2 and A3 landed on 18
October (`0e63ba929` and `6dac9c763`; request `432f26b3` closed with the
milestone note at `fd198c724`).

This plan keeps section 2a of plan 032 as it is: archive A2 and A3
finished to the fixture-only cutoff first, and that milestone is landed.
After it, the grow room goes ahead of the journey's S slices and J pieces
(plan 032, section 2b). M1 moves from the parallel line into the main
line, because the grow room needs it. Hosted Counter agents stay in
parallel. The journey resumes at J3 and the evidence-rules slice after G4,
with M1 done, which S8 wanted.

Two pieces of runtime work that the demo needs, and that neither the
fixture-only archive milestone nor M2a covers, are their own slices with
their own gates: the native device-command record before G5 (decision 1),
and the archive enablement of the demo room before G4 (decision 7).

Why the demo first: the grow room shows the same fabric on a second kind
of work, people and agents in one room under real authority rules, on the
kit the journey will also use. It exercises the kit, the trusted-package
install and the generic view description with fictional data and no risk
to a real repository. The journey's exit test needs people and real work;
the demo needs a visitor and a page.

## 2. Decisions

1. **The simulator is the device-command owner, for the demo.** Open
   question 6 of the note asks who sends a commanded state to a device and
   records its outcome. In the demo, the simulated room is that owner: it
   applies each commanded target to the simulation, writes the outcome in
   its operation record, and writes the reported state through the sensors
   member, as the note says. The device item keeps the three facts of the
   note's section 3: target, reported state, outcome. A real device owner
   stays undesigned and is not pulled in. Today's runtime has no native
   form for that owner's record: the declared capability forms admit only
   holds and Git reads (`packages/contract/src/capability.ts:19`). So in
   G0 the simulated outcome is a separately labelled scenario-owner
   record, not a native operation record (decision report `e72e4e83`, 18
   October), and the native form is its own slice, G5a below, before G5:
   a bounded device-command capability whose owner is the simulator, with
   its own opening, outcome, reservation and replay rules. Neither a
   sensors act nor a scenario record stands for a native outcome.
2. **Probes are text.** A tender's probe is numbers and words typed into
   the chat. No photo, so custody for evidence (open question 4) waits.
3. **Routing through the carousel only.** G3 routes alerts, tasks and
   requests to the cards. The journey's attention loop (J5) is not needed
   for it.
4. **M2a, not M2.** The demo needs declared projections, the generic
   interface, and several scopes in one package. The presentation boundary
   against a hostile package (applications note, section 5.1),
   presentation-only updates and publication by URI stay in M2, after the
   demo. One bounded capability, the device command, is pulled forward
   from M2 as slice G5a, because the demo's outcomes need a native record;
   the other bounded capabilities stay in M2. The grow package is
   installed as a trusted package, which is M1's install.
5. **The homepage link opens a page, not a live grid.**
   `homepage/src/index.html` links one page per application: `/counter/`,
   `/library/`, `/room/` and `/jam/`. The demo adds `/grow/`: the story in
   a few lines, a link that opens the live room in the browser room page,
   and how to connect an AI app and take the acts. Rendering the kit's
   resources in the browser, so that the page itself shows the live grid,
   is a later slice (G6), not in this plan.
6. **Readings stay outside the journal.** Samples are outside and
   summaries are entries, as section 6.4 of the note says. The capacity
   bounds that open question 2 waited for have landed. The simulator's
   cadence is fixed and declared in the package.
7. **Archiving the demo room is its own gate.** A2 and A3 are
   fixture-only: the hosting deployment has no archive policy or
   configuration, and no real archive token or destination exists. The
   archive is a binding of the room, not a level
   ([the sequenced-level note](../2026-10-18-sequenced-level-and-order-scope.md),
   section 4): the room's directory holds the binding, set at its claim.
   G4's day's archive therefore needs the demo room's binding set, the
   policy and configuration for the hosting deployment reviewed, a real
   destination and token, A3's archiver wired for that room, and a line
   on the `/grow/` page that says the room's journal is archived and
   where. That is the demo-room archive slice below, after G5 and before
   G4. The grow package does not require the archive, so the slice can
   set the binding on a running demo room. It widens neither A2 nor A3,
   and it claims nothing about A4, A5 for other rooms, or the archive
   root; those stay where plan 032 and the archive note leave them.

## 3. Order and slices

Serial for one builder, except where said. Sizes are estimates from the
builder's pace over the last week, not measurements.

| Order | Slice | What | Needs | Done when | Size |
|---|---|---|---|---|---|
| 1 | A2, A3 | Archive to the fixture-only cutoff (plan 032, section 2a; request `432f26b3`) | nothing | as plan 032 says | landed 18 October (`0e63ba929`, `6dac9c763`, `fd198c724`) |
| 2 | M1 | Trusted packages on the current runtime: the manifest and its three ids, `pack`, the application store and the generic route, install in one act, the browser kit, and `dap new`, `dap dev` and `dap check` (applications note, section 7, M1) | nothing new | the Counter and the lending library are packages, and a fresh room installs each by URI without a redeploy; their routes, asset modules and cohort are gone from the host's source | 2 to 3 days |
| 2, beside M1 | G0 | The `site` and `room` definitions of the note's section 6.1 with their actions, guards and timed rules; the fault story as a scenario with a simulated source of readings and devices | today's runtime; `dap check` from M1 for the replay | the scenario's refusals and closures match section 4 of the note, and `dap check` replays it | 1 day |
| 3 | M2a | Declared projections, the generic interface, and several scopes in one package (applications note, section 7, M2, those three items) | M1 | the grow package's views are declarations the generic interface serves, with no view code in the host | 2 days |
| 4 | G1 | The alert, zone, carousel and log views as declarations; the grid as a surface resource; the derived tools | the kit, M1, M2a | the operator's path of section 4 runs inside the kit's test host with the kit's checks: app-only data, quiet context, receipts, stale refusals, resize | 2 days |
| 5 | G2 | The tenders' probe act through the model, the bench carousel, and the three grid layers | G1 | a probe typed in a chat appears in its layer and advances the carousel | 1 day |
| 6 | G3 | Routing: alerts to the holders of the authority they need, tasks to the tenders present in the room, requests to the head grower | M2a's site scope, G1 | the fault produces the two cards of section 4 for two members and the watering request for a third | 1 day |
| 7 | G5a | The native device-command record: a bounded capability with its own opening, outcome, reservation and replay rules, held by the simulator as the demo's owner (decision 1); the G0 scenario runs on it in place of the labelled record | M2a's package forms, G0 | a commanded target produces a native outcome that only the owner writes, replay reproduces it, and the three device facts keep their separate writers | 2 days |
| 8 | G5 | The hosted demo: a room on the hosting deployment with the grow package installed and the simulator running as the sensors member and the device-command owner; the `/grow/` page and its link on the homepage | G1 to G3, G5a, the hosted MCP endpoint, a deployment after review | a visitor opens the room from the homepage; a person in their AI app takes the operator's act during the fault; the simulator keeps running between visits | 2 days |
| 9 | Demo-room archive | Archive enablement for the demo room (decision 7): the archive binding in the room's directory, set at its claim (sequenced-level note, section 4.5), the reviewed archive policy and configuration for the hosting deployment, a real destination and token, A3's archiver wired for that room, and the disclosure on the `/grow/` page | A2, A3, G5, a deployment after review | the demo room's journal is archived from the hosting deployment, a clone of it replays offline through A2's replay, and the page says so | 2 to 3 days |
| 10 | G4 | The incident's entry range, "what happened today" from the read tool, and the day's archive | the demo-room archive slice | a clone of the demo room's day replays, and the model's answer names entries that exist | 1 day |
| 11 | J3, evidence rules | The journey resumes (plan 032, section 2b) | G4 | | |

Named and deferred: G6, the kit's resources rendered in the browser room
page so the homepage shows the live grid; the real device-command owner;
custody for photos; the rest of M2; A4, A5 for other rooms, and the
archive root.

## 4. The simulator

One member, the sensors, an agent controlled by the operator. In G0 it is
a test double inside the scenario. In G5 it runs on the hosting
deployment: a timed driver that holds the sensors' key, advances the
simulation on its declared cadence, writes summaries as entries and
reported device states as `report-device` acts, applies commanded targets
to the simulation, and writes their outcomes. It is the only writer of
reported state. The fault story repeats on a declared period, so that a
visitor at any hour finds the room somewhere in the story; the incident
count climbs, and the record shows that.

## 5. Exit test

Three people on their own devices, each in their own AI app, in the demo
room through one fault: one as the operator, one as a tender in the room,
and one who came from the homepage and connected. Then the record, once
the demo-room archive slice has passed its gate: a clone of the day's
archive replays, and the model's account of the day names entries that
exist. The same shape as the journey's exit test (plan 032, section 2d),
with different people. It comes first and costs less, because the data is
fictional.

## 6. What stays as it was

- Plan 032's section 2a (the archive milestone), 2c (hosted Counter
  agents), 2d (the exit test) and 2e (deferred until measured) are
  unchanged. Its section 2b is postponed, not changed.
- The grow note was written to follow the journey. Its opening and its
  section 7 were amended on 18 October 2026, before it landed (main
  `90c8c483`), to state this plan's order.
- Nothing is pulled into A2 or A3, nor into the kit's parent acceptance
  (`a9551a6d`), by this plan.
