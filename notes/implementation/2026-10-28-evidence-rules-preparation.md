# Evidence rules: preparation and implementation evidence

Status: In progress. Native N2 passed at `ba17bcedf7`; the first N3
publication wrote its receipt. Ruling `393b3b99` removes the unintended
whole-scope opt-in and the byte-only repair. Legacy scheduling changes,
remaining Native scenarios, physical J3, gate, review, landing, and deployment
remain owed.

## What changed

The explicit cohort adds Register 22, Directory 21, Rules 13 and Destination
17 with Membership 8/Inbox 1, plus new Issue/Change 4 digests. Old definitions,
pins, signed bytes, default cohorts and deployed creation policy stay exact.
Rules owns the admin service mark; Destination judges fresh authority,
bounded reuse/audits and ordered published holds/incidents. CheckerService
binds actual stage facts to J3's existing Runner and external signer.

Counted native outcomes now use one declared send. Separate funded
`evidence-funding`, `evidence-audit` and `evidence-plan` operations serialize
bounded accounts; no global send cap widens. First current progress
opens audit once via ninth job value `auditOpenedAt` (null means empty).
The shared sealed-opening helper resolves actual self. Bound landing and
published fences claim an existing funded batch and open its admission
operation. They open no item. The native reader reconstructs the pending
record from the exact sealed fence, batch birth and original job; admission
still judges current authority. Checker verifies the same provenance. The
carrying quote covers five full fact uses and maximum canonical binding
text. Complete Native funding/acceptance remains unproved.

Base: Main `06e4d33fe17937610891f29b5d1513b9e224edea`, after J3.
Branch: `request/evidence-rules-20261028`.

## Decisions and reasons retained from before source

Preparation commit `0ff2027f3505f53d8264d4f90ab65f4bbcf812d7`
recorded the required service-mark choices before implementation. These
full records govern the slice:

Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a53e146477354f07cf6ff657e93b36d411d846c8
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a891555c470d4693e466b9c5240b5ed35a95b388
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:ed8187819e92ad401315e78a5a7f0a6c6073509f
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f73805e41fb84d460ea391b66a2c6ab23568f15b
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:c20152ef7919ec4b03c7647a6b734aadc1cec7dd
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:1bc4f7fdc0f8bd2a31b54d04b74ccbb91228dbd4
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:393b3b99f469df1df80b676ec1da7b29dcce7cce

Retirement of answered questions did not withdraw the rulings. Their stale
metadata requires no renewed authority. J3 landed at `06e4d33f` after
approval `c9bd8822`, receipt `ceba0366` and landing check `3c884798`
but does not prove this slice's marked-room acceptance.

### Rules mark, rotation and revision 21

Rules holds one nullable `{checker: MemberRef, key: KeyId}` mark. Genesis
is unmarked. An active admin publishes or withdraws it; the named member
must be an active checker. A customizable publish action alone is not admin
authority. Admission and judgment separately prove the exact key's current
member, role, action, controller, lifetime and clock eligibility.

The mark binds exactly the external `CheckerService` `ResultSigner.key`.
The signer stays outside the job/container and signs eligible Runner
evidence. Settings, URLs, images or claimed keys cannot replace that mark.
No service key is selected here.

Native selects the last mark-change position scoped to the exact Rules
incarnation. Unchanged pairs keep it; withdrawal and reinstatement each
change it. Effects retain local positions, never their own future hash.
Full facts later use actual recorded bytes, not a later head's hash.

After Destination observes rotation, neither key completes the frozen
room job, even if the former pair returns. Only a fresh explicit admission
proceeds. This is observed order, not immediate global revocation. An
unavailable observation records null, not a fabricated generation. Past
accepted results stay facts; reuse applies current eligibility separately.
A lane may retain a member-authorized claim that Destination refuses to
count. Typed `wrong-source` keeps frozen/observed generations. No actor-key
DSL operand or marking-time proof exchange is added.

Ruling `1bc4f7fd`, under [Kernel boundary, section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel),
permits RulesContent revision 21: `roomService` and `serviceGeneration`
exist exactly when the definition declares `roomServiceChanged`. Derive
and bytes enforce that shape; Rules 12 and earlier have neither member.
Contract retains only its required type-only `ServiceMark` and
`ScopedRulesPosition`. The records comment and contract section 16.1 name
revision 21 beside revisions 19/20. It closes no kernel item.

