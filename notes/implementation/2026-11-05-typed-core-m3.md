# Replace structural clock traversals

Status: preparation. Production source remains unchanged. Request
`21d8e638e266295ff7f0a39a5718185b4cb0cd94` and promise
`287adf75f90ab89d086f62c047c3544fa2f4bcac` own M3 under scheduling request
`e99550e9`. Ruling `3b239919` permits this work while host-source review
`1160f05e` waits. The host source and register packet retain landing
priority. The starting main is `8b063123`; the isolated dependency clone
matches its lock file and keeps all fourteen workspace links local.

M3 replaces the complete structural clock analysis while concrete
execution keeps its existing route. The
[semantic contract](../2026-11-04-typed-core/README.md) and
[clock-cutover witness map](../2026-11-04-typed-core/witnesses.md#clock-cutover-evidence-at-m3)
set the boundaries. Hugh overrode the deletion-size criterion; every other
semantic stop still applies.

## Keep two execution roots

The exact caller query is:

```sh
rg -n '\b(readsClock|conditionsReadClock|timesEffect)\b' packages/derive/src packages/derive/test
```

At the starting head it finds two production callers in `handlers.ts`:
`derive` combines guards, effects, send conditions and attention;
`runClause` combines its own effect conditions and value-time sources.
Both also retain actual `ran.clock` from Native hooks that ran. The same
delivery removes `sends.ts:readsClock`, `sends.ts:conditionsReadClock` and
`handlers.ts:timesEffect`, leaving no reference to those symbols.

A future result clause has its own root. Its clock reads never make the
sending entry judge time. A skipped declared condition still contributes
its clock use. A skipped Native hook alone contributes no actual clock
read. Reading the `time` part of a retained entry reads history; it does
not read the current commit clock. Only the explicit commit-time value
source and the before/after guards contribute declared clock use.

## Reuse the validator's resolutions

The contract has fourteen Operand variants and eleven EntryPart variants.
Part adds projection through `{ of, then }`; `set.item` can contain another
operand. Resolution must retain the declared type or explicit unknown,
subject identity, lexical element binder, source path and phase. The
existing `validate/operands.ts:Read` retains only form, final type, open,
fields and an unqualified slot. M3 must preserve the richer resolution
when the validator already has it, including the base type before a Part
projection. A second independent name or type checker would duplicate
admission policy.

`validate/format-1.ts` owns one `Defining` context and constructs the
accepted `ValidDefinition`. Keep metadata out of `declared`, canonical
bytes and the digest. Bind internal metadata to the exact validated
context, including bounds, profiles and options; a digest-only cache is
insufficient. Own and freeze descriptor data so later mutation of an input
or a context cannot change a compiled graph.

The complete static graph may precede executable lowering. Keep the closed
M1 expression constructors checked and phase-safe. Unsupported executable
bodies still select the existing whole-body route before execution. An
opaque callback that runs the entire legacy interpreter supplies no
structural coverage.

## Prove the production cutover

Use public clock-behind judgments, or clause `judgesTime` where that is the
boundary, for every root in the fixed witness map: value-time source,
omitted effect if/unless, skipped tell and relate conditions, skipped
attention, clause execution, future-clause exclusion and actual Native
clock use. Add the historical-entry-time distinction. Reuse existing
forms-fields/guards and fixed-slot-index cases where they already prove
the same invariant. Static visitor assertions alone do not prove caller
integration.

The checker also assigned M3 the unused `evaluate` `_cause` parameter:
remove it or give it a use when connecting its caller boundary. Preserve
full `Ran` values, ordering, prepared inputs, refusal selection and
runtime/replay behavior. Change no Native definition, grant, wire format,
provider, scheduler, authentication, persistence or dependency.

Focused checks and a complete frozen-head gate remain pending. No
production cutover, deployment or acceptance follows from this preparation.
The planner deploys M3 after review. Re-estimate M4–M8 from observed M3 work.
