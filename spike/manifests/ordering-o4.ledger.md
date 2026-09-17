# O4 transfer lifecycle experiment record

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1b6384e27d6dbfd5a22da3330378776d32ad23ab`.
Promise: `18ba74b01cbbea27e2d8c18b063ff482428c95aa` in that workroom.

The latest combined measured contract at this documentation branch's base
is run 9 (`f8987d22`, final candidate `15b660ca`): lifecycle manifest
`sha256:92ad0023e387cd4a6305d074ab99f7a29cbcc1699cd88b8dcf439a446ef58828`
and opening rule `/3`
`sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6`.
M1's documentation/count-assertion component below is a new manifest boundary;
its final combined runtime and validation remain separate from run 9.

The historical combined K1–K4 run-8 contract is lifecycle manifest
`sha256:a766fe56564b026a96c37630d261512c0f608adf5ec7c5ee2d11aca23eaf45fe`.
Runs 5–7 used historical manifest
`sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`.
Runs 1–4 used `sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378`,
which superseded historical `63be83e6` before the O4 baseline. Every earlier
manifest and result remains available at its recorded source boundary.
Its opening rule was
`sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c`.
Runs 1–7 retain their historical `475b415b` rule and exact source boundaries.

The scope profile, runtime and evidence verifier are in `src/scope*.ts`;
`ordering-profile.md` defines the trusted completeness assertion and explicit
source-to-F disclosures. The scope implementation content id hashes its
explicit 16-file list, detailed in the profile; it does not cover every
transitive source and specifically excludes `observe.ts` and `corpus.ts`.
It is measured alongside package ids for each run. Runtime and fixtures import no expected lifecycle
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
historical prefixes are outside that guarantee. Source members with all
relevant openings can detect a lying projection by recomputing the rule;
ordinary members may lack another actor's hidden attempt. It is not an
effectiveness oracle.
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


## O4-L3: unbound listed application attempts

Review `869821dee977b1697050fb09ba8f80f8112425f3`, ratified as
`04ea60627a747adfa56f518bfde5fbc7096a262e`, found another K3 route at exact
candidate `e0467ae9c44d99e10f38916b74f047b4e9183c5c`: Bob's listed but
unbound Sale offer in D permanently prevented certification while Kim's
release stayed effective. Adoption `794a913979b8e34c5b32d9e1d401f6300730ee34`
chooses a determinate unbound exception under the existing writer trust.

The original checker probe is retained byte-for-byte in
[the before record](ordering-o4-runs/l3-before/record.json), with fresh exact
`e0467ae9` memory/SQLite output: D releases at position 2, later proof creation
refuses, and F remains dormant. Regression-only source
`cfeb3599bfd043ec26b768bd30633d23dd015dc0` changes no runtime. All six new
D/I/F tests fail at the same certification refusal; source, command and raw
output are [retained separately](ordering-o4-runs/l3-before-tests.json).

Rule `dap.fixture.scope-public-openings/3` now permits a header-only listed
application entry only with exact actor-only audience, no effective binding
before its event position, and the exact foundation outcome `known:false`,
`authorized:false`, `effective:false`, `reason:unhandled`, without per-model
diagnostics. Effective `attachedAt`/`previous` binding history proves absence;
the producer performs no semantic replay and does not infer absence from
`expected_binding` or missing registry code. The known-ineffective exception
also excludes `model_unavailable`. Bound unavailable, placeholder and error
outcomes, all system kinds, and effective narrow authority remain excluded
from the unbound exception. Certificate format stays completeness/1.

The new rule identity is
`sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6`.
This isolated L3 manifest is
`sha256:92ad0023e387cd4a6305d074ab99f7a29cbcc1699cd88b8dcf439a446ef58828`.
The manifest/profile now identify both historical /2 content ids and the
K3/K4 component manifests, cover all repair classes in the introduction,
and explicitly name duplicate live rights as a possible malicious-writer
consequence. Detection by source readers requires all relevant openings.
Neither this classification nor its certificate proves completeness to F.
L1/L2 integration must regenerate final runtime/package/genesis/proof ids;
this component is not their combined candidate or an approval.

Planned focused measurement freezes runtime, tests and identity-bearing
manifest before running the unbound, original completeness, proof and
manifest checks plus typecheck. Dedicated D tests cover signed attempts,
exact retry, cold proof equality, effective releases, one activation and
both spends. I/F cover source-proof parity and later result/spends, not a
new I/F transfer protocol. Later-attachment tests retain the old proof and
refuse subsequent bound indeterminate cases and missing reader-side code.
Existing tests retain effective narrow refusals and hostile certificate,
privacy and full/public differential checks. No broad suite or campaign is
part of this component measurement; the next record states exact results.


Frozen L3 source `d987cd149c0fa0eda85235f0f8f10a56012d3bf2` passes
**55/55 focused checks and whole-tree typecheck**. The unchanged checker
probe now certifies D frontiers 0–2 and activates F with D released and F
live, on both memory and SQLite. The dedicated tests continue through both
spends and reopen. [Exact commands, identities and hashes](ordering-o4-runs/l3-focused.json),
[raw tests](ordering-o4-runs/l3-tests.txt),
[typecheck](ordering-o4-runs/l3-typecheck.txt) and
[checker memory](ordering-o4-runs/l3-checker-memory.txt)/
[SQLite](ordering-o4-runs/l3-checker-sqlite.txt) outputs are retained.
Fourteen fresh signed observations comprise six L3 D/I/F records and eight
unchanged K3 transfer cases under the new rule. The seven bound diagnostic
cases per store include model/package unavailable, unhandled, Scope/base
placeholders and fold/audience errors; missing reader-side package code also
refuses verification. Effective narrow authority continues to refuse.

The measured component scope implementation is
`sha256:3e0142a4c86598cfe30462f4cfe12a70e2730e55e6e2ea43570432c4dc113db6`;
Scope package is
`sha256:ddcaa3117eaac8b95c718452edec9b2e2d28fb36cc619f52fc4b7277d0b48e26`.
The fixed join policy remains
`sha256:ac852ebab4f55816e55cd0fd71b7280267bffaca097046d4880b24ac63b01455`.
These are isolated L3 identities before L1/L2 integration. Only records and
this handoff follow the measured source; no runtime, test or manifest change
follows. Earlier evidence remains unchanged. No broad suite, campaign,
independent approval or publication is claimed.


## Combined L1–L3 validation: run 9

The second O4 candidate at `e0467ae9` received changes requested in report
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:869821dee977b1697050fb09ba8f80f8112425f3`.
Root ratified it in `04ea60627a747adfa56f518bfde5fbc7096a262e` and adopted
the bounded corrections in `794a913979b8e34c5b32d9e1d401f6300730ee34`, under
the same workroom prefix. Frozen combined source
`f8987d22890e7cf2471d7124544c539d69c0a835` includes L1's own-property registry
reads/writes, L2's declared-validation exception boundary and header follow-up,
and L3's exact unbound-kind classification. The final profile clarification
was committed before measurement. Earlier K1–K4 fixes and evidence remain.

