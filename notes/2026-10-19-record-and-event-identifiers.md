# Sequence and event identifiers

Part one specifies a protocol for sequence and event identifiers. Part
two describes how dap adopts this protocol.

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
- **Verification from any copy.** Any implementation of this note runs
  the same verification on the same bytes and gets the same result. The
  bytes can come from a service or from a Git clone.
- **Receipts that stay valid after the service stops.** The receipt for
  an act is a citation. A participant holds the receipt as proof of what
  the service recorded, and verifies it later against any copy.
- **Interchangeable hosts.** Any host that holds a copy can serve the
  sequence. A reader with a citation can tell when a host serves
  different bytes for it, or does not have the event yet.
- **Conformance that it can show alone**, against the published test
  vectors of its format, with no reference implementation.

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
| Signature profile | For one format: where each signature is in an event, the bytes that it covers, the algorithm, and where the key is. |
| Anchor | A citation that the caller of a verifier gives as already proved at level 2. It can end the walk of level 2 early (section 4). |
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

### 2.3 Grammar

The two forms in the ABNF of RFC 5234:

```
sequence-id = "did:seq:" format ":" digest
citation    = sequence-id "/" position "/" digest
format      = lower *15( lower / DIGIT )
position    = "0" / ( %x31-39 *15DIGIT )
digest      = 1*( lower / DIGIT / "." / "-" / "_" )
lower       = %x61-7A
```

A position is also at most 2^53 − 1. The format states the exact text
form of its digests. A string that does not match this grammar is not
an identifier.

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
8. **Signatures.** The signature profile of the format, or the
   statement that a convention of the genesis selects the profile. Whose
   signature counts is a rule of the sequence, not of the format. Level
   4 judges it (section 4).
9. **Vectors.** Where the test files of section 7 for this format are,
   or the statement that they are not published yet.

Appendix A lists the formats that are declared at the date of this
note, each with its definition in this shape and an example identifier.
A system declares a format when it publishes the definition. An
implementation can claim conformance to a format only after the vectors
of that format are published (section 7).

## 4. Verification

Verification answers one question about a citation: is this event the
one that the citation identifies, and does the event belong to that
sequence? The answer comes in levels. Each level is a stronger statement
than the level before, and each level needs more of the sequence. The
caller states the highest level that it wants. A verifier runs the
levels in order and stops at the first level that does not pass.

A verifier has three inputs: the citation, a source, and a list of
anchors. The source is a host or a copy. It serves the event at a
position, or the event with a digest. The list of anchors can be empty.

First, the verifier parses the citation with the grammar of 2.3. If the
citation does not parse, the result is `invalid`. If the verifier does
not implement the format of the citation, the result is `incomplete`.
Then the verifier reads the event at the cited position from the source.

**Level 0, bytes.** Hash the bytes of the event as the digest input of
the format states. The result must equal the digest in the citation. A
pass shows that these bytes are the bytes cited. This level needs only
the event. The verifier always hashes the bytes itself. A source can
serve bytes under a digest that they do not have.

**Level 1, fields.** If the format has a sequence member, an event after
the genesis must carry the cited genesis digest. If the format carries
the position, the event must carry the cited position. A pass shows what
the event states about itself, and no more. Anyone can write bytes that
state this. So level 1 is a fast rejection, not a proof of membership.
For a format with neither member, such as `git`, level 1 checks nothing.

**Level 2, chain.** Level 2 walks from the event back to the genesis.
At each step, the walk has an event at position p that passed levels 0
and 1. The step is:

1. If p is 0, the event must be a genesis as the format states. Its
   digest must equal the genesis digest of the citation. The walk ends
   at the genesis.
2. If p is more than 0, the event must carry the digest d of a
   predecessor.
3. If an anchor of the same sequence has the position p − 1, d must
   equal the digest of the anchor. The walk ends at the anchor. The
   verifier ignores an anchor of a different sequence.
4. If not, the verifier reads the predecessor from the source. It runs
   levels 0 and 1 on the predecessor, with d as its digest and p − 1 as
   its position. The walk then takes the next step from the
   predecessor.

A step can stop the walk in two ways. If a check compares bytes and
they do not match, the result is `mismatch`: the bytes prove the
citation wrong. If the source cannot serve a predecessor, the result is
`incomplete`. The source does not have it, or a copy ends at a shallow
boundary, or a host refuses. The walk also stops as `incomplete` at a
depth limit that the caller sets. An incomplete walk proves nothing
about membership.

A walk that ends at the genesis shows that the event is on a chain from
that genesis. It also shows that no one replaced an event between the
genesis and the cited event. Membership is shown here.

