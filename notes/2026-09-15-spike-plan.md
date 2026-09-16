---
date: 2026-09-15
status: >-
  implementation-design plan for the two dap spikes, written against the
  outline landed at 0fb712b. Makes every fixture decision the outline left to
  the spikes, writes out the predeclarations the views note requires, and
  breaks the work into reviewable tasks. Revised after checker's review
  a1cf99a3: signed objects and preimages pinned, invitation authority pinned,
  outbox added, the privacy budgets restored to the landed limits, Club policy
  and the transfer lifecycle fixed. Adopts nothing for production; every
  choice here is a fixture choice and says what it does not claim.
design: notes/2026-09-14-evolving-spaces-design.md
views: notes/2026-09-14-one-series-many-views.md
ordering: notes/2026-09-14-ordering.md
narrative: notes/2026-09-15-sale-as-experienced.md
---

# Spike plan: what to build, in what order, and what each step must show

## 1. Order and rationale

The visibility spike runs first. It tests the central hypothesis, that the
view-consistency property holds for realistic models without collapsing
visibility and at a small authoring cost (views note, *What the spike
tests*). If that fails, the ordering work is still useful but the "one room,
many threads" design is not.

The ordering spike runs second, on the same fixed foundation and the same
bootstrap, so that the two results compose as the ordering note §9 requires.
The visibility harness's in-memory sequencer and the ordering spike's durable
journal implement one sequencer interface; the ordering spike swaps the
implementation and reuses the foundation, the Sale model and the trace.

Both spikes report against the goal criteria of design note §0. Goal 1 and
goal 2 are measured by the visibility spike, goal 4 by the ordering spike,
and goal 3 by inspection of the narrative only.

## 2. Fixture decisions

Each row is a decision, with the reason and what it does not claim. Every
decision may be revisited for production; none of them is the runtime
profile of design note §2, which remains open.

| Decision | Choice | Why | Does not claim |
|---|---|---|---|
| Language and runtime | TypeScript on Node 24, one package under `spike/`, no framework, built-in test runner | Models as ordinary functions (views note); Atseq's folder is the nearest precedent and is TypeScript, so comparisons are direct; agents author TypeScript well (goal 2) | Portability, a declarative fold language, or the production runtime profile |
| Content id | `sha256:<hex>` over RFC 8785 canonical JSON | One deterministic serialization; every artifact, package, kind and event has an id by content (design §7) | Any particular production hash or encoding |
| Signatures and principals | Ed25519 through `node:crypto`; a principal is a public key; a context-scoped key per participant per context | Cheap, standard, no key infrastructure (design §8) | Identity resolution, recovery of lost keys, or anonymity beyond a fresh key |
| Signed objects | Defined exactly in §2.1 below: event body, actor envelope, committed bytes, header preimage, header hash, sequencer signature, genesis identity, position-0 predecessor | Two implementers must produce identical bytes and identical verdicts | Any production encoding |
| Event body | Canonical JSON with `kind`, `payload`, `actor`, `nonce` (16 random bytes), `genesis` and `action_id` for sequenced intents, `expected_binding` for application intents; origins and the genesis event carry no `genesis` or `expected_binding` (design §2, origin contract) | The nonce makes a payload commitment unguessable for low-entropy payloads without any per-field machinery (views note, *Serving a view*) | Per-field commitments or encryption |
| Authenticated header | The preimage `{genesis, position, prev, commitment}` plus `seq_sig`; §2.1 gives the preimage and the hash | Hidden positions verify in the chain without payloads and reveal no kind, actor or audience (views note, *Serving a view*; ordering §5) | Freshness, complete delivery, or hiding the count of positions |
| Wire format for the ordering fixture | An entry is the header plus the committed bytes; the export and transfer encoding is one entry per line as canonical JSON; the authoritative journal is SQLite (below), never the line file | Fixes the format the ordering note §5 left undecided, for this fixture only | The production header format |
| Fixed foundation `F0` | The system kinds of design §2 with their audiences (`spine`, `members`, named sets), the bootstrap entitlement, the invitation token, the origin contract, the namespace check; content id pinned in every genesis; no successor foundation | Both spikes need one foundation; upgrades are deferred (design §2, foundation lineage) | Foundation evolution |
| Invitation token and authority | The token is the `dap.invite` event's own committed bytes: `{genesis, invitee, grants, token_id}` signed by the inviter. `dap.accept_invite` embeds that envelope and its authenticated header. A member verifies: the header is in the chain at its position; the issuer held `dap.invite` at that position, from the spine grant history; the `token_id` is unconsumed. **Authority is judged at issuance.** A revocation of the issuer after issuance does not invalidate an issued token; a token whose header is not in the chain, or whose issuer lacked `dap.invite` at that position, is refused | Members verify a newcomer's grants from the acceptance alone (design §2, grant evidence), and the verdict does not depend on when the acceptance arrives | Revocable invitations; the redeemed invite's payload stays private (embedding it in a spine event publishes it at redemption; an unredeemed invitation stays private) |
| Runtime profile id | `dap.fixture.ts/1`: models are TypeScript functions `fold(state, event, env) -> state`, `audience(state, event) -> set`, `observe(p, state, n) -> projection`, `affordances(p, state) -> constructors`, `invariants(state) -> violations` | The views note allows ordinary functions with declarative folds as a separate step | Determinism across machines beyond what the test corpus shows |
| In-memory sequencer | Single process; dense positions; retry index by `action_id`; returns a header per append; admission after retry recovery as in ordering §3 | The visibility spike needs order, not durability | Durability, crash recovery, or concurrency across processes |
| Durable journal | SQLite through `node:sqlite`, one file per context, an exclusive lock per journal, the sole authoritative store; one transaction per append writes the entry, the head, the retry record, any invitation consumption, and an **outbox row** for the pending publication | The ordering note §3 wants one durable transaction, a conditional append and a resumable publication; SQLite gives all three with no external service (goal 4) | Survival of host or disk loss; only survival of process crash and restart on the same disk |
| Publication recovery | On restart the writer replays every outbox row not marked delivered; delivery is idempotent by header hash; a delivered row is marked in its own transaction after the subscriber acknowledges | Ordering §3 step 7: a crash before notification resumes the saved publication and creates no second order | Exactly-once delivery to subscribers; duplicates are possible and harmless |
| Durability promise | An acknowledged append survives process crash and restart on the same disk, under `PRAGMA synchronous=FULL` | Stated so the crash schedule tests exactly this (ordering §9) | Anything a mirror or replica would add |
| Serving party | The same process as the sequencer, running the foundation fold to evaluate audiences and issue transport credentials | The first trusted profile (design §2) | Any separation of sequencer and serving party |
| Clock and randomness | A designated `clock` actor holding `dap.observe`, driven by the generator; no wall-clock reads inside any fold | Views note cliff 4 | A real time source |

