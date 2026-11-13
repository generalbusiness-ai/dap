# One client for a declared scope

Status: current. Draft 1, for request `e5b86654`. Nothing here is built.

A page shows a scope and lets a member act on it. Today the page author
assembles that from parts: a signer, a handle, a fold, a store of sent
requests and a rule for each answer. The dap-foldkit adapter did this in
1,374 lines, and two reviews on 13 November 2026 reproduced eleven faults
in it. Each fault is a decision that the author made and that the
definition or the record already settles.

This note designs one client in `packages/client` that makes those
decisions. The author passes a declared definition one time. The author
then writes views, the words for each outcome, and one typed call for
each control. Every fact below is read at main `64112e45`.

Hugh made two decisions on 13 November 2026 that this note takes as
given. An edited retry goes under the same key. The replica moves into
`packages/client` now.

## 1. A comment box, as the author writes it

`shared-map` declares an act `comment` with an `item` field `place` and
a text field `text`. The author writes one client for the scope and one
slot for the control.

```ts
const handle = await declaredHandle(scope, sharedMap)
const client = scopeClient(handle, { signer, store })

const box = client.slot("comment", { place })   // typed from sharedMap

client.view.drafts.get(box)      // { text?: string }, for the text area
client.edit(box, { text })       // the member types
client.submit(box)               // the member clicks Post
client.view.requests             // each request that is not yet settled
client.view.rows("comment")      // the recorded comments, typed
```

Each name in a code block of this note is a sketch, and a build step
can change it. The author writes no key, no retry, no timer, no store
call and no handler for an answer. The author renders the five statuses
of a request. Section 6 defines them.

## 2. One request, in five cases

Ana types "Bridge is closed" at a place and clicks Post. The client
gives the draft a key, `k1`, when Ana types the first character.

**The reply arrives.** The client signs the comment under `k1`, keeps the
signed bytes, and sends them. The scope seals entry 41 and answers with a
receipt. The client reads the journal to entry 41. The comment shows as
recorded.

**The reply is lost.** The client reads the journal first. Entry 41 holds
`k1`, so the client sends nothing more and the comment shows as recorded.
If the journal does not hold `k1`, the client sends the same bytes again.
The scope gives a key to one intent of an actor for the life of the
scope, so two copies of the bytes make one entry.

**The scope refuses the comment at one head.** Ben removed the place in
entry 40. The scope answers `refused`, `no-item`, judged at head 40. The
client reads the journal to head 40. The text goes back to the comment
box with the reason. `k1` stays with the draft.

**Ana edits the returned text and posts again.** The client signs the
new text under `k1` and sends it. If no copy of the first bytes is in
flight, the scope judges only the new bytes. If a lost copy of the first
bytes arrives first, the scope seals it and answers `mismatch` to the
new bytes. The page then shows the first text as recorded and says "Your
earlier version is posted." The edit is in the comment box as a new
draft with a new key. The record holds one comment in each order.

**Ana reloads the page.** The client reads its stores. The draft has its
key and its text. Each sent request has its signed bytes. The client
folds the journal and shows each request with its status. No request is
signed again by the reload.

## 3. Terms

A **request** is one thing that a member asks for: one comment, one edit
of one place. A **key** is 16 random bytes that identify one request, in
the form that `newIdempotencyKey` gives. A **signing** is one signed
intent of a request. A request can have more than one signing, and every
signing of it carries its key.

A signing is **dead** when the client's clock is past its `notAfter` by
`EXPIRY_MARGIN_MS` (60 s, `packages/client/src/originals.ts:17`). It is
also dead when the scope refused it with a reason of class `never`. A
signing that is not dead is **live**.

A **copy** is one send of a signing. A copy is **in flight** when its
signing is live and the client holds no answer for that send. A lost
reply and the answer `unavailable` are not answers.

The **replica** is the client's fold of the scope's journal, from the
genesis entry to a head. The **record** is the scope's journal. A
**custody record** is the entry that `Custody` keeps for one key in the
client's store.

The **class** of a refusal reason is `never`, `head` or `protocol`.
Request RC-1 (`b0fe0668`) exports the class of each of the 36 reasons.
The confirmed table has 6 reasons of class `never`, 5 of class
`protocol` and 25 of class `head`. `revision-moved`, `final` and
`expired` are of class `head`.

