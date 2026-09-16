---
date: 2026-09-14
updated: 2026-09-15
status: >-
  draft core design for dap, revised 2026-09-15 after checker's review of
  9a0d7eb. One question, one worked trace, the property it relies on, the same
  property across a range of applications, where authoring gets hard, and the
  spike that tests it. The trace now uses a split offer so that the shared
  decision needs no hidden input; it specifies intended outcomes, and no
  model has yet been shown to satisfy them. Adopts nothing beyond that.
design: notes/2026-09-14-evolving-spaces-design.md
ordering: notes/2026-09-14-ordering.md
narrative: notes/2026-09-15-sale-as-experienced.md
---

# One series, many views

## The question

A single ordered series of events, some of which change the application
itself (attach a model, attach a view). The series means different things to
different participants — a seller sees one room; each buyer sees a separate
thread that is a subset of the same series — and yet the whole thing converges
on explicit constraints enforced by folds, with every participant's view
agreeing.

Describe the design so that is clearly true for any application, and say
where writing such an application gets hard.

This note assumes a context whose scope has already been chosen and whose
order is already established; what a context is and how it obtains its order
are the other two notes' concerns.

## The design in five points

1. A **context** governs a declared scope of decisions through one ordered
   series of events, `S`, with one logical sequencing authority. Positions
   are dense and the chain is verifiable.
2. Every event has an **audience** — the set of principals who may see it. It
   is folded state: set from the preceding state and the signed event by an
   already active, pinned audience rule, and thereafter only *extended* by
   later visible disclosure events. It never shrinks; you cannot un-see. The
   foundation names two audiences: `spine`, every participant present and
   future, which a late joiner receives in full; and `members`, the
   participants as of the position.
3. A participant `p` sees `V(p,n)`: the events through position `n` whose
   audience includes `p` as of frontier `n`. Positions are preserved; hidden
   positions carry commitments and authenticated linkage sufficient to verify
   the chain without reading their payloads.
4. Every participant interprets **their own view** with the **same
   programs**. Their semantic environment is likewise derived from the
   `dap.attach` events in their view. Nobody folds anything they cannot see.
5. The model must be written so that **interpreting a view agrees with
   folding the whole series** on everything the viewer can see. This is what
   makes "one room" and "a subset thread" the same design.

For a participant entitled to the complete series, the room is `fold(S)`. A
thread is `I(p, V(p,n), n)` rendered for someone else. Both are derived;
caching a projection does not make it a separate history.

## The trace

A sale is used because it is the *smallest* example with a constraint that
spans what different participants can see — not because sales are the
prototypical application. §5 shows the same design across very different
ones.

Alice sells a guitar. Bob and Carol make offers. Alice attaches an inspection
package mid-way, accepts one offer, and later mistakenly tries to accept the
other. Alice signed the listing as a standalone event, signed a genesis
adopting it as entry 1, and published the envelope; Bob, Carol and Ivan each
reached the route, received their own one-use `dap.invite`, and redeemed it
with `dap.accept_invite` (design note §2). Recipient lists are serving
policy, not payload fields.

**The offer is split** (cliff 6, split in v1) so that the shared decision
depends only on public state:

```text
sale.offer          → members            public stub: offer id, optional replaces
sale.offer_terms    → { author, seller } the amount
sale.withdraw       → members            offer id
sale.counter        → { seller, author } offer id, amount
sale.accept         → members            offer id; fold checks the stub only
sale.close          → spine
inspection.request  → { requester, seller, inspector }
dap.invite          → { inviter, invitee }
dap.accept_invite, dap.attach, Listing (origin), dap.genesis → spine
```

`sale.accept{o}` is effective when the stub `o` exists, is not withdrawn,
is not replaced, the sale is open, and the actor holds `sale.accept_offer`.
Every one of those facts is public. A nonexistent, withdrawn or replaced
target is ineffective for everyone for the same reason.

