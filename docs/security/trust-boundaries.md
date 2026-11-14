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

The `read-token` act at the destination gives a member a Git read token, and every role holds its grant. The token reads the repository until its own end. Destination19 accepts no duration field and fixes the token lifetime at one hour. That fixed hour applies to Destination19 only. Every other destination version with a `read-token` act, including the newer Destination20, accepts 1 to 24 hours on Cloudflare Artifacts. GitHub fixes its own lifetime at one hour.

`apps/room/wrangler.commons.jsonc` pins Destination16 and binds Artifacts. A key about to be revoked keeps repository read there for up to 24 hours. `apps/room/wrangler.connect.jsonc` pins Destination20, which accepts the same 1 to 24 hours. That file declares no Artifacts binding.

A `compromised` notice closes two routes for the key that it names. Membership tells the directory, and the directory tells the destination. Once the destination applies the notice:

- The key's `read-token` gets `unauthorized`, and the scope writes nothing. This holds while the destination still keeps an observation that shows the key active.
- The credential route answers `forbidden` to the key's session for every token. This covers a token minted before the notice and not yet read, and a token whose mint finishes after the notice.

Each destination keeps the named key in private custody beside its journal, so both refusals survive a restart. The refusals apply at every destination pin and on both hosts. Another key of the same member keeps both routes.

These things stay open:

- **A token already read.** It stays good until its end. The service keeps no plaintext of a token that a member has read, and no `dap` command ends a read token.
- **The time before the notice arrives.** A scope can accept the key's acts for up to 300 seconds after the revocation, so the destination can accept a new `read-token`. A session that the key already holds reads the token, for at most 600 seconds after the revocation. The notice waits in the outbox of membership and then of the directory. Nobody has measured that delay.
- **A key revoked as `retired`, and a removed member.** Neither sends a notice, so the time above applies in full.
- **A lane's workspace token.** The notice reaches no lane, so the lane's credential route still gives the key a workspace token that the key prepared with `hold@2:token`, while its session lasts. That token lasts at most 900 seconds, and it reads and writes one fork. It does not open the room's repository.
- **The key's other acts at the destination.** The notice refuses `read-token` only. Other acts keep the 300-second limit.

A new request with a Destination19 token can read the repository for at most one hour and 600 seconds after revocation, plus clock difference. Historical Artifacts destinations retain a bound of 24 hours and 600 seconds. On GitHub that time is about one hour and 600 seconds. On Artifacts, a download under way ran past its token's end in one run at 30 MB, as [the stolen-key section](#respond-to-a-stolen-key) states. No run shows what a download under way meets on GitHub. No clone has run across a real one-hour token expiry. If expiry falls between requests, the next request fails; a new `dap clone` starts again. Replay cannot check the `read-token` refusal, because no definition states it and a refused act writes no entry.

### A Git read token lists and fetches staged work

A staged commit is a proposal that the room's record names. Any member with a Git read token can list it under `refs/artroom/staged/` with `git ls-remote`, and can fetch it, as any member can read the proposal. So a revoked key's token reaches unmerged work too, for the token's life. A run on Cloudflare Artifacts at dap-demo showed the listing and the fetch. See [the J2 acceptance record](../../notes/implementation/2026-11-01-j2-acceptance.md).

### A founder key that is also the recovery key has no end at membership

In a room whose founder key is also its recovery key, `revoke-key` does not stop the key at membership. The `recovery-key` rule passes that key and checks nothing about its state. The key can keep signing `invite-member`, `invite-key`, `remove-member`, `revoke-key`, and `rotate-recovery`. Each accepted act restarts its read of membership, with no limit. The read is the smaller part of this, because the key keeps the recovery key's authority.

That room ends this only by rotating the recovery key. Only the recovery key can sign `rotate-recovery`, so another admin cannot do it. Anyone who holds the stolen key can also sign it, so the first signer names the next recovery key. After the rotation, membership refuses the revoked old key at once, and the key's read of membership ends 900 seconds after its last entry there.