## 4. Keys and signings

1. A draft takes a key when the member first changes an empty slot.
2. Every signing of the draft's request carries that key.
3. The client signs only when the member submits. No timer signs.
4. A request ends when the record holds its key, or when the member
   discards its draft. The next draft in that slot takes a new key.
5. A submit of returned values that are unchanged sends the same bytes
   again if the signing is live. If the signing is dead, the client
   signs the same values again under the same key.
6. A submit of returned values that the member changed signs the new
   values under the same key.

The scope's rule is at `packages/derive/src/judge.ts:218-222`. The first
sealed intent of an actor under a key holds the key. The same bytes
get the receipt of that entry again. Other bytes get `mismatch`. Rules
1 to 6 therefore give one entry for one request, whatever the page
remembers and whatever the network delivers. The client does not have to prove
that an earlier signing is dead before it signs again.

Rule 3 keeps each signature the result of a member's action. A request
whose signing dies with no answer returns to its slot, and section 7
gives the times.

## 5. Custody of a request

`Custody` (`packages/client/src/custody.ts`) keeps one exact envelope
for each key today. Another meaning under the key throws `conflicting`.
Any refusal makes the record terminal (`:404`), and `settle` returns at
once for a terminal record (`:421`). Four changes follow.

### 5.1 A record holds the signings of one request

The custody record takes version 2.

```ts
interface Signing {
  intent: Digest            // digest of the signed intent
  meaning: Digest           // digest of what the member asked
  notAfter: Timestamp
  envelope?: Envelope       // kept while section 5.1 requires it
  never?: true              // refused with a reason of class `never`
}
interface CustodyRecord { v: 2; signings: Signing[]; /* as version 1 */ }
```

Each outcome gains the index of its signing. A version 1 record reads as
a version 2 record with one signing, and its outcomes belong to that
signing. `Custody` writes version 2 for each new record.

`Custody` keeps the envelope of the latest signing. It also keeps the
envelope of each earlier signing that has a copy in flight. A record
holds at most 8 envelopes and 64 signings. A further signing is refused
`full`, reason `signings`, and nothing is signed.

### 5.2 A caller can permit a new signing

`send` gains the option `resign: true`. With it, `Custody` keeps and
sends a new signing in two cases. The record's phase is `refused`. Or
the phase is `sent` or `unknown` and the latest signing is dead. In each
other case another meaning under the key throws `conflicting`, as today.

A caller that does not pass `resign` gets the behavior of today. The MCP
service, the hosted agent and the CLI install do not pass it.

### 5.3 A refusal settles nothing

No refusal proves that the record stays without the request. A reason of
class `never` proves it for one signing. So the phase `refused` keeps
its place in the stored vocabulary and loses its finality.

- `refused` stays terminal for capacity and for sending. `Custody` sends
  nothing for the record until the caller submits again, and the record
  does not count in the 256 unresolved records. A member cannot fill a
  shared store with refusals.
- A record of phase `refused` moves to `accepted` on proof that the
  scope sealed one of its signings.
- `settle` asks the scope for a `refused` record while a copy of it is in
  flight. When the last such signing dies, `settle` asks one more time.
  After a `not-found` for each kept envelope, it asks no more.
- `settle` asks with each kept envelope, newest first. A receipt names
  the signing that the scope sealed.

The answer `mismatch` to a record with one signing makes the phase
`mismatch`, as today. For a record with more signings, `Custody` settles
the earlier kept envelopes in the same call. A receipt makes the phase
`accepted` for that signing. `not-found` for each makes the phase
`mismatch`: an intent that this store does not hold has the key.

An earlier signing with no kept envelope cannot hold the key. Each of
its copies got a refusal, and a copy is judged one time.

### 5.4 The replica can settle a record

`Custody` gains `folded(identity, { fact, intent })`. The caller states
that a verified journal entry holds the key with that intent. `Custody`
appends the outcome and moves the record to `accepted`, from any phase
but `accepted`, `archived` and `settled`. The call makes no request to
the service. `ScopeHandle.log` verifies each page against the summary,
and request FG-1 (`212e97dd`) adds the check of the genesis definition.

