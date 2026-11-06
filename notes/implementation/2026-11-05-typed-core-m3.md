# Replace structural clock traversals

Status: implementation in progress. The validator now carries owner and binder
identities. Production clock analysis and its callers remain unchanged.
Request `21d8e638e266295ff7f0a39a5718185b4cb0cd94` and promise
`287adf75f90ab89d086f62c047c3544fa2f4bcac` own M3 under scheduling request
`e99550e9`. Planner ruling `3b239919`, step 5, permits M3 while an independent
review waits. The revised register packet now waits for review `b0d59473` at
`6756b53c`; it retains landing priority. O4 takes precedence when browser
access returns.

The checkout now merges landed main `a4e62771`. Reconciliation against the
retained preparation found no drift in its eleven derive, contract, and design
inputs. `judge.ts` retains SHA256
`86222a9f4c1ff665232b470384bc82c095c0e1e175636eb8fae7859277f54959`.
The dependency lock and all fourteen owned workspace links still agree.

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

## Preserve the validator's subject and binder identities

An implicit slot currently reaches `operand` through an `owner` callback that
returns only an item type. A type alone cannot distinguish two subjects of the
same type, or a range item from the enclosing subject. Carry the resolved owner
identity through that boundary before constructing shared operand descriptors.
Keep the validator's existing decisions and problem paths unchanged.

`Ctx.elements` currently maps a name to its type or unknown. Guard lists,
attribution, capability arguments, and observation sources create those maps.
Preserve each lexical binding's declaration path alongside its type, including
shadowing and record-member projections. Capture an operand's base type before
its Part projection changes the final read type. Copy and freeze descriptor
data so later caller mutation cannot change the compiled graph.

The production `derive` callers supply the actual admitted act or handler
object. `runClause` selects a result container and clause name. Bind structural
roots to those validated contexts. Keep future clauses outside the sending
body's clock root, including clauses attached to platform send marks.

## Intermediate validator checks

The [foundation manifest](evidence/2026-11-06-m3-foundation.manifest.json)
seals 33 files, including exact input patches at base `c5dc2502`. Its SHA256 is
`f91be15144c5ecb86a305a981522e92f9e9ffa00b29903a3e0681b878d61ed68`.
The source compiler passes after restoring a missing `Type` import. The test
compiler then identifies one direct operand fixture whose owner lacks identity.
That fixture now supplies the owner and lexical binding explicitly, and the
test compiler passes. Both earlier failures remain recorded.

The complete existing `forms-fields`, `forms-guards`, and `fixed-slot-index`
owners pass all fourteen cases. Their expected judgments and assertions stay
unchanged. The source patch stays unchanged during that run. These checks cover
the intermediate context refactor; they establish no clock cutover or general
metadata coverage. The complete Operand and EntryPart descriptors, structural
visitor, two production caller changes, and cutover witnesses remain unfinished.

## Resolved-read checkpoint

The validator now returns owned descriptors for all fourteen Operand variants,
all eleven EntryPart variants, Part projections, and nested `set.item` operands.
The new `program/reads.ts` model retains base and final types, before/working
phase, subject identity, slot rules, lexical bindings, and validation identity.
The structural body graph and the production clock cutover remain unfinished.

Intermediate compiler checks pass. The first new test compile found a missing
`required` flag in the fixture's record member; the corrected fixture compiles.
The first targeted descriptor run still has a failing witness. Its raw output
and exact source copies remain in
`~/play/artroom-evidence/2026-11-06-m3-resolved-read-checks-2/`.
This checkpoint pauses descriptor work for the approved register packet landing.
It claims no descriptor test pass or M3 acceptance. The initial compiler unit
also retains an explicit limit: it copied the new untracked read-model module
after compilation; the later test units copy untracked inputs before execution.

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

The complete M3 focused checks and frozen-head gate remain pending. The
intermediate checks establish no production cutover, deployment, or acceptance.
The planner deploys M3 after review. Re-estimate M4–M8 from observed M3 work.
