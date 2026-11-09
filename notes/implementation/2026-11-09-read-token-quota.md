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

At `b938e497`, Node's complete 11 cases passed again. Scope source then
found the last exhaustive consumer: MCP's refusal-description table lacked
`limit` (`TS2741`). The remaining three compilers and all 36 application
cases stayed unrun. Manifest
`54b1e2fdad9337128f87c8fc76813c587e84837b3c0d163729ea3ac597964477`
seals 17 public and 33 private files. MCP now explains the eight open
reservations and tells the member to wait before a fresh request.
Its existing every-refusal witness covers the new row.

The application run at `71e6e574` passed all four compilers. Vitest reported
39 passed, one failed, and three skipped after its first failure; eleven
required cases never collected. The first Native quota scenario passed.
The second expected `own-answer` for a lost provider reply, but the
runtime correctly recorded `unknown` with `basis: none`. The test now
requires that exact attribution, with the same result and empty body.

That run's static case ledger also used spaces where Vitest inserts
` > ` between a describe title and its case. Its verifier failed. Separate
metadata reconciliation matches the unchanged literal source and actual
file, project, pool, and terminal cases for 35 cases in five complete
owners. Neither the original run nor its verifier becomes a pass.
Manifest `5e80040f24b407c5bb7ad3686b80817c32e593894e59f53eff35431175bfa929`
seals 19 public and 268 private files. Only the affected test compiler and
the five failing, incomplete, or uncollected Native owners need follow-up.

The follow-up at `89706f41` passed its compiler and 17 cases in four
complete owners. The first quota scenario then timed out at its unchanged
30-second allowance. That scenario passed in the earlier run. Its second
scenario stayed unfinished. The cause remains unknown. Manifest
`cf3d46eed2aba655e8e690295d89faeb959e760ec56c13591183767cfc86e9e8`
seals 16 public and 265 private files. Bounded test-only phase markers now
identify the last completed step if the two-case quota owner stalls again.
They change no clock, assertion, worker setting, deadline, or production code.

The bounded diagnostic at `78f09695` repeated the timeout. It completed
the rollback and row checks, then stalled in the following physical
eviction. Manifest
`5f12f8643d0fc9833cae97f74c6666dbb962623198803628924fe04527718e83`
seals 17 public and 266 private files. That trace locates the pending
await; it does not prove why eviction waits. The test now catches its
deliberate storage error inside the object and returns the plain message
before eviction. The same production submit, rollback assertions,
physical restart, and original allowance remain. This follow-up checks
the request-lifetime hypothesis without changing quota behavior.

The RPC-boundary follow-up at `83543042` reached no test body: the test
compiler required the actual `PlatformScope` subclass for the generic
Durable Object callback. Manifest
`7a6e04ead77b9092c83ee15fe5738a9358ffac55b358497ae484f13c1b842e1e`
seals 16 public and 27 private files. The repair imports that class as a
type and names it in the probe; the runtime call stays the same.

At `22a4b9f4`, the compiler and the full first Native scenario passed,
including the physical rollback restart. The late-reply scenario reached
its eighth replacement slot, then Workerd reported cross-object I/O and
ten unhandled errors before the original deadline. Manifest
`2dcf066791ed52abce37608a842f72a796d0051f11bd2711f1341c36d7c03348`
seals 17 public and 266 private files. The test now releases the held
provider promise inside its owning Destination object, including cleanup.
Quota behavior and all assertions stay unchanged.

At `e360b00f`, the affected Scope test compiler and both complete Native
quota scenarios passed. Exact full-title coverage passed with no unexpected
case, skip, retry, or unhandled error. The late reply recorded confirmed
metadata with no stored plaintext after the replacement took the eighth
place; the next mint still refused `limit`.

Manifest `b364fecd7228062145ce1b841135f5253b1a6ebfa9ef5c2fb944458e90a746c9`
seals 23 public and 289 private files, including all three source-seal
producer outputs and patches. The selected closure now covers 54 cases
in ten complete owners, 11 Node inventory cases, and four compiler
contexts through this pass and the qualified unchanged-source evidence
above. All eight earlier failed units keep their results. Controls, the
Page bundle and asset check, the gate, and independent review remain due.

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
