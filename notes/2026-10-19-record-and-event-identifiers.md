# Sequence and event identifiers

19 October 2026, draft 5. Design note for review. Part one is the
protocol, written to stand alone and to be published as it is. Part two
is dap's adoption of it.

## Sequences, services and rules

A sequence is an ordered list of signed events. Each event is a block of
bytes. It carries the digest of the event before it, and it carries the
signature of whoever asked for it. The first event, the genesis, states
the rules the sequence starts under. The rules may let later events
change them, and such a change is itself an event in the sequence. There
is one event at each position and one event after each. A sequence is a
line, not a tree.

Services are actor components that process and store sequences of
events. A service judges each incoming message under the rules, appends
an event if it passes, and answers with a receipt that identifies the
event. The rules also define the state derived from the events, and the
messages the sequence sends to other sequences. A sequence with its
rules is one actor. An application is built from such actors and the
messages between them.

Several systems have this shape, each with different types of events
and different rules. Each needs the same two identifiers: one for a
sequence, and one for an event in it. Receipts, references between
sequences and reviews are made of these two identifiers.

The shape of the systems fixes the shape of the identifiers:

- The genesis states the rules, and every later event descends from it.
  So the digest of the genesis identifies the sequence. It is the same
  in every copy, and no one can produce it for a different genesis.
- The sequence is a line. So a position and a digest identify one event
  exactly. A walk from the event back to the genesis shows that the
  event belongs, without trusting the host.
- Services hold copies, and any copy can be verified. So where a
  sequence is served is kept apart from its identifier.

## What an implementer gains

An application or a platform that implements this note gains:

- **A permanent identifier for every sequence it keeps.** It is the same
  on every host and in every copy, and no one can produce it for a
  different genesis.
- **A citation for any one event** that a reader anywhere can fetch and
  check, without trusting the host that served it.
- **Citations that cross systems.** Its sequences can cite events kept
  by other implementations, and be cited by them, with one syntax and
  one check. A review in one system can cite the exact change it judged
  in another.
- **Verification from any copy.** Whoever holds the bytes, from a service
  or from a Git clone, runs the same checks with the same tool and gets
  the same answer.
- **Receipts that outlive the service.** The receipt for an act is a
  citation, so a participant keeps proof of what was recorded and checks
  it later against any copy.
- **Interchangeable hosts.** Any host that holds a copy can serve the
  sequence. A reader with a citation can tell when a host serves other
  bytes for it or has not reached it yet.
- **Conformance it can prove alone**, against published test vectors,
  with no reference implementation in the loop.

The two forms:

```
did:seq:<format>:<genesis>                        a sequence
did:seq:<format>:<genesis>/<position>/<event>     an event in it
```

Three things sit on these identifiers and are not covered here. They
are judging an event under a sequence's rules, the requests and messages
that produce events, and who may read a sequence.

# Part one: the protocol

## 1. Terms

Each term is defined before it is used.

| Term | Meaning |
|---|---|
| Sequence | An ordered list of events, written by one system under one set of rules. One event at each position, and one event after each: a line, not a tree. |
| Event | One item of a sequence: the bytes the system wrote for it. Every event after the first carries the digest of the event before it. |
| Format | The written description, in the shape of section 3.1, of how one system writes, hashes, links and signs its events. Each format has a token. |
| Genesis | The first event of a sequence. Its bytes fix the sequence's rules. |
| Digest | The hash of an event, computed and written as its format says. |
| Position | The number of events before an event in its sequence. The genesis is at 0. |
| Citation | The identifier of one event (section 2.2): its sequence, its position and its digest. |
| Host | A service that stores sequences and serves their events. |
| Address | Where a host serves a sequence: a URL, or a Git remote. A sequence may have several. The identifier is not one of them. |

## 2. Syntax

### 2.1 Identifier for a sequence

```
did:seq:<format>:<genesis>
```

- `seq` is the DID method.
- `format` is the token of the format that the sequence's system uses
  (section 3): one to sixteen characters from `a` to `z` and `0` to `9`,
  beginning with a letter.
