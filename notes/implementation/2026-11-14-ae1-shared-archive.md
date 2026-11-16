# Share room archive policy and wiring

Current code is `35de4110c8a694bf18f6327c70e17497a42bee05`, tree
`d1fc38df0bc26402b054b48247e0a0d86693cc13`; new validation is UNRUN.
Development at `da8a7337ac1e87a6d5432b6e73809df899da86d3`, tree
`28c60e7095fe3715e6f45909891a80bd6cfa69f6`, passes both test compilers,
1,541 corpus cases and 212 Native tests in 39 files. Two uncaught cross-DO log
errors remain undiagnosed. Gate1 and Gate2 stay failed. Whole Node again fails
205 pass/1 fail at da8a7337; preflight3/gate3 are UNRUN. Earlier passes retain their own bindings.
Fixture repair: `d38275d047fdd8c44e5da5046ac301542ae2cc31`, tree
`5b42dab41b6bdc213a6f0e6c45da09e974e491da`. Whole Node 206/206 and preflight2
passed at `1c01a94f0b80d87c4d45f1db4cc8322f2f4536f8`, tree
`bfeb3ee0544507be4491d3a660303b936dd74390`.

Request 0c265d01/ruling 59767cd8/promise 43fa0d74 require shared installed policy:
Scope driver, room/archive Artifacts adapter and Grow re-export. Repository/
Directory/Destination bindings and Native private-root exclusions remain exact.
Export requires immutable birth/install chains, real Rules install, signed
release, current trust and supported runtime policy. Signature identifies the
publisher, not permission; digest/alias/declaration alone grants none.

The namespace proof uses bounded signed text/reason-only refusal, exact pin/
codec and sizes/validation before parse. A paid bounded snapshot reuses exact
full references within the pass only. Receiver prepays work and owns RPC through
settlement past caller deadline. Trust removal stops provider work/wake while
preserving row/receipt; restoration clears no terminal. Unsupported stops;
pending install/unreadable replies retry without payload selection. There is
no fixture selector, payload/credential diagnostic, ingress/cold repair, mint or
retarget. Artifacts keeps exact credentials/read-back. The complete field/check
correspondence remains in da8a7337's opening and Policy costs sections.

Real Base/Grow authority differs from TEST-policy driver/row refusal/terminal
witnesses. TEST peer/clock/scheduler, source review and seals prove neither
signed authority nor complete fit. Earlier failures and Security remain dated.

## Policy costs and proof limits

`apps/room/archive-setup-cost.ts` supplies shared prices for the new policy
setup. These functions describe work that the actual operations still pay.
They grant no proof, trust, source or export permission. In this table,
`M` means metadata, `W` means input work, and omitted coordinates are zero.

| Operation | Shared price |
|---|---|
| Proof sender metadata and identity/pin work | `forecastArchivePackageProofFixed`: W 5,570,560, independent of reply length |
| Signed proof RPC and both validations | `forecastArchivePackageProofReply`: 1 call, M 270,336, W 25,952,256; settle M and proportional W at actual reply bytes |
| Current trust JSON parse | `forecastArchiveTrustParse(u)`: M `3u`, W `192u + 4096`, where `u` is UTF-16 units |
| Trust setting and publisher comparisons | `forecastArchiveTrustCheck(u,r,t)`: W `3u + 512rt + 128`, for `r` releases and `t` rows |
| Clear and populate policy tables | `forecastArchivePolicyTables(d,s)`: M `512s`, W `1024(d+s)` |
| Fresh declaration validation | Existing `forecastArchiveDeclarationValidation(u)`: W `48u` for each immutable declaration |
| Terminal overlay read | `forecastArchiveTerminalRead`: 1 call, M 512, W 4608 |
| Terminal overlay and wake write | `forecastArchiveTerminalWrite(512)`: 2 calls, M 576, W 8192, prepaid once before policy work |

Fixed sender work survives short replies. Birth prepays node/call plus M E/
W8E, settles bytes n and pays W32n before parse; entry bounds grant no top-up.
These prices omit ancestor/local ProofBytes walks, scalar/birth queries,
reference/flight/capability work. Both adapter/target pay birth; SQL metadata
and repeated trust remain charged. Cold CPU/catalog startup and peer SQL stay
outside caller/RPC counts; the table proves no ARC-1 cohort/pass multiplicity.
25222294 bounds each sender separately; receiver pays reply/decode/hops, not
sender ceiling. Each pass repeats 18-hop/37-body/16MiB/36RPC act walks, excluding
package proof; reuse gives no cross-pass trust. Birth:10 s/16 calls/candidates/
64KiB metadata/256KiB declaration/1MiB genesis. Archive body:256KiB; sender:
5 SQL/4096-byte row/requested body bound. SB-1/
836283176f960b8c886eeab41ee36ca4b83316e3 owns pre-budget alarm full-metadata
recovery; audit853f63cf leaves it unproved/unrepaired.
50ce6650 makes immutable candidate seq/hash count refusal permanent
(application-policy-unavailable/admission-limit); shortage always retries
limit/deferral at every position. Terminal/lookahead share prepaid ledger,
deadline/charges, no second allowance/debit/marker/walk/reorder. Retry promises
no eventual success. ARC-1 owns paid discovery/save/mutable replies, warm-table
reset, trust/rechecks and retained row/manifest/frontier/parent/selection/context.

Ruling `12115613` answers `59c2e3cb` with these closed reason-only refusals.
They retain the original full reservation. Unreadable replies retain transient
behavior; terminal/activation diagnostics add proofReason with
`application-policy-unavailable`, not a page, command or ARC-1 proof seam.

