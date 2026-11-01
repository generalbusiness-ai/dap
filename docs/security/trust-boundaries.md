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

## What a revoked key keeps

Membership refuses a revoked key at once. Another scope of the room learns of the revocation only when it next reads membership. This section lists what the key keeps until then, and what ends it.

### A signed read ends within 1200 seconds, plus clock difference

A revoked key's signed read of a room's scope ends within 1200 seconds of the revocation, plus the difference between membership's clock and the reading scope's clock. Nobody has measured a real clock difference.

| Part | Length | What sets it |
|---|---|---|
| A scope's observation of membership | Up to 300 seconds | A scope keeps one observation of each key in memory. It reuses the observation until the observation's age reaches 300 seconds. No delivery changes the observation. A `compromised` notice reaches the directory and the destination, and the directory still holds the observation. |
| The signed-read window | 900 seconds | Each entry that the key signs and the scope accepts restarts the key's read of that scope. The read ends 900 seconds after the time of the key's latest such entry. |

A scope can still accept the key's acts during those 300 seconds. This matters more than the read, because an accepted act changes the room.

The bound rests on these facts:

- A refused act stores no entry, so it does not restart the read.
- A resent act that already landed stores no new entry, so it does not restart the read.
- The scope's clock sets an entry's time. A key cannot sign a later time.
- If membership does not answer, the scope still ends the key's acts when the observation's age reaches 300 seconds. The answer is `authority-unavailable`, and the scope writes nothing.
- A scope that restarts holds no observation, so it reads membership again.
- The key's read of a lane that it opened during the 300 seconds ends at the same bound.

### A revoked key reads its own trail and the live summary

During the window, the key can read these things at a scope where it signed an entry:

- The scope's summary, with all live items. The directory's summary includes the items of other members' lanes.
- `query-items`, for live states.
- Entry 0.
- Its own entries.
- Filtered history and log, limited to the entries above and the entries that come from them.
- The summary of a lane that it opened.
- The retained inputs that its readable entries name by digest, such as its own texts and a lane's definition.

The key cannot read these things:

- Another key's entry, unless that entry comes from one of the key's own.
- Final items.
- The outbox.
- A scope where it signed no entry in the window, such as another member's lane, the rules scope, or the destination.
- Retained text that none of its readable entries names.

