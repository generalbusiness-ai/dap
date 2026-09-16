# Ordering spike report

**Measured candidate before G1/G2 repairs; acceptance remains blocked.**
The measured bootstrap meets goal 4's local fixture criterion. O4 executes
the transfer lifecycle under an explicit trusted-writer completeness rule
and its replay follow-up supports goal 1 for that fixture. These are measured candidate
results, not independent acceptance or landing. O1's second review requests
changes, described below; the revised O1/O4 inputs are not yet integrated.

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
| O1 codec and journal | Repaired full source `747a0905`: 188 tests, 187 pass, one failing Club TODO; 600 visibility seeds clean. Final specification `43295693`: 11/11 lifecycle checks. V6 integration `9575c7c4`: 191 selected tests, 187 pass, four failing TODOs; three campaigns excluded. Typecheck passes at each boundary. | Earlier passing snapshots missed ownership bypasses. The private lease rejects closed owned Contexts and raw writes while Journal owns the backend; owned append/fold errors invalidate it. G1 exposes remaining raw-Context paths after close or an error. Final specification changes do not relabel the preceding full run. [Ledger][o1] |
| O2 concurrency, retry and admission | Focused `ea2b65e6`: 9/9. Integrated `d3ff5f1b`: 189 tests, 188 pass, one failing Club TODO; 600 visibility seeds clean; typecheck passes. | Three schedules submit 126 requests through six concurrent client processes per schedule: 78 new entries, 39 exact replays, nine changed-content refusals. No append or model change was needed. Participant removal is controlled at the admission interface because F0 has no removal event. [Ledger][o2] |
| O3 handover | Focused `3cdd1f3b`: 69/70; all 11 O3 checks pass. Full `aae4051e`: 200 tests, 199 pass, one failing Club TODO; 600 seeds clean. Focused `8756c233`: 71/71 but typecheck fails. Final focused `acfe2522`: 71/71 and typecheck passes. | First failure was changed error wording, corrected for compatibility. The later v2 schema tightening requires distinct control/writer keys and exact sequencing fields. Its negative test needed a type annotation. No failed protocol case was repaired after measurement; the tightening is still a later source boundary. [Ledger][o3] |
| O4 transfer lifecycle | Formal run 1 `ee86290f`: 98/100 focused checks, two recorder failures; typecheck passes. Run 2 `b35b267e`: 100/100 focused; full 315 tests, 311 pass, four executing Club TODOs, zero ordinary failures; 600 seeds and typecheck pass. Replay follow-up `faf26c07`: 6/6 plus typecheck. | First-run diagnostic encoding was repaired without changing signed runtime inputs. Per backend: 20 healthy boundaries, 27 adverse branches and 209 actual signed-genesis mutations. The wider replay follow-up is separately measured; no campaign was repeated for it. [Ledger][o4] |
| O5 isolated control verifier | Focused `462d7dec`: 53 pass, one isolation-runner failure. Focused `ac563035`: 54/54, then a test-only cast fails typecheck. Full `0a1daff7`: 256 tests, 255 pass, one failing Club TODO; all 55 O5 checks and 600 visibility seeds pass; typecheck passes. | Repairs resolve the macOS temporary-directory symlink for permission mode and annotate the malformed-input cast. No verifier algorithm repair followed the first frozen source. One isolated input comes from a real O3 SQLite handover. [Ledger][o5] |
| O6 envelope and route | Focused `c75894b8`: 2/2 plus typecheck and CLI. Combined `f9995e87`: 371 selected tests, 367 pass, zero ordinary failures, four executing Club TODOs; typecheck and CLI exit zero. | Three campaign tests excluded by name, not counted as skips. No bootstrap implementation repair followed. This input predates G1/G2 repairs; its measured success does not close those findings. [Ledger][o6] |

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
are 62 core/lifecycle, nine O2, twelve O3 and 55 O5 checks. [Integration record][ordering-integration]

O1's earlier ledger records why green runs were insufficient. Readable signed
views initially lacked actor proof bytes; two facades could hold inconsistent
admission folds; closing a facade or restoring a raw Context could bypass
ownership; and a direct Context append could commit a revocation, lose its
reply and keep serving stale authority. A corrected old-runtime harness
reproduced five ownership failures; a separate retained probe exposed the
direct lost-reply path after the first repair. Both were repaired with live
and cold regressions. Initial harness `DataCloneError` failures remain
identified as setup failures, not successful reproductions. [O1 correction record][o1]

