# Read-only archive operator view

`ScopeObject.archiveState` adds a private namespace RPC for observing stored
archive state. It accepts an exact scope incarnation and repository identity.
It adds no HTTP, member or MCP route, and cannot restart an archive.

The response contains the checked archive position, a reduced pending Mark,
attempt count, stored retry time, stored wake and platform alarm. Stored phases
are `target`, `confirmed`, `pending` and `stopped`. `confirmed` describes a
stored receipt; it does not mean the archive has caught up with the Native
head. Missing values and unreadable values have distinct `absent` and
`unknown` results. Malformed or conflicting identities are refused. Unknown
stop reasons are masked rather than copied into the response. Raw JSON,
frontiers, manifests, authority publications and credentials are excluded.

The method reads bounded scope metadata and uses the existing checked
`ArchiveRows` decoder through a read-only SQL facade. It reads the stored wake
without invoking the driver, then calls `storage.getAlarm`. These observations
are sequential, not an atomic snapshot across SQL and the platform alarm.
The method bypasses invocation recovery, `#first`, schema initialization,
provider calls and alarm writes.

This is a method-level claim for an already active object. Constructing a cold
`ScopeObject` still constructs `SqliteStore`, which initializes schema and may
add existing bookkeeping columns. The existing constructor can also schedule
signer maintenance and archive activation work. This change does not suppress
those effects. The planner must decide whether that activation behavior is
acceptable for the operator installation or whether a separate unactivated
storage boundary is required. The authenticated live caller and its deployment
remain undecided; a namespace binding alone is not a new caller policy.

Six warm native test cases have been authored for absent, target, confirmed,
stopped, pending and uncreated state. They exercise the actual namespace RPC,
compare application SQLite and the platform alarm, and trap recovery, driver,
provider and write attempts. Their scope excludes constructor effects. They
have not run. Compilation, native validation, maintained seal generation,
entry-point checks, the final gate and source review remain pending.

Before validation, derive three seals with the maintained `sourceSeal`:
`object.ts` supplies both existing object slots, `archive-row.ts` supplies its
existing archive slot, and `archive-operator.ts` needs a new archive slot.
The helper requires its own seal because the parser does not follow imports.
The HTTP inventory needs no route row. A short prose qualification should
identify the private RPC and its cold-activation limit outside that table.

This work is tracked by request `57917747` and promise `352e2c80`. It changes
observation only; the stopped-row reset and live operator installation are
separate decisions.
