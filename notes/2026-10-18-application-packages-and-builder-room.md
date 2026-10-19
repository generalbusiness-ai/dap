# Application packages, their checks, and the builder room

18 October 2026, draft 8. Design note for review. Section 15 lists what
changed after each checker review.

This note makes application authoring in dap easier to do and easier to
verify, so that an agent can build and customize an application on
demand and a person can see what it did. It decides four things:

1. **The package declares its structure.** Connections, rights, groups,
   order, derivation and parameters join the package's semantic part.
   The manifest holds names and wiring. Every guard and effect stays in
   a definition.
2. **A package validator checks the structure.** `validatePackage` is a
   pure bounded function beside `validateDefinition`. The install act
   runs it as a guard, so no room holds a scope under a package that
   fails it, and replay runs it again.
3. **Six forms join the authoring language.** A `late` branch on
   handlers, `spacing` on handlers, sends from timed rules, declared
   `states` on acts and handlers, typed parameters resolved at pack
   time, and `staleness` on a group read.
4. **The builder room is configuration.** A repository room with a
   `packages` extent, `dap check` as a room check, the landing policy's
   attempt limit as the repair budget, generated views, and release by
   URI. No new platform scope, and no new authoring language.

The note commissions nothing by itself. Section 12 names the slices and
places them after [plan 033](plans/033-2026-10-18-grow-room-demo.md).
Hugh asked for the direction and for this note on 18 October 2026. The
implementation owes no backward compatibility. Source facts cite
`path:line` at main `32b32fc2d`.

## 1. Why

