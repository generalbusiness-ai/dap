# One client for a declared scope

Status: current. Hugh ratified this note on 13 November 2026, for request
`e5b86654`. The review of the checker then added the rule of 5.1 for a
record that holds 8 envelopes. An amendment of 13 November 2026 adds
section 5.5 for request `43de81ee`. Nothing here is built. Section 13
lists the build steps.

A page shows a scope and lets a member act on it. Today the page author
assembles that from parts: a signer, a handle, a fold, a store of sent
requests and a rule for each answer. The dap-foldkit adapter did this in
1,374 lines, and two reviews on 13 November 2026 reproduced eleven faults
in it. Each fault is a decision that the author made and that the
definition or the record already settles.

This note designs one client in `packages/client` that makes those
decisions. The author passes a declared definition one time. The author
then writes views, the words for each outcome, and one typed call for
each control. Every fact below is read at main `57e893c0`.

Hugh made two decisions on 13 November 2026 that this note takes as
given. An edited retry goes under the same key. The replica moves into
`packages/client` now.

## 1. A comment box, as the author writes it

`shared-map` declares an act `comment` with an `item` field `place` and
a text field `text`. The author writes one client for the scope and one
slot for the control.

```ts
const handle = await declaredHandle(scope, sharedMap)
const client = scopeClient(handle, { signer, store, drafts })

const box = client.slot("comment", { place })   // typed from sharedMap

client.view.drafts.get(box)      // the draft, for the text area
client.edit(box, { text })       // the member types
client.submit(box)               // the member clicks Post
client.view.requests             // requests that are out of their slot
client.view.rows("comment")      // the recorded comments, typed
```

Each name in a code block of this note is a sketch, and a build step
can change it. The author writes no key, no retry, no timer, no store
call and no handler for an answer. The author renders the five statuses
of a request. Section 6 defines them.

## 2. One request, in five cases

Ana types "Bridge is closed" at a place and clicks Post. The client
gave the draft a key, `k1`, when Ana typed the first character.

**The reply arrives.** The client signs the comment under `k1`, keeps the
signed bytes, and sends them. The scope seals entry 41 and answers with a
receipt. The client reads the journal to entry 41. The comment shows as
recorded.

**The reply is lost.** The client reads the journal first. If entry 41
holds `k1`, the client sends nothing more and the comment shows as
recorded. If the journal does not hold `k1`, the client sends the same
bytes again. The scope gives a key to one intent of an actor for the
life of the scope, so two copies of the bytes make one entry.

**The scope refuses the request at one head.** Ana changes the name of a
place under key `k2`. Ben changed the same place in entry 40. The scope
answers `refused`, `revision-moved`, judged at head 40. The client reads
the journal to head 40. Ana sees Ben's version of the place, and her
values are back in the form with the reason. `k2` stays with the draft.
Ana clicks Save again. The client builds the request from her values at
head 40, with the new revision, and signs it under `k2`.

**A lost copy arrives after an edit.** One copy of Ana's comment gets no
reply. The next copy is refused `type-full`, and the text returns to the
box with the reason. Ben then removes a comment, so the type has room,
and the box says "can still be posted". Ana changes the text and posts
again. The client signs the new text under `k1`. If the lost copy
arrives first, the scope seals it and answers `mismatch` to the new
bytes. The page then shows the first text as
recorded and says "Your earlier version is posted." The edit is in the
box as a new draft with a new key. The record holds one comment in each
order.

**Ana reloads the page.** The client reads its stores. The draft has its
key and its text. Each sent request has its signed bytes. The client
folds the journal and shows each request with its status. The reload
signs nothing.

## 3. Terms

A **request** is one thing that a member asks for: one comment, one edit
of one place. A **key** is 16 random bytes that identify one request, in
the form that `newIdempotencyKey` gives. A **signing** is one signed
intent of a request. A request can have more than one signing, and every
signing of it carries its key.

The **meaning** of a signing is a digest of its kind, the item that it
is on, its fields and the digests of its values. The meaning excludes
`expected` and `notAfter`. Two signings of the same values at two heads
have one meaning.

