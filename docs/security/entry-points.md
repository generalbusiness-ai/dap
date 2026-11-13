# Worker entry points and gates

Each table below lists the HTTP routes of one Worker configuration in this
repository, and of the local celld project. For each route, the table names
its gate class, the work and the state written before the gate, its bounds,
and its outbound calls. The tables describe the source, not the settings of
a deployed Worker. [How the inventory is checked](#how-the-inventory-is-checked)
says what a test holds the tables to.

## Gate classes

A gate class names the weakest proof that can obtain the route's protected
result. It does not say that the gate runs before object activation or
before all other work. For `none`, the work and state columns cover the
whole request.

- **none**: no caller identity or membership proof. Publication and package
  trust checks can still restrict the bytes served.
- **creation**: the Worker's parentless serving check
  (`creation-admission.ts`), then the native genesis judgment. The serving
  check accepts or refuses the request before it reaches a scope. Creation,
  child lineage and the census read the register pin through
  `readRegisterScope`. `REGISTER_SCOPE` is the primary setting, and a valid
  Artifacts-only pin is a legacy fallback. Supplied settings must parse and
  agree. A deployed request needs a pin even when `ALLOW_OPEN_CREATION` is
  exactly `true`. Without a pin, the request fails before object selection.
  Without that explicit opening, the signed install must name the pinned
  register. New installs also check host availability and the host-none
  cohort before lookup. Without `DEPLOYMENT`, the local API stays open
  unless supplied pin settings are malformed or conflict.
- **self-signed**: a valid signature, without a current membership grant.
  Ordinary signed reads also need an eligible local or causal signing
  history. A settlement needs the exact signed intent that took effect.
  These checks do not establish membership. The six signed-read routes also
  accept scoped sessions for their ordinary complete reads. The census
  route instead requires the pinned register's founding install key, and
  accepts no session or causal-window substitute.
- **membership**: a signature and the operation's observed authority or
  membership protocol. Join and enrollment use the pinned cohort's
  invitation rules. Snapshot reads require the requested job's current
  configured checker.
- **session**: an authenticated deployment read session, scoped to its
  membership and allowed reads. The credential route also binds the holder
  key.
- **admin**: a read session whose issued reads include the admin
  operation, derived from `membership.*` authority.
- **bearer**: the hosted Agent's bearer, compared through its digest and
  expiry, or a grant access token with an exact configured audience and live
  grant. Both require fresh Agent and controller role facts and the current
  role subset on every request. A stream lease grants no new request.
- **oauth**: a matching authorization code and PKCE verifier, or a matching
  refresh token. Revocation requires a known access or refresh secret for
  its client. A success response for an unknown token makes no change.
- **control**: a signed MCP control request, bound to its action, body,
  service, deadline, repository, and current member authority.

Membership 13 adds `membership.own-agent` to the default admin, maintainer,
and member roles. Native own-agent acts require an active person and bind
the agent's controller to the signer. Both add and invite compare the
agent role against the signer's current role; admin signers are exempt.
The add step refuses a ninth active agent under that controller. The
own-agent invitation step permits one live key per agent, counting invited
and active keys together. Its expiry must fall after the act time and
within 24 hours. These checks run in the Membership turn over its current state. They grant no
HTTP route or OAuth token. The opt-in creation cohort changes no earlier
Membership pin or deployment creation default.

## How to read a row

The columns are the route and method, the gate class, the work before the
gate, the state written before the gate, the bounds, and the outbound
calls. Refusals and unsupported methods are not additional routes.

`:scope` is a scope ID. Other colon names denote one path segment. `*`
denotes the matched path family, including paths that the family later
refuses. The `/site/*` family includes directory redirects, `versions`, and
`:directory/:ref/*path`. The `/applications/*` family validates
`:directory/:item/:presentation/*asset`, including its redirect and
`_/context`. Brand names come from `apps/room/brand/assets.ts`.

The scope rows use these shared descriptions:

- **Activation**: a well-formed scope ID selects a Durable Object before
  the gate. Construction can create SQLite tables and indexes, and schedule
  signer maintenance. It runs no legacy migration step in the read itself.
- **Restart retry**: the legacy read methods, sessions, stream, settlement,
  credential, and snapshot call `ScopeObject.#first` before their gate.
  That call can schedule sealed parked or accepted operations again. Their
  writes and configured host calls can run in the background even when the
  scope refuses the caller's read. The caller gains no new effect.
- **Legacy read preparation**: session MAC and membership-reference work,
  or signed-read verification and a walk of the retained cause chain. Some
  walks reach other scope objects. The route's read gate still restricts
  the result. Query and projection use their own bounded flights.
- **Read bounds**: `READ_BOUNDS` in
  [reads.ts](../../packages/scope/src/reads.ts), with the constants in the
  contract. Pagination bounds the output, not all earlier activation or
  chain work.
- **Turn bounds**: `PROPOSED_BOUNDS` in
  [bounds.ts](../../packages/contract/src/bounds.ts). Submit reads standing
  before application provenance, receiver policy and foreign facts. A
  definite denial of an ordinary grant refuses before those reads. Native
  grant marks retain their fallback checks, and the commit checks authority
  again. An act with a native grant mark, such as `found` or `join`, and an
  act whose standing read came back null fetch up to `usesPerEntry` foreign
  facts before the judge refuses them. Only an alarm drains timed work.
  Remote standing admits at most 4,096 signing keys per run, including
  once-only and failed reads. Rule
  expression evaluation follows the grant check. Public parentless creation and
  signed reads first use the serving windows below. Joins keep their
  membership-local window for failed addresses, and also count failures of
  verified keys without an address.

Every room request first runs measured-request setup, a limit on URL bytes,
and refusal of credentials in the URL. Measurement can write operational
metrics. Scope invocation instrumentation can keep bounded request-index
control data. The tables describe route work in addition to that setup.
HTTP POST bodies on the scope API are read as JSON within 1 MiB before
object dispatch. A verified creation can keep its genesis even when the
scope refuses its founding act. Credential, session, projection, and query
answers carry `no-store`.

The opt-in repository-binding cohort uses these existing routes. Its
Membership grants `destination.bind-repository` to admins by default.
Later-bound GitHub destinations also need an exact operator-reviewed
destination incarnation, repository, and branch in `GITHUB_REPOSITORY_BINDINGS`.
With an independent read credential, the provider checks the stable ID and
App installation before either token mint. Explicit `installationReads`
instead validates the installation, mints a one-ID Contents-read token,
and verifies the repository name and stable ID before Git or a publication
token. This mode refuses historical destinations. Historical repositories
recorded at birth retain their existing independent-read authority path.

The three room configurations name [worker.ts](../../apps/room/worker.ts),
which re-exports the scope classes and takes its default fetch from
[apps/room/fetch.ts](../../apps/room/fetch.ts). That fetch composes health,
MCP, application screens, demo offers, sites, the room page, brand files,
and scope routes. The default export of `packages/scope/src/worker.ts` is
not the deployed room fetch. The local celld shim re-exports the same
production room entry, bindings and migration history, and adds no route
or caller authority.

The Durable Object binding also has internal namespace methods that are not
HTTP routes: `jobState`, `workSourceState`, `stageSnapshot`,
`nativeBirthByName` and `archiveItem`. [Route notes](#route-notes)
describes them.

## Serving windows

The fixed `ScopeIndex` owns the serving counters in memory. Creation
reserves its trusted edge address before the HTTP body is read or parsed,
and before the signature is checked. The in-process creation API makes the
same reservation before it copies the signed value. The fixed owner then
verifies custody and charges the key; neither phase grants native authority.
An invalid signature charges no claimed key. A closed native admission can
still consume its serving attempt, but selects no target or scope state.

Creation and register `found` each count 10 attempts per verified key and
30 per trusted edge address per hour, in separate tables. Signed reads
count 240 per key and 600 per address per minute. Each table holds at most
8192 identity windows plus one shared overflow window. An address past its
limit creates no key window. At capacity, new identities share the bounded
overflow window instead of being refused merely because the table is full.
Overflow uses the lower key/address limit and charges a request once. The
HTTP address reservation identifies its owner incarnation and overflow
window. Only a matching still-live window skips the later key charge;
expiry or restart charges the new window normally. The private creation
path carries this identity; neither a public API argument nor a body supplies
that receipt. No live window is evicted. Only expired rows leave a table.

The creation table holds 8,192 windows for an hour. One address key opens
at most 31 of them: its own window and 30 key windows. About 265 distinct
IPv4 addresses or IPv6 /64s fill the table. After that, every new identity
shares 10 creations an hour in the overflow window until rows expire.
Callers that already hold windows keep them. A sender with one IPv6 /48
holds 65,536 /64s, so it can reach that state.

Every `found` submit charges its address in the `found` table. An intent
over 1 MiB, or one that fails the strict parse, charges the address and
then reaches its target, which refuses it.

The public Site uses a separate minute window: 240 attempts per canonical
address key, at most 4096 identity windows and one shared 240-attempt
overflow window. Valid IP addresses always use `addressKey`, including its
IPv6 /64 grouping. Missing addresses share `missing`; bounded non-IP local
transport labels use distinct `opaque:` keys and the same capacity and
overflow bounds. They cannot alias canonical `address:` IP keys.

The public edge supplies `CF-Connecting-IP`. The sandbox passes that value
as an explicit service argument to the room Worker. A browser cannot choose
the platform's edge address or substitute a synthetic transport label.
Direct service calls and hosted in-process calls supply no address unless
the trusted caller explicitly provides one; forwarded headers alone count
for nothing. Object restart or eviction resets memory, so these are not
durable global counters. Invalid settings or a missing serving binding fail
closed. Rate-limited creation, `found`, and signed reads answer 429. Join,
session issuance, session reads, and internal verified child delivery keep
their existing rules. The four nonsecret `SERVING_*` overrides control the
creation and read limits; `found` uses the creation limits in its own table.
No public counter, index, admin, or status route exists.

The join, creation, found, signed-read, Site and MCP bearer-failure windows use
[`addressKey`](../../packages/bytes/src/address.ts). It canonicalizes
address spellings before counting. IPv6 zones do not distinguish clients.

| Address form | Counter key |
|---|---|
| IPv4, including IPv4-mapped IPv6 | Full IPv4 address, prefixed `v4:` |
| Link-local IPv6 (`fe80::/10`) | All 128 bits, prefixed `v6l:` |
| Unique-local IPv6 (`fc00::/7`) | All 128 bits, prefixed `v6u:` |
| Other IPv6 | First 64 bits, prefixed `v6:` |

The IPv6 `/64` grouping limits address rotation in routable space. Local
clients keep separate windows within one subnet. MCP checks the raw
address's 64-character and 64-UTF-8-byte bounds before canonicalization.
Missing and invalid MCP addresses share one failure window and do not
bypass the limit. The [public Site window](#public-site-address-window)
has its own policy.

## Limits of these tables

The tables record source reachability with valid required settings. They
do not say whether a deployed Worker has a setting, whether an optional
feature is on, or whether a particular public room exists. The pre-gate
work, state, and outbound columns come from source review. The inventory
test checks the route, method and gate class of every row against the
Worker matchers, and checks that every column is present. It does not
check the column descriptions. Changes to runtime settings also need the
[settings](settings.md) and deployment review.

## dap-self-host

Configuration: [apps/room/wrangler.jsonc](../../apps/room/wrangler.jsonc).

Entry: `apps/room/worker.ts` → `apps/room/fetch.ts`. Hosted MCP is
reachable when both committed namespaces are bound, `MCP_ENABLED` is
exactly `"true"`, and `MCP_TOOL_ADDITIONS` is absent or valid. Application
redirects require `APPLICATION_SCREEN_HOSTS`. Sandbox rendering also
requires `APPLICATION_TRUST`. Demo offers require `DEMO_START_CONFIG`.
Missing or invalid settings refuse those families.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; explicit common pin or legacy host selection; cached readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded HTML with one nonsecret Start boolean | None | Fixed embedded assets and boolean substitution | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/canonical address key/minute at fixed index; 4096 windows plus bounded overflow; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | Address serving reservation before body read/parse/signature; then JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; signature verified; `intent.actor` equals the session's key; `notAfter` ahead and within the intent bound; `kind` at most 256 bytes; digest new or same bytes; caps | Activation; one row outside history, then the object's alarm; on a full object, a bounded drop of rows of members no longer active or with no active key | 1 MiB body; 64 rows and 16 MiB per member; 1 GiB per object, except for a request to this scope; a row goes seven days past `notAfter` | None |
| `GET /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; rows of the session's member only | Activation | The row cap bounds the page; no bodies | None |
| `GET /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation | One row, 1 MiB at most | None |
| `DELETE /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation; deletes one row and leaves the wake | One row | None |
| `POST /v1/scopes/:scope/acts` | `self-signed` | JSON and signature; fixed found key/address window before target lookup; ordinary membership or native grant-mark checks; standing before receiver and foreign reads; native grant-mark fallback and final commit checks | Activation, found/join serving counters and restart retry of already sealed work; no request-triggered timed drain | 1 MiB body; turn bounds; remote standing: 4096 keys per run; found: 10/key and 30/address/hour; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Authority scope RPC; receiver and foreign reads after the ordinary-grant precheck; configured host effects only from sealed operations |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation before the final capability and grant decision | Activation and restart retry of already sealed work; no preparation-triggered timed drain | 1 MiB body; turn and capability-step bounds; remote standing: 4096 keys per run | Authority scope RPC before grant decision; driver and dispatch may retry already sealed operations even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification; `stage: true` also checks Native admission and current source | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; stage Rules/key/source reads within 10 s; proof 262144 bytes, objects 16 MiB/4096, wire 24 MiB | Job and membership RPC; stage room Rules and source reads; Git reads after current checks; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; read preparation and holder-key check before unpublished-mode refusal or credential lookup | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |
| `GET /.well-known/oauth-protected-resource/mcp` | `none` | Explicit hosted enablement, valid tool/resource/card settings, canonical public origin, and exact configured path and query | None | At most eight resource URLs, each 2048 UTF-8 bytes; 32800-byte setting; no request body or namespace lookup | None |
| `GET /.well-known/oauth-authorization-server` | `none` | Hosted opt-in, HTTPS resources and OAuth policy; static issuer metadata | None | Bounded URL; no body or authority read | Registry stub selection; no RPC |
| `GET, HEAD /oauth/authorize` | `none` | Hosted policy; same-origin consent assets with frame-ancestors none | None | Static bundle; no request body | None |
| `GET, HEAD /oauth/consent.js` | `none` | Hosted policy; same-origin consent script | None | Static bundle; no request body | None |
| `GET /oauth/authorize/context` | `none` | Address window before client resolution; then exact client, redirect, audience, state and S256 checks | Client registry schema, durable address counters and bounded document caches; no caller identity proof | 120/address key/minute; 4096 keys plus overflow; client document 5 KiB and five seconds; successful cache at most one hour; invalid-result cache 60 seconds | Public-client admission and resolution RPC; explicitly admitted metadata origins only |
| `POST /oauth/register` | `none` | Hosted policy and exact `OAUTH_DYNAMIC_REGISTRATION=on`; bounded public-client JSON and redirect checks | Client registry schema and one public registration | 5 KiB body; at most 1000 clients per Worker | Public-client registry RPC |
| `POST /oauth/token` | `oauth` | Form bounds, client and token binding; issuer checks code with PKCE or refresh secret, then current standing | Agent schema before secret validation; token digests after verification | 8 KiB body; eight grants; eight-second code and 28-second refresh standing deadlines | Agent RPC; fresh Native membership read |
| `POST /oauth/revoke` | `oauth` | Form bounds; known access or refresh secret and client ID before ending a grant; unknown tokens return 200 without effect | Agent schema before token check; grant, stream and session cleanup after proof | 8 KiB body; 16 MiB control budget | Agent RPC |
| `POST /mcp/agents/grant` | `control` | Header, action, service and signature before membership lookup; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Registry and Agent schemas, request counters and client caches before current authority; creation reservation, Native enrollment and grant after authority | 64 KiB body; signed control windows; one-hour own invitation; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/:agent/grant` | `control` | Header, action, service and signature; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Client and Agent schemas, request counters and client caches before current authority; owned mapping reservation and grant after authority | 64 KiB body; signed control windows; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/connections` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current active signer; another controller requires admin authority | Registry schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight mappings per page | Public-client admission, Registry and current Native actor-facts RPC |
| `POST /mcp/agents/:agent/connections` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority | Agent schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight grants | Public-client admission, Agent and current Native authority RPC |
| `POST /mcp/agents/:agent/revoke-grant` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent revocation | Agent schema and durable request counters before current authority; control reservation, grant, stream and session cleanup after authority | 64 KiB body; separate cleanup windows; operation-custody budget | Public-client admission, Agent and current Native authority RPC |
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, Agent ID parse, activation and address failure window; bearer digest and expiry or exact grant audience and live secret; fresh same-head Agent and controller role facts and subset on every request | Agent and grant schemas; in-memory failure counters and stream metadata; actual revocation can end a grant, while subset or unavailable denial does not | 10 bad secrets/address key/minute; 4096 keys; 64-byte address; 1 MiB body after admission; five-second role reads; stream standing lease at most 60 seconds; 16 sessions and four streams | Agent and current Native role-facts RPC; admitted tools can call scopes and configured Git hosts |
| `POST /mcp/agents` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current admin or controller authority; current role subset before bearer issuance | Registry and Agent schemas and durable request counters before current authority; creation reservation, Native enrollment and bearer issuance after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Registry, Agent and current Native authority RPC; authorized enrollment |
| `DELETE /mcp/agents/:agent` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent retirement | Agent schema and durable request counters before current authority; retained retirement reservation and cleanup after authority | 64 KiB body; separate cleanup windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC; retained retirement cleanup |
| `POST /mcp/agents/:agent/bearer` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority; current role subset before mint and disclosure | Agent schema and durable request counters before current authority; bearer rotation and retained receipt after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC |

## artroom-scope

Configuration: [apps/room/wrangler.artroom-scope.jsonc](../../apps/room/wrangler.artroom-scope.jsonc).

Entry: `apps/room/worker.ts` → `apps/room/fetch.ts`. Hosted MCP is
reachable when both committed namespaces are bound, `MCP_ENABLED` is
exactly `"true"`, and `MCP_TOOL_ADDITIONS` is absent or valid. Application
redirects require `APPLICATION_SCREEN_HOSTS`. Sandbox rendering also
requires `APPLICATION_TRUST`. Demo offers require `DEMO_START_CONFIG`.
Missing or invalid settings refuse those families.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; explicit common pin or legacy host selection; cached readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded HTML with one nonsecret Start boolean | None | Fixed embedded assets and boolean substitution | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/canonical address key/minute at fixed index; 4096 windows plus bounded overflow; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | Address serving reservation before body read/parse/signature; then JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; signature verified; `intent.actor` equals the session's key; `notAfter` ahead and within the intent bound; `kind` at most 256 bytes; digest new or same bytes; caps | Activation; one row outside history, then the object's alarm; on a full object, a bounded drop of rows of members no longer active or with no active key | 1 MiB body; 64 rows and 16 MiB per member; 1 GiB per object, except for a request to this scope; a row goes seven days past `notAfter` | None |
| `GET /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; rows of the session's member only | Activation | The row cap bounds the page; no bodies | None |
| `GET /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation | One row, 1 MiB at most | None |
| `DELETE /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation; deletes one row and leaves the wake | One row | None |
| `POST /v1/scopes/:scope/acts` | `self-signed` | JSON and signature; fixed found key/address window before target lookup; ordinary membership or native grant-mark checks; standing before receiver and foreign reads; native grant-mark fallback and final commit checks | Activation, found/join serving counters and restart retry of already sealed work; no request-triggered timed drain | 1 MiB body; turn bounds; remote standing: 4096 keys per run; found: 10/key and 30/address/hour; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Authority scope RPC; receiver and foreign reads after the ordinary-grant precheck; configured host effects only from sealed operations |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation before the final capability and grant decision | Activation and restart retry of already sealed work; no preparation-triggered timed drain | 1 MiB body; turn and capability-step bounds; remote standing: 4096 keys per run | Authority scope RPC before grant decision; driver and dispatch may retry already sealed operations even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification; `stage: true` also checks Native admission and current source | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; stage Rules/key/source reads within 10 s; proof 262144 bytes, objects 16 MiB/4096, wire 24 MiB | Job and membership RPC; stage room Rules and source reads; Git reads after current checks; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; read preparation and holder-key check before unpublished-mode refusal or credential lookup | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |
| `GET /.well-known/oauth-protected-resource/mcp` | `none` | Explicit hosted enablement, valid tool/resource/card settings, canonical public origin, and exact configured path and query | None | At most eight resource URLs, each 2048 UTF-8 bytes; 32800-byte setting; no request body or namespace lookup | None |
| `GET /.well-known/oauth-authorization-server` | `none` | Hosted opt-in, HTTPS resources and OAuth policy; static issuer metadata | None | Bounded URL; no body or authority read | Registry stub selection; no RPC |
| `GET, HEAD /oauth/authorize` | `none` | Hosted policy; same-origin consent assets with frame-ancestors none | None | Static bundle; no request body | None |
| `GET, HEAD /oauth/consent.js` | `none` | Hosted policy; same-origin consent script | None | Static bundle; no request body | None |
| `GET /oauth/authorize/context` | `none` | Address window before client resolution; then exact client, redirect, audience, state and S256 checks | Client registry schema, durable address counters and bounded document caches; no caller identity proof | 120/address key/minute; 4096 keys plus overflow; client document 5 KiB and five seconds; successful cache at most one hour; invalid-result cache 60 seconds | Public-client admission and resolution RPC; explicitly admitted metadata origins only |
| `POST /oauth/register` | `none` | Hosted policy and exact `OAUTH_DYNAMIC_REGISTRATION=on`; bounded public-client JSON and redirect checks | Client registry schema and one public registration | 5 KiB body; at most 1000 clients per Worker | Public-client registry RPC |
| `POST /oauth/token` | `oauth` | Form bounds, client and token binding; issuer checks code with PKCE or refresh secret, then current standing | Agent schema before secret validation; token digests after verification | 8 KiB body; eight grants; eight-second code and 28-second refresh standing deadlines | Agent RPC; fresh Native membership read |
| `POST /oauth/revoke` | `oauth` | Form bounds; known access or refresh secret and client ID before ending a grant; unknown tokens return 200 without effect | Agent schema before token check; grant, stream and session cleanup after proof | 8 KiB body; 16 MiB control budget | Agent RPC |
| `POST /mcp/agents/grant` | `control` | Header, action, service and signature before membership lookup; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Registry and Agent schemas, request counters and client caches before current authority; creation reservation, Native enrollment and grant after authority | 64 KiB body; signed control windows; one-hour own invitation; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/:agent/grant` | `control` | Header, action, service and signature; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Client and Agent schemas, request counters and client caches before current authority; owned mapping reservation and grant after authority | 64 KiB body; signed control windows; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/connections` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current active signer; another controller requires admin authority | Registry schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight mappings per page | Public-client admission, Registry and current Native actor-facts RPC |
| `POST /mcp/agents/:agent/connections` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority | Agent schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight grants | Public-client admission, Agent and current Native authority RPC |
| `POST /mcp/agents/:agent/revoke-grant` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent revocation | Agent schema and durable request counters before current authority; control reservation, grant, stream and session cleanup after authority | 64 KiB body; separate cleanup windows; operation-custody budget | Public-client admission, Agent and current Native authority RPC |
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, Agent ID parse, activation and address failure window; bearer digest and expiry or exact grant audience and live secret; fresh same-head Agent and controller role facts and subset on every request | Agent and grant schemas; in-memory failure counters and stream metadata; actual revocation can end a grant, while subset or unavailable denial does not | 10 bad secrets/address key/minute; 4096 keys; 64-byte address; 1 MiB body after admission; five-second role reads; stream standing lease at most 60 seconds; 16 sessions and four streams | Agent and current Native role-facts RPC; admitted tools can call scopes and configured Git hosts |
| `POST /mcp/agents` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current admin or controller authority; current role subset before bearer issuance | Registry and Agent schemas and durable request counters before current authority; creation reservation, Native enrollment and bearer issuance after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Registry, Agent and current Native authority RPC; authorized enrollment |
| `DELETE /mcp/agents/:agent` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent retirement | Agent schema and durable request counters before current authority; retained retirement reservation and cleanup after authority | 64 KiB body; separate cleanup windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC; retained retirement cleanup |
| `POST /mcp/agents/:agent/bearer` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority; current role subset before mint and disclosure | Agent schema and durable request counters before current authority; bearer rotation and retained receipt after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC |

## dap-demo

Configuration: [apps/room/wrangler.demo.jsonc](../../apps/room/wrangler.demo.jsonc).

Entry: `apps/room/worker.ts` → `apps/room/fetch.ts`. The committed private
namespaces include both hosted MCP bindings. Those routes require
`MCP_ENABLED` exactly `"true"` and an absent or valid `MCP_TOOL_ADDITIONS`.
The Start offer requires `DEMO_START_CONFIG`, its configured origin and the
exact register root. Application redirects, sandbox rendering and
publication still require their settings and authority checks.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; explicit common pin or legacy host selection; cached readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded HTML with one nonsecret Start boolean | None | Fixed embedded assets and boolean substitution | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/canonical address key/minute at fixed index; 4096 windows plus bounded overflow; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | Address serving reservation before body read/parse/signature; then JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; signature verified; `intent.actor` equals the session's key; `notAfter` ahead and within the intent bound; `kind` at most 256 bytes; digest new or same bytes; caps | Activation; one row outside history, then the object's alarm; on a full object, a bounded drop of rows of members no longer active or with no active key | 1 MiB body; 64 rows and 16 MiB per member; 1 GiB per object, except for a request to this scope; a row goes seven days past `notAfter` | None |
| `GET /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; rows of the session's member only | Activation | The row cap bounds the page; no bodies | None |
| `GET /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation | One row, 1 MiB at most | None |
| `DELETE /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation; deletes one row and leaves the wake | One row | None |
| `POST /v1/scopes/:scope/acts` | `self-signed` | JSON and signature; fixed found key/address window before target lookup; ordinary membership or native grant-mark checks; standing before receiver and foreign reads; native grant-mark fallback and final commit checks | Activation, found/join serving counters and restart retry of already sealed work; no request-triggered timed drain | 1 MiB body; turn bounds; remote standing: 4096 keys per run; found: 10/key and 30/address/hour; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Authority scope RPC; receiver and foreign reads after the ordinary-grant precheck; configured host effects only from sealed operations |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation before the final capability and grant decision | Activation and restart retry of already sealed work; no preparation-triggered timed drain | 1 MiB body; turn and capability-step bounds; remote standing: 4096 keys per run | Authority scope RPC before grant decision; driver and dispatch may retry already sealed operations even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification; `stage: true` also checks Native admission and current source | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; stage Rules/key/source reads within 10 s; proof 262144 bytes, objects 16 MiB/4096, wire 24 MiB | Job and membership RPC; stage room Rules and source reads; Git reads after current checks; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; read preparation and holder-key check before unpublished-mode refusal or credential lookup | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |
| `GET /.well-known/oauth-protected-resource/mcp` | `none` | Explicit hosted enablement, valid tool/resource/card settings, canonical public origin, and exact configured path and query | None | At most eight resource URLs, each 2048 UTF-8 bytes; 32800-byte setting; no request body or namespace lookup | None |
| `GET /.well-known/oauth-authorization-server` | `none` | Hosted opt-in, HTTPS resources and OAuth policy; static issuer metadata | None | Bounded URL; no body or authority read | Registry stub selection; no RPC |
| `GET, HEAD /oauth/authorize` | `none` | Hosted policy; same-origin consent assets with frame-ancestors none | None | Static bundle; no request body | None |
| `GET, HEAD /oauth/consent.js` | `none` | Hosted policy; same-origin consent script | None | Static bundle; no request body | None |
| `GET /oauth/authorize/context` | `none` | Address window before client resolution; then exact client, redirect, audience, state and S256 checks | Client registry schema, durable address counters and bounded document caches; no caller identity proof | 120/address key/minute; 4096 keys plus overflow; client document 5 KiB and five seconds; successful cache at most one hour; invalid-result cache 60 seconds | Public-client admission and resolution RPC; explicitly admitted metadata origins only |
| `POST /oauth/register` | `none` | Hosted policy and exact `OAUTH_DYNAMIC_REGISTRATION=on`; bounded public-client JSON and redirect checks | Client registry schema and one public registration | 5 KiB body; at most 1000 clients per Worker | Public-client registry RPC |
| `POST /oauth/token` | `oauth` | Form bounds, client and token binding; issuer checks code with PKCE or refresh secret, then current standing | Agent schema before secret validation; token digests after verification | 8 KiB body; eight grants; eight-second code and 28-second refresh standing deadlines | Agent RPC; fresh Native membership read |
| `POST /oauth/revoke` | `oauth` | Form bounds; known access or refresh secret and client ID before ending a grant; unknown tokens return 200 without effect | Agent schema before token check; grant, stream and session cleanup after proof | 8 KiB body; 16 MiB control budget | Agent RPC |
| `POST /mcp/agents/grant` | `control` | Header, action, service and signature before membership lookup; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Registry and Agent schemas, request counters and client caches before current authority; creation reservation, Native enrollment and grant after authority | 64 KiB body; signed control windows; one-hour own invitation; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/:agent/grant` | `control` | Header, action, service and signature; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Client and Agent schemas, request counters and client caches before current authority; owned mapping reservation and grant after authority | 64 KiB body; signed control windows; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/connections` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current active signer; another controller requires admin authority | Registry schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight mappings per page | Public-client admission, Registry and current Native actor-facts RPC |
| `POST /mcp/agents/:agent/connections` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority | Agent schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight grants | Public-client admission, Agent and current Native authority RPC |
| `POST /mcp/agents/:agent/revoke-grant` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent revocation | Agent schema and durable request counters before current authority; control reservation, grant, stream and session cleanup after authority | 64 KiB body; separate cleanup windows; operation-custody budget | Public-client admission, Agent and current Native authority RPC |
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, Agent ID parse, activation and address failure window; bearer digest and expiry or exact grant audience and live secret; fresh same-head Agent and controller role facts and subset on every request | Agent and grant schemas; in-memory failure counters and stream metadata; actual revocation can end a grant, while subset or unavailable denial does not | 10 bad secrets/address key/minute; 4096 keys; 64-byte address; 1 MiB body after admission; five-second role reads; stream standing lease at most 60 seconds; 16 sessions and four streams | Agent and current Native role-facts RPC; admitted tools can call scopes and configured Git hosts |
| `POST /mcp/agents` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current admin or controller authority; current role subset before bearer issuance | Registry and Agent schemas and durable request counters before current authority; creation reservation, Native enrollment and bearer issuance after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Registry, Agent and current Native authority RPC; authorized enrollment |
| `DELETE /mcp/agents/:agent` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent retirement | Agent schema and durable request counters before current authority; retained retirement reservation and cleanup after authority | 64 KiB body; separate cleanup windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC; retained retirement cleanup |
| `POST /mcp/agents/:agent/bearer` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority; current role subset before mint and disclosure | Agent schema and durable request counters before current authority; bearer rotation and retained receipt after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC |

## dap-commons

Configuration: [apps/room/wrangler.commons.jsonc](../../apps/room/wrangler.commons.jsonc).

Entry: `apps/room/worker.commons.ts` → `apps/room/worker.ts` →
`apps/room/fetch.ts`. This separate physical entry shares the room handler and
its authority gates. The configuration pins the Commons cohort and the
`dap-commons` Artifacts namespace. Its three register fields hold `unplanned`,
so source reachability does not establish a usable register or deployment.
The operator provisions the namespace, secrets and register after landing.
Hosted MCP still requires its existing opt-in. The retired demo-offer route
creates nothing. Existing Workers keep their configurations and registers.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; explicit common pin or legacy host selection; cached readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded HTML with one nonsecret Start boolean | None | Fixed embedded assets and boolean substitution | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/canonical address key/minute at fixed index; 4096 windows plus bounded overflow; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | Address serving reservation before body read/parse/signature; then JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; signature verified; `intent.actor` equals the session's key; `notAfter` ahead and within the intent bound; `kind` at most 256 bytes; digest new or same bytes; caps | Activation; one row outside history, then the object's alarm; on a full object, a bounded drop of rows of members no longer active or with no active key | 1 MiB body; 64 rows and 16 MiB per member; 1 GiB per object, except for a request to this scope; a row goes seven days past `notAfter` | None |
| `GET /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; rows of the session's member only | Activation | The row cap bounds the page; no bodies | None |
| `GET /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation | One row, 1 MiB at most | None |
| `DELETE /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation; deletes one row and leaves the wake | One row | None |
| `POST /v1/scopes/:scope/acts` | `self-signed` | JSON and signature; fixed found key/address window before target lookup; ordinary membership or native grant-mark checks; standing before receiver and foreign reads; native grant-mark fallback and final commit checks | Activation, found/join serving counters and restart retry of already sealed work; no request-triggered timed drain | 1 MiB body; turn bounds; remote standing: 4096 keys per run; found: 10/key and 30/address/hour; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Authority scope RPC; receiver and foreign reads after the ordinary-grant precheck; configured host effects only from sealed operations |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation before the final capability and grant decision | Activation and restart retry of already sealed work; no preparation-triggered timed drain | 1 MiB body; turn and capability-step bounds; remote standing: 4096 keys per run | Authority scope RPC before grant decision; driver and dispatch may retry already sealed operations even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification; `stage: true` also checks Native admission and current source | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; stage Rules/key/source reads within 10 s; proof 262144 bytes, objects 16 MiB/4096, wire 24 MiB | Job and membership RPC; stage room Rules and source reads; Git reads after current checks; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; read preparation and holder-key check before unpublished-mode refusal or credential lookup | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |
| `GET /.well-known/oauth-protected-resource/mcp` | `none` | Explicit hosted enablement, valid tool/resource/card settings, canonical public origin, and exact configured path and query | None | At most eight resource URLs, each 2048 UTF-8 bytes; 32800-byte setting; no request body or namespace lookup | None |
| `GET /.well-known/oauth-authorization-server` | `none` | Hosted opt-in, HTTPS resources and OAuth policy; static issuer metadata | None | Bounded URL; no body or authority read | Registry stub selection; no RPC |
| `GET, HEAD /oauth/authorize` | `none` | Hosted policy; same-origin consent assets with frame-ancestors none | None | Static bundle; no request body | None |
| `GET, HEAD /oauth/consent.js` | `none` | Hosted policy; same-origin consent script | None | Static bundle; no request body | None |
| `GET /oauth/authorize/context` | `none` | Address window before client resolution; then exact client, redirect, audience, state and S256 checks | Client registry schema, durable address counters and bounded document caches; no caller identity proof | 120/address key/minute; 4096 keys plus overflow; client document 5 KiB and five seconds; successful cache at most one hour; invalid-result cache 60 seconds | Public-client admission and resolution RPC; explicitly admitted metadata origins only |
| `POST /oauth/register` | `none` | Hosted policy and exact `OAUTH_DYNAMIC_REGISTRATION=on`; bounded public-client JSON and redirect checks | Client registry schema and one public registration | 5 KiB body; at most 1000 clients per Worker | Public-client registry RPC |
| `POST /oauth/token` | `oauth` | Form bounds, client and token binding; issuer checks code with PKCE or refresh secret, then current standing | Agent schema before secret validation; token digests after verification | 8 KiB body; eight grants; eight-second code and 28-second refresh standing deadlines | Agent RPC; fresh Native membership read |
| `POST /oauth/revoke` | `oauth` | Form bounds; known access or refresh secret and client ID before ending a grant; unknown tokens return 200 without effect | Agent schema before token check; grant, stream and session cleanup after proof | 8 KiB body; 16 MiB control budget | Agent RPC |
| `POST /mcp/agents/grant` | `control` | Header, action, service and signature before membership lookup; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Registry and Agent schemas, request counters and client caches before current authority; creation reservation, Native enrollment and grant after authority | 64 KiB body; signed control windows; one-hour own invitation; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/:agent/grant` | `control` | Header, action, service and signature; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Client and Agent schemas, request counters and client caches before current authority; owned mapping reservation and grant after authority | 64 KiB body; signed control windows; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/connections` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current active signer; another controller requires admin authority | Registry schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight mappings per page | Public-client admission, Registry and current Native actor-facts RPC |
| `POST /mcp/agents/:agent/connections` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority | Agent schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight grants | Public-client admission, Agent and current Native authority RPC |
| `POST /mcp/agents/:agent/revoke-grant` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent revocation | Agent schema and durable request counters before current authority; control reservation, grant, stream and session cleanup after authority | 64 KiB body; separate cleanup windows; operation-custody budget | Public-client admission, Agent and current Native authority RPC |
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, Agent ID parse, activation and address failure window; bearer digest and expiry or exact grant audience and live secret; fresh same-head Agent and controller role facts and subset on every request | Agent and grant schemas; in-memory failure counters and stream metadata; actual revocation can end a grant, while subset or unavailable denial does not | 10 bad secrets/address key/minute; 4096 keys; 64-byte address; 1 MiB body after admission; five-second role reads; stream standing lease at most 60 seconds; 16 sessions and four streams | Agent and current Native role-facts RPC; admitted tools can call scopes and configured Git hosts |
| `POST /mcp/agents` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current admin or controller authority; current role subset before bearer issuance | Registry and Agent schemas and durable request counters before current authority; creation reservation, Native enrollment and bearer issuance after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Registry, Agent and current Native authority RPC; authorized enrollment |
| `DELETE /mcp/agents/:agent` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent retirement | Agent schema and durable request counters before current authority; retained retirement reservation and cleanup after authority | 64 KiB body; separate cleanup windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC; retained retirement cleanup |
| `POST /mcp/agents/:agent/bearer` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority; current role subset before mint and disclosure | Agent schema and durable request counters before current authority; bearer rotation and retained receipt after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC |

## dap-grow

Configuration: [apps/room/wrangler.grow.jsonc](../../apps/room/wrangler.grow.jsonc).

Entry: `apps/room/worker.grow.ts` → `apps/room/worker.ts` →
`apps/room/fetch.ts`. The Grow wrapper forwards the same default HTTP
handler. Hosted MCP is reachable when both committed namespaces are bound,
`MCP_ENABLED` is exactly `"true"`, and `MCP_TOOL_ADDITIONS` is absent or
valid. Application redirects require `APPLICATION_SCREEN_HOSTS`. Sandbox
rendering also requires `APPLICATION_TRUST`. Demo offers require
`DEMO_START_CONFIG`. Missing or invalid settings refuse those families.

The wrapper also gives its Durable Object class explicit archive wiring.
For public journals that the archive accepts, object activation and sealed
entries schedule bounded archive work through the existing alarm. That work
can read checked births and the accepted directory and destination items,
keep retry and mark bookkeeping, mint a short-lived Artifacts write token,
send Git objects, and read back the ref. It uses the archive bounds and the
per-pass allowance. These background effects can follow an activation even
when the scope refuses the caller's HTTP read. They give the caller no
archive access. Register and membership journals are excluded. Generic and
lending entries do not enable this wiring, and production retained floors
are off.

Birth proofs, target item replies, pin SQL payloads, migration reply
buffers and parent-frontier ownership reserve their full read ceiling
before I/O. A successful bounded read settles metadata and proportional
input work to the bytes received. An unavailable or failed read stays
charged in full. Operation counts and the original deadline do not change.
Fixed processing fees and transport input-work tariffs keep their charges.
Migration reply buffers settle against completed bounded POST response
bytes. GET advertisements keep their separate fixed fee. A transport byte
count does not certify validation: the archive owner settles only after the
pack, object type, size and original authority and deadline checks pass.

The pass diagnostic reports `reservationCosts`. `metadataReserved` is the
metadata reserved before refunds. `metadataSettled` is the current charge,
with outstanding reservations at their full ceilings, and
`unsettledMetadata` names that outstanding part. `settlementRefusal` is
`none`, `invalid-received` or `unknown-reservation`. These values and the
observation's net site attribution grant no authority.

The internal `archiveItem` namespace port has no HTTP route. Its raw helper
takes trusted host input. The complete target birth walk and the accepted
binding supply its authority boundary. New archive passes publish bounded
descriptive replay anchors in their manifests. These lists grant no trust.
The alarm floor writer requires complete confirmed publication coverage
before it offers deletion, and legacy receipts count as uncovered. Pending
marks bind their exact public scope identities for retry, including the
reference-only Rules identity that the directory checks in room mode. This
metadata replaces no source or host check.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; explicit common pin or legacy host selection; cached readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded HTML with one nonsecret Start boolean | None | Fixed embedded assets and boolean substitution | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/canonical address key/minute at fixed index; 4096 windows plus bounded overflow; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | Address serving reservation before body read/parse/signature; then JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; signature verified; `intent.actor` equals the session's key; `notAfter` ahead and within the intent bound; `kind` at most 256 bytes; digest new or same bytes; caps | Activation; one row outside history, then the object's alarm; on a full object, a bounded drop of rows of members no longer active or with no active key | 1 MiB body; 64 rows and 16 MiB per member; 1 GiB per object, except for a request to this scope; a row goes seven days past `notAfter` | None |
| `GET /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; rows of the session's member only | Activation | The row cap bounds the page; no bodies | None |
| `GET /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation | One row, 1 MiB at most | None |
| `DELETE /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation; deletes one row and leaves the wake | One row | None |
| `POST /v1/scopes/:scope/acts` | `self-signed` | JSON and signature; fixed found key/address window before target lookup; ordinary membership or native grant-mark checks; standing before receiver and foreign reads; native grant-mark fallback and final commit checks | Activation, found/join serving counters and restart retry of already sealed work; no request-triggered timed drain | 1 MiB body; turn bounds; remote standing: 4096 keys per run; found: 10/key and 30/address/hour; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Authority scope RPC; receiver and foreign reads after the ordinary-grant precheck; configured host effects only from sealed operations |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation before the final capability and grant decision | Activation and restart retry of already sealed work; no preparation-triggered timed drain | 1 MiB body; turn and capability-step bounds; remote standing: 4096 keys per run | Authority scope RPC before grant decision; driver and dispatch may retry already sealed operations even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification; `stage: true` also checks Native admission and current source | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; stage Rules/key/source reads within 10 s; proof 262144 bytes, objects 16 MiB/4096, wire 24 MiB | Job and membership RPC; stage room Rules and source reads; Git reads after current checks; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; read preparation and holder-key check before unpublished-mode refusal or credential lookup | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |
| `GET /.well-known/oauth-protected-resource/mcp` | `none` | Explicit hosted enablement, valid tool/resource/card settings, canonical public origin, and exact configured path and query | None | At most eight resource URLs, each 2048 UTF-8 bytes; 32800-byte setting; no request body or namespace lookup | None |
| `GET /.well-known/oauth-authorization-server` | `none` | Hosted opt-in, HTTPS resources and OAuth policy; static issuer metadata | None | Bounded URL; no body or authority read | Registry stub selection; no RPC |
| `GET, HEAD /oauth/authorize` | `none` | Hosted policy; same-origin consent assets with frame-ancestors none | None | Static bundle; no request body | None |
| `GET, HEAD /oauth/consent.js` | `none` | Hosted policy; same-origin consent script | None | Static bundle; no request body | None |
| `GET /oauth/authorize/context` | `none` | Address window before client resolution; then exact client, redirect, audience, state and S256 checks | Client registry schema, durable address counters and bounded document caches; no caller identity proof | 120/address key/minute; 4096 keys plus overflow; client document 5 KiB and five seconds; successful cache at most one hour; invalid-result cache 60 seconds | Public-client admission and resolution RPC; explicitly admitted metadata origins only |
| `POST /oauth/register` | `none` | Hosted policy and exact `OAUTH_DYNAMIC_REGISTRATION=on`; bounded public-client JSON and redirect checks | Client registry schema and one public registration | 5 KiB body; at most 1000 clients per Worker | Public-client registry RPC |
| `POST /oauth/token` | `oauth` | Form bounds, client and token binding; issuer checks code with PKCE or refresh secret, then current standing | Agent schema before secret validation; token digests after verification | 8 KiB body; eight grants; eight-second code and 28-second refresh standing deadlines | Agent RPC; fresh Native membership read |
| `POST /oauth/revoke` | `oauth` | Form bounds; known access or refresh secret and client ID before ending a grant; unknown tokens return 200 without effect | Agent schema before token check; grant, stream and session cleanup after proof | 8 KiB body; 16 MiB control budget | Agent RPC |
| `POST /mcp/agents/grant` | `control` | Header, action, service and signature before membership lookup; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Registry and Agent schemas, request counters and client caches before current authority; creation reservation, Native enrollment and grant after authority | 64 KiB body; signed control windows; one-hour own invitation; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/:agent/grant` | `control` | Header, action, service and signature; bounded body and digest before key windows and client resolution; current admin or controller authority and role subset | Client and Agent schemas, request counters and client caches before current authority; owned mapping reservation and grant after authority | 64 KiB body; signed control windows; eight grants; operation-custody budget | Public-client window and metadata fetch; registry, Agent and Native authority RPC |
| `POST /mcp/agents/connections` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current active signer; another controller requires admin authority | Registry schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight mappings per page | Public-client admission, Registry and current Native actor-facts RPC |
| `POST /mcp/agents/:agent/connections` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority | Agent schema and durable request counters before current authority; no retained read operation or operation-custody charge | 64 KiB body; signed control windows; eight grants | Public-client admission, Agent and current Native authority RPC |
| `POST /mcp/agents/:agent/revoke-grant` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent revocation | Agent schema and durable request counters before current authority; control reservation, grant, stream and session cleanup after authority | 64 KiB body; separate cleanup windows; operation-custody budget | Public-client admission, Agent and current Native authority RPC |
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, Agent ID parse, activation and address failure window; bearer digest and expiry or exact grant audience and live secret; fresh same-head Agent and controller role facts and subset on every request | Agent and grant schemas; in-memory failure counters and stream metadata; actual revocation can end a grant, while subset or unavailable denial does not | 10 bad secrets/address key/minute; 4096 keys; 64-byte address; 1 MiB body after admission; five-second role reads; stream standing lease at most 60 seconds; 16 sessions and four streams | Agent and current Native role-facts RPC; admitted tools can call scopes and configured Git hosts |
| `POST /mcp/agents` | `control` | Header, action, service and signature before membership lookup; bounded body and digest; key windows and current admin or controller authority; current role subset before bearer issuance | Registry and Agent schemas and durable request counters before current authority; creation reservation, Native enrollment and bearer issuance after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Registry, Agent and current Native authority RPC; authorized enrollment |
| `DELETE /mcp/agents/:agent` | `control` | Header, action, service and signature; bounded body and digest; cleanup windows and current admin or controller authority; role widening does not prevent retirement | Agent schema and durable request counters before current authority; retained retirement reservation and cleanup after authority | 64 KiB body; separate cleanup windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC; retained retirement cleanup |
| `POST /mcp/agents/:agent/bearer` | `control` | Header, action, service and signature; bounded body and digest; key windows and current admin or controller authority; current role subset before mint and disclosure | Agent schema and durable request counters before current authority; bearer rotation and retained receipt after authority | 64 KiB body; signed control windows; 16 MiB operation-custody budget with 1 MiB retirement reserve | Public-client admission, Agent and current Native authority RPC |

## dap-lending

Configuration: [apps/room/wrangler.lending.jsonc](../../apps/room/wrangler.lending.jsonc).

Entry: `apps/room/worker.ts` → `apps/room/fetch.ts`. This configuration
binds only `SCOPES`. All `/mcp` and `/mcp/*` requests return 404 before
header or body authentication. Application screens need an uncommitted
`APPLICATION_CONTENT` binding and trust setting. The committed
configuration has neither.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; explicit common pin or legacy host selection; cached readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded HTML with one nonsecret Start boolean | None | Fixed embedded assets and boolean substitution | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/canonical address key/minute at fixed index; 4096 windows plus bounded overflow; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | Address serving reservation before body read/parse/signature; then JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; signature verified; `intent.actor` equals the session's key; `notAfter` ahead and within the intent bound; `kind` at most 256 bytes; digest new or same bytes; caps | Activation; one row outside history, then the object's alarm; on a full object, a bounded drop of rows of members no longer active or with no active key | 1 MiB body; 64 rows and 16 MiB per member; 1 GiB per object, except for a request to this scope; a row goes seven days past `notAfter` | None |
| `GET /v1/scopes/:scope/originals` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; rows of the session's member only | Activation | The row cap bounds the page; no bodies | None |
| `GET /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation | One row, 1 MiB at most | None |
| `DELETE /v1/scopes/:scope/originals/:digest` | `session` | Activation; active membership scope; session, key and member standing at the object's own head; another member's row answers `not-found` | Activation; deletes one row and leaves the wake | One row | None |
| `POST /v1/scopes/:scope/acts` | `self-signed` | JSON and signature; fixed found key/address window before target lookup; ordinary membership or native grant-mark checks; standing before receiver and foreign reads; native grant-mark fallback and final commit checks | Activation, found/join serving counters and restart retry of already sealed work; no request-triggered timed drain | 1 MiB body; turn bounds; remote standing: 4096 keys per run; found: 10/key and 30/address/hour; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Authority scope RPC; receiver and foreign reads after the ordinary-grant precheck; configured host effects only from sealed operations |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation before the final capability and grant decision | Activation and restart retry of already sealed work; no preparation-triggered timed drain | 1 MiB body; turn and capability-step bounds; remote standing: 4096 keys per run | Authority scope RPC before grant decision; driver and dispatch may retry already sealed operations even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification; `stage: true` also checks Native admission and current source | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; stage Rules/key/source reads within 10 s; proof 262144 bytes, objects 16 MiB/4096, wire 24 MiB | Job and membership RPC; stage room Rules and source reads; Git reads after current checks; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; read preparation and holder-key check before unpublished-mode refusal or credential lookup | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |

## dap-application-sandbox

Configuration: [apps/sandbox/wrangler.jsonc](../../apps/sandbox/wrangler.jsonc).

Entry: `apps/sandbox/worker.ts`. Only exact configured HTTPS installation
hosts under `*.inguz.space` are reachable. `SCREEN_HOSTS=[]` refuses by
default. `ROOM`, `GROW` and `LENDING` bind fixed services and the named
`ApplicationScreenService` entrypoint, which is the only named production
RPC entrypoint. Each request checks the complete descriptor against
`screenHost` before `screen`, `native` or the stream-only `nativeStream`.
Those RPC methods have no public room HTTP route. `screen` verifies the
room origin and installation path before private rendering. `native`
repeats the finite gateway matcher before ordinary native dispatch. All
three native-reading service methods use the same fixed indexed namespace
as the room routes. Eligible signed reads keep the serving window of the
verified key. Synthetic service calls have no trusted address. Both stream
entry paths refuse signed readers before target lookup. They confer no new
membership authority.

`nativeStream` returns the ordinary response and a close capability for
that exact, already authorized subscription. The capability accepts no
target or stream ID. Gateway cancellation waits, within the transport
window, for the capability's idempotent release acknowledgement before it
completes. Disposal of the RPC stub is separate and is not an
acknowledgement. The stream adds no public HTTP route or header.

The native rows below keep their ordinary gate classes. The sandbox cannot
forward parentless creation, arbitrary upstream URLs or unrelated methods.
It does not forward browser cookies or response `Set-Cookie`. Native
authorization headers and signed bodies keep the canonical room origin. A
forwarded address is Cloudflare edge metadata, not caller identity.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET /_application-host` | `none` | Exact host mapping and matching service descriptor | None | 32 mappings; 128 KiB URL; 10 s descriptor wait | Fixed service screenHost RPC |
| `GET, HEAD /applications/*` | `none` | Descriptor; private renderer checks native installation, trust and packet | Scope activation; bounded packet cache | 8 KiB screen path; two cached packets; existing packet bounds | Fixed screenHost and screen RPC; renderer Scope/R2 reads |
| `GET /site/*` | `none` | Descriptor then ordinary Site proof and repository reads | Ordinary Site activation/token lifecycle | Exact installation directory; finite path; existing Site bounds | Fixed screenHost and native RPC; configured Git host |
| `GET /v1/scopes/:scope` | `self-signed` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `POST /v1/scopes/:scope/acts` | `self-signed` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `POST /v1/scopes/:scope/settle` | `self-signed` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `POST /v1/scopes/:scope/sessions` | `membership` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/history` | `self-signed` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/outbox` | `session` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/log` | `self-signed` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/stream` | `session` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/application-projection` | `session` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
| `GET /v1/scopes/:scope/items/:type` | `session` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |

## dap-grow-simulator

Configuration: [examples/grow/wrangler.jsonc](../../examples/grow/wrangler.jsonc).

Entry: [simulator-worker.ts](../../examples/grow/simulator-worker.ts) →
`simulatorHost` in [simulator-host.ts](../../examples/grow/simulator-host.ts).
Its fetch returns 404 for every method and path. `workers_dev` and preview
URLs are disabled, and the configuration declares no public route. The
wildcard row records that refusal for a call through a test or platform
transport.

A separate platform-controlled scheduled event runs each minute. It
verifies the packet, parses the configured HTTPS origin and principals,
checks two distinct agent secrets, obtains membership sessions, and runs
the tick. It has no local durable state. Each tick allows 96 reads, 48
writes, 256 KiB of request bytes, 4 MiB of reply bytes, and 45 s, with a
5 s SDK deadline per request. Outbound HTTP stays on the configured service
and the allowed scope paths. Fetch cannot reach these scheduled actions.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `* /*` | `none` | Return a fixed 404 response | None | Fixed response body | None |

## dap-home

Configuration: [homepage/wrangler.jsonc](../../homepage/wrangler.jsonc).

Entry: Cloudflare static assets from `homepage/assets`, built by
[homepage/build.mjs](../../homepage/build.mjs). There is no `main` script
or fetch handler in the repository. The platform asset adapter handles
files, HTML trailing-slash redirects, and the configured 404 page. Unknown
files return 404. Other methods have no application action. The row comes
from the configuration of the platform adapter. No test in the repository
runs that adapter.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /*` | `none` | Platform asset selection | None | Finite deployed asset set; platform serving limits | None |

## Route notes

These notes give the detail behind rows that a single cell cannot hold.

### Census

`GET /v1/scope-index/census` selects only the fixed index owner. Its signed
request names the deployment-pinned register and the exact cursor. After
the request's form and signature pass, the address and key windows run
before the census owner's row lookup or register proof RPC. The route uses
the trusted transport address. A forwarded header supplies no identity.
Counting is in memory and runs once per request, including attempts by
callers who are not the operator. The owner binds its stored full register
reference and genesis hash to a bounded exact native proof, checks the
supported register pin and the applied founding `install`, and then
compares that install's actor with the caller. The read-only proof path
starts no recovery or native turn. Cold object construction can still
initialize schema and maintenance state. On denial, the census writes no
index, journal, replay or alarm state.

### Hosted MCP

The route inventory covers valid enabled settings, including dynamic
registration. An unset `OAUTH_DYNAMIC_REGISTRATION` removes the registration
operation: its POST refuses before body reads or registry lookup, and issuer
metadata omits its endpoint. The exact value `on` enables it. Other supplied
values close the OAuth routes. Metadata-document clients keep working when
registration is off. See [OAuth settings](settings.md).

Hosted MCP requires `MCP_ENABLED` to be exactly `"true"`, and both
committed agent namespaces. `MCP_TOOL_ADDITIONS` can add known generic tool
names to the hosted default list. If present, it must be a JSON array of
unique, known names within 1024 characters. A missing opt-in or invalid
additions return 404 before the MCP route reads a body or selects an agent
or registry object. The shared room request setup still runs first.

Signed control routes check the action, Agent, service and signature before
membership-index lookup or client resolution. They read the bounded raw
body and match its digest before central admission. The public-client
Registry then checks the signed deadline and counts the verified key. The
destination Registry or Agent applies its own window before current
authority reads. A signed header alone grants no operation. Issuance and
rotation also check the current Agent and controller role subset before
minting and disclosure.

The [request windows](../../packages/mcp/src/request-window.ts) allow 120
calls per 60 seconds, with 4096 identities and one shared overflow row per
purpose. Ordinary controls and cleanup use separate purposes. Both
the central public-client Registry and the destination object retain their
own counts. Retirement and grant revocation use cleanup windows, so an
exhausted ordinary window does not block those requests. Each purpose
expires its rows. Backward clocks refuse admission. These rows do not
consume the operation-custody budget or replace its retirement reserve.

Both `connections` routes still check current authority and perform bounded
SQL reads. They retain no operation receipt and reserve no operation-custody
row. Their finite request windows still count calls. Repeating consent-page
listings therefore spends no permanent operation capacity.

`GET /oauth/authorize/context` needs no caller identity proof. After method
and duplicate-query checks, it counts the canonical transport address
before resolving a client document. Missing or unusable addresses share
one addressless identity. The context purpose has the same 120-call,
60-second and 4096-identity bounds, plus one overflow row. Exact client,
redirect, audience, state and S256 checks still decide the returned context.

[OAuthClients](../../packages/mcp/src/oauth-clients.ts) bounds a metadata
fetch to 5 KiB and five seconds. Successful documents use a cache of at most
1000 rows for at most one hour and still pass the current redirect policy.
Invalid metadata or redirect-policy results from a 200 document response
can use a separate 60-second cache, keyed by the exact document URL and
redirect policy. That cache holds at most 1000 rows and retains nothing new
at capacity. Reconstruction does not extend expiry. Network failures,
timeouts and non-200 HTTP responses do not enter the invalid-result cache.
The short cache grants no client validity or caller authority.

The hosted default omits `create`, `install_application`, `credential`,
`diff`, `prepare`, `join`, and `record`. An explicit addition
affects both the listing and direct calls. Local MCP services keep their
own default. Generated named tools also require fresh standing and tool
selection checks, then the actual target's membership check when called. A
remembered tool name does not keep an expired grant or authorize another
target.

Hosted agent enrollment can return an archived 410 after its control gate.
The answer keeps the archive location, and a fact only when one is
supplied. Enrollment then stops before receipt read-back, standing
observation, or bearer issuance. An archived custody outcome is terminal:
it neither resends the enrollment nor confirms acceptance without archive
verification. The route's gate class is unchanged.

### Hosted membership facts RPC

The internal `hostedRoleStanding` RPC accepts two closed request shapes on
one synchronous Native facts path. The existing Agent request has exactly
`membership`, `agent`, `agentKey`, `expectedController`, and `actor`. Its
observed reply keeps `status`, `of`, `head`, `agent`, `agentKey`, `controller`,
and `actor`. Null Agent keys and actors keep their existing meanings.

The actor-only request has exactly `membership` and a nonnull `actor` key.
Its observed reply has exactly `status`, `of`, `head`, and `actor`. The actor
holds only that key's facts, or null when Native does not know that key.
No other member, Agent or raw roster appears. Retired and compromised keys
remain known facts; the caller still decides authority. Both shapes require
the full active membership incarnation and one open roster with all five
role action lists valid. Mixed, missing or extra request fields, malformed
facts, and unavailable reads return only `{status:"unavailable"}`.

The Worker uses the same closed decoder and five-second bound for both
shapes. Each successful reply owns its scope, head, key facts and actions.
The facts read neither writes a permission record nor grants a lease.
Native still uses its existing paged key lookup; the one-RPC bound does not
claim a constant number of SQLite reads or cancel work after caller timeout.

### Public origin

`PUBLIC_ORIGIN`, when set, supplies the exact service origin for hosted MCP
creation, application context and redirects, and demo offer checks. When
it is unset, the request URL origin applies. An invalid explicit value
fails before these routes select their protected objects. Neither
forwarded headers nor the transport `Host` override it. The shared
accessor is a sealed gate owner.

### Child creation

The parentless serving policy also applies to the in-process
`api(binding).create` and to the hosted agent's scope fetch. In closed
deployed mode, child creation also passes a whole-lineage serving check
before the child's raw namespace `idFromName` or `get`. The configured
register's applied genesis selects one of the two reviewed exact cohorts,
and the check follows every creator birth and sealed create send back to
that root. Every ancestor read first requires a fresh fixed-index `has`,
even in register mode. Missing or archived proof, unavailable declaration
custody and a spent deadline return `retry` with `dependency-unavailable`
before child activation. The check refuses malformed or wrong-root
creation, and uses no archive or `source()` fallback. One attempt allows at
most 16 bodies, 1 MiB of combined bytes, 64 source attempts, 512 visits and
one monotonic ten-second deadline. The receiving scope still makes its full
genesis judgment. The check does not revalidate existing scopes against a
new register pin for ordinary reads or acts. Opening creation for local
and test use is not a deployment recommendation.

### Acts and application trust

Before a fresh act reads foreign dependencies, the host checks it in
[applications/act-admission.ts](../../packages/scope/src/applications/act-admission.ts).
HTTP, service-binding and direct native calls reach this same check in the
core. The host identifies the scope's installed release from immutable
native creation records and checks the current `APPLICATION_TRUST`. It
checks trust again before it writes the act. An idempotency key that
already took effect keeps its receipt and mismatch behavior. Native
platform scopes and proved unpackaged creations are exempt. A withdrawn
release returns `application-revoked`, and incomplete proof returns
`dependency-unavailable`.

The ancestry walk reads at most 18 ancestors, 37 bodies, 16 MiB of body
bytes, and 36 native RPCs, with a 1 MiB limit per body. The local birth
uses the existing preparation allowance. One ten-second flight owns
unresolved native work, and a caller timeout does not release it. Only
immutable provenance is cached. The check reads no package, R2, Git, or
provider data, and writes no entry.

### Preparation

For preparation requests, [core.ts](../../packages/scope/src/core.ts)
verifies the signature before it starts the turn.
[turn.ts](../../packages/scope/src/turn.ts) then drains due timed work
before [judgePreparation](../../packages/derive/src/prepare.ts) makes the
final capability and grant decision. So a refused preparation can follow
newly sealed timed entries. `ScopeObject.prepare` passes even a refused
answer through `#sent`, which schedules the driver and the operations
dispatch. Those background passes can make configured provider calls for
sealed work when the preparation is refused. The caller's preparation
entry still needs its own capability and grant checks.

### Reservation snapshot and stage snapshot

`POST /v1/scopes/:scope/reservation-snapshot` accepts the legacy `{signed}`
body and the successor `{signed, stage: true}` body at the same membership
gate. The `stage` member selects the proof format and grants no authority.
The successor requires the job's `admission` entry in a
`platform:destination@17` scope, the full job identity, the current checker
key and the source. Room jobs also read fresh `platform:rules@13`
observations before Git access and before the answer. Revision 21 of the
Rules observation record carries the service mark and the scoped
generation. Earlier definitions keep their exact observation grammar. The
host also authenticates the bounded canonical policy value against the
extents digest. The full Rules reference, the current service mark and
generation, and the check name, configuration and checker must match the
job's binding. Member jobs do not depend on the room service mark.

Each sequence of stage eligibility reads bounds the combined Rules, key and
work-source waits to ten seconds. The final sequence checks Rules before key
and source state, then checks the job's current `admission` entry without
another wait. A released work source refuses a fresh snapshot. Releasing a
source neither cancels nor drains a run in progress. Snapshot reads leave
native authority state unchanged. Stage proof bytes are limited to 262144,
not counting object bodies. Object bodies are limited to 16 MiB combined
and 4096 objects, with the per-object read bounds. The HTTP reply has a
separate 24 MiB wire limit. These transport limits do not enlarge native
budgets.

The internal `stageSnapshot` method checks a signed job-read request before
it returns a stage snapshot. `jobState` and `workSourceState` read retained
local job or work-source state. For a member-source stage snapshot, a
signing key that is not eligible can trigger the initial job lookup and up
to 32 source-fact reads before the current key check refuses it. Those
reads return no snapshot to that caller. Room jobs reject a key that
differs from the frozen marked key before those source reads. Both paths
check current eligibility again around provider reads. A captured job-read
signature can be replayed during its 15-minute window. The older snapshot
route has the same exposure.

### Workspace discovery and credentials

The internal `nativeBirthByName` method discovers directory, register and
destination births. The deployment's indexed namespace checks the exact
known scope and kind before target lookup. The receiver bounds preparation
and bytes. The workspace service then verifies the full returned reference,
genesis and creation lineage. It uses no legacy source fallback and grants
no read session or repository authority that a caller selects.

The credential route also accepts a lane whose declared definition includes
`hold@2`, behind the same membership gate. Private custody checks the
preparing key, the actual holder, the current instance, the epoch, the
expiry and the selected fork before a one-time handoff. Fork setup
credentials stay private under their exact original attempt handles. Their
token records owe revocation through the existing operation ledger. The
provider adapter makes no independent retry.

### Archived answers

With a retained journal floor, the read and exact-intent gates still apply.
Entry, history, log, settlement, and repeated accepted intents can return
the current archive receipt with HTTP 410. History and log cursors below
the floor resume at the floor, and kept entries stay readable. An archived
foreign source fact refuses creation or submission before authority
observation and the turn. These answers fetch no clone and grant no new
authority. Sparse retained and causal-chain walks keep their signing and
membership checks. Floor writes belong to an explicitly configured alarm
path and do not run as read work before a gate. There is no public floor
route.

### Archive row diagnostic

The fixed `archive-row-diagnostic-v1` log line reports bounded stored
archive state and the platform alarm once per object activation, through
existing ingress before recovery. It adds no RPC, HTTP, member, MCP or
operator caller. Its internal reader does no recovery and no writes. Cold
constructor effects remain. A log tail is an observation channel, not
authority to restart an archive.

## Member read-token reservations

A Destination object admits at most eight open read-token reservations per
authenticated member. The already judged
grant's subject supplies the full Membership ScopeRef and member identity.
Several keys of one member share the bucket. Neither a caller key nor a
principal or handle prefix chooses it. The full Destination ScopeRef also
partitions storage, so neither incarnation shares a bucket.

The native commit refuses a fresh ninth act with `limit` before accepting
its operation entry. The accepted entry and its private reservation share
one SQLite transaction. An accepted-key retry returns its existing receipt
or mismatch and counts no second slot. The adapter binds a nonsecret
handle before its provider await.

A known token keeps its slot until actual provider-reported expiry, even
after plaintext is taken or dropped. An explicit `minted:false` frees its
slot. An unknown mint keeps the reservation until its opening time plus
requested hours plus ten minutes. This quota counts reservations and does
not prove that a provider token ended. A late reply cannot restore an
expired reservation or disclose its plaintext. Its valid own reply still
records the pinned `confirmed` metadata, `{token, ends}`, without storing
plaintext. A replacement keeps its slot, and the late mint's accepted-key
retry reserves nothing. Destination 19 keeps its
one-hour request; older pins keep the one-to-twenty-four-hour field.

Legacy read markers without a member belong to no bucket. The private
cutover sequence leaves earlier pending operations on their original path;
it infers no member from a key, token ID, or handle prefix. Existing
authenticated plaintext-expiry cleanup remains separate. No recorded pin,
entry meaning, or mint-read outcome changes.

The private bucket index bounds each admission read to eight live rows.
An independent due index lets the native alarm delete at most 64 expired
reservation rows per pass, including rows whose plaintext left custody.
An unknown end beyond the last representable clock schedules no invalid
alarm and stays open at every valid clock. The quota's SQL, the custody
scheduler, and the adapter each have an explicit source seal.

## Unread read-token custody

Only the trusted destination `mint-read` adapter enrolls newly minted
member read tokens for local plaintext expiry. A durable marker binds the
full scope and incarnation, the token ID, the mint operation, the attempt
and the end that the provider reported. The native alarm processes bounded
backfill and due-queue steps, so expiry is not exact to the wall clock.
Taking or dropping plaintext keeps its metadata and does not revoke the
provider token. Plaintext of a generic write token stays available for
provider revocation, even if its ID resembles a read handle.

A delivery's own transaction adds one row to `private_named_key` for the key
that an applied `compromised` notice names at a destination. A notice that the
row's guard refuses adds nothing. The credential route answers `forbidden` to a
named key, and its unread plaintext stays until the expiry queue drops it. The
table holds one row for each named key and no secret, and a named key never
leaves it. A row needs a key that membership enrolled and then revoked, which
takes at least three entries of its journal apart from the first key. Membership
journals take no floor, so `scopeEntries` limits a room to about 33,000 rows of
under 256 bytes each. A notice that arrived before this table existed names
nobody.

Legacy coverage is partial. An untagged row needs bounded retained proof of
a current-incarnation mint-read, its opening and its confirmed outcome
before enrollment. Rows with missing, pruned, oversized, invalid or
unproved old-incarnation evidence stay retained, because no safe retained
discriminator separates them from write credentials. A held legacy read
confirmed after its one backfill scan also stays retained. Confirmation
alone does not enroll it. All newly minted explicit read tokens are queued.

Current [Artifacts minting](../../packages/scope/src/artifacts-host.ts)
sends the requested read lifetime to the provider and records the
`expiresAt` it returns. Current [GitHub minting](../../packages/scope/src/github-host.ts)
records the installation token's provider-reported expiry and does not send
the requested seconds. The [client](../../packages/git/src/github.ts)
requires a future expiry within 65 minutes of its clock. These adapter
checks do not show what a provider enforces, or the origin or expiry of an
unknown legacy row.

## Public Site address window

After method, credential-in-URL and path bounds, every valid `/site` GET,
including redirects, versions and conditional reads, reserves an address
attempt at the fixed `SCOPE_INDEX` serving object before room, publication
or provider work. Its counter allows 240 attempts per fixed 60-second
window and keeps at most 4096 dedicated keys plus one shared overflow
window. Valid addresses use `addressKey`, including its IPv6 /64 grouping.
Addresses have a 64 UTF-8-byte
bound before RPC serialization and in the owner. Only the outer platform
fetch reads Cloudflare's `CF-Connecting-IP`; the sandbox carries it as an
explicit native service argument. This relies on the platform setting the
edge header. Synthetic and service-binding callers cannot
select a bucket by putting a header on their request. Without an explicit
trusted transport address, they share one internal missing-address bucket.
No caller-supplied address grants authority.

A full table counts a new address in the shared 240-attempt overflow
window and never evicts an active window. Only expired windows are
reclaimed. A quota or invalid-address refusal answers 429 with `Retry-After: 60` and `Cache-Control: no-store`. A
missing or unavailable fixed index answers 503 without selecting the room
or provider. The creation, found, and signed-read counters keep separate
accounting. The single fixed owner shares the window across Worker ingress
isolates. Its counters are in memory and reset when that owner is evicted
or replaced. This is a serving bound, not a durable quota or a global
network limit.

## How the inventory is checked

Run `node --test scripts/security-entry-points.test.mjs`. The root test
command also runs it. The test derives route names and HTTP methods from
the actual matcher syntax, not from this page. It runs the scope and MCP
dispatchers with boundary stand-ins, enumerates the literal path partitions
of the scoped matcher, and reads the public prefix, equality, switch, and
method matchers. Rows must match in both directions, including the gate
class of the reviewed operation. A missing, extra, duplicate, or
differently gated row fails.

The inventory runs the actual OAuth wire and consent asset matchers. Its
object ports classify code, refresh and revocation as credential-gated;
they establish no Native authority or actual token possession. It enumerates
each finite agent-route suffix and both token form branches.

The hosted matcher uses its real deployment policy with valid explicit
opt-in. A control with the policy disabled removes only the hosted rows and
fails against the enabled-deployment table. That control shows structural
dispatch, not a deployed setting or a native grant decision.

The room entry model accepts only the exact generic and lending entry and
the Grow wrapper's two-hop default re-export chain. The local celld project
adds an exact two-export shim to the same room entry. The model does not
follow arbitrary module re-exports. Whole-owner seals separately cover the
wrapper and the archive configuration, target, host-item and provider
boundaries.

Source seals guard the finite extraction grammar, the deployed
composition, and the reviewed gate owners. An edit to a matcher or gate
owner fails the test for inventory review even when the probe does not
model its new syntax. To update a seal, check the route partition and gate
classification, update the table, and review the exact source. Seals ignore
comments and source locations. An in-memory control changes a real matcher
while it leaves this page unchanged, and the bijection assertion fails. The
snapshot body test runs both actual dispatch branches and requires one
membership-classified route row. It adds no duplicate route for the
`stage` member. Seals cover their selected source only, not the
implementations it imports. The successor stage read, the checker origin
verifier, the binding codec, the detached checkout verifier, and the
workspace owners (`workspace-host.ts`, `workspace-lineage.ts` and
`native-birth.ts`) each have an explicit owner seal. Native version pins
and owning tests cover the imported policy rules.

The test checks structure. Its stand-ins show dispatch, not Durable Object
behavior, authentication, storage bounds, credential custody, outbound
ordering, or the platform asset adapter. Native and pure gate tests cover
those.

Gate owners: [address.ts](../../packages/bytes/src/address.ts),
[public-origin.ts](../../packages/scope/src/public-origin.ts),
[core.ts](../../packages/scope/src/core.ts),
[applications/act-admission.ts](../../packages/scope/src/applications/act-admission.ts),
[judge.ts](../../packages/derive/src/judge.ts),
[sessions.ts](../../packages/scope/src/sessions.ts),
[reads.ts](../../packages/scope/src/reads.ts),
[signed-reads.ts](../../packages/scope/src/signed-reads.ts),
[item-queries.ts](../../packages/scope/src/item-queries.ts),
[applications/projection.ts](../../packages/scope/src/applications/projection.ts),
[destination-host.ts](../../packages/scope/src/destination-host.ts),
[read-token-quota.ts](../../packages/scope/src/read-token-quota.ts),
[credential-store.ts](../../packages/scope/src/credential-store.ts),
[stage-snapshot.ts](../../packages/scope/src/stage-snapshot.ts),
[stage-origin.ts](../../packages/checkers/src/stage-origin.ts),
[evidence.ts](../../packages/platform/src/evidence.ts),
[checkout-snapshot.ts](../../packages/git/src/checkout-snapshot.ts),
[hosted.ts](../../packages/mcp/src/hosted.ts),
[hosted-retirement.ts](../../packages/mcp/src/hosted-retirement.ts),
[hosted-tools.ts](../../packages/mcp/src/hosted-tools.ts),
[service.ts](../../packages/mcp/src/service.ts),
[catalogue.ts](../../packages/mcp/src/catalogue.ts), and
[inventory.ts](../../packages/mcp/src/inventory.ts).

## Source

Checked against main `b0af01d2` on 1 November 2026. Sources: [apps/room/fetch.ts](../../apps/room/fetch.ts), [packages/scope/src/worker.ts](../../packages/scope/src/worker.ts), [serving-limits.ts](../../packages/scope/src/serving-limits.ts), [site/window.ts](../../packages/scope/src/site/window.ts), [apps/sandbox/worker.ts](../../apps/sandbox/worker.ts), [security-entry-points.test.mjs](../../scripts/security-entry-points.test.mjs).
