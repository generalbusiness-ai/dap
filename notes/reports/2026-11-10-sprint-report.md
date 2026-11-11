# Sprint report, 10 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 9 November to 17:00 on 10 November. Fourteen
heads landed on `main`. An application author now writes a definition with
types, and every client tool reads its forms, descriptions and revisions
from that one definition. The last open security bound landed. The
documentation gives each kind of reader a place to start, and it states
each limit where that reader meets it. The project also set its remaining
order of work: finish the changes that break existing rooms, then hold a
stable base for users and applications. The cost-of-change review is below.

## Story: an author writes a definition with types

Before this sprint, an author wrote a definition as plain data, and a wrong
field name showed up when the definition ran. The package
`@generalbusiness/dap-define` now gives the author typed helpers for
values, subjects, grants, reasons, rules and quantifiers. The TypeScript
compiler reports a wrong name or a wrong type before the definition runs.
Counter and Lending are written with the package. Their recorded digests
did not change, so a room that runs either definition is unaffected.

The tools that read a definition now share one derivation of each answer:

- The revision that an act expects. The CLI, the MCP server and the Counter
  page used separate code. They now call one function in the client
  package.
- The description and the input schema of each act. The MCP server held
  this code. The client package now holds it, and the MCP tool list is
  byte-equal to the earlier one.
- The browser models of Counter and Lending. Each model now reads its act
  names, field types, enums and limits from the definition.

A client also prepares an act with types. `declaredHandle(scope,
definition)` returns one `intents.<kind>` method for each act. The method
takes typed input, signs a packet and sends nothing. The caller submits
the packet when it chooses.

## Story: a room bounds what it keeps about named members

An act can name member IDs, and a room keeps the answer that it read for
each name. Before this sprint, the room kept those answers without limit,
so a stream of acts with invented IDs grew the room's memory. The room now
keeps at most 4,096 answers and 8 MiB of their data. When the store is
full, the oldest answer leaves and the next act that needs it reads again.
No act gets a refusal from this bound. This closes the last finding of the
security work that the 9 November report listed as next.

## Story: each reader has a place to start

A review read the documentation as five readers: a room member, an
application author, a person who connects an AI app, an operator, and a
security reviewer or contributor. It found errors of fact, pages that
serve several readers at once, and readers with no first page.

- Eleven errors of fact are corrected. The roadmap now says that OAuth on
  the hosted MCP endpoint is built. The CLI page gives the Node version
  that the command needs. The hosted connector page names the right issue
  tool.
- `docs/README.md` now opens with six doors, one for each reader, in
  reading order. Every page under `docs/` stays reachable from it.
- Four new pages give readers a start: get the `dap` command, connect an
  AI app to a room, contribute to dap, and operate a service.
- The five room guides are current how-to pages. Each gives the browser
  path first and the command second.
- The security references have one reading order. The threat model comes
  first, and it opens with what dap protects, what an attacker can do and
  what the model assumes.
- Each long page now serves one reader. The testing page keeps the daily
  steps, and its reference material and its evidence rule have their own
  pages. The self-hosting page splits into one page for Cloudflare and one
  for a Mac. Package composition has a reference page.
- A new page takes an author from `dap new` through `dap check`, a refusal
  in a scenario and `dap dev`. Every output block on it comes from a run.
- The project's own records left the reader pages. Run records, the
  project's own runbook for the hosted connector, and the paragraphs that
  named a ruling now stand in notes. The page on the hosted connector is a
  how-to for an operator with their own Worker.
- Each limit stands in the page where a reader meets it. Examples: no
  room that a current Worker creates installs an ordinary package, no
  registry publishes the `dap` command, and no command restores a room
  from an archive.
- A comparison of sixteen pages with source, line by line, corrected
  eleven of them. Each of the sixteen carries the date of its check.

One item remains: the MCP page splits into a how-to and a reference after
the canonical spelling head lands, because that head regenerates the page.

## Story: one table answers the version questions

A room pins the version of each platform definition that it runs. The
readers of publication, certificates, membership, creation and the archive
each asked questions of a pin in their own code, and some of them
disagreed. One table in the contract package now holds all 105 questions
for all 100 pins. Every answer is the one that the earlier code gave: a
test compares 11,025 recorded answers. A contributor who adds a version
edits one file.

## The order of the remaining work

The project now aims at a base that stays stable while people use it. The
order is:

1. The changes that break a room land first. These are the canonical
   spelling of definitions, the last two typed-definition heads, and the
   new identifier format. The identifier cutover retires every existing
   room, and the project recreates the demo rooms once. Three Membership
   and Rules changes that need a new family of definitions ride with that
   cutover: an endpoint that revokes its own key, publication paths that
   an application declares, and several keys for one agent.
2. Two levels of shared order follow, because an application developer
   builds on them: the Sequenced level and the Live level. Each adds to a
   room and retires nothing.
