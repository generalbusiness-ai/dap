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
The current O1 corrections precede O4's formal baseline, not its existing
prototype implementation. Historical profile hashes and run records name
their original bytes; this edited document has a different content hash.

## Trust, finality and progress

There is one authoritative database file per context, one cooperating writer
process, one live `Journal` serving facade per exact backend object, and one
fixed writer key. The cooperative lease is keyed by JavaScript backend
object identity, not by an underlying store identity. Opening a second
facade on the same backend object is rejected: each facade
has a folded admission state, so concurrent independent folds would be stale.
`Journal.close()` permanently disables writes through that facade's Context
on every backend and closes its SQLite handle. `Context.create` and
`Context.restore` refuse a backend owned by a live Journal; a raw Context
acquired earlier also cannot submit or act while that Journal owns it.
Every write also compares the Context's folded position and header hash with
the backend's head inside the shared append serialization boundary. A stale
Context refuses the write and becomes inactive. A raw Context acquired before
a Journal therefore cannot resume stale writes after that Journal advances
and closes: memory fails the head check; SQLite's shared handle is closed.
A raw Context with an unchanged head may still write on an unowned memory
backend. Any raw or owned Context becomes inactive after its own append or
fold exception and must be replaced by a fresh restore or open. Reopen uses
a fresh SQLite backend handle, or may reuse a released MemoryBackend; both
rebuild state before admitting another action.
Direct backend mutation, Proxy, Object.create and plain delegating wrappers
or other aliases of a backend object, and malicious in-process code are
outside this cooperative ownership boundary. Participants trust this writer not to
censor, equivocate, substitute another database copy, or expose private
payloads. The SQLite lock excludes a second process opening this same file.
It does not fence a malicious writer using another copy, a network filesystem
with incorrect locking, or an operator restoring an old backup. Use a local
filesystem and one configured database path, without aliases or live copies.

The sole append operation in `src/append.ts` checks stable signed bytes,
destination and bounds; looks up an exact retry before current admission;
checks credentials or invitation issuance; chooses the successor and signs
its header; and calls the backend's atomic write. Signing is synchronous
Ed25519 inside the serialization boundary. Journal supplies an
ordering-admission hook through its encoding for the movable profile;
`append.ts` invokes it after exact retry. It is not a second append or
transport-admission algorithm. The revised fixed-writer contract omits that
ordering-admission hook. The serving `Context` folds only after commit.
`Context.restore` on an unowned backend is an explicitly trusted semantic
entry point. Its ordinary raw writes store unsigned entries; a later
`Journal.open` rejects those entries for missing committed bytes.
Supplying a caller-owned encoding to raw restore does not acquire Journal's
movable ordering-admission policy: a hook-free raw Context can write after
a seal, but `Journal.open` rejects the resulting profile-invalid history.
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
These public pointers also disclose an event class when present:
`activation` identifies a bound application event and `requires` an attach.
The header omits the exact kind and actor, but it is not class-opaque.

Readable signed `ViewEntry` values carry the original `committed` envelope
bytes; the serving fixture's hidden values carry no envelope, actor, exact
kind or audience. A recipient
can call `verifyJournalView` using an independently pinned genesis and writer
before interpreting the view. It checks every header, readable actor proof,
body/byte agreement, and adoption of readable origins. It rejects an envelope
placed in a hidden entry's `committed` field. It does not prove that an
entitled opening was supplied, detect a signed but truncated prefix, or
authenticate arbitrary extra `ViewEntry` properties outside the checked
header and envelope fields. Completeness, expected terminal head, freshness
and readable-position selection remain separate serving questions. Do not
treat unchecked display metadata or other extras as signed facts.

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
writer exclusion and release of ownership after a normal close, followed
by successful reopen. The named SIGKILL tests separately establish their
recorded crash/reopen boundaries; the exclusion test itself is not a crash
ownership experiment.

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

## O3: planned handover profile

The revised contract is `dap.fixture.single-writer/3`, a separate opt-in
profile. Its signed genesis
pins exactly `sequencing: {profile, writer, control}`: the initial writer and one
Ed25519 ordering-control key distinct from every assigned writer key. That
control key needs no application grant or
participant credential. The profile retains the v1 codec, retention promise,
SQLite boundary and wire vectors. Existing v1 genesis bytes do not gain a
handover rule. There is no automatic replacement, control-key rotation,
quorum, wall-clock authority lease, or transition between profiles.

