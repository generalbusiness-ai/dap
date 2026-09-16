---
date: 2026-09-15
status: >-
  implementation-design plan for the two dap spikes, written against the
  outline landed at 0fb712b. Makes every fixture decision the outline left to
  the spikes, writes out the predeclarations the views note requires, and
  breaks the work into reviewable tasks. Adopts nothing for production; every
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
| Event body | Canonical JSON with `kind`, `payload`, `actor`, `nonce` (16 random bytes), `genesis` and `action_id` for sequenced intents, `expected_binding` for application intents; origins carry no `genesis` or `expected_binding` (design §2, origin contract) | The nonce makes a payload commitment unguessable for low-entropy payloads without any per-field machinery (views note, *Serving a view*) | Per-field commitments or encryption |
| Authenticated header | `{genesis, position, prev, commitment, seq_sig}` where `prev` is the hash of the previous header, `commitment` is the sha256 of the signed event bytes, `seq_sig` is the sequencer's Ed25519 signature over the header | Hidden positions verify in the chain without payloads and reveal no kind, actor or audience (views note, *Serving a view*; ordering §5) | Freshness, complete delivery, or hiding the count of positions |
| Wire format for the ordering fixture | The header above plus the canonical event bytes, one entry per line in the journal; receipts are the header | Fixes the format the ordering note §5 left undecided, for this fixture only | The production header format |
| Fixed foundation `F0` | The system kinds of design §2 with their audiences (`spine`, `members`, named sets), the bootstrap entitlement, the invitation token, the origin contract, the namespace check; content id pinned in every genesis; no successor foundation | Both spikes need one foundation; upgrades are deferred (design §2, foundation lineage) | Foundation evolution |
| Invitation token | Signed by the inviter: `{genesis, invitee, grants, token_id}`; embedded in `dap.accept_invite`; one use, enforced by the sequencer's consumption record | Members verify a newcomer's grants without seeing the private invite (design §2, grant evidence) | Transferable or multi-use invitations |
| Runtime profile id | `dap.fixture.ts/1`: models are TypeScript functions `fold(state, event, env) -> state`, `audience(state, event) -> set`, `observe(p, state, n) -> projection`, `affordances(p, state) -> constructors`, `invariants(state) -> violations` | The views note allows ordinary functions with declarative folds as a separate step | Determinism across machines beyond what the test corpus shows |
| In-memory sequencer | Single process; dense positions; retry index by `action_id`; returns a header per append; admission after retry recovery as in ordering §3 | The visibility spike needs order, not durability | Durability, crash recovery, or concurrency across processes |
| Durable journal | SQLite through `node:sqlite`, one file per context, an exclusive lock per journal; one transaction per append writes the entry, the head, the retry record and any invitation consumption | The ordering note §3 wants one durable transaction and a conditional append; SQLite gives both with no external service (goal 4) | Survival of host or disk loss; only survival of process crash and restart on the same disk |
| Durability promise | An acknowledged append survives process crash and restart on the same disk, under `PRAGMA synchronous=FULL` | Stated so the crash schedule tests exactly this (ordering §9) | Anything a mirror or replica would add |
| Serving party | The same process as the sequencer, running the foundation fold to evaluate audiences and issue transport credentials | The first trusted profile (design §2) | Any separation of sequencer and serving party |
| Clock and randomness | A designated `clock` actor holding `dap.observe`, driven by the generator; no wall-clock reads inside any fold | Views note cliff 4 | A real time source |

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

| Model | Promises | Privacy budget |
|---|---|---|
| Sale | At most one accepted offer. An accept is effective only for an existing, open, unwithdrawn, unreplaced stub, by a holder of `sale.accept_offer`. Every offerer's view shows the decision. The winner and the seller see the accepted amount. | Amounts, counters and inspection requests never widen beyond their audience rule. Participation and stubs are public among members at the time. |
| Booking | No two effective bookings overlap on one room. Occupancy of a slot is visible to all members. A booking expires when the clock passes its end. | Purpose and booker note never widen beyond booker and admin. |
| Club | An application is decided by the committee. Quorum is computed from statuses visible to members. Good standing is visible to members. A newly added committee member can decide only applications disclosed to them. | The reason for a status never widens beyond member and treasurer; application contents never widen beyond applicant and committee. |

### Booking split schema

- `booking.slot` (members): `{booking_id, room, start, end}`. Occupies the
  slot when effective; overlap with an effective slot makes it ineffective.
- `booking.detail` (booker, admin): `{booking_id, purpose, note}`. Effective
  only if a `booking.slot` with that id by the same author is already
  effective; otherwise ineffective with `no_slot`.