The other scopes of the room take no recovery act, so the 1200-second bound holds at those scopes.

The `separate-recovery` cohort refuses this shape at `found` and `first-key`, by the name `recovery-key`, but the default install and the `newest` creation cohort do not refuse it, so an installed room or a new room on those pins keeps this route.

### A key on the register's `founders` list keeps `found`

The register is its own authority, and a room's revocation does not reach it. A key on the register's `founders` list can still sign `found` after a room revokes it. Each accepted `found` restarts the key's read of the register, with no limit, and opens a claim and a repository's creation. This route reads nothing of the room.

No command removes a key from the list. `install` alone writes `founders`, the value is fixed, and no register act changes it.

Under policy `open`, any key can sign `found`, so the read grants nothing more.

### A session of a room that a thief made reads the register's whole log

A thief with a key on the `founders` list can sign `found` and take the first key of the new room. The thief can then hold a session of that room's membership. A session of a membership that a claim of the register created reads the register's `history`, `log`, `entry`, and `retained` routes. This read has no signed-read window. It covers every entry of the register, and not only the thief's own claim. It gives no summary and no `items`.

Every member of a room that a claim created holds the same read. Under policy `open`, any key can get this read by claiming a room. No register act ends it, and nobody outside a room can close that room. Replacing `SESSION_SECRET` ends the session, and the room's membership then issues a new one.

The log holds these things:

- The `install` intent: the host, the namespace, the policy, `founders`, and the key that signed it.
- Each `found` intent: the key that signed it, `branch`, `founderHandle`, `recoveryKey`, and any `import` or `archive` field.
- Each claim's `seed`, `founder`, `policy`, `branch`, and `repository`. The `repository` value holds the host, the namespace, the name, and the ID.
- Each attempt's outcome, with the repository's name and ID, and a nonsecret cleanup handle when the host answered with one.
- Each room's directory reference, from the directory's result.

The log holds nothing of a room's content: no lane, no membership, no rules, and no Git object. It holds no token's plaintext. For each other room, it does name the key that claimed the room and that key's handle. It also names the recovery key, the directory, and the repository.

### Respond to a stolen key

Do these steps in each room that enrolled the key:

1. If the key is also the room's recovery key, sign the rotation first with [`dap act`](../cli.md#dap-act), from the config directory that holds the key:
   `dap act rotate-recovery --on membership --target <roster-item> --set key=<new-key>`. The new key must never have been a member's key. No `dap` command prints a new key's ID, so you need another way to compute `<new-key>`. Do this before the revocation, because `dap act` asks for a session first and membership gives a revoked key none.
2. Find the key's item with [`dap items`](../cli.md#dap-items), from another admin's config directory:
   `dap items membership --query <query>`. Query the type `key` and the state `active`.
3. Revoke the key from that config directory:
   `dap act revoke-key --on membership --target <key-item> --set as=compromised`. Membership then tells the directory, and the directory tells the destination. The rule `last-admin-kept` refuses to revoke the last active key of the last admin, except when the recovery key signs.
