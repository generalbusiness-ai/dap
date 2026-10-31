# Read a room with the local S4 adapter

Use an existing enrolled `DAP_HOME` and one explicit local Brief package
file. This entry creates no identity or room. From the repository root, run:

```sh
DAP_HOME=/absolute/existing/home node --import tsx apps/views/src/node.ts --brief /absolute/package/brief.txt
```

The entry uses the existing locked loader and MCP stdio transport. A host
can mount the four existing card resources. Imports and the service factory
do not read a home, bind a port, or load a key. Tests supply public fixture
signers, configuration, and Brief bytes directly.

`needs_you`, `work`, `context`, and `since` read native current state. Each
call admits at most eight scopes, including Membership, Directory, and any
support scopes. Those support scopes consume the same eight-scope limit.
At most six lanes fit in the ordinary flat-directory case. Other support
scopes leave fewer lane slots. A room with more than six lanes has omissions
and offers no **Mark reviewed** action because the collection is incomplete.
The adapter returns at most 50 attention rows and separately caps live Item
rows at 512, pages at 16, and HTTP attempts at 64. It counts session and
signed-read fallback requests. Omissions and read failures remain visible.
These limits do not claim complete room coverage.

Each attention row names its exact definition pin and declaration clause.
An assignment, an open request, and a role action mean different things.
Main also has legacy platform Task definitions and Directory task rows.
This adapter projects Issue commitments and exact Change links; it does
not infer a Task from Page forms or substitute a lane for one.
The display never grants permission. Decision actions use the existing
MCP native shaping, expected revisions, custody, and admission path.

For one Question, call `context` with its full scope reference and ask ID.
Use the same selector encoded as `[scopeRef, askId]` in a Decision view's
`subject`. Local body sequence refs resolve through the actual sealed entry
and its checked hash. Missing bytes or an incomplete window offer no review.

The history limit is 50 total entries from the selected lane, including
entries unrelated to the Question. Each entry counts once, including the
current text entry. Exactly 50 entries fit this history bound. Beyond
50 lane entries, `context` and the Decision card are unavailable even for
a small Question.

The public context omits unrelated live lane items and does not repeat the
current body in the version list. The Decision card has a separate 60 KiB
display budget. `context` caps its complete serialized result at 256 KiB.
JSON escaping and history metadata can exceed that bound even for a legal
64 KiB Question body. In that case, `context` refuses with
`context-output-limit` rather than returning a partial Question.

The new Question Brief profile stores one immutable raw-byte digest. The
fixed `dap://package/brief` resource serves only the operator-selected UTF-8
file, at most 64 KiB, as `text/plain`. The adapter compares `digestBytes` of
those exact bytes to the ask's stored Brief digest. Existing S3 questions
remain legacy unbound. There is no URL loader, body-digest fallback, or
claim that approving a Question approves its Brief or conditions.

`since` is a pure read. **Mark reviewed** writes only local reviewed heads
under this `DAP_HOME`, after rechecking the mounted cut and exact heads.
It signs no native act and returns no native accepted fact. A duplicate
mark is harmless; a restart keeps the recorded marks. Another head appears
once per response and repeats until the next explicit mark. The mark covers
the displayed head summaries and captured scopes. A mark requires a complete
collection with no unread scopes, omitted scopes, or omitted rows. It does
not claim review of every journal body between heads. Store conflicts,
unsafe paths, uncertain locks, and capacity limits stop the local write.
Failures before the rename preserve the prior file. If the rename succeeds
but the directory flush or readback fails, the new mark may already be
visible and its durability remains uncertain. Stop and inspect local state;
the failure does not authorize a native act or an automatic repeat.

The Node owner uses real adapter, read codecs, and filesystem storage over
scripted native read answers. It does not prove a hosted room, provider,
browser host, or native authority. The lane and MCP native owners prove
those separate boundaries. Run this owner's whole file after source freeze:

```sh
node --test apps/views/test/s4.test.mjs
```
