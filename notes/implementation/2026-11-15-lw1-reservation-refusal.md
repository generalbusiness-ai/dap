# Lending reservation refusal words (LW-1)

A refused reserve now says: “You can hold at most two reservations at
once. The tool must also be free for that day.” It no longer borrows
cancellation wording. The reservation-capacity message names the existing
eight held reservations rather than the library's 64 things.

Request: `aefd32490e7e707cc3a5ced5eb6880e8f682e735`.
Promise: `ffb1bb644c29062e8080a036c032a75467ee474c`.
Decision `a214a660` puts this small change in the CE2 head, with no
separate LW-1 gate, and defers Lending and Counter 0.4 signing until it
lands.

## Source and limits

The two-file source commit is
`ed48b64d747f3af750a5f5d2a2a26ebed9a5a104`, tree
`69ac78a788573cc618508f6eb76fc30d4cd48b23`, parent `fd75637e`.
It changes only `examples/lending/browser/annotations.ts` and
`examples/lending/definition.test.ts`. CE2 source commit `8a08f2a5` builds
on it; the two promises remain independent.

The joined implementation checkpoint is
`38fec867b7c6034bf1319ddb23783ba73d445123`, tree
`b569f041c290f56f1f0be601e0aa0eb6a25ce228`, with the two permitted
measured presentation fields applied once. Gate attempt 1 ran at
`31d337778ea5275f6d338f1f1198fe022f7355f1`, tree
`5cbfba863564b669d70b94bfcaee604c4d7c7c17`, against published main
`ce6f02ba164982dce9ead6b85c9e482ca1829f07`. END
`f67e825bb021934e0995e2c80a7ba0c922f96ed4` records FAIL on one stale
inventory documentation assertion. Native was unreached in gate 1.
The later document-owner and Native route also failed at `d1beb6f0`,
tree `1771e678e35ec771bba651bf9de6e69cf7c8fb95`, under END
`3743d64a20e3ab8a0a25de4f34a10d2fc9c710fb`. The production repair at `b59fca7541b3809c08768f93b5b1681792e1afbc`,
tree `27a37e0fa18db79e9e5009600cb2731d00c33809`, follows rulings
`206d7d21` and `41b4ba66`. Focused validation passed at note-only successor
`480508d8f7fcb68d9a0dad3385ecb2e8850cd5aa`, tree
`9306be3136c716ae7e91c97c2009d1810f9e2963`. Gate attempt 2 started
there under START `b600fdace92f87b54e2f50c77fa2c220f67d3e27` and passed
under END `97cec6f0d96e4551f671c2f1de18d40be30a3c5a`.
Neither earlier FAIL changes.

The tool/day guard has the existing name `tool-day-taken`; the count
guard is unnamed. These are not two authored guard names. The current
annotation caller receives only the refusal reason, so one combined
message covers both real conditions without claiming which one failed.
The named tool/day entry remains available to a caller with the complete
judgment. RequestSettled and its adapters stay unchanged. No screen offers
reserve yet; this work adds no screen or action flow.

The audit also replaces borrowed cancellation words for donation, gives
donation its library revision subject and publication its library-or-thing
subject, and describes bad fields rather than only bad text. Borrow's
existing exact revision words stay unchanged. Holder and staff release
wording and all guards remain intact.

The existing real two-live-holds test keeps its original third-reserve
`guard-failed`/`guards.1` assertion and holds the full words from that
actual refusal reason. It uses `expect.fail` to narrow a result-checking
failure. All nine definition cases, other assertions and release/replay
flows stay unchanged. LW-1 changes no guard, definition, scenario, pin or
shared Client API.

## Evidence

