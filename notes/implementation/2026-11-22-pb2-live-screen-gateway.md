# PB-2: live application gateway

## What changed

PB-2 admits `GET /live`, `POST /live-act`, and `GET /live-stream` for the selected application scope through the existing application gateway. It refuses queries, including an empty `?`, and keeps the exact `POST /sessions?standing=1` route. The Sandbox preserves an empty query delimiter before the shared matcher. It forwards live watches through the existing Native stream lifetime and close ownership.

The gateway checks the screen descriptor, origin, path, method, and query. Native owns read and act authority. It checks the read session for summaries and watches. For live acts, Native checks the session, signature, target, application binding, and grants. The Workerd witness uses the installed child, a signed member session, and real Sandbox and Native dispatch. It checks no-reader refusal, wrong generation, non-live refusal, and watch cancellation. The witness uses fixture provider and clock authority.

The gate tested `d8bf1da2471b0da53fb0021a0533101b1192ceab`, tree `8086a85256c4affb6fdc880297693a18106d593d`. The gate failed in the Plain suite because one corpus test took 5,029.318 ms against its unchanged 5,000 ms deadline. It reported 5,140 passes and one skip, with no product assertion failure. The gate stopped before Native and the moved scale tests. Gate END `33d89df5` records the failure.

The isolated repair is `19b7590907356e8e719801a0bcf046a60f724641`, tree `38cd639f9e4a22fe17f89c37da39f42f8028f463`. The repair changes only `packages/derive/test/program-structure.test.ts`. It retains every input, assertion about production behavior, and deadline. It indexes identities and uses strict Node assertions. This note is the only subsequent change. Planner `e540d663` approved twenty serial measurements. They ranged from 2,505 to 2,705 ms, with a 2,619.5 ms median, below the same deadline. The test typecheck and all 11 cases in the owning file passed. Continuation END `240f3ac9` records the pass of the original Native stage, including the moved scale tests selected by `packages/scope/src/worker.ts`.

Two Page builds matched the tracked output on the published base, SHA-256 `d8371485e3ab8c3b19e7c2da516ea4e4255e73be307aa61b77390280e1cc8594`. The reproduction used the retained TEST signer. Planner correction `a4a53443` records the Page result and leaves worker bundle assessment to deployment.

## Decisions and why

The Native fixture correction holds its existing required-session lease through the gateway exchange and stream cleanup. That correction is confined to the test fixture. The earlier inventory attempt used raw file hashes where the inventory requires normalized AST seals. The corrected seals preserve the E3 session owners. The raw failed checks remain in their original archives.

Planner `5524509c` authorized updating only the open Lending and Counter presentation identifiers. All eight previously signed Lending and Counter packets decoded at their existing versions. Their bytes stayed unchanged.

## Final evidence

The retained gate and control files are filed under `/Users/hughpyle/play/artroom-evidence/2026-11-22-19b7590-pb2-review/`. Each path below is relative to that directory. The original archive basename keeps historical runs distinct.

