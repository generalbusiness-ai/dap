# Members and presence in the interface

Draft 3, 19 October 2026. Design note for review. It sets a common
framework for showing a member anywhere in a dap interface, and for
showing a member's presence from a recorded source now and from the live
surface later. It fixes what the member element shows, where its data
comes from, and how an application author gets it with little effort.
The builder designs the element's appearance and the screens that use it,
following the design system (section 8). Source facts cite `path:line` at
main `4d8c878c`. Draft 2 answered F1 and F2 of the checker's review
`868bbe12`; draft 3 answers F3 and F4 of review `d273ec2d` (section 10).

The presence model is the presence declaration of the
[volatile acts note](2026-10-09-shared-language-volatile-acts.md),
section 2, as Hugh confirmed on 18 October 2026. This note does not
change that declaration and does not build its executor.

## 1. Why

Three surfaces show a member in three ways, and none of them resolves a
member reference to the person or agent it names.

- The card kit draws a glyph and text: a filled circle, a filled square
  or an outlined diamond, then the name, the controller and the kind
  (`packages/mcp/browser/main.ts:224-227`). That data arrives already
  resolved, as an `ActorChip` (`packages/mcp/src/views/types.ts:17`),
  from a trusted projection adapter that only the fixture supplies today.
- A declared view's `actor` field is the raw member reference, which the
  kit prints as JSON (`packages/mcp/src/views/declared.ts:113`,
  `packages/mcp/browser/main.ts:229`).
- The Counter page draws initials in a filled square
  (`apps/counter/browser/view.ts:63`). The room Page prints "Signed in as
  @handle (role)" and lists no members (`apps/room/page/src/view.ts:44`).

The membership scope holds what a member is: handle, kind (person, agent
or checker), role, controller for an agent, state (invited, active,
removed or lapsed) and keys (`packages/platform/src/membership.ts:243-273`).
The service already reads it for a caller's standing
(`packages/mcp/src/inventory.ts:98-104`). A member reference is a
membership scope and a member ID (`packages/contract/src/scope.ts:104`).
So the data exists and the read exists. What is missing is one element
that every surface uses, and one path that fills it.

Live presence is designed and not built. The roadmap's "Durability
levels" entry says so, and the validator refuses every level but
recorded. Recorded presence exists in one place: the grow site's
`arrive` and `leave` acts, which are signed comments with no effects
(`examples/grow/site.ts:10,28`), and a projection over the last 100
entries of the site's journal filtered to those acts
(`examples/grow/check/dap.application.json`, projection `presence`). That
projection is recent reported activity. It is not who is in each room
now: a member whose last arrival is older than the window has no row.
Decision `72c9d5e5` of 19 October commissions the complete source, a
presence item per member on the site scope, as the second G3 head of
plan 033. The element must therefore be built against the declaration's
shapes, take recorded presence from that item, and show presence honestly
as unknown wherever no source answers.

## 2. The member element

One element shows a member. It has three layers. Each layer has its own
source and its own expression for "unknown", so a surface never implies
more than the record supports.

| Layer | Source | Shows | When the source cannot answer |
|---|---|---|---|
| Identity | The membership scope, recorded | Initials inside the kind's shape, the handle, the kind, and the controller for an agent | "Member unavailable" and the raw reference. Never a guessed name |
| Standing | The member item's state and the roster | Invited, active, removed or lapsed; the role; whether the member holds the action a view needs | The role is omitted. Eligibility reads "unknown" |
| Presence | The presence declaration, or the recorded presence item (section 5) | Live: status, whether the viewer's subject is in the member's focus, the note, and how fresh the lease is. Recorded: the room reported and the entry that reported it | "Presence unavailable", or nothing. Absent is never "offline" |

The shapes keep the convention of the card notes: a circle for a person,
a square for an agent, an outlined diamond for a checker. Initials sit in
the shape. Words accompany every mark. Shape and colour never carry a
meaning alone ([compact cards](2026-10-17-compact-cards-design.md),
"Visual language").

Each state has one fixed expression, so every surface reads the same:

