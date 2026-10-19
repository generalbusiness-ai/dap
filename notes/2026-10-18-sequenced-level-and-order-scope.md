# The sequenced level and the order scope

18 October 2026, draft 6. Design note for review. Section 12 lists what
changed after each checker review. The note decides two things about
what a scope's definition declares, and designs the runtime for the
second.

1. **The archive is a binding of the room, not a level of the
   definition.** The `archived` level of the archive note
   ([section 15.2](2026-10-09-shared-language-volatile-acts.md), point 5
   of its decision) is withdrawn. A room binds its repository to the
   archive at its claim or later, and a package may require that binding.
2. **The third level is "sequenced".** A sequenced scope keeps its own
   journal, as a recorded scope does, and shares an order with a group of
   scopes through one order scope. A sequenced act or handler may read the
   other members' state as of its position. D5-5 of the scope contract
   forbids that read for every other input.

The note also adds source order for `tell` handlers (6.2). The bound on
a delivery's age is the `late` form of the application packages note
(`notes/2026-10-18-application-packages-and-builder-room.md`, section
4.1, request ee200df2). The note commissions nothing by itself. Section
9 names the slices and places them in
[plan 033](plans/033-2026-10-18-grow-room-demo.md). Hugh decided on 18
October 2026 that the implementation owes no backward compatibility: a
room created before these changes is destroyed or inoperable where they
reach it. Source facts cite `path:line` at main `feccbbcfe`.

## 1. Why

Scopes compose by delivery. A send is written with its entry. The
receiver judges the delivery in its own turn, and its own commit gives
the delivery a position. "Delivery is at least once and may be out of
order" (`packages/scope/src/outbox.ts:6`). Nothing orders deliveries
from different senders. A `relate` update orders per key by the owner's
revision. The roadmap's rule is that every order-sensitive decision has
one owner. A delivery's cause already carries the source scope, the
source entry's position and hash, and the send's ordinal
(`packages/contract/src/scope.ts:54-59`).

That default is right, because dap's latencies include people, and this
note keeps it. dap lacks two things: a place where a group's order is
held, and a rule that lets an input read other scopes as of a position.
The sequenced level supplies both, for the scopes that need them and
for no others.

## 2. The principle: what a definition carries, and what a room holds

Three kinds of thing are told apart.

- **A definition carries what changes the judgment of the scope's own
  inputs**: an operand, a guard, a form, a member of an entry, or the
  answer to an act. It is pinned by digest at genesis
  (`docs/scopes.md:265-268`), and a package's semantic id covers it.
- **A package declares host requirements**: what the room it is
  installed into must provide. They are immutable with the package. The
  install act checks them once, in the room's platform scopes.
- **A room binding is a mutable value of the room.** A room act sets it,
  possibly later. Two readers read it: the install act, which checks a
  package's requirements against it, and platform services such as the
  archiver, which copy bytes. No judgment of an application scope's own
  input reads it.

| Property | Adds a form or changes an answer of the scope | Where it lives |
|---|---|---|
| Live | Yes: no history, and the answers `applied` and `reset` (archive note, 16.2) | Definition |
| Recorded | Yes: a history and a receipt | Definition |
| Sequenced | Yes: the position in the entry, the `sequenced` mark, and group reads in guards | Definition (this note) |
| Archive | No. The archiver runs after the commit, writes no entry, and "archived through N" is a read (archive note, 15.1 and 15.5) | A binding of the room (section 4), and a requirement a package may declare |
| Publication | It is an act with sends to the destination | Definition. The destination's repository is a room property |

## 3. The levels

`DurabilityLevel` (`packages/contract/src/definition.ts:19-22`) becomes:

```ts
export interface DurabilityLevel {
  name: "live" | "recorded" | "sequenced";
  version: 1;
}
```

An absent `level` means recorded, as today (`definition.ts:33`). The
validator's refusal of every level but recorded
(`packages/derive/src/validate/index.ts:173-176`) stays until the slices
of section 9 land each level.

| Level | What survives | Whose order | Read as of a position | Cited as a fact |
|---|---|---|---|---|
| Live | Nothing | None | No | No |
| Recorded | The journal | Its own | No | Yes |
| Sequenced | The journal | Its own, and the group's | Yes, by a sequenced input of the same group | Yes |

Each level implies the one before it. A live scope has no entries, so it
cannot be a member of a group. A scope has one level, as the archive
note's 15.2 says. An application that needs a live surface beside a
sequenced record is two scopes.

## 4. The archive as a binding of the room

### 4.1 What changes

The archive note's 15.2 declares the archive as a level and makes the
room's permission a second condition. This note withdraws the level and
keeps the permission, renamed a **binding**. No judgment of an
application scope's own input reads the level. The writer (15.5) finds
the room's repository after each commit, and the verifier (15.7) reads a
clone. An application needs the guarantee, not the level, and a package
declares that guarantee as a requirement (4.3). The room-permission half
of 15.2 was never built, and A2 and A3 landed to the fixture-only cutoff
with archived-level admission out of scope (decision `89376d74`). So the
change costs the one `"archived"` literal in the contract and the replay
package's reading of it.

### 4.2 The binding

The directory's `repository` item (`packages/platform/src/directory.ts:165-179`)
gains one value slot. The claim sets it through a field `archive` that
the directory's `establish` copies, or an admin sets it later with one
act:

```
archive: { fixed: false, required: false, of: { type: "enum", of: ["journal"] } }

bind-archive: { step: "transition", on: "repository", grant: "directory.archive",
                fields: { archive: { type: "enum", of: ["journal"], required: true } },
                guards: [{ state: ["established"] }],
                effects: [{ value: { slot: "archive", from: { field: "archive" } } }] }
```

There is no unbinding act. An operator who wants archiving to stop
removes the destination's credential, and the archiver reports
`unavailable` as 15.5 says.

**Who archives.** Every recorded and sequenced scope of the room,
platform and application alike, once the binding is set. Inboxes and
the register stay out (15.1). The order scope of section 5 is in,
because a member's replay reads it.

**When.** The archiver's step 1 ("Target", 15.5) reads the binding where
it reads the repository today. A scope created before the binding is set
archives its whole prefix from position 0, its genesis
(`packages/contract/src/entry.ts:17`), with the definition closure that
15.3 names. A clone then verifies the scope's identity (15.8) and
replays. A scope whose only entry is its genesis is archived too. No
entry records the moment the binding reached a scope. `head.json` and
`archivedThrough` say what is archived.

### 4.3 The requirement

