# Grow demo archive: local preparation

Request `63130d6c`, existing builder promise `3490bd81`. Original preparation
started at `be0c40b5df299145f819ecde82d6baf055bb7db2`, while F1 and 9a awaited
review. The sections below retain that history and its natural failures.

## Current status: exact development Git boundary repaired; checks pending

Root adopted the repaired source's owning lanes Node-test compiler, Scope
test compiler and three D1 cases in `d7a45af8`; all passed. The next ordinary
gate at `2ae9e515` then closed naturally with status 1. All presteps and the
full typecheck passed. Vitest reported 2,127 passes, three skips and one
failure across 459 files, with zero reported unhandled errors. Only the
page asset witness failed. The downstream Node 36/55 stages were not
reached. Earlier live callback counts were not terminal totals.

The page source and committed asset had stayed unchanged from CLI Main,
but the live platform dependency graph changed with the native catalog
extraction. The asset witness recomputes that graph with esbuild and
compares the generated module byte-for-byte. Root ran exactly one maintained
`npm run build --workspace @generalbusiness/dap-page`; original owner
`33154` closed naturally with zero, no intervention or error, and all
before/after guards passed. No test or compiler ran as part of this repair.

The generated module changed from 875,365 bytes (`d5019464…`) to 875,369
bytes (`649363b83f852ba2e024eb490428acc64de9ab522bfa44e66c6cd281bb5aa9af`),
exactly the failed gate's expected output. Its HTML stayed byte-identical:
26,184 UTF-8 bytes, SHA-256
`0167e7334fb013b0787bd559c18836789cf06d36bb2b402f1044b72ebec386f8`.
JavaScript changed from 819,381 to 819,385 UTF-8 bytes; its new SHA-256 is
`d33c6286e9c42db6c7d867813b32f40b272744afded61ebdf4d23b975d708b6d`.
The ignored dist files match those module exports exactly. Bounded offline
diff samples show renamed minified aliases; they do not establish that
every change is minifier-only or prove semantic equivalence.

The asset checkpoint committed only that maintained generated asset and its
necessary note. The Page asset owning case then passed. The following ordinary
gate, original owner `77196` at `adf673e075`, closed naturally with status 1.
The full typecheck passed. Vitest reported 2,128 passes and three skips across
459 files, with zero reported unhandled errors. The following Node block
reported 35 passes and one failure out of 36 cases: the active-source guard
did not list `apps/room/lanes/test/grow-archive.test.ts` as a development Git
boundary. The downstream Counting Node 55-case stage was not reached.

This repair adds only that exact test path to the guard's existing application
Git exceptions. The fixture constructs a synthetic archive and exercises the
actual Artifacts smart-HTTP send, ref and revocation guard with scripted host
replies. It grants no production import permission or broader lanes exception.
The owning Node guard remains pending. The checker confirmed that the
document-only repair exception does not cover this code change: run the
owning active-source Node file once, then one ordinary gate at this new head.
That gate includes both Node blocks and Counting; do not run Counting,
Vitest, compilers or the earlier Slice9 foci separately. No composed gate
pass is claimed. The failed run and subsequent results remain separate evidence.
No environment, package, Worker configuration, deadline, product assertion,
price or archive cap changes. This is still a partial local
archive delivery: no hosted acceptance, production floor/F3 closure or full
held-journal bound follows from it. All earlier failures remain below.

### Source integration and earlier focused evidence

The current source view is integrated on landed CLI Main
`5e8476a1fb4b79aa8fb611b8848e3ecaaf42d8a1`; the prior source-only
integration is preserved as `5bd90359c`. R1 is not claimed landed.
Root adopted the physically distinct dependency copy as
`615c9254a91ff9afcd95d5b3ca9a5794151d54cd`: 5,498 files, 534 directories
and 32 relative links, with no shared captured inode, no cache copy and zero
installs. Root then adopted the maintained owning-parser operation as
`dffe61aca46ed65fd5ee4b1c043f6f4f9c7b8f5e`. Its Node child closed
naturally with zero after 0.543260667 seconds wall time and 0.21185 CPU
seconds, with an empty log. Nine computed owner seals replaced nine nulls;
the object owner was also refreshed in the original map. The other 25
original hashes and all three Node cases remain unchanged.

Source checkpoint `8530ddfe4` recorded those adopted seals and removed only
the extra EOF blank line identified by P2d385 in archive-native-root.ts.
Root has now adopted all eight focused stages, each with a natural zero
exit, as `06ee7edc9f08d275647806cf38819b2c08ef56d9`:

- The three existing D1 Node cases passed. Node emitted its experimental
  TypeScript stripping warning.
- The maintained Platform and Scope test compilers closed with zero.
- The generator check matched 62 identities, 33 declarations and 499,848
  bytes. A physically distinct owned source view, copied without the
  artifact, regenerated exactly the original `b5ff79…` bytes.
- The two selected catalog and independent-golden cases passed; the third
  case was unselected.
- The exact signed production case passed in 8,431 ms; four other cases
  were unselected. Its child used 13.730454541975632 seconds wall time and
  14.41144 CPU seconds. The local Git clone retained 559 objects and five
  refs, passed fsck and yielded five exactly equal offline reports.

The fixed input and cache guards stayed unchanged, installs were zero and
no retry ran. Root observed no errors in the raw focus logs. The JSON
reporter supplies no unhandled-error counter, so these receipts make no
zero-counter claim. The original 30 s deadline, default workers, literal
prices, assertions and archive caps remain unchanged.

The original fixture/Grow five price vectors and the two warm/evicted
activation cases, retained-floor and homepage coverage are delegated to
one final gate. The first gate later failed as recorded below; the repaired
head still awaits its fresh gate. Its actual result belongs in the final
handoff rather than a further note-only commit. The
focus helpers, shared inputs and bootstrap scratch are now permanent DATA
and will not execute or import again.

These are local TEST/native and local Git witnesses with the documented
namespace, clock, host and provider stand-ins. They establish neither hosted
acceptance nor F3 closure or a bound on all future journal histories.
Archiving alone still does not reduce held entries. Register/Membership
journals remain excluded, and the caller-anchor and omitted-text trust
qualifications remain. The historical V41 result below belongs to its own
source and is retained alongside all earlier natural failures.

### First integrated gate and the type boundary repair

