# Published archive anchors

This implements planner decisions `29fd51b5`, `f15e483c`, and the count-policy
correction `a7d03336`. The ordinary gate at `56a6119d1` naturally failed:
2,156 cases passed, four failed and three skipped. Three real Node entry
checks rejected a non-erasable TypeScript parameter property. The public
archive command case exceeded its original 30-second deadline. Complete
input guards passed, with no signals or unhandled errors. The full failed
run remains evidence, not a green gate.

The correction declares Replay's existing boolean as an erasable field and
assignment. Its public command witness now invokes the documented native
Node path without the test-only TSX preload. Commands remain sequential,
with all reports, trust choices, token checks, caps and deadlines unchanged.
All four affected compiler roots and 22 whole-file cases passed at
`739bc3c3e` under `392c4138d`. The production public command completed in
27,672 ms under its original 30-second deadline, with trusted exit zero and
five consistent reports. This observed fit is not a general timing-margin
guarantee. Page asset equality also passed without another build.

The downstream attempt then passed 34 of 36 Node cases. Two source-boundary
checks rejected the new anchor-range test's deliberate Git encoder and
reader imports because its exact path was missing from the development
exception set. The correction adds only that test path. Portable production
restrictions, Git dependency direction and unlisted-file counterexamples
remain unchanged. The whole source-guard file then passed all 10 cases,
and the previously unreached Counting checks passed all 55. The unaffected
Node files and passing Vitest files were not repeated. The full gate remains
a failed run followed by separately attributed owning corrections; it was
not repeated or reported green.

Earlier owning results remain attributed to their exact checkpoints:
Scope test and Node-support compilation plus all six heavy cases passed
at `1de5a73b7` under `9b89ba9d7`, including strict scale replay, dense
retained inputs, cadence, floors and capacity. Installed six passed at
`08bbee7b7` under `1c9c2cca5`, including trusted exit zero and all five
consistent journal reports. The maintained Page build and DATA comparison
passed under `a30b7daf4`, and the owning freshness check passed at
`2ae74554c` under `2909b881c`. Fresh equality after the Replay correction
is included in the owning checks rather than assumed from tree shaking.

These local Native and Node fixture results do not establish hosted
custody, deployment or provider throughput. Initial integration at
`1793ca7d` and every failed attempt below remain historical. Formal review
and landing remain pending.

## Publication is distinct from replay trust

Each new Native v2 pass writes `anchors` in its existing `pass.json`, including
an empty list. The list contains only the actual planner's Register or
Membership facts outside the public journal set. Facts are ordered by scope
and position, with one fact per scope and position. An archived public journal
cannot become an anchor. Its count is independent of retained entry copies:
a signer's authority head needs no copy. Its bytes and all extra validation use the original metadata and work
allowances.

The reader returns `publishedAnchors`, each list's `anchorRanges`, and `anchorCoverage`. Missing fields in
old passes remain readable and appear in `anchorCoverage.unpublished`. Reading
a list does not grant replay trust. The separate public command requires an
explicit trust option before it passes those facts to Replay.

Coverage records name the current validated immutable snapshot and a pass
range. They do not claim that the reader walked every historical publication
commit. Identical facts can repeat across passes. Conflicting hashes for the
same full scope reference and position refuse; distinct incarnations remain
distinct in the combined list.

## Legacy coverage uses the whole held prefix

The first new pass after a legacy v2 receipt also writes `legacyAnchors` with
`from: 0` and `through` equal to the previous confirmed position. The same
Native planner reads the still-held prefix and validates the selected local
entry bytes. The writer still validates the receipt-bound earlier pass metadata.
The list has no aggregate retained entry-copy bound. It does not read
old archived entry bodies as a substitute for missing Native inputs.

There is no partial migration. A missing, pruned, unsupported, or overbudget
prefix refuses before the new Mark. The original 4096-entry allowance also
bounds this one-time operation; larger historical migrations are unsupported.
The deployed legacy range through position 1 is the intended initial case,
but its runtime fit is unproved.

A v1 conversion re-admits and compares its complete prefix as before. Its
first v2 publication covers that complete prefix without a separate legacy
range. Low-level Git callers that omit the metadata finalizer retain the
legacy byte format.

## Mark and retry preserve the exact publication

The Git writer calls the metadata finalizer once after validating the selected
entry chain and retained inputs. The finalizer cannot change the selection.
The writer then validates the returned fields and counts them in the ordinary
manifest. No extra tree node or archive authority is introduced.

The pending Mark stores the original selection, exact canonical publication,
and a bounded immutable list of descriptive public scope references. Rebuild
collects current anchors again from the marked interval and compares them
with the stored publication. The stored legacy range and list remain exact;
rebuild does not rescan history before the marked interval. Old pending Marks
without publication fields retain their original rebuild path and bytes.

Room target discovery returns the checked creator and Destination route plus
the Rules reference checked against Directory metadata. The latter is
reference-only in Room mode, not a Rules birth or pin claim. Directory, Rules,
and Destination retain their full discovery. The exact public list is stored
per Mark, so a larger temporary source map cannot change retry classification.
Duplicate scope IDs, aliases, private kinds, and a missing own scope refuse.
Target, repository, private source proof, and fresh Native admission still run
on retry. The list is not an authority cache.

Private source preparation retains the existing admitted `uses` reads. It also
extracts full references only from `input.authority[*].issued.at`,
`input.authority[*].fresh.observation.of`, and
`input.observed[*].observation.of`. Native frames close before existing birth
RPCs. Similarly shaped arbitrary user values cannot trigger those reads. The
existing actual-byte collector can still refuse a fact-shaped user value
whose private source proof is unavailable; no substitute anchor is invented.

## Floors require complete publication

Only confirmation of a fully covered publication derives
`confirmed.anchorsPublished: true`. A Mark cannot supply that flag. Legacy
receipts default to uncovered. The alarm floor writer requires the flag and
rebinds the exact confirmed receipt before returning an offer. The independent
floor judge and its original ordering, prices, caps, and receipt fields remain
unchanged.

Archive rows remain trusted internal bookkeeping. Their structural validation
is not independent proof against arbitrary direct SQL corruption or a hostile
internal caller inventing a whole receipt. No external route can set coverage.

## Prepared witnesses and remaining work

The Git tests use real encoders and the clone reader over synthetic signed
selections. They cover a nonempty publication, explicit empty publication,
legacy absence and later complete coverage, plus malformed, duplicate,
unsorted, and own-journal lists. These fixtures claim no Native admission.

The new Native witness builds a real old-format archive from admitted local
inputs, confirms its legacy receipt, and checks that the alarm cannot floor
it. A real new pass must publish the entire held prefix, confirm coverage,
and permit a count fall. A reduced-budget negative earns no partial Mark or
coverage. Existing floor-alarm fixtures use real writer passes and therefore
earn empty publication rather than receiving an injected flag. Direct judge
fixtures remain labelled independent of writer custody.

All witnesses are unrun. The separate command author owns the actual
five-journal clone and public replay witness. Owning parser seals, focused
checks, and one ordinary gate on the integrated head require root allocation.

### Nonempty Native validation follow-up

Source review `970ea5a8` identified that both initial Native witnesses used
empty lists. The synthetic Git witness did not cover Native private-source
admission and retry. Those earlier witnesses and the review packet remain
unchanged.

The added Native case uses the genuine Register17 and Directory16 creation
from `sessionRoom`. Before any archive work, it identifies the unique actual
Register send that creates that Directory. Its sealed position and hash are
the expected anchor. The Directory's genuine genesis source and retained use
must agree with that independent fact. No caller supplies an anchor list.

The original Grow policy admits the existing source copy. The case pays for
actual target discovery, bounded source-reference metadata, a fresh native
birth read, source-pin validation, publication, and Mark work on one original
pass ledger. The actual manifest must contain exactly the known nonempty
list. The stored publication and public identities must match the Mark.

