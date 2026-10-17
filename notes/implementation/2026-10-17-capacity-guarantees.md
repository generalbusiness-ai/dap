# Whole-scope capacity: implementation

Work in progress under request `b4062d8c`, promise `d3e026bd`, and full
capacity root `113a54bd`. This branch starts from Main `2637e6bb`, tree
`c7e7188b`. It is not ready for review or landing: configuration parsing, the shared Amount traversal and logical key reads
are present, but runtime admission and replay still use the old entry-only
check. No whole-scope capacity guarantee is established by this checkpoint.

## Adopted boundary

Planner report `63195bdd`, accepted by `cd5d2265`, answers the remaining
choices in preparation request `4dccae54`. A pinned definition opts in
with `capacity: {name: "whole-scope", version: 1}`. Omission keeps the
legacy definition's bytes and entry-only admission/replay. An unknown
name or version cannot silently select another rule.

The four new temporary deployment ceilings are 1,073,741,824 logical
bytes, 100,000 items, 200,000 records, and 10,000 pending requests. They
apply only to opted-in scopes. R4 still owes measured ceilings and physical
storage costs. The existing `scopeEntries` ceiling remains the fifth axis.

## Existing mechanisms to extend

The implementation uses `Amount` and the task traversal already in
`packages/derive/src/reserve.ts`. `pendingWorkAmounts`, the holder
amounts in `validate/holds.ts`, and the marker traversal already carry
five components, but some producer terms are partial. Numeric entry APIs
must remain projections of that one traversal. Distinct tasks sum;
alternatives of one task take the componentwise maximum.

The actual commit point is still `Turn.#judged`, after `#seal` appends,
retains, folds and redacts inside one storage transaction. The full check
must include all logical Used and Reserved before that transaction commits.
A failed check rolls back every write and returns `scope-full` with the
bound's name. Recorded entry and diagnosis bytes do not gain a new field.

Used counts include retained final item keys; capability-record keys and
relationship-copy keys in every state; canonical entries and retained
inputs once per byte domain and digest; and requests until their recorded
result or `undelivered` diagnosis. Replacements add no new key. Transport
acknowledgment does not release a pending-request unit. Redaction removes
bytes from that entry onward. Derived indexes and outbox bookkeeping are
outside those logical dimensions.

Current storage reads and writes are mapped in the preparation note.
`SqliteStore.scopeBytes()` measures only the scope metadata row and must
not be mistaken for the new logical byte budget. Any persisted Used cache
must share the commit transaction and be checked against stored-state
derivation after restart. Replay must use the same logical units.

## Required settlement trace

A state-based count alone cannot establish the adopted release rule.
The implementation must distinguish the entry that actually settles a
duty from an ordinary state change that merely makes its item look final.
The required witness opens a duty, moves its item to a state with no
reachable settling branch without settling it, and verifies that its
reservation remains. Ordinary traffic can fill only the unreserved room.
That duty may remain stuck; releasing its reservation is not a repair.
A real settling entry spends its own admitted reservation, records what
it starts, and leaves the closing checkpoint reserved where required.
Marker tasks, late results, final holders and rearmed checkpoints need
the same distinction without changing legacy cohorts.

## Retained producers

The retained-input kinds are definition, entry, rule, text, snapshot and
value (`packages/contract/src/read.ts`). The existing limits include
`definitionBytes`, `entryBytes`, declared text/value maxima, and explicit
owner value-domain maxima. A read ceiling is not automatically a producer
maximum. In particular, hold's ancestry-check result names a retained
snapshot (`capability/hold.ts`); its complete producer bound and closure
must be proved or an opted-in definition that reaches it must refuse
`reserve-unbounded`, naming the producer. Missing maxima never mean zero.
The complete list reached by the journey's rooms remains to be filled in
before this implementation is sent for review.

Replay may lack a formerly retained text's size after a later redaction.
For that historical span it must report the byte check as incomplete,
with the reason “redacted size not retained”. The other dimensions remain
checked. This does not waive current runtime admission or let earlier
unknown sizes count as zero.

## Development checks at the configuration checkpoint

The definition-validator file passed all 65 cases against this branch's
private dependency copy, with all 13 workspace links resolving into this
worktree. The new case checks omission without mutation, a distinct digest
for the supported rule, and refusal of unknown rules. A focused control
that removes the version guard passes before the change and fails the
new assertion after it; the original source was restored. Contract,
derive source and derive test compiler configurations each pass.

These were development checks of uncommitted source, not a frozen-head
Source gate or proof of runtime capacity. The initial command used the
wrong relative tool path and did not start tests. A following run still
used copied absolute workspace links to Main and is excluded from this
checkpoint's evidence. The links were corrected before the authoritative
65-case run and compiler checks. An auxiliary path assertion initially
compared `/tmp` with its canonical `/private/tmp` spelling; its corrected
check confirmed all local links without changing source or bindings.

Next are the complete Amount terms, first-key counts, persistent duty
release, the transactional Used check one dimension at a time, refusal
propagation, and actual runtime/replay/restart/legacy witnesses. The gate
is owed once at the final implementation freeze before independent
exact-head review. No gate has run for this branch, and no artifact or
approval is filed for this incomplete implementation.


## Shared traversal checkpoint

`reserved` now carries the existing task Amounts through the same pending
work walk; `owed` projects its entry component. `heldReserved` keeps the
holder Amounts and `heldEntries` projects them. `markerReserved` uses
`markerReservations`; `markerOwed` projects its entries. There is no second
task calculator. The legacy path still reads its existing numeric entry
terms, including C1's validation and closing-checkpoint behavior.