**The terminal TAP reports 492 tests: 488 pass, zero ordinary failures and
four executing Club TODOs retained by the user. All 167 O4 checks pass within
that same invocation.** The noncampaign suite was run once; the three named
200-seed campaigns were excluded. Its terminal duration is 42,880.439375 ms.
Typecheck ran once afterward and exited 0 (0.862 seconds).

**The original Python wrapper exited 1 after the test process completed.**
Its new all-JSON diagnostic parser rejected a TAP-escaped V6 diagnostic at
line 3499, before persisting the child's exit status or starting typecheck.
The raw TAP is complete, but the child's process exit status is not retained;
`exitCode` therefore remains null. These records do not infer or claim a zero
Node exit. `runner-failed.py` and `wrapper-error.txt` preserve the failure.
`resume.py` read the existing output, parsed 34 JSON diagnostics, retained the
one undecodable diagnostic verbatim, and ran **typecheck only**. It did not
rerun the noncampaign tests. The wrapper failure is a measurement-recording
failure, separate from the test results established by the complete TAP.

`ordering-o4-runs/run-9.json` summarizes results and actual identities.
The `run-9/` directory retains the original raw `result.json`, TAP, typecheck,
source/identity snapshots, both wrapper scripts and error record unchanged.
It also contains 100 fresh observations, the exact 475-file preservation
index from e046, a read-only observation-summary script and file hashes.
All 94 frozen runtime/test/fixture/contract/configuration blobs, including
package.json, package-lock.json and tsconfig.json, remain unchanged. The
475 preexisting evidence files are byte-identical to the e046 index.

The combined identities are:

| Item | Content id |
|---|---|
| Scope implementation | `sha256:cbc58a25deebafd4bcb6318c8eace26027ffa09ed796061efdf27770feee67fe` |
| Scope package | `sha256:21195fc775e76dd7bcc0e0dc57488527c01260de4cb17b7f0de021d00161bed5` |
| Inspection, unchanged | `sha256:18a886c149b383b8630836307195c1a89b90c463e7e32df6e0663b5d4ecc3030` |
| Sale, unchanged | `sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85` |
| Opening rule `/3` | `sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6` |
| Lifecycle manifest | `sha256:92ad0023e387cd4a6305d074ab99f7a29cbcc1699cd88b8dcf439a446ef58828` |

