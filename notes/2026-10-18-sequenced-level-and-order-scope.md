# The sequenced level and the order scope

18 October 2026. Design note for review. It decides two things about what
a scope's definition declares, and designs the runtime for the second.

1. **The archive is a binding of the room, not a level of the
   definition.** The `archived` level of the archive note
   ([section 15.2](2026-10-09-shared-language-volatile-acts.md), point 5
   of its decision) is withdrawn. A room binds its repository to the
   archive at its claim or later, and a package may require that binding.
2. **The third level is "sequenced".** A sequenced scope keeps its own
   journal, as a recorded scope does, and shares an order with a group of
   scopes through one order scope. A sequenced act or handler may read the
   other members' state as of its position, soundly, which D5-5 of the
   scope contract forbids for every other input.

The note also adds two small forms that the same analysis asked for: a lag
guard on handlers, and source order for `tell` handlers. It commissions
nothing by itself; section 9 names the slices and where they fall in
[plan 033](plans/033-2026-10-18-grow-room-demo.md).

Hugh decided on 18 October 2026 that the implementation owes no backward
compatibility: a room created before these changes is destroyed or
inoperable where they would reach it. No migration is designed.

The direction comes from an analysis, the same day, of the reactor model
(Lohstroh, *Reactors: A Deterministic Model of Concurrent Computation for
Reactive Systems*, EECS-2020-235, 2020; Menard, Lohstroh and others,
*High-Performance Deterministic Concurrency using Lingua Franca*, arXiv
2301.02444, 2023). Section 1 states what it found. Source facts cite
`path:line` at main `feccbbcfe`, of 18 October 2026.

## 1. Why

