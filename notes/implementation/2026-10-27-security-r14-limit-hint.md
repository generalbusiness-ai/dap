# Judge usage-query truncation by returned groups

## What changed

The usage-report parser ignores `rows_before_limit_at_least` when deciding
whether a query is incomplete. It accepts at most 8,192 returned groups;
the query still asks for 8,193 so an extra group causes refusal. The provider
figure describes source rows before aggregation, not returned groups.
The usage guide states this distinction.

The existing decoder witness now includes the envelope and numeric types
reported by the planner: 67 groups, numeric `rows`, six String label columns,
UInt64 decimal strings, UInt32 counters and timestamps, Float64 aggregates,
and `rows_before_limit_at_least` of 350,918. Its values are authored TEST
inputs. It does not retain account data or execute provider SQL. The paired
cap-plus-one response must still refuse.

## Decisions and why

This delivers request
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:686f4ec9328d19f727e7f5e1352d0b550e6c595c`
under promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:17847f26d395949a6a71bbfc9ef8635b575f235c`.
The planner's first run, recorded in
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:98833a92685bd672dc1cda9d72b11b1dc761870d`,
returned HTTP 200 but the old parser refused because the source-row figure
exceeded the group count. This repair ignores the figure entirely rather
than adding a report field with no completeness meaning.

The local group cap remains authoritative. Response schema validation,
credential withholding, bounded input and transport, mapping checks, and
qualified coverage reporting keep their existing behavior. No telemetry,
Worker setting, dependency, native definition, route, or deployment changes.

## Evidence

The owning Node file passed all nine cases. Restoring the old rejection
produced one assertion failure in the selected decoder case; the same source
and tests were restored. The ordinary gate remains due at this preparation
checkpoint. Its results will be recorded before review. Raw evidence is retained under
`/Users/hughpyle/play/artroom-evidence/2026-10-27-security-r14-limit-hint`.
Dependencies were copied from the existing verified cache, checked against
the unchanged lock, and rebound to this worktree. No package was installed.

| Check | Command | Exit | Output SHA-256 |
|---|---|---:|---|
| Dependency view | Exact-lock copy and workspace-link verification | 0 | `03e254cbb6ace535ad66cff9ed4059bae00bf6fd94fbcf5581046250ccdea26e` |
| Owning Node file | `node --test --test-isolation=none --test-timeout=60000 --test-reporter=tap scripts/usage-report.test.mjs` | 0 | `29572a482402a28e9e7b4b547c56234a34e19401939cf0f071f14cec79665d3a` |
| Old-hint control | Same Node command with the exact decoder test selected; see retained argv | 1, expected assertion | `7387e11a601eab3b2e4a796257b6fc6baa230734a74a58ead439956bbb99ff9b` |

## Open limits

The planner reruns the repaired script and files the first complete report
under parent R14 `bb763efa`. Builder tests do not establish live SQL
compatibility or coverage of account data. Individual route, native-version,
and feature gaps remain owned by that parent. Ready archive work under
`0f0eeab7` retains priority. Exact-head review and landing remain due.
