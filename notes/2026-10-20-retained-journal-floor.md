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
holds. The grow demo's Room A writes about 4,800 entries a day (three
readings on 20 October 2026: position 165 at 07:18, 986 at 11:21 and
1,180 at 12:25 Eastern). At that rate it reaches 100,000 between 9 and
10 November 2026.

This note specifies a **floor**. A floor is a position in a scope's
journal. The scope does not hold its entries below the floor, because
its archive holds them. Section 1 defines the terms. Section 2 makes
archive passes incremental; the floor needs this, and the demo room
needs it first. Sections 3 to 7 specify the floor. Section 8 lists the
witnesses, and section 9 orders the slices.

A scope that never writes a floor entry behaves exactly as it does
today, entry for entry.

## 1. Terms

- **Position.** An entry's `seq`. Genesis is position 0.
- **Pass.** One run of the archiver. It writes one commit.
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
- **Accepted key.** The pair of an actor and an idempotency key that an
  accepted intent used, with that intent's position, entry hash and
  digest (section 6.4).

## 2. Incremental archive passes

### 2.1 What A3 does now

Each pass of A3 reads every entry from position 0 to its cutoff. It
requires `rows.length === through.seq + 1`, and it compares the first
row's hash with genesis (`packages/scope/src/archive-prefix.ts:62-72`).
It stops with `limit` when the cutoff is past 4,096
(`archive-prefix.ts:42`; `ARCHIVE_BOUNDS.entries`,
`archive-budget.ts:6`). The layout check walks the chain from genesis
(`packages/git/src/journal-layout.ts:66`). The reader refuses a head or
manifest whose `through` is 4,096 or more, and a manifest whose entry
range does not start at 0 (`packages/git/src/journal-manifest.ts:33-41`).
It also refuses any path that the one manifest does not list
(`packages/git/src/journal-reader.ts:85-95`).

So A3 cannot archive or read a scope of more than 4,096 entries. Room A
passed 4,096 entries on 21 October 2026 at the rate above. A pass from
position 0 also cannot work after a floor, because the rows below the
floor are gone.

### 2.2 Layout version 2

Incremental archives use a new layout version. The v1 layout and its
reader stay as they are, so every v1 archive and every S2b witness keeps
its meaning.

| Path | Content |
|---|---|
| `journal/v2/head.json` | `{ v: 2, scope: <ScopeRef>, through: <seq>, hash: <entry hash> }` |
| `journal/v2/passes/<first>.json` | One pass manifest for each pass, with the v1 manifest's fields and `entries: [first, last]`. `first` is 12 decimal digits. |
| `journal/v2/segments/<first>.jsonl` | Entries from `first` on, one canonical entry for each line. |
| `journal/v2/retained/...` | As in v1. |

Each pass manifest carries the S2b fields for its own entries: the
retained inputs that its entries name, and the `foreignSources` basis of
each entry copy that it retains.

### 2.3 Writer rules

1. A pass reads entries from `through.seq + 1` of the last archive
   receipt, or from 0 when there is no receipt, up to its cutoff.
2. One pass covers at most 4,096 entries. This bound applies to a pass,
   not to a scope.
3. The first new entry's `prev` equals the receipt's `through.hash`. The
   chain check starts there, not at genesis.
4. The commit's parent is the receipt's commit. Its tree is the
   parent's tree plus the pass's manifest, segments and retained files,
   and a new `head.json`. No other path changes.
5. A segment closes at 1,000 entries, at the object bound of 15.4, or at
   the pass's cutoff. So a pass never rewrites a segment of an earlier
   pass, and never reads an entry before its first.
6. A retained input that an earlier pass already wrote is listed again
   in the new pass manifest when a new entry names it. The file is not
   written twice.
7. The cost of a pass depends on its new entries and on the tree paths
   it changes. It does not depend on the number of entries already
   archived.
8. A room bound to an archive after it starts, as Room A is, archives
   from position 0 in as many passes as it needs.

### 2.4 Reader rules

1. The reader reads every pass manifest in the tree. The passes tile
   positions 0 to `through` in order: the first starts at 0, each next
   one starts one after the last of the one before, and the last ends at
   `through`.
2. Each pass manifest holds at most 4,096 entries and 512 retained
   inputs, as a v1 manifest does.
3. Each retained file in the tree is listed by at least one pass
   manifest. A file that no pass lists is refused, as in v1.
