# A floor for a scope's journal

Design note. Proposed: nothing here is built.

A scope is one Durable Object. It holds an ordered journal of entries,
each linked to the one before it by hash, and the current state that
those entries derive. A scope can hold at most `scopeEntries` entries
(100,000, `packages/contract/src/bounds.ts:116`). Today the count starts
at position 0 and never goes down: every capacity check compares
`head.seq + 1` with the bound. So every scope that keeps working stops
one day, however little it holds in state.

The archive of section 15 of the
[volatile-acts note](2026-10-09-shared-language-volatile-acts.md) copies
a journal to a Git repository. Copying does not reduce what the scope
holds. The grow demo's Room A writes about 4,900 entries a day (two
readings on 20 October 2026: position 165 at 07:18 and 986 at 11:21
Eastern). At that rate it reaches 100,000 near 9 November 2026.

This note specifies a **floor**. A floor is a position in a scope's
journal. The scope does not hold its entries below the floor, because
its archive holds them. Section 1
defines the terms. Section 2 makes archive passes incremental; the floor
needs this, and the demo room needs it first. Sections 3 to 7 specify
the floor. Section 8 lists the witnesses, and section 9 orders the
slices.

A scope that never writes a floor entry behaves exactly as it does
today, entry for entry.

## 1. Terms

- **Position.** An entry's `seq`. Genesis is position 0.
- **Archive receipt.** A confirmed archive commit of this scope and
  incarnation: the commit ID and `through`, the position and hash of the
  last entry it holds (`ArchivedPosition`,
  `packages/scope/src/archive-row.ts:17`). Today `ArchiveRows.confirm`
  stores it after the ref reads back equal to the commit
  (`archive-row.ts:134-140`, `archive-driver.ts:212-217`).
- **Floor.** A position F. The scope holds every entry at F and above.
  Before the first floor entry, F is 0.
- **Floor entry.** An entry of the scope's own journal that moves the
  floor (section 3).
- **Kept entry.** An entry below the floor that the scope still holds,
  because current state needs it (section 4).
- **Archived position.** A position below the floor whose entry is not
  kept. The scope does not hold it. The archive holds it.
- **Counted entries.** The entries the scope holds:
  `head.seq + 1 - F`, plus the number of kept entries. The capacity
  bound applies to this count (section 5).

## 2. Incremental archive passes

### 2.1 What A3 does now

Each pass of A3 reads every entry from position 0 to its cutoff. It
requires `rows.length === through.seq + 1`, and it compares the first
row's hash with genesis (`packages/scope/src/archive-prefix.ts:62-72`).
It stops with `limit` when the cutoff is past 4,096
(`archive-prefix.ts:42`; `ARCHIVE_BOUNDS.entries`,
`archive-budget.ts:6`). The layout check also walks the chain from
genesis (`packages/git/src/journal-layout.ts:66`).

So A3 cannot archive a scope of more than 4,096 entries. At the rate
above, Room A passes 4,096 entries on 21 October 2026. A pass from position 0 also cannot
work after a floor, because the rows below the floor are gone.

### 2.2 Rules

Section 15.5 of the volatile-acts note already says that a pass cuts at
its head, or earlier when the pass's bound is reached, on the last
confirmed commit. These rules make that exact.

1. A pass reads entries from `through.seq + 1` of the last archive
   receipt, or from 0 when there is no receipt, up to its cutoff.
2. One pass covers at most 4,096 entries. This bound applies to a pass,
   not to a scope.
3. The first new entry's `prev` equals the receipt's `through.hash`. The
   chain check starts there, not at genesis.
4. The commit's parent is the receipt's commit. Segments other than the
   last do not change (section 15.4, "Append only").
5. The last segment of the parent can be partial. The pass rewrites it
   with its earlier lines and the new ones. So the pass reads the
   entries of that segment from the scope's journal. Section 3 keeps
   the floor at or below the first position of that segment.
6. The manifest lists the retained inputs that the new entries name.
   Inputs that earlier passes listed are already in the parent's tree.
7. The cost of a pass depends on its new entries and on the size of
   the parent's tree. It does not depend on the number of entries
   already archived.
