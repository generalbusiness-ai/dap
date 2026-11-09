# End a hosted agent's signing custody and record its retirement

Request: `b66b8f146a9813628e0325374f551ae22d77284f`.
Promise: `0875dbf1182ef1ce98fa6119a6c2de06e3a2383b`.
Current ruling: `e2fc59d54f6e920cedd9e4efa1fc3e2033d53d70`.

Status: source and witness draft. No compiler, focused test, control, gate,
or review has run for R15. Main `6dd337d3` is the base.

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

Focused whole-owner checks, affected compiler contexts, the source seals,
one meaningful control, and one final gate remain due. The actual
`gate.exit` must decide any gate pass claim. No current source claim rests
on an R13 test result.

## Deployment

The planner deploys after exact-head review and routine landing. No new
setting, Wrangler edit, activation, or recorded migration belongs to R15.
The private retirement table starts empty. This draft establishes no
deployed behavior or live acceptance.