| Proof refusal | Later event and classification |
|---|---|
| `installation-not-active` | Retry. Creator confirmation can activate a provisional Rules scope; the native job open entry can make a future job available; `application-install-result` can activate its pending installation. |
| `retained-proof-missing` | Stop. An active installation already committed its signed inputs in the native act transaction. No pending archive repair replenishes them. |
| `metadata-limit` | Stop. AE-1 provides no transition that trims or resets these existing Rules/job records under the unchanged 64 KiB bound. |
| `malformed-or-unsupported` | Stop. A fixed native pin, installation identity or signed digest cannot change through a pending installation event. |

valuesOf retention accompanies draft; creation result precedes activation.
Conflict-do-nothing never replaces malformed data. Another install may fill an
absent immutable key, but AE1 repairs no old terminal. ff83b78d keeps native
pin/format/parent-before-proof order, without refused payload/label/policy.
Refusal preserves prefix, leaving later entries unarchived; ARC-1 owns the
extra pre-provider predicate, no AE1 prefix scan. Joined-shell uses real Main,
scripted Room/DOM and both notices/disclosures, no-key/no-settings writes;
its ca1 pass grants no layout or Native authority.

## Validation scope

The evidence table keeps dated pending checks/failures. Dispatch and
SqliteStore.markSent stay unchanged: Effects covers them, not this lifecycle.
Seals grant no model/Security result. Initial AE1 changed no cap/format/staging/
restore/deploy; the resumed ruling changes two caps. ARC-1/b188f9e7 owns paid
one-pass cohort/permanent stops; planner owns deployment/cutover. Security is owed.

## Historical composition, attestations and failed acceptance

The CB1 composition starts at 8b1a3734 over 0eb5a1aa without claiming landing.
Five own replays preserve joint-chain trust and prepaid-write fixes:

| Original commit | Composed commit |
|---|---|
| `f2d518e5bb2168ac683b05c65983388d4ac80610` | `89104bced5e11220c434cb5222d6821e46ee3f7f` |
| `9e869be5ba8839660d733b49a47210608502e8e1` | `ba07598129cda05f4b77a6a5a497022461192e1a` |
| `9927d5a9de6ff4d9eea21925c5aeeaf5e1b69a09` | `0390df0a0202da270f11a9c1b4d0542af503b52b` |
| `8353c4d7aaeb66e385f1a1afd37c2ea9f4461ea1` | `672a6b5ae8f426d95e76d17e5076f0a7e1c08aa6` |
| `abf2f22330a1208a071a2db48483fa456704c794` | `04d62c3d57ceedf875dfe6471ccce592a92e9aec` |

Dependency merge20185343 stays excluded; original abf2f223 refs survive.
Worker/Grow/installed conflicts follow d257a67f/43fa0d74 shared wiring, without
Directory fallback. At that dated step, dependencies/checks were UNRUN; no
publication/provider/deploy ran. Earlier source decisions remain in this note
at `da8a7337` under Historical composition; the commit map above is unchanged.

9011b593/tree cfc137dc retains 30 AE1 blobs; CB1 adds Python fixture/two notes.
ad4c61e3 removes Node's R2Bucket dependency through optional trust/portable
parsing. Root 0258f47c/AST 20fd9346/f189 source correspondence, module selectors
and Register 28's NoHost/SmokeOwnedPlan-only change (BindingPolicy 25 unchanged)
remain in the same da8a7337 history section. The exact AST17/Security rows below
retain18 values/17 files, inherited expected 069eaf4c/actual e13a31cf failure and
5e8d's12/12. Seals grant no proof all 17 selectors ran or authority/Effects/
SB1/ARC1 expansion; 4d03ff1d authorizes only that inherited seal/note repair.

Actual-main 336dd74e keeps refs. GS1 wraps the same installed callbacks,
assertions/budgets/deadlines: eight old scenarios plus Base/Grow, with a separate
coupled Scale producer/follower. The same da8a7337 source history records the
unchanged production/seals/configs/MCP view. Seventeen metadata/lock inputs match
f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54 before one owned
APFS copy; authentic stamp/15 relative links stay. No install/download/restamp/
global mutation; Page was then UNRUN. Fixtures remain non-entries.

| Root configuration and project | Exact owning files |
|---|---|
| `vitest.native.config.ts`, `scope` | Seven whole files in `packages/scope/test/`: `archive-application-proof.test.ts`, `archive-driver.test.ts`, `archive-row.test.ts`, `archive-installed.test.ts`, `archive-budget.test.ts`, `archive-operator.test.ts`, `archive-build.test.ts` |
| `vitest.scale.config.ts`, `scope-scale` | `packages/scope/test/archive-installed-scale.test.ts` only; retain both coupled cases |
| `vitest.plain.config.ts`, `lanes` | `apps/room/lanes/test/grow-archive.test.ts` |
| `vitest.plain.config.ts`, `page` | `apps/room/page/test/joined-shell.test.ts`, `apps/room/page/test/publication.test.ts` |

Fixture paths select no owner; monolithic/three-project commands omit Scale.
Budget/operator/build enter through changed planning imports.

| Compiler area | Committed configurations, in execution order |
|---|---|
| Platform | `packages/platform/tsconfig.json`, `packages/platform/tsconfig.test.json` |
| Scope | `packages/scope/tsconfig.json`, `packages/scope/tsconfig.test.json` |
| Lanes | `apps/room/lanes/tsconfig.test.json`, `apps/room/lanes/tsconfig.scope.json` |
| Page | `apps/room/page/tsconfig.json`, `apps/room/page/tsconfig.test.json`, `apps/room/page/tsconfig.scope.json` |

Scope owns the split; lanes portable/Scope includes and Node local-clone stay
distinct. Nine ca1 passes/two 2740 repeats bind only their exact inputs; later
rows close the then-UNRUN Page/Scale/gate obligations, not Security review.

