# Deploy the scope Worker

`npm run deploy:scope` deploys the scope Worker from
the ignored local file `apps/room/wrangler.self-host.jsonc` with Wrangler 4.147.0 and `--keep-vars`. That
flag keeps the plain settings that the Worker already has and the file
omits. A value in the file, or a value given with `--var`, replaces the
stored one. The command sets no missing setting and changes no secret.

Deploy only from a checkout of the reviewed commit, after a review of that
exact head. Copy and configure the neutral template as described in
[Run your own service on Cloudflare](self-host-cloudflare.md) before the first
deployment. From that checkout, run:

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
[Run your own service on Cloudflare](self-host-cloudflare.md). To run the
Worker on your machine, follow [Run the local Worker](celld.md).

A deployment serves rooms of every definition version that its platform
package has shipped. Each room runs the version that its genesis pinned
(see [Scopes](scopes.md)). No act moves an existing room to a newer
Rules, Membership or other platform version. To use newer versions,
create a new room.

## The order

A register's ID follows from its install's signed intent, so the command
line computes the ID before the register exists. The Worker accepts only
the register that `REGISTER_SCOPE` names. Plan first, set the pin, then
install:

1. **Deploy** the Worker. Set `DEPLOYMENT` and `SESSION_SECRET` from
   standard input, as
   [Run your own service on Cloudflare](self-host-cloudflare.md) shows.
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

   Under policy `keys`, the command reads the register's summary before it
   signs `found`. A key with no entry at the register in the last 900
   seconds gets `forbidden`. The command prints
   `Cannot read <register>: forbidden.` and signs nothing. So run the first
   creation within 900 seconds of the install. Each accepted `found` restarts
   those 900 seconds for the key that signed it.

If the seed's time passes before the CLI sends the install, the CLI
refuses it as `plan-expired`:

- For a plan with none of `--cohort`, `--host none` or
  `--register-policy open`, plan again and set the new ID.
- For a plan with `--cohort`, `--host none` or `--register-policy open`,
  keep the original
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

## Settings the order uses

[Worker settings and bindings](security/settings.md) lists every setting
with its reader, parser and failure behavior. The order uses these:

- `DEPLOYMENT`: the deployment's name, 1 to 128 UTF-8 bytes. Every read
  session names it.
