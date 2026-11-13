# The MCP service

`dap mcp` serves a room to an agent host over the Model Context
Protocol (MCP). One server serves every application the room holds. It
reads the room's definitions as data and derives one tool for each act
declaration, so an application it has never seen gets its tools as soon
as the room holds it. The server signs with the key of the config
directory it runs in, and nothing it serves grants authority. Each scope
judges each act, and the server reports that judgment as the scope gave
it.

The server is the package `packages/mcp` (`@generalbusiness/dap-mcp`).
`DAP_HOME` selects the config directory, and `ARTROOM_HOME` still works as
an alias. The CLI and the MCP server use one resolved directory. If the
two variables conflict, both refuse before they read either store. For one
release, `artroom mcp` runs the same server through the command line's
`artroom` alias. [The CLI guide](cli.md) describes the defaults and how
the CLI finds earlier custody.

## Connect an agent host

The server runs where the command line runs, with the same config
directory (`DAP_HOME`, or the legacy `ARTROOM_HOME`). Set the room up first
with `dap install` and `dap create`. Or start the server with an empty
config directory and call its `join` tool with an invitation link. `join`
records the room there, as `dap join` does. A person link must name its
exact supported Membership pin. A missing pin is refused. The configured
service and the link's service may have terminal slashes. An invitation
for another configured service is refused before signing.
The link holds the
invitation's secret, and `join`'s own result never repeats it. With
membership@6, @7 or @8, the signed join holds a proof made with the
invitation's private key. The proof is bound to that membership scope,
invitation and joining key, and the join does not hold the secret.
Legacy membership@1, @2, @4 and @5 hold the secret in the signed join.
A journal read of membership (`step`, `record`) returns that signed input
to whoever may read the journal. Local custody keeps the same intent. See
[Custody](#custody) for how long.

### Over stdio

The agent host starts the server as a child process and speaks MCP on its
standard input and output:

```
dap mcp
```

An agent host's configuration names the command and its arguments, for
example `{"command": "dap", "args": ["mcp"]}`, with `DAP_HOME` in
its environment when the config directory is not the default one. Messages
are one JSON object per line. Diagnostics go to standard error.

### Over loopback HTTP

```
dap mcp --http 127.0.0.1:8765
```

The server binds a loopback address only (`127.0.0.1` or `::1`) and refuses
any other address. It prints its URL and a bearer token once, on standard
error:

```
dap mcp: serving http://127.0.0.1:8765/mcp; bearer (shown once): <token>
```

Give the agent host the URL and the header `Authorization: Bearer <token>`.
The server answers `401` to a request without that header, `403` to any
request that carries an `Origin` header (no browser page is a client of a
signing server), and `404` to any path but `/mcp`. A new process makes a
new token. Batches are not served.

The bearer grants access to this signing server. A launching host that
collects standard error can retain it in a log, even though the server
prints it only once. Keep startup standard error out of collected logs
and pass the token directly to the host's protected Authorization-header
configuration, if the host supports that private handoff. The CLI has no
alternate bearer-output option. If the host cannot keep that stream and
header private, use `dap mcp` over stdio instead. That transport issues no
loopback bearer. Access to the host, process and config directory still
controls access to the signing key.

The loopback server and the hosted endpoint validate every request the
same way, through one HTTP layer (`packages/mcp/src/http.ts`).
[The two revisions over HTTP](hosted-mcp.md#the-two-revisions-over-http) gives the
rules. In short:

- A 2026-07-28 request carries `MCP-Protocol-Version: 2026-07-28` and
  `Mcp-Method`, and `Mcp-Name` on `tools/call`.
- A 2025-11-25 request names its session.
- The server serves `GET` and `DELETE` only under the 2025-11-25 header.
  They need `Mcp-Session-Id` (`400` without it) and a live session (`404`
  otherwise). With no header, or the 2026-07-28 header, they answer `405`
  with `Allow: POST`.

### Options

| Option | Effect |
|---|---|
| `--generic` | Lists the generic tools and the pair `actions` and `act` in place of the act tools. For an agent host that lists few tools. |
| `--generic=add` | Lists the act tools and the pair. |
| `--tools <names>` | Lists the act tools of these definition names only, separated by commas, such as `--tools issue,change`. The generic tools stay. |
| `--http <address>:<port>` | Serves loopback HTTP in place of stdio. |
| `--scope <scope> --membership <scope>` | Records a standalone scope in the config before serving, with the membership its standing is read from. The server lists its acts from then on. `--membership` is optional; without it the standing is unknown. An application the room's directory created needs no `--scope`: the server finds it. |

### The two wire revisions

The server serves two MCP revisions on both transports, and chooses per
request.

| | 2025-11-25 | 2026-07-28 |
|---|---|---|
| Start | `initialize`, then `notifications/initialized` | No handshake: each request carries `_meta` with `io.modelcontextprotocol/protocolVersion` and the client's capabilities; `server/discover` describes the server |
| Session over HTTP | `Mcp-Session-Id`, issued at `initialize`; `DELETE` ends it; an unknown session is answered `404` | None |
| List changes | `notifications/tools/list_changed` on the session's `GET` stream, or on stdio | A notification tagged with the subscription's ID on the stream of `subscriptions/listen`, for a client that opted in to `toolsListChanged` |
| `tools/list` | Paged | Paged, with `ttlMs` 30000 and `cacheScope` `private` |
| Results | Structured content, and the same JSON as text | The same, with `resultType: "complete"` |

A request with a version the server does not serve is answered with error
`-32022`, whose data names the versions it serves and the one asked.

The server never answers a notification (a message with no ID). Over HTTP
it gets status 202 and no body. On stdio the server writes nothing. A method that is
only a request, such as `tools/call`, `initialize` or `tools/list`, sent as
a notification, is not run and issues no session.

## What the server lists

The list has two parts.

- **The generic tools**, the same for every room: `room`, `commons`, `inspect`,
  `create`, `join`, `install_application`, `application_installation`,
  `prepare`, `items`, `steps`, `step`, `record`, `sends`, `text`, `wait`,
  `settle`, `credential` and `diff`, and in `--generic` and `--generic=add` modes
  `actions` and `act`. These are the twenty names of
  `GENERIC_TOOL_NAMES` in `packages/mcp/src/hosted-tools.ts`. The hosted
  endpoint omits `create`, `install_application`, `credential`, `diff`,
  `prepare`, `join` and `record` by default. `MCP_TOOL_ADDITIONS`
  adds them back (see [Hosted endpoint settings](hosted-mcp.md#hosted-endpoint-settings)).
- **The act tools**, one for each act declaration of the definitions the
  room's scopes run, that the caller's role may sign or that a rule
  decides. Their names come from the words table below. A tool is bound to
  an exact declaration: its definition name, its native kind and the digest
  of the declaration. Two declarations that share a name and differ get two
  tools, each named `<name>@<8 hex>`, and neither keeps the plain name.

The room's scopes are found, not configured: the repository's platform
scopes (register, directory, membership, rules, destination and your
inbox), every lane the directory lists, and every application the
directory's application factory created, such as a Counter: an
`application` item of the directory in state `created`, whose `scope` names
the created scope. A lane and an application are both held under the
directory's membership, so the caller's role there decides their tools.
`room` lists the applications beside the lanes, with each one's definition
name, digest, scope and state. `room` reads the directory's live items
only. An application still being created is listed as `creating`, with no
scope and no tools. A creation that was refused or conflicted is final,
leaves the live items, and is not listed. Add a scope outside the
repository with `--scope`. A configured scope that is also one of the
directory's applications is held and listed once, as the application.

The list is a function of the room, the caller's standing and the launch
options, never of a connection. The server computes a generation from those
inputs. The server tells each subscribed client once when the generation changes:
an activation, a role change, a new kind of lane, a new application, or a
scope recorded in the config. An ordinary act, such as a comment, changes
no generation, and the server tells nothing. While a client is subscribed,
the server reads the generation's inputs every 30 seconds. With no
subscriber, it reads nothing.

A page of `tools/list` is at most 256 KiB, with a cursor to the next page.
A cursor of an earlier generation is refused, and the client lists again
from the start.

### Each act tool's description

A description is derived from the whole declaration: what the act does,
which action of the role it needs and whether the caller's role holds it,
each field with its type and bounds, and each guard as a sentence with its
name. A description is at most 1,000 characters. When the guards do not
fit, the description keeps whole sentences only and names the guards it
left out, by position and name, with a pointer to `inspect` with
`describe`, which returns the complete text.

Five worked examples follow, as `tools/list` sends them. The first is for
a member of the demo room and the third for an admin. The others are for a
member who holds the action named. The last two are acts of the Counter's definition,
`counting-commitments`.

`issue.comment`, the issue lane's `comment`:

> comment: opens a comment; needs issue.comment, which your role (member) holds. Fields: body (required): text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. mentions: a list of up to 16, each a member, as @handle. replyTo: the ID of a comment item on this scope. No guards.

`lane.take-hold`, the derivation fixture's `take-hold`:

> take-hold: opens a hold; needs hold, which your role (member) holds. Fields: commitment (required): the ID of a commitment item on this scope. Guards: the commitment is accepted; you are the commitment's performer; no hold is held where the hold's under equals the act's commitment.

`issue.create`, the directory's `open-issue`:

> open-issue: opens a lane; needs issue.open, which your role (admin) holds. Fields: definition (required): the digest of a value in the definition domain, up to 262144 bytes, with its bytes in values or read from the rules scope; choices from the rules scope: change sha256:91d40909fb307b024233967419bee436de7da931818bc96d492ef55d598cc00d, issue sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e. title (required): text up to 256 bytes. body: text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. conditions (required): a list of up to 16, each text up to 4096 bytes. Guards: the definition is active in the rules scope, and its bytes and the definitions it names are at hand (not-activated, unsupported-definition).

`counting-commitments.participate`, the Counter's `participate`:

> participate: opens a participant; needs counting.participate, which your role (member) holds. Fields: none. Guards: no participant is inactive or active where the participant's agent equals you.

`counting-commitments.commit`, the Counter's `commit`, whose last guard is a
rule too long for the description:

> commit: opens a promise; needs counting.commit, which your role (member) holds. Fields: participant (required): the ID of a participant item on this scope. generation (required): a whole number from 0 to 1000000. serial (required): a whole number from 1 to 1000000. n (required): a whole number from 1 to 100. basis (required): a list of up to 16, each a record of id (required): the ID of a participant item on this scope; member (required): a member, as @handle. Guards: the board is open; the board's pledge is not set; no promise is pledged; the participant is active; you are the participant's agent; the p.id of each p in the act's basis are exactly the participant items that are active matched by the participant's agent equals p.member, in order; one of: [between 0 and 1 participants are active] or [you are not the board's lastSpeaker]. Guards 8 to 8 of 8 are left out; see inspect with describe: "commit".

### Each act tool's input

Every act tool takes the same controls at the top level, and the act's own
fields under `fields`, so a field named like a control never collides:

| Input | Meaning |
|---|---|
| `target` | The scope: its ID, or for a lane the issue or change number. A tool of a scope the room has once, such as membership, needs none. |
| `on` | The local ID of the item the act is on, for an act on an existing item. |
| `idempotencyKey` | Required. 1 to 128 bytes of UTF-8, chosen by the caller. One key is one meaning. |
| `resubmit` | Send a refused intent again, deliberately. |
| `at` | Optional captured revisions, keyed by exactly the act's bound subjects (`on` and the `also` aliases). Omit it to read current revisions. |
| `fields` | The act's fields, as the description lists them. A member is `@handle`. |
| `texts` | Detached texts, when a field gives a text's digest in place of the text. Only for acts with a detached text. |
| `presented` | The facts the act presents, by name. Only for acts that present one. |
| `values` | A value's bytes for a field that names a value in a byte domain, such as a definition. Only for such acts. When it is not given, the server reads the bytes from the rules scope. |

The result of an act tool is the scope's answer: `accepted` with the fact
and the sends it created, or `refused`, `unavailable` or `mismatch` with a
sentence that names the scope, the kind, the judged head and, for a named
guard, the guard's sentence, and a next step.

A field left out is left out of the intent. The scope applies the field's
declared default itself. The server reads the revisions of the items the
act names from the same fields with those defaults applied, and with a
fact of the target scope read as its entry's position, as the scope reads
it. So an item a default selects, or one a local fact selects, is expected
like one the caller named by its ID. The intent carries the fact as given.

A slot of another subject can select a subject too, by a `via` rule of the
act's `also`. That subject can be final, and a final item has left the live
summary. With no `at`, the server reads its revision by ID from the scope's
final items before it signs. If the scope refuses the read, the server returns a
`read` error and signs nothing. A subject that a field names has no such read:
the server reads it from the summary alone.

When `at` is present, the server checks its shape and subject coverage,
then signs those captured numbers unchanged. The native scope refuses a
revision that has moved. The server does not silently refresh it. An
explicit captured set is part of the custody meaning: another set under
the same key conflicts. A repeated call with the original set returns its
kept intent even after the current state moves. Omission preserves the
existing fresh-read behavior and custody meaning.

An error the server finds itself (a shape, a target, custody, a read) is
`error`, `message` and `next`. A fragment of what the caller gave, such as
a target, a field's name, a key or a tool's name, is repeated in the
message for at most 128 characters, then an ellipsis and its length. The
whole error result is at most 2 KiB, the smallest tool bound. If the
message would pass it, only the message is cut, and it says so. `error`
and `next` stay whole, because every next step the server writes is
bounded. Only if
a next step alone passed the bound would it be cut too, with its length.

### Custody

The server keeps each signed intent before it sends it, under the
caller's `idempotencyKey`, in the config directory's
`private/mcp-custody/`, readable only by its owner.

- **Invitation contents and retention.** A join record keeps its exact
  signed input: an invitation proof for membership@6, @7 or @8, or the invitation
  secret for legacy membership@1, @2, @4 and @5. An archived record keeps
  the same input. The invitation link stays secret in either case, and
  hosts may also keep tool inputs. Neither intent expiry nor archival
  erases the intent. Thirty days is an archival threshold, not a
  maximum retention period, and unresolved records are retained.
- **A lost reply** leaves the record unknown. The same call with the same
  key sends the same bytes again. `settle` reads the scope's settlement.
  Neither signs a second intent.
- **What an error says about a send.** An error that stops a call says what
  that call did: "This call sent nothing." It speaks of the call, not the key.
  When an earlier send under the key has no known outcome, the error says so
  first and says to keep the key, because a new key can make a second entry.
  The server reads its custody for this with no new signature. If it cannot
  read its custody, it says that it cannot tell. If the scope accepted the
  request and a read after it failed, the error says that the scope accepted
  the request, and the same call returns the kept answer. If the read answers
  with no entry, the error says that the scope accepted the request, and that
  the same call can pass. For `join`, it also says that the server has not
  recorded the room yet. If the server's check of an accepted request fails on
  an entry that cannot change, the same call stops at the same check and sends
  nothing, so the error says to report it.
- **A failed read of the room.** The record keeps the room's membership in its
  identity, so `settle` and the same call find the record while the room's
  scopes are unread. The list can lose an act tool with those scopes. The tool
  then answers `unknown-tool`, and that error names the earlier send and points
  at `settle`. `settle` is the way to the answer until the reads return.
- **A changed target under the same key is a new request.** The record's
  identity names the target, so custody keeps a new record and signs a new
  intent. The new target's scope can accept it. A key protects one request
  against a second send to its target, and does not protect it against a change
  of target.
- **A copy for your other devices.** When the server holds a read session
  of a person's membership, it also keeps the exact request in that room's
  membership object, after it records the envelope and before it sends. The
  room's page on another device of the same member shows the request and can
  check it, with no new signature. If the room keeps no copy, the server
  sends nothing and returns the error `original`, and the same call tries
  again. The scope's answer ends the copy. A server that never held a session
  keeps no copy. A server that held a session and cannot renew it sends
  nothing, and says so when an earlier send under the key has no known
  outcome. A record with a kept answer returns that answer with no session. A
  restart forgets that the server held a session, so a restarted server with
  no session sends with no copy. A key of an agent or a checker keeps no copy,
  and neither does a hosted agent. A key whose reads have not stated its kind
  can keep rows until a read states its kind. The copy adds to custody on this
  machine and does not replace it. After a restart, `settle` or the same call
  reads the outcome, also when the page settled the request first.
- **Another meaning under a used key** is refused before anything is
  signed, and the next step says to use a new key. This holds where this
  server keeps the key's record.
- **A key used in another custody home.** The server finds no record, so it
  signs a new intent, and the scope answers `mismatch`, because it accepted
  another intent of your key under this key. This request makes no entry. The
  server cannot say whether the two intents ask for the same thing, so the next
  step says to read the scope with `inspect` or `steps`, or to call `settle` on
  the server that signed the earlier intent. A new key for the same request
  makes a second entry. Use a new key only for another request.
- **The outcome** given is always the newest decisive one of the current
  attempt: an answer other than unavailable, or a receipt that settlement
  found. A record that was lost, then unavailable, then settled answers `accepted`.
- **Terminal records.** `accepted` and `mismatch` records are never sent again, even
  with `resubmit: true`. A refusal is kept. `resubmit: true` first keeps a
  new attempt, unresolved, with the refusal as history, and then sends the
  same intent. A lost reply to it leaves the record unresolved, and
  `settle` asks the scope.
- **Capacity.** At most 256 records may be unresolved at once. A record
  takes its place under a lease that every process sharing the directory
  takes, so two processes cannot both take the 256th place. A resubmitted
  refusal takes a place the same way. It becomes unresolved under the
  lease, and a full store keeps the refusal as it was. Nothing unresolved is evicted.
- **Size.** A record is at most 2 MiB. An act whose fields, texts,
  presented facts and values would not fit with room for its outcomes is
  refused as full, for bytes, before it is signed. A record keeps up to 64
  outcomes inline. Older ones, or ones that would push it past 2 MiB, move
  to a segment file beside it, which keeps every one and is read in bounded
  slices. The decisive outcome is searched inline first, then in the
  segment one slice of 64 at a time, newest first, stopping at the decisive
  outcome or at the start of the current attempt.
- **Preparation steps** are kept apart from the act. A step keeps its first
  answer and its latest 63, and drops the answers between them. The act's
  outcomes are never dropped.
- **Archives.** A terminal write checks for terminal records older than
  thirty days or beyond the newest 1,024. Eligible records move to archive
  files of at most 64 MiB, with an index, in one transaction under an
  archive lease: the archive file
  is written whole and renamed into place, then the index, and only then are
  the live records removed. A record whose lock another process holds is
  skipped. This runs on terminal writes, not a timer, so an old terminal
  file can remain until a later check. Archives stay readable. The store
  never deletes kept intents by age.
  A crash at any point loses no record.
- **Locks.** A lock or lease is broken only when the process that took it
  is gone, whatever its time. The passing of an intent's deadline is never
  an outcome. One process at a time breaks it, under a reclaim lock, after
  reading it again. A release removes only the releaser's own holding.
  A reclaim lock is never broken. If the process holding it died, every
  call that needs that lock is refused as `locked` until an operator
  removes the reclaim file after all processes using this config directory
  have stopped.
  The refusal's next step names the file once, whole, relative to
  the selected config directory (for example
  `private/mcp-custody/capacity.lease.reclaim`), so its length does not
  depend on the home's. Archival reads each record again under its lock and
  skips one that is no longer terminal.
  If a recorded PID has been reused by another user's process, a process
  check can return `EPERM` (permission denied). The server treats that as
  alive and leaves the lock in place. `blockedBy` can return no reclaim
  path even when an old file blocks recovery. A deadline or an old file
  time does not establish that the lock is safe to remove.

  To recover, stop every process using the selected config directory.
  Identify the exact lock or lease under `private/mcp-custody` and verify
  that its original holder is gone, no process uses this store, and the
  file still contains the same holding. Have an administrator check
  process ownership if permission prevents that check. Once those facts
  are established, remove only the verified stale lock or reclaim file.
  Keep the records, segments, archives and their indexes. Restart the
  server and check the retained original request. If ownership or a
  stopped store cannot be verified, leave the lock in place.
- **Steps with no act.** `prepare` without `kind` sends a capability step
  that has no act, such as hold@1's instance: the step's own intent, kept
  under custody under the caller's key, with its answers kept as the step's.
  Such a record is never an act that took effect. A decisive answer is kept,
  and the same call returns it again without sending. A lost or unavailable
  answer leaves the record unresolved, and the same call sends the exact
  step again. When every step of the record has a decisive answer, the
  record is `settled`: terminal, archivable, and no longer counted against
  the 256. `settle` answers `settled` for it.
- **Names.** A capability or step name longer than 128 bytes is refused
  whole, before anything is kept or sent.

## Taking part in a Counter

A Counter is an application the room's application factory creates
(`application.create`, the directory's `establish-application`). The
agent gets no scope ID and no `--scope`. `room` lists the Counter among
its applications, with its definition name (`counting-commitments`),
digest, scope and state. From then on the list holds the Counter's act
tools.
`packages/mcp/test/counter.scope.test.ts` runs this recipe on the real
test Worker in both modes, after an admin has initialized the board, and
checks the tools called and their count against this table (observed).
The count covers taking part, from finding the Counter to deactivating.
It leaves out the room's setup, the board's initialization and the
story's final readings of the board and the steps. The story's one member
holds every grant, so the same member starts the board and takes the
turn. In a room with several members, the controller starts. In
`--generic` mode the story's second connection shares the first one's key
and configuration. It is the same member, not a second one.

| Activity | Default | --generic |
|---|---|---|
| Take part in a Counter: find it, participate, activate, start, commit to a number, fulfill it, deactivate | `room`, whose applications name the Counter's scope; `counting-commitments.participate`; `counting-commitments.activate`; `inspect` on the Counter for the board, `counting-commitments.start`; `inspect`, `counting-commitments.commit`; `counting-commitments.fulfill`; `counting-commitments.deactivate`: 9 | `room`; `actions` on the Counter, `act` participate; `act` activate; `inspect`, `act` start; `inspect`, `act` commit; `act` fulfill; `act` deactivate: 10 |

Each further turn is one `inspect`, one `counting-commitments.commit` and
one `counting-commitments.fulfill` (one `act` each in `--generic` mode).
When more than one participant is active, the last speaker cannot commit
next. [The Counter](../apps/counter/README.md) has diagrams of every
act and who may attempt it.

The commitments Counter (`apps/counter/commitments.ts`, the one the
target-100 recording runs) grants differently from the Counter above: an
agent's role needs `counting.participate`, `counting.activity` (which
authorizes both `activate` and `deactivate`, with no separate
`counting.activate` or `counting.deactivate` grant), and
`counting.commit`, `counting.fulfill` and `counting.fail` as its part
needs. `counting.control` stays with the controller. An agent enrolled by
an agent-key invitation holds its role's actions as the roster lists them
for the membership the room is pinned to: membership@2, membership@4 (the
application cohort) or membership@5 (the Counting cohort). The invitation
carries that pin, and the server verifies the enrollment against the
receipt's definition.

## Taking part in the lending library

The [lending library](../examples/lending) is also an application that
the room's application factory creates, in a room of the
`application-publication` cohort. Its definition name is `lending`, so
its act tools are `lending.donate`, `lending.borrow`, `lending.return`,
`lending.cancel` and `lending.publish`. The caller's genesis values are
`{}`. The factory makes the signer the creator and supplies the room's
destination. A donation opens a thing at the entry that records it, so
the position of the act's fact is the thing's ID. `borrow`, `return` and
`cancel` name that ID in `on`.

Every act after `establish` carries `content`, the text of the thing's
shelf page, and the library tells the destination to publish it. A
donation also names the page's path in `page`, which must start with
`shelf/` and end with `.md`. The member interface picks
`shelf/<16 characters>.md`. The scope does not check the text against the
thing. An agent that writes the page states it under its own key, and
the next act on the thing rewrites it. Taking effect is not publication:
read the destination's receipt to see the commit.

`packages/mcp/test/lending.scope.test.ts` runs this recipe on the real
test Worker in both modes, after an admin has activated the definition,
given the admin role `lending.member` and `lending.staff`, and created
the library. It checks the tools called and their count against this
table (observed). The room's setup is not counted, and the test does not
read the destination.

| Activity | Default | --generic |
|---|---|---|
| Take part in the lending library: find it, donate a thing, borrow it, return it | `room`, whose applications name the library's scope; `lending.donate`; `lending.borrow`; `lending.return`: 4 | `room`; `actions` on the library, `act` donate; `act` borrow; `act` return: 5 |

The same test then returns the thing a second time. The answer is
`refused`, with the reason `guard-failed`, because the thing is no longer
lent. A refusal is an answer, not a tool error, and the scope writes
nothing for it.

Who may sign each act is set by the room, not the server. `donate`,
`borrow`, `return` and `publish` need `lending.member`. `cancel` needs
`lending.staff`. In the deployed library, the `admin` role holds both
actions and the `member` role holds `lending.member`. A member's `cancel`
there is refused as `unauthorized`. Anyone with
`lending.member` may return a lent thing, not only its borrower. The
library's [README](../examples/lending/README.md) lists the items and the
acts.

## Tool reference

### Install a trusted application package

New room creation offers no cohort that installs ordinary application
packages such as Counter or Lending. In an existing `trusted-application`
room, `install_application` records one native admin request. Its arguments are `uri`, `release`, `roles`,
`values`, and `idempotencyKey`. The URI names a regular Git blob at an exact
commit. `APPLICATION_TRUST` must list that exact release, publisher, and
canonical Git hostname. An unlisted release, another host, or a malformed
setting refuses before any package fetch. The server checks the policy
again when custody starts building the intent. The decoded publisher must match
before signing, alongside the existing release and signature checks. The
bounded HTTPS transport refuses redirects to another source.

Hosted agents receive the Worker's setting. Local `dap mcp` and
`dap install` read the same setting from their process environment. With
no list, nothing installs. Each row needs an explicit host. See
[Trusted application screens](deploy.md#trusted-application-screens). Each
selected role receives only its signed package defaults. Omitted roles
receive no new grants. Existing grants remain.

CLI and MCP share persistent request custody. After a lost reply, use the
same key and arguments to read or resume the original intent. Changed
arguments under that key refuse. A definitive native refusal is final.

Acceptance records the request, not completion. Use
`application_installation` with its `item` to read pending, active, or refused
state, the phase, and any reason. An active result includes its exact screen
URL. A late refusal can leave earlier activation and grants in force.
Neither tool returns signing keys, sessions, or the application's private
items. See [the CLI reference](cli.md) for URI spelling and transport limits.

### The generic tools

These are the generic tools as `tools/list` sends them in
`--generic=add` mode: each name, description, input schema and
annotations. In the default mode, `actions` and `act` are not listed.

Rooms in the commons cohort expose `commons.note` through their actual
member grants. The `commons` read returns bounded note previews with
authors and references. `step` and `text` read complete entries and their
retained text. A reference grants no access to another room.
The [bill-table witness](../examples/commons-bill/README.md) uses synthetic
text documents retained as signed carrier notes. Its
[text fragments](https://www.rfc-editor.org/rfc/rfc5147.html) name places
between lines or characters. File uploads and Capture remain separate work.

### `room`

Orientation. The service, your key, the scopes of the room by name, the issues and changes the directory lists, the applications its factory created (such as a Counter), the standalone scopes, your standing on each membership, the active definitions, and the act tools your role does not hold; paged by bytes, with a cursor. Start here.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "cursor": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `commons`

Read one bounded page of Commons notes with their facts, authors, media and opaque about references. Text and citation previews may be shortened; use step for complete citations and text for the retained text. A reference grants no access to its target. Readability and completeness are explicit.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `inspect`

One scope: its definition and digest, status, head, counts by item type and state, and its live items, paged by bytes at its head. With declaration: true, the definition's bytes, paged. With describe: <kind>, the complete derived text of one act, for an act whose tool description points here.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "declaration": {
        "type": "boolean"
      },
      "describe": {
        "type": "string"
      },
      "cursor": {
        "type": "string"
      },
      "offset": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `create`

Creates a scope with no existing target, and records it in your configuration so later connections list its tools. definition: a platform name such as platform:register@18, a definition's JSON, or its digest; kind: the definition's genesis act; fields; texts and definitions beside it; membership: the membership scope standing for the new scope is read from. Kept under custody like an act: the idempotencyKey is required.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "definition": {
        "type": [
          "string",
          "object"
        ]
      },
      "kind": {
        "type": "string"
      },
      "fields": {
        "type": "object"
      },
      "texts": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "definitions": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "membership": {
        "anyOf": [
          {
            "type": "string",
            "pattern": "^sc_[a-z2-7]{51}[aq]$"
          },
          {
            "type": "object",
            "properties": {
              "scope": {
                "type": "string",
                "pattern": "^sc_[a-z2-7]{51}[aq]$"
              },
              "inc": {
                "type": "string",
                "pattern": "^in_[a-z2-7]{25}[aeimquy4]$"
              },
              "kind": {
                "enum": [
                  "register",
                  "directory",
                  "membership",
                  "rules",
                  "destination",
                  "inbox",
                  "task",
                  "lane",
                  "commons"
                ]
              }
            },
            "required": [
              "scope",
              "inc",
              "kind"
            ],
            "additionalProperties": false
          }
        ]
      },
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128,
        "description": "Your key for this one meaning, 1 to 128 bytes. Keep it."
      },
      "resubmit": {
        "type": "boolean"
      }
    },
    "required": [
      "definition",
      "kind",
      "idempotencyKey"
    ],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "answer": {
        "type": "string",
        "enum": [
          "accepted",
          "archived",
          "refused",
          "unavailable",
          "mismatch"
        ],
        "description": "The room's Native decision: accepted, archived, refused, unavailable, or mismatch. A lost reply remains a separate custody finding."
      },
      "sentence": {
        "type": "string"
      },
      "next": {
        "type": "string"
      },
      "scope": {
        "type": "string"
      },
      "kind": {
        "type": "string"
      },
      "tool": {
        "type": "string"
      },
      "fact": {
        "type": "object",
        "properties": {
          "at": {
            "type": "object",
            "properties": {
              "scope": {
                "type": "string"
              },
              "inc": {
                "type": "string"
              },
              "kind": {
                "type": "string"
              }
            },
            "required": [
              "scope",
              "inc",
              "kind"
            ]
          },
          "seq": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "at",
          "seq",
          "hash"
        ]
      },
      "outboxIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "reason": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "judgedAt": {
        "type": "object",
        "properties": {
          "seq": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "seq",
          "hash"
        ]
      },
      "retained": {
        "type": "boolean",
        "description": "true when this is a terminal outcome kept under custody, and nothing was sent"
      },
      "archived": {
        "type": "object",
        "properties": {
          "floor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "commit": {
            "type": "string"
          },
          "through": {
            "type": "object",
            "properties": {
              "seq": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "hash": {
                "type": "string"
              }
            },
            "required": [
              "seq",
              "hash"
            ]
          }
        },
        "required": [
          "floor",
          "commit",
          "through"
        ]
      },
      "phase": {
        "type": "string",
        "enum": [
          "prepared",
          "sent",
          "unknown",
          "accepted",
          "archived",
          "refused",
          "mismatch",
          "settled"
        ],
        "description": "The state of this client's kept request. Acceptance records the request; it does not prove that the installation workflow finished."
      },
      "effects": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      },
      "item": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "required": [
      "answer"
    ]
  },
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `join`

