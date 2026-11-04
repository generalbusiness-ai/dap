# Typed derivation contract

Status: design complete for the first slice. Implementation and equivalence remain unproved.

Source baseline: `7135dc3985694760ff8c80ad07f200ba8f6e767d`, 2026-11-04.
This packet supplies delivery 1 of [plan 035](../plans/035-2026-11-04-typed-derivation-core.md).
The [coverage inventory](coverage.md) fixes the broader migration's endpoint.
The [witness map](witnesses.md) separates existing evidence from implementation acceptance tests.

## Boundary

The first program represents the body that `handlers.ts:derive` receives after
subject resolution. Its input contains the admitted definition, resolved fields
and subjects, state view, supplied clock, signer, facts, history, prepared rules,
bounds, scope identity, self position, opening type, cause, first ordinal, and
directory context. Execution returns the existing `Ran` union.

Each evaluation owns fresh `used`, `asked`, native-rule metadata, and working
subject collectors. The program retains immutable validation evidence and source
paths. It holds no mutable `Judging` object and performs no external writes.
History and state reads use the existing interfaces and their existing limits.

The lowerer returns `supported(program)` or `unsupported(paths)`. The latter
reports compiler coverage, not a judgment or admission failure. Select a whole
legacy route before execution when a body remains unsupported. Never resume
legacy execution after a partial program has run.

## Types and construction

Use the existing `FieldType` descriptors, including bounds, nominal reference
kinds, record members, and list limits. Resolve field, subject, and slot names
through the validator. A resolved handle contains its declaration path, descriptor,
requiredness, and the context that validated it. A writable handle also contains
the subject type and the slot's fixed and capability ownership rules.

`Expr<T, P>` denotes a value with descriptor `T` in phase `P`, where `P` is
`before` or `working`. A descriptor means a validated Dap type, not merely a
TypeScript `number` or `string`. Keep descriptor and phase parameters invariant.
Expose opaque constructors. The private representation may erase type parameters
only after its builder checks the source and destination descriptors using the
existing assignment relation. Tests must reject both invalid assignments and
working reads supplied to before-state guards.

An operand read returns `present(value)` or `absent`. At the compatibility
boundary, absence uses the existing operand conventions: missing reads and empty
party lists become null. Preserve distinctions only where source forms can
observe them. In particular, an effect's explicit `from: null` means clear,
whereas an absent source operand can mean leave unchanged. The syntax retains
that distinction even when both evaluate to a null-like value.

These are closed node sets for delivery 2. Each row names a constructor and all
its semantic parameters. Every node also carries its source path. Lists retain
declaration order. Handles and descriptors contain data, never callbacks.

| Family | Constructor and parameters | Meaning |
|---|---|---|
| Expression | `literal(type, value)` | A value checked against its descriptor. |
| Expression | `field(fieldHandle, phase)` | A resolved field read. |
| Expression | `slot(slotHandle, phase)` | A resolved subject slot read. |
| Expression | `signer(memberType, phase)` | The resolved signer's member reference, with legacy absence behavior. |
| Expression | `self(factType, phase)` | The existing self marker for the entry being derived. |
| Expression | `time(plusSeconds, phase)` | Supplied commit time plus the declared constant. |
| Guard | `state(subject, states, metadata)` | Existing state test, including an unbound subject's skip. |
| Guard | `before(slotHandle, metadata)` | Strict comparison of supplied time against a before-state time slot. |
| Guard | `after(slotHandle, metadata)` | The corresponding strict lower bound. |
| Guard | `prepared(ruleName, metadata)` | Match the prescribed input digest and consume a prepared result. |
| Guard | `all(guards)` | Ordered three-outcome conjunction. |
| Effect | `state(subject, state, condition)` | Existing state transition checks and effect encoding. |
| Effect | `value(slotHandle, source, condition)` | Assign a compatible working expression or explicitly clear. |
| Effect | `party(slotHandle, source, condition)` | Assign one member or clear a single-member party slot. |
| Effect | `ref(slotHandle, source, condition)` | Assign a compatible reference, self marker, or clear. |
| Send | `tell(destinationSlot, message, condition, fields, clauses)` | Omit or emit one request in the current ordinal sequence. |
| Program | `body(opening, guards, effects, sends, finish)` | The exact ordered stages below. |

