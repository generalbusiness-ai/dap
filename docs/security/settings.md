# Worker settings and bindings

For a qualified comparison with recorded route-place telemetry, see
[Report observed Worker use](../usage-report.md). That script uses an external
operator mapping and does not prove that a configured route or binding was unused.

This reference describes the checked-in Worker code and deployment configurations.
It does not read deployed values, attest a rollout, or test a provider. Secrets
are named here; their values do not belong in this page, a log, or a journal.

A **text** setting is operator configuration parsed by code. A **secret** is
credential material supplied through the deployment secret store. A **binding**
is a runtime namespace, bucket, dataset, metadata object, or service. Binding
presence is not proof that a remote service or credential works.

The inventory records conditional reads too. A shared setting can appear for
a Worker even when its checked-in configuration does not supply it: operator
settings and secrets can supply it later. Conversely, a type declaration or
Wrangler declaration alone does not prove that code reads a name. Such an
entry uses `declared-unused`, with its declaration as the reader reference.
No table entry authorizes a new setting or changes its parser.

## Deployment roots

| Worker | Configuration and runtime entry |
|---|---|
| `artroom-scope` | `apps/room/wrangler.jsonc` → `apps/room/worker.ts` |
| `dap-demo` | `apps/room/wrangler.demo.jsonc` → `apps/room/worker.ts` |
| `dap-lending` | `apps/room/wrangler.lending.jsonc` → `apps/room/worker.ts` |
| `dap-grow` | `apps/room/wrangler.grow.jsonc` → `apps/room/worker.grow.ts` |
| `dap-application-sandbox` | Both `apps/sandbox/wrangler*.jsonc` configurations → `apps/sandbox/worker.ts` |
| `dap-grow-simulator` | `examples/grow/wrangler.jsonc` → `examples/grow/simulator-worker.ts` |
| `dap-home`, `artroom-jam` | Assets-only configurations; no Worker `main` |

The room entry reexports the Scope classes and uses `apps/room/fetch.ts` for
HTTP dispatch. Its named Durable Object and service entrypoints share the
same configuration closure. Grow adds its explicit archive wrapper. The
sandbox and scheduled simulator have independent environments; neither
inherits the room's session secret or namespaces from a TypeScript name.
Test Wrangler configurations and local build/CLI environment variables are
not deployed runtime settings in this inventory.

## Failure and health meanings

**Closed** means the affected feature refuses or stays unavailable. It does
not mean every malformed runtime binding is safely parsed: a wrongly shaped
namespace or service can throw at its call boundary. The rows say when that
is the actual behavior. Optional telemetry uses a best-effort fallback.

The room health response reports sessions, its selected register probe,
version metadata, and finite Artifacts/GitHub wiring states. An explicit
`REGISTER_SCOPE` selects its host-independent probe; malformed or conflicting
pin settings return unavailable without probing an object. With no explicit
setting, the existing GitHub/Artifacts selection and ambiguity rules remain. A configured
host that is off makes health return `503`; absent host configuration is
separate. Two different configured register roots remain ambiguous. A
`wired` state proves local syntax and binding checks, not provider
connectivity, GitHub installation authority, valid tokens, package trust,
MCP enablement, serving capacity, or archive recovery.

`SCOPE_INDEX_MODE=register` is a transition: an unknown target may be activated
so that its own verified applied genesis can register it. `enforce` refuses
an unknown existing target before target lookup. Checked-in mode, a health
response, and the existence of index code do not prove backfill completion or
deployed enforcement. The separate R2 continuation remains open; this page
makes no unconditional “no object before genesis” claim.

The registered-scope census serves only in enforce mode, including the
default when the mode is absent. Register mode returns `unsupported`;
a missing index returns `absent`. Creation, child lineage and census use
`readRegisterScope`: the nonsecret `REGISTER_SCOPE` is primary, with a valid
Artifacts configuration as a legacy fallback. When both are supplied, their
register IDs must agree. Supplied malformed or conflicting values fail
closed. A deployed creation with neither pin remains closed, including the
explicit local/test opening. No host binding is needed to read the pin.
The full stored Register row and its checked founding install determine
the permitted census signing key. Neither a caller-selected root nor a
membership session supplies that authority. This attests no deployed census.

