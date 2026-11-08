# Typed core witnesses

Status: acceptance map for M8 after M1–M7 landed. Planner ruling `24e2a8d` accepts the move from prototype construction to the actual admitted program. The current retirement draft keeps the obligations below; its focused validation and final gate remain ahead.

All paths below are relative to the repository root. Test files belong to
`packages/derive/test/` unless another path appears. Existing tests establish
the behavior that migration must retain. New differential tests must also assert
literal expected results, so shared bugs cannot pass through agreement alone.

## Existing semantic evidence

| Obligation | Existing witness | Acceptance distinction |
|---|---|---|
| Real application composition | `examples/grow/watering.test.ts` | Policy required; strict window edges refuse at 100 and 200 but permit 101 in its fixture; amount 400 passes while 401 refuses; grants and replay retain meaning. |
| Three-outcome guard combination | `forms-guards.test.ts` | A later failure wins over earlier incomplete scanning; successful alternatives can win over unavailable alternatives. |
| Structural clock use | `forms-guards.test.ts`, “an entry whose guards read the clock…” | A skipped clock-reading alternative still prevents writing while the clock is behind. |
| Range access strategy | `fixed-slot-index.test.ts` | Fixed-slot counts work beyond the scan limit where mutable predicates return `guard-incomplete`. |
| List binders and completeness | `forms-guards.test.ts` | each/has/anyOf, distinct/sameSet, count operands, exclusions, local and foreign facts retain order, absence, and completion behavior. |
| Prepared input identity | `rule.test.ts` | Stale digest yields unavailable; only used preparation persists; restricted engine and budget behavior stay pinned. |
| Source absence and explicit clear | `forms-effects.test.ts` | Present source assigns, absent source leaves unchanged, explicit null empties. |
| Effect order and conditions | `forms-effects.test.ts` | Party removal/addition order, attribution unions, incomplete conditions, required unset, and conflicting writes keep their results. |
| State phase and send identity | `forms-sends.test.ts` | Conditions read before effects; payloads read after effects; omitted sends consume no ordinal; fanout order and result clauses keep their identities. |
| Implicit opening and subjects | `forms-handlers.test.ts` | Unbound subjects skip the prescribed forms; relation copies and live-item maximum retain current behavior. |
| Current-state result clauses | `forms-handlers.test.ts`, `forms-effects.test.ts` | Result subject reconstruction and result-reason reads use the current item with original source context. |
| Native hooks | `forms-marks.test.ts` | Placement, fallback grant, retained observations/values, invalid outputs, throws, conflicts, whole-effect joining, send ordinals, outcome sends and max opens retain behavior. |
| Late and bound delivery | `late.test.ts`, `forms-binding.test.ts` | Late replacement skips normal guards; source reconstruction and consumption stay exact; binding selectors see only admitted candidates. |
| Timed rows | `timed.test.ts` | Deadlines and total transitions preserve existing clock and finality behavior. |
| Vocabulary admission | `definition-corpus.test.ts`, `definition-corpus/index.ts`, and `program-structure.test.ts` | Accepted and refused definitions keep their pins and decisions. Every admitted corpus root must have complete owned instructions and no admission exception. |
| Full entry integration | `compose.test.ts`, existing replay and scope tests | Cause, opening, ordinal, recorded effects, and runtime/replay agreement remain intact. |

Run the focused design baseline with the installed dependencies:

```sh
npm exec -- vitest run --project derive rule forms-fields forms-guards forms-effects forms-sends forms-handlers forms-marks fixed-slot-index late forms-binding timed
npm exec -- vitest run --project grow watering
```

These commands test the existing semantic owners. The admitted-program owners below also check complete construction and retained interpretations.
Run the complete `npm run gate` once before review, as `docs/testing.md` requires.
Retain failures and unreached stages in the evidence instead of claiming a pass.

## Admitted-program evidence at M8