8. A room bound to an archive after it starts, as Room A is, archives
   from position 0 in as many passes as it needs.

## 3. Floor entry

### 3.1 Who writes it

The scope writes the floor entry itself, from its alarm, after a pass
is confirmed. No member signs it, and no act can request it. The
scope's host offers a floor only when the deployment's reviewed archive
policy enables the floor for that binding. The rules of the floor entry
are part of the scope contract, not of a definition, so every
definition has the same floor.

### 3.2 Content

```ts
interface FloorInput {
  floor: number;                       // the new floor F
  receipt: { commit: string; through: { seq: number; hash: Digest } };
}
```

The host chooses F. For the grow demo it chooses the highest F that the
rules allow, less a margin of 10,000 entries. The margin is policy. The
rules below do not check it.

### 3.3 Rules

The scope refuses a floor entry, and writes no entry, when any rule
fails. Each rule uses only the journal and the current state, so replay
checks it the same way.

| Reason | The entry is refused when |
|---|---|
| `floor-receipt` | `receipt.through.hash` is not the hash of this scope's own entry at `receipt.through.seq`. |
| `floor-ahead` | F is greater than `receipt.through.seq + 1`. |
| `floor-back` | F is not greater than the current floor. |
| `floor-step` | F is more than 4,096 positions above the current floor. |
| `floor-recent` | Fewer than 100 entries stay above F, so F is greater than `head.seq + 1 - 100`. Or entry F - 1 is less than `intentLifetimeSeconds` (900) older than the floor entry. |
| `floor-segment` | F is greater than the first position of the last segment of the receipt's commit. |

The first limit in `floor-recent` keeps the journal window of an
application projection above the floor. That window is at most 100
entries (`packages/bytes/src/application-projection.ts:83`). The second
limit keeps every entry that a signed read or an unexpired intent can
still need (`packages/scope/src/signed-reads.ts:332-338`).

### 3.4 Effect

In the same turn as the floor entry, the scope:

1. computes the kept set of section 4 from current state;
2. deletes each entry row from the old floor up to F that is not kept,
   with its idempotency index row (`entry_by_key`,
   `packages/scope/src/sqlite.ts:85`);
3. stores F, the receipt and the number of kept entries in its scope
   frame.

The floor entry itself is above the floor and counts as an entry. One
floor entry deletes at most 4,096 rows, because of `floor-step`.

## 4. What the scope keeps below the floor

The kept set is a function of current state at the floor entry. Replay
computes the same set from its own state. The set does not change until
the next floor entry computes it again.

The scope keeps these entries below the floor:

1. Genesis, position 0. Many readers need it: for example
   `core.ts:377`, `object.ts:183`, `signed-reads.ts:355` and
   `archive-pin.ts:63`.
2. The opening entry of each open operation (`operations.ts:411`,
   `:544`; settle origins, `packages/derive/src/settle.ts:226-233`).
3. The sending entry of each outbox row that is not acknowledged or
   diagnosed, and of each pending request (`sqlite.ts:118`, `:517`;
   `outbox.ts:202`; `operator.ts:189-191`). A delivery's deciding entry
   is the sending entry of its result, so this rule keeps it until the
   sender acknowledges the result.
4. The opening entry of each live item. An item's ID is the position of
   its opening entry (`packages/derive/src/fold.ts:104`).
5. Each own position that a value in current state names: a fact field
   of a live item, a record, a relation, and each `folded` row that
   carries a position. F2's report lists each such row kind.
6. Each entry that the `prepared` table names
   (`packages/derive/src/prepare.ts:316-319`).
7. The latest entry of each local signer
   (`packages/scope/src/local-signers.ts:140`).

The state bounds limit each of these sets. Kept entries count against
`scopeEntries` (section 5), so a large kept set shows as capacity used.

## 5. Capacity counting

Counted entries replace `head.seq + 1` at each place that checks the
bound today:

- `packages/scope/src/turn.ts:266` (timed drain) and `:367` (whole-scope
  admission);
- `packages/derive/src/reserve.ts:234-246` (`fits`, legacy reservation
  admission);