- `booking.cancel` (members): `{booking_id}` by the booker or an admin.
- Partial completion: a slot without a detail is a complete booking; a
  detail never affects occupancy. Linkage is the `booking_id`, chosen by
  the author, unique per author.
- Expiry: a `dap.observe{time}` by the clock actor makes every slot whose
  `end` has passed expired; expired slots do not occupy.

### Counting convention

- A **fix** is one change to a model's audience rule, kind set, dependency
  declaration or fold rule, made after a checker-found violation, committed
  separately with the violation it answers.
- An **added kind** is a fix that introduces a kind; it counts as one fix
  and one added kind.
- The **constraint inventory**: Sale has one cross-partition constraint
  (one accepted offer); Booking has one (no overlap); Club has two (quorum,
  standing). Budgets apply per constraint: at most 2 fixes and at most 1
  added kind.
- Kinds split at design time before the first checker run count as
  predeclared, not as fixes; the Sale stub and the Booking split are
  predeclared and recorded as such.

### Corpus bounds

At most 6 participants, at most 60 positions, at least 200 seeds per model.
The seed list is committed. Every failing series is shrunk and committed.

### Agent-authoring protocol for goal 2

The author of each model is an agent. It is given: design note §§1 to 4 and
§8, the views note, the foundation fixture's documentation, the harness
interface types, the model's predeclarations above, and the Discussion model
as a worked example. It is not given the checker's failing traces until its
first draft is committed. Recorded: the first draft commit; each checker
run's violations; each fix as its own commit naming the violation; the
totals. Turn counts and wall-clock are noted for interest and are not
criteria.

## 5. Work breakdown

Each task is one builder request and one checker review. A task's exit
condition is what checker verifies at the exact head. Tasks are sequential
unless noted.

### Visibility spike

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| V1 Foundation fixture and kernel | This plan approved | `F0` folds the system kinds with `spine` and `members`; bootstrap entitlement, invitation token, origin contract and namespace check implemented; the in-memory sequencer appends with retry recovery before admission; the sale trace positions 0 to 5 replay from the narrative with the audiences the views note gives | Checker verifies against design §2 and ordering §3 |
| V2 Interpreter, oracle, checker, Discussion | V1 | Interpreter with `Paused{at, reason, last}`; oracle under basis `n`; checker passes on Discussion for 200 seeds; the pause rule tested with an unavailable package; a planted audience bug is found by the mutation runner; shrinking yields a minimal trace | Checker verifies the comparison rule against views note *The property* |
| V3 Sale by agent | V2 | Sale authored under the protocol of §4; property holds for 200 seeds; the views note trace 0 to 19 reproduces the table; the replacement-stub case and the late-joiner cases pass; fix count within budget or the overrun reported | Checker verifies the trace and the recorded fixes |
| V4 Booking by agent | V2 (parallel with V3) | Booking with the split schema; clock actor; overlap and expiry promises hold; fix count recorded | Checker verifies the split rule and expiry |
| V5 Club by agent | V2 (parallel with V3) | Role-derived audiences; disclosure before and after activation; dependency-incomplete disclosure pauses; a new committee member's backlog by disclosure; fix count recorded | Checker verifies the disclosure cases |
| V6 Mutations and report | V3, V4, V5 | One audience rule broken per model and found; the unrelated private attach does not stale and the relevant binding change does; report against budgets and goals 1 and 2; falsification verdict stated | Checker verifies the report's claims against the committed runs |

### Ordering spike

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| O1 Profile and journal | V1 | Sequencing profile document for the fixture; SQLite journal with exclusive lock; the header wire format; the durability promise; a crash harness that kills the process at named points | Checker verifies against ordering §1, §3 and §5 |
| O2 Single writer, retry, admission | O1 | Concurrent appends; exact retries after lost replies, including a consumed invitation and a removed member; changed content refused; crash before append, after append before reply, before notification; restart without rollback | Checker verifies the crash schedule against ordering §3 and §9 |
| O3 Handover | O2 | Seal, assign, successor per ordering §6; interrupted between seal and assign; two nominations from one head; reconnected former writer refused | Checker verifies predecessor bindings |
| O4 Transfer lifecycle | O3, V3 | Start a sale, attach Inspection mid-stream, spawn inspection work, admit its result, move the writer, split with a destination commitment, activate idempotently, join; every negative case of ordering §9; pre-attach outcomes equal before and after replay | Checker verifies the destination commitment and the negative cases |
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
