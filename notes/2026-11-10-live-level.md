# The live level: a first version

Status: current. Draft 2, for request `bf1992ae`. Nothing here is built.

A scope's definition declares one durability level: live, recorded or
sequenced. Recorded is built. The sequenced level has its design in the
[sequenced note](2026-10-18-sequenced-level-and-order-scope.md). The live
level had only a sketch, section 16 of the
[volatile acts note](2026-10-09-shared-language-volatile-acts.md), with
seven open points. Hugh placed both levels in the stable base on 10
November 2026 (order `fc7576f8`). This note designs the live level and
cuts its first version. It decides three things.

1. **A live scope is an ordinary scope that stops writing after its
   creation.** Its journal holds its genesis entry and its creator's
   confirmation, and no entry after them. Everything that a live act
   changes is held in memory, and it can vanish at any time.
2. **Its reference is the reference of any scope.** The sketch gave a
   live scope no genesis, a reference of its own and a locator into a
   host. All three are withdrawn. Identifiers head (c+d) changes
   nothing for this level (section 5).
3. **The code that runs live acts is a platform service.** The kernel
   knows two things about the level: the validator admits it, and the
   fold refuses an entry after a live scope's creation (section 4).

Where this note and section 16 of the volatile acts note differ, this
note governs. Section 6 lists each point. Source facts name a file and a
symbol at main `7177b87b`.

## 1. What asks for the level

The catalogue asks for state that many viewers see at once and that
nobody needs afterwards.

| Use | What it needs | Source |
|---|---|---|
| Presence: who is here, what they look at, a short status | The latest value for each member, renewed every few seconds, gone when the member leaves | [Members and presence](2026-10-18-member-and-presence-ui.md), B4. `docs/use-cases.md`, cases 36 and 44 |
| Practice with no record: a counting round that nobody keeps | The same turn rule as the kept session, with no entry | `docs/use-cases.md`, case 44. `docs/roadmap.md`, "Durability levels" |
| Drafts, guesses and chatter | A value that its author changes often and may drop | `docs/use-cases.md`, cases 34, 36 and 43, and "Live work keeps no record" |

Each use needs three things: a write that the room's rules judge, a
change that reaches every viewer, and no trace. No use asks to replay
live state or to cite it. Where a case needs a fact that lasts, it asks
for a recorded act.

Two things that look like live state are not. A view that updates when a
recorded scope changes is a watch on a record, and the head stream
serves it today (`Streams` in `packages/scope/src/sessions.ts`). The
grow example's presence is recorded, with arrive and leave times
(`examples/grow/presence.ts`).

## 2. The guarantee

A live scope keeps its creation and nothing else.

| | A recorded scope | A live scope |
|---|---|---|
| Journal | Every entry | The genesis entry and the creator's confirmation |
| State | The fold of the journal | The fold of the genesis, then what live acts changed, in memory |
| Answer to an act | `accepted`, with a receipt | `applied`, with no receipt |
| After a restart | The same state | The fold of the genesis |
| Cited as a fact | Yes | The two creation entries only |

**Applied** means that the act changed live state in generation G at
tick N. It says nothing about whether that state still exists.
**Reset** means that the generation a caller names is gone. The caller
reads again and starts from what it finds. An act whose answer was lost
may have applied.

A **generation** is one life of the scope's object in memory. The object
mints a random generation value when it starts. No order between two
generations is promised.

A **tick** is the scope's counter inside one generation. It starts at
the sequence of the journal's head, and each applied input adds one
(3.3). The word is new. The volatile acts note calls this counter a
revision (its section 6), but `Item.revision` in
`packages/contract/src/read.ts` already has that name for the counter
of one item, and a live item keeps it.

| Word | What it counts | Where it appears |
|---|---|---|
| Revision | The changes of one item | `Item.revision`, the `expected` of an act, and the refusal `revision-moved` |
| Tick | The inputs applied to the scope in one generation | `LiveAnswer.tick`, every read of live state, the watch, and the ID of a live item |

## 3. A live scope

### 3.1 Creation and reference

A scope with a live definition is created as any child scope is. A
package root sends `create`, the child seals its genesis and sends its
result, and the creator's confirmation activates it (`confirmation` in
`packages/derive/src/delivery.ts`). The root's seed names the kind
`lane`, as the platform's seed does for an application
(`create-application` in `packages/platform/src/application.ts`).
Creation lineage, the scope index and routing admit the scope as they
admit any lane (`admitChildCreation` in
`packages/scope/src/creation-lineage.ts`). The level does not rest on
the kind. The level that the definition pins selects the live turn.