The one ordinary gate at `3569ce625` did not pass. Root adopted its failure
as `ec6780dd9e540941e198ea18cab41cd72c8b5602`: the actual npm and time
statuses were 1, and the owner closed naturally with 1. The whitespace,
helper and citation prechecks and citation self-test had closed with zero.
The gate stopped in the maintained lanes typecheck; tests were not reached.
Before/after fixed-input guard records agreed apart from the expected
post-run marker, with no guard error. The earlier v2 prelaunch refusal is
kept separate from this actual npm failure. Collector and shell-variable
diagnostics are not substituted for the npm result or a test outcome.

The lanes command chains source, Node-test and Worker-scope TypeScript
configurations; the raw command did not isolate the failing subcommand.
The source graph identifies the new plain Node grow-archive test importing
archive.ts, which reached the Worker ScopeObject through the host's
OutsideGiven type and reached global SqlStorage through Artifacts wiring
and credential storage. TypeScript follows those type imports even though
they disappear at runtime.

The repair moves the unchanged Given and OutsideGiven declarations into a
Worker-free structural module. object.ts retains compatible type re-exports;
pure host adapters import the structural module directly. Artifacts wiring
and credential storage use the existing Pick<Sql, "exec"> interface for
the methods they actually call. Worker globals and compiler configurations
are not widened. Every change to production code is a type declaration,
type import/re-export or annotation; runtime statements remain unchanged
by source construction, not by a claimed emitted-JavaScript measurement.

Root adopted a fresh owning-parser calculation as
`7ced02aec1c450bfa30123fb5c85acb55345f6bf`. Only the five changed sealed
owners receive new hashes, in six placements because object.ts occurs in
both maps. The other 29 unique owner hashes and the three complete D1 test
bodies and negative controls remain byte-identical. No old parser helper,
input or output is executed again.

At the type-repair checkpoint the lanes Node-test compiler, Scope test
compiler and three existing D1 cases were still pending. Root subsequently
adopted their passes in `d7a45af8`; the following gate and asset repair are
recorded in the current status above. The earlier focused passes remain
historical evidence for their own source. No unchanged
focus suite is repeated by this checkpoint, and no final gate pass, Source
publication, hosted acceptance or full held-journal bound is claimed. The
new owning results and gate outcome belong in the final handoff rather
than another note-only commit.

### Historical V41: the local signed-packet case passed

The v41 owning Scope compiler and the exact signed Grow production case
both closed naturally with exit zero. The case ran once: one selected pass,
four unselected cases, zero installs and no retry. The production process
took 12.531654625 seconds wall time and 14.162519 CPU seconds. Source,
dependency, tool, packet and cache guards were identical before and after.
Root adopted independent DATA audit `522e1f88` as
`4031c39899f057be8412b549f25987a5c8e6ef2e`.

The actual case confirmed 37 public journal positions: Room 0–5, Site 0–3,
Directory 0–13, Rules 0–10 and Destination 0–1. The Room genesis lost-send
restart rebuilt and confirmed the same pending commit. The largest captured
pass ledger was Rules 2: 65,180,305 input-work units, 1,928,559 below the
unchanged 67,108,864 limit. Every captured ledger axis stayed within its
original cap. This establishes a fit for this witnessed local history, not
all future entry shapes or a hosted cadence.

All five offline reports were consistent. A real local Git clone retained
559 objects and five refs, passed fsck, and produced five exactly equal
reports. The case checked seven caller-trusted private anchors and four
omitted-text rows, two domain refusals, three credential refusals and four
anchor refusals. Missing omission metadata produced verification/incomplete
at the independently observed Directory staging fact. Extra omission
metadata produced archive-failure/refused. Both controls and the final
annotation completed.

The native namespace, clock, package peer, Artifacts HTTP service, scheduler
and host authority remain explicit local test stand-ins. Register 17 and
Membership 8 journals remain excluded. Private anchors and observed values
remain caller trust; omitted metadata supplies no omitted bytes. This is no
live-provider, Cloudflare, secret-custody, deployment or retained-floor
acceptance. Archiving alone still does not reduce held journal entries.

The original fixture and maintained Grow cases were unselected in v41, so
the five unchanged literal price vectors were source-guarded, not rerun.
Warm and evicted activation coverage must also be preserved at integration.
At V41 the candidate was not yet integrated with current Main. The current
source integration still has no final integrated-head gate or formal checker
verdict. Those steps remain with
root; actual operator binding, deployment, readbacks and F3 remain with the
planner. No Source filing or landing follows from this local pass.

## The journal bound needs the retained floor

Archiving alone does not reduce the entries that Room A holds.
`ArchiveDriver` builds, sends, and confirms an archive; `ArchiveRows`
updates archive bookkeeping. Neither deletes journal entries. The timed
drain still checks `head.seq + 1` against `scopeEntries`
(`packages/scope/src/turn.ts:266`). A confirmed archive therefore does
not establish the bound requested by this slice.

[The retained-journal-floor design](../2026-10-20-retained-journal-floor.md)
names the required mechanism. F2 adds a witnessed floor, keeps entries
that state and bookkeeping still need, deletes the remaining covered
entries, and counts the entries actually held. F3 enables that mechanism
for Room A after F2 and the archive deploy, with margin 10,000 and minimum
1,000. F3 belongs to the planner. This slice enables no production floor
and changes neither the simulator's signed cadence nor `scopeEntries`.

## Reuse the existing native witnesses

`packages/scope/test/archive-installed.test.ts` already has a Grow case
named “installed %s scopes export genesis zero after a late native
Membership8 directory binding”. It discovers Room, its application root,
Directory16, Rules10, and Destination12. It creates a real local Git mirror
clone and replays the five journals offline through A2.

That case uses test policy, credentials, repository, and scheduling. Its
result establishes no production authority or credential custody. Register17
and Membership8 journals remain excluded. Exact private facts and their
observed values remain caller trust. Omitted text metadata does not prove
the omitted bytes or their bounds. Reuse this scenario to test the deployed
configuration seam; do not treat its test policy table as production policy.

