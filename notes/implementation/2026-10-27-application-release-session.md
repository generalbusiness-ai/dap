# List installed releases from Rules scopes through the operator session

The Rules-only repair and its focused checks passed. The new ordinary gate,
final evidence seal and exact-head checker review remain due. No live query
or deployment is part of this child. The earlier candidate passed its gate
but was rejected for incomplete scope-kind coverage; that result does not
validate this repair.

## What changed

The command reads one summary for each saved manifest reference whose validated
kind is `rules`. It makes no summary request for any other kind. The saved
report has three arrays: `applications`, `errors` and `notApplicable`. Each
skipped reference becomes `{scope, status: "not-applicable"}` in the third
array. These records are fixed statuses, not errors. A report is complete when
the selected Rules reads and projection have no errors.

This selection trusts the manifest for kind, as it already trusts the manifest
for which scopes exist. A skipped kind is not a fresh observation or proof of
absence. The command does not reverify saved genesis hashes. The projector
still validates the actual Rules summary identity, native definition, complete
item counts and installation metadata before emitting its five fields:
application scope, installation item, exact release, publisher key and host.

Every array, its delimiters and commas count toward the 16 MiB UTF-8 output
cap before rows are retained. Exceeding the cap publishes no partial report.
The command imports `Buffer` explicitly from `node:buffer`; its byte accounting
also runs under Workerd's Node compatibility in the Native witness. Summary
responses retain their 4 MiB and 30-second transport bounds. Output publication
remains exclusive.

Session handling is unchanged. Complete local manifest validation precedes
signer custody and network access. The command acquires its signer once and
requests at most one existing operator session before the loop. A valid session
refusal, or absent configured membership, selects initial Signed reads. A
transport failure, timeout or malformed answer stops with fixed
`session-unavailable` before any summary or output file. There is no summary
retry, fallback after a summary refusal or session renewal. Redirects are
prohibited for both acquisition and summary reads.

Acquisition uses a fresh 16-byte operation identity, an expiry up to 60 seconds
ahead, a 16 KiB answer bound and a 30-second request/body deadline. The existing
client bounds the token string to 4,096 UTF-16 code units. Request expiry limits
issuance, not the issued session lifetime. The host can write bounded replay
and rate bookkeeping in `session_request`, but makes no history entry.
Registration and business mutation remain excluded. Existing host maintenance
can still run. `docs/deploy.md` states these boundaries and the manifest-kind
trust.

## Why review required this repair

The governing child is
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:0c4a42365997af33c52f1ea6a68717d62258aa7a`,
under promise `316f5777efc29b9282d804776607abc97790c1f5`.
Planner ruling `382923ff4a9d4ef52043665068a3b57576616a44` selects option a
and requires the genuine Native witness below, a new ordinary gate and
exact-head review. Request `0c4a4236` amends the session prohibition in ruling
`2dc765ac41e0287b5854e0790622ad29a4d0033a`.

Checker report `948521946fb64669f29ae8666dd640c32659168c` requested changes
at `c338648408e37fb6d2ac2de2e45ce2b6a0e7aedf`. The builder accepted the
finding in `9f9ccd74662d09ee531286e9d88814d75654a0fa`. A Register records
no membership. Its direct session summary is forbidden, and chained session
reads exclude summary. Both observed planner manifests include a Register.
The earlier scripted host admitted every kind and missed this policy boundary.
Inbox summary admission was also unproved. The existing native projector emits
installation rows only from Rules scopes. Selecting those scopes avoids
unrelated summary refusals without changing host authority.

At the original Main source `d73b53c971d90bb246bad868815912bad0e83682`,
listing always selected Signed summary reads. A Signed request binds actor,
scope, read, argument and expiry. The host checks framing, signature, target,
clock and expiry, then requires a recent local signer or recent genesis causal
root signer for summary (`packages/scope/src/signed-reads.ts:315–376`). The
proposed authority window is 900 seconds. A fresh request expiry does not renew
an old entry's authority. This path bypasses session readers. Inventory and
sweep instead acquire a membership session first and can retry forbidden
entry/history reads through Signed authority (`packages/cli/src/commands.ts:173–223`).
This adapter does not reuse those retry wrappers.

The existing session issuer checks the exact active membership, active member
and key, signature, clock, expiry, nonce and deployment bindings. Each target
checks the token MAC, deployment, exact recorded membership/incarnation, clock,
expiry and read permission. The client checks answer shape and the requested
membership scope, incarnation and actor key; the target authenticates the token
when used. This child changes no grants, authority, settings or session policy.

## Current evidence and its limits

Fresh repair evidence is open at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-application-release-session-recut`.
`prior-head/` is an exact size-and-hash copy of all 73 files sealed for the
rejected candidate. The original sealed directory remains unchanged. The
checked-in evidence manifest still describes that prior directory. One final
repair manifest and a new seal remain due after the new gate.

