# Worker settings and bindings

Every Worker setting and binding in the checked-in code and configuration
files, with its reader, parser and behavior on failure. Deployed values are
not part of this reference. Secrets appear by name only. Their values never
belong in a page, a log or a journal. To compare these settings with
observed use, see [Report observed Worker use](../usage-report.md).

A **text** setting is operator configuration that code parses. A
**secret** is credential material from the deployment's secret store. A
**binding** is a runtime namespace, bucket, dataset, metadata object or
service. A binding that is present does not show that the remote service or
credential works.

The inventory also records conditional reads. A shared setting can appear
for a Worker whose configuration file does not supply it, because the
operator can set it later. A type declaration or a Wrangler declaration
alone does not show that code reads a name. Such an entry has the reader
`declared-unused` and names its declaration. An entry in the table neither
adds a setting nor changes a parser.

## Deployment roots

| Worker | Configuration and runtime entry |
|---|---|
| `artroom-scope` | `apps/room/wrangler.jsonc` → `apps/room/worker.ts` |
| `dap-celld-local` | `apps/room/celld/wrangler.json` → `apps/room/celld/worker.ts` → `apps/room/worker.ts` |
| `dap-demo` | `apps/room/wrangler.demo.jsonc` → `apps/room/worker.ts` |
| `dap-commons` | `apps/room/wrangler.commons.jsonc` → `apps/room/worker.commons.ts` → `apps/room/worker.ts` |
| `dap-lending` | `apps/room/wrangler.lending.jsonc` → `apps/room/worker.ts` |
| `dap-grow` | `apps/room/wrangler.grow.jsonc` → `apps/room/worker.grow.ts` |
| `dap-application-sandbox` | Both `apps/sandbox/wrangler*.jsonc` configurations → `apps/sandbox/worker.ts` |
| `dap-grow-simulator` | `examples/grow/wrangler.jsonc` → `examples/grow/simulator-worker.ts` |
| `dap-home`, `artroom-jam` | Assets-only configurations with no Worker `main` |

The room entry reexports the Scope classes and dispatches HTTP through
`apps/room/fetch.ts`. Its named Durable Object and service entry points
share one configuration. Grow adds its archive wrapper. The sandbox and the
scheduled simulator have their own environments. Neither one gets the
room's session secret or namespaces through a TypeScript name. The local
celld project has its own Worker name and entry file, and its two-export
shim imports the production room Worker. The checker follows each Worker's
complete runtime imports and refuses two entries with one Worker name.
Commons has its own entry file too. Its configuration holds `unplanned` in
all three register positions, so creation and the register health probe stay
unavailable until the operator binds the exact planned register. The file
adds no open-creation exception. Its Start configuration is retained metadata,
and the retired demo-offer route provisions no register.

Test Wrangler configurations and local build and CLI environment variables
are not deployed settings, so the inventory omits them.

## Failure and health meanings

**Closed** means the affected feature refuses or stays unavailable. A
binding of the wrong shape can still throw where code calls it, and the
rows say where that happens. Optional telemetry falls back on a best-effort
basis.

The room's health response reports sessions, its register probe, version
metadata, and a state for the Artifacts and GitHub wiring. An explicit
`REGISTER_SCOPE` selects a probe that does not depend on the host. A
malformed pin, or two pins that disagree, makes health unavailable without
probing an object. With no `REGISTER_SCOPE`, health selects the register
from the GitHub and Artifacts settings, and two different configured
register roots are ambiguous. A configured host that is off makes health
return `503`. An absent host configuration does not. A `wired` state means
that the local syntax and binding checks pass. It does not show provider
connectivity, GitHub installation authority, valid tokens, package trust,
MCP enablement, serving capacity or archive recovery.

Lending's [`wrangler.lending.jsonc`](../../apps/room/wrangler.lending.jsonc)
binds `VERSION_METADATA`, as Grow and Demo do. Wrangler supplies its value
on deployment. Health reports `unknown` when the binding or a valid version
ID is absent.

`SCOPE_INDEX_MODE=register` is a transition mode. A scope that the index
does not know can still start, so that its own verified genesis registers
it. `enforce` refuses an unknown existing scope before the Worker looks it
up. The mode in the file, a health response and the presence of index code
do not show that the backfill finished or that the deployed Worker
enforces the index.

