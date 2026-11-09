# Verify the five priority state machines

The requested repairs and targeted checks pass after published M0 main `f2677f77`. The corrected Editor chart shows failed receipt verification, Effects follows S4, and source controls refuse dirty or unreadable Git state. The final maintained gate and renewed independent review remain due. The original failed gate and the failed preflight wrapper remain failed.

## What changed

Five project-local skills pair bounded TLA+ models with real-source regression witnesses. Each skill names its source functions, hashes and sync commit. The [model guide](../../verification/state-machines/README.md) contains the checked user-flow diagrams, bounds and rerun instructions. Product source remains unchanged.

## Decisions

The survey's five priorities define this delivery. TLC 1.7.4 explores event ordering at small, explicit bounds with one worker and Temurin 25.0.5. The source witnesses check the implementation at the relevant boundary. Source hashes force a correspondence review after drift; they do not prove refinement. Each model stutters only at modeled terminal states. TLC checks active phases for deadlocks. No fairness or liveness property guarantees external completion.

In the original submission, all eight safety invariants passed. Each deliberate model fault produced its intended counterexample. The five corrected source controls failed their intended assertions; baseline and restored source passed. The evidence retains the initial Voice runner error, the Effects control that hit a second guard, and the Transport syntax error.

The Transport control's initial syntax error also overlapped the gate's source-reading Node stage. That gate failed and never reached Counting, plain Vitest or native Vitest. After restoring source and correcting the control, the affected Node owner passed. The three unreached stages then ran once and passed. This recovery does not turn the original gate into a successful gate run. The corrected control runner requires the named property assertion, restores source on normal exit, errors, SIGINT or SIGTERM, and warns against concurrent source use.

## Reconcile the source and the control boundaries

This branch integrates approved S4 source and published M0 main `f2677f77`. The S4 landing retained its merge-message exception; this branch changes none of those signed bytes. `ParkedAttempts` and `ReplyCustody` own only memory. The sent-row branch still chooses held answer, safe recovery or unknown without another original send. The exact `markSent`/readback/dispatch fragment, `#send`, `#answer` and SQLite bytes equal the original model base. `#offer` still awaits the same judgment before postponing or releasing reply custody. The seven other covered source hashes remain unchanged. Coverage now names the S4 operation bytes and includes `#answer`; the Effects model and T19 witness now pass, and its duplicate-dispatch fault fails the expected assertion before exact restoration. The final maintained gate remains due.

The control runner now reads `git status --porcelain --untracked-files=all` before it creates evidence or runs a baseline. It refuses both a dirty checkout and a failed Git status. The README and all five skills require a dedicated worktree and the single validation slot. Voice controls match the intended `voice-controller.test.ts:445:` location.

The Editor model adds `VerificationFailed` and treats acceptance without verification as terminal and unadvanced. At `7b86cb87`, tree `7119596692d63f96df8d6cc16a0c6d5effe8fb0e`, TLC checks seven states and nine steps with both `EvidenceBeforeProgress` and `NoDeadlock` holding. Pele 1.9.0 renders the generated chart. The view hides only three terminal unchanged steps. Commit `87e21036` records that chart before the remaining checks.

At `87e210367b76dd799ce266a0f7503b3bb0282e4b`, tree `ab05e0f97a1ab70fd53c05c0d7c3f05ae6f8be1f`, the Editor model and real reducer witness pass. Its one model fault changes only the scratch Advance guard and breaks `EvidenceBeforeProgress` on the expected three-step path: submit, accept, advance without verification. The checked model stays unchanged.

At the same checkpoint, the Effects model checks seven states and T19 passes once. One duplicate-dispatch source fault fails T19 at `operations.test.ts:85:72`; baseline and restored source pass. Each native invocation explicitly skips ten nonselected cases. Those skips are not passes. All tracked bytes equal their original hashes afterward, and the final process observation finds no executable validation body. The outside system and opening entry remain TEST stand-ins.