| State | Expression |
|---|---|
| Invited | An outlined mark and the word "invited" |
| Active | A filled mark and no state word |
| Removed | A muted mark and the word "removed". The entry that removed the member appears only on the record screen, and only when the bounded read of section 4 finds it |
| Lapsed | A muted mark and "invitation lapsed" |
| Agent | The square, and "controlled by @handle" beside every use. An agent whose controller cannot be read shows "controller unavailable" |
| Present, live | A small badge with the status word: available, busy, waiting or blocked |
| Here, live | A dot and the word "here" when the viewer's current subject is in the member's focus |
| Note, live | The note, in muted type, after the status |
| Several sessions, live | One badge, by the declaration's rule: blocked over waiting over busy over available, the union of focus, the first note. Labelled "projection" |
| Reported, recorded | "in Room A, reported at entry N", where N is the entry of the item's report fact (section 5). No status, no note, no freshness, no lease. "Here" when Room A is the viewer's current subject |
| Left, recorded | "left Room A at entry N", from the same fact |
| Report entry unavailable, recorded | "in Room A" or "left Room A", then "report entry unavailable", when the item carries no report fact. Never an item revision shown as an entry |
| Not reported, recorded | "no arrival reported". Never "absent" |
| Absent, live | No badge. "Last seen" appears only when a lease end is known |

The live expressions and the projection rule come from section 7 of the
volatile acts note. The element never extends a lease and never claims an
intent beyond the reported attention. A recorded expression never carries
a status, a freshness or a lease, because the record holds none.

## 3. What the viewer can do

Interactions belong to a layer.

- **Identity** opens the member's record (section 6, use case 3). This is
  the only interaction a package surface gets.
- **Standing** offers the membership acts (invite a key, set the role,
  remove) only on screens the kit owns, and only to a member whose role
  holds the action. The shell signs; a package frame never does
  ([self-contained applications](2026-10-15-self-contained-applications.md),
  section 5.1). This is a boundary of the surface API: the API exposes no
  membership act and no presence write for another member, and the
  builder tests that it refuses them. It is not isolation of hostile
  code. A declared surface is trusted inline presentation code
  (`packages/mcp/browser/surface.ts:1-2`).
- **Presence** offers nothing on another member. Addressing a member is
  the messaging declaration, which is later work. The viewer changes only
  their own presence: status, focus and note, on one control the kit owns.

## 4. How it reaches each surface

**The service resolves members.** Before projection data crosses to a
frame, the service resolves every member reference in its rows into a
display record: handle, kind, state, role, controller, and the entry that
opened the member item. A projection field says where it comes from: a
`party` field holds a member reference, and a journal source's `signer`
field holds the signing member
(`packages/bytes/src/application-projection-types.ts:14,38`). So the
service knows which fields are members without the author saying so. A
field of either kind supplies a typed member reference and nothing more:
no handle, no state, no presence. The service reads the membership scope
for the rest, as it does for standing. The resolved records travel beside
the rows as one bounded table, keyed by reference. A reference the
service cannot resolve stays raw and is marked unavailable.

**Standing provenance is a separate, bounded read.** A member item
records its opening entry, its state and its revision, and no position
of its last state change (`packages/contract/src/read.ts:41-58`).
`remove-member` sets the state and records nothing else
(`packages/platform/src/membership.ts:484-491`). So "removed" and
"invitation lapsed" come from the state alone, and every element shows
them from the resolved record. The record screen alone may add the entry
that removed the member, from one read of the last 100 entries of the
membership scope filtered to `remove-member` on that member. That is the
window the projection grammar allows
(`packages/bytes/src/application-projection-types.ts:29-33`). Budget: one
window read when a record screen opens, and none per element. The read
has three outcomes, and the record keeps the handle, the kind and the
state in all of them:

- The window is complete and holds the removal: "removed at entry N".
- The window is complete and holds no removal: "removal entry not in the
  last 100 entries". Only a complete captured window may say this,
  because only a complete window shows that the removal is older.
- The read is refused, fails, or does not complete within its bounds:
  "removal entry unavailable". No wider lookup follows.

Examples: a member removed 5,000 entries ago shows "removed" on every
element and the second sentence on the record. The same member, when the
viewer's session may not read the membership scope's entries, shows
"removed" on every element and "removal entry unavailable" on the
record.

