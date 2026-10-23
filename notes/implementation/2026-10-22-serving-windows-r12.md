# Creation and signed-read serving windows

## Source checkpoint and prerequisites

Request `303772df0b05ec9a1a934f2c97d3596228087f64`, promise
`9792a8f3a8896e363c9e797e5d9299bcbd05e222`, design
`fae962be16afa56da3f4b54b3d5e454430e6ec89`, and adopted ruling
`63352b28cf2060b0885287534a5d42bae74bf032` govern this work.
The initial source-only checkpoint and later owning checks are recorded below.
The planned 49 Native cases and separate standalone Lanes wire case are now
complete across the attributed focused runs, with earlier failures preserved.
The final R12 selection at `b0fd361d` passed Scope.test and its remaining
21 cases; the standalone Lanes case then passed at `4314ac52`. Both original
owners closed naturally with stable input guards. Actual default-startup
measurements for Page and both hosted MCP clients need no default adjustment.
The original exact-head gate at `386ef9cc` has now failed, as recorded below.
The fixture and documentation corrections are committed. The maintained Page
build and separate DATA comparison have passed. The affected follow-up passed its
three compilers and 42 cases, with one Lending failure and the exact recorder skip.
After the reviewed fixture correction, Scope.test and both cases in the whole
maintained-projection file passed at `b7919b65`. The healthy earlier files and
exact intentional skip are carried from their original runs. The downstream
Node 36 and Counting 55 stages then passed at `179181cb2`, with stable full
guards and no signals or collector errors. The original gate remains a failed
run. These attributed continuations complete the planned local checks without
claiming one successful gate at the final head, a deployed service or completion
of the separate R1/R2 operator obligations.

The original standalone counter checkpoint `2a482115` was prepared on R1
`1793ca7d`, before the index/ancestry union. Its frozen review copy remains
historical evidence of that smaller boundary. The current isolated integration
starts at reviewed R1 `de1a0546`. Prerequisite commit `873c285e` adds the exact
22 released R2/ancestry paths, preserving the other 2745 base paths and the
final R1 fixture corrections. Its source provenance is ancestry promise
`c40215792d6f5b19fee546c1e9f8308de315da55` and source review `21c42b7f`.
R12 checkpoint `70eeae1e` then passed independent source review `20a277e2`,
with the ancestry reviewer’s self-authorship qualification retained. Integration
merge `1a604bcb` preserves that history and operator commit `2d22e6f4`, adding
exactly its seven independently prepared paths. Every other `70eeae1e` Git path
is unchanged. This source union is not a Main landing or runtime acceptance.

## Fixed owner and admission order

One deployment's fixed `ScopeIndex` object owns one `ServingAdmission` instance.
Its separate `admitServing` method verifies the original bounded signature and
updates memory synchronously; `has()` and registration retain their existing
index/ancestry behavior. No serving counter is written to SQLite or a journal.
There is no new HTTP route, admin API, caller-supplied configuration or claimed
actor parameter on the serving RPC.

Shared `api` creation and signed reads, `ScopeService`, and the HTTP item-query
shortcut call that fixed object once before target lookup, R1 proof work or
native judgment. Creation first owns the bounded parentless signed value.
Signed reads first pass their existing bounded envelope form. Signature custody
is not native authority: admitted requests still face the original checks, and
invalid custody earns no claimed-key charge. Creation keeps the original R1
or native refusal after invalid custody rather than inventing another native
judgment. Missing bindings, invalid settings and failed serving RPCs close
eligible serving. Local/open creation is not a rate-limit bypass.

Only actual edge fetch adapters supply the transport address. Synthetic route,
service and hosted calls use null, regardless of forwarded headers. Address
keys retain the existing IPv4 and IPv6-/64 normalization. A null address does
not create a shared bucket. Read sessions and verified internal child sends
retain their existing paths. Signed streams and signed application projections
remain unsupported rather than gaining authority from a serving decision.

## Counter scope and bounds

Creation defaults to 10 attempts per verified key and 30 per trusted address
per hour. Signed reads default to 240 per key and 600 per address per minute.
The explicit nonsecret settings in each production Worker configuration are:

- `SERVING_CREATION_KEY_PER_HOUR`
- `SERVING_CREATION_ADDRESS_PER_HOUR`
- `SERVING_READ_KEY_PER_MINUTE`
- `SERVING_READ_ADDRESS_PER_MINUTE`

Absent overrides select the reviewed defaults. Only positive decimal integers
up to 1000000 are accepted; malformed values close serving. Durations and the
8192-window aggregate capacity are not deployment overrides. No request,
signature, target identifier or header is retained in these tables.

Each represented key/address pair is accounted in one synchronous action.
Attempts denied by an existing limit still count, saturating at limit plus one.
Both missing identities must fit before either is allocated. Capacity refusal
makes no partial allocation, does not discard an active counter, and is not a
native judgment. Only expired windows make room. Fresh-key churn cannot evict
a live address counter. A monotonic local clock reading prevents a backward
host-clock step from reordering or resetting windows. An actual object restart
or eviction loses all counters. A full table can deny new identities until
expiry; these are explicit availability and durability limits.

Invalid signatures can charge a real trusted address but never the key claimed
in their bytes. The fixed owner independently verifies signatures; the internal
counter's actor argument alone proves nothing.

## Membership-local join failures

The original per-membership failed-address window, its oldest-address eviction
and waiting bound remain. A separate bounded key table now counts failures
after outer signature verification, including null-address service and hosted
calls. Failed invitation form, native misaddressing and invitation refusal count
by the verified key; successful joins and other native refusals do not. Forged
signatures cannot charge a claimed victim. This is not a deployment-wide join
window and no counter is keyed by an invitation.

The key table has the existing configured window bound separately from the
address table. It expires old entries and refuses a new key when full instead
of evicting an active key. Concurrent waiting joins do not reserve new key
slots; if another join fills the table, later new-key attempts fail closed.
Existing address-window diagnostics keep their original shape. Restart loses
both memory tables. No historical membership rule or invitation state changes.

## Public wire reason and kernel boundary

The existing creation `unavailable` union already permits `rate-limited`.
Creation now maps it to HTTP 429; join wire status stays unchanged. Signed read
and item-query refusal unions gain `rate-limited` and HTTP 429. Ordinary client
codecs, CLI read status and MCP error presentation recognize that typed reason.

This contract addition follows `docs/kernel.md` section 7: clients on different
hosts must distinguish a serving limit from native `forbidden` through the
same typed wire result, without parsing a host-specific error. Counters,
defaults, placement and trusted transport metadata remain platform code. No
historical native rule, grant, pin or judgment gains this serving reason.

## Written witnesses and remaining evidence

