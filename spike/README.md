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

## V2: interpreter, oracle, checker, Discussion

What it contains:

- `src/observe.ts`: `observe(p, state, n)`, the projection the property
  compares: the foundation's public facts, each model's own `observe` for
  the principal, and the affordances the principal holds.
- `src/interpret.ts`: the view interpreter `I(p, V(p,n), n)`: cold replay
  from genesis over the principal's view under basis `n`; hidden positions
  enter as headers and leave a placeholder; `Paused{at, reason, last}` when
  a package is unavailable or a disclosed position depends on semantics the
  principal cannot resolve, with `last` the result through the position
  before under the same basis; a cache valid only for the basis it was
  built under.
- `src/oracle.ts`: `fold(S[0..m])` over the complete series and
  `observe(p, state, n)` under basis `n`; never available to a model.
- `src/checker.ts`: for every participant and frontier, equality of the
  interpreted observation with the oracle's; the pause rule and resume;
  invariants evaluated on the oracle's state; the mutation runner's
  audience replacement.
- `src/script.ts`: a series as replayable steps; greedy shrinking to a
  minimal failing script.
- `src/generate.ts`: a seeded, bounded, affordance-driven generator that
  injects late joiners, a narrow side attach, disclosures and ineffective
  attempts.
- `fixtures/discussion.ts` and `manifests/discussion.md`: the worked
  example and its frozen manifest, with the machine-readable bounds, seeds
  and invariants in `manifests/discussion.ts`.

What the tests show:

- the sale trace 0 to 5 through the interpreter equals the oracle for
  Alice, Bob and Carol at every frontier; a late joiner and a disclosure
  keep the property;
- the views note's pause example: a disclosure followed by an unavailable
  package pauses with `last` through the position before, under the
  disclosure's basis, and resumes to equality once the package is
  supplied; a dependency-incomplete disclosure pauses;
- the Discussion manifest's deterministic checks: normal replay over
  seeds 1 to 8 with zero violations, pause and resume, the planted close
  audience fault found, shrinking to a minimal script, invalid-cache
  discard and rebuild.

What V2 does not claim:

- no models beyond Discussion and the Sale listing: Sale, Booking and Club
  are V3 to V5, and their fix counts are not measured here;
- no codec, no signatures, no durability (O1);
- the Discussion runs are harness checks, not a falsification campaign:
  the manifest says so.
