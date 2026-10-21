# Capture with a stated source

Design note. Proposed: nothing here is built.

Work reaches a room from many places. A person drops a PDF into their own
chat. A phone photo shows a crack in a wall. A GitHub issue asks for a fix.
A local branch holds a change made on a train. Each of these is something
that came from outside the room, with an author, a time and a place it came
from.

This note gives one act for all of them: a capture with a stated source.
The participant who holds the channel signs it: a person's own AI app, or a
connector agent that a person controls. The capture keeps the bytes or the
text unchanged, says where they came from, and never claims more than that.
What the room does with them is a separate act, judged by the room's own
rules.

## 1. Terms

- **Statement kinds.** The record keeps three kinds of statement apart
  (`docs/use-cases.md:47-61`):
  - **own**: what a member says themselves, in their own act;
  - **document**: bytes or text brought in unchanged, with where they came
    from;
  - **signed act**: an act that another party signs as a member of the
    room, or a fact of another scope.
- **Reading**: what a participant concludes from a document, such as an OCR
  result, a transcript or a summary. A reading is the reader's own
  statement, attributed to the reader. It never turns the document into the
  other party's act (`docs/use-cases.md:55-58`).
- **Capture**: the act that brings a document or a reading into the room.
- **Channel**: the place a capture came from: a chat upload, a file, an
  email, a GitHub issue, a local branch.
- **External identity**: a stable name of the source object in its channel,
  such as a GitHub repository ID with an issue node ID, or an email message
  ID.
- **Connector**: an agent member, with a person as its controller, whose
  acts are captures from one channel (`packages/platform/src/membership.ts:415-451`).
- **Retained file**: a file input of an act, kept by digest
  (`notes/2026-10-21-retained-files.md`).

## 2. Capture act

A package declares the capture act. The platform gives it the field types
and the rules below, and nothing more.

| Field | Type | Content |
|---|---|---|
| `statement` | `enum`: `document`, `reading` | What the capture is (section 3). |
| `file` | `file` | The bytes, for a binary or large document. |
| `text` | `text`, detached, at most 64 KiB | The text, for a message, an issue body or a reading. |
| `name` | `text`, at most 255 bytes | The original file name or title. |
| `channel` | `text`, at most 64 bytes | The channel: `chat`, `file`, `email`, `github-issue`, `github-comment`, `local-branch`, and others. |
| `address` | `text`, at most 1,024 bytes | Where the source is: a URL, a message ID, a path. |
| `external` | `text`, at most 512 bytes | The external identity (section 5). Optional for a chat upload. |
| `revision` | `text`, at most 128 bytes | The source's own revision or update time, when the channel gives one. |
| `author` | `text`, at most 256 bytes | The author as the source states it, such as a GitHub login. It is text, never a member. |
| `observedAt` | `time` | When the capturer read the source. |
| `derivedFrom` | `list` of `fact` of kind `capture`, at most 32 | The captures that a reading or a derived file comes from. |

A capture holds exactly one of `file` and `text`. The entry's own time and
signer say when the room recorded the capture and who captured it. The
retained files note names four capture fields (section 10). `file` and
`name` stay as they are. `source` becomes `channel` with `address`.
`derivedFrom` stays, limited to facts of kind `capture`. A fact field lists its kinds under one definition
(`packages/contract/src/definition.ts:71`), so `derivedFrom` names only
captures of the same package.

**Item.** A capture opens a `capture` item in one shared scope of the room,
the capture scope. The package installs that scope once for each room. The
item keeps the latest file or text, its revision, and the list of earlier
versions. A shared scope is needed for deduplication: each issue is its own
scope, so a guard inside an issue cannot see another issue
(`apps/room/lanes/src/issue.ts:23`).

**Acts of the capture scope.**

| Act | Effect |
|---|---|
| `capture` | Opens a `capture` item. Refused `already-captured` when an open item has the same `channel` and `external` (section 5). |
| `recapture` | Adds a new version to an existing item: a new file or text, a new `revision`. Refused `same-revision` when the revision equals the item's latest. |
| `read` | Opens a `capture` item with `statement: reading`. `derivedFrom` is required. |
| `withdraw` | Closes an item. A withdrawn item stays in the journal. |
| `redact` | Removes the bytes or the text of one version, as for any detached input (retained files, section 3). |