This contract follows the builder design decision for Hugh under his
unattended spike instruction:
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:2d7edc9c76b3d657a2a9fbb3fa6ffa819cb25492`,
following ratified review
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:5643a940fde2c3c372d48ae89ee34e8e35593cf3`.
The revised Journal, recipient-view and independent-control-verifier
boundaries must reject old movable `/2` genesis and proof formats. Historical
`/2` fixtures, genesis pins, failures and measurements remain bound to their
original commits. They are not relabelled as `/3` results or migrated by
changing a profile field. The O1 fixed-writer wire bytes and vectors remain
unchanged. The current repair needs its own frozen source, focused validation
and bounded-cost evidence in the O2/O3/O5 and integration ledgers; this
contract statement is not that evidence or independent approval.

At committed position H in epoch e (initially 0), the ordering-control key
signs a `dap.seq.seal` actor envelope with exactly
`{epoch: e, predecessor: {position: H, headerHash: head.headerHash}}`.
The retiring writer appends it and signs its header at H+1. Sealing pauses
ordinary new appends; only the next assignment can extend the journal.
The control key signs `dap.seq.assign` with exactly
`{epoch: e+1, predecessor: {position: H+1, headerHash: seal.headerHash}, writer: successor}`.
The retiring writer appends and signs it at H+2. Its committed assignment
installs the successor for H+3. A writer key already used in this context
cannot be installed again. The wire kinds retain the existing
`ai.generalbusiness.dap.` prefix.

The predecessor object has exactly `position` and `headerHash`; missing or
extra fields, an entry commitment in place of the header hash, or a different
position are refused. Seal binds the exact current head and assign the exact
seal head. `headerHash` is the codec's canonical header preimage hash,
excluding `seq_sig`; it already binds the entry commitment, so the payload
has no redundant predecessor commitment. Each ordinary `header.prev` also
binds the previous header hash. All these links point backward. The signed
genesis binds the profile and durability promise; assign cannot substitute
different retention or control rules.

Journal verification, recipient-view verification and independent control
proof verification must reject an entry commitment appearing at more than
one position, including header-only positions. This check is independent of
the exact-head control binding and independently excludes the relocated-seal
proof containing a repeated commitment.
An exact retry returns its original saved receipt and position; it creates
no new entry and is not a repeated commitment in the journal.

`append.ts` still owns the only append and retry algorithm. Stable signed bytes
are checked first. Exact retry and changed-content refusal occur inside the
serialized boundary after O1's folded-frontier freshness check and before
the ordering gate. Only new actions check
whether this facade's signing key is currently assigned, whether a seal has
paused work, and whether the control proof is valid. Valid seal/assign events
use profile authority instead of participant admission; other events retain
ordinary admission. One commit saves the entry, head, retry and outbox records.
No refusal or retry adds an outbox row.

The O-H2 repair requires full authenticated verification at create/open to
build a private cache of the verified head, ordering state, commitments and
control positions. The movable-profile hook compares the cached head with
the backend head and validates the proposed action; signing checks the next
position, previous header hash and commitment uniqueness. The cache advances
from the authenticated envelope and new signed header only after the
backend's serialization call returns with the transaction committed. An
unexpected head requires reopen. Owned direct Context writes share this
encoding; cached ordering and control verdict queries use the authenticated
prefix rather than re-verifying the full chain. This live cache trusts older
stored rows while the head is unchanged: a rewrite of an older row is not
detected by live cached authentication. A cold open verifies the full stored
history and rejects that tampering. Direct backend mutation and hostile
in-process code remain outside the cooperative Journal ownership boundary;
the cache is not an integrity monitor for a writable database.

Fixed-writer journals must omit the ordering-admission hook entirely.
The O1 folded-frontier check and permanent error invalidation remain: cached
state cannot authorize a stale or errored Context, including after an
uncertain commit reply or a fold error. This bounds the **added ordering and
authentication work**, not the whole application path. The foundation fold
still materializes history, and total Context or SQLite append cost is not
claimed to be O(1). Work and timings at 100, 400 and 1,000 entries on memory
and SQLite require a recorded source and results; this contract statement
makes no unmeasured latency or throughput claim.

SQLite metadata pins the initial writer and profile, not a second mutable
assignment. `Journal.open` verifies all saved signatures and the control chain,
then derives the current assignment. A successor opens the same authoritative
journal after the former facade closes. A reconnected former writer may open
it to recover exact receipts, but cannot append a new action. Another key that
was never assigned cannot open it. The existing exclusive file lock and one
facade per backend still apply. Copying a database does not fence a dishonest
old writer; this remains the one trusted writer profile.

