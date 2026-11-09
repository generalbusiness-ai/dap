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

The next focused check covers the five affected compiler contexts, the
complete HTTP, SQLite, hosted and sandbox owners, and the Node entry-point
inventory owner. The four Vitest owners contain 62 required cases. A cheap
source control will then ignore the configured custody count and require
the new SQLite case to fail before restoring every byte. The Page workflow
citation and shared gate remain due. No cost reduction has been measured yet.