### 2.1 Signed objects and preimages

All serialization is RFC 8785 canonical JSON; `bytes(x)` is that
serialization; `sha256(x)` is `sha256:<hex>` over `bytes(x)`.

| Object | Definition |
|---|---|
| Event body `E` | `{kind, payload, actor, nonce, genesis?, action_id?, expected_binding?}` as in the table above |
| Actor envelope `SE` | `{body: E, sig}` where `sig` is Ed25519 by `E.actor` over `bytes(E)`; `sig` is not part of its own input |
| Committed bytes | `bytes(SE)`; this is what the journal stores and what an audience receives |
| Commitment | `sha256(SE)` |
| Genesis identity | the commitment of the `dap.genesis` event's envelope; the genesis body does not contain it |
| Header preimage `HP` | `{genesis, position, prev, commitment}` |
| Header hash | `sha256(HP)` |
| Sequencer signature | Ed25519 by the assignment's key over `bytes(HP)`; not part of the preimage |
| Header | `{...HP, seq_sig}` |
| Position 0 | `genesis` is the genesis identity, `prev` is `sha256:` followed by 64 zeros, `commitment` is the genesis identity |
| Predecessor | `prev` at position `n` is the header hash at `n-1` |

V1 and O1 commit fixed vectors: for each object above, a positive vector
with the exact bytes and hash, and negative vectors for a tampered body, a
signature over the wrong bytes, a wrong `prev`, a wrong `commitment`, and a
sequencer signature by a key the profile does not name.

## 3. Components of the visibility harness