**Declared views render it without a declaration.** A party field or a
signer field renders as the member element. The view's `actor` field is
the first user of this path and stops printing JSON. The title, summary
and facts templates get a member form, so a template that names a party
field reads "@maya (person)".

**Package surfaces ask for it.** The surface API
(`packages/mcp/browser/surface.ts:6-11`) gains `member(ref)`, which
returns the element, and `onData` carries the resolved table. An author
writes one call per member shown. The kit defines the element once and
shares its stylesheet into each surface's shadow root, so the element
inherits the host's tokens.

**Chat text agrees with the card.** The context and fallback templates
get the same member form. The model's line reads "@maya (person), here,
busy" as the card shows it.

**The Page and the Counter page come later.** They are separate code.
The element should live in one browser package that the kit, the Page
and the Counter import. That consolidation is its own request.

## 5. Where presence comes from, and renewal

The element takes presence from one of two sources, chosen by the view.

1. **The live scope**, once it exists: the `presentAt` query and the
   actor summary of the declaration (volatile acts note, sections 2 and
   7). Not available at this note.
2. **The recorded presence item**, as the stand-in before the live scope:
   one item per member on the site scope, which `arrive` opens or moves
   and `leave` closes. Decision `72c9d5e5` commissions it as the second
   G3 head of plan 033, after G3's first head lands and before G5. The
   builder's request `bf420094` asks the planner to file that head. This
   note does not commission it and does not change the grow schema. The
   element's recorded layer waits for it.

**What the recorded item means to the element.** The item holds the
member, the room item, and the fact of the entry that last reported.
This note requires that third slot of the second G3 head as the source
contract for B3: a ref slot of type fact, under the site definition, of
kinds `arrive` and `leave` (`packages/contract/src/definition.ts:70`),
which each `arrive` and `leave` sets from the entry it writes (the `self`
form, `packages/contract/src/definition.ts:225`). The room item already
holds a fact ref this way, `summaryAt` (`examples/grow/site.ts:16`). N
in every recorded expression is the entry of that fact. An item's
revision is a count of the entries that changed it
(`packages/derive/src/fold.ts:164-165`), not an entry position: an item
opened at entry 8 and moved at entry 108 has revision 2, and neither 8
nor 2 names the report. The element never shows a revision as an entry.
The room item's `scope` ref holds the room's address
(`examples/grow/site.ts:16`), and that address is the subject the
element compares with the viewer's current scope for "here". A member
has one room per site. An arrival in Room B after an arrival in Room A
moves the member to B. A leave names a room; a leave that names a room
other than the member's current room is refused by name or leaves the
item unchanged, as the second G3 head decides, so `arrive A, arrive B,
leave A` keeps the member in B, as the site test states
(`examples/grow/site.test.ts:41-43`). The expressions:

- Reported: the item is open and names a room. "in Room A, reported at
  entry N", where N is the entry of the item's report fact.
- Partial: the room item has no `scope` yet. "in Room A", and no "here".
- Left: the item is closed. "left Room A at entry N", from the same fact.
- Report entry unavailable: the item carries no report fact. "in Room A"
  or "left Room A", then "report entry unavailable".
- Not reported: no item for the member. "no arrival reported".
- Unavailable: the read refuses, or the member cannot be resolved.
  "presence unavailable".

No lease, status, note or freshness comes from the item.

**What today's window read is, and is not.** The grow site's `presence`
projection is the last 100 entries filtered to `arrive` and `leave`,
with the signer and the room (`examples/grow/check/dap.application.json`,
projection `presence`). G3's first head reads it for its routing rule
and answers present, absent or unknown, never showing missing evidence
as absence (decision `72c9d5e5`). The element does not read this window
as occupancy. A view that shows it labels it "recent activity, last 100
entries", and the state of a member with no row in it is "unknown". This
note does not change G3's routing rule.

**Witness for the recorded layer.** Rita arrives in Room A at entry 2.
One hundred unrelated entries follow. A client opens at entry 103. The
presence item shows "Rita, in Room A, reported at entry 2", from the
item's report fact, whose entry is 2, and not from its revision, which
is 1. The window read holds no Rita row and shows "unknown". Neither
shows Rita as absent, and no read scans past the window.

