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
  compares: the foundation's public facts, the outcome of every event the
  principal can see, the binding identity of every kind they can resolve,
  each model's own `observe` for the principal, and the affordances the
  principal holds. A package is in the projection only if the principal
  can see the attach that installed it.
- `src/interpret.ts`: the view interpreter `I(p, V(p,n), n)`: cold replay
  from genesis over the principal's view under basis `n`; hidden positions
  enter as headers and leave a placeholder; `Paused{at, reason, last}` when
  a package is unavailable or a disclosed position depends on semantics the
  principal cannot resolve, with `last` the result through the position
  before under the same basis; a cache keyed by principal, context, view
  content, basis and available packages, which never reuses a pause.
  Disclosure completeness is checked by the recipient, from evidence the
  sequencer puts in the header. The header names positions, never
  packages:
  - `activation`, on an application event: the attach (or genesis) that
    produced the binding the event was judged under at its own position;
  - `requires`, on an attach: every installed fact the attach consulted,
    whether it was then accepted or refused: an earlier installation of
    the same package, the installers of models already defined under
    names it defines, the installers of the models its handlers name,
    and the attach that produced the current binding of each kind it
    rebinds;
  - the pause rule: a disclosed event whose activation is hidden, or a
    disclosed attach with a hidden requirement, pauses with
    `dependency_missing`; an attach the sequencer resolved pauses with
    `package_unavailable` until the viewer's client has its package, and
    one the sequencer could not resolve (no `requires` in its header) is
    an ineffective attempt for every judge, whatever their client can
    fetch then or later, enforced by the common fold from the header; an
    event or attach whose evidence is all visible is judged,
    and its verdict, effective, `stale_binding` or a refused attach, is
    the genuine one.
  The chain closes by induction: a visible requirement was judged when
  it was reached with its own requirements checked the same way, so a
  view that sees an event's evidence resolves the binding the sequencer
  did. The intent's own `expected_binding` and `expected_activation`
  are preserved as what the author saw and cannot serve as evidence: a
  hidden attach between composing and sequencing changes the verdict.
- `src/oracle.ts`: `fold(S[0..m])` over the complete series and
  `observe(p, state, n)` under basis `n`; never available to a model.
- `src/checker.ts`: for every participant and frontier, equality of the
  interpreted observation with the oracle's; the pause rule and resume;
  invariants evaluated on the oracle's state; the mutation runner's
  audience replacement.
- `src/script.ts`: a series as replayable steps; greedy deletion to a
  deletion-minimal failing script.
- `src/generate.ts`: a seeded, bounded, affordance-driven generator that
  injects late joiners, a narrow side attach, disclosures and ineffective
  attempts.
- `fixtures/discussion.ts` and `manifests/discussion.md`: the worked
  example and its frozen manifest, with the machine-readable bounds, seeds
  and invariants in `manifests/discussion.ts`. The manifest identity binds
  the prose, the executable part and the package; the test run prints it
  as a diagnostic, and a report cites that value.

What the tests show:

- the sale trace 0 to 5 through the interpreter equals the oracle for
  Alice, Bob and Carol at every frontier; a late joiner and a disclosure
  keep the property;
- the views note's pause example: a disclosure followed by an unavailable
  package pauses with `last` through the position before, under the
  disclosure's basis, and resumes to equality once the package is
  supplied; a dependency-incomplete disclosure pauses, including one
  whose binding was restored by an attach the recipient has not seen,
  while a visible but superseded activation is stale, not paused;
- the Discussion manifest's deterministic checks: normal replay over
  seeds 1 to 8 with zero violations, pause and resume, the planted close
  audience fault found, shrinking to a deletion-minimal script,
  invalid-cache discard and rebuild, and literal expected observations
  derived from the events and membership alone, which a wrong projection
  fails although it passes the equality check;
- a contradiction that changes no displayed state is caught through
  outcomes: a narrow attach that changes a shared kind makes a member who
  cannot see it judge the next event stale while the oracle says
  effective.

What V2 does not claim:

- no models beyond Discussion and the Sale listing: Sale, Booking and Club
  are V3 to V5, and their fix counts are not measured here;
- no codec, no signatures, no durability (O1);
- the Discussion runs are harness checks, not a falsification campaign:
  the manifest says so.

## V3: Sale by agent

