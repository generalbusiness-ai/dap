# Retire the production Scope service facade

The production Worker no longer exports `ScopeService`. Its existing HTTP routes, in-process API, Durable Object classes and MCP paths remain. `ApplicationScreenService` is the sole production RPC Worker entrypoint. The test Worker supplies its own forwarding facade for existing service-binding witnesses; production imports no test authority.

The surviving 27 Worker declaration seals equal landed H1 `d6967b7fb665566f146c8cc3be906c6beee8d60e`. Only the module shell and the removed facade owner change. H1 public-origin, demo route and local proxy/smoke sources are unchanged. This retirement does not inherit a new runtime, proxy, deployment or provider observation from those files.

The structural inventory rejects an extra production RPC export. Its parser generation ran at the earlier clean inventory checkpoint, then the reviewed expected shell value was adopted for the tested source. Nine owning Node cases pass. Seven whole Native files pass 28 cases without skips; their existing host, clock, reader and transport stand-ins retain their qualifications. The tracked-reference guard reports no retired identifier outside notes. None of these checks is a live deployment or celld run.

Tested gate: `c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`, tree `633691362bc4c35f65d4ba2fec88cb6f074e7add`. The final report adds only this note and its manifest; every other tracked byte and executable/symlink mode equals that source. The final publication supplies its final head/tree independently.

One evidence table follows. Each command row uses an actual terminal receipt and complete retained output. The source-equality row is an internal predicate with no invented subprocess exit. The analysis is a read-only reconstruction through the unchanged maintained summary implementation, not a rerun or a fabricated summary file.

