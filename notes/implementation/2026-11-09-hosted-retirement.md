# End a hosted agent's signing custody and record its retirement

Request: `b66b8f146a9813628e0325374f551ae22d77284f`.
Promise: `0875dbf1182ef1ce98fa6119a6c2de06e3a2383b`.
Current ruling: `e2fc59d54f6e920cedd9e4efa1fc3e2033d53d70`.

Status: the fifth focused unit at `65e8bd07` passed both affected compilers.
The complete 24-case owner reports 22 passed, one failed direct-act revision
check, and one pending case, with exact coverage and no unhandled errors.
The signed act now carries its exact retained sidecar; it still copied the
repository revision from the earlier accepted act. This repair reads the
current revision before signing and keeps the revoked-key assertion.
All five failed units remain failed. Four other complete owners reconcile
15 passed cases without a rerun. Production and source seals stay equal
to `172ca878`. The whole hosted-owner follow-up, meaningful control, gate,
and review remain due.

## Endpoint shutdown and the recorded end

Retire keeps the existing admin and controller authorization. Its first
storage transaction clears the bearer, deletes sessions, ends OAuth access,
sets the endpoint's retired state, and erases the signing seed. The legacy
column remains non-null and holds an empty BLOB. Loading an old retired row
also erases its remaining seed.

Cached service signers read the current row before signing. Their transport
also checks the row before dispatch, so an intent prepared earlier cannot
leave the endpoint after retirement. The cached signer retains no original
seed. Shutdown invalidates both HTTP generations before any outside work.

The endpoint never signs a revoke. An empty body, `{}`, or a body containing
one caller-signed `revoke` is valid. The signed intent must name the retiring
actor, this membership, `revoke-key`, and only `as: retired`. The first
envelope enters private storage before submission. The existing 64 KiB
control-body bound and the control budget bound its storage. The last
1 MiB of the 16 MiB control budget still admits retire alone.

The accepted enrollment custody identifies the key item. Its identity binds
the service, membership incarnation, agent key, target, and original enroll
operation. The retained signed enrollment names the invitation that opened
the key item under the supported membership pins. An unavailable or
unresolved record supplies no guessed item. A supplied revoke for another
item never reaches membership.

A complete answer requires both an observed revoked key and an erased seed.
Otherwise the answer reports pending retirement, disabled endpoint, erased
seed, and the current refusal or uncertainty. A retry checks membership
again and submits only the stored envelope while it remains valid. It never
signs another one. A later body cannot replace it. A changed body under the
same control operation still fails the existing fingerprint check.

An ordinary controller can disable the endpoint and erase the seed without
holding `membership.manage`. Its revoke remains pending. A permanent
refusal or expired envelope requires an independent revoke by an admitted
admin or recovery key. The next authorized retire retry observes that act
and completes, regardless of which request recorded it.

## Existing native meaning

No pinned definition, creation family, offer, genesis, or historical entry
changes. Self-revoke remains a candidate for a later membership revision.
The ordinary membership judge still admits or refuses the caller's revoke.
The private retirement row supplies neither authority nor a native result.

The existing lifetime of grants another scope already holds remains at
most 300 seconds. The direct-scope witness restarts that scope to make a
fresh authority read before showing the revoked key's refusal. Endpoint
shutdown takes effect before that separate native grant lifetime expires.

This filed security fix falls under [kernel section 7](../../docs/kernel.md).
It adds no kernel item or platform name. The review must cite that section.

## Validation obligations

The Native witness draft uses the production endpoint, membership, SQLite,
restart, and replay. Its clock and one failure before dispatch are explicit
TEST stand-ins. It covers exact-envelope retry after uncertainty, seed
erasure, endpoint refusal, fresh direct-scope refusal, and journal replay.
A second scene covers an ordinary controller, permanent refusal, a refused
replacement envelope, expiry, and completion after an independent admin act.

Four existing endpoint-only retire expectations and the OAuth lifecycle
expectation now require pending `202`. Their authorization, stream, session,
budget, and non-revival assertions remain. No allowance changes.

The maintained source-seal producer ran at `75d4430c`. Its hosted owner
gives `c41049c9597e2d2221066d60be526d85a50a730ad22d88ed999e124af6076956`;
the new retirement owner gives
`08e34ecbd584bde7dd196a86081f42d0be6b5e8323b7d4c565ac68fbe18ff1bb`.
After the compiler repair, the maintained producer at `faa4be6b` gives
`8707c99fe68ac3cf7af20a343f92c36b3bb81237b3681ae2a03169df5513882b`
for the helper. The hosted owner stays equal.
The inventory adopts those actual parser outputs under Hugh's standing
patch approval. All route and gate assertions remain. Producer metadata
establishes no test pass.

Focused whole-owner checks, affected compiler contexts, one meaningful
control, and one final gate remain due. The actual
`gate.exit` must decide any gate pass claim. No current source claim rests
on an R13 test result.

| Check and source | Actual result | Manifest SHA-256 |
|---|---|---|
| First focused, `40ab4e2d` | Compatibility and Node 11 passed; Scope source failed `TS2741`; remaining compilers and application tests unrun | [manifest](evidence/2026-11-09-r15-failed-source-compiler.manifest.json) `cb6df4d892e872c6b3c55534b3e8dc2e023d1590f46289af65c8263e9fa59703` |
| Decoder follow-up, `172ca878` | Node 11 and three compilers passed. Body exit 1: 39 collected, 37 passed, one failed witness and one pending. Original static ledger also failed. Qualified reconciliation: four complete passed owners, 15 cases | [manifest](evidence/2026-11-09-r15-failed-revoke-witness.manifest.json) `a0c4bfee5e081f0e218c5b02284a4ceb9954e098a2bafb908e45d6de4923d8dd` |
| Final-key probe, `58d65173` | Both affected compilers passed. Body exit 1: 22 passed, one probe failure, one pending; exact 24-case ledger, no unhandled errors. Retire itself completed before the probe failed | [manifest](evidence/2026-11-09-r15-failed-final-key-probe.manifest.json) `7e629696462d4d65151505445ab9c3f6a3911802ea0e2596637885a09f5fe704` |
| Direct sidecar, `5fd0601b` | Both affected compilers passed. Body exit 1: 22 passed, one direct-act field refusal, one pending; exact ledger and no unhandled errors. Missing original sidecar stopped the witness before authority | [manifest](evidence/2026-11-09-r15-failed-direct-sidecar.manifest.json) `a36f1ec12fbae56f64ac34a2b9f3f248e620d4a612d146910b5b7846f42cbb62` |
| Direct revision, `65e8bd07` | Both affected compilers passed. Body exit 1: 22 passed, one stale expected revision, one pending; exact ledger, no unhandled errors. The field-complete act stopped before authority | [manifest](evidence/2026-11-09-r15-failed-direct-revision.manifest.json) `c5ead18b8bc7a6c4959c7b337b4e4229fde3bf7d8644fa63f1fa1bbc1f7bbcf1` |

## Deployment

The planner deploys after exact-head review and routine landing. No new
setting, Wrangler edit, activation, or recorded migration belongs to R15.
The private retirement table starts empty. This draft establishes no
deployed behavior or live acceptance.
