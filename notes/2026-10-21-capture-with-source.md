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

A package declares the capture acts. The platform gives them the field
types and the rules below, and nothing more.

| Field | Type | Content |
|---|---|---|
| `statement` | `enum`: `document`, `reading` | What the capture is (section 3). |
| `file` | `file` | The bytes, for a binary or large document. |
| `text` | `text`, detached, at most 64 KiB | The text, for a message, an issue body or a reading. |
| `name` | `text`, at most 255 bytes | The original file name or title. |
| `channel` | `text`, at most 64 bytes | The channel: `chat`, `file`, `email`, `github-issue`, `github-comment`, `local-branch`, and others. |
| `address` | `text`, at most 1,024 bytes | Where the source is: a URL, a message ID, a path. |
| `external` | `text`, at most 512 bytes | The external identity (section 5). Optional for a chat upload. |
| `revision` | `digest` | The digest of this version's content projection (section 5). |
| `base` | `text`, at most 128 bytes | What the content was made against, such as a base commit. Provenance only. |
| `author` | `text`, at most 256 bytes | The author as the source states it, such as a GitHub login. It is text, never a member. |
| `observedAt` | `time` | When the capturer read the source. |
| `sourceTime` | `time` | The source's own update time, when the channel gives one. Order and display only; never part of the revision. |
| `derivedFrom` | `list`, at most 32, of `fact` of kind `capture`, `recapture` or `read` | The exact versions that a reading or a derived file comes from. |
| `proposal` | `fact` of kind `propose-manifest` under `change` | For a local branch: the proposal's manifest fact. Provenance only. |

A capture holds exactly one of `file` and `text`. The entry's own time and
signer say when the room recorded the capture and who captured it. The
retained files note names four capture fields (its section 10). `file` and
`name` stay as they are. `source` becomes `channel` with `address`.
`derivedFrom` stays, as references to exact versions.

**Items.** The capture acts work in one shared scope of the room, the
capture scope. The package installs that scope once for each room. A shared
scope is needed for deduplication: each issue is its own scope, so a guard
inside an issue cannot see another issue (`apps/room/lanes/src/issue.ts:23`).
Each act opens at most one item, as every act does today
(`packages/contract/src/definition.ts:93-104`). The capture scope has two
item types:

| Item | Opened by | States | Holds |
|---|---|---|---|
| `source` | `capture` or `read`: one for each channel and external identity, chat upload or reading | `open`, `withdrawn` | `channel`, `external`, `address`, every field of the first version, and the current version: `current` (its fact), `currentRevision` and `currentTime` |
| `version` | `recapture`: one for each later version | `kept` | a ref to its source, and every field of the version |

The first version of a source is the `capture` or `read` that opened it.
Each later version is a `recapture`.

**Acts of the capture scope.**

| Act | Effect |
|---|---|
| `capture` | Opens a `source` with its first version, which is current. Refused `already-captured` when a source with the same `channel` and `external` exists, in either state (section 5). A chat upload with no `external` is never refused for this. |
| `recapture` | Opens a `version` of an `open` source, and makes it current. Refused `withdrawn` when the source is withdrawn. Refused `same-revision` when the source's first version, or any of its versions, has the same `revision`. Refused `stale` when `sourceTime` is earlier than the source's `currentTime`. |
| `observe` | Makes an existing version of an `open` source current again, named by its fact, with the observation's `sourceTime`. Opens no item. Refused `withdrawn`, `already-current` when that version is current, and `stale` when `sourceTime` is earlier than `currentTime`. |
| `read` | Opens a `source` with `channel: reading`, no `external`, and `statement: reading`. `derivedFrom` is required. |
| `withdraw` | Sets a source `withdrawn`. Its versions stay. |
| `reopen` | Sets a withdrawn source `open` again. It needs the action `capture.manage` (section 4). No connector delivery reopens a source. |
| `redact` | Removes the file or text of one version: the first version's, on its source, or a later version's, on its version item. This is the redaction of any detached input (retained files, section 3). |

Each act opens one item in one entry. So an interrupted delivery leaves no
half-made source. The scope judges one act at a time. When two first
deliveries of one source arrive together, the first `capture` opens the
source, and the second is judged after it and refused `already-captured`.