Fresh Node checks passed 15 cases in exactly two files: nine command-boundary
cases and six projector cases. CLI source, Node-test and Native-test compiler
contexts passed; the Native context also passed after the bridge repair. The
scripted paired host rejects non-Rules kinds and Signed Rules reads. Its session
path makes one acquisition and two Rules GETs, reports two applications and no
errors, and records seven not-applicable refs. Its Signed path makes two Rules
GETs, reports two forbidden errors and the same seven skipped refs. This is a
SCRIPTED kind-dependent host policy, not native membership or hosted authority.
The temporary TEST metadata print was removed and the exact Node test restored.

The new Native file creates a real room with Register, Directory, Membership,
Rules, Destination, Inbox and Lane, and installs one application through the
real runtime. Its eight real manifest refs cover seven kinds, including two
inboxes. Member B joins actual Membership, obtains an Inbox, and signs no Rules
entry or causal root. Without configured membership, that same B key makes one
Signed Rules GET, no session request, and receives code 1 with zero applications
and one forbidden error. With membership configured, B acquires a session from
the real issuer and the actual command loop makes one Rules GET. It returns
code 0, one exact installation row, no errors and seven not-applicable refs.
Both command calls run through `life.owner.required`. A separate actual
Register summary GET with that session returns forbidden; it is outside the
command and its request count.

The Native test uses real session issuance and MAC checks, Rules authorization,
SQLite, scope creation and Worker routes. TEST fixtures supply Git/package
responses, configuration/files, the setup reader, clock and finite scheduler.
The setup reader is not passed to the command. No clock manipulation is used
to expire the operator's authority and no fake session answer is supplied.
This is local Native evidence, not a live Worker or provider result.

The first Native attempt failed because the expected forbidden Rules reply was
reported as unavailable. A diagnostic attempt also failed, recording a fixed
`TypeError` category with `redirect: true`. Workerd's `Request` rejects Node's
`redirect: "error"`. The TEST fetch bridge now asserts the command's Node options,
uses manual redirect handling without following, omits credentials, and forwards
the actual method, body, Authorization and abort signal to the real Worker route.
It preserves the actual response, or only the required status/body when Workerd's
`redirected` accessor is unsupported. The production redirect wrapper is unchanged.

The repaired Native file first passed with stdout suppressed. A deliberate
recording run then passed with `--reporter=verbose --silent=false`, retaining
the safe TEST counts above. Its body took 448 ms. The wrapper recorded
4.873667 seconds wall time, 5.440026 seconds child user time and 0.837824
seconds child system time. These are two executions of the same final source,
not two independent authority implementations. Both failed outputs remain.
The historical initial and diagnostic sources were reconstructed from patch
history and matched their originally recorded hashes, rather than retained as
contemporaneous copies. Their hashes are respectively
`5b806870efdda07c475536a99237aa6cfae67470f833499aae274b3c5473dcdb`
and `eeab10af6cccb6e6be05615343729b0f8a455e231efaaedb1b6a73ef34b1dee1`.
Both verified snapshots and the inverse-edit reconstruction driver are retained
under `retained-harnesses/`. `native-source-retention.json` records their
provenance as reconstructed copies. No historical Native source remains missing.

Four separate controls change the Rules-kind filter, acquired reader, uncertain
acquisition stop, or skipped-row byte accounting. Each changed source compiles,
then one unchanged selected case fails at its named assertion. The controls
restore the exact adapter and Node-test bytes. No mutation sweep was run. The
prior candidate's first reader control did not compile because its variable
became unused; that result remains inconclusive and retained.

Current source hashes are:

