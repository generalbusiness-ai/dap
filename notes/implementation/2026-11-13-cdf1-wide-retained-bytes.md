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

CDF-1 still owes the Security conclusion. The wider cap holds the cutover deployment. RB-1 (request 0ce66e16)
accepts audit 7f6f6834's finding: no constant bounds one rule row or one
item because whole subjects include uncapped attribution. There is no
finite overshoot product to report. RB-1 owns the design for those
ceilings and matching replay checks, after the client chain and H1. It
requires a planner ruling before code and kernel review, and does not
hold the cutover deployment. FL-1 owns the journal count limit and does
not hold the cutover deployment.

The [final gate manifest](evidence/2026-11-13-cdf1-retained-bytes-gate-attempt1.manifest.json)
records the clean checkpoint `01bbd802261446972f5e030aa0d220eef4261cd3`,
tree `5f3c41f6410dc54b144cc2934ea597a82d17737c`. The gate passed once:
Plain 4,612 passed and 1 skipped; Native 1,149 passed and 2 skipped.
All 58 actual power samples showed AC and powermode 0. Dependency
verification skipped installation. The sealed directory holds 43 files;
its `SHA256SUMS` digest is
`b5d0027dd456ccc0ba7f41b2adabcfc67baa7d5297272e7500eb5a59969a6521`.
END 02510565 records the completed gate.

The commands below use the gate's recorded variables: `base` is its merge
base with `origin/main`; `out` holds gate output; `test_evidence` is
`$out/test-evidence`. The manifest maps each output to its preserved file.
Every source, test, configuration and dependency file in this documents-only
follow-up equals checkpoint `01bbd802`; only this note, the historical
audit qualification and the gate manifest change. No test rerun follows
these document changes.

| Check | Command | Exit | Output sha256 |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `4ac1e9f05411c171fe78cc0d7c73bbcbac7e4de7e824fcaec515f51a7047deaa` |
| Whitespace | `git diff --check -B "$base"` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Commit messages | `node scripts/check-commit-messages.mjs "$base" HEAD` | 0 | `a10de4a3f7fd57a28011b05efb9a9e5a251f0b4fe90fdef4ecb8fb0f7ed14075` |
| Commit-message tests | `node --test scripts/check-commit-messages.test.mjs` | 0 | `7ef1960f98693730398e148013773fd65a911f6e46053b0a3c9b9f96a8faaa67` |
| Shared helpers | `node scripts/check-shared-helpers.mjs` | 0 | `f8f462116d6bf13f12ca087aa4b16adf42075612a36e8aaa3439c49df97a2c37` |
| Section citations | `node scripts/check-section-citations.mjs --report "$out/section-citations.json"` | 0 | `4369c347d4d491e36f925b5e988faa3ef5aad4b9e1aeb2d8c29682f2aafd567c` |
| Citation tests | `node --test scripts/check-section-citations.test.mjs` | 0 | `949cccc0d0f3b7e0e1e53de4586c783074ceab6865500f3f723969001e31215d` |
| Document links | `node scripts/check-doc-links.mjs` | 0 | `e738f746a19fabbb74101a21ca6e83400052cd0c46d58e10823059c8c7aa818b` |
| Notes | `node scripts/check-notes.mjs "$base" HEAD` | 0 | `35f5140f008ef3bf10327a6430f244281b40bdfa97fd8e95da1c9634089d74d1` |
| Format | `npm run format:check` | 0 | `6b858014bbe6926fbcfb41b3c9377ec28b3138bf83ce53de8790e5ed46af9d79` |
| Typecheck | `npm run typecheck` | 0 | `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a` |
| Definition pins | `node --import tsx scripts/check-definition-pins.mjs` | 0 | `bd28555b9a9732edeacecee13a09ed72181232fd1fe7359692cc19b8df544672` |
| Tests | `npm test -- --gate --defer-summary --evidence "$test_evidence"` | 0 | `574182faa9111a2598456c8635b59f83b1f5b624364fd8310e59e2d546bb0489` |

## Post-gate document checks

The historical-audit qualification and gate evidence at `9c64eeb7` change three paths under `notes/`. All source, tests, configuration and dependencies equal gate checkpoint `01bbd802`. The [document-check manifest](evidence/2026-11-14-cdf1-doc-checks.manifest.json) seals these checks. This final commit adds only this note and that manifest.

| Check | Command | Exit | Output SHA256 |
|---|---|---|---|
| whitespace | `git diff --check 01bbd802 9c64eeb7e2569549de212058238206b7f62e3236` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| doc-links | `node scripts/check-doc-links.mjs` | 0 | `e738f746a19fabbb74101a21ca6e83400052cd0c46d58e10823059c8c7aa818b` |
| notes | `node scripts/check-notes.mjs 4cef11d2 9c64eeb7e2569549de212058238206b7f62e3236` | 0 | `35f5140f008ef3bf10327a6430f244281b40bdfa97fd8e95da1c9634089d74d1` |
| commit-messages | `node scripts/check-commit-messages.mjs 01bbd802 9c64eeb7e2569549de212058238206b7f62e3236` | 0 | `e961aa82d898e3425096da8901160f918cd74166d8c76fd918aaac9c3386377d` |
