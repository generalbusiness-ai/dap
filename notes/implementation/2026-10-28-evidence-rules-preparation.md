# Evidence rules: preparation and implementation evidence

Status: Source implementation in progress. This note retains the
before-source choices required by the first-slice request. Checks, review,
landing and deployment remain owed.

Base: Main `06e4d33fe17937610891f29b5d1513b9e224edea`, after J3.
Branch: `request/evidence-rules-20261028`.

Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a53e146477354f07cf6ff657e93b36d411d846c8
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a891555c470d4693e466b9c5240b5ed35a95b388
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:ed8187819e92ad401315e78a5a7f0a6c6073509f
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f73805e41fb84d460ea391b66a2c6ab23568f15b

The full request and ruling were read through gitseq as builder. The
ruling remains effective. Its stale metadata follows retirement of the
answered question, not withdrawal of the decision. The workroom permits
stale bases without an override. No renewed ruling is required.

J3 landed as `06e4d33f` after exact-head approval `c9bd8822`.
Receipt `ceba0366` and independent landing check `3c884798` confirm it.
The preparation branch is rebased onto that Main. The production Runner
is the base for this slice. Source changes now implement the selected
boundary below; the earlier scratch proposals remain historical.

## Rules owns the service mark

The successor Rules singleton holds at most one `roomService` pair:
`{checker member, key}`. Only an active admin publishes it through the
native `publish` path. New genesis is unmarked. Explicit null withdraws
it. Publication observes that the named member is active and has the
checker role. An inactive member or another role is refused.

Publication does not prove the key atomically. Admission and result
judgment each prove the exact key's current eligibility through the
existing native observations. No extra native owner or marking-time
exchange is needed. Local settings or the checker role alone cannot mark
a service key.

The generation is the native-selected last-mark-change position, scoped
to the exact Rules reference, including incarnation. Callers do not choose
it. An unchanged pair does not rotate because another policy field changed.
Native effects keep a local position or reference, never the hash of the
entry being written. If an implementation uses a full fact later, its
entry and hash come from actual recorded bytes. A later head's hash cannot
supply the hash of an earlier mark position.

The authoritative Rules observation supplies the mark, generation and
observed head under the successor's exact definition. Keep the existing
observation identity, clock and replay checks. Do not add a foreign-history
proof, history scan or caller anchor beyond this observed native boundary.

The marked key is exactly `CheckerService`'s external `ResultSigner.key`.
That signer signs the result after J3's production Runner returns eligible
execution evidence. It stays outside the job and container. An image,
bridge nonce, URL, process setting or runner assertion cannot replace the
Rules mark. This preparation chooses no new service key.

## Rotation invalidates the observed in-flight fence

Destination admission freezes the marked member, key and generation with
the exact job, tree, configuration, source and stage. Result judgment
observes the current mark and exact key eligibility again.

After Destination observes another generation, neither the old key nor
the replacement key completes that frozen job. A new job must be explicitly
requested. There is no automatic restart, new signature, reclassification
or reuse to repair the old fence. Returning to a former member/key pair
does not erase the intervening generation change.

This is bounded native observation order, not immediate global revocation
at the Rules commit. There is no Destination-local fence or handshake.
Old accepted results remain historical facts. Reuse applies today's full
eligibility rule separately; past admission never supplies current signer
authority. Keep the documented reuse key rather than silently adding a
new identity field to it.

A refusal retains `wrong-source` and records the frozen and observed
scoped generations in typed data. The lane's readers see that refusal.
An unavailable observation is not an invented generation or proof of a
rotation.

The lane may retain an ordinarily member-authorized result. Destination's
recorded refusal to count it is the commissioned enforcement. No actor-key
DSL operand, new generic guard or extra exchange is commissioned for that
choice. Identify the signer from the actual signed result entry and its
admitted fact, not a caller-supplied key or diagnostic prose.

## Successors retain historical meaning

Add new versions of Rules data, the change lane and Destination. Preserve
all shipped native bytes and lane pins. A check without `source` keeps
`member` meaning. Missing `stage` remains `landing`; absent reuse and hold
choices keep the existing non-reuse and non-holding behavior. The first
slice supports `room` and `member`, with audit `every: 1` only.

