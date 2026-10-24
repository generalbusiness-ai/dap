# Application install trust before fetch

R10 binds MCP `install_application` to the operator's exact release,
publisher, and Git hostname. The shared `APPLICATION_TRUST` parser lives in
the client application module and is re-exported by Scope admission, so
native hosting and MCP use one schema without a dependency cycle.

MCP retains actual-target standing and tool selection before package work.
After bounded install input validation, it checks release and host before
opening any transport, then checks again after custody waits before building
a new envelope. The existing immutable URI grammar, SHA-1-only public host,
manual redirects, 4 MiB package bound and transport deadlines remain.
Three existing client signed-install builders accept an optional expected
publisher and compare the already-decoded manifest before signing. Existing
callers remain compatible; no second package decode is added.

The native resolver also checks the host row before its existing source-open
boundary. Content and screen readers share the new schema. This does not
implement R11 refusal of acts under a later revoked release, change retained
native authority, or add a new install route.

All configured two-field trust rows must be migrated to the exact
`{release,publisher,host}` schema before deployment. Absent lists stay closed;
old or malformed lists fail as a whole. Grow's existing row gains only
`github.com`. Local `dap mcp` and `dap install` need the same policy in their process environment
to install packages. The planner owns settings review and deployment with
`--keep-vars`; no binding or package dependency is added.

Local witnesses include one MCP Node case using the actual
dispatch, custody and HTTPS Git opener with scripted room answers and an
outbound response stand-in: untrusted releases and wrong hosts send no
package request, a changed policy across the custody wait is rechecked,
and a trusted host's redirect is refused without a second request. Existing
client signing and native install-custody witnesses retain full package
integrity, publisher and native submission checks. Fixture trust rows gain
explicit TEST hosts; no membership or native authority is fabricated by the
new check.

## Local validation

At source checkpoint `fc42cb67`, original run 18241 completed all nine
compiler contexts and the body command with exit 0. All 73 cases in 19 whole
files passed, with 73 collected case identities, 73 started callbacks and
73 result callbacks, one terminal end, and no unhandled errors, retries or repeats.

The strict focused pipeline and outer owner still exited 1. The static ledger
omitted the ` > ` separator between the existing describe title and four
`errors.test.ts` titles (lines 95, 111, 132 and 144, under the describe at
line 93). The strict ledger consequently records 69 passes, four planned
names as unrun and four observed names as unexpected. Those four cases
actually ran and passed. The separate source-to-result mapping supplies
only those four exact aliases. The original failed artifacts are preserved;
no source fix or healthy repeat was used. Root accepted the actual result
in `6993ded4e85b8d131bc625e02aff5c3123d0663a` after the independent audit
at `/private/tmp/artroom-security-r10-install-trust-closed-validation-audit-20261024-v1/audit.json`.

The maintained producer then completed all six actual source seals at the
same checkpoint. Root adopted three existing rows (worker, hosted and
service) and three new rows (trust parser, signed install and native
resolver) from its output. All six R10 target source files retain the
validated bytes.

The host-match control, original 51898, completed with owner exit 0 and
child exit 1: three cases passed and the intended case failed at
`hosted-tools.test.ts:152:22`, where the wrong-host setting recorded one
request instead of zero. Later policy-recheck and redirect assertions were
unreached in that mutant. Its request used a test-owned response stand-in;
no live provider was contacted. The four lifetime snapshots passed their
fixed-vector checks, and the original source bytes and physical identity
were restored. Root accepted this proof in
`59f8db02d0fdc268f3bc1105bed40fe0258b2e43`. The independent audit is
`/private/tmp/artroom-r10-host-match-control-independent-audit-20261024-v1/audit.json`.

The measured outer commands were separate:

| Command | Wall seconds | CPU seconds |
|---|---:|---:|
| Private dependency copy, original 6004 | 2.31 | 1.92 |
| Compatibility, exit 0 | 0.08 | 0.07 |
| Affected validation, original 18241 | 119.12 | 110.33 |
| Six-seal producer, exit 0 | 0.20 | 0.29 |
| Host-match control capture | 1.39 | 0.82 |
| Host-match control, original 51898 | 3.80 | 4.26 |

These are local observations, not the full edit-to-review cost. Nested
compiler and body costs overlap the outer validation and are not added.

## Approved Main integration

Approved Main `55e4be6c` is merged in source. Its twelve non-map files are
unchanged from that head. The map preserves all six actual R10 values and
R9 values while taking eight approved archive slots across seven owners,
including the new restart parser. R10 production, trust fixtures, selected
test files and deployment settings remain unchanged.

The shared object and test worker do gain the approved restart code. The
worker's restart map is empty by default, and none of the selected R10
fixtures populate it. Existing archive-enabled recovery checks the stored
scope's active status before checking for an absent restart directive, so
it can add that scope SQL read. No new package dependency or compiler
configuration is introduced. The prior 73 passing cases and control proof
remain historical evidence for their exact source, not a fresh pass of the
merged shared runtime. No healthy test repeat was used for this merge.

## Common delivery status

Approved R9 Main `56de75676275e07e02887c7c1b5aaa862668fac6` is
integrated. The later [common delivery note](2026-10-24-security-common-delivery.md) records the
composed Worker/object seals, hosted trust control `5743`, failed gate
`70364`, passing repair continuation `70072` and Node 39/Counting 55 tail
`26900`. Historical controls remain bound to their recorded source; the
failed gate remains failed.

Checker review `a4cdaecc395635ca470fcce2d11e1e78a6b9d87f` found no
code defect and required a fresh ordinary gate on the repaired code before
resubmission. The later common gate `90462` failed only in Lending; isolated diagnostic
`10462` and complete Lending witness `14055` then passed. The added return
precondition closes a real fixture gap without proving the original cause.
Fresh ordinary gate `61084` passed at `c215460f`: all eight stages, 40
compiler invocations, 3,553 passed Vitest cases and three ordinary skips, Node 39
and Counting 55. Its 3,556 exact terminal IDs include all 140 affected cases,
34 control-baseline cases, 26 repair cases and complete Lending. Twenty ready
and 21 result callbacks are absent, all for passed terminal cases; none is
invented. The common note preserves all failures, exact evidence, boundary
guards, costs and limitations. Root accepted the closed result in
`5598747d962d526061e022a19754e63e4e0606a6` and adopted the independent
audit in `29ad36ec579af56283987d9209d776c4b19ac018`. Exact-head review
approval and landing remain pending. Settings migration and
deployment stay with the planner; `--keep-vars` does not migrate old trust
rows. No deployment is claimed. The original implementation base remains
R9 `ba8c3d121bf691336e645bbc6e3c164ab0608363`.