The reason is authority: the Rules observation states what a foreign judge
may know. A retained extents value alone cannot prove the native mark
position. `EvidenceBinding`, source/stage/subject vocabulary and the
`artroom-check-binding-1` codec instead live in platform. Bytes supplies
canonical bytes/digests/ref checks; no kernel package imports this platform
vocabulary. The earlier bytes-layer and envelope-only proposals are
superseded. Historical grammar, fold, replay and custody remain unchanged.

### Literal TIME, stage custody and binding

The draft timed code failed `timed-partial`. Ruling `c20152ef`, preserved
by `1bc4f7fd`, rejects a new timed port. TIME changes only its own job's
literal state, reason and self deciding ref, with no sends or operations.
Historical Destination 1–16 timers remain exact. Admission reads bounded
pending-job rows, so a timeout holds at its own entry without a deferred
cross-item update. A later native entry or authorized recovery opens the
funded notice. Timeout neither proves physical drain nor releases capacity.
Authentic late results remain eligible under fresh current authority.

Defaults remain Member source, landing stage, no reuse/holds; audit
`every` is exactly 1. Binding version 1 holds checker/source/stage, policy
and service generations, nullable mark/auditOf and actual subject facts.
Work names staged Issue source; landing names publication/manifest;
published adds receipt opening/written facts. Common job retains Git IDs.
Digest is canonical `{domain: "artroom-check-binding-1", binding}`.
Results bind actual job/admission, not caller-claimed identity.

Opaque records use bounded canonical text, no object fallback. Readers
bound UTF-8 before parsing; forecasts include escapes. Fence ACK is queued
only; fresh `evidence-admit` opens the admitted nonholder job at actual seq.
Work preserves performer/terms/ancestry/pin custody and derives Git tree
from signed proof (32 KiB decoded/48 KiB text). Explicit reasoned abandonment
releases its source pin, not jobs/drain. Fresh snapshots refuse it; retained
outcomes, identical signed retries and eligible late results remain valid.
Checker snapshots retain actual admission/source facts and recheck fresh
authority before launch/sign. Published reads use immutable confirmed Git
objects, no revived reservation ref or invented human signature.

### Reuse, funding and holds

Reuse keys remain room/tree/name/configuration/source/stage. One current
predicate compares passes and failures; disagreement permanently disables
reuse while fresh work can still land. A reused alias names the actual
earlier job/result, never a new run or signature. Work cannot satisfy
landing. Published checks and audit targets are always fresh. Audits match
tree, stage and configuration. `auditOf` names actual counted Member job;
`forJob` names this logical request, preserving fresh audits after retry.

At most four eight-slot NEW WORK carriers hold the counted operations and
bound decisions that can arrive after a publication becomes final. Outcomes
cannot take holders; bound fences open no item. Those carriers serve the
ruled published, audit, result, and incident paths, not a byte-admission
guarantee. They retain exact capture/operation/ordinal and count identities.
Only actual written receipt proof starts the nonholder published plan.
Carrier setup and receipt writing may finish in either order; full carrier
setup is not a prerequisite to Git publication. A fixed receipt publication
index finds the genuine receipt without scanning the journal. A separate
written-entry position names its actual state change; item revision remains
a counter. The original plan-opening marker prevents duplicate queued or
unknown dispatch. An authenticated landing fence waits on its original
pending carrier delivery only when its selected carrier is absent. An
available selected carrier can proceed within the actual contiguous prefix;
all published-plan dispatch still requires the complete original set.
The 16-effect evidence-admission allowance is unchanged. Inherited push
and deciding-read budgets keep their own accounting: the ordinary Data
changes, callback operations and ledger attempt are distinct terms. A
universal 16-effect check after a real push would reject valid queued
publications, so this correction does not add that check.

Limits: 2,048 keys, eight candidates/key, 32,768 canonical bytes/key,
512 holds, 512 policy generations, 8,192 incidents, three pending slots/key,
32 complete triagers. No truncation/eviction hides full/unknown state.
Per-entry carrying limits still apply. Global admission counts entries only.
First certificate opens its reserved singleton ledger; repeats add no credit.

Holds bind check/source/stage/configuration/generation/extent. Publication
and job order decide clearing, not hashes or arrival. Failure and admission
serialize atomically. Running checks do not hold. Only an eligible exact-key
pass from the same/later publication clears; timeout/error/unknown do not.
Other configurations/generations need a reasoned transition or override.

