# Record and event identifiers

19 October 2026, draft 3. Design note for review. Section 12 lists what
changed in each draft.

This note defines two identifiers, one for a record and one for an event
in it, and how to resolve and check them. An application or a platform
that implements it gains:

- **A permanent name for every record it keeps.** The name is the same
  on every host and in every copy, and no one can reissue it for other
  content.
- **A citation for any one event** that a reader anywhere can fetch and
  check, without trusting the host that served it.
- **Citations that cross systems.** Its records can cite events kept by
  other implementations, and be cited by them, with one syntax and one
  check. A review in one system can name the exact change it judged in
  another.
- **Verification from any copy.** Whoever holds the bytes, from a service
  or from a Git clone, runs the same checks with the same tool and gets
  the same answer: the bytes match the citation, the event belongs to
  that record at that position, nothing between a known point and the
  event was replaced, and the signatures hold.
- **Receipts that outlive the service.** The receipt for an act is a
  citation, so a participant keeps proof of what was recorded and checks
  it later against any copy.
- **Interchangeable hosts.** Any host that holds a copy can serve the
  record, and a reader can tell when a host is behind or wrong.
- **Conformance it can prove alone**, against published test vectors,
  with no reference implementation in the loop.

The two forms:

```
did:seq:<format>:<genesis>                        a record
did:seq:<format>:<genesis>/<position>/<event>     an event in it
```

Not provided here: judging events against a record's rules, requests and
messages, and who may read. Each sits on these identifiers. Part two
says what changes in dap, what the cost is for four other systems, and
how the signed request uses the identifiers.

# Part one: the protocol

## 1. Terms

| Term | Meaning |
|---|---|
| Record | One ordered sequence of events under one set of rules. |
| Genesis | The first event of a record. Its bytes fix the record's rules. |
| Life | One run of a record from one genesis. A system that can start a record again from the same name has one life for each start. |
| Identity | The digest of the genesis, under the record's format. One for each life. |
| Address | Where a host serves the record: a URL, or a Git remote. A record may have several, and an address may exist before the genesis does. |
| Event | One entry of a record, at one position, with one digest. |
| Position | The number of events before it in the record. The genesis is at 0. |
| Citation | The identity, the position and the digest of one event. |
| Format | A named rule for the bytes of an event, the hash over them, how an event names its record, and how events link. |

## 2. The identifiers

### 2.1 A record

```
did:seq:<format>:<genesis>
```

- `seq` is the DID method.
- `format` is a token from section 3: one to sixteen characters from
  `a` to `z` and `0` to `9`, beginning with a letter.
- `genesis` is the digest of the genesis event's bytes under that format,
  in the format's text form.

Every character is one that DID syntax allows in a method-specific
identifier, so an identifier is never percent-encoded. Two identifiers
name the same life when their text is equal, and not otherwise.

Example, a gitseq workroom whose genesis commit is
`5d262274…`:

```
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8
```

### 2.2 An event

```
did:seq:<format>:<genesis>/<position>/<event>
```

- `position` is a decimal integer with no leading zeros.
- `event` is the digest of that event's bytes under the format, in the
  format's text form.

The position locates the event. A store indexed by position finds the
bytes without a search, and a resolver refuses a citation whose position
and digest disagree without walking the chain. The digest is the claim.

The event is a path segment, never a fragment. In a DID URL a fragment
names something inside the resolved document and is not sent to the
resolver. An event is its own resource.

Example, the event 557 first-parent steps after that genesis, counted on
19 October 2026:

```
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8/557/cc7eb5a129850990652c553adffbfd2f4f726f83
```

## 3. Formats

A format token is the version of the bytes. A change to the bytes is a
new token. A change to a route, a tool or a document shape is not.

| Token | Event bytes | Digest, text form | How an event names its record | Position |
|---|---|---|---|---|
| `dap1` | The canonical JSON of a dap entry, RFC 8785, under the domain tag `artroom-entry-1` and a newline | SHA-256, 64 lowercase hex | The member `rec` equals the identity. The genesis has no `rec`: it carries the seed and a 16-byte nonce. | The member `seq` |
| `git` | A Git commit object, SHA-1 object format | 40 lowercase hex | The genesis is reached from the event by first parents only, in exactly `position` steps | First-parent distance from the genesis |
| `git256` | A Git commit object, SHA-256 object format | 64 lowercase hex | As `git` | As `git` |
| `at` | A DAG-CBOR record of the atseq entry lexicon | CIDv1, base32 lowercase | The entry's genesis member equals the identity | The entry's record key |
| `nostr` | A Nostr event of the noseq ordered-entry kind, NIP-01 serialization | SHA-256 event ID, 64 lowercase hex | The `h` tag equals the identity | The entry's position member |

