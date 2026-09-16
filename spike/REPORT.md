# Visibility spike report

**Historical V6 was independently approved in review #1805 at
`05c98e2d778124648834b9b00e772a6ad270a870` and landed as main
`19af1c8fb46cc91c61a2027647f04a6f305b5cdc`.** Club's original admission
policy remains a negative result. This follow-up corrects the report's
scope and adds measured evidence; independent review of this follow-up
is still required.

The small-repair claim did not hold: **Sale required six semantic repairs
against a budget of two. Club does not meet the original admission policy.**
The repaired Sale and Booking implementations show useful agreement across
partial views within their revised, bounded experiments. Agreement alone
did not establish the business promises or privacy budgets.

Hugh chose to retain Club's negative result for V6, without commissioning
a revised Club experiment or changing its privacy promise. That instruction
is recorded in workroom assert
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:bdcfbdc00e9861fb9f8e9b3d21f3104796d8be93`.
The [decision record][club-decision] preserves that choice and the
uncommissioned alternatives.

## Findings against the goals

| Criterion | Finding |
|---|---|
| Goal 1: evolvability | Integrated deterministic tests support the criterion of attaching a package mid-stream while preserving prior outcomes, with bounded activation, replay, dependency pause/resume and binding locality. All three historical V6 binding cases pass. This does not establish state migration or arbitrary model composition. |
| Goal 2: ease of programming as an agent | **Not met.** Sale exceeds the repair budget; Club's smaller count applies to an incomplete policy. Landed Booking is within its model budget but includes revised guards and a separate foundation repair. |
| Predeclared falsification: repair budget | **Falsified by Sale.** Six semantic repairs exceed the two-fix budget. |
| Predeclared falsification: widening every audience until everyone sees everything | **Not observed in the bounded repaired Sale and Booking results.** They retain private audiences and pass their revised checks without making every event public. Club's original policy still fails, so this is not a successful three-model demonstration or a proof about every possible model. |

These are the [design's goal criteria][goals] and the [views note's explicit
falsification condition][falsification]. Goal 3, **comprehension simplicity
for a person**, asks whether a newcomer can answer from the screen what
the context is about, what they can do and what they cannot see and why.
The narrative provides an inspection, not a user trial. Goal 4,
**lightweight decentralization**, requires one process on one host with no
external services, including context creation and joining in the ordering
fixture. That criterion belongs to the ordering spike and is not measured
by this visibility report.

## Exact source results

Counts in this table belong to different input trees and must not be added
into a combined test total. A passing detection test may deliberately
contain a privacy violation; it establishes detection, not safe delivery.

| Model and source | Review/validation status | Model repair budget |
|---|---|---|
| [Sale at `009b5226`][sale] | Approved in workroom review #520; 88 tests pass, including 200/200 seeds under the corrected guard. Landed as main `7bd311f221c62615c55b659f0a693e42db887fba`, with the same tree. | **7 recorded fixes, 6 semantic; 0 added kinds. Over budget: 2 fixes, 1 kind.** Fix 6 is recorded robustness work, not a semantic fix. |
| [Booking at `127af627`][booking] | Approved in workroom review #1017; checker reproduced 110 passing tests, including Booking and Sale campaigns, each 200/200, and typecheck. Main merge `5eff67d81fbbb025f91951571a9f029c0481812a` has the same tree. A historical corpus file retains an EOF blank line. | **2 model fixes, 0 added kinds; within the 2-fix, 1-kind budget.** Foundation authorization/audience repair is separate. |
| [Club evidence `772a514`][club] | Original acceptance fails. Latest non-campaign validation: 96 pass and 1 failing TODO among 97 tests. The prior validation-run-3 campaign passed 200/200 under the unchanged, narrower manifest. | **1 fix, 0 added kinds.** One standing/vote-related fix, zero quorum fixes; below the per-constraint limit but not a successful implementation of the required policy. |

V3 approval is exact event
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:87c360f4e940f5a6c6e1c084c0c1ffc08f7d6f31`.
It approves the reported overrun and disclosed trace reproduction; it does
not change the authoring budget. The [counting convention][counting]
counts semantic repairs regardless of which agent found or implemented them.
Sale's and Booking's original split kinds were predeclared, not added kinds.

