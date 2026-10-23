# Bounded archive reads with blob:none

Request `ac1a5d6ff44e528c07e8da3e2aae593271da8d2b` is tracked by promise
`6c5af37253ce954e41a685af06b55ee72db64eb7`.

The archive reader now requests the host-supported `blob:none` filter and
returns only the exact wanted object from a bounded response pack. The change
also reserves logical decoder work from the pack's actual object count before
allocating its object records. Existing wire, byte, count and deadline limits
remain in force. The ordinary gate failed and its evidence is now independently
audited and released. At the corrected fixture checkpoint
`5f9048c4724337b14c3353d5794cf904f34e2832`, the installed six-case file and
the previously unreached Node 37 and Counting 55 checks now pass in a separate
continuation. An earlier continuation stopped before any test body because of
an incorrect pool selector. The original whole-gate result remains failed.
The passing continuation is now independently audited and its frozen evidence
is released. Hosted acceptance and the next archive Mark are not claimed.

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

## Measured liveness limit for growing archives

Checker assessment `d2a8427aff150e0df945be55c6481ff984df01e7` found no
security or correctness defect and identified a nonblocking P2 liveness limit.
Its measurement reconstructs the journal-v2 layout with real Git. It is not a
hosted read, a measurement of the current Grow archive, or a deployed success.

The root-tree parent read has a wanted-object maximum of 295 bytes plus an
8,192-byte allowance, giving an 8,487-byte cap on aggregate inflated trees.
A `blob:none` response includes descendant trees, and the v2 layout adds trees
as passes accumulate. The checker reconstruction uses one pass.json and one
segment per pass. With no retained entry files, all trees total 8,382 bytes at
65 passes and 8,504 at 66, crossing the 8,487-byte limit. With two retained entry
files per pass, they total 8,448 bytes at 24 passes and 8,786 at 25. These are
concrete reconstruction examples, not a universal pass-count threshold.

Checker clarification `1532420d01aa60f28f3bfb87e782ca68a14b64fd` gives the
layout growth: about 122 tree bytes per pass, plus 92 per retained file and
46 per extra segment. Retained-file count matters as well as pass count.
In the same real-Git reconstruction with a 4,096-entry pass, one pass with
86 retained files has 8,344 tree bytes, while 90 has 8,712. Two passes with
42 files each have 8,343 tree bytes; two with 44 each have 8,711. The latter
member of each pair exceeds the unchanged 8,487-byte allowance. These are
reconstructed layout sizes, not authenticated measurements of the hosted
journals or a guarantee for every pass shape.

The first Room A pass may already exceed this bound. Planner ruling
`7f1c7d6cae26cddf118adda558af1d7ef3a723ee` reports confirmed positions of
zero or one in the 13:23 and 15:21 tails, more than 13,031 Room A entries and
a 4,096-entry maximum per pass. A small confirmed sequence does not establish
a small retained-file or tree-byte count. The checker asks for an authenticated
sum of all tree sizes in each current journal commit before or immediately
after deployment. That measurement is not recorded here. If a journal is
already over the tree-byte ceiling, the stopgap cannot advance it; smaller
journals may still advance. Hosted size and the post-deploy pass count and
rate remain planner-owned measurements, not observations from these tests.

Companions are discarded, so later reads do not avoid this cost through the
source cache. Once the original aggregate limit is exceeded, the read refuses
with `inflated bytes` and has no fallback. The focused Scope fixture uses an
empty tree; the passing focused checks do not demonstrate a multi-pass archive
at this boundary. Actual-count metadata admission remains important, but it
does not remove the separate aggregate tree-byte ceiling.

