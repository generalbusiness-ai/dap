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

So A3 cannot archive or read a scope of more than 4,096 entries. At the
rate above, Room A reaches 4,096 entries on 21 October 2026. A pass from
position 0 also cannot work after a floor, because the rows below the
floor are gone.

### 2.2 Layout version 2

Incremental archives use a new layout version. The v1 layout and its
reader stay as they are, so every v1 archive and every S2b witness keeps
its meaning.

| Path | Content |
|---|---|
| `journal/v2/head.json` | `{ v: 2, scope: <ScopeRef>, through: <seq>, hash: <entry hash> }` |
| `journal/v2/passes/<a>/<b>/<c>/<first>.json` | One pass manifest for each pass, with the v1 manifest's fields and `entries: [first, last]`. |
| `journal/v2/segments/<a>/<b>/<c>/<first>.jsonl` | Entries from `first` on, one canonical entry for each line. |
| `journal/v2/retained/<a>/<b>/<c>/<first>/<kind>/<digest>` | A retained input that the pass from `first` wrote. A value has a `<domain>` directory before its digest, as in v1 (`packages/git/src/journal-path.ts:45-54`). |

`<first>` is 12 decimal digits. `<a>`, `<b>` and `<c>` are its first,
second and third groups of three digits. So a `<c>` directory holds the
files of 1,000 positions, and each directory above it holds at most
1,000 names. The highest position is 999,999,999,999. The writer and the
reader refuse a higher position with `limit`.

A retained file stays at the path of the pass that wrote it. A later
pass never moves it. One pass writes at most 512 retained inputs
(section 2.4, rule 2), so a pass's retained directory holds at most 512
files and at most 512 domain directories. v1 instead chooses a path from
the complete set of retained names, and moves every old file into digest
directories when that set passes 4,096 names
(`packages/git/src/journal-files.ts:26-48`,
`packages/git/src/journal-segments.ts:65-88`). v2 does not use that
rule.

The scope finds the pass that holds a retained file without reading the
archive. Each row of `retained_input` and `retained_value`
(`sqlite.ts:106-107`) gains a column `pass`: the `first` of the
confirmed pass that wrote its file, or null when no confirmed pass wrote
it. A retained row of a kind that the archive writes stays for the
scope's life. The only delete, `forget` (`sqlite.ts:485`), removes the
text of a redaction (`turn.ts:401`). The archive writes no texts: its
kinds are definition, entry, rule, snapshot and value
(`journal-path.ts:10`, `:51`). So each archived key has one row. A
later design that archives texts says what a redaction does to its row.
The column is archive bookkeeping, as the archive row is. It is not
state, and the state digest does not include it. Section 2.3, rules 6 and 9, keep it.

Each pass manifest carries the S2b fields for its own entries: the
retained inputs that its entries name, and the `foreignSources` basis of
each entry copy that it retains. Each retained input in a pass manifest
also names `pass`, the `first` of the pass whose directory holds its
file.

### 2.3 Writer rules

1. A pass reads entries from `through.seq + 1` of the last archive
   receipt, or from 0 when there is no receipt, up to its cutoff.
2. One pass covers at most 4,096 entries. This bound applies to a pass,
   not to a scope.
3. The first new entry's `prev` equals the receipt's `through.hash`. The
   chain check starts there, not at genesis.
4. The commit's parent is the receipt's commit. Its tree is the
   parent's tree plus the pass's manifest, segments and retained files,
   and a new `head.json`. No other file changes.
5. A segment closes at 1,000 entries, at the object bound of 15.4, or at
   the pass's cutoff. So a pass never rewrites a segment of an earlier
   pass, and never reads an entry before its first.
6. For each retained key that a new entry names, the pass reads that
   key's row by its primary key. When `pass` is null, the pass writes
   the file in its own directory. Otherwise it lists the key with that
   `pass`, and does not write or move the file. A pass reads at most 512
   rows, and each read is charged a fixed amount to the archive budget's
   `metadata`. No pass reads an older pass's manifest or tree to find a
   key.
