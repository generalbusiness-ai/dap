# Verify the five priority state machines

## What changed

Five project-local skills pair bounded TLA+ models with real-source regression witnesses. Each skill names its source functions, hashes and sync commit. The [model guide](../../verification/state-machines/README.md) contains the checked user-flow diagrams, bounds and rerun instructions. Product source remains unchanged.

## Decisions

The survey's five priorities define this delivery. TLC 1.7.4 explores event ordering at small, explicit bounds with one worker and Temurin 25.0.5. The source witnesses check the implementation at the relevant boundary. Source hashes force a correspondence review after drift; they do not prove refinement. Each model stutters only at modeled terminal states. TLC checks active phases for deadlocks. No fairness or liveness property guarantees external completion.

All eight safety invariants pass in the final models. Each deliberate model fault produces its intended counterexample. The five corrected source controls fail their intended assertions; baseline and restored source pass. The evidence retains the initial Voice runner error, the Effects control that hit a second guard, and the Transport syntax error.

The Transport control's initial syntax error also overlapped the gate's source-reading Node stage. That gate failed and never reached Counting, plain Vitest or native Vitest. After restoring source and correcting the control, the affected Node owner passed. The three unreached stages then ran once and passed. This recovery does not turn the original gate into a successful gate run. The corrected control runner requires the named property assertion, restores source on normal exit, errors, SIGINT or SIGTERM, and warns against concurrent source use.

## Evidence

The source checkpoint is commit `8faa38dcf31855a0a6264e5912b58061b5eda223`, tree `44cec6488a2060da51d823eda2bf2a5587993574`. The delivery commit adds only verification skills, model artifacts and this evidence note. The [manifest](evidence/2026-11-08-formal-state-machines.manifest.json) records the exact delivered model and skill bytes and retained raw output. The external evidence directory contains a SHA256SUMS file and stays read-only for at least 30 days. Counts come from TLC and the test runners, not timing estimates.

