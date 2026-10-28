# Sprint report, 28 October 2026

Status: landed; describes work that is done.

The sprint ran from 17:00 on 27 October to 17:00 on 28 October. Ten
heads landed on `main`: the 27 October report, the registered-scope
census, a room without a repository host, the room Worker run locally
with an explicit public origin, two retirements of unused entry points,
the single runtime pin with wider smoke coverage, separate rate-limit
windows for local-network clients, the command-line client under load,
and the first journey slice: a checker that runs in a container. The
three room Workers were deployed eight times each and run the 15:16
landing. A test Worker was deployed twice for the first room without a
host. The cost-of-change review is below.

## Story: a room on your own machine, with or without a Git host

An operator can now install a register and create rooms with no
repository host at all. A room created under host `none` keeps every
native scope (directory, membership, rules, destination, inbox) and
refuses the acts that need a repository (clone, edit, propose) with one
clear reason, `no-repository`, instead of failing part way. Invitations,
membership and verification work as in a published room. The host
choice is closed: `none`, Artifacts or GitHub, and an unknown host stops
before anything is signed. The first such room was created on a test
Worker and verified consistent across its six scopes.

The room Worker now runs as a local service with an explicit public
origin. One nonsecret setting names the origin the service answers for;
forwarded headers supply no identity, and a mismatched transport host
does not override it. The local project reuses the production Worker
module, its Durable Object bindings and migrations, and pins one
runtime version, which the smoke test reads from a single place and
checks against the running binary. The lending Worker now reports its
deployed version on its health route, as the other two already did.
Together these are the first self-hosting path: the same code, the same
scopes, on a machine the operator controls.

## Story: a smaller surface and an inventory the operator can run

Two entry points that no client used were retired. The production
Worker no longer exports the scope service facade; its HTTP routes, the
in-process API that hosted MCP already uses, and the Durable Object
classes are unchanged. The demo start accepts only the current wire
version with an explicit configured origin, and the extra authority
roots that an earlier GitHub integration left behind are gone. A
structural inventory of the Worker's exports is sealed in each head, so
an extra production export is refused at review rather than discovered
later.

The census gives an operator a bounded listing of every scope a Worker
has registered, each verified against the pinned register, its genesis
and its founding signature. It adds no setting, index or replay record,
and an incomplete census writes no manifest. The first census of each
Worker ran after the deploy: every scope on the grow and lending Workers
verified and ready; on the demo Worker six verified and five
unavailable, all five founded by visitors, which is the expected state
for rooms whose founders have left.

## Story: clients that hold up under load and on local networks

The command-line client keeps a private read session and reuses it,
renews a rejected credential once, and reports a rate limit as a rate
limit with the advisory delay rather than as a refusal. Verification of
a room has finite discovery and replay budgets, emits progress, and
says where it stopped. Founding a room after the signature window
validates the retained founding proof instead of re-reading the
register. A malformed handle target is refused before anything is
signed or sent, and an acknowledgment timeout says the act may still
have taken effect and points to the check that settles it. Under the
witness, a thousand entry reads used one session and made no new
session request. One proof condition was accepted as qualified: the
missing-dependency result for a second room is reported as such, and
the bounded genesis read that would settle it is a separate item.

Clients on link-local and unique-local IPv6 addresses now get their own
rate-limit windows instead of sharing one, so two machines on a local
network no longer count against each other. MCP bearer failures use the
same address keys. Routable IPv6 keeps its /64 window and IPv4 is
unchanged.

## Story: the journey begins with a checker in a container

A checker service can now run a job on its exact proposal tree in a
fresh container and sign the result outside it. The container has no
network, a read-only root, private temporary filesystems, no
capabilities and fixed memory, process, CPU and disk limits; the host
checks the image, environment, user and limits before any step counts,
and missing enforcement evidence refuses the run. The job cannot reach
the signer, the token, the run records or the host directories. A
failed check blocks the publication and the lane records it; a signed
result for another tree is refused. On this machine the container
runtime is the one in the existing Linux guest, and nothing was
installed on the host. This is the first slice of the journey plan; the
evidence-rules slice that builds on it is in progress, and two rulings
settled its remaining design questions: the room-service checker's
key is marked by the Rules scope and proven at every use, and a failed
published check opens an incident for the members who may triage.

