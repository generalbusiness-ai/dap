# A replica holds what the scope holds: the state seed

Status: current. Draft 2, for request `4893fbfa`. Nothing here is built.

A room has run for a year. Its repository scope has sealed 60,000
entries. The archive holds the first 50,000, and the scope raised its
floor to position 50,000. Ana opens the room's page on a new laptop. The
page asks for the journal from position 0, and the scope answers
`archived`. The client stops, and the page falls back to plain reads.
The room's own remedy for a full journal has taken the replica away.

With this note the scope keeps one copy of its state, made when it
raised the floor. The page reads that copy and the 10,000 entries that
the scope still holds. It then follows the journal as every replica
does. Ana sees the room, and each prediction that her page makes equals
the scope's judgment.

This note answers request `4893fbfa`: a read that serves a scope's state
at a head, and a way to load that state into `MemoryState`. Every fact
below is read at main `57e893c0`. The research brief with each line
reference is
`~/play/artroom-evidence/2026-11-13-planner-briefs/state-seed-brief.md`.

## 1. What asks for the change

A browser replica folds the scope's journal from the genesis entry with
`applyEntry`. The client design
([one client for a declared scope](2026-11-13-scope-client.md), section
9) keeps that rule and leaves two cases to this note.

- **A floor.** Below a floor, `log` answers `archived`
  (`packages/scope/src/reads.ts`). A browser holds no clone of the
  archive. So a replica cannot start in a room that has a floor, and
  the client stops with the cause `archived`.
- **A long journal.** A journal holds up to 100,000 entries
  (`scopeEntries`, `packages/contract/src/bounds.ts`). The dap-foldkit
  probe measured 264 ms in Node and 289 ms in Chrome for 5,000 entries.
  At that rate 100,000 entries take about 5.5 s. The probe measured no
  memory and no download.

The request also asks for a copy of a `MemoryState`, so that a client
can judge a second act over the predicted state of a first act.

## 2. Terms

- A scope **holds** an entry when its store can read the entry. A scope
  holds each entry at or above its floor. It also holds up to 4,096
  **kept** positions below the floor (`FLOOR_KEPT`,
  `packages/derive/src/floor.ts`).
- A **seed** is a copy of a scope's state at one head, which the scope
  makes and serves.
- A **replica** is a `MemoryState` in a client, with the entries that
  the client holds.
- A replica **mirrors** the scope at a head when it holds the state at
  that head and each entry that the scope holds.

## 3. The rule: a replica mirrors the scope

The fold and the judges read three things: the state, the definition,
and what the scope holds beside the state. They read the third through
`Own` (`packages/derive/src/fields.ts`). `Own` answers an earlier entry
of the scope's own journal. It also carries the sequence, the retained
copies of entries of other scopes, the held positions, the size proofs
and the archived positions.

About twenty readers of `Own` exist in `packages/derive/src`. A reader
that gets no entry does one of four things. The list is partial, and
section 9 makes the builder's list the authority.

| What the reader does | Readers, in part |
|---|---|
| It takes the entry as absent and reports no fault | `equal` (`operand.ts`), `program/guard-value.ts`, `entryOf` (`operand.ts`), the opener in `outcomes.ts` |
| It refuses, or it answers `unavailable` | The local fact field (`operand.ts`), the `fact` guard, `send-value.ts`, `prepare.ts`, `capability/hold.ts`, `capability/device-command.ts`, `judgeFloor` |
| It throws | `settle.ts` (`RuleFault`), `nextFloorState` through `stateKept`, the fold of a `floor` entry with no `Own` |
| It skips its work and leaves no trace | `priorDetachedBounds` (`handlers.ts`) loses the size bound of a text, `capability/gitread.ts` drops its check, the size-proof pass of `nextFloorState` |

The set of readers is open, because platform rules receive `Own`
(`marks.ts`). The fixed index is a second place: `fixedRowsOf` reads
the hash of a held position from the state (`fixedHash`,
`packages/derive/src/state.ts`), and a state with no hash writes
another row.

So a replica that lacks an entry can refuse where the scope admits. It
can admit where the scope refuses, when a text loses its size bound. It
can throw. In the first and second cases nothing shows the difference.

The scope has the same gap below its own floor, and its answers there
are part of the record. `fixedHash` answers null for an archived
position, and replay applies each floor as the scope does.

The rule has two parts.

1. A replica that mirrors the scope computes what the scope computes.
   It needs no list of the definitions that are safe.
