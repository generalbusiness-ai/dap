# Retained journal floor: implementation and reader inventory

This implements F2 of the [retained journal note](../2026-10-20-retained-journal-floor.md).
The governing request is `215e3b46ce59c4f9808f9d14bafb3c49accfc247`;
planner decision `dc426978a799f1fe2404f54635026cee5e8d1506` resolves
the five policy questions in `6febb25afa0e10d9959bcd3e148283093769a592`.
Its adoption is recorded by `a265a27a83aec9d375048f26d8eaa00364a9c17b`.
That decision qualifies the earlier note's wording about state digests,
pending requests, completed creates, transitive references and folded rows.

The implementation adds no deployed floor policy. A floor offer needs an
explicit reviewed archive policy with `floor: {margin, minimum}`. The scope
offers it from the existing alarm after a confirmed v2 archive pass.
Members have no floor act or RPC. F3 production enablement remains separate.

## Storage and judgment

The shared judge validates the receipt's held entry, advancing floor, step,
age, window, writer keep list and resulting kept bound. The writer checks
its confirmed archive row and bookkeeping. Offline replay checks the exact
clone commit and its scope, incarnation and `through` head. A floor receipt
does not grant authority or establish provider custody by itself.

The existing sealing transaction migrates accepted keys and request hashes,
records size proofs, deletes eligible entry payloads and records the floor.
The floor entry is an ordinary new entry above F. Counted entries are the
held tail plus the kept set; native storage also exposes a direct row count.
The existing byte, key, reservation and deadline limits stay in effect.

Each accepted actor/key identity migrated from a deleted act costs
`256 + UTF8(idempotencyKey).length` logical bytes, exactly once. Actor is
part of the identity. A later floor does not charge it again. Entry bytes
lose only their journal source; retained byte domains keep their existing
deduplication and charges. Native SQLite and replay use the same price.

Moving an accepted key or request hash preserves the complete logical row.
A floor entry changes the head, time and floor/proof metadata, so its full
state digest can change. Native and replay must agree on that complete
digest at every position; no digest field is omitted for this comparison.

## Typed references that keep entry payloads

`stateKept` follows the roots below and their typed reader closure. The
closure starts at both kept roots and the live tail. It never follows
`prev`, arbitrary numeric values, remote positions with the same number,
or a stale incarnation. Retained foreign entry copies must correlate with
the recorded fact's full scope, position and hash before their causal
references are followed back into this scope.

| Reference kind | Actual reader or reason |
|---|---|
| Genesis, position 0 | Core definition/creation reads, scope activation, signed reads and archive pin |
| Pending operation opening, opened attempts and outcomes | Operations driver and outcome settlement read the opening and its attempt history |
| Sending position of every `pendingRequests()` row, including `delivery-unavailable` | Delivery result clauses still need the sending entry; only `undelivered` is terminal without a result |
| Applied create sending position | A later applied result from another incarnation must still run the existing create-conflict path |
| Live item opening | Item identity and current item readers |
| Own item/fact fields, including nested lists and records, of a live item or retained act | Declared field readers; a local numeric fact and a full own fact both name entry positions |
| Live `hold@1` root record position | Hold retirement reads the recording entry's time |
| Prepared position | Preparation/step readers |
| Outcome operation ID and diagnosis `of.seq` | Operation settlement and diagnosis readers |
| Genesis `source`, delivery `from`, result `message.of.from`, and recorded fact uses | Creation, application installation, delivery clauses and causal ancestry |
| Retained foreign genesis source back into this scope | Register claim discovery follows delivery 3 to the retained Directory genesis, then Register outcome 2 and signed claim 1 |
| Live destination publication reservation and token operation; operations attached to a live destination holder | `pushesOf`, `mintRevoked`, `stagedOwn`, cleanup, first-head recovery and receipt readers follow prior mint/read/write histories |
| Import operation openings while a directory import is unresolved | Directory `import-spent` walks opening effects, then reads attempt counters from operation state |

The register chain above was a real failing native witness before closure
was implemented. Keeping discovery 3 alone left its own outcome 2 absent,
so activation could not rebuild the claim index. The failed run and its
original assertions are preserved separately from subsequent checks.

