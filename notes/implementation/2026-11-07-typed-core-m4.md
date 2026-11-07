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