3. Four items support the people who run and use the base. A checked-in
   deploy command with its runbook and a `dap` command that installs
   without a checkout are open now. An ordinary application package that
   installs in a new room needs a new Rules version, so it rides with the
   cutover. An archive for every room, with one drill that verifies a room
   from its archive, follows the cutover.
4. Joining a room through MCP reads an invitation exactly as the Start
   page and the CLI do.

The sales calendar, the market, hosted agent teams and two more AI hosts
are parked. A sizing of hosted agent teams found 13 to 20 heads of work,
and no code on `main` runs an agent on the host today.

## Cost-of-change review

- Gates lost at static steps. Cost: three gate attempts. One stopped at a
  blank line at the end of a file, one at JSON format, and one at a merge
  subject of 101 characters. Each check runs in seconds, and each failure
  spent a turn at the one gate slot. The builder now runs the whitespace,
  commit-message and format checks before it books a gate. Revisit: no.
- The version table. Cost: four failed gates and about four hours from
  the first failure to the landing. After the format stop, an
  architecture guard refused seven new imports, two test alias maps
  resolved a new subpath wrongly, and one run lost its Worker process to a
  heap abort. The table touches every package, so every guard had a say.
  Alternative: run the guards and one case from each test project before
  the first gate. Revisit: the heap abort did not recur, and the gate now
  samples memory. The Worker process peaked at 3.3 GiB.
- One spelling for a definition. Cost: the head did not land this sprint.
  The rule "omit an empty list" changes the digest of every definition
  that current source generates. The count grew from two pinned
  definitions to eleven. A twelfth, the first Counter definition, keeps its
  bytes behind an exact exclusion until the cutover. Alternative: fix the
  canonical spelling in the first validator. The cost of a spelling change
  is the number of digests that depend on it. Revisit: at the cutover,
  which removes the exclusion.
- A typed helper that marked a value. Cost: one failed gate. The typed
  package attached a hidden symbol to an act value, and the strict JSON
  check for applications refuses a value with a symbol. The package now
  keeps the mark outside the value. Revisit: no.
- A documentation head written from old text. Cost: one review round. The
  first head for the reader pages held five statements that the source
  contradicts. Two came from old pages and were not checked again. A
  moved sentence now gets the same source check as a new one. Revisit: no.
- A rename that the landing tool refused. Cost: one more review round,
  about 20 minutes. The first head for the project records moved one file
  out of `apps`. The landing tool refused the approved head, because the
  move would retire another actor's record of the whole `apps` directory.
  The revised head leaves the file in place. A planner head now checks
  each path that it renames or deletes for a directory record of another
  actor before review. Revisit: the file still needs its move.
- A deployment by hand. Cost: five deployments of four Workers, each with
  its checks run by hand. Two landings changed no Worker bundle, and a
  byte comparison of the built bundles showed that, so they needed no
  deployment. A checked-in deploy command is on the list above.
- A rule change still needs a new family of definitions. Cost this sprint:
  none, because the three waiting changes now share one cutover. Revisit:
  no, the base accepts this limit.

## Decisions

- The remaining order of work (`fc7576f8`). The Sequenced and Live levels
  are in. Hosted agent teams are deferred.
- The identifier cutover lands as one head after a head of test vectors
  and a verifier (`8e45aac8`, `a30f1b67`). A malformed identifier and a
  missing predecessor both report a mismatch at a named position
  (`f194f905`).
- One head plan covers the three Membership and Rules changes that ride
  with the cutover (`9ecd3efa`).
- The canonical spelling changes eleven identities and no live room. New
  digests apply only to rooms created later (`0a0286c4`). The validator
  checks the spelling only where an author's file enters (`865f4d70`). The
  first Counter definition keeps its bytes until the cutover
  (`23559d21`).
- A prepared act signs and does not submit (`0be8be71`).
- Typed authoring sources stay offline. A running room reads generated
  data and never imports the authoring package (`09048d34`).
- No room that a current Worker creates installs an ordinary application
  package, because the current Rules accept only a package with a device
  command. The Rules version of the cutover family accepts both
  (`710a5d76`).
- The deploy command guards a new Durable Object migration and writes a
  receipt (`b380ea8c`). Its smoke check takes each expectation from the
  tracked configuration, and the command takes no override of a tracked
  variable (`5b38cde5`). The legacy Worker runs its scope index in
  register mode, as its tracked file says.
- The `dap` command ships as one built file, and nothing is published
  before the cutover (`7c9c00e4`). The release producer writes every
  publication field, and the checkout package stays private (`d57cef0e`).
- The archive drill verifies a room from its archive. No restore command
  exists, and a restore is a later design (`6fa0190d`).
