# One environment for the acts of a declared scope

Status: current. Draft 3, for request `98f450a1`. Hugh asked for this
note on 14 November 2026. He has not ratified it. Section 17 lists the
decisions that wait for him. Nothing here is built. Section 13 lists
the build steps.

A dap application has more than one interface. A member acts through a
page, an agent acts through MCP tools, and an operator acts through the
CLI. Each interface must answer the same questions about an act. Can
the act record now? What does the act change? Who authorized it? Did it
record? Today each interface answers with its own code, and three
copies of the judge's admission exist:

- `actsOn` filters act kinds by one form of guard
  (`packages/client/src/forms.ts:45`).
- A view act of an application package states its own condition, for
  example `"when": "state = 'fresh' or state = 'stale'"`. The host
  "repeats current view, revision, standing and declared-condition
  checks before signing" (`docs/application-views.md`).
- Each page writes its own checks beside its buttons. "Is this my
  note" is one.

This note designs one environment that answers those questions for
every interface. An author defines the items and the acts one time. The
environment gives six services: describe, observe, explore, compose,
submit and resolve. The author writes the presentation, and the line
that turns a gesture into an act.

One principle governs each choice. **A business precondition is in the
engine.** The definition states the precondition and the scope judges
it. The environment executes work that an authority retained. The
environment is not a second judge of conflicts.

The note keeps the client of
[the client note](2026-11-13-scope-client.md) as the machinery for
submit and observe. This note calls that note D12. Section 15 lists
each change to D12. Three parts of the design enter the kernel, and
section 16 gives the rule that each meets. Two drafts and two reviews
came before this note,
in `~/play/dap-foldkit` (`ENVIRONMENT.draft-1.md` and
`ENVIRONMENT.draft-2.md`). Each fact below is read at main
`189cf7b64a`. Each name in a code block is a sketch, and a build step
can change it.

## 1. An author constructs, explores and submits a value

The pinboard has an act `move` on a `note`. The author writes this:

```ts
const env  = await environment(handle, { signer, store, drafts })
const note = env.view.rows("note")[0]

const move = env.acts.move({ on: note.ref, fields: { x: 400, y: 200 } })

const seen = env.view.explore(move)
if (seen.is === "admitted") show(seen.after)

const kept = await env.submit(move)
env.view.requests
```

Each line has one meaning, on every interface.

- `move` is a value. It carries no signature, no key and no promise.
  To construct an act, to move it between interfaces or to explore it
  gives no authority.
- `explore` is a pure function of the view and the act. It signs
  nothing and sends nothing.
- `submit` retains authorized work. Its answer says that the store
  holds the work. The answer says nothing about the record.
- `requests` gives the status of the work, from the one owner that
  retained it.

An agent gives the same act to the tool `explore`, and gets the same
result under the same context. A page can show an act that an agent
constructed, and a member can authorize it there.

## 2. dap has four of the six services

| Service | In dap today | Missing |
|---|---|---|
| Describe | `describe.ts` renders each act, field and guard. `forms.ts` gives `formFor`, `slotsFor` and `actsOn`. MCP has the tool `actions` | The names that the guards of one act declare, as a type |
| Observe | `observeScope`, `ScopeHandle.log`, the summary and `items`. MCP has `inspect`, `items`, `steps` and `wait`. D12 step C2 adds the replica and typed rows | C2 is not built |
| Explore | Nothing for a caller. `judgeAct` takes a signed intent and checks its signature first (`judge.ts:184`, `:219`) | The whole service |
| Compose | Nothing. The ID of an opened item is the sequence number of its entry (`effects.ts:330`), so no caller can name the item before the entry | The whole service |
| Submit | `declaredHandle.submit`, `Custody`, the MCP act tools. D12 steps C3 and C4 | Work that an authority gave and that no one can sign yet |
| Resolve | `settle`, `sends`, `wait`. D12's five statuses | The status of retained work, from one owner |

## 3. Terms

An **act** is an intent without its envelope.

```ts
interface Act<D, K> {
	kind: K
	on: ItemName | null
	fields: Fields<D, K>                  // a field of type `item` holds an ItemName
	expected?: Record<string, Revision>   // the basis
}
type ItemName = number | { output: Source }   // an ID, or the item that the source opens
type Revision = number | { after: Source }    // a revision, or the one that the source leaves on this subject
type Source   = { key: string; version: Digest }
```

`kind`, `on` and `fields` are the **meaning** of D12. `expected` is the
**basis**: the revision of each subject that the act expects, as its
author saw them. The **envelope** is the rest of an intent: `to`,
`actor`, the key, `notAfter` and the signature. An envelope authorizes
one send.