| Token | Predecessor link | Where signatures are |
|---|---|---|
| `dap1` | The member `prev`, the previous entry's digest | The actor's Ed25519 signature over the intent, in each act entry |
| `git`, `git256` | The first parent | The commit's `gpgsig` header, or trailers in its message, as the genesis's convention states |
| `at` | The predecessor CID | The actor's signature over the intent and the sequencer's over the entry |
| `nostr` | The `previous` member | The device's signature on the submission and the sequencer's on the entry |

## 4. Addresses and resolution

### 4.1 An address

An address is where a host serves a record. It is not part of the
identity, and one identity may have several. A reader learns an address
from the record document of 4.3, from the system that created the
record, or from configuration. A host that holds no copy answers
not-found. A host that holds a copy serves it under the same identity as
every other host.

### 4.2 The three reads

Three reads serve a verifier at every level:

| Read | Returns |
|---|---|
| The record | The record document of 4.3 |
| One event, by position | Its bytes and its digest |
| A page of events, from a position | Bytes and digests, with a cursor |

**Over HTTP.** A host publishes one base URL. With `<id>` for
`<format>:<genesis>`:

| Request | Answer |
|---|---|
| `GET <base>/<id>` | The record document, as JSON |
| `GET <base>/<id>/<position>` | `{ "id": "<citation>", "position": <n>, "digest": "<text form>", "encoding": "utf-8" or "base64", "bytes": "<the event>" }` |
| `GET <base>/<id>/<position>?n=<count>` | A JSON list of at most `count` such objects, from `position` on, and `"next"`, the next position, when there are more |

A record or position the host does not hold is `404`. A reader the host
refuses is `403`. Neither answer says anything else, and the protocol
does not say who may read.

**From Git.** For `git` and `git256` a remote is an address and the
reads are Git operations: the genesis commit by its hash, the event at a
position by walking first parents from the genesis, and any commit by
its hash. A host may also archive a record of another format into a Git
repository and serve the three reads from a clone. dap's archive does
this (section 7).

### 4.3 The record document

Resolving a record returns a DID document with these members:

- `id`: the record's identifier.
- `service`: one entry of type `SeqRecord` for each address, with the
  base URL or the remote as `serviceEndpoint`.
- `record`: the format, the genesis bytes, with their encoding, and the
  position of the head the host serves.

The genesis bytes are the one fact in the document. A reader hashes them
and compares the result with the identifier before it trusts anything
else. The head position is the host's statement and proves nothing.

## 5. Verification

A verifier runs the levels in order, stops at the first failure, and
reports the level it reached and what it took on trust.

| Level | Check | Reaches |
|---|---|---|
| 0, bytes | The event's bytes hash to the cited digest under the format | This event is the one cited |
| 1, membership | The event names the cited identity by the format's rule, and its position is the cited one | This event belongs to that life at that position |
| 2, chain | From the event, each predecessor link hashes to the event before it, positions fall by one, and the walk reaches the genesis or an event the verifier already holds | No event between that point and this one was replaced |
| 3, authorship | Each event's signatures hold under the rule the record's genesis names | The events were signed by the keys they name |

Levels 0 to 2 need the format alone. Level 3 also needs the signature
rule that the genesis names, because the format says where a signature
is and the genesis says whose signature counts. A verifier without that
rule stops at level 2 and says so.

Whether each event followed from its input under the record's rules is
level 4. It belongs to each system's own replay and is outside this
protocol.

A citation does not prove: that the event took effect in any other
record; that it is the head; that the record was not rewritten after the
point the verifier already held; that the host will keep it; that its
content is true; or what time it was. A position means nothing outside
its own record.

## 6. Vectors and conformance

The specification ships, for each format, under `vectors/<format>/`:

- one genesis, three events after it, the record's identifier, three
  citations and the HTTP URL of one of them;
- one event with one changed byte, one citation with the wrong position,
  one event from another record, and one chain with a replaced middle
  event, each with the level at which it fails;
- the expected result of each level on each.

Code that is not any implementation under test produces the vectors.
An implementation's tests compare its output with the vectors and never
regenerate them. A conforming implementation passes the vectors of the
formats it claims and states the levels it runs.

# Part two: adoption

## 7. What changes in dap

dap adopts this in one change. There is no deployed history to keep
compatible, so nothing is dual-written and nothing is translated.

| Term here | In dap |
|---|---|
| Record | Scope |
| Life | Incarnation, until this change |
| Identity | The hash of the genesis entry, `rec` |
| Address | The scope ID, `sc_…`, the digest of the seed |
| Event, position | Entry, `seq` |
| Citation | `FactRef` |
| Levels 0 to 3 | Replay's integrity mode |
| Level 4 | Replay's replay mode |

**References.** `ScopeRef` is `{ scope, inc, kind }` today and `FactRef`
is `{ at: ScopeRef, seq, hash }`. They become:

```ts
interface RecordRef { scope: ScopeId; rec: Digest }   // address and identity
interface FactRef   { at: RecordRef; seq: number; hash: Digest }
```

`rec` does the incarnation's job, which is to tell one life from
another. The genesis keeps a 16-byte nonce so that two lives of one seed
never hash alike. The kind leaves references: it is in the seed, and a
handler's check of the sender's kind reads the source scope's genesis,
which the receiver fetches once and keeps. The scope ID stays in the
reference because it is the address that routing and creation use, so no
host index from identity to object is needed.

**Entries.** Every entry after the genesis carries `rec` in place of
`at`. The genesis carries the seed and the nonce and no `rec`, because
an entry cannot hold its own hash. The entry hash domain stays
`artroom-entry-1`, which the token `dap1` names.

**Routing.** A send to another life is refused as today, by comparing
`rec` with the object's genesis hash instead of comparing incarnations.
`wrong-incarnation` and `incarnation-conflict` are renamed to say life.
A seed still names a creation, and a child's scope ID is still known
before the child exists.

**Text and ref names.** The fact text that receipt commits carry becomes
the citation. Public ref names keep the event hash as one component.

**Reads.** The HTTP binding of 4.2 is served at the base
`https://<host>/v1/records`. The routes under `/v1/scopes/<scope ID>`
stay as the address form. The archive ref stays keyed by scope ID, and
`head.json` carries the identity.

**Size of the change, from a count of the source:** `ScopeRef` appears
in 140 files and `FactRef` in 88, and the incarnation member in 53. Most
of the change is mechanical. The places that need thought are the
resolver and routing in the scope package, the creation protocol and its
conflict clause, replay's chain check, the archive's `head.json`, and
every test fixture that builds references by hand.

## 8. Cost for the other systems

| System | What already matches | What changes | Cost | Can we force it |
|---|---|---|---|---|
| gitseq | `git:sha1:<genesis>#git:sha1:<event>`, a first-parent chain under `refs/seq/<genesis>`, one-based tickets | The syntax of section 2; zero-based positions with the genesis at 0, to be confirmed against its log; one parser and one formatter in Go. The identifier appears in trailers, body fields, command arguments and MCP tools | Low to moderate. gitseq is live infrastructure for this repository, so it accepts both forms for a while | Yes, with a transition |
| atseq | Genesis CID, a receipt of genesis, position and entry CID, a predecessor link | A text form only; nothing in its records changes | Trivial to express; its native design has no runtime yet | Yes, on paper |
| noseq | Genesis event ID, an ordered entry with position and previous, the `h` tag | A text form only. Levels 0 to 2 run on ciphertext, with no group key | Trivial to express; there is no runtime | Yes, on paper |
| Open Integrity Forge | `did:repo:<inception sha1>`, policy judged at the first parent, verification from any clone | The method name, a record document, and positions as first-parent distance along `main`. Its `did:repo` has no method specification and no resolver; this note gives it both | Low technical cost. It is another organisation's project | No. Propose it after dap has adopted the protocol and the vectors exist |

## 9. The signed request, on these identifiers

