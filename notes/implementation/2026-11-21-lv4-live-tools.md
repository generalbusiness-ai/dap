# LV4 live actions through the client, CLI, and MCP

Status: in progress. LV4 request `627719c96c2f00dba165a644857c271a9df08467`
in the [live level design](../2026-11-10-live-level.md). The review gate
and landing follow the parent LV3 retained-state bound.

## Native endpoint and CLI

The client sends a signed intent and its generation through `ScopeHandle.liveAct`.
The native route checks an issued read session before disclosing generation
information. The scope checks the signed intent against the exact scope and
genesis and dispatches it through `LiveTurns`.

`dap act` reads the pinned definition and selects the declared level. For
a live scope it reads the generation and item revisions, signs the intent,
and uses the live route. It returns the live answer, including a reset if
the generation changed. A reset requires a fresh read before another action.

## Installed application views

The live application read uses the existing bounded projection query and
returns declared fields and row identities at a generation and tick. The
native read checks the issued session, definition, installation, and birth
lineage before it reads live rows. This slice supports one non-final item
source. It leaves journal sources, related reads, routed views, and
parameterized or multi-subject actions for later work.

The app-only `view_live_act` takes a mounted view, cut, and offered action.
The host retains the exact installation query, child scope, generation,
subject, and revision. It checks the mounted cut and reads the current
projection before signing. A repeated call at the same cut returns its
first outcome. Live outcomes do not enter recorded custody.

The native bound action checks installation ownership on entry. After
standing, admission, and rule evaluation, it reads ownership again as its
last remote check. The turn then rechecks the local generation and tick
and commits synchronously. A replacement visible at the final read
refuses the action. That read gives no ordering guarantee for a remote
replacement after it completes. See planner ruling `8163372d`.

An exact bound retry checks the installation and returns its original
tick before draining due timers. If the installation changes between
the two proofs, the turn returns `unavailable` without a generation.

## Focused evidence

The native presence witness installs two packages that pin the same child
definition, issues a session, and drives enter, renew, and leave through
the native route. It compares the underlying journal and storage before
and after. The other installation cannot read or act on the first child.
A test-only wrapper selects the other installation for one final proof.
Both metadata reads and ownership checks run against the native scopes.
The refused act leaves the live tick, card, and storage unchanged. The
same signed act applies when the original installation answers again.

The same witness mounts the real MCP application view and calls
`view_live_act` through the native endpoint. One renewal applies, stale
and out-of-view requests refuse, and an eviction makes the old view
ineligible before it signs again. The custody store stays empty.

Logs under `~/play/artroom-evidence/2026-11-21-lv4-tools-focused/`.

