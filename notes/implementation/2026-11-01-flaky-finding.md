# Make settle wait for a delivery behind its round

Status: test-helper repair. The gate passed at `5ceada8b`. No source changes, so no Worker bundle changes.

Request `c5f0cff95ec5bc192e4cba520400596015bfbd8e` and promise `dbd7c7ad92eef7153142ced7dba111689d2276b2` own this head. J1's first gate failed at `apps/room/lanes/test/finding.scope.test.ts:107` with `expected 'intended' to be 'aborted'`, and the request asks for the cause.

## The cause

`settle` trusts the counts that `dispatch` returns, and `dispatch` counts only the pass that it joins or runs. The failure takes three steps:

1. `settle` calls the destination, which reports 0.
2. The lane's background pass delivers the withdrawal to the destination and ends.
3. `settle` calls the lane, which also reports 0, so `settle` returns while the destination's reply is on its way.

This window exists when a sender comes after its receiver in the node list. `Room.scopes` lists lanes last, so every send from a lane to a platform scope meets it.

The helper was wrong, and the scenario's assertion is right. Under the forced window the delivery completes with no clock change, and production has no `settle`, so a person cannot meet this.

**A forced window shows this race. No run shows that it caused J1's failure.** The load runs never failed, and the failed gate kept no outbox state. The identical assertion at the same point is the link between them. CPU load did not open the window: across all 216 rounds under load, the destination never reported 0 while the lane reported work.

## What changed

- **`settle`** in `packages/scope/test/net.ts` reads each scope's head before and after a round. It returns only when the round made no dispatch and no head moved.
- **One implementation.** `packages/scope/test/repository.ts` and `Graph.settle` in `apps/room/lanes/test/support/graph.ts` now use it.
- **Two tests that read a passing state.** `directory-partition-consumers.scope.test.ts` and `directory-partition-editor.scope.test.ts` looked for the successor partition in state `creating` after a `settle`. The old `settle` returned while a background pass still had that creation in hand, and the new one can return after it, with the partition `active`. Both tests now accept either state.
- **A witness.** `packages/scope/test/settle.test.ts` forces the race with a gate and no wall-clock wait, through a new `platformNet.pause` in `packages/scope/test/worker.ts`.

## Evidence

The checkpoint is `5ceada8b957ef4b2bf28db728ba941bc57c37dc3`, tree `7c89c38e`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-11-01-flaky-finding/`, `SHA256SUMS` `b8974ff2b209482e6fea72ccfcdbbd2117fe775f74024c06e26d397814a0a70d`. The reviewed head adds only this note and its manifest. The runs and controls below ran at `9696e9ea` or before it, and the checkpoint merges main over that commit. The forced window holds the withdrawal and the destination's reply at the transport, and adds a 100 ms wait in `settle`. That patch is `run-04-forced-window-old-settle/forced-window.patch`, and it is not committed.

| Run | Setup | Result |
|---|---|---|
| `run-04-forced-window-old-settle` | Forced window, old `settle` | Exit 1, `expected 'intended' to be 'aborted'`. Every dispatch count in the round was 0, and a second `settle` with the same clock gave `aborted` |
| `run-05-forced-window-repaired-settle` | Forced window, repaired `settle` | Exit 0, three `allowed` calls, all `aborted` |
| `run-08-old-settle-under-load` | Old `settle`, 36 `yes` processes on 18 CPUs | 0 failures in 24 runs, 72 `allowed` calls |
| `run-09-repaired-settle-under-load` | Repaired `settle`, same load | 6 of 6 passed |
| `run-10-probe-withdrawal-alone-old-settle` | Old `settle`, reserve chain finished first, no hold, no added load | Passed. The withdrawal reached the destination before the round called it |

| Control | Ran at | Failing assertion |
|---|---|---|
| `control-d-settle-witness-at-head` | Head `9696e9ea` | `settle.test.ts`: `the send's delivery was answered: expected null to be truthy` |
| `control-c-forced-window-real-test` | The head's tree plus the forced-window patch | The real finding test: `expected 'intended' to be 'aborted'` |

Each control restores `if (made === 0) return;` through `scripts/control.mjs`, and each exits 0. `control-a` and `control-b` ran before the witness was final, and `control-a` is superseded.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `7c0baff1448148fa` |

`gate-failed-partition-tests/` keeps the first gate at `ca893290`, which failed on those two tests alone, with `TypeError: Cannot read properties of undefined (reading 'id')`. Each failed the same way run alone, so that failure is deterministic and is not a flake.

The gate reports 3467 plain and 936 native tests, 116 Node and 56 Counting.

## Open limits

- **What this repair does not cover.** A `retry` or `busy` answer, or a transport error swallowed as `null`, leaves the send waiting on the scripted clock. No run ruled these out. If `intended` comes back, read the outbox attempts for these first.
- **A time limit is ruled out.** The failed case took 2.76 s by the gate's progress timestamps, below the 10 s and 30 s limits.
- **Local copies keep the weakness.** These loops do not use the repaired helper, and this head leaves them: `apps/room/lanes/test/demo.scope.test.ts:271`, `apps/room/lanes/test/issues.scope.test.ts:64`, `Graph.created` at `apps/room/lanes/test/support/graph.ts:381`, `packages/cli/test/claim.scope.test.ts:137`, `packages/scope/test/github-creation.test.ts:196`, `packages/scope/test/support/native-fixture-lifetime.ts:201` and `:248`, and `packages/scope/test/observability-native.test.ts:83`.
- **Cost.** Nobody measured the added cost of the two head reads per round across the suite.