- `genesis` is the digest of the genesis event, computed and written as
  that format says.

So the identifier of a sequence is made from the bytes of its first
event. Every copy of the sequence yields the same identifier, and no one
can produce it without those bytes.

A text form uses only `a` to `z`, `0` to `9`, `.`, `-` and `_`, so an
identifier is never percent-encoded. Identifiers are compared byte for
byte. Nothing is normalised: a string with an uppercase digit is a
different string, and it is not the identifier.

Example, a gitseq workroom whose genesis commit is `5d262274…`:

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
  written as the format says.

The position says which event: the one with that many events before it.
The digest says which bytes that event has. A reader fetches the
position from any host, hashes what comes back, and compares. A
different digest means the host served other bytes at that position: a
changed event, or a second chain from the same genesis (section 6).

This note calls an event identifier a citation. The genesis is an
event, so `/0/<genesis>` is a valid citation, and its two digests are
the same.

The event is a path segment, never a fragment. In a DID URL a fragment
refers to something inside the resolved document and is not sent to the
resolver. An event is its own resource.

Example, the event 557 first-parent steps after that genesis:

```
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8/557/cc7eb5a129850990652c553adffbfd2f4f726f83
```

## 3. Formats

### 3.1 What a format defines

Each system writes its events in its own way. It has its own
serialization, its own hash, its own place for the link to the event
before, and its own place for signatures. This protocol changes none of
that. A format is a written description of one such way, so that a
verifier that has read the description can check that system's events.
The description is of bytes the system already writes. It adds nothing
to them.

A format definition answers nine questions. A token without all nine
answers is not a format.

1. **Serialization.** How the system writes one event as bytes. This is
   also what a host serves when asked for the event. For text, the
   encoding.
2. **Digest input.** Which bytes are hashed: the serialized event alone,
   or the event after a fixed prefix that the system adds.
3. **Hash and text form.** The hash function, and how a digest is
   written in an identifier.
4. **Genesis.** How a reader recognises the first event.
5. **Sequence member.** Whether an event carries the digest of its
   genesis, and where. A format without one has the walk of part 6 as
   its only membership check.
6. **Predecessor.** Where an event carries the digest of the event
   before it.
7. **Position.** Whether an event carries its position, and where.
   Otherwise, how a reader computes it.
8. **Signatures.** Where signatures sit and which bytes they cover.
   Whose signature counts is a rule of the sequence, stated in its
   genesis, not in the format.
9. **Vectors.** The test files of section 7 for this format.

### 3.2 Format registry

The format registry is the list of format tokens, kept with this
specification. Each token has a definition in the shape of 3.1 and the
vectors of section 7. The `format` segment of an identifier is looked up
here, and a verifier supports the tokens whose definitions it has
implemented. A project proposes a token with its definition, and the
token is allocated when the definition and its vectors are in the
registry.

| Token | Sequences it covers | An event is | Defined in |
|---|---|---|---|
| `dap1` | A dap scope's journal | One journal entry, as canonical JSON, hashed with SHA-256 | 3.3 |
| `git` | A chain of commits in a repository with SHA-1 object names: a gitseq workroom, an Open Integrity Forge repository | One commit object, with Git's own object hash | 3.4 |
| `git256` | The same, with SHA-256 object names | The same | 3.4 |
| `at` | An atseq app | One `ai.generalbusiness.atseq.entry` record, with its CIDv1 in base32 lowercase as the digest. The record carries its genesis, its predecessor and its position | Owed by atseq |
| `nostr` | A noseq instance | One kind 8792 ordered entry, with its event ID in hex as the digest. The `h` tag carries the genesis, and the entry carries `previous` and `position` | Owed by noseq |

One sequence identifier for each token. The `git` one is a real gitseq
workroom. The others show the shape only.

```
did:seq:dap1:242b636eb1c3a66a185a5abc0c1fdca448143d13449b06533653d6178a7d0f14
did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8
did:seq:git256:6320f109df9ff94238c96c7a1c732aa7b9614589e74ef51bf382451f1c9e64a1
did:seq:at:bafyreibsn3sfnzsbbgrwhzema7zazsmf7c5pfbc4psb6dystcwk3ibm27i
did:seq:nostr:f4bbd1343f86e8f3d6cfe51df3eea65f3f8e64ed7f18a04ce6fdfff130650c57
```

