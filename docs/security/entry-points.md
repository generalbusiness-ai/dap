# Worker entry points and gates

This reference inventories the five Worker configurations named by D1 in this repository.
It describes source at this revision, not a probe of deployed settings. It closes
security finding 2.5 in request `6dd06d03`.

A gate class names the weakest proof that can obtain the route's protected
result. It does not imply that the gate runs before object activation or all
other work. For `none`, the work and state columns cover the whole request.
Refusals and unsupported methods are not additional routes.

- **none**: no caller identity or membership proof. Publication and package
  trust checks can still restrict the bytes served.
- **self-signed**: a valid signature, without a current membership grant.
  Any fresh key can sign a creation. Signed reads additionally need an eligible
  local or causal signing history. A settlement needs the exact previously
  accepted signed intent. These restrictions do not establish membership. The six signed-read routes
  also accept scoped sessions for their ordinary complete reads.
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
  evaluation follows that check. There is no general creation or signed-read
  address limit. Join limits apply only when a usable caller address exists.

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
Tables describe route work in addition to that shared setup. HTTP POST bodies
on the scope API are read as JSON within 1 MiB before object dispatch. A
verified creation can retain its genesis even when its founding act is refused. Its
credential, session, projection, and query answers carry `no-store`.

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
when both committed namespaces are bound. Application screens also require
`APPLICATION_TRUST`; demo offers require `DEMO_START_CONFIG`. Missing or invalid
settings refuse those families. The table records source reachability with
valid required settings, not whether a particular public room exists.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; cached register readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Publication proof, room and repository reads; render | Activation; provider read-token mint and attempted revoke | 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof; no address rate limit | Scope RPC; configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address, trust, room, installation and packet checks | Activation; bounded in-memory packet cache | 8 KiB path; fetchSeconds deadlines; two cached packets per bucket; PROPOSED_BOUNDS packet limits | Scope RPC; private R2 reads |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `POST /v1/scopes` | `self-signed` | JSON, seed computation, object selection, signature | Activation; genesis is written only after signature verification | 1 MiB body; turn bounds; no creation rate limit | Scope namespace; creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/acts` | `membership` | JSON, signature, state and foreign-fact reads, authority observation, timed drain | Activation; timed entries and join serving counters can precede authority refusal | 1 MiB body; turn bounds; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Foreign scope RPC before grant refusal; configured host effects after sealing |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation; timed drain before final capability and grant decision | Activation; due timed entries can be sealed before capability or authority refusal | 1 MiB body; turn and capability-step bounds | Authority scope RPC before grant decision; driver and dispatch may call configured providers for sealed timed work even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; checker read up to 10 s; provider bounds | Job and membership RPC before checker decision; Git reads after it; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; legacy read preparation and holder-key check | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, bearer ID parse, agent activation, failure-window check, bearer digest | Agent schema initialization; in-memory bearer-failure windows | 10 failures per address per minute; 1 MiB hosted body after bearer; MCP session and stream bounds | Agent RPC; authenticated tools can call scope and configured Git hosts |
| `POST /mcp/agents` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `DELETE /mcp/agents/:agent` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |
| `POST /mcp/agents/:agent/bearer` | `control` | Control header shape and action binding; bounded raw body; object activation; expiry sweep; signature and authority | Registry or agent schema; expired control-answer cleanup before signature | 64 KiB body; 16 MiB control budget with 1 MiB retirement reserve; no control rate limit | Registry or agent RPC; authority RPC; enrolment follows authorized creation |

## dap-grow

Configuration: [apps/room/wrangler.grow.jsonc](../../apps/room/wrangler.grow.jsonc).

Entry: `apps/room/worker.grow.ts` → `apps/room/worker.ts` →
`apps/room/fetch.ts`. The Grow wrapper forwards the same default HTTP handler.
Hosted MCP is reachable
when both committed namespaces are bound. Application screens also require
`APPLICATION_TRUST`; demo offers require `DEMO_START_CONFIG`. Missing or invalid
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

The internal `archiveItem` namespace port has no HTTP route. Its raw helper
accepts trusted host input; the complete target birth walk and admitted binding
supply its authority boundary. The table below adds no public archive route.

| Route and method | Gate class | Work before the gate | State written before the gate | Bounds | Outbound calls |
|---|---|---|---|---|---|
| `GET, HEAD /health` | `none` | Parse settings; cached register readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Publication proof, room and repository reads; render | Activation; provider read-token mint and attempted revoke | 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof; no address rate limit | Scope RPC; configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address, trust, room, installation and packet checks | Activation; bounded in-memory packet cache | 8 KiB path; fetchSeconds deadlines; two cached packets per bucket; PROPOSED_BOUNDS packet limits | Scope RPC; private R2 reads |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `POST /v1/scopes` | `self-signed` | JSON, seed computation, object selection, signature | Activation; genesis is written only after signature verification | 1 MiB body; turn bounds; no creation rate limit | Scope namespace; creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/acts` | `membership` | JSON, signature, state and foreign-fact reads, authority observation, timed drain | Activation; timed entries and join serving counters can precede authority refusal | 1 MiB body; turn bounds; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Foreign scope RPC before grant refusal; configured host effects after sealing |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation; timed drain before final capability and grant decision | Activation; due timed entries can be sealed before capability or authority refusal | 1 MiB body; turn and capability-step bounds | Authority scope RPC before grant decision; driver and dispatch may call configured providers for sealed timed work even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; checker read up to 10 s; provider bounds | Job and membership RPC before checker decision; Git reads after it; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; legacy read preparation and holder-key check | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |
| `POST, DELETE, GET /mcp` | `bearer` | Origin refusal, bearer ID parse, agent activation, failure-window check, bearer digest | Agent schema initialization; in-memory bearer-failure windows | 10 failures per address per minute; 1 MiB hosted body after bearer; MCP session and stream bounds | Agent RPC; authenticated tools can call scope and configured Git hosts |
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
| `GET, HEAD /health` | `none` | Parse settings; cached register readiness lookup | Activation of configured register; probe cache | No query or body; 2 s probe; 5 s cache | Configured register RPC; no provider call |
| `GET, HEAD /page` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /page/page.js` | `none` | Method and path checks; embedded asset lookup | None | Fixed embedded assets | None |
| `GET, HEAD /brand/*` | `none` | Method and asset-name lookup; base64 decode | None | Fixed embedded asset map | None |
| `GET /site/*` | `none` | Publication proof, room and repository reads; render | Activation; provider read-token mint and attempted revoke | 1 MiB file; 64 path segments; 8 KiB path; bounded publication proof; no address rate limit | Scope RPC; configured Git host, including Artifacts token calls |
| `GET, HEAD /applications/*` | `none` | Address, trust, room, installation and packet checks | Activation; bounded in-memory packet cache | 8 KiB path; fetchSeconds deadlines; two cached packets per bucket; PROPOSED_BOUNDS packet limits | Scope RPC; private R2 reads |
| `GET /v1/demo/creation-offer` | `none` | Demo config and origin checks; register projection | Activation of configured register | Exact current or legacy register; GET only | Configured register RPC |
| `POST /v1/scopes` | `self-signed` | JSON, seed computation, object selection, signature | Activation; genesis is written only after signature verification | 1 MiB body; turn bounds; no creation rate limit | Scope namespace; creation follow-up after sealing |
| `GET /v1/scopes/:scope` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/retained/:kind/:digest` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `POST /v1/scopes/:scope/sessions` | `membership` | JSON, activation, restart retry; config, signature, scope, clock and key-standing checks | Activation; prior-work retry; replay row written only after standing passes | 1 MiB body; request lifetime 900 s; session 600 s; 64 answered requests per key | Prior-work retry only |
| `GET /v1/scopes/:scope/stream` | `session` | Activation, restart retry; legacy read preparation; session check | Activation; prior-work retry; subscription after gate | 64 streams per scope; one pending head per stream; session checked before send | Membership-reference RPC; prior-work retry |
| `GET /v1/scopes/:scope/incidents` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/requests` | `admin` | Query identifiers, activation; session preparation and admin check | Activation; no legacy restart retry in this method | 100 rows per page; bounded request-index retention | Membership-reference RPC; no direct Git provider |
| `GET /v1/scopes/:scope/application-projection` | `session` | Wire admission; session-header bound; bounded flight and session preparation | Activation; bounded flight and preparation caches | APPLICATION_PROJECTION_WIRE_BOUNDS; projection, source and SQL budgets | Bounded membership, birth and declaration RPC; no Git provider |
| `GET /v1/scopes/:scope/query-items` | `self-signed` | Wire admission; header bound; signed or session authentication; bounded query flight | Activation; bounded flight and preparation caches | ITEM_QUERY_WIRE_BOUNDS and query budgets; no legacy activation turn | Bounded membership or causal-proof RPC; no Git provider |
| `POST /v1/scopes/:scope/acts` | `membership` | JSON, signature, state and foreign-fact reads, authority observation, timed drain | Activation; timed entries and join serving counters can precede authority refusal | 1 MiB body; turn bounds; joins: 10 failures per 60 s, 4096 address windows, 8 waiting checks | Foreign scope RPC before grant refusal; configured host effects after sealing |
| `POST /v1/scopes/:scope/preparations` | `membership` | JSON, pinned definition and signature verification; capability grant observation; timed drain before final capability and grant decision | Activation; due timed entries can be sealed before capability or authority refusal | 1 MiB body; turn and capability-step bounds | Authority scope RPC before grant decision; driver and dispatch may call configured providers for sealed timed work even when preparation is refused |
| `POST /v1/scopes/:scope/settle` | `self-signed` | JSON, activation, restart retry; exact accepted-intent lookup | Activation; prior-work retry | 1 MiB body; exact actor and idempotency digest | Prior-work retry only |
| `POST /v1/scopes/:scope/reservation-snapshot` | `membership` | JSON, activation, restart retry; signed job and current checker verification | Activation; prior-work retry; no new staging or publication write | 1 MiB body; signed deadline up to 900 s; checker read up to 10 s; provider bounds | Job and membership RPC before checker decision; Git reads after it; prior-work retry |
| `GET /v1/scopes/:scope/items/:type` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/history` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/entries/:seq` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/outbox/:duty` | `session` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/log` | `self-signed` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/diagnosed` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/waiting/unanswered` | `admin` | Activation, restart retry; legacy read preparation before final read check | Activation; prior-work retry; preparation can update control caches | Read bounds; signed-read causal-chain bounds; no signed-read address limit | Membership and causal-chain scope RPC; prior-work retry |
| `GET /v1/scopes/:scope/credential/:handle` | `session` | Activation, restart retry; legacy read preparation and holder-key check | Activation; prior-work retry; credential consumed only after holder passes | Read bounds; one read before credential end | Membership-reference RPC; prior-work retry |

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

## Witness and limits

Run `node --test scripts/security-entry-points.test.mjs`. The root test command
also runs it once. The witness derives route names and HTTP methods from the
actual matcher syntax, not this page. It executes the scope and MCP dispatchers
with boundary stand-ins, enumerates the scoped matcher's literal path partitions,
and reads public prefix, equality, switch, and method matchers. Rows must match
in both directions, including the reviewed operation's gate class. Missing,
extra, duplicate, or differently gated rows fail.

The room entry model accepts only the exact generic/lending entry and the
Grow wrapper’s two-hop default re-export chain. It does not follow arbitrary
module re-exports. Whole-owner seals separately cover the wrapper and archive
configuration, target, host-item and provider boundaries.

Source seals guard the finite extraction grammar, deployed composition, and
reviewed gate owners. A matcher or gate-owner edit fails closed for inventory
review even when the probe does not model its new syntax. A seal update alone
is not evidence: check the route partition and gate classification, update
the table, and review the exact source. Comments and source locations are
excluded from seals. The in-memory control changes a real matcher while
leaving this page unchanged and observes a bijection assertion failure.

This is structural drift evidence. Stand-ins prove dispatch, not Durable
Object behavior, authentication, storage bounds, credential custody, outbound
ordering, or the platform asset adapter. Existing native and pure gate tests
remain their evidence. The pre-gate work, state, and outbound columns come
from source review; the witness checks that all columns are present but does
not prove those descriptions. Changes in runtime settings need the settings
and deployment review as well.

Gate owners: [core.ts](../../packages/scope/src/core.ts),
[judge.ts](../../packages/derive/src/judge.ts),
[sessions.ts](../../packages/scope/src/sessions.ts),
[reads.ts](../../packages/scope/src/reads.ts),
[signed-reads.ts](../../packages/scope/src/signed-reads.ts),
[item-queries.ts](../../packages/scope/src/item-queries.ts),
[applications/projection.ts](../../packages/scope/src/applications/projection.ts),
[destination-host.ts](../../packages/scope/src/destination-host.ts), and
[hosted.ts](../../packages/mcp/src/hosted.ts).