An act is **bound** when `expected` holds a key for each subject whose
admission is `observed` (section 4). Only a bound act is retained.

A **context** names the inputs of one judgment (section 5.1). An
**exploration** is the result of the judgment of one act under one
context.

An **authorization** is the retained permission for one step. It holds
one or more versions. A **version** is one act, exactly as the
authority gave it, with its symbolic names as written. A **step** is an
authorization in execution, and a request of D12 is a step.

A **source** names one version of one step of the same owner in the
same scope. A **symbolic name** is an `{ output }`, an `{ after }` or an
`{ entry }` (section 5.4) that a source's entry fills.

The **owner** of a step is the one actor key that signs for it. The
**store** is the custody that every process with that key shares. An
**instance** is one placement of the environment: in a browser, in an
agent host, or at the scope.

A **row** of the view carries what an act on it needs:

```ts
interface Ref { name: ItemName; seen: Revision; assumes: readonly Source[] }
interface Row<D, T> {
	ref: Ref
	recorded: Row<D, T> | null   // the same item without the owner's pending steps
	// and the typed slots and the state, as in D12 section 9
}
```

A typed constructor takes a `ref` wherever its act names an item. The
constructor writes the name, and the basis for each `observed` subject.
An author writes `on: note.ref` for a recorded row and for a pending
row.

## 4. The definition states the precondition of an act

A page sees two tabs move one note, and the scope refuses the second
move with `revision-moved`. The members did not conflict. The judge
compares one revision for the whole item, and the definition has no way
to say that a move does not depend on it.

An act has one of two meanings.

| The act means | Admission |
|---|---|
| Do this to what I observed | The scope requires the captured basis. This is today's rule, and it stays the default |
| Do this if the guards hold when the scope processes it | The scope judges the state at the commit and requires no revision |

**Decision A, the admission of a subject.** A definition declares, for
each subject of an act, `observed` or `current`. The subjects are `on`
and each name of `also`.

- Under `current`, the intent has no key in `expected` for that
  subject, and the judge compares no revision for it. The comparisons
  are at `judge.ts:295` for `on` and at `:305` for a name of `also`.
- `current` removes that one comparison and nothing else. The guards,
  the grant, the field checks, the rule for a final state and the
  bounds apply as they do today.
- `observed` is the default, and each definition of today keeps its
  meaning.
- The author declares the admission. No part of dap infers it from a
  guard that holds.

The scope processes one act at a time. So `current` costs no second
signature, no second round trip and no repeated race.

**One combination is refused.** A name of `also` that is bound with
`via` reads a reference slot of another subject. If that other subject
is `current`, another member can change the slot. The name then selects
another item, and that item's revision can equal the expected number.
A revision alone does not prove the item. So `validateDefinition`
refuses an `observed` name that is bound through a slot of a `current`
subject, unless the slot is fixed. A later design can instead put the
item's ID beside the revision.

In `packages/derive`, only the judge compares an expected revision.
Three capability modules and the genesis check that `expected` is
empty. That reading did not cover `packages/scope`. Decision A changes
the kernel, and section 16 gives the rules that it meets.

| Act | Under `current` |
|---|---|
| Pinboard `move`, `resize` | Suits. The scope records both moves, and the last destination stands |
| Map `comment`, with its place in `also` and the guard `place-gone` | Suits. dap-foldkit gave up that guard, because an edit of the place refused each comment in flight (`PLAN.md` section 6.1). The guard returns |
| Lending `borrow` | Does not suit as written. The act carries page content that the caller wrote from what it observed, and that content can be stale |
| Pinboard `edit` of a title or a text | Does not suit. The member sees the other text first |

**The environment never gives an act a new basis by itself.** A step
with an `observed` basis that moved returns to the member, as D12
rules. This holds with decision A and without it. Section 6 says how
the member
continues.

## 5. Explore judges an act under a stated context

### 5.1 The contract

> Given equal state, actor, evidence, clock and assumptions, an
> exploration and the scope's judgment derive equal consequences. The
> record also checks the envelope and the authority at the commit.

A head does not name those inputs. `JudgeContext` holds the grants, the
membership reference, the facts that came beside the intent, the
observations at hand and the values beside the intent
(`judge.ts:43-92`). A grant can expire with no entry in the scope. A
deadline can pass. So each exploration states its context, and two
explorations are equal only under equal contexts.

```ts
interface Context {
	scope: ScopeRef
	definition: Digest
	head: Head                            // the recorded head
	assumes: readonly Source[]            // the owner's pending steps, applied first and in order
	actor: KeyId
	standing: readonly FactRef[] | null   // the grants at hand. Null: no grant was read
	clock: Timestamp
	evidence: readonly Digest[]           // the facts, observations and values at hand
}
```