Joins a room with an invitation link from dap invite (artroom-invite:...), as dap join does: signs membership's join with this server's key, keeps the exact request under custody before sending it, and on acceptance records the room in your configuration, so its tools are listed. After a lost reply, call again with the same link and idempotencyKey: the same request is sent again, never a new one. The link is private: this tool's result never repeats it. Legacy membership records the invitation secret in the join entry, visible through authorized history reads. The invitation-key cohort records a proof bound to this membership, invitation and joining key; its private invitation seed stays out of the entry.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "link": {
        "type": "string",
        "description": "The invitation link, artroom-invite:..."
      },
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128,
        "description": "Your key for this one meaning, 1 to 128 bytes. Keep it."
      }
    },
    "required": [
      "link",
      "idempotencyKey"
    ],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "answer": {
        "type": "string",
        "enum": [
          "accepted",
          "archived",
          "refused",
          "unavailable",
          "mismatch"
        ],
        "description": "The room's Native decision: accepted, archived, refused, unavailable, or mismatch. A lost reply remains a separate custody finding."
      },
      "sentence": {
        "type": "string"
      },
      "next": {
        "type": "string"
      },
      "scope": {
        "type": "string"
      },
      "kind": {
        "type": "string"
      },
      "tool": {
        "type": "string"
      },
      "fact": {
        "type": "object",
        "properties": {
          "at": {
            "type": "object",
            "properties": {
              "scope": {
                "type": "string"
              },
              "inc": {
                "type": "string"
              },
              "kind": {
                "type": "string"
              }
            },
            "required": [
              "scope",
              "inc",
              "kind"
            ]
          },
          "seq": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "at",
          "seq",
          "hash"
        ]
      },
      "outboxIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "reason": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "judgedAt": {
        "type": "object",
        "properties": {
          "seq": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "seq",
          "hash"
        ]
      },
      "retained": {
        "type": "boolean",
        "description": "true when this is a terminal outcome kept under custody, and nothing was sent"
      },
      "archived": {
        "type": "object",
        "properties": {
          "floor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "commit": {
            "type": "string"
          },
          "through": {
            "type": "object",
            "properties": {
              "seq": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "hash": {
                "type": "string"
              }
            },
            "required": [
              "seq",
              "hash"
            ]
          }
        },
        "required": [
          "floor",
          "commit",
          "through"
        ]
      },
      "phase": {
        "type": "string",
        "enum": [
          "prepared",
          "sent",
          "unknown",
          "accepted",
          "archived",
          "refused",
          "mismatch",
          "settled"
        ],
        "description": "The state of this client's kept request. Acceptance records the request; it does not prove that the installation workflow finished."
      },
      "effects": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      },
      "item": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "required": [
      "answer"
    ]
  },
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `prepare`