Two focused Node cases pass for the exact signed policy/configuration and
actual Artifacts token/send adapter; the homepage contract also passes.
Scope and Grow compilers pass under owned source/dependency guards, with
zero installs. The separately labelled production native witness is written to use the production driver factory,
namespace host reads, fresh source preparation, binding mint and actual HTTP
pack path, including a lost send, eviction, exact pending rebuild and clone
from the transported objects. Its first runs preserved an environment startup refusal, an old-fixture byte-cost mismatch, and a test RPC-wrapper error. Those are isolated or corrected without changing the original fixture receipts. The corrected production path confirmed all six current Room entries, including a marked genesis, intentional loss before provider acceptance, eviction and exact pending rebuild with identical pack bytes. It then stopped at the Site genesis on the original all-work limit. The rejected complete finish quote plus work already spent is 73,050,363 input-work units, 5,941,499 above the unchanged 64 MiB allowance. The combined witness has not passed; the other three journals and clone assertions have not been reached. Earlier diagnostic notes calling this the first scope were incorrect; the recorded prior pass receipts establish the Room progress.
The retained native v8 report records six confirmed Room entries (0–5).
Room 0 spent 56,256,634 input-work units before the intentional lost send;
its exact pending rebuild spent 46,787,852 and confirmed the same commit.
The test asserted identical transmitted pack bytes. Room 1–5 spent
57,199,599; 56,493,968; 57,188,415; 57,200,321; and 51,664,799 units.
These are separate original ledgers, with no transferred allowance.
The later Site genesis stopped before a mark: 37,801,984 units already
spent plus the 35,248,379-unit full finish quote did not fit. Failure
bookkeeping brought its final spent ledger to 44,152,075 units.

The Site source-preparation diagnostic paid 6,846,016 input-work units:
171,968 for source-reference JSON, 544 for projected SQL metadata,
574,368 for the captured Directory16 birth, 4,194,304 for native registry
serialization, and 1,904,832 for its 19,842-unit declaration validation.
The Directory birth is 5,983 units/bytes and was already captured by target
resolution; preparation made no additional peer read. Reusing only its
immutable validated birth could avoid at most 574,368 units, which does
not close the 5,941,499-unit deficit. No such optimization is implemented.

The production-only witness now selects the exact committed signed demo
packet through the existing `growDemo` capture and published-package reader,
with the actual `growArchivePolicies` registry. It checks release, publisher
and Site d2bc / Room b89e pins. Its native setup enrolls distinct sensors and
climate agents, records their controller and roles, and installs the sensors
member as Device owner. It checks both real creator messages and the Room's
three distinct parties. The owner preparation uses the sensors signer.
The audited exact-packet revision compiled and then naturally failed at
its first Room b89e genesis, after successful genuine member setup and
Device-owner preparation. Target resolution read five checked births and
two admitted items. The original ledger had spent 33,817,925 input-work
units; its complete finish quote was 34,949,126. Their total, 68,767,051,
exceeds the unchanged 64 MiB allowance by 1,658,187. Source preparation
paid 1,141,248 units and reused the target-captured Site birth. No durable
mark or send occurred for this exact-packet run. Earlier six Room
confirmations and the Site deficit above belong only to the maintained
TEST packet; they are not exact deployed-packet acceptance. Original fixture and maintained Grow variants keep
their original literal cost receipts. Namespace, clock, Artifacts HTTP peer
and scheduler remain explicit test stand-ins; no hosted acceptance follows.
Initial target persistence is unchanged.

The next source revision gives Room/Site an explicit narrow target mode.
It retains the checked creator chain, public native cohort allowlist,
full scope/incarnation coherence, exact Directory16/Destination12 and
binding/branch/repository checks. It omits only unrelated Rules birth
read/enumeration. Directory, Rules and Destination keep full discovery
on their own original pass ledgers. No fee or allowance changed.
Two separate activation witnesses use the actual production ScopeObject
factory and scheduled alarms: a warm Directory preserves its real
pre-binding retry through the native binding entry, and a second case
evicts Directory before Room activity. The real Directory alarm must pay
for full discovery and cause quiet Rules constructor activation and a
persisted Rules alarm. These witnesses contain no manual archive-driver
substitute. They compile but have not run; warm liveness and exact-packet
fit for this revision remain unverified.

No gate, browser validation, or complete acceptance is claimed.

## Bind production authority to the room

At the base commit, the deployment exports `DeployedScope` without archive wiring.
`wrangler.grow.jsonc` records no archive setting. `ScopeObject` accepts
`fixtureArchive`, and `ArchiveDriver` requires fixture policy, target,
and provider tags. These boundaries deliberately prevent accidental
production enablement.

The native policy foundation admits the exact Directory16, Rules10, and
Destination12 declarations and their listed public value places. The
archive target's device/application cohort matches Grow's current cohort.
Those facts supply neither a production reader nor a credential.

Planner decision `9674108a` answers clarification `9f9ffef8`:

- The admitted room binding authorizes two namespace-only host item reads:
  the directory's repository and its destination's branch. Both spend the
  original pass budget. The host uses no member, session, inspector, or
  public reader. The configured directory and pinned register constrain
  these reads; other item types and scopes refuse.
  The complete production target proves the archived scope's seed and
  creator lineage before either query. Raw `archiveItem` accepts trusted
  host input and does not independently authenticate `ask.archiving`.
  Namespace RPC access itself supplies no lineage proof. There is no public
  HTTP, service-reader, member, session, or inspector path to this helper.
- The Artifacts binding mints the write token with `createToken("write",
  900)`. The service states its expiry. The adapter revokes it after the
  pass or relies on service expiry when revocation is unavailable. No static
  archive Worker secret exists, and no destination ledger binding is made.
- The destination is the room's own recorded repository, under one
  `refs/artroom/journal/<scope ID>` ref per journal. The repository ID comes
  from the directory item. There is no public clone locator. Members clone
  with their short-lived read tokens.

The candidate adds a Grow-only entry that preserves the existing exported
Durable Object class name. Its explicit configuration pins the directory,
repository name, and signed demo release. The production policy reads the
committed signed packet: its deployed Root/Room declaration pins differ
from the current maintained declarations after P1. Register and Membership
coverage admits retained copies only; their journals stay excluded.

Fresh source identity preparation reads only the next candidate's source
reference metadata, under adaptive lookahead that reserves the earlier
prefix's complete finish cost. Its synchronous native frame closes before
peer awaits. The scout then opens a fresh metadata frame; no admission or
scalar frame survives that await. Source pins are append-only immutable
identities, and every new identity pays full validation on the same original
ledger. A later unavailable source can stop lookahead without discarding an
earlier selected prefix. A pending rebuild prepares its exact original
range. No independent prewindow chooses the cutoff. The existing inventory
still admits the entire selected prefix before any export body is read.

## Planner readbacks required after review

The planner owns destination provisioning, credentials, `bind-archive`,
deployment, and hosted readbacks under promise `2fcf3c3a`. The builder stays
local and reads no operator, publisher, or agent private material.

After the production contract and exact candidate pass review:

