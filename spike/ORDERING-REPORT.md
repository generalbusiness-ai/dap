# Ordering spike report

**Measured O6 candidate; repaired O4 and O6 await independent approval.**
The bootstrap meets goal 4's local fixture criterion. O4's executed transfer
and replay checks support goal 1 within its trusted-writer fixture. Independent
review of the earlier O4 candidate found four blockers despite passing tests;
K1–K4 correct participant-input handling, exception propagation, proof
availability and disclosure accounting. The current movable profile is `/3`,
with public-opening rule `/2`. Earlier failures and measurements remain at
their original sources. O2/O3/O5 was separately approved and landed; that
acceptance does not approve these O4/O6 changes.

The implemented profile uses one trusted writer and a local SQLite journal.
The evidence covers authenticated append, exact retry, named process-crash
schedules, planned writer handover and independent control logic. A newcomer
can join an existing context through a published signed envelope and a
small in-process route registry. None of these results supplies Byzantine
tolerance, production hosting or a user-comprehension study.

## Results against the goals

| Criterion | Finding |
|---|---|
| Goal 4: one process, one host, no external services; create and join a context | **Met within the O6 fixture.** One Node process creates a local SQLite journal from signed L and G, publishes their envelope, resolves its route, issues and redeems a signed invitation, verifies the view and recovers the same receipt after retry and reopen. |
| Goal 1: attach a package mid-stream and preserve all prior outcomes | **Supported for the executed O4 fixture.** Signed histories, prior outcomes, audiences and original Sale projections replay unchanged across attach, handover and completed transfer on memory and SQLite. This is not general migration or arbitrary composition. |
| Goal 2: agent authoring within the small repair budget | The visibility result is unchanged: Sale exceeded its budget; Club fails the original admission policy. Ordering does not repair either result. |
| Goal 3: newcomer comprehension from the screen | Not measured. The route is an executable fixture, with no production screen or user study. |

The [design goals][goals], [one-context bootstrap][bootstrap] and
[ordering acceptance criteria][ordering-plan] define these boundaries.

## Measured source boundaries

These are separate runs, with different inputs; their test totals must not
be added or presented as one fully passing final suite. A test can pass by
detecting a planted failure. An executing failing TODO preserves a negative
requirement even when Node exits zero.

| Work | Measured sources and outcomes | Corrections and boundary |
|---|---|---|
| O1 codec and journal | Full `747a0905`: 188 tests, 187 pass, one failing Club TODO; 600 seeds clean. Specification `43295693`: 11/11. V6 integration `9575c7c4`: 191 selected, 187 pass, four failing TODOs. G1/G2 `2c727b7d`: 202 selected, 198 pass, four failing TODOs. Typecheck passes at each boundary. | Earlier passing snapshots missed ownership bypasses. G1's head check now refuses stale raw and owned Context writes inside serialization; their own append/fold errors disable them. The final two runs exclude three campaigns and do not relabel the older full run. [Ledger][o1] |
| O2 concurrency, retry and admission | Focused `ea2b65e6`: 9/9. Integrated `d3ff5f1b`: 189 tests, 188 pass, one failing Club TODO; 600 visibility seeds clean; typecheck passes. | Three schedules submit 126 requests through six concurrent client processes per schedule: 78 new entries, 39 exact replays, nine changed-content refusals. No append or model change was needed. Participant removal is controlled at the admission interface because F0 has no removal event. [Ledger][o2] |
| O3 handover | Original `/2`: `3cdd1f3b` 69/70; `aae4051e` full 200 tests, 199 pass, one Club TODO, 600 seeds clean. `8756c233` 71/71 but typecheck fails; `acfe2522` 71/71 and typecheck passes. H1/H2 `/3`: aggregate `773a38ec` selects 325 tests, 321 pass, four Club TODOs, zero ordinary failures, but typecheck fails. | Original corrections were error wording and test typing. The later review exposes a real wrong-head proof and repeated full-prefix authentication. `/3` changes the protocol and caches verification. `713315d` changes only the malformed-test `Json[]` annotation; 12 handover tests and typecheck pass there, separately from the full run. [Ledger][ordering-integration] |
| O4 transfer lifecycle | Run 1 `ee86290f`: 98/100, two recorder failures. Run 2 `b35b267e`: 100/100 focused; full 315 tests, 311 pass, four Club TODOs; 600 seeds pass. Replay `faf26c07`: 6/6. G1/G2 `91941fa5`: 345 selected, 341 pass, four TODOs, including 122 O4 checks. `/3` `e8ccb2ef`: 124/124. K1–K4 `2ee1b43a`: 469 selected, 465 pass, four TODOs, including all 144 O4 checks. Typecheck passes at each boundary. | Run 8 retains 92 fresh observation files and regenerates scope identities under the revised rule and packages. The prior 600-seed result remains historical; no campaign repeated in run 8. Component failures and narrower follow-up checks remain separately recorded. [Ledger][o4] |
| O5 isolated control verifier | Original `462d7dec`: 53 pass, one runner failure; `ac563035`: 54/54, then test-cast typecheck failure. Full `/2` source `0a1daff7`: 256 tests, 255 pass, one Club TODO, 55 O5 checks and 600 seeds pass. Revised `/3` source `773a38ec`: all 86 O5 checks pass within its 325-test invocation. | Original repairs address permission-runner paths and typing. H1 additionally repairs exact-head verification and duplicate detection, expands 47 vectors to 76 and retains the accepted old `/2` attack. Real-journal and isolated-reader evidence remain separate from application semantics. [Ledger][o5] |
| O6 envelope and route | `/2` sources: `c75894b8` 2/2; `f9995e87` 371 selected/367 pass/four TODOs; `19b6d434` 402 selected/398 pass/four TODOs. `/3` `8c5598ff`: 2/2. K1–K4 integration `b6c7ab7a`: 2/2 bootstrap checks, typecheck and actual SQLite CLI pass. | The two combined `/2` runs exclude three campaigns. Runs 4–5 check only O6 and typecheck. The Sale-only bootstrap is unchanged and its fresh run-5 signed bytes match run 4, apart from PID and database path. The changed Scope/Inspection identities are separate. [Ledger][o6] |

