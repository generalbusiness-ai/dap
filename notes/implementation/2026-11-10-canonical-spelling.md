# Canonical spelling for new definition sources

Request `2ad35350`, promise `226d9000`, and rulings `0a0286c4`, `865f4d70`,
`23559d21`, `297e04cc`, and `98e4753c` own this change.

The repaired focus passed at `a9727fb3`. Three prechecks passed at `43e9b328`,
and its full gate failed. The archive fixture repair is at `3979f03f`.
The first archive focus failed at `3979f03f`. The archive-only control
passed all nine cases at that same head. The prechecks passed at `688cda1e`.
The full gate passed at that exact precheck head. Review, landing, and
planner deployment remain pending.
The seven earlier focus failures retain their original results.

## What changed

Canonical source admission gives new authors one spelling before signing.
Recorded journals, signatures, declarations, and raw digests keep their bytes.
The first full gate tested `43e9b32801908301066d83de2ab5725edccd3f2a`, tree
`d54901187e16e485549723249521e6c8b069f803`, with 4,598 tracked paths.
It adds the review note and 17 public manifests to repaired focus
`a9727fb3`. Earlier `e6ed7365` integrates Docs D, Docs F, and the sprint
report from main `d7736fa3`.
The Page dependency repair and served asset, the Counting test repair, and
the retained Site corpus repair entered by the 4,575-path `9578637f` checkpoint.
Attempts five and six used that checkpoint. Attempt seven used `e6ed7365`.

The kernel owns one pure spelling helper. `validateDefinition` exposes
`canonical: true`, with the default off. Define normalizes once and validates
its output in canonical mode. The CLI opts in when it reads author-listed local
definition files before packing or signing. Signed-package readers do not use
that author-source path. The decision is **refuse, in canonical mode**.

The identity delta contains eleven current definitions: Grow Room, Grow Site,
demo Room, demo Site, and seven Change variants. The shared helper supplies
canonical spelling; the maintained lane producer writes the seven Change
pins. Each Site embeds the exact selected Room digest. The census and the
later fresh verifier agree on all eleven old/current identities. No pin comes
from a simulator constant or a repeated historical baseline evaluation.

The finite evidence-incident reader recognizes the historical Change4 pin
`fe3cfa58…` and the actual generated current pin. The signed Directory factory
must name the same selected parent pin as its genesis seed. Scope source
assembly uses that same finite predicate to include the Directory genesis for
either identity. The new Native case uses real nine-fact proofs, a labelled
test-only transform, a nontrivial same-pin positive, and coherent mixed-parent
negatives. At `e6ed7365`, the case passed the issue label and nine-fact length
checks, then failed the first proof check. The fixture had treated the
`source` RPC's `Sourced` rows as `Fetched` rows. At `a9727fb3`, it decodes each
row's serialized `bytes` with `parseStrict` and sends the same nine facts to the
same three proof checks. The patch touches only
`packages/scope/test/evidence-parent-spelling.test.ts`. The production
predicate and proof assertions retain their prior source. The repaired case
passed the three checks at `a9727fb3`. [Repaired focus][m-focus-repaired]

CLI and Page retained-editor capability checks accept the exact historical
explicit `of: "on"` target and its canonical implicit equivalent. Other shape
checks remain. Page owns finite current pin literals instead of importing the
lanes runtime. The fresh MCP Grow scenario uses the current Room selector;
`prepare-check.ts` updates only the copied fresh scenario. The tracked Grow
scenario template, signed demo packet, simulator, and archived bytes remain
historical. The six-entry publishing provenance list remains current
representative metadata, not an expanded admission allowlist.

## Decisions and compatibility

[Kernel section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel) requires
one shared rule because definition identity joins the runtime and Replay. A
host or application cannot choose another spelling algorithm. F stages the
rule at authoring. The identifiers admission head will enable canonical mode
at new-format fold boundaries. F changes no raw `definitionDigest`, Scope
creation, application install, Rules, Directory, archive, or Replay call site.
Old releases can still create rooms under their own exact definitions.

The signed demo Room `b89e7f84…` and Site `d2bc830e…` retain their original
packet, signatures, journals, and simulator constants. Retained lookup stays
in `packages/scope/src/core.ts:375–396` and `namespace.ts:170–187`; Replay
checks raw bytes in `packages/replay/src/verify.ts:1430–1447`. The complete
Native archive owner contains nine obligations, including its retained Grow
producer-clone and old R17 witnesses. Both passed in the first gate at `43e9b328`, which failed
three Grow TEST cases. These results cover the TEST journals.

The first Counting TypeScript and JSON declarations keep their original bytes
and pin `435d9f57`. The corpus names exactly four retained rows: those two
Counting declarations and the signed Grow Room and Site. Room and both
Counting rows must refuse canonical admission. Site is already canonical and
must pass canonical admission while retaining its exact raw bytes, digest,
and old Room dependency. The Site repair changes only this per-row expected
admission result. It adds no exclusion, case, pin, or product exception.