**Anchors.** An anchor is a citation of the same sequence that the
caller gives as already proved at level 2. It can come from an earlier
run of the verifier, or from a record that the caller trusts. Bytes that
the verifier holds are not an anchor. An event that passed only levels 0
and 1 is not an anchor. The end of a copy is never an anchor. A walk
that ends at an anchor shows the chain from the cited event back to the
anchor. It shows membership only if the anchor is correct. So the report
lists the anchor in `trusts`.

**Level 3, authorship.** Level 3 verifies the signatures of each event
that the walk of level 2 read, and of the cited event. The signature
profile of the format states where each signature is, the bytes that it
covers, the algorithm and the key. Each signature must verify under the
key that the event states. A pass shows that the holders of those keys
signed those bytes. An event that the profile gives no signature has
nothing to verify, and passes. Level 3 does not verify the events before
an anchor. Their authorship is part of what the report lists in
`trusts`. If the verifier does not have the profile of the
sequence, the result is `incomplete` after level 2.

Levels 0 to 2 need only the format definition. Level 3 also needs the
signature profile.

The judgment of the event under the rules of the sequence is the step
after these levels. It asks whether each key had the right to sign, and
whether the event was a valid step from the state before it. That is
level 4. Each system does it with its own replay, outside this protocol.

**Report.** A verifier reports one JSON object with these members:

| Member | Type | Value |
|---|---|---|
| `citation` | string | The citation, as the caller gave it. |
| `requested` | integer, 0 to 3 | The highest level that the caller asked for. |
| `result` | string | `ok` when every requested level passed. `mismatch` when the bytes prove the citation wrong. `incomplete` when a level could not finish. `invalid` when the citation does not parse. |
| `reached` | integer 0 to 3, or null | The highest level that passed. Null when level 0 did not pass. |
| `reason` | string or null | Null for `ok`. Otherwise one reason from the table below. |
| `anchor` | string or null | `genesis`, or the anchor citation where the walk of level 2 ended. Null when level 2 did not pass. |
| `trusts` | array of strings | The anchor citations that the result depends on. Empty when the walk ended at the genesis or did not run. |

| Reason | Result | When |
|---|---|---|
| `syntax` | `invalid` | The citation does not match the grammar of 2.3. |
| `format` | `incomplete` | The verifier does not implement the format. |
| `unavailable` | `incomplete` | The source cannot serve the cited event or a predecessor. |
| `depth` | `incomplete` | The walk reached the depth limit of the caller. |
| `profile` | `incomplete` | The verifier does not have the signature profile of the sequence. |
| `digest` | `mismatch` | The bytes of the cited event or of a predecessor hash to a different digest. |
| `sequence` | `mismatch` | An event carries a different genesis digest. |
| `position` | `mismatch` | A carried position differs, or the walk reaches a genesis before position 0, or no genesis at position 0. |
| `genesis` | `mismatch` | The walk reaches a genesis at position 0, with a different digest. |
| `anchor` | `mismatch` | The digest of the predecessor differs from the digest of the anchor at its position. |
| `signature` | `mismatch` | A signature does not verify. |

Three reports for the citation of 2.2. The first is a pass at level 2.
The second comes from a host that served changed bytes. The third asks
for level 3 from a verifier without the gitseq profile:

```json
{ "citation": "did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8/557/cc7eb5a129850990652c553adffbfd2f4f726f83",
  "requested": 2, "result": "ok", "reached": 2, "reason": null, "anchor": "genesis", "trusts": [] }

{ "citation": "did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8/557/cc7eb5a129850990652c553adffbfd2f4f726f83",
  "requested": 2, "result": "mismatch", "reached": null, "reason": "digest", "anchor": null, "trusts": [] }

{ "citation": "did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8/557/cc7eb5a129850990652c553adffbfd2f4f726f83",
  "requested": 3, "result": "incomplete", "reached": 2, "reason": "profile", "anchor": "genesis", "trusts": [] }
```

**Worked example.** This script verifies the citation of 2.2 at level 2
in a clone of the gitseq workroom. It hashes each commit itself, because
Git does not check the hash of an object when it reads the object. It
reads stored objects and not their replacements. It reads the first
parent from the raw commit, so grafts have no effect. If an object is
not in the clone, the script stops as incomplete, not as a mismatch.

