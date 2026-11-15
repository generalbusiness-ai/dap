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
measured presentation fields applied once. Actual gated head and tree and
gate outcome remain OWED.

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
| `ed48b64d`: normal two-file source commit | Exit 0, 1.223115 s; normal hooks checked 950 source files against 159 bytes exports. Clean worktree after commit; modes 0644. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-lw1-source-commit-attempt1-20261115/result.json` (`b68c01fecc7b37b7f80a39182a91687ed4073e0320dd1992e0c83127d380d99a`); exact proposal/case-preservation guards and actual hook streams beside it. Actual argv: `commands[*].argv` in that record. |
| `ed48b64d`: Lending compiler contexts | Source/test context: exit 0, 0.840027 s; browser context: exit 0, 0.308617 s. Compatibility: exit 0, 0.089305 s on the owned dependency view. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-lw1-focused-attempt1-20261115/result.json` (`8dfd4710f7ad1d2850bec55afa05b2feda5a72dcc8f2df1f27159d5f8fb55a92`). Actual argv: `results[*].argv` in that record. |
| `ed48b64d`: whole definition and browser model owners | 13 tests passed in 2 files; exit 0, 1.264737 s. The actual third-reserve words passed. | Same focused result (`8dfd4710f7ad1d2850bec55afa05b2feda5a72dcc8f2df1f27159d5f8fb55a92`) and `lending-owners.stdout` in that directory. Actual argv: the same focused result.json `results[3].argv`. |
| `8a08f2a5`: joined normal three-way comparison | PASS, exit 0, 1.888492 s. Grow exact; entries, definition lists and semantic IDs exact. Lending presentation measured `188f7b84…`; Counter presentation also changed, requiring planner disposition. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-compare-attempt1-20261115/comparison/comparison.json` (`8f61f97b3d4768aa6ce4505ec49e95f75bb8b42cbfdde52d26a5af684a2868f9`); END `b7f7ded2`. Actual argv: ../execution.json, SHA-256 `00c9eac0da06aa58de1183d650a9f9049cbe612563b49eba4d97638197dd2ed3`. |
| `38fec867`: permitted presentation apply | PASS. Apply: exit 0, 0.266111 s; normal commit with formatting hooks: exit 0, 1.216504 s. Only the two measured presentation fields changed; source clean. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-adoption-attempt1-20261115/result.json` (`4c1dcee01470991cb47cd3692dc3569dc9b55768b50d55b67c2e03e8e84516af`); END `de371b383e5a807e63eed01c106c4797f96c5009`. Actual argv: `results[*].argv` in that record. |
| `38fec867`: whole CLI examples/reproduction owners | PASS: examples 3 and reproduction 1, all 4 passed; exit 0, 7.245860 s, empty stderr. END `eee6f777083cd17a9d595a3a839de32e2b5ac273`. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-reproduction-attempt1-20261115/result.json`, SHA-256 `9d66bd799434f9f6634e85bdf1f98995ff2a69da72fd9b6136cfb546484d3049`; actual argv: `results[*].argv`. |
| Permanent safe development retention | 61 explicitly reviewed files across the joined work; no full Card request/display dump copied. Metadata record, not a test command. | `/Users/hughpyle/play/artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/retention-index.json`, SHA-256 `06bb9e468eb9aff6dbaf213b16689a5bdc13df69291d88cef325d520c2caf3b2`. |
| Final preflight, joined gate and review | OWED. No gated head and tree or gate PASS is claimed. | Future records not yet available. |

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
The joined CE2 gate, required Card workflow, review and landing remain
OWED. RS1 and LS2 landed locally at `ce6f02ba` with normal receipt
`fdb8fbee`. The [CE2 note](2026-11-15-ce2-expired-custody.md) records that
baseline and the remaining gate order. Planner owns signing Lending and
Counter 0.4 from main that carries the joined head.