## 3. What a guard can conclude

A capture is always the capturer's act. Its signer is the member who
captured it. Its content is a claim about a source.

- From a **document** capture, a guard can conclude that this member brought
  these bytes into the room at this time. It can also conclude that the
  member said they came from this channel, address and author. It cannot conclude that the author agreed to
  anything, or that the source still says the same.
- From a **reading**, a guard can conclude that this member stated this
  reading of the named captures. It cannot conclude that the reading is
  right.
- From a **signed act**, a guard can conclude what that member did. Only a
  signed act can satisfy a condition that needs a party's own act: an
  acceptance, a commitment, a review.

So a capture never satisfies a condition that needs a member's own act. A contractor's
email that says "I can start Monday" is a document, once imported.
The contractor's commitment is the contractor's own act, when the contractor
joins the room and signs it.

The `author` field is text. No guard compares it with a member. A capture
that names a GitHub login gives that login no grant, no key and no item
(`notes/2026-10-15-github-repository-import.md:218-220`).

A person judges an issue's conditions with `judge` (`issue.judge`,
`issue.ts:330-331`), and can cite captures as evidence in `judgeEvidence`
(`issue.ts:26-51`). The
judgment is the person's own act.

## 4. Who captures

- **Action.** The package declares the action `capture.take`. Its default
  roles are `admin`, `maintainer`, `member` and `agent`. An admin can change
  the room's roles, as for any package (`notes/2026-10-15-self-contained-applications.md:241-243`).
- **A person's own AI app.** The app signs with the person's key, or with
  the key of an agent member that the person controls. The capture shows
  that member and key.
- **A connector.** An agent member with a person as its controller, and a
  handle that names its channel, such as `@github-dap`. The host keeps the
  channel's credential, such as a GitHub read token. The connector signs
  captures and nothing else. The agent roster role holds more actions
  (`membership.ts:100-114`), and every agent shares one list
  (`membership.ts:472-478`). A narrower list for connectors needs a later
  membership version. Until then, the connector's role preset performs only
  `capture`, `recapture` and `withdraw` (`notes/2026-10-21-roles-flow-and-instances.md`,
  section 2, request `89a543d3`).
- **What the record shows.** Every capture entry keeps the member, the key
  and the controller (`packages/contract/src/observation.ts:17-32`).
- **Revocation.** Retiring the connector's key stops its captures. Removing
  the member, or its controller, stops every act of it
  (`packages/derive/src/grant.ts:311`). Earlier captures stay.

## 5. Deduplication and echoes

**One item for each source.** A capture with an `external` value opens an
item only when no open item has the same `channel` and `external`. The
guard is:

```ts
{ none: { type: "capture", states: ["open"],
          where: [{ equals: { a: { slot: "channel" }, b: { field: "channel" } } },
                  { equals: { a: { slot: "external" }, b: { field: "external" } } }] },
  reason: "already-captured" }
```

This is the form the change lane uses for links (`apps/room/lanes/src/change.ts:1213`).
A connector that receives the same source twice reads `already-captured`,
then signs `recapture` when the source's `revision` is new. A repeated
delivery of one revision is refused `same-revision`, and changes nothing.

**Deliveries.** A connector records the delivery ID and the payload digest
before it answers its channel. It treats an event as a signal to read the
source again, not as an ordered journal
(`notes/2026-10-15-github-repository-import.md:256-262`).

**Echoes.** When the room writes to a channel, through the outbox (section
6, journey 4), the outbound act records the external revision that the
write produced. A later capture of that revision is an echo. The connector
reads the item's recorded outbound revisions, and signs no `recapture` for
an echo (`github-repository-import.md:273-274`).

**Authority.** A change of state at the source is an observation. A GitHub
issue closed on GitHub does not close the room's issue. The room's own act
applies only when its own guards pass. Otherwise the room shows the
external state beside the local one (`github-repository-import.md:313-319`).