### 5.2 One body of code judges

`actJudged` (`judge.ts:211`) splits into two parts. The first part
checks the envelope: the signature, the address, the key and the
lifetime. The second part judges an intent body under a context.
`judgeAct` runs both parts, and the replay corpus proves that its
answers do not change. Explore runs the second part. The two paths
share one body of code, so they cannot drift.

The second part is a new export of `packages/derive`. D12 section 10
excluded such an export, and `docs/kernel.md` section 7 asks for a
review of it. Section 16 gives the reason for the export.

### 5.3 The result

```ts
type Exploration<D, K> =
	| { is: "admitted"; act: Act<D, K>; context: Context; bound: readonly string[]
	    effects: readonly Effect[]; sends: number; opens: ItemName | null
	    judgesTime: boolean
	    after: View<D> }
	| { is: "refused"; act: Act<D, K>; context: Context; bound: readonly string[]
	    reason: RefusalReason; class: RefusalClass; name?: Named<D, K> }
	| { is: "incomplete"; act: Partial<Act<D, K>>; missing: readonly string[] }
	| { is: "unavailable"; act: Act<D, K>; context: Context; lacks: readonly Lack[] }
```

Only an admitted act has effects and a hypothetical view, `after`.

An incomplete act is not judged. `shapeDeclaredAct`
(`declared.ts:198`) gives the missing fields, and the result claims
nothing more. A missing field can select a subject, a guard or an
effect, so an incomplete act has no meaningful consequences.

The judge's refusal has two parts today: `reason`, a kernel reason, and
`name`, the reason that the failed guard declares (`judge.ts:148`).
`Named<D, K>` is the type of the names that the guards of act `K`
declare. The class of a reason comes from one table, `REFUSAL_CLASSES`
(`packages/bytes/src/records.ts:91`). The judge's draft says whether it
judged a time (`judgesTime`, `judge.ts:114`).

**The basis of an explored act.** Explore judges each key of
`expected` as the act holds it, and never replaces one. If the act
lacks a key for an `observed` subject, Explore takes that subject's
revision from the view, and `bound` lists each key that it added. The
`act` of the result is then bound. An agent that constructs an act
from an item's ID gets its basis in this way, and sees that it did.

### 5.4 Explore invents no input

Explore answers `unavailable`, with what it lacks, in three cases:

- No grant is at hand. The judge answers `authority-unavailable`
  today, and Explore passes that answer on.
- A fact, an observation or a value is not at hand.
- A guard or an effect reads the digest of the intent. That digest
  covers the key and `notAfter`, which no act holds.

Three inputs come only from the commit, and Explore handles each in a
stated way:

| Input | In an exploration |
|---|---|
| The commit time | The clock of the context. The exploration does not predict the commit's clock |
| The item that an `open` makes, and the revision that an act leaves | The symbolic names `{ output }` and `{ after }`. The hypothetical view holds the pending row, so a later act can name it |
| The entry itself, which the effect `ref` reads with `"from": "self"` | The symbolic name `{ entry: Source }` in that slot. A later act that copies the slot is judged. A later act that reads a part of that entry, or compares it, is `unavailable` |

The third row is in the first version for one reason. The definitions
`examples/grow/definitions/room.json` and `site.json` hold 24 such
effects: `grep -c '"from": *"self"'` counts 22 and 2. Without the name,
each of those acts is `unavailable`. The first version has no other
symbolic value. General symbolic effects wait for an application that
needs them.

### 5.5 Describe gives the templates

A button is useful before its act is complete. For a row, `offers(ref)`
gives one entry for each kind that `actsOn` lists:

- A **template**: the kind, the item, the fields that the act
  requires, and the sentences of its guards. `formFor` derives each of
  these today.
- An exploration, only when the act needs no further input. The
  pinboard's `delete` and the map's `remove-place` have no fields. Each
  is judged, and the page knows `not-your-note` before the click.

A form shows its missing inputs from the template. A page reads
capacity from the counts and the bounds that Observe gives. The first
version derives no early refusal for an incomplete act. That needs
partial evaluation, which the judge does not have.

### 5.6 An instance explores again at each view and each tick

The first version makes each held exploration again at each new view
and at each tick of the instance's clock. A new view follows each
folded entry, and each change of the pending steps, of the standing or
of the evidence. The rule is correct with no analysis of the
definition. Its cost is not measured.

A later version records what one judgment read and skips the
explorations that a change cannot touch. The suite checks each skip
against the full recomputation. A reader that wraps item reads does not
see an empty range that a new item will match, the capacity of the
scope, or a change of authority.

### 5.7 Three placements give one shape