The opening rule is `dap.fixture.scope-public-openings/3`; the distinct
movable-writer profile remains `dap.fixture.single-writer/3`. The join policy
remains `ac852eba`. Historical `/1` and both provisional/final `/2` rule
packets retain their content ids and original source boundaries. They are
not migrated or relabelled as evidence for this rule.

Each backend still records 20 healthy boundaries, 29 adverse cases with 43
steps, and 209 materialized genesis variants. Outcomes remain 30 destination
mismatches, five authorization failures, 154 invalid-genesis, 18 malformed-
envelope and two unsupported-profile rejections. Historical-view coverage
remains 55 pre-attach, 100 completed-transfer and 143 across-attachment
questions per backend. The healthy S/I/D/F genesis, header and full-packet
proof identities match across stores and are retained in the run-9 summary.
All 92 run-8 observation names remain, with two new L1 and six new L3 records;
the original files themselves are not overwritten.

L1 verifies 33 signed property-name inputs and 99 exact retries per backend,
including cold and post-completion retries. Transfer completes at
S42/I5/D5/F11 with one activation and both spends. Positive cases preserve
explicit own property-name kinds, models, roles, resolutions and projections;
unknown roles retain their empty-capability behavior. Its component result
is 33/33 plus typecheck at `28981dd1982e02b40fc154d43972c19d82ebc7bf`.
Those results remain distinct from this combined TAP invocation.

L2 preserves unexpected issuance hashing/key faults rather than converting
them into malformed/release verdicts. The original component at
`086fb8a8e97f6045bd4518246838842f1d7d631a` passed 49 selected tests, a separate
one-test D1 check and typecheck. Root's subsequent malformed embedded-header
reproduction still disabled the facade before append; that failure and the
diagnostic cleanup failures remain recorded. The follow-up validated header
preimage bytes within the declared malformed-data boundary while leaving
hashing outside its catch. Final component source
`8f48a39e7cf54678fd8c314bd57c4549dac7ba3d` passed 12 dedicated checks and
typecheck; the earlier 50 broader checks were not relabelled as measured there.

In combined run 9, each backend injects 17 cold-open cases over nine issuance
crypto/key sites and 151 activation cases over 135 such sites, all preserving
original exceptions and healthy cold recovery. All 51 cold signature
verifications are injected; activation signature coverage samples three of
124 verification calls and its one signing call. The other 121 activation
verifications are not injected. The 13 malformed issuance variants per
backend, including six malformed header-number cases, add no position and
permit a healthy append/cold retry. Existing 120-lookup K2 sweeps also pass
per backend. These are bounded sweeps, not every cryptographic call.

L3 permits an actor-only listed application attempt to remain hidden only
when actual binding history proves absence before that position and the
foundation outcome is exactly unknown/unhandled, unauthorized, ineffective
and without per-model diagnostics. Bound unavailable/placeholder/error
outcomes, system kinds and effective narrow authority do not qualify.
The known-ineffective rule also excludes model_unavailable. Component source
`d987cd149c0fa0eda85235f0f8f10a56012d3bf2` passed 55/55 plus typecheck.
Combined D cases preserve cold proof equality and retry, release at D2,
one activation and both spends. I/F cases preserve certification plus the
later Inspection result or spends; no additional I/F transfer protocol is
claimed. Earlier component failures retain their exact sources and outputs.

The serving writer is still trusted for completeness and failure/absence
classification. A dishonest certificate can hide relevant authority and
create duplicate live rights; detection by source readers requires all
relevant openings. Destination replay does not remove that trust. The
profile also retains copied-genesis, source-close, shared-foundation scope
setup, live-cache tamper and explicit Inspection-derived disclosure limits.
Supported Scope construction selects strict folding; the private constructor
is a TypeScript API restriction, not a JavaScript security boundary. After
faults, submit/Context writes/interpret/export are blocked as specified;
proof() and retained context.view() can remain readable in memory. Deliberate
policy-error instances, the exact wire-message allowlist and documented
precommit refusal behavior remain classified limits, not blanket guarantees
for arbitrary thrown values. The original late-Ivan Sale limitation and
user-retained Club negatives are unchanged.

This records task executes no tests. Only fresh run-9 records and these
ledger/reproduction notes follow the frozen source. Independent O4 approval,
publication and landing are still pending; a completed TAP report is not
an independent checker verdict.


## M1 documentation and provenance correction