Guard metadata contains `of`, `ifPresent`, and `reason`, with the resolved
subject and original path. A condition contains optional before-phase `all`
nodes for `if` and `unless`. `tell` has only `if`. A source is explicitly
`clear` or `read(Expr<T, working>)`. Send fields are an ordered mapping of
working expressions. Delivery 2 supports empty result clauses only.
`opening` contains the admitted item type and its existing defaults or is null.
`finish` contains the existing required-slot, finality, live-count, and settlement
descriptors. It introduces no application-specific function.

Delivery 2 supports only single-member party assignments, empty attention,
no native marks, no collection operations, no fact-part reads, and no settlement
clause. Other forms return `unsupported` with their paths. Admission of those
forms remains unchanged. Grow's `water` and the synthetic send and live-limit
fixtures fit this closed subset. Later deliveries extend this union according
to the coverage inventory.

## Worked target: Grow water

This pseudocode specifies the target lowering of `wateringForms().acts.water`.
It is a design example, not generated output. Names below stand for resolved
handles. Every expression in an effect uses the working phase. Time guards
read before-state slots and the supplied commit time.

```text
body
  opening: watering
  guards: all
    state also.policy [active]
    after also.policy.opensAt
    before also.policy.closesAt
    prepared water-amount, reason watering-exceeds-schedule
  effects:
    state on done
    ref on.zone <- read field zone
    value on.amountMl <- read field amountMl
    value on.mode <- read literal enum(scheduled)
    value on.reason <- read field reason
    party on.performedBy <- read signer
    value on.performedTime <- read time(+0 seconds)
    ref on.performedAt <- read self
  sends: []
  finish: existing slot/finality/live-count checks; settles false
```

For example, the policy state guard carries provenance
`acts.water.guards.0`, while a failure retains the existing relative
`guards.0` detail. Keep source provenance and result encoding
separate. The prepared rule remains one opaque invocation; its input includes
more than the amount field and policy limit that its expression mentions.

The program's structural clock summary is true because the two time guards
and the time assignment contribute clock use. Its opening reaches final state
`done`, so the live-item limit requires the separate non-final fixture. The
resolved `also.zone` and `also.policy` bindings arrive from the existing shell;
this example does not replace that resolution or the `grow.water` grant check.

## Execution order and outcomes

1. Set the existing settlement context when the row requires it.
2. Run guards on before-state subjects. Preserve the selected top-level failure
   path, optional reason name, and consumed prepared results.
3. Open the implicit item, if any, using existing defaults. Run effects in order
   against a private working map. Run existing conflict, fixed-slot, finality,
   and required-slot checks at their current points.
4. Derive sends against the working map, with conditions against before-state
   subjects. A skipped send consumes no ordinal.
5. Check the opening's live-item bound after send derivation. Preserve this
   ordering even when an earlier check could appear cheaper.
6. Calculate `judgesTime` and `settles`. Return every field of `Ran` unchanged.

The interpreter shares leaf semantics such as normalization, equality,
`changeItem`, `newItem`, and time arithmetic. It must not call `derive`,
`deriveEffects`, `deriveSends`, or `judgeGuards` through a catch-all node.
Shared leaf operations have explicit inputs, outcomes, and dependency summaries.

| Combination | Required result and evaluation order |
|---|---|
| `all([])` | Pass. |
| `all(children)` | Evaluate left to right until fail. Remember the first unavailable result and continue seeking a failure. Return that unavailable result only if no child fails. |
| `any([])` in the later collection delivery | Fail. |
| `any(children)` | Evaluate left to right until pass. If none passes, return the first unavailable result, otherwise fail. |
| Effect condition | If `if` reads an unbound subject, omit immediately. Otherwise evaluate `if` (default pass), then `unless` (default fail), even when `if` failed. Omit if `if` fails or `unless` passes. Otherwise propagate `if` unavailability, then `unless` unavailability. |
| Send or attention condition | Unbound reads omit. Otherwise all conditions must pass. Fail omits; unavailable prevents judgment. |
| Bounded scan | Preserve the current count, fixed-index, or ordered-scan strategy. A witness can establish some lower bounds before completion. Upper bounds and complete collections need the existing completion evidence. |
| Prepared rule collection | Match current `asked` behavior: collect and deduplicate prescribed rule inputs, then treat the rule as passing for preparation. A preceding failure prevents collection. |
| Prepared rule execution | Require the exact current rule and input digest. Append a consumed result once in current order. Missing or stale preparation remains unavailable. A prepared false result fails. |
| Native fault, later delivery | Preserve `RuleFault` and the current caller's conversion. Do not convert a throw, malformed output, or missing rule into an ordinary false predicate. |