The store port gains one read: the records of one signer at one target
that the page still shows. Section 6 lists them.

## 6. Status of a request

The client folds each entry of the journal into the replica. For an
entry of its own signer, it reads the custody record of the entry's key
and calls `folded`. A reload folds from the genesis entry or from a kept
replica, so the client meets each of its own entries.

A request has one status. The status is a function of the replica at
its head, the custody record and the clock. Nothing else is an input.

| Status | Condition | The member sees |
|---|---|---|
| `recorded` | The replica holds the key, and the sealed intent has the meaning of the latest signing | The change, confirmed |
| `other-recorded` | The replica holds the key with another meaning | The recorded version. The later values are in their slot as a new draft |
| `pending` | The replica does not hold the key. The phase is `prepared`, `sent` or `unknown`, and the latest signing is live | The change, marked as not confirmed |
| `withdrawn` | The replica does not hold the key. The request is returned, and a copy of it is in flight | The reason, and "can still be posted". The values are in their slot |
| `refused` | The replica does not hold the key. The request is returned, and no copy of it is in flight | The reason. The values are in their slot |

A request is **returned** in two cases. The scope's latest answer to its
latest signing is a refusal. Or its latest signing is dead and no answer
came. The status carries the cause.

```ts
type Why =
  | { by: "scope"; reason: RefusalReason; name?: string; class: RefusalClass }
  | { by: "client"; reason: "unsent" }
```

The client compares meanings, not intent digests. Two signings of the
same values differ in `notAfter` and have one meaning. The client
computes the meaning of the sealed intent from the entry in the replica,
so `recorded` and `other-recorded` need no kept envelope.

### 6.1 An answer waits for its head

An answer names a head: `judgedAt` for a refusal and the sequence of the
receipt's fact for an acceptance. The client keeps each answer in the
custody record at once. The status function reads only the outcomes
whose head the replica holds. A request with a later answer is `pending`
until the replica reaches that head.

An answer is also a reason to read. The client reads the journal to the
answer's head at once and does not wait for the feed. `mismatch` and
`unavailable` name no head. After a `mismatch`, the client reads the
journal to its current head, and the replica then holds the key.

So the status has no stage between an answer and its head. A refusal
that arrives while the feed is down leaves the request `pending`, with
its values in the list of requests, and the client's state says
`behind`.

### 6.2 A status can change after it settles

`refused` and `withdrawn` are statements about one head and one clock.
If a late copy takes effect, the replica holds the key at a later head
and the status becomes `recorded` or `other-recorded`. The page never
shows a recorded request as refused once the replica holds its entry.

### 6.3 A reason of class `protocol` stops the client

`misaddressed`, `unknown-act`, `unknown-message`, `wrong-pin` and
`unsupported-definition` mean that the client and the scope disagree on
the address or the definition. The request returns with its reason. The
client's state becomes `stopped`, and it sends nothing more to the
scope.

## 7. Times of a send

`Custody` has no timer, and it gets none. The MCP service decides when
to send. The client of this note has one schedule, in one place.

| Event | Rule |
|---|---|
| Lifetime of a signing | `DEFAULT_LIFETIME_SECONDS`, 300 s. An option of the client sets it, to the contract's bound of 900 s |
| No reply to a send | Lost after 30 s |
| A lost reply or `unavailable` | Read the journal to its head. If the replica holds the key, send nothing |
| Send again | The same bytes, 1 s after the read, then 2, 4, 8 and 16 s, then each 30 s |
| The feed returns | Send each pending request at once, one copy at a time for a request |
| `notAfter` passes | Send nothing more for that signing |
| The signing dies with no answer | The request returns, `unsent` |

The client holds one timer, set to the earliest time that any request
is due. `close()` clears the timer and cancels the observation. No other
function ends the client. On a reload, the client reads its custody
records and continues the schedule.

With the default lifetime, a request that gets no answer returns to the
member after 6 minutes. A page for long work offline needs more than
that, and this note does not design it.

## 8. Slots and drafts

A **slot** is where one draft lives. It follows from the declaration of
the act in `acts[k]`.

