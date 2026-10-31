# Deploy the scope Worker

`npm run deploy:scope` deploys the scope Worker from
`apps/room/wrangler.jsonc` with Wrangler 4.147.0 and `--keep-vars`. That
flag keeps the plain settings that the Worker already has and the file
omits. A value in the file, or a value given with `--var`, replaces the
stored one. The command sets no missing setting and changes no secret.

Deploy only from a checkout of the reviewed commit, after a review of that
exact head. From that checkout, run:

```sh
npm run deploy:scope
```

To deploy another configuration, run the pinned Wrangler from a scratch
directory and give it the absolute path of the file:

```sh
DAP_REPO=/absolute/path/to/the-reviewed-checkout
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$DAP_REPO/apps/room/wrangler.demo.jsonc"
```

Repeat the Worker's reviewed `--var` overrides on the same command. A value
in the file or in `--var` needs review, because it replaces what the Worker
holds. `--keep-vars` does not establish that a kept value is correct.

To deploy on your own Cloudflare account for the first time, follow
[Run your own service](self-host.md). To run the Worker on your machine,
follow [Run the local Worker](celld.md).

A deployment serves rooms of every definition version that its platform
package has shipped. Each room runs the version that its genesis pinned
(see [Scopes](scopes.md)).

## Settings the order uses

[Worker settings and bindings](security/settings.md) lists every setting
with its reader, parser and failure behavior. The order below uses these:

- `DEPLOYMENT`: the deployment's name, 1 to 128 UTF-8 bytes. Every read
  session names it.
- `SESSION_SECRET`: a secret of at least 32 bytes from a cryptographic
  random source. It signs read sessions. Without it or `DEPLOYMENT`, the
  Worker issues and accepts no session. A new value ends every session.
- `REGISTER_SCOPE`: the register's scope ID. On a deployed Worker, a
  creation with no parent is accepted only when it is the exact signed
  install of this register.
