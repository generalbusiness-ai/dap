# Parentless creation admission: first security slice

Request `954bf397`, promise `1961427e`, integrates the parentless creation
policy onto the actual Slice9 landing, Main `c40492ee`, tree `ef2c2b54`.
The isolated integration preserves the Slice9 and CLI changes. The first
integrated focused checks passed, but its gate found two failures. The
fixture and diagnostic repairs below require affected focused checks and
one gate at their final head.
No publication or deployment has run for this slice. No packages were installed.

The sections below retain the historical preparation and evidence. That work
started from Main `2e228b3c`, tree `6bcc7cd6`; checkpoint `0fd130b6` was
source preparation only. The earlier dependency copy (session `50354`) and
four-owner AST parser (session `85742`) each completed naturally with exit 0
and passed their recorded guards. The corrected focused cases and the
admission-bypass control produced the adopted evidence below. Those results
do not establish a pass for the new integrated head. The earlier benchmark
record, 10/12 BEFORE and 0/12 AFTER, is unchanged by this source integration.

The proposed slice addresses the parentless creation entry of findings
1.1 and 3.11. With `DEPLOYMENT` present, the public HTTP and service-binding
creation path permits only a valid signature over the exact install whose
seed names `ARTIFACTS_CONFIG.registerScope`. The setting uses the existing
strict Artifacts parser; missing or invalid configuration fails closed.
Every other parentless install or direct directory founding is refused as
`unauthorized` before `idFromName` or `get`. The two deployed fetch
entrypoints, hosted agent's in-process route, and service-binding create
carry this same policy. Checking it derives the seed and verifies one
signature for a pinned install; a refused creation does not address a
Durable Object and cannot run its SQLite constructor.

There is no public field that asserts a trusted creator. This slice changes
only the parentless interface. A register-produced child continues through
the existing namespace delivery path, whose receiver resolves the actual
sealed source and judges its send. It does not add an index or revalidate
the ancestry of every existing scope against a new deployment pin. A live
scope's existing authority and historical pins are unchanged.

`ALLOW_OPEN_CREATION` is the one new setting. Its default is unset; only
the exact string `true` opens parentless creation, and it is for local and
test deployments only. A Worker without `DEPLOYMENT` retains its local
interface. The planner must preserve the intended install bytes, verify
the strict Artifacts register pin, leave the opening setting unset on each
hosted Worker, and redeploy after exact-head review. A GitHub pin alone is
not sufficient for a new deployed register install. Existing deployments
must be checked individually; no deployable or live-acceptance result is
claimed by this preparation. Builder does not deploy.

The proposed route witness signs requests with a fresh key and checks both
fetch entrypoints and the direct route. Its namespace is a labelled
stand-in: any namespace lookup on a refused request fails the assertion.
This protects the absence of object addressing, and is not a claim that a
native SQLite genesis or hosted Worker was exercised. A second witness
checks exact pin/signature binding, malformed opening values and the
explicit local/test opening. At the first source checkpoint, these tests
and the native register-to-directory witness were unrun. Their later focused evidence and
the one-guard control are recorded below. The exact-head gate remains an
obligation before review.

The rest of request `954bf397` remains open: R2 unknown-scope SQLite and
registry admission; R3 pre-fetch/pre-drain authority ordering and the
per-run observation bound; R12 creation/signed-read windows and addressless
join accounting. Planner decision `9d8f12a7` moves finding 3.12 to the R6 request
`0716e75a`. It remains open: shared register versions
1–6 permit the combination of `policy=open` and a `founders` list; demo
versions 7 and 8 already refuse it in their install rule. A coherent new
validation rule must cover direct shared judges and replay, not merely
hide that combination at this HTTP boundary or rewrite old pinned data.
This slice adds no such rule and does not claim that finding closed.

## Native witness preparation after the source checkpoint

Checkpoint `0fd130b6` remains the source-only policy basis. Two additional
native witnesses were prepared but unrun at that checkpoint. The service
binding witness uses a dedicated `CREATION_API` binding, a real register
genesis and the register's judged send to create a directory. It also refuses a differently signed install under the
same deployment pin. The existing creation fixture supplies the clock,
readers and labelled Git-host stand-in; no Artifacts provider is exercised.
The hosted witness enrols a real native agent through the existing registry
and membership fixture, then calls its `create` tool. That agent uses the
production in-process fetch port, rather than the fixture's route override,
and must refuse an unplanned signed install under its deployment settings.