| Placement | Judges on | Use |
|---|---|---|
| A local instance | Its replica and the owner's pending steps | Each frame of a drag, each key stroke, with no network |
| The scope | Its own state at its head, with the standing that it reads for the caller | `POST /v1/scopes/<scope>/explore`. A read, with no entry |
| The agent host | The scope's answer | The MCP tool `explore` |

Each placement states its context. A placement that lacks an input
answers `unavailable`. Over a transport, `after` holds the rows that
the act changes, and not the whole view.

The route and the tool need only sections 5.1 to 5.4, and no replica.
So they come early (section 13) and test the claim of one environment
before a page moves.

## 6. A draft keeps the basis that the member saw

This is D12 step C4, with one rule changed and one added.

1. **A draft is a partial act with the `ref` of the row that it opened
   on.** D12 rule 5 builds the intent "from the draft's values at the
   replica's head". A dialog that opened at head 38 and is saved at
   head 40 then takes the revision of head 40. Its untouched fields
   overwrite what another member wrote at head 39.
2. **A draft submits the fields that the member changed**, for an act
   whose fields are optional. An absent optional field applies no
   effect.
3. **At the submit, the instance explores the act.** If an `observed`
   basis has moved, the draft returns before any signature. Its view
   holds the reason, the member's changed fields, and `now`, the `ref`
   of the row in the view that carries the return.
4. **A submit of a returned draft is a new version.** The member has
   the current row and the reason on the page. The member's next
   submit authorizes the changed fields, as they are then, on the basis
   `now`. The version takes no basis from a later view. It keeps the
   request's key, as D12 rules 2 and 6 say.

Another member can act between any two submits. If the item moved
again after `now`, the new version returns in the same way. A refusal
by the scope follows the same path: the draft returns when the replica
holds the head of the refusal (D12 section 6.1), and `now` is the row
at that view.

Rule 4 is the member's own act. It is the only way that a step gets a
new basis.

A draft that lacks a required field has values, and a page can show
them. The map shows a pin at the draft's coordinates while the name is
empty. That pin is the presentation of a draft. It is not a row, and no
judgment made it.

A row keeps one identity from the click to the record. A row of a
pending `open` is named by its source, and that name gives the recorded
row after the entry (D12 section 9).

## 7. A retained authorization permits each signature

### 7.1 The record

A submit retains an authorization before anything is signed.

```ts
interface Authorization {
	key: string              // names the step. The caller chooses it
	owner: KeyId
	scope: ScopeRef
	definition: Digest
	descriptor: Digest       // fixed at the first submit
	versions: readonly Version[]   // append-only. The last one is current
	cancelledAt?: Timestamp
}
interface Version {
	id: Digest               // the digest of `act` as written
	act: Act                 // bound, with its symbolic names as the authority gave them
	after: readonly Source[] // the steps that this version waits for (section 7.4)
	deadline: Timestamp      // fixed at the gesture
	at: Timestamp
}
```

The descriptor's digest is fixed with the authorization. A later
package cannot widen what a retained step can do.

**The rule** that replaces D12 rule 3, "No timer signs":

> Each signing is permitted by one version of one retained
> authorization: its owner, its act, its fills, its deadline, and its
> cancellation state when the signing is made.

The rule is a predicate over the signing, the authorization with its
history, the journal and the clock. The suite checks the predicate for
each signing that custody holds.

### 7.2 Four operations, each with its own condition

| Operation | Permitted when |
|---|---|
| Send the bytes of a live signing again | The signing is live, it signs the current version, and the step is not cancelled. D12 section 7 gives the times |
| Sign a new envelope for the same version | The latest signing is dead. A verified journal, read to a head after that death, does not hold the key: D12's `absent` (sections 5.4 and 5.5). The record is under D12's bounds of 8 envelopes and 64 signings (section 5.1). The new `notAfter` is not after the deadline. The step is not cancelled |
| Fill a symbolic name | One time, from the entry of the source, after the check of section 8.2 |
| Give the step other fields or another basis | Only a new version does. Only a gesture of the authority makes a version (section 6, rule 4) |

A stale replica proves no absence. The second row needs the read that
D12 section 5.5 defines.

**The deadline** of a version is its `at` plus one signing lifetime,
300 s, by default. A version that waits for a source is bound by the
same deadline, though it has no signing yet. With the default, the
second row never applies: the first signing's `notAfter` is the
deadline. A phone that is offline for longer than one signing then
hands each step back, as D12 section 14 rules. A caller states a later
deadline at the gesture, and D12's `resign` (section 5.2) then signs
under the second row.

### 7.3 One key owns a step, and one store coordinates it