```sh
export GIT_NO_REPLACE_OBJECTS=1
c=cc7eb5a129850990652c553adffbfd2f4f726f83; p=557
while :; do
  git cat-file -e "$c" 2>/dev/null || { echo "incomplete: $c unavailable"; exit 2; }
  h=$(git cat-file commit "$c" | git hash-object -t commit --stdin)
  [ "$h" = "$c" ] || { echo "mismatch: $c hashes to $h"; exit 1; }
  parent=$(git cat-file commit "$c" | sed -n '/^$/q; s/^parent //p' | head -n 1)
  [ -n "$parent" ] || break
  [ "$p" -gt 0 ] || { echo "mismatch: position"; exit 1; }
  c=$parent; p=$((p - 1))
done
[ "$p" = 0 ] && [ "$c" = 5d2622748872b7e2dec3fe5c59e4be73a35e0bc8 ] && echo "level 2 passes" \
  || { echo "mismatch: the walk ends at $c, position $p"; exit 1; }
```

On 19 October 2026 the script read 558 commits and printed
`level 2 passes`. Level 3 then needs the gitseq signature profile
(appendix A.2, item 8).

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

| Request | Answer |
|---|---|
| `GET <base>/<id>` | The sequence document of 5.3, as `application/did+json` |
| `GET <base>/<id>/<position>` | One event, as `application/json`: `{ "id": "<citation>", "position": <n>, "digest": "<text form>", "encoding": "utf-8" or "base64", "bytes": "<the event>" }` |
| `GET <base>/<id>/<position>?n=<count>` | A page, as `application/json`: `{ "events": [ <event objects> ], "next": <position or null> }` |

In an event object, `position` is the position of the event. `id` is
its citation: the sequence identifier, the position and `digest`. Both
`id` and `digest` are statements of the host. The reader hashes the
event and compares the result with the citation.

**Encoding.** If `encoding` is `utf-8`, the event is the UTF-8 encoding
of the string value of `bytes`, after the JSON parser decodes its
escapes. A host uses `utf-8`
only for an event that is valid UTF-8. For any other event, it uses
`base64`: the alphabet of RFC 4648, section 4, with `=` padding. A
reader does not normalise either form.

**Pages.** `count` is a decimal integer from 1 to 1000, with no leading
zeros. A page holds at least one event and at most `count` events, from
the requested position upwards, with no gaps. `next` is the position
after the last event in the page. It is null when the last event is the
highest position that the host serves.

**Errors.** A host answers `400` for a path or a query that does not
match the grammar of 2.3 or the rule for `count`. It answers `404` for a
sequence or a position that it does not hold, and `403` for a reader
that it refuses (section 5.4). These answers have an empty body.

**Dereference of a citation.** A reader resolves the sequence identifier
to its sequence document, selects a `SeqHttp` service, and reads the
event at the cited position. So the path `/<position>/<event>` of a
citation becomes the request `GET <base>/<id>/<position>`. The resource
that the citation identifies is the event: the reader decodes `bytes`
as `encoding` states. The reader then verifies the event against
`<event>`, at level 0 or higher. A
reader that already has an address does not need the document.

**From Git.** For `git` and `git256`, a remote is an address, and the
reads are Git operations. The reader gets the genesis by its hash, the
event at a position by the first-parent walk, and any commit by its
hash. A host can also hold a sequence of another format in a Git
repository and serve the three reads from a clone. The archive of dap
does this (section 8).

### 5.3 Sequence document

The resolution of a sequence identifier gives a document. The document
tells the reader where the sequence is served, and it lets the reader
make sure that it has the correct sequence. It is a DID document in the
JSON representation of DID Core, section 6.2, with the media type
`application/did+json`. It has these members:

- `id`: the identifier of the sequence.
- `service`: one entry for each address. Each entry has its own `id`:
  the sequence identifier, `#`, and a fragment that no other entry in
  the document has. Its `type` is `SeqHttp` for an HTTP base URL, or
  `SeqGit` for a Git remote. Its `serviceEndpoint` is that URL.
- `sequence`: a property that the `seq` method defines. It has three
  members. `format` is the token of the format. `genesis` is the genesis
  event as `{ "encoding", "bytes" }`, encoded as in 5.2. `head` is an
  integer: the highest position that the host serves when it answers.

The `sequence` property goes into the DID specification registries with
the registration of the method. An example, with the genesis bytes
shortened:

```json
{
  "id": "did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8",
  "service": [
    { "id": "did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8#http-1",
      "type": "SeqHttp",
      "serviceEndpoint": "https://host.example/v1/sequences" },
    { "id": "did:seq:git:5d2622748872b7e2dec3fe5c59e4be73a35e0bc8#git-1",
      "type": "SeqGit",
      "serviceEndpoint": "https://git.example/workroom.git" }
  ],
  "sequence": {
    "format": "git",
    "genesis": { "encoding": "utf-8",
                 "bytes": "tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\nauthor gitseq genesis <genesis@gitseq.invalid> 1786030593 +0000\n…" },
    "head": 557
  }
}
```

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
with no more detail. A digest does not change. So anyone who sees two
identifiers can tell that they are of the same sequence. An identifier
gives no confidentiality.

