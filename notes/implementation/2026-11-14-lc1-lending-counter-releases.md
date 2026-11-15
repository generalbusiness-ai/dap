# LC1: signed releases for dap-lending

Request `91829f2eb72201e35d9d7f35bb48e633347f51e7` and promise
`e380f82004841671aef4dbb3a37c5d4b7e5cac80` track this head. Canonical
ruling `bdeb6c151cd25e6b13259f6d6a48070dc3719723` separates LC1 from R.
LC1 starts on main `57f887ce066448133d0bd0fe611d0935cc6eb0ed`.

## Packets and deployment configuration

The two versioned packets retain the exact public blobs from planner
branch `64d3d6c143d45a8d7326a0541e4dafcd911869ee`, recorded by signing END
`196d99b7f64167effbe5e745b0d797ece5189d11`:

- `examples/lending/releases/0.2.0/application.dap.json`: blob
  `e4e43a0195d01529b9b84dd6769d6295b3805b44`, 2,501,114 bytes,
  SHA-256 `e451349b823028ae7840da76569319c32a7051acab8819dc4e3d69194b957f8a`.
- `apps/counter/releases/0.2.0/application.dap.json`: blob
  `22a65663e2f02d722611daab0bdc9a866ec5eed6`, 2,592,135 bytes,
  SHA-256 `5128da8bb50f2c05188101c44bf35f0bcae458803fc5e5aa1e855aeb13fe4109`.

The formatter excludes these paths alongside both existing Grow packets.
Its existing owner checks all four tracked paths. No copied identifiers
file or constants module enters this head.

Only `wrangler.lending.jsonc` changes Worker configuration. Its trust
rows name signed Lending release
`sha256:93819e267db04a8615dc63c202e39622fbca47cb2ca4aee58d221fd9cb679824`
and signed Counter release
`sha256:f681c1b5615139d76ee8612a1d253b6d314f200cb8dd0686c18cd6bf399aef0c`.
Both rows require publisher
`key_qNT9aIt0WhJndvMP7UV33FFJ7DOYwW0JUvOv4PhNlFI` and host `github.com`.
The file binds `APPLICATION_CONTENT` to the private bucket
`dap-lending-application-content`. The planner creates that bucket before
deployment and records the operation. Screen hosts remain empty.

## Reproduction boundary

The existing canonical reproduction owner still prepares Grow, Lending
and Counter with the public TEST signer and compares their current
identifiers. Its existing published Grow check stays intact.

For dap-lending, the published reader first validates both versioned
packets and discovers their releases. Each actual trust row then selects
one committed packet. The same reader reads that packet with the row's
exact release, and the witness compares its publisher with the row.
A missing packet or a mismatched publisher fails. The sorted trust and
packet release lists must match exactly, including multiplicity. Row
order grants no meaning. The witness also checks the exact private bucket
binding.

When a packet's manifest version equals the authored version, its
identifiers must equal the current `release-identifiers.json`. The
failure tells the developer to raise the version before changing a
signed release. A later authored version skips the old 0.2.0 packet's
current-identifier comparison. Its published-reader and trust-row checks
still run.
The packet itself supplies its identifiers. LC1 adds no baseline copy.

## Evidence

Development END `ccb3ec32809ac87b0f35cc157e0348aad5b4d732` records a
PASS at clean source `547ef30c96c3549820c29db191c957eed440e68b`, tree
`5428593a2a94a0391ad237f20004f59c6363fd83`. That source builds on NF5
main `57f887ce`; it has not integrated C3. The checks below establish
bounded development readiness at that source, not a gate or deployment.

`W` is `/Users/hughpyle/play/artroom/.builder-worktrees/lc1-lending-counter-releases-20261114`.
`D` is the authentic owned C3 donor at
`/Users/hughpyle/play/artroom/.builder-worktrees/c3-resign-admission-20261114`.
`E` is `/Users/hughpyle/play/artroom-evidence/2026-11-14-lc1-development-attempt1`.
`N` is `/opt/homebrew/bin/node`. Commands run from `W` except the two
CLI owners, which run together from `W/packages/cli`.