An intent's actor is a key (`packages/contract/src/intent.ts:42`). The
scope gives an idempotency key to the first intent of that actor
(`judge.ts:228`). Two devices of one member are two actors, and one
idempotency key under two actors can record two entries.

- **The owner** is one actor key. Only that key signs for the step.
- **The store** coordinates each process that holds that key. Two tabs
  share the device's key and its store. Each change of an
  authorization is one atomic write to the store: a retention, a new
  version, a cancellation and a signing.
- A second device holds another key. It can send kept bytes again, as
  the room page does today (D12 section 11). It signs nothing for the
  step. A member who continues on that device makes a new step there,
  by a gesture.

These rules are the environment's. No adapter implements them.

**Cancellation and signing are serialized** by the store. A
cancellation that the store writes after a signing does not undo the
signing. The step then shows as cancelled, and D12 section 8 applies: a
copy in flight can still record.

### 7.4 The store fixes the local order when it retains

Two submits can come from one rendered view before the page gets a new
row. Two tabs can hold stale views. So the `ref` of a row cannot be the
only source of order.

A submit is one transaction on the store, under the owner and the
scope:

1. The instance reads the owner's pending steps in that scope.
2. For each new step, the instance sets `after`: each source that the
   act names, and each pending step, retained earlier, that names one
   of the act's subjects.
3. If an `observed` subject of the act has a pending step that the
   act's basis does not name, the submit stops with `busy`. The page
   built the act on a view without that step. This is D12's rule
   (section 8, step 3 of `submit`).
4. The instance writes every step of the submit, or none.

Rule 2 orders a `current` act too. Two moves of one note from one
device expect no revision. If the instance sent both at once, they
could arrive in the other order, and the first destination would
stand.

Separate submits with no required local order can proceed at the same
time, and the scope judges how they interact. A full type or a range
guard can still refuse one of them.

The `after` lists of the pending steps form a graph. The instance
manages that graph. The first version has no call that builds one.

## 8. A dependent act names the version that it was built on

### 8.1 A composition is a sequence

```ts
const a = acts.add({ fields: { title, text, color, x, y } })
const b = acts.edit({ on: output(a), fields: { color: "sage" } })
await env.submit([a, b])
```

`explore(view, [a, b])` judges `a`, takes its `after`, and judges `b`
there. A descriptor (section 10) gives the type of each output, so an
ill-typed composition stops before any judgment.

A composition is a sequence. The instance sends each step after the
entry of the step before it, so execution keeps the order of the
exploration. Most dependencies come from two gestures and not from one
composition: a member adds a note and drags it before the entry
arrives. The row's `ref` names its source, and section 7.4 sets the
order.

A composition is not one decision. Entries of other members can land
between two steps. A decision that must be whole is one act in the
definition. Alternatives are not a composition: a page explores many
acts and submits one, and a failed step selects no other act.

### 8.2 A source resolves through its materialized act

D12 permits a second version under one key and has the status
`other-recorded`. An act that was built on version B does not proceed
because version A recorded. So a source names a version.

The version's own act can hold symbolic names. Step A opens a note,
step B edits `{ output: A }`, and step C depends on B. B's version
holds a symbolic `on`, and the recorded meaning holds an item ID. A
digest of the version cannot equal the recorded meaning.

- A **version** is immutable, and a dependent act names it by `id`.
- The **materialized act** of a version is its act with each symbolic
  name filled. The instance computes it when it signs the version, and
  custody holds it with the signing.
- A source is resolved when the replica holds an entry for the
  source's key, by the owner, whose meaning equals the meaning of that
  version's materialized act.

The author handles only references.

Then the instance fills the dependent act:

- `{ output }` is the item that the source's entry opened.
- `{ after }` is for one subject. It is that subject's revision
  immediately after the source's entry, and not its latest revision.
  If the replica holds a later revision of that subject, an `observed`
  basis has moved, and the step returns before any signature.
- `{ entry }` is the reference of the source's entry.

A name is within one scope and one owner. A guessed ID is not a
substitute: an entry of any other member takes the guessed number, and
a fresh item has revision 1 (`item-effects.ts:36`), so `expected` does
not catch an `open` by that member.

### 8.3 A dependent step returns with its input

A dependent step returns, with the cause `source`, in four cases:

- The entry for the source's key has another meaning.
- The source's record ended with no entry (D12 section 5.5).
- The member made a new version of the source, or discarded it.
- The step's deadline passed.

A source that returned to the member can still have a live signing,
and its entry can still arrive. So a returned source does not end the
wait. The end of the source's record does.

## 9. The owner resolves a step from the scope's evidence

**Scope evidence** is what the record holds, and what the scope can
say about signed bytes. The native `settle` route, the journal and
`sends` give it, and they do not change. A route that never saw a
draft cannot know `other-recorded`, which needs the meaning that the
caller intends. It cannot know that a step waits, which needs the
authorization. It cannot know `withdrawn`, which needs the history of
the sends.