The public Journal result distinguishes authority layers. A committed `/3`
seal/assign returns `controlVerdict: {known:true, authorized:true,
effective:true}` and omits the application `verdict`. `controlVerdictAt(position)`
reports the authenticated control outcome and produces the same result after cold open or
an exact retry. `Journal.ordering` reports the verified current assignment.
The legacy F0 fold still has a `not_in_v1` placeholder for sequencing controls;
that internal placeholder is not the outcome of the ordering operation. No
application capability is consulted to install a writer. A `dap.seq.request`
remains an application request and never changes the ordering state.

The serving view places controls on the existing spine. `verifyJournalView`
can follow a visible valid control chain and authenticate the new writer's
headers, including hidden application positions. Hidden headers do not reveal
kind names; verification alone cannot prove that a server supplied every
required spine opening. **O5's invariant-19 result assumes that the complete
required control spine is supplied.** Its verifier authenticates the given
prefix, not its freshness or status as the latest head. A prefix ending
between seal and assign establishes a sealed prefix; hidden omitted controls
cannot in general be inferred from headers alone. Exact-head signatures and
duplicate-commitment checks do not prevent ordinary writer forks, database
copies or rollback to an older file. Comparing signed histories may reveal
equivocation; readers kept apart may not detect it. These trusted-writer
limits are unchanged. O3 does not count its own transition function as
independent evidence of invariant 19.

## O4: public-proof completeness

O4 selects `dap.fixture.scope/1` in genesis. This explicitly adds founding
participants for the Inspection, Delivery and Fulfilment fixture contexts.
A genesis carrying `scope` explicitly opts into the shared foundation's
scope setup validation and founding-participant semantics, even when opened
through plain `Journal`. Its valid founders become participants for live and
cold admission, member audiences and participant observations; a malformed
setup throws `ScopeProfileError`. A genesis without `scope` keeps the ordinary
single founder. This is an intentional shared-fold extension. It does not
make plain `Journal` enforce the full ScopeJournal contract: scope transition,
release, activation and proof validation still require that facade.
Founding participation creates no transferred right: F's declared rights remain dormant until the first effective activation.
S retains its original single founder and invitation trace. The profile and
its implementation content identity are pinned in every scope genesis.

A source serving party now performs one function beyond pure sequencing:
it reads each body's kind and assigned audience and certifies a complete
public projection. F's genesis pins each source genesis, initial writer,
export prefix and the scope implementation, which pins the named opening
rule. F trusts the source writer for this completeness claim, never for
release authorization or effect. This is a trusted-writer fixture extension,
not a production proof of completeness. Provenance: decisions
`00c92c297bdfd16aa9d9f9d6bba1406c61dcb85b`,
`ca04cc02027b9070bb60e3852ac19e21ae7931f4` and
`42ffb3413ded6c33fb39d25296cd04ce0f005d6a` in the dap workroom.

The rule is `dap.fixture.scope-public-openings/1`, whose canonical declaration
and content id are exported as `PUBLIC_PROOF_RULE` and
`PUBLIC_PROOF_RULE_ID` by `src/scope-proof.ts`. It opens exactly these kinds:

- dap genesis, accept_invite, grant, revoke, attach, close, scope.release,
  scope.activate, admit, seq.request, seq.seal and seq.assign;
- Sale listing, offer, withdraw, accept and close;
- the four Scope kinds result, exercise, import-export and recover.

For every position through the frontier, a listed kind must be opened and
its assigned audience must be spine or members. A narrower audience makes
the producer refuse certification. This includes an attach ceiling and an
unauthorized attempt assigned only to its actor. Every other position is
hidden. `dap.disclose` is excluded because it can carry private bodies;
`dap.observe` is excluded because observations are not release or grant
inputs in this fixed scope policy. No wildcard kind admission applies.
Opened bodies recursively reject `amount`, `acceptedAmount`, `counter`,
`terms` and `offer_terms`, including nested signed-envelope payloads.

A packet has exactly `genesis`, `initialWriter`, `frontier`, `positions` and
`certificate`. Each dense position has `header` and optionally `committed`
(the original signed envelope bytes). The certificate has exactly `body`,
`signer` and `sig`. Its signed body is exactly:

```
{type:'dap.fixture.public-proof-completeness/1', rule, genesis, frontier, proof_hash}
```

`rule` is the rule's content id. `proof_hash` is SHA-256 of the exact canonical
packet excluding only `certificate`; signing uses Ed25519 over canonical
body bytes through `codec.ts`. Extra fields are refused, and private-field
checks run before hashing. No certificate can recursively hash itself.
The signer must be the key that verified the frontier header's `seq_sig` in
the chain from the pinned genesis: W0 through the assignment at H+2, W1 from
H+3. A later valid frontier produces genuinely different proof material.

