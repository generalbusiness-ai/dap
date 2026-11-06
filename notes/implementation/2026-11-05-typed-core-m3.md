# Replace structural clock traversals

Status: production clock cutover implemented at `395326e6`. The validator records
the complete structural graph, and both production callers consume it. The
final frozen focused checks pass. The first gate failed on three fixture/build
checks; its corrections pass. A new frozen gate, independent review, and landing
remain pending.
Original request `21d8e638` and promise `287adf75` became stale through a
retired ruling. Renewed full-scope request `f012c968e9254ebf224c003961f7fd578d2f89ca`
owns this delivery under active scheduling request `e99550e9`. Planner ruling `3b239919`, step 5, permits M3 while an independent
review waits. The revised register packet landed on origin main at `26fc8e0b`, with
approval `af97b88e` and receipt `cce90dd3`. Its actual deployment and hosted
acceptance record remain planner work. O4 takes precedence when browser
access returns.

The checkout now includes main `93c1600b`, including packet `26fc8e0b`. Before M3 source changes,
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

The following checkpoints retain the state and limits of each development step.
Later sections record the completed production cutover.

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

## Retain separate validator frames

The metadata retains the actual fields, subjects, signer availability, and
validation context of acts, normal handlers, late replacement bodies, timed
rules, request result clauses, and native outcome clauses. It copies those
frames while the existing validator reads them. Future clauses keep separate
paths and contexts from the bodies that send their requests.

A late handler rebuilds its replacement object at runtime. The new witness
checks that the rebuilt objects differ while their declared effect array stays
shared. The future graph lookup must account for this branch; object identity
alone cannot identify every runtime body. The witness also checks all six frame
kinds, native send and outcome clauses, and ownership after input mutation.

Native type marks now have an explicit `native` metadata variant. The validator
historically stores these marks in its `FieldType` table; the representation
retains that actual resolution without calling it a concrete type. This change
adds no admission decision or production execution route.

Both compilers and all 82 cases in six complete selected owners pass at
checkpoint `eefb1a0b`, tree `d9b9595c`. The input patch applied to base
`2d39ffe1` equals that committed diff. The actual files are `program-reads`,
`late`, `late-reservation-identity`, `forms-handlers`, `forms-marks`, and `timed`.
The graph, two clock callers, their controls, and the final M3 gate remain work.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| source-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| test-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| forms | `node node_modules/vitest/vitest.mjs run --project derive program-reads late forms-handlers forms-marks timed` | 0 | `28a79c66216803f87d8181252463ead83a72e82496c3ce4573c20ba3c0319106` |

The [body-frame manifest](evidence/2026-11-06-m3-body-frames.manifest.json)
seals 15 public files. Its SHA-256 is
`52eaf15092f17f8d5fa7fc25a5672066478e9c86c9099cdbea09f33c94ad2a67`. The complete final M3 checks and gate remain pending.

## Record the complete body structure

The existing validator now records typed guard, effect, send, and attention
nodes as it reads each form. Resolved operands, subjects, slots, fields, foreign
fields, and ranges attach to the active node. The graph does not infer their
names or types again. Value sources distinguish clear, resolved read, and the
commit clock. Native forms retain opaque mark data.

Future result clauses temporarily enter a separate root. Their send retains a
link to that root, and the clock visitor follows only declared child forms.
It includes every skipped condition and alternative but excludes those future
clauses. Historical entry time remains a resolved read. Native actual clock use
still belongs to the existing runtime; neither production caller has changed.

The graph binds to the exact returned validation object. Aliased act and send
objects keep distinct origins and kinds. Replacement bodies resolve through
preserved header references and declared form arrays, since `handlerBranch`
creates a new object. Data and resolved evidence freeze after successful
admission; a copied validation result owns no graph. No graph node holds an
executable callback. Unsupported concrete bodies keep their existing route.

The initial source checkpoint is `70d12b3d`, tree `d919f795`. Both compilers and
1458 cases in fourteen existing admission/form files pass there. The later
witness checkpoint is `9f063f18`, tree `b4ce8d52`. Its test compiler and all six
new graph witnesses pass. One witness checks the whole admitted corpus and all
37 operator tags; the others assert literal clock sites, future exclusion,
historical time, alias and replacement/native identities, and ownership.