Asks the scope that owns a resource for one step of a capability. With kind: for the intent an act will submit later under the same idempotencyKey; resource: the scope asked, which may differ from target; then the act's own target, kind, on, fields, texts, presented and values. Without kind: a step with no act, such as hold@1's instance, whose own intent (kind capability:step, with fields) goes to the resource. Returns the resource's answer for that step, never an act's receipt.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "resource": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "capability": {
        "type": "string",
        "maxLength": 128
      },
      "step": {
        "type": "string",
        "maxLength": 128
      },
      "target": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "kind": {
        "type": "string"
      },
      "on": {
        "type": "integer",
        "minimum": 0
      },
      "at": {
        "type": "object",
        "additionalProperties": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "description": "Captured revisions keyed by exactly the act's bound subjects (on and also aliases). Omit to read current revisions. A stale captured revision is signed unchanged and the scope decides."
      },
      "fields": {
        "type": "object"
      },
      "texts": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "presented": {
        "type": "object"
      },
      "values": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128,
        "description": "Your key for this one meaning, 1 to 128 bytes. Keep it."
      }
    },
    "required": [
      "resource",
      "capability",
      "step",
      "idempotencyKey"
    ],
    "additionalProperties": false,
    "if": {
      "required": [
        "kind"
      ]
    },
    "then": {
      "required": [
        "target"
      ],
      "properties": {
        "on": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      }
    }
  },
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `items`