A later genuine checkpoint and eviction precede a new retry ledger. The
case repeats target and private-source validation, reads only the marked
Native position, and requires the same manifest bytes, objects, and commit.
A genuine Directory birth misbound as the private Register proof refuses.
An unavailable private proof refuses before payload reads or Mark creation.
The test records the actual settled costs without asserting a new allowance
or a fit result in advance.

This follow-up is also source-only and unrun. Its reader and repository
creation are test-host stand-ins. It does not establish the deployed binding,
hosted custody, or complete production driver acceptance.

## Integration and authority-source seals

Assertion `5cf11e93` records the 56-path command and writer union. It keeps
the R1 local-clone diagnostics and preflight checks. Source reviews
`970ea5a8`, `c8a61c7d` and `e330f752` cover the writer, reader and nonempty
Native witness. Their findings do not establish runtime success.

The integrated checkout has its own dependency view, installed offline
from the reviewed lockfile without changing any source. The maintained
`sourceSeal` parser computed the eight changed archive-owner seals after
source review. The inventory test records those outputs; unchanged R1
owners retain their prior values. Seals detect source changes and do not
prove runtime authority. The owning checks and final gate remain due.

## First owning Node run and refusal-name correction

The first owning Node run at `48e1bddd` closed naturally with status 1:
51 cases passed and one failed across 16 files. All fixed source, dependency,
tool and environment guards passed; only the bounded Vitest cache changed.
The failed control expected `archive-limit` when one anchor exceeded zero
retained entry copies. That branch calls `JournalWork.stop()`, whose typed
refusal has always been `journal-layout-limit`. The correction changes only
the expected refusal name. The zero-copy bound and refusal assertion remain;
removing that bound would still make the control fail. Product behavior is
unchanged. The 51 passing cases are not repeated. The changed Git file and
Native publication, floor and public-command witnesses remain due.

The raw failed run is retained at
`/private/tmp/artroom-archive-owning-node-evidence-20261022`, with its original
child and owner status 1. This is not a passing pipeline or a hosted result.

## First Native focus and bounded query correction

After the refusal-name correction, the changed Git file passed all three
cases with unchanged fixed inputs. The first Native focus at `33db1fc12`
then closed naturally with child and owner status 1: seven cases passed,
six failed and six were filtered. All fixed source, dependency, tool and
environment guards passed; one owned workerd was observed. The raw failures
remain at `/private/tmp/artroom-archive-owning-native-evidence-20261022`.

The new identity query began with `WITH`. The existing read-only budget
wrapper admits only `SELECT`, so it refused before executing that query.
The repair uses the same bounded inner selection as a subquery of `SELECT`.
It preserves the selected entry, three typed identity paths, output limit,
and original metadata and input-work reservations. It does not broaden the
budget's SQL admission or create another allowance.

The nonempty Native case stopped earlier at its independent fixture oracle.
Directory genesis retains both the Register founding act and the later send
that creates Directory. The oracle now identifies the exact signed `found`
act by the genesis seed's cause, and the unique actual Directory creation
send. It requires both specific full facts in retained uses and sorted
publication, rather than accepting an arbitrary nonempty list. Its actual
initial and rebuild costs remain measured on their separate original
ledgers and checked against every unchanged cap. No fit is assumed.

The owning Scope compiler, source inventory and six affected Native cases
are pending for this correction. The seven passing Native cases and earlier
51 passing Node cases are not repeated. No final gate or hosted result is
claimed.

## Affected focus and genuine member reader

At `03e77823`, the owning Scope test compiler and three inventory cases
passed. The affected Native run then closed naturally with status 1:
all six selected cases failed, with six other cases filtered. Fixed guards
passed. The two-fact oracle passed before the nonempty case reached target
discovery. Production advanced through Room position 1 before position 2
stopped at the original limit. Its cost is under separate diagnosis.
The four synthetic publication/floor cases still returned unavailable;
the original errors have not yet been identified. No passing gate is claimed.

The nonempty fixture supplied the generic test reader to real PLATFORM
item queries without enrolling its member. It now creates the existing
Membership seat and first key through genuine Native acts, then mints the
fixture room's ordinary summary/items session reader. Target discovery keeps
its existing authorization, birth, pin, repository and binding checks.
This is fixture token minting, not hosted issuance proof. The strict two-fact
oracle, original budgets, cost assertions and 30-second deadline remain.
The source change is independently reviewed; its Native run is pending.


### Pending genuine authority fixture migration

The default Lane grant is a test-authority stand-in. Its synthetic Membership
reference has no native source birth. The newly published path now requires the
real private authority source identity, so the four synthetic publication/floor
failures cannot establish a product failure independently of that fixture gap.
The two diagnostic runs and their original natural failures remain evidence;
neither diagnostic passed the product witness.

The proposed fixture migration creates the existing native Register17/Directory16
cohort with `sessionRoom`, then admits Membership8 seat, first-key and set-actions
acts. Lane authority forwards the actual Membership observation unchanged. The
existing `FixtureArchiveSourcePins` contract receives that source's actual native
birth. The reported external fixture ledger covers source-birth reads and source-pin
preparation only. It does not count all sessionRoom, seat, first-key, set-actions
RPC or wall work. Those are additional external fixture setup. Each writer pays its
existing lookup and validation charges. This is not a claim about production
preparation cost or deployed throughput. Host, token, clock, declaration and
inline Lane policy remain explicit test fixtures.

All signed histories, original positions, admission/count/head/floor assertions,
caps and deadlines remain. This includes the 30,000-entry floor history, exact
2,000-entry ceiling with 10,000 real inputs, cadence windows, and retained-rule
scale history. Legacy foreign inventory and literal-cost controls keep their
original authority; only their published alarm opts in. The two TEST offline
replay checks now explicitly supply caller anchors independently captured from
the actual Membership observations, with exact fact and trust assertions. They
do not trust archive publication output or export the private authority journal.

The original policy conflict remains part of the failure history: authority heads
were required while anchor count was bounded by retained entry-copy count. A
signed scalar-field act can retain a real authority head with zero copied foreign
entries. Planner reconciliation `a7d03336c27f80f56c6f13938dd8731129f8f5ad`
withdraws that copy-count relationship and requires unused-anchor refusal per
range. A separate source author owns that product change. This fixture migration
does not invent copies, drop heads, widen budgets or set an empty-list override.

The fixture now owns every asynchronous Lane entry used here, including direct
stub calls, inside callbacks, alarms and eviction. It stops new calls before
joining registered work. Admitted RPCs can complete their internal Membership
reads, while retired top-level continuations refuse. The opt-in sessionRoom
lifetime delegates its sole finish hook to the archive fixture; default callers
keep their existing automatic cleanup. Setup itself is registered before its
first await, and its lifetime is captured before native creation so failed setup
remains owned. Known dynamically discovered native handles join their existing
callbacks without dispatching effects or advancing clocks.

Cleanup has a separate nine-second settlement bound, below the maintained
ten-second hook allowance, and finite task/callback frontiers (64 rounds,
4,096 aggregate callbacks). It does not extend a hook, test or archive deadline. If settlement is
incomplete, cleanup fails and retains the owner, clock and resources; it does
not claim cancellation, transitive quiescence or safe successor execution. Rita
is the same derive testing key object in both Lane and native repository
fixtures, checked explicitly.

The migration is uncompiled and unrun. Runtime fit, genuine per-act RPC cost,
cleanup behavior and all affected publication/floor acceptance remain unproved.

## Exact anchor consultation under the corrected policy

Decision `a7d03336` withdraws both copy-count bounds. The existing manifest byte
ceiling and the existing per-anchor metadata charges remain. The Git helpers
retain their count argument for source compatibility, but no longer use it as
an admission bound. Register and Membership kinds, exact identity, sorted
scope/position order, unique positions, and exclusion of public journals remain.