| Shape of the act | Example | The slot |
|---|---|---|
| Opens an item, and has no field of type `item` | `add-place` | The kind |
| Opens an item, and has a field of type `item` | `comment` | The kind and the value of each `item` field |
| A transition | `edit-place` | The kind and the item that the act is on |

The other fields of the act are the draft's value, each optional until
the submit. The types come from the definition, as `AskedOf` gives them
today (`packages/client/src/declared.ts:67`). A slot holds at most one
draft. An act that opens an item and names no item has one slot for the
kind, so the member writes one new place at a time and can have more
than one pending.

`submit(slot)` is one operation with four steps.

1. Check the values with `shapeDeclaredAct`. A fault leaves the draft in
   the slot and returns the faults.
2. Check admission. The client's state is `current` or `behind`. For a
   transition, the member has no pending request on the same item.
3. Take the draft out of the slot.
4. Sign under the draft's key, keep the signing in custody, and send.

When step 1 or 2 refuses, the call returns the cause and changes
nothing. Steps 3 and 4 happen together or not at all.

The values of a returned request go back to their slot, because the
slot is a function of the request. If the slot holds a newer draft, the
returned request stays in the list of requests with its values. The
member can then dismiss it or put it back. A put-back exchanges the
two. From the click to the end of the request, the values are in a slot, in
the list of requests or in the record.

The other calls are `edit(slot, values)`, `discard(slot)`,
`restore(key)` and `dismiss(key)`.

The client keeps drafts and dismissals in a draft store, a second port
beside the custody store. Both ports have a memory form. A browser
adapter supplies forms that survive a reload. Two tabs that share the
stores share a draft's key. If both tabs sign, the scope seals one
signing, and each tab shows `recorded`.

## 9. The view

The client publishes one value, whole, on each change.

```ts
interface ClientView<D> {
  state: "starting" | "current" | "behind" | "folding" | "stopped"
  head: Head | null
  rows<T extends TypeOf<D>>(type: T): readonly Row<D, T>[]
  row(ref: ItemRef): Row<D> | null
  requests: readonly RequestView<D>[]
  drafts: ReadonlyMap<Slot<D>, DraftView<D>>
}
interface RequestView<D> {
  key: string; slot: Slot<D>; values: Values<D>
  status: Status; why?: Why
  predicted: Judged | null
}
```

The view holds no signed bytes. `rows` and `row` read an index that the
client builds one time for each view. A pending request has a row from
the click, with the member's values and a mark.

`state` has five values, and the view carries it. `starting`: the
replica does not hold the genesis entry. `current`: the replica is at
the feed's head. `behind`: the feed is down, or an answer names a later
head. `folding`: the client folds again from the genesis entry. `stopped`
is final.

`predicted` is the status of the latest signing at the replica's head.
The client exports the function that computes it.

```ts
type Judged =
  | { is: "recorded"; fact: FactRef }
  | { is: "write"; effects: readonly Effect[] }
  | { is: "refused-here"; reason: RefusalReason; class: RefusalClass }
  | { is: "never"; reason: RefusalReason }
  | { is: "not-judged" }
```

The function calls `judgeAct` of `packages/derive` and reads the class
from RC-1's table. It lives in `packages/client`. It adds nothing to
the kernel.

## 10. Answer shapes stay as they are

`mismatch` carries only its reason (`packages/contract/src/result.ts:80`),
and `settle` answers `not-found` when another intent holds the key
(`packages/scope/src/core.ts:806-822`). Neither shape changes.

A client with a replica reads which intent holds a key from
`state.accepted(actor, key)`, with no request. A client with no replica
settles each kept envelope, at most 8 reads. A new member on `mismatch`
breaks each older client, because the client's check of an answer is a
closed shape (`packages/client/src/answers.ts:72-74`). It also needs the
review of `docs/kernel.md` section 7.

This note adds no scope kind, no platform definition name, no
capability, no tool family and no record model. It adds no file and no
export to `packages/contract` or `packages/derive`. It names no K item.

## 11. Packages