## Story: writing a definition as typed code

Two spikes measured a typed form of the declared definition. Both
compile to exactly the bytes a scope pins: the lending library, the
live Counter and the grow site reproduce their digests, and the grow
room and the change lane reproduce theirs up to a spelling the kernel
reads alike. The second spike's surface has six patterns and the same
verbs on every subject; nine name mistakes that the data form accepts
are compile errors; a story typed from the definition runs on the real
judges and writes the scenario file the repository already pins. The
spikes also found that the contract admits two spellings of one
meaning, which gives one definition two digests; a kernel item now
makes the spelling canonical and migrates the two definitions that
carry the redundant form. Nothing of this is built yet: a readability
pass comes first, then the package, in the order recorded below.

## What landed

- `c7b7d1b8`, 27 October 17:44: the 27 October sprint report.
- `61fc3e3d`, 18:35: the registered-scope census with the admission
  repair; 25 paths.
- `248edb41`, 21:23: a room without repository publication (G1, host
  `none`); new unpublished cohort register 21, directory 20,
  destination 16, membership 8, rules 10, inbox 1; 94 paths.
- `d6967b7f`, 23:06: the room Worker run locally with an explicit
  public origin (H1); 34 paths.
- `c7c51714`, 00:03: the production scope service facade retired
  (R14, first of two); 13 paths.
- `a78e0981`, 06:02: legacy demo offers and extra GitHub authority
  roots retired (R14, second of two); 21 paths.
- `eb827cc2`, 07:33: one runtime pin, wider smoke coverage, the
  lending version binding (H1 follow-up); 8 paths.
- `e80c1428`, 08:18: separate rate-limit windows for local-network
  clients; 13 paths.
- `0881c1bc`, 11:22: command-line sessions, bounded verification and
  recovery; 45 paths, 18 commits.
- `06e4d33f`, 15:16: the real checker runner adapter (J3); 31 paths,
  14 commits.

## Deployments

All from reviewed heads, with existing settings kept; health checked
after each round.

| Worker | Version | Time | Main | Change |
|---|---|---|---|---|
| `dap-grow` | `ec26994f` | 19:31 | `61fc3e3d` | census |
| `dap-demo` | `1565378d` | 19:31 | `61fc3e3d` | same |
| `dap-lending` | `7134d122` | 19:31 | `61fc3e3d` | same |
| `dap-grow` | `cd71a290` | 21:31 | `248edb41` | host none |
| `dap-demo` | `4f4c0e16` | 21:31 | `248edb41` | same |
| `dap-lending` | `4c403c05` | 21:31 | `248edb41` | same |
| `dap-hostnone` | `bb279a3b` | 21:36 | `248edb41` | test Worker |
| `dap-grow` | `85c8b118` | 23:32 | `d6967b7f` | public origin |
| `dap-demo` | `9a535b77` | 23:32 | `d6967b7f` | same |
| `dap-lending` | `6600f29c` | 23:32 | `d6967b7f` | same |
| `dap-grow` | `977e22c4` | 00:31 | `c7c51714` | R14 first |
| `dap-demo` | `947d649b` | 00:31 | `c7c51714` | same |
| `dap-lending` | `4350c15e` | 00:31 | `c7c51714` | same |
| `dap-grow` | `4a1bf5bd` | 06:31 | `a78e0981` | R14 second |
| `dap-demo` | `a7af837d` | 06:31 | `a78e0981` | same |
| `dap-lending` | `304e98ee` | 06:31 | `a78e0981` | same |
| `dap-grow` | `2c36e573` | 08:31 | `e80c1428` | H1 follow-up, LAN |
| `dap-demo` | `b82d40ef` | 08:31 | `e80c1428` | same |
| `dap-lending` | `eeca09eb` | 08:31 | `e80c1428` | same |
| `dap-grow` | `a13dd1e6` | 11:31 | `0881c1bc` | CLI under load |
| `dap-demo` | `560ab2c9` | 11:31 | `0881c1bc` | same |
| `dap-lending` | `bfb337b8` | 11:31 | `0881c1bc` | same |
| `dap-grow` | `e8e981c4` | 15:30 | `06e4d33f` | J3 (no Worker change) |
| `dap-demo` | `61c9a595` | 15:30 | `06e4d33f` | same |
| `dap-lending` | `54dc3132` | 15:30 | `06e4d33f` | same |

