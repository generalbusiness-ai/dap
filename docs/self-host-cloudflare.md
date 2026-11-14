# Run your own service on Cloudflare

Deploy the scope Worker on your own Cloudflare account, create a room, and
invite a person on another device. The scope Worker serves both the API and
the room page. To run the service on one Mac, follow
[Run your own service on a Mac](self-host-mac.md).

## Deploy a room

You need Git, Node 26, and a Cloudflare account that supports Workers,
Durable Objects with SQLite storage, and Artifacts. You must be able to
deploy Workers in that account. The commands run the pinned Wrangler
4.147.0 through `npx`. You do not install Wrangler globally or in the
checkout.

1. Clone the source and install its locked dependencies.

   ```sh
   git clone https://github.com/generalbusiness-ai/dap.git
   cd dap
   npm ci
   ```

   `npm ci` reports the installed packages. The room page's assets are
   committed in `apps/room/page/assets.ts`. If you change the page source,
   rebuild them with `node apps/room/page/scripts/assets.mjs` before you
   deploy.

2. Log in to Cloudflare from the room application.

   ```sh
   cd apps/room
   npx -y wrangler@4.147.0 login
   npx -y wrangler@4.147.0 whoami
   cd ../..
   ```

   Login opens your browser. `whoami` prints your account and its ID.
   Keep the ID for the Artifacts hostname in step 6.

