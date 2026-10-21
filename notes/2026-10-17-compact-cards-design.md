# Compact journey cards in the AI app

Design revision, 17 October 2026. Request `a9551a6d`, guidance
`5eeea1be`, clarification `f89c614b`; design-only child `bc635338`,
promise `87dee083`; base Main
`95959b92`. This packet revises
the presentation in the [landed journey design](2026-10-17-journey-views-design.md).
Its facts and distinctions still apply. The examples are fictional. This
packet contains concepts, 57 static states in two themes, an interaction
specification and browser evidence. The checker approved exact head
`af050668`, and the planner read `8606d518` is met. The design landed at
`df806354` and closed design child `bc635338` only. The generic runtime
code landed at `6e309b6b`. Parent `a9551a6d` and its promise `3710cde8`
remain open for desktop and S2 acceptance.

The card shows one thing that needs the person. Clicking its title opens
its detail in full screen. An act advances the card in place and records
a short receipt in model context. Chat messages accompany an explicit
handoff to the model.

The kit is generic. Its card takes an item kind, displayed revision,
actor chip, reasons this person is needed, at most two revision-bound
acts, a one-line model context and a useful text fallback. Needs you,
Work, Decision and Change compose this card; the kit knows no lane types.

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

The inline card remains a summary. Title→detail→Back uses the host's
full-screen transition, as clarification `f89c614b` requires. Back closes
full screen and restores the refreshed summary and its return point.
Actual host acceptance remains owed by the implementation.

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

On acceptance, advance the card in place and record a one-line receipt,
for example **Approved question q7 text v2 · entry 246**, through
`ui/update-model-context`. Keep that receipt visible while the next card
loads. Send `ui/message` only when the person explicitly hands off to the
model; an ordinary act starts no chat turn. An act failure keeps its
subject open and emits no success receipt. Free text goes to the host's
composer rather than an input field inside the card.

If the act succeeded but reporting its model context failed, preserve its
receipt and record identity. Recovery retries the notification, not the
act. Opening the next card supersedes older instances for writes. Their
receipts remain readable; their old actions remain unavailable. The kit
must prove that a duplicate click or notification cannot repeat a write.

## Data for the view and context for the model

Every view tool returns useful text for a host without views. The
model-visible opening result contains item identity, revision, screen
kind and counts, plus that short fallback. The view obtains titles, bodies,
diffs, actors and histories through a tool callable only by the app. Do
not depend on a host keeping the initial `structuredContent` or `_meta`
private or delivering either intact to the view.

Navigation updates context quietly through `ui/update-model-context` with
the item, exact displayed revision, entry positions read, who it waits on,
what settles it, and available navigation. It starts no chat reply.
The context distinguishes a projection read point from journal entries
actually read and presented. Intended review cutoffs are a separate field.
A summary card claims no entry bodies; an incomplete update detail claims
only its six available entries, with Change 9 entry 9 explicitly missing.
The incomplete example offers no review act. Static links write no review
point, including the complete example's Mark reviewed link.
It includes no title, body, diff, actor details or full update history.
For example: **Question q7, text v2 is open. Back is available.** An act
receipt can disclose its short outcome and exact subject/version; it does
not disclose the card's body. Tool descriptions state what tools expose
and do. They do not instruct the model to answer in a particular style.
The S2 witness must show that a subsequent model act binds to the same
revision named by the card's current context.

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

A full record, question detail, diff or updates detail opens in full
screen. The inline slide stays compact.
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

Use host style variables for typography, spacing, borders and corners;
load no custom fonts. The initial concepts' 13, 15 and 18 px sizes are
fallback references, not overrides of the host's type scale. Monospace
distinguishes hashes, versions, ranges and code. Keep 44 px targets.
Brand colour is an accent only. Avoid a
second panel inside an item. Chat supplies the narration, so headings,
facts and controls do not repeat a page masthead or field labels. Show no
wordmark where the host already supplies the app name.

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

Storage's v2 offer is entry 252. Its linked earlier v1 acceptance is entry
224 and names Storage offer 222; it does not accept the new offer. The
fixture supplies no later Storage acceptance. Interface's v2 acceptance
253 remains linked only to Interface's offer path.

## Static examples and browser evidence