4. To end the key's sessions before their own end, replace [`SESSION_SECRET`](../deploy.md#settings-the-order-uses). This step ends every member's session in the deployment, so each member asks for a new one.
5. After 300 seconds plus clock difference, read what the key signed with [`dap log`](../cli.md#dap-log) at each scope where it could act:
   `dap log <scope>`.

Use `as=compromised` in step 3 for a stolen key, because `as=retired` sends no notice. The key's signed read ends within 1200 seconds of step 3, plus clock difference. If the key is on the register's `founders` list, it keeps `found` and its read of the register after these steps. To check that the notice arrived, run `dap log destination` from the config directory of step 3. The notice's row reads `delivery tell from directory:<seq>`, and that row names no key. The row does not show whether the destination applied the notice. `dap log` prints the last 20 entries by default, so add `--limit` on a busy destination.

These steps stop new Git read tokens once the notice arrives, and they end no token that the key has read. Treat the repository's content as read until the time that [the token's section](#a-git-read-token-outlasts-the-bound) states, and replace any secret that the repository holds.

On Cloudflare Artifacts, an operator can also end the repository's read tokens through the REST API. A Cloudflare API token with **Artifacts** > **Edit** authorizes the revocation. Do the steps below after step 4, or 600 seconds after step 3 plus clock difference. Until then, the key can take a new token if the notice has not arrived. GitHub's installation pages list no route that revokes another token.

1. List the repository's tokens:
   `GET /artifacts/namespaces/:namespace/repos/:name/tokens`. Cloudflare's page says that each row gives the token's `id`, `scope`, and `state`. The list names no key.
2. Revoke every active `read` token of the repository, because the list cannot show which token the key holds. Revoke each one with:
   `DELETE /artifacts/namespaces/:namespace/tokens/:id`. One of the service's own 120-second reads can fail with an unknown outcome, because that read uses its own `read` token.
3. Ask every member to run [`dap clone`](../cli.md#dap-clone) again.

Revoking by ID has run twice through this REST route, on 1 November 2026. In the first run, an operator revoked one `read` token on a new empty repository. The next `git ls-remote`, 0.1 seconds after the reply, exited 128 with `Invalid or expired token`. Five later tries over 10 seconds answered the same. Listing a repository's tokens has not run, because that run's list command failed with a usage error.

A revocation stops new requests and does not stop a download under way, in one run at 30 MB. In that second run, the operator revoked a 3600-second token 31 seconds into a throttled `git clone`. `git ls-remote` with that token exited 128, and the clone finished about 178 seconds later with the right head. In the same run's other case, a clone finished about 149 seconds after the end of its 60-second token, by arithmetic from the lifetime that the operator asked for. So treat a clone under way as having everything it reached. A buffer between the host and the proxy that took the measurement could hold part of the reply, and nobody measured one.

These cases have not run: a download larger than 30 MB, a longer gap between a token's end and the last byte, a commit published during a download, a download under way on GitHub, and the binding's `revokeToken(id)`.

### What no run has covered

These cases have no run behind them:

- `install`.
- `found` under policy `open`.
- Hosted and application scopes.
- Real clock differences.

## An outage can close a register

A register holds at most 64 live claims. Each `found` opens one claim and one operation, `create-repository`, with three attempts. A claim stays live until a directory's `applied` result reaches it.

An outage of the Git host ends those attempts with no repository, and the claim then stays `pending`. These failures use an attempt:

- A thrown call, a network error, a reply out of form, or a hung request records `unknown`. On GitHub, every error reply records `unknown`, including a 503, a 403 rate limit and a 422.
- On Artifacts, the codes `ALREADY_EXISTS`, `INVALID_INPUT`, `INVALID_REPO_NAME`, `INVALID_TTL` and `NOT_FOUND` record `refused`. Any other code records `unknown`.

The attempts are 1 second and then 2 seconds apart, so a host that fails at once uses all three in about 3 seconds. A host that hangs uses them in about 93 seconds, with 30 seconds for each request. An absent host setting differs: the attempt stays unsent, the claim keeps its place, and the claim completes when the setting returns.

At 64 live claims, the register refuses every later `found` with `type-full`. Stuck claims add up across outages, and these do not free a place:

- The Git host's return.
- A rerun of the claim, which reads and sends nothing new.
- `--again`, which signs a new claim and takes a new place while the old claim keeps its own.
- A restart, or the passing of time. The register has no timed rule.
- Any act. The register's acts are `install` and `found`, so the operator has no act that frees a place.

One thing moves a stuck claim. If an attempt is `unknown` and its own request still answers while the object that sent it lives, that late reply can select the repository, and the claim then finishes. A restart loses that reply.

Who can fill the places depends on the policy. Under `open`, any key can sign `found`, one key can open every claim, and no limit applies to `found`. Under `keys`, only the keys on `founders` can sign it, and one founder can still fill the register. A register on `host: none` opens no attempt, so this limit does not close it this way.

A full register refuses only `found`. Rooms that exist go on. The way out is a new register: see [What closes a register](../deploy.md#what-closes-a-register), which also shows how to count a register's claims from its log.

A test shows this on real scopes on each register pin of `CREATION_COHORTS`, through the production host wiring with a scripted host (`packages/cli/test/failed-claims-close-register.defect.scope.test.ts`). No real outage has run.

## dap-self-host (template)

[`apps/room/wrangler.jsonc`](../../apps/room/wrangler.jsonc) is the neutral
self-host template. It uses the room entry and declares local `SCOPES`,
`SCOPE_INDEX`, `REGISTRIES` and `AGENTS` classes. It starts in enforce mode.
Its Artifacts binding and matching namespace setting name `dap-self-host`.
The template contains no project register, R2 bucket, metrics dataset,
session secret or application trust.

The operator copies it to `wrangler.self-host.jsonc`, provisions distinct
resources and supplies the register and session settings described in
[Run your own service on Cloudflare](../self-host-cloudflare.md). The
placeholder namespace name alone neither provisions a provider namespace nor proves its isolation. MCP opt-in
is absent, and `APPLICATION_SCREEN_HOSTS` is empty.

## artroom-scope

[`apps/room/wrangler.artroom-scope.jsonc`](../../apps/room/wrangler.artroom-scope.jsonc) uses the [room entry](../../apps/room/worker.ts), which exports the Scope classes and serves through [room fetch](../../apps/room/fetch.ts).

It declares its own `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS` bindings. These bindings have no cross-Worker `script_name`. The classes are local to this Worker. The same class name in another Worker does not share Durable Object storage.

Its shared resources are `ARTIFACTS` namespace `artroom-demo`, R2 bucket `artroom-application-content`, and dataset `artroom_metrics_v1`. The operator sets `SESSION_SECRET`, `DEPLOYMENT`, `REGISTER_SCOPE` and `ARTIFACTS_CONFIG`. The file holds none of them.

The MCP namespaces are present, but the file sets neither `MCP_ENABLED` nor `MCP_TOOL_ADDITIONS`. The route needs exact opt-in and both namespaces. An operator can still have set the opt-in on the Worker, so the file alone does not show that the hosted endpoint is off. `APPLICATION_SCREEN_HOSTS` is explicitly empty. The file is marked for existing rooms. Browser Start for new rooms points to `dap-demo`.

The file sets the index to `enforce`. A read of an unknown scope ID reaches no target object, as the [threat model](threat-model.md#invariants-and-their-limits) states. The Worker ran `register` until 11 November 2026. In that mode, an unknown, well-formed scope ID reached `registerKnown()` on a new target object, and constructing the object wrote the full schema. Those objects stay in the namespace. The index lists none of them, so no read reaches one.

## dap-grow

[`apps/room/wrangler.grow.jsonc`](../../apps/room/wrangler.grow.jsonc) uses [worker.grow.ts](../../apps/room/worker.grow.ts). Its `DeployedScope` subclass keeps the generic scope wiring and adds the room archive policy. It does not create a separate archive credential or Artifacts namespace.

Grow declares its own `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS`. It shares `artroom-demo`, `artroom-application-content`, and `artroom_metrics_v1` with `artroom-scope`. The file sets `DEPLOYMENT` to `dap-grow-v1`. The operator sets `SESSION_SECRET`. `REGISTER_SCOPE` in the tracked file selects the current register and must match `ARTIFACTS_CONFIG.registerScope`. An optional `INSTALLED_REGISTER_SCOPES` list preserves the roots that the operator still serves. The file omits `ARTIFACTS_NAMESPACE`, so the Worker uses the default `artroom-demo`.

`APPLICATION_TRUST` lists one application release, publisher and fetch host. `APPLICATION_SCREEN_HOSTS` holds the exact `grow.inguz.space` item 2 screen descriptor. Code applies these checks inside shared content storage. They do not show whether the installation, the DNS mapping or the archive is healthy. The MCP namespaces are declared. The file does not set the hosted opt-in variables.

## dap-lending

[`apps/room/wrangler.lending.jsonc`](../../apps/room/wrangler.lending.jsonc) is marked as historical service configuration. It uses the ordinary room entry and declares local `SCOPES` and `SCOPE_INDEX` classes.

Its Artifacts namespace and matching namespace setting are `dap-lending`, separate from `artroom-demo`. The file pins its register in `REGISTER_SCOPE` and in `ARTIFACTS_CONFIG`. The file declares no application-content R2 bucket, analytics dataset, `REGISTRIES`, or `AGENTS`. With those MCP namespaces absent, the MCP route refuses even if opt-in is requested. `APPLICATION_SCREEN_HOSTS` is empty.

The operator sets `SESSION_SECRET` and `DEPLOYMENT`. The file does not list bindings or settings that the hosted Worker kept from earlier deployments.

## dap-demo

[`apps/room/wrangler.demo.jsonc`](../../apps/room/wrangler.demo.jsonc) uses the ordinary room entry with local `SCOPES`, `SCOPE_INDEX`, `REGISTRIES`, and `AGENTS`. It sets the index to `enforce`. The file's `REGISTER_SCOPE` selects the current register and must match `ARTIFACTS_CONFIG.registerScope`. `INSTALLED_REGISTER_SCOPES` names the roots the operator serves and must include the current register. These tracked settings supply the register values for configuration tests and deployment review.

Its Artifacts namespace is `dap-demo`. It shares dataset `artroom_metrics_v1` with `artroom-scope` and `dap-grow`, but declares no application content bucket. `APPLICATION_TRUST` lists one release, publisher and host. Without the `APPLICATION_CONTENT` binding, the Worker stores and serves no package for that release. `APPLICATION_SCREEN_HOSTS` is empty. The file sets no MCP opt-in variable.

The operator sets `SESSION_SECRET` and keeps `DEPLOYMENT` in a secret binding. When the planner configures Browser Start, `scripts/register-values.mjs` records its full register reference in `DEMO_START_CONFIG`. The script validates the offer against the explicit `--deployment` argument and never adds a tracked variable of that name. If the file already holds `DEPLOYMENT`, the argument must match it. Deployment review must still compare the argument with the deployed version and `/health`, and establish that the Worker carries the reviewed file. Without a valid Start setting, the Worker offers no browser room creation.

## dap-celld-local

[`apps/room/celld/wrangler.json`](../../apps/room/celld/wrangler.json) is the local Worker for celld. Its [entry](../../apps/room/celld/worker.ts) imports the production room Worker. It declares local `SCOPES`, `SCOPE_INDEX`, `REGISTRIES` and `AGENTS` classes, with the same three migration tags as `artroom-scope`.

It declares no Artifacts binding, R2 bucket or analytics dataset, so it shares no Cloudflare resource with another Worker. The file sets `DEPLOYMENT` to `dap-celld-local` and the index to `enforce`. The operator sets `REGISTER_SCOPE` and `SESSION_SECRET` in a private `.dev.vars` file. `APPLICATION_SCREEN_HOSTS` is empty. See [Run the local Worker](../celld.md).

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

The index mode is `enforce`. The explicit creation cohort is Register 23,
Directory 22, Membership 9, Rules 14, Destination 16, Inbox 1, and Commons 1.
`REGISTER_SCOPE` and `ARTIFACTS_CONFIG.registerScope` remain `unplanned`
until the operator binds the retained install plan. Those invalid register
pins keep new creation closed. `ALLOW_OPEN_CREATION` is absent.

`APPLICATION_SCREEN_HOSTS` and `APPLICATION_TRUST` are empty. MCP opt-in
variables are absent from the checked-in file. Retained operator settings
and actual hosted routes still require their own evidence.

The checked-in `DEMO_START_CONFIG` is not a Commons provisioning interface.
The maintained Demo parser recognizes Registers 17 and 26, not this
Register 23 cohort. Follow [the order](../deploy.md#the-order) with
`--cohort commons` and bind only the two operational register fields.
This source describes no deployment, activation, namespace creation, or
hosted W1 result.

## dap-connect

[`apps/room/wrangler.connect.jsonc`](../../apps/room/wrangler.connect.jsonc)
uses the room entry with local `SCOPES`, `SCOPE_INDEX`, `REGISTRIES` and
`AGENTS` classes. It names the private `dap-connect-application-content`
R2 bucket and no Artifacts binding or metrics dataset. These checked-in
names differ from the other Workers' resources.

The file sets `DEPLOYMENT` to `dap-connect` and the index to enforce.
`REGISTER_SCOPE` holds the placeholder `PLANNED_O4_REGISTER_SCOPE`. The
operator replaces it with the ID from an own-agent install plan. The
operator supplies a fresh `SESSION_SECRET`.
The explicit creation cohort is Register 27, Directory 26, Membership 13,
Rules 10, Destination 20 and Inbox 1.

`MCP_ENABLED` is explicitly false. The MCP resource URLs, card origins and
application trust row configure the intended O4 surface but do not open it.
`APPLICATION_SCREEN_HOSTS` is empty. Hosted grants and agent seeds live in
this Worker's MCP objects, not the content bucket.
[Test a hosted connector](../o4-connect.md) gives the deployment and
live-window steps. This file proves neither a live route nor a completed
host test.

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

`artroom-scope` and `dap-grow` share an Artifacts namespace and an R2 bucket. Four Workers share one analytics dataset. The checked-in configuration names these shared resources:

| Resource | Configurations that name it |
|---|---|
| Artifacts namespace `artroom-demo` | `artroom-scope`, `dap-grow` |
| R2 bucket `artroom-application-content` | `artroom-scope`, `dap-grow` |
| Analytics dataset `artroom_metrics_v1` | `artroom-scope`, `dap-grow`, `dap-demo`, `dap-commons` |

For these resources, different Worker names and code pins do not isolate namespaces. The Artifacts adapter's pinned register and verified destination birth limit repository operations. Checks on content digest, publisher, release and installation limit application delivery. Metrics labels tell events apart. Code makes each of these checks with a shared capability.

Each Worker's local Durable Object classes are a separate boundary, and so are the `dap-demo`, `dap-lending` and `dap-commons` Artifacts namespaces. Shared resources do not make all Worker storage shared. Separate Scope or MCP objects do not isolate a shared bucket or Artifacts namespace.

Secret equality, provider access controls, namespace IDs, bucket public-access settings, the operator's variables and deployed versions can be read only from the hosted account. Names and a local `wired` health result do not show them.

## Source

Deployment configuration references checked against main `29926a3a` on
9 November 2026. The revocation and outage sections retain their cited
source and run limits. Sources: [apps/room/wrangler.artroom-scope.jsonc](../../apps/room/wrangler.artroom-scope.jsonc), [apps/room/wrangler.connect.jsonc](../../apps/room/wrangler.connect.jsonc), [apps/room/wrangler.commons.jsonc](../../apps/room/wrangler.commons.jsonc), [apps/room/wrangler.jsonc](../../apps/room/wrangler.jsonc), [apps/room/wrangler.grow.jsonc](../../apps/room/wrangler.grow.jsonc), [apps/room/wrangler.lending.jsonc](../../apps/room/wrangler.lending.jsonc), [apps/room/wrangler.demo.jsonc](../../apps/room/wrangler.demo.jsonc), [apps/room/celld/wrangler.json](../../apps/room/celld/wrangler.json), [examples/grow/wrangler.jsonc](../../examples/grow/wrangler.jsonc), [apps/sandbox/wrangler.jsonc](../../apps/sandbox/wrangler.jsonc), [homepage/wrangler.jsonc](../../homepage/wrangler.jsonc), [apps/jam/wrangler.jsonc](../../apps/jam/wrangler.jsonc).