**Environment resolution** is what that evidence means for a retained
step. The owner's instance combines the evidence with the
authorization, custody and the clock, one time. The result is one of
D12's five statuses, with `waits` for a step that waits for a source.
Each adapter of that instance shows that result: the page's view, and
the MCP server's `settle` for the steps that the server retained.

Each retained step has one owner that a caller can name: a local
instance, or a hosted one. A caller that signs for itself and uses the
native route gets scope evidence only.

After the record, resolution also gives the sends of the entry and
their results. An act of the lending library records before its page
is published.

## 10. One descriptor serves every adapter

| Part | Is |
|---|---|
| The local instance | D12's `scopeClient`, in `@generalbusiness/dap-client/scope`. It gains Explore, the draft rules, authorizations and dependencies |
| The agent host | The MCP server. It holds a key and custody today. It gains the tool `explore`, and it resolves the steps that it retained |
| The scope | Gains the explore route |
| `dap dev` | Gains `log` and the head stream, so that a local instance runs against it. It serves neither today |

**The descriptor** is data, with a digest. For each act it holds the
schema of the fields, the type of the item, the type of the item that
the act opens, the names that the guards declare, the admission of
each subject, and the sentences of `describe.ts`. Each adapter
interprets the descriptor. A TypeScript caller takes its types from the
definition's own type, as `AskedOf` does today (`declared.ts:67`).
Another language can generate bindings.

**Words.** The environment has a sentence for each kernel reason. An
application writes words for the names that its own guards declare:

```ts
const why = { "not-your-note": "Only its author can do that." }
	satisfies Record<Named<typeof pinboard, "delete">, string>
```

**Adapters** hold no rule. MCP maps `actions` to describe, `inspect`
and `wait` to observe, `explore`, the act tools to submit, and
`settle` to resolve. A store with `subscribe` and `getSnapshot` serves
pages: React reads it with one hook, and the foldkit adapter is D12
section 11. `explore` is pure and the view is a value, so a page calls
`explore` while it renders. A package for gestures can come later. Its
operators arrange alternative acts, and it calls only `explore` and
`submit`.

## 11. Three applications test the design

### 11.1 The pinboard

The pinboard is `~/play/dap-ui-sdk`. Its definition has `board` and
`note`, and the acts `add`, `edit`, `move`, `resize` and `delete`.

```tsx
function Note({ note, view }) {
	const gone = view.explore(remove({ on: note.ref }))
	return (
		<article data-pending={note.ref.assumes.length > 0}
			{...drag(view, (at) => move({ on: note.ref, fields: at }), { drop: env.submit })}>
			{gone.is === "admitted" && <button onClick={() => env.submit(gone.act)}>Delete</button>}
		</article>
	)
}
```

Each frame of a drag explores a complete `move` and shows `after` when
the act is admitted. With decision A, the definition declares `move` and
`resize` as `current`.

The repository loses its own server, the one owner key that signs for
every member, the function `act()` with `lastAttempt`, the global
pending flag, the 3 s poll and the agent bridge. An agent uses the
tools.

A review of 13 November reproduced nine faults in the pinboard. Each
has one owner here.

| Fault | Settled by |
|---|---|
| 1. An edited retry after a lost answer makes two notes | One key for one request (D12 rules 1 to 6) |
| 2. The same note, added again, is swallowed | A key for each intention |
| 3. A move in one tab refuses a change of color in another | Not by the environment. `edit` keeps its `observed` basis. The draft returns one time with the reason and the changed field, and the member's next submit is a new version (section 6). Another member can act before that submit. The author can remove the refusal with a `recolor` act under `current` |
| 4. A second save overwrites another member's rename | The basis of a draft (section 6) |
| 5. A request with no answer freezes the tab | No global pending flag. Observe does not wait for Submit |
| 6. A lost answer to a move snaps the note back | The replica settles the step (D12 section 5.4) |
| 7. Two tabs nudge one note inside one poll, and the scope refuses the second | With decision A, the scope records both moves, and the last destination stands. Without it, the second returns one time. If both nudges must count, the definition needs an act that states a distance. Not checked: whether an effect can add |
| 8. The agent's `moveTo` answers `ok: true` for a refused act | Submit says retained. The owner resolves the status |
| 9. Under `dap dev` the page's routes answer 404 and 405 | One host contract |

### 11.2 The shared map

The map is `~/play/dap-foldkit`. Its definition has `map`, `place` and
`comment`. The page keeps foldkit's shape: the Model holds the view,
and the view function calls `explore`.

