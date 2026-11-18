# Head Q: the lending file names both registers

Head Q (request `812ba1e9`) follows the UC-P window (act `6bb41a23`). The
window deployed `LENDING_W` (`918e7ab4`) with command-line values: the
upgrade-cohort register `sc_tf5obyru…` (Register 29) is current, and the
base register `sc_psbin3zi…` (Register 28) stays installed. The tracked
`apps/room/wrangler.lending.jsonc` still named the base register alone. A
deployment from main before this head therefore acts as a rollback, and
rooms under the new register lose child creation and Git host authority.

This head makes the tracked file match `LENDING_W`.

## The change

`node scripts/register-values.mjs lending --keep` with the register and
genesis from the window's operator home (`installed_ref`):

- register `sc_tf5obyrusx65k6puimvjl527cg65smskrjhmtddb4kysugyrbfka`
- genesis `sha256:28780c2e2c24c4f51247963fc9b4f6d76a309f33442bf88d204fc09e41d03cac`

The script changes three values in `wrangler.lending.jsonc`:

- `REGISTER_SCOPE` names the new register.
- `ARTIFACTS_CONFIG.registerScope` names the new register. The namespace,
  host, byte limit and credential identity do not change.
- `INSTALLED_REGISTER_SCOPES` names both registers.

The script writes the list as `[base, new]`. `LENDING_W` has `[new, base]`.
Every reader treats the list as a set: `installedRegisterScopes` checks
membership and distinctness, and host authority, the archive and creation
lineage test membership only. So a deployment of this head behaves the
same as `LENDING_W`.

## Tests

`packages/cli/test/demo-config.test.ts`:

- UC-P's case kept the assertion that the base register alone is installed.
  That assertion described the file before the window, so this head removes
  it. The pin checks stay.
- A new case reads the lending file with the production
  `readInstalledRegisters`. The current register is `REGISTER_SCOPE`, it
  differs from the base register, and the installed list is exactly the base
  register and the current register.

## Order

U4-T and the `SCREEN_HOSTS` head each change `wrangler.lending.jsonc` and
each ends in a lending deployment. Both build on this head (approval
`691bae0b`).

## Red

| Red | What was broken | First failure | File | SHA-256 |
| --- | --- | --- | --- | --- |
| The base register stays installed | `INSTALLED_REGISTER_SCOPES` lists the new register only | the new case; 7 other cases pass | `red.txt` | `93181cab29d16d9d2d4f086ddec842fd2d479ccc6390250109dc1ee63ceb634c` |

The output is in `artroom-evidence/2026-11-18-q-red/`.
