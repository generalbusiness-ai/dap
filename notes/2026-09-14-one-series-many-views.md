---
date: 2026-09-14
updated: 2026-09-15
status: >-
  draft core design for dap. One question, one worked trace, the property it relies on,
  the same property across a range of applications, where authoring gets hard,
  and the spike that tests it. The trace specifies intended outcomes; no model
  has yet been shown to satisfy them. Adopts nothing.
design: notes/2026-09-14-evolving-spaces-design.md
ordering: notes/2026-09-14-ordering.md
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
   later visible disclosure events. It never shrinks; you cannot un-see.
3. A participant `p` sees `V(p,n)`: the events through position `n` whose
   audience includes `p` as of frontier `n`. Positions are preserved; hidden
   positions carry commitments and authenticated linkage sufficient to verify
   the chain without reading their payloads.
4. Every participant folds **their own view** with the **same fold program**.
   Their semantic environment is likewise derived from the `dap.attach` events in
   their view. Nobody folds anything they cannot see.
5. The model must be written so that **folding a view agrees with folding the
   whole series** on everything the viewer can see. This is what makes "one
   room" and "a subset thread" the same design.

For a participant entitled to the complete series, the room is `fold(S)`. A
thread is `fold(V(p,n))` rendered for someone else. Both are derived; caching
a projection does not make it a separate history.

## The trace

A sale is used because it is the *smallest* example with a constraint that
spans what different participants can see — not because sales are the
prototypical application. §5 shows the same design across very different
ones.

Alice sells a guitar. Bob and Carol make offers. Alice attaches an inspection
package mid-way, accepts one offer, and later mistakenly tries to accept the
other. Entry 0 is `dap.genesis` and is omitted; the listing is an adopted
origin at entry 1. Bob, Carol and Ivan became participants by redeeming the
invitation the published listing carried (`dap.accept_invite`, visible to
all), so `everyone` — participants at that position — is shared state.
Recipient lists are serving policy, not payload fields.

```text
Listing         → everyone
Offer           → { author, seller }
Counter         → { seller, author of the offer countered }
Accept          → { seller, every principal who has made an offer }   ← includes settled offers
Close           → everyone
dap.attach      → everyone                                            ← foundation default
InspectionReq   → { requester, seller, inspector }
```

| n | event | by | audience | Alice's fold | Bob's fold | Carol's fold |
|--:|---|---|---|---|---|---|
| 1 | `Listing{guitar, ask 800}` (adopted origin) | Alice | all | open | open | open |
| 2 | `Offer{700}` | Bob | A, B | offers: {2 open} | offers: {2 open} | *(hash)* |
| 3 | `Offer{750}` | Carol | A, C | offers: {2, 3 open} | *(hash)* | offers: {3 open} |
| 4 | `Counter{to 2, 780}` | Alice | A, B | 2 countered | 2 countered | *(hash)* |
| 5 | `dap.attach{Inspection}` | Alice | all | env += Inspection | env += Inspection | env += Inspection |
| 6 | `InspectionReq{}` | Carol | A, C, Ivan | 3: inspection requested | *(hash)* | 3: inspection requested |
| 7 | `Offer{780}` | Bob | A, B | {2 superseded, 3, 7 open} | {2 superseded, 7 open} | *(hash)* |
| 8 | `Accept{offer 7}` | Alice | A, B, C | 7 accepted; 3 declined | 7 accepted | 3 declined (another won) |
| 9 | `Accept{offer 3}` | Alice | A, B, C | **ineffective**: already accepted | ineffective | **ineffective**: already accepted |
| 10 | `Close{sold}` | Alice | all | closed | closed | closed |

Bob and Carol never receive each other's payloads or identities. They do
learn from the shared decision that another offer exists, and chain
verification shows them how many positions they cannot read.

**Position 9 is the point.** It is ineffective for everyone for the same
reason — but only because `Accept` is visible to every offerer. Had position
8's audience been `{seller, accepted buyer}`, Carol would miss the decision
and judge position 9 *effective* while Alice refused it: same series, same
fold, contradictory outcomes, and sequencing alone cannot detect it.

**One condition remains open before this trace is executable.** Carol cannot
check that offer 7 exists and is eligible; she holds only its commitment. If
`Accept`'s fold rule requires that hidden input, widening the audience does not
fix the model. The spike must choose: disclose eligibility evidence; treat the
seller's decision as an explicitly authorized attestation whose shared effect
does not depend on private validation; or restructure the events. The choice
must also handle a nonexistent or withdrawn target. A signature authenticates
Alice's assertion; it does not prove her hidden premises.

## The property

For every participant `p` and frontier `n`:

```text
fold(V(p,n))  ≡  observe(p, fold(S[0..n]), n)
```

The model declares `observe`: the visible state, outcomes, semantic bindings
and affordances to compare. It cannot hide a contradiction by excluding an
outcome the application presents as shared. The full fold is a specification
oracle, not something every participant may run.

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
| **Sale** | offers: buyer + seller | one accepted offer | the decision and its validation evidence or attestation policy (the trace) |
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
   position-9 contradiction, silent without the check.

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
separately proven step. An in-memory sequencer as a fixture (it establishes
nothing about durable append or recovery; the ordering note's spike does
that). A generator producing series from each participant's affordances,
including `dap.attach` mid-stream and one with a narrow audience, plus
signed ineffective attempts: stale or conflicting actions, unauthorized
actors, nonexistent or withdrawn targets, hidden revocations, late joiners
missing earlier shared decisions.

For every series, participant and frontier, check
`fold(V(p,n)) ≡ observe(p, fold(S[0..n]), n)`. Declare `observe` and the
application invariants independently of the view-fold implementation; compare
outcomes and affordances as well as state. Include disclosure before and after
activation, dependency-incomplete disclosure, unavailable source, and replay
from an invalidated cache. Decide the Sale trace's validation semantics before
generating.

Report per model: violations in the first draft; fixes to reach zero; kinds
split or added; disclosure added; cliffs hit. Then break one audience rule in
each model and confirm the checker finds it. Record generator bounds and
seeds; keep minimal failing traces.

Falsified if realistic models satisfy the property only by widening every
audience until everyone sees everything — in which case "a subset thread" was
never a real design and those participants need separate contexts — or if the
fix counts for the partition-plus-decision shape are not small.