The opted-in path retains the known timed, item/copy settlement, marker,
platform outcome and holder terms. An already-sent request contributes no
second Reserved pending-request unit: that unit belongs in Used. It still
reserves diagnosis/result entries, the result's foreign source bytes and
its declared clause. Future requests remain Reserved until sent. The
closing and provisional confirmation entries retain the static entry-size
stand-in. Producer-specific retained terms, owner record closures and
complete arithmetic checks inside every nested closure are still owed.
These partial Amounts are not yet an admission guarantee.

Focused development checks selected `forms-settles.test.ts`,
`forms-holds.test.ts` and `standing.test.ts`: 55 passed. The added scenario
uses the existing made-up marker definition with real in-memory judges and
fold. It distinguishes a short marker settlement from the alternative
that sends a request: future pending-request reservation moves to an
actually pending request, while the entry projection remains identical.
It is not a native scope, complete byte accounting or storage witness.

A separate focused case checks a fractional record operand before a zero
item count can conceal it. It passes normally and fails by the intended
assertion when only that pre-multiplication check is removed; source is
restored afterward. The added Amount checker requires all five fields to
be nonnegative safe integers and refuses negative zero. Runtime usage,
first-key counts, transaction rollback, historical bytes and persistent
duty identity are still the next implementation work. No gate or Source
review is claimed for this checkpoint.


## Logical key-count checkpoint

`StateView.keyCounts()` now reads items, records and pending requests.
Memory uses the item/record/relation maps and a derived pending-request
key set. SQLite counts the retained rows: every item key, every capability
record plus relationship-copy key, and outgoing requests with neither a
result nor an undelivered diagnosis. Replacing a key or making its state
final does not add or remove that key. A transport acknowledgment does
not remove the request's unit. The outside-state facade forwards the same
read without exposing writes. No counter is added to checkpoint bytes.

The memory boundary file passed two cases, including replacements, final
keys, delivery-unavailable, undelivered, late result and rebuilding from
retained rows. A new raw storage-boundary case also passed in the real
Durable Object's SQLite runtime: one selected case, with the file's other
17 cases deliberately unselected. It checks the same units, the actual
Store acknowledgment method, transaction rollback and reopening a
SqliteStore over the same storage. Its initial run is owner 88301,
CLOSED0/chunk9c43e3. It uses raw test rows, not judged or sealed acts; it
does not establish native authority, capacity admission or an actual
Durable Object eviction/restart. Those witnesses remain owed.

A focused native control changes only the item query to omit final keys.
The baseline passes; the changed query fails the intended retained-key
assertion (expected two items, received one). The control restores source
and reports DISTINGUISHES (owner 93500, CLOSED0/ef55c2). No whole suite or
mutation sweep ran. The Scope test compiler passes after forwarding the
new read through its facade. The first compiler attempt lacked the
package-local Workers types; an owned copy of the existing dependencies
resolved that, without an installation. It then identified the missing
facade method, which was added before the passing compiler run.

SQLite derives these values on demand, without a persisted Used cache.
This checkpoint makes no constant-time or physical-storage cost claim.
Canonical byte-domain accounting, complete reservation producers, duty
identity/release, multi-dimensional post-fold admission, named refusals,
replay and actual lifecycle/legacy witnesses are still unfinished. This
branch remains unready for Source review or landing; its gate is still
owed once at the final implementation freeze.

## Logical byte-count checkpoint

`retainedByteDomain` states the native identity of each retained kind.
The original checkpoint incorrectly assigned the journal's tagged domain
to retained entry copies. The later audit correction below fixes that:
definition, text and snapshot use their tagged domains; retained entry
copies and rule inputs use raw SHA-256, represented internally by null.
The journal keeps its tagged entry domain, and a value states its own
domain. This accounting identity changes no transport or storage key.

`ByteUsage` counts a journal and retained inputs once per domain and digest,
across their physical sources. A text redaction removes that source from
then onward; an independently retained copy remains counted. An unknown
historical text size produces an explicit incomplete result, with a known
subtotal and missing count instead of a complete byte total. A checked copy
can supply that size. This is bookkeeping, not payload or authority
validation; replay integration and incomplete-span reporting remain owed.
Invalid operands, inconsistent known sizes and unsafe totals leave the
existing account unchanged.

`SqliteStore.logicalBytes` derives the current total from actual UTF-8
journal and retained payload lengths, grouped across the three physical
tables. It excludes indexes and folded records and does not trust the
journal's size cache. Unknown retained kinds, empty value domains and
conflicting sizes for one identity refuse the read. No Used cache is
persisted and no physical-cost claim follows from this query.

Three pure bookkeeping cases pass. The new native SQLite case passes with
18 other cases unselected (owner 48423, CLOSED0/bdadb4). It checks the
fixture's exact journal-plus-definition baseline; duplicate journal,
retained-entry and value sources; eight-byte Unicode text and a
seventeen-byte rule input; redaction; rollback; conflict refusal; and
reopening a Store over the same storage. These are raw storage writes,
not judged acts, actual eviction/restart or capacity admission. The
conflict catch accepts only AmountError. The initial run (61946, CLOSED1)
failed because its expected baseline omitted the definition that genesis
retains. That failure remains separate from the corrected passing run.

A focused native control replaces UTF-8 byte length with character length
for retained inputs. Its baseline passes and its changed source fails the
Unicode assertion (7613/7626 instead of 7617/7634); the source is restored
(owner 16115, CLOSED0/f6f794). Bytes, Derive and Scope compiler checks pass,
including the final Scope test compiler after correcting the witness.
No whole suite or gate ran. Complete producer reservations, persistent duty
release, transactional admission, named refusals and integrated replay
remain unfinished; this branch is not ready for review or landing.

