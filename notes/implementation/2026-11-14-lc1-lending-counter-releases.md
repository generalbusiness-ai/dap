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
A missing packet or a mismatched publisher fails. Row order grants no
meaning. The witness also checks the exact private bucket binding.

When a packet's manifest version equals the authored version, its
identifiers must equal the current `release-identifiers.json`. The
failure tells the developer to raise the version before changing a
signed release. When R raises Lending to 0.3.0, this comparison skips the
old 0.2.0 packet. Its published-reader and trust-row checks still run.
The packet itself supplies its identifiers. LC1 adds no baseline copy.

## Evidence

This is a source-only checkpoint. Static byte comparisons confirm the
two copied blobs, lengths and SHA-256 values above. The planner's signing
END owns the earlier signature-reader checks. LC1 has run no reader,
import, compiler, formatter, test, producer or gate.

| Check | Planned owning command | Current result |
|---|---|---|
| CLI test compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json` | UNRUN |
| Canonical packet formatter owner | `node --test scripts/format-json.test.mjs` | UNRUN |
| Canonical reproduction owner | After the maintained compatibility prerequisite, from `packages/cli`: `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/application-release-reproduction.test.ts` | UNRUN |
| Existing configuration owner | From `packages/cli`, with the same compatibility prerequisite: `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/demo-config.test.ts` | UNRUN |
| Gate before review | `npm run gate` at the final authorized head | UNRUN |

LC1 owns no provisioning, installation, signing, deployment, screen host
or install context. NF7's hosted Counter witness remains held under its
own request. R retains reservation source and its later signing boundary.
LC1 takes the first ready gate slot after C3 without displacing an active
START. Dependency preparation and all execution need a later root grant.