The writer adds unacknowledged sends, local signer control anchors/latest
signer entries and discovered claim delivery positions. Signer rows are
selected for each candidate prefix; more than 1,024 actors entirely in the
live tail do not block a floor. If the recorded keep list exceeds 1,024 or
the derived closure exceeds 4,096, the writer lowers F and recomputes. The
judge refuses an over-bound offer with the existing floor refusal. No cap
is raised.

## All ten folded row kinds

The planner decision requires entry retention only when a current reader
follows a position to its entry. The row itself remains complete when its
position serves as an identity or counter. Other roots above can still
require the same entry independently.

| SQLite folded kind | Position fields and readers | Entry retention from this row alone |
|---|---|---|
| `relation` | Owner/item/revision identify a related item and its latest relation state | None; state comparison uses the stored values. Remote owner positions stay remote. |
| `creation` | Applied-result delivery position and remote incarnation identify a held creation | None; creation bookkeeping reads the row. Applied-create request roots independently retain the send. |
| `observed` | Observed scope and sequence order retained observations | None; ordering and equality use the stored observation. |
| `holder` | Local item ID addresses held work and capacity | None; a live item independently retains its opening. |
| `account` | `(seq,n)` identifies the request; `item` identifies its holder | None; accounting reads identities/Amounts. Pending/create roots independently retain sends. |
| `texts` | Item/slot identify digest history for redaction | None; redaction reads the digests, not prior entry bodies. |
| `keyed` | Type/slot and aggregate count contain no entry positions | None. |
| `capacity-request` | `(seq,n)` addresses request Amount | None for a completed request; its exact identity/hash/Amount remain readable below F. |
| `capacity-item` | Item and duty item IDs address capacity duties | None; live-item roots apply separately. |
| `capacity-holder` | Settled item ID and boolean record released capacity | None; settled identities remain numbers after their payloads archive. |

## Reads and offline continuation

An archived entry answers with the current floor receipt. Kept entries
remain readable. History/log from below F return `archived` with a next
cursor of F; subsequent pages cover the dense live tail. Historical scans
that need kept entries use the sparse position port. Directory import and
destination readers no longer interpret an archived gap as missing state.

Accepted retries preserve intent-digest equality: the same archived intent
answers `archived`, while a different intent reusing the actor/key is still
`idempotency-mismatch`. Completed non-create request rows preserve their
source hash after payload deletion. Inbox rows preserve the old deciding
receipt so an exact stale delivery repeat does not decide or send again;
a different source hash is refused.

Size proofs retain their proving sequence. A proof at 200 cannot bind a
decision at 100. An earlier proof at 50 can. Replay captures the floor and
proof view at the judged position, even when its clone holds future bytes.

The client tail helper uses a caller-owned clone refresher. It verifies the
receipt descriptor and the exact through-entry hash before using refreshed
entries, and retries a moving floor at most three times. It does not fetch
a URL from a receipt or upgrade authority. The replay live source composes
the verified clone with the service tail under the existing work bounds.

## Witness boundaries and current validation

| Note witness | Focused evidence |
|---|---|
| 5: choice of F | `derive/test/floor.test.ts`; native `scope/test/floor-archive.test.ts` |
| 6: judge rules and direct deletion count | `scope/test/floor.test.ts`; exact kept cap in `floor-kept.test.ts` |
| 7: verifier receipts | `replay/test/floor.test.ts` and `archive-git.test.ts`; foreign native receipt in `scope/test/floor.test.ts` |
| 8: capacity and retained charges | Native `floor-archive.test.ts` and `floor.test.ts`; pure/replay migration and admission boundaries |
| 9: kept operation/request/fact and carried input | Native `floor-roots.test.ts`, `floor-requests.test.ts`, `floor-signers.test.ts`, and `floor-platform-readers.test.ts` |
| 10: transport ACK timing | Native cross-scope `floor-requests.test.ts` |
| 11: signers and claims | Native `floor-signers.test.ts`; prefix cardinality regression in `local-signers.test.ts` |
| 12: size proof sequence | Native `floor-size-proofs.test.ts`; replay `decisions.test.ts` |
| 13: reclaim closed origins | Native `floor-roots.test.ts` |
| 14: accepted keys | Native `floor.test.ts`; replay `floor.test.ts` |
| 15: completed request100/result150 | Native `floor-requests.test.ts` |
| 16: archived answers | Native `floor.test.ts` and `floor-requests.test.ts`; replay archived admission control |
| 17: client continuation and moving floor | `client/test/journal-tail.test.ts`; current receipt after native eviction in `scope/test/floor.test.ts` |
| 18: replay and digest | Replay `floor.test.ts`/`live.test.ts`, plus native `floor-requests.test.ts` checkpoint comparisons |
| 19: no-floor behavior | Existing capacity, archive and replay checks in the coordinated final gate |