## 7. Conformance and vectors

A test vector is a published input with its expected output. An
implementation passes a vector when it produces that output. Code that
is not an implementation under test produces the vectors, so that no
mistake of an implementation becomes the standard. The tests of an
implementation compare its output with the vectors and never regenerate
them.

The vectors of a format are published with the first implementation of
that format. An implementation can claim conformance to a format only
after its vectors are published. Each definition in appendix A states
where its vectors are, or that they are not published yet.

For each format, the vectors are two files under `vectors/<format>/`.

`sequence.json` holds a short sequence: the genesis and at least three
events after it. Its shape is `{ "id": "<sequence identifier>",
"events": [ { "position", "digest", "encoding", "bytes" } ] }`, from
position 0 upwards. `encoding` and `bytes` are as in 5.2.

`cases.json` holds a list of cases. Each case is one verification, with
all of its inputs:

| Member | Value |
|---|---|
| `name` | A short text. No other case in the file has it. |
| `citation` | The citation, as a string. |
| `requested` | The level that the case asks for, from 0 to 3. |
| `event` | The event that the source serves at the cited position, as `{ "encoding", "bytes" }`. Null when the source has no event there. |
| `source` | The predecessors that the source can serve, as a list of `{ "digest", "encoding", "bytes" }`. `digest` is what the source states. The verifier finds a predecessor by this digest, and hashes its bytes itself. |
| `anchors` | A list of anchor citations. It can be empty. |
| `depth` | The depth limit of the walk, as a number of steps, or null for no limit. |
| `expect` | The complete report of section 4. |

The cases for each format include at least:

- a valid citation of each event in `sequence.json`, with the full
  source, at level 3 for a format with a profile and at level 2 for a
  format without one;
- for a format without a profile, one valid citation at level 3
  (`incomplete`, `profile`);
- citations that do not parse: an uppercase hexadecimal digit, a
  position with a leading zero, a position above 2^53 − 1, and `#` in
  place of the last `/` (`invalid`, `syntax`);
- one citation with an unknown format token (`incomplete`, `format`);
- one event with one changed byte (`mismatch`, `digest`, reached null);
- one citation with the wrong position (`position`);
- one event of a different sequence, with its own correct digest in the
  citation (`sequence`, or `genesis` for a format without a sequence
  member);
- one source that serves changed bytes under the digest of a middle
  event (`digest`, reached 1);
- one source without a middle event (`incomplete`, `unavailable`,
  reached 1);
- one source that holds a middle event and none before it, with no
  anchor (`incomplete`, `unavailable`): an event that the verifier holds
  is not an anchor;
- the same source with an anchor at that middle event (`ok`, the anchor
  in `trusts`);
- one anchor at the correct position with a wrong digest (`anchor`);
- one anchor of a different sequence, with the full source (`ok`,
  `genesis`, empty `trusts`);
- one depth limit shorter than the walk (`incomplete`, `depth`);
- for a format with a profile, one event with a changed signature, cited
  with its own correct digest (`signature`, reached 2).

An implementation conforms when it passes the vectors of the formats
that it claims and states the levels that it runs.

# Appendix A. Declared formats

This appendix is informational. It lists the formats that are declared
at the date of this note, with their definitions in the shape of
section 3. A format that a system declares later goes here with its
definition.

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
8. **Signatures.** One profile. An entry carries a signed intent at
   `input.signed` when `input.type` is `act` or `preparation`. A genesis
   carries one at `input.founding` when that member is not null. An
   entry with any other input, such as a delivery, an outcome or a
   genesis with `founding: null`, carries no signature. A signed intent is the JSON object
   `{ "intent": { … }, "sig": "…" }`.
   - The algorithm is Ed25519 of RFC 8032. A key or a signature with a
     non-canonical encoding fails.
   - The signed bytes are the ASCII bytes `artroom-intent-1`, a line
     feed, and the RFC 8785 JSON of the `intent` member.
   - The key is `intent.actor`: `key_` and then the base64url of the
     32-byte public key, with no padding (RFC 4648, section 5).
   - `sig` is the base64url of the 64-byte signature, with no padding.

   The position, the predecessor, the effects and the sends of an entry
   are statements of the host. No signature covers them. Level 2 covers
   them, and level 4 judges them.