## Checked nested arithmetic checkpoint

Opted-in definitions now select operand-checked arithmetic inside the same
Amount functions used for operation closures, starts, requests, holders,
marker alternatives and validator task closures. Every input vector and
multiplier is checked before addition, multiplication or a maximum can
hide an invalid term. Intermediate totals are also checked. An unknown
holder kind or decision has no free zero amount. Legacy definitions select
the original arithmetic. An unsafe computed closure returns a
reserve-unbounded validation problem rather than escaping as AmountError.

The two development files for holders and settlements passed all 49
cases. The added pure metadata case distinguishes half an attempt being
doubled to one, an invalid vector behind a zero multiplier, a negative
alternative, unsafe byte totals, and a holder count with no declaration.
It also checks unchanged valid closure amounts and the validator's
structured refusal at an unsafe configured ceiling. The Derive test
compiler passes.

The first focused control removed the multiplier check, but the witness
still passed: its fractional example was an amount operand, which the
remaining vector check correctly refused. That control SURVIVED and is
not distinguishing evidence. The witness was strengthened with half a
holder operation whose two-entry/two-byte amount would otherwise become
valid integer totals. The same single control then passes its baseline
and fails that intended assertion, with source restored (owner 17865,
CLOSED0/54ea10). These are pure metadata witnesses, not native tasks or
complete admission. Producer maxima, actual-settler duty release and the
remaining runtime/replay work are still owed. No gate or review ran.

## Retained rule-input producer checkpoint

The restricted evaluator's input budget was not a retained-writer bound:
evaluation catches an oversized input as false and still records its input
digest. An opted-in definition with rules now requires a finite canonical
input ceiling from its pinned profile. The restricted profile supplies its
existing 262,144-byte limit. A profile without that declaration refuses
reserve-unbounded, naming the retained rule-input producer. Legacy profile
interpretation and retained writes remain unchanged.

The opt-in Turn checks actual canonical UTF-8 input bytes before sealing.
An oversized retained input returns the existing unfit response and writes
nothing. Each future settling act/handler conservatively reserves one
such input per declared rule; its guards share one fixed input context,
and the collector deduplicates a rule and input digest. The actual store
still deduplicates identical bytes across rules. Timed entries, result
clauses and closing checkpoints evaluate no rule guards and gain no such
term. The derived ceiling is not added to declaration or entry bytes.

The validator/settlement files passed 80 cases. A strengthened focused
marker scenario then passed: its three independent guarded duties add
three input ceilings to Reserved, with no input for the closing checkpoint.
The new native writer-boundary case passes against real Turns, restricted
evaluation, transactions and SQLite. It accepts exactly 262,144 canonical
bytes and refuses 262,145 only for the opt-in definition. Legacy keeps
both; the evaluator's prepared result is explicitly false in each case.
The asks/judge are supplied by hand, so these are not authentic acts,
valid checkpoints, replay or full capacity witnesses.

The first native run (41856, CLOSED0/61da5f) preceded the final test type
fixes and explicit prepared-result assertion. The final witness passes
the control baseline and fails the intended oversized-retention assertion
when the writer guard alone is disabled (92170, CLOSED0/fb01a6); source is
restored. Initial compiler checks caught an incorrect Alarm shape, missing
capabilities and an explicitly undefined optional profile member in the
new tests; all were fixed. Scope and Derive test compilers pass. No gate,
review or landing occurred. The other retained producers, complete task
amounts, actual-settler release and integrated admission/replay remain owed.

## Typed-field producer checkpoint

The existing typed-field retention walk is shared by future settling forms
and bound-handler reservations. It counts a possible foreign entry for
each fact field and presented fact, capped by usesPerEntry; a handler also
counts its mandatory source within that cap. Detached text reserves its
canonical JSON payload, at most six times its raw UTF-8 bound plus two
quotes. An act's declared value place reserves its canonical-byte maximum.
Optional fields count at their maximum. Repeated inputs can use less at
runtime through domain/digest deduplication.

These terms extend entryFor in the existing task traversal and the
holder's bound-handler amount. Legacy bound handlers use the earlier
raw-text terms through the same field walk. No alternate task calculator
or serialized declaration member is introduced. Observation-row values,
named child definitions, snapshot producers and owner-specific record
closures still need complete coverage.

The foreign-entry stand-in must also hold at the writer: a peer can have
an independently configured entry ceiling. The opt-in Turn now refuses a
retained entry copy larger than this scope's entryBytes before appending
anything. Thus accepted copies, including delivery/result sources, have
the same finite ceiling that their task reserves. Legacy accepts copies
as before. This is an enforced accepted-input bound, not an inference
from the retained-read ceiling.

The new typed-field marker fixture reserves two possible foreign copies,
twenty canonical bytes for three NUL text bytes, and seventeen bytes for a
value place. The initial holder/settlement run passed 49 cases; after the
fixture's final value-place addition, binding/settlement files passed 39
cases. A focused escape control passes before the change and fails when
canonical text reservation is replaced with raw length, with source
restored (45682, CLOSED0/6faeff). That control preceded the fixture's added
seventeen-byte value place; its result is not relabelled as a later run.

