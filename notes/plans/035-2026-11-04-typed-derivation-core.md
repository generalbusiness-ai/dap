# Plan 035: Give Dap derivations a typed, inspectable program

Status: implementation scheduled through M8 by gitseq request `e99550e9bfedcde3bed05bae1d345fcbfe5f7c9a`. M1–M2 is in progress on the retained prototype. Hugh overrides the deletion-size gate; the semantic contract, witness map, file boundaries, and other stop criteria still apply. The [stop record](../implementation/2026-11-04-typed-core-stop.md) preserves the earlier 15.9% estimate and disposition as history.

Planned against `7135dc3985694760ff8c80ad07f200ba8f6e767d` on 2026-11-04.
Category: architecture and direction. Effort: large overall, split into small reviewed deliveries.
Risk: high at production cutover. Confidence: high in the existing boundary, unproved in the proposed simplification.

## Outcome

Compile an admitted Dap form into a typed program once. Execute that program,
explain its decisions, and derive conservative dependencies from its structure.
Keep a single implementation of each migrated primitive's concrete meaning.

The first acceptance target is the complete derivation of Grow's `water` act,
plus one small declared test form that sends a message. Grow's act has no sends.
The target covers the body of an act after its subjects resolve. Signature,
authority, idempotency, observation freshness, admission, and journal sealing
continue to surround this body in the existing judges and runtime.

This plan specifies a bounded prototype and the conditions for a production
migration. Complete deliveries 1–3 before committing to the wider migration.
Do not infer authorization to change published semantics from this plan.

## Implementation schedule, 4 November 2026

Request `e99550e9bfedcde3bed05bae1d345fcbfe5f7c9a` schedules M1–M8 in table order, with one reviewed landing per migration and a combined first landing for M1–M2. Hugh's decision overrides the deletion-size gate and the earlier restriction on scheduling M3–M8. Keep the other acceptance criteria below. After M3, re-estimate and report the remaining rows. The planner deploys the first production cutover at M3; M1–M2 needs no deployment.

## Earlier planner disposition, 4 November 2026

The planner accepts the semantic contract and stop criteria, and schedules only
the M1–M2 prototype. M3–M8 need a passed decision gate and Hugh's approval.

Reasons:

- The named first deletion is small. `readsClock`, `conditionsReadClock` and
  `timesEffect` total about four lines. Removing them does not pay for a second
  representation.
- Explain and Dependencies have no caller in the product today. Their value
  depends on a consumer that the prototype must show.
- The affected modules (`handlers`, `guards`, `lists`, `effects`, `sends`,
  `operand`, `marks`) hold about 2,900 lines and took 80 commits since
  September. A staged cutover over five to eight weeks would run beside that
  churn with two paths live.

Decision gate at the end of M2, all three required:

1. **A consumer.** Show one refusal explanation that a card or the CLI would
   display for Grow `water`: the failed guard's source path and the values it
   read, beyond today's selected guard and reason.
2. **A measured deletion.** Name the dispatch code that M4–M6 would delete and
   estimate the net line change across the affected modules. If the estimate
   removes less than a fifth of them, stop.
3. **Time box.** M1 reaches full-`Ran` agreement for Grow `water` and the send
   fixture within five working days, or stops and reports what blocked it.

The M1–M2 head carries this plan packet to main with the prototype, so a stop
record also lands the design.

## Current implementation

Read `AGENTS.md` and `docs/testing.md` before work. Use gitseq requests for each
delivery. Run from the repository root with its existing locked dependencies.
Do not install a tool in the checkout, change package manifests, or run mutation
sweeps. Use a clean isolated checkout for implementation if other work is present.

Relevant sources:

| File | Role |
|---|---|
| `packages/derive/src/handlers.ts` | `derive` runs resolved guards, effects, and sends and returns `Ran`. |
| `packages/derive/src/guards.ts` | Operand-bearing guards, subject absence, and prepared rule matching. |
| `packages/derive/src/lists.ts` | Ordered three-outcome combination and bounded range scans. |
| `packages/derive/src/operand.ts` | Reads values and resolves fact parts. |
| `packages/derive/src/validate/operands.ts` | Resolves types, field references, and context restrictions. |
| `packages/derive/src/effects.ts` | Derives ordered changes and maintains the working subjects. |
| `packages/derive/src/sends.ts` | Derives messages, their order, and their conditions. |
| `packages/derive/src/rules.ts` | Collects prescribed rule inputs using the current judge. |
| `packages/derive/src/rule/index.ts` | Converts restricted JSONata results into prepared Boolean results. |
| `packages/derive/src/rule/evaluator.ts` | Pins evaluation behavior, limits, and engine probes. |
| `packages/derive/src/fold.ts` | Applies recorded effects; shares item mutation with derivation. |
| `examples/grow/watering.ts` | Declares the first real act to elaborate. |
| `examples/grow/watering.test.ts` | Covers its policy, open time window, amount, grants, and replay. |

