# O1: one trusted writer over a local SQLite journal

This is the executable fixture profile `dap.fixture.single-writer/1`,
pinned by `genesis.payload.sequencing.profile`. The same object names the
initial writer's Ed25519 public key. `Journal.create` checks both against the
SQLite metadata; `Journal.open` verifies every saved envelope and header
before replaying the foundation. A URL is discovery information and cannot
replace the expected genesis or writer assignment.

This profile implements O1 in the spike plan. It does not implement writer
handover, consensus, transfer activation, the isolated control verifier, or
the O2 concurrency campaign. The executable transfer expectations in
[the lifecycle manifest](manifests/ordering-lifecycle.md) specify the future
O4 test; they do not prove that the runtime performs those transitions.

## Trust, finality and progress

There is one authoritative database file per context, one cooperating writer
process, one live `Journal` serving facade per backend, and one fixed writer
key. Opening a second facade on the same backend is rejected: each facade
has a folded admission state, so concurrent independent folds would be stale.
`Journal.close()` invalidates the facade and closes its SQLite handle; reopen
uses a fresh backend and rebuilds the state before admitting another action. Participants trust this writer not to
censor, equivocate, substitute another database copy, or expose private
payloads. The SQLite lock excludes a second process opening this same file.
It does not fence a malicious writer using another copy, a network filesystem
with incorrect locking, or an operator restoring an old backup. Use a local
filesystem and one configured database path, without aliases or live copies.

The sole append operation in `src/append.ts` checks stable signed bytes,
destination and bounds; looks up an exact retry before current admission;
checks credentials or invitation issuance; chooses the successor and signs
its header; and calls the backend's atomic write. Signing is synchronous
Ed25519 inside the serialization boundary. The adapter contains no separate
admission or append algorithm. The serving `Context` folds only after commit.
`Context.restore` is an explicitly trusted semantic entry point;
`Journal.open` is the authenticated boundary for saved wire bytes.

A returned receipt is final under these trust assumptions. Later appends
extend the same chain. A receipt says that an intent was recorded; the
foundation or model may still find it unauthorized or ineffective. Ordering
provides neither real-world arrival times nor fair admission. Progress needs
the writer process, its private key, the serving fold/packages, and writable
local storage. No automatic failover is claimed.

## Exact encoding

`src/codec.ts` implements RFC 8785 JCS over JSON data: finite ECMAScript
doubles, UTF-16 object-key ordering, exact Unicode without normalization,
and UTF-8 bytes. It rejects duplicate keys, noncanonical input encodings,
invalid UTF-8, lone surrogates, nonfinite numbers, sparse arrays, accessors,
and other non-JSON JavaScript values. The older visibility `canon.ts`
retains its safe-integer convention and legacy identifiers.

Principals are `ed25519:` followed by unpadded base64url of the raw 32-byte
public key. Signatures are unpadded base64url of the 64-byte Ed25519
signature. Nonces are exactly 16 bytes represented by 32 lowercase hex
characters. Digests use `sha256:` and 64 lowercase hex digits. Each signed envelope is limited to 65,536 UTF-8 bytes, including genesis
and each origin. Payload JSON
is authenticated without adding domain schema admission rules.

| Object | Canonical bytes and binding |
|---|---|
| Event body E | `kind`, `payload`, `actor`, `nonce`; sequenced intents also carry `genesis` and nonempty `action_id` |
| Application intent | Requires `expected_binding`; retains optional `expected_activation` as the existing fixture's signed compatibility/provenance field |
| Genesis and adopted origin | No `genesis`, `action_id`, `expected_binding`, or `expected_activation` in the body |
| Actor envelope SE | `{body:E,sig}`; actor signs JCS(E); commitment is SHA-256 of JCS(SE) |
| Genesis identity | Commitment of its signed envelope; header at 0 has this identity for `genesis` and `commitment`, with all-zero SHA-256 predecessor |
| Header preimage HP | `{genesis,position,prev,commitment}` plus `activation` or `requires` when supplied |
| Header | `{...HP,seq_sig}`; writer signs JCS(HP); header hash is SHA-256 of JCS(HP), excluding `seq_sig` |
| Wire line | JCS of `{header,committed}` followed by LF; `committed` is a JSON string holding the exact JCS(SE) bytes |

The plan §2.1 abbreviates HP to its four base fields; §2.2 requires
authenticated dependency evidence. This profile reconciles them by including
`activation` and `requires` in both the signed preimage and its hash.
`activation` names an earlier position for an application event. `requires`
is an ascending, unique list of earlier positions for an attach. They cannot
coexist, appear on genesis/origins, or appear on unrelated system kinds.
An unbound application kind or an unavailable attach can omit evidence and
receive the existing semantic refusal. Evidence describes a dependency;
cryptographic verification alone does not prove the writer supplied the
correct dependency. The existing interpreter/foundation performs that work.

