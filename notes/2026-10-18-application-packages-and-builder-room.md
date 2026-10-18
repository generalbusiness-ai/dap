# Application packages, their checks, and the builder room

18 October 2026. Design note for review. It makes application authoring
in dap easier to do and easier to verify, so that an agent can build and
customize an application on demand and a person can see what it did.

It decides four things and designs each:

1. **The package declares its structure.** Connections, rights, groups,
   order, and derivation join the package's semantic part. The manifest
   holds names and wiring only; every guard and effect stays in a
   definition.
2. **A package validator checks the structure.** `validatePackage` is a
   pure bounded function beside `validateDefinition`. The rules scope's
   activation runs it as a guard, so a room cannot hold a scope under a
   package that fails it, and replay re-runs it.
3. **Six forms join the authoring language.** A `late` branch on
   handlers, `spacing` on handlers, sends from timed rules, declared
   `states` on acts and handlers, typed parameters resolved at pack
   time, and `staleness` on a group read. Each is small, each is judged
   from recorded inputs, and each gives a check something to compute.
4. **The builder room is configuration.** A repository room with a
   `packages` extent, `dap check` as a room check, the landing policy's
   attempt limit as the repair budget, generated views written by the
   check, and release by URI. No new platform scope and no new authoring
   language.

It commissions nothing by itself; section 12 names the slices and where
they fall after [plan 033](plans/033-2026-10-18-grow-room-demo.md). Hugh
asked for the builder-room direction on 18 October 2026 and for this note
the same day; the implementation owes no backward compatibility, as the
sequenced note's decision 3 says.

The direction comes from four analyses of the same day: the reactor model
(Lohstroh; Lingua Franca), the woah builder-room design and the LambdaMOO
object editors it studied, the Lingua Franca feature set, and the time
model of Spanner, PTIDES and the CAL theorem. Section 1 states what they
found. Source facts cite `path:line` at main `32b32fc2d`.

## 1. Why