## 6. Journeys

The journeys run in this order.

1. **A file in a chat session.** A person, in their own AI app, captures
   drawings and photos into a room as `document` captures, with `channel:
   chat`. They invite a second person, whose agent reads them. This is the
   matter room of use cases 29 and 30 (`docs/use-cases.md:433-469`), and the
   exit test of this note.
2. **A local branch.** `dap propose` sends a local branch's changed files
   as a proposal (`packages/cli/src/commands.ts:1578-1579`). A proposal made
   from a branch also signs a capture with `channel: local-branch`,
   `address` the branch name and `revision` the base commit. Durable intent
   recovery while offline stays with the offline design
   (`notes/2026-10-09-offline-and-sync-design.md`, section 8).
3. **GitHub issues inbound.** A connector package captures a repository's
   issues and comments, with `external` the repository ID and the issue or
   comment node ID, and `author` the GitHub login. It files a room issue
   from each new issue capture, with the capture as the issue's source
   (section 7). It reconciles from a watermark, as the import note says
   (`github-repository-import.md:235-243`).
4. **An outbox to GitHub.** The room's comments and closes go to GitHub as
   outbound operations. Each is recorded before it is sent, and a lost
   answer is unknown until reconciled (`docs/roadmap.md:243-246`). This
   journey is a follow-up (section 9).
5. **Other channels.** Slack and Linear use the same capture act through
   their own connectors. They are follow-ups.

## 7. What the room shows

- **Source line.** A captured item, and an issue filed from a capture, show
  one line: the channel, the author as stated, the capturer, and the time,
  for example "From GitHub issue #42 by @alice, captured by @github-dap,
  10:14". The line links to the capture.
- **Issue source.** The issue lane's `file` act gains an optional field
  `captured`, a fact of kind `capture`. Today `file` has no source field
  (`issue.ts:184-208`). This needs a new issue lane version.
- **Needs you and since.** A capture names the room's triagers in a
  `notify` attention, so that it reaches their inbox
  (`packages/platform/src/inbox.ts:1-5`). The Needs-you and since views
  list it when they are built: they are a design today
  (`notes/2026-10-17-journey-views-design.md:187`, `:215-229`).

## 8. Captures as evidence

Outside evidence enters the room as a capture. The
evidence rules note governs checks before a change lands
(`notes/2026-10-16-evidence-rules-design.md`). A check result is a signed
`check` act, and its `source` names the kind of signer: room, outside or
member (`evidence-rules-design.md:97-114`). A CI result brought in as a
capture is a follow-up. It would need a rule that reads a capture of a named
connector as an `outside` result.

## 9. Not in this note

- The outbox to GitHub (journey 4).
- Slack and Linear connectors.
- CI results as captures.
- A narrower roster role for connectors.
- Two-way field merge for imported issues (`github-repository-import.md:296-298`).
- The matter room's package beyond the capture scope.

## 10. Slices

The slices start after retained files RF1 to RF4.

| Slice | Content | Done when |
|---|---|---|
| CS1 | The capture package: the capture scope, the `capture` item, the acts of section 2, the deduplication guard, statement kinds, and the `notify` attention. RF4's minimal capture package becomes this package. | Journey 1 runs on a hosted Worker. A repeated capture of one external identity is refused `already-captured`, and a repeated revision `same-revision`. A reading without `derivedFrom` is refused. |
| CS2 | The issue lane's `captured` field in a new lane version, and the source line in the room's views. | An issue filed from a capture shows its source line, and the capture stays the capturer's act. |
| CS3 | The local-branch capture with `dap propose`. | A proposal from a branch records a capture with the base commit, and a repeated proposal of one base and branch is refused `same-revision`. |
| CS4 | The GitHub inbound connector package: the connector member and preset, the host's read credential, delivery records, watermark reconciliation, and issue filing from captures. | A test repository's issues and comments arrive once each. A redelivery changes nothing. A close on GitHub does not close the room's issue. |

Each slice is reviewed and landed before the next one starts.