The reuse key is room, tree, check name, configuration, source and stage.
An eligible result decided a real job admitted under its then-current
rules. Its signer must still meet today's source, checker, role and key
checks, using the required fresh authority observations. One predicate compares eligible passes and failures.
Disagreement permanently disables reuse for that key, while a fresh job
can still land. Record the earlier job actually counted. Use a bounded
keyed index, not a room-history walk.

A `work` result never meets an extent's landing checks. A `landing` job
uses the reservation tree. A `published` job uses the confirmed published
commit and cannot undo that publication. Audit jobs always run fresh,
including after cancellation and a same-tree retry. Refuse mismatched
audit configuration or stage, reused audit targets, `every != 1`, and
`reuse: true` on published checks.

Destination owns holds. A hold names the check, source, stage,
configuration, rules generation and extent, with the failed job and
published commit. Its failure and hold update are atomic with admissions.
A still-running published check does not block a landing. Order by the
recorded publication sequence and admitted job order, never hashes or
notice arrival. Duplicate notices are idempotent.

Only a current eligible pass on the exact hold key, for the same or a later
publication, clears a hold. An earlier pass cannot clear a later hold.
A timeout, error, unknown result or unavailable observation is not a pass;
with `holds: true`, it sets a hold with its reason. Closing an intent clears
nothing. Changed configuration or rules generation requires an authorized
transition naming the old hold and new generation, or an override with a
reason. Record those acts as transition or override, never as pass.

Keep the native job deadline and its default unless the successor's
bounded per-check deadline field deliberately changes it. J3's runtime
limits are separate from the lane's native waiting deadline.

## Coordinate the source shape before parallel edits

### Selected implementation boundary

The slice adds the explicit `EVIDENCE_RULES_COHORT`: Register 22,
Directory 21, Membership 8, Rules 13, Destination 17, Inbox 1. Destination
16 and the unpublished cohort already exist and stay exact. Global
defaults and deployed creation policy stay unchanged. The new declared
Issue and Change definitions have new digests; old definitions and pins
are preserved. Pin generation waits for a coordinated committed freeze.

Rules 13 uses a complete policy with required nullable `roomService` and
the optional check fields already listed above. Its transport-only
`checkers` field is the exact distinct union of configured checker members
and the marked service member, at most 33. It is excluded from the policy
digest. The new policy domain is `artroom-rules-policy-2`; its retained
observation envelope uses `artroom-rules-extents-3`. The complete policy,
proof, and envelope each retain a 262,144-byte ceiling. The unchanged
49,571-byte Rules content ceiling is checked on the complete successor
projection. Every accepted publication must also fit its actual carrying
entry and retained-value budget.

The mark stays inside the complete policy. An optional local reference
`roomServiceChanged` records native self only on pair change or withdrawal;
unchanged pairs keep their generation. The member union proves active
checker members. A mark change additionally requires the fresh grant's
admin role, rather than possession of a customizable publish action alone.

Neutral contract types are `CheckSource`, `CheckStage`, `ServiceMark`,
`ScopedRulesPosition`, `CheckSubject`, and `EvidenceBinding`. The binding
is a closed record with version 1, source, stage, checker, policy generation,
service mark and generation, nullable auditOf, and subject. Each generation
is the full Rules reference plus a native position. Room-source jobs freeze
the mark and cannot finish after an observed rotation. Ordinary member
source does not gain authority from that mark. Audit room jobs use their
own fresh room-source admission. The original answered question explicitly
scoped the unfinished-job rotation rule to room jobs.

Subjects contain actual facts, while the common Job retains commit, tree,
and base without duplication:

- `landing`: publication-opening and manifest facts;
- `work`: an already admitted Issue `stage-work` source fact;
- `published`: publication-opening, receipt-opening, receipt-written, and
  manifest facts.

Each subject has `kind` equal to its stage. The binding digest hashes the
canonical bytes of `{domain: "artroom-check-binding-1", binding}` using the
existing bytes hash helper. Successor result acts bind the actual job fact
and this digest. Their native reader compares the complete admitted job;
echoed fields grant no authority. Old signed result bytes stay unchanged.

Work checks use a new Issue successor with a separately admitted staged
source and a later explicit work-check request. The source uses the existing
performer, terms, staged, ancestry, and held-pin rules; it is not a report.
The native admission derives tree and first parent from actual commit bytes.
Its retained commit proof is limited to 32 KiB decoded and 48 KiB canonical
bytes. A root commit or unsupported object format is refused. The source
owns its pin until unresolved jobs settle or an authorized explicit release.

