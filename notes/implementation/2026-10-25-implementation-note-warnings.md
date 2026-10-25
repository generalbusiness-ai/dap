# Implementation-note warnings

Request `28b878ed0ddc0a85cd0af98a0b4e53bd7a2d9bef` adds an advisory check
for implementation notes and evidence paths in the committed landing delta.
The script and its owning tests are prepared. Gate integration and execution
are pending.

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

The gate hook is held until the documentation-link step lands. The reviewed
hook then runs the advisory check immediately after `doc-links`, using the
gate's existing merge base, and prints its warning log. This checkpoint does
not change `scripts/gate.sh` or add the documentation-link checker.

## Evidence

This is a Source checkpoint. No Node process, test fixture, compiler, parser,
dependency preparation, control, or gate has run for it. The proposed script
and owning test were copied byte-for-byte from the reviewed Source packet.
Only the reviewed Node-list and documentation hunks were applied to Main.

| Check | Command | Exit code | Output digest |
|---|---|---|---|
| Warning behavior, three whole-file cases | `node --test scripts/check-notes.test.mjs` | Pending | Pending |
| Existing test orchestration | `node --test scripts/test.test.mjs` | Pending | Pending |
| Integrated ordinary gate | `npm run gate` | Pending | Pending |

Request `28b878ed0ddc0a85cd0af98a0b4e53bd7a2d9bef` owns the remaining gate
hook, validation, final evidence manifest, and review. This change adds no
Worker setting, binding, migration, or deployment action.
