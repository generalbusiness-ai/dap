# Report Worker observations with explicit coverage limits

Source, focused checks, the ordinary gate and evidence packaging are complete.
Exact-head checker review remains due. Review and landing wait
behind the installed-release listing request `521f57a1`. This note claims no
live query, real credential use, landing, or deployment.

## What changed

`scripts/usage-report.mjs` reads one bounded 30-day Analytics Engine aggregate
and compares it with the checked-in Worker inventory. The CLI accepts a
32-character account ID, an external mapping path, optional Worker selections,
and an optional completed UTC end time. The credential comes only from bounded
noninteractive stdin. It is absent from arguments, files, environment fallbacks,
SQL, and reports. Provider error messages are not emitted. A report containing credential text
is withheld completely. The CLI emits no replacement report in that case.

The operator mapping associates historical deployment labels with configured
Worker names. Its real path must lie outside the current worktree and the
actual common-Git repository. The repository keeps only a schema and TEST
example. Reports name the mapping as operator-declared and retain its hash and
alias count. They do not print aliases or infer authenticated Worker identity.

Groups receive `observed`, `zero-observed`, or `unobservable`. A zero says
“no observed use” within returned points and states the sampling, loss,
missing-summary and alias limits. Individual HTTP routes, binding use,
native platform versions, and features remain unobservable. An unavailable
static route catalog is explicit and never means that a Worker has no routes.
The current structural projection has eight Workers, 181 potential handler
route rows, and 29 configured bindings. These are source counts, not hosted
observations or deployed settings.

The script shares the existing entry-point inventory and JSONC literal parser.
`security-settings.mjs` adds only an export on `configOf`. No Worker is imported
or started. The coarse place matcher is a finite source projection with a
URL-admission stand-in over constructed route templates. It supplies no native
authority or deployed reachability evidence. Bindings come from configured
names, not every conditional settings reader. The new Node witness runs once
in the existing fixed test owner. No dependency, Worker setting, telemetry
field, native version, route, or deployment is added.

## Decisions and scope

This delivers child request
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:00abd5aa9c23343233e8b7006877ad1cc9c91ec7`,
under promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:fe24c6795c1ccd36466004d6f37f057dd20a089a`.
The accepted partial is ruling `c0832d1f`. Parent R14 `bb763efa` remains open
for the route, native-version and feature gaps recorded in `244115c5`. The
planner performs the first actual query with its own token and mapping. Archive
measurement work under `0f0eeab7` preempts this child.

The script makes one POST to the account-scoped `analytics_engine/sql` API
against `artroom_metrics_v1`. It does not retry, paginate or follow redirects.
It queries a half-open window of exactly 30 days, using validated integer
seconds. It selects no request, trace, scope, body or signature fields. Sampling
weights estimate event counts. A maximum loss mask indicates that some recorded
loss occurred; it is not an OR of masks. Missing loss summaries cannot certify
complete capture. `turn` and `pre-turn` are execution labels, not accepted acts.

Bounds are 4,096 visible ASCII credential bytes plus one optional LF or CRLF,
10 seconds for input, a 64 KiB regular mapping file, 32 Worker rows, 16 aliases
per row and 128 UTF-8 bytes per alias. The query and body share a 30-second
deadline, 8 MiB and 65,536 chunks. At most 8,192 groups are accepted; SQL asks
for one extra group as a local refusal sentinel. Optional limit metadata can
make a query incomplete, but its absence or equality never proves coverage.
Unknown response-envelope fields, including explicit failure fields, refuse
evaluation. Metadata and every group are validated before any zero claim.
Safe integer numbers and canonical decimal strings are compatibility inputs;
Float64 metadata does not authorize fractional or unsafe counts. These are
local parser rules, not observed guarantees from a hosted SQL service.

The credential witness exposed one concrete bug: a fallback JSON object could
itself contain a credential equal to a fixed key or refusal value. The real
witness failed before repair, and passes after complete report withholding.
The completed implementation already destroyed an owned Node Readable after
input timeout; its real PassThrough witness passes with an injected timer.
The abort and closed-input fences reject late work. They make no claim of
physical cancellation for an uncooperative injected iterator or fetch promise.

The four child-required controls each change one condition, pass Node syntax,
and fail the unchanged named assertion. Disabling credential withholding
exposes the colliding TEST strings. Disabling the unmapped flag falsely returns
success. Admitting the extra group accepts an incomplete result. Replacing
qualified zero wording with “never used” fails its wording assertion. Every
control restores the same exact source. They were repeated only after the
response-envelope rule changed, to cover the final source.

## Evidence

