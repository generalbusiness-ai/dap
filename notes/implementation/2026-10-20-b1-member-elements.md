# B1: member resolution and display

Preparation under compound request `11b2f711`. The separate B1 milestone
is requested from planner by `ce9efa4d`, before any Source filing. The
approved D1 design is on published Main `8aad37bb`. This worktree starts
there; no pending K1, K2 or K3 source is imported.

## Current preparation

The service resolves only typed party and journal signer fields from the
captured declared projection. Canonical full member references include the
membership incarnation. Repeated references share one membership read.
The table considers at most 32 references; controllers consume that same
budget after primary references. A visible overflow counts distinct
references outside the table. Arbitrary values never trigger member reads.

Display records preserve identity, standing, controller, opening fact and
membership read head separately. Missing or refused reads leave identity
unavailable. Final removed and lapsed states stay explicit. A roster read
from another head cannot establish actions. These actions are display
evidence and never native admission.

The native adapter requires an authenticated session bound to the exact
membership and current key. It reads one native member query, including all
four states, with at most 100 rows, plus one roster query with at most one
row. It follows no cursor, widens no lookup and makes no signed fallback or
retry. A member outside that window remains unavailable. This is a bounded
best-effort identity read, not a complete membership listing. No keys or
invitation fields enter the display record.

Routed displays resolve only their disclosed row. Rejected rows never enter
the table; unknown assignments cause no identity read. Mounted displays
carry the table beside native data, within the existing 64 KiB view bound.
The element, surface API, shared text and Grow witnesses are not built yet.
The native adapter has not yet been exercised against an actual scope.

## Focused verification

Three pure resolver cases pass. Changing the bound from 32 to 33 makes the
unchanged overflow assertion fail: all three cases run, two pass and one
fails by assertion. Exact source and test bytes are restored. Original raw
logs, JSON reports and matching input snapshots are retained under
`/tmp/b1-resolver-bound-control-20261020`.

After source/session integration, four selected declared-view files pass
20 cases. The additional routed-disclosure witness then passes with the
existing six routing cases. All four owning MCP compiler projects pass.
These are in-memory source/port witnesses, not native authentication or
browser evidence. No whole gate has run; it is due once before full review.

The first focused command stops before tests because it resolves the
configuration relative to the wrong root. The corrected command then
exposes an invalid incarnation in the new fixture: its final base32 symbol
is not canonical, so the reference is correctly rejected. The fixture now
uses a different valid incarnation and explicitly checks its validity
before the unchanged unknown-identity assertion. Both failures remain
recorded; neither is described as an infrastructure failure or passing run.

Dependencies are a physical copy of exactly 5,499 granted regular leaves
and 31 contained links from frozen K1 evidence. Bytes, hashes, modes and
distinct inodes are checked; frozen originals are rechecked unchanged and
never executed or edited. Only owned output caches are removed. Lock and
stamp match; no package is installed.

This preparation is not complete B1 delivery. It creates no membership act,
B2 screen, B3 recorded-presence element or B4 live executor. No Source,
review, Main landing, push, Cloudflare operation or hosted acceptance is
claimed. Planner owns deployment and the separate hosted Grow milestone.
