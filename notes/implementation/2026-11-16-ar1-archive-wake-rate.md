# Bound the archive driver's wake rate

On 2026-11-16 the AE-1 deployment (09:26 EST) turned on the room archive
driver on dap-lending and dap-grow. Durable Object requests rose from about
3,000 to about 250,000 an hour. Idle rooms woke 2 to 5 times a second, and
each Worker's Directory scope took about 15 calls a second. Hotfix 32866453
turned the archive wiring off at 15:45. AR-1 bounds the wake rate and turns
the archive back on.

## Why idle rooms woke

Two paths re-armed the archive wake with no bound.

**A stored wake left in the past.** After each committed act,
`ArchiveDriver.committed()` calls `ArchiveRows.signal(now)`, which stores
the wake at the commit time. Some passes return before they write a wake:

- the archive pin is not yet readable;
- `preparePolicies` throws `ArchivePolicyPending`, because the room's
  application installation is not yet active or its proof is not yet
  retained (`apps/room/archive-packages.ts`).

Such a pass set only the in-memory fallback. `wake()` returns the earlier of
the stored wake and the fallback, which was the past commit time.
`Wakes.set()` does not clamp a past time, and `alarm()` sets the alarm again
after every pass. The alarm therefore fired again at once, as fast as a pass
could finish. Each pass read installation and policy state from the
Directory scope that every room's creator chain reaches.

**A fixed one-second retry.** Before a room's first Mark, each pass called
`rows.defer(this.#later(0))` before it resolved the target. `#later(0)` was
`dispatchRetrySeconds`, one second. A missing target returned a retry at
that time, and `defer` kept no count, so the delay never grew.

## The bound

- **Floor and cap.** Every archive retry waits at least
  `ARCHIVE_RETRY_FLOOR_SECONDS` (60) and doubles with its count, up to
  `ARCHIVE_RETRY_MAX_SECONDS` (3600). Both constants are in
  `packages/scope/src/archive-driver.ts`. They replace the dispatch bounds of
  1 and 300 seconds for the archive alone. Mark attempts and capacity
  deferrals follow the same floor and cap.
- **A count of retries without progress.** The wake record
  (`archive-wake-1`) holds an optional `retries` count, at most 32.
  `ArchiveRows.defer()` takes a function of that count and increments it.
  A write that records progress drops the count: a target, a Mark, a
  confirmation or `clearWake()`. A room that cannot start its
  archive therefore waits 60, 120, 240 seconds and so on, up to an hour.
- **No wake left in the past.** After a pass that returns `retry`,
  `ArchiveDriver.run()` reads the stored wake. If the wake is missing or not
  in the future, the driver writes a backed-off wake through `defer()`. It
  uses its own small budget, as `committed()` does, so a pass that spent its
  allowance still leaves a future wake.

A pass that confirms new entries still continues at once: `#confirmed`
returns the current time when the head moved past the Mark. That pass did
work.

A deferred wake is pending, and `signal()` does not shorten it. An act in a
room whose archive cannot start therefore waits for the backoff, up to an
hour, before the archive tries again.

## The ceiling

`packages/scope/test/archive-wake-rate.test.ts` runs one idle room with the
archive wired through the production `archive` seam, for a simulated hour.
The object, its alarms, SQLite and eviction are real. The policy, target
and provider ports are stand-ins that count calls. Two cases run:

- the policy stays pending;
- the target stays missing.

In each case the room passes at 0, 60, 180, 420, 900 and 1860 seconds.
The next wake, at 3780 seconds, falls after the hour. The ceiling is 6
passes in the first hour, then at most one an hour. Each pass makes one
stand-in Directory call. A production pass makes up to about six calls on
the Directory scope: the room's birth, its creator hops, Rules,
Destination and two item queries. That is at most about 36 Directory calls
for each such room in its first hour, and about 6 an hour after.

Before AR-1, the pending-policy case passed once for each pass duration, and
the missing-target case passed every second: about 3,600 passes an hour.

## Turning the archive back on

`apps/room/worker.ts` returns to `if (!config) return deployed;`. The
planner watches the per-minute request rate for an hour after the
deployment.
