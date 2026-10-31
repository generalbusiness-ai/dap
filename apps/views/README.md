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

`needs_you`, `work`, `context`, `change`, and `since` read native current state. Each
call admits at most eight scopes, including Membership, Directory, and any
support scopes. Those support scopes consume the same eight-scope limit.
At most six lanes fit in one call in the ordinary flat-directory case. Other
support scopes leave fewer lane slots. With more lanes, `needs_you` and `since`
read a window of lanes in a stable order. Each answer lists the lanes it left
out in `omittedScopes` and names the lane to continue from in `next`. To read
the next window, pass `next` as `after`, or open the card again with `next` as
`scope`. `next` is null at the last window. `work` still reads only the first
window.
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

The history limit is 512 total entries from the selected lane, including
entries unrelated to the Question. Each entry counts once, including the
current text entry. Exactly 512 entries fit this history bound. Beyond
512 lane entries, `context` and the Decision card are unavailable even for
a small Question. The existing page, request and byte limits can stop the
read sooner. A read stopped by the 16-page bound reports `page-limit`.

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
the displayed head summaries and captured scopes. A mark requires a window
with no unread scopes or omitted rows, and a lane outside that window stays
unreviewed. It does not claim review of every journal body between heads. The
store holds at most 64 marks, so a room over 62 lanes reaches `full`. Store conflicts,
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

## Change card

`view_change` with a `subject` opens one change. The subject is the lane's
scope reference as JSON. `view_change` with no subject keeps the **Mark
reviewed** list of heads. The card reads J4 changes only.

The card shows the current version's base and integration, and this version's
reviews and checks. Each reviewer and checker appears with their kind: a
person, or an agent or checker with its controller. The card also shows the
rules, the merges, the conditions of each linked issue, and the decided
questions of each linked issue. It reads at most four linked issues and names
any it did not read.

The card offers at most two acts, and each act signs the revisions the card
read:

| Card state | Acts |
| --- | --- |
| You can review this version, and it is not ready to merge. | **Approve**, **Request changes** |
| It is ready to merge, and you hold `change.merge`. | **Merge**, and **Request changes** if you can review it |
| A merge is in progress or the change is closed. | None |
| A merge your key signed is `unknown`, or this server has an unresolved send at this lane. | **Check original request** only |
| Another member's merge is `unknown`. | None. The card names the merger. |

While this server has an unresolved send at the lane, a retained card signs
nothing. **Check original request** signs nothing either. One minute after the
request's `notAfter`, which is at most 15 minutes after it was signed, the check
sends the same bytes once, so the scope answers with the first entry or refuses
the request as `expired`. A refusal frees the card's acts. Before that time, the
receipt gives the time to check again.

**Approve** names the first rules extent of class `content`. A review counts
only for the extent it names, so an approval for a change to the rules or to
deployment files needs the ordinary `review-verdict` act.

**View diff** signs one `read-token` act and spends its credential on one
read of at most 40 KiB of text. Over a bound, the diff says "truncated". A
version that holds one file has no integration commit, so its card offers no
diff. A commit the destination's repository does not hold gives no diff, and
the card says so. An unpublished workspace commit can fall in this case.