Published jobs follow actual receipt-written state, including its recovered
deciding-read path. Their successor origin proof is distinct from a live
reservation. It reads bounded immutable objects at the recorded commit and
never recreates a cleaned reservation ref. New delivery-origin jobs prove
the native sender and admission, without a fabricated member signature.
J3 consumes the same operational immutable object overlay after validation.

The selected lifetime limits per Destination incarnation are 2,048 reuse
keys, eight retained or reserved candidate slots per key, 32,768 canonical
bytes per complete key record, 512 hold keys across all generations and
states, 512 retained hold-policy generations, and 8,192 published incident
identities. Triager observations require complete coverage of at most 32
active holders. Unknown, empty, or over-bound sets remain visible.

All work and landing jobs that could supply later reusable evidence reserve
a candidate slot, including fresh and audit jobs. Published jobs cannot be
reused. Retain older candidates through key rotation. Eligible disagreement
permanently disables reuse for that key; a fresh job for a conflicted key
needs no new candidate slot and remains allowed. A nonconflicted full key
refuses a new candidate-producing admission. There is no silent eviction,
replacement of old results, or fallback history scan.

Index and hold rows stay nonfinal, or use explicit all-state counters;
`item.max` alone bounds only live items. Hold assessment reads at most 512
indexed active holds, including retained extent patterns from older policy
generations. Reserve all affected holds and an incident identity before
admitting a published job. Every published job reserves incident capacity,
even without holds. Failed and unknown settlements cannot lose already
funded state to later admissions.

These limits are independent of the five-dimensional used-plus-reserved
capacity checks. Use the maintained checked Amount helpers, complete
carrying-entry forecasts, retained source/observation/value charges, and
all future outcomes. Refuse before opening work when any bound cannot be
proved. Per-check assessment bounds candidate standing reads; the old
G15 capture budget is not evidence for a larger cohort. The 16-effect
allowance still applies unless the actual existing bound explicitly permits
another declared native maximum. No new kernel allowance is implied.

| Owner | Bounded implementation scope | Existing useful boundary at Main |
|---|---|---|
| Rules and policy | A new successor beside `packages/platform/src/rules-scope-v12.ts` and `rules-policy-v11.ts`; admin mark, native generation, observation projection and strict policy codec. Minimal versioned types in `packages/contract/src/observation.ts` if needed. | `rules-scope.test.ts` publishes under active-checker observations and projects Rules at an exact head. `rules-policy-v11.test.ts` checks strict owned policy and extent requirements. Keep old-version assertions. |
| Lane and checker wire | A new successor beside `apps/room/lanes/src/change3.ts`; stage jobs, frozen descriptors, audit identity and typed result/refusal data. Keep `packages/checkers/src/job.ts`, `outcome.ts`, `signing.ts` and service origin consistent with that shape. | T34 in `checks.scope.test.ts` covers authentic results and retries. `manifest.scope.test.ts` covers exact version, checker and tree. J3 adds the actual one-file Runner/CheckerService path. |
| Destination and judgment | A new successor beside the chosen current Destination protocol; bounded result index, reuse disablement, source judgment, audit pairing, published jobs, ordered holds, transitions and overrides. New pure eligibility logic beside `reservation-v14.ts` and `reservation-v15.ts`. | `reservation-authority.test.ts` retains deciding entries and current key standing. `support-destination.ts` supplies real package rules. W5 and manifest-tree scenarios exercise native cross-scope admission. |
| Integration and display | Catalog, cohort and lineage exports; exact native/lane generation; design disposition and visible typed refusal. Use the maintained `pin-native-declarations.mjs`, lane `pin.mjs` and `reference.mjs` at the coordinated checkpoint. | `certified-rules.scope.test.ts` covers a fresh Rules-generation fence. `wiring.scope.test.ts` supplies real Rules/Membership/Destination; `manifest-tree.scope.test.ts` supplies reservations and publication cleanup. |

Future implementation waits for Root's coordinated version and shared
job/result-shape ownership. No future pin number is chosen here. Preserve
the current certified Rules path and its read limits; do not downgrade it
to an older publication path.