The standalone controls cover defaults, invalid settings, pair accounting,
expiry, capacity churn, address normalization, backward clocks and instance
reset. Added owning witnesses cover verified signatures versus forged victims;
HTTP/service once-only admission before target traps; the direct query-items
shortcut; shared actual fixed-object service/HTTP accounting; actual object
eviction and unchanged SQL schema; and genuine native invitation refusals
through service and hosted MCP paths. Named transport answers in the smaller
controls remain stand-ins. Hosted Git, clock and token setup retain their
existing fixture qualifications. No witness has run at this checkpoint.

Heavy existing native fixtures explicitly use high finite limits of 1000000
through shared test configuration. Their helper supplies the actual fixed index
binding; it does not disable admission. Separate small-limit fixtures exercise
2/3 thresholds. Neither fixture setting is evidence that the adopted defaults
support startup. The first source packet kept changed D1 owner seals null. The subsequent
owning parser computed 14 unique owner values. Root adopted those exact values
as structural tripwires, including the same object value in both maps. All
other seals remain unchanged. No inventory-test or native success is inferred
from those computations.

Actual Page and MCP startup signed-read counts remain unknown and required.
The future allocation must use a fresh fixed owner at the adopted defaults,
without the heavy-fixture overrides. Capture real Signed request admissions,
including failures, for the actual Page `startRoom`/`openRoom` flow and its
initial selected view, and for an actual hosted MCP initialization plus initial
repository/tool bootstrap. Record counts per verified key and actual trusted
edge address, with addressless hosted calls separately identified. Preserve
session versus Signed classification and the existing fixture/provider limits;
a page HTML request or a synthetic counter loop is not startup measurement.
If either path exceeds one third of a read default (80 per key or 200 per
address), report the measured path and adjust the defaults under the planner's
rule before review. Do not guess counts from this source.

The owning Node 26.12.1/npm 11.20.0 offline install ran once and exited 0
(2.26 seconds portable wall time; 1.24 user and 1.24 system). The original
lockfile and all 2777 tracked source bytes, modes and identities stayed exact;
the standard owning lock stamp was written. Npm warned that four install
scripts were not allowScripts-approved. No approval or second install was
attempted. The maintained compatibility patch and actual owning parser each
ran once and exited 0. These are setup/parser results, not tests. Their closed
DATA review is `artroom-r12-serving-owning-setup-review-20261022-v2`; the first
metadata preservation attempt stopped before copying because it compared
read-updated atime. Correcting that copy guard repeated no setup command.

Root subsequently authorized source preparation of isolated default-owner
startup witnesses. Those must be independently reviewed before execution.
Allocated focused checks, one final exact-head gate
and checker review remain required. The planner owns rollout/readbacks for the
three Worker configurations after the R1/R2 prerequisites. Nothing in this note
claims hosted load capacity, durable accounting or a deployment result.

### First owning inventory result and model correction

At checkpoint `7166130ae`, the one allocated inventory command naturally exited
1: all three cases failed with `ReferenceError: presentsSignedRead is not
defined` in the maintained extracted router model. Source and dependency guards
stayed exact. The owner’s earlier preflight had rejected regular npm-created
hardlinks before any Node invocation; no dependency was repaired or reinstalled.
The failed run is preserved separately under `048bb2f5` and its finite DATA
release. It was not a Native authority or application runtime result.

Root reviewed the two-line model correction: load the actual `SCHEME` and
`presentsSignedRead` declarations through the existing source extraction helper,
then supply that predicate to the extracted router. Session-witness structural
probes still do not invoke or fabricate serving admission. The correction changes
no production path, default, signature check or gate class. Its separately
allocated changed-source inventory run remains pending at this source checkpoint.

At changed-source checkpoint `da11133d7`, the next allocated inventory command
naturally exited 1 with two passing mutation controls and one bijection failure.
The predicate dependency was fixed. The remaining extracted hosted model omitted
`POST /mcp/agents`: its new R2 index check caught the absent `scopeIndex` helper
and returned 404 before the modeled control dispatch. The docs row was present.
All source and dependency guards stayed exact. Both failures remain evidence.

Root approved loading the actual `SCOPE_INDEX_NAME` and `scopeIndex` declarations
through the same extraction mechanism and supplying a separate known-index
stand-in. The stand-in asserts the fixed name and exact witness membership lookup.
It establishes structural reachability only, with no native index or authority
claim. Matcher, control dispatch and docs rows are unchanged. This correction is
source-prepared; a further inventory invocation requires its own allocation.


### Owning inventory closure and default startup source

The next separately allocated inventory run at `3fbb4003c` naturally exited 0:
all three original inventory cases passed. Its raw output retains the Node
TypeScript extraction warning. All captured source, dependency, tool, lock and
head/tree guards stayed exact. Root adopted that result as `07d0f3a6`. The
first two failed inventory runs and the earlier preflight refusal remain
separate evidence; this pass does not rewrite them or prove Native authority.

The startup measurement is now source-prepared for independent review. A
test-only `StartupServingIndex` omits all four heavy fixture overrides before
calling the original fixed owner's constructor. Its override invokes original
admission exactly once, then records bounded public key/address counts and
verdicts. Extra custody verification and scalar bookkeeping are observer work,
not a throughput or per-request CPU measurement. It keeps no signature, bearer,
session token or private key. Overflow, a reset during measurement, or a phase
lasting a minute makes the report incomplete.

Both setup registration callbacks and actual callers use that same separate
namespace. The tests join actual native callbacks, prove the registered row
exists, evict the fixed owner, and prove the row survives while its memory
instance changes. No test inserts an index row. Generic high-limit fixtures
keep their existing settings and namespace.

The Page witness uses the real Start custody workflow and native web cohort
(register 8, Directory 7, Membership 2, Rules 4 and Destination 3), followed by
the two actual `openRoom` calls made by Start's result verification and the
initial draw. It includes the retained-register eligibility read, initial
Issues data functions and fresh initialization check from `main.ts`. It does
not execute a browser or DOM. Storage, the single-task Web Locks adapter,
response URL metadata, Git host and scheduler remain named local fixtures.

The two hosted MCP witnesses use genuine register 17, Directory 16, Membership
8, Rules 10, Destination 12 and Inbox 1 setup, real invitation/enrolment, then a cold
agent's pinned Client connect, listTools and initial room call in each supported
wire revision. Actual post-phase Native summaries assert the cohort; there is
no unsupported-cohort fallback. The existing fixture clock, scheduler and local
Git are not a hosted provider.

Owner admission counts and actual native RPC reader classes are reported
separately. Zero Signed reads is valid when sessions served the actual path;
the tests do not synthesize extra Signed requests. These addressless paths
report null transport addresses. The report precedes threshold assertions and
names every observed per-key/address count. More than 80 signed reads per key or 200 per address requires a planner
adjustment, not a silent increase. Creation counts remain diagnostics; no
creation one-third acceptance threshold is imposed.

These startup cases have not compiled or run. Their counts, current cohort
compatibility and completion within the unchanged 30-second case allowance
remain unknown. Source review, allocated owning compilers and focused Native
checks, then one exact final-head gate and formal review remain required.


