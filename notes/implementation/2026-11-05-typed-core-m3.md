# Replace structural clock traversals

Status: implementation in progress. The validator now carries owner and binder
identities. Production clock analysis and its callers remain unchanged.
Request `21d8e638e266295ff7f0a39a5718185b4cb0cd94` and promise
`287adf75f90ab89d086f62c047c3544fa2f4bcac` own M3 under scheduling request
`e99550e9`. Planner ruling `3b239919`, step 5, permits M3 while an independent
review waits. The revised register packet landed on origin main at `26fc8e0b`, with
approval `af97b88e` and receipt `cce90dd3`. Its actual deployment and hosted
acceptance record remain planner work. O4 takes precedence when browser
access returns.

The checkout now includes packet main `26fc8e0b`. Before M3 source changes,
reconciliation at host main `a4e62771` found no drift in the preparation's eleven
derive, contract, and design inputs. `judge.ts` retains SHA256
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

The [resolved-read manifest](evidence/2026-11-06-m3-resolved-reads.manifest.json)
seals 44 files. Its SHA256 is
`8937acd6ed7e025956c445a4d31969f4bae64dc90078824f549933ff443b18ff`.
The source and test compilers pass. The new test compile first found a missing
`required` flag in a record-member fixture; the corrected fixture compiles.
The targeted run passes twenty existing cases and two new witnesses, then
fails the carried-part witness because the fixture lists no owner for `pin`.
The existing admitted fixture shows that `hold@1` owns that record. Adding it
to the test's capability list lets all three new witnesses pass. Only those
three rerun after this fixture correction. Production bytes stay unchanged.

The witnesses cover all fourteen Operand forms and eleven EntryPart forms,
Part projection, a nested `set.item`, subject identities with equal item types,
lexical binding paths, and ownership after input mutation. They establish no
structural body graph or production clock cutover. All failed attempts remain
retained. The initial compiler unit has a stated identity limit: it copied the
new untracked read-model module after compilation. Later units copy all extra
inputs before their checks.

## Bind reads to the admitted result

The validator retains its operand resolutions with the exact returned
`ValidDefinition` object. It attaches them after all admission checks succeed.
Equal declaration digests keep separate validation contexts, and a copied
result object has no metadata. The retained array and each descriptor stay
owned and frozen after later input mutation.

The new witness checks equal digests under separate bounds and profile tables,
resolved field and subject-slot paths, later input mutation, and a copied
result without evidence. All four descriptor witnesses and both compilers pass
at checkpoint `2eee9a46`, tree `e3d033d8`. The input patch applied to base
`b0a63721` equals that committed diff exactly. These checks establish neither
the structural body graph nor the production clock cutover.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| source-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| test-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| forms | `node node_modules/vitest/vitest.mjs run --project derive program-reads` | 0 | `66ef9cdf0ab1ce00c8cf7a6824c9cfc3a50702611e3e4c1ec2aa4caf485809e1` |

The [admitted-read manifest](evidence/2026-11-06-m3-admitted-read-binding.manifest.json)
seals 15 public files. Its SHA-256 is
`80c3e7f58cb3189024070965abdd2cc8c8efc545346fbe12f8390750c8480305`. The complete final M3 checks and gate remain pending.

## Retain implicit resolutions

The validator retains its existing subject and range choices, direct guard-slot
reads, shorthand field reads, and ordinary effect targets. These records reuse
its resolved types and subject identities. They add no admission decision or
execution route. Resolution sites carry no phase until their owning form states
how it uses the handle.

The new witness gives `every` both a field and a same-named slot. It records the
field; removing that field records the slot. A nested guard retains its inherited
`also.other` subject even though it has the same item type as `on`. The witness
also checks a range identity, a time-slot read, an effect target, and frozen
metadata. Other implicit sources and complete structural body nodes remain work
for M3; this checkpoint does not claim exhaustive graph coverage.

Both compilers and all 26 cases in the five complete selected owners pass at
checkpoint `27e98062`, tree `498863ae`. The input patch applied to base
`cff5a05b` equals that committed diff. The selected owners are `program-reads`,
`forms-fields`, `forms-guards`, `forms-effects`, and `fixed-slot-index`.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| source-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| test-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| forms | `node node_modules/vitest/vitest.mjs run --project derive program-reads forms-fields forms-guards forms-effects fixed-slot-index` | 0 | `619d1f1be507a1a336f5559734a2beab6e4de74e59b5e02f16aee4df4636416d` |

The [implicit-read manifest](evidence/2026-11-06-m3-implicit-read-capture.manifest.json)
seals 15 public files. Its SHA-256 is
`5cbf14781ecf8267684ca02688b77023cb378efed99443639863cc7af77dae2b`. The complete final M3 checks and gate remain pending.

## Retain foreign fields and source owners

Foreign fields in `fact.where` retain an explicit unknown type and the field
that names their fact. They do not resolve against a same-named local field.
Attribution sources, collection fields, attention slots, redaction targets, and
capability range arguments retain their actual subject or range handles. A
collection's built-in `item` and `state` projections name no same-named slot.

The admitted metadata also owns frozen copies of native marks and capability
requirements. These records describe opaque hooks and inspect no hook code.
The seven descriptor witnesses cover these choices, native mark ownership,
and capability range slots. They establish no body graph or clock cutover.

Both compilers and all 22 cases in four complete selected owners pass at
checkpoint `e8207d27`, tree `90560961`. The input patch applied to base
`ac9045c6` equals that committed diff. The selected owners are `program-reads`,
`forms-effects`, `forms-sends`, and `forms-capability`.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| source-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| test-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| forms | `node node_modules/vitest/vitest.mjs run --project derive program-reads forms-effects forms-sends forms-capability` | 0 | `1a526d40d04f0d7b57b5fca6d6ecc45fe4b9aca09c95c434e42e33f1f79ac5b0` |

The [source-owner manifest](evidence/2026-11-06-m3-owner-read-capture.manifest.json)
seals 15 public files. Its SHA-256 is
`e6d9d8ffadb97e39846732583af7a8ef5a3d38955cdb4381e5de2f9fb802e503`. The complete final M3 checks and gate remain pending.

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