The registered-scope census serves only in enforce mode, which is also the
default when the mode is absent. Register mode answers `unsupported`. A
missing index answers `absent`. Creation, child lineage and the census read
the register pin with `readRegisterScope`. The nonsecret `REGISTER_SCOPE` is
the pin. A valid `ARTIFACTS_CONFIG.registerScope` is the legacy fallback.
When both are present, their register IDs must agree. A malformed value or
two values that disagree close these features. On a deployed Worker with
neither pin, creation stays closed, even with `ALLOW_OPEN_CREATION`. Reading
the pin needs no host binding. The stored register row and its checked
founding install decide which key may sign the census. Neither a
caller-selected root nor a membership session supplies that authority.

[Roll out new creation versions](../deploy.md#roll-out-new-creation-versions)
describes the procedure. `PLATFORM_CREATION_PINS` adds earlier platform pins that new scopes may use
besides the newest publication and unpublished families. It does not change
the pins of existing scopes or open another native lineage family. An index
entry allows lookup only. A pin outside the setting can repeat only an
exact existing birth that the target validates. Health does not read this
setting, so a `200` response does not show that a given pin can create a
new scope.

`APPLICATION_TRUST` controls package installation, screen serving and new
acts under installed releases. When an operator withdraws a release, the
Worker refuses new acts on it with `application-revoked`, including its
declared descendants. Native creation records identify the release. Missing
provenance answers unavailable. Recovery of accepted keys, replay and
pending settlement do not consult this setting.
[Deploy the scope Worker](../deploy.md#trusted-application-screens) gives
the steps.

`PUBLIC_ORIGIN` supplies the service's identity behind an HTTP reverse
proxy. Hosted MCP creation, the application context, deployment defaults
and the demo origin checks use it. An explicit `DEPLOYMENT` still wins over
the application default. The transport's Host need not equal the
configured origin. No forwarded header supplies identity. The proxy must
supply the trusted client address. See [Run the local Worker](../celld.md).

## Source-owned inventory

Each row below names exact Worker names and one setting or binding.
`readers` lists the source files that read it. `parser`, `missing`,
`invalid` and `health` state what the code does. The static checker
verifies the list and the readers. It does not run the parsers or test
their security. A new read, an unsupported way to read the environment, or
an undocumented configuration binding fails the check.

The lookup is generated from the rows below. **Main reader** is the first
reader in the row, not its only reader. The full row holds the parser, the
failure behavior, health visibility and the other readers.

<!-- dap-settings-lookup:start -->
| Name | Kind | Workers | Main reader |
| --- | --- | --- | --- |
| `AGENTS` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ALLOW_OPEN_CREATION` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/creation-admission.ts`](../../packages/scope/src/creation-admission.ts) |
| `APPLICATION_CONTENT` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `APPLICATION_SCREEN_HOSTS` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `APPLICATION_TRUST` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ARCHIVE_RESTART_DIRECTIVE` | text | `dap-grow` | [`apps/room/worker.grow.ts`](../../apps/room/worker.grow.ts) |
| `ARTIFACTS` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ARTIFACTS_CONFIG` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ARTIFACTS_NAMESPACE` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `DEMO_START_CONFIG` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`apps/room/demo-creation.ts`](../../apps/room/demo-creation.ts) |
| `DEPLOYMENT` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_APP_CONFIG` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_APP_PRIVATE_KEY` | secret | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_CLEANUP_TOKENS` | secret | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_CREATION_TOKEN` | secret | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_READ_TOKEN` | secret | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GROW` | binding | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `GROW_ARCHIVE_CONFIG` | text | `dap-grow` | [`apps/room/archive.ts`](../../apps/room/archive.ts) |
| `GROW_BINDING` | text | `dap-grow-simulator` | [`examples/grow/simulator-host.ts`](../../examples/grow/simulator-host.ts) |
| `GROW_CLIMATE_SECRET` | secret | `dap-grow-simulator` | [`examples/grow/simulator-host.ts`](../../examples/grow/simulator-host.ts) |
| `GROW_SENSORS_SECRET` | secret | `dap-grow-simulator` | [`examples/grow/simulator-host.ts`](../../examples/grow/simulator-host.ts) |
| `LENDING` | binding | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `MCP_ENABLED` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/mcp/src/hosted-tools.ts`](../../packages/mcp/src/hosted-tools.ts) |
| `MCP_TOOL_ADDITIONS` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/mcp/src/hosted-tools.ts`](../../packages/mcp/src/hosted-tools.ts) |
| `METRICS` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `PLATFORM_CREATION_PINS` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/creation-versions.ts`](../../packages/scope/src/creation-versions.ts) |
| `PUBLIC_ORIGIN` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/public-origin.ts`](../../packages/scope/src/public-origin.ts) |
| `REGISTER_SCOPE` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/register-setting.ts`](../../packages/scope/src/register-setting.ts) |
| `REGISTRIES` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ROOM` | binding | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `SCOPES` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `SCOPE_INDEX` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/scope-index.ts`](../../packages/scope/src/scope-index.ts) |
| `SCOPE_INDEX_MODE` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `SCREEN_HOSTS` | text | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `SERVING_CREATION_ADDRESS_PER_HOUR` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SERVING_CREATION_KEY_PER_HOUR` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SERVING_READ_ADDRESS_PER_MINUTE` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SERVING_READ_KEY_PER_MINUTE` | text | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SESSION_SECRET` | secret | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `VERSION_METADATA` | binding | `artroom-scope`, `dap-celld-local`, `dap-demo`, `dap-commons`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
<!-- dap-settings-lookup:end -->