| Check | Command | Exit or result | SHA-256 and retained output |
|---|---|---|---|
| Transport final model and source | `node verification/state-machines/check.mjs Transport` | 0 | `0115fb46e72678165305ec7766a365aa3446e3824ffacaa25fa5ec1b517f2440` (`Delivery-Transport-check.log`) |
| Transport final model | `/statechart with the retained model and view` | 0 | `f7a778d1851b32eb14291f58a95fe71282507c4a0412878631076fa526b78b14` (`delivery-Transport/tlc.out`) |
| Transport source fault | `node verification/state-machines/control.mjs Transport /Users/hughpyle/play/artroom-evidence/2026-11-08-formal-five/transport-final-control` | 1 expected for broken source; baseline and restored 0 | `08603b10f0969e7f23cadffae84cc9533b4f1fe1cab4c5b2449f2bb0089abf8b` (`transport-final-control/broken.log`) |
| Observation final model and source | `node verification/state-machines/check.mjs Observation` | 0 | `53d97253a0f6f2160b14a1c20e373106fcd84e5d30206c04db42626050ec3839` (`Delivery-Observation-check.log`) |
| Observation final model | `/statechart with the retained model and view` | 0 | `43c4f874d84c4e9df0bd73d181e4b6bd31ecfc5f32e337506b359e3e5e95fa80` (`delivery-Observation/tlc.out`) |
| Observation source fault | `python3 /tmp/formal-controls.py Observation` | 1 expected for broken source; baseline and restored 0 | `792e1137842983647b2db9106c0739856d127728944a80a6790db1706bb9b0e3` (`Observation-broken.log`) |
| Editor final model and source | `node verification/state-machines/check.mjs Editor` | 0 | `9077a2e381ddb3e657d83df92731c9d5b232f4cd1c47876c69cd93c92ae7f96c` (`Delivery-Editor-check.log`) |
| Editor final model | `/statechart with the retained model and view` | 0 | `702233c9ad67c503b35469715f512f758f3714416e5d2540d83825d0d2996aaf` (`delivery-Editor/tlc.out`) |
| Editor source fault | `python3 /tmp/formal-controls.py Editor` | 1 expected for broken source; baseline and restored 0 | `5e681724495bfa363abc0a89f1cb33c3d0b2c22e640fb542a0e35ed5d2484929` (`Editor-broken.log`) |
| Effects final model and source | `node verification/state-machines/check.mjs Effects` | 0 | `1e5984b818bc54f2bbb89ed81497e7d9734a0ca0d401f525f189d7e634188a49` (`Delivery-Effects-check.log`) |
| Effects final model | `/statechart with the retained model and view` | 0 | `613b5e0a8809b815f6463d08525aee648d62ea0f5bf1d34530a47bd35f0824b7` (`delivery-Effects/tlc.out`) |
| Effects source fault | `python3 /tmp/formal-controls.py Effects` | 1 expected for broken source; baseline and restored 0 | `76ebf42e89a5c6298705f12c9f6053b515aa95585745eaf792a08fce2e46b4be` (`Effects-broken.log`) |
| Voice final model and source | `node verification/state-machines/check.mjs Voice` | 0 | `4cbed0750dd9abe219d00740abb1cb471feb6d39e8655450a3b2ac55bc3169ed` (`Delivery-Voice-check.log`) |
| Voice final model | `/statechart with the retained model and view` | 0 | `c3633711c93e06ed28628625a766fc827514b9ab89d4062e8e4f294be5dc9a37` (`delivery-Voice/tlc.out`) |
| Voice source fault | `python3 /tmp/formal-controls.py Voice` | 1 expected for broken source; baseline and restored 0 | `311aee8421e264c957870f4d82b7efc34f25a55ffc3abf7b3254d702f2ab219e` (`Voice-broken.log`) |
| NoRevival model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `a550fbe1a54bc4c079e2b8d3c506ddc8f6b796116006d5f1a15cf3209364a26c` (`delivery-model-controls/NoRevival/command.log`) |
| NoObsoletePaint model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `9bd6a45995b3eef48f19b1905aadba6556a77fd72dc106739ce909c14bdbfd10` (`delivery-model-controls/NoObsoletePaint/command.log`) |
| EvidenceBeforeProgress model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `f9cefd06b557f8a916d1c193add8df3fff55080116193b112d9e4e0f3cdcca77` (`delivery-model-controls/EvidenceBeforeProgress/command.log`) |
| AtMostOneSend model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `3d2b58c79ae2f435cb66fb7a8246b4d290634d771e589b57a7d1c6d2c8c4dd78` (`delivery-model-controls/AtMostOneSend/command.log`) |
| MarkBeforeEffect model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `8cbaf6d94664c6fd69e1a5ed1f0c66125da792d49bbe58eeade710465041f988` (`delivery-model-controls/MarkBeforeEffect/command.log`) |
| NoReplay model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `b4a77101ada6a84a72bce9e3c5ea02e28d0241d96b9f5cb633b84e3bc0f2b840` (`delivery-model-controls/NoReplay/command.log`) |
| ProofBeforeClear model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `55cc41b54a604645b420956f95cb9e504bcf41ac15447e9cd197d93c338b2450` (`delivery-model-controls/ProofBeforeClear/command.log`) |
| MarkBeforeSpeech model fault | `python3 /tmp/model-controls-delivery.py` | counterexample found | `4cbcf9a5dd8e4521a51fe55240748de1f6e89f7ea2bc3f1f0bd19b19d16a2101` (`delivery-model-controls/MarkBeforeSpeech/command.log`) |
| Single gate | `npm run gate` | 1 | `e632369b9dabea4bab07f683caf01cb089bd2d648ca314cb9407fe1f570e5e83` (`gate.log`) |
| Affected Node owner | `node --test scripts/security-settings.test.mjs` | 0 | `a56e54c4a115d6115d382fa9b242785ab5a0f6d79c0d4f59c21d529cffafb90d` (`security-settings-recovery.log`) |
| Previously unreached counting | `node /tmp/formal-remaining-stages.mjs` | 0 | `08618c3da0f1eb46353ee216c0ee00973831ef26a1a6140f58c30d866c86779d` (`remaining-stages/counting.log`) |
| Previously unreached plain | `node /tmp/formal-remaining-stages.mjs` | 0 | `7d72147f220b0e7c4613f6572356a1f08469f3483dc76fc62f096d4c3454145c` (`remaining-stages/plain.log`) |
| Previously unreached native | `node /tmp/formal-remaining-stages.mjs` | 0 | `7c7bce0aca916743344427057fe2311e31e85cabb481d56b38ea7e33e6c81ff0` (`remaining-stages/native.log`) |
| Artifact integrity | `Source hashes, SVG XML and new Markdown links` | 0 | `0358bb14ab3b3084c15e5f4913410f14f82ad5380b7dae098b2b755586f8def2` (`artifact-check.log`) |

## Open limits

Request `3c6d197df2db35e3d1603f63acfa63953da7c1a0` owns the five-subsystem delivery and the limits in each skill. The broader inventory has no formal coverage from this change. The models omit cryptography, provider correctness, cross-subsystem composition and unbounded liveness. Transport and editor probes use minimal stand-ins. Observation and audio witnesses use deterministic stand-ins. Effects uses a real scope with a stand-in outside system. A fresh successful single gate remains outside this evidence; no review or landing claims one.