7. A pass rewrites only the tree objects on the paths of the files it
   adds. Each of those trees lists at most 1,000 names under `passes/`,
   `segments/` and `retained/`, and a fixed number elsewhere. The pass
   reads those trees from its parent and charges their names and bytes to the
   archive budget (`nodes` and `metadata`, `archive-budget.ts:6`). So the
   work of a pass has a bound that does not grow with the number of
   earlier passes.
8. A room bound to an archive after it starts, as Room A is, archives
   from position 0 in as many passes as it needs.
9. The `pass` column changes only in these places:
   - In the transaction that confirms a pass (`archive-row.ts:134-140`),
     the scope sets `pass` to that pass's `first` for each key that the
     pending manifest lists as written by that pass. That is at most 512
     rows.
   - An abandoned pass sets nothing, so its keys stay null and the next
     pass writes them.
   - The confirmation of a v1 conversion (2.5) sets `pass` to 0 for each
     key that the v1 manifest lists.
   - A new archive binding starts again from position 0 and sets every
     `pass` to null.
   The column and the archive row are in the same store, so a restart
   keeps both, and they always agree.

### 2.4 Reader rules

1. The reader reads every pass manifest in the tree. The passes tile
   positions 0 to `through` in order: the first starts at 0, each next
   one starts one after the last of the one before, and the last ends at
   `through`.
2. Each pass manifest holds at most 4,096 entries and 512 retained
   inputs, as a v1 manifest does.
3. Each retained file in the tree lies in the directory of the pass that
   wrote it, and that pass's manifest lists it with its own `first` as
   `pass`. A file that no pass lists is refused, as in v1.
4. Each retained input in a pass manifest names a `pass` that is this
   pass or an earlier one, and that pass's directory holds the file. Any
   other `pass` is refused.
5. The S2b checks run for each pass: an entry copy needs its
   `foreignSources` basis in the same pass manifest.
6. The chain check runs across passes: the first entry of a pass names
   the last entry of the pass before.
7. A file under `passes/`, `segments/` or `retained/` whose directories
   do not match its `<first>` is refused.
8. The reader's total work is bounded by an option: at most 1,000,000
   entries by default. A larger clone is refused `limit`, not read in
   part.
9. A2's replay reads a v2 clone through the same `gitSource`
   (`packages/replay/src/git.ts:13-15`).

### 2.5 From a v1 archive to v2

A scope with a confirmed v1 archive moves to v2 in one conversion
commit, before its first v2 pass:

1. A pending v1 pass is first confirmed or abandoned by the v1 rules.
   Conversion starts only from a confirmed v1 receipt with no pending
   pass.
2. The conversion commit's parent is the confirmed v1 commit. Its tree
   holds `journal/v2` only.
3. Its one pass manifest is the v1 manifest with `v: 2`, at the path of
   first position 0. The v1 manifest already covers positions 0 to
   `through`, so it is a complete first pass.
4. The v1 segments and retained files keep their bytes at their v2
   paths. Each v1 segment ends at 1,000 entries, at the object bound or
   at `through`, so it meets rule 5 of 2.3. Each v1 retained file goes to
   the retained directory of the pass from 0, and the manifest lists it
   with `pass` 0. A v1 manifest lists at most 512 retained inputs, so
   that directory meets the bound of 2.2.
5. The conversion reads at most 4,096 entries, the v1 bound. It is a
   pass with no new entries, and its receipt is the v1 receipt's
   `through` with the new commit.

