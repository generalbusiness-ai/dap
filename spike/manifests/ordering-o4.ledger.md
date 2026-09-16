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
produced export/proof/activation/view bytes. Arbitrary hostile clients can
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