A signing is **dead** in three cases. The client's clock is past its
`notAfter` by `EXPIRY_MARGIN_MS` (60 s,
`packages/client/src/originals.ts:17`). The scope refused it with a
reason of class `never`. The scope refused it `expired`. A signing that
is not dead is **live**.

A **copy** is one send of a signing. A copy is **in flight** when its
signing is live and the client holds no answer for that send. A lost
reply and the answer `unavailable` are not answers. An **attempt** is
the set of copies that the client sends after one submit of the member.

A signing is **closed** when it cannot hold the key. A signing closes in
four cases. A settlement read after its death answers `not-found`. The
caller states with `absent` that a journal read to a head after its
death does not hold the key. The scope answers `mismatch` to it. Or a
verified journal entry holds the key with another intent, and the
caller states it with `folded`. A refusal alone closes no signing.

The **replica** is the client's fold of the scope's journal, from the
genesis entry to a head. The **record** is the scope's journal. A
**custody record** is the entry that `Custody` keeps for one key in the
client's store.

A **draft** is the values of one request while the member has them. It
has a key from the member's first edit. It lives until the member
discards it or its request ends, whatever its values. A draft with no
text is a draft.

The **present values** of a request are the values of its draft while
the member has the draft. While the request is pending, they are the
values of its latest signing, read from custody.

The **class** of a refusal reason is `never`, `head` or `protocol`.
Request RC-1 (`b0fe0668`) exports the class of each of the 36 reasons.
The confirmed table has 6 reasons of class `never`, 5 of class
`protocol` and 25 of class `head`. `revision-moved`, `final` and
`expired` are of class `head`.

## 4. Keys and signings

1. A draft takes a key at the member's first edit of an empty slot.
2. Every signing of the draft's request carries that key.
3. The client signs only when the member submits. No timer signs.
4. A request ends when the record holds its key, or when the member
   discards its draft. The next draft in that slot takes a new key.
5. At each submit the client builds the intent from the draft's values
   at the replica's head. If a live signing equals the built intent
   apart from `notAfter`, the client sends that signing's bytes again.
6. In each other case the client signs the built intent under the same
   key. The values can be the same or changed.

The scope's rule is at `packages/derive/src/judge.ts:225-229`. The first
sealed intent of an actor under a key holds the key. The same bytes get
the receipt of that entry again. Other bytes get `mismatch`. Rules 1 to
6 therefore give one entry for one request, whatever the page remembers
and whatever the network delivers. The client does not have to prove
that an earlier signing is dead before it signs again.

Rule 5 never sends bytes whose `expected` revision the replica shows as
old. A scope's answer `expired` makes the signing dead, so a client with
a slow clock signs again at the next submit.

Rule 3 keeps each signature the result of a member's action. A request
whose signing dies with no answer returns to the member, and section 7
gives the times.

## 5. Custody of a request

`Custody` (`packages/client/src/custody.ts`) keeps one exact envelope
for each key today. Another meaning under the key throws `conflicting`.
Any refusal makes the record terminal (`:406`), and `settle` returns at
once for a terminal record (`:423`). Four changes follow.

### 5.1 A record holds the signings of one request

The custody record takes version 2.

```ts
interface Signing {
  intent: Digest            // digest of the signed intent
  meaning: Digest
  notAfter: Timestamp
  envelope?: Envelope       // kept until the signing is closed
  dead?: "never" | "expired"   // from an answer of the scope
}
interface CustodyRecord { v: 2; signings: Signing[]; /* as version 1 */ }
```

Each outcome gains the index of its signing. A version 1 record reads as
a version 2 record with one signing, and its outcomes belong to that
signing. `Custody` writes version 2 for each new record.

`Custody` keeps the envelope of the latest signing while the record is
open. It keeps the envelope of each earlier signing until that signing
is closed. After a new signing, a record holds at most 8 envelopes and
64 signings.

