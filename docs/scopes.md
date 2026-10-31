# Scopes

A scope is one small, independent record with its own rules. It holds a
journal of entries, the items those entries fold into, and one definition
that says which changes are allowed. Two scopes share no storage and no
transaction.

After the package list, seven sections follow the contract package,
`packages/contract/src`, one file or pair of files each. The last four
sections describe what the runtime does with those types: how a change
takes effect, how scopes compose, how a journal is replayed, and the client
handle.
[Ten terms](manual/ten-terms.md) defines the vocabulary, and
[Life of an act](manual/life-of-an-act.md) follows one act through these
parts.

## Packages

Twelve packages live under `packages/`. A thirteenth, `@generalbusiness/dap-lanes`,
lives in `apps/room/lanes` and holds the two lane definitions as data
([lanes.md](../apps/room/docs/lanes.md)). No package under `packages/`
imports it.

| Package | Holds | Imports from other packages |
|---|---|---|
| `@generalbusiness/dap-contract` | Types and constant tables. No logic. | Nothing |
| `@generalbusiness/dap-bytes` | Canonical JSON, SHA-256, SHA-1 for Git object names, encodings, Ed25519, the byte domains, and the guard of each identifier. | contract |
| `@generalbusiness/dap-derive` | The definition validator, the fold, the judges, the rule evaluator and the capability code. Pure functions. | contract, bytes |
| `@generalbusiness/dap-package-graph` | Readers and bounded checks for application package composition. | contract, derive |
| `@generalbusiness/dap-platform` | The platform definitions as data and rules, every shipped version of each, and the application package codecs and validation. | contract, bytes, derive, git, package-graph |
| `@generalbusiness/dap-git` | The Git object reader, commands, push evidence, token gateway and snapshot builder, with Web API modules for smart HTTP and GitHub App requests. It runs outside a scope's commit. | contract, bytes |
| `@generalbusiness/dap-checkers` | The pure parts of the checker service: its read of a job before a run, its record of at most one run for a job, the runner's checkout and gateway rule, and the signer. Runner, storage and Worker are ports with no adapter. | contract, bytes, git, platform |
| `@generalbusiness/dap-scope` | The runtime of a scope on a Cloudflare Durable Object with SQLite storage, the Worker's routes, and opt-in wiring for two Git hosts, Cloudflare Artifacts and GitHub ([hosts.md](hosts.md)). | contract, bytes, derive, platform, git, client, mcp |
| `@generalbusiness/dap-replay` | An independent check of a journal, its report, and the command `artroom-replay`. | contract, bytes, derive. The Node command also imports platform and git. |
| `@generalbusiness/dap-client` | Building and signing an intent, and a typed handle on one scope. | contract, bytes, platform |
| `@generalbusiness/dap-mcp` | The MCP service: generic tools, one tool for each act a room declares, custody of signed intents, and the stdio and loopback HTTP transports ([mcp.md](mcp.md)). | contract, bytes, derive, client, git, platform |
| `@generalbusiness/dap-cli` | The `dap` command ([cli.md](cli.md)). | contract, bytes, derive, client, mcp, platform, replay, scope |

The runtime (`scope`) and the verifier (`replay`) judge and fold with the
same `derive` functions. The verifier's portable core imports nothing else
of the runtime's. The package guides describe each package's parts.

## Identity and incarnation

`packages/contract/src/scope.ts` holds the identifiers, the seed and the
four reference classes.

A scope has a **kind** (`ScopeKind`): `register`, `directory`,
`membership`, `rules`, `destination`, `inbox`, `task`, `lane` or `commons`. The
runtime treats every kind alike.

A scope's ID (`ScopeId`) is the digest of its **seed** (`Seed`). The seed
holds the scope's kind, its definition, the scope that created it, the one
input that caused it, and an ordinal. So the ID is known before the scope
exists, and two requests to create the same scope name the same scope.

An ID does not say which life of the scope is meant. When a scope writes
its first entry, it mints a random **incarnation** (`Incarnation`). A
reference to a scope (`ScopeRef`) is the ID, the incarnation and the kind
together. A scope refuses a message or an act addressed to another
incarnation.

Each of the four reference classes says one thing:

| Reference | Type | Says |
|---|---|---|
| Identity | `ScopeRef` | This scope, this incarnation. Nothing about its state. |
| Fact | `FactRef` | One sealed entry: the scope, the position `seq` and the entry's hash. |
| Grant | `Grant` | Permission that a fact in an authority scope issued. |
| Commitment | `Commitment` | One operation that its issuer has promised to complete. |

A position, `seq`, means something only inside its own scope. Across
scopes, a whole fact reference names an entry.

