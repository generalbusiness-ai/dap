# Goose validates bounded CLI reads; Desktop cards remain untested

## What changed

This partial record answers child request `9d595a40299d0c12267172e5b3271aabbd7e4449` under Goose investigation `1a44f0429e7d52b09dae7861de5c389083904ba7`. The original request stays open. It changes no dap source. The probe runs the real `apps/views/src/node.ts` at main `8093f9cecdeac454761b027c56c0059ff0231348`, tree `4789fd430513d4cfefc3b4da7f0c238572e66d5d`, against a new scratch room on dap-demo.

The installed Goose bundle and its bundled CLI report 1.57.0. The existing OpenRouter provider passes its connection check. Three CLI probes succeed. Five native app acquisitions time out before window state or a screenshot, so no Desktop card runs. Those failures establish a control-channel limit, not a Goose protocol defect.

## The decisions and why

The observed bounds support these purpose judgments:

- **Builder test host: not sufficient on the available evidence.** Native window access cannot reach the render, press, receipt, and restart checks that would replace a person’s session.
- **Second supported host for people: not sufficient on the available evidence.** No Desktop card or four-view workflow runs. This result does not establish that Goose lacks those capabilities.
- **Agent host: sufficient with named gaps.** The installed CLI runs `needs_you`, `work`, and `view_needs_you` against the real scratch-room server. Native acts, waits, large answers, restart behavior, and an enrolled agent-key identity remain untested.

The actual MCP probes use only @gooseana’s scratch home. Setup also creates @gooseowner and @gooseagent as person identities. The last name does not make that identity an agent key. The probes never use a real-room owner home. All setup acts belong to the new scratch room.

