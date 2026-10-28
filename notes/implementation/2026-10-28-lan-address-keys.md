# Local address keys and MCP failure windows

Link-local IPv6 (fe80::/10) and unique-local IPv6 (fc00::/7) now use complete canonical 128-bit counter keys, prefixed v6l: and v6u:. Other IPv6 keeps its /64 key. IPv4 and IPv4-mapped IPv6 keep their existing key. Zones and equivalent spellings converge. The parser has one pure Bytes owner; Scope re-exports it to preserve its API, and MCP imports Bytes without a dependency cycle.

MCP bearer failures now use the same canonical keys. The raw 64-character and 64-UTF-8-byte checks still run before canonicalization. Missing and invalid addresses share one counter. The sliding-minute limit, 4096-key bound, active-window protection, expiry and valid-bearer behavior retain their existing rules. The security inventory describes these keys; Site keeps its separate policy.

Final tested checkpoint `ea35a4d31a6c3dbbd2e1f9941c0cd6ce89c87c0b`, tree `c9e88aefffbc2c5c02d45949d62dd267c4079015`; base `eb827cc2f7b2ccab5daf3cff3b194183cd05b716`. Every evidence row names its actual checkpoint. Source-seal extraction may precede adoption of those reviewed seals; it is not silently treated as a run at the final source. The report-only head adds this note and its manifest; all existing tracked bytes and modes equal the final gate. Final publication binds that later head separately.

The first ordinary gate at `de09f04891ee111bf0e59568416ff695b089dd42` failed only the Page asset equality witness: plain 2899 passed, 1 failed and 1 skipped; Native was unreached. That gate remains exit 1. The maintained pure pageAssets() generator then ran at that unchanged source; its retained output was reviewed and adopted only as apps/room/page/assets.ts, SHA-256 `b112fb580801837fabc920d8e7d04f5b8c7cc6688a2e735176afeb9d440f7d37`. This necessary generated-source change was committed before the focused asset witness and a new ordinary gate-final at the final tested checkpoint. This is a separate corrected-source gate, with no limited follow-up exception claimed.

The pure address and bearer witnesses cover separate local clients, equivalent aliases and zones, routable /64 sharing, mapped IPv4 and the shared invalid bucket. Native witnesses exercise joins and actual hosted bearer responses. Root reviews every terminal output, including each focused fault control; the table records actual results without turning an expected mutant assertion into a production failure.

The Mac validation report’s V4.7 remains historical evidence: Caddy overwrote the tested forged address headers, while direct celld preserved a forged value. This head changes no trusted-address forwarding, proxy configuration or public-origin policy. No new Caddy, celld, browser, device, provider or hosted-deployment run is claimed. No credentials, tokens or unredacted request bodies are retained.

One evidence table follows. Command rows use actual terminal receipts. The source predicate is an internal comparison with no invented exit or duration. Analysis reconstructs the unchanged maintained summary in memory without rerunning tests or inventing an observed summary.json.