The four-path test patch `717b559c` now exists at `3de5bb68`; it is no longer
an unapplied proposal. Its shared test-only helper
`packages/derive/test/support/fresh-counting-source.ts` clones a retained
Counting definition and deletes only five named empty `except` paths:
`/acts/join/guards/0/count/except`, `/acts/join/guards/1/none/except`,
`/acts/spoken/guards/2/some/except`,
`/acts/spoken/guards/4/sameSet/items/except`, and
`/acts/start/guards/3/sameSet/items/except`. Fresh authoring uses that copy's
digest. Signed packets and recorded pin reads still use the original bytes.
Later negative mutations remain unnormalized. The corpus binds each retained
Counting digest and those exact five paths, and compares normalization with
that bounded copy. A sixth empty exception or another spelling difference
fails. Canonical validation and strict pack still refuse original Counting
bytes without a product exception.

Ruling `23559d21` requires a line for each affected witness:

- `application-pack.test.ts`, “explicit v2 sources bind projections to captured definition paths and run native local replay”: prepare the fresh Counter copy before strict pack.
- `application-pack.test.ts`, “real Counter and Lending native declarations pack reproducibly into exact signed bytes”: prepare only the fresh Counter branch; keep Lending and the repeated-byte assertion.
- `application-pack.test.ts`, “v2 CLI reports proved item keys and escapes the same refusal rows through check and pack”: prepare the shared Counter fixture before replacing it with the report definition.
- `application-scenarios.test.ts`, “the actual check bin refuses vacuous scenarios and preserves explicit answer and state witnesses”: write a fresh Counting copy into the new directory while keeping the retained packet bytes.
- `canonical-spelling.test.ts`, “every pinned and generated application and native declaration has canonical spelling except the exact retained Counting and Grow declarations”: bind exactly four rows, exact digests and reasons, the five Counting paths, and the Site's actual canonical status.

At the identifiers cutover, head (c+d) changes `range` to omit an empty list,
regenerates the first Counting pin with the other identities, and removes the
two Counting exclusion rows and this shared test helper. F does not perform
that cutover or introduce a second historical spelling algorithm.

## Evidence and its scope

Follow [Testing reference](../../docs/testing-reference.md) for stand-in and
measurement limits, and [File test evidence](../../docs/evidence-filing.md)
for retained outputs and final review. The manifest links name repository
copies of sealed manifests. Raw payloads stay in owner-only custody. Copies use modes 400/500. Retention lasts
at least 30 days after landing.

The [validation history](2026-11-10-canonical-spelling-history.md) records
the earlier attempts, source correspondence, and retained observations.

The table records actual commands, exits, and output hashes. `node` means
pinned Node 26.13.0_2. Hashes cover stdout unless a row names another file.
Manifest indexes retain exact argv, timing, environment, and cleanup.

```text
F /Users/hughpyle/play/artroom/.builder-worktrees/canonical-spelling-f-20261110
R0 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-focus-successor143/run
R1 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-focus-continuation18-8dc/run
R2 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-node-native-0ca2/run
R3 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-editor-8dc1381c/run
R5 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-combined82-3de/run
R6 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-site-docs94-957/run
R7 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-same957-crash-control/run
R8 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-native8-only/run
R9 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-native7-scope23/run
R10 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-repair-focus-3979/run
R11 /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-only-control-3979/run
S0 /private/tmp/artroom-f-source-seal-frozen-93a87a7b-20261110
S1 /private/tmp/artroom-f-supports-edit-seal-frozen-038480f8-20261110
RD /Users/hughpyle/play/artroom-evidence/2026-11-10-f-docs-assets/run
G /Users/hughpyle/play/artroom-evidence/2026-11-10-f-final-gate-43e9
BASE d7736fa3de1c75d588f003f3d7e467545cf8ed06
HEAD 43e9b32801908301066d83de2ab5725edccd3f2a
FINAL 688cda1ef5b3a70a917bc9132bd6984943cca5be
GF /Users/hughpyle/play/artroom-evidence/2026-11-10-f-final-gate-688c
```

