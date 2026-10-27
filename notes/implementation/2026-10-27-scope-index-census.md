# Registered-scope census and admission repair

Status: fresh owning checks, the admission-ordering control and the gate
passed. Exact-head review, landing and hosted observations remain due.

Child `f51f16f4`, under promise `d28d9bcd`, adds a bounded census of the
Worker's registered full scope references and genesis hashes. This recut
also repairs review `ca32d20f` of head `b5deace0`. It is based on Main
`c7b7d1b8f1bd68361b83b6fac6e820a8fde95c9e`, tree
`d6d9df00daf8363ac32fdcf5891f9cd8654adbbb`. That Main change added only
the sprint report. Archive settlement and R14 documents landed first.

## Decisions and boundaries

Ruling `c0789349` uses a standing signed-read predicate. Each page names
`census`, the deployment-pinned Register and its exact cursor. The fixed
owner binds its stored Register reference and genesis hash to a bounded
exact native proof, then checks the supported Register pin, applied genesis,
seed address and incarnation, and verified founding `install` signature,
cause and actor. Member sessions and caller-selected roots grant no access.
Ordinary causal windows and operator key succession are unchanged.

The existing `artifactsRegisterScope` accessor supplies the pin. The later
host-choice slice owns moving its setting. Census adds no setting, index
column, replay record, registration call or native turn. The exact
`proofSource` seam avoids the recovery scheduling of `nativeBirth` while
checking the same sealed genesis fact within its existing byte, SQL and
time bounds. The owner rechecks expiry, pin and row after waiting.

### Admission before proof work

The first review approved the architecture and simplification but found a
security gap: the inner key limiter ran only after the operator check.
A self-created non-operator key could therefore trigger the singleton
owner's row lookup and up to a ten-second, one-MiB proof read on every
request, with no address or key window before that work.

The route now passes the trusted transport address to the existing
`admitServing` path after request-form and signature admission. Its address
and key windows run before `owner.list`, its row lookup or proof RPC.
`invalid` maps to `forbidden`; rate and availability decisions keep their
existing fixed responses. The absent-index outcome remains distinct.
The inner rate call is removed, so an operator request is charged once.
The owner still checks operator authority before revealing its mode.

Window counters are memory-only. Existing cold object construction can
initialize schema, control rows and maintenance state. Active-object
read-only denials do not prove that every cold constructor is write-free.
Forwarded headers supply no trusted transport identity.

The new Native witness uses the real fixed index, counters, SQLite and
Register proof. A labelled binding spy forwards actual proof bytes and
counts calls. It checks a non-operator's first forbidden request, repeated
key and shared-address refusals before another proof, a fresh key/address
control, and an operator's first success and second limit refusal under a
one-read limit. The structural witness checks trusted-address forwarding
through the actual matcher and helper with labelled admission stand-ins.

### Pages and complete-only output

Pages remain exactly `{rows,next}`, with at most 100 rows. `next:null` is
an explicit end, including a full final page. The CLI shares the existing
4,096-row bound, derives at most 42 page attempts, and keeps one deadline
and byte allowance across custody, signatures, requests and response reads.
It accepts no redirect, retry, session fallback or partial manifest.

Only a complete nonempty census containing the configured Directory root
reaches the existing exclusive file saver, in the unchanged v1 manifest
form. Every invocation prints one fixed JSON outcome line. A timed-out
remote continuation cannot publish later. A local save error can happen
after the complete file is linked; `output-unavailable` acknowledges no
publication and does not prove that the path is absent.

The manifest parser and version reader are unchanged. The existing Native
integration uses ten real birth registrations and ordinary Signed reads on
the owned native clock, which starts in 2099. Census uses the host clock.
The 100-row SQLite page witness adds 90 explicit TEST metadata rows; it
claims no extra native births. The older inventory remains repository-only.

## Evidence

The previous collector remains sealed and unchanged. Its 132 files and
78,574,114 bytes match the committed manifest, SHA-256
`ce302d79f341398e5551b48a927decaf431974f79422280bd4b0337c5d731f2a`.
Its passing gate describes the security-rejected predecessor, not this
repair. The copied previous report retains the earlier failures, controls,
clock qualifications and exact checkpoints.

