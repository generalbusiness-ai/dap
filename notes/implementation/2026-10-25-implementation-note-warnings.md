# Implementation-note warnings

Request `28b878ed0ddc0a85cd0af98a0b4e53bd7a2d9bef` adds an advisory check
for implementation notes and evidence paths in the committed landing delta.
The script is integrated after the gate's documentation-link check. Its
three owning cases pass. The integrated gate and final review are pending.

`scripts/check-notes.mjs BASE HEAD` reads Git objects between two commits.
It warns when an added or changed file under `notes/implementation/` exceeds
40,960 bytes. It also warns when a newly added path under
`notes/implementation/evidence/` does not end in `.manifest.json`.
An unchanged or deleted historical file produces no warning. A rename to a
new name counts as an addition. Uncommitted working-tree bytes do not affect
the result.

Warnings exit 0 because this check reminds authors of the evidence policy.
Missing commits, invalid ancestry, Git errors, and decoding errors exit 2.
Paths are JSON-quoted so a filename containing a line break stays on one
warning line. The script does not read note bodies or change Git state.
It does not verify manifest contents, evidence retention, or sensitive data.
Reviewers still apply those requirements in [the testing guide](../../docs/testing.md#the-implementation-note-and-its-evidence).

The existing Node stage now includes `scripts/check-notes.test.mjs` once.
Its three cases use private temporary Git repositories with real commits.
They cover the strict byte boundary, committed bytes despite a later local
edit, new evidence names, unchanged historical files, a clean range, and a
missing base. Each fixture removes its repository in `finally`.

The reviewed documentation-link changes are merged without replacing either
set of testing-guide changes. The `notes` step runs immediately after
`doc-links`, using the gate's existing merge base, and prints its warning
log. Earlier failures still stop later steps. The hook changes no test stage,
case, assertion, or deadline.

## Evidence

The owning run tested commit
`a2c026a778c0a87f9854bc520995c8d6e50399b2`, tree
`6bcb34aa37965fdbcfee52483109ba12c856d7d7`. Its helper, test, and maintained
reporter remain byte-exact after the merge and gate-hook addition. The
script and test were copied from the reviewed Source packet. The gate hook
is the reviewed four-line addition after `doc-links`.

The first capture failed before Node started because its strict file check
encountered a Python backend symlink. That failed preflight is retained.
A fresh allocation used the explicit regular Python interpreter and ran the
whole owning Node file once. Node and the capture owner exited naturally
with code 0. All three cases passed, with no skips, cancellations, or todo
cases. Stderr was empty.

The maintained reporter records the three actual case identities and one
EOF marker. Three file-wrapper observations lack a complete case identity
and remain separate. Its file and run summaries agree on three passes.
The finite before-and-after Source, tool, environment, and clean-checkpoint
bindings match. Those observations do not prove continuous isolation.

| Check | Command | Exit code | Output digest |
|---|---|---|---|
| Initial capture preflight; Node unrun | Allocated owning capture v1 | 1 | `18c7bb05d6787c3bd1e28341f120b615d98fbc79fab9e71c790f40c6c6dfec93` (result) |
| Warning behavior, three whole-file cases | `node --test scripts/check-notes.test.mjs`, with spec and maintained JSONL reporters | 0 | `e3d07f4ee48bbead7794d291563a189837e625c2392a978e23d1f0515bc96c05` (stdout) |
| Existing test orchestration | `node --test scripts/test.test.mjs` | Pending | Pending |
| Integrated ordinary gate | `npm run gate` | Pending | Pending |

The failed preflight cost 0.27 seconds elapsed and 0.13 seconds CPU. The
successful owning capture cost 1.18 seconds elapsed and 1.10 seconds CPU
(0.72 user and 0.38 system). These are outer measurements including guards
and descendants. Nested Node durations are not added. Machine load and
cache state were not sampled, so these figures are not a portable benchmark.

The closed owning logs are sealed in a durable read-only evidence directory.
The final committed evidence manifest and independent audit acceptance are
pending. Private tool, environment, and physical binding records stay
outside the review evidence directory.

Request `28b878ed0ddc0a85cd0af98a0b4e53bd7a2d9bef` owns the remaining gate
validation, final evidence manifest, and review. This change adds no
Worker setting, binding, migration, or deployment action.