| Component | Responsibility | Satisfies |
|---|---|---|
| Kernel | Append, retry index, headers, positions; the sequencer interface both spikes implement | ordering §3 steps 1 to 7 |
| Foundation fold | Participation, grants, revocations, attach and binding resolution, invitation issue and redemption, disclosure, close; the `spine` and `members` audiences; the namespace check | design §2 |
| Audience evaluation | For each event, the initial audience from the preceding state and the pinned rule; extension by `dap.disclose`; never shrinks | design §1, *Audience and view* |
| View construction | `V(p, n)`: the events whose audience includes `p` under basis `n`, with headers for the rest; the bootstrap entitlement for a joiner | design §2, bootstrap entitlement |
| Interpreter | `I(p, V(p,n), n)` returning `Interpreted` or `Paused{at, reason, last}`; expected-binding check per kind; unavailable package or missing disclosed dependency pauses | design §1 and §3 |
| Oracle | `fold(S[0..n])` on the complete series and `observe(p, state, n)` under basis `n`; never available to a model | views note, *The property* |
| Models | Discussion (uniform, the worked example), Sale, Booking, Club; each with `observe`, `affordances` and invariants declared in a separate file from the fold | views note §5 |
| Generator | Series built from each participant's affordances, seeded, bounded; injects mid-stream attach, one narrow attach, ineffective attempts, late joiners, disclosures, an unavailable package, an unrelated private attach and a relevant binding change | views note, *What the spike tests* |
| Checker | For every series, participant and frontier: equality on interpreted results, the pause rule on paused ones, invariant checks on the oracle's state; minimal failing trace by shrinking the series | views note, *The property* |
| Mutation runner | Breaks one audience rule per model and confirms the checker finds it | views note, *What the spike tests* |
| Report | Violations per draft, fixes, kinds added, disclosure added, cliffs hit; fix counts against the budget; goal 1 and goal 2 criteria | design §0 |

## 4. Predeclarations

These are fixed before any series is generated and are committed with the
harness in `spike/predeclared/`. Changing one after a run is a new
experiment.

### Business promises and privacy budgets

The privacy budgets are the ones the views note landed, restated as fixed
reader sets that do not depend on the candidate model's own audience rules.
Changing one is a changed experiment and is proposed in the views note, not
here.

| Model | Promises | Privacy budget (maximum readers) |
|---|---|---|
| Sale | At most one accepted offer. An accept is effective only for an existing, open, unwithdrawn, unreplaced stub, by a holder of `sale.accept_offer`. Every offerer's view shows the decision. The winner and the seller see the accepted amount. | Amount and counter of an offer: its author and the seller. Inspection request: requester, seller, inspector. Participation and offer stubs: members at the time. |
| Booking | No two effective occupancies overlap on one room. Whether a slot is occupied is visible to all members. An occupancy expires when the clock passes its end. | Purpose and the booker's identity: the booker and the admin. Occupancy facts carry no booker. |
| Club | An application is accepted when a quorum of the committee has voted and a majority of votes cast are yes; §4.2 fixes the numbers. Standing is set by the treasurer and visible to members; a member not in good standing cannot vote. A newly added committee member can vote only on applications disclosed to them. | Application contents: the applicant and the committee. The reason for a standing decision: the member concerned and the committee. Votes and outcomes: members. |

### 4.1 Booking split schema

A public fact signed by the booker would expose the booker, because the
actor is in the signed body. So the booker's events are private and the
admin, a designated actor holding `booking.publish`, publishes the public
facts. This is the sale's pattern with the seller in the admin's place.

- `booking.request` (booker, admin): `{room, start, end, purpose}`. The
  booking id is the content id of this event: globally unique, opaque, and
  it does not reveal the booker.
- `booking.occupancy` (members): `{booking_id, room, start, end}` by a
  holder of `booking.publish`. Effective on public state alone: no
  overlap with an effective, unexpired, uncancelled occupancy on that
  room, and the actor holds `booking.publish`. Whether a request exists is
  not a precondition; the admin's client is responsible for publishing only
  for real requests, and the checker compares public state only.
- `booking.cancel_request` (booker, admin): `{booking_id}` by the booker.
- `booking.free` (members): `{booking_id}` by a holder of
  `booking.publish`. Effective if the occupancy exists and is not already
  free.
- Partial completion: a request without an occupancy is pending and does
  not occupy; an occupancy whose id matches no request in a viewer's view
  is still an occupancy for that viewer. Linkage is the content id.
- Expiry: a `dap.observe{time}` by the clock actor makes every occupancy
  whose `end` has passed expired; expired occupancies do not occupy.
- Predeclared cases: two requests for the same slot, the admin publishes
  one occupancy, the other request stays pending; the admin frees exactly
  one of two occupancies on the same room; a booker who is not the admin
  cannot publish.

### 4.2 Club policy

- Roles: Member; Committee (three members in the fixture); Treasurer (one
  member). Roles are grants in the spine.
- `club.apply` (applicant, committee): `{statement}`. The application id
  is the content id of this event.
- `club.vote` (members): `{application_id, yes|no}` by a committee member
  in good standing; one vote per committee member per application; a
  vote by a member not in good standing at that position is ineffective.
