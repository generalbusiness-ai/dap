# Sprint report, 2 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 1 November to 17:00 on 2 November. Nineteen
heads landed on `main`, counting the previous report. The three room Workers
were deployed six times, and the Mac mini once. A person returning to a room
now finds everything that needs them on the Page, so J5 is accepted. Reading
a change in the desktop AI app got faster and steadier. Hugh set the order
for the four MCP hosts, and the OAuth design that Claude and ChatGPT need has
landed. A room on the Mac mini is ready to bind to a real GitHub repository.
The cost-of-change review is below.

## Story: a person returns to a room

A person who comes back to a room opens the Page and sees one list of
everything that needs them, across the room. Each row opens the item it
names. The scripted run on the deployed Workers first failed at its fifteenth
press: a row briefly read "Observation unknown". The cause was a refresh that
published an empty identity while a read was still waiting. The repair landed
the same evening, the deployed run passed, and J5's record closed it at
22:32 (`cc09709a`).

A later repair lets the Page recover when one roster read fails, instead of
staying blank (`8093f9ce`).

## Story: reading a change is faster and stays put

The first **View diff** press made twelve requests before its act. It now
makes four, and still reads membership, the directory, the rules and the
target fresh. In three runs on one Mac, the wait fell from 1.3 to 4.5 seconds
to under 0.7 seconds (`c9f9ed46`). These are sequential runs on a shared
machine, not a latency guarantee.

A section that the reader opens or closes now stays that way when the card
refreshes itself (`08a16dc6`). When a diff read stops at its limit, the card
keeps what it read, and the next ordinary press reads again without reopening
the view (`04f4af48`). The card also names who signed each act (`892456de`).

The readable diff design landed with renders on real answers (`2950cff9`).
Every part of the display collapses, and old and new lines read apart. It
waits for Hugh's decision before any build.

## Story: four MCP hosts, Claude and ChatGPT first

Hugh asked for dap to work in ChatGPT, Claude, Goose Desktop and Google
Gemini. An audit checked each host's published requirements against `main`
(report `cb825288`). Today only Claude Desktop works end to end, over local
stdio. ChatGPT, Claude web and Gemini need the hosted endpoint and OAuth.
Goose connects but refuses dap's cards. The audit claimed that no card had
rendered in Claude Desktop. That was wrong, and a corrections file sits
beside it.

Hugh then set the order: Claude and ChatGPT on the hosted service first, then
Goose, then Gemini, all ahead of the hosted agent teams (`58c6cb8e`). The
hosted endpoint now serves the same cards as stdio, with each host's card
origin (`bcf88654`). The OAuth design landed after three review rounds
(`afdd8ee5`). A person consents on the dap Worker with their own browser key.
Their own agent then signs every act, and the room judges it as today. Hugh
decided that an ordinary member can add an agent they control. A new
membership version carries that rule, with a guard that keeps the agent's role
inside the person's own. The builder has taken the first slice.

Goose Desktop 1.57.0 returns MCP Apps version `2025-11-21`, and dap's card
code accepts only `2026-01-26`. A person approved the extension in Goose, and
the builder captured that value on screen. The fix is in draft.

## Story: a room on the Mac mini, ready for GitHub

A room on the self-hosted service can now bind once to one reviewed GitHub
repository. It keeps the issues it held before binding (`4be4c43f`). G3 uses
the existing Artroom Demo App. Each token dap mints names the one repository
by its ID, with read or write as needed. The App key can still mint for every
repository in the installation, and the self-host guide says so.

The configuration record landed (`8e9f0942`), and the planner deployed it on
the mini. The register installed three minutes into its fourteen-minute
window. The older H3 room on the same host reads exactly as before. The
builder then created the witness room, with a test issue to keep through
binding. The binding row goes to review next.

## Cost-of-change review

Each entry gives the cost, a cheaper path if one existed, and whether to
revisit.

- G3 source (`4be4c43f`). Cost: 63 paths and four full gates, three of which
  failed: a security inventory, catalog goldens and a host fixture.
  Alternative: run the owning inventories before the first gate. Revisit:
  yes; inventories run before a gate on any head that adds a cohort.
- OAuth note (`afdd8ee5`). Cost: three review rounds. Round one found a
  membership version that G3 had already taken. Round two found that the
  hosted-cards landing had split one endpoint into two connector URLs.
  Alternative: rebase onto `main` before each review. Revisit: no.
- Hosted cards (`bcf88654`). Cost: 21 paths, one gate. Its landing subject is
  111 characters, and the commit cannot change. Alternative: check the
  subject before `gs merge`. Revisit: yes, for builder landings.
- First press (`c9f9ed46`). Cost: two failed gates for one test stand-in that
  lacked a new method. Alternative: none cheaper; the follow-up rule worked.
  Revisit: no.
- Six Worker deployments. Each was batched or waited on a person. Revisit: no.
- Mini deployment. Cost: one refused install, because the planner's health
  check passed against the old Worker. Alternative: the procedure's own check
  of the register state. Revisit: no; the second deployment uses it.

## Decisions

- Claude and ChatGPT on the hosted service first, then Goose, then Gemini;
  OAuth first; all ahead of the agent teams (Hugh, `58c6cb8e`).
- An ordinary member can add an agent they control, inside their own role
  (Hugh; design `afdd8ee5`).
- G3 uses the existing Artroom Demo App; every token names one repository
  (Hugh; `3cfac8c2`).
- The provider's own read tokens stay in memory. Publication and member
  credentials keep the existing private store (`e54eb718`, `acbca46b`).
- G3 deploys on the existing H3 installation. H3 gives up its default
  register and its cached sessions, and is read after each deployment
  (`4943c76a`).
- A deployment on the mini counts as serving when the fleet's pointer names
  its version and health holds 60 seconds after (`9cf4b1cd`).
- Live checks in the four hosts stay unscheduled until Hugh starts them
  (`5066018a`).

## In progress

- OAuth slice O1, the resource server, and O2, the own-agent membership.
- G3's binding row, then the second mini deployment and the GitHub witness.
- The Goose card fix.
- The next creation versions: failed claims free their place, with the
  one-hour token.

## What did not happen, and why

- The planner filed no survey from 10:00 to 12:30. The next `date` read
  12:47. Two builder questions waited about three hours.
- The 08:30 survey started its read at the planner's newest act, not the
  last survey, and missed a builder question. Later surveys start at the last
  survey.
- The planner named an installation path on the mini from the generic guide
  without checking the mini. The builder found the path absent before any
  run.
- Three planner acts needed a correction: a time written from a UTC clock, an
  act ID, and that installation path.
- Nobody deleted the leftover forks of the J4 run.
- The diff build waits for Hugh's decision. Gemini needs Google's preview
  access, which only Hugh can request.

## Commitments for the sprint ending 3 November, 17:00

- Land OAuth slices O1 and O2, and start O3.
- Bind the G3 room and run the GitHub witness on the mini.
- Land the Goose card fix, and render the four cards in Goose.
- Land the next creation versions' source.
- Delete the leftover J4 forks.
- Half-hourly surveys; the daily report at 17:00; the worktree sweep after it.
