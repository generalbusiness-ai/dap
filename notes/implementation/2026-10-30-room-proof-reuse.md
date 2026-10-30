# Room proof reuse: repaired source and gate

## Change and required repair

Request `7c0e8181a4edc7c45a00f5b4cc3815e98a61f890` and promise
`310185bf8291b7c7d4a373d845a449b6bc374e9a` define this work.

Review `068203072c8269e730f3c0ddf140fc078e518630` requests changes at
H `57fb198836c1b9a083c1cc855a8b2e4e2b0a17f7`, tree
`e6323467c3bcf6c26bc2db2434b64eb89c5cf43a`.
It confirms the default room witness and G's pass.
It finds two settlement defects.

A later block can mask earlier debt, ancestry gaps or incomplete byte spans.
H drops B's debt at 5 after a block at 20.
A consumer using entry 10 can wrongly report consistent.

H also wrongly recovers missing text without declared capacity or redaction.
Another checked scope supplies the body, even with one requested root.
I `013617423309d63006f8fb062e58b5cd099bdcbf`, tree
`b50883592d50e1e63097a0d703ebe55804ca0bd1`, repairs both defects.
Only verify.ts and the new room-recovery.test.ts change from H.
`#recordProblem` retains each scope's earliest problem.
Shared `#canRecoverDebt` preserves the standalone capacity, binding and numeric
text-size rule.
Main replay tests and the original three recovery cases stay unchanged.
Two new cases compare standalone and room results.
G's gate pass remains historical. Gate 4 now passes at repaired source I.

`dap verify --all` shares checked Membership prefixes with later Inbox proofs.
It retains proof only in command-local memory.
Defaults remain 300,000 milliseconds, 268,435,456 received bytes,
100,000 HTTP attempts and 100,000 distinct history entries.

Diff base is `5c6ea9bb8c25135605bcbe28d2426d54234e40b3`,
tree `bb685f2b991ec1bfafe52e869e6af047a099c1aa`.
The parent owns the index and native rebuild repairs.
Collector base `2d6811db8ca88f58ddb60e5cfe197679fbd0ce15` predates later
parent repairs. Relative snapshots include them without establishing child credit.

## Decisions

Ruling `8e0c4ff6053fedf38be34b6a8dfeb8c2e743b39a` defines a joint room proof.
Requested roots start at depth zero.
Foreign depth follows the shortest observed root chain, including later roots.
Standalone `verify(source, options)` retains single-target semantics.
Contract section 9.4 and the replay README define this distinction.

`roomVerification` owns shared work under fixed source and semantic, code and
trust options.
`checkTarget` returns provisional tokens.
`finish` returns summaries and the coverage and trust union.
Prefixes name their proving roots.
The CLI checks the requested root set and order.
Proof binds scope, incarnation, kind, sequence and hash.
Replayed facts stay distinct from anchored facts.

Discovery identifies targets and charges work, not history proof.
Digest-checked content still needs schema and admission judgment.
Content proves neither birth presence nor authority.
Recovery must retain binding and capacity rules.
Roots refresh heads and check expected heads and causal prefixes.
Contradictions retract dependent coverage.
Reuse rebuilds failed mutable folds from checked bytes.
Old witnesses cover these boundaries, not the settlement counterexamples.

CLI deduplication checks hashes, canonical bytes, sequence and source frame.
Known copies remain readable at the ceiling.
New identities incur charges before retention.
Accounting stores identities alone.
Replay counts unique checked entries across reuse and rebuilding.
Every HTTP attempt and response chunk still costs budget, including repeats
and refusals.
Cache hits make no source read and erase no original charge.
Session access and Signed fallback share the command owner.

The owner serializes checks and finalization.
Close clears proof and fences publication; CLI closes owners in `finally`.
Ignored aborts prevent any physical cancellation or global drain claim.

Replay fixtures use scripted judgments with as-recorded authority, not native
admission. The TEST fixture creates actual Inboxes with signed native adds.
It keeps three standalone default CLI replays.
Default `verify --all` must report every tracked scope without raised limits
or a boundary outcome.
Scripted clocks, custody, setup reads and bounded callback scheduling qualify
workerd evidence. They prove no physical celld load.

## Evidence

This table retains 30 closed formal captures, prior control H and four operator
records.
Control H denotes source 80749894, not documentation head H57fb.

OLD means sealed root
`/Users/hughpyle/play/artroom-evidence/2026-10-30-room-proof-reuse`.
Old formal label L binds OLD/L/command.json and its original argv.
REPAIR means the repaired evidence root
`/Users/hughpyle/play/artroom-evidence/2026-10-30-room-proof-reuse-repair`.
Original commands retain producer path
`/private/tmp/artroom-room-proof-reuse-repair-evidence-20261030`.
I rows bind REPAIR/L/command.json.
The repair Page row binds REPAIR/operator-inputs/page-build-1/command.json.
The full OLD collection also resides at REPAIR/
`operator-inputs/prior-evidence/original`.
Git H's note and manifest reside beside `original/` as
`parent-note.md` and `parent-manifest.json`.
The original OLD root remains unchanged.