4. The S2b checks run for each pass: an entry copy needs its
   `foreignSources` basis in the same pass manifest.
5. The chain check runs across passes: the first entry of a pass names
   the last entry of the pass before.
6. The reader's total work is bounded by an option: at most 1,000,000
   entries by default. A larger clone is refused `limit`, not read in
   part.
7. A2's replay reads a v2 clone through the same `gitSource`
   (`packages/replay/src/git.ts:13-15`).

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

### 3.3 Choice of F

The host chooses F in this order:

1. The target T is the smaller of `receipt.through.seq + 1` and
   `head.seq + 1 - margin`. The margin is policy. For the grow demo it
   is 10,000 entries.
2. F is the smaller of T and `currentFloor + 4096`.
3. If entry F - 1 is less than `intentLifetimeSeconds` older than the
   floor entry's time, F moves down to the highest position that meets
   the rule.
4. If F is less than `currentFloor + 1000`, the host writes no floor
   entry. Each floor entry adds one entry, so without this minimum the
   target would rise by one after each floor and invite another.

### 3.4 Three checks, three places

The receipt says that a commit holds the journal up to `through`. Three
parts check it, and each one checks only what it can see.

| Where | It checks | It reads |
|---|---|---|
| Writer (the scope, before the entry is judged) | The input equals the `confirmed` value of the scope's own archive row. That row names this scope and incarnation (`archive-row.ts:49`), and it is set only after the ref read back equal to the commit. | The archive row. It is bookkeeping, not state, and it never reaches the judge. |
| Judge (the scope and replay) | The rules of 3.5. | The journal and current state only. |
| Verifier (offline, with a clone) | The clone holds a commit with this ID, and its `head.json` names the same `through`. Otherwise it reports `floor-commit-missing` or `floor-commit-mismatch`. | The clone only. |

The judge cannot prove that a commit exists outside the scope. The
journal records the writer's statement, and a clone verifies it. Replay
never reads provider state or the archive row.

### 3.5 Judge rules

The scope refuses a floor entry, and writes no entry, when any rule
fails.

| Reason | The entry is refused when |
|---|---|
| `floor-receipt` | `receipt.through.hash` is not the hash of this scope's own entry at `receipt.through.seq`. That entry is held, because `receipt.through.seq` is at least the current floor (rules `floor-back` and `floor-ahead`). |
| `floor-ahead` | F is greater than `receipt.through.seq + 1`. |
| `floor-back` | F is not greater than the current floor. |
| `floor-step` | F is more than 4,096 positions above the current floor. |
| `floor-recent` | Fewer than 100 entries stay above F. Or entry F - 1 is less than `intentLifetimeSeconds` (900) older than the floor entry. |
| `floor-kept` | The kept set of section 4 has more than 4,096 entries. |
| `floor-signers` | The scope has a local signer control, and its phase is not `ready`. Section 4, rule 7, keeps its anchors. |

The first limit in `floor-recent` keeps the journal window of an
application projection above the floor. That window is at most 100
entries (`packages/bytes/src/application-projection.ts:83`). The second
limit keeps every entry that a signed read or an unexpired intent can
still need (`packages/scope/src/signed-reads.ts:332-338`).

### 3.6 Effect

In the same turn as the floor entry, the scope:

1. computes the new kept set of section 4 from current state;
2. deletes each entry row in the old kept set or between the old floor
   and F that is not in the new kept set;
3. moves the accepted key of each deleted entry to the accepted-key
   table (section 6.4);
4. folds the text bounds that the deleted entries proved into the
   proven-bound table (section 6.6);
5. stores F, the receipt and the new kept set in state.

One floor entry deletes at most 8,192 rows: 4,096 by `floor-step` and
4,096 from the old kept set by `floor-kept`. The floor entry itself is
above the floor and counts as an entry.

## 4. What the scope keeps below the floor

The kept set is a function of current state at the floor entry. Replay
computes the same set from its own state. The scope stores the set as a
table of positions, so it survives a restart. The set does not change
until the next floor entry computes it again.

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
   (`packages/scope/src/local-signers.ts:140`), and the local signer
   control's `cutoff` and `next - 1` entries (`local-signers.ts:121-127`).

Kept entries count against `scopeEntries` (section 5), so a large kept
set shows as capacity used. `floor-kept` refuses a floor whose kept set
exceeds 4,096 entries.

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

