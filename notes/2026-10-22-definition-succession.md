# Definition succession

Design note, draft 2, for request `95d01d30`. Draft 2 answers review
`f1e3ca14`: the journal after the cutoff, carried item identity, one
successor for each cutoff, and what the genesis can refuse (sections 5 to
8). Proposed: nothing here is built.

A Counter has run in a room for four months. It holds sixteen
participants, a board and a pledged promise that is due on Friday. Its
owner wants one more act, to change the target, and a clearer name for a
participant who is not taking part. Today the Counter's scope can never
take a new definition. This note says how the Counter, and any long-lived
application, moves to a new definition and keeps the meaning of what it
has already recorded.

The answer is a successor scope. The old scope's state ends at one cutoff
entry. A new scope, under the new definition, starts from that entry. Its
genesis names the entry, and it carries the old items over through a
mapping that is data. The application's name moves to the new scope. The old
scope stays readable and replayable, and it refuses new acts with a reason
that names its successor.

Source baseline: main `c40492ee` and dap-spike main `9d738e2e`. dap-spike
references give the path and line numbers.

## 1. Principle

A scope's definition never changes, and its history is never
reinterpreted. An application moves to a new definition only by
succession: an ordered cutoff entry in the old scope, with no change to
its state after it, and a new scope whose genesis names that entry and
derives its state from it by a mapping that is data.

The kernel boundary page (request `2ee805c5`) carries this sentence in its
list of the kernel's promises.

## 2. Where dap stands

A scope pins one definition at its genesis and keeps it for life. The
documentation says so in many places, for example
[architecture](../docs/architecture.md) (lines 21 to 23),
[what dap is](../docs/what-is-dap.md) (lines 35 and 36) and
[scopes](../docs/scopes.md) (lines 81 to 83 and 268 to 269). The code
makes it structural. The seed of a genesis holds the definition, and the
scope ID is the digest of the seed (`packages/contract/src/scope.ts:44-51`,
`packages/bytes/src/domains.ts:44-47`). So a scope ID names its definition.
A new definition means a new scope ID.

These parts exist today:

- An act addressed to another incarnation is refused `misaddressed`
  (`packages/derive/src/judge.ts:213`), and a read or a route is answered
  `wrong-incarnation` (`packages/derive/src/delivery.ts:62`).
- A receiver that pins a sender's definition refuses a sender with the same
  name and another digest: `wrong-pin`
  (`packages/derive/src/delivery.ts:189-191`).
- The rules scope's `retire-definition` act stops new scopes of a
  definition and leaves existing scopes as they are
  (`packages/platform/src/rules-scope.ts:281-292`). No document describes
  it.
- A directory partition seals its active scope and opens a successor under
  the same definition. A stale client is refused `partition-sealed`
  ([directory partitions](2026-10-15-directory-partitions.md), lines 275 to
  277 and 424). This is the nearest precedent for a handoff between two scopes.
- An application package has a `predecessor` field
  (`packages/bytes/src/application-types.ts:28`). Its shape is checked, and
  nothing reads it.

These parts do not exist: a scope-wide retire or close, a reason code for
an act sent to a succeeded scope, a lineage between scopes, and a command
that upgrades an application.

Three earlier notes left the same gap.
[Self-contained applications](2026-10-15-self-contained-applications.md)
(gap 10, lines 283 to 323) set the order: successor declarations, then
carry-forward into a new scope, then change inside a running scope. Its
decision 4 says that until change inside a running scope exists, upgrades
use new scopes and carry forward. Its milestone M3 (lines 378 to 396) names
the witnesses of a carry-forward. This note is M3's design. The
[packages note](2026-10-18-application-packages-and-builder-room.md)
(section 2, lines 116 to 118) says that a template's new version reaches
rooms by a successor package, never by propagation, and its section 6,
item 6, says that a successor package names its predecessor and carries
forward. The [jam room note](2026-10-01-jam-room.md) (lines 999 to 1002)
and the [collections note](2026-10-02-collections-of-rooms.md) (C-3,
lines 269 to 271) also stop at this question.

## 3. What the dap-spike established

The dap-spike studied a record that changes its rules while it runs.
Sources, all under the spike's `notes/` and `spike/` directories:

- `notes/2026-09-14-evolving-spaces-design.md`: the design;
- `notes/2026-09-14-one-series-many-views.md`: the authoring budget;
- `notes/2026-09-14-ordering.md`: the split by export;
- `notes/2026-09-18-authoring-language-directions.md`: causes of the
  repairs;
