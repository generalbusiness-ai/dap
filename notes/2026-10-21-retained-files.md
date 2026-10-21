# Retained files

Design note. Proposed: nothing here is built.

A room keeps a journal of signed acts. Some acts are about bytes that are not
text. Examples are a phone photo of a wall, a scanned quote, a PDF of a
drawing and a recording of a lesson. Today an act can carry a text of at most 64 KiB, and
nothing larger or binary. This note adds one kind of retained input for such
bytes: a file. It also gives a rule for where a file belongs: in the room as a retained
input, or in the room's repository as a published file.

The first user is a person who starts in their own chat. They capture
drawings and photos into a room, then invite a contractor. The contractor's
agent reads the same files in the room, with no email between them.

## 1. Terms

- **Journal**: a scope's ordered entries.
- **Act**: a signed intent that a scope judges. An act that takes effect
  becomes an entry.
- **Field** and **slot**: an act's declared input, and the item value that an
  effect writes from it.
- **Retained input**: bytes that an entry names by digest and that the scope
  keeps beside the journal. The kinds now are definition, entry, rule, text,
  snapshot and value (`packages/contract/src/read.ts:136`).
- **Byte domain**: the tag that a digest is computed under, such as
  `artroom-text-1` (`packages/contract/src/intent.ts:19`).
- **Detached**: a field whose value in the intent is a digest. Its bytes
  travel beside the intent, unsigned, and the scope checks them against the
  digest (`packages/contract/src/definition.ts:65`).
- **File**: a retained input of the new kind `file`. It is a sequence of
  bytes with a size and a media type, named by a digest in the byte domain
  `artroom-file-1`.
- **Keeper**: the store that holds file bytes for a deployment.
- **Repository**: the room's Git repository on Artifacts or GitHub. The
  room's destination writes to it, with a receipt for each write.
- **Published file**: a file at a path in the repository.
- **Member read session**: a read token for one repository. The membership
  scope issues it to an active key of an active member, for at most 600
  seconds (`packages/scope/src/sessions.ts:82`, `:355-380`).
- **Signed read**: a read that the reader signs for one request
  (`packages/scope/src/signed-reads.ts`).
- **Redaction** and **tombstone**: an act's `redact` effect removes the bytes
  that a detached slot held. The entry that redacts is their tombstone
  (`packages/contract/src/entry.ts:150`).

## 2. Retained or published

A room has two homes for bytes. The file kind extends one of them. It does
not add a third.

- The **journal** says what happened. Retained inputs hold the bytes that
  its entries name: what an act carried or depended on. They never change. A
  member reads them by digest. They have no paths and no history. A new
  version is a new digest, named by a new entry.
- The **repository** holds what the room publishes: its work product, as
  versions of one tree. Only the destination writes to it, with a receipt. A
  published file has a public address for anyone who holds the room's
  directory ID (`packages/scope/src/site/route.ts:44-45`). Members clone it,
  and reviewers read an exact version.

**Rule.** A file is retained when any of these is true:

1. An entry names it as an input or as evidence.
2. Only the room's readers can read it.
3. It never changes in place.
4. It is larger than the repository accepts: 32 MB for one blob
   (`packages/git/src/reader.ts:75`), and 1 GB for a repository on
   Artifacts.

A file is published when any of these is true:

1. It is a version of the room's work product.
2. It needs a public address or a clone.
3. A tree of paths is what reviewers read.

**Test.** Ask what the bytes are for. If an act depends on them, or only
members can see them, they are retained. If the room produces them for
others to read as a tree, they are published. Size alone never decides.
Where a retained file's bytes are kept is a keeper choice (section 4), and it
does not change what the file is.

**Why evidence is not published.** A published file is public to whoever
holds the directory ID. Each write is a destination commit with a
reservation and a receipt. The commit names the destination as author, not
the person who captured the file. The archive and the portable clone treat
private bytes as an export decision, never as a readable ref.

**Why work product is not retained.** Retained files have no paths in
relation to each other and no diff. They have no versions of one tree, no
public address and no clone.

**Both.** A file can be retained first, by a capture, and published later,
by an act that names the retained digest. Today the destination publishes
only an inline text of at most 64 KiB, carried by the `publish-file` message
from a lane (`packages/platform/src/destination.ts:2581-2585`). Publishing
from a retained file is a follow-up (section 13).

## 3. File field

A definition declares a file field so:

```ts
{ type: "file"; max: number; media?: readonly string[] }
```

- `max` is the largest size in bytes. It is at most the deployment's file
  maximum (section 7).