The focused tests state their boundaries in their opening comments. Native
tests use actual scope turns, SQLite and eviction; every padding checkpoint
is genuinely judged. Fixture platform rules and actor/reader/provider ports
are labelled. Test-authored receipts do not prove archive custody. The
alarm/archive tests use the real archive driver and hash/pack machinery,
with explicit HTTP/token peer stand-ins.

Replay receipt tests use a real local Git repository for exact-commit,
missing-commit and mismatched-head checks. The native cross-scope digest
witness saves full native journals before pruning and supplies an explicit
receipt-descriptor stand-in. That witness does not establish local Git
custody. Pure proof-consumer tests are separate from the native cold-reader
witness.

Implementation-stage results and the original failures are recorded under
builder promise `8fc9f8624b3cae129f04ae1c22f05cf21653d7b1`. Eight focused
native cases now pass: both floor/price cases, signer/claim recovery,
50/200 proof ordering, operation/fact reclamation, both cross-scope request
cases, and real platform install/destination readers. The passing corrected
cases have exact before/after source, dependency and tool correspondence;
the earlier failed runs are preserved. Chained-session reads use the
existing `entry` and `retained` authority; they do not gain `summary`.

The exact kept-cap and signer-cardinality regressions also pass. Both
initial history attempts completed the 29,000 signed-input prefix and then
stopped at a fixture guard of 128 alarms, before any floor assertion.
Those failures remain preserved; their last confirmed position was not
captured. The measured first alarm of a 4,800-input
backlog confirms through 30 under the original budget, so 128 alarms was
an unsupported catch-up assumption rather than evidence of zero progress.
The corrected loop permits at most one alarm per remaining entry and
requires strict confirmation progress at every alarm. It follows actual
durable alarm times and retains the original per-pass bounds and 600-second
test deadline. The small floor-enabled prefix also confirms without writing
a floor.

The corrected history witness passes. It confirms the 29,000 signed inputs
in 717 archive alarms, all before the 900-second floor age. After reaching
30,000 entries, five floors advance to 4,096, 8,192, 12,288, 16,384 and
20,004. The next floor waits for the original 1,000-position target rise,
then reaches 21,004. Held row counts and the complete state digest agree
across eviction. This native run exited successfully in 120.30 seconds.

The capacity witness also passes. A scope without floors reaches exactly
2,000 entries using genesis, 1,998 signed remarks and its genuinely judged
closing checkpoint, then refuses another remark. With floors, 10,000
protocol inputs complete: 9,998 signed remarks, one checkpoint and genesis.
After 205 archive alarms, the floor is 8,353, the head is 10,015 and 1,664
entries remain held, including after restart. The 200-position margin,
500-position minimum rise, exact 2,000-entry bound, original archive prices
and caps, and 600-second deadline remain unchanged. This native run exited
successfully in 44.90 seconds.

Two earlier capacity failures remain preserved. The first fixture tried to
fill the checkpoint reservation with an ordinary act. After that correction,
the driver confirmed through the checkpoint at 1,999 but refused its first
floor entry at 2,000 as unavailable. Header classification, privacy cost
forecasting and journal consumer serialization each had a closed input
vocabulary missing `floor`. Those three vocabularies now accept this native
input. A focused descriptive selection and scalar-price test also checks
that unknown inputs still fail closed; it grants no privacy or custody
claim. The successful capacity run exercises actual post-floor archive
continuation under the original work bounds.