This change is a bounded stopgap that addresses the reported host-filter
refusal for young archives within the existing limits. It does not make parent
read cost independent of the whole archive, and it cannot promise continued
hosted progress as the archive grows. Planner ruling
`7f1c7d6cae26cddf118adda558af1d7ef3a723ee` accepts this bounded stopgap and
keeps the P2 liveness limit nonblocking. Follow-up request
`fc2548ae1ab9c7c5e859d422611f8a34fd0ff13c` tracks parent reads whose per-pass
cost does not grow with the archive. No budget increase, companion-cache
change or alternative host protocol is implemented here.

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

The owning evidence is released separately at
`/private/tmp/artroom-archive-blob-none-owning-review-data-20261023-v1`.
Its 55,702-byte manifest has SHA-256
`baea2d2a6790f8fd9b803c6a6cfdabd8d53e0c96c47433cbe4feb9ab8559e07f`.
The packet retains 69 copied inputs totaling 110,148,632 payload bytes and
70 files including its manifest. Release record
`e1a22cdd4797ef8271f84133e0d01c623dbaff90` records that boundary.
Root observed freeze `c71325` close naturally 0 under allocation
`8cdb8258769dee0a9b31a30ca0f017f4f6a89333`.

The independent frozen-copy audit is
`/private/tmp/artroom-archive-blob-none-owning-frozen-independent-audit-20261023-v1.json`,
17,967 bytes, SHA-256
`22958f22a536f14256d0e6f8b67787817af4f65694bfd58c8b475861eaeea4a1`,
recorded under durable prefix `218b029a`. It establishes copy and namespace
preservation, separately from the closed outcome audit above. Copied Source,
helpers and bindings are permanently inert DATA; the packet grants no program
execution, imports, transitive access, hosted acceptance or final gate result.

Existing case registrations and deadlines remain unchanged. The real
local Git witness checks request bytes and commit/tree/blob responses, and
proves a companion is not cached by reading it later. Other existing cases
check wanted-not-first shallow typing, bounded deltas, aggregate limits,
reservation refusal before invalid entry parsing, exact two-object charging
and refusal when only the base metadata reservation fits. Host fixtures remain
stand-ins where declared. The HTTP 400 text is an unread-body privacy specimen,
not permission to log provider response contents.

## Failed ordinary gate and fixture diagnosis

The ordinary gate ran at clean `4485f1961ff85cfc3993e88e706d6b65d92cbac1`,
tree `f66196dd4dae227705583a1f79152d033359450a`. Root observed original
session 22951 close naturally 1, tool `c7963e`, allocation
`b8a17fe02c8cb8f1ce1e9826cf21c24d4ee0d350`. Child 64288 exited 1 without
a signal. Root closure is `dc6a15b0fdca4da5b2639820cdc6687b0a36c29f`.

All seven prerequisite stages exited 0, including the early Node blocks of
four and seven cases. The test stage failed. Its complete framework terminal
ledger records 3,500 passed, two failed and three skipped across 3,505 identities
and 489 files, with zero unhandled errors. Downstream Node 37 and Counting 55
were not reached. The earlier focused 26-case pass and controls remain their
original observations; they do not turn this gate into a pass.

Both failures are in `packages/scope/test/archive-installed.test.ts`:

- “installed Grow production scopes export genesis zero after a late native
  Membership8 directory binding” expected two initial entries but received
  zero at line 861, column 135. Its retained observation reports retry with
  reason `unavailable`.
- “installed Grow production public archive command verifies its native
  producer clone” failed at line 1222, column 26 because “the immediately
  preceding native producer did not publish a command session”.

The second failure records the absent producer handoff; it is not an observed
independent clone or command execution failure. Source investigation has found
that the scripted peer still requires exact `tree:0` request bytes while
production now sends `blob:none`. That assertion is caught and presented as
`http-request`, so it is a Source-established fixture incompatibility, not a
raw captured assertion from the gate. The original retry alone does not prove
this as its inner cause. This distinction remains part of the failed-run
record. The fixture correction described below is adopted Source. Its separate
continuation now passes the installed file and the unreached tails, as recorded
below. No validator weakening or successful whole-gate rerun is claimed.