`Custody` checks both bounds before it signs. A record that holds 8
envelopes of signings that are not closed, or 64 signings, refuses a
further signing: `full`, reason
`signings`. Nothing is signed, and the draft keeps the member's values
(section 8). `Custody` drops no envelope to make room, because the
scope can seal the signing of each envelope that is not closed. A
submit signs again after one signing closes. A signing closes at the
latest when a read after its death does not hold the key (5.3, 5.4).

### 5.2 A caller can permit a new signing

`send` gains the option `resign: true`. With it, `Custody` keeps and
sends a new signing in two cases. The record's phase is `refused`. Or
the phase is `prepared`, `sent` or `unknown` and the latest signing is
dead. Each
new signing starts a new attempt. In each other case another meaning
under the key throws `conflicting`, as today.

A caller that does not pass `resign` gets the behavior of today. The MCP
service, the hosted agent and the CLI install do not pass it. The
existing option `resubmit: true` sends the same bytes of a `refused`
record again, and rule 5 uses it.

### 5.3 A refusal settles nothing

No refusal proves that the record stays without the request. A reason of
class `never` proves it for one signing. So the phase `refused` keeps
its place in the stored vocabulary and loses its finality.

- `refused` stays terminal for capacity and for sending. `Custody` sends
  nothing for the record until the caller submits again, and the record
  does not count in the 256 unresolved records. A member cannot fill a
  shared store with refusals. A `refused` record keeps the envelope of
  its latest signing, and of each earlier signing only until that
  signing is closed. The store keeps the record as it keeps each
  terminal record.
- A record of phase `refused` moves to `accepted` on proof that the
  scope sealed one of its signings.
- `settle` asks the scope for a `refused` record while one of its
  signings is not closed. It asks with each kept envelope, newest first.
  A receipt names the signing that the scope sealed. A `not-found` for
  an envelope whose signing is dead closes that signing.

The answer `mismatch` to a record with one signing makes the phase
`mismatch`, as today. For a record with more signings, `Custody` settles
the earlier kept envelopes in the same call. A receipt makes the phase
`accepted` for that signing. `not-found` for each makes the phase
`mismatch`: an intent that this store does not hold has the key.

A scope whose clock is behind the client's by more than the margin can
seal a signing after its `not-found`. The custody record then reads
`mismatch` at the next send. The status of section 6 stays right,
because it reads the replica.

### 5.4 The replica can settle a record

`Custody` gains `folded(identity, { fact, intent })`. The caller states
that a verified journal entry holds the key with that intent. The call
makes no request to the service. If the intent is a signing of the
record, `Custody` appends the outcome and moves the record to
`accepted`. If it is not, the phase becomes `mismatch`. A record of
phase `accepted`, `archived` or `settled` does not change.

`ScopeHandle.log` verifies each page against the summary, and request
FG-1 (`212e97dd`) adds the check of the genesis definition.

`Custody` gains `absent(identity, signing, head)`. The caller states
that a verified journal, read to that head after the signing died, does
not hold the key. For an earlier signing, `Custody` closes the signing
and drops its envelope. For the latest signing, section 5.5 applies.
The caveat of section 5.3 for a slow clock applies in the same way.

The store port gains one read: the open and returned records of one
signer at one target. Each store port also gains a signal that another
client changed the store.

### 5.5 A record ends when its latest signing is dead and absent

Ana's page lost every reply of a request, and the signing expired. A
read after the death does not hold the key. Nothing that the store
holds can still take effect, but sections 5.1 to 5.4 give that record
no end. Its phase stays `prepared`, `sent` or `unknown`, and it counts
in the 256 unresolved records for good. A member who gives up 256
requests fills the store.

The rule: `absent` for the latest signing ends the record.

- The record's phase is `prepared`, `sent` or `unknown`, and its latest
  signing is dead. The caller states `absent` for that signing at a
  head. `Custody` closes the signing, appends the outcome `unsent` with
  the head, and makes the phase `refused`.
- `Custody` keeps the envelope of the latest signing, as 5.1 says.
- The record then follows each rule of 5.3 for the phase `refused`. It
  does not count in the 256. `Custody` sends nothing for it until the
  caller submits again, and `resign` signs again. The store keeps it as
  it keeps each terminal record.