V4 approval is exact event
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1def477d5a5f2df385b71c0c94ce0e0532f9c8fb`.
It accepts the corrected experiment with the stated limits, including the
key-based payload guard and client disclosure policy.

V6 approval is exact event
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1998582d8f1d14adfeca07b170f392f517b0dbdb`
(review #1805). It approves the historical candidate and accurate negative
result at `05c98e2d778124648834b9b00e772a6ad270a870`, with six nonblocking
follow-ups. Main `19af1c8fb46cc91c61a2027647f04a6f305b5cdc` is the landing
wrapper. This approval does not cover later follow-up changes or turn the
retained Club acceptance failure into a pass.

## What changed during measurement

The plan makes a post-baseline manifest change a **new experiment**.
Later passing results cannot be substituted for the original frozen
conditions. The ledgers retain the revisions and cumulative repair history.

| Model | First recorded campaign and later findings | Experiment boundary |
|---|---|---|
| Sale | 17/200 failures in the first recorded campaign, which already included the builder's counter correction. A readable-event guard exposed 100/200 disclosure failures; 60/200 later failures exposed unbound private events in the foundation. Correcting the guard's effective-stub test exposed another 9/200, then Fix 7 prevented those deliveries. | Four post-baseline manifest revisions: counter/fixture corrections; readable-event privacy; required readable-view argument; effective-stub party check. The untouched baseline is not the first campaign's package. |
| Booking | Baseline 200/200 passed a projection-only guard. Reading actual payload visibility exposed 139/200 failing seeds. Checking public actors and private fields later exposed 99/200 before repair. | Three post-baseline revisions: readable-event budget; public-event budget; removal of a spoofable claimed-booker exemption. Earlier passes do not establish the corrected budget. |
| Club | The corrected replay stream exposed 3/200 baseline failures; the repaired model passed its narrower manifest. Original-policy counterexamples remain. | No manifest revision adopted. A1 was omitted before baseline; A2's dedicated ordinary-member tests were added afterward. Neither fact can be repaired retrospectively by calling the existing manifest complete. |

The [Sale ledger][sale-revisions], [Booking ledger][booking-revisions] and
[Club provenance record][club-provenance] identify these boundaries. Club's
original pre-replay-fix tree produced 196/200 failures according to checker
#512; the three-failure result belongs to the corrected generator stream.

The exact identities used by the latest source results are:

| Model | Manifest | Repaired package |
|---|---|---|
| Sale | `sha256:2377e5df338aaa854a56540092bf286aab0ef2dceb563dff6a0fcbdb4633aec9` | `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85` |
| Booking | `sha256:cb4514f4967891077ad78e1dd0fba4c17438fb32b98cd8bd790df8531b35dd16` | `sha256:0556de5c337344eaa15afcbbbf5d22aa82c384bd6841d4ffb0c07185d4b7ec27` |
| Club | `sha256:806ae62febaa0b28f35fcc7099bcb00db73a61d0921806c911e993b6db808fde` | `sha256:ef19bdaf2a70813266ab7e490ac3759580df0613efc382bef8bf5b4a96523f4e` |

Original Sale manifest:
`sha256:4123f7b5f8610fd09ca5042a169b57fff8756dc6d0089ac2196ecdf7c42ac52b`.
Original Booking manifest:
`sha256:8dc4524c99d2e7c17d1bdd7c12fa2679db83596a3176e580cc298a0f10b82bf3`.
Club's manifest is unchanged. Model and manifest ids do not identify the
whole experiment: runtime, foundation, generator and client behavior matter.

## Coverage and the mechanisms it required

Each model campaign uses seeds 1–200, at most six participants and a
60-position generation bound. Club's declared grant effect adds a grant
after an effective admit outside that bound. Discussion is a deterministic
worked example, not a fourth 200-seed authoring trial.

| Campaign boundary | Recorded coverage |
|---|---|
| Sale, approved V3 tree | 11,171 entries; 273 stubs, 18 effective accepts; 120 unbound Inspection requests; zero Inspection attaches and zero private disclosures. |
| Sale, landed V4 integration | 11,047 entries; 195 offers, 20 effective accepts; 118 unbound Inspection requests; still zero Inspection attaches and zero private disclosures. |
| Booking, landed V4 run 9 | 12,000 entries; 2,555 requests; 652 effective occupancies, 472 linked to earlier effective requests; 325 effective cancels; 1,630 clock ticks. |
| Club, historical validation run 3 | 11,939 entries; 629 applications; 1,001 effective votes; 126 effective admits and their grant effects; 1,939 disclosures. This is not an A1/A5 acceptance pass. |

The [V4 integration record][booking-integration] supplies the changed Sale
coverage; the [V3 record][sale-result] remains historical. Deterministic
nonce generation repaired reference replay but also consumed random values
and changed choices for all 200 Sale seeds. Booking's earlier cancel
coverage was vacuous: replayed requests had different ids. The supported
figures are 325 cancels and 472 linked occupancies, not the earlier 323/489.
The attached Inspection model is exercised by handwritten Sale cases, not
the generated campaign.

Three recurring costs were visible:

- **Late readers need public history.** Sale discloses effective stubs,
  withdrawals and accepts on join. Booking's baseline already discloses
  occupancies, frees and clock ticks. Club discloses votes, admits,
  standing and disclosure records; late committee members separately need
  the private application. The literal Sale trace fails without its added
  backlog: five violations, first at Ivan's position 15. The disclosed
  reproduction passes.
- **Refusal does not undo delivery.** Sale's final counter audience reads
  the effective public stub's author from preceding model state. Booking
  requires authorized-only client disclosure, alongside the foundation's
  actor-only initial delivery for attempts lacking the required capability.
  Authorized overlap or duplicate refusals retain their declared audience.
- **Runtime work is additional to model counts.** Audience-error rollback,
  declared preceding-state access, reproducible references, role-derived
  audiences and disclosure/grant hooks were harness repairs or additions.
  Club also made disclosure acts members-visible, changing other models'
  readable history without changing their package ids. This cost is not
  evidence of effortless model authoring.

The state-reading audience API exposes the serving fold's preceding state
of its declared models, which may contain private facts. Each client
replays with its own state. It does not automatically guarantee that every
possible audience program preserves information boundaries; Sale uses it
for the public stub author. The [V3 runtime record][sale-result] and
[Club harness record][club-provenance] identify these dependencies.

## Agreement, policy truth and privacy

Club A1 demonstrates the distinction directly: Dana's second application
is admitted after Member was granted, and every view agrees. A5 permits
votes and admission on a non-application or ineffective apply id, then the
effect executor selects that entry's actor. Its invariant detects A5,
but the generator does not create those targets. The failing TODO asserts
the correct A1 expectation; a green test-suite exit must not be described
as passing that policy test. The later A2 tests add Frank, an ordinary
Member who cannot read the application, and verify both voting around
disclosure and admission/grant visibility. Those passes are post-baseline
verification, not original predeclarations. [Club findings and corrections][club-negative]

Privacy is measured on what a participant can **read**, as well as the
projection. A hidden display field does not protect a delivered payload.
The revised guards exposed that mistake repeatedly. However, the final
generated results still have important limits:

- Booking's authorized admin or clock can publish extra private fields.
  The nine hostile-field tests detect those violations; no schema or
  admission rule prevents them. The guard recognizes exact `booker` and
  `purpose` keys; renamed keys, case variations and string encodings fall
  outside it. Revoked Bookers are absent from its later actor guard.
  Different admins on request and cancel remain outside the generated
  domain. [Booking limits][booking]
- Club accepts extra private fields in public application kinds without
  the current budget flagging them. Revocation is not generated, and its
  current-holder budget can falsely treat a former committee member's
  previously read application as a new leak. [Club scope][club-scope]
- Client disclosure policies constrain the exercised clients. A literal
  hostile disclosure can still violate privacy under a repaired model.
  The foundation lets a `dap.disclose` holder disclose a position they
  cannot themselves read; the fixture's disclosure policy is essential.
  Missing model-level history can produce a reported mismatch instead of
  a pause; dependency pauses cover activation and attach evidence, not
  every business precondition.

No revised Club privacy, eligibility authority or public application
schema is adopted to change these results.

## Reproducibility and protocol limits

| Preserved corpus | Boundary and limit |
|---|---|
| Sale run 1: 17 cases; run 6: 9 cases | Original records retained. Run 1 deliberately uses its historical projection-only guard. All nine run-6 failures reproduce with the old foundation at `009b5226`; the newer foundation already prevents six unauthorized leaks, while three authorized leaks still fail under the kept model. |
| Booking run 2: 139 cases | Recovered from historical model/generator choices, not the original random-nonce bytes. Literal private disclosures remain violations even after the client policy repair. |
| Booking run 7: 99 cases | Full seeds and shrunk privacy failures retained. Exact pre-repair boundary is `7ffa50814ec558781feeeae09b36ff8f089c2fb4`; the full records preserve request-id links that shrinking can remove. |
| Club run 1: 3 cases | Reconstructed from the committed baseline, with reference remapping and deletion-minimality checks. No separate historical run-1 snapshot exists; recovery does not cure that protocol gap. |

Use the [corpus boundary instructions][corpus], [Booking run-7 record][booking-corpus]
and [Club recovery record][club-recovery]. A kept model copy alone does not
restore an old foundation or guard; changed import paths can also change
its pinned package id. Deletion-minimal means no tested single deletion
retains the failure, not a globally shortest counterexample. Sale's shrunk
run-6 cases preserve misdelivery, while the full seeds and G1 tests preserve
the refused-stub guard error itself.

This report does not claim full compliance with “every failing series
shrunk and committed”: Sale's ledger also records 100 run-3 and 60 run-4
failing seeds, but the inspected source corpus contains Sale run1 and
run6 directories only. Nor are the authors equal independent trials:
Booking received the Sale example/ledger, and Club received both Sale and
Booking. Post-baseline corrections and learned examples must remain part
of the authoring evidence.

## V6 integration results

The [V6 ledger][v6-ledger] separates the input snapshots from their measured
results. The integration preserves the three model and manifest identities
listed above, combines V3's audience-state contract, V4's authorization
clamp and client disclosure filter, and V5's role audiences, public
disclosure records and grant-effect hooks. V6 adds no model fixes or kinds.
V4's unauthorized-attempt clamp also changes Club's readable event sets;
unchanged model bytes do not make the old V5 run a measurement of V6.

| Validation boundary | Measured result |
|---|---|
| Full run 1, `1db4d6fca0b40fd910cb00ce86060bc00ddce15d` | 130 tests: 128 pass, one ordinary failure, one executing/failing Club TODO. All three 200-seed campaigns pass. [Output][v6-run1-log], [results][v6-run1] |
| Historical Club corpus, exact V5 `772a514` | All three literal descriptions reproduce; all three seven-step traces are deletion-minimal and repaired controls are clean. [Output][v6-club-log] |
| Run 2, `742e64a06d06226b456f489eb53deacc1bc9f5db` | 127 selected tests: 126 pass, zero ordinary failures, one executing/failing Club TODO. The three campaign tests were excluded by name. Typecheck passes. [Output][v6-run2-log], [results][v6-run2] |

Run 1's ordinary failure was a historical Club corpus assertion: V3's
audience-read contract changes the linked application's event hash, while
the original `unknown_application` mismatch still reproduces. Run 2 remaps
only that hash preview in the expected description and separately checks
the full linked id in the vote and projection. It preserves the corpus
bytes, deletion checks and repaired controls. No production, model or
manifest code changed between the two runs, so run 1 remains the full
600-seed measurement. The two runs are not a single all-passing suite.
The Club TODO still fails because admission 18 is effective after Dana's
Member grant at 15.

Each of the three model mutations changes one kind's audience only and
uses one hand-built trace, followed by deletion-minimal shrinking. These
are targeted detection cases, not mutation campaigns across 200 seeds or
a complete survey of audience faults. Their original packages pass the
same traces. Each selected narrowing hides a prerequisite from an affected
reader while a later dependent event stays readable; that dependence
produces the measured mismatch. Narrowing an audience alone does not
guarantee detection.

The checker has no independent rule requiring particular events to remain
readable: no "must-readable" floor. Its observations use the supplied
visibility, and its privacy budgets limit disclosure. A narrower audience
can therefore pass when it produces no observed disagreement or declared
invariant violation. The results below establish detection for these
traces, not completeness against arbitrary under-delivery. The revocation
mutation changes serving alone while preserving recorded events and
headers; it deliberately violates F0's public-spine contract.

| V6 case | Reader and frontier | Measured finding |
|---|---|---|
| Sale: actor-only `offer` | Alice, 5 | One mismatch: oracle accepts, view rejects with `no_such_offer`. |
| Booking: actor-only `occupancy` | Bob, 4 | One mismatch: oracle accepts, view rejects with `no_such_occupancy`. |
| Club: actor-only `standing` | Bob, 7 | Two mismatches: view accepts a vote the oracle rejects as `lapsed`. |
| Sale binding locality | Alice and Bob | Unrelated private attach 4 leaves saved intent 5 effective; relevant attach 6 makes saved intent 7 `stale_binding`; fresh intent 8 succeeds. |
| Booking binding locality | Alice and Bob | Corresponding positions 3, 4, 5, 6, 7; the same outcomes. |
| Club binding locality | Alice and Bob | Corresponding positions 3, 4, 5, 6, 7; the same outcomes. |
| Hidden spine revocation | Bob, 4 and 5 | Two mismatches: obsolete affordances at 4, then an unauthorized offer judged effective at 5. Restoring compliant serving is clean. |

Both readers interpret the obsolete binding rather than pause. Each
binding case has zero all-frontier consistency, invariant or privacy
violations. Both runs reproduce these seven findings. The unrelated
private attach preserves saved and freshly resolved binding identifiers
by value; this does not establish reuse of an interpreter cache. The
existing cache contract discards a result when its basis or view changes.

These historical V6 cases use a public relevant attach. A private relevant
attach also imposes its audience ceiling on every kind it declares,
following the existing C3a rule. That ceiling can exclude even an event's
actor when the actor is outside it. Binding staleness does not imply that
the resulting event remains shared or that a reader with missing attach
evidence can interpret it. This is an existing boundary, not a new
follow-up implementation or policy change.

Four [planted-fault traces][v6-corpus] are retained: Sale has four steps,
Booking four, Club seven, and hidden revocation three after shrinking from
four. Every single-step deletion removes the mismatch and each unmutated
control is clean. The revocation minimum retains the affordance mismatch;
the original test separately proves the next unauthorized offer outcome.
The committed corpus records match run 2's emitted diagnostics, with the
run's input snapshot added as provenance.

The integrated generator retains V5's position-before-recipient draw order.
These are fresh run-1 measurements, each with 200 seeds and zero violations
of its frozen checks:

| Model | Entries | Selected coverage |
|---|---:|---|
| Sale | 11,047 | 195 offers, 20 effective accepts, 118 unbound Inspection requests. |
| Booking | 12,000 | 2,553 requests; 652 effective occupancies, 471 linked; 324 effective cancels; 1,630 ticks. |
| Club | 11,939 | 629 applications; 1,575 votes, 1,001 effective; 343 admits, 126 effective; 514 standings; 246 generated grants. |

Existing regressions exercise replay, disclosure, dependency and cache
boundaries alongside the new cases. This supports the measured examples,
not arbitrary histories. Raw test output is retained, including Node's
whitespace-only diagnostic lines. The historical Booking budget file also
retains its EOF blank line; a clean working diff is not a clean diff from
the earlier main tree. Historical V6 review and landing are recorded above;
the measured follow-up below still requires its own independent review.

## Follow-up to the six nonblocking review items

Source snapshot `e627460daf788d6dbf6d3f8cbaa28f8f0fc0368b` adds
retrospective evidence without changing production code, generator, model
fixtures or frozen manifests. The noncampaign suite reports **129 passed,
zero ordinary failures and four executing, failing TODOs**, exit 0.
Typecheck exits 0 with committed output. The three unchanged campaigns
were excluded; their earlier 600-seed results are not claimed as a new run.
Commands and findings are in the [follow-up result](evidence/v6/followup1.json)
and [ledger](manifests/v6.ledger.md#follow-up-1-result).

Three new A5 traces name Dana's invitation acceptance, a malformed
ineffective apply, and a standing reason. In each, all five readers accept
two votes and admission, and the effect executor emits a Member grant,
although no application is recorded. The existing independent invariant
rejects each trace. A child TODO keeps the original expectation: reject
the votes and admission and emit no grant. Complete traces and minimized
invariant failures are [retained separately](corpus/club/a5-followup1/).
These are policy failures, not successful acceptance tests.

The mutation test now reads all four unchanged historical corpus JSON
files, verifies their control-entry ids and exact mutation identities,
checks the retrospective expected findings, and repeats deletion and clean
control checks. The original tests only regenerated these traces. The
[corpus guide](corpus/v6/README.md) explains the exact rule text/module
boundary; equivalent rule behavior alone does not reproduce an identity.

Historical outputs are unchanged. The ledger now records that
`e0d83bf` renamed `reason` to `model_reason` in three run-1 JSON cases
without changing values. Earlier typecheck claims had no committed output;
checker #1805 reproduced them, and this follow-up keeps its own output.
Only the new follow-up test log has trailing spaces/tabs removed; its raw
and normalized digests are recorded. The new typecheck log omits npm's
final empty line, with its raw output preserved at `b0c9042` and both
digests recorded. This does not alter the historical
whitespace boundaries described above.

The visibility harness uses authenticated entries as an assumption,
ordinary TypeScript functions, cold replay and an in-memory sequencer.
Its bounded results establish neither production confidentiality against
arbitrary clients nor cryptographic verification, durable crash recovery,
general migration or all possible histories. Those boundaries were part
of the [spike plan][plan].

[goals]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/notes/2026-09-14-evolving-spaces-design.md#L80-L107
[falsification]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/notes/2026-09-14-one-series-many-views.md#L393-L409
[plan]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/notes/2026-09-15-spike-plan.md#L22-L80
[counting]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/notes/2026-09-15-spike-plan.md#L278-L321
[sale]: https://github.com/generalbusiness-ai/dap/blob/009b5226bd77b9f9d5e7ccad70b39867ef3d1a41/spike/manifests/sale.ledger.md
[sale-result]: https://github.com/generalbusiness-ai/dap/blob/009b5226bd77b9f9d5e7ccad70b39867ef3d1a41/spike/manifests/sale.ledger.md#L230-L285
[sale-revisions]: https://github.com/generalbusiness-ai/dap/blob/009b5226bd77b9f9d5e7ccad70b39867ef3d1a41/spike/manifests/sale.ledger.md#L39-L54
[booking]: https://github.com/generalbusiness-ai/dap/blob/127af627529362c66e4944ce0418913f1f31f3ed/spike/manifests/booking.ledger.md
[booking-revisions]: https://github.com/generalbusiness-ai/dap/blob/127af627529362c66e4944ce0418913f1f31f3ed/spike/manifests/booking.ledger.md#L37-L78
[booking-integration]: https://github.com/generalbusiness-ai/dap/blob/127af627529362c66e4944ce0418913f1f31f3ed/spike/manifests/booking.ledger.md#L216-L293
[booking-corpus]: https://github.com/generalbusiness-ai/dap/blob/127af627529362c66e4944ce0418913f1f31f3ed/spike/corpus/booking/run7/README.md
[club]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/spike/manifests/club.ledger.md
[club-provenance]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/spike/manifests/club.ledger.md#L69-L185
[club-negative]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/spike/manifests/club.ledger.md#L292-L361
[club-scope]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/spike/manifests/club.ledger.md#L187-L220
[club-recovery]: https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/spike/corpus/README.md#L24-L42
[corpus]: https://github.com/generalbusiness-ai/dap/blob/127af627529362c66e4944ce0418913f1f31f3ed/spike/corpus/README.md
[club-decision]: https://github.com/generalbusiness-ai/dap/blob/d14dc07104ece67aca9a895441c6a985cb2fa6ab/notes/2026-09-16-club-admission-decision.md
[v6-ledger]: https://github.com/generalbusiness-ai/dap/blob/602f4584a77882b08fdadf9a3f211893895c14c8/spike/manifests/v6.ledger.md
[v6-run1]: https://github.com/generalbusiness-ai/dap/blob/e0d83bf092f8b1d75036ebd5aab868aba69b0510/spike/evidence/v6/run1.json
[v6-run1-log]: https://github.com/generalbusiness-ai/dap/blob/e0d83bf092f8b1d75036ebd5aab868aba69b0510/spike/evidence/v6/run1.log
[v6-club-log]: https://github.com/generalbusiness-ai/dap/blob/e0d83bf092f8b1d75036ebd5aab868aba69b0510/spike/evidence/v6/historical-club-772a514.log
[v6-run2]: https://github.com/generalbusiness-ai/dap/blob/e0d83bf092f8b1d75036ebd5aab868aba69b0510/spike/evidence/v6/run2.json
[v6-run2-log]: https://github.com/generalbusiness-ai/dap/blob/e0d83bf092f8b1d75036ebd5aab868aba69b0510/spike/evidence/v6/run2.log
[v6-corpus]: https://github.com/generalbusiness-ai/dap/tree/e0d83bf092f8b1d75036ebd5aab868aba69b0510/spike/corpus/v6/run2
