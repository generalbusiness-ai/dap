# Retained-editor stages and their evidence

Status: focused checks and Page assets pass; workflow, gate and review pending. Request `8ae87346` and promise `a20e0cf1` own this branch. S1 and M7 have finished their gates; S3 takes the next slot. Both reply-fault characterizations pass before the refactor and in the complete changed owners afterward. All three Page compiler contexts pass. The current runtime selection passes 14 cases, with the existing recorder case conditionally skipped.

## Stages carry the facts their next step needs

On the baseline, `EditTask.state` relies on separate optional lane, proposal, source and version fields. `sendStep`, `continueEdit` and `checkEditRequest` write the tag. Each step's attempted flag, answer and receipt-verification flag add further combinations. The catch in `continueEdit` scans those flags to decide unknown versus stopped.

The refactor makes one discriminated stage carry the evidence for its next action. Waiting for a lane requires the verified opening receipt. Waiting for rules requires the lane and proposal. A collected source and a recorded version require their exact facts. Unknown work requires the attempted step, its original signed envelope and its preceding verified progress. Refused and stopped tasks keep that prior progress.

A pure transition function owns stage changes. Network helpers read, keep, submit and follow receipts, then return their results to the controller. The controller records the attempted boundary before submission and retains a known answer before awaiting receipt verification. A failure after an attempted, unverified request must stay unknown. The stage must distinguish that uncertainty directly, rather than rescan optional flags.

The loaded Page remains the only task store. Legacy and LIST1 retain separate paths. Current user-visible messages stay unchanged. The change adds no framework or dependency.

## Existing witnesses and callers

The preparation map names eight existing witness families in the retained-editor and LIST1 owners. They cover original request identity, unsent recovery, changed context/base, failed custody reads, the keep/send boundary, exact legacy proposals, LIST1 source-versus-version identity and unknown settlement.

`retained-editor.ts` reads task progress to label controls, fence unsent recovery, show step results and link a recorded proposal. Its caller adaptation must use the stage's evidence. Test fixtures that manually construct or corrupt the old task representation will need explicit stage fixtures while retaining their behavioral guarantees. `record.scope.test.ts` calls only read-only preparation. `editor-list1.scope.test.ts` must remain in the focused plan alongside the two requested retained-editor owners.

The wider Page witness search found no retained-editor case for refusal after an earlier verified step or acceptance whose receipt cannot be verified. Two drafted cases use the native editor fixture, then one explicit reply fault at the client boundary. They retain the earlier receipt and exact signed envelopes, require a stop before another send, and check original-association settlement for an unverifiable receipt. Both pass before the runtime refactor. The fixtures claim no native refusal policy outcome.

## Preparation evidence

The [preparation manifest](evidence/2026-11-07-s3-preparation.manifest.json), SHA-256 `c726f66045ead58b8e232351304ff2874c3f1ea75613e2e3bc6f3aa8cc0497b9`, binds 11 read-only files at `7244d884`, including six source snapshots, the effective request and promise, and the witness map. Every witness entry says source inspection only. No pass result follows from this map.

| Check | Method | Result | Retained output SHA-256 |
|---|---|---|---|
| Current guarantees and callers | Inspect the six source snapshots and resolve existing witness titles | Eight witness families found; no execution | `efc6887353e803d2b0a55259ee0cc27ec6976e3f20823ebdea0bd399e28595be` |

The exact-source Page workflow, one gate, independent review and audited landing remain. Builder only; the planner deploys.

## The two characterization cases pass on unchanged runtime

The scope compiler, compatibility preparation and selected owner each exit 0 at `ff34db1a`, tree `a6f0ae10ffdd39d7664b1055842dfdda0858230f`. Both new cases pass; four existing cases in that file remain unselected. The before/after snapshots match every tracked input. Runtime source still matches `7244d884`.

The enclosing driver then exits 1 while checking its metadata. It included the four cases that Vitest marks skipped, and it expected unquoted parameter labels. The read-only post-classification verifies the exact two passed titles, four unselected skips and actual owner exit 0. No compiler, compatibility command or test ran again. The driver remains failed.

The [characterization manifest](evidence/2026-11-07-s3-characterization-validation.manifest.json), SHA-256 `139e33f80037fc5ee13fa3edf553f303832e33ab3831c58adb68723dfcb88f83`, binds 11 public files and the retained inventory of 253 private originals.

| Check | Command | Exit | Retained output SHA-256 |
|---|---|---:|---|
| Scope compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.scope.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Two selected characterization cases | `node node_modules/vitest/vitest.mjs run --project scope apps/room/page/test/retained-editor.scope.test.ts -t 'later editor step retains' --reporter=json --outputFile=<private-report>` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Failed enclosing-driver metadata check | Driver stops after the passed owner | 1 | `63d6ba3ec0cef8738fd87ace0e0df972beba2511722ff1ffb32ec2333295fbb8` |
| Saved-report classification | Read actual case statuses and quoted titles; compare snapshots | 0 | `474b7c192076a9eda66b300c5c6f29d3a1a0b7ac2bef060d89e2b8d9168a1f55` |