The native foreign-entry writer case passes (52710, CLOSED0/339f56), with
twenty other cases unselected. Its final guard-removal control passes the
baseline and fails the intended one-byte-over assertion (6225,
CLOSED0/272c2a), restoring source. Both exact-limit acceptance and legacy
retention are checked. Turns, transactions and SQLite are real; the
drafts and retained JSON payloads are hand-authored and deliberately do
not claim authentic foreign entries, digest validation or authority.
Scope and Derive test compilers pass. The first new helper compiler check
caught an untyped value-place access, which was fixed before these passes.
No gate, Source review or landing ran. Full capacity remains unfinished.

## Observation-value producer checkpoint

Future settling acts now include the canonical maxima that their rules
observation rows declare under retains. The same clause effect sets carry
their observation-value rows through the existing request/task Amount
walk. A result clause with rows and no written effects is still work.
Alternatives take the componentwise maximum. Conflict remains new work
and is not added to this request reservation. The holder's mark-only
clause component no longer charges these same row values a second time
under the opt-in rule; its written-clause component already includes them.
Legacy arithmetic and clause traversal keep their earlier interpretation.

A made-up platform marker scenario with no outcome kinds or holders
reserves eleven bytes for its future act's row and the larger of seventeen
or twenty-three bytes for its request's row-only result clauses. After the
request is sent, its future pending-request unit becomes Used while the
twenty-three retained bytes remain Reserved. This pure/in-memory scenario
passed; it is not an actual rules scope, authority read, durable admission
or native settlement witness.

Focused send, observation and holder files passed 51 cases. A separate
single-case control passes its baseline and fails the intended expected-23
assertion when row-only clauses are omitted (81681, CLOSED0/1a6137), with
source restored. The Derive test compiler passes. All earlier development
results retain their own source and run boundaries. Complete owner
closures, remaining producer inventory, actual-settler duty release and
runtime/replay integration remain owed. No gate or Source review ran.

## Persistent item-duty checkpoint

Opted-in item duties now keep their admitted Amount as derived folded
records, keyed by item and its state, marker or deadline task. The amounts
are projections of pendingWorkAmounts and markerReservations; no second
closure calculator is added. An ordinary change can raise a duty's amount
but cannot lower or remove it. The reservation walk sums the stored item
duties rather than dropping them when their item leaves a pending state.
Memory and SQLite snapshots include nonempty duties only for this cohort.
Legacy folds add no member and retain their earlier checkpoint bytes.
These bookkeeping records are outside logical capability/relationship
record counts and logical retained-payload bytes.

Primary-act settlements and actual timed entries identify their own task
for release before the new state's task is retained. A state settlement
does not release some other marker duty just because the item becomes
final. Alias-selected acts and handler/copy bindings are still conservative
in this intermediate implementation: they keep their prior duty. Those
paths, final holder release and complete producer/closure terms must be
finished before enabling and reviewing whole-scope admission. This is
explicitly not a completed duty-release implementation.

The settlement file passed 15 cases. Its new in-memory scenario sets a
marker through an ordinary act, settles a different marker, then settles
the item's state: the first marker's duty remains even on the final item.
Rebuilding the full state by folding the same entries reproduces that
snapshot; a legacy state has no duty member.

A native scope case also passes (37666, CLOSED0/957a42), with 21 other
cases unselected. An ordinary final transition keeps the report's duty;
after ordinary traffic fills the unreserved room and the actual Durable
Object is evicted, the next act still refuses scope-full at the correct
entry boundary. A separate report at its full entry limit survives
eviction, accepts its genuine settlement, then writes the reserved closing
checkpoint. The scope, judgments, fold, SQLite and object eviction are
real; lane data and membership/grants use the labelled fixture stand-ins.
This proves neither the other four admission axes nor native platform
authority, complete replay or every settlement selector.

Its focused native control passes baseline and fails the intended refusal
when prior duty records are discarded on each touched item (80168,
CLOSED0/f2a8cb), with source restored. Initial compiler checks found the
missing read-facade method and an unused import; both were fixed. Scope
and Derive test compilers pass. No final gate or Source review has run.

## Historical duty-view checkpoint

The replay View now logs writes of item duties alongside its existing
per-record history. Looking up an earlier head reconstructs the duty set
at that head, including an empty set after a genuine settlement. An
ordinary final transition preserves its duty in both the full fold and
the historical view. The lookup still avoids folding the whole prefix.

A new scenario first failed against the prior View: the current head had
the correct duty, but an earlier head omitted its itemDuties member
(865d6a CLOSED1; report duty-historical-before). Adding the missing write
log fixes that gap. The View file then passes both cases (714c6b CLOSED0),
including the unchanged legacy declared-index case. The new case compares
several heads in nonsequential order against a full journal fold. It uses
made-up platform data and test authority in memory, not a native scope,
foreign authority read or full replay-verifier acceptance. Replay's test
compiler passes (84fdbd CLOSED0). The original failed report remains
separate; no control rerun or whole gate was needed for this correction.

Remaining duty selector, copy/holder, producer and full admission/replay
witnesses remain required before Source review. The reviewed journey
design has now landed on Main92bedfda; it adds notes only, with its tree
exactly matching reviewed911d8c16. Its original parent lifecycle is under
planner reconciliation50babd01; the full Source child is natively landed.

## Item settlement-binding checkpoint

The fold now resolves an item's settling form on the pre-entry state.
Acts use the existing field/fact readers, alsoItems and pinned selectors;
applied handlers use the same prepareHandler stage as their judge. The
judge and fold share the actual state/marker settlement predicate. Guards
and effects are not rerun, and a runtime-only Draft hint cannot release
a duty. A no-effect advisory, including one whose fields refused, has no
settlement to reconstruct. Ordinary effects still cannot release another
task's reservation.