| Check and source | Actual command | Exit | Output SHA-256 | Manifest |
|---|---|---|---|---|
| AST metadata, `93a87a7b` | `node "$S0/producer.mjs" --reviewed-metadata "$S0/plan.json" /private/tmp/artroom-f-actual-source-seals-93a87a7b-20261110` | producer/launcher `0/0` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (stdout) | [b8d4f976][m-seals] |
| CLI named AST metadata, `038480f8` | `node "$S1/producer.mjs" --reviewed-metadata "$S1/plan.json" /private/tmp/artroom-f-supports-edit-actual-seal-20261110` | producer/launcher `0/0` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (stdout) | [8817f1d8][m-cli-seal] |
| Census, `d4cb0cb2` | `node /private/tmp/artroom-f-eleven-pin-frozen-v4-d4cb0cb2-20261110/census.mjs /private/tmp/artroom-f-eleven-pin-frozen-v4-d4cb0cb2-20261110/census.config.json` | `0` | `1d7731e18edfab2633b9c759a9623390fbc860a9fbb04027f7e32f7392ac3419` | [0a4515cd][m-partial] |
| Default pins, `d4cb0cb2` | `node apps/room/lanes/scripts/pin.mjs` | `0` | `d8d5731f5e595d08353af971a9ad2507497d3e7a522ccebed9a21d6f42534f07` | [0a4515cd][m-partial] |
| J4 pins, `e99a771e` | `node apps/room/lanes/scripts/pin.mjs --j4` | `0` | `9db538a2f7ac8b542c558dd357633e4992f4e57c6f2d235c3d8e60e1e5236d85` | [88d4acda][m-continuation] |
| Finding pins, `e99a771e` | `node apps/room/lanes/scripts/pin.mjs --finding` | `0` | `a1ab178b05eccf36570b336c402ec64db09127e7449c1aa16a4e92e89651fbff` | [88d4acda][m-continuation] |
| Fresh verifier, `e99a771e` | `node /private/tmp/artroom-f-eleven-pin-continuation-e99a771e-20261110/verifier.mjs /private/tmp/artroom-f-eleven-pin-continuation-e99a771e-20261110/verify.config.json` | `0` | `a4932cec5a2d7c90d7b95907e2aa9461e4bd9bf47aa49f2ad6d3e8e8baee5990` | [88d4acda][m-continuation] |
| Lane reference, `9bf8a1a8` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/node apps/room/lanes/scripts/reference.mjs` | `0` | `504d8ea0886a6b49e9ca6d766ccca8e5bdec57e3e765c6afaf9fa8180683b26b` | [411a31e9][m-docs] |
| MCP two whole owners, `9bf8a1a8` | `node $F/node_modules/vitest/vitest.mjs run $F/packages/mcp/test/inventory.test.ts $F/packages/mcp/test/describe.test.ts --config $RD/body/mcp-config/mcp-docs.config.mts --bail=1 --allowOnly=false --passWithNoTests=false --reporter=verbose --reporter=json --reporter=$F/scripts/focused-check.mjs --outputFile.json=$RD/body/mcp-report/vitest.json` | `0` | `c43072787a29b9cb4e48ce991237b621a71851df8ed43c337a4d38a91bf02892` | [411a31e9][m-docs] |
| Lending capture, `9bf8a1a8` | `node --import $F/node_modules/tsx/dist/loader.mjs /private/tmp/artroom-f-docs-assets-frozen-v3c-9bf8-20261110/lending.mjs /private/tmp/artroom-f-docs-assets-frozen-v3c-9bf8-20261110/lending.config.json` | `0` | `fa4ef99ddb86197f2a8b2d511d3626000f0bb4774ebbb56e24ea060e54005926` | [411a31e9][m-docs] |
| Initial Page build, `9bf8a1a8` | `npm run build --workspace @generalbusiness/dap-page` | `0` | `a1d1fa6e3ec8faa73bd5f32e43acc78cb37e7cd5a5be5477f2e9411f23b87aed` | [411a31e9][m-docs] |
| Subject-repair Page build, `01b9e7bf` | `npm run build --workspace @generalbusiness/dap-page` (repair source `01b9e7bf`) | `0` | `0f138ddca565eb91b92de2e3fb73cfa80dd96527310c3e216dd020d2d9415a02` | [88ff2040][m-page-subject] |
| Failed compiler, `d1d09f3c` | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` (source `d1d09f3c`; complete `compiler-23.log`) | `1` | `9165ab72a321cbd4b6e02be359370b5a2d26f245a828818779cba20238dd6e4f` | [4ce79882][m-focus1] |
| First focus, `d1d09f3c` | `node scripts/focused-check.mjs "$R0/body/plain-config/plan.json" "$R0/body/plain-focused"` (session `93759`; compiler stop) | `1`; runner/driver/launcher `1/1/1` | `13f6fa18aa9691bad180473aac4bb5f601c3b6ecb6e9e749c8d9ef44a8ec9972` | [4ce79882][m-focus1] |
| Plain continuation, `8dc1381c` | `node scripts/focused-check.mjs "$R1/body/plain-config/plan.json" "$R1/body/plain-focused"` (session `36384`; 18 compilers then partial Plain) | `1`; runner/driver/launcher `1/1/1` | `7708c21c17fc5d610c61370d0a0dc0b73e54eb67302cf1e431200a9f104fd1b6` | [2a092fa6][m-focus2] |
| Node attempt, `0ca2b250` | `node --test --test-reporter=tap --test-reporter=file://$F/scripts/test-summary.mjs --test-reporter-destination=stdout --test-reporter-destination=$R2/body/node.jsonl "$F/scripts/active-source.test.mjs" "$F/scripts/security-entry-points.test.mjs" "$F/apps/views/test/s4.test.mjs" "$F/apps/views/test/j5.test.mjs"` (session `93112`) | `1`; runner/driver/launcher `1/1/1` | `b1194f3cd961039432572e09a4e398e22c01b38124bf5f13c53f503853fcc82d` | [63c23c23][m-focus3] |
| Editor check, `8dc1381c` | `node verification/state-machines/check.mjs Editor` (actual `8dc1381c`) | `0` | `f0edec1896111f8f1563c1726b6438a99da21409a200a33e92d0d4b6c9346ab7` | [a122edee][m-editor] |
| Editor chart, `8dc1381c` | `node --disable-warning=ExperimentalWarning /private/tmp/artroom-f-editor-frozen-8dc1381c-20261110/statechart/statechart.ts /private/tmp/artroom-f-editor-frozen-8dc1381c-20261110/models/Editor/Editor.tla --config /private/tmp/artroom-f-editor-frozen-8dc1381c-20261110/models/Editor/Editor.cfg --view /private/tmp/artroom-f-editor-frozen-8dc1381c-20261110/models/Editor/view.mjs --out "$R3/Editor-chart"` | `0` | `816569c3194423afa3f3c0a8c8bc6f23738e38b127aa670201307e7e50253420` | [a122edee][m-editor] |
| Page layer build, `6df7088a` | `npm run build --workspace @generalbusiness/dap-page` (actual `6df7088a`, session `87344`) | `0`; runner/driver/launcher `0/0/0` | `d2251b9bc6181d3854ac67863f337e14a1bf5a98093673f6b27a3d1ff439e3c0` | [f539a059][m-page-boundary] |
| Fourth focus, `3de5bb68` | `node scripts/focused-check.mjs "$R5/body/plain-config/plan.json" "$R5/body/plain-focused"` | child/runner/driver/launcher `1/1/1/1` | `31aa8b3d524685207e6a78e66b19c1f5f7b2870a18b01de6676ffe70614f5196` | [4703c7d9][m-focus4] |
| Page terminal job, `3de5bb68` | `gh api repos/generalbusiness-ai/dap/actions/jobs/130099294282` | GET `0`; all 12 steps success | `ca4cf2a6fa7d13aef35dad5152f891d86e9bb6280b85ea1dee5754ca8fafac14` | [5cbe5904][m-ci-current] |
| Card terminal job, `3de5bb68` | `gh api repos/generalbusiness-ai/dap/actions/jobs/130106736302` | GET `0`; all 13 steps success | `c2bf419f088f1a255fa6b472e6ddf156e88382394b49b88a2a0f9da9f3839517` | [5cbe5904][m-ci-current] |
| Derive compiler in fifth focus, `9578637f` | `node "$F/node_modules/typescript/bin/tsc" -p "$F/packages/derive/tsconfig.test.json"` | `0` | `c1b01215b5d15f3a5726a57213ffd3473c9b6acebd18d6d6caa86f0645b2d291` (complete compiler log) | [073c9461][m-focus5] |
| Fifth focus, `9578637f` | `node "$F/scripts/focused-check.mjs" "$R6/body/plain-config/plan.json" "$R6/body/plain-focused"` | Plain/runner/driver/launcher `1/1/1/1`; Vitest `SIGBUS`, numeric exit null | `42621e93b0e9d4d1f79b2cdd342fed91f1d31583ee9dac92aaa1b5522b551a2a` | [073c9461][m-focus5] |
| Derive compiler in control, `9578637f` | `node "$F/node_modules/typescript/bin/tsc" -p "$F/packages/derive/tsconfig.test.json"` | `0` | `3afc5c99c459d6852af44f0c7682b5b5492fdf64ce8f150adb848ed0e458b023` (complete compiler log) | [a922000f][m-focus6] |
| Control Plain, `9578637f` | `node "$F/scripts/focused-check.mjs" "$R7/body/plain-config/plan.json" "$R7/body/plain-focused"` | `0`; 62 cases passed | `2eaa54b5aad1e761ecc9b0016a4ecb53f93867e06d60f5fbad0a0f2ed3c64a60` | [a922000f][m-focus6] |
| Control Node, `9578637f` | `node --test --test-reporter=tap --test-reporter=file://$F/scripts/test-summary.mjs --test-reporter-destination=stdout --test-reporter-destination=$R7/body/node.jsonl "$F/scripts/active-source.test.mjs" "$F/scripts/security-entry-points.test.mjs"` | `0`; 24 cases passed | `21eebac7bd1c50ba2e8843b557e20b07e0e72039ff3e4c1d5035ca7cda2b2849` | [a922000f][m-focus6] |
| Control Native selection, `9578637f` | `node "$F/scripts/focused-check.mjs" "$R7/body/native-config/plan.json" "$R7/body/native-focused"` | Native/runner/driver/launcher `1/1/1/1`; eight cases unrun | `118485d61cf9c02d9be6ea84715c556d1bfa9cbad72b4dc7f6f9c5e7f51102c4` | [a922000f][m-focus6] |
| Seventh focus, `e6ed7365` | `node $F/node_modules/vitest/vitest.mjs run $F/packages/scope/test/evidence-parent-spelling.test.ts $F/apps/room/page/test/story.scope.test.ts $F/apps/room/page/test/retained-editor.scope.test.ts --config $R8/body/native-config/native.config.mts --bail=1 --allowOnly=false --passWithNoTests=false --reporter=verbose --reporter=json --reporter=$F/scripts/focused-check.mjs --outputFile.json=$R8/body/native-focused/vitest.json` | Native/runner/driver/launcher `1/1/1/1` | `ea752d241c93c128e20339360238884d87fa837f14557a6de2732bfffb2f2128` (Native stdout) | [8091d431][m-focus7] |
| Scope compiler 23, `a9727fb3` | `node $F/node_modules/typescript/bin/tsc -p $F/packages/scope/tsconfig.test.json` | `0` | `7f5629617c854d2823254ea5eec1fa954e1b375fc96f8db4b31b517193505177` (complete compiler log) | [d818c3dc][m-focus-repaired] |
| Repaired Native, `a9727fb3` | `node $F/node_modules/vitest/vitest.mjs run $F/packages/scope/test/evidence-parent-spelling.test.ts $F/apps/room/page/test/retained-editor.scope.test.ts --config $R9/body/native-config/native.config.mts --bail=1 --allowOnly=false --passWithNoTests=false --reporter=verbose --reporter=json --reporter=$F/scripts/focused-check.mjs --outputFile.json=$R9/body/native-focused/vitest.json` | `0` | `baa73252b94de0c36823487f414154f5c070d599ba6588c923a934d37e16f7b3` (complete Vitest log) | [d818c3dc][m-focus-repaired] |
| Repaired focus wrapper, `a9727fb3` | `node $F/scripts/focused-check.mjs $R9/body/native-config/plan.json $R9/body/native-focused` | Native/runner/driver/launcher/command `0/0/0/0/0` | `8eacfaec682a813833e404c216bd32dde6be6bb33fa02bd231a1d798b3daf2ff` (Native stdout) | [d818c3dc][m-focus-repaired] |
| Whitespace, `43e9b328` | `git diff --check "$BASE" "$HEAD"` | `0` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | [85d1c563][m-static] |
| Commit messages, `43e9b328` | `node scripts/check-commit-messages.mjs "$BASE" "$HEAD"` | `0`; 26 checked, zero flagged | `fbcfeda467c63e2a28b82227b54478d1e327c437a59d6b142e7c8020234e8fc4` | [85d1c563][m-static] |
| Format, `43e9b328` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/npm run format:check` | `0` | `6b858014bbe6926fbcfb41b3c9377ec28b3138bf83ce53de8790e5ed46af9d79` | [85d1c563][m-static] |
| Full gate, `43e9b328` | `/usr/bin/caffeinate -i /usr/bin/time -p -o "$G/gate.time" npm run gate` | gate/inner/outer/launcher/command `1/1/1/1/1` | `d3be465224a5007787d84935a686112d3f71b40066f07717f832dafc81bd17e4` (gate log) | [b19a7114][m-gate] |
| Scope compiler 23, `3979f03f` | `node "$F/node_modules/typescript/bin/tsc" -p "$F/packages/scope/tsconfig.test.json"` | `0` | `d176ea0c291938d3efb974f8b730a09f45ef4e5960c0c49b2890db175918c812` (compiler log) | [a3b39913][m-grow-run-seal] |
| Archive repair Native focus, `3979f03f` | `node "$F/node_modules/vitest/vitest.mjs" run "$F/packages/scope/test/archive-installed.test.ts" "$F/packages/scope/test/source-order.test.ts" --config "$R10/body/native-config/native.config.mts" --bail=1 --allowOnly=false --passWithNoTests=false --reporter=verbose --reporter=json --reporter="$F/scripts/focused-check.mjs" --outputFile.json="$R10/body/native-focused/vitest.json"` | child/Native/runner/driver/launcher/command `1/1/1/1/1/1` | `06953df463a17b6b7a2d24d06af1d80ac850ffc2d6074baf868c33fb89e9a0fe` (Vitest log) | [a3b39913][m-grow-run-seal] |
| Archive-only Native control, `3979f03f` | `node "$F/node_modules/vitest/vitest.mjs" run "$F/packages/scope/test/archive-installed.test.ts" --config "$R11/body/native-config/native.config.mts" --bail=1 --allowOnly=false --passWithNoTests=false --reporter=verbose --reporter=json --reporter="$F/scripts/focused-check.mjs" --outputFile.json="$R11/body/native-focused/vitest.json"` | child/Native/runner/driver/launcher/command `0/0/0/0/0/0` | `00ffe4cf720febffcdb8e8f7821fc2f7f7be429cfa9ab34ad022491b77e2c390` (Vitest log) | [cbd25201][m-archive-control-seal] |
| Whitespace, `688cda1e` | `git diff --check "$BASE" "$FINAL"` | `0` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | [58d18151][m-static-final] |
| Commit messages, `688cda1e` | `node scripts/check-commit-messages.mjs "$BASE" "$FINAL"` | `0`; 29 checked, zero flagged | `3e005adbebc4ecf196ca22b0aa0e3b49cd2607c7ea38195671bfb7116501752b` | [58d18151][m-static-final] |
| Format, `688cda1e` | `/opt/homebrew/Cellar/node/26.13.0_2/bin/npm run format:check` | `0` | `6b858014bbe6926fbcfb41b3c9377ec28b3138bf83ce53de8790e5ed46af9d79` | [58d18151][m-static-final] |
| Full gate, `688cda1e` | `/usr/bin/caffeinate -i /usr/bin/time -p -o "$GF/gate.time" npm run gate` | gate/inner/outer/launcher/command `0/0/0/0/0` | `35191dc6b56a8cfda4341fcc1d10c6e356927f80128cd51a874a7240b4116084` (gate log) | [778d014b][m-gate-final] |

## Prechecks and failed gate

Static booking `3e25e213` and END `cf15d1e6` record all six original exits
and the command exit at zero. Inner and outer times were 12.209 and 12.397
seconds. The 4,598 source, 8,311 tool, and 43 input pins matched, both main
refs matched before and after, and cleanup closed empty. An earlier launcher
refused the inherited PATH before any static body, exit one. The first
static archive `d6ea338a` had two invalid checksum self-entries. Gate booking
`42f4` closed at `10c5` without a body. V3 readback and seal exited zero and
retain the same static originals with valid checksums. [Precheck seal][m-static]

The gate ran once at booking `5d75e0ee`, END `ea310c10`. It passed the 11
stages before tests, including 16 typecheck scripts and 45 compiler contexts.
Node passed 150, Counting 56, and Plain 4,509 with one skip. Native recorded
1,130 passes, three failures, and two skips. All six selected Scale cases
passed. The terminal report covers 5,851 of 5,852 expected cases and 707
of 708 owner identities. The 111 unknown wrapper observations stay outside
case counts. The skipped Page Recorder duration stays unknown.

Original Grow looked up a historical cost by the new fixture pin and received
`undefined` at `archive-installed.test.ts:954:40`. Publication and failed-claim
failed the old Room text digest check at Directory sequence 5, line
`1370:144`. The Native reporter separately records one unhandled
`cloudflare-pool` Worker exit. The log records a 10,000 ms close timeout.
The terminal ledger has no final case for `source-order.test.ts`. The earlier
`SIGBUS` did not recur here.

The gate's source, tool, and input fences matched 4,598/8,311/63. Both main
refs matched and cleanup closed empty. Inner and outer times were 1,414.062
and 1,414.348 seconds. The ten-second RSS observer completed 142 samples
without error. Sampled single-process maxima were 2,602,448 KiB for Node and
3,057,488 KiB for workerd. The first terminal metadata readback exited one
because it expected command receipt mode 0600 after the receipt became 0400.
The bytes matched. V3 readback and seal exited zero and retain the failed
gate. [Failed gate seal][m-gate]

The [Worker exit record](2026-11-10-canonical-spelling-history.md#worker-exit-at-43e9b328)
compares the aborting PID’s final sample of 2,352,208 KiB with the gate
maximum of 3,057,488 KiB on a different PID. Its test assignments remain unknown.

## Archive fixture repair at `3979f03f`

Ruling `297e04cc` resolves request `51cb1f6e`. The Grow cost case signs a
TEST packet with the exact pre-F Site and Room declarations. The packet
reuses the public config and assets and remaps the definition references.
The case checks the old pins and the Room text digest. The independent
gross and support receipt blocks match their historical source byte for
byte. An exact old-pin cost difference remains a failed assertion.
[Source proof][m-grow-source] [Historical receipt proof][m-grow-cost]

Publication and failed-claim keep the fresh canonical packet. Each case
derives the text digest and stored byte count from the signed child
declaration before archive work. Both compare that digest and count at
Directory sequence 5 and retain the scalar byte count, discovery, and
replay checks. The repair changes the test owner and adds two raw TEST
declarations. The committed signed demo and shared test setup keep their
bytes.

| Native case | Package input | Evidence checked |
|---|---|---|
| installed fixture scopes export genesis zero after a late native membership directory binding | Constructed TEST packet | Existing local fixture |
| installed Grow scopes export genesis zero after a late native membership directory binding | Retained TEST Site/Room | Exact pre-F bytes and old gross and support receipts |
| installed Grow production scopes export genesis zero after a late native membership directory binding | Committed signed demo | Retained release and native export |
| installed Grow production public archive command verifies its native producer clone | Committed signed demo via producer | Retained release and native clone |
| installed Grow activation warm scopes export genesis zero after a late native membership directory binding | Committed signed demo | Retained release and warm activation |
| installed Grow activation evicted scopes export genesis zero after a late native membership directory binding | Committed signed demo | Retained release and evicted activation |
| installed Grow publication scopes export genesis zero after a late native membership directory binding | Fresh canonical Site/Room | Signed child text digest and Directory sequence 5 |
| installed Grow failed-claim scopes export genesis zero after a late native membership directory binding | Fresh canonical Site/Room | Signed child text digest and Directory sequence 5 |
| installed old R17 Grow advances a published thirty-seven-pass history from sequence 146 with an exact remainder | Committed signed demo | Retained release and old R17 Room A shape |

## Archive fixture focus at `3979f03f`

Booking `94d41fbc` and END `8f25399b` record one Scope test compiler 23
run and one focus of both Native owners under ruling `297e04cc`. The compiler exited zero in 0.83 seconds. Vitest
and the Native wrapper, runner, driver, launcher, and command each exited
one. Vitest ran for 62.79 seconds. The outer receipt records 71.511163709
seconds and empty cleanup. Eight RSS samples recorded single-process
maxima of 874,064 KiB for Node and 511,568 KiB for workerd.
[Command result][m-grow-run-result] [RSS receipt][m-grow-run-rss]

The Native focus recorded eight passes. Source-order passed its only case.
Seven archive-installed cases passed, including the retained Grow cost
case and canonical publication. Failed-claim recorded `Network connection
lost.` at 4,980 ms. The log serializes `remote: true` and `retryable: true`.
It records no assertion failure or source stack frame. The reporter ended
as interrupted with zero unhandled errors. The old R17 case is pending in
both per-case reports. The built-in aggregate reports zero pending tests
despite its pending case row. The archive-installed owner failed.
[Vitest log][m-grow-run-log] [Case callbacks][m-grow-run-cases] [Built-in JSON][m-grow-run-json]

The metadata readback and seal each exited zero. The sealed focus retains
its failed outcome and adopts zero case results for carry. The independent
readback matched 690 copies to their originals and verified both checksum
indexes. [Failure seal][m-grow-run-seal] [Terminal summary][m-grow-run-terminal] [Custody readback][m-grow-run-peer]

The failed-claim record includes 37 one-entry pass footprints and the
3,481-byte membership-copy cost receipt written at
`archive-installed.test.ts:1350`. That receipt precedes the credential
refusal assertion at line 1353. The log ends with generic archive-row
diagnostics and the remote error. It contains no failed-claim closure
marker or record that identifies the failing RPC. The evidence does not
establish whether the omission comparison ran. [Vitest log][m-grow-run-log]

## Archive-only control at `3979f03f`

Ruling `98e4753c` resolves request `b0591d58` and authorizes one unchanged
run of the whole archive-installed owner with passive RSS sampling.
Booking `924f69d2` and END `3d41e72b` record all nine Native passes, including
canonical failed-claim and old R17. The public reporter and built-in JSON
agree on the nine identities and results. The reporter records zero
unhandled errors. Vitest and all five command and wrapper receipts
exited zero. [Command result][m-archive-control-command] [Case callbacks][m-archive-control-cases] [Built-in JSON][m-archive-control-json]

Vitest ran for 72.90 seconds and the outer receipt records 84.064061333
seconds. Nine samples recorded single-process maxima of 908,928 KiB for
Node and 591,024 KiB for workerd. Both main refs and the final custody
fence matched. Cleanup closed empty. The metadata readback and seal
exited zero. The independent readback matched 709 sealed copies to their
originals and verified both checksum indexes. [RSS receipt][m-archive-control-rss]
[Pass seal][m-archive-control-seal] [Terminal summary][m-archive-control-terminal] [Custody readback][m-archive-control-seal-peer]

The control ran zero compilers and zero source-order cases. The frozen
correspondence matched tracked source and tools to the earlier focus at
the same head. Scope compiler 23 and the sole source-order case retain
their own passing observations at booking `94d41fbc`. The earlier focus
and the `43e9b328` gate retain their failed outcomes.
[Source correspondence][m-archive-control-peer] [Earlier focus seal][m-grow-run-seal] [Earlier gate seal][m-gate]

## Prechecks at `688cda1e`

Booking `f70eaf25` and END `dd006d93` record the three precheck exits and
four wrapper or command exits at zero. The source, tool, and input fences
matched 4,604, 8,311, and 54 entries. Both main refs matched. Cleanup
closed empty. Inner and outer times were 11.491 and 11.667 seconds.
The V1 archive readback exited one on a mistyped historical booking ID.
The corrected metadata readback and seal exited zero. Both preserve the
same single precheck invocation. [Final static seal][m-static-final]

The focused source `3979f03f` and the precheck source `688cda1e` differ
only in the implementation note and the two focused-run manifests. All
4,601 other tracked blobs and modes match. The final gate ran at the exact precheck head and tree.

## Full gate at `688cda1e`

Booking `1a99b2d6` and END `e0d7d8ae` record the passing gate. All five
actual exit receipts read zero. The analyzer and independent raw readback
also exited zero with zero readback issues. The public and built-in
ledgers reconcile all 5,852 known cases across 708 owners. Node passed
150 and Counting passed 56. Plain passed 4,509 with one skip. Native
passed 1,134 with two skips. All 45 compiler contexts and 16 typecheck
scripts completed. All six selected Scale cases passed. The 111 unknown
wrapper observations remain outside case counts. The skipped Page
Recorder duration remains unknown. [Final gate seal][m-gate-final]

Archive-installed passed all nine cases and source-order passed. The raw
log contains no runtime error signature or unexpected deadline diagnostic.
Both main refs matched, the 4,604 source, 8,311 tool, and 132 input fences
held, and cleanup closed empty. Inner and outer elapsed times were
1,286.1119515 and 1,286.388777208 seconds. The passive ten-second sampler
completed 129 samples. Single-process maxima were 2,342,848 KiB for Node
and 2,970,304 KiB for workerd PID 2916. [Final gate summary][m-gate-final-summary]

The tracked closure comparison to `688cda1e` retains all 703 Page inputs,
727 Card inputs, and 398 MCP Describe inputs from their actual historical
sources. Their run IDs and results keep the original source attribution.
The comparison establishes Git blob and mode equality for those declared
tracked inputs. [Current source correspondence][m-final-closure]

The gate warned that the primary note at `688cda1e` had 51,674 bytes.
This reporting follow-up moves historical detail into the linked annex
and preserves the command and nine-case fixture tables. It adds the two
sealed final manifests. All 4,603 existing tracked rows outside the
primary note retain the gate’s blobs and modes. The gate’s tree is
`be8a8e57d87b9b53a6f53f3f16f9587eed18a17c`. The reviewer binds the later
reporting tree and this four-path delta under
[the follow-up rule](../../docs/evidence-filing.md#follow-up-after-a-gate).

## Open limits and remaining checks

Ruling `297e04cc` assigns any final gate with an unhandled Worker exit
or missing owner and zero assertion failures to the planner for a ruling
on splitting Native.

Ruling `865f4d70` assigns canonical fold admission to identifiers head (c+d).
Ruling `23559d21` assigns removal of the temporary Counting helper and two
Counting exclusions to that same cutover. F establishes no live activation,
deployment, migration, rollback, HTTP cutover, room acceptance, or live J5
acceptance.

[m-seals]: evidence/2026-11-10-f-canonical-source-seals.manifest.json
[m-cli-seal]: evidence/2026-11-10-f-supports-edit-seal.manifest.json
[m-partial]: evidence/2026-11-10-f-eleven-pins-partial.manifest.json
[m-continuation]: evidence/2026-11-10-f-eleven-pin-continuation.manifest.json
[m-docs]: evidence/2026-11-10-f-docs-assets.manifest.json
[m-page-subject]: evidence/2026-11-10-f-page-rebuild.manifest.json
[m-focus1]: evidence/2026-11-10-f-focus-v5-compiler-failure.manifest.json
[m-focus2]: evidence/2026-11-10-f-focus-continuation18-plain-failure.manifest.json
[m-focus3]: evidence/2026-11-10-f-node-native-failure.manifest.json
[m-editor]: evidence/2026-11-10-f-editor.manifest.json
[m-page-boundary]: evidence/2026-11-10-f-page-boundary-rebuild.manifest.json
[m-focus4]: evidence/2026-11-10-f-combined82-failure.manifest.json
[m-focus5]: evidence/2026-11-10-f-site-docs94-sigbus-failure.manifest.json
[m-focus6]: evidence/2026-11-10-f-same957-control-failure.manifest.json
[m-ci-old]: evidence/2026-11-10-f-browser-ci.manifest.json
[m-ci-current]: evidence/2026-11-10-f-current3de-browser-ci.manifest.json
[m-focus7]: evidence/2026-11-10-f-native8-assertion-failure.manifest.json
[m-focus-repaired]: evidence/2026-11-10-f-native7-scope23-repaired-focus.manifest.json
[m-static]: evidence/2026-11-10-f-final-static-43e9-v3.manifest.json
[m-gate]: evidence/2026-11-10-f-final-gate-43e9.manifest.json
[m-worker]: /private/tmp/artroom-f-43e9-worker-exit-forensics-20261110.md
[m-worker-gc]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-final-gate-43e9-sealed/private/gate/stage.unCiMSXK/test.log:267122
[m-worker-rss]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-final-gate-43e9-sealed/private/outer-launch/rss-samples/samples.jsonl:98
[m-worker-progress]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-final-gate-43e9-sealed/private/gate/case-progress.native.jsonl:2102
[m-worker-br13]: 2026-11-09-br13-version-questions.md
[m-grow-source]: /private/tmp/artroom-jp1-f-archive-grow-fixture-patch-source-v2-20261110/SOURCE.PROOF.json
[m-grow-cost]: /private/tmp/artroom-jp1-f-archive-grow-v2-historical-receipt-proof-20261110.json
[m-grow-run-result]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-repair-focus-3979/run/body/native-focused/result.json
[m-grow-run-rss]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-repair-focus-3979/run/rss-peaks.json
[m-grow-run-log]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-repair-focus-3979/run/body/native-focused/body.log:6810
[m-grow-run-cases]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-repair-focus-3979/run/body/native-focused/coverage.jsonl
[m-grow-run-json]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-repair-focus-3979/run/body/native-focused/vitest.json
[m-grow-run-seal]: evidence/2026-11-10-f-archive-repair-focus-3979-failure.manifest.json
[m-grow-run-terminal]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-repair-focus-3979/failed-focus-sealed/unit/terminal-summary.json
[m-grow-run-peer]: /private/tmp/artroom-jp1-f-3979-focus-failure-seal-peer-20261110.json
[m-archive-control-command]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-only-control-3979/run/body/native-focused/result.json
[m-archive-control-cases]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-only-control-3979/run/body/native-focused/coverage.jsonl
[m-archive-control-json]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-only-control-3979/run/body/native-focused/vitest.json
[m-archive-control-rss]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-only-control-3979/run/rss-peaks.json
[m-archive-control-peer]: /private/tmp/artroom-f-archive-only-3979-frozen-independent-readback-20261110.json
[m-archive-control-seal]: evidence/2026-11-10-f-archive-only-focus-3979.manifest.json
[m-archive-control-terminal]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-archive-only-control-3979/archive-focus-sealed/unit/terminal-summary.json
[m-archive-control-seal-peer]: /private/tmp/artroom-jp1-f-archive-only-3979-pass-seal-peer-20261110.json
[m-static-final]: evidence/2026-11-10-f-final-static-688c.manifest.json
[m-gate-final]: evidence/2026-11-10-f-final-gate-688c.manifest.json
[m-gate-final-summary]: /Users/hughpyle/play/artroom-evidence/2026-11-10-f-final-gate-688c-sealed/unit/terminal-summary.json
[m-final-closure]: /private/tmp/artroom-jp1-f-688c-final-review-draft-20261110/LIVE-COVERAGE.PLAN.json