```ts
Scope.offers(model.map, place.ref)

const act  = Scope.act(model.map, box)
const post = Scope.explore(model.map, act)

case "ClickedPost": return [model, Scope.submit(model.map, box)]
case "DroppedPin":  return [model, Scope.submit(model.map, acts.editPlace({ on: msg.place.ref, fields: toMicrodegrees(msg.at) }))]
```

- **A new place.** The pin shows from the draft's coordinates. The
  place becomes a row at the submit, under the name of its source.
- **A comment on a place that has no entry yet.** The act names
  `place.ref`, and the step waits for the place's entry.
- **Whose place.** `offers` judges `remove-place`, which has no
  fields. The page writes no check of its own.
- **The guard `place-gone`.** With decision A, `comment` names its
  place in `also` under `current`, and the guard returns.

The repository keeps its definition, its views, its words, the
conversion of a click to coordinates, the selection and a thin
adapter. Its replica, its outbox and its engine go, as `PLAN.md`
section 13.6 says.

### 11.3 A tool-library reservation

The third application is new: a reservation of a tool for a day, on
`examples/lending`. Its build starts with step E1 and does not wait for
decision A. Two members who each open a reservation against one
availability guard exercise what the pinboard and the map lack. The
scope enforces that invariant under either admission.

Three facts from the contract shape the definition. Each is read, and
none is tested.

- A timed rule changes only its own item. So a lapse cannot free a
  tool, and availability is a guard over the reservations.
- `Where` has `equals` and `differs` only. So a slot is a tool and a
  day, and not an interval.
- Two `reserve` acts share no revision. The scope refuses the second
  with a guard's name, and no instance can predict that refusal.

## 12. One suite checks every instance

D12 section 12 defines a generated suite with seven invariants. This
note runs the suite with several members, each with an instance,
against one in-memory scope. It adds five invariants.

8. One version of one retained authorization permits each signing
   that custody holds (section 7.1).
9. Under equal contexts, an exploration and the scope's judgment give
   equal consequences.
10. One submit gives at most one entry for each step.
11. A step has no signing while its source is not resolved (section
    8.2).
12. A held exploration equals the one that the view, the context and
    the clock give again.

Each of these cases has one test:

1. Two explorations at one head with different standing, and two with
   different clocks. The results differ, and each states its context.
2. An incomplete act whose missing field selects its subject. The
   result is `incomplete`, with no effects.
3. A dependent step whose source's key records an earlier version. The
   step returns with its input.
4. A second device with another key tries to continue a step. It signs
   nothing under that step's key.
5. Three dependent acts, where the middle act holds an unresolved
   `{ output }`.
6. Two submits from one stale view, and two tabs that share an actor.
7. An `observed` edit that returns, is reviewed and is submitted
   again, with another change before the second submit.
8. An act with a `current` subject and an `observed` subject, where a
   reference changes its target. Validation refuses the definition.
9. An effect whose value is `unavailable` and a later act whose guard
   reads it. The later exploration is `unavailable`.

A small model also runs to a bound over every order of its steps.

## 13. Explore comes first, and reaches two transports early

| Step | Work | Needs |
|---|---|---|
| E1 | Explore for complete acts: the split of `actJudged`, the context, the result, the hypothetical view and the three symbolic names | The ruling on the export (section 16) |
| E2 | The explore route of the scope and the MCP tool `explore`, with the same result and context | E1, and the ruling on the route (section 16) |
| E3 | Explore in the local instance, again at each view and each tick. Drafts and references: `ref` with its sources, the basis of a draft, changed fields, the new version after a return, one identity for a row | E1, C2, C4 |
| E4 | Retained authorization: the record with versions, the deadline, the four operations, the owner and the store, the transaction of a submit, the predicate | C1, C3 |
| E5 | Sequential dependencies: sources by key and version, the materialized act, `waits`, the returns | E4 |
| E6 | Environment resolution through MCP `settle`, React and foldkit. `dap dev` with `log` and the head stream | E3 to E5 |
| A | Decision A: the admission of a subject, in the act form, the validator and the judge | The ruling on decision A, and its carrier (section 16). E1 to E6 do not wait for it |
| R | The reservation definition, with its scenario | Starts with E1 |

E1 and E2 need no replica. An agent and a command line explore before
any page moves. The pinboard and the map move after E5.

## 14. Deferred

- **A new basis without a gesture.** If Hugh declines decision A, a
  narrow rule for declared acts can follow. The first version has
  none.
- **Patch acts.** An act under `current` whose guards compare each
  slot that it sets with the value that the member saw. The
  precondition stays in the definition.
- **Early refusals for an incomplete act.** They need partial
  evaluation.