2. A replica never answers "nothing" for a thing that the scope holds
   and the replica lacks. Its `Own` throws the fault `Unheld` for that
   entry or copy. The readers of the table then cannot take it as
   absent, refuse on it or skip it.

The client catches `Unheld`. A prediction that meets it reads
`not-judged`. A fold that meets it stops the replica. The replica keeps
one `Own` object for its life, because the judges compare `Own` by
identity (`operand.ts`).

The rule decides the rest of this note. It also binds build step C2 of
the client design today, with no seed. Section 9 states what C2 owes.

## 4. Loading

### 4.1 The function

```ts
loadState(rows: Iterable<SeedRow>, definition: ValidDefinition,
  held: Iterable<Sealed>): MemoryState
```

`loadState` lives in `@generalbusiness/dap-client/scope`, the entry that
build step C2 adds. It adds nothing to `packages/derive`.

1. It gives each row to the `put` method of its member. The `put`
   methods rebuild the type index, the pending requests, the relation
   counts, the observed geneses and the duties of each item.
   `SqliteStore.all` makes the same calls to build a snapshot
   (`packages/scope/src/sqlite.ts`). Nothing folds over its result, so
   it is a precedent for the calls and not for the load.
2. It calls `indexItems` with the definition
   (`packages/derive/src/binding.ts`). The declared indexes are not in
   a snapshot. A fold under a binding mark throws `RuleFault` without
   them.
3. It calls `putFixedHash` for each held entry. When the definition
   declares a fixed slot, it calls `fixedRowsOf` for each item and gives
   each result to `putFixed`, as `SqliteStore.ensureFixed` does. The
   fixed hashes, rows, counts and dependencies are outside a snapshot.

Two more things are outside a snapshot: the retained copies of entries
of other scopes, and the bytes of detached texts. The loader loads
neither. Before the client folds an entry, it reads each copy that the
entry's `uses` name. A copy that it cannot read stays unheld, and the
rule of section 3 applies: `Own` throws `Unheld`.

A row is one element of one member of `StateSnapshot`
(`packages/derive/src/state.ts`). The loader names each member of
`StateSnapshot` in one typed table. A member that a later version adds
fails the compile of the loader until the table names it.

### 4.2 The proof

The claim: for a seed at head T with the held entries, the fold of the
entries after T gives the state that the fold from the genesis entry
gives.

The proof is a test over generated journals, for each definition of the
definition corpus and each example package.

1. Fold a journal of n entries from the genesis entry. Take the state
   rows and the held entries at each of several heads T.
2. Load each and fold the entries after T.
3. `stateDigest` of the result equals `stateDigest` of the full fold.
4. For generated acts, `judgeAct` gives the same result on both
   states. Step 4 catches a part that the digest does not cover, such
   as a fixed row.

The journals include a `floor` entry before T. A `floor` entry after T
restarts the replica (section 7), and the witness of SS2 covers it.

### 4.3 The copy

A copy is `loadState` over the rows of `all()` and the held entries of
the source. It costs one pass over the state. Version 1 of the client
judges each pending request over the recorded state and needs no copy.
A cheaper copy needs shared structure inside `MemoryState`. That is a
change to the kernel, and this note does not ask for it.

## 5. The seed

### 5.1 When the scope makes it

A scope makes a seed in each turn that seals a `floor` entry. The
seed's head T is that floor entry. No read can arrive between the floor
entry and its seed. A scope that has a floor and holds no seed makes
one before its next turn, so a scope that had a floor before this
change gets its seed.

The scope keeps one seed. A new seed replaces the old one.

A seed at head T serves a client while the scope holds each entry
after T. That can end only at the next floor entry, and the next floor
entry makes the next seed. So a scope with a floor always holds one
seed that a client can use.

The scope makes the seed in one pass inside the turn. The store holds
the state in tables, and the pass copies each table. No read starts the
pass.

A scope with no floor makes no seed. A replica of that scope needs each
entry from position 0 to mirror it, so a seed would save no download.
That replica folds from the genesis entry, as the client design says.

### 5.2 What it holds

- The scope reference and the head T.
- The digest of the pinned definition.
- The rows of the state at T, in the order of `StateSnapshot`.

The seed holds no entry. It is storage of the runtime beside the
journal, as the credential table is. It is not part of the record. No
entry names it, and replay does not read it. It counts in no declared
capacity. Its size is at most the size of the state tables.

## 6. The read

`GET /v1/scopes/<scope>/seed` serves the seed in pages.

- **Admission.** A member's session reads it, by a new name `seed` in
  the member reads (`MEMBER_READS`, `packages/scope/src/sessions.ts`).
  A signed read is refused. A signed read of `log` gets only the
  entries of its key and the entries that lead to them, and the state
  holds the effect of every entry.