`logicalBytes` (`sqlite.ts:183-199`) sums entry, `retained_input` and
`retained_value` bytes, once for each byte domain and digest. After a
floor entry it loses the contributions of deleted entries only. Retained
inputs and values keep their charge and their deduplication.
`storedTotalBytes` (`sqlite.ts:216-218`) loses the bytes of deleted
entries in the same way.

Accepted keys are state. Each one adds a fixed number of bytes to
`logicalBytes`, so a scope that opts in to whole-scope capacity bounds
them through `scopeBytes`.

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

`commit` and `through` are the receipt of the current floor. One
receipt covers every archived position: passes only add to the tree, so
the commit of the latest floor holds every entry below it. The scope
stores this one receipt and no older ones. The binding in the room's
directory names the repository.

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

### 6.4 Accepted keys

Today an idempotency key belongs to the first sealed intent of its
actor for the life of the scope (`packages/derive/src/judge.ts:215-219`).
The exact retry of that intent is answered with its entry at any time.
Another intent with the same key is refused `idempotency-mismatch`. The
accepted keys live in the entry table's `actor`, `idem` and `intent`
columns (`sqlite.ts:84-85`, `:248`, `:375`).

The floor keeps this rule. When the floor deletes an entry, its accepted
key moves to an accepted-key table: actor, key, position, entry hash and
intent digest. Then:

- the exact retry of an archived intent is answered `archived`, with
  its position and entry hash;
- another intent with the same actor and key is refused
  `idempotency-mismatch`, as today;
- the accepted set in state does not change, so the state digest of
  `settle.ts:290-293` does not change at a floor entry.

### 6.5 Delivery repeats

A repeat of a delivery reads its deciding entry today
(`delivery.ts:285`). Section 4, rule 3, keeps that entry until the
sender acknowledges the result. A repeat after that is a stale
duplicate. The inbox row answers it alone: the deciding position, its
hash and the decision. The inbox row stores these three values for that
purpose.

### 6.6 Walks from position 0

Each walk that starts at position 0 today reads the kept entries and
then the entries from F, in the scope and in replay:

- `Chains`, on each object start (`signed-reads.ts:252`, `:282`). A
  link from an outcome to an opening entry at an archived position is
  complete. The receipt covers that entry.
- `#carried` for a limited reader (`reads.ts:186-191`). A kept entry
  that the reader can still read through `#mine` (`reads.ts:139-143`)
  still carries its retained inputs.
- `LocalSigners` backfill and proofs (`local-signers.ts:98`,
  `:121-127`, `:156-166`). `floor-signers` keeps its anchors.
- `priorDetachedBounds` (`packages/derive/src/handlers.ts:124-131`). It
  uses earlier successful checks as evidence of a text's size bound
  (`handlers.ts:164-168`). The floor entry folds the bounds that deleted
  entries proved into a proven-bound table: one row for each text digest
  that a held entry names, with the smallest bound. The walk reads that
  table, the kept entries and the entries from F.

### 6.7 State digest

The checkpoint digest is `stateDigest(view.all())`
(`settle.ts:290-293`). `all()` reads accepted intents from the entry
table (`sqlite.ts:375`) and requests through a join on it
(`sqlite.ts:118`). After a floor entry, `all()` reads accepted intents
from the entry table and the accepted-key table together, so the set is
unchanged. Section 4, rule 3, keeps the entry of each pending request,
so the join still finds it. The kept set and the proven-bound table are
state, and replay builds them the same way.

## 7. Replay, clients and the archive

A2's replay starts at genesis and requires the entries in order
(`packages/replay/src/verify.ts:675-681`, `:709`). A floor does not
change that: a clone holds the whole history.

For a live tail, a client reads its clone up to its `through`, then the
service's `log` from `through.seq + 1`:

1. If that position is at or above F, the service answers entries.
2. If it is below F, the service answers `archived` with the current
   receipt. The client fetches the repository until its clone holds the
   receipt's commit, checks the receipt's `through.hash` in the clone,
   and reads again from the new `through.seq + 1`.
3. The floor can move again while the client fetches. The client then
   repeats step 2. After three repeats it reports `incomplete`.

Replay applies each floor entry as the scope does. It computes the kept
set and the proven-bound table from its state, answers later reads of
archived positions `archived`, and counts entries from F. So its
capacity judgments and its state digest equal the scope's.

Two sentences of the volatile-acts note change:

- Section 15.5: "an entry is never rewritten or removed below the head"
  becomes "an entry is never rewritten, and is removed only below the
  floor of the floor note". A rebuild reads only entries after the
  parent's `through`, and those are at or above F.
