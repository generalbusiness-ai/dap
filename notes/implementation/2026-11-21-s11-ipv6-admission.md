# Bound IPv6 creation and control windows

Request `23872726` and promise `4bf8d639` group IPv6 addresses by /48 for
the creation and hosted control address windows. IPv4 and mapped IPv4 remain
keyed by full address. Other address consumers keep their existing keys.
The address check still precedes the signing-key allocation; no authority or
route changes.

## Decisions

One /48 now shares one address window in each of the two affected tables.
This bounds the keys one prefix can introduce without another counter table
or a new eviction rule. It also makes legitimate /64s in the same /48 share
that allowance. At default limits, the 8,192-row creation table can hold at
most 31 rows per address: one address and 30 fresh keys. It takes at least
265 distinct IPv4 addresses or IPv6 /48s to fill an empty table that way.
Each 4,096-row hosted control or cleanup purpose can hold at most 121 rows
per address: one address and 120 fresh keys. It takes at least 34 distinct
addresses or /48s to fill one empty purpose table that way. Existing rows
remain usable and new identities share bounded overflow when a table fills.

## Focused evidence

The local fixture checks ran at `58af5878618f92770af12d3544f4c6a458cdca8e`,
tree `325ad62b80379cba36bdb43ad23f35a960e18ebf`, on LV4
`446e2ab8d0d7ec6ab477e32b11cd925620c2ef5b`. Their files are under
`~/play/artroom-evidence/2026-11-21-s11-on-lv4-focused/`. The O2 carry
`40e31994be5c7f4565b030b2f6ccde74b22528b2`, tree
`633256a3cf51cc0a738a20fa754539a9e60253f0`, ran its inventory and affected
typechecks separately under `~/play/artroom-evidence/2026-11-21-s11-on-o2-focused/`.
The security group carries the same S11 production and test files and its
documentation at `2ebf2b50a0477a69559728edd8130138225f2837`, tree
`41eecfdd67622870578bbb032c8b5f427e158225`; its inventory also keeps the
independent S6, S7 and S10 seals. The previous local runs do not establish a
gate on the group.

| Check | Command | Exit and result | Output and SHA-256 |
| --- | --- | --- | --- |
| Creation fixture, LV4 | From `packages/scope`: `../../node_modules/.bin/vitest run --config ../mcp/vitest.config.ts test/serving-limits.test.ts -t 'one IPv6 /48 cannot fill creation windows' --maxWorkers=1` | 0; one passed, five unselected. Three hundred /64s in one /48 admitted 30 keys and held 31 rows; another /48 and IPv4 controls passed. | `creation-final.log`: `7311f9331948ea6b6de5b871b66d52a8e8662f74344f0a927a684558b9617f01` |
| Control fixture, LV4 | `node_modules/.bin/vitest run --project scope-stories packages/mcp/test/oauth-clients.scope.test.ts -t 'one IPv6 /48 cannot consume control windows' --maxWorkers=1` | 0; one passed, four unselected. Forty /64s with 120 fresh keys each admitted 120 calls and held 121 rows; another /48, cleanup and IPv4 controls passed. Local Workerd only. | `control-native-escalated.log`: `6c77ef9a37c60ef0961f7da647cbea669948ca3166da6acdc5a85466174a0c7c` |
| Security inventory, O2 | `node --test scripts/security-entry-points.test.mjs` | 0; 13 passed | `s11-o2-security-20261121.log`: `f6089665164bb172d77490659e128337915a85b2ce34a2ed9930032fae5c98fd` |
| Types, O2 | `npm run typecheck --workspace @generalbusiness/dap-bytes`, then the same command for `dap-scope` and `dap-mcp` | 0 each | `s11-o2-types-bytes-20261121.log`: `ff3f3a0307660d6a3bcadfd4ae99f97c76da1f3c118c461674b9a43f17c7c8a8`; `s11-o2-types-scope-20261121.log`: `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976`; `s11-o2-types-mcp-20261121.log`: `c1e1f1c2bbd0cff21cb159852caefece8652f03525b695b9f47a14976469405b` |
| Security inventory, assembled group | `node --test scripts/security-entry-points.test.mjs` | 0; 13 passed | `~/play/artroom-evidence/2026-11-21-security-group-focused/inventory.log`: `26188e68b1ed56d1fc81179d328484f77408a44099539bb6b3a2aa85c667c7f1` |
| Documentation links, assembled group | `node scripts/check-doc-links.mjs` | 0; 1,263 links checked, none broken | `~/play/artroom-evidence/2026-11-21-security-group-focused/doc-links.log`: `f7e2079a2c8c6a91e1f5bc4b6044bccc8fedac02ff0387e9b75059d29b60efa0` |

The LV4 command record retains the selection and earlier setup failures. The
O2 command record has SHA-256
`35f82ead7458e238a7a51c077dcb087b11645f71c10b521dd607e0dba392b85c`.
The assembled-group checks ran with this new note untracked; the evidence
rows above were added after the checks.

## Open limits

S11 still needs the security group's validation, gate and review. The local
witnesses do not establish provider, network or account behavior. The
per-address allowances can still be exhausted by sufficiently many distinct
addresses; this change does not claim otherwise.
