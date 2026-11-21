# LV4 live actions through the client, CLI, and MCP

Status: preparation. LV4 request `627719c96c2f00dba165a644857c271a9df08467`
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
