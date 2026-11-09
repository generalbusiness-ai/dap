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
| Original CI at `c9583a00` | Local Worker smoke `42619666050`, attempt 1 | Failed script exit `1`, actual retire `202`; [manifest](evidence/2026-11-09-r15-failed-main-smoke.manifest.json) `80dc350cc41287eca0d658f3cff0a1a7806cd4d30f4a81ae65516e055e0e5a37` |

The original failed CI stays failed. Its manifest now also names the verified
main tree and this follow-up's request and promise; raw files stay equal.

The complete five-case Node owner passed at `8613548a`, tree
`817ff89834e22b117b7cde5e545f19ac70fdcb60`: actual exit `0`, tracked source
equal, process group closed. One distinct branch-dispatched actual proxy
smoke, [run 42620457832](https://github.com/generalbusiness-ai/dap/actions/runs/42620457832),
passed attempt 1 at the same head. Its actual receipt confirms pending
retirement `202` and former-bearer refusal `401`. No CI run repeats.

| Check | Command | Actual result and manifest SHA-256 |
|---|---|---|
| Focused owner and branch proxy CI / `8613548a` | `node --test scripts/celld-smoke.test.mjs`; workflow dispatch `42620457832` | Node `0`, five passes; CI success, pending `202` and bearer `401`; [manifest](evidence/2026-11-09-retire-smoke-pre-gate.manifest.json) `054bbef1a1fd0ca60ac38f0711bf052982396b96289692586c2553798fd0ce4d` |

The Node driver's outer monotonic time is 1.836 seconds; its child CPU and
wall time remain separate in `node.time`. It uses this Mac's owned physical
dependency clone, pinned Node 26.13.0 and a clean process preflight. CI uses
the workflow's pinned Linux runtime. These establish no deployed-room or
complete-revocation result. One required full gate remains due.
Only explanatory note and manifests differ from `8613548a`.

## Open limits

Exact-head review and routine landing remain due under `a6a57ffb`.
The planner deploys. This script-only change supplies no deployed-room or
complete-revocation acceptance result.
