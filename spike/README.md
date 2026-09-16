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

The Booking campaign requires **2 model-policy fixes, 0 added kinds,
within the budget**, and a separate foundation authorization repair.
The one-room fixture uses integer clock ticks and clients that honour
its disclosure policy. Authorized hostile clients can still publish
private fields or disclose private events; the budget detects these
violations, and the tests preserve them as limits of the result.

The baseline's projection-only guard passed 200 seeds. A readable-event
guard then exposed 139 failing seeds, repaired by declaring the public
kinds clients may disclose (fix 1). Checker's V4-F1/F2 review found that
public event actors, request-id links and extra private fields were
still unchecked. The revised guard exposed 99 failing seeds before
repair. The foundation now keeps application and clock attempts
actor-only when the actor lacks the required capability, while
preserving authorized overlap and duplicate refusals. Booking's client
also requires an authorized verdict before disclosure (fix 2).

What it contains:

- `manifests/booking.md` and `manifests/booking.ts`: the experiment
  manifest, based on the plan's split schema with explicit `admin`
  payload fields added at freeze; promises, privacy budget, bounds,
  invariants and generator payloads. Each later guard amendment is a
  new manifest identity recorded in the ledger.
- `fixtures/booking.ts`: the agent-authored model and its declared
  public-history and disclosure policies.
- `manifests/booking.ledger.md`: all runs, fixes, evidence corrections,
  identities, and the effect of the seeded-nonce change on Sale's seeds.
- `corpus/booking/run2/`: all 139 recovered privacy failures, minimized
  and kept with the old guard and model; the reconstruction limit is
  explicit.
- `corpus/booking/run7/`: all 99 new failing series, complete and
  minimized, with the exact pre-repair foundation snapshot pinned.
- The six predeclared cases, seed-1 actor/link regression, public-payload
  regressions, authority and replay checks, and the 200-seed campaign.
  Coverage requires effective cancels and occupancies linked to earlier
  effective requests.

The baseline already declared disclosure of occupancies, frees and
clock ticks to new members, so the cross-view case passed without a
model repair. That required history remains available. Authorized
stale/closed attempts retain their declared audience; the fixture's
client conservatively excludes their non-authorized verdicts from
additional disclosure. Other system and spine event audiences are
unchanged.

The result does not cover multi-room routing, a real clock source,
closed-schema admission, arbitrary hostile data encodings, or a cancel
naming a different admin than its request. The latter remains a known
schema limitation. Club is V5; the combined measurement and falsification
verdict are V6.

## V5: Club by agent

V5 is **incomplete against spike plan §4.2**. The frozen manifest omitted
its condition that an admitted applicant must not already hold Member.
Validation run 3 records two applications by Dana, first admission and
Member grant, then a second effective admission. Every view agrees, so
the narrower manifest's consistency checks pass while the plan's policy
fails. Enforcing the omitted condition needs additional public evidence
or a changed trust/schema contract, hence a revised experiment; the
existing result below does not establish the full plan's promise. A5 also
allows votes and admissions naming events that are not effective
applications; both predicates need the revised experiment. A2's dedicated
ordinary-member cases were missing from the frozen manifest and original
tests. They are now post-baseline tests; their manifest predeclaration
remains pending that revision. The two-application policy test asserts
rejection and is a failing TODO, not a passing test for broken behavior.

Measured result first: the agent-authored Club model needed **1 fix, 0
added kinds, within the budget** of 4 fixes and 2 kinds over its two
constraints (quorum and standing). The baseline passed three of the four
frozen-manifest cases and 197 of 200 seeds after the replay-nonce
repair. The baseline header predicted disagreement about a committee
member granted after an application and voting before disclosure. Some
readers judged the vote effective while the oracle said
`unknown_application`, because they could not tie the application id to
a position. In case 4 the late voter's own view diverged; the failing
campaign also included Dana's and Erin's views of Frank's vote and Dana's
view of Erin's vote. The fix
reads the chain's public commitments: the fold context now offers
`commitmentAt(position)` (the header's commitment at any earlier
position, hidden or not) and `holdersAt(capability, position)`, and the
vote rule judges every late member's vote the same way for every
reader. The author chose that over a stub kind because the commitment
already is the public fact the design relies on to verify hidden
positions; the ledger records the reasoning.

Assumptions the result rests on: disclosure acts are visible to every
member (positions and recipients, never payloads), so a vote's
precondition is judgeable by everyone; the fixture's client honours the
model's declared join disclosure, disclosure policy (applications only
to holders of `vote`) and the grant effect that gives an admitted
applicant Member; the committee is whoever holds `vote`, asked of the
audience and fold contexts (role-derived audiences).

