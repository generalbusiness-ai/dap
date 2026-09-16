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
