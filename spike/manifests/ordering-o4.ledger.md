# O4 transfer lifecycle experiment record

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1b6384e27d6dbfd5a22da3330378776d32ad23ab`.
Promise: `18ba74b01cbbea27e2d8c18b063ff482428c95aa` in that workroom.

The current combined K1–K4 contract is lifecycle manifest
`sha256:a766fe56564b026a96c37630d261512c0f608adf5ec7c5ee2d11aca23eaf45fe`.
Runs 5–7 used historical manifest
`sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`.
Runs 1–4 used `sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378`,
which superseded historical `63be83e6` before the O4 baseline. Every earlier
manifest and result remains available at its recorded source boundary.
The current explicit opening rule is
`sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c`.
Runs 1–7 retain their historical `475b415b` rule and exact source boundaries.

The scope profile, runtime and evidence verifier are in `src/scope*.ts`;
`ordering-profile.md` defines the trusted completeness assertion and explicit
source-to-F disclosures. The scope implementation content id hashes its
actual code and transitive local harness boundary. It is measured alongside
package ids for each run. Runtime and fixtures import no expected lifecycle
states. Tests drive signed operations and compare observed states against
all 20 healthy boundaries and the current 29 adverse branches on memory and SQLite.
Fully materialized genesis mutations enumerate every actual signed field and
container; malformed codec/profile rejections are named, unauthorized valid
variants retain authorization precedence, and authorized valid variants must
fail destination binding. An arbitrary exception is never a passing result.

The actual Sale positions 0–19 are preserved. Inspection starts a separate
signed context and result, explicitly imported at S20. S21–23 exercise the
real control-key seal, assignment and successor append. F's full signed
genesis is prepared before either release. Release proof verification pins
source genesis, writer and prefix from that genesis; independently folds
source semantics and grants through r=p+1; and activates only once after both
effective releases. Source rights stay released during withholding or
restart. No timeout restoration is implemented or claimed safe.

Development findings are retained under `corpus/ordering-o4/development`.
They include the five original incomplete-proof failures; the resulting
completeness extension; incorrect driver assumptions and missing grants;
changed-genesis expectation amendments; and an actual composite-handler
refusal bug fixed before the formal baseline. Source and output boundaries
are stated honestly. These development diagnostics are not baseline runs.

The framework integration changes are the approved founding-participant
scope profile and the merged O1 private Context/Journal lease. O3 control
validation remains intact. Scope effects supplement the legacy foundation's
explicit `not_in_v1`/`scope_runtime_required` placeholders; clients of this
profile use ScopeJournal's state, verdicts and participant interpretation.
Scope honors base binding, authorization, closed-state and other-handler
refusals before replacing its own placeholder. Conditional right owners are
derived from `scope.owners` and authenticated source exports, while all
other signed genesis declarations remain covered by the destination hash.

Limits: the source serving writer is trusted for opening completeness;
malicious signed omissions, forks, copied databases and retired keys signing
historical prefixes are outside that guarantee. Source members can detect a
lying projection by recomputing the rule. It is not an effectiveness oracle.
The public source membership/offer bodies are intentionally disclosed to all
F spine readers, including Kim and Carol's participation/stub. Private Sale
amounts, terms, counters and Inspection request bodies are absent from the
produced export/proof/activation/F-view bytes. Arbitrary hostile clients can
still publish their own private data through general journal payloads; this
fixture does not introduce a general schema-admission or DLP mechanism.
The original late-Ivan Sale projection limitation is preserved, not repaired
by changing the frozen Sale trace. The user-retained Club negative remains.
This experiment claims only O4, not general context merging or O5 verification.

## Formal runs

Run 1 source `ee86290f753cbfe3efcd9dcbb3128697d6b38016` used manifest
`sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378`
and the unchanged opening rule `sha256:475b415bbf8b16ccdb1bea078174712c57f2b2955ece9338d762abd60228bad8`. Focused run: 100 tests, 98 passed, 2 failed,
zero TODOs; typecheck passed. Both failures occurred while recording the
move-preserves-retry observations, after actual state/verdict assertions
passed: legacy successful verdicts contain optional undefined reason fields.
The strict codec correctly refused non-JSON data. The observation sink must
encode that JavaScript value explicitly; runtime/wire behavior is unchanged.
The run, identities and 56 completed observation files are retained in
`ordering-o4-runs/run-1*`. No full campaign was run at this failed boundary.


Run 2 source `b35b267ea5392e5361905018ee350ec4df07aa55` changes only the
observation sink after run 1 and integrates O1 final evidence/V6 ancestry
`4cfc69376fbd513c4cacf5baa0d32c316797cf89`. The signed runtime/profile/package
identities are unchanged. The recorder preserves optional undefined API
fields as the explicit diagnostic marker `{"$undefined":true}`.

Focused result: 100/100 pass, zero failures/TODOs. The 58 retained observation
files include both backends' 20 healthy boundaries, 27 adverse branches and
209 actual genesis mutations. Per backend the mutations yielded 30
`destination_mismatch`, 5 `unauthorized`, 154 recognized invalid-genesis,
18 malformed-codec and 2 unsupported-profile rejections. Every variant had
zero activations and no live F rights. No unknown exception was counted.
Typecheck passed. Full integration result: 315 tests, 311 pass, zero fail,
zero skipped, 4 executing Club TODOs. All 600 seeds ran (200 each Sale,
Booking and Club); exact coverage is retained in `run-2.json` and raw output.
These TODOs are the retained user choice and approved V6 negative cases,
not newly commissioned repairs awaiting work.

The measured scope implementation is
`sha256:96f811a0a50ec77a81f14768d01565ce3d38dd2ae1472c722c6ae96422bdae03`.
Package ids: Sale
`sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85`,
Inspection
`sha256:e2de918015c64401234c5df0291c8db399c7ce5997f6673662d7cc91a9c9c6e7`,
and Scope
`sha256:cd4037a57efd089fba49b5db78c3bda02a89403ef4300006ee9604033e120e05`.
The fixed join policy is
`sha256:ac852ebab4f55816e55cd0fd71b7280267bffaca097046d4880b24ac63b01455`.

Between the run-2 measured source and its candidate `7d9efba`, only records
and reproduction documentation were added; no runtime fixes or campaigns
occurred in that interval. The result is
ready for independent checking; this ledger is not an independent verdict.


The O6 report review found a goal-1 coverage gap at `7d9efba`: the earlier
pre-attach test compared Alice at frontier 10 only, and the original Sale
comparison stopped at sale-closed. Run 2 remains valid evidence for those
checks, not the full required reader/frontier matrix. The bounded followup
adds every actual S/F participant reader at original bases 0–10 across the
attach and completion, and bases 0–19 after completed handover and transfer,
using actual signed views/full folds and an independent original Sale replay.

Run 3 source `e11e334e5e42c44b03ca3d5b70a6721b8cc06cfa`: 4/6 focused tests
passed, 2 failed; typecheck passed. The new matrix failed when comparing
alias-normalized named audience arrays: cryptographic key order differs
from original human-name order, while recipients are the same. Exact signed
before/after equality remains required; the cross-fixture comparison needs
recipient-set normalization. This is a test comparison correction, with no
runtime/profile/manifest change. No 600-seed campaign was repeated.


Run 4 source `faf26c07d1cadf073a92bac0bb7b01ed3d6333ec`: 6/6 bounded
regression tests passed, zero failures/TODOs; typecheck passed. No runtime,
profile, package, manifest or fixture source changed from the full run-2
boundary. The run checks both memory and SQLite after actual S24/F3 completion,
with W1 current, delivery confirmed and fulfilment spent. The dynamically
verified reader union is Alice, Bob, Carol, Ivan and Kim (Kim never joined S).
For each backend it compares all 55 actual-reader questions at original bases
0–10 across the attach and completed lifecycle, and all 100 reader/frontier
questions at bases 0–19 after handover and transfer. Immediately across attach
it additionally checks all 13 fixture principals × 11 bases = 143 questions.

Comparisons include exact signed event identities/views, full prefix verdicts,
audiences and actual client projections before/after. Each completed-history
question also compares the full Sale model, visible full-source outcomes,
client outcomes, Sale projections and readability with a separately executed
original Sale trace. Named audience recipients are sorted only for the
cross-fixture key-to-alias comparison; exact signed before/after equality is
unchanged. The known late-Ivan client/full projection difference is preserved
by comparing each path to its original path, not falsely asserting equality.
Actual observations are retained in `run-4-observations`. Those history-audit
records contain synthetic source full folds and each source reader's real
view, including private terms readable by their authorized reader; they are
not the public export/proof or F-view packets tested by the privacy checks.
The full 600-seed run remains run 2 and was not automatically repeated for
these added historical assertions. The goal-1 evidence gap is closed.


## G2 correction and G1 integration

Review `3d76d2b9d7f1fce8c577243ba330e15208b975c4` identified that an intervening
non-activation entry made F permanently unusable. Root decision
`c2982a6e6756f4fed08e5a82acc8b05a65127745` explicitly permits otherwise admitted
entries during the activation phase, while retaining current authorization,
closed-state and genesis-pinned proof gates. This is a recorded design change.
The new manifest adds two actual adverse traces, increasing the count from
27 to 29; old expectations and results remain under their original ids.

The source removes `activation_order`, adds an explicit closed-context gate,
and checks later activation independently of unrelated intervening entries.
The new signed memory/SQLite regressions cover failed activation, dormant
exercise, a fresh complete activation, Bob's admitted unauthorized observation,
and exact retries both before and after success. The authorization and close
branches prepare their extra grants before source releases, preserving F's
complete genesis commitment.

The same review's error-boundary concern is repaired separately: explicit
scope/profile/proof refusals remain verdicts, while unexpected replay and
handler failures escape. A post-commit scope failure closes the facade and
held Context. Reopen retains exact bytes; the transient-registry regression
recovers the original receipt and effective activation once. A deterministic
throwing handler remains a real failure on cold retry. The test error named
`ineffective_release` is deliberately an ordinary Error, so matching a known
policy reason cannot turn it into a refusal. Failed development snapshots and
fixture corrections are retained in `corpus/ordering-o4/development`.

Integration merge `71f2c9922576a1584d0a45b7d01999b760088093` includes final O1
G1 candidate `aaa447d9e5ac4d88f07f144d46f2f5e63752c399` and its revised G2
manifest. G1 compares the exact folded head inside serialized append and
invalidates stale/erroring raw Contexts. O3 control admission is preserved.
The runtime and Scope package identities therefore change; historical O4
proof packets must still be replayed at their historical source snapshots.

The combined scope implementation is
`sha256:1090e6c785ebf4e8060be60672a9503ae4bcbb4220a31f2c117bf42b6532f8db`,
and the Scope package is
`sha256:fd46665bc03857cadf6cec9e4964018780c93639482d42dccfb2b891195b2ed6`.
Sale and Inspection package ids, the fixed join policy and the opening rule
are unchanged. Formal run 5 uses source `91941fa55928668a7a25413bedd3b38f15677b4e` and
this new manifest. The complete noncampaign run passes: 345 tests, 341 pass,
zero ordinary failures, zero skipped and four executing retained Club TODOs.
Typecheck passes. The 122 O4 tests all pass within that same invocation;
there is no second duplicate lifecycle run. The three 200-seed campaigns
were explicitly excluded by name. Their prior evidence remains run 2,
explicitly before G1/G2, and is not attributed to the corrected runtime.

The 78 actual observation files contain both backends' 20 healthy boundaries,
29 adverse branches, 209 materialized genesis variants, all-reader historical
matrices and new phase/error cases. Both backends preserve F1's failed receipt
through retry, dormant exercise at F2, fresh success at F3, successful retry,
and the original failed retry after success. Bob's admitted unauthorized F1
observation is followed by effective Alice activation at F2. All earlier
proof/privacy, revoked/withdrawn-source and historical Sale checks still pass.
No unexpected exception was accepted as a mutation-policy rejection.

Run-5 records and this result update are the only changes after the frozen
source; no runtime, fixture, test or manifest changed during measurement.
The candidate is ready for independent checking; this record is not a verdict.

Raw run-5 text retains the whitespace emitted by Node, including the retained
TODO assertion diagnostics and the typecheck command's final blank line.


## Aggregate integration after run 5

Run 6 source `ca2d105d01dea2e1f69d09ed4e707bfea64e62d0` merges final aggregate
`1ba67c39062ddf44508b14c0716817cfa9735964` into O4 candidate
`2b48c4c4484ecd722aa891cd6efa5362121c0f6e`. It retains the aggregate's
integration run-2 evidence and updated O2/O3/O5 ledgers. That aggregate's
149 passing focused checks were measured at
`2a57bd2ab0b1e30912f1e2bc044951d71477c5cc`, not at the O4 source.

This merge also adds O5's independently measured verifier and five test/fixture
files, each byte-identical to the aggregate. It is therefore an additive O5
integration, not an entirely records-only merge. All 76 existing O4 runtime,
fixture, test and lifecycle-manifest files are byte-identical to run 5's
candidate. Journal's conflict comprised two blank lines; the O4 bytes are
retained so its implementation identity remains `1090e6c7`. The full hashes
are in `run-6.json`. The O3/O4 profile and G2/A1–7 obligations are retained.

The narrow run-6 validation passes all 55 O5 verifier and actual-Journal
integration checks, with no failures, skips or TODOs. Whole-tree typecheck
passes at the same frozen source. No full O4 or campaign run was repeated.
O4's 122 passing checks remain the run-5 measurement at `91941fa`; the
600-seed evidence remains run 2 before G1/G2. Only this integration record,
raw outputs and ledger text are added after the run-6 frozen source.


## H1/H2 integration: movable writer profile /3

The prior candidates `d4decf8`, `2b48c4c`, `91941fa` and `ca2d105` and all of
their records remain historical. The aggregate's H1 review found that a
commitment-only predecessor permits relocation, and H2 found repeated
whole-chain verification on append. The adopted repair changes the movable
profile to `dap.fixture.single-writer/3`: control actors sign the exact
predecessor `{position,headerHash}`, repeated commitments are rejected, and
the live Journal maintains a verified ordering prefix. Fixed-writer admission
has no ordering hook. An unexpected external tail requires reopen rather
than making a cached ordering lookup silently trust it.

O4 merge `362141640ff1d87c31e48440503ed35e6933bd27` integrates frozen aggregate
source `773a38ec8367d0b563f7741d1ff902aceb72350c`. The next merge
`c17d8c09ff4c4e5e8f64d29996502833d06fdc6b` includes `713315d`'s malformed-test
Json annotation and preserved aggregate results; the aggregate runtime is
unchanged by that correction. A preparatory O4 typecheck encountered that
same inherited TS2322 error before its owner's fix. The aggregate run-4
record preserves the failing source/output. No O4 lifecycle run was taken
before integrating the correction.

The bounded O4 changes materialize S21/S22 controls with exact predecessor
objects, pass each authenticated header hash to the proof verifier's ordering
reconstruction, and recognize the new declared /3 and duplicate-commitment
wire rejections inside the existing narrow input-validation boundary. Other
exceptions still escape and disable an indeterminate ScopeJournal. The
SourceExport prefix retains its distinct position, headerHash and commitment
fields; it was already bound to the exact source prefix.

The healthy test now checks the actual /3 genesis and both control payloads.
A new memory/SQLite fault packet repeats a real actor-signed release envelope
in another correctly writer-signed header and has a valid completeness
signature. Public-proof verification and F activation reject the duplicate
commitment; F stays dormant and then accepts a fresh honest proof once. The
healthy source is untouched. This is explicitly a faulty-writer packet,
not output that the honest producer could append.

The lifecycle manifest remains `d94090b2`, opening rule `475b415b` and join
policy `ac852eba`. The scope implementation changes to
`sha256:f17f15a85088f645191959d8b1c21b0f415aa7b74449d7b13ee82e2e48dc8bea`,
and its Scope package to
`sha256:edea788ed6dab13a1a5ae255909dfa607f9d67a4c38571a35e04c7c9bb8eb623`.
Sale and Inspection package identities remain unchanged. Every fixture
context, export, proof and certificate is generated again under the new
identity; no old /2 packet is migrated or called current evidence.

Run 7 at frozen source `e8ccb2ef2c21510b84d0466193c2b3381f89316b` passes
124/124 O4 lifecycle, proof, mutation, historical-view and error-boundary
checks, with zero failures, skips or TODOs. Whole-tree typecheck passes.
The 80 observation files contain both backends' 20 healthy boundaries,
29 adverse cases and 209 actual genesis variants, plus phase/error, historical
matrix and signed duplicate-commitment evidence. Each backend again yields
30 destination_mismatch, 5 unauthorized, 154 invalid-genesis, 18 malformed-codec
and 2 unsupported-profile mutation outcomes; no unknown exception passes.
The all-reader matrices remain 55 pre-attach questions and 100 completed
historical questions, plus 143 questions immediately across attachment.
The measured source/proof ids agree across memory and SQLite and are retained
in `run-7.json`, including the definition of each full-packet proof hash.
No full O4 integration suite or 600-seed campaign was repeated in run 7. The aggregate owns H2 performance
measurements; O4's existing full semantic replay per state query remains a
separate bounded-fixture cost, not a claim of incremental scope evaluation.
Publication and independent review remain pending the accepted aggregate
and its final runtime boundary.

After run 7, O4 integrates final aggregate candidate
`936acce94e5cd024b0164fc6cd2af027f611545e`. Its changes after `713315d` are
benchmark/validation records and ledgers only. Every source, fixture, test
and lifecycle-manifest blob present at `e8ccb2e` is preserved; the per-file
hashes are in `run-7-integration.json`. The scope runtime remains `f17f15a8`
and Scope package `edea788e`. No tests or campaigns were repeated for this
evidence merge. Aggregate acceptance is still an upstream review condition,
not a claim made by this O4 validation record.


## K4 review correction: Inspection-derived disclosure

The independent review of exact candidate `edacc32db1495504d10ae7a92f02af272e49e9f2`
requested changes in four areas; it did not approve O4:
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:10521cbe232b5d7eb00b6dd2d79436e208ec4f1a`.
Root ratified that report in
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:a47f5058a80b89b7bfc7cd45ea4496a6e5e9f8e2`
and adopted repair choices in
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:b70fbd1f1ee8ed3d6a7008456d0292330d92c263`.
The checker independently measured 449 noncampaign tests: 445 pass, zero
ordinary failures and four retained executing Club TODOs; typecheck passed.
Its separate reproduction of run 7 passed 124/124 and regenerated all 80
observations. Those are independent review measurements, distinct from the
builder's original 124-test run at `e8ccb2ef` above, and coexist with K1–K4.