The first startup source packet remains frozen. Independent review found two
mandatory corrections before execution: its adjustment predicate incorrectly
included creation counts, and its immediate lifetime release could reset the
namespace while an outer continuation or native callback was still live. The
second source delta restricts adjustment to the adopted signed-read thresholds.
It also gives each measurement a sole owner: stop new measured work, track the
complete caller phase and dispatched fetches, join those continuations and the
known native scopes' actual scheduled callbacks before the AFTER snapshot,
then close the Client and join again before resource release.

The existing native lifetime's externally finished mode and known-platform
registry are reused from reviewed archive source. Ordinary fixture callers
keep automatic release. Only startup opts out and supplies the sole finish
hook. Teardown has one 7.5-second bound, below the maintained hook allowance; it
does not extend the 30-second case deadline or cancel native work. If joining
is incomplete, it fails with ownership retained. Identity-checked reset cannot
clear a later owner. The first case error remains primary when cleanup also
fails. No execution has tested these lifecycle changes.


The second startup source review closed those two findings but found an observer
coverage gap: operational `api.at` forwards reads as one `observed(method, args,
identity, httpPublic)` RPC. The observer had ignored that envelope. The third
source delta unwraps only this exact bounded shape once, checks the maintained
method allowlist, and classifies its existing reader argument. It neither
changes nor copies the forwarded RPC arguments, return value or error. The
original fixed-owner admission count remains separate. An added cheap observer
control covers direct/enveloped equivalence, once-only counts, original argument
identity, result/error forwarding and malformed/nested envelope refusal; its
written target is explicitly not a Native authority witness. It is unrun.

The callback join describes the named timer-off fixtures, not universal native
quiescence: the test MCP ports and local setup service use their existing no-op
`every` adapters. Actual caller promises, dispatched fetches and known-scope
scheduled callbacks define this measured boundary. No claim covers arbitrary
unregistered background work, hosted SSE traffic or an autonomous deployment.


### First bounded owning compiler result

After the reviewed startup checkpoint `4b8152a63`, current Main `25e1248e9`
was merged into the isolated candidate as `a55c6a122`, tree `f31db5877`. The
merge added only Main's roadmap/succession note changes and preserved the
serving, operator and ancestry source. Main itself was not changed.

The first allocated maintained focused pipeline, original owner 36962,
naturally exited 1 at the Scope production compiler: 14 diagnostics. The six
remaining compiler roots and all four CLI operator cases were unrun. Both
outer complete-input guard observations passed, with no signal or owner
failures. The original raw compiler log and command ledger remain evidence;
this was a compiler failure, not a Native or startup-count result.

The narrow source correction explicitly types the expected cohort pin, uses
required bracket syntax for SQL/RPC index-signature properties, and omits
undefined optional fields from the copied index environment. The lookup,
cohort, mode and ancestry predicates are unchanged. No check is cast away or
weakened. This correction has not compiled or run.

Both changed owners have existing D1 tripwires: `creation-lineage.ts` and
`scope-index.ts`. Their existing seal entries now require revalidation against the changed
source. The map retains the old values until an owning parser run is
allocated and its actual outputs are adopted; no changed normalized hash or
replacement value is guessed.

Root observed the outer portable time as 3.46 seconds wall, 2.51 user and
0.98 system; the owner recorded 3.43418 seconds internal elapsed. Its nested
pipeline time was 1.12 wall, 1.45 user and 0.38 system. The Scope compiler's
portable time was 0.58 wall, 1.08 user and 0.18 system. These scopes overlap
and must not be added. No automatic retry or additional runtime followed.


The root-allocated two-owner maintained parser, original owner 81519 under
`6cb67a87`, naturally exited 0. Its complete before/after snapshots are equal
to the reviewed current-source baseline, and both changed owners still match
those source identities. Only their two D1 map values are now adopted:
`creation-lineage.ts` is `fc478ab58d801383fc29f1cab65bd03fc6aa07118a0d6c8376bafe2ead03b404`;
`scope-index.ts` is `b7f06b9365c88e0d7cd9ac27927c994e0cad52156dcd15d286fee60dca469a1c`.
All other seal values and the inventory model are unchanged. The retained
`stripTypeScriptTypes` warning is not suppressed. This is structural parser
evidence, with no compiler, Native authority or startup-count acceptance.

The parser owner's inclusive elapsed was 2.191600958 seconds, with 0.936018
user and 0.643586 system seconds. The nested parser command's portable time
was 0.11 wall, 0.11 user and 0.02 system; these scopes are not additive. The
original 14-diagnostic compiler failure remains separate. A fresh seven-root
compiler/four-case CLI plan is required at the new checkpoint; no inventory
repeat is justified by the seal-value-only update.


### Scope test compiler result and narrow fixture correction

The fresh allocated owner 75948 naturally exited 1 at checkpoint `615c1b553`.
Scope production compiled successfully; Scope test reported seven diagnostics.
The five remaining compiler roots and all four CLI cases were unrun. Complete
outer input guards passed before and after, with no signal or owner error.
The original results, logs and first failure are preserved without a retry.

The correction supplies `ignoreBOM: false` to the strict UTF-8 manifest decoder,
matching its existing default while satisfying the Workers ambient type. The
three negative fixture incarnations now supply the required 16 random bytes;
the unknown-membership lookup supplies the existing port's finite seconds
argument. Test wiring includes an optional genesis-registration callback only
when one exists, preserving the same callback and omitting undefined optional
properties. No admission, lineage, signature or manifest predicate is weakened,
and no type check is cast away. These corrections have not compiled or run.

The four changed source files are outside both D1 owner maps, so no seal value
is changed or guessed. Scope production source and its imported graph are
unchanged by this CLI-decoder/test-only delta; its successful compiler result
can carry forward. The next bounded plan should begin with the failed Scope
test root, then the five still-unrun roots and the complete four-case CLI file.
Full repository typecheck, Native admission and default startup measurements
remain pending.

The owner recorded 4.121471417 seconds inclusive elapsed, 5.567195 user and
1.258870 system seconds. Root observed outer portable time of 4.15 wall,
5.59 user and 1.26 system. Scope production's nested command recorded 0.28
wall, 1.09 user and 0.13 system; Scope test recorded 0.59 wall, 2.78 user and
0.21 system. These overlapping timing scopes must not be added.


### MCP Native callback context compiler correction

Original owner 73302 naturally exited 1 at `3e870e905`, with complete input
guards stable and no signal or owner error. Scope test, CLI test and MCP Node
test compiled successfully. MCP Native compilation stopped on one diagnostic:
the parameterized startup case used `test.each`, whose callback receives the
case value without a test context. Page Native, Lanes Native and the four CLI
cases were unrun. The original failure and successful compiler phases remain
preserved separately; no test body or startup measurement ran.