1. Check the room's recorded repository and its actual nonsecret identity.
2. Check the Artifacts binding's token authority. Set no archive Worker secret.
3. Deploy the reviewed Grow Worker configuration with pinned tooling from
   a scratch directory. Retain its actual version and nonsecret settings.
4. Use the operator's authority to submit `bind-archive` with
   `archive: "journal"` to the established directory repository item.
   Retain the accepted entry and read back that exact item.
5. Confirm that each of the five admitted journals starts at position 0,
   advances through confirmed receipts, and shares the reviewed destination.
6. Clone the actual destination and run A2 offline. Retain the five reports,
   the explicit caller anchors, omitted-text qualifications, and a check
   that the archive contains no secret.
7. Publish disclosure that names the verified location and describes actual
   archive progress. Record continuing simulator ticks at the signed cadence.

These steps do not establish the held-entry bound. F3 must separately
show Room A's counted entries falling after a confirmed pass, with the
simulator still running. Do not report this request complete from copies
or replay alone.

### Retry and idle-wake correction (source only)

Production passes now persist their retry before awaiting target resolution,
including an absent binding or unavailable target. A pending Mark advances its
attempt and backoff once; the later send path does not repeat that transition.
The target row still persists at the same point before Mark. No allowance or
price changed.

After target I/O, a confirmed-idle pass reads a fresh, charged Native identity
and head before clearing its wake. A new sealed entry keeps the durable retry.
The new Native witness checks the actual wake index and future time across
binding, committed activity, and eviction, plus an actual checkpoint sealed
during a target await. A separate confirmed-idle alarm must clear its archive
wake; the global alarm may still belong to another Native owner. These new
assertions compile but have not run. Scope test compiler v37 passed with source
and dependency guards unchanged and zero installs.

Review found that the initial target save replaces the earlier wake index.
The driver therefore writes the retry again after that save, before any
parent or source await. Both writes pay the original ledger: they protect
different durable states. The activation witness interrupts the first source
await after the genuine target save and checks the future pending wake and
target-only row across actual eviction and reconstruction. This correction
and witness remain source-only while the joint gate owns the native slot;
they have not yet compiled or run.

### Native v12 result: activation passes; later Site still exceeds allowance

The reviewed v14 candidate compiled in v38 (0.648 seconds, natural exit 0).
The one authorized three-case Native command naturally exited 1 after
12.034 seconds: both actual warm and evicted activation cases passed; the
production archive case stopped at the original allowance on the later exact
signed Site genesis. Source and dependency guards stayed unchanged, with
zero installs. Raw evidence is retained in the finite native-v12 receipt.

Exact signed Room positions 0 through 5 confirmed. Position 0 retained its
lost-send Mark and, after eviction, rebuilt the same commit and identical pack.
Its initial and rebuild input work were 55,941,849 and 46,473,067. Later Room
positions consumed 56,182,097; 55,145,082; 55,839,845; 55,855,089; and 50,124,800.
These are actual exact-demo receipts, separate from the earlier maintained
packet results. The later idle/checkpoint block was not reached.

The failing Site source preparation consumed 6,921,664 input work:
247,616 for Site JSON, 544 native metadata, 574,368 for Directory birth
validation, 4,194,304 native declaration serialization reservation, and
1,904,832 Directory declaration validation. The rejected whole-finish quote
was 36,647,572 on top of 36,448,377 already spent: 73,095,949, exceeding the
67,108,864 allowance by 5,987,085. The final stopped ledger was 42,798,468.
The quote includes a fixed 19,034,112 for three actual row saves and
3,145,728 selection reservation; its remaining component inputs were not
recorded individually, so no exact variable-component table is claimed.

Both activation passes checked actual Directory and quiet Rules scheduled
wakes, prebinding absence or unavailability, later binding without shortened
backoff, and a successful first target followed by source failure and actual
eviction/reconstruction with a future pending wake. They prove local
scheduling composition, not completed Rules export or hosted cadence.
Five-ref closure, complete offline replay, the held-entry bound, and hosted
acceptance remain unproved. Prices, limits, persistence and expectations
were not relaxed, and no retry has been authorized.

### Atomic initial Mark and first attempt (source only)

Root authorized combining the two initial synchronous persistence steps.
Production keeps the original durable target save. Its new Mark transition
uses the same shared guards and writes the exact Mark, attempts 1, next retry,
and wake in one transaction. Before commit, any failure keeps the old target
and retry with no new Mark; after commit, all four values survive together.
Work spent before rollback remains spent. Existing attempts-zero Marks and
ordinary pending retries remain recoverable. Identical initial calls do not
increment an already attempted Mark or replace its backoff.

The production forecast opts into two actual row loads, two saves and three
pending-manifest validations, removing only the intermediate load, save and
its validations. Unit prices and original bounds do not change. Legacy
fixture variants retain their original transitions and price controls.
New actual-SQLite witnesses cover failures before the row write, after it,
and after the wake write; eviction, exact committed recovery, idempotence,
invalid/stopped/conflicting Marks, legacy attempts-zero recovery, and measured
forecast equality. These new changes have not compiled or run while F2 owns
the verification slot. No fit or complete archive claim follows from the
theoretical saving.

The first scoped compiler (v39) exposed an exact-optional boolean argument;
the caller now passes an explicit boolean, and v40 passed naturally. Atomic
Native v1 then naturally exited 1 in 4.021 seconds: legacy attempts-zero
recovery passed; rollback/cutoff assertions passed before the new cost test
failed. Its TEST mark omitted layout 2, so the actual v1 confirmation skipped
the v2 selection reservation included in the forecast. The exact difference
was its 34-unit manifest times 24 input work and 3 metadata. The fixture now
uses explicit v2 metadata with an empty retained-key list; no price or
assertion was relaxed. The original result is retained, and the production
validation was not launched because the atomic-test prerequisite failed.
The corrected test remains unrun.

### Atomic validation passes; Directory genesis is the next obstruction

After source review of the valid v2 fixture, only the failed atomic case
reran. It passed naturally in 3.873 seconds. Its actual measured atomic
Mark/confirmation cost exactly matched the forecast: 12,710,445 input work,
1,377 metadata and 8 calls. The target row was 340 bytes, attempted row
653 bytes, and manifest 64 units. Each injected before-row, after-row and
after-wake failure kept 6,355,108 input work spent while restoring the old
target and retry. The earlier legacy-zero recovery pass was not repeated.

