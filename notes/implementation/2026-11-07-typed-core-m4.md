# M4 guard and list migration

M4 remains in progress under request `7a36b673` and promise `393c4f98`.
The branch executes declared guards, range predicates, and list binders through
admitted typed instructions. The full gate, independent review, and landing
remain due.

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
The full gate and exact-head Page browser workflow remain due.

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
gate remains due at the corrected candidate. Neither earlier failure
becomes a pass.

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
that original cause nor this one is proven. M4 remains unreviewed and
unlanded while the investigation continues. The investigation retains every assertion, deadline, allowance, and cache
charge. Archive source stays unchanged.

The [failed corrected gate manifest](evidence/2026-11-07-m4-failed-gate-2.manifest.json),
SHA-256 `d02b8c090685039f17a6674222fab3432be33967d476758ec3342c0d95cc1e4a`, seals the terminal phase results and the exact
bounded diagnostic around the failed confirmation. Raw synthetic custody
remains private. This failed run does not support an acceptance or
deployment claim.
