# Keep the first OAuth layer close disposition

Status: source and component witness drafted for request `089ed1a1`, promise `4c2c799b`. Focused validation, the control, the full gate, independent review and landing remain ahead. The planner deploys.

## Change

A refresh detaches an OAuth HTTP layer and retains its stored session rows. Before the layer leaves the map, another close can reach it. The old `OAuthHttpLayers.#close` called `HttpGeneration.graceful()` again, which removed the rows that the detach kept.

`#close` now returns `owner.disposed()` when that owner is already closed. The first close keeps its disposition and owns its map cleanup. Every caller uses the same check, so `open()` no longer needs its `existing` disposition. The general `HttpGeneration` transitions stay unchanged: an explicit graceful retirement can still follow a retaining discard at that lower boundary.

The new case in `packages/mcp/test/oauth-http.scope.test.ts` opens a real HTTP generation, starts a retaining grant close and `closeAll()` in the same turn, then observes the retained row and a `404` from the closed transport. It uses real Durable Object SQLite for the grant checker. A map stands in for session persistence and observes the real removal callback. This component witness establishes no hosted ingress, authority or live-room outcome. Both earlier cases and their deadlines remain unchanged.

## Source seal

Request `089ed1a1` assigns this seal to the checker under ruling `7e3f7743`. The maintained parser reproduces the old value from main `c85553da`. It computes the new value from the changed source. The prepared patch changes one literal and keeps every other inventory byte and assertion.

| Owner | Old literal | New literal |
|---|---|---|
| `packages/mcp/src/oauth-http.ts` | `1c87328b4e9c5d66e07ae8017b22482816bf26c1d71e047fdf8e67b03b87924a` | `dc4b7c1113dd4cd7e4fb795d22b5e89793a292e0a470e91d7f90c0d73c450caa` |

The source hashes to `9e966b5277103fc266a383e7c9daff4d9a5fa6921e241f7970146673d7bb815e`. The unchanged maintained parser hashes to `d9e164e3d6b2ae762dd52b8001c824f17c816839318694d67faa280fb2f7a7e9`. The prepared patch hashes to `df89b188348c13fe986f7355d9e8d29833ca0d1f664e7e6b8a072470fb8b986a` and will occupy its own commit. These parser outputs supply a reviewed baseline, not authority evidence.

## Validation plan

Freeze the complete OAuth HTTP and hosted OAuth owners with their static case ledgers. Run their compiler closure and one focused body through `scripts/focused-check.mjs`. After the baseline passes, remove only the new closed-owner check in an isolated control worktree and run the one retained-row witness. Restore source before classifying its result. Run the complete security owner and the final gate once before review. Read the actual exit receipts before claiming a pass.