Ratified checker report `7f5bacc3` approves exact aggregate
`936acce94e5cd024b0164fc6cd2af027f611545e`. Its independent `npm test`
reports 328 tests, 324 pass, zero ordinary failures and four Club TODOs;
typecheck passes. These are reviewer results, separate from the builder runs
above. An independent Python implementation of JCS and Ed25519 agrees with
all 76 vectors, the journal proof and 21 new attacks. The checker also tests
cache faults, live/cold equivalence and deliberate implementation mutations,
and reproduces the baseline/performance counters. Approval and its exact
workroom provenance are recorded with the [review limits][aggregate-review].
The approved tree landed as `6881b6a5a22584d534f2729002da0c582c97876a`.

Independent O4 review `10521cbe` reproduced 449 selected tests, 445 pass,
zero ordinary failures, four Club TODOs and passing typecheck at `edacc32d`.
It also reproduced the 124-check run and all 80 observations. It nevertheless
requested K1–K4 below. These reviewer results are separate from builder run 7
and repaired run 8; no passing suite alone establishes acceptance. [Review and repair provenance][o4]

O5 candidate `598170fa5907655bc48c346a2dd4dd98853314a8` contains
O3 `c527584d5399f20dff33625e20cb97d237bdad98`, O2
`b6d156163285c8eaab3d05766dd9b0de35fef79b`, O1
`c9fe7d5f6f5624dd6407d57ff213038c8e955e0c` and V6
`05c98e2d778124648834b9b00e772a6ad270a870`. Later ledger commits
retain outputs; measured source ids above identify the code actually run.
The initial O6 evidence commit is `416e70615982778ae54bdfa4827cb7c87a3e058e`.
Repaired O1/V6 candidate `4cfc69376fbd513c4cacf5baa0d32c316797cf89`
is incorporated in O4 candidate `7d9efba41747e3c3bbd19b32dc238f6b4444247b`.
The separate O2/O3/O5 integration `3dc6b0953f91661edcc059b56157d349ff31c5b1`
measured source `671400d8d44b661084918a2a70edb917662ec51e`: all 138
focused checks and typecheck passed, without another campaign. Its groups
are 62 core/lifecycle, nine O2, twelve O3 and 55 O5 checks. The later aggregate
`1ba67c39062ddf44508b14c0716817cfa9735964` incorporates O1 candidate
`aaa447d9e5ac4d88f07f144d46f2f5e63752c399`. At source `2a57bd2a`,
all 149 focused checks and typecheck pass: 73 core/lifecycle/freshness,
nine O2, twelve O3 and 55 O5. No campaign was repeated. [Integration record][ordering-integration]

O1's earlier ledger records why green runs were insufficient. Readable signed
views initially lacked actor proof bytes; two facades could hold inconsistent
admission folds; closing a facade or restoring a raw Context could bypass
ownership; and a direct Context append could commit a revocation, lose its
reply and keep serving stale authority. A corrected old-runtime harness
reproduced five ownership failures; a separate retained probe exposed the
direct lost-reply path after the first repair. Both were repaired with live
and cold regressions. Initial harness `DataCloneError` failures remain
identified as setup failures, not successful reproductions. [O1 correction record][o1]

The ratified second review `3d76d2b9` requested two further corrections.
**G1:** a raw Context could resume stale writes after a Journal closed on memory,
or remain active after its own lost reply. Wrappers bypass the backend-object
lease identity. **G2:** O4's former `activation_order` guard permanently
blocked activation after an intervening non-activate entry. That violated the
intended activation phase despite the measured healthy and retry traces.
The review also required O4 to propagate unrecognized exceptions instead of
turning every thrown message into a verdict reason. G1's old-runtime source
`c49e1c87` recorded three failures and the already-refused SQLite close case;
the repair checks the cached folded position and header hash against one
current head read inside serialization, before retry/admission. All Contexts
become inactive on a stale write or their own append/fold error. No history
scan is added, and an unchanged current raw Context remains usable.

