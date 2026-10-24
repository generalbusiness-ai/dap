# Public Site address window

Request `a4ba3fbc8045c07ad5b8998fb3c6d7febce07e43`, promise
`a914d7ea8cb90ff35dee7d0439194e6083778e43`, implements only item 2 of parent
`908786011e5c0acae29e7b2a7c70b87b0680a948`.

Valid `/site` GETs reserve an address attempt through the existing fixed
`SCOPE_INDEX` serving RPC after credential, method and path bounds, before
room, publication or provider work. Redirects and conditional reads count too.
A separate counter allows 240 attempts in a fixed 60-second window, at most
4096 active keys, and 64 UTF-8 bytes per address. New-address churn cannot evict
a live window. Missing addresses share an internal public-site bucket; they are
not converted to an invented IP address. Backward clock readings cannot reset
an active window. Expired-prefix reclamation examines at most 4096 entries.

The shared fixed owner prevents fresh environment/proxy objects and different
ingress isolates from resetting a window. It stores no counter in SQLite;
owner eviction/replacement resets memory. The bound does not establish a
persistent quota or distributed network-wide rate. Existing creation and
signed-read counter semantics are unchanged.

Only actual platform fetch entry points in the scope and room Workers pass
Cloudflare's trusted connecting-address header. Direct/synthetic and screen
service requests default to the shared missing bucket, ignoring forwarded
headers on their supplied Request. Correct address provenance depends on the
Cloudflare ingress contract; this is not independent proof of a caller's IP.

Refusals are finite and contain no address or provider detail: quota/capacity
and invalid address answer 429, `Retry-After: 60`, and no-store; absent or
unavailable index answers 503 before target/provider work. The three maintained
configs already bind `SCOPE_INDEX` to `ScopeIndex`: artroom-scope, dap-grow and
dap-lending. No new setting, binding or migration is introduced. Local/test
callers without that existing binding now get 503 for valid Site reads.
The planner owns any deployment after review; none is performed here.

Two pure witnesses cover exact expiry, missing-address accounting, UTF-8,
capacity and active-window preservation. The existing real fixed-object witness
uses separate stubs, checks unchanged SQLite schema and actual eviction reset.
The existing Site refusal case traps room/provider work after quota and missing
owner, with fresh environment wrappers and ignored synthetic headers. Existing
publication/render fixtures add only the existing index binding and explicit
fixture-owned address, avoiding artificial cross-fixture quota sharing; their
assertions and scenarios remain unchanged.

The maintained producer computed all five owner seals at clean
`a14daa75e41dc44f727ca7b2ffa4d065fe26c999`, tree
`286f5583b73a3b7c04dae084d8dcc79dffa14c46`. Its pinned Source, tools and clean
checkpoint agreed before and after the calls. Four existing map values and
one new Site-window row were adopted from
`/private/tmp/artroom-r4-site-window-seal-actual-20261024-v1.json`.
Affected compilers/tests, the gate and exact-head review remain unrun. R4 token reuse,
R13 expiry/member quota and R10/R11 trust remain separate. Archive work retains
priority over validation of this slice.