Historical H uses `operator-inputs/historical-control/native-membership-room-1`.
Page generation uses `operator-inputs/page-build-1`.
AST records use
`operator-inputs/support/artroom-proof-reuse-page-ast-20261030-1`.
Its normalized subdirectory holds the normalized receipt.

The first four formal captures use A:
`0c25f48974f3fe6d261c6007c7fec282d0334345`, tree
`3e80d97f8466c651edc3c5a50f4a1d4d849b82a2`.
That accounting change rebased to
`a2d2b9f580d65b437c1990eb93ad64a5de22d874`, tree
`06a3537798d7d800353dde054702ee35ac6c5f5f`.
Receipts retain A. Other source points are:

- B `30d93abda6726efa9934b937450d67c47e325825`, tree
  `371269bdfb9a4d79331b2420574247cd78114ce9`.
- C `ecaf5ba543860b521affc034d2ef9557969b45f0`, tree
  `b731f2fbf08f937f2fbc8663083710839e5b8f97`.
- D `bc19531f9b04e5ebca30224e20e7b0de3590934b`, tree
  `366a6b80211dda327aea30d7f94ca1100b6566b4`.
- E `89112028e33b26f6118b7018f1a35a7e8ffd51ed`, tree
  `87367381f3c9e21bea4cba8ddbdc6f8411e4b1db`.
- F `582d3ec6a2879d2d4dbbe44ff829a6e29fb0a450`, tree
  `e8b2d65f32204893e99ad94a5001f21d764d785c`.
- G `f2fb7384de05bb6712c9a57c2adc218bf9cea56c`, tree
  `e46bcbe49bbb899556d038526f203e44e13290b1`.

Collector SHA-256 is
`aa00314ac292a521909e25123788d48d000eb6f3ff150c8541448dd013e1810b`.
Bounds are 40,000 files, 2 GiB total, 128 MiB of snapshots and 128 MiB per
outer stream. Ordinary commands allow 600 seconds.
Controls and output-repair launches allow 1,200 seconds.
The native room allows 2,100 seconds.
Gates and the unreached-stage follow-up allow 7,200 seconds.

Formal exit pairs give command status then capture status.
Formal elapsed times include post-guards.
CPU means host child CPU, not guest CPU.
Old captures had no timeout or output loss.
Checkpoints stayed clean and unchanged.
Operator rows have one process exit and establish no runtime acceptance.
AST CPU remains unknown.
Stream cells give bytes and SHA-256.
E means zero bytes with SHA-256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
Receipt hashes identify exact receipt bytes.
I's collector SHA-256 is
`5dd6f59ac1478e0bf7ff291531fffb8046d4a784355ac7f37127be49e5b7334d`.
It keeps the stated bounds and command ceilings. Page generation allows 300 seconds.