**Renewal is B4, and nothing today provides it.** Enter, Renew and Leave
are acts judged under the viewer's session, with the declaration's
ownership, generation and expected checks. A read token writes nothing.
When the live scope exists, these acts go through a new app-only tool in
the shape of `view_read` (`packages/mcp/src/views/tools.ts:67`), never
the model's tool surface, because a chat host may show every tool call.
The host calls it on the kit's refresh timer
(`packages/mcp/browser/main.ts:25-29`): the lease is 30 seconds and the
grow views refresh every 2 seconds, so a view that is open keeps its
lease, and closing the view leaves presence. Each call is one act; no
lease extends without one.

**A decision for review.** Whether opening a card enters presence with
focus on that subject, as section 12 of the volatile acts note sketches,
or only after the viewer sets a status. The planner's recommendation:
enter on open with focus on the subject and no status, because the
"here" expression is the one most views need, and the viewer can still
set busy or blocked by hand.

## 6. Use cases

1. **A member list that says where each member is reported.** From the
   presence item it reads "Maya, in Room A, reported at entry 412". With
   the live source it adds "busy, looking at zone 2, seen 12 s ago". It
   reads the roster, the presence items, and later `presentAt` for each
   room address. The G3 routing rule of
   [plan 033](plans/033-2026-10-18-grow-room-demo.md) is a separate
   thing: it selects who may take a task, and this note does not change
   it.
2. **One member wherever they are identified.** The actor on an alert
   card, the performer on a task, each entry of a log, the requested
   approvers on a decision (people only), an agent with its controller on
   a work row. All one element, all resolved by the service.
3. **A member's record.** A kit `record` screen over the member item:
   handle, kind, role, controller, keys and their states, the entry that
   opened the member, the removal entry when the bounded read of section
   4 finds it, and current presence. The membership acts appear here, to
   an admin.
4. **The viewer's own presence.** A control in the kit's header: status
   and note, and a line that says what focus the service holds for them.
5. **Hosted agents.** "3 requested, 2 ready, 1 needs attention" is
   provisioning state, not presence
   ([hosted agent teams](2026-10-15-hosted-agent-teams-design.md),
   section 1). The same element shows the agent, with a separate
   expression for provisioning, so a ready agent that is absent is never
   shown as attending.

## 7. Bounds

| Bound | Value | Source |
|---|---|---|
| Mounted view | 64 KiB | `packages/mcp/src/views/session.ts:52` |
| Projection | 8 sources, 32 fields, 100 rows | `packages/contract/src/application-projection.ts:6-7` |
| Members resolved per view | 32 distinct, with an overflow count | This note |
| Removal provenance read | The last 100 entries of the membership scope, once per record screen | This note, section 4 |
| Recorded presence window, not an occupancy source | 100 entries | `examples/grow/check/dap.application.json`, projection `presence` |
| Focus addresses per session | 8 | Presence declaration |
| Note | 160 bytes | Presence declaration |
| Lease | 30 seconds | Presence declaration |

A member table that would exceed its bound is cut with a count, never
silently.

## 8. What the builder designs and builds

The builder designs the appearance and the screens, following the design
system: the [brand guidelines](../brand/GUIDELINES.md),
[tokens](../brand/tokens.css) and [fonts](../brand/fonts.css), the visual
system of the [journey views design](2026-10-17-journey-views-design.md),
and the visual language of the
[compact cards design](2026-10-17-compact-cards-design.md). The design
packet comes first and is reviewed before any build.

1. **D1. The design packet.** The element in every state of section 2,
   in both themes, at desktop and phone widths; the member list of use
   case 1; the member record of use case 3; the viewer's own presence
   control of use case 4. How initials sit in the square and the diamond
   is the builder's choice. Static mockups with fixed fictional data, as
   the grow design's mockups were made.
2. **B1. Resolution and the element.** The service resolves party and
   signer fields into the bounded member table. The kit renders the
   element for them and for `actor`. The surface API gains `member(ref)`.
   Witness: the grow alert card shows the raising agent with its
   controller, and the grid surface shows a bench's last prober, with no
   change to the grow package's HTML beyond one call.
