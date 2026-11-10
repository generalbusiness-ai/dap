# DX-T1 typed definition authoring

Request: `00c50371c458e0bd04888f56ee04fe2e86169813`.
Promise: `b1c862b21b52ec13aacd209a09c0196d1dc194ea`.
Placement: `176190ba6ef0c0a642b1cbec0c25577c0353a8a1`.

## What changed

Promote the settled typed surface to `@generalbusiness/dap-define`.
Lending and Counter compose authored values through the package and expose
normalized declarations to their existing consumers. The helpers cover
literals, `on.take`, sibling subjects, grants and reasons, inline rules,
quantifiers, item and act values, and compiler diagnostics. Strict record
list callbacks know declared members; fetched lists use `elements`.

Keep `row.self` as the whole element. The exported
`elementMember(row, name)` reads every declared record member, including
`self`, through a required phantom key type. It adds no runtime marker or
callback method. Scalar and unannotated elements reject that helper.
`ruleReferences(source)` returns plain direct field and subject value-slot
names from the existing checked JSONata tree. Findings ignore quoted text
and record members named `values`. Dotted validator paths retain the
complete offending form. Exactly three new authoring cases cover the
three source counterexamples; existing type and profile cases strengthen
the same boundaries.

## Decisions and why

Keep `compile` outside ordinary production imports. The pin check compiles
authored values and compares exact retained JSON and pin-source bytes; its
default mode writes no output. Counter's producer forwards to the shared
explicit regeneration mode. The new package keeps the normal strict
configuration without a `skipLibCheck` override. Its plain project and
summary entry join the existing root inventories. The fixed Node stage
runs the five-case public release owner once; the existing runner case
checks its actual argv.

Preserve the historical spikes. This head supplies declaration witnesses;
their manifest/story prototypes remain witnesses for later heads. Grow
Room and the selected Change rows stay canonical-only until K-spell;
Grow Site keeps the original Room digest. The kernel dependency direction,
admission rules, evaluator behavior, declaration digests and pins stay
unchanged. The rule helper only reads the admitted tree and preserves
`admit` refusals. Its existing public subpath and deferred compiled SDK
probe include the new export.

`@generalbusiness/dap-define` is in the release plan, and its
compiled-output check and publication have not run.

Planner ruling `0a797a2e3e8230675ddccb86052237f01faff696` assigns the
standalone output checker and a current public Native capture to a later
publication request. No private capture was opened. Planner ruling
`75cea6c4db735df25ad1eb62de0e46c844f4a4d7` chose all three repairs after
the frozen refusal control. The named member signature was recorded in
`d43d895f58012ed48e88738f40903bf820500b24`.

## Evidence

The first attempt failed its first compiler before plain or Node cases.
Continuation 1 passed 13 compilers and 25 plain cases at `97b82970`, then
failed two SDK cases because Git's source-only `./diff` export was absent
from the exact exclusion tables. Selective continuation 2 passed the
whole SDK5 and runner6 owners and the pin check at `9f9dacf5`. Git still
publishes only two subpaths with five source inputs. The unchanged
partition/summary owners retain their four actual passes at `97b82970`.

The named missing-genesis control at `9f9dacf5` passed its baseline, then
failed with the expected assertion when only the final diagnostic throw
was bypassed. Each invocation collected ten titles and skipped nine.
Source restoration and closed owned groups completed. This control proves
that final refusal boundary, not the accuracy of every diagnostic.

The repaired source inherited approved main `64be0cab` at `8ae77528`,
tree `e41c12fb3e2b1d7e74220a62e5cc50593258e1ad`. Its actual focus passed
33 compiler contexts, 32 plain cases in six whole owners, SDK Node5 and
the exact retained-pin check. The existing Page asset case passed against
A's inherited generated module, so no additional regeneration ran.
All 90 retained Card module inputs stayed byte-identical and include no
changed derive/rule input. That source trace proves no browser acceptance.

