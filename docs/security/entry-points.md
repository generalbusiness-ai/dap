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
- **bearer**: the hosted agent's opaque bearer, compared through its digest.
- **control**: a signed MCP control request, bound to its action, body,
  service, deadline, repository, and current member authority.

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
  [bounds.ts](../../packages/contract/src/bounds.ts). Submit reads foreign
  facts and runs the timed drain before check 9 can refuse authority. Rule
  expression evaluation follows that check. Public parentless creation and
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

The serving check in `serving-admission.ts` counts parentless creation and
signed reads before index or target lookup and before protected proof work.
A fixed `ScopeIndex` instance owns the counters, in memory. Creation counts
10 attempts per verified key and 30 per trusted edge address per hour.
Signed reads count 240 per key and 600 per address per minute. A valid
signature proves custody of the key for counting, not native authority. An
invalid signature charges no claimed key. Native checks still run fresh.

Only the outer edge fetch supplies the platform address. In-process API
calls and hosted fetch supply none and ignore forwarded headers. The table
holds at most 8192 windows, removes only expired entries, and refuses new
identities at capacity. Churn cannot evict a live address counter. An
object restart or eviction resets memory, so this is not durable global
accounting. Invalid settings or a missing serving binding fail closed.
Rate-limited creation and signed reads answer 429. Join keeps its own
serving status. Session issuance, session reads and internal verified child
delivery keep their own rules. The three Worker configurations name the
four nonsecret `SERVING_*` overrides. No public counter, index, admin or
status route exists.

The join, creation, signed-read and MCP bearer-failure windows use
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