- `absent` for a latest signing that is live changes nothing.

The phase `refused` gains no new meaning for capacity or for sending,
so the stored vocabulary gains no phase. It gains one outcome, `unsent`.
`Custody` invents no refusal of the scope. A reader of the record sees
that the client ended it, and at which head.

**Who ends a record.** Only `absent` does. A `not-found` of `settle` for
the latest signing of an unresolved record changes nothing, as in
version 1. A caller with a replica states a head, and a settlement read
names none. The MCP service, the hosted agent and the CLI install hold
no replica and never call `absent`. They keep the behavior of version 1,
and they read a record with the outcome `unsent` as `unreadable`, as
they read a folded record.

**The schedule.** Section 7 reads the journal for a dead signing that
has a copy with no answer. That row leaves out a record that the client
signed and never sent, for example after a reload between the signing
and the first send. The row becomes: for each unresolved record whose
latest signing is dead, the client reads the journal to its head. If
the replica does not hold the key, the client calls `absent`. A read
that fails is not that read, and the client reads again when the feed
returns. On a reload the client applies the row to each record that it
finds.

So each record ends at the first good read after its latest signing
dies. The unresolved records are the requests that the member signed
in the last lifetime, and the requests of a time with no feed.

**A late seal.** A scope whose clock is behind the client's by more
than the margin can seal the signing after `absent`. A client whose
clock is ahead gives the same case. The record still holds the intent
digest of each signing. When the replica folds the entry, the client
calls `folded`, and the record moves from `refused` to `accepted`. The
status of section 6 reads the replica, so the request shows `recorded`.

**The member's view.** Nothing changes in section 6. Rule 5 already
returns a request whose latest signing is dead, with the cause
`unsent`. Nothing changes in section 8. `dismiss` and `discard` change
no custody record: a dismissed request leaves the list, and its record
ends by an answer of the scope or by `absent`. A page needs no "give
up" call and no list of given-up keys.

The cases of 5.5 in the tests of section 12:

1. 257 requests in one store. Each loses every reply, its signing
   dies, and a read to the head does not hold its key. The 257th submit
   signs.
2. After `absent`, the scope seals a held copy of the signing. After
   the fold the record reads `accepted`, and the status is `recorded`.
3. A reload between the signing and the first send. The signing dies,
   and the record ends at the next read.
4. The feed is down when the signing dies. The record stays unresolved
   until the feed returns, and then it ends.

## 6. Status of a request

The client folds each entry of the journal into the replica. For an
entry of its own signer, it reads the custody record of the entry's key
and calls `folded`. The client folds from the genesis entry, so it meets
each of its own entries after a reload.

A request has exactly one status. The client takes the first rule that
holds.

1. The replica holds the key, and the sealed intent has the meaning of
   the present values: `recorded`.
2. The replica holds the key with another meaning: `other-recorded`.
   The present values continue as a new draft.
3. Custody holds an acceptance or a `mismatch` for the request:
   `pending`. The replica is behind that answer.
4. The current attempt has a refusal, and the replica does not hold the
   head of that refusal: `pending`.
5. The current attempt has a refusal, or the latest signing is dead. The
   request is **returned**. It is `withdrawn` when a copy of it is in
   flight and the judge at the replica's head does not refuse that
   copy's bytes. In each other case it is `refused`.
6. In each other case: `pending`.

| Status | The member sees |
|---|---|
| `recorded` | The change, confirmed |
| `other-recorded` | The recorded version, and the words "Your earlier version is posted". The present values return as a new draft with a new key |
| `pending` | The change, marked as not confirmed |
| `withdrawn` | The reason, and "can still be posted". The values return to the member |
| `refused` | The reason. The values return to the member |

A returned request carries its cause.

```ts
type Why =
  | { by: "scope"; reason: RefusalReason; name?: string; class: RefusalClass }
  | { by: "client"; reason: "unsent" }
```

A refusal ends its attempt: the client sends no more copies until the
member submits again. Only an answer to a copy of the current attempt
returns a request. After Ana submits a returned request again, the
earlier refusal belongs to an earlier attempt, and the request is
`pending`.

