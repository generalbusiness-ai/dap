# MCP budget figures record

This note records the measured budget and framing figures of the MCP
service, as `docs/mcp.md` held them until 10 November 2026.

## Budgets and observed figures

Each figure below is labeled by how it was taken: an observed run of a
named test, or a sum of a recipe's steps.

### Whole responses

A tool's bound is for the whole tool result as the service makes it: the
structured content, the text and `isError` together:

- 4 KiB for an act, `wait`, `settle` and `prepare`.
- 8 KiB for `room` and a page of `inspect`.
- 64 KiB for `items`, `steps`, `step`, `record`, `sends`, `text`,
  `actions` and the declaration or complete text of `inspect`.
- 2 KiB for `credential`.

The text repeats the structured content's JSON only when the whole result
still fits. Otherwise the text says where the result is. Pages are sized for the whole result, and a text slice is measured
after JSON escaping. Over 2026-07-28 each result also carries
`resultType` and the server's information in `_meta`: 110 bytes more,
observed in `wire.test.ts` (the constant `MODERN_RESULT_EXTRA`), which the
bounds do not count. Over 2025-11-25 nothing is added. The one result larger than its bound is a single live
item larger than a page, which is served whole, alone on its page.

`room` pages every collection it returns (lanes, applications, standalone scopes,
standing, active definitions, the act tools not held, the scopes not read)
together, by bytes, with a cursor. The cursor is bound to the layout of
those collections, a digest of every entry in order, not to the tool
list's generation: an application being created moves the entries after
it without changing the generation. A cursor whose layout no longer holds
is answered with the first page and `restarted`, so no entry is repeated
or skipped.

The searches of `wait` and `credential` retain at most 64 recent entry-search
positions and 64 recent final-page positions per server. A lookup keeps its
position recent, and the server evicts the oldest at the bound. Each poll or call still
reads at most 16 entries, or 4 pages of final items, with no fixed history
window. An evicted search restarts those bounded reads. These hints hold
neither an answer nor a credential and grant no authority.

An entry search belongs to its service and immutable opening entry's full
scope, position and hash, so appending entries does not reset it. A final-page
position belongs to its service, full scope, observed head and query. A new
head or query starts at the first page. If the head changes between summary
and final-item reads, that poll returns no item. A later poll reads again.

### Per tool, end to end

Observed run of `packages/mcp/test/budget.test.ts`, on the stand-in scope
service of the Node tests, which counts every request the server makes. A
warm call holds a read session, and a cold call adds one session request.
Response bytes are the whole result of the warm call, as the service makes
it. The test asserts both calls' sizes against the bound. The read counts
and response sizes are from an earlier run. The last column gives the
current read bound of a fresh act for the two act tools.

| Tool | Historical reads, warm | Posts | Cold | Response bytes | Current read bound, warm |
|---|---|---|---|---|---|
| `room` | 3 | 0 | +1 session | 3874 | 3, + roots and memberships |
| `inspect` | 1 | 0 | +1 | 990 | 1 |
| `inspect` with `describe` | 1 | 0 | +1 | 1471 | 2 |
| `inspect` with `declaration` | 2 | 0 | +1 | 64536 | 2 |
| `items` | 1 | 0 | +1 | 506 | 1 |
| `steps` | 1 | 0 | +1 | 1012 | 1 |
| `step` | 1 | 0 | +1 | 2264 | 1 |
| `record` | 1 | 0 | +1 | 4932 | 1 |
| `sends` | 1 | 0 | +1 | 442 | 1 |
| `text` | 1 | 0 | +1 | 474 | 1 |
| `wait`, one poll | 1 | 0 | +1 | 476 | 1 |
| `settle` | 1 | 0 | +1 | 1570 | 1 |
| `actions` | 1 | 0 | +1 | 20056 | 3 |
| `issue.comment`, on a lane | 1 | 1 | +1 | 1184 | 4 |
| `issue.create`, with the definition's bytes read | 2 | 1 | +1 | 1204 | 5 |
| `create` | 0 | 1 | | | 0 |
| `credential`, a second token after the first was read | 3 | 0 | +1 | 362 | 1 |
| `tools/list` | 3 | 0 | +1 | | 3, + roots and memberships |