The first preflight wrapper collides with its own output directory and exits 1 before either case runs. That invocation remains failed. A corrected wrapper uses distinct directories and runs both cases once: the dirty scratch repository refuses before baseline, and the non-repository fixture refuses on failed Git status. Both expected refusals exit 1, create no evidence directory and leave the copied runner unchanged. The successful wrapper exits 0. No product source or test runs in either probe.

The [corrected-check manifest](evidence/2026-11-08-formal-corrected.manifest.json) hashes to `7948aed7278fc41b28786ec6f6e6a6b70a729b6ae8a76e5e2946e3a76e613f5e`. It names 26 public files and inventories 1,033 read-only private originals across eight retained units. Raw native logs and private snapshots stay withheld. The statechart runner copy disables file removal to retain scratch evidence and honor the owner's rule; checking, model inputs and process cancellation stay unchanged. Every executable body runs serially under booking `bc0fab16`. These results establish no refinement proof, live-room outcome or deployment acceptance.

## Evidence

The original source checkpoint is commit `8faa38dcf31855a0a6264e5912b58061b5eda223`, tree `44cec6488a2060da51d823eda2bf2a5587993574`. The original delivery adds only verification skills, model artifacts and its evidence note. The corrected checkpoints above follow S4 and M0 integration. The table preserves original outcomes and adds the corrected checks below. The [manifest](evidence/2026-11-08-formal-state-machines.manifest.json) records the exact delivered model and skill bytes and retained raw output. The external evidence directory contains a SHA256SUMS file and stays read-only for at least 30 days. Counts come from TLC and the test runners, not timing estimates. The table names retained copies of the temporary drivers. Those paths identify preserved bytes; they do not claim that the original commands executed from those paths. Driver and report paths are relative to the manifest's external evidence directory. The statechart rows name the retained reports because the original invocation has no retained driver.

