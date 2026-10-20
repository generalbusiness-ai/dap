# Sequence and event identifiers

19 October 2026, draft 5. Design note for review. Part one is the
protocol. It stands alone, and it is the text to publish. Part two is
the adoption of the protocol by dap.

## Sequences, services and rules

A sequence is an ordered list of signed events. Each event is a block of
bytes. It carries the digest of the event before it, and it carries the
signature of the party that requested it. The first event is the
genesis. The genesis states the rules that the sequence starts with. The
rules can permit later events to change the rules, and such a change is
itself an event in the sequence. There is one event at each position and
one event after each. A sequence is a line, not a tree.

Services are actor components that process and store sequences of
events. A service judges each incoming message under the rules. If the
message passes, the service appends an event and answers with a receipt
that identifies the event. The rules also define the state that the
service derives from the events, and the messages that the sequence
sends to other sequences. A sequence with its rules is one actor. Such
actors, and the messages between them, make an application.

Several systems have this shape, each with different types of events
and different rules. Each system needs the same two identifiers: one for
a sequence, and one for an event in a sequence. Receipts, references
between sequences, and reviews contain these two identifiers.

The shape of the systems gives the shape of the identifiers:

- The genesis states the rules, and each later event links back to the
  genesis through its predecessors. So the digest of the genesis
  identifies the sequence. The digest is the same in every copy, and no
  one can produce it for a different genesis.
- The sequence is a line. So a position and a digest identify one event
  exactly. A walk from the event back to the genesis shows that the
  event belongs to the sequence, without trust in the host.
- Services hold copies, and any copy can be verified. So this protocol
  keeps the address of a sequence apart from its identifier.

## What an implementer gains

An application or a platform that implements this note gets:

- **A permanent identifier for each sequence that it holds.** The
  identifier is the same on every host and in every copy. No one can
  produce it for a different genesis.
- **A citation for any one event.** A reader anywhere can read the event
  and verify it, without trust in the host that served it.
- **Citations that cross systems.** Its sequences can cite events that
  other implementations hold, with one syntax and one verification.
  Other implementations can cite its events in the same way. A review
  in one system can cite the exact change that it judged in another
  system.
- **Verification from any copy.** The holder of the bytes runs the same
  verification with the same tool and gets the same result. The bytes
  can come from a service or from a Git clone.
- **Receipts that stay valid after the service stops.** The receipt for
  an act is a citation. A participant holds the receipt as proof of what
  the service recorded, and verifies it later against any copy.
- **Interchangeable hosts.** Any host that holds a copy can serve the
  sequence. A reader with a citation can tell when a host serves
  different bytes for it, or does not have the event yet.
- **Conformance that it can show alone**, against published test
  vectors, with no reference implementation.

The two forms:

```
did:seq:<format>:<genesis>                        a sequence
did:seq:<format>:<genesis>/<position>/<event>     an event in a sequence
```

Three things stand on these identifiers and are not in this note. They
are the judgment of an event under the rules of a sequence, the requests
and messages that produce events, and who can read a sequence.

# Part one: the protocol

## 1. Terms

This note defines each term before it uses the term.

| Term | Meaning |
|---|---|
| Sequence | An ordered list of events that one system writes under one set of rules. There is one event at each position and one event after each: a line, not a tree. |
| Event | One item of a sequence: the bytes that the system wrote for it. Each event after the first carries the digest of the event before it. |
| Format | The written description, in the shape of section 3, of how one system writes, hashes, links and signs its events. Each format has a token. |
| Genesis | The first event of a sequence. Its bytes state the rules that the sequence starts with. |
| Digest | The hash of an event, computed and written as its format states. |
| Position | The number of events before an event in its sequence. The genesis is at position 0. |
| Citation | The identifier of one event (section 2.2). It contains the sequence identifier, the position and the digest. |
| Host | A service that holds sequences and serves their events. |
| Address | The place where a host serves a sequence: a URL, or a Git remote. A sequence can have more than one address. The identifier is not an address. |

## 2. Syntax

### 2.1 Identifier for a sequence

```
did:seq:<format>:<genesis>
```

- `seq` is the DID method. The identifier is a DID for two reasons. It
  resolves to a document with addresses (section 5.3), and the event is
  a path that the resolver receives. The method is not registered yet.
  On 19 October 2026 the W3C DID method registry listed about 270
  methods, and none of them was `seq`. Registration follows the first
  implementation.
- `format` is the token of the format that the system of the sequence
  uses (section 3 and appendix A). A token has one to sixteen
  characters from `a` to `z` and `0` to `9`, and the first character is
  a letter.