First census, 19:36, from the deployed Workers: grow 11 of 11 scopes
verified and ready; lending 8 of 8; demo 6 verified and 5 unavailable
(visitor-founded). The test Worker's first room: register at cohort 21
under host `none`, six scopes consistent, refusals `no-repository` and
`host-unknown` as designed.

## Cost-of-change review

For each notable landing: the cost incurred, the alternative that
would have cut it, and whether to revisit.

- Host `none` (`248edb41`). Cost: one host choice added a whole new
  platform cohort, six definition versions, because publication state
  lives in the native definitions. Alternative: the host as a value of
  the destination's binding, so a host choice is data under one
  definition version. Revisit: decide at the next host slice; if
  Artifacts and GitHub each need a cohort too, move the host into the
  binding before the third.
- Census (`61fc3e3d`). Cost: one recut, because the census route
  skipped the edge that admits a serving scope; the owner binds the
  register pin, genesis and founding signature in a standing predicate
  that every operator read can share. Alternative: none for the
  predicate; the installed-release listing still has its own read path
  beside it. Revisit: yes, retire the listing's reader in favour of the
  census predicate, as the 27 October review already said.
- Two retirements (`c7c51714`, `a78e0981`). Cost: the second head
  waited four and a half hours between approval and landing, because
  the approval needed the requester's ratification and the builder's
  sandbox refused the merge; one observation made after the head froze
  became a separate follow-up head, refiled twice because a landing
  retires the note the follow-up rested on. Alternative: approvals and
  follow-ups rest on the request and the promise, never on an
  implementation note, and a ratified approval lets either party land.
  Revisit: yes, in the workroom rules; no code.
- Public origin and the runtime pin (`d6967b7f`, `eb827cc2`). Cost: one
  accessor reads the origin setting and every consumer goes through it;
  the second pin of the runtime version was removed. Alternative: none.
  Revisit: no.
- Local-network keys (`e80c1428`). Cost: a second key family for two
  IPv6 ranges, and one failed gate on an unrelated asset witness.
  Alternative: none. Revisit: no.
- Command-line client under load (`0881c1bc`). Cost: six outcomes in one
  45-path head, one ruling on a proof boundary, and four paths that
  overlap the paused room-naming head, which must restart from this
  base. Alternative: one head per outcome, so each lands on its own and
  the paused head rebases once. Revisit: no code; smaller heads.
- Checker in a container (`06e4d33f`). Cost: five new modules, a relay
  and an image recipe, a test bridge that changed the active-source
  inventory and failed the gate, repaired in isolation under the
  testing rule; an evidence manifest of 321,021 bytes against the
  40,960-byte advisory. Alternative: the manifest bounded to the index
  with the collection referenced by digest; the inventory test listing
  by package rather than by file. Revisit: yes, as the follow-up slice
  that also settles the four non-blocking review points: an empty run
  directory should leave a job waiting, the claim-size refusal needs
  its own name, a failing step that writes to stderr should not end as
  run-lost.
- Typed definitions (spikes, not landed). Cost: two spike directories
  before a package, and the finding that two spellings give one
  definition two identities, which now costs a kernel rule and a
  migration of two live definitions. Alternative: a canonical form in
  the validator from the first definition. Revisit: yes, filed as the
  canonical-spelling item.

