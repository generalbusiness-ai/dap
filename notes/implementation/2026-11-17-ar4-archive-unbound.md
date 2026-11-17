# A room without an archive destination stops retrying

AR-4 (request `4a73a509`, ruling `822d62f8`, option A) ends the hourly
archive retries of a room whose Directory names no archive destination.

## The problem

AR-3 (`9184dd26`) found four grow-demo scopes failing every hour at the AR-1
cap: Directory, Rules, Site and Room A. The room never ran `bind-archive`, so
the archive slot of the Directory's `repository` row is empty. Each pass
walked to the Directory, got `forbidden`, and backed off for one more hour.
That cost about 98 Durable Object requests an hour, for nothing.

Two facts shaped the fix:

- The Directory host answered `forbidden` for every failed check, so the
  archive driver could not tell "no destination" from a real refusal.
- A cleared wake re-arms on every commit (`ArchiveRows.signal`). Room A
  commits every minute, so clearing its retry would have made 60 passes an
  hour instead of one. Red 1 below measures 61.

## The change

- **The host answer.** `archiveHostItem` (`packages/scope/src/archive-host-item.ts`)
  runs every Directory check first: the scope, the pinned version, the query,
  the row's register and claim, the host and namespace, and the claim's
  found entry. Only then does it read the archive slot. A slot that is not
  `journal` returns `{ ok: false, reason: "unbound" }`. Every other failure
  still returns `forbidden`. A missing row stays `forbidden`: every
  established Directory opens that row at genesis (`directory.ts:250`), so a
  missing row is not the "never bound" case.
- **The lookup.** The archive target turns the answer into the value
  `"unbound"`, but only when it comes from the checked Directory itself.
  The room adapter (`apps/room/archive.ts`) does the same check and maps an
  `unbound` answer from any other scope to `forbidden`. The new
  `archiveTarget(...).bound()` returns the plan, `"unbound"` or null. The
  older `resolve`, `resolveRoom`, `discover` and `discoverRoom` keep their
  types and read `"unbound"` as null.
- **The driver.** At the target step, `"unbound"` ends the pass with state
  `disabled`, reason `unbound`, and a recheck after
  `ARCHIVE_UNBOUND_RECHECK_SECONDS` (one day). It replaces the pass's own
  deferred retry with an unbound marker in the wake record.
- **The marker.** The wake record `archive-wake-1` takes an optional field
  `unbound`:
  - `"member"` on a scope that the Directory reaches: Rules, Site and the
    lanes. Its own commits leave the marker and the recheck alone.
  - `"directory"` on the Directory itself. Its next commit drops the marker
    and wakes the Directory at once. `bind-archive` is such a commit.

  A marker with a pending retry, with no `next`, or with any other value is
  unreadable. A stopped writer stays stopped.

Real unavailability keeps the AR-1 backoff: a thrown or timed-out read, an
unreadable reply, a destination that is not ready, and any mismatch. Each of
these still returns null.

After `bind-archive`, the Directory archives at once. Rules, Site and the
lanes archive at their next daily recheck. A same-day wake for them would
need a cross-scope wake path, which the ruling did not choose (option C).

## Who can receive "unbound"

Only a peer object in the same namespace, through the `archiveItem` RPC. No
session, member, inspector, public reader or HTTP route reaches that port
(the header of `archive-host-item.ts`). The host answers `unbound` only after
every check that would otherwise return the whole `repository` row, archive
slot included. A caller that gets `unbound` could already read that slot, so
the answer reveals nothing new.

## Rates

| Room                                      | Before                                                                | After                                            |
| ----------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| grow-demo, four unbound scopes            | 4 passes an hour at the AR-1 cap, about 98 DO requests an hour (AR-3) | 4 passes a day, about 98 DO requests a day       |
| A lane that commits every minute (Room A) | 1 pass an hour; its pending retry ignores commits                     | 1 pass a day; its commits leave the marker alone |
| The Directory after `bind-archive`        | waits up to one hour for its retry                                    | wakes at the binding commit                      |

The wake floor of an unbound scope is one day. Other owners' alarms still run
the archive, and the wake check ends those passes before any port call, as
in AR-1.

At deployment, each unbound scope makes one more failing pass when its
current retry falls due. That pass stores the marker. The :35 burst on
dap-grow then stops. The planner reads the DO rate after the deployment.

The operator view (`archive-operator.ts`) still shows only `pending`,
`stopped` and `next` of the stored wake. It does not show the marker.

## Tests and reds

- `packages/scope/test/archive-wake-rate.test.ts`, "an unbound lane …": a
  real lane commits every minute for an hour. It makes one pass, keeps the
  member marker and the one-day recheck, makes one more pass at the recheck,
  and then meets an unreadable target. That target gets the AR-1 retry from
  the floor.
- `packages/scope/test/archive-row.test.ts`, "unbound markers …": a member
  keeps its recheck across commits, a Directory commit wakes the Directory, a
  deferred retry and the marker replace each other, three malformed markers
  are unreadable, and a stopped writer stays stopped.
- `packages/scope/test/archive-installed.fixture.ts`, "Grow activation
  warm": the real Directory host answers `unbound` before the binding. The
  Directory stores its marker with a one-day recheck, and the real
  `bind-archive` act wakes it at the commit. "Grow activation evicted" turns
  the first lookup into a thrown read and keeps the AR-1 retry, which the
  binding leaves alone.

The named reds are in `artroom-evidence/2026-11-17-ar4-red`. Each one changes
one line and runs the test named above:

1. `red-1-member-commit-wakes.txt`: `signal()` re-arms a member's marker on
   each commit. The lane makes 61 passes instead of 1.
2. `red-2-bind-does-not-wake.txt`: `signal()` keeps the Directory's marker
   too. After `bind-archive`, the Directory still waits a day.
3. `red-3-unreadable-as-unbound.txt`: the driver reads a missing target as
   unbound. The AR-1 backoff cases and the unreadable recheck fail (7 tests).
