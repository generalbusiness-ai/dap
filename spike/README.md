# dap spike harness

Fixture code for the two spikes in [the spike plan](../notes/2026-09-15-spike-plan.md).
This is an experiment, not a product. Each task's README section says
what that task does and does not claim.

## Running

Node 24 or later (developed on 26.8). TypeScript runs directly through
Node's type stripping; no build step.

```sh
cd spike
npm install          # typescript and @types/node, for the type check only
npm test             # node --test over test/**/*.test.ts
npm run typecheck    # tsc --noEmit
```

## V1: foundation fixture and append operation

What it contains:

- `src/canon.ts`: RFC 8785 canonical JSON, `sha256:` content ids, nonces.
- `src/descriptor.ts`: flat package descriptors identified by the content
  of their module source, their functions' text, their explicit `config`
  and their kinds' schemas; a model's functions may depend only on their
  arguments, their config and the pinned module; attach with ambiguity,
  namespace, id-mismatch and model-name-conflict refusal, installed
  descriptors frozen, contracts retained on resolution so a handler never
  widens an audience; the per-kind expected-binding identity.
- `src/foundation.ts`: the fixed foundation F0: the system kinds with their
  audiences (`spine`, `members`, named sets) and required capabilities; the
  fold for genesis, attach, invite, accept_invite, grant, revoke, disclose,
  observe and close; authority judged from the grant history at a position;
  member-side verification of the invite envelope embedded in an
  acceptance; the origin contract; visibility of a position to a principal
  under a basis.
- `src/append.ts`: the one append operation for every backend: stable
  facts, exact-retry lookup with changed-content refusal, then admission
  (transport credential or one-use invitation), then the header and one
  write. Committed data is snapshotted and frozen, so a caller's later
  mutation cannot change what was committed. `MemoryBackend` supplies
  storage and a serialization boundary.
- `src/context.ts`: a context: genesis adopting origins, submission through
  the append operation, the full-series fold, `V(p, n)` with headers for
  hidden positions, hidden counts.
- `fixtures/sale.ts`: the Sale package as far as V1 needs it: the listing
  origin rule, the Seller and Buyer roles, and the kinds of the split offer
  declared so their binding identities exist. The offer folds are V3's.

What the tests show:

- invitation cases: authorized issue, issuer revoked, then redeemed is
  effective; an unissued token, an unauthorized issuer's token and a wrong
  invitee are refused; an exact retry of a committed acceptance returns its
  receipt after the token was consumed; changed content and reuse are
  refused;
- origin cases: duplicate adoption is a genesis error; an unresolved kind is
  an inert unhandled verdict; an origin binds no expected binding; the
  origin actor needs no grant;
- descriptors: namespace refusal, ambiguity refusal, resolution, per-kind
  binding identity locality, `stale_binding`;
- the append operation: stable facts first, credential and participation,
  dense positions, predecessor hashes, re-entrancy;
- the sale trace, positions 0 to 5, with the audiences of the views note
  and the views of Alice, Bob and Carol from the narrative; a late joiner's
  bootstrap entitlement; disclosure and an as-of query;
- regressions for checker's reviews (workroom reports `d74d2ac5` and
  `d2417ad5`): the one-use token is the invite entry's content id, not the
  inviter's `token_id` label; admission and members verify the same
  embedded issuance object from headers and the spine grant history alone,
  so a member who never saw the private invitation verifies it too, and a
  tampered envelope supplies nothing; observe may narrow only to current
  members; captured values must live in config; installed descriptors are
  frozen; a second definition under a model name in use is refused; attachment
  ceilings and observe narrowing; identities follow executable content; a
  foreign-context intent or a system kind cannot be an origin; an
  application intent captures its binding by default and a missing one is
  refused; committed entries are immutable snapshots; a malformed system
  payload is an ineffective verdict readable only by its actor; close
  leaves foundation administration open.

What V1 does not claim:

- no durability: the backend is memory, and the durability promise is O1's;
- no codec: entries are verified inputs, the actor field is trusted, there
  are no signatures and no sequencer signature (spike plan §1, staged
  checker; §2.1 is O1's);
- no semantic models beyond the listing origin: the interpreter, oracle
  and checker are V2, the models V3 to V5;
- no scope transfer or sequencing control: `dap.admit`, `dap.scope.*` and
  `dap.seq.*` are known kinds that fold to `not_in_v1`;
- no foundation upgrade.