The focused passing native runs have exact source, dependency, tool and
lock-stamp guards. Raw failures, alarm times, per-pass counters, natural
exits and corrected outcomes remain under the builder promise. These results
were completed at checkpoint `3fc5fcb4`, before private integration with the
landed F1 base and D2 citation check. The combined exact-head full gate and
review are still pending; focused checks do not stand in for that gate.

The first joint gate stopped at typecheck before Vitest: the page answer
renderer lacked the new archived variant. The follow-up adds an explicit
archived message with the original fact, archive commit and through hash.
Page redraw and submit fences keep that result unresolved until the archive
is verified; they invoke no accepted callback and sign no replacement.
CLI generic acts and commands requiring a receipt return exit code 1, as
for an unknown outcome, with the same original-envelope guidance. The local
development HTTP adapter uses the existing Worker status 410. Four focused
page/CLI source and test compilers pass. Five scripted Node cases cover the
formatter, mounted shell handlers and CLI command boundaries; affected
formatters also pass after their final hash/incarnation wording. These are
explicit fixture replies and a minimal DOM, with no browser, native scope,
clone verification or custody claim. The original gate failure, an additional
CLI compiler finding and a pre-collection test-harness failure are preserved.
The corrected joint full gate and formal review remain pending.

The next joint gate ended naturally with 2,103 passing cases, five failures,
three skips and no unhandled errors. All 649 native cases passed. Three
failures came from the raw Node replay executable loading a writer barrel:
Node rejected a parameter property in `journal-v2-tree.ts:64` before the
command ran. Replay now imports the existing `journalId` binding through
the existing reader entry point, which already used it. No validator is
copied, and no package export, dependency or lockfile changes.

The other two failures found stale generated page and MCP resources. The
maintained page and MCP generators now update `apps/room/page/assets.ts`
and `packages/mcp/src/views/generated.ts`. Their generation pass changed
only those two tracked outputs; dependencies, tools and lock stamp stayed
exact. The omitted generation step and the original failed gate remain
preserved.

Source review also found an MCP propagation gap that those tests had not
covered. Settlement now preserves an archived read as its own typed custody
outcome, including a fact only when the scope supplied one. It does not
construct a native mandatory-fact Answer or a receipt from that read.
Archived custody remains terminal across reopen and deliberate resubmit.
Act, creation, join and application-install consumers return its location
without a new signature, dispatch, package fetch or accepted callback.
Hosted enrollment answers 410 before receipt read-back, standing observation
or bearer issuance. Settlement and error prose identify the archive and
require verification, without claiming acceptance or suggesting a resend.

Ten affected compiler configurations pass across the two focused stages.
Thirteen focused Node cases pass, including the five gate failures, exact
floor-commit reads, actual file-custody reopen, scripted settlement projection
with an absent fact, and retained-install continuation. The install fixture
starts with an explicitly kept envelope; it proves no package preparation or
native admission. An independent source-only reviewer found the missing
install consumer during this correction and reviewed its fix and the hosted
guard. The first focused MCP compiler failure is preserved. The final focused
run's source, dependency, tool and stamp guards are exact. These results do
not replace the corrected combined full gate or formal review, both pending.

The gate at `06bda121` was interrupted at 22:03:48 after an observed direct
fixture Git command stalled on standard input. Its natural exit status is
null; it received SIGTERM (15), and the wrapper exited 2. All 2,730 source
and 5,530 dependency guards stayed exact. The reporter recorded 1,461 pass
events and one skip, all nonterminal. No native result was recorded; downstream checks had
not run. This is an interrupted run, not a gate pass.

The coordinator supplied the sealed V5 metadata: descriptor
`/private/tmp/artroom-f2-d2-final-gate-v5-seal-20261021/closed-descriptor.json`,
888,774 bytes, mode 292 (`0444`), SHA-256
`047e9ff4aa141089e732cf486dc4f96d81e58bb4959631831d7de30f0477a18d`.
Its failure report, `gate-report.json`, is 10,028 bytes, mode 420 (`0644`),
SHA-256
`64344b04c9b41a05a64476ed2d14302be586418330f8b59b11a1ffc355b8745a`.
Those original artifacts remain frozen.

