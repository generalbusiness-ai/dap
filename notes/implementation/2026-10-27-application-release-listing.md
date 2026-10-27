# Prepare the installed-release metadata listing

This is a preparation checkpoint, not a completed operator command. The pure
projector, recorded TEST metadata, six focused cases and four paired controls
are complete. The transport, command dispatch, deployment paragraph, ordinary
gate, final manifest, evidence seal and checker review remain due.

## Request and unresolved boundary

The assigned request is
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:521f57a15e85897faa9703ae3a7c8061c6d5589c`,
under promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:b1fb81ead56fdfc39eef978678430ebadc2e8200`.
It precedes R14 child `00abd5aa`; archive work under `0f0eeab7` still preempts.
No live read or builder deployment has run.

Ruling request
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f7825ea7a2a01eeb7e4803d6760325e66f795895`
asks how the no-registration/write condition applies to existing server reads.
At base Main `f9aca97f84803860cb10a714b1bf643e50bc87f1`,
`packages/scope/src/scope-index.ts` can call `registerKnown()` during an unknown
register-mode lookup, including a read. A public summary enters `#invoke` and
`#first` in `packages/scope/src/object.ts`; those paths can diagnose archives,
recover alarms and resume parked operations. Enforce mode alone does not remove
the first-turn work. An existing public read cannot guarantee zero incidental
server writes. The existing `scopeIndexAccess` also acquires a session and may
repeat a forbidden read with signed authentication.

The proposed adapter would validate the saved manifest locally, then issue one
signed-only bounded summary GET per listed scope, without a session, retry,
fallback, pagination, redirect, mutation or registration request. That boundary
needs the planner's explicit ruling before implementation. A summary can bind
the observed full scope reference and native pin, but cannot reverify the saved
genesis hash. No waiver or new server endpoint is inferred here.

The same ruling asks about locators. The current row uses `scope` for the
created application and `installItem: {scope, item}` for the owning Rules scope
and installation ID. This preserves both full references within the five
requested fields. It remains provisional until the ruling arrives.

## Implemented projection

`projectScopeApplications(listed, reply)` returns only `applications` and fixed
per-scope `errors`. Each application has exactly `scope`, `installItem`,
`release`, `publisher` and `host`. It reuses the strict Read/Summary validators,
the native catalog and the canonical release-URI parser. It emits no URI,
private item slots, body, signature, header, token or setting.

The projector checks exact scope identity, active status, complete response,
no continuation, supported native pin, native kind, sorted unique item IDs,
sealed openings, revisions and complete native type/state counts. Live counts
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
trust grant. The future transport owns byte and deadline bounds; this pure
function performs no read or output operation.

## Evidence and limits

Raw preparation remains open and unsealed at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-application-release-listing`.
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

## Remaining work

Resolve `f7825ea7`, implement the agreed transport/command and deployment
paragraph, run its focused command witnesses and the ordinary gate once, then
finish the PD-2 manifest/seal and exact-head review. No artifact report, review
request, landing or deployment is claimed by this checkpoint.