- Adapter: `11996e1c016cc89a67953611a2f84b19decb765529253b56654485f2b295f010`.
- Node test: `5c08affb8905f15c74f3cd2caf1b9d9c198af42fc93ed230943516ecfb76ac25`.
- Native test: `c39325833b01e1a7d8f63e8cd5bcf5613f916e40b8b6aef09209c05d948fd81b`.

Focused and Native wrapper results bind the working state at base
`c338648408e37fb6d2ac2de2e45ce2b6a0e7aedf`, not a committed repair
checkpoint. They record command, exit, timings, before/after working-file
hashes and output digest. Standalone scripted recording and control records
name their current Git head/tree and source/test hashes, including temporary
instrumentation or the changed adapter. They do not record separate before/after
working-file inventories.
No package was installed. The new gate checkpoint will bind the final source.

The prior gate passed at `30a0933de6f5f612c79c4b44054c431f142eeab3`, tree
`168852247492ecd9c43dabbd64c3f622bd05079d`, before checker rejection.
Its wall time was 1,194.802030500 seconds and child CPU was 2,458.947548000
seconds. Prior reconciled totals were Node 66 passed, Counting 55 passed,
plain 2,863 passed and one skipped, and Native 795 passed and two skipped.
Both Vitest terminals had zero unhandled errors. Native callbacks lacked 17
ready and 38 result observations; those omissions establish no cause or missing
duration. Prior source equality binds that prior tree only, not this repair.

Paths below are relative to the fresh raw directory. `T` means
`node node_modules/typescript/bin/tsc`. `VC` means
`node node_modules/vitest/vitest.mjs run --project cli`. `VN` uses the same
Vitest command with `--project scope`. File selections and exact argv are in
each adjacent `result.json`. Times are observed wall/child CPU seconds, not
whole-edit latency or a controlled benchmark. Paired control timings list
compiler first, then witness. A dash means this table does not repeat a timing, or the check has not run.

