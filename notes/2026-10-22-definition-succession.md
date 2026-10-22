# Definition succession

Design note, draft 1, for request `95d01d30`. Proposed: nothing here is
built.

A Counter has run in a room for four months. It holds sixteen
participants, a board and a pledged promise that is due on Friday. Its
owner wants one more act, to change the target, and a clearer name for a
participant who is not taking part. Today the Counter's scope can never
take a new definition. This note says how the Counter, and any long-lived
application, moves to a new definition and keeps the meaning of what it
has already recorded.

The answer is a successor scope. The old scope ends with one final entry.
A new scope, under the new definition, starts from that entry. Its genesis
names the entry and derives its items from it through a mapping, and the
mapping is data. The application's name moves to the new scope. The old
scope stays readable and replayable, and it refuses new acts with a reason
that names its successor.

Source baseline: main `c40492ee` and dap-spike main `9d738e2e`. dap-spike
references give the path and line numbers.

## 1. Principle

A scope's definition never changes, and its history is never
reinterpreted. An application moves to a new definition only by
succession: an ordered final entry in the old scope, and a new scope whose
genesis names that entry and derives its state from it by a mapping that
is data.

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
  ([directory partitions](2026-10-15-directory-partitions.md), lines 57 to
  61). This is the nearest precedent for a handoff between two scopes.
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
| 2 | Upgrades activate at an exact ordered boundary. | The boundary is the old scope's final entry. The new scope's genesis names it by position and hash. |
| 3 | Event kinds are immutable contracts. | A new act exists only in the new definition. An old act keeps its meaning in the old scope. |
| 4 | Migration is explicit, deterministic and pinned at the boundary. | The mapping is data. Its digest is in the successor's seed, so the successor's ID commits to it. |
| 5 | Large discontinuities can create a new context. | Succession makes this the normal case. |
| 6 | Presentation versions are independent. | A new presentation needs no succession (self-contained applications, decision 1). |
| 7 | Grants pin exact capability ids. A newer package never silently enlarges authority. | Grants come from the room's rules activation under review. A mapping carries no grant. |
| 8 | Signed attempts keep their expected binding. | An act signed for the old scope and sent after the boundary is refused `succeeded`. It is never retargeted. |
| 9 | Replay retains the complete closure. | The successor's replay needs the final entry, and the final entry's judgment needs the successor definition and the mapping. Both are pinned by digest. |

Invariant 7 (design, lines 796 to 797): "Semantic changes are explicit
ordered events and never reinterpret history." A succession is two such
events: the final entry in the old scope, and the genesis in the new one.

Section 3 of the design (lines 490 to 501) defines the stale-binding
rule: an intent signed against a binding that is no longer active at its
position is ineffective with `stale_binding`, never rewritten. In dap the
binding of an act is its scope. After the final entry, no act for the old
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
final entry and derives its items from that entry through a declared
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
- **Final entry**: the predecessor's last entry, written by `retire`.
- **Export**: the predecessor's live items at the final entry, in
  canonical form, with the next item ID of each type.
- **Mapping**: data that turns an export under the old definition into
  items under the new definition (section 6).
- **Successor package**: an application package with the new definition
  and the mapping. Its `predecessor` field names the old package.

Steps:

1. **Author.** The author writes the successor package. `dap check
   --predecessor <old package>` checks the mapping against both definitions
   (section 6).
2. **Activate.** A person with `rules.activate` activates the successor
   definition in the room's rules scope. The activation records the
   predecessor definition digest and the mapping digest from the package.
3. **Request.** A member with `application.succeed` signs `succeed` on the
   directory's application item and names the activation. The directory
   checks that the item is `created`, that its definition is the
   activation's predecessor, and that no succession is open for it. The
   item moves to `succeeding`, and the directory sends `retire` to the
   application's scope, with the successor definition digest and the
   mapping digest.
