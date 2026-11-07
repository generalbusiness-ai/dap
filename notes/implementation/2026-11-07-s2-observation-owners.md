# Observation connection and refresh ownership

Status: the full gate and Page browser workflow pass. Independent review
and landing remain pending.
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


## The frozen source passes the full gate

The gate ran once at `39b996b9ac962720cedf6e8cd14f10c42fa16c53`, tree
`c72bec3dcd58a685600bfbe0f6a64b872b78467d`. Its actual `gate.exit` reads
`exit 0`. The before and after snapshots match, and no owned process remains.
The dependency lock stamp matches the checked-in lockfile. No package installed.

| Phase | Terminal result |
|---|---|
| Node | 135 pass. |
| Counter | 56 pass. |
| Plain | 4,004 pass, 1 skip. |
| Native | 1,111 pass, 2 skips. |

Every test phase completes. The report finds no contradictory record, report
error, or unhandled Vitest error. Detailed callback records remain observations;
the final framework records determine completeness. A skipped record module
has no reported duration. The evidence leaves that duration absent.

The timing command reports 1,255.36 seconds elapsed, 2,393.23 user, and 306.04
system. The separate Python monotonic interval is 1,255.442 seconds. The run
spans 18:44:01–19:04:57 UTC on 7 November. These measurements describe this run,
and establish no performance improvement or cause for an earlier failure.

The [gate manifest](evidence/2026-11-07-s2-gate.manifest.json), SHA-256
`7844c6e32200698b2b9818557e55ca7b105b5c47f4a7595a4c34160c4d475358`,
seals 15 public metadata files and records retention of all 2,299 raw files.
The raw unit has no symlinks. A PATH wrapper places only bare `mktemp -d`
output under that durable unit. The gate commands, deadlines, and pass conditions
stay unchanged.

The archive owner passes in this gate. Historical archive request `64552d40`
stays open. This result establishes no cause for its earlier failures.

## Page browser CI passes at the same source

[Page browser run 42402655252](https://github.com/generalbusiness-ai/dap/actions/runs/42402655252)
succeeds at `39b996b9ac962720cedf6e8cd14f10c42fa16c53`. It runs the screenshots,
recorded demo captures, create-room witness, and local-label witness. The
[CI manifest](evidence/2026-11-07-s2-page-ci.manifest.json), SHA-256
`ae37dcdf6370a55fb6270c8c63cdff0845233b520f4964e614fa44bff270bc1a`,
seals five files with the completed workflow metadata, workflow bytes, and
exact source-tree inventory.

After the source gate and CI run, the branch changes only this note and the
two result manifests. Source, tests, the generated bundle, dependencies, and
workflow inputs remain unchanged. The review request records both tree hashes.
The planner owns deployment after review and landing.
