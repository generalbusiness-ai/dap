# Deploy the G3 binding map

After exact approval and landing of [the binding-row record](../2026-11-02-g3-binding-row.md),
the planner runs this procedure as inguz on the mini. Keep the existing
client home, original plan, source export, installation, node, and store.

1. Require the current room's full Destination reference to match the reviewed
   row. Require `unpublished` with repository, Git head, and token all null.
2. Copy only the reviewed `bindings.json` to
   `/Users/inguz/dap-host-g3-20261102/github/bindings.json`, mode 0600.
   Compare the existing nonsecret App configuration with this packet's filled
   `github-app.json`. Require exact field equality.
3. Run the existing H3 baseline and require active Membership8 head 21 and
   Directory20 head 7. Stop if either read fails.
4. Set the service user's environment:

   ```sh
   export G3_ROOT=/Users/inguz/dap-host-g3-20261102
   export NODE_EXTRA_CA_CERTS=/Users/inguz/dap-host-h3-20261029/tls/cert.pem
   export PATH=/Users/inguz/dap-validate/bin/node-v26.12.1-darwin-arm64/bin:/usr/bin:/bin:/usr/sbin:/sbin
   ```

5. Stage a new binding project from the original prepared project:

   ```sh
   node "$G3_ROOT/source/apps/room/celld/mac/prepare-github.mjs" \
     --project "$G3_ROOT/project" \
     --config "$G3_ROOT/github/github-app.json" \
     --private-key "$G3_ROOT/github/app-key.pk8.pem" \
     --bindings-file "$G3_ROOT/github/bindings.json" \
     --out "$G3_ROOT/binding-project"
   ```

   Retain any partial output after a refusal. Do not replace an existing
   output directory or choose another project to hide an uncertain result.
6. Verify the staged nonsecret binding map equals the reviewed row. Keep the
   full staged configuration private because it contains the App key.
7. Deploy through the existing installation:

   ```sh
   /usr/bin/python3 "$G3_ROOT/source/apps/room/celld/mac/deploy.py" \
     --prefix /Library/dap-host-h3-20261029 \
     --project "$G3_ROOT/binding-project" \
     --esbuild "$G3_ROOT/source/node_modules/.bin/esbuild"
   ```

8. Wait for the new configuration to serve. Require health 200, sessions
   `ok`, register `ready`, and GitHub `wired`. Health alone cannot distinguish
   the earlier App-only deployment: the current health response exposes
   neither the map nor its digest. Match the runtime's loaded bundle with
   this staged deployment through nonsecret runtime evidence. If that proof
   is unavailable, report the gap before handing back the room for binding.
9. Run the H3 baseline again. Require the same Membership8 and Directory20
   heads. If either read fails, stop the G3 sequence immediately and use
   [the original H3 restore procedure](../2026-11-02-g3-mini-configuration/deploy-g3.md#restore-h3-after-a-failed-continuity-check).
   Successful post-rollback reads must follow any rollback.
10. Report the deployment, served map, and H3 results to builder. Builder then
    continues the retained parent's native binding and GitHub witness.

The planner alone reads or copies the App key. No new install plan or register
installation belongs to this procedure. Keep all private inputs and deployment
logs. This deployment does not itself close parent `3c6ec378`.
