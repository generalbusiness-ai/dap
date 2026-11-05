# Deploy the failed-claim register on dap-demo

The planner runs this procedure after request
`c448c870cf6a2f93a30c285a1a4d4a6c9f4bd8ad` passes review and lands.
The builder creates no live register or room and deploys nothing in this packet.
Keep parent `8a8902f3e9ad526371cb0a73db4117bc0197cd60` open until its actual
hosted acceptance record lands.

## Prepare before the fourteen-minute window

Use a clean source checkout at the packet's approved landing. Its production
source starts at `2883992093b5b2ea54a220dea7f81da0f34cee44`. Verify the
reviewed templates, `packet.json`, and owned locked dependencies. Keep the same
Worker name, Durable Object bindings, migrations, index, Artifacts namespace,
secrets, serving limits, and compatibility flags.

Set these paths to new private directories and the reviewed checkout. Do not
reuse an earlier install home or any G3, J4, or O4 custody.

```sh
export FAILED_CLAIM_SOURCE=/absolute/path/to/reviewed/checkout
export FAILED_CLAIM_ROLLOUT_ROOT=/absolute/path/to/new/private/rollout
export FAILED_CLAIM_PACKET="$FAILED_CLAIM_SOURCE/notes/implementation/2026-11-05-failed-claim-register"
export DAP_HOME="$FAILED_CLAIM_ROLLOUT_ROOT/client"
umask 077
```

Create the rollout root and client directory at mode 0700. Require that the
client directory has no prior config, key, or plan. Keep all credential files
at mode 0600. Check that `ARTROOM_HOME` is unset or names this same client.
Keep raw output in this new durable rollout directory.

Before planning, retain the actual current deployment ID and configuration.
The builder observed version `5cc78f9e-3fce-4201-8182-454459e79b07` on
5 November at 00:23 EST. Reread it; do not assume it is still current.
The old register is:

```text
sc_b5q435os6lggypatelcltqzvul4kqxzdaaxpmybvwumsmxwj2djq
```

Its incarnation is `in_rjfrmifznpi65vm6y2kbc36xpi`. Keep that root in the
installed list. Rerun the read-only operator census if the rollout window is
later than this packet's observations. A newly discovered admitted root needs
an updated reviewed packet; the renderer refuses a changed base configuration.

Record the existing demo rooms to check, including their directory, membership,
rules, Destination, and Inbox references and pins. Use their existing member
homes for reads. Identify one retained test room whose ordinary member may
create a new Inbox or lane after the switch. An existing-room read alone does
not prove that its children can still be born.

Prepare the pinned Wrangler tool in a scratch directory, never in a checkout.
Use `wrangler@4.147.0`, the existing operator login, and `--keep-vars`.
Have both install and rollback render commands ready before signing the plan.

## Plan, pin, deploy, and install once

1. Plan the default cohort with the Page's existing open policy:

   ```sh
   node "$FAILED_CLAIM_SOURCE/packages/cli/bin/dap.js" install --plan \
     https://dap-demo.inguz.workers.dev --host artifacts --namespace dap-demo \
     --register-policy open
   ```

   Supply no `--cohort`: this checks the default. Require the output to name
   `platform:register@26`, the intended host and namespace, and an expiry
   fourteen minutes after the plan. Retain its exact signed envelope and
   original home. This command creates nothing.
2. Read only the planned scope ID from the new private config and set
   `FAILED_CLAIM_REGISTER` to it. Render a new private configuration:

   ```sh
   node --import "$FAILED_CLAIM_SOURCE/node_modules/tsx/dist/loader.mjs" \
     "$FAILED_CLAIM_PACKET/render.mjs" --stage install \
     --scope "$FAILED_CLAIM_REGISTER" \
     --out "$FAILED_CLAIM_ROLLOUT_ROOT/wrangler.install.jsonc"
   ```

   The renderer fills the reviewed placeholder, keeps the old and new roots,
   preserves every other setting, and binds `main` to the reviewed source's
   absolute entrypoint. The old Page offer temporarily closes because its
   register differs from the new host setting. No provisional incarnation
   substitutes for an actual installed reference.
3. From the prepared scratch tool directory, deploy:

   ```sh
   npx --offline wrangler@4.147.0 deploy --keep-vars \
     --config "$FAILED_CLAIM_ROLLOUT_ROOT/wrangler.install.jsonc"
   ```

   Retain the exact source identity, config digest, deployment ID, and actual
   exit. Run the next command before the original plan expires:

   ```sh
   node "$FAILED_CLAIM_SOURCE/packages/cli/bin/dap.js" install --planned
   ```

   Require an acknowledged identity equal to the planned scope under Register
   26. If deployment fails before any install send, retain the plan and follow
   rollback below. An expired or uncertain install is not permission to make
   another register. Inspect the retained attempted marker and acknowledgement;
   resolve that original operation before any continuation.

## Enable the Page offer from the actual installed reference

After successful installation, read only `register.scope` and `register.inc`
from the new config. Require the scope to equal `FAILED_CLAIM_REGISTER` and set
`FAILED_CLAIM_REGISTER_INC` to that actual incarnation. Render and deploy:

```sh
node --import "$FAILED_CLAIM_SOURCE/node_modules/tsx/dist/loader.mjs" \
  "$FAILED_CLAIM_PACKET/render.mjs" --stage offer \
  --scope "$FAILED_CLAIM_REGISTER" --inc "$FAILED_CLAIM_REGISTER_INC" \
  --out "$FAILED_CLAIM_ROLLOUT_ROOT/wrangler.offer.jsonc"
npx --offline wrangler@4.147.0 deploy --keep-vars \
  --config "$FAILED_CLAIM_ROLLOUT_ROOT/wrangler.offer.jsonc"
```