| Check | Command or retained record | Exit or result | SHA-256 and retained output |
|---|---|---|---|
| Original Transport final model and source | `node verification/state-machines/check.mjs Transport` | 0 | `0115fb46e72678165305ec7766a365aa3446e3824ffacaa25fa5ec1b517f2440` (`Delivery-Transport-check.log`) |
| Original Transport final model | `delivery-Transport/report.md` | 0 | `f7a778d1851b32eb14291f58a95fe71282507c4a0412878631076fa526b78b14` (`delivery-Transport/tlc.out`) |
| Original Transport source fault | `node verification/state-machines/control.mjs Transport /Users/hughpyle/play/artroom-evidence/2026-11-08-formal-five/transport-final-control` | 1 expected for broken source; baseline and restored 0 | `08603b10f0969e7f23cadffae84cc9533b4f1fe1cab4c5b2449f2bb0089abf8b` (`transport-final-control/broken.log`) |
| Original Observation final model and source | `node verification/state-machines/check.mjs Observation` | 0 | `53d97253a0f6f2160b14a1c20e373106fcd84e5d30206c04db42626050ec3839` (`Delivery-Observation-check.log`) |
| Original Observation final model | `delivery-Observation/report.md` | 0 | `43c4f874d84c4e9df0bd73d181e4b6bd31ecfc5f32e337506b359e3e5e95fa80` (`delivery-Observation/tlc.out`) |
| Original Observation source fault | `source-controls-used.py Observation` | 1 expected for broken source; baseline and restored 0 | `792e1137842983647b2db9106c0739856d127728944a80a6790db1706bb9b0e3` (`Observation-broken.log`) |
| Original Editor final model and source | `node verification/state-machines/check.mjs Editor` | 0 | `9077a2e381ddb3e657d83df92731c9d5b232f4cd1c47876c69cd93c92ae7f96c` (`Delivery-Editor-check.log`) |
| Original Editor final model | `delivery-Editor/report.md` | 0 | `702233c9ad67c503b35469715f512f758f3714416e5d2540d83825d0d2996aaf` (`delivery-Editor/tlc.out`) |
| Original Editor source fault | `source-controls-used.py Editor` | 1 expected for broken source; baseline and restored 0 | `5e681724495bfa363abc0a89f1cb33c3d0b2c22e640fb542a0e35ed5d2484929` (`Editor-broken.log`) |
| Original Effects final model and source | `node verification/state-machines/check.mjs Effects` | 0 | `1e5984b818bc54f2bbb89ed81497e7d9734a0ca0d401f525f189d7e634188a49` (`Delivery-Effects-check.log`) |
| Original Effects final model | `delivery-Effects/report.md` | 0 | `613b5e0a8809b815f6463d08525aee648d62ea0f5bf1d34530a47bd35f0824b7` (`delivery-Effects/tlc.out`) |
| Original Effects source fault | `source-controls-used.py Effects` | 1 expected for broken source; baseline and restored 0 | `76ebf42e89a5c6298705f12c9f6053b515aa95585745eaf792a08fce2e46b4be` (`Effects-broken.log`) |
| Original Voice final model and source | `node verification/state-machines/check.mjs Voice` | 0 | `4cbed0750dd9abe219d00740abb1cb471feb6d39e8655450a3b2ac55bc3169ed` (`Delivery-Voice-check.log`) |
| Original Voice final model | `delivery-Voice/report.md` | 0 | `c3633711c93e06ed28628625a766fc827514b9ab89d4062e8e4f294be5dc9a37` (`delivery-Voice/tlc.out`) |
| Original Voice source fault | `source-controls-used.py Voice` | 1 expected for broken source; baseline and restored 0 | `311aee8421e264c957870f4d82b7efc34f25a55ffc3abf7b3254d702f2ab219e` (`Voice-broken.log`) |
| Original NoRevival model fault | `model-controls-delivery-used.py` | counterexample found | `a550fbe1a54bc4c079e2b8d3c506ddc8f6b796116006d5f1a15cf3209364a26c` (`delivery-model-controls/NoRevival/command.log`) |
| Original NoObsoletePaint model fault | `model-controls-delivery-used.py` | counterexample found | `9bd6a45995b3eef48f19b1905aadba6556a77fd72dc106739ce909c14bdbfd10` (`delivery-model-controls/NoObsoletePaint/command.log`) |
| Original EvidenceBeforeProgress model fault | `model-controls-delivery-used.py` | counterexample found | `f9cefd06b557f8a916d1c193add8df3fff55080116193b112d9e4e0f3cdcca77` (`delivery-model-controls/EvidenceBeforeProgress/command.log`) |
| Original AtMostOneSend model fault | `model-controls-delivery-used.py` | counterexample found | `3d2b58c79ae2f435cb66fb7a8246b4d290634d771e589b57a7d1c6d2c8c4dd78` (`delivery-model-controls/AtMostOneSend/command.log`) |
| Original MarkBeforeEffect model fault | `model-controls-delivery-used.py` | counterexample found | `8cbaf6d94664c6fd69e1a5ed1f0c66125da792d49bbe58eeade710465041f988` (`delivery-model-controls/MarkBeforeEffect/command.log`) |
| Original NoReplay model fault | `model-controls-delivery-used.py` | counterexample found | `b4a77101ada6a84a72bce9e3c5ea02e28d0241d96b9f5cb633b84e3bc0f2b840` (`delivery-model-controls/NoReplay/command.log`) |
| Original ProofBeforeClear model fault | `model-controls-delivery-used.py` | counterexample found | `55cc41b54a604645b420956f95cb9e504bcf41ac15447e9cd197d93c338b2450` (`delivery-model-controls/ProofBeforeClear/command.log`) |
| Original MarkBeforeSpeech model fault | `model-controls-delivery-used.py` | counterexample found | `4cbcf9a5dd8e4521a51fe55240748de1f6e89f7ea2bc3f1f0bd19b19d16a2101` (`delivery-model-controls/MarkBeforeSpeech/command.log`) |
| Original Single gate | `npm run gate` | 1 | `e632369b9dabea4bab07f683caf01cb089bd2d648ca314cb9407fe1f570e5e83` (`gate.log`) |
| Original Affected Node owner | `node --test scripts/security-settings.test.mjs` | 0 | `a56e54c4a115d6115d382fa9b242785ab5a0f6d79c0d4f59c21d529cffafb90d` (`security-settings-recovery.log`) |
| Original Previously unreached counting | `remaining-stages-used.mjs` | 0 | `08618c3da0f1eb46353ee216c0ee00973831ef26a1a6140f58c30d866c86779d` (`remaining-stages/counting.log`) |
| Original Previously unreached plain | `remaining-stages-used.mjs` | 0 | `7d72147f220b0e7c4613f6572356a1f08469f3483dc76fc62f096d4c3454145c` (`remaining-stages/plain.log`) |
| Original Previously unreached native | `remaining-stages-used.mjs` | 0 | `7c7bce0aca916743344427057fe2311e31e85cabb481d56b38ea7e33e6c81ff0` (`remaining-stages/native.log`) |
| Original Artifact integrity | `Source hashes, SVG XML and new Markdown links` | 0 | `0358bb14ab3b3084c15e5f4913410f14f82ad5380b7dae098b2b755586f8def2` (`artifact-check.log`) |