So a live scope has a genesis digest, and its reference is the
`SequenceRef` of the identifiers note, as for every scope. Its journal
is a sequence of two entries. Replay verifies those two entries and
their lineage like any others.

The genesis act of a live definition may open items. Those items are the
state of every new generation, so a reset returns the scope to a state
that its definition names.

The sketch gave a live scope no genesis, because "the live side cannot
record" a creation. That costs more than it saves:

- The identifiers note names a sequence by its genesis digest. A scope
  with no genesis needs a second kind of reference, in every signed
  intent and every send.
- Production routing refuses a scope ID that the scope index does not
  hold, and the index holds scopes with an applied genesis
  (`packages/scope/src/scope-index.ts`).
- The sketch had to prove that a live scope is legitimate at each start,
  by a read of an entry in a host scope. A genesis is that proof, held
  by the scope itself and checked once by lineage.

The cost of the genesis is two stored entries for each live scope.

### 3.2 The definition

A live definition is an `artroom-definition-1` declaration with
`level: { name: "live", version: 1 }`. It uses the grammar of a recorded
definition: item types, states, acts, guards, effects, rule expressions
and timed rules. A definition that uses none of the forms below
validates at either level, so one turn rule can run as live practice or
as a kept session, in two scopes.

A platform declaration cannot be live in version 1.

The validator refuses these forms in a live definition, because each
one promises something that outlasts memory or that another scope rests
on:

- every handler (`receives`), and every send but the creation result
  that a genesis always sends.
- every capability, hold and preparation.
- `presents`, and every field and operand of type `fact`.
- attention that notifies another scope.

The sketch's own forms wait: session-owned items, content addresses and
live item references (section 7).

### 3.3 The turn of a live act

A live act is an ordinary signed intent, in the intent domain that
recorded acts use, addressed to the live scope's reference. The scope
judges it as a recorded scope does: the signature, `notAfter` against
the clock, the grant read from the membership scope, the `expected`
revision of each item, then the guards and the effects, with the
functions of
`derive`. The request that carries the intent also names the generation
that its sender last read. Another generation is answered `reset`, and
nothing is judged.

The scope then applies the effects to its state in memory. It writes no
entry and nothing to storage.

**The tick takes the place of the sequence.** In each generation the
tick starts at the sequence of the journal's head, and each applied
input adds one. An applied act that opens an item gives it that tick as
its ID, as a recorded entry gives its sequence. So the IDs of live
items never collide with the items that the genesis opened, and they
repeat from one generation to the next. A reference to a live item names
the generation. Each item keeps its own revision, which an act's
`expected` names, as in a recorded scope.

**A repeat.** The index of accepted intents is in memory. A repeat of an
applied intent in the same generation is answered `applied` with the
same tick. After a reset, a repeat inside the intent's lifetime can
apply again. An application that cannot accept that uses a recorded
scope.

A refused act changes nothing, as in a recorded scope.

### 3.4 Answers

A live act has four answers.

```ts
type LiveAnswer =
  | { answer: "applied"; generation: string; tick: number }
  | { answer: "refused"; reason: RefusalReason; name?: string; generation: string; tick: number }
  | { answer: "reset"; generation: string }          // the current generation
  | { answer: "unavailable"; reason: UnavailableReason };
```

`applied` carries no receipt, no hash and no `FactRef`. Its tick is the
ID of an item that the act opened. A refusal names the generation and
the tick that judged it, where a recorded refusal names a head. The
reasons are the reasons of the recorded contract.

The answer `applied` is not the clause `applied` of a send's result
(`OutboxItem.result` in `packages/contract/src/read.ts`). The creator's
confirmation of a live scope carries that clause, as the confirmation
of every created scope does. The two words are members of different
types, and neither is renamed.

These shapes, the live reads and the live calls are one interface of
their own in a platform package. The kernel's `Answer`, `Read` and
`ScopeApi` (`packages/contract/src`) do not change.

### 3.5 Reads and the watch

A live scope answers two families of read, and they never mix.

- **Reads of the record** are the reads of any scope. They answer the
  two creation entries and the fold of the genesis, at the journal's
  head. To these reads a live scope is a sequence of two entries
  (section 5).
- **Reads of live state** answer the scope's summary and its items in
  memory. Each answer names the generation and the tick that it
  shows. A read session authorizes them, as it authorizes the reads of
  the record.

**The watch** sends one line when the live state changes: the
generation and the tick. A viewer that receives it reads the items
again. While a line waits unread, later changes send nothing more, so a
slow viewer sees the latest state and not every step. A new generation
sends a line too. The head stream works this way today for a recorded
head, with at most 64 streams for each scope and a session check before
each send (`Streams` in `sessions.ts`).