- `genesis` is the digest of the genesis event, computed and written as
  that format states.

So the identifier of a sequence comes from the bytes of its first event.
Every copy of the sequence gives the same identifier, and no one can
produce the identifier without those bytes.

A text form uses only `a` to `z`, `0` to `9`, `.`, `-` and `_`. So an
identifier is never percent-encoded. Compare identifiers byte for byte.
Do not normalise: a string with an uppercase digit is a different
string, and it is not the identifier.

Example, a gitseq workroom with the genesis commit `5d262274…`:

```
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8
```

### 2.2 Identifier for an event

```
did:seq:<format>:<genesis>/<position>/<event>
```

- `position` is a decimal integer from 0 to 2^53 − 1, with no leading
  zeros.
- `event` is the digest of the event at that position, computed and
  written as the format states.

The position tells which event: the one with that number of events
before it. The digest tells which bytes that event has. A reader reads
the position from any host, hashes the bytes that come back, and
compares the result with the digest. A different digest means that the
host served different bytes at that position. The cause is a changed
event, or a second chain from the same genesis (section 6).

This note calls an event identifier a citation. The genesis is an event.
So `/0/<genesis>` is a valid citation, and its two digests are the same.

The event is a path segment, never a fragment. In a DID URL, a fragment
refers to a part of the resolved document, and the resolver does not
receive the fragment. An event is its own resource.

Example, the event 557 first-parent steps after that genesis:

```
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8/557/cc7eb5a129850990652c553adffbfd2f4f726f83
```

## 3. Formats

Each system writes its events in its own way. It has its own
serialization, its own hash, its own place for the link to the previous
event, and its own place for signatures. This protocol changes none of
these. A format is a written description of one such way. A verifier
that has the description can verify the events of that system. The
description is of bytes that the system already writes. It adds nothing
to them.

A format definition answers nine questions. A token without all nine
answers is not a format.

1. **Serialization.** How the system writes one event as bytes. These
   bytes are also what a host serves for the event. For text, the
   encoding.
2. **Digest input.** Which bytes the hash function receives: the
   serialized event alone, or a fixed prefix from the system and then
   the event.
3. **Hash and text form.** The hash function, and how an identifier
   shows a digest.
4. **Genesis.** How a reader recognises the first event.
5. **Sequence member.** Whether an event carries the digest of its
   genesis, and where. For a format without this member, the walk of
   part 6 is the only membership test.
6. **Predecessor.** Where an event carries the digest of the previous
   event.
7. **Position.** Whether an event carries its position, and where. If
   not, how a reader computes it.
8. **Signatures.** Where the signatures are, and which bytes they cover.
   Whose signature counts is a rule of the sequence, stated in its
   genesis, not in the format.
9. **Vectors.** The test files of section 7 for this format.

Appendix A lists the formats that are declared at the date of this
note, each with its definition in this shape and an example identifier.
A system declares a format when it publishes the definition and the
vectors.

## 4. Verification

Verification answers one question about a citation: is this event the
one that the citation identifies, and does the event belong to that
sequence? The answer comes in levels. Each level is a stronger statement
than the level before, and each level needs more of the sequence. A
verifier runs the levels in order and stops at the first failure. It
reports the level that it reached and what it took on trust.

**Level 0, bytes.** Hash the bytes of the event as the digest input of
the format states. The result must equal the digest in the citation. A
pass shows that these bytes are the bytes cited. This level needs only
the event.

**Level 1, fields.** If the format has a sequence member, the event must
carry the cited genesis digest. If the format carries the position, the
event must carry the cited position. A pass shows what the event states
about itself, and no more. Anyone can write bytes that state this. Level
1 is a fast rejection, not a proof of membership.

**Level 2, chain.** Start at the event and go back. Each event carries
the digest of its predecessor. Read the predecessor, hash it, and
compare the result with that digest. The position must decrease by one
at each step. The walk ends at the genesis, or at an event that the
verifier already holds and trusts. A pass shows that the event is on a
chain from that genesis. It also shows that no one replaced an event
between the end of the walk and the cited event. Membership is shown
here. For `git`, with no sequence member and no carried position,
levels 1 and 2 are the same walk.

**Level 3, authorship.** For each event on the walk, verify the
signatures where the format states they are. The genesis states the rule
for whose signature counts. A pass shows that the keys that the signed
parts state did sign them.

Levels 0 to 2 need only the format. Level 3 also needs the signature
rule from the genesis, because the format states where a signature is
and the genesis states whose signature counts. A verifier without that
rule stops at level 2 and reports this.

