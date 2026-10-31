# Run your own service

Deploy the scope Worker on your own Cloudflare account, create a room, and
invite a person on another device. The scope Worker serves both the API and
the room page. To run the service on one Mac, follow
[Run on a Mac](#run-on-a-mac).

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

3. Choose an unused Worker name and a new Artifacts namespace, such as
   `dap-my-room` for both. Edit `apps/room/wrangler.jsonc` as follows.

   - Set `name` to your Worker name.
   - In `vars`, remove the `DEMO_START_CONFIG` line. It belongs to the
     project's own `artroom-scope` Worker.
   - In `vars`, set `SCOPE_INDEX_MODE` to `"enforce"`. A new deployment
     has no older scopes to register.
   - In `vars`, add `"ARTIFACTS_NAMESPACE": "dap-my-room"`.
   - In the `artifacts` entry, set `namespace` to `dap-my-room`.
   - Keep the four Durable Object bindings, `SCOPES`, `SCOPE_INDEX`,
     `REGISTRIES` and `AGENTS`, and the three migrations, `v1`, `v2` and
     `v3`, as they are. Deployment creates new Durable Object namespaces
     for your Worker.
   - Remove the `r2_buckets` entry. It names `artroom-application-content`,
     a bucket in the project's account. Without the `APPLICATION_CONTENT`
     binding, the application screen route answers `503`
     `application-unavailable` and the Worker installs no application
     package. A new room needs neither. To serve application screens
     later, create a private R2 bucket in your account and bind it as
     `APPLICATION_CONTENT` (see
     [Trusted application screens](deploy.md#trusted-application-screens)).
   - In `analytics_engine_datasets`, change `dataset` to a name of your
     own, such as `dap_my_room_metrics`. To write no metrics, remove the
     entry. The Worker then skips its metric points.

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
   node --input-type=module -e 'import { randomBytes } from "node:crypto"; process.stdout.write(JSON.stringify({DEPLOYMENT:"dap-my-room",SESSION_SECRET:randomBytes(32).toString("base64url")}));' | npx -y wrangler@4.147.0 secret bulk
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

Counter and Lending are signed application packages. The Worker serves their
screens through the route
`/applications/<directory>/<install-item>/<presentation>/`.

New room creation offers no family that installs ordinary application
packages such as Counter or Lending. These steps apply to an existing
`trusted-application` room. Before you install an application, configure
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

3. In `apps/room/wrangler.jsonc`, change `main` to `cleanup-worker.mjs`,
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
   npx -y wrangler@4.147.0 delete
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

## Run on a Mac

The [Mac host kit](../apps/room/celld/mac/) runs SeaweedFS, celld and Caddy
as LaunchDaemons under one user. The room has no Git host, and its
journals stay in the local store. Keep the installation prefix, with its
store and celld working directory, when you stop or remove the services.

### Prerequisites

You need administrator access, Git, Node 26, Python 3.9 or later, and the
checkout's locked dependencies. `/usr/bin/python3` must work, and the
system curl must support `--aws-sigv4`. Put these executables outside the
checkout, and verify where each release came from:

- the celld release named in [`celld.version`](../apps/room/celld/celld.version)
- SeaweedFS 4.51
- Caddy 2.11.7

The installer compares the celld version with the pin.

```sh
npm ci
/usr/bin/python3 --version
/usr/bin/curl -q --help all | grep aws-sigv4
```

In the commands below, replace `mac-name.local`, `192.0.2.10` and
`operator` with the Mac's DNS name, its address and the service user. The
service user owns the private keys, credentials, logs and data. The
installer owns its code and configuration as root. Run every command
without `sudo` as the service user. The service user can be your
administrator account.

### Install

1. Create a private directory, and make a certificate and key in it:

   ```sh
   umask 077
   mkdir "$HOME/dap-tls"
   apps/room/celld/mac/certificate.sh \
     --cert "$HOME/dap-tls/cert.pem" --key "$HOME/dap-tls/key.pem" \
     --name mac-name.local --name localhost \
     --ip 192.0.2.10 --ip 127.0.0.1 --days 825
   ```

   The command refuses to overwrite existing files. Keep the key at mode
   `0600`.

2. Create a private credential file for the local store, and copy the
   configuration template:

   ```sh
   umask 077
   python3 - <<'PY'
   import json, pathlib, secrets
   path = pathlib.Path.home() / ".dap-mac-aws.json"
   with path.open("x") as output:
       json.dump({"AWS_ACCESS_KEY_ID": secrets.token_hex(16),
                  "AWS_SECRET_ACCESS_KEY": secrets.token_hex(32)}, output)
       output.write("\n")
   path.chmod(0o600)
   PY
   cp apps/room/celld/mac/templates/config.example.json "$HOME/dap-host.json"
   ```

3. Edit `dap-host.json`. Set the user, the absolute binary paths, the
   certificate and key paths, the DNS names and the addresses. Give the
   node a stable name and set an explicit volume maximum. Choose a new
   prefix under a parent that root owns, such as `/Library/dap-host`, and
   let the installer create the prefix. Each binary path must name an
   executable file, with no symlink in the path or its parents. Resolve
   Homebrew links, or copy the verified executables to a directory without
   symlinks.

4. Run the installer:

   ```sh
   sudo apps/room/celld/mac/install.sh \
     --config "$HOME/dap-host.json" --credentials "$HOME/.dap-mac-aws.json"
   ```

   The installer refuses a prefix or service label that is in use. If a
   service fails to start, it keeps the data.

5. In the application firewall, allow incoming connections to the exact
   Caddy path from `dap-host.json`. Keep the firewall on. Check the entry:

   ```sh
   /usr/libexec/ApplicationFirewall/socketfilterfw \
     --getappblocked /absolute/path/to/caddy
   ```

   If the entry allows Caddy but HTTPS from the LAN times out, refresh the
   entry:

   ```sh
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw \
     --add /absolute/path/to/caddy
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw \
     --unblockapp /absolute/path/to/caddy
   ```

The services behave as follows:

- The runtime waits until the store accepts a write before it serves.
- celld starts when its job loads and restarts after a failed exit. A
  normal exit leaves it stopped, so a preserve shutdown can finish.
- celld holds a 60-second lease. Its launch throttle is 70 seconds.
- Each service has 60 seconds to stop. Caddy gives open connections 10
  seconds.

### Trust the certificate

The kit's certificate is self-signed. It uses EC P-256, `serverAuth`,
`CA:FALSE`, and your names and addresses as subject alternative names. Its
key can sign data but not certificates. Its lifetime is at most 825 days.

1. Before another device trusts the certificate, compare its fingerprint:

   ```sh
   openssl x509 -in "$HOME/dap-tls/cert.pem" -noout -fingerprint -sha256
   ```

2. For command-line access, give each command the certificate: use curl's
   `--cacert`, or set `NODE_EXTRA_CA_CERTS` for Node, as the commands
   below do.
3. For a browser on a Mac, add `cert.pem` to the login keychain in
   Keychain Access. Open **Trust**, and set only
   **Secure Sockets Layer (SSL)** to **Always Trust**. Leave the other
   policies at **Use System Defaults**. Remove the keychain entry when you
   retire the host.

To use your own certificate, set `certificate` and `privateKey` to its
absolute PEM paths. The certificate must cover every configured name. The
service user must own the key, at mode `0600`. Follow the issuer's trust
procedure.

To serve through a tunnel, set `PUBLIC_ORIGIN` to the exact public HTTPS
origin. Keep the store and runtime listeners on loopback. Check how the
tunnel passes the client address before you rely on it.

### Create the first room

Keep the client home and the private project in directories that persist.
Plan only when you can finish deployment and installation within 14
minutes.

```sh
export DAP_HOME="$HOME/dap-client"
export BASE=https://mac-name.local
mkdir -m 700 "$DAP_HOME"
NODE_EXTRA_CA_CERTS="$HOME/dap-tls/cert.pem" \
  PHASE=plan node scripts/celld-smoke.mjs
node apps/room/celld/mac/prepare-project.mjs \
  --origin "$BASE" --home "$DAP_HOME" --out "$HOME/dap-project"
python3 apps/room/celld/mac/deploy.py \
  --prefix /Library/dap-host --project "$HOME/dap-project" \
  --esbuild "$PWD/node_modules/.bin/esbuild"
curl --cacert "$HOME/dap-tls/cert.pem" "$BASE/health"
```

The plan uses `--host none`. The prepared project keeps the production
Worker and its bindings, sets `REGISTER_SCOPE` to the planned register, and
keeps the session secret in private configuration. Deployment creates the
installation's bucket and uploads the Worker. Run these commands as the
service user. After a failure or an uncertain result, keep the project and
its private deployment logs.

Wait for `"sessions":"ok"` in the health response. Then finish the plan:

```sh
NODE_EXTRA_CA_CERTS="$HOME/dap-tls/cert.pem" \
  PHASE=run node scripts/celld-smoke.mjs
```

The command installs the planned register, creates a room, joins a second
member, verifies seven journals and checks readiness. It refuses a second
run after an attempt has started. Keep the original home to inspect an
uncertain result. Use the [CLI commands](cli.md) from that home for later
work and invitations, and set `NODE_EXTRA_CA_CERTS` for each command that
connects to the host.

### Maintain the host

Stop the services with the installed procedure:

```sh
sudo /Library/dap-host/bin/down --prefix /Library/dap-host
```

The procedure asks celld for a preserve shutdown on the same node, waits
for celld to exit, and then stops the store. If the result is unknown, the
procedure exits nonzero and keeps the full prefix and node name. Restart
the same installation to recover. An exit status of zero alone does not
show that the preserve shutdown finished. If celld did not exit, the store
keeps running. All data stays in place either way.

Restart the services in order, then verify the room:

```sh
for service in seaweedfs celld caddy; do
  sudo launchctl enable "system/org.generalbusiness.dap.$service"
  sudo launchctl bootstrap system \
    "/Library/LaunchDaemons/org.generalbusiness.dap.$service.plist"
done
NODE_EXTRA_CA_CERTS="$HOME/dap-tls/cert.pem" \
  node packages/cli/bin/dap.js verify --all
```

With FileVault on, the disk must unlock at boot. To restart without a
person at the Mac, authorize the next boot:

```sh
sudo fdesetup authrestart
```

### Stop and remove

```sh
sudo /Library/dap-host/bin/down --prefix /Library/dap-host
sudo apps/room/celld/mac/uninstall.sh --prefix /Library/dap-host
```

Uninstall needs all three jobs stopped. It removes only the kit's own
LaunchDaemon files, and only if they are unchanged. It keeps the prefix,
the journals, the runtime working directory, the private configuration
and the node name.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [apps/room/wrangler.jsonc](../apps/room/wrangler.jsonc), [packages/scope/src/register-setting.ts](../packages/scope/src/register-setting.ts), [packages/scope/src/applications/route.ts](../packages/scope/src/applications/route.ts), [packages/cli/src/line.ts](../packages/cli/src/line.ts), [apps/room/celld/mac](../apps/room/celld/mac/), [scripts/celld-smoke.mjs](../scripts/celld-smoke.mjs).
The project ran this guide on 13 October 2026 with an earlier Worker
configuration. The commands on this page were not run for this revision.