- `media` lists the accepted media types, such as `image/jpeg` or
  `application/pdf`. A type ending in `/*` accepts every subtype. With no
  `media`, every type is accepted.
- A file field is always detached. It has no default.

**Value in the intent.** The field's value is a file reference:

```ts
{ digest: Digest; size: number; media: string }
```

The act signs all three members. `digest` is the SHA-256 of the UTF-8 tag
`artroom-file-1`, one newline byte, then the file's bytes. This is the
construction of the other byte domains (`packages/bytes/src/domains.ts:13-24`),
with the raw bytes in place of canonical JSON. `size` is the number of bytes.
`media` is one media type, at most 255 bytes.

**Slot.** An effect copies the whole file reference into a slot of type
`file`. A reader of the item then knows the size and media type without a
keeper call.

**Who can read a file field.** Only the source of an effect can read it. A
guard, a rule, an index send, `collect`, and every send, a send to a lane
included, refuse a file field with `redactable-read`. This is the text rule
of `packages/derive/src/validate/sends.ts:34-56`, `operands.ts:172` and
`guards.ts:194-198`, with one change. A text can travel in a send to a lane,
and a file cannot. Lane delivery of files is a follow-up.

**Judgment.** The act is refused with `bad-field` when:

- the keeper does not hold the digest for this scope;
- the held size or media type differs from the reference;
- the size is above `max`;
- the media type is not in `media`.

**Redaction.** `redact` on a file slot removes the bytes. The recorded
effect lists them: `{ effect: "redact"; item; slot; texts; files }`, where
`files` lists every file digest that the slot held. The commit that seals
the tombstone also deletes each listed file from the keeper. This is the text
path of `packages/scope/src/turn.ts:400-401`. As for a text, the deletion
removes the bytes for every slot of the scope that holds the same digest.
The slot keeps its file reference, and a read of a redacted file answers
`redacted`.

## 4. Keeper

A keeper holds file bytes by scope, byte domain and digest. It has four
operations:

| Operation | Effect |
|---|---|
| `put(scope, digest, size, media, bytes)` | Streams the bytes in, computes the digest and size, and stores them only when both match. A file already held is not written again. |
| `get(scope, digest)` | Streams the bytes, with the size and media type. |
| `head(scope, digest)` | The size and media type, or absent. |
| `delete(scope, digest)` | Removes the bytes, for redaction and for the sweep (section 5). |

The key holds the scope. Two scopes that hold the same bytes hold two copies.
So a deletion in one scope never touches another scope.

**Implementations.**

1. **Scope SQLite.** A new table `retained_file (digest TEXT, size INTEGER,
   media TEXT, bytes BLOB, PRIMARY KEY (digest)) WITHOUT ROWID` in each
   scope's own store. It holds files up to the SQLite threshold (section 11).
   A deployment with no bucket keeps every file here, and its file maximum
   is that threshold.
2. **R2 on Cloudflare.** A new private bucket binding, `FILES`, separate
   from `APPLICATION_CONTENT`. The object key is
   `files/<scope>/<digest hex>`. Files above the SQLite threshold go here.
   There is no public route to the bucket.
3. **Self-hosted on celld.** celld serves an R2 binding from the fleet
   bucket, on Google Cloud Storage and on S3-compatible stores
   (`notes/2026-10-19-self-hosting-on-celld.md:172-182`). So the R2 keeper
   runs there unchanged, and a fleet without a bucket uses the SQLite keeper
   only.

A deployment has one keeper: SQLite below the threshold, and its bucket, if
bound, above it. A keeper for one room, such as a customer's own bucket, is
a follow-up.

**Moving a journal.** An entry names the byte domain and digest. It never
names the keeper. So a journal moved to another deployment needs its files
moved with it.

## 5. Write

A file reaches the keeper before the act that names it is judged. There are
two ways.

**Beside the intent.** The act's request body gains `files`: a list of
`{ media, bytes }`, with `bytes` in base64. This is for small files only. The
whole body is at most 1 MiB now (`packages/scope/src/worker.ts:247`), and
base64 adds a third. The scope takes at most one file for each file field
of the act, and computes each digest. A file beside the intent is never
above the SQLite threshold (section 11). So the scope keeps it in the commit
of the entry that names it, as it keeps a text, and a refused act leaves
nothing behind.

**Upload first.** For a larger file:

```
PUT /v1/scopes/:scope/retained/file/:digest
Authorization: Session <member session token>
Content-Type: <media type>
Content-Length: <size>
```

