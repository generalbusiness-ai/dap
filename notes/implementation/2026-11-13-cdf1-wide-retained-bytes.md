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

Ruling bb6cf92b accepts the built head and withdraws the three overshoot
numbers. The faults note records its three facts: shipped platform
scopes have no rule guards; declared scopes retain whole subjects with
uncapped attribution; and the pending-work bound limits settlement count
but gives no constant on settlement bytes or retained-byte overshoot.

CDF-1 merged landed main `4cef11d2` in `82bb42da` without conflicts.
The wider accounting, its tests and the faults note remain intact. CF-2
item 1 rides as separate commit `7872d111`: the Membership 14 header and
CF-1 note now say that revoking an own agent's key needs no
`membership.own-agent` action, while removing that agent does. Executable
`base-membership.ts` bytes after the header match main.

The [AC residency manifest](evidence/2026-11-13-cdf1-residency-ac.manifest.json)
records checkpoint `7872d111b9`, its tree and the complete four-case file.
It passed once with no skipped case or runtime error. Actual escalated
power readings stayed on AC with powermode 0 throughout 37 samples,
taken every two seconds from 2026-11-14T04:39:27.092527+00:00 to 2026-11-14T04:40:41.983723+00:00. This
is a functional file result, not a completion-time guarantee or a gate.

CDF-1's stale dependency directory remains at
`/private/tmp/artroom-cdf1-old-deps-tei_ms9d/node_modules`. An APFS clone
of CF-1's verified real dependency directory replaces it. Both lock files
and both verified stamps read
`f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54`.
The clone's relative workspace links resolve within CDF-1. No package
installation, stamp fabrication or package-file change occurred. The
manifest includes that correspondence record.

| Check | Command | Exit | Output sha256 |
|---|---|---|---|
| Entire native residency file, 4 passed | `ARTROOM_TEST_PHASE=native node_modules/.bin/vitest run --config vitest.native.config.ts --project scope-stories apps/room/lanes/test/directory-partition-lanes.scope.test.ts --reporter=json --outputFile /Users/hughpyle/play/artroom-evidence/2026-11-13-cdf1-residency-ac/native-results.json` | 0 | `f8c8008ed77953c327b005be427977dc694a6e475f2a3041ab3f268e9f03007d` |

CDF-1 still owes its gate and the Security conclusion. The wider cap holds the cutover deployment. RB-1 (request 0ce66e16)
accepts audit 7f6f6834's finding: no constant bounds one rule row or one
item because whole subjects include uncapped attribution. There is no
finite overshoot product to report. RB-1 owns the design for those
ceilings and matching replay checks, after the client chain and H1. It
requires a planner ruling before code and kernel review, and does not
hold the cutover deployment. FL-1 owns the journal count limit and does
not hold the cutover deployment.