**The privacy promise**, stated plainly: who participates is public inside
the context, as context-scoped principals. That an offer exists, who made
it, and whether it was withdrawn or replaced is public inside the context.
Amounts, counters and inspection requests are private to the principals
their audience rule names. Buyer anonymity toward other buyers is not
promised; a model that needs it needs separate contexts.

S = spine, M = members; A, B, C, I are Alice, Bob, Carol, Ivan.

| n | event | by | audience | Alice's view | Bob's view | Carol's view |
|--:|---|---|---|---|---|---|
| 0 | `dap.genesis` (adopts 1; Sale; Alice Seller) | A | S | env = Sale | env = Sale | env = Sale |
| 1 | `Listing{guitar, ask 800}` (origin) | A | S | open | open | open |
| 2 | `dap.invite{Bob, Buyer}` | A | A, B | — | — | *(header)* |
| 3 | `dap.accept_invite` | B | S | Bob: Buyer | Bob: Buyer | Bob: Buyer |
| 4 | `dap.invite{Carol, Buyer}` | A | A, C | — | *(header)* | — |
| 5 | `dap.accept_invite` | C | S | Carol: Buyer | Carol: Buyer | Carol: Buyer |
| 6 | `sale.offer{o1}` | B | M | o1 open (Bob) | o1 open | o1 open (Bob) |
| 7 | `sale.offer_terms{o1, 700}` | B | A, B | o1 = 700 | o1 = 700 | *(header)* |
| 8 | `sale.offer{o2}` | C | M | o2 open (Carol) | o2 open (Carol) | o2 open |
| 9 | `sale.offer_terms{o2, 750}` | C | A, C | o2 = 750 | *(header)* | o2 = 750 |
| 10 | `sale.counter{o1, 780}` | A | A, B | o1 countered 780 | o1 countered 780 | *(header)* |
| 11 | `dap.attach{Inspection}` | A | S | env += Inspection | env += Inspection | env += Inspection |
| 12 | `dap.invite{Ivan, Inspector}` | A | A, I | — | *(header)* | *(header)* |
| 13 | `dap.accept_invite` | I | S | Ivan: Inspector | Ivan: Inspector | Ivan: Inspector |
| 14 | `inspection.request{o2}` | C | A, C, I | o2: inspection requested | *(header)* | o2: inspection requested |
| 15 | `sale.offer{o3, replaces o1}` | B | M | o1 replaced; o3 open | o1 replaced; o3 open | o1 replaced; o3 open (Bob) |
| 16 | `sale.offer_terms{o3, 780}` | B | A, B | o3 = 780 | o3 = 780 | *(header)* |
| 17 | `sale.accept{o3}` | A | M | decided: o3 (780); o2 declined | decided: o3, mine, 780 | decided: o3 (Bob); o2 declined |
| 18 | `sale.accept{o2}` | A | M | **ineffective**: already decided | ineffective | **ineffective**: already decided |
| 19 | `sale.close{sold}` | A | S | closed | closed | closed |

Bob and Carol never receive each other's amounts, counters or inspection
requests. They do see each other's participation and each other's offer
stubs, and chain verification shows them how many positions they cannot
read.