Test-only constructors capture explicit admission settings in native
service and agent environments. `CreationAdmissionService` is a separate
entrypoint used only by this witness after its settings are installed;
existing `PLATFORM_API` users cannot construct it first. The ordinary
`PlatformService` constructor remains unchanged. Each new hosted agent
also captures its fetch-port choice, so later fixture restoration does not
change an existing agent's ports. The opt-in preserves the old fixture
defaults; cases restore their prior settings in `finally`. Agent names are
unique native reservations. This is a sequential fixture assumption, not a
proof of parallel fixture isolation. No production API or timeout changes.
A cheap planned control bypasses the parentless admission guard once in a
separate owned source view: the existing fresh-key route test must fail at
its namespace-lookup sentinel. At that checkpoint, no control or passing
result was claimed. The later allocated focused runs and control are
recorded below; the exact-head gate
remains unrun.

The runtime plan required D1 to land first and integration to add the new
`creation-admission.ts` gate owner to D1's structural inventory and refresh
the changed production route/service owner seals without loosening its
checks. These native witnesses do not close ancestry enforcement, all of
R1 or finding 1.1, R2, R3, R12, or finding 3.12.

## Landed D1 integration preparation

Main `efc79bf1` landed D1 with tree `f5df209c`. R1 integrates that actual
landing in source merge `fef141b1`; the two Worker overlaps preserve D1's
central inventory reference and R1's explicit environment propagation.
The inventory now proposes a conditional `creation` gate for the three
parentless HTTP rows, distinguishing deployed pinned admission from the
explicit local/test opening. Existing route bijection controls stay intact.
The new serving-policy owner and its delegated strict Artifacts pin parser
are added to the reviewed owner list. The four owner placeholders were
initially left pending independent source review and an explicit parser-only
allocation. The closed metadata steps
below supplied their adopted values before the focused runs.

## Owned dependencies and adopted AST metadata

The one owned dependency copy, session `50354`, closes naturally zero.
Its 5,531 leaves, 539 directories, 32 contained relative links and fourteen
workspace bindings retain the reviewed bytes and modes, with no inode
intersection between original and destination files, links or directories.
Original interval and final guards pass. The source exports of the R1
Worker and testing Worker deliberately differ from the CLI origin and are
checked against their own source view. The copy installs nothing and
cleans no cache. The first metadata preparation failure remains preserved:
it had incorrectly required those exported source bytes to be equal.

Root adopts the copy result in `a15f4ff3`. The separately allocated parser,
session `85742`, also closes naturally zero. Its Node child exits zero with
empty stderr; final guards pass, with no installs or retries. It reads the
four reviewed production owners through the owned pinned Rolldown parser
and native addon, applies D1's exact AST normalization, and produces four
seal values. It evaluates no source module, runs no compiler or test and
writes no source or seal file. Root adopts its exact output in `caba9d5f`.
This checkpoint replaces exactly the four placeholders with those values;
the other 24 seals and all three inventory test bodies stay unchanged.

Root separately reports outer copy timing of 53.66 seconds wall, 48.33 user
and 3.56 system; parser timing is 36.86 wall, 34.70 user and 1.16 system.
These shared-host observations overlap inner scopes and are not summed.
Closed evidence, execution helpers and plans are permanently DATA only in
`artroom-r1-copy-parser-closed-release-20261022`; live checkout, dependency,
tool and cache paths are excluded. Python startup and system dynamic
libraries are not fully isolated. No native acceptance, full gate or formal
approval follows from these metadata steps. Focused witnesses and their
single meaningful guard control were still unrun at that point.

## First focused run and canonical fixture correction

The first focused run at `3c60576d` (session `94370`) closed naturally
with exit 1. The three scoped compilers and the three inventory Node cases
passed. The admission phase then closed naturally with exit 1: its first
refusal case passed, but the pinned-register case expected an unavailable
namespace reply and received `refused/unauthorized`. The Native case
remained collected pending/skipped after the first failure; no completed
Native witness was established. The hosted phase was
unrun. Selection used the Scope pool with one worker. The run reported no
unhandled errors or signals, and its source and dependency guards passed.

Both stand-in fixtures used `2030-01-01T00:00:00.000Z`. The shared timestamp
guard requires the canonical whole-second form `2030-01-01T00:00:00Z`, so
the admission guard correctly refused the signed intent's shape before
checking its pin. The first negative pass is therefore inconclusive about
admission policy: malformed shape also required refusal. Both literals are
now canonical; signatures and scope names are recomputed by the existing
fixture. Assertions and production guards are unchanged.

