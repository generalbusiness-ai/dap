# Sprint report, 11 November 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 10 November to 17:00 on 11 November. Nine
heads landed on `main`. An application author now writes a whole package
with types: the definition, its views, its roles and its stories. A
security review of the whole surface found no injection path and no read
across rooms, and it named one high finding about availability. Two
design notes fix the first version of the two levels of shared order. The
identifier test vectors and their verifier are in a second review round.
The cost-of-change review is below.

## Story: an author writes a whole package with types

Three heads finish the typed-definition work that the 10 November report
listed as next.

- A definition has one spelling. A list that is empty is omitted, and the
  validator checks the spelling where an author's file enters. Eleven
  definitions that current source generates have new digests. No live room
  changes, because a room keeps the digest that it pinned. The first
  Counter definition keeps its bytes until the identifier cutover.
- The Grow, Change and Issue definitions are written with the typed
  authoring package. Their pinned digests did not change.
- The authoring package now derives the parts of a package that an author
  used to write by hand: the manifest, and the slot types, list bounds and
  defaults of each projection. A view names its source fields, acts and
  grants with types, so the compiler refuses a field that the selected act
  does not have. An author declares roles first, and the compiler refuses
  an act whose grant no role holds.
- A story states the expected outcome beside the step that causes it. The
  generator judges every step with the same judges that a room runs, and
  it refuses to write a scenario with an outcome that the author did not
  assert. Counter and Lending use this package. Their application pins did
  not change.

No room changes its behavior. An author gets errors from the compiler and
the generator that earlier appeared when a room ran the definition.

## Story: a security review of the whole surface

A review traced every entry point of a Worker, the hosted MCP endpoint,
the client and the Site reads (`79daff0f`). It follows the October review.

- It found no injection path and no read across rooms.
- The one high finding is about availability. One sender can fill the
  tables that count recent callers, which hold 8,192 rows, and the Worker
  then refuses every new caller until the window passes.
- Nine requests hold the remedies. Six are builder heads in progress: the
  caller tables, configuration, hosted MCP, the client and its tokens,
  Site reads, and the forms that ride with the cutover family. A seventh,
  on the order of checks, was withdrawn, because its remedy needs new
  kernel surface for a low finding. The last two are the next two items.
- Six security pages now state what the code does where the review found
  a difference: the admin's authority over a room's Rules, what a refused
  act shows, the reads that happen before a refusal, the hours of a read
  token, and which tools a package script can call.
- The legacy Worker `artroom-scope` now serves only the scopes that its
  index lists. Nine scopes of the operator room are listed, and each one
  verified before and after the change. A room that nobody reached since
  23 October gets a refusal, and its data stays in place. The previous
  version restores the earlier mode.

Hosted MCP stays closed on every Worker until the hosted MCP head lands.

## Story: the first version of two levels of shared order

Two design notes say what the first version of each level holds. They
change no code.

- The Sequenced level lets an act in one scope read another scope of its
  group at a fixed position. The note of 18 October had five gaps against
  current `main`. The amended note closes them: which scope creates the
  order scope, how a member answers a read at an old position, how the
  level fits the kernel's promises, the new reference shapes, and the
  source citations. It names six heads.
- The Live level holds state that needs no record, such as presence. A
  live scope writes its first entry and its creator's confirmation, and it
  writes nothing after them. Its state lives in memory, and the code that
  runs its acts is a platform service outside the kernel. The note names
  five heads.

The eleven heads follow the identifier cutover, because every reference
in both notes takes the new identifier shapes.

## Story: the MCP page serves one reader

`docs/mcp.md` is now the reference for an agent: the server, its options,
every tool and the recipes. A new page, `docs/hosted-mcp.md`, serves an
operator who runs the hosted endpoint. The measured budget figures moved
to a note. The moved words are unchanged.

## Story: the Native scope tests run as separate projects

Two gates on 10 November ended when one test project filled the memory of
its Worker process after about twelve minutes. The project is now split
into ordered functional and story projects, and each one starts a fresh
process. No gate ended that way after the split. The gate for the typed
package head passed in one observed run of about 31 minutes.

