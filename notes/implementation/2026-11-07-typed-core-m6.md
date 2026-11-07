# Typed sends and result bodies

Status: local M6 source now captures and executes all four ordinary send forms,
selects retained sends by admitted occurrence, and follows each send's future
result root. Fourteen complete owners pass 161 distinct cases across two focused
checkpoints, and both derive compilers exit 0. Earlier diagnostic and F1 evidence
remains below. Page validation, one full gate, independent review, and landing
remain pending.

Request `0b0d278680c4dde3a9b278d4a76a547ef83223cc` and promise `c8c85693`
own this work. The branch starts at M5 candidate `449979c2`, approved by
`80ef411d` under review `da207eab`. M5 lands on main as `f04ff0f2`, receipt
`513dc0d8`; independent check `fbfb93a0` confirms its landing. M6 merges that
main at `654b8c77`, with an unchanged tree and no repeated test. Parent 035
stays open through M8. The planner owns deployment.

## An invalid field still receives complete collect diagnostics

M4 review `3371681b` identifies a diagnostic regression in
`validate/sends.ts`. The source helper now receives a field name or the
sentinel `false`. Its truthiness check treats an empty field name as the
sentinel, adds “a collect is a field of a send,” and stops reading the collect.

The one-line repair checks `field !== false`. The existing shape reader still
refuses the empty field name. Validation then checks the collect's range and
members, preserving the earlier complete refusal. No accepted definition,
canonical declaration, pin, bound, or wire format changes.

The new witness supplies an empty field name whose collect reads a final state
and names a missing slot. It asserts the complete ordered problem list:

1. The field map has an empty name.
2. The collect range lists a final state.
3. The collected member names no slot of the item type.

On unchanged production source, that case fails by assertion. The eight other
owner cases are unselected in this run. A separate one-call validation snapshot
copies the fixture literally and retains the full original two-problem answer;
it reruns no test owner. After the repair, both derive compilers exit 0 and the
complete nine-case `forms-sends.test.ts` owner passes. Every original assertion,
case, and deadline stays unchanged. The added case preserves the admission
refusal while distinguishing the missing range and member diagnostics.

## Observation-only clauses use their admitted body

M5 approval `80ef411d` assigns finding F1 to M6. A clause with observation
rows and no effects reaches `deriveEffects` with no body. Its new admission
boundary throws. The checker confirms that no installed or installable
definition reaches this platform-only path, so M5 lands unchanged.

The new result witnesses cover both an explicit empty `applied` list and an
omitted `applied` key in the legacy and whole-scope cohorts. All four pass on
historical pre-M5 main `3cb223b8`. Exact M5 source `449979c2` fails their
`not.toThrow` assertions in two disjoint selected runs: two empty-list cases,
then two omitted-key cases. Every run retains its source hashes and literal
fixture. The isolated comparison checkouts return to clean status afterward.

The repair always selects the actual admitted clause body, including when its
effects are empty. The validator also captures an empty body for legacy
observation rows whose result key is absent. This adds no reservation and
changes no admission check. The shared effect executor still requires its
admitted body. Existing reservation bookkeeping and the protected judge stay
unchanged.

At checkpoint `cfff2a3c18d042c1f0ddb2696505709b728ca52c`, tree
`a5e408ee74143471126a6eec301894dba903e126`, both derive compilers and the
complete 11-case clause identity owner pass. Every original case, assertion,
and deadline stays. The four added cases record `write`, no effects, and the
exact observation; the wrong observation still yields `authority-unavailable`.
These literal results match the historical main comparison.

The [initial F1 baseline](evidence/2026-11-07-m6-observation-only-baseline.manifest.json),
SHA-256 `d36b7add554fd35128e80a9f4a4d452c8d20306ffdbbb82856e1a1ed22f6f439`,
seals 18 files with the empty-list assertion failures and signed checker
classification. The [F1 repair manifest](evidence/2026-11-07-m6-observation-only-repair.manifest.json),
SHA-256 `7a812be7be6cb200d6384cde5f03f6ca7b1ddea3046f0d1d04649321ec7e8720`,
seals 56 files with the omitted-key failures, historical comparison, compilers,
complete owner, source patch, and restored-checkout records. No test reruns
occur during sealing.

## The checkpoint retains source and setup evidence

Source checkpoint `393955e909158ed4e62dd056fcc9228dcfcefa71`, tree
`f38c94b5d2a34a6be91addebf094112d097949f1`, contains only the one-line
validator repair and new test. The baseline production source is M5 candidate
`449979c2`; its new witness and before/after hashes remain in the unit.

The [diagnostic manifest](evidence/2026-11-07-m6-collect-diagnostic.manifest.json),
SHA-256 `8cc8e1a0ed14ec68139fd1207354fc1eef023d703b2979c5372559b856335d69`,
seals 50 read-only files. They retain the actual assertion failure, literal
validation snapshot, compiler and complete owner reports, source versions and
patch, contract/caller inventory, and checkout preparation.

The initial setup wrapper exits 1 after copying dependencies: its guard expects
links to the old checkout, but the copied relative links already resolve inside
M6. The retained setup reconciliation verifies all 14 internal aliases, clean
status, source identity, and lock stamp without copying again. No package
installs or source changes occur during setup. This wrapper failure establishes
no source or test failure.

