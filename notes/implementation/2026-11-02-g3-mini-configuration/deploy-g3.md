# Deploy the reviewed G3 configuration

After the checker approves the filled values and the planner resolves the
prefix and H3 effects in [the configuration record](../2026-11-02-g3-mini-configuration.md),
run these commands as inguz on the mini. The planner places the App key and
runs each deployment.

## Prepare before starting the plan

1. Export runtime source `afdd8ee5288a7b33c90536c9489bcfc06eafc7d9` below
   `/Users/inguz/dap-host-g3-20261102/source`.
2. Keep `/Users/inguz/dap-host-g3-20261102` and its `github` directory at
   mode0700, owned by inguz.
3. Copy the existing H3 dependency directory as a new owned directory below
   the source export. Keep H3's original source unchanged.
4. Verify the lockfile hash and every workspace package link against the
   configuration record. Refuse a link that resolves to the H3 source.
5. Keep the reviewed `github-app.json` template from this packet in the new
   private root as `github-app.reviewed.json`, mode0600.
6. Prepare the App-key transfer for the reviewed private path. Keep the key
   out of commands, chat, and evidence.
7. Run `h3-read-baseline.mjs` with the existing H3 Node runtime and trusted
   certificate. Retain its nonsecret result.
8. Check that the planner-approved prefix has its original installation
   record, node, and store. Do not create another installation at an absent
   prefix.

## Finish within fourteen minutes of the plan

Set these values in the service user's shell:

```sh
export G3_ROOT=/Users/inguz/dap-host-g3-20261102
export DAP_HOME="$G3_ROOT/client"
export NODE_EXTRA_CA_CERTS=/Users/inguz/dap-host-h3-20261029/tls/cert.pem
export PATH=/Users/inguz/dap-validate/bin/node-v26.12.1-darwin-arm64/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

1. Create the new client directory at mode0700.
2. Start the retained plan:

   ```sh
   node "$G3_ROOT/source/packages/cli/bin/dap.js" install --plan      https://inguz.local --host none --cohort repository-binding
   ```

3. Prepare the original project and retain its nonsecret summary:

   ```sh
   node "$G3_ROOT/source/apps/room/celld/mac/prepare-project.mjs"      --origin https://inguz.local --home "$DAP_HOME"      --out "$G3_ROOT/project" > "$G3_ROOT/prepare-project.json"
   ```

4. Read `register` from `prepare-project.json`. Replace only
   `PLANNED_G3_REGISTER_SCOPE` in the reviewed template. Write the result to
   `$G3_ROOT/github/github-app.json`, mode0600. Refuse any other changed field.
5. Place the App key at `$G3_ROOT/github/app-key.pk8.pem`, mode0600, owned
   by inguz.
6. Stage the GitHub project:

   ```sh
   node "$G3_ROOT/source/apps/room/celld/mac/prepare-github.mjs"      --project "$G3_ROOT/project"      --config "$G3_ROOT/github/github-app.json"      --private-key "$G3_ROOT/github/app-key.pk8.pem"      --out "$G3_ROOT/github-project"
   ```

7. Deploy the staged project through `deploy.py` with the planner-approved
   existing prefix and `$G3_ROOT/source/node_modules/.bin/esbuild`. Use the
   approved prefix from `29c50395`; `/Library/dap-host` was absent at review
   preparation. Retain private deployment logs.
8. Require health to report sessions `ok` and register `absent` or `ready`
   for the new configured register, as appropriate before installation.
9. Install the retained plan:

   ```sh
   node "$G3_ROOT/source/packages/cli/bin/dap.js" install --planned
   ```

10. Require health to return200 with register `ready`.
11. Rerun the H3 read baseline. Keep acceptance open if either original
    room read fails.

If the fourteen-minute window closes, retain the plan and every project.
Do not sign another plan or replace the retained client home to hide an
uncertain result. Resolve the original before any new attempt.

## Continue the parent witness

1. Create the unpublished G3 room from the installed register.
2. Record its actual Destination incarnation and the content to preserve.
3. Have the checker review the complete later binding row.
4. Stage and deploy the separate binding project after that review.
5. Bind through the native act and complete the parent's GitHub witness.
6. Rerun the H3 read baseline after the later deployment.

Keep the App key, private projects, client homes, and deployment logs private.
Record only the approved nonsecret command results and evidence hashes.