The writer's byte scanner collects candidate references from admitted local
entries and selected foreign facts. It is not evidence that replay needed a
candidate. With explicit published-anchor trust, each replay proof uses the
list for the scope and range of the entry that needs the fact. An anchor from
another pass or another scope cannot fill an omission. A cached anchored proof
must make the same range check and mark its consultation again.

The archive session registers each actual opened snapshot's range metadata
before returning its page or retained input. This includes dependency journals
opened while classifying a copy. Missing or unpublished coverage provides no
fallback to the aggregate list. The added scope-map record pays metadata and
input work on the same read budget; the existing per-anchor metadata pays for
consultation marks. Generic explicit caller anchors retain their old semantics
when published trust is absent. The portable verifier gains optional range
policy metadata; its ordinary contract report categories do not change.

After replay completes a range, a listed fact that no proof consulted refuses
archive acceptance as `anchor-unneeded`. The result names its full fact, owning
scope, immutable commit, range, and whether the range is legacy. Earlier replay
failures remain earlier failures: an absent required anchor still reports
`missing-dependency`. Integrity-only checking cannot establish this exactness
and is not accepted with the published-trust option. No list is trusted by
default, and no source or anchor is invented.

Adaptive fit reserves a conservative publication count from actual selected
copy count plus selected entry bytes divided by 128. These are the scanner's
only producers: selected-copy full facts, full facts in local JSON, and
`of`/`head` observation objects. Each local occurrence contains its own 55-byte
scope ID, 29-byte incarnation, and 71-byte hash: at least 155 bytes before
punctuation. Shared in-memory identities do not share serialized JSON bytes.
The quote checks safe-integer arithmetic and reserves collection, ordering,
classification, manifest, Mark, and transfer work at the existing rates. This
can shorten passes unnecessarily; it makes no throughput or fit claim. Final
paid collection determines the actual list. An entry that cannot fit alone
produces no new Mark or floor permission; no budget grows.

The new Replay witnesses use actual Git encoders/readers and derive-judged
in-memory remarks. Their task code, Membership observations, and admitted
selection are explicit test stand-ins, not Native source-authority proof. They
cover a one-remark pass with zero foreign copies and explicit signer-head
trust, unused Register refusal, a remarks-only legacy prefix, cached proof
reuse across ranges, and a nested public dependency's own range and commit.
The same legacy case also refuses an unused legacy anchor. The Git parser
control now accepts a zero-copy list but still refuses the unchanged metadata
limit. These sources and the combined Native migration remain unrun. Parser
seals, owning compilers, small semantic witnesses, original large histories,
the five-journal command, and the final gate still require root allocation.

The first combined focused attempt at `9dd7cf66` stopped in the Replay test
compiler. The eight preceding compiler roots passed: Derive source/test,
Platform source/test, Git source/test, and Replay source/Node. Replay test
reported 12 diagnostics: the new fixture supplied a `Map` where native rules
use a record, and typed its serialized inventory consumers as the parsed
journal consumer representation. The remaining Scope and CLI compiler roots
and all eight selected Git/Replay cases were unrun. The outer owner and child
both exited 1 without a signal; source, installed dependencies, tools, and
selected environment stayed unchanged. Owner-inclusive time was 4.892557
seconds elapsed, 7.925183 user CPU, and 2.134711 system CPU.

The follow-up uses the existing empty rules record and the actual native
inventory's selected-object type. It preserves every consumer field and test
assertion; no type cast bypasses those APIs. It schedules only the failed
Replay test compiler, the six unrun Scope/CLI compiler roots, and the eight
unrun cases. The eight passed compiler roots remain separately attributed to
the first attempt. No follow-up result is claimed here; the Native,
production, heavy-history, and final-gate obligations remain pending.

The follow-up at `209a25b5` passed all seven remaining compiler roots and the
three Git publication cases. Its first Replay case failed before any
judgment: the shared fixture had spread a comment act into `vouch` and then
added a fact guard, which the validator correctly refuses. The other four
Replay cases were unrun under the maintained bail setting. Owner 91955 and its
child naturally exited 1 without a signal, with full guards stable. Its
owner-inclusive time was 6.680521625 seconds elapsed, 12.691451 user CPU, and
2.571674 system CPU.

The next fixture correction makes `vouch` a transition on the live repository
item and uses the existing `on` helper to supply its current revision. The
real presented-fact guard and validator remain. The nested case also checks
that the judged entry retained exactly the presented foreign fact and its
canonical content digest. No product source or earlier assertion changes.
Only the Replay test compiler and complete five-case Replay file are planned
next; the passed Git file and other compiler roots are not repeated. No
further runtime result or broader acceptance is claimed.

The Replay-only follow-up at `fa1667f7` passed its affected test compiler and
all five Replay cases. Owner 95986 and its child naturally exited 0, with no
signal or guard errors. Its owner-inclusive time was 4.197650542 seconds
elapsed, 3.633985 user CPU and 1.192266 system CPU. Earlier compiler passes
and the three Git cases remain separately attributed to their original
attempts.

The next full Native attempt (3 publication and 13 driver cases) stopped in
its first case.
The legacy publication confirmed layout 2 with published anchors, but the
floor assertion found no floor at line 96. Owner 98344 and its child naturally
exited 1 without a signal, with full guards stable; inclusive timing was
9.003880833
seconds elapsed, 6.953711 user CPU and 1.728606 system CPU. The failed case
ran for 476 ms. The other 15 cases remained pending without completed
acceptance;
the maintained ledger labels them unfinished after bail. The original
reports, including their aggregate counters, are preserved unchanged.

Source inspection establishes a fixture error independent of the hidden floor
answer: its head at position 9 left no room for the judge's required 100-entry
live window, and its margin of 1 would still offer a near-head floor after
adding history. The repair retains the original eight signed remarks, appends
exactly the exported `FLOOR_WINDOW` genuine Native checkpoints, and sets only
the fixture floor policy's margin to that same 100-entry window. The old
prefix is still aged by the original 1000/1001-second clock steps, beyond the
900-second intent lifetime. For the intended post-backfill head at 109, the
policy
can offer floor 10, which would retain the required live window. Removing old
non-root entries can still make the original strict row-count decrease
assertion meaningful despite the new remark and floor entry. These are source
calculations, not an observed successful floor. The protocol, coverage
assertions, floor/deletion
assertions, the 30 s deadline and product bounds are unchanged. No repaired
Native
result is claimed until a separately allocated run.

At `1dda1f1c`, the affected Scope test compiler and all three publication
cases passed (616, 453 and 343 ms). The first driver case then failed after
390 ms: its second alarm confirmed position 8 rather than the captured head
at 17. The remaining 12 driver cases had no completed acceptance after bail.
Owner 23562 and child naturally exited 1 without a signal; full guards stayed
stable. Inclusive timing was 10.232086 seconds elapsed, 11.249065 user CPU and
2.261909 system CPU. Original reports remain unchanged.

The source allows that earlier complete prefix: adaptive selection preserves
a selected finish when later lookahead or its quote cannot proceed, and
confirmation schedules the next alarm when the native head remains ahead.
The observed position 8 does not identify a particular limiting budget axis,
or show that the tail was lost. The old fixture's exact two-pass assumption
was stronger than this driver contract under genuine authority accounting.

The driver witness now retains the blocked first pass, all 16 accepted native
turns, no send while blocked, the exact first receipt and the unchanged live
head. It follows real scheduled alarms with strict positive confirmation
progress, no pending or stopped row, a ceiling at the captured head and
exactly one new send per pass. The loop is bounded by the number of remaining
positions and still requires final exact head equality and a single target.
The original 20 s deadline and all product budgets remain. No repaired driver
result is claimed. The next checks need only the affected Scope test compiler
and complete 13-case driver file; the unchanged publication file is not
repeated. Production, large histories, command/clone and final gate remain
separate obligations.

