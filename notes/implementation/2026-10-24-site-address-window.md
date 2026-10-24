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

## Verification

The private dependency copy retained the existing lock and target-owned
workspace links; no install or package upgrade was used. The one maintained
compatibility command accepted `@cloudflare/vitest-pool-workers` 0.22.0,
reported `copied: false` and found the already-patched supported bundle.

The maintained producer computed five owner seals at clean
`a14daa75e41dc44f727ca7b2ffa4d065fe26c999`, tree
`286f5583b73a3b7c04dae084d8dcc79dffa14c46`, with matching pinned Source,
tools and checkpoint before and after. Four replacements and the new
Site-window row were adopted under
`53d1d6bdc3b7e3cd26b78e1d3f312d03139d2a46`, from
`/private/tmp/artroom-r4-site-window-seal-actual-20261024-v1.json`.
All five Sources and seals remain unchanged through this validation.

| Original invocation | Actual result |
| --- | --- |
| `2371` affected validation | Scope production passed; Scope test failed TS2339. Lane/page compilers and all 56 cases were unrun. |
| `85584` continuation | Three remaining compilers and body exited 0; 54 PASS, two ordinary recorder SKIP. Strict owner exited 1. |
| `91308` quota control | Owner 0, child 1; both whole-file cases failed at the intended assertions. |
| `17391` route control | Owner 0, child 1; 14 PASS and one intended failure in the whole 15-case file. |

The original compiler failure remains evidence. The test-only startup
observer's former two-way branch read `signed` from the new `site-read`
variant. Commit `39199508cef0561e2c0089eea48e4d8fed55b91d` narrows that
branch to `creation`; signed-read verification, the one original admission,
address observations and returned decisions remain unchanged. Only the
helper and this note changed. The continuation carried the already-passed
production compiler and repeated neither it nor compatibility preparation.

The two skips are the unchanged demo capture recorder and page screenshot
recorder. No recorder was enabled or file filtered. The reporter retained
56 start callbacks, 55 result callbacks, complete end/JSON states and zero
unhandled errors. The passed file-publication case lacks a result callback;
its passed end/JSON evidence is retained, without inventing that callback.
The strict wrapper failure remains. Root manually accepted the exact
semantic result and both window cases and all 15 route cases under
`1bd317b030ddf22a699044e5b152809f5e565318`.

The quota mutation changed `>=` to `>`: actual `true` versus expected
`false` at `site-window.test.ts:8:38` and `29:39` distinguishes attempt 241
and an exhausted address after key churn. The route mutation ignored
`rate-limited`: actual 404 versus expected 429 at
`site-route.test.ts:526:115`. Its later quota assertion at line 533 was
unreached; the missing-room stand-in performed no provider fetch. These
are counter and route-order witnesses, not deployed edge or provider proof.
Both controls retained complete case IDs/callbacks, zero unhandled errors
and exact original source bytes, device, inode, mode, size and modification
time after restoration. Target change time changed; only the declared
cache contents/times and existing empty temporary-directory times could
vary. Root accepted both independently audited outcomes under
`e142392c5b058e03a2921490449a41c9354f9b7b`.

Closed evidence and audits:

- Validation: `/private/tmp/artroom-security-r4-site-window-affected-validation-evidence-20261024-v1` and `-v2`; audit `/private/tmp/artroom-security-r4-site-window-closed-validation-audit-20261024-v1/audit.json`.
- Quota: `/private/tmp/artroom-r4-quota-control-evidence-20261024-v1`; audit `/private/tmp/artroom-r4-quota-control-independent-outcome-audit-20261024-v1/audit.json`.
- Route: `/private/tmp/artroom-r4-route-control-evidence-20261024-v1`; combined audit `/private/tmp/artroom-r4-controls-independent-outcome-audit-20261024-v1/audit.json`.

Local measured wall and inclusive CPU seconds are separate categories:

| Recorded commands | Wall seconds | CPU seconds |
| --- | ---: | ---: |
| Private dependency copy | 1.89 | 1.87 |
| Maintained compatibility | 0.08 | 0.07 |
| Five-seal producer | 0.48 | 0.32 |
| Both affected invocations, including the compiler failure | 87.43 | 101.01 |
| Both control captures | 1.81 | 1.45 |
| Both control owners | 13.41 | 15.68 |

Affected and control-owner measurements include their descendants. Nested
compiler/body/child timings overlap those measurements and are not added.
These observations describe this macOS machine and its owned private pool,
not a cold-cache benchmark or a portable throughput claim. They omit source
review and other unmeasured preparation; no total implementation cost is
claimed.

The final gate and exact-head review remain pending. Integrate approved
archive Main and the eventual R9 landing before that gate. No deployment or hosted
provider acceptance is claimed. R4 token reuse, R13 expiry/member quota and
R10/R11 trust remain separate.