Cheap pure or Native fixtures can cover policy combinations without one
container per field. At least one integrated case must bind the marked key
to J3's actual production adapter and external signer. Keep stand-ins
explicit: W5 alone has no runner; T34 uses a scripted Rules peer and does
not prove Destination admission. A historical reservation recording is
not a fresh service run.

## Preserve all Decisions witnesses

These are planned observations, not results. The first two columns retain
all 19 witnesses in the design's Decisions section. Mark/rotation and
transition checks strengthen those boundaries without replacing them.

| No. | Required witness | Smallest useful extension |
|---|---|---|
| 1 | A member result cannot satisfy a room check. | W5 or J3 one-file native path: allow ordinary lane retention, then observe Destination's visible `wrong-source` with frozen/observed generations. Include mark withdrawal, wrong key and observed rotation; only an explicit fresh job proceeds. |
| 2 | Omitted source keeps its member meaning. | Preserve existing lane/Rules cases and add one successor policy compatibility case. Old pins stay exact. |
| 3 | Disagreeing member and fresh room audit results refuse landing. | One native reservation sequence plus the pure Destination pairing table. |
| 4 | Audit configuration mismatch refuses publication of rules. | Successor policy/publish case beside the current strict codec cases. |
| 5 | `every` other than one refuses in this slice. | The same bounded policy/publish case. |
| 6 | Cancellation and same-tree retry get a fresh audit despite an earlier admitted pass. | Extend manifest-tree's actual cancellation/retry flow. Require distinct explicit audit jobs and fresh runs. |
| 7 | An audit target cannot have reuse enabled. | The same policy case; Destination also refuses an earlier result as a fresh audit. |
| 8 | A reused admitted pass counts only for an equal tree. | Pure eligibility table with actual job/result facts, then one native reservation sequence. |
| 9 | Another source is ineligible for reuse. | The same eligibility predicate and table. Current signer eligibility remains required. |
| 10 | Eligible pass/fail disagreement disables reuse for that key; a fresh run still lands. | The same bounded result index, followed by one explicit fresh native job. No history sweep or fictional deciding fact. |
| 11 | Published checks refuse reuse. | The bounded successor policy case. |
| 12 | Published failure opens the triagers' intent and, with holds, blocks the next affected extent. | One native room sequence with real lane/Rules/Destination and recorded publication identity. |
| 13 | A late earlier-publication pass does not clear a later hold. | The same native sequence; pure hold-order cases cover the selected key. |
| 14 | Another configuration or rules generation does not clear a hold. | Exact hold-key judgment cases; a real authorized transition names the old hold and new generation and is not shown as pass. |
| 15 | Failure/admission ordering is atomic: before refuses that admission; after affects the next. | Destination transaction/journal order with explicit gates, not sleeps. |
| 16 | Duplicate/reordered failure notices preserve the hold. | Reuse the same admitted job/publication facts and dispatcher gates. |
| 17 | Closing the triagers' intent, or another intent, clears no hold. | Follow actual intent closure and read Destination's retained hold. |
| 18 | A published timeout does not clear a hold. | Native deadline/turn plus the pure hold judgment table; no elapsed-time guess or fabricated pass. |
| 19 | Authorized override clears as override, never as pass. | Actual Destination act, role checks and recorded release reason. |

The published-failure intent exchange is new commissioned work. It needs
actual job/publication binding, idempotence by recorded facts and native
creation authority. It is distinct from the extra marking-time proof
exchange that the ruling excludes. No deployment health claim follows
from any of these checks.

### The published-failure incident has its authority ruling

Ruling `f73805e4` answers the incident question. The recipients are the
complete bounded active holders of `issue.triage`, called triagers in data
and UI. This uses the existing holders observation, not a new literal
admin or maintainer roster. The implementation head updates the design's
stage table and following sentence to use that meaning.

The incident is a declared nested successor of the Change that landed.
The existing Directory-rooted creation closure and index row give it its
authority and number. Its system origin records the exact sibling
Destination, admitted published job, publication, and native failure
decision. No human requester or automatic signing key is fabricated.
Ordinary edit-own gives nobody special authority over a system origin.

There is one incident state per job, including jobs without `holds`.
Pending delivery resends only its original envelope. An unknown creation
does not start a replacement. Unknown, empty, or over-bound triagers leave
visible pending or refused state; failure and hold state remain owned by
Destination and atomic with admissions.