### 3.3 `dap1`

1. **Serialization.** The canonical JSON of one entry, RFC 8785, as
   UTF-8.
2. **Digest input.** The ASCII bytes `artroom-entry-1`, one line feed,
   then the serialized entry.
3. **Hash and text form.** SHA-256, written as 64 lowercase hexadecimal
   characters. Inside an entry the same digest is written with the
   prefix `sha256:`.
4. **Genesis.** `seq` is 0 and `input.type` is `genesis`. The genesis
   input carries the scope's creation parameters and `nonce`, 26 base32
   characters of 16 random bytes. The nonce makes two sequences created
   from the same parameters hash differently.
5. **Sequence member.** Every entry after the genesis carries
   `genesis`: `sha256:` followed by the digest of the genesis entry.
6. **Predecessor.** `prev`, the digest of the entry before, with the
   prefix. The genesis has `prev: null`.
7. **Position.** `seq`.
8. **Signatures.** An entry whose input is an act, a preparation or a
   founding carries the request that the participant signed. The
   signature is Ed25519, by the key the request states, over the ASCII
   bytes `artroom-intent-1`, a line feed and the RFC 8785 JSON of the
   request. The entry's position, predecessor, effects and sends are the
   host's statement. The chain and dap's replay cover them, and no
   signature does.
9. **Vectors.** `vectors/dap1/`, produced with the change of section 8.

### 3.4 `git` and `git256`

1. **Serialization.** A commit object's content, without the object
   header.
2. **Digest input.** The object header, then the content: `commit`, a
   space, the content length in decimal, a NUL byte, and the content.
   This is Git's own object hash.
3. **Hash and text form.** `git`: SHA-1, 40 lowercase hexadecimal
   characters. `git256`: SHA-256, 64. A `git` verifier uses Git's
   collision detection or Git itself. A sequence that cannot accept that
   risk uses `git256`.
4. **Genesis.** A commit with no parent that the sequence's system
   designates: gitseq's first commit under `refs/seq/<genesis>`, the
   forge's inception commit.
5. **Sequence member.** None. A commit does not carry the digest of
   its genesis.
   Membership is the walk of part 6 reaching the genesis.
6. **Predecessor.** The first parent. A commit reachable only through a
   second parent is content that an event brings in, not an event.
7. **Position.** Not carried. It is the number of first-parent steps
   from the genesis to the event. Grafts and replace refs are ignored. A
   shallow clone verifies as far as its depth.
8. **Signatures.** A `gpgsig` header over the commit object, or trailers
   in the message, as the genesis's convention states. gitseq signs in
   trailers. The forge signs in `gpgsig` with an SSH signature.
9. **Vectors.** `vectors/git/` and `vectors/git256/`.

## 4. Verification

Verification answers one question about a citation: is this event the
one the citation identifies, and does it belong to that sequence? The
answer
comes in levels. Each level is a stronger statement than the one
before, and each needs more of the sequence to hand. A verifier runs
the levels in order, stops at the first failure, and reports the level
it reached and what it took on trust.

**Level 0, bytes.** Hash the event's bytes as the format's digest input
says. The result must equal the digest in the citation. Passing shows
that these bytes are the ones cited. This level needs only the event.

**Level 1, fields.** Where the format has a sequence member, the event
must carry the cited genesis digest. Where the format carries the
position, the event must carry the cited one. Passing shows what the
event says about itself, and no more. Anyone can write bytes that say
this. Level 1 is a cheap refusal, not a proof of membership.

**Level 2, chain.** Walk backwards from the event. Each event carries
the digest of its predecessor. Fetch the predecessor, hash it, and
compare the result with that digest. The position must fall by one at each step.
The walk ends at the genesis, or at an event the verifier already holds
and trusts. Passing shows that the event is on a chain from that
genesis. It also shows that nothing between the end of the walk and the
event was replaced. Membership is shown here. For `git`, which has no sequence
member and no carried position, levels 1 and 2 are the same walk.