- `packages/scope/src/core.ts:795`, `outbox.ts:216`,
  `operations.ts:726` and `delivery.ts:267`.

One function returns the count. The places above call it.

`logicalBytes` (`sqlite.ts:183-199`) and `storedTotalBytes`
(`sqlite.ts:216-218`) sum the bytes of held entries only: those at or
above the floor, and the kept entries.

These limits do not change:

- Directory partitions seal on `head.seq`
  (`packages/platform/src/directory-partitions.ts:175-179`). The guard
  sets when a partition seals, not what it holds.
- Site publication stops at 4,096 entries
  (`packages/scope/src/site/publication.ts:100`).

The comment on `scopeEntries` (`bounds.ts:63`) changes to: entries one
scope holds, at or above its floor, plus its kept entries.

## 6. Reads below the floor

### 6.1 Answer

A read of an archived position answers:

```ts
{ archived: { floor: number; commit: string; through: { seq: number; hash: Digest } } }
```

`commit` and `through` come from the receipt of the floor entry that
removed the position. The binding in the room's directory names the
repository. A reader that holds a clone reads the entry there.

### 6.2 Public reads

- `entry(seq)` (`packages/scope/src/reads.ts:307-315`) returns a kept
  entry. For an archived position it answers `archived`.
- `history` and `log` (`reads.ts:246-283`) answer `archived`, with
  `next` set to F, for a cursor below F. They list kept entries only
  through `entry`. So each page from F has no gaps, and the cursor
  arithmetic at `reads.ts:266` and `:283` stays correct.
- `OperatorRecord.follow` (`operator.ts:132-138`) moves a mark below F
  to F.
- Fact times (`projection-fact-times.ts:19`) and fact signers answer
  `null` for an archived position, as they do for a missing row.

### 6.3 Reads inside a judgment

A judgment reads own entries through `ownOf` (`core.ts:54-57`) and the
derive reads that a fact field names (for example
`packages/derive/src/guards.ts:218`, `operand.ts:90-95`,
`effects.ts:97`). An act that names an archived position is refused
`archived`. Replay knows F and the kept set at each point. So it refuses
the same act for the same reason, although it holds the entry.

A scope that reads another scope's archived position
(`packages/scope/src/namespace.ts:151`, `:276-281`) gets `archived`,
where today it gets `{ absent: true }`. A receiver keeps its own copy of
a foreign entry that it used (`retained_input`), so a floor in the
source never changes a judgment already written.

### 6.4 Retried intents

Today the exact retry of an accepted intent is answered with its entry
at any time (`packages/derive/src/judge.ts:215-219`; `sqlite.ts:248`;
`core.ts:401`). Below the floor the index row is gone. A retry is then
judged as a new intent. Its `notAfter` has passed, because of
`floor-recent`, so it is refused as any expired intent is. The client
finds its entry in the archive.

### 6.5 Delivery repeats

A repeat of a delivery reads its deciding entry today
(`delivery.ts:285`). Section 4, rule 3, keeps that entry until the
sender acknowledges the result. A repeat after that is a stale
duplicate. The inbox row answers it alone: the deciding position, its
hash and the decision. The inbox row stores these three values for that
purpose.

### 6.6 Walks from position 0

Every walk that starts at position 0 today starts at F, in the scope and
in replay:

- `Chains`, on each object start (`signed-reads.ts:252`, `:282`). A
  link from an outcome to an opening entry at an archived position is
  complete. The floor entry's receipt covers that entry.
- `#carried` for a limited reader (`reads.ts:186-191`).
- `LocalSigners` backfill and cutoff (`local-signers.ts:98`, `:121-123`,
  `:156-166`). The latest signer entries are kept by section 4, rule 7.
- `priorDetachedBounds` (`packages/derive/src/handlers.ts:124-131`).

### 6.7 State digest

The checkpoint digest is `stateDigest(view.all())`
(`settle.ts:290-293`). `all()` reads accepted intents from the entry
table (`sqlite.ts:375`) and requests through a join on it
(`sqlite.ts:118`). After a floor entry, the accepted set holds the
intents of held entries only. Replay's state drops the same intents at
the same floor entry. Section 4, rule 3, keeps the entry of each
pending request, so the join still finds it.

