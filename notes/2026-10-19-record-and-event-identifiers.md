# Record and event identifiers

19 October 2026, draft 1. Design note for review. It proposes the first
protocol to be factored out of dap and published for independent
implementations: how a record is identified, how one event in it is
cited, how either is resolved to bytes, and what a reader can check.
Everything else that crosses a boundary in dap rests on these two
identifiers: a delivery names its source event, a grant names the event
that issued it, a receipt is an event, a receipt commit carries one in
its message, and the archive is a chain of them.

The proposal is shaped so that gitseq, atseq, noseq and the Open
Integrity Forge can each express their records in it, because all five
systems already have the same three primitives: a record named by the
hash of its first event, an event named by its record, its position and
its hash, and a signed request answered with the first receipt. None of
the five shares a written form with another. Section 8 weighs the cost
of adoption for each.

It decides seven things:

1. **Two identifiers, with different jobs.** An *identity* names one life
   of a record and is the hash of its genesis. An *address* is where the
   record is served, and is a URL. The identity is the same whatever the
   host. An address can exist before the genesis does.
2. **A citation is identity, position and hash**, written as a DID URL:
   `did:seq:<format>:<genesis>/<position>/<event>`.
3. **One DID method, many formats.** The method is `seq`. The first
   segment of the method-specific identifier names the byte format and
   the hash function, so one resolver and one verifier serve dap, Git
   based records, AT Protocol records and Nostr events.
4. **Four verification levels**, named, each with a stated reach. The
   protocol says what a citation does not prove.
5. **Golden vectors from independent code.** The specification ships
   vectors for each format, produced by code that is not the
   implementation under test.
6. **The record format is versioned apart from the service.** The format
   token versions the bytes. Routes and tools version themselves.
7. **dap adopts it in one change, with no compatibility layer.** Its
   references shrink from five parts to four, and the incarnation and the
   kind leave every reference.

Not provided here: the signed request, delivery between records,
membership observation, and item addressing. Section 9 says how the
signed request sits on these two identifiers.

## 1. Terms

| Term | Meaning |
|---|---|
| Record | One ordered sequence of events under one set of rules. In dap, a scope; in gitseq, a workroom; in atseq, an app; in noseq, an instance; in the forge, a repository. |
| Genesis | The first event of a record. Its bytes fix the record's rules and, where the system has one, its creator. |
| Life | One run of a record from one genesis. In dap today, an incarnation. |
| Identity | The digest of the genesis, under the record's format. One per life. |
| Address | A URL at which a host serves the record. A record may have several addresses, and an address may be known before the genesis exists. In dap, the scope ID. |
| Event | One entry of a record at one position, with one digest. |
| Position | How many events come before it in the record. The genesis is at 0. |
| Citation | Identity, position and digest of one event. |
| Format | A named rule for the bytes of an event and the hash function over them. |

## 2. The identifiers

### 2.1 The identity of a record

```
did:seq:<format>:<genesis>
```

`format` is a token from the table in section 3. `genesis` is the digest
of the genesis event's bytes under that format, in the format's text
form: lowercase hexadecimal for the SHA families, and the native text form
of a content identifier where the format already has one. Every character
is one that DID syntax allows in a method-specific identifier, so no
percent encoding is ever needed.

Two lives of one dap scope are two identities. The scope ID is their
shared address, not their identity.

### 2.2 The citation of an event

```
did:seq:<format>:<genesis>/<position>/<event>
```

`position` is a decimal integer with no leading zeros, and `event` is
the digest of that event's bytes under the format. The position is a
locator: a store indexed by position finds the bytes without a search,
and a resolver refuses a citation whose position and digest disagree
without walking the chain. The digest is the claim.

The event segment is a path and not a fragment. In a DID URL a fragment
names something inside the resolved document and is not sent to the
resolver. An event is a separate resource. gitseq's `#` form therefore
becomes a path here.

### 2.3 The address