Measured result first: the agent-authored Sale model needed **7 fixes,
6 of them semantic, 0 added kinds, against a budget of 2 fixes and 1
kind: budget exceeded** ([repair ledger](manifests/sale.ledger.md#result)). The
final model passes the views note's trace under a declared join
disclosure, the predeclared cases, checker's reproduced
counterexamples, the run-1 and run-6 corpora, and 200 of 200 seeds with zero
violations of the property, the pause rule, the invariants and a
privacy budget checked on what each participant can actually read.

Assumptions the result rests on: the fixture's disclosing client (the
creator's) honours the model's declared join disclosure and disclosure
policy, emitting ordinary `dap.disclose` events; who checks completeness
in production stays open (design §8). The manifest has four post-baseline
revisions (the counter payload and generator corrections; the readable
events budget; its required view argument; effective-stub resolution).
The ledger identifies every revision and every run cites its identity.
Passing an empty view still selects the historical projection-only
budget, which the run-1 corpus test and shrink script do deliberately.

Run 6 exposed 11 private counter misdeliveries in nine seeds that the old
guard missed. All nine failing series are preserved. Fix 7 changes the
counter audience to read the seller and effective offerer from preceding
public Sale state; a supplied `author` cannot add a recipient, including
on a refused attempt. The generator and privacy budget stay unchanged.

Campaign coverage includes no private disclosures and no Inspection
package attachments: its 120 inspection requests are unbound attempts.
The hand-written trace and malformed-payload regression exercise the
attached Inspection package. The campaign therefore checks private
audience delivery but does not measure Inspection behavior or hostile
private disclosure; the targeted regressions check those cases.

The trace, original and repaired:

| Case | Positions | Result |
|---|---|---|
| The views note's trace as drawn | 0 to 19 | 5 violations; the first at Ivan@15: o3 replacing the hidden o1 is effective for the oracle and `no_such_offer` for Ivan (`joinDisclosure: false` in the test; count, first position and refusal are asserted) |
| The trace under the declared join disclosure | 0 to 20, Ivan's backlog at 14 | reproduces the table with every later position shifted by one; the literal projections at 20; 17 effective, 18 `already_decided` for every participant |
| Case 2, hidden predecessor, as drawn | | 3 violations, first at Ivan@15 |
| Case 2 under the declared disclosure | | Ivan reads o1 and sees o3 open replacing it; the accept of o1 is ineffective for everyone |

What it contains:

- `manifests/sale.md` and `manifests/sale.ts`: the Sale experiment
  manifest: the predeclared split schema, promises, privacy budget,
  projection shape, reason vocabulary, budget, bounds of 6 participants,
  60 positions and seeds 1 to 200, the views note trace as a script with
  its readability and literal projections, the late-joiner and hidden
  predecessor cases, invariants over recorded events and verdicts, and
  the privacy budget over readable events (each private event's parties
  derived from recorded facts) and observations. The manifest identity
  binds the prose and the executable part; the package under test is
  cited beside it.
- `fixtures/sale.ts`: the Sale model, authored by an agent under spike
  plan §4.5 with no test or checker access before the baseline, then
  repaired from checker-run findings; the ledger attributes each change.
  `fixtures/inspection.ts` is the harness-provided mid-stream attach.
- `manifests/sale.ledger.md`: the repair ledger: baseline, corrections
  and how they are counted, experiment revisions, every checker run,
  every fix with its discovery source and counterexample, the result.
- `corpus/sale/run1/`: the 17 failing series of run 1, shrunk to
  deletion-minimal scripts and kept with the run-1 model; the corpus
  test replays them against that model and the current one.
- `corpus/sale/run6/`: all nine newly exposed failing series, kept with
  their model. Tests reproduce each recorded privacy finding, verify
  every single-step deletion removes it, and require clean results under
  the repaired audience.
- `scripts/sale-campaign.ts` (failures by signature) and
  `scripts/sale-shrink.ts` (the corpus).
- Harness additions: the generator steps one live context, gives payload
  builders the state and entries, weights affordances, honours a
  declared join disclosure after each join and a declared disclosure
  policy when it discloses; the checker takes a privacy budget over the
  readable view and the observation, and gives invariants the entries;
  an audience rule that throws rolls back model effects and is recorded
  as an ineffective, actor-only event. `AudienceCtx.modelState(id)` reads
  frozen preceding state from the local fold, limited to the active
  audience declaration's original handlers; that scope is retained on
  attach and included in binding identity. An application kind with no
  binding is readable by its actor
  alone; `describeViolation` names the differing paths; a corpus module.

What V3 does not claim: the join disclosure and disclosure policy are
fixture policies of the creator's client, and an authorized hostile
client can still disclose private events outside that policy; the budget
reports those violations. Booking and Club are V4 and V5; the mutation
runner across models and the report are V6.

## V4: Booking by agent

Measured result first: the agent-authored Booking model passed every
predeclared case and 200 of 200 seeds on its untouched baseline, and
needed **1 fix, 0 added kinds, within the budget** of 2 and 1: a
disclosure policy naming the public kinds for the fixture's disclosing
client to honour, once the privacy budget was checked on what a
participant can read (checker's V3-F1). The baseline itself declared a
join disclosure of occupancies, frees and clock ticks as a design
choice, citing the Sale ledger's late-joiner finding, so the
cross-view case of spike plan §4.1 passed without repair.

What it contains:

- `manifests/booking.md` and `manifests/booking.ts`: the Booking
  experiment manifest, frozen before the baseline: the split schema of
  spike plan §4.1 with a booker-and-admin audience, promises, privacy
  budget, projection shape, reason vocabulary, budget, bounds, the clock
  actor joined by a prelude, invariants over recorded events and
  verdicts including expiry by the clock, the privacy budget over
  readable events and observations (amended after run 1; the revision
  is identified in the ledger), and the generator's payload builders
  with clock ticks.
- `fixtures/booking.ts`: the Booking model, authored by an agent under
  spike plan §4.5 with no test or checker access before the baseline.
- `manifests/booking.ledger.md`: the repair ledger.
- `corpus/booking/run2/`: all 139 privacy failures recovered from the
  run-2 model and generator, shrunk and committed in run 5. The corpus
  README distinguishes recovered traces from the original event bytes.
- Harness additions: the fold context carries the event's content id (a
  booking id); a model may opt in to ambient `dap.observe` facts with
  `ambient: true`; the generator takes a prelude of fixed steps.

What the tests show: the six predeclared cases (two requests for one
slot, free exactly one, duplicate publication, only the admin publishes,
expiry, the cross-view case) and the 200-seed campaign pass; the ledger's
totals agree with its entries. Campaign coverage requires effective
cancels and occupancies linked to real requests. The recovered corpus
test checks every privacy failure and its deletion-minimality; literal
private disclosures remain budget violations under the repaired model,
whose disclosure policy constrains the fixture's client.

What V4 does not claim: one room and integer ticks only; the clock is a
fixture actor driven by the generator; a cancel naming a different admin
than its request is a known limit of the predeclared schema, recorded in
the ledger and not exercised by the corpus; Club is V5 and the report V6.
