# Close streams when HTTP reports a disconnect

## What changed

The direct scope route and application sandbox retain the existing stream close when the HTTP runtime reports a client disconnect. The request context keeps the release work alive through `waitUntil`. An abort that arrives while opening still triggers cleanup after the opening returns. Body cancellation, EOF and disconnect cleanup share the existing cached close promise.

Request `10200327d9d22d693c8b5ab1c8c1dcfdf1bf4bb3` and promise `414faa9888c7da844782808f16c551564c9be4f1` own this source child. Its scope is cleanup for a runtime-reported disconnect. **Chromium abort and active page close still leave subscriptions open in the local fixture.** This head does not close the original browser-cap obligation under `01e2c4c4`.

The Room dispatcher and generic scope entry forward their request contexts. The sandbox connects the incoming signal to its existing explicit Native stream lifetime. The helper also handles a signal that already aborted before the opening returned. Low-level HTTP callers of `route` supply the request context; direct body owners retain their reader cancellation path.

Eight maintained serving configurations opt into `enable_request_signal`: the root Room, Demo, Commons, Grow, Lending, local celld, and both sandbox configurations. Their compatibility dates stay fixed. The stream keeps its existing NDJSON body and 64-subscription cap. The source adds no Native act, read authority or HTTP close endpoint.

The route inventory maps `streamExchange` to the existing session gate class. Four Worker declaration seals, the Room dispatcher and sandbox seals follow the context forwarding and close wiring. A whole-file seal covers the new helper. The route matchers and their gate classes stay fixed.

## Decisions and boundaries

The fresh Native baseline separates the release mechanism from HTTP notification. Its direct reader-cancel control completes the actual release RPC. A TCP reset then reports one disconnect but never enters the relay cancel callback or another release RPC. The new hook closes that reported opening through the existing capability. The frozen production witness confirms one release after a complete head notice, with no Native head change.