**Exact versions.** Each version is the entry that opened it: a `capture`,
`recapture` or `read`. A reference to a version is a fact reference: scope,
position and hash (`packages/contract/src/scope.ts:65`). It names that
entry, and nothing changes it. A later `recapture` adds a new version and
leaves the old reference as it was. A `redact` removes the bytes, and the
reference still names the version; a read of it answers `redacted`.
`derivedFrom` and the issue's `captured` field (section 7) hold such
references. A fact field lists its kinds under one definition
(`packages/contract/src/definition.ts:71`), so both name the three kinds
under the capture package's definition.

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

- **Actions.** The package declares two actions. `capture.take` allows
  `capture`, `recapture`, `read` and `redact` of one's own versions; its
  default roles are `admin`, `maintainer`, `member` and `agent`.
  `capture.manage` allows `withdraw` and `reopen`; its default roles are
  `admin` and `maintainer`. An admin can change
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
  `capture` and `recapture` (`notes/2026-10-21-roles-flow-and-instances.md`,
  section 2, request `89a543d3`).
- **What the record shows.** Every capture entry keeps the member, the key
  and the controller (`packages/contract/src/observation.ts:17-32`).
- **Revocation.** Retiring the connector's key stops its captures. Removing
  the member, or its controller, stops every act of it
  (`packages/derive/src/grant.ts:311`). Earlier captures stay.

## 5. Deduplication and echoes

**One source for each external identity.** A `capture` with an `external`
value opens a source only when no source has the same `channel` and
`external`, open or withdrawn. The guard is:

```ts
{ none: { type: "source", states: ["open", "withdrawn"],
          where: [{ equals: { a: { slot: "channel" }, b: { field: "channel" } } },
                  { equals: { a: { slot: "external" }, b: { field: "external" } } }] },
  reason: "already-captured" }
```

This is the form the change lane uses for links (`apps/room/lanes/src/change.ts:1213`).
A connector that receives a known source reads `already-captured`. It then
signs `recapture` when the source's `revision` is new.

**Content once, observations in order.** A source's content is stored once
for each revision, and its current state is a separate record:

- **New content.** A revision that no version of the source holds is a
  `recapture`. It opens a version and makes it current.
- **Content seen before.** A revision that an earlier version holds, and
  that is not current, is a return to old content: an issue reopened, or a
  comment edited back. `recapture` is refused `same-revision`, so the
  content is not stored twice. The connector then signs `observe`, naming
  that version's fact. The journal records the return, and the source's
  current version changes.
- **A redelivery.** A revision that is current already is a redelivery,
  exact or with only new delivery metadata. `recapture` is refused
  `same-revision`, and `observe` is refused `already-current`. Nothing
  changes.
- **Order.** `recapture` and `observe` are refused `stale` when their
  `sourceTime` is earlier than the source's `currentTime`. So a delayed
  delivery of old content never overwrites a later state. The order lives
  in the source item, and a restart keeps it.

The `same-revision` check is two guards: the field `revision` differs from
the source's own first `revision`, and a `none` over `version` items whose
source is this source and whose revision equals the field. A withdrawn
source refuses both acts with `withdrawn`, so no delivery revives it.

**What a revision is.** The revision is the digest of the version's
captured content: the SHA-256 of the canonical JSON of a content projection
that each channel states. Delivery metadata never enters it: no delivery
ID, request ID, journal reference or update time.

| Channel | Content projection |
|---|---|
| `github-issue` | `{ title, body, state, labels }`, with `labels` sorted |
| `github-comment` | `{ body }` |
| `email` | the digest of the raw message bytes |
| `local-branch` | `{ base, files }` (section 6, journey 2) |
| `chat`, `file` | the digest of the file's bytes |
| `reading` | the digest of the reading's text or file |

So two versions with the same revision have the same captured content, and
a change to any field of the projection gives a new revision. The source's
own update time goes in the field `sourceTime`, for order and display only.
A source can change twice within one update time, and the content digest
still tells the two versions apart.

**Withdrawal.** A withdrawn source keeps its channel and external identity.
A redelivery of it is refused `already-captured`, and a new revision is
refused `withdrawn`. So a connector's routine replay never brings
withdrawn work back. A person who holds `capture.manage` signs `reopen`.
After that, a new revision is a new version of the same source.

**Deliveries.** A connector records the delivery ID and the payload digest
before it answers its channel. It treats an event as a signal to read the
source again, not as an ordered journal
(`notes/2026-10-15-github-repository-import.md:256-262`).