At `94a3e818`, Owner 90521 and its child naturally exited 1 without a
signal; full guards stayed stable. The affected Scope test compiler and the
first five driver cases passed, including the repaired 16-turn continuation.
The sixth case stopped at its first candidate under its fixture-only 40 MiB
input cap. Its finish quote was 27,350,962 input units, with 15,984,181 already
spent: 43,335,143 exceeds 41,943,040 by 1,392,103. There was no selected earlier
prefix for a finish reserve to protect. Final spent work was 22,333,401;
that later total does not establish overspending. The remaining seven cases
had no completed acceptance after bail. Inclusive elapsed, user and system
times were 9.939571, 11.716492 and 2.103486 seconds. Original reports remain
unchanged.

The adaptive witness now uses `ArchiveBudget`'s unchanged production limits,
including 64 MiB input work. This removes the reduced fixture cap; it does
not change a product limit or select a new allowance to fit this result.
The 300 genuine checkpoints, two passes, first-prefix bound below 128,
second prefix below the native head, incremental append, no closure reread
and original deadline remain. A bounded observer delegates each synchronous
lookahead to the original method once and returns its result unchanged. It
retains at most eight scalar records per budget, only under a positive
finish reserve. Each confirmed pass must show charged work on a later
discarded position or a limited lookahead, and all six final work axes must
remain within their original caps. No repaired result is claimed before a
separately allocated compiler and full driver-file run.

At `ce48c3f7`, Owner 62355 and its child naturally exited 1 without a
signal; full guards stayed stable. The Scope test compiler and first seven
driver cases passed, including the default-budget adaptive reserve witness
with charged discarded lookahead and the covered earlier-prefix control.
The SHA-1 resume case then reached offline verification but reported
`mismatch`, with no consulted anchors, instead of the required `consistent`
result. Five later cases had no completed acceptance after bail. Inclusive
elapsed, user and system times were 10.787299, 12.615306 and 2.192077 seconds.

The original assertion output omits the verifier's reason and location, so
it does not establish a cause or a product defect. The offline check still
uses explicit caller anchors from actual independent Membership reads;
published-anchor trust is not enabled implicitly. Its strict assertion now
includes only the existing outcome's reason (at most 2048 characters, with
a truncation flag), result, target/failure references, at most four coverage
ranges and counts. It reads no additional archive object and changes no
verification option or expectation. The original failed evidence remains
unchanged; a separately allocated owning-file run is needed to diagnose it.

At `80ce6ae6`, Owner 26384 and its child naturally exited 1 with stable full
guards and no signal. The Scope test compiler and first seven driver cases
passed. The bounded diagnostic located the same SHA-1 mismatch at entry 1,
the remark: the grant had no action, recorded Membership or authority
window. Source resolves that disjunction. The remark names an action and
has the ordinary window, but this fixture's signed founding has no creation
message. Its runtime injected a real Membership read through test controls;
the immutable genesis does not record that Membership association. Replay
correctly refuses to infer it from an opener or an anchor. Coverage ended
at genesis, with no missing dependency and no consulted anchor. Five later
cases had no completed acceptance. Inclusive elapsed, user and system times
were 12.655340, 12.735925 and 2.532682 seconds.

Only the two resume/replay cases now opt into a genuine native Directory16
factory birth. A TEST-labelled capability-free Lane declaration preserves
their remark, offer, assign and `not-self` rule; its unused hold capability,
hold item, hold acts and timed hold rule are absent. The real Rules10
activates that exact declaration, and an authorized signed Directory action
creates the child. Dispatch records an applied genesis with the exact sealed
create source, seed, ordinal, message and authoritative Membership8 full
reference. The fixture facade fetches fresh stubs in the actual `PLATFORM`
namespace after eviction; authority stays the production authority. A
name-bound test archive hook supplies only the existing stand-in provider,
target and reviewed fixture policies. Other fixture births are unchanged.

The Directory creator fact is independently captured before archive output
and supplied as explicit caller trust, alongside the independent Membership
head. Its real birth is pinned under the Directory16 policy, in addition to
the Membership8 source pin. No verifier trust default, private-name policy,
creation validator or archive budget changes. The later assign must retain
an actual `not-self` rule input. Pending-Mark bytes, actual eviction/resume,
both Git formats, final exact head and strict consistent/anchor/trust checks
remain. The factory adds a Rules activation, a Directory application action,
their actual dispatch/child birth, an extra bounded source-birth read and
independent authority reads to external fixture setup. That setup is not an
archive throughput or full preparation-cost measurement. All original
deadlines and product caps remain; the new fixture has not been compiled or
run, and no repaired acceptance is claimed.

At `6bc79714`, Owner 35833 and its child naturally exited 1 with stable full
guards and no signal. The Scope test compiler and first seven driver cases
passed. The SHA-1 resume check passed the real factory genesis, then reported
`missing-dependency` at child entry 1: it needed Directory entry 6, while the
independent anchor list contained the creation action at entry 5. Target
head was 4; coverage ended at genesis. Five cases had no completed acceptance.
Inclusive elapsed, user and system times were 12.060912, 12.859269 and
2.488918 seconds.

Those are two distinct protocol facts. The Directory creates the child,
then records its applied result and sends the control that activates it.
The activation retains that second Directory entry. The fixture now selects
exactly one actual sealed Directory result bound to this child's exact
genesis and the original creation fact and send number. It checks the
result's hash, its actual confirmation send and the child's matching
activation entry and effect. This independently captured confirmation fact
is explicit caller trust after the creation fact, before the Membership
head; none is taken from archive output or a guessed next position. The
existing Directory source pin and policy cover both facts. One additional
bounded Directory history read belongs to external fixture setup; no native
entry, dispatch, archive allowance or verifier rule is added. Strict replay,
exact anchors, both formats, head/bytes, deadlines and caps remain unchanged.
No repaired result is claimed before a separately allocated owning-file run.

At `85bbd775`, Owner 42755 and its child naturally exited 0. The affected
Scope test compiler and all 13 driver cases passed with stable full input
guards and no unhandled error. That includes both factory-born resume
formats and the independently captured Directory confirmation fact. The
inclusive elapsed, user and system times were 14.059652, 15.108460 and
2.560432 seconds. Earlier publication, Git and Replay outcomes remain
separately attributed; they were not repeated in this run.

The next whole installed file ran under Owner 27600 at the same head. It
naturally exited 1 with stable full guards. The fixture and Grow cases
passed, including their local clone checks. Grow production stopped at
Site entry 3 with `unsupported-foreign-copy`; its receipt remained at entry
2 and no Mark was pending. The original ledger had spent 53,679,765 input
units, within the 67,108,864 cap. The two activation cases and production
command/clone phases had no completed acceptance. Inclusive elapsed, user
and system times were 18.117168, 17.144838 and 2.136447 seconds.

The Site entry needs an admitted Room copy. The production target returns
its checked creator route, Directory, Rules and Destination, but that list
does not include the child Room. Publication correctly refuses to turn a
public lane dependency outside its replay closure into a private anchor.
The earlier whole-prefix fixture supplied the complete five-scope list;
the actual production pass supplied only its narrower target route.

Published building now extends that descriptive route only with producer
full references from copies already admitted by the selected inventory.
It preserves conflicting-reference rejection and excludes Register,
Membership and Inbox from this addition. The Room remains a dependency
whose journal must be replayed. This grants no new source read, body,
export or caller trust. Register17 and Membership8 anchor restrictions and
generic explicit caller anchors are unchanged. The validated union is
stored on the Mark; rebuild refuses a Mark that omits a producer instead
of silently expanding its recorded closure. Its ordered full-reference
comparison pays the existing 1,024 input units per reference before
traversal and compares fields directly, without JSON scratch allocation.