The narrow correction uses the maintained `test.for` callback API to receive
both the revision and its actual test context. Both revisions, the formatted
case titles, callback body, limits, cleanup and diagnostic metadata assignment
are unchanged. The installed runner source formats both APIs' scalar case names
with the same `formatTitle` path; `for` then supplies `(item, ctx)` to the
callback. No cast or synthetic context is introduced. Only this test and the
note change; no D1 owner seal is affected. The passed compiler roots retain
unchanged graphs. The next bounded plan needs only MCP Native, Page Native,
Lanes Native and the still-unrun complete four-case CLI file. This correction
is source-only and has not compiled or run.

The owner recorded 4.681386833 seconds inclusive elapsed, 9.520486 user and
1.751822 system seconds. Each nested compiler observation remains in the
original command ledger; these overlapping scopes must not be added.


### Page creation-offer fixture compiler correction

Original owner 12752 naturally exited 1 at `b9cc5a331`. MCP Native compiled
successfully. Page Native compilation stopped on one diagnostic: the generic
client `Fetch` type intentionally omits redirect options, but the creation-offer
fixture forwarded its explicit manual redirect mode through that annotation.
Lanes Native and the four CLI cases were unrun. Complete input guards remained
stable, with no signal or owner error. The original results and compiler log
are preserved; no test body or startup measurement ran.

The narrow fixture correction dispatches that creation-offer request directly
through the same owned `wait`, `new Request` and actual Worker fetch used by the
native adapter. It retains the original manual redirect mode and all supplied
request fields, including the abort signal. The adapter still asserts the
client requested redirect-error mode; direct Worker dispatch follows no redirect.
Its existing response URL and redirected metadata remain labelled fixture
values. No cast, product fetch-type change, redirect-policy weakening or new
transport is introduced. Only this test and the note change, with no D1 owner
seal impact. MCP Native's passed source graph is unchanged. The next bounded
plan needs Page Native, Lanes Native and the still-unrun complete four-case CLI
file. This correction has not compiled or run.

The owner recorded 3.346906750 seconds inclusive elapsed, 5.232186 user and
1.187648 system seconds. Page compilation's nested portable time was 0.45
wall, 1.87 user and 0.17 system seconds. These scopes overlap and must not be
added.


### Lanes test Worker binding correction

Original owner 44322 naturally exited 1 at `66f275552`. Page Native compiled
successfully. Lanes Native compilation reported five missing `SCOPE_INDEX`
binding diagnostics in its graph/room helpers and imported Scope helpers. The
four CLI cases were unrun. Complete outer input guards passed without signals
or owner errors; the original results and compiler log are preserved.

Source inspection found an actual fixture wiring gap: the Lanes Worker exported
and bound only its two native scope classes, while its updated route helpers
and those classes' deployed registration callback require the fixed ScopeIndex.
The correction exports that existing production class through the test Worker,
binds `SCOPE_INDEX` to it with a separate SQLite-class migration, and declares
that real binding in the Lanes environment. It does not add a type-only phantom
binding, cast, alternate authority or production bypass.

The Lanes shared-isolate suite reuses its existing fixture keys across many
scenarios. Its test-only configuration now explicitly selects the same four
finite one-million attempt limits as the Scope fixture configuration. This is
heavy-fixture policy, not evidence about adopted defaults. The separate actual
Page/MCP default-startup owner and its default-limit assertions are unchanged.
No runtime result is claimed for this new fixture binding. The three fixture
configuration files and note are outside the D1 owner maps; no source seal is
changed. Page Native's passed source graph is unchanged. The next bounded plan
needs only Lanes Native and the complete four-case CLI file. The ordinary root
gate runs lane cases through the Scope Worker/configuration; it does not prove
the standalone Lanes Wrangler binding. A separate remaining owning smoke must
run the whole existing `graph-wire.scope.test.ts` file with
`apps/room/lanes/vitest.scope.config.ts`. That single HTTP/native graph case
covers the standalone Worker, actual office creation, native registration and
subsequent issue/change reads. It is not yet allocated or run; no whole-suite
repeat is proposed.

The owner recorded 4.344166958 seconds inclusive elapsed, 5.468476 user and
1.399874 system seconds. Lanes compilation's nested portable time was 0.51
wall, 2.00 user and 0.22 system seconds. These overlapping scopes must not be
added. This correction is uncommitted and unrun pending source review.


### First Native result and fresh-key join witness correction

Original Native owner 17022 naturally exited 1 at `58ed5f95b`, with its child
also exiting 1. Complete input guards stayed stable; there was no signal or
owner error. The first three hosted cases passed: H1 on Register3 and Register10,
and the production parentless-admission case. The fourth case failed: all three
joins returned `key-in-use`, where the witness expected two native invitation
refusals followed by the serving limit. The remaining 45 cases were pending,
with no acceptance. The original RPC-result-not-disposed warning after the
first H1 case is preserved separately; it is not suppressed or treated as a
passed lifecycle check.

The setup had enrolled the hosted agent's key before asking it to join that
same Membership. Native membership correctly checks existing keys before the
invitation secret. A hosted agent's configured repository also refuses a join
of another Membership before dispatch. Revocation does not make its old key a
fresh identity. The former fixture therefore could not measure the intended
failed-invitation counter; its reason oracle was wrong for that setup.

The corrected witness keeps one actual hosted-bearer join and strictly expects
its earlier `key-in-use` refusal. Two separately generated, unconfigured
`McpService` signers then call through the actual production Worker, with no
transport address. Actual native Membership observations must independently
report both keys unknown before those calls. One fresh key must receive exactly
two `invitation-refused` answers and then `rate-limited`; the second must still
receive `invitation-refused`. The Membership head must remain unchanged across
both paths. The case is renamed to distinguish fresh MCP services from an
enrolled hosted bearer. Provider, clock and custody remain the existing named
fixtures. No native policy, reason oracle, counter limit or authority check is
weakened, and no native row or authority answer is injected.

Only the hosted test and this note change. The proposed full-file ledger keeps
49 cases and changes exactly this one title and its source hash; the original
run's ledger and results remain unchanged. This correction is uncommitted and
unrun pending source review. The seven compiler results and separate CLI pass
remain preserved; changed MCP Native test source needs its owning compiler
again before a later Native allocation. The owner recorded 10.350544541 seconds
inclusive elapsed, 9.254778 user and 2.102654 system seconds, overlapping its
nested child timings.


### Initial startup-index activation before eviction

At `ad971f40`, original Native owner 81866 and its child naturally exited 1
with stable full guards. The MCP scope compiler and first four hosted cases
passed, including the corrected fresh-key join witness. The fifth case, the
legacy default-startup measurement, failed at its first
`evictDurableObject(index)`: that fresh index object had not yet been running.
The remaining 44 of 49 cases had no acceptance. The original RPC-disposal
warning remains preserved; it is not a passed lifecycle check. Root recorded
10.651252416 seconds inclusive elapsed, 10.862336 user and 2.261956 system;
the outer timing was 10.69 wall, 10.89 user and 2.26 system. These scopes
overlap and must not be added.

