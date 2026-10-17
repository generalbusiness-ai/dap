# Compact journey cards in the AI app

Design revision in progress, 17 October 2026. Request `a9551a6d`, guidance
`5eeea1be`, promise `3710cde8`; base Main `95959b92`. This packet revises
the presentation in the [landed journey design](2026-10-17-journey-views-design.md).
Its facts and distinctions still apply. The examples are fictional. This
checkpoint contains concepts and an interaction specification; rendered
HTML examples, browser evidence and independent review remain due.

The card shows one thing that needs the person. Clicking its title opens
that thing. Reading stays inside the card. An act leaves a short receipt
and a short chat message, after which the next card can open.

## A small surface with a stable return point

The carousel contains a title, one summary line, the relevant actor, and
Previous, position and Next. The title is the opening control. There is
no second Open button, list of pending items, or More action. A visible
`1 / 7` position does not depend on dots. Previous is disabled at the first
item and Next at the last; paging does not wrap or trigger an act.

Left and right arrow keys page while focus is within the carousel and
outside an editable control. Each chevron has a 44 px target and an
accessible name. A title is a normal focusable link. After opening, focus
moves to the new screen's heading; Back restores focus to that title.
Changing slides announces position and title once to assistive technology.

Every opened screen has Back, including diffs, updates and receipts.
Back refreshes its parent before restoring it. The return point is the
item's stable identity plus its former index, not a cached array offset
alone. If that item remains in the queue, return to it. If it has left,
use the item now at the saved index, clamped to the refreshed queue's last
item. An empty queue says **Nothing needs you.** Reading changes no review
point or obligation. Back from a diff returns to its change with the same
version and endpoints; it does not silently open the latest version.

The queue and its detail have independent read identities. A refreshed
parent may remove a stale item without rewriting the history of the
screen the person just read. Unavailable refreshes keep Back available
and show a short unavailable state, never a fabricated empty queue.

This keeps the prototype's title→detail→Back choice, as requested, despite
the inline-navigation restriction reported in its research. Expanding
details beneath the slide would keep the queue visible, but would also
keep its controls beside an unrelated detail and grow the frame. Moving
every short question into full screen would preserve a single inline
surface, but add a host transition to a small reading task. Replacing
the card's content gives short details one return point; full screen is
reserved for the records that need its space. This is a deliberate design
choice, with actual host acceptance still owed by the implementation.

## Screens and their controls

Back is navigation. The act column below lists only writes. Plain reading
links, such as a change's Diff, stay in the view and use app-to-server
calls. No screen offers an act belonging to another screen.

| Screen | Visible facts | Reads | Acts |
| --- | --- | --- | --- |
| Carousel | One title, summary, actor, position | Previous, Next, title | None |
| Question | Exact text version, proposer and controller, alternatives | Back; full record when needed | Approve that text; Request revision |
| Approved question | Exact approved text and approval record | Back; full record | Record decision, when authorized |
| Work and terms | Exact conditions version, the named agent and controller, current commitment | Back; full record | Only the current offer, acceptance, revision or settlement allowed by the record |
| Change awaiting review | Version, exact integration, proposer, file delta, checker result | Back; Diff; comparison with the prior version | Approve that version and Request changes, when checks and requested review allow |
| Change with failed checks | Same change identity and failed checker result | Back; Diff | Request changes; no approval |
| Approved change | Exact approved integration and approvals | Back; Diff | Publish only when its current conditions permit |
| Publication outcome unknown | Original request identity, exact version and integration, current knowledge | Back | Check original request |
| File, Diff or Interdiff | Exact endpoints, file path, completeness and line numbers | Back | None |
| Updates | Every listed entry, grouped by scope, exact before/through ranges | Back | Mark reviewed |
| Receipt | One short accepted or refused result and its record identity | Back | None |

Request revision and Request changes can prefill a chat draft for the
person to edit and send. They do not submit an invented reason. A click
that prepares that draft is not shown as a completed act.

Approving question text v2, recording the decision, revising conditions,
offering those conditions and an agent accepting them remain separate
records. The compact presentation does not collapse them into one act.
An unknown publication offers no new publication or automatic retry.

## Receipts, old cards and the next item

An act binds the displayed subject, text or change version, and read
identity. The server checks them again when the person acts. An old view
refuses a changed target in one line, for example **Out of date: question
text is now v2.** It never approves the new version by substituting it.
The same protection applies to an older mounted copy in chat.

On acceptance, replace the acts with a one-line receipt, for example
**Approved question q7 text v2 · entry 246**. Send one short message to
chat, **✓ Approved question q7 text v2.** The model can acknowledge briefly
and open the next carousel card. It does not restate the question or its
alternatives. Keep the receipt visible while the next card loads. An act
failure keeps its subject open and sends no success message.

If the act succeeded but posting the chat message failed, preserve its
receipt and record identity. Recovery retries the notification, not the
act. Opening the next card supersedes older instances for writes. Their
receipts remain readable; their old actions remain unavailable. The kit
must prove that a duplicate click or notification cannot repeat a write.

## Data for the view and context for the model

The model-visible opening result contains only an opaque view handle,
item identity, screen kind and counts. The view obtains titles, bodies,
diffs, actors and histories through a tool callable only by the app. Do
not depend on a host keeping the initial `structuredContent` or `_meta`
private or delivering either intact to the view.

Navigation updates context quietly with the screen kind, opaque subject
identity, position, and available navigation. It starts no chat reply.
It includes no title, body, diff, actor details or full update history.
For example: **Question q7, text v2 is open. Back is available.** An act
receipt can disclose its short outcome and exact subject/version; it does
not disclose the card's body. Tool descriptions state what tools expose
and do. They do not instruct the model to answer in a particular style.