Decision `c2982a6e` deliberately clarifies the design: otherwise admissible
intervening entries are allowed; dormant exercise stays ineffective; fresh
activation checks genesis-pinned inputs under ordinary authorization and
closed-context gates. Exact retry retains a failed receipt unchanged. This is
an explicit design refinement, not a change commissioned by the checker.
O1's revised specification names all completeness obligations; O4 supplies
the separate executing activation/error checks below. Exact workroom handles
and earlier run status remain in the [O6 record][o6].

## Goal 1: executed lifecycle and proof boundary

O4 uses four distinct signed contexts. S sells Alice's guitar; I records
Ivan's inspection result; D carries Kim's delivery responsibility; F joins
fulfilment and delivery. Attaching Inspection at S11 preserves the original
Sale positions 0–19. I's result affects S only on import at S20. The real
seal/assign/successor sequence is S21/22/23. Moving that writer changes no
right owner or context identity. [Executed expectations and scope][lifecycle]

| Boundary | Active rights |
|---|---|
| Before the sale decision | S/Alice holds `R_sell` |
| After S17, with D created | S/Alice holds `R_fulfil`; D/Kim holds `R_deliver` |
| After S24 releases, before D releases | Only D/Kim's delivery right remains active |
| After both releases, before activation | Neither transferred right has an active owner; F's declarations are dormant |
| Effective activation at F1 | F/Alice holds fulfilment and F/Kim delivery |
| After delivery F2 and fulfilment F3 | Both rights are spent |

The healthy trace progresses. Missing or withheld proof leaves rights dormant;
an admitted failed activation consumes a position and a later complete proof
may first activate at F2. Repeating activation, even with different valid
later-frontier proof material, has no further effect. An exact retry recovers
its original receipt. A timeout cannot restore source authority when F may
already have activated. These blocked cases are safety results, not an
availability guarantee.

Report QA exposed an initial replay-test gap, so O4 added a separate measured
follow-up. At `faf26c07`, each backend checks the actual S/F reader union
Alice, Bob, Carol, Ivan and Kim: 55 reader/base questions at 0–10 across
attach and completion, and 100 questions at 0–19 after S24/F3. Immediately
across attach it also checks all 13 fixture principals at 11 bases, or 143
questions. Exact signed histories, full-prefix outcomes, audiences and client
observations are compared before/after, then against a separate original Sale
replay. These overlapping question sets are not added into a unique-case count.

The first follow-up at `e11e334e` passed 4/6 tests: cross-fixture audience
arrays had different key/alias ordering. Sorting recipients for that
comparison fixed the test while exact signed before/after equality remains
required. The known late-Ivan client/full projection difference is preserved,
not erased. [Replay matrix evidence][o4-replay] contains synthetic full folds
and each reader's own history, including authorized private terms; those audit
records are not the public proof packets delivered to F. Run 5 repeats the
same matrix at the G1/G2 source; run 7 repeats it under `/3`. Each retains
its own signed observations; run 8 regenerates the matrix under K1–K4.

The combined K1–K4 lifecycle manifest is
`sha256:a766fe56564b026a96c37630d261512c0f608adf5ec7c5ee2d11aca23eaf45fe`;
the scope implementation is
`sha256:942f4d202400bcbb1d9fe8a008785acd4f7650112e9f775baaa3f711d5cb131e`.
The Scope package is
`sha256:0a3201eade9021c0898e20f41b3b4a16c2f6add3dea8a8ad3161cd7d83312572`;
the revised Inspection package is
`sha256:18a886c149b383b8630836307195c1a89b90c463e7e32df6e0663b5d4ecc3030`.
The fixed join policy is
`sha256:ac852ebab4f55816e55cd0fd71b7280267bffaca097046d4880b24ac63b01455`.
Historical `63be83e6` was corrected before the formal baseline, after an
O4 prototype already existed. Failed activation timing, malformed-genesis
rejections, `not_open` reason wording and authorization precedence were
explicit expectation corrections. They are not retroactive passes for the
old manifest. Runs 1–4 used manifest `fc55bfa1` and implementation `96f811a0`;
their signed packets must be replayed at their own source snapshots.
The later `/2` G1/G2 boundary used implementation `1090e6c7` and Scope
package `fd46665b`; none of those old packets is migrated to `/3`.
Run 7's `d94090b2` manifest, `f17f15a8` runtime and `edea788e` Scope package
also remain historical. New scope genesis/proof identities are generated
under K1–K4; the Sale package and fixed join policy remain unchanged.

Run 7's 209 materialized-genesis variants per backend produce no activation or
live F right: 30 `destination_mismatch`, five actual `unauthorized`, 154
recognized invalid-genesis, 18 malformed-codec and two unsupported-profile
rejections. Valid unauthorized variants preserve `authorized:false` before
destination checking; missing authority is not made a profile error. No
arbitrary exception counts as safe rejection. Run 7's 80 [observation records][o4-results]
retain actual states, receipts, signed genesis variants, proof bytes and
the wider historical matrices; run 2's 58 and run 5's 78 records remain intact.