## Cost-of-change review

- The canonical spelling head. Cost: seven failed focused runs and one
  failed gate before the landing at 20:45 on 10 November. The 10 November
  report gave the cause: every digest that depends on a spelling is a
  place that the change must touch. Revisit: at the cutover, which removes
  the last exclusion.
- The typed contract forms. Cost: five failed sealed test units and one
  failed setup of the control runs, then a gate that passed at 03:10.
  Most failures were expectations in a test that named an old path or an
  old digest. Revisit: no.
- The typed package head. Cost: one static unit failed on two merge
  subjects of 101 characters, and one control run failed in the parser of
  its own controller. The same subject limit cost a gate on 10 November.
  The builder runs the commit-message check before a sealed unit. Revisit:
  the check should run when a merge commit is made, not later.
- The identifier vectors head. Cost: one whole gate, one review round and
  about five hours. The gate failed on one case, a generated module that
  was stale after the head took in `main`, and 1,130 cases behind it did
  not run. The checker's own probe then found that the Git verifier
  accepted a `parent` line anywhere in a commit header. The repair is 13
  lines with two new vectors. Three rulings followed: a lane runs the
  maintained generators after each integration of `main`, a narrow repair
  gets a focused run and one control and not a second whole gate, and the
  cheap working checks run first. Revisit: the generator comparison should
  be a script, not a habit.
- Controllers that parse a reporter's text. Cost: three failed control
  runs in this sprint. Each controller read a test reporter's output with
  its own pattern, and the pattern was wrong. Alternative: the controls
  read the reporter's JSON. Revisit: yes, with the next control harness.
- A ruling reversed in 30 minutes. Cost: one builder turn. A ruling on
  hosted MCP asked for a hint in a refusal, and the hint needed a new
  column in a table. The ruling was withdrawn, and the page states the
  limit. A ruling that adds a field now names where the field's value
  comes from. Revisit: no.
- The legacy Worker has no census. Cost: the inventory for the index
  change lists only the rooms of one local home. The Worker pins a
  register whose install key the operator does not hold, and a second
  register refuses the operator's read. The cutover retires these rooms.
  Revisit: the production Worker gets its install key and a census run at
  its first deployment.
- Deployments by hand. Cost: three deployments with their checks run by
  hand. One landing changed no Worker bundle, and a byte comparison of the
  built bundles showed that. The deploy command did not land this sprint.

## Decisions

- The production host is `dap1.generalbusiness.ai` (`7a6a2e68`). The
  planner makes the DNS record and the Worker route at the cutover
  deployment.
- The owner confirmed these defaults (`f79775db`). A member of every kind
  can leave a room in the cutover family. One drill that verifies a room
  from its archive is enough, and a restore is a later design. One trust
  row covers each application release. The admin role governs a room's
  Rules, so one admin publishes Rules alone. Hosted MCP stays closed
  until its security head lands.
- The kernel admits the first version of the Sequenced level by the
  owner's decision (`08c5ff25`), and the Live level in the validator
  (`4b5e0ec2`).
- In the cutover family, a person who controls an Agent can remove that
  Agent's member (`7505fa96`). Until then, a retired Agent holds one of
  its controller's eight places until an admin removes it (`7a537f0f`).
- The cutover family's default policy is the certified one. A person
  alone in a room states an explicit choice of zero approvers. One general
  command publishes Rules by the certified protocol, and the path for a
  person alone stays four commands (`11f4d825`, `58fafa1d`).
- On hosted MCP, an ordinary write is callable by the model only. A card
  calls only the acts that a view declares (`ec9ba020`). An operation
  whose signer retires after its cleanup committed does not resume, and
  no other signer takes it over (`63636688`).
- The address of a self-hosted `celld` is stated in the pages and not
  hidden behind a proxy (`c1d9acd3`).
- The check-order request is withdrawn (`85abcaa7`). The pages state what
  a refused caller can make a Worker read, and the bounds on it.
- One START and one END cover a run of short units with no test in them
  (`bc9fc45d`).

## In progress

