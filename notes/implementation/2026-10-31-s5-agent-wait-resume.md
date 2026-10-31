# Resume an agent from the record

Status: source implementation. The gate passed at `a72eed59`.

Request `de685cba78bd05b0dd312949b0d83cd0b6c380ab` and promise `ae3732eb298d86d1c4019eb83eb0975ea03f3001` own this head. It serves section S5 of the [MVP plan](../2026-10-16-repo-in-ai-mvp-plan.md).

## What changed

The MCP `work-on` prompt guides an agent through the existing tools. The agent accepts an offer by naming its exact recorded terms, asks a person to approve the current question text, and blocks its own commitment. It then waits for a decision, reads the resulting facts, and resumes with the same member key. `examples/repo-in-ai/agents.md` gives the same procedure in the repository. Neither adds a signer, a store, a daemon, a lane act or a member handover.

The prompt is static and accepts only a nonempty `goal` of at most 4096 UTF-8 bytes. Prompt discovery advertises the capability in both served revisions. The modern list returns its required private cache scope and a 30000 ms TTL. Modern `prompts/get` also requires `Mcp-Name` to match the body, in `packages/mcp/src/http.ts`, and `scripts/security-entry-points.test.mjs` adopts the new seal of that file.

Two owners witness the plan's four cases:

| Witness | Owner |
|---|---|
| One agent's block does not stop the other agent's change | `apps/room/lanes/test/issue-questions.scope.test.ts` |
| Accepting an offer that names old terms refuses with `terms-differ` and moves neither the head nor the offer | same |
| A fresh session with the same key resumes from record reads alone | `packages/mcp/test/agent-wait.scope.test.ts` |
| A timed-out `wait` leaves the lane head and entries unchanged and signs no intent | same |

The first owner enrols two real agents through `add-member`, `invite-key` and `enrol`. It keeps the earlier S3 assertions. The second discards the first service, its read-session cache and its custody store, and keeps only the same test key and public room configuration.

## Decisions

The prompt composes existing operations. No kernel contract, byte codec, reducer, storage interface or native rule changes, so the prompt adds no authority and does not change how a lane reads old accepted offers.

The prompt names no repository path. An earlier version ended with a pointer to `examples/repo-in-ai/agents.md`. A hosted server's agent has no such directory, and `scripts/active-source.test.mjs` forbids the name in server source. That test failed the gate at `110a0d56`, so `a72eed59` removes the sentence.

The head merges main rather than rebasing, so the focused captures keep their commit hashes. Main brought the lost-abort repair `e3e65a0b`, which also changes `http.ts`, and the parser repair `ed321125`. The final seal covers both reviewed `http.ts` changes.

## Evidence

The checkpoint is `a72eed596a9570e385bef8a5a2ec613a8c172f21`, tree `88fa3aaa91cfe13ae42547f4b039f628f7231cf2`. The reviewed head adds only this note and its manifest. Per [the follow-up rule](../../docs/testing.md#follow-up-after-a-gate), source and tests are unchanged, so the gate does not run again. Digests name files in the manifest's directory.

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate at the checkpoint: 3205 plain and 890 native tests passed. The test step took 991.0 s in one observed run | `npm run gate` | 0 | `42c7677a69ec2d5d33da7df53faeb5c77430ab9105a6281e27fd6dee50c85a4d` |
| Earlier gate at `110a0d56`: failed in `scripts/active-source.test.mjs` on the path in the prompt. Later stages did not run | `npm run gate` | 1 | `65c60896ae17813aa265bbcde95ea4a07adbd54a59ca57cc26add30e63ac3e5b` |
| Earlier gate at `69e76cf8`: I stopped it after the inventory owner refused a seal I had computed with `shasum`. The merge commit was amended, so that hash is on no branch | `npm run gate`, stopped by SIGINT | 1 | `7cc75e61d1780f846960c07962f792a40455eeb56d14786c07470147b8910909` |
| MCP production types at `df6d1eeb` | `tsc -p packages/mcp/tsconfig.json --noEmit` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| MCP test types at `0baffa19` | `tsc -p packages/mcp/tsconfig.test.json --noEmit` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| MCP native types at `df6d1eeb` | `tsc -p packages/mcp/tsconfig.scope.json --noEmit` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Lanes native types at `df6d1eeb`: a new variable collided with an existing one | `tsc -p apps/room/lanes/tsconfig.scope.json --noEmit` | 1 | `dabac2a69c549392994809b5dd1dedd0ec994fff4f4d73f895e1bac59f13dfe5` |
| Lanes native types at `38dc3bea`, after the rename | same | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Pool compatibility at `38dc3bea` | `node scripts/cloudflare-pool-compat.mjs` | 0 | `fb18a30d374c7b43e41c68d91ee5cd941bf2866ee5ac5167b6eb62dab8ac4816` |
| Plain owners at `38dc3bea`: 19 passed, 4 failed. Two new prompt assertions counted the legacy stream's snapshot read. Two HTTP cases failed on the defect that `e3e65a0b` repaired | `vitest run --project mcp` on `wire.test.ts` and `http.test.ts` | 1 | `cca60449054194285a73d765b6e356d27c61c7dbf2d86ba701abe9eec8a9345e` |
| Wire owner at `0baffa19`: 14 passed, after the prompt assertions joined that snapshot | `vitest run --project mcp` on `wire.test.ts` | 0 | `bfcdeb8b34edd1a87bba3540ba16e838b22d22bb2f1cc0164eac3fc7980b6606` |
| Native owners at `0baffa19`: both passed | `vitest run --project scope` on the two owners above | 0 | `b146df6ccc2dab8f4b470e4e99d51f00d3623eaa355111e9d97f5f46c663f805` |
| HTTP owner at `9e2d54e8`: the same two failures, before the repair reached this branch | `vitest run --project mcp` on `http.test.ts` | 1 | `3950391b6015454b715872154acea6336616f62506fce9cf5bc242e13ba59a8d` |
| Inventory owner at `9e2d54e8`: 10 passed | `node --test scripts/security-entry-points.test.mjs` | 0 | `b9f4a9c0b58f92840d3f6fa45372ec5a681bacf21d3cf218df28467701a23d57` |
| Pinned client protocol source: package, schemas, result shapes and header table | retained file | n/a | `bfc12296a0bad3f72a1faf31f1b18d2a96f9afff3171df9e55b93ae1a814b2f6` |

Whole wire tests use the installed maintained client 2.3.1 over loopback HTTP and stdio in revisions 2025-11-25 and 2026-07-28. The scope peer in those tests is scripted. The Native cases use actual Scope journals, SQLite, M8 authority, lane judgments, Worker HTTP and read-session code, with test secrets, scripted Git, a controlled clock and a pause scheduler.

`focused/` keeps each capture's argv, both streams, receipt and Source maps, and `focused/note-draft-v2.md` keeps the fuller account of those runs. Its digest table holds their wall and CPU times.

## Open limits

- The `wait` timeout uses one injected scheduler interval that advances the fixture clock by 1000 ms. It makes no claim about wall-clock latency. Normal read-session storage may still change. Request `de685cba` owns this statement of the limit.
- No owner runs an autonomous external agent, a provider or a hosted room, and none establishes physical cancellation or provider completion. Request `de685cba` owns this statement of the limit.
- A different member cannot take over. Handover stays out of the MVP, as the request says. Request `de685cba` owns this statement of the limit.
- The hosted Worker serves this surface only after a deployment. The planner deploys after the J4 live witness closes, as the request says, and a deployment of later main before then would void J4's Source. J4 request `d288fb90` owns that order.