A definition the platform supplies in code has a name and a version
(`PlatformDefinition`), such as `platform:destination@2`. The names are
`register`, `directory`, `directory-partition`, `membership`, `rules`,
`destination`, `inbox`, `task` and `commons`. The platform package supplies eight of
them. It does not supply `platform:task`. A change to a platform
definition's data or rules makes a new version, and a shipped version does
not change. The catalog (`VERSIONS`, in
`packages/platform/src/native-catalog.ts`) holds 85 versions, and
`platform(name)` resolves any of them. A scope pins its version in its seed,
and that version judges and replays it for as long as it exists. Replay needs
the code of those versions: see
[K1 on the kernel page](kernel.md#k1).

A rule that must state its own version, such as the owner of an operation
that it opens or the definition of a scope that it creates, reads it from
the scope's genesis. So a room's versions follow from its register. `dap
install` creates a register at the newest version, and `dap claim` creates
the room at the versions that the register creates. Both commands print the
versions.

Every digest and signature is over a domain tag, a newline and the
canonical JSON of one value. The eight tags are in `DOMAINS`, in
`packages/contract/src/intent.ts`. They include `artroom-text-1` for
detached texts and `artroom-snapshot-1` for snapshots of staged refs.
Sessions have their own tags, `SESSION_DOMAINS`, in `session.ts`. No value
contains its own digest: an entry has no field for its own hash.

`@generalbusiness/dap-bytes` has the one implementation of each:
`canonicalize` and `parseStrict`. `scopeIdOf`, `entryHash`, `intentDigest`,
`definitionDigest`, `textDigest` and the other digests. `signIntent` and
`verifySignedIntent`. The guards `isDigest`, `isScopeId`, `isIncarnation`,
`isKeyId`, `isMemberId`, `isOutboxId`, `isOperationId`,
`isPlatformDefinition` and `isScopeKind`.

## Entries and inputs

`packages/contract/src/entry.ts` and `packages/contract/src/floor.ts` hold
what a scope records.

An actor changes a scope by signing an **intent** (`Intent`, in
`intent.ts`). The intent names the scope, the act's kind, the item it is
on, the revision it expects each named item to have, its fields, an
idempotency key, and a time, `notAfter`. After `notAfter` the intent can no
longer take effect.

An entry (`Entry`) records exactly one input and what followed from it:

| Field | Holds |
|---|---|
| `at`, `seq`, `prev` | The scope, the position, and the hash of the entry before. |
| `time`, `clamped` | The commit's clock reading, and whether the clock was behind. |
| `input` | The one input. |
| `uses` | Each entry of another scope that the scope read to judge the input, by fact and content digest. |
| `prepared` | Each rule that the scope evaluated: its name, the digest of its input, and its result. |
| `effects` | The changes to items, derived from the input. |
| `sends` | The messages to other scopes, derived from the input. |

There are nine inputs (`Input`):

| Input | What it is |
|---|---|
| `genesis` | The first entry. It records the seed, the kind of its genesis act, and a `found` intent or a creation request. |
| `act` | An intent that an actor signed, with the grant it was judged under and the facts presented beside it. |
| `delivery` | A message from another scope: a request, a result, a control or an advisory. |
| `timed` | A deadline that an item held and that has passed. |
| `diagnosis` | The scope's finding that a request it sent could not be delivered. |
| `preparation` | A request for one step of a capability (`PreparationInput`): the signed intent that the step prepares for, the one grant judged, the capability and the step. Its entry holds what the step's code derives: records, and the operations that it opens outside the service. |
| `outcome` | The result of an attempt to write outside the service, for an operation that a preparation entry opened. |
| `checkpoint` | The digest of the whole folded state through a position. |
| `floor` | A new floor for the journal (`FloorInput`): the position below which the scope no longer holds entries, the archive receipt that covers them, and the positions below the floor to keep. |

An `act`, an `outcome`, and a `delivery` whose message is a result may also
hold `observed`: the observations that the judgment read before the turn.

A preparation input is not the evaluation of rules before a commit. In
every turn, the runtime evaluates the `rule` guards that an input meets,
over a snapshot, before the commit. That evaluation writes no entry of its
own. Its results are the list `prepared` of the entry that the input then
writes. A preparation input is a separate input. A caller asks for it by
name, `judgePreparation` judges it in its own commit, and it writes its own
entry, which may open operations whose outcomes are later entries. The
production ports hold the code of the steps. A scope with only the
production defaults reads no grant, so it refuses each request for a step.

**The floor.** A floor entry moves the floor forward. `judgeFloor`, in
`packages/derive/src/floor.ts`, refuses a floor that does not advance
(`floor-back`), a receipt that is malformed or differs from the held entry
(`floor-receipt`), a receipt that does not reach the floor
(`floor-ahead`), and a step over 4096 positions (`floor-step`). It refuses
a floor that leaves fewer than 100 entries, or whose last archived entry is
younger than one intent lifetime (`floor-recent`). It also refuses a keep list over 1024 positions
(`floor-keep`) and a kept set over 4096 entries (`floor-kept`). Positions
never change. A read or an answer for a position below the floor and not
kept returns `archived`, with the archive receipt. A scope that never
writes a floor entry holds every entry. The
[journal floor note](../notes/2026-10-20-retained-journal-floor.md) gives
the design.

A **receipt** (`Receipt`) holds the fact of the entry, the definition, the
intent digest, the effects it derived, and an outbox ID for each message it
sent.

## Answers and refusals

`packages/contract/src/result.ts` holds the answers and every reason.

A scope answers a submitted intent in one of five ways (`Answer`):

| Answer | Means | What the caller does |
|---|---|---|
| `accepted` | The act is an entry. The answer carries a receipt. | Keep the receipt. |
| `refused` | The scope refused the act. The answer names a reason and the head it judged at. When the failed guard declares a `reason`, the answer carries it as `name`. When a whole-scope budget is spent, `name` is the budget. | Read the reason and the name. A refusal is a statement about that head only. |
| `unavailable` | The answer does not say whether the act took effect. Timed entries may already exist, or a repeated act that took effect may not have returned its receipt. | Inspect the journal before another change. To recover, send the same signed intent again. |
| `mismatch` | The same actor and idempotency key are on an entry with another intent. | Inspect the recorded intent before another change. |
| `archived` | The act took effect at a position that is now below the journal floor. The answer carries the archive receipt and the fact. | Read the entry from the archive. |

The idempotency key belongs to the first intent that took effect under it,
for the life of the scope. A repeated intent can return the earlier receipt
without a new judgment. A timed drain can run first and return
`unavailable` before that receipt. To recover a lost reply, keep the
original signed intent and inspect the journal. Do not sign a new intent.

The reason types are:

- `RefusalReason`: why the scope refused a judged input. It includes the
  floor refusals, `archived`, `scope-full`, `bad-intent`, `misaddressed`,
  `expired`, `unknown-act`, `bad-field`, `no-item`, `final`,
  `fact-mismatch`, `unauthorized`, `guard-failed`, `late`,
  `capability-refused`, `slot-full`, `type-full`, `entry-too-large`,
  `send-unresolved`, `unknown-message`, `unsupported-definition`,
  `application-revoked` and `bad-input`. The source file comments each one.
- `UnavailableReason`: why the scope did not judge an input. A retry is
  judged again. The reasons are `dependency-unavailable`, `busy`,
  `clock-behind`, `scope-provisional`, `guard-incomplete`,
  `authority-unavailable`, `unavailable` and `rate-limited`.
- `MismatchReason`: `idempotency-mismatch`.
- `ReadRefusal`: why a read gave no value.
- `DeliveryRefusal`, `RoutingRefusal`, `DefinitionRefusal` and
  `CreationConflict`: the refusals of a delivery, of routing, of the
  validator, and of a second creation result.

**Application trust.** A deployed host can refuse a new act with
`application-revoked` when the scope's installed application release is
absent from the current `APPLICATION_TRUST` setting. Missing or malformed
trust also refuses installed releases. The host proves the release from
native creation records, including a declared child's ancestors. It does
not infer a release from a definition digest. Incomplete provenance returns
`unavailable` with `dependency-unavailable`. The host checks trust before
new dependency reads and again before it writes the act. The check writes
no entry and changes no recorded judgment. An actor and idempotency key that
already took effect still recover their receipt or mismatch. Native platform
scopes and proved unpackaged scopes are exempt. Deliveries, timed rules,
outcomes and preparations do not pass this check. Replay uses the recorded
inputs and does not read current trust.

## Definitions

`packages/contract/src/definition.ts` holds every form a definition may
use. A definition is a JSON value. An application writes no guard code. A
scope pins its definition by digest at its genesis, and the definition
never changes.

The subsections follow the order of the types in that file.

### Declared definition

`DeclaredDefinition` has these members:

| Member | Holds |
|---|---|
| `format` | `artroom-definition-1`. |
| `level` | Optional durability level (`DurabilityLevel`): `live`, `recorded` or `sequenced`, version 1. Absent means `recorded`. The runtime supports `recorded` only. |
| `capacity` | Optional capacity rule (`CapacityVersion`). Absent means the scope counts entries only. `{ name: "whole-scope", version: 1 }` counts all five budgets: entries, bytes, items, records and requests. |
| `name` | The name that a `fact` type's `under` compares with. |
| `profile` | The rule-expression profile, by name and version. Required. |
| `capabilities` | The capabilities the definition uses, by name and version. Required, and may be empty. |
| `genesis` | The act kind that opens the scope. |
| `items` | Item types, at most 16. |
| `acts` | What an actor may sign, at most 64. |
| `receives` | Handlers: what a message from another scope does, at most 24. |
| `timed` | Timed rules, at most 8. |
| `rules` | Named rule expressions that a `rule` guard evaluates, at most 16. |

Here is part of a lane that the tests use
(`packages/derive/test/definition-corpus/fixture-data.ts`). A commitment is
offered and accepted. The performer of an accepted commitment takes a hold
under it, and the hold ends by time.

```ts
items: {
	hold: {
		many: true, max: 2,
		states: { held: { final: false }, ended: { final: true } }, initial: "held",
		parties: { holder: { fixed: false, required: true, list: false, author: false } },
		refs: { under: { fixed: true, required: true, to: { type: "item", of: "commitment" } } },
		values: {
			until: { fixed: false, required: true, of: { type: "time" } },
			epoch: { fixed: false, required: true, of: { type: "int", min: 1, max: 1000000 } },
		},
	},
},
acts: {
	"take-hold": {
		step: "open", on: "hold", grant: "hold",
		also: { commitment: { item: "commitment", by: "commitment" } },
		fields: { commitment: { type: "item", of: "commitment", required: true } },
		guards: [
			{ of: "also.commitment", state: ["accepted"] },
			{ of: "also.commitment", signer: ["performer"] },
			{ none: { type: "hold", states: ["held"], where: [{ equals: { a: { slot: "under" }, b: { field: "commitment" } } }] } },
		],
		effects: [
			{ ref: { slot: "under", from: { field: "commitment" } } },
			{ value: { slot: "until", from: { time: { plusSeconds: 600 } } } },
			{ hold: { do: "open" } },
		],
		sends: [], attention: [],
	},
},
timed: {
	"hold-end": {
		on: "hold", states: ["held"], deadline: "until",
		effects: [{ hold: { do: "end" } }],
		attention: [{ notify: { slot: "holder", of: "on", when: "after", reason: "hold ended" } }],
	},
},
```

`take-hold` opens a new `hold` item. Its three guards say three things. The
commitment named in the field is `accepted`. The signer is that
commitment's performer. No other hold that is still `held` is under the
same commitment. The effects point the hold at the commitment and set its
end ten minutes after the commit's clock reading. The `hold: open` effect
makes the signer the holder and sets the hold's epoch to 1. Ten minutes
later the timed rule `hold-end` applies. The hold becomes `ended`, which is
final, its epoch rises, and the scope tells its holder. A hold also ends, in
the same entry, when the commitment it is under reaches a final state.

### Timed rules

A timed rule (`TimedRule`) names an item type `on`, the live `states` in
which it applies, and a value slot `deadline` of type `time`. When the
deadline passes, the rule's effects apply to that item. The effects must
take the item out of `states`. The rule may also carry attention forms.

### Field types

A field, a slot or a list element has one type (`FieldType`): `text`,
`int`, `bool`, `time`, `enum`, `member`, `item`, `fact`, `scope`, `digest`,
`commit`, `tree`, `record` or `list`.

- A `text` holds at most 64 KiB. It may carry `detached: true`, described
  below.
- A `fact` type lists the kinds of entry it takes, and the name of the
  definition those entries are under (`under`).
- A `record` has at least one named member, each with a type and whether
  it is required. An `element` operand names a member of a record element
  with a dot, such as `k.item`.
- A `list` has a `max` of at most 64 elements. A list holds no list.

**The kind of an entry.** A `fact` type and a `fact` guard compare an
entry's kind. An act entry has its intent's kind. A delivered `tell` has
its message's name, and a delivered relationship update has its
relationship's name. A timed entry has `timed:` and its rule's name, so the
validator refuses an act kind or a message name that begins `timed:`. A
delivered request that no handler received has no kind. A genesis entry has
the kind that its input records in the member `kind`: the genesis act of
the definition that its scope pins. The scope that writes the genesis sets
it from that definition, and no sender can choose it. Every reader reads
the kind from the entry. So a lane under one definition can name the
genesis of a lane under another, when the type's kinds include that genesis
act and its `under` is that definition's name. The kind and the name are
two checks, and one does not excuse the other. A reader that does not hold
the other definition cannot check the recorded kind itself. It relies on
the other scope's judge, as it does for every member of a fetched entry.

**Detached texts.** With `detached: true`, the intent, the entry and every
effect hold the digest of the text, and the text travels beside the signed
intent. The scope computes the digest, checks the text against the field's
`max`, and keeps the bytes as a retained input of the kind `text`. A text
that is not the one named is refused `bad-field`. A detached text may be a
field or a value slot. A guard, a rule, an `index` send, and a send to a
scope that is not a lane may not read one. The validator refuses that read
as `redactable-read`.

### Item types

An item type (`ItemType`) states:

- `many`, and `max`, the most live items of the type.
- `states`, at most 16, each final or not, and the `initial` state.
- `parties`, at most 8 slots that hold a member or a list of at most 64
  members, each marked `author` or not.
- `refs`, at most 12 reference slots.
- `values`, at most 12 value slots, each with an optional `default`.

Each slot (`SlotRule`) says whether it is `fixed` and whether it is
`required`.

**The hold type.** An item type that a `hold` effect opens is a hold type.
The validator requires its shape: two states, of which one is final, a
`holder`, a fixed reference `under` to a local item, an integer `epoch`,
and one timed rule that ends it. Only a `hold` effect changes the holder,
the epoch or the state. `open` and `renew` take the holder from the signer.
A renewal by the holder moves the end and keeps the epoch. A renewal by
another member raises the epoch. When an entry takes an item to a final
state, every hold under that item ends in the same entry.

### Acts

An act (`ActType`) states:

| Member | Holds |
|---|---|
| `step` | `open` a new item, `transition` an existing one, or `comment`. |
| `on` | The item type of the primary item. |
| `also` | At most 4 other local items. See [Other items](#other-items). |
| `fields` | The fields of the intent, each with a type and whether it is required. |
| `presents` | At most 4 facts presented beside the intent. They are not signed. The scope fetches and checks each as it does a fact field. A `fact` guard and an operand may read it, and the entry records it in its input. |
| `grant` | The action a current grant must cover. Always required. |
| `settles` | What the act settles. See [Settlement forms](#settlement-forms). |
| `guards` | At most 24 as written. |
| `effects` | At most 16. |
| `sends` | At most 8. |
| `attention` | At most 8. |

### Handlers

A handler (`ReceiveType`, the member `receives`) states:

- its class, `tell`, `relate` or `advisory`, and its `message`: a `tell`
  message's name, a relationship's name, or for an advisory `index` or
  `notify`.
- `from`: the kind of scope it receives from, and optionally the
  definition name `under` and a definition digest `pin`.
- `fields`: the message's fields, or for a `relate`, the update's detail.
- `opens`: the item type it opens, if any.
- `copies`, for a `relate` only: the most keys the scope keeps a copy for.
- `also`, `settles`, `guards`, `effects`, `sends` and `attention`, as for an
  act.
- `late`, optional: a time bound, a reason, and an optional `then`
  branch. When the source entry's time plus the bound is before the commit
  time, the delivery is late. With `then`, the handler applies that branch.
  Without it, the scope refuses the delivery `late`, with the reason as its
  name.
- `order`, optional, for a `tell`: `arrival` (the default) or `source`.

A field the handler does not declare, or a value that is not of its type,
refuses the request `bad-field`. A sender whose definition digest differs
from the handler's `pin` is refused `wrong-pin`.

### Other items

An act or handler names its other items in `also` (`AlsoRule`). A name
selects its item by a field (`by`), through a slot of another subject
(`via`), or as the one item of a type that is not `many` (`one`). A name
that selects nothing is unbound. Its guards are not evaluated and its
effects are not applied.

A **subject** (`Subject`) is what a guard or effect is about: `on`, the
primary item, `also.<name>`, another named item, or `scope`.

### Settlement forms

`settles` (`Settles`) says which pending work an act or handler settles. It
has three forms: an item of a subject in stated states, a relationship copy
in stated states, or an item in stated states whose truth-value slot `sets`
is still `false`. The entry that settles the work is written against the
work's reservation. See [Room to settle](#room-to-settle).

### Operands

An operand (`Operand`) is what a guard, an effect or a send reads.

| Operand | Reads | Where |
|---|---|---|
| `{ field }` | A field of the act, or of the message in a handler | Anywhere |
| `{ presented }` | A fact presented beside the intent | An act that declares it |
| `{ slot, of }` | A slot of a subject: `on`, an `also` name, or `each` in a fan-out | Anywhere |
| `{ element }` | The element that an enclosing list form binds | Inside that form |
| `{ item }` | A local reference to a subject's item | Anywhere |
| `{ signer: true }`, `{ intent: true }` | The signer, and the digest of the intent | An act |
| `{ sender: true }` | The scope that sent the message | A handler and a result clause |
| `{ source }` | A part of the verified source entry | A handler |
| `{ update }` | The state, the owner's item or the revision of the update | A `relate` handler |
| `{ result: "reason" }` | The name in a result's reason | A result clause |
| `{ scope: true }`, `{ const }`, `{ none: true }` | This scope's reference, a constant, and nothing | Anywhere |

The validator refuses an operand in a place that does not have it.

**Parts.** A field, a presented fact, a slot or an element that holds a
fact may carry `part` (`Part`), which reads inside the entry that the fact
names. `ref`, `scope` and `seq` come from the reference, and nothing is
fetched. `kind`, `intent`, `on`, `time`, `{ field }`, `{ opened }`,
`{ set }` and `{ carried }` come from the entry's bytes. `{ of, then }`
reads a fact that the entry holds, and then that fact's scope or position.
A part that is not there reads as nothing. It is never an error.

A `{ field }` of this scope's own entry is read by this scope's types. A
`{ field }` of another scope's entry is the value in that entry's bytes,
with no type applied. The reader does not hold the other definition. So
where a sender wrote the `self` mark in a message, a reader in another
scope reads the record `{ "self": true }`, and not the sender's entry.

**Local facts.** A fact that names this scope's own entry is not fetched.
The scope checks it against its own journal and refuses a wrong hash as
`fact-mismatch`. The fact then compares as the entry's position.

**Ranges.** A range (`Range`) is the local items of one type whose present
state is listed, filtered by `where` clauses (`Where`), less the items of
the `except` subjects.

### Guards

A guard (`Guard`) has three results: it holds, it fails, or it is not
completed. A guard that fails refuses the act. A guard that is not
completed, for example because a scan stopped at its work limit, leaves the
act not judged, and the answer is `unavailable` with `guard-incomplete`.

| Guard | Holds when |
|---|---|
| `state` | The subject is in a listed state. |
| `signer` | The signer is in one of the listed party slots of the subject. |
| `notIn` | Neither the signer nor the signer's principal is in any of the listed party slots. |
| `set`, `unset` | A slot of the subject holds a value, or holds none. |
| `equals`, `differs` | Two operands are equal, or are not. |
| `some`, `none`, `count` | A range has some items, none, or a number between `min` and `max`. |
| `every` | Every item that a list names is in a listed state. The list is a field of the act, or else a slot of the subject. |
| `fact` | A field, a presented fact or an element names an entry of the declared kind and definition. |
| `before`, `after` | The commit's clock reading is before, or after, a time slot. |
| `rule` | A named rule expression gives true. |
| `each` | Its nested guards hold for every element of a list. An empty list holds. |
| `has` | Some element meets its `where` clauses and its nested guards. An empty list fails. |
| `anyOf` | Every guard of at least one alternative holds. |
| `distinct` | No two elements have the same key. |
| `sameSet` | The keys of a list are exactly the items of a range. |
| `capability` | A capability's own rule holds. See [Capability forms](#capability-forms). |

Every guard may name its subject with `of`. The default is `on`. A guard
that names a field or a presented fact may carry `ifPresent`. Every guard
may carry `reason`, which names the refusal and changes no judgment. One
act or handler has at most 24 guards as written, at most 96 counting those
nested, and nests them at most 8 deep.

A `rule` guard names an expression in a restricted JSONata profile,
`restricted@1`. The expression can read the act's kind, fields, signer and
subjects, and the fetched entries. It cannot read a clock or anything else.
The ticket fixture has one:
`"signer.member != subjects.on.parties.requester.member"`. The runtime
evaluates a rule before the commit, and the entry records the digest of
what the rule read and its result.

### Effects

An effect (`EffectForm`) changes one slot or the state of one subject.
Effects apply in the order written.

- A **source** (`Source`) is any operand. `null` empties a slot. `"self"`
  fills a reference slot with the entry being written.
  `{ time: { plusSeconds } }` is the commit's clock reading plus a
  constant. A source reads each subject as the effects written before it
  left that subject.
- An effect whose source reads nothing is not applied. So an optional
  field that is absent leaves its slot as it was.
- A **condition** (`Condition`), `if` or `unless`, is a list of guards,
  judged on the state before the entry. With `if`, the effect applies only
  when every guard holds. With `unless`, it applies only when not every
  guard holds.
- Two effects on one slot of one subject are a conflict, unless their
  conditions exclude each other in a form the validator can check.
- `add` and `remove` change a party list, or a list of operands sets it
  whole. `attribute` sets an author list from the attribution history of a
  subject and from further sources (`AuthorSource`), in byte order of
  member identifier.
- Where the validator cannot know a source's type, the commit checks the
  value against the slot and refuses `bad-field`.
- A `hold` effect opens, renews or ends a hold. See
  [Item types](#item-types).
- A `capability` effect runs a capability's own effect.

**Redaction.** A `redact` effect, in an act only, removes the bytes of
every text that its slot has held. The entry lists their digests and is the
tombstone: it says who removed the text, when, and under which grant. The
slot keeps its digest.

### Sends

A send form (`SendForm`) is one of four:

- `create`: create a child scope of a kind, under a definition digest, a
  platform name, or `self`, the creating scope's own definition.
- `tell`: a message to a scope that a slot holds.
- `relate`: a relationship update, to one scope or, with `each`, to the
  scope of each live item of a range.
- `index`: an advisory row for the scope's directory. It has no result.

A field of a message (`SendSource`) is any operand, `"self"`, or a
`collect`, which lists one record for each item of a range. A `tell` or a
`relate` with `if` is made only when its guards hold. One that is not made
takes no ordinal. An `index` row goes to the scope's directory: its
creator, when that is a directory, or the directory that its creator
recorded.

A send's **result clauses** (`ResultClauses`) say what the sender does when
the result arrives: one list of effects for each of `applied`, `refused`,
`superseded` and `undelivered`, and for a creation, `conflict`.

A fan-out covers a type whose `max` is at most 32, and one list of sends
has at most one fan-out. The validator refuses any other as
`fan-out-unbounded`. A result clause of a fan-out send may read `each`
when the update's item is `each`. The range of a fan-out and of a
`collect` reads as a guard's range does: a scan that stops unfinished
leaves the input not judged. A message field that is a detached text
carries the digest. The receiver reads the bytes from the sender before
its turn and checks them.

### Attention

A `notify` form (`Notify`) tells the members that a party slot holds, as
the slot was before the effects or as it is after. The entry records them
in an `attention` effect. A notice may carry `if`, but not in a timed rule.
The attention forms of one act, handler or timed rule can tell at most 64
members. The validator refuses more as `attention-unbounded`.

### Capability forms

A definition may list `hold@1` or `hold@2`, `git-read@1`, and
`device-command@1` (`CapabilityName`, in `capability.ts`). It may then
write a `capability` guard, a `capability` effect, the part
`{ carried }`, and a fact kind such as `hold@1:check`.

Two kinds of entry have such a kind. A preparation entry has the kind of
its capability and step. An outcome entry has the kind of its operation's
owner and kind: `hold@1:check` for the outcome of a check, whatever the
result (`kindOf`, in `packages/derive/src/operand.ts`). So the kind
`hold@1:check` in a `fact` guard matches a check's outcome entry that is
`confirmed`, `refused` or `unknown` alike. A form that needs a completed
check must also read the record that the entry carries, with the part
`{ carried }`, and check it.

The validator checks each form against what the listed version declares,
in the contract package's `CAPABILITIES`. A definition that passes lists
each such form in `ValidDefinition.underived`. The code of each form is in
`packages/derive/src/capability/`, and the production ports hold it
(`CAPABILITY_CODE`). A runtime or a verifier that lacks the code of one
form answers `unsupported-definition` for a definition that uses it. The
item form of either hold version, with its `hold` effect, needs no such
code.

`hold@2` adds head and fork outcome rules, and `hold@1` keeps its recorded
meaning. Workspace, ancestry and reservation readers select the exact
version that the pinned definition names. They do not share records between
versions. A carried version 2 check must be the full authenticated fact of a
confirmed version 2 check outcome. A matching record kind alone carries no
authority. [hosts.md](hosts.md#a-fork-for-a-hold) describes the host
adapter and its limits.

For tests, `@generalbusiness/dap-scope/testing` has `scriptedCapability`, a
stand-in that answers from a table the test supplies, and `net.peers`, for
entries that a test writes by hand in place of a platform scope. A scripted
peer shows only the receiver's side of a delivery.

### Validation

`validateDefinition(definition, bounds)` checks a definition before a
scope pins it. It refuses a form the contract does not define, a name that
resolves to nothing, an opening that leaves a required slot unset, two
effects on one slot, a timed rule whose entry could be too large to write,
and timed rules that lead to one another in a cycle. It also derives what
each pending state reserves, and refuses as `reserve-unbounded` forms that
settle one another's pending states in a cycle. It returns a
`ValidDefinition`, which is all the judges take.
[Definition-author security reference](security/definition-authors.md)
lists the refusal codes and the forms that impose less policy than an
author may expect.

## Bounds

`packages/contract/src/bounds.ts` holds every size and count as a member of
`Bounds`. Code takes a `Bounds` value and never reads a number directly.
`PROPOSED_BOUNDS` is the one set of numbers. Every number is temporary:
measured budgets replace them.

| Group | Members and values |
|---|---|
| Intent | `intentLifetimeSeconds` 900. |
| One definition | `items` 16, `acts` 64, `receives` 24, `timedRules` 8, `rules` 16, `definitionBytes` 256 KiB, `textBytes` 64 KiB, `memberBytes` 256, `listElements` 64, `partyMembers` 64, `states` 16, `parties` 8, `refs` 12, `values` 12, `also` 4, `presents` 4. |
| One act or handler | `guards` 24, `nestedGuards` 96, `guardDepth` 8, `effects` 16, `sends` 8, `fanOut` 32, `attention` 8, `attentionMembers` 64, `sendFields` 32. |
| One range scan | `guardPage` 100, `guardScan` 1000. |
| One entry and turn | `entryBytes` 256 KiB, `usesPerEntry` 128, `sendsPerEntry` 104, `derivedEffects` 256, `decompositionDepth` 4, `deliveryBatch` 64, `fetchSeconds` 10, `preparationSeconds` 10, `turnRestarts` 6, `timedAttemptsPerTurn` 64, `routingRefusals` 3. |
| One scope | `scopeEntries` 100,000, `scopeBytes` 1 GiB, `scopeItems` 100,000, `scopeRecords` 200,000, `scopeRequests` 10,000, `namedDefinitions` 16. |
| Sending | `dispatchSeconds` 30, `dispatchRetrySeconds` 1, `dispatchRetryMaxSeconds` 300, `drainRetrySeconds` 1. |

The five scope budgets are the `SCOPE_BOUNDS`. A definition without
`capacity` is checked against `scopeEntries` only. A definition with the
`whole-scope` capacity is checked against all five. A refusal for a spent
budget is `scope-full`, with the budget's name as `name`.

## Reads and settlement

`packages/contract/src/read.ts` holds the reads and their results.
`packages/contract/src/transport.ts` holds `ScopeApi`, the operations of a
scope service as one interface. The Worker implements it, and a client's
transport is a value of it, so a type check holds both to one declaration.

Every read is bounded and says where it was made. A read (`Read<T>`)
returns a value, the head it was read `at`, whether it is `complete`, and a
cursor `next` when there is more. Or it returns a refusal with a reason,
or `archived` with the archive receipt.

`ScopeApi` has these operations:

| Operation | Does |
|---|---|
| `create` | Creates a scope with no creator, from a signed intent and a definition. It takes the declarations the scope's `create` sends name, and the detached texts. It answers `Created`. |
| `submit` | Submits an act, with grants and what travels beside the intent (`Beside`). It answers `Answer`. |
| `prepare` | Asks for one step of a capability. It answers `Answer`. |
| `settle` | Returns the receipt of the exact signed intent, or `not-found`. It writes nothing. |
| `summary` | The scope's reference, status and definition, its live items, and an exact count for every type and state. |
| `items` | A page of the final items of one type. |
| `queryItems` | One bounded selection page. Only the scope that owns the query decodes it. |
| `applicationProjection` | A declared projection, for a session reader only. |
| `history` | A page of entries, each with its hash. |
| `entry` | One entry. |
| `outbox` | A page of the scope's sends, with the attempts and result of each. |
| `outboxItem` | The outbox row of one send, by its outbox ID. |
| `log` | A page of the journal as stored: each entry's canonical bytes. For a verifier. |
| `retained` | One retained input, by kind and digest: a definition, a foreign entry, a rule's input, a detached text until it is redacted, a snapshot, or a value in its byte domain. |

The Worker serves `ScopeApi` over HTTP through `route`, with the routes in
the [scope package guide](../packages/scope/README.md#routes). Hosted
callers use the in-process `api(binding)`. The application sandbox has a
separate named binding for its screen and native requests.

**Observations and values.** Platform data declares further observations
on acts, outcome kinds and result clauses. The runtime reads those subjects
before the turn. An outcome can name them from its origin's retained
entries, then name a second step from the first step's observations. The
entry retains each observation and named value that a whole row requires.
A row that waits for an observation leaves the input pending when the
observation cannot be read. A named value is stored by its byte domain and
digest, apart from the entry that names it. The retained-input route
accepts `?domain=` for a value, and an act may carry its declared values in
the `values` member beside the signed intent. An outcome's evidence values
come from its outside port, and the scope checks them against the pinned
owner's declarations. No observation or value changes the signed intent.

**Who may read.** A port, `Readers`, decides who may read. In a deployment
that port is a read session: a token that a membership scope issues to a
device key of an active member, for the scopes of one repository, for at
most ten minutes. A scope checks the token under the deployment's session
secret, with no call to membership. A deployment with no secret bound
issues and accepts no session.

A reader with no session may present a signed read: a read of one scope,
signed by a key that signed an entry of that scope, or the entry at the
root of its genesis's cause chain, within the authority window of an
intent. A signed read reads the summary, the genesis, that key's own
entries, and the entries whose cause chain leads within four causes to one
of those. A cause is an outcome's opening act, a delivery's sending entry,
or what created a child. It also reads the retained inputs that those
entries carry. A quoted digest in unrelated text is not provenance for an
input. A filtered journal covers only the entries it supplies. So the
operator key that signed `install` reads the register, and a creator's key
reads the register's record of its claim, the directory and its three
children, before it holds a session.

A recent local register signer reads the register's whole journal and typed
retained inputs. An authenticated session of a membership scope that one of
the register's claims created also reads that whole journal and its typed
retained inputs, without the signed-entry window. It gains no register
summary or items permission, and no access to another directory's
journal. A reader with neither a session nor a signed read reads nothing.
The [scope package guide](../packages/scope/README.md#read-sessions) says
what a session binds, how it ends, and the form of a signed read.

Membership retains at most 64 answered session requests per key, each until
its signed `notAfter`, which is at most 900 seconds ahead of membership's
clock. At that limit the HTTP route returns 429 with the `rate-limited`
answer and an advisory `Retry-After` header. The header's delay comes from
that key's earliest retained request deadline, on the same clock reading.
This limit is separate from the session's ten-minute lifetime. Waiting does
not guarantee that a later request succeeds, because membership checks
standing again.

A read token, minted by a `read-token` act, is answered once by its
credential route. Only an authorized session of the key that signed the
`read-token` act receives it, and only before the token's end. After that
answer, the token leaves private custody. Every other read of it is
forbidden.

## Reports

`packages/contract/src/report.ts` holds what a verifier reports. A report
(`Report`) states:

| Member | Holds |
|---|---|
| `mode` | `integrity` or `replay`. |
| `target` | The head it verified through. |
| `coverage` | Which entries of which scopes it checked, from and through. |
| `anchors` | The heads it took on trust. |
| `dependencies` | How many foreign entries it verified and anchored, and which were missing. |
| `trusts` | What it took on someone's word, such as the service clock. |
| `redacted` | Each text a tombstone removed, which it did not derive again: the tombstone and the slot. |
| `omittedTexts` | Text byte counts it took on the caller's word. |
| `incompleteBytes` | Spans where the whole-scope byte check lacked text sizes. The other budgets are checked through those spans. |
| `result` | One of the five results below. |
| `at` | The entry a mismatch names. |
| `name` | For six named mismatches, the name (`MismatchName`): `genesis-kind`, `genesis-timed`, `observation-older`, `run-returned`, `observation-not-moved` or `observation-reused`. |

| Result | Means |
|---|---|
| `consistent` | Everything the mode checks holds, for the coverage and trusts stated. |
| `mismatch` | An entry is not what its bytes, its chain, its signature or its replay say. The report names the entry. |
| `missing-dependency` | A journal that an entry used cannot be read, and no anchor names the entry. |
| `incomplete` | A retained input is missing, or a limit was reached. A detached text that is gone with no tombstone is a missing input. The report claims nothing beyond its coverage. |
| `unsupported-definition` | The scope pins a definition this replay has no code for. That is a platform definition whose data and rules the caller did not give, or a declared definition that needs a capability's code the caller did not give. With the rules of a platform definition, the report lists `platform-code` under `trusts`, with the name and the version. |

"Consistent" is always for a stated mode, target, coverage and set of
trusts. It is not "verified". A replay trusts, among other things, the
service's clock, that each read of membership behind a recorded grant was
made as recorded, and, when the caller gives no known head, the service's
word for where the journal ends. Replay derives the grant itself again,
from the observation that the entry retains and from the membership
scope's journal. A grant with no such observation is no grant, and the
command reports its entry as a mismatch. Give a head from a receipt you
kept, and a journal that is shorter or different is a mismatch.

## How a change takes effect

A scope processes one input at a time. Each is a **turn**:

1. Before the turn, the runtime fetches each foreign entry the input names
   and checks it against its hash. That covers the facts in its fields and
   the facts presented beside it. It checks each detached text against the
   digest that names it.
2. **The drain.** The runtime applies every deadline that has passed, each
   as its own `timed` entry, in a fixed order: earliest deadline, then
   lowest item ID, then rule name. No other input may pass a due deadline.
3. The runtime notes the head.
4. The runtime evaluates the rule expressions the input uses, outside the
   commit.
5. **The commit**, in one storage transaction. The runtime reads the clock
   once and checks the head again. It judges the input, seals and hashes
   the entry, and writes its row, its sends and its retained inputs. Then
   it folds the entry into the items.

If another input committed between steps 3 and 5, the runtime writes
nothing and starts the turn again. A turn has a bounded number of timed
entries and of restarts. When a bound is spent, the turn ends
`unavailable` with the reason `busy`, and an alarm continues the drain.

**The clock.** Each commit reads the clock once. If the reading is earlier
than the last entry's time, the clock is **behind**. An entry that judges a
time, such as an act or a timed entry, is then not written, and the answer
is `unavailable` with the reason `clock-behind`. An entry that judges no
time is written with the previous entry's time and `clamped: true`.

### Room to settle

A scope has budgets. Some entries create pending work that needs a later
entry: a deadline needs its timed entry, a request needs its result, and an
item in a state that an act or handler declares with `settles` needs that
act's or handler's entry. Before the scope keeps an entry that is new work,
it counts what its pending work still needs, plus one entry for a closing
checkpoint. If that does not fit, the scope writes nothing and refuses an
act `scope-full`. So the scope can always record the end of a task that
took effect.

An entry that takes an item or a copy out of the states its form's
`settles` lists is a settling entry. The scope writes it against that
work's reservation and does not ask whether it fits. Every other entry of
the same form is new work, and so is every refusal. `owed` and `fits`, in
`packages/derive/src/reserve.ts`, count entries. `capacityFull` compares
use and pending work in all five budgets for a `whole-scope` definition.

The judging is not in the runtime. `judgeAct`, `judgeGenesis`,
`judgeDelivery`, `judgeTimed`, `judgeDiagnosis`, `judgePreparation`,
`judgeOutcome`, `judgeCheckpoint` and `judgeFloor` are pure functions of
`derive`, one for each input. Each takes the folded state, one input, its
retained inputs and one clock reading, and returns the entry that the input
writes or the answer it gets. `applyEntry` is the only code that changes
state. The runtime calls these functions inside the commit, and a verifier
calls the same functions.

## Composition and delivery

<a id="composition"></a>

Scopes work together by messages. A message is a **send** of an entry. The
scope writes it in the same transaction as the entry, so a message exists
if and only if its entry does.

There are four classes of message (`Message`, in `entry.ts`):

| Class | Types | Has a result |
|---|---|---|
| Request | `create`, `tell`, `relate` | Yes, exactly one |
| Result | The answer to a request: `applied`, `refused` or `superseded` | No |
| Control | `confirm` | No |
| Advisory | `index`, `notify` | No |

**Creating a child.** A scope creates another with a `create` send. The
send is addressed by the child's seed, so the child's ID is fixed before it
exists. The child reads its definition's bytes from its creator, checks
their digest, and writes its genesis. It is then **provisional**: it
accepts nothing but a repeat of its creation. Its genesis sends the result
back. The creator records that result and sends a `confirm`. When the
child records the confirmation, it is **active**. If the child's genesis
act is refused, the genesis is still written, the result is `refused`, and
the child is terminal.

**Scopes with no creator.** Under a version of `platform:register`, an
`install` intent creates a register. Under any other definition, a `found`
intent creates a directory with no creator. Every other scope has a
creator. A register's creation of a repository creates its directory, and
the directory creates membership, the rules scope and the destination.
[Deploy the scope Worker](deploy.md) describes which creations with no
creator a deployment accepts.

**Relationship updates.** With a `relate` send, the scope that owns a
relationship tells another scope its state. The receiver keeps a copy,
keyed by the owner, the owner's item and a name. The copy's revision is the
position of the owner's entry. An update applies only if it is newer than
the copy. An older one is answered `superseded`. So the two arrival orders
end the same. The receiver's definition declares a handler for the
relationship, by its name, and says how many keys it keeps a copy for. An
update for one key more is refused `type-full`, and an update of a
relationship with no handler is refused `unknown-message`. Neither keeps a
copy.

**Delivery.** Each scope has a dispatcher. It records each attempt before
it dispatches and the answer after, retries with a growing delay, and an
alarm restarts it. The receiver trusts nothing in a delivery. It reads the
source entry from the source scope, checks its hash, and checks that the
entry holds that send, to that address, with that message. Only then does
the receiver judge the delivery, in its own turn. A delivery that arrives
twice gets the entry that recorded it the first time.

**Order.** A delivery takes effect at the position the receiver's commit
gives it, not at the sender's. Deliveries from different senders have no
order: two sends that leave two scopes in one order may take effect in the
other. By default, deliveries from one sender have no order either. A
`tell` handler may declare `order: "source"`. The receiver then suppresses
a delivery whose (source entry position, send ordinal) pair is lower than
a pair that already applied. It keeps the highest pair for each sender
incarnation and handler. An older delivery that arrives first still
applies, and the newer one applies after it. So source order suppresses
late arrivals. It does not guarantee a latest value or detect a missing
delivery. A suppressed delivery still spends the decision that a numbered
native receiver reserved for it, and suppression grants no license. A native item-bound handler cannot declare
source order. Every decision whose result depends on the order of two
scopes' acts belongs to one scope, where its journal is the order. The
[sequenced level](../notes/2026-10-18-sequenced-level-and-order-scope.md)
design note adds a level for scopes that need a shared order.

**Diagnoses.** When a request cannot be delivered, the sender stops and
writes a `diagnosis` entry with its attempt log. There are two findings.
With `undelivered`, routing refused every attempt, so the target does not
exist under that name and incarnation. The `undelivered` clause runs, and
the request is settled. With `delivery-unavailable`, something else
happened. No clause runs, the request stays pending, and the scope still
records a late result. A lost answer is never read as proof.

In production the scope namespace is the resolver, the transport, the
source of declarations, and the source of the texts that travel beside a
message (`namespace`, in `packages/scope`). There is no registry.

## Replay

`@generalbusiness/dap-replay` checks a journal without running the runtime.
`verify(source, options)` reads a scope's stored bytes through a
`HistorySource` and returns a [report](#reports). There are two modes.

- **Integrity** checks the chain, each entry's bytes and hash, that the
  scope ID is the digest of the genesis's seed, and the actors'
  signatures. It derives no judgment.
- **Replay** also folds the journal from its genesis and derives every
  entry again with the judges of `derive`, from the recorded input, the
  retained inputs and the recorded time. It compares the result with the
  entry, byte for byte. It checks that the kind the genesis records is the
  genesis act of the pinned definition, and reports a difference as the
  mismatch `genesis-kind`. It evaluates each rule again from its retained
  input. For each foreign entry that was used, it replays that scope up to
  that entry, or takes an **anchor** that the caller supplies.

Everything a source returns is untrusted. The verifier limits the bytes,
entries and scopes it takes in, and the time one read may take.

```
artroom-replay <service URL> <scope ID> [options]
artroom-replay --git <clone> [<scope ID>] [--texts <directory>] [--receipt <file>] [options]
artroom-replay --git <clone> --all [--expect-journals 5] [--trust-published-anchors] [--json]
artroom-replay --git <clone> --check-secrets [--json]
options: [--mode integrity|replay] [--head <seq>:<hash>] [--anchor <scope>:<seq>:<hash>]... [--json]
```

The first form reads a scope service. The `--git` forms read an archive
clone: one journal, every journal with `--all`, or a scan for recognized
secrets with `--check-secrets`. The command exits 0 for consistent, 1 for
any other result, and 2 when it did not understand the command or could
not read the target.

## The client handle

`@generalbusiness/dap-client` is what an application or an agent uses.

```ts
import { ScopeHandle, httpTransport, signedIntent, webCryptoSigner } from "@generalbusiness/dap-client";

const signer = await webCryptoSigner();
const scope = new ScopeHandle(httpTransport("https://scopes.example"), scopeId, reader);

const signed = await signedIntent(signer, { to: at, kind: "remark", on: 0, fields: { text: "a remark" } });
const answer = await scope.submit(signed, grants);   // a third argument carries what travels beside the intent
if (answer.answer === "accepted") await scope.followReceipt(answer.receipt);
```

- `signedIntent` builds an intent with a fresh idempotency key and a
  `notAfter` inside the lifetime bound, and signs it. A `Signer` gives out
  a key ID and signatures, never a private key. The value returned is the
  value signed. Keep it, and retry with it.
- `ScopeHandle` has `submit`, `settle`, the reads, `definition`, `text`,
  `followReceipt` and `followOutbox`. `submit` takes, as one more
  argument, what travels beside the intent: the detached texts, the
  declared named values and the presented facts.
- `create` sends a `found` intent, which creates a directory, or, under a
  version of `platform:register`, an `install` intent, which creates a
  register. It returns the answer and, when accepted, a handle.
- `declaredHandle(scope, definition)` gives a handle typed from a declared
  definition. It answers one only when the scope pins the digest of the
  value given. Its `intent` checks each field against its declared type
  before it signs, and gives a detached text's digest to the intent and the
  text to send beside it. It checks no guard.
- A **transport** is the contract's `ScopeApi`. `httpTransport` uses the
  HTTP routes, and `bindingTransport` uses a service binding. Each returns
  a reply only when it is an answer of its operation, with every fixed
  record in it as the contract defines it. Over HTTP, the client reads a
  reply up to 4 MiB and for at most 30 seconds. Both values are temporary.
  A lost, malformed, oversized or late reply is a `TransportError`. The
  outcome is unknown, so submit the same signed intent again.
- `followReceipt` reads the entry a receipt names, checks it against the
  whole fact, and computes the hash itself.

The client derives no judgment. It learns what it may do by reading the
scope's summary and its published definition.

## Source

Checked against main `c8c7b631` on 30 October 2026. Sources: [contract](../packages/contract/src/), [scope.ts](../packages/contract/src/scope.ts), [entry.ts](../packages/contract/src/entry.ts), [floor.ts](../packages/contract/src/floor.ts), [result.ts](../packages/contract/src/result.ts), [definition.ts](../packages/contract/src/definition.ts), [bounds.ts](../packages/contract/src/bounds.ts), [read.ts](../packages/contract/src/read.ts), [transport.ts](../packages/contract/src/transport.ts), [report.ts](../packages/contract/src/report.ts), [reserve.ts](../packages/derive/src/reserve.ts), [native-catalog.ts](../packages/platform/src/native-catalog.ts), [sessions.ts](../packages/scope/src/sessions.ts), [replay cli.ts](../packages/replay/src/cli.ts), [client http.ts](../packages/client/src/http.ts).

The commands on this page were not run for this revision.