| Capture and source | Actual command | Outcome and exits | Wall; host CPU | Stdout bytes and SHA-256 | Stderr bytes and SHA-256 | Receipt SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| `dependency-setup-1`; A | `npm ci --ignore-scripts --offline --no-audit --no-fund` | PASS: offline setup, not a test; 0, 0 | 1.136150500; 2.432902 | 29; `4f34ec9721b8b3485e0bd1ecb71e35a4b5b7005e7af86391d83e9bb6fd84d006` | E | `2d67fc96ea24b7b5b18ebb2ef313e4238b792cd0857d85f6cd758ff25bbd8527` |
| `cli-types-accounting-1`; A | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: early accounting compiler only; 0, 0 | 1.784895542; 5.746465 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `f5dec7572c9504e801947bd1f71a47ef24f53974d7e7d1e5f3630deccf238c14` |
| `pool-compatibility-1`; A | `node scripts/cloudflare-pool-compat.mjs` | PASS: pool 0.22.0 preparation, not a test; 0, 0 | 0.109001083; 0.226535 | 366; `5b14d6b520ef1bdbff64a8ffc3b14c39955fc79beae01e63aec681bd7f5afc41` | E | `83be2a90f19998327a79bf016f5f8e5b81e325ec6abc397a1002088ca3a6c774` |
| `cli-accounting-1`; A | `npx --no-install vitest run --project cli --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/cli-accounting-1/report.json packages/cli/test/verification.test.ts` | PASS: 4 accounting tests only; 0, 0 | 1.551407458; 1.738393 | 417; `008d73155d1134aa4ffcc59fb466f591a0fd77876034b61fb98885e064285374` | E | `f27d27e375cc06b3d1b76e2732f6c1d4ac576c11f2a7b81a66bd66157d50c821` |
| Observed prior-head control H; `native-membership-room-1` | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-fixed-slot-index-evidence-20261030/native-membership-room-1/report.json packages/cli/test/fixed-slot-membership.scope.test.ts` | Byte boundary with 120,000 ms override, which did not bind; inner CLI 1, Vitest 0, capture 0; timeout 2100 s | 184.973967708; 197.349515 | 4023855; `d672d754183d7fc2fb333e945f5e8a944d472c3973a3f72a47456967432ad9a1` | E | `3b246c5863fe124a16bfd8a59a88133699f991f14909b1dbb01f9f68e53231f0` |
| `cli-types-integration-1`; B | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: CLI compiler; 0, 0 | 1.369054250; 5.659236 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `b1b2441da51f58dd21f9d1c1943b64a9e6ea1ccc73d99dc73da8ac882fb7fe74` |
| `replay-types-integration-1`; B | `npm run typecheck --workspace @generalbusiness/dap-replay` | FAIL: portable replay compiler cannot resolve structuredClone; 1, 1 | 0.370889208; 0.811013 | 655; `e5f8a946da6d93a87a79bcd61345b03644372ce7676dbb58035951bb5ed506e0` | 477; `931909411609a2c8fd36d62120c61934cd610998d8523a95eccb8ea226570717` | `204fa4afdf6893052707b67f6ad04b83d472678de3801548bc56adbd97de6ba3` |
| `replay-types-integration-2`; C | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: replay compiler; 0, 0 | 1.015659750; 3.273105 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `7b966b29156a3f32d81ef2277f4a3da730b2fd9d0d5c89a42245382c2c571339` |
| `cli-types-integration-2`; C | `npm run typecheck --workspace @generalbusiness/dap-cli` | PASS: CLI compiler; 0, 0 | 1.433504125; 5.782629 | 133; `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` | E | `e48cb54b3dee6a14cbc9953e37b579bc3996f15fed65a54025bde93e9b101959` |
| `owning-integration-1`; C | `npx --no-install vitest run --project cli --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/owning-integration-1/report.json packages/cli/test/verification.test.ts packages/cli/test/verify.test.ts packages/replay/test/room-verification.test.ts packages/replay/test/room-recovery.test.ts` | FAIL: 21 passed, 1 fixture definition refused before settlement case; 1, 1 | 2.524883000; 4.275121 | 1080; `e9a71f0b4f41cf3000418296b40ec53cefb735db48dd0692a7eb79af4ff28bd7` | 806; `e0f88e56418c3d9bc644da4285d5a766beb84050bbd9ad92fd4e00c6d7f29602` | `08a9eeb62bdf03642a7385001d033789f8e681022d56410ff6fb5ff11c4b4c46` |
| `replay-recovery-1`; D | `npx --no-install vitest run --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/replay-recovery-1/report.json packages/replay/test/room-recovery.test.ts` | PASS: all 3 recovery cases; 0, 0 | 1.298887667; 1.904122 | 422; `074aa53446308ede36293cc9519658e5f7c4316ff11b55ea450b5e3e43c4a52a` | E | `bab656613e0176880bbe3135f2f56473092ac1e597a1e8625fd16bc2cd19f796` |
| `replay-types-fixture-1`; D | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: replay compiler after fixture repair; 0, 0 | 0.943800000; 3.204845 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `32e8fa808b17109d30dfaca4c6ab06e3af923123c76cc61500e5b7b04e6f042a` |
| `control-unique-entry-1`; D | `node scripts/control.mjs packages/cli/src/verification.ts 'if (knownHash !== undefined) {' 'if (false && knownHash !== undefined) {' --expect 'discovery and log copies' -- packages/cli test/verification.test.ts` | INCONCLUSIVE: baseline 0 passed, 1 failed; no underlying baseline error retained; 2, 2 | 0.286436625; 0.496520 | E | 186; `4af9fa2255104edac05d6ae8f4c035517565de313cc4e7269553b0d3c0eaedc2` | `1a6612da5cf48b3ce4c7fb5c5fe8d61152f31e4bf902e3c4069a0e46d60b5d2a` |
| `control-unique-entry-2`; D | `node scripts/control.mjs packages/cli/src/verification.ts 'if (knownHash !== undefined) {' 'if (false && knownHash !== undefined) {' --expect 'discovery and log copies' -- . --project cli packages/cli/test/verification.test.ts` | DISTINGUISHES: baseline 4 passed; mutant 2 passed, 2 failed; helper qualifies 1 named ordinary assertion; restored; 0, 0 | 2.471295833; 3.302233 | E | 4061; `ad47b46741a954940e353950d9e603935fc3aa75500165bf1cec473a6ed09a7b` | `f3d950e447372c46fd2b0fafe52b25eb6cb64a59e625c51acf63cd1653e88da5` |
| `control-cached-head-1`; D | `node scripts/control.mjs packages/replay/src/verify.ts 'if (root.expected && run.sealed[root.expected.seq]?.hash !== root.expected.hash)' 'if (false && root.expected && run.sealed[root.expected.seq]?.hash !== root.expected.hash)' --expect 'cached requested prefix' -- . --project replay packages/replay/test/room-verification.test.ts -t 'cached requested prefix'` | DISTINGUISHES: baseline 1 passed; mutant 1 ordinary AssertionError, 9 skipped; restored; 0, 0 | 2.320538000; 3.212170 | E | 2951; `d0b45708b89e7f526276229ab50aa64095e2d5f160e046370a473d68d0bf3068` | `cf61d8b05a1ce2c03d13973ff0038f7bc74370d6f7d9bca61687bddbbd66d5dc` |
| `native-room-default-1`; D | `npx --no-install vitest run --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/native-room-default-1/report.json packages/cli/test/fixed-slot-membership.scope.test.ts` | PASS: 1 real room case; default all 2006 scopes consistent; 0, 0 | 140.151371542; 151.006290 | 5432381; `02d53152dfb5e224f31c8a37075983038ce406a11dc272c2625a58af7a57fae6` | E | `a3aa4c6ec1ab83377f672a2983eed5b2166c3dbdd108bc73ffeddf15a4b169d1` |
| `gate-1`; D | `npm run gate` | FAIL: kernel passed; Node 78 passed, 2 failed; Counting, plain and native unreached; 1, 1 | 78.810069375; 141.975584 | 8628; `1b03b58c645cb602545f99cf9b41fe42fb7ba81684fccec3ec77c5652cd6bdaf` | E | `313d8acf863cb34d067fcaab7eb7cb94e74f610ba8675a6b125b366451e76bda` |
| `security-entry-points-repair-1`; E | `node --test scripts/security-entry-points.test.mjs` | PASS: all 10 Node inventory cases after metadata repair; 0, 0 | 2.434078709; 3.139698 | 1300; `6c064b5e0c92f252ddfb995f5b1857efbdddc60ac4fc787890e48ddaa62aab1b` | E | `7d7e9490d77cae4ed3b9d20a786e08e2e360b5fd6f6b22afe3926cdba39a3a92` |
| `unreached-stages-1`; E | `node /private/tmp/artroom-room-proof-reuse-unreached-20261030.mjs --evidence /private/tmp/artroom-room-proof-reuse-evidence-20261030/unreached-stages-1/test-evidence` | FAIL: Counting 56 passed; plain 3129 passed, 1 failed, 1 skipped; native unreached; 1, 1 | 72.666276792; 253.299750 | 491368; `b00e1c2cc1a9d557c3c3c5d4939891412d324e80e4b881888445978646b4f875` | 1201; `7663d850260c3193dd7ad8db97b219a0d836f006a033a3bc83b7d5285e5d6ef8` | `b56cdce742f3f727132c64719b86b538000849c3eb9a5358674f5749854586be` |
| `page-assets-repair-1`; F | `npx --no-install vitest run --project page --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/page-assets-repair-1/report.json apps/room/page/test/assets.test.ts` | PASS: 1 generated Page asset case; 0, 0 | 1.061379416; 1.622861 | 412; `37af6266bb6ea506263740db8f01cd53b025e289e5760fc1d85d36a1deb0975f` | E | `8e5aeb6d144781e2e68b5b077f4be53eb5a84873dbbeaaca77461b6bc24e30ff` |
| `gate-2`; F | `npm run gate` | FAIL: kernel, Node 80, Counting 56 and plain 3130 passed, 1 plain skipped; native 841 passed, 5 failed, 2 skipped; 1, 1 | 1270.095820333; 2675.502764 | 7602; `982ab92465303245e02ed853d733b26482249f0c199246a69c2a42d51dbbc3b7` | E | `af2f68c9f5cf66f83bb0b37dbb65bede6a2b42e584de3d5dbb84715d822b642b` |
| `lanes-types-output-1`; G | `npm run typecheck --workspace @generalbusiness/dap-lanes` | PASS: lanes compiler; 0, 0 | 1.318997458; 5.477198 | 135; `b91d29384f35cb1d0b20da37e74ed8bda5d069d9bbf6ede67718ff209e87c945` | E | `60feae2552e0eaaf8755524008d5e9506992278ec7b2623ecb1f2790730a62f8` |
| `scripts-types-output-1`; G | `npx --no-install tsc -p scripts/tsconfig.json` | PASS: scripts compiler; 0, 0 | 0.593907375; 1.785700 | E | E | `c3a87ed3342df46f20868182e5dc10b55d44c1f76bf1e1477dc9bd5ce7db3dd6` |
| `room-output-repair-1`; G | `npx --no-install vitest run --project lanes --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/room-output-repair-1/report.json apps/room/lanes/test/rehearsal-stops.test.ts apps/room/lanes/test/demo.scope.test.ts apps/room/lanes/test/issues.scope.test.ts` | SETUP FAIL: localhost listen EPERM before tests; underlying stderr retained; 1, 1 | 1.413216833; 2.011100 | 90; `213fda08c0b790a42922bca1644523942f10c8a22f8d1a17eed4cce0e2c8be31` | 593; `6440e32fcb6670b0f517bed7f799561659e9e9fcb736b839b288e47123a3269a` | `d1c7b4565c6522c7752cd794ecf4d8fdccc48cdeff712cc845e0266f28d40b9f` |
| `room-output-repair-2`; G | `npx --no-install vitest run --project lanes --project scope --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-evidence-20261030/room-output-repair-2/report.json apps/room/lanes/test/rehearsal-stops.test.ts apps/room/lanes/test/demo.scope.test.ts apps/room/lanes/test/issues.scope.test.ts` | PASS: 9 cases, 1 skipped, 3 files at unchanged G; 0, 0 | 27.601504833; 35.473587 | 69465; `ef6f3049977ca8466aac3fa6e7054ee6be5dce8af770dbc660f0a3e4b54e3252` | E | `9f89d47a317b6fd7835661f1a4df61132dc89075b18e246baacca58ab4504a3b` |
| `gate-3`; G | `npm run gate` | PASS: kernel, Node 80, Counting 56, plain 3131 passed with 1 skipped, native 846 passed with 2 skipped; 0, 0 | 1016.673974584; 2154.928362 | 6219; `0d59a59c75b1676c2bc1a3fcf942f6199a9cce69db3e39423fdf35570d6b8e67` | E | `3ffe4fa9e3c4fb66d9f9ea540bdfa3cbc1c7902bdd7554cbd0cc9b9edddf783d` |
| `page-build-1`; OPERATOR, E source generation | `npm run build --workspace @generalbusiness/dap-page` | OPERATOR: generated asset; exit 0; no formal capture exit | 0.325675083; 0.200452 | 212; `216bbd36e9c6308f647551161897e544d41528552e5102961b229a71d9a3a230` | E | `af15776b969ac6bcb3fdb75d8c05ec45c89ac0c14759c73cecdce1f4bb231843` |
| `page-ast-1`; OPERATOR, before/after asset inputs | `node /private/tmp/artroom-proof-reuse-page-ast-20261030-1/analyze.mjs` | OPERATOR: syntax readback only; exit 0; no formal capture exit | 0.484762915992178; unknown | 1921; `b1f4c86549a3f39032558d7bc088f20279c69b5de70a33203922a7772b962e6e` | E | `4ed85173409f9db912bbf8bbdff03417b2d697407ea18dca155794d390be6485` |
| `page-ast-normalized-1`; OPERATOR, before/after asset inputs | `node /private/tmp/artroom-proof-reuse-page-ast-20261030-1/analyze-v2.mjs` | OPERATOR: syntax readback only; exit 0; no formal capture exit | 0.5005387919954956; unknown | 1845; `613d200bb5fea526c3a26136fd2fc92d257064b8e59c24f9b89212a11e96420d` | E | `807e6f702ec89e70fe2c5d5fc3a7c189c692ffe9c068208e6225c2ad540765e4` |
| `repair-replay-types-1`; I | `npm run typecheck --workspace @generalbusiness/dap-replay` | PASS: replay compiler; 0, 0 | 0.963040375; 3.272341 | 135; `bfa936e6ac3350bc231de0d8a02765e43afc255bf7b9ea23aa4213cb09752357` | E | `1647c2b8c4b245f13cdcf93d9d95cfcf246a63c6fb94a780e94f73959cbee8f7` |
| `repair-replay-owning-1`; I | `npx --no-install vitest run --project replay --reporter=default --reporter=json --outputFile=/private/tmp/artroom-room-proof-reuse-repair-evidence-20261030/repair-replay-owning-1/report.json packages/replay/test/room-recovery.test.ts packages/replay/test/room-verification.test.ts` | PASS: 15 cases, 5 recovery and 10 verification; 0, 0 | 1.376109834; 2.315834 | 499; `4aea15604d72c13899abbff0b6b1a391e30f28eeddbda79e5fec1f8f26a7764c` | E | `f17ee1c5d07f1ce0da0c48202e923998a918c0e3d439305359d3e501d5cc0e7d` |
| `control-earliest-problem-1`; I | `node scripts/control.mjs packages/replay/src/verify.ts 'if (current && problem.from >= current.from) return false;' 'if (current) return false;' --expect 'an earlier missing text remains a problem below a later blocked entry' -- . --project replay packages/replay/test/room-recovery.test.ts -t 'an earlier missing text remains a problem below a later blocked entry'` | DISTINGUISHES: baseline 1 passed; mutant 1 ordinary AssertionError, 4 skipped; restored; 0, 0 | 2.380608875; 3.295264 | E | 2593; `83e5728a22394b8267aef245c7a9f0049b1301eb490aa12bc68c3bcccfb21db3` | `bcc56219741c893dbdc8a2d9fc6cec97419f025cb224874d3aebb31783a54f71` |
| `control-capacity-recovery-1`; I | `node scripts/control.mjs packages/replay/src/verify.ts '!!run.definition?.declared.capacity &&' '' --expect 'a source without capacity still owes its missing text when another root holds the body' -- . --project replay packages/replay/test/room-recovery.test.ts -t 'a source without capacity still owes its missing text when another root holds the body'` | DISTINGUISHES: baseline 1 passed; mutant 1 ordinary AssertionError, 4 skipped; restored; 0, 0 | 2.387116042; 3.308623 | E | 2586; `b47f983f0af4d3e1280e92c1813ec2f471e3a3a4e685947518a39bfe2e167f90` | `86508bb3861f41b58688c064225c7655c84cfdfee5fad8eec721db64193b0262` |
| Repair `page-build-1`; OPERATOR, I source generation | `npm run build --workspace @generalbusiness/dap-page` | OPERATOR: byte-identical asset; exit 0; no formal capture exit | 0.294253500; 0.222346 | 212; `216bbd36e9c6308f647551161897e544d41528552e5102961b229a71d9a3a230` | E | `80a44564f31d393a85fe4bc801231facf5e4bfb699e17b60fe0c271bcbca3229` |
| `gate-4`; I | `npm run gate` | PASS: kernel, Node 80, Counting 56, plain 3133 passed with 1 skipped, native 846 passed with 2 skipped; 0, 0 | 1028.178343334; 2176.538951 | 6219; `b83f98707db30244d9e58cc8c242b4e4753e64d4d70a0d4b5d95cc08eee79877` | E | `fc1141fd92e3a68a6c2bf64fafc69c2d29432bf640407c47c94fc7877a0307d1` |

The old 25 formal captures total 2,631.437000291 seconds elapsed and
5,468.288183 seconds host child CPU.
Their UTC window spans 03:21:10.726878 to 05:15:27.760093.
Sums include failures and INCONCLUSIVE.
They exclude H, operators, source work, inspection and drafting.
Parallel elapsed sums are not pipeline wall time.

The five I captures add 1,035.285218460 seconds elapsed and 2,188.731013 seconds
host child CPU. Their UTC window is 05:42:54.619474 to 06:02:21.868296.
The combined 30 formal captures total 3,666.722218751 seconds elapsed
and 7,657.019196 seconds host child CPU.
Their UTC window starts at 03:21:10.726878.
These sums exclude historical H and all operators.

The earliest-problem mutant returns consistent instead of mismatch at line 186.
The capacity mutant returns consistent instead of incomplete at line 213.
Both ordinary assertions distinguish their named invariants.
Both controls retain full mutant output and baseline counts.
They restore exact source and clean checkpoints.

Repair Page generation changes no tracked file.
It reproduces the 1,187,777-byte asset with unchanged 553d0303 SHA-256 below.
No extra asset commit follows.

Gate 4 passes all five stages at I after the settlement repairs.
It retains complete output without timeout or dropped bytes.
Its source remains clean and unchanged.
Installation skips against the verified package-lock dependency view.
The scope observer reports 241 modules with a partial label.
It records 72 unknown or suite observations and no contradictions.
All terminal records are complete.
Partial module observation does not imply complete callback coverage.
REPAIR's `gate-4/stdout.log` binds temp
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.wX7mb3wACP`.
The original whole gate output is retained under REPAIR/
`operator-inputs/gate-detail-gate-4`.
Its six Counting build outputs and mapping provenance remain unchanged under
`operator-inputs/counting-generated-gate-4`.

