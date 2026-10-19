# Record and event identifiers

19 October 2026, draft 4. Design note for review. Part one is the
protocol, written to stand alone and to be published as it is. Part two
is dap's adoption of it. Section 14 lists what changed in each draft.

This note defines two identifiers, one for a record and one for an event
in it, and how to resolve and check them. An application or a platform
that implements it gains:

- **A permanent name for every record it keeps.** The name is the same
  on every host and in every copy, and no one can issue it for another
  genesis.
- **A citation for any one event** that a reader anywhere can fetch and
  check, without trusting the host that served it.
- **Citations that cross systems.** Its records can cite events kept by
  other implementations, and be cited by them, with one syntax and one
  check. A review in one system can name the exact change it judged in
  another.
- **Verification from any copy.** Whoever holds the bytes, from a service
  or from a Git clone, runs the same checks with the same tool and gets
  the same answer.
- **Receipts that outlive the service.** The receipt for an act is a
  citation, so a participant keeps proof of what was recorded and checks
  it later against any copy.
- **Interchangeable hosts.** Any host that holds a copy can serve the
  record. A reader with a citation can tell when a host serves other
  bytes for it or has not reached it yet.
- **Conformance it can prove alone**, against published test vectors,
  with no reference implementation in the loop.

The two forms:

```
did:seq:<format>:<genesis>                        a record
did:seq:<format>:<genesis>/<position>/<event>     an event in it
```

Not provided here: judging events against a record's rules, requests and
messages, and who may read. Each sits on these identifiers.

# Part one: the protocol

## 1. Terms

| Term | Meaning |
|---|---|
| Record | One chain of events from one genesis, under one set of rules. |
| Genesis | The first event of a record. Its bytes fix the record's rules. |
| Identity | The digest of the genesis, under the record's format. |
| Address | Where a host serves the record: a URL, or a Git remote. A record may have several. |
| Event | One entry of a record, at one position, with one digest. |
| Position | The number of events before it in the record. The genesis is at 0. |
| Citation | The identity, the position and the digest of one event. |
| Format | A named rule, in the shape of section 3.1, for the bytes of an event, the digest over them, how an event names its record, how events link, and what is signed. |

## 2. Syntax

### 2.1 A record

```
did:seq:<format>:<genesis>
```

- `seq` is the DID method.
- `format` is a token from the registry in section 3.2: one to sixteen
  characters from `a` to `z` and `0` to `9`, beginning with a letter.
- `genesis` is the digest of the genesis event under that format, in the
  format's text form.

A text form uses only `a` to `z`, `0` to `9`, `.`, `-` and `_`, so an
identifier is never percent-encoded. Identifiers are compared byte for
byte. Nothing is normalised: an uppercase digit is not the identifier.

Example, a gitseq workroom whose genesis commit is `5d262274…`:

```
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8
```

### 2.2 An event

```
did:seq:<format>:<genesis>/<position>/<event>
```

- `position` is a decimal integer from 0 to 2^53 − 1, with no leading
  zeros.
- `event` is the digest of that event under the format, in the format's
  text form.

The position locates the event and the digest is the claim. The genesis
is an event: `/0/<genesis>` is a valid citation, and its digest is the
identity.

The event is a path segment, never a fragment. In a DID URL a fragment
names something inside the resolved document and is not sent to the
resolver. An event is its own resource.

Example, the event 557 first-parent steps after that genesis:

```
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8/557/cc7eb5a129850990652c553adffbfd2f4f726f83
```

## 3. Formats

### 3.1 What a format defines

A format is registered by a definition with these nine parts. A token
without all nine is not a format.

1. **Bytes.** What a host serves as the event. For a text format, the
   encoding.
2. **Digest input.** What is hashed: the bytes, or the bytes with a
   fixed prefix.
3. **Hash and text form.** The hash function and how its output is
   written.
4. **Genesis.** How a reader recognises a genesis event.
5. **Record.** How an event names its record, or that it does not and the
   walk of part 6 is the only membership check.