Keep the same source and both roots. This second deployment fills only the
reviewed Page setting after installation supplies its incarnation. It does not
create or replace the register and has no new install deadline.

Require `/health` to return 200 with sessions `ok`, register `ready`, and
Artifacts `wired`. Require `/v1/demo/creation-offer` to name the actual new
register reference, `platform:register@26`, host `artifacts`, namespace
`dap-demo`, and open policy. Hosted `/mcp` must stay closed.

Read each recorded existing test room and verify unchanged pins. Exercise the
chosen old room's ordinary child birth under the retained old root, using its
existing member authority. Verify the child's checked birth and creator. Stop
on a failed continuity check. A health response or parser pass closes none of
these Native obligations.

## Run the real scratch-room and token scenes

Using the new client home, create one clearly named TEST room:

```sh
node "$FAILED_CLAIM_SOURCE/packages/cli/bin/dap.js" create \
  failed-claim-hosted-20261105 --handle @failedclaimwitness
```

Record its actual identities and genesis pins: Register 26, Directory 25,
Membership 12, Rules 10, Destination 19, and Inbox 1. Preserve all original
requests and acknowledgements. A stop does not authorize `--again` or another
home. Keep the actual default Page-offer response with these room observations;
O4 retains its separate identity and acceptance.

After confirming this new room, use the supplied observer for the real CLI
clone and archive fetch:

```sh
node --import "$FAILED_CLAIM_SOURCE/node_modules/tsx/dist/loader.mjs" \
  "$FAILED_CLAIM_PACKET/token-clone.mjs" before \
  "$FAILED_CLAIM_ROLLOUT_ROOT/token-custody" \
  "$FAILED_CLAIM_ROLLOUT_ROOT/clone-before"
```

This executes the existing clone command and hardened Git runner. Only the
observer retains this TEST token's header in its new private custody directory;
normal CLI behavior retains no token. Keep it out of arguments, public logs,
Git config, and committed evidence. Require both actual Git calls to pass.
Record the private credential file's digest after those calls:

```sh
shasum -a 256 "$FAILED_CLAIM_ROLLOUT_ROOT/token-custody/credential.json" \
  > "$FAILED_CLAIM_ROLLOUT_ROOT/token-custody/credential.sha256"
```

Retain the actual token end and read-token opening. Verify Destination 19's
accepted act has fields `{}` and the fixed one-hour lifetime. Before claiming
replay, verify the fetched journal set offline:

```sh
node "$FAILED_CLAIM_SOURCE/packages/replay/src/bin.ts" \
  --git "$FAILED_CLAIM_ROLLOUT_ROOT/clone-before" --all \
  --expect-journals "$FAILED_CLAIM_EXPECTED_JOURNALS" --json
```

Set `FAILED_CLAIM_EXPECTED_JOURNALS` from the independently recorded scratch
room scope set, not from the refs the clone happened to fetch. Retain every
coverage and trust qualification. A missing dependency or untrusted published
anchor remains a finding; do not silently add an anchor-trust flag to pass.

Wait until the recorded real expiry, without changing any clock or token end.
Continue other work during that hour. Verify the retained file's digest before
the comparison. Stop if its bytes changed:

```sh
shasum -a 256 -c "$FAILED_CLAIM_ROLLOUT_ROOT/token-custody/credential.sha256"
```

Keep both digest-check outputs with the private record. Then run:

```sh
node --import "$FAILED_CLAIM_SOURCE/node_modules/tsx/dist/loader.mjs" \
  "$FAILED_CLAIM_PACKET/token-clone.mjs" after \
  "$FAILED_CLAIM_ROLLOUT_ROOT/token-custody" \
  "$FAILED_CLAIM_ROLLOUT_ROOT/clone-after"
```

The observer refuses an early attempt. It requests no new token and returns
the actual Git exit. Require the retained provider output to show authorization
refusal with the same expired credential. A DNS, local, transport, or unrelated
Git error proves no expiry refusal. Do not replace this comparison with another
`dap clone`, which would mint a fresh token.

If expiry falls between two requests of one clone, the next request fails and
a fresh `dap clone` starts again. This packet does not prove the behavior of a
download already underway across expiry, nor does it claim that such a clone
has crossed a real one-hour token boundary.

## Roll back without discarding a root

Stop new TEST work and keep the original plan, acknowledgements, private homes,
configs, tokens, and outputs. Render the reviewed rollback with the same
planned ID:

```sh
node --import "$FAILED_CLAIM_SOURCE/node_modules/tsx/dist/loader.mjs" \
  "$FAILED_CLAIM_PACKET/render.mjs" --stage rollback \
  --scope "$FAILED_CLAIM_REGISTER" \
  --out "$FAILED_CLAIM_ROLLOUT_ROOT/wrangler.rollback.jsonc"
npx --offline wrangler@4.147.0 deploy --keep-vars \
  --config "$FAILED_CLAIM_ROLLOUT_ROOT/wrangler.rollback.jsonc"
```

The rollback uses the same reviewed runtime, selects the original Register 17
and host setting, restores its exact Page offer, and retains both roots in the
child-admission array. It changes no namespace, stored scope, or secret.
Do not roll back to a singleton list after an accepted or uncertain new install.
Listing the new root proves no Native birth and grants no new authority.

Require health, original offer identity, existing-room reads, and old-room child
continuity again. If a new room was created, verify its continuity separately;
retained root syntax alone cannot prove it. Keep new-register creation and the
parent's acceptance held after rollback. A failed continuity check needs a
planner ruling before another deployment or Native producer.

After the live scene, file the exact filled settings, actual deployment IDs,
installed reference, continuity results, token observations, and every failed
attempt as a separate reviewed record. Keep credential bytes private. Do not
describe parent acceptance as met before that record lands.