`PLATFORM_CREATION_PINS` adds deployment-approved historical pins to the
hosted publication and unpublished creation cohorts. It does not change existing scopes' pins or admit
another native lineage family. An index entry permits lookup only; the
native target must validate an exact existing birth before an excluded
pin can repeat. [Creation versions](../deploy.md#creation-versions) describes
the saved-manifest report, register pin and planner rollout steps.

The health response does not inspect this setting. A `200` response does
not prove that a requested platform pin can create a new scope.

`APPLICATION_TRUST` controls package installation, serving, and admission of
fresh acts under installed releases. Withdrawal refuses new acts with
`application-revoked`, including declared descendants. Native creation records
identify the release. Missing provenance returns unavailable. Accepted-key
recovery, replay, and pending settlement do not consult this admission gate.
This reference changes no trust schema or provider custody.
Deployment and secret-setting procedures remain in [Deploy dap](../deploy.md).

## Source-owned inventory

Each row below keys exact Worker names and one exact setting or binding.
`readers` identifies source owners; `parser`, `missing`, `invalid`, and
`health` state reviewed semantics. The static checker verifies enumeration
and source ownership; it does not execute those parsers or prove their
security behavior. A new read, unsupported environment syntax, or an
undocumented configuration binding must not silently pass.

The lookup is generated from the canonical rows below. **Main reader** is the
first listed source owner, not its only reader. The full row records the
parser, failure behavior, health visibility, and other readers.

<!-- dap-settings-lookup:start -->
| Name | Kind | Workers | Main reader |
| --- | --- | --- | --- |
| `AGENTS` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ALLOW_OPEN_CREATION` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/creation-admission.ts`](../../packages/scope/src/creation-admission.ts) |
| `APPLICATION_CONTENT` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `APPLICATION_SCREEN_HOSTS` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `APPLICATION_TRUST` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ARCHIVE_RESTART_DIRECTIVE` | text | `dap-grow` | [`apps/room/worker.grow.ts`](../../apps/room/worker.grow.ts) |
| `ARTIFACTS` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ARTIFACTS_CONFIG` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ARTIFACTS_NAMESPACE` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `DEMO_START_CONFIG` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `DEPLOYMENT` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_APP_CONFIG` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_APP_PRIVATE_KEY` | secret | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_CLEANUP_TOKENS` | secret | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_CREATION_TOKEN` | secret | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GITHUB_READ_TOKEN` | secret | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `GROW` | binding | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `GROW_ARCHIVE_CONFIG` | text | `dap-grow` | [`apps/room/archive.ts`](../../apps/room/archive.ts) |
| `GROW_BINDING` | text | `dap-grow-simulator` | [`examples/grow/simulator-host.ts`](../../examples/grow/simulator-host.ts) |
| `GROW_CLIMATE_SECRET` | secret | `dap-grow-simulator` | [`examples/grow/simulator-host.ts`](../../examples/grow/simulator-host.ts) |
| `GROW_SENSORS_SECRET` | secret | `dap-grow-simulator` | [`examples/grow/simulator-host.ts`](../../examples/grow/simulator-host.ts) |
| `LENDING` | binding | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `MCP_ENABLED` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/mcp/src/hosted-tools.ts`](../../packages/mcp/src/hosted-tools.ts) |
| `MCP_TOOL_ADDITIONS` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/mcp/src/hosted-tools.ts`](../../packages/mcp/src/hosted-tools.ts) |
| `METRICS` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `PLATFORM_CREATION_PINS` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/creation-versions.ts`](../../packages/scope/src/creation-versions.ts) |
| `REGISTER_SCOPE` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/register-setting.ts`](../../packages/scope/src/register-setting.ts) |
| `REGISTRIES` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `ROOM` | binding | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `SCOPES` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `SCOPE_INDEX` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/scope-index.ts`](../../packages/scope/src/scope-index.ts) |
| `SCOPE_INDEX_MODE` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `SCREEN_HOSTS` | text | `dap-application-sandbox` | [`apps/sandbox/worker.ts`](../../apps/sandbox/worker.ts) |
| `SERVING_CREATION_ADDRESS_PER_HOUR` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SERVING_CREATION_KEY_PER_HOUR` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SERVING_READ_ADDRESS_PER_MINUTE` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SERVING_READ_KEY_PER_MINUTE` | text | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/serving-limits.ts`](../../packages/scope/src/serving-limits.ts) |
| `SESSION_SECRET` | secret | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
| `VERSION_METADATA` | binding | `artroom-scope`, `dap-demo`, `dap-lending`, `dap-grow` | [`packages/scope/src/worker.ts`](../../packages/scope/src/worker.ts) |
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
      "name": "dap-demo",
      "config": "apps/room/wrangler.demo.jsonc",
      "entry": "apps/room/worker.ts",
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
        "dap-demo",
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
        "packages/scope/src/github-wiring.ts",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
        "dap-lending",
        "dap-grow"
      ],
      "name": "DEMO_START_CONFIG",
      "kind": "text",
      "status": "read",
      "readers": [
        "packages/scope/src/worker.ts",
        "apps/room/demo-creation.ts",
        "packages/scope/src/github-wiring.ts",
        "apps/room/fetch.ts"
      ],
      "parser": "demoCreationConfig/legacyGitHubDemoConfig bind the supported exact version, origin, deployment, register/cohort and host context. The Page route exposes only a boolean for setting presence; the offer route retains its full parser and authority checks.",
      "missing": "Demo creation route unavailable. Page Start shows the CLI instruction and makes no creation-offer request.",
      "invalid": "Invalid config refuses demo creation; no loose config fallback.",
      "health": "Not reported separately."
    },
    {
      "deployments": [
        "artroom-scope",
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
        "dap-demo",
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
