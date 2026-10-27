# Judge usage-query truncation by returned groups

## What changed

The parser ignores `rows_before_limit_at_least` entirely. That provider figure
counts source rows before aggregation, not returned groups. The query still
asks for 8,193 groups and the decoder refuses more than 8,192. The guide states
the distinction and keeps repaired live compatibility pending the planner's rerun.

The existing decoder case reconstructs the reported envelope: 67 groups,
numeric `rows`, String labels, UInt64 decimal-string counts, UInt32 counters
and timestamps, Float64 aggregates, and hint 350,918. Every value is scripted
TEST data. The paired cap-plus-one response still refuses.

## Decisions and why

This delivers request `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:686f4ec9328d19f727e7f5e1352d0b550e6c595c` under promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:17847f26d395949a6a71bbfc9ef8635b575f235c`, following planner report
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:98833a92685bd672dc1cda9d72b11b1dc761870d`. Ignoring the figure avoids
assigning completeness meaning to a source-row count. Schema, numeric, mapping,
input, credential and transport checks retain their behavior. No telemetry,
Worker configuration, dependencies, native definitions or deployment change.

## Evidence

The owning file passed nine cases. One purposeful control restored the old
hint rejection and failed the selected case through `assert.doesNotThrow`.
That expected exit 1 is separate from the passing candidate. Exact source/test
bytes were restored. The guide was then rewrapped without changing any words;
before/after hashes are retained. No package was installed.

The ordinary gate naturally passed at `9bbf4a9e572dbff78687e0fbc040dc4be483db11`, tree `b24a320feb4709b223485a6fd8b82d0749bffe5d`, with a clean
checkout before and after and no driver signal. It ran from
`2026-10-27T12:29:54.053134Z` to `2026-10-27T12:50:37.750896Z`.
Wall time was 1243.601865292 seconds. Child CPU was
2536.180754000 seconds (2300.668234000 user,
235.512520000 system). Machine: `{"architecture": "arm64", "cpus": 18, "release": "27.2.0", "system": "Darwin"}`,
Node `v26.12.1`. Load averages before/after: `[1.6064453125, 2.14501953125, 2.390625]` /
`[2.5400390625, 3.19580078125, 3.30224609375]`. Focused wall/CPU seconds were
0.897281542/0.784307000; selected control
0.128112041/0.192319000.

Actual gate totals reconcile to final identities and public stdout: node: 66 passed; counting: 55 passed; plain: 2,863 passed, 1 skipped cases, 281 passed files; native: 796 passed, 2 skipped cases, 233 passed, 1 skipped files.
Both Vitest terminals reported zero unhandled errors. Missing observations:
plain: 0 without ready and 0 without result callbacks; 0 duplicate ready and 0 duplicate result identities; native: 14 without ready and 37 without result callbacks; 1 duplicate ready and 0 duplicate result identities. Missing callbacks establish no cause, readiness or
missing duration. Concurrent case-duration sums are not wall time or CPU.
Focused checks and the control are excluded from gate totals.

Evidence is sealed read-only at `/Users/hughpyle/play/artroom-evidence/2026-10-27-security-r14-limit-hint`. Every raw file is indexed, including
`SHA256SUMS`; that index excludes itself. Only this note and its manifest change
after the tested checkpoint. All other tracked blobs/modes, including other
notes, match the gate. `gate-source-equality.json` (SHA-256 `638d6ad7aea19f174b57d7d5b51a925ca4cab2a006cd9b8d3f8d19a65a3f423d`)
records the complete file count and hashes. The final publication binds the
final head/tree separately. `analysis-run.json` retains the actual analyzer
argv, exit, timing, stream digests, and source/output digests.
Paths in the table are relative to the raw directory.

| Check | Command | Exit | Output and SHA-256 |
| --- | --- | --- | --- |
| Dependency view | `Exact-lock copy and workspace-link checks` | 0 | `setup.json`: `03e254cbb6ace535ad66cff9ed4059bae00bf6fd94fbcf5581046250ccdea26e` |
| Owning Node file: nine passed | `node --test --test-isolation=none --test-timeout=60000 --test-reporter=tap scripts/usage-report.test.mjs` | 0 | `owning-node/output.log`: `29572a482402a28e9e7b4b547c56234a34e19401939cf0f071f14cec79665d3a` |
| Old rejection: selected assertion fails | `Same Node argv with --test-name-pattern; exact argv in old-hint-control-selected/result.json` | 1 (expected assertion) | `old-hint-control-selected/output.log`: `7387e11a601eab3b2e4a796257b6fc6baa230734a74a58ead439956bbb99ff9b` |
| Exact control restore | `Byte comparison in retained focused driver finally` | 0 | `old-hint-control/restoration.json`: `e3e0ba93111277713c100988a70746aa774b6d65eefa0c27a2eb4085b9aecaa4` |
| Guide wrapping only after focused run | `Whitespace comparison and unchanged source/test hashes` | 0 | `post-test-guide-formatting/result.json`: `595d9387685468a9b4d6346e49d5f314d300b1b2f65bed84f2f51118b55b4610` |
| Ordinary gate | `npm run gate` | 0 | `ordinary-gate/output.log`: `a1de71cca3990a007d2c6a932db942075b2ae0ae47bd68cd5ae997a387266651` |
| Gate reconciliation | `Analyzer subprocess; exact argv in analysis-run.json` | 0 | `analysis-run.json`: `d320b2e3ca8a904157cad8b9bb2f1d96a6566b0295f28156a9c72208becabf2e` |
| All other tracked blobs and modes match | `Git diff, one tree inventory and direct blob hashing` | 0 | `gate-source-equality.json`: `638d6ad7aea19f174b57d7d5b51a925ca4cab2a006cd9b8d3f8d19a65a3f423d` |

## Open limits

The planner reruns the repaired script and files the first complete report
under parent R14 `bb763efa`. These scripted responses and local tests establish
no live SQL compatibility or account coverage. Individual route, native-version
and feature gaps remain with that parent. Archive work under `0f0eeab7` retains
priority. Exact-head review and landing remain due under this child.