At ca1/tree dbbff0e2, the Native7 row retains three primary/two dependent
failures. attribution.complete loses one of64 sites after fixed-next, despite
reconciled ledger; terminal/prepaid-write add two sites. At 2740/tree1193,
recorder 66/overflow 67 keeps incomplete/settlement checks and reaches remaining
privacy/margin/cap/head/foreign assertions. The exact33-pass diagnostic row
retains that outcome; budgets/prices/deadlines/assertions stay, Native 74 fails.

Original caps 4096 entries/512 attempts/64 nodes/16384 calls/4194304 metadata/
67108864 work/30s yield finish shortages: Base root 1 after 0 uses 35 nodes,
29 left versus 30 (one short); Grow root 0 uses 45969870 work,21138994 left versus
29732767 (8593773 short). Other axes fit; no unsettled metadata, timeout,
settlement or policy refusal. Fresh per-cutoff budgets/native-only policy cover
[rootScope,childScope,D,A,G], excluding private R/M. Policy precedes row load;
finish shares the ledger, prepays wake and retries limit before provider send.
Base receipt survives; aggregates identify no removable charge. Followers fail at 1904
without retained sessions. d610 keeps installed/trust-removal/clone acceptance
failed/unreached then; later cap authority proves no one-pass/eventual fit.
Directory control uses another genesis's genuine proof. Metadata fault hits
full-record trap, returns malformed-or-unsupported and fails metadata-limit
assertion BEFORE zero-read assertion. These prove binding/pre-read admission,
not completed export/trust removal.

## Evidence checkpoints

These development checks/controls are not a gate result. The table preserves
source checkpoints and verdicts; its old UNRUN row is dated history, not the
current status of later completed work. `N` = `/opt/homebrew/bin/node`;
`V` = `N node_modules/vitest/vitest.mjs run`. Exact path aliases:

`E` = `/Users/hughpyle/play/artroom-evidence`; E/ below names that exact root.

- `O`: `E/2026-11-14-ae1-development-attempt2/legacy-compiler-failures`.
- `A`: `E/2026-11-14-ae1-development-attempt2`.
- `I`: `E/2026-11-14-ae1-integrated-development-attempt1`.
- `D`: `E/2026-11-14-ae1-diagnostic-development-attempt1`.
- `G`: `E/2026-11-16-ae1-cs1-development-attempt1`.
- `H`: `E/2026-11-16-ae1-cs1-development-attempt2`; actual safe exports, with private raw retained separately.
- `G1`: `E/2026-11-16-ae1-cs1-gate-attempt1`.
- `S`: `E/2026-11-16-ae1-scanner-repair-development-attempt1`.
- `G2`: `E/2026-11-16-ae1-cs1-gate-attempt2`.
- `D3`: `/Users/hughpyle/play/artroom-private-evidence/2026-11-16-ae1-attempt3-development-attempt1`; private result/raw, no public export.
- `N3`: `/Users/hughpyle/play/artroom-private-evidence/2026-11-16-ae1-node-stage-attempt2`; private result/streams.

Four legacy logs are exact copies from `/private/tmp/artroom-ae1-dev-20261114`
to O. Original argv/exit/wall are unknown; later argv/result files retain them.
A uses `/usr/bin/time -p`, I/D monotonic seconds. EMPTY is SHA-256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