## 7. Replay and the archive

A2's replay starts at genesis and requires the entries in order
(`packages/replay/src/verify.ts:675-681`, `:709`). It reads a clone
through `gitSource` (`packages/replay/src/git.ts:13-15`). A floor does
not change that: the clone holds the whole history.

For a live tail, replay reads the clone up to its `through`, then the
service's `log` from `through.seq + 1`. That position is at or above F
by `floor-ahead`, so the service holds it. The first service entry's
`prev` equals the clone's `through.hash`.

Replay applies each floor entry as the scope does. It computes the kept
set from its state, answers later reads of archived positions
`archived`, counts entries from F, and drops the same accepted intents.
So its capacity judgments and its state digest equal the scope's.

Two sentences of the volatile-acts note change:

- Section 15.5: "an entry is never rewritten or removed below the head"
  becomes "an entry is never rewritten, and is removed only below the
  floor of the floor note". A rebuild reads only entries after the
  parent's `through`, and those are at or above F.
- Section 15.6: a read of position `n` below F is `archived` when the
  receipt of the floor entry that removed it covers `n`. The service is
  not read.

This note does not remove retained inputs. The retained store keeps
them as section 15.5 says.

## 8. Witnesses

Each witness runs on a test host with the native Durable Object store.

1. **Incremental passes.** A scope of 10,000 entries archives in at
   least three passes of at most 4,096 entries each. Each pass reads
   only its new entries and the last segment's. A clone replays offline
   through A2. A pass on a room bound after it started begins at 0.
2. **Floor rules.** One refused floor entry for each reason of 3.3,
   with the head unchanged. Then one accepted floor entry, with the
   deleted rows counted by a direct SQL probe.
3. **Capacity.** With `scopeEntries` set to 1,000 in the test host's
   bounds, a scope without a floor is refused `scope-full` at 1,000
   entries. The same scope with archive and floor runs to 5,000 entries
   with no `scope-full` refusal.
4. **Kept entries.** After a floor passes them: an operation opened
   below the floor settles; an unacknowledged send is sent again; a
   pending request still reads; a fact field of a live item still
   resolves; a local signer's next proof passes.
5. **Archived answers.** `entry` of an archived position answers
   `archived`. `history` from cursor 0 answers `archived` and then pages
   from F with no gap. A foreign read answers `archived`. An act that
   names an archived position is refused `archived`. A retry of an
   intent below the floor is refused as expired. A stale delivery repeat
   is answered from the inbox row.
6. **Replay.** A clone plus the service tail replays with equal
   judgments and an equal state digest at each floor entry. The run
   includes an act refused `archived` and a capacity check that the
   floor decides.
7. **Restart.** After a floor entry and an object restart, `Chains`,
   `LocalSigners` and `OperatorRecord.follow` start at F. A probe
   counts no read of an archived position.
8. **No floor, no change.** A scope with no floor entry passes the
   existing capacity, archive and replay tests unchanged.

## 9. Slices

| Slice | Content | Needs | Done when |
|---|---|---|---|
| F1 | Incremental archive passes (section 2) | A3 | Witness 1 passes, and plan 033 slice 9 can archive a room of more than 4,096 entries. |
| F2 | Floor entry, kept set, counting, reads, walks and replay (sections 3 to 7) | F1 | Witnesses 2 to 8 pass on the test host. |
| F3 | The floor enabled for Room A in the dap-grow archive policy, with a margin of 10,000 entries; the deployment and the hosted readbacks | F2, slice 9 deployed | Room A's counted entries fall after a confirmed pass, and the `/grow/` page says that old entries are in the archive. |

F1 comes before slice 9's deployment, because Room A already holds
more than 4,096 entries when slice 9 deploys. F2 lands by 4 November 2026, and F3 is
deployed by 6 November 2026. With a margin of 10,000 entries and passes
of up to 4,096, Room A then holds between about 10,000 and 15,000
counted entries while the simulator runs.
