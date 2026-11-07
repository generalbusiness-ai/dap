# Observation connection and refresh ownership

Status: S2 implementation and focused checks complete. The full gate, Page
browser workflow, independent review, and landing remain pending.
Request `839eaad1948b6e5bf4150a22a59f80232b7e7cd5` and promise `c5204968`
own this head. Parallel order `0d6d0fba` permits its start. The branch includes
the reviewed M4 landing `8d9080f3`.

## Each connection attempt releases its own resources

`packages/client/src/observe.ts` now gives the observation lifetime to
`ObservationConnection`. It authenticates, opens a stream, pumps notices,
renews the session, and applies the existing outage and reconnect policy.

Each `ConnectionAttempt` owns its controller, renewal timer, acquired body,
reader handoff, and termination promise. Its cleanup captures those resources.
A late opening disposes only the body that it returned. Cleanup never looks up
another attempt through the connection owner's current-attempt pointer.
`headLines` continues to own reader cancellation after the handoff.

`RefreshCoordinator` owns retained snapshots, the newest notice, the generation,
and the occupied refresh task. It checks the generation after each awaited
reply. Its refresh states distinguish an active read, a coalesced reread, and
the interval between read completion and promise-slot release. A refresh in
that last interval starts after a task yield. The task identity prevents an
old finalizer from clearing another task.

The public `observeScope` API and all state shapes stay unchanged. The CLI
`issue-wait.ts`, Page `page-observation.ts`, and Counter `browser/client.ts`
need no caller edits. Addendum `5ef7f12c` covers the regenerated
`apps/room/page/assets.ts`. Counter's existing Node witness builds its source
into scratch output.

## Existing witnesses keep their boundaries

All 21 existing observer cases pass before the added characterization. Their
assertions and deadlines stay unchanged. They cover coalesced rereads,
obsolete snapshots and context changes, cancellation during awaits, late body
disposal, same-turn abort, completion-callback refreshes, retained-head conflicts,
failed stream reads, outage fallback, and bounded reconnect backoff.

One guarantee lacked a witness: a timed-out opening can finish while its
replacement remains active. The new case holds that first opening, starts the
replacement, then releases the old body. It checks that the old body receives
one cancellation, the replacement remains current, its explicit refresh still
works, and cancellation leaves no timer. The original observer passes this case.
Omitting the old renewal timer's cleanup makes this case fail by assertion:
two timers remain where one should remain. Exact restoration passes all 22 cases.

The test uses local session, byte-stream, and snapshot stand-ins. It establishes
lifecycle ordering. It establishes no live-room authority or deployment outcome.

| Check | Result |
|---|---|
| Client source and test compilers | Pass. The test compiler also passes after the characterization is added. |
| CLI, Page, and Counter source compilers | Pass. |
| Complete observer owner | 22 pass. |
| Page observation owner | 6 pass. |
| Rebuilt Page asset owner | 1 pass. |
| CLI issue-wait scope owner | 3 pass. |
| Counter Node owners | 56 pass. |
| Original observer, new characterization only | 1 pass, 21 unselected. |
| Omitted renewal cleanup, new characterization only | 1 assertion failure, 21 unselected. |

The first CLI selector used the plain `cli` project and selected no cases.
The corrected `scope` selection then stopped before cases because the sandbox
refused its loopback listener. The owner passed with local server access.
Both unsuccessful starts remain in the evidence.

The [focused manifest](evidence/2026-11-07-s2-focused.manifest.json), SHA-256
`5e438afa739fce25bcc20d7dde5a6d495f84cbeaf2ab3c2389f59272b2150d54`,
seals 93 read-only files. It records the checked source hashes, command output,
compiler exits, complete owner reports, original-source characterization,
assertion-failing control, restoration, and startup qualifications.
