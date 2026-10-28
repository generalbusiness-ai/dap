# H1: local celld project and public service origin

This implements request `99918e60` and amendment `8a50aa07`, after G1
landed at `248edb41`. The local project reexports the production room Worker,
keeps its four Durable Object bindings and three migration tags, and pins
celld `v0.6.2`. Its smoke uses the production CLI and actual host-none scopes.

## Decisions

`readPublicOrigin` is the only reader of the new nonsecret `PUBLIC_ORIGIN`
setting. An unset value retains the original request URL origin. A supplied
value must already be an exact canonical origin, at most 2048 ASCII bytes:
HTTPS or invitation-policy loopback HTTP. Invalid configuration fails closed.
Forwarded headers supply no identity. A differing transport Host does not
override the configured public origin.

The accessor supplies hosted registry creation, application deployment
defaults and context, sandbox descriptor checks, and demo origin checks.
An explicit `DEPLOYMENT` retains precedence. The sandbox gateway first binds
the effective origin to its trusted descriptor, then checks the unchanged
transport URL through the existing finite path and method matcher. It does
not rewrite the stored descriptor, Request, path or query.

Hosted MCP already calls the scope API in process. `ScopeService` remains for
its existing binding and test callers in this head. The registry and agent
still compare the signed service identity and retain their authority,
signature, body, deadline, address, rotation and retirement checks. No native
definition, wire representation, kernel bound or historical pin changes.

The local configuration omits Cloudflare-only configuration keys, repository
providers and package content storage. Secrets and CLI custody stay private.
The smoke requires a retained plan, marks a run before sending acts and
refuses replacement runs after success or uncertainty. CI calls the same
kept proxy driver against the pinned release with an attestation check.

The settings inventory includes JSON configurations and recognizes only an
exact tracked two-export shim as sharing the permanent Worker identity.
Physical entry matching and the full runtime environment closure remain.
Source seals cover the changed gate owners and the shared origin accessor.

## Evidence


Repair checkpoint: `27be0284ecf780463d79a5504f1730e4c547a9d3`, tree `d0f356a65af462f85e5b8261957b1a91b54f2ddc`. Both actual follow-ups used this source. The report head adds only `notes/implementation/2026-10-27-celld-public-origin.md` and `notes/implementation/evidence/2026-10-27-celld-public-origin.manifest.json`. Every other tracked byte and mode remains the repair source.

The actual proxy ran at `7985f0fcd6ebe8ea67194e1ff5ea48a1e4580019`, tree `4c74a62283c2741646453fde419e8d7e2423c347`. Only `docs/testing.md`, the isolated health-test deadline repair and this note differ before the repair checkpoint. Production runtime, scripts, configurations, dependencies and shared helpers remain identical.

Each row below keeps the actual terminal exit. Earlier failures remain failures. The table names exact raw output digests; the manifest binds every retained file. Draft generation receipts have a distinct, qualified schema and are not test results.