| Checkpoint | Actual command | Result and wall | Retained output and SHA-256 |
|---|---|---|---|
| Initial compiler failures | Original argv unavailable; logs identify Platform, Scope/Page and Node-only lanes diagnostics | TS7053; union/optional-host narrowing; TS4111 during repair; TS2304 `R2Bucket`; exit/wall unavailable | `O/01-compiler.log` `8d7c4cfd96901bc295a150dc4d571e50d010d9ed3f6b8e37fcd1669bfc7f7476`; `04-compiler.log` `3790273e403e83200ca85ddd1fc45d429499be6c702658323a18a62722806beb`; `04-compiler-repair.log` `1405bf8ceb219b16c1e626d06f388501140d747c9de4922510c20ac8299ee48d`; `07-compiler.log` `8ffae07a8390cb9a76f0030e787526ea8a886899be52640f3e710cdb7729ebfc` |
| `9011b593` four compilers | `N node_modules/typescript/bin/tsc -p` each of `apps/room/lanes/tsconfig.test.json`, `packages/scope/tsconfig.test.json`, `apps/room/lanes/tsconfig.scope.json`, `apps/room/page/tsconfig.scope.json` | All exit 0; 0.51, 0.92, 0.66, 0.57 s | `A/01-compiler` through `04-compiler` argv/result/stdout/stderr; output `EMPTY` |
| Reviewed AST17 before adoption | `N --import tsx A/attestation-computation/compute.mjs`, absolute argv retained | Exit 0; 0.97 s; 18 AST values in 17 files, reviewed before `f189881e` adoption | `A/attestation-computation/parser.stdout.json` `81e1198bd2eebc16a63b29276413354163d6ea05163fe8b2a7b5b025b68b472a`; wrapper and old/new rows retained |
| `f189881e` security owner | `N --test scripts/security-entry-points.test.mjs` | Exit 1; 11 pass / 1 fail of 12; 3.69 s; inherited CB1 seal | `A/security-entry-points.stdout.log` `d4f167e73793c6053324281d0cda925e8247ee6f2dba3a4218978381ebf91c29`; stderr `EMPTY` |
| `5e8d4a63` inherited repair | Same whole security command | Exit 0; 12/12 pass; 3.90 s; zero cancelled/skipped/todo | `A/security-entry-points-attempt2/stdout.log` `652f236777a9c948f247652eae161dc0d03082153a6900a6c132102e284e1b8b`; stderr `EMPTY` |
| `ca1efcea` nine compilers | `N node_modules/typescript/bin/tsc -p` each config in the compiler table above, in listed order | All exit 0; 0.657, 0.377, 0.380, 0.889, 0.440, 0.630, 0.311, 0.426, 0.568 s | `I/01-compiler` through `09-compiler` argv/result/stdout/stderr; output `EMPTY` |
| `ca1efcea` compatibility | `N scripts/cloudflare-pool-compat.mjs` | Exit 0; 0.091 s; copied:false | `I/10-compat.stdout.log` `e6455ec422a4d281a56a4a8b272bc95acdd9aa50a553127506a5e87c855e6c43`; before/after bundle `cd50d18adce92adb54a3f00410d646b2fe09b3f12c5b833c492bcf5857621b39`; stderr `EMPTY` |
| `ca1efcea` Plain3 | `V --config vitest.plain.config.ts --project lanes --project page apps/room/lanes/test/grow-archive.test.ts apps/room/page/test/joined-shell.test.ts apps/room/page/test/publication.test.ts --reporter=default --reporter=json --outputFile.json=I/11-plain.report.json` | Exit 0; three files / four cases pass; 2.071 s | `I/11-plain.report.json` `f8ba4660015f77daf114530c22d7feff4b7e3c38ec7e09b44a5aeb0c942553be`; stdout `39de4de6dc62813961c9a37ecc17e2c92992ca79cf4fc97ff2ad6e632b95c719`; stderr `EMPTY` |
| `ca1efcea` Native7 | `V --config vitest.native.config.ts --project scope packages/scope/test/archive-application-proof.test.ts packages/scope/test/archive-driver.test.ts packages/scope/test/archive-row.test.ts packages/scope/test/archive-installed.test.ts packages/scope/test/archive-budget.test.ts packages/scope/test/archive-operator.test.ts packages/scope/test/archive-build.test.ts --reporter=default --reporter=json --outputFile.json=I/12-native.report.json` | **Exit 1; 69 pass / 5 fail of 74; 52.714 s**; driver and installed owners fail | `I/12-native.report.json` `ddc9604558288aa8fe1697182e9097fa2fd77615268548c614d550999de8fd82`; stdout `058468eec5339bb0f99c9f14bcb4103ba1cce1e5ac72a1b39c25bbf250ca5270`; stderr `3994b66bb4e8e49026271bba5ac7e2d846d04f1cdf1a3c2007c1d79a6b3cd02f` |
| `ca1efcea` control compatibility | `N scripts/cloudflare-pool-compat.mjs` | Exit 0; 0.075 s | `I/controls/compat.stdout.log` `e6455ec422a4d281a56a4a8b272bc95acdd9aa50a553127506a5e87c855e6c43`; argv/stderr/result beside it |
| `ca1efcea` Directory control | `N I/controls/directory-binding/control-retained.mjs packages/scope/src/applications/archive-proof.ts 'same(proof.installation.directory, expected.directory)' true --expect TITLE -- packages/scope --config vitest.worker.config.ts test/archive-application-proof.test.ts` | Helper 0 **DISTINGUISHES**; child exits 0/1; baseline 2 pass; mutant 1 pass / 1 fail; 13.010 s; intended line 83 `toBeNull` | `I/controls/directory-binding/tmp/artroom-control-uoPotK/before.json` `664d9bdece13715a5b39a4d051b06eda88e084fb8cbd3d93202cd43c4163caea`; `after.json` `507780aaa2d9ddb0ddd6417d76574d01ed705345bb7f822f4eef2a207c15e1aa`; `I/controls/directory-binding/stderr.log` `ad70f2b1a431ef2d4cb64309cecadbfc9b69b33b3e9d29439c959df0587f3378` |
| `ca1efcea` metadata control | `N I/controls/combined-metadata/control-retained.mjs packages/scope/src/applications/archive-proof.ts 'jobBytes > PREPARATION_BOUNDS.metadata - rules[0]!.size' 'jobBytes > PREPARATION_BOUNDS.metadata + rules[0]!.size' --expect TITLE -- packages/scope --config vitest.worker.config.ts test/archive-application-proof.test.ts` | Helper 0 **DISTINGUISHES**; child exits 0/1; baseline 2 pass; mutant 1 pass / 1 fail; 12.792 s; intended line 65 refusal assertion | `I/controls/combined-metadata/tmp/artroom-control-1Nfily/before.json` `368a43a7df82062456eb713076bdcf5011197aad361904d9ce5a2c7638d965bc`; `after.json` `ef3dc31ed42391e520c2a4d4f2ab0f4b6acdbc4eb629debc5fa4cdad95ccaca5`; `I/controls/combined-metadata/stderr.log` `ec82ca8dc8c31e229e5f6cc1a0653db9a727273b1811b29a91769413b4aa4ad5` |
| `2740e6d1` Scope compilers | `N node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json`, then `-p packages/scope/tsconfig.test.json` | Both exit 0; 0.371 and 0.849 s | `D/01-scope-source` and `02-scope-test` argv/result/stdout/stderr; output `EMPTY` |
| `2740e6d1` compatibility | `N scripts/cloudflare-pool-compat.mjs` | Exit 0; 0.073 s | `D/03-compat.stdout.log` `e6455ec422a4d281a56a4a8b272bc95acdd9aa50a553127506a5e87c855e6c43`; stderr `EMPTY` |
| `2740e6d1` diagnostic follow-up | `V --config vitest.native.config.ts --project scope packages/scope/test/archive-capacity-observation.test.ts packages/scope/test/archive-driver.test.ts --reporter=default --reporter=json --outputFile.json=D/04-native.report.json` | Exit 0; observation 12 + driver 21 = 33 pass; 23.727 s; full callback reached | `D/04-native.report.json` `b7330108fc7ad4085412752da65547220ec4f2093ae6b1995013c34780756f5a`; stdout `2457b4f93eaa6a3427ee4e32387f98e844a4a9b044d0ae63fdf2919fd0e33870`; stderr `EMPTY` |
| Scale, assets, gate, Security review | Coupled `archive-installed-scale.test.ts`; page build; `npm run gate`; exact-head review | **UNRUN** | No pass or Security conclusion claimed |
| 2026-11-16 hook/refactor | Normal commit; actual argv in the two records | Hook exit 1, 1.067950 s; duplicate `same` refused. Import existing identical Bytes helper; normal commit exit 0, 1.014624 s | `G/pre-commit-refusal/result.json` `52f908b2fd9a1a0a23da005928c427ae209459e7afb58a319deeb95a29412e17`; `G/shared-same/commit-result.json` `da52894698d0a8cd2c5f58e3c1dd1d30510c6a4bec1fd043c14eea8992914155` |
| 2026-11-16 two AST seals | `N /private/tmp/artroom-ae1-two-source-seals-once-20261116.mjs` | Exit 0, 0.148725 s at `c6a0d992`; root reviewed two actual values before `4b11bf35` adoption; unrelated rows unchanged | `G/seals/stdout.json` `f5d01cde4b7c7a0811f643bef2bd908dd815760c81450e41625a390ac1c169c5`; `G/seals/commit-result.json` `be84d0fdc2751984415170b5a7c611430e7f4bcecb783306261170a9fd1746cd` |
| 2026-11-16 fourteen compilers | `N node_modules/typescript/bin/tsc -p CONFIG`; all 14 configs/argv in result | All exit 0 at `337c5566`; outer 7.804130 s; every stdout/stderr EMPTY. Later runtime source differs only in reviewed generated `assets.ts` | `G/compilers/result.json` `d29447e3386bd247f527e000e3f5c6d886c4a0c7aba6ebb7de97974d2f199161` |
| 2026-11-16 Page producer | `npm run build --workspace @generalbusiness/dap-page` | Exit 0, 0.639458 s at `337c5566`; only `assets.ts` changes; actual two-script review/corrected description below | `G/page/result.json` `8570135078f62120f2352fdb5e25c8eaf3b9c9beb0b88ebe276d14307d59b74a`; `G/page/generated-review.json` `2b1f73cd694793e0fdad50d7116bd9ff965a0b06f54da649f04e38f17d2d5a15` |
| 2026-11-16 Plain3 | Compatibility, then same three Plain owner paths/projects as the `ca1efcea` row; full actual argv in result | Compatibility exit 0, 0.079700 s; whole three files / four cases pass, exit 0, 2.010108 s; outer 3.015831 s at `7808c064` | `G/plain/result.json` `190d697076456ad4177161445c7eba7fcaff052c0b3cdceb5a42d0e7f7b8ccce`; `G/plain/plain.report.json` `a9743bf5f9b5546b0363235086183ccaccde5ccb9b149ec747af2401f5338695` |
| 2026-11-16 Native9 | `V --config vitest.native.config.ts --project scope` with the seven Native paths above plus `packages/scope/test/archive-capacity-observation.test.ts` and `packages/scope/test/archive-host.test.ts`; full actual argv in summary | **Exit 1; 97 pass / 4 fail of 101**, zero pending/todo; child 63.814107250 s, outer 64.347450708 s; no retry; source unchanged | `G/native-failure-summary.json` `966d94a68e704577e9d0d251757219b18ffc1235c90d237708844180c91cea87`; original full Native raw stays PRIVATE, paths/hashes in this safe summary |
| 2026-11-16 causal diagnostic, prior 7808 source | `V --config vitest.native.config.ts --project scope packages/scope/test/archive-installed.test.ts --testNamePattern PATTERN --reporter=default --reporter=json`; exact two-title pattern/argv in summary | Exit 1; two selected failures, ten intentionally unselected; child 12.824149125 s, outer 13.547464583 s; probes restored. Causal only, not fit or whole-owner PASS | `H/diagnostic-summary.json` SHA `5adc4e94b10067258b723012cb748396078832b225b696d82c7c07417f5d9887`; exact private result/stream hashes retained inside summary |
| 2026-11-16 query control, offline qualification | `N /private/tmp/artroom-ae1-retained-query-control-20261116.mjs apps/room/archive-packages.ts OLD NEW --expect QUERY_TITLE -- apps/room/lanes --config vitest.config.ts test/grow-archive.test.ts` | Helper exit 0, 3.353155666 s: baseline 3/3, mutant 2 pass / 1 direct AssertionError naming directoryInput. Original controller exit 2, 4.301351375 s: 536 Node compile-cache files mixed with six raw files; source restored exactly. Offline qualification, no rerun | `H/query-control-qualified.json`; actual qualification SHA `085a95d072ab7e21221b94843300cc8bd06db24130847d57dc38bb811b5d3b46`. Original result SHA `c2d8a9d9be87eef7af321ac7c09023dd1c3132bf3ad0740437f897c303e38249` stays exit 2 |
| 2026-11-16 Native attempt 2 | `V --config vitest.native.config.ts --project scope` with the same nine whole owner paths as Native9 above; actual argv/report location in result | Exit 0; 102/102 pass in nine owners at 027b/tree f77b; child 124.026111125 s, outer 125.228115292 s. Same-run Base 36 and Grow 37 confirmed passes; command followers pass | `H/native-result.json`, SHA `99d192bb8cde229ef0b11e66d0116bba6cd3f7e951de7b7f1f7dbb1b51eb5f3a`; stdout SHA `19c15a75baa2c198f8d7841615a9cbb97c9da57efbb9fcacfa2ccc3156a64f32`, stderr EMPTY. `H/native-measurements.json` SHA `0c7ea13c9ca5552d2d7373fbf9897836097c993440d19dde2e2ccd98fe98d774` |
| 2026-11-16 coupled Scale | `V --config vitest.scale.config.ts --project scope-scale packages/scope/test/archive-installed-scale.test.ts --reporter=default --reporter=json` with actual private output path in result | Exit 0; whole coupled producer/follower 2/2 PASS at 027b, child 40.901748833 s, outer 41.621330125 s; source/dependencies unchanged | `H/scale-result.json`, SHA `13b2501f5365b8f958130e6edfb736d1d017abf61f443253596ff76d958bd311`; stdout `3165a34a1ecdb0841d10236efe433df807026280ee13e12e15c4ead5cbeac37e`, stderr EMPTY |
| Gate1 and preflight1 at 1f0498aa/tree50da6240 | `npm run gate`; preflight fetch, `node scripts/check-shared-helpers.mjs`, `npm run typecheck`, `npm run pins` | Preflight all0; pins16.957318792s (command reports16.768); Security13PASS. Gate exit1, child64.276236917s, outer64.418330042s; KernelPASS, Node203PASS/3FAIL of206, no cancelled/skipped/todo; Counting/Plain/Native UNREACHED | `G1/gate.result.json` SHA `d1ec1116e8c49c1dbc58da7555527de4bffa29c52082beebe1aa7f3800e66bd0`; log `f6a87288459a38a7878406b563d650ea604ae8399591b6e1c642108242ef0d82`; preflight `dab17ba729daf22a1e34af93641562c4197206d7264f78dc5cb206823514a9a5` |
| c8 Scale-registration control | `N HELPER scripts/scale-deadline-registrations.mjs OLD NEW --expect 'scale registration factories leave no unlisted fixed deadline' -- . scripts/scale-selection.test.mjs`; exact strings in S/result | Helper0, 1.187506s; baseline7PASS, mutant6PASS/1 direct ERR_ASSERTION Missing expected exception. Demanded unknown→false fault; exact bytes/0644 restored, no third green | `S/result.json` SHA `d6784daf614050b964336da68020e637e22909f418a746140ae59a1309961b29`; `S/scale.stderr.log` SHA `577b6778ae91885fea4a137939939fd5bce144d58c8f28d3d0c26627471de182`; raw TAPs retained |
| c8 settings-read control | `N HELPER scripts/security-settings.mjs OLD NEW --expect 'setting reads follow immutable lexical aliases and refuse unsupported escapes' -- . scripts/security-settings.test.mjs`; exact strings in S/result | Helper0, 255.9801985s; baseline3PASS, mutant2PASS/1 direct ERR_ASSERTION: copied RHS cannot hide nested undocumented read. Actual TAP wall126.488874208s/128.957392791s; original deadlines, no rerun/third green; bytes/0644 restored | `S/result.json`, same digest; `S/settings.stderr.log` SHA `f3503feeb364e4012aecdc51cc9d39d2794aa48422f365606bccbf1b73ef2691`; raw TAPs retained |
| Whole maintained Node at `1c01a94f` | Exact `fixedStages` Node descriptor alone; launcher argv in `G2/whole-node.result.json` | Exit 0; 206/206 pass, no fail/cancelled/skipped/todo; child 131.715873458 s, outer 131.811788792 s; child reaped/group empty | `G2/whole-node.result.json` SHA `d6284ab06873ffaba2ddb56e326e0706ded6cf8a3929a3f24dd146f23da47340`; stdout digest in record, stderr EMPTY; original streams stay private |
| Preflight2 at `1c01a94f` | Fetch origin/main; `N scripts/check-shared-helpers.mjs`; `npm run typecheck`; `npm run pins`; exact argv in result | All four exit 0; helpers 0.634325500 s, whole TC 16.540657625 s, pins command 17.109324542 s; total 35.229670291 s; all groups empty | `G2/preflight.result.json` SHA `38cddba05839748f8cc463cf8a312ca0707208e89024966e6bf9e6ec2bf13e1e`; fetch stderr 99 B, other stderr EMPTY |
| Gate2 at `1c01a94f`/tree `bfeb3ee0` | `npm run gate`; START `9ab6812709a5ad852417b34428a7c1a93730ef59`; END `8614277786e258be2a8396695b527527aea9d6a1` | **FAIL, exit 1**; child 1806.755506542 s, outer 1806.906823458 s; Kernel pass, Node 206, Counting 56, Plain 4913 pass/1 skip, Native 1171 pass/1 fail/2 skip. All 22 Scale cases pass in 13 owners; no separate Scale wall. Sole failure is the stale 64-node inventory expectation | `G2/gate.result.json` SHA `2de5dee8a4f5f44444271ae9c8d53833d72978c9ee869ff92af55d8de57d786a`; log `67baf048adc57046bf64665c5f26a62be19592b51c5908c45e54da42ef845c34`; child reaped/group empty. Native terminal evidence partial, 129 unknown/suite observations, zero contradictions |
| Attempt3 development at `da8a7337` | `N node_modules/typescript/bin/tsc -p` Scope/Derive test configs; compat; whole Plain corpus; Native `scope`/`scope-stories`/`scope-scale` 39-file union. Exact argv/coverage in D3/result | All five exit 0; compilers 0.962397125/0.559877583 s, compat 0.086364583 s; corpus 1541 pass/2.805309125 s; Native 212 pass/39 files, child 466.359220208 s; outer 471.751190958 s. No pending/todo/missing/extra/duplicate file. Two uncaught cross-DO log errors remain undiagnosed; no harmlessness claim | PRIVATE `D3/result.json` SHA `ef3701ea4f981643c98f97ffc0b547287d49cb33ae98ef4bd7d3a0ef2c974796`; END `e85be982d960806ba9873db3b58519f77bc561e0`. Source clean, all groups reaped/empty; no runtime raw copied |
| Whole Node again at `da8a7337` | Exact maintained `fixedStages` Node descriptor alone; argv in PRIVATE N3/result | **Exit 1; 205 pass/1 fail of 206**, zero cancel/skip/todo; child 133.845142459 s, outer 133.916273459 s. active-source.test.mjs:114 rejects Derive corpus import from dap-git/journal. Source clean; group reaped/empty, no cleanup actions | `N3/result.json` SHA `fa42d6e95a2735ee8a0fb9f71f7efceccf9fe2a7e3fcf97057804ca66caeccf3`; END `a8d20fcc91d8e7a57ee5d032642581f2faa74c6d`. Preflight3/gate3 did not run |

