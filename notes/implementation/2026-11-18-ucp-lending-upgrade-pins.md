# UC-P: dap-lending admits the upgrade cohort

UC-P (request `bd2560cb`, decision `ab65d84d`) is the first step of
route (1) in report `1b0b671c`. U4 and LS-7 need a room with Rules 16,
and only the `upgrade` cohort supplies it. Each hosted Worker has one
current register, and dap-lending's register `sc_psbin3zi…` is a base
cohort register (Register 28, Rules 15). Definition succession is not
built, so no act moves an existing room to Rules 16. Route (1) gives
dap-lending a second, upgrade-cohort register and keeps `sc_psbin3zi…`
installed.

## The change

`apps/room/wrangler.lending.jsonc` adds three pins to
`PLATFORM_CREATION_PINS`: `platform:register@29`,
`platform:directory@28` and `platform:rules@16`. These are the three
upgrade-cohort definitions that the base cohort lacks. Membership 14,
Destination 21 and Inbox 1 are already in the list.

`deploymentCreationDefaults()` (`packages/platform/src/version-relations.ts:128`)
admits the base, failed-claim, archive-device-publication, unpublished and
commons cohorts only. Without these pins, the Worker refuses a planned
Register 29 install even when `REGISTER_SCOPE` names it.

`REGISTER_SCOPE`, `INSTALLED_REGISTER_SCOPES` and `ARTIFACTS_CONFIG`
do not change.

## No live room changes

The pins decide which definitions a new scope may use. Historical
loading and replay do not read them, and they change no existing scope's
pin (docs/deploy.md, "Roll out new creation versions"). A new scope under
`sc_psbin3zi…` takes its definitions from its parent: Register 28 creates
Directory 27, and Directory 27 creates Membership 14, Rules 15 and
Destination 21. No act in a base-cohort room names Register 29,
Directory 28 or Rules 16. So lending-library, lending-shelf and
counter-witness create the same children as before, and only a planned
install of a Register 29 can use the new pins. While `REGISTER_SCOPE`
stays `sc_psbin3zi…`, the Worker refuses any parentless creation other
than the signed install of that register, so no Register 29 can start
before the window.

## Tests

`packages/cli/test/demo-config.test.ts`:

- The room-policy table names lending's exact pin list with the three
  new pins.
- A new case reads lending's policy with the production
  `readPlatformCreationPolicy`. Every `UPGRADE_COHORT` pin and every
  `BASE_COHORT` pin is admitted, and `readInstalledRegisters` still
  answers the single current root.

## The window

The planner deploys this head with `deploy.mjs lending` and a rate read.
Record the deployed version ID as `LENDING_P`. Then the planner runs the
window. A plan expires 14 minutes after `--plan` (docs/cli.md:122), so
steps 2 to 5 must finish within that time. No gate runs during the
window. The shell helpers `DAP`, `planned_scope` and `installed_ref` are
those of the cutover runbook
(`artroom-evidence/2026-11-14-cutover-deployment-prep/cutover-runbook.md:54-63`).
`$WT` is a checkout of main at this head or later.

1. Make a new empty operator home, mode 0700, and set `DAP_HOME` to it.
2. Plan:

   ```sh
   $DAP install --plan https://dap-lending.inguz.workers.dev --host artifacts --namespace dap-lending --cohort upgrade
   NEW=$(planned_scope $DAP_HOME); OLD=sc_psbin3zi4ld7kqxg4vdbmb2eudyca64e5mxarz3k4qmklrpyfokq
   ```

   The output names `platform:register@29` and the seed's time `<T>`.
3. Deploy main's tracked file with the new root current and the old root
   kept:

   ```sh
   cd <scratch> && WRANGLER_SEND_METRICS=false caffeinate -i npx -y wrangler@4.147.0 deploy --keep-vars \
     --config "$WT/apps/room/wrangler.lending.jsonc" \
     --var "REGISTER_SCOPE:$NEW" \
     --var "INSTALLED_REGISTER_SCOPES:[\"$NEW\",\"$OLD\"]" \
     --var "ARTIFACTS_CONFIG:{\"registerScope\":\"$NEW\",\"namespace\":\"dap-lending\",\"host\":\"6e953d231f1c9aadffbf59537a82e13a.artifacts.cloudflare.net\",\"maxBytes\":10485760,\"credentialIdentity\":\"adapter-attempt\"}"
   ```

   Record the version ID as `LENDING_W`. `REGISTER_SCOPE` and
   `ARTIFACTS_CONFIG.registerScope` must be equal, or register health
   reads misconfigured. `/health` names `LENDING_W`. The register value
   stays other than `ready` until the install.
4. `$DAP install --planned`. The output names `platform:register@29`.
5. Within 900 seconds of the install: `$DAP create upgrade-witness --handle @upgrade-operator`.
   The output names `platform:directory@28` and `platform:rules@16`.
   `$DAP verify rules` names `platform:rules@16`.

If step 4 answers `plan-expired` with nothing sent, keep that home, make
a new home, and repeat from step 2. Never plan again after an attempted
install.

## Rollback

`npx wrangler@4.147.0 rollback LENDING_P` restores the single old root,
with the three pins kept. Old rooms do not change: their register is
current again. Rooms made under `$NEW` lose child creation and Git host
authority, because the rollback lists only `$OLD`. Their journals stay
readable. A register cannot be removed, so `$NEW` stays as unused
residue. The version before `LENDING_P` (U3's `7e72aab4`) lacks the
three pins, so a rollback to it also refuses any new scope under `$NEW`.

## Checks after the window

Run these in order, before any witness:

1. Child creation under the old root: one Counter install in
   counter-witness from its operator home. Counter declares no
   publication prefix. The new item is residue.
2. Clone under the old root: `dap clone` from the lending-library and
   lending-shelf operator homes. The clone reads a Git token through
   host authority under `$OLD`.
3. Publication under the old root: lending-library publishes one shelf
   page, or the planner names a cheaper write.
4. `dap verify --all` in each of the three old operator homes.

Then the rate read after the deployment.

## Head Q

After the window, head Q makes the tracked file name both roots:

```sh
read NEW_SCOPE NEW_GENESIS < <(installed_ref <new operator home>)
node scripts/register-values.mjs lending --keep --register "$NEW_SCOPE" --genesis "$NEW_GENESIS"
```

Q runs the full gate. Until Q lands, nobody runs `deploy.mjs lending`:
the tracked file still names the single old root, and a deployment from
it would act as the rollback above.

## Red

| Red | What was broken | First failure | File | SHA-256 |
| --- | --- | --- | --- | --- |
| Lending admits the upgrade cohort | `wrangler.lending.jsonc` restored from `c8189f7c`, without the three pins | the room-policy table case and the new upgrade-cohort case; 5 other cases pass | `red.txt` | `7be43531a6dd47aab82490d8b66b7267966b7d519e133e827a14ca0426f7c1f2` |

The output is in `artroom-evidence/2026-11-18-ucp-red/`.