**Level 3, authorship.** For each event on the walk, check the
signatures where the format says they sit. The genesis states the rule
for whose signature counts. Passing shows that the signed parts were
signed by the keys they state.

Levels 0 to 2 need the format alone. Level 3 also needs the signature
rule from the genesis, because the format says where a signature is and
the genesis says whose signature counts. A verifier without that rule stops at
level 2 and says so.

Judging the event under the sequence's rules is the step after these.
It asks whether the key was entitled to sign, and whether the event was
a valid step from the state before it. That is level 4. Each system
does it with its own replay, outside this protocol.

**The report.** A verifier reports JSON with these members:

- `citation`: what was checked.
- `result`: `ok`, or the level that failed: `bytes`, `fields`, `chain`
  or `authorship`.
- `reached`: the highest level passed.
- `anchor`: where the walk of level 2 ended: `genesis`, or the citation
  of the held event.
- `trusts`: what the verifier took on trust and did not check, such as
  the chain behind the anchor.

**Worked example.** The citation of 2.2, checked in a clone that holds
the chain:

```
git cat-file -t cc7eb5a129850990652c553adffbfd2f4f726f83
# "commit". Git stores an object under the hash of its bytes, so an
# object that a clone holds under this hash has passed level 0.
git rev-list --first-parent cc7eb5a129850990652c553adffbfd2f4f726f83 | tail -1
# 5d2622748872b7e2dec3fe5c59e4be73a35e0bc8: the first-parent walk ends
# at the genesis.
git rev-list --first-parent --count 5d2622748872b7e2dec3fe5c59e4be73a35e0bc8..cc7eb5a129850990652c553adffbfd2f4f726f83
# 557: the position. Levels 1 and 2 pass.
```

Level 3 then checks the trailers of each of the 558 commits under
gitseq's rule.

## 5. Resolution

Resolution turns an identifier into bytes. For a sequence identifier,
the bytes are the sequence document of 5.3. For a citation, they are
the event. A reader resolves against a host, and to reach a host it
needs an address.

### 5.1 Addresses are supplied, not derived

An identifier says which sequence. It does not say where the sequence
is.
A reader learns an address from whoever gave it the citation, from a
sequence document it has already fetched, or from its own
configuration. A host that holds no copy answers not-found. A host that
holds a copy serves it under the same identifier as every other host.
The addresses a host lists are its own statement. A reader checks them
only by reading from them.

### 5.2 Three reads

A host answers three reads:

| Read | Returns |
|---|---|
| The sequence | The sequence document of 5.3 |
| One event, by position | Its bytes and its digest |
| A page of events, from a position | Bytes and digests, in ascending position |

**Over HTTP.** A host publishes one base URL. In the paths below,
`<id>` is the identifier without its `did:seq:` prefix, so
`<format>:<genesis>`.

| Request | Answer, `application/json` |
|---|---|
| `GET <base>/<id>` | The sequence document |
| `GET <base>/<id>/<position>` | One event: `{ "id": "<citation>", "position": <n>, "digest": "<text form>", "encoding": "utf-8" or "base64", "bytes": "<the event>" }` |
| `GET <base>/<id>/<position>?n=<count>` | A page: `{ "events": [ <up to count such objects, from position upwards> ], "next": <the position after the last one returned, or null at the head> }`. The host may return fewer than `count`. |

A host answers `404` for a sequence or a position it does not hold, and
`403` for a reader it refuses. Neither answer carries anything else.
Who may read is the host's rule, outside this protocol.

**From Git.** For `git` and `git256`, a remote is an address, and the
reads are Git operations. The genesis is read by its hash, the event at
a position by the first-parent walk, and any commit by its hash. A host
may also keep a sequence of another format in a Git repository and
serve the three reads from a clone. dap's archive does this (section
8).

### 5.3 Sequence document

Resolving a sequence identifier yields a document. It tells the reader
where the sequence is served, and it lets the reader check that it has
the right sequence. It is a DID document with these members:

