# Deploy the scope Worker

For the local celld project, use [Run the local Worker](celld.md). Its
`PUBLIC_ORIGIN` setting binds public service identity behind a proxy.

`npm run deploy:scope` deploys the scope Worker from
`apps/room/wrangler.jsonc` with Wrangler 4.147.0 and `--keep-vars`, preserving
plain settings already set on the Worker when the file omits them. Values
explicitly supplied by the reviewed configuration or `--var` still need
review. This does not supply a missing setting or change secret custody.

From the reviewed checkout, the default scope command is:

```sh
npm run deploy:scope
```

For a planner deployment of Grow with pinned Wrangler from scratch, use:

```sh
ARTROOM_REPO=/absolute/path/to/the-reviewed-checkout
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$ARTROOM_REPO/apps/room/wrangler.grow.jsonc"
```

Retain any reviewed `--var` overrides for that Worker on the same command;
`--keep-vars` does not establish their correct values. The planner deploys
after exact-head review. Follow
[Run dap in 10 minutes](self-host.md) to deploy it on your own account,
create a room, and invite another device. This page describes the service
settings and the GitHub setup order.

A deployment serves rooms of every definition version that its platform
package has shipped, each by the version that its genesis pinned
([scopes.md](scopes.md), "Definition versions").

## Public demo Worker

The public room offer uses `dap-demo` at
`https://dap-demo.inguz.workers.dev`, configured by
[`apps/room/wrangler.demo.jsonc`](../apps/room/wrangler.demo.jsonc). Its
Durable Object and Artifacts namespaces are private to this Worker. Keep
the committed Start origin, register ScopeRef and Artifacts register root
exact. `DEPLOYMENT` and `SESSION_SECRET` remain separately held bindings.

For a planner deployment from the reviewed checkout:

```sh
ARTROOM_REPO=/absolute/path/to/the-reviewed-checkout
cd "$(mktemp -d)"
npx -y wrangler@4.147.0 deploy --keep-vars --config "$ARTROOM_REPO/apps/room/wrangler.demo.jsonc"
```

The file sets enforce mode and the reviewed additional creation family:
register 17, directory 16, membership 8, rules 10, destination 12 and inbox 1.
Grow carries that same allowance; Lending carries register 5, directory 5,
membership 4, rules 3, destination 2 and inbox 1. These are exact file-owned
allowances, added to the parser's implicit newest family. The generic
`artroom-scope` file retains register mode and no additional allowance;
its retained-room role is separate from this public offer. The file carries
the live `DEMO_START_CONFIG`, so a deploy from it reproduces the Worker's
retained Start settings. Retained Start requests end on 8 November 2026.
On that date the planner deploys the file without that variable, deletes
the unused secrets `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CREATION_TOKEN` and
`GITHUB_READ_TOKEN` from the Worker, and records the versions here. The
legacy creation code leaves with BR-11 of the technical-debt review.

`--keep-vars` preserves settings omitted from the file. Explicit file
values and reviewed `--var` values still override them and need review.
This configuration does not deploy or change an existing scope's pin. The
planner owns deployment, index verification and any later R7 root cutover;
BR-1 does not replace the fixed register 17 offer or remove its allowance.

## Grow demo Worker

The Grow demo uses Worker `dap-grow` at
`https://dap-grow.inguz.workers.dev`, configured by
[`apps/room/wrangler.grow.jsonc`](../apps/room/wrangler.grow.jsonc).
Its Durable Objects and Register17 are specific to this Worker. It shares
the `artroom-demo` Artifacts namespace and application-content bucket.
The config records `DEPLOYMENT=dap-grow-v1`, the exact register/Artifacts
settings and the single signed demo release/publisher/host trust row.
Set `SESSION_SECRET` separately from stdin.

The reviewed Grow archive entry preserves the existing `DeployedScope`
class and namespace. `GROW_ARCHIVE_CONFIG` pins its directory, repository
name and signed demo release. The room's admitted `archive: "journal"`
binding authorizes its archiver's two internal item reads; no member or
session stands for host authority. The Artifacts binding mints short-lived
archive tokens for individual passes. There is no archive Worker secret.
The room repository remains private, and its repository ID comes from the
directory item. Generic Worker configurations enable no archive.

For a reviewed deployment, use pinned Wrangler 4.147.0 from a scratch
directory and pass the absolute path to `wrangler.grow.jsonc`. The
[Grow runbook](../examples/grow/runbook.md) gives the command, the planner's
20 October provisioning status and the remaining hosted acceptance work.