The outer postguard also failed: accepted Main and origin refs moved from
`93f761c4fe6d0e79d9234e789a222977e45236a3` to
`de52252f18a7afdc97486bf00d743981814d8980` during the run. Candidate head,
tree and clean status remained those recorded above; merge base remained
`93f761c4fe6d0e79d9234e789a222977e45236a3`. The owner retained
`postguard RuntimeError: fixed input changed: mainRefs`. This is an additional
observer-input failure and is not omitted because the test stage already
failed. No complete fixed-guard pass is asserted for this gate.

The child measured 1,190.499754 seconds wall, 1,228.754019 seconds user CPU
and 152.583447 seconds system CPU. The owner measured 1,192.716567 seconds wall
and 1,383.019281 seconds inclusive CPU. Nested costs overlap those totals.
The closed result
`/private/tmp/artroom-archive-blob-none-final-gate-evidence-20261023-v1/result.json`
is 1,507,188 bytes, SHA-256
`ea00030171d55013da88c97fc674ac0779bdcc0fb6bbd1285c98ad0e8feb1164`.
The independent complete outcome audit is now available at
`/private/tmp/artroom-archive-blob-none-final-gate-independent-audit-20261023-v1.json`,
23,558 bytes, SHA-256
`b1d72580b8664b91259fe9a82f4044c747a71f95aef72dbe6078c908321d9fa0`.
It reconciles the full terminal ledger, raw stages, bindings, guard changes and
costs. The only fixed-input changes were the Main refs described above; the
separately permitted cache changed while its physical identity remained stable.
The audit retains 18 missing ready callbacks and 21 missing result callbacks.
The complete terminal ledger supplies the outcome counts despite those gaps.
The copied section-citation evidence retains its original recorded mode
qualification. No successful final gate or downstream tail is claimed.

## Released failed-gate evidence

The failed gate is released separately at
`/private/tmp/artroom-archive-blob-none-failed-gate-review-data-20261023-v1`.
Its 36,180-byte manifest has SHA-256
`362ca54cd2f64b84f07754fca2434a4b4d2de52eabae3fa39d090e6297f68df7`.
The packet contains 44 copies totaling 36,134,298 payload bytes, and 45 files
including its manifest. The 41 descriptor inputs comprise the closed raw
leaves, used Source and manifests, two bindings, the outcome audit and the gate
Source review. The recipe, executed freezer Source and root-authored closure
add three copies. These are evidence-file counts, not case counts. The earlier
owning packet remains a separate 69-copy packet; neither packet adds test runs.

Root observed the freeze close naturally 0, tool `39a8b0`, under allocation
`94b9ff356f784f43b2a41e8b2848e95614b97b31`. The independent copy audit is
`/private/tmp/artroom-archive-blob-none-failed-gate-frozen-independent-audit-20261023-v1.json`,
24,542 bytes, SHA-256
`8111046103a010937d9636a7ba39e05510e6216d01950d13c9fd100b996dbbfb`.
It verifies exact copied bytes, preserved original physical identities, unique
single-link copies with mode 0444, the exact namespace, and the first checked
root-closure version. Durable audit
`8212e171a5388985325bc8095c71c10aa0256a51` and root release
`7b4c5dd482e4f3e08f1c4f06a021b5a047b91e98` record that boundary.
Copied programs remain permanently inert DATA. A successful freeze preserves
the failed gate; it does not replace its outcome.

## Adopted fixture correction and separate continuation

The adopted checkpoint is `5f9048c4724337b14c3353d5794cf904f34e2832`,
tree `c7233239794cf15b8663fa573544606a812a1ba3`. Its ordered parents are the
failed-gate head `4485f1961ff85cfc3993e88e706d6b65d92cbac1` and Main
`de52252f18a7afdc97486bf00d743981814d8980`. Relative to the failed-gate
head, it adds the sprint report and changes only
`packages/scope/test/support/archive-artifacts.ts` among test or product files.
The production reader, limits and original test assertions are unchanged.