## artroom-scope

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
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/address/minute at fixed index; 4096 active windows; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/acts` | `membership` | JSON, signature, state and foreign-fact reads, authority observation, timed drain | Activation; timed entries and join serving counters can precede authority refusal | 1 MiB body; turn bounds; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Foreign scope RPC before grant refusal; configured host effects after sealing |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation; timed drain before final capability and grant decision | Activation; due timed entries can be sealed before capability or authority refusal | 1 MiB body; turn and capability-step bounds | Authority scope RPC before grant decision; driver and dispatch may call configured providers for sealed timed work even when preparation is refused |
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
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, bearer ID parse, agent activation, failure-window check, bearer digest | Agent schema initialization; in-memory bearer-failure windows | 10 failures per canonical address key per minute; 4096 keys; 64-byte raw address; 1 MiB hosted body after bearer; MCP session and stream bounds | Agent RPC; authenticated tools can call scope and configured Git hosts |
| `POST /mcp/agents` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `DELETE /mcp/agents/:agent` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `POST /mcp/agents/:agent/bearer` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |

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
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/address/minute at fixed index; 4096 active windows; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/acts` | `membership` | JSON, signature, state and foreign-fact reads, authority observation, timed drain | Activation; timed entries and join serving counters can precede authority refusal | 1 MiB body; turn bounds; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Foreign scope RPC before grant refusal; configured host effects after sealing |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation; timed drain before final capability and grant decision | Activation; due timed entries can be sealed before capability or authority refusal | 1 MiB body; turn and capability-step bounds | Authority scope RPC before grant decision; driver and dispatch may call configured providers for sealed timed work even when preparation is refused |
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
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, bearer ID parse, agent activation, failure-window check, bearer digest | Agent schema initialization; in-memory bearer-failure windows | 10 failures per canonical address key per minute; 4096 keys; 64-byte raw address; 1 MiB hosted body after bearer; MCP session and stream bounds | Agent RPC; authenticated tools can call scope and configured Git hosts |
| `POST /mcp/agents` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `DELETE /mcp/agents/:agent` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `POST /mcp/agents/:agent/bearer` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |

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
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/address/minute at fixed index; 4096 active windows; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/acts` | `membership` | JSON, signature, state and foreign-fact reads, authority observation, timed drain | Activation; timed entries and join serving counters can precede authority refusal | 1 MiB body; turn bounds; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Foreign scope RPC before grant refusal; configured host effects after sealing |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation; timed drain before final capability and grant decision | Activation; due timed entries can be sealed before capability or authority refusal | 1 MiB body; turn and capability-step bounds | Authority scope RPC before grant decision; driver and dispatch may call configured providers for sealed timed work even when preparation is refused |
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
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, bearer ID parse, agent activation, failure-window check, bearer digest | Agent schema initialization; in-memory bearer-failure windows | 10 failures per canonical address key per minute; 4096 keys; 64-byte raw address; 1 MiB hosted body after bearer; MCP session and stream bounds | Agent RPC; authenticated tools can call scope and configured Git hosts |
| `POST /mcp/agents` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `DELETE /mcp/agents/:agent` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `POST /mcp/agents/:agent/bearer` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |

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
| `GET /site/*` | `none` | Native room check; host-none 404 before provider selection; otherwise fresh publication, configuration and Git reads/render | Activation; Artifacts private fixed-owner [expiring-token custody](../../packages/scope/src/site/token-reuse.ts) and [alarm scheduling](../../packages/scope/src/worker.ts); [request-local close](../../packages/scope/src/site/host.ts) | 240 GET attempts/address/minute at fixed index; 4096 active windows; 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof | Native room RPC; no provider for host none; otherwise configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address and exact configured sandbox descriptor; redirect or refuse, never package bytes | None | 8 KiB path; at most 32 configured descriptors | None |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `GET /v1/scope-index/census` | `self-signed` | Signed cursor; address and key windows before census owner work; pinned row and founding install key; mode before listing | Fixed owner activation; memory-only windows; trusted Register cold construction; no census, replay or recovery writes | 100 rows; one 10 s, 1 MiB exact birth proof; existing address and key windows | Fixed index admission; pinned Register proof RPC only after admission |
| `POST /v1/scopes` | `creation` | JSON and seed; shared register pin and signature admission, then host/cohort checks before object selection | Refused closed admission selects no object and writes no scope state; accepted or local/open paths activate and judge genesis | 1 MiB body; turn bounds; fixed creation key/address window before target lookup | Fixed-index admission; no target RPC on closed refusal; admitted namespace and creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key; 429 Retry-After from earliest retained deadline | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; fixed key/address window for signed headers before target lookup | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/acts` | `membership` | JSON, signature, state and foreign-fact reads, authority observation, timed drain | Activation; timed entries and join serving counters can precede authority refusal | 1 MiB body; turn bounds; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Foreign scope RPC before grant refusal; configured host effects after sealing |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation; timed drain before final capability and grant decision | Activation; due timed entries can be sealed before capability or authority refusal | 1 MiB body; turn and capability-step bounds | Authority scope RPC before grant decision; driver and dispatch may call configured providers for sealed timed work even when preparation is refused |
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
| `POST /v1/scopes/:scope/acts` | `membership` | Descriptor then ordinary native admission | Ordinary native activation and protocol state only | 128 KiB URL; exact query keys; existing native bounds | Fixed screenHost and native RPC; ordinary authority reads |
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

Hosted MCP requires `MCP_ENABLED` to be exactly `"true"`, and both
committed agent namespaces. `MCP_TOOL_ADDITIONS` can add known generic tool
names to the hosted default list. If present, it must be a JSON array of
unique, known names within 1024 characters. A missing opt-in or invalid
additions return 404 before the MCP route reads a body or selects an agent
or registry object. The shared room request setup still runs first.

The hosted default omits `create`, `install_application`, `credential`,
`prepare`, `join`, `record`, `step`, and `text`. An explicit addition
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

## Unread read-token custody

Only the trusted destination `mint-read` adapter enrolls newly minted
member read tokens for local plaintext expiry. A durable marker binds the
full scope and incarnation, the token ID, the mint operation, the attempt
and the end that the provider reported. The native alarm processes bounded
backfill and due-queue steps, so expiry is not exact to the wall clock.
Taking or dropping plaintext keeps its metadata and does not revoke the
provider token. Plaintext of a generic write token stays available for
provider revocation, even if its ID resembles a read handle.

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
window and keeps at most 4096 active keys. Addresses have a 64 UTF-8-byte
bound before RPC serialization and in the owner. Only the outer platform
fetch forwards Cloudflare's `CF-Connecting-IP`, so this relies on the
platform setting that header. Synthetic and service-binding callers cannot
select a bucket by putting a header on their request. Without an explicit
trusted transport address, they share one internal missing-address bucket.
No caller-supplied address grants authority.

A full table refuses a new address and never evicts an active window. Only
expired windows are reclaimed. A quota, capacity or invalid-address
refusal answers 429 with `Retry-After: 60` and `Cache-Control: no-store`. A
missing or unavailable fixed index answers 503 without selecting the room
or provider. The creation and signed-read counters keep their own
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
[stage-snapshot.ts](../../packages/scope/src/stage-snapshot.ts),
[stage-origin.ts](../../packages/checkers/src/stage-origin.ts),
[evidence.ts](../../packages/platform/src/evidence.ts),
[checkout-snapshot.ts](../../packages/git/src/checkout-snapshot.ts),
[hosted.ts](../../packages/mcp/src/hosted.ts),
[hosted-tools.ts](../../packages/mcp/src/hosted-tools.ts),
[service.ts](../../packages/mcp/src/service.ts),
[catalogue.ts](../../packages/mcp/src/catalogue.ts), and
[inventory.ts](../../packages/mcp/src/inventory.ts).

## Source

Checked against main `5dc9765f` on 30 October 2026. Sources: [apps/room/fetch.ts](../../apps/room/fetch.ts), [packages/scope/src/worker.ts](../../packages/scope/src/worker.ts), [serving-limits.ts](../../packages/scope/src/serving-limits.ts), [site/window.ts](../../packages/scope/src/site/window.ts), [apps/sandbox/worker.ts](../../apps/sandbox/worker.ts), [security-entry-points.test.mjs](../../scripts/security-entry-points.test.mjs).
