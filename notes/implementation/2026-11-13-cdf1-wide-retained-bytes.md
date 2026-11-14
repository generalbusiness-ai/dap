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

Every run below used actual Battery Power with powermode 0. No native
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

CDF-1 still owes the four failing-at-5339ccc5 witnesses, the raw-proof
residency check on AC, and its gate after CF-1. The wider cap holds the
cutover deployment. Audit act 7f6f6834 asks the planner how to state a
finite rule-row overshoot: whole subjects include uncapped attribution,
so a finite product needs another bound. Ruling 9753818f leaves a new
per-row ceiling to separate kernel work. FL-1 owns the journal count
limit and does not hold the cutover deployment.
