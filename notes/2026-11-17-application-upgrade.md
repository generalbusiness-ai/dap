# An application upgrade act

Status: proposed, for Hugh's decision. Request `d7f77eeb`. Nothing here is
built.

IR-1 (`f8fbe5ec`) found that each Counter upgrade opens a new installation
item and leaves the old item active. No act retires the old item or its
scope. Decision 4 of
[the self-contained applications note](2026-10-15-self-contained-applications.md)
(lines 433-434) says that upgrades use new scopes and carry forward until
change inside a running scope exists. This note proposes one act that moves
an installation to a new signed release and ends the old scope's work in the
same step.

## 1. Scene

Ana is an admin of a room that runs Counter 0.6.0 as installation item 20.
The publisher signs Counter 0.7.0, and the planner adds the release to the
trust list.

Today, Ana installs 0.7.0. The room opens item 21 and a new Counter scope.
Item 20 stays active. Members now see two Counters: the old screen at item
20 still works, and the new screen at item 21 needs a new screen-host row.
The MCP server finds two active installations and drops its declared cards
(`packages/mcp/src/service.ts:353-356`). The old scope keeps its alarms and
its archive.

With the proposed act, Ana runs one command:

```
dap app upgrade <room> 20 <0.7.0 release>
```

The room records one `upgrade-application` act on item 20.

- Members see one Counter. Its screen moves to the 0.7.0 presentation at the
  same address.
- If 0.7.0 keeps the 0.6.0 semantic identifier, the Counter scope stays the
  same. Its participants, board and pledges stay where they are.
- If 0.7.0 changes the semantic identifier, the room opens a successor item
  and a new scope. Item 20 becomes `replaced`. The old scope archives its
  history up to the act, then its archive stops for good. Its records stay
  readable.

Counter 0.7.0 is the first case. Its open identifiers
(`apps/counter/release-identifiers.json`) keep the 0.6.0 semantic
identifier `a5a44ebc` and entry `b5582434`. Only the presentation changes
(`9d6995c8`). Counter 0.5.0 to 0.6.0 was the same kind of change. The
self-contained note calls this a `present` change (lines 116-127): "No scope
or grant changes."

## 2. What the act touches

### 2.1 The installation item

`install-application` opens an `installation` item
(`packages/platform/src/application-install.ts:46-60`). The item's states
are `pending`, `active` and `refused`. Only `refused` is final (line 31).
The values `uri`, `release`, `semantic`, `presentation`, `definition` and
`publisher` are fixed (lines 24 and 37-41). The item has no version and no
successor reference.

When creation succeeds, `application-keep-creation` sets the item's `scope`
reference and makes it `active` (`application-install.ts:236-241`).

The act needs one of two changes:

- In place: `release` and `presentation` become changeable through this act
  only. `semantic` and `definition` stay fixed.
- Replacement: a new final state `replaced`, and a `replaces` reference on
  the successor item.

### 2.2 The rules scope definition

Each room's Rules scope runs a pinned, named definition. The installation
reader accepts a fixed list of rules definitions
(`packages/platform/src/application-install-reader.ts:29`), and the scope
object passes the pinned name (`packages/scope/src/object.ts:866-869`). A
new act needs a new rules definition. Existing rooms keep the definition
they were born with. They get the act only through definition succession
([definition succession](2026-10-22-definition-succession.md), not built) or
a new room.

### 2.3 Installation reader

`applicationInstallation` returns null unless the item is `active`
(`application-install-reader.ts:32`). It returns the item's `release`,
`semantic` and `presentation` values (lines 35-38). The screen route, the
archive reader (`packages/platform/src/application-archive-reader.ts:84`)
and the projection reader (`application-projection-reader.ts:17`) all use
it. A `replaced` item is not active, so all three stop serving it with no
reader change.

### 2.4 Screen route

The sandbox host reads the Directory, then the Rules installation
(`packages/scope/src/applications/route.ts:71-75`). It answers 404 unless
the item's presentation equals the address and the release is trusted (line
79). It never calls the application scope.

The route already expects the in-place case. Its comment (lines 23-25) says:
"A hostname is stable for one installation; a reviewed presentation update
replaces its descriptor." An in-place upgrade keeps the item and the
hostname, and needs a new screen-host descriptor for the new presentation.
A replacement opens a new item and needs a new screen-host row.

### 2.5 Archive proof

An application scope's archive admits its policy through the room:

1. `archiveInstallationIdentity` walks the scope's birth to the Directory's
   `application-create` delivery. It takes `release`, `semantic` and
   `presentation` from that delivery
   (`apps/room/archive-identity.ts:26-110`;
   `packages/platform/src/application-install-creation.ts:28-41`). These
   values never change.
2. The archive asks the Rules scope for a proof of the item
   (`apps/room/archive-packages.ts:86-128`;
   `packages/scope/src/applications/archive-proof.ts:51-88`). The proof
   refuses a `pending` item as not active and any other non-active state as
   unsupported (`archive-proof.ts:73-74`).
3. The archive requires the item's `scope` to equal the archived scope, and
   the item's identifiers to equal the birth identifiers
   (`archive-packages.ts:130-131`). A mismatch is pending
   (`archive-packages.ts:144`). An unsupported refusal stops the archive
   (`archive-packages.ts:111-112`).

Pending means a retry with backoff, at most once an hour
(`packages/scope/src/archive-driver.ts:93-95`). A stop is terminal
(`archive-driver.ts:532-538`).

This decides both forms:

- In place, the item's `release` and `presentation` no longer equal the
  birth identifiers. Without a change, the archive retries once an hour for
  ever. The proof must compare `semantic` and `definition` only, or accept
  a release that an `upgrade-application` act recorded.