F takes source genesis and export prefix p from its own genesis transition.
The release must be r=p+1 and the certified frontier must be at least r.
Effect is independently replayed only through r; a later certificate is
never used to answer a current-state question. Verification checks strict
shapes, header/control chains, actor signatures, the certificate signature
and rule id, dependency pauses, grants, actual source models and the release
operation. A receipt alone cannot establish release. Scope's local state
fold uses its full journal and remains inspectable when certification is
refused. Scope verdicts supplement the legacy foundation's placeholder
scope verdicts; O4 clients use `ScopeJournal` for these operations.

Activation explicitly discloses the source spine and member authority
bodies to every F reader. For the fixture that includes Alice, Bob and Kim;
Carol's offer stub and source participation reach Kim, who was not an S
member. These are disclosures under the Sale budget's existing
subject-to-disclosure clause. The admitted Inspection proof at S20 also
contains I's signed genesis mandate: source S's genesis, request position 14,
offer `o2` and inspector Ivan, plus I1's result `pass:o2`. S14's request body
was readable only by Alice, Carol and Ivan. Bob already receives these
request-derived facts through S20's members audience; Kim receives them
through F1, whose spine audience exposes them to every F reader. The proof
also exposes I's founding participant Ivan. This is an explicit disclosure
of request-derived content, not just public source membership data.

The S14 request body and its explicit requester attribution are absent from
the carried proof. The mandate has no requester field. That narrow statement
does not promise secrecy of the request's subject, inspector, source position
or result, nor prevent inference about its requester; Carol's identity and
offer stub are separately disclosed. Sale amounts, counters and terms remain
excluded. The focused disclosure observation checks the actual signed S14,
S20 and F1 openings and their recipient views; delivered proof content is not
silently narrowed to preserve the former privacy claim.

A dishonest writer can omit an authority body and sign an incomplete
projection, or tailor projections to recipients. The destination cannot
detect that completeness lie from headers that deliberately reveal no
kind. Source members can recompute the rule and retain both signed packets
as transferable evidence. Retired writer keys can certify their historical
prefixes; source forks and database copies remain possible. None of these
limits permits the destination to skip independent authorization or effect
verification. Explicit hostile fixtures may create such signed alternate
branches, but the honest producer continues to refuse narrow audiences.

## O4: checker contract obligations

