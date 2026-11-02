# Serve hosted MCP as an OAuth resource

## What changed

O1 adds connector resource discovery and grant access tokens beside the static bearer. A token for `/mcp?connector=claude` serves that exact connector. Using it at `/mcp?connector=chatgpt` returns `401`. Missing credentials receive a challenge with `resource_metadata` and scope `mcp`. Each configured connector has a protected-resource metadata URL that keeps its exact query.

`MCP_RESOURCE_URLS` accepts at most eight distinct canonical HTTPS `/mcp` URLs. Each URL has at most 2048 UTF-8 bytes, and the setting has at most 32800 bytes. The default uses the public service origin plus `/mcp`. Existing HTTP deployments retain static bearers and advertise no OAuth resource. Every configured card URL must occur in the resource list. Invalid configuration closes hosted admission before body reads or namespace lookup.

A grant access token has three parts: agent, grant, and secret. The agent object checks its durable row, digest, expiry, live state, and exact public request URL before reading Native authority. The operator's public origin determines the audience behind a proxy. Forwarding headers do not select it. Native standing must show an active agent, key, and controller, with the controller matching the grant.

Each grant owns its transport sessions. Static rotation preserves OAuth sessions; retirement ends every grant and transport. The agent shares four stream slots, sixteen retained sessions, and its existing control budget across credentials. Eight in-memory grant transport layers bound retained transport work. O3 will own production grant issuance and its live-grant limit. This head adds no issuer route, consent page, client registration, code exchange, refresh, or OAuth revocation endpoint.

## Decisions and evidence limits

The standing cache measures its 60 seconds from the start of a Native read. The object rechecks durable rows, expiry, agent identity, and clock bounds after awaits. Proven inactive standing ends the grant. Unavailable authority refuses the call without inventing permanent revocation. Native scopes retain their existing authority and observation windows.

Open streams refresh standing before the prior lease ends. A separate deadline remains armed while the read awaits, so a late answer cannot extend the prior lease. Access expiry also closes existing streams. The direct transport witness checks body cancellation and a held standing read. It uses production transport and real SQLite with scripted authority answers and time.

The routed O1 witness uses the real Worker, registry, agent object, Membership authority, and Native invitation and enrollment. Its issuer writes grant digests directly through test SQL. Its Git host, clock, and expiry scheduler remain explicit fixtures. The test covers both connector metadata URLs, unknown metadata queries, wrong audiences and secrets, address failures, expiry, retirement, controller removal after consent, Native key revocation, session separation, static rotation, and aggregate stream and session limits.

Runs 25 and 26 did not observe body cancellation finish at the cross-object fixture barrier, including the static transport. They establish neither a deployed cancellation fault nor its cause. The routed fixture uses authenticated DELETE for teardown and verifies that its timers end. The separate direct transport witness proves its local cancellation hook. No live Cloudflare host or connector UI runs here.

Six focused checks failed during development. Run 06 found an exact-optional fixture compiler error. Run 21 tried to add a person through the agent-only add step. Runs 25 and 26 retain the cancellation observation above. Run 28 invoked an expiry callback outside its owning Durable Object. Run 31 expected metadata to remain available when hosted MCP was disabled. Subsequent records retain each correction or qualified follow-up. No failed check became a passing gate claim.

Runs 35 and 36 distinguish the audience and standing rules. Removing the audience comparison returned a candidate where the test required null. Accepting a removed controller returned true where the standing-bound test required false. Both controls restored the original production source.

## Final evidence

The frozen gate ran at `1ca60fee5d8bebc2876ae1cb184061466ca28540`, tree `55bb1505488601f629d9fce3a540b1ba84010297`. I read `gate.exit`: `exit 0`. The wrapper's before and after commit, tree, and clean status match. The run took 1255.351 seconds of outer elapsed time on Hugh's Mac while separate O2 focused checks ran. That duration is not CPU time.

The runner reports 132 Node cases, 56 Counting cases, 3582 plain passes and one skip, and 1044 Native passes and two skips. Native files: 275 passed and one skipped. Every gate stage passed. Native duration coverage in the observation reporter remains partial; its unknown and suite observations stay distinct from runner totals.

The [focused manifest](evidence/2026-11-02-oauth-resource-focused.manifest.json) records 75 read-only files under `~/play/artroom-evidence/2026-11-02-oauth-resource-focused`. Its SHA-256 is `2e5f51911419a40997470aa7c44d62b783dc5a74e722e58cae048c2a1321fcf3`. Its SHA256SUMS digest is `f5d93f05f4ed8243f90333713f690fa6b1c4d5208de8d5d5e439b62e2d39e05a`. Each incremental run records its actual checkpoint and dirty status. The final gate supplies the final-source result.

The [gate manifest](evidence/2026-11-02-oauth-resource-gate.manifest.json) records nine read-only files under `~/play/artroom-evidence/2026-11-02-oauth-resource-gate`. Its SHA-256 is `ca2ebaf311834ca338eb94a076617c69653a45b5d78805d8e9635111c15a1faa`. Its SHA256SUMS digest is `af350e3915d03f73c284f9a0efa43ce68b06d67ef95b0a052137d383d34f92fd`. The complete stdout, stderr, and 27 internal stage logs and raw reports remain private with hashes because fixtures can print credentials. The public run records below name those private outputs and their full SHA-256 digests.

