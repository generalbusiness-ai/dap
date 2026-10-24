# Deploy the scope Worker

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

## Grow demo Worker

The Grow demo uses Worker `dap-grow` at
`https://dap-grow.inguz.workers.dev`, configured by
[`apps/room/wrangler.grow.jsonc`](../apps/room/wrangler.grow.jsonc).
Its Durable Objects and Register17 are specific to this Worker. It shares
the `artroom-demo` Artifacts namespace and application-content bucket.
The config records `DEPLOYMENT=dap-grow-v1`, the exact register/Artifacts
settings and the single signed demo release/publisher trust row.
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

The existing `APPLICATION_TRUST` parser and release/publisher schema are
unchanged. Trust-before-fetch and release revocation policy are separate
R10 and R11 work. [The implementation note](../notes/implementation/2026-10-24-settings-readiness.md)
records validation status.

## Settings and secrets

A setting is a plain value. A secret is stored by the host and is never
in this repository, in a command argument, in a log, in a scope's journal
or in the command line's config.

| Name | Kind | What it is |
|---|---|---|
| `DEPLOYMENT` | setting | The deployment's name, 1 to 128 UTF-8 bytes. Every read session names it. |
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

Set `APPLICATION_TRUST` to nonsecret JSON rows with exactly `release` and
`publisher`, using the expected release and publisher printed by `dap pack`:

```json
[{"release":"sha256:<64 lowercase hex>","publisher":"key_<publisher public key>"}]
```

A missing setting admits nothing; malformed or ambiguous rows refuse as a
whole. The host checks the complete signed packet and exact publisher before
storing it. A screen request also checks current trust and its active native
installation. Revoked trust stops screen delivery. This same-origin route
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