- `notes/2026-09-22-technology-spikes-plan.md`: the unrun migration spike;
- `spike/REPORT.md` and `spike/ORDERING-REPORT.md`: the results;
- `spike/src/descriptor.ts`, `spike/src/foundation.ts`: the attach code.

Its design is
[evolving spaces](https://github.com/generalbusiness-ai/dap-spike/blob/main/notes/2026-09-14-evolving-spaces-design.md)
(below, "design"), and its results are in the
[visibility report](https://github.com/generalbusiness-ai/dap-spike/blob/main/spike/REPORT.md)
("report") and the
[ordering report](https://github.com/generalbusiness-ai/dap-spike/blob/main/spike/ORDERING-REPORT.md).

### 3.1 Versioning rules and invariant 7

The design's nine versioning rules (lines 606 to 621), and how a
successor scope meets each one:

| Rule | Text, shortened | Successor scope |
|---|---|---|
| 1 | Old events never change meaning. | The old scope's journal is unchanged and replays under its own pin. |
| 2 | Upgrades activate at an exact ordered boundary. | The boundary is the old scope's cutoff entry. The new scope's genesis names it by position and hash. |
| 3 | Event kinds are immutable contracts. | A new act exists only in the new definition. An old act keeps its meaning in the old scope. |
| 4 | Migration is explicit, deterministic and pinned at the boundary. | The mapping is data. Its digest is in the successor's seed, so the successor's ID commits to it. |
| 5 | Large discontinuities can create a new context. | Succession makes this the normal case. |
| 6 | Presentation versions are independent. | A new presentation needs no succession (self-contained applications, decision 1). |
| 7 | Grants pin exact capability ids. A newer package never silently enlarges authority. | Grants come from the room's rules activation under review. A mapping carries no grant. |
| 8 | Signed attempts keep their expected binding. | An act signed for the old scope and sent after the boundary is refused `succeeded`. It is never retargeted. |
| 9 | Replay retains the complete closure. | The successor's replay needs the cutoff entry, and the cutoff entry's judgment needs the successor definition and the mapping. Both are pinned by digest. |

Invariant 7 (design, lines 796 to 797): "Semantic changes are explicit
ordered events and never reinterpret history." A succession is two such
events: the cutoff entry in the old scope, and the genesis in the new one.

Section 3 of the design (lines 490 to 501) defines the stale-binding
rule: an intent signed against a binding that is no longer active at its
position is ineffective with `stale_binding`, never rewritten. In dap the
binding of an act is its scope. After the cutoff entry, no act for the old
scope can take effect, so the rule holds without a per-kind binding
identity. A reader that cannot fetch a package pauses, and a pause is
never a verdict (design, lines 204 to 206 and 506 to 508). In dap, replay
of a successor without the mapping or the old journal reports what it
lacks. It does not guess.

### 3.2 What the spike did not show

The spike never moved existing state into a new model.

- Its attach adds models. A second definition under a model name already
  in use is refused (`spike/src/descriptor.ts:294-301`), and only new
  models are initialized (`spike/src/foundation.ts:589`). A model has
  `init` and no migrate entry point (`spike/src/descriptor.ts:77-107`).
- The report says: "It is not a demonstration of general state migration
  or of composing arbitrary models" (report, line 33). The planned
  migration spike was not run (technology spikes plan, line 124).
- The binding-locality cases (report, lines 293 to 301) show that an
  unrelated attach leaves a saved intent effective, a relevant attach makes
  the next saved intent `stale_binding`, and a fresh intent succeeds. In
  every case the relevant change adds a second handler. No case replaces a
  model.
- The design calls an attach atomic. The code installs the new environment
  before it initializes the models, and a failing initializer leaves the
  package installed (technology spikes plan, line 124).

The executed result closest to a successor scope is the ordering spike's
split: a destination genesis pins a transformation of an exact export of
the source (ordering report, lines 119 to 142; ordering note, lines 340 to
348). There the transformation was copy, union and duplicate rejection
only.

### 3.3 Authoring cost

The spike's budget was at most two fixes and one added kind for each
cross-partition constraint (one series, many views, lines 375 to 376). The
Sale model needed seven recorded fixes, six of them semantic, and was over
budget (report, line 76). Every repair was about who can read what, and so
who can judge what, not about the business rule (authoring language
directions, lines 36 to 38). No author wrote a later package that refines
an existing kind (same note, lines 700 to 701). A migration is one more
thing an author writes, and section 14 budgets it.

## 4. Three shapes, and the choice

### 4.1 Successor scope

A new scope under the new definition. Its genesis names the old scope's
cutoff entry, and its items come from that entry through a declared
mapping. The old scope ends in a retired state and refuses later acts with
a reason that names the successor.

It keeps "one scope, one definition", and it keeps replay as it is: each
journal replays under its own pin. It costs a new scope reference that
every holder must learn, new copy keys for any scope that receives from it,
and a decision about how a name moves.

### 4.2 Redefinition entry in the same scope

A new entry kind pins a new definition from the next position, with the
item migration in the same entry. Replay uses the definition in force at
each position. This is the spike's attach.

It keeps the scope reference, the items and the peers. It costs a change
to every place that assumes one definition per scope. The scope ID is the
digest of a seed that holds the definition, so the ID would stop naming
the definition. The judge, the fold, the receipt (`entry.ts:170`), the
summary (`read.ts:69`), replay (`verify.ts:941`), the 26 call lines of
`pinnedBy` and `pinnedOf` in `packages/platform/src`, and the reads of
`seed.definition` in 34 source files under `packages/` would each need a
definition per position (counts by `grep` at main `c40492ee`). The spike's
evidence for this shape covers only added handlers (section 3.2).

### 4.3 Small, short-lived scopes under one name

Keep pin-for-life, keep scopes small, and treat a long-lived application
as a series of scopes under one stable name. The Grow site creates rooms
this way. The spike states this as its thesis (design, lines 61 to 62), but
it implemented no anchor across contexts (design, lines 137 to 139).

It needs no new kernel form. It does not answer the question: each new
scope starts empty, and something must still say how the state of the last
one reaches the next.

### 4.4 Decision

The successor scope (4.1). Four reasons.

1. It keeps the kernel's one-definition rule, and so it keeps every
   statement and code path in section 4.2 as it is.
2. It meets the spike's nine rules and invariant 7 without a per-position
   definition (section 3.1).
3. Its one new mechanism, a pinned mapping of an exact final state, is the
   spike's closest executed result (section 3.2). The redefinition entry
   rests on design text that the spike did not test.
4. Self-contained applications decision 4 already chose new scopes and
   carry-forward until change inside a running scope exists.

The redefinition entry stays research. It is milestone M4 of the
self-contained applications note, and this note files no slice for it.
Shape 4.3 contributes one part: the stable name (section 11).

## 5. A succession, step by step

Terms:

- **Predecessor**: the scope that ends.
- **Successor**: the scope that starts from it.
- **Cutoff entry**: the predecessor's entry for `retire`. The predecessor's
  items never change after it (section 7).
- **Export**: the predecessor's live items at the cutoff entry, in
  canonical form, ordered by item ID.
- **Mapping**: data that turns an export under the old definition into
  items under the new definition (section 6).
- **ID table**: the pairs of old item ID and new item ID (section 6).
- **Successor package**: an application package with the new definition
  and the mapping. Its `predecessor` field names the old package. The new
  definition keeps the old definition's `name`.

Steps:

1. **Author.** The author writes the successor package. `dap check
   --predecessor <old package>` checks the mapping against both definitions
   (section 6).
2. **Activate.** A person with `rules.activate` activates the successor
   definition in the room's rules scope. The activation records the
   predecessor definition digest and the mapping digest from the package.
   Activation needs the package's bytes in the host's store, so every later
   step finds them.
3. **Request.** A member with `application.succeed` signs `succeed` on the
   directory's application item and names the activation. The directory
   checks that the item is `created`, that its definition is the
   activation's predecessor, and that no succession is open for it. The
   item moves to `succeeding`, and the directory sends `retire` to the
   application's scope, with the successor definition digest and the
   mapping digest.
4. **Cutoff.** The predecessor judges `retire`. It accepts `retire` only
   from its recorded creator (the seed's `creator`). It checks that no work
   is in flight (section 8) and that the mapping admits its export: every
   mapped item is valid under the successor definition, within its limits.
   If both hold, the entry is the cutoff entry. It records the export and
   its digest, the successor definition digest, the mapping digest, the
   creator, and the status `retired`. It sends its result to the directory.
5. **Creation.** The directory records the result in one entry, D. D moves
   the application item to `creating-successor`, records the successor seed
   digest in the item, and sends `create` with the successor seed (section
   5.1). The directory refuses any second `create` for a cutoff that an
   item already records.
6. **Genesis.** The successor's genesis checks the creation proof and the
   predecessor (section 5.2). It opens no item.
7. **Carry.** The successor writes one `carry` entry for each item of the
   export, in export order, at positions 1 to n (section 6). Each opens one
   item. Until the last one, the successor refuses acts with `activating`,
   and its timed rules wait. Its result goes to the directory after the
   last carry entry.
8. **Name and forward.** The directory records the successor's result. The
   application item returns to `created`, with the successor's scope
   reference and definition, and its list of earlier scopes gains the
   predecessor. The same directory entry sends `forward` to the
   predecessor, with the successor's full scope reference. The predecessor
   records it, and its refusals name the successor from then on.

Between steps 4 and 7 no scope of the application accepts an act. This is
the self-contained note's "pending handoff": a right is unavailable, not
lost, and at most one scope can exercise it.

The genesis reads the cutoff entry as a fact: one immutable entry, by
position and hash. It reads no present state of another scope, so the
contract's D5-5 holds
([scope contract](2026-10-04-scope-and-replay-contract.md), line 2050).

### 5.1 Successor seed

The seed has the fields that every seed has (`packages/contract/src/scope.ts:44-51`),
and two more:

| Field | Value |
|---|---|
| `kind` | The predecessor's kind. |
| `definition` | The successor definition digest that the cutoff entry names. |
| `creator` | The directory: the creator that the cutoff entry names. |
| `cause` | The cause that the creation proof derives from D, as for any creation (`packages/derive/src/genesis.ts:145`). |
| `ordinal` | The position of the `create` send in D. |
| `predecessor` | The fact reference of the cutoff entry: scope, incarnation, position and hash. |
| `mapping` | The mapping digest that the cutoff entry names. |

The successor's ID is the digest of this seed. D is written after the
cutoff entry, so the seed can name the cutoff entry without a cycle. The
cutoff entry does not name the successor. The `forward` entry of step 8
names it later.

### 5.2 One successor for each cutoff

The succession genesis runs the ordinary creation proof
(`packages/derive/src/genesis.ts:139-145`): the seed's creator sent
`create` with exactly this seed at its ordinal, and the seed's cause is
that sending entry. Then it checks three things against the cutoff entry:
that it is a cutoff entry, that its creator equals the seed's creator, and
that its successor definition and mapping digest equal the seed's. A
mismatch is refused `predecessor-mismatch`.

So exactly one seed passes for each cutoff:

- Another creator has no cutoff entry that names it, so its seed fails the
  creator check.
- Another cause or ordinal has no matching `create` send, so it fails the
  creation proof.
- The directory sends `create` once for each cutoff. Its application item
  records the seed digest at D and refuses a second `create` for the same
  cutoff.
- A retry after a crash resends D's `create` with the same seed, so it
  names the same scope.

The forward read of section 11 and replay of section 12 both use this one
construction.

### 5.3 What the genesis can refuse

The succession genesis replaces the ordinary genesis path. It runs no
genesis act of the successor definition, and so no genesis guards, effects
or sends of that definition. Its checks are the creation proof and the
three checks of section 5.2. A new item type of the successor definition
starts empty; a later act opens its items.

For the seed that the directory sends, each check holds by construction:

- The creation proof holds, because D sent that seed.
- The cutoff checks hold, because D copied the seed's fields from the
  cutoff entry.
- The carry entries apply the same mapping to the same export that the
  cutoff entry admitted, under the same definition, so they hold too.

So the intended successor's genesis and carry entries fail only for a
temporary reason: a host or storage failure, or a dependency that is
briefly unavailable. Those answer `unavailable`, never a refusal, and the
directory's dispatcher repeats the same `create`. Only a seed that the
directory did not send can be refused, and refusing it touches neither the
predecessor nor the application item. A retired application cannot be left
without its successor by a permanent refusal.

A mapping that fails is refused at the cutoff, with `mapping-refused`. The
predecessor then stays active, with its definition and state as they were.
This closes the spike's atomicity gap (section 3.2).

## 6. Mapping and item identity

A mapping is data, like the definition. It is not code and holds no
expression.

```json
{
  "v": 1,
  "predecessor": "sha256:<old definition digest>",
  "items": {
    "participant": { "to": "participant", "states": { "inactive": "standby" } }
  },
  "defaults": {},
  "drop": []
}
```

Rules:

1. **Total.** Every item type of the old definition is mapped or named in
   `drop`. For a mapped type, every non-final state, value slot, reference
   slot and party slot is mapped, or it maps to the same name in the new
   definition. A name that exists in both definitions maps to itself unless
   the mapping says otherwise.
2. **Typed.** A target type, state or slot exists in the new definition. A
   value's type and bounds are the same in both definitions, or the new
   bounds are wider. A new required slot has a default in `defaults`.
3. **Live items only.** The export holds live items. Final items stay in
   the predecessor, readable there.
4. **Deterministic.** The same export, mapping and definition always give
   the same items.
5. **Within bounds.** The mapped items fit the new definition's limits for
   each type. An export above the carry limit is refused
   `succession-too-large` until paged carry exists (slice S6).

### 6.1 Item identity

An item's ID is the position of the entry that opened it, and an entry
opens at most one item (scope contract, lines 3276 to 3283;
`packages/derive/src/fold.ts:108-110`). The successor keeps that rule:

- **One carry entry for each item.** Carry entry k, at position k, opens
  the k-th item of the export, so its new ID is k. Positions 1 to n hold
  the carried items, and the first act after activation opens at n + 1 or
  later. A new item never takes the ID of a carried one.
- **ID table.** The pairs (old ID, new ID) follow from the export order.
  The genesis records the table's digest, and each carry entry records its
  own pair.
- **Origin.** Each carried item records its origin: the fact reference of
  its opening entry in the predecessor. The item's `opened` is the hash of
  its carry entry, as for any item. A reader goes from a carried item to
  its history in the predecessor through its origin.
- **Item references.** A reference slot of type `item` holds a local ID.
  The carry entry rewrites it through the ID table. A reference to an item
  that the export does not carry, such as a final item, is refused at the
  cutoff with `mapping-refused`, unless the mapping clears it.
- **Fact references.** A reference slot of type `fact` keeps its value.
  It names an entry of the predecessor, and the predecessor stays readable.
  The successor definition keeps the old definition's `name`, so an
  `under` check on such a fact still passes
  (`packages/derive/src/delivery.ts:273`).
- **Outside names.** Outside its scope an item is named by the fact
  reference of its opening entry. A carried item has a new fact reference,
  its carry entry. A client that held the old one finds the new one
  through the ID table or the origin.

`dap check --predecessor` writes the identity part of the mapping and lists
each choice the author must make: a renamed state, a renamed slot, a new
required slot with no default, a type that is gone, and an item reference
that can name a final item. The author writes only those choices.

## 7. Journal after the cutoff

A refused delivery is an entry (scope contract, line 3427, and D1-7). So
the cutoff entry is not the predecessor's last entry. The rule:

- **Two kinds of entry after the cutoff.** A refused delivery, with the
  reason `succeeded` and no effect, and the one `forward` entry of step 8.
  The `forward` entry records the successor's reference and changes no
  item. The
  predecessor writes nothing else: no act takes effect, no timed rule runs,
  and no operation is open (section 8).
- **State is fixed.** The items and the state digest after any later entry
  equal those at the cutoff entry. Replay checks this.
- **Repeats.** A repeat of a delivery that was already refused is answered
  from its inbox row, with no new entry
  ([journal floor](2026-10-20-retained-journal-floor.md), section 6.6).
  Each new delivery writes one refused entry.
- **Capacity.** The scope's entry bound applies as for any scope. A floor
  can pass the refusal entries after the cutoff; the genesis and the cutoff
  entry are kept below any floor.
- **Archive.** Archive passes continue over the refusal entries and the
  `forward` entry, as over any entries. The export is fixed at the cutoff
  entry.

## 8. Work in flight at the boundary

**Quiet first.** `retire` is refused `succession-busy` while the
predecessor has any of these, and the refusal gives each count:

- a send with no result or acknowledgement;
- an outside operation that is pending or has an unknown outcome, under any
  capability (`hold@1`, `git-read@1`, `device-command@1`);
- a request it has received and not yet answered;
- a retained-file transfer with a live lease.

An outside operation with an unknown outcome stays with the scope that
opened it and is never reissued by the successor. To reach a quiet state,
the owner uses the application's own acts, for example the Counter's
`pause`. A kernel act that stops new work while pending work settles is a
later choice, not part of this design.

**Holds and duties in items** are state, and they carry. A pledged Counter
promise is an item in state `pledged`. The mapping carries it, with its
`until` value.

**Acts after the cutoff.** An act signed for the predecessor and sent after
its cutoff entry is refused `succeeded`. After the `forward` entry, the
refusal names the successor's scope reference; before it, it names the
application's directory item. An act is never retargeted to the successor.
The client signs a new act for the successor. A refusal of an act writes
no entry, as today. The predecessor's accepted-key table stays with the
predecessor: an exact retry of an act accepted before the cutoff is
answered as today.

**Acts during carry.** An act sent to the successor before its last carry
entry is refused `activating`.

**Deliveries after the cutoff** follow section 7. The sender's own rules
decide what it does next.

**Deadlines.** A deadline is a value in an item, and the carry entry keeps
it. The successor's timed rules see it from the end of activation. A
deadline that passes during the handoff fires at the successor's first
timed drain, as a late alarm does today.

**Retained inputs** stay with the predecessor. A mapped value that refers to
one keeps its fact reference. No bytes are copied.

## 9. Connections between scopes

A receiver that pins a sender's definition refuses a successor with
`wrong-pin`, because the successor's definition has another digest. A
receiver keys the copies it holds by the sender's scope and incarnation
(`packages/derive/src/state.ts:455`), and the static fan-in proof keys by
the sender's definition digest (`packages/package-graph/src/check.ts:146`).
So a successor is a new sender to every receiver.

The fix is a lineage, built in slice S5:

- A receive type can name `lineage` instead of one `pin`: the definition
  digest at the root of the lineage. A delivery passes if the sender's
  definition is that digest, or if the sender's seed names a cutoff entry
  whose scope passes the same test and whose cutoff entry names the
  sender's definition. Each step reads one immutable entry, and a lineage
  has at most 8 steps.
- Copy keys use the lineage root's scope and incarnation, so a successor
  continues its predecessor's keys and counts.
- The static fan-in proof keys by the lineage root digest.

Until S5 lands, the directory refuses `succeed` with `succession-peers` for
an application whose definition receives from another scope or sends to a
scope other than its creator. The Counter does neither, so slice S1 needs
no lineage.

## 10. Views and packages

- The predecessor keeps its installation record and its package pin. A
  room keeps an application definition's bytes as a retained input, and
  the archive copies them, so replay never reads a definition from the
  tree ([history note](2026-10-20-history-out-of-the-readable-tree.md),
  section 2.4, lines 119 to 123). The predecessor's views stay readable, as
  a finished record.
- The successor's installation pins the successor package. Its views read
  the carried items.
- The page shows the current scope and a link to the earlier record. One
  view of the whole lineage is a later slice (S7).
- A change of presentation alone needs no succession.

## 11. Names and scope URIs

The application's name is the directory's application item. It stays the
same across a succession. Its scope reference and its definition move
together in one ordered directory entry (step 8), and its list of earlier
scopes keeps the old references. `dap apps` and every lookup by name
resolve to the current scope.

A scope URI must resolve (direction `9626787f`). A retired scope's URI
resolves to its record: the journal, the items and the cutoff entry. Its
reads report the status `retired`. After its `forward` entry they also give
the successor's scope reference, as that entry records it.

The collections note's R-GEN-13 ("a registry binding never moves")
belongs to the earlier room model. In this model a name moves only by an
ordered directory entry, and the earlier binding stays in the record.

## 12. Replay, the verifier and the archive

- **Predecessor.** It replays under its own pin. The cutoff entry's
  judgment checks the mapping, so its closure holds the successor
  definition and the mapping, pinned by digest (rule 9). After the cutoff,
  replay checks section 7: only refused deliveries and one `forward` entry,
  and a fixed state digest.
- **Successor.** Its genesis cites the cutoff entry by fact reference. The
  verifier reads that entry by hash, as it reads the source of a delivery.
  It checks the creation proof and section 5.2, and it derives each carry
  entry again from the export, the mapping and the ID table. The cutoff
  entry itself is proven by replay of the predecessor, or taken as an
  anchor (scope contract, D1-6).
- **Link.** The successor's seed names the cutoff entry; the cutoff entry
  names the successor's definition, mapping digest and creator; the seed's
  cause is the directory entry that sent `create`; the successor's ID is
  the digest of its seed; the predecessor's `forward` entry names that
  successor.
- **Archive.** The room's archive binding covers both journals. The
  successor's archive passes list the cutoff entry as a foreign source, as
  slice S2b does for deliveries. Offline replay of the successor needs the
  predecessor's journal from the archive, or an anchor at the cutoff
  entry.

## 13. Retirement

Retirement becomes a status of every scope, beside `provisional`, `active`
and `refused` (`packages/contract/src/read.ts:38`).

- **Kernel act.** `retire` is a kernel delivery from the scope's recorded
  creator. With a successor, it writes the cutoff entry of section 5.
  Without a successor, it writes the same kind of entry with no export, and
  section 7 applies with the reason `retired`. Reads, replay and the
  archive continue. The scope URI resolves with the status `retired`.
- **Scopes it covers.** The mechanism is the kernel's. This design enables
  it for scopes that a directory creates: applications and lanes. Retiring
  a platform scope (register, directory, membership, rules, destination,
  inbox) changes the room itself and needs its own design. The kernel
  boundary page lists it.
- **Packages.** The rules scope's `retire-definition` stops new scopes of a
  definition and leaves existing scopes running. This design documents it.
  A retired package stays in the host's store while any scope pins it.
- **Fan-in.** Retiring a scope changes no item state and removes no copy.
  Copy counts never fall (`packages/derive/src/state.ts:419-424`). So a
  retired scope frees no fan-in slot, and the packages note's fan-in proof
  is unchanged. The packages note's `fan-in-unproved` case (lines 263 to
  264) is a different thing: an item of a room type that gains a `retire`
  act into a final state. It stays as it is.

## 14. Authoring budget

The mapping is data, and `dap check --predecessor` writes its identity
part. The author writes only the choices in section 6.

Budget for slice S1, measured and reported in its implementation note the
way the spike recorded fixes (report, lines 76 to 78):

- the authored part of the Counter mapping is at most 12 lines;
- at most 2 failed `dap check` runs before it passes;
- no semantic repair after the fixture first runs.

The budget is lower than the spike's because a mapping changes no audience
and no grant. The spike's repairs were about who can read what (section
3.3). Grants come from the rules activation, under review.

## 15. Statements that change

The slices change these with their code. This note changes only the
roadmap.

| Where | Today | After |
|---|---|---|
| [architecture](../docs/architecture.md), lines 21 to 23 | A scope pins one definition for as long as it exists. | Unchanged, and: an application moves to a new definition by succession. |
| [what dap is](../docs/what-is-dap.md), lines 35 and 36 | Pins one definition and keeps it for life. | The same addition. |
| [scopes](../docs/scopes.md), lines 81 to 85 and 268 to 269 | Pin for life; `VERSIONS` cited in `index.ts`. | Add `retired`, `retire`, the cutoff entry, carry entries and `forward`; correct the citation to `native-catalog.ts`. |
| [write an application](../docs/write-an-application.md), lines 114 to 117 and 364 | Existing lanes keep the digest they pinned. | How to ship a successor package and its mapping. |
| [roadmap](../docs/roadmap.md), lines 48 and 49, the row at line 72, and lines 305 and 306 | Not designed. | Designed in this note; changed by this head. |
| [packages note](2026-10-18-application-packages-and-builder-room.md), section 2, lines 116 to 118 | A new version reaches rooms by a successor package, never by propagation. | Unchanged; a successor package moves a scope only by an explicit succession. |
| [packages note](2026-10-18-application-packages-and-builder-room.md), section 6, item 6 | A successor package carries forward (M3). | Defined here. |
| [self-contained applications](2026-10-15-self-contained-applications.md), gap 10 and M3 | Carry-forward is not built. | This note is M3's design. M4 stays research. |
| [scope contract](2026-10-04-scope-and-replay-contract.md), D5-1 | Migration of a live scope is not designed. | A live scope never changes definition. Succession moves an application. |
| Scope contract, section 4.1 (lines 3276 to 3283) | One new item for each entry; an item's ID is its opening position. | Unchanged. A carry entry is one more kind of entry that opens one item. |
| `packages/contract/src/scope.ts` (`Seed`) | No predecessor. | Optional `predecessor` and `mapping`. |
| `packages/contract/src/entry.ts` | No retire, carry or forward input. | Inputs `retire`, `carry` and `forward`. |
| `packages/contract/src/read.ts` (`Item`, `Status`) | No origin; three statuses. | `Item.origin`; the status `retired`. |
| `packages/contract/src/result.ts` | No succession codes. | `succeeded`, `retired`, `activating`, `succession-busy`, `succession-too-large`, `succession-peers`, `mapping-refused`, `predecessor-mismatch`. |
| `packages/derive/src/genesis.ts`, `fold.ts` | Ordinary genesis only; opens at the entry's position. | The succession genesis path; the carry open, with the ID table and origin. |
| `packages/replay/src/verify.ts` | One definition for each history; no link. | The cutoff, carry and forward checks and the link of section 12. |
| [Counter README](../apps/counter/README.md), line 202 | No scope moves from one definition to the other. | The Counter's succession. |

## 16. Slices

Listed in order and not filed.

| Slice | Content | Done when |
|---|---|---|
| S1 | The Counter fixture on the test host: kernel `retire` with a successor, the cutoff entry with its export and mapping check, the journal rule after the cutoff, the successor seed and genesis, carry entries with the ID table and origins, `forward`, the rules activation fields, the directory's `succeed`, the reason codes and the status, reads of a retired scope, replay of both journals and the link, and `dap check --predecessor`. | The witnesses below pass, and the authoring cost is recorded against section 14. |
| S2 | Tools: `dap app succeed [--dry-run]`, the MCP tool, the page's link to the earlier record, and the documents in section 15. | A person upgrades an installed Counter from the CLI and from a chat. |
| S3 | Retirement without a successor for scopes a directory creates, and `dap app retire`. | A retired application refuses acts with `retired` and stays readable. |
| S4 | Archive and offline replay across a succession. | A clone replays both journals and checks the link. |
| S5 | Lineage for connected scopes (section 9). | A lending library and a Grow room each succeed with their peers. |
| S6 | Paged carry for large scopes. | A scope above the carry limit succeeds. |
| S7 | One view of a lineage's history. | The page shows both records as one history. |

S1 witnesses. The Counter's successor definition keeps the name
`counting-commitments`, renames the participant state `inactive` to
`standby`, and adds `retarget`, a controller act on `configuration` that
sets `target` between 1 and 100.

1. **Cutoff.** A Counter with three participants (one `inactive`, two
   `active`), an open board whose `pledge` names a pledged promise due two
   minutes later. `retire` writes a cutoff entry with its export.
2. **Carry.** The successor's genesis opens no item. Carry entries 1 to n
   open the carried items, so several old nonzero IDs become new IDs. The
   `inactive` participant is `standby`. The promise is `pledged` with the
   same `until`. The board's `pledge` names the promise's new ID. Each
   carried item's origin names its opening entry in the predecessor.
3. **No collision.** After activation, `participate` opens a new
   participant at the next position, and no ID collides.
4. **Replay.** Both journals replay. The link checks of section 12 pass,
   and the verifier derives each carry entry again.
5. **Stale act.** A `fulfill` signed for the predecessor and sent after the
   cutoff is refused `succeeded`; after `forward`, the refusal names the
   successor. The same act signed for the successor, with the new ID, is
   accepted. An act sent to the successor during carry is refused
   `activating`.
6. **New act.** `retarget` is accepted in the successor. `retarget` sent to
   the predecessor before its cutoff is refused `unknown-act`.
7. **Deadline.** The promise's deadline passes during the handoff, and the
   successor's first timed drain after activation expires it.
8. **Late delivery.** A delivery to the predecessor after the cutoff is
   recorded refused `succeeded`. Its repeat is answered from the inbox row
   with no new entry. Replay finds the state digest unchanged after the
   cutoff.
9. **URI.** The predecessor's URI resolves. Its reads report `retired`
   and, after `forward`, the successor's reference. Its journal reads as
   before.
10. **One successor.** A genesis whose seed names another creator is
    refused `predecessor-mismatch`. A seed with another cause or ordinal
    fails the creation proof. The directory refuses a second `create` for
    the same cutoff. A host failure between the cutoff entry and the
    genesis ends, after the repeat, in the same successor scope ID.
11. **Mapping.** A mapping that leaves `inactive` unmapped fails `dap
    check`. A mapping whose result the new definition refuses makes
    `retire` fail with `mapping-refused`, and the predecessor stays active.
    A genesis that cites an entry other than a cutoff entry, or another
    mapping digest, is refused `predecessor-mismatch`.
12. **Busy.** A predecessor with a send that has no result refuses `retire`
    with `succession-busy` and the count. (The Counter sends nothing, so
    this witness uses a test definition.)
