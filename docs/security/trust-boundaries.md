# Deployment trust boundaries

A Worker binding is authority to use a resource. A check in the application code narrows how the code uses that authority. The check does not create a separate resource namespace.

Each section below follows one checked-in configuration file. A file does not show which version runs, which settings an operator kept, whether two Workers share a secret value, or which namespace IDs Cloudflare assigned. `/health` checks local configuration only, not provider connectivity or hosted authorization ([Failure and health meanings](settings.md#failure-and-health-meanings)).

## What each resource protects

| Resource | Authority and boundary |
|---|---|
| `SESSION_SECRET` with `DEPLOYMENT` | Authenticates read-session claims by HMAC. Reading scopes check the deployment, repository membership reference, allowed read, and expiry. Every holder of the secret can mint claims, so all holders share one trust boundary. A different deployment label is not a substitute for separate secret custody after compromise. Sessions do not sign acts or grant provider authority. |
| `ARTIFACTS` | A capability for one configured Artifacts namespace. Its interface can get, create, and delete repositories and mint or revoke repository tokens. The adapter needs no separate outside Worker secret. Checks on the register, the recorded host, the namespace and the destination's birth limit how the code uses this capability. |
| `APPLICATION_CONTENT` | A private R2 binding for retained application release bytes. The production wrapper uses `applications/releases/<sha256>` keys and checks trusted release bytes before use or immutable writes. Shared release keys are not Worker-specific tenant namespaces. Content custody alone creates no native installation or member authority. |
| `REGISTRIES` and `AGENTS` | Durable storage for hosted MCP control identities and agent state. A registry is named by its membership scope ID and allocates each agent in `AGENTS`. Agent storage holds its private signing seed, bearer digest and expiry, redacted receipts, and sessions. These objects rely on signed control requests, current membership authority, native enrollment and bearer checks, not `SESSION_SECRET` alone. |
| `SCOPE_INDEX` and `SCOPES` | Scope discovery inside the Worker, the check that accepts or refuses a request before it reaches a scope, and native scope state. Binding possession is an internal RPC boundary. Public callers still pass the relevant creation, act, read, or session checks. |
| `METRICS` | A dataset write binding. Code emits bounded points with deployment, version, scope, and fixed event labels. Labels identify the source of a point. They do not isolate datasets or control who can query the account's analytics. |

The source owners are [sessions](../../packages/scope/src/sessions.ts), [Artifacts wiring](../../packages/scope/src/artifacts-wiring.ts), [host authority](../../packages/scope/src/host-wiring.ts), [application content](../../packages/scope/src/applications/content.ts), [Worker MCP wiring](../../packages/scope/src/worker.ts), and [hosted MCP storage and control](../../packages/mcp/src/hosted.ts).

## artroom-scope

[`apps/room/wrangler.jsonc`](../../apps/room/wrangler.jsonc) uses the [room entry](../../apps/room/worker.ts), which exports the Scope classes and serves through [room fetch](../../apps/room/fetch.ts).

It declares its own `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS` bindings. These bindings have no cross-Worker `script_name`. The classes are local to this Worker. The same class name in another Worker does not share Durable Object storage.

Its shared resources are `ARTIFACTS` namespace `artroom-demo`, R2 bucket `artroom-application-content`, and dataset `artroom_metrics_v1`. The operator sets `SESSION_SECRET`, `DEPLOYMENT`, `REGISTER_SCOPE` and `ARTIFACTS_CONFIG`. The file holds none of them.

The MCP namespaces are present, but the file sets neither `MCP_ENABLED` nor `MCP_TOOL_ADDITIONS`. The route needs exact opt-in and both namespaces. An operator can still have set the opt-in on the Worker, so the file alone does not show that the hosted endpoint is off. `APPLICATION_SCREEN_HOSTS` is explicitly empty. The file is marked for existing rooms. Browser Start for new rooms points to `dap-demo`.

## dap-grow

[`apps/room/wrangler.grow.jsonc`](../../apps/room/wrangler.grow.jsonc) uses [worker.grow.ts](../../apps/room/worker.grow.ts). Its `DeployedScope` subclass keeps the generic scope wiring and adds the room archive policy. It does not create a separate archive credential or Artifacts namespace.

Grow declares its own `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS`. It shares `artroom-demo`, `artroom-application-content`, and `artroom_metrics_v1` with `artroom-scope`. The file sets `DEPLOYMENT` to `dap-grow-v1`. The operator sets `SESSION_SECRET`. The file pins the register in `REGISTER_SCOPE` and in `ARTIFACTS_CONFIG`, both `sc_yatkl7kuktl2gauvjrt7b2zy7nr6nu55vkzorot2bm5n2umgpbnq`. The file omits `ARTIFACTS_NAMESPACE`, so the Worker uses the default `artroom-demo`.

`APPLICATION_TRUST` lists one application release, publisher and fetch host. `APPLICATION_SCREEN_HOSTS` holds the exact `grow.inguz.space` item 2 screen descriptor. Code applies these checks inside shared content storage. They do not show whether the installation, the DNS mapping or the archive is healthy. The MCP namespaces are declared. The file does not set the hosted opt-in variables.

## dap-lending

[`apps/room/wrangler.lending.jsonc`](../../apps/room/wrangler.lending.jsonc) is marked as historical service configuration. It uses the ordinary room entry and declares local `SCOPES` and `SCOPE_INDEX` classes.

Its Artifacts namespace and matching namespace setting are `dap-lending`, separate from `artroom-demo`. The file pins its register in `REGISTER_SCOPE` and in `ARTIFACTS_CONFIG`. The file declares no application-content R2 bucket, analytics dataset, `REGISTRIES`, or `AGENTS`. With those MCP namespaces absent, the MCP route refuses even if opt-in is requested. `APPLICATION_SCREEN_HOSTS` is empty.

The operator sets `SESSION_SECRET` and `DEPLOYMENT`. The file does not list bindings or settings that the hosted Worker kept from earlier deployments.

## dap-demo

[`apps/room/wrangler.demo.jsonc`](../../apps/room/wrangler.demo.jsonc) uses the ordinary room entry with local `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS`. It sets the index to `enforce`. It pins the Start origin, the register 17 reference, and the register in `REGISTER_SCOPE` and `ARTIFACTS_CONFIG`.

Its Artifacts namespace is `dap-demo`. It shares dataset `artroom_metrics_v1` with `artroom-scope` and `dap-grow`, but declares no application content bucket. `APPLICATION_TRUST` lists one release, publisher and host. Without the `APPLICATION_CONTENT` binding, the Worker stores and serves no package for that release. `APPLICATION_SCREEN_HOSTS` is empty. The file sets no MCP opt-in variable.

The operator sets `SESSION_SECRET` and `DEPLOYMENT`. The `deployment` member of `DEMO_START_CONFIG` is a separate value. The file does not show that the live `DEPLOYMENT` binding matches it.

## dap-celld-local

[`apps/room/celld/wrangler.json`](../../apps/room/celld/wrangler.json) is the local Worker for celld. Its [entry](../../apps/room/celld/worker.ts) imports the production room Worker. It declares local `SCOPES`, `SCOPE_INDEX`, `REGISTRIES` and `AGENTS` classes, with the same three migration tags as `artroom-scope`.

It declares no Artifacts binding, R2 bucket or analytics dataset, so it shares no Cloudflare resource with another Worker. The file sets `DEPLOYMENT` to `dap-celld-local` and the index to `enforce`. The operator sets `REGISTER_SCOPE` and `SESSION_SECRET` in a private `.dev.vars` file. `APPLICATION_SCREEN_HOSTS` is empty. See [Run the local Worker](../celld.md).

## dap-grow-simulator

[`examples/grow/wrangler.jsonc`](../../examples/grow/wrangler.jsonc) declares a scheduled Worker with no Scope, Artifacts, R2, MCP, or metrics bindings. It has no public workers.dev or preview endpoint, and its [fetch handler](../../examples/grow/simulator-host.ts) returns 404.

The operator supplies `GROW_BINDING` and two distinct agent secrets, `GROW_SENSORS_SECRET` and `GROW_CLIMATE_SECRET`. The simulator signs as those two native agents and requests their read sessions from Grow. It does not hold Grow's session-signing secret or an operator key. The source validates distinct keys and the expected installed owner context. The file does not show which secrets, grants or cron state the hosted Worker has.

## dap-application-sandbox

The [default config](../../apps/sandbox/wrangler.jsonc) and [rollout config](../../apps/sandbox/wrangler.rollout.jsonc) name the same Worker. Both bind the fixed `ApplicationScreenService` entrypoints of `artroom-scope` as `ROOM`, `dap-grow` as `GROW`, and `dap-lending` as `LENDING`.

The sandbox has no session-signing secret, Artifacts binding, R2 bucket, MCP namespace, or analytics dataset in either file. It can reach the room services that it binds. Its [gateway](../../apps/sandbox/worker.ts) accepts only a mapped origin and allowed route, then requires an identical installation descriptor from the selected room service. That room owns package reads and native checks.

The default `SCREEN_HOSTS` is empty. The rollout file maps only `grow.inguz.space` item 2 to `GROW`. Browser requests carry only the permitted headers. Package asset requests do not forward authorization. Native traffic still passes the room's credential and authority checks.

A separate screen origin separates browser storage from the room origin. It does not give the gateway its own backend namespaces. It also does not make trusted script at the screen's own origin untrusted. The files do not show the current DNS, routes, rollout choice or browser behavior.

## dap-home

[`homepage/wrangler.jsonc`](../../homepage/wrangler.jsonc) is a static-assets deployment for `dap.generalbusiness.ai`, with workers.dev enabled. It declares no Worker main, session secret, Artifacts binding, R2 bucket, Durable Object, MCP namespace, or metrics dataset. Links to another service do not give this static Worker that service's authority.

## artroom-jam

[`apps/jam/wrangler.jsonc`](../../apps/jam/wrangler.jsonc) is another static-assets configuration. It names no Worker main and no backend bindings.

## Shared resources

`artroom-scope` and `dap-grow` share an Artifacts namespace and an R2 bucket. Three Workers share one analytics dataset. The checked-in configuration names these shared resources:

| Resource | Configurations that name it |
|---|---|
| Artifacts namespace `artroom-demo` | `artroom-scope`, `dap-grow` |
| R2 bucket `artroom-application-content` | `artroom-scope`, `dap-grow` |
| Analytics dataset `artroom_metrics_v1` | `artroom-scope`, `dap-grow`, `dap-demo` |

For these resources, different Worker names and code pins do not isolate namespaces. The Artifacts adapter's pinned register and verified destination birth limit repository operations. Checks on content digest, publisher, release and installation limit application delivery. Metrics labels tell events apart. Code makes each of these checks with a shared capability.

Each Worker's local Durable Object classes are a separate boundary, and so are the `dap-demo` and `dap-lending` Artifacts namespaces. Shared resources do not make all Worker storage shared. Separate Scope or MCP objects do not isolate a shared bucket or Artifacts namespace.

Secret equality, provider access controls, namespace IDs, bucket public-access settings, the operator's variables and deployed versions can be read only from the hosted account. Names and a local `wired` health result do not show them.

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [apps/room/wrangler.jsonc](../../apps/room/wrangler.jsonc), [apps/room/wrangler.grow.jsonc](../../apps/room/wrangler.grow.jsonc), [apps/room/wrangler.lending.jsonc](../../apps/room/wrangler.lending.jsonc), [apps/room/wrangler.demo.jsonc](../../apps/room/wrangler.demo.jsonc), [apps/room/celld/wrangler.json](../../apps/room/celld/wrangler.json), [examples/grow/wrangler.jsonc](../../examples/grow/wrangler.jsonc), [apps/sandbox/wrangler.jsonc](../../apps/sandbox/wrangler.jsonc), [homepage/wrangler.jsonc](../../homepage/wrangler.jsonc), [apps/jam/wrangler.jsonc](../../apps/jam/wrangler.jsonc).