A page of one item type of a scope, in one of two traversals, each with its own cursor: the live items, from the scope's summary (the default); or, with final: true, the retained final items. The cursor is not checked against its traversal: to continue, call again with the same scope, type and final flag.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "type": {
        "type": "string"
      },
      "final": {
        "type": "boolean",
        "description": "true: the traversal of the retained final items, separate from the live one; the default is the live items"
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "scope",
      "type"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `steps`

A page of a scope's entries, oldest first, one line each: seq, time, kind, signer, effects and sends counts.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `step`

One entry in full: its input, fields, effects, sends and hash, paged by bytes with offset. A detached text's digest resolves with text.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "seq": {
        "type": "integer",
        "minimum": 0
      },
      "offset": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
      "scope",
      "seq"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `record`

A page of the history as stored: each entry's canonical bytes and hash, for a verifier or an exact comparison.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `sends`

A page of a scope's sends with their attempts and results; or, with outboxId (seq.n, as a receipt lists it), the status of that one send.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "outboxId": {
        "type": "string"
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `text`

A retained input by scope, kind and digest: a definition, a foreign entry, a rule's input, a detached text, a snapshot, or a value in its byte domain; paged by bytes with offset.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "kind": {
        "enum": [
          "definition",
          "entry",
          "rule",
          "text",
          "snapshot",
          "value"
        ]
      },
      "digest": {
        "type": "string"
      },
      "domain": {
        "type": "string"
      },
      "offset": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
      "scope",
      "kind",
      "digest"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `wait`

Waits at most 60 seconds until one of: a scope's head reaches seq; an item reaches one of states; the scopes an entry created (entry) and the scopes their genesis created exist and are active; a send (outboxId) has a result. Returns what it saw and whether it timed out. Never writes.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "seq": {
        "type": "integer",
        "minimum": 0
      },
      "item": {
        "type": "integer",
        "minimum": 0
      },
      "type": {
        "type": "string",
        "description": "the item's type; with item, a final item is found among the retained ones"
      },
      "states": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "entry": {
        "type": "integer",
        "minimum": 0
      },
      "outboxId": {
        "type": "string"
      },
      "seconds": {
        "type": "integer",
        "minimum": 1,
        "maximum": 60
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `settle`

What is known about the envelope under idempotencyKey on target (or the creation of definition): the act's phase and kept outcome, the scope's settlement for an act that is not final, and each preparation step apart. Signs nothing and sends no act.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "target": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "definition": {
        "type": [
          "string",
          "object"
        ]
      },
      "membership": {
        "anyOf": [
          {
            "type": "string",
            "pattern": "^sc_[a-z2-7]{51}[aq]$"
          },
          {
            "type": "object",
            "properties": {
              "scope": {
                "type": "string",
                "pattern": "^sc_[a-z2-7]{51}[aq]$"
              },
              "inc": {
                "type": "string",
                "pattern": "^in_[a-z2-7]{25}[aeimquy4]$"
              },
              "kind": {
                "enum": [
                  "register",
                  "directory",
                  "membership",
                  "rules",
                  "destination",
                  "inbox",
                  "task",
                  "lane",
                  "commons"
                ]
              }
            },
            "required": [
              "scope",
              "inc",
              "kind"
            ],
            "additionalProperties": false
          }
        ]
      },
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128,
        "description": "Your key for this one meaning, 1 to 128 bytes. Keep it."
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "idempotencyKey"
    ],
    "additionalProperties": false,
    "anyOf": [
      {
        "required": [
          "target"
        ]
      },
      {
        "required": [
          "definition"
        ]
      }
    ]
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `credential`

The one-time read credential for a read-token act your key signed (entry: its seq at the destination), read once from the destination's credential route with your session. Its result is a secret: the credential appears once in the text content. The structured content holds only the remote URL, expiry, and entry. Use it with Git; it is not kept here.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "entry": {
        "type": "integer",
        "minimum": 1
      },
      "target": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      }
    },
    "required": [
      "entry"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": false
  }
}
```

### `diff`

The change between two exact commits, read with the one-time credential of a read-token act your key signed (entry: its seq at the destination). The server keeps the credential and spends it on this read. It signs nothing. The answer holds at most 40 KiB of text. Over a bound, truncated is true and the text says truncated. An object the host does not give is an error, and the answer shows no change it did not read. Sign another read-token for another diff.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "entry": {
        "type": "integer",
        "minimum": 1
      },
      "base": {
        "type": "string",
        "pattern": "^[0-9a-f]{40}$",
        "description": "The exact commit ID of the older side."
      },
      "integration": {
        "type": "string",
        "pattern": "^[0-9a-f]{40}$",
        "description": "The exact commit ID of the newer side."
      },
      "target": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      }
    },
    "required": [
      "entry",
      "base",
      "integration"
    ],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "base": {
        "type": "string"
      },
      "integration": {
        "type": "string"
      },
      "files": {
        "type": "integer",
        "minimum": 0
      },
      "truncated": {
        "type": "boolean"
      },
      "text": {
        "type": "string"
      }
    },
    "required": [
      "base",
      "integration",
      "files",
      "truncated",
      "text"
    ]
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": false,
    "openWorldHint": true
  }
}
```

### `actions`

The acts of one scope, as act tools would describe them: each kind with its derived description, input schema, binding and the definition digest to give to act. For a host that lists few tools.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "cursor": {
        "type": "string"
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `act`

Signs one act of a scope by its native kind, under the same custody and binding checks as an act tool. digest: the definition digest actions gave; fields as actions describes; idempotencyKey required.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "target": {
        "type": [
          "string",
          "integer"
        ],
        "description": "A scope ID; one of register, directory, membership, rules, commons, destination, inbox; or an issue or change number."
      },
      "kind": {
        "type": "string"
      },
      "digest": {
        "type": "string"
      },
      "on": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      },
      "at": {
        "type": "object",
        "additionalProperties": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "description": "Captured revisions keyed by exactly the act's bound subjects (on and also aliases). Omit to read current revisions. A stale captured revision is signed unchanged and the scope decides."
      },
      "fields": {
        "type": "object"
      },
      "texts": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "presented": {
        "type": "object"
      },
      "values": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128,
        "description": "Your key for this one meaning, 1 to 128 bytes. Keep it."
      },
      "resubmit": {
        "type": "boolean"
      }
    },
    "required": [
      "target",
      "kind",
      "digest",
      "idempotencyKey"
    ],
    "additionalProperties": false
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "answer": {
        "type": "string",
        "enum": [
          "accepted",
          "archived",
          "refused",
          "unavailable",
          "mismatch"
        ],
        "description": "The room's Native decision: accepted, archived, refused, unavailable, or mismatch. A lost reply remains a separate custody finding."
      },
      "sentence": {
        "type": "string"
      },
      "next": {
        "type": "string"
      },
      "scope": {
        "type": "string"
      },
      "kind": {
        "type": "string"
      },
      "tool": {
        "type": "string"
      },
      "fact": {
        "type": "object",
        "properties": {
          "at": {
            "type": "object",
            "properties": {
              "scope": {
                "type": "string"
              },
              "inc": {
                "type": "string"
              },
              "kind": {
                "type": "string"
              }
            },
            "required": [
              "scope",
              "inc",
              "kind"
            ]
          },
          "seq": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "at",
          "seq",
          "hash"
        ]
      },
      "outboxIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "reason": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "judgedAt": {
        "type": "object",
        "properties": {
          "seq": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "seq",
          "hash"
        ]
      },
      "retained": {
        "type": "boolean",
        "description": "true when this is a terminal outcome kept under custody, and nothing was sent"
      },
      "archived": {
        "type": "object",
        "properties": {
          "floor": {
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          },
          "commit": {
            "type": "string"
          },
          "through": {
            "type": "object",
            "properties": {
              "seq": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "hash": {
                "type": "string"
              }
            },
            "required": [
              "seq",
              "hash"
            ]
          }
        },
        "required": [
          "floor",
          "commit",
          "through"
        ]
      },
      "phase": {
        "type": "string",
        "enum": [
          "prepared",
          "sent",
          "unknown",
          "accepted",
          "archived",
          "refused",
          "mismatch",
          "settled"
        ],
        "description": "The state of this client's kept request. Acceptance records the request; it does not prove that the installation workflow finished."
      },
      "effects": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      },
      "item": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "required": [
      "answer"
    ]
  },
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### `install_application`

Install an operator-trusted package in this room by immutable Git URI and independent expected release. Select default roles explicitly; values are the application genesis fields. Keeps one signed native envelope under idempotencyKey before submission. Repeating the same key and meaning retains that envelope. Acceptance records the install request; application_installation reads its pending, active or final refused result. The host fetches the URI independently.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "owner": {
        "type": "object",
        "properties": {
          "membership": {
            "type": "object",
            "properties": {
              "scope": {
                "type": "string",
                "pattern": "^sc_[a-z2-7]{51}[aq]$"
              },
              "inc": {
                "type": "string",
                "pattern": "^in_[a-z2-7]{25}[aeimquy4]$"
              },
              "kind": {
                "enum": [
                  "register",
                  "directory",
                  "membership",
                  "rules",
                  "destination",
                  "inbox",
                  "task",
                  "lane",
                  "commons"
                ]
              }
            },
            "required": [
              "scope",
              "inc",
              "kind"
            ],
            "additionalProperties": false
          },
          "member": {
            "type": "string",
            "pattern": "^@.",
            "minLength": 2
          }
        },
        "required": [
          "membership",
          "member"
        ],
        "additionalProperties": false,
        "description": "Existing full MemberRef chosen for a device package. Native installation checks its current membership."
      },
      "uri": {
        "type": "string",
        "maxLength": 4096
      },
      "release": {
        "type": "string",
        "pattern": "^sha256:[0-9a-f]{64}$"
      },
      "roles": {
        "type": "array",
        "maxItems": 5,
        "uniqueItems": true,
        "items": {
          "enum": [
            "admin",
            "maintainer",
            "member",
            "agent",
            "checker"
          ]
        }
      },
      "values": {
        "type": "object"
      },
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128,
        "description": "Your key for this one meaning, 1 to 128 bytes. Keep it."
      }
    },
    "required": [
      "uri",
      "release",
      "roles",
      "values",
      "idempotencyKey"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": false,
    "destructiveHint": true,
    "idempotentHint": true,
    "openWorldHint": true
  }
}
```

The device-install cohorts, including the commons cohort, require `owner`
as a full MemberRef for a package declaring `device-command@1`. Their
native Rules checks current membership before issuing the bounded grant.
Older install proof cohorts reject this owner selection. The owner is
part of the kept signed request's meaning.

A package can require the commons endpoint. The host reports
`commons-missing` before signing if the room has no verified commons ref.
That host check is not a recorded refusal in an older room. Directory@22
also checks the requirement sent by Rules@14 and records `commons-missing`
if its commons ref is absent.

### `application_installation`

Read one native installation in the configured room, including its state, installation workflow phase and final refusal reason. Earlier committed activation and grants can remain after a later refusal. Active results include the exact generic screen address. This read signs no install or continuation and changes no native state.

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "required": [
      "item"
    ],
    "additionalProperties": false
  },
  "annotations": {
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true,
    "openWorldHint": false
  }
}
```