| Check | Result | Log | SHA-256 |
|---|---|---|---|
| Client intent tests | 12 passed | `client.log` | `759b3231154afbb37aec19775bdf5f0dc8bd245c681c75da4aa204e829efc15e` |
| Native live turns, reads, and ownership | 20 passed | `scope-loopback.log` | `63a1d5af14d461455ff5e5df6f30561dc811862a7a9a0980f28429d3caf494cd` |
| Client, platform, and scope types | exit 0 | `types-final.log` | `3c2a5f0f49aacdb5fcff46dc1c3b8bf3d11c1d6afe88101fc76d6218053de541` |
| CLI live act | 2 passed | `lv4-cli-act-test.log` | `018af875190f46bd23f58ae30fea09143de5fa84b8751666f8dc8a0c4130cd00` |
| CLI types | exit 0 | `lv4-cli-typecheck.log` | `add25da8ff957ac9320a1bddb9d50498644e7b47cc55c76eb813307ee32710fb` |
| MCP declared views and view sessions | 28 passed | `lv4-mcp-views.log` | `364a8919d7460f9a9ab57cc9c0959b4596d965582f81247c33ed2d83ba4289dc` |
| MCP types | exit 0 | `lv4-mcp-typecheck.log` | `c1e1f1c2bbd0cff21cb159852caefece8652f03525b695b9f47a14976469405b` |
| Installed native and MCP presence witness | 1 passed | `lv4-mcp-presence-final.log` | `088ea5cce46a735981963cc0bf41965a0bc50a1ad71b45f608c5bc38905360bb` |
| Security entry-point inventory | 13 passed | `lv4-cli-entrypoints-final.log` | `29df8e826377eca6e4b3e23d5182c712be68a92b68999c2a11bb8c2d22d6f8d2` |
| Bound retry with a due backlog | 10 passed | `lv4-bound-repeat.log` | `8949d61232128bbeebe22b37209a457798c5e7a37b5d820a3c3ad3d7d9ee04bb` |
| Scope types after bound retry | exit 0 | `lv4-bound-repeat-typecheck.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |

## Integration with O1

The LV4 commits applied to `3243aad242`, the gated O1 head. The bound
turn verifies the installation before the synchronous judgment. That
judgment uses O1's staged fold and fixed generation budget. The bound
retry returns its accepted tick before any due work. A fresh refusal
leaves both the meter and the watch at the committed tick.

The combined source and tests ran at `92da3bf6633168efc6f7b25986c1aeb2e4fee4cb`,
tree `5e705a1ebb7c7e1c762c19f1bcc5ca603bc2b83f`. The native selection
covers the actual installed MCP route, live turn and reads, projection
ownership, and the confirmed child and budget witnesses.

The shared client and tool changes affect generated browser output.
Open Lending 0.7.0 and Counter 0.8.0 take the reproduced presentation
identifiers below. They keep their existing definition and semantic
identifiers. The asset generator rebuilds the room module. The before
and after manifest confirms the signed packets and deployment inputs
keep their original hashes and sizes.

| Output | O1 | LV4 |
|---|---|---|
| Lending 0.7.0 presentation | `5b129add361afada59c5f734e880987cd11b369df289d25c4e7380be65744281` | `69511e475914684cb4709b1d5019b62da4a35afc70ef5142732c6c339e50df81` |
| Counter 0.8.0 presentation | `789f6fe20feb2083164a9162ae4688776f60334a19e45825a59db5c4bd24b710` | `cab21be343a4548f20daa7e2aade502d12199e5a8505fe7bdf93a1fda858a399` |
| Generated room asset module | `f2b9c0168b41639183b2da3cbd8e1de0efcebab4ff0ad2f2048bb89253df4cd2` | `9e5003613c294b5279326f64169908cf125b22e6b56a2242ce68be75f86ee868` |

Combined logs under `~/play/artroom-evidence/2026-11-21-lv4-on-o1-focused/`.

| Check | Result | Log | SHA-256 |
|---|---|---|---|
| Combined native scope | 24 passed | `native.log` | `975ff97ff563e995a3a8fc3dc8343d6ad5ce541be8e4857ad9b2776c1d5974fd` |
| Platform, client, and scope types | exit 0 | `typecheck.log` | `c90db78e81e9052f4c918b1295f01025ed786580579579d82819a75d3bcd9e60` |
| Client, CLI, and MCP tool tests | 42 passed | `lv4-on-o1-focused.log` | `836e6be675ce55d14ac69647c31cb320adb2344e270df72b6f7689745d070e63` |
| CLI and MCP types | exit 0 | `lv4-on-o1-typecheck.log` | `7ed045e749955791a86bcee355f2067f17ac8234ef1377f8cfbd98b72185e02d` |
| Entry-point inventory | 13 passed | `lv4-on-o1-security.log` | `092f94871f29a2c289f3dba1160b52e5ae4a47eddb2fb0707bd14d601fcc44b9` |
| Card resources | 6 passed | `lv4-on-o1-card.log` | `42b1187363ae368886355dfe97cd409735bb7146580c56f969ea1b833479bdee` |
| Refreshed package reproduction | 1 passed | `artroom-lv4-refresh-release.log` | `4fa4f00c11967333dac9e7a38766d1db3ce589ce9d4ebbe114299ab7c36e8b96` |
| Refreshed room assets | 1 passed | `artroom-lv4-refresh-page.log` | `224e01598b8649b00af9e59e7b8ce351263c292c771da45aaafdef9a550a662a` |
| Generated before and after manifest | 11 protected files match | `artroom-lv4-generated-manifest.json` | `e5ffe1645d22a646fc11c43a96b2d3bd977509d477dc4fb6e60f7a8b64d3f8f9` |

## Client test dependency boundary

The first full gate at `4192998081e8f83e1fa10d4b5902bf795f343b58`, tree
`f2012f8a4833198cbbceee81eb349d5182ea06ff`, exited 1 in 188.37 seconds.
The Node stage passed 245 cases and failed `scripts/active-source.test.mjs`
because the intent test imported the platform codec directly. The gate
stopped before counting, plain, and native tests. Its log at
`~/play/artroom-evidence/2026-11-21-lv4-gate/gate.txt` has SHA-256
`1a3477dd827d8da8e709cd77ebe2e3c211d5cb32788aabb6e24a38fe240c09d8`.

The exact-query witness now lives in the client's authorized
application projection test owner. Its positive and negative cases
remain intact. The correction changes only those two client test files
and this note. Corrected logs are under
`~/play/artroom-evidence/2026-11-21-lv4-retry-gate/`.

| Check | Result | Log | SHA-256 |
|---|---|---|---|
| Active-source inventory | 12 passed | `active.log` | `69495edcb580c47a015893d24aff6f8e3854fb70cba0e240b793d39e00aba2b6` |
| Client intent and application projection | 16 passed | `client.log` | `4544efab93c437b194333aeb0e41cf68034d1c6bd5b816aefbefc8e94f0ed98b` |
| Client types | exit 0 | `typecheck.log` | `93d077e30835a17c82425abeab78e368f3aaae2d1ee44b05b5fa8291b6391430` |