The next protocol is the signed request and its four answers. It imports
this note and adds nothing to it:

- `to` names a life by its identity, with the address as a hint.
- `expected` names item revisions as today, inside that life.
- `presented` facts are citations.
- The receipt is a citation, with the effects and sends the entry made.
- A refusal names the head it was judged at as a citation.
- The idempotency key is scoped to the signing key, the signature covers
  the canonical bytes under a domain tag, an act is identified by its
  unsigned bytes, and an exact retry is answered with the first receipt.

## 10. Decisions

1. An identity is the digest of the genesis. An address is a URL or a
   remote. The two are kept apart.
2. One DID method, `seq`, with a format token as the first segment.
   Decided by Hugh on 19 October 2026.
3. A citation is `/<position>/<digest>` as a path, never a fragment.
4. Four named verification levels. Judgment is outside the protocol.
5. Vectors from independent code, committed with the specification and
   never regenerated from an implementation.
6. The format token versions the bytes. Nothing else does.
7. dap changes its references to `{ scope, rec }` and `{ at, seq, hash }`
   in one change, drops the incarnation and the kind from references,
   and keeps the scope ID in the reference as the address. Decided by
   Hugh on 19 October 2026.

## 11. Open points

- **gitseq's positions.** Whether its tickets map to positions with the
  genesis at 0 is to be confirmed before its formatter is written.
- **Content identifiers instead of format tokens.** A CID names the
  codec and the hash in the identifier itself, and atseq uses them. The
  Git and dap formats would need registered codecs. Revisit if a sixth
  format arrives.
- **Items.** An item is cited by its opening event. A URL for an item's
  current state is an address of the serving host, not a citation, and
  stays with the read routes.
- **The record document's members** beyond `id`, `service` and `record`.
- **Registration of the method.** A read of the W3C DID method registry
  on 19 October 2026 found no `seq`, `repo` or `git` entry among about
  270 methods. Registration comes after dap has adopted the protocol.

## 12. Changes in drafts

- Draft 2: the introduction states what an implementer gains and
  nothing else.
- Draft 3: the note is split into the protocol and its adoption, and dap
  leaves the protocol part except as a format and an example of an
  archive. The HTTP and Git bindings of the three reads are stated. Level
  3 takes its signature rule from the genesis, since two systems can
  share a format and differ in who signs. A real example from gitseq.
  The method name and the scope ID in the reference are decided.

## Sources

- In this repository: [the contract's references](../packages/contract/src/scope.ts),
  [entries](../packages/contract/src/entry.ts),
  [the identifier functions](../packages/bytes/src/domains.ts),
  [fact text and ref names](../packages/bytes/src/facttext.ts),
  [the Worker routes](../packages/scope/src/worker.ts),
  [the namespace](../packages/scope/src/namespace.ts),
  [Scopes, identity and incarnation](../docs/scopes.md#identity-and-incarnation),
  the archive layout in [shared language and volatile acts](2026-10-09-shared-language-volatile-acts.md), section 15,
  and the scope URI direction of 5 October 2026 (request 9626787f).
- gitseq: [event identifiers](https://github.com/generalbusiness-ai/gitseq/blob/main/docs/reference/event-identifiers.md),
  its glossary's definitions of event and ticket, and the first-parent
  count of 19 October 2026 under `refs/seq/5d262274…` in its own
  workroom.
- atseq: `docs/protocol.md` on records and receipts, and `lexicons/` for
  the entry and genesis records.
- noseq: `docs/protocol-v0.md`, the context tags and the ordered entry.
- Open Integrity Forge: its README on `did:repo` and the inception
  commit, and `apps/forge/authority/verify.ts` for judgment at the first
  parent.
- [DID Core 1.0](https://www.w3.org/TR/did-core/), sections 3.1 and 3.2:
  `method-specific-id = *( *idchar ":" ) 1*idchar`,
  `idchar = ALPHA / DIGIT / "." / "-" / "_" / pct-encoded`,
  `did-url = did path-abempty [ "?" query ] [ "#" fragment ]`, and "A DID
  fragment is used as a method-independent reference into a DID document
  or external resource."
- [DID method registry](https://www.w3.org/TR/did-extensions-methods/),
  read 19 October 2026.
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), JSON
  Canonicalization Scheme.