**Position 18 is the point.** It is ineffective for everyone for the same
reason — but only because `sale.accept` is visible to every member and its
rule reads only public state. Had position 17's audience been `{seller,
accepted buyer}`, Carol would miss the decision and judge position 18
*effective* while Alice refused it: same series, same programs,
contradictory outcomes, and sequencing alone cannot detect it. Had the
accept's rule needed the amount at 16, Carol could not judge 17 at all.

The earlier draft of this trace left one condition open: Carol could not
check that the accepted offer existed. The split stub closes it. The cost is
stated above: offer existence and authorship are public. That is the first
measured fix of this kind, and the spike counts the rest.

## The property

The view interpreter `I(p, V(p,n), n)` takes the principal, the view and the
frontier and returns `Interpreted{state, outcomes, bindings, affordances(p)}`
or `Paused{at k, reason}`. For every participant `p` and frontier `n` where
the result is interpreted:

```text
observe(p, I(p, V(p,n), n))  ≡  observe(p, fold(S[0..n]), n)
```

The model declares `observe`: the visible state, outcomes, semantic bindings
and affordances for one principal to compare. Two principals with the same
visible history and different grants get different affordances, and the
equation says so on both sides. It cannot hide a contradiction by excluding
an outcome the application presents as shared. The full fold is a
specification oracle, not something every participant may run.

A paused result is not compared at `n`. It must equal the interpreted result
at `k-1`, and once the missing dependency is supplied it must resume to
equality at `n`. Hidden positions enter the interpreter as authenticated
headers. The disclosure frontier is an input distinct from an event's
original position: an as-of query before a disclosure keeps the earlier
visibility basis.

The rule this imposes on an author:

> **Any state that a participant's fold depends on must be reachable through
> events that participant can see.**

Cross-participant constraints then need no mechanism of their own. "Only one
offer is accepted" is an ordinary fold rule, enforced consistently because the
*decision* — and whatever evidence is needed to judge its effect — is made
visible to everyone it affects, while the *details* stay private. Folds never
reach across visibility; the model routes consequences through visible events.

Application-mutating events obey the same rule. `dap.attach` has an audience;
each participant's environment is derived from the attachments in their view; an
attachment nobody else can see cannot change their shared outcomes without a
visible consequence under semantics they can resolve. Every viewer needs an
event's required attachments and dependency closure — an unavailable package
pauses interpretation, it does not silently hide an event. Authorization is
the same obligation: every viewer judging an event needs its relevant grants
and revocations, or an explicitly trusted visible authority assertion. When
several models handle one kind, the `dap.attach` event carries the resolution
to one audience policy, and adding a handler cannot disclose an existing
private payload.

## 5. The same design across applications

Each row is a different application on the same substrate. The last column
is what the property forces the author to make visible.

| Application | Visibility shape | Constraint that spans views | What must be made visible |
|---|---|---|---|
| **Discussion channel** | uniform: every member sees every post | none with complete history | nothing; `V(p,n) = S`. New members need history and authority (§6, cliff 3) |
| **Kanban** | usually uniform; optionally private cards | WIP limit per column reads every card in it | with private cards: the *count* per column, not the cards — a `ColumnState` fact, or a public stub + private detail |
| **Calendar / room booking** | a booking's existence: everyone; purpose and booker: booker + admin | "is the slot free" reads every booking | slot occupancy separately from booking detail — one visible fact per booking, or a split kind. Expiry needs time (§6, cliff 4) |
| **Club membership** | applications: applicant + committee; roster: members; dues: member + treasurer | quorum, eligibility, "in good standing" read private status | the *status*, never the reason. A new committee member needs the backlog (§6, cliff 3) |
| **Chess** | uniform | none | nothing for visibility; the fold is the rules of chess (§6, cliff 5) |
| **Poker** | dealt cards: that player; bets: all; showdown: all | winner reads hidden hands | authenticated `Reveal` openings against earlier commitments, with secret randomness so small card domains cannot be guessed from hashes. Fair dealing and uniqueness need rules or dealer trust (§6, cliff 4) |
| **Sale** | offer stubs: members; terms: buyer + seller | one accepted offer | the decision, and the stub it validates against (the trace) |
| **Multi-agent workroom** | uniform | none | nothing for visibility; ceremony and domain-rule complexity remain |

Two shapes account for most of the table. **Uniform** — everyone sees
everything — is free; all authoring effort goes into the fold. **Partitioned
by participant with a few shared decisions** — sale, booking, membership — may
be served by a small number of visible decisions and facts. That count is to
be measured, not assumed to be one per constraint.

## 6. Where authoring gets hard

A checker over generated series can find counterexamples for a candidate
model, each naming a `(participant, position, observable result)`. Fixes are:
widen an audience, add a visible decision or evidence, change the model's
dependencies, or separate contexts — and a fix may disclose more than the
application can accept. **Report fixes made and kinds split or added to reach
zero observed violations, with the disclosure each fix adds and the corpus it
was checked against.** That is the measured authoring cost. Zero failures on a
bounded corpus is evidence, not a proof or a unique minimum.

Beyond that count, hardness arrives at recognisable cliffs:

1. **Uniform visibility.** Free.

2. **Partition plus decisions.** A few visible facts per cross-partition
   constraint. The author must *notice* each dependency; the failure is the
   position-18 contradiction, silent without the check.

3. **Retroactive visibility.** A new committee member, a late joiner, a newly
   assigned reviewer. Audience is set at the event's position, so by default
   they see nothing earlier. The answer is an explicit `Disclose{positions,
   to}` act — sequenced, visible, auditable, the only way an audience grows.
   Revealed events keep their original positions; the recipient may need to
   replay from the earliest affected position with every prior decision, grant
   and attachment it depends on. An as-of query before the disclosure keeps
   the earlier visibility. A summary is a separate attested input, not
   equivalent to replay. `dap.disclose` is a system kind; the one open
   decision is how dependency completeness is checked — by the discloser's
   client, the serving party, or the recipient's pause.

4. **Ambient inputs.** Time (expiry, deadlines) and randomness (a deal, a
   draw) cannot be read by a fold. They enter as `dap.observe` events by an
   actor holding that capability — a dealer, a clock service. Every
   time-based rule therefore needs a designated actor: not hard, easy to
   forget, and it makes a closed model depend on someone showing up.

5. **Fold complexity beyond the expression profile.** Chess legality, a
   scheduling solver, a scoring algorithm. gitseq specified a
   [native-helper seam](../../gitseq/notes/2026-08-27-jsonata-ddl-stable-extensions.md)
   for this — explicit, allowlisted, pure, versioned, host-supplied — and
   [distinguishes](../../gitseq/notes/2026-09-04-tailapps-jsonataddl-adoption.md)
   that design from implemented support. The cost: such models are no longer
   purely declarative content.

6. **Field-level visibility.** Booking exists for all, purpose for some.
   Either split the event into kinds with different audiences, or declare
   per-field audiences and have the serving party project payloads. Splitting
   multiplies kinds — gitseq [measured](../../gitseq/notes/2026-08-20-composite-kinds.md)
   how ceremony accumulates — and needs linkage and partial-completion rules;
   per-field projection breaks "the chain hash commits to the event you saw"
   and needs per-field commitments. *Recommendation:* split in v1, count how
   often real models need it, revisit if the count is high.

7. **Composition across packages with different audiences.** Cards with a
   discussion package attached to each; booking plus membership. Each model's
   property must hold on its own and across its declared cross-namespace
   reads, and a `dap.attach` may itself have a narrow audience. This is where
   an author's intuition is least reliable.

The hypothesis: cliffs 1–2 cover many useful applications cheaply, 3–4 admit
reusable framework support, 5–7 need more than a checker. Retroactive
disclosure and private validation may prove more expensive than this ordering
suggests; the spike reports rather than assumes.

## Serving a view

The sequencer orders and retains; it neither folds nor decides audience.
Whoever serves `V(p,n)` must evaluate audience rules, which means running the
fold. In a plaintext-per-context first version that is a **trusted serving
party**, distinct from application authority and distinct from the sequencer.
Per-audience encryption is a separate substrate question: its key retention,
disclosure and replay behaviour must meet this same contract before it can
replace that trust.

Named rather than hidden:

- A participant sees *how many* positions they cannot read — a leak of shape,
  not content. A model that must hide the count needs a separate context.
- A late joiner receives the whole spine (design note §2), so the count of
  hidden positions is over application events only.
- The serving party can withhold an opening behind a valid commitment. A
  verified chain proves integrity of the prefix, not complete delivery of
  everything the reader was entitled to, nor freshness of the head.
- Hidden positions need enough authenticated public structure to verify their
  place in the chain — a sequencer-signed header binding context, position,
  predecessor and payload commitment. A bare opaque hash is not enough if
  recomputing the chain needs the withheld bytes. Hidden events' actor keys,
  kinds, references and recipient lists need not be public. **The header and
  commitment format is undecided**; the ordering note owns that decision, and
  the poker row above depends on it.
- Audience is determined at the committed position. A sender who encrypts for
  a guessed audience before ordering can be wrong after an intervening role
  change; a trusted server can order first and serve after. An encrypted
  profile must bind key release to the actual audience decision — a later
  refusal cannot revoke a key already handed out.

## What the spike tests

**The consistency property holds for realistic models without collapsing
visibility, and its authoring cost is small for the common shapes.**

Three models with different shapes — **Sale** (partition + decision), **Room
booking** (field split + time), **Club membership** (role-derived audience +
retroactive disclosure) — as ordinary functions; declarative folds are a
separately proven step. One fixed foundation, with the bootstrap of design
note §2 (envelope, route, one invitation per responder) as the fixture's
join path. An in-memory sequencer as a fixture (it establishes nothing about
durable append or recovery; the ordering note's spike does that). An
abstract authenticated-header fixture for hidden positions (it establishes
no cryptographic hiding). A generator producing series from each
participant's affordances, including `dap.attach` mid-stream and one with a
narrow audience, plus signed ineffective attempts: stale or conflicting
actions, unauthorized actors, nonexistent, withdrawn or replaced targets,
late joiners missing earlier shared decisions, one unrelated private attach
that must not stale a shared act, and one relevant binding change that must.

A hidden revocation is not a compliant history: the foundation forbids
private grant and revoke audiences. The generator produces it as a mutation
of the foundation or serving contract, and the checker must detect it.

**Predeclared before generation**, so the verdict cannot be tuned after the
fact:

- each model's business promises and privacy budget. Sale: amounts never
  widen beyond author and seller; participation and offer existence are
  public. Booking: purpose and booker never widen beyond booker and admin;
  occupancy is public. Club: the reason for a status never widens beyond
  applicant and committee; the status is visible to members;
- the starting model: the one written from the specification before any
  checker run, by an agent, with the fix count recorded (design note goal 2);
- the fix budget for the partition-plus-decision shape: at most 2 fixes and
  at most 1 added kind per cross-partition constraint;
- the corpus bounds: at most 6 participants, at most 60 positions, at least
  200 seeds per model;
- the Booking split schema, its linkage and its partial-completion rule.

For every series, participant and frontier, check
`observe(p, I(p, V(p,n), n)) ≡ observe(p, fold(S[0..n]), n)` on interpreted
results, and the pause rule on paused ones. Declare `observe` and the
application invariants independently of the interpreter implementation;
compare outcomes and affordances as well as state; never weaken an invariant
to make the checker pass. Include disclosure before and after activation,
dependency-incomplete disclosure, unavailable source, a late joiner with
only the spine, and replay from an invalidated cache. This spike tests
new-model initialization only; migration of preceding state is untested.

Report per model: violations in the first draft; fixes to reach zero; kinds
split or added; disclosure added; cliffs hit; the fix count against the
budget. Then break one audience rule in each model and confirm the checker
finds it. Record generator bounds and seeds; keep minimal failing traces.
Report against the goal criteria of design note §0: goal 1 by replay across
the mid-stream attach, goal 2 by the agent-authored fix counts.

The result is a bounded outcome for these three candidates. Zero violations
on the corpus is evidence for them, not a proof about all models; a failed
draft is evidence against that draft, not a proof that every model must
collapse visibility.

Falsified if these models satisfy the property only by widening every
audience until everyone sees everything — in which case "a subset thread"
was never a real design and those participants need separate contexts — or
if the fix counts for the partition-plus-decision shape exceed the budget.