| Check and checkpoint | Actual command | Exit | Wall s | Child CPU s | Output SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| types-mcp (`e44e38f0944d`) | `node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.json` | 0 | 0.520 | 0.948 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| types-scope (`e44e38f0944d`) | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json` | 0 | 0.344 | 1.390 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| node-owning (`e44e38f0944d`) | `node --test scripts/security-settings.test.mjs scripts/security-entry-points.test.mjs scripts/celld-smoke.test.mjs scripts/test.test.mjs` | 1 | 48.849 | 60.504 | `84ed354e8ed047df4ba7d6b03e4e31f8cab8aa4e14baccb5285637dfe8c1352d` |
| celld-version (`e44e38f0944d`) | `/private/tmp/artroom-h1-tools-20261027/celld --version` | 0 | 0.398 | 0.011 | `7785aa3ac035f9728b7cd35da00414c0621ec62a40f8fcc33408b193222859dd` |
| runtime-acquisition (`e44e38f0944d`) | `python3 /private/tmp/artroom-h1-download-runtime-20261027.py` | 0 | 5.973 | 0.495 | `158b4c709e6a8be694d619ced8b07081fa0e5c01a12130ace388ba7a8368ab1f` |
| pool-preparation (`657b5ea50350`) | `node scripts/cloudflare-pool-compat.mjs` | 0 | 0.080 | 0.073 | `79c19badcc6b392848c543afede7597826342cc6e60e9dd0e26f849291823cff` |
| node-inventory-repair (`657b5ea50350`) | `node --test scripts/security-entry-points.test.mjs` | 1 | 2.017 | 2.523 | `65b5df6a60017deb8c3ea696f4facd2786a1cc26325534fa43a3b4e28bbe1faa` |
| native-owning (`657b5ea50350`) | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/public-origin.test.ts packages/scope/test/hosted-opt-in.test.ts packages/scope/test/application-host-route.test.ts packages/scope/test/application-sandbox.test.ts packages/scope/test/demo-creation.test.ts packages/scope/test/health.test.ts packages/mcp/test/hosted.scope.test.ts` | 1 | 97.819 | 104.227 | `703fe9e69c53a57283f238464c0d39d06eab3677034de45014c7205778b4e3de` |
| celld-proxy (`657b5ea50350`) | `node scripts/test-celld-proxy.mjs` | 1 | 5.343 | 2.778 | `f018c3f73f9a1ba4b3db912a701cdd0d93d9bb307b896b354054521dd11e42f4` |
| celld-proxy-repair (`3c48b87a5303`) | `node scripts/test-celld-proxy.mjs` | 1 | 7.262 | 3.309 | `eb6b24fdf1e5d7369b52b81c80cda85618fa7109e87d24d92e0c4503ff2d42b8` |
| node-inventory-final (`3c48b87a5303`) | `node --test scripts/security-entry-points.test.mjs` | 0 | 2.217 | 2.781 | `dd3db4b11979ad9130a597bfb2a447d089f33bcf7db824b55ceb9c070bd108fc` |
| native-route-repair (`3c48b87a5303`) | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/application-host-route.test.ts` | 0 | 4.812 | 6.150 | `ad45422252b578d175d2e5f3d635f375e50d35e4bd534a9c46065a8b2264fe7c` |
| celld-proxy-diagnostic (`88798d4b4eb4`) | `node scripts/test-celld-proxy.mjs` | 1 | 7.068 | 3.122 | `e81985a289718a1b748d75cbb3ffd73adb0c093e7a75cc2bfbcd210139458090` |
| celld-proxy-readiness (`7985f0fcd6eb`) | `node scripts/test-celld-proxy.mjs` | 0 | 8.640 | 5.008 | `b3d307b6154508d0b1bfcef7ead909525d33e1f6fe3ce9c485050460fea3297a` |
| gate (`ef2f4bea103d`) | `npm run gate` | 1 | 1147.440 | 2325.972 | `d7006b18a1598c2f2e804240e83a896337dcad45e409940da8af05f370e289a1` |
| types-health-followup (`27be0284ecf7`) | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json` | 0 | 0.322 | 1.281 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| health-clock-followup (`27be0284ecf7`) | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/health.test.ts --reporter default --reporter json --outputFile /Users/hughpyle/play/artroom-evidence/2026-10-27-celld-public-origin/health-clock-followup/vitest.json` | 0 | 4.329 | 5.504 | `a9facadd0ea56ecee88e6f303f89483c47bb4f2ac73a843744d5dc5490ceab0c` |
| preparation/inventory-generation (`draft`) | `Qualified draft generation; argv was not recorded in this receipt` | 1 | 0.227 | 0.123 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| preparation/inventory-generation-repair (`draft`) | `Qualified draft generation; argv was not recorded in this receipt` | 0 | 0.544 | 0.206 | `2d6ece9c153ab7d1f7c2cbfd3b3b778958baa6e650624784693715351f4ec6bc` |
| Read-only reporting analysis v2 (not a test) | `python3 /private/tmp/artroom-h1-limited-cost-analysis-v2-20261027.py` | 1 | 0.399 | 0.392 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `7c4f3f6894d106221ef8c5b578bbdf1caf2326001fe5b45cbd088d9b739d0493` |
| Pre-seal report assembly (not a test) | `python3 /private/tmp/artroom-h1-limited-finalize-reviewed-20261027.py` | 1 | 1.311 | 1.302 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; stderr `a20ea279e4bae8d7d5155b16dd524e70c6f5cd7e6ddbe0cb5433443c1dc823d4` |

The gate at `ef2f4bea103d616a3d6e4744028e33fef1485513`, tree `14aee9aaea466ba21415a6cb28fdb35c8ad7b949`, remains FAILED (exit1). Kernel, Node, Counting and plain passed; Native has 821 passed, one failed and two skipped. All stages were reached; no stage needs an unreached continuation. The sole failure was the new host-none health case: its fixed START+60s genesis deadline could expire after the shared fixture clock advanced.

The only test repair adds the existing `timeOf` import and changes that one deadline to `timeOf(life.now() + 60_000)`. The same sixty-second duration, all five cases, assertions and test timeouts remain. The exact reconstructed diff is `finalization/limited-follow-up.patch`, SHA-256 `eb64d346a3c97d82b847aa56125348e054698079976bee2fe3e5fade01f0fabe`; it is a reconstruction, not a checker result. Scope compiler and the whole unchanged-case health file both exited0 at the repair checkpoint. The health JSON has five passed, zero failed and zero skipped. Under [the limited follow-up rule](../../docs/testing.md#follow-up-after-a-gate), no full gate was repeated. The checker must assess whether this isolated repair and evidence qualify; passing follow-ups do not convert the failed gate to a pass.

The pre-seal report assembly stopped because component-based path ordering differed from relative-path string ordering. Every indexed payload and digest matched; repository files were unchanged and no seal was applied. Its exact partial files, pre-seal index, source and terminal remain under assembly-failed-path-order. The corrected packer uses one path order throughout.

The read-only reporting analysis v2 expected two occurrences of an exact indented deadline line, but only one exists. Its actual failure, helper, stdout and stderr remain under preparation. The original correct helper then reconstructed the report successfully; this is reporting work, not another test or gate. Reporting-analysis costs are separate from execution-attempt totals below.

The failed draft generator could not resolve native packages through a flat symlink view. An independent APFS copy of the existing lock-stamped cache fixed it. The first owning Node run lacked the pure origin helper in its extractor; the next exposed an overlooked binding-type seal. The Native run had 37 passes and one invalid sandbox-host fixture. These narrow harness and fixture repairs preserve production gates.

The first proxy smoke omitted the joined guest inbox from its expected coverage. The next two stopped during agent invitation preparation, before any control response. Both signed issuance stages were receipted, but the child inbox was not yet verifiable. The final driver uses at most eight Checks of the exact original operation and complete private snapshot chain. Checks submit no replacement act or Continue. A verified private handoff releases only its own completed config pointer, retaining every opaque snapshot.

The existing local executable printed celld 0.6.3 and was rejected despite its version command exiting zero. The separate v0.6.2 release acquisition and attestation command exited zero. The actual smoke checks that pin and records binary SHA-256 `92ededd2bcfebeb1e78cc2d97219f00214a79eb6606f0eef48208fca3f98c15a`.

Actual TLS client → temporary proxy → internal HTTP celld → production Worker: configured signed creation 201, differing Host accepted, fresh unset and forwarded-only controls 403, wrong signed service 403. Two real MCP sessions initialize and call the room tool. Rotation and retirement answer 200. The CLI verifies all seven exact journals, and actual health reports sessions ok and register ready200. Both celld processes close with exit0 and no signal. Rotation status and a new-bearer tool call do not independently prove rejection of the old bearer.

The proxy counted 259 requests, 255 forwarded responses and 4 backend connection failures. This aggregate does not identify their phase. Startup polling permits temporary connection failures but only actual Worker readiness satisfies the smoke. Direct control sockets have idle timeouts and response byte caps, not a strict whole-body deadline. Invitation readiness checks have a between-check time guard, not a strict ten-second wall deadline. No interruption fault injection or production drain is claimed.

### Gate observations

| Phase | Passed cases | Failed | Skipped | Duration qualification |
| --- | ---: | ---: | ---: | --- |
| node | 73 | 0 | 0 | 0 missing case durations; reconciled observations |
| counting | 55 | 0 | 0 | 0 missing case durations; reconciled observations |
| plain | 2892 | 0 | 1 | 1 missing case durations; reconciled observations |
| native | 821 | 1 | 2 | 2 missing case durations; reconciled observations |

All four reporting phases reached terminal records. Native remains failed/partial; the other three reporting phases are complete. The failed gate has no unhandled, interruption or collection/report error. Reconstructed observations use the unchanged maintained `summarize()` over the actual stage ledger and four JSONL streams. Module durations are concurrent test-and-hook sums, not wall time, CPU or teardown proof. Skipped modules can have no duration. The analysis retains unknown identities and partial project sums.

| Gate step | Wall s | User s | System s | CPU s |
| --- | ---: | ---: | ---: | ---: |
| citations | 5.660 | 5.700 | 0.220 | 5.920 |
| cite-test | 0.340 | 0.280 | 0.070 | 0.350 |
| commit-messages | 0.100 | 0.070 | 0.020 | 0.090 |
| commit-test | 0.590 | 0.370 | 0.170 | 0.540 |
| doc-links | 0.090 | 0.090 | 0.010 | 0.100 |
| helpers | 0.400 | 0.450 | 0.050 | 0.500 |
| notes | 0.110 | 0.070 | 0.020 | 0.090 |
| test | 1128.810 | 2075.410 | 202.940 | 2278.350 |
| typecheck | 9.910 | 34.380 | 4.190 | 38.570 |
| whitespace | 0.010 | 0.000 | 0.010 | 0.010 |

The one failed gate took 1147.440 wall seconds and 2325.972 child CPU seconds. Across all retained development command and draft-generation attempts, summed wall time is 1344.204 seconds and child CPU is 2526.404 seconds. These sums include failed execution attempts, the two successful isolated follow-ups, drafting work and overlap. The separate failed reporting analysis took 0.399 wall seconds and 0.392 child CPU seconds and is not added to test-execution totals. They are not the elapsed edit-to-review window and exclude editing, collection, analysis and review.

Machine: `macOS-27.2-arm64-arm-64bit`, `arm64`, 18 logical CPUs, Node `v26.12.1`. Load at gate start: `[1.07763671875, 1.10400390625, 1.20166015625]`. The dependency cache was warm; OS cache was unmeasured and shared load uncontrolled. No checkout package installation or package metadata/lock change occurred.

| Slowest observed case | Seconds |
| --- | ---: |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/apps/room/lanes/test/directory-partition-success-capacity.scope.test.ts — native initially full Root completes one thousand successful partition births and cap-limited seals | 324.689 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/packages/scope/test/floor-archive.test.ts — Native alarm writer advances a30000-entry journal in five bounded floors then waits for a1000-position target rise | 251.892 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/packages/scope/test/archive-one-entry-scale.test.ts — the Native driver confirms 10,001 one-entry passes and preserves retained rule inputs from pass 3700 | 235.431 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/packages/scope/test/archive-cadence.test.ts — Native archive alarms clear three daily windows of4800entries without a backlog | 162.782 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/packages/mcp/test/hosted.scope.test.ts — H6 matrix through the endpoint: prepared reset, concurrent send and settle, 255 unresolved, archived refusal and replay, repeated uncertain attempts, a full create | 82.533 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/packages/scope/test/floor-archive.test.ts — Native archive floors reclaim an exact2000-entry ceiling while10000 real inputs continue | 80.546 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/apps/room/lanes/test/certified-rules-hardening-budget.scope.test.ts — G15 admits the maximum constructed capture, retains 32 real proofs, and refuses the next capture before storing passes | 69.508 |
| node: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/scripts/security-settings.test.mjs — the real Worker source inventory rejects an undocumented setting read | 43.490 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/apps/room/lanes/test/directory-partition-capacity.scope.test.ts — native full root preserves three thousand standing entries through one thousand undelivered generations | 41.340 |
| scope: /Users/hughpyle/play/artroom/.builder-worktrees/h1-celld-public-origin-20261027/apps/room/lanes/test/directory-partition-lanes.scope.test.ts — native raw proof residency stays at thirty-two dense frames with one physical read | 33.759 |

The analysis also retains the ten most expensive observed Vitest modules and all seventeen project sums. Missing durations remain unknown. All original assertions, five owning-file cases, sixty-second duration and production bounds remain unchanged; only the new deadline anchor and its import changed. The configured/unset actual proxy pair and existing finite negative witnesses are the targeted controls; no mutation sweep or unchanged whole-suite rerun was performed.

## Open limits

This is generated local TLS and actual celld/Worker evidence. H3 in the self-hosting design owns the production proxy, TLS profile, supervisor, drain and fleet kit. No deployed proxy, backup, second copy, fleet failover, physical device or global trust change is established. Private test custody, keys, invitation bodies, configuration secrets and child logs remain withheld from the public evidence directory.

The CI workflow is committed, but no remote CI execution is claimed. Its path filter covers the named Scope, MCP, room and smoke paths, not every future transitive dependency change. G1 runtime request `9976fbe6` separately owns the planner deployment handoff. R14 requests `db60a6f9` and `fe2305a2` own ScopeService and legacy demo retirement after H1.

## Retained evidence

[Manifest](evidence/2026-10-27-celld-public-origin.manifest.json): `91c45c48c3fdbac314cc6c3936ff4325bb36cb21aa5e8a2f5c10b6f79833ceff`. Directory `/Users/hughpyle/play/artroom-evidence/2026-10-27-celld-public-origin` holds 169 files. Index SHA-256: `3eb2b218dedb34b9e8dd04748e38290675ef186224e993457ff77828dd7e488e`. It is read-only after the last write and retained for at least thirty days after landing.
