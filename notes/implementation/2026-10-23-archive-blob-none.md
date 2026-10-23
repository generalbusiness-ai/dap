# Bounded archive reads with blob:none

Request `ac1a5d6ff44e528c07e8da3e2aae593271da8d2b` is tracked by promise
`6c5af37253ce954e41a685af06b55ee72db64eb7`.

The archive reader now requests the host-supported `blob:none` filter and
returns only the exact wanted object from a bounded response pack. The change
also reserves logical decoder work from the pack's actual object count before
allocating its object records. Existing wire, byte, count and deadline limits
remain in force. Hosted acceptance and the next archive Mark are not claimed.

## Host finding and bounded response handling

Planner finding `da1b3d2f03a08ff1acf06b24b6747e48a324f2af` attributes the
HTTP 400 to the host rejecting `tree:0`: “Unsupported Git fetch filter; only
blob:none is supported.” This is the planner's scratch-host observation.
Changing depth or adding object-format did not resolve that refusal; the
reported `blob:none` response contained a root commit and its tree. Earlier
protocol hypotheses do not supersede that later evidence. This implementation
adds no hosted probe, additional fetch, downgrade or fallback.

The v2 request retains `deepen 1` and the same GET followed by POST exchange.
The existing bounded full decoder accepts companion objects and bounded OFS
and REF deltas. It validates pack framing and trailer, exact object hashes,
object count, per-type limits, aggregate inflation, aggregate reconstructed
bytes and the original deadline. It then selects the exact wanted ID, checks
its caller size and type, and applies any shallow-boundary check to that wanted
object rather than the first pack entry. Only the wanted object is returned
for caching or output. Companion objects confer no cache or closure authority.
The v0 exact-one, non-delta object path and v0 ref behavior remain unchanged.

## Actual-count admission

Fixed admission for two calls, 1,024 metadata units and wire-derived work still
precedes token, identity and HTTP activity. For isolated v2, the base metadata
reservation also enters the original input-work ledger. After the complete
pack header, version and count pass their existing ceilings, the decoder calls
one trusted synchronous `reserveObjects(count)` callback. This precedes Cursor,
Entry records, per-object maps, reference arrays and inflation.

The Scope callback charges the actual count times 1,024 to both metadata and
input work in the same original ArchiveBudget. This is a conservative logical
work model for object records, hash and offset memberships and dependency,
ready and result lists. It is not measured JavaScript heap usage; the existing
owned-byte reservation remains payload accounting. The bounded pack copy and
constant header inspection precede this callback and remain covered by fixed
wire work. A refused reservation propagates unchanged before output or cache
installation. Spent HTTP and base costs are not refunded, and no later top-up
occurs. The callback is forwarded only on isolated v2 reads.

Native metadata remains 4 MiB and input work remains 64 MiB. A two-object read
charges 3,072 metadata units in total; a 27-object read charges 28,672. This
avoids charging every small response as the wire-derived worst possible object
count. It does not guarantee that a larger archive fits. `deepen 1` limits
commit ancestry, not the number of descendant trees in a cumulative archive.
Wire, aggregate byte, actual-count and remaining metadata limits can still
refuse a valid but oversized response before decoding allocations.

## Reviewed Source and accepted Main

The four reviewed code and test paths are the Git HTTP reader and its tests,
and the Scope archive host and its tests. The held V2 patch has SHA-256
`3217f063e3a1bde86462b435d51876d019df83b47326f82bd9362c42d96e2ca2`;
its exact path manifest has SHA-256
`e44aaa8005fe7bc7c3e04b4a2abebe3eac4d1324db276b9428820c022ebf95a3`.
The V2 Source peer review reports no remaining mandatory finding and retains
its earlier V1 accounting qualification: fixed payload accounting alone did
not price companion object records. The V2 callback and dual-ledger reservation
address that Source concern; this is not an executed-check result.
The peer report is `artroom-archive-blob-none-v2-independent-source-review-20261023-v1.json`,
SHA-256 `e8078cdc53a840034ed22a87cbe97884955a6f62b3da1b49224acec1f8279e3c`.
The independent focused-owner Source review is
`artroom-archive-blob-none-owning-independent-source-review-20261023-v1.json`,
SHA-256 `c2ffedca552e76563db356316b3b371aa052eab85351bd0ca7598308597f620a`.