The ratified second review `3d76d2b9` requests two further corrections.
**G1:** a raw Context can resume stale writes after a Journal closes on memory,
or remain active after its own lost reply. Wrappers bypass the backend-object
lease identity. **G2:** O4's current `activation_order` guard permanently
blocks activation after an intervening non-activate entry. That violates the
intended activation phase despite the measured healthy and retry traces.
The review also requires O4 to propagate unrecognized exceptions instead of
turning every thrown message into a verdict reason.

Decision `c2982a6e` deliberately clarifies the design: otherwise admissible
intervening entries are allowed; dormant exercise stays ineffective; fresh
activation checks genesis-pinned inputs under ordinary authorization and
closed-context gates. Exact retry retains a failed receipt unchanged. These
are required repairs, not claims about the current measured source. Exact
workroom handles and run status are in the [O6 record][o6].

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
records are not the public proof packets delivered to F.

The formal lifecycle manifest is
`sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378`;
the measured scope implementation is
`sha256:96f811a0a50ec77a81f14768d01565ce3d38dd2ae1472c722c6ae96422bdae03`.
The fixed join policy is
`sha256:ac852ebab4f55816e55cd0fd71b7280267bffaca097046d4880b24ac63b01455`.
Historical `63be83e6` was corrected before the formal baseline, after an
O4 prototype already existed. Failed activation timing, malformed-genesis
rejections, `not_open` reason wording and authorization precedence were
explicit expectation corrections. They are not retroactive passes for the
old manifest.

All 209 materialized-genesis variants per backend produce no activation or
live F right: 30 `destination_mismatch`, five actual `unauthorized`, 154
recognized invalid-genesis, 18 malformed-codec and two unsupported-profile
rejections. Valid unauthorized variants preserve `authorized:false` before
destination checking; missing authority is not made a profile error. No
arbitrary exception counts as safe rejection. The 58 [observation records][o4-results]
retain actual states, receipts, signed genesis variants and proof bytes.

The development evidence also preserves five real proof failures: extra
private fields and omitted attach, grant, revoke or withdrawal openings.
An omitted revocation restored close capability in replay; an omitted
withdrawal made a refused public-offer acceptance appear effective. These
failures showed why release replay needs complete authority openings. The
adopted completeness certificate closes that gap only under the trust stated below.
Another development defect let Scope spend a right despite an attached
handler's refusal; Scope now honors other handlers before replacing its own
legacy placeholder. [Development failures and repairs][o4-development]

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
the same saved bytes. The lease guards one live Journal facade per identical
backend object; G1's raw-Context and wrapper limits remain unresolved in this
source. This is not distributed consensus. [Profile][profile]

Public `activation` and `requires` pointers reveal bound-application and
attach classes even when the exact kind is hidden. Recipient verification
authenticates the supplied prefix and readable envelopes; it cannot establish
that entitled openings or the latest head were supplied, and unchecked extra
`ViewEntry` metadata is not signed evidence.

O4's `dap.fixture.scope/1` deliberately extends the fixture with founding
participants and a serving-party completeness assertion. Its named rule,
`sha256:475b415bbf8b16ccdb1bea078174712c57f2b2955ece9338d762abd60228bad8`,
opens 21 exact authority kinds with assigned spine/members audiences. Narrower
authority audiences cause the producer to refuse certification; all other
positions remain hidden. The writer signs the rule, source, frontier and hash
of the exact canonical proof packet excluding the certificate itself. The key must be the signer of the
frontier header: the retiring writer through assignment, the successor after
it. F pins each source and export prefix p from its own genesis, requires
release r=p+1 and a certificate covering r, and independently replays grants,
models and release effectiveness through r. The certificate attests opening
completeness, never effectiveness. [Exact profile and checks][profile]

**A dishonest writer can still sign an incomplete or tailored projection.**
The destination cannot detect that completeness lie from opaque headers.
Source members can recompute the rule and compare signed packets. Retired
keys remain trusted for their historical prefixes; forks and database copies
remain possible. This is additional serving trust, not a new cryptographic
proof of completeness.

The proof also explicitly discloses source spine/member authority bodies to
every F spine reader. Carol's participation and o2 stub reach Kim, who was
not an S member. This is counted under the existing subject-to-disclosure
clause; the original audience is not claimed unchanged. The produced exports,
proofs, activation payloads and views contain no private Sale amount, terms,
counter or Inspection request body. A general hostile client can still
publish arbitrary private data: these checks are not a general disclosure
prevention mechanism. [Disclosure budget and recipients][lifecycle]

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

