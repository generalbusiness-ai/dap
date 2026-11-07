# M4 guard and list migration

M4 remains in progress under request `7a36b673` and promise `393c4f98`.
The branch executes declared guards, range predicates, and list binders through
admitted typed instructions. The repaired-head gate passes as recorded below.
Independent review and landing remain due.

## Shared ranges keep their semantic use

A form may reuse one range object for two capability arguments. Range lookup
now requires the argument name beside the admitted body, owning form, and
source object. The validator also records distinct uses for attribution
sources, send fields, fan-out ranges, and same-set ranges. Diagnostic paths
and digests do not select a plan. Owned copies retain their original source
identity.

The structural witness shares one range between two admitted capability
arguments. Each argument resolves its own plan. An unknown argument, a
foreign owner, and a copied body cannot borrow that plan.

| Evidence | Result |
| --- | --- |
| [Range-use manifest](evidence/2026-11-07-m4-range-uses.manifest.json), SHA-256 `f0ee3590d6ee6df980884529cf4cb3e51cf6edb6cc3d471218cc36bfa0af6c94` | Both derive compilers pass. All 43 selected cases pass; source hashes stay unchanged. |
| Same manifest, control unit | Ignoring the use key fails the alias witness by assertion: 10 pass, 1 fail. After exact source restoration, all 11 structural cases pass. |

These focused checks cover the selected owners. They do not establish the
production caller cutover or replace the final gate.

## Production callers use the admitted occurrence

Handlers pass their actual body into guard, effect, and send execution.
Effects and attention select their written occurrence, then resolve each
condition by its owning node and `if` or `unless` place. Sends use the same
body for conditions, fan-out ranges, and collect fields. Timed effects
resolve the original timed rule and arrays without changing `judge.ts`.

`guards.ts` retains narrow adapters for existing admitted source references.
The adapters refuse an ambiguous or unadmitted occurrence. The module no
longer dispatches the declared guard vocabulary. `lists.ts` retains the
shared `all`, `any`, paging, complete-range, and exclusion strategies. Its
legacy list and raw `where` dispatch are gone. Guard and whole-range callers
share the typed predicate evaluator.

Capability range arguments receive the admitted owner, argument name, and
lexical element bindings. Capability argument interpretation and Native
rules stay at their existing opaque boundaries. Native and capability
refusals retain the original declared guard as their map key. Execution
keeps the actual `ran.clock` object.

The capability witness runs a public act with two list elements and two
arguments that share one range. The first element selects the staged note;
the second selects nothing. Existing capability assertions still check the
public refusal code and name, effect order, and replay.

| Evidence | Result |
| --- | --- |
| [Caller-cutover manifest](evidence/2026-11-07-m4-caller-cutover.manifest.json), SHA-256 `2002236ebd33967ea77826740a008a1f0f0479880d6f4f92b94454b5b6f429bd` | Both derive compilers and all 186 selected cases pass. The selected complete owners cover guards, capability, effects, sends, operands, Native marks, handlers, timed work, replacements, preparation, fixed indexes, bindings, and program reads. Source hashes stay unchanged. |
| Same manifest, two caller controls | Bypassing the range filter and losing the original refusal key each fail one case by assertion. Each control compiles. After restoration, all three capability cases pass. |
| Same manifest, earlier attempts | The first caller run passes 114 cases and stops one effects case on a missing admitted context. The test now admits a transition on the card it reads and retains its behavior assertions. A later test compiler rejects assignment through a readonly guard array; the repair assigns a new array. Separate units retain both failures and the intermediate passes. |

The protected judge source stays byte-identical at SHA-256
`86222a9f4c1ff665232b470384bc82c095c0e1e175636eb8fae7859277f54959`.
No source-seal, definition, grant, wire, or dependency changes accompany this
cutover. M5 through M8 remain separate work under the parent request.

## The Page bundle follows the shared source

Scope addendum `6ec32b66` covers only the generated Page module.
The existing pinned build regenerates `apps/room/page/assets.ts`; it changes
no Page source, HTML, or UI. Both selected Page asset cases pass.
The [Page asset manifest](evidence/2026-11-07-m4-page-assets.manifest.json),
SHA-256 `1b07e3861f6dfe9bb5742aa59d2b948963a64685c4dd3407ec7025939641d5dd`, seals the build and owner output.

