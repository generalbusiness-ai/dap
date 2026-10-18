# Archive fixture milestone: clone, disconnect and verify

Request `432f26b31c9c8d11db48c8584c8183da5bed673d` commissions the
fixture-only A2/A3 milestone. Its two implementation children have passed
independent exact-head review and local landing. This note reconciles
their evidence. It adds no runtime behavior or real-room archive policy.

| Slice | Reviewed head | Gate | Approval | Durable local receipt |
|---|---|---|---|---|
| A2: Git source and disconnected replay | `f6e94550ecbde2f60042e9a74f75680e7000d995` | `d45a34441433c2fcc8d7830e5f1c3f1949b55540` | `b4d40d317aa699ba6e544a4c12981745acd91771` | `b205e1ebf33b90de60f34201024c133a1e1b2197` |
| A3: fixture-native writer and guarded adapters | `b02e05adc3bb39e8569eb271c1f28b59ae8fd27e` | `8c5f251fc74cee583121bb7039eff79727a3625b` | `209b4fd39efd02e52867f2773cab2893dc41dc60` | `d1cb04f9ca1f459a367cfa57438a1ea5f9dde5e6` |

The full implementation and evidence limits are in
[the A2 note](2026-10-18-archive-a2.md) and
[the A3 note](2026-10-18-archive-a3.md). The table names durable workroom
receipts, which are different from Git merge commits.

A2's complete 35-path Source was reviewed before its local landing at
Main `0e63ba9296fc5392510fa14a626c1294efe2450a`. Independent audits
`673980c99c4985da48eedc39e1d944b073231997` and
`7499fa9d7b6f482580de812d4c9df239147e2c4a` reconciled the landing.
Planner publication is recorded in `21e9ec61a751fe5a4f1b092fad5288414e9364c1`.

Its real disconnected SHA-1 and SHA-256 clones replay all four judged
dependency cutoffs without a service or anchor. Native HTTP and archive
reports agree apart from trust provenance. The witnesses distinguish
changed entries, a cut segment, wrong head metadata, a missing foreign
ref, unsafe journal paths and receipt positions. Snapshot ancestry stays
incomplete where the history cannot prove more. These are the milestone's
local clone, disconnect and explicit-cutoff verification witnesses.

A3's complete 22-path Source was reviewed before its local landing at
Main `6dac9c76339ece16a99275d5360818a32a4dcf4c`, tree
`c4b4c3bb808bcddc5f39fd659f4f3fe04531f8c6`. Independent post-terminal
audit `ed158607cf999f97879a50167bb64ef0573fe118`, ratified by
`4264e303e8d9f7f7b5909f79cd7545b9e764c015`, verified every one of 2,067
Git leaves against the approved candidate, all 22 fresh successors and
the absence of all 29 retired artifacts. Two broad carried wrappers
remain historical; the truncated notes wrapper is not a fresh aggregate
review. Publication is planner's separate action.

The writer witnesses use real native object storage, alarms, turns and
eviction with explicit scripted host, token and fixture-admission ports.
They cover Mark before any host object, later retained input, exact
original rebuild using only named dependencies, the next prefix on that
parent, read-back after a lost answer without a second commit, named
missing/rebuild/conflict stops, an unchanged journal head, and native
turns completing while a host is held. Actual GitHub/Artifacts adapters
check scope, repository, credential identity and journal ref after awaits
at the send boundary. Target and transport reads are bounded. A3's
offline object-store replay is not a new real-Git clone witness.

The final A3 gate passed 344 Vitest files and 1,729 cases, with one file
and three cases skipped; separate Node suites passed 31 and 55 checks.
The undisposed RPC warning, RefcountedCanceler exception, four Git HTTP
Content-Type warnings and scripted fault exceptions remain in the raw
evidence. Neither the pass totals nor this note prove a stability cure.
Earlier failed and inconclusive attempts keep their original scope.

This is the stopping point commissioned by the fixture milestone.
The default policy registry and production archive wiring remain absent.
Actual smart-HTTP adapters are SHA-1; the format-neutral scripted host
supplies the writer's SHA-256 evidence. All selected input and parent
closure must fit finite allowances; arbitrary-history fit and measured
heap bounds are not established. A0b admission, policy ownership and
configuration wait with A4/A5 and real-history permission, consent and
disclosure. No real room's history, real archive credential activation,
full ancestry or at-send retention guarantee, progress/G1, deployment,
publication or closure of the wider archive root is authorized by this note.

Only this reconciliation document changes after reviewed Main6dac.
Runtime source, tests, dependency lock and configuration are unchanged.
The existing A3 gate is retained; documentation-only changes do not repeat
it under [the testing rules](../../docs/testing.md). Exact candidate/Main
tree correspondence and this document's review/landing are recorded in
the workroom.
