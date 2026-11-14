# Run your own service on a Mac

The [Mac host kit](../apps/room/celld/mac/) runs SeaweedFS, celld and Caddy
as LaunchDaemons under one user. The room has no Git host, and its
journals stay in the local store. Keep the installation prefix, with its
store and celld working directory, when you stop or remove the services.

The source supports the `base` family and package storage on a persistent
fleet. The fleet package witness remains due. It waits for the public Counter
release in CUT-R R2 and Hugh's selection of a machine and operator. No fleet
is currently available for that witness. The previously recorded Mac mini
is unavailable.

## Prerequisites

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

## Install

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

## Trust the certificate

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

## Create the first room

Keep the client home and the private project in directories that persist.
Plan only when you can finish deployment and installation within 14
minutes. To install packages, prepare the
[application trust file](#stage-application-packages) and add its option to
`prepare-project.mjs` before creating the project.

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

The plan uses `--host none` and the CLI's default `base` family, with
Register 28. `prepare-project.mjs` also accepts retained `unpublished`
Register 21 and `repository-binding` Register 25 plans. An explicit old
plan keeps its original pins. Preparing or deploying it does not migrate
its room.

A host-none room has no repository. Its Directory reserves the declared
publication prefixes, but publication and `bind-archive` refuse
`no-repository`. CB-1 supplies no archive provider. The archive-provider
and later archive scene belong to CB-2.

The prepared project keeps the production
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

## Stage application packages

Package storage needs a persistent celld fleet with its object-store bucket.
`celld dev` has no fleet bucket and cannot witness a package installation.
The `APPLICATION_CONTENT` binding uses `bucket_name: "application-content"`.
celld stores its objects under `r2/application-content/` in the fleet bucket.
That bucket is package storage, not a journal archive.

Before preparing the project, write the approved nonsecret trust rows to a
file. Each row has exactly `release`, `publisher`, and `host`:

```json
[{"release":"sha256:<64 lowercase hex>","publisher":"key_<publisher public key>","host":"github.com"}]
```

Use the release digest and publisher that the signed packet names, and the
canonical lowercase hostname of its immutable Git URI. A package version
alone does not identify a release. The file admits at most 128 rows and
64 KiB of UTF-8 JSON. Duplicate releases and extra row fields refuse the
whole file. An empty array trusts no release.

Add this option to the initial `prepare-project.mjs` command, using a
canonical absolute path to a plain file:

```sh
--application-trust-file "$HOME/dap-application-trust.json"
```

The helper stages exactly one R2 binding, `APPLICATION_CONTENT`, and the
`APPLICATION_TRUST` variable. GitHub staging preserves and checks both
settings before reading its private key. Deployment checks them again.
The deployment check uses the checkout's production parser through Node
and its locked dependencies. A missing validator or a rejected trust file
refuses deployment.
Both settings may be absent for an existing project that installs no
packages. A partial pair, another bucket, or another added field refuses.
The helpers retain private output and never overwrite an existing project.
Set the same `APPLICATION_TRUST` value for the CLI that installs the packet.

Follow [Install an application package](cli.md#install-an-application-package)
with the public immutable Git URI and its exact release. CB-1's later fleet
witness installs only the planner-signed Counter packet recorded in CUT-R
R2 after publication. The source work has no public Counter packet to
install yet. A TEST packet or the Grow demo cannot replace it. The recorded
active install, journal verification, restart and stored-byte reload remain
owed on Hugh's selected machine.

## Bind a new room to GitHub

A new `base` room can bind one repository after creation. A retained
`repository-binding` plan remains supported: Register 25, Directory 24,
Membership 11, Rules 10, Destination 18, and Inbox 1.
`prepare-project.mjs` adds its retained
[creation policy](../apps/room/celld/mac/repository-binding-policy.json)
when that plan requires it. The default `base` plan needs no historical
creation-policy override.

Existing rooms keep their pins and permissions. Binding preserves the
new room's issues and journals. This procedure does not migrate an older
room or rewrite a journal.

The App installation decides which repositories the App key can mint
tokens for. dap restricts each publication token to one recorded
repository ID and Contents write. That software check does not narrow the
App key itself. When your other rooms do not need the same App, select
only the one repository in the installation.

1. Install the GitHub App. For a separate installation, select the one
   repository and grant **Contents: read and write** plus **Metadata:
   read**. Record the App client ID, installation ID, account ID and login,
   and the repository's numeric stable ID.
2. Choose a private input path for the App's PKCS #8 key, owned by the
   service user at mode `0600` or `0400`. This App-only procedure supplies
   no static read token. See
   [GitHub host requirements](hosts.md#github-host-githubcom).
   Keep credentials in private files, never in chat or command arguments.
3. Plan a new register from a new persistent client home. Set the trusted
   certificate for Node as in the first-room procedure. Finish planning,
   initial deployment, and installation within 14 minutes.

   A planned register's client home creates one room. Keep that home for
   its room. To create another room, plan a new register from another new
   home, retain the earlier installed roots, deploy, and install that plan.
   A home that already claimed a room cannot create a second room.

   ```sh
   export DAP_HOME="$HOME/dap-binding-client"
   export BASE=https://mac-name.local
   export NODE_EXTRA_CA_CERTS="$HOME/dap-tls/cert.pem"
   mkdir -m 700 "$DAP_HOME"
   node packages/cli/bin/dap.js install --plan "$BASE" \
     --host none
   node apps/room/celld/mac/prepare-project.mjs \
     --origin "$BASE" --home "$DAP_HOME" --out "$HOME/dap-binding-project"
   ```

   The default plan is `base`. To retain the old binding family, add
   `--cohort repository-binding` to the plan command. The helper then
   includes that retained plan's creation policy. It keeps the production
   Worker and bindings and creates private session custody.

   To preserve child creation under earlier installed registers, add the
   `INSTALLED_REGISTER_SCOPES` string to this new prepared project's `vars`
   before GitHub staging. Include the new `REGISTER_SCOPE` and every
   earlier root that must keep creating children. The list needs 1 to 32
   distinct canonical Scope IDs and at most 4,096 UTF-8 bytes. Both staging
   and deployment validate it and preserve its exact bytes. Omitting it
   keeps the single-register behavior. The setting changes no Native
   authority or GitHub binding. See
   [Keep existing rooms able to create children](deploy.md#keep-existing-rooms-able-to-create-children).
4. Fill a nonsecret `github-app.json` with every
   [GitHub configuration field](hosts.md#github-host-githubcom). Set
   `registerScope` to the planned register. For a private repository, use
   `privateRepositories: true`, `publicReads: false`,
   `installationReads: true`, and `credentialIdentity: "adapter-attempt"`.
   Set a deliberate `maxBytes` allowance.
5. Put the App key at its private input path. Stage a new private project
   from the original prepared project:

   ```sh
   node apps/room/celld/mac/prepare-github.mjs \
     --project "$HOME/dap-binding-project" \
     --config "$HOME/dap-github/github-app.json" \
     --private-key "$HOME/dap-github/app-key.pk8.pem" \
     --out "$HOME/dap-binding-github-project"
   ```

   The helper uses the production GitHub readiness checks. It refuses a
   foreign register, unsafe input paths or file modes, invalid settings,
   and existing output. It preserves the original project, session secret,
   Worker entry, and unrelated settings. It prints only nonsecret metadata.
   Readiness validates syntax and configuration. It does not authenticate
   the App at GitHub. No network or deployment runs in this helper.
6. Deploy the staged project with `deploy.py`, as in the first-room
   procedure. Keep both projects and private deployment logs after any
   uncertain result. Once health reports sessions ready, install the
   retained plan and create the room:

   ```sh
   node packages/cli/bin/dap.js install --planned
   node packages/cli/bin/dap.js create "Bound room" --handle @owner
   ```

7. Activate the room's issue and change definitions through the
   [CLI](cli.md), then write the content to preserve before binding:

   ```sh
   node packages/cli/bin/dap.js issue open \
     --title "Content before binding" --body "Keep this issue and its history."
   node packages/cli/bin/dap.js show destination
   ```

   Record the destination's full scope reference, including its
   genesis, and the branch chosen at creation. The register still
   records host `none`.
8. Write the exact authorization pair in a nonsecret `bindings.json`, in
   the [binding format](hosts.md#github-host-githubcom). Use the actual
   destination reference, GitHub account, repository name and stable ID,
   and branch. Stage another new project from the same original project,
   with the same inputs and
   `--bindings-file "$HOME/dap-github/bindings.json"`. Use a fresh output
   directory. Deploy that project.
9. With the room administrator's client home, bind the repository.
   Replace the account, name, and ID below with your values:

   ```sh
   node packages/cli/bin/dap.js act bind-repository --on destination --target 0 \
     --set 'repository={"host":"github.com","namespace":"<account>","name":"<name>","id":"<numeric ID>"}' \
     --set 'why=Attach the reviewed repository to this room'
   node packages/cli/bin/dap.js show destination
   node packages/cli/bin/dap.js remote
   node packages/cli/bin/dap.js verify --all
   ```

   The base membership and retained Membership 11 give
   `destination.bind-repository` to administrators by default. An ordinary
   member cannot bind. The destination binds once and
   tells its recorded Directory which repository it chose. It records
   `empty` while first-head publication waits, then records `ready` with
   the accepted commit. Missing operator authorization sends no GitHub
   request. The App-only mode validates the installation, mints a token
   restricted to the recorded repository ID with Contents read, then checks
   the repository name and stable ID. A mismatch permits no Git read or
   publication-token mint. Publication tokens carry that one ID and Contents
   write. Choose an empty branch: first-head publication uses
   compare-and-swap and does not overwrite existing history.
10. To check the binding, enrol an agent through the room's normal
    agent-key invitation. Have the agent propose a head from a branch,
    then have the owner review and merge it. Compare the destination's
    recorded commit with GitHub's branch head.

The binding enables repository commands. The public Site route does not
select repositories attached after creation. Repository binding supplies
no archive provider for celld. CB-2 owns that separate work.

## Maintain the host

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

## Stop and remove

```sh
sudo /Library/dap-host/bin/down --prefix /Library/dap-host
sudo apps/room/celld/mac/uninstall.sh --prefix /Library/dap-host
```

Uninstall needs all three jobs stopped. It removes only the kit's own
LaunchDaemon files, and only if they are unchanged. It keeps the prefix,
the journals, the runtime working directory, the private configuration
and the node name.

## Source

The broader guide retains its 30 October 2026 source review at main
`5dc9765f`. CB-1 updates the default family and package-staging path in
source on 14 November 2026. The fleet package witness has not run. Sources: [apps/room/celld/mac](../apps/room/celld/mac/), [scripts/celld-smoke.mjs](../scripts/celld-smoke.mjs), [packages/cli/src/line.ts](../packages/cli/src/line.ts).