Source checkpoint: `2617c210ba4efb927c3fd9436b8b5c16acb0ba68`, tree
`556d8c1f5a47e85457c13b8b096b1311e834ae0f`. Focused checks ran on earlier
working states of base Main `f9aca97f`; owning and control-wrapper results
retain their command, head, tree, changed-file hashes, exit, wall time, child
CPU and output hash. Individual control results retain arguments, syntax and
child exits, and output hashes. The final
core SHA-256 is `4860370b4afb21cb04e8c3679a9c0f740b97d794b8f7c64b506d263c4bfc2214`.
No package was installed: the private dependency view was copied from the prior
verified exact-lock view, rebound to this worktree, and checked for dangling
links. The lock SHA-256 is `645224923cabfd70b51b8add2a43be12673444779d18002a42ed4254b3216d6e`.

Recorded TEST emissions execute the actual `Metrics` writer into a scripted
sink with fixed timestamps. The writer SHA is
`f3ebf8c17fe91239bae1f5a9c0238584b836e7929822e2bfe81822cfc41d9c4a`;
the 3,654-byte fixture SHA is
`a57324e9a5b6a181a12d7016a2cde61097d3efc990aebb3274431af492934965`.
The SQL envelope is a separately authored projection of those points, never a
recording of provider aggregation or SQL execution. The TypeScript recorder
runs through the existing pinned loader. No changed TypeScript compiler context
contains it, and no static type-check claim is made for that fixture source.
The ordinary gate still runs the repository's compiler contexts.

Two initial static probes read an obsolete schema field and failed. Their
results are retained as harness failures, not schema defects. The corrected
probe follows the actual negated pattern and checks embedded and trailing
control characters. The schema bytes were unchanged. Earlier probe source was
overwritten before retention; its exact bytes are unavailable. The corrected
probe is retained. The initial token failure remains a failure; passing later
checks do not relabel it.

The ordinary gate naturally passed at checkpoint
`815a780cdf87583cccb60888172265491cbe5dbb`, tree
`89a77ba8ad0f04dcb1b78edb827916b599e837a0`. Its checkout was clean before and
after, with no signal or interrupted stage. The driver measured
1,183.684096083 seconds wall and 2,383.665516 seconds child CPU. Node reports
66 passed, including the nine new cases; Counting reports 55 passed; plain
Vitest reports 2,848 passed and one skipped across 279 passing modules; Native
reports 795 passed and two skipped across 232 passing and one skipped module.
All phases reached natural success with zero unhandled errors. Final identities
are unique and reconcile to public terminal records. Native has 797 final
callbacks; 16 lack a ready callback and 38 lack a result callback. Those missing
observations establish no cause or missing duration. Plain has all three
callbacks for each final identity. Concurrent case/module durations are neither
wall time nor CPU. The retained analyzer hashes its 39 gate inputs.

Raw evidence is indexed and made read-only at
`/Users/hughpyle/play/artroom-evidence/2026-10-27-security-r14-usage`.
The checked-in manifest is
`notes/implementation/evidence/2026-10-27-security-r14-usage.manifest.json`.
It names every retained file, including the checksum index. The 1,847 tracked
paths outside `notes/` have identical Git blob bytes at the gate checkpoint
and this worktree; `gate-source-equality.json` has SHA-256
`ad1256fa6d11ea145a469702148640231f1518d13f5ad6e47d6372fa6b64b629`.
Only this note and its evidence manifest follow the gate. Timings
are the observed command intervals and child-process CPU retained in each
result. They are not a measured whole-edit latency. Machine: Darwin 27.2.0
arm64, 18 CPUs, Node v26.12.1, shared load and existing private caches. No
cold-cache or isolated-machine claim is made.