- **What a member reads.** The seed holds what the archived entries
  left in the state. That includes the accepted keys of other members,
  with the intent digest of each act, and the records, requests,
  relations and holders that those entries wrote. `summary` and `items`
  do not show those rows. The archive does. A member reads the archive
  with the room's read token: `credential` is a member read, and
  `dap clone --archive` fetches each journal ref with that token
  (`docs/operate-a-service.md`). The archive holds each entry below the
  floor, and the seed holds only their effect. So the seed widens no
  member's read. The planner decides that the seed follows the archive:
  a room that closes its archive to a member closes the seed to that
  member in the same change.
- **Pages.** One page holds at most 1 MiB and at least one row, as a
  page of `log` does. Each page names the head T and a cursor. The seed
  does not change between pages. If a new seed replaces it during a
  read, the next page names another head, and the client starts again.
  A scope raises its floor rarely, so the client gives up after three
  starts and stops with the cause `archived`.
- **No seed.** A scope with no floor answers `none`. The client folds
  from the genesis entry.

The read is not a member of `ScopeApi`
(`packages/contract/src/transport.ts`). A page in a browser is its one
caller. `ScopeHandle` in `packages/client` gains `seed()`. The MCP
service and the CLI gain nothing.

## 7. A start, step by step

1. The client reads `log` from position 0.
2. If the scope answers entries, the client folds from the genesis
   entry. The seed is not read.
3. If the scope answers `archived`, the answer names the floor F. The
   client reads the seed. `none` stops the client with `archived`.
4. The client checks that the seed names the scope and the genesis of
   its handle, and the definition digest that the author passed.
5. The client reads position 0 with `entry`. A floor always keeps
   position 0 (`stateKept`, `packages/derive/src/floor.ts`). The client
   checks the genesis entry as a start from the genesis does: its hash
   is the genesis of the handle, and it names the definition.
6. The client reads `log` from F to the scope's head, and each other
   kept position below F with `entry`. The floor state in the seed
   lists the kept positions.
7. The client checks the chain: the entry at T has the hash that the
   seed names, and each entry names the hash of the entry before it.
8. The client calls `loadState` with the rows and the entries from F
   to T. It folds each entry after T.
9. The replica mirrors the scope. The client's state is `current`.

A `floor` entry in the journal restarts the replica. The scope made a
new seed in the turn of that entry. The client reads the new seed, keeps
each entry that it holds at or above the new floor, and goes to step 7.
The fold of a floor entry reads every held entry and each retained copy
that a kept position needs, so the first version does not fold one in
the replica.

A client that returns after a long time reads `log` from its head and
can get `archived`. It drops its state and starts at step 3.

`ClientView` changes in one place. The state `starting` means that the
replica holds no state yet. The cause `archived` stays for a scope with
a floor and no seed, and for three failed starts.

## 8. Trust

A replica that folds from the genesis entry checks that each entry
continues the chain, and it applies the recorded effects. It trusts
the service for the effects and for the order. A seed adds one more
trust: the state at T is the fold of the entries before T.

A client with a seed checks these things.

- The genesis entry, which a floor always keeps.
- The seed names its scope, its genesis and its definition.
- The entry at T has the hash that the seed names, and each later
  entry continues that chain.
- The signature of each act in the entries that it holds.

It cannot check these things.

- That the state is the fold of the entries below F.
- An accepted key below F, beyond its position and its intent digest.

A person with the archive can check a seed with no trust in the
service. The archive holds each entry below F. Replay folds the clone
from the genesis entry to T, and its state digest equals the digest of
the seed's rows. The build adds that check as one command.

The record holds no digest of state today. A `checkpoint` entry carries
one (`packages/contract/src/entry.ts`), and no deployed service writes
a checkpoint. No route, alarm or RPC list calls `Scope.checkpoint`.
Replay does not take a checkpoint as proof of the entries before it
(`packages/replay/src/verify.ts`). A `floor` entry that names the
digest of its seed would put the state in the chain. That is a new
member of an entry, so it needs the review of `docs/kernel.md` section
7, and this note does not ask for it.

## 9. What build step C2 owes

C2 builds the replica that folds from the genesis entry. The rule of
section 3 binds it now.

1. The replica keeps each entry that it folds, while the scope holds
   that entry.
2. The replica gives the fold and `judgeAct` one `Own` object over
   those entries, for its life. `Own` throws `Unheld` for an entry or a
   copy that the scope holds and the replica lacks.