The judgment of the event under the rules of the sequence is the step
after these levels. It asks whether the key had the right to sign, and
whether the event was a valid step from the state before it. That is
level 4. Each system does it with its own replay, outside this protocol.

**The report.** A verifier reports JSON with these members:

- `citation`: the citation that it verified.
- `result`: `ok`, or the level that failed: `bytes`, `fields`, `chain`
  or `authorship`.
- `reached`: the highest level that passed.
- `anchor`: where the walk of level 2 ended: `genesis`, or the citation
  of the held event.
- `trusts`: what the verifier took on trust and did not verify, such as
  the chain before the anchor.

**Worked example.** The citation of 2.2, verified in a clone that holds
the chain:

```
git cat-file -t cc7eb5a129850990652c553adffbfd2f4f726f83
# "commit". Git stores an object under the hash of its bytes. So an
# object that a clone holds under this hash passes level 0.
git rev-list --first-parent cc7eb5a129850990652c553adffbfd2f4f726f83 | tail -1
# 5d2622748872b7e2dec3fe5c59e4be73a35e0bc8: the first-parent walk ends
# at the genesis.
git rev-list --first-parent --count 5d2622748872b7e2dec3fe5c59e4be73a35e0bc8..cc7eb5a129850990652c553adffbfd2f4f726f83
# 557: the position. Levels 1 and 2 pass.
```

Level 3 then verifies the trailers of each of the 558 commits under the
rule of gitseq.

## 5. Resolution

Resolution turns an identifier into bytes. For a sequence identifier,
the bytes are the sequence document of 5.3. For a citation, the bytes
are the event. A reader resolves against a host, and the reader needs an
address to reach the host.

### 5.1 Addresses are supplied, not derived

An identifier tells which sequence. It does not tell where the sequence
is. A reader gets an address from one of three places: the party that gave
it the citation, a sequence document that it already read, or its own
configuration. A host that holds no copy answers not-found. A host that
holds a copy serves the copy under the same identifier as every other
host. The addresses that a host lists are its own statement. A reader
tests them only when it reads from them.

### 5.2 Three reads

A host answers three reads:

| Read | Returns |
|---|---|
| The sequence | The sequence document of 5.3 |
| One event, by position | Its bytes and its digest |
| A page of events, from a position | Bytes and digests, in increasing position |

**Over HTTP.** A host publishes one base URL. In the paths below, `<id>`
is the identifier without the prefix `did:seq:`, so `<format>:<genesis>`.

| Request | Answer, `application/json` |
|---|---|
| `GET <base>/<id>` | The sequence document |
| `GET <base>/<id>/<position>` | One event: `{ "id": "<citation>", "position": <n>, "digest": "<text form>", "encoding": "utf-8" or "base64", "bytes": "<the event>" }` |
| `GET <base>/<id>/<position>?n=<count>` | A page: `{ "events": [ <up to count such objects, from position upwards> ], "next": <the position after the last one returned, or null at the head> }`. The host can return fewer than `count`. |

A host answers `404` for a sequence or a position that it does not hold,
and `403` for a reader that it refuses (section 5.4). These answers
carry nothing else.

**From Git.** For `git` and `git256`, a remote is an address, and the
reads are Git operations. The reader gets the genesis by its hash, the
event at a position by the first-parent walk, and any commit by its
hash. A host can also hold a sequence of another format in a Git
repository and serve the three reads from a clone. The archive of dap
does this (section 8).

### 5.3 Sequence document

The resolution of a sequence identifier gives a document. The document
tells the reader where the sequence is served, and it lets the reader
make sure that it has the correct sequence. It is a DID document with
these members:

- `id`: the identifier of the sequence.
- `service`: one entry of type `SeqHost` for each address, with the base
  URL or the remote as `serviceEndpoint`.
- `sequence`, a property that this method defines. It has three
  members: `format`, the genesis as `{ "encoding", "bytes" }`, and
  `head`, the highest position that the host serves.

The genesis bytes are the one fact in the document. A reader hashes them
and compares the result with the identifier before it trusts anything
else in the document. The addresses and `head` are statements of the
host. The document carries no keys. Keys belong to the rules of the
sequence, not to this method.

**Method operations.** A DID method states how to create, read, update
and deactivate its identifiers. For `seq`: to create is to write a
genesis, to read is the three reads, and update and deactivate do not
exist. An identifier never changes. A sequence document changes only in
the addresses and the head that a host states.