Cloudflare requires the [request-signal flag for our compatibility date](https://developers.cloudflare.com/changelog/post/2025-05-22-handle-request-cancellation/). An [upstream workerd report](https://github.com/cloudflare/workerd/issues/6832) describes a matching response-pump cancellation defect. The local observations identify the missing callback boundary; they do not bisect the installed runtime or prove that upstream commit as its cause.

The browser exposes an earlier gap. Its fixture visibly reaches **Aborted**, but the local runtime supplies no disconnect signal. Closing another actively streaming page also supplies none during the count reads. A callback cannot react to a notification that never arrives. The TCP reset pass therefore does not establish browser cleanup. Request `ac0c3a70fbe473586eafa893a55a08554d1db748` asks the planner to name the remaining transport owner or a separate close-protocol design task.

The early-abort probe has a different oracle. Native releases the subscription before the held opening returns, without constructing a relay or sending another release RPC. The first probe wrongly requires that RPC and exits 1. A fresh count-based observer confirms cleanup and makes no explicit acknowledgement claim. Both records remain intact.

The initial focused test failed because it asked the fixture reader for the expected head inside required-session mode. The repair reads that expected head before entering the mode and always cancels its reader during cleanup. The initial compiler rejects an undefined optional signal; the test helper now supplies null. The first inventory run rejects the new dispatch name and untracked helper; the session-class mapping and tracked helper resolve those refusals. These failed checks remain separate from their passing follow-ups.

## Evidence

The frozen source checkpoint is `b6d8a38eae30a3b39cdc0b710c64b9c3b1715303`, tree `29ce1ab880d1920507ec0c888cfc38331f71a40b`. The production HTTP witnesses, Page workflow and full gate name that checkpoint. The focused commands ran during implementation on dirty source over `ecf59e05`; their manifest says so. All control subjects restore before the source freezes.

Four manifests hold 154 public files in read-only directories under `/Users/hughpyle/play/artroom-evidence/`:

- [Diagnostic evidence](evidence/2026-11-03-stream-http-close-diagnostics.manifest.json): 58 files.
- [Focused evidence](evidence/2026-11-03-stream-http-close-focused.manifest.json): 56 files.
- [Browser evidence](evidence/2026-11-03-stream-http-close-browser.manifest.json): 30 files, including five inspected fixture images.
- [Gate evidence](evidence/2026-11-03-stream-http-close-gate.manifest.json): 10 files.

Each manifest records full byte counts and SHA-256 hashes. Retain every unit for at least 30 days after landing. Private fixture homes, keys, session inputs, configurations, browser profiles and raw Native logs stay outside these units. The gate retains its 29 raw output files separately under `/Users/hughpyle/play/artroom-private-evidence/2026-11-03-stream-http-close-gate`, with its own checksum file. The public gate unit records their exact hashes. Named-pattern scans cover the selected public text; they do not claim every possible secret shape.

The gate passes 133 Node cases, 56 Counting cases, 3601 plain cases with one skip, and 1070 Native cases with two skips. Its terminal records report zero unhandled errors, failed cases, report errors or contradictory states. The Mac wrapper separately passes 13 Node and 17 Python child tests. **The sealed focused ledger's caption says 18 Python children; that caption is wrong.** The raw focused output and frozen gate both say 17. `gate/corrections.json` preserves the correction without changing the earlier seal.

The observed outer gate takes 1538.5436 seconds on this Mac with the verified dependency clone. Fresh local probes and scratch browser-tool work overlap part of that run. This wall time is not a performance comparison or a sum of case durations. The seven dependency roots and 32 internal links belong to the checkout; the unchanged lock stamp lets the gate skip installation.

| Check | Command or method | Result | Output SHA-256 |
|---|---|---|---|
| Native disconnect boundary | `node native-direct-signal/producer.mjs` | observer exit 0; direct cancel releases once; TCP reset reports one signal but no additional cancel or release RPC | `diagnostics/native-direct-signal/public-result.json`: `0f9c85c6fa5c7c88ee0f133f913b6938b1daaf4e355f47f1cfdbeb580be8be3f` |
| Proposed wiring control | `node native-proposed-close/producer.mjs` | exit 0; explicit close releases once; this diagnostic bypasses route guards | `diagnostics/native-proposed-close/public-result.json`: `9ffdd0c04b896b81646ee49acde85f7f4fd2130eb271f8ecf04676dc47841f12` |
| Initial focused owners | Vitest: routes, sessions and application-sandbox owners | exit 1; 18 pass, one new fixture assertion fails; retained | `focused/implementation/focused.json`: `2e1ece373110c99e44a0575c42d7669fb9b7229281ba20f024ba6e73f6bd23c4` |
| Focused assertion repair | Vitest: `--testNamePattern="HTTP.*disconnect"` on sessions and sandbox owners | exit 0; 3 selected cases pass; 12 cases filter out | `focused/implementation/focused-followup.json`: `85544ff130f651bd3117550b7d4aeaa363d501c3d7075b7b0fe5924fd464afd2` |
| Compiler follow-up | `tsc -p packages/scope/tsconfig.test.json`; `tsc -p apps/sandbox/tsconfig.json` | both exit 0; the initial optional-signal type error stays recorded | `focused/validation-ledger.json`: `3fdedb93ce168531790d05c750b277210133c4e49058437180ebade59d909cce` |
| Route and settings inventory | `node --test scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | follow-up exit 0; 14 pass; initial classifier and untracked-file refusals stay recorded | `focused/implementation/node-owners-followup.stdout`: `9043266d31fa5df5d5f41c10bc7c9e1b4902f1bd9c93d5fec0786db976fd2446` |
| Direct-route control | Maintained `scripts/control.mjs`; omit the route disconnect hook | exit 0 distinguishes; baseline 1 pass, changed source has one intended assertion failure | `focused/implementation/control-native.stderr`: `5e10c5d8d15a2f816b3f24db43b6b759c265a09914b0ef0619d41c3806e997fc` |
| Opening-race control | Maintained helper; omit the already-aborted check | exit 0 distinguishes; baseline 2 pass, changed source has one pass and one intended assertion failure | `focused/implementation/control-opening.stderr`: `4cb947ec9b09f10f3fc730ceacfedbb6e7c950355089f2b3ea060260a944c314` |
| Sandbox control | Maintained helper; omit the sandbox disconnect hook | exit 0 distinguishes; baseline 2 pass, changed source has two intended assertion failures | `focused/implementation/control-sandbox.stderr`: `4c91d1fdc0f8bc57350aa31bac37023d4da97e19afe7d90fbffc73a83ab2538f` |
| Frozen production TCP reset | Retained `production-after-head/producer.mjs`, exact checkpoint, fresh private directory | exit 0; complete 98-byte head, one signal, one actual release RPC; Native open 0 and head unchanged | `focused/production-after-head/public-result.json`: `5ac0411e4fd1dabc48d724dc3c47d4eac6a8bd5db7a9f13fae7a260558ff6366` |
| Initial early-abort probe | Retained `early-abort-wrong-rpc-oracle/producer.mjs` | exit 1; the probe wrongly requires an RPC for an opening that never returns; Native counts already show cleanup | `focused/early-abort-wrong-rpc-oracle/public-result.json`: `bb7b3bf6a391596cd57f1cd0ecff6753ffd36d2f25d784195dc460601101eb28` |
| Early-abort Native count | Retained `early-abort-native-count/producer.mjs` | exit 0; Native open 0; no delivered relay or extra release RPC; no explicit acknowledgement claim | `focused/early-abort-native-count/public-result.json`: `6d7357d62b2ab7dc7c5cb23dcc4d0acc259a65cac80fa5ebf44e6ef1d12c2f73` |
| Chromium abort | Fresh pinned browser; receive a head, then click **Abort stream** | exit 1; UI says Aborted, but Native open remains 1 and no disconnect signal arrives | `browser/abort-witness-failed/public-result.json`: `077ca2b8694df882a51546b4178ecec695abe6f50b05518387e8c12e2cda83aa` |
| Active page close | Fresh observer; abort one stream, then close a second actively streaming page | observer exit 0; both cleanup flags false; Native open remains 2 with no disconnect signal | `browser/abort-and-active-page-close/public-result.json`: `883e44162839dac0eed16591494c04e1099df3fb1fbad36af641bf2ad690176f` |
| Browser UI checks | 1280 × 800 fixture; DOM checks, console capture and five image inspections | fixture identity and interaction pass; zero console errors; no product Page or responsive-layout claim | `browser/qa.json`: `09de8a6bea3d3ac7fb88eeba0c5de08dd551d496526503a7895919aba8b2e9f6` |
| Page workflow | [Page run 41669368956](https://github.com/generalbusiness-ai/dap/actions/runs/41669368956) | success at the exact frozen source checkpoint | `focused/page-ci.json`: `71d55ab233b4df64a18b9095fdeb03b16e442a837f1b25f2bb844ed11dd066ce` |
| Full gate | `npm run gate`, through the retained driver | actual gate.exit 0; all five stages pass and all four reporting phases complete | `gate/terminal-summary.json`: `a1ad1e58a13a8409ebf2bee69be35b328c757ba48bca91f090527dc05274d0aa` |
| Historical hosted limit | Read and hash-check four existing sealed public files | earlier BodyTimeoutError is observed; later exact cause remains unknown because its recorder drops cause/code/message | `diagnostics/hosted/evidence-review.json`: `d6c1651d360935e4d049b5a362a77099b2f5759c011b9d78cfa646ca870a3404` |

The retained producers record their exact inputs. The browser uses a new context with workflow-pinned Playwright `1.63.0`, Chromium revision `1243`, version `153.0.8010.12`. The Browser plugin is absent. The old cache is missing, so the first browser setup exits 1 before creating a fixture. The replacement tools live only in a fresh scratch directory, and their package integrity matches the workflow. The small fixture renders meaningful content, reports no console error, and exposes the Abort button. It supplies no product Page, real-person, hosted or mobile-layout acceptance.

Only this note and its four manifests follow the frozen gate. Source, tests, configuration and dependencies stay unchanged. The review act names the final documentation head and tree alongside the frozen tree. The documentation follow-up rule in `docs/testing.md` applies; no second gate runs for these documents.

## Open limits and owners

- **Unreported local browser disconnect.** Chromium abort and active page close leave subscriptions open in the bounded observations. Parent `01e2c4c4` and planner request `ac0c3a70` own the remaining limit and any separate transport design. Three count reads do not establish an eventual forever state. The fixture uses a direct cleartext local listener and records no packet-level cause.
- **Historical hosted ending.** The exact later J5 roster record has HTTP200, TypeError, a 305041 ms lifetime and a 300003 ms idle interval. Its recorder keeps only the error name. An earlier J5 Page record explicitly names `BodyTimeoutError`, `UND_ERR_BODY_TIMEOUT` and a 300000 ms HTTP/2 stream timeout, with a 300005 ms idle interval. Matching timing supports a client-timeout inference for the later run, but the discarded fields prevent an exact historical cause claim. Planner request `eff2fee0` owns that evidence limit and any further capture task. The local cap and cancellation observations do not explain that HTTP200 ending.
- **Review and deployment.** The checker reviews this bounded source child. The planner deploys. This record changes no J5 acceptance, hosted configuration or workroom priority. Mac landing, G3b configuration, O4's Counter decision and the authorized host checks retain priority.
