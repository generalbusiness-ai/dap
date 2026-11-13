# Outside effects by a member: the publisher

Status: current. Draft 1, for request `35cbcb29`. Nothing here is built.

A scope judges signed acts and keeps one entry for each act that takes
effect. One part of dap does more. A destination scope writes to a Git
host. The scope opens an operation, the runtime sends it, and the scope
records each attempt and each answer. No other part of dap reaches an
outside system from inside a scope.

This note moves that work to a member. A **publisher** is a member with a
key and a Git credential. The publisher reads the record, writes to the
Git host, and signs one act that states the result. The note decides five
things.

1. **A scope never sends to an outside system.** A member does the work
   and signs an act that states the result.
2. **A publication is a fold of the journal that a member runs.** The
   record keeps the published commit and the last entry that the commit
   covers.
3. **A lost answer stays outside the record.** The publisher reads the
   branch on the Git host before it signs. The record holds no `unknown`
   result.
4. **The record uses declared forms only.** One item gains four slots, and
   the definition gains four acts. The kernel gains nothing.
5. **The first version publishes the lending library's shelf pages** in a
   room with host `none`. The room's change publication needs a note of
   its own (section 10).

Source facts name a file and a symbol at main `64112e45`.

## 1. What asks for the change

### 1.1 An application author

The lending library publishes one shelf page for each thing. Five of its
six acts send a `publish-file` message to the room's destination
(`publishes`, `examples/lending/definition.ts`). Each act returns a
receipt. The page exists later, in another scope. The destination
reserves up to eighteen outside operations for one page. They are one
`file-judge`, one `push`, six `mint`, six `revoke`, three `read` and one
`receipt` (`holds` of the item `file-publication`,
`packages/platform/src/destination.ts`).

The author cannot change any part of that path. "A declared application
has no operation of its own on an outside system" (`docs/roadmap.md`,
"What runs today"). The roadmap row "Outside parties and systems" lists
cases that wait for one. Three of them are a release, a payment attempt
and a tool executor's work.

### 1.2 The kernel

The kernel carries four forms for outside operations: the effects
`operation` and `attempt`, and the inputs `outcome` and `preparation`
(`Effect` and `Input`, `packages/contract/src/entry.ts`). The runtime
marks each attempt before it sends, and it never sends an attempt again.
An attempt with no answer becomes an `unknown` outcome and an open task
(`packages/scope/src/operations.ts`).

| Part | Size | Files |
|---|---|---|
| `packages/derive` | 4,205 lines | `ledger.ts`, `outcomes.ts`, `prepare.ts`, `capability.ts`, `capability/`, `validate/hold.ts`, `validate/holds.ts` |
| `packages/scope` | 4,118 lines | The driver, the destination and host adapters, and credential custody. The sources section lists the files |
| `packages/platform` | 35 marks | Each `P16` mark is a rule in code for an operation or its outcome |

The sources section gives the command for each count.

### 1.3 Places where a member already does the work

| Place | What the record holds | Who acts outside |
|---|---|---|
| The checker service | A job and the checker's signed `check` | "A separate service with its own key, and it is not a scope. It writes no entry" (`packages/checkers/src/service.ts`) |
| `device-command@1` | "A commanded target and the owner's signed answer" | The owner. "It reaches no device" (`docs/roadmap.md`) |
| Host `none` | A room with no repository. The act `bind-repository` binds one later | Nobody (`docs/hosts.md`) |
| The text of a shelf page | The act that states the text. "The journal shows who stated it" (`docs/roadmap.md`) | The member who signs the act |

Git publication is the one place where the scope itself sends.

## 2. Terms

- **Git host.** A service that keeps a repository and accepts a ref
  update.
- **Ref update.** A request to move a branch from one stated commit to
  another commit. The Git host refuses the request when the branch is not
  at the stated commit.
- **Publisher.** A member that a record appoints to publish for it.
- **Publication map.** Data that states, for each act of a definition, the
  fields that hold a path and its content.
- **Fold.** The function that makes a tree from an earlier tree and a run
  of entries.
- **Head.** The commit that the record states as published.
- **Cursor.** The last entry that the head covers.
- **Trailer.** Lines at the end of a commit message that state the scope,
  the entry and the earlier head.

## 3. One shelf page, entry by entry

A lending library runs in a room with host `none`. Its staff bound a
repository and appointed `@press` as publisher. The head is commit `c1`,
and the cursor is entry 40.

| Position | Input | Signer | What the entry changes |
|---|---|---|---|
| 41 | Act `donate`, with `page` `shelf/pot.md` and a `content` text | `@ada` | Opens thing 41 in `available` |
| 42 | Act `borrow` on thing 41, with a new `content` text | `@ben` | Thing 41 becomes `lent` |
| 43 | Act `published`, with `through` entry 42, `base` `c1`, `commit` `c2`, `tree` `t2` | `@press` | The head becomes `c2`. The cursor becomes entry 42 |

