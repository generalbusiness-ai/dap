# Deploy the G3b binding packet

The planner runs this procedure after request `1bb63a2f` passes independent
review and lands. Keep parent `3c6ec378` open throughout deployment.

## Retain the active state

1. Retain the current G3b `github-project`, its matching source, exact
   configuration hashes, current served version, and rollback command.
   Require that its installed-root string contains H3, G3, and G3b.
2. Read H3 health, its retained room, and its Inbox before deployment.
   Record their actual heads. Keep H3 custody with the planner.
3. Preserve the fleet prefix `/Library/dap-host-h3-20261029`, node, store,
   Worker name, Durable Object classes, bindings, and migrations.
4. Preserve the G3b client home and retained plan. Create no new plan,
   Register, room, founder key, or recovery key.

## Stage the selected source and packet

1. Verify the archive bytes and SHA-256 against [source-export.json](source-export.json).
   Export its exact main source into the new directory
   `/Users/inguz/dap-host-g3b-20261103/source-binding-bf3bceb6`.
   Compare every file and executable mode with the retained Git inventory.
2. Use owned dependency copies with workspace links inside that export.
   The package manifests and lockfile match `source-cli-bb66b1ab`.
   Preserve both earlier source directories and dependency copies.
3. Copy the exact reviewed [bindings.json](bindings.json),
   [github-app.json](github-app.json), and
   [installed-register-scopes.json](installed-register-scopes.json) into
   a new nonsecret input directory. Check their recorded hashes.
4. Make a new private base copy of G3b `project-with-roots`.
   Compare every base variable with the active G3b `github-project` after
   excluding its `GITHUB_*` additions. Require exact equality, including
   `SESSION_SECRET` and the three-root JSON string.
5. Adopt the selected source's maintained `compatibility_flags`:
   `["nodejs_compat","enable_request_signal"]`.
   Keep every other nonvariable setting equal to that maintained template.
6. Set the new base's `worker.ts` to these exact two lines:

   ```ts
   export * from "/Users/inguz/dap-host-g3b-20261103/source-binding-bf3bceb6/apps/room/worker.ts";
   export { default } from "/Users/inguz/dap-host-g3b-20261103/source-binding-bf3bceb6/apps/room/worker.ts";
   ```

7. Keep private directories at mode 0700 and private files at mode 0600.
   Require the filled App register to equal the new G3b root and require
   the installed-root array to equal the reviewed three-root file.
8. Use the selected source's `apps/room/celld/mac/prepare-github.mjs` with
   the new base project, reviewed App configuration, reviewed two-row
   bindings, the planner's private key input, and a new private output.
   Supply no static read token. The planner alone reads the App key.

The helper accepts a base project, not an already GitHub-wired project.
It checks the maintained settings, exact Worker shim, and root list before
reading the key. Retain all partial output after any refusal. Resolve
the refusal before another attempt.

## Deploy and identify the actual served bundle

1. Use the existing trusted Node runtime and per-command certificate.
   Run the selected source's `apps/room/celld/mac/deploy.py` with
   `--prefix /Library/dap-host-h3-20261029`, the new private output as
   `--project`, and the selected source's owned `node_modules/.bin/esbuild`
   as `--esbuild`. Retain the actual exit and private deployment output.
2. Record the deployed version from that output.
3. Read `deploy/dap-celld-local/current.json` through the permitted store
   interface. Require its version to match and its rollout to equal 100.
4. Read `deploy/dap-celld-local/<version>/manifest.json`. Record the actual
   response status, byte count, and digest, and compare the version.
   If the store refuses the bundle because of its size bound, retain that
   refusal. Do not invent a missing `index.js` digest.
5. At least 65 seconds after the pointer change, repeat health reads.
   Require health 200, sessions `ok`, register `ready`, and GitHub `wired`.
   Retain request paths, observation times, and source identity for all
   four readings. This room is already installed; run no install command.
6. Repeat the H3 room and Inbox reads. Prove one actual new Inbox birth
   under H3's retained installed root. Compare against this window's fresh
   baseline, rather than a historical hardcoded Membership head.
7. Send the builder the exact source, served version, all four readings,
   configuration hashes, and H3 continuity evidence. Keep G3 acceptance open.

## Restore after a continuity failure

1. Stop the G3b continuation and retain every project, home, and log.
2. Restore the exact pre-window G3b project with its matching old source
   helper and the same fleet prefix. Preserve all three installed roots.
   Do not substitute the original single-root G3 binding project.
3. Reprove H3 health, room reads, and child creation after restoration.
4. Report the failed window and actual restoration readings to the builder.

## Continue the preservation scene

After the served proofs and H3 check succeed, the builder uses only the
existing G3b client home. Bind the exact reviewed Destination once, then
run the agent proposal, independent review, owner merge, and GitHub-head
comparison under parent `3c6ec378`. Compare the original issue text and
complete two-entry prefix with [content-before-binding.json](content-before-binding.json).