Run-record digests name the JSON evidence files, not a test count or a raw-output digest. Their `privateRaw` fields name the latter. The commands and exits below come from those records.

| Check | Command | Exit | Run record SHA-256 |
|---|---|---|---|
| 01-url-policy | `node node_modules/vitest/vitest.mjs run --project mcp packages/mcp/test/oauth-resource.test.ts --reporter=verbose` | 0 | `411b5421020a198f9870ec448e474207bfe0a4ed120a93633cadd1446f3c2276` |
| 02-mcp-types | `node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.json --noEmit` | 0 | `af7cbfbc830de02deca203db02412af415ed81458e069a4b6279fc1164cc9bd2` |
| 03-mcp-test-types | `node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.test.json --noEmit` | 0 | `8e7290abc0553aef51853ed85b4388bfd7c1cb421f7a4545d562dc55c46b6e20` |
| 04-discovery-source-types | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json --noEmit` | 0 | `36f81e553229b16f279f1b846c66c7f897eb638a8f08952de5b628c7eb779afd` |
| 05-discovery-policy | `node node_modules/vitest/vitest.mjs run --project mcp packages/mcp/test/oauth-resource.test.ts packages/mcp/test/hosted-tools.test.ts --reporter=verbose` | 0 | `a50d162bf75935d6234b4e79c243e06f8ab7579c70fe9b73d48784659aa47b96` |
| 06-discovery-test-types | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 1 | `d1ee9e59be6180fa550cc6dcc9f4931ceec2480c18b1e4a788eb2cd47d5dc6f2` |
| 07-native-discovery | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/hosted-opt-in.test.ts --reporter=verbose` | 0 | `e738f76bcd6aa3fcff75204c71f40aadb081a3de6c95b573c44307768044d092` |
| 08-discovery-test-types | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `0f59fb393ca0c57ae33908feb9621662e9f38e87689c1d2b476946cc7aaffb3e` |
| 09-native-discovery | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/hosted-opt-in.test.ts --reporter=verbose` | 0 | `5bb2410bb75784ce2087d30ebbb5bdb73188cb61473cb0ef960efc75c103abb7` |
| 10-proxy-types | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `b07ca2ac0eaa8adc93bf4e0187cd1e8792daf0966c408659c4a207fd7d89e1a3` |
| 11-proxy-discovery | `node node_modules/vitest/vitest.mjs run --project scope packages/scope/test/hosted-opt-in.test.ts --reporter=verbose` | 0 | `2571498933faa876aeff4d94ba7265d4a8bfc8d89a9bbfbe77ae6399858074ab` |
| 12-access-source-compiler | `node_modules/.bin/tsc -p packages/mcp/tsconfig.json --noEmit` | 0 | `5ce13e5e4d6c607cc7a4d3ac38e887c00d6081fe3d14d475fdd3af69cc4f3346` |
| 13-access-test-compiler | `node_modules/.bin/tsc -p packages/mcp/tsconfig.test.json --noEmit` | 0 | `1af005769753c6f24134576dac87881643d40bde7262c024e4db7e9dcfdfa818` |
| 14-access-native-compiler | `node_modules/.bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `0b604d81d3d1dd217afd4237cbeecffaed28859c205526a338ed11b478f0fb6a` |
| 15-access-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/oauth-access.scope.test.ts --reporter=verbose` | 0 | `8d1212a2e96a0fec6dda74c3672093c5759ee70167cf79d76291abaefa75e8c4` |
| 16-access-http-source-compiler | `node_modules/.bin/tsc -p packages/mcp/tsconfig.json --noEmit` | 0 | `4402a42b7599a37ee84bd6aef43d98628b275e7d7fb47095ace9f1313290e1c7` |
| 17-access-http-native-compiler | `node_modules/.bin/tsc -p packages/scope/tsconfig.test.json --noEmit` | 0 | `e5255fd8b0d23042e09ddf92b4bc23dad6d11c5f7f326fa4f1cef1f1eb805df4` |
| 18-access-owning-native-compiler | `node_modules/.bin/tsc -p packages/mcp/tsconfig.scope.json --noEmit` | 0 | `b73eb2b0c0ddfd163fdfa5647ba85695da09b49c492bb22133cd5f249bfb58d3` |
| 19-http-compatibility | `node node_modules/vitest/vitest.mjs run --project mcp packages/mcp/test/http.test.ts packages/mcp/test/http-idle.test.ts --reporter=verbose` | 0 | `2db3e595e4b87d3962a7f96f10e0b89b5ce8a8c23f64af298266ee6da7868eee` |
| 20-access-route-test-compiler | `node_modules/.bin/tsc -p packages/mcp/tsconfig.scope.json --noEmit` | 0 | `58d3725866a90d2cfdc6d38317c67d8957fdb4a0ad8787be683ab36e1f3542df` |
| 21-access-route-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts -t 'O1 test-issued' --reporter=verbose` | 1 | `0cee72b19a04c2f31fed868495d53b8ffde002de01d0deb98bd4509f94a790ba` |
| 22-access-route-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts -t 'O1 test-issued' --reporter=verbose` | 0 | `c8e2d8104def980ce45b276fb6c85481baa2d589dc3407d1cba0806eb85e83ea` |
| 23-access-session-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts -t 'O1 test-issued' --reporter=verbose` | 0 | `dc7839f9be8614cade22aee10b86a9148bd31143960e7440ca7f9b2fd078253e` |
| 24-access-timers-compiler | `node_modules/.bin/tsc -p packages/mcp/tsconfig.scope.json --noEmit` | 0 | `de943fc3eb8b7b89b1ac591c262fe960ef632891e7e8f76b5e707640e6b8a8b5` |
| 25-access-timers-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts -t 'O1 test-issued' --reporter=verbose` | 1 | `4804944027c2299f2bc3359c386b5cd7cbfa8ffb82c6ac71ec997810b20804e9` |
| 26-access-timers-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts -t 'O1 test-issued' --reporter=verbose` | 1 | `9d6c1b1521ec5cb7a69144b46153e0a0fa7e6bb97d6d5dacb0f27584f75fb42c` |
| 27-access-components-compiler | `node_modules/.bin/tsc -p packages/mcp/tsconfig.scope.json --noEmit` | 0 | `4647170caaae196a4abb7dc485e3dc34d96fa65644d679991eecf4536da98806` |
| 28-access-components-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/oauth-http.scope.test.ts packages/mcp/test/hosted.scope.test.ts -t 'grant stream cancellation\|O1 test-issued' --reporter=verbose` | 1 | `4b90685d7cd6f528c5d881fa951576f70fa922cbb6073acf60d88b99db1f3523` |
| 29-access-owned-timers-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts -t 'O1 test-issued' --reporter=verbose` | 0 | `896ec1620a92cc893523a1dd49a4e625150b1b92d21c44fae559f8e6dcc124e7` |
| 30-hosted-owning-native | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts packages/mcp/test/oauth-access.scope.test.ts packages/mcp/test/oauth-http.scope.test.ts packages/scope/test/hosted-cards.test.ts --reporter=verbose` | 0 | `4895d60fb2f4253c3bb540c913be69514af0f34b7d93d20f7f24d85ec5e8ce13` |
| 31-security-inventories | `node --test scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | 1 | `56938e2cd621a132d7854728d69cec9a1aab4b67ac309d88a2b896036009e6e9` |
| 32-security-entry-points | `node --test scripts/security-entry-points.test.mjs` | 0 | `51790a131130ce3080cee1dca06fc56cc905568c80e01d1b086fa780731787b2` |
| 33-o1-native-compiler | `node node_modules/typescript/bin/tsc -p packages/mcp/tsconfig.scope.json --noEmit` | 0 | `1bcc681b5b955bcbaca3784a2136646027ed7592f58f30748faae74ae1af4906` |
| 34-o1-native-controls | `node node_modules/vitest/vitest.mjs run --project scope packages/mcp/test/hosted.scope.test.ts -t 'O1 test-issued' --reporter=verbose` | 0 | `c174de4cc49591e1a7ed527d5cf7229fa5cede57d951d400ddb179b639a53cda` |
| 35-audience-control | `node scripts/control.mjs packages/mcp/src/oauth-access.ts '\|\| grant.resource !== resource' '' --expect 'wrong connector' -- . --project scope packages/mcp/test/oauth-access.scope.test.ts` | 0 | `a600a9a19f728d70add31d7bb39f5166793109f5934ec98f6dfb104d4996a506` |
| 36-standing-control | `node scripts/control.mjs packages/mcp/src/oauth-access.ts 'return controller.memberState === "active" ? "active" : "inactive";' 'return "active";' --expect 'removed controller' -- . --project scope packages/mcp/test/oauth-access.scope.test.ts` | 0 | `15458aa0812e03bf9b51190041d326f0b00698a14bb3395814abe052112f2d9b` |
| Frozen gate | `npm run gate` | 0 | `adafc4dadc61fcaa4dff459261630274e73f883d285e140d06061120a37e35ad` |

This implementation note and the manifests follow the gate as documentation only. The review names the filed commit and tree and confirms unchanged production source, tests, dependencies, and configuration against the frozen checkpoint, under [the follow-up rule](../../docs/testing.md#follow-up-after-a-gate).

## Open limits

O1 request `a8f28a37b39444cffa6335c8fc8c1937728c9d88` owns this resource-server slice and its review. It authorizes a test-only issuer and requires hosted MCP to remain closed on deployed Workers. The implementation supplies no deployed OAuth acceptance. The planner will open the separate O3 and O4 work described in the [reviewed design](../2026-11-02-hosted-mcp-oauth.md) after O1 and O2 request `28b5cd84ce9a1ab2cd73a32292ff12d327ff4a5b` land. O2 owns ordinary members creating controlled agents. This head grants no new membership action.