The client compares meanings, not intent digests. It computes the
meaning of the sealed intent from the entry in the replica, so rules 1
and 2 need no kept envelope.

Rule 2 keeps text that no signing has. Ana changes a returned text and
does not submit it. A late copy of the first text takes effect. The
first text shows as recorded, and the changed text stays in the box as
a new draft with a new key. If the draft store holds values that differ
from the sealed intent when a request ends, the same rule applies.

### 6.1 An answer waits for its head

An answer names a head: `judgedAt` for a refusal and the sequence of the
receipt's fact for an acceptance. The client keeps each answer in the
custody record at once. Rules 3 and 4 hold the request at `pending`
until the replica reaches that head.

An answer is also a reason to read. The client reads the journal to the
answer's head at once and does not wait for the feed. `mismatch` names
no head. After a `mismatch`, the client reads the journal to its current
head, and the replica then holds the key.

So no request is between an answer and its head with no status. A
refusal that arrives while the feed is down leaves the request
`pending`, with its values in the list of requests, and the client's
state says `behind`.

### 6.2 A status can change after a return

`refused` and `withdrawn` are statements about one head and one clock.
If a late copy takes effect, the replica holds the key at a later head
and rule 1 or 2 applies. The page never shows a recorded request as
refused once the replica holds its entry.

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
| No reply to a send | The client ends the send after 30 s and records it as lost. It reads no later reply |
| A lost reply or `unavailable` | Read the journal to its head. If the replica holds the key, send nothing |
| Send again | The same bytes, 1 s after the read, then 2, 4, 8 and 16 s, then each 30 s |
| The feed returns | Send each pending request at once, one copy at a time for a request |
| A refusal | The attempt ends |
| `notAfter` passes | Send nothing more for that signing |
| The signing dies with no answer | The request returns, `unsent` |
| The latest signing of an unresolved record is dead | Read the journal to its head. If the replica does not hold the key, call `absent` (5.5). A read that fails is not that read |
| An earlier signing is dead and has a copy with no answer | Read the journal to its head one time. If the replica does not hold the key, call `absent` |

The client holds one timer, set to the earliest time that any request
is due. `close()` clears the timer and cancels the observation. No other
function ends the client. On a reload, the client reads its custody
records and continues the schedule.

With the default lifetime, a request that gets no answer returns to the
member after 6 minutes.

## 8. Slots and drafts

A **slot** is where one draft shows. It follows from `acts[k]`: the
kind, the item that the act is on when its step is `transition` or
`comment`, and the value of each field of type `item`.

| Act | Step | The slot |
|---|---|---|
| `add-place` | `open`, no `item` field | The kind |
| `comment` | `open`, one `item` field | The kind and the place |
| `edit-place` | `transition` | The kind and the place |

The other fields of the act are the draft's value, each optional until
the submit. The types come from the definition, as `AskedOf` gives them
today (`packages/client/src/declared.ts:67`). A slot shows at most one
draft.

`submit(slot)` is one operation. It returns the key, or the cause of a
stop.

1. Read both stores, so a change by another tab counts.
2. Check the values with `shapeDeclaredAct`. Stop: `shape`, with the
   faults.
3. Build the intent at the replica's head. Check admission. The
   client's state is `current` or `behind`. The member has no pending
   request that expects the revision of an item that this intent
   expects. Stop: `state` or `busy`.
4. Choose the bytes by rules 5 and 6. Sign if rule 6 applies. Stop:
   `signer`.
5. Keep the signing in custody, as a new attempt. Stop: `store`, `full`,
   or `taken`. `taken` means that another tab acts on the key: custody
   answers `locked` or `conflicting`.
6. Send.

A stop changes no store. The draft stays in its slot, and its view
carries the cause until the next edit or submit. From the click to the
end of step 5, the draft's state is `submitting`.

A draft whose request is `pending` is **taken**: it shows in the list
of requests and not in a slot. Step 5 is one write to custody, and the
draft store needs no write at a submit. A reload after step 5 finds the
custody record. A reload before it finds the draft, with nothing sent.

