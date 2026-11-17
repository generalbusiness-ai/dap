# An activation leaves the Directory's unbound marker

AR-5 (request `28d62918`, ruling `261e9b3e`) fixes an AR-4 fault. AR-4
(main `957e0ba4`) gave a scope with no archive binding an unbound marker and
a one-day recheck. A commit in the Directory drops the Directory's marker,
so a new binding takes effect at once. But `ScopeObject` calls
`archive.committed()` from two places: after each sealed commit
(`onSealed`), and once each time the platform constructs the object. AR-4
treated both calls as commits.

## What dap-grow showed

The AR-4 deployment started at 15:19Z. At 15:35Z each of the four grow-demo
scopes ran one pass. Rules, Site and Room A stored their markers and ran no
pass after that. The Directory (`sc_cu5bjlh3`) ran a full pass each minute.
Before each pass, its activation diagnostic showed the marker from the minute
before, with its alarm one day out.

The minute logs from 15:38Z show what constructs the Directory each minute:

| Time  | Object     | Call          |
| ----- | ---------- | ------------- |
| :05.7 | Membership | `observed`    |
| :05.8 | Membership | alarm, pin    |
| :07.3 | Room A     | `observed`    |
| :10.0 | Site       | `nativeBirth` |
| :10.7 | Directory  | `nativeBirth` |
| :10.9 | Directory  | `archiveItem` |

The Grow room's minute traffic reaches Membership and Room A. Their route
checks then read Site and the Directory with `nativeBirth`. That chain ran
before AR-4 too. The Directory sits idle between calls, so the platform
evicts it and constructs it again for the next call.

## The change

- `ArchiveDriver.committed(sealed = true)` passes `sealed` to
  `ArchiveRows.signal()`.
- The constructor's activation calls `committed(false)`.
- `signal()` leaves a `"directory"` marker when `sealed` is false. A member's
  marker stays for every call, as in AR-4.

A sealed Directory commit still drops the marker and wakes the Directory.

## Rate for grow-demo

| Code | DO requests an hour | Source                               |
| ---- | ------------------- | ------------------------------------ |
| AR-1 | about 98            | hourly retry passes, AR-4 review     |
| AR-4 | about 360           | dap-grow rate read, 15:37Z to 15:43Z |
| AR-5 | under 1             | expected: four daily rechecks        |

The AR-5 figure is expected, not measured: four scopes each run one recheck
a day, a few requests each. The Membership pin pass each
minute is separate. It ran before AR-4, and AR-5 does not change it.

## Tests

- `archive-installed.fixture.ts`: in the warm activation scenario, the
  Directory restarts after it stores its marker. The marker and its alarm
  stay, and no pass runs.
- `archive-row.test.ts`: `signal(at, budget, false)` leaves the Directory's
  marker. A sealed `signal` then drops it.

Without the source change, both tests fail
(`artroom-evidence/2026-11-17-ar5-red/red.txt`). With it, the archive row,
wake-rate, installed and driver tests pass (57).

The seals for `ScopeObject`, `archive-driver.ts` and `archive-row.ts` take
the new values.