This is a baseline characterization, not evidence for the pending S3 runtime refactor. The existing full owner set remains required after that change.

## One transition function changes progress

The implementation adds `retained-editor-state.ts`. Each readonly stage carries its required facts: verified opening, lane and proposal, verified rules request, collected source or version. Unknown progress carries the attempted original request and the previous verified stage. A lane-ready stage holds the discovered lane before the rules request. It changes no rendered label.

`transitionEdit` changes values without network calls. The controller assigns its result through one `applyEdit` function. Network helpers prepare and keep the exact envelope, submit it, follow its receipt, read the opened lane and check native rules. The controller records attempted before submission and the answer before receipt reads. A stopped result preserves an attempted unverified request as unknown. `checkEditRequest` uses that retained request under the original association.

The current caller changes are `retained-editor.ts` and fixtures or evidence reads in `retained-editor.test.ts`, `retained-editor.scope.test.ts` and `editor-list1.scope.test.ts`. The DOM recovery fixture still tests contradictory task data through an explicit malformed-task stand-in; production readonly stages cannot construct those combinations. `record.scope.test.ts` still calls preparation without adapting its task representation. The implementation retains every existing behavioral assertion and user-visible message. It keeps separate legacy and LIST1 results and no durable outbox.

## The complete changed owners pass

At source `116fcbab9156017df8856a1bf24932dc2112e417`, tree `f03f094a330aaee6b14ae2d2088dce0eb1f17994`, the Page source, Node-test and scope compiler contexts all exit 0. The selected owners are `retained-editor.test.ts`, `retained-editor.scope.test.ts`, `editor-list1.scope.test.ts` and `record.scope.test.ts`. Their one body passes 14 cases. The recorder keeps its existing `skipIf(!inject("pageRecord"))` condition and skips its one case. Every tracked input matches before and after.

One isolated control disables only the refusal of an unverifiable receipt in `runStep`. The existing unverified-receipt witness then fails by `AssertionError`: the task reaches recorded instead of staying unknown. Only that case runs; five other cases are unselected. Production stays unchanged and the control restores cleanly before classification. The normal complete selection had already passed. No mutation sweep ran.

The [runtime manifest](evidence/2026-11-07-s3-runtime-validation.manifest.json), SHA-256 `9dea8027fefa788741d8d78291f232dd2978c6ea69569246a38df165efdff510`, binds 27 public files and the inventories of 514 private originals. The earlier two baseline cases count within the 14 current cases, not in addition.

| Check | Command | Exit | Retained output SHA-256 |
|---|---|---:|---|
| Source compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Node-test compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.test.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Scope compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.scope.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Complete changed owners and direct preparation caller | `node node_modules/vitest/vitest.mjs run --project page --project scope <four named owners> --reporter=json --outputFile=<private-report>` | 0 | `ab4ec82568695ac1b774e7988a15df086eb9d961b3d22c9a748eb53c9e5fbffb` |
| Unverifiable-receipt control | Run only the unverified later-step case in an isolated source copy with the verification refusal disabled | 1 | `e5dacda993eeb71d4cd458d333abc895989393550f691c9b09b832778e32bc51` |

## The maintained generator changes only the Page module

Source `69f32d97` integrates S1's published landing and keeps the tested tree unchanged. One maintained generator invocation then changes only `apps/room/page/assets.ts`. The new module is 2,362,642 bytes, SHA-256 `2e3c254998a402b1df43cfbe5a0a3b5efe083dda9dffafe811d2ac18fc6203f6`. The complete asset owner passes its one case. Every other tracked input stays unchanged.

The [asset manifest](evidence/2026-11-07-s3-page-assets.manifest.json), SHA-256 `6594deebf9ca5d8b45ac16304f1230a0122146c35cd02dbda6dd7721f69e50e8`, binds 24 read-only files with the old/new modules, snapshots, commands, raw output and owner report.

| Check | Command | Exit | Retained output SHA-256 |
|---|---|---:|---|
| Maintained Page generator | `node scripts/assets.mjs` from `apps/room/page` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Complete asset owner, one case | `node node_modules/vitest/vitest.mjs run --project page apps/room/page/test/assets.test.ts --reporter=json --outputFile=<report>` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Generated output and unchanged-input comparison | Compare all tracked hashes before generation and after the owner | 0 | `b96ae1d49124cf9db40b784244e7aa6ed51b2c80d97213af8b3561d52a4a9fd0` |

Four S3 manifests now bind 73 read-only public paths. The implementation has 15 distinct passing current cases including the asset owner, plus the one conditional recorder skip. CI, the single full gate, independent review and an audited landing remain. This head grants no deployment or live acceptance; the planner deploys.