### Failures and follow-ups

C fixes B's portable `structuredClone` failure.
C's owning run rejects illegal fixture field `acts.retain.fields.proof.value`.
D adopts a platform fixture with provenance checks.
It preserves every case and assertion.

The hybrid helper selects Node for a Vitest file in the inconclusive control.
It retains no underlying baseline error or exception type.
Ruling `ad166a42b89cc8fd6ef5ad10a98c02cfeaed2bbb` records RunnerMisSelect.
It accepts the corrected explicit Vitest control.
The cached-head mutant wrongly accepts a mismatch at line 44.
Controls restore source and clean checkpoints.
The helper retains baseline counts, not internal JSON.

Gate 1 fails the inventory in `scripts/security-entry-points.test.mjs`.
It lacks selections for `replaySource` and `sharedProofLines`.
`operator-inputs/cli-seals-readback.json` has 79 records:
two new, five changed and 72 unchanged.
The whole verification-owner seal is
`3fb0f354c0d00dd1d21cf293e11dfc81738b9de4e8f5eb43ac9fd918dc9db557`.
E changes only test metadata, with eight additions and six removals.
Case code, assertions, controls and validator tail remain byte identical.
E's follow-up finds a Page module stale by eight bytes.

The Page build changes only tracked `apps/room/page/assets.ts`.
`operator-inputs/page-build-1/receipt.json` binds both versions.
The old module has 1,187,769 bytes and SHA-256
`ecc1fbe483283d0a1485d7fb28ba38ffea727d1e58ae123f6e77e9bd10b06d3b`.
The new module has 1,187,777 bytes and SHA-256
`553d0303a89d30dc57b526691075bdff9dde7c89c8d6414e15b6f988e8a636ad`.
It matches the failed case's expected bytes.
Decoded HTML keeps SHA-256
`f8bb00e0998e3d12b66f5c7334a7450566e1258bed6e37a53acf213a4299d23d`.
The source path runs from CLI browser code through command-support and
SourceError to replay.
D to F changes no other production runtime source.
Generated production source requires a full gate.
The single-file exception cannot cover F.

