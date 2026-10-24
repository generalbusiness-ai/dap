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

The row witness uses explicitly
test-authored stopped metadata for expiry, target/receipt/generation
refusal, replay, CAS race and transaction rollback. The real Native archive
witness first builds a confirmed-v2 receipt and frontier, then uses a
labelled historical stop and the existing nativeBirth ingress to expose
the deployment-setting stand-in. Host and deployment authority remain
TEST stand-ins; no Cloudflare deployment control plane or hosted recovery
is exercised. The updated diagnostic still exposes no raw Mark payload.
Whole-file witnesses, paired control, maintained AST seals and the ordinary
gate remain pending. Six existing mapped owners
supply seven seal slots; the new directive parser will also receive an
explicit owner row. The planned actual producer therefore has seven calls
and eight map slots. No values are filled before that producer runs.

Scope production and test compilers cover the archive implementation and
fixture wiring. They do not directly compile the Grow deployment wrapper;
its one-line setting forwarding passed a separate strict compiler check.
The planned focused cases cover the changed archive
witnesses and bounded-read regressions, not every shared-worker importer.
The ordinary gate remains required.

The private dependency copy completed as original `62109`, without an
install. The maintained compatibility check passed once and left the
already adopted pool bundle unchanged. Original `76102` passed the Scope
production compiler, then failed the Scope test compiler at
`archive-driver.test.ts:539`: the cleanup callback returned the boolean
from `Map.delete` instead of void. All 43 selected bodies were unrun.
The correction keeps the same cleanup call inside a void callback.
Production source and assertions are unchanged. Its outer cost was
1.61 seconds wall and 4.94 seconds CPU.

The first separate Grow check failed before source checking with TS2688:
its external configuration could not resolve the pool's exported type
library. A corrected configuration names the same three declaration
libraries by absolute path and preserves strict checking. That first
outer span was 0.89 seconds wall and 0.97 seconds CPU. The corrected check
passed with unchanged source, at 0.87 seconds wall and 1.90 seconds CPU.

Original `37098` passed the Scope test compiler. Its body retained 18
passes, one failure and 24 pending or unfinished cases, with zero
unhandled errors. The new restart case reached its final assertion but
read confirmed sequence 2 instead of the expected sequence 3. It had
advanced the clock to the shared platform alarm, which can precede the
archive's persisted retry. The driver refuses archive work before that
retry is due. The failed log did not retain numeric wake values, so this
is a source diagnosis, not a measured attribution of that failure.
The corrected witness reads the exact durable archive wake, requires a
future wake and a platform alarm no later than it, then advances to that
archive wake before one ordinary alarm. The exact final-head assertion,
all prior restart assertions and the deadline remain. Its outer cost was
15.58 seconds wall and 19.07 seconds CPU.

Original `55657` passed the Scope test compiler, all 19 driver cases,
including the exact-wake restart witness, and both projection ownership
cases. It then failed the warm stopped operator case at line 146: the
expected value retained the old restart digest after the fixture changed
the stop reason from `limit` to an unknown private reason. The actual null
digest is required because only an eligible `limit` stop exposes it.
The correction requires null and preserves the private-reason masking
assertion. Its body retained 24 passes, one failure and 18 pending or
unfinished cases. The outer span was 15.05 seconds wall and 19.42 seconds
CPU. Per-file success is derived from completed assertion rows; a file
reported passed with only pending rows is not a successful file.

All original failures retain their outcomes. The next continuation carries
the successful production and Grow compilers and the complete driver and
projection ownership files, subject to the raw error audit. Only the
operator test expectation and this note change. The updated Scope test
compiler and remaining 22 cases in the operator, row and item-query-owned
files remain pending.

These costs were observed on macOS 27.0.1 arm64 with the existing private
dependency pool and caches. Load and cache temperature were uncontrolled.
Nested compiler timings are not added to their outer spans. No parser,
package install or deployment has run for this change.