The earlier run-7 paragraphs and `run-7-integration.json` retain the pending
aggregate status recorded then. The later aggregate acceptance is now known:
checker report
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:7f5bacc35253bb774945606e5bc76bf7e75dc9b2`
approved `936acce94e5cd024b0164fc6cd2af027f611545e`, subsequently landed and
pushed as `6881b6a5a22584d534f2729002da0c582c97876a` with an identical tree.
That aggregate approval is not approval of the later O4 scope implementation.
Historical records are not rewritten to carry this later status.

K4 adopts explicit disclosure accounting, preserving the existing delivered
bytes. S20's admitted Inspection proof includes I's signed genesis mandate
(source S, request position 14, offer o2, inspector Ivan and founding Ivan)
and I1's result `pass:o2`. Bob receives those facts through S20 despite not
reading S14. Kim and all other F spine readers receive them in F1. S14's
request body and explicit requester attribution are absent from the proof;
its derived content is not secret. Carol's public identity and offer stub
remain disclosed, so requester anonymity or unlinkability is not claimed.
The profile, prose manifest and executable `inspectionDisclosure` now state
that distinction. The disclosure test authenticates the actual participant
views and nested signed proofs on memory and SQLite, live and after reopen.

The same documentation also names three existing limits from the review:
an authorized source owner can release after ordinary source close; copies
of the same signed F genesis can activate independently; and a scope-bearing
genesis opts into shared-foundation setup/founder semantics even through
plain Journal, while full ScopeJournal validation remains a separate facade
contract. Live cached authentication does not detect rewritten older rows
under an unchanged head; cold open verifies the full history and rejects
that tampering. Direct backend mutation remains outside cooperative ownership.

This isolated K4 revision changes no application runtime or delivered proof.
Its component manifest is
`sha256:b2501d040c87c31fee574549254902cc00b3a86d98a94098d7b8296bef2c59e6`;
it preserves rule `475b415b`, scope runtime `f17f15a8` and Scope package
`edea788e` while adding explicit observations. It is not the combined K1–K4
manifest or a repaired-runtime result. K3 owns the separate opening-rule
revision; integration must compute final identities and generate fresh proofs.
The bounded K4 source is frozen before its focused disclosure/specification
checks. No full suite or campaign is repeated for this documentation and
observation correction; results will be appended below at their exact source.


K4 component measurement at frozen source `e90b64b2e2b1e3f31a92aa00ecc77126c036d0bf` passes all 15
focused checks: 13 manifest checks and two actual disclosure checks, one per
backend. Whole-tree typecheck passes. Both retained observations cover live
and cold views: four S readers and three current F participants per phase.
Bob cannot read S14 but receives the identical admitted I proof at S20; all
three F participants receive that same signed mandate and result in F1.
Kim cannot read S20 directly in S. The exact assigned audiences, request and
activation bytes, actual genesis identities and extracted content are in
`ordering-o4-runs/k4-disclosure-1/observations`; `run.json` pins their hashes
and this source's changed blobs. All runtime and fixture blobs match edacc.

These focused results establish the documented disclosure, not a privacy
repair or a passing combined K1–K4 candidate. This appended result, raw
outputs and observation files are the only additions after the measured
source; earlier run files are unchanged. No full suite or campaign ran.


## O4-K3: failed actor-only attempts and completeness

Review `10521cbe` found that one ineffective member attempt permanently
prevented source certification although a later authorized release remained
effective. The checker's original probe and output are retained byte-for-byte
under [k3-before](ordering-o4-runs/k3-before/record.json). Regression-only
source `b4cb584` retains `edacc32` runtime: all six new memory/SQLite checks
fail at certification with `authority body has narrower audience`.
The exact source, command and raw output are in
[k3-before.json](ordering-o4-runs/k3-before.json) and
[k3-before.txt](ordering-o4-runs/k3-before.txt).

Builder adoption `b70fbd1f1ee8ed3d6a7008456d0292330d92c263` chooses the
bounded hidden-failure rule. `dap.fixture.scope-public-openings/2` adds
`ineffectiveActorOnly: 'hidden'` to its canonical declaration. A listed-kind
entry may stay header-only only when the full source verdict is exactly
`effective === false` and its assigned audience is exactly the actor alone.
No missing/indeterminate verdict qualifies. Other listed-kind narrow
audiences still refuse, including effective actor-only bodies. The
certificate envelope remains `dap.fixture.public-proof-completeness/1`
and binds the new rule content id:
`sha256:614f837e0f4f795625bc69d690a13c3d2a38c28e1a349bc49ed6db35cc972a71`.

The six regressions cover Bob's unauthorized accept, Carol's malformed grant
and Bob's unauthorized close on both backends. They check actor-only refusal,
header-only certification, exact retry, cold-reopened identical proof, effective
source release, and one effective destination activation with Alice still the
fulfilment owner. Public replay gives the hidden attempt no authority. The
existing capped-audience test now explicitly checks an effective actor-only
body still refuses certification. Existing malicious-writer and source-member
recomputation cases remain in the focused proof suite.

Classification is part of the existing trusted serving-writer completeness
assumption. A dishonest writer may classify effective authority as hidden;
the destination cannot detect that lie from opaque headers. Source members
with complete openings can recompute source effect and audience and retain
conflicting signed packets. This change does not weaken authentication,
release authorization or effect through the genesis-pinned release position.
Old opening-rule packets are historical and are not migrated automatically.

This K3 component changes the rule, scope implementation, Scope package,
manifest and generated genesis/proof identities. Its component-only manifest
is `sha256:e97568583079211cb99cdd572fa5e23b749e8a95c621324e1fec56858d387e53`;
source and focused validation will be recorded separately. The fixed join
policy is unchanged. K1/K2/K4 integration must recompute final combined
identities; no component measurement establishes that future combined source.


At frozen K3 source `0aa8687`, the focused 45-check invocation passed 43
and failed two strengthened capped-audience assertions. All six new K3
transfer regressions passed, as did existing signature/completeness,
malicious-writer and public/full differential checks. Typecheck passed.
The failed assertions expected the capped Bob offer's audience to contain
only Bob; it also contained attaching Alice. This was a test expectation
error, not a failure of the exception's effect guard. Exact commands and
output remain [k3-focused.json](ordering-o4-runs/k3-focused.json) and
[k3-focused.txt](ordering-o4-runs/k3-focused.txt); six signed transfer
observations are in `ordering-o4-runs/k3-observations`.
The corrected test first certifies the healthy prefix, then asserts an
effective attachment with exact actor-only Alice audience refuses immediately.
It also retains the subsequent capped-offer refusal. Runtime, rule and
component identities are unchanged by that test correction.


The two corrected capped-audience checks and typecheck pass at
`813c84cb5f39651477f1b89d54d3f34bee6ea3c3`; their separate results are
[k3-capped-followup.json](ordering-o4-runs/k3-capped-followup.json).
A subsequent source audit identified a necessary refinement before handoff:
base-fold `not_in_v1` and `scope_runtime_required` are placeholders, not
Scope effect decisions. The final K3 rule therefore requires a known,
determinate ineffective verdict. Its structured `ineffectiveActorOnly`
object pins `body: 'hidden'`, `known: true`, `effective: false`, the exact
indeterminate reasons (`not_in_v1`, `package_unavailable`,
`scope_runtime_required`, `unhandled`) and error prefixes (`audience_error:`,
`fold_error:`), checked on both top-level and per-model outcomes. The final
rule id is `sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c`.
The provisional `614f837e` rule remains confined to its earlier source.

Both system scope operations retain spine audiences even for null member
attempts; admit retains members. The four application Scope kinds retain
spine unless the publication-capability gate makes a known unauthorized
attempt actor-only. Scope preserves that authorization failure. Authorized
placeholders therefore remain open, and ordinary failed member attempts
can still be certified. Narrowing a binding requires an attachment, whose
own effective narrow authority body still prevents certification. No extra
semantic or recursive replay is introduced.

The refined tests add both system scope operations and all four application
Scope kinds by an ordinary member, followed by release/certification and
activation, on both backends. A separate producer test refuses unknown and
placeholder/error-reason actor-only cases. The final component manifest is
`sha256:bdb831b32915c0b209afcbcdfc8c24e671dcd60eb4dd1ffca17a2b6300ae5746`;
its scope implementation is
`sha256:c1bdb2acda60062a57dd2942ecc5824a9d7f63ee1f5205736065989965f8978d`
and Scope package is
`sha256:b5eb69362b0e6de96e9dda2997a5399cc061f6f9e184b82145218afb5e2227a0`.
These remain K3 component identities, not identities for merged K1/K2/K4.


At refined frozen source `82119b5`, 47 of 49 focused checks passed and
typecheck passed. All eight actual transfer checks passed, including the
six scope-kind member attempts on each backend, effective actor-only refusal,
and all existing proof/mutation/privacy checks. Two new placeholder tests
stopped at their first setup case: the helper tried to sign an unbound kind
without a valid `expected_binding` identity. The codec correctly refused it,
before the intended unknown-kind fold. The correction supplies a canonical
zero digest only for this deliberately unbound attempt, so it reaches the
foundation's unknown verdict; no runtime or rule changes. Exact failed output
and eight signed observations remain in `k3-final.*` and
`k3-final-observations`. They are not relabelled as a passing run.


Final test correction source `1bf535539c22045f2bf39a1dae4f1ddf28c51286`
passes both placeholder tests (unknown plus six indeterminate-reason cases
per backend) and whole-tree typecheck. The runtime is byte-identical to
`82119b5`; the remaining 47 focused checks retain their passing measurement
there. [Final follow-up](ordering-o4-runs/k3-placeholder-followup.json) and
[raw output](ordering-o4-runs/k3-placeholder-followup.txt) preserve the
separate command boundaries; no passing single 49-test rerun is claimed.
[Component identities](ordering-o4-runs/k3-identities.json) give full source
commits and hashes. The eight actual transfer observations retain signed
attempts/proofs, source releases, activations and final states. The earlier
failed runs and original checker output remain unchanged.

Handoff changes only the proof producer/rule, its manifest/profile contract,
focused tests and new records. It does not change actor authentication,
certificate shape, required openings for effective authority, destination
release-effect replay, audience assignments or K2 exception propagation.
K2's strict interpretView option in verifyPublicProof must remain when this
branch merges. K4 owns the separate disclosure additions. Both the manifest
pin test and combined scope/package identities require recomputation after
integration. No broad suite, full campaign, publication or independent
approval is claimed by this component handoff.


## Combined K1–K4 validation: run 8

Frozen source `2ee1b43a9fc7c3af2b99d991f36d78a4dbcde443` integrates the
four review corrections. The merged manifest preserves K4's explicit
Inspection-derived disclosure and K3's structured hidden-failure rule.
The strict K2 interpretation option remains selected at every scope/proof
replay, and the K1 Inspection guard remains in the identified package.
The original reviewed candidate `edacc32`, all earlier experiments and every
component's failing/passing output remain available unchanged.

The one noncampaign invocation passed: **469 tests, 465 pass, zero ordinary
failures and four executing Club TODOs retained by the user**. All **144 O4
checks passed within that invocation**, without a separate focused rerun.
Whole-tree typecheck passed. The commands took 28.960 and 0.835 seconds,
respectively, on Node v26.8.2. The three named 200-seed campaigns were
explicitly excluded; the earlier full 600-seed result remains measured at
`b35b267`, not at this new source. `run-8.json` records exact arguments,
exit codes, counts and observation hashes; `run-8-source.json` pins every
tracked runtime, fixture, test and lifecycle-contract blob at measurement.
Raw TAP/typecheck output and the actual runner are retained beside them.

The combined content identities are:

| Item | Content id |
|---|---|
| Scope implementation | `sha256:942f4d202400bcbb1d9fe8a008785acd4f7650112e9f775baaa3f711d5cb131e` |
| Scope package | `sha256:0a3201eade9021c0898e20f41b3b4a16c2f6add3dea8a8ad3161cd7d83312572` |
| Inspection package | `sha256:18a886c149b383b8630836307195c1a89b90c463e7e32df6e0663b5d4ecc3030` |
| Sale package, unchanged | `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85` |
| Public opening rule | `sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c` |
| Lifecycle manifest | `sha256:a766fe56564b026a96c37630d261512c0f608adf5ec7c5ee2d11aca23eaf45fe` |

The 92 fresh observation files are generated at this source. Each backend
executes 20 healthy boundaries, 29 adverse cases comprising 43 steps, and
209 materialized genesis variants. Mutation outcomes remain 30 destination
mismatches, five actual authorization failures, 154 invalid-genesis, 18
malformed-envelope and two unsupported-profile rejections. Unexpected
exceptions never count as successful negative cases. The historical-view
matrix retains 55 reader/prefix questions, 100 historical questions after
completed transfer and 143 questions immediately across attachment per
backend. Actual S/I/D/F genesis, header and full-packet proof identities agree
across memory and SQLite; their full hashes and derivation are in run 8.
No historical packet is relabelled as current evidence.

K1 checks 21 malformed Inspection inputs and 63 immediate/cold/completed
exact retries per backend. Those histories complete Inspection, Sale,
handover, releases at S45/D1, one activation and both destination spends,
then reopen identically. K2 sweeps all 120 activation registry lookups on
each backend: all 240 injections throw the original value, close the
indeterminate facade, preserve committed bytes and recover the effective
saved receipt after healthy reopen. No injected fault returns a policy
verdict. Strict cold-open, export/proof non-Error failures, handler faults
and ordinary Journal's unchanged legacy behavior also pass.

K3's eight transfer checks now pass together with the entire proof suite.
Each backend covers three isolated failed member actions and six system/
application scope attempts, followed by effective source release and one
effective activation. Effective narrow authority, unknown outcomes and
placeholder/error outcomes still cannot be classified as harmless hidden
failures. The preceding component record remains 47/49 plus a later 2/2
correction, not a retroactively combined 49/49 result.

K4 checks live and reopened signed views for four S readers and three F
participants per backend. Bob lacks the private S14 request body but receives
the derived signed Inspection mandate and result via S20. F readers, including
Kim, receive those same derived facts through activation. The request body
and explicit requester field remain absent from the public packet; secrecy
of the mandate, result or requester linkage is not claimed. This is explicit
disclosure accounting, not a privacy-removal change.

The trusted serving writer still supplies completeness and hidden-failure
classification; destination semantics independently verify release effect
and authority. A malicious signed omission remains outside completeness
trust, and source members can recompute the claim. The other recorded limits
remain: ordinary source close does not prohibit an authorized release;
copies of one signed F genesis can activate independently; direct backend
mutation is outside cooperative ownership, with unchanged-head rewrites
checked on cold open; the shared foundation recognizes scope-bearing setup,
while full validation requires ScopeJournal. The original late-Ivan Sale
limitation and user-retained Club negatives are unchanged.

Only fresh run-8 observations/results and these documentation updates follow
the measured source. Runtime, tests, fixtures, manifest and all prior evidence
remain byte-identical. This is builder validation ready for independent
review, not an independent checker verdict or permission to land O4.