The session must list the read name `file-upload`, and member sessions
list it (`packages/scope/src/sessions.ts:108`). The scope streams the bytes
into the keeper and computes the digest and size as they arrive. It answers
`201` when it stores the file, `200` when it already holds it, and `400` with
`bad-field` when the digest or size differs. It answers `413` when the size is above the deployment's file
maximum or the scope's pending bound. The act then names the digest, and
judgment checks the held file (section 3).

**Order.** Write the bytes, verify the digest and size, then take the act
that names them. There is no transaction across the keeper and the journal. A
refused or abandoned act leaves an unnamed file.

**Pending uploads and the sweep.** Each upload adds a row to a scope table
`file_upload (digest, size, at)`. An entry that names the digest removes the
row in its commit. The scope's alarm deletes each file whose row is older
than the sweep window, and removes the row. Pending bytes count against the
scope's file capacity until then (section 7).

## 6. Read

```
GET /v1/scopes/:scope/retained/file/:digest
HEAD /v1/scopes/:scope/retained/file/:digest
```

The read goes through the existing Readers port
(`packages/scope/src/ports.ts:231-248`), as other retained inputs do.

- A member read session can read every file of its scope by digest. `retained`
  is a member read (`packages/scope/src/sessions.ts:108`). This is what makes a
  file readable by the room's members and no one else.
- A signed read, and a chained register session, can read a file only when
  an entry that the reader can read names that digest. This is the existing
  rule of `packages/scope/src/reads.ts:146-192`. It runs when the read has
  a limit (`reads.ts:295`).

The answer streams the raw bytes. It is not JSON. Its headers:

- `Content-Type`: the held media type.
- `Content-Length`: the held size.
- `Content-Disposition: attachment`.
- `Content-Security-Policy: sandbox; default-src 'none'`.
- `X-Content-Type-Options: nosniff`.
- `Cache-Control: private, no-store`.

A page that shows a photo fetches it with its session and displays a local
object URL. The `/site/` route never serves a retained file.

A missing file answers `404`. A redacted file answers `410` with
`{ "error": "redacted", "tombstone": <position> }`. The first version serves
whole files only. Range reads are a follow-up.

## 7. Capacity

- **Scope file bytes.** A new scope bound, `scopeFileBytes`, beside the five
  bounds of `packages/contract/src/bounds.ts:62-67`. Its temporary default
  is 1 GiB. Every scope that holds a file charges it, with or without the
  whole-scope opt-in. A file and a pending upload each count once per digest.
  Redaction and the sweep subtract.
- **Scope bytes.** `scopeBytes` counts no file bytes. A file adds only its
  reference to the entry that names it.
- **File maximum.** Each deployment has one file maximum. With a bucket, its
  default is 32 MiB, and an operator can lower it. Without a bucket, it is
  the SQLite threshold. A field's `max` above the deployment's file maximum
  refuses the act with `bad-field`.
- **Pending bound.** A scope holds at most 64 pending uploads and at most
  256 MiB of pending bytes. Above either bound, an upload answers `413`.
- **Keeper quota.** An operator sets a quota for the whole keeper. When the
  keeper is full, an upload answers `507`, and no act is refused for an
  upload that never happened.

## 8. Replay

No guard and no rule reads a file. A file field only writes its reference
into a slot. So a replay derives the same state without the file bytes.

- A replay checks each file reference in the intent against the field's
  `max` and `media`, as judgment does.
- A replay does not read file bytes by default. Its report lists the trust
  `files`: the keeper held the declared bytes at judgment.
- A replay with the option to check files reads each file through its
  history source. `HistorySource` (`packages/replay/src/source.ts:53-59`)
  gains an optional method `file(scope, digest, allow)`. It streams the
  bytes or answers absent. A source without it states that it has no files.
- With file checks on, a missing file is `incomplete`, unless a later entry
  of the same scope redacts it. Then the report lists it as `redacted`, as
  for a text (`packages/replay/src/verify.ts:806-825`, `:1827-1836`). Wrong bytes are a
  `mismatch`.
- Integrity mode reads no file bytes (`packages/contract/src/report.ts:10`).

## 9. Archive, export and the journal floor

- **Archive.** The journal archive holds a file's digest only, inside the
  entry that names it. This extends point 4 of section 15.1 of
  `notes/2026-10-09-shared-language-volatile-acts.md` from texts to files.
- **Portable clone.** Its export policy covers files as it covers texts. This
  note adds no file export.
- **Journal floor.** A floor
  (`notes/2026-10-20-retained-journal-floor.md`) removes no file. A member
  reads a file by digest, so the naming entry can be below the floor. File
  bytes leave the keeper only by redaction or by the sweep.
