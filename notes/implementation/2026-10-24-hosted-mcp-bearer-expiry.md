# Hosted MCP bearer expiry and one-time delivery

This implementation covers R5C under child request `a3e54dcf6aa8fd305c5cffca4ef65a62e6100462`
and promise `fb529297627a453b7f844979779ab0b27867fd15`. Planner decision
`855dd86db35a986ce2b09eafcffd7fb4bc3b661e` fixes the cutover and stream policy.
All five compiler contexts passed across the retained invocations. A clean
continuation passed the whole 18-case Native file with zero unhandled errors.
The unchanged 13 Node assertions carry with the per-file qualification below.
Three surgical controls reached their intended assertions and restored their
original physical files. The ordinary gate has now passed; exact-head
review and deployment remain pending. This note does not claim completion
of parent R5.

## Contract

A successful fresh create or signed bearer renewal returns the token only
in that response, with `bearerExpires`. Expiry is fixed at issuance commit
plus 30 days. Neither use, replay, reset nor unrelated configuration writes
extends it. A fresh signed renewal checks current controller or admin
membership authority and does not need the expired bearer to authenticate.

Stored creation and control answers in the agent and registry contain no
plaintext token. Replays retain the original HTTP status and stable
metadata, with `bearerShown: true` and the operation's original
`bearerExpires`. Later renewal cannot rewrite an earlier receipt. Existing
fingerprint-conflict and stale `409` rules and seven-day receipt retention
remain. Non-bearer refusals and retire answers retain their shape.

If the first response is lost after commit, retry returns the already-shown
receipt. A new signed renewal provides a new token. Concurrent duplicates
have at most one plaintext response. Resets before commit preserve the
same agent, key and native enrol envelope and can finish issuance once.
No plaintext is persisted to make reset recovery appear successful.

Legacy active digests without a valid stored expiry fail closed at
cutover. Their receipt expiry is null. The planner renews live hosted-agent
tokens explicitly during deployment and records the step; there is no
grace deadline or activation-time renewal. No new lifetime setting or
caller-chosen duration is introduced.

The versioned migration is atomic within each agent or registry object's
construction. It is not one cross-object cutover. Renewal activates the
agent but not its repository registry, which holds a third copy of the
old creation answer. A dormant registry's raw answer remains until that
registry activates. The planner must activate relevant registries through
the existing control plane as well as renew live agents, or explicitly
record lazy, incomplete dormant cleanup. No new enumeration or operator API
is implied. A new-code request runs its object's migration before it can
return a stored answer. Full deployment-wide cleanup is not claimed by
this source or a single agent renewal.

New requests after expiry fail bearer admission. Open legacy streams and
modern listens close via existing HTTP lifecycle hooks and bounded timer
rechecks, with no 30-day timer or Durable Object alarm. Calls already
admitted finish under their original native/custody fences. A pending
opening must not resurrect a closed layer. This does not change the
separate 30-minute legacy session idle rule or local Node MCP lifetime.

## Validation and retained failures

The maintained parser supplied the hosted and HTTP owner seals from the
reviewed production source. Updating those two map slots binds source
identity; it is separate from the test results below. The stream-opening
deadline race and required protocol metadata were corrected during source
review.

Each original invocation retains its natural outcome:

| Original | Actual outcome |
| --- | --- |
| 35569 | Production compiler failed to infer the paginated migration cursor. Other contexts and all bodies were unrun. Explicit row and key annotations fixed the typing without changing runtime checks. |
| 99714 | Five compiler contexts passed. The first HTTP idle case failed because its modern probe used removed `ping`. Its three companions were unfinished, nine HTTP loopback cases were skipped, and Native 18 was unrun. Repeated skipped callbacks do not prove repeated bodies. |
| 66450 | MCP test compiler and all 31 assertions passed, but the invocation failed with one unhandled scripted Native migration SQL rejection. Its original failed status remains. |
| 10047 | MCP scope-test compiler and the whole Native 18 passed with zero unhandled errors. All 18 planned, collected, started, result, and terminal semantic identities agree. |

The HTTP probe now uses `server/discover` in both its method header and body
and requires a successful discovery result. An HTTP 200 protocol error cannot
stand in for a valid probe. The lifetime test closes every created HTTP
layer in `finally`, including after a failed assertion. These fixture changes
preserve the original idle assertions and deadlines.

The migration fault witness calls the same actual instance's synchronous
`used()` inside `runInDurableObject`. A local catch returns a tagged failure;
assertions outside that callback require the scripted error. This owns the
expected exception without a global rejection filter. The SQL trigger,
complete rollback snapshot, retry, one-time byte credit, and renewal checks
remain. Original 10047 validates this correction.

Original 66450's HTTP-idle 4 and HTTP 9 files each have complete passing
assertion and module records with zero module errors. Their source,
configuration, production dependencies, and tool pins are unchanged in
the Native-only correction. They carry under acceptance
`5138a05cd4abd8657e9615b8687a78837e7b8be5`. There is no separate per-file
unhandled-error counter: the full 66450 run had one error attributed to the
Native migration witness. The carry does not turn that invocation into a
healthy whole 31 run.