An address is an ordinary URL. In dap it is
`https://<host>/v1/scopes/<scope ID>`, where the scope ID is the digest of
the seed, known before the scope exists, and the name that creation sends
and routing use today. A citation maps to a read of the same host
mechanically:

```
did:seq:dap1:<genesis>/<position>/<event>
→ https://<host>/v1/records/<genesis>/<position>
```

The host answers the event's bytes and nothing else is trusted from it.
The identity holds whatever the host. A host that holds no copy answers
not-found, as the scope URI direction of 5 October states.

### 2.4 What resolving an identity returns

A DID document, in the form DID Core requires, with these members:

- `id`: the identity.
- `service`: one entry of type `SeqRecord` for each address at which the
  record is served, with the read URL as its endpoint.
- `seq`: the format, the position of the head the host serves (a
  statement, not a proof), and the genesis bytes as text or base64 so
  that a reader can check the identity before it trusts anything else.
- For dap: the scope ID, the kind, the pinned definition's digest and the
  creator's citation, all read from the genesis bytes and stated again for
  convenience.

A DID document is a hint that a reader checks. The only fact in it is the
genesis bytes.

## 3. Formats

| Token | Event bytes | Digest | How an event names its record | Position |
|---|---|---|---|---|
| `dap1` | The canonical JSON of an entry, RFC 8785, under the domain tag `artroom-entry-1` and a newline | SHA-256, 64 hex | Every entry after the genesis carries `rec`, the identity. The genesis carries the seed and a 16-byte nonce. | `seq` |
| `git` | A Git commit object, SHA-1 object format | 40 hex | The genesis is reachable from the event by first parents only, in exactly `position` steps | First-parent distance from the genesis |
| `git256` | A Git commit object, SHA-256 object format | 64 hex | As `git` | As `git` |
| `at` | A DAG-CBOR record of the entry lexicon | CIDv1, base32 lowercase | The entry's genesis field equals the identity | The entry's record key |
| `nostr` | A Nostr event of the ordered-entry kind, NIP-01 serialization | SHA-256 event ID, 64 hex | The `h` tag equals the identity | The entry's position field |

A format token is the version of the bytes. A change to the bytes is a
new token. A change to a route, a tool or a document shape is not.

The `git` formats cover gitseq, whose events are commits under
`refs/seq/<genesis>`, and the forge, whose events are the commits of
`main` judged at their first parent. The forge's `did:repo:<hash>` is
`did:seq:git:<hash>` under another method name.

## 4. Verification

Four levels. Each names what it reaches. A verifier states the level it
ran and what it took on trust.

| Level | Check | Reaches |
|---|---|---|
| 0, bytes | The event's bytes hash to the cited digest under the format | This event is the one cited |
| 1, membership | The event names the cited identity by the format's rule, and its position is the cited one | This event belongs to that life at that position |
| 2, chain | From the event, each predecessor link hashes to the previous event, positions fall by one, and the walk reaches the genesis or an anchor the verifier already holds | No event between the anchor and this one was replaced |
| 3, authorship | Each event's signatures hold under the format's rule: in dap the actor's signature over the intent, in Git the commit signature, in atseq the actor and sequencer signatures, in noseq the device and sequencer signatures | The events were signed by the keys they name |

Judgment, which is whether each event followed from its input under the
record's rules, is level 4 and belongs to each system's own replay. It is
outside this protocol. In dap it is replay mode; the four levels above
are its integrity mode, written down.

A citation does not prove: that the event took effect in any other
record; that it is the head; that the record was not rewritten after the
verifier's anchor; that the host will keep it; that its content is true;
or what time it was. dap's rule that a position means something only in
its own record stays.

## 5. What a host serves

Three reads are enough for a verifier at every level:

| Read | Returns |
|---|---|
| The identity | The DID document of 2.4 |
| An event by position | The event's bytes and the digest the host holds for them |
| A page of events from a position | Bytes and digests, with a cursor |

The Git archive layout of the volatile acts note, section 15, is the same
three reads from a clone: `head.json` for the identity, and the segments
for events by position. The archive ref is keyed by scope ID today; under
this note it may stay, because the scope ID is the address and the
identity is in `head.json`.

