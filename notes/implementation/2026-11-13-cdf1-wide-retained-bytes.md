# Count all retained canonical bytes

CDF-1 now counts every row of `retained_input` and `retained_value` once
per key under `scopeBytes`. Insertions add their canonical byte length.
Text redaction subtracts it. An older store fills the counter with one
atomic sum and insert. The counter excludes `retained_birth` association
keys and physical database overhead.

Planner ruling 9753818f folds CDF-2 into CDF-1 before its gate. The stop
matches `fits` for admitted settlements, timed entries, diagnoses,
outcomes, controls and non-conflict results. Their bytes still count.
The source review before seal adoption found no queue, timed-drain or
outside-effect lifecycle change. The contract change is a comment.

The [focused evidence manifest](evidence/2026-11-13-cdf1-wide-focused.manifest.json)
records the initial native checkpoint `7d9506cb72` and follow-up
`ba05343e1e`. The follow-up changes only the new owning test file: its
first act now names the primary revision, and its directory creation
intent uses `found`. Source and the other three test files match the
initial checkpoint.

Every positive run below used actual Battery Power with powermode 0. No native
case timed out. These are functional checks, with no AC gate or residency
timing claim. Raw logs retain separate failed and repaired outcomes.
The JSON sidecars record each command's start, end and process exit.

| Check | Command | Exit | Output sha256 |
|---|---|---|---|
| Contract compiler | `node_modules/.bin/tsc -p packages/contract/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Initial scope compiler | `node_modules/.bin/tsc -p packages/scope/tsconfig.json` | 1 | `bffca4cbc42320f2c4831c49630ecbcf4a36d2d31ce7ce5235e3f468e45c77d5` |
| Scope compiler after domain-narrowing repair | Same command | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Scope test compiler | `node_modules/.bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Reviewed source seals, 12 passed | `node --test scripts/security-entry-points.test.mjs` | 0 | `78ecb56f6d37472119a8e502a3986553e8b382ca2a19f87cd54cf80418ec4e1e` |
| Four native files, 34 passed and 2 fixture failures | `ARTROOM_TEST_PHASE=native node_modules/.bin/vitest run --config vitest.native.config.ts --project scope packages/scope/test/capacity-retained-rows.test.ts packages/scope/test/capacity-retained-births.test.ts packages/scope/test/capacity-confirmation.test.ts packages/scope/test/turn.test.ts` | 1 | `6c2a537dd8876add8d093f91bfd8e0e741705e572f7cf19d921c08cd28b4987a` |
| Follow-up test compiler | `node_modules/.bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Repaired owning file, 4 passed | `ARTROOM_TEST_PHASE=native node_modules/.bin/vitest run --config vitest.native.config.ts --project scope packages/scope/test/capacity-retained-rows.test.ts` | 0 | `5092840cc6a74d02f02339d9745e6abca4ff8ddb004c47545c651cfd38123849` |

The [baseline manifest](evidence/2026-11-13-cdf1-wide-baseline.manifest.json)
records a detached worktree at exact `5339ccc508`, its tree, and the hashes
of two overlaid witness files. Production and configuration stayed at
that baseline. The tests read the actual stored counter under either meta
key, so the renamed API needs no adapter. The positive head `9e716d4cf0`
and its clean tree stayed untouched.

The baseline compiler passed. One native child ran the four named
witnesses and exited 1: four assertion failures, no passes, 27 unselected
cases and no runtime-error suite. Actual power was AC and charging, with
powermode 0. The rule-cap act was accepted. The stored value total was
1,416 instead of 4,248. Redaction left 0 instead of subtracting its 10
canonical bytes. The old-store fill gave 19 instead of 122. These are the
four missing invariants, not setup or API failures.

The original outer controller exited 2 because its result filter counted
`skipped` statuses as selected. A separate offline parser selected the
four `failed` statuses from the original JSON and confirmed the four
assertions. It reran no test. Both controller outcomes remain in the record.
The exact native command vector, including the four full title patterns,
is `baseline-native.json` in that manifest.

| Check | Command | Exit | Output sha256 |
|---|---|---|---|
| Baseline compiler | `node_modules/.bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Baseline native controls | Command vector in `baseline-native.json` | 1 | `5df4d9d746ebc7ee7c9cfdf989308b77624e031eafa6331722d86d0c15bf8678` |
| Offline reviewed result selection | Read original `native-results.json`; retain `passed` and `failed` statuses | 0 | `024fa0d05efaf1deb7f506a20170435452af2c157b9f58649f8652447300df16` |

CDF-1 still owes the raw-proof residency check on AC and its gate after
CF-1. The wider cap holds the cutover deployment. RB-1 (request 0ce66e16)
accepts audit 7f6f6834's finding: no constant bounds one rule row or one
item because whole subjects include uncapped attribution. There is no
finite overshoot product to report. RB-1 owns the design for those
ceilings and matching replay checks, after the client chain and H1. It
requires a planner ruling before code and kernel review, and does not
hold the cutover deployment. FL-1 owns the journal count limit and does
not hold the cutover deployment.