Retained value bytes needed by a selector accompany the fold internally.
Runtime supplies the values that its draft actually retained. Replay
supplies its rederived values and keeps the opt-in fold inputs needed to
reconstruct historical heads. No declaration, entry or diagnosis form is
changed. Alias-selected acts and delivered item settlements are now
implemented; relationship-copy duties and final-holder release remain
unfinished, as do complete producer/owner terms and five-axis admission.

Focused settlement and binding files pass 42 cases. New scenarios bind
a target through a mutable reference before that same entry changes the
reference, and distinguish an ordinary message from a genuine delivered
marker settlement. The receiver's judgments/fold are real in memory;
sender entries and authority remain labelled fixture stand-ins. The first
handler case used an unsupported advisory type; correcting it to the
native index type made the two new cases pass. The compiler also caught
an array being treated as a Map; the lookup was corrected.

A real-scope alias witness then passes across actual eviction at the
filled entry limit (24079, CLOSED0/556315). One entry makes both reports
final but settles only its selected report: the primary report's duty
persists. Initial run75930 failed before creation because the new fixture
lacked the required live-state guard on its second subject; that guard
was added before the passing run. Its focused control passes baseline
and fails the exact duty-identity assertion when the primary is used
instead of the selected item (17907, CLOSED0/879854), restoring source.
This witnesses fixture scope/judges/storage, not native platform authority.

The Replay View file passes all three cases, including a full verifier
run over a judged declared fixture and its covering checkpoint (373ad2,
CLOSED0). Its grants are explicitly trusted as recorded; it proves item
duty derivation/checkpoint agreement, not the unfinished four capacity
axes or native authority. Scope, Derive and Replay test compilers pass.
No gate or Source review ran.

The byte-domain audit found a separate error to correct next: retained
entry copies use rawRetainedJSON and raw SHA-256 content digests, whereas
the journal uses the tagged entryHash domain. The earlier raw storage
probe gave its retained entry the journal hash and did not establish that
native distinction. Its passing result must not be used to claim the
current byte map is correct. Full capacity remains unready for review.

## Raw retained-entry domain correction

The native readers establish the distinction: useOf names a foreign
copy by SHA-256 of its canonical bytes, and rawRetainedJSON checks that
digest; entryHash tags the journal's bytes with artroom-entry-1. The
retained-kind map now assigns entry copies to the raw domain alongside
rule inputs. Journal/value copies under the tagged entry domain remain
distinct from that raw input. Native byte counts still use actual payload
lengths, and domain/digest duplicates count once.

The SQLite witness now computes the actual raw content digest of its real
journal entry, checks it through rawRetainedJSON, and checks that it is
not the journal hash. It retains that raw JSON under entry/rule storage
aliases and a separately tagged journal-domain value copy. This is an
explicit storage-identity probe: the copied entry is not claimed as an
actual rule input, nor is this an admission or authority witness. The
native case passes (32886, CLOSED0/067d8b). A focused control restores
the wrong tagged mapping and fails its intended total, 10,563 rather than
9,086, after a passing baseline (44144, CLOSED0/276309); source is restored.

The first revised pure case still passed under the wrong mapping: it
included both raw aliases at once, whose totals concealed the swapped
classification. That before report is non-distinguishing. Intermediate
assertions now distinguish adding the raw entry from adding its raw rule
alias. All three strengthened pure cases pass (006c27 CLOSED0). Earlier
byte-checkpoint passes and controls retain their original coverage; they
are not proof of this corrected identity. Scope and Replay test compilers
pass. Full five-axis runtime/replay admission and its final gate remain
unfinished; no Source review or landing has been requested.

## Final holder release and relationship-copy audit

An opted-in final holder now keeps its remaining counts until the fold
identifies that holder's own final state settlement. A marker settlement
releases its marker task; it does not release the holder pool even when
the same entry makes the item final. The existing release calculation
still preserves kinds reachable by unsettled operations or pending
account requests. Genuine draws continue to reduce their real counts.
No floor or second reservation calculator was introduced.

The fold records a derived settled-holder fact, rebuilt from the journal
and retained in SQLite/checkpoints and historical Replay Views. The
optional snapshot member is absent for old cohorts. It is bookkeeping,
not a new logical record, retained input or admission dimension. A holder
with no reachable state settlement can retain room forever, as the owner
decision permits; final state alone cannot discard admitted room.

The focused in-memory witness distinguishes ordinary final state, a
genuine marker settlement that also makes the item final, and the
holder's actual state settlement. After a late outcome, the first two
keep their remaining holder counts; the last releases them. The callbacks,
platform data, sender entries and authority are explicitly made-up Works
fixtures. Four final-holder cases pass, and the related holds file gives
39 passing cases together before the marker extension. The strengthened
four-case file also passes. A focused control removes the opt-in release
guard: its baseline passes and the intended count assertion fails with
null instead of the retained operations/requests (83268, CLOSED0/15b636).
Source is restored.

The strengthened historical-view witness passes and agrees with a fresh
fold at each queried earlier head, including before and after settlement.
A separate raw-bookkeeping probe on real SQLite passes atomic rollback,
checkpoint projection, exclusion from logical key/byte totals, and actual
Durable Object eviction (47655, CLOSED0/a7e07e). It deliberately writes
bookkeeping directly, so it does not claim a native judged holder
settlement. Derive, Scope and Replay test compilers pass. No gate ran.

