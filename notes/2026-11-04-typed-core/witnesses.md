# Typed core witnesses

Status: acceptance map for the scheduled migration. M1–M2 implements the bounded first slice in `program/*`; later migrations retain the obligations below.

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
| Vocabulary admission | `definition-corpus.test.ts` and `definition-corpus/index.ts` | Accepted and refused definitions keep their pins and decisions. Add lowering coverage for admitted rows at M8. |
| Full entry integration | `compose.test.ts`, existing replay and scope tests | Cause, opening, ordinal, recorded effects, and runtime/replay agreement remain intact. |

Run the focused design baseline with the installed dependencies:

```sh
npm exec -- vitest run --project derive rule forms-fields forms-guards forms-effects forms-sends forms-handlers forms-marks fixed-slot-index late forms-binding timed
npm exec -- vitest run --project grow watering
```

These commands test existing semantics. They do not test the proposed lowering.
Run the complete `npm run gate` once before review, as `docs/testing.md` requires.
Retain failures and unreached stages in the evidence instead of claiming a pass.

## New prototype evidence

`packages/derive/test/program.test.ts` owns these M1–M2 witnesses. The
implementation note records their actual outcomes and controls.

| Witness | Explicit expected result |
|---|---|
| Grow `water` dual execution | Equal full `Ran` values with separate collectors; accepted and refused boundary cases match the existing literals. |
| Rule-free send fixture | A state-changing effect affects the payload but not its before-state condition. The first emitted send gets the starting ordinal after an earlier omitted send. |
| Rule-free unused optional field | Changing only that field, including absent to present, leaves full `Ran` unchanged and the static summary excludes it. Hold all other inputs fixed. |
| Non-final opening at live limit | Refuse with `type-full` and the existing detail. Grow's final `done` opening cannot witness this. |
| Wrong phase and type | Compile-time negative cases reject a working-state guard read and an incompatible slot assignment. Runtime descriptor checks reject forged dynamic evidence. |
| Trace exhaustion | Full `Ran` equals untraced execution; trace reports truncation; shared primitive evaluation counts stay equal with tracing enabled. Native hook invocation counts join this check at M7. |
| Static versus actual reads | A skipped branch contributes dependencies and declared clock use but no evaluated trace event. |
| Prepared rule opacity | Trace names rule/digest/result and marks the body opaque; dependencies include the whole prescribed input. |
| Lowering coverage failure | Unsupported forms return their declaration paths before any primitive runs. Admission and the existing route retain their results. |

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
claim. Page checks, one M6 gate, review, and landing remain pending.
