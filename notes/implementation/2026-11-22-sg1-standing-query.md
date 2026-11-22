# SG-1 standing query through the application gateway

SG-1 permits the exact signed session POST
`/v1/scopes/{scope}/sessions?standing=1` through the application gateway.
The signed body and the native session authority stay unchanged. A native
sandbox witness requests standing and checks the returned membership and
active key.

The gateway test refuses duplicate, encoded, extra, empty, and alternate
query values. It also refuses the query on other methods and on the act and
settle routes. The combined client test adds mixed-case and uppercase query
keys to those refusals.

## Open presentation pins

Planner ruling `ca7b5375` permits the open presentation pins to follow the
changed browser bundle. The signed packets and their versions stay unchanged.

| Application | Open version | Previous presentation SHA-256 | New presentation SHA-256 |
|---|---|---|---|
| Lending | 0.7.0 | `69511e475914684cb4709b1d5019b62da4a35afc70ef5142732c6c339e50df81` | `c3ba4ba634c21a9918e118009624164c481731a35d0f0e38f08d7b5c4f7bf03e` |
| Counter | 0.8.0 | `9a046642d592ee5877de78871f810dca639c89abb6e4a9ae7d55c10ced278753` | `8c4a18a5e41ae42aa0444d21b8589b2ac69a52e2c56f36c60dc40ae29a7ce12f` |

Lending's tracked signed packets end at 0.6.0. Counter's end at 0.7.0.
The definition and semantic pins do not change.

## Evidence

The standalone SG-1 source passed the gateway owner, 5 tests, and the native
sandbox owner, 10 tests. The security inventory passed 13 tests, and the
client and scope test TypeScript contexts passed. These logs precede the
case-variant test rows and are under
`~/play/artroom-evidence/2026-11-22-sg1-on-e5-focused/`.
The combined CJ-1 and SG-1 gateway owner then passed 5 tests with those rows.
Its raw log is `~/play/artroom-evidence/2026-11-22-dab2406-cj1-sg1-focused/gateway.log`
with SHA-256 `7e9dd713d84590673514a37d4636181b85cf08a3534a01929d8a9a715d56dc7e`.

The original combined release reproduction failed on Lending's presentation.
Its log is `~/play/artroom-evidence/2026-11-22-dab2406-cj1-sg1-focused/cli.log`
with SHA-256 `eecc8fe9bac30f049b1a2bb96d23c5264e7aed53712f4184cb67785429fded23`.
The standalone controls under
`~/play/artroom-evidence/2026-11-22-sg1-release-controls/` reproduce that
failure for SG-1 and pass for CJ-1 alone. After the Lending pin changed, an
independent reproduction found Counter's presentation mismatch. The next
run passed after the Counter pin changed. Both runs are under
`~/play/artroom-evidence/2026-11-22-sg1-open-pins-focused/`. The final run
checks the Grow source and published packet, Lending and Counter sources,
their tracked signed packets, and deployed trust rows. Its `run-2.log` has
SHA-256 `a0c7bcb23bdf7dcb3df77558c44163e39357626d25a0cb0c7a6aed5a9abfea0c`.

The official gate and named security review follow CJ-1.
