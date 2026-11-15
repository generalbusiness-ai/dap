# Custody imports and file-store contention

NF6 request `9ca6177725e71bab1741ea8dd8c5ad63401e855d`, promise
`60680427a8544dfea8a1db24d3cd512974bf16d9`, and ruling `cb6e8523`
remove NF3's temporary MCP custody aliases after NF5. NF8 request
`0a0da4cad3b711da66c559675ca42ec13dad1a8d` and promise
`d549e07995dd20b90aaf9171d9dbe77de142bb75` add the contention witness
and correct the retired-browser wording from review `b6e9f538`.

The original source starts at actual NF5 main
`57f887ce066448133d0bd0fe611d0935cc6eb0ed`, tree
`5ad88394b9dfc03ec2be385239ffff63d58900e9`.
Fresh branch `builder/nf6-nf8-on-c3-sh1-source-20261115` preserves NF6/NF8
head `bd4ce55857d5158b8be76f581a5d6da7c7587b3a` and merges actual C3/SH1
main `4b198d0fc980327d87347b05a3817106974bf8d7` in
`43d2772`. The normal merge has no conflicts. The three overlapping paths
are additive: `docs/cli.md` retains the lease advice and signed/open-version
policy; `browser-request.ts` retains both independent changes; MCP's
`errors.test.ts` keeps the direct client imports and incoming whole witness.
Old worktrees, refs, dependency views, and evidence remain intact.
The integrated source is **UNCOMPILED and UNRUN**. The MCP index seal
computation/adoption, normal canonical comparison, affected development
checks, browser checks, and gate remain owed at root's permitted slot.
No dependency copy, import, AST computation, or project check accompanies
this integration. No release identifier or packet changes.

## Published tooling and FH-2 source composition

Origin act `8995ec247402c4c504fcdbf580a6e9171b5d5547` names published main
`17a917cd73b0528dcf8d2610707c1b3f24afbeaa`. Normal merge
`62205ca2193a9c6ec23579dfc5ae236b5712f52d` takes that actual main on
preserved NF6/NF8 source `1bd8a2c76eaaef18686ba592163b8474d2de5cef`.
Normal merge `16cf270d3b3566f8d90add8e644323f9b1ca8f59` then takes reviewed
FH-2 source `2ccff00a418494b0a85e9215cfab235b302293cd`.
Neither merge has a conflict. The 61 NF paths overlap neither the 22 incoming
tooling paths nor the six FH-2 paths. FH-2 starts at that tooling main and
keeps its intended conditional-check changes.

FH-2 request `efdebe55` and promise `8d8c4c3f` ride this combined head;
[its note](2026-11-15-fh2-staged-hook-checks.md) retains the source boundary.
All three requests keep their separate promises. The existing authentic
8b2 dependency view stays in place; all 17 package/lock metadata files
retain their setup bytes. This composition copies or installs nothing.
The MCP index expectation remains untouched and its computation/adoption
remains UNRUN. All combined development checks, canonical comparison,
browser checks, gate, and review remain UNRUN. Hook activation stays with
the planner after landing.

## One home for the custody names

NF6 removes the 35 obsolete NF3 names: 16 root values, 12 root types,
five Node values and two Node types. Their 52 import sites across 50
consumer files now use `@generalbusiness/dap-client` or its `/node`
entry directly. Mixed imports keep their MCP service names, local
aliases, type-only status and dynamic-import behavior. The real NF5
Native custody adapter stays in place.

The MCP SQLite module also drops its otherwise-unused `OUTCOMES_INLINE`
import and re-export. Leaving that export behind would preserve the alias
through MCP's export-star. No SQLite statement or storage behavior
changes. NF4's `Reads`, `ReadSessions` and `ReadPort` remain outside NF6.
MCP's Node entry keeps its actual local `fileStore` import and service
wiring. The NF3 note retains its historical results and names NF6 as the
alias-removal lane.

