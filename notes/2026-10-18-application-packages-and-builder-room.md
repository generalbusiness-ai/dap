# Application packages, their checks, and the builder room

18 October 2026, draft 2. Design note for review. It makes application
authoring in dap easier to do and easier to verify, so that an agent can
build and customize an application on demand and a person can see what
it did. It decides four things and designs each:

1. **The package declares its structure.** Connections, rights, groups,
   order, derivation and parameters join the package's semantic part.
   The manifest holds names and wiring; every guard and effect stays in
   a definition.
2. **A package validator checks the structure.** `validatePackage` is a
   pure bounded function beside `validateDefinition`. The install act
   runs it as a guard, so a room cannot hold a scope under a package
   that fails it, and replay re-runs it.
3. **Six forms join the authoring language.** A `late` branch on
   handlers, `spacing` on handlers, sends from timed rules, declared
   `states` on acts and handlers, typed parameters resolved at pack
   time, and `staleness` on a group read.
4. **The builder room is configuration.** A repository room with a
   `packages` extent, `dap check` as a room check, the landing policy's
   attempt limit as the repair budget, generated views, and release by
   URI. No new platform scope and no new authoring language.

It commissions nothing by itself; section 12 names the slices and where
they fall after [plan 033](plans/033-2026-10-18-grow-room-demo.md). Hugh
asked for the direction and for this note on 18 October 2026. The
implementation owes no backward compatibility. Source facts cite
`path:line` at main `32b32fc2d`.

## 1. Why