A package manifest (applications note, section 4, "the host contract it
needs") may list `archive` among what it needs. That is a host
requirement in the sense of section 2. The install act checks it once,
reading the room's binding as it reads the room's trusted-package list.
Install refuses `archive-unavailable` when the directory has no binding.
The admin sets the binding and tries again. A package that does not
require the archive installs in any room, and its scopes archive when
and if the room binds. The directory gains a slot and an act for a
mutable room value. That is what a binding is.

### 4.4 What does not change

The layout (15.4), the writer's five steps and credential (15.5), the
receipt check of 15.6, the verifier (15.7), the limits of a clone (15.8),
and slices A4 and A5 keep their text. 15.3's opening sentence and 15.6's
two statements about the level change as section 8 lists. "Archived
through N" keeps its meaning.

### 4.5 Plan 033, slice 9

The demo-room archive slice becomes: the demo room's directory holds the
binding, set at its claim; the reviewed archive policy and configuration
for the hosting deployment; a real destination and token; A3's archiver
wired for that room; and the disclosure on the `/grow/` page. The grow
package does not require the archive, so the slice can set the binding
on a running demo room.

## 5. The sequenced level

### 5.1 In one paragraph, and the terms

A **group** is a set of sequenced scopes, its **members**, and one
**order scope**. The order scope's journal is the group's order. Each of
its **allocation** entries gives one **position** to one member for one
input. A member asks for a position before it judges a sequenced input,
reads the other members as of that position, judges, writes the
judgment as a **prepare entry**, has the order scope record a
**resolution** bound to that entry's hash, and then writes the **commit
entry** that puts the prepared effects into effect. A refused act
leaves a **hole** at its position, recorded in the order scope; a
refused delivery is prepared and committed like an applied one, because
its result is an effective fact (5.4, step 6). Nothing waits for the
whole group. A member waits only for another member's
earlier positions, and only when it reads that member. Deliveries
between members, and to and from the rest of the room, stay as they
are.

Two more terms carry the rest of the section. A reader's **cut
position** is the position up to which it reads a member (5.5). A
member is **final** at a position when every allocation to it at or
below that position has an outcome in the order journal.

### 5.2 The declaration

**The level.** `level: { name: "sequenced", version: 1 }`.

**The group reference.** The `create` send that makes a sequenced scope
carries a field `order` of type `{ type: "scope", kind: "order" }`. The
genesis records it, incarnation included, and the scope reads it from
its own genesis for life. A `create` of a sequenced definition with no
`order` field is refused `order-unavailable`. Whether the order scope
lists the scope as a member is settled by the enrolment of 5.3. A
sequenced input of a scope that is not enrolled is refused
`not-a-member` at its first allocation.

**The sequenced mark.** `ActType` and `ReceiveType`
(`definition.ts:92-125`) gain:

```ts
sequenced?: true;                         // this input takes a position in the group's order
reads?: Record<string, GroupRead>;        // at most 4; only with `sequenced`
export interface GroupRead {
  member: string;                         // a member of the group, by its name in the order scope
  items: Range;
  staleness?: { seconds: number };        // read the member as of an older position; 5.5
}
```

A timed rule is never sequenced. A genesis is never sequenced.

**The group operand.** A guard, an effect, or a send of a sequenced act
or handler may use `{ read: string; part?: Part }`, the list that a
`reads` entry bound as of its cut, as the `list` of `each`, `has`,
`count`, `distinct`, and `sameSet`, and as an `element` source inside
them. A read is a list of records. For each item the range covers in the
member as of the cut, the record holds its ID, state, revision, and
value slots, in the member's own types. The validator refuses `read`
anywhere but a sequenced act or handler, and refuses `reads` on an input
without `sequenced`.

**In the entry.** `Entry` (`packages/contract/src/entry.ts:14-27`) gains:

```ts
position?: { at: FactRef };               // the order scope's entry that allocated this input's position
reads?: readonly GroupReadUse[];          // one per `reads` entry; 5.5
```

An applied sequenced input, and a refused sequenced delivery (5.4, step
6), write two entries, with three new input kinds between them:

```ts
| { type: "prepare"; input: Input; position: { at: FactRef }; reads: readonly GroupReadUse[] }   // the judgment; not an effective fact
| { type: "commit";  input: Input; prepared: FactRef; resolution: FactRef }                       // the effective fact
| { type: "abandon"; prepared: FactRef; expiry: FactRef }                                         // the prepare is void
```

The **prepare entry** wraps the original act or delivery input and holds
the whole judgment: `uses`, `reads`, the rule answers in `prepared`, and
the derived `effects` and `sends`. It is not an effective fact. Its
input kind is `prepare`. No index, receipt, settlement, delivery proof,
`presents`, `fact` guard, or genesis source accepts that kind. A
delivery whose source entry has the input kind `prepare` is refused
`source-not-effective`, in the runtime and in replay, so the sends a
prepare entry holds can never be delivered from it.

The **commit entry** is the one effective fact. It wraps the same
original input, cites the prepare entry and the order scope's
resolution, and carries the same `effects` and `sends`, byte for byte.
The fold applies its effects. The fold's indexes of accepted act keys
and decided deliveries (`packages/derive/src/fold.ts`) are keyed on the
original input inside it, so a repeat of the intent or a duplicate of
the delivery finds the commit. The signer's receipt names the commit. A
send's `DeliveryCause` names the commit, which holds the send at its
ordinal as the delivery contract requires (`docs/scopes.md`, Delivery).
A child's genesis `source` is the commit, and the child's seed `cause`
is the original input's digest, as today. The position of a commit
entry is its prepare entry's position. A refused sequenced delivery is
prepared and committed the same way: the wrapped delivery input carries
`decision: "refused"` and its reason, as an unsequenced refused
delivery's does (contract, section 7.4), the prepare derives no effects
and one send, the result, and the commit is the deciding entry, from
which the result is dispatched and a duplicate is answered. A refused
sequenced act has no prepare entry (5.4, step 6). The **abandon entry**
makes the prepare entry void: no effect, no send, no receipt.

**The derivation context.** Effects and sends are derived once, at the
prepare, and the fold applies them at the commit, so they are derived
in the commit's context, not the prepare's. The fence (5.4, step 7)
admits nothing between the two, so the commit's sequence is the
prepare's sequence plus one, and the scope fixes it before deriving.
Every opened item's ID, every self reference, and every send that names
a new item is derived with that sequence as `self`, where an ordinary
entry uses the head's sequence plus one (`packages/derive/src/judge.ts`,
`effects.ts`). The fold's rule that an opened item's ID equals the
effective entry's sequence (`fold.ts:105`) then holds at the commit. The
abandon entry is written at that same sequence instead, and the
prepared identities are never used. The **judgment time** of a
sequenced input is the prepare entry's clock reading. Every time the
input judges uses it: `notAfter`, `before` and `after` guards, `late`
(6.1), and every deadline a derived effect sets with `plusSeconds`. The
commit entry carries its own, later clock reading, as every entry does,
and that reading judges nothing. Replay reads the judgment time from the
prepare entry and the effective sequence from the commit.

`uses` keeps its one domain, the canonical bytes of a foreign entry
(`entry.ts:106`). The prepare entry cites there the order scope's head
entry that the input read, each cut entry, and each `leave` entry a read
rests on. The page a read saw is a second domain, `page`, cited from
`reads` (5.5).

### 5.3 The order scope

A platform definition, `platform:order@1`, of a new scope kind `order`
(`ScopeKind`, `packages/contract/src/scope.ts:19`; `PlatformDefinition`,
`scope.ts:41`).

| Item | Slots | States |
|---|---|---|
| `group` (one) | `name`: text. `size`: int, 1 to 32, fixed. `lifetime`: int seconds, fixed. `creator`: scope, fixed | `forming` (initial), `open`, `closed` (final) |
| `member` (many, max 32) | `name`: text, fixed. `scope`: scope reference with incarnation, fixed. `since`: int, fixed. `until`: int | `joined`, `left` (final) |
| `allocation` (many) | `member`: member, fixed. `input`: digest, fixed. `opened`: time, fixed. `expires`: time, fixed. `reason`: text | `open` (initial), `resolved` (final), `holed` (final), `expired` (final). `open` is a pending state. The resolution, the hole, and the expiry each settle it |