Readable signed `ViewEntry` values carry the original `committed` envelope
bytes; hidden values carry no envelope, actor, kind, or audience. A recipient
can call `verifyJournalView` using an independently pinned genesis and writer
before interpreting the view. It checks every header, readable actor proof,
body/byte agreement, and origin adoption. It rejects hidden envelope leakage.
It does not establish freshness or prove that the server chose the correct
readable positions; those remain distinct serving and semantic questions.

Genesis retains its declared origin bodies for V1 compatibility. Creation
requires a separate, matching signed envelope for each origin. Their original
signatures and committed bytes are retained at positions 1 through k.
Opening verifies the complete adopted prefix; `verifyWire` accepts an origin
only when the caller explicitly establishes adoption. Initialization commits
genesis and all origins together after a separate validation preflight.

The fixed-vector file contains genesis, application (including
`expected_activation` and header `activation`), attach (`requires`), and
origin vectors. Each includes exact bytes, hashes and signatures. Rejection
vectors cover changed bodies, signatures over wrong bytes, a wrong predecessor,
a wrong commitment, an unassigned writer, and signing the header rather than
HP. Additional tests change each dependency field and verify that even a
header-only reader rejects the signature. RFC 8032's independently published
key/signature example anchors the Ed25519 test; vectors generated by this
implementation alone are not treated as an independent implementation.

## Storage, acknowledgment and restart

The backend uses Node's synchronous SQLite interface, rollback journal
`DELETE`, `synchronous=FULL`, and `locking_mode=EXCLUSIVE`. Initialization
performs a write under `BEGIN EXCLUSIVE`, acquiring the retained OS file lock.
Every append runs under `BEGIN IMMEDIATE`; asynchronous transaction callbacks
are rejected. Entry, head, exact retry receipt, any invitation consumption,
and pending outbox row are committed together. The receipt returns only
after SQLite reports `COMMIT` success. No uncommitted candidate is published.

**The durability promise is survival of an application-process crash or
SIGKILL on the same host and intact local disk.** It excludes power loss,
host or disk loss, filesystem corruption, and malicious rollback. In
particular, rollback-mode `FULL` is not advertised here as a power-loss
promise. There is no replicated acknowledgment or authoritative mirror.
See [SQLite locking mode](https://www.sqlite.org/pragma.html#pragma_locking_mode),
[SQLite synchronous modes](https://www.sqlite.org/pragma.html#pragma_synchronous),
and [Node SQLite](https://nodejs.org/api/sqlite.html).

On open, the adapter checks dense SQL keys and stored positions, head, retry
rows and outbox correspondence. The authenticated facade checks exact saved
body/signature/wire correspondence and the complete header chain, then
rebuilds foundation state and checks the consumption index. Failed open
never silently repairs or truncates the journal. Retry after an uncertain
response uses the saved signed intent and existing action identity. After a storage or fold exception the Journal facade refuses further
submissions until a fresh open reconciles the durable state.

Outbox delivery is at least once. `await backend.drain(deliver)` waits for
synchronous or asynchronous delivery confirmation before committing its
acknowledgment. Failure leaves the saved entry pending. Consumers deduplicate
by `headerHash`; a crash between delivery and acknowledgment can repeat the
same saved bytes. Delivery never creates a new action or order. The writer
key is supplied by the test/service, never written to the database.

## Executed boundaries and compatibility

`test/fixtures/o1-crash-child.ts` is a separate OS process. The crash tests
actually terminate it with SIGKILL at `before-write`, `after-entry`,
`after-head`, `after-retry`, `after-consumption`, `after-outbox`,
`before-commit`, and `after-commit`. Every pre-commit interruption must leave
all append records absent; the post-commit interruption must retain all of
them, including the consumed invitation and recoverable receipt. Another
process dies at `after-publish-before-ack`; replay permits one duplicate
notification and preserves the original bytes. A separate process verifies
writer exclusion and release of ownership on close/crash.

The V1 Sale trace 0–5 runs with real keys, actor envelopes, signed headers and
wire verification on memory and SQLite, with the narrative's exact visible
and hidden positions. It extends through late joining, disclosure and an
as-of query, and checks interpreter/oracle agreement at every frontier.
Separate signed SQLite traces cover issuance-time authority after revocation,
unissued and unauthorized invitations, and consumed-token exact retry.

Legacy `Context.create`, memory append, snapshots, package IDs and seeded
visibility scripts remain available with their old body identifiers. The
signed path uses envelope commitments, so those signed traces have different
identities. Embedded invitation evidence carries an optional actor signature;
the signed path hashes full JCS, while legacy invitations keep body hashes.
Origin duplicate detection compares canonical bodies and supports finite
fractional JSON numbers without changing safe-integer fixture outcomes.
The O1 validation record reports integration checks; it does not rewrite
V3's historical campaign ledger or claim that its old byte streams had
signatures. The final candidate integrates V4/V5 and the V6 report ancestry;
the O1 layer adds no application model-policy repair. Those experiments keep
their own historical source and run boundaries.