**Echoes.** When the room writes to a channel, through the outbox (section
6, journey 4), the outbound act records the external revision that the
write produced: the digest of the content projection that the write
leaves at the source. A later capture of that revision is an echo. The connector
reads the source's recorded outbound revisions, and signs no `recapture`
and no `observe` for an echo (`github-repository-import.md:273-274`).

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
   from a branch also signs a capture with `channel: local-branch`. Its
   `external` is the room's directory scope ID with the branch name, so the
   identity is qualified by the repository. Its `base` is the base commit
   that `dap propose` read the files against (`commands.ts:1578-1589`).
   Its `revision` is the SHA-256 of the canonical JSON of the content
   projection `{ base, files }`. `files` lists `{ path, digest, size }` for
   each changed file, sorted by path, with the digest of the file's bytes.
   The projection holds no journal reference and no request ID: the
   manifest that `dap propose` sends names a new fact for each file
   (`commands.ts:1648-1663`), so its own digest changes on every run. The
   proposal's manifest fact goes in `proposal`, as provenance. Two runs of
   `dap propose` with the same files on the same base give the same
   revision, and the second capture is refused `same-revision`. A change to
   one file gives a new revision and a new version. Durable intent
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
  `captured`: a fact of kind `capture`, `recapture` or `read` under the
  capture package's definition, naming the exact version (section 2). Today `file` has no source field
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

## 10. Witnesses

1. **Exact versions.** Capture v1 of a source. Recapture v2. A reading R1
   of v2 names the `recapture` fact. A reading R2 of R1 names the `read`
   fact. Then recapture v3, and redact v2. R1 still names v2, and R2 still
   names R1. A read of v2 answers `redacted`. An issue filed with
   `captured` naming v2 keeps that reference.
2. **Content once.** After v3, a recapture of v2's revision is refused
   `same-revision`. An `observe` naming v2 makes v2 current again, and no
   version opens. A delivery that repeats the current revision changes
   nothing.
3. **Withdrawal.** Withdraw a source. A redelivery of its external identity
   is refused `already-captured`. A genuine new revision is refused
   `withdrawn`. After `reopen` by a member with `capture.manage`, the new
   revision is a new version of the same source.
4. **Local branch.** Two independent runs of `dap propose` on one base and
   branch, with the same files, give the same revision. The second capture
   is refused `same-revision`, and both proposals stay in the change lane.
   A third run with one file changed gives a new revision and a new
   version of the same source.
5. **Guards.** An imported email that says the sender will start Monday
   satisfies no condition that needs the sender's own act. A capture's
   `author` matches no member.
6. **One item for each act.** Two first deliveries of one source arrive
   together. One source opens, with the first `capture` as its first
   version, and the other is refused `already-captured`. A delivery stopped
   before its capture takes effect leaves no source. A delivery stopped
   after its capture takes effect leaves a complete source, and the caller
   learns the outcome by reading it.

## 11. Slices

The slices start after retained files RF1 to RF4.

| Slice | Content | Done when |
|---|---|---|
| CS1 | The capture package: the capture scope, the `source` and `version` items (one opened per act), the acts and actions of sections 2 and 4, the deduplication guards, statement kinds, and the `notify` attention. RF4's minimal capture package becomes this package. | Journey 1 runs on a hosted Worker. Witnesses 1, 2, 3, 5 and 6 of section 10 pass. |
| CS2 | The issue lane's `captured` field in a new lane version, and the source line in the room's views. | An issue filed from a capture shows its source line, and the capture stays the capturer's act. |
| CS3 | The local-branch capture with `dap propose`. | Witness 4 of section 10 passes. |
| CS4 | The GitHub inbound connector package: the connector member and preset, the host's read credential, delivery records, watermark reconciliation, the content projections of section 5, `observe`, and issue filing from captures. | A test repository's issues and comments arrive once each. An exact redelivery, and a redelivery with only new delivery metadata, change nothing. Two observations with the same external identity and update time but different bodies are two versions. An issue observed open (A), closed (B) and reopened to the same content (A), with a restart before the reopen, ends with A current, two versions and three source entries; a duplicate delivery of the first A changes nothing, and a delayed delivery of A with an earlier update time is refused `stale`. A close on GitHub does not close the room's issue. |

Each slice is reviewed and landed before the next one starts.
