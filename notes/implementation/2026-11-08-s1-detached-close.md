# Keep the first OAuth layer close disposition

Status: checker report `3d0e64be` requests changes to the first candidate `ebd615fd`. The correction at `50ac1e7e` passes seven focused cases and the capacity control. Its fresh full gate, independent review and landing remain ahead under request `089ed1a1`, promise `4c2c799b`. The planner deploys.

## Change

A refresh detaches an OAuth HTTP layer and retains its stored session rows. Before the layer leaves the map, another close can reach it. The old `OAuthHttpLayers.#close` called `HttpGeneration.graceful()` again, which removed the rows that the detach kept.

`#close` now selects `owner.disposed()` when that owner is already closed, then joins the same `finally` cleanup as every other close. The first close keeps its disposition. Cleanup removes the entry only while the map still holds that exact layer. Every caller uses the same check, so `open()` no longer needs its `existing` disposition. The general `HttpGeneration` transitions stay unchanged: an explicit graceful retirement can still follow a retaining discard at that lower boundary.

The retained-row case in `packages/mcp/test/oauth-http.scope.test.ts` opens a real HTTP generation, starts a retaining grant close and `closeAll()` in the same turn, then observes the retained row and a `404` from the closed transport. It uses real Durable Object SQLite for the grant checker. A map stands in for session persistence and observes the real removal callback. This component witness establishes no hosted ingress, authority or live-room outcome. Both earlier cases and their deadlines remain unchanged.

The first candidate returned before `finally` for a closed owner. The checker showed that eight self-retired generations could fill the map permanently. The correction keeps the disposition check inside the cleanup chain. A second case retires eight real generations directly, ends their grants through the SQLite-backed checker, and observes that a ninth grant opens. It exercises the real eight-layer capacity bound without a wall-clock timer. This case and one import specifier extend the owner. Every earlier case remains byte-for-byte unchanged.

## Source seal

Request `089ed1a1` assigns this seal to the checker under ruling `7e3f7743`. The maintained parser reproduces the old value from main `c85553da`. It computes the new value from the changed source. The seal-only commit changes one literal and keeps every other inventory byte and assertion.

| Owner | Old literal | New literal |
|---|---|---|
| `packages/mcp/src/oauth-http.ts` | `1c87328b4e9c5d66e07ae8017b22482816bf26c1d71e047fdf8e67b03b87924a` | `6a2668b96a105b077cd07528897b0ed6f6d7aec8cec619a26a535bcb5adb6707` |

The corrected source hashes to `f60fcf6dda90457e0d97c351c91c4641d4ec174674ec4becee6c643a6e4aa383`. The unchanged maintained parser hashes to `d9e164e3d6b2ae762dd52b8001c824f17c816839318694d67faa280fb2f7a7e9`. The correction patch hashes to `d006c353f741c7614fd91b1f8841e71c537ee10b7407c752db0d8904339f55c5`; seal-only commit `50ac1e7e` applies it after source commit `367fc5d3`. It replaces the superseded candidate's literal `dc4b7c11…`. Historical seal commit `3a6d7105` and its patch `df89b188348c13fe986f7355d9e8d29833ca0d1f664e7e6b8a072470fb8b986a` remain in the earlier evidence. These parser outputs supply a reviewed baseline, not authority evidence.

## Focused evidence

The corrected-source plan at `50ac1e7e`, tree `1b155295`, ran both MCP compiler contexts and all seven cases in the two complete OAuth owners. Each case passed exactly once, with no errors, retries, skips or unexpected cases. I read the actual `pipeline.exit`: `exit 0`. Guards kept all 2,189 tracked inputs, the lock, 14 owned workspace bindings and 48 exports unchanged. The outer receipt records 6.763 seconds, a clean checkout and no owned process left.

The capacity control restored the faulty early return in a separate worktree. The unchanged new case failed by `AssertionError` at line 225: grant 9 returned `null`. I read the actual owner exit 1 and control exit 0. One case failed, no case passed, and three cases remained unselected. The driver restored every tracked input before classification. Both worktrees stayed clean, with no owned process left. It ran no baseline again.

The [correction manifest](evidence/2026-11-08-s1-f1-cleanup-focused.manifest.json) hashes to `0c7d5ed9910903e3d519b02d0e44f100aa29a51e49d8f2e61f351cf9fcc57c94`. It names 15 public files and inventories 522 read-only private files in four units under `~/play/artroom-evidence/2026-11-08-s1-f1-cleanup-`. These include the full reports, compiler logs, capacity assertion, source restoration and applied seal proof.

### Earlier candidate

The frozen plan at `3a6d7105`, tree `c2c68a2a`, ran both MCP source and scope-test compilers, then all six cases in the complete OAuth HTTP and hosted OAuth owners. Each case passed exactly once, with no errors, retries, skips or unexpected cases. The actual `pipeline.exit` says `exit 0`. Guards kept all 2,189 tracked inputs, the lock, 14 owned workspace bindings and 48 exports unchanged. The outer receipt records 8.474 seconds separately from the child timings, a clean checkout and no owned process left.

The control removed only `if (owner.closed) return owner.disposed();` in a separate worktree at the passed source. The new retained-row witness failed by `AssertionError` at line 190: the stored row became `undefined`. The actual owner exit was 1, with one failed case, no passes and two unselected cases. The driver restored the source and compared every tracked input before classifying the result. Its actual exit was 0, with both worktrees clean and no owned process left. The complete normal selection did not rerun.

The [focused manifest](evidence/2026-11-08-s1-f1-focused.manifest.json) hashes to `11062dbb45d6b47091becae84070852014f627110fcf8941ecf19ccbfc755fa7`. It names 15 public files and inventories 522 read-only private files in four units, including the complete reports, compiler logs, one-case failure, source comparisons and exact seal proof. The retained evidence directories start with `~/play/artroom-evidence/2026-11-08-s1-f1-`. No full gate, live-room or deployment claim follows from these checks.

## Earlier candidate's full gate

The first candidate's full gate at `821f4ec3`, tree `989fd3e4`, passed. This result does not cover the corrected source. I read the actual `gate.exit`: `exit 0`. Kernel, Node, Counting, plain and native stages passed with complete terminal case evidence: 135 Node, 56 Counting, 4,020 plain and 1,116 native passes, with three skips. No case failed, and no report or unhandled error occurred. The 99 extra observations are exactly 33 enqueue, dequeue and complete Node file lifecycle events, not unidentified cases. One skipped scope module has no duration; the timing record states that limit.

The gate's before and after records match byte for byte. The source stayed clean at the stated head, and no owned process remained. The outer monotonic observation is 1,237.414 seconds; the retained gate and runner timings remain separate. The complete security owner accepted the exact one-literal seal update. This structural result does not establish authority or live-room acceptance.

The archive-scale owner, “the Native driver confirms 10,001 one-entry passes and preserves retained rule inputs from pass 3700”, passed. This gate shows no archive retry. It closes no archive watch.

The [gate manifest](evidence/2026-11-08-s1-f1-gate.manifest.json) hashes to `0bc35cd967c97581ca74f7e3a7a7bf4c37bd7762350f86e3d34282da294d1737`. It names 17 public files and inventories 2,321 read-only private originals under `~/play/artroom-evidence/2026-11-08-s1-f1-gate`. Sealing ran no test again. At submitted head `ebd615fd`, only the note and manifest followed that gate. The checker then requested the production correction above; that correction requires its own full gate.
