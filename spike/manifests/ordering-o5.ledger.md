# O5 isolated ordering-control verifier

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:8c67d385336192e5f19e60b4b9a82eeec1519d36`.
Base: O2 final `b6d156163285c8eaab3d05766dd9b0de35fef79b`.
Branch: `request/o5-control-verifier`.

## Declared checks and independence

The verifier was written from ordering §§3, 5, 6 and 9, design invariant 19,
and the agreed v2 wire schema. It neither reads nor calls O3's transition
algorithm. Its only local imports are the canonical codec, JSON/hash
constants and shared data types. It has no journal, append, application
package, participation or grant dependency. O3 and O5 share the Ed25519
codec; this is independent control logic, not an independent cryptographic
implementation.

Inputs are an independently pinned genesis commitment, its signed wire
entry, every signed `dap.seq.*` entry, and signed headers for every other
position. Ordinary openings are rejected by the API. A subprocess test copies
only the verifier and its three allowed modules to a temporary directory and
runs it with Node filesystem permissions restricted to that directory. The
subprocess receives only a proof through stdin; application packages, payloads
and grant folds are absent.

The v2 genesis has exact sequencing fields `profile`, `writer`, `control`.
The control key is independent of every writer. Both seal and assign actors
are the genesis control key. Both headers are signed by the retiring writer.
Seal carries the current epoch and prior entry commitment; assign carries
the next epoch, immediate seal commitment and a new writer key. Header `prev`
separately binds the prior header hash. Only assign may follow a visible seal.
The successor begins at the position after assignment. Positions never reset,
control/profile do not rotate, and no used writer key can be revived. v1 keeps
its fixed writer; requests in either profile do not install an assignment.

The fixture generator uses only deterministic test keys and the shared codec.
Expected accept/refuse results are declared explicitly before measurement;
it does not derive them from either control algorithm. The committed proof
file retains exact signatures and bytes for valid handovers, interruption,
two nominations, wrong authority, forged proofs, skipped positions/epochs,
commitment/header-hash swaps, request-as-authority, old-writer continuation,
extra fields, key reuse, and competing assignments. Two otherwise valid
histories with conflicting signed heads are compared to retain both proofs.
The verifier does not choose a winning branch.

## Completeness and other limits

**Acceptance assumes that every control opening was supplied.** The opaque
header has no event kind, so it cannot establish this completeness by itself.
A retained counterexample presents identical signed headers twice: a visible
seal followed by an old-writer entry is rejected; hiding that seal opening
makes both headers look ordinary and is accepted. Missing controls can also
be exposed by an unauthorized successor signature, but that does not detect
all malicious omission. Comparing actual conflicting signed heads supplies
evidence of equivocation; it does not supply Byzantine tolerance, complete
omission detection, availability, freshness or a fork choice.

The verifier checks ordering authority only. It does not evaluate request
capabilities, application effects, audience correctness, envelope admission,
retry persistence, transfer proofs or journal durability. An authentic
request from an actor without a grant is harmless to assignment verification;
its application authorization is a separate question. Exact network retries
are deduplicated before constructing a dense history; a repeated receipt is
not a new committed position.

## Measurements

Pending source freeze and focused validation. Final O3 integration and an
independent checker review remain completion gates.