| Check | Command | Exit | Output and SHA-256 |
| --- | --- | --- | --- |
| Actual Metrics writer into fixed TEST sink; recording/provenance only | `python3 /private/tmp/artroom-r14-record-fixture-20261027.py` | 0 | `record-test-emissions/output.log`: `1d5f4d92d4b31a9b8a5243da30bb84321ef0d3aea03addbb78b542c1a4b250c8` |
| Initial token-collision witness: 7 passed, one nested failure and its failed parent (2 failures); stdin teardown passed | `node --test scripts/usage-report.test.mjs` | 1 | `token-boundary-before-withholding/output.log`: `14a9b075733fb708896f732c3e8c7209ec00bbaa09ee31a07a5e5b862b8e758b` |
| Withholding repair: 9 passed | `node --test scripts/usage-report.test.mjs` | 0 | `owning-after-withholding/output.log`: `6dd0a97f4aad5acbbac56e0bf61595d4eed7ddad276b2c050841a0d96a873eee` |
| Initial four required controls: all compiled, distinguished and restored | `python3 /private/tmp/artroom-r14-controls-20261027.py` | 0 | `four-requested-controls/output.log`: `db1a80aafcc23b40adb928024acd08458008b5b6ee033da09051c437ab4ec59b` |
| Final response envelope: 9 passed | `node --test scripts/usage-report.test.mjs` | 0 | `owning-final-response-envelope/output.log`: `b73ec7c1ffb575d86d5c59257bdf2b826a92ea58c6cb808640ca93b2a6f8b7b2` |
| Four controls at final source: all compiled, distinguished and restored | `python3 /private/tmp/artroom-r14-final-controls-20261027.py` | 0 | `final-four-requested-controls/output.log`: `0c6d9900e1fc03f2fbea3a79fd1bba1cddbec63106539cddb401eb42a77b0ec8` |
| Credential collision control; expected assertion failure | `node --test --test-name-pattern '^usage report never discloses' scripts/usage-report.test.mjs` | 1 | `final-control-token-non-disclosure/output.log`: `a8301ab8150afcf2a21a97555f079212c07382101f8b313e3e9f92c34b35bd39` |
| Unmapped Worker refusal control; expected assertion failure | `node --test --test-name-pattern '^usage report explicitly refuses an unmappable Worker' scripts/usage-report.test.mjs` | 1 | `final-control-unmappable-worker/output.log`: `cf10b798f8e2d9415f56ce82eeff22113754ec5c79741ee1ace29ff16fe9dda6` |
| Cap-plus-one response control; expected assertion failure | `node --test --test-name-pattern '^usage report refuses truncated or bounded-out observations without zero claims' scripts/usage-report.test.mjs` | 1 | `final-control-truncation/output.log`: `8b9ff9b242ff1e032320f2c98be060717a6d737f425dd4e9e0a1eab733ebda11` |
| Qualified zero-observation wording control; expected assertion failure | `node --test --test-name-pattern '^usage report says no observed use within stated coverage, never never used' scripts/usage-report.test.mjs` | 1 | `final-control-qualified-wording/output.log`: `03f2218910ab307aa960221ca7285aca700f02d46d62158e0f35c94a855cb312` |
| Existing settings inventory and test-owner files: 9 passed | `node --test scripts/security-settings.test.mjs scripts/test.test.mjs` | 0 | `owning-settings-and-test-owner/output.log`: `fdc91771fbd9d7354aa98c18ed4eb0c67094964d5a2e27a3ff62800921cb4819` |
| Shared helpers: 677 sources, 134 byte exports | `node scripts/check-shared-helpers.mjs` | 0 | `owning-shared-helpers/output.log`: `e7bca15674d0020ad719f59665f93de6513ec2298f6c29cfe46c5d410e283ea5` |
| Document links: 712 checked, none broken | `node scripts/check-doc-links.mjs` | 0 | `owning-document-links/output.log`: `d32eaa916626747fdc1c632131b58a6e719335f9eb304291180692016a1b1dc5` |
| Node syntax | `node --check scripts/usage-report.mjs` | 0 | `owning-syntax/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Initial static probe: wrong schema field assumption; no implementation failure established | `node /private/tmp/artroom-r14-static-probe-20261027.mjs` | 1 | `schema-example-and-owner-plan/output.log`: `4b6120dde65359b15cb08c97757e1c22346c88a523e19201e5848313fe111cf7` |
| Repeated static probe with same obsolete assumption; not relied on | `node /private/tmp/artroom-r14-static-probe-20261027.mjs` | 1 | `schema-example-and-owner-plan-repair/output.log`: `4b6120dde65359b15cb08c97757e1c22346c88a523e19201e5848313fe111cf7` |
| Corrected schema/example and fixed-owner probe: 8 Workers, 181 catalog routes, 29 bindings; test file included once | `node /private/tmp/artroom-r14-static-probe-20261027.mjs` | 0 | `schema-example-and-owner-plan-final/output.log`: `ade296e35123caff8e5385f295daa706fdf0cd7dab4a6d5d4b39c18298fb9297` |
| Ordinary gate: all five stages passed at exact checkpoint above; no unhandled errors | `npm run gate` | 0 | `ordinary-gate/output.log`: `0df42cad84d939d26efdd4c15e3b9f1e394611a229c6a55882d1f36a2211cc5f` |
| Gate reconciliation: unique finals, terminal totals and callback gaps | `python3 /private/tmp/artroom-r14-gate-analysis-20261027.py` | 0 | `gate-analysis/analyze.json`: `0e9fd8c186299f8ed483af3975d6eae422725f05d9a30701bfec479b66f24330` |

## Open limits

- Exact-head review remains due under the child request above. The
  installed-release listing `521f57a1` precedes review and landing.
  No hosted compatibility or actual account coverage has been established.
- Parent R14 remains open. Deployment aliases cannot authenticate historical
  Worker identity. Missing route methods, native versions, feature identity,
  binding use, disabled writers, sampling and silent losses prevent retirement
  conclusions.
- The planner's first actual run and any retirements belong to parent R14.
  There is no live query in the gate and no builder deployment.