Both the MCP and Page startup fixtures now read the existing bounded
`startupSnapshot` through `runInDurableObject` before their initial eviction.
This instantiates the actual object without admitting a request, registering
a scope or writing an index row. The initial eviction still resets its memory;
the later genuine setup, registered-row checks and second eviction before the
measured phase are unchanged. The actual instance-change and default-limit
assertions remain. No eviction failure is caught or treated as a reset.
This three-path fixture/note correction is source-only and unrun; owning
compilers and a later allocated Native run remain pending.

Root source review `b53fe7459092b6fe9a9683538b6920298cfe4fa7` read the
three-path delta and the actual snapshot/index constructors with no finding.
This is source review; owning checks and Native acceptance remain pending.


### Local creation derives its address from the changed intent

At `4a1fbd55`, original owner 56853 naturally exited 1 with stable full guards.
The MCP and Page scope compilers passed. All 16 hosted cases passed, including
the legacy default-startup measurement with three Signed admissions and
12 dispatched Session reads, and the modern measurement with two Signed
admissions and eight dispatched Session reads.
Both measurements were complete under actual read defaults 240/600 and
required no adjustment. These are local Native/fixture observations, not
hosted deployment or browser results. The original RPC-disposal warning and
eight scripted-reset exception records remain preserved.

The first creation-admission case then passed. The second failed at line 55:
the local/open API correctly addressed the scope derived from the changed
intent, but the fixture expected the original intent's scope. Changing
`idempotencyKey` changes the intent digest and therefore the seed's cause
and scope ID. The fixture now derives the changed seed's scope ID, asserts
that it differs from the original, and expects that exact local address.
Pinned/deployed refusals, no-target assertions and the unconfigured serving
refusal remain unchanged. No product admission or derivation changes.

That original run recorded 17 passes, one failure and 31 pending cases. Root
recorded 39.297265 seconds inclusive elapsed, 39.045274 user and 5.578111
system; outer time was 39.33 wall, 39.07 user and 5.58 system. These scopes
overlap. This two-path test/note correction is uncommitted and unrun pending
source review. The unchanged complete hosted file is excluded from the next
selection; the remaining nine whole Native files contain 33 cases, after
the affected Scope test compiler.


### Exact unavailable lineage proof keeps its retry answer

At `1925355e`, original owner 60187 naturally exited 1 with stable full guards.
The Scope test compiler and both creation-admission cases passed. The first
creation-lineage case then failed at line 118: its mutation table expected
`routing/not-found` for every altered source, but an unavailable exact proof
returned `retry/dependency-unavailable`. Thirty later cases had no acceptance.
Root recorded 8.815165 seconds inclusive elapsed, 9.662884 user and 2.301105
system; outer time was 8.85 wall, 9.69 user and 2.30 system. These scopes
overlap. The complete hosted results and warnings remain carried separately.

The exact proof sender returns null when its requested hash differs from
stored metadata; the raw birth port likewise returns no matching birth for
another full incarnation. Neither null reply supplies authoritative bytes
that distinguish an unauthorized source from unavailable or archived custody.
The admitted lineage wrapper already preserves that distinction: missing
proof is transient retry, while a readable source that contradicts the
claimed send is a refusal. No product change is needed.

The fixture now uses four labelled, exact expected answers. Altered ordinal
and message remain `routing/not-found`; altered exact hash and incarnation
require `retry/dependency-unavailable`. All four still require zero target
name/get calls and zero forbidden unknown-ancestor addressing. It does not
accept either answer interchangeably or weaken a proven refusal. Both
approved cohort journeys and all original deadlines remain. This test/note
correction is source-only, uncommitted and unrun pending review. The next
selection needs the Scope test compiler and remaining eight whole Native
files with 31 cases; the complete hosted 16 and creation-admission two are
carried without rerunning them.


### Review correction and Main dependency integration

Source finding `0cb77f209810d4e72755324000e378ed556a9e18` identified an
error in the preceding source-only incarnation classification. This fixture
changes only `from.at.inc`, leaving `seed.creator` unchanged. Their equality
is checked before any birth read, so this mutation proves a creator mismatch
and must return `routing/not-found`. The earlier source review and my draft
missed that guard. The third row now has that exact refusal and the label
`creator incarnation mismatch`. Wrong-hash custody alone retains its retry
answer; ordinal/message refusals and all zero-target assertions remain.
The prior incorrect source checkpoint remains in history; no test ran on it
after the finding. This correction is unrun pending source review.

Reviewed Main dependency landing `dac76e3d6a736616628a3027a68a87b73cb27a47`
is merged as `daa7263ad96a8e190d766692c9211c0fdb5c35fa`, without conflicts.
Its 15 dependency/runner paths had no overlap with this branch's changes.
The authorized actual `npm ci --no-audit --no-fund` naturally exited 0 in
2.440248 seconds, with 1.312071 user and 1.924978 system seconds. All 2,780
tracked source descriptors and the lock stayed exact during installation.
Vitest is now 4.1.12, Vite 8.3.5, Rolldown 1.2.15 and PostCSS 8.5.31.
Two earlier metadata-only preflights stopped before any npm process began;
their failures remain preserved, and no install was retried.

The required maintained Cloudflare pool 0.22.0 compatibility preparation
then ran once and naturally exited 0 in 0.087637 seconds, with 0.062796 user
and 0.015607 system seconds. The known bundle hash changed from
`8d3d115037c749cce1e8cb26bc70ba08e215aaaa357e4eae9f0c1577277c5855` to
`cd50d18adce92adb54a3f00410d646b2fe09b3f12c5b833c492bcf5857621b39`.
A full dependency namespace comparison found only that factory-bundle change;
source stayed exact. The dependency lock stamp is refreshed. This is normal
dependency setup, not a test or a tool probe. A fresh binding must use these
actual inputs and the exact 4.1.12 reporter pin. Scope.test and the remaining
eight whole Native files/31 cases still await allocation; complete hosted16
and creation-admission2 results remain carried separately.


### Register-17 declared-child fixture projection coverage

The next focused owner at `e694ab8` naturally exited 1 with stable input
guards. Scope.test passed, followed by the first four creation-lineage
cases, including the corrected exact mutation answers. The fifth case
stopped while packing its register-17 TEST application, before native
lineage admission: the version-2 package validator requires a schema-bound
projection for every declared definition, but this helper supplied none.
The refusal is `application-package-closure`. The remaining 26 selected cases, starting with the sixth creation-lineage
case, remain pending; no additional whole file is accepted.