At the canonical fixture checkpoint `e07ebb34`, the corrected test compiler,
three admission cases and previously unrun hosted case still required
execution. Earlier unaffected source-compiler, MCP scope-compiler and
inventory results remained separate first-run evidence. The subsequent
results follow; no exact-head gate, publication or deployment is claimed.

## Corrected focused evidence and its collector qualification

The corrected run at `e07ebb34` (session `68822`) ran only the owning Scope
test compiler, the three admission cases and the previously unrun hosted
case. All three children closed naturally with exit 0. The two stand-in
route cases, the real native pinned-register-to-directory case and the
hosted production-fetch case passed. The Native case took 113 milliseconds;
the selected hosted case took 353 milliseconds, with twelve other hosted
cases explicitly filtered. These are selected-case results, not a full
suite or live deployment result.

The original owner closed naturally with exit 1 because its collector
reported `RuntimeError: Started selection mismatch`. It counted filtered
callbacks as selected starts. That original exit, result, traceback
and raw records remain unchanged. The corrected DATA reconciliation first
partitions every callback and terminal identity by the reviewed selection,
then checks selected results and explicitly filtered states against the
same run's JSON. Root adopts the four actual selected passes in
`1925804e`; this does not turn the original owner into exit 0. The two
unchanged source/MCP compilers and three inventory Node cases remain
separate first-run evidence adopted in `9695d722`.

Source and dependency guards passed. The maintained Scope pool selected one
worker with the original 30-second test deadline. The captured tool and
environment identities, denied runtime overrides and complete maintained
pool compatibility bundle were checked. Dependency changes were confined
to the bounded Vitest result cache. These shared-host observations do not
isolate Python startup, system dynamic libraries or host load. The Git host,
clock and reader fixture stand-ins remain labelled; no Artifacts provider,
parallel fixture isolation or deployed Worker acceptance is established.

## Meaningful admission-bypass control

Root adopted the physically distinct control view in `462dfea0`. It retained
all source bytes and the owned dependency copy, including contained links
and workspace exports. The one allocated control (session `26393`) changed
only the worker admission line to `false &&` in that view and selected the
existing fresh-key refusal case. The test assertions, canonical intent
deadline, Worker configuration and 30-second limit stayed unchanged.

The actual Vitest child closed naturally with exit 1 and no signal. The
selected case failed in 13 milliseconds at its exact namespace sentinel:
`A refused creation must not address an object or its SQLite storage.` The
second case and its callbacks were recorded as skipped. The reporter ended
as `interrupted` under the maintained
`--bail=1`, with zero unhandled errors and no module errors. The expected
assertion diagnostics are preserved; this is not an exception-free run.

The owner closed naturally with exit 0 because it observed the intended
negative control and independently verified restoration. Its `finally`
restored the worker's 50,516 bytes, mode 0644 and original SHA-256. Four
complete guards show the sole temporary worker change, all other source
bytes unchanged, the full 2,738-file source inventory restored, and the
positive view unchanged. Fixed dependency rows and existing directory
identities were preserved; only the bounded result cache changed. Root
adopts this evidence in `f6bcf87b`. Owner exit 0 is the negative-control
interpretation, not a passing Vitest child or a gate result. No test was
retried or positive case rerun in the control view.

Closed raw evidence and physically distinct read-only DATA copies retain
the original exits, JSON, callbacks, expected diagnostics, copy provenance
and restoration records. The DATA observer's initial name-shadowing error
and corrected metadata-only reconciliation are also preserved; neither
repeated the test. Actual source, dependency and tool paths are excluded
from those evidence grants. At that checkpoint, Main integration and the
exact-head gate were on hold for the archive landing. The current integration
still needs its focused checks and one exact-head gate. Full R1, finding 1.1
and descendant current-pin ancestry, R2, R3, R12 and finding 3.12 remain open.

## Integrated gate failure and fixture repairs

The first integrated candidate, `223b4c74` (tree `2e7bed6f`), passed the
four selected admission cases, both owning test compilers and the three
inventory cases. The gate then closed naturally with exit 1: 2,130 cases
passed, two failed and three were skipped across 461 files. Typechecking
and the preceding checks passed. The Node checks and Counting checks
after Vitest were not reached. The original logs and outcomes remain
preserved under assertion `4fcacaa3`; this is a real failed gate.

The observability HTTP fixture set `DEPLOYMENT` to name its metric stream
and created a made-up scope. The new admission policy correctly refused
that creation. Its settings now explicitly enable the local/test creation
opening. Its HTTP correlation and native turn assertions stay unchanged.