A reasoned hold and an incident's cause are distinct. With `holds: true`,
timeout, error, unknown check outcome, or unavailable observation sets a
hold with its actual reason. An incident requires a recorded native
decision for the admitted published job and actual publication. It keeps
the real deciding result or error cause; it never invents a failed result
fact. Unknown incident creation preserves that decision and its original
create envelope. It does not turn an unknown check into a signed failure.

The answered question was retired as `2fccf06d`. The ruling remains
effective; its stale metadata follows the already answered earlier basis.
No marking-time exchange is added.

## Source implementation checkpoint

The shared contract, Rules successor, lane successors, checker service and
host stage-read path now have Source implementations. They are not yet
validated. Root freezes and commits every source owner before any project
import, parser, generator, compiler or test runs. The selected cohort is
Register 22, Directory 21, Membership 8, Rules 13, Destination 17 and Inbox 1.

The queue entry and admitted job are separate. Initial `check-fence` or
`work-check-fence` delivery opens an evidence-request. Its acknowledgement
means queued only. A selected `evidence-admit` outcome opens the admitted
nonholder evidence-job at the outcome's own sequence. For work jobs, the request remains
the complete funded lifetime account for result, notice and late settlement.
Landing and published jobs use nonholder evidence slots and their exact
pre-existing batch account. Messages carry the recorded merge operation;
Native proves that it belongs to the admitted job and publication.
No settling outcome opens a new holder or transfers unfunded reservations.

A fresh audit names two facts with distinct meanings. `binding.auditOf`
names the actual counted Member job, which may belong to another lane.
`forJob` names the current logical Member request, including a reused alias.
Pairing uses the latter so cancellation and retry require a fresh audit.
The audit still compares the same tree, stage and configuration.

Published setup uses bounded Native self-requests. Each actual new-work
delivery opens one funded batch account of eight lifetime job slots. A
publication needs at most four accounts, selected from its complete
landing, audit and published obligations. A settling outcome opens no
holder. The publication cannot write until all needed accounts and exact
hold, policy-generation and incident identities are funded. Unknown setup
remains visible and cannot grant permission to write.

A published-plan is a nonholder cursor. Only an actual written receipt,
including a proven recovered write, can start it. Later outcomes emit one
bounded descriptor at a time, after the written fact exists. The actual
batch accounts fund complete job, incident and hold closures before the
irreversible write and stay available while that work remains unresolved.
Running published checks alone do not hold the branch slot.

Readiness requires both complete batch accounts and a confirmed stage. The
last funding delivery or the later stage outcome emits the same authenticated
committed update, once. It never depends on network delivery order.

`evidence-progress` separates result retention from final publication work,
so the carrying entry keeps the 16-effect limit. It reads the actual sealed
admission or result, observes current Rules and all required result keys,
and then updates the publication. A prior accepted result does not itself
assert fresh authority.

The recovered write path keeps the old read outcome's receipt opening. An
authenticated self-request opens the nonholder published-plan through a
bounded effect mark. It draws on the actual batch account and names the
already recorded written fact. No outcome opens a holder.

A deadline atomically records the actual timeout and reasoned hold. A funded
notice operation separately obtains current triagers. Timeout ends waiting;
it does not release budget needed for an eligible late result or prove a
physical runner stopped. The service cannot start a first run after its
deadline. A persisted run may finish under fresh current authority.

The performer can explicitly abandon a staged work source with a nonempty
reason and `issue.work` authority. That releases its pin, while unresolved
jobs keep their actual state. A fresh stage snapshot refuses a released
source. Kept unsigned outcomes remain retained if a fresh source read is
unavailable; an original signed retry sends identical bytes. Native rules
independently judge eligible late results.

The design now states Rules ownership, native scoped generation, observed
rotation, and the triagers' nested incident exchange. The implementation
still owes owning checks, all 19 Decisions witnesses, the explicit actual
J3 marked-room case, one ordinary gate and independent exact-head review.
No test result or deployment is claimed at this Source checkpoint.

## Decision needed: atomic native timeout

Static Source review found a contract gap before the first project run.
`packages/contract/src/platform.ts` states that a timed rule holds no mark.
`packages/derive/src/validate/effects.ts` refuses every timed code effect
with `timed-partial`. `validate/timed.ts` also requires a literal transition
out of the timed states. The current draft has those literal transitions,
but its code effect remains unsupported. It is not a valid whole Native
implementation and cannot satisfy this request yet.