Who may read is each system's decision and is stated beside the reads,
not here. dap's member sessions and signed reads apply unchanged. A
reader that holds a citation and no credential gets not-found or
forbidden, and the protocol says nothing more. The one new rule that
delivery between deployments will need, that the envelope naming a source
event is the credential for reading that one event, belongs to the
delivery note.

## 6. Vectors and conformance

The specification ships, for each format:

- one genesis, three events after it, the identity, three citations and
  the URL mapping of one of them;
- one event with one changed byte, one citation with the wrong position,
  one event from another record, and one chain with a replaced middle
  event, each with the level at which it fails;
- the expected result of each level on each.

The vectors are produced by code that is not any implementation under
test. For `dap1` that is a short script in another language, run on the
committed bytes, and the gate compares its output with the TypeScript
implementation's and never regenerates the vectors from the
implementation. atseq already works this way; noseq planned it and never
did; the forge's rules exist only as TypeScript. A conforming
implementation passes the vectors of the formats it claims and states
the levels it runs.

## 7. What changes in dap

dap adopts this in one change. There is no deployed history to keep
compatible, so nothing is dual-written and nothing is translated.

**References.** `ScopeRef` is `{ scope, inc, kind }` today and `FactRef`
is `{ at: ScopeRef, seq, hash }`. They become:

```ts
interface RecordRef { scope: ScopeId; rec: Digest }   // address and identity
interface FactRef   { at: RecordRef; seq: number; hash: Digest }
```

`rec` is the identity: the hash of the genesis entry. The incarnation's
job, to tell one life from another, is done by `rec`, and the genesis
keeps a 16-byte nonce so that two lives of one seed never hash alike. The
kind leaves references: it is in the seed, so a reader has it from the
genesis, and a handler's check of the sender's kind compares against the
source scope's genesis, which the receiver fetches once and keeps. The
scope ID stays in the reference because it is the address that routing
and creation use, and keeping it means no host index is needed to find
an object from a citation.

**Entries.** Every entry after the genesis carries `rec` in place of
`at`. The genesis carries the seed, the nonce and no `rec`, because an
entry cannot hold its own hash. The entry hash domain stays
`artroom-entry-1`, which is what the token `dap1` names.

**Routing.** A send to another life is refused as today, by comparing
`rec` with the object's genesis hash instead of comparing incarnations.
`wrong-incarnation` and `incarnation-conflict` are renamed to say life.
A seed still names a creation, and a child's scope ID is still known
before it exists.

**Text and ref names.** The fact text that receipt commits carry becomes
the citation. Public ref names keep the event hash as one component.

**Reads.** One route is added: `GET /v1/records/<genesis>` for the DID
document and `GET /v1/records/<genesis>/<position>` for an event. The
existing routes under `/v1/scopes/<scope ID>` stay as the address form.

**Size of the change, from a count of the source:** `ScopeRef` appears
in 140 files and `FactRef` in 88, and the incarnation member in 53. The
change is mechanical in most of them. The places that need thought are
the resolver and routing in the scope package, the creation protocol and
its conflict clause, replay's chain check, the archive's `head.json`,
and every test fixture that builds references by hand.

## 8. Adoption cost for each project

| Project | What already matches | What changes | Cost | Can we force it |
|---|---|---|---|---|
| dap | Seed digest as address, entry hash as event digest, fact text, the archive layout, replay's integrity mode | Section 7 | One cross-cutting change, a few days of builder work plus the gate | Yes |
| gitseq | `git:sha1:<genesis>#git:sha1:<event>`, a linear chain under `refs/seq`, one-based tickets | Syntax: `did:seq:git:<genesis>/<position>/<event>`; zero-based positions with the genesis at 0, to be confirmed against its log; one parser and one formatter in Go; the identifier is pervasive in trailers, body fields, command arguments and MCP tools | Low to moderate. gitseq is live infrastructure for this repository, so it accepts both forms for a while, unlike dap | Yes, with a transition |
| atseq | Genesis CID, receipt of genesis, position and entry CID, a predecessor link | A text form only; nothing in its records changes | Trivial to express; the native design has no runtime yet | Yes, on paper |
| noseq | Genesis event ID, ordered entry with position and previous, `h` tag | A text form only. Levels 0 to 2 run on ciphertext, with no group key | Trivial to express; there is no runtime | Yes, on paper |
| Open Integrity Forge | `did:repo:<inception sha1>`, policy judged at the first parent, verification from any clone | The method name, a DID document, and positions as first-parent distance. Its `did:repo` has no method specification and no resolver; this note would give it both | Low technical cost, but it is another organisation's project | No. Propose it after dap has adopted it and the vectors exist |