The extra bounded object walk pays the existing 1,024 input-unit visit
price; each new map entry pays 512 metadata units before insertion. The
adaptive finish quote reserves the target count plus one producer per
copy, including conservative duplicate and private-copy overestimates,
and the extra walk and map metadata. Checked arithmetic and the existing
64-scope ceiling can refuse a candidate or shorten a pass. Original
prices, caps and deadlines remain unchanged; no fit improvement is
claimed. A new small Native direct-copy case starts with the producer
omitted, checks the exact deduplicated closure and non-anchor treatment,
rejects conflicting and private target references, and checks exact
rebuild plus refusal of a truncated Mark. It has not been compiled or run.

The producer-closure change was independently source-reviewed and merged
with Main's dependency update at `d2daa46c`. The merge preserves Replay's
existing Platform workspace dependency in both its manifest and the lockfile.
Normal `npm ci` and the maintained pool compatibility command each exited
0. Their owner exited 1 because its final metadata comparison rejected
the lock stamp's expected change to the parent directory's link count.
A later read-only reconciliation found only that stamp and parent change,
with sources, tools and selected environment unchanged. Neither command
was retried. The next owning run, Owner 55041, passed both Scope compilers
and all 12 foreign-copy cases with stable full guards under Vitest 4.1.12.
This includes the new producer-closure and truncated-Mark control.

Owner 78521 then ran the whole installed file at the same head. It and its
child naturally exited 1 with stable full guards. The fixture and Grow
cases passed. Grow production passed the earlier Site dependency refusal,
then stopped before Rules entry 2 with `limit`: its receipt remained at
entry 1 and no Mark was pending. The independent pre-archive oracle
identifies that exact entry as the real signed `install-application` act.
The 2,122-byte delivery shape recorded elsewhere belongs to Directory
entry 2, not this Rules entry. The rejected finish quote was 39,729,189
input units after 36,602,490 units spent, exceeding the unchanged
67,108,864 cap by 9,222,815. Final spent input was 42,954,999, which does
not establish overspend or the size of a particular finish component.
Rules entry bytes and component totals were not recorded. Production
command, replay and clone checks, and both activation cases, still have
no completed acceptance from this run.

The finish forecast previously treated every 128 bytes of local entry
text as another possible anchor. Scouting now pays for one additional
SQLite metadata query after each exact row's prefix and privacy admission.
Before SQL, that query charges the existing 64 input units per entry byte,
one native call and 128 metadata units, including their native input fold.
It returns only counts from `json_tree`, never a body or a tree value.
The smaller count of object-valued `at`, numeric `seq` and text `hash`
keys bounds full fact references. The smaller count of object-valued `of`
and `head` keys bounds observations. Both integer and real SQL numbers
are counted. Counts from unrelated objects can increase these bounds.
All counts, their sum and the cumulative prefix count must be finite,
nonnegative safe integers before use.

Each completed scout position stores its own cumulative count. Selecting
an earlier prefix uses that position's count, without refunding later
work. The finish forecast adds copied-fact candidates separately and
keeps the exact legacy count. Final anchor collection, source lookup,
privacy, explicit trust, manifest and Mark checks remain unchanged.
No capacity, price or deadline increases, removed validation or proven
fit improvement are claimed.

A new real-SQLite metadata control uses synthetic JSON only at the scalar
query boundary. It includes nested fact references and observations,
deliberate false-positive keys and a large irrelevant string. Both small
and large rows must have the same conservative reference bound. It checks
the full charge before SQL, refusal before SQL with one input unit missing,
and an earlier-finish reserve that blocks the query without spending its
debit. The existing Native scout control also checks that later positions
do not change an earlier prefix's count. These changes have not been
compiled or run. Earlier failures and the remaining heavy cases and final
gate remain separate obligations.

At `835ccc21`, Owner 13926 and its child naturally exited 1 with stable
full guards. Both Scope compilers and the first four foreign-copy cases
passed. The new scalar metadata case then failed before SQL because
`canonicalize` rejects its deliberately fractional false-positive numbers.
The other eight cases had no completed acceptance. Inclusive elapsed,
user and system times were 9.409482, 10.732344 and 2.478703 seconds.

That control now uses `JSON.stringify` for its two synthetic raw JSON
rows. These rows test SQLite metadata, not canonical ledger entry
admission. They retain the fractional numbers that exercise SQLite's
`real` branch, all exact counts, precharge, refusal and lookahead checks.
No product code, ledger format, cap, price, deadline or assertion changes.
The corrected control has not been compiled or run.

Owner 66346 then naturally exited 0 at `e1f9d044`, with stable full
guards. The affected Scope test compiler and all 13 foreign-copy cases
passed. The unchanged Scope source compiler's earlier pass remains
separately attributed. Inclusive elapsed, user and system times were
9.966899, 10.733221 and 2.303452 seconds.

The maintained `sourceSeal` parser ran once under Owner 78750 and exited
0 with stable full guards and unchanged cache. Only `archive-build.ts`
had changed since its existing map entry's seal adoption. The parser's
actual output now replaces that one stored value. No new owner mapping
is added for the scalar helper, adaptive planner or scout files. This is
source metadata, not a D1 test or archive acceptance result.

The next whole installed run, Owner 49555, naturally exited 1 at the same
head with stable full guards. The fixture and Grow cases passed. Grow
production again stopped before the genuine Rules installation act at
entry 2, with receipt through entry 1, no pending Mark and no source
refusal. Its original ledger had spent 37,142,778 input units before the
34,582,930 finish quote. Their sum, 71,725,708, exceeds the unchanged
67,108,864 cap by 4,616,844. Final spent input was 43,495,287; this is not
an overspend or a finish-component measurement. Inclusive elapsed, user
and system times were 19.459163, 18.677566 and 2.219790 seconds.

That run still records no Rules entry byte size or finish component
table. Its independently captured Native installation fact identifies
the exact Rules reference and hash. The only byte shape is the separate
Directory entry 2 delivery. That Directory's older component observer
reports itself incomplete because its capture cap overflowed and a later
parent read invalidated its snapshot. It cannot explain this Rules
refusal. Production command, replay and clone acceptance, both activation
cases, the six heavy cases and the final gate remain pending. A bounded
temporary diagnostic of original computed Rules finish components is
being prepared for review. No further optimization or fit claim follows
from these aggregate costs alone.

The temporary Rules diagnostic, Owner 31024, naturally exited 1 with
stable full guards and no signals. Exactly one binding and one component
record matched the independent Native Rules installation fact. All six
component sums matched the original rejected quote. The 8,440-byte
installation act had 14 effects and no sends. Its largest finish input
components were row bookkeeping at 13,377,462 and inventory at 9,325,680.
The original quote and spent work remained those reported above. This
instrumented run establishes attribution, not acceptance or performance.
Both temporary files were restored exactly to `96528d87` and their removal
was committed at `a15d9034`, whose product tree is identical to that source.

A separately reviewed forecast refinement then priced a provably first
declaration read on a fresh inventory reader at its existing cold-read fee.
Repeated and unknown reads retained the maximum. Owner 14492 at `90f04da2`
naturally exited 0: both affected Scope compilers and the whole 17-case
inventory file passed with clean full guards and no signals. These results
remain separately attributed to that source, including its added case.

Owner 78187 then naturally exited 1 at the same clean head with stable full
guards and no signals. The fixture and Grow cases passed. Grow production
stopped at the same Rules entry 2 with the same 34,582,930 finish quote and
37,142,778 spent input. Receipt through entry 1, no pending Mark and no
source refusal were unchanged. Both activation cases remained pending.