| Check and source | Actual result and wall | Raw record, full SHA-256 and argv location |
|---|---|---|
| `ed48b64d`: normal two-file source commit | Exit 0, 1.223115 s; normal hooks checked 950 source files against 159 bytes exports. Clean worktree after commit; modes 0644. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-lw1-source-commit-attempt1-20261115/result.json` (`b68c01fecc7b37b7f80a39182a91687ed4073e0320dd1992e0c83127d380d99a`); exact proposal/case-preservation guards and actual hook streams beside it. Actual argv: `commands[*].argv` in that record. |
| `ed48b64d`: Lending compiler contexts | Source/test context: exit 0, 0.840027 s; browser context: exit 0, 0.308617 s. Compatibility: exit 0, 0.089305 s on the owned dependency view. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-lw1-focused-attempt1-20261115/result.json` (`8dfd4710f7ad1d2850bec55afa05b2feda5a72dcc8f2df1f27159d5f8fb55a92`). Actual argv: `results[*].argv` in that record. |
| `ed48b64d`: whole definition and browser model owners | 13 tests passed in 2 files; exit 0, 1.264737 s. The actual third-reserve words passed. | Same focused result (`8dfd4710f7ad1d2850bec55afa05b2feda5a72dcc8f2df1f27159d5f8fb55a92`) and `lending-owners.stdout` in that directory. Actual argv: the same focused result.json `results[3].argv`. |
| `8a08f2a5`: joined normal three-way comparison | PASS, exit 0, 1.888492 s. Grow exact; entries, definition lists and semantic IDs exact. Lending presentation measured `188f7b84…`; Counter presentation also changed, requiring planner disposition. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-compare-attempt1-20261115/comparison/comparison.json` (`8f61f97b3d4768aa6ce4505ec49e95f75bb8b42cbfdde52d26a5af684a2868f9`); END `b7f7ded2`. Actual argv: ../execution.json, SHA-256 `00c9eac0da06aa58de1183d650a9f9049cbe612563b49eba4d97638197dd2ed3`. |
| `38fec867`: permitted presentation apply | PASS. Apply: exit 0, 0.266111 s; normal commit with formatting hooks: exit 0, 1.216504 s. Only the two measured presentation fields changed; source clean. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-adoption-attempt1-20261115/result.json` (`4c1dcee01470991cb47cd3692dc3569dc9b55768b50d55b67c2e03e8e84516af`); END `de371b383e5a807e63eed01c106c4797f96c5009`. Actual argv: `results[*].argv` in that record. |
| `38fec867`: whole CLI examples/reproduction owners | PASS: examples 3 and reproduction 1, all 4 passed; exit 0, 7.245860 s, empty stderr. END `eee6f777083cd17a9d595a3a839de32e2b5ac273`. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-reproduction-attempt1-20261115/result.json`, SHA-256 `9d66bd799434f9f6634e85bdf1f98995ff2a69da72fd9b6136cfb546484d3049`; actual argv: `results[*].argv`. |
| Permanent safe development retention | 61 explicitly reviewed files across the joined work; no full Card request/display dump copied. Metadata record, not a test command. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/retention-index.json`, SHA-256 `06bb9e468eb9aff6dbaf213b16689a5bdc13df69291d88cef325d520c2caf3b2`. |
| `31d33777`: joined full gate attempt 1 | FAIL; child exit 1, verification exit 1, reaped. Child wall 344.323734 s; outer wall 344.617307 s. Preliminary checks passed; Node 204 and Counting 56 passed. Plain 4,872 passed, 1 failed, 1 skipped. Sole failure: inventory.test.ts:98, stale generic settle description. Native UNREACHED; natural Scale has no executed result or wall. | `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt1/result.json`, SHA-256 `ab99da9b708d412f8ae0fc0ff43aa4af11f1ec25af87bd003fa750100dbb9fb1`; actual argv: `step.argv`. Public gate.log in that directory, SHA-256 `765324afcc13b99f820054aae9be253abba15501bf281c47067ecc1dd990d94e`. |
| `d1beb6f0`: document-owner and Native follow-up | FAIL. Inventory 5 passed, exit 0, 1481.329417 ms. Native 1,135 passed, 1 failed, 2 skipped; exit 1, 610313.331375 ms. Outer wall 612237.832375 ms; all children reaped. Original gate remains FAIL. END `3743d64a20e3ab8a0a25de4f34a10d2fc9c710fb`. | `artroom-evidence/2026-11-15-ce2-lw1-doc-native-followup-attempt1/result.json`, SHA-256 `a906559499e2df3101e42029f193687352e7fdffe2e1b63d8127c2dda9772050`; exact argv: `controllerArgv` and `commands[*].argv`. |
| Preserved Native acceptance and summary | The old page-first assertion expected unknown answer and phase; CE2 returned neither. Ruling `206d7d21` preserves that assertion. Summary exit 0, zero unknown/suite observations and contradictions. Natural Scale omitted outside scale paths; no Scale result. | Safe failure excerpt `artroom-evidence/2026-11-15-ce2-lw1-doc-native-followup-attempt1/native-final-failure.safe.txt`, SHA-256 `1c3b97c10a1099c5cffd03ee5b522545b7e0f4383df79f33e47adcba9eaf423c`; summary.log beside it, SHA-256 `087fbdb4532c6658920a580f2fbd3c260406e28cac3831124d7953a8b791f954`. |
| Superseded test-only `01d` repair | The reported 19-case test-only `01d` pass is superseded as the wrong contract. It supplies no acceptance or gate PASS. | Ruling `206d7d21f7dbb7836cd8cd5f90937559defa3aee`; the CE2 note preserves the historical result and private-raw limits. |
| `480508d8`: repaired joined whole owners | PASS. Client 4 in 1.096498 s; MCP 30 in 2.035818 s; CLI 4 in 4.131070 s; restored Native Page owner 19 in 24.334797 s; assets 1 in 0.298247 s, no module change; Security 12 in 4.050549 s; examples 3 plus reproduction 1 in 6.629733 s. Every exit 0, all reaped; separate stderr empty. Compatibility exit 0, 0.083077 s; outer 43.217284 s. All tuples reproduce unchanged, with no new compare or apply. | `artroom-evidence/2026-11-15-ce2-nf2-repair-dev-attempt1/2026-11-15-ce2-nf2-focused-owners-attempt1/result.json`, SHA-256 `a84f66b592aac911c1976137731d8fdc0b0449d00267da3b00c436071cc5c2fe`; exact argv: `commands[*].argv`. Fixture output stays private. |
| `480508d8`: ordinary full gate attempt 2 | PASS, exit 0 and verification exit 0, reaped. Child wall 835.491364 s; outer wall 835.811380 s. Node 204, Counting 56, Plain 4,877 plus 1 skipped, Native 1,136 plus 2 skipped. All four terminals complete; scope-stories module summary partial; 129 unknown/suite observations, zero contradictions. Native wall 496107.263708 ms. Natural Scale omitted outside scale paths; no Scale command/result/wall. Exact-head shared helpers and whole typecheck passed before START. END `97cec6f0d96e4551f671c2f1de18d40be30a3c5a`. | `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt2/result.json`, SHA-256 `edb3450ed7e22486e737a7a70dce0af85a432bea8ddeff169c11137848f0f98c`; actual argv `step.argv`. Inspected gate.log beside it, SHA-256 `93c76571a112f9501dc53b34d46775a54f601f89abee05db9204a1f0dbed4a1a`. |
| `480508d8`: Card workflow and root QA | PASS, all seven commands exit 0 and reaped; outer wall 129.689435 s. Chromium 153.0.8010.12, Playwright 1.63.0. Views 104 cases and 59 contracts, zero recorded errors; declared views 7; owned scopes 4; Grow 2 width cases at 320/592, zero errors. Root inspected 15 images; no overlay or horizontal clipping. Expected vertical scrolling at 200%. Generated bytes/mode and clean source unchanged. Four browser stderr streams each contain the existing 191-byte DEP0205 warning. END `6f299703cdf96532f7f287241fe1737aff5bc8c2`. | `artroom-evidence/2026-11-15-ce2-lw1-card-browser-attempt1/workflow-result.json`, SHA-256 `124db2549c714e258ae7612f3a303acdc73443255eba3f9d9e02b0ce0fea7f34`, actual argv and walls `stages[*]`; qa-summary.json beside it, SHA-256 `40ffe7d85708d68b4bd32220b696ccbd29524266b39765377e3ea262ae7b6b95`, with 15 reviewed image paths/hashes. |
| Browser process and private retention | No observed task process or browser profile remains. All 113 capture originals and full streams remain private; only 15 inspected image copies and closed metadata export. | Same public directory's process-check.json, SHA-256 `05beb3c68662b6515ed658b35a9c0a3560fb776b6c4896385be11ebc131f7db8`; privacy limits in qa-summary.json. |