The prerequisite [M5 landing manifest](evidence/2026-11-07-m5-landing.manifest.json),
SHA-256 `4ddaf6abe6605edc2ef9071187598a109f9cac6d54db161149d345fc4432d346`,
seals 40 files. It records the exact approved merge, 47 retirements and 29
successors within reviewed scope, 44 artifacts left live, child closure,
successful atomic push, and published planner deployment handoff `8926547d`.
It changes no failed gate into a pass and proves no deployment.

## Execute sends from admitted instructions

The validator records a closed `SendCode` for create, tell, relate, and index.
Each payload source is self, an admitted operand read, or a collect with its
admitted range and ordered member reads. Final admission owns these plans and
captures the existing recursive subject-skip names, including names inside
constant payloads. Rejected arguments never reach that final traversal.

`deriveSends` verifies the actual body and every source occurrence before its
private executor runs the captured instructions. Conditions read the earlier
state. Addresses, payloads, and range predicates read working subjects. The
existing `coveredItems` leaf still requires a complete bounded scan. `sendValue`
keeps reference encoding in one place, with the old field, slot, item, and
presented-fact conversion policy. Party slots retain their old opaque wire
behavior. Omitted values, emitted ordinals, duplicate relations, creation causes,
creation context, membership, and directory lookup keep their existing order.

The new ownership witness mutates a target slot, message, and payload after
admission, then compares literal full `Ran` output over actual fixture state.
The valid legacy baseline fails its assertion and retains the full mutated
answer. Typed execution returns the admitted target, message, and payload. An
earlier fixture attempt used a comment act, which cannot send; that admission
refusal remains an inconclusive attempt, separate from the valid baseline.

The two outcome callers use an explicit `joinReturnedSends` bridge. They keep
Native requests at their existing checked boundary. The Native validation block
in `sends.ts` remains byte-identical to the preceding checkpoint. Rules retain
their original mark and fault identity. Native implementations remain M7 work.

## Follow each retained send to its result body

`sendOrigin` matches retained requests and advisory sends against captured
signatures in their admitted order. It preserves same-name conditional matching,
fanout reuse, and the Native always/optional counting rule. The selected node
identifies the result root directly. No declaration path or digest selects an
execution root. Reservation transfer uses that actual node's existing ledger
key, replacing the raw form object's first array index.

`runClause` follows the selected node's future root and supplies its original
effect occurrences to the strict M5 adapter. It reconstructs the existing fields,
subjects, signer, facts, and observations from the retained origin and current
state. Observation rows come from the admitted owned send data; their existing
freshness and retention leaf stays in place. An outcome send keeps its explicit
Native clause boundary. Empty observation-only roots retain the earlier F1 fix.

Four new public-result cases cover declaration mutation and aliased send objects
in both capacity cohorts. Exact M5 source `449979c2` fails all four assertions:
mutation loses the recorded request, and aliases make the old clause lookup
ambiguous. Its characterization checkout returns to clean status. M6 passes the
same cases, preserving literal effects, retained observations, full request
reservations, and the wrong-observation refusal for both request ordinals.

The first send checkpoint passes its test compiler and all 10 send-owner cases.
After result routing, the test compiler and eight complete owners pass 84 cases:
forms-sends 10, clause-identity 15, compose 21, creation-context 6, late 14,
late-reservation-identity 2, platform-request-amounts 5, and program-structure 11.
The next checkpoint passes both derive compilers and six more complete owners:
forms-marks 47, forms-ledger 6, forms-observes 11, forms-operand 7,
source-order 4, and source-order-reserved 2. Those 77 cases bring the two broader
checkpoints to 161 distinct cases. The first 10-case run overlaps that total.
No case skips, original assertions change, or original deadlines change.

## Complete the bounded M5 review cleanup

Effective scope addendum `8783d4eec52ae902d50a484b9690bdbc3822e89b`
names the three extra source paths before their final edits. It carries the four
nonblocking simplifications from M5 approval `80ef411d` and landing check
`fbfb93a0`. The unused `unsupported.ts` helper has no caller and is removed.
`readsUnbound` loses its orphaned preceding comment. Validator `alsoRead` shares
`conditionSubjects`, preserving recursive visits, duplicates, and order. Explicit
package exports keep both outcome-only join bridges internal while retaining all
other effect and send exports.

## Keep analysis and remaining work bounded

The production send and result routes now execute captured instructions. The
prototype lowerer, evaluator, explanation, and dependency visitor still cover
only their declared first slice. Unsupported whole bodies return their coverage
failure before execution. M6 claims no complete trace or dependency analysis for
its new send plans and no inspection of Native implementations. M7 owns Native
interiors. M8 still owns final body orchestration and adapter removal.

The protected judge remains byte-identical, SHA-256
`86222a9f4c1ff665232b470384bc82c095c0e1e175636eb8fae7859277f54959`.
No security baseline, dependency manifest, live room, credential, custody, mini
configuration, or deployment changes. Focused raw reports and baseline failures
await the send checkpoint's evidence seal. Page validation, the single M6 gate,
review, and audited landing still follow under
[plan 035](../plans/035-2026-11-04-typed-derivation-core.md).