Source tracing explains the lack of effect. This native Rules root has no
inline digest creation edges. The installation act's semantic and release
inputs are retained values; its declaration texts are detached omissions.
It requests no eligible declaration body. The two retained value inputs
already receive cold-read forecasts in final inventory and, separately,
the later immutable-input reader. Neither phase can be discounted again.

The unrelated three-path declaration refinement is now explicitly reverted
to the exact `a15d9034` source. All pre-existing inventory cases, actual
read and row-save fees, assertions, capacities and deadlines remain intact.
The original refinement commit and its focused pass remain in history.
No additional run is claimed for this exact restoration. Further work
requires a concrete measurement or mechanism proposal for actual fixed
reservations; lowering only their forecasts would be unsound. Installed
production acceptance, both activation cases, the six heavy cases and the
final exact-head gate remain pending.

A proposed bookkeeping refinement retains both durable writes and both
atomic cuts. After all existing row checks, only the exact confirmation
post-state can use a smaller serialization reservation: a nonnull receipt,
null pending, stopped and next fields, and zero attempts. The closed schema
has at most 25,087 UTF-8 bytes, including four maximally escaped repository
strings. Its reservation rounds up to 32 KiB. Target, pending and stopped
rows retain the full existing bound.

The existing fixed 4,096 input units are charged once, before the constant
shape selector. Both SQL calls and the original three units per selected
byte are then reserved before canonical serialization, UTF-8 conversion or
the owned return parse. The actual serialized size must fit that selected
bound before either write. No post-read top-up or rebate is allowed.
The final confirmation forecast uses the same compact reservation; every
earlier save retains the full reservation. Retained-pass and publication
validation, canonical persisted bytes, transaction rollback, wake state,
restart and retry semantics remain unchanged. This reduces reserved work
for a provably smaller representation, without changing the fixed or
per-byte prices, capacities or deadlines.

The scratch proposal adds Native SQLite controls for maximal escaping and
Unicode, both object formats, the full pending-save price, malformed and
stopped fallbacks, refusal one input unit below actual confirmation cost,
and rollback after the second write followed by restart and exact-budget
confirmation. The old ledger price control remains attributed to its
original source, with only the bounded final save changed in its successor.
These changes are uncompiled and unrun; they make no production fit claim.

### First compact-row compiler attempt

Owner 41658 naturally exited 1 at checkpoint `18b657814`. The Scope
production compiler passed. The Scope test compiler rejected three new
fixture reads that used the native cursor's generic `exec().one()` shape
instead of the maintained Sql port's `exec().toArray()` result. No Native
case ran; all source, dependency and context guards remained exact, and
the generated cache was unchanged.

The proposed fixture-only correction uses `toArray()` and explicitly
requires one result row for each stored row or wake read. The exact
canonical row and wake comparisons remain. Product code, prices, caps
and deadlines are unchanged. Follow-up compilation and all seven row
cases remain unrun; the earlier production compiler pass is separate
evidence and need not repeat for this test-and-note change.

### Compact-row owning checks and the next command boundary

Owner 1057 naturally passed the Scope test compiler and all seven row
cases at `46130a7ee`, with exact input guards and no signals. The earlier
Scope production compiler pass remains separate evidence. These checks
cover the compact reservation, full-price fallbacks and native rollback
and restart controls; they do not establish production fit.

Owner 58227 then naturally failed the whole installed file: the first two
cases passed, and production passed the earlier Rules sequence 2 budget
boundary before failing at its CLI clone assertion with Git exit 128. The
activation cases remained pending. Full input guards passed, without
signals. Git's hardened runner deliberately discarded bounded child
output, so no exact stderr message or HTTP status was retained.

Source tracing found that the TEST command bridge created `source.git`
but sent its smart-HTTP requests to `/repo.git`. The native Git backend
combines that path with the source repository's parent, so it selected a
repository that the fixture had not created. The loopback URL now names
`/source.git`. The public HTTPS remote, credential handling, strict clone
assertion, trust controls, prices, capacities and deadlines are unchanged.
This fixture correction is unrun; command replay and activation acceptance
remain pending.

### Temporary command-finish diagnostic

Owner 9428 naturally failed at `42e4951e2`, with exact input guards and no
signals. The first two installed cases passed. Production completed its
initial real clone, fsck and five offline report comparisons. Its actual
dap clone and journal fetch then returned zero, but the later
`archiveFinish` request received a generic fixture refusal. The activation
cases remained pending. The original response erased the finish stage
and public child status, so its exact inner cause is not established.

A temporary TEST-only diagnostic records fixed finish stages, original
public executable code and signal, separate bounded stream byte counts
and fixed error hints. It returns no raw child output, error message,
credential, argument or environment. The original combined-output JSON
parse, process limits, deadlines, returns, throws and strict assertions
remain. This locates a refusal; it supplies no semantic correction or
acceptance evidence. The diagnostic is unrun.

After the diagnostic attempt closes, restore these three helper files
exactly from `42e4951e29ba05e99e1d5625740b15568e1ea835` and commit removal
before further acceptance work: `local-archive-command.ts`,
`local-clone-setup.ts` and `local-clone.ts`, all under
`packages/scope/test/support/`. Their original blob identities are
`9497b765d98e3f2601ca9f97d543980ce7733d88`,
`cd25d94dac1910a756f8a7dfcb7dab529240f7ac` and
`a204e6833e0fa2c0ee352b77d8f4787ab15e168f`, respectively. This temporary
checkpoint must not be landed or counted as acceptance or performance
evidence. Original failed attempts remain evidence.

### Command output stream correction

Temporary diagnostic owner 63719 naturally failed with exact input guards
and no signals. The Scope test compiler and first two installed cases
passed. Production reached the first public executable, without published
anchor trust: exit 1, no signal, 15,628 stdout bytes and 191 stderr bytes.
There was no spawn, timer or output-bound failure. The original combined
stdout-and-stderr JSON parse failed. The diagnostic retained neither
stream's contents, so valid stdout JSON and the stderr message are not
yet established. The trusted executable and activation cases were not
reached. This instrumented result is diagnostic, not acceptance or
performance evidence.

The three temporary helper changes were removed immediately in
`1c4a362ec`, restoring their exact `42e4951e2` blobs. This note and the
original evidence remain.

The proposed permanent fixture correction parses the report from stdout,
which is where the public replay entrypoint writes its JSON. The original
combined 8 MiB output limit and timer still apply across both streams.
Token checks inspect each stream and the original combined output; no raw
text is returned or printed. Original child code and signal are preserved.
The existing no-trust assertion requires exit 1; that status alone was not
the failure. Trusted exit 0, exact five reports, all strict verification
and credential checks remain. The correction is unrun and makes no claim
that the eventual stdout report will parse or verify successfully.

### Temporary phase ledger after the installed timeout

Owner 8088 naturally failed at `9363a6fca`: the first two installed cases
passed, production exceeded its original 30-second framework deadline
and both activation cases remained pending. Exact input guards passed
without signals. The existing metadata does not identify the pending
phase. This timeout does not establish that stdout parsing or either
public replay completed. No host-load or precise cost cause is claimed.

A temporary phase ledger now records fixed metadata immediately around
the existing production awaits. The first command session also emits at
most four fixed child begin/end records with monotonic elapsed times and
the original code and signal at close. It emits no payload, body, token,
argument, environment or raw child output. Existing assignment expressions,
await order, actual child work, assertions and 30-second deadlines are
unchanged. Metadata and logging add observation work and can affect timing
and interleaving. Phase elapsed records are diagnostic, not pure performance
measurements. The ledger is unrun, not acceptance or performance evidence.

After that diagnostic attempt closes, restore `archive-installed.test.ts`
and `support/local-archive-command.ts` under `packages/scope/test/` exactly
from `9363a6fcac0fbba798bbe77a129238d58aafb80f`, then commit removal before
acceptance work. Retain this note and all original failures. A measured
phase boundary can support an honest test split; it cannot justify a
blind timeout increase.