The client is a new entry of `packages/client`,
`@generalbusiness/dap-client/scope`. That entry imports
`@generalbusiness/dap-derive`, a new dependency of the package. The root
entry does not import it, so a page that uses only the root entry keeps
its size. `packages/derive` has no Node import. The first build step
that adds the import measures the entry's bundle and states the bytes.

An adapter for a UI framework holds four things: a Model field for the
`ClientView`, one Message that carries a new view, one Subscription to
the client, and the typed calls of section 8 as Commands. The client is
a host object outside the Model. An adapter keeps no key, no timer, no
store, no class of reason and no copy of a status.

The room page keeps copies of a member's requests at the membership
scope, so a second device can send them
([the note on devices](2026-10-31-signed-requests-across-devices.md)).
This note does not change those routes.

## 12. Tests

One generated suite drives the client against the in-memory scope: 400
seeds of 80 steps, with fixed seeds. A step is one of these: type,
submit, discard, restore, dismiss, lose a reply, hold a copy, deliver a
held copy, an act of another member, stop the feed, start the feed,
advance the clock past a `notAfter`, reload, and act in a second tab.
The suite checks seven invariants after each step.

1. The record holds each key at most one time.
2. A request whose entry the replica holds shows `recorded` or
   `other-recorded`.
3. Each value that the member submitted is in exactly one place: a slot,
   the list of requests or the record.
4. The client sends no bytes that custody does not hold.
5. The number of keys equals the number of drafts that the member
   started.
6. The published view equals the view computed again from the replica,
   the custody records and the draft store.
7. After `close()`, no timer and no observation remain.

Custody has its own cases. A literal version 1 record reads as version 2
and settles. Each rule of section 5.3 has one case. The MCP witnesses of
NF-3 keep their behavior, and each takes a new literal for the version 2
bytes, captured one time.

## 13. Order of work

NF-5 (`c288c917`) moves the browser onto `Custody` and retires `Kept`
and `AttemptJournal`. It writes a browser store for custody records.
That store is written one time if the record already has version 2. So
step C1 goes first, then NF-5. NF-5 does not wait for steps C2 to C4.

| Step | Work | Needs |
|---|---|---|
| C1 | Custody record version 2: signings, `resign`, the rules of 5.3, `folded`, the read by target | The cutover head |
| NF-5 | As filed, on version 2 | C1 |
| C2 | The replica: fold of a declared scope from `ScopeHandle.log` and `observeScope`, the five states, `Judged`, typed rows with their index | RC-1, FG-1, IE-1 |
| C3 | Requests: the status function, answers that wait for their head, the schedule, the view | C1, C2 |
| C4 | Slots and drafts: slot types, the draft store, the five calls | C3 |

Each step lands with its part of the generated suite. Each step is one
request to the builder, filed after Hugh ratifies this note. dap-foldkit
then replaces its replica, outbox and engine with the client.

## 14. Not taken

**A scope that remembers refusals.** The request excludes it. One key
for one request gives one entry with no change to the scope.

**A `mismatch` that names the entry.** Section 10 gives the reason.

**A signing with no member action.** A client that signs again on a
timer can post a comment an hour after the click. Rule 3 keeps the
signature with the click. Work offline for longer than one signing is a
separate design.

**A judge that makes more reasons `never`.** `revision-moved`, `final`
and `expired` each become `never` with a change to the judge, and a
split of `bad-intent` and `bad-field` does the same for most of their
cases. Each changes an answer of the kernel. The design does not need
them, because the status of a request never rests on a refusal alone.

## 15. Where each item of the request is ruled

| Item of `e5b86654` | Section |
|---|---|
| 1. Successive envelopes under one key | 4, 5.1, 5.2 |
| 2. The refusals that resolve a record | 5.3, 6 |
| 3. A late acceptance, and "another version holds this key" | 5.3, 5.4, 6.2 |
| 4. Custody checked against a replica | 5.4, 6 |
| 5. A view of custody for a page | 9 |
| 6. The schedule and the timeout | 7 |
| 7. The draft slot and the one operation | 8 |
| 8. Answers after the replica reaches their head | 6.1 |
| 9. The shapes of `mismatch` and `Settlement` | 10 |
| 10. What stays in an adapter | 11 |
| 11. Order against NF-5 | 13 |
| 12. Tests | 12 |