| Act | Who | What it does |
|---|---|---|
| `establish` (genesis) | the creating scope's `create` send, with the fields `name`, `size`, and `lifetime` | Opens the `group` as `forming` and records the creator from the genesis's source entry. No member is named, because none exists yet |
| `enroll` | a `tell` handler whose guard requires the sender to be the recorded creator, with the fields `member` (a scope reference with incarnation) and `name` | Opens one `member` row, `joined`, with `since` set to this entry's position. When the joined count reaches `size`, the same entry transitions the group to `open` |
| `leave` | an admin, grant `order.leave`, with the field `member` | Transitions the member to `left`, with `until` set to this entry's position (5.7) |
| `close` | an admin, grant `order.close` | Transitions the group to `closed` when it is `forming`, or when every member is `left` and no `allocation` is `open` (a `count` guard). The scope is then terminal and admits no request. Nothing is stranded: every allocation is final, and a member settles a final allocation from the order journal alone (5.4) |

**Bootstrap.** The package root creates the order scope first. On its
`applied` result, the root creates each member with the order scope's
reference as the member's `order` field. On each member's `applied`
result, the root sends `enroll` with the reference the result carries,
as the grow site stores a room's reference from its creation result
(`examples/grow/site.ts:24-25`). Both ends consent: the member's genesis
names the order scope, and the order scope's row names the member,
incarnation included. A member whose genesis names X but is enrolled in
Y asks X and is refused `not-a-member`. A scope enrolled in Y whose
genesis names no order scope never asks. Only the creator may enroll, so
every member of a group was created by one scope in one room.
Membership across rooms and joining later are not provided (5.10). A
member creation that fails leaves the group `forming`, where allocation
is refused `order-forming`. An admin's `close` ends a group that never
formed.

**Capacity.** An allocation is new work. It opens an `allocation` in
`open` with its `expires` deadline, so it reserves the one entry that
ends it (`docs/scopes.md`, "Room to settle";
`packages/derive/src/reserve.ts`). It is refused `scope-full` when the
two do not fit. The resolution, the hole, and the expiry are the three
settling entries of that pending state. Each is written against that
reservation and is never asked whether it fits. The platform requests
below consume the duty the allocation reserved, so an order scope that
admitted an allocation can always record its outcome.

**Three platform requests.** Each is a platform request, as the
authority read is. A member's object asks the order scope's object
through the namespace, with its own authorization and the deployment's
fetch time limit. The answer is the fact of one entry, or `refused` with
a reason, or nothing within the limit. Each request writes one entry in
the order scope's own turn, with a new input kind:

```ts
| { type: "allocation"; member: ScopeRef; input: Digest }                                           // opens an `allocation`; its seq is the position
| { type: "resolution"; member: ScopeRef; position: number; input: Digest; prepared: FactRef }     // `open` to `resolved`, bound to the prepare entry
| { type: "hole";       member: ScopeRef; position: number; input: Digest; reason: string }        // `open` to `holed`
```

- **Allocate.** `input` is the digest the scope contract gives the input:
  an intent's digest, or a delivery's `DeliveryCause` digest. The request
  is idempotent per `(member, input)` while that allocation is `open`.
  Once the allocation is `holed` or `expired`, a repeat opens a new
  allocation at a new position. Refused `not-a-member`, `order-forming`,
  `order-left`, `order-closed`, or `scope-full`.
- **Resolve.** `open` to `resolved`, recording the prepare entry's fact,
  hash included, so that exactly one prepared result can commit at that
  position. Refused `expired` or `holed` when the allocation is already
  final in that state, and `not-open` when it names another member's or
  input's allocation. Idempotent on a `resolved` allocation with the same
  `prepared`. A different `prepared` for a resolved position is refused
  `position-bound`.
- **Hole.** `open` to `holed`, with the reason the member's judgment
  gave. Idempotent the same way.

The order scope judges nothing else about the input. It does not read
the member, does not fetch, and holds no bytes but the digest.

**Expiry.** A timed rule of the order scope transitions an `allocation`
from `open` to `expired` when `opened` plus the group's `lifetime` has
passed, with attention. The lifetime is set at genesis from the
package's `groups` declaration. A later `resolve` for that position is
refused `expired`, so a hole never gains a commit. Only an `open`
allocation expires. A `resolved` one has a determined result (5.5, the
failure model). Expiry, resolution, and holes are entries of one
journal, so which came first is decided where the position was
allocated, and no clock bound between members is assumed. The timed
rule runs until `close`, which requires that nothing is `open`.

### 5.4 The turn of a sequenced input

The turn (`docs/scopes.md:207-228`) gains these steps for an input whose
act or handler is `sequenced`:

1. Before the turn, each foreign entry the input names is fetched and
   checked, as today.
2. The drain, as today.
3. **Allocate.** The scope first asks `fits` whether a prepare entry,
   its commit or abandon, and the settling entries its effects could
   open would fit. If not, an act is refused `scope-full`, a delivery is
   answered `unavailable` with that reason and keeps the sender's duty,
   as today, and no allocation is requested. The scope then asks its order scope for a
   position P. No answer within the limit: the turn ends `unavailable`
   with the reason `order-unavailable`, nothing is written, and the
   sender keeps the duty. A refusal: an act is refused with the order
   scope's reason. A delivery is answered `unavailable` with a reason
   that can change, such as `forming`, and the sender keeps the duty;
   with `order-left` or `not-a-member` it is decided outside the group's
   order: an ordinary deciding entry with no position, `refused` with
   that reason, no effects, and its one result, whose `uses` cites the
   order scope's head entry that the member read before the turn, at
   which the member is not `joined` (never enrolled, or its `leave`
   entry at or below that head). The member may still write it (5.7),
   the fold's index of decided deliveries answers a duplicate from it,
   and 5.8 verifies it. On an answer, the
   scope writes one bookkeeping row,
   **pending**, in the same storage as its journal: the input as
   received (the signed intent, or the delivery's envelope with its
   retained source entry), its digest, P, and the allocation's fact. At
   most one pending row exists. A second sequenced input while one is
   pending is answered `busy`. A repeat of the same intent or a duplicate
   of the same delivery during the row or the fence is answered `busy`
   too. Once the commit exists, the fold's index answers it with the
   commit's receipt.
4. **Read.** The scope reads the order scope's journal through its head.
   For each `reads` entry, it computes the cut position and the member's
   finality at or below it (5.5). An allocation to the member at or
   below the cut that is still `open` ends the turn `unavailable` with
   the reason `member-pending`. The pending row stays, and the next
   attempt gets the same P by idempotency. Otherwise the scope reads the
   page from the member as of the cut.
5. The head is noted. The scope fixes the prospective commit sequence,
   the head's sequence plus two, and the judgment time, this turn's
   clock reading, and derives in that context (5.2). The rule
   expressions are evaluated once. `notAfter` and every other time is
   judged here and not again.