- `id`: the sequence's identifier.
- `service`: one entry of type `SeqHost` for each address, with the base
  URL or the remote as `serviceEndpoint`.
- `sequence`, a property this method defines, with three members:
  `format`, the genesis as `{ "encoding", "bytes" }`, and `head`, the
  highest position the host serves.

The genesis bytes are the one fact in the document. A reader hashes
them and compares the result with the identifier before it trusts
anything else in the document. The addresses and `head` are the host's
statements. The document carries no keys. Keys belong to the sequence's
rules, not to this method.

**Method operations.** A DID method says how its identifiers are
created, read, updated and deactivated. For `seq`: create is writing a
genesis, read is the three reads, and update and deactivate do not
exist. An identifier never changes, and a sequence document changes
only in the addresses and the head a host states.

## 6. Security considerations

A citation that passes every level still does not prove any of these:

- that the event took effect in any other sequence;
- that it is the head of its sequence;
- that the host will keep it;
- that its content is true;
- when it was written.

A position means nothing outside its own sequence.

**Forks.** The identifier is made from the genesis. If a host appends two
different events after the same predecessor, both chains carry the
same identifier, and an event on either passes every level. Two
different events that both verify at one position of one sequence are
proof of a fork. A reader who keeps the citations it has seen can
detect this. A reader with one citation and one host cannot. This
protocol has no signed head and no consistency proof. A system that
needs one adds it in its own protocol.

**Discovery.** The identifier does not locate. The first host a reader
reaches is trusted for nothing but the bytes it serves, and the reader
checks those. The addresses that host lists are hints.

**Privacy.** An identifier and a citation reveal digests and a position,
nothing else. A host decides who may read and answers `403` or `404`
with no further detail.

## 7. Conformance and vectors

A test vector is a published input with its expected output. An
implementation passes a vector when it produces that output. Code that
is not any implementation under test produces the vectors, so that no
implementation's mistake becomes the standard. An implementation's
tests compare its output with the vectors and never regenerate them.

For each format, under `vectors/<format>/`:

- `sequence.json`: a short sequence, with the genesis and at least three
  events after it: `{ "id", "genesis": { "encoding", "bytes" },
  "events": [ { "position", "digest", "encoding", "bytes" } ] }`.
- `cases.json`: a list of checks, each `{ "name", "citation", "event",
  "expect" }`. `event` is an object of the shape above, or `null` when
  the case is about the citation alone. `expect` is the report of
  section 4 without `trusts`. The cases include:
  - a valid citation for each event in `sequence.json`, and one of them
    written as the HTTP path of 5.2;
  - one event with one changed byte;
  - one citation with the wrong position;
  - one event from another sequence;
  - one chain with a replaced middle event.

A conforming implementation passes the vectors of the formats it claims
and states the levels it runs.

# Part two: adoption

## 8. What changes in dap

dap adopts this in one change. There is no deployed history to keep
compatible, so nothing is dual-written and nothing is translated.

| Term here | In dap |
|---|---|
| Sequence | One incarnation of a scope's journal. A scope ID can cover several sequences, one for each incarnation. |
| Genesis digest | The hash of the genesis entry, carried as `genesis` |
| Address | The scope ID, `sc_…`, the digest of the seed |
| Event, position | Entry, `seq` |
| Citation | `FactRef` |
| Levels 0 to 3 | Replay's integrity mode |
| Level 4 | Replay's replay mode |

**References.** `ScopeRef` is `{ scope, inc, kind }` today and `FactRef`
is `{ at: ScopeRef, seq, hash }`. They become:

```ts
interface SequenceRef { scope: ScopeId; genesis: Digest }   // the address, and which sequence under it
interface FactRef    { at: SequenceRef; seq: number; hash: Digest }
```

`genesis` does the incarnation's job, which is to tell one sequence from
another under one scope ID. The genesis entry keeps the 16 random bytes
it mints today, as `nonce`, so that two sequences from one seed never
hash alike. The kind leaves references, because it is in the
seed. A handler that checks the sender's kind reads the source scope's
genesis, which the receiver fetches once and keeps. The scope ID stays
in the reference because it is the address that routing and creation
use. So no host needs an index from genesis digest to object.

