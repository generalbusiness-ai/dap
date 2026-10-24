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

The once-per-activation promise is installed before observation begins.
Existing asynchronous invocation and observed-call paths wait for its log
before continuing. Synchronous invocation, first-turn and direct native-birth
paths start the same observation without changing public synchronous
signatures. Recovery and first-turn operations work wait behind that promise;
coalescing flags prevent duplicate deferred scheduling. Existing alarm recovery
still makes its own authoritative fresh alarm read and revision checks. An
unknown observation or unavailable log resolves the diagnostic and does not
refuse ingress. Alarm invocation starts the diagnostic before its pass.
This reaches existing common invocation, observed, first-turn and native-birth
paths, plus the existing direct readiness/query/proof, site/application and
other metadata RPC entrypoints. The same helper owns its promise with one
`waitUntil`; it adds no new route or caller.

When native scope metadata is absent, unread archive and wake fields remain
unknown rather than inferred absent. Unread row reasons are unknown too.

The warm boundary is accepted by the planner. Constructor schema initialization
and existing activation scheduling remain unchanged; this is not cold-object
purity or a deployed recovery claim. The restart transition and its authenticated
caller remain separate work.

The prior source at `03b40dfc1187b297abbcee7c6792da93c29e9de4` passed two Scope
compiler contexts and 13 cases in original run 96204, accepted by
`c71e52b1c066679830b2b74bd07e0506bf6fdfd5`. That evidence applies to the prior
RPC/internal-reader source only. Its proposed identity control was never run.
The revised source retains six warm internal-reader purity cases and adds four
existing-ingress witnesses for one line, one diagnostic alarm read and ordering
before recovery. These claims apply to the local fixtures, not deployment.

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

The focused command took 18.06 seconds wall and 24.01 seconds CPU; the control
took 10.67 seconds wall and 12.27 seconds CPU. Nested costs overlap these
outer measurements and are not added. These are local partial costs.
The final gate, exact-head review, landing and deployment remain pending.
The observations remain warm and non-atomic; no restart permission or cold
constructor purity is inferred.