The development evidence also preserves five real proof failures: extra
private fields and omitted attach, grant, revoke or withdrawal openings.
An omitted revocation restored close capability in replay; an omitted
withdrawal made a refused public-offer acceptance appear effective. These
failures showed why release replay needs complete authority openings. The
adopted completeness certificate closes that gap only under the trust stated below.
Another development defect let Scope spend a right despite an attached
handler's refusal; Scope now honors other handlers before replacing its own
legacy placeholder. [Development failures and repairs][o4-development]

G2 development source `a9aa702a` records 10 failures among 12 checks,
including the permanent activation block and swallowed post-commit error.
At `f8c774bd`, 40/42 checks pass; two audience fixtures did not invoke their
new policy because composition retained the existing kind's policy. The
fixture correction gives the throwing audience its own bound kind; no
production binding policy changes. Those two checks pass at `281664af`.

Formal run 5 then records, on both backends: missing-proof activation F1,
dormant exercise F2 and first effective activation F3; the original failed
retry remains failed even after success. Bob's admitted but unauthorized
observation at F1 permits Alice's activation at F2. Current revocation and
closed-context gates still block activation. That run tested explicit
scope/profile/proof refusals and selected registry/fold/audience faults.
K2 later exposed untested nested and cold-open paths that absorbed exceptions;
the passing G1/G2 checks did not establish complete propagation. Committed
bytes survive errors, and deterministic throwing handlers fail on strict
cold replay. [Historical G1/G2 results][o4-run5]

Run 7 at `e8ccb2ef` regenerates every context and proof under the new scope
identity and `/3`. It checks actual S21/S22 predecessor objects. On each
backend, a deliberately faulty writer supplies a signed proof that repeats
a real release commitment under another correctly signed header and a valid
completeness certificate. Verification and activation reject it; F stays
dormant and then activates once with a fresh honest proof. The full new
genesis and packet identities are recorded alongside the unchanged
209-mutation outcome distribution and 55/100/143 replay matrices. [Historical O4 run 7][o4-run7]

Independent review of that candidate then found four blockers:

| Finding | Adopted repair and measured boundary |
|---|---|
| K1: an ordinary member's null Inspection request permanently disabled scope replay | The Inspection audience is total for malformed JSON payloads. Participant-controlled malformed requests remain ineffective without poisoning later release, export or activation. The package identity changes. |
| K2: registry failures in nested export/proof interpretation became verdicts that disagreed with cold replay | Scope opts into strict foundation/view exception propagation, including create/open and all nested calls. The original thrown value escapes; the facade and held writer become unavailable. Healthy reopen and exact retry recover one committed activation. Ordinary legacy callers retain error verdicts. |
| K3: an actor-only failed attempt stranded an otherwise effective transfer by preventing certification | Rule `/2` permits hidden listed-kind entries only with the exact actor-only audience and a known, determinate ineffective source verdict. Effective, unknown or placeholder/error cases do not qualify. This extends the writer's classification responsibility, described below. |
| K4: the opened S20 admission carried private-request-derived Inspection content to F | The profile and manifest now name the delivered mandate and result, with actual Bob/Kim recipient observations. The chosen repair documents the disclosure; it does not narrow the proof or claim the information stayed private. |

The combined source `2ee1b43a` passes 469 selected tests: 465 pass, zero
ordinary failures and four retained executing Club TODOs, with all 144 O4
checks in that same invocation. Typecheck passes. Its 92 fresh observations
retain 20 healthy boundaries, 29 adverse cases and 209 materialized genesis
variants per backend, the unchanged 30/5/154/18/2 rejection distribution,
55/100/143 replay matrices, and the K1–K4 disclosure/error regressions.
The new S/I/D/F genesis and full-packet proof identities agree across
backends and are pinned in the run-8 record. Every one of the 120 activation
registry lookups is fault-injected on each backend:
all 240 original exceptions escape and healthy reopen/retry recovers exactly
one activation. This is bounded fault coverage, not a general proof that all
possible runtime errors are covered. No 600-seed campaign is repeated.
[Combined O4 measurement][o4-run8]

Component evidence remains separate: K2's 22-check focused run; K4's 15
manifest/disclosure checks; and K3's 47/49 refined run followed by two
corrected setup checks at a later source. K3's initial codec setup failures
are retained, not relabelled as a single passing 49-test run. Run 8 is the
subsequent combined validation. Fresh independent O4 approval is still pending.

## Goal 4: actual creation and joining

The [fixture source][o6-source] signs L before G exists. L describes the
guitar and route and contains no genesis reference. G adopts that exact
listing body; Journal creation also requires and retains L's original
actor envelope. Only then does the fixture publish canonical `{L,G,route}`
bytes naming this existing context. The route resolves to that journal;
it does not create a new context or authorize a different genesis.