AST readback: `operator-inputs/support/artroom-proof-reuse-page-ast-20261030-1/READBACK.md`.
An extra declaration group shifts the first comparison's paths.
Its 1,736 raw non-Identifier differences are not semantic-edit counts.
The second comparison splits only top-level declaration groups in order.
It finds 11,412 Identifier.name differences and two Property.shorthand changes.
It finds no other compared AST changes.
It excludes positions, comments, binding resolution and alpha-equivalence.
Both payloads keep two Symbol calls and omit the new room root-token call.
No payload executes. Syntax comparison proves no runtime or browser equivalence.

Gate 2 exposes four old demo output expectations and an issues parser
that treats Shared lines as scope kinds. G repairs three paths.
Issues checks the actual 12-root identities and heads.
It retains order, cleanup, summary and callback assertions.
Rehearsal's `judgedRoomProof` checks prefix and suffix before committing values.
The transcript declares the prefix rule with unchanged suffix templates.
Stops adds one positive and fourteen malformed or suffix probes.
Failures publish no values. Old cases and replay files remain byte identical.

G's first owning launch fails before tests on localhost listen EPERM.
The capture retains its underlying stderr.
Git, host and scheduler stand-ins prove no live provider, browser or deployment.
Gate 2 stays failed.
The unused v2 acceptance adapter never executes.