- `club.admit` (members, applicant): `{application_id}` by a committee
  member. Effective if and only if at least two votes are effective for
  that id and the yes votes outnumber the no votes, and the applicant is
  not already a member. Effective admission grants Member.
- `club.standing` (members): `{member, good|lapsed}` by the treasurer.
- `club.standing_reason` (member concerned, committee): `{member, text}`.
- Expected traces: three committee members, two yes votes, admit is
  effective; one vote, admit is ineffective with `no_quorum`; a lapsed
  committee member's vote is ineffective and the admit that relied on it
  is ineffective; a committee member added after the application can vote
  only after `dap.disclose` of the application to them, and their vote
  before that disclosure is ineffective with `unknown_application`.
- Constraint inventory for the budget: quorum (admit reads votes) and
  standing (vote reads standing). These are the two constraints §4.3
  budgets.

### 4.3 Counting convention

- The **baseline** is the model's first draft, committed before any
  checker run, any invariant test run, or any inspection of checker
  output.
- A **fix** is one semantic change after the baseline to a model's
  audience rule, kind set, dependency declaration or fold rule, whoever
  found the need for it: the checker, the invariant tests, the author, or
  the reviewer. Each fix is its own commit naming the failure it corrects
  and who found it.
- An **added kind** is a fix that introduces a kind; it counts as one fix
  and one added kind.
- The **constraint inventory**: Sale has one cross-partition constraint
  (one accepted offer); Booking has one (no overlap); Club has two (quorum,
  standing). Budgets apply per constraint: at most 2 fixes and at most 1
  added kind.
- Kinds split at design time before the first checker run count as
  predeclared, not as fixes; the Sale stub and the Booking split are
  predeclared and recorded as such.

### 4.4 Corpus bounds

At most 6 participants, at most 60 positions, at least 200 seeds per model.
The seed list is committed. Every failing series is shrunk and committed.

### 4.5 Agent-authoring protocol for goal 2

The author of each model is an agent. It is given: design note §§1 to 4 and
§8, the views note, the foundation fixture's documentation, the harness
interface types, the model's predeclarations above, and the Discussion model
as a worked example. It may not run the checker or the invariant tests, or
read any checker output, until the baseline is committed. Recorded: the
baseline commit; each checker run's violations; each fix as its own commit
naming the failure and its discovery source; the totals. Turn counts and
wall-clock are noted for interest and are not criteria.

### 4.6 Transfer lifecycle fixture

The ordering note §9 requires the scope, the rights and their owners to be
fixed before the ordering spike starts. This is the fixture O4 executes.

| Context | Scope | Exclusive rights and owner |
|---|---|---|
| S, the sale | The guitar sale of the trace; Alice is Seller | `R_sell` (accept one offer), owner Alice; after position 17, `R_fulfil` (declare the sale complete), owner Alice |
| I, inspection (spawned from S) | Mandate: inspect offer o2; Ivan is Inspector | none; returns a signed result |
| D, delivery | Kim, a courier, arranges delivery of the guitar; Alice and Bob are participants | `R_deliver` (confirm delivery), owner Kim |
| F, fulfilment (destination of the join) | Orders the future of completing the sale; Alice, Bob and Kim are participants | receives `R_fulfil` from S and `R_deliver` from D |

| Boundary | Expected active owner |
|---|---|
| Before S releases `R_fulfil` | S, Alice |
| After the release, before F activates | dormant everywhere; any use in S or F is ineffective |
| After F's activate is effective | F, Alice for `R_fulfil`; F, Kim for `R_deliver` |
| D attempts to release `R_fulfil` | ineffective in D: D never owned it |
| A second release of `R_fulfil` from S | ineffective in S: already released |

Export transformation and reconciliation: S exports `{winner, amount}` from
its public decision at 17; D exports `{buyer, delivery_slot}`; F's genesis
pins the transformation that seats both and the rule that if D's buyer is
not S's winner, activation is ineffective with `mismatch`. Duplicate
imports of the same export are ineffective after the first. Stale source
proposals (an offer signed against S before the release) stay bound to S.
The move of S's writer from W0 to W1 happens before the release, and the
retry results of S survive it.

## 5. Work breakdown

Each task is one builder request and one checker review. A task's exit
condition is what checker verifies at the exact head. Tasks are sequential
unless noted. The ordering spike's implementation waits for the Sale
result: O1 may overlap with V2 and V3, and O2 to O6 start only after V3's
verdict, so that the ordering fixture uses a Sale model the checker has
passed.