6. **Predecessor.** How an event names the event before it.
7. **Position.** How the position is read or computed.
8. **Signatures.** Where signatures are and what they cover. The rule
   for whose signature counts belongs to the record's genesis, not to
   the format.
9. **Vectors.** The files of section 7.

### 3.2 The registry

| Token | Defined in | Covers |
|---|---|---|
| `dap1` | 3.3 | dap scopes after the change of section 8 |
| `git` | 3.4 | Any record whose events are commits, SHA-1 object format: gitseq workrooms, Open Integrity Forge repositories |
| `git256` | 3.4 | The same, SHA-256 object format |
| `at` | Owed by atseq | atseq apps: the `ai.generalbusiness.atseq.entry` record, CIDv1 in base32 lowercase, the entry's genesis member and predecessor CID, the position from its record key |
| `nostr` | Owed by noseq | noseq instances: the kind 8792 ordered entry, the event ID in hex, the `h` tag as the record, the `previous` and `position` members |

A project proposes a token with its definition. The token is allocated
when the definition and its vectors are in this registry.

### 3.3 `dap1`

1. **Bytes.** The canonical JSON of one entry, RFC 8785, as UTF-8.
2. **Digest input.** The ASCII bytes `artroom-entry-1`, one line feed,
   then the bytes.
3. **Hash and text form.** SHA-256, 64 lowercase hexadecimal characters.
   Inside an entry the same digest is written with the prefix `sha256:`.
4. **Genesis.** `seq` is 0 and `input.type` is `genesis`. The genesis
   input carries the scope's creation parameters and `nonce`, 26 base32
   characters of 16 random bytes, so that two records created from the
   same parameters never hash alike.
5. **Record.** Every entry after the genesis carries `rec`, which is
   `sha256:` followed by the identity.
6. **Predecessor.** `prev`, the digest of the entry before, with the
   prefix. The genesis has `prev: null`.
7. **Position.** `seq`.
8. **Signatures.** An entry whose input is an act, a preparation or a
   founding carries the request the participant signed. The signature is
   Ed25519, by the key the request names, over the ASCII bytes
   `artroom-intent-1`, a line feed and the RFC 8785 JSON of the request.
   The entry's position, predecessor, effects and sends are the host's
   statement. They are covered by the chain and by dap's replay, not by a
   signature.
9. **Vectors.** `vectors/dap1/`, produced with the change of section 8.

### 3.4 `git` and `git256`

1. **Bytes.** A commit object's content, without the object header.
2. **Digest input.** The object header, `commit`, a space, the content
   length in decimal and a NUL byte, then the content: Git's own object
   hash.
3. **Hash and text form.** `git`: SHA-1, 40 lowercase hexadecimal
   characters. `git256`: SHA-256, 64. A `git` verifier uses Git's
   collision detection or Git itself. A record that cannot accept that
   risk uses `git256`.
4. **Genesis.** A commit with no parent that the record's system
   designates: gitseq's first commit under `refs/seq/<genesis>`, the
   forge's inception commit.
5. **Record.** A commit does not name its record. Membership is the walk
   of part 6 reaching the genesis.
6. **Predecessor.** The first parent. A commit reachable only through a
   second parent is content an event brings in, not an event.
7. **Position.** The number of first-parent steps from the genesis to
   the event. Grafts and replace refs are ignored. A shallow clone
   verifies as far as its depth.
8. **Signatures.** A `gpgsig` header over the commit object, or trailers
   in the message, as the genesis's convention states. gitseq signs in
   trailers. The forge signs in `gpgsig` with an SSH signature.
9. **Vectors.** `vectors/git/` and `vectors/git256/`.

## 4. Verification

A verifier runs the levels in order, stops at the first failure, and
reports the level it reached and what it took on trust.

| Level | Check | Reaches |
|---|---|---|
| 0, bytes | The digest input of the event's bytes hashes to the cited digest | These bytes are the ones cited |
| 1, claim | The event names the cited identity, where the format has such a member, and its position is the cited one | The event claims that record and position |
| 2, chain | From the event, each predecessor hashes to the event before it, positions fall by one, and the walk reaches the genesis or an event the verifier already holds | The event is on a chain from that genesis, and nothing between the held event and this one was replaced |
| 3, authorship | The signed parts of each event on the walk hold under the rule the genesis names | Those parts were signed by the keys they name |