The authorized exact-production-only v13 run naturally failed in 7.586
seconds, with unchanged source/dependency guards and zero installs. Exact
Room positions 0–5 and Site positions 0–3 confirmed. Room genesis again
survived lost send, eviction and exact pending rebuild. Site genesis now
confirmed with 62,757,752 input work; its later positions used 56,539,108;
47,351,169; and 60,795,987. The next obstruction is actual Directory16
genesis: used 40,649,524 plus full-finish quote 27,335,157 totals 67,984,681,
exceeding the original allowance by 875,817. No Directory Mark was created.
Its stopped ledger was 46,999,680.

Directory source preparation consumed 7,132,032 input work: own-entry JSON
382,912; SQL metadata 800 for two uses; new Register peer read 2,097,152;
Register birth validation 133,920; native serialization reservation
4,194,304; and declaration validation 322,944. Register remains a source
identity only, not an exported private journal. Full-finish variable
components remain aggregated in this receipt, so no exact individual
build/copy table is claimed. Rules/Destination export, complete five-ref
closure, later idle/checkpoint witness and offline verification remain
uncompleted. No further Native execution or optimization is authorized.

### Directory finish observer (source only)

A bounded TEST-only observer now wraps the actual Scout layout, inventory
and selection-cost methods, layout preparation forecast, and initial target
save return. Each original is called once with the same receiver and
arguments; its result or error remains unchanged. Only one first Directory
pass is observed, with at most 32 scalar/reference captures. No bodies are
copied and no extra forecast, serialization or storage read is added to the
live pass. Prototypes restore in finally, including construction or run
failure. Immutable metadata references and the owned target-row snapshot
are inspected only after the driver settles.

The post-run report reconstructs the separate cost components using those
actual scalars and labels the sum diagnostic arithmetic, not scheduling or
admission evidence. Observer capture wall time is reported separately and
does not include timer-call or wrapper dispatch overhead. It cannot support
a causal performance comparison. This observer has not compiled or run;
the joint gate owns the verification slot.

### Fresh native root semantics subsume the prefix checksum (source only)

Root authorized removing the separate prefix platform/canonical/hash
operation. The complete native-root operation already validates the exact
installed data, its canonical UTF-8 bound, reviewed declaration equality,
outcome values, runtime rules and derivability. Its ValidDefinition digest
is definitionDigest of the original data, exactly the digest used by native
pin admission. The retained operation pays its original B × 16 price.

Production now selects whole-operation root-coupled entry points. The
actual local pin is read first; complete native semantics run without child
reads; unchanged constant pin admission follows; ordinary prefix metadata
runs; and the existing child-closure walk occurs at its original point. A
private WeakMap handoff binds the full scope, name, original budget, Bounds
and policy registry. It is one-use, invalidates on a failed binding check,
and expires when its synchronous callback returns, including throws or a
Promise return. It is not persisted or carried in a checkpoint.

Scout opening and final inventory independently perform fresh checks.
Existing resume identity/frame/position fences, final pin/cutoff fences,
source preparation, applied/provisional/refused handling, and all admission
and privacy checks remain. The forecast removes only the absent prefix
operation; full native-root cost and all support/child/fence costs stay.
Standalone prefix, original inventory/build entry points, the two original
variants and their literal price controls keep their original path. No
caller-provided skip flag can grant admission.

New focused Native source witnesses compare the standalone two operations
with the coupled single full operation, exact unchanged remaining charges,
closure ordering, semantic refusal before entry/child reads, one-use and
wrong-budget rejection, expiration across await, and a newly charged full
validation after a real Scout checkpoint. The production witness also counts
fresh Scout plus final Directory inventory operations. These new changes
have not compiled or run while the F2 gate owns the verification slot.
The prior v18/v14 evidence remains unchanged; no fit claim is made.


### v20 staged binding fence (source only)

The v19 registry-reference check did not bind mutable nested review inputs.
The staged path now captures numeric Bounds and the actual policy, support,
definition, capability, native-data and rules references before validation.
It records enumerable data descriptors, Map/Set entries and the validated
JSON input footprint. Capture and bounded post-validator/pre-consume
comparisons pay the existing declaration-validation and handoff prices;
the actual aggregate binding cost is also included in the fresh inventory
forecast. No borrowed object is frozen. Unknown/deleted keys, replacement
references, changed primitives or numeric Bounds refuse before child reads.
The fence binds JSON inputs and used support data, not arbitrary hidden
non-enumerable or symbol properties.

The staged operation remains incomplete until consume: fresh canonical
validation supplies the digest for unchanged constant pin admission;
runnable and derivable run once after prefix metadata and before child
closure, at their original position. Standalone root remains complete and
immediate. Outcome metadata must still match the original validator input.
No handle survives its synchronous callback or checkpoint.

The test counters are explicitly native-data reservation counters, not
observers of actual validator/hash invocations. Whole-operation elimination
is a source finding; new rejection and reservation witnesses have not run.
Replacement policy/support/definition, nested declaration/support-map,
capability and Bounds mutations have focused rejection test source. Added
binding work may consume the forecast margin: no fit or runtime claim.


### v22 closed composite replaces rejected v20/v21 (source only)

Both reviewers found the v20/v21 enumerable fence unsound for hidden own
semantic fields. Those immutable snapshots and findings are preserved.
Gitseq findings 0575655a/3be84a25 and design 7d3245a1 record the limitation;
root source authorization 7385fb73 adopts a smaller closed operation.

All new prepared handles, arbitrary caller callbacks, input fences,
configuration copies and binding costs are removed. The prefix-owning
composite reads the actual pin, completes full native root validation once
at the original B*16 price (including runnable and derivable), performs the
unchanged constant admission and charged Native prefix metadata, and
finishes child declaration closure before returning ordinary results.
No admission-only helper or caller-supplied validation digest is exported.
Scout bootstrap and final inventory invoke it freshly; no completed root
result supplies admission across await or checkpoint. Pending rebuild and
standalone prefix/root entrypoints retain their original conservative path.
Only the eliminated whole prefix B*16 operation is removed from forecast.

This uses the original contract: trusted owner configuration and truthful
Budget with real Native transactionSync/SQL. Exact deployed Grow uses
private genuine Map policies, direct native SQLite and the default budget.
Hostile or semantically mutating virtual SQL/registry/budget callbacks are
outside the original authority and ledger proof. The removed withRoot
callback had introduced a supported interruption point; none remains in
the composite. Test query/reservation observers delegate unchanged.
New source witnesses compare exact remaining charges and closure order,
and require fresh validation/refusal after a real checkpoint. No compiler,
Native result, budget fit, complete archive or hosted acceptance claim.