### Measured command boundary and strict trusted refusal

Temporary phase owner 50068 naturally failed at the original 30-second
production deadline. Scope test compilation and the first two cases
passed, with exact input guards and no signals. The phase records put
the first public finish call at 7,561 ms. The untrusted child then took
about 10,714 ms and exited 1; the trusted child took about 11,900 ms and
also exited 1 without a signal, ending after the Native test timeout.
These instrumented elapsed values include observation overhead and do
not establish general performance. They show this observed sequential
path reached about 30,174 ms before its remaining assertions.

Trusted exit 1 is a real unresolved failure: the existing expectation
remains zero. Neither report was retained, so no per-journal reason or
exact trusted failure category is claimed. The temporary phase test and
helper were restored immediately in `51a280c90` to their exact
`9363a6fca` source. The note and original failures remain.

The proposed test split keeps the five original Native scenarios and
their 30-second deadlines. Each successful production, warm-activation
or evicted-activation producer hands its exact Node session and copied
expected journal refs to one immediately following offline command case.
The handoff is published only after all original Native comparisons and
omission controls complete; it contains no private key or plaintext token.
Missing or mismatched handoffs fail explicitly. Each follower keeps the
original public command assertions and its own 30-second deadline, with
useful bounded per-journal result, reason and location metadata. It adds
no mint, clone, archive, trust or capacity. The static ledger changes from
five cases to eight, interleaving each follower after its producer.

The Node fixture joins finish and cleanup by the exact session ID. Each
follower joins that cleanup in finally and its test-finish hook; global
teardown remains a fallback. Native resources release at the producer
boundary, without closing the retained Node clone. Original public child
timers, output cap, token checks and strict trusted exit-zero expectation
remain. This proposal is uncompiled and unrun; trusted replay, activation,
heavy scenarios and the final gate remain pending.

### Correct the offline follower registration

Owner 74539 naturally failed with exact input guards and no signals. Scope
test compilation passed. The fixture, Grow and production Native cases
passed, followed by the production offline command case: the unchanged
strict trusted exit-zero assertion and all five consistent report checks
passed. Warm activation also passed. Its incorrectly registered offline
follower failed immediately because no producer handoff existed; the
evicted pair was not reached. The original failed eight-case ledger is
retained. The current production success does not explain historical
diagnostic owner 50068's trusted exit 1, whose report was not retained.

The split author and reviewers missed the activation branch's existing
early return. Both activation scenarios intentionally complete their
activation-specific assertions before archive command setup; neither
was a command producer in the original test. The correction registers
an offline follower only for `Grow production`. No extra activation
clone or fabricated handoff is added, and the explicit missing-handoff
failure remains. Both activation bodies and every production command
assertion are unchanged. The source ledger is now the five original
Native scenarios plus one immediately following production offline case:
six cases, with all original 30-second deadlines. This correction is
uncompiled and unrun; evicted activation, heavy scenarios and the final
gate remain pending.


### Corrected six-case installed file passes

Owner 52329 naturally passed at `08bbee7b7`, with exact input guards and
no signals. Scope test compilation and all six cases passed. The Native
fixture, Grow, production, warm activation and evicted activation cases
passed. The immediately following production offline case also passed,
including strict trusted exit zero and all five consistent journal reports.
The actual ledger recorded six starts and six passes, with no unexpected
cases, issues, retries or repeats. Each case kept its original 30-second
deadline. Owner wall time was 57.808 seconds, including guards and Git.

This result completes the corrected owning set and evicted activation.
It preserves owner 74539's failed eight-case history and does not explain
owner 50068's historical trusted exit 1, whose report was not retained.
The six heavy cases and the final gate remain pending. Their static scope
is the complete floor file, cadence file and one-entry scale file. The
scale case also owns the later dense retained-input, restart, mixed-input
and provider-conflict checks. No heavy case or limit is removed.


### Heavy scale replay exposes a fixture birth mismatch

Owner 31454 naturally failed with full input guards and no signals. The
scale case ran first and confirmed 10,000 one-entry passes at 142.663
seconds. Its strict replay assertion failed at 149.112 seconds with
`mismatch` and no consulted anchors. This was not a deadline failure.
The report reason was not retained. The other five heavy cases and the
scale case's later dense, mixed-input, restart and conflict phases were
not reached. No heavy acceptance result follows from the progress count.

Source tracing finds a deterministic fixture defect. The scale case used
a root-found directory, with no authoritative creation body naming its
Membership. A test adapter supplied genuine Membership observations to
runtime. Replay instead reads the Membership association from genesis.
Its first fresh grant therefore cannot pass that required association
check, before any caller anchor is consulted. This source-supported cause
matches the observed result but is not a recovered report reason.

The proposed repair uses the existing genuine Native factory and its
checked Directory creation, child genesis, Directory confirmation and
activation, plus independently observed Membership authority. The new
TEST declaration keeps the same archive-text transition and rule. It
removes only unused hold capability forms, as the existing factory resume
fixture does. Explicit creator, confirmation and Membership caller anchors
remain independent of archive output. The repository resolver serves only
the exact lane journal ref. Replay still requires consistent and the exact
anchors and trusts. Bounded reason and location metadata accompanies that
unchanged assertion if another failure occurs.

Actual activation occupies journal position 1. All 9,999 distinct signed
rule inputs remain, at positions 2 through 10,000. The initial archive
phase therefore requires 10,001 one-entry passes, rather than deleting an
input or ignoring activation. Position 3,700 still names the actual stored
rule input repeated later. Every later journal position moves by one:
the repeated input is at 10,001, the 4,609 dense inputs span 10,002 through
14,610, the mixed pair spans 14,611 through 14,612, and the conflict input
is at 14,613. Retained-input counts and all old-content, keyed-read,
provider, restart and conflict assertions remain. Factory proof setup adds
external fixture work. Archive caps, prices, per-pass allowance and the
original 20-minute case deadline remain unchanged. Compilation, all scale
phases, the other heavy cases and the final gate remain unrun for this
proposal. No fit or performance claim is made.


### Adopt the actual archive-row source seal

The one-owner parser session 54166 naturally passed at unchanged
`baaa7c822`. Complete source, dependency, tool and environment guards
passed, with no signal or mutable-input change. Root adopted its actual
archive-row seal, `6387b60a8ecd09a7dd3166ca1dac7f5c3749e61d7e02adf64878cbd8c9cf4412`,
under outcome `163a3b5d8ce22923814f744c1e6339bfd2130feb`. The map replaces
only the earlier archive-row value. Archive-build and every other seal
remain unchanged. This is parser provenance, not compiler or test
acceptance. The scale fixture proposal above remains uncompiled and
unrun. Its next owning attempt includes Scope test compilation and the
separate Node-support compiler, then the complete six heavy cases.


### Correct the scale fixture import boundary

Owner 37260 naturally failed during Scope test compilation at `9511c6634`.
The compiler reported TS2305 because `journalRef` is not exported by the
Git package root. Complete input guards passed, with no signals or cache
change. The Node-support compiler and all six heavy cases were not reached.

The correction imports `journalRef` from its existing journal subpath,
as the driver fixture already does. It changes no production exports,
resolver behavior, assertion, workload, budget or deadline. The import
error escaped the source review and remains recorded. Both owning compiler
boundaries and the whole six-case heavy set remain pending a fresh attempt.


### All six heavy cases pass with genuine authority

Owner 62336 naturally passed at `1de5a73b7`. Scope test compilation and
the separate Node-support compiler passed. All six cases in the three
heavy files started and passed exactly once, with no skips, retries,
repeats, unexpected cases, guard errors or signals. The original archive
caps, prices and case deadlines remained unchanged.