Scopes compose by delivery ([architecture](../docs/architecture.md),
"Scopes compose by delivery"). A send is written with its entry; the
receiver judges the delivery in its own turn, and its own commit gives it a
position. "Delivery is at least once and may be out of order"
(`packages/scope/src/outbox.ts:6`). No order across senders is asserted,
and an application that needs one rebuilds it from each delivery's source
position (`notes/2026-10-13-fold-publication.md`, "admission order is not
source order"). The roadmap says one act cannot take effect in two scopes
at once, and that the form of composition is "a shared constraint has one
owner" ([roadmap](../docs/roadmap.md), "What runs", "Not offered").

The reactor model gets deterministic composition from three things:
components that expose ports instead of addresses; a container that owns
the wiring, so that every dependency is computable; and events that carry
tags and are processed in tag order, with a fixed rule for simultaneous
events. Its own account of distributed execution says that when the
latency cost of ordering is too high, the designer should choose
unordered ("physical") connections, and that once a tag is assigned the
behaviour is deterministic anyway.

Read in those terms, dap today is this:

- Inside a scope, everything the model asks for is present. The turn
  (`docs/scopes.md:207-228`) is the event queue with a fixed tie-break.
  The commit is the tag assignment. A definition declares what every act
  and handler reads and writes, with no opaque body at all.
- Every delivery is an unordered connection: the receiver's commit assigns
  its position, and nothing orders deliveries from different senders. A
  `relate` update orders per key by the owner's revision and nothing else.
  That is the right default, because dap's latencies include people, and
  the analysis keeps it as the default. But it is written nowhere; section
  7.3 adds the paragraph.
- "A shared constraint has one owner" is the model's rule that state is
  shared only inside one actor. Every order-sensitive decision goes where
  one journal orders it.
- Tags already travel. A delivery's cause carries the source scope, the
  source entry's position and hash, and the send's ordinal
  (`packages/contract/src/scope.ts:54-59`). What dap lacks is a place where
  a group's order is held, and a rule that lets an input read other scopes
  as of a position.

The sequenced level supplies those two things for the scopes that need
them, and only those. Everything else stays as it is.

## 2. The principle: what a definition carries

A definition carries what changes judgment: anything that adds an
operand, a guard, a form or a member of an entry, or changes the answer to
an act. It is pinned by digest at genesis and never changes
(`docs/scopes.md:265-268`), and a package's semantic id covers it
([applications note](2026-10-15-self-contained-applications.md), "The
three identities").

A binding of the room carries what only changes where bytes are copied.
It is set by a room act, it may be set later, and no judge reads it.

By that test:

| Property | Adds a form or changes an answer | Where it lives |
|---|---|---|
| Live | Yes: no history, the answers `applied` and `reset` (archive note, section 16.2) | Definition, as today |
| Recorded | Yes: a history, a receipt | Definition, as today |
| Sequenced | Yes: the position in the entry, the `sequenced` mark, group reads in guards | Definition (this note) |
| Archive | No: the archiver runs after the commit from the object's alarm, writes no entry, and "archived through N" is a read (archive note, 15.1 and 15.5) | A binding of the room (section 4) |
| Publication | It is an act with sends to the destination, declared as any act is | Definition, as today; the destination's repository is a room property, as today |

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

| Level | What survives | Whose order | Can be read as of a position | Can be cited as a fact |
|---|---|---|---|---|
| Live | Nothing | None | No | No |
| Recorded | The journal | Its own | No | Yes |
| Sequenced | The journal | Its own, and the group's | Yes, by a sequenced input of the same group | Yes |

Each level implies the one before it. A live scope has no entries, so it
can carry no position and cannot be a member of a group. It may read a
sequenced scope's state as any client does, and nothing more.

**One level for a scope**, as the archive note's 15.2 says. An
application that needs a live surface beside a sequenced record is two
scopes.

## 4. The archive as a binding of the room

### 4.1 What changes

The archive note's 15.2 declares the archive as a level in the definition
and makes the room's permission a second condition: a definition that
declares `archived` is created only in a room that permits it, and is
refused `archive-unavailable` otherwise. Point 5 of its decision says the
level "is not a setting of a deployment or of a scope kind".

This note withdraws the level and keeps the permission, renamed a
**binding**. The reason is section 2: no judge reads the level. The
writer (15.5) finds the room's repository and archives after each commit;
the verifier (15.7) reads a clone. Neither needs the definition to say
anything. What the application needs is not the level but the guarantee,
and a package can require a guarantee of the room it is installed into.

The room-permission half of 15.2 was never built: the register and the
directory have no archive field (`packages/platform/src/register.ts`,
`packages/platform/src/directory.ts`, no match for "archive"), and A2 and
A3 landed to the fixture-only cutoff with archived-level admission out of
scope (planner decision `89376d74`). So the change costs the one
`"archived"` literal in the contract and the replay package's reading of
it, and nothing deployed.

### 4.2 The binding

The directory's `repository` item (`packages/platform/src/directory.ts:165-179`)
gains one value slot:

```
archive: { fixed: false, required: false, of: { type: "enum", of: ["journal"] } }
```

It is set by the claim, through a field `archive` of the register's
claim that the directory's `establish` copies, or later by one admin act
of the directory:

```
bind-archive: { step: "transition", on: "repository", grant: "directory.archive",
                fields: { archive: { type: "enum", of: ["journal"], required: true } },
                guards: [{ state: ["established"] }],
                effects: [{ value: { slot: "archive", from: { field: "archive" } } }] }
```

There is no unbinding act. A room that has archived keeps archiving; the
journal under `refs/artroom/journal/` is never left behind the head on
purpose. An operator who wants it to stop removes the destination's
credential, and the archiver reports `unavailable` as 15.5 has it.

**Who archives.** Every recorded and sequenced scope of the room, platform
and application alike, once the binding is set. Inboxes and the register
stay out, as 15.1 decided. The order scope of section 5 is in, because a
member's replay reads it.

**When.** The archiver's step 1 ("Target", 15.5) reads the binding where
it reads the repository today. A scope created before the binding is set
archives from position 1 at the next pass; that is a long lag, which 15.1
already allows, and nothing else. No entry records the moment the binding
reached a scope; the archive's own `head.json` and the `archivedThrough`
bookkeeping say what is archived.

### 4.3 The requirement

A package manifest (applications note, section 4, "the host contract it
needs") may list `archive` among what it needs. Install refuses
`archive-unavailable` when the room's directory has no binding. The
refusal moves from scope creation, where 15.2 put it, to install, where
the admin who runs it can set the binding and try again. A package that
does not require it installs in any room, and its scopes archive when and
if the room binds.

### 4.4 What does not change

The layout (15.3, 15.4), the writer's five steps and its credential
(15.5), the reads (15.6), the verifier (15.7), the limits of a clone
(15.8) and the slices A4 and A5 keep their text. "Archived through N"
keeps its meaning. A client that wants the stronger guarantee for one act
still waits until its receipt's position is at or below N.

### 4.5 Plan 033, slice 9

The demo-room archive slice says "archived-level admission with the
room's permission". Under this note it is: the demo room's directory holds
the binding, set at its claim; the reviewed archive policy and
configuration for the hosting deployment; a real destination and token;
A3's archiver wired for that room; and the disclosure on the `/grow/`
page. The grow package does not require the archive, so its install does
not depend on the binding, and the slice can set the binding on a running
demo room.

## 5. The sequenced level

### 5.1 In one paragraph

A group is a set of sequenced scopes and one **order scope**. The order
scope's journal is the group's order: each of its entries allocates one
position to one member for one input. A member asks for a position before
it judges a sequenced input, reads the other members as of that position,
judges, and commits an entry that names the position. Nothing in the group
waits for the whole group. A member waits only for another member's
earlier positions, and only when it reads that member. Deliveries between
members, and to and from the rest of the room, stay as they are.

The order scope is to ordering what the membership scope is to authority:
a scope every member records at genesis, reads before the turn, and cites
in its entry; a verifier reads it again.

### 5.2 The declaration

**The level.** `level: { name: "sequenced", version: 1 }`.

**The group reference.** A sequenced scope records its order scope at
genesis, as a directory records its membership reference
(`packages/platform/src/directory.ts:172-176`). The `create` send that
makes a sequenced scope carries a field `order` of type
`{ type: "scope", kind: "order" }`; the genesis entry records it; the
scope reads it from its own genesis for life. A `create` of a sequenced
definition with no `order` field, or one that names an order scope whose
member list does not include the seed's ID, is refused
`order-unavailable`.

**The sequenced mark.** `ActType` and `ReceiveType`
(`definition.ts:92-125`) gain two optional members:

```ts
sequenced?: true;                         // this input takes a position in the group's order
reads?: Record<string, GroupRead>;        // at most 4; only with `sequenced`
export interface GroupRead { member: string; items: Range }   // `member` names a member of the group by its name in the order scope
```

A timed rule is never sequenced: it is the scope's own, drained before
any other input. A genesis is never sequenced.

**The group operand.** A guard, an effect or a send of a sequenced act or
handler may use

```ts
| { read: string; part?: Part }           // the list that a `reads` entry bound, as of this input's position
```

as the `list` of `each`, `has`, `count`, `distinct` and `sameSet`, and as
an `element` source inside them. A read is a list of records: for each
item the range covers in the member as of the position, its ID, state,
revision and value slots, in the member's own types. The validator refuses
`read` anywhere but a sequenced act or handler, and refuses `reads` on an
input without `sequenced`.

**Where it is in the entry.** `Entry` (`packages/contract/src/entry.ts:14-27`)
gains one optional member:

```ts
position?: { at: FactRef };               // the order scope's entry that allocated this input's position
```

and the entry's `uses` lists, for each read, the member's cut entry
(5.4) with its content digest, as it lists every foreign entry read while
judging.

### 5.3 The order scope

A platform definition, `platform:order@1`, of a new scope kind `order`
(`ScopeKind`, `packages/contract/src/scope.ts:19`; `PlatformDefinition`,
`scope.ts:41`).

**Items.**

| Item | Slots | States |
|---|---|---|
| `group` (one) | `name`: text; `members`: list of records `{ name: text, scope: scope ID }`, at most 32, fixed | `open`, `closed` (final) |
| `member` (many, max 32) | `name`: text, fixed; `scope`: scope reference, fixed; `since`: int, fixed; `until`: int | `joined`, `left` (final) |

**Acts.**

| Act | Who | What it does |
|---|---|---|
| `establish` (genesis) | the creating scope's `create` send; fields `name` and `members`, the member seeds' IDs in order | Opens the `group`, and one `member` per listed ID with `since` 0. Member IDs are known before the members exist, because a scope's ID is the digest of its seed (`docs/scopes.md`, "Creating a child") |
| `leave` | an admin, grant `order.leave`; field `member` | Transitions the member to `left` with `until` set to this entry's own position (section 5.7) |
| `close` | an admin, grant `order.close` | Transitions the group to `closed` when every member is `left`. The scope is then terminal |

**The allocation.** It is not an act and not a delivery. It is a
platform request, as the authority read is: a member's object asks the
order scope's object, through the namespace, with the member's own
authorization and the deployment's fetch time limit. The request carries
`{ member: ScopeRef, input: Digest }`, where `input` is the digest the
scope contract gives the input (an intent's digest; a delivery's
`DeliveryCause` digest). The order scope answers with the fact of one
entry of its own, or `refused` with a reason, or nothing within the
limit.

The order scope writes one entry per allocation, with a new input kind:

```ts
| { type: "allocation"; member: ScopeRef; input: Digest }
```

Its `seq` is the position. The entry is written in the order scope's own
turn, so allocations are serialized by the one thing that serializes
everything in a scope. It is idempotent per `(member, input)`: a second
request for the same pair answers the first entry, so a restarted turn
keeps its position. A request from a scope that is not a `joined` member
is refused `not-a-member`. A request after `close` is refused
`order-closed`. The order scope judges nothing else about the input: it
does not read the member, does not fetch, and holds no bytes but the
digest. That keeps the one object every member waits on to an append.

### 5.4 The turn of a sequenced input

The turn (`docs/scopes.md:207-228`) gains two steps for an input whose
act or handler is `sequenced`, between the drain and the noting of the
head:

1. Before the turn, each foreign entry the input names is fetched and
   checked, as today.
2. The drain, as today.
3. **Allocate.** The scope asks its order scope for a position P for this
   input. No answer within the limit: the turn ends `unavailable` with the
   reason `order-unavailable`, nothing is written, and the sender keeps
   the duty. A refusal: the input is refused with the order scope's
   reason, and nothing is written. On an answer, the scope writes one
   bookkeeping row, **pending**: the input digest and P. At most one
   pending row exists; a scope judges one input at a time.
4. **Read.** For each `reads` entry, the scope reads the named member as
   of P (5.5). A member that cannot be read, or that reports a pending
   position below P, leaves the input not judged: the turn ends
   `unavailable` with the reason `member-pending`, the pending row stays,
   and the sender's retry gets the same P by idempotency.
5. The head is noted; the rule expressions are evaluated.
6. **The commit**, as today, and the entry carries `position: { at }`
   and the reads in `uses`. The pending row is cleared in the same
   transaction.

If the input is refused at step 6, no entry is written, as for any act
(`docs/manual/ten-terms.md`, "takes effect"), and the pending row is
cleared. The position P then has an allocation entry in the order scope
and no member entry: a **hole**. Holes are part of the order and harm
nothing: a reader as of a later position sees that P belongs to this
member and that this member's journal has no entry at P, and goes on. The
same holds for an `unavailable` that ends without a commit after the
pending row was cleared by a restart (below).

**Restart.** An object that restarts with a pending row re-reads its
journal. If an entry names the pending position, the row is stale and is
cleared. If none does, the row stays until the input is judged again
(the same P, by idempotency) or the input's lifetime ends, at which point
the row is cleared and P is a hole. A pending row therefore never blocks
another member for longer than one input lifetime
(`notes/2026-10-09-offline-and-sync-design.md`, the configured intent
lifetime).

**Unsequenced inputs** of a sequenced scope take no position and change
nothing above. They are judged under the rules of a recorded scope: no
`reads`, no `read` operand, and D5-5 holds for them.

### 5.5 Reading a member as of a position

**The cut.** Member N's state as of position P is N's journal through
its last entry whose `position` is below P, or its genesis if it has
none. Unsequenced entries of N before that entry are in the cut; those
after it are not, even when they were committed before the read. The cut
is a function of N's journal and the order scope's journal alone.

That definition has a consequence an application must plan for: what the
group reads of a member, the member must have written in a sequenced
entry, or in an entry before one. An act that only the member cares about
stays unsequenced; an act whose result another member reads is
sequenced. Sequence what the group reads or decides, and nothing else.

**The read.** A new read of the scope API, `at(P, range)`, answers the
items the range covers as of P, in one page bounded as `items` is, or
`pending` when the member holds a pending row with a position below P, or
`behind` when the member has not yet committed an entry at a position it
holds below P (the member's object knows its allocations from its pending
row and its journal; it reports `behind` only for its own pending row).
The read is served from the member's journal, not from its live items:
the member folds its items to the cut, which it may cache per position.
A member serves `at` under the limits it has for any reader and refuses
`busy` rather than queue without bound.

**Who may read.** A member of the same group, for a sequenced input, with
the member's own authorization, as the authority read is made. No session
is needed and none is checked; the read is the platform's own, as the
source read of a delivery is (`docs/scopes.md`, "Delivery"). A reader that
is not a `joined` member of the same order scope is refused.

**What the entry retains.** For each read, `uses` holds the cut entry's
fact and the content digest of the page that was read, so that a replay
can rebuild the page from N's archived or served journal and compare.

**No barrier.** No step waits for the whole group. A sequenced input at
P waits only for the members it reads, and only for those members'
positions below P. Two members that do not read each other never wait on
each other. This is deliberate: in the reactor runtime the barrier at
each tag is the main cost of its determinism (Menard and others, section
4.3), and the group avoids it by reading committed prefixes instead of
synchronizing steps.

### 5.6 What a sequenced input may do

Everything its act or handler may do today, plus `reads`. Sends are
unchanged and stay unordered deliveries; a `tell` to another member is a
delivery like any other, and the member judges it in its own turn with
its own position if its handler is sequenced. Effects change this scope's
items only, as today. There is no effect on another member. Atomic
change across members is not in this note (section 5.10).

### 5.7 Leaving, and the fence

A member leaves by an admin's `leave` act on the order scope. The act's
own position L is the fence:

- The order scope refuses every allocation to that member after L.
- A reader as of any P above L treats the member as absent: a read of it
  answers an empty page, and a `count` over it is zero. A read as of P at
  or below L reads the member's cut as before.
- The member itself keeps its journal and its unsequenced inputs. Its
  sequenced acts and handlers are refused `order-left` from the moment it
  observes the `leave` entry, which it reads before each sequenced turn
  (the allocation request tells it).
- A member's pending requests to others settle as they would for any
  scope; nothing is undone.

A scope never joins a group after its genesis, because the level and the
reference are pinned. An application that wants a scope in a group makes
a new scope and carries forward under gap 10 of the applications note.
`close` ends the order scope after every member has left; it is then
terminal and admits nothing.

### 5.8 Replay

The verifier (`packages/replay`) checks, for each entry with `position`:

- the order scope has an entry at that position whose input is an
  allocation naming this scope and this input's digest;
- the entry's `uses` include, for each `reads` entry of the act or
  handler, a cut entry of the named member, and that cut entry is the
  member's last entry with a position below P, and the page's content
  digest is what folding the member's journal through that entry gives;
- the member was `joined` in the order scope at P.

An entry whose scope declares `sequenced` and whose input is sequenced
but which has no `position` is a mismatch. Without the order scope's
journal, or a read member's journal, the report is `missing-dependency`
for that entry, as for any foreign fact (`packages/replay/README.md`).
The `--git` source of 15.7 reads the order scope from its own ref in the
clone.

What replay does not promise: that a second live run would allocate the
same positions. The positions, like the clock reading and the arrival of
a delivery, are assigned at admission and are inputs to the judgment.
Admission assigns the tag; judging is the function.

### 5.9 Bounds and costs

| Bound | Value | Why |
|---|---|---|
| Members of a group | 32 | One list slot of the order scope; the fan-out bound of a `relate` |
| `reads` per input | 4 | Four fetches before a turn, as `presents` allows four facts |
| Items per read | 64 | The list bound of the contract's revision 19 |
| Pending rows per scope | 1 | One input at a time |
| Allocation requests | One per sequenced input, plus one per retry of the same input | Idempotent |

Costs, to say plainly:

- One extra round trip at admission for every sequenced input, to one
  object. The order scope does nothing but append, so its latency is a
  commit.
- A sequenced input that reads a member waits for that member's earlier
  positions. A member whose object is stopped or busy stalls every input
  that reads it, for at most one input lifetime per pending row. Groups
  should be small and reads should be few.
- The order scope's capacity bounds the group's lifetime count of
  sequenced inputs, under the capacity rules every scope has
  (`docs/scopes.md`, "Validation and bounds").
- A group whose exchanges are strictly sequential pays the round trip for
  nothing. That case is one owner, and one owner stays the first choice.

### 5.10 What this note does not provide

- **Atomic change across members.** A sequenced input reads others and
  changes itself. Reserve-then-apply with holds taken under the shared
  order is the next level and is not designed here.
- **Joining later**, and groups that cross rooms.
- **Platform scopes in a group.** A change lane and the room's
  destination as one group (merge-and-publish in one sequenced act) needs
  a sequenced destination definition. Open point O3.
- **A barrier of any kind.** By design.

## 6. Two small forms

### 6.1 The lag guard

A handler may bound how old a delivery may be when it is applied. The
reactor model's deadline is a consumer-side bound with an alternative
body; dap has producer-side `notAfter` and timed rules, and no consumer
bound.

`EntryPart` (`definition.ts:165-171`) gains `"time"`: the entry's clock
reading. `{ source: "time" }` is then an operand in a handler, as
`{ source: "seq" }` is. `Guard` gains

```ts
| { lag: { seconds: number } }            // handlers only: holds when the commit's clock reading is at most `seconds` after the source entry's time
```

A handler whose delivery is older runs the `unless` branch of its effects
and may refuse with the guard's `reason`. The entry records the reason as
any refusal does, so misses are countable. A delivery that judges `lag`
judges time, and `clock-behind` applies to it (`docs/scopes.md`, "The
clock").

### 6.2 Source order for `tell` handlers

`ReceiveType` gains

```ts
order?: "arrival" | "source";             // default arrival
```

With `source`, the receiver keeps, per source scope and handler, the
highest `(seq, n)` of the delivery it last applied, and answers
`superseded` to a `tell` whose `DeliveryCause` is lower, writing a
`superseded` entry as a `relate` does for an older revision
(`docs/scopes.md`, "Relationship updates"). Newest from each sender wins.
This is not strict first-in-first-out: a gap is not detected, and a later
delivery is applied before an earlier one that is still in flight. The
copy of the last applied pair is the scope's own bookkeeping, derived
from its journal, and a replay recomputes it.

### 6.3 The ordering paragraph

This head adds a paragraph "Order" to the composition section of
`docs/scopes.md`. It states today's behaviour: a delivery takes effect at
the receiver's position; deliveries from different senders have no order;
a `relate` update older than the copy is superseded; every order-sensitive
decision has one owner. It is the first of the analysis's
recommendations, and it is a statement, not a change.

## 7. A worked example: the grow site and its rooms

The grow package has one `site` scope and one `room` scope per grow room
([grow design](2026-10-17-grow-operation-application-design.md), section
6.1). The site holds the rooms and who is present where; each room sends
the site its open-alert count through a handler. Written as connections,
in the package:

| From | To | Form |
|---|---|---|
| `room.alerts` (each room) | `site.alerts` | a `relate` fan-in, one copy per room, `copies` 32 |
| `site.presence` | `room.presence` (each room) | a `relate` fan-out of who is present |

Every site rule the design names is order-insensitive: the overview sums
counts, and routing sends each alert to the holders of the authority it
needs inside its own room. So the grow package needs no group, and the
demo's package declares its scopes at the recorded level. This note
changes nothing in plan 033's G0 to G3.

The two-scope application that M2 asks for ("one owner of a shared
amount", applications note, section 7) is the first witness of the
sequenced level. Its two scopes are one group. The owner's `spend` act is
sequenced; the requester's `ask` handler is sequenced and reads the
owner's balance as of its position with a `count` guard over the owner's
`ledger` items; the owner still decides, and the requester's read is for
a consistent view, not for allocation. The witness shows two things: that
two requesters reading the owner as of positions 5 and 7 see the entries
below those positions and no others, in any arrival order; and that the
reactor model's relay trap (one cause reaching a scope by two paths) ends
the same way on every run of the scenario.

## 8. Changes to existing documents

| Document | Change |
|---|---|
| Archive note, 15.2 | The `archived` level is withdrawn; "The declaration is a requirement; the room gives permission" becomes section 4 of this note. Point 5 of 15.1's decision is amended by Hugh's decision of 18 October 2026 |
| Archive note, 15.5 step 1 | The archiver reads the binding, not the level |
| Archive note, 16.1 | "declares one level: Live, Recorded or Archived" reads "Live, Recorded or Sequenced" |
| Scope contract, D5-5 | Holds for every input but a sequenced one; a sequenced input reads as of its position (5.5). The contract's open points R1-5 and R1-27 gain this as a second answer beside the commitment |
| `docs/scopes.md`, Composition | The paragraph "Order" (this head); the sequenced turn, the `at` read and the order scope when slice S4 lands |
| `docs/roadmap.md`, Durability levels | The three levels of section 3 and the archive as a binding |
| Plan 033, slice 9 | As section 4.5 |
| Applications note, section 4 | The manifest lists groups: name and member definitions, in order; the install creates the order scope first, then the members with their `order` field |

## 9. Slices

Serial for one builder unless said. Nothing here goes ahead of M1, G0 or
M2a in plan 033.

| Slice | What | Needs | Done when | Size |
|---|---|---|---|---|
| S1 | The lag guard (6.1) and source order (6.2): contract, validator, derive, scope, replay, tests | nothing | a handler with `lag` refuses an old delivery with its reason and applies a fresh one; a `source`-ordered handler answers `superseded` to a lower pair in either arrival order; both replay | 1 day |
| S2 | The archive as a binding (section 4): the `archived` literal withdrawn, the directory slot and `bind-archive`, the claim field, the manifest requirement and the install refusal, the archiver's target step | this note approved | a room bound at its claim archives its platform scopes and an installed package's scopes; a room bound later archives them from position 1; a package that requires the archive is refused in an unbound room | 1 to 2 days; before plan 033's slice 9 |
| S3 | The contract of the sequenced level (5.2): the level, the mark, `reads`, the `read` operand, `position`, the `allocation` input, the `order` kind, and the validator | this note approved; M2a's package format, for groups in the manifest | the validator admits a sequenced definition and refuses each misuse named in 5.2 | 1 day |
| S4 | The order scope and the sequenced turn (5.3 to 5.7): `platform:order@1`, allocation, the pending row, the `at` read, the cut, `leave` and `close`; install creates the group | S3 | the two-scope witness of section 7 runs in memory and on native storage, with the arrival-order and relay-trap checks | 3 days |
| S5 | Replay and archive of a group (5.8, 4.2): positional checks, `missing-dependency`, the order scope's ref in a clone | S4, A2 and A3 | the witness's two journals and order scope replay from a clone, and a tampered position is a mismatch | 1 day |
| S6 | Documents (section 8) | S2, S4 | the contract, the guide, the roadmap and the archive note say what the runtime does | with S2 and S4 |

## 10. Decisions

1. The archive is a binding of the room, set at the claim or by
   `bind-archive`, never unset. A package may require it. Hugh, 18
   October 2026.
2. The third level is `sequenced`. It is pinned, like every level. Hugh,
   18 October 2026.
3. No backward compatibility for either change. Rooms created before are
   destroyed or inoperable where the changes reach them. Hugh, 18 October
   2026.
4. The allocation is a platform request that writes an entry in the order
   scope, idempotent per member and input, and the order scope judges
   nothing about the input. Planner.
5. A member's state as of a position is its journal through its last
   entry below that position. Unsequenced entries after it are outside
   the cut. Planner.
6. No barrier. A sequenced input waits only for the members it reads and
   only for their positions below its own. Planner.
7. A refused sequenced input leaves a hole, and holes are ordinary.
   Planner.
8. Deliveries, sends and effects are unchanged. A group orders reads; it
   does not make a transaction. Planner.
9. The name is "sequenced". "Federated" was considered and set aside: in
   the reactor literature a federation is where ordering becomes
   expensive. Planner.

## 11. Open points

| Point | Question | Proposed |
|---|---|---|
| O1 | The `at` read folds a member's items to a cut. Its cost per position, and whether to cache folds per position or to answer only the latest few positions | Measure in S4 with the witness; answer `busy` past a bound; cache the last 8 cuts |
| O2 | Whether an allocation for a delivery should use the `DeliveryCause` digest or the message digest as `input` | The `DeliveryCause` digest: it names the source entry, the ordinal and the message, so a repeat of the same delivery gets the same position |
| O3 | Platform scopes in a group: a sequenced `platform:destination@7` for merge-and-publish, and whether the room's directory creates a room-level order scope at establish | After the two-scope witness; its own note |
| O4 | Whether `reads` may name the scope's own items as of P, so that a sequenced act judges itself on the cut rather than on its head | No: a scope's own head is its own cut, by 5.5 (its last sequenced entry is below P and nothing of its own is pending) |
| O5 | The group's `name` and member names in the manifest, and how `reads.member` resolves when two packages install groups with the same names | Names are scoped to one order scope; `reads.member` resolves through the scope's own `order` reference |
| O6 | Whether a sequenced handler for a `relate` update should allocate before or after the revision check | After: a superseded update takes no position |

## Sources

- Lohstroh, M. *Reactors: A Deterministic Model of Concurrent Computation
  for Reactive Systems.* UC Berkeley EECS-2020-235, December 2020.
  Chapters 2 (the model), 3.8 (semantics), 5 (federated execution).
- Menard, C., Lohstroh, M., and others. *High-Performance Deterministic
  Concurrency using Lingua Franca.* arXiv 2301.02444, 2023. Section 4.3
  (the runtime and the barrier), section 5 (the Savina results).
- Lee, E. A., and others. *Quantifying and Generalizing the CAP Theorem.*
  arXiv 2109.07771. The CAL theorem.
- reactor-model.org/background, read 18 October 2026.
