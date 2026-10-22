# Published archive anchors

This implements planner decisions `29fd51b5`, `f15e483c`, and the count-policy
correction `a7d03336`. The writer and
command are integrated on the R1 candidate `1793ca7d`. The owning compilers
passed before the current policy and authority-fixture corrections, after two
retained type-boundary failures. These new sources are uncompiled and unrun.
Owning tests and the final gate remain pending. No hosted clone, custody, deployment,
or budget-fit result is claimed.

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