3. **B2. Kit-owned member screens.** The member list and the member
   record, with the membership acts offered by standing, the removal
   provenance read of section 4 with its three outcomes, a removed member
   whose removal is older than the window, and one whose read is refused.
4. **B3. The recorded presence layer.** The element's recorded
   expressions, fed by the presence item of the second G3 head. Starts
   after that head lands, and requires that item to expose the report
   fact of section 5; an item without it gives "report entry
   unavailable", never a scan. Witnesses: the grow site overview shows
   who is reported in each room through the element, and the
   late-opening client of section 5.
5. **B4. Live presence.** The live source and renewal through the
   app-only tool. Waits for the live scope's executor, which plan 033
   does not commission. Not commissioned by this note.

B1 and B2 need nothing that is not on main. B3 needs the presence item
of the second G3 head.

## 9. Open points

- Whether the role shows by default on the element, or only on the
  record. The recommendation: only on the record, and on a list when the
  list is about standing.
- Where the shared browser package for the element lives, and when the
  Page and the Counter adopt it.
- Whether a declared view may name the presence items for a list, or
  whether the service derives "where reported" from the items alone.

## 10. Changes in drafts 2 and 3

Review `d273ec2d` of draft 2 requested two changes, made in draft 3.

- **F3.** Draft 2 wrote "N is the item's revision entry", which names no
  readable source. Draft 3 requires the second G3 head's presence item to
  carry a fact ref to the entry that last reported, in the form the room
  item's `summaryAt` already uses, takes N from that fact in every
  recorded expression and in the witness, states that a revision is
  never shown as an entry, and adds the "report entry unavailable"
  expression for an item without the fact (sections 2, 5 and 8).
- **F4.** Draft 2 gave the removal provenance read one sentence for an
  old removal and none for a read that is refused, fails or does not
  complete. Draft 3 gives the read three outcomes, reserves "removal
  entry not in the last 100 entries" for a complete captured window,
  adds "removal entry unavailable" for the rest, keeps identity and state
  in all of them, and adds the refused-read example (sections 4 and 8).

Review `868bbe12` of draft 1 requested two changes, made in draft 2.

- **F1.** Draft 1 took the grow site's `arrive` and `leave` window as
  the recorded source and said the site overview already shows who is
  in each room. It does not: the window is the last 100 entries and has
  no occupancy state. Draft 2 takes the presence item of the second G3
  head as the recorded source (section 5), states its subject binding,
  its one-room and leave semantics and its reported, partial, left,
  not-reported and unavailable expressions (sections 2 and 5), labels the
  window as recent activity with unknown state outside it, adds the
  late-opening client witness, commissions no grow change itself, and
  moves B3 after the second G3 head (section 8). G3's routing and live
  attention stay as they are.
- **F2.** Draft 1 wrote "removed, since entry N" with no source for N.
  Draft 2 shows "removed" from the state alone, adds the bounded removal
  provenance read for the record screen with its window, its budget and
  its unavailable sentence, keeps identity and state when that read finds
  nothing, and adds the example of a removal older than the window
  (sections 2, 4, 7 and 8).
- Also from the review: section 4 says a party or signer field supplies
  only a typed reference; section 3 names the kit-owned controls as an
  API boundary to test, not hostile-code isolation; section 5 says
  renewal is B4 and that `view_read` provides none of it.

## Source

Written by the planner against main `4d8c878c` from the
[volatile acts note](2026-10-09-shared-language-volatile-acts.md)
(sections 2, 7, 12 and 16), the
[compact cards design](2026-10-17-compact-cards-design.md), the
[journey views design](2026-10-17-journey-views-design.md), the
[grow design](2026-10-17-grow-operation-application-design.md), the
[self-contained applications note](2026-10-15-self-contained-applications.md),
[declared application views](../docs/application-views.md), the card kit
(`packages/mcp/browser`, `packages/mcp/src/views`), the membership
definition (`packages/platform/src/membership.ts`), the grow site
(`examples/grow/site.ts`, `examples/grow/check/dap.application.json`),
decision `72c9d5e5` and reviews `868bbe12` and `d273ec2d` in the
workroom, and the gitseq
presence model, whose leased sessions, four statuses, focus and note the
declaration already follows. Nothing in this note was run against the
dap runtime.
