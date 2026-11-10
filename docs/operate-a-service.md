# Operate a service

You keep a scope Worker running after its first deployment. You read its
health and logs, deploy new source, roll back, keep copies of the record,
rotate its secrets, and retire it. This page assumes the Cloudflare
deployment from [Run your own service](self-host.md). You need:

- The checkout that you deployed from, with its ignored file
  `apps/room/wrangler.self-host.jsonc`.
- A Cloudflare login that can deploy the Worker.
- The `DAP_HOME` directory of an admin of your rooms.
- The pinned Wrangler, which you run as `npx -y wrangler@4.147.0`.

The examples use `https://dap-my-room.example.workers.dev` as the Worker's
address. Replace it with your own. Run each `wrangler` command from
`apps/room`, so that `--config wrangler.self-host.jsonc` finds the file.

For the Mac host, [Maintain the host](self-host.md#maintain-the-host)
gives the stop, restart and verify steps.

## Read health and logs

1. Read the health route.

   ```sh
   curl -s https://dap-my-room.example.workers.dev/health
   ```

   The body has five fields: `deployment`, `version`, `sessions`,
   `register` and `wiring`. The route answers `200` when `sessions` is
   `ok`, `register` is `ready`, and no configured host is `off`. Otherwise
   it answers `503`. [Health](operations.md#health) gives each value.

2. Read the room's state as an admin.

   ```sh
   dap status
   ```

   The command prints a summary of each scope that it finds. A count
   that it could not read says `unknown`, `denied` or `more; partial`,
   never zero.

3. Follow the Worker's logs as requests arrive.

   ```sh
   cd apps/room
   npx -y wrangler@4.147.0 tail --config wrangler.self-host.jsonc --format pretty
   ```

   Wrangler prints each request and its console lines until you stop it.
   Add `--status error` to see only failed requests. The template keeps
   console logs and turns off invocation logs, which can include URLs.

4. To trace one request, take the `dap-request-id` header from its
   response. Read that request's rows as an admin:

   ```sh
   dap status --request <16-hex-id>
   ```

   The Worker keeps these rows for at most seven days.

The template declares no `METRICS` binding, so `scripts/deploy-check.mjs`
has no metrics to read. To collect metrics, add the binding as
[Run your own service](self-host.md#deploy-a-room) describes in step 3.
[Observe a deployment](operations.md) describes the metrics and the
deploy check.

## Deploy new source

1. Record the version that runs now.

   ```sh
   curl -s https://dap-my-room.example.workers.dev/health
   ```

   Keep the `version` value. You need it to roll back.

2. Get the new source and install its locked dependencies.

   ```sh
   git pull
   npm ci
   ```

3. Compare the template with your file.

   ```sh
   git diff ORIG_HEAD HEAD -- apps/room/wrangler.jsonc
   ```

   Copy each new binding, setting and migration into
   `apps/room/wrangler.self-host.jsonc`. Keep your Worker name, namespace,
   `REGISTER_SCOPE` and host settings.

4. If the diff adds an entry to `migrations`, read
   [Roll back](#roll-back) before you go on. You cannot roll back past a
   Durable Object migration.

5. Deploy.

   ```sh
   npm run deploy:scope
   ```

   Wrangler prints the Worker's address and the new version ID.
   `--keep-vars` keeps the settings that the file omits.

6. Check the new version.

   ```sh
   curl -s https://dap-my-room.example.workers.dev/health
   dap verify --all
   ```

   The health `version` equals the new version ID, and the route answers
   `200`. `dap verify --all` replays every scope of the room. Its last
   line is `All consistent: <n> scopes.`

[Deploy the scope Worker](deploy.md) gives the rules for settings that
the file holds and settings that `--keep-vars` keeps.

## Roll back

1. List the recent deployments and their versions.

   ```sh
   cd apps/room
   npx -y wrangler@4.147.0 deployments list --config wrangler.self-host.jsonc
   ```

   Wrangler lists the 10 most recent deployments with their version IDs.

2. Roll back to the version that you recorded before the deployment.

   ```sh
   npx -y wrangler@4.147.0 rollback <version-id> --config wrangler.self-host.jsonc --message "<reason>"
   ```

3. Read `/health` again. Its `version` equals the version that you chose.

A Durable Object migration is one-way. After a deployment that adds a
migration, Wrangler refuses a rollback to a version from before that
migration. The repository has no procedure that reverses a migration.
A rollback also keeps every entry that the newer version wrote, because
each scope's journal stays in its Durable Object.

## Keep copies of the record

Each scope keeps its journal in its own Durable Object, in the Worker's
account. Two copies can exist outside the Worker:

- **The published repository.** With host `artifacts` or `github.com`, a
  room publishes its repository content and a receipt for each
  publication. The repository outlives the Worker. It does not hold the
  full journal of every scope.
- **The journal archive.** A room's directory can bind a journal archive,
  which copies entries into the repository under
  `refs/artroom/journal/*`. Today the archive engine runs only for the
  demo room on the hosted `dap-grow` Worker. Other rooms cannot yet join
  an archive.

To keep a copy of a room's repository:

1. Clone the repository with a read token of your own.

   ```sh
   dap clone /absolute/path/to/room-copy
   ```

   The command prints the read token's handle, the remote URL and
   `Cloned into`. A room under host `none` answers `no-repository` and has
   nothing to clone.

   For a room that has an archive, add `--archive` to the same command.
   The clone then also fetches the journal refs.

   ```sh
   dap clone /absolute/path/to/room-copy --archive
   ```

   The command then also prints
   `Fetched refs/artroom/journal/* with the same read token.`

2. Check the room's scopes against the service.

   ```sh
   dap verify --all
   ```

No command backs up a Worker's Durable Object storage yet, and no restore
procedure or restore drill exists yet. A room under host `none` has no copy
outside the Worker.

## Rotate secrets

Send each secret to Wrangler on standard input. Never put a secret value in
a command argument or a file in the checkout. Keep `DEPLOYMENT` set.
`secret bulk` changes only the names that its input holds.

### Replace the session secret

1. Send a new `SESSION_SECRET`.

   ```sh
   cd apps/room
   node --input-type=module -e 'import { randomBytes } from "node:crypto"; process.stdout.write(JSON.stringify({SESSION_SECRET:randomBytes(32).toString("base64url")}));' | npx -y wrangler@4.147.0 secret bulk --config wrangler.self-host.jsonc
   ```

   Wrangler reports success and does not print the value.

2. Read `/health`. `sessions` is `ok`.

A new value ends every read session in the deployment. Each member's
client asks for a new session. Signed reads keep working.

### Replace the GitHub App key

1. Generate a new private key in the GitHub App's settings. Keep the old
   key until step 4.

2. Convert the new key to PKCS #8 PEM with no passphrase.

   ```sh
   openssl pkcs8 -topk8 -nocrypt -in new-app-key.pem -out new-app-key.pkcs8.pem
   ```

3. Send it to the Worker.

   ```sh
   cd apps/room
   node -e 'process.stdout.write(JSON.stringify({GITHUB_APP_PRIVATE_KEY: require("node:fs").readFileSync(0, "utf8")}))' < /absolute/path/to/new-app-key.pkcs8.pem | npx -y wrangler@4.147.0 secret bulk --config wrangler.self-host.jsonc
   ```

4. Read `/health`. `wiring.github` is `{"state": "wired"}`. Then delete
   the old key in the GitHub App's settings, and delete both local key
   files.

To replace `GITHUB_CREATION_TOKEN` or `GITHUB_READ_TOKEN`, send the new
value the same way.
[The creation credential](deploy.md#the-creation-credential)
says which token to use and how long it lasts.

### Respond to a stolen member key

[Respond to a stolen key](security/trust-boundaries.md#respond-to-a-stolen-key)
gives the steps. Step 4 of those steps replaces `SESSION_SECRET` as above.

## Retire a Worker

1. Tell the members, and give them time to clone their repositories with
   `dap clone`. Deletion removes every scope's journal.

2. For a project Worker that
   [Worker settings and bindings](security/settings.md) lists, report its
   use over 30 days first, as [Report observed use](usage-report.md)
   describes. `scripts/usage-report.mjs` refuses a Worker that page does
   not list with `worker-unknown`, so no usage report exists yet for a
   Worker of your own.

3. Delete the repositories, the Durable Object storage and the Worker.
   Follow steps 1 to 6 of
   [Remove the test deployment](self-host.md#remove-the-test-deployment).
   The deletion migration deletes every object and its data. The Artifacts
   namespace stays in your account, because Wrangler cannot delete it.

4. If the Worker used GitHub, delete the App's private key in the GitHub
   App's settings, and revoke the creation and read tokens.

To stop new rooms on one register without retiring the Worker, read
[What closes a register](deploy.md#what-closes-a-register) and
[Keep existing rooms able to create children](deploy.md#keep-existing-rooms-able-to-create-children).