Between entries 42 and 43 the publisher does four things outside the
record.

1. It reads the entries after entry 40.
2. It runs the fold. Entry 42 is later than entry 41, so the page holds
   the text that `@ben` stated.
3. It makes commit `c2` with parent `c1`. The trailer states entry 42.
4. It sends one ref update, from `c1` to `c2`.

The receipt of entry 41 is the whole answer to `@ada`. Her page is on
the branch when the cursor is at entry 41 or later. A view reads the
cursor from the `library` item.

The journal holds three entries for this work. It holds no delivery, no
result, no operation and no outcome.

## 4. Record forms

Every form in this section is a form of a declared definition
(`docs/scopes.md`, "Definitions"). The examples use the lending library.

### 4.1 Slots

The singleton item `library` gains four slots.

| Slot | Form | Holds |
|---|---|---|
| `publisher` | A party slot, not required | The appointed member |
| `repository` | A value slot, a record of `host`, `namespace` and `name` | The repository that receives the pages |
| `head` | A value slot of type `commit`, not required | The published commit |
| `cursor` | A reference slot of type `fact`, not required | The last entry that the head covers |

### 4.2 Acts

| Act | Action | Guards | Effects |
|---|---|---|---|
| `bind-repository` | `lending.staff` | `repository` holds nothing | Sets `repository` |
| `appoint-publisher` | `lending.staff` | None | Sets `publisher`. A later appointment replaces the earlier one |
| `published` | `lending.publish` | The signer is in `publisher`. `through` is an entry of this scope. `base` equals `head`, or the act states no `base` and `head` holds nothing | Sets `head` to `commit`. Sets `cursor` to `through` |
| `adopt-head` | `lending.staff` | None | Sets `head` to the stated commit |

The guard on `base` gives the record one order of publications. A
`published` act takes effect only when the publisher built its commit on
the present head. So the act needs no guard on the position of `through`.
A publisher that states an earlier entry is at fault, and the entry shows
the fault.

The package grants `lending.publish` to the role `agent`
(`declareRoles`, `examples/lending/roles.ts`). The `signer` guard limits
the act to the one appointed member. Membership keeps its fixed list of
roles (`ROLE`, `packages/platform/src/membership.ts`), so the route needs
no new membership version.

Staff use `adopt-head` when a writer outside the record moved the branch.
Section 6 gives the case.

### 4.3 Forms that the definition loses

The lending definition loses the `destination` reference of `library`,
the `destination` field of `establish`, and the five `publish-file`
sends. No act of the definition has a send.

### 4.4 Publication map

The map for the lending library has five rows.

| Act | Path | Content |
|---|---|---|
| `donate` | The field `page` | The field `content` |
| `borrow`, `return`, `cancel` | The field `page` of the entry that opened the thing | The field `content` |
| `publish` | The field `page` of the entry that opened the named thing | The field `content` |

The definition's own rule expression `shelf-page` limits each path. The
first version keeps the map in the example's source, beside the
definition. A later slice can move the map into the package form. That
change needs a version of the package form, and this note does not design
it.

## 5. What a publisher does

A publisher is a process with two secrets: the device key of its member
and a credential for the Git host. It keeps both in its own store. It
uses the client library for every exchange with the scope.

1. The publisher reads the `library` item. It stops when `publisher` is
   another member, or when `repository` differs from its own
   configuration.
2. It reads the entries after the cursor and selects entries with the
   map. When it selects none, it waits and starts again.
3. It reads the branch on the Git host.
4. When the branch is at the head, it runs the fold and makes a commit.
   It sends one ref update from the head to that commit. When the Git
   host refuses the update, it returns to step 3.
5. The branch can be at a commit whose parent is the head. The publisher
   then reads the trailer and runs the fold for the stated entry. When
   the fold gives the same commit, it continues at step 7 with that
   commit.
6. In every other case it signs nothing and stops. Staff repair the
   branch, or they sign `adopt-head`.
7. It signs `published`. It stores the signed intent before it submits,
   and it submits until the scope answers (`packages/client/src/custody.ts`).
8. When the scope refuses the act on the `base` guard, another report
   took effect first. The publisher starts again at step 1.

### 5.1 Rules for the fold

Two publishers must make the same commit from the same record. So the
fold and the commit have fixed rules.

- The fold reads the tree at the head, the selected entries in journal
  order, and the map. It reads nothing else.
- The fold is total. It skips an entry whose path it cannot write. The
  commit message lists the entry and the reason.