The relationship-copy audit found that the existing write path already
identifies its actual settler. Only an applied relate handler writes the
copy; its own pending-state exit sets settlesCopy. Refusal and supersession
write no relationship effect. RuleEffect excludes relation, so ordinary
item/platform effects cannot change that copy. The count remains keyed
by owner scope/incarnation, name and item. An additional persistent copy
ledger would duplicate those facts and was removed before checkpointing.
The existing full-budget job/copy witness now runs under both legacy and
whole-scope definitions; both pass through real in-memory judgments and
folds. Its scope initialization and authority remain fixture stand-ins,
and this is still the existing entry-budget admission, not five-axis proof.
An initial edit command used the wrong working directory; that resulting
report selected no cases and is not evidence. The corrected report runs
and passes both selected cases.

Complete producer/owner Amounts, all five transactional admission axes,
historical incomplete byte spans, the full runtime/replay boundary
witnesses, final gate and independent Source review remain unfinished.

## Unbounded native snapshot producer

Opted-in definitions that can create a native hold workspace now refuse
with reserve-unbounded at capacity, naming the hold@1/check
ancestry-snapshot producer. isRetainedInput checks shape; snapshotRead
checks canonical bytes and digest. Neither limits the writer's byte
length. RETAINED_INPUT_BYTES is a read ceiling and cannot supply this
missing producer maximum. No new snapshot maximum was invented.

The native hasWorkspace predicate is now in capability/workspace.ts and
shared by the validator and the existing capability code. A listed
hold@1 guard or effect enables the native instance step. With a local
hold type, the instance can feed stage and then check. Merely listing
hold@1 and using its item-form hold effects does not enable an instance;
nor can a definition with no local hold type stage one. Those declarations
remain eligible. A guard need not pass for its presence to enable the
separately authorized native steps. This follows the existing native
workspace rule, not a new activation policy.

The direct validator witness names the producer, preserves exact legacy
bytes, and checks both unreachable cases. The validator/capability files
pass 71 cases. The focused guard-removal control passes its baseline,
then fails the expected named refusal when the guard is removed (38746,
CLOSED0/0a3dac), restoring source. Initial fixture placement put a guard on
a comment, whose grammar forbids guards; moving it to renew corrected
that fixture. A wrong-directory diagnostic command changed no file.

Real production creation also passes: native capability code accepts the
same legacy declaration, while the opted-in declaration refuses before
writing any genesis row (4548, CLOSED0/295829). No act, staging, provider
or test authority runs in that witness. The first runtime attempt used
the default test fixture, whose capability code is absent, and failed its
legacy acceptance precondition (55995, CLOSED1/885b96); it is not evidence
of the new refusal. Scope and Replay test compilers pass. No gate ran.

### Journey producer inventory at this checkpoint

This is a source inventory of the two exported lane declarations and the
36 entries in the native platform version catalog. It identifies what the
journey's room families can retain; it does not establish any live room's
activated pins. All 38 original declarations validate. Trying the opt-in
on the exported issue and change now yields the named snapshot refusal;
the other catalog entries still validate only the partial implementation.
That is not proof that their owner terms or admission are complete.

| Room family | Named retained producers and existing maxima |
| --- | --- |
| Every scope | Canonical journal entries use entryBytes. A declaration and its statically named child closure use definitionBytes and namedDefinitions at creation. Foreign fact fields, presented facts and a delivery's source use the accepted local entryBytes ceiling and the shared usesPerEntry cap. |
| Issue and change | Detached bodies, report summaries, verdict bodies and comments use raw UTF-8 maxima of 65,536 in the exported declarations; the retained JSON string budget uses six bytes per raw byte plus quotes. Both use hold@1 and git-read@1, and have local hold types and native workspaces. Their ancestry snapshot producer lacks a writer maximum, so an opted-in declaration refuses. They declare no evaluator expressions. |
| Membership | Native foreign-entry fields and inline entry data. The catalog's membership@6 has no detached text, value place, outcome evidence value or observation-retained value declaration. |
| Rules | Foreign-entry fields; keep-configuration retains artroom-check-configuration-1 at 32,768 canonical bytes. Activation retains artroom-definition-1 at 262,144 per declared value place, with the main digest and 16 dependency places in rules@4. Named definition closure validation remains separate. |
| Directory and register | Foreign-entry fields, validated child declarations retained at creation, inline entries, and owner-derived creation/import tasks. No detached text or observation-retained value declaration appears in directory@10 or its partition. Complete owner task Amounts remain owed. |
| Destination | Foreign-entry fields; judge observes artroom-rules-extents-1 at 262,144 and declares artroom-changed-set-1 evidence at 262,144 in destination@6. Its other owner operations, token cleanup and closure Amounts still require completion. |
| Inbox | Inline entries; no separate field, observation-value or outcome evidence producer appears in inbox@1. |

The exported issue digest is
sha256:325cb4f33da9deb1a31d85ba0f1456068d4d9d08009978b779aed70cb08e00ad;
change is
sha256:3f0389ba644e6d58e96a352debcc77d01661ffcf349c6db53d0645c2513eae70.
No pinned declaration or catalog default was changed. The bounded source
probe used native Node type stripping with existing dependencies and
wrote only a scratch JSON inventory. An initial probe treated the VERSIONS
record as an array and produced no inventory; the corrected probe reads
its 36 entries. Source authorities are field-retention.ts,
created-definitions.ts and scope/definitions.ts; native capability
workspace/hold/ancestry code; the lanes' issue/change/shared data; and the
platform catalog, rules-scope and destination data/code.

This closes the known unbounded ancestry-snapshot branch by refusal. Full
producer/owner Amounts, five-axis transactional admission and replay,
historical incomplete byte spans, native boundary witnesses, final gate
and Source review remain unfinished.

