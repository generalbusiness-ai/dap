# M7: Native boundaries and capability arguments

M7 captures the seven Native mark places and capability arguments from the existing successful validator branches. Each validation owns its metadata. The runtime uses those records at the existing call sites and retains the shared Native runner and capability implementations.

The runtime checkpoint is `dc82fd7860b32d0bea52e708792abf8063dcc7a7`, tree `131c9dab2db8026fa8c281bcdceda24fc7f728d0`. The Page-only follow-up is `6e68b26f3053b7a1ae0a09a962f1f11290311c91`, tree `eb9cd73114093a25bf72d6ae2b3cf3d305af93ff`. Source request `11fbfe04` and promise `8232842a` own this work. Addenda `aff86345` and `474dc610` cover the outcome adapter and generated Page module.

This note records focused validation. The exact three-seal patch, final main integration, full gate, independent review and landing remain pending. Page workflow [42433985036](https://github.com/generalbusiness-ai/dap/actions/runs/42433985036) succeeds at the Page follow-up. All four browser commands and every job step succeed. The [CI manifest](evidence/2026-11-07-m7-page-ci.manifest.json) binds its six read-only receipt files.

## What changed

`program/native.ts` records grant, also, type, guard, effect, send and outcome boundaries. Each carries the actual validation identity, original occurrence identity, diagnostic path, body identity where one exists, owned declaration metadata and an unknown dependency set. Aliased source objects retain separate occurrence records. No path or digest selects a validation. Final admission creates the owned records; rejected declarations never reach that step.

Header callers now supply the actual `ValidDefinition` through `Giving`. Ordinary and indexed selectors keep their original context. Indexed selectors still receive only the bounded candidate items and fields, without a clock. Type hooks keep their value and field or slot identity. Native guards retain the original refusal-map keys. Effect and send callers use their captured metadata, including `always`. Outcome lookup uses captured named declarations, and copied sends retain their original clause owner.

`program/capability-plan.ts` closes the guard argument vocabulary over an operand, an `each` binding and value, or an item range and slot. Effect arguments retain their operand and plain-slot subject metadata. The plans keep the existing operand, range, slot and lexical binder objects. Shallow container copies preserve those validation identities. Capability dispatch uses the captured version and still checks implementation availability before reading arguments.

The obsolete capability `bindEach`, `elementType` and `typeOfElement` helpers have no remaining callers and are removed. Guard lists no longer build a second written-name environment for those arguments. The unused exported send `formOf` helper and redundant result-clause dictionary are also removed. The unrelated local `markers.ts` function named `formOf` remains.

The maintained Page generator changes only `apps/room/page/assets.ts` among tracked inputs. Its module is 2,359,358 bytes with SHA-256 `684a564f78d530099b11b486f282fdab2c23e806471f3ed435e376c7144d8dca`.

## Decisions and preserved behavior

The Native runner stays shared. The retained source bodies of `givenTo`, `ruleFor`, `run`, `selectedBy` and `grantByRule` match M6 exactly; the evidence records their digests. Rule context, observations, values, actual clock use, skipped hooks, faults, refusals and output checks keep those existing paths. Trusted returned-effect and returned-send joins remain explicit and do not count as admitted syntax. Callback interiors stay opaque.

Capability guards preserve ordered arguments, lexical shadowing, aliased ranges, complete scans, empty or absent lists, null values and failure for a non-list. Capability effects read the working subjects after earlier ordinary effects. Conditions still read the original view. The existing `fromItems` lookup prefers the current item, then the first matching subject. Capability records remain queued after ordinary effects. The hold@1, hold@2, git-read@1 and device-command@1 implementations and tables stay unchanged.

The four new ownership witnesses compare complete public judgments and calls. Both capability cases and both Native cases fail assertions on unchanged M6 source and pass on M7. The probe witness also compares the supplied context and its invocation count. Existing witnesses retain their assertions and deadlines. The structure witness now checks that the Native inventory names every admitted mark and reports unknown dependencies.

The raw `readFields` shape adapter and one-argument `actionOf` metadata helper remain available without invoking a Native callback. Production action callers supply their actual definition. The pre-validation outcome-domain helper still reads bootstrap metadata. The prototype `lower`, `evaluate`, `explain` and `dependencies` remain the first slice. The admitted structure exposes opaque hooks separately; these records do not imply that the prototype executes or inspects them. M8 owns the final shells and orchestration.

The security inventory remains unchanged. The prepared patch changes only the three hash literals for `judge.ts`, `genesis.ts` and `core.ts:Scope`. Its SHA-256 is `40864da31c9dc90e3f725f53d93d5a6e4090eaf958f54cb6a908393255a5e4c8`. Planner ruling `1311f76e` requires Hugh's approval for those exact seal changes. No route or gate assertion changes.

## Focused evidence

The [manifest](evidence/2026-11-07-m7-source-evidence.manifest.json) binds 192 files in the read-only unit `/Users/hughpyle/play/artroom-evidence/2026-11-07-m7-source-evidence`. Its qualification distinguishes development failures, expected baseline failures and corrected checks. The final focused set covers 240 distinct cases in 17 complete owners. The Page asset owner adds one case. The structure owner overlaps the earlier capability-plan check and counts once in that total.

Focused source commands ran before the runtime checkpoint. No runtime source changed between the final focused commands and that commit. Page generation then produced the bytes in the Page follow-up. Earlier development checks have their own source qualifications. Each baseline control temporarily copied only its selected new witness into an isolated clean M6 checkout, then restored that checkout. No baseline control reran an entire suite.

The table hashes the named output, report or exit file retained in the manifest. The earlier compiler failures remain failed records. The optional ESLint probe cannot start because this repository does not install ESLint or define a lint script. That probe supplies no validation result, and no package was installed for it.

| Check | Command | Exit | SHA-256 of retained output |
|---|---|---:|---|
| Final derive source compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Final derive test compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Capability and structure owners, 16 cases | `node node_modules/vitest/vitest.mjs run --project derive packages/derive/test/forms-capability.test.ts packages/derive/test/program-structure.test.ts` | 0 | `c7875b8019f14488848d9b79db977e92c7b10016749b88a4858a6559e9fb696b` |
| Native marks owner, 49 cases | `node node_modules/vitest/vitest.mjs run --project derive packages/derive/test/forms-marks.test.ts` | 0 | `ee21e5a3ba96e441b64e6191aeba6eda57b0f65584edfefde83e51974e17f40f` |
| Ten derive owners, 122 cases | `node node_modules/vitest/vitest.mjs run --project derive packages/derive/test/program-structure.test.ts packages/derive/test/forms-binding.test.ts packages/derive/test/forms-hold.test.ts packages/derive/test/forms-hold-v2.test.ts packages/derive/test/forms-hold-dispatch.test.ts packages/derive/test/forms-holds.test.ts packages/derive/test/forms-device-command.test.ts packages/derive/test/forms-ledger.test.ts packages/derive/test/forms-observes.test.ts packages/derive/test/clause-identity.test.ts --reporter=json --outputFile=/Users/hughpyle/play/artroom-evidence/2026-11-07-m7-focused-owners/derive.report.json` | 0 | `9402f9590f9fd67a3c42405b02a3f21f9ed6e20a86f3f9c6cbe3d37a57a45214` |
| Replay owner, 53 cases | `node node_modules/vitest/vitest.mjs run --project replay packages/replay/test/verify.test.ts --reporter=json --outputFile=/Users/hughpyle/play/artroom-evidence/2026-11-07-m7-focused-owners/replay.report.json` | 0 | `b261e2d8ecb2f1b9b90601500f2dd12d0259e7bfce70e498dbec5f0c5169dc35` |
| Four native owners, 11 cases | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/replay.test.ts packages/scope/test/observes.test.ts packages/scope/test/holds.test.ts packages/scope/test/repository-binding.test.ts --reporter=json --outputFile=/Users/hughpyle/play/artroom-evidence/2026-11-07-m7-focused-owners/native.report.json` | 0 | `0e1adc336159dfa1e6fecc286086a2b316df8429b64bff045ec13c020560454e` |
| Two capability ownership controls on M6 | `node node_modules/vitest/vitest.mjs run --project derive packages/derive/test/forms-capability.test.ts -t 'M7: an admitted capability' --reporter=json --outputFile=/Users/hughpyle/play/artroom-evidence/2026-11-07-m7-capability-baseline/report.json` | 1 | `6e372366b74455d123ea575a7e7672179745ead8b70064c7809b827858032e3d` |
| Two Native ownership controls on M6 | `node node_modules/vitest/vitest.mjs run --project derive packages/derive/test/forms-marks.test.ts -t M7: --reporter=json --outputFile=/Users/hughpyle/play/artroom-evidence/2026-11-07-m7-native-baseline/report.json` | 1 | `c4ccfc1c92ef82952b4f75c13e180d6b5c5e0aeafab5c2c9e00b29b958768a6b` |
| Earlier capability shape compiler record | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 1 | `b3b778d5f4363725b7a9810553c0bb1aeaa2971147fd1b0e3769d45bfdb31e62` |
| Earlier unused-import compiler record | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 1 | `8af517bbbf15cb4647adcf2dd620ff6d4fe3b87d656dbc594a800a843792eea3` |
| Remaining unused-import compiler record | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 1 | `f2c7acd443a57e420f0b186f63a37e4ae336905af55bd2880530daed47f169a5` |
| Earlier context witness compiler record | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 1 | `1d39ac9da26a79f85c3d9e7877f5f5cc90231809b5ae64bdfae006c167f18a3b` |
| Optional unavailable tool probe | `node node_modules/eslint/bin/eslint.js <changed TypeScript files>` | 1 | `f6c9b413b008767993e6adf47bd7669a31bd44a068a0fd848839a0d3fcd5b5df` |
| Read-only Page probe | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node --input-type=module -e 'import { pageAssets } from "./apps/room/page/scripts/assets.mjs"; process.stdout.write(await pageAssets());'` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Page compiler | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node node_modules/typescript/lib/tsc.js -p apps/room/page/tsconfig.test.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Maintained Page generator | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node scripts/assets.mjs` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Complete Page asset owner, one case | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node node_modules/vitest/vitest.mjs run --project page apps/room/page/test/assets.test.ts --reporter=json --outputFile=/Users/hughpyle/play/artroom-evidence/2026-11-07-m7-page-generate/owner.json` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Four exact-source Page browser commands | `gh run view 42433985036 --json status,conclusion,headSha,url,jobs,createdAt,updatedAt,event,workflowName` | 0 | `86b7c5a2f9b49d7b9ddd95059ad7034f8d65f21e4fbc3200b60dea797e7579b4` |

## Open limits

- M7 request `11fbfe04` still needs Hugh's exact seal approval, integration of published main, one full gate, independent review and an audited landing. No full M7 gate has started.
- Request `075661e7` holds publication of M6's immutable local merge and signed succession after its commit-message formatting failure. M7 does not land before M6 publishes. The failed record remains retained.
- Parent request `e99550e9` and plan 035 remain open through M8. Prototype interpretation coverage, callback interiors and final judge orchestration are not complete. The remaining repeated lookup in `sendOrigin` belongs to that follow-up.
- Next-cohort acceptance remains open. This source evidence proves no deployment, live room or custody outcome. The planner deploys.
