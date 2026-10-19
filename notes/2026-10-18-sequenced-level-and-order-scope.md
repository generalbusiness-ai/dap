# The sequenced level and the order scope

18 October 2026, draft 2. Design note for review; section 12 lists what
changed after the checker's review of draft 1. It decides two things
about what a scope's definition declares, and designs the runtime for the
second.

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

It also adds source order for `tell` handlers (6.2). The consumer-side
bound on a delivery's age is the `late` form of the application packages
note (`notes/2026-10-18-application-packages-and-builder-room.md`,
section 4.1, request ee200df2). The note commissions nothing by itself;
section 9 names the slices and where they fall in
[plan 033](plans/033-2026-10-18-grow-room-demo.md). Hugh decided on 18
October 2026 that the implementation owes no backward compatibility: a
room created before these changes is destroyed or inoperable where they
would reach it. Source facts cite `path:line` at main `feccbbcfe`.

## 1. Why

Scopes compose by delivery. A send is written with its entry; the
receiver judges the delivery in its own turn, and its own commit gives it
a position. "Delivery is at least once and may be out of order"
(`packages/scope/src/outbox.ts:6`); nothing orders deliveries from
different senders; a `relate` update orders per key by the owner's
revision. The roadmap's rule is that every order-sensitive decision has
one owner. A delivery's cause already carries the source scope, the
source entry's position and hash, and the send's ordinal
(`packages/contract/src/scope.ts:54-59`).

That is the right default, because dap's latencies include people, and
this note keeps it. What dap lacks is a place where a group's order is
held, and a rule that lets an input read other scopes as of a position.
The sequenced level supplies those two things for the scopes that need
them, and only those.

## 2. The principle: what a definition carries, and what a room holds

Three kinds of thing are told apart.

- **A definition carries what changes the judgment of the scope's own
  inputs**: an operand, a guard, a form, a member of an entry, or the
  answer to an act. It is pinned by digest at genesis
  (`docs/scopes.md:265-268`), and a package's semantic id covers it.
- **A package declares host requirements**: what the room it is
  installed into must provide. They are immutable with the package and
  are checked once, by the install act, in the room's platform scopes.
- **A room binding is a mutable value of the room**, set by a room act,
  possibly later, and read by two readers: the install act, which checks
  a package's requirements against it, and platform services such as the
  archiver, which copy bytes. No judgment of an application scope's own
  input reads it.

| Property | Adds a form or changes an answer of the scope | Where it lives |
|---|---|---|
| Live | Yes: no history, the answers `applied` and `reset` (archive note, 16.2) | Definition |
| Recorded | Yes: a history, a receipt | Definition |
| Sequenced | Yes: the position in the entry, the `sequenced` mark, group reads in guards | Definition (this note) |
| Archive | No: the archiver runs after the commit, writes no entry, and "archived through N" is a read (archive note, 15.1 and 15.5) | A binding of the room (section 4); a requirement a package may declare |
| Publication | It is an act with sends to the destination | Definition; the destination's repository is a room property |

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
cannot be a member of a group. One level per scope, as the archive note's
15.2 says; an application that needs a live surface beside a sequenced
record is two scopes.

## 4. The archive as a binding of the room

### 4.1 What changes

The archive note's 15.2 declares the archive as a level and makes the
room's permission a second condition. This note withdraws the level and
keeps the permission, renamed a **binding**, because no judgment of an
application scope's own input reads the level: the writer (15.5) finds
the room's repository after each commit and the verifier (15.7) reads a
clone. What an application needs is the guarantee, which a package
declares as a requirement (4.3). The room-permission half of 15.2 was
never built, and A2 and A3 landed to the fixture-only cutoff with
archived-level admission out of scope (decision `89376d74`), so the
change costs the one `"archived"` literal in the contract and the replay
package's reading of it.

### 4.2 The binding

The directory's `repository` item (`packages/platform/src/directory.ts:165-179`)
gains one value slot, set by the claim through a field `archive` that the
directory's `establish` copies, or later by one admin act:

```
archive: { fixed: false, required: false, of: { type: "enum", of: ["journal"] } }

bind-archive: { step: "transition", on: "repository", grant: "directory.archive",
                fields: { archive: { type: "enum", of: ["journal"], required: true } },
                guards: [{ state: ["established"] }],
                effects: [{ value: { slot: "archive", from: { field: "archive" } } }] }
```

