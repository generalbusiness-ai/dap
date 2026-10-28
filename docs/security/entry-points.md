# Worker entry points and gates

This reference inventories the Worker entry points named by D1 and the local celld project in this repository.
It describes source at this revision, not a probe of deployed settings. It closes
security finding 2.5 in request `6dd06d03`.

A gate class names the weakest proof that can obtain the route's protected
result. It does not imply that the gate runs before object activation or all
other work. For `none`, the work and state columns cover the whole request.
Refusals and unsupported methods are not additional routes.

The fixed `archive-row-diagnostic-v1` line reports bounded stored archive
state and the platform alarm once per object activation, through existing
ingress before recovery. It adds no RPC, HTTP, member, MCP or operator caller.
Its internal reader does no recovery or writes. Existing cold constructor
effects remain; the planner accepted this warm observation boundary. A tail
is an observation channel, not authority to restart an archive.

- **none**: no caller identity or membership proof. Publication and package
  trust checks can still restrict the bytes served.
- **creation**: parentless serving admission followed by the native genesis
  judgment. Creation, child lineage and census share `readRegisterScope`.
  `REGISTER_SCOPE` is primary; a valid Artifacts-only pin remains a legacy
  fallback. Supplied settings must parse and agree. A deployed request
  needs a pin even when `ALLOW_OPEN_CREATION` is exactly `true`; otherwise
  it fails closed before object selection. Without that explicit opening,
  the signed install must name the pinned Register. Authorized new installs
  also check host availability and the host-none cohort before lookup.
  Without `DEPLOYMENT`, the local API remains open unless supplied pin
  settings are malformed or conflicting. These are conditional source
  behaviors, not attestations of live settings.
- **self-signed**: a valid signature, without a current membership grant.
  Ordinary signed reads additionally need an eligible
  local or causal signing history. A settlement needs the exact previously
  accepted signed intent. These restrictions do not establish membership. The six signed-read routes
  also accept scoped sessions for their ordinary complete reads.
  The fixed-index census instead requires the pinned Register's founding
  install key; it accepts no membership session or causal-window substitute.
- **membership**: a signature and the operation's observed authority or
  membership protocol. Join and enrol use the pinned cohort's invitation rules.
  Snapshot reads require the requested job's current configured checker.
- **session**: an authenticated deployment read session, scoped to its
  membership and allowed reads. The credential route also binds the holder key.
- **admin**: a read session whose issued reads include the admin operation,
  derived from `membership.*` authority.
- **bearer**: the hosted agent's opaque bearer, compared through its digest.
- **control**: a signed MCP control request, bound to its action, body, service,
  deadline, repository, and current member authority.

The census route selects only the fixed index owner. Its signed request
names the deployment-pinned Register and the exact cursor. After checking
that request's form and signature, existing address and key windows run
before the census owner's row lookup or Register proof RPC. The route uses
the trusted transport address; a forwarded header supplies no identity.
Counter accounting is memory-only and runs once per request, including
non-operator attempts. The owner binds
its stored full Register reference and genesis hash to a bounded exact
native proof, checks the supported Register pin and applied founding
`install`, then compares that install's actor with the caller. This adds no
replay rows or second owner-side charge.
The read-only proof path starts no recovery or native turn. Existing cold
object construction can still initialize schema and maintenance state;
the census adds no index, journal, replay or alarm writes on denial.

Hosted MCP requires `MCP_ENABLED` to be exactly `"true"`, as well as both
committed agent namespaces. `MCP_TOOL_ADDITIONS` can add known generic tool
names to the hosted default list. If present, it must be a JSON array of unique,
known names within 1024 characters. Missing opt-in or invalid additions return
404 before the MCP route reads a body or selects an agent or registry object.
The shared room request setup described below still runs first.

`PUBLIC_ORIGIN`, when set, supplies the exact service origin for hosted MCP
creation, application context and redirects, and demo offer checks. Missing
configuration retains the request URL origin. An invalid explicit value fails
closed before these routes select their protected objects. Neither forwarded
headers nor transport Host override it. The shared accessor is a sealed gate
owner. The local celld shim reexports the same production room entry, bindings
and migration history. It introduces no route or caller authority.

The hosted default omits `create`, `install_application`, `credential`,
`prepare`, `join`, `record`, `step`, and `text`. An explicit addition affects
both listing and direct calls. Local MCP services keep their existing default.
Generated named tools additionally require fresh standing and tool selection
checks, then the actual target's membership check when called. A remembered tool name
does not preserve an expired grant or authorize another target.