These lists cover signed reads. A Git read token reads the repository by another route, and [it outlasts these limits](#a-git-read-token-outlasts-the-bound).

### A session ends by its own time

[Sessions](../../packages/scope/src/sessions.ts) check nothing about the key. A session that a revoked key already holds stays good until its `ends`. That time is at most 600 seconds after issue on membership's clock, plus the difference between membership's clock and the reading scope's clock. Membership issues no new session to a revoked key.

Replacing `SESSION_SECRET` ends every session of the deployment at once. It does not end signed reads, because a signed read uses the key's signature and not the secret.

### A Git read token outlasts the bound

The `read-token` act at the destination gives a member a Git read token, and every role holds its grant. The token reads the repository until its own end. On Cloudflare Artifacts the member asks for 1 to 24 hours. On GitHub the lifetime is GitHub's own, one hour.

A revocation ends no token:

- A token that the key read before the revocation stays good until its end. The `compromised` notice at the destination aborts a publication that the key is behind, and it ends no token.
- A scope can accept the key's acts for up to 300 seconds, so the destination can accept a new `read-token`. A session that the key already holds reads the new token once.
- Membership issues no new session to a revoked key. A token that the key minted and did not read before its session's end stays unread.

The key must read a new token while its session lasts, which is at most 600 seconds after the revocation. So the repository stays readable for at most 24 hours and 600 seconds after the revocation on Cloudflare Artifacts, plus clock difference. On GitHub that time is about one hour and 600 seconds. No `dap` command ends a read token, and the service keeps no plaintext of a token that a member has read.

### A founder key that is also the recovery key has no end at membership

In a room whose founder key is also its recovery key, `revoke-key` does not stop the key at membership. The `recovery-key` rule passes that key and checks nothing about its state. The key can keep signing `invite-member`, `invite-key`, `remove-member`, `revoke-key`, and `rotate-recovery`. Each accepted act restarts its read of membership, with no limit. The read is the smaller part of this, because the key keeps the recovery key's authority.

That room ends this only by rotating the recovery key. Only the recovery key can sign `rotate-recovery`, so another admin cannot do it. Anyone who holds the stolen key can also sign it, so the first signer names the next recovery key. After the rotation, membership refuses the revoked old key at once, and the key's read of membership ends 900 seconds after its last entry there.

The other scopes of the room take no recovery act, so the 1200-second bound holds at those scopes.

### A key on the register's `founders` list keeps `found`

The register is its own authority, and a room's revocation does not reach it. A key on the register's `founders` list can still sign `found` after a room revokes it. Each accepted `found` restarts the key's read of the register, with no limit, and opens a claim and a repository's creation. This route reads nothing of the room.

No command removes a key from the list. `install` alone writes `founders`, the value is fixed, and no register act changes it.

Under policy `open`, any key can sign `found`, so the read grants nothing more.

### Respond to a stolen key

Do these steps in each room that enrolled the key:

1. If the key is also the room's recovery key, sign the rotation first with [`dap act`](../cli.md#the-commands), from the config directory that holds the key:
   `dap act rotate-recovery --on membership --target <roster-item> --set key=<new-key>`. The new key must never have been a member's key. No `dap` command prints a new key's ID, so you need another way to compute `<new-key>`. Do this before the revocation, because `dap act` asks for a session first and membership gives a revoked key none.
2. Find the key's item with [`dap items`](../cli.md#the-commands), from another admin's config directory:
   `dap items membership --query <query>`. Query the type `key` and the state `active`.
3. Revoke the key from that config directory:
   `dap act revoke-key --on membership --target <key-item> --set as=compromised`. Membership then tells the directory, and the directory tells the destination. The rule `last-admin-kept` refuses to revoke the last active key of the last admin, except when the recovery key signs.
4. To end the key's sessions before their own end, replace [`SESSION_SECRET`](../deploy.md#settings-and-secrets). This step ends every member's session in the deployment, so each member asks for a new one.
5. After 300 seconds plus clock difference, read what the key signed with [`dap log`](../cli.md#the-commands) at each scope where it could act:
   `dap log <scope>`.

The key's signed read ends within 1200 seconds of step 3, plus clock difference. If the key is on the register's `founders` list, it keeps `found` and its read of the register after these steps.

These steps end no Git read token. Treat the repository's content as read until the time that [the token's section](#a-git-read-token-outlasts-the-bound) states, and replace any secret that the repository holds.

### What no run has covered

These cases have no run behind them:

- `install`.
- `found` under policy `open`.
- Hosted and application scopes.
- Real clock differences.

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

## dap-commons

[`apps/room/wrangler.commons.jsonc`](../../apps/room/wrangler.commons.jsonc)
uses the separate [Commons entry](../../apps/room/worker.commons.ts) with
the shared room handlers. Its `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and
`AGENTS` bindings have no cross-Worker `script_name`. Equal class names
do not share Durable Object storage across these Worker namespaces.

The configuration names the `dap-commons` Artifacts namespace on the same
Artifacts host as Demo. It declares no application-content R2 bucket and
shares the `artroom_metrics_v1` dataset with room, Grow, and Demo. Namespace
names in this file do not prove provider-side IDs or ACLs.

`DEPLOYMENT` is `dap-commons`, and `PUBLIC_ORIGIN` names its workers.dev
origin. The operator supplies `SESSION_SECRET`. Its custody and uniqueness
remain separate from those public labels. Read sessions still require the
deployment, exact Membership reference, allowed read, and expiry checks.

The index mode is `enforce`. The explicit creation family is Register 23,
Directory 22, Membership 9, Rules 14, Destination 16, Inbox 1, and Commons 1.
`REGISTER_SCOPE` and `ARTIFACTS_CONFIG.registerScope` remain `unplanned`
until the planner binds the retained install plan. Those invalid register
pins keep new creation closed. `ALLOW_OPEN_CREATION` is absent.

`APPLICATION_SCREEN_HOSTS` and `APPLICATION_TRUST` are empty. MCP opt-in
variables are absent from the checked-in file. Retained operator settings
and actual hosted routes still require their own evidence.

The checked-in `DEMO_START_CONFIG` is not a Commons provisioning interface.
The maintained Demo parser recognizes Register 17, not this Register 23
family. Follow the
[Commons CLI order](../deploy.md#provision-the-commons-worker) and bind only
the two operational register fields. This source describes
no deployment, activation, namespace creation, or hosted W1 result.

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
| Analytics dataset `artroom_metrics_v1` | `artroom-scope`, `dap-grow`, `dap-demo`, `dap-commons` |

For these resources, different Worker names and code pins are not independent namespace isolation. The Artifacts adapter's pinned register and verified destination birth constrain repository operations. Content digest, publisher, release, and installation checks constrain application delivery. Metrics labels distinguish events. These are checks made by code using shared capabilities.

The Workers' local Durable Object classes and the distinct configured
`dap-demo`, `dap-lending`, and `dap-commons` Artifacts namespaces are
different boundaries. The shared-resource finding does not imply that all
Worker storage is shared. Conversely, separate Scope or MCP objects do not
isolate a shared bucket or Artifacts namespace.

Secret equality, provider-side ACLs, actual namespace IDs, bucket public-access settings, effective operator variables, and deployed versions require hosted evidence. None is inferred from names or from a locally `wired` health result. Deployment and any namespace separation remain separately authorized operator work.
