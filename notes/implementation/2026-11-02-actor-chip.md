# Cards name the signer of each act

## The cards and receipts name their own signers

Request `c6ced04f91a6f3f6e1f3126a5541019ca26abfc1` asks cards and receipts to identify a person, an agent with its controller, or a checker. A question now names the signer of its exact text entry. A change names the signer of its recorded version, or its opening act before any version exists. Needs You and Work cards name the selected record's opening act. The chip names the entry it attributes.

A receipt names the signer of the actual custody envelope. It does not copy the displayed card's author, the viewer, or the most recent writer. The service keeps this metadata in a private WeakMap keyed by its existing result. It leaves the tool result's public shape intact. Both the short receipt and its exact context retain the attribution across refresh.

`actSigner` resolves the public key against the exact verified membership. It requires one active key, one active member, and a supported kind. An agent also needs one active person as its controller in that same membership. A revoked key, removed controller, other membership, or missing read cannot supply a name. The card then states the available public key or says that its signer is unavailable. A receipt without confirmed signer metadata says so.

## Attribution follows the signed record

An approval request can come from someone other than the question's author. A later comment can also name a different signer. The adapter reads the exact question text's entry instead of inferring its author from those later records. Version and opening-act attribution follows the corresponding entry for the same reason. The bounded list adapter reads attribution only for the selected card and leaves ordinary tool output unchanged.

The native witness creates a person, an agent controlled by that person, and a checker. Each signs a question. A different identity then writes a later comment and approves it through `view_act`. The witness checks both the card author and the different envelope signer, then checks the receipt after refresh. Native Membership and Brief issue judgments, Worker HTTP, read sessions, custody, and the card adapter run together. OwnGit, WorkspaceStandIn, the clock, and the pause scheduler remain stand-ins.

The browser script replays those recorded displays at widths 592 and 320. It forwards one prepared press to the replay and checks the resulting receipt. It signs no additional room act. Six native cases sit among 82 browser cases. The three card and three receipt captures at width 320 show the distinct labels and the agent controller. No native card case overflows horizontally.

Two controls distinguish the result. Substituting the card author for the submitted signer fails the native receipt assertion. Substituting the agent's own name for its controller fails the unknown-controller witness. Both control commands exit 0 because their baseline passes and their intended mutation fails. Their logs retain the assertion failures. All controlled production and test files remain byte-identical from the held checkpoint through the final source checkpoint.

## The evidence separates the failed gate from its follow-up

Source checkpoint: `19da8139f506af9476c870e6d4b6cc89093e9640`, tree `50e41aa7b34ed2d848aa384c71616814853ca941`. Manifest: `evidence/2026-11-02-actor-chip.manifest.json`, SHA256 `349fc843f352844c6165985aa7fdcf1c10183cb20541d29d0e92d05c0939c7b6`. It covers 199 files in four readonly units under `/Users/hughpyle/play/artroom-evidence/`.

The full gate ran once at `401853e59e9978d297aed6e37f19519c0fc8cf66`, tree `03d977e3ac0be0c84045861fb2974123a60d557b`. Its actual `gate.exit` reads `exit 1`. All pretest checks, typecheck, and kernel pass. The Node phase passes 129 of 130 cases. One case rejects the stale service source seal. Counting, plain, and native remain unreached in that gate.

The exact service diff adds the signer import and private result metadata after the existing send and settle gates. Routes, methods, tool dispatch, signatures, grants, and custody checks stay unchanged. Review found no route partition or gate classification change. The maintained parser changes only the module and `McpService` seals. Commit `19da8139` adopts those two literal hashes and explanatory comments in `scripts/security-entry-points.test.mjs`. It changes no other file. The test has no importer. All ten cases, their deadlines, and their production assertions remain intact.

The isolated repair follows `docs/testing.md`'s one-file test exception. Its whole owning file passes, followed by the three stages that the gate never reached. No TypeScript compiler input changes. Product source, dependencies, configuration, imported code, and shared helpers stay byte-identical. This passing follow-up does not turn the failed gate into a pass. The checker must assess the pair under that exception.