Gate 3 passes at G. Native ends with zero unhandled errors.
Its observer reports 241 modules and a partial label.
The optional screenshot-recording module is skipped.
The summary has 72 unknown or suite observations and no contradictions.
This proves no callback completeness.
`gate-3/stdout.log` binds temp `tmp.UfU4zMrMiF`.
`operator-inputs/gate-detail-gate-3/test-evidence/stages.json` records stages.
`operator-inputs/gate-detail-gate-3/test-evidence/native.jsonl` records the end.
Installation skips against the verified lock stamp.

### Current native result and historical observations

Gate 4's room case passes at I.
REPAIR's six-file `operator-inputs/native-room-gate4-readback` unit retains its
metadata extraction, not an independent replay or test.
Its `summary.json` reports all 2,006 actual scopes consistent with exact scope-set
equality and all 2,001 Inbox Session histories.
Shipped limits remain unchanged.
Caller time through the bounded request join is 45,877 milliseconds.
The command reports the same elapsed value.
The observer records 12,076 attempts and responses and forwards 79,088,240
response-body bytes. Forwarding may include prefetch.
It reports no unresolved HTTP refusal.
One shared-proof header precedes 4,011 coverage records.
These are reported metadata, not an independent census or successful-entry
budget counter. They prove no physical drain or guest CPU.
The unit's `readback-receipt.json` binds argv, inputs and output hashes.
Its SHA-256 is
`3c9c17fdb32d5bae0069945bc21952aa568f166139ba32c578f6168106d3e9a4`.
The external metadata caller is outside this table and its cost sums.
The following D result remains historical.