- **Final state and new incarnation.** A scope in its final state keeps its
  files readable as it keeps its journal readable. A new incarnation is a
  new scope with its own files. Deleting every file of a scope belongs to a
  design of scope deletion. That design does not exist yet.

## 10. Source and derivation fields

The platform stops at bytes, digest, size and media type. Where a file came
from is the application's business. So that packages agree, a capture act
uses these field names:

| Field | Type | Content |
|---|---|---|
| `file` | `file` | The bytes. |
| `name` | `text`, at most 255 bytes | The original file name. |
| `source` | `text`, at most 1,024 bytes | How the bytes were made: "phone photo", "scan", "drawn from tape measurements", or an address. |
| `derivedFrom` | a list of fact references | The facts that the file was made from, such as earlier captures. |

The matter room's package uses these names. This note does not design that
package.

## 11. Bounds to measure

Slice RF2 (section 14) measures each of these on the hosted Worker and
records the value in its report:

1. **Beside-the-intent bound.** The largest file that travels beside the
   intent within the 1 MiB body, with the intent and its other inputs.
   Proposed: 256 KiB.
2. **SQLite threshold.** The largest file that the scope's SQLite keeps.
   Proposed: 256 KiB, the same as bound 1.
3. **Upload time.** The time to stream a 32 MiB file into the keeper, and
   the time to read it back.
4. **Sweep window.** Proposed: 24 hours.

## 12. Witnesses

1. **Capture and read.** A member captures a 20 KiB image beside the intent
   and a 5 MiB PDF by upload. A second member reads both with a member read
   session and gets the exact bytes, media types and headers of section 6.
   A person outside the membership is refused.
2. **Refusals.** Each case of section 3's judgment list refuses `bad-field`:
   no held file, wrong size, wrong media type, above `max`, outside `media`.
   An upload with wrong bytes answers `400` and stores nothing.
3. **Read rule.** A guard, a rule, an index send and a send to a lane each
   read a file field. Validation refuses each one with `redactable-read`.
4. **Redaction.** The capturing member redacts the PDF. The keeper no longer
   holds it, a read answers `410` with the tombstone, `scopeFileBytes` falls
   by its size, and the slot keeps its reference.
5. **Sweep.** An upload that no act names is deleted after the window, and
   its bytes leave `scopeFileBytes`.
6. **Capacity.** A scope with `scopeFileBytes` set low refuses the upload
   that would pass it, and the pending bound refuses the 65th upload.
7. **Replay.** A replay of the witness 1 and 4 journal derives the same
   state without file bytes and lists the trust `files`. With file checks
   on, it reads both files, reports the PDF as redacted, and reports a
   deleted unredacted file as `incomplete`.
8. **Keepers.** Witness 1 passes with the SQLite keeper alone (files under
   the threshold), and with SQLite and R2 together.

## 13. Not in this note

- Publishing a retained file to the repository.
- Lane delivery of a file to another scope.
- Range reads.
- Uploads in parts, for files above the file maximum.
- A keeper for one room, such as a customer's own bucket.
- Custody narrower than a room: a file that only some members can read.
- Deleting every file of a scope.
- The matter room's package.

## 14. Slices

| Slice | Content | Done when |
|---|---|---|
| RF1 | The `file` field type, the file reference value, the byte domain `artroom-file-1`, validation and `redactable-read`, the `redact` effect's `files` list, judgment checks against a keeper port, and replay without bytes with the `files` trust. Fixture-only. | Witnesses 2 and 3 and the replay part of 7 pass against an in-memory keeper. |
| RF2 | The SQLite keeper, the beside-the-intent write, the read route, `scopeFileBytes`, the pending table, the sweep and redaction's delete. The CLI's `dap act … --file <field>=<path>`, and a local `dap mcp` tool argument that names a local path. | Witnesses 1 (small files), 4, 5, 6 and 8 (SQLite) pass on a local Worker. Bounds 1, 2 and 4 are measured. |
| RF3 | The R2 keeper, the `FILES` binding, the upload route and its judgment check, and the keeper quota. Operator configuration in the runbook. | Witnesses 1 and 8 pass on a test Worker with a bucket. Bound 3 is measured. The planner deploys after review. |
| RF4 | Exit test: a minimal capture package in `examples/` with the fields of section 10. From a chat session, a person captures drawings and photos into a room and invites a second person, whose agent reads them. The person then redacts one photo. | The run passes on a hosted Worker, recorded in the slice report. |

The slices run in this order. Each one is reviewed and landed before the
next one starts. RF3 also runs once on a celld fleet with a bucket, when
the self-hosting slices reach that point.