`TITLE` is the exact single argument
`archive install proof binds Base Rules, exact signed IDs and native retained byte limits without codec fallback`.
Both controls use the unchanged whole two-case owner, no name filter/pending/
todo/cancel/skip. Original helper SHA
`8d7ba44b672b1c84c2272dd185661c77ecc06b958e59fb83b5b4a0d0562aa818`;
cleanup-only copy `172b74d82244d6b93f5febcade352ce0c2fd67bdec609af0a63d7164beec5415`
and one-line diff stay retained. Restored source
`98322b0ce019612c520df52a65241ba4f13f8d617c5782e4784ed747c679003e`/0644 is exact;
no third green. Controls act `cc682d8b499a77cac05b3edd46ae2716f93bbdd9`;
diagnostic END `666921f396c74fd584830f0c20e00f3cb7821152`. That historical
note-only update ran no check or source/cap/price/deadline/expectation/release/
model/operator change.

## Resumed source, 15 November 2026

Ruling `790afe00333dd0cd581b78a61ce37e434074628c` raises nodes 64→128 and inputWork 67,108,864→134,217,728. Other caps/charges/cases/deadlines and non-AE1 source stay exact. Fit, compilers, assets, seals and gate were then UNRUN; gate awaited three approved landings. Later rows retain actual results.