The MCP index source seal remains **OWED**. Its existing expectation in
`scripts/security-entry-points.test.mjs` stays untouched. Root must review
the changed entry and compute/adopt that seal in a later authorized AST
slot. This source checkpoint computes no substitute and claims no seal
or security-owner pass.

## A send can stop at the shared lease

NF5's `Custody.#dispatch` enters the store's existing exclusive section
before invoking delivery. The Node file store uses `capacity.lease` there.
If a live process holds it beyond the existing ten-second wait, custody
throws `locked` after the envelope was persisted as `sent`. That phase
does not prove delivery or an outcome.

One added case in `packages/client/test/custody.test.ts` uses an actual
parent process and child sharing one real file store. A delegated write
first persists `sent`, then starts the child and waits for its ready
line from inside real `store.exclusive`. The parent reaches the unchanged
production dispatch fence and lease timeout. The source asserts locked,
zero deliveries, one build, one signing, no outcomes, and unchanged full
envelope bytes. The child holds until a stdin release message, not an
arbitrary sleep. Existing child modes keep their behavior. The parent
waits for child stream closure before reading the final captured output.

After release, a new Custody instance reopens the same store and uses the
ordinary same-key, same-meaning send path. Its builder throws if called.
The delivery must receive exactly the kept full-envelope bytes once.
A terminal repeat must return the kept accepted answer without building
or delivering again. Finally blocks restore the delegated write and
release/reap the child. The production lease wait, lock/reclaim rules,
Custody implementation and file-store implementation do not change.

The fixture uses a real TEST signature and scripted acceptance, as the
existing custody owner states. It tests real process and file contention,
Custody dispatch and recovery, not a remote scope's acceptance, HTTP
transport, browser durability or hosted authority. Any observed lost or
doubled send must go to the planner before a lock-rule change or an
assertion change. Source review alone supplies no such runtime result.

`docs/cli.md` explains the retained application-install `--request` path;
it does not generalize retry advice to generic commands that sign again.
`docs/mcp.md` explains that shared capacity contention can produce the
current locked words even when another identity holds the lease. Both
preserve the original home, key and arguments. Settle reads an outcome;
an ordinary retry sends the kept envelope. A phase, deadline or lease
time supplies no permission to discard records or remove a living lock.

## Retirement words describe what is known

`RETIRED_REQUEST` still says that the room retired and the browser removed
its old request slot. It drops only “Nothing was sent.” A legacy sent or
unknown envelope may already have left before cutover. The existing join
retirement case now carries both phases, keeps the clear and no-current-
send assertions, and still permits a fresh invitation afterward. Counter
and Lending reuse the same constant. No record migrates or changes shape.

## Validation remains owed

Only source reads, import searches and diffs accompany this checkpoint.
It installs or copies no dependency, executes no project code, and changes
no package metadata, producer input, presentation ID, packet, trust row
or signature. Later package reproduction belongs to the actual composed
release plan.

| Check | Owning boundary | Result |
|---|---|---|
| Compilers | Actual affected client, MCP, scope, CLI, page, view and example contexts after source review | UNRUN |
| File-store witness | Whole client `custody.test.ts`, including its real child | UNRUN |
| Retirement wording | Whole client `browser-joining.test.ts` | UNRUN |
| NF6 callers | Owning MCP, Native scope/CLI/page and maintained Node example owners from the reviewed inventory | UNRUN |
| Browser helper callers | Existing declared-member and owned-scope workflows | UNRUN |
| MCP entry seal | Root's later reviewed source computation/adoption, then whole security owner | OWED; UNRUN |
| Final gate and review | One combined head at its permitted queue position | UNRUN |

Run ordinary development checks after root grants their slot, with the
maintained compatibility prerequisite before direct Vitest. Counts come
from actual runs. The gate and checker review remain owed under both
existing promises. This checkpoint authorizes no push, landing,
publication, signing or deployment.