4. **Final entry.** The predecessor judges `retire`. It accepts `retire`
   only from its recorded creator (the seed's `creator`). It checks that no
   work is in flight (section 8) and that the mapping admits its export
   (below). If both hold, the entry is the final entry. It records the
   export and its digest, the successor definition and the mapping digest,
   and the status `retired`. It sends its result to the directory. From
   then on the scope accepts no act and no delivery that changes state.
   Reads continue.
5. **Genesis.** The directory creates the successor. Its seed holds the
   successor definition, the creator, a fact reference to the final entry
   (scope, incarnation, position, hash) and the mapping digest. The
   successor's ID is the digest of that seed, so it commits to the exact
   final entry and mapping. The genesis reads the final entry by its fact
   reference, checks it, applies the mapping to its export, and opens each
   mapped item as a genesis effect.
6. **Name.** The directory records the successor's result. The application
   item returns to `created`, with the successor's scope reference and
   definition. Its list of earlier scopes gains the predecessor. One
   directory entry moves the name.

The predecessor applies the same mapping check that the successor's genesis
applies. Both are deterministic functions of the export, the mapping and
the successor definition. So a final entry is accepted only if the
successor's genesis will be accepted. A mapping that fails leaves the
predecessor active, with its definition and state as they were. This
closes the spike's atomicity gap (section 3.2). If the host fails between
steps 4 and 5, the directory creates the successor again. The seed is
fixed, so the second attempt names the same scope.

The genesis reads the final entry as a fact: one immutable entry, by
position and hash. It reads no present state of another scope, so the
contract's D5-5 holds
([scope contract](2026-10-04-scope-and-replay-contract.md), line 2050).

Between steps 4 and 5 no scope of the application accepts an act. This is
the self-contained note's "pending handoff": a right is unavailable, not
lost, and at most one scope can exercise it.

## 6. Mapping

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
4. **IDs kept.** A mapped item keeps its ID. The successor's next ID for
   each type is the export's next ID, so a new item never reuses the ID of
   a final item in the predecessor.
5. **Fact references kept.** A reference slot that holds a fact reference
   into the predecessor keeps it. The predecessor stays readable, so the
   reference keeps its meaning.
6. **Deterministic.** The same export, mapping and definition always give
   the same items.
7. **Within bounds.** The mapped items fit the new definition's limits for
   each type. An export above the genesis size limit is refused
   `succession-too-large` until paged activation exists (slice S6).

`dap check --predecessor` writes the identity part and lists each choice
the author must make: a renamed state, a renamed slot, a new required slot
with no default, and a type that is gone. The author writes only those
choices. The successor package carries the mapping, and its `predecessor`
field names the old package.

## 7. Who starts a succession

Taking a new definition is a decision of the room under its own policy,
as in the collections note's C-3. An agent can propose it and cannot skip
review.

- **Activation** is a rules act. It needs `rules.activate`. Agents hold no
  `rules.activate`, so an agent can propose a successor package in a change
  lane and cannot activate it.
- **The request** is an act in the room's directory, on the application's
  item. It needs the new grant `application.succeed`. The role defaults
  give it to `admin` only.
- **The final entry** is judged by the predecessor itself, under its own
  definition and the kernel's `retire` rule. It accepts `retire` only from
  its creator.

So both are needed: an activation in the room's rules, and a request in
the room's directory, judged at the end by the scope that ends. No act in
the predecessor's own definition can start it. The kernel owns `retire`, so
an application author cannot forget it or make it unsafe.

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

**Acts after the final entry.** An act signed for the predecessor and sent
after its final entry is refused `succeeded`, and the refusal names the
successor's scope ID. It is never retargeted to the successor. The client
signs a new act for the successor. The predecessor's accepted-key table
stays with the predecessor: an exact retry of an act accepted before the
final entry is answered as today, and a new key is refused `succeeded`.

**Deliveries after the final entry.** A delivery to the predecessor after
its final entry is refused `succeeded`, with the successor's scope ID, and
the refusal is recorded as every refused delivery is (scope contract,
D1-7). The sender's own rules decide what it does next.

**Deadlines.** A deadline is a value in an item, and the mapping carries
it. The successor's timed rules see it from genesis. A deadline that
passes during the handoff fires at the successor's first timed drain, as a
late alarm does today.

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
  definition is that digest, or if the sender's genesis cites a final entry
  whose scope passes the same test and whose final entry names the sender's
  definition. Each step reads one immutable entry, and a lineage has at
  most 8 steps.
- Copy keys use the lineage root's scope and incarnation, so a successor
  continues its predecessor's keys and counts.
- The static fan-in proof keys by the lineage root digest.

Until S5 lands, the directory refuses `succeed` with `succession-peers` for
an application whose definition receives from another scope or sends to a
scope other than its creator. The Counter does neither, so slice S1 needs
no lineage.

## 10. Views and packages

- The predecessor keeps its installation record and its package pin. The
  history note's cohorts keep a package version readable while any scope
  pins it ([history note](2026-10-20-history-out-of-the-readable-tree.md),
  lines 52 to 69). The predecessor's views stay readable, as a finished
  record.
- The successor's installation pins the successor package. Its views read
  the mapped items.
- The page shows the current scope and a link to the earlier record. One
  view of the whole lineage is a later slice (S7).
- A change of presentation alone needs no succession.

## 11. Names and scope URIs

The application's name is the directory's application item. It stays the
same across a succession. Its scope reference and its definition move
together in one ordered directory entry, and its list of earlier scopes
keeps the old references. `dap apps` and every lookup by name resolve to
the current scope.

A scope URI must resolve (direction `9626787f`). A retired scope's URI
resolves to its record: the journal, the items and the final entry. Its
reads report the status `retired`. For a succession they also give the
successor's scope ID, computed from the final entry, the successor
definition, the mapping digest and the creator.

The collections note's R-GEN-13 ("a registry binding never moves")
belongs to the earlier room model. In this model a name moves only by an
ordered directory entry, and the earlier binding stays in the record.

## 12. Replay, the verifier and the archive

- **Predecessor.** It replays under its own pin, through the final entry.
  The final entry's judgment checks the mapping, so its closure holds the
  successor definition and the mapping, pinned by digest (rule 9).
- **Successor.** Its genesis cites the final entry by fact reference. The
  verifier reads that entry by hash, as it reads the source of a delivery,
  applies the mapping to the export in the entry, and compares the result
  with the genesis effects. The final entry itself is proven by replay of
  the predecessor, or taken as an anchor (scope contract, D1-6).
- **Link.** Three checks: the successor's seed names the final entry; the
  final entry names the successor's definition and mapping digest; the
  successor's ID is the digest of its seed.
- **Archive.** The room's archive binding covers both journals. The
  successor's archive passes list the final entry as a foreign source, as
  slice S2b does for deliveries. Offline replay of the successor needs the
  predecessor's journal from the archive, or an anchor at the final entry.
- **Floor.** A retired scope writes no further entries. Its genesis and its
  final entry are kept below any floor.

## 13. Retirement

Retirement becomes a status of every scope, beside `provisional`, `active`
and `refused` (`packages/contract/src/read.ts:38`).

- **Kernel act.** `retire` is a kernel delivery from the scope's recorded
  creator. With a successor, it is the final entry of section 5. Without a
  successor, it stops intake, and reads, replay and the archive continue.
  The scope URI resolves with the status `retired`.
- **Scopes it covers.** The mechanism is the kernel's. This design enables it
  for scopes that a directory creates: applications and lanes. Retiring a
  platform scope (register, directory, membership, rules, destination,
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
| [scopes](../docs/scopes.md), lines 81 to 85 and 268 to 269 | Pin for life; `VERSIONS` cited in `index.ts`. | Add `retired`, `retire` and the successor's citation; correct the citation to `native-catalog.ts`. |
| [write an application](../docs/write-an-application.md), lines 114 to 117 and 364 | Existing lanes keep the digest they pinned. | How to ship a successor package and its mapping. |
| [roadmap](../docs/roadmap.md), lines 48 and 49, the row at line 72, and lines 305 and 306 | Not designed. | Designed in this note; changed by this head. |
| [packages note](2026-10-18-application-packages-and-builder-room.md), section 2, lines 116 to 118 | A new version reaches rooms by a successor package, never by propagation. | Unchanged; a successor package moves a scope only by an explicit succession. |
| [packages note](2026-10-18-application-packages-and-builder-room.md), section 6, item 6 | A successor package carries forward (M3). | Defined here. |
| [self-contained applications](2026-10-15-self-contained-applications.md), gap 10 and M3 | Carry-forward is not built. | This note is M3's design. M4 stays research. |
| [scope contract](2026-10-04-scope-and-replay-contract.md), D5-1 | Migration of a live scope is not designed. | A live scope never changes definition. Succession moves an application. |
| `packages/contract/src/result.ts`, `read.ts` | No succession codes; three statuses. | `succeeded`, `retired`, `succession-busy`, `succession-too-large`, `succession-peers`, `mapping-refused`, `predecessor-mismatch`; the status `retired`. |
| [Counter README](../apps/counter/README.md), line 202 | No scope moves from one definition to the other. | The Counter's succession. |

## 16. Slices

Listed in order and not filed.

| Slice | Content | Done when |
|---|---|---|
| S1 | The Counter fixture on the test host: kernel `retire` with a successor, the final entry with its export and mapping check, the successor genesis, the rules activation fields, the directory's `succeed`, the reason codes and the status, reads of a retired scope, replay of both journals and the link, and `dap check --predecessor`. | The witnesses below pass, and the authoring cost is recorded against section 14. |
| S2 | Tools: `dap app succeed [--dry-run]`, the MCP tool, the page's link to the earlier record, and the documents in section 15. | A person upgrades an installed Counter from the CLI and from a chat. |
| S3 | Retirement without a successor for scopes a directory creates, and `dap app retire`. | A retired application refuses acts with `retired` and stays readable. |
| S4 | Archive and offline replay across a succession. | A clone replays both journals and checks the link. |
| S5 | Lineage for connected scopes (section 9). | A lending library and a Grow room each succeed with their peers. |
| S6 | Paged export and activation for large scopes. | A scope above the genesis size limit succeeds. |
| S7 | One view of a lineage's history. | The page shows both records as one history. |

S1 witnesses. The Counter's successor definition renames the participant
state `inactive` to `standby` and adds `retarget`, a controller act on
`configuration` that sets `target` between 1 and 100.

1. A Counter with three participants (one `inactive`, two `active`), an
   open board, and a pledged promise due two minutes later. `retire`
   produces a final entry with its export.
2. The successor's genesis cites the final entry. The `inactive`
   participant is `standby`. The promise is `pledged` with the same `until`
   value. Every ID is kept, and the next ID of each type is the export's.
3. Both journals replay. The link checks pass. The verifier recomputes the
   genesis from the final entry's export.
4. A `fulfill` signed for the predecessor and sent after the final entry is
   refused `succeeded` and names the successor. The same act signed for the
   successor is accepted.
5. `retarget` is accepted in the successor. `retarget` sent to the
   predecessor before its final entry is refused `unknown-act`.
6. The promise's deadline passes after the final entry, and the
   successor's timed drain expires it.
7. The predecessor's URI resolves. Its reads report `retired` and the
   successor's scope ID, and its journal reads as before.
8. A mapping that leaves `inactive` unmapped fails `dap check`. A mapping
   whose result the new definition refuses makes `retire` fail with
   `mapping-refused`, and the predecessor stays active. A genesis that
   cites an entry other than a final entry, or another mapping digest, is
   refused `predecessor-mismatch`.
9. A predecessor with a send that has no result refuses `retire` with
   `succession-busy` and the count. (The Counter sends nothing, so this
   witness uses a test definition.)
