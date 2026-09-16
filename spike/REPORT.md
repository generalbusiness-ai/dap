# Visibility spike report

**Draft: source experiments assessed below; V6 integration validation, mutation and
binding results are pending.** This report does not approve the V4 candidate
or claim that the combined V6 tree has passed. It preserves the reviewed
V3 result and the negative V5 result; later validation must name its exact
input commit.

The small-repair claim did not hold: **Sale required six semantic repairs
against a budget of two. Club does not meet the original admission policy.**
The repaired Sale and Booking candidates show useful agreement across
partial views within their revised, bounded experiments. Agreement alone
did not establish the business promises or privacy budgets.

Hugh chose to retain Club's negative result for V6, without commissioning
a revised Club experiment or changing its privacy promise. That instruction
is recorded in workroom assert
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:bdcfbdc00e9861fb9f8e9b3d21f3104796d8be93`.
The earlier decision draft is not an adopted protocol.

## Findings against the goals

| Criterion | Finding |
|---|---|
| Goal 1: attach a package mid-stream and preserve prior outcomes | Existing deterministic tests support bounded activation, replay, dependency pause/resume and binding locality. V6's combined-tree verification remains pending below. This does not establish state migration or arbitrary model composition. |
| Goal 2: an agent reaches consistency within the declared repair budget | **Not met.** Sale exceeds its budget; Club's smaller count applies to an incomplete policy. Booking's candidate is within its model budget but includes revised guards and a separate foundation repair. |
| Predeclared falsification condition | The repair-budget branch is **falsified by Sale**. The evidence does not prove that every model must reveal every private event, nor that every privacy-preserving Club protocol is impossible. |

These are the [design's goal criteria][goals] and the [views note's explicit
falsification condition][falsification]. Goals 3 and 4 are not measured
here: no user-comprehension trial or durable ordering result is claimed.

## Exact source results

Counts in this table belong to different input trees and must not be added
into a combined test total. A passing detection test may deliberately
contain a privacy violation; it establishes detection, not safe delivery.

| Model and source | Review/validation status | Model repair budget |
|---|---|---|
| [Sale at `009b5226`][sale] | Approved in workroom review #520; 88 tests pass, including 200/200 seeds under the corrected guard. Landed as main `7bd311f221c62615c55b659f0a693e42db887fba`, with the same tree. | **7 recorded fixes, 6 semantic; 0 added kinds. Over budget: 2 fixes, 1 kind.** Fix 6 is recorded robustness work, not a semantic fix. |
| [Booking candidate `127af627`][booking] | Awaiting exact-head review at this report's draft boundary. Builder records 110 tests passing, including Booking and Sale campaigns, each 200/200. Typecheck and diff check pass. | **2 model fixes, 0 added kinds; within the 2-fix, 1-kind budget.** Foundation authorization/audience repair is separate. |
| [Club evidence `772a514`][club] | Original acceptance fails. Latest non-campaign validation: 96 pass and 1 failing TODO among 97 tests. The prior validation-run-3 campaign passed 200/200 under the unchanged, narrower manifest. | **1 fix, 0 added kinds.** One standing/vote-related fix, zero quorum fixes; below the per-constraint limit but not a successful implementation of the required policy. |

V3 approval is exact event
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:87c360f4e940f5a6c6e1c084c0c1ffc08f7d6f31`.
It approves the reported overrun and disclosed trace reproduction; it does
not change the authoring budget. The [counting convention][counting]
counts semantic repairs regardless of which agent found or implemented them.
Sale's and Booking's original split kinds were predeclared, not added kinds.

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

| Model | Manifest | Candidate package |
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
| Sale, approved V3 tree | 11,171 entries; 273 offers, 18 effective accepts; 120 unbound Inspection requests; zero Inspection attaches and zero private disclosures. |
| Sale, V4 candidate integration | 11,047 entries; 195 offers, 20 effective accepts; 118 unbound Inspection requests; still zero Inspection attaches and zero private disclosures. |
| Booking, V4 candidate run 9 | 12,000 entries; 2,555 requests; 652 effective occupancies, 472 linked to earlier effective requests; 325 effective cancels; 1,630 clock ticks. |
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
  admission rule prevents them. Different admins on request and cancel
  remain outside the generated domain. [Booking limits][booking]
- Club accepts extra private fields in public application kinds without
  the current budget flagging them. Revocation is not generated, and its
  current-holder budget can falsely treat a former committee member's
  previously read application as a new leak. [Club scope][club-scope]
- Client disclosure policies constrain the exercised clients. A literal
  hostile disclosure can still violate privacy under a repaired model.
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

## V6 integration gate — pending

Formal V6 results require the exact validation snapshot and its output.
The integration state is recorded separately; source results above are
not substitutes for the combined run.

| Required check | Result at draft boundary |
|---|---|
| Combined input head; package and manifest identities | Sources integrated at [`7d965265b0d3f22dba1142045784ac5f9a040461`](https://github.com/generalbusiness-ai/dap/tree/7d965265b0d3f22dba1142045784ac5f9a040461); integration agent reports unchanged model/manifest inputs and a clean typecheck. Formal validation snapshot pending. |
| One deliberately broken audience per measured model; checker detects each | Pending; record mutation, affected reader/frontier, violation type and retained evidence |
| Unrelated private attach leaves saved binding valid; relevant change stales it | Pending combined-tree run |
| Prior outcomes replay unchanged; cache/disclosure/dependency boundaries | Pending combined-tree run |
| Integrated regressions/campaigns and typecheck | Pending; report the Club failing TODO separately from pass counts |
| Independent V4 review and V6 exact-head review | Pending; replace neither with builder validation |

The integrated generator retains V5's position-before-recipient draw order.
Fresh Sale and Booking counts therefore remain pending; the V4 candidate's
counts above must not be copied into the combined result.

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