The fixture now supplies a root projection bound to its exact definition,
`root` item, `ready` state and optional `child` lane reference. It reuses the
ordinary packet's existing child projection for the unchanged child
definition. Definition bytes, static create edge, capability bounds, roles,
empty supported presentation views and the strict package validator are
unchanged. This is a fixture-only correction, unrun pending source review.
The next focused selection remains Scope.test and the eight whole Native
files/31 cases, with hosted16 and creation-admission2 carried separately.


### Addressless join fixture setup barrier

The next focused owner at `e8ccccaf` naturally exited 1 with stable input
guards. Scope.test passed, and creation-lineage six and health four passed
as complete files. The second limits case then failed its unchanged-head
assertion: membership moved from sequence 4 to 5 while the invitation
remained invited. This run recorded 11 passes, one failure and 19 pending
cases. Its saved evidence does not identify entry 5's exact input, so it
does not prove what moved that head.

The addressless fixture omitted the setup barrier already present in the
later real HTTP case. Seating the first member emits a genuine inbox create;
that result/confirmation can finish after first-key. The correction settles
the membership and that exact created inbox before issuing the invitation
and pinning the membership head. It also requires the inbox's actual summary
to report active, proving setup reached confirmation. A delayed inbox result
is consistent with the observed head change, but remains a source-supported
diagnosis rather than a captured entry-5 fact. All exact two native invitation
refusals then rate-limited, independent-key, unchanged-head and invited-state
assertions remain. No product policy, threshold or deadline changes. This
fixture/note correction is unrun pending source review; later selection must
carry completed files separately and bind the remaining work explicitly.


### Completion of the planned Native selection

The fresh focused owner 9619 at `b0fd361d` naturally exited 0. Its Scope.test
compiler and all remaining six whole files/21 Native cases passed; the full
input guards were stable. Root recorded that original closure and result in
`3447483c9bfee52d9f3ec3b491693a6d86ee7279`. The real inbox setup barrier
therefore leaves both invitation refusals, the third rate-limited answer,
independent-key check and strict unchanged-head/invited oracles passing.
It does not retroactively establish entry 5's exact cause in owner 76711.

The complete planned selection is now accounted for by whole-file results:
hosted MCP 16, creation-admission two, creation-lineage six, health four and
the final six files/21 cases: 49 passed across the separately attributed runs.
This is not a claim that all 49 ran together at this head. The original
compiler, inventory, setup and fixture failures remain above, with their raw
results retained; later passes do not erase them or turn their pending cases
into earlier passes. No whole suite or gate has run after this correction.

The Page default-startup witness recorded 10 Signed admissions at the fixed
owner and 24 dispatched native reader calls: 13 Session summaries, two Session
item queries, seven Signed summaries and two Signed entries. Thus its dispatch
observer saw 15 Session and nine Signed calls, not 24 Session reads. Owner
admissions and actual native dispatch are distinct observation boundaries;
these counts do not assert a one-to-one relationship.

The original hosted log records legacy startup with three fixed-owner Signed
admissions and 15 native dispatches: 12 Session summaries and three Signed
summaries. Modern startup has two fixed-owner Signed admissions and 10 native
dispatches: eight Session summaries and two Signed summaries. Session reads
are not additional Signed counter charges. Each measurement completed under
the actual default read thresholds 240 per key and 600 per address, with
8192 windows and no default adjustment. Creation
limits remain 10 per key and 30 per address per hour; creation counts are
diagnostics, not a new startup threshold. Actual hosted addresses remain
null. These are bounded local native workflow measurements, not browser DOM,
production traffic or performance results. The prior RPC-disposal warning
and eight scripted-reset exception observations remain retained and qualified.

One separate standalone Lanes `graph-wire.scope.test.ts` case must still run
in that package's own maintained Worker/configuration, preserving its original
deadline and labelled graph authority/readers/peers. It checks SELF HTTP
creation, detached README and declarations, and confirmed issue/change children;
it is not a real Git-provider or production-authority proof. After that
owning check, one final gate must run at the exact reviewed clean candidate.
No gate, formal review, Source publication, Main landing or deployment is
claimed by this focused completion note.


### Standalone Lanes closure before the final gate

The separately allocated owner 82139 at `4314ac52` naturally exited 0, with
all input guards stable. Its entire `graph-wire.scope.test.ts` file passed:
one original case through the maintained standalone Lanes Worker and
configuration, without compiler repeats or test-name filtering. Root read
the original result and body at
`/private/tmp/artroom-r12-lanes-smoke-evidence-20261022-v2`.

The owner recorded 5.811870416 wall seconds, 4.402176 child user seconds and
1.377644 child system seconds. The separate outer timing reported
5.84 wall, 4.42 user and 1.38 system seconds; these are different observation
boundaries, not additive measurements. The smoke retains its labelled graph
definition/readers/authority/peers and no real Git-provider claim. It adds no
default-startup or production-authority acceptance beyond its actual assertions.

All 49 planned R12 Native cases and this separate one-case smoke are now
complete. Their original failed attempts, warnings, class-count distinctions
and source-review limits remain preserved above. The next validation is one
original `npm run gate` at the exact clean final candidate, using the reviewed
current lock and dependencies; no focused test repeats are planned outside it.
That gate has not started. Its result, any failure and complete same-run case
ledger must be retained. Formal review, Main integration and operator rollout
remain later obligations; the R1/R2 ancestry and reconciliation qualifications
are not closed by the local focused checks.


### Original final gate and explicit Worker fixture inputs

The original gate owner 75099 at `386ef9cc` closed naturally with exit 1.
Root outcome `74eb8c5f26e176436dfbb82fd7951208c46af7d6` records stable
input guards and a clean collector: 2171 terminal cases, with 2144 passed,
24 failed and three skipped, and zero unhandled errors. All typechecks
passed. These are root-attributed original observations; this correction
does not replace that run or turn its failures into passes. The downstream
Node and Counting stages were not reached after the failing Vitest command.

Root read the terminal failures and confirmed incomplete test Worker
environments. The portable application fixture supplied its native namespace
but omitted the deployment index. Its callers now pass that actual index
explicitly. The existing scripted packet-cache test supplies a labelled
reachability stand-in for only its Directory and Rules peers; it does not
claim native index or authority proof. Two demo Page calls and three static
route fixtures used an empty environment. They now pass their actual test
namespace and index. Production fail-closed indexing is unchanged; there is
no namespace fallback, broader admitted target, assertion or deadline change.

The W1 documentation inventory now includes the Node-only scope-index
operator command, without an MCP tool or recipe. Its row preserves the
authenticated exact-manifest and register-mode write qualifications, and
claims neither deployment-mode nor complete-index proof. The actual Page
assets freshness comparison also failed. The earlier static source audit
was qualified and did not prove bundle equality; a maintained Page build
is required. No generated asset was edited manually.

The original failures and complete ledger remain retained. The corrected
fixtures, documentation and generated Page assets require the separately
reviewed follow-up selection and the downstream Node/Counting stages.
No new test, build, gate pass, formal review, landing or rollout is claimed
by this source correction.