The prototype is a behavior reference. Its `tellModel` includes titles;
the card kit must use the narrower context above. Its receipt view lacks
Back; this design adds it. No prototype code is copied into the repository.
The prototype's research file reports host differences and published
guidance. This note adopts the requested behavior; it does not claim
that the prototype's observations prove support in every current host.

## Content height and full screen

Measure a dedicated content root's natural bounding box after rendering,
font changes and width changes. Report changes in both directions; a
previously tall iframe must shrink for a receipt or carousel. Do not use
the iframe's scroll height as the content's desired height. Do not use a
fixed minimum that preserves an earlier tall screen.

At a 560 px chat width, target a 170–220 px carousel and 260–400 px item.
At phone widths from 320 px, wrap titles, actor/controller lines, exact
commits and actions without horizontal page overflow. The summary is
one line on a slide; its full meaning is available when the item opens.
Do not shrink type or controls to force long content into those targets.
Receipt copy remains one short sentence, allowed to wrap on a phone.

A full record or long diff opens in full screen before it would overflow
the inline host's available content height. The updates detail likewise
uses full screen when all entries do not fit. The slide stays compact.
Full screen uses the host's content surface and safe-area insets with
one outer scroll area. Its Back returns to the same item and restores the
inline height. A host that refuses full screen gets a readable unavailable
transition and Back; it does not show a clipped record as a complete read.

These are design targets, not measured results. The kit must demonstrate
host resize and full-screen behavior. Static browser examples can only
prove their own content dimensions and layout.

## Visual language

Use the host's surface, text and border tokens. The reference light
surface is white; dark is `#121410`. Fallback ink is `#16180F` in light
and `#ECEAE2` in dark. Forest `#123F2B` remains the primary button fill
with white text; dark links use `#5FA880`. Muted text is `#6B6A5F` or
`#A3A295`. Validate contrast in the rendered examples rather than assuming
a host theme's tokens satisfy it.

System fonts avoid external font loads. Use 13, 15 and 18 px, regular and
semibold, with monospace for hashes, versions, ranges and code. Keep a
16 px content inset, fine separators, 6 px corners and 44 px controls.
Use the existing clipped lower-right corner on primary acts. Avoid a
second panel inside an item. Chat supplies the narration, so headings,
facts and controls do not repeat a page masthead or field labels.

People use a circle, agents a square, and checkers an outlined diamond.
Names and role text accompany the marks. Every agent names its controller.
Shape and color never replace text. Exact commits remain available in
the card; a phone wraps the full hash. No shortened identifier is the
only identity used for an act or a diff.

Compact graphics are selective. The unknown-request path distinguishes
request, missing reply and checking the original request. Check history
uses pass/fail symbols and text, not color alone. Updates may summarize
their actor sequence with a strip while retaining every entry below.
Do not present a combined timeline as a cross-scope total order. Its
groups retain scope identities and per-scope positions. A task path or
approval count appears only when the corresponding records are known;
missing records do not become completed steps.

## The same fictional records

Keep the landed design's synthetic commits, scope/incarnation identities
and review cutoffs. Change 9 is version 1, requested by Ari, with
integration `1faf54e188a46dd8edeb5ead4adb7f9fbee10fb4`. Its unknown outcome
does not prove publication. Change 18 version 2 integrates
`d664779063515feb27b0532f708970d1c4f68008`. Its two-line diff changes
**No tasks.** to **Nothing left to do.**

The seven-entry update cut is exactly:

| Scope | Entries | Actor and event |
| --- | --- | --- |
| Clear completed | 241 | Interface agent, controlled by Ari, reports button progress |
| Clear completed | 242 | Storage agent, controlled by Ari, asks for recoverable earlier tasks |
| Clear completed | 243 | Storage agent, controlled by Ari, blocks work on the history decision |
| Clear completed | 244 | Ari asks to compare keeping history with permanent deletion |
| Clear completed | 245 | Storage agent, controlled by Ari, revises the proposal to keep history |
| Change 18 | 18 | Interface agent, controlled by Ari, proposes version 2 |
| Change 9 | 9 | Ari requests publication of version 1 |

Mark reviewed advances only issue 240→245, Change 18 17→18 and Change 9
8→9 for those exact scope/incarnation identities. Newer entries remain
unreviewed. Reading, approved text, recorded decisions, settled work and
publication remain separate. A missing or truncated entry prevents the
screen from claiming that the complete listed range was reviewed.

The added failed-check example, Change 23, is also synthetic. It uses
`0c55e181938c5a841617b4901a124f084b0657f2` for a one-line change to
`test/storage.test.ts`; its two failures remove approval from that screen.
This identifier is a design fixture, not a local Git object.

## Concepts and remaining evidence

The [concept directory](2026-10-17-compact-cards-design/concepts/) contains
the primary carousel, opened question, failed/unknown changes, full
updates and diff/receipt examples. They establish the visual direction;
the static HTML examples must carry the exact fixture data above. The
initial carousel pagination and some initially generated actor/event
facts were corrected before retaining the concepts. Rejected drafts are
not part of this packet.

Before design review, produce light and dark HTML examples at 560 px chat
width and 390 px phone width, plus a 320 px layout check. Cover each
screen in the control table and the requested work/decision sequence.
Inspect focus, 200% text enlargement, full hashes, unavailable and stale
states, long titles, absent data, exact update ranges and all Back links.
Compare concept and browser images directly. Show tall→short and
short→tall content measurements without claiming an actual host test.

After capacity, the implementation slice must prove the resource and
bridge inside a test host: app-only details, quiet navigation context,
action receipt and next-card flow, superseded instances, duplicate writes,
rejected stale acts, full-screen transitions and resize in both directions.
The design review does not complete that runtime acceptance. No live
room, production act, provider call, push or deployment is part of this
checkpoint.