The [concept directory](2026-10-17-compact-cards-design/concepts/) contains
the primary carousel, opened question, failed/unknown changes, full
updates and diff/receipt examples. They establish the visual direction;
the [light examples](2026-10-17-compact-cards-design/examples/index-light.html)
and [dark examples](2026-10-17-compact-cards-design/examples/index-dark.html)
carry the fixture data above. The
initial carousel pagination and some initially generated actor/event
facts were corrected before retaining the concepts. Rejected drafts are
not part of this packet.

The initial queue has five items whose fixture states can coexist.
The two work offers appear in a later two-item queue, after the separate
decision and conditions revision. The concept's illustrative `1 / 7`
therefore becomes `1 / 5`; the shape and layout stay the same. Approval
advances the question to its decision state rather than jumping past that
decision into later work. The exact Change 12 interdiff remains separate
from Change 18's two-line empty-list diff.

Clarification `f89c614b` also changes two concept details: an ordinary act
updates the card and context without adding a chat message, and detail
uses full screen with Back. Structural spacing and typography use host
tokens with local fallback values. The retained images precede these
changes; the HTML examples are the current specification.

The flow checked is carousel → title → detail → Back → same position,
then approval → receipt → refreshed question → decision → clamped next
item → exact-version Diff → nested Back. Other checks cover unknown
publication recovery, failed-check draft identity, complete update ranges,
receipt-context retry, and disabled stale or unauthorized acts.

The Browser plugin was not available. Existing Playwright 1.63.0 and an
isolated headless Chrome checked 114 pages at viewport widths 592, 390
and 320: 342 combinations. The first width gives the chat surface 560 px
after its outer insets. Page identities match, content is present, links
resolve, warning/error consoles are empty, and there is no horizontal
overflow. All 654 measured controls meet both 44 px dimensions. The
dedicated card root measures
204 px for the initial carousel, 364 px for phone question detail, and
259 px for its receipt. The return to the carousel measures 204 px again.

Five detail/receipt states fit at 200% text. A focused 320 px check covers
keyboard focus and a separately labelled long-title/controller stress
fixture. The sampled title, summary and controller text has a minimum
contrast ratio of 5.65:1. Those samples precede the review repairs; their
palette and typography are unchanged. The retry
snapshot retains approval entry 246 and offers only a receipt update.

[Browser evidence](2026-10-17-compact-cards-design/verification/browser-report.json),
[focused accessibility evidence](2026-10-17-compact-cards-design/verification/accessibility-report.json)
and selected screenshots are retained with the exact harnesses and file
hashes. The current browser report seals all rendered inputs and its
harness. [Review corrections](2026-10-17-compact-cards-design/verification/review-corrections.json)
record F1–F3 from review `5f8906d5`: accurate coverage context, Storage's
own acceptance link, and both target dimensions. The earlier report at
`85ee5778` checked only height; 36 of its 648 targets were too narrow.
That pass is superseded and establishes no 44×44 result.
Model-context objects in the manifest are design data. Missing standalone
scope positions remain explicit; they are not made-up journal evidence.

These are local browser results for fictional static snapshots. The
preview links carry a local return point and focus; full screen is a
separate example page. They prove no host transition, live refresh,
server-side duplicate protection, model act, signing or real receipt.
The context and resize contract still needs the S2 test-host witness.

The generator is [build.py](2026-10-17-compact-cards-design/build.py).
This branch changes documents and their static examples only. Source and
tests are unchanged from Main `95959b92`, tree
`25f0f778edfb5f93863fc1acff0bb7627229af14`. The candidate tree is recorded
in its exact-head Gitseq artifacts. Under `docs/testing.md`, no whole gate
is repeated for this document-only revision; no inherited gate pass is
claimed for the unresolved runtime or harness work.

After capacity, the implementation slice must prove the resource and
bridge inside a test host: app-only details, quiet navigation context,
action receipt and next-card flow, superseded instances, duplicate writes,
rejected stale acts, full-screen transitions and resize in both directions.
The design review does not complete that runtime acceptance. No live
room, production act, provider call, push or deployment is part of this
checkpoint.

The S2 browser rehearsal compares this in-place/context receipt flow with
the prototype's message-per-act loop. Record which one it keeps and why;
the current design follows clarification `f89c614b` pending that evidence.
S0 owns the `inguz.space` sandbox domain and proxied apex/wildcard records.
A resource's `_meta.ui.domain` identifies its `<id>.inguz.space` origin.
The kit reads CSP from each package resource's metadata, rather than
substituting a hard-coded empty policy; the journey's views declare none.
The later dap web host remains outside this design and S2 kit slice.