D's default room witness observes all 2,001 Inbox Session histories.
Caller `performance.now` measures 38.754 seconds through the bounded request join.
The observer records 12,076 attempts and responses and forwards
79,088,240 response-body bytes.
It excludes headers and request bytes.
It records no unresolved HTTP refusal during the command.
The bounded actual response-frontier join passes.
This proves no global body drain.
Gate 3 repeats the room case successfully at G.

`native-room-default-1/report.json` retains the outcome.
Its header precedes 4,011 segments in 2,006 scope, incarnation and kind groups.
They cover 8,019 reported positions contiguously without overlap per group.
This is neither a budget counter nor an independent census.
Phase progress supplies no final counter.

Ruling `2a308f5d82ff7f269264236d27512edfea7d350b` accepts historical control H.
Its source is `80749894575b50e51c7128f3fa54d10c6749a372`, tree
`d351bcf0c35522adcc3a45b139f9dc3f8ad4aa80`.
Its 120,000-millisecond override does not bind.
It stops at the shipped byte boundary.
The replay Membership scope is
`sc_hngd6u6lodg73szmvz3z24jecjomuchh6xdvtulri25ofgcezaca`, cursor `"200"`.
Counters are 83,684 milliseconds, 268,437,957 received bytes,
30,076 HTTP attempts and 58,379 history entries.
Discovery completes all 2,001 Inbox Session histories.
It returns no consistent partial reports and proves no complete room coverage.
The ruling requires no rerun or relabeling.