The parentless serving policy is also passed through the in-process
`api(binding).create` and the hosted agent's scope fetch. In closed deployed mode,
child creation additionally passes a whole-lineage serving check before
the child's raw namespace `idFromName` or `get`: the configured register's
applied genesis selects one of the two reviewed exact cohorts, and every
creator birth and sealed create send is checked back to that root. Every
ancestor read first requires a fresh fixed-index `has`, even in register
mode. Missing or archived proof, unavailable declaration custody and a
spent deadline return `retry/dependency-unavailable` before child activation.
Malformed or wrong-root creation is refused; no archive or `source()`
fallback is used. The single attempt allows at most 16 bodies, 1 MiB combined bytes,
64 source attempts, 512 visits and one monotonic ten-second deadline.
The receiving scope still makes its ordinary full genesis judgment. This
does not revalidate existing scopes for ordinary reads or acts against a
new register pin. The local/test opening is not a deployment recommendation.

`:scope` is a scope ID. Other colon names denote one path segment. `*`
denotes the matched path family, including paths that the family later refuses.
The `/site/*` family includes directory redirects, `versions`, and
`:directory/:ref/*path`. The `/applications/*` family validates
`:directory/:item/:presentation/*asset`, including its redirect and
`_/context`. Brand names come from `apps/room/brand/assets.ts`.

The scope rows use these shared descriptions:

- **Activation**: a well-formed scope ID selects a Durable Object before the
  gate. Construction can create SQLite tables and indexes, and schedule signer
  maintenance. It runs no legacy migration quantum in the read itself.
- **Restart retry**: the legacy read methods, sessions, stream, settlement,
  credential, and snapshot call `ScopeObject.#first` before their gate.
  This can schedule previously sealed parked or reaccepted Operations. Their
  writes and configured host calls can occur in the background even when the
  caller's read is refused. This does not authorize a new caller effect.
- **Legacy read preparation**: session MAC and membership-reference work,
  or signed-read verification and a retained causal-chain walk. Some walks
  reach other scope objects. The checked result is still restricted by the
  route's read gate. Query and projection use their separate bounded flights.
- **Read bounds**: `READ_BOUNDS` in
  [reads.ts](../../packages/scope/src/reads.ts), with the constants in the
  contract. Pagination bounds output, not all earlier activation or chain work.
- **Turn bounds**: `PROPOSED_BOUNDS` in
  [bounds.ts](../../packages/contract/src/bounds.ts). Submit reads foreign facts
  and runs the timed drain before check 9 can refuse authority. Rule expression
  evaluation follows that check. Public parentless creation and signed reads
  first use the fixed serving windows below. Joins retain their membership-local
  failed-address window and also count verified-key failures without an address.

The join, creation, signed-read and MCP bearer-failure windows use
[`addressKey`](../../packages/bytes/src/address.ts). Address spellings are
canonicalized before counting; IPv6 zones do not distinguish clients.

| Address form | Counter key |
|---|---|
| IPv4, including IPv4-mapped IPv6 | Full IPv4 address, prefixed `v4:` |
| Link-local IPv6 (`fe80::/10`) | All 128 bits, prefixed `v6l:` |
| Unique-local IPv6 (`fc00::/7`) | All 128 bits, prefixed `v6u:` |
| Other IPv6 | First 64 bits, prefixed `v6:` |

