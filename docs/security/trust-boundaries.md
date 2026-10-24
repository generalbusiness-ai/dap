# Deployment trust boundaries

A Worker binding is authority to use a resource. An application-level check narrows how the reviewed code uses that authority; it does not create a separate resource namespace.

This page describes the checked-in deployment configurations and their source owners. It does not establish which version is running, which settings an operator retained, whether secrets are unique, or which namespace IDs Cloudflare assigned. Local configuration readiness and `/health` do not prove provider connectivity or hosted authorization. [Deployment settings](../deploy.md#local-wiring-readiness) describes that distinction.

## What each resource protects

| Resource | Authority and boundary |
|---|---|
| `SESSION_SECRET` with `DEPLOYMENT` | Authenticates read-session claims by HMAC. Reading scopes check the deployment, repository membership reference, allowed read, and expiry. Every holder of the secret can mint claims, so all such holders share a trust boundary. A different deployment label is not a substitute for separate secret custody after compromise. Sessions do not sign acts or grant provider authority. |
| `ARTIFACTS` | A capability for one configured Artifacts namespace. Its interface can get, create, and delete repositories and mint or revoke repository tokens. The adapter needs no separate outside Worker secret. Register, recorded host, namespace, and destination-birth checks constrain the reviewed code's use of this capability. |
| `APPLICATION_CONTENT` | A private R2 binding for retained application release bytes. The production wrapper uses `applications/releases/<sha256>` keys and checks trusted release bytes before use or immutable writes. Shared release keys are not Worker-specific tenant namespaces. Content custody alone creates no native installation or member authority. |
| `REGISTRIES` and `AGENTS` | Durable storage for hosted MCP control identities and agent state. A registry is named by membership scope ID; it allocates an agent in `AGENTS`. Agent storage holds its private signing seed, bearer digest and expiry, redacted receipts, and sessions. These objects rely on signed control requests, current membership authority, native enrolment, and bearer checks, not `SESSION_SECRET` alone. |
| `SCOPE_INDEX` and `SCOPES` | Worker-local scope discovery, serving admission, and native scope state. Binding possession is an internal RPC boundary. Public callers still pass the relevant creation, act, read, or session checks. |
| `METRICS` | A dataset write binding. Code emits bounded points with deployment, version, scope, and fixed event labels. Labels support attribution; they do not provide dataset isolation or establish who can query account analytics. |

The source owners are [sessions](../../packages/scope/src/sessions.ts), [Artifacts wiring](../../packages/scope/src/artifacts-wiring.ts), [host authority](../../packages/scope/src/host-wiring.ts), [application content](../../packages/scope/src/applications/content.ts), [Worker MCP wiring](../../packages/scope/src/worker.ts), and [hosted MCP storage and control](../../packages/mcp/src/hosted.ts).

## artroom-scope

[`apps/room/wrangler.jsonc`](../../apps/room/wrangler.jsonc) uses the [room entry](../../apps/room/worker.ts), which exports the Scope classes and serves through [room fetch](../../apps/room/fetch.ts).

It declares its own `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS` bindings. These bindings have no cross-Worker `script_name` in this configuration. The classes are local to this Worker; equal class names in another Worker do not imply shared Durable Object storage.

Its shared resources are `ARTIFACTS` namespace `artroom-demo`, R2 bucket `artroom-application-content`, and dataset `artroom_metrics_v1`. `SESSION_SECRET`, `DEPLOYMENT`, and `ARTIFACTS_CONFIG` are operator-set rather than file-owned values. The file does not establish their current values or uniqueness.

The MCP namespaces are present, but neither `MCP_ENABLED` nor `MCP_TOOL_ADDITIONS` is in the file's variables. The route requires exact opt-in and both namespaces. Omitted file variables do not prove the hosted endpoint is off, because retained operator settings are not inspected. `APPLICATION_SCREEN_HOSTS` is explicitly empty. The configuration is marked for existing rooms; new public Start discovery points to `dap-demo`.

## dap-grow

[`apps/room/wrangler.grow.jsonc`](../../apps/room/wrangler.grow.jsonc) uses [worker.grow.ts](../../apps/room/worker.grow.ts). Its `DeployedScope` subclass retains the generic scope wiring and adds the reviewed room archive policy. It does not create a separate archive credential or Artifacts namespace.

Grow declares its own `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS`. It shares `artroom-demo`, `artroom-application-content`, and `artroom_metrics_v1` with `artroom-scope`. `DEPLOYMENT` is file-owned as `dap-grow-v1`; `SESSION_SECRET` is operator-set. The register in `ARTIFACTS_CONFIG` is pinned to `sc_yatkl7kuktl2gauvjrt7b2zy7nr6nu55vkzorot2bm5n2umgpbnq`. The omitted namespace setting uses the source default `artroom-demo`.

The file pins one application release, publisher, and fetch host, plus the exact `grow.inguz.space` item 2 screen descriptor. These are software admission checks within shared content storage. They do not establish that the installation, DNS mapping, or archive is currently healthy. MCP namespaces are declared; hosted opt-in variables are not file-owned here.

## dap-lending

[`apps/room/wrangler.lending.jsonc`](../../apps/room/wrangler.lending.jsonc) is marked as historical service configuration, rather than the generic M1 deployment target. It uses the ordinary room entry and declares local `SCOPES` and `SCOPE_INDEX` classes.

Its Artifacts namespace and matching namespace setting are `dap-lending`, separate from `artroom-demo`. Its register is pinned in `ARTIFACTS_CONFIG`. The file declares no application-content R2 bucket, analytics dataset, `REGISTRIES`, or `AGENTS`. With those MCP namespaces absent, the MCP route refuses even if opt-in is requested. `APPLICATION_SCREEN_HOSTS` is empty.

`SESSION_SECRET` and `DEPLOYMENT` are operator-set. This file alone is not an inventory of any historical hosted bindings or retained settings.

## dap-demo

[`apps/room/wrangler.demo.jsonc`](../../apps/room/wrangler.demo.jsonc) uses the ordinary room entry with local `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS`. It explicitly sets the index to `enforce` and pins the Start origin, Register17 reference, and Artifacts register.

Its Artifacts namespace is `dap-demo`. It shares dataset `artroom_metrics_v1` with room and Grow, but declares no application-content bucket. `APPLICATION_SCREEN_HOSTS` is empty. MCP opt-in variables are absent from the file.

`SESSION_SECRET` and `DEPLOYMENT` remain operator-set. The `deployment` member of `DEMO_START_CONFIG` is a separate value; its presence does not prove the live `DEPLOYMENT` binding matches it.

## dap-grow-simulator

[`examples/grow/wrangler.jsonc`](../../examples/grow/wrangler.jsonc) declares a scheduled Worker with no Scope, Artifacts, R2, MCP, or metrics bindings. It has no public workers.dev or preview endpoint, and its [fetch handler](../../examples/grow/simulator-host.ts) returns 404.

The operator supplies `GROW_BINDING` and two distinct agent secrets, `GROW_SENSORS_SECRET` and `GROW_CLIMATE_SECRET`. The simulator signs as those two native agents and requests their read sessions from Grow. It does not hold Grow's session-signing secret or an operator key. The source validates distinct keys and the expected installed owner context. Actual secret provisioning, grants, cron state, and hosted progress remain outside this configuration evidence.

## dap-application-sandbox

The [default config](../../apps/sandbox/wrangler.jsonc) and [rollout config](../../apps/sandbox/wrangler.rollout.jsonc) name the same Worker. Both bind the fixed `ApplicationScreenService` entrypoints of `artroom-scope` as `ROOM`, `dap-grow` as `GROW`, and `dap-lending` as `LENDING`.

The sandbox has no session-signing secret, Artifacts binding, R2 bucket, MCP namespace, or analytics dataset in either file. It can reach the configured room services. Its [gateway](../../apps/sandbox/worker.ts) accepts only a mapped origin and allowed route, then requires an identical installation descriptor from the selected room service. Package reads and native checks remain owned by that room.

The default `SCREEN_HOSTS` is empty. The rollout file maps only `grow.inguz.space` item 2 to `GROW`. Browser requests carry only the permitted headers; package asset requests do not forward authorization. Native traffic still passes the room's credential and authority checks.

A separate screen origin separates browser storage from the room origin. It does not give the gateway independent backend namespaces, and it does not make trusted script at the screen's own origin untrusted. These files do not prove current DNS, routes, rollout selection, or live browser behavior.

## dap-home

[`homepage/wrangler.jsonc`](../../homepage/wrangler.jsonc) is a static-assets deployment for `dap.generalbusiness.ai`, with workers.dev enabled. It declares no Worker main, session secret, Artifacts binding, R2 bucket, Durable Object, MCP namespace, or metrics dataset. Links to another service do not give this static Worker that service's authority.

## artroom-jam

[`apps/jam/wrangler.jsonc`](../../apps/jam/wrangler.jsonc) is another static-assets configuration. It names no Worker main or backend bindings. It is included because it is a checked-in deployment, although it was outside the original five-Worker entry-point inventory. Its actual deployment state is not established here.

## Shared resources and finding 3.13

The 21 October security review described room and Grow sharing as finding 3.13, marked **inferred** at the earlier source head. The current checked-in configuration directly names the following shared resources:

| Resource | Configurations that name it |
|---|---|
| Artifacts namespace `artroom-demo` | `artroom-scope`, `dap-grow` |
| R2 bucket `artroom-application-content` | `artroom-scope`, `dap-grow` |
| Analytics dataset `artroom_metrics_v1` | `artroom-scope`, `dap-grow`, `dap-demo` |

For these resources, different Worker names and code pins are not independent namespace isolation. The Artifacts adapter's pinned register and verified destination birth constrain repository operations. Content digest, publisher, release, and installation checks constrain application delivery. Metrics labels distinguish events. These are checks made by code using shared capabilities.

The Workers' local Durable Object classes and the distinct `dap-demo` and `dap-lending` Artifacts namespaces are different boundaries. The shared-resource finding does not imply that all Worker storage is shared. Conversely, separate Scope or MCP objects do not isolate a shared bucket or Artifacts namespace.

Secret equality, provider-side ACLs, actual namespace IDs, bucket public-access settings, effective operator variables, and deployed versions require hosted evidence. None is inferred from names or from a locally `wired` health result. Deployment and any namespace separation remain separately authorized operator work.
