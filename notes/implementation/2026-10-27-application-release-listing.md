# List installed application releases

The Node operator command, projector, deployment guidance and ordinary gate
are complete. Exact-head checker review remains due. This note claims no
live read, landing or deployment.

## Request and read boundary

The assigned request is
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:521f57a15e85897faa9703ae3a7c8061c6d5589c`,
under promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:b1fb81ead56fdfc39eef978678430ebadc2e8200`.
It precedes R14 child `00abd5aa`; archive work under `0f0eeab7` still preempts.
No live read or builder deployment has run.

Ruling
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:2dc765ac41e0287b5854e0790622ad29a4d0033a`
answers request
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f7825ea7a2a01eeb7e4803d6760325e66f795895`
and defines the no-registration/write condition as no mutation, session,
registration or retry request issued by this command. Existing server read
maintenance remains permitted and explicitly qualified.
At base Main `f9aca97f84803860cb10a714b1bf643e50bc87f1`,
`packages/scope/src/scope-index.ts` can call `registerKnown()` during an unknown
register-mode lookup, including a read. A public summary enters `#invoke` and
`#first` in `packages/scope/src/object.ts`; those paths can diagnose archives,
recover alarms and resume parked operations. Enforce mode alone does not remove
the first-turn work. An existing public read cannot guarantee zero incidental
server writes. The existing `scopeIndexAccess` also acquires a session and may
repeat a forbidden read with signed authentication.

The Node adapter validates the saved manifest locally, then issues one
signed-only bounded summary GET per listed scope, without a session, retry,
fallback, pagination, redirect, mutation or registration request. A summary can bind
the observed full scope reference and native pin, but cannot reverify the saved
genesis hash. No new server endpoint or deployment is part of this work.

The ruling confirms the locators. Each row uses `scope` for the
created application and `installItem: {scope, item}` for the owning Rules scope
and installation ID. This preserves both full references within the five
requested fields.

Run `dap scope-index applications --manifest FILE --out FILE` with the saved
operator manifest and matching CLI configuration. Existing exclusive atomic file
publication never replaces a prior report. Saved JSON contains only
`manifestPath`, `manifestDigest`, `applications` and `errors`. Its run summary
pairs the same absolute manifest path and exact saved-byte digest with counts
and complete/incomplete status. It prints no service configuration. Every
unreadable scope has a validated fixed reason or `unavailable`; exception text
is never emitted. An incomplete report is saved with exit 1. Invalid local
inputs, missing signing custody, failed publication or an oversized report
produce a fixed error and no partial output file.

Local manifest validation precedes signing-key access and the network. The
adapter reuses existing signed reads directly, bypassing the session/fallback
inventory adapter. Reads are serial and bounded to the manifest's 4,096 scopes,
4 MiB and 30 seconds per response. It aborts caller waiting at the existing
transport deadline; an injected fetch that ignores cancellation may retain its
own resources. Output is limited to 16 MiB with exact UTF-8 accounting before
retaining each row. A cap failure stops the run and publishes no report, so it
cannot be mistaken for a complete inventory. No settings or persistent signing
custody are written. `docs/deploy.md` tells the planner to retain each manifest
pair and obtain a complete report for Grow, Demo and Lending before further
R11 deployment; reported release/publisher/host rows populate current trust.

## Implemented projection

`projectScopeApplications(listed, reply)` returns only `applications` and fixed
per-scope `errors`. Each application has exactly `scope`, `installItem`,
`release`, `publisher` and `host`. It reuses the strict Read/Summary validators,
the native catalog and the canonical release-URI parser. It emits no URI,
private item slots, body, signature, header, token or setting.

The projector checks exact scope identity, active status, complete response,
no continuation, supported native pin, native kind, sorted unique item IDs,
non-null opening digests, revisions and complete native type/state counts. Live counts
must agree with the listed items and pinned maxima. Retained final counts are
safe integers; they are not capped at the live-item maximum or presented as
independent journal completeness. Only native Rules installation pins qualify;
declared items with the same name cannot impersonate them. Known older Rules
without installation support can report a complete empty result.

Active installations require valid release, publisher, application and context
references, and canonical release URI. Only its hostname is projected. A
malformed active sibling invalidates the whole scope's rows. A pending job
retains valid active rows with a fixed `installation-pending` error: a real
application child can precede its active announcement. The caller must treat
that result as incomplete. This is a deployment observation, not replay or a
trust grant. The transport owns byte and deadline bounds; this pure
function performs no read or output operation.

## Evidence and limits