### The act tools of the demo room

The act tools that `tools/list` sends to an admin of the demo room: the six
platform scopes on the default cohort, an issue lane under `issue-demo` and
a change lane under `change-demo`. Each description is as sent. The whole
list, with every input and output schema, is `docs/mcp-tools.json`. A test
derives it again and compares.

| Tool | Act | Description as sent |
|---|---|---|
| `change.ask-rules` | change `ask-rules` | ask-rules: moves a proposal; needs change.propose, which your role (admin) holds. Fields: none. No guards. |
| `change.cancel-merge` | change `cancel-merge` | cancel-merge: moves a merge; needs change.merge, which your role (admin) holds; from intended. Fields: none. Guards: this merge is intended; this merge's withdrawal is not set. |
| `change.close-own` | change `close-own` | close-own: moves a proposal; needs change.edit-own, which your role (admin) holds; from draft or open, to closed. Fields: none. Guards: this proposal is draft or open; no merge is intended, committed or unknown (merge-in-progress); you are this proposal's author. |
| `change.comment` | change `comment` | comment: opens a comment; needs change.comment, which your role (admin) holds. Fields: body (required): text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. mentions: a list of up to 16, each a member, as @handle. replyTo: the ID of a comment item on this scope. thread: the ID of a thread item on this scope. No guards. |
| `change.create` | platform:directory `open-pr` | open-pr: opens a lane; needs change.open, which your role (admin) holds. Fields: definition (required): the digest of a value in the definition domain, up to 262144 bytes, with its bytes in values or read from the rules scope; choices from the rules scope: change sha256:91d40909fb307b024233967419bee436de7da931818bc96d492ef55d598cc00d, issue sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e. title (required): text up to 256 bytes. body: text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. draft (required): true or false. Guards: the repository's destination is set; the repository's rules is set; the definition is active in the rules scope, and its bytes and the definitions it names are at hand (not-activated, unsupported-definition). |
| `change.edit-own` | change `edit-own` | edit-own: moves a proposal; needs change.edit-own, which your role (admin) holds; from draft, open or closed. Fields: body: text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. labels: a list of up to 20, each text up to 64 bytes. title: text up to 256 bytes. Guards: this proposal is draft, open or closed; you are this proposal's author. |
| `change.link-own` | change `link-own` | link-own: opens a link; needs change.edit-own, which your role (admin) holds. Fields: how (required): one of keyword, manual. issue (required): a reference to a lane scope, as { scope, inc, kind }. Guards: no merge is intended, committed or unknown (merge-in-progress); the proposal is draft, open or closed; no link is set where the link's issue equals the act's issue (already-linked); you are the proposal's author. |
| `change.merge` | change `merge` | merge: opens a merge; needs change.merge, which your role (admin) holds. Fields: manifest (required): the ID of a manifest item on this scope. reports (required): a list of up to 32, each an entry of kind report under issue, as { at, seq, hash }. Guards: the proposal is open (draft); the manifest is current (newer-version); the manifest's complete equals true (not-complete); no merge is intended, committed or unknown (merge-in-progress); the rules' revision differs from nothing (rules-unknown); at least the rules' approvals reviews are submitted where the review's verdict equals "approve" and the review's manifest equals the manifest (approvals-needed); no review is submitted where the review's verdict equals "request-changes" and the review's manifest equals the manifest (changes-requested). Guards 8 to 10 of 10 are left out (named: required-check-not-passed, reports-not-selected); see inspect with describe: "merge". |
| `change.offer` | change `offer` | offer: opens a commitment; needs change.request, which your role (admin) holds. Fields: offeree: a member, as @handle. terms (required): text up to 4096 bytes. Guards: the proposal is draft or open. |
| `change.propose-file` | change `propose-file` | propose-file: opens a manifest; needs change.propose, which your role (admin) holds. Fields: base (required): a Git commit ID, 40 or 64 hex characters. content (required): text up to 65536 bytes. digest (required): a digest, sha256: and 64 hex characters. path (required): text up to 1024 bytes. size (required): a whole number from 0 to 65536. Guards: the proposal is draft or open; you are the proposal's author; no merge is intended, committed or unknown (merge-in-progress); no manifest is current or superseded (one-version). |
| `change.propose-version` | change `propose-manifest` | propose-manifest: opens a manifest; needs change.propose, which your role (admin) holds. Fields: in the input schema. Presented facts: in the input schema. Guards: the proposal is draft or open; no merge is intended, committed or unknown (merge-in-progress); no manifest is current, except the previous (not-the-current-version); the previous is current; one of: [the act's hold differs from nothing; the act's lane equals nothing; the act's foreignHold equals nothing; the presented pin equals nothing] or [the act's hold equals nothing; the act's lane differs from nothing; the act's foreignHold differs from nothing; the presented pin differs from nothing] (source-shape); you are the hold's holder; the hold is held or ended; the commitment is accepted; you are the commitment's performer. Guards 10 to 24 of 24 are left out (named: pin-mismatch, selection-malformed, plan-not-of-goal, decision-without-plan, not-complete); see inspect with describe: "propose-manifest". |
| `change.ready-own` | change `ready-own` | ready-own: moves a proposal; needs change.edit-own, which your role (admin) holds; from draft, to open. Fields: none. Guards: this proposal is draft; you are this proposal's author. |
| `change.release` | change `release-hold` | release-hold: moves a hold; needs change.work, which your role (admin) holds; from held. Fields: none. Guards: this hold is held; you are this hold's holder. |
| `change.request-check` | change `request-check` | request-check: opens a job; needs change.propose, which your role (admin) holds. Fields: configuration (required): a digest, sha256: and 64 hex characters. earlier: the ID of a job item on this scope. manifest (required): the ID of a manifest item on this scope. name (required): text up to 128 bytes. Guards: the manifest is current; no merge is intended, committed or unknown (merge-in-progress); the earlier's manifest equals the manifest; the earlier's name equals the act's name; the earlier is requested, passed, failed, errored or timed-out; no job is requested, passed, failed, errored or timed-out where the job's manifest equals the manifest and the job's name equals the act's name, except the earlier (job-exists); some k in the rules' checks where k.name equals the act's name and k.configuration equals the act's configuration (not-a-check-of-the-rules). |
| `change.request-review` | change `request-review-own` | request-review-own: opens a review-request; needs change.edit-own, which your role (admin) holds. Fields: requested (required): a member, as @handle. Guards: the proposal is draft or open; you are the proposal's author. |
| `change.review` | change `review-verdict` | review-verdict: opens a review; needs change.review, which your role (admin) holds. Fields: body: text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. earlier: the ID of a review item on this scope. extent: text up to 64 bytes. manifest (required): the ID of a manifest item on this scope. request: the ID of a review-request item on this scope. verdict (required): one of approve, request-changes. Guards: the manifest is current; no merge is intended, committed or unknown (merge-in-progress); neither you nor your principal is the manifest's authors (author-cannot-review); you are the earlier's reviewer; the earlier's manifest equals the manifest; the earlier is submitted; you are the request's requested; the request is open; no review is submitted where the review's manifest equals the manifest and the review's reviewer equals you, except the earlier (verdict-exists). |
| `change.take` | change `accept` | accept: moves a commitment; needs change.promise, which your role (admin) holds; from offered, to accepted. Fields: terms (required): an entry of kind offer under change, as { at, seq, hash }. Guards: this commitment is offered; one of: [this commitment's offeree is not set] or [you are this commitment's offeree] (not-offeree); the act's terms equals this commitment's termsAt (terms-differ). |
| `change.work` | change `take-hold` | take-hold: opens a hold; needs change.work, which your role (admin) holds. Fields: commitment (required): the ID of a commitment item on this scope. extent: text up to 1024 bytes. Guards: the proposal is draft or open; the commitment is accepted; you are the commitment's performer; no hold is held where the hold's under equals the commitment (hold-held). |
| `inbox.dismiss` | platform:inbox `dismiss` | dismiss: moves a notice; needs inbox.own, which your role (admin) holds; from unread or read, to dismissed. Fields: none. Guards: you are the inbox's owner; this notice is unread or read. |
| `inbox.mark-read` | platform:inbox `mark-read` | mark-read: moves a notice; needs inbox.own, which your role (admin) holds; from unread, to read. Fields: none. Guards: you are the inbox's owner; this notice is unread. |
| `issue.accept` | issue `accept-report` | accept-report: moves a report; needs issue.request, which your role (admin) holds; from reported, to accepted. Fields: commitment (required): the ID of a commitment item on this scope. terms (required): an entry of kind file, revise or propose-terms under issue, as { at, seq, hash }. Guards: this report is reported; this report's under equals the commitment (not-this-commitment); you are the commitment's requester; neither you nor your principal is this report's authors; this report's termsAt equals the commitment's termsAt (terms-differ); the act's terms equals this report's termsAt (terms-differ). |
| `issue.assign` | issue `assign` | assign: moves an intent; needs issue.triage, which your role (admin) holds. Fields: assignees (required): a list of up to 10, each a member, as @handle. No guards. |
| `issue.close-any` | issue `close-any` | close-any: moves an intent; needs issue.triage, which your role (admin) holds; from open, to closed. Fields: reason: one of completed, not-planned. Guards: this intent is open. |
| `issue.close-own` | issue `close-own` | close-own: moves an intent; needs issue.close-own, which your role (admin) holds; from open, to closed. Fields: reason: one of completed, not-planned. Guards: this intent is open; you are this intent's requester. |
| `issue.comment` | issue `comment` | comment: opens a comment; needs issue.comment, which your role (admin) holds. Fields: body (required): text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. mentions: a list of up to 16, each a member, as @handle. replyTo: the ID of a comment item on this scope. No guards. |
| `issue.create` | platform:directory `open-issue` | open-issue: opens a lane; needs issue.open, which your role (admin) holds. Fields: definition (required): the digest of a value in the definition domain, up to 262144 bytes, with its bytes in values or read from the rules scope; choices from the rules scope: change sha256:91d40909fb307b024233967419bee436de7da931818bc96d492ef55d598cc00d, issue sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e. title (required): text up to 256 bytes. body: text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. conditions (required): a list of up to 16, each text up to 4096 bytes. Guards: the definition is active in the rules scope, and its bytes and the definitions it names are at hand (not-activated, unsupported-definition). |
| `issue.edit-own` | issue `edit-own` | edit-own: moves an intent; needs issue.edit-own, which your role (admin) holds. Fields: body: text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. title: text up to 256 bytes. Guards: you are this intent's requester. |
| `issue.hand-in` | issue `report` | report: opens a report; needs issue.work, which your role (admin) holds. Fields: claims: a list of up to 32, each text up to 1024 bytes. commit (required): a Git commit ID, 40 or 64 hex characters. commitment (required): the ID of a commitment item on this scope. evidence: a list of up to 32, each a digest, sha256: and 64 hex characters. summary: text up to 65536 bytes, kept apart from the entry: give the text itself, or its digest with the text in texts. terms (required): an entry of kind file, revise or propose-terms under issue, as { at, seq, hash }. tree (required): a Git tree ID, 40 or 64 hex characters. Guards: the commitment is accepted; you are the commitment's performer; the act's terms equals the commitment's termsAt (terms-differ); hold's rule staged holds, with commit the act's commit and under the commitment; git-read's rule ancestry holds, with commit the act's commit and row "report". |
| `issue.offer` | issue `offer` | offer: opens a commitment; needs issue.request, which your role (admin) holds. Fields: offeree: a member, as @handle. Guards: the goal is open. |
| `issue.reopen-own` | issue `reopen-own` | reopen-own: moves an intent; needs issue.close-own, which your role (admin) holds; from closed, to open. Fields: none. Guards: this intent is closed; you are this intent's requester. |
| `issue.take` | issue `accept` | accept: moves a commitment; needs issue.promise, which your role (admin) holds; from offered, to accepted. Fields: terms (required): an entry of kind file, revise or propose-terms under issue, as { at, seq, hash }. Guards: this commitment is offered; one of: [this commitment's offeree is not set] or [you are this commitment's offeree] (not-offeree); the act's terms equals this commitment's termsAt (terms-differ). |
| `issue.work` | issue `take-hold` | take-hold: opens a hold; needs issue.work, which your role (admin) holds. Fields: commitment (required): the ID of a commitment item on this scope. extent: text up to 1024 bytes. Guards: the commitment is accepted; you are the commitment's performer; no hold is held where the hold's under equals the commitment (hold-held). |
| `key.invite` | platform:membership `invite-key` | invite-key: opens a key; the rule recovery-key decides who may sign, or your role holds membership.invite. Fields: member (required): the ID of a member item on this scope. kind (required): one of device, agent, checker. inviteHash (required): a digest, sha256: and 64 hex characters. inviteEnds (required): a time, as RFC 3339 UTC ending in Z. Guards: the member is active (member-removed). |
| `key.revoke` | platform:membership `revoke-key` | revoke-key: moves a key; the rule recovery-key decides who may sign, or your role holds membership.manage; from active, to retired or compromised. Fields: as (required): one of retired, compromised. Guards: this key is active; the room keeps at least one active admin with an active key (last-admin). |
| `member.actions` | platform:membership `set-actions` | set-actions: moves a roster; needs membership.manage, which your role (admin) holds. Fields: role (required): one of admin, maintainer, member, agent, checker. actions (required): a value that the platform rule checks: a list of actions, each an action the platform knows. No guards. |
| `member.add` | platform:membership `add-member` | add-member: opens a member; needs membership.manage, which your role (admin) holds. Fields: handle (required): text up to 256 bytes. kind (required): one of agent, checker. controller: a member, as @handle. Guards: no member is invited, active or removed where the member's handle equals the act's handle (handle-in-use); the handle is a handle: @, then letters, digits, dots, dashes or underscores (bad-handle); one of: [the act's kind equals "checker"; the act's controller equals nothing] or [the act's kind equals "agent"; some member is active where the member's member equals the act's controller and the member's kind equals "person"] (no-controller). |
| `member.invite` | platform:membership `invite-member` | invite-member: opens a member; the rule recovery-key decides who may sign, or your role holds membership.invite. Fields: handle (required): text up to 256 bytes. role (required): one of admin, maintainer, member, agent, checker. inviteHash (required): a digest, sha256: and 64 hex characters. inviteEnds (required): a time, as RFC 3339 UTC ending in Z. Guards: no member is invited, active or removed where the member's handle equals the act's handle (handle-in-use); the handle is a handle: @, then letters, digits, dots, dashes or underscores (bad-handle). |
| `member.remove` | platform:membership `remove-member` | remove-member: moves a member; the rule recovery-key decides who may sign, or your role holds membership.manage; from active, to removed. Fields: none. Guards: this member is active; the room keeps at least one active admin with an active key (last-admin). |
| `member.role` | platform:membership `set-role` | set-role: moves a member; needs membership.manage, which your role (admin) holds; from active. Fields: role (required): one of admin, maintainer, member. Guards: this member is active; this member's kind equals "person"; one of: [this member's role differs from "admin"] or [at least 2 members are active where the member's role equals "admin"] (last-admin). |
| `repository.add-branch-room` | platform:destination `add-branch-room` | add-branch-room: moves a branch; needs ledger.retry, which your role (admin) holds. Fields: none. No guards. |
| `repository.add-room` | platform:destination `add-room` | add-room: moves a publication; needs ledger.retry, which your role (admin) holds; from queued, reserved, publishing or unresolved. Fields: none. Guards: this publication is queued, reserved, publishing or unresolved. |
| `repository.adopt-head` | platform:destination `adopt-head` | adopt-head: moves a branch; needs destination.adopt, which your role (admin) holds. Fields: commit (required): a Git commit ID, 40 or 64 hex characters. why (required): text up to 1024 bytes. Guards: no publication is reserved, publishing or unresolved; this branch's slot is not set. |
| `repository.read-token` | platform:destination `read-token` | read-token: moves a branch; needs destination.read-token, which your role (admin) holds. Fields: hours (required): a whole number from 1 to 24. No guards. |
| `repository.resend` | platform:destination `resend` | resend: moves a publication; needs ledger.retry, which your role (admin) holds. Fields: none. Guards: the earlier attempt is unanswered and its retry is due (resend-not-due). |
| `repository.resend-receipt` | platform:destination `resend-receipt` | resend-receipt: moves a branch; needs ledger.retry, which your role (admin) holds. Fields: receipt (required): the ID of a receipt item on this scope. Guards: the receipt is owed (receipt-not-owed); the earlier attempt is unanswered and its retry is due (resend-not-due). |
| `repository.retry-import` | platform:directory `retry-import` | retry-import: moves a repository; needs ledger.retry, which your role (admin) holds. Fields: none. Guards: the repository's import has ended without success, so it may be tried again (import-not-spent). |
| `room.create` | platform:register `found` | found: opens a claim; the rule founding-policy decides who may sign. Fields: branch (required): text up to 256 bytes. founderHandle (required): text up to 256 bytes. recoveryKey (required): text up to 64 bytes. import: text up to 2048 bytes. Guards: the creator's handle is a handle: @, then letters, digits, dots, dashes or underscores (bad-handle). |
| `room.enrol` | platform:membership `enrol` | enrol: moves a roster; the rule by-invitation decides who may sign. Fields: invitation (required): a whole number from 0 to 1000000000. secret (required): text up to 256 bytes. Guards: the key is invited or lapsed (invitation-used); now is before the key's inviteEnds (invitation-expired); the key is invited (invitation-expired); the member is active (member-removed). |
| `room.first-key` | platform:membership `first-key` | first-key: opens a key; the rule founding-key decides who may sign. Fields: member (required): the ID of a member item on this scope. Guards: no key is invited, active, retired or compromised; the member is active; the member's handle equals the roster's foundingHandle. |
| `room.join` | platform:membership `join` | join: opens a key; the rule by-invitation decides who may sign. Fields: invitation (required): a whole number from 0 to 1000000000. secret (required): text up to 256 bytes. Guards: the member is invited or lapsed (invitation-used); now is before the member's inviteEnds (invitation-expired); the member is invited (invitation-expired). |
| `room.rotate-recovery` | platform:membership `rotate-recovery` | rotate-recovery: moves a roster; the rule recovery-key decides who may sign. Fields: key (required): text up to 64 bytes. Guards: no key is active, retired or compromised where the key's id equals the act's key (key-in-use). |
| `room.seat` | platform:membership `seat` | seat: opens a member; the rule founding-key decides who may sign. Fields: none. Guards: no member is invited, active or removed. |
| `rules.activate` | platform:rules `activate` | activate: opens a definition; needs rules.activate, which your role (admin) holds. Fields: digest (required): the digest of a value in the definition domain, up to 262144 bytes, with its bytes in values or read from the rules scope; choices from the rules scope: change sha256:91d40909fb307b024233967419bee436de7da931818bc96d492ef55d598cc00d, issue sha256:82a938c8f54ddcac7974ca688ebea7d51c35d2aa70f4e3729965e9f915bc464e. name (required): text up to 64 bytes. Guards: the definition's bytes are given beside the act, hash to the digest and validate (unsupported-definition); no definition is active where the definition's digest equals the act's digest. |
| `rules.keep-configuration` | platform:rules `keep-configuration` | keep-configuration: opens a configuration; needs rules.publish, which your role (admin) holds. Fields: digest (required): the digest of a value in the artroom-check-configuration-1 domain, up to 32768 bytes, with its bytes in values. name (required): text up to 128 bytes. Guards: the configuration's bytes are given beside the act and hash to the digest (configuration-mismatch). |
| `rules.publish` | platform:rules `publish` | publish: moves a rules; needs rules.publish, which your role (admin) holds. Fields: approvals (required): a whole number from 0 to 64. ownerMayReview (required): true or false. checks (required): a list of up to 32, each a record of name (required): text up to 128 bytes; configuration (required): a digest, sha256: and 64 hex characters; required (required): true or false; checker (required): a member, as @handle. labels (required): a list of up to 32, each text up to 64 bytes. extents (required): a value that the platform rule checks: a list of extents, each with a name, a class, paths, approvals, an approver and checks. singleControllerException: true or false. Guards: for each k in the act's checks: [some configuration is kept where the configuration's digest equals k.configuration] (configuration-unknown). Guards 2 to 3 of 3 are left out (named: not-a-checker, rules-extent-required, catch-all-required, extent-check-unknown); see inspect with describe: "publish". |
| `rules.retire` | platform:rules `retire-definition` | retire-definition: moves a definition; needs rules.activate, which your role (admin) holds; from active, to retired. Fields: none. Guards: this definition is active. |
| `task.create` | platform:directory `open-task` | open-task: opens a task; needs task.control, which your role (admin) holds. Fields: worker (required): a member, as @handle. controller (required): a member, as @handle. lane (required): a reference to a lane scope, as { scope, inc, kind }. Guards: the worker is an active member with an active key (worker-not-active). |