| Check and checkpoint | Actual argv | Exit | Wall s | Child CPU s | Output SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| inventory-generation (`98fa7f0e409b92d6bc5ed152711229d86ed40ee6`) | `node /private/tmp/artroom-r14-scope-inventory-generation-20261027.mjs` | 0 | 0.407 | 0.186 | `20c7095e371db8ffee88994f14f8f578e8555b9470bd8c9a5f9da8aff1aad54b` |
| security-inventory (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `node --test scripts/security-entry-points.test.mjs` | 0 | 2.239 | 2.814 | `2eaff023f1b461aa8794e04ae8365fc7c227c66a6c2f300712b890fbf9293a7f` |
| types-source (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json` | 0 | 0.590 | 1.363 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| types-test (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | 0 | 0.644 | 3.151 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| pool-compat (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `node scripts/cloudflare-pool-compat.mjs` | 0 | 0.080 | 0.073 | `95785ec668e46a7a6b695f950ada5568d09024f4a5988b95217bb47d17fc0893` |
| native-owning (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/client.test.ts packages/scope/test/limits.test.ts packages/scope/test/serving-admission.test.ts packages/scope/test/application-projection-native.test.ts packages/scope/test/creation-admission.test.ts packages/scope/test/creation-admission-native.test.ts packages/scope/test/application-sandbox.test.ts --reporter verbose --reporter json --outputFile /Users/hughpyle/play/artroom-evidence/2026-10-27-r14-scope-service-retirement/native-owning-results.json` | 0 | 37.836 | 14.307 | `92f4e2ebeb1698d44420451f48154c8c0ed1b5c20287f655d15c173717db6493` |
| retired-reference-check (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `python3 /private/tmp/artroom-r14-scope-reference-check-20261027.py` | 0 | 0.048 | 0.167 | `ce96be8bf3a93f641fc4a133766c0dfa9b031d805d56ff55c5bf4fc2fc5922b1` |
| gate (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `npm run gate` | 0 | 1121.994 | 2332.944 | `72f68fde6ec1ad47e2f9c4c23ee7474aaec452fbc62ede8163a04c1b46e39ee0` |
| Closed cost analysis (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | `/Library/Developer/CommandLineTools/usr/bin/python3 /private/tmp/artroom-r14-scope-cost-analysis-20261027.py` | 0 | 0.297 | 0.295 | `3e57f717ab8721ce5637a0afacc8b932ca67a10eb681f7c9045d4f481dc7e12b` |
| Full source equality (`c0fd56eb9357c76730aa3af3cf3d2b11b3b518f8`) | Internal finalizer predicate; no separate child command | n/a | n/a | n/a | `438fe4941d5a33e8b76aa1975db4b28d9acd40e5ff858f0861bcf16b308bbdde` |

The [evidence manifest](evidence/2026-10-27-r14-scope-service-retirement.manifest.json) binds the raw collection, sealed after final assembly at `/Users/hughpyle/play/artroom-evidence/2026-10-27-r14-scope-service-retirement`. The manifest indexes every retained file including the root index; `SHA256SUMS` excludes itself. Existing nested evidence bytes and indices are preserved. Analysis stderr is retained with its actual digest. The finalizer's actual terminal is retained separately by the reporting owner, after this seal.

The gate took 1121.994 wall seconds and 2332.944 child CPU seconds. Across 8 retained commands, summed wall is 1163.838 seconds and child CPU is 2355.006 seconds. Sums include overlap; they are not an elapsed edit-to-review window. Editing, collection, analysis and human review are excluded. The separate analysis costs appear in the table.

Machine: macOS-27.2-arm64-arm-64bit, arm64, 18 logical CPUs, Node v26.12.1; load at gate start [1.61279296875, 1.37353515625, 1.31103515625]. Warm lock-verified dependency view; OS cache unmeasured; shared machine load uncontrolled. No package install or dependency/lock change occurred.

Actual gate observations:

- node: 74 passed, 0 failed, 0 skipped, 0 todo case finals; 0 reconciled Vitest module finals. Case durations missing: 0. Public Node aggregates, if present, are retained separately in the analysis.
- counting: 55 passed, 0 failed, 0 skipped, 0 todo case finals; 0 reconciled Vitest module finals. Case durations missing: 0. Public Node aggregates, if present, are retained separately in the analysis.
- plain: 2892 passed, 0 failed, 1 skipped, 0 todo case finals; 285 reconciled Vitest module finals. Case durations missing: 1. Public Node aggregates, if present, are retained separately in the analysis.
- native: 822 passed, 0 failed, 2 skipped, 0 todo case finals; 238 reconciled Vitest module finals. Case durations missing: 2. Public Node aggregates, if present, are retained separately in the analysis.

Fixed-owner ledger wall/CPU and rounded shell costs remain distinct. Missing CPU stays unknown; case and Vitest test-and-hook module durations are concurrent observations, not elapsed wall, CPU, teardown or a causal performance result. A terminal reporting phase does not prove every incremental callback arrived. Original progress streams remain retained.

Actual shell step costs:

- citations: wall 5.720 s, user 5.750 s, system 0.220 s; exit 0.
- cite-test: wall 0.340 s, user 0.280 s, system 0.070 s; exit 0.
- commit-messages: wall 0.100 s, user 0.070 s, system 0.020 s; exit 0.
- commit-test: wall 0.590 s, user 0.370 s, system 0.170 s; exit 0.
- doc-links: wall 0.090 s, user 0.090 s, system 0.010 s; exit 0.
- helpers: wall 0.400 s, user 0.460 s, system 0.050 s; exit 0.
- notes: wall 0.090 s, user 0.060 s, system 0.020 s; exit 0.
- test: wall 1103.220 s, user 2075.760 s, system 208.830 s; exit 0.
- typecheck: wall 10.000 s, user 35.020 s, system 4.230 s; exit 0.
- whitespace: wall 0.010 s, user 0.000 s, system 0.010 s; exit 0.

Slowest observed cases (concurrent duration; skipped/todo entries prove no execution):

- scope: packages/scope/test/floor-archive.test.ts — Native alarm writer advances a30000-entry journal in five bounded floors then waits for a1000-position target rise: 323.840 s, passed.
- scope: apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts — native initially full Root completes one thousand successful partition births and cap-limited seals: 256.859 s, passed.
- scope: packages/scope/test/archive-one-entry-scale.test.ts — the Native driver confirms 10,001 one-entry passes and preserves retained rule inputs from pass 3700: 227.012 s, passed.
- scope: packages/scope/test/archive-cadence.test.ts — Native archive alarms clear three daily windows of4800entries without a backlog: 120.479 s, passed.
- scope: packages/scope/test/floor-archive.test.ts — Native archive floors reclaim an exact2000-entry ceiling while10000 real inputs continue: 108.502 s, passed.
- scope: packages/mcp/test/hosted.scope.test.ts — H6 matrix through the endpoint: prepared reset, concurrent send and settle, 255 unresolved, archived refusal and replay, repeated uncertain attempts, a full create: 84.227 s, passed.
- scope: apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts — G15 admits the maximum constructed capture, retains 32 real proofs, and refuses the next capture before storing passes: 68.593 s, passed.
- scope: apps/room/lanes/test/directory-partition-capacity.scope.test.ts — native full root preserves three thousand standing entries through one thousand undelivered generations: 51.353 s, passed.
- node: scripts/security-settings.test.mjs — the real Worker source inventory rejects an undocumented setting read: 45.099 s, passed.
- scope: packages/scope/test/archive-installed.test.ts — installed Grow production public archive command verifies its native producer clone: 32.749 s, passed.

The analysis also retains top Vitest modules, all project sums, missing-duration counts and 66 unknown/suite observations excluded from case rankings. No performance improvement or physical drain is inferred.

Open limits: exact-head independent review and landing remain due. This child retires one production facade only; R14 retains broader inventory and retirement decisions. No deployment, hosted census, proxy, TLS profile, user-key, browser or live-provider case ran for this child. Historical journals, native definition pins and retained client codecs are not retired by removing the facade.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:db60a6f9f4059de5fef74b9bc0ccb45e36eff027`