`edit(slot, values)` changes only a draft in the state `editing`. It
reads both stores first. An edit of a draft that is `submitting` or
taken stops with `taken` and changes nothing. A pending request shows
its present values, so the page shows what the client sent.

When a request returns, its draft has its values and its key again. If
the slot shows no other draft, the returned draft shows there, with its
status and cause. If the slot shows a newer draft, the returned draft
waits in the list of requests. `restore(key)` moves a draft that waits
into its slot when the slot is empty. `dismiss(key)` removes a draft
that waits. `discard(slot)` removes the draft of a slot.

An `other-recorded` request follows the same rule. If the slot is
empty, its present values enter the slot as a new draft with a new key,
and the draft's view names the earlier key. If the slot shows another
draft, the request waits in the list with the status `other-recorded`
and its present values. The new key starts at the `restore`.

A request leaves the list of requests in three cases. It is `recorded`.
Its values enter their slot. Or the member dismisses it. So each key
that the page shows is in a slot or in the list, and never in both. Rows
are apart from both: a pending request has a predicted row, and a
recorded request has a recorded row.

A request that the member discarded or dismissed can still take effect
while a copy of it is in flight. Its recorded row then shows as each
other row does, with no notice.

The client keeps drafts in a draft store, a second port beside the
custody store. Both ports have a memory form. A browser adapter supplies
forms that survive a reload and that two tabs share. Two tabs then share
a draft and its key. Each store port signals a change by another client,
and the client then reads the store and publishes a new view. Custody
locks one key for one writer while it sends, for at most 30 s. So two
submits of one draft make one signing, and the second tab reads `taken`
or sends the kept bytes.

## 9. The view

The client publishes one value, whole, on each change.

```ts
interface ClientView<D> {
  state:
    | { is: "starting" | "current" | "behind" | "folding" }
    | { is: "stopped"; cause: Stopped }
  head: Head | null
  rows<T extends TypeOf<D>>(type: T): readonly Row<D, T>[]
  row(ref: ItemRef): Row<D> | null
  requests: readonly RequestView<D>[]
  drafts: ReadonlyMap<Slot<D>, DraftView<D>>
}
type ItemRef = { item: number } | { key: string }
interface DraftView<D> {
  key: string; slot: Slot<D>; values: Values<D>
  state: "editing" | "submitting"
  stop?: Stop                                // of the last submit
  returned?: { status: "withdrawn" | "refused"; why: Why }
  after?: { key: string }                    // of `other-recorded`
}
interface RequestView<D> {
  key: string; slot: Slot<D>; values: Values<D>
  status: Status; why?: Why
  predicted: Judged | null
}
type Stopped =
  | { by: "close" }
  | { by: "protocol"; reason: RefusalReason }
  | { by: "definition" }        // digest or genesis check failed
  | { by: "forbidden" }         // the member has no read access
  | { by: "archived" }          // the scope has an archive floor
  | { by: "fold" }              // a second fold from genesis failed
```

The view holds no signed bytes. `rows` and `row` read an index that the
client builds one time for each view. A draft in the state `submitting`
and each pending request have a row, with the member's values and a
mark. A reference `{ key }` gives that row. After the entry, the same
reference gives the recorded row of the item that the entry opened. A
page that selects a new place by its key keeps its selection.

`starting`: the replica does not hold the genesis entry. `current`: the
replica is at the feed's head. `behind`: the feed is down, or an answer
names a later head. `folding`: the client folds again from the genesis
entry after one fold failure. `stopped` is final.

The client folds from the genesis entry. A scope with an archive floor
is outside its range and stops it. A kept replica and a start from a
state seed wait for the design of request `4893fbfa`.

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

`mismatch` carries only its reason (`packages/contract/src/result.ts:81`),
and `settle` answers `not-found` when another intent holds the key
(`packages/scope/src/core.ts:900-916`). Neither shape changes.