| Check and checkpoint | Actual argv | Exit | Wall s | Child CPU s | Output SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| source-seals (`f4898e7e7b5b7bcabf174768f6b8440e449ffcec`) | `node --input-type=module -e 'import { sourceSeal } from "./scripts/security-entry-points.mjs"; const files = ["packages/bytes/src/address.ts", "packages/scope/src/limits.ts", "packages/mcp/src/hosted.ts"]; console.log(JSON.stringify(Object.fromEntries(files.map(file => [file, sourceSeal(file)])), null, 2));'` | 0 | 0.300 | 0.156 | `2ce08c3efe72ee095f5ad03141e8c44fbec7c9635a8012be1afe1244e8c5fa09` |
| source-seals-barrel (`f4898e7e7b5b7bcabf174768f6b8440e449ffcec`) | `node --input-type=module -e 'import { sourceSeal } from "./scripts/security-entry-points.mjs"; console.log(JSON.stringify({ "packages/bytes/src/index.ts": sourceSeal("packages/bytes/src/index.ts") }, null, 2));'` | 0 | 0.100 | 0.125 | `d959d33b235d1c8a64567b83f08e8ee009d37a9c0ff1762c8c04395154bea083` |
| compat (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node scripts/cloudflare-pool-compat.mjs` | 0 | 0.080 | 0.072 | `9a6d91467b8a7b79df681eaf1bf88f7a2cc7465ddcc665004f7b873f9089a993` |
| shared-helpers (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node scripts/check-shared-helpers.mjs` | 0 | 0.419 | 0.529 | `abfcb617d848b274ce0467ab4d655b38bc98f2a954058a014d91c5609505417e` |
| owning-node (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node --test scripts/check-shared-helpers.test.mjs scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | 0 | 48.973 | 58.899 | `8b9f127b68a419eb8425b3a82e8f0e302221f533cccda325803a4bcd6386d805` |
| compile-bytes (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node_modules/.bin/tsc -p packages/bytes/tsconfig.test.json` | 0 | 0.611 | 0.422 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| compile-mcp (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node_modules/.bin/tsc -p packages/mcp/tsconfig.test.json` | 0 | 0.386 | 1.717 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| compile-mcp-native (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node_modules/.bin/tsc -p packages/mcp/tsconfig.scope.json` | 0 | 0.438 | 2.209 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| compile-scope (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node_modules/.bin/tsc -p packages/scope/tsconfig.test.json` | 0 | 0.656 | 3.533 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| classifier-control (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node scripts/control.mjs packages/bytes/src/address.ts 'const first = all[0]!;' 'const first = 0;' --expect 'local range ends' -- packages/bytes test/address.test.ts` | 0 | 1.309 | 1.208 | `5f2a0f117c04d8d3c48e22b9e94ce67f1fc58542da4e7c1b756aaf9265200537` |
| bearer-control (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node scripts/control.mjs packages/mcp/src/hosted.ts 'const key = addressKey(address) ?? "";' 'const key = raw;' --expect 'share link-local aliases' -- packages/mcp test/hosted-failures.test.ts` | 0 | 2.093 | 2.864 | `0deb94427dd7cf9b5e8f15e3de7bd38080d87b4f3e895940614989a69490578a` |
| owning-native (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node_modules/.bin/vitest run --project scope packages/scope/test/limits.test.ts packages/mcp/test/hosted.scope.test.ts --reporter=verbose --reporter=json --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-10-28-lan-address-keys/owning-native/vitest.json` | 0 | 101.305 | 105.233 | `8c7489495bfafd9dd61e541e5b8ce267710cc8b296b60d47707be6ca9e600bfd` |
| gate (`de09f04891ee111bf0e59568416ff695b089dd42`) | `npm run gate` | 1 | 147.453 | 389.863 | `d5d855c2a6087ba514d0f411406d93e473e34c331656fc72d3fac38f88808110` |
| page-assets-generation (`de09f04891ee111bf0e59568416ff695b089dd42`) | `node --input-type=module -e 'import { pageAssets } from "./apps/room/page/scripts/assets.mjs"; process.stdout.write(await pageAssets());'` | 0 | 0.113 | 0.078 | `b112fb580801837fabc920d8e7d04f5b8c7cc6688a2e735176afeb9d440f7d37` |
| owning-page-asset (`ea35a4d31a6c3dbbd2e1f9941c0cd6ce89c87c0b`) | `node_modules/.bin/vitest run --project page apps/room/page/test/assets.test.ts --reporter=verbose --reporter=json --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-10-28-lan-address-keys/owning-page-asset/vitest.json` | 0 | 0.689 | 1.115 | `11eabd2bc687645769b67e0e5d81c3c0ff8062ad5091067c61192ed2c68b319e` |
| gate-final (`ea35a4d31a6c3dbbd2e1f9941c0cd6ce89c87c0b`) | `npm run gate` | 0 | 896.183 | 1901.831 | `708ca0176227f95813b4fe5010eb76052baa9570d88024994219bb921f148114` |
| Actual cost analysis | `/Users/hughpyle/.pyenv/versions/3.14.5/bin/python3 /private/tmp/artroom-lan-address-keys-cost-analysis-20261028.py --plan /private/tmp/artroom-lan-address-keys-evidence-plan-20261028.json` | 0 | 0.580 | 0.546 | `1f77ea24c9d2ef699f0be144787de06752c25f28cad07e47ef5b0e1b56bf9bc8` |
| Full source predicate | Internal finalizer comparison; no separate child command | n/a | n/a | n/a | `6a2922a031dceb09892c1fda7c2d552a84e42f95e03908a70102702aba74a2c8` |

The [complete evidence manifest](evidence/2026-10-28-lan-address-keys.manifest.json) binds `/Users/hughpyle/play/artroom-evidence/2026-10-28-lan-address-keys`. Its SHA256SUMS indexes all payloads and excludes itself; the manifest includes that index. This collection is sealed after its final write and retained at least 30 days after landing. Actual finalizer termination and the final report-only checks are retained separately in a new report tail. Existing evidence collections are never written.

The gate took 896.183 wall s and 1901.831 child CPU s. The 16 declared commands sum to 1201.107 wall s and 2469.856 child CPU s. These are sums of separate commands, not elapsed edit-to-review time. Editing, collection, analysis and review are excluded from that sum; analysis costs appear separately above. The command window includes gaps or overlap. Machine: macOS-27.2-arm64-arm-64bit-Mach-O, arm64, 18 logical CPUs, Node v26.12.1; gate start load [1.77880859375, 2.62451171875, 2.3095703125]. Warm lock-verified dependency view; OS cache unmeasured; shared machine load uncontrolled.

Actual gate observations:

- node: 76 passed, 0 failed, 0 skipped and 0 todo case finals; 0 reconciled Vitest module finals. Missing case durations: 0.
- counting: 55 passed, 0 failed, 0 skipped and 0 todo case finals; 0 reconciled Vitest module finals. Missing case durations: 0.
- plain: 2900 passed, 0 failed, 1 skipped and 0 todo case finals; 286 reconciled Vitest module finals. Missing case durations: 1.
- native: 823 passed, 0 failed, 2 skipped and 0 todo case finals; 238 reconciled Vitest module finals. Missing case durations: 2.

Terminal completeness does not prove all incremental callbacks arrived. Missing durations and CPU remain unknown. Fixed-owner wall/CPU and rounded shell timings remain distinct. Concurrent case and Vitest test-and-hook module durations are not elapsed wall, CPU, physical drain or a causal performance result. Skipped/todo durations prove no execution. Public Node aggregates remain separate from Vitest modules.

Actual shell costs:

- citations: wall 5.760 s, user 5.780 s, system 0.260 s; exit 0.
- cite-test: wall 0.350 s, user 0.280 s, system 0.080 s; exit 0.
- commit-messages: wall 0.120 s, user 0.080 s, system 0.020 s; exit 0.
- commit-test: wall 0.690 s, user 0.430 s, system 0.210 s; exit 0.
- doc-links: wall 0.090 s, user 0.080 s, system 0.010 s; exit 0.
- helpers: wall 0.410 s, user 0.450 s, system 0.060 s; exit 0.
- notes: wall 0.100 s, user 0.070 s, system 0.020 s; exit 0.
- test: wall 877.160 s, user 1642.030 s, system 210.960 s; exit 0.
- typecheck: wall 10.050 s, user 35.000 s, system 4.530 s; exit 0.
- whitespace: wall 0.020 s, user 0.010 s, system 0.010 s; exit 0.

Slowest observed cases (concurrent duration; skipped/todo proves no execution):

- scope: packages/scope/test/archive-one-entry-scale.test.ts — the Native driver confirms 10,001 one-entry passes and preserves retained rule inputs from pass 3700: 214.496 s, passed.
- scope: packages/scope/test/floor-archive.test.ts — Native alarm writer advances a30000-entry journal in five bounded floors then waits for a1000-position target rise: 208.465 s, passed.
- scope: apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts — native initially full Root completes one thousand successful partition births and cap-limited seals: 137.144 s, passed.
- scope: packages/mcp/test/hosted.scope.test.ts — H6 matrix through the endpoint: prepared reset, concurrent send and settle, 255 unresolved, archived refusal and replay, repeated uncertain attempts, a full create: 84.489 s, passed.
- scope: packages/scope/test/archive-cadence.test.ts — Native archive alarms clear three daily windows of4800entries without a backlog: 74.783 s, passed.
- scope: apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts — G15 admits the maximum constructed capture, retains 32 real proofs, and refuses the next capture before storing passes: 67.663 s, passed.
- scope: packages/scope/test/floor-archive.test.ts — Native archive floors reclaim an exact2000-entry ceiling while10000 real inputs continue: 62.729 s, passed.
- node: scripts/security-settings.test.mjs — the real Worker source inventory rejects an undocumented setting read: 43.839 s, passed.
- scope: packages/scope/test/archive-installed.test.ts — installed Grow production public archive command verifies its native producer clone: 30.820 s, passed.
- scope: packages/scope/test/application-sandbox.test.ts — sandbox late headers retain bounded cleanup in the context until the exact exchange is released: 30.002 s, passed.

Analysis retains all final and original failed-gate project sums, phase completeness, failed case identity and top Vitest modules; the final gate has 66 unknown/suite observations excluded from case rankings. No performance improvement is inferred.

Open limits:

- Exact-head checker review and landing remain due. Owner: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:7ee9a63b9f585b4c1562ab729b25a1f3185d7acc`.
- The local Native witnesses do not repeat the historical Mac proxy validation or prove a deployed LAN rollout. Live proxy, device and operational observations remain separate. Owner: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:e6a5cd22edcd07877948d737fa80c33c1f7c7e8e`.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:7ee9a63b9f585b4c1562ab729b25a1f3185d7acc`
Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:a2d7366f1140c8fb86178f5cc77e1344f68ec87f`