The IPv6 `/64` grouping limits address rotation in routable space. Local
clients keep separate windows within one subnet. MCP checks the raw address's
64-character and 64-UTF-8-byte bounds before canonicalization. Missing and
invalid MCP addresses share one failure window; they do not bypass the limit.
The [public Site window](#public-site-address-window) keeps its separate policy.

Fresh submitted acts also pass deployment admission in
[applications/act-admission.ts](../../packages/scope/src/applications/act-admission.ts).
HTTP, service-binding, and direct native calls reach this same Core gate.
Before a new act reads foreign dependencies, the host identifies its installed
release from immutable native creation records and checks current
`APPLICATION_TRUST`. It checks trust again before writing the act. Accepted
keys retain their receipt and mismatch behavior. Native platform scopes and
proved unpackaged creations are exempt. Withdrawal returns
`application-revoked`; incomplete proof returns `dependency-unavailable`.

The ancestry walk admits at most 18 ancestors, 37 bodies, 16 MiB of body
bytes, and 36 native RPCs, with a 1 MiB per-body limit. The local birth uses
the existing preparation allowance. One ten-second flight owns unresolved
native work; a caller timeout does not release it. Only immutable provenance
is cached. No package, R2, Git, or provider read belongs to this gate.
The gate writes no entry. Activation and existing background work keep their
separate behavior described above.

For preparation requests, [core.ts](../../packages/scope/src/core.ts) verifies
the signature before starting the turn. [turn.ts](../../packages/scope/src/turn.ts)
then drains due timed work before
[judgePreparation](../../packages/derive/src/prepare.ts) makes the final
capability and grant decision. A refused preparation can therefore follow
newly sealed timed entries. `ScopeObject.prepare` passes even a refused answer
through `#sent`, which schedules the driver and Operations dispatch. Those
background passes can make configured provider calls for sealed work even
when preparation is refused. The caller's preparation entry still needs its own capability
and grant checks.

Every room request first runs measured-request setup, URL-byte admission, and
credential-in-URL refusal. Measurement can write operational metrics; scope
invocation instrumentation can retain bounded request-index control data.
A fixed `ScopeIndex` instance also owns a separate memory-only serving action.
It does not change `has()`, registration or ancestry admission. Parentless
creation counts bounded attempts at 10 per verified key and 30 per trusted edge
address per hour; signed reads count 240 per key and 600 per address per minute.
A valid signature proves custody for accounting, not native authority. Invalid
signatures charge no claimed key. Every eligible request is counted once before
index/target lookup or protected proof work; native checks still run fresh.
Actual outer edge fetch supplies the platform address out-of-band.
In-process API calls and hosted fetch supply null and ignore synthetic
forwarded headers.
The table holds at most 8192 windows, removes only expired entries and refuses
new identities at capacity. Churn cannot evict a live address counter. Actual
object restart/eviction resets memory; this is not durable global accounting.
Invalid settings or missing serving binding fail closed. Rate-limited creation
and signed reads answer 429; original join serving status remains unchanged.
Session issuance/session reads and internal verified child delivery keep their
existing semantics. No public counter/index/admin/status route is added.
The three Worker configs name the four nonsecret `SERVING_*` overrides; the
implementation note records bounds, kernel review and the original local
startup measurements: Page had 10 fixed-owner Signed admissions; hosted MCP
legacy and modern had 3 and 2. Session dispatch is counted separately. These
are attributed native fixture observations, not browser DOM, production
address or throughput measurements; union startup verification is pending.

Tables describe route work in addition to that shared setup. HTTP POST bodies
on the scope API are read as JSON within 1 MiB before object dispatch. A
verified creation can retain its genesis even when its founding act is refused. Its
credential, session, projection, and query answers carry `no-store`.

`POST /v1/scopes/:scope/reservation-snapshot` accepts the legacy `{signed}`
body and the successor `{signed, stage: true}` body at the same membership gate.
The hint selects the proof format and grants no authority. The successor requires
the actual Native17 admission, full job identity, current checker key and source.
Room jobs also read fresh Rules13 observations before Git access and before the
answer. RulesContent revision 21 carries the service mark and scoped generation.
Earlier definitions retain their exact observation grammar. The host also
authenticates the bounded canonical policy value against the extents digest.
The full Rules reference, current service mark and generation, and check
name, configuration and checker must match the admitted binding. Member jobs do
not depend on the room service mark.

Each stage eligibility read sequence bounds the combined Rules, key and work
source awaits to ten seconds. The final sequence checks Rules before key and
source state, then checks current Native admission without another await. A
released work source refuses a fresh snapshot. Source release neither cancels nor
drains an existing run. Snapshot reads leave Native authority state unchanged.
Stage proof bytes are limited to 262144, excluding object bodies. Object bodies
are limited to 16 MiB combined and 4096 objects, with the existing per-object
read bounds. The HTTP reply has a separate 24 MiB wire limit. These transport
limits do not enlarge Native budgets or prove deployed throughput.

With a retained journal floor, the existing read and exact-intent gates still
apply. Entry, history, log, settlement, and exact accepted-intent retries can
return the current archive receipt with HTTP 410. History and log cursors below
the floor resume at the floor; kept entries remain readable. An archived
foreign source fact instead refuses creation or submission before authority
observation and the turn. These answers fetch no clone and grant no new authority. Sparse
retained and causal-chain walks preserve the existing signing and membership
checks. Floor writes belong to an explicitly configured alarm path and do not
run as pre-gate read work. There is no public floor route.

Hosted agent enrollment can also return an archived 410 after its existing
control gate. It preserves the archive location and a fact only when supplied,
and stops before receipt read-back, standing observation, or bearer issuance.
An archived custody outcome is terminal: it neither resends the enrollment nor
confirms acceptance without archive verification. The route's control gate
class is unchanged.

The three room configurations all name [worker.ts](../../apps/room/worker.ts),
which re-exports the scope classes and the default fetch from
[apps/room/fetch.ts](../../apps/room/fetch.ts). That fetch composes health,
MCP, application screens, demo offers, sites, the room page, brand files, and
scope routes. The default export in `packages/scope/src/worker.ts` is not
the deployed room fetch.

## artroom-scope

Configuration: [apps/room/wrangler.jsonc](../../apps/room/wrangler.jsonc).

Entry: `apps/room/worker.ts` → `apps/room/fetch.ts`. Hosted MCP is reachable
when both committed namespaces are bound, `MCP_ENABLED` is exactly `"true"`,
and `MCP_TOOL_ADDITIONS` is absent or valid. Application redirects require
`APPLICATION_SCREEN_HOSTS`; sandbox rendering additionally requires
`APPLICATION_TRUST`. Demo offers require `DEMO_START_CONFIG`. Missing or invalid
settings refuse those families. The table records source reachability with
valid required settings, not whether a particular public room exists.

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
The Start offer requires `DEMO_START_CONFIG`, its configured origin and exact
register root. Application redirects, sandbox rendering and publication
still require their existing settings and authority checks. This table
records shared source reachability with valid required settings, not a
probe of live settings or proof that an optional feature is enabled.

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
`apps/room/fetch.ts`. The Grow wrapper forwards the same default HTTP handler.
Hosted MCP is reachable
when both committed namespaces are bound, `MCP_ENABLED` is exactly `"true"`,
and `MCP_TOOL_ADDITIONS` is absent or valid. Application redirects require
`APPLICATION_SCREEN_HOSTS`; sandbox rendering additionally requires
`APPLICATION_TRUST`. Demo offers require `DEMO_START_CONFIG`. Missing or invalid
settings refuse those families. The table records source reachability with
valid required settings, not whether a particular public room exists.

The wrapper also supplies explicit archive wiring to its Durable Object class.
For admitted public journals, object activation and sealed entries schedule
bounded archive work through the existing alarm. That work can read checked
births and the admitted directory/destination items, persist retry and Mark
bookkeeping, mint a short-lived Artifacts write token, send Git objects and
read back the ref. It uses the existing archive bounds and the original
per-pass allowance. These background effects can follow an activation even
when the caller's HTTP read is refused; they do not grant the caller archive
access. Register and Membership journals remain excluded. Generic and lending
entries do not enable this wiring, and production retained floors remain off.

Birth proofs, target item replies, pin SQL payloads, migration reply buffers
and parent-frontier ownership reserve their full read ceiling before I/O. A successful bounded
receipt settles metadata and proportional input work to received bytes;
an unavailable or failed read stays charged in full. Operation counts and
the original deadline do not change. Fixed processing fees and transport
input-work tariffs retain their existing charges.

Migration reply buffers settle against completed bounded POST response bytes.
GET advertisements keep their separate fixed fee. A transport byte receipt
does not certify validation: the archive owner settles only after the pack,
object type, size and original authority/deadline fences have passed.

The pass diagnostic's `reservationCosts.metadataReserved` is metadata
admitted before refunds. `metadataSettled` is the current charge, including
outstanding reservations at their full ceilings; `unsettledMetadata` names
that outstanding subset. `settlementRefusal` is `none`, `invalid-received`
or `unknown-reservation`. These copied scalars and the observation's net
site attribution grant no admission or authority.

The internal `archiveItem` namespace port has no HTTP route. Its raw helper
accepts trusted host input; the complete target birth walk and admitted binding
supply its authority boundary. The table below adds no public archive route.

New archive passes publish bounded descriptive replay anchors in their
existing manifests. These lists do not grant trust. The alarm floor writer
requires complete confirmed publication coverage before it offers deletion;
legacy receipts default to uncovered. Pending Marks bind their exact public
scope identities for retry, including the Directory-checked reference-only
Rules identity in Room mode. This metadata replaces no source or host check.

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
`APPLICATION_CONTENT` binding and trust setting; the committed config has neither.

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
Entry: `apps/sandbox/worker.ts`. Only exact configured HTTPS installation hosts
under `*.inguz.space` are reachable; `SCREEN_HOSTS=[]` refuses by default.
`ROOM`, `GROW` and `LENDING` bind fixed services and the named
`ApplicationScreenService` entrypoint. Each request checks the complete descriptor
against `screenHost` before `screen`, `native` or the stream-only `nativeStream`. Those RPC methods have no
public Room HTTP route. `screen` verifies the room origin and installation path
before private rendering; `native` repeats the finite gateway matcher before
ordinary native dispatch. All three native-reading service methods use the
same fixed indexed namespace as the room routes. Eligible Signed reads retain
the verified-key serving admission; synthetic service calls have no trusted
address. Both stream entry paths refuse Signed readers before target lookup.
They confer no new membership authority.

The native rows below retain their ordinary gate classes. The sandbox cannot
forward parentless creation, arbitrary upstream URLs or unrelated methods.
Browser cookies and response Set-Cookie are not forwarded. Native authorization
headers and signed bodies retain the canonical room origin. A forwarded address
is Cloudflare edge metadata, not caller identity.

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

This is structural source coverage. The separate R8 branch records adopted
owner seals, scoped compilation and inventory checks, native binding checks,
nine local browser custody cases and four rendered Page cases. R12 records
its own scoped index, serving and startup checks. Those branch outcomes do not
validate this source union. The union now has its actual adopted owner seals;
four affected compiler roots and 14 cases across seven whole files passed.
Its maintained Page build, separate DATA comparison and four rendered Page
checks also passed. Its original ordinary gate passed hosted startup and
Page freshness, but failed two MCP documentation-inventory assertions.
Final review must record the narrow correction and downstream Node stages
separately. These local outcomes and their original heads are recorded in the
[union implementation note](../../notes/implementation/2026-10-22-security-union.md).
Hosted deployment and operator rollout remain separate
obligations; no hosted isolation claim follows from the local browser cases.

## dap-grow-simulator

Configuration: [examples/grow/wrangler.jsonc](../../examples/grow/wrangler.jsonc).

Entry: [simulator-worker.ts](../../examples/grow/simulator-worker.ts) →
`simulatorHost` in [simulator-host.ts](../../examples/grow/simulator-host.ts).
Its fetch returns 404 for every method and path. `workers_dev` and preview URLs
are disabled and the config declares no public route. The wildcard below
records that refusal if invoked through a test or platform transport.

The separate platform-controlled scheduled event runs each minute. It verifies
the packet, parses the configured HTTPS origin and principals, checks two
distinct agent secrets, obtains membership sessions, and runs the tick. It has
no local durable state. Per tick it allows 96 reads, 48 writes, 256 KiB request
bytes, 4 MiB reply bytes, and 45 s, with a 5 s SDK deadline per request. Outbound
HTTP stays on the configured service and allowed scope paths. These cron
actions are not reachable through fetch.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `* /*` | `none` | Return a fixed 404 response | None | Fixed response body | None |

## dap-home

Configuration: [homepage/wrangler.jsonc](../../homepage/wrangler.jsonc).

Entry: Cloudflare static assets from `homepage/assets`, built by
[homepage/build.mjs](../../homepage/build.mjs). There is no `main` script or
repository fetch handler. The platform asset adapter handles files, HTML
trailing-slash redirects, and the configured 404 page. Unknown files return
404. Other methods have no application action. This row is configuration
evidence for the platform adapter, not an in-tree runtime witness.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /*` | `none` | Platform asset selection | None | Finite deployed asset set; platform serving limits | None |

## Unread read-token custody

Only the trusted destination `mint-read` adapter enrolls newly minted member
read tokens for local plaintext expiry. A durable marker binds the full scope
and incarnation, token ID, mint operation, attempt and provider-reported end.
The native alarm processes bounded backfill and due-queue quanta; delivery is
not an exact-wall-clock guarantee. Taking or dropping plaintext keeps its
metadata and does not revoke the provider token. Generic write-token plaintext
stays available for provider revocation, even if its ID resembles a read handle.

Planner decision `21a8e35b103dd0280ea711d78d167db0d355cafd` accepts partial
legacy coverage. An untagged row needs bounded retained current-incarnation
mint-read, opening and confirmed-outcome proof before enrollment. Rows with
missing, pruned, oversized, invalid or unproved old-incarnation evidence remain
retained because no safe retained discriminator separates them from write
credentials. A held legacy read confirmed after its once-through backfill scan
also remains retained; confirmation alone does not enroll it. All newly minted
explicit read tokens are queued. No complete legacy cleanup is claimed.

Current [Artifacts minting](../../packages/scope/src/artifacts-host.ts) sends
the requested read lifetime to the provider and records its returned
`expiresAt`. Current [GitHub minting](../../packages/scope/src/github-host.ts)
records the installation token's provider-reported expiry rather than sending
the requested seconds; the [client](../../packages/git/src/github.ts) requires
a future expiry within 65 minutes of its clock. These adapter checks do not
prove deployed provider enforcement or an unknown legacy row's origin or expiry.
See the [implementation note](../../notes/implementation/2026-10-24-read-token-expiry.md)
for the bounded maintenance and pending validation limits.

## Public Site address window

After method, credential-in-URL and path bounds, every valid `/site` GET
(including redirects, versions and conditional reads) reserves an address
attempt at the existing fixed `SCOPE_INDEX` serving object before room,
publication or provider work. Its separate counter admits 240 attempts per
fixed 60-second window and retains at most 4096 active keys. Addresses have a
64 UTF-8-byte bound before RPC serialization and in the owner. Only the outer
platform fetch forwards Cloudflare's `CF-Connecting-IP`; this relies on the
platform setting that header. Synthetic and service-binding callers cannot
select a bucket by putting a header on their supplied Request: without an
explicit trusted transport address they share one internal missing-address
bucket. No caller-supplied address grants authority.

A full live table refuses a new address; it never evicts an active window.
Only expired windows are reclaimed. Quota, capacity or invalid address refusal
answers 429 with `Retry-After: 60` and `Cache-Control: no-store`. A missing or
unavailable fixed index answers 503 without selecting the room or provider.
The existing creation and signed-read counters keep their own accounting.
The single fixed owner shares the window across Worker ingress isolates;
its counters are memory-only and reset when that owner is evicted or replaced.
This is a serving bound, not a durable quota or a global network limit.

## Witness and limits

Run `node --test scripts/security-entry-points.test.mjs`. The root test command
also runs it once. The witness derives route names and HTTP methods from the
actual matcher syntax, not this page. It executes the scope and MCP dispatchers
with boundary stand-ins, enumerates the scoped matcher's literal path partitions,
and reads public prefix, equality, switch, and method matchers. Rows must match
in both directions, including the reviewed operation's gate class. Missing,
extra, duplicate, or differently gated rows fail.

The hosted matcher uses its real deployment policy with explicit valid opt-in.
A disabled-policy control removes only hosted rows and fails against this
unchanged enabled-deployment table. That control proves structural dispatch,
not a deployed setting or a native grant decision.

The room entry model accepts only the exact generic/lending entry and the
Grow wrapper’s two-hop default re-export chain. The local celld project adds
an exact two-export shim to the same room entry. It does not follow arbitrary
module re-exports. Whole-owner seals separately cover the wrapper and archive
configuration, target, host-item and provider boundaries.

Source seals guard the finite extraction grammar, deployed composition, and
reviewed gate owners. A matcher or gate-owner edit fails closed for inventory
review even when the probe does not model its new syntax. A seal update alone
is not evidence: check the route partition and gate classification, update
the table, and review the exact source. Comments and source locations are
excluded from seals. The in-memory control changes a real matcher while
leaving this page unchanged and observes a bijection assertion failure.
The snapshot body witness executes both actual dispatch branches and requires
one membership-classified route row. It adds no duplicate route for the hint.
Seals cover their selected source only; imported implementations are not
covered transitively. The successor stage read, checker origin verifier,
binding codec and detached checkout verifier each have an explicit owner
seal. Native version pins and owning tests provide separate evidence for
the imported policy and admission rules.

This is structural drift evidence. Stand-ins prove dispatch, not Durable
Object behavior, authentication, storage bounds, credential custody, outbound
ordering, or the platform asset adapter. Existing native and pure gate tests
remain their evidence. The pre-gate work, state, and outbound columns come
from source review; the witness checks that all columns are present but does
not prove those descriptions. Changes in runtime settings need the settings
and deployment review as well.

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

The sandbox stream-only named RPC returns the ordinary response plus a close capability for that exact already-authorized subscription. The capability accepts no target or stream ID. Gateway cancellation waits, within the existing transport window, for its idempotent release acknowledgement before completion; RPC stub disposal is separate and is not an acknowledgement. No public HTTP route or header is added. The only named production RPC entrypoint is `ApplicationScreenService`, bound to the sandbox Worker.