- Replacement: a `replaced` item gives "unsupported" and stops the archive
  with `application-policy-unavailable`. The stop must come after the
  archive has published every entry up to the act. The proof should accept
  `replaced` up to the act's position, then stop with its own reason, such
  as `application-replaced`.

### 2.6 Scope status and the wake record

A scope's status is `provisional`, `active` or `refused`
(`packages/contract/src/read.ts:49`). No scope status is final. A retired
room is a storage format, not an act
(`packages/scope/src/room-format.ts:84-103`). Its object sets no alarm and
answers every call with a stop (`object.ts:199-201`, `object.ts:976`).

Each scope object has one alarm, set to the earliest of its wakes
(`packages/scope/src/outbox.ts:83-93`). The archive wake
(`packages/scope/src/archive-row.ts:21-41`) is one of them. It is null when
the archive is caught up or stopped (`archive-row.ts:205`). Counter's
`until` deadlines (`apps/counter/commitments.json:728`, `:739`) set more
wakes.

The replacement form does not make the old scope refuse acts. A client that
holds the old scope reference can still act in it. Only a kernel scope
status can refuse those acts (option C).

## 3. Request cost for a room with two superseded items

The room has three Counter scopes: one current and two superseded. The
figures are per old scope, from the AR-1 and AR-4 measurements
(`notes/implementation/2026-11-16-ar1-archive-wake-rate.md:119-125`,
`notes/implementation/2026-11-17-ar4-archive-unbound.md:74`). They are
estimates, not measurements of this room.

| Old scope's situation                 | Today, a day       | Option A | Option B      |
| ------------------------------------- | ------------------ | -------- | ------------- |
| Archive bound, caught up, idle        | 0                  | no scope | 0             |
| Room has no archive destination       | about 14 to 50     | no scope | 0             |
| Archive retrying at the one-hour cap  | about 340 to 670   | no scope | 0             |
| Each due Counter deadline             | about 7 to 13 once | no scope | about 7 to 13 |
| Members still acting in the old scope | not bounded        | no scope | not bounded   |
| Final archive pass at the act         | none               | none     | about 7 once  |

For two old scopes, double each figure. Today, an idle bound room costs
nothing for its old scopes. An unbound room costs about 28 to 100 requests
a day. The real cost today is a second live Counter: members split across
two screens, and MCP drops its cards.

Option A removes the old scope altogether for a presentation change. Option
B keeps the old scope but ends its recurring archive work after one final
pass. Neither removes a deadline that an old scope already holds. In
option B, members who still hold the old scope reference can act there.

An in-place upgrade without the archive change in section 2.5 would cost
about 340 to 670 requests a day for each upgraded scope. This is the
hourly retry loop. The reds for option A must show that this loop does not
start.

## 4. Options

### Option A: present in place

`upgrade-application` on an active item accepts a new release only when its
`semantic` and `definition` equal the item's. It changes the item's
`release` and `presentation` values. The scope, its state and its grants
stay the same. The archive proof compares `semantic` and `definition`
against the birth identifiers, plus the release that the act recorded.

This covers Counter 0.5.0 to 0.6.0 and 0.6.0 to 0.7.0. It does not cover a
guard or projection change.

### Option B: replace

`upgrade-application` on an active item moves it to the final state
`replaced` and opens a successor `installation` item with a `replaces`
reference. The successor runs the normal pipeline (fetch, admission,
grants, creation) and gets a new scope. The old item's screen, projection
and MCP card stop. The archive proof accepts `replaced` up to the act and
then stops with `application-replaced`. The old scope's records stay
readable. Nothing carries over: participants, boards and pledges stay in the
old scope.

### Option C: replace and close the scope

Option B, and the room sends the old scope a close delivery through its
creator, the Directory. The old scope takes a new kernel status, `closed`.
It refuses new acts with a reason that names its successor. Reads, replay
and the archive continue. This is the `retire` of the definition succession
note (lines 657-663), slice S3 (line 723).

### Recommendation

Build A and B as one act, `upgrade-application`, that chooses its form from
the semantic identifier:

- equal `semantic` and `definition`: option A;
- any other change: option B.

Leave option C to definition succession. Counter's next upgrade needs only
option A, and option A creates no new scope. Option B gives semantic
changes a clean end for the old scope's screen, cards and archive without a
kernel change.

## 5. What Hugh decides

Kernel decisions:

1. Whether a scope can have a final status (option C). This changes
   `Status` in `packages/contract/src/read.ts:49` and every scope's act
   path.
2. Whether the archive proof may accept an item whose `release` and
   `presentation` differ from the scope's birth (option A). This changes
   the policy check in `apps/room/archive-packages.ts:130-131`, which the
   security entry-point seals cover.

Room and platform decisions:

3. Whether the installation item may change `release` and `presentation`
   through one act (option A), and gain the final state `replaced` (option
   B). Both need a new rules definition.
4. How existing rooms get the act: a new room for each, or definition
   succession first. Counter's witness room runs a rules definition without
   the act.

## 6. Steps if Hugh agrees

1. U1: the new rules definition with `upgrade-application`, the in-place
   form and the `replaced` state. Reds: an upgrade with a changed semantic
   identifier is refused in place; a second active Counter cannot result.
2. U2: the archive proof for both forms. Reds: no hourly retry after an
   in-place upgrade; a replaced scope publishes up to the act, then stops
   with `application-replaced`.
3. U3: `dap app upgrade` in the CLI, and the screen-host descriptor update
   for the in-place form.
4. U4: a witness run in a new room: Counter 0.6.0 to 0.7.0 in place, with
   one screen and the MCP cards before and after.