**Where authoring cost is.** The dap-spike of September 2026 measured one
cost: an agent needed six repairs to author the Sale model within a
visibility model where each reader sees part of one record, and every
repair was about who can read what, and so who can judge what. That cost
class is absent in dap by construction. A scope has one journal with
uniform visibility; a guard reads only its own journal (the scope
contract's D5-5); a foreign fact enters only as a verified delivery judged
in the receiver's turn. The containment the spike checked for is the scope
boundary itself. The builder room must not weaken this.

The costs the spike did not measure are the costs of composition:
declared topology, typed connections, order across senders, deadlines on
pending work, lifecycle of scopes. Those are what dap's next applications
meet, and the reactor model has exact vocabulary for them: a container
owns the connections and sees only its children's ports; a reaction
declares what it reads and writes; the dependency graph is computed and
causality loops are refused; a deadline carries a miss handler.

**What dap has today.** A definition is data. `validateDefinition`
(`packages/derive/src/validate/index.ts:157`) checks one definition's
form, names, slots, effects, counts, timed-entry space and timed-rule
cycles, and nothing across definitions: a `tell` or `relate` is checked
only to address a slot that holds a scope, and a handler's `from` is
shape-checked only. The rules scope's `activate` runs the validator as a
guard in its own turn over the definition and the closure of its `create`
sends (`packages/platform/src/rules-scope.ts:260-268`, rule
`definition-bytes`). The package format
(`packages/bytes/src/application-types.ts:17-28`) holds the entry, the
definitions, the creation edges derived from `create` sends, the host
profiles, an empty place for projections that M2a fills, the capabilities
with bounds, the roles with actions, and the predecessor. `dap check`
validates each definition, packs with a test key, runs each scenario on
an in-memory scope and replays it, with one root definition per scenario
and no transport between two of the package's scopes
(`packages/cli/src/application-command.ts:38`). M1's install half landed
on 18 October; M2a (declared projections, the generic interface, several
scopes in one package) is in progress.

The grow package (`examples/grow`) is already two definitions. The room's
`report-site` act (`examples/grow/room.ts:60-63`) sends a `relate` named
`room-summary` to its `site` slot with the detail fields `room` and
`openAlerts`; the site's handler `room-summary`
(`examples/grow/site.ts:31-34`) receives it from `{ kind: "lane", under:
<room digest> }` with `copies: 3`. The two match only at runtime, and a
fourth room's first summary is refused `type-full` only then. Nothing in
`dap check` exercises the link; the vitest suite does, through a native
child.

**What the other analyses added.**

- From woah and LambdaMOO: keep pinned bytes and never adopt live
  inheritance (replay forbids it, and silent change in a shared space
  disorients people); lineage as data instead; the room's generated view
  is the list of what this member can do, tested against the live tool
  list; a proposal is in the record, never a connection-held draft; the
  direct path (`dap check`, `dap pack`, one propose act) stays primary and
  the room is for iteration; a connection is declared once and both ends
  consent, as `make_exit` asks the source and the destination each to
  accept an exit; a tool whose description understates its effect is a
  safety defect.
- From Lingua Franca: a deadline with a miss handler that runs instead of
  the reaction; minimum spacing with a drop policy; timers whose reactions
  write outputs; modes as a declared form the compiler can check;
  parameters overridden at instantiation; a generated dependency diagram
  and a tagged trace; safety properties checked within a bound.
- From Spanner, PTIDES and the CAL theorem: a reader may act on a view as
  of a time or position only when it knows everything earlier, and that
  knowledge is either bounded by a clock model or durable in a log. dap
  assumes no clock bound, so its knowledge must be durable. The delivery's
  tag travels with it, so the difference between the sender's stamp and
  the receiver's commit is the measurable apparent latency, with clock
  error inside it and nothing to separate. A declared tolerance for stale
  information buys availability, by a formula. Section 9 carries what this
  means for the sequenced note's revision.

## 2. What the package declares

The reactor rule: the container owns the connections; the children own
the ports. A definition already owns its ports. A send names a message,
its fields and the slot that holds the target scope, with the slot's
declared kind; a handler names its class, message, fields, and the kind
and definition it receives from. What no definition can say is which
definition fills a slot. That is the package's job.

`ApplicationSemantics` becomes version 2. The members of version 1 stay
as they are (`entry`, `definitions`, `creates`, `host`, `projections`,
`capabilities`, `roles`, `predecessor`). It gains:

```ts
connections: readonly { from: Digest; slot: string; to: Digest | "outside" }[];
rights: Readonly<Record<string, { owner: Digest }>>;
exercises: readonly { definition: Digest; row: string; right: string }[];
groups: readonly { name: string; members: readonly Digest[]; lifetime: { seconds: number } }[];
order: readonly { definition: Digest; handler: string; by: "any" | { right: string } | { group: string } }[];
derivation: Readonly<Record<Digest, { parent: Digest; patch: Patch } | { parent: Digest; parameters: Readonly<Record<string, number | string>> }>>;
parameters: Readonly<Record<string, { type: "int" | "text"; default: number | string; min?: number; max?: number }>>;
```

- **Connections.** For each definition and each slot of kind `scope`, the
  definition that fills it, or `outside` for a platform scope such as a
  destination or a directory. A `create` edge is a connection whose filler
  is the child; `creates` stays derived. The entry definition is the root.
- **Rights.** Named exclusive constraints, each with one owning
  definition: "tender capacity: site". An act or handler that changes the
  constrained state is listed under `exercises`. This is "a shared
  constraint has one owner" (the roadmap's rule) made declarable.
- **Groups.** Sequenced groups and their members, as the sequenced note's
  section 8 asks of the manifest, with a declared lifetime that bounds how
  long a position may stay unresolved (section 9).
- **Order.** For each handler, the author's statement: `any` when the
  handler's result does not depend on the order of two senders' acts; the
  right it exercises; or its group. The default delivery is unordered
  (`docs/scopes.md`, Composition, "Order"), and the author says where that
  is not acceptable.
- **Derivation.** A definition may be declared as a parent digest with a
  patch, or a parent digest with parameter values. `dap pack` resolves it
  to bytes and the resolved bytes are what the definition entry holds; the
  derivation is lineage, read by checks and views, never by judgment. A
  template marks rows `open`; a patch that touches a row not marked open
  is refused at the package. A template's new version reaches rooms by a
  successor package, witnessed in each room's record, never by
  propagation.
- **Parameters.** Typed, with defaults and bounds, referenced in a
  definition as `{ param: name }` wherever a numeric or text constant is
  allowed: `copies`, `max`, `plusSeconds`, `spacing.seconds`,
  `late.within`, `staleness.seconds`. `dap pack` substitutes the values
  into the pinned bytes and records the binding under `derivation`. A room
  with different limits is a release of the same template with different
  values, not a new definition.

Nothing here puts a guard, an effect or any judgment into the manifest.
A scope pins resolved bytes; the manifest holds names and wiring, as a
reactor container does.

## 3. The package validator

`validatePackage`, in derive beside `validateDefinition`, is a pure
bounded function of the package bytes and the limits. It composes the
per-definition dependency graphs into one package graph: nodes are acts,
handlers and timed rules; edges are sends to handlers along declared
connections, and creations to geneses. Over that graph it checks:

| Check | Refuses, with the reason | Reactor counterpart | Kind |
|---|---|---|---|
| Port typing | A send whose message or fields match no handler of the connected definition (`unknown-message`, `field-mismatch`); a handler that no connected definition can reach (`unreachable-handler`); a `relate` whose `copies` cannot hold the fan-in the senders' `each` and creation bounds imply (`fan-in-exceeds-copies`) | Typed ports; connection type checking | By construction once activation refuses the package |
| Both ends consent | A connection whose sender slot kind and receiver `from` clause disagree (`connection-mismatch`) | A connection joins one output to one input | By construction |
| Result coverage | A request send without clauses for `refused` and `undelivered`; a creation without `conflict` (`unhandled-result`) | Reaction effects declared | By construction |
| Settled pending work | A send that leaves an item pending (`settles`) with no timed rule that exits the pending state (`unsettled-pending`) | Deadline with a miss handler | By construction |
| Grant coverage | An act whose action no default role holds (`ungranted-act`); the codec already checks that every role action is some act's grant | None; dap-specific | By construction |
| One owner | An act or handler listed under `exercises` for a right in a definition other than the right's owner (`right-not-owned`); a `max`-bounded type opened by a handler with no right (warning `unowned-bound`) | State shared only within one reactor | By construction for declared rights; a warning otherwise |
| Explicit order | A handler with no `order` entry (`order-undeclared`); a `reads` declaration outside a group (`reads-outside-group`) | Physical connections are explicit | By construction |
| Relevant dependency | In a group, a sequenced input that neither reads a member nor belongs to a definition some sequenced input reads (warning `sequenced-for-nothing`); an unsequenced act whose items a member reads (`unsequenced-read-target`) | PTIDES's relevant order: only coupled events need order | By construction |
| Late handling | A handler with `late` or `spacing` whose source is a group member or that carries a lag bound but names no `late` branch and no `late: "refuse"` (`late-undeclared`) | LF refuses a tardy input with no handler | By construction |
| Cycle acknowledgement | A cycle in the package graph with no edge that carries `spacing`, a `late` bound, or a condition on state or on a final state (`cycle-unacknowledged`) | Causality loop rejection; the CAL condition that each cycle tolerates inconsistency somewhere | By construction for the structural condition; the storm bound is computable from `spacing` |
| Reachability | A state no row enters or leaves; a final state unreachable; a `states` list naming a state no effect produces (warning `unreachable-state`) | A statechart linter | Warning |
| Derivation | A patch that fails to apply, or whose result does not validate (`patch-fails`); a patch touching a row not marked open (`sealed-row`); a parameter value outside its bounds (`parameter-bounds`) | Parameter override at instantiation | By construction |
| Projected bound use | The entries and items each creation path can open, against the capabilities' bounds (reported, not refused) | None | Report |
| Closure and bounds | The existing closure, bytes and count limits; the group bounds of the sequenced note (`bounds`) | Fixed topology | By construction |

The grow package is the worked example for the first row. Port typing
matches `room-summary`'s name, its two fields and their types, and the
fan-in: a site whose `create-room` bound allows more than three rooms is
refused `fan-in-exceeds-copies` at the package, where today the fourth
room's first summary is refused `type-full` at runtime.

"By construction" means: the activation guard runs this validator in its
own turn, so a room cannot hold a scope under a package that fails these
checks; the refusal and its reason are in the room's record; replay
re-runs the same rule. It does not mean the application is correct. Three
things no static check gives: business correctness (that a guard says
what the author meant); the bound of an acknowledged cycle in practice;
anything about outside operations, hosts or presentation. Those need
scenarios (section 8), and the dap-spike's lesson applies: a scenario's
expectations are frozen literally and independently of the manifest,
never derived from the declaration the validator reads.

## 4. Six forms for the authoring language

Each form is judged from inputs the entry records, so it replays; each
gives a check something to compute; none adds code.

### 4.1 The `late` branch on handlers

A handler may declare what happens when its delivery arrives later than
the author allows:

```ts
late?: "refuse" | { within: { seconds: number }; reason: string; effects?: EffectForm[]; sends?: SendForm[]; attention?: AttentionForm[] };
```

`within` compares the source entry's time, the sender's clock reading at
its own admission, carried in the delivery's cause and readable as
`{ source: "time" }`, with the commit's clock reading. When the source
time plus `within` is before the commit's reading, the branch applies
instead of the handler's effects and sends; the entry is still `applied`
and carries `late: { reason }`, as a Lingua Franca deadline handler runs
instead of the reaction and is not an error. With `late: "refuse"`, the
delivery is refused with the reason, nothing is written, and the sender's
`refused` clause receives the reason, so misses are countable at the
sender. A handler that judges `late` judges a time, and `clock-behind`
applies to it (`docs/scopes.md`, "The clock").

What the difference measures: the apparent latency of the CAL theorem,
the sum of the sender's processing offset, execution overhead, network
latency and clock synchronization error, which are indistinguishable at
the receiver and need not be separated. A negative value is expected with
imperfect clocks and means the delivery appears to precede its cause. The
documentation says so; no tolerance term goes into the form.

This replaces the lag guard of the sequenced note's section 6.1, which the
checker found to conflate guard refusal with conditional effects (its
review, F7). Here the two behaviours are two spellings. Slice S1 follows
this section for the lag form and the sequenced note's 6.2 for source
order (section 11).

### 4.2 `spacing` on handlers

```ts
spacing?: { seconds: number };
```

keyed by sender scope and message: a delivery that arrives within
`seconds` of the previous applied delivery from the same sender for this
handler is refused with the reason `spacing`, and the sender's `refused`
clause fires. The receiver's last applied time per sender and message is
bookkeeping derived from its journal, so replay recomputes it. This is
Lingua Franca's minimum spacing with the `drop` policy. Its `replace` is
the sequenced note's source order; the two compose. Its `defer` is an
unbounded queue and is not adopted.

The payoff is in the checks: a cycle whose edge carries `spacing` has a
storm bound of one round per `seconds` per sender, computable at the
package.

### 4.3 Timed rules may send

`TimedRule` (`packages/contract/src/definition.ts`) has effects and
attention but no sends, and the documents give no reason. Without sends,
every cross-scope deadline needs a person's act: a site cannot tell its
rooms that a tender window closed, a lane cannot escalate to a team room
after the attempt limit, and the order scope of section 9 cannot tell a
member that its position expired. `TimedRule` gains `sends` with result
clauses. The sender is the scope; the receiver's `from` check is
unchanged; the delivery's cause is the timed entry. The drain order is
fixed, so replay is unchanged. This is a contract change and its own slice.

### 4.4 Declared `states` on acts and handlers

```ts
states?: readonly string[];
```

on an act or handler, as timed rules already carry, is sugar for a state
guard on the scope's one mode item, declared in a fixed place so that the
reachability check can compute which rows are live in which state, which
states are dead, and whether every non-final state has an exit. Lingua
Franca's reset and history transitions become an idiom to document: a
transition whose effects re-set the deadline slot is a reset; one that
leaves it is a history transition.

### 4.5 `staleness` on a group read

In a sequenced group every position carries the order scope's clock
reading at the allocation, one clock for the group. A `reads` entry may
therefore declare

```ts
staleness?: { seconds: number };
```

The reader's cut of the named member is then as of the latest position
whose allocation time is at least `seconds` before its own position's,
and the reader waits only for unresolved allocations below that point.
This is Lingua Franca's `after` on a connection, which the reactor
analysis set aside for deliveries because no shared clock exists there;
inside a group the order scope is the clock. The CAL theorem gives the
wait directly: the apparent latency of the member's commit less the
declared staleness, floored at zero. With a staleness at or above the
group's lifetime the reader never waits. The cut stays a function of the
two journals, the position and the declaration, so it is immutable and
replays. The form belongs to the sequenced note's section 5 and its slice
S3; section 9 says how.

### 4.6 Parameters

Section 2's `parameters` and `derivation`. In a definition, `{ param:
name }` stands where a constant may stand; `dap pack` substitutes and
records. The activation guard receives the parent's bytes beside the act,
as it receives a definition's bytes today, re-resolves and compares
digests, so a recorded binding cannot drift from the pinned bytes. A
created sibling's index in an `each` range may be passed as a creation
field, as Lingua Franca passes `bank_index`.

## 5. Where the checks run: two layers

**Layer 1, the platform rule.** `activate` on the rules scope already
runs `validateDefinition` over a closure as a guard. The install act of
M1 extends it (gap 2 of the applications note); it gains
`validatePackage` the same way, over the package's semantic part and the
resolved bytes. This layer is in every room, builder or not. A package
that fails never founds a scope anywhere, and the refusal is in the
room's record with its reason.

**Layer 2, the builder room.** A repository room whose rules declare a
`packages` extent (`docs/lanes-reference.md`, the `rules` item's
`extents`) with one required check, `dap check`, declared under the
evidence rules as a `room` check with `reuse` at the `landing` stage
([evidence rules](2026-10-16-evidence-rules-design.md)): validate, pin,
run the scenarios across the package's scopes, replay the scenario
journals, audit capabilities, and write the generated views of section 7
into the tree. The result is signed by the room's checker service on the
exact tree, counted once per tree, and recorded. The landing policy's
attempt limit ([declared landing policy](2026-10-16-declared-landing-policy.md))
is the repair budget: an agent's version that fails is sent back with the
recorded diagnostics; after the declared number of versions the change is
escalated to a person. A landed package is a signed commit at a URI,
which is what another room installs.

The two layers are not redundant. Layer 1 is bounded and runs in a turn;
it is what makes the property hold everywhere. Layer 2 runs what no turn
can hold (scenarios, replay, a container) and produces evidence, not
judgment.

Three configurations of the room come from the woah lessons:

- The room's generated view is the authoritative, grant-filtered list of
  what this member can do, and a test holds it against the live MCP tool
  list: nothing listed that cannot be called.
- A timed rule marks a proposal idle after a declared number of days, in
  the room's view. No expiry and no lock.
- In a room the author owns, the landing policy's later step lets the
  package land automatically under the declared bars; in a shared room
  landing takes review.

## 6. What an agent does

1. **Start from something.** A template, or an installed package in the
   room's store, read through its generated views: the row reference, the
   topology diagram, the acts each role can sign, the tool list, the
   scenarios. The agent reads generated tables, not source.
2. **Propose a version** in the change lane: the manifest, definitions,
   scenarios and descriptions, as data. One propose act is the primary
   path; the room's tools (view diagnostics, repair rows, re-check) are
   for iteration. An agent is never forced through the room.
3. **Receive typed diagnostics.** The room's check records each finding
   as a row naming the definition, the row, the check and the reason, in
   the vocabulary of section 3 and of refusals at runtime.
4. **Repair within the budget.** The attempt limit is a room rule, so the
   loop ends in a landing or an escalation, never in a quiet widening.
5. **A person lands and installs.** Agents hold no `rules.activate` and
   no `change.merge`: the agent proposes, the authorized person performs.
6. **Customize.** A profile selects rows; a parameter changes a bound or a
   deadline; a successor package names its predecessor and carries
   forward (M3). Policy packages that refine a kind another package owns
   wait for M4.

**Legibility requirements** for the builder room and for every generated
surface, from the woah surface reviews: tools filtered or annotated by
grant at listing; descriptions generated from the definition, stating the
act's class, fields, effects and refusal conditions, never from comments;
the generated reference tested against the live tool list so that
documentation cannot rot; distinct refusal messages for not granted,
wrong room and not exposed, each with its remedy.

The room's record then measures the authoring cost directly: versions per
package, findings per version, time from first version to landing, and
which findings came from the static layer and which from scenarios.

## 7. Generated views

All judgment-free, written by `dap check` into the tree and served by the
room:

| View | From | Use |
|---|---|---|
| Row reference | the definitions, as `reference.mjs` writes `docs/lanes-reference.md` today | what each act, handler, timed rule and item is |
| Topology diagram | the package graph of section 3: scopes as boxes, handlers as ports, sends as edges labelled with class, `spacing` and `late`; groups as enclosures; rights as labels | the reviewer's whole-package view; the agent's map |
| Tool list per role | the acts each role's actions grant | what this member can do; tested against the live MCP list |
| Causal trace | a scenario's entries across scopes, following each delivery's cause back to the act that caused it | why a refusal happened |
| Apparent latency | commit time minus source time per sender and message, over a scenario or a room's journal | whether a `late` bound is sized against the path it guards |
| Derivation | `what this package changed from its template`, from `derivation` | review of a customization |
| Judgment preview | replay a candidate version over a recorded room journal, through the archive binding, and report which acts would be judged differently | "what changes for this room if this lands"; derived, non-authoritative, cheap because replay is deterministic. After the archive binding (S2) |

## 8. Scenarios across scopes, and invariants

**The scenario form.** `dap check` runs a scenario across the package's
scopes with native child transport, so a two-scope scenario exercises the
connections the package declares; the grow tests already do this through
vitest's native child, and the scenario form takes it over. Expectations
are literal: the refused path with its reason, the state of named items
at named positions, the acts available to a role at a position. Positions
and clock readings are assigned at admission and are inputs to the
judgment, so the scenario fixes them. Its outputs include the causal trace
and the apparent-latency table of section 7.

**Declared invariants, later.** Lingua Franca checks author-written
safety properties within a bound. The dap form: `check/invariants.json`
beside the scenarios, with statements over item states and counts (no
`hold` is `held` while its commitment is not `accepted`; at most one
tender `accepted` per plot), checked by exhaustive exploration of act,
delivery and timed sequences to a stated depth over small value domains
on the in-memory scope `dap check` already runs, reporting a
counterexample trace. It is model-based testing with a stated bound, not
proof. The dap-spike's objection to deriving checks from the declaration
does not apply: an invariant is a second statement by the author,
independent of the rules, as a scenario expectation is. Its own design
note follows the scenario form.

## 9. What this note settles for the sequenced note's revision

The sequenced note (request 29e9024d, head 365f56a5 on branch
`planner/sequenced-level-20261018`, checker review 2ff202f0, changes
requested) is revised by the planner. This note does not change its
protocol, but the comparison with Spanner, PTIDES and the CAL theorem
decided the shape of the revision, and the slices here depend on it, so
the decisions are stated once, here:

- **Safe position.** A member's safe position is the greatest P such that
  every allocation to it below P in the order journal is resolved: an
  entry at that position, or a durable hole. A reader as of P takes a
  member's cut only when its safe position is at or above P, and computes
  it from the order journal and the member journal, never from a live
  row. Replay makes the same computation, which gives verified absence,
  unresolved, and missing dependency as three distinct answers. This is
  Spanner's safe time: a prepared-but-unresolved transaction holds the
  replica's safe time back until its outcome is logged.
- **Durable holes.** A refused sequenced input writes a positional
  refusal entry, position and reason, no effects. The one exception to "a
  refusal writes nothing", bounded by the allocations the input made.
- **Resolution and expiry at the order scope.** A sequenced commit
  writes its entry marked unresolved, then asks the order scope to record
  `resolved`; the order scope appends it, or refuses `expired` when an
  `expire` entry already exists, written by its own timed rule after the
  group's declared lifetime (section 2, `groups.lifetime`; section 4.3
  for the send). Readers compute the safe position from the order
  journal, which decides; the member journal supplies the bytes. Without
  a clock bound, expiry cannot be a timeout each party judges on its own
  clock; it is serialized where allocation is.
- **The leave fence.** The `leave` entry at L resolves every position
  above L for that member, so an empty page above L is verified absence
  from the order journal alone.
- **Staleness on reads** (4.5), in S3.
- **The lag guard** (its 6.1) is withdrawn in favour of 4.1.

## 10. What not to do

- **Not a new authoring language now.** The data form plus package
  checks plus generated views is the cheaper path. The language question
  reopens with private views in one record, if the roadmap takes that up.
- **Not judgment in the manifest.** Guards and effects stay in
  definitions; the manifest holds names, wiring and lineage only.
- **Not live inheritance.** Pinned bytes per scope; lineage as data; a
  template's new version reaches rooms by successor packages.
- **Not cross-scope logical time, clock bounds, barriers or a central
  coordinator.** The sequenced level covers the cases that need order,
  per group; `late` and `spacing` cover the rest.
- **Not static checks presented as correctness.** The scenario form with
  literal expectations is the evidence; the checks remove classes of
  error.
- **Not a tool listed that cannot be called, and not a description from a
  comment.**
- **Not connection-held drafts.** A proposal is in the record.

## 11. Changes to existing documents

| Document | Change |
|---|---|
| [Applications note](2026-10-15-self-contained-applications.md), section 4 | The package's semantic part gains section 2's members; the three identities table says the semantic id covers them |
| Applications note, section 7, M2 | Package version 2 and `validatePackage` join M2's list after M2a; publication by URI is the builder room's release |
| Sequenced note, 6.1 | Withdrawn in favour of 4.1 here; 6.2 stays. Its section 5 gains the safe position, durable holes, resolution and expiry at the order scope, the leave fence and `staleness`, in its revision (section 9) |
| Request S1 (`b42d3b74`) | The lag form follows 4.1 here: `late` with `within`, `reason`, a branch or `"refuse"`; source order unchanged. Amended by an assert resting on the request |
| `docs/scopes.md`, "The forms" and Composition | `late`, `spacing`, `states`, timed sends and `{ param }` when their slices land; the package validator's refusals in "Validation and bounds" |
| `docs/write-an-application.md` | The package's structure, the checks, and the generated views, when P1 and P8 land |
| `docs/testing.md` | The scenario form across scopes, when P6 lands |
| Plan 033 | Nothing moves. P1 and P2 can run beside G1 to G3 at the builder's discretion; P9 follows step 11 |

## 12. Slices

Serial for one builder unless said. Nothing here goes ahead of M2a, G1,
G2 or G3 in plan 033; P1 and P2 may run beside them when the builder is
blocked on review.

| Slice | What | Needs | Done when | Size |
|---|---|---|---|---|
| P1 | Package version 2 (section 2) and `validatePackage` (section 3), used by the codec and `dap check`; the grow package declares its connections, rights and order | M2a landed, for the package format with several scopes | each check of section 3 has a named refusal with a witness pair on the grow package (one package that passes, one that fails for that reason only); `fan-in-exceeds-copies` refuses a site whose room bound exceeds `copies`; `dap check` reports the findings as rows | 2 to 3 days |
| P2 | The `late` branch (4.1) and `spacing` (4.2): contract, validator, derive, scope, replay, tests; the `late-undeclared` check | S1's source order, or together with S1 | a handler with `late.within` applies the branch to an old delivery and the handler to a fresh one, with the entry marked; `late: "refuse"` refuses with the reason; a second delivery inside `spacing` is refused `spacing` and the sender's clause fires; all replay | 1 day |
| P3 | Timed rules may send (4.3): contract, validator, derive, scope, replay | P2 | a timed rule's `tell` is delivered with the timed entry as its cause, the receiver's `from` check holds, the drain order is unchanged, and both journals replay | 1 day |
| P4 | Declared `states` (4.4) and the reachability check; the `states` list on the grow room's acts | P1 | the validator reports a dead state and a missing exit on a witness pair; the grow definitions pass | 1 day |
| P5 | Parameters and derivation (4.6, section 2): `{ param }`, `dap pack` resolution, the manifest binding, the activation guard's re-resolution, `sealed-row` and `patch-fails` | P1 and M1's install act | a grow release with `copies` as a parameter installs with two bindings into two rooms; a binding whose bytes were altered is refused at activation; a patch to a sealed row is refused at the package | 1 to 2 days |
| P6 | The scenario form across scopes (section 8): native child transport in `dap check`, literal expectations at positions, the causal trace and apparent-latency outputs | M2a, P1 | the grow fault scenario runs across the site and a room in `dap check` with its refusals and closures as G0 states them, and the trace names the act behind each refusal | 2 days |
| P7 | Package activation (section 5, layer 1): the install act runs `validatePackage` as a guard; replay re-runs it | P1, M1's install act | a room refuses to install a package that fails a section 3 check, with the reason in its record, and replay reports the same | 1 day |
| P8 | Generated views (section 7, all but judgment preview), written by `dap check` and served by the room's reference | P1, P6 | the grow package's diagram, tool list per role and row reference are generated, and the tool list is tested against the live MCP list | 1 day |
| P9 | The builder room configuration (section 5, layer 2; section 6): the `packages` extent, `dap check` as a room check under the evidence rules, the attempt limit, the idle-proposal rule, release by URI | the evidence-rules slice and its checker runner (plan 033, step 11); P7, P8; publication by URI (M2) | an agent's three versions of a grow customization are checked, sent back twice with recorded findings, landed on the third by a person, and installed in another room by URI; the room's record gives the four measures of section 6 | 2 days |
| P10 | Judgment preview (section 7) | S2, and A4 or A5 for a recorded room | a candidate version replayed over the demo room's journal reports the acts it would judge differently | 1 day |
| P11 | Declared invariants: a design note | P6 | | |

Filed now: P1, P2 and P3 to the builder. The rest are filed as their
predecessors land.

## 13. Decisions

1. The builder room is the direction for application authoring, as
   configuration of existing parts and not as a new platform scope or a
   new authoring language. Hugh, 18 October 2026.
2. The three woah lessons are adopted: the room's grant-filtered command
   list tested against the live tool list; the proposal as the buffer, in
   the record; the direct path primary and the room for iteration. Hugh,
   18 October 2026.
3. The package declares connections, rights, groups, order, derivation
   and parameters, and holds no judgment. Planner.
4. `validatePackage` is a pure bounded function run as the activation
   guard. Planner.
5. The six forms of section 4 are adopted; LF's `after` on deliveries,
   its `defer` queue, clock synchronization, inherited priorities,
   generics and enclaves as a feature are not. Planner.
6. `late` replaces the lag guard; the entry is applied with the branch,
   or refused with `"refuse"`, never both. Planner, answering F7.
7. No live inheritance; derivation is data resolved at pack time and
   checked at activation. Planner.
8. The sequenced note's revision adopts the safe position, durable holes,
   resolution and expiry at the order scope, the leave fence and
   `staleness`. Planner, from the Spanner, PTIDES and CAL comparison.
9. Scenario expectations are literal and independent of the manifest;
   invariants are a second statement by the author. Planner.

## 14. Open points

| Point | Question | Proposed |
|---|---|---|
| Q1 | Whether `exercises` lives in the manifest or as a `right` mark on the act or handler in the definition | The definition: the mark travels with the row and the package only checks ownership. If so, `exercises` is derived like `creates` |
| Q2 | The patch form for `derivation`: JSON Patch over the canonical form, or a row-level replace | Row-level replace keyed by row name; a definition's rows are named and a patch of rows is reviewable |
| Q3 | Whether `spacing` is keyed by sender scope alone or by sender and signer | Sender scope and message; a signer-level rate is a guard over the journal, available today |
| Q4 | Whether the apparent-latency view belongs in `dap check` or in the room's reference | Both: the scenario's table in the check, the room's table from its journal |
| Q5 | The group lifetime's default and bounds | Required, no default; 1 minute to 30 days |
| Q6 | Whether P7 should also refuse at `dap pack`, so that a failing package cannot be signed | Yes, as the codec does for closure today; activation remains the rule that holds everywhere |

## Sources

- Lohstroh, M. *Reactors: A Deterministic Model of Concurrent Computation
  for Reactive Systems.* UC Berkeley EECS-2020-235, 2020.
- Lingua Franca documentation at lf-lang.org: deadlines, actions, modal
  models, multiports and banks, composing reactors, distributed execution.
  Read 18 October 2026.
- Lin, S., and others. *Towards Building Verifiable CPS using Lingua
  Franca.* ACM TECS, 2023.
- Lee, E. A., Akella, R., Bateni, S., Lin, S., Lohstroh, M., and Menard,
  C. *Consistency vs. Availability in Distributed Cyber-Physical Systems.*
  ACM TECS, 2023, doi 10.1145/3609119; arXiv 2301.08906. The CAL theorem.
- Zhao, Y., Liu, J., and Lee, E. A. *A Programming Model for
  Time-Synchronized Distributed Real-Time Systems.* RTAS 2007. Relevant
  dependency and the relevant order.
- Corbett, J. C., and others. *Spanner: Google's Globally-Distributed
  Database.* OSDI 2012. TrueTime, commit wait, safe time.
- The woah authoring specifications and LambdaMOO field notes in
  `~/play/woo` (editor rooms, the minimal IDE, builder and programmer,
  catalogs CT7 to CT14, the MCP legibility note), and live reads of the
  LambdaMOO generic builder, `make_exit`, the generic editor and the verb
  editor on 18 October 2026.
- The dap-spike's authoring directions note (September 2026), section 1
  and section 5.