Ruling `f73805e4` chooses complete active `issue.triage` holders, called
triagers. The landed Change creates one nested system Issue through the
Directory-rooted closure, naming actual Destination/job/publication/native
decision. It invents no requester or key; edit-own grants no privilege.
Unknown creation retains the original envelope, never a replacement.
Timeout invents no failed-result fact. Missing triagers remain visible;
late results do not replace the incident cause. Closing intent clears no
hold. This commissioned failure exchange is distinct from marking-time
proof exchange.

### Legacy admission after the measured capacity ruling

Destination 17 keeps legacy admission because whole-scope adoption belongs
to a separate design item after R4 measures the deployment ceilings.
Ruling `393b3b99`, answering question `346de78c`, preserves the earlier
rulings and directs this correction. The question is retired; the slice's
promise remains active.

The first draft opted in although the request did not require it. Its
`native-current-capacity-20` run at `d5ed79283d` stored 196,027 bytes and
reserved 737,148,928 at actual Destination head 36; the next reservation
could not fit. A subsequent delivery-settlement design increased static
closure costs globally. These are compiled declarations, not runtime
usage or simultaneous-allocation measurements:

| Destination 15 at Main `8659af46` | Entries | Bytes |
|---|---:|---:|
| Publication | 1,831 | 549,978,112 |
| Branch | 588 | 154,140,672 |
| File publication | 676 | 177,209,344 |

| Destination 17 discarded draft at `41215939d5` | Entries | Bytes |
|---|---:|---:|
| Publication | 1,290 | 940,048,384 |
| Branch | 628 | 459,276,288 |
| File publication | 713 | 524,550,144 |
| Evidence request | 91 | 64,487,424 |

The second table is captured in `account-lifecycle-compiled-ledger-3`.
The first table is locally confirmed by `legacy-admission-baseline-1` at
`8fe7d39a2e`: D15's actual digest equals its registered historical pin,
and its entries and bytes match with and without a forced opt-in. The
forced rows are comparison-only clones. The same capture validates current
G17 with no capacity declaration; its publication owes 1,832 entries,
branch 628 and original eight-slot batch 1,210. These are declarations,
not a concurrent runtime measurement.
A delivery's retained source increases the largest pending-state amount,
which the compiler multiplies by coded-effect ceilings. Outcome-time
release would not reduce that initial admission term.

The draft's byte-only settlement chains, two-slot/sixteen-account profile,
full-set-before-push requirement, and N9 byte witness are removed. The
unvalidated final wire-cache draft and discarded source are retained under
`operator-inputs/discarded-byte-prototype-20261029`. No kernel extension,
new signer, global bound increase, or TIME pruning follows from this work.

Legacy admission enforces the 100,000-entry ceiling; items, records,
requests, and bytes have no global runtime ceiling for this Destination.
Per-entry limits and definition-specific counts still apply. Holders,
decisions, and bound requests reserve owed entries. The design's exact
count guards refuse check work before opening a job; a full list need not
prevent Git publication. Unknown and TIME remain pending under the ruled
index semantics. The five-concurrent-job Native witness remains owed.

Planner owns the follow-up "Destination adopts whole-scope capacity"
after R4's measured ceilings, with a separate contract design request if
outcome settlement is wanted.

## Decisions witness map

This is a static coverage map, not a Native pass list. Exact case-title
keys N1–N8 refer to `packages/scope/test/evidence-rules-real.test.ts`:

- **N1** `the real evidence cohort publishes a scoped mark, preserves unchanged generations and requires an admin beyond a customized publish action`
- **N2** `real admitted member work reuses its actual earlier pass, disables reuse on eligible disagreement and still admits a fresh job`
- **N3** `actual landing reuse follows the tree key and a fresh passed job still publishes after disagreement disables reuse`
- **N4** `observed room-key rotation refuses both keys for the frozen real work job and only an explicit new admission can count`
- **N5** `real published holds survive newer counted passes and clear only through distinct authorized transition and override records`
- **N6** `literal native TIME holds at its own head, replays unchanged, and recovers one funded incident within the pending bound`
- **N7** `the real failure and reservation outcomes serialize atomically in both admitted-before-failure and failure-before-admission schedules`
- **N8** `a cancelled same-tree landing needs a fresh room audit and disagreeing results refuse its actual retry`

Pure owners below are in `packages/platform/test/`:

- **P1**, `rules-policy-v13.test.ts`: `Q13 owns complete choices without changing omitted member/landing meaning or the old policy domain`.
- **P2**, that file: `audits compare fresh room runs under one configuration while published reuse and misplaced holds refuse`.
- **P3**, `evidence-index-v17.test.ts`: `retained records are owned and closed; another source or a second result for one job cannot replace provenance`.
- **P4**, that file: `key rotation preserves earlier candidates; one current predicate compares both outcomes and disagreement stays disabled`.
- **P5**, `evidence-holds-v17.test.ts`: `native publication and admitted-job order defeats duplicates, reordered failure, and an earlier pass`.
- **P6**, that file: `only a current eligible exact-key pass clears; override and transition remain their actual acts`.