## Failed runtime checkpoint, 16 November 2026

At `7808c06482d61e27e1bda07f195d85f55da1ac16`, tree
`69c0c36caea4aa06f505e6f072e72602e706cfb2`, compiler 337c differs only in Page
assets. G's 61 safe exact copies have retained-files.json SHA
d6dd949183742627ae9ee8c1bbf6528f1eb8a057aeb10f0ec1fdb9ac3a4f84e2. Native raw
is private. Bytes.same changes no guard; reviewed/adopted seals and old proof-
control correspondence grant no Security pass.

PAGE_JS grows 313 B/OAUTH_JS 55 B; both HTML exports stay exact. Both scripts
change the shared reader, Page also disclosure/minifier names. The offline
unchanged-OAuth claim was false, not a run; root corrected it after both diffs.

END `2ae3212a80b1ca7680e2f38e583915d885ea4317` retains the Native9 failure row.
Base cutoff 0 retries unavailable, used [0,0,13,27,125538,7369823]. Grow cutoff 3
stops input, used [2,42,41,143,1146690,79110748], confirmed 2. Neither has capacity
refusal; followers lack producer sessions. These facts identify neither cause
nor cap shortage. Diagnostics omit scope/cutoff identity; final costs are not
peaks/maxima. Fit/trust removal/clone and Scale/sandbox/pins/gate/review were
unproved then; CS1 had only 11 Node passes.

