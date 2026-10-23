# Archive pass diagnostics

The `archive-pass-diagnostic-v1` log records the result of one archive driver
pass. Alarm frequency alone cannot distinguish a stopped archive from a pass
that waits for its next attempt. Other work can keep the object's alarm active.

The driver emits the record after its existing credential cleanup. The record
contains fixed categories and scalars already available to the pass. It adds
no archive read, persistent state, credential use, or retry. Existing operation
order, return values, limits, and deadlines remain in force.

## Fields

| Field | Meaning |
|---|---|
| `step` | Last stage reached, from `row-load` through `confirm`. It identifies a stage, not necessarily the operation that caused a failure. |
| `detail` | `not-due`, `wake-not-due`, `target-missing`, `target-different`, or `none`. |
| `rowPhaseAtLoad` | `absent`, `stopped`, `pending`, `confirmed`, or `target`. `target` means a row has a target but no pending or confirmed receipt. `unknown` means the pass did not reach the row snapshot. |
| `confirmed`, `pending` | Sequence positions from the row at load time, or `null`. They do not describe a receipt created later in the pass. |
| `attemptsAtLoad` | Row attempt count at load time. It is zero when no row was loaded. |
| `hasNext` | Whether the loaded row had a next-attempt timestamp. It does not describe the separate wake index. |
| `attempted` | The existing driver's flag for an early pending-row attempt. A false value does not prove that the pass made no attempt or wrote no Mark. |
| `state` | The returned pass state: `idle`, `disabled`, `retry`, `stopped`, or `confirmed`. `threw` means no return value was captured. |
| `reason`, `caught` | An allowed archive reason, `none`, or `other`. Arbitrary exception text is omitted. |
| `cost` | The budget's admitted `entries`, `attempts`, `nodes`, `calls`, `metadata`, and `inputWork`. These are charged work counters, not elapsed time or memory use. |
| `parentRead` | The last exact parent-object read's fixed phase, requested type and maximum, ordinal, and sanitized refusal category. See [Parent-read diagnostics](2026-10-23-archive-parent-read-diagnostic.md). |

The allowed reasons are `limit`, `timeout`, `unavailable`, `conflict`,
`mismatch`, `parent`, `missing-input`, `rebuild-mismatch`, and
`unsupported-archive-cohort`. An unavailable result can represent several
underlying failures. It does not identify a provider response on its own.

## Interpretation limits

A record with `rowPhaseAtLoad: stopped` and `state: stopped` establishes that
this pass loaded a stopped row. A not-due detail establishes that this pass
returned before its target lookup. A target-missing detail establishes that
the production target resolver returned no target. Those observations do not
identify the deeper cause within the resolver.

The log contains no scope identifier, repository address, credential, entry,
or arbitrary error message. Provider invocation metadata must establish which
object and pass a record belongs to. An unrelated alarm or log line is not
enough to assign the record to a journal.

The record is best effort. Process interruption, budget construction failure,
or a logging failure can leave no record. The driver catches synchronous
logging errors so they cannot replace the archive result. Logging still has
runtime cost and can affect timing. Missing logs do not establish that the
archive is disabled, stopped, or healthy.

The local witness extends the existing pre-Mark failure and retry scenario.
It checks the record's fields, omission of secret sentinels, and preservation
of the idle result when the logger throws. Local validation does not establish
the state or cause of the hosted archive stall. The planner owns deployment
and the subsequent hosted observation.
