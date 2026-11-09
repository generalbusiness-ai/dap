# Keep the local proxy smoke aligned with pending retirement

Request `a6a57ffb`; promise `40a2162d`.

## What changed

The standalone Local Worker proxy smoke now requires the exact R15 result
for an empty-body retire: `202`, pending, not retired, endpoint disabled,
seed erased and `revoke-required`. It also checks that the former bearer
gets `401` and records both results in the report. The script supplies no
revoke envelope and claims no completed membership revocation.

## Why

R15 main `c9583a00` correctly returns pending retirement without a revoke.
The separate smoke script still expected `200`. Its first automatic main
run failed at that stale assertion after successful creation and rotation.
The new check requires the complete pending result instead of accepting
several status codes. No runtime, setting, pin, Native meaning, dependency,
allowance or workflow changes here.

## Final evidence

The first failed CI stays failed. Its metadata and complete failed-step log
remain immutable. The failure manifest adds the verified main tree and this
follow-up's request and promise; all original raw files stay equal. GitHub
reported a private runner scratch path, but this packet claims retention of
the captured metadata and logs only, not the runner's scratch directory.

The complete five-case Node owner passed at `8613548a`, tree
`817ff89834e22b117b7cde5e545f19ac70fdcb60`, with actual exit `0`, tracked
source equal and the process group closed. A distinct branch-dispatched
[actual proxy smoke, run 42620457832](https://github.com/generalbusiness-ai/dap/actions/runs/42620457832),
passed attempt 1 at the same head. Its retained receipt confirms retirement
`202`, pending `true`, former bearer `401`, configured create `201`, rotation
`200`, two initialized sessions and two room calls. No CI run repeats.

One complete `npm run gate` passed at `ffaebf4a`, tree
`33c964df98960adbf29491b6a5bcede8db7f4634`. I read the actual `gate.exit` as
`exit 0`. Every fixed step passed: Node 142, Counting 56, Plain 4,028 plus
one skip, Native 1,117 plus two skips. Reports show no contradiction,
failure, report error or unhandled error. The 102 unknown observations are
34 Node file wrappers, not unresolved leaf cases. Scale correctly omitted
because no changed path belongs to its families; no archive attempt or pass
follows. Tracked bytes stayed equal and the owned process group closed.

The planner deployed R15 first and closed the window in `ffd6f8d5`.
Priority START 26 and END 27 were read and acknowledged. No local validation
ran during that deployment. The gate then ran alone with owned dependency
and Vite state, pinned Node 26.13.0, TypeScript 7.0.2 and Vitest 4.1.12.
Process samples found no other validation body; samples do not establish
continuous machine exclusivity.

| Check / checkpoint | Command | Actual result and manifest SHA-256 |
|---|---|---|
| Original CI / `c9583a00` | Local Worker smoke `42619666050`, attempt 1 | Failed script exit `1`, actual retire `202`; [manifest](evidence/2026-11-09-r15-failed-main-smoke.manifest.json) `80dc350cc41287eca0d658f3cff0a1a7806cd4d30f4a81ae65516e055e0e5a37` |
| Focused owner and branch proxy CI / `8613548a` | `node --test scripts/celld-smoke.test.mjs`; workflow dispatch `42620457832` | Node `0`, five passes; CI success, pending `202` and bearer `401`; [manifest](evidence/2026-11-09-retire-smoke-pre-gate.manifest.json) `054bbef1a1fd0ca60ac38f0711bf052982396b96289692586c2553798fd0ce4d` |
| Full gate / `ffaebf4a` | `npm run gate` | Actual `gate.exit 0`, 5,343 passes and three skips; [manifest](evidence/2026-11-09-retire-smoke-gate.manifest.json) `e50ea7bb687e6f9e3aaa671db9b202999686630452462755049e602ca8731998` |

The Node driver's outer monotonic time is 1.836 seconds; the gate's is
1,001.727 seconds. Each child's wall and CPU measurements remain separate
in the retained timing files. These are not summed case durations. Raw
reports and TEST custody remain outside the repository, read-only. The
three manifests bind 45 public files and their private retention inventories.
After the gate, the final candidate changes only this note and its gate
manifest; source, tests, configuration and dependencies stay equal.

## Open limits

Exact-head review and routine landing remain due under `a6a57ffb`.
The planner deploys. This script-only change needs no deployment and supplies
no deployed-room, production TLS or completed-revocation acceptance result.
