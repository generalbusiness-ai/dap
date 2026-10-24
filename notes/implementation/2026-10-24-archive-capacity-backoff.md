# Archive capacity retry backoff

Request `6ceaa8be2eeed29f6efd57eca7e1156ee9bda271`, promise
`82f63396f5dcdcb9db919131972dc92a3e6277bd`, and planner decision
`fc0403664ced9485b6b2086efcf7c9d45a9172fd` cover this change.

A pass that cannot select its first prefix because of temporary capacity
now records a deferral count in the existing `archive-wake-1` row. With the
current bounds, delays are 2, 4, 8, 16, 32, 64, 128, 256, then 300 seconds.
Further capacity deferrals stay at 300 seconds. The count saturates at 32
to bound its representation. It never stops the writer or limits retries.
There is no new lease, alarm type, setting, or archive payload field.

Old three-field wake rows mean count zero. An ordinary pre-Mark retry
preserves an existing count but retains its original one-second schedule.
Mark retries still use their existing attempt count and cadence. Mark,
confirmation, and cleared-wake writes omit the capacity count; a later
capacity shortage starts again at count one. Entry notifications cannot
shorten a pending wake. A pending wake is scheduling state, not evidence
that an archive Mark exists.

The driver reserves the small capacity transition before adaptive planning.
The existing snapshot and exact-byte comparison prices charge its bounded
row text, wake text, and final compare-and-set write to the original budget.
Those prepaid costs reduce the planner's remaining allowance. They are not
added to its finish forecast again. The final write needs no new debit or
fresh budget after lookahead reports capacity shortage.

Only that capacity result applies the transition. The delay starts at the
actual deferral, after planning. A single synchronous update requires both
the captured wake bytes and payload-row bytes to match. A Mark can reuse
the same wake timestamp and flags, so wake equality alone is insufficient.
Type and exact-size checks bound each byte comparison. A failed comparison
writes nothing. The closure is single-use, and its final budget check is
inside the same transaction as the update.

Null transfer forecasts, hard refusals, unavailable responses, and pending
Mark retries keep their existing classifications. This change does not
restart stopped rows or explain a hosted canceled alarm.

## Witnesses and remaining validation

The proposed Native alarm witness repeatedly lowers the existing entries
allowance to zero. It checks literal delays through the five-minute cap,
restarts between attempts, confirms progress under the original allowance,
then checks that a new shortage starts at two seconds. The host, token,
policy, and clock are existing test stand-ins. SQLite, native alarms,
eviction, Mark, and confirmation use the actual implementation.

The existing unavailable and Mark witnesses now check their unchanged
one-second and exponential retry cadences explicitly. The existing two
shortage cases expect the new first two-second capacity delay. Their other
capacity and hard-refusal assertions remain.

A small real-SQLite witness checks old-wake compatibility, a prepaid write
after the remaining call allowance is exhausted, completion-time scheduling,
counter saturation, overflow refusal, and single use. It also creates an
actual Mark with wake bytes identical to the captured pre-Mark wake, then
requires the stale capacity update to refuse without changing the Mark.
Its Mark is test-authored bookkeeping, not host acceptance.

Root and peer accepted the Source. The actual maintained producer computed
the driver and row seals, and root adopted only those map values in clean
`280a423333b8c91adcc1414c4616700eb08c5818`.

Affected original `65813` completed naturally with exit 0. Scope production
and test compilers passed, followed by the whole driver 18 and row 8 cases.
All 26 planned, collected, started, and terminal semantic identities agree
with Vitest JSON. The run ended passed with zero unhandled errors. Four
maintained Source, tool, workspace, alias, and lock guards passed at that
clean checkpoint. These are boundary guards, not a new full physical
proof of the dependency pool throughout execution.

Only eight per-case result callbacks were emitted, all from the row file.
The 18 driver cases have passing terminal and JSON outcomes, but their
result callbacks are absent. This reporting gap is retained explicitly.
The external Python owner measured 15.31 seconds wall and 19.35 seconds
CPU, at printed 0.01-second precision. Its focused child and phase costs
are nested and are not added again.

The independent closed audit is
`/private/tmp/artroom-archive-capacity-backoff-focused-independent-audit-20261024-v1/manifest.json`.
The proposed cadence and stale-Mark controls have not run. Their Source
preparation does not establish a distinguishing outcome.

The separately held corrected operator diagnostic must integrate before
the final backoff gate. Root will compose the backward-compatible wake
decoder once and refresh the actual row seal after integration. Its
current diagnostic projection can keep the same pending, stopped, and
next fields. The counter does not change those fields' meaning. One
ordinary gate, exact-head review, and deployment remain pending.

The planner requires this head to land before the separate restart
transition. The planner then owns one deployment containing capacity
deferral, this backoff, and the activation diagnostic. No deployment,
restart directive, or hosted recovery is performed or claimed here.