The scale case passed in 181.287 seconds, including its strict replay,
all 9,999 original distinct rule inputs, 10,001 initial one-entry passes,
4,609 later dense inputs, mixed old and new inputs, restart, immutable
target refusal and provider conflict controls. Dense inputs took 301
passes and left 14,609 confirmed retained rule inputs. Maximum dense input
work was 56,804,738 against 67,108,864, and metadata was 2,789,364 against
4,194,304. This is measured Native TEST fixture behavior, not deployed
provider throughput or general performance.

Cadence passed in 63.669 seconds. The two small floor cases passed in
0.403 and 13.149 seconds. The 30,000-entry floor case passed in 193.085
seconds, and the 2,000-entry capacity with 10,000 continuing inputs passed
in 58.933 seconds. Owner wall time was 520.049 seconds, including guards
and Git. Root adopted outcome `9b89ba9d7ad3079ea07b91a6ec38dd6e51db0633`.
All original failed attempts and their evidence remain separate.

The stored Page bundle still contains an initializer removed from its
current CLI dependencies. The maintained Page build, output comparison
and owning assets check must run against this source before the final
freeze. The final gate and review also remain pending. No Page output is
changed merely by this note checkpoint.


### Refresh and compare the maintained Page outputs

Owner 58151 naturally passed the maintained Page build at `75ccfeb30`,
with complete input guards and no signal or startup error. The original
npm dispatcher took 0.323 seconds. Outer elapsed time was 2.24 seconds,
including guards. Only the allowed generated module and ignored dist
outputs changed. The generator was not edited, and no generated literal
was changed by hand.

Root separately allocated the DATA-only comparator. It naturally passed
and accepted the exact six-line module envelope, headers, JSON literal
spelling and content hashes. The module's JavaScript equals dist output;
its HTML equals both dist output and maintained source. The generated
module is 850,654 bytes with SHA-256
`a5fdf3b336188b966dbde1e176ddae297dea58b7ed7ded282df525909d1dfd13`.
JavaScript is 795,368 bytes, and HTML is 26,184 bytes. Root adopted build
and comparison under `a30b7daf451d283b2a8139616b1d5b8ee71fc6d8`.

The comparator imports no generated code. Content equality alone does
not establish behavior or fresh esbuild equivalence. The whole owning
Page assets test still regenerates the expected module from source.
That test, the final exact-source gate and review remain pending.


### The owning Page assets check passes

Owner 64338 naturally passed at `2ae74554c`. The whole Page assets file's
single case passed exactly once, regenerating the expected module from
maintained source and checking exact text equality. Root read the complete
same-run ledger: no retries, repeats, errors, unexpected cases or issues.
All source, fixed dependency, tool and environment guards passed, with no
signals. Owner elapsed time was 3.775 seconds, including guards and Git.

Root adopted outcome `2909b881c4477b1b4a77fdab4a6d309248d18113`.
The build, separate DATA comparison and this source freshness check are
now complete. The original failures remain recorded. The exact-source
final gate, review and landing remain pending. This note-only checkpoint
changes no executable source or generated bytes and requests no focused
repeat. Final gate binding uses the actual post-check cache and this clean
head, rather than reusing a retired allocation.


### Preserve the failed ordinary gate and correct native Node startup

Ordinary gate owner 28948 naturally failed at unchanged `56a6119d1`.
Across 470 files, the terminal ledger recorded 2,163 cases: 2,156 passed,
four failed and three skipped, with zero unhandled errors. Whitespace,
helpers, citations, the seven citation tests and typecheck passed. All
source, dependency, tool, environment, ref and cache guards passed, with
no signals or collector errors. Original npm elapsed time was 1,162.373
seconds. Root adopted the complete outcome and narrow correction under
`d7b2fcdceeb76466cbc9d6a7481455a9c399881c`.

The unchanged CLI executable test and both disconnected-clone formats
failed with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`: `Session` used a readonly
constructor parameter property in `packages/replay/src/archive.ts`. Node's
strip-only loader does not transform that syntax. The correction declares
the readonly boolean separately and assigns the unchanged defaulted
argument first in the constructor. No archive policy or judge changes.

The production public follower timed out after 30,480 ms against its
original 30,000 ms deadline. The other five installed cases passed. Its
helper had preloaded test-only TSX when invoking the public binary. The
reviewed correction removes only that preload and its unused import, so
the witness uses the same native Node entry path documented for operators
and required by the existing CLI tests. Sequential child commands, exact
session custody, output and token guards, untrusted exit one, trusted
exit zero, all five reports and the 30-second boundary remain unchanged.
No speedup, timeout resolution or new successful outcome is inferred.

The full gate also passed the six heavy cases and current Page assets.
Its `npm test &&` chain left Node 36 and Counting 55 genuinely unreached.
Next checks cover the three Replay compiler roots, Node-support compiler,
whole Replay CLI and archive-Git files, Page assets file and installed
six-case file. Their actual terminal names will form the 22-case ledger.
No healthy heavy repeat or automatic full gate repeat is requested.
After those checks, the unreached downstream work still needs its own
allocation. Formal review retains the failed full gate alongside exact
correction evidence. No candidate test has run after this source change.

### Corrected executable checks and downstream boundary follow-up

Correction owner 77006 naturally passed all four affected compiler roots
and all 22 cases once at clean `739bc3c3e`, under
`392c4138d33a8e5ad57ef23d7c54537e5aac9363`. The unchanged executable usage,
sha1 and sha256 disconnected-clone checks passed. All six installed cases
and Page asset equality passed. The production public-command case took
27,672 ms within its original 30,000 ms deadline. Owner-inclusive time was
70.857413917 seconds wall, 54.409589 user and 18.052487 system. Full source,
fixed dependencies, tools and environment guards passed without signals.
This correction evidence does not turn the original failed gate green.

Downstream owner 52071 then naturally failed at the same clean source:
34 of 36 Node cases passed, and two source-boundary checks failed. The
actual imports in `packages/replay/test/archive-anchor-ranges.test.ts`
use the existing Git journal encoder and reader. Its exact development
boundary had not been listed in `replayGitUsers`; this checkpoint adds only
that path. It does not permit Git in portable Replay production modules,
introduce a wildcard, or alter the existing negative controls. Counting 55
was not reached under the original sequential failure behavior. The
complete source and dependency guards passed, the cache was unchanged,
and there were no signals. Outcome and narrow-fix authorization are
`470f1ae78c371cd14cb3538731a3e6775720c845`.

The next owning checks are the whole affected source-guard file and the
genuinely unreached Counting 55 checks, under a fresh root allocation.
The unaffected Node files and passing Vitest files are not repeated. This
checkpoint is source-prepared; no follow-up runtime result is claimed.

### Source-boundary correction and remaining Counting checks passed

Owner 73032 naturally passed the whole active-source file's 10 cases and
all 55 previously unreached Counting cases at clean `2ed95304c`. The whole
source-guard file intentionally repeated eight passing cases alongside the
two corrected failures; unaffected Node files were not repeated. Counting
covered six files, four entries and 133 inputs. Root read all 65 raw case
lines and the result: there were no signals, test errors or collector
errors, and all 2,780 source and 6,069 fixed dependency guards passed with
the bound tools and environment. The cache remained unchanged. Outer time
was 5.86 seconds wall, 6.32 user and 0.79 system.

Evidence is retained at
`/private/tmp/artroom-archive-active-source-counting-evidence-20261022-v1`,
under allocation `150d002e7abd9de6dc51658c2c2c685cea63d377`. This completes
the affected source-guard follow-up and the genuinely unreached Counting
checks. It does not erase the original 2,156-pass, four-failure, three-skip
ordinary gate or the intervening 34-pass, two-failure Node attempt. The
four compiler and 22-case correction pass remains separate evidence. No
whole gate, healthy Vitest cohort or heavy suite was rerun for these final
corrections. Exact-head review and landing remain pending.
