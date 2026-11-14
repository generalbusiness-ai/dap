# Operate a service

You keep a scope Worker running after its first deployment. You read its
health and logs, deploy new source, roll back, keep copies of the record,
rotate its secrets, and retire it. This page assumes the Cloudflare
deployment from
[Run your own service on Cloudflare](self-host-cloudflare.md). You need:

- The checkout that you deployed from, with its ignored file
  `apps/room/wrangler.self-host.jsonc`.
- A Cloudflare login that can deploy the Worker.
- The `DAP_HOME` directory of an admin of your rooms.
- The pinned Wrangler, which you run as `npx -y wrangler@4.147.0`.

The examples use `https://dap-my-room.example.workers.dev` as the Worker's
address. Replace it with your own. Run every command on this page from
the root of the checkout.

For the Mac host, [Maintain the host](self-host-mac.md#maintain-the-host)
gives the stop, restart and verify steps. To serve the MCP service to AI
apps at `/mcp`, read [Run the hosted MCP endpoint](hosted-mcp.md).

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
   npx -y wrangler@4.147.0 tail --config apps/room/wrangler.self-host.jsonc --format pretty
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
[Run your own service on Cloudflare](self-host-cloudflare.md#deploy-a-room)
describes in step 3, and name its dataset `artroom_metrics_v1`. The deploy
check reads only that dataset.
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

New source does not move an existing room to newer platform versions.
Each room keeps the Rules, Membership and other platform versions that it
pinned at creation. To use newer versions, create a new room.

[Deploy the scope Worker](deploy.md) gives the rules for settings that
the file holds and settings that `--keep-vars` keeps.

## Deploy the hosted Workers

One command deploys five hosted Workers by name: `grow`, `lending`,
`demo`, `artroom-scope` and `sandbox`. The first four are room Workers
with configurations in `apps/room/wrangler.<name>.jsonc`. `sandbox` is the
application sandbox `dap-application-sandbox`, with its configuration in
`apps/sandbox/wrangler.rollout.jsonc`. It serves the screen hosts under
`inguz.space` and calls the room Workers through service bindings.

1. Check out the reviewed commit and confirm that the checkout is clean.

   ```sh
   git rev-parse HEAD
   git status --short
   ```

   Use the deployed commit recorded for each Worker, or its previous
   successful receipt. A Worker version ID is not a source commit. Do not
   choose a commit from a branch tip or guess from a deployment time.

2. Select an existing room on each Worker with its own `DAP_HOME`. Set
   `ROOM_SCOPE` to a scope in that room, then record the reads before
   deployment. Repeat these commands for each room.

   ```sh
   dap log "$ROOM_SCOPE"
   dap verify --all
   ```

3. Keep the existing secrets and review the tracked configuration.

   - `grow` needs `SESSION_SECRET`. Its file sets `DEPLOYMENT` to
     `dap-grow-v1` and supplies its Artifacts configuration.
   - `lending` and `demo` need `SESSION_SECRET` and an existing
     `DEPLOYMENT` setting. Their files supply their Artifacts configuration.
   - `artroom-scope` needs `SESSION_SECRET` and its existing `DEPLOYMENT`,
     register and host settings. Its tracked index mode is `enforce`.
   - On any Worker whose retained host uses `GITHUB_APP_CONFIG`, keep
     `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CREATION_TOKEN` and
     `GITHUB_READ_TOKEN`. Keep `GITHUB_CLEANUP_TOKENS` if that host uses
     cleanup tokens. An Artifacts host needs none of these GitHub secrets.
   - `sandbox` needs no secret. Its file sets `SCREEN_HOSTS`, the mapped
     screen hosts, and binds the `ROOM`, `GROW` and `LENDING` services. It
     has no Durable Objects and declares no migrations.

   The command changes no secret. Send a missing or replacement secret
   through standard input, as [Rotate secrets](#rotate-secrets) describes.
   The tracked configuration states each nonsecret variable that this
   command sets. `--keep-vars` preserves only variables that the file omits.
   The command accepts no variable override.

4. Set `GROW_DEPLOYED`, `LENDING_DEPLOYED`, `DEMO_DEPLOYED`,
   `LEGACY_DEPLOYED` and `SANDBOX_DEPLOYED` to their known full source
   commits. Choose an absolute receipt directory outside every checkout.
   Build the dry-run bundles.

   ```sh
   RECEIPTS=/absolute/operator/deploy-receipts
   node scripts/deploy.mjs grow lending demo artroom-scope sandbox \
     --deployed "grow=$GROW_DEPLOYED" \
     --deployed "lending=$LENDING_DEPLOYED" \
     --deployed "demo=$DEMO_DEPLOYED" \
     --deployed "artroom-scope=$LEGACY_DEPLOYED" \
     --deployed "sandbox=$SANDBOX_DEPLOYED" \
     --receipt-dir "$RECEIPTS" --dry-run
   ```

   The command prints HEAD, its external scratch directory and the SHA-256
   of each sorted module manifest. It hashes exact emitted bytes and names,
   excluding the generated README and source maps. These hashes describe
   dry-run output, not uploaded bytes or kept live variables. Compare the
   hashes at two reviewed commits to see whether their bundles differ.
   A dry run uploads nothing and writes no deployment receipt.

   A new migration tag stops the command. Review its one-way effect before
   adding `--accept-migration name=tag` to both commands. Name each new tag.
   The command refuses a changed historical migration or an unused
   acceptance. [Roll back](#roll-back) gives the migration limit.

5. Deploy in order: Grow, Lending, demo, the legacy Worker, then the
   sandbox. The sandbox goes last because it calls the room Workers.

   ```sh
   node scripts/deploy.mjs grow lending demo artroom-scope sandbox \
     --deployed "grow=$GROW_DEPLOYED" \
     --deployed "lending=$LENDING_DEPLOYED" \
     --deployed "demo=$DEMO_DEPLOYED" \
     --deployed "artroom-scope=$LEGACY_DEPLOYED" \
     --deployed "sandbox=$SANDBOX_DEPLOYED" \
     --receipt-dir "$RECEIPTS"
   ```

   Both commands run Wrangler 4.147.0 from an external scratch directory.
   They install nothing in the checkout. Wrangler can still create temporary
   files under the config root's `.wrangler/tmp`. The deployment uses `--keep-vars`.
   Each completed Worker gets a receipt with its commit, configuration,
   dry-run bundle hash, Worker version ID and time. Keep those receipts.
   On the next run, `--previous-receipt "grow=/absolute/receipt.json"`
   replaces `--deployed "grow=$GROW_DEPLOYED"`, and likewise for each name.
   If a previous receipt has the same dry-run bundle hash and the same
   configuration bytes as the current build, the command prints that name
   as `unchanged`. It sends nothing and writes no receipt for that name,
   deploys the other names and exits 0. Keep the previous receipt for that
   name. A changed `SCREEN_HOSTS` changes the configuration bytes, so the
   sandbox still deploys.

   Exit 3 means a partial result. Read its external partial record and
   reconcile the reported Worker version before another run. A failed
   output, hash or receipt check can follow a completed upload. The command
   stops later Workers, never retries and never rolls back automatically.
   If output admission fails, recovery reads at most the first 256 KiB and
   keeps only complete deployment records. The partial record keeps the
   read failure and qualifies any prefix hash. Versions beyond those
   complete records remain unknown.
   Exit 1 means another command failure. Keep the external scratch output.

6. Run the read-only smoke checks.

   ```sh
   node scripts/deploy-smoke.mjs grow --url https://dap-grow.inguz.workers.dev
   node scripts/deploy-smoke.mjs lending --url https://dap-lending.inguz.workers.dev
   node scripts/deploy-smoke.mjs demo --url https://dap-demo.inguz.workers.dev
   node scripts/deploy-smoke.mjs artroom-scope --url https://artroom-scope.inguz.workers.dev
   node scripts/deploy-smoke.mjs sandbox --host https://grow.inguz.space --room "$GROW_ROOM"
   ```

   Each command uses a browser User-Agent. Health must answer 200 three
   times. Only a first 503 gets one cold-start retry. The page must answer 200
   and closed MCP must answer 404. A declared creation offer must answer 200
   and name the exact configured register. An omitted offer must answer 404.
   A kept live offer that the tracked file omits fails this check.

   The sandbox has no health route. `--host` must be a screen host that
   `SCREEN_HOSTS` maps in the tracked file, and `--room` names an existing
   room scope behind that host. The sandbox smoke checks five reads:

   - `GET /`, `GET /site/x` and `GET /applications/x` on the mapped host
     answer 404.
   - `GET /v1/scopes/<room>` on the mapped host answers 403 with the body
     `{"ok":false,"reason":"forbidden"}`. This read passes through the
     sandbox to the bound room Worker, so it shows that the mapping and the
     service binding work.
   - `GET /` on `unmapped-smoke` under the same parent domain answers 404.

   A smoke failure leaves every deployment receipt intact and exits 1.
   Investigate before another deployment. The optional analytics check in
   [Observe a deployment](operations.md) does not replace smoke.
   Lending has no analytics dataset.

7. Repeat `dap log` and `dap verify --all` on the same existing rooms.
   Compare the records with step 2. Keep the smoke results with the receipts.
   A health check alone proves no room or Git continuity.

To roll back, run the version-list and rollback commands in
[Roll back](#roll-back) from an external scratch directory. Give Wrangler
an absolute path to the hosted configuration. A rollback cannot undo a
Durable Object migration or remove records that the newer version wrote.

## Cut over to the new journal format

Rooms made before the identifier cutover are retired. An old link answers `room-retired`, or 404 on a Worker that serves only indexed scopes. The browser keeps its old rows and no longer reads them.

An old room link answers 404 on a Worker in enforce mode, because the new
index does not list the room. A request that reaches a retired room answers
410 and names the reader commit.

Before deployment, the planner files an inventory act that lists each retired
room and its reader commit. Use that act to find the reader for an old link.
The Worker does not read the inventory act at runtime. Do not seed the new
index with retired rooms or old index rows.

The retired-format reader is commit
`64112e4576b4c3c8fb668389786deb6b703da417`, named by
[`RETIRED_ROOM_READER_COMMIT`](../packages/bytes/src/retired-room.ts).

## Roll back

1. List the recent deployments and their versions.

   ```sh
   npx -y wrangler@4.147.0 deployments list --config apps/room/wrangler.self-host.jsonc
   ```

   Wrangler lists the 10 most recent deployments with their version IDs.

2. Roll back to the version that you recorded before the deployment.

   ```sh
   npx -y wrangler@4.147.0 rollback <version-id> --config apps/room/wrangler.self-host.jsonc --message "<reason>"
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

   The command prints a `Read token:` line that names the act which
   issued the token and when the token ends. It then prints the remote
   URL and `Cloned into`. A room under host `none` answers
   `no-repository` and has nothing to clone.

   For a room that has an archive, add `--archive` to the same command.
   The clone then also fetches the journal refs.

   ```sh
   dap clone /absolute/path/to/room-copy --archive
   ```

   The command then also prints this line:

   ```
   Fetched refs/artroom/journal/* with the same read token. Verify the expected journal set offline before accepting the archive.
   ```

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
   node --input-type=module -e 'import { randomBytes } from "node:crypto"; process.stdout.write(JSON.stringify({SESSION_SECRET:randomBytes(32).toString("base64url")}));' | npx -y wrangler@4.147.0 secret bulk --config apps/room/wrangler.self-host.jsonc
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
   node -e 'process.stdout.write(JSON.stringify({GITHUB_APP_PRIVATE_KEY: require("node:fs").readFileSync(0, "utf8")}))' < /absolute/path/to/new-app-key.pkcs8.pem | npx -y wrangler@4.147.0 secret bulk --config apps/room/wrangler.self-host.jsonc
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

## Keep a register for existing rooms

With `INSTALLED_REGISTER_SCOPES` absent, a deployed Worker admits new child
scopes only under its current `REGISTER_SCOPE`. Replacing that pin leaves
earlier rooms readable but stops their new inboxes, lanes and other child
scopes. Switching the host configuration without retaining that root also
stops old-room Git authority. A successful health or room read proves
neither child-creation nor Git continuity.

To keep earlier rooms creating children and using Git, list the current register and all
earlier installed roots in `INSTALLED_REGISTER_SCOPES`, as
[Keep existing rooms able to create children](deploy.md#keep-existing-rooms-able-to-create-children)
describes. `REGISTER_SCOPE` still selects the current primary register.
Native lineage and authority checks still apply. A separate Worker with
its own namespaces remains an option when you need a separate service.

On a maintained Mac host, put the reviewed list in the new prepared project
before GitHub staging, as
[Run your own service on a Mac](self-host-mac.md#bind-a-new-room-to-github)
describes. Both Mac project validators check it. After any
register change, prove an actual child birth in an earlier room; a setting
or existing-room read alone proves no deployed continuity.

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
   [Remove the test deployment](self-host-cloudflare.md#remove-the-test-deployment).
   The deletion migration deletes every object and its data. The Artifacts
   namespace stays in your account, because Wrangler cannot delete it.

4. If the Worker used GitHub, delete the App's private key in the GitHub
   App's settings, and revoke the creation and read tokens.

To stop new rooms on one register without retiring the Worker, read
[What closes a register](deploy.md#what-closes-a-register) and
[Keep existing rooms able to create children](deploy.md#keep-existing-rooms-able-to-create-children).