Review `66effd75` of exact `15b660caaf06e1ea4698e83a94e3717cfd48572b`,
ratified as `919baa74` and adopted as `739b7bf7`, reproduced the original
L1–L3 cases but found the same exception-conversion class in ordering
admission. M1 runtime, Scope facts/package repair and independent catch audit
have separate owners; this component changes documentation and reuses the
existing matrix's outcomes for explicit count assertions. It claims no runtime
repair, full-suite result or approval by itself.

**Run-9 provenance correction.** The earlier run-9 paragraph's “original raw
result.json” and the reproduction README's “raw result remains unchanged”
are inaccurate descriptions of creation provenance. `runner-failed.py` never
wrote that file. `resume.py` created `run-9/result.json` by parsing retained
TAP and running typecheck only. `wrapper-error.txt` is a later explanatory
paraphrase, not captured original stderr; the exact parser error and the
undecodable diagnostic are in `result.json`'s `unparsedDiagnostics`.
No historical output or recovery file is changed by this correction.
The builder test-child exit status remains **unknown**. Review `66effd75`
independently reran `f8987d22` and `15b660ca` with Node exit 0, 492 tests,
488 passes, four retained Club TODOs and typecheck exit 0. Those reviewer
measurements do not retroactively fill the builder's missing exit status.

Run 9's 94-blob source index is a wider measurement record than the explicit
16-source scope runtime id. In particular, changed `observe.ts` and `corpus.ts`
were pinned in the former and excluded from the latter. M1 does not rewrite
that historical identity formula or call it a repository-wide hash.

The profile and manifest now document the reviewed proof-size and deep-input
progress limits, model_unavailable's synthetic-only fixture coverage,
Inspection's refused string-field audiences, and the residual privileged Club
standing projection case. The four overlapping frontier/prefix/release/replay
guards remain defence in depth without independent first-guard test claims;
the frontier-23 reason stays unchanged. The progress/depth examples are review
observations at their original sources, not newly measured M1 tests. Typed/message conversions, TypeScript
construction and postfault read/final-verify limitations remain explicit.
The dedicated catch catalogue separates inventory, runtime requirements and
measured injection coverage. Final combined M1 runtime/Scope ids and the
combined run must be recorded after the other components integrate.


The M1 documentation component selects manifest
`sha256:00bdb77671000310c01a1761364285c6e0b1a643b1dc300ab9f419dc82b4988a`.
The executable manifest's public-opening rule is unchanged at `9e9bcbdd`;
only its prose identity and the test's expected manifest id change. This
component contains no runtime source edit. Its measured matrix/specification
checks and typecheck will be recorded separately below; the pending integrated
M1 runtime and Scope package ids must not be inferred from this docs-only tree.


Documentation/count-assertion source
`a9d27c3d0dc15c924bbcc5865ca07e7201d06b4f` passes **3/3 selected checks**:
the manifest identity check and the existing materialized-genesis matrix on
memory and SQLite. Both matrices retain exactly 209 cases and the declared
30/5/154/18/2 distribution. Whole-tree typecheck exits 0. No additional matrix
or broad suite ran. [Exact source, commands and hashes](ordering-o4-runs/m1-docs/run-1/result.json),
[raw checks](ordering-o4-runs/m1-docs/run-1/focused.txt),
[typecheck](ordering-o4-runs/m1-docs/run-1/typecheck.txt) and two fresh matrix
observations are retained. Runtime remains exactly `15b660ca` in this isolated
component; these passing checks do not validate the separate M1 fault repairs.
The catch catalogue was reconciled with the independent baseline audit and
retains its 21-site AST inventory and machine-readable classification.

Root separately verified Scope own-facts/package component
`4710d3e65b1dbeba16af7b358998c546e967747d`, measured at
`8e854c26b30de7a376dc71f5e0e8bf24160aaefa`: 11/11 focused checks,
typecheck exit 0, eight observations in identical backend pairs and 24 path
hashes. It entered the integration branch as
`9c0aaf0adab7d6e0070d15fda2e558eac823b183`. This documents that
component linkage without claiming it ran in this documentation checkout or
assigning the future combined Scope identity. Club remains unchanged.

The root's revised measurement runner now persists the child exit before
parsing diagnostics. Its parser was checked against all run-9 diagnostics
and a synthetic failure; that is a runner check, not a repeated noncampaign
suite and not recovery of run 9's unknown builder exit status.

Pending final-source fields are the integrated M1 runtime/Scope package ids,
updated catch locations/count (the baseline is 21; parser-inspection and
constructor cleanup may add catches), and per-site reached injection/results
on each applicable backend. Root must bind these to the frozen runtime source
and combined measurement before independent review. The catalogue and this
component do not substitute static inspection for those results.