## Decisions

- The production scope service facade and the legacy demo authority
  paths are retired; the GitHub port, Artifacts, metrics, the bucket,
  the console and every zero-observed route stay (`3240b82d`).
- The local celld Worker is named `dap-celld-local` and its workflow
  pins actions by commit hash (`999ffe93`); the lending version binding
  travels in the H1 follow-up, not a recut (`209d11d0`).
- A qualified missing-dependency result is accepted for the second room
  in the CLI head; the bounded genesis proof read is a separate later
  request (`9a20093b`).
- The journey's first slices go before the unstarted load tasks; the
  self-hosting items continue (`3ce7ade0`).
- Evidence rules: the Rules scope owns the room-service checker's mark
  and the key is proven at every use; no grandfathering after an
  observed rotation; the destination's refusal to count is the
  enforcement (`ed818781`). A failed published check opens an incident
  for the bounded holders of `issue.triage`, created as a nested
  successor of the landed change with a system origin (`f73805e4`).
- Six authoring and operations items are filed as builder children
  with slots after the journey slices (`a3af9cf9`, `60a1eb82`).
- The typed definition library is backed: the second spike's surface is
  the core, a readability pass precedes the package, the client handle
  and the manifest and story builders follow, and canonical spelling is
  a kernel item with a migration (`8d212c9a`, `d8b5d72b`, `d81e308a`).
- The container runtime for checkers on this machine is the one in the
  existing Linux guest; nothing is installed on the host.

## Filed

| Request | Owner | Work |
|---|---|---|
| `f51f16f4` | builder | census; landed |
| `2b5e3a07` | builder | host none; landed |
| `db60a6f9` | builder | scope service retirement; landed |
| `fe2305a2` | builder | demo retirement; landed |
| `5977cd77` | builder | H1 follow-up; landed |
| `7ee9a63b` | builder | local-network keys; landed |
| `14895240` | builder | CLI under load; landed |
| `c097372e` | builder | J3 container runner; landed |
| `a53e1464` | builder | evidence-rules first slice; promised |
| `c9d4e517` | builder | DX-A1 authoring skill |
| `1c124ebf` | builder | DX-A2 reads that wait for a head |
| `8a1bc098` | builder | DX-B1 declared refusal names |
| `44a70873` | builder | DX-C1 spans and vocabulary |
| `fd38c976` | builder | DX-C2 pure predict |
| `addbe5b4` | builder | DX-TR readability pass |
| `00c50371` | builder | DX-T1 typed definition package |
| `6f87a4e3` | builder | DX-T0 derivation consolidation |
| `d5fa31c9` | builder | DX-T2 typed client handle |
| `2ad35350` | builder | K-spell canonical spelling and migration |
| `f682cbc4` | builder | DX-T3 exact witnesses, remaining forms |
| `d49269fd` | builder | DX-T4 manifest and story builders |
| `3fb894dd` | planner | census rollout report; closed |
| `9976fbe6` | planner | host-none handoff report; closed |

## In progress

- The evidence-rules first slice (`a53e1464`), on the new runner.
- The pointing and claims design note recut (`880d9cdf`), approved
  and held before landing.
- Plan 032 draft 3, which files the J3 follow-up slice, J4 and the
  first MVP slices.
- The agentic-practice survey note recut (`c81b168d`), in
  changes-requested.

## What did not happen, and why

- Plan 032 draft 3 did not start; the day went to rulings and to the
  typed-definition filings.
- No Room A plan pass was captured; no new entries arrived.
- The self-hosting note's next section was not drafted.
- This report is late: it was written after the 17:00 close.

## Commitments for the sprint ending 29 October, 17:00

- Land the evidence-rules first slice; deploy.
- File the J3 follow-up slice and plan 032 draft 3 with J4 and the
  first MVP slices.
- Capture a Room A plan pass if entries arrive.
- Hourly surveys; the daily report at 17:00; the worktree sweep after
  it.