Membership is established at level 2. Level 1 is a cheap refusal: bytes
anyone can write pass levels 0 and 1. For `git`, which has no record
member, levels 1 and 2 are one walk.

Levels 0 to 2 need the format alone. Level 3 also needs the signature
rule the genesis names, because the format says where a signature is and
the genesis says whose counts. A verifier without that rule stops at
level 2 and says so. Whether a key was entitled to sign is a question
for the record's rules, which is level 4: each system's own replay,
outside this protocol.

The verifier's report is JSON with these members:

- `citation`: what was checked.
- `result`: `ok`, or the name of the failed level.
- `reached`: the highest level passed.
- `anchor`: `genesis`, or the citation of the held event the walk
  reached.
- `trusts`: what was taken on trust, such as the anchor.

Worked example, for the citation of 2.2, in a clone that holds the
chain:

```
git cat-file -t cc7eb5a129850990652c553adffbfd2f4f726f83
# "commit": Git hashed the object as it read it. Level 0.
git rev-list --first-parent cc7eb5a129850990652c553adffbfd2f4f726f83 | tail -1
# 5d2622748872b7e2dec3fe5c59e4be73a35e0bc8: the walk ends at the genesis.
git rev-list --first-parent --count 5d2622748872b7e2dec3fe5c59e4be73a35e0bc8..cc7eb5a129850990652c553adffbfd2f4f726f83
# 557: the position. Levels 1 and 2.
```

Level 3 then checks the trailers of each of the 558 commits under
gitseq's rule.

## 5. Resolution

### 5.1 Addresses are supplied, not derived

An identifier names a record. It does not say where the record is. A
reader learns an address from whoever gave it the citation, from a
record document it has already fetched, or from configuration. A host
that holds no copy answers not-found. A host that holds a copy serves it
under the same identity as every other host. The addresses a host lists
are its statement and are checked only by reading from them.

### 5.2 The three reads

| Read | Returns |
|---|---|
| The record | The record document of 5.3 |
| One event, by position | Its bytes and its digest |
| A page of events, from a position | Bytes and digests, in ascending position |

**Over HTTP.** A host publishes one base URL. With `<id>` for
`<format>:<genesis>`:

| Request | Answer, `application/json` |
|---|---|
| `GET <base>/<id>` | The record document |
| `GET <base>/<id>/<position>` | `{ "id": "<citation>", "position": <n>, "digest": "<text form>", "encoding": "utf-8" or "base64", "bytes": "<the event>" }` |
| `GET <base>/<id>/<position>?n=<count>` | `{ "events": [ <at most count such objects, from position on> ], "next": <the next position, or null> }`. The host may return fewer than `count`. |

A record or position the host does not hold is `404`. A reader the host
refuses is `403`. Neither answer carries anything else, and this
protocol does not say who may read.

**From Git.** For `git` and `git256` a remote is an address. The reads
are Git operations: the genesis by its hash, the event at a position by
the first-parent walk, and any commit by its hash. A host may also keep
a record of another format in a Git repository and serve the three reads
from a clone. dap's archive does this (section 8).

### 5.3 The record document

A DID document with these members:

- `id`: the record's identifier.
- `service`: one entry of type `SeqRecord` for each address, with the
  base URL or the remote as `serviceEndpoint`.
- `record`, a property this method defines: `format`, the genesis as
  `{ "encoding", "bytes" }`, and `head`, the highest position the host
  serves.

The genesis bytes are the one fact in the document. A reader hashes them
and compares the result with the identifier before it trusts anything
else. `head` is the host's statement. The method defines no verification
methods in this version.

**Method operations.** Create: write a genesis. Read: the three reads.
Update and deactivate: none. An identifier is immutable, and a record
document changes only in the addresses and the head a host states.

## 6. Security considerations

A citation does not prove any of these:

- that the event took effect in any other record;
- that it is the head;
- that the host will keep it;
- that its content is true;
- what time it was.