9. **Vectors.** `vectors/dap1/`. Not published yet. They come with the
   change of section 8.

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
   designates. For gitseq, it is the root of the first-parent chain of
   `refs/seq/<genesis>`. For the forge, it is the inception commit.
5. **Sequence member.** None. A commit does not carry the digest of its
   genesis.
6. **Predecessor.** The first parent. A commit that is reachable only
   through a second parent is content that an event brings in. It is not
   an event.
7. **Position.** Not carried. The position is the number of first-parent
   steps from the genesis to the event. The verifier reads stored
   objects and the parent lines of the raw commit, so replace refs and
   grafts have no effect. A walk that reaches the boundary of a shallow
   clone stops as `incomplete`.
8. **Signatures.** A convention of the genesis selects the profile. This
   note defines no profile for `git` or `git256`. A gitseq event carries
   two signatures. A `gpgsig` header holds the SSH signature of the
   sequencer over the commit. Trailers hold the signature of the actor
   over the intent. The forge signs in `gpgsig` with an SSH
   signature. A verifier without the profile of a sequence stops after
   level 2, with the reason `profile`.
9. **Vectors.** `vectors/git/` and `vectors/git256/`. Not published yet.
   They come with the change of section 8.

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

**References in a genesis to its own sequence.** For the same reason, a
genesis cannot carry the full reference of its own sequence. Today a
Directory genesis carries its own reference three ways. It is the
`creator` in the seeds of the membership, rules and destination scopes
that the genesis creates. It is the `directory` in the bodies of its
create requests. And the scope IDs of those siblings are digests of the
seeds. So the change applies four rules:

- Inside a genesis entry, a reference to its own sequence is
  `{ scope, genesis: null }`. This covers the seeds, the request bodies
  and the effects of the genesis. A seed or a message that a genesis
  sent keeps this form wherever another entry copies it, so its digest
  does not change. No other reference carries `genesis: null`.
- A scope that reads such a reference reads it as the sequence of the
  sender. In a seed, that is the sequence of the `source` in its own
  genesis input. In a message, it is the sequence of the `from` of the
  delivery. The scope records the full reference, never the null.
- A seed that a genesis creates has, as `cause`, the digest of the
  genesis input of its creator, in a new domain `artroom-input-1`. Today
  its cause is the digest of the seed of its creator. The genesis input
  holds the nonce. So two sequences under one scope ID create children
  with different scope IDs, as the incarnation does today.
- The digest of the genesis entry is then computed once, after its
  effects and sends are complete, as for any entry.

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

**Vectors.** The same change produces the vectors of section 7 for
`dap1`, `git` and `git256`, with a script in a different language from
the implementation. The tests of replay compare its integrity mode with
the `dap1` vectors.

**Size of the change, from a count of the source:** `ScopeRef` appears
in 140 files, `FactRef` in 88, and the incarnation member in 53. Most of
the change is mechanical. Six places need thought:

- the resolver and routing in the scope package;
- the creation protocol and its conflict clause;
- the genesis of a Directory, under the four rules above. Its witness
  computes the scope ID of each sibling before the genesis is sealed. It
  shows that each sibling records the full reference of the Directory.
  It shows that a second sequence under the same scope ID creates
  siblings with different scope IDs;
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
  or external resource." Section 5.4: each service has an `id`, and a
  producer "MUST NOT produce multiple `service` entries with the same
  `id`". Section 6.2.1: the JSON representation has the media type
  `application/did+json`.
- [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648), sections 4 and 5:
  base64 and base64url. [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032):
  Ed25519. [RFC 5234](https://www.rfc-editor.org/rfc/rfc5234): ABNF.
- Git: [git cat-file](https://git-scm.com/docs/git-cat-file) prints the
  type or the content of an object, and does not verify its hash;
  [git hash-object](https://git-scm.com/docs/git-hash-object) computes
  the object name from content; `GIT_NO_REPLACE_OBJECTS` in
  [git](https://git-scm.com/docs/git) turns off replace refs;
  [the signature format](https://git-scm.com/docs/gitformat-signature)
  separates the signed payload from the `gpgsig` header in the object.
- In this repository, for section 8: the seeds of the siblings and the
  `directory` member of the create requests in
  [the Directory definition](../packages/platform/src/directory.ts), and
  [the genesis draft](../packages/derive/src/genesis.ts).
- [DID method registry](https://www.w3.org/TR/did-extensions-methods/),
  read 19 October 2026.
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), JSON
  Canonicalization Scheme.
- Git object hashing: the object header `<type> <size>\0` before the
  content, as `git hash-object` computes it.