Each attempt of a fresh act reads Membership, Directory and Rules.
`issue.comment` then reads its target lane: four reads in this fixture.
`issue.create` also reads its Directory target and the retained definition
bytes from Rules: five reads. The budget test checks those exact routes
for both cold and warm calls. These bounds apply to this room with no
applications or standalone roots. They do not raise the other tools'
bounds.

`credential` reads the act's entry, then the entries after it until the
operation's outcome names the token (two here), then the credential route:
3 reads.

The warm counts above are of a room with no applications. An application
the directory created costs reads the first time the server sees it: one
summary of its scope for its pin, and its definition's bytes once per
digest. The server keeps both, so later calls read nothing more for it. Its row
comes from the directory summary the list already reads.

Other observed figures from the same run:

- A session that has ended: the next read asks for a new one, +1.
- A session refused at the membership: one session request, then signed
  reads. The server remembers the refusal for a minute.
- A session the scope refuses on a read: one signed-read fallback for that
  read, so 2 reads.
- A room with two standalone roots, one under a second membership: `room`
  warm reads 6 (3, + 2 roots, + 1 for standing on the second membership).
  Cold, it makes 2 session requests.
- A room of 60 lanes, 30 applications and 40 roots: `room` in 6 pages
  (observed, and the test asserts more than one), each within 8 KiB. That
  case shows the totals and the bound, not that pages agree with each
  other. A second case shows that: a continuation inside the roots, after an
  application appears as `creating`, is created, or is refused, restarts,
  and the walk from the restart returns every root once.
- 20 prepared steps under one key: `settle` in 4 pages, each within 4 KiB.
  Each `prepare` result is at most 1692 bytes.
- A known tool name called at a root another process added under a second
  membership: served under that membership, with no list call first.
- A mint's outcome 100 entries after its act: found in 7 `credential`
  calls. A creation completed 100 entries after its act: found in 7 polls
  of one `wait`. A final item on the fifth page of final items: found in 2
  polls. No entry was read twice.
- A 64 KiB live item is served alone and whole on its own `inspect` page.
  A continuation after the head moved restarts at the new head and says so.
- A 200 KiB retained text is read whole in 4 calls of `text` by offset.
- With a 2 KiB list page, each descriptor larger than the page is alone on
  its page (35 of them), and every tool is reachable.
- 70 resubmissions of one refused intent: each of the 70 made 4 reads and
  1 post, with no new session. Every attempt checked the same four routes
  above, and all 70 outcomes stayed readable.
- A subscribed client is told 2 times for an activation and a role change,
  and 0 times for an ordinary head advance. Each watch run reads 3
  summaries.

### The list, per role

Observed run of `packages/mcp/test/budget.test.ts`, taken before the
server listed `install_application` and `application_installation`. The
list now has two more generic tools in each row. Bytes are the canonical
JSON of each `tools/list` result as sent, and the test asserts that every
page is at most 256 KiB. The token counts are a proxy, counted by
gpt-tokenizer 3.4.0 with the `o200k_base` encoding. An agent host's own
tokenizer gives other counts.

| Room and role | Tools | Pages | Bytes | Tokens |
|---|---|---|---|---|
| Demo room, admin | 71 | 1 | 146531 | 37745 |
| Demo room, maintainer | 57 | 1 | 114615 | 29617 |
| Demo room, member | 54 | 1 | 108040 | 27860 |
| Demo room, agent | 52 | 1 | 102274 | 26421 |
| Full lane definitions (`issue`, `change`, `change3`), admin | 158 | 2 | 339157 | 88992 |
| Demo room, admin, `--generic` | 16 | 1 | 15236 | 3581 |

No cap applies to the whole list. `--tools` shortens it for an agent with
one job. `--generic` replaces the act tools with the pair.

### List changes in the room story

Observed run of `packages/mcp/test/room.scope.test.ts` on the real test
Worker, in both modes: the creator's subscribed client was told of 7 list
changes (3 while creating the room), and the second member's of 4.

## Hosted framing figures

| Figure | Value | How taken |
|---|---|---|
| HTTP framing beyond the CallResult, a 2026-07-28 `tools/call` | 144 bytes: the JSON-RPC envelope with a one-digit id (34) and the modern result's added members (110) | Observed, `packages/mcp/test/hosted.scope.test.ts` |
| Control request header | about 600 bytes | Reconstruction: the canonical JSON of the nine members, base64url, and a 64-byte signature |