The dap-spike of September 2026 measured one authoring cost. An agent
needed six repairs to author one model under a visibility model where
each reader sees part of one record, and every repair was about who can
read what. dap does not have that cost. A scope has one journal with
uniform visibility, a guard reads only its own journal (the scope
contract's D5-5), and a foreign fact enters only as a verified delivery
that the receiver judges in its own turn. The builder room must keep
that property.

The costs the spike did not measure are the costs of composition:
declared topology, typed connections, order across senders, deadlines on
pending work, and the lifecycle of scopes. The reactor model has exact
words for each of them. The sequenced note of the same day gives dap the
order part. This note gives it the rest.

What dap has today. `validateDefinition`
(`packages/derive/src/validate/index.ts:157`) checks one definition and
nothing across definitions. A send is checked only to address a slot
that holds a scope, and a handler's `from` is checked for shape and
compared as a definition name (`packages/derive/src/validate/handlers.ts`,
`packages/derive/src/delivery.ts`). The rules scope's `activate` runs
the validator as a guard over a definition and the closure of its
`create` sends (`packages/platform/src/rules-scope.ts:260-268`). The
package format (`packages/bytes/src/application-types.ts:17-28`) holds
the entry, the definitions, the creation edges, the host profiles, a
place for projections that M2a fills, the capabilities with bounds, the
roles, and the predecessor. `dap check` runs each scenario on one root
definition with no transport between the package's scopes
(`packages/cli/src/application-command.ts:38`). The grow package
(`examples/grow`) has two definitions. The room's `report-site` act
(`room.ts:60-63`) sends a `relate` named `room-summary` to its `site`
slot. The site's handler (`site.ts:31-34`) receives it with `copies: 3`.
The two match only at runtime, and a fourth room is refused `type-full`
only then.

Two lessons from the woah builder-room design and the LambdaMOO editors
it studied apply here. Keep pinned bytes and put lineage in data, never
live inheritance. Treat a generated surface as part of the contract: list
nothing that cannot be called, and let no description understate an
effect.

## 2. What the package declares

A definition owns its ports. A send names a message, its fields, and
the slot that holds the target scope. A handler names its class,
message, fields, and the kind and definition it receives from. No
definition can say which definition fills a slot. That is the package's
job. `ApplicationSemantics` becomes version 2. The members of version 1
stay, and it gains:

```ts
connections: readonly { from: Digest; item: string; slot: string; to: Digest | "outside" }[];
rights: Readonly<Record<string, { owner: Digest }>>;
exercises: readonly { definition: Digest; row: string; right: string }[];
groups: readonly { name: string; members: readonly { name: string; definition: Digest }[]; lifetime: { seconds: number } }[];
order: readonly { definition: Digest; handler: string; by: "any" | { right: string } | { group: string } }[];
derivation: Readonly<Record<Digest, { parent: Digest; patch: Patch } | { parent: Digest; parameters: Readonly<Record<string, number | string>> }>>;
parameters: Readonly<Record<string, { type: "int" | "text"; default: number | string; min?: number; max?: number }>>;
```

- **Connections.** For each definition, each item type, and each slot
  of kind `scope`: the definition that fills the slot, or `outside` for
  a platform scope. A `create` edge is a connection whose filler is the
  child. `creates` stays derived. The entry definition is the root.
- **Rights.** Named exclusive constraints, each with one owning
  definition. An act or handler that changes the constrained state is
  listed under `exercises`. This makes "a shared constraint has one
  owner" declarable.
- **Groups.** Sequenced groups, their members by name and definition,
  and the lifetime that bounds an unresolved position (sequenced note,
  5.3). In version 2 a member is a singleton: the check proves that its
  definition is created once per install (section 3), so its manifest
  name is its name in the order scope, and a `reads.member` resolves to
  it. Banks in groups are open point Q7.
- **Order.** For each handler: `any` when its result does not depend on
  the order of two senders' acts, the right it exercises, or its group.
- **Derivation.** A definition declared as a parent digest with a patch,
  or as a parent digest with parameter values. `dap pack` resolves it to
  bytes, and the resolved bytes are what the definition entry holds. The
  derivation is lineage. Checks and views read it. Judgment never does.
  A template marks rows `open`. A patch that touches another row is
  refused. A template's new version reaches rooms by a successor
  package, never by propagation.
- **Parameters.** Typed, with defaults and bounds. A definition refers
  to one as `{ param: name }` wherever a numeric or text constant is
  allowed: `copies`, `max`, `plusSeconds`, `spacing.seconds`,
  `late.within`, and `staleness.seconds`. `dap pack` substitutes the
  values and records the binding under `derivation`. A room with
  different limits is a release of the same template with different
  values.

**How a connection binds.** A declaration names definitions. A running
room holds instances. The check makes the declaration true of the
instances with three rules, each over forms the runtime already has.

1. *Who may write an endpoint slot.* An endpoint is a slot of kind
   `scope` named by a connection. The check admits it only when every
   effect that writes it takes its value from one of two sources: the
   `applied` result of a `create` send that names the declared `to`
   definition (`{ ref: { slot, from: { sender: true } } }`, as the grow
   site stores a room, `site.ts:25`), or the creator's own reference
   carried as a creation field of the genesis (`{ scope: true }`, as the
   grow room's `site`, `room.ts:53-58`) when the package's `creates` edge
   says the creator is the declared `to`. Any other writer, such as an
   act whose field a signer supplies, is refused `unbound-endpoint`. The
   slot may be `fixed` or not. A `fixed` slot can be written only by the
   entry that opens its item, so the creation-result source needs a slot
   that is not `fixed`, as the grow site's is. A creation result's
   sender is authenticated, and a child's creator is its genesis's
   source, so a slot written only by those two sources always holds a
   scope pinned to the declared definition.
2. *What the receiver checks.* A handler's `from { kind, under }` is
   compared at delivery as a definition name, not a digest. The static
   check requires `under` to equal the declared `from` definition's
   name. Two definitions can share a name, so the name check alone does
   not pin the sender. `ReceiveType.from` gains `pin?: Digest`, which the
   delivery check compares with the sender's definition digest from its
   genesis seed, in the runtime and in replay. The static check requires
   `pin` to equal the connection's `from`. A delivery from a scope whose
   definition has the declared name but another digest is refused
   `wrong-pin`.
3. *What bounds fan-in.* A `relate` handler's `copies` counts distinct
   retained keys for the whole life of the receiver. A key is the owner
   scope with its incarnation, the relation's name, and the owner's
   item. No copy is ever removed, and a live `max` bounds live items
   only. So a retired item that frees a slot lets a new child add a
   key, and one child with two items adds two keys. The check proves a
   fan-in from three lifetime bounds, each either proved or refused.

   Two different things need bounding, and the same item type can bound
   one without bounding the other. Successful child instances are
   bounded by the creator's slots, because a child whose creation was
   refused or conflicted never sends. Relation keys are bounded by the
   related item's type, and an item can relate before its own creation
   result fails it and frees its slot, so a creation-failure final state
   bounds no keys.

   *The successful-creation bound of an item type T in a creating row*
   is T's `max` when T has no final state, or when all three of the
   following hold. Every final state of T is entered only by the
   `refused` clause of that row's creation result. The effects of that
   clause name only the row's own `on` item, never an `also` subject or
   an alias, so a refused creation cannot end another slot that backs a
   confirmed child. The row's `conflict` clause enters no final state,
   because a `conflict` answer can arrive while a child exists under
   another incarnation (`packages/scope/src/delivery.ts:285-290`), and
   that child can send. Under those conditions a slot is freed only for
   a child that was never created, and every successful child keeps its
   own slot occupied. Any other final state leaves the bound unproved.

   *The instance bound of a definition* is one for the root. For any
   other definition D it is proved when exactly one row in the package
   holds a `create` send naming D; that row opens an item of some type
   T, either an act with `step: "open"` on T or a handler whose `opens`
   names T, so that one run of the row opens one item and makes one
   creation; T's successful-creation bound in that row is proved; the
   row's definition C has a proved instance bound; and the creation
   graph has no cycle through D. The bound is C's bound times T's
   successful-creation bound. A `create` send in a transition or comment
   row runs as often as the row does and is unproved.

   *The key bound of a `relate` send* is the `max` of the type of the
   item it relates, when that item is the row's own `on` item or a named
   item of that type and the type has no final state. A related type
   with any final state is unproved, because an item of it can relate
   and then end, and the next item of the type adds a key. Any other
   item source is unproved.

   The fan-in of a handler is the sum, over every connected sending
   definition and each of its `relate` sends to the handler, of the
   sender's instance bound times the send's key bound. The check refuses
   an unproved fan-in as `fan-in-unproved`, never admits it on the live
   `max`, and refuses a proved fan-in above `copies` as
   `fan-in-exceeds-copies`. A group member is a singleton when its
   instance bound is proved to be one.

   The grow package passes after one change that P1 makes. The site is
   the root. Its `create-room` act opens a `room` item (`site.ts:22`),
   and that type's one final state, `failed`, is entered only by the
   creation result's `refused` and `conflict` clauses, each naming the
   opened room alone (`site.ts:15,25`). The `conflict` clause must stop
   entering `failed`: P1 moves it to a non-final `conflicted` state, and
   the room definition's instance bound is then three. The site's `room`
   type bounds nothing else: it is never related. The room's `report-site` act relates the room
   scope's own `room` item (`room.ts:63`), a singleton type with no final
   state (`room.ts:49`), so the key bound is one. The fan-in is three,
   and `copies: 3` passes.

For an `outside` endpoint the check proves the slot's kind and, when the
manifest names the platform definition, that it has the handler. Nothing
more is claimed.

The manifest holds no guard, no effect, and no judgment. A scope pins
resolved bytes.

## 3. The package validator

`validatePackage` lives in derive beside `validateDefinition`. It is a
pure bounded function of the package bytes and the limits. It composes
the per-definition dependency graphs into one package graph. The nodes
are acts, handlers, and timed rules. The edges are sends to handlers
along declared connections, and creations to geneses. Over that graph it
checks:

| Check | Refuses, with the reason | Kind |
|---|---|---|
| Port typing | A send whose message or fields match no handler of the connected definition (`unknown-message`, `field-mismatch`). A handler that no connected definition can reach (`unreachable-handler`). A `relate` handler whose fan-in is not proved (`fan-in-unproved`) or whose proved fan-in exceeds `copies` (`fan-in-exceeds-copies`) | By construction, under section 2's three rules |
| Endpoint binding | An endpoint slot that an effect writes from a source other than the two of section 2 (`unbound-endpoint`). A handler whose `under` is not the declared sender's name or whose `pin` is not its digest (`wrong-peer`). A group member whose proved bound is not one (`group-member-not-singleton`) | By construction |
| Result coverage | A request send without clauses for `refused` and `undelivered`. A creation without `conflict` (`unhandled-result`) | By construction |
| Settled pending work | A send that leaves an item pending (`settles`) with no timed rule that exits the pending state (`unsettled-pending`) | By construction |
| Grant coverage | An act whose action no default role holds (`ungranted-act`) | By construction |
| One owner | An act or handler listed under `exercises` for a right in a definition other than the owner (`right-not-owned`). A `max`-bounded type opened by a handler with no right (warning `unowned-bound`) | By construction for declared rights |
| Explicit order | A handler with no `order` entry (`order-undeclared`). A `reads` outside a group (`reads-outside-group`) | By construction |
| Relevant dependency | In a group, a sequenced input that neither reads a member nor belongs to a definition some sequenced input reads (warning `sequenced-for-nothing`). An unsequenced act whose items a member reads (`unsequenced-read-target`) | By construction |
| Cycle acknowledgement | A cycle in the package graph with no edge that carries `spacing`, a `late` bound, or a condition on state (`cycle-unacknowledged`). The storm bound is computed from `spacing` | By construction for the structural condition |
| Handler forms | `late` or `spacing` on an advisory handler, which has no result to refuse into (`late-on-advisory`, `spacing-on-advisory`) | By construction |
| Reachability | A state no row enters or leaves. A final state no row reaches. A `states` list that names a state no effect produces (warning `unreachable-state`) | Warning |
| Derivation | A patch that fails to apply or whose result does not validate (`patch-fails`). A patch that touches a row not marked open (`sealed-row`). A parameter outside its bounds (`parameter-bounds`) | By construction |
| Projected bound use | The entries and items each creation path can open, against the capabilities' bounds | Report |
| Closure and bounds | The existing closure, bytes, and count limits, and the group bounds of the sequenced note (`bounds`) | By construction |

The grow package is the worked example for the first two rows. Its
fan-in is proved to be three (section 2, rule 3), so `copies: 3` passes
and `copies: 2` is refused `fan-in-exceeds-copies`. A room whose `room`
type becomes `many: true, max: 2` with no final state has a proved key
bound of two, so the fan-in is proved to be six: `copies: 3` is refused
`fan-in-exceeds-copies`, and `copies: 6` passes. Five variants are
refused `fan-in-unproved`: a site whose `room` type gains a `retire` act
into `failed`, because a retired room frees a slot for a fourth sender;
a site whose `create-room` becomes a transition act on its singleton
`site` item, because it then runs as often as it is called; a room
whose related `room` type gains a final state, because a room can relate
its item, end it, and relate the next one; a site whose `refused` clause
also moves an `also.previous` room to `failed`, because that frees a
slot that backs a confirmed child; and a site whose `conflict` clause
enters `failed`, because the child may exist. The site whose `refused`
clause names only the opened room, and whose `conflict` clause keeps
it, is the positive control.

"By construction" means this. The install act's guard runs the validator
in its own turn, so no room holds a scope under a package that fails.
The refusal and its reason are in the room's record. Replay runs the
same rule. It does not mean the application is correct. Business
correctness, the bound of an acknowledged cycle in practice, and
anything about outside operations need scenarios (section 8). A
scenario's expectations are frozen literally and never derived from the
declaration the validator reads.

**Staging.** The validator checks the forms that exist when it is built,
and refuses a form it does not know as `unsupported-form`. Three kinds of
witness are told apart. A **refusal** has a pair: one package that
passes and one that fails for that reason only. A **warning** has one
package that is admitted with the warning reported. A **report** has one
package whose computed values match a hand count.

| Checks | Built in | Needs |
|---|---|---|
| Port typing, endpoint binding with the `pin` check, result coverage, settled pending work, grant coverage, one owner, explicit order with `by: "any"` or a right, cycle acknowledgement on state conditions, closure and bounds, the projected-bound report | P1 | M2a |
| Cycle edges that carry `late` or `spacing` | P2, and the `late` edge once S1 has landed | P1, S1, P2 |
| Explicit order `by: { group }`, `reads-outside-group`, relevant dependency, `group-member-not-singleton` | P1g | P1, S3 |
| Reachability, with `states` | P4 | P1 |
| Derivation and parameters | P5 | P1 |

## 4. Six forms for the authoring language

Each form is judged from inputs the entry records, so it replays. Each
gives a check something to compute. None adds code.

### 4.1 The `late` branch on handlers

```ts
late?: { within: { seconds: number }; reason: string; then?: { effects?: EffectForm[]; sends?: SendForm[]; attention?: AttentionForm[] } };
```

The bound and the reason are always present. `then` chooses between the
two outcomes. A delivery is late when the source entry's time plus
`within` is strictly before the commit's clock reading. The source
entry's time travels in the delivery's cause and is readable as
`{ source: "time" }`. Equal is not late.

The judgment order of a handler is fixed: dispatch by class, name,
sender kind, and `from`; then `spacing` (4.2); then `late`; then the
handler's guards, effects, sends, and attention as today. `late` is a
form of a request handler, class `tell` or `relate`. An advisory
handler (`index`, `notify`) has no sends, attention, result, or
decision, and the validator refuses `late` on one (`late-on-advisory`,
section 3). A late delivery with no `then` is refused with `reason`:
none of the handler's effects, sends, or attention is written, and the
delivery is decided as every verified request delivery is decided today
(contract, section 7.4), with one deciding entry, decision `refused`,
reason `{ code: "late", name: reason }`, and one authenticated result
send, through which the sender's `refused` clause receives the reason.
A duplicate is answered from that entry. A late delivery with `then`
applies the branch's effects, sends, and attention instead of the
handler's. The handler's guards are not evaluated. The entry is
`applied` and carries `late: { reason }`. A delivery that is not late is
judged by the handler alone. Never both for one delivery.

`late` and `spacing` judge a time. Under `clock-behind` the answer is
`unavailable` with that reason and nothing is written. Replay derives
the same answer from the retained source entry's time and the entry's
own time. Each slice's witnesses cover both outcomes with a fresh, a
boundary, and a late delivery, and a `clock-behind` control. Lingua
Franca's deadline is likewise an interval and a handler, and the handler
runs instead of the reaction.

The difference measured is the delivery's apparent latency: the sender's
clock reading against the receiver's, with any clock disagreement inside
it. Nothing in dap bounds or separates the two, so no tolerance term
goes into the form. A negative value means only that the delivery
appears to precede its cause. This form replaces the sequenced note's
lag guard. Slice S1 owns `late`. P2 owns `spacing` (section 12).

### 4.2 `spacing` on handlers

```ts
spacing?: { seconds: number };
```

A delivery that arrives within `seconds` of the previous applied
delivery from the same sender scope, for the same message and handler,
is refused with the reason `spacing`, and the sender's `refused` clause
fires. The refusal keeps the delivery's deciding entry and its one
result, as a late refusal does (4.1). `spacing`, like `late`, is a form
of a request handler only; the validator refuses it on an advisory
handler (`spacing-on-advisory`). An entry applied through a `late`
branch counts as applied. The
last applied time per sender and message is bookkeeping derived from
the journal, so replay recomputes it. A cycle whose edge carries
`spacing` has a storm bound of one round per `seconds` per sender, and
the check computes it.

### 4.3 Timed rules may send

`TimedRule` (`packages/contract/src/definition.ts`) has effects and
attention but no sends. Without sends, every cross-scope deadline needs
a person's act. A site cannot tell its rooms that a tender window
closed, and a lane cannot escalate after the attempt limit. `TimedRule`
gains `sends` with result clauses. The sender is the scope. The
receiver's `from` check is unchanged. The delivery's cause is the timed
entry. The drain order is unchanged, so replay is unchanged. This is a
contract change and its own slice.

### 4.4 Declared `states` on acts and handlers

```ts
states?: { item: string; in: readonly string[] };
```

On an act or handler, `states` names an item type declared `one` and the
states of that type in which the row is live. It is sugar for a `state`
guard over that one item, declared in a fixed place, so that the
reachability check can compute per named item type which rows are live
in which state, which states no row enters or leaves, and whether every
non-final state has an exit. The validator refuses an item type that is
not `one` (`states-not-singleton`) and a state the type does not declare
(`unknown-state`). Two singleton types may declare a state of the same
name, since the item is named. P4's passing witness is a definition with
two `one` types, `season` and `irrigation`, both with a state `open`,
where `{ item: "season", in: ["open"] }` and `{ item: "irrigation", in:
["open"] }` are told apart. Its negative control names the order scope's
`allocation`, which is `many`, and is refused `states-not-singleton`. A
row with no primary item may still carry `states`, because the subject
is the named item, not the row's `on`.

### 4.5 `staleness` on a group read

In a sequenced group every position carries the order scope's clock
reading, so the group has one clock. A `reads` entry may declare
`staleness: { seconds }`. The reader's cut is then as of the latest
position allocated at least that long before its own, and it waits only
for allocations at or below that point that are still open. With a
staleness at or above the group's lifetime, no allocation below the cut
can still be open, because each has resolved, holed, or expired. The
reader can still be answered `behind` by a member that stopped between
the order scope's resolution and its own commit entry, until that member
resumes, and replay reports the missing entry as `missing-dependency`,
never as an empty page. The cut stays a function of the two journals,
the position, and the declaration, so it is immutable and replays. The
sequenced note specifies the form in its 5.5, and S3 builds it.

### 4.6 Parameters

Section 2 defines `parameters` and `derivation`. The install act
receives the parent's bytes beside the act, as it receives a
definition's bytes today, resolves the derivation again, and compares
digests. A recorded binding therefore cannot drift from the pinned
bytes. A created sibling's index in an `each` range may be passed as a
creation field.

## 5. Where the checks run: two layers

**Layer 1, the platform rule.** The install act of M1 extends the rules
scope's `activate` (gap 2 of the applications note). It gains
`validatePackage` as a guard over the package's semantic part and the
resolved bytes. This layer is in every room. A package that fails never
founds a scope anywhere.

**Layer 2, the builder room.** A repository room whose rules declare a
`packages` extent (`docs/lanes-reference.md`, the `rules` item's
`extents`) with one required check, `dap check`. The
[evidence rules](2026-10-16-evidence-rules-design.md) declare it as a
`room` check with `reuse` at the `landing` stage. The check validates,
pins, runs the scenarios across the package's scopes, replays the
scenario journals, audits capabilities, and writes the generated views
of section 7 into the tree. The room's checker service signs the result
on the exact tree, and the room counts it once per tree. The attempt
limit of the
[declared landing policy](2026-10-16-declared-landing-policy.md) is the
repair budget. A version that fails is sent back with the recorded
diagnostics. After the declared number of versions, the change is
escalated to a person. A landed package is a signed commit at a URI,
which is what another room installs.

Layer 1 is bounded and runs in a turn. It makes the property hold
everywhere. Layer 2 runs what no turn can hold and produces evidence,
not judgment. The room has three settings beyond the check. Its
generated view is the grant-filtered list of what this member can do,
tested against the live MCP tool list. A timed rule marks a proposal
idle after a declared number of days, with no expiry and no lock. In a
room the author owns, the landing policy's later step may land
automatically under the declared bars.

## 6. What an agent does

1. **Start from something.** A template, or an installed package, read
   through its generated views: the row reference, the topology diagram,
   the acts each role can sign, the tool list, and the scenarios.
2. **Propose a version** in the change lane: the manifest, definitions,
   scenarios, and descriptions, as data. One propose act is the primary
   path. The room's tools (view diagnostics, repair rows, re-check) are
   for iteration. An agent is never forced through the room.
3. **Receive typed diagnostics.** One row per finding names the
   definition, the row, the check, and the reason, in the words of
   section 3 and of refusals at runtime.
4. **Repair within the budget.** The attempt limit is a room rule, so
   the loop ends in a landing or an escalation.
5. **A person lands and installs.** Agents hold no `rules.activate` and
   no `change.merge`.
6. **Customize.** A profile selects rows. A parameter changes a bound or
   a deadline. A successor package names its predecessor and carries
   forward (M3).

Every generated surface meets four requirements. Tools are filtered or
annotated by grant at listing. Descriptions are generated from the
definition and state the act's class, fields, effects, and refusal
conditions, never copied from comments. The reference is tested against
the live tool list. Refusal messages for not granted, wrong room, and
not exposed are distinct, each with its remedy. The room's record then
measures authoring cost directly: versions per package, findings per
version, time to landing, and which findings came from the static layer
and which from scenarios.

## 7. Generated views

`dap check` writes these into the tree, and the room serves them. None
of them judges anything.

| View | From | Use |
|---|---|---|
| Row reference | the definitions, as `reference.mjs` writes `docs/lanes-reference.md` | what each row is |
| Topology diagram | the package graph: scopes as boxes, handlers as ports, sends as edges labelled with class, `spacing`, and `late`, groups as enclosures, rights as labels | the reviewer's whole-package view |
| Tool list per role | the acts each role's actions grant | what this member can do, tested against the live MCP list |
| Causal trace | a scenario's entries across scopes, following each delivery's cause back to the act that caused it | why a refusal happened |
| Apparent latency | commit time minus source time per sender and message | whether a `late` bound fits the path it guards |
| Derivation | what this package changed from its template | review of a customization |
| Judgment preview | a candidate version replayed over a recorded room journal through the archive binding, and the acts it would judge differently | "what changes for this room if this lands", after S2 |

## 8. Scenarios across scopes, and invariants

`dap check` runs a scenario across the package's scopes with native
child transport, so a two-scope scenario exercises the declared
connections. The grow tests already do this through vitest's native
child. Expectations are literal: the refused path with its reason, the
state of named items at named positions, and the acts available to a
role at a position. Positions and clock readings are inputs to the
judgment, so the scenario fixes them. The outputs include the causal
trace and the apparent-latency table.

Declared invariants come later. `check/invariants.json` beside the
scenarios holds statements over item states and counts. The check
explores act, delivery, and timed sequences to a stated depth over small
value domains on the in-memory scope that `dap check` runs, and reports
a counterexample trace. This is model-based testing with a stated
bound, not proof. An invariant is a second statement by the author,
independent of the rules, as a scenario expectation is. Its own design
note follows the scenario form.

## 9. What the sequenced note's current draft adopts

The sequenced note (request 29e9024d) adopts, in its draft 4, the forms
this note depends on: finality of a member's positions read from the
order journal; refusals and expiries recorded as holes in the order
scope, never in a member's journal; a member's judgment written as a
prepare entry, bound by hash in the order scope's resolution, and put
into effect by a commit entry that is the one effective fact, with a
write fence between; reservations for the prepare and the allocation; a
left member as the one absence; `staleness` on reads (4.5); and the lag
guard withdrawn in favour of 4.1. The slices here depend on those forms
as that note states them.

## 10. What not to do

- No new authoring language now. Data forms, package checks, and
  generated views are the cheaper path.
- No judgment in the manifest. No live inheritance.
- No cross-scope logical time, clock bounds, barriers, or central
  coordinator.
- No static check presented as correctness. The scenario form is the
  evidence.
- No tool listed that cannot be called. No description from a comment.
  No connection-held draft.

## 11. Changes to existing documents

| Document | Change |
|---|---|
| [Applications note](2026-10-15-self-contained-applications.md), section 4 | The semantic part gains section 2's members, and the three identities table says the semantic id covers them |
| Applications note, section 7, M2 | Package version 2 and `validatePackage` join M2 after M2a. Publication by URI is the builder room's release |
| Sequenced note | Section 9 above. Its 6.1 follows 4.1 here |
| Requests S1 (`b42d3b74`) and P2 (`506d46ed`) | S1 builds `late` per 4.1 (asserts b53643f2 and d66ec837). P2 builds `spacing` and the cycle edges, not `late` |
| `docs/scopes.md` | `late`, `spacing`, `states`, timed sends, `{ param }`, and `from.pin` in "The forms" when their slices land. The validator's refusals in "Validation and bounds" |
| `docs/write-an-application.md`, `docs/testing.md` | The package's structure, checks, and views (P1, P8). The scenario form across scopes (P6) |
| Plan 033 | Nothing moves. P1 and P2 may run beside G1 to G3. P9 follows step 11 |

## 12. Slices

Serial for one builder unless said. Nothing here goes ahead of M2a, G1,
G2, or G3 in plan 033. P1 and P2 may run beside them when the builder is
blocked on review.

| Slice | What | Needs | Done when | Size |
|---|---|---|---|---|
| P1 | Package version 2 (section 2) and `validatePackage` with the P1 row of section 3's staging table, used by the codec and `dap check`, with `unsupported-form` for the rest. `ReceiveType.from.pin` in the contract, the delivery check and replay. The grow package declares its connections, rights, and order | M2a landed | Each P1 refusal has its pair on the grow package, and the projected-bound report matches a hand count. `fan-in-exceeds-copies` refuses the grow site with `copies: 2`. A room whose `room` type is `many: true, max: 2` with no final state is refused `fan-in-exceeds-copies` with `copies: 3` and passes with `copies: 6`. `fan-in-unproved` refuses a site whose `room` type gains a `retire` act, a site whose `create-room` is a transition act on its singleton, a definition that relates an item of a type with a creation-failure final state before the creation result arrives, a site whose `refused` clause also ends an `also.previous` room, and a site whose `conflict` clause enters `failed`, while the site whose `refused` clause names only the opened room and whose `conflict` clause keeps it passes. The grow site's `conflict` clause is migrated to a non-final `conflicted` state. `unbound-endpoint` refuses a site whose room slot is written from a signer's field, and a wrong-definition creation result. `wrong-peer` refuses a handler whose `pin` is a second digest with the declared name, and the delivery check refuses that sender `wrong-pin` while the declared peer passes. `dap check` reports findings as rows | 3 days |
| P1g | The group checks of the staging table | P1, S3 | Each refusal has its pair, and `sequenced-for-nothing` has its warning witness, on the two-scope witness of the sequenced note | 1 day |
| P2 | `spacing` (4.2) and the cycle edges that carry `spacing` or `late`: contract, validator, derive, scope, replay, tests | P1, and S1 for the `late` edge | A second delivery inside `spacing` is refused and the sender's clause fires, with fresh and boundary controls and a `clock-behind` control. A late-branch entry counts as applied. A cycle with a `spacing` edge is admitted with its computed bound. All replay | 1 day |
| P3 | Timed rules may send (4.3) | P2 | A timed rule's `tell` is delivered with the timed entry as its cause. The drain order is unchanged. Both journals replay | 1 day |
| P4 | Declared `states` (4.4) and the reachability check | P1 | `states-not-singleton` and `unknown-state` have their pairs. Two singleton types that share a state name are told apart. A dead state and a missing exit have warning witnesses. The grow definitions pass | 1 day |
| P5 | Parameters and derivation (4.6, section 2): `{ param }`, `dap pack` resolution, the manifest binding, re-resolution at install, `sealed-row`, and `patch-fails` | P1, M1's install act | A grow release with `copies` as a parameter installs with two bindings into two rooms. Altered bytes are refused at install. A patch to a sealed row is refused at the package | 1 to 2 days |
| P6 | The scenario form across scopes (section 8): native child transport in `dap check`, literal expectations at positions, the causal trace, and the apparent-latency output | M2a, P1 | The grow fault scenario runs across the site and a room in `dap check` with G0's refusals and closures, and the trace names the act behind each refusal | 2 days |
| P7 | Package activation (section 5, layer 1): the install act runs `validatePackage` as a guard, and `dap pack` refuses the same | P1, M1's install act | A room refuses a package that fails a section 3 check, with the reason in its record, and replay reports the same | 1 day |
| P8 | Generated views (section 7, all but judgment preview) | P1, P6 | The grow package's diagram, tool list per role, and row reference are generated, and the tool list is tested against the live MCP list | 1 day |
| P9 | The builder room configuration (section 5, layer 2, and section 6) | The evidence-rules slice and its checker runner (plan 033, step 11), P7, P8, and publication by URI (M2) | An agent's three versions of a grow customization are checked, sent back twice with recorded findings, landed on the third by a person, and installed in another room by URI. The record gives the four measures of section 6 | 2 days |
| P10 | Judgment preview (section 7) | S2, and A4 or A5 for a recorded room | A candidate version replayed over the demo room's journal reports the acts it would judge differently | 1 day |
| P11 | Declared invariants: a design note | P6 | | |

Filed: P1, P2, and P3 to the builder. The rest are filed as their
predecessors land.

## 13. Decisions

1. The builder room is the direction for application authoring, as
   configuration of existing parts, not a new platform scope or
   authoring language. Hugh, 18 October 2026.
2. From the woah design: the room's grant-filtered command list tested
   against the live tool list, the proposal in the record, and the
   direct path primary with the room for iteration. Hugh, 18 October
   2026.
3. The package declares connections, rights, groups, order, derivation,
   and parameters, and holds no judgment. Planner.
4. `validatePackage` is a pure bounded function run as the install act's
   guard. Planner.
5. The six forms of section 4 are adopted. Lingua Franca's `after` on
   deliveries, its `defer` queue, clock synchronization, inherited
   priorities, generics, and enclaves as a feature are not. Planner.
6. `late` replaces the lag guard, and a delivery is applied with the
   branch or refused, never both. Planner.
7. No live inheritance. Derivation is data resolved at pack time and
   checked at install. Planner.
8. Scenario expectations are literal and independent of the manifest.
   Invariants are a second statement by the author. Planner.
9. A connection endpoint is bound by construction through section 2's
   three rules: only a creation result or a genesis back-reference
   writes it, the receiver pins the sender's digest with `from.pin`, and
   fan-in is admitted only when the lifetime instance bound of each
   sender and the lifetime key bound of each send are proved. Group
   members are singletons in version 2. Planner, drafts 3 to 6.
10. `late` carries its bound and reason always. `then` chooses the
    branch, and its absence the refusal. The judgment order is
    dispatch, `spacing`, `late`, guards. Planner, draft 3.
11. S1 owns `late`. P2 owns `spacing`. Planner, draft 3.

## 14. Open points

| Point | Question | Proposed |
|---|---|---|
| Q1 | Whether `exercises` lives in the manifest or as a `right` mark on the act or handler in the definition | The definition, with `exercises` derived like `creates` |
| Q2 | The patch form for `derivation` | Row-level replace keyed by row name |
| Q3 | Whether `spacing` is keyed by sender scope alone or by sender and signer | Sender scope and message. A signer-level rate is a guard over the journal, available today |
| Q4 | Where the apparent-latency view belongs | In `dap check` for a scenario, and in the room's reference from its journal |
| Q5 | The group lifetime's default and bounds | Required, no default, 1 minute to 30 days (sequenced note, 5.9) |
| Q6 | Whether P7 also refuses at `dap pack` | Yes, as the codec does for closure. The install guard remains the rule that holds everywhere |
| Q7 | Banks in groups: a member definition created several times | Not in version 2. A bank's instances would need names from their creation index, which the sequenced note's `enroll` can carry later |
| Q8 | Whether a handler may admit an unproved fan-in on purpose, with `type-full` as the runtime backstop | Not in version 2. A declared `copies: "unbounded"` would need its own retention rule |

## 15. Changes in drafts 3 to 8

**Draft 8**, after review f119c3b9 of head 0ba0397a:

| Finding | Where answered |
|---|---|
| F1, P1: a refused clause could end another slot through `also`, and a `conflict` answer can come with an existing child | Section 2, rule 3: the `refused` clause names only the row's own item, and the `conflict` clause enters no final state. The grow site's `conflict` clause is migrated in P1. The sibling-failure and conflict variants are negative controls, and the owning-slot site is the positive control, in section 3 and P1 |

**Draft 7**, after review c2b00734 of head 5346406f:

| Finding | Where answered |
|---|---|
| F1, P1: a creation-failure final state bounds successful children but not the items a creator opens and relates before the failure | Section 2, rule 3: the successful-creation bound (creation-failure final states allowed) is separated from the key bound (no final state at all). The grow case keeps both. The pre-failure relation is a negative control in section 3 and P1 |
| F2, P2: the two-key room variant is a proved fan-in of six | Section 3 and P1: `fan-in-exceeds-copies` with `copies: 3`, passing with `copies: 6`, and `fan-in-unproved` kept for the repeatable-creation and recyclable-key cases |

**Draft 6**, after review 00713423 of head a73fb1de:

| Finding | Where answered |
|---|---|
| F1, P1: one creation form was not one creation per item | Section 2, rule 3: the creating row must open an item of a type with a proved lifetime item bound, and the creation graph must be acyclic. The transition-act variant is a negative control in section 3 and P1 |
| F2, P1: fan-in counted sender instances, not retained keys per instance | Section 2, rule 3: the key bound of a `relate` send from the related item type's lifetime item bound, and fan-in as the sum of instance bound times key bound. The two-key room is a negative control with `copies: 3` and passes with `copies: 6` |

**Draft 5**, after review 9c0b669a of head d68e4280, and a rewrite for
clarity at Hugh's request:

| Finding | Where answered |
|---|---|
| F1, P1: a `fixed` slot cannot be written by a later creation result | Section 2, rule 1: the endpoint may be `fixed` or not, and the check constrains the writers, not the slot. The grow site's slot stays `fixed: false`. P1 adds the reassignment and wrong-result controls |
| F2, P1: `under` is a definition name, not a digest | Section 2, rule 2: the static check maps `under` to the declared name, and `ReceiveType.from.pin` adds the digest check in the delivery check and replay. P1 carries the contract and runtime work and the two-digests-one-name control |
| F3, P1: a live `max` does not bound lifetime fan-in | Section 2, rule 3: the proved instance bound through one creation path, a proved creator, and final states entered only by `refused` and `conflict`. `fan-in-unproved` refuses the rest. The grow `room` type passes, and a `retire` act is the negative control. Q8 |
| F4, P2: the `states` witness used a `many` type | 4.4: two `one` types `season` and `irrigation` for the passing witness, `allocation` as the negative control |

**Draft 4** aligned section 9 with the sequenced note's draft 3.

**Draft 3**, after review 8afe6c0b of head 82f067e6:

| Finding | Where answered |
|---|---|
| F1, P1: `late: "refuse"` carried no bound or reason, and the judgment order was unstated | 4.1: `within` and `reason` always present, `then` chooses, the order dispatch, `spacing`, `late`, guards, strict boundary, `clock-behind`, witnesses for both outcomes. Decisions 10 and 11 |
| F2, P1: connections named definitions, not instances or slots | Section 2: `item` in the endpoint and the binding rules. Decision 9. Q7 |
| F3, P2: `states` had no subject | 4.4: `{ item, in }` over an item type declared `one` |
| F4, P2: P1 owed checks whose forms did not exist | Section 3's staging table with `unsupported-form` and three witness kinds |
| F5, P1: "with staleness at or above lifetime it never waits" was false for a member stopped after resolution | 4.5: `behind` until the member resumes, and `missing-dependency` in replay |

**After landing, 18 October, 22:30 and 23:30.** Section 4.1 says what a
refused late delivery writes: none of the handler's effects, sends, or
attention, and the delivery's own deciding entry and result as for any
refused request delivery, with the reason code `late`. The landed draft
said "nothing is written", which the native contract (section 7.4) does
not allow for a request delivery. `late` and `spacing` are forms of
request handlers (`tell`, `relate`) only; an advisory handler has no
result, and the validator refuses them on one (sections 3, 4.1, 4.2).
Builder question `0784600e`, checker corrections `91c866dc` and
`b92bd90c`, review `44ad8b0d` F4, planner decision on that question.

## Sources

- Lohstroh, M. *Reactors: A Deterministic Model of Concurrent Computation
  for Reactive Systems.* UC Berkeley EECS-2020-235, 2020.
- Lingua Franca documentation at lf-lang.org: deadlines, actions, modal
  models, multiports and banks, and distributed execution. Read 18
  October 2026.
- Lin, S., and others. *Towards Building Verifiable CPS using Lingua
  Franca.* ACM TECS, 2023.
- Lee, E. A., and others. *Consistency vs. Availability in Distributed
  Cyber-Physical Systems.* ACM TECS, 2023, doi 10.1145/3609119.
- Corbett, J. C., and others. *Spanner: Google's Globally-Distributed
  Database.* OSDI 2012.
- The woah authoring specifications and LambdaMOO field notes in
  `~/play/woo`, and live reads of the LambdaMOO builder and editors on
  18 October 2026.