No floor entry relies on a v1 commit. A floor needs a v2 receipt.

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
  keep: number[];                      // positions below F that bookkeeping still needs; at most 1,024, ascending
}
```

### 3.3 Choice of F

The host chooses F in this order:

1. The target T is the smaller of `receipt.through.seq + 1` and
   `head.seq + 1 - margin`.
2. F is the smaller of T and `currentFloor + 4096`.
3. If entry F - 1 is less than `intentLifetimeSeconds` older than the
   floor entry's time, F moves down to the highest position that meets
   the rule.
4. If F is less than `currentFloor + minimum`, the host writes no floor
   entry. Each floor entry adds one entry, so without a minimum the
   target would rise by one after each floor and invite another.

The margin and the minimum are policy. For the grow demo the margin is
10,000 entries and the minimum is 1,000. The judge does not check them.

### 3.4 Three checks, three places

A floor entry depends on facts that the journal does not hold: that a
commit exists, and which old entries the host's bookkeeping still reads.
Three parts check them, and each one checks only what it can see.

| Where | It checks | It reads |
|---|---|---|
| Writer (the scope, before the entry is judged) | The receipt equals the `confirmed` value of the scope's own archive row. That row names this scope and incarnation (`archive-row.ts:49`), and it is set only after the ref read back equal to the commit. The `keep` list holds every position below F of section 4.2. The local signer control is `ready`. | The archive row, the outbox acknowledgements, the local signer tables and the signed-read claim index. These are bookkeeping, not state, and they never reach the judge. |
| Judge (the scope and replay) | The rules of 3.5. | The journal, current state and the floor input only. |
| Verifier (offline, with a clone) | The clone holds a commit with this ID, and its `head.json` names the same `through`. Otherwise it reports `floor-commit-missing` or `floor-commit-mismatch`. | The clone only. |

The journal records the writer's statements in the floor input. Replay
reads them from there. It never reads provider state or bookkeeping.

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
| `floor-keep` | `keep` has more than 1,024 positions, is not ascending, or names a position that is not below F or that the scope does not hold. |
| `floor-kept` | The new kept set of section 4 has more than 4,096 entries. |

The first limit in `floor-recent` keeps the journal window of an
application projection above the floor. That window is at most 100
entries (`packages/bytes/src/application-projection.ts:83`). The second
limit keeps every entry that a signed read or an unexpired intent can
still need (`packages/scope/src/signed-reads.ts:332-338`).

**Admission at the bound.** A floor entry is admitted when the counted
entries after its effect are below `scopeEntries`, even when the count
before it is not. Every other input keeps today's admission. So a scope
at its bound can still write the floor entry that makes room.

### 3.6 Effect

In the same turn as the floor entry, the scope:

1. computes the new kept set of section 4;
2. deletes each entry row in the old kept set or between the old floor
   and F that is not in the new kept set;
3. moves the accepted key of each deleted entry to the accepted-key
   table (section 6.4);
4. copies the hash of each deleted sending entry into its outbox
   request rows (section 6.5);
5. adds the size proofs of the deleted entries to the size-proof table
   (section 6.7);
6. stores F, the receipt and the new kept set in state.

One floor entry deletes at most 8,192 rows: 4,096 by `floor-step` and
4,096 from the old kept set by `floor-kept`. The floor entry itself is
above the floor and counts as an entry.

## 4. What the scope keeps below the floor

The kept set has two parts. The first part is a function of current
state. The second part is the floor input's `keep` list. Replay computes
the first part from its own state and reads the second from the journal.
So the scope and replay keep the same set. The scope stores the set as a
table of positions, so it survives a restart. The set does not change
until the next floor entry computes it again.

### 4.1 From state

1. Genesis, position 0. Many readers need it: for example
   `core.ts:377`, `object.ts:183`, `signed-reads.ts:355` and
   `archive-pin.ts:63`.
2. The opening entry of each open operation (`operations.ts:411`,
   `:544`; settle origins, `packages/derive/src/settle.ts:226-233`).
3. The sending entry of each pending request: an outbox request row with
   no result and no diagnosis in state (`sqlite.ts:118`).
4. The opening entry of each live item. An item's ID is the position of
   its opening entry (`packages/derive/src/fold.ts:104`).
5. Each own position that a value in current state names: a fact field
   of a live item, a record, a relation, and each `folded` row that
   carries a position. F2's report lists each such row kind.
6. Each entry that the `prepared` table names
   (`packages/derive/src/prepare.ts:316-319`).

### 4.2 From the writer's `keep` list

The writer lists every position below F that bookkeeping still reads:

1. The sending entry of each outbox row that transport has not
   acknowledged (`outbox.ts:6-12`, `:179`, `:202`; `sqlite.ts:517`,
   `:524-525`; `operator.ts:189-191`). A delivery's deciding entry is the
   sending entry of its result, so this keeps it until the sender
   acknowledges the result.
2. The local signer control's `cutoff` and `next - 1` entries, and the
   latest entry of each local signer (`local-signers.ts:121-127`,
   `:140`).
3. For each claim in the signed-read claim index, the entry that
   delivered its directory genesis. `Chains` learned the claim from that
   entry (`signed-reads.ts:275-292`). `Reads.#open` needs that index for an
   authenticated membership session (`reads.ts:123`).

