# One environment for the acts of a declared scope

Status: current. Hugh asked for this note on 14 November 2026, decided
each item of section 17 and ratified the note on that day. It landed as
main `270dc8c7` for request `98f450a1`. Steps E1 and R are built. E1
landed as main `d1585bda` on 15 November 2026. The runtime and the
replay judge through the shared body, and no production module calls
Explore yet. R landed as main `c6711b53` on the same day, and Lending
0.3.0 holds the reservation definition. E4 landed as main `91610da9`
on 16 November 2026. No other step is built.
Section 13 lists the build steps and their requests. Section 18 lists
the rulings of step E1 that changed sections 3, 5 and 8. Section 19
lists the rulings of steps E4 and C4 and of the requests EK-1, ES-1,
DD-1 and E4-C, of 15 and 16 November 2026, that changed sections 5,
6, 7, 10, 13, 15 and 16. Section 5.7 gives the source of an
instance's standing.

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
each change to D12. Three parts of the design enter the kernel and a
fourth waits, and section 16 gives the rule that each meets. Two drafts
and two reviews came before this note,
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
| Observe | `observeScope`, `ScopeHandle.log`, the summary and `items`. MCP has `inspect`, `items`, `steps` and `wait`. D12 step C2 built the replica and its typed rows in the client (`scopeReplica`, main `26d1e65c`) | A replica in the agent host, which step E2 adds |
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
same scope. The caller chooses the key. The version is the digest of
the bound act as written: the SHA-256 of the canonical bytes of `kind`,
`on`, `fields` and `expected`, with each symbolic name as written. A
**symbolic name** is an `{ output }`, an `{ after }` or an `{ entry }`
(section 5.4) that a source's entry fills.

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

The contract covers the judge's answer. It does not cover the capacity
of the scope. The turn checks the count, the bytes and the reservations
with the bytes of the real entry, which no act holds. So the scope can
refuse an admitted act with `scope-full` at the commit. A page reads
capacity from the counts and the bounds that Observe gives (section
5.5).