The three manifests below adopt separate sealed metadata units; they keep
the earlier failures and time-specific UNRUN statements intact. Raw logs,
reports, fixture payloads and custody stay withheld in their original
owner-private units. Table output digests appear in each manifest's
`withheldOutputs`, and its listed metadata file records the exact argv,
source checkpoint, terminal exit, output size and digest. Each compiler,
body, Node or pin command has its own row; the 33/32 repair focus is one
run and does not relabel earlier failures.

- [2026-11-09-t1-pre-gate-audit.manifest.json](evidence/2026-11-09-t1-pre-gate-audit.manifest.json): `91ea63c61ca50108510ee5e3498967c0613ba3a03f916af912f471e345b29938`.
- [2026-11-09-t1-control-audit.manifest.json](evidence/2026-11-09-t1-control-audit.manifest.json): `089eb232b4a1611f239e725fcf70f51c6e7042270ea29142779dd58fb779c46c`.
- [2026-11-09-t1-focused-repair-3-audit.manifest.json](evidence/2026-11-09-t1-focused-repair-3-audit.manifest.json): `f268561afd6d1df993b3493cf59268a0b4e386095ecdad695f667a3f73b2cfe7`.

| Check | Source | Command | Exit | Withheld output SHA-256 |
|---|---|---|---:|---|
| initial/context-00 | `98859d99` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/counter/browser/tsconfig.json` | 1 | `d2ba7dcbe27ec968597709ff2fe01797f8269e095f6eb8b2da8aba7f9cfa028f` |
| initial/compatibility | `98859d99` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node scripts/cloudflare-pool-compat.mjs` | 0 | `3efd02ab3cdd635388a49ade8416450349f1cbb01749c1fb3b15bfbb5986e1d9` |
| continuation1/context-00 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/counter/browser/tsconfig.json` | 0 | `cc3900f6a9e89b927c3dc1c0479541579dd61cb2277efe262d0e02ea2a42bf70` |
| continuation1/context-01 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/counter/tsconfig.json` | 0 | `42caae702ff848d01bcda5ef5093507df9e91e01602d959b469d0539f60b17b4` |
| continuation1/context-02 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/room/lanes/tsconfig.scope.json` | 0 | `d1ab4e3fac6c22b80553fc6c4f1cbd98955364ea5635e7bab5df0bab3f4309d0` |
| continuation1/context-03 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/lending/browser/tsconfig.json` | 0 | `c1cea8fd27bb34832b11f9c20e2319a71b54e9138c7081f55c57ef34e7d235be` |
| continuation1/context-04 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/lending/tsconfig.json` | 0 | `feedbb77e52ef6dead81978ec0aea678ed1584bc50cae174fed7cd6548ba866e` |
| continuation1/context-05 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/cli/tsconfig.scope.json` | 0 | `78fefe2c60a317942abe5a56d1dd59d9d48588a0b22a6dfd303e453b8cbe6adf` |
| continuation1/context-06 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/tsconfig.json` | 0 | `746c31fe28d533297bc0d7d39ce33ac747fa3ffd253f6bcd151625a7db59edd7` |
| continuation1/context-07 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/tsconfig.test.json` | 0 | `bb656faef693f36a5e3ca2fb6e682b15f35f6732eb2947d4b4bc99de02a1f551` |
| continuation1/context-08 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/derive/tsconfig.test.json` | 0 | `b2ad68e8c12550e70d6a78a38881bcad8227f615e7b9916edd7f13988ead034f` |
| continuation1/context-09 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/mcp/tsconfig.scope.json` | 0 | `3caa4a560442807336e3995a94fbaa7955a1971d678ab981b1fb26067537415a` |
| continuation1/context-10 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/mcp/tsconfig.test.json` | 0 | `a9facc2430debbbf024b7804f4c6758c80ab359a373316d7be6535d0c8934404` |
| continuation1/context-11 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/platform/tsconfig.test.json` | 0 | `f26d1bfd916be5a6200ee88fbbf3cf1a79a00a793c21662dd21edf78d9c6aac0` |
| continuation1/context-12 | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/scope/tsconfig.test.json` | 0 | `6bb7b5392c8814a228b6a9e05917d816d9eff55319f49c27b9c5c191748d95ad` |
| continuation1/body | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/vitest/vitest.mjs run /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/test/authoring.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/test/pins.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/lending/definition.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/counter/commitments.test.ts --config /private/tmp/artroom-t1-focused-20261109.config.mts --bail=1 --allowOnly=false --passWithNoTests=false --reporter=verbose --reporter=json --reporter=/Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/scripts/focused-check.mjs --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-11-09-t1-focused-continuation-1/pipeline/vitest.json` | 0 | `9db6875aa4333c33193f259e7cfc053c9c413a9d7d0b1edfccb42f874f3bddcb` |
| continuation1/node | `97b82970` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node --test --test-reporter=tap scripts/public-release-modules.test.mjs scripts/test-phases.test.mjs scripts/test-summary.test.mjs` | 1 | `04ee033d896f679f14b74e454c14af0d8e417e9747cfa6bd36a9998c69844e2b` |
| selective2/node | `9f9dacf5` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node --test --test-reporter=tap scripts/public-release-modules.test.mjs scripts/test.test.mjs` | 0 | `276bd445ecfd60cb0ff84f7dd1c641c3eceb4cd1612ee7defc8aaa72dc0ae352` |
| selective2/pin-check | `9f9dacf5` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node --import tsx scripts/check-definition-pins.mjs` | 0 | `548c4e7e38b9da798685a82481eb0e6a21228ff2ecca60753efea1dbdb472544` |
| control/before | `9f9dacf5` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-t1-compile-refusal-control-20261109.config.mts --project define packages/define/test/authoring.test.ts -t ^compile\ refuses\ a\ structurally\ incomplete\ full\ definition$ --reporter=verbose --reporter=json --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-11-09-t1-compile-refusal-control-v2/compiler-refusal-bypass/before.json` | 0 | `16010afad6c6208ff73dcb6196811c1119f5d0baed24db14303450501638ebd1` |
| control/after | `9f9dacf5` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/vitest/vitest.mjs run --config /private/tmp/artroom-t1-compile-refusal-control-20261109.config.mts --project define packages/define/test/authoring.test.ts -t ^compile\ refuses\ a\ structurally\ incomplete\ full\ definition$ --reporter=verbose --reporter=json --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-11-09-t1-compile-refusal-control-v2/compiler-refusal-bypass/after.json` | 1 | `693c0a9110f0aafe7885928e8e028668db66010affb4e77da8f1cf8de76fb357` |
| repair3/context-00 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/counter/browser/tsconfig.json` | 0 | `332fe85afe83640c97b3128ca6eec72cf8b93bad3c381445e99cf3fea72cf613` |
| repair3/context-01 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/counter/tsconfig.json` | 0 | `42caae702ff848d01bcda5ef5093507df9e91e01602d959b469d0539f60b17b4` |
| repair3/context-02 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/room/lanes/tsconfig.scope.json` | 0 | `d88f47dc3a82e888940b9bfcd185ddc723d7b7582537e6665111eae73a71bedd` |
| repair3/context-03 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/room/lanes/tsconfig.test.json` | 0 | `d34a739655fc7a03b7bce03aa03e794fc46d9e1aaf4da58c1fbe850e0f130270` |
| repair3/context-04 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/room/page/tsconfig.json` | 0 | `58fb9b14f1226c20cf72705da2be8ae85abcba4b7f0dc41289e487abb6ba9ad0` |
| repair3/context-05 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/room/page/tsconfig.scope.json` | 0 | `5d9f5dc26d3c743b0b2b363a8af105470fcb9c721a767b97abb55a11d32d9c09` |
| repair3/context-06 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/room/page/tsconfig.test.json` | 0 | `3faed859d8c49968eaa17b29c303c6e233f2c1b06062485421dd7266bcc3abb4` |
| repair3/context-07 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/views/tsconfig.json` | 0 | `de4ff1157fa6eca5157db2abfc1b238019f5234bf31bb3d1057dbd9877b79122` |
| repair3/context-08 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/commons-bill/tsconfig.json` | 0 | `6fa757faf162e76ebdf929ebb5542c0fc8f9f1ba4108c0d2bd6712ac7ec72159` |
| repair3/context-09 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/grow/tsconfig.json` | 0 | `1931ab30a6855074ea3b49eb183a02bcb97d0006d907a212d2fa6b89794ff233` |
| repair3/context-10 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/lending/browser/tsconfig.json` | 0 | `c70f1a66ee4954fe944adeee30db5cce2e2d1b3a28f322e782a708bf00e0196f` |
| repair3/context-11 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/lending/tsconfig.json` | 0 | `31247fa8ab85d55b283f8c83d63f407c54b9b6af1473fe56aec1a24f61b2c18e` |
| repair3/context-12 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/repo-in-ai/tsconfig.json` | 0 | `118a84ca3a411fa60fc93afcf2262fdc358dae03e713afcaee359234f111af10` |
| repair3/context-13 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/checkers/tsconfig.json` | 0 | `e8d10beccdfe11fd3c5baeda1fb398c8ef49d76d61fd32a5fcdd243e683cc2c8` |
| repair3/context-14 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/checkers/tsconfig.test.json` | 0 | `4a23f0cbd4adc0ee945bd140cc6ffecc24e7c2dad9b7a707f06bf3587a4dc57c` |
| repair3/context-15 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/cli/tsconfig.json` | 0 | `1fca8cbeafba942a7283354425bea4a14182983e5c6fb35a3b0754124dd58c87` |
| repair3/context-16 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/cli/tsconfig.scope.json` | 0 | `da776556ff7273cd1ef1c23c7b87e7b00bffa4358530a4cce058af4381e5a2fb` |
| repair3/context-17 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/cli/tsconfig.test.json` | 0 | `bc399655ccabf9badb7ea94b94a43b30eb2a3056a2a9ef21868fe02b6bf4a349` |
| repair3/context-18 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/tsconfig.json` | 0 | `095ac494e24c989fa4fcfa7a67f8c9867bc12ce94eb06e4733e665a051e27f16` |
| repair3/context-19 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/tsconfig.test.json` | 0 | `c81f3d4bb562039be8d950f40d85f7ec7971e6f7928b42b7ef1b801882c9ab18` |
| repair3/context-20 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/derive/tsconfig.json` | 0 | `d2e517fe34d6360916e0d8f260ac2e553f0865b7caad04a770a7b7e2e125058d` |
| repair3/context-21 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/derive/tsconfig.test.json` | 0 | `6dbb6c7367616d8a224b8332f23676f9c1d07adfc5af39e410e419f936ae0b79` |
| repair3/context-22 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/mcp/tsconfig.json` | 0 | `6fa757faf162e76ebdf929ebb5542c0fc8f9f1ba4108c0d2bd6712ac7ec72159` |
| repair3/context-23 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/mcp/tsconfig.scope.json` | 0 | `8ac9a7c043b2ec2f42788197d472c931897a617a9fb4ef4fe865aea0184bf3be` |
| repair3/context-24 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/mcp/tsconfig.test.json` | 0 | `eec7d48f0e5c4cd9f0026320de8dbc938c2a64ecd4fc99e25787d7f95fe1ddd7` |
| repair3/context-25 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/platform/tsconfig.json` | 0 | `e84d12c1d02a1cd428fdbba8ae84ea51726a913c1c8f7104bbca04932039c047` |
| repair3/context-26 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/platform/tsconfig.test.json` | 0 | `5aca95b0fe80fe4a08caa5c9c5c92fbb0f8102bb1656fabbd44d1ea52a7d9afc` |
| repair3/context-27 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/replay/tsconfig.json` | 0 | `2d2a6f4b1d8362aaea524bdc0014abc55abacaebe6825346e8c3240a37e73c6f` |
| repair3/context-28 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/replay/tsconfig.node.json` | 0 | `b68e7c383bcbf976a65d003f5d1290a691f7cfdb164f77eeda57b3b571da1080` |
| repair3/context-29 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/replay/tsconfig.test.json` | 0 | `e4cf7a5e30acd86845f1ae58754f0510ce666bb4388aab5bc0eba9188dfc289f` |
| repair3/context-30 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/scope/test/support/tsconfig.node.json` | 0 | `b2ac57be65736ca479689428a7ded78caa29c9cabfca5391bf578cf7ea2d5d2a` |
| repair3/context-31 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/scope/tsconfig.json` | 0 | `21c66be5b7a6228e3aa866fece93bba8d4040f5c28edad25d6580a78af3fa07e` |
| repair3/context-32 | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/typescript/bin/tsc -p /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/scope/tsconfig.test.json` | 0 | `1d39c794e70def078cb65f5bc298c7ffdfba8a29892551a516a9489d58bbbc5e` |
| repair3/body | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/node_modules/vitest/vitest.mjs run /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/test/authoring.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/define/test/pins.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/examples/lending/definition.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/counter/commitments.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/packages/derive/test/rule.test.ts /Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/apps/room/page/test/assets.test.ts --config /private/tmp/artroom-t1-focused-repair-3-20261109.config.mts --bail=1 --allowOnly=false --passWithNoTests=false --reporter=verbose --reporter=json --reporter=/Users/hughpyle/play/artroom/.builder-worktrees/typed-define-t1-20261109/scripts/focused-check.mjs --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-11-09-t1-focused-repair-3/pipeline/vitest.json` | 0 | `9b7bea8393256455d45a056b6f3f9083be708d82034688b5e644187ede80f337` |
| repair3/node | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node --test --test-reporter=tap scripts/public-release-modules.test.mjs` | 0 | `b01fc0d482b1c05bb27762016b3b3c27b3a50eb3e3ac4e4a282de02e26a1bd20` |
| repair3/pin-check | `8ae77528` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node --import tsx scripts/check-definition-pins.mjs` | 0 | `548c4e7e38b9da798685a82481eb0e6a21228ff2ecca60753efea1dbdb472544` |

The independent audits read terminal receipts, same-run case identities,
source/tool/dependency hashes, exact retained pins and owned-group
cleanup. Each metadata audit exited 0 and sealed its new unit without
running an application or validation body. The repair audit records the
Page asset pass. A's Page browser citation covers its inherited assets;
C's own main-to-head paths match neither Page nor Card workflow filter.
Any workflow created by the branch push still needs its actual result.

Outer elapsed time uses each launcher's monotonic clock; CPU uses its
self and waited-child getrusage deltas. Separate command times and
concurrent case/module durations are distinct observations, not whole-run
wall time. No deadline, pool, worker count, retry or scale factor changed.
The full gate remains UNRUN. A later document-only evidence commit must
cite the actual gate source/tree and preserve the source and test bytes.

## Open limits

- DX-T1 `00c50371`: the one final full gate and exact-head review remain
  owed. Focused evidence proves no hosted deployment or live acceptance.
- K-spell `2ad35350` and DX-T3 `f682cbc4`: pin migration and the remaining
  complete definition witnesses belong to those later requests.
- DX-T4 `d49269fd`: manifest, story and view authoring remain separate;
  both historical spike witnesses retain those later owners.
- Planner ruling `0a797a2e`: compiled SDK output and publication remain
  unrun; a later publication request must own a current public capture.
