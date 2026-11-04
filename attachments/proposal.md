# A hidden Question body can block a detail page that fits

The current adapter enforces the serialized card's 60 KiB limit correctly.
Its summary can nevertheless refuse a Question whose full detail fits,
because the summary includes both the hidden body and longer navigation
wording. The mounted view then offers no Open navigation.

Request `bd2b5337` asks for this read-only investigation. No product source,
Native fixture, or host configuration changed. Any implementation needs a
separate source child.

## The refusal occurs before the summary hides the body

At source `bf3bceb667e99876d2edc4880c3c337f944f5fbe`,
`apps/views/src/decision.ts` chooses `summary` for a Decision opening.
Lines 73–80 construct the full Question body and action captures, add
page-specific reasons, and measure the complete canonical card. The
summary's reason invites the person to open the card; the item's reason
is shorter. Both cards carry the same full body at this boundary.

`packages/mcp/src/views/session.ts` checks the projection's separate
64 KiB limit before it removes summary actions when `wholeText` is absent.
The browser shows a summary body only with `wholeText`, which requires at
most 600 characters and eight lines. A 60 KiB Question therefore consumes
the summary budget without displaying that body. Once the adapter returns
`incomplete` with no card, `ViewSessions` exposes no Open navigation.

The existing conservative refusal protects the byte bound and offers no
approval beside partial text. It does not establish that the detail text
is too large. The dead end comes from the two pages carrying different
serialized overhead before the person can reach the page that fits.

## The unchanged adapter distinguishes the failure offline

The sealed Goose observations retain the actual TEST Question 8/body
revision 9: a 60,659-byte body whose item card is exactly 61,440 canonical
bytes. The corrected Desktop opener reached dap's summary refusal. Its
earlier invalid top-level scope stopped before this boundary and remains
a separate observation. Neither result establishes a Goose size limit.

The new offline probe uses the production `decisionSource` and
`ViewSessions`, with the existing `j4-reads.golden.json` context as an
explicit stand-in. It verifies the source files against `bf3bceb6` and
forbids network and act calls. Only an in-memory copy's body varies.

In that scripted context, a 59,627-byte body yields a ready detail card at
exactly 61,440 bytes. The same summary returns `incomplete`, and its mounted
view has no Open navigation. An explicit item read of that same view
returns the complete body. The only card difference is the reasons array:
summary wording adds 51 bytes. One more body byte makes the item itself
incomplete. The probe exits 0 with zero network or act calls.

This reproduces the product transition at the adapter/session boundary.
It proves no Native judgment, host limit, provider behavior, or proposed
implementation.

## Proposed correction: budget the complete detail, then a compact summary

Keep the 60 KiB card and 64 KiB projection limits unchanged. From the one
complete Question context, build and budget the exact item card first,
including its complete body, actor, references, action captures, and item
reasons. If that card exceeds the limit, preserve the current incomplete
result and offer no act.

For a text that exceeds the first-card character or line limit but whose
detail fits, construct a navigation summary from that same context. Keep
the exact subject, revision, attribution, read points, and Open wording.
Omit the hidden body and native actions entirely. Check the summary's own
canonical size before returning it. Opening the item reads the complete
body and offers actions only with that complete text.

Keep the existing short-text behavior: the first card shows the whole
text and its permitted acts. Do not use an excerpt, a truncated body, a
wider budget, a special Goose path, or another scratch-body revision.
The adapter owns this page projection; the generic session keeps its
existing action and projection guards.

## Proposed boundary witness

Extend the existing Decision owner at the production adapter and mounted
session boundary. Use a complete scripted Question context and compute a
body whose item card is exactly 61,440 canonical UTF-8 bytes. Require the
normal summary opening to be ready, offer Open, contain no partial body,
and offer no native action. Open that same subject and require the exact
whole body and its expected actions, with unchanged subject/revision
binding. The unchanged source must fail the ready-summary assertion.

Add one body byte and require an incomplete result with no act on either
page. Include escaped or multibyte body text so the test measures canonical
UTF-8 bytes rather than character count. Retain the existing 600-character,
eight-line, and whole-text action guards; this correction does not need a
second browser suite or another host-size probe.

The implementation child must run the affected owner, the normal gate,
the applicable Card workflow, and checker review. The proposal itself
changes no source and runs no gate.

## Evidence

The new unit is
`~/play/artroom-evidence/2026-11-04-question-summary-budget-investigation`.
It retains the actual probe exit, source hashes, safe result, and driver.
The earlier actual observations remain in the sealed
`2026-11-03-goose-waits/card-limit-sizing.json`,
`2026-11-03-goose-waits/large-question-revised.json`, and
`2026-11-03-goose-waits-followup/large-card-result.json`.

The parent Goose report keeps its honest not-reached host-size result.
This request can close as a read-only investigation after the planner
ratifies the proposal; a source child must own any correction.