- Section 15.6: a read of position `n` below F is `archived` when the
  current receipt covers `n`. The service is not read.

This note does not remove retained inputs. The retained store keeps
them as section 15.5 says.

## 8. Witnesses

Each witness runs on a test host with the native store.

1. **Incremental passes.** A scope of 10,000 entries archives in at
   least three v2 passes of at most 4,096 entries each. Each pass reads
   only its new entries. The clone reads past 4,096 entries and replays
   offline through A2. A pass on a room bound after it started begins
   at 0.
2. **v2 reader refusals.** A gap between passes, an overlap, a retained
   file that no pass lists, an entry copy without its `foreignSources`
   basis in its pass, and a broken chain between passes are each
   refused. Every existing v1 reader test passes unchanged.
3. **Choice of F.** A scope at 30,000 entries, with a receipt through
   29,000, a margin of 10,000 and a step of 4,096, moves its floor in
   steps of 4,096 to the target, about 20,000, in five floor entries.
   It then writes no floor entry until the target has risen by at least
   1,000.
4. **Judge rules.** One refused floor entry for each reason of 3.5,
   with the head unchanged. Then one accepted floor entry, with the
   deleted rows counted by a direct store probe.
5. **Verifier.** A floor entry whose commit is not in the clone reports
   `floor-commit-missing`. A commit whose `head.json` names another
   `through` reports `floor-commit-mismatch`. A floor entry from another
   scope's receipt is refused `floor-receipt`.
6. **Capacity.** With `scopeEntries` set to 1,000 in the test host's
   bounds, a scope without a floor is refused `scope-full` at 1,000
   entries. The same scope with archive and floor runs to 5,000 entries
   with no `scope-full` refusal. A scope with retained inputs and a
   byte reservation keeps their byte charges across a floor.
7. **Kept entries.** After a floor passes them: an operation opened
   below the floor settles; an unacknowledged send is sent again; a
   pending request still reads; a fact field of a live item still
   resolves; a local signer's next proof passes; a kept entry still
   carries its retained input to a limited reader.
8. **Reclaim.** A first floor keeps an open operation's opening entry.
   The operation closes. A second floor deletes that entry, and the
   store probe and the counted entries agree.
9. **Accepted keys.** After a floor: the exact retry of an archived
   intent is answered `archived`; a new intent that reuses the key is
   refused `idempotency-mismatch`; both hold after a restart and in
   replay.
10. **Archived answers.** `entry` of an archived position answers
    `archived`. `history` from cursor 0 answers `archived` and then
    pages from F with no gap. A foreign read answers `archived`. An act
    that names an archived position is refused `archived`. A stale
    delivery repeat is answered from the inbox row. A redacted delivery
    binding that needs an earlier size proof resolves from the
    proven-bound table after a restart.
11. **Clients.** A client with a clone through 1,000 and a service
    floor at 9,000 fetches the newer commit and continues. A floor that
    moves during the fetch makes the client repeat. Two floors and a
    restart answer every archived position with the current receipt.
12. **Replay.** A clone plus the service tail replays with equal
    judgments and an equal state digest at each floor entry. The run
    includes an act refused `archived` and a capacity check that the
    floor decides.
13. **No floor, no change.** A scope with no floor entry passes the
    existing capacity, archive and replay tests unchanged.

## 9. Slices

| Slice | Content | Needs | Done when |
|---|---|---|---|
| F1 | Incremental archive passes and the v2 layout and reader (section 2) | A3, S2b | Witnesses 1 and 2 pass, and plan 033 slice 9 can archive a room of more than 4,096 entries. |
| F2 | Floor entry, kept set, counting, accepted keys, reads, walks and replay (sections 3 to 7) | F1 | Witnesses 3 to 13 pass on the test host. |
| F3 | The floor enabled for Room A in the dap-grow archive policy, with a margin of 10,000 entries; the deployment and the hosted readbacks | F2, slice 9 deployed | Room A's counted entries fall after a confirmed pass, and the `/grow/` page says that old entries are in the archive. |

F1 comes before slice 9's deployment, because Room A already holds more
than 4,096 entries when slice 9 deploys. F2 lands by 4 November 2026,
and F3 is deployed by 6 November 2026. With a margin of 10,000 entries
and floor steps of up to 4,096, Room A then holds between about 10,000
and 15,000 counted entries while the simulator runs.
