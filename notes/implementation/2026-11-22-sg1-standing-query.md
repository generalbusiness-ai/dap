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

At clean candidate `b08d652d71c26eee6868cd0621befcf00b65bc58`, tree `4310e56e`, on published CJ-1 `087b1a6`, `npm run pins` passed in 21.592 seconds. It checked generated Page and OAuth equality and release reproduction. The signed release packets remain unchanged. The gateway owner passed 5 tests, the native sandbox owner passed 10 tests, and the client and scope test TypeScript contexts passed. Their commands and raw results are in `~/play/artroom-evidence/2026-11-22-b08d652-sg1-published-cj-focused/`:

| Log | SHA-256 |
|---|---|
| `pins.log` | `b645d9e00fa45fe32ecfd81ef69c854b4b329ddd515195020eb4c5b5fcf8f693` |
| `gateway.log` | `c23c8f50d86b50a2882382064476079f2189316de5f885f0fe0e5242d8577685` |
| `native-loopback.log` | `c6a7ada259a39f9fba45fd6c87da00859a0ce01404615e2c3c3d9f79718d7328` |
| `client-tsc.log` | `5aafbced0054965646b93f63d6ee8b7e08b1d31550ecb9e305778050bfda640f` |
| `scope-tsc.log` | `d02da1a5d6f3351b7e0ddfa680fc8f74ae061d860da56489c6c6caca99e64690` |

The earlier pins run stopped for deployment after its security phase passed. Its partial log has SHA-256 `1733db58a0d7eb91f72761903c1b2afaf249e6b4e82386546807d7fb463b6a79`. The first native run could not bind loopback in the sandbox; `native.log` has SHA-256 `588f1efe8948dd2c9367e971d5927d9bfc9c11ad2806e2539e04cfa9cbf11684`. The subsequent scoped loopback run passed.

The full gate ran at clean commit `a4e640857564d58e4680fe26c70c923188081beb`, tree `d19fcb2164d5723d2633f3a0e1b53f1cf96cb8aa`, over published `189152da`. END `14be0ff601d2163aa0da534c2182793e2338f929` records its natural exit and wall time. Source and tests remain unchanged from the gated tree.

| Check | Command | Exit | Output and SHA-256 |
|---|---|---:|---|
| Full gate | `npm run gate` | 0 | `~/play/artroom-evidence/2026-11-22-a4e6408-sg1-gate/gate.txt`, `a1233923805ca516b2b4e108ff7c43e5c5b5dbd3ea63eaab14d51cb5af8544ec` |

The gate took 1,337.38 seconds. Its count lines record Node 246, Counting 60, Plain 5,127 passed and one skipped, and Native 1,240 passed and two skipped. Scale was omitted. The ownership accounting reports zero lost, two stale, and zero without an owner. The named security review remains pending.
