# Archive row diagnostic

Planner decision `52d805cba8288ae4a061e7d80bd4f5fe7de411ab` replaces the
unused private operator RPC with one fixed `archive-row-diagnostic-v1` log
line per object activation. The planner reads the line from an existing tail;
this adds no HTTP, member, MCP or operator authentication surface.

The line contains only scope, bounded state/phase/reason, confirmed position,
pending Mark position (archive commit and through sequence/hash), stored wake
and platform alarm. Absent and unknown
remain distinct. It excludes repository credentials, manifests, raw JSON,
frontiers and private error text. Scope and archive metadata are captured
synchronously before the diagnostic's one `getAlarm` await. SQL and platform
alarm are sequential observations, not an atomic snapshot.

The correction makes the constructor own the once-per-activation
observation after its required fields initialize. Diagnostic SQL finishes before
any bounded read method begins. The retained promise owns the platform alarm
read and log through `waitUntil`. Direct read and proof methods no longer start
diagnostic work. Existing asynchronous ingress, first-turn and recovery paths
wait for that promise; the production constructor's archive activation scheduling
also waits for the line before evaluating its recovery predicates. Coalescing
flags prevent duplicate deferred scheduling. Existing alarm recovery still makes
its own fresh alarm read and revision checks. Unknown observations and unavailable
logging do not refuse ingress. No caller or route is added.

When native scope metadata is absent, unread archive and wake fields remain
unknown rather than inferred absent. Unread row reasons are unknown too.

The warm observation boundary is accepted by the planner. Constructor schema
initialization and maintenance remain existing activation costs; diagnostic work
is also constructor-owned, outside the bounded query envelope. This is not a
claim of cold-object purity or deployed recovery. The restart transition and its
operator authorization remain separate work.

The prior source at `03b40dfc1187b297abbcee7c6792da93c29e9de4` passed two Scope
compiler contexts and 13 cases in original run 96204, accepted by
`c71e52b1c066679830b2b74bd07e0506bf6fdfd5`. That evidence applies to the prior
RPC/internal-reader source only. Its proposed identity control was never run.
The revised source retains six warm internal-reader purity cases. Four new
cold-activation witnesses supersede the prior four warm ingress witnesses:
instrumentation precedes activation and checks that the diagnostic row read
precedes the method body, one read and one line survive repeated entry, and
recovery follows the log. The corrected lifetime is validated by later run
`72970`, described below.

Original run `20590` at `4fcc3e08` passed both Scope compiler contexts and all
34 affected cases: 10 operator/diagnostic, 17 driver and 7 row cases. Its
single terminal report and built-in JSON agree, with zero unhandled errors.
There were 34 ready callbacks but only 17 individual result callbacks; the
17 driver results are present in the complete run-end report. The maintained
runner uses that terminal report. Four clean source/tool/lock/workspace guards
held; these are not full physical dependency/environment snapshot records.

The stored-name control, original `41674`, removed only the checked native
metadata scope-name fence. All five stored-state cases then failed the same
intended `131:31` assertion; the five companions passed, with zero unhandled
errors and complete terminal callbacks. Its child exited 1 as expected; the
owner exited 0 after restoring the original bytes, inode, mode and modification
time. The target change time changed. All other source, Main, tool,
environment and preparation values stayed fixed. The four full control
snapshots show only the declared existing cache-cell and empty temporary
directory allowances in dependencies.

The affected 34-case run and stored-name control remain evidence for their
original source. The internal reader, row decoder and stored-name fence are
unchanged by the constructor correction; their evidence carries with
that qualification. The prior four warm ingress witnesses do not validate the
new constructor lifetime.

Original gate `45227` at `4ff21a113e0f9ed16412d7911ad44c24800dece6`
failed with 3,540 passed, one failed and three skipped cases across 498 files.
All stages before the test stage passed. The unchanged malformed-query witness
failed at `item-query-owned.test.ts:65:86`: starting the diagnostic in
`queryItems` performed protected SQL before malformed-input validation. The
correction removes that work from the method; it does not weaken the query
bounds, assertion or deadline. The later Node and Counting stages were not
reached. These are terminal report counts, not a claim of complete individual
result callbacks. The independent audit reconciled 3,544 unique terminal IDs:
18 ready callbacks and 38 result callbacks were missing, all for terminally
passing cases. No duplicate, unknown or mismatched IDs or unhandled errors
were reported. Node 39 and Counting 55 were unreached.

The focused command took 18.06 seconds wall and 24.01 seconds CPU; the control
took 10.67 seconds wall and 12.27 seconds CPU. The failed gate took 1,360.71
seconds wall and 1,565.66 seconds CPU. Nested child and stage costs overlap
these outer measurements and are not added. These are local partial costs.

The constructor correction's actual maintained object seal has been derived
and adopted. Original corrected focused run `72970` at
`b275802a199c4788c5901701beac4135bc8abdb5` /
`194878aaafe1d96ae64a7351eda649cbdd21b89f` exited naturally with status 0.
Scope production and test compilers passed, followed by all 13 cases in the
whole operator10 and item-query-owned3 files. Every case started and completed
once, with no errors, retries, repeats or unhandled errors. The independent
audit is retained at
`/private/tmp/artroom-archive-operator-constructor-focused-independent-review-evidence-20261024-v1/audit.json`.

The maintained body actually used `--bail=1`; the allocation's earlier
“no bail” wording was inaccurate. All 13 cases ran and passed, so bail did not
curtail this result. Four maintained guards checked 1,713 active Source pins,
one external input, 14 workspaces and 41 aliases against the same clean
checkpoint. Notes remained under the committed-tree guard. This is not a
claim of a complete physical dependency snapshot or a 3,120-file inventory.
The outer run took 9.39 seconds wall and 14.42 seconds CPU; its 9.363-second
wrapper measurement and nested compiler/body costs overlap and are not added.

Original corrected gate `94166` at
`8c802272acb4b3cd4791bc6e0dca55b17adec273` /
`96e7e0f60c816f24f92983cf7ffb044f3002b1b7` exited naturally with status 0.
All eight stages passed, including 40 compiler contexts. The complete terminal
ledger contains 3,544 unique runtime IDs: 3,541 passed and three skipped across
498 files, with zero unhandled errors. The later Node 39 and Counting 55
witnesses also passed. All observed callback identities and states agree with
the terminal ledger. Nineteen ready callbacks and 21 result callbacks are
absent, all for terminally passing cases; this is not a complete individual
callback claim. The raw evidence and independent audit retain those gaps.

The gate owner verified the same clean head/tree, lockfile, adopted install
stamp, Node and npm launcher before and after the run. It skipped installation
against the verified stamp. These recorded guards are not a full physical
Source/dependency/environment/Main snapshot. The outer command took 1,386.19
seconds wall and 1,584.85 seconds CPU. Its npm-child and stage costs overlap
that measurement and are not added. This is local execution evidence, not a
controlled cache or load benchmark.

The closed independent audit is retained at
`/private/tmp/artroom-archive-operator-log-gate-v2-independent-audit-20261024-v1/manifest.json`.
The failed original gate `45227` remains failed. The prior stored-name control
and affected 34 result retain their original-source qualifications. No
exact-head review, landing or deployment is claimed here. SQL and platform
alarm remain non-atomic, and no cold constructor purity, restart authority or
hosted recovery is inferred.
