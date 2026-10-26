# Deployed room migration prefixes

Request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:eca4329c030d9cdabeaffb8e3adb9441a7afa4f8.
Promise: `0ba038af99bea47894bfb4375d529b86ae436e81`.

## What changed

`packages/cli/test/demo-config.test.ts` pins the migration prefixes of
`wrangler.jsonc`, `wrangler.grow.jsonc`, `wrangler.lending.jsonc` and
`wrangler.demo.jsonc` under `apps/room/`. An existing step cannot disappear,
change or move. A new step may append.

The existing CLI project already runs this whole file in the plain gate
phase. The change adds one case and replaces the older demo-only flattened
class-list assertion with the stronger whole-prefix witness. The deployed
configuration files, runtime source and dependencies are unchanged.

## Decisions and why

Each Worker keeps its own historical tags and class lists. The prefixes
copy the four files at Main `9daa037e19`, rather than deriving expected
history from the current configuration. Deep comparison covers every field
of each pinned step, including class-array order. Object-key order does
not matter. The existing JSONC reader remains unchanged.

The same witness accepts a synthetic appended class for each file and
rejects removal, a rewritten tag, and reversal where the prefix has more
than one step. The appended class is a test specimen only. The original
demo prefix still checks the four classes previously witnessed by its
flattened list. There is no new runner or configuration parser.

A paired control changes the actual `wrangler.jsonc` tag `v3` to
`rewritten-v3`, leaving its class unchanged. This fault leaves the older
class-set condition true but must fail the new history condition. The
unchanged whole file passes two cases. With the fault, the new case fails
by `AssertionError` at line 34 and its companion passes. The helper exits
0 with `DISTINGUISHES`; the faulty test child exit remains 1.

## Evidence

The [manifest](evidence/2026-10-26-br9-migration-prefixes.manifest.json)
indexes all six files in the read-only evidence directory, including its
`SHA256SUMS`. Execution checkpoint: `9a6671ab3030792834960b964f27c028570b4428`,
tree `f36021a293cabc28aa0038ce6d7ee94a4e87459a`. The note and manifest are later
documentation-only additions, not a new source-validation checkpoint.

| Check | Command | Exit and outcome | Output SHA-256 |
| --- | --- | --- | --- |
| CLI test compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`compiler.stdout`; stderr also empty) |
| Whole owner file and real tag-rewrite control | `node scripts/control.mjs apps/room/wrangler.jsonc '{ "tag": "v3", "new_sqlite_classes": ["ScopeIndex"] }' '{ "tag": "rewritten-v3", "new_sqlite_classes": ["ScopeIndex"] }' --expect 'deployed room migrations retain their original content and order' -- . --config vitest.plain.config.ts --project cli packages/cli/test/demo-config.test.ts` (exact replacement strings and argv in `result.json`) | 0; baseline 2 passed, faulty child 1 failed and 1 passed; intended prefix assertion failed | `57a147ab8662ff8d22a613c0091c5d5d96c503ad18b0b3fb9eb948da9e2f3a31` (`migration-control.stderr`); `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`migration-control.stdout`) |
| File restoration and execution binding | Capture owner compares SHA-256 and Git modes of the test and all four config files before and after; records exact head and clean status | 0; all five files restored and head unchanged | `e07c2fddadfca87517b191ff6445528f5c857303876e11d692f4773ec55af3ed` (`result.json`) |

The capture owner measured each child command with a monotonic clock and
`RUSAGE_CHILDREN`. Compiler: 0.84 seconds elapsed and
1.57 child CPU seconds. Paired control: 1.20 seconds
elapsed and 1.12 child CPU seconds, including its two nested
Vitest runs. These are separate command intervals, not one measured gate.
Machine: macOS-27.0.1-arm64-arm-64bit, Node v26.12.1. Initial load
averages: [1.88232421875, 2.140625, 2.126953125]. Existing shared dependencies and earned caches
were reused through a `node_modules` symlink without installation or reset.

## Open limits

Request `eca4329c` owns the pending ordinary gate and exact-head checker
review. The root builder will run the gate once after the active baseline
settles. No gate result, approval, landing or deployment is claimed here.

The witness checks source files. It does not query the provider's deployed
migration history or validate a future appended migration's Wrangler grammar.
Those limits remain within the same request's source-check scope. A future
reviewed deployment should extend the pinned history when its new step
becomes historical. A configuration-only edit needs this owner file or the
full gate because the files are read at runtime rather than imported.