The ordinary gate naturally passed at clean checkpoint
`1cd66fe74b4d0d820066cec67207c33ff3e99c1c`, tree
`174b2b483e31053f141b7e5b0af31418953d1b6e`, with no interruption or signal.
The checkout stayed clean at that head. The driver measured 1,133.03317525
seconds wall and 2,335.568022 seconds child CPU. Node reports 57 passed;
Counting reports 55 passed; plain Vitest reports 2,859 passed and one skipped
across 281 passing modules; Native reports 795 passed and two skipped across
232 passing and one skipped module. All eleven new cases passed. All five
stages reached natural success with zero unhandled errors. Final identities
are unique and reconcile to public terminal records. Plain has all 2,860
ready/result/final callbacks. Native has 797 final callbacks; thirteen lack a
ready callback and 36 lack a result callback. Those omissions establish no
cause, readiness or missing duration. Concurrent case/module duration sums are
neither wall time nor CPU. The retained analyzer hashes its 39 gate inputs.

Raw evidence is indexed and read-only at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-application-release-listing`.
The checked-in manifest is
`notes/implementation/evidence/2026-10-27-application-release-listing.manifest.json`.
It names every retained file, including the checksum index. All 1,844 tracked
paths outside `notes/` have identical Git blob bytes at the gate checkpoint
and this worktree. `gate-source-equality.json` has SHA-256
`39fa8bec6fca2a87046176e5ee6a05af35b9a60978f2a415ab9f011b9740ef8c`.
Only this reporting note and its evidence manifest follow the gate.
The projector SHA-256 is
`f07250f67ae3025facce3c4c0f0340de38aef18a0f96c440b1a7ce3743a9289c`.
Working-file hashes and base head/tree are retained by the command wrappers.
No packages were installed. A private copy of the existing exact-lock dependency
view was rebound to this worktree: 14 workspace links, zero dangling links;
lock SHA-256 `645224923cabfd70b51b8add2a43be12673444779d18002a42ed4254b3216d6e`.

One existing genuine Native Counter install case executed this exact projector
on actual Rules@5 summaries before and after installation. It observed no
installation at head 1 and one active installation at head 10, item 2, phase
creation. One selected case passed, seven were unselected, and no unhandled
error occurred. Its driver measured 5.621585334 seconds wall. Only the projected
metadata and safe provenance were retained; stdout/stderr were hashed and
discarded. Both were empty on the accepted attempt. Retained trusted TEST source
contains fixture-building code; it is not a capture of runtime bodies or
headers. The temporary test instrumentation was restored exactly.

The first capture filter did not produce an accepted record; its missing
terminal ledger prevents a callback-level conclusion. The second retained
ledger establishes that all eight cases were skipped and none selected. The
corrected filter matches Vitest's quoted expansion of the case name; the third
attempt is the accepted capture. Both earlier harness attempts remain failures,
not Native installation evidence.

The checked-in fixture retains the two successful metadata projections. The
plain regression reconstructs explicitly SCRIPTED Summary envelopes with
placeholder non-output slots. Its forbidden and malformed-publisher cases are
scripted derivatives, not recorded hosted failures or another Native execution.
A later fixture provenance sentence changed no sample field; before/after
hashes are retained. The six cases passed before a test-context compiler check
found a readonly fixture mutation. Replacing that assignment with an immutable
item copy passed both the compiler context and the same six cases.

Four paired controls deliberately drop an installed row, reject a valid empty
scope, hide an unreadable scope, or hide a malformed installation. Each passes
the CLI source TypeScript context, fails exactly its named unchanged assertion,
and restores the same projector bytes. The initial drop-row control used a
constant false branch that lost TypeScript narrowing; it did not compile and
proves nothing. The repaired control uses a reachable unused object expression.
The later readonly repair affects only the separate recorded-sample test; the
four selected control witnesses are unchanged. These are requested outcome
controls, not a mutation sweep.

Two further transport controls compile the actual adapter. Adding a second
summary GET fails the unchanged call-count assertion (ten calls instead of
five). Emitting caught exception text in `why` fails the unchanged fixed-error
array assertion with the TEST sentinel visible; the later sentinel-absence
boolean is not reached, and is not claimed as the distinguishing assertion.
Both controls restore the same adapter SHA-256
`005bb51f6dfc7f3979e966878fb25780700b33506110edae81e3dae33d0946bd`.
Command tests also cover local validation before signing, no store writes,
redirect refusal, response bytes/deadline, exclusive publication and the real
16 MiB output cap. These HTTP replies are scripted, not live reads.

The initial five-case run passed, but its outer `/usr/bin/time -lp` command
exited 1 after a sandbox-denied `sysctl` call. That wrapper result is retained
and is not called a successful command. Later Python wrappers record wall and
child CPU directly. These are command intervals on a shared Darwin arm64 host
with existing caches, not whole-edit latency or an isolated-machine benchmark.

| Check | Command or retained record | Exit | Output and SHA-256 |
| --- | --- | --- | --- |
| Initial five cases pass; timing wrapper subsequently fails | CLI Vitest owning file under `/usr/bin/time -lp` | wrapper 1 | `projector-initial/test.log`: `a91c1477896564c029240baf4522df91b7b85c11f052c2d082bd89e94644ec22` |
| First capture not accepted; terminal callbacks unavailable | focused Native capture driver | 1 | `native-recorded-counter-20261027/result.json`: `433177541a34015400e480cff5b327d4050b9a5869eade7fc420f3e672c10c2e` |
| Second filter selects no case; all eight skipped | fixed-category terminal ledger | capture 1 | `native-recorded-counter-diagnostic-20261027/recorded-metadata.json.terminal.json`: `4caf86f3d0c1f63d88a30012d8403408232e62e427cffba4adc55d263303fcff` |
| Genuine Native none/one projections; one passed, zero unhandled | focused quoted-name Counter capture | 0 | `native-recorded-counter-selected-20261027/recorded-metadata.json`: `ca47fcd65d876b175af34b6d54466b212f807d02f4daa276cdc48b097693b70c` |
| Recorded sample and five original cases pass | CLI Vitest owning file | 0 | `recorded-sample-owning-plain-20261027/output.log`: `46991293842c9f5c1139b100a1e6f567a6b49c9723c0734603eb3bead2ca2ff8` |
| Initial drop-row control does not compile; inconclusive | CLI source TypeScript context | 1 | `paired-control-installed-row/typecheck.log`: `b183d5357f5931e3fe65a1b1da1fbc99d969d8021a5cf4f8882727427b09de88` |
| Four repaired paired controls compile, distinguish and restore | `python3 /private/tmp/artroom-listing-controls-20261027.py` | wrapper 0; children 1 | `final-paired-controls-run/output.log`: `afd17a2606c472104b3b094391ea44ffceb6258ac415a84f44252bb2671e66d6` |
| Test-context readonly mutation found | `tsc -p packages/cli/tsconfig.test.json --noEmit` | 1 | `owning-test-typecheck/output.log`: `417cf727a704eb40bb56c3570537bd22149447d74f6d410dfb340b0f18567957` |
| Immutable fixture repair compiles | same test TypeScript context | 0 | `repaired-test-typecheck/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Repaired owning file: six passed | plain Vitest, CLI project, one file | 0 | `repaired-owning-plain/output.log`: `cbe46e09860677c68da09ed2878142489ef8deea99044b49207de614c133f9eb` |
| Shared helper audit: 678 sources, 134 byte exports | `node scripts/check-shared-helpers.mjs` | 0 | `owning-shared-helpers/output.log`: `850cd7e06f8c7ea8d72b66f47d47eb4c5cd252a6612edd2621450af3752f425c` |
| New command, projector and legacy operator cases: 16 passed | three focused CLI Vitest files | 0 | `command-plain-01/output.log`: `21e9bbfcd9f6e7cd6efb0389de85b19804ca2c7e2638cd0dac0c5ce5d1a7b1ed` |
| CLI source compiler context | `tsc -p packages/cli/tsconfig.json` | 0 | `command-ts-source-01/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| CLI test compiler context | `tsc -p packages/cli/tsconfig.test.json` | 0 | `command-ts-test-01/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Page and MCP browser-resource freshness: two passed, two unselected | two focused freshness witnesses | 0 | `browser-resource-freshness/output.log`: `58b17a927379e678779ea7670d8b3e874bf4b59018c4734c6cd93fda82333d5f` |
| Repeat-read transport control compiles, fails call-count assertion, restores | selected command witness | compiler 0; child 1 | `command-transport-repeat-control-01/selected-test.log`: `12377382849f28f3458c21d25cefc9b68ddcda85e9b54a3cd1ba31297b31282d` |
| Exception-disclosure transport control compiles, fails fixed-error assertion, restores | selected command witness | compiler 0; child 1 | `command-transport-privacy-control-01/selected-test.log`: `9dbcdb203362ca2f4299ab37c65865a3e675008c621e4cc47438545b60d70d88` |
| Ordinary gate: all five stages passed at the exact checkpoint above | `npm run gate` | 0 | `ordinary-gate/output.log`: `bf7725e21f4d1b4beff57b6ad64261d463ff5980d8aa462c051b4fa687a64f32` |
| Closed-gate reconciliation: unique finals and qualified callback gaps | offline gate analyzer | 0 | `gate-analysis/analyze.json`: `504f57a87889aa414db9f3fa2b9e6368159d4701ecce13627ee5ef34c52e2b68` |

## Remaining work

Exact-head review remains due. The focused command run
passed 16 cases across three files, including the legacy operator commands;
both changed CLI TypeScript contexts passed. The planner performs all actual
Worker reads and trust updates. No landing or deployment is claimed here.
