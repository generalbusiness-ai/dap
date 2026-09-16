# O4 transfer lifecycle experiment record

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1b6384e27d6dbfd5a22da3330378776d32ad23ab`.
Promise: `18ba74b01cbbea27e2d8c18b063ff482428c95aa` in that workroom.

The formal contract is lifecycle manifest
`sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378`.
It supersedes historical `63be83e6` before the O4 baseline; the historical
manifest and every earlier result remain available in their source commits.
The explicit opening rule is
`sha256:475b415bbf8b16ccdb1bea078174712c57f2b2955ece9338d762abd60228bad8`.

The scope profile, runtime and evidence verifier are in `src/scope*.ts`;
`ordering-profile.md` defines the trusted completeness assertion and explicit
source-to-F disclosures. The scope implementation content id hashes its
actual code and transitive local harness boundary. It is measured alongside
package ids for each run. Runtime and fixtures import no expected lifecycle
states. Tests drive signed operations and compare observed states against
all 20 healthy boundaries and all 27 adverse branches on memory and SQLite.
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

Run 1 source `ee86290f753cbfe3efcd9dcbb3128697d6b38016` used the revised
manifest and opening rule above. Focused run: 100 tests, 98 passed, 2 failed,
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

After the measured source, only records and reproduction documentation are
added. There are no further runtime fixes or rerun campaigns. The result is
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