The v23 source adjustment retains the legacy requested-window-head fence
before child closure. The closed composite accepts that ordinary head
metadata and compares it immediately after prefix metadata, before reader
construction/walk. The window caller supplies its actual captured head;
final inventory has no extra head argument. No duplicate guard, callback,
prepared root, fee or forecast change is added.


### v24 exact Directory append diagnostic (source only)

The v23 compiler passed. Native v15 naturally passed both mechanism cases,
then confirmed Room0–5, Site0–3 and Directory0–1, including the original lost
send/rebuild. The first new obstruction is Directory2: actual used input
46,999,852 plus full finish quote24,552,407 exceeds67,108,864 by4,443,395.
No retry or fit/complete-five-scope claim follows. Original evidence is
preserved in the finite v15 release; Directory2 body shape was not captured.

The TEST observer now targets only that exact Directory2 append candidate.
All original calls still delegate once; the original32-observation cap,
full-reference/budget fences and finally restoration remain. An instance
peer Map.get observer records only actual successful requested object IDs
and scalar sizes, counting repeats/missing observations too. Its exact
previous descriptor is restored, or the temporary own method is deleted.
For this first rejected candidate, those requests equal the driver's fresh
held/used parent set. One-forecast/after1/through2/pendingnull/parent-commit
checks enforce that qualification. Post-run arithmetic adds append edges,
append fixed, parent-aware commit/transfer and requires exact six-axis quote
agreement; otherwise it reports incomplete. Entry input kind/key names and
canonical size use already captured Native history only after settlement,
without outputting bodies. No live SQL/serialization/extra forecast or new
allowance is added. Source review and explicit runtime allocation remain
required; actual source-preparation canonicalization work is not discounted.


The v25 observer correction captures the original budgeted ArchiveRows.load
result, because an existing confirmed Directory2 parent bypasses target().
It delegates once, retains only the first matching full-reference/budget
row and ignores unbudgeted post-run inspection. No read is added. The v24
source finding remains preserved; product source is unchanged.


The v26 observer hardening counts any peer lookup after forecast against
that same32 cap and marks the diagnostic incomplete. It cannot silently
accept a post-quote parent-set change. No product operation changes.


### Canonical native byte projection (focused checks passed)

The source-only catalog module preserves the exact existing VERSIONS objects and
public index exports. The generator imports that catalog directly, so a missing
generated file does not prevent regeneration. Its normal mode writes one literal
module; `--check` compares it without writing. The one authorized generation
ran naturally zero, with 62 native identities and 33 distinct declarations. The generated module is 499,848 bytes, SHA-256
`b5ff79bfb18c99aee95bf2d6a3fb5e5b07c3ad611941a0781e4e3d18f4914701`.
All 2,716 prior source rows and dependency/tool guards remained unchanged;
only that generated module was added. No placeholder or import bypass was
used. The later focused check results are recorded below.
Every supported identity is generated; the existing independent version digest
goldens and exact canonical source-byte comparisons detect stale or orphan data.

Native source preparation first pays lookup(null) for current reviewed-policy
alias eligibility. Only `policy.support.definition.declared === native.data`
selects static bytes. That route additionally pays lookup(71), including misses,
and refuses absent/mismatched generated data. It removes the actual native-data
canonicalization and its original B*16 reservation. Nonalias/no-policy sources
still execute that original operation at its original price. Both routes retain
optional supplied-byte equality, output bounds, parseStrict, full validation,
outcome metadata and canonical-byte/digest checks. Static provenance is created
internally on the owned frozen source row, never accepted from birth input.

Every actual cold static foreign-policy join pays lookup(null), freshly obtains
the current platform object and requires the policy/native data alias again,
then runs the existing canonical policy declaration equality and all support,
privacy and retained-copy checks. Alias loss refuses before payload; there is no
late fallback. The recorded cold footprint includes this provenance, and each
future cold-copy quote includes the extra lookup separately. Already spent
preparation work is neither refunded nor recharged as future preparation.

Registry/wrappers/nested data remain unfrozen. Native witness source exercises
wrapper replacement, nested mutation and refreshed cloned policy after the real
async source-preparation boundary, with actual Register genesis and Directory
retained uses, plus missing projection and exact preparation-price differences.
The focused Native case has since passed, as recorded below. No fit, five-journal closure or hosted acceptance claim
follows from this source change; the prior V16 Directory-sequence-2 failure and
all original caps, unit prices, signed packet and literal controls remain.


### Accepted difference: admission at fresh consumption

Planner ruling `b9e821dd424f6ce17da5ecac8aac205d3697af80`, answering
`63cf995e78ba42b4169eaa2b335c1ed17efd1d7c`, names the fresh synchronous
consumption fence as the native declaration admission point. Preparation only
stages and charges bytes. There is no await between that fresh check and use;
all payload and privacy checks remain required. Each pinned native platform
and its reviewed policy are trusted reviewed code, fixed while the process
runs. Mutating that configuration is a trusted-code defect.

The named accepted difference is **a preparation-time change reverted before
consumption**. The static route can stage artifact A while live configuration
is transiently B, then admit A if the live native data and reviewed policy
match A at consumption. The original route staged B and would refuse after
restoration to A. The product no longer requires that original preparation-time
refusal. This is an explicit contract decision, not observational equivalence
or a claim that preparation validated the current native object as A.

The Native witness source now checks this accepted A→B→A difference against
the conservative original route, plus a nested change that remains at the
fence and a wrapper replacement that must refuse. It also retains cloned-policy
alias-loss refusal, a positive unchanged cold consumer and exact actual/forecast
lookup-price controls. Nonalias/no-policy sources keep the original route.
The focused Native case has since passed. No freeze, proxy, cache or immutable native-data
framework was added; generator and product source are unchanged from v31.
The original prices, caps and 67,108,864 input-work limit remain. The natural
V16 Directory-sequence-2 delivery failure is preserved; only an actual run at
the reviewed candidate can establish a fit or complete export.


### Focused checks passed; production stopped at Rules 2

All five allocated checks passed with unchanged before-and-after source,
dependency and tool guards and zero installs: generator check mode, the two
selected platform version cases, the platform compiler, the Scope compiler,
and the new static-native consumption case. The platform run recorded two
passes and one unselected skip. The Native case covers the accepted reverted
preparation change, lasting-change and wrapper-replacement refusals, the
unchanged positive consumer, and actual and forecast lookup charges. These
focused results do not establish complete production export.