Preparation uses the same guard structure with an explicit collection mode.
The async JSONata evaluator remains outside the synchronous interpreter.
Keep `restricted@1`, engine fingerprint, step accounting, and result/error
mapping unchanged. The rule input still includes the whole prescribed fields,
subjects, facts, kind, and signer. Narrow static dependencies cannot narrow
that digest.

Capability effects need a separate later-stage rule: retain their current
queued-record ordering after ordinary effects. Native effect marks also retain
their original supplied context and whole-effect checks. Neither case permits
an executor to flatten every returned effect into immediate sequential writes.

## Interpretations

Execution and explanation use one concrete interpreter. Explanation observes
node visits and results without rerunning a primitive. Trace events contain
source path, node kind, outcome, and bounded evidence references. An opaque
prepared or native rule reports its name and boundary result, never an invented
account of its internals. Exhausting the trace budget sets `truncated` and stops
collecting events while execution continues unchanged.

Dependencies use a separate exhaustive structural visitor. Each constructor
contributes its children plus its implicit reads. The result is a conservative
set with explicit variants for fields, before/working subjects, clock, signer,
scope, self, cause, ordinal, directory, bounds, prepared input, history/facts,
item existence/finality, live counts, and opaque requirements. Include record
membership and field presence, not just present values. Unknown native reads
produce `unknown(rule)` and prevent a claim that reevaluation can be skipped.
Static analysis visits skipped alternatives too.

Use one declared clock contribution per primitive and compose it structurally:
`before`, `after`, and time sources contribute true; compound nodes take the OR
of applicable children. Declaration bodies and result clauses have separate
roots. A clause's future clock reads do not make the sending entry judge time.
The execution root combines its structural result with actual `ran.clock` from
native rules that ran, including hooks that ran before the body boundary.

The first deletion target has two production callers:

- `handlers.ts:derive` combines guard, effect, send-condition, and attention reads.
- `handlers.ts:runClause` combines effect reads with actual native clock use.

Replace `sends.ts:readsClock`, `sends.ts:conditionsReadClock`, and
`handlers.ts:timesEffect` only after the new structural visitor covers every
form these callers accept. Its coverage can become complete before concrete
execution does. The skipped-clock-branch witness must still return
`clock-behind`. Never substitute the trace's actual reads for structural reads.

## Relationship to categorical interpretation

The pure expression layer gives typed maps from an explicit environment to
values. Product construction, projection, and composition admit the familiar
STLC interpretation. The first slice needs a first-order fragment rather than
general lambda abstraction. Later collection binders need explicit typed bodies.
They must not hide their bodies in JavaScript callbacks.

Guards and plans carry additional observable behavior: failure selection,
unavailability, budgets, state changes, and ordered outputs. Their interpretations
must preserve that behavior. This design does not assert cartesian laws for
effects or permission to duplicate or discard effectful expressions.

Elliott describes how typed programs can receive alternative categorical
interpretations. Dap's opportunity is to expose its existing structure and give
each primitive a defined interpretation. This packet proposes that adaptation;
the paper does not establish Dap's equivalence or dependency soundness.
See [Compiling to Categories](https://conal.net/papers/compiling-to-categories/compiling-to-categories.pdf), sections 2–4 and 8.

## What delivery 1 establishes

The boundary, first-slice grammar, operational obligations, source inventory,
and acceptance witnesses now have concrete definitions. This supports an
implementation estimate and exposes known semantic traps before source edits.
It does not prove that lowering typechecks, that two evaluators agree, that
dependencies are sound, or that the representation reduces code. Deliveries 2
and 3 test those claims before production migration.