These O4 contract obligations come from the ratified checker design assessment
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:ca04cc02027b9070bb60e3852ac19e21ae7931f4`
and the builder's adoption, including the disclosure boundary,
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:42ffb3413ded6c33fb39d25296cd04ce0f005d6a`.
They specify an extension of the trusted-writer fixture. The O1 profile and
manifest checks do not establish that O4 implements them; O4 must name its
exact source, profile and manifest and satisfy the nine tests listed in
[the lifecycle manifest](manifests/ordering-lifecycle.md#o4-completeness-contract-and-required-tests).

1. **A1 — Serving-party trust.** F's own genesis names the source writer as
   trusted to certify the completeness of public openings. The certificate
   says nothing about release effectiveness. Its producer reads kinds and
   assigned audiences as a serving-party function; pure ordering does not
   establish completeness. F still reconstructs source semantics and grants
   to verify each release independently.
2. **A2 — Exact public-data rule.** For every position through the certified
   frontier, open each authority-set kind only if its assigned audience is
   `spine` or `members`. A narrower audience, including a binding ceiling,
   makes the producer refuse certification; it must neither hide that body
   nor widen its audience. Every other position retains only its header.
   Opened bodies pass the recursive banned-field check for `amount`,
   `acceptedAmount`, `counter`, `terms` and `offer_terms`. The named rule is
   `dap.fixture.scope-public-openings/1`, content id
   `sha256:475b415bbf8b16ccdb1bea078174712c57f2b2955ece9338d762abd60228bad8`,
   defined by `publicOpeningRule` in `manifests/ordering-lifecycle.ts`.
   Its 21 exact authority kinds are:

   - `ai.generalbusiness.dap.genesis`, `ai.generalbusiness.dap.accept_invite`,
     `ai.generalbusiness.dap.grant`, `ai.generalbusiness.dap.revoke`,
     `ai.generalbusiness.dap.attach`, `ai.generalbusiness.dap.close`,
     `ai.generalbusiness.dap.scope.release`, `ai.generalbusiness.dap.scope.activate`,
     `ai.generalbusiness.dap.admit`, `ai.generalbusiness.dap.seq.request`,
     `ai.generalbusiness.dap.seq.seal`, `ai.generalbusiness.dap.seq.assign`;
   - `com.example.sale.listing`, `com.example.sale.offer`,
     `com.example.sale.withdraw`, `com.example.sale.accept`, `com.example.sale.close`;
   - `com.example.scope.result`, `com.example.scope.exercise`,
     `com.example.scope.import-export`, `com.example.scope.recover`.

   `ai.generalbusiness.dap.disclose` is excluded because the rule uses assigned
   audiences, not source recipient disclosures. `ai.generalbusiness.dap.observe`
   is excluded because ambient facts are outside this fixture's release
   dependencies. A dependency needing either requires a revised rule.
3. **A3 — Exact certificate format.** A public packet has exactly
   `{genesis, initialWriter, frontier, positions, certificate}`; a position
   has `header` and optional `committed` actor-envelope bytes. The certificate
   has exactly `{body, signer, sig}`. Its body has exactly
   `{type: "dap.fixture.public-proof-completeness/1", rule, genesis, frontier, proof_hash}`.
   `rule` is the rule content id. Use `codec.ts` canonical JSON and SHA-256:
   `proof_hash` binds the packet exactly as received with only `certificate`
   omitted, including every header and included envelope. Refuse extra fields
   in the packet, positions, certificate and certificate body; run the private
   data check before hashing. The signer signs the canonical certificate body
   with Ed25519; principal and signature encodings follow the codec above.
4. **A4 — Frontier header signer.** Rebuild the writer assignment chain from
   the independently pinned genesis. The certificate signer is the key that
   verified `header[frontier].seq_sig`. At O3's assign boundary H+2 this is W0,
   the retiring writer; from the successor's first header H+3 it is W1.
   A successor cannot certify W0's earlier frontier as its writer.
5. **A5 — Genesis-pinned release boundary.** Take source genesis, initial
   writer and export prefix p from F's own genesis transition, not from the
   incoming proof. The release must be at r = p+1, and the certificate
   frontier must be at least r. Judge release effect on the source prefix
   through r, irrespective of a later certified frontier. A certificate does
   not answer current-state questions. A valid later-frontier certificate
   supplies different valid proof material for the same release; repeating
   deterministic Ed25519 signing does not.
6. **A6 — Independent destination checks.** Verify exact shapes, the header
   and ordering-control chains, certificate signature and rule identity,
   every opened actor proof and the semantic dependency pause. Reconstruct
   source packages, grants, authorization and release effect independently;
   neither a receipt nor the completeness certificate establishes effect.
   Unknown exceptions fail validation instead of becoming a refusal verdict.
7. **A7 — Remaining trust limits.** An assigned writer can sign an incomplete
   packet or tailor projections to different destinations. F cannot detect
   that dishonesty from the certificate alone; source members can compare
   against their source view and recompute the opening set, and a signed
   incomplete certificate is transferable evidence. A retired key remains
   trusted for the earlier prefixes whose headers it signed. Forks, database
   copies and equivocation remain outside this fixture's protection. The same
   signed destination genesis can also be instantiated on separate journal
   copies, each activating independently with live rights. The release binds
   one genesis identity, not one globally unique destination instance.


## O4: activation phase and unexpected failures

An authorized owner can release a live source right after ordinary `dap.close`
on that source. The current scope release semantics do not treat source
closure as a release prohibition; destination activation still checks its own
closed-context gate. This documents the existing behavior rather than adding
a new close policy.

Decision `c2982a6e6756f4fed08e5a82acc8b05a65127745` removes the earlier
uninterrupted-activation restriction. An admitted destination event can
precede the first effective activation. Failed activation and dormant exercise
consume positions without making transferred rights live. A fresh complete
activation still checks the current grant and closed-context gates, then the
transition and source prefixes pinned by F's genesis. Exact retries retain
the original receipt and verdict, including a failed attempt retried after a
later successful activation. A later activation has no further effect.

Scope's policy refusals, profile validation errors and public-proof validation
errors have explicit types. Legacy codec and Journal wire rejections are
recognized only inside the pure wire-validation boundary, using the codec's
TypeError prefix and an enumerated set of declared Journal/control reasons.
Package lookup and semantic replay occur outside that translation boundary.
An unexpected exception does not become an ordinary ineffective verdict.
Foundation `fold_error` and `audience_error` diagnostics in the scope fold
also surface as errors; ordinary attached-handler refusals remain verdicts.

Every accepted ScopeJournal append recomputes its scope state. If that fold
cannot finish, ScopeJournal closes its Journal and disables further submission,
including through the held raw Context. The original exception is preserved.
Already committed bytes remain committed. Recovery opens a fresh facade and
replays those bytes; an exact retry adds no position. A transient registry
failure can recover, while a deterministic throwing handler fails again on
cold replay. No assumed prior scope state is used to admit another event.
