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
indexes all 68 files in one read-only delivery directory, including its
`SHA256SUMS`. The original capture directories and their metadata are kept.
The `owning/`, `gate-v1/` and `gate-v2/` prefixes below distinguish the runs.

Owning execution checkpoint: `9a6671ab3030792834960b964f27c028570b4428`,
tree `f36021a293cabc28aa0038ce6d7ee94a4e87459a`. Both ordinary gates ran at
`f4735c5435224d9dbe828099cc280a6e3adef1b2`, tree `849083ea95a3630556531dd6ac7d441632a2c83d`.
This final note and manifest are documentation-only changes after the gate.
No source or test changes after the passing gate are implied.

| Check | Command | Exit and outcome | Output SHA-256 |
| --- | --- | --- | --- |
| CLI test compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`owning/compiler.stdout`; stderr also empty) |
| Whole owner file and real tag-rewrite control | `node scripts/control.mjs apps/room/wrangler.jsonc '{ "tag": "v3", "new_sqlite_classes": ["ScopeIndex"] }' '{ "tag": "rewritten-v3", "new_sqlite_classes": ["ScopeIndex"] }' --expect 'deployed room migrations retain their original content and order' -- . --config vitest.plain.config.ts --project cli packages/cli/test/demo-config.test.ts` | 0; baseline 2 passed, faulty child 1 failed and 1 passed; intended prefix assertion failed | `57a147ab8662ff8d22a613c0091c5d5d96c503ad18b0b3fb9eb948da9e2f3a31` (`owning/migration-control.stderr`) |
| File restoration and owning execution binding | Capture owner compares SHA-256 and Git modes of the test and all four config files before and after; records head and clean status | 0; all five files restored and head unchanged | `e07c2fddadfca87517b191ff6445528f5c857303876e11d692f4773ec55af3ed` (`owning/result.json`) |
| Ordinary gate V1 | `npm run gate` | 1; static checks and compilers passed, pretest refused symlinked module root; all test stages unreached, zero observed cases | `a1d3eff557cc0bca338d421a02119b95e80a9ba760afe6c84a8785cf01af04ed` (`gate-v1/gate.log`); `9dbed439ad6a986f99a4c7f4ea813688632962ebf8361e36113344ced6777f2b` (`gate-v1/result.json`) |
| Ordinary gate V2 | `npm run gate` | 0; every gate step passed, phase counts below | `d6d697029cc2edabfa26c69603675b4e52b8be7ae8c10e4049455f028999eec0` (`gate-v2/gate.log`); `21d5db37e40b1c60a2b1efc6385918f1bb9c6ef726984d6b79f58e9efbcc8c48` (`gate-v2/result.json`) |

Gate V1's first failing line was
`Cloudflare pool compatibility requires owned real node_modules.`
It remains failed. Its dependency view was a private copy of the existing
earned external installation, with all 14 workspace links rebound to BR9.
Pretest required that copy at a real checkout `node_modules` path. Moving
the same copy there repaired the topology without package installation,
source changes or a cache reset. The retained dependency-provenance records
state the verified lock correspondence and the paths before and after the move.

Gate V2 passed kernel, Node, Counting, plain and native stages. The maintained
terminal records report Node 56 passed, Counting 55 passed, plain 2,817
passed and one skipped, and native 771 passed and two skipped. There were
zero reported unhandled errors in the plain and native final callbacks.
The two native skips and one plain skip remain skips.

Raw callback evidence stays distinct. Plain has 2,818 ready, result and
final identities. Native has 756 ready, 753 result and 773 final identities:
17 terminal cases lack ready callbacks and
20 lack result callbacks. Those gaps are unknown, not reconstructed.
The gate's maintained terminal summary reports complete terminal evidence;
that does not turn the raw callbacks into complete progress observations.
`terminal-observations.json` records the counts and exact missing identities
by reading the original JSONL event types and matching project, file and ID.
Its SHA-256 is `387d11529a4aca6d52d9096777e22ab6eed9d7e5acb035ddc09620ec49ceda02`.

The gate ran while Main and origin/main moved from
`9daa037e1976fa0e245192823cce96fc8741360d` to
`6852f78d3279ef13a33b7b9d0b283e9ba96f079f` for the separate R7 landing.
The candidate remained at `f4735c5435224d9dbe828099cc280a6e3adef1b2` with a clean status
before and after. Its 14 workspace links resolved to BR9, so the measured
source did not follow Main's movement. This is the BR9 gate on its original
base, not a run of a later composed R7 and BR9 candidate.

The capture owners measured elapsed time with a monotonic clock and child
CPU with `RUSAGE_CHILDREN`. Owning compiler: 0.84 seconds elapsed and
1.57 child CPU seconds. Paired control: 1.20 seconds elapsed and 1.12 child
CPU seconds, including both nested Vitest runs. Gate V1: 18.34 seconds
elapsed and 45.23 child CPU seconds. Gate V2: 1431.83 seconds elapsed
and 1661.27 child CPU seconds. These are separate measured command spans,
not an aggregate across runs or portable benchmarks. The V2 test step alone
printed 1,413.8 seconds elapsed and 1,614.7 CPU seconds; it is nested within
the whole V2 gate and is not added again.

The gate machine was `macOS-27.0.1-arm64-arm-64bit-Mach-O`, Node `v26.12.1`.
V1 initial load averages were `[1.90966796875, 1.92333984375, 1.98779296875]`; V2 started at
`[1.728515625, 1.82421875, 1.93505859375]`. Earned caches were reused. The earlier owning
checks used the original shared-module symlink; their separate load and
cache records remain in `owning/result.json`. No new packages were installed.

## Open limits

Request `eca4329c` owns exact-head checker review and assessment of clean
composition with the later R7 landing. Gate V2 passed at its recorded
checkpoint; V1 remains failed. Only this note and its manifest change after
V2. No approval, landing, deployment or passing combined-head gate is claimed.

The witness checks source files. It does not query the provider's deployed
migration history or validate a future appended migration's Wrangler grammar.
Those limits remain within the same request's source-check scope. A future
reviewed deployment should extend the pinned history when its new step
becomes historical. A configuration-only edit needs this owner file or the
full gate because the files are read at runtime rather than imported.