The dap-spike of September 2026 measured one authoring cost: an agent
needed six repairs to author one model under a visibility model where
each reader sees part of one record, and every repair was about who can
read what. That cost class is absent in dap by construction: a scope has
one journal with uniform visibility, a guard reads only its own journal
(the scope contract's D5-5), and a foreign fact enters only as a
verified delivery judged in the receiver's turn. The builder room must
not weaken this.

The costs the spike did not measure are the costs of composition:
declared topology, typed connections, order across senders, deadlines on
pending work, lifecycle of scopes. The reactor model has exact vocabulary
for them, and the sequenced note of the same day gives dap the order
part. This note gives it the rest.

What dap has today. `validateDefinition`
(`packages/derive/src/validate/index.ts:157`) checks one definition and
nothing across definitions: a send is checked only to address a slot
that holds a scope, and a handler's `from` is shape-checked. The rules
scope's `activate` runs the validator as a guard over a definition and
the closure of its `create` sends
(`packages/platform/src/rules-scope.ts:260-268`). The package format
(`packages/bytes/src/application-types.ts:17-28`) holds the entry, the
definitions, the creation edges, the host profiles, a place for
projections that M2a fills, the capabilities with bounds, the roles and
the predecessor. `dap check` runs each scenario on one root definition
with no transport between the package's scopes
(`packages/cli/src/application-command.ts:38`). The grow package
(`examples/grow`) is two definitions: the room's `report-site` act
(`room.ts:60-63`) sends a `relate` named `room-summary` to its `site`
slot, and the site's handler (`site.ts:31-34`) receives it with `copies:
3`. The two match only at runtime, and a fourth room is refused
`type-full` only then.

Two lessons from the woah builder-room design and the LambdaMOO editors
it studied apply here: keep pinned bytes and put lineage in data, never
live inheritance; and treat a generated surface as part of the contract,
so that nothing is listed that cannot be called and no description
understates an effect.

## 2. What the package declares

A definition owns its ports: a send names a message, its fields and the
slot that holds the target scope; a handler names its class, message,
fields, and the kind and definition it receives from. What no definition
can say is which definition fills a slot. That is the package's job.
`ApplicationSemantics` becomes version 2; the members of version 1 stay
and it gains:

```ts
connections: readonly { from: Digest; slot: string; to: Digest | "outside" }[];
rights: Readonly<Record<string, { owner: Digest }>>;
exercises: readonly { definition: Digest; row: string; right: string }[];
groups: readonly { name: string; members: readonly Digest[]; lifetime: { seconds: number } }[];
order: readonly { definition: Digest; handler: string; by: "any" | { right: string } | { group: string } }[];
derivation: Readonly<Record<Digest, { parent: Digest; patch: Patch } | { parent: Digest; parameters: Readonly<Record<string, number | string>> }>>;
parameters: Readonly<Record<string, { type: "int" | "text"; default: number | string; min?: number; max?: number }>>;
```

- **Connections.** For each definition and each slot of kind `scope`,
  the definition that fills it, or `outside` for a platform scope. A
  `create` edge is a connection whose filler is the child; `creates`
  stays derived. The entry definition is the root.
- **Rights.** Named exclusive constraints, each with one owning
  definition; an act or handler that changes the constrained state is
  listed under `exercises`. This is "a shared constraint has one owner"
  made declarable.
- **Groups.** Sequenced groups, their members, and the lifetime that
  bounds an unresolved position (sequenced note, 5.3).
- **Order.** For each handler: `any` when its result does not depend on
  the order of two senders' acts; the right it exercises; or its group.
- **Derivation.** A definition declared as a parent digest with a patch,
  or with parameter values. `dap pack` resolves it to bytes, and the
  resolved bytes are what the definition entry holds; the derivation is
  lineage, read by checks and views, never by judgment. A template marks
  rows `open`; a patch that touches another row is refused. A template's
  new version reaches rooms by a successor package, never by
  propagation.
- **Parameters.** Typed, with defaults and bounds, referenced in a
  definition as `{ param: name }` wherever a numeric or text constant is
  allowed (`copies`, `max`, `plusSeconds`, `spacing.seconds`,
  `late.within`, `staleness.seconds`). `dap pack` substitutes and records
  the binding under `derivation`. A room with different limits is a
  release of the same template with different values.

Nothing here puts a guard, an effect or any judgment into the manifest.
A scope pins resolved bytes.

## 3. The package validator

`validatePackage`, in derive beside `validateDefinition`, is a pure
bounded function of the package bytes and the limits. It composes the
per-definition dependency graphs into one package graph (nodes: acts,
handlers, timed rules; edges: sends to handlers along declared
connections, creations to geneses) and checks:

| Check | Refuses, with the reason | Kind |
|---|---|---|
| Port typing | A send whose message or fields match no handler of the connected definition (`unknown-message`, `field-mismatch`); a handler no connected definition can reach (`unreachable-handler`); a `relate` whose `copies` cannot hold the fan-in the senders' `each` and creation bounds imply (`fan-in-exceeds-copies`) | By construction |
| Both ends consent | A connection whose sender slot kind and receiver `from` clause disagree (`connection-mismatch`) | By construction |
| Result coverage | A request send without clauses for `refused` and `undelivered`; a creation without `conflict` (`unhandled-result`) | By construction |
| Settled pending work | A send that leaves an item pending (`settles`) with no timed rule that exits the pending state (`unsettled-pending`) | By construction |
| Grant coverage | An act whose action no default role holds (`ungranted-act`) | By construction |
| One owner | An act or handler under `exercises` for a right in a definition other than the owner (`right-not-owned`); a `max`-bounded type opened by a handler with no right (warning `unowned-bound`) | By construction for declared rights |
| Explicit order | A handler with no `order` entry (`order-undeclared`); a `reads` outside a group (`reads-outside-group`) | By construction |
| Relevant dependency | In a group, a sequenced input that neither reads a member nor belongs to a definition some sequenced input reads (warning `sequenced-for-nothing`); an unsequenced act whose items a member reads (`unsequenced-read-target`) | By construction |
| Late handling | A handler whose source is a group member, or that carries a lag bound, with no `late` (`late-undeclared`) | By construction |
| Cycle acknowledgement | A cycle in the package graph with no edge that carries `spacing`, a `late` bound, or a condition on state (`cycle-unacknowledged`); the storm bound is computed from `spacing` | By construction for the structural condition |
| Reachability | A state no row enters or leaves; a final state unreachable; a `states` list naming a state no effect produces (warning `unreachable-state`) | Warning |
| Derivation | A patch that fails to apply or whose result does not validate (`patch-fails`); a patch touching a row not marked open (`sealed-row`); a parameter outside its bounds (`parameter-bounds`) | By construction |
| Projected bound use | The entries and items each creation path can open, against the capabilities' bounds | Report |
| Closure and bounds | The existing closure, bytes and count limits; the group bounds of the sequenced note (`bounds`) | By construction |

The grow package is the worked example for the first row: a site whose
`create-room` bound allows more than three rooms is refused
`fan-in-exceeds-copies` at the package.

"By construction" means the install act's guard runs this validator in
its own turn, so a room cannot hold a scope under a package that fails,
the refusal and its reason are in the room's record, and replay re-runs
the rule. It does not mean the application is correct: business
correctness, the bound of an acknowledged cycle in practice, and anything
about outside operations need scenarios (section 8), whose expectations
are frozen literally and never derived from the declaration the
validator reads.

## 4. Six forms for the authoring language

Each form is judged from inputs the entry records, so it replays; each
gives a check something to compute; none adds code.

### 4.1 The `late` branch on handlers

```ts
late?: "refuse" | { within: { seconds: number }; reason: string; effects?: EffectForm[]; sends?: SendForm[]; attention?: AttentionForm[] };
```

`within` compares the source entry's time, carried in the delivery's
cause and readable as `{ source: "time" }`, with the commit's clock
reading. When the source time plus `within` is before the commit's
reading, the branch applies instead of the handler's effects and sends;
the entry is still `applied` and carries `late: { reason }`. With `late:
"refuse"`, the delivery is refused with the reason, nothing is written,
and the sender's `refused` clause receives the reason. Never both for
one delivery. A handler that judges `late` judges a time, and
`clock-behind` applies to it.

The difference measured is the delivery's apparent latency, the sender's
clock reading against the receiver's, with any clock disagreement inside
it; nothing in dap bounds or separates the two, so no tolerance term goes
into the form, and a negative value only means the delivery appears to
precede its cause. This replaces the sequenced note's lag guard; slice
S1 follows this section.

### 4.2 `spacing` on handlers

```ts
spacing?: { seconds: number };
```

A delivery that arrives within `seconds` of the previous applied
delivery from the same sender scope for the same message and handler is
refused with the reason `spacing`, and the sender's `refused` clause
fires. The last applied time per sender and message is bookkeeping
derived from the journal, so replay recomputes it. A cycle whose edge
carries `spacing` has a storm bound of one round per `seconds` per
sender, computable at the package.

### 4.3 Timed rules may send

`TimedRule` (`packages/contract/src/definition.ts`) has effects and
attention but no sends. Without sends, every cross-scope deadline needs
a person's act: a site cannot tell its rooms that a tender window
closed, and a lane cannot escalate after the attempt limit. `TimedRule`
gains `sends` with result clauses. The sender is the scope; the
receiver's `from` check is unchanged; the delivery's cause is the timed
entry; the drain order is unchanged, so replay is unchanged. A contract
change, its own slice.

### 4.4 Declared `states` on acts and handlers

```ts
states?: readonly string[];
```

on an act or handler, as timed rules already carry, is sugar for a state
guard on the scope's mode item, declared in a fixed place so that the
reachability check can compute which rows are live in which state,
which states are dead, and whether every non-final state has an exit.

### 4.5 `staleness` on a group read

In a sequenced group every position carries the order scope's clock
reading, one clock for the group. A `reads` entry may declare
`staleness: { seconds }`: the reader's cut is as of the latest position
allocated at least that long before its own, and it waits only for
unresolved allocations at or below that point. With a staleness at or
above the group's lifetime it never waits. The cut stays a function of
the two journals, the position and the declaration, so it is immutable
and replays. The form is specified in the sequenced note, 5.5, and built
in S3.

### 4.6 Parameters

Section 2's `parameters` and `derivation`. The install act receives the
parent's bytes beside the act, as it receives a definition's bytes
today, re-resolves and compares digests, so a recorded binding cannot
drift from the pinned bytes. A created sibling's index in an `each`
range may be passed as a creation field.

## 5. Where the checks run: two layers

**Layer 1, the platform rule.** The install act of M1 extends the rules
scope's `activate` (gap 2 of the applications note); it gains
`validatePackage` as a guard over the package's semantic part and the
resolved bytes. This layer is in every room. A package that fails never
founds a scope anywhere.

**Layer 2, the builder room.** A repository room whose rules declare a
`packages` extent (`docs/lanes-reference.md`, the `rules` item's
`extents`) with one required check, `dap check`, declared under the
[evidence rules](2026-10-16-evidence-rules-design.md) as a `room` check
with `reuse` at the `landing` stage: validate, pin, run the scenarios
across the package's scopes, replay the scenario journals, audit
capabilities, and write the generated views of section 7 into the tree.
The result is signed by the room's checker service on the exact tree and
counted once per tree. The attempt limit of the
[declared landing policy](2026-10-16-declared-landing-policy.md) is the
repair budget: a version that fails is sent back with the recorded
diagnostics, and after the declared number of versions the change is
escalated to a person. A landed package is a signed commit at a URI,
which is what another room installs.

Layer 1 is bounded and runs in a turn; it makes the property hold
everywhere. Layer 2 runs what no turn can hold and produces evidence,
not judgment. Three settings of the room: its generated view is the
grant-filtered list of what this member can do, tested against the live
MCP tool list; a timed rule marks a proposal idle after a declared
number of days, with no expiry and no lock; in a room the author owns,
the landing policy's later step may land automatically under the
declared bars.

## 6. What an agent does

1. **Start from something.** A template, or an installed package, read
   through its generated views: the row reference, the topology diagram,
   the acts each role can sign, the tool list, the scenarios.
2. **Propose a version** in the change lane: manifest, definitions,
   scenarios and descriptions, as data. One propose act is the primary
   path; the room's tools (view diagnostics, repair rows, re-check) are
   for iteration. An agent is never forced through the room.
3. **Receive typed diagnostics**: one row per finding naming the
   definition, the row, the check and the reason, in the vocabulary of
   section 3 and of refusals at runtime.
4. **Repair within the budget.** The attempt limit is a room rule, so the
   loop ends in a landing or an escalation.
5. **A person lands and installs.** Agents hold no `rules.activate` and
   no `change.merge`.
6. **Customize.** A profile selects rows; a parameter changes a bound or
   a deadline; a successor package names its predecessor and carries
   forward (M3).

Every generated surface meets four requirements: tools filtered or
annotated by grant at listing; descriptions generated from the
definition, stating class, fields, effects and refusal conditions, never
from comments; the reference tested against the live tool list; distinct
refusal messages for not granted, wrong room and not exposed, each with
its remedy. The room's record then measures authoring cost directly:
versions per package, findings per version, time to landing, and which
findings came from the static layer and which from scenarios.

## 7. Generated views

Judgment-free, written by `dap check` into the tree and served by the
room:

| View | From | Use |
|---|---|---|
| Row reference | the definitions, as `reference.mjs` writes `docs/lanes-reference.md` | what each row is |
| Topology diagram | the package graph: scopes as boxes, handlers as ports, sends as edges labelled with class, `spacing` and `late`; groups as enclosures; rights as labels | the reviewer's whole-package view |
| Tool list per role | the acts each role's actions grant | what this member can do; tested against the live MCP list |
| Causal trace | a scenario's entries across scopes, following each delivery's cause back to the act that caused it | why a refusal happened |
| Apparent latency | commit time minus source time per sender and message | whether a `late` bound is sized against the path it guards |
| Derivation | what this package changed from its template | review of a customization |
| Judgment preview | a candidate version replayed over a recorded room journal through the archive binding; the acts it would judge differently | "what changes for this room if this lands"; after S2 |

## 8. Scenarios across scopes, and invariants

`dap check` runs a scenario across the package's scopes with native
child transport, so a two-scope scenario exercises the declared
connections; the grow tests already do this through vitest's native
child. Expectations are literal: the refused path with its reason, the
state of named items at named positions, the acts available to a role at
a position. Positions and clock readings are inputs to the judgment, so
the scenario fixes them. Outputs include the causal trace and the
apparent-latency table.

Later, declared invariants: `check/invariants.json` beside the
scenarios, with statements over item states and counts, checked by
exhaustive exploration of act, delivery and timed sequences to a stated
depth over small value domains on the in-memory scope `dap check` runs,
reporting a counterexample trace. Model-based testing with a stated
bound, not proof; an invariant is a second statement by the author,
independent of the rules, as a scenario expectation is. Its own design
note follows the scenario form.

## 9. The sequenced note's draft 2

The sequenced note (request 29e9024d) adopts in its draft 2: finality of
a member's positions read from the order journal; refusals and expiries
recorded as holes in the order scope, never in a member's journal;
resolution recorded at the order scope before the member writes; the
leave fence as verified absence; `staleness` on reads (4.5); and the lag
guard withdrawn in favour of 4.1. The slices here depend on those forms
as that note states them.

## 10. What not to do

- No new authoring language now; data forms, package checks and
  generated views are the cheaper path.
- No judgment in the manifest; no live inheritance.
- No cross-scope logical time, clock bounds, barriers or a central
  coordinator.
- No static check presented as correctness; the scenario form is the
  evidence.
- No tool listed that cannot be called; no description from a comment;
  no connection-held draft.

## 11. Changes to existing documents

| Document | Change |
|---|---|
| [Applications note](2026-10-15-self-contained-applications.md), section 4 | The semantic part gains section 2's members; the three identities table says the semantic id covers them |
| Applications note, section 7, M2 | Package version 2 and `validatePackage` join M2 after M2a; publication by URI is the builder room's release |
| Sequenced note | Section 9 above; its 6.1 is withdrawn in favour of 4.1 here |
| Request S1 (`b42d3b74`) | The lag form follows 4.1; amended by assert f92b3f2a |
| `docs/scopes.md` | `late`, `spacing`, `states`, timed sends and `{ param }` in "The forms" when their slices land; the validator's refusals in "Validation and bounds" |
| `docs/write-an-application.md`, `docs/testing.md` | The package's structure, checks and views (P1, P8); the scenario form across scopes (P6) |
| Plan 033 | Nothing moves. P1 and P2 may run beside G1 to G3; P9 follows step 11 |

## 12. Slices

Serial for one builder unless said. Nothing here goes ahead of M2a, G1,
G2 or G3 in plan 033; P1 and P2 may run beside them when the builder is
blocked on review.

| Slice | What | Needs | Done when | Size |
|---|---|---|---|---|
| P1 | Package version 2 (section 2) and `validatePackage` (section 3), used by the codec and `dap check`; the grow package declares its connections, rights and order | M2a landed | each check of section 3 has a named refusal with a witness pair on the grow package; `fan-in-exceeds-copies` refuses a site whose room bound exceeds `copies`; `dap check` reports findings as rows | 2 to 3 days |
| P2 | The `late` branch (4.1) and `spacing` (4.2): contract, validator, derive, scope, replay, tests; `late-undeclared` | S1's source order, or together with S1 | an old delivery takes the branch and a fresh one the handler, the entry marked; `late: "refuse"` refuses with the reason; a second delivery inside `spacing` is refused and the sender's clause fires; all replay | 1 day |
| P3 | Timed rules may send (4.3) | P2 | a timed rule's `tell` is delivered with the timed entry as its cause; the drain order is unchanged; both journals replay | 1 day |
| P4 | Declared `states` (4.4) and the reachability check | P1 | the validator reports a dead state and a missing exit on a witness pair; the grow definitions pass | 1 day |
| P5 | Parameters and derivation (4.6, section 2): `{ param }`, `dap pack` resolution, the manifest binding, re-resolution at install, `sealed-row` and `patch-fails` | P1, M1's install act | a grow release with `copies` as a parameter installs with two bindings into two rooms; altered bytes are refused at install; a patch to a sealed row is refused at the package | 1 to 2 days |
| P6 | The scenario form across scopes (section 8): native child transport in `dap check`, literal expectations at positions, the causal trace and apparent-latency outputs | M2a, P1 | the grow fault scenario runs across the site and a room in `dap check` with G0's refusals and closures, and the trace names the act behind each refusal | 2 days |
| P7 | Package activation (section 5, layer 1): the install act runs `validatePackage` as a guard; `dap pack` refuses the same | P1, M1's install act | a room refuses a package that fails a section 3 check, with the reason in its record, and replay reports the same | 1 day |
| P8 | Generated views (section 7, all but judgment preview) | P1, P6 | the grow package's diagram, tool list per role and row reference are generated, and the tool list is tested against the live MCP list | 1 day |
| P9 | The builder room configuration (section 5, layer 2; section 6) | the evidence-rules slice and its checker runner (plan 033, step 11); P7, P8; publication by URI (M2) | an agent's three versions of a grow customization are checked, sent back twice with recorded findings, landed on the third by a person, and installed in another room by URI; the record gives the four measures of section 6 | 2 days |
| P10 | Judgment preview (section 7) | S2, and A4 or A5 for a recorded room | a candidate version replayed over the demo room's journal reports the acts it would judge differently | 1 day |
| P11 | Declared invariants: a design note | P6 | | |

Filed: P1, P2 and P3 to the builder. The rest are filed as their
predecessors land.

## 13. Decisions

1. The builder room is the direction for application authoring, as
   configuration of existing parts, not a new platform scope or
   authoring language. Hugh, 18 October 2026.
2. From the woah design: the room's grant-filtered command list tested
   against the live tool list; the proposal in the record; the direct
   path primary and the room for iteration. Hugh, 18 October 2026.
3. The package declares connections, rights, groups, order, derivation
   and parameters, and holds no judgment. Planner.
4. `validatePackage` is a pure bounded function run as the install act's
   guard. Planner.
5. The six forms of section 4 are adopted; Lingua Franca's `after` on
   deliveries, its `defer` queue, clock synchronization, inherited
   priorities, generics and enclaves as a feature are not. Planner.
6. `late` replaces the lag guard; applied with the branch or refused,
   never both. Planner.
7. No live inheritance; derivation is data resolved at pack time and
   checked at install. Planner.
8. Scenario expectations are literal and independent of the manifest;
   invariants are a second statement by the author. Planner.

## 14. Open points

| Point | Question | Proposed |
|---|---|---|
| Q1 | Whether `exercises` lives in the manifest or as a `right` mark on the act or handler in the definition | The definition, with `exercises` derived like `creates` |
| Q2 | The patch form for `derivation` | Row-level replace keyed by row name |
| Q3 | Whether `spacing` is keyed by sender scope alone or by sender and signer | Sender scope and message; a signer-level rate is a guard over the journal, available today |
| Q4 | Where the apparent-latency view belongs | In `dap check` for a scenario, and in the room's reference from its journal |
| Q5 | The group lifetime's default and bounds | Required, no default; 1 minute to 30 days (sequenced note, 5.9) |
| Q6 | Whether P7 also refuses at `dap pack` | Yes, as the codec does for closure; the install guard remains the rule that holds everywhere |

## Sources

- Lohstroh, M. *Reactors: A Deterministic Model of Concurrent Computation
  for Reactive Systems.* UC Berkeley EECS-2020-235, 2020.
- Lingua Franca documentation at lf-lang.org: deadlines, actions, modal
  models, multiports and banks, distributed execution. Read 18 October
  2026.
- Lin, S., and others. *Towards Building Verifiable CPS using Lingua
  Franca.* ACM TECS, 2023.
- Lee, E. A., and others. *Consistency vs. Availability in Distributed
  Cyber-Physical Systems.* ACM TECS, 2023, doi 10.1145/3609119.
- Corbett, J. C., and others. *Spanner: Google's Globally-Distributed
  Database.* OSDI 2012.
- The woah authoring specifications and LambdaMOO field notes in
  `~/play/woo`, and live reads of the LambdaMOO builder and editors on
  18 October 2026.