### 5.4 Authorization

This protocol does not define who can resolve a sequence or an event,
or read a sequence document. A host applies its own rules, and some
applications have rules about this. A host that refuses a reader
answers `403` over HTTP, or refuses the Git operation, with no more
detail. The host controls the read, not the verification. A reader that
has the bytes can verify a citation without the host. A reader that one
host refuses can read the same sequence from another host that permits
it.

## 6. Security considerations

A citation that passes every level still does not prove any of these:

- that the event took effect in any other sequence;
- that the event is the head of its sequence;
- that the host will keep the event;
- that the content of the event is true;
- when the event was written.

A position means nothing outside its own sequence.

**Forks.** The identifier comes from the genesis. If a host appends two
different events after the same predecessor, both chains carry the same
identifier. An event on either chain passes every level. Two
different events that both verify at one position of one sequence are
proof of a fork. A reader that holds the citations it has seen can
detect a fork. A reader with one citation and one host cannot. This
protocol has no signed head and no consistency proof. A system that
needs one adds it in its own protocol.

**Discovery.** The identifier does not locate. The reader trusts the
first host that it reaches for nothing but the bytes that the host
serves, and the reader verifies those bytes. The addresses that the host
lists are hints.

**Privacy.** An identifier and a citation show digests and a position,
nothing else. A host decides who can read, and answers `403` or `404`
with no more detail.

## 7. Conformance and vectors

A test vector is a published input with its expected output. An
implementation passes a vector when it produces that output. Code that
is not an implementation under test produces the vectors, so that no
mistake of an implementation becomes the standard. The tests of an
implementation compare its output with the vectors and never regenerate
them.

For each format, under `vectors/<format>/`:

- `sequence.json`: a short sequence, with the genesis and at least three
  events after it. Its shape is `{ "id", "genesis": { "encoding",
  "bytes" }, "events": [ { "position", "digest", "encoding", "bytes" } ]
  }`.
- `cases.json`: a list of cases, each `{ "name", "citation", "event",
  "expect" }`. `event` is an object of the shape above, or `null` when
  the case is about the citation alone. `expect` is the report of
  section 4 without `trusts`. The cases include:
  - a valid citation for each event in `sequence.json`, and one of them
    in the HTTP path form of 5.2;
  - one event with one changed byte;
  - one citation with the wrong position;
  - one event from another sequence;
  - one chain with a replaced middle event.

An implementation conforms when it passes the vectors of the formats
that it claims and states the levels that it runs.

# Appendix A. Declared formats

This appendix is informational. It lists the formats that are declared
at the date of this note, with their definitions in the shape of
section 3. A format that a system declares later goes here with its
definition and its vectors.

| Token | Sequences it covers | An event is | Defined in |
|---|---|---|---|
| `dap1` | The journal of a dap scope | One journal entry, as canonical JSON, hashed with SHA-256 | A.1 |
| `git` | A chain of commits in a repository with SHA-1 object names: a gitseq workroom, an Open Integrity Forge repository | One commit object, with the object hash of Git | A.2 |
| `git256` | The same, with SHA-256 object names | The same | A.2 |

One sequence identifier for each token. The `git` identifier is a real
gitseq workroom. The others show only the shape.

```
did:seq:dap1:242b636eb1c3a66a185a5abc0c1fdca448143d13449b06533653d6178a7d0f14
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8
did:seq:git256:6320f109df9ff94238c96c7a1c732aa7b9614589e74ef51bf382451f1c9e64a1
```

### A.1 `dap1`

1. **Serialization.** The canonical JSON of one entry, RFC 8785, as
   UTF-8.
2. **Digest input.** The ASCII bytes `artroom-entry-1`, one line feed,
   then the serialized entry.
3. **Hash and text form.** SHA-256, written as 64 lowercase hexadecimal
   characters. In an entry, the same digest has the prefix `sha256:`.
4. **Genesis.** `seq` is 0 and `input.type` is `genesis`. The genesis
   input carries the creation parameters of the scope and `nonce`, 26
   base32 characters of 16 random bytes. The nonce makes two sequences
   with the same parameters hash differently.
5. **Sequence member.** Every entry after the genesis carries `genesis`:
   `sha256:` and then the digest of the genesis entry.
6. **Predecessor.** `prev`, the digest of the previous entry, with the
   prefix. The genesis has `prev: null`.