3. Copy the neutral template to an ignored local file:

   ```sh
   cp apps/room/wrangler.jsonc apps/room/wrangler.self-host.jsonc
   ```

   Choose an unused Worker name and a new Artifacts namespace, such as
   `dap-my-room` for both. Edit `apps/room/wrangler.self-host.jsonc`:

   - Set `name` to your Worker name.
   - Set `vars.ARTIFACTS_NAMESPACE` and the `artifacts` entry's `namespace`
     to your Artifacts namespace.
   - Keep `SCOPE_INDEX_MODE` set to `"enforce"`. A new Worker has no older
     scopes to register.
   - Keep the four Durable Object bindings, `SCOPES`, `SCOPE_INDEX`,
     `REGISTRIES`, and `AGENTS`, and the three migrations, `v1`, `v2`, and
     `v3`. Deployment creates their namespaces for your Worker.

   The template has no project bucket, metrics dataset, or Start setting.
   Without `APPLICATION_CONTENT`, application screen requests answer `503`
   `application-unavailable`. To serve installed application screens, create
   a private R2 bucket and bind it as `APPLICATION_CONTENT` (see
   [Trusted application screens](deploy.md#trusted-application-screens)).
   To collect metrics, add an `analytics_engine_datasets` entry with binding
   `METRICS` and a dataset name in your account.

   The first room's repository creates the Artifacts namespace in your
   account. You do not run a command to create the namespace. See
   Cloudflare's
   [namespace guide](https://developers.cloudflare.com/artifacts/concepts/namespaces/).
   The entry's `remote: true` makes local Wrangler development use the live
   Artifacts binding. It is not a second deployment or a credential.

4. Deploy, then send the deployment name and a new session secret to
   Wrangler on standard input.

   ```sh
   npm run deploy:scope
   cd apps/room
   node --input-type=module -e 'import { randomBytes } from "node:crypto"; process.stdout.write(JSON.stringify({DEPLOYMENT:"dap-my-room",SESSION_SECRET:randomBytes(32).toString("base64url")}));' | npx -y wrangler@4.147.0 secret bulk --config wrangler.self-host.jsonc
   cd ../..
   ```

   Deployment prints the Worker's `https://<name>.<subdomain>.workers.dev`
   address and version ID. Secret storage reports success and does not
   print the values. `DEPLOYMENT` is not secret, but Wrangler stores it
   as a secret binding because it arrives through the same command. The
   Worker issues no session without both values.

5. Keep this room's signing keys in a new private directory. Plan the
   install with your deployed address and namespace.

   ```sh
   export DAP_HOME="$(mktemp -d)"
   node packages/cli/bin/dap.js install --plan https://<name>.<subdomain>.workers.dev --host artifacts --namespace dap-my-room
   ```

   `packages/cli/bin/dap.js` is the `dap` command. The plan prints
   `Planned: register sc_...` with its definition and its deadline, then
   `Set REGISTER_SCOPE to sc_...`. It creates nothing. Finish the next
   step before that deadline, 14 minutes after the plan.

6. Add two settings to the same file's `vars`. `REGISTER_SCOPE` pins the
   register that the Worker accepts. `ARTIFACTS_CONFIG` wires the
   Artifacts host. Use the register ID from the plan in both, your
   namespace, and your account's Artifacts hostname. Neither setting
   holds a secret.

   ```json
   "REGISTER_SCOPE": "sc_<planned-id>",
   "ARTIFACTS_CONFIG": "{\"registerScope\":\"sc_<planned-id>\",\"namespace\":\"dap-my-room\",\"host\":\"<account-id>.artifacts.cloudflare.net\",\"maxBytes\":10485760,\"credentialIdentity\":\"adapter-attempt\"}"
   ```

   The two register IDs must agree. If they differ, the Worker refuses
   every new register. A Worker without `REGISTER_SCOPE` reads the pin
   from `ARTIFACTS_CONFIG.registerScope`, which older deployments still
   use.

   Deploy again, install the planned register, and create the room:

   ```sh
   npm run deploy:scope
   node packages/cli/bin/dap.js install --planned
   node packages/cli/bin/dap.js create first-room --handle @owner
   ```

   Install prints `Installed: register sc_..., ... as planned.` Create
   makes the room's Git repository, enrolls you as the room's first admin, and prints
   the room's directory and membership references. Keep `DAP_HOME` for
   later commands. If create stops waiting, run the same command again
   without `--again`. If an install is uncertain, keep its original plan
   and run `install --planned` again. An expired deadline is no reason to
   replace an install that the CLI already sent.

7. Invite the person who uses the second device.

   ```sh
   node packages/cli/bin/dap.js invite @guest --role member
   ```

   The command prints the invitation ID and an `artroom-invite:...` link.
   The link holds the invitation secret. Send it to that person privately.
   Keep it out of logs and screenshots. On the second device, the person
   opens `https://<name>.<subdomain>.workers.dev/page/`, chooses
   **Invitation link**, and pastes the link. The page makes a key for that
   device, joins, and opens the room. If enrollment is still pending, use
   **Check status** to read the original request. Each device has its own
   key. Do not copy the owner's key to another device.

## Use GitHub instead

When you plan the install, use `--host github.com --namespace <account-login>`.
Configure and authorize the GitHub App before you install. Follow
[The order](deploy.md#the-order) and the
[GitHub host requirements](hosts.md#github-host-githubcom). GitHub needs
its own repository-creation credential. The Artifacts binding needs no
outside Git credential.

## Install a maintained application

Counter and Lending are ordinary signed application packages. A room of
the `base` cohort, the default for new rooms, installs them. An existing
historical `declared-application` room installs them as well.

The Worker serves an installed package's screens through the route
`/applications/<directory>/<install-item>/<presentation>/`.

Before you install an application in an existing room, configure
the [private application content bucket and exact release trust](deploy.md#trusted-application-screens).

1. Check and pack the [Counter](../apps/counter/APPLICATION.md) or
   [Lending](../examples/lending/APPLICATION.md) source.
2. Commit the signed packet to an HTTPS Git repository.
3. Run the package-install command in the [CLI reference](cli.md). Keep
   the request key and its original arguments.
4. Run `dap application <install-item>` to read the pending, active or
   refused state.
5. Open the screen URL from the active result. Enroll each device with its
   own private invitation.

Membership and application grants still decide what each device can do.

## Deploy the homepage

Edit `homepage/wrangler.jsonc`: choose a new Worker name, and remove
`routes` to use a `workers.dev` address. A custom domain is optional and
must be yours. The homepage's application links point at the project's
demos. Change them to your own room, library and Counter addresses before
you build.

```sh
npm run build:home
npm run deploy:home
```

The deploy command prints the homepage address.

## Remove the test deployment

Apply these steps only to a test deployment. Do not reuse its configuration
for a room you keep.

1. List the repositories in your Artifacts namespace, then delete each one
   by its exact name.

   ```sh
   cd apps/room
   npx -y wrangler@4.147.0 artifacts repos list --namespace dap-my-room
   npx -y wrangler@4.147.0 artifacts repos delete <repository-name> --namespace dap-my-room
   cd ../..
   ```

2. Delete the Durable Object storage. Deleting a Worker alone does not
   delete it. Write a replacement entry point that exports no Durable
   Object class:

   ```sh
   printf '%s\n' 'export default { fetch() { return new Response("Removed", {status: 410}); } };' > apps/room/cleanup-worker.mjs
   ```

3. In `apps/room/wrangler.self-host.jsonc`, change `main` to `cleanup-worker.mjs`,
   remove `durable_objects`, and append this migration after `v3`:

   ```json
   { "tag": "v4-remove-self-host", "deleted_classes": ["DeployedScope", "McpRegistry", "McpAgent", "ScopeIndex"] }
   ```

   The migration deletes every object of the four classes and their data.
   See
   [Cloudflare's delete migration](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/#delete-migration).

4. Deploy the deletion migration, then delete the Worker:

   ```sh
   npm run deploy:scope
   cd apps/room
   npx -y wrangler@4.147.0 delete --config wrangler.self-host.jsonc
   cd ../..
   ```

5. If you deployed a homepage Worker, run the pinned Wrangler `delete`
   from `homepage/`.
6. Remove the private `DAP_HOME` directory when you no longer need its
   keys or original requests.

Wrangler 4.147.0 can list and get Artifacts namespaces but cannot delete
one. The [Artifacts REST API](https://developers.cloudflare.com/artifacts/api/rest-api/#namespaces)
lists no namespace deletion route either. After step 1 the namespace is
empty, and it stays in your account.

## Source

The configuration steps use the neutral BR-11 template and its ignored local
copy. The broader guide retains its 30 October 2026 source review at main
`5dc9765f`. Sources: [apps/room/wrangler.jsonc](../apps/room/wrangler.jsonc), [packages/scope/src/register-setting.ts](../packages/scope/src/register-setting.ts), [packages/scope/src/applications/route.ts](../packages/scope/src/applications/route.ts), [packages/cli/src/line.ts](../packages/cli/src/line.ts).
The project ran this guide on 13 October 2026 with an earlier Worker
configuration. The commands on this page were not run for this revision.