- `ARTIFACTS_CONFIG` and `ARTIFACTS_NAMESPACE`: the Artifacts host. See
  [Configure a Git host](hosts.md#cloudflare-artifacts-host-artifacts).
- `GITHUB_APP_CONFIG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CREATION_TOKEN`,
  `GITHUB_READ_TOKEN` and the optional `GITHUB_CLEANUP_TOKENS`: the GitHub
  host. See [Configure a Git host](hosts.md#github-host-githubcom).
- `PLATFORM_CREATION_PINS`: optional. Earlier platform pins that new
  scopes may use besides the default cohorts, `archive-device-publication`,
  `unpublished` and `commons`. See
  [Roll out new creation versions](#roll-out-new-creation-versions).
- `ALLOW_OPEN_CREATION`: local and test deployments only. Never set it on
  a hosted Worker.

## Provision the Commons Worker

`dap-commons` is a separate Worker at
`https://dap-commons.inguz.workers.dev`, configured by
[`apps/room/wrangler.commons.jsonc`](../apps/room/wrangler.commons.jsonc).
It uses the same Artifacts host as `dap-demo` and its own namespace,
`dap-commons`. The file pins Register 23, Directory 22, Membership 9,
Rules 14, Destination 16, Inbox 1 and Commons 1. The CLI's default cohort
stays the same, so planning and installing select `--cohort commons`.

Run the pinned Wrangler from a scratch directory for each reviewed
deployment:

```sh
DAP_REPO=/absolute/path/to/the-reviewed-checkout
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$DAP_REPO/apps/room/wrangler.commons.jsonc"
```

After the reviewed head lands, follow [the order](#the-order):

1. Create the `dap-commons` Artifacts namespace. Deploy the reviewed
   configuration with `DEPLOYMENT=dap-commons` and `SESSION_SECRET`.
2. From a separate empty private CLI directory, run:

   ```sh
   dap install --plan https://dap-commons.inguz.workers.dev --cohort commons --host artifacts --namespace dap-commons
   ```

3. Keep that exact install plan. Replace `unplanned` with its public
   register ID in `REGISTER_SCOPE` and in `ARTIFACTS_CONFIG.registerScope`.
   Deploy the same configuration again before you submit the plan.
4. From the same private directory, run:

   ```sh
   dap install --planned --cohort commons
   ```

5. Record the full register reference after the install. Its incarnation
   is not known while the plan only names the future scope. Record it with
   the planned scope ID and the deployed version, and commit the two public
   register bindings. Check the full reference and the exact Register 23
   definition before you create a room.

The `unplanned` pins in the file make no claim about identity. Provisioning
uses the explicit cohort and the kept plan. The `dap-demo` Start metadata
does not govern this path or revive the retired demo-offer route. Keep the
existing `dap-demo`, `dap-grow` and `dap-lending` registers, and leave
`ALLOW_OPEN_CREATION` unset. Commons rooms use this Worker until the
[register succession design](../notes/2026-10-22-definition-succession.md)
lands. Rooms on `dap-demo` stay on its Register 17.

## Roll out new creation versions

`PLATFORM_CREATION_PINS` decides which platform versions a Worker accepts
for new scopes. Historical loading and replay do not read it, and it changes
no existing scope's pin. Follow these steps for each Worker that changes.

1. Keep that deployment's saved R2 manifest and its original CLI directory.
   Confirm the service, the namespace and the register's identity from
   operator records. Do not treat the manifest or the fixed index as a
   global live-scope inventory.
2. Run the version report with the reviewed CLI and that manifest:

   ```sh
   dap scope-index versions --manifest /absolute/path/to/deployment-scopes.json
   ```

   The report rereads the exact listed genesis identities and hashes.
   `observedPins` holds their platform pins. `usableCreationCohorts` holds
   the supported cohort coverage, including the default pins. An unknown
   pin, an unsupported cohort, an unavailable read or a mismatch makes the
   report unready. The report changes no setting and emits no policy JSON.
   Register-mode reads may register the exact scopes they authenticate.
3. Review the historical pins to keep for that Worker. Keep
   `ARTIFACTS_CONFIG.registerScope` and `REGISTER_SCOPE` equal to the exact
   planned signed install. Keep attempted plans with their original pins
   and IDs. Do not replan an attempted or acknowledged install to make it
   fit the new defaults. A Worker accepts one configured register root.
   Allowing both sets of version pins does not accept two roots. Use a
   separate Worker or an explicitly planned root cutover for a new register,
   and keep the old root on a Worker that serves a fixed public offer.
4. Deploy the exact reviewed source and nonsecret policy, for each Worker
   separately. Keep its bindings, secrets, register pins and reviewed
   `--var` overrides. `--keep-vars` keeps omitted values, and it does not
   fill in or validate this policy. A deployed object reads the policy when
   it activates.
5. Verify the intended refusal of a new creation and the behavior of
   existing scopes. `/health` neither validates nor shows
   `PLATFORM_CREATION_PINS`, and a healthy register probe does not prove
   that a version is accepted or that the configuration is complete.

`dap scope-index census` lists the scopes a Worker has registered. A
registration that lands below an advancing cursor can be missed during its
recorded time window, and an unregistered legacy object is not listed. A
complete registered-scope census proves neither an empty legacy fleet nor
permission to retire a definition version. Neither the CLI report nor this
page attests hosted policy, namespace isolation, full live-scope coverage
or readiness for every creation path.

## The order

A register's ID follows from its install's signed intent, so the command
line computes the ID before the register exists. The Worker accepts only
the register that `REGISTER_SCOPE` names. Plan first, set the pin, then
install:

1. **Deploy** the Worker. Set `DEPLOYMENT` and `SESSION_SECRET` from
   standard input, as [Run your own service](self-host.md) shows.
2. **Plan.** Run `dap install --plan <base-url> --host <host>` with the
   host's namespace:

   - `--host github.com --namespace <login>`, where `<login>` is the
     account's `login` in `GITHUB_APP_CONFIG`.
   - `--host artifacts --namespace <namespace>`, where `<namespace>` is
     the Worker's Artifacts namespace.
   - `--host none`, with no namespace. The room has no Git host.

   The plan creates nothing. It prints `Planned: register sc_...` and the
   seed's time, then `Set REGISTER_SCOPE to sc_...`. The CLI keeps the
   plan in its config directory. You can install it until the seed's
   time, 14 minutes after the plan.
3. **Set the pin.** Set `REGISTER_SCOPE` to the planned register ID. Set
   the host's settings with the same ID: `registerScope` in
   `GITHUB_APP_CONFIG` with the GitHub secrets, or `registerScope` in
   `ARTIFACTS_CONFIG`. `--host none` needs no host setting. Deploy again.
   If the host or namespace of a register differs from the host setting,
   the Worker sends nothing for it.
4. **Install.** Run `dap install --planned`. The CLI checks that the plan
   still makes the same ID, creates the register, and prints
   `Installed: register sc_..., ..., as planned.`
5. **Create the room.** Run `dap create <name> --handle @you`. The
   register sends the repository creation at once. If the command stops
   waiting, run the same command again. It continues the pending creation
   and signs nothing new. `--again` signs a second creation, which makes a
   second repository.

If the seed's time passes before the CLI sends the install, the CLI
refuses it as `plan-expired`:

- For a plan with neither `--cohort` nor `--host none`, plan again and
  set the new ID.
- For a plan with `--cohort` or `--host none`, keep the original
  directory. Make the new plan, its host settings and every later command
  in a new empty `DAP_HOME` ([CLI](cli.md)).

If the CLI sent the install, or the service acknowledged it, run
`install --planned` again from the original directory. An expired
deadline does not allow a replacement.

Finish the first room while the install is inside its 900-second read
window. Before enrollment, the creation's read window also lasts 900
seconds. The Worker does not renew an expired window. Do not sign a new
creation to replace one whose window expired.

### Install without a plan

`dap install <base-url> --host ... --namespace ...` with no plan creates
the register at once and prints its ID. A Worker accepts it only in two
cases:

- `DEPLOYMENT` is unset, as on a local Worker.
- A test deployment sets `ALLOW_OPEN_CREATION` to `true` and also has a
  valid register pin.

When you set the pin after the install, the register's object can start
before the setting takes effect. A creation then waits until the object
sees the setting. Plan first to avoid that wait.

## The creation credential

`GITHUB_CREATION_TOKEN` is one of these:

- An installation token minted from the App with `administration: write`.
  It expires one hour after it is minted. Mint it just before you create
  the room. For a later room, replace it and restart.
- An operator's fine-grained token with Administration write on the
  organization.

For a `User` account, the Worker creates the repository as that user. An
installation token cannot do that, so use the user's own fine-grained
token.

When `publicReads` is true and the repositories are public, the Worker
reads them with no token. `GITHUB_READ_TOKEN` is then not needed.

## Browser Start configuration

`DEMO_START_CONFIG` configures Browser Start, which creates a room from the
room page. Browser Start accepts only version 3 of the setting. The setting
is nonsecret JSON with exactly these fields:

| Field | Value |
|---|---|
| `v` | `3` |
| `origin` | The Worker's canonical public origin. `dap-demo` uses `https://dap-demo.inguz.workers.dev`. |
| `deployment` | The Worker's actual `DEPLOYMENT` value. |
| `register` | The full reference of the installed register, `{ inc, kind, scope }`. A scope ID alone does not work. |
| `definition` | `platform:register@17`. |

The register must be open, and its recorded host must be `artifacts`. Its
namespace must equal both `ARTIFACTS_CONFIG.namespace` and
`ARTIFACTS_NAMESPACE`. Its scope ID must equal
`ARTIFACTS_CONFIG.registerScope`. The adapter's service hostname is
separate from the recorded host.

The Worker reads the version 3 setting into a checked internal version 2
context and returns a version 2 offer. Register 17 has no `purpose` field.
The request's effective origin must equal `origin`. Behind a proxy, set
`PUBLIC_ORIGIN`. When it is unset, the Worker uses the URL's origin.
Forwarded headers supply no identity. A different register, a different
incarnation, or a setting of version 1 or 2 produces no offer. An offer
grants no authority: the native namespace still judges the signed creation
lineage.

The `artroom-scope` Start page links to `dap-demo` for new rooms. It keeps
**Check** and **Continue** for a creation that started on `artroom-scope`.
The link carries no saved request or browser key. `artroom-scope` keeps its
live `DEMO_START_CONFIG` for existing GitHub destinations and retained Start
references until 8 November 2026.

The client keeps its earlier private custody and can still read version 1
offers. The server makes no offer from setting version 1 or 2, including
the preflight for an existing register 7 or register 8 reference. An
operation that the client already submitted keeps its retained intent and
its readback path. The client does not move a prepared earlier descriptor
to another register.

The setting adds no GitHub host authority. GitHub authority comes from the
register that `GITHUB_APP_CONFIG` pins and from its verified destinations.

## Trusted application screens

The Worker serves installed application packages at
`/applications/<directory>/<install-item>/<encoded-presentation-id>/`.
Counter and Lending are maintained packages. The Worker holds neither
app's routes nor its compiled assets. To add a release that you trust,
commit its packet and install it in the room. The Worker needs no new
deployment.

1. Create a private R2 bucket and bind it as `APPLICATION_CONTENT`.
   `apps/room/wrangler.jsonc` binds the project's bucket
   `artroom-application-content`. Leave public access to the bucket off.
2. Set `APPLICATION_TRUST` to nonsecret JSON rows with exactly `release`,
   `publisher` and `host`. Use the release and publisher that `dap pack`
   prints, and the lowercase hostname of the immutable Git URI:

   ```json
   [{"release":"sha256:<64 lowercase hex>","publisher":"key_<publisher public key>","host":"github.com"}]
   ```

3. To install a package with local `dap install` or local `dap mcp`, set
   the same `APPLICATION_TRUST` value in that process's environment.

The Worker applies these rules:

- With no `APPLICATION_TRUST`, the Worker installs nothing. A malformed or
  ambiguous row refuses the whole list.
- Each row needs an explicit `host`. A row in the earlier two-field form
  refuses. A host has no scheme, port, path, credentials or noncanonical
  spelling. One release has one host row.
- Native resolution and MCP `install_application` compare the release and
  host before they open a connection. The HTTPS transport refuses
  redirects and keeps its byte, object and deadline bounds. It refuses a
  SHA-256 Git repository before any network request.
- The Worker checks the complete signed packet and the exact publisher
  before it stores a package. It stores immutable content keyed by digest.
  It has no route that uploads, lists or deletes objects, or that reads an
  arbitrary key.
- Each screen request checks current trust and an active native
  installation.
- The route shares the room's origin, so it does not isolate packages.
  Only the releases that you list can enter.
- `DEPLOYMENT` must be the value that native read sessions use. The screen
  context carries that deployment and exact room references. It grants no
  membership authority.

To withdraw a release, remove its row. Screen delivery stops, and the
native host refuses new acts on that installation and its declared
descendants with `application-revoked`. The host finds the release through
native creation records, so another trusted release with the same
definitions stays usable. Receipts already given, replay and pending work
keep their behavior.

Before you remove a row, list the releases that a room has installed:

```sh
dap scope-index applications --manifest worker-scopes.json --out installed-releases.json
```

The command reads the Worker's saved scope-index manifest with the
matching operator CLI configuration. The report covers only the repository
rooted at your configured Directory, not other rooms on the Worker. If a
Rules scope is unreadable or an installation is pending, the report is
incomplete. Find the cause and run the command again. The
[CLI guide](cli.md) covers room selection, the package URI, default grants,
and progress and refusal reads.

## What is never written down

Never write down the values of `SESSION_SECRET`, `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_CREATION_TOKEN`, `GITHUB_READ_TOKEN` and `GITHUB_CLEANUP_TOKENS`.
Set each one from a file or from standard input, never as a command
argument. Keep `DEPLOYMENT` set on every deployment and every secret
update. The command line keeps its signing keys in its config directory,
which only you can read. Its config file holds no secret.

## Source

Checked against main `c8c7b631` on 30 October 2026. Sources: [package.json](../package.json), [packages/scope/src/creation-admission.ts](../packages/scope/src/creation-admission.ts), [packages/scope/src/register-setting.ts](../packages/scope/src/register-setting.ts), [packages/cli/src/commands.ts](../packages/cli/src/commands.ts), [apps/room/demo-creation.ts](../apps/room/demo-creation.ts), [packages/scope/src/applications/route.ts](../packages/scope/src/applications/route.ts).
The commands on this page were not run for this revision.