### 3.6 Timed rules

A timed rule of a live definition runs from memory. A presence lease is
one: an item with a deadline, and a rule that removes it when the
deadline passes. A timed rule that applies adds one to the tick. A
reset drops every pending deadline with the state that held it.

### 3.7 Reset

The object's memory ends when the host stops the object: a deployment,
an eviction, an idle period or a fault. The next start mints a new
generation from the fold of the genesis. Nothing recovers the old state,
and no entry says that it existed.

A host stops an idle object. So a quiet room's live scope is often a new
generation with nobody present, which is what presence means. A draft
that its author leaves for an hour may be gone. The level promises
nothing else, and an application that needs more records the value.

### 3.8 What a live scope cannot do

- It sends nothing and admits no delivery after its confirmation. The
  package check refuses a send whose target is a live scope.
- No fact names its live state. A `fact` field that names a live scope
  can name only one of its two creation entries.
- It is not archived. Its creator's journal holds its creation, and
  nothing rests on the rest.
- It is not a member of a group. A sequenced scope keeps its journal.
- A recorded scope's guard never reads it. A view may show a recorded
  scope and a live scope side by side, as two reads.
- **To keep a live value, a person or an agent signs a recorded act that
  carries it.** That act is new, and it is judged in its own scope like
  any other. Nothing moves from live state to a record by itself.

## 4. The kernel review

Section 7 of `docs/kernel.md` admits nothing to the kernel without a
review that says why the part cannot be a platform service or an
application. This section is that statement, and the checker's review of
this note's head is the review.

### 4.1 What is kernel, and what is a service

The kernel is "the code that gives a recorded entry its meaning". A live
act gives no recorded entry a meaning, because it writes none. The test
of the kernel page asks whether a part can be replaced with no change to
`contract` and `derive` and no change to the meaning of any recorded
entry. The code that runs live acts passes: another host can run them in
another way, and every entry means what it meant.

So the level divides in two.

| Part | Class | Why |
|---|---|---|
| The validator admits `live` version 1 and refuses the forms of 3.2 | Kernel | A definition pinned in a scope is validated by kernel code (kernel page, 7.2) |
| The fold refuses any entry after the confirmation of a live scope | Kernel | The runtime and replay must agree that such a journal is wrong |
| The live turn, the generation, the answers, the live reads, the watch and the bounds | Platform service: the runtime host | No recorded entry depends on them |
| Replay accepts the two creation entries of a live scope, and reports a later entry as a `mismatch` | Platform service: the verifier | It calls the fold |

The live turn calls the judges of `derive`, so a live run and a recorded
run of one definition reach the same items and states. If a judge needs
a change to run with no sealed entry, that change is kernel, and the
head that makes it says so.

**What an application author gives up.** No verifier can check that a
host judged a live act correctly, and the kernel does not promise that
two hosts behave alike in a live scope. No verifier could check it in
any design, because nothing remains to check.

### 4.2 What the level adds, and the filing rule

Under section 7.1 of the kernel page, the level adds one thing that the
rule holds: a level. It adds no scope kind, no platform name, no
capability, no entry kind, no field type and no kind of reference
between scopes. It adds nothing to K1's count or to K4's list. It adds
one app-only MCP tool beside `view_read`, and no group of tools.

**The codes of the two refusals.** The validator reports a refused
form as a `Problem` with a `ProblemCode`. Both are types of `derive`
(`packages/derive/src/validate/shape.ts`), not of `contract`. The
refusal of `live` today has the code `unsupported-definition`. Replay
reports a third entry with the result `mismatch`, which the replay
report has (`packages/contract/src/report.ts`). LV1 names the code of
each refusal of 3.2 and the way the fold reports a third entry to the
runtime. Where LV1 adds a code to `ProblemCode` or to `contract`, it
says so, because section 7 of the kernel page counts the addition.

K1, K4, K5, K6 and K10 are open, and the level closes none of them.
Ruling `4b5e0ec2` admits the first version by the owner's decision of 10
November 2026, as ruling `08c5ff25` admits the sequenced level, and this
note's head records it in sections 7 and 7.1 of the kernel page.

### 4.3 The promises

Three promises of section 6 of the kernel page gain a sentence when the
level is built. LV5 is the head that changes them, to these words.

- Promise 1 gains: "The state of a live scope is the one exception. It
  is not in the record, and nothing in the record rests on it."
- Promise 7 gains: "A live scope orders its inputs by tick inside one
  generation, and no order crosses a reset."