Regenerate with `node scripts/assets.mjs` from `apps/room/page`.
The earlier [Page browser workflow](https://github.com/generalbusiness-ai/dap/actions/runs/42377362267)
passes at `6204ddadde`, after the bundle build. After the projected-set repair,
the [Page browser workflow](https://github.com/generalbusiness-ai/dap/actions/runs/42382562941)
passes at `a0d26a3ac8`. A read-only GitHub query confirms that result.
Its named script, shared runtime, dependency, and workflow inputs match the
repaired gate head `94db5a0ba9`. The
[Page CI manifest](evidence/2026-11-07-m4-page-ci.manifest.json), SHA-256
`986dbbef79c1c5ab598e3c8e34262d0a40ddb9d9d28a7eb143fa34120ece7a2e`,
records the query and exact input comparison. The query reads existing metadata without rerunning the
workflow. These browser results do not explain either historical gate
failure.

## Gate failures expose two unadmitted test helpers

The first full gate at `7b4534a699` exits 1. The actual `gate.exit` records
that failure. Node passes 135 cases, Counting passes 56, and Plain passes
4,001 cases with one skip. One lane test stops because its direct effects
call supplies no admitted body. Native is unreached.

Scope addendum `76900c64` covers the lane test repair. The test already
validates the real issue and change declarations. Its effects calls now
receive the actual admitted act or notice body. All seven assertion lines,
three loop headers, and the test declaration stay unchanged. The lanes test
compiler and complete one-case owner pass.

The subsequent Native phase exits 1: 1,110 cases pass, one fails, and two
skip. Its fixed-index storage witness passes a fresh guard literal under an
invented kind. That guard has no admitted occurrence. Scope addendum
`45b03212` covers only this second test owner. The same guard and needle
field now belong to a file-local transition act. The direct SQLite witness
uses that admitted guard, kind, and field types. Its 70 assertion lines,
16 loop headers, and five top-level test declarations stay unchanged.
The twelve parameterized history cases also remain.

The first fixture repair copied a comment act, which forbids guards, and
admission stopped before any case ran. After the fixture changes to a
transition, the scope test compiler and all 17 owner cases pass. The wrapper
then fails its mistaken five-case expectation. A separate ledger audit
matches the retained output to all five top-level titles and the four by
three history table, without rerunning tests. The wrapper failure remains.

| Evidence | Result |
| --- | --- |
| [Failed gate](evidence/2026-11-07-m4-failed-gate.manifest.json), SHA-256 `2e3f4edc45933a42a53f8ef62f9dc7753c16f7c3110ee112125db2e72a0145a7` | Actual full gate exit 1; one Plain failure; Native unreached. Source stays unchanged and the owned process group closes. |
| [Failed Native follow-up](evidence/2026-11-07-m4-failed-followup.manifest.json), SHA-256 `6b4c17d0744ca7ba65ca50f0a4c0fa683218726f7d1069bc8fcbe2e0431808bf` | Lanes compiler and owner pass. Native exits 1 with 1,110 passing cases, one failure, and two skips. Source stays unchanged and the owned process groups close. |
| [Test repairs](evidence/2026-11-07-m4-test-repairs.manifest.json), SHA-256 `37a214112c54f6e223dd5300d5f9c025d7868bb3362b14afa6c2762462a61756` | Scope compiler and the complete 17-case fixed-index owner pass. The invalid comment-act attempt and the wrapper's mistaken five-case ledger remain qualified. |

Only these two test owners and explanatory records change after the first
gate. Production source, imported helpers, configuration, dependencies,
and Page assets stay unchanged. Two repaired test files exceed the
single-file follow-up exception in `docs/testing.md`. A fresh complete
gate was due at the corrected candidate. Neither earlier failure becomes
a pass.

## Capture preserves admission refusals

The earlier guard capture copied a capability argument before admission
finished. An ignored cyclic value then threw instead of returning the
validator's original capability refusal. The repair defers that copy until
final admission. The [admission repair evidence](evidence/2026-11-06-m4-copy-after-refusal.manifest.json)
retains the failing assertion, the exact refusal, both passing compilers,
and the passing structural, concrete-guard, and capability owners.

## The corrected gate stops on an archive prefix

The fresh full gate at `00ffedf892`, tree
`dd3e21070ed28fa1d5c6007fce40be09737b8f82`, also exits 1. Its actual
`gate.exit` records that result. Kernel and all pre-test checks pass.
Node passes 135 cases, Counting passes 56, and Plain passes 4,002 with
one skip. Native passes 1,110, fails one, and skips two. Both repaired
fixture owners pass in this run. The source stays unchanged and the
owned process group closes. The reporters record no contradictions or
unhandled Vitest errors.

The failing case is the 30,000-entry archive-floor writer in
`packages/scope/test/floor-archive.test.ts`. It stops during prefix
confirmation, before writing a floor. Alarm 252 confirms position 5,308.
Alarm 253 retains that position, with mint and send counts unchanged at
253. The diagnostic reports `plan`, `retry`, and `unavailable`. It records
no pending pass, capacity refusal, or source failure. Its attribution and
finish geometry are incomplete. Those scalar records do not identify a
causal stop site.

The same unchanged case passed in the earlier Native follow-up under
identical production source. That pass does not explain this failure.
Existing archive request `64552d40`, promise `4903fa50`, requires a causal
retry diagnosis and forbids repeated full gates to chase it. This is a
different owner and position from its original 14,601 observation. Neither
that original cause nor this one is proven. At that checkpoint M4 stayed
unreviewed and unlanded while diagnosis continued. The investigation retains
every assertion, deadline, allowance, and cache charge. Archive source stays
unchanged.

The [failed corrected gate manifest](evidence/2026-11-07-m4-failed-gate-2.manifest.json),
SHA-256 `d02b8c090685039f17a6674222fab3432be33967d476758ec3342c0d95cc1e4a`, seals the terminal phase results and the exact
bounded diagnostic around the failed confirmation. Raw synthetic custody
remains private. This failed run does not support an acceptance or
deployment claim.

## Bounded probes do not reproduce the archive refusal

Scope addendum `e944419f` permits temporary tracing in the failing floor
test. The test-local budget subclass keeps the original clock reads,
30-second ledger, cost limits, assertions, loops, and case deadlines.
It records at most 32 stop or wait-rejection samples, with four clock
values and a bounded stack per sample. Observer overhead can alter timing.
The driver restores the exact original test after each child exits.
The sealed archive driver and its source seal stay unchanged.

The first preflight compares the parser source seal with a whole-file
hash and refuses before editing or running a compiler or test. Those hash
domains differ. The corrected probe verifies both domains independently.
Its compiler and all three owner cases pass, but the JSON-only reporter
discards the console trace. Missing observation proves no absence of stops.
The next probe transports the summary through `task.meta`. Its compiler
and all three cases pass. It captures four handled lookahead-limit signals
from `ArchiveBudget.spend`; it captures no `unavailable` stop.

The failed gate output interleaves this floor owner with
`directory-partition-success-capacity.scope.test.ts`. Output overlap proves
neither exact runtime overlap nor causal load. Plan act `0c8f3536` selects
that unchanged capacity owner as the companion for one four-case probe
under the existing Native configuration. The compiler and all four cases
pass. The bounded summary again captures four handled lookahead-limit
signals and no `unavailable` stop. Both completed probes restore the source
exactly and close their owned process groups.

The [isolated probe manifest](evidence/2026-11-07-m4-archive-probes.manifest.json),
SHA-256 `3707376e9c9f15ef5f57e44dc992a0dc5830ecef37df742cfa2911ceb705454c`,
retains the preflight refusal, missing trace, and complete metadata probe.
The [paired probe manifest](evidence/2026-11-07-m4-archive-paired.manifest.json),
SHA-256 `698079a92c90c40c957180c6c6c9d8402cf95cdbd4f517515d2bd6459fdd015f`,
retains the four-case ledger, bounded trace, unchanged obligations, and
restoration proof. Raw synthetic TEST custody remains private.

Neither workload reproduces the historical refusal. The cause remains
unproven, and both gates remain failed. M4 stayed unreviewed and unlanded
at this checkpoint.
These probes establish no real-room outcome or completion-time guarantee.
No further full gate runs to chase this archive failure.

## Preserve the original projected-set skip decision

A later comparison finds an M4 regression outside the archive path. Both
main and M4 admit the same `ifPresent` guard. Its required proof is present,
but an optional selector inside a projected historical `set` is absent.
Main evaluates the comparison and returns `fail`; M4 skips it and returns
`pass`. The new missing-read collector had descended the projection wrapper,
which the original skip rule ignores.

Finding act `505f2cba` records the repair within M4's existing validator scope.
The collector now retains the original skip boundary. The complete typed
operand descriptor and read execution stay intact, and admission rules do
not change. A direct `set` still skips when its selector is absent. A
projected `set` still evaluates. An absent outer proof skips both forms.

The new witness compiles and fails by assertion before the repair; its
other five owner cases pass. After the repair, both derive compilers and
all 32 cases in the five complete guard, read, structure, guard-form, and
field-form owners pass. Every earlier test byte stays unchanged.
The Page bundle rebuilds from the shared validator, and its complete
one-case asset owner passes. The Page wrapper then fails its mistaken
two-case expectation. A separate reconciliation checks the actual title
and exit files without rerunning the owner. That wrapper failure remains.

The [projected-set manifest](evidence/2026-11-07-m4-ifpresent-projection.manifest.json),
SHA-256 `cf0d88a605c90ef60ee5c2f5ad3c962b531c3de4e1032e54373d44c3a101f7d1`,
seals the failing assertion, passing focused checks, exact source changes,
and wrapper reconciliation. The protected judge and source seals stay
unchanged. This repair does not explain the archive refusal or clear either
failed gate. A complete gate at the repaired candidate was due before
review. The later ruling below authorizes that gate.

## The ordered main baseline passes

Planner ruling `260399f6` orders one unchanged four-case baseline at exact
main `e50d9eeb` before more archive failure-path mapping. A fresh worktree
with owned dependencies runs the same floor and capacity owner files.
The scope test compiler exits 0, and the actual `owners.exit` records 0.
All four cases pass. The original sources, assertions, limits, deadlines,
and Native worker settings stay unchanged. The worktree stays clean and
both owned process groups close.

The [main baseline manifest](evidence/2026-11-07-m4-archive-main-baseline.manifest.json),
SHA-256 `57d79fc9fc374f430245b21613f19671fcd9a4f432f117da8603406c0cc98f3d`,
seals the exact selection, source continuity, terminal results, and private
raw retention. The first sealer attempt has a Python syntax error before
any statement runs. Its transcribed refusal remains; the corrected sealer
runs without another test execution.

This baseline adds no tracing to the source. Verbose and JSON reporters
retain ordinary output and structured case states; their work can affect
timing. The earlier M4 probe used temporary tracing. Neither the differing
observations nor either pass establishes the historical cause. Under the
ruling's passing branch, M4 diagnosis continued. The failed gate does not
become a known pre-M4 failure, and this result grants no review exception.

## The stop-only observer also passes

Plan `6878b280` narrows the observer under addendum `e944419f`. The earlier
probe returned a new rejection-handler promise from every budget `wait`.
This probe inherits the original `wait` and records only actual synchronous
`stop` exceptions after their original decision. It retains four clock
values from the existing reads and at most 32 bounded stack samples.
Observer overhead can still change timing.

At exact head `5908a78cbc3eaffe4f8ba8dadf59a102ccc18bde`, the scope test
compiler and all four cases pass. Actual compiler and owner exit files
both read 0. The complete floor owner and unchanged capacity companion
keep their original assertions, loops, deadlines, limits, and worker
configuration. The original test restores exactly, source hashes match,
and owned process groups close.

The observed 30,000-entry case records zero calls to `stop`. This observer
does not record directly thrown errors or handled lookahead signals.
The missing original exception remains missing. The
[stop-only manifest](evidence/2026-11-07-m4-archive-stop-only.manifest.json),
SHA-256 `17d5fa28d3cc23d5c7d0344c593ad1da843e622475535a962a43f360d5ce6a65`,
seals 15 public files and retains 251 raw files privately. The pass clears
neither failed gate and proves no historical cause.

## The host clock logs establish no overlap

A read-only query finds four time-service records at 08:19:44 EST within
the failed gate's broader 08:05–08:26 interval. The retained timing stream
records case durations without absolute case timestamps. No retained
clock sample or timestamp establishes that this adjustment overlaps the
failed pass. These logs establish neither its cause nor the absence of
other clock changes. No direction or magnitude inference follows.

The [clock observation manifest](evidence/2026-11-07-m4-archive-clock-observation.manifest.json),
SHA-256 `5cc335cc36e53b7b36159a15d861bbe95302f5d4234d256bd15fa5829f53a78c`,
seals eight public files. Full host log metadata stays private. The first
sandboxed query refuses before reading logs; the separately retained
query exits 0. This observation changes no source or system setting.

At this checkpoint M4 stayed unreviewed and unlanded. Archive request
`64552d40` stays open, and both complete gates remain failed. The next
execution needs the concrete ruling below.

## The repaired candidate passes its required gate

Planner ruling `677da3fe`, adopted by `a926a5e0`, distinguishes the due gate
after the projected-set repair from a retry to chase the archive failure.
Merge `94db5a0ba9b1aa85daa230037bbc0737c5ba2ec2` takes main `9d96cf25`
into M4 at `e1480a00`. The gated tree is
`016746e0f66f4894fcd246de303437cd8f335df2`.

The actual `gate.exit` reads `exit 0`. Node passes 135 cases, Counting
passes 56, Plain passes 4,003 with one skip, and Native passes 1,111 with
two skips. All four case-report phases are complete. The reporters record
no contradictions, report errors, or unhandled Vitest errors. The notes
check reports zero warnings with main now an ancestor.

| Evidence | Result |
| --- | --- |
| [Repaired gate manifest](evidence/2026-11-07-m4-repaired-gate.manifest.json), SHA-256 `bf2e73ea04065fbd28416b763c3cac8b592dac2942eafc18a780a5acaa4809b1` | Fifteen read-only public files preserve the actual exit, terminal counts, source identity, timings, and raw retention. |
| Same manifest, `before.json`, `after.json`, and `receipt.json` | The snapshots match exactly. Source and dependency bytes stay unchanged, and the owned process group closes. |
| Same manifest, `test-summary.json`, `stages.json`, and `result.json` | Every phase completes. The 99 suite or unclassified observations stay outside the case counts. The skipped record module has no duration. The report leaves it absent. |
| Same manifest, `started.json` and `gate.time` | The run spans 17:04:37–17:25:54 UTC. The timing command reports 1,276.78 seconds elapsed, 2,428.58 user, and 324.78 system. The separate Python monotonic interval is 1,276.867 seconds. |
| Same manifest, `private-retention.json` | The sealer verifies all 2,299 raw regular files, then makes them read-only. The private unit has no symlinks. |

The documented progress observer records 1,095 Native ready callbacks,
1,070 result callbacks, and 1,113 final case records. Final framework
records establish the 1,111 passes and two skips. Missing intermediate
callbacks prove neither continuing execution nor a cause. Other builder
lanes ran no tests, builds, or gates during this gate.

Both earlier failed gates remain failed. In particular, the `00ffedf892`
archive-floor refusal at position 5,308 remains unexplained under
`64552d40`, with its original manifest and bounded diagnostic intact.
This gate has no recurrence, so the ruling's conditional six-run timing
comparison does not run. Active archive diagnosis stops until a future
gate recurrence yields the existing SQL, cursor, awaited-action, and
backwards-clock capture. No further archive probe or driver patch follows
from this pass.

The documentation after `94db5a0ba9` adds this result and its manifests.
It changes no production source, test, dependency, or generated asset.
The review request records both the gated tree and the final documented
tree. This head still owes independent review and landing. M5 through M8,
live cohort acceptance, and deployment remain outside this result.