### Maintained Page rebuild and separate DATA comparison

The source/documentation correction was committed as `35ec3a0e`. Its exact
17-path scope preserves production indexing, authority and all existing
assertions and deadlines. The originally reviewed helper/caller edits were
checked byte for byte before that commit; the additional static fixture
environments, W1 row and note were separately reviewed by root.

An initial Page-build invocation used the held source owner path instead of
the binding-pinned fresh execution copy. It exited 1 at the self-tool-pin
precondition, before output creation or npm launch, in 0.04 outer seconds.
Root retained that preflight failure separately. It was not a build failure
or an install, and no input recapture was used to erase it.

Root then invoked the correct fresh execution copy. Original maintained
Page build 53185 naturally exited 0 with full input guards, using exactly
`npm run build --workspace @generalbusiness/dap-page` under the reviewed
current dependencies. The outer observation was 1.91 wall seconds, 1.19 user
and 0.63 system seconds. Only the generated module and the two allowed dist
files could change. The generated module was not edited by hand.

The separately allocated original DATA comparator also naturally passed,
under allocation `b7b9c467919aacac49f2c93b6e1eeec3b6dc493b`. Root read its
actual source/plan and checked the owner, four input leaves, parents, head,
selected environment and sole tracked assets diff before and after. Its
root observation was 0.024146667 wall seconds. It parsed the generated
module as DATA and checked both content hashes, decoded HTML/JS equality
with dist, and HTML equality with the maintained source. No generated module
was imported or evaluated. This proves content equality, not rendered UI
or application behavior.

The generated `assets.ts` is 875406 bytes, SHA-256
`04bca8c72459605cb1c8f01c9c570755b4d644bbdf3631f436f3a60f8c314511`.
The dist/source HTML is 26184 bytes, SHA-256
`0167e7334fb013b0787bd559c18836789cf06d36bb2b402f1044b72ebec386f8`;
the dist JavaScript is 819418 bytes, SHA-256
`c4210f89cb676d00a2d052986916bbd3c2eb904e0c73c17043a64d56d1150525`.
These build and comparison outcomes are attributed to root's original
closure and guards. The original failed gate and its complete ledger remain
retained. A fresh scoped follow-up must check the changed owning files and
W1/assets cases, then the Node36 and Counting55 stages that were not reached.
The full healthy gate and typecheck suite will not be repeated. No new test
pass, formal review, landing or operator rollout is claimed here.


### Lending follow-up diagnostic context

Original follow-up 29459 closed naturally with Vitest exit 1, all three
affected compilers passing, stable input guards, no signals and zero
unhandled errors. All 44 selected identities were accounted for: 42 passed,
one failed and the exact original demo recorder was skipped. The remaining
failure is the maintained Lending case, after a donate returned recorded.
Its first read was current, but the next look returned behind and retained
the prior empty view. The saved assertion diff omits the public reason.
Root supplied these original outcomes and the exact closed JSON/stderr;
no new read, settling action, retry or budget change is inferred from them.

The test now supplies concise permanent assertion context after donate,
after borrow before cancel, and after cancel. It reports only phase, status
and at most 512 characters of the gateway's public behind reason, with a
truncation flag. It prints no view, credential, signed request or raw reply.
All existing current/recorded assertions, native operations, ordering and
30-second deadline remain unchanged. There is no speculative setup barrier
or weakened current requirement. The owning whole file still has its two
Counter/Lending cases; a separately allocated continuation must identify
the actual remaining reason. Node36 and Counting55 have still not run.


### Native projection refusal observation

Original diagnostic owner 64133 closed naturally with exit 1, stable input
guards, no signals, Counter passing and Lending failing. After donation,
the public gateway reason was `The library could not be read: unavailable.`
The client adapter maps several native refusals to that word, so the reason
does not identify the native refusal enum or the production cutoff.

The fixture proposal observes the existing projection response status and,
for a non-success response, its validated native refusal enum. The same
response is cloned only for that diagnostic read, with a 1024-byte cap and
one-second bound. The original response object, status and body pass through
unchanged. No raw body, query, reader credential, view or signed intent is
reported. A missing enum means the diagnostic could not validate the bounded
body; it does not assert that the native operation succeeded.

The observation is awaited and can delay delivery within the unchanged
client deadline. It is diagnostic instrumentation, not a settling barrier
or evidence that scheduling caused the refusal. It adds no native RPC,
retry, test assertion, budget change or altered 30-second case deadline.
Donation creates no child scope: its existing definition tells publish-file
to the existing Destination. No child/index repair follows from the saved
evidence. The two-case diagnostic, downstream Node36 and Counting55 remain
unrun at this proposal; the original failures remain retained.

Root approved this as temporary fixture instrumentation. Before acceptance
of a product correction, restore the test exactly to its file at
`49f58abfe65092ceef3f46297ac258f1917e2cf5`; that retains the earlier bounded
assertion context but removes this cloned-body observation and its timing
effect. Keep this historical note and the original diagnostic outputs.


### Temporary native boundary diagnostic proposal

Original owner 51963 closed naturally with exit 1, the compiler passing,
Counter passing, Lending failing, stable guards and no signals. The validated
existing response after donation is HTTP 503 with native refusal `unavailable`.
It is not the incomplete, stale or query-not-ready refusal. This still does
not identify which native preparation, currentness or data check refused.

The scratch-only proposal observes refusals and caught exceptions at the
existing projection owner and immediate data call boundaries. It reports
fixed phase labels, existing refusal enums and fixed exception categories.
It reports no source name, reference, SQL parameter, raw body, exception
message, reader credential, view or signature. Each module emits at most
32 diagnostic lines in its isolate; successful reads emit none. The data
catch rethrows the exact original error. All original returns, authority
checks, SQL, budgets, flights and deadlines remain unchanged. Console work
can affect timing, so these are temporary observations rather than a repair.

The immediate data phases cover item pages, journals, fact-time inputs and
reads, fact-signer inputs and reads, and the final projector. The current
maintained Lending declaration has no fact-time or fact-signer fields; their
coverage does not assert those branches execute in this case. No extra RPC,
retry, replacement owner or settling action is added.

Before product-correction acceptance, restore both temporary production
files and the temporary test exactly to their files at
`49f58abfe65092ceef3f46297ac258f1917e2cf5`. Preserve this historical note and
all original outputs. This proposal remains unapplied and unrun.


### Temporary currentness refusal observation proposal

Original owner 85113 closed naturally with exit 1, both compilers passing,
Counter passing, Lending failing, stable guards and no signals. The fixed
owner observation is `before-data-currentness` with refusal `unavailable`.
No data boundary observation occurred. The refusal therefore precedes the
item and journal queries; it does not establish a data-query defect.

