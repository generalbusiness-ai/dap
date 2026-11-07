# Typed sends and result bodies

Status: M6 has its own request, promise, branch, and isolated checkout. The first
checkpoint repairs the M4 collect diagnostic and passes both derive compilers
and all nine send-owner cases. The next checkpoint repairs observation-only
result clauses and passes both compilers and all 11 clause-owner cases, with
four literal results matching pre-M5 main. Typed send execution and complete
result routing, Page validation, the full gate, independent review, and landing
remain pending. These are separate focused checkpoints.

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

## Complete the admitted send path next

The request's caller query finds the ordinary send executor, retained form
matching, result execution, two outcome-send callers, and originating-send
reservation lookup. The runtime and validator branches have been read, and the
contract inventory records their source hashes. No typed M6 send instruction or
replacement dispatcher exists at this checkpoint. F1 repairs the existing
clause caller; complete typed send and clause selection still follow.

The next change captures create, tell, relate, index, source, fanout, collect,
and result-body instructions from actual successful admission. It must preserve
before-state conditions, working payloads, skipped ordinals, complete scans,
creation context, original occurrence and binder identities, current-state
result reconstruction, Native faults, reservation attribution, and actual clock
use. Native interiors remain M7, and final orchestration remains M8. Prototype
interpretation and dependency coverage retain their current conservative limits.

The protected judge remains byte-identical. No security baseline, dependency
manifest, live room, credential, custody, mini configuration, or deployment
changes. The full M6 source and validation still follow under
[plan 035](../plans/035-2026-11-04-typed-derivation-core.md).