```ts
interface Context {
	scope: ScopeRef
	definition: Digest
	head: Head                            // the recorded head
	assumes: readonly Source[]            // the owner's pending steps, applied first and in order
	actor: KeyId
	standing: readonly FactRef[] | null   // the grants at hand. Null: no grant was read. Request ES-1 replaces this field (section 5.7)
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
	    source: Source
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

**The source of an explored act.** Explore takes a key beside the act
and the context, and the key is required. Without a key, Explore could
not name the item that an `open` makes. The key carries no authority,
and Explore retains nothing. Explore computes the version from the
bound act, so a caller cannot state the version first. The `source` of
the result is that key and that version. `opens` and each symbolic
name in the hypothetical view use it. The MCP tool `explore` takes the
key argument of the act tool. A local instance gives the key of the
draft or of the request. An agent or a page that submits with the same
key gets the names that it explored.

### 5.4 Explore invents no input

Explore answers `unavailable`, with what it lacks, in five cases:

- No grant is at hand. The judge answers `authority-unavailable`
  today, and Explore passes that answer on.
- A fact, an observation or a value is not at hand.
- The judgment reads the signed intent. A guard or an effect can read
  its digest, which covers the key and `notAfter`. A send that creates
  a scope records that digest as its cause. A Native rule takes the
  whole signed input. No act holds any of these. Of the acts of Grow,
  Lending and Counter, one is `unavailable` for this reason:
  `create-room` of the Grow site.
- A hold workspace would write a derived record or an operation. Its
  identifier comes from the entry.
- A reached comparison or operation needs the number of a pending
  output. The entry gives that number, so the answer lacks `entry`.

Three inputs come only from the commit, and Explore handles each in a
stated way:

| Input | In an exploration |
|---|---|
| The commit time | The clock of the context. The exploration does not predict the commit's clock |
| The item that an `open` makes, and the revision that an act leaves | The symbolic names `{ output }` and `{ after }`. The hypothetical view holds the pending row, so a later act can name it |
| The entry itself, which the effect `ref` reads with `"from": "self"` | The symbolic name `{ entry: Source }` in that slot. The act itself is judged. A later act that names that item as a subject is `unavailable` until the source's entry fills the slot |

The third row is in the first version for one reason. The definitions
`examples/grow/definitions/room.json` and `site.json` hold 24 such
effects: `grep -c '"from": *"self"'` counts 22 and 2. Without the name,
each of those acts is `unavailable`. The first version has no other
symbolic value. General symbolic effects wait for an application that
needs them.

A command record of the capability `device-command` is keyed by the
entry that opens it. Those positions take the same name,
`{ entry: Source }`. The hypothetical view gives the exact count of
records and the exact reservations after the act. So `set-fan`,
`set-heater`, `set-vent` and `authorize` of the Grow room are judged.

A pending output has no number in an exploration. Three identity
comparisons between typed references stay determinate:

- The same source equals itself.
- Two different sources differ.
- A pending output differs from each recorded item of the view.

Every other use of the number is `unavailable`: a comparison with a
constant or with a value that is not a typed reference, an order,
arithmetic, a text form, a hash and a record key. A reference to a
pending output is not `unavailable` by itself. Only a reached
operation answers. A finer rule is possible. A constant that equals
the ID of a recorded item could be judged as different, but that
judgment needs the allocation rule in Explore.

The rule of the third row is coarse by choice. A later act that only
copies the slot could be judged, but that finer rule needs a record of
what a judgment read, and section 5.6 defers that record. A single act
is the common case, and the coarse rule does not touch it.

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

### 5.7 Two placements give one shape, and a third waits

| Placement | Judges on | Use |
|---|---|---|
| A local instance | Its replica and the owner's pending steps | Each frame of a drag, each key stroke, with no network |
| The agent host | Its own replica of the scope | The MCP tool `explore` |
| The scope | Its own state at its head, with the standing that it reads for the caller | Held (section 16). A method `explore` on `ScopeApi`, with the route `POST /v1/scopes/<scope>/explore`. A read, with no entry |

Each placement states its context. A placement that lacks an input
answers `unavailable`. Over a transport, `after` holds the rows that
the act changes, and not the whole view.

The contract of section 5.1 does not wait for a transport. Invariant 9
of the suite (section 12) tests it in one process, against the
in-memory scope.

No placement outside the scope holds a grant. The scope reads the
caller's standing itself, and it ignores each grant that a caller
presents (`packages/scope/src/authority.ts:538`). An instance
explores under the standing that its session gives. Without that
standing, a local instance and the agent host state `standing` as
null. An act that reaches the grant check then answers `unavailable`
with `authority-unavailable` (section 5.4). The judge runs the grant
check before the guards, so the explorations of section 5.5 are
`unavailable` too.

**The session answer carries the standing.** A client that asks with
`?standing=1` on the session request gets the signer's own standing
in the answer. `issueSession` already reads that standing at the
membership head (`packages/scope/src/sessions.ts:389`). The signed
body does not change. The answer gives only the signer's own
standing, so the option needs no signature. Without the option, the
answer does not change. An older Worker answers with no standing, and
the reader takes that as a session with no standing. So an older
client and an older Worker keep working. The contract exports the
type of the value today, `ObservationAnswer`. The largest reply is
5,976 bytes of the cap of 16,384.

- The context names its standing: the observation, the membership
  head at which the service read it, and the session that gave it.
- The value is small and up to 600 seconds old. No journal checks
  it. The scope judges each submit with its own read, so an old value
  costs a refused submit and never a wrong record.
- A session with no standing gives none, and the exploration is
  `unavailable`. A row of `observes` stays `unavailable`. The value
  is no proof of freshness and no grant for the runtime.
- The standing changes when the instance receives a new session.
  Only a refusal `unauthorized` by the scope ends the cached session.
  `authority-unavailable` ends nothing. Silence proves nothing.
- A reader checks the value fields and the native pin. It checks
  that the key, the member, the membership and its incarnation equal
  those of the request and of the claims.
- The caller opts in. The MCP server and the command line do. The
  application gateway refuses a query on a POST to `sessions` until
  step E3 opens it for a screen page.
- The MCP inventory asks the shared value check for each action, and
  it keeps no role table. It reads the member `kind` from the member
  item of the membership summary. `kind` decides no action. If the
  inventory does not hold the member item, `kind` is absent.

A replica of the membership scope waits. It is checked and follows
each change. Its cost is a new owner of native membership state in
the client, and a whole membership journal with no bound on memory.

**Explore judges a grant by value.** The grant guard `judgeGrant`
takes the record of the scope's own read, and a grant carries that
record as its proof of freshness (`packages/derive/src/grant.ts:305`).
An instance holds no such record and makes none. So
`packages/derive` exports one function more, `judgeExploreGrant`, and
no type. The function shares the value check of `judgeGrant`, and it
judges a grant by value, without the use guards (`fresh`). A grant
value with no `fresh` of its own serves only the unsigned body that
Explore judges. It never becomes recordable authority, and it is
never `granted`. With any row of `observes`, the function answers
`authority-unavailable`. The bytes of a recorded grant do not change.
Section 16 lists the export.

Request ES-1 builds the session answer, and request EK-1 builds the
export. Neither is built. Step E2 needs both, and step E3 needs C4
too.

An instance never presents a guessed grant. The stand-in
`predictionGrant` of step C2 stays in the prediction of the member's
own pending acts, where the scope has the last word.

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
   holds the reason, the member's changed fields, and `now` (below).
4. **A submit of a returned draft is a new version.** The member has
   the current row and the reason on the page. The member's next
   submit authorizes the changed fields, as they are then, on the basis
   `now`. The version takes no basis from a later view. It keeps the
   request's key, as D12 rules 2 and 6 say.

Another member can act between any two submits. If the item moved
again after `now`, the new version returns in the same way.

**A return has one stored shape and two causes.**

- An exploration at a submit found a moved basis. Rule 3 makes this
  return.
- A request ended refused or withdrawn. The draft returns when the
  replica holds the head of the refusal (D12 section 6.1). The view
  shows the return from the custody record, and no step writes it.

The stored draft keeps its basis and the cause, and nothing more.

**The view of a returned draft holds one value, `now`.** `now` is the
basis that the view renders for every subject of the act: the
primary, each `also` and each `via`. The view computes `now` each
time, from the kept basis and the rows that it holds, for both
causes. The view stores nothing. So `now` is never older than the row
on the page. An act that makes a new item has no primary row, and
neither has an act that names no item. For each, `now` holds the
basis of the other subjects.

**The page passes `now` back whole: `submit(slot, now)`.** The client
explores the act on that basis. A subject that moved after that view
returns the draft again, before any signature.

- A returned draft with a missing, ill-shaped or foreign `now` stops
  with `shape` before any signature. An editing draft that is given a
  `now` stops in the same way.
- A view that cannot render a subject gives no `now`. It names the
  subject that it lacks, so a page can tell the member. A submit then
  stops with `state`. Edit and `dismiss` still work, and `now`
  appears when the replica holds the row.

Member A explores at head 39. The act of member B takes effect at
head 40 before the scope judges the request of A, and the scope
refuses with `revision-moved`. The draft of A returns with the cause,
and its view holds `now` at head 40. The member sees the row of head
40, and the next submit signs on that basis. A refusal by the scope
after a passed exploration always returns the draft with a new `now`,
and the member submits one time more. The instance makes no hidden
retry, because a retry signs on a row that the member has not seen.
Each real race costs one submit.

On MCP, a refused `act` result with the reason `revision-moved` or
`bad-intent` carries `now`. `settle` gives `now` for a refusal with
another reason.
The `act` tool takes `after` and `now` as a pair, and that pair is
the submit of a returned request. A bare `act` is a fresh act with
its own key. A host that drops tool output gives the model no `now`.
The model then gets `shape`, and it can send a fresh act.

**A draft changes only by a call of the member.** No background step
writes to the draft store. So two clients of one member never race to
store a return, and a stop between the custody write and a draft
write leaves nothing to repair.

The same rule governs a request with the status `other-recorded`: an
earlier version of the request took effect after its return. The
request waits in the list of requests with its present values, also
when its slot is empty. `restore(key)` makes the new draft with the
new key, and `dismiss(key)` removes the request. The earlier version
is on the record. For an act that makes a new item, a submit of the
present values makes a second item, so the member decides it and no
view decides it for the member.

**Each arm of the list of requests carries `is`.** A reader narrows
the list with one switch.

- A request with no stored draft carries `is: "request"` and its
  status.
- A request with a stored draft carries `is: "draft"`, with `slot`
  and `values`, the present fields. So a page renders one draft in
  one way before and after a submit. No partial act claims the type
  of a complete act, `AskedOf`.
- A **held intention** is a stored row that the client cannot show as
  a request or a draft. It carries its key and no status, and it says
  nothing on whether a submit can sign.

A held intention names one of three reasons. The first reason that
holds is the one that the arm names.

1. `another-definition`: another definition made the row. The arm
   shows the stored definition digest and no values. `restore(key)`
   stops with `definition-mismatch` and changes nothing.
2. `another-descriptor`: another descriptor made the row. The arm
   shows the stored descriptor digest and no values. `restore(key)`
   stops with `descriptor-mismatch` and changes nothing.
3. `nonrequest-held`: a custody record that is no request holds the
   key of a stored draft. Step C3 excludes such a record, for example
   a standalone step.
   The arm shows the key and the stored values. `restore(key)` moves
   the values to a draft with a new key. A submit under the held key
   gets the stop that custody gives for a conflicting record.

In each case `dismiss(key)` removes the stored row. Neither call reads
or writes the custody record. The client shows no values that it has
not checked, and it rewrites and promotes no row of another
definition or descriptor. One held row never fails the read, and the
rest of the view publishes. Each key shows one time in the view. A
key with an ordinary custody record shows as its request, and a
stored row of another descriptor adds no values to it.

An optional field of the arm holds the place of a verified entry with
the key, when the replica holds one. It is evidence and no status. It
tells the member that an act with this key took effect, so a second
submit of the same form can make a second item. It does not say that
the entry holds the values that the member typed.

Rule 4 is the member's own act. It is the only way that a step gets a
new basis.

The client takes one draft store, the option `drafts`, and the option
is required. The client makes no memory store for a caller. A
constructor call with no store throws before any storage, and it is
no stop. The client reads the present values of a request and the
change by another client from that store.

Each call validates and copies its inputs before its first wait: the
slot, the patch and the names of a clear. A page can change its own
objects after the call, and the call does not see the change.

**A call decides on what it read, and a later answer shows at the next
view.** Under the existing fence, a member call reads the finite set
of custody records that it needs, one time. It stops on a change that
it observed, keeps each displaced row as waiting, and launches one
write. An answer of the scope can arrive during the call. That answer
changes custody and nothing else. The next view shows its cause. It
removes no new intention, and it gives no draft a new basis.

The view is a total function of the draft store and custody. Each key
shows one time, in a slot or in the list, for every pair of store
states. So a late answer changes only the order that the member sees:
the call first, then the answer. Both orders are valid outcomes.

Outcome writes stay outside the fence. An answer must settle without
a wait for a member's edit, and another tab writes outcomes that no
fence of this tab holds. D12 has two store ports and claims no write
across both.

A stored return by an exploration stays when the cause of the same
signing changes. A later kept signing consumes it. An entry, a
pending request and a stopped client keep their priority over it.

**The fold of custody is its own background step.** `Custody.folded`
writes an outcome from a verified entry of the journal. The read for
a view reads and writes nothing, and it does not call the fold. No
view depends on the fold. A published view that holds the entry shows
the request as recorded, from the view's own data. So the view is the
same when the fold ran, when it failed and when it has not run yet. A
failed fold stops no view and no member call. It runs again at the
next change of the replica or of the store. The fold changes no
draft.

Step C4 builds rules 1 to 4, with the exploration of rule 3. The
replica keeps its checked state private, so the replica owns one
internal operation that explores an act. The operation uses the real
authority, owners and evidence, and it answers `unavailable` when it
holds none. No raw state leaves the replica, and no second evaluator
exists. Step E3 calls the same operation at each view and each tick.

A context reader gives the operation its inputs. The reader is a port
at the constructor of the client and of the replica. It receives the
actor, the scope, the definition, the head and the act, and it
returns checked inputs or the lacks of section 5.4. The first adapter
is the replica alone: the member's session, the checked replica and
the pinned declaration. Its `standing` is null (section 5.7), and it
holds no foreign fact and no observation.

Rule 3 holds with that adapter. The judge compares the expected basis
before it checks the grant (`packages/derive/src/judge.ts`, the
`revision-moved` refusal and the grant check after it). A stale draft
gets the determinate answer that its basis moved, and it returns
before any signature. A draft with an unchanged basis gets
`unavailable`, and the submit proceeds to the scope. An `unavailable`
exploration returns no draft and stops no submit. One test in the
judge's owner pins the order of the two checks.

### 6.1 A `ref` is a value

A page copies its values. A card passes them across a frame, and a
store serializes a model. So a copy of a `ref` is that `ref`. The
instance keeps no private state behind a `ref` object, and a copy
causes no error.

**The basis of a subject is read when the draft first names that
subject.**

- A subject that the slot names by a `ref` takes `seen` from the
  value of the `ref`, as the page gave it. If the row moved after the
  page read it, the basis is stale, and the submit returns the draft
  with `now`.
- A subject that the act derives through `also.via`, `also.by` or
  `one` takes its revision from the instance's checked view, at the
  edit that first determines the subject. For most acts that edit is
  the first edit of the empty slot. A change of the selecting field
  reads again, for that subject only.
- The draft store holds the basis from that write. A later view, a
  new slot value and a reload change nothing in it. The instance does
  not repair a stored basis from current rows. A basis that is
  missing or damaged stops the draft with `shape`.
- A slot is an address: the kind and the item names. Two slots with
  equal names are one slot.
- A page that shows a frozen copy of a row opens its draft when the
  dialog opens, with an empty edit.
- A `ref` whose name the view does not hold stops with `state`. A
  derived subject that the view does not hold gets no basis. The
  submit sends no guessed revision, and the scope judges the act.
- The view of a returned draft computes `now`, with the revision of
  the primary and of each derived subject, from the kept basis and
  the rows that it holds. No stored cut gives `now`.

**An optional item field can stay absent in a slot.**

- The address holds the item refs that the page gave, and no other. A
  required item field needs its `ref`.
- An absent field and an explicit `ref` are two addresses, also when
  a declared default selects the same item. The client evaluates no
  default to compare two addresses. The two signed acts differ in the
  same way.
- A subject that an absent or defaulted field selects is a derived
  subject, and it takes its basis as the list above says.
- The decoder of a stored draft accepts an absent optional item
  field. It refuses an absent required item field, and it refuses
  `null`.

**An edit is a patch of values, and a patch never clears.**

- A field with a valid value sets that value. An omitted field keeps
  its value.
- An own property with the value `undefined` is an omitted field. A
  form gives `undefined` for an input that the member did not touch,
  and a copy through JSON drops such a property. So the patch means
  the same before and after a copy.
- `null` stops with `shape`.

**Clearing is its own call, `clear(slot, fields)`.** A member who
selects the wrong item must be able to select none. The other way is a
discard and a new draft, and a new draft takes a later basis that the
member did not see.

- The call removes each named field from the draft, so the act omits
  the field. No `undefined` enters the stored draft.
- The call applies to the fields outside the address. A name of an
  address field or an unknown name stops with `shape` and changes
  nothing.
- The call follows the state rule of `edit`: it changes only a draft
  in the state `editing`, and it stops with `taken` otherwise.
- A cleared field that selected a subject removes the basis of each
  subject that only that field selected. A subject that the cleared
  draft now selects by a default takes its basis at this write. No
  other basis changes.
- A draft with no field left stays a draft with its key, as after
  `edit(slot, {})`.

One limit stays. A derived subject can move between the page's read
and the edit that first names the subject, and the instance does not
see that movement. The primary subject has no such gap, because its
`seen` comes from the page.

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

**A position names a gesture.** The `id` of a version is the digest
of its act, so it names content. Two versions of one authorization
can have one `id`. The position in `versions` names the gesture, with
its own `at` and `deadline`, and one position permits a signing. A
member who submits A, B and A again makes position 2 with a new
deadline. Position 2 never reuses the envelope of position 0. A timer
sends again only the live bytes of the last position. A source still
names a version by its `id` (section 8.2).

**One position permits one call of the signer.** The instance writes
a permission mark under the fence before it calls the signer. The
mark names the position and the exact materialized act. When the
signer fails, or the custody write fails after the signer ran, the
mark stays. The instance then holds no signing for that position,
sends no bytes that custody does not hold, and rolls back nothing. A
second attempt to sign for that position stops with
`authorization-used`, and no timer signs for it. The draft stays
editable, and the member's next submit appends a new position. A
custody write can fail after the store took the bytes, and a signer
need not give equal bytes twice. One call for each position needs no
proof about either case.

**The instance takes the descriptor digest as a required option.**
Each authorization keeps the value of its first submit. Step E4
builds no descriptor and no hash scheme, and the step that builds the
descriptor supplies the real value. An instance whose option differs
from the value of a retained authorization stops with
`descriptor-mismatch`. It adds no version and no signing to that
step. It can send the live bytes of the last position again, and it
can settle the step. Request DD-1 replaces the one option with the
digest of each act (section 10), and its proposal states how the
instance gets that digest.

**A signing carries a reference to its authorization and position.**
A signing with no reference is `legacy`: custody held it before step
E4. The instance reconciles a legacy signing and sends its live bytes
again. It signs nothing more for that signing without a new gesture,
and it invents no gesture, descriptor or cancellation. The suite
states the legacy signings that each test seeds, and it fails when
any other signing has no reference.

**The store keeps the history of a key while the store lives.** Step
E4 adds no deletion and no eviction. A key holds at most 64
positions, and an unsigned position and a failed position each
count. A gesture past that bound stops before any write, and the
member continues with a new request key. The bound equals the 64
signings of D12 section 5.1, and the two bounds are separate
constants.

**The authorization write comes first.** The authorizations have
their own namespace in the store. The instance writes the
authorization before the custody record of its signing, under one
fence. No signing counts as permitted by a version that the store
wrote later. Step E4 delivers the port and a store in memory. Step
E4-B adds the browser store. There, the history of a key leaves in
the transaction that removes the custody record of that key, live or
archived, and at no other time.

### 7.2 Four operations, each with its own condition

| Operation | Permitted when |
|---|---|
| Send the bytes of a live signing again | The signing is live, it signs the current version, and the step is not cancelled. D12 section 7 gives the times |
| Sign a new envelope for the same version | The latest signing is dead. A verified journal, read to a head after that death, does not hold the key: D12's `absent` (sections 5.4 and 5.5). The record is under D12's bounds of 8 envelopes and 64 signings (section 5.1). The new `notAfter` is not after the deadline. The step is not cancelled |
| Fill a symbolic name | One time, from the entry of the source, after the check of section 8.2 |
| Give the step other fields or another basis | Only a new version does. Only a gesture of the authority makes a version (section 6, rule 4) |

A stale replica proves no absence. The second row needs the read that
D12 section 5.5 defines.

**A fill folds the journal to each source entry one time.**
`authorizationSource` folds the journal from genesis to the source
entry, at about 35 microseconds for each row: 33 to 37 ms at 1,028
rows and 137 to 156 ms at 4,100 rows, one run each. Since E4-C, the
replica keeps the answer in a map keyed by the hash of the source
entry, and later calls for that entry read the map. The answer for an
entry never changes, so the key needs no head. A fold again from
genesis clears the map.

The map's bound: the one caller, the retained authorization, asks only
for the owner's own source entries. So the map holds at most one row
for each accepted act of the owner that a session uses as a source.
Each row maps each item to its revision after that entry.

The first call for each source entry still costs one fold. Today a
replica holds the journal from the genesis entry, so `foldThrough`
starts at entry 0. A replica that starts at a state seed (SS1 to SS3)
will hold no entry before the seed, and its fold will start at the
seed entry. Until then the measured cost of the first fold is a known
limit.

**The deadline** of a version is its `at` plus one signing lifetime,
300 s, by default. A version that waits for a source is bound by the
same deadline, though it has no signing yet. With the default, the
second row never applies: the first signing's `notAfter` is the
deadline. A phone that is offline for longer than one signing then
hands each step back, as D12 section 14 rules.

The first build has only the default deadline, so it never signs under
the second row. The rule also permits a later deadline that a caller
states at the gesture, and D12's `resign` (section 5.2) then signs
under the second row. That part waits for an application that needs
it.

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

The instance has one ordering policy. A second act on a subject has
no signing while an earlier pending act on that subject is
unresolved.

A draft adds one precondition to this transaction. The instance
checks, under the same fence and before the permission mark, that
the draft still belongs to this tab. A failed check stops with
`taken` and writes nothing. No second fence exists, and no public
entry skips the fence.

One case stops before the transaction. An `also.via` selector can
pass through the reference of a pending source, which has no recorded
row yet. Step E4 stops that submit before retention and before any
signing, and it writes nothing. When the row is recorded, the same
submit takes the ordinary path. Step E5 selects through a pending
source, by a checked hypothetical view.

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

`output(a)` names a source, and a source has a key and a version.
Explore computes the version of `a` when it binds `a` (section 5.3).
Step E5 states how a composition gives each step its key and how
`output(a)` takes the version that Explore computed.

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
| The agent host | The MCP server. It holds a key and custody today. It gains a replica, the tool `explore`, and the resolution of the steps that it retained |
| The scope | Gains nothing in the first version. The method `explore` is held (section 16) |
| `dap dev` | Gains `log` and the head stream, so that a local instance runs against it. It serves neither today |

**The descriptor** is data. For each act it holds the schema of the
fields, the type of the item, the type of the item that the act
opens, the names that the guards declare, the admission of each
subject, and the sentences of `describe.ts`.

The descriptor has one digest for each act. The digest of an act
covers that content for that act, from the definition bytes. It
covers no version text, no name of the application, no path and no
other act. A release that changes only the version keeps each digest.
A change of one act's declaration changes the digest of that act, and
of each act that shares the changed content. The stored drafts and
authorizations of the other acts stay valid. A draft row and a
retained authorization each hold the digest of their own act, and the
field `descriptor` of section 7.1 stays one digest. Request DD-1
builds the digest after step C4. Its proposal states how the instance
gets the digest of an act in place of the one option of section 7.1.

Each adapter
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
9. An act whose effect writes `{ entry }` into a slot, and a later act
   on that item before the source's entry. The later exploration is
   `unavailable`.

A small model also runs to a bound over every order of its steps.

## 13. Explore comes first, and decision A comes last

| Step | Work | Needs |
|---|---|---|
| E1 | Explore for complete acts: the split of `actJudged`, the context, the result, the hypothetical view and the three symbolic names | The planner's ruling for the export, from Hugh's decision (section 16) |
| E2 | The MCP tool `explore`, on a replica in the agent host, with the same result and context | E1, C2 |
| E3 | Explore in the local instance, again at each view and each tick. `offers`, a `ref` with its sources, `recorded`, and one identity for a row. Step C4 builds the basis of a draft, the changed fields, the returned `now` and the new version after a return (section 6) | E1, C2, C4 |
| E4 | Retained authorization: the record with versions, the default deadline, three of the four operations (no new envelope for the same version), the owner and the store in memory, the transaction of a submit, the predicate | C1, C3 |
| E4-B | The browser store keeps authorizations, with the removal rule of section 7.1. It lands in the C4 head | E4 |
| E5 | Sequential dependencies: sources by key and version, the materialized act, `waits`, the returns | E4 |
| E6 | Environment resolution through MCP `settle`, React and foldkit. `dap dev` with `log` and the head stream | E3 to E5 |
| R | The reservation definition, with its scenario | Starts with E1 |
| A | Decision A: the admission of a subject, in the definition, the validator and the judge | E1 to E6, and its own design with the carrier and the kernel ruling (section 16) |

E1 needs no replica. Invariant 9 tests it against the in-memory scope.
E2 and E3 build on C2, which landed as main `26d1e65c`. The pinboard
and the map move after E5.

One part is held and has no step: the method `explore` on `ScopeApi`,
with its route. A review after E3 takes it up again (section 16).

## 14. Deferred

- **A later deadline, and a new envelope with no click.** Section 7.2.
- **The method `explore` on `ScopeApi`.** Section 16.
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

One part is not taken: a new basis without a gesture. Decision A
covers the acts that need no basis.

## 15. What this note changes in D12

| D12 | Change |
|---|---|
| Rule 3: "The client signs only when the member submits. No timer signs" | The rule of section 7.1. With the default deadline, the behavior that a member sees is D12's |
| Rule 5: the intent is built "at the replica's head" | A draft keeps the basis that it opened on. A submit of a returned draft, for either cause, takes the basis `now` that the page passes back (section 6) |
| Section 8, step 3: the stop `busy` | Stays for an `observed` subject whose pending step the act does not name. An act that names the step waits (section 7.4) |
| Section 8: an `other-recorded` request enters an empty slot as a new draft | The request waits in the list, also when its slot is empty. The new key starts at the `restore` in each case (section 6) |
| Section 8: "A stop changes no store" | No stop leaves a custody record. Most stops write nothing. A `source` stop can leave a version with no mark and no signing. Three stops leave a version and its permission mark, with one call of the signer (section 7.1): a stop of the signer, a stop of the custody write, and `full` with the reason `bytes` after the build |
| Section 8: the stops of a submit | Ten stops: `shape`, `state`, `busy`, `signer`, `store`, `full`, `taken`, `descriptor-mismatch`, `source` and `versions-full`. `full` keeps custody's reasons: `bytes`, `count`, `budget` and `signings`. An `unavailable` exploration is no stop |
| Section 9: `ClientView` and `Judged` | The view gains `explore` and `offers`, and each row gains `ref` and `recorded`. `Judged` is the exploration of a signed version |
| Section 10: no file and no export in `packages/contract` or `packages/derive` | Step E1 adds one export to `packages/derive`, and request EK-1 adds `judgeExploreGrant` (section 16) |
| Section 15: work offline for longer than one signing is not taken | Stays not taken in the first build. The rule of section 7.1 permits a later deadline (section 7.2) |

Steps C1 to C4 keep their order. C4 takes the changed rule 5 from its
first build, so no build holds the old rule. E3 lands with C4, and E4
with C3.

Custody checks the size of a record two times: before the signing,
on the caller's estimate, and after the build, on the record
(`packages/client/src/custody.ts`, the two `bytes` checks of the
first signing). The estimate is a lower bound. An act within the
envelope's own bytes of the record bound passes the first check and
fails the second, after the signer ran. The mark stays, the position
permits no second call of the signer, and the member's next submit is
a new position. Step C4 states the case as a limit and repairs
nothing.

The stop `source` is coarse. It means that the act names a source
whose row the replica does not hold. The draft stays, and the page
shows the stop. The page promises no success and starts no wait. Step
E5 owns the waits, and it can narrow the stop. The stop
`versions-full` means that the key holds 64 positions, and its remedy
is a new request key. The how-to page of step C4 gives one table:
each stop, each reason of `full`, the remedy, and what the stop
wrote.

**A call reports what the store holds.** A write that committed
returns its key, also when `close` arrived during the write. The
client publishes no view after `close`, and the next client reads the
draft from the store. A stop that follows a commit in the same call
names the commit. The table's write column states that case for
`state` and for `taken`.

## 16. Two parts enter the kernel first, one enters last, and one waits

`docs/kernel.md` section 7 admits a part to the kernel only after a
review. The review says why the part cannot be a platform service or an
application. Hugh decided the first three rows on 14 November 2026
(section 17), and the export of request EK-1 on 16 November 2026.

| Part | Enters | Why it is kernel | Decided |
|---|---|---|---|
| The judgment of an intent body under a context | `packages/derive`, as one export, in step E1 | Promise 9: the runtime and the verifier call the same functions. An exploration that runs other code is a second judge, and dap has three partial ones today | Yes. The condition: `judgeAct` gives identical answers on the replay corpus |
| The admission of a subject (decision A) | The definition form in `packages/contract/src/definition.ts`, the validator and the judge, in step A | The admission changes how the judge reads `expected`. The runtime and replay must derive one answer from one definition | Yes to the direction. The part enters last, with its own design |
| The explore read | `ScopeApi` in `packages/contract/src/transport.ts`, as one method with its argument and its answer | Each native read is a method of `ScopeApi`. Each transport must agree on the shapes, as section 7.4 of that page says for read minimums | Held |
| The judgment of a grant by value for Explore | `packages/derive`, as one function export, `judgeExploreGrant`, and no type, in request EK-1 | Promise 9: Explore and the scope judge a grant with one shared value check. A second check of a grant is a second judge | Yes, on 16 November 2026, as an exception. The bytes of a recorded grant do not change |

No part closes a K item of that page. Its section 7.1 holds a head
that adds to the kernel and closes no K item. The owner's decisions
with rulings `08c5ff25` and `4b5e0ec2` released two levels from that
hold. The export of step E1 needs a ruling of the same kind, and the
planner files it from Hugh's decision.

**The explore method waits for a stable shape.** The exploration is
the least settled type of this note. An answer shape in
`packages/contract` is closed: a new member breaks each older client
(D12 section 10), and each change needs the review of section 7 again.
Invariant 9 tests the contract of section 5.1 with no transport. So the
first version has no method and no route. The agent host explores on a
replica of its own, as a local instance does. A review after step E3
takes the method up again.

This note did not check how the MCP server reads the state of a scope
inside the runtime, which imports it (`packages/scope/src/worker.ts`).
If the server reads that state directly, step E2 does not need C2.

**Decision A enters with its own design.** That design is
[the subject admission note](2026-11-14-subject-admission.md). Hugh
decided its items on 15 November 2026, and ruling `451d3c8e` permits
the step. Two more rules of that page apply to it.

- Section 7.2 binds validation to the format `artroom-definition-1`.
  The validator refuses each member of an act that the contract does
  not define (`validate/shape.ts:64`, called at
  `validate/handlers.ts:193`). So today's validator refuses a
  definition that states an admission. Decision A needs a compatibility
  review and a carrier: a new format, an optional part with its own
  version, or a gate by cohort. This note recommends an optional part
  of the definition with its own version, as `level` and `capacity`
  are (promise 3). The act form then stays as it is, an older
  validator refuses the part, and one table holds the new grammar. The
  design of step A rules on the carrier.
- K5 counts each form that the validator and the judge both read.
  Decision A adds one form to that count, unless the one grammar table
  of K5 lands first.

This note read the rule that `level` and `capacity` carry versions,
and not their code. It did not check whether a room needs a Rules
cohort to install a definition with a new part, as section 7.3
requires for the `reference` field type. The step A note answers the
question: no such gate exists, and each room installs the part when
its Worker has the code.

**A change to act admission needs the absence proof in its review.**
A client ends an expired request as absent on evidence from the
scope (ruling `98c1dba9`). That proof rests on one rule of admission:
the scope refuses an act after its `notAfter`, so a kept envelope
cannot enter a later entry. An admission path that records an act
below the time of the existing head makes the proof unsound. The
checker stated this fact in approval `1e7574bd`.

**The rest stays outside the kernel.** The types of the act, the
context and the exploration live in `packages/client`, which
`packages/scope` and `packages/mcp` import today. No recorded entry
needs those types to be derived again, so they pass the test of section
2 of that page.

This note adds no scope kind, no platform definition name, no
capability name or form, and no new model of the record. It adds one
MCP tool, `explore`, to the tools of a declared scope, and no tool
family. An authorization is a record of the client's store. It is not
a record of a scope.

## 17. Hugh's decisions of 14 November 2026

Hugh decided each item as this section states it, with the words
"yes - agreed".

1. **Decision A: yes.** A definition states a subject's admission,
   `observed` or `current`. The environment gives no step a new basis
   by itself, with decision A or without it. Step A is the last step,
   and its design rules on the carrier (section 16).
2. **The authorization rule in place of D12 rule 3: yes.** The first
   build has only the default deadline of one signing lifetime
   (section 7.2).
3. **The change of D12 rule 5: yes.** A draft keeps its basis, and a
   submit of a returned draft is a new version. C4 takes the rule from
   its first build.
4. **The export of the body judgment from `packages/derive`: yes.**
   The condition: `judgeAct` gives identical answers on the replay
   corpus.
5. **One owner key for each step: yes.** One store coordinates its
   processes, and a second device signs nothing for the step.
6. **The method `explore` on `ScopeApi`: held.** Step E2 takes the
   form with no kernel part. A review after step E3 takes the method
   up again (section 16).
7. **The third symbolic name, `{ entry }`: yes,** with the coarse rule
   of section 5.4.

Hugh ratified the note on 14 November 2026, after its review.

## 18. Rulings of step E1

The build of step E1 found six points that this note did not settle.
The planner ruled on each on 14 November 2026, and the sections above
hold the results.

| Ruling | Point | Section |
|---|---|---|
| `fa103f71` | The caller gives the key, Explore computes the version, and the result states its source | 3, 5.3, 8.1 |
| `ef1fc932` | A judgment that reads the signed intent is `unavailable`. The export is `judgeActBody` | 5.4 |
| `04218678` | A command record of `device-command` takes the name `{ entry }` | 5.4 |
| `18a41f8f` | A hold workspace that writes a derived record or an operation is `unavailable` | 5.4 |
| `99506fe3` | Explore does not predict the capacity check of the turn | 5.1 |
| `1bdf9467` | A pending output has no number. Three identity comparisons stay determinate | 5.4 |

The requests of the build steps: E1 `d35ebede`, E2 `a102d847`, E3
`17e075b3`, E4 `afe0a437`, E5 `b1c6aad6`, E6 `edc09d8b`, R `5b5b6896`
and A `04e4438e`. Request `6b6def0a` holds the review after step E3.

## 19. Rulings of steps E4 and C4

The build of step E4, the plan of step C4 and the requests EK-1,
ES-1, DD-1 and E4-C found points that this note did not settle. The
planner ruled on each on 15 and 16 November 2026, and the sections
above hold the results.

| Ruling | Point | Section |
|---|---|---|
| `34791662` | A position names a gesture. The descriptor digest is a required option. A signing with no reference is `legacy`. The authorization write comes first | 7.1 |
| `f494b29d` | One position permits one call of the signer, and a failed signing keeps its mark | 7.1, 15 |
| `686dc913` | The instance has one ordering policy | 7.4 |
| `63f034d9` | A selection through a pending source stops before retention. Step E5 owns it | 7.4 |
| `52b638a9` | The store keeps the history of a key, with at most 64 positions | 7.1 |
| `d48ce431` | Step C4 owns the exploration at a submit and the basis of a draft. Step E4-B owns the browser store | 6, 7.1, 7.4, 13 |
| `16211297` | A context reader at the constructor gives the exploration its inputs. An `unavailable` exploration stops no submit | 6 |
| `13bbb177` | The first adapter is the replica alone, with `standing` null. The basis check comes before the grant check | 6 |
| `22ae2bd0`, `850da1af` | A submit has ten stops. `source` is coarse, and `versions-full` is its own stop | 15 |
| `9930cf7f` | A stop leaves one of three results. The second size check of custody can refuse after the signer ran | 15 |
| `4dffc26a` | A `ref` is a value. The basis of a subject is read when the draft first names that subject | 6.1 |
| `d038a2ee` | The standing of an instance is open. The owner decides the change of `packages/derive`. `695a1839` answers it | 5.7 |
| `c1b26daf` | An optional item field can stay absent in a slot. An edit is a patch that never clears. `clear(slot, fields)` is its own call | 6.1 |
| `bbee5700` | The client takes one required draft store. A call owns its inputs before its first wait. A call reports what the store holds | 6, 15 |
| `ff578fef`, `481aac4e` | A draft changes only by a call of the member. The two stored forms of a return that these rulings set are replaced by `77a253b9` | 6, 15 |
| `fc765743` | An `other-recorded` request waits in the list, and `restore(key)` starts the new key | 6, 15 |
| `77a253b9`, `a6f98773` | One submit. The view computes `now` for every subject of the act, and the page passes it back. A return has one stored shape and two causes. No hidden retry | 6, 6.1, 15 |
| `e19f27b5`, `357c2195`, `c79545a3`, `bc447034`, `6d3b979f` | A held intention has three reasons and the optional place of a verified entry | 6 |
| `6d3b979f` | A request with a stored draft shows as a draft. Each arm of the list carries `is` | 6 |
| `0967101f` | The fold of custody is its own background step, and no view depends on it | 6 |
| `81711f39` | A call decides on what it read. Outcome writes stay outside the fence. The marker rule | 6 |
| `695a1839`, `a9056244`, `25f241cc`, `bb2f7f17` | The session answer carries the standing when the client asks. The membership replica waits | 5.7 |
| `77a253b9`, `25f241cc`, `bb2f7f17` | `packages/derive` exports `judgeExploreGrant` and no type, by the owner's exception of 16 November 2026 | 5.7, 15, 16 |
| `17e10e32` | One descriptor digest for each act | 10 |
| `01c542cc` | One fold for each source entry of an authorization | 7.2 |

Request `4bd07278` holds step E4-B.