What it contains: `manifests/club.md` and `manifests/club.ts` (the
frozen manifest: the narrower policy and promises, the privacy budget on
readable events and observations with the committee derived from grants,
projection shape, reason vocabulary, budget, bounds, the committee joined
by a prelude, invariants including the disclosure-before-vote rule and
the Member grant after an admit, the generator's builders with late
committee grants); `fixtures/club.ts` (the model, authored under spike
plan §4.5); `manifests/club.ledger.md`. Harness additions for V5:
role-derived audiences, members-visible disclosure acts, ambient
disclosures, declared grant effects, disclosure policies bound to
capability holders, the fold's public chain facts, and reproducible
content ids in generated series (a generator defect found by this
campaign; Booking was revalidated under it).

What the tests show: the four frozen-manifest cases derived from §4.2
(quorum with the Member grant, no quorum and no majority, lapsed and
already voted, the late committee member before and after disclosure) and the 200-seed
campaign pass; the ledger's totals agree with its entries. Validation run
3 also exercises Club payload disclosure before and after activation
disclosure, the dependency-incomplete pause and resumption, and confirms
that a later activation preserves an earlier application. The three
recorded baseline failures are reconstructed and shrunk to seven linked
steps each under `corpus/club/run1/`, fail on the preserved baseline and
pass on the repaired model. The ledger identifies the missing historical
run-1 snapshot; later reconstruction does not cure that protocol gap.
Validation run 4 adds explicit ordinary-member checks for the private
application disclosure and the admission's public Member grant. It also
corrects the baseline prediction provenance and records the shared
`dap.disclose` audience change at `57aad39`.

The scope is one application type, a three-member initial committee and
one quorum rule. The ledger records further limitations: incomplete
model-level disclosure dependencies can cause mismatches instead of a
pause; extra payload fields are not refused; revocation can produce a
privacy-budget false positive; votes after admission are allowed. The
fixture requires its full join-disclosure and grant-effect policy. The
mutation runner across models and the final report are V6.

## V6: integrated mutations and binding checks

The integrated harness retains V3's audience reads and rollback, V4's
unauthorized audience and disclosure guard, and V5's role-derived
audiences, public chain facts and grant effects. Its full run at
`1db4d6f` passes all three 200-seed campaigns. A historical Club corpus
assertion initially failed because V3's binding contract changes event
ids; the recorded failure still reproduces. The original corpus passes
literally at `772a514`, and the integrated test now checks the correctly
linked id and the same semantic finding. The follow-up at `742e64a`
passes 126 noncampaign tests with zero ordinary failures and retains one
executing, failing Club acceptance TODO.

`test/v6.test.ts` detects one deliberately narrowed audience in each
model: Sale `offer`, Booking `occupancy` and Club `standing`. It also
detects a hidden spine revocation without changing the recorded history.
Every fault has a clean control and a committed deletion-minimal trace
under `corpus/v6/run2/`. For each model, an unrelated private attach
preserves a saved shared intent; a relevant visible binding change makes
an earlier intent `stale_binding` for every reader, and a fresh intent
succeeds. These checks introduce no model repair or new kind.

`manifests/v6.ledger.md` and `evidence/v6/` retain exact snapshots, commands,
logs, machine-readable cases and measured campaign coverage. The final
report must assess these bounded results alongside the existing repair
budgets, protocol gaps and negative Club result; passing consistency does
not establish the omitted admission predicate.

## O1: signed codec and durable journal

[The sequencing profile](ordering-profile.md) pins exact wire encoding,
writer trust, a 65,536-byte envelope limit, and process-crash durability on
intact local storage. `src/journal.ts` verifies signed envelopes before the
existing append operation; `src/sqlite.ts` supplies the exclusive writer
lock and atomic entry/head/retry/consumption/outbox write. Publication waits
for delivery confirmation and resumes with saved bytes after a crash.

The codec has fixed positive/rejection vectors, including signed dependency
evidence. Real V1 Sale and invitation traces run through verified bytes and
SQLite. The crash harness kills separate Node processes at named transaction
and publication boundaries. Legacy visibility fixtures retain their existing
API and body identifiers; the signed journal uses envelope commitments.

[The lifecycle manifest](manifests/ordering-lifecycle.md) fixes the expected
owners and outcomes for later O4 execution. Its tests validate the
specification, not transfer runtime behavior. O1 does not claim O2–O6,
replication, power-loss durability, or automatic failover.

Focused validation:

```sh
node --test test/codec.test.ts test/journal.test.ts test/ordering-lifecycle.test.ts
npm run typecheck
```

The committed [O1 validation record](manifests/ordering-o1.ledger.md) records
its source snapshot and full integration run separately from the historical
visibility ledgers.
