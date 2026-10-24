# Restart one stopped archive through deployment configuration

Request `ea0152b36dfca326be79b22e1ad9a0e78014b93d`, promise
`756cfd9bbfff10491c90e6ca43ff7ae1d8cb653c`.

Planner decision `fc0403664ced9485b6b2086efcf7c9d45a9172fd` authorizes an
expiring, one-target deployment directive. The existing Cloudflare
principal that installs code and settings supplies `ARCHIVE_RESTART_DIRECTIVE`
only on the Worker that needs it. This setting is nonsecret. No HTTP route,
public restart RPC, service-binding caller or member authority is added.
Request bodies and headers cannot supply the directive.

The value is canonical JSON at most 8 KiB, with exactly `v`, `command`,
`at`, `repository`, `format`, `confirmed`, `rowDigest`, `generation` and
`expires`. `v` is 1. `command` is the maintained SHA-256 digest of the
canonical object with `command` omitted. The full ScopeRef, all four
repository fields, format and complete confirmed-v2 receipt must match.
The operator chooses an absolute canonical expiry; use a short window.
This change does not invent a renewal or extend that time on use.

Existing ingress first completes its once-per-activation diagnostic.
The diagnostic includes a canonical row digest for a stopped-limit row
with no Mark, and the bounded restart generation. No raw row or secret
is logged. The configured object then attempts the directive synchronously,
before recovering alarm scheduling. An active driver or alarm handler
refuses application. The operation performs no native turn, host lookup,
credential action, Mark, send or inline archive pass.

One native transaction checks the canonical row and latest command receipt
with exact SQL BLOB comparisons behind size fences. It requires stopped
reason `limit`, a confirmed layout-2 receipt, no pending Mark, attempts 0
and no row `next`. It clears only the stop, preserves receipt and frontier
keys, writes the existing normal retry wake and increments the durable
restart generation with the consumed command digest. Budget refusal or a
storage failure rolls back every cut. The latest command replay is a
read-only no-op, including after a later stop; an older generation cannot
restart a recreated row. Platform alarm scheduling follows the durable
commit and remains recoverable through existing ingress arbitration.

Capacity cadence is separate request `6ceaa8be`. Its approved exponential
backoff landed in Main `dbaa3a2a8c9ffb84bbff53d738fcde8a046cbf09` before
this Source composition. This patch preserves that backoff and adds
no lease, stop count, changed backoff or new attempt allowance. It does not
turn an unaffordable first entry into one that fits.

The planner must read the deployed diagnostic and establish the actual
full scope and repository before arming a directive. Neither object-ID
inference nor the separate `c7a17b72` scope establishes Room A's identity.
There is no populated hosted directive or recovery claim here. Deployment
order is diagnostic and landed backoff first, then this separately reviewed
restart head after the planner's diagnostic decision.

## Verification status

Source and witnesses are authored only. The row witness uses explicitly
test-authored stopped metadata for expiry, target/receipt/generation
refusal, replay, CAS race and transaction rollback. The real Native archive
witness first builds a confirmed-v2 receipt and frontier, then uses a
labelled historical stop and the existing nativeBirth ingress to expose
the deployment-setting stand-in. Host and deployment authority remain
TEST stand-ins; no Cloudflare deployment control plane or hosted recovery
is exercised. The updated diagnostic still exposes no raw Mark payload.
Affected compiler contexts, whole-file witnesses, paired control, maintained
AST seals and the ordinary gate have not run. Six existing mapped owners
supply seven seal slots; the new directive parser will also receive an
explicit owner row. The planned actual producer therefore has seven calls
and eight map slots. No values are filled before that producer runs.

Scope production and test compilers cover the archive implementation and
fixture wiring. They do not directly compile the Grow deployment wrapper;
its one-line setting forwarding has Source review and still needs the
deployment build check. The planned focused cases cover the changed archive
witnesses and bounded-read regressions, not every shared-worker importer.
The ordinary gate remains required. No dependency setup, parser, package
install or deployment is recorded here.
