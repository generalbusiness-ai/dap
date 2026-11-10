# Workroom references in reader pages

This note records the paragraphs of reader pages that named a ruling, a
review or a workroom role, as `docs/security/`, `docs/testing-reference.md`,
`docs/evidence-filing.md` and `SECURITY.md` held them until 10 November 2026.

## docs/security/threat-model.md

The `verified-genesis` qualification is the accepted R2 boundary in planner
ruling `2c18d9be`. The software does not promise zero target SQL for a native
creation that passes serving admission and then fails judgment. The index's
fixed owner is another object; its lookup witness checks real SQLite and
read-only lookup separately. A register-mode backfill or an enforce-mode
rollout needs its own [operator evidence](../../docs/deploy.md).

## docs/security/entry-points.md

Under ruling `67b1fb7f`, a Destination object admits at most eight open
read-token reservations per authenticated member. The already judged
grant's subject supplies the full Membership ScopeRef and member identity.
Several keys of one member share the bucket. Neither a caller key nor a
principal or handle prefix chooses it. The full Destination ScopeRef also
partitions storage, so neither incarnation shares a bucket.

## docs/security/settings.md

The O4 configuration deploys `dap-connect` with hosted MCP closed. Its sole
register placeholder needs an own-agent install plan. Its four Durable
Object namespaces and private content bucket belong only to this Worker.
The planner supplies a fresh session secret and the reviewed application
trust before the witness setup; [the O4 runbook](2026-11-10-o4-connect-runbook-record.md) records
the deployment and live-window sequence.

## docs/security/trust-boundaries.md

The file sets `DEPLOYMENT` to `dap-connect` and the index to enforce.
`REGISTER_SCOPE` remains `PLANNED_O4_REGISTER_SCOPE`; the planner replaces
it from the own-agent plan. The operator supplies a fresh `SESSION_SECRET`.
The explicit creation cohort is Register 27, Directory 26, Membership 13,
Rules 10, Destination 20 and Inbox 1.

## docs/security/trust-boundaries.md

`MCP_ENABLED` is explicitly false. The MCP resource URLs, card origins and
application trust row configure the intended O4 surface but do not open it.
`APPLICATION_SCREEN_HOSTS` is empty. Hosted grants and agent seeds live in
this Worker's MCP objects, not the content bucket. The
[O4 runbook](2026-11-10-o4-connect-runbook-record.md) owns deployment and the live test window;
this file proves neither a live route nor a completed host test.

## docs/testing-reference.md

Planner ruling `ea2e17ab` leaves shared inputs off the trigger list:
`fixtures-native.ts`, `test/worker.ts`, `test/outside.ts`, the room test
support, `sqlite.ts` and the rest of derive. The
[main scale workflow](../../.github/workflows/scale-tests.yml) runs the complete
scale project after every push to main, including each landing, and catches
changes through those shared inputs. A review outside the listed paths
therefore establishes no scale result. The unchanged witness bodies retain
their earlier acceptance meanings.

## docs/testing-reference.md

Planner ruling `38d61076` gives the slower main GitHub runner a deadline
factor of three. Only the main scale workflow sets
`ARTROOM_SCALE_DEADLINE_FACTOR=3`; the local and review gates leave it
unset and retain the original deadlines. The factor changes each case's
harness allowance, including the thirty-second measurement. It changes
no test body, entry count, bound, or assertion. The workflow allows ninety
minutes for the complete job.

## docs/evidence-filing.md

The rule applies to heads filed after ruling `fcab078d` of 25 October
2026. Notes, evidence files and manifests already in the tree stay as
they are. The gate's `notes` step checks the committed base-to-head file
changes. It warns on each added or changed file under
`notes/implementation/` over 40,960 bytes, and on each added path under
`notes/implementation/evidence/` whose name does not end in `.manifest.json`.
A new name counts as an addition. Unchanged and deleted historical paths
produce no warning. The check reads Git objects, not working-tree files.
Warnings exit 0. Git, missing-base, and decoding errors exit 2. The check
does not verify manifest contents or replace the reviewer's evidence check.

## SECURITY.md

Planner review `6dd06d03` records the 21 October attack-surface findings at
`603220b9`. Its remediation requests and later exact-head checker reviews
live in the repository's gitseq workroom. The
[delivery note for the settings, trust-boundary and definition-author pages](2026-10-24-security-docs-partial.md)
and the [completion note for the threat model](2026-11-09-security-docs-d6.md)
name the documentation evidence. A review of one commit proves no later
commit or deployed configuration.
