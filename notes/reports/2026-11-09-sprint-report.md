# Sprint report, 9 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 8 November to 17:00 on 9 November. Twenty-one
heads landed on `main`. The project set a new order of work on 8 November:
finish the small open items, then the typed definitions, then new
functionality.
This sprint finished the small items. A room now holds four limits that it
did not hold before, against a retired agent's key, a flood of read tokens,
a file published over a control path, and an act from a key with no
standing. The typed derivation core is complete. All four hosted Workers run
the current `main`. The cost-of-change review is below.

## Story: four limits that a room now holds

A member can mint a read token for a room's repository. Before this sprint,
no limit applied to the number of tokens. Each member now has eight places,
shared by all of that member's keys. The ninth fresh mint gets the refusal
`limit` and records nothing. A place frees when the token ends.

A person can retire the hosted endpoint that an AI app uses to reach a room.
Before this sprint, a retired endpoint kept an active key and its private
signing seed. Retirement now erases the seed, the sessions and the OAuth
grants in one step, and nothing can revive the endpoint. The person who
retires the endpoint can pass a signed revocation of its key. Without one,
the endpoint stays disabled and answers `202` until an administrator or a
recovery key revokes the key.

An application can publish files to a room's repository. Before this sprint,
it could publish to any valid path. The host now refuses a publication to
`.github/`, to a `CODEOWNERS` file, to `AGENTS.md` or `CLAUDE.md`, and to the
paths that hold the room's rules. The refusal applies in every room.

An act from a key that holds no grant now gets `unauthorized` before the room
reads application data, receiver policy or facts from another room. A
request no longer pushes due timed work through. Only the room's alarm runs
timed work. A room also bounds its memory of keys. In one run, it admits at
most 4,096 distinct signing keys.

Review of that last bound found a flaw after it landed. Throwaway keys could
fill the 4,096 places, and a member who joined later then got `limit`. The
fix landed three hours later. A key now takes a place only after Membership
gives it standing, so an unknown key takes none. A second finding followed
from the first. An act can name member IDs that do not exist, and the room
keeps each answer without limit. That fix is designed and is next.

The project now has a threat model. `docs/security/threat-model.md` states
five invariants with their limits, the tests that show each one, and the
exposure that remains. A new `SECURITY.md` gives the private path for a
vulnerability report.

## Story: every rule runs on one typed program

Plan 035 moved each rule onto a typed program that can run the rule, explain
the run, and list what the rule depends on. The last migration, M8, landed
at 18:05 on 8 November. Every rule body in an admitted definition now runs
through one program and one interpreter. The prototype engine is gone. A
definition's judgments did not change.

An application author gets two answers from the same program that runs the
rule. "Explain" reports the run that happened and runs no step twice.
"Dependencies" visits every branch and lists each read, and it marks a
requirement that it cannot see into as unknown. The typed definitions, which
are next, build on this program.

## Story: an application sends a message between two rooms

An application could send a message only between scopes of one room. A test
now shows a declared send between two rooms with different members. The
receiving room admits the one sender that its creation names. It refuses the
same message from any other sender with a named refusal. The refusal
records one entry and changes no other state. A member of the receiving room
reads what arrived and cannot read the sending room.

The test runs in the test host with today's application format. A package in
the new format cannot yet declare a receive port for a sender in another
room. That design opens the market work.

## Story: a clean start for a self-hosted Worker

`apps/room/wrangler.jsonc` was the configuration of the project's first
hosted Worker. It is now a neutral template. It names no bucket, no metrics
dataset, no register and no credential, and it starts with enforcement on. A
self-hoster copies the template and fills in their own account. The first
hosted Worker keeps its own file, and three GitHub credentials that it no
longer used were deleted from it.

The Page, the SDK and the CLI now accept only the current form of a creation
offer. An offer in the first form fails as retired.

## Story: a smaller gate and smaller files for contributors

- The review gate no longer runs six slow scale tests on a change that
  cannot affect them. The scale tests run on `main` after every landing.
- JSON source files are formatted, and the gate checks the format. Every
  recorded digest stayed the same, because digests come from canonical
  values.
- The CLI's command file, the Worker's hosted MCP code and the archive
  wiring each moved to their own modules. Every moved declaration is
  byte-identical.
- Five subsystems have bounded TLA+ models with eight safety invariants and
  a flow chart each. A hash ties each model to its source functions, so a
  source change forces a review of the model.
