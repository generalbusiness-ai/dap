# Ordering spike report

**Draft: O4's source-proof decision, implemented lifecycle results and final
integration are pending.** The measured O6 bootstrap meets goal 4's small
fixture criterion. Goal 1's ordering result cannot yet be concluded from
the lifecycle expectation tests. Independent review remains required.

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
| Goal 1: attach a package mid-stream and preserve all prior outcomes | **O4 measurement pending.** O1's lifecycle tests validate declared expectations, not an executed transfer. V6 supplies separate bounded visibility replay evidence. |
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
| O1 codec and journal | Run 1 `5219ad71`: 136/136. Integrated run 2 `6bd263f0`: 179 tests, 178 pass, one failing Club TODO; 600 legacy visibility seeds clean. Final focused run 3 `bdb275f4`: 50/50, typecheck passes. | Development fixed early asynchronous outbox acknowledgment, SQL-position checking and fractional signed JSON compatibility. After run 1, readable views gained original actor proof bytes. After run 2, QA found two Journal facades could hold inconsistent admission folds; one-live-facade enforcement and its regression were added. Run 3 is scoped evidence for that repair. [Ledger][o1] |
| O2 concurrency, retry and admission | Focused `ea2b65e6`: 9/9. Integrated `d3ff5f1b`: 189 tests, 188 pass, one failing Club TODO; 600 visibility seeds clean; typecheck passes. | Three schedules submit 126 requests through six concurrent client processes per schedule: 78 new entries, 39 exact replays, nine changed-content refusals. No append or model change was needed. Participant removal is controlled at the admission interface because F0 has no removal event. [Ledger][o2] |
| O3 handover | Focused `3cdd1f3b`: 69/70; all 11 O3 checks pass. Full `aae4051e`: 200 tests, 199 pass, one failing Club TODO; 600 seeds clean. Focused `8756c233`: 71/71 but typecheck fails. Final focused `acfe2522`: 71/71 and typecheck passes. | First failure was changed error wording, corrected for compatibility. The later v2 schema tightening requires distinct control/writer keys and exact sequencing fields. Its negative test needed a type annotation. No failed protocol case was repaired after measurement; the tightening is still a later source boundary. [Ledger][o3] |
| O4 transfer lifecycle | **Pending implemented results, exact source and integration.** | The frozen manifest describes 20 healthy boundaries, 27 adverse branches and changed-genesis tests. Passing those expectation checks is not execution or proof verification. Source-proof completeness and its trust boundary remain a workroom decision. |
| O5 isolated control verifier | Focused `462d7dec`: 53 pass, one isolation-runner failure. Focused `ac563035`: 54/54, then a test-only cast fails typecheck. Full `0a1daff7`: 256 tests, 255 pass, one failing Club TODO; all 55 O5 checks and 600 visibility seeds pass; typecheck passes. | Repairs resolve the macOS temporary-directory symlink for permission mode and annotate the malformed-input cast. No verifier algorithm repair followed the first frozen source. One isolated input comes from a real O3 SQLite handover. [Ledger][o5] |
| O6 envelope and route | Focused `c75894b8`: 2/2 plus typecheck. The direct CLI demonstration also exits zero. | Source was frozen before tests and the demonstration. No implementation repair followed. Final O4 and visibility-evidence integration is pending. [Ledger][o6] |

O5 candidate `598170fa5907655bc48c346a2dd4dd98853314a8` contains
O3 `c527584d5399f20dff33625e20cb97d237bdad98`, O2
`b6d156163285c8eaab3d05766dd9b0de35fef79b`, O1
`c9fe7d5f6f5624dd6407d57ff213038c8e955e0c` and V6
`05c98e2d778124648834b9b00e772a6ad270a870`. Later ledger commits
retain outputs; measured source ids above identify the code actually run.
The O6 evidence commit is `416e70615982778ae54bdfa4827cb7c87a3e058e`.

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
| 0 | Signed G, context `sha256:0bfc9037fbd0189013eee796dfdb15e98a59cf5a11c7cd7977fcb3d756c235ad` |
| 1 | Adopted signed L, commitment `sha256:1a2a4d30944bc14b399a54f9c19419201730d6874aed4c4fcb5c697fccca1fd6` |
| 2 | Alice's invitation addressed to the newcomer |
| 3 | Newcomer's effective redemption; Alice and Bob are participants |

The published route is `fixture:ordering-o6/guitar`. The append, immediate
retry and reopened retry return the same receipt hash,
`sha256:e6ac6a751ec148523bdb59fddf7d7fc641a6c833ae44bc9e66d8017b83bc6839`.
After reopen, the verified view is unchanged and there are still four
entries and four pending outbox records. The [actual CLI output][o6-demo]
retains every signature, exact envelope byte string, receipt and verified
view. It was produced in one process with a local SQLite file, without
external services.