`packages/derive/test/program.test.ts` retains the first slice's literal
results, independent collectors and compile-only negative owner. It now uses
the actual admitted runner. `program-structure.test.ts` owns complete corpus
capture and timed selection. Neither file requires the retired prototype.
The [M8 retirement ledger](../implementation/2026-11-08-typed-core-m8-retirement.md#witness-ledger)
maps every old file and case to its current owner and the preserving assertion.

| Witness and current owner | Explicit expected result |
|---|---|
| Grow `water`: the existing complete-literal, boundary, amount, stale-preparation and display cases in `program.test.ts` | Full `Ran`, prepared evidence, selected refusals, unavailable results and exact useful refusal text retain their literals. Separate collectors and all trace budgets agree. Public policy and replay remain in `examples/grow/watering.test.ts`. |
| Rule-free send and unused field: the existing tell and structural-visitor cases in `program.test.ts` | Conditions read before effects, payloads read working state, omitted sends allocate no ordinal, and changing only the unused field leaves the complete literal unchanged. Static requirements exclude that field. |
| Live-item finalization: “a non-final opening checks the live limit after sends” in `program.test.ts` | Keep the exact `send-unresolved` refusal before the exact `type-full` refusal and detail. |
| Construction: “admission and owned instructions reject forged reads, incompatible assignment, invalid literals and working-phase guards”, the two nominal-self cases and `typeObligations` in `program.test.ts` | Reject copied evidence before any field read. Keep literal admission problems for incompatible assignment, invalid literals and both nominal mismatches. Guard sites have the immutable before phase. Compile-only checks reject Boolean-to-time assignment and a working-phase guard site. |
| Owned data: “an admitted program owns its frozen guard and keeps the same literal result after caller mutation” in `program.test.ts`; the unchanged M6 send-mutation case in `forms-sends.test.ts` | Freeze owned data, leave the caller's declaration mutable, refuse owned-data mutation and retain the same complete literal after caller mutation and a second evaluation. Keep M6's complete retained target/message/payload result. |
| Trace exhaustion: `program.test.ts`, the interpretation and Native callback cases in `program-interpretations.test.ts`, and the existing M7 Native owners | Full `Ran` equals untraced execution, canonical bytes agree where applicable, exhausted traces report truncation, and primitive and actual callback counts remain equal across budgets. Explain never invokes a callback again. |
| Static versus actual reads and prepared opacity: the existing structural-visitor and Grow display cases in `program.test.ts`, plus `program-interpretations.test.ts` | Skipped branches contribute conservative requirements and structural clock use without concrete trace events. Preserve the complete prescribed prepared input and digest behavior. Label prepared, Native and capability interiors opaque. |
| Complete capture and refusal: the complete-set/unadmitted-program case in `program.test.ts` and the admitted-corpus case in `program-structure.test.ts` | An admitted set guard executes fully. Every admitted corpus program has every instruction. Unadmitted or incomplete programs refuse at their declaration paths with zero primitive, Native and capability counts. That refusal cannot serve an admitted body as a fallback. |
| Timed ownership: “timed execution binds only its admitted rule and refuses copied or separately admitted bodies” in `program-structure.test.ts` | Keep actual rule/body identity, timed frame and effect occurrence. Refuse copied and separately admitted bodies; preserve missing name, wrong family/frame, copied effect and copied-validation misses. |

## Clock cutover evidence at M3

The existing skipped-guard witness covers only one root. Complete the clock
cutover with focused judgments that distinguish a missing clock contribution
from the required result. Reuse current witnesses where they already make the
same distinction. Add the remaining cases to their owning forms tests.

| Root or boundary | Required distinction |
|---|---|
| Value-time source | A commit-time assignment makes the entry judge time even without a before/after guard. |
| Effect if/unless | A declared clock read contributes even when the effect is omitted. |
| Tell and relate conditions | A skipped send still contributes its declared clock read. |
| Attention condition | A skipped notice still contributes its declared clock read. |
| Result clause execution | `runClause` reports its own effect/condition clock use, including a condition that omits the effect. |
| Future result clause | A sending entry with no other clock use does not judge time merely because its future clause reads time. |
| Native hook | Preserve actual `ran.clock` on the existing native route: a hook that ran can contribute it; a skipped hook alone cannot. M3 changes structural analysis while native execution remains in place. |

Each case must assert the public clock-behind decision where that judge exposes
one, or the caller's `judgesTime` value at the clause boundary. Static visitor
unit assertions alone cannot establish caller integration.

## Second example: gate entry with native hooks

Use the existing `platform:gate@1` test definition from
`packages/derive/test/definition-corpus/marks-data.ts` and `gateWith`/`gateRules`
from `fixtures-marks.ts`. It is a deliberate stand-in, not a production lane.

The `enter` act resolves a ticket through `find`, checks a grant through
`by-ticket`, checks the `even` field/slot type, runs `fresh`, applies ordinary
effects and `key-id`, then invokes `refer`. Existing fixture overrides exercise
both no-send and one-send cases. The `probe` outcome and its send/clause overrides
cover the seventh mark place separately. An `enter` execution alone does not
cover outcomes or the grant/type/selector stages outside `derive`.

At M7 compare whole public judgments and invocation counts, in addition to the
resolved body comparison. Preserve skipped-rule behavior, supplied context,
fault mapping, send identity, retained evidence, and actual native clock use.
The static result must expose each opaque hook. It may report unknown reads;
it must not infer empty dependencies from the absence of a declared summary.

Use the collections witnesses above for M4. The gate example adds a different
stress: composition around native code without pretending to inspect that code.

## Recorded verification

The historical design verification accompanies plan 035. The M1–M2
implementation note records the later compiler and interpreter checks.
Neither record claims a measured implementation speedup or general dependency soundness.

## M5 effect and settlement evidence

The [M5 record](../implementation/2026-11-07-typed-core-m5.md) links actual
checkpoint reports, failures, controls, and the final source snapshot.

| Obligation | M5 witness |
|---|---|
| Complete ordered effects, working subjects and opened item | The existing source/condition case in `forms-effects.test.ts` now asserts the entire opening result and retains its recorded-effect assertion. |
| Input ownership | The added admitted-instruction case compares literal full `Ran` output after effect and notice payload mutation. The previous execution fails; typed execution passes. |
| Recursive skip boundary | The added nested-constant case compares full `Ran` output with an optional subject unbound and bound. Original and typed skip controls fail its assertion. |
| Lexical attribution identity | The existing attribution union case reuses one `each` source object at two occurrences and retains exact member order and bound results. |
| Unknown-source normalization | The existing copy results fail when the typed path bypasses `held`. The admitted probe uses a hashed fetched-entry stand-in for the unknown value. |
| Once-mark judgment | The existing cases 6–8 assert `new work` for an already true mark with free room, then retain the full-scope refusal. Omitting the prior false-value check fails that assertion. |
| Refusal before capture | The existing ignored-capability-argument case now includes an effect condition. The earlier draft overflows on its rejected cyclic value; capture after final admission preserves the exact refusal. |

The broader source checkpoints pass 366 distinct cases across 26 complete
owners. The final capture-order repair passes both derive compilers and the
40 cases in its three affected complete owners. These overlapping counts
remain separate. Page validation, one final full gate, independent review,
and audited landing still follow.

## M6 send and result evidence

The [M6 record](../implementation/2026-11-07-typed-core-m6.md) distinguishes
its earlier diagnostic and F1 checkpoints from the later send migration.

| Obligation | M6 witness |
|---|---|
| Owned target, message, and payload | A full literal `Ran` case fails on the legacy executor after declaration mutation and passes with captured send instructions. The first invalid comment-act fixture remains inconclusive. |
| Actual result occurrence | Both capacity cohorts retain exact effects, observations, and reservations after message/result/observation declaration mutation and with one send object at two occurrences. All four cases fail by assertion on exact M5 source and pass in M6. |
| Ordinals, fanout, collect, and normalization | The complete send owner retains its existing full output assertions, including skipped later sends and bounded scans. |
| Creation and current-state reconstruction | Complete compose, creation-context, late, and reservation owners preserve their original assertions and deadlines. |
| Native returned requests and faults | The Native send validation block remains byte-identical. Complete marks, ledger, observations, operand, and source-order owners pass after the explicit outcome bridge. |

The two broader local checkpoints pass 161 distinct cases across 14 complete
owners. The initial 10-case send run overlaps that count. These focused checks
establish no live-room, deployment, full explanation, or general dependency
claim. Exact-source Page CI and the single M6 gate pass at `71863e06`, with
5318 passes and three skips in complete terminal case reports. Independent
review and landing remain pending.