Fresh evidence is retained at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-scope-index-census-admission-repair/`.
Fresh checks and the gate bind the checkpoint below. The complete fresh
collector is indexed and sealed after its last write.

| Check | Actual argv or comparison | Exit | Output SHA-256 |
| --- | --- | --- | --- |
| Predecessor verification, recorded by root | `previous-evidence.json` | 0 | `previous-evidence.json`: `66fd25a583a04dbe180138da29f73f2845843748833aa0431b15c51073988f43` |
| Scope and CLI compiler contexts | `["npm", "run", "typecheck", "--workspace", "@generalbusiness/dap-scope", "--workspace", "@generalbusiness/dap-cli"]` | 0 | `types/output.log`: `389c9027c3954cf176c3b2c7076f55c42c090dfb6deed0dfaba722f34a6badce` |
| Native census and CLI integration: five cases | `["node", "node_modules/vitest/vitest.mjs", "run", "--project", "scope", "packages/scope/test/scope-index-census.test.ts", "packages/cli/test/scope-index-census.scope.test.ts"]` | 0 | `native/output.log`: `0f8db4ce40bdc1145d5855d7215f4e47f73857d705ecab9cf6d227b3bd9f920d` |
| Route and setting inventories: eleven cases | `["node", "--test", "scripts/security-entry-points.test.mjs", "scripts/security-settings.test.mjs"]` | 0 | `inventory/output.log`: `f9fe0561e7bf60b5cb51609739e0374de2ba996c37a59573c35f34c452b12ee6` |
| Shared-helper check | `["node", "scripts/check-shared-helpers.mjs"]` | 0 | `helpers/output.log`: `ae0cc4263c79509a1aac93ac04fb6a2c46e0bb7b663054171562564bced0a0b1` |
| Late-admission control: DISTINGUISHES | `["node", "scripts/control.mjs", "packages/scope/src/scope-index-census.ts", "    const decision = await admitServing(env, { kind: \"signed-read\", reader }, address);\n    if (decision !== \"admitted\") return response(refused(decision === \"invalid\" ? \"forbidden\" : decision));\n    const owner = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as { list(after: string, limit: number, reader: unknown): Promise<ScopeCensusResult> };\n    const result = await owner.list(after, limit, reader);", "    const owner = env.SCOPE_INDEX.get(env.SCOPE_INDEX.idFromName(SCOPE_INDEX_NAME)) as { list(after: string, limit: number, reader: unknown): Promise<ScopeCensusResult> };\n    const result = await owner.list(after, limit, reader);\n    const decision = await admitServing(env, { kind: \"signed-read\", reader }, address);\n    if (decision !== \"admitted\") return response(refused(decision === \"invalid\" ? \"forbidden\" : decision));", "--expect", "census key and trusted-address windows", "--", "packages/scope", "test/scope-index-census.test.ts", "--project", "scope"]` | 0 | `admission-control/output.log`: `08a990f42fca3559ca941e3801f68600ca1ee89b24f935ba3972d70ad3a38c7f` |
| Fresh ordinary gate | `["npm", "run", "gate"]` | 0 | `gate/output.log`: `4be79b872d4678bdfda506422c0f3f2669bb3a0b74769139f29bead46b379cde` |
| Gate reconciliation | Derived closed records, not another invocation | n/a | `gate-analysis.json`: `1aabb1bee506763f3799c9cfaac1432851661caf630c084d5dd3172827f23e75` |
| Earlier attempts and qualifications | Preserved predecessor report, not rerun | n/a | `previous-report.md`: `b9a7bf1ae34a17b0307f69a865f03956fc9213275124cd455cb08b177763ccff` |

The fresh gate passed for the repaired admission source. The old passing
gate remains evidence about the security-rejected predecessor, not this
repair. No previous failure or control is reclassified by the new result.

## Final source and validation

The fresh checks and gate used clean checkpoint
`9999fc38a52a32ff02c5572385be35b5e3cf9f67`,
tree `e978f39b202900577f36a34ddafa0665ecfa16b8`.
Every other tracked blob, symlink target and executable mode remains equal
to that checkpoint. Only this note and its manifest follow it. Root binds
the final review head after committing the reports; this note has no
self-referential final-head digest.

Four owning commands passed. Native ran five cases in two files: the four
server cases and the existing CLI integration. Route and setting inventories
passed eleven cases. The shared-helper check compared 685 source files
against 134 `bytes` exports. The separate admission control's unchanged
baseline
passed all four server cases. Moving admission after the owner call then
left HTTP 429 intact but increased the proof count from one to two. Three
cases passed and one named assertion failed on that count. The helper
reported DISTINGUISHES, exited 0 and restored exact source bytes. This shows
that a refusal alone does not witness the admission ordering. No formal
TypeScript compiler context was run on the mutant, and no control result
is counted as a gate case.

The fresh `npm run gate` naturally exited 0 with unchanged source and no
collection errors. It took 942.618016958 seconds wall and
2003.938495000 child CPU seconds. These are the whole command's
observations, not sums of concurrent test durations. Reconciled final
identities are:

node: 70 passed, 0 failed, 0 skipped, 0 todo.
Counts derive from maintained summarize case identities; durations are
concurrent observations, not elapsed wall/CPU or teardown proof.

counting: 55 passed, 0 failed, 0 skipped, 0 todo.
Counts derive from maintained summarize case identities; durations are
concurrent observations, not elapsed wall/CPU or teardown proof.

plain: 2877 passed, 0 failed, 1 skipped, 0 todo.
Final modules: 283 passed, 0 failed, 0 skipped.
Callbacks: 0 finals without ready, 0 without result;
0 duplicate ready and 0 duplicate result identities.
Counts derive from maintained summarize case identities; durations are
concurrent observations, not elapsed wall/CPU or teardown proof.

native: 814 passed, 0 failed, 2 skipped, 0 todo.
Final modules: 235 passed, 0 failed, 1 skipped.
Callbacks: 13 finals without ready, 35 without result;
0 duplicate ready and 0 duplicate result identities.
Counts derive from maintained summarize case identities; durations are
concurrent observations, not elapsed wall/CPU or teardown proof.

No unhandled or reporting errors remain in the reconciled fresh gate.

The recorded machine is Mac17,7, arm64, with
18 logical CPUs, running Darwin 27.2.0.
Node is v26.12.1. Recorded load before the gate was
3.29541015625, 2.70751953125, 2.81494140625.
The machine is shared and other workload was not controlled. Dependencies
were warm and lock-verified; OS cache state and post-gate load were not
measured. No hosted performance or runtime speed comparison follows.

For this repair's 6 retained check, control and gate command
receipts, the elapsed validation window is 1183.803083181 seconds from
the earliest start to the latest end. It includes gaps and overlap and is
not a sum of walls. Summed child CPU is 2089.019814000 seconds over those
same commands. This edit-validation cost differs from the whole fresh gate
alone. Earlier command costs stay in the predecessor report; they are not
folded into this repair's total. Preparation, editing and assembly are
outside these command receipts.

All three predecessor files remain byte-identical. The copied committed
report retains every earlier owning attempt, initial failure, failed Native
follow-up, inconclusive baseline and distinguishing control at its original
checkpoint. The recorded prior verification is checked; assembly does not
write or reauthorize the sealed 132-file predecessor collector.

The fresh collector contains 70 files and 59051468 bytes,
including its root `SHA256SUMS`. That index excludes itself; the complete
manifest includes the index. The manifest SHA-256 is
`fe90d213382cff7f0fd3326542da2c46c7b33a509f4bfca7c80ebc60d57d07cc`.
All fresh raw files and directories are read-only after the last write.
Retain them for at least 30 days after landing.

The first reporting preflight exited 1 at its sandbox write-access probe,
before any reporting or seal write. Root retained that observation and
reran preflight with the authorized evidence-directory access. This was an
assembly access failure, not a product check or gate failure.

The retained finalizer and phase receipt describe reporting only. The phase
receipt has `exit:null`, not a final process result or completed seal.
Actual post-seal status is printed outside the collector. Assembly reruns
no test, check, analyzer, gate, hosted query or deployment.


## Open obligations

The planner deploys the reviewed source to all three hosted Workers and
records the first census and version report for each, under `f51f16f4`.
No local Native witness establishes a hosted observation or deployment.

The insert-only index can miss registrations inserted below an advancing
cursor during the reported time window. Unregistered legacy objects remain
a gap even after a complete census. Parent R14 `bb763efa` owns retirement
decisions from qualified observations, static inventory, v1 reports and
use cases. Definition succession and K1 govern native-version retirement.
Zero observation proves no absence and authorizes no retirement.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f51f16f4e23d8a1e02a54dbb302f1dba4fb14513`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:c078934976a5d59c57ae13b65404ec2fa650225a`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:ca32d20f27772dbbd0f558fb73865902b2e31c41`
