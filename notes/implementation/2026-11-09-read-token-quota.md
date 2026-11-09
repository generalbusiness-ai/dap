# Reserve member read tokens at native commit

Request: `908786011e5c0acae29e7b2a7c70b87b0680a948`, item 4 only.
Promise: `3a1d2b78e02d544489d3786415b9ed987c28e3af`.
Live ruling: `67b1fb7faa0e17232a72e1588f834001dadbe9e1`.

Status: unvalidated source preparation. The branch includes main
`f9eb50bc`. Its owned dependency view copies the completed runner checkout
without an install. No compiler, focused check, control, asset build, or
gate has run for this head. The planner closed the execution window in
`7b2d5548` and sprint-cadence thread 22. The earlier items of R13 stay closed.

## Refuse before accepting a ninth operation

The native commit checks eight open reservations for the authenticated
member in this Destination object. The already judged grant supplies the
full Membership ScopeRef and member identity. Several keys of that member
share one bucket; a principal, caller key, or handle prefix does not
supply the identity. The current commit view supplies the Destination's
full ScopeRef. No bucket crosses either incarnation.

A fresh act at the limit returns `refused/limit` before accepting an
operation entry. The accepted entry's sealed callback inserts its private
reservation in the same SQLite transaction. A rollback keeps neither.
An accepted idempotency key returns its existing receipt or mismatch
without another reservation. The check changes no historical entry,
definition, genesis packet, replay rule, or mint-read outcome meaning.

## Keep a reservation while its token may remain

The adapter binds the operation's nonsecret handle before its provider
await. A valid own reply replaces the fallback end with actual expiry.
Taking or dropping plaintext leaves that slot open. An explicit
`minted:false` frees it; a lost, malformed, or thrown reply keeps the
reservation until its opening time plus requested hours plus ten minutes.
A reply after that reservation expires cannot restore the row or disclose
its plaintext. The quota counts reservations and does not prove that a
provider token ended.

A valid own reply whose reported end already elapsed retains the pinned
`confirmed` meaning. Planner ruling `6cf4c1c8`, answering request
`84d7f349`, also preserves a valid reply after the fallback reservation
expired. The adapter records only its genuine `{token, ends}` metadata,
stores no plaintext, and keeps the released slot closed. A replacement
retains its eighth place. The old act's retry returns its original receipt
without another slot; the member needs a new mint to read a token.

Destination 19 keeps its one-hour request. Earlier pins keep their
existing one-to-twenty-four-hour field. The same helper supplies the
adapter and admission lifetime without changing any recorded definition.

A private per-incarnation first-sequence marker distinguishes old pending
operations from new expired reservations. Legacy read markers without a
member remain unassigned: they count in no bucket and gain no ownership
from a key or handle prefix. Existing authenticated plaintext-expiry
cleanup keeps its own meaning.

An indexed private queue expires at most 64 reservation rows in one pass,
including rows whose plaintext left custody. The bucket index bounds each
admission read to eight live rows. An unknown end beyond the last valid
clock stays open at every representable time and schedules no impossible
alarm; it never frees early through a capped timestamp.

## Validation remains due

The Native witness must show eight accepted reservations, a ninth refused
`limit` with no entry, another member's success, several keys sharing the
same member bucket, accepted-key reuse, and transaction rollback. The
adapter witness must distinguish known expiry, explicit refusal, unknown
and late answers. The private SQLite witness covers restart, incarnation,
legacy cutover, bounded expiry and the final representable clock.

Source seals require their maintained producer after the source freezes.
Hugh's standing patch authorization applies. Focused checks, distinguishing
controls, one full gate, and independent exact-head review remain due.
This source preparation performs no deployment and supplies no live
acceptance.


At source checkpoint `14aead39`, the maintained seal producer changed
three existing values: `object.ts:ScopeObject`, `core.ts:Scope`, and the
whole `destination-host.ts` owner. New whole-file seals cover
`credential-store.ts` and `read-token-quota.ts`, including SQL, identity,
lifetime, binding and scheduler code. All other named owner values stay
equal. Patch `artroom-r13-source-seals-20261109.patch` has SHA-256
`f0b0c2f9c5e5c7ea8a6ce781b3fb1adb6a30c4e5eebced02cbf08fa942bdaa11`; Hugh's standing patch authorization covers adoption
of these actual outputs. No route or gate assertion changes. Independent
review still judges the source; no test result follows from a seal.
The later known-expired-reply fix changes the quota owner again. Its seal
must follow the next source freeze before the focused checks.