- Promise 11 gains: "A read of live state names a generation and a
  tick, and it is not a read of the record."

The other promises hold as they stand. Promise 2: the level writes no
new entry kind. Promise 4: a live act is judged against the scope's own
whole state. Promise 5: a live scope sends nothing, admits no delivery,
and no guard of another scope reads it. Promise 8: the scope's URI
resolves to its creation entries. Promise 10: the level is pinned with
the definition.

The [one-channel audit](2026-10-22-one-channel.md) proposed a class
"judged, not retained" for this surface. LV5 adds a live act and a live
read to the audit under that class.

## 5. What identifiers head (c+d) must know

Nothing changes in that head. The four questions have these answers.

| Question | Answer |
|---|---|
| The reference of a live scope | `SequenceRef { scope, genesis }`, as for every scope. No other shape exists |
| The signing of a live act | An ordinary intent in the existing intent domain. No live domain is added |
| `/v1/sequences`, the sequence document and `did:seq` | They include a live scope, as a sequence of two entries. They say nothing of live state |
| The `cause` of a live scope's seed | The identifiers rule for every seed. A root that creates a live scope from its own genesis follows the rule for a seed made in a genesis |

## 6. Section 16 of the volatile acts note

| Point | Section 16 | This note |
|---|---|---|
| L1, the format | A new definition format for live definitions | `artroom-definition-1`. The validator already refuses a level that the runtime lacks, which was the reason for a new format (`validateFormat1`) |
| L2, the kind | A new kind `live` in the seed | No new kind. The seed of a live scope names `lane` |
| L3, establishment | The directory records each live scope in an item, by a new directory version | The creator's `create` send and its result record it, as for any child. No directory version |
| L4, the genesis | A live definition has no genesis act | It has one, and each generation starts from its fold (3.1) |
| L5, sessions, leases and messaging | A pass over sections 5 to 9 is owed | Still owed, before the forms of section 7 that wait |
| L6, the locator | A locator `{ host, established, ordinal }` travels with every live reference | Withdrawn. The reference is enough |
| L7, the witnesses | A locator validates only through an authorized establishing entry. Host reads share one budget | The first is withdrawn with the locator. A live scope reads no host in the first version |

Also withdrawn from 16.2 to 16.5: "it exists when addressed", the
reference "ID, generation, kind", the read of a host entry at each
start, and "no entry and no storage". The witness of 16.5 that reads
"A field of type `fact` that names a live scope is refused" is
withdrawn too: such a field may name either creation entry (3.8). Kept:
zero durability after creation, the answers `applied` and `reset`,
generations, the scope's counter under the name tick (section 2), one
level for each scope, and the refusal of every durable effect in a live
definition.

## 7. The first version

**In the first version:**

- `live` version 1 in the validator, with the refusals of 3.2.
- Creation by an ordinary `create` send from a package root. The two
  creation entries, and the fold's refusal of any entry after them.
- The live turn of 3.3 for acts and timed rules, with ordinary signed
  intents and membership grants.
- The four answers of 3.4.
- The live reads of the summary and the items, and the watch of 3.5.
- One app-only MCP tool for a live act, and the client call and the
  `dap act` path behind it.
- Replay of the two creation entries.

**Not in the first version:**

| Part | What the first version does without it |
|---|---|
| Session-owned items, and a session that may act | An item belongs to an actor. Several sessions of one actor share it |
| Messaging: speech, replies and attention to recipients | A live scope holds values, not a conversation. A message that must not repeat cannot use it, because a repeat can apply again after a reset (3.3) |
| Content addresses as a field type | A presence item names a scope or an item of its own scope |
| Live item references between scopes | A live item is named inside its scope and its generation only |
| A view of a host's state from the live scope | A client reads the recorded scope and the live scope as two reads |
| Snapshots in several frames | The bounds of the definition keep the live state inside one read |
| A WebSocket | The watch is the HTTP stream that the head stream uses |

## 8. Heads

Each is one head with one gate. They follow identifiers head (c+d),
because a live act is addressed to a `SequenceRef`. The level needs no
creation family of its own. A room that installs ordinary packages can
install one with a live scope.