The legacy-version clone witness received code 1 from its local bridge.
That bridge collapsed request admission, Node startup and Git outcomes
into the same code and discarded their diagnostic distinction. The CLI
fixture also accepted a nonzero Git version preflight. The original log
cannot establish which underlying phase failed. The repair records
bounded diagnostics without tokens and requires a successful version
preflight. It preserves the clone-success assertion, existing deadlines
and all subsequent replay checks; it adds no retry. These diagnostic
changes did not themselves establish that the clone succeeds. On repaired
head `8dae7497`, the owning compiler and all four affected cases passed.
That focus used Node 26.12.1: the host had removed Node 26.12.0 while the
earlier gate was running. The first attempted focus could not launch its
compiler at the removed path. This transition is evidence of an external
change, not proof of the original clone failure's cause. The original
failure, failed launch and successful focus remain separate evidence.

## Second gate and bounded read repairs

The gate on `8dae7497` (tree `29ee3eb7`) also closed naturally with exit 1.
Its final log records 2,130 passed, two failed and three skipped cases
across 461 files. Typechecking and all preceding checks passed; the Node
and Counting checks after Vitest were not reached. The progress reporter
recorded 22 fewer passing results than the final summary; it is not the
source of the final count. Assertion `8e3b3755` preserves the complete
failure evidence and guards. Source bytes, Git identity and tool hashes
stayed unchanged; only the dependency result cache changed.

The H2/H3/H4 stream test received `404` where it expected `200` after bearer
rotation. Its 30-millisecond wait and stream count did not establish
attachment: the count includes a pending opening, and production correctly
returns `404` when the session ends before that opening attaches. The
helper now exposes the actual response through a nonrejecting `ready`
promise. H4 requires `200` before rotation and before replay/retirement of
the replacement stream. All stream counts, final events, closed-body
checks, bearer checks and deadlines remain. No sleep or retry was added.

The member-display case received the member list but no optional roster.
The client issued both bounded queries concurrently, while the native
query service permits only one pending preparation. A second overlapping
query can therefore be unavailable. The client now completes its member
query before requesting the roster, still once each. It keeps the actual
heads, optional-roster failure behavior and unsigned read path. A held
first query witnesses this ordering at the client boundary; the existing
native case retains its roster-head, two-request, removed-member and
foreign/unjoined assertions.

These are concrete source-level scheduling defects. The failed gate did
not record the missing roster's refusal reason or the exact stream
interleaving, so neither diagnosis claims that historical detail. The
repairs were made only after the gate closed. Their focused checks and
the new head's gate are pending at this commit; the review evidence must
report their actual outcomes separately.

## Third gate and fixture repairs

The focused checks on `40c006c6` passed: two test compilers, four client
cases and the two selected native cases. Its gate then closed naturally
with exit 1: 2,129 passed, four failed and three skipped cases across 461
files. All checks before Vitest passed; later Node and Counting checks
were not reached. Assertion `55c3fb45` preserves the full evidence. Source,
Git identity and tool guards stayed unchanged; only the Vitest cache
changed. The final ledger, rather than incremental callbacks, supplies
these counts.

The native member-display test observed member head 5 and roster head 6.
Two separate reads can legitimately see different heads; the display
contract already keeps both and refuses to infer actions across different
heads. The fixture now checks that each head names its actual native
entry, that the roster exists and that its position does not go backward.
The client witness deliberately supplies different heads and requires
both to survive. The two authenticated reads, removed-member checks and
foreign/unjoined refusals remain.

H8 inspected stream text after a fixed 30-millisecond wait. The helper
now exposes arrival of the complete opening frame across body chunks, or
completion without one.
H8 awaits the actual successful response and that event before checking
the unchanged opening frame. Its session replacement and protocol checks
and test deadline remain.

The Counter custody case counted zero bucket writes because the preceding
floor-reader fixture left the same deterministic application release in
shared R2 storage. The content store correctly reuses an existing checked
release. The floor fixture now deletes its exact release in cleanup and
always releases its owner, even if deletion fails. The custody fixture
requires a cold release before starting; its lost-reply, single-write and
recovery assertions remain.

The Grow long-gap case exceeded its 30-second deadline. Its setup used
811 signed sensor-report acts to create distance beyond the 800-entry
journal window. That padding now uses 811 actual native checkpoints in
one fixture callback, with an exact head-delta assertion. The 12 signed
commands and every tick, hash, cursor, answer and cost assertion remain;
their consecutive positions are also checked. This removes unrelated
sensor authority work from the fixture. The failed run has no subphase
timings, so it does not establish where the timeout occurred. The deadline
is unchanged. These fixture repairs have not yet been executed at this
commit; focused and gate outcomes must be reported separately.