Each control ran its whole selected file without bail, then restored the
same inode, bytes, mode, size, and modification time. Four snapshots checked
the binding, mutation, child lifetime, and restoration. Other source, refs,
tools, environment, and preparation records stayed exact. Only the declared
cache cell and existing empty temporary directory had their allowed changes.

| Original | Single mutation | Actual distinguishing result |
| --- | --- | --- |
| 70000 | Change fixed lifetime from 30 to 31 days | Five failures and 13 passes. Independent 30-day dates fail at 136 twice, 499, 1095, and 1227. |
| 42057 | Return the unredacted answer from the shared retention helper | Five failures and 13 passes. Fresh durable-token checks fail at 109 through callers 137 twice and 500; stable receipt replay fails at 1099; legacy agent/control snapshot fails at 1211 with used bytes 5207 instead of 5127. |
| 82913 | Omit `closeAll()` in the due scheduled callback | One failure and three passes. Line 141 observes `[2,1,1,0]` owned state instead of `[0,0,0,0]`. Failure cleanup completes. |

All three wrappers exit 0 around their expected child exit 1, with no signal,
unhandled error, extra failed case, callback gap, or restoration error.
The redaction control stops at the legacy agent/control snapshot. Its later
Registry assertion is not independently reached under mutation; the clean
baseline covers that assertion. The fixed-duration control does not by
itself prove authentication expiry or stream teardown.

The finite independent review package is
`/private/tmp/artroom-security-r5c-closed-validation-controls-review-20261024-v1/manifest.json`.
It pins the actual results, case identities, all retained control failures,
full guard records, and separate audit receipts. Six recorded outer spans
sum to 416.83 seconds wall and 438.58 seconds CPU, at printed 0.01-second
precision. Original 35569's outer cost is unknown and excluded. Nested child
times are not added. This partial validation sum excludes the gate,
preparation, source review, and deployment.

## Ordinary gate

Original `11319` completed naturally with exit 0 at
`e10584fc76cfe1979e79015725b58cec95f4c0dd`, tree
`a0b8b3c008277cbf6c67d454166b999b530afabe`. All eight gate stages passed,
including the complete maintained typecheck stage. The maintained pool
compatibility step was a no-op on the already adopted bundle; the kernel
checker reported zero refusals. Vitest retained 3,549 unique terminal case
IDs across 498 files: 3,546 passed and three skipped, with no failed cases
or unhandled errors. The subsequent Node 39 and Counting 55 blocks passed
in full. Root accepted the audited gate under
`1162431fbd0dc5114daf71abfdbcdc7f47d211ba`.

The whole Native 18, HTTP-idle 4 and HTTP 9 files all passed in this gate,
with complete ready and result callbacks for all 31 C cases. This is a
new successful ordinary run, separate from the qualified carry out of
failed original `66450`; none of the earlier failed statuses changes.
Across the wider suite, 19 terminal-passed cases have no ready callback
and 39 have no result callback. No ready, result or final ID is duplicated,
and no callback identity or state contradicts its terminal row. This raw
reporter emits no separate collected-case event: the run-start file count
and final module-derived case identities agree on 498 files. A collected
callback vector is not invented.

The runner's before and after records match exactly: clean head and tree,
lock file, adopted dependency stamp, and Node/npm descriptors. Installation
was skipped for that verified dependency view. All 17 copied terminal
stage artifacts match their recorded original hashes and sizes. The
invocation records fixed Node/npm and PATH, launch-environment hashes,
no filters, no retries and no timeout. These are checkpoint boundaries,
not full physical dependency-pool, continuous memory or environment
lifetime proofs. The ordinary runner does not bind mutable Main refs.

The external gate owner measured 1,370.89 seconds wall and 1,570.81 seconds
CPU, at printed 0.01-second precision. The gate ran on macOS 27.0.1
arm64 with the existing private dependency pool and caches. System load
and cache temperature were uncontrolled; these observed validation costs
do not support a benchmark claim. The npm child measured
1,370.7684828749625 seconds wall and 1,570.6920899999998 seconds CPU;
these and the stage costs are nested and are not added again. With the
six earlier recorded outer spans above, the seven-span subtotal is
1,787.72 seconds wall and 2,009.39 seconds CPU. Original `35569` has no
recorded outer envelope and remains excluded, as do preparation, source
review and deployment. This is not complete edit-to-review cost.

The pinned independent audit, exact terminal identities, callback gaps
and finite raw input roster are held at
`/private/tmp/artroom-security-r5c-gate-independent-audit-20261024-v1/manifest.json`.
Only this implementation note changes after the gate. Source, tests and
seals remain unchanged from the tested tree. Under `docs/testing.md`, the
documentation-only successor carries this gate without a repeat; its
final tree hash must accompany the documentation commit.

The planner's explicit token renewal, Registry activation or recorded
lazy cleanup, and hosted cutover checks remain deployment obligations.
No deployment-wide cleanup or hosted recovery is claimed. R15 retirement
and seed deletion remain excluded.