The clean integrated checkpoint is
`f192f9b6ca4f731b8f72d293988edff2a8f14458`, tree
`b4d5bbe6e1de264c50a6cdb627baa957b2f627d7`. Its ordered parents are
`2bcb089c37e3370afb9e57507694ab42f1d84496` and accepted Main
`93f761c4fe6d0e79d9234e789a222977e45236a3`. The maintained archive-host seal
was adopted as
`024be0c8f8a23b0074e3f9e0f87c2bfd6b116721a569c41693ecb340f2b6d330`;
the resulting seal-map SHA-256 is
`b8e2bd84f59a6f802772c38a3b511b4196c57f770ef9b17327107a8cb06ad229`.
These are actual recorded values, not a guessed replacement. Parser execution
and integration evidence remain separately attributed; this report does not
invent a parser outcome or timing from the seal value.

The focused owner was independently reviewed as Source. Its first version
needed the maintained pool-compatibility invocation; V2 adds that prerequisite
and requires both fixed dependencies and generated cache to remain unchanged
before compilation. The review covers exact case selection, raw assertion
classification, same-descriptor mutant restoration and refusal to overwrite
unknown or partial mutation bytes. Source review is not a runtime pass.

## Validation status

Root observed focused session 20004 close naturally 0, tool receipt `a6df71`,
under allocation `d8b5c03eba8d6103c2778e28ea0f60b600541fdb`. The closed
owner result reports no errors or signals and completed all seven children:

1. Maintained pool compatibility exited 0 and satisfied its no-op guards.
2. The Git test, Scope production and Scope test compilers each exited 0.
3. The complete Git HTTP and Scope archive-host files passed all 26 cases.
4. The filter control ran the complete Git file and exited 1 as intended:
   13 cases passed and the exact request-body case failed with a raw
   AssertionError distinguishing `filter blob:none` from `filter tree:0`.
5. The separately restored admission control also exited 1 as intended:
   13 cases passed and the exact pack-admission case failed with a raw
   AssertionError. It received `wrong-type: pack entry` instead of the identical
   `too-large: TEST decoder metadata` reservation refusal.

The baseline had 26 ready, result and final callbacks; each control had 14 of
each, with no recorded gaps. Same-run JSON and terminal identities agree in
the owner result. The owner completed its exact-mutant restoration and final
guard checks, and root reported exact original Source restoration. No timeout,
extra case failure or altered assertion is accepted as a meaningful control.
The completed independent closed audit is
`/private/tmp/artroom-archive-blob-none-owning-independent-audit-20261023-v1.json`,
29,919 bytes, SHA-256
`d32f2877c10cfb0e61155eaffed49f971ba082608def38aa0e0c0bfcaebf5f81`.
It reconciles all 13 full guard snapshots, both independently reconstructed
mutants and exact restoration, the recorded outcomes and costs. Original
natural closure remains attributed to root; the audit executes no project
code and repeats no test.

The owner measured 41.969552 seconds wall and 46.925260 seconds inclusive CPU.
Individual child wall times were 0.077455 seconds for compatibility, 0.523813
for the Git compiler, 0.268217 for Scope production, 0.590142 for Scope tests,
7.726369 for the 26-case baseline, 2.328058 for the filter control and 2.292986
for the admission control. Those intervals overlap the owner totals, which
include guards; they must not be added as separate costs. The closed result
`/private/tmp/artroom-archive-blob-none-owning-evidence-20261023-v1/result.json`
is 7,579 bytes, SHA-256
`a12f3203ac60c1910bfc189853e61cadb28ef04cef6d0670d025cec67880fa69`.
No command was retried or healthy whole suite repeated to produce this note.

Existing case registrations and deadlines remain unchanged. The real
local Git witness checks request bytes and commit/tree/blob responses, and
proves a companion is not cached by reading it later. Other existing cases
check wanted-not-first shallow typing, bounded deltas, aggregate limits,
reservation refusal before invalid entry parsing, exact two-object charging
and refusal when only the base metadata reservation fits. Host fixtures remain
stand-ins where declared. The HTTP 400 text is an unread-body privacy specimen,
not permission to log provider response contents.

The final ordinary gate remains pending and must bind the final report
checkpoint after review of the owning evidence. Its expected ledger is carried by immutable Source correspondence
from accepted Main: 3,505 identities across 489 files, 3,502 expected passes and
three existing skips, with Node blocks of 4, 7, 37 and 55. That is an expectation,
not a result. No gate, deployment, hosted archive pass, native Mark advance,
physical teardown drain or general archive-size guarantee is claimed.
