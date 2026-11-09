# Reserve member read tokens at native commit

Request: `908786011e5c0acae29e7b2a7c70b87b0680a948`, item 4 only.
Promise: `3a1d2b78e02d544489d3786415b9ed987c28e3af`.
Live ruling: `67b1fb7faa0e17232a72e1588f834001dadbe9e1`.

Status: unvalidated repair after the first focused compiler failure. The branch includes main
`f9eb50bc`. Its owned dependency view copies the completed runner checkout
without an install. Compatibility and the 11-case Node owner passed at
`16a3847c`; Scope source then failed on the missing `limit` type. No Native
case, control, asset build, or gate has run. The planner closed the execution window in
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

## Add the ruled refusal to the public answer vocabulary

The first focused run caught a missing transport reason: Scope source
failed `TS2322` because `RefusalReason` did not include `limit`.
The contract now names that pre-entry refusal. The bytes validator and
the two exhaustive metric schemas recognize the same closed value.
The existing client answer witness checks that the refusal crosses its
decoder with a judged head and still rejects an unknown reason.

This addition follows [kernel section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel).
Quota policy and storage stay in the replaceable runtime service. The
closed public `Answer` vocabulary must name the exact reason that current
clients decode, so an application cannot supply this part. Section 7.1
admits the filed R13 security fix. No new K item, platform name, definition,
recorded outcome rule, or historical pin follows from the new answer.

## Validate the final source

The first frozen run at `16a3847c` passed compatibility and all 11 Node
inventory cases, then failed its first Scope source compiler. The test
compiler and all 21 Native cases remained unrun. Manifest
`66de9014e2a55a08948bb02bcb4b707f6b4dc8d0da387e517ace1a6ab905413f`
seals 17 public and 36 private files. The failed run remains failed.
The repair's focused checks, distinguishing controls, and gate remain due.

The next frozen run at `42e9afa5` stopped in the Node owner: 10 passed
and the decoder's unchanged seal failed. No compiler or application case
ran. Manifest `b69127a68443831ade7286bd9447bc9c9a14464df9024d462f912f0038b765e6`
seals 16 public and 20 private files. The maintained producer now supplies
the bytes decoder's actual whole-file seal, `05bf74f7`, under Hugh's
standing patch authorization. Both failed units keep their original results.

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
At source checkpoint `2b7c3423`, the producer also updates the three whole
owners changed by the known-expired and late-reply cuts: the adapter,
custody, and quota. Patch `artroom-r13-late-source-seals-20261109.patch`
has SHA-256 `cba60792593f91c5b1537bb3e235c190e7839c5316c8193dffec801b87bd35cb`.
The existing named Core and Object values stay equal to the first freeze.
Hugh's standing patch authorization covers these actual outputs. The seal
metadata supplied no test result.