A position means nothing outside its own record.

**Forks.** An identity names a genesis. Two chains from one genesis share
it, and an event on either passes every level. Two different events that
both verify at one position of one record are proof of a fork. A reader
who keeps citations detects this. A reader with one citation and one
host cannot. This protocol has no signed head and no consistency proof.
A system that wants one adds it in its own protocol.

**Discovery.** The identifier does not locate. The first host is trusted
for nothing but the bytes it serves, which the reader checks. The
addresses it lists are hints.

**Privacy.** An identifier and a citation reveal digests and a position,
nothing else. A host decides who may read and answers `403` or `404`
with no further detail.

## 7. Conformance and vectors

For each format, under `vectors/<format>/`:

- `record.json`: `{ "id", "genesis": { "encoding", "bytes" }, "events":
  [ { "position", "digest", "encoding", "bytes" } ] }`, with the genesis
  and at least three events after it.
- `cases.json`: a list of `{ "name", "citation", "event", "expect" }`.
  `event` is an object of the shape above or `null`. `expect` is the
  report of section 4 without `trusts`. The cases include:
  - the three citations, and the HTTP URL of one of them;
  - one event with one changed byte;
  - one citation with the wrong position;
  - one event from another record;
  - one chain with a replaced middle event.

Code that is not any implementation under test produces the vectors.
An implementation's tests compare its output with the vectors and never
regenerate them. A conforming implementation passes the vectors of the
formats it claims and states the levels it runs.

# Part two: adoption

## 8. What changes in dap

dap adopts this in one change. There is no deployed history to keep
compatible, so nothing is dual-written and nothing is translated.

| Term here | In dap |
|---|---|
| Record | One incarnation of a scope. A scope ID can name several records, one for each incarnation. |
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

`rec` does the incarnation's job, which is to tell one record from
another under one scope ID. The genesis keeps the 16 random bytes it
mints today, as `nonce`, so that two records from one seed never hash
alike. The kind leaves references: it is in the seed, and a handler's
check of the sender's kind reads the source scope's genesis, which the
receiver fetches once and keeps. The scope ID stays in the reference
because it is the address that routing and creation use, so no host
index from identity to object is needed.

**Entries.** Every entry after the genesis carries `rec` in place of
`at`. The genesis carries the seed and the nonce and no `rec`, because
an entry cannot hold its own hash. The entry hash domain stays
`artroom-entry-1`.

**Routing.** A send to another record under the same scope ID is refused
as today, by comparing `rec` with the object's genesis hash instead of
comparing incarnations. `wrong-incarnation` and `incarnation-conflict`
are renamed. A seed still names a creation, and a child's scope ID is
still known before the child exists.

**Text and ref names.** The fact text that receipt commits carry becomes
the citation. Public ref names keep the event hash as one component.

**Reads.** The HTTP binding of 5.2 is served at the base
`https://<host>/v1/records`. The routes under `/v1/scopes/<scope ID>`
stay as the address form. The archive ref stays keyed by scope ID, and
`head.json` carries the identity.

**Vectors.** The `dap1` vectors are produced in the same change, by a
script in another language than the implementation.

**Size of the change, from a count of the source:** `ScopeRef` appears
in 140 files and `FactRef` in 88, and the incarnation member in 53. Most
of the change is mechanical. Five places need thought:

- the resolver and routing in the scope package;
- the creation protocol and its conflict clause;
- replay's chain check;
- the archive's `head.json`;
- every test fixture that builds references by hand.

## 9. Cost for the other systems