6. **Refuse, or prepare.** A refused act: the scope asks the order scope
   to record a hole at P with the reason, answers the refusal, clears the
   pending row, and writes nothing, as a refused act writes nothing
   (`docs/manual/ten-terms.md`, "takes effect"). A delivery is never
   refused without its deciding entry (contract, section 7.4), so a
   refused delivery is prepared like an applied one: its prepare entry
   wraps the delivery with `decision: "refused"` and the reason, holds
   its reads and rule answers, derives no effects and one send, the
   result, and takes the position; it resolves and commits as steps 7
   and 8 say, and the commit is its deciding entry. The fence, the
   reservation, resume, and replay cover it as they cover any prepare.
   An applied judgment, and a refused delivery: the
   scope writes the **prepare entry** (5.2) with `position`, its reads,
   the rule answers, and the derived effects and sends, and clears the
   pending row in the same transaction. The prepare entry is new work,
   and `fits` is asked again. It reserves its own settling entry, the
   commit or abandon, and every settling entry the prepared effects
   would need once in effect: a deadline's timed entry, a request's
   result, or a `settles` state's exit, computed from the derived
   effects. If it does not fit, an act is refused `scope-full`, a
   delivery is answered `unavailable` with that reason and keeps the
   sender's duty, and in both cases a hole is recorded at P and the
   pending row is cleared. The prepare entry is the durable
   judgment. What it says is what will take effect, or nothing.
7. **The fence.** From the prepare entry until its commit or abandon
   entry, the scope writes nothing else. Every act and delivery is
   answered `busy`, and the drain is held. Nothing can change the state,
   the authority, the clock reading, or the reservation that the
   prepared judgment rests on. The fence lasts one round trip to the
   order scope in the ordinary case, and at most the group's lifetime
   plus the scope's own resumption otherwise.
8. **Resolve.** The scope asks the order scope to resolve P for this
   input with the prepare entry's fact. On `resolved`, the scope writes
   the commit entry (5.2) against the prepare's reservation. The effects
   take effect, the reservation for their pending work transfers to
   those states, the sends are dispatched from the commit, and the
   signer receives the commit's receipt. On `expired`, the scope writes
   the abandon entry against the same reservation and releases the
   rest. The prepared judgment is void, and the input is judged again
   from step 3 with a new allocation. An intent past its `notAfter` is
   refused as any act is. On no answer, the turn ends `unavailable` with
   the reason `order-unavailable`, the fence stays, and the scope
   retries on its own alarm. The commit and the abandon are settling
   entries and are never asked whether they fit, so a prepared input can
   always be ended, after an eviction and while other members use the
   remaining capacity.

**Restart and resume.** An object that restarts reads its head. A
pending row with no prepare entry resumes at step 4. A prepare entry at
the head with no commit or abandon resumes at step 8. The resolve
request is idempotent, and its answer, `resolved` or `expired`, is also
readable from the order journal without a request, which is how a
member settles after the order scope has closed. The object's own alarm
resumes both cases, as it runs timed rules, so a stopped member that
returns completes its input without its sender. An admitted delivery is
never abandoned by this. After an `expired` answer, the sender's
dispatcher retries it, and the retry is judged at a new position.

**Unsequenced inputs** of a sequenced scope take no position. Outside
the fence they are judged under the rules of a recorded scope, and D5-5
holds for them. Inside the fence they are answered `busy`.

### 5.5 Reading a member as of a position

**The cut position.** A read by an input at position P of member N with
no `staleness` has the cut position X = P − 1. With `staleness` of s
seconds, X is the greatest position whose allocation entry's time is at
least s before the time of P's allocation entry, or 0 when there is
none. Both are read from the order scope's journal, whose one clock
dates every position.

**Finality.** N is final at X when every allocation to N at a position
at or below X is `resolved`, `holed`, or `expired` in the order journal
as of the head the reader read. An `open` allocation at or below X is
`member-pending` (5.4, step 4). A reader learns what is unfinished from
the order journal, never from the member's live bookkeeping. The
allocation is in the order journal before its reply is sent, and it
stays `open` until its outcome is recorded there, so a lost reply cannot
make a cut change.

**The cut.** Once N is final at X, N's cut entry at X is its last commit
entry whose position is at or below X, or its genesis entry when it has
none. N's state as of X is the fold of N's journal through that entry. A
genesis that opens items gives a non-empty page. Holed and expired
positions contribute nothing, and they need no distinction from
positions never allocated. Unsequenced entries of N before the cut
entry are in the cut. Those after it are not. The cut is a function of
N's journal, the order journal, and X alone, and finality is permanent,
so the cut never changes. Two consequences follow. What the group reads
of a member, the member must have written in a sequenced entry or in an
entry before one, so sequence what the group reads or decides and
nothing else. And a scope's own guards read its own live head, every
entry included, as every act does. The cut is what other members see of
it.

**The read.** A new read of the scope API, `at(X, range)`, answers the
items the range covers as of X, in one page bounded as `items` is. It
answers `busy` under the limits the member has for any reader. It
answers `behind` while the member holds a prepare entry at or below X
whose position the order journal shows resolved and whose commit entry
it has not yet written. The read is served from the member's journal.
The member folds its items to the cut, which it may cache per position.
Who may read: a member of the same group, for a sequenced input, with
the member's own authorization, as the authority read is made. No
session is checked. A reader that is not a `joined` member of the same
order scope is refused.

**The failure model.** A position is in one of three conditions, and a
reader waits differently for each.

- *Open.* The outcome is undetermined. The reader is `member-pending`,
  and the order scope's expiry bounds the wait by the group's lifetime.
- *Resolved, not committed.* The outcome is determined and durable, in
  the member's prepare entry and in the order scope's resolution that
  names its hash. The member writes the commit entry on its next
  activation. The reader is `behind` for exactly as long as that member
  is unavailable, which is the dependence any read of that member has.
  No expiry applies, and none would help, because the result is fixed.
- *Final.* Committed, holed, expired, or abandoned. Nothing waits.

So a reader waits at most the lifetime for an undetermined position, and
at most the member's own unavailability for a determined one. A member
that never returns is unavailable, as a destroyed scope is, and replay
reports its missing commit entry as `missing-dependency`. Capacity is
never the cause of a wait. The prepare reserved its commit or abandon,
and the allocation reserved its outcome, so only an unavailable object
delays a determined position.

**Staleness.** A reader with no staleness waits for every allocation
below P to be final. A reader with staleness s waits only for
allocations older than s. With s at or above the group's lifetime, no
allocation below its cut can still be open, and the reader waits only on
an unavailable member. The author chooses per read, in the definition.

**The witness.** For each read, the entry's `reads` holds:

```ts
export interface GroupReadUse {
  name: string;                           // the `reads` key
  member: ScopeRef;                       // incarnation included
  cut: number;                            // X
  entry: FactRef | null;                  // the cut entry of the member (a commit entry or its genesis), or null when the member left
  page: Digest;                           // the canonical page bytes, retained under the kind `page`
}
```