At the planned commit, `handlers.ts` contains this sequence:

```ts
	const guards = judgeGuards(j, forms.guards);
	// Handle refusal and unavailable results.
	const effects = deriveEffects(j, forms.effects, forms.attention, opens);
	// Handle effect refusal and unavailable results.
	const sends = deriveSends(j, forms.sends, effects.working, cause, first, directory, effects.opened !== null);
```

`validate/operands.ts` already derives a partial typed description:

```ts
	export interface Read { form: string; type: FieldType | null; open: boolean; fields: readonly string[]; slot: string | null }
```

Match the repository's discriminated unions, explicit result values, `.ts`
imports, and strict TypeScript configuration. Use `rule.test.ts` and
`forms-sends.test.ts` as examples of tests that assert domain outcomes.

Drift check:

```sh
git diff --stat 7135dc3985694760ff8c80ad07f200ba8f6e767d..HEAD -- packages/derive packages/replay packages/scope examples/grow
```

If the semantic boundary changed, reconcile the affected part of this plan
before implementation. Routine additions elsewhere do not require a redesign.

## Design decisions

### Keep the first representation internal

Create `packages/derive/src/program/`. Keep it inside the derive package and
import it directly from tests during the prototype. Add no public package,
wire format, serialized program, dynamic plugin registry, or category library.

Use an immutable discriminated AST with typed constructors and exhaustive
visitors. Preserve the original declaration paths on nodes. Keep declaration
bytes and digests authoritative. The program is derived data.

Use ordinary domain names in the implementation: expression, guard, sequence,
effect, send, and source. Composition and interpretation provide the categorical
structure. Do not require authors to write categorical combinators.

### Use three cooperating node families

1. Expressions represent constants, resolved field and slot reads, records,
   options, comparisons, and explicit checked conversions. Add collection
   operations only when a migration actually needs them.
2. Guards represent ordered all/any combination, domain predicates, and prepared
   rule use. Preserve pass, fail, and unavailable, including their reasons.
3. Plans represent ordered effects and sends. Their evaluator owns a working
   subject map and produces the existing `Ran` result.

Every branch or repeated body must remain inspectable data. Do not store an
arbitrary application callback in a node and call it a typed program. Concrete
primitive implementations can remain ordinary shared TypeScript functions.

Use `FieldType` and existing assignment rules as the schema vocabulary. Keep
nominal distinctions such as member, item, fact, and scope references. Do not
represent every reference as an interchangeable string. A type parameter alone
does not prove a node valid: restrict construction and check dynamic evidence.

The prototype may elaborate after `validateDefinition`. At migration, retain
the validator's resolutions rather than building another permanent type checker.
Never make an accepted legacy definition fail admission because its body has
not yet migrated to this representation.

The [semantic contract](../2026-11-04-typed-core/README.md) fixes the closed
first-slice node set, constructor checks, phase rules, preparation mode, and
execution order. The [witness map](../2026-11-04-typed-core/witnesses.md) gives
existing evidence and explicit prototype acceptance cases. Treat both as part
of this plan. Do not invent different semantics to make a type signature fit.

Permitted leaf reuse includes `slotOf`, reference normalization and equality,
`changeItem`/`newItem`, and time conversion. Wrapping `judgeGuard`,
`judgeGuards`, `deriveEffects`, `deriveSends`, or `derive` as a generic executable
node would hide the structure this experiment must expose. Extract a smaller
shared primitive when necessary instead of copying its semantics.

### Make read contexts and missing values explicit

Encode whether a subject read uses the state before effects or the working
state. Field reads have no state phase. Guard and condition lowering selects
the earlier state. Effect sources select the working state. Send conditions
select the earlier state; send payloads select the working state.

The concrete interpreter must preserve these existing distinctions:

| Situation | Required behavior |
|---|---|
| Missing optional subject in a guard | Skip as current guard semantics specify. |
| Unbound subject in a send condition | Omit that send. |
| Missing value or empty party list | Preserve the current operand and slot rules; do not replace every absence with one generic exception. |
| Unavailable guard followed by false guard | Refuse, with the existing selected guard and reason. |
| False guard before a native rule | Do not execute the later rule. |
| Incomplete range | Preserve witness-based early answers and `guard-incomplete` when completion is necessary. |
| Sequential effects | Later effect sources see earlier changes; retain conflict and final-item checks. |
| Skipped send | Allocate no ordinal to it. |
| Declared clock read in an unexecuted branch | Preserve the existing structural `judgesTime` behavior where it applies. |
| Rule input digest mismatch | Return unavailable; reuse no result from another input. |

Use local evaluation state and explicit results. The interpreter must not write
storage, obtain fresh authority, read the wall clock, or deliver a message.

### Treat existing JSONata and native rules as explicit boundaries

For the first slice, a rule node means “use this named prepared result against
the prescribed input digest.” Preparation, JSONata evaluation, and replay of
that result remain the existing implementation. Keep its whole input dependency.

An explanation may state the rule name, input digest, and Boolean result. It
must label the body opaque. It cannot explain the internal amount comparison
until that body has a faithful inspectable interpretation.

Preserve `restricted@1`, `ENGINE_FINGERPRINT`, all refusal mappings, and all
existing budget behavior. A later project can add diagnostic lowering of a
supported expression fragment. Replacing authoritative evaluation requires
either full operational equivalence or an explicitly versioned new profile.

Native marks and capability callbacks remain unsupported by the prototype.
During later migration they require either an inspectable body or explicit
conservative dependency, effect, and cost summaries. Unknown means unknown,
not empty dependencies, zero cost, or an inferred successful result.

### Start with three interpretations

- **Execute:** preserve `Ran`, including reason codes and details, prepared
  results and their order, effects and sends and their order, `judgesTime`,
  `settles`, and any binding metadata the migrated boundary carries.
- **Explain:** emit a bounded structured trace of executed nodes with source
  paths, result, and relevant evidence references. Share concrete primitive
  execution with Execute; diagnostics must neither rerun operations nor change
  results. On trace exhaustion, mark the trace incomplete and continue judging.
- **Dependencies:** visit all possible branches and produce a conservative
  summary of field reads, phase-specific subject reads, clock use, and opaque
  requirements. Distinguish this static summary from an execution's actual reads.

Dependencies also include implicit inputs to finalization and encoding. Use
explicit variants for signer, scope identity, self position, bounds, prepared
results, fact/history lookup, item existence/finality, and live-item counts.
Include an `unknown` requirement when an operation lacks a justified summary.
A summary with `unknown` cannot justify skipping reevaluation. Every concrete
primitive declares these dependencies, including checks after the last effect.
An independence test changes only the named input field and holds state, clock,
bounds, authority context, identities, prepared inputs, and history fixed.

Keep diagnostics out of canonical entries and hashes. The prototype exposes
them only to in-process tests. A later public explanation API needs its own
read-authority and retained-input design; some refused acts have no journal entry.

Do not equate an actual-read trace with causal necessity or a minimal explanation.
Do not use dependency summaries to weaken the current prepared-input digest.

### Preserve operational meaning before optimizing

Perform no reordering, common-subexpression elimination, fusion, or algebraic
simplification in this plan. Values, selected refusals, missing evidence,
budgets, state phases, and send order all contribute to observable behavior.

State categorical laws only for operations that satisfy them under those
observations. Pure product and composition laws do not authorize duplicating
state changes or discarding failures. Static analyses need soundness obligations,
not equality with the concrete interpreter's outputs.

Cache no program by definition digest alone: validation also depends on bounds,
profiles, and options. Initially pass the program explicitly. A later cache may
key by an immutable validated context with an explicit lifetime.

## Deliveries and verification

Commands below use installed dependencies. A missing dependency is a setup issue;
do not use an unpinned tool probe to repair it. Read `docs/testing.md` for the
full gate and evidence conventions. Run focused witnesses while working and
`npm run gate` once for each completed review candidate. Do not repeat the whole
suite after it passes unless a new change or failure requires it.

### 1. Fix the semantic contract and witness map