<!-- security-settings -->
```dap-settings-inventory
{
  "version": 1,
  "deployments": [
    {
      "name": "artroom-scope",
      "config": "apps/room/wrangler.jsonc",
      "entry": "apps/room/worker.ts",
      "kind": "worker"
    },
    {
      "name": "dap-celld-local",
      "config": "apps/room/celld/wrangler.json",
      "entry": "apps/room/celld/worker.ts",
      "kind": "worker"
    },
    {
      "name": "dap-demo",
      "config": "apps/room/wrangler.demo.jsonc",
      "entry": "apps/room/worker.ts",
      "kind": "worker"
    },
    {
      "name": "dap-commons",
      "config": "apps/room/wrangler.commons.jsonc",
      "entry": "apps/room/worker.commons.ts",
      "kind": "worker"
    },
    {
      "name": "dap-lending",
      "config": "apps/room/wrangler.lending.jsonc",
      "entry": "apps/room/worker.ts",
      "kind": "worker"
    },
    {
      "name": "dap-grow",
      "config": "apps/room/wrangler.grow.jsonc",
      "entry": "apps/room/worker.grow.ts",
      "kind": "worker"
    },
    {
      "name": "dap-application-sandbox",
      "config": "apps/sandbox/wrangler.jsonc",
      "entry": "apps/sandbox/worker.ts",
      "kind": "worker"
    },
    {
      "name": "dap-application-sandbox",
      "config": "apps/sandbox/wrangler.rollout.jsonc",
      "entry": "apps/sandbox/worker.ts",
      "kind": "worker"
    },
    {
      "name": "dap-grow-simulator",
      "config": "examples/grow/wrangler.jsonc",
      "entry": "examples/grow/simulator-worker.ts",
      "kind": "worker"
    },
    {
      "name": "dap-home",
      "config": "homepage/wrangler.jsonc",
      "entry": null,
      "kind": "assets"
    },
    {
      "name": "artroom-jam",
      "config": "apps/jam/wrangler.jsonc",
      "entry": null,
      "kind": "assets"
    }
  ],
  "settings": [
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "DEPLOYMENT",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/health.ts",
        "packages/scope/src/operational.ts",
        "packages/scope/src/creation-admission.ts",
        "packages/scope/src/creation-lineage.ts",
        "apps/room/demo-creation.ts",
        "packages/scope/src/applications/route.ts",
        "packages/scope/src/scope-index.ts",
        "packages/scope/src/creation-versions.ts"
      ],
      "parser": "readDeployment: nonempty string of at most 128 UTF-8 bytes; shared by sessions, creation, demo, screens and metrics.",
      "missing": "Sessions unavailable; genuinely absent local creation retains the local API.",
      "invalid": "Sessions and configured creation refuse; screens unavailable; metrics label unknown. An invalid value is not absent.",
      "health": "deployment is the valid value or unknown; sessions unavailable makes status 503."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "PUBLIC_ORIGIN",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/public-origin.ts"
      ],
      "parser": "readPublicOrigin: exact canonical ASCII origin of at most 2048 bytes, HTTPS or invitation-policy loopback HTTP (127/8 or [::1]); no credentials, path, query, fragment or trailing slash. Forwarded headers are not read.",
      "missing": "Uses the original request URL origin, including internal HTTP.",
      "invalid": "No fallback. Opted-in MCP returns 503 unavailable before object selection; application pages return 503 application-unavailable; demo offers and sandbox descriptor gates return 404. Existing path, method and opt-in gates still apply.",
      "health": "Not inspected. Health attests actual register/session readiness, not public-origin or proxy correctness."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SESSION_SECRET",
      "kind": "secret",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/health.ts"
      ],
      "parser": "sessionsOf: UTF-8 secret of at least 32 bytes with a valid DEPLOYMENT.",
      "missing": "No session issuance or acceptance.",
      "invalid": "No session issuance or acceptance.",
      "health": "sessions unavailable; status 503. No secret is returned."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "ARTIFACTS_CONFIG",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/artifacts-wiring.ts",
        "packages/scope/src/health.ts",
        "packages/scope/src/creation-admission.ts",
        "packages/scope/src/creation-lineage.ts",
        "packages/scope/src/site/host.ts",
        "apps/room/archive.ts",
        "packages/scope/src/scope-index.ts",
        "packages/scope/src/demo-creation.ts",
        "packages/scope/src/scope-index-census.ts",
        "packages/scope/src/register-setting.ts"
      ],
      "parser": "artifactsConfiguration: at most 4096 characters, strict exact JSON fields registerScope/namespace/host/maxBytes/credentialIdentity; host uses artifactsService; identity must adapter-attempt.",
      "missing": "Artifacts outside port off; REGISTER_SCOPE can independently supply the creation, lineage and census identity.",
      "invalid": "Artifacts factory/site off. A supplied malformed config or disagreement with REGISTER_SCOPE makes creation misconfigured; lineage and census fail closed.",
      "health": "wiring.artifacts off/unconfigured or off/invalid-config; configured off makes status 503."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "ARTIFACTS_NAMESPACE",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/artifacts-wiring.ts",
        "packages/scope/src/site/host.ts",
        "packages/scope/src/demo-creation.ts"
      ],
      "parser": "artifactsReadiness compares config namespace with this value or maintained ARTIFACTS_NAMESPACE default.",
      "missing": "Uses artroom-demo for compatibility.",
      "invalid": "Namespace mismatch closes the Artifacts port and site reader.",
      "health": "wiring.artifacts off/namespace-mismatch; status 503 when configured."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "ARTIFACTS",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/artifacts-wiring.ts",
        "packages/scope/src/site/host.ts",
        "apps/room/archive.ts",
        "packages/scope/src/creation-admission.ts"
      ],
      "parser": "artifactsBinding checks nonnull object/function with get/create/delete methods; runtime namespace is provisioned by Wrangler. Parentless Artifacts install admission checks binding presence after authorization; this is not a provider or runtime-method probe.",
      "missing": "No Artifacts outside port. An authorized deployed install selecting artifacts returns host-unavailable before target lookup.",
      "invalid": "Method-shape mismatch closes wiring; this is not a provider-connectivity probe.",
      "health": "wiring.artifacts off/missing-binding when configured; status 503."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "GITHUB_APP_CONFIG",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/github-wiring.ts",
        "packages/scope/src/health.ts",
        "packages/scope/src/site/host.ts"
      ],
      "parser": "gitHubConfiguration: at most 4096 characters, strict closed fields for issuer, installationId, account, maxBytes, registerScope, privateRepositories, publicReads and adapter-attempt identity.",
      "missing": "GitHub outside port off.",
      "invalid": "GitHub factory/site off; no fallback to partial config.",
      "health": "wiring.github off/unconfigured or off/invalid-config; configured off makes status 503."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "GITHUB_APP_PRIVATE_KEY",
      "kind": "secret",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/github-wiring.ts",
        "packages/scope/src/site/host.ts"
      ],
      "parser": "gitHubPrivateKey checks the supported PEM syntax; validation does not import or authenticate the key.",
      "missing": "With configured GitHub, missing private key closes the whole wiring; no app-authenticated operation is enabled.",
      "invalid": "Configured malformed credential closes the whole GitHub wiring.",
      "health": "wiring.github off/private-key when configured; status 503. No credential is returned."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "GITHUB_CREATION_TOKEN",
      "kind": "secret",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/github-wiring.ts",
        "packages/scope/src/site/host.ts"
      ],
      "parser": "Optional credential has the bounded supported secret syntax; repository creation still needs its credential.",
      "missing": "Wiring can remain wired, but this outside port does not accept create-repository without the creation credential. The recorded operation remains unsent.",
      "invalid": "Configured malformed credential closes the whole GitHub wiring.",
      "health": "wiring.github off/creation-token when configured; status 503. No credential is returned."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "GITHUB_READ_TOKEN",
      "kind": "secret",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/github-wiring.ts",
        "packages/scope/src/site/host.ts"
      ],
      "parser": "Required unless publicReads; any supplied token must have the bounded supported secret syntax.",
      "missing": "Allowed only when publicReads is true; reads then omit credentials. Otherwise the whole configured GitHub wiring closes with read-token.",
      "invalid": "Configured malformed credential closes the whole GitHub wiring.",
      "health": "wiring.github off/read-token when configured; status 503. No credential is returned."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "GITHUB_CLEANUP_TOKENS",
      "kind": "secret",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/github-wiring.ts",
        "packages/scope/src/site/host.ts"
      ],
      "parser": "cleanupTokens accepts an exact per-repository credential JSON map, at most 1 MiB, with bounded names, plaintext and expiry syntax.",
      "missing": "Uses an empty cleanup map; the delete-repository outside kind is not enabled. Other valid GitHub operations are unaffected.",
      "invalid": "Configured malformed credential closes the whole GitHub wiring.",
      "health": "Absent map is valid. A malformed supplied map reports wiring.github off/cleanup-tokens and status503 when configured; no credential is returned."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "ALLOW_OPEN_CREATION",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/creation-admission.ts",
        "packages/scope/src/creation-lineage.ts",
        "packages/scope/src/scope-index.ts"
      ],
      "parser": "Only the exact string true opens the local/test creation escape. DEPLOYMENT and supplied register settings are validated first; a deployed escape still requires a valid register pin and does not bypass the new host/cohort checks.",
      "missing": "A configured deployment requires its pinned register and verified creator chain; absent local DEPLOYMENT preserves local behavior.",
      "invalid": "Values other than true do not open the escape.",
      "health": "Not reported; a healthy response does not attest this policy."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "PLATFORM_CREATION_PINS",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/creation-versions.ts",
        "packages/scope/src/worker.ts",
        "packages/scope/src/scope-index.ts"
      ],
      "parser": "readPlatformCreationPolicy: a JSON string of at most 8192 UTF-8 bytes containing at most 128 distinct exact pins supported by platform(). The ARCHIVE_DEVICE_PUBLICATION_COHORT and UNPUBLISHED_COHORT pins are always included. An absent field or explicit undefined selects that baseline; an empty array adds no historical pins.",
      "missing": "DeployedScope permits new platform genesis under the hosted publication and unpublished baseline cohorts. Raw internal engine wiring without an injected deployment policy retains its compatibility behavior.",
      "invalid": "Null, malformed JSON, a non-array, duplicate or unknown pins, or an exceeded bound closes new platform genesis. An exact existing repeat requires an active scope and a bounded applied birth with canonical bytes and a matching hash. Scope address, kind, incarnation, pin and seed must match. The predecessor must be null and native support current. Original routing and authority checks remain. Reads, later acts and replay retain their recorded pins.",
      "health": "Not validated or reported by /health. Its session, register and host checks can pass while this policy closes new platform creation."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SCOPE_INDEX_MODE",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/scope-index.ts"
      ],
      "parser": "scopeIndex/indexedScopes accept register or enforce; undefined selects enforce. Census serves in enforce only; register returns unsupported.",
      "missing": "Uses enforce with a valid index binding.",
      "invalid": "Invalid mode refuses indexed target lookup.",
      "health": "Not a mode, backfill or enforcement attestation."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SCOPES",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/health.ts",
        "packages/scope/src/site/host.ts",
        "packages/scope/src/applications/route.ts",
        "apps/room/fetch.ts",
        "apps/room/demo-creation.ts",
        "packages/scope/src/site/route.ts"
      ],
      "parser": "Wrangler DurableObjectNamespace; indexedScopes wraps target addressing. It is not a string parser.",
      "missing": "Scope routes cannot address their target; register readiness is unavailable.",
      "invalid": "A malformed runtime namespace can throw; there is no general namespace-shape validator.",
      "health": "Configured register probe may be unavailable; no blanket namespace validity claim."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SCOPE_INDEX",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/scope-index.ts",
        "packages/scope/src/serving-admission.ts",
        "packages/scope/src/site/host.ts",
        "packages/scope/src/scope-index-census.ts"
      ],
      "parser": "scopeIndex addresses the fixed applied-genesis-v1 owner; indexedScopes requires it before protected target lookup. The Artifacts Site reader addresses that same fixed owner for shared read-token custody. Census addresses only that fixed owner and authenticates its pinned Register install signer.",
      "missing": "Indexed existing-target requests refuse. Artifacts Site reads cannot acquire a read token and return unavailable. Census returns absent without a manifest.",
      "invalid": "Runtime call failure refuses lookup; binding shape is not parsed as text.",
      "health": "No direct index-mode/backfill field."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "REGISTRIES",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts"
      ],
      "parser": "Wrangler hosted-MCP DurableObjectNamespace; mcpRoute requires both namespaces and a valid opt-in policy.",
      "missing": "Hosted MCP route 404 before body/target work.",
      "invalid": "No full namespace-shape parser; a truthy malformed runtime binding can fail at invocation.",
      "health": "Not reported; health does not attest hosted MCP."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "AGENTS",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts"
      ],
      "parser": "Wrangler hosted-MCP DurableObjectNamespace; mcpRoute requires both namespaces and a valid opt-in policy.",
      "missing": "Hosted MCP route 404 before body/target work.",
      "invalid": "No full namespace-shape parser; a truthy malformed runtime binding can fail at invocation.",
      "health": "Not reported; health does not attest hosted MCP."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "MCP_ENABLED",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/mcp/src/hosted-tools.ts"
      ],
      "parser": "hostedMcpTools requires exact true.",
      "missing": "Hosted MCP route 404.",
      "invalid": "Any other value closes the hosted endpoint.",
      "health": "Not reported; health can be healthy with MCP off."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "MCP_TOOL_ADDITIONS",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/mcp/src/hosted-tools.ts"
      ],
      "parser": "Optional JSON array, at most 1024 characters, known distinct generic names, no more than 18 items.",
      "missing": "Uses narrow hosted defaults: create/install_application/credential/prepare/join/record/step/text omitted.",
      "invalid": "Malformed, duplicate, unknown or oversized list closes the endpoint.",
      "health": "Not reported."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "APPLICATION_CONTENT",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/applications/route.ts",
        "packages/scope/src/applications/wiring.ts"
      ],
      "parser": "Wrangler R2 Bucket used by ApplicationContentStore; package integrity/trust checks remain separate.",
      "missing": "Application package custody unavailable.",
      "invalid": "Runtime storage errors remain unavailable; binding presence is not a successful storage/provider check.",
      "health": "Not reported."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "APPLICATION_TRUST",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/applications/route.ts",
        "packages/scope/src/applications/wiring.ts"
      ],
      "parser": "readApplicationTrust validates the supported exact release/publisher/host trust rows; later package checks still authenticate bytes and semantics.",
      "missing": "No package admitted or served; fresh acts under installed releases refuse application-revoked.",
      "invalid": "No package admitted or served; fresh acts under installed releases refuse application-revoked.",
      "health": "Not reported; a healthy response is not package trust or host authorization."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "APPLICATION_SCREEN_HOSTS",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/applications/route.ts"
      ],
      "parser": "applicationScreenHosts reads bounded exact per-installation sandbox/room descriptors.",
      "missing": "No matching generic screen installation descriptor.",
      "invalid": "Invalid descriptors yield no matching screen; no ambient origin is trusted.",
      "health": "Not reported."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "DEMO_START_CONFIG",
      "kind": "text",
      "status": "read",
      "readers": [
        "apps/room/demo-creation.ts",
        "apps/room/fetch.ts"
      ],
      "parser": "demoCreationConfig accepts closed wire version 3 and binds its explicit canonical origin, deployment, full Register17 reference and Artifacts adapter register/namespace. Its checked native context and public offer are version 2. The effective request origin must match; forwarded headers supply no identity. The Page route exposes only a boolean for setting presence.",
      "missing": "Demo creation route unavailable. Page Start shows the CLI instruction and makes no creation-offer request.",
      "invalid": "Invalid config or origin mismatch returns 404 before namespace lookup. Legacy versions 1 and 2 return no offer, including for an exact retained-reference query; no fallback.",
      "health": "Not reported separately."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "METRICS",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/operational.ts"
      ],
      "parser": "MetricBinding.writeDataPoint; emission is best effort and bounded by the metrics owner.",
      "missing": "No metrics emission.",
      "invalid": "Write failures are caught; the response does not prove delivery of a metric.",
      "health": "No metric-sink readiness field."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "VERSION_METADATA",
      "kind": "binding",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "packages/scope/src/health.ts",
        "packages/scope/src/operational.ts"
      ],
      "parser": "Wrangler version metadata object; health accepts id only with the maintained UUID syntax.",
      "missing": "Health/metrics use unknown version.",
      "invalid": "Health uses unknown for invalid id; this is no attestation of release identity.",
      "health": "version contains the accepted id or unknown."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SERVING_CREATION_KEY_PER_HOUR",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/serving-limits.ts"
      ],
      "parser": "servingLimitConfig: positive decimal string, at most 7 digits and the maintained MAX_LIMIT; fixed finite table capacity.",
      "missing": "Uses reviewed DEFAULT_SERVING_LIMITS.",
      "invalid": "Invalid override closes serving admission; it never becomes an unlimited/default policy.",
      "health": "No separate limit configuration field."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SERVING_CREATION_ADDRESS_PER_HOUR",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/serving-limits.ts"
      ],
      "parser": "servingLimitConfig: positive decimal string, at most 7 digits and the maintained MAX_LIMIT; fixed finite table capacity.",
      "missing": "Uses reviewed DEFAULT_SERVING_LIMITS.",
      "invalid": "Invalid override closes serving admission; it never becomes an unlimited/default policy.",
      "health": "No separate limit configuration field."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SERVING_READ_KEY_PER_MINUTE",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/serving-limits.ts"
      ],
      "parser": "servingLimitConfig: positive decimal string, at most 7 digits and the maintained MAX_LIMIT; fixed finite table capacity.",
      "missing": "Uses reviewed DEFAULT_SERVING_LIMITS.",
      "invalid": "Invalid override closes serving admission; it never becomes an unlimited/default policy.",
      "health": "No separate limit configuration field."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "SERVING_READ_ADDRESS_PER_MINUTE",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/serving-limits.ts"
      ],
      "parser": "servingLimitConfig: positive decimal string, at most 7 digits and the maintained MAX_LIMIT; fixed finite table capacity.",
      "missing": "Uses reviewed DEFAULT_SERVING_LIMITS.",
      "invalid": "Invalid override closes serving admission; it never becomes an unlimited/default policy.",
      "health": "No separate limit configuration field."
    },
    {
      "deployments": [
        "dap-grow"
      ],
      "name": "GROW_ARCHIVE_CONFIG",
      "kind": "text",
      "status": "read",
      "readers": [
        "apps/room/archive.ts"
      ],
      "parser": "growArchiveConfiguration: strict exact policy/release/directory/repositoryName JSON, at most 2048 characters, with valid pinned Artifacts configuration.",
      "missing": "Grow archive wiring remains absent.",
      "invalid": "Grow archive wiring remains absent; no generic fixture driver fallback.",
      "health": "Not reported; archive diagnostic is separate."
    },
    {
      "deployments": [
        "dap-grow"
      ],
      "name": "ARCHIVE_RESTART_DIRECTIVE",
      "kind": "text",
      "status": "read",
      "readers": [
        "apps/room/worker.grow.ts"
      ],
      "parser": "readArchiveRestart: canonical closed directive at most 8 KiB, exact fullScope/repository/confirmed receipt/digest/generation and absolute expiry; private row CAS checks admission.",
      "missing": "No deployment-requested restart.",
      "invalid": "Directive refused without clearing a stop; no public request can supply it.",
      "health": "Not reported; no hosted recovery or target identity is established."
    },
    {
      "deployments": [
        "dap-application-sandbox"
      ],
      "name": "SCREEN_HOSTS",
      "kind": "text",
      "status": "read",
      "readers": [
        "apps/sandbox/worker.ts"
      ],
      "parser": "mappings: at most 32 bounded host/service records, strict descriptor reader and finite service ROOM/GROW/LENDING, unique screen origins.",
      "missing": "No mapping; route 404.",
      "invalid": "Invalid mapping yields 404. A valid mapping with missing selected service yields 503.",
      "health": "No health route."
    },
    {
      "deployments": [
        "dap-application-sandbox"
      ],
      "name": "ROOM",
      "kind": "binding",
      "status": "read",
      "readers": [
        "apps/sandbox/worker.ts"
      ],
      "parser": "Runtime ScreenService selected only by the validated mapping.service literal domain.",
      "missing": "A mapping selecting this missing service yields 503.",
      "invalid": "A malformed or misbound service is not trusted merely by name; descriptor and proxy checks apply.",
      "health": "No health route."
    },
    {
      "deployments": [
        "dap-application-sandbox"
      ],
      "name": "GROW",
      "kind": "binding",
      "status": "read",
      "readers": [
        "apps/sandbox/worker.ts"
      ],
      "parser": "Runtime ScreenService selected only by the validated mapping.service literal domain.",
      "missing": "A mapping selecting this missing service yields 503.",
      "invalid": "A malformed or misbound service is not trusted merely by name; descriptor and proxy checks apply.",
      "health": "No health route."
    },
    {
      "deployments": [
        "dap-application-sandbox"
      ],
      "name": "LENDING",
      "kind": "binding",
      "status": "read",
      "readers": [
        "apps/sandbox/worker.ts"
      ],
      "parser": "Runtime ScreenService selected only by the validated mapping.service literal domain.",
      "missing": "A mapping selecting this missing service yields 503.",
      "invalid": "A malformed or misbound service is not trusted merely by name; descriptor and proxy checks apply.",
      "health": "No health route."
    },
    {
      "deployments": [
        "dap-grow-simulator"
      ],
      "name": "GROW_BINDING",
      "kind": "text",
      "status": "read",
      "readers": [
        "examples/grow/simulator-host.ts"
      ],
      "parser": "binding: strict JSON at most 8192 characters, HTTPS service origin, full lane ScopeRef and three distinct principals in the same membership.",
      "missing": "Scheduled configuration fails; no default room or principal is used.",
      "invalid": "Scheduled tick refuses; no default room or principal is inferred.",
      "health": "No health route."
    },
    {
      "deployments": [
        "dap-grow-simulator"
      ],
      "name": "GROW_SENSORS_SECRET",
      "kind": "secret",
      "status": "read",
      "readers": [
        "examples/grow/simulator-host.ts"
      ],
      "parser": "Simulator secret reader accepts the maintained unpadded base 64 url 32-byte secret; each principal is independently pinned.",
      "missing": "No successful scheduled agent work.",
      "invalid": "Scheduled owner refuses rather than using another principal.",
      "health": "No health route."
    },
    {
      "deployments": [
        "dap-grow-simulator"
      ],
      "name": "GROW_CLIMATE_SECRET",
      "kind": "secret",
      "status": "read",
      "readers": [
        "examples/grow/simulator-host.ts"
      ],
      "parser": "Simulator secret reader accepts the maintained unpadded base 64 url 32-byte secret; each principal is independently pinned.",
      "missing": "No successful scheduled agent work.",
      "invalid": "Scheduled owner refuses rather than using another principal.",
      "health": "No health route."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-celld-local",
        "dap-demo",
        "dap-commons",
        "dap-lending",
        "dap-grow"
      ],
      "name": "REGISTER_SCOPE",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/register-setting.ts",
        "packages/scope/src/scope-index.ts",
        "packages/scope/src/health.ts"
      ],
      "parser": "readRegisterScope: one exact ScopeId string, without trimming or coercion; primary identity for creation, child lineage and census. Supplied ARTIFACTS_CONFIG must parse and name the same register. No provider or binding is consulted.",
      "missing": "Uses a valid Artifacts-only legacy pin; with neither source, deployed creation is unauthorized and lineage/census stay closed.",
      "invalid": "Malformed supplied pin/config or disagreement makes creation misconfigured before target lookup; lineage/census refuse. The explicit deployed open-creation escape does not bypass this check.",
      "health": "An explicit valid pin selects the existing bounded/cached readiness probe independently of provider wiring. Malformed or conflicting pins report register unavailable without a probe; a ready pin does not attest provider connectivity, creation policy or a census. With no explicit field, legacy host-root selection is unchanged."
    }
  ]
}
```
<!-- /security-settings -->

## Source

Checked against main `c8c7b631` on 30 October 2026. Sources: [scripts/security-settings.mjs](../../scripts/security-settings.mjs), [packages/scope/src/register-setting.ts](../../packages/scope/src/register-setting.ts), [packages/scope/src/health.ts](../../packages/scope/src/health.ts), [packages/scope/src/creation-versions.ts](../../packages/scope/src/creation-versions.ts), [packages/scope/src/public-origin.ts](../../packages/scope/src/public-origin.ts).