The test repository helper now bounds its direct `execFileSync` Git calls
with the existing `GitProgram` allowance of 30 seconds and `SIGKILL`. There
is no catch or retry, and no archive or Vitest limit, deadline or price
changes. A stalled direct Git call now fails visibly; its underlying cause
remains unknown. In a fresh disposable repository, the updated helper's
`hash-object -w` against a FIFO with no writer returned `ETIMEDOUT` and
`SIGKILL` after 30,001.65 ms. Its exact direct child was absent (`ESRCH`)
afterward. The fixture was abandoned after the kill. One existing real-Git
positive case also passed. Raw error fields, timing, and exact source,
dependency, tool and stamp guards are retained. No earlier unbounded helper
or frozen gate original was executed for this control. A clean corrected
head still needs the coordinated full gate and formal review.

The later joint gate at `15ef7921` passed: 2,111 cases passed, three skipped,
with separate Node blocks of 7, 33 and 55 passing. Its source, dependencies
and evidence remain frozen. The checker then requested one correction in
`10837536`: the kept set could claim an opening payload that an earlier
floor had already removed. That passing gate did not witness this case.

The new distinguishing case uses actual Native turns, SQLite and eviction.
Its declaration, authority, reader and clock are fixtures. It saves the
same genuine journal before each prune and replays those bytes through an
explicit test receipt-descriptor port; this supplies no Git custody proof.
Floor 50 removes final item 1's opening. A fresh accepted act at 152 puts
item-ref 1 on live item 0. Floor 200 explicitly keeps that act. Under the
old logic, both kept sets included 1 although SQLite had no payload there:
the native read returned `not-found`, its local fact was refused as
`fact-mismatch`, and the complete clone exposed entry 1 again. The case
failed its kept-set assertion after recording both observations. The pure
missing-held-root control also failed under the old logic.

The correction masks journal reads and walks against the previous floor
before platform and causal traversal. A typed item identity may still name
an archived final item, but cannot restore its opening payload. A required
payload root that is archived or missing makes derivation unavailable:
the writer offers nothing, the judge writes nothing, and a bypassed fold
throws within its transaction. Historyless semantic analysis retains its
prior behavior. SQLite checks every proposed kept position against its
already-loaded bounded entry rows before its first mutation. There is no
new wire reason, blanket folded-row retention, price or limit change.

The corrected case passed: after restart, the folded final item and live
reference still name 1, native and replay kept sets are `[0, 152]`, stored
entry 1 is absent, its read returns the current archive receipt, and its
local fact is refused as `archived`. The complete clone's sparse reader
also hides 1. Replay of the same saved Native journal is consistent, and
its complete checkpoint digest equals native storage. The pure control
passes for missing required payloads, a platform hook given masked reads
and positions despite a complete clone, and an explicit keep that tries to
restore an archived payload.

Raw source copies, dependency and tool guards, logs and natural exits are
retained under `/private/tmp/artroom-f2-monotonic-control-20261021-v1`
through `v4` and `/private/tmp/artroom-f2-monotonic-fixed-20261021-v1`
through `v2`. The initial fixture index-access compiler failure, root
reporter startup failures, missing nonfinal-state fixture guard, and later
hook-fixture typing failure remain separate from the meaningful old-logic
failures. The final focused run passed six remaining compiler configs,
one Native/same-journal replay case and one selected pure case; the two
other pure cases were unselected. The unchanged derive source compiler's
earlier pass is retained. All 2,726 source files and 5,530 dependency
entries, tools and lock stamp stayed exact during the final run. Independent
source-only review of `a7fd01e0` found no concrete blocker; it supplies no
runtime or formal approval. These observations came from a shared machine.
A short Slice9 compiler was allocated during collection preparation; the old
v3 runner had already launched when the hold message arrived, so overlap is
not excluded. The corrected v2 run followed Slice9's explicit Native slot
release. These timings describe the recorded runs, not isolated benchmarks.
The corrected integrated head still needs the
coordinated full gate and guarded review. No unchanged suite was repeated
here, and the submitted candidate and V6 DATA were not changed.

The actual Room A count of applied-create sending entries retained at F3 is
an operational measurement for the planner. This change neither queries
Cloudflare nor substitutes a fixture count for that measurement.
