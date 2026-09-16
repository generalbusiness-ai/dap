# O3 planned handover evidence

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:5ac2d896497117bc9cae0ca5c8e9d6375d092de3`.

The O3 experiment retains the O1/O2 durability and retry contract and adds a
separate v2 profile. The expected sequence is H, retiring-writer seal at H+1,
control-key assignment at H+2, successor entry at H+3. Payload predecessor
links name envelope commitments; authenticated header predecessor links name
header hashes. Existing v1 vectors and visibility model IDs are preserved.

Before the measured run, the test cases require:

- The same genesis, dense positions, immutable old prefix, invitation retry,
  control verdicts on submit/retry/cold replay, and saved outbox publications
  through handover on both memory and SQLite.
- Actual child-process SIGKILL during both seal and assign at before-commit,
  after-commit and after-receipt. Uncommitted control attempts leave no partial
  state; committed controls recover the original receipt. After a seal, only
  assignment can resume work.
- Two ordinary nominations do not authorize either candidate. Two signed
  assignments against one seal can install only one successor.
- Refusal of forged envelopes, wrong signing authority, old or swapped
  predecessor hashes, skipped seals, wrong epochs and malformed or reused
  successor keys, without append/retry/outbox mutation.
- Cold authentication rejects a cryptographically signed control payload
  carrying the wrong predecessor, and rejects the wrong header predecessor.

Runtime code and tests will be committed before the first measured execution.
Results below will preserve any failures and identify every later repair.
Before execution, the parent reconciled the design system-kind table with
ordering §6: both seal and assign actor envelopes require the control key;
the retiring writer appends both and signs their headers. This corrected the
first implementation before any measured test run.

## Limits

This is one host and one authoritative SQLite file. It does not establish
Byzantine fencing, replicated durability, automatic failover, fairness or
freshness. It tests one control key, an unchanged profile, and new successor
keys; a key cannot be reinstated. The F0 application fold does not decide
ordering authority. O4 transfer execution and O5 independent verification
remain separate tasks.

## Run 1

Source: `3cdd1f3bbbf02289ea0d7dc394dcca4fa3e22801`, including O2
`b6d156163285c8eaab3d05766dd9b0de35fef79b` and final O1. The exact command was
`node --test test/ordering-handover.test.ts test/ordering-retry.test.ts test/journal.test.ts test/codec.test.ts test/ordering-lifecycle.test.ts`,
followed by `npm run typecheck`. Raw output:
[run-1.txt](ordering-o3-runs/run-1.txt).

Seventy tests executed: 69 passed, one failed. All 11 O3 tests passed, including
all six child-process crashes. The existing recipient-view test expected the
error text `wrong writer`; O3 had changed it to `wrong initial writer`. The
underlying wrong-key rejection still occurred. Typecheck passed. The repair
restores the old message substring while retaining the initial-assignment
explanation. This is one compatibility wording repair and no protocol repair.

Before the second run, the nomination test also checks a successor's open
against the actual nominated context and its journal, rather than against an
empty backend. Ordinary nominations still must not authorize it.

## Run 2

Source: `aae4051eae9b977d9b25f1a8d5e1966ddfe3bf23`. Commands: `npm test`,
then `npm run typecheck`. Raw output:
[run-2.txt](ordering-o3-runs/run-2.txt).

The full integration run executed 200 tests: 199 passed, zero ordinary
failures, and one executing/failing Club TODO retained from V5. All three
200-seed campaigns passed: Sale, Booking and Club under their frozen
manifests. This does not make the original Club admission policy pass.
All 11 O3 tests passed; typecheck passed.

After this run, O3 and O5 made the declared independent-key profile exact:
reject identical genesis writer/control keys, assigning the control key as a
writer, and extra v2 sequencing fields. Existing v1 metadata remains ignored
for assignment as before. Tests now explicitly assert that the control key is
not an application participant and holds no grants, while its valid controls
succeed. A granted member and the retiring writer without the control key are
refused. The nomination case checks the actual journal. These changes will
receive a focused ordering regression run; the unchanged visibility campaigns
will not be rerun solely for this schema validation tightening.

## Run 3

Source: `8756c233463e2fdf1428902e072e525aed3b6604`. The same five-file
focused command as run 1 executed 71 tests: all passed, including 12 O3 tests.
Typecheck failed in the newly added negative-genesis test: TypeScript inferred
an optional `epoch: undefined` on a test-case union, incompatible with JSON.
The preserved [run-3.txt](ordering-o3-runs/run-3.txt) contains the exact error.
The repair gives that test-case array an explicit JSON-compatible dictionary
type. It changes no runtime or test data. Total repairs so far: one error-text
compatibility repair and one test type annotation, with no failed protocol
case or model change.