The newcomer uses Bob's fixture principal. Alice issues
an actual signed invitation through ordinary journal admission. The client
verifies the delivered invitation and header prefix, then signs its own
redemption using the published genesis and invitation proof. The existing
foundation admits it once. Signature verification and interpretation are
separate checks; both complete successfully.

| Position | Recorded event |
|---:|---|
| 0 | Signed `/3` G, context `sha256:080afaa386822dba15e5f694e16c554cf305ff06f031df9709b8a01935b1503c` |
| 1 | Adopted signed L, commitment `sha256:1a2a4d30944bc14b399a54f9c19419201730d6874aed4c4fcb5c697fccca1fd6` |
| 2 | Alice's invitation addressed to the newcomer |
| 3 | Newcomer's effective redemption; Alice and Bob are participants |

The published route is `fixture:ordering-o6/guitar`. The append, immediate
retry and reopened retry return the same receipt hash,
`sha256:c6e06aeedc59bac6120eaba9d463ea2ffe3d3d76a520e08a15167a8c4daf91e6`.
After reopen, the verified view is unchanged and there are still four
entries and four pending outbox records. The [actual CLI output][o6-demo]
retains every signature, exact envelope byte string, receipt and verified
view. It was produced in one process with a local SQLite file, without
external services. Runs 1–3 retain the old `/2` context and receipt; run 4
generates `/3` G and descendants anew. Run 5 freshly executes the unchanged
Sale-only bootstrap on the K1–K4 runtime, reproducing run 4's signed bytes;
only process id and database path differ. It does not select the changed
Scope or Inspection package. The signed standalone L and route are unchanged.

