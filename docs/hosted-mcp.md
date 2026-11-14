# Run the hosted MCP endpoint

You operate a scope Worker and want to serve the MCP service at `/mcp` to
agents on hosts that cannot run a process. This page covers the endpoint's
settings, OAuth, the control routes, an agent's bearer and retirement, the
two wire revisions, the hosted budgets and the operational metrics.

## The hosted endpoint

The same service, served from the scope Worker at `POST /mcp`, for an agent
on a host that cannot run a process. One Durable Object per agent holds the
agent's key, its bearer, its sessions and its custody. Each agent's
sessions, subscriptions and custody are therefore apart from every other
agent's. One registry per repository creates agents.

### Hosted endpoint settings

The endpoint is off unless `MCP_ENABLED` is exactly `"true"`, both
`REGISTRIES` and `AGENTS` are bound, and `MCP_TOOL_ADDITIONS`,
`MCP_CARD_ORIGINS`, and `MCP_RESOURCE_URLS` are absent or valid. A closed endpoint returns `404`
before reading the request body or addressing either namespace. This applies to the control routes too.

`MCP_TOOL_ADDITIONS` is an optional JSON array of distinct known generic
tool names, at most 1,024 characters and 20 names. Unknown names,
duplicates, a different JSON shape, or an oversized setting close the
endpoint. The accepted names are the twenty generic tools listed in
[What the server lists](mcp.md#what-the-server-lists). By default the endpoint
omits `create`, `install_application`, `credential`, `diff`, `prepare`,
`join` and `record`. To serve one of them, name it in
`MCP_TOOL_ADDITIONS`, for example `["prepare","record"]`. The service mode
still decides whether `actions` and `act` are listed. These settings do
not change the defaults of local `dap mcp`.

`step` and `text` give a hosted agent a full fact and complete text, with the
same member read and byte bounds as the other reads. What a redeemed `join` or
`enrol` shows through `step` depends on the room's Membership pin. On
`platform:membership@1`, `@2`, `@4` and `@5`, it shows a hosted agent's model the
secret. That secret is spent: the invitation refuses it as `invitation-used`. On
`@6` to `@9`, it shows a proof bound to the scope, the invitation and the joining
key, and no secret. Room text that other members wrote reaches the model too, as
data that grants nothing.

A named act call takes a fresh inventory snapshot and applies the same
selection and standing rules as `tools/list`. The endpoint also checks the
membership of the actual target, so standing on scope A cannot carry the
same operation to scope B, where the caller has no grant. The same target
check applies to generic `act`, to `prepare` with a kind, and to view
actions. Generic `install_application` checks the actual target before it
resolves a package or starts custody work. Code-granted, action-null and
unknown-standing cases keep their rules. The native scope still judges
every act.

If `MCP_ENABLED` is unset on a Worker that served hosted agents, their
endpoint closes.

### Cards from an installed application

On its first authenticated HTTP request, a hosted agent reads its room's
active installations through its own native membership session. A complete,
bounded read must select exactly one active declared installation. The
service checks the installation's full references, package IDs, definition
and trusted publisher before it adds card tools. Missing, ambiguous or
unavailable selections leave the ordinary tools in place. The selection
lasts for that HTTP layer. A fresh bearer rotation or an object restart
rebuilds the layer and selects again. Each card read checks that the exact
installation remains active.

The hosted Worker loads immutable bytes from `APPLICATION_CONTENT` under
`APPLICATION_TRUST`. Local `dap mcp` uses the same selection and declared
interpreter, with the package's immutable public Git source. Neither path
runs package code. A host that declares the MCP Apps capability receives
the card tools and their UI metadata. Other hosts receive the text opening
tools without UI metadata or app-only tools. Every card act still uses the
server's own key, custody and native scope judgment.
Explicit resource reads remain available to the same authenticated caller;
resource replies omit UI metadata when the host declares no UI capability.

Ordinary write tools, dynamic act tools, `credential`, and `diff` declare
model-only visibility. The `credential` and `diff` tools retain their
read-only hints. The host must enforce the visibility descriptor. Declared
`view_act` and input tools stay callable from a trusted package's script
for the actions that its view retains, even without a user click. The
server still checks the declared bounds and current authority.
The `credential` tool returns its secret outside `structuredContent`.

`MCP_CARD_ORIGINS` optionally binds remote resource metadata to exact
connector URLs. It accepts at most two distinct host rows and 8,192 UTF-8
bytes. Each row has only `host`, `url` and `domain`. URLs must be canonical
HTTPS URLs at `/mcp`, without credentials or fragments. Different query
strings let two hosts use the same endpoint with different presentation
origins:

```json
[
	{
		"host": "claude",
		"url": "https://example.com/mcp",
		"domain": "c3d80a4ed901ee05b21755a88273b4a4.claudemcpcontent.com"
	},
	{
		"host": "chatgpt",
		"url": "https://example.com/mcp?host=chatgpt",
		"domain": "https://dap-plugin.example.com"
	}
]
```

The example domains are placeholders. For Claude, `domain` is the first
32 hexadecimal digits of SHA-256 over the exact configured connector URL,
followed by `.claudemcpcontent.com`, without a scheme. The hash includes the
query string. For ChatGPT, `domain` is an HTTPS origin unique to the plugin.
See [Claude's domain format](https://claude.com/docs/connectors/building/mcp-apps/getting-started)
and [OpenAI's component metadata](https://developers.openai.com/plugins/reference).

The agent selects metadata by its verified service origin and the request's
exact path and query, including behind an internal HTTP proxy. Unknown URLs
declare no remote domain. Malformed rows, duplicates or an incorrect Claude
hash close the whole hosted endpoint. These rows select presentation only;
they change no signer, grant, tool authority or CSP. Stdio and local loopback
HTTP never read this setting.

### OAuth resources and access tokens

`MCP_RESOURCE_URLS` selects exact connector identities. Its value is a JSON
array of at most eight distinct canonical HTTPS URLs at `/mcp`. Each URL
has at most 2,048 UTF-8 bytes, with no credentials or fragment. The whole
setting has at most 32,800 UTF-8 bytes. Missing configuration selects the
public service origin plus `/mcp`. Existing HTTP services keep static
bearers and advertise no OAuth resource. Every `MCP_CARD_ORIGINS` URL must
also occur in the selected resource list.

For `https://example.com/mcp?connector=claude`, discovery uses
`GET https://example.com/.well-known/oauth-protected-resource/mcp?connector=claude`.
The response names that exact `resource`, the public service origin in
`authorization_servers`, scope `mcp`, and bearer method `header`.
An unknown metadata query returns `404`. A matching path with another
method returns `405`. An unauthenticated `/mcp` request returns `401` with
a `WWW-Authenticate` header naming its resource metadata. An invalid token
also adds `error="invalid_token"`.

An access token has the form `<agent>.<grant>.<secret>`. The object checks
the durable grant, its token digest, and expiry before any authority read.
The grant audience must equal the complete public request URL and one
configured resource, including the exact query. Behind a proxy, the
operator's `PUBLIC_ORIGIN` supplies the origin. Caller-supplied forwarding
headers select no audience.

The object then reads current membership standing: the agent and its key
must be active, its controller must match the grant, and that controller
must be active. A standing answer lasts at most 60 seconds from the start
of the read. Clock rollback and a late authority answer fail closed.
Proven inactive standing ends the grant. Unavailable authority refuses the
request without recording a permanent revocation. Native scopes continue
to judge acts under their existing authority and observation windows.

Each grant owns its legacy sessions and streams. A grant cannot use a
static-bearer session or another grant's session. Open streams refresh
standing before the previous read expires, with a separate hard deadline
while that refresh awaits. Access expiry or failed standing closes those
streams. One agent keeps at most eight grant transport layers. Its four
stream slots, sixteen retained sessions, and control storage budget span
the static bearer and all grants.

### OAuth authorization and consent

The authorization server serves public clients with authorization codes
and PKCE `S256`. It advertises its routes at
`/.well-known/oauth-authorization-server`. OAuth requires an open hosted
endpoint, a configured HTTPS resource, and valid OAuth settings. Invalid
OAuth settings close the authorization routes before namespace lookup.
Existing HTTP services continue to serve static bearers.

The client opens `/oauth/authorize` with its client ID, exact registered
redirect URI, `response_type=code`, `code_challenge`,
`code_challenge_method=S256`, resource, scope `mcp`, and state. The page
checks that query through `/oauth/authorize/context` before it enables
consent. Duplicate security parameters refuse.

Consent uses the room selected in `/page/` and its existing nonextractable
browser signing key. Open and select the room there first. Consent shows
the client name, client-ID host and full ID, callback host, room ID,
agent handle, controller, and grant expiry. A metadata document's name
does not establish its publisher. The page accepts no framing and loads
no client-supplied logo or script.

On Membership 13, an eligible person can create their own agent. The page
retains its original `add-own-agent` and `invite-own-agent-key` requests
and requests a one-hour invitation. On an earlier pin, an admin prepares
an agent-key invitation for the controller. Paste that invitation and
press **Check invitation** before **Allow**. An admin can also use an
invitation for another controller. The server checks the signer's current
admin or controller authority. Hosted credential issuance and use also
require the Agent's current actions to remain a subset of its recorded
controller's current actions. An admin's request does not waive that check.

One controller and client reuse one hosted agent in that room. A fresh
consent grants new access to that agent. The page lists connected clients
and provides **Revoke**. An admin can check another controller's
connections through that controller's invitation; ordinary members can
list only their own connections.

A legacy controller/client mapping whose origin is unknown refuses new
consent with `503` until the cutover retires that room. Creating another
Agent does not repair that same mapping. A distinct new client binding can
progress from provisional to confirmed independently.

The browser keeps each original operation before sending it. An unknown
answer offers **Check invitation**, when Native invitation work remains,
or **Continue original request**. Continue preserves the original Native
requests, operation, and grant meaning. It can renew the signed control's
deadline. It creates no replacement agent. If the server already disclosed
the code, replay returns only `codeShown`; a fresh Allow then reuses the
known agent. The browser journal holds no authorization code or OAuth token.

The callback carries `code`, the original `state`, and issuer `iss`.
Cancel carries `error=access_denied`, state, and issuer, after redirect
validation. The host exchanges the code at `/oauth/token` with its client
ID, exact redirect URI, and verifier. Codes live for 60 seconds and work
once. Access tokens live for one hour. Refresh tokens rotate and end no
later than 30 days after consent. Reusing a spent code within its validity window, or reusing an old
refresh token, ends that grant. The object stores token and code digests. Each agent
admits eight pending or live grants; a ninth ends the oldest.

Token and revocation requests use form encoding and public-client
authentication method `none`. A supplied resource must match the grant.
`/oauth/revoke` accepts an access or refresh token plus client ID. An
unknown or already ended token answers `200`. Revocation and agent
retirement end the grant's streams and sessions immediately. Refresh ends
the old token's streams while preserving that grant's sessions. Other
grants retain their sessions.

Dynamic registration defaults off. With `OAUTH_DYNAMIC_REGISTRATION` unset,
`POST /oauth/register` answers `400` with the fixed JSON error
`{ "error": "invalid_client_metadata" }`, reads no request body, and obtains
no registry object. The authorization-server metadata omits
`registration_endpoint`. HTTPS metadata-document clients still work.

The exact setting `OAUTH_DYNAMIC_REGISTRATION=on` enables registration and
advertises that endpoint. Every other supplied value, including `off`,
closes the OAuth routes as an invalid setting. Remove the setting to disable
registration. Existing registered clients keep their normal expiry and grant
checks when new registration closes. Before a hosted Worker enables dynamic
registration, its operator must add the per-address rate limit required by
the deployment policy.

When enabled, `POST /oauth/register` registers a bounded JSON public-client
record. The Worker keeps at most 1,000 registrations. An unused registration
expires one hour after creation. Anonymous lookup does not renew it. Before checking
capacity, registration removes expired rows. A full table whose rows remain
valid answers `503` with `Retry-After`.

After fresh signed-control and Native authority checks, a grant can protect
its exact registered client for the grant's 30-day maximum lifetime. The
issuer caps that grant at the registry's returned deadline and rechecks
authority after the retention reply. A completed operation replay renews
nothing. Pre-upgrade rows receive one persisted 30-day migration deadline;
reconstructing a registry does not extend it. After expiry, a client must
register again before starting another authorization.

Client IDs can instead name HTTPS client
metadata documents. `OAUTH_CLIENT_METADATA_ORIGINS` admits exact origins;
its defaults are `https://claude.ai` and `https://chatgpt.com`. A custom
JSON array replaces those defaults. The Worker trusts each admitted
origin and its DNS; it does not inspect the socket address. It refuses
unlisted origins before fetch, follows no redirects, sends no credentials,
limits the complete fetch and body read to five seconds and 5 KiB, and
caches a valid document for at most one hour. Its `client_id` must equal
the requested ID exactly.

`OAUTH_REDIRECT_URIS` replaces the default redirect policy with an exact
URI list. The defaults admit `https://claude.ai/api/mcp/auth_callback`,
`https://chatgpt.com/connector_platform_oauth_redirect`, and registered
HTTP loopback paths on `localhost` or `127.0.0.1`, on any port. A redirect
must pass both the deployment policy and the client's registered list.
See [hosted settings](security/settings.md) for configuration bounds.

### Fresh admission and one-time delivery

Bearer issuance and rotation, OAuth code exchange, refresh and access use
fresh role facts for the exact Agent and its recorded controller. A wider
Agent role gives no additional authority. Temporary unavailable facts or a
subset failure withhold admission; they do not turn that temporary result
into a new grant or a permission cache. Key revocation and other definitive
ends keep their existing effects.

The issuer checks the current operation, configuration, candidate, clock and
deadline after its awaited callbacks before returning new plaintext. A
committed mint can therefore finish with a secret-free receipt whose
`codeShown` flag consumes the one-time disclosure. The receipt does not
prove that the caller received plaintext. That receipt permits no second mint
or later plaintext disclosure. A bearer rotation also checks the same HTTP
epoch after graceful cleanup. A reset can withhold the new token even when
the stored candidate did not change.

The Agent releases a private code when it hands that code to the trusted
Registry. The Registry then checks fresh membership and settles its own
rows. It promises no validity at delivery and holds no lease on the code.
Another allowed operation can consume the code or change configuration
before relay. Every subsequent credential use makes its own fresh admission
check. There is no cross-object candidate-lock protocol.

Mutation tools check their current owner and standing again at the actual
custody dispatch callback. A local stop preserves the original signed
request and unresolved custody. It is not a Native refusal or a fabricated
unknown answer. A view's `check-original` action keeps that same pending
identity until an authoritative outcome settles it. Native still judges
every request that reaches it.

Each stored control operation starts with a 4 KiB reservation. The
registry and each Agent have 15 MiB for ordinary control state and a
separate 1 MiB reserve for `retire`. A retention sweep after seven days
past `notAfter` credits only the answer body's bytes. The remaining
control-row charge persists with its tombstone. Passing `notAfter` does
not release that row. One member with one Agent can therefore exhaust the
room's ordinary control budget and leave new `create` and `grant`
operations returning `507`. S10 request `af11896e` owns removal of this
limit through row release and controller shares after S4 and the
identifier cutover. S10 must land before hosted MCP opens for rooms with
unknown members. It does not hold the O4 live window for known members.

### Routes

| Route | Authorization | What it does |
|---|---|---|
| `POST /mcp/agents` | `Control`, action `create` | Creates and enrolls an agent. Body: `{ "link": "<artroom-agent-key:…>" }`, the private agent-key invitation described below. A fresh successful issuance answers `201` with `{ agent, key, handle, member, bearer, bearerExpires }`. The plaintext bearer is returned only by that fresh response; replay returns its secret-free receipt |
| `POST /mcp/agents/<agent>/bearer` | `Control`, action `bearer` | A new static bearer. Its sessions end, its 2025-11-25 streams close with a final event, and its listens complete with their result. OAuth grants keep their own sessions. A fresh operation renews the bearer lifetime. A replay returns the original secret-free receipt and ends nothing |
| `DELETE /mcp/agents/<agent>` | `Control`, action `retire` | Disables the endpoint, erases its seed, and ends every OAuth grant, session, and stream. Empty body or `{ "revoke": <SignedIntent> }`. Answers `200` only after membership shows the key revoked; otherwise `202` with explicit pending recovery. See retirement below |
| `GET /.well-known/oauth-protected-resource/mcp` | None | Exact configured-resource metadata, including the query |
| `GET /.well-known/oauth-authorization-server` | None | Public-client issuer metadata |
| `GET /oauth/authorize` | Existing selected browser key for consent | Consent HTML; `/oauth/consent.js` serves its same-origin script |
| `GET /oauth/authorize/context` | None | Validated authorization query and client metadata; issues no grant |
| `POST /oauth/register` | None | Registers a public client with allowed redirects only when dynamic registration is enabled |
| `POST /oauth/token` | Code and PKCE verifier, or refresh token; client ID | Exchanges or refreshes a grant |
| `POST /oauth/revoke` | Access or refresh token; client ID | Ends that grant |
| `POST /mcp/agents/grant` | `Control`, action `grant` | Enrolls an invited agent and issues its first code, with no static bearer |
| `POST /mcp/agents/<agent>/grant` | `Control`, action `grant` | Issues a fresh code for an existing agent |
| `POST /mcp/agents/connections` | `Control`, action `connections` | Lists eight controller mappings per page. Body: `{ "after": null }`, then the returned cursor; optional `controller` requires that controller or an admin |
| `POST /mcp/agents/<agent>/connections` | `Control`, action `connections` | Lists that agent's active grants. Body: `{}` |
| `POST /mcp/agents/<agent>/revoke-grant` | `Control`, action `revoke-grant` | Ends one grant. Body: `{ "grant": "<grant ID>" }` |
| `POST /mcp` | Static bearer or grant access token | One JSON-RPC request or notification, either revision |
| `GET /mcp` | `Bearer`, `Mcp-Session-Id` | The 2025-11-25 server stream of that session |
| `DELETE /mcp` | `Bearer`, `Mcp-Session-Id` | Ends that 2025-11-25 session |

### Creating an agent: the controller's recipe

Membership 13, selected by the opt-in `own-agent` cohort, also lets an
active person create an agent they control. Its default admin, maintainer,
and member roles hold `membership.own-agent`. `add-own-agent` requires
kind and role `agent`, the signer's controller reference, fewer than eight
active agents under that controller, and an agent role no wider than the
signer's current role. `invite-own-agent-key` requires that active agent
and controller and repeats the role-subset check. Admin signers are exempt
from this Native creation check. Hosted credential admission separately
checks the Agent/controller subset at each use. The own-agent invitation step permits only one live
key per agent, invited and active together, and bounds its expiry to the
next 24 hours after the act time. An expired or later deadline refuses.
An admin or recovery key must revoke an active key before this path
invites its replacement. A pending invitation occupies the slot until it
lapses. Checker and agent roles gain no own-agent action.

These Native steps do not create OAuth grants or expose an MCP invitation
tool. The retained enrollment client accepts their exact Native facts under
Membership 13. The existing `issueInvitation` helper continues to issue
administrative add and invite requests. Consent uses the separate retained
`issueOwnAgentInvitation` helper for ordinary-member issuance. The recipe below describes the existing
administrative path, which earlier Membership pins keep.

Enrollment belongs to the membership. Nothing here grants a permission.

1. An admin adds the agent as a member with its controller, an active
   person: `add-member` with `kind: agent`, the handle and `controller`.
2. An admin invites a key for that member: `invite-key` with the member,
   `kind: agent`, `inviteEnds` and the membership version's invitation
   field. The field is `inviteKey`, the invitation's public key, for
   membership@6, @7 or @8. It is `inviteHash`, the secret's digest, for
   legacy membership@2, @4 and @5.
   The CLI does not expose `dap invite --kind agent-key`; `dap invite
   --device` makes only a device key's link. The retained
issuer is `issueInvitation` in the [CLI API](../packages/cli/src/invitations.ts),
   with `kind: "agent-key"`, the full controller reference and an explicit
   private custody store. It keeps both signed requests before submission,
   checks their native results and encodes the private tagged invitation.
   A client that the controller owns must supply that custody. MCP has no
   invitation tool. Keep the link's secret private.
3. The controller (or an admin) signs a **control request** with their own
   member key and sends `create` with the link as the body. The Worker's
   registry checks the signature, that the request is for this service and
   this membership with its genesis, the body's digest, the deadline
   (at most 15 minutes ahead), and the signer's current authority, read
   from the membership now: an active key of an active member who holds
   `membership.manage` or is the agent's recorded controller. Then it
   records the request under `op` and creates the agent's object.
4. The agent's object makes its key and keeps the signed `enrol` under
   custody before sending it. When the act takes effect, the object reads
   the entry back, confirms that the key is active, and mints the bearer.
   The signed `enrol` for membership@6, @7 or @8 holds the invitation
   proof. Legacy @2, @4 and @5 hold its secret. Custody and the journal
   entry keep those signed fields, and hosted custody archival does not
   delete them (see [Hosted budgets and recovery](#hosted-budgets-and-recovery)).
5. Give the agent host `https://<service>/mcp` and
   `Authorization: Bearer <agent>.<secret>`.

A control request is the canonical JSON of
`{ v: 1, action, service, membership, agent, actor, body, op, notAfter }`,
signed by `actor` under the tag `artroom-mcp-control-1`, and presented as
`Authorization: Control <base64url of the JSON>.<signature>`. `body` is the
SHA-256 digest of the request body. `agent` is null for `create`. `op` is
the caller's identity for the operation, 1 to 128 bytes. The same `op` with
the same request resumes unfinished work or returns its original status
and stable metadata. A completed bearer issuance replays with
`bearerShown: true` and its original `bearerExpires`, never `bearer`.
A later renewal does not change that receipt's expiry. Another request
under the same `op` is refused `409`. The secret-free receipt is kept
seven days past the request's `notAfter`. After that the `op` answers
`409` as stale and is never reused. Authenticated control operations
remove expired receipt bodies. A denied agent `bearer` or `retire` control
does not do that cleanup. A refusal is a fixed body that names a rule,
never a value:

- `403` for a bad signature, another service, another repository or
  genesis, a revoked key, an ended member or a signer without
  authority.
- `400` for a binding that does not match the route, a body digest that
  differs or a deadline out of range.
- `507` when the object's control budget is full.

### Bearer lifetime and one-time delivery

A new bearer expires 30 days after its issuance commits. Ordinary calls,
configuration writes, eviction, replay and stream activity do not extend
that deadline. A fresh signed `bearer` operation, authorized against the
controller's or admin's current membership standing, rotates the token
and starts a new 30-day lifetime. Renewal does not require the old bearer
to authenticate. It invalidates that bearer and uses the existing session
and stream teardown.

Plaintext is returned only from the fresh issuance response. Durable
creation and control answers keep the secret-free receipt, not the token.
If the first response is lost after issuance commits, repeating the same
operation returns the already-shown receipt. Use a new signed `bearer`
operation to obtain a new token. The server cannot recover the old one.
Concurrent duplicate requests can receive at most one plaintext response.
A reset before issuance commits can still resume the same enrollment and
issue once, without creating a second agent or key.

A bearer with no valid stored expiry fails closed. The endpoint infers no
grace period or deadline from activation or an unrelated update. The
operator must renew live hosted-agent tokens, with a signed `bearer`
operation, as a deployment step and record that step. A legacy
receipt has `bearerExpires: null` and grants no further token use.

The migration that scrubs stored answers runs when each agent or registry
object is constructed. Renewing an agent does not activate its
repository's registry. A dormant registry can therefore keep an old raw
creation answer until something activates it. Before you claim complete
cleanup, activate the relevant registries through the control routes, or
record that dormant cleanup remains lazy and incomplete. The endpoint has no
route that lists registries. A request cannot return a stored answer before that
object's migration runs.

After expiry, new requests return `401` at the bearer check, before the
endpoint reads the MCP body. Existing Origin and address-limiting refusals keep their
precedence. Open hosted legacy streams and modern listens close through
the existing HTTP lifecycle, using bounded timer rechecks while needed.
There is no 30-day timer or Durable Object alarm. A call accepted before
expiry finishes under its original custody and operation fences. Transport
expiry does not cancel native authority work or authorize a new attempt.
Legacy session idle expiry is a separate 30-minute rule.

### The bearer

`<agent>.<secret>`: the object holds the secret's digest and compares in
constant time. Missing, malformed, wrong, expired and retired each answer `401` with
no body. Failures that name an agent are counted by that agent per
connecting address: after ten in a minute, the eleventh request from that
address answers `429`, right bearer or not. Each agent's in-memory window
holds at most 4,096 address keys, each at most 64 UTF-8 bytes and ten failure
timestamps. An oversized address or an address already at ten failures is
rejected before bearer authentication. At capacity, a new bounded address
can still authenticate successfully. A failed new address gets `429` if
expired keys cannot free a slot. Active keys are never evicted to make room.

Revocation also belongs to the membership. After an admin's `key.revoke`
or `member.remove`, membership refuses the key's acts at once. Another scope
of the room can still accept them for up to 300 seconds, as
[What a revoked key keeps](security/trust-boundaries.md#what-a-revoked-key-keeps)
states. Retirement preserves that existing grant lifetime.

### Retirement

An admin or the agent's recorded controller may retire it. In one storage
transaction, the endpoint clears its bearer, deletes its sessions, ends its
OAuth access, and erases the private seed. Cached service signers and
transports refuse further signing or dispatch. No later `bearer` or
unfinished `create` revives the agent. Upgrading an already retired hosted
row also erases its old seed.

The body may contain one `revoke` signed intent. Its signer must be the
retiring party, its target the same membership, its act `revoke-key` for
this agent's key item, and its only field `as: "retired"`. The endpoint
checks the item against its verified accepted enrollment record. It stores
the first envelope and submits those exact bytes. A retry never signs or
substitutes a revoke. Membership still decides whether the signer may
revoke the key. The endpoint never signs a revoke with the agent's seed.

A `200` answer with `retired: true` means membership shows the key revoked
and the endpoint holds no seed. A `202` answer with `pending: true` and
`retired: false` means the endpoint is disabled and the seed is gone, but
it has not observed the recorded revoke. The answer names the current
reason. An ordinary controller without `membership.manage` can disable
its agent, but cannot complete the recorded revocation alone.

Without an admitted envelope, or after refusal, expiry, or an uncertain
reply, retirement stays pending. An authorized retry resubmits only the
retained envelope while it remains valid. A different envelope cannot
replace it. A `membership.manage` holder or the recovery key can revoke
the agent's key independently. The next authorized retire retry completes
when membership shows that recorded revoke, including a revoke another
request wrote. A changed body under the same control `op` still fails the
existing fingerprint check.

An expired envelope or a permanent refusal never permits a replacement
signature. An unavailable enrollment record supplies no guessed key item.
No new membership pin or creation family belongs to this change.
Self-revocation remains a candidate for a later membership revision.

### The two revisions over HTTP

The endpoint serves exactly `2025-11-25` and `2026-07-28`. It refuses any
other `MCP-Protocol-Version` with `400` before it dispatches anything, on
every method. The revision is selected before the method is handled: from
the header when present, else from the request's own content (a `_meta`
protocol version, or `initialize`) or from the recorded version of the
session the request names. Then:

| Version, as selected | `POST` | `GET` | `DELETE` |
|---|---|---|---|
| header `2026-07-28` | modern: `_meta` must name the same version, `Mcp-Method` must equal the method, `Mcp-Name` the tool on `tools/call` (`=?base64?…?=` for a name that is not header-safe); else `400` with `-32020`; an unknown method `404` with `-32601`; a notification `202` | `405` with `Allow: POST`; no session consulted | `405`; nothing ended |
| header `2025-11-25` | legacy: `initialize` mints a session; any other request needs `Mcp-Session-Id` (`400` without, `404` unknown); `Mcp-Method` and `Mcp-Name` are ignored | session required: `400` without, `404` unknown, else the stream | session required; else the session ends |
| header absent, `_meta` names `2026-07-28` | `400` with `-32020`: that revision requires the header | | |
| header absent, `initialize` | legacy | | |
| header absent, `Mcp-Session-Id` names a live session | that session's revision | the stream | the session ends |
| header absent, otherwise | `400` | `405` | `405` |

The endpoint refuses a batch on every request. A body over 1 MiB answers
`413`, and an `Origin` header answers `403`. An agent has at most 16
sessions. A 17th `initialize` is accepted and then ends the oldest
session within that credential, and a refused `initialize` ends nothing.
When other credentials occupy the agent's sixteen-session allowance,
a new credential's `initialize` returns `507` without evicting their sessions.
An agent has at most 4
open streams, counting legacy streams and listens together. A 5th answers
`409`. Every byte bound here counts UTF-8
bytes. A legacy HTTP session expires after 30 minutes without a client
request. The server checks expiry before an authenticated legacy request
uses or creates a session. It runs no separate expiry timer. A client
request that reaches its session, including `GET`, renews the idle time.
Server notifications do not. Expiry removes the stored session,
closes its stream with a final event, and leaves its ID answering `404`.
Initialize again to obtain a new ID. Origin or bearer refusals and the
stateless modern revision neither renew nor expire legacy sessions.

A session's activity time survives the object's eviction. A stored row
from before idle tracking uses its creation time until its next request.
Its open stream does not survive eviction. When the stream reconnects, the
server tells once more of a list change that the client has not listed.

### Hosted budgets and recovery

| Budget | Bound | When full |
|---|---|---|
| Custody, per agent | 1 GiB | A new act whose completion need (its record up to 2 MiB plus a 512 KiB segment row) cannot be reserved is refused `full` before anything is signed. A resubmit, repeat step or settle that cannot reserve is refused before anything is dispatched. Retained answers stay readable. |
| One identity's history | 64 MiB | Further attempts on that identity refuse `full`. Its retained answer stays readable. |
| Control, per registry and per agent | 16 MiB, the last 1 MiB for `retire` alone. One total covers every persisted row: each operation (4 KiB reserved, its answer charged beyond that), static and grant session rows (declared capabilities at most 16 KiB), grant rows (at most 4,096 UTF-8 bytes), and the agent's configuration. | `create` and `bearer` refuse `507`. A session cannot be issued (`507`, error `-32001`). A root cannot be added. `retire` still succeeds. If the reserve is also used up, the admin's `key.revoke` ends the agent's authority in the scope, whatever the hosted objects hold. |

Read-only `connections` calls reserve no operation row and consume no
permanent control-budget place. They still make fresh admission checks and
spend request-window allowance. Existing rows retain their original
custody and accounting rules.

The public control adapter first charges the trusted transport address,
then the verified key. Each address has separate 120-call windows for
control and cleanup. Global IPv6 addresses share a `/64` window; missing
or invalid addresses share one bucket. A denied address reaches no key
admission or allocation.

Each admission object permits 120 control calls per verified key in 60
seconds. Cleanup gets a
separate 120-call window. Each purpose holds at most 4,096 live identity
counters and one shared overflow counter. Expiry reclaims these counters;
reconstruction preserves them. An exhausted window returns `429`. Unsafe
or backward clocks return `503` without resetting the window. Independent
cleanup capacity does not make cleanup or storage unlimited.

The Worker verifies signature, service and route before unknown-membership
index rejection or legacy registration. A signed unknown membership gets
`404` before body or client-registry work. For an admitted route, the Worker
bounds and hashes the body, then checks the signed deadline and key window
before client resolution and the Hosted handoff. Each Hosted object repeats
its own admission before authority checks and effects.

Anonymous `/oauth/authorize/context` reads spend an address window before
client resolution. IPv6 uses its `/64`; missing or malformed addresses share
one bounded bucket. A semantically invalid successful client-document reply
can enter a finite 60-second cache keyed by its URL and copied redirect
policy. Network failures, timeouts and non-200 replies do not enter that
negative cache.

The endpoint retains custody records. Retirement erases the signing seed
and deletes sessions. Terminal custody records move to an archive
table in the same object. A storage failure rolls its transaction back and
settles nothing, and the next `settle` writes the receipt. To recover an
agent whose budget is full, `retire` it and create a new agent. The
endpoint has no export action.

## Operational metrics

`dap mcp` writes `dap.metric {json}` lines to stderr. Stdout remains the
stdio protocol. Each JSON record has `schema: "mcp-metrics-v1"` and the
point's `indexes`, `blobs` and `doubles`. Hosted agent objects write the
same point map through the existing optional METRICS binding. These
observations grant no authority and contain no signed input, credential,
invitation, bearer, scope index or caller-supplied request identity.

The point has no index, nine blobs and six doubles:

| Blob | Meaning and allowed values |
|---|---|
| 1 | `tools-list`, `tool-call`, `custody`, or the terminal `metric-dropped` summary |
| 2 | The configured public deployment, at most 128 UTF-8 bytes. `local` by default in the CLI, `unknown` for an invalid context |
| 3 | Worker version UUID in lowercase, or `unknown` |
| 4 | One of the fixed names below. A summary uses `list` |
| 5 | `ok`, `refused`, `error` or `unavailable`. A summary uses `dropped` |
| 6 | `none`, an allowed reason below, or a persisted custody phase. A summary uses `summary` |
| 7 | Server-minted request ID, sixteen lowercase hexadecimal characters, or `none` |
| 8 | `none`. No caller trace is copied into this map |
| 9 | Exactly `mcp-metrics-v1` |

The fixed names are `list`, `room`, `inspect`, `create`, `join`, `prepare`,
`items`, `steps`, `step`, `record`, `sends`, `text`, `wait`, `settle`,
`credential`, `diff`, `actions`, `act`, `install_application`,
`application_installation`, and hosted `enrol`. Act tool names derived
from declarations are outside this first map. Their events are dropped
and counted as invalid fields. Their names are not copied or redacted.
The tools continue to run normally.

The native reason allowlist is:

```
revision-moved alias duplicate-relation required-unset scope-full
bad-intent misaddressed expired scope-refused unknown-act bad-field
no-item final fact-mismatch unauthorized guard-failed capability-refused
slot-full type-full entry-too-large send-unresolved unknown-message
unsupported-definition bad-input dependency-unavailable busy clock-behind
scope-provisional guard-incomplete authority-unavailable unavailable
rate-limited idempotency-mismatch not-found wrong-genesis forbidden
history-unavailable too-large sessions-unavailable bad-request replayed behind
```

The server reasons are `exception`, `shape`, `stale-descriptor`, `restart`,
`transport`, `custody`, `credential`, `diff`, `target`, `unknown-tool`, `read`,
`conflicting`, `full`, `locked`, `unreadable`, `terminal` and `unkept`.
Record phases are `prepared`, `sent`, `unknown`, `accepted`, `refused`,
`mismatch` and `settled`. Preparation-step phases are `prepared`, `sent`,
`unknown` and `answered`.

| Kind | Doubles 1 through 6 |
|---|---|
| `tools-list` | 1, duration in ms, tools on this page, page bytes, read attempts, generation changed (0 or 1) |
| `tool-call` | 1, duration in ms, read attempts, native page attempts, whole service result bytes, 0 |
| `custody` | 1, 0, 0, 0, 0, subject (0 for record, 1 for preparation step). Blob 6 is its new persisted phase |
| `metric-dropped` | 1, loss bitmask, events lost, 0, 0, 0 |

Numbers are whole values from zero through 2,147,483,647. List bytes count
the JSON `{ tools, nextCursor? }`. Call bytes count the service result
before wire-specific framing. A generation change means that this listed
page's generation differs from the service's last listed generation,
not a count of notifications sent. Read attempts include session requests
and signed-read fallbacks. Page attempts count item, history, outbox and
log page requests. Hosted enrollment also counts its own direct authority
reads. Counts belong to each concurrent operation, not a shared delta.

A custody event follows a successful persisted phase change. An observed
answer whose write failed emits no completed phase. Record and step
phases remain distinct. Invalid fields are dropped before a point is
retained. Loss bits are 1 for budget, 2 for invalid fields and 16 for
overflow. Each operation retains at most 248 phase events, one completion
and one summary, within 250 points. The server does not wait for
reporters. A failed write cannot replace a tool result, and a summary
cannot prove its own presence. The deployment check excludes this map when judging scope
turn coverage.

## Source

This page holds text moved from [The MCP service](mcp.md) on 10 November
2026, with its words kept. This revision did not compare it with source.
The page it came from carried the stamp "Checked against main `b0af01d2` on
1 November 2026". The OAuth sections arrived after that date, in
`eb43ac23` on 3 November 2026. Sources: [packages/mcp/src/hosted.ts](../packages/mcp/src/hosted.ts), [packages/mcp/src/http.ts](../packages/mcp/src/http.ts), [packages/mcp/src/hosted-tools.ts](../packages/mcp/src/hosted-tools.ts), [packages/scope/src/worker-mcp.ts](../packages/scope/src/worker-mcp.ts).