The ten required rows follow. **Observed** means the installed Goose CLI where the row says CLI. **Source** means official upstream 1.57.0 at [`30bba951`](https://github.com/aaif-goose/goose/tree/30bba95105e59bc3e7df624cf6b4d433690cfe12). Matching version strings do not establish binary equality. **Not reached** means no runtime result. The evidence matrix retains the exact source paths, line ranges, and hashes.

1. **Negotiate MCP Apps and render ui:// without _meta.ui.domain.**
   Observed: CLI: server/discover advertises an empty extensions map. No UI negotiation or resource read occurs. Source: Client code can advertise io.modelcontextprotocol/ui with the MCP Apps HTML MIME type. Renderer reads a resource and consumes CSP and border metadata without a ui.domain field in that extraction. Not reached: Desktop extension negotiation, ui:// rendering, and an absent-domain card.

2. **Hide view_read and view_act from model; allow card calls.**
   Observed: CLI catalog has nine plain tools and lacks view_read and view_act. dap filters those tools for this non-UI peer. That result does not exercise Goose filtering an advertised app-only tool. Source: Goose filters tools whose ui.visibility omits model. Its app route checks app visibility. Not reached: Actual model visibility with UI negotiation and an app-only call from a card.

3. **Server process count and destination of a card call.**
   Observed: Probe 3 starts Goose 13420, recorder relay 13437, and exactly one real dap server 13438. All three observed tool replies come through that server connection. The relay adds a process and logging overhead. Source: Desktop app tools use sessionId and extensionName through ACP. The extension lease resolves the named tool and calls its selected extension client. Not reached: Desktop server count and the destination of an actual card call.

4. **Card input, tool result, structuredContent, and fallback text.**
   Observed: CLI tool messages retain structuredContent for work, needs_you, and view_needs_you. Plain work and needs_you text blocks parse to the same JSON value as structuredContent. The view-opening fallback intentionally contains less. Source: Renderer forwards input and result after initialization. ACP result normalization retains structuredContent. Not reached: Actual card receipt of input or result and visible fallback behavior in Desktop. No test strips structuredContent.

5. **40-second press and a press beyond the card 120-second wait.**
   Source: The renderer has a 10-second sandbox-ready deadline. That timer is not a tool-call timeout. The backend client has a separately configured request timeout. Not reached: Both long presses and any host cut, late reply, native result, or recovery.

6. **Answer-size limit at the largest real answer.**
   Observed: Largest tool reply in probe 3 is needs_you: 4,532 UTF-8 bytes for the complete JSONL reply frame excluding its final LF. Work is 2,772 bytes; view_needs_you is 596 bytes. These are ordinary small answers, not a size-limit test. The 64,946-byte Goose transcript is not an answer-size limit. Not reached: A largest-real-answer exercise, a host limit, or any large Desktop card answer.

7. **Model context, message, display modes, resize, theme, CSP.**
   Source: Renderer declares message, serverTools, serverResources, openLinks, and logging capabilities. It has handlers for text messages, sizing, and theme context, plus inline, fullscreen, and pip display code. It forwards CSP into the sandbox. No explicit update-model-context handler or capability appears in the inspected renderer. Its fallback reports an unhandled method. Dependency behavior and installed runtime remain unverified. Not reached: Every requested capability in an actual Goose card. No runtime Goose defect is established.

8. **Native card act and receipt.**
   Observed: Fresh authenticated native reads after the CLI probes show unchanged scratch issue and membership heads. The probes submit no act. Not reached: Request changes or Approve through a card and its receipt.

9. **Reload or reopen chat and retained card view.**
   Source: The renderer has cached-HTML and same-mount resource state paths. Those paths do not prove view identity survival across a reopened chat or new server process. Not reached: Reload, reopened chat, retained view state, and an old card calling a live server.

10. **Needs you, work, decision, change, diff, interdiff.**
   Observed: CLI reads needs_you and work and opens view_needs_you as a text fallback. The pending approval fixture is real scratch-room state. A catalog entry for a view is not evidence that its card renders. Not reached: All four card renders, decision, change, diff, and interdiff. No change-lane fixture was created.

Goose has not reproduced any of the three earlier person-session faults. The source suggests resource extraction without `ui.domain`, but no sandbox render runs. The CLI uses one real server, but no card calls a server. The renderer’s 10-second timer waits for the sandbox, so it says nothing about a 10-second press. Those checks stay with the desktop AI app until a controlled Goose Desktop run supplies its own evidence. Goose cannot establish that app’s sandbox policy, process split, timeout, or chat lifecycle.

No observed result identifies a Goose protocol defect. The missing explicit `ui/update-model-context` path is a source finding with an untested runtime outcome. This head changes no dap behavior to accommodate a host.

## The final evidence

Checkpoint: `8093f9cecdeac454761b027c56c0059ff0231348`, tree `4789fd430513d4cfefc3b4da7f0c238572e66d5d`. Evidence directory: `/Users/hughpyle/play/artroom-evidence/2026-11-01-goose-host/`. Manifest: `evidence/2026-11-01-goose-host.manifest.json`. Manifest SHA256: `59fd05d5235c2180891c6407790998f9888697e934ae43aefeba2ef28d4a575d`. The manifest covers 127 files in two sealed units.

Elapsed seconds come from each Python driver’s wall-clock span. Protocol elapsed milliseconds come from the recorder’s request and reply timestamps. The recorder counts UTF-8 frame bytes without the final LF. The recorder adds a process and logging overhead, so these timings do not measure an uninstrumented host.

| Check | Command or observation | Exit and result | Output SHA256 |
|---|---|---|---|
| Installed identity | `Read the installed Info.plist; bundled `goose --version`` | Metadata read; CLI exit 0 | `installed.json`: `addb3f9749e9f4238f2588e5669fa7b96d30225305b8f9550bb02f0cdd247451` |
| Existing provider | `Bundled `goose info --check`` | Actual exit 0; 0.773 s; original config unchanged | `provider-check.json`: `a492c82197c936d45ba6a9917e9b2aff2dea01ca70b5a84e93a7c760b89c4471` |
| First fixture attempt | ``node --import tsx setup-fixture.mjs`` | Actual exit 1; unauthorized operator install; no room claim | `fixture-bootstrap-analysis.json`: `7fe5d36781bf868b40956825aa6a9ed0df43bbfa44b06bd76912cd9f2c358bdf` |
| New public-register fixture | ``node --import tsx fixture2/setup-fixture.mjs`` | Actual exit 0; 18 successful CLI commands; new room only | `fixture2/fixture-steps.ndjson`: `10fe27c4ecadf847080202b0b262ebe5147d8c4c23ea6823976e939c71244d3d` |
| CLI probe 1 | ``python3 run-agent-probe1.py`` | Actual exit 0; 4.698 s; one `needs_you` call | `agent-probe1.json`: `ca964b267dc64541dccfb0b2fe8845ff1e5e888bd5dc66cdc82ff1e3cc1d4097` |
| CLI probe 2 | ``python3 run-agent-probe2.py`` | Actual exit 0; 5.494 s; `view_needs_you` and `work`; executed max turns 4 | `agent-probe2.json`: `8dcdeddbe34828f5eef66caa54048a44bd990f262cd00b82e597a526b8111efa` |
| Probe 2 command correction | `Compare executed driver with descriptive record` | Inspection; descriptive command said 3; actual argv used 4 | `probe2-command-correction.json`: `fa32f51737555a391e7fb452ed5d886da93bbee9710da86adde62fcef8630078` |
| CLI probe 3 | ``python3 run-agent-probe3.py`` | Actual exit 0; 5.747 s; three successful reads | `agent-probe3.json`: `1d41cb520eae8a6568000a975813dd195ffa88a09122a6d81156cc7d9ae8b117` |
| Probe 3 protocol and process route | `Transparent stdio recorder during probe 3` | No UI extension; one real server; three successful structured replies | `agent-probe3.events.ndjson`: `5b32a04c72726788cdbc822840c130d5797072a75ff22927c74ef29250a2c188` |
| Goose tool-message result | ``python3 record-analysis.py`` | Actual exit 0; retained structuredContent; plain fallback equality | `agent-tool-message-recomputed.json`: `fd8a09620c2dce3b11eab1617066da757e92bae4ff51a099f5fee86ff4493d80` |
| Recorder byte control | ``node observer-control/run.mjs`` | Actual driver exit 0; both relay exits 0; corrected metadata matches split UTF-8 bytes | `observer-control/validation.json`: `f184af5f8207c0630c46a4a77d07a2adf97c7c2307fc9e47d432270f9f961839` |
| Control interpretation | `Inspect actual relay exits and generated expectations` | The hypothetical old expected exit 1 is not an observed process exit | `observer-control-interpretation.json`: `5182bd593c473a522d0c73df281da80ac1305784feaf9d0188b14f6b341a6bf6` |
| Native read after probes 1 and 2 | ``node --import tsx read-after-probes.mjs`` | Actual exit 0; issue and membership unchanged | `native-after-agent-probes.json`: `d1568d3fc4f18c982ab332dbfd1b48436f658c7b99bf1b6d9c92f621f74f7e17` |
| Native read after probe 3 | ``node --import tsx read-after-probe3.mjs`` | Actual exit 0; issue sequence 6, membership sequence 11; both unchanged | `native-after-agent-probe3.json`: `d1568d3fc4f18c982ab332dbfd1b48436f658c7b99bf1b6d9c92f621f74f7e17` |
| Desktop access | `Five native app acquisitions plus inventory calls` | Tool timeouts before window state; no screenshot or UI action | `computer-use-attempts.json`: `2134ab37032e978202f8552607669db0130448bbe3af4bc8a0fe45d673a47b94` |
| Version-pinned ten-row analysis | ``python3 matrix-analysis.py`` | Actual exit 0; ten labeled rows and three purpose judgments | `result-matrix.json`: `9ac4dd26362c6f613f30fcbae1a3ec7e30dd1d80487a4f10c50d8f13cc2d3979` |
| Source, exits, config, and process check | ``python3 record-analysis.py`` | Actual exit 0; 24 Git blobs and SHA256 digests verified; seven actual exit files read; config unchanged; probe PIDs absent | `record-validation.json`: `428502e4aa98c99d773dde0fdf439798ddc6028e80837e0e66c5558ff940869c` |
| Document-only source reuse | `python3 /private/tmp/artroom-goose-source-proof.py` | exit 0; prior gate.exit reads exit 0; runtime and tests match gated source `658aab95` | `source-equality.json`: `d65e17b9ff2ec752dc47c570fffbe1bc61702a717fc7d674993f1aa628c5de30` |

The table names retained copies of the probe drivers. Their reports retain the executed Goose argv. The source gate ran at `658aab954d7a017c5cbce0d7daf28bb798fa1f52`, tree `27936fcbfd752aef7a6fecf02961279f258c2628`. Only four documents differ at the main checkpoint named above. This partial record adds only this note and its manifest. Under the document-only follow-up rule in `docs/testing.md`, the record reuses that gate instead of repeating source tests. The separate source-proof unit retains the exact Git-object comparison and verifies all 46 files in the prior gate unit.

The first fixture tried an operator-only installation against an existing register and stopped unauthorized. The second reads the public creation offer, creates a new stored founder key in a scratch home, and claims through the existing public register. No Worker configuration or deployment changes.

The recorder’s first two versions preserve transport bytes but do not prove exact metadata byte counts across a split UTF-8 character. Probe 3 uses the corrected StringDecoder recorder. The synthetic control covers that recorder only. Both actual relay child exits are 0. The old recorder’s generated expected exit 1 describes a hypothetical assertion.

The copied qualification in `native-after-agent-probe3.json` says “after the two probes.” Its separate driver, output, and actual exit belong to the fresh read after probe 3. `record-validation.json` records that correction.

The original Goose configuration SHA256 remains `c8412475547121797fea881db71b72cb8819b2fb5180b49a905f8ace7a1ff321`. The builder makes no config edit, so there is no edit to restore. Hashing reads the complete private config bytes without extracting or printing credential fields. Command-line extension selection applies only to the bounded CLI processes. No new key, provider, or model is selected.

Private raw Goose output stays outside evidence because it can contain opaque view identifiers and model text. The note withholds that output, all scratch keys and homes, and the original config. It retains only allowlisted metadata and content hashes. Evidence sealing and the scan result appear in the manifest. Retain the sealed unit for at least 30 days after landing.

## The open limits

- Parent `1a44f0429e7d52b09dae7861de5c389083904ba7` stays open and owns every Desktop row marked not reached, the agent gaps, and any later installed-host fault. No Desktop acceptance follows from these CLI results.
- Planner ruling request `8e5edae72b827999d6a646fcbd2dfb8593393b4e` owns whether this limited record closes the investigation or leaves the Desktop work open. The ruling remains open. Landing this child record does not decide it or close the parent.
- A later Desktop attempt needs working native control and a bounded stable-version window from the planner before the long press. The planner owns deployments. No deployment hold is in force during these CLI probes.
- The existing desktop AI app keeps its own sandbox, process, slow-press, and reopen acceptance. Goose source findings do not replace those checks.
