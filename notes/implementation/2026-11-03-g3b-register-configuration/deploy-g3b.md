# Deploy the reviewed G3b configuration

The planner runs this procedure after this configuration head passes review
and lands. Request `05c380ce` and ratified ruling `c324ad65` govern it.
The builder creates no register or room during preparation.

## Prepare the source and inputs before the plan

1. Export main `9c7ae712d6281a1f32bbbf180e70cfa4329d6e7c` into
   `/Users/inguz/dap-host-g3b-20261103/source`. Compare the export with
   [source-export.json](source-export.json). Its archive contains only
   tracked Git files. The lockfile SHA-256 is
   `c835dfee04d7dc8bb946ab08e38d79d54aa2bade3c03d917319a835431014fc6`.
2. Keep the new root, source, GitHub input directory, and client home owned
   by inguz. Keep private directories at mode 0700 and private files at
   mode 0600. Use the existing Node 26.12.1 runtime and per-command trusted
   certificate. Verify owned dependency copies and workspace links inside
   the new export. Preserve the original source and dependencies.
3. Copy the three reviewed templates into the new `github` directory:
   [github-app.json](github-app.json),
   [installed-register-scopes.json](installed-register-scopes.json), and
   [bindings.json](bindings.json). Retain untouched copies. The first two
   each contain the identical `PLANNED_G3B_REGISTER_SCOPE` placeholder.
   Both unfilled templates must refuse validation.
4. Keep the existing fleet prefix `/Library/dap-host-h3-20261029`, node,
   store, Worker name, Durable Object classes, bindings, and migrations.
   Retain the active project and its exact rollback command before any
   deployment. A new fleet or renamed Worker would not preserve those
   objects. Keep the maintained Mac preparation settings. This packet
   enables no dynamic client registration.
5. Prepare the planner's private App-key input separately. The builder
   neither reads nor copies that key. Keep both failed fresh-owner roots
   and recovery custody retained and unused. The original G3 client home
   and uncertain original Git operation stay frozen.

## Complete the retained plan within its deadline

Set these paths in inguz's shell. These values name a new client home.

```sh
export G3B_ROOT=/Users/inguz/dap-host-g3b-20261103
export G3B_PREFIX=/Library/dap-host-h3-20261029
export DAP_HOME="$G3B_ROOT/client"
export NODE_EXTRA_CA_CERTS=/Users/inguz/dap-host-h3-20261029/tls/cert.pem
export PATH=/Users/inguz/dap-validate/bin/node-v26.12.1-darwin-arm64/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

1. Create the fresh client directory at mode 0700. Require that it has no
   earlier plan, room configuration, or custody. Plan once:

   ```sh
   node "$G3B_ROOT/source/packages/cli/bin/dap.js" install --plan \
     https://inguz.local --host none --cohort repository-binding
   ```

   Retain the exact original plan and its expiry. Do not replace an
   uncertain operation with another plan.
2. Prepare a new private project and retain its nonsecret summary:

   ```sh
   node "$G3B_ROOT/source/apps/room/celld/mac/prepare-project.mjs" \
     --origin https://inguz.local --home "$DAP_HOME" \
     --out "$G3B_ROOT/project" > "$G3B_ROOT/prepare-project.json"
   ```

3. Read `register` from that summary. Replace only the one placeholder in
   each reviewed template with that identical canonical Scope ID. Retain
   H3's `sc_7prhc2jyfaxm2wxyak56fcg5f2htof74sclpdsqcvsllao25tzoq` and
   the first G3 root `sc_wktzr3u2uv33drdyiqcehcgrro46adjdxl7vyy5iguddbjrlnybq`.
   Refuse any other changed App field or binding-file byte.
4. Make a new private copy of `project` at `project-with-roots`. Add the
   filled root array as a JSON **string** in its `wrangler.json` at
   `vars.INSTALLED_REGISTER_SCOPES`, before
   GitHub staging. Require that `vars.REGISTER_SCOPE` equals the new root
   and that the array contains all three distinct roots. Keep every other
   prepared value, including session custody, unchanged. Write the file
   privately and retain the original prepared project for rollback.
5. The planner supplies its reviewed private key and stages the project:

   ```sh
   node "$G3B_ROOT/source/apps/room/celld/mac/prepare-github.mjs" \
     --project "$G3B_ROOT/project-with-roots" \
     --config "$G3B_ROOT/github/github-app.json" \
     --private-key "$G3B_ROOT/github/app-key.pk8.pem" \
     --bindings-file "$G3B_ROOT/github/bindings.json" \
     --out "$G3B_ROOT/github-project"
   ```

   The maintained helper validates the root list before reading the key.
   Deployment validates it again. Their acceptance proves configuration
   syntax, not App authentication or repository access. Supply no static
   read token. Keep the first binding row byte for byte.
6. The planner deploys with the existing installation:

   ```sh
   /usr/bin/python3 "$G3B_ROOT/source/apps/room/celld/mac/deploy.py" \
     --prefix "$G3B_PREFIX" --project "$G3B_ROOT/github-project" \
     --esbuild "$G3B_ROOT/source/node_modules/.bin/esbuild"
   ```

   Retain the private deployment output, exact source identity, and
   configuration hashes. The new session secret invalidates old read
   sessions. Existing signed identities can request fresh sessions.
7. Install the retained plan before expiry:

   ```sh
   node "$G3B_ROOT/source/packages/cli/bin/dap.js" install --planned
   ```

8. Require health 200 with sessions `ok` and register `ready`. Record all
   four served-bundle readings required by the ruling, including their
   request paths and observed source identities. Prove an actual new H3
   Inbox birth under its retained root. Health and existing-room reads
   alone do not prove child creation. Stop on any failed continuity check.
9. Send the builder the exact new Register reference, installation result,
   H3 continuity evidence, and readiness record. Keep G3 acceptance open.

If the deadline closes or an outcome becomes uncertain, retain the plan,
all projects, and every actual exit. Resolve that original operation before
any retry. Never reuse either refused fresh-owner root.

## Create one room after the planner records readiness

The builder uses only `/Users/inguz/dap-host-g3b-20261103/client` and creates
one room with a new owner handle and title, selecting `--branch g3-witness-2`.
The builder writes the content to preserve and records the actual new
Destination with its incarnation. Another room needs another plan and home.

The separate binding-row head keeps the first row and adds the actual new
Destination, repository `generalbusiness-ai/dap-g3-binding-witness-20261102`,
stable ID `1442980126`, and branch `g3-witness-2`. After that head's review,
the planner deploys its binding project. The builder then binds once and
runs the real preservation witness. Configuration alone closes no G3 scene.

## Restore after a continuity failure

Stop the G3b sequence and retain every project, home, and private log.
The planner restores the exact project retained before this window, using
its matching source helper and the existing fleet prefix. Require H3 health,
room reads, and child-creation continuity afterward. Do not substitute the
original H3-only project without an explicit ruling: it could strand the
first G3 register and binding. Keep G3b acceptance open after rollback.