From the measured source's `spike/` directory, reproduce with:

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

The ordinary v2 profile separates the writer from its control key. Both
seal and assign actor envelopes require that control key; the retiring
writer records them and signs both headers. A request or application grant
cannot install a successor. Between seal and assign, application work is
blocked. The same genesis, positions, prefix and saved retries survive the
planned move. These bounded checks do not fence a malicious old writer
using a copied database, select a winner after equivocation, or implement
automatic failover.

O5's control logic is independent of O3's transition algorithm and runs in
a permission-isolated subprocess without application code or later ordinary
payloads. It shares the canonical codec and Ed25519 implementation. Its
55 checks comprise 47 declared proof cases, four history comparisons, an
omission counterexample, input checks and two isolated executions; they
are not 55 independent verifier implementations.

**Control verification assumes every control opening is supplied.** The
opaque header contains no kind. A retained counterexample rejects a visible
seal followed by an old-writer entry but accepts the same signed headers
when that seal's opening is hidden. Thus this interface cannot establish
complete delivery. Conflicting signed histories are evidence of
equivocation, not tolerance, freshness, availability or fork choice.
[O5 limits and actual journal proof][o5]

SQLite commits entry, head, exact retry, invitation consumption and outbox
record in one transaction. Named O1–O3 SIGKILL schedules exercise process
crashes around those boundaries, notification and control handover.
Durability means an acknowledged append survives application-process crash
and restart on the same host with intact local disk. It excludes power,
host or disk loss, corruption, malicious rollback and unreliable filesystem
locking. Outbox delivery is at least once: acknowledgment loss can repeat
the same saved bytes. One live Journal facade per backend prevents competing
serving folds; it is not distributed consensus. [Profile][profile]

O4 must still supply its executed owner table, proof-disclosure evidence,
pre-attach replay comparison and adverse cases. A released right with
withheld evidence may safely have no active owner; it is a blocked safety
result, not availability. Timeout alone cannot justify restoring source
authority when destination activation may already have happened. The final
report will record the chosen source-proof completeness/trust boundary
explicitly, without treating a release receipt as proof of effective,
authorized release.

## Integration and visibility limits

All cited 600-seed campaigns use the legacy visibility path. They do not
represent 600 signed SQLite, handover or transfer traces. O1 signs the
selected V1 traces; O5 additionally consumes an actual signed journal
handover. The ordering spike does not establish arbitrary view consistency
or application-policy correctness.

The [V6 report][visibility] preserves Sale's seven recorded repairs, six
semantic against a budget of two, and Club's narrower-manifest success
despite original A1/A5 admission failures. Final integration is also to
include visibility-evidence follow-up
`d95e097b1d38a5242754922fe4c8b977462f5555`, which adds three
executing A5 TODOs alongside A1 and direct committed-corpus replay. It
changes evidence, not Club's policy. No ordering pass reverses those
negative results or commissions a new Club privacy experiment.

The report remains a draft until O4 and that follow-up are integrated and
the final source and checks are recorded. No full-suite result at the
eventual combined head is claimed here.

[goals]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-evolving-spaces-design.md#L80-L107
[bootstrap]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-evolving-spaces-design.md#L537-L573
[ordering-plan]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-ordering.md#L411-L468
[o1]: https://github.com/generalbusiness-ai/dap/blob/c9fe7d5f6f5624dd6407d57ff213038c8e955e0c/spike/manifests/ordering-o1.ledger.md
[o2]: https://github.com/generalbusiness-ai/dap/blob/b6d156163285c8eaab3d05766dd9b0de35fef79b/spike/manifests/ordering-o2.ledger.md
[o3]: https://github.com/generalbusiness-ai/dap/blob/c527584d5399f20dff33625e20cb97d237bdad98/spike/manifests/ordering-o3.ledger.md
[o5]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/spike/manifests/ordering-o5.ledger.md
[profile]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/spike/ordering-profile.md
[o6]: https://github.com/generalbusiness-ai/dap/blob/416e70615982778ae54bdfa4827cb7c87a3e058e/spike/manifests/ordering-o6.ledger.md
[o6-source]: https://github.com/generalbusiness-ai/dap/blob/c75894b8312b9046ac5975b4cda1c67149ed850d/spike/test/fixtures/o6-bootstrap.ts
[o6-tests]: https://github.com/generalbusiness-ai/dap/blob/c75894b8312b9046ac5975b4cda1c67149ed850d/spike/test/ordering-bootstrap.test.ts
[o6-demo]: https://github.com/generalbusiness-ai/dap/blob/416e70615982778ae54bdfa4827cb7c87a3e058e/spike/manifests/ordering-o6-runs/run-1-demo.json
[visibility]: https://github.com/generalbusiness-ai/dap/blob/05c98e2d778124648834b9b00e772a6ad270a870/spike/REPORT.md