| Corrected Editor model and chart | `2026-11-08-formal-editor-regeneration/driver.py --booked-formal-slot bc0fab16…`; `render-driver.mjs` | 0 and 0 | `c7f11b32b522bd58309e9f424399dc2d346fa518d3f7a0f593947fb25144eb59` (`editor-report.md`) |
| Corrected Editor model and source | `2026-11-08-formal-editor-check/driver.py editor-check bc0fab16…` | 0 | `c498c743163c254d291253913e3c4a67d86bf27ea98bc451bbd1effb9eb9b964` (`editor-check-receipt.json`) |
| Corrected Editor model fault | `2026-11-08-formal-editor-model-control/driver.py editor-model-control bc0fab16…` | 1 expected; invariant breaks | `f0586bbcc676f5d79714a6cdf2eacfb7b67cb98202a5b635e5b3edffd887e467` (`editor-model-fault-report.md`) |
| Reconciled Effects model and source | `2026-11-08-formal-effects-check/driver.py effects-check bc0fab16…` | 0; one T19 pass, ten nonselected skips | `7f2abed42d97236802494e01da6efe64dd80c7c324a3ba3e39c31b41947960a1` (`effects-check-receipt.json`) |
| Reconciled Effects source control | `2026-11-08-formal-effects-source-control/driver.py effects-source-control bc0fab16…` | Runner 0; baseline 0, fault 1, restored 0 | `e70bb492aabb4095d8a60d4a328aa73764f3ff648a5cbb9df4636d4d4279f981` (`effects-assertion-review.json`) |
| Failed preflight wrapper | `2026-11-08-formal-guard-probes/driver.py guard-probes bc0fab16…` | 1 before either case | `9ca229dd1287cfc9aeffbc325a418bbe161add1b7393f10af4e8df2ea41ef3ca` (`guard-probes-receipt.json`) |
| Corrected scratch preflight cases | `2026-11-08-formal-guard-probes-corrected/driver.py guard-probes-corrected bc0fab16…` | Runner 0; each expected refusal 1 | `07056b56015f85704e4a7feaf012453e6fedd18de3576212dfad835a02fd49b0` (`guard-preflight-result.json`) |
| Corrected source and process audit | Retained before/after hashes and serial process observations | Equal bytes; no validation body remains | `708cab745a6b8f6f3dabf0ccebe839e51cd4b75718413f0dbe6ea5204e494591` (`slot-observations.json`) |

The corrected rows use checkpoint `87e21036` unless they name the earlier chart checkpoint `7b86cb87`. Their output names are relative to `~/play/artroom-evidence/2026-11-08-formal-corrected-validation/`; the retained drivers live in the sibling units shown in the table. The full booking ID and exact command arguments appear in each manifest-listed task record.

## Open limits

Request `3c6d197df2db35e3d1603f63acfa63953da7c1a0` owns the five-subsystem delivery and the limits in each skill. The broader inventory has no formal coverage from this change. The models omit cryptography, provider correctness, cross-subsystem composition and unbounded liveness. Transport and editor probes use minimal stand-ins. Observation and audio witnesses use deterministic stand-ins. Effects uses a real scope with a stand-in outside system. A fresh successful single gate remains outside this evidence; no review or landing claims one.