There is no unbinding act. An operator who wants archiving to stop
removes the destination's credential, and the archiver reports
`unavailable` as 15.5 has it.

**Who archives.** Every recorded and sequenced scope of the room,
platform and application alike, once the binding is set; inboxes and the
register stay out (15.1). The order scope of section 5 is in, because a
member's replay reads it.

**When.** The archiver's step 1 ("Target", 15.5) reads the binding where
it reads the repository today. A scope created before the binding is set
archives its whole prefix from position 0, its genesis
(`packages/contract/src/entry.ts:17`), with the definition closure 15.3
names, so that a clone verifies the scope's identity (15.8) and replays;
a scope whose only entry is its genesis is archived too. No entry records
the moment the binding reached a scope; `head.json` and `archivedThrough`
say what is archived.

### 4.3 The requirement

A package manifest (applications note, section 4, "the host contract it
needs") may list `archive` among what it needs: a host requirement in
the sense of section 2, checked once by the install act, which reads the
room's binding as it reads the room's trusted-package list. Install
refuses `archive-unavailable` when the directory has no binding; the
admin sets the binding and tries again. A package that does not require
it installs in any room, and its scopes archive when and if the room
binds. The directory gains a slot and an act for a mutable room value;
that is what a binding is.

### 4.4 What does not change

The layout (15.4), the writer's five steps and credential (15.5), the
receipt check of 15.6, the verifier (15.7), the limits of a clone (15.8)
and slices A4 and A5 keep their text. 15.3's opening sentence and 15.6's
two statements about the level change as section 8 lists. "Archived
through N" keeps its meaning.

### 4.5 Plan 033, slice 9

The demo-room archive slice reads: the demo room's directory holds the
binding, set at its claim; the reviewed archive policy and configuration
for the hosting deployment; a real destination and token; A3's archiver
wired for that room; the disclosure on the `/grow/` page. The grow
package does not require the archive, so the slice can set the binding on
a running demo room.

## 5. The sequenced level

### 5.1 In one paragraph

A group is a set of sequenced scopes and one **order scope**. The order
scope's journal is the group's order: each of its allocation entries
gives one position to one member for one input. A member asks for a
position before it judges a sequenced input, reads the other members as
of that position, judges, has the order scope record the resolution, and
commits an entry that names the position. Nothing waits for the whole
group: a member waits only for another member's earlier positions, and
only when it reads that member. Deliveries between members, and to and
from the rest of the room, stay as they are.

### 5.2 The declaration

**The level.** `level: { name: "sequenced", version: 1 }`.

**The group reference.** The `create` send that makes a sequenced scope
carries a field `order` of type `{ type: "scope", kind: "order" }`; the
genesis records it, incarnation included; the scope reads it from its
own genesis for life. A `create` of a sequenced definition with no
`order` field is refused `order-unavailable`. Whether the order scope
lists the scope as a member is settled by the enrolment of 5.3; a
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

A timed rule is never sequenced; a genesis is never sequenced.

**The group operand.** A guard, an effect or a send of a sequenced act or
handler may use `{ read: string; part?: Part }`, the list a `reads` entry
bound as of its cut, as the `list` of `each`, `has`, `count`, `distinct`
and `sameSet`, and as an `element` source inside them. A read is a list
of records: for each item the range covers in the member as of the cut,
its ID, state, revision and value slots, in the member's own types. The
validator refuses `read` anywhere but a sequenced act or handler, and
`reads` on an input without `sequenced`.

**In the entry.** `Entry` (`packages/contract/src/entry.ts:14-27`) gains:

```ts
position?: { at: FactRef };               // the order scope's entry that allocated this input's position
reads?: readonly GroupReadUse[];          // one per `reads` entry; 5.5
```

`uses` keeps its one domain, the canonical bytes of a foreign entry
(`entry.ts:106`): it cites the order scope's head entry the input read,
each cut entry, and each `leave` entry a read rests on. The page a read
saw is a second domain, `page`, cited from `reads` (5.5).

### 5.3 The order scope

A platform definition, `platform:order@1`, of a new scope kind `order`
(`ScopeKind`, `packages/contract/src/scope.ts:19`; `PlatformDefinition`,
`scope.ts:41`).

| Item | Slots | States |
|---|---|---|
| `group` (one) | `name`: text; `size`: int, 1 to 32, fixed; `lifetime`: int seconds, fixed; `creator`: scope, fixed | `forming` (initial), `open`, `closed` (final) |
| `member` (many, max 32) | `name`: text, fixed; `scope`: scope reference with incarnation, fixed; `since`: int, fixed; `until`: int | `joined`, `left` (final) |
| `allocation` (many) | `member`: member, fixed; `input`: digest, fixed; `opened`: time, fixed; `reason`: text | `open` (initial), `resolved` (final), `holed` (final), `expired` (final) |

| Act | Who | What it does |
|---|---|---|
| `establish` (genesis) | the creating scope's `create` send; fields `name`, `size`, `lifetime` | Opens the `group` as `forming` and records the creator from the genesis's source entry. No member is named: none exists yet |
| `enroll` | a `tell` handler whose guard requires the sender to be the recorded creator; fields `member` (a scope reference with incarnation) and `name` | Opens one `member` row, `joined`, `since` this entry's position. When the joined count reaches `size`, the same entry transitions the group to `open` |
| `leave` | an admin, grant `order.leave`; field `member` | Transitions the member to `left`, `until` this entry's position (5.7) |
| `close` | an admin, grant `order.close` | Transitions the group to `closed` when it is `forming`, or when every member is `left`. The scope is then terminal |

**Bootstrap.** The package root creates the order scope first and, on
its `applied` result, creates each member with the order scope's
reference as the member's `order` field; on each member's `applied`
result it sends `enroll` with the reference the result carries, as the
grow site stores a room's reference from its creation result
(`examples/grow/site.ts:24-25`). Both ends consent: the member's genesis
names the order scope and the order scope's row names the member,
incarnation included. A member whose genesis names X but is enrolled in
Y asks X and is refused `not-a-member`; a scope enrolled in Y whose
genesis names no order scope never asks. Only the creator may enroll, so
every member of a group was created by one scope in one room; membership
across rooms and joining later are not provided (5.10). A member creation
that fails leaves the group `forming`, where allocation is refused
`order-forming`; an admin's `close` ends a group that never formed.

**Three platform requests.** Each is a platform request, as the
authority read is: a member's object asks the order scope's object
through the namespace with its own authorization and the deployment's
fetch time limit, and is answered with the fact of one entry, or
`refused` with a reason, or nothing within the limit. Each writes one
entry in the order scope's own turn, with a new input kind:

```ts
| { type: "allocation"; member: ScopeRef; input: Digest }                              // opens an `allocation`; its seq is the position
| { type: "resolution"; member: ScopeRef; position: number; input: Digest }            // `open` to `resolved`
| { type: "hole"; member: ScopeRef; position: number; input: Digest; reason: string }  // `open` to `holed`
```

- **Allocate.** `input` is the digest the scope contract gives the input
  (an intent's digest; a delivery's `DeliveryCause` digest). Idempotent
  per `(member, input)` while that allocation is `open`; once it is
  `holed` or `expired`, a repeat opens a new allocation at a new
  position. Refused `not-a-member`, `order-forming`, `order-left`,
  `order-closed` or `scope-full`.
- **Resolve.** `open` to `resolved`. Refused `expired` or `holed` when
  already final in that state, `not-open` when it names another member's
  or input's allocation. Idempotent on a `resolved` allocation.
- **Hole.** `open` to `holed`, with the reason the member's judgment
  gave. Idempotent the same way.

The order scope judges nothing else about the input: it does not read
the member, does not fetch, and holds no bytes but the digest.

**Expiry.** A timed rule of the order scope transitions an `allocation`
from `open` to `expired` when `opened` plus the group's `lifetime` has
passed, with attention. The lifetime is set at genesis from the package's
`groups` declaration. A later `resolve` for that position is refused
`expired`, so a hole never gains a commit. Expiry, resolution and holes
are entries of one journal, so which came first is decided where the
position was allocated, and no clock bound between members is assumed.

### 5.4 The turn of a sequenced input

The turn (`docs/scopes.md:207-228`) gains three steps for an input whose
act or handler is `sequenced`, and one after the commit:

1. Before the turn, each foreign entry the input names is fetched and
   checked, as today.
2. The drain, as today.
3. **Allocate.** The scope asks its order scope for a position P. No
   answer within the limit: the turn ends `unavailable` with the reason
   `order-unavailable`, nothing is written, and the sender keeps the
   duty. A refusal: the input is refused with the order scope's reason.
   On an answer, the scope writes one bookkeeping row, **pending**, in
   the same storage as its journal: the input as received (the signed
   intent, or the delivery's envelope with its retained source entry),
   its digest, P and the allocation's fact. At most one pending row
   exists; a second sequenced input while one is pending is answered
   `busy`. Unsequenced inputs are not held by the row.
4. **Read.** The scope reads the order scope's journal through its head
   and, for each `reads` entry, computes the cut position and the
   member's finality at or below it (5.5). An allocation to the member at
   or below the cut that is still `open` ends the turn `unavailable` with
   the reason `member-pending`; the pending row stays, and the next
   attempt gets the same P by idempotency. Otherwise the scope reads the
   page from the member as of the cut.
5. The head is noted; the rule expressions are evaluated.
6. **Resolve or hole.** When the judgment is `applied`, the scope asks
   the order scope to resolve P before it writes anything. `expired`:
   the pending row is cleared and the input is judged again from step 3
   with a new allocation; an intent past its `notAfter` is refused as
   any act is. No answer: `unavailable`, `order-unavailable`, and the row
   stays. When the judgment is a refusal, the scope asks the order scope
   to record a hole at P with the reason, then answers the refusal and
   writes nothing, as any refusal writes nothing
   (`docs/manual/ten-terms.md`, "takes effect").
7. **The commit**, as today; the entry carries `position: { at }`, the
   reads in `reads`, and in `uses` the order head and the cut entries.
   The pending row is cleared in the same transaction.

Nothing is written in the member's journal before the order scope has
recorded the resolution, so the member's state never holds the effects
of an input the group counts as a hole, and the fold stays a function of
the member's own journal.

**Restart and resume.** An object that restarts with a pending row
resumes it from step 4 without waiting for the sender; the row holds the
input. If its journal already has an entry naming the pending position,
the row is stale and is cleared. If the order scope answers `expired` at
step 6, the input is judged again from step 3. The object's own alarm
resumes a pending row as it runs timed rules, so a stopped member that
returns completes its input, and a member that never returns blocks a
reader for at most the group's lifetime, after which the order scope's
expiry makes the position a hole. An admitted delivery is never
abandoned: the sender's dispatcher retries it, and the retry is judged
at a new position.

**Unsequenced inputs** of a sequenced scope take no position and change
nothing above. They are judged under the rules of a recorded scope, and
D5-5 holds for them.

### 5.5 Reading a member as of a position

**The cut position.** A read by an input at position P of member N with
no `staleness` has the cut position X = P − 1. With `staleness` of s
seconds, X is the greatest position whose allocation entry's time is at
least s before the time of P's allocation entry, or 0 when there is none.
Both are read from the order scope's journal, whose one clock dates
every position.

**Finality.** N is final at X when every allocation to N at a position
at or below X is `resolved`, `holed` or `expired` in the order journal as
of the head the reader read. An `open` allocation at or below X is
`member-pending` (5.4, step 4). A reader learns what is unfinished from
the order journal, never from the member's live bookkeeping; the
allocation is in the order journal before its reply is sent, and stays
`open` until its outcome is recorded there, so a lost reply cannot make a
cut change.

**The cut.** Once N is final at X, N's state as of X is N's journal
through its last entry whose `position` is at or below X, or its genesis
if it has none. Unsequenced entries of N before that entry are in the
cut; those after it are not. The cut is a function of N's journal, the
order journal and X alone, and finality is permanent, so it never
changes. Two consequences: what the group reads of a member, the member
must have written in a sequenced entry or in an entry before one, so
sequence what the group reads or decides and nothing else; and a scope's
own guards read its own live head, every entry included, as every act
does; the cut is what other members see of it.

**The read.** A new read of the scope API, `at(X, range)`, answers the
items the range covers as of X, in one page bounded as `items` is; or
`busy` under the limits the member has for any reader; or `behind` while
the member is between step 6 and step 7 of its turn for an entry the
order journal already shows resolved. The read is served from the
member's journal: the member folds its items to the cut, which it may
cache per position. Who may read: a member of the same group, for a
sequenced input, with the member's own authorization, as the authority
read is made; no session is checked; a reader that is not a `joined`
member of the same order scope is refused.

**Staleness.** A reader with no staleness waits for every allocation
below P to be final. A reader with staleness s waits only for
allocations older than s; with s at or above the group's lifetime it
never waits. The author chooses per read, in the definition.

**The witness.** For each read the entry's `reads` holds:

```ts
export interface GroupReadUse {
  name: string;                           // the `reads` key
  member: ScopeRef;                       // incarnation included
  cut: number;                            // X
  entry: FactRef | null;                  // the cut entry of the member, or null for an absence
  absent?: "genesis" | "left";            // no positioned entry at or below X; or the member left at or below X
  page: Digest;                           // the canonical page bytes, retained under the kind `page`
}
```

`uses` cites, in the entry domain, the order scope's head entry the
reader read, the cut entry, and for `left` the `leave` entry. The page is
written to the reader's retained inputs under a new kind `page`, keyed by
its digest, when the entry is committed; it is bounded by the page bound
(64 items, each bounded by the member's slot types) and archived with the
entry (section 8). The two byte domains are never mixed.

**Absence.** A read of a member with no positioned entry at or below X,
once final, answers an empty page with `absent: "genesis"`. A read of a
member that left at or below X answers an empty page with `absent:
"left"` and cites the `leave` entry (5.7). Both are verified absence:
replay rebuilds each from the order journal. An unresolved allocation is
never written; it is the live answer `member-pending`.

**No barrier.** No step waits for the whole group. A sequenced input
waits only for the members it reads, and only for those members'
positions at or below its cut. Two members that do not read each other
never wait on each other.

### 5.6 What a sequenced input may do

Everything its act or handler may do today, plus `reads`. Sends stay
unordered deliveries; a `tell` to another member is judged in the
member's own turn with its own position if its handler is sequenced.
Effects change this scope's items only. Atomic change across members is
not in this note (5.10).

### 5.7 Leaving, and the fence

A member leaves by an admin's `leave` act on the order scope. The act's
own position L is the fence:

- The order scope refuses every allocation to that member after L with
  `order-left`. Allocations to it at or below L that are still `open`
  resolve, hole or expire as any allocation does.
- A reader whose cut position X is at or below L reads the member's cut
  as before. A reader whose X is above L treats the member as absent: an
  empty page with `absent: "left"`, citing the `leave` entry, and a
  `count` over it is zero.
- The member keeps its journal and its unsequenced inputs. Its sequenced
  acts and handlers are refused `order-left` from the moment it observes
  the `leave` entry, which it reads before each sequenced turn.
- A member's pending requests to others settle as they would for any
  scope; nothing is undone.

A scope never joins a group after its genesis, because the level and the
reference are pinned; an application that wants a scope in a group makes
a new scope and carries forward under gap 10 of the applications note.
`close` ends the order scope after every member has left, or while the
group is still `forming`.

### 5.8 Replay

The verifier (`packages/replay`) checks, for each entry with `position`:

- the order scope has an allocation entry at that position naming this
  scope, incarnation included, and this input's digest, and a resolution
  entry for that position naming the same input; a `holed` or `expired`
  allocation with a member entry at that position is a mismatch;
- for each `reads` witness: X is the cut position 5.5 computes from P,
  the read's `staleness` and the order journal; every allocation to the
  member at or below X is final in the order journal at the head entry
  cited in `uses`; `entry` is the member's last entry with a position at
  or below X, or `absent` holds by the order journal (`genesis`: no
  allocation to the member at or below X; `left`: the cited `leave`
  entry's position is at or below X); and the retained page is byte for
  byte what folding the member's journal through the cut entry gives for
  the declared range;
- the member was `joined` in the order scope at P.

The report distinguishes **verified**; **mismatch**, when a journal or a
retained page contradicts the entry, including an `open` allocation at
or below a cited cut, which a committed reader can never have seen; and
**missing-dependency**, when the order scope's journal, a read member's
journal through its cut, or a retained page is not available, reported
for that entry as for any foreign fact (`packages/replay/README.md`). An
entry whose scope declares `sequenced` and whose input is sequenced but
which has no `position` is a mismatch. The `--git` source of 15.7 reads
the order scope from its own ref in the clone, and the pages from the
reader's archived inputs.

Replay does not promise that a second live run would allocate the same
positions. Positions, like the clock reading and the arrival of a
delivery, are assigned at admission and are inputs to the judgment.

### 5.9 Bounds and costs

| Bound | Value | Why |
|---|---|---|
| Members of a group | 32 | One list slot of the order scope; the fan-out bound of a `relate` |
| `reads` per input | 4 | Four fetches before a turn, as `presents` allows four facts |
| Items per read | 64 | The list bound of the contract's revision 19 |
| Pending rows per scope | 1 | One sequenced input at a time |
| Group lifetime | 1 minute to 30 days, required | The bound on an unresolved position; the package declares it |
| Entries per sequenced input | 2 in the order scope (allocation; resolution or hole), 1 in the member; an expiry adds 1 | 5.3 and 5.4 |
| Order scope capacity | As any scope's | Bounds the group's lifetime count of sequenced inputs; `scope-full` refuses an allocation |

Costs: two round trips at admission for every applied sequenced input,
to one object that only appends; a reader with no staleness stalls on a
stopped member for at most the group's lifetime; a group whose exchanges
are strictly sequential pays for nothing, and that case is one owner,
which stays the first choice.

### 5.10 What this note does not provide

Atomic change across members (reserve-then-apply under the shared order
is the next level); joining later, and groups that cross rooms; platform
scopes in a group (open point O3); a barrier of any kind, by design.

## 6. Source order, and the ordering paragraph

### 6.1 The consumer-side bound

Draft 1 gave handlers a `lag` guard. The review found that it conflated a
guard refusal, which writes no entry and runs no effect, with
conditional effects, which belong to an applied entry. The bound is now
the `late` form of the application packages note, section 4.1: either
`"refuse"`, a guard refusal with a reason and nothing written, or a
branch that applies instead of the handler when the source entry's time
plus `within` is before the commit's clock reading, with the entry
applied and marked `late`. Never both for one delivery. The `EntryPart`
`"time"` and the operand `{ source: "time" }` stay, since the form reads
them. Slice S1 builds the form from that section.

### 6.2 Source order for `tell` handlers

`ReceiveType` gains

```ts
order?: "arrival" | "source";             // default arrival
```

With `source`, the receiver keeps, per source scope and handler, the
highest `(seq, n)` of the delivery it last applied, and answers
`superseded` to a `tell` whose `DeliveryCause` is lower, writing a
`superseded` entry as a `relate` does for an older revision
(`docs/scopes.md`, "Relationship updates"). Newest from each sender wins;
a gap is not detected. The copy of the last applied pair is bookkeeping
derived from the journal, and a replay recomputes it.

### 6.3 The ordering paragraph

This head adds a paragraph "Order" to the composition section of
`docs/scopes.md`, stating today's behaviour: a delivery takes effect at
the receiver's position; deliveries from different senders have no
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

Every site rule the design names is order-insensitive: the overview sums
counts, and routing sends each alert to the holders of the authority it
needs inside its own room. So the grow package needs no group, and the
demo's package declares its scopes at the recorded level. This note
changes nothing in plan 033's G0 to G3.

The two-scope application that M2 asks for ("one owner of a shared
amount", applications note, section 7) is the first witness of the
sequenced level. Its two scopes are one group. The owner's `spend` act is
sequenced; the requester's `ask` handler is sequenced and reads the
owner's balance as of its cut with a `count` guard over the owner's
`ledger` items; the owner still decides, and the requester's read is for
a consistent view, not for allocation. The witness shows five things:

- two requesters reading the owner as of positions 5 and 7 see the
  owner's entries at or below their cuts and no others, in any arrival
  order;
- the reactor model's relay trap (one cause reaching a scope by two
  paths) ends the same way on every run;
- an allocation whose reply is lost leaves the reader `member-pending`
  until the owner resumes and resolves it, and the reader's cut then
  includes the owner's entry;
- an owner stopped past the group's lifetime leaves a hole the reader
  passes over, and the owner's later resolve is refused `expired`;
- a requester with a `staleness` of one hour proceeds while the owner's
  newest position is still open.

## 8. Changes to existing documents

| Document | Change |
|---|---|
| Archive note, 15.2 | The `archived` level is withdrawn; "The declaration is a requirement; the room gives permission" becomes section 4 of this note. Point 5 of 15.1's decision is amended by Hugh's decision of 18 October 2026 |
| Archive note, 15.3 | "A scope is archived when its definition declares it and its room permits it" reads "when its room is bound (section 4) and its level is recorded or sequenced"; the prefix begins at position 0; the retained-input table gains "any that records `reads`: the retained page each read cites, by its digest, kind `page`" |
| Archive note, 15.5 step 1 | The archiver reads the binding, not the level |
| Archive note, 15.6 | "A scope whose level is Recorded or Live has no `archive` member" reads "A live scope, or a scope of a room with no archive binding, has no `archive` member"; the row `not-archived` reads "The room has no archive binding, or the scope is live" |
| Archive note, 16.1 | "declares one level: Live, Recorded or Archived" reads "Live, Recorded or Sequenced" |
| Scope contract, D5-5 | Holds for every input but a sequenced one; a sequenced input reads as of its cut (5.5). Open points R1-5 and R1-27 gain this as a second answer beside the commitment |
| Scope contract, entries and retained inputs | `Entry.position` and `Entry.reads` (5.2); the retained kind `page` (5.5); the three order inputs (5.3) |
| `docs/scopes.md`, Composition | The paragraph "Order" (this head); the sequenced turn, the `at` read and the order scope when S4 lands |
| `docs/roadmap.md`, Durability levels | The three levels of section 3 and the archive as a binding |
| Plan 033, slice 9 | As 4.5 |
| Applications note, section 4 | The manifest lists groups: name, member definitions in order, lifetime; the install creates the order scope first, then the members with their `order` field, then enrolls each (5.3) |

## 9. Slices

Serial for one builder unless said. Nothing here goes ahead of M1, G0 or
M2a in plan 033.

| Slice | What | Needs | Done when | Size |
|---|---|---|---|---|
| S1 | The `late` form (packages note 4.1, per 6.1) and source order (6.2): contract, validator, derive, scope, replay, tests | nothing | a handler with `late.within` applies the branch to an old delivery and the handler to a fresh one, the entry marked; `late: "refuse"` refuses with the reason; a `source`-ordered handler answers `superseded` to a lower pair in either arrival order; all replay | 1 day |
| S2 | The archive as a binding (section 4): the `archived` literal withdrawn, the directory slot and `bind-archive`, the claim field, the manifest requirement and the install refusal, the archiver's target step | this note approved | a room bound at its claim archives its platform scopes and an installed package's scopes; a room bound later archives them from position 0; a package that requires the archive is refused in an unbound room | 1 to 2 days; before plan 033's slice 9 |
| S3 | The contract of the sequenced level (5.2): the level, the mark, `reads` with `staleness`, the `read` operand, `position` and `reads` in the entry, the three order inputs, the retained kind `page`, the `order` kind, and the validator | this note approved; M2a's package format, for groups in the manifest | the validator admits a sequenced definition and refuses each misuse named in 5.2 | 1 day |
| S4 | The order scope and the sequenced turn (5.3 to 5.7): `platform:order@1` with its items, acts, three requests and expiry; bootstrap by enrolment; the pending row and resume; the cut, finality and the `at` read; `leave` and `close` | S3 | the two-scope witness of section 7 runs in memory and on native storage with its five checks | 4 days |
| S5 | Replay and archive of a group (5.8, 4.2): the three answers, the page witness, the order scope's ref in a clone | S4, A2 and A3 | the witness's journals and order scope replay from a clone; a tampered position, a page that differs, and an `open` allocation below a cited cut are each a mismatch; a missing order journal is `missing-dependency` | 1 day |
| S6 | Documents (section 8) | S2, S4 | the contract, the guide, the roadmap and the archive note say what the runtime does | with S2 and S4 |

## 10. Decisions

1. The archive is a binding of the room, set at the claim or by
   `bind-archive`, never unset. A package may declare it as a
   requirement, which the install act checks. Hugh, 18 October 2026.
2. The third level is `sequenced`. It is pinned, like every level. Hugh,
   18 October 2026.
3. No backward compatibility for either change. Hugh, 18 October 2026.
4. Allocation, resolution and holes are platform requests that each
   write one entry in the order scope; allocation is idempotent per
   member and input while open; the order scope judges nothing about the
   input. Planner.
5. A member's state as of a cut position is its journal through its last
   entry at or below it, and a reader takes that cut only when every
   allocation to the member at or below it is final in the order
   journal. Planner, draft 2.
6. No barrier. A sequenced input waits only for the members it reads and
   only for their positions at or below its cut. Planner.
7. A refused sequenced input is a hole recorded in the order scope; an
   unresolved position expires into a hole after the group's lifetime by
   the order scope's own timed rule; a hole never gains a commit.
   Planner, draft 2.
8. Deliveries, sends and effects are unchanged. A group orders reads; it
   does not make a transaction. Planner.
9. The name is "sequenced". Planner.
10. A member writes nothing in its journal for a sequenced input until
    the order scope has recorded the resolution. Planner, draft 2.
11. A group is formed by enrolment from its creator after the members
    exist, incarnation included; no member identity is claimed before
    its genesis. Planner, draft 2.
12. A read's witness is typed: the cut entry in the entry domain, the
    page in its own domain, absence by the order journal. Planner, draft
    2.
13. `staleness` on a read is the author's declared tolerance for age,
    measured on the order scope's one clock. Planner, draft 2.
14. The lag guard is withdrawn; the `late` form of the packages note is
    the consumer-side bound. Planner, draft 2.

## 11. Open points

| Point | Question | Proposed |
|---|---|---|
| O1 | The cost of folding a member's items to a cut per position, and whether to cache folds | Measure in S4; answer `busy` past a bound; cache the last 8 cuts |
| O2 | Whether an allocation for a delivery uses the `DeliveryCause` digest or the message digest as `input` | The `DeliveryCause` digest: a repeat of the same delivery gets the same position while it is open |
| O3 | Platform scopes in a group: a sequenced `platform:destination@7` for merge-and-publish; a room-level order scope at establish | After the two-scope witness; its own note |
| O4 | Which state a sequenced act's own guards read | Its own live head, as any act; the cut is for other members (5.5). Answered in draft 2 |
| O5 | How `reads.member` resolves when two packages install groups with the same names | Names are scoped to one order scope; `reads.member` resolves through the scope's own `order` reference |
| O6 | Whether a sequenced handler for a `relate` update allocates before or after the revision check | After: a superseded update takes no position |
| O7 | Whether the order scope should tell a member that its position expired | Attention only in the first version; a `tell` once timed rules may send (packages note, 4.3) |
| O8 | The `page` kind's byte bound, and whether a page is shared across readers of one cut | 64 items by the member's slot types; one retained copy per reader's scope |

## 12. Changes in draft 2

| Finding of review 2ff202f0 (head 365f56a5) | Where answered |
|---|---|
| F1, P1: a returned cut could change after a lost allocation reply; a cleared refusal could be retried at its old position | 5.5 finality from the order journal; 5.3 holes and expiry as entries of the order scope; 5.4 step 6; decision 7; the lost-reply and expiry checks in section 7 |
| F2, P1: the restart rule gave no finite progress | 5.4 the pending row holds the input itself and is resumed by the object; 5.3 expiry after the group's lifetime; the delivery duty continues at a new position |
| F3, P1: the read witness mixed two byte domains and had no replayable absence | 5.2 and 5.5 `GroupReadUse`, the page in its own retained kind, `uses` in the entry domain only; absence as `genesis` or `left`; 5.8 the three answers |
| F4, P2: group creation did not bind the promised identities | 5.3 bootstrap by enrolment after the members exist, incarnation included; `forming` and `open`; decision 11 |
| F5, P2: section 2 said no judge reads a binding while install read it | Section 2 rewritten with three kinds; 4.1 and 4.3 reworded |
| F6, P2: late binding must include the genesis and change 15.6 | 4.2 archives from position 0 with the definition closure; section 8 lists the 15.3 and 15.6 changes |
| F7, P2: the lag paragraph conflated guard refusal with conditional effects | 6.1 withdrawn in favour of the `late` form; S1 amended by assert f92b3f2a |

The shape of F1 to F3 follows Spanner's safe time (a replica serves no
read above a prepared-but-unresolved transaction until its outcome is
logged), read against dap's assumption of no clock bound: finality comes
from the one journal that serializes allocation.

## Sources

- Lohstroh, M. *Reactors: A Deterministic Model of Concurrent Computation
  for Reactive Systems.* UC Berkeley EECS-2020-235, 2020. Chapters 2, 3.8
  and 5.
- Menard, C., Lohstroh, M., and others. *High-Performance Deterministic
  Concurrency using Lingua Franca.* arXiv 2301.02444, 2023. Section 4.3.
- Lee, E. A., and others. *Consistency vs. Availability in Distributed
  Cyber-Physical Systems.* ACM TECS, 2023, doi 10.1145/3609119. The CAL
  theorem.
- Corbett, J. C., and others. *Spanner: Google's Globally-Distributed
  Database.* OSDI 2012. Section 4.1.3, safe time.