Design complete in [the contract packet](../2026-11-04-typed-core/README.md).
Its [inventory](../2026-11-04-typed-core/coverage.md) covers the frozen source
vocabulary, platform marks, capabilities, and retained judge stages. Its
[witness map](../2026-11-04-typed-core/witnesses.md) distinguishes existing
behavior from the new prototype's obligations.

This delivery establishes a concrete implementation specification and bounded
scope. It does not establish a valid implementation, semantic equivalence,
dependency soundness, or code reduction. Verify the packet's baseline hashes
before source changes. Reconcile changed source rows before refreshing them.

### 2. Build one complete typed derivation in isolation

Create `program/model.ts`, `program/lower.ts`, `program/evaluate.ts`, and
`test/program.test.ts`. Keep existing production routing unchanged during this
delivery. The test calls both implementations directly with separate contexts.

Support exactly the native forms needed by `water`: open an item, check state
and time, use a prepared rule, read fields and constants, assign state, values,
party and references, produce the self reference and commit-time value, and
check the resulting required fields and live-item bound. Keep current helpers
for value normalization, equality, item mutation, and time arithmetic.

Add a small form in `test/program.test.ts` with a conditional `tell`. It must
distinguish the pre-effect condition from the post-effect payload and verify
the ordinal after an omitted send. Use the real source forms and source paths;
do not recognize the word `water` or special-case an application name.

Give this small form no JSONata rule and an unused optional field for the
dependency-independence witness. Add a non-final opening case at its live-item
limit for the `type-full` witness. Grow's `water` opens directly into final state
`done`, and its rule consumes the full prescribed input, so it cannot serve
those two purposes. Keep Grow as the real composition witness.

The evaluator may call shared leaf helpers. A node that calls the entire old
`derive` implementation does not satisfy this delivery. Temporary duplication
of orchestration is acceptable only inside this equivalence experiment.

Run both paths over the same immutable state and separately allocated mutable
`Judging` collectors. Compare the full `Ran`, not just its success tag. Use the
original validator and rule preparation in the test setup. The Grow integration
test must still exercise the existing public judge and replay.

Verify:

```sh
npm run typecheck --workspace @generalbusiness/dap-derive
npm exec -- vitest run --project derive program
npm exec -- vitest run --project grow watering
```

Expected: no type errors; explicit accepted, refused, unavailable, missing-subject,
clock-boundary, stale-prepared-input, ordered-effect, and send-ordinal witnesses
pass; both derivations agree on every field. Add compile-time negative examples
using `@ts-expect-error` to reject a wrong operand type or a working-state read
where the constructor requires the earlier state.

### 3. Prove that the representation earns its cost

Create `program/explain.ts` and `program/dependencies.ts`; extend
`test/program.test.ts`. Keep branch combination in one traversal per
interpretation, not a copy for each application or act kind.

Verify trace paths against the source declaration. Assert that a skipped branch
produces no evaluated event, while static dependencies still include its reads.
Assert that an opaque rule reports its full prescribed input dependency. Assert
that exhausting the trace limit leaves `Ran` byte-for-byte equivalent under
canonical encoding where applicable, and structurally equal otherwise.

Use controlled changes to inputs as witnesses: a field outside the reported
dependencies must not change the supported program's result; changing a reported
field can change it. Include absent-to-present changes and control dependencies.
These are bounded witnesses, not a claim that tests prove general soundness.

Verify:

```sh
npm run typecheck --workspace @generalbusiness/dap-derive
npm exec -- vitest run --project derive program
```

Expected: the three interpretations consume the same program and all assertions
pass. Review a concrete water explanation and a before/after send example.
Document which current walkers or orchestration branches a production migration
can delete, and which remain shared domain primitives.

Decision: continue only if the representation exposes useful structure beyond
opaque callbacks and a reviewed replacement sketch removes the named clock-read
traversals once their complete form coverage migrates. Include the old and new
call sites and show that the existing `judgesTime` witnesses cover the switch.
If it only adds wrappers, simplify the representation or retire the prototype.

### 4. Migrate one complete family and remove its old traversal

M3 below migrates the complete structural clock analysis before the remaining
execution forms. Its two callers and three deletion targets are fixed in the
semantic contract. Preserve actual native `ran.clock` separately. Retain the
current route for unsupported execution bodies until their full lowering exists.

At each later family cutover, migrate all callers of that family's semantics
and delete its old production dispatcher in the same delivery. Extract shared
leaf functions first. Do not copy domain meaning into two permanent engines.
Select any temporary whole-body fallback before execution.