The next exact signed Grow production run naturally failed its one selected
case, with four other variants unselected. Its child took 8.295126208 seconds
wall time and 9.770283 CPU seconds. All source, dependency and tool guards
were identical before and after the run, with zero installs.

This run confirmed 26 passes: Room 0–5, Site 0–3, Directory 0–13, and Rules
0–1. The first obstruction was Rules sequence 2. At its rejected fit, the
original ledger had spent 34,516,018 input-work units and the complete finish
quote was 33,364,050. Their sum, 67,880,068, exceeds the unchanged 67,108,864
limit by 771,204. Failure bookkeeping later raised spent work to 40,868,215;
that final value is not the fit-time value. Destination and the five-journal
clone and offline closure assertions were not reached.

The earlier V16 Directory-sequence-2 failure remains separate evidence.
Neither run establishes full export, a hosted archive, or a retained journal
floor. The signed packet, scalar prices, caps, deadline, target persistence
point, private-journal exclusions and original literal controls are unchanged.


### One support walk for each recorded cold copy (source only)

The recording path previously validated the same support metadata twice for
one cold copy: once during its fresh policy join and once to collect scalar
counts after privacy checks. Both walks spent the original support prices.
The candidate now collects those counts during the first complete paid walk
and carries them only through that synchronous cold-copy call. It keeps the
original recording charge after privacy checks. Every cold copy still repeats
fresh alias, canonical declaration, derivability, support and privacy checks;
final inventory still performs its own full validation. No result is reused
across calls or awaits. The finish quote already includes one support walk
and remains unchanged.

A prepared Native case compares the same actual cold retained copy with and
without recording, requiring exactly the original bookkeeping difference on
all ledger axes. Its reviewed test policy includes a valid known-capability
record kind and requires a positive support-work quote, so restoring the
second walk must change the measured difference. The first source revision
used an empty support footprint and could not distinguish that regression;
the corrected test has not run. This removes an actual duplicate operation,
but neither its measured saving nor a fit at Rules 2 is established yet.


### Support-walk checks passed; production quote unchanged

The owning Scope compiler passed naturally (0.595733792 seconds wall time,
2.933871 CPU seconds). The corrected positive-work Native case passed: one
selected pass and ten unselected skips, 3.949830875 seconds wall time and
4.891698 CPU seconds. All before-and-after guards were identical and no
packages were installed. This distinguishes the duplicate walk on its
positive-work test policy.

The next exact signed production run still failed at Rules sequence 2,
with one selected failure and four unselected skips. It took 8.279251833
seconds wall time and 9.791793 CPU seconds. Its fit-time used work and finish
quote were unchanged: 34,516,018 + 33,364,050 = 67,880,068, or 771,204 above
the original limit. Final spent work was again 40,868,215. The same 26 passes
confirmed; Destination and complete closure remained unreached. Guards were
identical and installs were zero. There is no observed budget improvement
at this obstruction, so the positive fixture saving does not establish a
saving at Rules 2. Both prior production failures remain preserved.


The independent cost review compared the closed runs by cohort order and
sequence, because their generated scope references and hashes differ. It
found lower input work at 15 of the 26 earlier confirmed positions, with the
other five ledger axes unchanged. For example, Directory 3 used 274,176 fewer
input-work units and Directory 4 used 379,648 fewer. This is evidence of real
earlier work removal, not a change in prices or a saving at the unchanged
Rules-2 obstruction.

Contract question `3b0ded5a9bee47ff82b67c342a3bad853de83907` asks whether
one target-resolution invocation may reuse its first actual checked Rules
birth when Directory names the identical full scope reference. It explicitly
names the omitted second current-catalog check and second peer-availability
observation. The adopted answer and the source change are recorded below.


### Accepted difference: omit a duplicate Rules birth observation

Planner ruling `3b74418061a1fe04818d49c358d1b3693bc8f47e`, adopted by
`dfff79a8ad8cd9f16bee64739ba3c7a817992526`, permits one `locate` invocation
to reuse its initial actual checked Rules genesis only when Directory names
the identical full scope reference: scope, incarnation and kind. A genesis
is immutable for that reference. The first actual read remains mandatory;
an existing pin cannot replace it, and another invocation reads again.
A different full reference takes the original read.

The named accepted difference is **omitting the second availability and
trusted-configuration observation**. A peer failure after the successful
first read does not invalidate its checked immutable birth. Catalog or
support replacement during the invocation is a trusted-code defect under
`b9e821dd`, not a supported configuration transition. This change does not
claim the old refusal behavior under arbitrary replacement or transport
failure. Final Rules pin, creatorDirectory, select and full-reference
coherence, Directory, Destination, two-item, binding and repository fences
remain unchanged. There is no cross-invocation cache, live policy admission
reuse, or change to persistence.

The source retains only the initial checked Rules birth inside `locate`.
It charges the existing 1,024-unit binding-comparison price before comparing
the full reference. On equality it removes one actual duplicate peer and
proof operation: one node, one call, 262,144 metadata units and 2,097,152
input-work units. After the added comparison, the proposed input difference
is 2,096,128. Other source scopes and different references keep their actual
read. These are operation counts at unchanged prices, not measured savings
or a fit claim.

A prepared Native target case uses genuine native Rules, Directory and
Destination births. It requires exactly three birth reads and two item reads
on the matching path and checks the exact six-axis cost difference. It
checks wrong incarnation and kind refusal, actual different-reference reads
with wrong creator or shipped Rules version, first-read failure on another
invocation, and refusal before RPC when the call allowance is zero. A test
transport would fail a second read of the matching Rules reference, naming
the accepted omitted observation. This test and the revised production case
have not run. The v16, v32 and v35 natural failures remain preserved.


### Actual install authority head replaces the pre-MCP summary oracle

The v38 Scope compiler and new target case passed naturally. The latter
recorded one selected pass and four unselected skips. The next signed
production run naturally failed at the anchor equality assertion, with one
failure and four unselected skips. All input guards stayed identical and
installs were zero. It recorded 37 confirmed public pass positions: Room
0–5, Site 0–3, Directory 0–13, Rules 0–10 and Destination 0–1, including the
Room genesis lost-send restart and exact rebuild. The highest captured pass
ledger was 65,180,305 input-work units. This is not a complete-case fit or
A2/clone closure: those later assertions were not reached.

The expected private Membership anchor came from a summary taken before
the MCP installation call, at sequence 11. The received anchor was sequence
12. That earlier summary is not the authority head for a later act: Core
freshly reads standing authority before judgment and retains the grant
actually judged. The closed receipt does not contain Membership entry 12's
body, so it does not establish a notification or key-opening cause.