The scratch-only follow-up adds failure-only observations inside the existing
`PreparedRead.current()` method. Fixed branches distinguish missing or
unavailable metadata, a changed captured state, unavailable support or
budget, and a preparation or other exception. A changed state reports only
booleans for identity, creator, genesis, head, time, status and held fields.
No identifiers, hashes, timestamps, records, SQL parameters, credentials,
exception messages or remaining-budget internals are printed. The module
emits at most 32 lines in its isolate, and successful checks emit none.

The original checks and short-circuit order remain exact. There is no extra
SQL read, support callback, currentness call, active check or native request.
Logging can affect timing on a path already returning false. The existing
invalidations and false results remain unchanged; there is no retry, new
allowance, settling action or deadline change.

Source arithmetic uses one shared 16-call allowance, not one per check.
For an ordinary declared lane with a full genesis membership and root-owned
installation, capture uses 6 charged calls with cached definition bytes or
8 on a cold definition read. Each currentness check adds 3 calls. The two
projection checks therefore reach 12 or 14 calls cumulatively, not a reset
allowance. This is source accounting, not a measurement of the failed run
or proof that a budget or timing branch caused it.

Before accepting a product correction, restore this additional temporary
file, both earlier temporary production files and the temporary test exactly
to their files at `49f58abfe65092ceef3f46297ac258f1917e2cf5`. Preserve the
historical note and all original outputs. This proposal remains unapplied
and unrun.

The independent source review also qualifies diagnostic silence: the module
cap can suppress a later observation, so no currentness line alone does not
prove that `run.active()` was the failing outer condition. The original
result and emitted branch, when present, remain the evidence.


### Explicit Lending publication-result fixture phase

Original owner 54000 closed naturally with exit 1, both compilers passing,
Counter passing, Lending failing, stable guards and no signals. The new
observation shows a changed head only: identity, creator, genesis, time,
status and held fields were unchanged. The projection correctly refused
the stale captured frame before its data queries. The saved observation
does not identify the entry that advanced the head.

Source identifies a concrete concurrent protocol: each Lending donate,
borrow and cancel sends publish-file to the existing Destination. Returning
a verified request result records a native delivery entry even when its
clause has no effects. ScopeObject starts the real dispatchers in waitUntil;
a recorded act does not promise that this later result has returned. Sender
attempt and ACK bookkeeping is not an entry and cannot by itself advance
the native head. This source path explains why the fixture must own its
publication-result phase; it is not proof of the exact historical entry.

The proposal first restores all four temporary code files to their exact
`49f58abfe65092ceef3f46297ac258f1917e2cf5` bytes. It then changes only the
Lending branch of the test, adding the existing finite dispatch fixture over
`[app, G]` after each recorded act and before its one current read. It asserts
that the actual signed act contains one publish-file send, then that one
native result binds its exact source fact, send ordinal and full target
reference. A missing or misbound result still fails. Inspection uses the
existing fixture Native history port, not a browser history fallback.

This dispatch-only phase joins existing in-flight dispatch and native
request/result work. It runs no outside effects, advances no clock, sleeps
nowhere and retries no projection read. The original current/recorded and
retained-row assertions, production refusal guards, read budgets, test
identities, configuration and 30-second deadlines remain unchanged. No
transitive native quiescence, successful new check, deployed publication or
operator rollout is claimed. All diagnostic notes and original failed
outcomes remain; the proposed correction is unapplied and unrun.


### Corrected projection fixture closure

Root observed original owner 46744 close naturally with exit 0 at
`b7919b65ae5c6572d01907f9e5cc6c977d1636cd`, tree
`76f2f755312fc66f4e48af701173111b0edbb5c7`. Scope.test passed, and the whole
maintained-projection file passed both cases: Counter in 4529 ms and Lending
in 4724 ms. The saved JSON reports two passed cases, no failed or pending
cases, and success. Full input guards remained stable, with no received
signals or guard errors. Root recorded outcome
`458b313e1598fcd1189acea90181e9f00da65639`.

The owner measured 18.084072458 seconds wall, 17.927886 seconds user and
2.49535 seconds system; the outer process reported 18.12 / 17.95 / 2.50 seconds.
All four temporary diagnostic files were restored before the lasting fixture
change. The three production files remain exact to `49f58abf`; only the test
owns the finite native publication-result phase. The independent source
review was `bed24d8fcf2625b19debf1d64147b9f5c96fa6ca`.

This closes the corrected owning-file check without repeating healthy files
or the full gate. It does not identify the exact entry in the earlier failed
run, claim transitive quiescence or establish hosted deployment behavior.
The original failed gate and every diagnostic outcome remain historical
evidence. The unreached Node 36 and Counting 55 stages still require their
separate allocated run, in the original conditional order.


### Downstream closure and final local reconciliation

Root observed original downstream owner 44100 close naturally with exit 0 at
`179181cb2eb454727203f7a6293c1d23edadf454`, tree
`63a37e9c3f1c8d15e52b414d9a78b8ca56ffb48f`. The original nine-file Node
command passed all 36 cases; only then did the maintained Counting command
run and pass all 55 cases. Each exact summary has zero failed, cancelled,
skipped or todo cases. Full source, dependency, tool and selected-environment
guards remained stable, with no received signals, guard errors or collection
errors. Root separately checked all 2414 npm namespace names and the three
required npmrc absences before and after. No npm process was needed for these
absolute-Node commands.

The collector verified six bounded Counting DATA files, four current test
entrypoints and 133 pinned source/dependency inputs. It copied the artifacts
as inert DATA and parsed only guarded source/metafile bytes. The collector
imported or executed no generated JavaScript. Root recorded outcome
`2e473c613bdc4a20e850c021216913922af36aba`; the exact granted result agrees
with the two natural child exits and all-pass summaries. Owner cost was
8.194813292 seconds wall, 8.276432 seconds user and 1.415491 seconds system;
outer time reported 8.23 / 8.30 / 1.42 seconds.

The original gate remains 2144 passed, 24 failed and 3 skipped, with zero
unhandled errors. Its 24 failures belong to 13 whole files. The reviewed
16-file follow-up included all those identities plus three changed healthy
files, totaling 44 cases. Follow-up 29459 passed 42, failed the maintained
Lending case and retained the exact original recorder skip. Corrected owning
run 46744 then passed the whole two-case maintained-projection file and
Scope.test. Earlier planned 49 Native cases, the standalone Lanes wire case,
the maintained Page build and separate DATA comparison remain attributed to
their own original runs. Healthy suites and the gate were not repeated.

All temporary diagnostic production/test edits were removed before accepting
the lasting fixture correction. The final three production files are exact
to `49f58abf`; the remaining change owns native result completion in the
fixture without weakening currentness, budgets, deadlines or assertions.
Historical failures, warnings and diagnostic limitations remain above. This
is a reconciled local evidence record, not a single-head gate exit 0, formal
review verdict, landing, deployment or operator rollout. R1 ancestry and R2
pre-index/register/enforce rollout obligations remain separately tracked.