The scripted v2 peer now requires the exact `filter blob:none` request. Its
response includes the wanted object and every descendant tree held by the
fixture, with no parent commits or unrequested blobs. A commit response adds
the exact wanted shallow boundary. The peer no longer models `blob:none` with
an unconditional one-object response. Its v0 path retains the original
one-object pack behavior. This is a more faithful local fixture, not a hosted
server observation or an enlargement of production limits.

This support-file change adds no test registration. The failed gate still
records its original 3,505 identities and 489 files. The earlier focused
26-case pass belongs to its earlier checkpoint; it does not validate this
new fixture. The continuation below supplies separate observations for the
installed file and the previously unreached tails. It does not revise the
original 3,505-case gate ledger or claim a successful whole-gate rerun.

## Continuation V2 stopped before test bodies

Root observed V2 session 47440 close naturally 1, tool `3daf15`, under root
closure `f39b2ec04221f36754d4daa066f05a0c70f88c6b`. Compatibility passed as
an exact no-op, and the Scope test compiler passed. The focused runner then
expected pool `workers`, but the maintained project selected `cloudflare-pool`.
Selection refused before global setup or any test body. All six installed
cases were unrun, and Node 37 and Counting 55 were unreached. The raw runner
reported one unhandled error. This was a runner-selection failure, not a test
assertion failure or a product result.

The independent V2 audit is
`/private/tmp/artroom-archive-blob-none-followup-v2-prebody-independent-audit-20261023-v1.json`,
15,762 bytes, SHA-256
`24f30bf241cd9ce9c4a432ab656a41126128b1215f5e13909d83d201cd518eac`.
V3 carries the successful Scope test compiler result without repeating it.
V2's original failure remains retained rather than replaced by V3.

## Continuation V3 passed the required remaining checks

Root observed V3 session 35490 close naturally 0, tool `8d89e2`, under
allocation `65dcd028c6c8e3d12418ef5a7b3c663eede3ceb9`. Root closure is
`8fff8bea453867b5579080b247a5fbca09b72e03`. The tested checkpoint remains
`5f9048c4724337b14c3353d5794cf904f34e2832`, tree
`c7233239794cf15b8663fa573544606a812a1ba3`. Production bytes are unchanged
from the failed-gate checkpoint. The test support fixture is the correction
above, so the passing continuation is attributed to this later tree.

The V3 result records four children, each exiting 0:

1. Maintained compatibility passed as a no-op.
2. The whole installed archive file passed all six cases, including the Grow
   production producer and its public command. Each case records zero errors,
   retries and repeats.
3. The previously unreached Node block passed all 37 cases.
4. Counting passed all 55 cases.

The owner records no errors or signals. It measured 55.32230866700411 seconds
wall and 69.182834 seconds inclusive CPU. Child intervals are nested within
the owner interval and must not be added to those totals. Counting used external
OS-temporary bundle outputs; the result establishes no physical cleanup drain.
No healthy gate, compiler, parser or unrelated test cohort was repeated.

The closed result is
`/private/tmp/artroom-archive-blob-none-followup-owning-evidence-20261023-v3/result.json`,
17,850 bytes, SHA-256
`1b302469ad506d336b09a66471d9a61c772fe0254f9eff4cb9d644e29ba31174`.
These observations retain root's original natural-closure attribution. The
completed independent V3 outcome audit is
`/private/tmp/artroom-archive-blob-none-followup-v3-independent-outcome-audit-20261023-v1.json`,
22,039 bytes, SHA-256
`a96f65a0a7a447e56c17406efd9a4f8e48a4db3eb899ec8fb34e9e3c09f1612e`,
recorded under durable prefix `aa21c0e6`. It reconciles all six exact installed
case identities and callbacks, with no unexpected case, unhandled error, retry
or repeat. The Node 37 and Counting 55 names and counts match exactly.

