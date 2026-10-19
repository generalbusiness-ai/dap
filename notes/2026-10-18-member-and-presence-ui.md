# Members and presence in the interface

18 October 2026. Design note for review. It sets a common framework for
showing a member anywhere in a dap interface, and for showing a member's
presence once the live surface exists. It fixes what the member element
shows, where its data comes from, and how an application author gets it
with little effort. The builder designs the element's appearance and the
screens that use it, following the design system (section 8). Source
facts cite `path:line` at main `4d8c878c`.

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

Presence is designed and not built. The roadmap's "Durability levels"
entry says so, and the validator refuses every level but recorded. The
element must therefore be built against the declaration's shapes now and
show presence honestly as absent until an executor supplies it.

## 2. The member element

One element shows a member. It has three layers. Each layer has its own
source and its own expression for "unknown", so a surface never implies
more than the record supports.

| Layer | Source | Shows | When the source cannot answer |
|---|---|---|---|
| Identity | The membership scope, recorded | Initials inside the kind's shape, the handle, the kind, and the controller for an agent | "Member unavailable" and the raw reference. Never a guessed name |
| Standing | The roster and the member's state | Invited, active, removed or lapsed; the role; whether the member holds the action a view needs | The role is omitted. Eligibility reads "unknown" |
| Presence | The presence declaration, or a declared recorded stand-in (section 5) | Status, whether the viewer's subject is in the member's focus, the note, and how fresh the lease is | "No live surface", or nothing. Absent is never "offline" |

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
| Removed | A muted mark and "removed, since entry N" |
| Lapsed | A muted mark and "invitation lapsed" |
| Agent | The square, and "controlled by @handle" beside every use. An agent whose controller cannot be read shows "controller unavailable" |
| Present | A small badge with the status word: available, busy, waiting or blocked |
| Here | A dot and the word "here" when the viewer's current subject is in the member's focus |
| Note | The note, in muted type, after the status |
| Several sessions | One badge, by the declaration's rule: blocked over waiting over busy over available, the union of focus, the first note. Labelled "projection" |
| Absent | No badge. "Last seen" appears only when a lease end is known |

The projection rule and the labels come from section 7 of the volatile
acts note. The element never extends a lease and never claims an intent
beyond the reported attention.

## 3. What the viewer can do

Interactions belong to a layer.

- **Identity** opens the member's record (section 6, use case 3). This is
  the only interaction a package surface gets.
- **Standing** offers the membership acts (invite a key, set the role,
  remove) only on screens the kit owns, and only to a member whose role
  holds the action. The shell never signs a room act for a package frame
  ([self-contained applications](2026-10-15-self-contained-applications.md),
  section 5.1).
- **Presence** offers nothing on another member. Addressing a member is
  the messaging declaration, which is later work. The viewer changes only
  their own presence: status, focus and note, on one control the kit owns.

## 4. How it reaches each surface

**The service resolves members.** Before projection data crosses to a
frame, the service resolves every member reference in its rows into a
display record: handle, kind, state, role, controller, and the entry that
admitted the member. A projection field says where it comes from: a
`party` field holds a member reference, and a journal source's `signer`
field holds the signing member
(`packages/bytes/src/application-projection-types.ts:14,38`). So the
service knows which fields are members without the author saying so. The
resolved records travel beside the rows as one bounded table, keyed by
reference. A reference the service cannot resolve stays raw and is
marked unavailable.

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

The element takes presence from one of two sources, chosen by the view:

1. **The live scope**, once it exists: the `presentAt` query and the
   actor summary of the declaration (volatile acts note, sections 2 and
   7). Not available at this note.
2. **A declared recorded projection**, as a stand-in: a projection whose
   source is the application's own presence items or acts, with an
   `about` field. The grow site's `arrive` and `leave` acts are the first
   witness ([grow design](2026-10-17-grow-operation-application-design.md),
   section 6.1). This source has no lease, so the element shows no
   freshness and no status badge from it, only "in Room A".

Renewal rides on the kit's refresh timer
(`packages/mcp/browser/main.ts:25-29`). The lease is 30 seconds and the
grow views refresh every 2 seconds, so a view that is open keeps its
lease. Enter, Renew and Leave must not go through the model's tool
surface, because a chat host may show every tool call. They go through
an app-only tool, as `view_read` does today
(`packages/mcp/src/views/tools.ts:67`), and the service issues the acts
under the viewer's session. Closing the view leaves presence.

**A decision for review.** Whether opening a card enters presence with
focus on that subject, as section 12 of the volatile acts note sketches,
or only after the viewer sets a status. The planner's recommendation:
enter on open with focus on the subject and no status, because the
"here" expression is the one most views need, and the viewer can still
set busy or blocked by hand.

## 6. Use cases

1. **A member list that says where each member is active.** The grow
   site overview already shows who is in each room from recorded arrive
   and leave acts. With the live source it reads "Maya, in Room A, busy,
   looking at zone 2, seen 12 s ago". It reads the roster and
   `presentAt` for each room address. This is the G3 routing witness in
   [plan 033](plans/033-2026-10-18-grow-room-demo.md): tasks go to the
   tenders whose focus is the room and who hold the tending action.
2. **One member wherever they are identified.** The actor on an alert
   card, the performer on a task, each entry of a log, the requested
   approvers on a decision (people only), an agent with its controller on
   a work row. All one element, all resolved by the service.
3. **A member's record.** A kit `record` screen over the membership
   item: handle, kind, role, controller, keys and their states, the entry
   that admitted the member, and current presence. The membership acts
   appear here, to an admin.
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
   record, with the membership acts offered by standing.
4. **B3. The presence layer against the declaration.** The element's
   presence expressions, fed by the recorded stand-in source. Witness:
   the grow site overview shows who is in each room through the element.
5. **B4. Live presence.** The live source and renewal through the
   app-only tool. Waits for the live scope's executor, which plan 033
   does not commission. Not commissioned by this note.

B1 to B3 need nothing that is not on main.

## 9. Open points

- Whether the role shows by default on the element, or only on the
  record. The recommendation: only on the record, and on a list when the
  list is about standing.
- Where the shared browser package for the element lives, and when the
  Page and the Counter adopt it.
- Whether a declared view may name a second presence projection for a
  list, or whether the service derives "where active" from the focus
  addresses alone.

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
definition (`packages/platform/src/membership.ts`), and the gitseq
presence model, whose leased sessions, four statuses, focus and note the
declaration already follows. Nothing in this note was run against the
dap runtime.