### Host observations and historical custody

`operator-inputs/machine-native-room-1.json` records Darwin arm64 at
04:01:32.634342 UTC, Node v26.13.0 and npm 11.20.0.
Load rounds to 1.518, 1.625, 1.579; sysctl initially fails.
`operator-inputs/machine-native-room-1-hardware.json` succeeds at 04:01:49.177510.
It records Mac17,7, 18 CPUs and 64 GiB.
Subsequent snapshots retain that hardware and tool context:

- `operator-inputs/machine-gate-1.json`: 04:05:53.486399 UTC;
  load 1.459, 1.755, 1.661.
- `operator-inputs/machine-unreached-stages-1.json`: 04:17:45.101776 UTC;
  load 2.217, 1.932, 1.792.
- `operator-inputs/machine-gate-2.json`: 04:29:23.437567 UTC;
  load 1.614, 1.875, 1.913.
- `operator-inputs/machine-gate-3.json`: 04:58:24.258077 UTC;
  load 1.608, 1.903, 2.367.

Each is one pre-run observation, not continuous or per-stage monitoring.
The repair snapshot `operator-inputs/machine-gate-4.json` observes load
1.482, 1.817, 2.064 at 05:45:09.887997 UTC before gate 4.
It supplies no new hardware measurement or continuous monitoring.
Cache state stays unknown; no controlled reset supports a cold-cache claim.
They attribute no CPU to native callbacks or physical celld.
`operator-inputs/historical-control/parent-machine-room-1.json` describes H,
not child conditions.
At 00:46:53.332894 UTC it records Darwin arm64, Mac17,7, 18 logical CPUs,
64 GiB, Node v26.13.0, npm 11.20.0 and load 1.43, 1.28, 1.30.

Historical manifest: Git H's version of
`notes/implementation/evidence/2026-10-30-room-proof-reuse.manifest.json`,
retained as REPAIR/operator-inputs/prior-evidence/parent-manifest.json.
Its 24,352 committed bytes have SHA-256
`9c5056e4f2c4bad2419f5a89eb4b2670f896a28d90be3fc2740fb3deb784b3e1`.
It binds G, 168 citations, 876 files and 190,614,202 bytes.
OLD's root `SHA256SUMS` covers the other 875 files.
Its SHA-256 is
`d2caa18f62eadb19c5fe52b89e4e409cd43a9c3660aa102e0345e41c79b7358f`.
Indexed `operator-inputs` and `finalization` retain whole gates, original Counting
outputs and mappings, H and source support. Original paths stay unchanged.
`finalization/receipt-audit.json` records 25 complete captures without
integrity or closure issues.
The helper's INCONCLUSIVE tool outcome is a complete capture.
Audit adds no runtime acceptance.
The finalizer writes the index last, removes write bits and checks readback.
Review confirms custody, not sound settlement.
Retention lasts at least 30 days after landing.
Removal needs a planner act naming the manifest.

## Limits and owning requests

Request 7c0 owns the repairs and next exact-head review.
The compiler, 15 owning cases, both controls and full gate 4 pass at I.
The final review remains pending.
This replacement keeps one note and one manifest.
The current manifest binds I, gate 4 and the repaired evidence root.
Its `priorEvidence.manifest` preserves all historical 168 citations unchanged.
The full 876-file old collection is also copied with exact file bytes and modes.
The 882-file prior-evidence unit includes its index and Git H metadata.
REPAIR/finalization/receipt-audit.json verifies all five repaired captures.
It records no incomplete captures, integrity issues, unclosed processes or timeouts.
The root index covers all retained files.
Finalization removes write bits and verifies every hash, mode and member again.
Both roots remain read-only for at least 30 days after repaired landing.
Removal requires a planner act naming the current manifest.
Custody checks add no runtime or review acceptance.
G to H uses the document-only exception in `docs/testing.md`.
Production repair cannot inherit it or advance approval.
The review also identifies missing origin rows for some shared texts and repeated
prefix rebuilding under the time limit. These nonblocking limits remain.

Ruling ad166a42 assigns helper repair outside 7c0 to the next relevant head
or a separate head after J4. RunnerMisSelect names no baseline exception.

Load findings request `a6847815c845145adddca1476342e52b6a8baf82` owns deployed CPU
and production-load questions.
TEST timing proves no controlled speedup, worst-case bound or deployed CPU cause.
The parent owns index results. H supplies only the accepted boundary control.