The setup rechecked all 17 current and committed metadata inputs before
one copy into the absent target. The copied stamp matches lock
`8b2ae5f7108ce36cf84753d99d4248d59cc21251d5e01da3da37a111bb495e20`.
Its 15 relative workspace bindings resolve into LC1, all 57 source
export targets exist, and 107 installed non-link package metadata files
equal the donor bytes. No install, restamp or preserved-view mutation ran.

| Check | Actual command | Result and wall | Retained output and SHA-256 |
|---|---|---|---|
| Owned dependency copy and metadata audit | `/bin/cp -cR D/node_modules W/node_modules` | One copy, exit 0; 0.686329792 s | `E/dependency-audit.json` — `86adf893ce6829a2fa1802134c53d142c6695803a20788399e670fc1402ba83d` |
| CLI test compiler | `N node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json` | Exit 0; 0.932685542 s | `E/cli-test-compiler.stdout.log` and `E/cli-test-compiler.stderr.log`, both empty |
| Whole canonical packet formatter owner | `N --test scripts/format-json.test.mjs` | Exit 0; one passed, zero failed, cancelled, skipped or todo; 0.185423458 s | `E/formatter-owner.stdout.log` — `b46b6c452b64f62b7100c3d6553032ca7c1eff0decf386f03f55bfeab3facbff` |
| Maintained compatibility prerequisite | `N scripts/cloudflare-pool-compat.mjs` | Exit 0; `copied:false`, accepted bundle unchanged; 0.089407000 s | `E/compatibility.stdout.log` — `4bbde52e48a6ebcd8e993840da6a340a4cd78571c1fff0ef83f5991e5cde6f62` |
| Whole canonical reproduction and configuration owners | `N ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/application-release-reproduction.test.ts test/demo-config.test.ts --reporter=default --reporter=json --outputFile.json=E/cli-owners.report.json` | Exit 0; one reproduction and six configuration cases passed, zero failed, pending or todo; 3.427555959 s | `E/cli-owners.report.json` — `b96c94f65bab97b2e40fee6b9c55b60f133e2f5bf5ce1bfa5fc86318b15a7e5f`; `E/cli-owners.stdout.log` — `a40b80112bcd8c5df0cbfbe37d78badb4dc7e3fd14776d51bd08b915290cd8f1` |
| Actual C3 main integration and applicable preflight | Await actual C3 landing and root authorization | OWED | No result claimed |
| Gate and checker review | `npm run gate` at the final authorized head, then review | UNRUN | No result claimed |

The stderr files `E/cli-test-compiler.stderr.log`,
`E/formatter-owner.stderr.log`, `E/compatibility.stderr.log` and
`E/cli-owners.stderr.log` are empty. Each empty stream has
SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
The command ledger is `E/commands.json`, SHA-256
`89ab68a76183d342fe0c172d662260acb149d9fc5e9fb14f7758d567f957df92`.
The result is `E/result.json`, SHA-256
`931aa0aabe10d9286fd62c39ecdc18b932adc93003716c85fae6900550132b0d`.
The measured development outer wall was 4.635378250 s, excluding the
separately timed dependency copy.

At this NF5 base, the actual signed 0.2.0 packets passed the row,
publisher and equal-version identifier checks. The packets and rows
remain exact. This run does not establish post-C3 reproduction or gate
readiness. LC1 must merge actual C3 main before its gate and reconcile
the changed inputs through the required preflight.

LC1 owns no provisioning, installation, signing, deployment, screen host
or install context. NF7's hosted Counter witness remains held under its
own request. R retains reservation source and its later signing boundary.
LC1 takes the first ready gate slot after C3 without displacing an active
START. Further execution needs a later root grant.