**Entries.** Every entry after the genesis carries `genesis` in place of
`at`. The genesis entry carries the seed and the nonce and no `genesis`
member, because an entry cannot hold its own hash. The entry hash domain
stays `artroom-entry-1`.

**Routing.** A send to another sequence under the same scope ID is
refused as today. The object compares the send's `genesis` with its own
genesis hash instead of comparing incarnations. `wrong-incarnation` and
`incarnation-conflict` are renamed. A seed still identifies a creation,
and a child's scope ID is still known before the child exists.

**Text and ref names.** The fact text that receipt commits carry becomes
the citation. Public ref names keep the event hash as one component.

**Reads.** The HTTP binding of 5.2 is served at the base
`https://<host>/v1/sequences`. The routes under `/v1/scopes/<scope ID>`
stay as the address form. The archive ref stays keyed by scope ID, and
`head.json` carries the genesis digest.

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
| Open Integrity Forge | `did:repo:<inception sha1>`, policy judged at the first parent, verification from any clone | The method name, a sequence document, and positions as first-parent distance along `main`. Its `did:repo` has no method specification and no resolver. This note gives it both | Low technical cost. It is another organisation's project | No. Propose it after dap has adopted the protocol and the vectors exist |

## 10. Signed request on these identifiers

The next protocol is the signed request and its four answers. It imports
this note and adds nothing to it:

- `to` is the sequence's identifier, with the address as a hint.
- `expected` states item revisions as today, inside that sequence.
- `presented` facts are citations.
- The receipt is a citation, with the effects and sends the entry made.
- A refusal carries the citation of the head it was judged at.
- The idempotency key is scoped to the signing key. The signature covers
  the canonical bytes under a domain tag. An act is identified by its
  unsigned bytes. An exact retry is answered with the first receipt.

## 11. Decisions

1. A sequence is identified by the digest of its genesis. An address is
   a URL or a remote. The two are kept apart, and the identifier does not
   locate.
2. One DID method, `seq`, with a format token as the first segment, and
   a format defined by the nine parts of 3.1. Decided by Hugh on 19
   October 2026.
3. A citation is `/<position>/<digest>` as a path, never a fragment.
4. Membership is shown at level 2. Level 1 is what the event says of
   itself. Level 3 takes its signature rule from the genesis. Judgment
   under the sequence's rules is outside the protocol.
5. Vectors from independent code, committed with the specification and
   never regenerated from an implementation.
6. dap changes its references to `{ scope, genesis }` and
   `{ at, seq, hash }` in one change. The incarnation and the kind leave
   references. The scope ID stays in the reference as the address.
   Decided by Hugh on 19 October 2026.

## 12. Open points

- **The word "sequence".** Draft 5 says sequence where draft 4 said
  record, because a record is usually one row, and the method is named
  `seq`. Log, stream and journal were weighed. Draft 5 also drops
  "identity": a sequence is identified by its genesis digest, and the
  thing that is not an address is the identifier. To be confirmed.
- **Why a DID and not a URN or a CID.** A DID gives a resolution step to
  a document with addresses, a method registry, and a fragment-free path
  for the event. A CID identifies bytes and not a chain or a resolver. A URN
  has no resolution. The choice is made. The paragraph that says so in
  the published text is owed.
- **gitseq's positions.** Whether its tickets map to positions with the
  genesis at 0 is to be confirmed before its formatter is written.
- **`at` and `nostr`.** Their definitions in the shape of 3.1 are owed by
  their projects. The registry rows say what is known.
- **Items.** An item is cited by its opening event. A URL for an item's
  current state is an address of the serving host, not a citation, and
  stays with the read routes.
- **Registration of the method.** A read of the W3C DID method registry
  on 19 October 2026 found no `seq`, `repo` or `git` entry among about
  270 methods. Registration comes after dap has adopted the protocol.
- **A record of changes.** Removed in draft 5 as premature. Something
  like it returns if the published text needs to track its revisions.

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