The test-only correction identifies exactly one actual Native Rules install
act by its test idempotency key, Rita signer, full Rules target and signed
packet release. Before archive processing it selects the exact typed fresh
Membership/Rita authority observation and verifies its full sequence and
hash against local Native Membership sealed history. That independently
verified fact supplies the expected anchor and the later missing/wrong-anchor
control. The production oracle still requires exactly seven facts and exact
anchor equality; the nonproduction literal oracle is unchanged. The old
pre-MCP head remains diagnostic only. No expectation is derived from archive
selection or exported anchors, and there is no assumed sequence increment
or ordering inequality. This correction has not compiled or run.


### Declaration texts are staged before application creation

The v39 Scope compiler passed, then the next signed production run naturally
failed at the omission first-position assertion. The exact seven-anchor
equality and the new independent authority oracle passed first. The recorded
Membership head is sequence 12 and its input type is delivery; that type
alone does not establish its cause. The run again recorded 37 confirmed public
pass positions. Later offline A2 and clone closure remained unreached. All
guards were identical, with zero installs and no retry.

The failing test treated the later `application-create` delivery as the first
name of a declaration text. Native Rules actually sends those detached
`definitionTextN` fields in `application-stage`. Directory validates and
retains that catalogue before creation can proceed. The creation message
carries application identity and genesis fields, not those declaration-text
slots. A whole-entry substring search is also not a semantic text-naming
predicate: a digest appearing in metadata does not make it a declared
detached text reference. The closed receipt does not disclose the exact
Directory staging sequence, so this diagnosis makes no numeric assumption.

The test-only correction captures the unique actual Native Directory staging
delivery before archive processing. It binds full sender and recipient, the
actual Rules install job, signed release, semantic and root identifiers, the
complete declaration catalogue and every `definitionTextN` field. Its full
Native fact is checked against the independent first-naming facts.

Those first-naming facts now use the Native contract's `inputTexts` semantics
over actual sealed inputs and validated exact signed or native schemas. This
is independent of archive SQL selectors, selection records and manifests.
It includes act fields, founding and creation genesis fields for the real
root and child, and matched delivery fields using exact sender schema names.
Unknown schemas or detached texts outside this fixture's signed declaration
oracle fail explicitly. Direct Native scalar byte checks, exact omission
fact equality, original nonproduction literals, exact anchors, all negative
controls and the later replay and clone assertions remain. No product code,
price, cap, packet or generator changed. This correction has not compiled
or run.


### Coherent clone objects and refs for omission controls

The v40 Scope compiler passed. The production case then naturally failed
once at the missing-omission negative control, after 12.141087875 seconds
wall time and 13.65802 CPU seconds. All guards stayed identical, installs
were zero and no retry ran. Before that failure, the exact Native stage
fact (Directory sequence 5), semantic first naming, scalar sizes and exact
omissions passed. All five offline reports were consistent, the real Git
clone passed fsck and ref equality, and its five reports matched exactly.
The extra-omission iteration and final annotation were not reached, so the
complete case still did not pass.

The negative fixture cleared the transported production object map to prove
that clone replay read the clone. It then restored only the separately built
full-prefix objects, while leaving production refs at incremental tips. That
object/ref pair was incoherent. The observed result was archive-failure; its
exact reason and location were omitted by the assertion reporter and are
not available in the closed data. Missing incremental objects are a
source-backed explanation, not an observed runtime reason.

The test-only correction keeps the original map cleared. After the existing
five exact clone comparisons, each negative control starts with the coherent
cloned objects and refs, then overlays only the corrupt Directory objects
and ref. The missing control still requires verification/incomplete at the
exact independent Native staging fact for production; the original
nonproduction sequence-5 literal remains. The extra control still requires
archive-failure/refused. Two bounded metadata results record category, result,
reason and location before assertion, without payloads. No extra clean
replay loop, product change or relaxed assertion is added. This correction
has not compiled or run.


## Source integration checkpoint on selected Main

This source-only checkpoint starts from landed Main
`efc79bf12b57b08d25c2e88735c4e7a2e04396dd`. The prior local source is
preserved as `70c225692`. It replays only the 46 authored Slice9 paths and
unites the four overlapping files with Main's retained-floor implementation.
The extracted native catalog retains `floorReferences`; the archive input
metadata retains `floor`; reviewed policies retain the optional floor field;
and object construction and alarms retain the fixture-only floor offer.
Grow does not enable production floors.

D1 now models only the exact Grow default HTTP re-export chain and retains
all 26 existing owner seals and the three Node cases. Eight additional archive
owners and the integrated object seal are explicitly pending parser-derived
values and source review. Null pending entries deliberately block inventory
acceptance. No parser, generator, compiler, test or gate has run in this view.
The original five literal price vectors and warm/evicted activation coverage
remain required at the integrated head. The generated declarations and signed
packet remain byte-identical to the passing local V41 inputs.

CLI candidate `a281dc91153632d07a552ba6af56d22fe5e97221` and R1 are not
claimed landed here. Before any runtime or final gate, refresh this checkpoint
against the actual Main selected after those landings. This checkpoint is not
a formal Source, integrated test result, provider acceptance or deployment.


### Refresh after the CLI landing

The source checkpoint now starts from actual landed Main
`5e8476a1fb4b79aa8fb611b8848e3ecaaf42d8a1`, tree
`ded99c5aaa27554f1b4cfd169d0d6ffd954a58af`. Its 12 CLI paths are preserved
byte-for-byte, including the docs/testing.md union of D1 guidance with the
CLI narrow doc-only follow-up clause and the conditional Vitest reporter
property. The 49 Slice9 integration paths retain the reviewed four unions;
only this note adds the refresh record. R1 is not claimed landed.

The extracted catalog imports Main's unchanged floor.ts. A finite source
import-closure handoff accompanies this checkpoint so reviewers can inspect
the generator bootstrap edge without executing modules. AST seals and all
integrated runtime checks remain pending; there are no dependency copies,
imports, parser runs, compilers, generators or tests in this view.


### Adopted copy and seals checkpoint

The dependency-copy and parser stages described in the current status are
complete; earlier pending statements above describe their source-preparation
checkpoints. All actual helper sources, plans, context files and baselines
used by those stages are now permanent DATA and will not execute again.
The generated declaration artifact, signed packet, literal prices, production
logic and the four reviewed semantic unions remain unchanged. Fresh focused
recipes and root allocation are required for every remaining runtime stage.