The forge is the one party that would gain a registered, specified method
in exchange for a name. That is worth a proposal to them, and not before
dap has shipped.

## 9. The signed request, on these identifiers

The next protocol is the signed request and its four answers. It imports
this note and adds nothing to it:

- `to` names a life by its identity, with the address as a hint.
- `expected` names item revisions as today, inside that life.
- `presented` facts are citations.
- The receipt is a citation, with the effects and sends the entry made.
- A refusal names the head it was judged at as a citation.
- The idempotency key is scoped to the signing key, the signature covers
  the canonical bytes under a domain tag, and an exact retry is answered
  with the first receipt. These are the rules dap, gitseq, atseq and
  noseq each arrived at separately, and the atseq lessons apply: identify
  an act by its unsigned bytes, never bind an act to a whole definition
  digest, and keep the retry namespace per key.

## 10. Decisions

1. An identity is the digest of the genesis; an address is a URL; the two
   are kept apart.
2. One DID method, `seq`, with a format token as the first segment.
3. A citation is `/<position>/<digest>` as a path, never a fragment.
4. Four named verification levels; judgment is outside the protocol.
5. Vectors from independent code, committed with the specification; the
   gate never regenerates them from the implementation.
6. The format token versions the bytes; nothing else does.
7. dap changes its references to `{ scope, rec }` and `{ at, seq, hash }`
   in one change, drops the incarnation and the kind from references, and
   keeps the scope ID as the address.

## 11. Open points

- **The method name.** A read of the W3C DID method registry on 19
  October 2026 found no `seq`, `repo` or `git` entry among about 270
  methods. Registration is a later step and the name is checked again
  then.
- **Whether to keep the scope ID in the reference.** Section 7 keeps it
  to avoid a host index from identity to object. The purer form,
  `{ rec }` alone, needs that index. Decide on the cost of the index.
- **gitseq's positions.** Whether its tickets map to positions with the
  genesis at 0 is to be confirmed before its formatter is written.
- **Content identifiers instead of format tokens.** A CID can name the
  codec and the hash in the identifier itself, and atseq already uses
  them. The table of section 3 is smaller for the Git and dap formats,
  which would otherwise need registered codecs. Revisit if a sixth format
  arrives.
- **Items.** An item is cited by its opening event. A URL for an item's
  current state is an address of the serving host, not a citation, and is
  left to the read routes.
- **The DID document's exact members** beyond `id`, `service` and `seq`.

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
- gitseq: [event identifiers](https://github.com/generalbusiness-ai/gitseq/blob/main/docs/reference/event-identifiers.md)
  and its glossary's definitions of event and ticket.
- atseq: `docs/protocol.md` sections on records and receipts, and
  `lexicons/` for the entry and genesis records.
- noseq: `docs/protocol-v0.md`, the context tags and the ordered entry.
- Open Integrity Forge: its README on `did:repo` and the inception
  commit, and `apps/forge/authority/verify.ts` for judgment at the first
  parent.
- [DID Core 1.0](https://www.w3.org/TR/did-core/): the syntax of a
  method-specific identifier and of a DID URL's path and fragment.
- [DID method registry](https://www.w3.org/TR/did-extensions-methods/),
  read 19 October 2026.
- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), JSON
  Canonicalization Scheme.