### Visibility spike

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| V1 Foundation fixture and kernel | This plan approved | `F0` folds the system kinds with `spine` and `members`; bootstrap entitlement, invitation authority per §2, origin contract and namespace check implemented; the signed-object vectors of §2.1 committed and passing; invitation cases: authorized issue then issuer revoked then redeemed (effective), unissued token (refused), unauthorized issuer (refused), exact retry of a committed acceptance after consumption (receipt returned); the in-memory sequencer appends with retry recovery before admission; the sale trace positions 0 to 5 replay from the narrative with the audiences the views note gives | Checker verifies against design §2, ordering §3 and §2.1 |
| V2 Interpreter, oracle, checker, Discussion | V1 | Interpreter with `Paused{at, reason, last}`; oracle under basis `n`; checker passes on Discussion for 200 seeds; the pause rule tested with an unavailable package; a planted audience bug is found by the mutation runner; shrinking yields a minimal trace | Checker verifies the comparison rule against views note *The property* |
| V3 Sale by agent | V2 | Sale authored under the protocol of §4; property holds for 200 seeds; the views note trace 0 to 19 reproduces the table; the replacement-stub case and the late-joiner cases pass; fix count within budget or the overrun reported | Checker verifies the trace and the recorded fixes |
| V4 Booking by agent | V2 (parallel with V3) | Booking with the §4.1 schema; clock actor; overlap and expiry promises hold; the predeclared cases pass; no public event carries the booker; fix count recorded | Checker verifies the §4.1 cases and the booker budget |
| V5 Club by agent | V2 (parallel with V3) | Club with the §4.2 policy; the expected traces pass; disclosure before and after activation; dependency-incomplete disclosure pauses; a new committee member's backlog by disclosure; fix count recorded | Checker verifies the §4.2 traces independently of the candidate fold |
| V6 Mutations and report | V3, V4, V5 | One audience rule broken per model and found; the unrelated private attach does not stale and the relevant binding change does; report against budgets and goals 1 and 2; falsification verdict stated | Checker verifies the report's claims against the committed runs |

### Ordering spike

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| O1 Profile and journal | V1; may overlap V2 and V3 | Sequencing profile document for the fixture; SQLite journal with exclusive lock and outbox; the §2.1 vectors passing against the journal; the durability promise; the §4.6 lifecycle fixture written as expected traces; a crash harness that kills the process at named points | Checker verifies against ordering §1, §3 and §5 and approves the §4.6 traces |
| O2 Single writer, retry, admission | O1 and V3 | Concurrent appends; exact retries after lost replies, including a consumed invitation and a removed member; changed content refused; crash before append, after append before reply, before notification with the outbox replaying the saved entry and no new action; restart without rollback | Checker verifies the crash schedule against ordering §3 and §9 |
| O3 Handover | O2 | Seal, assign, successor per ordering §6; interrupted between seal and assign; two nominations from one head; reconnected former writer refused | Checker verifies predecessor bindings |
| O4 Transfer lifecycle | O3 | The §4.6 fixture end to end: start the sale, attach Inspection mid-stream, spawn I, admit its result, move S's writer, release `R_fulfil` with a destination commitment, activate F idempotently, join D; every negative case of ordering §9 and every boundary of §4.6 has the expected owner; pre-attach outcomes equal before and after replay | Checker verifies the destination commitment, the owners at each boundary and the negative cases |
| O5 Isolated control verifier | O3 | A verifier given only genesis, `dap.seq.*` entries and headers accepts a valid handover and rejects forged, skipped, wrong-head and wrongly authorized transitions and a bare request | Checker verifies invariant 19 |
| O6 Report | O4, O5 | One process, one host, no external services, context created and joined through the envelope and route; goal 4 and goal 1 criteria; what the spike does and does not establish | Checker verifies the claims |

## 6. Out of scope, and why

- **Production runtime and declarative folds.** The views note allows
  ordinary functions; a JSONata or other profile is a separate proven step
  and the design note leaves the choice open.
- **Per-audience encryption.** The first profile trusts the serving party;
  an encrypted profile must meet the same contract first (views note,
  *Serving a view*).
- **Foundation upgrades.** Deferred with a stated lineage rule (design §2).
- **General migration.** The spikes test new-model initialization only
  (views note, *What the spike tests*).
- **Poker.** Depends on commitments with secret randomness and dealer
  trust; outside the three models.
- **Replication, anonymous pools, automatic failover.** The ordering spike
  is one trusted writer (ordering §2, §6).
- **A user test of goal 3.** The narrative is the check for now (design §0).