## Local wiring readiness

`GET /health` reports each host under `wiring.artifacts` and `wiring.github`.
Both `GET` and `HEAD` keep their session and register readiness checks;
`HEAD` returns the same status without a body.
A host is `wired`, or `off` with a finite reason. An absent host setting
is `off` with `unconfigured`. A configured host that cannot wire makes the
response `503`, even when its register is ready. Different configured
register roots remain `ambiguous` and return `503`.

Artifacts checks its complete setting, namespace and binding shape.
GitHub checks its complete setting, PKCS#8 key syntax and required or
supplied optional credentials. The factory, site reader and health use
the same checks. Health returns no key, token, configuration contents or
cleanup map. `wired` means local settings can construct the wiring. It
proves no cryptographic key import, provider connectivity, installation
account authorization or hosted deployment acceptance.

`DEPLOYMENT` has one bound: 1 to 128 UTF-8 bytes. Sessions, demo creation,
health, metrics and screen contexts use that same reader. An invalid
configured value cannot open the local creation bypass, even with
`ALLOW_OPEN_CREATION="true"`. It makes a screen unavailable rather than
falling back to its origin. Truly absent deployment settings retain the
existing local behavior. Metrics use the bounded label `unknown` for an
invalid or absent value. Health still requires usable sessions and a ready
register before returning `200`.