## Owner Amount handoff

The existing pending-work traversal now reads full Amounts for opted-in
owner outcomes and pending owner records. Platform kinds whose data
already states the amounts keep using those data-derived terms. Other
outcomes require the pinned owner's reservation declaration. An outcome
declaration must include at least its own entry and entry-byte stand-in;
missing or invalid terms refuse the calculation instead of becoming zero.
Legacy scopes still use closure and scalar reserves as before.

Pending-record reservations have a full Amount reader beside the legacy
entry projection. The calculator checks all components and checks that
the entry projection agrees. A scalar-only record reader is incomplete
even when it returns zero at the current head. Capability composition and
the platform-owner wrapper preserve the new reader, so combining code
cannot silently drop a missing declaration. The test choice facade forwards
it too; its explicitly record-free stand-in returns an empty Amount.

The native git-read@1 implementation now supplies these terms. Each mint
outcome includes its existing six-entry revocation closure. A live token
keeps those six future entries at entryBytes each. Revocation updates the
existing token key; it creates no item, first record key, pending request
or separate retained input. The scalar entry count is a projection of
that same Amount. This adds no producer maximum and changes no record or
entry format.

The in-memory native job-read witness judges the preparation and the
mint's answer and folds both. It checks 15 reserved entries/entry-byte
units before the mint's answer (two possible outcomes with cleanup, plus
the closing checkpoint), then six owner units and one closing unit after
the token becomes live. Deciding the job does not fabricate the missing
native live-token cleanup path: its existing task remains reserved. The
lane, initial scope, grant and host answer are labelled fixtures; the
capability code is native. The preparation/ledger files pass ten cases.
Additional validator, record and ancestry files pass their focused run.

A real-scope witness passes through native capability code, the real
driver, SQLite and actual object eviction (54540, CLOSED0/40b6cc). The
host answer and authority are fixture stand-ins, and no raw record is
injected. One token key is retained, the replacement mint result creates
no second key, the owner Amount remains six entry-byte units after
eviction, and the mock host is called once. This checks calculation and
storage continuity at a loose budget, not five-axis admission at a limit.

The focused control removes the live token's byte terms while preserving
its entries. Its baseline passes, then its intended byte assertion fails
(50548, CLOSED0/d2a4fb), and source is restored. Derive, Scope, Replay and
Platform test compilers pass. Derive's compiler also found two readonly
guard-list mutations in the previous snapshot fixture; they now assign
new lists. The runtime fixture's first compile used a nonexistent store
entry reader; it now reads the actual stored canonical journal entry.
These were compile failures, not passing verification. No gate ran.

This is still a development handoff. hold@1 explicitly supplies an empty
record Amount only when its native workspace predicate proves it owns no
such tasks; its workspace record Amount is still incomplete and raises an
explicit AmountError. The known local workspace/snapshot branch already
refuses opt-in validation, but the remaining finite owner/standing terms
and other platform owner declarations still need completion and proper
pre-admission handling. No claim is made that all eligible definitions
are yet runnable under the new rule.

The existing request calculation also retains a known conservation gap:
settling forms reserve their own send's clause closure, whereas the live
request fold reserves the global largest clause closure. The old witness
allows its settling entry to pass the entry budget for that reason. The
full opt-in rule must instead retain the originating request's Amount
through the native formOf selector, diagnosis and result; removing the
settler exemption before fixing that handoff would refuse already owed
work. This remains required work, alongside complete owner terms,
five-axis admission/replay, incomplete historical byte spans, native
boundary witnesses, final gate and Source review.

## Originating request Amounts and checked entry settlements

The validator now keeps one future-request Amount per exact send form,
using the same request/clause calculation that funds a settling form.
When the fold writes a request, the existing formOf selector identifies
its source form, including conditional sends and fan-out ordinals. Its
pending-request unit becomes Used; the remaining Amount is recorded on
the existing request as derived bookkeeping. No second clause selector
or reservation calculator was added. Native outcome requests follow the
existing runClause interpretation: a data send mark at ordinal zero, or
an empty result clause when the owner supplied no data send mark.

An ordered pendingRequests view reads only requests without a result or
an undelivered diagnosis. A delivery-unavailable diagnosis spends one
reserved entry and its byte stand-in; the result's room remains. A result
or undelivered diagnosis releases this request's duty. SQLite joins the
Amount to the existing outbox key through folded bookkeeping. Checkpoints
and historical Views preserve it. Entry and diagnosis formats are
unchanged, and old cohorts omit the new request member.

With this handoff, the entry-only settlement exemption is removed for
the opt-in cohort. fits checks every proposed head using checked Amount
arithmetic. Timed commits now check the same post-fold ceiling inside
their transaction. Invalid Amounts leave no committed write and answer
unavailable. Legacy interpretation and its settlement exemption remain
unchanged. This is the entry ceiling; the four added ceilings are still
not wired into admission or replay.

The strengthened filled-budget witness now conserves the opt-in total:
the acceptance and the request it creates leave five used plus three
reserved entries at a limit of eight. Legacy still has its old five plus
four row under the exemption. The real-scope version accepts the owed
settlement after actual eviction and refuses ordinary work before and
after it. The existing timed-hold witness also passes under both cohorts
at the filled entry budget and writes the closing checkpoint.

The selected native run passes nine cases across real driver diagnoses,
timed settlements, item/holder terms, request settlement and eviction
(64847, CLOSED0/b659ef). Its raw transaction probe removes an outbox's
pending status and Amount together, then throws: both roll back. That
probe is storage evidence, not a judged result. The dispatcher scenarios
use test authority and controlled transport; the native owner scenario
uses the previously labelled synthetic host answer. No provider runs.