- `SESSION_SECRET`: a secret of at least 32 bytes from a cryptographic
  random source. It signs read sessions. Without it or `DEPLOYMENT`, the
  Worker issues and accepts no session. A new value ends every session and
  does not end signed reads. See
  [What a revoked key keeps](security/trust-boundaries.md#what-a-revoked-key-keeps).
- `REGISTER_SCOPE`: the register's scope ID. On a deployed Worker, a
  creation with no parent is accepted only when it is the exact signed
  install of this register.
- `INSTALLED_REGISTER_SCOPES`: optional nonsecret JSON array for child
  creation and Git host authority under earlier installed registers. It holds 1 to 32 distinct
  scope IDs, includes the current register, and fits within 4,096 UTF-8
  bytes. Without it, creation admits only the current register, and each host keeps
  its configured single register. An invalid list closes creation and Git
  host authority and makes register health unavailable.
- `ARTIFACTS_CONFIG` and `ARTIFACTS_NAMESPACE`: the Artifacts host. See
  [Configure a Git host](hosts.md#cloudflare-artifacts-host-artifacts).
- `GITHUB_APP_CONFIG`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CREATION_TOKEN`,
  `GITHUB_READ_TOKEN` and the optional `GITHUB_CLEANUP_TOKENS`: the GitHub
  host. See [Configure a Git host](hosts.md#github-host-githubcom).
- `PLATFORM_CREATION_PINS`: optional. Earlier platform pins that new
  scopes may use besides the default cohorts, `failed-claim`, `archive-device-publication`,
  `unpublished` and `commons`. See
  [Roll out new creation versions](#roll-out-new-creation-versions).
- `ALLOW_OPEN_CREATION`: local and test deployments only. Never set it on
  a hosted Worker.

## Roll out new creation versions

`PLATFORM_CREATION_PINS` decides which platform versions a Worker accepts
for new scopes. Historical loading and replay do not read it, and it changes
no existing scope's pin. Follow these steps for each Worker that changes.

1. Keep that deployment's saved scope-index manifest file and its original
   CLI directory.
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
   fit the new defaults. A Worker creates new rooms under one current
   register, `REGISTER_SCOPE`. Allowing both sets of version pins does not
   add a second current register. For a new register, use a separate
   Worker, or list the old and new roots in `INSTALLED_REGISTER_SCOPES`
   before the switch. See
   [Keep existing rooms able to create children](#keep-existing-rooms-able-to-create-children).
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

### Create rooms that refuse a shared founder and recovery key

The `separate-recovery` cohort refuses a room whose founder key is also its
recovery key: register 24, directory 23, membership 10, rules 10,
destination 13 and inbox 1. The cohort is explicit. Unqualified installs
use register 26, and the newest cohort holds only rules 10 and inbox 1 of
these pins. The Worker needs no Durable Object migration,
because the cohort adds no class.

To create new rooms on this cohort:

1. Add `platform:register@24`, `platform:directory@23` and
   `platform:membership@10` to `PLATFORM_CREATION_PINS`, and deploy.
2. Set `DAP_HOME` to a new private directory, and run
   `dap install --plan <base-url> --cohort separate-recovery --host <host> --namespace <namespace>`.
3. Set `REGISTER_SCOPE`, and `registerScope` in the Worker's host setting,
   to the planned ID, and deploy.
4. Run `dap install --planned --cohort separate-recovery` with the same `DAP_HOME`.

One Worker creates new rooms under one current register. Before you move
that setting, list the old register in `INSTALLED_REGISTER_SCOPES`, so its
rooms keep creating children. See
[Keep existing rooms able to create children](#keep-existing-rooms-able-to-create-children).
Rooms and registers on older pins keep their rules and their acts. An
older room whose founder key is also its recovery key stays that way until
the recovery key rotates.

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

## What closes a register

A register holds at most 64 live claims. Register 26 closes a claim as final `failed` when its last repository-creation attempt ends with nothing selected. That claim frees its place; a late confirmed reply goes to cleanup. An unwired host has made no attempt, so its claim remains pending.

Earlier registers retain their historical behavior. In particular, Register 17 keeps a claim `pending` after all three attempts fail. At 64 live claims, it refuses later `found` requests with `type-full`. A returning host, rerun, `--again`, restart, or elapsed time does not free those places. [An outage can close a register](security/trust-boundaries.md#an-outage-can-close-a-register) describes that retained failure mode.

The way out of a full register is a new register. On the same Worker, retain the old root in `INSTALLED_REGISTER_SCOPES` before you switch `REGISTER_SCOPE` and the host's configured register to the new root. The installed list preserves child creation and Git host authority for old rooms, including pending register operations. After the switch, check an old room's child creation and Git access before creating a new scratch room. You can also put the new register on a separate Worker.

The [demo register packet](../notes/implementation/2026-11-05-failed-claim-register/deploy.md) stages one same-Worker cutover and rollback. Keep both roots and verify old-room child creation, Git access, and Site source access before the new scratch room. The packet changes only demo; a Grow register switch still needs its archive bridge fixed and reviewed.

### Count a register's claims from its log

This historical procedure describes Register 17, whose failed attempts leave claims pending. Register 26 also closes final failed claims; do not count them as live. Count live claims before people report `type-full`, and after any outage of the Git host.

1. Choose a config directory that holds a room of this register.

   The operator key reads the history for only 900 seconds after its last entry at the register, then gets `Cannot read the history of <register>: forbidden.` A session of a member of a room that this register created reads the log with no window.

2. Print the whole log. Use a limit larger than the number of entries, because the default prints 20.

   ```
   dap log register --limit 100000
   ```

3. Count the rows. `dap log` shows no failure, and an `outcome` row does not show its result.

   | Row | What it means |
   |---|---|
   | `act found by <key>; 8 effects, 0 sends` | This row opens one claim. The claim's ID is the row's number. |
   | `outcome; ...` | One attempt ended. Only `dap show` gives its result. |
   | `delivery result from directory:<seq>; 3 effects, ...` | This row closes one claim, which becomes `active`. |

   Live claims are the `act found` rows minus the `delivery result from directory` rows with 3 effects. A result row with 0 effects is a refused directory, and its claim stays live. Free places are 64 minus the live claims.

4. To name the live claims, run `dap show` on each row that closes a claim.

   ```
   dap show register:<seq>
   ```

   The first effect of a closing row names the claim: `{"effect":"state","item":<found row>,"state":"active"}`. A `found` row that no closing row names is a live claim.

5. To see why a live claim is stuck, run `dap show` on its `outcome` rows.

   Each row's effect names the claim and the result: `{"attempt":3,"effect":"attempt","operation":"<found row>:0","result":"unknown","selected":null}`. A claim with no `selected` value and a result for attempt 3 has used its attempts.

A test ran this count once, against 64 stuck claims and 2 finished ones (`packages/cli/test/failed-claims-close-register.defect.scope.test.ts`). The count gave the same 64 claim IDs as a direct read of the items. It ran on real scopes with a scripted host, and it has not run on a deployed Worker.

## Keep existing rooms able to create children

Before you change a Worker's current register, retain every earlier
register whose rooms still need new Inboxes, lanes, other children, or Git access.
Record those scope IDs and the new current register in
`INSTALLED_REGISTER_SCOPES`. Keep `REGISTER_SCOPE` as the current register
for new rooms. A listed register still needs its own checked Native birth
in this Worker's index. Both Git host adapters accept the listed roots while
preserving the exact host, namespace, pinned owner and destination birth
at its own register. GitHub also keeps its repository binding checks.
The list supplies no birth, credential, or repository binding.

For hosted Workers, commit the array beside `REGISTER_SCOPE` in the
Worker's Wrangler file: `apps/room/wrangler.grow.jsonc`,
`apps/room/wrangler.lending.jsonc`, or `apps/room/wrangler.demo.jsonc`.
Name that configuration commit in the deployment receipt. The operator
alone changes the list. A request, readable scope, or index row cannot add
a root. Existing single-register configurations need no new setting.

Use the tracked file as the source of the hosted register settings. After
you retain the planned register's scope ID and genesis digest, update one
Worker with `demo`, `grow` or `lending` as the name:

```sh
node scripts/register-values.mjs grow --keep \
	--register "$REGISTER_SCOPE" --genesis "$REGISTER_GENESIS"
```

The script updates `REGISTER_SCOPE` and `ARTIFACTS_CONFIG.registerScope`
together. Choose exactly one of `--only` and `--keep`; omitting both,
supplying both, or repeating a choice refuses before the script reads the
target. `--keep` retains the installed roots in order and adds the new root
once. Without a list, it explicitly retains the existing primary root.
`--only` replaces the list with the new root alone. A listed root admits
creation under that root. The script refuses a list longer than 32.
The identifier cutover uses `--only` because the service
does not read rooms of the retired roots.

For an existing Browser Start setting, also supply `--deployment` with
the deployed identity. The script updates the full register reference
and validates the offer against that explicit argument. To configure
Browser Start for `demo`, supply all three metadata arguments:

```sh
node scripts/register-values.mjs demo \
	--register "$REGISTER_SCOPE" --genesis "$REGISTER_GENESIS" --only \
	--start-origin "$START_ORIGIN" --deployment "$DEPLOYMENT" \
	--definition "$REGISTER_DEFINITION"
```

Take the origin, deployment identity and definition from the reviewed
deployment and register records. The script infers none of them.
`--start-origin` and `--definition` require each other and `--deployment`.
The script never adds a tracked `DEPLOYMENT` variable. If the file already
has that variable, the argument must match it. On `dap-demo`, the operator
keeps `DEPLOYMENT` in a secret binding. Verify its actual value from the
deployed version and `/health` before supplying the argument.

The script accepts only `demo`, `grow` and `lending`, validates the
candidate with the production settings parsers, and writes no file on a
validation failure. A successful call changes only that Worker's tracked
configuration and prints its diff. Review and commit the diff before
deployment. The script neither installs the register nor deploys the
Worker.

A successful replacement keeps the selected file's permission bits. The
script stages `<selected-config>.register-values-<suffix>/candidate`
beside the file, then checks the target's bytes, identity and mode before
an atomic rename. Keep the selected file idle through replacement:
ordinary rename does not provide compare-and-swap with another writer.

If a run dies and leaves a pending directory, clean up that run only:

1. Confirm that the run has stopped.
2. Inspect `git diff -- <selected-config>`. The rename may already have
   completed, so check the selected configuration before removing anything.
3. If that run's `candidate` file remains, remove only that exact file.
4. Remove that run's empty pending directory. Keep every other run's files.

A `dap-grow` register switch also needs its archive bridge fixed first.
The installed list does not update the single-root checks in
[`archive-host-item.ts`](../packages/scope/src/archive-host-item.ts), supplied
through [`apps/room/archive.ts`](../apps/room/archive.ts). Fix and review
that bridge before switching Grow. The demo register packet switches only
`dap-demo`.

For a self-hosted Worker, record the array in its operator configuration
and name that record in the deployment receipt. Install the new register
with its retained signed plan after the configuration change. Existing
rooms continue to use their own register and ordinary Native authority.

To remove a register, first record the affected rooms and the decision to
stop their future child creation. Keep that record with the configuration
change. No capacity rule or automatic expiry removes a register.

## Browser Start configuration

`DEMO_START_CONFIG` configures Browser Start, which creates a room from the
room page. Browser Start accepts only version 3 of the setting. The setting
is nonsecret JSON with exactly these fields:

| Field | Value |
|---|---|
| `v` | `3` |
| `origin` | The Worker's canonical public origin. `dap-demo` uses `https://dap-demo.inguz.workers.dev`. |
| `deployment` | The Worker's actual `DEPLOYMENT` value. |
| `register` | The full reference of the installed register, `{ scope, genesis }`. A scope ID alone does not work. |
| `definition` | `platform:register@28` for the default, or retained `platform:register@17` or `platform:register@26`. |

The register must be open, and its recorded host must be `artifacts`. Its
namespace must equal both `ARTIFACTS_CONFIG.namespace` and
`ARTIFACTS_NAMESPACE`. Its scope ID must equal
`ARTIFACTS_CONFIG.registerScope`. The adapter's service hostname is
separate from the recorded host.

The Worker reads the version 3 setting into a checked internal version 2
context and returns a version 2 offer. These registers have no `purpose` field.
The request's effective origin must equal `origin`. Behind a proxy, set
`PUBLIC_ORIGIN`. When it is unset, the Worker uses the URL's origin.
Forwarded headers supply no identity. A different register, a different
genesis, or a setting of version 1 or 2 produces no offer. An offer
grants no authority: the native namespace still judges the signed creation
lineage.

The client accepts only version 2 offers for Register 17, 26 or 28.
The server makes no offer from setting version 1 or 2. Existing submitted
operations keep their saved intent and readback path. A saved descriptor
does not move to another register.

The setting adds no GitHub host authority. GitHub authority comes from the
register that `GITHUB_APP_CONFIG` pins and from its verified destinations.

## Trusted application screens

The Worker serves installed application packages at
`/applications/<directory>/<install-item>/<encoded-presentation-id>/`.
Counter and Lending are maintained packages. The Worker holds neither
app's routes nor its compiled assets. To add a release that you trust,
commit its packet and install it in the room. The Worker needs no new
deployment. A room of the `base` cohort installs an ordinary package such
as Counter or Lending, as
[Install an application package](cli.md#install-an-application-package)
lists.

1. Create a private R2 bucket and bind it as `APPLICATION_CONTENT`.
   `apps/room/wrangler.artroom-scope.jsonc` binds the project's bucket
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

Checked against main `6bfb6e16` on 10 November 2026. Statements about the
project's own Workers are checked against the Wrangler files in
`apps/room/` only. Sources: [package.json](../package.json), [packages/scope/src/creation-admission.ts](../packages/scope/src/creation-admission.ts), [packages/scope/src/register-setting.ts](../packages/scope/src/register-setting.ts), [packages/cli/src/commands.ts](../packages/cli/src/commands.ts), [apps/room/demo-creation.ts](../apps/room/demo-creation.ts), [packages/scope/src/applications/route.ts](../packages/scope/src/applications/route.ts).
The commands on this page were not run for this revision.