| Check | Command | Exit and result | Output and SHA-256 |
| --- | --- | --- | --- |
| Full gate on `d8bf1da`, tree `8086a852` | `npm run gate` | 1; 748.57 s wall time; Plain: 5,140 passed, 1 skipped, 1 timeout; Native and moved scale unreached | `2026-11-22-d8bf1da-pb2-full-gate/gate.txt` `1406e95f50c1b98cbe8d2bc74a5f113d407f1a5e553c50bba222a1d0d9adfb4d` |
| Gateway preflight on `d8bf1da` | Exact invocation not recorded in retained output; 6/6 tests | 0; 1.44 s wall time | `2026-11-22-d8bf1da-pb2-full-gate/preflight/gateway.log` `df6562bb11998f63f2d78b49aeb25035168a39a4791018b7ee312ae39327f75f` |
| Native Workerd preflight on `d8bf1da` | Exact invocation not recorded in retained output; 3/3 tests | 0; 11.60 s wall time | `2026-11-22-d8bf1da-pb2-full-gate/preflight/native.log` `62ff4a0caba5711b5b21f0594ceb6639c6f3a09a843bcd8bbdf9c27505bf00a7` |
| Type contexts on `d8bf1da` | `npm run typecheck` (the retained log shows its expanded script) | 0; 17.35 s wall time | `2026-11-22-d8bf1da-pb2-full-gate/preflight/typecheck.log` `b0a4952daf6f87f1c482ebb0fe1d1743bdffa8068a0922b35772c9223149ef64` |
| Pins on `d8bf1da` | `npm run pins` | 0; 20.06 s wall time | `2026-11-22-d8bf1da-pb2-full-gate/preflight/pins.log` `56e26f2837d5b107ed8edeb2cf2dd081d4ed819d7eb4505d24f743ca1bc1182c` |
| Repair test typecheck on `19b7590` | TypeScript test context for `packages/derive` | 0; 0.53 s wall time | `2026-11-22-19b7590-pb2-continuation/types.log` `78fefe2c60a317942abe5a56d1dd59d9d48588a0b22a6dfd303e453b8cbe6adf` |
| Owning test file on `19b7590` | Vitest, `packages/derive/test/program-structure.test.ts` | 0; 11 of 11 cases passed, corpus case 2,609 ms | `2026-11-22-19b7590-pb2-continuation/owner.log` `69b99fc561ef827e1d094b09411e2efa1716a7752e3156d539ead741af5c3abc` |
| Twenty serial corpus measurements | Exact invocation not recorded in retained output; 20 runs at the original 5,000 ms deadline | 0; min 2,505 ms, median 2,619.5 ms, max 2,705 ms | `2026-11-22-19b7590-pb2-continuation/serial-result.json` `8062933dd057fc66503cafbe4aeef064667d2c776f1dc7af83d66c315c20c491` |
| Earlier required-session fixture failure on `dcef8c2` | Workerd witness on loopback | 1, expected HTTP 403 and received 200 with the fixture bypass | `2026-11-22-dcef8c2-pb2-first-focus/native-loopback.log` `074256fc3586d3fa57ff5c823f9611a7086379eb8a1883ec43be3271fefe0dc9` |
| Earlier security inventory failure on `c53d39f` | `npm run pins` | 1, normalized AST seal differed from the raw hash | `2026-11-22-c53d39f-pb2-first-pins/pins.txt` `79ce305e4cb5e6ae8efa8ff2a903956bee694c5973a6eae04d6135c4b796d9d1` |
| Output reproduction on `d2f83e2` | `node --import ./node_modules/tsx/dist/loader.mjs measure.mjs "$PWD"` with the retained script | 0, two Page builds and the two open presentation identifiers | `2026-11-22-d2f83e2-pb2-output/reproduced.log` `d032959c22fc5294c2cab3aaa9317001304547f425e9e2196573dfbafde5dc13` |
| Published packet decoding | Retained `signed.mjs` | 0, eight packets at their published versions | `2026-11-22-d2f83e2-pb2-output/published-packets.log` `9e29ac1f3bd304286d2865d542c2d816180f9198edd36857b458bf173efc194a` |
| Native continuation and moved scale | `ARTROOM_SCALE_MODE=moved node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts` through the retained runner | 0, 993.32 s runner wall time. 312 files and 1,256 tests passed. One file and two tests skipped. Zero lost, four stale, and zero unowned timeout crossings. | `2026-11-22-19b7590-pb2-continuation/native/native.log` `9b3882acf013a8f909fd90dd0a8e0ccfcebcbe4b11b443e218bd268f4144e78a` |
| Moved scale case ledger | Final records for the `scope-scale` project emitted by the same Vitest run | 0, nine files and 16 cases passed within the Native totals | `2026-11-22-19b7590-pb2-continuation/native/native.jsonl` `35110a179288f87b4c4168a864c235b06c8650201c04ac16ea9b63b5f27bc318` |
| Native command and result | Retained `runner.mjs` loaded the gate's fixed Native stage | 0, records the exact executable, arguments, selected paths, 993.08 s child wall time and crossing counts | `2026-11-22-19b7590-pb2-continuation/native/continuation.json` `0c9c630ba785726546659c6561bb6261800319490d6a6f56e69044e04b7388f7` |

The output reproduction scripts are `2026-11-22-d2f83e2-pb2-output/measure.mjs` `ce1df106c0a9d1b4ce23a13841d1bd7b2ffa21569b7b7b02add3c67f8aefc486` and `2026-11-22-d2f83e2-pb2-output/signed.mjs` `237967629dc9848d029d3d070730d6834d3b862243744e77139992f9041227a6`.

The retained preflight and repair logs identify their test selections. Those logs omit some shell arguments. The gate log supplies its stage counts and process wall time. The continuation summary `2026-11-22-19b7590-pb2-continuation/continuation.txt` `81d1b357747ecddca344d09b618e3a024ea0154e55c05f4e8bd0cdf9c7ac44d4` records the runner wall time. The retained script `2026-11-22-19b7590-pb2-continuation/runner.mjs` `9afdb9230f8b210d5fc9b42ccaa8b9f0464601a5b72a4965a5245e341baa5670` loads the original Native stage, records its command and runs it with the original moved scale selection. The twenty corpus measurements use the individual case durations reported by Vitest.

## Open limits

PB-3 `a294276d` owns the shared client watch and lifecycle, including its Map and Pinboard adoption. LL-1 `5fcd2b9b` owns the renewal measurement and design. Typed companion discovery and capability-bound routing remain separately planned. Hosted deployment and live provider behavior require deployment evidence.