The commissioned timeout needs one atomic record of the actual timeout,
its reasoned holds and the funded notice task. Literal effects on the timed
job alone cannot update a different hold owner. Delaying those effects to
a later outcome would leave an admission window unless the authoritative
hold view also changes. The existing timed `opens` extension supports only
fixed reservation cleanup kinds and does not supply this projection.

The recommended decision is a narrowly versioned Native timed projection
for actual Destination 17. It must have all of these properties:

- Only the exact Native catalog and applied genesis select it. Declared
  definitions and historical Native versions retain the existing ban.
- The declared literal transition still leaves the timed states. The
  projection is synchronous and bounded by its declared effects and
  pre-funded operation closure. It cannot fetch, observe or send messages.
- The timed journal entry atomically retains the timeout cause, exact-key
  hold changes and notice opening. The notice separately reads triagers.
- Validation, derivation, fold, replay, lifetime custody and all five
  capacity dimensions use the same finite declaration. No allowance rises.
- A narrow witness must place a landing on each side of the timeout
  boundary and prove there is no partially effective hold. Negative controls
  must preserve the historical and declared timed-mark refusal.

This requires work in the neutral contract and derivation layers, beyond
the assigned new Rules, lane and Destination versions. Root requests an
explicit planner disposition before implementing that extension. An
alternative is a redesigned authoritative timeout-marker/hold view using
existing literal effects and a bounded pending-job index. That changes the
selected hold storage and admission proof and needs its own concrete ruling.
Merely moving hold updates to an asynchronous notice is insufficient.

All current implementation Source is retained for review. The unaffected
bytes, Git, checker, policy and lane components can be checked after a
committed freeze while this decision is pending. No whole implementation,
Native authority scenario, gate, review or deployment is claimed.

## First component checks and record-wire correction

After all Source owners froze, commit `624b5ce29b` recorded the draft.
No whole validity claim followed that checkpoint. The first lane generator
attempt failed because the copied scratch dependency directory lacked a
real `node_modules` parent. The corrected owned namespace uses the same
verified installed packages and 14 worktree links. No package was installed
and the lockfile is unchanged. The second attempt passed. Commit
`464b1205c2` records both successor JSON definitions and their exact pins;
all six historical lane byte files and earlier digest files are unchanged.

The first focused policy/helper run passed 37 tests in eight files. The
owning bytes run passed 90 tests and failed the new binding test because
its second incarnation string was not canonical base32. The fixture now
uses the maintained incarnation constructor with explicit public test
bytes. The owning checker run passed 21 tests and failed five. Four new
failures exposed a real admission-wire defect; the fifth was an existing
Unix-socket test refused by the execution sandbox. Its isolated rerun
passed with the socket permission and no product change.

Generic `FieldValue` excludes nested nulls. The new semantic records had
nullable members, so casting them to `FieldValue` did not make their
journal effects valid. The correction keeps semantic policy and record
APIs separate from strict versioned wire APIs. New opaque persisted
policy, admission, batch, capacity, service and publication records travel
as canonical JSON text. The required publish service mark is also explicit
text, including `"null"` for withdrawal. Retained value-domain JSON keeps
its existing semantic representation. No generic scalar or historical
protocol is widened.

Wire readers bound characters and UTF-8 bytes before parsing, require
canonical round-trip equality and reject object fallbacks. Carrying-entry
forecasts count the outer string's quotes and escapes. The checker reads
the actual admitted record through that same wire contract, while keeping
its lower-layer dependencies. The first failed runs remain retained under
`/private/tmp/artroom-evidence-rules-evidence-20261028`, with command,
Source snapshot, output hashes, exit, elapsed time and host child CPU.
These are component results, not a Native cohort, gate or deployment pass.

Commit `de3ea0b506` froze the text-wire repair. The focused bytes binding
test and seven checker admission/service tests passed. The policy wire run
passed 23 tests in five files but could not import the new record-wire
test: a missing outer brace in the draft Native data caused a parser error.
Commit `f33bae9e65` fixed that brace; the two record-wire tests then passed.
The bytes compiler passed. The first checker and platform compiler runs
found independent type errors, and the first whole-lane validation found
three incorrect local fact bindings in Change 4. Those originals remain
retained; their Source repairs are in progress. The unsupported timed code
effect remains a separate contract error pending the planner's disposition.