### The words table

A tool's name is `<noun>.<verb>`. The table maps a definition's native
kind to a surface name. A kind it does not map keeps its own name under
the definition's name, such as `garden.plant`. The table maps names only.
A table that would give two kinds of one definition the same name is
refused when the server starts.

| Definition | Noun | Kind | Tool name |
|---|---|---|---|
| platform:register | room | `found` | `room.create` |
| platform:directory | issue | `open-issue` | `issue.create` |
| platform:directory | issue | `open-pr` | `change.create` |
| platform:directory | issue | `open-task` | `task.create` |
| platform:directory | issue | `retry-import` | `repository.retry-import` |
| platform:directory | issue | `establish-application` | `application.create` |
| platform:membership | room | `join` | `room.join` |
| platform:membership | room | `enrol` | `room.enrol` |
| platform:membership | room | `seat` | `room.seat` |
| platform:membership | room | `first-key` | `room.first-key` |
| platform:membership | room | `rotate-recovery` | `room.rotate-recovery` |
| platform:membership | room | `invite-member` | `member.invite` |
| platform:membership | room | `add-member` | `member.add` |
| platform:membership | room | `set-role` | `member.role` |
| platform:membership | room | `set-actions` | `member.actions` |
| platform:membership | room | `remove-member` | `member.remove` |
| platform:membership | room | `invite-key` | `key.invite` |
| platform:membership | room | `revoke-key` | `key.revoke` |
| platform:rules | rules | `publish` | `rules.publish` |
| platform:rules | rules | `activate` | `rules.activate` |
| platform:rules | rules | `retire-definition` | `rules.retire` |
| platform:rules | rules | `keep-configuration` | `rules.keep-configuration` |
| platform:destination | repository | `read-token` | `repository.read-token` |
| issue |  | `accept` | `issue.take` |
| issue |  | `take-hold` | `issue.work` |
| issue |  | `release-hold` | `issue.release` |
| issue |  | `renew-hold` | `issue.renew` |
| issue |  | `report` | `issue.hand-in` |
| issue |  | `accept-report` | `issue.accept` |
| change |  | `accept` | `change.take` |
| change |  | `take-hold` | `change.work` |
| change |  | `release-hold` | `change.release` |
| change |  | `renew-hold` | `change.renew` |
| change |  | `propose-manifest` | `change.propose-version` |
| change |  | `request-review-own` | `change.request-review` |
| change |  | `review-verdict` | `change.review` |