| System | What already matches | What changes | Cost | Can we force it |
|---|---|---|---|---|
| gitseq | `git:sha1:<genesis>#git:sha1:<event>`, a root genesis and a first-parent chain under `refs/seq/<genesis>`, one-based tickets | The syntax of section 2. Positions with the genesis at 0, to be confirmed against its tickets. One parser and one formatter in Go. The identifier appears in trailers, body fields, command arguments and MCP tools | Low to moderate. gitseq is live infrastructure for this repository, so it accepts both forms for a while | Yes, with a transition |
| atseq | Genesis CID, a receipt of genesis, position and entry CID, a predecessor link | The `at` definition in the shape of 3.1, with vectors. Nothing in its records changes | Low. Its native design has no runtime yet | Yes, on paper |
| noseq | Genesis event ID, an ordered entry with position and previous, the `h` tag | The `nostr` definition in the shape of 3.1, with vectors. Levels 0 to 2 run on ciphertext, with no group key | Low. There is no runtime | Yes, on paper |
| Open Integrity Forge | `did:repo:<inception sha1>`, policy judged at the first parent, verification from any clone | The method name, a record document, and positions as first-parent distance along `main`. Its `did:repo` has no method specification and no resolver. This note gives it both | Low technical cost. It is another organisation's project | No. Propose it after dap has adopted the protocol and the vectors exist |

## 10. The signed request, on these identifiers

The next protocol is the signed request and its four answers. It imports
this note and adds nothing to it:

- `to` names a record by its identity, with the address as a hint.
- `expected` names item revisions as today, inside that record.
- `presented` facts are citations.
- The receipt is a citation, with the effects and sends the entry made.
- A refusal names the head it was judged at as a citation.
- The idempotency key is scoped to the signing key. The signature covers
  the canonical bytes under a domain tag. An act is identified by its
  unsigned bytes. An exact retry is answered with the first receipt.

## 11. Decisions

1. An identity is the digest of the genesis. An address is a URL or a
   remote. The two are kept apart, and the identifier does not locate.
2. One DID method, `seq`, with a format token as the first segment, and
   a format defined by the nine parts of 3.1. Decided by Hugh on 19
   October 2026.
3. A citation is `/<position>/<digest>` as a path, never a fragment.
4. Membership is level 2. Level 1 is a claim. Level 3 takes its rule from
   the genesis. Judgment is outside the protocol.
5. Vectors from independent code, committed with the specification and
   never regenerated from an implementation.
6. dap changes its references to `{ scope, rec }` and `{ at, seq, hash }`
   in one change. The incarnation and the kind leave references. The
   scope ID stays in the reference as the address. Decided by Hugh on 19
   October 2026.

## 12. Open points

- **Why a DID and not a URN or a CID.** A DID gives a resolution step to
  a document with addresses, a method registry, and a fragment-free path
  for the event. A CID names bytes and not a chain or a resolver. A URN
  has no resolution. The choice is made. The paragraph that says so in
  the published text is owed.
- **gitseq's positions.** Whether its tickets map to positions with the
  genesis at 0 is to be confirmed before its formatter is written.
- **`at` and `nostr`.** Their definitions in the shape of 3.1 are owed by
  their projects. The registry rows name what is known.
- **Items.** An item is cited by its opening event. A URL for an item's
  current state is an address of the serving host, not a citation, and
  stays with the read routes.
- **Registration of the method.** A read of the W3C DID method registry
  on 19 October 2026 found no `seq`, `repo` or `git` entry among about
  270 methods. Registration comes after dap has adopted the protocol.

## 13. Changes in drafts

- Draft 2: the introduction states what an implementer gains and
  nothing else.
- Draft 3: the note is split into the protocol and its adoption, and dap
  leaves the protocol part except as a format. The HTTP and Git bindings
  of the three reads are stated. Level 3 takes its signature rule from
  the genesis. A real example from gitseq. The method name and the scope
  ID in the reference are decided.
- Draft 4, after an outsider's review of draft 2. A format is defined
  by nine parts. `dap1` and `git` are defined in full, with the digest
  input stated apart from the served bytes. `at` and `nostr` are
  registered with their definitions owed. Level 1 is a claim and
  membership is level 2. Forks, discovery and privacy are stated under
  security considerations. The report, the vector files and the method
  operations have shapes. "Life" is gone: a dap scope ID names one record
  for each incarnation. The worked verification example is added.

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
  walk of 19 October 2026 under `refs/seq/5d262274…` in its own
  workroom: a root genesis, 557 steps to the example event.
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
- Git object hashing: the object header `<type> <size>\0` before the
  content, as `git hash-object` computes it.
