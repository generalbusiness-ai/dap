# Commons and artroom-scope deployment records

This note records the project's `dap-commons` provisioning steps and the
retirement of its `artroom-scope` Start page, as `docs/deploy.md` held them
until 10 November 2026.

## Provision the Commons Worker

`dap-commons` is a separate Worker at
`https://dap-commons.inguz.workers.dev`, configured by
[`apps/room/wrangler.commons.jsonc`](../../apps/room/wrangler.commons.jsonc).
It uses the same Artifacts host as `dap-demo` and its own namespace,
`dap-commons`. The file pins Register 23, Directory 22, Membership 9,
Rules 14, Destination 16, Inbox 1 and Commons 1. The CLI's default cohort
stays the same, so planning and installing select `--cohort commons`.

Run the pinned Wrangler from a scratch directory for each reviewed
deployment:

```sh
DAP_REPO=/absolute/path/to/the-reviewed-checkout
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$DAP_REPO/apps/room/wrangler.commons.jsonc"
```

After the reviewed head lands, follow [the order](../../docs/deploy.md#the-order):

1. Create the `dap-commons` Artifacts namespace. Deploy the reviewed
   configuration with `DEPLOYMENT=dap-commons` and `SESSION_SECRET`.
2. From a separate empty private CLI directory, run:

   ```sh
   dap install --plan https://dap-commons.inguz.workers.dev --cohort commons --host artifacts --namespace dap-commons
   ```

3. Keep that exact install plan. Replace `unplanned` with its public
   register ID in `REGISTER_SCOPE` and in `ARTIFACTS_CONFIG.registerScope`.
   Deploy the same configuration again before you submit the plan.
4. From the same private directory, run:

   ```sh
   dap install --planned --cohort commons
   ```

5. Record the full register reference after the install. Its incarnation
   is not known while the plan only names the future scope. Record it with
   the planned scope ID and the deployed version, and commit the two public
   register bindings. Check the full reference and the exact Register 23
   definition before you create a room.

The `unplanned` pins in the file make no claim about identity. Provisioning
uses the explicit cohort and the kept plan. The `dap-demo` Start metadata
does not govern this path or revive the retired demo-offer route. Keep the
existing `dap-demo`, `dap-grow` and `dap-lending` registers, and leave
`ALLOW_OPEN_CREATION` unset. Commons rooms use this Worker until the
[register succession design](../2026-10-22-definition-succession.md)
lands. Existing rooms on `dap-demo` stay on Register 17, and new rooms there
use Register 26.

## The retired artroom-scope Worker

From the section "Browser Start configuration":

The retired `artroom-scope` Worker uses
`apps/room/wrangler.artroom-scope.jsonc`. Its Start page links to `dap-demo`
for new rooms. It keeps
**Check** and **Continue** for a creation that started on `artroom-scope`.
The link carries no saved request or browser key. The retained Start window
ended on 8 November 2026 under PD-6. The retired Worker's file no longer
contains `DEMO_START_CONFIG`. The planner owns the live setting removal and
the deletion of `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CREATION_TOKEN`, and
`GITHUB_READ_TOKEN`. This source change records no deployment or secret
removal.
