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
  allowance still leaves a future wake. If the stored wake is in the future,
  the in-memory fallback takes that wake, so it never fires earlier.
- **A pass that is not due reads only the wake index.** Every scope alarm
  runs the archive, whichever owner set the alarm: outside effects,
  dispatch retries, credential expiry and signer maintenance. After the
  terminal check, a pass reads the stored wake index, about 256 bytes of
  local SQL. A future wake returns `retry` with that wake and calls no
  policy, target or provider port. A missing, cleared, due or stopped wake
  continues to the full pass.

A pass that confirms new entries still continues at once: `#confirmed`
returns the current time when the head moved past the Mark. That pass did
work.

A deferred wake is pending, and `signal()` does not shorten it. An act in a
room whose archive cannot start therefore waits for the backoff, up to an
hour, before the archive tries again.

A cleared wake still runs the full pass. On an idle room, that pass is how
the archive notices work that no act signalled: a revoked policy or removed
trust, which stops the archive, and a stored-row migration after a
deployment. A first version of AR-1 also returned `idle` on a cleared wake
without a full pass. It failed 17 archive tests of exactly those kinds, so
this head keeps the full pass.

## The ceiling

`packages/scope/test/archive-wake-rate.test.ts` runs one idle room with the
archive wired through the production `archive` seam, for a simulated hour.
The object, its alarms, SQLite and eviction are real. The policy, target
and provider ports are stand-ins that count calls. Twelve cases run. The
archive either has a pending policy or a missing target. Each starts with
no wake or with the wake that the code before AR-1 left: a deferred
one-second retry already in the past, with no retry count. The live rooms
hold such wakes when the archive comes back on. Each runs in three modes:

- `evicted`: the object restarts before every wake, so only stored state
  carries the backoff;
- `resident`: the object stays in memory, so the in-memory fallback takes
  part;
- `other-alarms`: the object stays in memory, and another owner's alarm
  fires every 30 seconds between the archive's wakes. Each of those passes
  must call no port and must leave the alarm at the archive's stored wake.

In each case the room passes at 0, 60, 180, 420, 900 and 1860 seconds.
The next wake, at 3780 seconds, falls after the hour. The ceiling is 6
passes in the first hour, then at most one an hour. Each pass makes one
stand-in Directory call. A production pass makes up to about six calls on
the Directory scope: the room's birth, its creator hops, Rules,
Destination and two item queries. That is at most about 36 Directory calls
for each such room in its first hour, and about 6 an hour after.

The same test against the code before AR-1 fails in all four `evicted`
cases. The pending-policy room passed again 0.25 seconds after each pass,
once for each simulated pass duration. The missing-target room passed every
second. Both reached the test's stop at 100 passes.

The two pending-policy `other-alarms` cases fail against the first AR-1
head, d9bf1a5f: the first alarm from another owner made a Directory call
before the archive was due. There, policy preparation ran before the due
check, and its in-memory retry of 60 seconds could undercut the stored
backoff. The other ten cases pass against d9bf1a5f. Its missing-target path
returned at the due check before it called the target.

## The expected rate on a Worker

The rate depends on how many rooms on a Worker cannot start their archive.
Take N such rooms. Each pass costs one alarm on the room and up to about six
calls on the Directory scope, so up to about 7 Durable Object requests.

| Period | Passes on the Worker | Durable Object requests on the Worker |
|---|---|---|
| First hour after the deployment | at most 6 × N | at most about 42 × N |
| Each later hour | at most N | at most about 7 × N |

For example, the dap-grow census of 2026-11-13 counted 11 scopes. If all 11
cannot start, the first hour costs at most about 460 requests and each
later hour at most about 77. A room with new acts runs one pass for each
act, and the count above does not include those passes.

A room that has other alarms adds no Directory calls through the archive
while its archive is backed off. Each of those alarms runs an archive pass
that is not due. That pass reads the stored wake index from the room's own
SQLite and calls no port, so it makes no Durable Object request beyond the
alarm that the other owner already pays for.

A room whose archive confirmed and cleared its wake is different. Each of
its other alarms runs a full pass, with up to about six Directory calls,
before the pass finds nothing to write. For M such alarms an hour on a
Worker, that is up to about 6 × M Directory requests an hour. AR-1 does not
measure M. The rate of about 48 requests a minute on dap-grow before AE-1
and after the hotfix was measured with the archive off, so it does not
include this cost.

### The ceiling after the deployment

The planner chose to keep the full pass for a cleared wake (decision
d0be1aeb), so revocation and migration do not wait for an act. The planner
measures M after the deployment against this ceiling, in the first hour:

| Worker | Ceiling, sustained over 10 minutes |
|---|---|
| dap-grow | 150 Durable Object requests a minute, about three times today's 48 |
| dap-lending | 50 Durable Object requests a minute |

If either Worker exceeds its ceiling, the planner rolls both Workers back at
once to their hotfix versions, grow cef83935 and lending 70571e5b, and files
the measure. If the measure shows that M matters, a cheap check on an idle
room gets its own request and design.

Before AR-1, the two Workers made about 250,000 requests an hour.

## Turning the archive back on

`apps/room/worker.ts` returns to `if (!config) return deployed;`. The
planner watches the per-minute request rate for an hour after the
deployment.