7. **Position.** `seq`.
8. **Signatures.** An entry whose input is an act, a preparation or a
   founding carries the request that the participant signed. The
   signature is Ed25519, by the key that the request states. It covers
   the ASCII bytes `artroom-intent-1`, a line feed and the RFC 8785 JSON
   of the request. The position, the predecessor, the effects and the sends
   of the entry are the statement of the host. The chain and the replay
   of dap cover them. No signature covers them.
9. **Vectors.** `vectors/dap1/`, produced with the change of section 8.

### A.2 `git` and `git256`

1. **Serialization.** The content of a commit object, without the object
   header.
2. **Digest input.** The object header, then the content: `commit`, a
   space, the content length in decimal, a NUL byte, and the content.
   This is the object hash of Git.
3. **Hash and text form.** `git`: SHA-1, 40 lowercase hexadecimal
   characters. `git256`: SHA-256, 64. A `git` verifier uses the
   collision detection of Git, or Git itself. A sequence that cannot
   accept that risk uses `git256`.
4. **Genesis.** A commit with no parent that the system of the sequence
   designates. For gitseq, it is the first commit under
   `refs/seq/<genesis>`. For the forge, it is the inception commit.
5. **Sequence member.** None. A commit does not carry the digest of its
   genesis.
6. **Predecessor.** The first parent. A commit that is reachable only
   through a second parent is content that an event brings in. It is not
   an event.
7. **Position.** Not carried. The position is the number of first-parent
   steps from the genesis to the event. The verifier ignores grafts and
   replace refs. A shallow clone verifies as far as its depth.
8. **Signatures.** A `gpgsig` header over the commit object, or trailers
   in the message, as the convention of the genesis states. gitseq signs
   in trailers. The forge signs in `gpgsig` with an SSH signature.
9. **Vectors.** `vectors/git/` and `vectors/git256/`.

# Part two: adoption

## 8. What changes in dap

dap adopts this in one change. There is no deployed history to keep
compatible, so the change writes nothing twice and translates nothing.

| Term here | In dap |
|---|---|
| Sequence | One incarnation of the journal of a scope. A scope ID can cover several sequences, one for each incarnation. |
| Genesis digest | The hash of the genesis entry, carried as `genesis` |
| Address | The scope ID, `sc_…`, the digest of the seed |
| Event, position | Entry, `seq` |
| Citation | `FactRef` |
| Levels 0 to 3 | The integrity mode of replay |
| Level 4 | The replay mode of replay |

**References.** `ScopeRef` is `{ scope, inc, kind }` today, and
`FactRef` is `{ at: ScopeRef, seq, hash }`. They become:

```ts
interface SequenceRef { scope: ScopeId; genesis: Digest }   // the address, and which sequence under it
interface FactRef    { at: SequenceRef; seq: number; hash: Digest }
```

The job of the incarnation is to tell one sequence from another under
one scope ID. `genesis` does that job. The genesis entry keeps the 16 random
bytes that it mints today, as `nonce`, so that two sequences from one
seed never hash alike. The kind leaves references, because it is in the
seed. A handler that tests the kind of the sender reads the genesis of
the source scope. The receiver reads that genesis once and holds it. The
scope ID stays in the reference because it is the address that routing
and creation use. So no host needs an index from genesis digest to
object.

**Entries.** Every entry after the genesis carries `genesis` in place of
`at`. The genesis entry carries the seed and the nonce and no `genesis`
member, because an entry cannot hold its own hash. The entry hash domain
stays `artroom-entry-1`.

**Routing.** A send to another sequence under the same scope ID is
refused as today. The object compares the `genesis` of the send with its
own genesis hash instead of the incarnations. `wrong-incarnation` and
`incarnation-conflict` change to match. A seed still identifies a
creation, and the scope ID of a child is still known before the child
exists.

**Fact text and refs.** The fact text that receipt commits carry becomes
the citation. Public refs keep the event hash as one component. The
event that opens an item is the citation of the item. A URL for the
current state of an item is an address, not a citation.

**Reads.** dap serves the HTTP binding of 5.2 at the base
`https://<host>/v1/sequences`. The routes under `/v1/scopes/<scope ID>`
stay as the address form. The archive ref stays keyed by scope ID, and
`head.json` carries the genesis digest.

**Vectors.** The same change produces the `dap1` vectors, with a script
in a different language from the implementation.

**Size of the change, from a count of the source:** `ScopeRef` appears
in 140 files, `FactRef` in 88, and the incarnation member in 53. Most of
the change is mechanical. Five places need thought:

- the resolver and routing in the scope package;
- the creation protocol and its conflict clause;
- the chain test of replay;
- the `head.json` of the archive;
- every test fixture that builds references by hand.

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
