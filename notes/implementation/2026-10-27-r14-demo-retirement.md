# Retire legacy demo authority paths

The server accepts only the current closed DEMO_START_CONFIG wire version 3, with an explicit canonical configured origin, Register17 identity and matching Artifacts register/namespace. Its native context and public offer remain version 2. Old server configuration/projection forms and the fixed-origin branch are removed. The retained client version 1 codec, historical native definitions and pins remain unchanged.

The route uses the shared public-origin setting without rewriting the incoming Request or trusting forwarded headers. The actual Native Register17 witness covers a second HTTPS origin and internal HTTP with PUBLIC_ORIGIN/different Host, early wrong/invalid/forwarded-only refusals, protected reads, unseen founding authority, exact incarnation, adapter binding and no-wake checks. Actual Register7/8 state still exists in the fixture, but an exact old reference cannot resurrect a retired decoder. The GitHub wiring admits only its normal configured root; retired extra roots refuse without provider calls. Its normal provider/credential/cleanup checks retain their labelled host stand-in.

The Worker module seal stays unchanged from Scope Main `c7c517143bfa001c8ff3f96c3ec55faa90f06103`; only outsideOf changes among the named declarations, with 26 others unchanged. Three whole demo/parser/GitHub owners were reviewed and adopted. The local celld name becomes dap-celld-local; its bindings, migrations and vars stay byte-identical. Workflow actions are pinned to the retained official commit provenance. Source provenance and a matcher guard do not prove a remote CI run. No new production setting or deployed cleanup is claimed.

Fifteen owning Node cases and two whole Native files (three cases, no skips) pass at the earlier focused checkpoint. The retained local generated-CA TLS proxy run uses real celld, the production Room entry, native scopes, registry and agent. Configured signed creation 201, differing Host, fresh unset/forwarded-only 403 and wrong signed service 403 distinguish the origin boundary. Two initialized MCP sessions call the room tool; rotation and retirement each answer 200. All seven exact journals verify and actual health reports sessions ok and register ready (HTTP 200). Both celld processes close with exit 0 without a signal. Private generated keys, invitation/request custody, bearers and child logs remain withheld; RAW retains public metadata and their qualified digests only.

The proxy ran at `d01ed5b0cc4f59039bad69e7056343a975babfae`, tree `7f9e62f88734303a6efe53b87505841e5e023f69`. Its aggregate counters are 262 requests, 255 forwarded responses and seven backend connection errors, with no phase attribution. Direct controls use socket-idle timeouts and reply caps, not a strict whole-body deadline. The invitation readiness guard is checked between awaited calls, not a strict ten-second wall deadline. New-bearer success/rotation and retirement status do not independently prove old-bearer rejection. No interruption fault injection, hosted proxy, fleet, device, supervisor, backup, global trust or remote CI result is claimed.

The first ordinary gate at `d01ed5b0cc4f59039bad69e7056343a975babfae` stopped with exit 2 in 0.300 wall seconds at one new blank line at EOF. Its compiler and all test stages were unreached; it remains failed. There is no test-stage ledger for that pre-test failure. The only repair removes the last extra LF from packages/scope/src/demo-creation.ts (4009 to 4008 bytes), as the retained byte comparison and patch prove. Earlier focused/runtime outcomes keep their original checkpoint; no hidden rerun is inferred.

Tested gate: `b9cd8f45065dab2a0077161860a99aef4f6358b5`, tree `b7c088a817559dc2e137e63c87eedcf0aad768b0`. The final report adds only this note and its manifest; every other tracked byte and executable/symlink mode equals that source. The final publication supplies its final head/tree independently.

One evidence table follows. Each command row uses an actual terminal receipt and complete retained output. The source-equality row is an internal predicate with no invented subprocess exit. The analysis is a read-only reconstruction through the unchanged maintained summary implementation, not a rerun or a fabricated summary file.

