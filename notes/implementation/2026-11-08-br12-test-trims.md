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

No compiler, test, control or gate has run for this preparation. The control
runner gate owns the single executable slot, and the RoomOpening item comes
next. The complete affected owners and their compiler contexts remain due,
followed by one gate before review. No cost reduction has been measured yet.
