# Keep the first OAuth layer close disposition

Status: source, six focused cases and the one-case control complete for request `089ed1a1`, promise `4c2c799b`. The full gate, independent review and landing remain ahead. The planner deploys.

## Change

A refresh detaches an OAuth HTTP layer and retains its stored session rows. Before the layer leaves the map, another close can reach it. The old `OAuthHttpLayers.#close` called `HttpGeneration.graceful()` again, which removed the rows that the detach kept.

`#close` now returns `owner.disposed()` when that owner is already closed. The first close keeps its disposition and owns its map cleanup. Every caller uses the same check, so `open()` no longer needs its `existing` disposition. The general `HttpGeneration` transitions stay unchanged: an explicit graceful retirement can still follow a retaining discard at that lower boundary.

The new case in `packages/mcp/test/oauth-http.scope.test.ts` opens a real HTTP generation, starts a retaining grant close and `closeAll()` in the same turn, then observes the retained row and a `404` from the closed transport. It uses real Durable Object SQLite for the grant checker. A map stands in for session persistence and observes the real removal callback. This component witness establishes no hosted ingress, authority or live-room outcome. Both earlier cases and their deadlines remain unchanged.

## Source seal

Request `089ed1a1` assigns this seal to the checker under ruling `7e3f7743`. The maintained parser reproduces the old value from main `c85553da`. It computes the new value from the changed source. The prepared patch changes one literal and keeps every other inventory byte and assertion.

| Owner | Old literal | New literal |
|---|---|---|
| `packages/mcp/src/oauth-http.ts` | `1c87328b4e9c5d66e07ae8017b22482816bf26c1d71e047fdf8e67b03b87924a` | `dc4b7c1113dd4cd7e4fb795d22b5e89793a292e0a470e91d7f90c0d73c450caa` |

The source hashes to `9e966b5277103fc266a383e7c9daff4d9a5fa6921e241f7970146673d7bb815e`. The unchanged maintained parser hashes to `d9e164e3d6b2ae762dd52b8001c824f17c816839318694d67faa280fb2f7a7e9`. The exact patch hashes to `df89b188348c13fe986f7355d9e8d29833ca0d1f664e7e6b8a072470fb8b986a`; seal-only commit `3a6d7105` applies it after source commit `65e66f6d`. These parser outputs supply a reviewed baseline, not authority evidence.

## Focused evidence

The frozen plan at `3a6d7105`, tree `c2c68a2a`, ran both MCP source and scope-test compilers, then all six cases in the complete OAuth HTTP and hosted OAuth owners. Each case passed exactly once, with no errors, retries, skips or unexpected cases. The actual `pipeline.exit` says `exit 0`. Guards kept all 2,189 tracked inputs, the lock, 14 owned workspace bindings and 48 exports unchanged. The outer receipt records 8.474 seconds separately from the child timings, a clean checkout and no owned process left.

The control removed only `if (owner.closed) return owner.disposed();` in a separate worktree at the passed source. The new retained-row witness failed by `AssertionError` at line 190: the stored row became `undefined`. The actual owner exit was 1, with one failed case, no passes and two unselected cases. The driver restored the source and compared every tracked input before classifying the result. Its actual exit was 0, with both worktrees clean and no owned process left. The complete normal selection did not rerun.

The [focused manifest](evidence/2026-11-08-s1-f1-focused.manifest.json) hashes to `11062dbb45d6b47091becae84070852014f627110fcf8941ecf19ccbfc755fa7`. It names 15 public files and inventories 522 read-only private files in four units, including the complete reports, compiler logs, one-case failure, source comparisons and exact seal proof. The retained evidence directories start with `~/play/artroom-evidence/2026-11-08-s1-f1-`. No full gate, live-room or deployment claim follows from these checks.

Run the final full gate once before review, including its complete security owner. Read the actual `gate.exit` before claiming a pass.