| Check | Command | Exit | Wall/CPU seconds | Output and SHA-256 |
| --- | --- | --- | --- | --- |
| Prior gate only: passed before rejection | `npm run gate` | 0 | 1194.802030500/2458.947548000 | `prior-head/ordinary-gate/output.log`: `ca2e96d2f11d7fae9633b788d92c461b2d148b1cbd563b90a79ade8365f5b109` |
| Prior count reconciliation only | Retained analysis; reproduction argv in `prior-head/analysis-command.json` | 0 | — | `prior-head/ordinary-gate-analysis.json`: `90aefaa5d19092759fcd2a0a7896fddda833a76dca4fbdaac4bee70d48e73c84` |
| Prior unused-reader compile: inconclusive | `T -p packages/cli/tsconfig.json` | 1 | — | `prior-head/control-ignore-session-types/output.log`: `b9fa29d44f8d5022d5d2931cbacdaada6240d857cae53ffd1726f10e8878f1b3` |
| Current focused command/projector: 15 passed | `VC packages/cli/test/scope-index-applications.test.ts packages/cli/test/scope-index-applications-command.test.ts` | 0 | 1.527170625/2.339246000 | `focused-rules-only/output.log`: `d9fc51afd5a75fe7a343f841c3d3369a83fa692b45667da0b8ad400ae0a95af2` |
| CLI source types | `T -p packages/cli/tsconfig.json` | 0 | 0.290684041/1.236147000 | `cli-source-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| CLI Node test types | `T -p packages/cli/tsconfig.test.json` | 0 | 0.327514625/1.446036000 | `cli-node-test-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Native test types, initial and repaired bridge | `T -p packages/cli/tsconfig.scope.json; two observed runs` | 0 / 0 | 0.367531042/1.673488000; 0.364189666/1.688603000 | `cli-native-test-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `cli-native-test-types-bridge/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Initial Native: unavailable, failed | `VN packages/cli/test/scope-index-applications.scope.test.ts` | 1 | 4.994240458/6.411097000 | `native-complete-room/output.log`: `a71eab8f8692fcd1dd24b8e7c1eb5cd397dc7dfacb33a5f1018b84a6b1fa0f54` |
| Native diagnostic: redirect TypeError, failed | `VN packages/cli/test/scope-index-applications.scope.test.ts` | 1 | 4.731223708/6.102284000 | `native-bridge-diagnostic/output.log`: `0428327cb3f5117b636d2b279049671e1d355d37a5823e3a942e186d5327ef6e` |
| Repaired Native bridge: one passed; stdout suppressed | `VN packages/cli/test/scope-index-applications.scope.test.ts` | 0 | 4.765805834/6.172883000 | `native-complete-room-bridge/output.log`: `3f545d143f89db6caeaa561420756cccab9bd744c5b45721eb82096f1f0dc80d` |
| Native recording repeat: one passed | `VN packages/cli/test/scope-index-applications.scope.test.ts --reporter=verbose --silent=false` | 0 | 4.873667000/6.277850000 | `native-complete-room-recorded/output.log`: `52df3b39b7dbad66456923150021acf205ff430613dacd60c9d7d0780414de49` |
| SCRIPTED kind-dependent pair: one passed, eight unselected | `VC packages/cli/test/scope-index-applications-command.test.ts -t "uses one acquired session where the same scripted host refuses Signed reads" --reporter=verbose` | 0 | 1.246873292/1.658146000 | `recorded-kind-dependent-pair/output.log`: `13f42a681c2ac4123ffaa6936660a9ac0021f92011bc4a1da29686c391195eaa` |
| Reading skipped kinds: compiles, named assertion fails | `T -p packages/cli/tsconfig.json; VC packages/cli/test/scope-index-applications-command.test.ts -t "uses one acquired session where the same scripted host refuses Signed reads" --reporter=verbose` | 0 / 1 | 0.291384875/1.126374000; 1.235638209/1.685427000 | `control-read-non-rules-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `control-read-non-rules-witness/output.log`: `d175fd7129d6558ac059c2d55ded73f166e4f5625c6e9772d8965f7815235703` |
| Ignoring session: compiles, named assertion fails | `T -p packages/cli/tsconfig.json; VC packages/cli/test/scope-index-applications-command.test.ts -t "uses one acquired session where the same scripted host refuses Signed reads" --reporter=verbose` | 0 / 1 | 0.292479708/1.206747000; 1.227863334/1.671694000 | `control-ignore-session-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `control-ignore-session-witness/output.log`: `aa44c856d7dd1ac2c9f74294212835e7f7e406a9593b54cd8f4fed42a95247d1` |
| Continuing after uncertainty: compiles, named assertion fails | `T -p packages/cli/tsconfig.json; VC packages/cli/test/scope-index-applications-command.test.ts -t "stops private session exceptions, malformed answers and redirects before summary reads" --reporter=verbose` | 0 / 1 | 0.296327166/1.193876000; 1.241971542/1.665900000 | `control-continue-after-uncertain-session-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `control-continue-after-uncertain-session-witness/output.log`: `7b463338e59814d1d784fcbf0aabb13c60b84deb5b09d09ee564d45550f0a418` |
| Omitting skipped bytes: compiles, named assertion fails | `T -p packages/cli/tsconfig.json; VC packages/cli/test/scope-index-applications-command.test.ts -t "keeps empty success distinct from exclusive publication and output bounds" --reporter=verbose` | 0 / 1 | 0.291972666/1.190653000; 1.461646417/1.959993000 | `control-omit-skipped-accounting-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; `control-omit-skipped-accounting-witness/output.log`: `0ab4d705a276de07f69edf5f0a15e9d3700e31ef8641e1fc4bbbdc8069603fa8` |
| New ordinary gate for this repair: pending | `npm run gate` | not run | — | No new gate output or pass claim. |

## Open limits

The new ordinary gate, final raw packaging, replacement manifest, read-only
seal and exact-head checker review remain due under child `0c4a4236` and ruling
`382923ff`. The parent installed-release command request `521f57a1` landed
before this child; its prior result does not close this repair.

The planner owns Demo's missing operator repository configuration and reruns
`dap-grow`, `dap-lending` and `dap-demo` from the landed head. R11 deployment
stays held until those reports are complete. The observed eleven Grow and
eight Lending forbidden summaries prove neither the failed internal Signed
condition nor a defect in deployment settings. Local Native admission does
not establish live admission. The command proves no global inventory,
independent genesis replay, fresh status for skipped kinds, authority grant or
trust-policy decision.