- The commit has one parent, the head. The first commit has no parent.
- The author and the committer are one fixed text. The commit time is the
  time of the entry that `through` states.
- The trailer states the scope with its incarnation, the position and
  hash of that entry, and the earlier head.

### 5.2 One write for each publication

A destination today writes the branch and then a receipt commit under
`refs/artroom/receipts/` (`docs/architecture.md`, "Durability: storage,
publication and replay"). On this route the published commit states its
own entry in the trailer. The publisher sends one ref update, and no
second write follows.

## 6. Lost answers and races

| Case | Git host | Record | What happens |
|---|---|---|---|
| The process stops after the ref update and before the report | `c2` | Head `c1` | Step 5. Any process of the publisher finds `c2`, checks it with the fold, and signs `published` |
| Two processes run at once | The first ref update wins | One `published` takes effect | The Git host refuses the second update. The scope refuses the second report on the `base` guard |
| A report takes effect and the branch did not move | `c1` | Head `c2` | The next ref update fails. The publisher stops at step 6. A reader with a clone sees the difference |
| Another writer moved the branch | `x` | Head `c1` | Step 6. Staff repair the branch or sign `adopt-head` |
| The publisher's key is lost or misused | Any | Any | Membership revokes the key with an ordinary act. Staff appoint another publisher |

No case writes an `unknown` result. Two properties of a Git branch make
that possible: a ref update is conditional, and a branch can be read. The
authority note already says that for a branch update "a read shows the
effect" (`notes/2026-10-04-authority-effects-and-publication.md`, section
12, row G1).

An outside system without those two properties needs two more forms.
One is an act that the member signs before it sends. The other is a
state for a result that nobody can learn. `device-command@1` has that
shape today. This note designs neither form.

## 7. Trust

| Question | Today | With a publisher |
|---|---|---|
| Who writes to the Git host? | The operator's runtime | A member. The operator or the room's owner runs it |
| Who states the result? | An `outcome` input that the runtime writes. It carries no signature | An act that the publisher's key signs |
| What does replay check? | That platform code derives the entry from the recorded evidence | That declared guards admit the signed act |
| What shows that the branch moved? | The receipt commit and the branch | The branch and the trailer |
| Who holds the Git credential? | The platform, in `packages/scope/src/credential-store.ts` | The publisher. A room's owner can keep the credential from the operator |
| How does a room stop a bad writer? | No act does | A key revocation and a new appointment |

A reader with a clone and the journal can check every commit. The reader
runs the fold for the entry in each trailer and compares the commit. The
check needs the publication map and no platform code.

A publisher can sign a false report, and it can write a commit that no
entry covers. An operator's runtime can do both today. The record now
states the member who is answerable.

## 8. Kernel review

This section answers `docs/kernel.md`, sections 7 and 7.1.

The first version (slice P1) adds no file and no export to
`packages/contract`, `packages/derive` or `packages/bytes`. It adds no
scope kind, no platform definition name, no capability, no tool family and
no new model of the record. Its code is in `examples/lending`, and its
publisher runs as a script of that example. It is "work that only uses
existing forms", so section 7.1 does not hold it. It names no K item.

Promise 11 says: "Every effect on an outside system is a declared
capability form whose outcome is its own entry." Slice P1 keeps that
promise as the checker service keeps it. The publisher is a member's
client, and the scope has no effect on an outside system. The promise
needs new words when the platform's own publication moves to a publisher.
That change removes part of a promise, so it needs the review of section
7. Slice P4 carries it.

The route serves two K items, and it closes neither one in slice P1.

- **K1.** The 35 `P16` marks leave the family on offer in slice P3. The
  shipped versions stay in the catalog.
- **K4.** The closed capability names lose the operations of `hold@1`,
  `hold@2` and `git-read@1` in slice P4.

## 9. Order of removal

1. **Slice P1 removes nothing.** One application stops its use of the
   destination.
2. **Slice P3 stops new writes of the four forms.** A new family has a
   destination that opens no operation. Rooms of earlier families keep
   their pins.
3. **Slice P4 removes code from the kernel.** Promise 2 says: "Every entry
   form ever written stays replayable by the same derivation code." So the
   four forms can leave only by a decision on that promise. One way keeps
   the forms as code that only replay runs. The other way states that the
   release that wrote a retired room's journal replays it. This note does
   not choose.

The counts of section 1.2 are the most that can leave. `packages/git`
stays, as the library of the publisher.

## 10. Needs of the room's change publication

A room publishes merged changes under review rules. That path needs more
than the cursor of this note. A later note designs it. This section lists
its five questions and the answer that this note proposes for each.