## The W1 inventory

Every command of the command line and every action of the page, with the
tool calls that perform it in each launch mode and the count of calls.
MCP has no tool for the public item query, the application listing or
operational status. Their gap rows have no recipe. Rows marked
`(local command)` run in Node outside MCP. The marker does not mean that
the work is offline or read-only. Package commands use local files and their
stated native scenarios. The scope-index operator uses authenticated native
reads and can write registrations in register mode. These rows have no MCP
server recipe.
`packages/scope/test/application-install-custody.test.ts` runs the two
trusted-application rows, with recovery of the original CLI request
through MCP, in the default and generic launch modes.
`packages/mcp/test/recipes.scope.test.ts` runs the other server rows on the
test Worker, with complete arguments, in the default and `--generic`
modes. It checks that the tools called are the ones the row names, in
order, as many times as it counts. In `--generic` mode, a recipe calls
`actions` once per scope within one activity, and its result serves every
later `act` on that scope. `--generic=add` lists both, so either recipe
works. The count given is the default recipe's.

| Activity | Default | --generic | --generic=add |
|---|---|---|---|
| `dap check [<directory>]` (local command) | Local files and native scenarios with explicit TEST authority; no MCP tool | Local only | Local only |
| `dap dev [<directory>]` (local command) | Local loopback preview with explicit TEST scenarios; no MCP tool | Local only | Local only |
| `dap new <directory>` (local command) | Creates local template files with public TEST scenarios; no MCP tool | Local only | Local only |
| `dap pack [<directory>]` (local command) | Local files and an existing named publisher key; no MCP tool | Local only | Local only |
| `dap install <git+https-uri>` (trusted-application room) | `install_application` with URI, release, selected roles, genesis values and the retained request key: 1 | `install_application`: 1 | 1 |
| `dap application <install-item>` (trusted-application room) | `application_installation` with the recorded item: 1 | `application_installation`: 1 | 1 |
| `dap apps [--cursor <cursor>]` (MCP gap: bounded application listing) | Unavailable in MCP; use the CLI listing | Unavailable in MCP | Unavailable in MCP |
| `dap install <base-url>`, `--plan`, `--planned` | `create` with `platform:register@26` by default (or an explicitly selected admitted cohort's register), kind install, the host, namespace, policy and creator keys: 1. The signed intent is kept before it is sent, which is what --plan keeps; after a lost reply, settle adds 1 | `create`: 1 | 1 |
| `dap create <name>` | `room.create` on the register with the branch, the creator's handle and a recovery key, `wait` with the entry for the created directory and its children, `room.seat`, `room.first-key` with the seat's entry, `wait` for the inbox: 5 | `actions` on the register, `act`, `wait`, `actions` on membership, `act` seat, `act` first-key, `wait`: 7 | 5 |
| Page: Create room | the same calls as `dap create`: `room.create`, `wait`, `room.seat`, `room.first-key`, `wait`: 5 | the same calls as `dap create`: 7 | 5 |
| `dap invite <@member> --role <role>` | `member.invite` with the handle, the role, the digest of a secret of at least 32 bytes that the inviter makes, and the end; the inviter passes the link with the number and secret to the member: 1 | `actions` on membership, `act`: 2 | 1 |
| `dap invite <@member> --device` (local command) | No MCP tool makes the link. The command signs the invitation of a device key and encodes the link it prints | Local only | Local only |
| `dap join <link>` | `join` with the link, from an empty configuration, then `wait` for the inbox: 2 | `join`, `wait`: 2 | 2 |
| `dap join <artroom-device-key link>` (local command) | No MCP tool. `join` takes `artroom-invite:` links. The command enrolls a new key in its config directory | Local only | Local only |
| Page: Join with an invitation link | `join`, `wait`: 2 | `join`, `wait`: 2 | 2 |
| Page: Rules editor | `inspect` on the rules scope, `rules.publish` with the changed counts and the rest kept: 2 | `inspect`, `actions` on the rules scope, `act`: 3 | 2 |
| `dap act <kind> --on <scope>` | The act tool of that kind, such as `rules.activate` with the definition's digest, name and bytes: 1 | `actions`, `act`: 2 | 1 |
| `dap acts [<scope>]` | `room`, whose notHeld names the act tools the role does not hold; the list holds the rest: 1 | `actions` on the scope: 1 | 1 |
| `dap issue open --title <text>` | `issue.create` with the issue definition's digest (its bytes are read from the rules scope), the title, the body and the title as its condition, then `wait` for the issue's lane: 2 | `actions` on the directory, `act`, `wait`: 3 | 2 |
| Page: Create issue | `issue.create`, `wait`: 2 | `actions`, `act`, `wait`: 3 | 2 |
| `dap issue comment <issue> <text>` | `issue.comment` with the issue's number and the body: 1 | `actions` on the lane, `act`: 2 | 1 |
| `dap issue assign <issue> <@member>` | `issue.assign` on the issue's intent item with the assignees: 1 | `actions`, `act`: 2 | 1 |
| `dap issue close <issue>` | `issue.close-own` when the caller opened it (issue.close-any otherwise), with the reason: 1 | `actions`, `act`: 2 | 1 |
| `dap issue wait <issue> <ask>` (local command) | No MCP tool. Runs in a shell after the agent's turn ends, reads the lane's head stream and exits when the question moves | Local only | Local only |
| `dap issues` | `room` for the lanes (paged by bytes), then `inspect` for each issue's own state: 1 + n | `room`, then `inspect` for each issue: 1 + n | 1 + n |
| `dap items <scope> --query <canonical-item-query-JSON>` (MCP gap: public item query) | Unavailable in MCP; use the SDK, CLI or Page query surface | Unavailable in MCP | Unavailable in MCP |
| `dap log <scope>` | `steps`, one per page: 1 | `steps`: 1 | 1 |
| `dap show <scope>:<seq>` | `step`: 1 | `step`: 1 | 1 |
| `dap verify <scope>` | `record`, one per page; the server verifies nothing, so a verifier outside it replays the canonical bytes, such as dap verify itself: 1 | `record`: 1 | 1 |
| `dap verify --all` | `room`, then `record` for each scope it names: 1 + n | `room`, then `record` for each scope: 1 + n | 1 + n |
| `dap scope-index inventory --out FILE`, `sweep --manifest FILE`, `verify --manifest FILE` (Node operator only) (local command) | No MCP tool. Saves or checks an exact manifest through authenticated native reads; register-mode reads can write registrations. No deployment mode or complete index is inferred. | Node operator only | Node operator only |
| `dap status [<scope>] [--request <16-hex-id>]` (MCP gap: operational status) | Unavailable in MCP; use the CLI or SDK operational reads | Unavailable in MCP | Unavailable in MCP |
| `dap remote` | `inspect` on the destination, whose branch item names the host, namespace and name: 1 | `inspect`: 1 | 1 |
| `dap clone [<directory>]` | `repository.read-token` with the hours, `wait` for the outcome entry, `credential` with the act's entry, then Git: git clone with the credential as the header: 3 and Git | `actions` on the destination, `act`, `wait`, `credential`, then Git: 4 and Git | 3 and Git |
| Page: Propose an edit | `change.create` with the change definition's digest and a title, `wait` for the lane, `change.ask-rules`, `wait` for the rules item, `inspect` on the destination for the head, `change.propose-file` with the base, path, digest, size and the text inline: 6 | `actions` on the directory, `act`, `wait`, `actions` on the lane, `act`, `wait`, `inspect`, `act`: 8 | 6 |
| Page: Review | `inspect` on the change for its current version, `change.review` with the version and the verdict: 2 | `inspect`, `actions`, `act`: 3 | 2 |
| Page: Comment | `change.comment` on a change (issue.comment on an issue), with the body: 1 | `actions`, `act`: 2 | 1 |
| Page: Merge | `inspect` on the change for its current version, `change.merge` with the version and the reports it selects, `wait` for the merge to be published, refused or aborted: 3 | `inspect`, `actions`, `act`, `wait`: 4 | 3 |
| `dap edit <path> --file <file>` | `change.create`, `wait`, `change.ask-rules`, `wait`, `inspect` on the destination for the head, `change.propose-file` with the text inline, then as dap merge: `inspect` on the change, `change.link-own` with the issue for --closes, `change.merge`, `wait`; 9 without --closes: 10 | `actions` on the directory, `act`, `wait`, `actions` on the lane, `act`, `wait`, `inspect`, `act`, `inspect`, `act` link-own, `act` merge, `wait`: 12 | 10 |
| `dap merge <change>` | `inspect` on the change for its current version, `change.merge`, `wait`: 3; with --closes, change.link-own first | `inspect`, `actions`, `act`, `wait`: 4 | 3 |
| `dap propose <branch>` | Git first: the agent reads the committed files that differ from the room's head. Then, under the manifest-list change definition and a version 3 destination: `change.create`, `wait` for the lane, `change.ask-rules`, `wait` for the rules item, `inspect` on the destination for the head, `change.propose-file` once per path with the base, path, digest, size and text, `change.propose-version` with the base and each file's entry and digest, `change.merge` with that version, `wait` for the merge to be published: 8 + n | `actions` on the directory, `act`, `wait`, `actions` on the lane, `act`, `wait`, `inspect`, `act` per path, `act` propose-manifest, `act` merge, `wait`: 10 + n | 8 + n |
| Page: Check status | `settle` with the target and the key: 1 | `settle`: 1 | 1 |
| Page: Record inspection | `room` for the role and key, `record` on membership: 2 | `room`, `record`: 2 | 2 |
| A capability step | `prepare` at the resource, with the act's own target, kind and fields, then the act tool under the same key, such as `issue.hand-in`: 2 | `prepare`, `actions`, `act`: 3 | 2 |
| A send's outcome | `sends` on the scope, then `wait` with the outbox ID a receipt named: 2 | `sends`, `wait`: 2 | 2 |

Git steps: `clone` and `propose` use Git outside the server. The server
returns the remote URL and a one-time credential. The agent's own Git, or
a generic credential helper, uses them. The server runs no Git program. The
`diff` tool reads Git objects over HTTP, with that one-time credential.

`propose` runs, in the recipe test, in a room of its own under
`change-demo3`, the manifest-list change definition, with a version 3
destination: two files, a version that names both, accepted, and a merge
that the room publishes. The destination builds the tree from the files'
entries. The agent sends no tree. Under the demo change definition,
`change-demo`, whose `propose-manifest` is the hold workflow's and which
holds one version only, the same steps end in the lane's refusal of the
version as `source-shape`. The recipe test asserts that refusal too.

## The hosted endpoint

The scope Worker can also serve these tools at `POST /mcp`, for an agent
on a host that cannot run a process.
[Run the hosted MCP endpoint](hosted-mcp.md) tells an operator how to turn
it on.
[Connect through a hosted endpoint](connect-an-ai-app.md#connect-through-a-hosted-endpoint)
gives a member's steps.

### Retirement and retained operations

Retirement erases the hosted Agent's seed, bearer and sessions and ends its
access credentials before outside cleanup. Those effects stay if a later
read or callback stops completion. A temporary postcommit refusal says that
cleanup may already be in effect and asks you to send the same operation
again. It does not roll back cleanup or create another credential.

A committed retirement cannot finish through this control path after its
original signer's key becomes retired or compromised. That key receives
its existing refusal. Another signer cannot take over the operation:
every fingerprint conflict keeps its existing two-field response. A member
with `membership.manage`, or the recovery key, runs Native `revoke-key` on
the Agent's key if that revocation still needs to finish. This independent
Native action does not complete the old local operation or replace its
first retained signed revoke.

Hosted retirement and `revoke-key` leave the Agent's member active in the
room. On the ordinary-member own-Agent path, that member keeps one of its
controller's eight places until a member with `membership.manage`, or the
recovery key, records `remove-member`. An ordinary controller that holds
only `membership.own-agent` cannot free the place itself. Retirement adds
no automatic member removal, permission or counter change.

The Registry connection list keeps an OAuth Agent's row without a retired
mark. The Agent's own list reports state `retired`; after issuer revocation
its connections are empty. A stop before issuer revocation can leave
unexpired issuer metadata in that list, even though the Agent cannot use
those credentials. A later distinct creation can replace a confirmed OAuth
mapping only through the existing retired-identity and fresh-authority
checks; that creates a different Agent, not a new retirement operation on
the old one. Unknown legacy or provisional mappings do not gain that path.

## Compact cards

An embedding application can supply `ServerPort.views`, a trusted
`ViewSource` projection adapter. It reads through the MCP service's normal
authenticated tools. The generic kit then lists four opening tools:
`view_needs_you`, `view_work`, `view_decision` and `view_change`.
Their text shows the screen, identity, exact revision and counts, so it
stays useful in a host without MCP Apps. The `view_read` and `view_act` tools
return card details to the app. The host enforces their app-only visibility.
Native scope authorization still applies to reads and signed acts.

Both wire revisions serve four single-file HTML resources under
`ui://dap/`. Each resource read checks package bytes against its declared
digest and preserves the package CSP and permissions. The browser boots
from the standard complete tool-input notification and obtains its data
through the app-only tool. The opening result need not carry private data.
Hosts without the MCP Apps capability get the text tool surface, and
paging cursors are bound to the capability profile.

The server retains each display's native action input. The browser sends
only its view key, display cut and action ID. Duplicate dispatch returns
its first outcome. The server checks the instance and cut again when it
signs, after its asynchronous reads. A superseded or unknown instance refuses a new
act. A lost or unavailable outcome offers only its original request check,
using the retained custody key. Full native responses stay under custody.
The card receipt shows item, version and outcome.

A card signs the revisions it displayed. An action can carry its own `at`.
Its names must be ones the card displayed, with the displayed revisions. A
card with no `at` on an action signs the card's `at`. If a subject has moved,
the act still goes out, and the scope refuses it with `revision-moved`. A
subject that has since gone final, such as a superseded version, keeps its
captured revision.

A card source can ask for the check of an earlier send. Each read of such a
card asks custody for an act that this server sent at the card's scope with
no outcome kept. If custody holds one, the card offers only **Check original
request**, and it keeps that offer after a restart. While custody holds such
an act, every other act of that card and of any retained card at that scope is
refused before it signs. This server's custody is the limit of that refusal:
a card with another custody home reaches the scope, and the scope judges its
revisions.

The check asks the scope for the exact request and signs nothing. Before the
signed intent's `notAfter`, an act with no answer stays unknown, and the receipt
gives the time to check again. Intents live at most 15 minutes. One minute
after `notAfter`, a margin for clock differences, the check sends the same bytes
once. An act that landed answers with its first entry. An act that never arrived
is refused as `expired`, so the record ends as `refused` and the next read
offers the card's acts again. If the scope cannot be reached, the record stays
unknown.

The scope's clock decides whether the bytes are expired, and one minute covers
ordinary differences. If the scope's clock lags this server's by more than one
minute, the same signed act can land when the check sends it. The act's signed
revisions still bind it, so it lands only if they still match. The check then
records that first entry as the act's answer.

If this server holds no record, the check says so and says that this does not
show the act was not sent.

**View diff** on a card with `diffRead` goes through `view_act`, because it
signs one `read-token` act. It reads one bounded `diff` and shows the answer
on the diff page. Reading a card signs nothing.

A card can also hold `interdiffReads`. Each one offers an interdiff from an
earlier version, and the diff page offers **File** for each changed path it
lists. Each of these reads signs one `read-token` act, and the answer names
the exact commits it read. A view keeps its last four answers, so a second
press of a read that it holds shows the answer again and signs nothing. A
moved version makes the held answers stale.

The server holds each read's commits and paths. The browser sends only an
opaque action ID. Over a bound, the page says "Truncated" and says what the
read left out.

The generic kit supplies the carousel, detail, diff, updates and receipt
screens. It does not include journey projections, package installation or
desktop-host registration. The
[card-kit note](../notes/implementation/2026-10-18-compact-card-kit.md)
gives the command that runs the fixture browser.

## Local project views

The opt-in [project entry](../apps/views/README.md) supplies five reads and
the compact cards. It uses your existing local configuration and signer.
It creates no key or room. The ordinary MCP server keeps its existing
tool list, and `mcp-tools.json` describes that ordinary list.

| Read | Result |
| --- | --- |
| `needs_you` | Requests, reviews, decisions, merges and required open findings that need your attention. Each row says what needs you, why it is yours and what settles it, and names its rule and the acts that settle it. |
| `work` | Agent commitments, terms, blocks and linked changes. |
| `context` | Question text, approvals, comments, conditions and Brief pin. |
| `change` | One change's exact version: base, integration, reviews, checks, rules, merges, open findings and linked issues. |
| `since` | What changed since an explicit Mark reviewed action on this device: each changed head, its newest entries with who signed them, and a count of earlier entries. |

Attention rows name their pinned declaration clause and observed head.
Work rows name each agent's controller beside the current conditions.
Context distinguishes text versions and the requests for their approval.

A read covers at most eight scopes, including Membership, Directory and
other support reads. Support scopes consume the same eight-scope limit.
At most six lanes fit in one call in the ordinary flat-directory case, and
other support scopes leave fewer lane slots. `work` reads only the first
window of lanes. The reads return at most 50 attention rows and read at most 512 live items.
Results report their read counts, omissions and incomplete discovery.
A vector of observed heads does not claim one atomic room snapshot.

Question context reads at most 512 total entries from the selected lane,
including entries unrelated to that Question. Each entry counts once,
including the current text entry. Exactly 512 entries fit this history
bound. Beyond 512 lane entries, `context` and the Decision card are
unavailable even if the Question itself is small. The existing page,
request and byte limits can stop the read sooner. If the 16-page bound
decides first, the read reports `page-limit`.

The public context omits unrelated live lane items and does not repeat
the current body in its version list. The Decision card has a separate
60 KiB display budget. `context` caps the complete serialized result at
256 KiB. JSON escaping and history metadata can exceed that bound even
for a legal 64 KiB Question body. The read then refuses with
`context-output-limit` rather than returning a partial Question.

The question-with-Brief profile records a required `brief` digest when
the question is asked. That value stays fixed when the text is revised.
A different Brief needs a new question. Earlier question profiles remain
unbound. Approvals name the question's text version. They grant no
authority over the Brief or the conditions.

The operator selects the package's local Brief file when starting the
project entry. `dap://package/brief` serves those exact UTF-8 bytes as
`text/plain`, with a 64 KiB limit and their byte digest. Context reports
whether that digest matches the question's stored pin. A mismatch does
not select another file or substitute the question-body digest. The
existing HTML resources under `ui://dap/` keep their own digest and
policy checks.

The Decision card retains the selected text version and native expected
revisions. Approve and Decide use the ordinary signing and request
custody path. An attention row explains why an item is listed; native
guards decide whether an act is allowed.

These reads and the Change card accept change lanes on two exact definition
pins: J4 and its finding successor. On the finding successor, the Change card
lists each open finding with its file, range, class, severity, source, source
version and change version. It says that a finding from a required source holds
the merge, and it offers no **Merge** while one does. The card escapes a source's
text by the rule of a diff path. `needs_you` lists a required open finding on a
live change when you have an act that bears on it, with its pin, clause and head.
A finding from a source that is not required stays on the card, says that it
does not hold the merge, and has no row. An answered finding leaves both.

No card answers a finding, and the project entry lists no act tool. On the
ordinary server, use `change.resolve-finding-any`,
`change.mark-finding-irrelevant` or `change.resolve-finding-own`. In `--generic`
mode, use `act` with those native kinds. None of them needs `at`, on the current
version or an earlier one. To sign the revisions that `change` read, pass a
finding's `answerAt` as `at`. The
[project entry's page](../apps/views/README.md#open-findings-on-the-finding-profile)
has the rows, the acts and the limits.

Mark reviewed writes only the captured full scope references and heads
to local storage under `DAP_HOME`. It signs no native act. The server
rechecks the displayed cut and heads before writing. A duplicate mark
does not rewrite the file. A mark requires a window with no unread scopes
or omitted rows. It covers the displayed heads and scopes, without claiming
review of every journal body between heads. A lane outside the window stays
unreviewed.

`since` is read-only: equal heads produce no row, and each new head
appears once in a response. Repeated reads keep showing that change
until another explicit mark. Reading a card does not clear it.

A mark belongs to one device. It moves that device's place and closes nothing.
A new device has no place, so it shows every scope again. To see what needs you,
read `needs_you`: its rows come from the record, so every device of a member
reads the same rows.

With more lanes than one call can read, `needs_you` and `since` read a window
of lanes in a stable order. `omittedScopes` lists the lanes that the answer left
out, and `next` names the lane to continue from. To read the next window, pass
`next` as `after`, or open the card again with `next` as `scope`. A null `next`
ends the walk. A lane that opened during the walk appears on the next walk.
`work` reads only the first window and has no `next`.

## Response limits

The server bounds each whole tool result. The bound is 4 KiB for an act,
`wait`, `settle` and `prepare`, and 8 KiB for `room` and a page of
`inspect`. It is 64 KiB for `items`, `steps`, `step`, `record`, `sends`,
`text`, `actions` and the declaration or complete text of `inspect`. A
page of `tools/list` holds at most 256 KiB, and no cap applies to the
whole list.
[The MCP budget figures record](../notes/implementation/2026-11-10-mcp-budget-figures-record.md)
keeps the measured reads and sizes.

## Source

Checked against main `b0af01d2` on 1 November 2026. The text of the
hosted endpoint stub and the response limits matches main `a419407e` on
10 November 2026. Sources: [packages/mcp/src](../packages/mcp/src/), [packages/mcp/src/service.ts](../packages/mcp/src/service.ts), [packages/mcp/src/hosted-tools.ts](../packages/mcp/src/hosted-tools.ts), [packages/mcp/src/http.ts](../packages/mcp/src/http.ts), [packages/scope/src/worker-mcp.ts](../packages/scope/src/worker-mcp.ts), [packages/mcp/test/inventory.test.ts](../packages/mcp/test/inventory.test.ts), [docs/mcp-tools.json](mcp-tools.json).