3. Before code, the builder lists each reader of `Own`, of
   `context.retained` and of `fixedHash` in `packages/derive`, with
   what each does when the thing is absent. The table of section 3 is a
   partial list from the review, and the builder's list replaces it.
4. The list states, for each kind of retained copy, the read that
   serves it and when the client reads it.
5. The builder measures the memory of a replica at 20,000 entries, in
   Node and in headless Chrome, and states it in the client note.

If the memory at 20,000 entries passes what a page can hold, the
builder proposes a smaller form. The form must keep part 2 of the rule:
no silent "nothing".

## 10. Kernel review

This section answers `docs/kernel.md`, sections 7 and 7.1.

The note adds no file and no export to `packages/contract`,
`packages/derive` or `packages/bytes`. It adds no entry kind, no member
of an entry, no field type, no scope kind, no platform definition name,
no capability, no reason code and no record form. It adds no tool
family. It names no K item.

- `loadState` uses `MemoryState` with its `put` methods, `indexItems`,
  `fixedRowsOf` and `StateSnapshot`, which `packages/derive` exports
  today.
- The read is a route of the service and a method of `ScopeHandle`. It
  is outside `ScopeApi`. Section 7.4 of the kernel page put the read
  minimums in the contract because every transport must agree on them.
  One transport serves the seed, so that reason does not hold here.
- The seed is runtime storage. Replay does not read it. Promise 11
  holds: the read is of the record at a named position, the head T.
  SS2 adds the read to the one-channel audit.

The first version meets the test of the kernel page: a platform service
and an application library can do the work.

## 11. Limits

A seed does not carry these things, and a replica that starts from one
does not have them below F.

- An entry that changes no item, such as a comment's own entry. The
  accepted key and the intent digest of its act are in the state. Its
  text and its time are in the archive.
- The time, the signer and the hash of an archived entry. A fact
  reference to an accepted key below F cannot be built. So
  `folded(identity, { fact, intent })` of the client design serves a
  request whose entry the replica holds. For an older request the
  replica reads `state.accepted`, which answers that the key is used.
- The bytes of a detached text. The state holds the digest, and the
  `retained` read serves the bytes.

## 12. Size and cost

No bound keeps a state small. Live items have a bound for each type.
Final items have none, and `accepted` gains one row for each accepted
act and loses none at a floor. So the seed grows with the room's life,
and the read has pages for that reason.

An estimate for the shared map of the dap-foldkit plan, from the
formats and not from a measurement: an item of about 800 bytes and an
accepted row of about 175 bytes. At 20,000 entries with 13,000 items,
the state is about 14 MB, which is 14 pages. At 100,000 entries it is
about 70 MB.

The costs to measure in the build:

| Cost | Where | Measure |
|---|---|---|
| The copy pass | The scope, once for each floor entry | Time and rows at 20,000 and at 100,000 entries, on native storage |
| Storage | The scope | Bytes of the seed against bytes of the state |
| The start | The browser | Download, load time and memory for the same two sizes |

If the copy pass at 100,000 entries passes the budget of one turn, the
builder stops and proposes a form in parts. The rule that stays: each
page of one seed states one head.

## 13. A kept replica

A page that opens a room every day folds the same entries every day. A
kept replica stores the state rows and the held entries in the browser
store that NF-5 supplies, and loads them with `loadState`.

The rule of section 3 holds for it. Before it folds, the client reads
`log` from its kept head. The first entry names the hash of the kept
head, or the client drops the kept replica and starts again. A kept
replica adds no trust in the service, because the client folded each
entry itself.

When to write the kept rows, and how much a browser can keep, need
measurements that C2 and NF-5 give. The slice comes after them.

## 14. Slices

Each slice is one head with one gate.

| Slice | Owns | Needs | Witness |
|---|---|---|---|
| SS1, the loader | `loadState`, the typed member table, the copy, and the test of 4.2 | C2 on main | The test of 4.2 |
| SS2, the seed and the read | The copy pass in the floor's turn, the seed tables, the route, the member read name with its row in the entry-point inventory, `ScopeHandle.seed`, the start and the restart of section 7, the archive check of section 8, the measures of section 12, and the changes to the client note, the one-channel audit and the reader pages | SS1 on main | A scope with a floor on native storage: a new client starts from the seed and equals the scope's state, and `judgeAct` agrees for generated acts. A replica that runs across a floor entry restarts and equals the scope's state. A signed reader is refused. A seed replaced during a read starts the client again. A scope with no floor answers `none` |
| SS3, the kept replica | The kept rows in the browser store, the check of the kept head, and the measure of a second load | SS2 and NF-5 on main | A reload folds only the new entries. A kept replica on another chain is dropped |