A client with a replica reads which intent holds a key from
`state.accepted(actor, key)`, with no request. A client with no replica
settles each kept envelope, at most 8 reads. A new member on `mismatch`
breaks each older client, because the client's check of an answer is a
closed shape (`packages/client/src/answers.ts:72-74`). That new member
also needs the review of `docs/kernel.md` section 7. This note does not
take it.

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
seeds of 80 steps, with fixed seeds. The suite has two clocks, the
client's and the scope's, and a step can move each. The other steps:
type, clear the text, submit, discard, restore, dismiss, lose a reply,
hold a copy, deliver a held copy, an act of another member, stop the
feed, start the feed, fail the signer, fail a store write, reload,
reload between the signing and the store write, and act in a second
tab.

The suite counts the member's intentions from the member's steps alone.
An intention starts at the first edit of an empty slot. It ends at a
discard or when its entry is in the record. A **continuation** is a
submit of values after the record took another version of the same
intention. The suite checks seven invariants after each step.

1. The record holds at most one entry for each intention and one for
   each continuation.
2. Each key that the page shows has exactly one status or draft state.
   It shows in a slot or in the list, and never in both.
3. A request whose entry the replica holds shows `recorded` or
   `other-recorded`.
4. Each value that the member typed and did not discard is in a slot,
   in the list of requests or in the record.
5. The client sends no bytes that custody does not hold.
6. The published view equals the view computed again from the replica,
   the custody records, the draft store and the clock.
7. After `close()`, no timer and no observation remain.

Custody has its own cases. A literal version 1 record reads as version 2
and settles. Each rule of sections 5.1 to 5.4 has one case, and 5.5
lists its four cases. The MCP
witnesses of NF-3 keep their behavior, and each takes a new literal for
the version 2 bytes, captured one time.

## 13. Order of work

NF-5 (`c288c917`) moves the browser onto `Custody` and retires `Kept`
and `AttemptJournal`. It writes a browser store for custody records.
That store is written one time if the record already has version 2. So
step C1 goes first, then NF-5. NF-5 does not wait for steps C2 to C4.

| Step | Work | Needs |
|---|---|---|
| C1 | Custody record version 2: signings, `resign`, the rules of 5.3, `folded`, `absent`, the read by target, the change signal | The cutover head, RC-1 |
| NF-5 | As filed, on version 2 | C1 |
| C2 | The replica: fold of a declared scope from `ScopeHandle.log` and `observeScope`, the states, `Judged`, typed rows with their index | RC-1, FG-1, IE-1, PG-1 |
| C3 | Requests: the status rules, the schedule, the view, and the end of a record (5.5) | C1, C2 |
| C4 | Slots and drafts: slot types, the draft store, the calls | C3 |

Each step lands with its part of the generated suite. Each step is one
request to the builder, filed after Hugh ratifies this note. dap-foldkit
then replaces its replica, outbox and engine with the client.

## 14. Choices that a member sees

Four rulings of this note change what a member sees. Each can go the
other way with no change to the rest.

- No timer signs (rule 3). A phone that is offline for more than one
  signing hands each pending request back, and the member clicks again.
- A returned edit never signs again by itself. The M2 build signs again
  after `revision-moved`. Here the member sees the other change first.
- `withdrawn` needs a copy in flight that the judge admits at the
  replica's head. A returned edit with an old revision therefore reads
  `refused`, and not "can still be posted".
- Two tabs share a draft. The second tab cannot edit a draft that the
  first tab submitted.

## 15. Not taken

**A scope that remembers refusals.** The request excludes it. One key
for one request gives one entry with no change to the scope.

**A `mismatch` that names the entry.** Section 10 gives the reason.

**Work offline for longer than one signing.** It needs a rule for a
signature with no click, and a separate design.

**A judge that makes more reasons `never`.** `revision-moved`, `final`
and `expired` each become `never` with a change to the judge, and a
split of `bad-intent` and `bad-field` does the same for most of their
cases. Each changes an answer of the kernel. The design does not need
them, because the status of a request never rests on a refusal alone.

## 16. Where each item of the request is ruled

| Item of `e5b86654` | Section |
|---|---|
| 1. Successive envelopes under one key | 4, 5.1, 5.2 |
| 2. The refusals that resolve a record | 5.3, 5.5, 6 |
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