An acknowledgement that arrives after a floor entry releases nothing
until the next floor entry. So the rule errs toward keeping. Two scopes
with the same journal and different acknowledgement timing write
different `keep` lists. Each journal records its own list, so replay of
each agrees with its scope.

Kept entries count against `scopeEntries` (section 5), so a large kept
set shows as capacity used.

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

### 6.5 Request rows

Each request that the scope sends has an outbox row. The row holds the
target, the request, and the result or diagnosis (`sqlite.ts:91-92`).
Request reads take the sending entry's hash through a join on the entry
table (`REQUEST_ROWS`, `sqlite.ts:118`). Request rows are state. The
SQLite store exports every one, with or without a result
(`sqlite.ts:376`). Replay's memory state keeps every one
(`packages/derive/src/state.ts:543-547`) and exports it (`:578`), and
the state digest hashes them. Neither store deletes a request row
today.

A pending request keeps its sending entry (section 4.1, item 3). A
completed request does not need its sending entry, but its row needs the
entry's hash. So the floor keeps the row and drops the entry:

- Before the floor deletes a sending entry, it copies the entry's hash
  into each outbox request row of that entry, in a new `hash` column.
- Request reads take the hash from the entry row when the scope holds
  it, and from the request row otherwise. `request(seq, n)`
  (`sqlite.ts:251-253`), `pendingRequests` (`:255-256`) and the export
  answer as before.
- A floor adds no request row and removes none. Completed requests stay
  in state for the life of the scope, as they do today. They are not
  kept entries, so they do not count toward `floor-kept`.

So the store and replay export the same request set, before and after a
floor entry.

### 6.6 Delivery repeats

A repeat of a delivery reads its deciding entry today
(`delivery.ts:285`). Section 4.2, item 1, keeps that entry until the
sender acknowledges the result. A repeat after that is a stale
duplicate. The inbox row answers it alone: the deciding position, its
hash and the decision. The inbox row stores these three values for that
purpose.

### 6.7 Walks from position 0

Each walk that starts at position 0 today reads the kept entries and
then the entries from F, in the scope and in replay:

- `Chains`, on each object start (`signed-reads.ts:252`, `:282`). It
  rebuilds its claim index from the discovery entries that section 4.2,
  item 3, keeps. A link from an outcome to an opening entry at an
  archived position is complete; the receipt covers that entry. Archive
  coverage grants no authority: a membership whose discovery entry is
  not kept and not above F has no claim.
- `#carried` for a limited reader (`reads.ts:186-191`). A kept entry
  that the reader can still read through `#mine` (`reads.ts:139-143`)
  still carries its retained inputs.