- The identifier test vectors and verifier (`a30f1b67`). The final head
  passed its focused run, its control and its CI. The second review is
  next, then the landing and a deployment of all four Workers.
- The identifier cutover head, which opens when the vectors land.
- The first join parity head (`3c9a0f81`) and the deploy command
  (`b380ea8c`), both waiting for the gate slot.
- The security heads in source: the caller tables (`8bd2c9d2`),
  configuration (`c755f518`), hosted MCP (`9a053402`), the client and
  tokens (`76997ff1`), Site reads (`b4a813a1`) and the forms of the
  cutover family (`93adab52`).
- The head plan for the cutover family (`9ecd3efa`).
- One documentation head with four small corrections (`044311b0`).

## What did not happen, and why

- The identifier vectors did not land. The review above gives the cause:
  one lost gate and one review round.
- The cutover head did not open, because it follows the vectors.
- The first join parity head and the deploy command did not land. The
  machine runs one gate at a time, and the typed heads and the vectors
  held the slot.
- The live Claude and ChatGPT runs did not happen. They need one join in
  a browser on the test Worker.

## What landed

| Commit | Head | Request | Approval |
| --- | --- | --- | --- |
| `a419407e` | One canonical spelling of a definition | `2ad35350` | `98621645` |
| `73e30699` | Documentation: the MCP page splits by reader | `044311b0` | `c0a10a6c` |
| `7c061b74` | Native scope tests split into projects | `6a3a7fcc` | `345087f3` |
| `7177b87b` | Sequenced note: amendment, first version, six heads | `ffbea8ed` | `0e8efdee` |
| `9f3338ff` | Live level note: first version, five heads | `bf1992ae` | `75c8db47` |
| `43acea3c` | Typed contract forms: Grow, Change and Issue | `f682cbc4` | `18be53f9` |
| `74c958d0` | Security pages after review `79daff0f` | `bc50fc0c` | `ebf6421c` |
| `ce516e9b` | Typed packages and judged stories | `d49269fd` | `9f20f24b` |
| `ab802614` | `artroom-scope` serves only indexed scopes | `fa21cfa5` | `cf8e5b87` |

## Deployments

| Time | Main | dap-grow | dap-lending | dap-demo | artroom-scope |
| --- | --- | --- | --- | --- | --- |
| 10 Nov 20:49 | `a419407e` | `3c064f49` | `69ae2874` | `153f9a3e` | `fefa9258` |
| 11 Nov 05:21 | `74c958d0` | `586829c7` | `c3e486eb` | `dd422756` | `fa9d6f64` |
| 11 Nov 09:30 | `ab802614` | not deployed | not deployed | not deployed | `8415cc71` |

Each deploy used the checked-in configuration. Health answered three
times, `POST /mcp` answered 404, the dap-demo offer named Register 26, and
the J5 Site digest matched its baseline. The 09:30 deployment changed one
setting of `artroom-scope`. `ce516e9b` changed no Worker bundle: the built
bundles of dap-demo and dap-grow at `ab802614` are byte-equal to the ones
at `74c958d0`. The two design notes and the MCP page changed no source.

## Commitments from the 10 November report

| Commitment | Result |
| --- | --- |
| Land and deploy the canonical spelling head, then the two typed heads | Done |
| Land the identifier vectors and verifier, and open the cutover head | Not done. The vectors are in a second review |
| Land the first join parity head | Not done |
| Land the split of the MCP page | Done |
| Land the deploy command, and run the next deployment with it | Not done |
| Amend the Sequenced note and write the Live note | Done |
| Half-hourly surveys, the daily report and the worktree sweep | Done |

## Commitments for the sprint ending 12 November, 17:00

- Land the identifier vectors and verifier, and deploy all four Workers.
- Open the identifier cutover head.
- Land the first join parity head.
- Land the deploy command, and run the next deployment with it.
- Land the caller-tables security head.
- File the six Sequenced heads and the five Live heads when the cutover
  head is in review.
- Half-hourly surveys, including overnight. The daily report at 17:00, and
  the worktree sweep after it.