- **Precise invalidation.** Section 5.6.
- **General symbolic effects.** Section 5.4.
- **A call that builds a dependency graph.**
- **A name that the judge resolves.** The scope keeps
  `accepted(actor, key)`, which gives the sequence number of the entry
  (`judge.ts:228`), and that number is the ID of the item that the
  entry opened. The judge could resolve `{ output }` for the same
  actor, and the instance could then sign a dependent step at the
  gesture.

## 15. What this note changes in D12

| D12 | Change |
|---|---|
| Rule 3: "The client signs only when the member submits. No timer signs" | The rule of section 7.1. With the default deadline, the behavior that a member sees is D12's |
| Rule 5: the intent is built "at the replica's head" | A draft keeps the basis that it opened on, and a returned draft takes the basis `now` (section 6) |
| Section 8, step 3: the stop `busy` | Stays for an `observed` subject whose pending step the act does not name. An act that names the step waits (section 7.4) |
| Section 9: `ClientView` and `Judged` | The view gains `explore` and `offers`, and each row gains `ref` and `recorded`. `Judged` is the exploration of a signed version |
| Section 10: no file and no export in `packages/contract` or `packages/derive` | Three parts enter the kernel (section 16) |
| Section 15: work offline for longer than one signing is not taken | A caller states a later deadline (section 7.2) |

Steps C1 to C4 keep their order. E3 lands with C4, and E4 with C3.

## 16. Three parts enter the kernel, and each needs a ruling

`docs/kernel.md` section 7 admits a part to the kernel only after a
review. The review says why the part cannot be a platform service or an
application.

| Part | Enters | Why it is kernel |
|---|---|---|
| The judgment of an intent body under a context (step E1) | `packages/derive`, as one export | Promise 9: the runtime and the verifier call the same functions. An exploration that runs other code is a second judge, and dap has three partial ones today |
| The explore read (step E2) | `ScopeApi` in `packages/contract/src/transport.ts`, as one method with its argument and its answer | Each native read is a method of `ScopeApi`. Each transport must agree on the shapes, as section 7.4 of that page says for read minimums |
| The admission of a subject (decision A) | The act form in `packages/contract/src/definition.ts`, the validator and the judge | The admission changes how the judge reads `expected`. The runtime and replay must derive one answer from one definition |

No part closes a K item of that page. Its section 7.1 holds a head
that adds to the kernel and closes no K item. The owner's decisions
with rulings `08c5ff25` and `4b5e0ec2` released two levels from that
hold. Each part of the table waits for a ruling of the same kind
(section 17).

**Step E2 has a form with no kernel part.** If the ruling refuses the
method, the agent host explores on a replica of its own, as a local
instance does. Step E2 then keeps only the MCP tool, and it needs C2.

**Decision A meets two more rules** of that page.

- Section 7.2 binds validation to the format `artroom-definition-1`.
  The validator refuses each member of an act that the contract does
  not define (`validate/shape.ts:64`, called at
  `validate/handlers.ts:193`). So today's validator refuses a
  definition that states an admission. Decision A needs a compatibility
  review and a carrier: a new format, an optional part with its own
  version, or a gate by cohort. `level` and `capacity` are parts with
  versions (promise 3), and the `reference` field type has a gate by
  cohort (section 7.3). Step A chooses the carrier.
- K5 counts each form that the validator and the judge both read.
  Decision A adds one form to that count, unless the one grammar table
  of K5 lands first.

**The rest stays outside the kernel.** In step E1 the types of the
act, the context and the exploration live in `packages/client`, which
`packages/scope` and `packages/mcp` import today. No recorded entry
needs those types to be derived again, so they pass the test of section
2 of that page. The method of step E2 moves only its argument and its
answer to `packages/contract`.

This note adds no scope kind, no platform definition name, no
capability name or form, and no new model of the record. It adds one
MCP tool, `explore`, to the tools of a declared scope, and no tool
family. An authorization is a record of the client's store. It is not
a record of a scope.

## 17. Decisions for Hugh

1. Decision A: a subject's admission, `observed` or `current`, in the
   definition, with its ruling under `docs/kernel.md` section 7. This
   note recommends it. It also recommends that the environment gives
   no step a new basis by itself, with decision A or without it.
2. The authorization rule in place of D12 rule 3, with a default
   deadline of one signing lifetime.
3. The change of D12 rule 5: the basis of a draft, and the new version
   after a return.
4. The export of the body judgment from `packages/derive`, with its
   ruling.
5. One owner key for each step, one store for its processes, and no
   signature by a second device.
6. The explore method on `ScopeApi` and its route, with its ruling, or
   the form of step E2 that has no kernel part.
7. The third symbolic name, `{ entry }`, in the first version.