O6 has integrated the measured O4 and ordering candidates. Its only merge
conflict was two blank lines in Journal; it retained O4's exact bytes to
preserve the scope implementation identity. O4's replay follow-up
`4ea7d966cc44fc2641e4f99516403bb46d50ba7f` is also integrated.
No performance patch or new runtime behavior is introduced by these merges.
The combined source `f9995e8761f23bbf0e71f004b29199c05ee35663`
produces the selected-suite counts above. The CLI's signed output is identical
to run 1 except for process id and database path. [Combined measurements][o6-run2]
The historical full 600-seed boundary remains O4 source `b35b267e`;
no complete campaign run at the combined source is claimed. Final O6 awaits
integration and verification of the G1/G2 repairs.

[goals]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-evolving-spaces-design.md#L80-L107
[bootstrap]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-evolving-spaces-design.md#L537-L573
[ordering-plan]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/notes/2026-09-14-ordering.md#L411-L468
[o1]: https://github.com/generalbusiness-ai/dap/blob/4cfc69376fbd513c4cacf5baa0d32c316797cf89/spike/manifests/ordering-o1.ledger.md
[o2]: https://github.com/generalbusiness-ai/dap/blob/b6d156163285c8eaab3d05766dd9b0de35fef79b/spike/manifests/ordering-o2.ledger.md
[o3]: https://github.com/generalbusiness-ai/dap/blob/c527584d5399f20dff33625e20cb97d237bdad98/spike/manifests/ordering-o3.ledger.md
[o5]: https://github.com/generalbusiness-ai/dap/blob/598170fa5907655bc48c346a2dd4dd98853314a8/spike/manifests/ordering-o5.ledger.md
[profile]: https://github.com/generalbusiness-ai/dap/blob/7d9efba41747e3c3bbd19b32dc238f6b4444247b/spike/ordering-profile.md
[o6]: https://github.com/generalbusiness-ai/dap/blob/eca816033530c04379bde487bd3b2b016b1f2045/spike/manifests/ordering-o6.ledger.md
[o6-source]: https://github.com/generalbusiness-ai/dap/blob/c75894b8312b9046ac5975b4cda1c67149ed850d/spike/test/fixtures/o6-bootstrap.ts
[o6-tests]: https://github.com/generalbusiness-ai/dap/blob/c75894b8312b9046ac5975b4cda1c67149ed850d/spike/test/ordering-bootstrap.test.ts
[o6-demo]: https://github.com/generalbusiness-ai/dap/blob/eca816033530c04379bde487bd3b2b016b1f2045/spike/manifests/ordering-o6-runs/run-2-demo.json
[visibility]: https://github.com/generalbusiness-ai/dap/blob/d95e097b1d38a5242754922fe4c8b977462f5555/spike/REPORT.md
[o4]: https://github.com/generalbusiness-ai/dap/blob/4ea7d966cc44fc2641e4f99516403bb46d50ba7f/spike/manifests/ordering-o4.ledger.md
[o4-results]: https://github.com/generalbusiness-ai/dap/tree/7d9efba41747e3c3bbd19b32dc238f6b4444247b/spike/manifests/ordering-o4-runs/run-2-observations
[o4-development]: https://github.com/generalbusiness-ai/dap/blob/7d9efba41747e3c3bbd19b32dc238f6b4444247b/spike/corpus/ordering-o4/development/README.md
[lifecycle]: https://github.com/generalbusiness-ai/dap/blob/7d9efba41747e3c3bbd19b32dc238f6b4444247b/spike/manifests/ordering-lifecycle.md
[ordering-integration]: https://github.com/generalbusiness-ai/dap/blob/3dc6b0953f91661edcc059b56157d349ff31c5b1/spike/manifests/ordering-integration.ledger.md
[o4-replay]: https://github.com/generalbusiness-ai/dap/blob/4ea7d966cc44fc2641e4f99516403bb46d50ba7f/spike/manifests/ordering-o4-runs/run-4.json
[o6-run2]: https://github.com/generalbusiness-ai/dap/blob/eca816033530c04379bde487bd3b2b016b1f2045/spike/manifests/ordering-o6-runs/run-2.json