| Head | Owns | Needs | Witness |
|---|---|---|---|
| LV1, validator and fold | `live` version 1 in `validateFormat1`, with the refusals of 3.2. The fold's refusal of an entry after a live scope's confirmation. Until LV2 supplies the platform's live mode, `derivable` stays false for live and runtime creation answers `unsupported-definition` without writing (ruling `a1fe9aaf`) | Identifiers head (c+d) | A definition-corpus row for each admitted form, and a refusal pair for each refused form. The corpus row that refuses `live` today becomes an admission. A journal with a third entry does not fold |
| LV2, the live turn | The object's live mode, chosen by the pinned level. The generation. The turn of 3.3 over memory, with the judges of `derive`. Timed rules from memory. The answers. Any change that a judge needs to run with no sealed entry | LV1 | One definition and one sequence of acts: the live run and the recorded run reach the same items and states. On native storage: an applied act, a refused stale `expected`, and an act that names an old generation after an eviction, answered `reset`. A repeat of an applied intent after a reset applies again. The stored rows after many live acts equal the stored rows after creation |
| LV3, reads and the watch | The live reads and the watch of 3.5. The bounds of the live state (O1) | LV2 | Two viewers receive a line for a change. A slow viewer reads the latest state. A read names the generation and the tick. A viewer with no session is refused |
| LV4, package and tools | The package graph's entry for a live scope, and its refusal of a send to one. The app-only MCP tool, the client call and `dap act` | LV1 for the graph. LV3 for the tool | A package with one live scope installs, and a presence card enters, renews and leaves. A package that sends to its live scope is refused |
| LV5, replay and documents | Replay of the two creation entries. Promises 1, 7 and 11 of the kernel page (4.3). The one-channel audit. `docs/scopes.md`, `docs/write-an-application.md`, the roadmap, and B4 of the members and presence note | LV1 for replay. LV4 for the documents | The replay test that refuses `live` today passes for a live scope's two entries. A forged third entry is a `mismatch` |

LV2 and the graph part of LV4 can run as parallel lanes after LV1.

## 9. Changes to existing documents

| Document | Change | When |
|---|---|---|
| `docs/kernel.md`, sections 7 and 7.1 | Ruling `4b5e0ec2` | This head |
| Volatile acts note, section 16 | A pointer to this note at its head. 16.1 reads "Live, Recorded or Sequenced" | This head |
| Sequenced note, sections 2 and 3 | A live scope keeps no entry after its creation. The row for Live in section 2 cites this note. The row for Live in section 3 says what survives and what a fact may cite | This head |
| `docs/kernel.md`, section 6 | Promises 1, 7 and 11 gain the sentences of 4.3 | LV5 |
| One-channel audit | The class "judged, not retained" for a live act and a live read | LV5 |
| `docs/scopes.md`, `docs/write-an-application.md`, `docs/roadmap.md` | The level as built | LV5 |
| Members and presence note, B4 | Live presence on the member element, on the first version | LV5 |

## 10. Decisions

1. The live level is in the stable base. Hugh, 10 November 2026.
2. A live scope writes its genesis entry and its creator's confirmation,
   and no entry after them. Its reference is a `SequenceRef`. Planner.
3. Each generation starts from the fold of the genesis. Planner.
4. A live act is an ordinary signed intent, judged with the functions of
   `derive` under a membership grant. Planner.
5. The tick takes the place of the sequence inside one generation. An
   item's revision keeps its name and its meaning. Planner.
6. A live definition uses the recorded grammar and is refused every
   handler, send, capability and `fact`. Planner.
7. The seed of a live scope names the kind `lane`. No scope kind,
   directory version or creation family is added. Planner.
8. The code that runs live acts is a platform service. The kernel
   admits the level in the validator and refuses a third entry in the
   fold. Planner, with ruling `4b5e0ec2`.
9. The live answers and reads are an interface of their own, outside
   `contract`. Planner.
10. Section 16's locator, its reference shape and its establishment by
    the directory are withdrawn. Planner.

## 11. Open points

| Point | Question | Proposed |
|---|---|---|
| O1 | The bound on a live scope's state in memory | LV3 proposes a byte bound from the definition's item limits. An act that would pass it is refused `scope-full`. The comment on `Answer` in `packages/contract/src/result.ts` gives that reason to the exhausted budget of the whole scope. For a live scope the budget counts state in memory, so the meaning widens from stored state to held state. LV3 changes the comment and says so as a change to `contract` |
| O2 | What a live scope answers to a delivery that arrives after its confirmation | `unavailable`. The package check stops the sender before that. LV2 confirms that the sender's own deadline settles its request |
| O3 | Whether an idle live scope should stay in memory while a watch is open | LV3 measures what the host does. The level promises nothing either way |
| O4 | The name `live` already means "not final" for items and holds in source | Keep the level's name, which the definition type already has. Documents say "the live level" and "live state", never "a live item" for an open one |
| O5 | The pass over sessions, leases and messaging that L5 owes | Before any head that adds a form of section 7 that waits |