## Reviewed producer repairs, 16 November 2026

The H diagnostic row is causal-only: two selected failures/ten unselected,
not fit. It retains exact walls/raw hashes; no raw output is exposed. Rulings
29f6b30a/cf8dba11/bb732 govern repairs. Base Directory 27/cutoff 0 directoryInput
starts SELECT-newline; the unchanged native SELECT-space guard refuses before
SQL. Only the separator changes; guard/bindings/reservations/charges/stop stay.
Grow delivery 3 serializes [2,27,22,125,1103026,67270606], exceeding reader
[4096,512,64,16384,4194304,67108864] by 161,742 work. The operand is 67,270,606,
not live [2,42,41,139,1145970,72757836] or final admitted 79,110,748.

Six-path 8f7bd055 freezes the actual six queries; reversal restores old source
except SELECT-space. Current entryPosition/currentRules/rulesDirectory/
entryItems/activeInstallation/directoryInput calls all use the map. First Plain
case exercises real native prefix/semicolon/call debit with scripted empty SQL,
zero metadata/work and clock. It proves no SQL semantics, price/proof/policy/fit.
Future queries outside the map escape it; no cheap universal site check exists
in the case, as bb732 accepts. Old bodies/order/deadlines stay exact. Actual
SELECT-newline control fails named directoryInput not.toThrow before SQL;
helper0 and controller2 remain distinct in the table.

JOURNAL_INVENTORY_CEILINGS uses the existing Git journal export. Reader/native
share nodes 128/work 134217728; native permission was already present. Other caps
4096/512/16384/4194304 and foreign-source grammar64 stay. The existing case pins
both vectors/numbers and joint reversion; debit cases and charge/deadline/
format/source/metadata permissions stay exact.