Six focused Derive files pass 90 cases. Conditional same-name and
distinct-name sends, unconditional sends, fan-out, a late result after a
diagnosis, and the filled-budget request handoff retain their original
witnesses under legacy and opt-in rules. All three Replay View cases
pass, including the full verifier over judged request/item history, a
delivery-unavailable diagnosis and its covering checkpoint. Its grants
remain explicitly trusted as recorded. It also compares historical heads
with fresh folds in different query orders; it proves these derived
entries and checkpoint, not complete five-axis replay or authority.

A focused pure control initially restored the wrong global clause charge
and failed the intended pending-row assertion. After entry settlement
checks were enabled, the native control passes baseline and fails when
that same wrong charge refuses the already owed acceptance (11300,
CLOSED0/727f9c). Source is restored. Derive, Scope, Replay and Platform
test compilers pass. The original failures remain: the first row assertion
still expected legacy counts for the opt-in cohort; an attempted member
row used retains where only rules rows allow it and was removed; a
declared tell used a field address where that grammar requires a slot,
which was corrected. Compilers caught missing Amount imports, a local
name shadowing reserved, and an untyped tuple in the budget assertion.
Those failed runs are not passing evidence. No gate ran.

The global extra terms for platform clause marks are deliberately still
carried, not discarded, while their per-send integration remains owed.
Complete platform/owner and standing terms, their pre-admission checks,
all four added admission/replay ceilings and named refusals, historical
incomplete byte spans, the remaining native boundary witnesses, final
gate and independent Source review remain unfinished. This branch is
local development, not an approved capacity guarantee.

### All-five post-fold admission and named refusals (development checkpoint)

The opt-in runtime now compares actual Used plus the existing reserved
Amount with all five logical ceilings. It does so after the proposed
entry, retention, fold and redaction, in the same SQLite transaction.
Used reads the journal head, logical byte domains and digests, and the
existing item, record and pending-request key counters. There is no new
reservation traversal or persisted Used cache. Equality fits; invalid
operands, intermediate sums and ceilings do not become free room.
Legacy scopes still use their existing entry-only admission and settlement
exemptions. Opted-in timed entries and other settlements pass the same
five-dimensional check as new work.

The write verdict now takes full(head, bound). Opt-in creation, act,
preparation, delivery, checkpoint and offered-outcome answers carry the
closed budget name when the transaction refuses. These are serving
answers; entry and diagnosis formats have not changed. The strict client
creation parser accepts the five names only on scope-full and still
accepts the legacy unnamed reply. Internal and timed capacity failures
also keep the name in the turn's invocation-local measurement.

The existing metrics-v1 reason slot accepts scopeEntries, scopeBytes,
scopeItems, scopeRecords and scopeRequests. A public scope-full answer
with a valid budget name records that name there. Arbitrary guard names
still cannot enter the closed slot. The point shape, native end, public
answer and loss accounting remain the existing ones. A real request-limit
refusal after eviction produces answer/scopeRequests/refused. No new
telemetry dataset, provider query or deployment was used.

The native boundary cases use real scopes, judgment, SQLite and eviction,
with the existing labelled lane/authority fixture. Creation succeeds
exactly at its actual byte use plus pending reservation and refuses one
byte below it. That refusal keeps no genesis, item or retained bytes;
retrying the same signed creation after eviction at the exact ceiling
succeeds. The item and request cases accept the last key and refuse the
next one, preserving the complete stored snapshot and logical bytes.
The native read-token case uses the existing synthetic host answer: at
one record, minting-to-live replaces the key, while a second job's token
preparation is refused without a host call or storage change. It remains
no evidence of a token at an actual provider.

A further real-scope witness tightens the byte ceiling at restart to the
actual Used plus Reserved of an already pending report. An ordinary
remark is refused at that filled budget; the genuine report acceptance
and closing checkpoint both remain funded. This is a deployment-ceiling
fixture, with no item or duty injected by hand. Existing entry-budget
timed settlements pass for both legacy and opt-in scopes.

The pure comparison case passes. The expanded native boundary run passes
four cases. The subsequent focused closure passes 11 cases and fails one
old exact assertion because the opt-in refusal now includes scopeEntries;
that assertion was updated to require the name for opt-in only, and its
two legacy/opt-in timed cases pass. That closure also passes the new
filled-byte settlement witness, request metric witness and owner record
witness. All seven metric cases and the strict client-parser case pass.
Derive, Scope, Replay, Platform and Client test compilers pass.

One focused native control passes baseline, temporarily ignores the item
ceiling, and fails the intended assertion when the extra item is wrongly
accepted (97944, CLOSED0/b44f5d). The script restored Source. Earlier
failed attempts are retained separately: the first native fixture used a
wrong expected revision and tried to send from a comment, which the
validator correctly refuses; both were corrected. The first metrics run
could not open loopback in the sandbox and ran no cases; the configured
local runner passed when loopback access was enabled. These failures are
not passing evidence. Reports use the /tmp/artroom-capacity-all-bounds-
prefix; no gate ran.

This supersedes the preceding checkpoint's statement that all-four added
runtime admission ceilings and named refusals were unwired. Complete
platform clause/owner/standing reservations and producer refusal checks,
all-five replay with explicit historical redacted-byte incompleteness,
the remaining native conservation witnesses, final gate and independent
Source review remain unfinished. Checking actual use prevents a committed
overflow; it does not by itself prove every admitted task was fully funded.
