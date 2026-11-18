# Check the formal source hashes in pins

CV-1 makes `npm run pins`, and so every gate, check that the source files
behind the formal models still match the hashes the models were checked
against. It also refreshes three hashes after a review of every commit that
changed those files.

## What the guard does

`verification/state-machines/coverage.json` maps each formal model to the
source files it describes. For each file, the record holds a SHA-256 hash
of the file and the commit at which the model last matched the source (the
sync commit).

Before CV-1, only `verification/state-machines/check.mjs` compared those
hashes, on its ordinary route (lines 32 to 35). Its `--source` route exits
at line 31, before the comparison. The gate ran neither route, and no pins
step read `coverage.json`. A green gate therefore did not show that the
hashes matched.

`scripts/check-formal-source-hashes.mjs` is now the first pins step,
`formal-sources`. It reads the bytes of all eight mapped files and compares
their hashes with `coverage.json`. The eight files belong to five models:
Transport (two files), Observation (one), Editor (two), Effects (two) and
Voice (one). The script uses built-in Node only. It imports no product
code, starts no subprocess and writes nothing. A failure names the file,
the model and the refresh command.

To refresh a model after a reviewed change, run:

```sh
node scripts/check-formal-source-hashes.mjs --refresh Model
```

The refresh reads each mapped file at `HEAD` from Git. If any mapped file
in the working tree differs from `HEAD`, it refuses and writes nothing.
Otherwise it updates the selected model's hashes and sync commit and leaves
every other record unchanged. Before a refresh, the author confirms that the
changed file still meets the model's premises, and the commit message
states that confirmation. Review checks that sentence; the script cannot.
A refresh does not show that the model holds.

`scripts/check-formal-source-hashes.test.mjs` tests the script in a scratch
repository:

- The check passes before the scratch directory is a Git repository.
- A changed mapped file fails the check, and `coverage.json` stays
  unchanged.
- A refresh with an uncommitted change refuses and writes nothing.
- After a commit, a refresh binds the selected model to that commit and
  leaves the other records unchanged.

`scripts/test.mjs` adds this test to the Node stage. The other pins steps
and their order do not change.

The script took 0.077 s when run directly. One pins run took 17.8 s with the
step and 16.7 s without it. Both runs are within the 60 s pins budget. The
1.1 s difference includes start-up and cache effects, so it does not
measure the script alone.

## Which hashes changed and why

Three files changed after the Editor and Effects sync commits. Their
reviewed hashes are:

| File | Model | New SHA-256 |
| --- | --- | --- |
| `packages/scope/src/operations.ts` | Effects | `b33908e9a65901298d6d6ca3b11c3dadb0888891591874ccd369a9011e19cf3b` |
| `packages/scope/src/sqlite.ts` | Effects | `c012365221f0695050a8f891fc40f95942753ad199173c30af4e9f6da8c299b6` |
| `apps/room/page/src/retained-editor-data.ts` | Editor | `6e620c3377e6041a9cf935b0f7bc4f733bd6ebf1738c1585a4b751be26cc0498` |

The Editor reducer keeps its hash,
`159a82608a78b04f3849d10bcb5a5f2f8a7c6c0dcae69f932636cf3e0b688141`.
Transport, Observation and Voice keep their records.

The review covered every commit that changed these three files between the
sync commits and main `6728059211cee75dc0f6fdd104ef52a44c5f7da0`: 41
file-and-commit records and 77 comparisons with a parent. The review
compared each merge with each of its parents, not only the first parent.

### Effects: the one-attempt send model still holds

In `operations.ts`, one change reaches the current file: when retention is
unavailable, the result now carries more detail: `scope-full` and a name.
The result stays "unavailable". The other changes appear in merges whose older parent
predates the sync commit. Those merges bring the file to the sync version
that the model already covers. The bodies of `#pass`, `#send`, `#answer`
and `#offer` equal the sync version.

In `sqlite.ts`, the changes count the bytes of retained entries: first one
payload kind, then all of them. The body of `markSent`, the attempt table
and the `attempt_due` index do not change. Merges from older parents adopt
the genesis identity keys and also bring the file to the sync version.

No change adds or removes a modeled action, guard or state variable. The
model still holds its order: mark the send, read the mark back, then send
the queued call once. A restart does not send again. Payload byte counts
and quota stay outside the model.

### Editor: the receipt still comes before progress

In `retained-editor-data.ts`, merges from older parents bring one change
from before the sync commit: `supports` accepts one more spelling of the
rules scope. That change affects preparation only.

After the sync commit, `isEntryBodyOf` replaces `entryHash` in the identity
checks. `verifiedCollectedSource` is on the path that continues an edit:
`continueEdit` waits for it before it prepares the manifest, and
`keepStep` checks it again before it retains the step. The new check can
accept or refuse different sources than the old one, and the review does
not prove the two equivalent. Source authentication stays outside the
model's `EvidenceBeforeProgress` property.

The bodies of `continueEdit`, `keepStep`, `runStep`, `verifyStep` and
`checkEditRequest` do not change. `runStep` still waits for verification
before it records the receipt, cleans up and reports progress.

A matching hash detects that a file changed. It does not prove that the
code refines the model or that a source is authentic.

## Where the audit lives

All paths are under `artroom-evidence/`.

- `2026-11-16-cv1-source-correspondence/retained-inputs/` holds byte-exact
  copies of the review inputs: the history export (every commit, parent,
  patch and blob, with its `manifest.json`), the Effects audit, the Editor
  audit and the reducer supplement. `retention-manifest.json` lists the
  140 copied files and their hashes.
- `2026-11-16-cv1-model-statechart-attempt1/` holds the model checks. The
  Editor check passed: 7 distinct states, no error, and its source property
  held. The Effects check passed: 7 distinct states, no error. Its source
  witness passed 1 test and skipped 10 by design. Both statecharts match
  the charts in the repository byte for byte.
- `2026-11-16-cv1-pins-comparison-attempt1/` holds the two pins runs that
  give the timings above.
- `2026-11-16-cv1-gate/` holds the gate. The gate on head
  `9f2324dced4e1b92582e7c18bf37347d10339326` (START `b0dc4702`, END
  `093be55e`) passed: Plain 4985 passed and 1 skipped; Native 1175 passed
  and 2 skipped; Node 214 passed. Native included the six scale cases,
  because the head changed `scripts/test.mjs`. No crossing was lost.

CV-1 landed as main `447e9b1a`. It adds no model and no control.