V1/v2 selection readers compare fixed/live cost: journal-layout, journal-v2-
layout/conversion, journal-anchor-legacy and Scope storedSelection. Pending local
ArchiveMark/frontier can reach old Workers: above-old cost refuses input; old
storedSelection may return null and rebuild may refuse manifest. Earlier byte/
time/source/work failures can differ; no migration/fallback exists and retained-
pass partial bookkeeping grants no cost. Public v1/v2 manifests omit producer
cost/private bookkeeping, so Git/Replay has no such operand to reject. Their
byte/work/time/layout/source/replay limits remain. No universal old-reader
success/failure follows; foreign list64 stays, external callers are unenumerable.
The reviewed READERS audit retains these distinctions.

The pure Git export adds no Scope cycle, Replay/process edge, export-map or
lock change. Closure 14→16 adds Git production/Replay Node; old 337c passes do not
validate it. At 027b only budget seal
a35cc8c0e8cc4be8fc33bd4316906085173f19e1e68e12091803a5e3ce08f499 and package seal
f4155b32056fef2ae38ac64b553b83a0de5427d97a7b30fceef76347c80edc9b change.
Other rows/selectors stay; no diagnostic source lands. Later preflight/gates/
scanner controls supersede only dated UNRUN obligations.

## Qualified positive checkpoint, 16 November 2026

QUERY_TITLE is `archive package discovery queries pass the native read guard before SQL work`.
NEW restores SELECT-newline; OLD is SELECT-space in directoryInput. The query
control row keeps helper0/direct assertion versus controller2's cache postguard;
no rerun, source restored. Same-run Base36/proofReads22 and Grow37/proofReads25
remain separate. Each command gives 5 missing-dependency without trust and 5
consistent with it; authority/trust/revoke/terminal ledgers are never summed.

Final-admitted maxima are not peaks; settlement can lower work. Zero-based:
Base nodes 63/pass 5 at sc_vnvj5vdrecvsjasoklm6zpzfzydzv3mqfmzgwkvgkh3j5tmvalwq,
cutoff 1; work 53,298,198/pass 27 at
sc_eifk5d2kggatzpatw7lu37m3vusu45xogr5ls7p3gzy2rnmdgdga, cutoff 5.
Grow nodes 61 ties pass 3(root/cutoff 3)/pass 5(child/cutoff 1); work 82,077,224/pass 4
at sc_swtlf72kslh27h5awxd2y7naeaphj4aabme7d3ijiu56nuoqpvta, cutoff 0.
H binds each axis's own vector; no synthetic max vector, high-water, general
cohort, hosted or alarm-cadence claim. TEST clock/scheduler/peer limits stay.
The coupled Scale producer/follower passes together after late native membership
Directory binding; no second producer/filter. CS1 records sandbox 10 separately.
Both runs preserve source/dependencies and release groups with no actions.
Both gates stay failed; later checks do not erase the dated Native/Scale passes.

## Gate1 failure and scanner-only repair

Gate1 stays failed. G1/raw-gate-retention.json SHA
4ac2dfad1ac3772f7550b63713a6b301c95b152af70f7b837894d2e7b9c68719 binds 34 raw
files/6,203,032bytes privately. All preflight commands and Security’s 13 cases passed.
Gate1 failed before Counting, Plain and Native started. Earlier owners retain their own meanings.

The c8 repair is boolean-|| only: true short-circuits, false needs boolean RHS,
demanded unknown refuses. Settings accepts uppercase literals on env/immutable
alias/this.env, rejecting copied/dynamic keys. Docs cover eight shared-Worker
restarts, archive-packages APPLICATION_TRUST and unread GROW_ARCHIVE_CONFIG
removal. Runtime/fixtures/prices/caps/authority/deadlines stay exact.
HELPER=/private/tmp/artroom-ae1-retained-query-control-20261116.mjs;
S/manifest SHA f5fb9b973ac64dc99282f0af01cc858e4511401218a0aa60df41818cdab065d8.
Rows retain faults/verdicts/TAPs; bytes/0644 restore, no cleanup action, raised
deadline or third green. Node 206/preflight2 at 1c meet 7be10b34's START2 rule,
not either failed gate or a larger deadline.

## Gate2 failure and attempt3

Gate2's private retention has 38 files/53,876,500 B, bound by
`G2/raw-gate-retention.json` SHA `e3f4988723e59a7f671187ad72646d83a62abd6a7edfc0247d025944d2731490`; raw Native stays private.

The d382 five test/doc repairs join the graph helper, Native boundary and raw
corpus/mapping, plus driver words. At that dated head both graph consumers use
the shared maximum: 273 declarations (127+128+18) versus 145 (63+64+18), source
arithmetic, not observed cases. Per-root 17/stronger 64 MiB stay; no production/
charge/deadline/ID/version/packet change. Driver says “Shared production ceilings
apply.” Scanner source `c8c308a710be130d4c55941ebeb20f88e80307e9`, tree
`05acf39b48f3a735fb18509dfb9976ec2709c62b`.
Ruling `a1c5a189f33f49ef2c80f915e13476954aa94b94` requires whole inventory-reader
owners/Node before START3. The 39-file Native check passed at da8a; Node then failed. Fresh
preflight3/gate3/review/hosted remain owed. START3 still needs exact-head hit
list and actual owner counts; the initial scan is pre-repair.

## Post-Node layer disposition

Ruling `c461110c34123bb5071324064a84f7ecf52c5799` keeps the ceiling in Git and
the layer assertion/allowlist unchanged. Native passes it to the argument-only
graph helper; Derive imports no dap-git and supplies its own TEST bound 53 to
test a graph property, not the archive ceiling. The four test/doc repairs are committed at 35de;
validation there is UNRUN. The ceiling move was withdrawn. If Derive production enforces
this ceiling, stop for planner disposition. The earlier shared-corpus semantics
and 39-file pass remain dated da8a, not validation of the successor. Whole Node
must pass again before START3, with exact-head hit list and owner counts.