All 19 Decisions retain an owning assertion:

1. Member cannot satisfy room: N4 and pure `reservation-v17.test.ts`
   rotation/eligibility cases; ordinary lane retention stays visible.
2. Omitted source remains Member: N2 and P1; old pins stay exact.
3. Audit disagreement refuses landing: N8 retains both results/head.
4. Different audit configuration refuses: P2, strict-policy boundary.
5. `every != 1` refuses: P2's explicit `every: 2`.
6. Canceled equal-tree retry gets fresh audit despite old pass: N8's
   distinct Room jobs. Its Member requests are fresh, not reused aliases.
7. Audit target cannot reuse: P2. Member parent reuse is valid;
   `evidence-progress-v17.test.ts` covers counted-job/logical-alias pairing.
8. Equal-tree reuse only: N3; N2 retains actual earlier work references.
9. Other source cannot supply reuse: N2 and P3.
10. Conflict disables reuse but fresh work lands: N2/N3 and P4.
11. Published reuse refuses: P2, not a Native publication claim.
12. Published failure opens incident/blocks affected landing: N5's actual
    publication/job/result/child and next refusal.
13. Late earlier pass cannot clear newer hold: N7's unchanged-policy
    ordering and P5. N5's changed-generation case alone cannot isolate order.
14. Other config/generation cannot clear: N5/P6; transition is not pass.
15. Atomic failure/admission order: N7 gates both journal schedules.
16. Duplicate/reordered failure preserves hold: N5/P5, original notices.
17. Closing incident/other intent clears nothing: N5 closes incident;
    N5 also closes an ordinary unrelated requester Issue.
18. Published timeout cannot clear: N5/N6 and pure hold/TIME cases;
    own-head state, replay and pre-recovery refusal stay separate.
19. Override clears as override: N5/P6 retain reason, key and release kind.

N4 uses separate pre-rotation jobs for first-deciding claims. N7 keeps
policy unchanged to isolate order. Both need owning acceptance. Decisions
4/5/7/11 use the cheaper pure owner.

## Evidence and current results

The durable provisional collection is
`/Users/hughpyle/play/artroom-evidence/2026-10-28-evidence-rules`.
The latest provisional copy remains open and unsealed. Final counts and
hashes belong to the sealed manifest. Receipts, source snapshots and streams
bind each run; earlier passes do not establish acceptance of the correction.

The retained attempts include failed dependency, wire, binding, compiler,
capacity and Native runs. The discarded byte-only profile and its partly
unvalidated optimizer are history, not final implementation or performance
evidence. Native N2 passed at an earlier head; N3 reached a real written
publication before byte admission blocked its next reservation. Current
legacy Source still needs its own acceptance. No package was installed.

The scenarios use actual lane journals and SQLite through their stated
boundaries. TEST host and token-provider wiring, manually signed Member
claims, and pure hook fixtures keep their stated limits. Positive physical
Runner evidence belongs to the separate marked-room witness.

### Final evidence table placeholder

Root will replace this row with actual command/checkpoint, exit, stream
digest, manifest and closed-gate analysis rows. No expected count, timing,
callback or digest is substituted for an observation.

| Check | Actual invocation and checkpoint | Exit and output digest | Qualification |
|---|---|---|---|
| Pending final assembly | Retained receipts and future closed ordinary gate | Pending | Preserve failed attempts and source-specific follow-ups. |

## Open acceptance and limits

Remaining Native work/reuse/rotation/landing/published/hold/audit scenarios,
physical marked-room J3, ordinary gate and exact-head review remain owed.
A partial assertion, skip or absent driver is not acceptance. Manual result
claims are real signed acts, not proof a Runner executed them. Stand-ins
retain their stated limits. No global cap or authority widening is implied.

Final evidence must bind exact source, complete retention, old pins,
all attempts, output digests and measured costs. Wall, host child CPU and
guest CPU differ; concurrent durations cannot sum to gate wall time.
Missing callbacks and skips need qualification. Seals detect changes,
not correctness. No hosted rollout, service deployment, physical drain,
provider, backup, device or remote CI success is claimed. Deployment follows exact-head review and landing; the planner owns rollout.
The user has already authorized deployments.
