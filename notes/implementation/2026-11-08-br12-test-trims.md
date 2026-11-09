# Bound the BR-12 test work

Request `02174ceb`, under Hugh's order `afdebb86`, names TC-06, TC-07 and
TC-09 in the [tech-debt review](../2026-10-25-codebase-techdebt-review.md).
This preparation changes how those witnesses reach their boundaries.

The sandbox handler accepts an optional reply-window argument whose default
remains `REPLY_SECONDS`. Production supplies its usual three arguments.
The late-header case supplies 0.02 seconds and keeps the release acknowledgement
behind its existing gate. Header expiry, retained background cleanup, one
close, one disposal and body cancellation remain the required outcomes.
The sandbox source seal changes with that parameter; every matcher and gate
assertion remains in place.

The hosted H6 case supplies an unresolved-record bound of two through its
existing custody-bounds port. Custody reads that configured store bound or
uses `UNRESOLVED_MOST`. The SQLite store defaults to 256. A new store-level
case seeds 255 synthetic records, admits the 256th through real custody,
requires the next refusal before building or signing, then settles one and
admits the previously refused identity. The file store's existing concurrent
admission cases still exercise the real bound across two processes. No
record format or stored byte changes.

The same store case also fills a configured two-record store and requires
its next refusal before building. That gives the configured count a cheap
witness alongside the endpoint case.

The HTTP owner has no fixed sleeps or polling loop. Its configuration reader
announces entry into each held snapshot. Its readers announce the expected
stream text, and the existing `streamsChanged` port announces state changes.
A wrapper observes the real Node request's abort and the real HTTP opening's
answer; it supplies neither event. The unlabelled Request in the collection
witness bypasses that wrapper's observation path. The original cases,
assertions and test deadlines remain in place.

These tests use synthetic custody envelopes and the existing stand-in scope
HTTP service. The hosted and sandbox owners retain their native runtime
boundaries. They establish no provider or deployed-room result.

## Validation

The first Node entry-point owner exited 1: ten cases passed and the source-seal
case failed. The seal still matched an earlier sandbox-handler draft. The
repair adopts the maintained parser's actual hash for the four changed lines;
every route and gate assertion stays in place. The failed launch remains in
`2026-11-08-br12-focused-launch`. It stopped before all five compiler contexts
and the 62 Vitest cases. No control or gate has run for BR-12.

The source commits sit above RoomOpening head `a6c0f804`, whose compiler,
owner, negative compiler-control and Page asset results stay separate in its
own note.

Planner ruling `c5c24191` permits one shared gate at the top of this stack.
RoomOpening comes first and BR-12 follows. Each item keeps its own promise,
note, artifacts and review request; both approvals must precede the ordered
landings. A failure must name its owning item before any repair.

At clean head `87755161`, the Node inventory owner passed all 11 cases.
The five compiler contexts and all 62 cases in the complete HTTP, SQLite,
hosted and sandbox owners then passed. The ledger reports no missing,
unexpected, skipped, retried or errored case. The process group closed, and
every tracked byte stayed equal. One outer launcher first refused before
imports because its added inventory guard included historical notes and
design files. The corrected launcher uses the maintained active-input rule.
That refusal remains failed and caused no test rerun.

One source control ignores the configured count at both custody admission
guards. The unchanged SQLite owner then fails only its new configured-count
rejection assertion at line 110; its other 19 cases pass. The driver restores
every tracked byte before classification. Its first classifier expects
`AssertionError:`, but Vitest reports the rejection assertion as `Error:`.
A separate classifier reads the saved report, verifies that exact assertion
and the restored source, and exits 0 without rerunning the owner. The original
owner and classifier exits remain 1.

The [focused manifest](evidence/2026-11-08-br12-focused.manifest.json), digest
`6bdfc9af0569606fa990247b76d8128c1fbc7a38d0b3804d37894681d6fe2c71`, seals
35 public files and points to complete private inventories for all six units.
The five-compiler/body pipeline took 30.392 seconds; that measurement excludes
the preliminary Node owner. This run supplies no comparable cost reduction.
The [Page workflow run 42558851410](https://github.com/generalbusiness-ai/dap/actions/runs/42558851410)
passed all four required commands at combined stack head `99092048`.
RoomOpening's [CI manifest](evidence/2026-11-08-room-br12-page-ci.manifest.json)
retains the run metadata, full private logs and the unchanged workflow-path
comparison. The integration of main `cf0487da` adds only the independently
approved self-hosting note.

The one shared gate passed at head
`5364d4945d8255406521752aa1dd0f4eb95fecf4`, tree
`a4b838014a3d555d02e7d0970e8e9568f9cf24a1`; its actual `gate.exit` says
`exit 0`. Node passed 137 cases, Counting 56, Plain 4,027 with one skip,
and Native 1,118 with two skips. Every stage passed. Analysis found no
contradictory record, failed case, report error or unhandled error. Every
tracked byte stayed equal, and the owned process group closed. The gate
took 1,181.749 monotonic seconds. Missing recorder duration and the 33 Node
file wrappers remain explicit in the retained report.

RoomOpening's [shared gate manifest](evidence/2026-11-08-room-br12-shared-gate.manifest.json),
digest `f7a94a2a4b9d07a6a1c89801ecd36f389a967ccdc856117baeaf8e4fa613c5f6`,
seals 22 public files and points to 2,333 private files including their
inventory. The first sealer completed the raw seal but stopped at a stale
manifest destination. The finalizer preserves that failed attempt and
finishes a fresh public unit without rerunning any test or analysis.

The final lower RoomOpening head changes only its note and this shared
manifest. BR-12 inherits that head; this follow-up changes only this note.
Every gated source and Page byte stays equal. Both separate checker
approvals remain due before the ordered landings. No live acceptance or
deployment follows from the shared gate.