[Card browser workflow 41397945887](https://github.com/generalbusiness-ai/dap/actions/runs/41397945887) succeeds at exact source `401853e5`. Its 82 cases report zero browser errors. The later seal repair changes only the owning security test. The workflow file, browser script, generated module, adapter, and all other runtime inputs remain identical. The review record adds only this note and its manifest after the follow-up source checkpoint.

| Check | Command or observation | Actual result | Evidence file and SHA256 |
|---|---|---|---|
| Held checkpoint | Read checkpoint.json | 34 Node adapter and 38 focused Vitest cases pass; browser preliminary | `2026-11-01-actor-chip/checkpoint.json`: `5c0b2b9cd71b9fb9db8e4387524f3df06c0436c5ebe6f92e7afcf1d5d1bc883d` |
| Generated module | `node packages/mcp/scripts/views.mjs` | exit 0; working tree stays clean | `2026-11-02-actor-chip-resume/generated-cards.exit`: `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Compiler contexts | `tsc --noEmit` for MCP and apps/views | both exit 0 | `2026-11-02-actor-chip-resume/resume-checks.json`: `d11825ffc9b27055ebeeacfe769739094613e473114ceca8f638cb7022f1deec` |
| Receipt control | `node scripts/control.mjs` with the retained receipt-signer argv | outer exit 0; baseline passes; wrong signer fails its assertion | `2026-11-01-actor-chip/receipt-signer-control.log`: `8253a7006339c2a5ba8416ea294f125c4bae7f8f4bba497d5caa74cbd2b195de` |
| Controller control | `node scripts/control.mjs` with the retained controller argv | outer exit 0; baseline passes; wrong controller fails its assertion | `2026-11-01-actor-chip/controller-control.log`: `f7badfe9a8dd48e395f112548d5d130317a29321dd917e8faa224d0a7177f372` |
| Preliminary browser | `node --import tsx packages/mcp/test/views-browser.mjs` | exit 0; 82 cases; no browser errors; before final metadata separation | `2026-11-01-actor-chip/browser-second/report.json`: `2f0c0b61f7891e01cff06b5878ebca0996e20c1fe6f866d578da19ad69f12219` |
| Native capture audit | Digest-verified ACTOR-RECORD decode and six 320-pixel image inspections | no credential pattern or sensitive decoded field; six public fixture captures | `2026-11-01-actor-chip/evidence-scan.json`: `567ed6b9c5b76bcd28c808c1d348832718b0bff0a1454798d1c4a486b1270652` |
| One frozen full gate | `npm run gate` at exact source 401853e5 | exit 1; stale module seal; 129 Node passes, 1 fails; later phases unreached | `2026-11-02-actor-chip-src/gate/gate.stdout.log`: `53e433d1c509138b077f28ef6616b7a3ce233a142af88336ce5009b3ba59631c` |
| Original exit authority | Read actual gate.exit | exit 1 | `2026-11-02-actor-chip-src/gate/gate.exit`: `0c6868c2c44f053619cef1cc383e1d530743b574ca192ace9168a9ccf46a86e3` |
| Exact service review | Review service diff and maintained-parser seals | two named owners change; route and authority gates stay unchanged | `2026-11-02-actor-chip-resume/source-seal-review.json`: `ad22d4bc554820a9c1deaec3bbc2c29fc03ec22cba99ff00d452eb2731050ea9` |
| Whole failing test file | `node --test scripts/security-entry-points.test.mjs` with both reporters | exit 0; 10 pass, no skip | `2026-11-02-actor-chip-seal-followup/owning-node.stdout.log`: `06ede1b5b287d594c2976b87434ff9614ebd574741be75b1e32d84928528534c` |
| Unreached Counting | Fixed Counting argv from scripts/test.mjs | exit 0; 56 pass, no skip | `2026-11-02-actor-chip-seal-followup/counting.stdout.log`: `ff8440fadb9855cd0c8497572ed694d64b54fcc1cc80068f00a330895e272981` |
| Unreached plain | Fixed plain argv from scripts/test.mjs | exit 0; 3556 pass, 1 skip | `2026-11-02-actor-chip-seal-followup/plain.stdout.log`: `f167d924750495f2fb1f5a3a08bc443388671881c2d9167f02c8bb8bd191c918` |
| Unreached native | Fixed native argv from scripts/test.mjs | exit 0; Tests  1029 passed | 2 skipped (1031) | `2026-11-02-actor-chip-seal-followup/native.terminal.txt`: `28b9a2d5b61c973bfe40fd49c759d0acf2257cc42751e1d797b6e7a1e512cbe4` |
| Follow-up authority | Read actual followup.exit and retained result | exit 0; source unchanged during follow-up; original gate remains failed | `2026-11-02-actor-chip-seal-followup/followup-result.json`: `2bbb091a14f4e307644fc6884bfb8c72eeae260340562e6bd9400869ac3ee623` |
| Follow-up observations | `node scripts/test-summary.mjs` for the three later phases | exit 0; only counting, plain and native run in this ledger | `2026-11-02-actor-chip-seal-followup/unreached-summary.stdout.log`: `4bdad33c6b2fcc36c9ac6beb75d664828c6acbd14683f0e148f541313f99aff5` |
| Exact-source Card workflow | `gh run view 41397945887 --repo generalbusiness-ai/dap` | completed; success; exact head 401853e5 | `2026-11-02-actor-chip-src/card-workflow.json`: `4ce0bcc9d3f5626c4c211a60d7332c0c291702b6f1a2af6738b959a32c3e36fc` |
| Card workflow output | Read its retained job log | 82 browser cases, no browser errors; Grow browser step also succeeds | `2026-11-02-actor-chip-src/card-workflow.log`: `37549cb0d84eac9c61e88208c6ba0214983b29817fd73adab8b9bf2e6c7be453` |
| Repair and workflow equality | `git diff 401853e5 19da8139 --name-only` plus blob identities | only the security test differs; all 18 actor feature blobs match the held source | `2026-11-02-actor-chip-resume/seal-followup-source-equality.json`: `5ffc0a50ed554fa7258ee19ad0939ee9ccf6463d968386c77c80193bcf46c077` |
| Withheld native console | Audit raw stdout before sealing | Bearer-shaped test output stays private; byte count and whole-file hash retained | `2026-11-02-actor-chip-seal-followup/withheld-output.json`: `791a8f3b94b89dda045429e29ad229dfc812987795ad1cabbc2a3c69e097f042` |
| Follow-up audit | Pattern scan and tagged-record decode | no credential pattern or sensitive decoded field | `2026-11-02-actor-chip-seal-followup/evidence-scan.json`: `f176e100d440f6ace391080a0b7e2142e3116c42fc480a50d8e866982633a0b2` |

The preliminary unit retains the early native, adapter, golden, and browser failures beside the corrected runs. Its 82-case local browser run precedes the final adapter metadata separation. The exact-source workflow supplies the later browser result. The merge-proof unit records all 18 unchanged actor feature blobs across the held head, current main merge, and isolated seal repair. The original gate and the follow-up use unset `VITEST_MAX_WORKERS`; neither increases a case deadline.

All four units have verified checksums and readonly modes. Keep them for at least 30 days after landing. The audit checks credential patterns and decodes tagged records. The preliminary ACTOR-RECORD payload passes its end hash and matches the saved JSON, with no secret or token field. The native follow-up console contains a bearer-shaped value, so the whole raw stdout stays private. Its byte count and whole-file hash remain in `withheld-output.json`. Actual exit files, structured observations, and a safe terminal extract supply the native result. The remaining retained files have no credential-pattern match. The six inspected native captures show public fixture text and no credential. Fixture key stores, browser profiles, private custody, session material, and Worker storage stay outside the units.

## The remaining limits have owners

- **Exact review and deployment — this request and the planner.** This head awaits the checker's exact-head judgment. The planner owns deployment after landing. A passing local browser script or CI workflow makes no claim about a deployed host.
- **Desktop host behavior — `1a44f0429e7d52b09dae7861de5c389083904ba7`.** The native rows and browser replay do not establish Goose Desktop iframe behavior, host tool timeouts, model hiding, or long presses. The separate Desktop request remains open.
- **Stream lifetime — `01e2c4c40e1bd52f806d15e9a56d2ec8d0d91981`.** This change adds no stream repair and does not explain the local zero-release case or the separate hosted HTTP200 stream ending. Planner ruling `3dd443dd` keeps that work after the existing queue.