The once-only comparison binds clean joined source `8a08f2a5`, tree
`7ec4d8b42bd456b30d07428e821d329598257c4f`. Its Counter drift stopped
adoption under the earlier boundary. Planner ruling
`0955cc13b38a32a23ba27e2d2d5b0384a0f3935c` then authorized one apply
of both measured 0.4 presentation fields. The Counter delta belongs to
CE2's shared Custody bundle input, not to LW-1. Grow and all entry,
definition-list and semantic identifiers remain the stop boundary.
The two measured fields were applied once at `38fec867`; Lending now
names `sha256:188f7b84e6b1ba29c2090265f4d7884a29884beff6ea58774a34ce8fbeef9f81`.
No version, pin, definition, scenario, signed packet or operator signature
changed in this TEST preparation.

No extra browser route, new refusal name, DOM behavior or modern web API
was introduced. The prior modern-web-guidance searches for “display error
messages” and “describe action failures” found no applicable guide for
these literal maps. The definition witness uses an in-memory judgment
and fold under scripted grants; it proves no hosted authority, installed screen or physical action.

Root retained the reviewed safe development files at the permanent paths
in the table; full Card request/display dumps remain private.
The earlier RS1/LS2 gate tested its earlier source, not these new words.
The joined CE2 gate attempt failed on the coupled settle documentation
snapshots. The unchanged inventory owner then passed, but its Native
follow-up failed on an existing unknown-answer acceptance assertion.
Both failures stand. Ruling `206d7d21` requires a production answer
repair and one new full gate, followed by the required Card workflow and
review. Focused repair validation and the new full gate passed at
`480508d8`. Card commands and root visual, privacy and process QA passed
under END `6f299703`. Browser scripts ran locally on macOS at this head.
The Linux workflows have not run at this head. Scripted host, transport
and report-text fixtures use public TEST keys; the OwnedCore/SQLite route
proves only its stated scope/signature/custody/replay boundary, not live
provider, physical-device, deployment or release authority.
The final source act and artifact reports record documentation checks and
the reviewed head/tree. Guarded review and landing follow this evidence
filing. The CE2 note now details
the eight actual gate 2 recovery metric rows and retains the gate 1
dataset as history. Neither failed route becomes a PASS. Full Native
request output stays private. RS1 and LS2
landed and published at `ce6f02ba` with normal receipt
`fdb8fbee`. The [CE2 note](2026-11-15-ce2-expired-custody.md) records that
baseline and the remaining gate order. Planner owns signing Lending and
Counter 0.4 from main that carries the joined head.

The final follow-up changes only these two implementation notes. Source,
tests, configuration, dependencies and generated modules keep the exact
Git blobs and modes from tested tree
`9306be3136c716ae7e91c97c2009d1810f9e2963`. Artifact reports and the
final source act bind the final note-only head and tree separately. The
[document-only follow-up rule](../../docs/evidence-filing.md#follow-up-after-a-gate)
applies; no additional full gate follows these note changes.