- `LocalSigners` backfill and proofs (`local-signers.ts:98`,
  `:121-127`, `:156-166`). Section 4.2, item 2, keeps its anchors, and
  the writer offers no floor while the control is not `ready`.
- `priorDetachedBounds` (`packages/derive/src/handlers.ts:124-131`).

`priorDetachedBounds(n)` uses only checks at positions before n. A
later proof never decides an earlier binding (`handlers.ts:153-159`).
So the floor keeps each proof with its position, in a size-proof table:

- A row holds a text digest, a position and a bound: the entry at that
  position proved that the text is at most that many bytes.
- For one digest, the table keeps a row only when its bound is smaller
  than every row at an earlier position. A later, larger bound can never
  be the smallest bound before any n, so it is dropped.
- The table holds rows only for digests that held entries name.
- The walk for n reads the table rows with a position below n, the kept
  entries below n and the entries from F to n - 1. It takes the smallest
  bound.

The bounds come from the definition's text field limits, so one digest
has at most as many rows as the definition has distinct text limits.

### 6.8 State digest

The checkpoint digest is `stateDigest(view.all())`
(`settle.ts:290-293`). `all()` reads accepted intents from the entry
table (`sqlite.ts:375`) and requests through a join on it
(`sqlite.ts:118`). After a floor entry, `all()` reads accepted intents
from the entry table and the accepted-key table together, so the set is
unchanged. It reads every request row with the hash of section 6.5, so
the request set is unchanged too. The kept set and the size-proof table
are state, and replay builds them the same way.

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
set and the size-proof table from its state, answers later reads of
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
2. **Tree work.** A scope makes 10,000 confirmed passes of one entry
   each, and the pass from position 3,700 also writes one retained
   input. One more pass then rewrites at most the trees on its paths. A
   probe counts the tree names that this pass reads and writes, and the
   count stays within the bound of 2.3, rule 7. Then nine passes each add 512 new retained inputs of
   one kind, 4,608 in all, and one more pass adds one. That pass writes
   one retained file in its own directory, no earlier retained path
   changes, and the probe count stays within the same bound. Then the
   scope restarts, and one more pass names a key that the pass from
   position 3,700 wrote and a key that no pass wrote. It lists the first
   key with `pass` 3,700 and writes the second in its own directory. It
   reads two key rows and no manifest or tree of an older pass, and no
   file is written twice or moved.
3. **v2 reader refusals.** A gap between passes, an overlap, a retained
   file that no pass lists, a retained input whose `pass` is later or
   does not hold its file, an entry copy without its `foreignSources`
   basis in its pass, a file in the wrong directory, a position above
   999,999,999,999 and a broken chain between passes are each refused.
   Every existing v1 reader test passes unchanged.
4. **From v1.** A scope with a confirmed v1 archive through 99 converts
   and continues in v2 from 100; the clone reads and replays from 0. The
   converted keys have `pass` 0, and a v2 pass that names one of them
   lists it and does not write it again. A
   scope with a pending v1 pass first confirms it, then converts. A
   floor entry that names a v1 commit is not offered.
5. **Choice of F.** A scope at 30,000 entries, with a receipt through
   29,000, a margin of 10,000, a minimum of 1,000 and a step of 4,096,
   moves its floor in steps of 4,096 to the target, about 20,000, in
   five floor entries. It then writes no floor entry until the target
   has risen by at least 1,000.
6. **Judge rules.** One refused floor entry for each reason of 3.5,
   with the head unchanged. Then one accepted floor entry, with the
   deleted rows counted by a direct store probe.
7. **Verifier.** A floor entry whose commit is not in the clone reports
   `floor-commit-missing`. A commit whose `head.json` names another
   `through` reports `floor-commit-mismatch`. A floor entry from another
   scope's receipt is refused `floor-receipt`.
