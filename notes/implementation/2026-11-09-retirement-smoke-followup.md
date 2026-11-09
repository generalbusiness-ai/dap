# Keep the local proxy smoke aligned with pending retirement

Request `a6a57ffb`; promise `40a2162d`.

## What changed

The standalone Local Worker proxy smoke now requires the exact R15 result
for an empty-body retire: `202`, pending, not retired, endpoint disabled,
seed erased and `revoke-required`. It also checks that the old bearer gets
`401`. The report records both results. The script supplies no revoke
envelope and claims no complete membership revocation.

## Why

R15 main `c9583a00` correctly returns pending retirement without a revoke.
The separate smoke script still expected `200`. Its first automatic main
run failed at that stale assertion after successful creation and rotation.
No runtime code, setting, pin, Native meaning or dependency changes here.

## Evidence

| Check | Command | Actual result and manifest SHA-256 |
|---|---|---|
| Original CI at `c9583a00` | Local Worker smoke `42619666050`, attempt 1 | Failed script exit `1`, actual retire `202`; [manifest](evidence/2026-11-09-r15-failed-main-smoke.manifest.json) `69a5c9f76b04deda526ca8bd72f582fb19f973dca105981d344915c05a7bc12b` |

The original failed CI stays failed. Focused Node owner, actual proxy smoke
and the required gate remain due. No test or workflow retry has run.

## Open limits

Exact-head review and routine landing remain due under `a6a57ffb`.
The planner deploys. This script-only change supplies no deployed-room or
complete-revocation acceptance result.