- Join parity is in the stable base, in two heads. The first gives the
  three surfaces one invitation parser, and it requires the Membership pin
  everywhere (`3c9a0f81`). A fresh CLI still takes its service from the
  link (`3dca1c8b`), and so does a local MCP server that starts with no
  service (`c822fe5f`).
- A browser program ships in an application release, not in a Worker. A
  change to one needs no Worker deployment.
- No exception for a commit subject over 100 characters. The builder
  rebuilt the branch with one subject reworded and proved the tree equal
  (`7fb1a2da`).
- The documentation request lands as one head for each group, and a
  documentation head needs no gate (`044311b0`).

## In progress

- The canonical spelling of definitions (`2ad35350`). Every compiler
  context passes, and one expectation about a retained definition is
  repaired. The focused run at the repaired head ended after 12 seconds in
  a native crash of Node, with no failed assertion. One control run
  follows, and the gate slot goes to the next ready head while a repeated
  crash is diagnosed (`ebf8c4b9`).
- The last two typed-definition heads (`f682cbc4`, `d49269fd`).
- The identifier test vectors and verifier (`a30f1b67`).
- The first join parity head (`3c9a0f81`), the deploy command
  (`b380ea8c`) and the installable `dap` command (`7c9c00e4`).
- The head plan for the cutover family (`9ecd3efa`).
- The split of the MCP page, the last item of the documentation request,
  waits for the canonical spelling head (`044311b0`).

## What did not happen, and why

- The canonical spelling head did not land. The review above gives the
  cause, and the last focused run ended in a native crash of Node.
- The live Claude and ChatGPT runs did not happen. They need one join in a
  browser on the test Worker, and hosted MCP stays closed on the other
  Workers.

## What landed

| Commit | Head | Request | Approval |
| --- | --- | --- | --- |
| `f3ddcc06` | R3b: a bound on kept answers for named members | `22b57b9e` | `fd53b172` |
| `64be0cab` | One derivation of the revision that an act expects | `b9f85b9a` | `1981e4bc` |
| `19ddc868` | The typed authoring package, with Counter and Lending | `00c50371` | `23c74c4e` |
| `c9055184` | BR-13: one table for the version questions | `487496f5` | `ca1e71de` |
| `a5b82ee0` | Act descriptions and schemas in the client package | `260991d8` | `7c8b4778` |
| `f5d59983` | Counter and Lending browser models from their definitions | `6f87a4e3` | `688cdcda` |
| `1d7be4f3` | Identifiers note: old rooms retire at the cutover | `7740db3d` | `7c0b5543` |
| `8289d9e5` | Typed act preparation and shared forms | `d5fa31c9` | `f2b48366` |
| `ca6afe2b` | Documentation: eleven errors of fact | `0487dd8f` | `e4e4eb8b` |
| `fdd1c758` | Documentation: six doors, four new pages, room guides | `16e74c59` | `75330257` |
| `166150ab` | Documentation: one security list and the threat model | `0446a3af` | `51e05596` |
| `6bfb6e16` | Documentation: each long page serves one reader | `c33faf23` | `007fd74c` |
| `810905c9` | Documentation: project records leave the reader pages | `66901151` | `0a8fbd6a` |
| `36d30002` | Documentation: each limit where the reader meets it | `30b00d22` | `3bc5767e` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | artroom-scope |
| --- | --- | --- | --- | --- | --- |
| 9 Nov 19:00 | `f3ddcc06` | `1164c6b2` | `40b77399` | `8f4a1aaf` | `aeddd822` |
| 9 Nov 20:00 | `64be0cab` | `da0fe1f2` | `744cee66` | `3046716c` | `4e97a927` |
| 10 Nov 03:08 | `c9055184` | `d032ad10` | `d0332773` | `0ee53897` | `cd74f096` |
| 10 Nov 06:30 | `a5b82ee0` | `0f4bf609` | `00c18e8f` | `0a3730e3` | `c2149db4` |
| 10 Nov 12:12 | `8289d9e5` | `f93b240d` | `9532360e` | `6e9e2fa6` | `29fffb5f` |

Each deploy used the checked-in configuration. Health answered three times,
`POST /mcp` answered 404, the dap-demo offer named Register 26, and the J5
Site digest matched its baseline. On artroom-scope, the existing room read
the same log before and after each deploy. `19ddc868` and `f5d59983`
changed no Worker bundle and were not deployed. The documentation heads
changed no source.

## Commitments for the sprint ending 11 November, 17:00

- Land and deploy the canonical spelling head, then the last two
  typed-definition heads.
- Land the identifier test vectors and verifier, and open the cutover
  head.
- Land the first join parity head.
- Land the split of the MCP page after the canonical spelling head.
- Land the deploy command, and run the next deployment with it.
- Amend the Sequenced design note and write the Live design note.
- Half-hourly surveys, including overnight. The daily report at 17:00, and
  the worktree sweep after it.