1. **A staged commit.** A proposer's commit must be on the Git host before
   review. The scope stages it today with tokens that the scope mints
   (`HOLD_KINDS`, `packages/derive/src/capability/hold.ts`). Proposed: the
   publisher makes the fork and its token when it reads a `hold` entry.
   It gives the token to the holder over a private channel. The `hold`
   item form stays, and it needs no capability code
   (`docs/scopes.md`, "Capability forms").
2. **One order of merges.** Proposed: a `merge` act takes effect only when
   its manifest names the present head, by the same guard as section 4.2.
   The lane and the head are in two scopes today, and no guard reads
   another scope. So this answer waits for the note that sizes several
   definitions in one scope.
3. **Landing evidence.** The rules `E1` to `E6` of destination 17 decide
   the check results that count. They stay where they are until question
   2 has an answer.
4. **Facts about Git content.** A guard on changed paths or on ancestry
   needs a fact that no scope can read. Proposed: a member signs a report
   that states the tree, as a check result does today.
5. **Read tokens and new repositories.** `read-token`, `dap clone`, pages
   and `create-repository` use the platform's credential today. Proposed:
   every room starts with host `none`, staff bind a repository, and the
   publisher serves read tokens.

## 11. Slices

| Slice | Work | Depends on |
|---|---|---|
| P0 | This note, reviewed and landed | Nothing |
| P1 | Shelf pages by a publisher: a second lending definition beside the shipped one, its map, the publisher module and script in `examples/lending`, and the witnesses of section 12 | P0 |
| P2 | The design note of section 10 | The witnesses of P1, and the note on several definitions in one scope |
| P3 | A family whose destination opens no operation | P2 |
| P4 | The decisions on promises 2 and 11, and the removal from the kernel | P3 |

Slice P1 changes no file in `packages/contract`, `packages/derive`,
`packages/bytes`, `packages/platform` or `packages/scope`. The shipped
lending definition and its pin stay as they are, and the hosted lending
room keeps its definition.

## 12. Witnesses for slice P1

Each witness runs in the example's test host
(`examples/lending/story.ts`). The Git host is a bare repository in a
temporary directory, so no witness uses the network.

1. **The story of section 3.** After `donate` and `borrow`, one
   `published` act takes effect. A clone holds `shelf/pot.md` with the
   text of the `borrow` act, and the trailer states that entry.
2. **A lost answer.** The publisher stops after the ref update. A new
   process signs `published` for the same commit. The branch holds one
   new commit.
3. **A race.** Two processes run at once. The Git host accepts one ref
   update. One `published` act takes effect, and the scope refuses the
   other.
4. **Another writer.** A test moves the branch. The publisher signs
   nothing and stops. After `adopt-head` it publishes the next entry.
5. **Not the publisher.** Another member of role `agent` signs
   `published`. The `signer` guard refuses the act.
6. **A stale base.** The scope refuses a `published` act with an earlier
   `base`.
7. **Replay.** Replay of the lending scope reports `consistent`. Its
   journal holds no `outcome`, `preparation` or `delivery` entry.
8. **A reader's check.** A script runs the fold for each trailer and
   compares each commit. The script reports a mismatch for a commit with
   one changed file.

## Sources

Checked against main `64112e45` on 13 November 2026.

Counts, each run from the repository root:

```sh
grep -rhoE 'row: "P16"' packages/platform/src | wc -l
cat packages/derive/src/ledger.ts packages/derive/src/outcomes.ts \
	packages/derive/src/prepare.ts packages/derive/src/capability.ts \
	packages/derive/src/capability/*.ts \
	packages/derive/src/validate/hold.ts packages/derive/src/validate/holds.ts | wc -l
(cd packages/scope/src && cat operations.ts destination-host.ts \
	artifacts-host.ts github-host.ts artifacts-wiring.ts github-wiring.ts \
	credential-store.ts workspace-host.ts originals.ts read-token-quota.ts \
	stage-snapshot.ts given.ts publication-policy.ts rules-tree-provider.ts | wc -l)
```

Files read:
[entry.ts](../packages/contract/src/entry.ts),
[destination.ts](../packages/platform/src/destination.ts),
[membership.ts](../packages/platform/src/membership.ts),
[operations.ts](../packages/scope/src/operations.ts),
[hold.ts](../packages/derive/src/capability/hold.ts),
[service.ts](../packages/checkers/src/service.ts),
[custody.ts](../packages/client/src/custody.ts),
[the lending definition](../examples/lending/definition.ts),
[the lending roles](../examples/lending/roles.ts),
[the kernel boundary](../docs/kernel.md),
[scopes](../docs/scopes.md),
[the roadmap](../docs/roadmap.md),
[Git hosts](../docs/hosts.md), and
[publication from a fold](2026-10-13-fold-publication.md).