From measured source `b6c7ab7a` in its `spike/` directory, reproduce with:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node test/fixtures/o6-bootstrap.ts /absolute/path/to/new-journal.db
```

The database path must be new. The fixture retains it for inspection.
The [negative test][o6-tests] rejects malformed and noncanonical envelopes,
forged or unadopted L, mismatched routes, a different signed G, unavailable
routes and registration against the wrong journal, before issuing an
invitation or changing the initial two-entry journal.

This is explicit fixture routing using direct calls. It is not HTTP, DNS,
durable discovery, an authenticated transport or production onboarding.
It pins the published genesis and writer after trusting the publication's
author; signatures do not establish a real-world identity. The deterministic
keys are test keys. Reopen re-registers the same envelope. It is a normal
close/reopen, not a new crash experiment, and outbox publication is not
delivered to an external service.

## Authority, evidence and failure limits

The movable `/3` profile separates the writer from its control key. Both
seal and assign actor envelopes require that control key; the retiring
writer records them and signs both headers. Each actor-signed predecessor
is exactly `{position, headerHash}`, naming the current head for seal and
the seal head for assign. Journal, view and independent proof verification
reject repeated commitments, including hidden positions. An exact retry
still refers to one original position. Old movable `/2` is unsupported at
this boundary; fixed `/1` wire vectors remain unchanged. A request or application grant
cannot install a successor. Between seal and assign, application work is
blocked. The same genesis, positions, prefix and saved retries survive the
planned move. These bounded checks do not fence a malicious old writer
using a copied database, select a winner after equivocation, or implement
automatic failover. Concretely, the control key can sign two assignments for
the same sealed head, each valid on a separate copy. Identical controls also
remain valid on byte-identical copies. Assignment uniqueness is per journal,
not fork prevention; racing SQLite processes may both lose access to the lock.

O5's control logic is independent of O3's transition algorithm and runs in
a permission-isolated subprocess without application code. Accepted inputs
contain no later ordinary payloads; one isolated boundary vector deliberately
supplies an ordinary opening and is rejected. It shares the canonical codec
and Ed25519 implementation. Its
86 checks include 76 declared proof cases, history and boundary comparisons,
exact-control-byte relocation and permission-isolated vector/real-journal
checks. They are not 86 independent verifier implementations.

H1's retained old-runtime proof repeated commitment C, inserted another
entry and relocated the same control-signed seal to a later position; `/2`
accepted it. The revised cases reject that attack and relocation between
otherwise unique histories with different predecessor position or ancestry.
The original acceptance, old 47 vectors, four failing aggregate regressions
and later test-typecheck failure remain recorded. [H1 correction][o5]

**Control verification assumes every control opening is supplied.** The
opaque header contains no kind. A retained counterexample rejects a visible
seal followed by an old-writer entry but accepts the same signed headers
when that seal's opening is hidden. Thus this interface cannot establish
complete delivery. Conflicting signed histories are evidence of
equivocation, not tolerance, freshness, availability or fork choice.
[O5 limits and actual journal proof][o5]

H2 fully authenticates create/open, then retains a verified head, ordering
state, commitments and control positions. Live append checks the current
head, next header and commitment uniqueness; the cache advances only after
the serialized transaction commits. Unexpected tails and uncertain/error
states require reopen. It does not reauthenticate older rows on each append:
rewriting an older stored row under an unchanged head can go undetected live,
while cold open rejects it. This retains O1's trusted-storage boundary.
The live duplicate-commitment guard throws and disables the facade without
appending; it does not return an ordinary refusal. Fixed `/1` omits the
ordering-admission hook. The
retained sets use O(n) memory with expected constant-time membership checks;
existing Context row copying/folding still grows with history. Scope's full
semantic proof replay is also unchanged. This is bounded added authentication
work, not constant total append cost. [Cache contract][profile]

At `773a38ec`, the independent ordinary-offer benchmark counts exactly two
signature verifications per append for fixed `/1` and movable `/3` on both
stores at 100, 400 and 1,000 entries. The reviewed aggregate averages 2,022
at the 1,000-entry, 20-offer window. The repaired path still makes two history
reads returning `2n + 2` logical rows for an append starting with n entries.
Timings are single sequential samples on a shared host with unequal load,
not a statistical speedup or latency guarantee. The benchmark measures
ordinary offers, not control operations or reopen. [H2 evidence][h2]

The checker separately measured two verifications for a seal or assign at
1,020 entries. Cold SQLite reopen remained slow and grew faster than linearly
in that review's samples, at roughly three seconds for 1,020 entries. A raw
restore reusing a closed Journal's encoding after another append is now
refused, strengthening the earlier baseline. That review identified three
small follow-ups: qualifying the cache getter comment, updating the foundation
profile type union and documenting the benchmark's `SOURCE` prerequisite.
The K1–K4 input fixes the type union to current `/3` and adds the README
prerequisite. The cached older-row limitation above remains a trust boundary.
[Original independent findings][aggregate-review]

SQLite commits entry, head, exact retry, invitation consumption and outbox
record in one transaction. Named O1–O3 SIGKILL schedules exercise process
crashes around those boundaries, notification and control handover.
Durability means an acknowledged append survives application-process crash
and restart on the same host with intact local disk. It excludes power,
host or disk loss, corruption, malicious rollback and unreliable filesystem
locking. Outbox delivery is at least once: acknowledgment loss can repeat
the same saved bytes. The lease guards one live Journal facade per identical
backend object and G1 checks each write's folded head inside serialization.
Proxy/delegating wrappers, aliases, direct backend mutation and malicious
in-process code remain outside that cooperative promise. Raw restoration
without an encoding is an unsigned semantic path; authenticated Journal.open
rejects its unsigned entries. This is not distributed consensus. [Profile][profile]

Public `activation` and `requires` pointers reveal bound-application and
attach classes even when the exact kind is hidden. Recipient verification
authenticates the supplied prefix and readable envelopes; it cannot establish
that entitled openings or the latest head were supplied, and unchecked extra
`ViewEntry` metadata is not signed evidence.

O4's `dap.fixture.scope/1` deliberately extends the fixture with founding
participants and a serving-party completeness assertion. A scope-bearing
genesis opts into shared-foundation setup/founder semantics even through
plain Journal; full transfer and proof validation remains a ScopeJournal
facade contract. Its revised `dap.fixture.scope-public-openings/2` rule,
`sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c`,
opens 21 exact authority kinds with assigned spine/members audiences. A
listed-kind entry can instead stay hidden only if its assigned audience is
exactly `named:[actor]` and the source has a known, determinate ineffective
verdict. Unknown, placeholder and error outcomes are excluded, including
per-model diagnostics; an effective authority body with a narrow audience
still prevents certification. Other kinds remain hidden. The writer signs
the rule, source, frontier and hash of the exact canonical proof packet
excluding the certificate itself. The key must be the signer of the frontier
header: the retiring writer through assignment, the successor after
it. F pins each source and export prefix p from its own genesis, requires
release r=p+1 and a certificate covering r, and independently replays grants,
models and release effectiveness through r. The certificate attests opening
completeness and the allowed hidden-failure classification, not release effect. [Exact profile and checks][profile]

**A dishonest writer can still sign an incomplete or tailored projection.**
The destination cannot detect that completeness lie from opaque headers,
nor independently confirm the writer's classification of a hidden actor-only
attempt as ineffective. Source members with the relevant openings can
recompute the rule and compare signed packets; an ordinary member may lack
another actor's hidden attempt. Release effect still requires independent
replay of the supplied authority evidence. Retired keys remain trusted for
their historical prefixes; forks and database copies remain possible. This
is additional serving trust, not a cryptographic proof of completeness.
The same signed F genesis can activate on separate journal copies, each with
live rights: a release binds one genesis identity, not a globally unique
physical instance. An authorized source owner can also release after ordinary
source `dap.close`; destination activation still enforces its own close gate.

The proof also explicitly discloses source spine/member authority bodies to
every F spine reader. Carol's participation and o2 stub reach Kim, who was
not an S member. This is counted under the existing subject-to-disclosure
clause; the original audience is not claimed unchanged. S20 also embeds I's
whole signed proof, exposing the mandate `{source: S, prefix: 14, offer: o2,
inspector: ivan}`, I's founding participant Ivan, and result `pass:o2`. S resolves to the
actual Sale genesis. S14 was readable only by Alice, Carol and Ivan. Bob
already learns the derived content through S20's members audience; Kim and
every F spine reader learn it through F1. Actual live/cold views on both
backends verify those disclosures.

The S14 request body and explicit requester attribution are absent from the
carried proof. This does not hide the request's subject, inspector, position
or result, or establish requester anonymity: Carol's disclosed offer stub and
membership permit linkage or inference. Sale amounts, terms and counters
remain absent from delivered proof/activation/F-view bytes. Full audit
observations deliberately retain source-private inputs and are not those
recipient deliveries. Hostile clients can still publish private data through
general payloads; these checks are not a disclosure prevention mechanism.
[Disclosure budget and recipients][lifecycle]

## Integration and visibility limits

All cited 600-seed campaigns use the legacy visibility path. They do not
represent 600 signed SQLite, handover or transfer traces. O1 signs the
selected V1 traces; O5 additionally consumes an actual signed journal
handover. The ordering spike does not establish arbitrary view consistency
or application-policy correctness.

The [V6 report][visibility] preserves Sale's seven recorded repairs, six
semantic against a budget of two, and Club's narrower-manifest success
despite original A1/A5 admission failures. O4 and O6 include the approved
visibility-evidence follow-up `d95e097b1d38a5242754922fe4c8b977462f5555`,
landed as `aa3dc03c57c2a54dbfcfa42659c2a14d52fbd27d`, which adds three
executing A5 TODOs alongside A1 and direct committed-corpus replay. It
changes evidence, not Club's policy. No ordering pass reverses those
negative results or commissions a new Club privacy experiment.

O6's earlier integration retained O4's exact Journal bytes when resolving
a two-blank-line conflict. Its combined source
`f9995e8761f23bbf0e71f004b29199c05ee35663`
produced 371 selected tests, 367 passes and four executing Club TODOs. The CLI's signed output is identical
to run 1 except for process id and database path. [Combined measurements][o6-run2]
That source remains evidence before the G1/G2 repairs.

The earlier G1/G2 `/2` integration combined O4 candidate
`2b48c4c4484ecd722aa891cd6efa5362121c0f6e` and aggregate
`1ba67c39062ddf44508b14c0716817cfa9735964`. The sole new conflict was
appended profile prose; its resolution retained O4's exact document. Runtime
then equalled that O4 input plus the unchanged O5 verifier. O4 wrapper
`d4decf8f6e1d67f02c711bfb67ff772ecbf069bf` also entered that integration;
its source `ca2d105d` passed 55 O5 checks and typecheck with O4 inputs unchanged.
O6 source `19b6d4346fcb13d33e71ee3d2fbdbb780c44ee67` passed 398 of
402 selected tests with zero ordinary failures and four retained Club TODOs.
Typecheck and SQLite CLI passed; signed output equalled run 1 except for PID
and database path. [Historical combined measurements][o6-run3]
Only records/report changes followed before candidate `4214fa36`. H1/H2 then
changed the runtime and wire contract in a new experiment boundary. The
builder's last full 600-seed measurement remains O4 `b35b267e`, before G1/G2 and H1/H2;
it is not a campaign result for the current source.

Earlier `/3` O6 source `8c5598ff79c017067ae5eed117ad6d0c05f46400`
integrates O4's frozen `e8ccb2ef` source without a conflict or runtime edit.
Both bootstrap checks, whole-tree typecheck and the new SQLite CLI pass.
[Historical O6 run 4][o6-run4] does not repeat the O4 or aggregate suites;
their exact-source records remain separate. The O4 run-7 results
are now retained in O4 candidate `edacc32db1495504d10ae7a92f02af272e49e9f2`,
including the aggregate's final evidence. That final merge changes only
records; all 83 O4 runtime/test/fixture/manifest blobs still equal `e8ccb2ef`.
It adds no basis for repeating O4 or the O6 bootstrap. The separate aggregate
approval above does not establish O4/O6 acceptance or landing.

The K1–K4 O6 source `b6c7ab7a2f93d3c0393143bf19cbbbe4746dc21d`
integrates frozen O4 `2ee1b43a` cleanly, without changing runtime or fixture
bytes. Its two bootstrap checks, whole-tree typecheck and new SQLite CLI
pass. [O6 run 5][o6-run5] measures the ordinary bootstrap separately from
O4's combined run 8; no redundant O4 or campaign suite ran here. The former
22 early artifacts at `4be9b2c` remain historical and cannot represent this
successor head. Final O4 evidence candidate `e0467ae9c44d99e10f38916b74f047b4e9183c5c`
is incorporated without runtime changes; all 88 measured O4 blobs and
92 observation hashes match locally. Old O6 run-1 through run-4 files and
the bootstrap source remain byte-identical. Independent O4/O6 approval and
landing remain pending.

[goals]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-evolving-spaces-design.md#L80-L107
[bootstrap]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-evolving-spaces-design.md#L537-L573
[ordering-plan]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-ordering.md#L411-L468
[o1]: https://github.com/generalbusiness-ai/dap/blob/aaa447d9e5ac4d88f07f144d46f2f5e63752c399/spike/manifests/ordering-o1.ledger.md
[o2]: https://github.com/generalbusiness-ai/dap/blob/b6d156163285c8eaab3d05766dd9b0de35fef79b/spike/manifests/ordering-o2.ledger.md
[o3]: https://github.com/generalbusiness-ai/dap/blob/c527584d5399f20dff33625e20cb97d237bdad98/spike/manifests/ordering-o3.ledger.md
[o5]: https://github.com/generalbusiness-ai/dap/blob/936acce94e5cd024b0164fc6cd2af027f611545e/spike/manifests/ordering-o5.ledger.md
[profile]: https://github.com/generalbusiness-ai/dap/blob/2ee1b43a9fc7c3af2b99d991f36d78a4dbcde443/spike/ordering-profile.md
[o6]: https://github.com/generalbusiness-ai/dap/blob/5394ec84c9a55a478a87b80cb9125fde7402e3c4/spike/manifests/ordering-o6.ledger.md
[o6-source]: https://github.com/generalbusiness-ai/dap/blob/b6c7ab7a2f93d3c0393143bf19cbbbe4746dc21d/spike/test/fixtures/o6-bootstrap.ts
[o6-tests]: https://github.com/generalbusiness-ai/dap/blob/b6c7ab7a2f93d3c0393143bf19cbbbe4746dc21d/spike/test/ordering-bootstrap.test.ts
[o6-demo]: https://github.com/generalbusiness-ai/dap/blob/7854aa0f9073e8e02fcb5ee7d9cad3b7e7414296/spike/manifests/ordering-o6-runs/run-5-demo.json
[visibility]: https://github.com/generalbusiness-ai/dap/blob/d95e097b1d38a5242754922fe4c8b977462f5555/spike/REPORT.md
[o4]: https://github.com/generalbusiness-ai/dap/blob/e0467ae9c44d99e10f38916b74f047b4e9183c5c/spike/manifests/ordering-o4.ledger.md
[o4-results]: https://github.com/generalbusiness-ai/dap/tree/edacc32db1495504d10ae7a92f02af272e49e9f2/spike/manifests/ordering-o4-runs/run-7-observations
[o4-development]: https://github.com/generalbusiness-ai/dap/blob/2b48c4c4484ecd722aa891cd6efa5362121c0f6e/spike/corpus/ordering-o4/development/README.md
[lifecycle]: https://github.com/generalbusiness-ai/dap/blob/2ee1b43a9fc7c3af2b99d991f36d78a4dbcde443/spike/manifests/ordering-lifecycle.md
[ordering-integration]: https://github.com/generalbusiness-ai/dap/blob/edacc32db1495504d10ae7a92f02af272e49e9f2/spike/manifests/ordering-integration.ledger.md
[o4-replay]: https://github.com/generalbusiness-ai/dap/blob/4ea7d966cc44fc2641e4f99516403bb46d50ba7f/spike/manifests/ordering-o4-runs/run-4.json
[o6-run2]: https://github.com/generalbusiness-ai/dap/blob/eca816033530c04379bde487bd3b2b016b1f2045/spike/manifests/ordering-o6-runs/run-2.json
[o4-run5]: https://github.com/generalbusiness-ai/dap/blob/2b48c4c4484ecd722aa891cd6efa5362121c0f6e/spike/manifests/ordering-o4-runs/run-5.json
[o6-run3]: https://github.com/generalbusiness-ai/dap/blob/6aced80b5525d6ba22f2cc42ead0c41795428324/spike/manifests/ordering-o6-runs/run-3.json
[o6-run4]: https://github.com/generalbusiness-ai/dap/blob/da4f9dcb529eb21a21b629fc0deb3497aaccb4e6/spike/manifests/ordering-o6-runs/run-4.json
[o4-run7]: https://github.com/generalbusiness-ai/dap/blob/edacc32db1495504d10ae7a92f02af272e49e9f2/spike/manifests/ordering-o4-runs/run-7.json
[h2]: https://github.com/generalbusiness-ai/dap/blob/edacc32db1495504d10ae7a92f02af272e49e9f2/spike/manifests/ordering-integration-runs/h2-benchmark/comparison-summary.md
[aggregate-review]: https://github.com/generalbusiness-ai/dap/blob/edfd881308ffd961b6cbaf7d7f6a7090aa91150f/spike/manifests/ordering-o6.ledger.md#independent-aggregate-approval
[o6-run5]: https://github.com/generalbusiness-ai/dap/blob/7854aa0f9073e8e02fcb5ee7d9cad3b7e7414296/spike/manifests/ordering-o6-runs/run-5.json
[o4-run8]: https://github.com/generalbusiness-ai/dap/blob/e0467ae9c44d99e10f38916b74f047b4e9183c5c/spike/manifests/ordering-o4-runs/run-8.json