| Check and checkpoint | Actual argv | Exit | Wall s | Child CPU s | Output SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| inventory-generation (`1f0399cb82abb1ef5d28616758a2443f7b0ddac6`) | `node /private/tmp/artroom-r14-demo-inventory-generation-20261027.mjs` | 0 | 0.396 | 0.190 | `273c3f1e5336052ce403ba48091d42491fbdbc34f99e5d0a39df3b0f6c15c2e5` |
| types-source (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json` | 0 | 0.627 | 1.300 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| types-test (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | 0 | 0.670 | 3.607 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| owning-node (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `node --test scripts/security-settings.test.mjs scripts/security-entry-points.test.mjs scripts/celld-smoke.test.mjs` | 0 | 48.677 | 59.697 | `76f201166ee1ecaf8552f36080707c6f734f5dd588b85364b8504f4b03d0e645` |
| pool-compat (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `node scripts/cloudflare-pool-compat.mjs` | 0 | 0.079 | 0.072 | `66c05d5269e260269d11873cf5f41273b1aced5cc8ede623e355bb65c4fb1a91` |
| native-owning (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/demo-creation.test.ts packages/scope/test/github-wiring.test.ts --reporter verbose --reporter json --outputFile /Users/hughpyle/play/artroom-evidence/2026-10-27-r14-demo-retirement/native-owning-results.json` | 0 | 5.857 | 7.672 | `8d7abda33f9d695992aa7cb0aa9813ac7780a5a81d51b8a7353cdfc37e3f0f41` |
| celld-proxy (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `node scripts/test-celld-proxy.mjs` | 0 | 9.167 | 5.509 | `57806d414dab47f48b1fd62403752ba23ae63bb62a9b5fa4fd7f5a9277eaf3a9` |
| retirement-reference-check (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `python3 /private/tmp/artroom-r14-demo-retirement-reference-check-20261027.py` | 0 | 0.019 | 0.016 | `31344355dc091108c4bf56445766239ca099f34adafc82770792a0b9064816e0` |
| gate (`d01ed5b0cc4f59039bad69e7056343a975babfae`) | `npm run gate` | 2 | 0.300 | 0.271 | `ec4989b573071efcbfcb5918731723b490e9e8ef0da9d22d28346278919b0dd3` |
| gate-whitespace-followup (`b9cd8f45065dab2a0077161860a99aef4f6358b5`) | `npm run gate` | 0 | 1132.432 | 2360.376 | `10eaaa4fedba1587274dd872f79d00e163611987289efbb64d8b83d48134235b` |
| Closed cost analysis (`b9cd8f45065dab2a0077161860a99aef4f6358b5`) | `/Library/Developer/CommandLineTools/usr/bin/python3 /private/tmp/artroom-r14-demo-cost-analysis-20261027.py` | 0 | 0.329 | 0.326 | `ca5af0e398655e32027e1dafba4782a68f41b5d2a57610c716274bab991e38e6` |
| Full source equality (`b9cd8f45065dab2a0077161860a99aef4f6358b5`) | Internal finalizer predicate; no separate child command | n/a | n/a | n/a | `4b472ce394a659926bdeaf9573fcab26e8ed2ab3cc501ee6d8707d6044140b3f` |

The [evidence manifest](evidence/2026-10-27-r14-demo-retirement.manifest.json) binds the raw collection, sealed after final assembly at `/Users/hughpyle/play/artroom-evidence/2026-10-27-r14-demo-retirement`. The manifest indexes every retained file including the root index; `SHA256SUMS` excludes itself. Existing nested evidence bytes and indices are preserved. Analysis stderr is retained with its actual digest. The finalizer's actual terminal is retained separately by the reporting owner, after this seal.

The gate took 1132.432 wall seconds and 2360.376 child CPU seconds. Across 10 retained commands, summed wall is 1198.224 seconds and child CPU is 2438.710 seconds. Sums include the failed whitespace gate and overlap; they are not an elapsed edit-to-review window. Editing, collection, analysis and human review are excluded. The separate analysis costs appear in the table.

Machine: macOS-27.2-arm64-arm-64bit, arm64, 18 logical CPUs, Node v26.12.1; load at gate start [1.10693359375, 1.24365234375, 1.51904296875]. Warm lock-verified dependency view; OS cache unmeasured; shared machine load uncontrolled. No package install or dependency/lock change occurred.

Actual gate observations:

- node: 74 passed, 0 failed, 0 skipped, 0 todo case finals; 0 reconciled Vitest module finals. Case durations missing: 0. Public Node aggregates, if present, are retained separately in the analysis.
- counting: 55 passed, 0 failed, 0 skipped, 0 todo case finals; 0 reconciled Vitest module finals. Case durations missing: 0. Public Node aggregates, if present, are retained separately in the analysis.
- plain: 2892 passed, 0 failed, 1 skipped, 0 todo case finals; 285 reconciled Vitest module finals. Case durations missing: 1. Public Node aggregates, if present, are retained separately in the analysis.
- native: 822 passed, 0 failed, 2 skipped, 0 todo case finals; 238 reconciled Vitest module finals. Case durations missing: 2. Public Node aggregates, if present, are retained separately in the analysis.

Fixed-owner ledger wall/CPU and rounded shell costs remain distinct. Missing CPU stays unknown; case and Vitest test-and-hook module durations are concurrent observations, not elapsed wall, CPU, teardown or a causal performance result. A terminal reporting phase does not prove every incremental callback arrived. Original progress streams remain retained.

Actual shell step costs:

- citations: wall 5.680 s, user 5.720 s, system 0.230 s; exit 0.
- cite-test: wall 0.350 s, user 0.280 s, system 0.070 s; exit 0.
- commit-messages: wall 0.100 s, user 0.070 s, system 0.020 s; exit 0.
- commit-test: wall 0.580 s, user 0.370 s, system 0.170 s; exit 0.
- doc-links: wall 0.090 s, user 0.080 s, system 0.010 s; exit 0.
- helpers: wall 0.400 s, user 0.450 s, system 0.050 s; exit 0.
- notes: wall 0.090 s, user 0.060 s, system 0.020 s; exit 0.
- test: wall 1113.710 s, user 2107.000 s, system 204.610 s; exit 0.
- typecheck: wall 10.010 s, user 35.320 s, system 4.400 s; exit 0.
- whitespace: wall 0.010 s, user 0.000 s, system 0.010 s; exit 0.

Slowest observed cases (concurrent duration; skipped/todo entries prove no execution):

- scope: packages/scope/test/floor-archive.test.ts — Native alarm writer advances a30000-entry journal in five bounded floors then waits for a1000-position target rise: 324.027 s, passed.
- scope: apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts — native initially full Root completes one thousand successful partition births and cap-limited seals: 262.493 s, passed.
- scope: packages/scope/test/archive-one-entry-scale.test.ts — the Native driver confirms 10,001 one-entry passes and preserves retained rule inputs from pass 3700: 236.931 s, passed.
- scope: packages/scope/test/archive-cadence.test.ts — Native archive alarms clear three daily windows of4800entries without a backlog: 127.565 s, passed.
- scope: packages/scope/test/floor-archive.test.ts — Native archive floors reclaim an exact2000-entry ceiling while10000 real inputs continue: 109.957 s, passed.
- scope: packages/mcp/test/hosted.scope.test.ts — H6 matrix through the endpoint: prepared reset, concurrent send and settle, 255 unresolved, archived refusal and replay, repeated uncertain attempts, a full create: 85.261 s, passed.
- scope: apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts — G15 admits the maximum constructed capture, retains 32 real proofs, and refuses the next capture before storing passes: 72.839 s, passed.
- scope: apps/room/lanes/test/directory-partition-capacity.scope.test.ts — native full root preserves three thousand standing entries through one thousand undelivered generations: 53.791 s, passed.
- node: scripts/security-settings.test.mjs — the real Worker source inventory rejects an undocumented setting read: 42.712 s, passed.
- scope: apps/room/lanes/test/directory-partition-lanes.scope.test.ts — native raw proof residency stays at thirty-two dense frames with one physical read: 32.238 s, passed.

The analysis also retains top Vitest modules, all project sums, missing-duration counts and 66 unknown/suite observations excluded from case rankings. No performance improvement or physical drain is inferred.

Open limits: exact-head independent review and landing remain due. This child retires legacy server demo forms and extra GitHub authority roots only; R14 retains broader retirement and hosted-usage decisions. The local runtime proof above is not a deployment, deployed TLS profile, fleet/device/backup, browser or live-provider observation. No deployment setting was removed, old journal discarded or retained client decoder retired.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:fe2305a2592d3f33f0d0a80406a8ac151b2bb6a9`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:999ffe93fe2ac542f308f54cd43f0ce513e8c2ee`