The table below names module boundaries and tests. Before each cutover, record
the exact symbol caller query in its gitseq request and reconcile any source
drift. The caller list must include runtime and replay paths through derive.

### 5. Complete the frozen vocabulary

Complete the eight migrations below in dependency order. M1 and M2 implement
prototype deliveries 2 and 3. M3 implements delivery 4. M4–M8 finish delivery 5.
The scope includes every family in the inventory, with explicit opaque native
boundaries and retained judge stages. It excludes rewriting native rule bodies,
schedulers, provider code, authentication, persistence, and wire formats.

| Migration | Scope and deletion target | Acceptance evidence | Estimate |
|---|---|---|---|
| M1 | Closed first slice in `program/*`; share leaf semantics from `operand.ts`, `guards.ts`, `effects.ts`, `sends.ts`; production unchanged | Grow water, synthetic send/live-limit fixtures, full `Ran`, type/phase negatives | 3–5 days |
| M2 | Explain and dependencies over that same program; prove a useful replacement sketch | Trace budget and invocation count, skipped reads, opaque rule input, unused field | 2–3 days |
| M3 | Complete operand/part descriptors and structural clock visitor; integrate validator resolutions; replace clock callers in `handlers.ts`; delete `readsClock`, `conditionsReadClock`, `timesEffect` | forms-fields/guards, fixed-slot-index, all clock-cutover roots in the witness map; zero old clock symbol references | 3–5 days |
| M4 | All remaining declared guards, where/ranges and list binders; replace legacy guard/list form dispatch in `guards.ts` and `lists.ts`; keep shared scan strategies | forms-guards, rule, fixed-slot-index; all pass/fail/unavailable combinations and selected paths | 3–5 days |
| M5 | Remaining effects, attention, settlement primitives; replace form dispatch in `effects.ts`; keep mutation/validation leaves and fold behavior | forms-effects/handlers, required/fixed/final/author/condition cases | 3–5 days |
| M6 | All sends, fanout, collect, creation/index context and result bodies; replace dispatch in `sends.ts` and clause effect route in `handlers.ts` | forms-sends, compose, clause identity and current-state reconstruction | 3–5 days |
| M7 | Seven mark places, versioned capability boundaries and typed argument trees; remove old form-level mark/capability dispatch after callers migrate; retain `marks.ts` runner and capability implementations | gate enter + probe, forms-marks and capability owners; original context, faults, retained observations, queued effects | 4–7 days |
| M8 | Route genesis, acts, ordinary/late/bound receives, result clauses, and timed bodies through the completed program; remove whole-body fallback and legacy `derive` orchestration; retain judge shells | definition corpus lowering, late/binding/timed, existing scope/replay owners, full gate, zero unmigrated body routes | 3–5 days |

Estimated implementation effort: **24–40 focused engineer-days**, including
focused tests and review fixes, excluding this completed design delivery.
One engineer working continuously would need roughly five to eight working
weeks. This is a planning estimate, not an observed throughput result. M1–M2
provide a 5–8 day decision point before the larger commitment. Re-estimate
remaining rows from their results; do not silently broaden scope to fit a delay.

M3 may complete static metadata before concrete execution. A remaining legacy
body can consume the new clock summary without becoming a migrated executable
program. Conversely, do not count a catch-all node that invokes old form
interpreters as execution coverage. During staged cutover, remaining legacy
callers can use narrow adapters to migrated primitives, but M8 must remove
those adapters and body fallback.

Implementation completion requires all of the following:

- Every admitted corpus body lowers without unsupported paths. Each inventory
  row has an owner and behavioral evidence, including families absent from a
  particular corpus fixture.
- Invalid definitions retain their admission results and accepted definitions
  retain their bytes, digest, profile, bounds, and runtime support rules.
- Full outputs agree for the migration's witnesses, including prepared evidence,
  unavailable results, fault paths, effect/send ordering, and clause identity.
- Every body caller uses the program. The old traversal queries return no
  production references. Shared leaf primitives remain in one home.
- Execute supports the frozen vocabulary. Explain identifies opaque interiors.
  Dependencies conservatively reports unknown native requirements.
- The complete gate passes, including the existing runtime/replay witnesses.

Use these commands at the relevant migration boundary:

```sh
npm run typecheck --workspace @generalbusiness/dap-derive
npm exec -- vitest run --project derive program definition-corpus
npm run test:changed
npm run gate
```

Run the owning focused witnesses from the table while working, and the gate
once before review. Do not repeat whole suites after they pass without a new
change or unresolved failure. Preserve the reported evidence directory.

The endpoint is complete representation and execution of the frozen form
language, with conservative analysis across opaque code. Full inspection or
differentiation of every native callback is a different, unbounded objective.
Numerical differentiation, exact cost semantics, and incremental execution need
separate supported-primitive contracts after this migration earns its cost.

## File boundaries

Delivery 1 changes only this plan and its notes packet. Deliveries 2–3 may add `packages/derive/src/program/*`,
`packages/derive/test/program.test.ts`, and small test-support files under
`packages/derive/test/`. They may strengthen relevant existing derive and Grow
tests. They may expose a narrow existing helper where necessary, with unchanged
behavior. They may not change production routing or import the async evaluator
into the synchronous derive entry point.

Production migrations M3–M8 additionally permit the derive modules named in their table rows.
Any necessary edits to scope, replay, or fixture infrastructure require a
concrete explanation and an updated scope before the work proceeds.

Outside this plan: wire contracts, canonical serialization, stored journals,
definition pins, current rule semantics, authority policy, provider execution,
new packages, new public endpoints, deployment, and optimizer rewrites.

## Completion and stop criteria

The prototype is complete when deliveries 1–3 pass their witnesses and the
decision records either a specific simplification to migrate or a reason to stop.
The first production migration is complete only when delivery 4 also removes
its named old traversal and the complete gate passes. Do not mark the whole
core migrated after a single successful act.

Stop the affected delivery and report if:

- preserving an accepted definition requires changing its bytes or digest;
- a proposed type erases missing, null, skipped, or unavailable behavior;
- execution order, resource refusal, or retained evidence changes;
- explanations need to rerun a primitive or can affect the judgment;
- the program hides application logic in arbitrary callbacks;
- a program cache would combine different validation contexts;
- comparison ignores a difference in the full result, effects, or sends;
- migration adds permanent duplicate interpreters without a deletion target.

Future primitive additions must update lowering, concrete meaning, source
mapping, dependency treatment, and the unsupported-interpretation result.
Review laws against operational observations before using them for optimization.

## Design basis and limits

The categorical basis is composition with alternative interpretations, as in
[Compiling to Categories](https://conal.net/papers/compiling-to-categories/compiling-to-categories.pdf).
This plan does not require a proof that the entire distributed runtime forms a
cartesian closed category. Bounded collections, explicit failures, and ordered
effects need their own semantics. It leaves network scheduling and provider
behavior to the existing runtime.

The investigation covered derivation, validation, rule evaluation, and relevant
Grow and replay boundaries. It was not a repository-wide security or performance
audit. No performance improvement or line-count reduction has yet been measured.

## Planning verification

Two fresh-context reviews checked the plan and contract against source. The
first identified missing API constraints, implicit dependencies, the deletion
target, and fixtures for live-item limits and unused inputs. The completed
contract resolves those gaps. The second confirmed the first slice and finite
scope, and corrected two witness gaps: primitive counts before native support,
and explicit clock tests for every production root. Both corrections are in
the witness map.

Focused existing tests passed on 2026-11-04: 130 tests across 12 derive files,
and both tests in Grow's `watering.test.ts`. These establish the existing
semantic baseline. At that design checkpoint, the proposed program had no implementation or tests.
The 22 reviewed source hashes match the frozen baseline. Separate checks cover
local document links, cited source paths, and whitespace because the new files
are untracked and the tracked-document gate does not inspect them.

An earlier sandboxed gate passed preliminary checks and typechecking, then
failed at localhost listener tests with `listen EPERM`. Its evidence directory
is `/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.HayhNyn70D`.
The completed design's `npm run gate` passed with localhost access. Kernel,
Node, Counting, plain, and native stages all passed with complete terminal
evidence. The runner reported 135 Node cases, 56 Counting cases, 3,911 plain
passes with one skip, and 1,078 native passes with two skips. Individual duration
observations remain partial for the scope project; this does not change the
runner's terminal pass result. No implementation performance claim follows.

Gate evidence directory:
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.0SuPLIhRpi`.
The gate ran against the stated HEAD with the planning changes uncommitted.
No runtime source, dependency manifest, or lockfile changed.
