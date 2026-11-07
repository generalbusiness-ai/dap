# Typed sends and result bodies

Status: M6 has its own request, promise, branch, and isolated checkout. The first
checkpoint repairs the M4 collect diagnostic and passes both derive compilers
and all nine send-owner cases. Typed send execution, result routing, Page
validation, the full gate, independent review, and landing remain pending.

Request `0b0d278680c4dde3a9b278d4a76a547ef83223cc` and promise `c8c85693`
own this work. The branch starts at frozen M5 candidate `449979c2`, whose
independent review is `da207eab`. M5 lands first; any review repair must reach
this branch before M6 review. Parent 035 stays open through M8. The planner
owns deployment.

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

## Complete the admitted send path next

The request's caller query finds the ordinary send executor, retained form
matching, result execution, two outcome-send callers, and originating-send
reservation lookup. The runtime and validator branches have been read, and the
contract inventory records their source hashes. No typed M6 send instruction or
replacement dispatcher exists at this checkpoint.

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