No milestone of dap-foldkit waits for a slice. The slices come after
build steps C1 to C4 and after the stable base opens. Each slice adds
and retires no room.

## 15. Decisions

1. A replica mirrors the scope. Its `Own` throws `Unheld` for a thing
   that the scope holds and the replica lacks. Planner.
2. `loadState` lives in `packages/client`. The kernel does not change.
   Planner.
3. The scope makes a seed in the turn that seals a floor entry, and
   keeps one. No read makes a seed. Planner.
4. A scope with no floor has no seed. Its replica folds from the
   genesis entry. Planner.
5. A member's session reads the seed. A signed read is refused. The
   seed follows the archive: a member who can read the archive can read
   the seed. Planner.
6. The read is outside `ScopeApi`. Planner.
7. The first version trusts the service for the state at T, as the
   reads `summary` and `items` do. A person with the archive can check
   it. Planner.
8. The checkpoint entry stays unused. Planner.
9. A `floor` entry restarts a replica from the new seed. The first
   version does not fold a floor entry in the replica. Planner.

## 16. Open points

| Point | Question | Proposed |
|---|---|---|
| O1 | Whether the copy pass fits the floor's turn at the largest state | SS2 measures. A form in parts keeps one head for each seed and answers no read of the old seed after the floor entry |
| O2 | Whether a replica can hold hashes for most entries and whole entries for few | After C2's list of readers and its memory measure. Part 2 of the rule stays |
| O6 | Whether a replica folds a floor entry in place | After C2's list. It needs every held entry and each retained copy that a kept position needs |
| O7 | `ScopeObject.checkpoint` is a method of the Durable Object that no route calls | The consolidation review after the cutover decides its removal |
| O3 | Whether a floor entry names the digest of its seed | A later note, with the kernel review. It needs a digest that the scope computes in bounded memory |
| O4 | How many entries a scope holds after a floor entry | The archive decides. SS2 states the number for the Grow room and for AE-1's driver, because the start downloads those entries |
| O5 | Whether a host `none` room, which has no archive and no floor, needs another remedy at 100,000 entries | Not in this note. Its replica folds from the genesis entry, and SS3 makes the second load short |

## 17. Corrections to the request

The request states five things that the source does not support at
`57e893c0`.

1. "An archived room cannot have a replica at all." The floor note
   designs a live tail for a client that holds a clone of the archive
   ([floor note](2026-10-20-retained-journal-floor.md), section 7). The
   true statement: a replica cannot start from the service alone.
2. "A served snapshot can be checked against an entry in the hash
   chain." No deployed scope writes a checkpoint, so no entry holds a
   digest of state.
3. A snapshot is not enough to load from. The loader also needs the
   definition and the held entries.
4. The fold rate of 55 ms for each 1,000 entries comes from one
   measurement at 5,000 entries. The figure for 20,000 entries is an
   estimate.
5. Three line references moved: `entry.ts:79` is `:91`, `settle.ts:295`
   and `:307` are `:293-297` and `:304-311`, and `reads.ts:301` is
   `:311`.

## Sources

Files read:
[state.ts](../packages/derive/src/state.ts),
[fold.ts](../packages/derive/src/fold.ts),
[operand.ts](../packages/derive/src/operand.ts),
[fields.ts](../packages/derive/src/fields.ts),
[fixed-index.ts](../packages/derive/src/fixed-index.ts),
[binding.ts](../packages/derive/src/binding.ts),
[floor.ts](../packages/derive/src/floor.ts),
[draws.ts](../packages/derive/src/draws.ts),
[settle.ts](../packages/derive/src/settle.ts),
[the contract's floor](../packages/contract/src/floor.ts),
[entry.ts](../packages/contract/src/entry.ts),
[transport.ts](../packages/contract/src/transport.ts),
[reads.ts](../packages/scope/src/reads.ts),
[sessions.ts](../packages/scope/src/sessions.ts),
[sqlite.ts](../packages/scope/src/sqlite.ts),
[core.ts](../packages/scope/src/core.ts),
[the kernel boundary](../docs/kernel.md),
[the retained journal floor](2026-10-20-retained-journal-floor.md),
[LOG-1](implementation/2026-11-12-log1-handle-log.md), and
[one client for a declared scope](2026-11-13-scope-client.md).

The client note is on main after request `e5b86654` lands. This note
lands after it.