8. **Capacity.** The test host sets `scopeEntries` to 2,000 and a test
   policy of margin 200 and minimum 500; the judge's limits stay as
   written, and the test clock passes `intentLifetimeSeconds` between
   floors. A scope without a floor is refused `scope-full` at 2,000
   entries. The same scope with archive and floor runs to 10,000 entries
   with no `scope-full` refusal. A scope held exactly at its bound
   writes a floor entry and then admits new entries. A scope with
   retained inputs and a byte reservation keeps their byte charges
   across a floor.
9. **Kept entries.** After a floor passes them: an operation opened
   below the floor settles; a pending request still reads; a fact field
   of a live item still resolves; a kept entry still carries its
   retained input to a limited reader.
10. **Keep list.** Two runs of the same journal differ only in when
    transport acknowledges a send. The floor entry of each lists what
    its own bookkeeping needs. In both, no entry that an unacknowledged
    send needs is deleted, the send is sent again after a restart, and
    replay of each journal agrees with its scope.
11. **Signers and claims.** After two floors and a restart: a local
    signer's next proof passes; an established membership session reads
    its register; a membership whose claim was never discovered is
    refused.
12. **Size proofs.** A kept bad-field deciding entry at 100 and a
    first proof for its text at 200: after a floor deletes 200, the
    binding at 100 stays unresolved. With an earlier proof at 50, it
    resolves. Both hold after a restart and in replay.
13. **Reclaim.** A first floor keeps an open operation's opening entry.
    The operation closes. A second floor deletes that entry, and the
    store probe and the counted entries agree.
14. **Accepted keys.** After a floor: the exact retry of an archived
    intent is answered `archived`; a new intent that reuses the key is
    refused `idempotency-mismatch`; both hold after a restart and in
    replay.
15. **Completed requests.** A request sent at 100 is acknowledged and
    completes at 150, and nothing else keeps entry 100. Two floors pass
    150, and the scope restarts. Entry 100 is not held and is not in the
    kept set. `request(100, n)` still answers the completed request with
    entry 100's hash, the export still lists it, and the checkpoint
    digest equals replay's at each floor entry.
16. **Archived answers.** `entry` of an archived position answers
    `archived`. `history` from cursor 0 answers `archived` and then
    pages from F with no gap. A foreign read answers `archived`. An act
    that names an archived position is refused `archived`. A stale
    delivery repeat is answered from the inbox row.
17. **Clients.** A client with a clone through 1,000 and a service
    floor at 9,000 fetches the newer commit and continues. A floor that
    moves during the fetch makes the client repeat. Two floors and a
    restart answer every archived position with the current receipt.
18. **Replay.** A clone plus the service tail replays with equal
    judgments and an equal state digest at each floor entry. The run
    includes an act refused `archived` and a capacity check that the
    floor decides.
19. **No floor, no change.** A scope with no floor entry passes the
    existing capacity, archive and replay tests unchanged.

## 9. Slices

| Slice | Content | Needs | Done when |
|---|---|---|---|
| F1 | Incremental archive passes, the v2 layout and reader, and the v1 conversion (section 2) | A3, S2b | Witnesses 1 to 4 pass, and plan 033 slice 9 can archive a room of more than 4,096 entries. |
| F2 | Floor entry, kept set and `keep` list, counting, accepted keys, size proofs, reads, walks and replay (sections 3 to 7) | F1 | Witnesses 5 to 19 pass on the test host. |
| F3 | The floor enabled for Room A in the dap-grow archive policy, with a margin of 10,000 and a minimum of 1,000; the deployment and the hosted readbacks | F2, slice 9 deployed | Room A's counted entries fall after a confirmed pass, and the `/grow/` page says that old entries are in the archive. |

F1 comes before slice 9's deployment, because Room A already holds more
than 4,096 entries when slice 9 deploys. F2 lands by 4 November 2026,
and F3 is deployed by 6 November 2026. With a margin of 10,000 entries
and floor steps of up to 4,096, Room A then holds between about 10,000
and 15,000 counted entries while the simulator runs.