Each unit retains the patch from base `0aabad6c` and copies its new files before
checking. The reconstruction proof compares the tracked patch, added blobs,
and complete changed-path set with its checkpoint. The first unit has the new
structure module; the second adds the new test file. These are separate runs,
not one combined case total. The two production callers, public cutover
witnesses, meaningful controls, and final frozen M3 gate remain pending.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| structure-probe/source-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| structure-probe/test-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| structure-probe/forms | `node node_modules/vitest/vitest.mjs run --project derive program-reads definition-corpus forms-fields forms-guards forms-effects forms-sends forms-handlers forms-marks forms-capability forms-operand fixed-slot-index late timed` | 0 | `eefdd363059697ee71f39b56f04f3834b4f64aa8c68363f9a145e0015c717305` |
| structure-witnesses/test-compiler | `node node_modules/typescript/bin/tsc -p packages/derive/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| structure-witnesses/forms | `node node_modules/vitest/vitest.mjs run --project derive program-structure` | 0 | `20adff3d4c9b6477aa89dfe0afe05bace549aa25b51db3f25468177b169a8c0e` |

The [structure-probe manifest](evidence/2026-11-06-m3-structure-probe.manifest.json) seals 16 public files; SHA-256 `9d4f043a760f46d4510eebcfa1bffc3fbd9538259de6a031ca30f8cae16afab6`.

The [structure-witnesses manifest](evidence/2026-11-06-m3-structure-witnesses.manifest.json) seals 15 public files; SHA-256 `ad05108f0fac5d511396b8f794326b83730d9ac212c937bbe67e4a360e565acc`.

## Use the graph at both production callers

`derive` resolves its actual admitted body before any primitive runs. It uses
that root's declared clock reads and retains `j.ran.clock` from Native hooks
that ran. `runClause` reconstructs its actual origin body and selects the root
by send identity, clause name, origin root, and operation kind. Outcome clauses
have no parent body. Neither caller resets actual Native clock use.

The cutover deletes `readsClock`, `conditionsReadClock`, and `timesEffect`.
The exact query above returns no matches in derive source or tests. Concrete
execution still uses the existing whole-body route. The graph holds no
whole-legacy callback, and this delivery makes no general lowering claim.
The internal experimental `evaluate` function loses its unused `_cause`
argument; its nine owned test calls follow the new signature.

Seven public witnesses join their owning forms files. Deliveries distinguish
commit-time values, omitted effect conditions, skipped tell and relate
conditions, omitted attention, future-clause exclusion, and historical entry
time. Direct `runClause` judgments distinguish its value-time and omitted
condition roots. The existing skipped-guard witness remains unchanged.
The Native stand-in checks both public write `judgesTime` and clock-behind,
including the hook that runs before the body. It proves no production hook or
provider outcome.

The first cutover passes both compilers and 1512 cases in sixteen complete
selected owners. A preceding unit passes all seven new public witnesses while
the old callers remain, establishing the behavioral baseline. The later Native
assertion strengthens the same case and changes no production source.

Three chosen fault controls distinguish the new integration. Removing declared
clock use fails exactly five selected assertions. Removing the actual Native
contribution fails only the Native witness. Including a future clause in its
parent fails only the future-clause witness. All eight selected witnesses pass
before and after the revised controls; 71 unrelated cases remain filtered.
Each control restores source bytes in `finally`, and the restored hashes match
checkpoint `395326e6`. These are three targeted controls, not a sweep.

The initial Native control survived because the witness asserted only the
behind-clock refusal, which `prepareHandler` independently enforces. The revised
witness also checks the successful public write draft. The initial driver stops
at that unexpected survival, restores source, and never runs its third control.
Its partial output remains sealed alongside the revised evidence.

The [clock-before-cutover manifest](evidence/2026-11-06-m3-clock-before-cutover.manifest.json) seals 16 files; SHA-256 `64b7d085e31355ebe7750991e2b36d70fe75e22b9ac8e3cf3bfe527c9eda1d93`.

The [clock-cutover-first manifest](evidence/2026-11-06-m3-clock-cutover-first.manifest.json) seals 16 files; SHA-256 `336f676ba30c7b36a48ed268caccb258130cef15ae20390533ee7dfda4baf35b`.

The [clock-controls manifest](evidence/2026-11-06-m3-clock-controls.manifest.json) seals 11 files; SHA-256 `1dfff40542770f3bc4c900bdbd68596ec0ef99d66e16e1bc003d1f85b74a412d`.

The [clock-controls-revised manifest](evidence/2026-11-06-m3-clock-controls-revised.manifest.json) seals 33 files; SHA-256 `e9f3786f93a1aeba84e5ceb1c749275a9bc956b2d996709f8ae39c84b765d855`.

The revised control unit reconstructs the final cutover checkpoint from its
tracked patch and copied added files. Earlier units retain their own inputs;
they do not claim to check the later strengthened Native assertion. The final
frozen source gate and independent review remain pending. `judge.ts`, Native
pins, grants, wire formats, dependencies, and application APIs stay unchanged.
The planner deploys after the reviewed landing.

## Estimate the remaining migrations

M3 required separate owner and binder capture, admitted-result binding, six
body contexts, complete structure capture, public caller evidence, and controls.
Those checkpoints show that preserving validation and execution identities
costs more than the old traversal's small size suggests. The graph now supplies
that foundation, but it does not implement the remaining concrete semantics.

| Migration | Revised effort | Main remaining risk |
|---|---|---|
| M4 | 4–6 working days | Guard outcome combinations, scan strategies, lexical binders, and refusal paths. |
| M5 | 4–6 working days | Missing versus clear values, before/working phases, Native effect joining, and settlement. |
| M6 | 4–6 working days | Send ordinals, fanout, creation context, and current-state clause reconstruction. |
| M7 | 5–8 working days | Seven hook places, capability argument trees, retained evidence, and whole public judgments. |
| M8 | 4–6 working days | Every runtime/replay body caller, full corpus lowering, and deletion of fallback orchestration. |

The remaining estimate is 21–32 working days of effort. It is a planning range,
not measured throughput or a delivery date. Each row keeps its original scope,
its reviewed landing, and every semantic stop criterion. Hugh's deletion-size
override remains the only exception. No accepted-definition bytes, execution
order, resource refusal, retained evidence, or judgment may change. Stop the
affected delivery if one of those invariants cannot hold.

## Retain the failed gate and repair its inputs

The first source gate at `cb614e2f`, tree `3be83703`, ends with actual
`gate.exit` 1. Its source remains unchanged and its process group closes.
Kernel, Node (135), Counting (56), prechecks, and typecheck pass. Plain records
3984 passes, one skip, and three unique failing cases. Native remains unreached.
This gate stays failed; no result from it establishes Native coverage.

Two replay tests intentionally passed copied unsupported definitions to the
fixture `created` function. The new admitted-root check rejects those copies
before replay can inspect their retained bytes. Scope addendum `907088f9`
records the fixture change before source edits. A narrow helper in replay's
`test/world.ts` now creates a genuine admitted notes genesis, then changes the
retained declaration, seed pin, scope identity, and entry hash as untrusted
synthetic bytes. The unsupported format and durability tests retain their
literal replay refusals. Production replay and admission checks stay intact.

The third failure compares the generated Page asset with its current source.
The validator's metadata now joins that bundle. The existing command
`npm run build --workspace @generalbusiness/dap-page` regenerates
`apps/room/page/assets.ts`; it changes no Page source flow or dependency.
The required Page browser workflow checks the published candidate separately.

Correction checkpoint `c4faff56` changes only those three replay test files and
the generated Page asset. Replay and Page test compilers pass, and all 56 cases
in the three complete owning files pass. Their saved patch equals that exact
checkpoint relative to `cb614e2f`. A new frozen gate must pass after these
concrete corrections; the earlier failed run supplies no substitute.

The frozen focused pipeline before the first gate passes both compilers and
111 cases across eight complete derive owners. Its first verification attempt
retains a ledger-name mismatch: both compilers and all cases pass, but the
verifier exits 1 because JSON and structured reporter names use different
separators. The corrected ledger passes on unchanged source. An earlier plan
setup names a nonexistent compiler file and runs no compiler or body. All
preparation and verification failures remain qualified in the custody record.
The failed-gate analyzer also first expects a Native output file that the
unreached stage never creates. Its retained error remains private; the corrected
analyzer records Native as unreached rather than inventing observations.

The [failed-gate manifest](evidence/2026-11-06-m3-failed-gate.manifest.json) seals 7 files; SHA-256 `711dd54af46665d05873a8921f7851ea20ac54e1a2ada44257acdb39389d892c`.

The [final-focused manifest](evidence/2026-11-06-m3-final-focused.manifest.json) seals 9 files; SHA-256 `ce8d8841e0498718ab6b5d2cdb262ded60cc47480e454532ce00ed4838821186`.

The [final-focused-2 manifest](evidence/2026-11-06-m3-final-focused-2.manifest.json) seals 9 files; SHA-256 `8e253990ca8ff92f5c98a3673a171b46ad5b714a6890a0c75d6f0c6eb072b187`.

The [final-focused-custody manifest](evidence/2026-11-06-m3-final-focused-custody.manifest.json) seals 10 files; SHA-256 `32dd53bdc9ec93758d7313c5522eca54378093d34c63d3318292693bd6bc697e`.

The [gate-fixes-focused manifest](evidence/2026-11-06-m3-gate-fixes-focused.manifest.json) seals 14 files; SHA-256 `46ab6503994b958e39261e837736187f760b9fe3697cdc7741cd2bc22c0280c8`.