- The driver for outside work now keeps parked attempts and held replies in
  two owners. Its behavior did not change, and one case gained its first
  test: an answer in hand wins over a retained reply.

## Cost-of-change review

- A rule change needs a new family of definitions. Cost: two security
  designs were cut back. The retiring endpoint cannot revoke its own key,
  and an application cannot declare its own publication paths, because each
  needs a new Membership or Rules revision, and a room cannot move to a new
  revision after creation. Both landed as host-level changes instead.
  Alternative: rules that change after creation, which the roadmap lists.
  Revisit: yes, at the next revision that a feature needs.
- The 4,096-key bound. Cost: two follow-up heads, one landed. The bound
  counted keys with no standing, so the limit that protects memory could
  lock a member out. Alternative: write the invariant first ("a member's key
  is always admitted") and then choose what the bound counts. Revisit: the
  second follow-up is in progress.
- Timed work from the alarm only. Cost: one extra full gate, about 25
  minutes. Twelve test cases in six files assumed that a request runs due
  timed work. Each repaired case now shows that the host scheduled the
  alarm. Revisit: no.
- The scale tests' move. Cost: one extra head. The first run on a hosted CI
  runner hit a 600-second deadline, because the runner is about three times
  slower than the development machine. Only the `main` scale run now allows
  three times the deadline. Alternative: time the tests on the CI runner
  before the move. Revisit: no.
- Readable JSON against a byte limit. Cost: one failed gate. Two Grow check
  files pass the CLI's 65,536-byte metadata limit when formatted, so they
  stay unformatted. The limit counts source bytes, not canonical bytes.
  Revisit: with the typed definitions, which change how an author writes a
  definition.
- The workroom cleanup. Cost: two rulings restated. Retiring 136 finished
  items made 93 later acts stale, two of them rulings that live work used.
  A finished item that live work rests on now closes with a note instead.
  Revisit: no.
- A check that runs only on `main`. Cost: one follow-up head. The standalone
  Worker smoke test expected `200` for a retirement and failed after the
  endpoint retirement landed with `202`. Revisit: no.

## Decisions

- The order of work is small items, then typed definitions, then
  functionality. The sales calendar and the cross-room receive port stay
  parked with their source until the third phase (`afdebb86`, `84d6b716`).
- Joining a room through MCP does what the Start page and the CLI do. The
  build is in the third phase (`9719b634`).
- The identifier cutover retires every room in the old format. The project
  keeps one code line and recreates the demo rooms (`c0a795e7`).
- The CI stays on standard runners (`38d61076`).
- A retired endpoint never signs its own revocation. Self-revocation waits
  for the next Membership revision (`e2fc59d5`).
- The host refuses reserved paths in every room. Declared paths for each
  application wait for the next Rules revision (`d92b5f66`).
- A key that Membership gives no standing takes no place in the key bound
  (`dbf97956`). The kept answers for named members hold at most 4,096
  records and 8 MiB, and a dropped answer forces a fresh read (`e838bb78`,
  `1f159465`).
- The typed definitions land as eight heads. The expected-revision
  derivation and the authoring package go first, in parallel (`176190ba`).
  The authoring package joins the public release list (`92c1bf71`).
- The version questions that a layer below Platform asks move to one table
  in a module with no imports. No port changes (`a5522106`).
- A deployment window ends with a durable act that the builder reads, not
  only with a chat line.

## In progress

- R3b (`22b57b9e`): the bound on kept answers. Its design is accepted and
  its source is in progress.
- Typed definitions, first two heads: one derivation of the revision that
  an act expects (`b9f85b9a`), and the authoring package
  `@generalbusiness/dap-define` (`00c50371`). Plan 035 built the program
  that runs a definition. These heads build what an author writes.
- BR-13 (`487496f5`): the per-version answers are inventoried, 105
  questions across 100 pins, before any source moves.
- The identifiers note amendment (`7740db3d`).

## What did not happen, and why

- The live Claude and ChatGPT runs did not happen. The sprint went to the
  small items, and hosted MCP stays closed on every Worker.
- The sales calendar and the cross-room receive port did not move. Both are
  parked by the order of work.

## What landed

| Commit | Head | Request | Approval |
| --- | --- | --- | --- |
| `0914c89e` | M8: every rule body runs through one program | `bd1a9429` | `41eae490` |
| `871df9a9` | S4: two owners in the outside-work driver | `12f63139` | `88c55fd1` |
| `f2677f77` | Market slice M0: a send between two rooms | `f131d4e8` | `10887121` |
| `baa418b9` | Formal models of five subsystems | `3c6d197d` | `08d2cb9d` |
| `66d84aef` | Practice survey note: three corrections | `a455fdba` | `20cae819` |
| `f1ec237c` | Control runner picks its runner from the test file | `116694e3` | `434c17bc` |
| `cf0487da` | Self-hosting note, draft 4 | `33873e49` | `8cc5bae3` |
| `4217a913` | Each caller states its rule for reusing an open room | `b32c8fbd` | `5ec6d8ac` |
| `9e2ac753` | BR-12: test waits and bounds made explicit | `02174ceb` | `96d65d66` |
| `4f06bbbc` | BR-5: scale tests in their own project | `d0afa034` | `8f3962d0` |
| `9ce45bd1` | BR-11: self-host template, first offer form retired | `e1b71b6b` | `cb51cfe4` |
| `f9eb50bc` | Scale run on `main`: deadline factor and kept output | `a5f3d838` | `1e97bd54` |
| `6dd337d3` | R13: eight read-token places for each member | `90878601` | `2281933f` |
| `c9583a00` | R15: retirement erases the endpoint's seed | `b66b8f14` | `02d35f1e` |
| `ce0290fb` | Smoke test expects the retirement answer | `a6a57ffb` | `81990219` |
| `29926a3a` | R16: reserved publication paths | `b300dca1` | `a1136ff0` |
| `ca6a54e2` | Readable JSON source, checked by the gate | `c6e29874` | `b9b0b9bf` |
| `c85a9bae` | Threat model and `SECURITY.md` | `d8512f74` | `690896ff` |
| `f1f6a8b9` | R3: early refusal, alarm-only timed work, key bound | `03e5f6d7` | `df71924c` |
| `86179b0c` | BR-14: CLI, hosted MCP and archive modules | `c7853c21` | `f0ea0d29` |
| `9fc50efe` | R3a: a key takes a place only with standing | `31f98f33` | `cd8110b0` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | artroom-scope |
| --- | --- | --- | --- | --- | --- |
| 8 Nov 18:35 | `0914c89e` | `7af4f592` | `800b685b` | `ff7e0e7a` | |
| 8 Nov 19:20 | `871df9a9` | `5d5a6bfa` | `e486b63e` | `7c6d81a7` | |
| 8 Nov 20:05 | `f2677f77` | `d66a5920` | `a7866d26` | `63a1dc90` | |
| 8 Nov 21:06 | `baa418b9` | `b846867d` | `597d9640` | `d8bdf321` | |
| 8 Nov 23:53 | `9e2ac753` | `1b517ee3` | `8ce62fb1` | `529139f4` | |
| 9 Nov 02:47 | `9ce45bd1` | `75e320e2` | `8d3a9ea8` | `52538657` | `b2f878a8` |
| 9 Nov 06:23 | `6dd337d3` | `121cfd1d` | `0fd19f9b` | `d40b2b89` | |
| 9 Nov 07:54 | `c9583a00` | `ad4b2ea3` | `37f70ae5` | `42eb656c` | |
| 9 Nov 09:23 | `29926a3a` | `ff99c2a3` | `98a84fe9` | `f560f20e` | `6e18c4be` |
| 9 Nov 13:53 | `f1f6a8b9` | `af5d43f7` | `062cb14a` | `cc6cbb6a` | `5656d884` |
| 9 Nov 15:36 | `86179b0c` | `5e5138e2` | `8515c2aa` | `5edb7abd` | `6de0d968` |
| 9 Nov 16:43 | `9fc50efe` | `e3bd1580` | `34f6c7b0` | `fcc3abe7` | `ecd694c9` |

Each deploy used the checked-in configuration. Health answered three times,
`POST /mcp` answered 404, the dap-demo offer named Register 26, and the J5
Site digest matched its baseline. On artroom-scope, the existing room read
the same log before and after each deploy.

## Commitments for the sprint ending 10 November, 17:00

- Land and deploy R3b.
- Land the first two typed-definition heads, and start the next two.
- Land BR-13, the version questions.
- Land the identifiers note amendment.
- Half-hourly surveys, including overnight. The daily report at 17:00, and
  the worktree sweep after it.