`APPLICATION_TRUST` uses one strict parser for native hosting and MCP.
Its exact release/publisher/host schema and migration are described under
[Trusted application screens](#trusted-application-screens).
Release revocation for acts remains separate R11 work. [The implementation note](../notes/implementation/2026-10-24-settings-readiness.md)
records validation status.

## Settings and secrets

A setting is a plain value. A secret is stored by the host and is never
in this repository, in a command argument, in a log, in a scope's journal
or in the command line's config.

| Name | Kind | What it is |
|---|---|---|
| `DEPLOYMENT` | setting | The deployment's name, 1 to 128 UTF-8 bytes. Every read session names it. |
| `PLATFORM_CREATION_PINS` | setting | JSON array of deployment-approved historical platform pins, added to the newest cohort. Missing or explicit undefined uses the newest cohort only. Invalid input closes new platform genesis; existing reads, acts and replay keep their pins. See [Creation versions](#creation-versions) and the [full setting reference](security/settings.md). |
| `ALLOW_OPEN_CREATION` | setting | Local and test deployments only: the exact string `true` opens parentless creation. Default unset. With `DEPLOYMENT` set, every other value permits only the exact signed register install pinned by valid `ARTIFACTS_CONFIG.registerScope`; a direct directory founding is refused before namespace lookup. Never enable this on a hosted production Worker. |
| `SESSION_SECRET` | secret | At least 32 bytes from a cryptographic random source. It signs read sessions. Without it, or without `DEPLOYMENT`, no session is issued or accepted. Replacing it ends every session at once. |
| `GITHUB_APP_CONFIG` | setting | JSON with exactly the fields below. Without it, or if it is not valid, the Worker sends nothing to GitHub: attempts are recorded and wait. |
| `GITHUB_APP_PRIVATE_KEY` | secret | The GitHub App's private key, as PKCS #8 PEM (`BEGIN PRIVATE KEY`). GitHub gives a PKCS #1 key (`BEGIN RSA PRIVATE KEY`); convert it, with no passphrase. The Worker uses it to mint short-lived tokens that let a destination push. |
| `GITHUB_CREATION_TOKEN` | secret | The credential that creates a repository. See "The creation credential". Without it, a claim's creation is recorded and waits. |
| `GITHUB_READ_TOKEN` | secret | A token that reads the private repositories. Not needed when `publicReads` is true. |
| `GITHUB_CLEANUP_TOKENS` | secret | Optional. JSON: repository ID to `{ "name", "plaintext", "expiresAt" }`, each token limited to that one repository with Administration write. It deletes a repository that a creation made but the register did not select. Without it, such a deletion is recorded and waits. |

`GITHUB_APP_CONFIG` has exactly these fields:

| Field | Meaning |
|---|---|
| `issuer` | The App's client ID: the issuer of the App's signed requests. |
| `installationId` | The number of the App's installation on the account. |
| `account` | `{ "id", "login", "type" }` of that installation's account. `type` is `User` or `Organization`. `login` is where repositories are made. |
| `maxBytes` | The most bytes of Git objects that one push sends or one read takes. At least 32. |
| `registerScope` | The register's scope ID. Only that register's creations are sent. |
| `privateRepositories` | Whether new repositories are private. |
| `publicReads` | Whether the Worker reads repositories with no token. Must be false when `privateRepositories` is true. |
| `credentialIdentity` | Always `"adapter-attempt"`. |

## Operational bindings

The source configuration prepares `METRICS` for the
`artroom_metrics_v1` Analytics Engine dataset and `VERSION_METADATA` for
the Worker version. Console logs use full head sampling; platform
invocation logs are disabled. These are source settings, not a record
that an existing Worker has been changed. Preserve each deployment's
bindings and settings when preparing an authorized release. See the
[metric slot map and request correlation](operations.md).

## Creation versions

This source selects the `archive-device-publication` cohort for new
unqualified installs: register 18, directory 17, membership 8, rules 10,
destination 13 and inbox 1. These proposal versions await the planner's
versioning and rollout disposition. Existing scopes retain the exact pin
in their genesis. Advancing these defaults changes neither an installed
register nor a retained CLI plan.

`PLATFORM_CREATION_PINS` adds approved historical pins for new platform
scopes in one deployment. Supply a JSON array with at most 128 distinct,
complete pins supported by the shipped catalog, within 8,192 UTF-8 bytes.
The newest cohort remains included. Unset, explicit undefined and `[]`
select the newest cohort alone. Null, malformed input, duplicates, unknown
pins or an exceeded bound close new platform genesis.

For example, a reviewed deployment that must create application-family
children from its existing register 5 and directory 5 can add these pins:

```json
[
	"platform:register@5",
	"platform:directory@5",
	"platform:membership@4",
	"platform:rules@3",
	"platform:destination@2"
]
```

Use that example only when the deployment's retained evidence supports
those pins. Inbox 1 is already included. A recognized catalog pin does
not add a supported lineage family: deployed child admission still checks
the `archive-device-publication`, `archive-device-application` or
`application` family and its native
creator proofs. The setting grants no member, credential or host authority.
An index entry permits lookup, not creation.

Within the original routing and authority checks, an excluded pin can
repeat only an exact existing native genesis. The target checks an active
scope, its bounded canonical and hash-checked applied birth, exact scope
address, kind, incarnation, pin and seed, a null genesis predecessor, and
current native support. An invalid setting still permits that exception.
It does not block later reads, acts or replay of existing scopes. Neither
`ALLOW_OPEN_CREATION` nor a missing `DEPLOYMENT` skips the version policy
in a deployed Scope class. Raw engine fixtures without that wiring are a
separate compatibility path.

The fixed public creation offer and `--register-policy open` retain
register 17, directory 16 and destination 12. They do not follow the new
private-install default. A Worker that continues serving that public
cohort needs an explicitly reviewed allowance for those historical pins
and its original register root. Membership 8, Rules 10 and Inbox 1 are
already in the new implicit cohort. Keep the old offer and attempted
request identities exact. The new publication protocol belongs to the
new cohort; these changes preserve the old cohort's evaluator.

After the census implementation is deployed, an enforce-mode Worker also
supports **`dap scope-index census --out FILE`**. Use its pinned Register's
founding install key and the matching local service, Register and repository
Directory configuration. The command saves a manifest only after every page
completes within its bounds and the configured Directory is present. Run
**`dap scope-index versions --manifest FILE`** over that file for the
registered-scope pin report. This leaves the saved-manifest parser and each
entry's existing read authority unchanged.

The planner deploys the reviewed census source to all three hosted Workers
and records the first census and pin report for each. Source tests establish
no hosted census result. Registrations inserted below an advancing cursor
can be missed during its recorded time window, and unregistered legacy
objects remain a gap. A complete registered-scope census proves neither an
empty legacy fleet nor permission to retire a definition version.

For each planned Worker rollout:

1. Retain that deployment's saved R2 manifest and the original CLI directory.
   Confirm the service, namespace and register identity from operator records.
   Do not treat the manifest or the fixed index as a global live-scope inventory.
2. Run the version report with the reviewed CLI and that saved manifest:

   ```sh
   dap scope-index versions --manifest /absolute/path/to/deployment-scopes.json
   ```

   The report rereads the exact listed applied genesis identities and hashes.
   `observedPins` records their platform pins. `usableCreationCohorts` reports
   supported family pin coverage, including the implicit newest pins.
   Unknown pins, unsupported families, unavailable reads or mismatches make
   the report unready. The report changes no setting and emits no policy JSON.
   Register-mode reads may register the exact scopes they authenticate.
3. Review the historical pins to retain for that Worker. Keep
   `ARTIFACTS_CONFIG.registerScope` equal to the exact planned signed install
   admitted by R1. A GitHub register pin alone does not open that API.
   Preserve attempted plans and their original pins and IDs. Do not replan
   an attempted or acknowledged install to make it fit the new defaults.
   R1 admits one configured register root. Allowing both sets of version
   pins does not admit two roots. Use a separate Worker or an explicitly
   planned root cutover for the new register; retain the old root for a
   Worker serving the fixed public offer.
4. Have the planner deploy the exact reviewed source and nonsecret policy.
   Apply the review to `artroom-scope`, `dap-demo`, `dap-lending` and `dap-grow`
   separately, as applicable. Preserve their existing bindings, secrets,
   register pins and reviewed `--var` overrides with the `--keep-vars`
   procedure above. That flag preserves omitted values; it does not populate
   or validate this policy. Deployed objects capture policy at activation.
5. Verify the intended new-creation refusal and the retained existing-scope
   behavior after rollout. Keep the R2 backfill and enforce records separate.
   `/health` does not validate or expose `PLATFORM_CREATION_PINS`; a healthy
   register probe does not prove version admission or configuration completeness.

These steps describe planner work, not a completed deployment. Neither the
CLI report nor this page attests hosted policy, namespace isolation, full
live-scope coverage or readiness for every creation path. Version activation
and the separate rules-version change remain planner-owned work.

## The order

The host setting pins the register's scope ID, so the setting must name
the register before its first claim. A register's ID is a function of its
install's signed intent, so the command line computes it before the
register exists. Plan first, then set the setting, then install:

1. **Deploy** the Worker with `DEPLOYMENT` and `SESSION_SECRET`.
2. **Plan.** Run `dap install --plan <base-url> --host github.com
   --namespace <login>`, where `<login>` is the account's `login`. It
   creates nothing. It prints `Planned: register sc_...` and the seed's
   time, and keeps the plan in the config. The plan can be created until
   that time, 14 minutes after the plan.
3. **Set `GITHUB_APP_CONFIG`**, with `registerScope` set to that register
   ID, and the GitHub secrets. A register whose host or namespace differs
   from the setting sends nothing.
4. **Install.** Run `dap install --planned`. It checks that the plan
   still makes that ID, creates the register, and prints
   `Installed: register sc_..., ..., as planned.` A plan whose time is
   over and was never attempted is refused as `plan-expired`. For a
   definitely unsent legacy plan, plan again and set the new ID. A selected
   application or Counting plan stays exact: preserve its original directory
   and use a separate empty `DAP_HOME` for a new plan, host configuration and
   subsequent commands ([cli.md](cli.md)). An attempted or acknowledged
   original needs reconciliation from its original directory; expiry
   cannot authorize a replacement.
5. **Claim.** Run `dap claim <name> --handle @you`. The register
   sends its creation at once. If the claim still gives up waiting, run
   the same command again: it goes on from the pending claim and signs
   nothing new. `--again` signs a second claim, which creates a second
   repository.

The same order holds for Cloudflare Artifacts, with `--host
artifacts`, `--namespace artroom-demo` and `ARTIFACTS_CONFIG`
([hosts.md](hosts.md)).

### The earlier order, and its wait

On a Worker with `DEPLOYMENT` set, the parentless creation API now requires
the Artifacts register pin before installation. Preserve the original
planned install bytes and set `ARTIFACTS_CONFIG.registerScope` before
deploying this change; a missing or invalid setting refuses new parentless
creation. Existing scopes keep their definitions and journals. The GitHub
pin alone does not admit a new register on this deployed API. The planner
must check the Artifacts pin and leave `ALLOW_OPEN_CREATION` unset on
`artroom-scope`, `dap-grow` and `dap-lending`, then redeploy each reviewed
Worker. A local or test deployment that needs arbitrary founding may set
`ALLOW_OPEN_CREATION=true` explicitly; no builder deployment is implied.

`dap install <base-url> --host ... --namespace ...` with no plan
works only on an unconfigured local Worker or an explicitly opened local/test
deployment: it creates the register at once and prints the register ID, and the
setting is set after it. Then the register's object may have started
before the setting took effect. A claim's creation is then recorded and
not sent until the object sees the setting. Observed on 2026-10-07, that
took about two minutes each time, so the claim gave up waiting and had to
be run again.

Two things now shorten that wait. The Worker reads its host settings at
each call of its outside port, not once per object. And at each request,
an object that holds an attempt it could not send because its port
refused that kind sends it as soon as the port accepts it, once, with no
restart. A Worker whose setting changed is still a new version, and an
object running the earlier version may keep the earlier setting until it
restarts; a request that reaches it after the restart sends what it
recorded. Planning first avoids the wait.

Finish the initial bootstrap while the operator's install is within its
900-second read window. Before enrollment, the claim's causal read window
also lasts 900 seconds; this delivery does not renew an expired window.
An expired window is not permission to invent a new signed claim.

Keep `DEPLOYMENT` configured on every source deployment and secret update.
When the configuration file omits existing plain variables, Wrangler deploy
needs `--keep-vars` to preserve them. Verify session issuance rather than
assuming a stored session secret is sufficient: both bindings are required.
The recorded builder run initially returned `sessions-unavailable` and
succeeded after both bindings were restored through stdin.

## The creation credential

`GITHUB_CREATION_TOKEN` is one of:

- an installation token minted from the App with `administration: write`.
  It expires one hour after it is minted, so mint it just before the
  claim, and replace it and restart for a later claim;
- an operator's fine-grained token with Administration write on the
  organization.

For a `User` account the Worker creates the repository as that user, which
an installation token cannot do; use the user's own fine-grained token.

## Reads

When `publicReads` is true and the repositories are public, the Worker
reads them with no token, and `GITHUB_READ_TOKEN` is not needed.

## Published repository sites

The `/site/<directory>/<ref>/<path>` route serves recorded publications.
`HEAD` and the published branch name read the destination's current recorded
commit; the Git host's newer head is not substituted. A complete 40-character
lowercase commit ID can also read an eligible immutable native publication
with a written receipt. Arbitrary or unproved commits and provider-only
branches or tags answer `not-published` before acquiring provider access.
The versions page lists only room-recorded publications. The current room
model records one branch and no tag or named-version registry.

Published files are public without a session, including files published from
private repositories. Other private branches are not exposed by Site. The
existing provider access stays unchanged, and GitHub's stable repository ID
is checked against the room before Git reads. Conditional responses still
validate publication, identity, commit, path, object type and size before 304.
No additional setting or token is required. See [pages.md](pages.md).

## The page

The scope Worker serves the room's page at `/page/` from
`apps/room/page/assets.ts`, which is committed and which the
page package's build writes ([The page](../apps/room/docs/page.md)). Deploying the Worker
deploys the page; it needs no binding, setting or secret of its own.

## Trusted application screens

The host serves installed packages at
`/applications/<directory>/<install-item>/<encoded-presentation-id>/`.
Counter and Lending are maintained packages; the host contains neither
app's route or compiled assets. A new operator-trusted release needs a
committed packet and native room install, without a host redeployment.

Bind the private R2 bucket `artroom-application-content` as
`APPLICATION_CONTENT`, as `apps/room/wrangler.jsonc` declares. The operator
provisions that bucket before the reviewed host deployment and leaves its
public access disabled. The Worker owns CID-keyed immutable content. It
exposes no bucket upload, list, delete, or arbitrary-key route.

Set `APPLICATION_TRUST` to nonsecret JSON rows with exactly `release`,
`publisher`, and `host`. Use the expected release and publisher printed by
`dap pack`, and the lowercase hostname in the immutable Git URI:

```json
[{"release":"sha256:<64 lowercase hex>","publisher":"key_<publisher public key>","host":"github.com"}]
```

A missing setting admits nothing. Malformed or ambiguous rows refuse as a
whole. Rows from the previous two-field schema must gain an explicit `host`;
there is no implicit host or legacy fallback. A host contains no scheme,
port, path, credentials, or noncanonical URL spelling. One release has one
host row. Native resolution and MCP `install_application` compare release
and host before opening a transport. The existing public HTTPS transport
refuses redirects and keeps its original byte, object and deadline bounds.

Before this source is deployed, migrate every configured trust list on
`artroom-scope`, `dap-grow`, and `dap-lending`, including any operator-set
`--var` values. Omitted lists stay closed. Grow's checked-in row adds
`host: "github.com"` without changing its release or publisher. The planner
reviews the migrated nonsecret values and deploys with the existing
`--keep-vars` commands above. `--keep-vars` alone does not migrate an old
row. No builder deployment is part of this change.

Before deploying R11 source, run `dap scope-index applications --manifest
worker-scopes.json --out installed-releases.json` for `dap-grow`, `dap-demo`,
and `dap-lending`, using each Worker's
saved scope-index manifest and matching operator CLI configuration. Keep the
scope index in enforce mode where that mode applies. Retain the manifest path
and digest with the run report. Set one live `APPLICATION_TRUST` row for every
distinct reported release, publisher and host; resolve inconsistent rows before
deployment. An unreadable Rules scope, malformed record or pending installation
makes the report incomplete: investigate it and rerun until complete before
deploying. The command requests one existing operator read session from the configured
membership before reading summaries. This is the one request beyond one
summary GET per listed Rules scope. Other listed kinds receive a saved
`not-applicable` status and no summary request, because they cannot hold native
installation items. This trusts the kind in each validated manifest reference,
as it trusts the manifest for which scopes exist. Skipped kinds are not fresh
host observations. The session stays in memory. Acquisition can
write the host's bounded replay and rate bookkeeping; it creates no history
entry. A valid session refusal or absent membership selects initial signed
reads. A failed or malformed acquisition stops the command. No summary is
retried, and the command sends no registration or business mutation. Existing
server reads can still resume parked work, diagnose archives or recover
alarms. These are host maintenance, not a write-free server snapshot. Rules
summaries bind observed scope references and native pins; they do not reverify the manifest's genesis hashes or prove a
global inventory. The planner records all three runs before further R11
deployments and uses the existing `--keep-vars` deployment commands.

The manifest and report cover only the repository rooted at the operator's
configured Directory, not every repository hosted by the Worker. A complete
empty report for a newly founded operator room does not cover visitor rooms
or their installed releases. Before deploying R11 source, the planner must
record a separately authorized coverage path for any other repositories, or
an explicitly authorized decision to withdraw installations outside the chosen
trust list at deployment.
A Worker-wide listing needs its own request and read authority. This child
adds neither that read path nor authority for other repositories.

Local `dap mcp` and `dap install` also read `APPLICATION_TRUST` from their process environment.
Set the same JSON policy before starting it if package installation is
needed. Other local tools keep their existing defaults. Hosted tool opt-in
and native membership standing remain separate requirements. The host checks the complete signed packet and exact publisher before
storing it. A screen request also checks current trust and its active native
installation. Revoked trust stops screen delivery. The native host also
refuses fresh acts on that installation and its declared descendants with
`application-revoked`. It identifies the exact release through native creation
records, so another trusted release with the same definitions remains usable.
An absent or malformed trust list closes this admission too. Previously
accepted receipts, replay, and pending work retain their original behavior.
No new setting or storage migration is required. The planner deploys the
reviewed source with the existing `--keep-vars` commands and checks the
intended release list before withdrawing a release.

This same-origin route
is not isolation for arbitrary packages: only operator-listed trusted
releases enter. The current host Git transport explicitly refuses SHA-256
repositories before network; it does not fall back to another source.

`DEPLOYMENT` must be the same value used by native read sessions. The screen
context carries that deployment and exact room references; it grants no
membership authority. [The CLI guide](cli.md) covers generic room selection,
URI install, requested default grants, and progress/refusal reads.

The dated `apps/room/wrangler.lending.jsonc` and the library
[runbook](../examples/lending/runbook.md) preserve earlier service provisioning.
They are not the generic M1 deployment target. The planner publishes reviewed
Main and makes the reviewed generic host deployment under the user's current
authorization. Builder's local checks and dry runs create no Cloudflare resource.

## The homepage

The static-assets Worker `dap-home` serves the homepage and the pages for
the room, the library, the Counter, Grow and Jam from `homepage/`.
Run `npm run build:home` to copy its source and the repository brand masters
into `homepage/assets/`. Its Wrangler configuration attaches
`dap.generalbusiness.ai` as a custom domain. The room, library, Counter
and Jam applications keep their own addresses; each page links to its
origin. The homepage lists the room, the library, the Counter and Grow; the
Jam page is reachable by its address but not listed while that demo is
not ready to show.

## What is never written down

The values of `SESSION_SECRET`, `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_CREATION_TOKEN`, `GITHUB_READ_TOKEN` and `GITHUB_CLEANUP_TOKENS`.
Set each from a file or from standard input, never as a command argument.
The command line keeps its signing keys in its config directory, readable
only by you, and its config file holds no secret.
