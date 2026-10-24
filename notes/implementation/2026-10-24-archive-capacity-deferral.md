# Archive capacity deferral

This source change is under request
`21a4ab159977f6c6b7d7058496c658b47f605c3b` and promise
`3c807d35b47fa01381df4eb41e7db35f92dcd2aa`, based on Main
`de590030e624e81dd14421493e6c2df022c107d1`.

## Transient capacity and hard refusals

Before the adaptive planner selects a prefix, a limited lookahead or an
actual non-null finish quote that cannot fit now returns an internal
capacity deferral. The driver keeps the existing retry time and reports
`retry` with reason `limit`. Completed and discarded work stays charged
to the original pass budget.

A null finish quote still returns the ordinary hard refusal. Invalid
input, layout, privacy or cohort data, exact pending-Mark rebuild failure,
and unexpected ref conflict retain their existing stop behavior. An earlier
selected prefix still finishes when a later candidate cannot proceed.
The change does not classify every `limit` as transient or waive any cap.

The existing pre-Mark defer already persists the wake. Capacity handling
adds no alarm, backoff calculation, debit, row write or attempt. It creates
no Mark, token or send. Existing wake arbitration and its protection of a
future retry from new-input notifications remain in force. Terminal budget
exceptions, timeouts and other exceptions retain their existing fallback.

An already stopped row remains stopped. This change neither clears old
stops nor infers their cause. Operator restart and its exact-row safeguards
are separate work. Deferral preserves retryability; it does not prove that
every legal entry will fit a future pass under the same fixed budget.

## Validation

The affected checks, paired control and passing final gate are recorded below.
Exact-head review remains pending. The maintained parser supplied the actual
driver source seal, which root adopted in its existing map slot. The requested
witnesses distinguish limited lookahead and a non-null unaffordable finish
from a hard null forecast. They retain spent cost, persist the normal
retry without a Mark or stop, then advance through the actual due alarm
without a new entry. Existing earlier-prefix, hard-stop, exact pending
rebuild, conflict, timeout and alarm-recovery assertions remain.

No hosted cause is established for the reported stopped object. A local
capacity witness is not a hosted recovery or throughput measurement. The
planner deploys only after the exact head is reviewed; no deployment or
reset of an old stopped row is authorized by this source preparation.

The first affected run at `f8bed579` passed both Scope compiler contexts,
then recorded six passing cases, one failure and seven unfinished cases.
The new subscenarios attempted two Native fixtures in one test; the existing
exclusive clock guard refused the second. The correction gives each new
scenario its own registration and fixture lifetime. All 14 original tests
remain intact, with three added cases and no deadline or owner-guard change.
The failed run remains evidence. At `912454c1`, the Scope test compiler and
all 17 cases passed in 12.813 seconds overall. The unchanged production
compiler pass is retained from the first run. No test deadline changed.

The paired control restores only the old hard-limit return before prefix
selection. Both shortage cases then fail at the stored-row assertion:
`stopped: null` becomes `stopped: { reason: "limit", where: null }`. The
other 15 cases pass. The child exits 1 as intended, but the wrapper also
reports failure because it searched the compact JSON message for diff text
that appears only in raw stderr. Root and an independent reviewer checked
that stderr, all 17 terminal states and the complete restoration guards.
The semantic control proof is accepted; the wrapper failure remains recorded.
Original source bytes, inode, mode and modification time were restored;
change time can change. An earlier control preflight failed on a sandbox
environment mismatch before any source change or test child. Neither
failure is hidden, and no healthy baseline was repeated.

The final gate candidate also includes the reviewed hosted admission change
and its two-sentence documentation correction. That merge changes no archive
production or witness bytes. Deployment requires the planner's hosted MCP
opt-in and tool-addition choices as well as the archive rollout decision.

The ordinary gate at `163baafbf8339f65844e1c1878eab77de9fd885c`, tree
`c27fa9192d927b4d923754a2755f845760faa7dd`, exited normally with status zero.
It passed all compiler and gate stages: 3,529 Vitest cases passed, three were
skipped, and the separate Node and Counting browser blocks passed 39 and 55
checks. All 3,532 unique terminal case records are retained. Incremental
callbacks have gaps and one duplicate ready callback; the terminal records
and raw summary agree. No unhandled error was reported, and the source,
lock stamp and tool checkpoint remained unchanged.

The outer gate took 1,349.26 seconds elapsed and 1,555.26 seconds of CPU,
printed to 0.01-second precision. Its nested process and stage measurements
are not added again. Earlier affected and control invocations took a summed
39.972655293 seconds elapsed and 50.124146 seconds of CPU, with every original
failure preserved as described above. These are validation costs, not the complete
elapsed time from implementation to review. Dependency preparation and its
unrecorded CPU cost are separate. This subsequent note update changes no
production code, test, seal, dependency or gate configuration, so the passing
gate is carried under the documentation-only rule in `docs/testing.md`.