`uses` cites, in the entry domain, the order scope's head entry the
reader read, the cut entry, and for a left member the `leave` entry. The
page is written to the reader's retained inputs under a new kind `page`,
keyed by its digest, when the entry is committed. It is bounded by the
page bound (64 items, each bounded by the member's slot types) and
archived with the entry (section 8). The two byte domains are never
mixed.

**Absence.** The one absence is a member that left. When the `leave`
entry's position L is below X, the read answers an empty page with
`entry: null` and cites the `leave` entry in `uses` (5.7). Replay
verifies L < X from the order journal. A member with no committed
position at or below X is not absent. Its cut entry is its genesis, and
its page is the genesis fold. An unresolved allocation is never written.
It is the live answer `member-pending`. An empty page therefore never
stands for an undetermined position or an unavailable journal.

**No barrier.** No step waits for the whole group. A sequenced input
waits only for the members it reads, and only for those members'
positions at or below its cut. Two members that do not read each other
never wait on each other.

### 5.6 What a sequenced input may do

Everything its act or handler may do today, plus `reads`. Its effects
and sends take effect at the commit entry (5.2) and keep their contract
from there. A send is an unordered delivery whose cause names the
commit. A `tell` to another member is judged in the member's own turn,
with its own position if its handler is sequenced. A `create` makes a
child whose genesis source is the commit. Effects change this scope's
items only. Atomic change across members is not in this note (5.10).

### 5.7 Leaving, and the fence

A member leaves by an admin's `leave` act on the order scope. The act's
own position L is the fence.

- The order scope refuses every allocation to that member after L with
  `order-left`. Allocations to it at or below L that are still `open`
  resolve, hole, or expire as any allocation does.
- A reader whose cut position X is at or below L reads the member's cut
  as before, including positions at or below L that settle after the
  leave. A reader whose X is above L treats the member as absent: an
  empty page with `entry: null`, citing the `leave` entry, and a `count`
  over it is zero. X equal to L reads the cut.
- The member keeps its journal and its unsequenced inputs. Its sequenced
  acts and handlers are refused `order-left` from the moment it observes
  the `leave` entry, which it reads before each sequenced turn.
- A member's pending requests to others settle as they would for any
  scope. Nothing is undone.

A leave can race a sequenced input of the leaving member. An open
allocation at or below L still resolves, holes, or expires. A prepare
entry whose position is resolved still commits, because the member
reads the resolution from the order journal and needs no request. A
scope never joins a group after its genesis, because the level and the
reference are pinned. An application that wants a scope in a group makes
a new scope and carries forward under gap 10 of the applications note.
`close` ends the order scope when every member has left and no
allocation is open, or while the group is still `forming`. After it,
members settle their resolved or expired positions from the order
journal alone.

### 5.8 Replay

The verifier (`packages/replay`) checks:

- for each prepare entry: the order scope has an allocation entry at
  that position naming this scope, incarnation included, and this
  input's digest, and the member was `joined` there. For each `reads`
  witness: X is the cut position that 5.5 computes from P, the read's
  `staleness`, and the order journal; every allocation to the member at
  or below X is final in the order journal at the head entry cited in
  `uses`; `entry` is the member's last commit entry with a position at
  or below X or its genesis, or it is null with a cited `leave` entry
  whose position is below X; and the retained page is byte for byte the
  fold of the member's journal through the cut entry for the declared
  range;
- for each commit entry: the cited prepare entry is this scope's and
  wraps the same original input; the commit's sequence is the prepare's
  plus one; the order scope's resolution at that position names this
  member, this input, and the prepare entry's fact, hash included; the
  commit's effects and sends equal the prepare's byte for byte, and
  every opened item ID and self reference in them equals the commit's
  sequence; every time judgment, including `late` and every derived
  deadline, derives again from the prepare entry's clock reading; no
  other commit cites the same prepare; nothing else was written between
  the prepare and the commit; and the prepare's reservation covered the
  commit and the pending work the effects open;
- for each prepare entry that wraps a refused delivery: its effects are
  empty, its one send is the result that names that delivery, and the
  commit carries the same; a refused act has no prepare entry, and its
  position is `holed`;
- for each delivery entry of a sequenced handler that has no position:
  its decision is `refused` with the reason `order-left` or
  `not-a-member`, its effects are empty, its one send is the result, and
  its `uses` cites an order scope head entry through which this member
  is not `joined`; any other entry of a sequenced input without a
  position is a mismatch, whatever reason it claims;
- for each delivery, genesis source, `presents`, and `fact` operand that
  names an entry of a sequenced scope: the named entry's input kind is
  not `prepare`;
- for each abandon entry: the cited allocation is `expired`, and nothing
  else was written between the prepare and the abandon;
- a prepare entry at the head with neither is reported **pending**: a
  live condition, not a fault.

The report has four answers. **Verified**: every check holds.
**Pending**: a prepare at the head. **Mismatch**: a journal or a
retained page contradicts an entry, including an `open` allocation at
or below a cited cut, which a committed reader can never have seen, a
`holed` or `expired` allocation with a commit entry at its position, or
an entry inside a fence. **Missing-dependency**: the order scope's
journal, a read member's journal through its cut, a member's commit
entry for a resolved position, or a retained page is not available,
reported for that entry as for any foreign fact
(`packages/replay/README.md`). An entry whose scope declares `sequenced`
and whose input is sequenced but which has no `position` is a mismatch.
The `--git` source of 15.7 reads the order scope from its own ref in the
clone, and the pages from the reader's archived inputs.

Replay does not promise that a second live run would allocate the same
positions. Positions, like the clock reading and the arrival of a
delivery, are assigned at admission and are inputs to the judgment.

### 5.9 Bounds and costs

| Bound | Value | Why |
|---|---|---|
| Members of a group | 32 | One list slot of the order scope, and the fan-out bound of a `relate` |
| `reads` per input | 4 | Four fetches before a turn, as `presents` allows four facts |
| Items per read | 64 | The list bound of the contract's revision 19 |
| Pending rows per scope | 1 | One sequenced input at a time |
| Reserved by a prepare | its commit or abandon, plus the settling entries its effects open | "Room to settle". The prepare is new work. The commit and abandon are settling entries |
| Reserved by an allocation | its resolution, hole, or expiry | The `open` state's one settling entry |
| Group lifetime | 1 minute to 30 days, required | The bound on an unresolved position. The package declares it |
| Entries per attempt, applied | 2 in the order scope (allocation, then resolution) and 2 in the member (prepare, then commit) | 5.3 and 5.4 |
| Entries per attempt, refused after allocation | An act: 2 in the order scope (allocation, then hole) and 0 in the member. A delivery: as applied, because its refusal is prepared and committed | 5.4, step 6 |
| Entries per attempt, refused before allocation | 0 for an act, and for a delivery answered `unavailable`. 1 in the member, outside the order, for a delivery decided `order-left` or `not-a-member` | 5.4, step 3 |
| Entries per attempt, expired | 2 in the order scope (allocation, then expiry, which is that allocation's outcome) and 0 or 2 in the member (none, or prepare then abandon). The retry is another attempt | 5.3 and 5.4 |
| Order scope capacity | As any scope's | Bounds the group's lifetime count of sequenced inputs. `scope-full` refuses an allocation |

The costs, stated plainly: two round trips and two own entries for every
applied attempt, the round trips to one object that only appends; two
order entries and no own entry for an act refused after allocation, and
the applied cost for a refused delivery;
a fence on the member for one round trip in the ordinary case; a
reader's wait as the failure model of 5.5 states it. A group whose
exchanges are strictly sequential pays for nothing. That case is one
owner, which stays the first choice.

### 5.10 What this note does not provide

Atomic change across members (reserve-then-apply under the shared order
is the next level). Joining later, and groups that cross rooms. Platform
scopes in a group (open point O3). A barrier of any kind, by design.

## 6. Source order, and the ordering paragraph

### 6.1 The bound on a delivery's age

Draft 1 gave handlers a `lag` guard. The first review found that it
conflated a guard refusal, which writes no entry and runs no effect,
with conditional effects, which belong to an applied entry. The bound is
now the `late` form of the application packages note, section 4.1:

```ts
late?: { within: { seconds: number }; reason: string; then?: { effects?: EffectForm[]; sends?: SendForm[]; attention?: AttentionForm[] } };
```

The bound and the reason are always present. A delivery is late when the
source entry's time plus `within` is strictly before the commit's clock
reading. Late with no `then`: refused with the reason
`{ code: "late", name }`; none of the handler's effects, sends, or
attention is written, and the delivery's deciding entry with its one
result send is written as for any refused request delivery (packages
note, section 4.1). `late` is a form of request handlers only; an
advisory delivery is never refused. Late with `then`: the branch applies instead of the handler, and the
entry is applied and marked `late`. Never both. The judgment order is
dispatch, `spacing`, `late`, guards. `late` judges a time, so
`clock-behind` applies. In a sequenced handler the reading compared is
the judgment time, the prepare entry's clock reading (5.2), so a
delivery that was fresh when prepared stays fresh when its commit is
written later, after a lost resolution reply or an eviction. The `EntryPart` `"time"` and the operand
`{ source: "time" }` stay, because the form reads them. Slice S1 builds
the form from that section, as asserts b53643f2 and d66ec837 on S1
state.

### 6.2 Source order for `tell` handlers

`ReceiveType` gains

```ts
order?: "arrival" | "source";             // default arrival
```

With `source`, the receiver keeps, per source scope and handler, the
highest `(seq, n)` of the deliveries it has applied. It answers
`superseded` to a `tell` whose `DeliveryCause` is lower than that, and
writes a `superseded` entry as a `relate` does for an older revision
(`docs/scopes.md`, "Relationship updates"). This is suppression of an
older delivery that arrives after a newer one, and nothing more. An
older delivery that arrives first is applied, and a newer one after it
is applied too, so two arrival orders can leave different states. It is
not a latest-value guarantee, and it detects no gap. The witness names
its observation exactly: the sequence of applied pairs per source is
strictly increasing in every run, the lower-first run applies both, and
the higher-first run applies one and writes one `superseded` entry. The
copy of the highest pair is bookkeeping derived from the journal, and
replay recomputes it.

### 6.3 The ordering paragraph

This head adds a paragraph "Order" to the composition section of
`docs/scopes.md`. It states today's behaviour: a delivery takes effect
at the receiver's position; deliveries from different senders have no
order; a `relate` update older than the copy is superseded; every
order-sensitive decision has one owner.

## 7. A worked example: the grow site and its rooms

The grow package has one `site` scope and one `room` scope per grow room
([grow design](2026-10-17-grow-operation-application-design.md), section
6.1). Written as connections in the package:

| From | To | Form |
|---|---|---|
| `room.alerts` (each room) | `site.alerts` | a `relate` fan-in, one copy per room, `copies` 32 |
| `site.presence` | `room.presence` (each room) | a `relate` fan-out of who is present |

Every site rule the design names is order-insensitive. The overview sums
counts, and routing sends each alert to the holders of the authority it
needs inside its own room. So the grow package needs no group, and the
demo's package declares its scopes at the recorded level. This note
changes nothing in plan 033's G0 to G3.

The two-scope application that M2 asks for ("one owner of a shared
amount", applications note, section 7) is the first witness of the
sequenced level. Its two scopes are one group. The owner's `spend` act is
sequenced. The requester's `ask` handler is sequenced and reads the
owner's balance as of its cut with a `count` guard over the owner's
`ledger` items. The owner still decides. The requester's read is for a
consistent view, not for allocation. The witness shows these things:

- two requesters reading the owner as of positions 5 and 7 see the
  owner's committed entries at or below their cuts and no others, in
  any arrival order, and a requester reading before the owner's first
  commit sees the owner's genesis fold, which opens the ledger and is
  not empty;
- the reactor model's relay trap (one cause reaching a scope by two
  paths) takes two positions in whichever order they are allocated, and
  the owner's state after both equals the fold of the two prepared
  judgments in position order, on every run and in replay;
- an allocation whose reply is lost leaves the reader `member-pending`
  until the owner resumes and prepares, and the reader's cut then
  includes the owner's commit;
- a resolve whose reply is lost, with an unsequenced act and a clock
  advance attempted during the fence (both answered `busy`) and an
  eviction before the commit, resumes to exactly the prepared entry's
  commit, and replay verifies that the resolution names its hash;
- an owner stopped past the group's lifetime before preparing leaves a
  hole the reader passes over, and the owner's later resolve is refused
  `expired` and writes an abandon entry;
- an owner stopped after resolution and before the commit leaves the
  reader `behind`, not on an older cut, until the owner resumes;
- a requester with a `staleness` of one hour proceeds while the owner's
  newest position is still open;
- a reader at X equal to the owner's leave position reads the cut, and
  one above it reads the empty page, and a `close` with an open
  allocation is refused;
- source order (6.2): the lower-first run applies both deliveries, and
  the higher-first run supersedes one;
- the effective fact (5.2): the owner's sequenced `spend` sends a `tell`
  and creates a child. The receiver verifies the delivery, and the child
  verifies its source, only against the commit entry. A delivery that
  cites the prepare entry is refused `source-not-effective` before the
  commit and after an abandon. The signer's receipt and a repeat of the
  intent name the commit. A duplicate of the original delivery during
  the fence is `busy`, and after the commit it is answered from the
  index;
- capacity (5.3, 5.4): at the journal limit a sequenced act is refused
  `scope-full` before any allocation. A prepared act commits after an
  eviction while another member fills the remaining free capacity. An
  order scope at its limit refuses a new allocation `scope-full` and
  still records the resolution, the hole, and the expiry of the
  allocations it admitted;
- the derivation context (5.2): a sequenced act that opens an item, and
  a sequenced handler that opens an item with a self reference and a
  send carrying the new item, commit with the item's ID equal to the
  commit's sequence, verified through native item and fact reads and in
  replay; a sequenced delivery prepared as fresh under `late` at time 5
  with a bound of 10 from a source time of 0, then committed at time 20
  after a lost resolution reply and an eviction, is applied as fresh,
  and a deadline its effect set is due at the prepare's time plus the
  declared seconds.

## 8. Changes to existing documents

| Document | Change |
|---|---|
| Archive note, 15.2 | The `archived` level is withdrawn. "The declaration is a requirement; the room gives permission" becomes section 4 of this note. Point 5 of 15.1's decision is amended by Hugh's decision of 18 October 2026 |
| Archive note, 15.3 | "A scope is archived when its definition declares it and its room permits it" reads "when its room is bound (section 4) and its level is recorded or sequenced". The prefix begins at position 0. The retained-input table gains "any that records `reads`: the retained page each read cites, by its digest, kind `page`" |
| Archive note, 15.5 step 1 | The archiver reads the binding, not the level |
| Archive note, 15.6 | "A scope whose level is Recorded or Live has no `archive` member" reads "A live scope, or a scope of a room with no archive binding, has no `archive` member". The row `not-archived` reads "The room has no archive binding, or the scope is live" |
| Archive note, 16.1 | "declares one level: Live, Recorded or Archived" reads "Live, Recorded or Sequenced" |
| Scope contract, D5-5 | Holds for every input but a sequenced one. A sequenced input reads as of its cut (5.5). Open points R1-5 and R1-27 gain this as a second answer beside the commitment |
| Scope contract, entries and retained inputs | `Entry.position` and `Entry.reads` (5.2), the `prepare`, `commit`, and `abandon` input kinds (5.2), the retained kind `page` (5.5), and the three order inputs (5.3) |
| `docs/scopes.md`, Composition | The paragraph "Order" (this head). The sequenced turn, the `at` read, and the order scope when S4 lands |
| `docs/roadmap.md`, Durability levels | The three levels of section 3 and the archive as a binding |
| Plan 033, slice 9 | As 4.5 |
| Applications note, section 4 | The manifest lists groups: name, member definitions in order, and lifetime. The install creates the order scope first, then the members with their `order` field, then enrolls each (5.3) |

## 9. Slices

Serial for one builder unless said. Nothing here goes ahead of M1, G0,
or M2a in plan 033.

| Slice | What | Needs | Done when | Size |
|---|---|---|---|---|
| S1 | The `late` form (packages note 4.1, per 6.1) and source order (6.2): contract, validator, derive, scope, replay, tests | nothing | A late delivery with `then` takes the branch, and a fresh one takes the handler, with the entry marked. A late delivery with no `then` is refused with the reason code `late`, keeping its deciding entry and result; the validator refuses `late` on an advisory handler. Each has fresh, boundary, and late deliveries and a `clock-behind` control. A `source`-ordered handler applies both deliveries in the lower-first run and supersedes the lower one in the higher-first run, with the applied pairs strictly increasing in each. All replay | 1 day |
| S2 | The archive as a binding (section 4): the `archived` literal withdrawn, the directory slot and `bind-archive`, the claim field, the manifest requirement and the install refusal, and the archiver's target step | this note approved | A room bound at its claim archives its platform scopes and an installed package's scopes. A room bound later archives them from position 0. A package that requires the archive is refused in an unbound room | 1 to 2 days, before plan 033's slice 9 |
| S3 | The contract of the sequenced level (5.2): the level, the mark, `reads` with `staleness`, the `read` operand, the `prepare`, `commit`, and `abandon` input kinds, the three order inputs, the retained kind `page`, the `order` kind, the reservation rules of 5.3 and 5.4 and the derivation context of 5.2 (prospective sequence, judgment time) in derive, and the validator | this note approved, and M2a's package format for groups in the manifest | The validator admits a sequenced definition and refuses each misuse named in 5.2. `owed` and `fits` count a prepare, an allocation, and their settlements as 5.3 and 5.4 say | 1 to 2 days |
| S4 | The order scope and the sequenced turn (5.3 to 5.7): `platform:order@1` with its items, acts, three requests, and expiry; bootstrap by enrolment; the pending row, the prepare entry, the fence, the commit and abandon entries, and resume; the fold's indexes, receipts, settlement, and the delivery proof on the commit entry; derivation in the prospective context; the cut, finality, and the `at` read; `leave` and `close` | S3 | The two-scope witness of section 7 runs in memory and on native storage with every check of its list. A refused sequenced delivery prepares and commits its deciding entry with its result, and a late refusal in a sequenced handler is one such; a refused sequenced act writes nothing and holes its position; a delivery refused before allocation is `unavailable`, or decided outside the order after `leave`; each with a native witness, and the outside-order refusal with its cited order head and its repeat answered from the deciding entry | 5 days |
| S5 | Replay and archive of a group (5.8, 4.2): the four answers, the page witness, the commit and abandon checks, the effective-fact, sequence, judgment-time, and reservation checks, and the order scope's ref in a clone | S4, A2, and A3 | The witness's journals and order scope replay from a clone. A tampered position, a page that differs, an `open` allocation below a cited cut, a resolution naming another hash, and an entry inside a fence are each a mismatch. A prepare at the head is `pending`. A missing order journal or commit entry is `missing-dependency`. A refused delivery's prepare and commit verify, and a refused act's holed position verifies. The outside-order refusal verifies with its cited head, while the same entry with the citation removed or forged, and an applied entry without a position, are each a mismatch | 1 day |
| S6 | Documents (section 8) | S2, S4 | The contract, the guide, the roadmap, and the archive note say what the runtime does | with S2 and S4 |

## 10. Decisions

1. The archive is a binding of the room, set at the claim or by
   `bind-archive`, never unset. A package may declare it as a
   requirement, which the install act checks. Hugh, 18 October 2026.
2. The third level is `sequenced`. It is pinned, like every level. Hugh,
   18 October 2026.
3. No backward compatibility for either change. Hugh, 18 October 2026.
4. Allocation, resolution, and holes are platform requests that each
   write one entry in the order scope. Allocation is idempotent per
   member and input while open. The order scope judges nothing about the
   input. Planner.
5. A member's state as of a cut position is the fold of its journal
   through its last commit entry at or below it, or through its genesis.
   A reader takes that cut only when every allocation to the member at
   or below it is final in the order journal. Planner, drafts 2 and 3.
6. No barrier. A sequenced input waits only for the members it reads,
   and only for their positions at or below its cut. Planner.
7. A refused sequenced act is a hole recorded in the order scope. A
   refused sequenced delivery is prepared and committed at its position,
   because its result is an effective fact (5.4, step 6); a delivery
   refused before allocation is `unavailable`, or decided outside the
   order with a cited order head once the member is not `joined` (5.4,
   step 3; 5.8). An unresolved position expires into a hole after the
   group's lifetime, by the order scope's own timed rule. A hole never
   gains a commit.
   Planner, draft 2.
8. Deliveries, sends, and effects keep their contract, with the commit
   entry as the effective fact. A group orders reads. It does not make a
   transaction. Planner, draft 4.
9. The name is "sequenced". Planner.
10. A member writes its judgment as a prepare entry, has the order
    scope's resolution bind that entry's hash, and only then writes the
    commit entry that puts the judgment into effect. Between the two it
    writes nothing else. Planner, draft 3.
11. A group is formed by enrolment from its creator after the members
    exist, incarnation included. No member identity is claimed before
    its genesis. Planner, draft 2.
12. A read's witness is typed: the cut entry in the entry domain, the
    page in its own domain, and absence by the order journal. Planner,
    draft 2.
13. `staleness` on a read is the author's declared tolerance for age,
    measured on the order scope's one clock. Planner, draft 2.
14. The lag guard is withdrawn. The `late` form of the packages note is
    the bound on a delivery's age. Planner, draft 2.
15. Only an open allocation expires. A resolved position's result is
    determined and durable, and a reader waits for it only as long as
    its member is unavailable. Planner, draft 3.
16. The one absence is a left member, below the reader's cut. A member
    with no committed position reads as its genesis fold. Planner,
    draft 3.
17. `close` requires every member left and no allocation open. Members
    settle final positions from the order journal after it. Planner,
    draft 3.
18. Source order is suppression of an older delivery that arrives after
    a newer one, not a latest-value guarantee. Planner, draft 3.
19. The commit entry is the one effective fact of a sequenced input.
    Indexes, receipts, settlement, delivery causes, genesis sources, and
    fact operands name it, and a prepare entry is accepted by none of
    them. Planner, draft 4.
20. A prepare reserves its commit or abandon and the settlement of the
    pending work its effects open. An allocation reserves its outcome.
    The commit, abandon, resolution, hole, and expiry are settling
    entries. Planner, draft 4.
21. A prepare derives in the commit's context: the commit's sequence is
    the prepare's plus one, and the prepare's clock reading is the one
    judgment time. Planner, draft 6.

## 11. Open points

| Point | Question | Proposed |
|---|---|---|
| O1 | The cost of folding a member's items to a cut per position, and whether to cache folds | Measure in S4. Answer `busy` past a bound. Cache the last 8 cuts |
| O2 | Whether an allocation for a delivery uses the `DeliveryCause` digest or the message digest as `input` | The `DeliveryCause` digest. A repeat of the same delivery then gets the same position while it is open |
| O3 | Platform scopes in a group: a sequenced `platform:destination@7` for merge-and-publish, and a room-level order scope at establish | After the two-scope witness, in its own note |
| O4 | Which state a sequenced act's own guards read | Its own live head, as any act. The cut is for other members (5.5). Answered in draft 2 |
| O5 | How `reads.member` resolves when two packages install groups with the same names | Names are scoped to one order scope. `reads.member` resolves through the scope's own `order` reference |
| O6 | Whether a sequenced handler for a `relate` update allocates before or after the revision check | After. A superseded update takes no position |
| O7 | Whether the order scope should tell a member that its position expired | Attention only in the first version. A `tell` once timed rules may send (packages note, 4.3) |
| O8 | The `page` kind's byte bound, and whether a page is shared across readers of one cut | 64 items by the member's slot types. One retained copy per reader's scope |
| O9 | Whether a reader may fold a member's resolved but uncommitted prepare entry itself, from the two journals, so that `behind` disappears | Not in the first version. A member's own state must come from its own journal, and the commit entry is what makes the prepare effective there. Revisit after S4's measurements |

## 12. Changes in drafts 2 to 6

**Draft 6**, after review cfe41d9e of head 11bc3eaf, which carried the
findings of review e3c73ac9 on draft 4:

| Finding | Where answered |
|---|---|
| F1, P1: prepared effects were derived with the prepare's sequence as `self`, and the judgment time was contradictory | 5.2 the derivation context: the commit's sequence is the prepare's plus one, and the prepare's clock reading is the judgment time for `notAfter`, guards, `late`, and derived deadlines. 5.4 step 5. 5.8 the sequence and judgment-time checks. 6.1. Decision 21. The derivation-context controls in section 7. S3 to S5 |
| F2, P2: 5.9 counted a refused input as one order entry and expiry as an extra entry | 5.9: one row per attempt outcome, hand-counted against 5.3 and 5.4 |

**Draft 5** rewrites the note for clarity at Hugh's request. It adds the
terms paragraph in 5.1 and changes no rule.

**Draft 4**, after review 47cd6158 of head f019da60:

| Finding | Where answered |
|---|---|
| F1, P1: the prepare and commit had no effective-fact model, and a prepare could pass for an applied fact | 5.2: the `prepare`, `commit`, and `abandon` input kinds, the commit as the one effective fact, `source-not-effective`. 5.4 step 8 and the repeat and duplicate rule. 5.6. 5.8 the effective-fact checks. Decision 19. The effective-fact witness in section 7. S3 to S5 |
| F2, P1: the prepare reserved only its effects, not its settlement, and allocations' outcomes were unreserved | 5.3: the allocation's `expires` deadline reserves its outcome, and the three requests settle it. 5.4 steps 3, 6, and 8 reserve, transfer, and release. 5.5: capacity is never the cause of a wait. 5.9 rows. Decision 20. The capacity witness in section 7. S3 |
| F3, P2: 6.1 and S1 still used `late: "refuse"` | 6.1 restated with the amended form and the asserts b53643f2 and d66ec837. S1's row |

**Draft 3**, after review a98cca3e of head 66439e2a:

| Finding | Where answered |
|---|---|
| F1, P1: resolution bound only member, position, and input, and state could change between resolution and commit | 5.2 the prepare entry and the commit and abandon inputs. 5.3 the resolution carries the prepare entry's fact. 5.4 steps 6 to 8 and the fence. Decision 10. The lost-resolve control in section 7 |
| F2, P1: a resolved but uncommitted position defeated the finite wait | 5.5 the failure model. Decision 15. The stopped-after-resolution control |
| F3, P1: genesis, holes, and leave did not share one cut rule | 5.5: the cut entry is a commit entry or the genesis, the page is always a fold, and holes need no distinction. The one absence is `left` with L below X. 5.7: X equal to L reads the cut. Decision 16. The nonempty-genesis and X-equals-L controls |
| F4, P1: `close` could strand open positions | 5.3 and 5.7: `close` requires no open allocation, and settlement after close comes from the order journal. Decision 17 |
| F5, P2: source order is high-water suppression | 6.2 restated with the lower-first trace. The relay-trap witness names the position-order fold. S1's row. Decision 18 |

**Draft 2**, after review 2ff202f0 of head 365f56a5:

| Finding | Where answered |
|---|---|
| F1, P1: a returned cut could change after a lost allocation reply, and a cleared refusal could be retried at its old position | 5.5 finality from the order journal. 5.3 holes and expiry as entries of the order scope. Decision 7 |
| F2, P1: the restart rule gave no finite progress | 5.4: the pending row holds the input itself and is resumed by the object. 5.3: expiry after the group's lifetime. The delivery duty continues at a new position |
| F3, P1: the read witness mixed two byte domains and had no replayable absence | 5.2 and 5.5 `GroupReadUse`, with the page in its own retained kind and `uses` in the entry domain only. 5.8 |
| F4, P2: group creation did not bind the promised identities | 5.3 bootstrap by enrolment after the members exist, incarnation included. `forming` and `open`. Decision 11 |
| F5, P2: section 2 said no judge reads a binding while install read it | Section 2 rewritten with three kinds. 4.1 and 4.3 reworded |
| F6, P2: late binding must include the genesis and change 15.6 | 4.2 archives from position 0 with the definition closure. Section 8 lists the 15.3 and 15.6 changes |
| F7, P2: the lag paragraph conflated guard refusal with conditional effects | 6.1 withdrawn in favour of the `late` form. S1 amended by assert |

The shape of the draft 2 fixes follows Spanner's safe time, read against
dap's assumption of no clock bound: finality comes from the one journal
that serializes allocation.

**After landing, 18 October, 22:30 and 23:30.** Steps 3 and 6 of 5.4,
5.2, 5.8, the cost rows of 5.9, 6.1, and slices S1, S4, and S5
distinguish a refused act from a refused delivery. A refused delivery
keeps its deciding entry and its one result, as the contract's section
7.4 requires, so in a sequenced scope its refusal is prepared and
committed at its position like an applied judgment, under the same
fence, reservation, resume, and replay rules; a refused act writes
nothing and holes its position. A delivery refused before allocation is
`unavailable`, or decided outside the order once the member has left.
The late reason has the code `late`, and `late` is a form of request
handlers only. Builder question `0784600e`, checker corrections
`91c866dc` and `b92bd90c`, review `44ad8b0d` F1 to F4, planner decision
on that question and its amendment. Draft 3 (19 October, 00:30) gives
the outside-order refusal its retained justification and replay rule
(review `d028930e`, F1) and aligns 5.1, decision 7, and the packages
note's section 9 with the act and delivery distinction (F2).

## Sources

- Lohstroh, M. *Reactors: A Deterministic Model of Concurrent Computation
  for Reactive Systems.* UC Berkeley EECS-2020-235, 2020. Chapters 2, 3.8,
  and 5.
- Menard, C., Lohstroh, M., and others. *High-Performance Deterministic
  Concurrency using Lingua Franca.* arXiv 2301.02444, 2023. Section 4.3.
- Lee, E. A., and others. *Consistency vs. Availability in Distributed
  Cyber-Physical Systems.* ACM TECS, 2023, doi 10.1145/3609119. The CAL
  theorem.
- Corbett, J. C., and others. *Spanner: Google's Globally-Distributed
  Database.* OSDI 2012. Section 4.1.3, safe time.