The audit confirms the carried Scope test compiler used the same head, tree,
Source, dependencies and lock. All fixed guards match except the declared
results-cache transition: one installed-file cache cell changed, together with
cache file counters and timestamps and the existing empty `.vite-temp`
directory's timestamps. File identities, modes and link counts remain exact.
The Node tails and final snapshot equal the post-focused snapshot. This is
separate continuation evidence, not a revised outcome for the failed gate.

## Released continuation evidence

The V2 failure and V3 successful continuation are released together at
`/private/tmp/artroom-archive-blob-none-followup-review-data-20261023-v1`.
Its 60,336-byte manifest has SHA-256
`42e3e4f534edb152e46a3d27a714a77ec11d79e94177a7edc0842c3b2d3700c8`.
The packet contains 94 descriptor inputs and three extra copies of the recipe,
used freezer and root-authored closure. Its 97 copies and manifest make 98
files totaling 54,757,598 bytes, including the manifest. These are evidence-file
counts. They add no test execution and do not replace the separate failed-gate
packet.

Root observed freeze tool `b696a2` close naturally 0 under allocation
`4457f22545d635b3285acc7ce502e0c8ade1707f`. The independent copy audit is
`/private/tmp/artroom-archive-blob-none-followup-copy-independent-audit-20261023-v1.json`,
6,087 bytes, SHA-256
`8765664b757d5e5da8a9924481547c2dd5ae2bb170d9a9e240dc57ba989c3931`.
Durable audit `45bc5d9024109fcb28edc4b02fa25f417622a903` and root release
`a4e770377aef81fd79027fc856351e28b4db4133` record that copy boundary.

All 94 recorded original physical identities and byte hashes match. Copies
are unique single-link files with mode 0444, and the file and directory
namespace is exact. The three extras have historical byte and hash bindings,
with current stable reads. Their historical original physical identities were
not recorded and are not inferred. The root-closure copy matches its first
pinned version. V2's original null-checkpoint manifest and separately filled
checkpoint remain distinct; V3 retains its already filled checkpoint manifest.
No historical manifest is rewritten. Counting's external temporary artifacts
are excluded and were not followed.

Copied programs and bindings remain permanently inert DATA. No successful final
gate, hosted archive pass, native Mark advance, physical teardown drain or
general archive-size guarantee is claimed.

## Planner ruling and remaining work

Checker report `4ea57f05d54f507bc209c776d5f55daf6876b523` approves exact
head `b76a318f30691b5aea96a72a525675c191fe4feb`, subject to the planner's
ruling. Ruling `7f1c7d6cae26cddf118adda558af1d7ef3a723ee` accepts the
bounded stopgap and the finite continuation instead of a second whole gate.
This exception is specific to the reviewed tree: relative to the gated tree,
only the scripted archive peer, this implementation note and the sprint report
equal to Main de522 changed. The whole installed file, Scope test compiler
and previously unreached Node 37 and Counting 55 are covered as recorded above.
A subsequent production change requires a new gate. The original failed gate
and its Main-ref qualification remain unchanged.

The ruling orders archive landing before rename integration and leaves
deployment to the planner. The planner will monitor archive tails for the first
hour after deployment and report pass count, rate and remaining headroom.
The later checker clarification warns that the existing Room A archive may
already have no headroom; the authenticated tree-size measurement is still
pending in this report. Neither policy acceptance nor the local continuation
establishes a hosted pass or Mark advance.

Follow-up request `fc2548ae1ab9c7c5e859d422611f8a34fd0ff13c` requires fixed
per-pass parent-read cost past the stopgap bound, a host-shaped 200-pass witness
with two retained files per pass, and a control that fails on the stopgap code,
without widening response guards or existing byte limits. The planner prefers
bounded native parent-path state if it fits the v2 layout bounds. That design
choice and implementation belong to the follow-up; they are not delivered by
this stopgap. The measured P2 liveness limit and all hosted qualifications
remain in force.
