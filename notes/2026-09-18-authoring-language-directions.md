---
date: 2026-09-18
status: >-
  draft research note. It adopts nothing and authorizes no implementation.
  It answers one question from Hugh: given the spike's negative result on
  agent authoring, what source language and compiler would make
  application-behaviour packages easier to write, judged without regard
  to the runtime. Directions are ranked and each names how the spike's
  own evidence would test it.
origin: >-
  Hugh's request of 2026-09-18, with a ChatGPT discussion of the
  gitseq/dap programming model and its correspondence with VM, actor and
  OTP models (https://chatgpt.com/share/6aadd67d-1f34-83ea-a017-029956363696),
  extended at Hugh's request to stack machines and the WebAssembly
  ecosystem, whose authoring lessons are folded into D1, D9 and D10.
bases: >-
  main f8def3df; spike/fixtures/{sale,booking,club,discussion}.ts;
  notes/2026-09-15-sale-as-experienced.md; Workspaces with Soft Edges
  (2001); woo/notes 2026-05-04-task-workflow-model.md,
  2026-05-06-santas-workshop.md and docs/blocks-and-plugs; gitseq
  docs/why.md and notes/2026-08-08-first-ontology.md;
  spike/manifests/{sale,booking,club}.ledger.md and sale.md;
  notes/2026-09-16-club-admission-decision.md; spike/src/descriptor.ts;
  notes/2026-09-14-one-series-many-views.md §6; gitseq notes
  2026-08-26-jsonata-ddl-application-interface.md and
  2026-08-27-jsonata-ddl-stable-extensions.md at 8e77fc25.
design: notes/2026-09-14-evolving-spaces-design.md
views: notes/2026-09-14-one-series-many-views.md
narrative: notes/2026-09-15-sale-as-experienced.md
---

# Authoring application behaviour: directions for a source language and compiler

## In one paragraph

The spike falsified goal 2: an agent could not author the Sale model within
two semantic repairs. Every repair it needed was about **who can read what,
and therefore who can judge what**, not about the business rule. Today the
author writes that knowledge by hand, in TypeScript, as audience functions,
guard order, a join-disclosure dependency, a disclosure policy, an `observe`
projection and an affordance list, and a fuzzing checker finds the mistakes
afterwards. The direction this note recommends is a small source language in
which readers are declared once per fact, and a compiler that derives the
rest and refuses a model whose guards read facts its readers cannot see.
That converts the spike's checker findings into compile-time diagnostics.
A sweep of the original use cases (§5) says this holds wherever views are
partitioned, and that outside partitioned visibility four costs the spike
never measured dominate: composition, cross-context protocols, external
systems and lifecycle. The limits: this note adopts nothing; the runtime
is out of scope, so the module language of §3's D9 stays a profile
decision; and the performance consequences named in §3 are licences, not
measurements.

## 1. What the spike says the cost is

The repair ledgers record every semantic change after the baseline. Read as
a whole, they are a list of things the author had to *notice* about
visibility. The table classifies each and says what would have caught it at
authoring time.

| Repair | What went wrong | Class | Caught at authoring time by |
|---|---|---|---|
| Sale fix 1, fix 7 | The counter's readers were taken from a payload field the actor wrote, so a counter missed its party (fix 1) or reached a non-party (fix 7) | audience derived from self-asserted payload | readers declared as a function of prior effective facts, never of the payload (D1, D6) |
| Sale fix 2; Booking and Club baselines; the author's predictions 1 and 3 | A member who joined after a stub, withdrawal or accept held only its header, so an accept of a stub the viewer never read was `no_such_offer` where the oracle said `already_decided` (the position-18 contradiction); every model declared a `joinDisclosure` dependency | guard reads outside the reader set: newcomers lack the backlog of public facts later guards read | a containment check on every guard, which names the newcomer (D1); a retroactive audience for effective public facts, or a derived join disclosure (D2) |
| Sale fix 3; the author's prediction 2 | The baseline patched the same gap with a tombstone rule: a withdrawal or replacement of a stub the view never read took effect against the bare id, and the invariant caught it | a guard on an unreadable fact patched instead of made readable | the same containment check (D1); with D2 the stub is readable and the tombstone is unnecessary |
| Sale fix 4; Booking fixes 1 and 2 | A client widened a private kind, or an unauthorized attempt; the model had to declare which kinds, and which verdicts, may be disclosed | privacy budget declared twice, in the manifest and in the model | declare maximum readers once; derive the initial audience, the disclosure policy and the checker's budget (D3) |
| Sale fix 5 | A payload named the offerer redundantly and could name the wrong one | self-asserted reference | typed references resolved from state, not carried as free fields (D6) |
| Sale fix 6; a foundation repair in Sale run 5 | Audience functions threw on malformed payloads; an unbound kind's payload was readable by every member | audience rules not total; a refusal disclosed a payload | schema validation before audience, generated total rules (D3) |
| Club A1, A5 | Votes and admits could name a commitment that was not an application; non-readers cannot verify a hidden event's kind | unjudgeable reference across a privacy boundary | a compile-time diagnostic naming the two routes the decision note records (D6) |

Two facts stand out. All three models needed the same undeclared
foundation mechanism, the newcomer backlog. And the Sale author's own
pre-run predictions were correct: the failures were foreseeable from the
kinds' audiences alone, which is exactly what a compiler can compute.

The hand-written parts of the Sale fixture that a compiler could derive:
`observe` (38 lines, a visibility filter and a field mask), `affordances`
(18 lines, "which guards would pass for me now"), the seven kinds' audience
bindings (four rule functions), the guard order, and the two config
declarations. The business content is roughly the seven kinds, six guards,
one cross-partition constraint and the manifest's four invariants.

### Who was blamed

Racket's contract system exists to answer one question at a boundary:
which party broke its side. Findler and Felleisen's higher-order contracts
carry two parties, and Dimoulas, Findler, Flanagan and Felleisen's
correct-blame theorem is the guarantee that a failing check names the
party that supplied the faulty value, never a bystander. Read the ledgers
with that question and four of the counted repairs are not defects in a
model's fold at all. They are obligations the model places on a client,
and the model's budget was charged when the client violated them.

| Model | Counted semantic repairs | Of those, obligations on a client |
|---|---|---|
| Sale | 6 | 2: the join disclosure (fix 2) and the disclosure policy (fix 4) |
| Booking | 2 | 2: the disclosure policy (fix 1) and its authorized-only rule (fix 2) |

Booking's whole budget went on obligations it placed on someone else; its
own fold needed no repair. The ledgers say so themselves: the policy
"binds a conforming client; the checker still judges what is readable, so
a non-conforming client is still caught." Sale's run 3 lost 100 of 200
seeds to the generator's disclosing client with no model change at all.
This does not rescue goal 2: Sale still needs four repairs against a
budget of two. It changes what the number means, and it says the next
spike should score a declaration that constrains another party
separately from a repair to a fold. D3 says where such a contract can be
enforced, and the obligations subsection of §3 says what it is.

## 2. What the compiler must produce

The spike's package is a flat descriptor (`spike/src/descriptor.ts`): per
kind a schema, an audience rule, a capability and an ordered handler list;
per model `init`, `fold`, `observe`, `affordances`, roles, config and the
`ambient` flag; content-addressed by source. The runtime profile is an open
decision in the design note: the bounded JSONata subset carried by atseq
and Tailapps is the incumbent, the spike used TypeScript. gitseq's own compact
form is JSONata with DDL: typed events, declared reads, one transition
expression, typed row changes, and a query surface that exposes
row-to-event derivation.

So "the projection language" a compiler targets is a package contract, not
a runtime: schemas, audience rules, guards, state transitions, projection,
affordances, declared dependencies, and the checker's inputs. Direction D9
makes that contract explicit so that several source languages and several
runtimes can share it.

## 3. Directions, ranked by expected effect on authoring cost

Each direction says what it is, what it removes from the author, and,
where it applies, what it needs, its precedent, and how the spike's
evidence tests it.

### D1. Readers as types; guards checked for containment

**What.** Every fact kind declares its readers as an audience term:
`spine`, `members@t` (the members as of the fact's position), `named(...)`
built from roles and from fields of prior effective facts, or the
retroactive class of D2. A guard in a fold refuses kind `k` by consulting
fact `f`. The compiler checks that every reader of `k` at any later
position is a reader of `f`: `readers(k) ⊆ readers(f)`, evaluated
symbolically over the audience terms and the join rule. `spine` contains
everything; `members@n` does not contain `members@t` for `n > t` unless
`f` is retroactive; `named` sets compare by construction. A guard that
fails the check is a compile error that names the diverging reader in the
ledger's own vocabulary: "a member joining after position of `offer` judges
`accept` as `no_such_offer` where the oracle says `already_decided`".

**Removes.** The author's obligation to notice each dependency (views note
§6, cliff 2), the hand ordering of guards, and the checker runs and
reviews that found
fixes 1, 3, 5 and 7.

**Needs.** Guards written declaratively (pattern or predicate over facts),
not as arbitrary code, so the compiler can see which facts each reads.
And the check must cover more than guards. Codex's review of 2026-09-20
gave the counterexample: a public act with an unconditional guard and an
effect `total = count(private_table)` passes a guard-only check, and
different readers compute different public state. So every expression
that feeds state, an audience, a query result or an affordance carries a
dependency set, and containment is checked on all of them. An absence
test or an aggregate depends on the whole relation, so the relation's
readers must contain the act's readers: a reader who holds only some
rows cannot establish that no matching row exists. That completeness
condition is what the Sale tombstone rule (fix 3) lacked.

**Precedent.** Information-flow label checking (Jif; Viaduct compiles one
labelled program to a distributed protocol). Choreographic programming's
projectability condition, "knowledge of choice": every party whose later
behaviour depends on a branch must be told the branch. Daml's ledger model,
where a party's projection of the ledger is what it validates against.
Miniscript, for the shape of the whole enterprise: a policy language whose
compiler proves correctness, non-malleability and cost that the target,
Bitcoin Script, cannot express; the guarantees live in the compiler.

**Test.** Feed the compiler the recorded Sale baseline shape. It must reject
it with the position-18 diagnostic before any campaign runs. And the
offered-versus-possible defect the review found in the landed Sale, terms
on a declined offer succeeding while not offered, must not be
expressible once affordances derive from the same guards the fold uses
(D5).

### D2. A retroactive audience for effective public facts

**What.** A third foundation audience beside `spine` and `members`:
readable by the members as of the position and by every later participant
on joining, for events the fold judged effective; an ineffective attempt
stays actor-only. Call it `roster` here. Alternatively the compiler derives
each model's `joinDisclosure` from D1's dependency graph: the kinds a
later-judged guard reads become the newcomer's backlog.

**Removes.** The dependency every model declared and the harness hook that
honours it; with the foundation form, the disclosing client too.

**Needs.** A foundation change in the first form: audience set after the
verdict, which design note §8 already implies for refusals. The compiler
form needs
nothing from the foundation.

**Cost.** Goal 3 is served: a newcomer sees everything that publicly
happened. The privacy budget for these kinds was already "members when
recorded, subject to disclosure".

**Test.** Sale, Booking and Club without their `joinDisclosure` config pass
their campaigns under the new audience.

### D3. Declare the privacy budget once; derive the rest

**What.** Each kind, or each field, declares `readers: initial` and
`readers: maximum`. The compiler derives the total audience function, the
disclosure policy (kinds whose maximum exceeds their initial readers), and
the checker's budget test. Per-field readers on one message compile to the
split kinds the views note recommends (cliff 6), with the linkage and
partial-completion rules generated.

**Removes.** The duplication between manifest and model, fixes 4 and 6, and
the ceremony that gitseq measured for split kinds.

**Where the contract is enforced, and by whom.** A disclosure policy is a
contract on the discloser's client, and the tempting fix is to have the
foundation refuse a `dap.disclose` that exceeds a kind's maximum readers.
That fails for the reason Racket's complete-monitoring result states: a
contract can be enforced only on a channel the monitor can observe. A
viewer judging a disclosure cannot see the kind at a hidden position,
because the header commits to content and reveals no kind, so a fold-level
refusal would not be uniformly judgeable, which is what D1 forbids. The
serving party sees both sides. So the disclosure contract belongs to the
serving party in the first profile, and its violation is the discloser's
fault, reported as such, and never a model outcome or a repair.

**Precedent.** Daml's signatories, observers and stakeholders on a template;
Viaduct's confidentiality labels per value; Racket contracts for the
boundary discipline and for blame.

**Test.** The Sale manifest's budget section becomes the model's
declaration; the checker's budget function is generated from it and finds
the same violations on the V3-F1 reproductions kept in `test/sale.test.ts`
and on the run-6 corpus.

### D4. State as facts with provenance; `observe` derived

**What.** Model state is a set of relations whose rows carry the position
that produced them and inherit that event's readers. `observe(p)` is then
"rows at visible positions, fields masked by readers", generated. Derived
values such as a stub's status are queries over visible facts. This is what
all four fixtures do by hand.

**Removes.** The `observe` function and the `visible(position)` threading
through every helper.

**Queries as the functional interface.** Because the state is relational
and every row carries its readers, the package can declare named,
parameterized read-only queries over it, and the runtime exposes them to
a principal at a basis with rows filtered and cells masked by readers,
every result naming the frontier it represents. That is the query half of
the transport interfaces the design note leaves open (its §4: "discovery,
submission, fetching and query still need transport interfaces"). For an
MCP or similar surface the package then supplies all three sides: the
typed affordances of D5 as the write tools, the declared queries as the
read tools, and the anchor of D14 as the description. Because the queries
run over the reader-filtered materialization, the consistency property
covers them without further work. the gitseq-inventory README describes its
`application.sql` as declaring two exported reads; the first-ontology
note's anchoring use case, every surface reads the definitions in force,
is the same requirement from the other side.

**Precedent.** gitseq's JSONata-with-DDL projection already exposes
row-to-event derivation on its query surface; Dedalus and Bloom put time on
every fact.

**Test.** The literal projections in `sale.ts` at position 19 reproduce
from the generated `observe`.

### Materialization and caches: what D1, D2 and D4 license

The newcomer backlog is an audience rule, so on its own it is a
correctness matter. Three performance consequences follow, and all three
are consequences of the property being guaranteed by construction rather
than checked afterwards.

1. **One materialization for the public partition.** Under
   members-as-of-position every newcomer's view of the public kinds is
   different, and the spike met that with one disclosure per join: 946
   joins among the 1716 disclosures in the Sale campaign's 11171 entries,
   each folded by its recipient. Under `roster` the public partition is the same for
   every present and future member. The serving party keeps one fold
   state for it, and a join emits nothing.
2. **One fold, filtered per reader, instead of one fold per principal.**
   D1 guarantees that folding a view agrees with folding the whole series
   on everything the viewer can see. With D4 that means the serving party
   can keep the oracle's fold once, every row carrying its position and
   its readers, and serve `observe(p, n)` as a filter. The spike's
   per-participant cold replay was the oracle for a checker; once the
   compiler guarantees the property, the server no longer needs it.
   gitseq's relational projection with row-to-event derivation is the
   shape. It needs one more column, the readers, and the audience table
   versioned by basis so that as-of reads keep their earlier visibility.
3. **Disclosures become insertions, not replay, given versioned rows.**
   The design says a recipient may need to rebuild from the earliest
   newly visible position, because a hand-written fold might have judged
   later events differently had it seen the disclosed one. Under D1, if
   the containment check is sound, it could not have: the client's
   verdicts on every event it already saw equal the oracle's. But equal
   verdicts do not make assignments commute. Disclosing an earlier
   assignment after a later one must not overwrite the newer value, so
   D4's rows must be versioned: an assignment is a row version keyed by
   the producing position, the visible value is the latest visible
   version, and a disclosure inserts a version at its original position.
   The Sale fixture does exactly this by hand for terms and counters.
   With that rule stated, the client folds the disclosed event with the
   dependencies the disclosure carries, inserts its versions, and changes
   nothing after it. The pause on a missing dependency stays as it is.

Two limits. Chain verification is unchanged: a newcomer still verifies
headers from genesis, and a client that adopts a served snapshot instead
of replaying trusts the serving party for its content exactly as the first
profile already trusts it for audience enforcement. Row-level provenance
makes that trust partial and checkable, since any row names the position
it came from and can be verified against its header and bytes on demand.
And these are licences, not measurements. The atseq lesson stands: cold
replay is the oracle, and incremental paths are measured separately.
Racket's experience points the same way: checking soundly at boundaries at
run time cost Typed Racket programs past 100 times in Takikawa and
colleagues' measurements, and per-participant replay is the dap analogue
of that dynamic check, which is why D1 pays statically and folds once.

### D5. Affordances derived from guards

**What.** For each kind with capability `c` and guard `G`, the affordance
for `p` is `holds(c) ∧ ∃payload: G(state, p, payload)`. Over finite domains
of references the compiler enumerates typed constructors, which the design
note wants (its §4: `AcceptOffer(#23)`) and the spike does not yet produce.

**Removes.** The hand-written affordance list.

**Needs.** Declarative guards (D1) and finite reference domains from D4.

**Precedent.** Daml choices with controllers; E's reachability as
authority; decidable contract languages (Clarity, Pact) where what a
program can do is statically known; gitseq's first-ontology note, whose
anchoring use case is that every surface offers acts from the definitions
in force.

**Test.** The affordances at position 19 of the Sale trace reproduce from
the generated function, with targets the spike's list lacks.

### D6. Typed references compiled to commitment lookups

**What.** A payload field typed `ref offer` resolves through effective
facts, never through a free string. Where the referring kind's readers
cannot read the referent, the compiler resolves what they can: the position
by header commitment (`ctx.commitmentAt`) and the authority at that position
(`ctx.holdersAt`), which is the Club's `shown` rule. Where a guard needs the
referent's content, the compiler reports and offers the two routes the Club
decision note records: a public record kind, or trusted evidence.

**Removes.** Fixes 5 and 7 and the Club's hand-built pattern; turns the
Club negative result into a diagnostic at authoring time.

**Needs.** The header commitment and the grant history as host imports,
which the descriptor already supplies.

**Test.** The Club's `shown` rule regenerates from a `ref application`
field, and the compiler reports the A1 and A5 shapes on the Club policy.

### D7. Ambient inputs as typed primitives

**What.** `clock` and `draw` types compile to `dap.observe` with a declared
actor capability and the monotone rule Booking wrote by hand. Small, but
cliff 4 is "easy to forget".

**Test.** Booking's clock handling regenerates from a `clock` declaration
and its campaign passes unchanged.

### D8. The source shape: a protocol among roles

**What.** Keep the discussion's local form: a message, when it is valid,
what it changes, with pattern matching on current state in the head. Do not
make the entity or object the primary unit. dap's cost is in the fourth
question, who reads it, so the unit is a protocol among roles: roles, facts
with readers, guards, invariants. A sketch of Sale:

```text
package com.example.sale
  A private-bid sale of one item. Buyers see that other offers exist,
  not their amounts. The seller accepts at most one offer.

roles
  Seller        -- the author of the listing
  Buyer
  Inspector     -- granted for the Inspection package; no acts in this one

lifecycle
  opens with   listing by Seller, an origin         -- the standalone event a genesis adopts
  closes with  close by Seller (outcome text)
  after close  no act of this package is effective  reason not_open

tables
  sale                                              readers spine
    referent   text        from listing
    ask        integer     from listing
    seller     principal   = listing.actor
    outcome    text        from close, nullable
    status     = closed  if close
               | decided if exists accepted
               | open    if listing
               | unopened

  offer                                             readers roster
    id         text  primary key                    -- chosen by the buyer, unique in the context
    author     principal  = actor of offer.place
    replaces   ref offer  nullable
    amount     integer    nullable                  readers {author, sale.seller}
    counter    integer    nullable                  readers {author, sale.seller}
    status     = accepted  if accepted.offer = id
               | withdrawn if exists withdraw where offer = id
               | replaced  if exists offer where replaces = id
               | declined  if exists accepted
               | open

  withdraw (offer ref offer, by principal)          readers roster
  accepted (offer ref offer)   at most one row      readers roster

acts
  common
    when sale.status in {open, decided}             else not_open

  offer.place  by Buyer (id text, replaces ref offer nullable)
    when no offer with this id                      else duplicate_offer
    when replaces is null
      or offer(replaces).status = open              else withdrawn | replaced | already_decided | no_such_offer
         and offer(replaces).author = actor         else not_author
    then insert offer {id, author: actor, replaces}

  offer.terms  by offer.author (amount integer)     -- readers {author, sale.seller}: the column it writes
    when offer.status = open                        else withdrawn | replaced | already_decided | no_such_offer
    then update offer set amount

  offer.counter  by Seller (amount integer)         -- readers {author, sale.seller}
    when offer.status = open                        else withdrawn | replaced | already_decided | no_such_offer
    then update offer set counter

  offer.withdraw  by offer.author
    when offer.status = open                        else withdrawn | replaced | already_decided | no_such_offer
    then insert withdraw {offer, by: actor}

  offer.accept  by Seller
    when offer.status = open                        else withdrawn | replaced | already_decided | no_such_offer
    then insert accepted {offer}

invariants                     -- checked against the oracle by the harness, never folded
  count(accepted) <= 1
  every withdraw.by = offer(withdraw.offer).author
  no effective act after close

queries                        -- exported reads; the client, MCP tools and agents call these
  board          = select id, author, status, replaces from offer order by position
  my_offers (p)  = select * from offer where author = p
  outcome        = select o.id, o.author as winner, o.amount
                   from accepted a join offer o on o.id = a.offer
```

Four of the sections carry four different kinds of knowledge, and the
grouping is deliberate. **Lifecycle** holds the origin and the close, because the
origin is a fact about how the context comes to exist, not one of the
seller's acts; grouping every act by role, "Seller can: listing, counter,
accept, close", would bury it. A role-grouped rendering is useful and a
tool can generate it from the package. **Tables** hold the data, in DDL,
with readers declared on rows and narrowed on columns; this is where
visibility is written, once. **Acts** are method-shaped, `offer.accept by
Seller`, so the entity a guard reads is named by the act's target; each
act's audience is derived from the columns it writes, which is why the
counter's readers come from the effective row's author and never from the
payload (Sale fixes 5 and 7). Reasons follow the branches of the derived
status, with `no_such_offer` for no row and `already_decided` for accepted
or declined. **Queries** are the exported reads. The sketch is written
under D2, which is why its guards may read the decision freely; the
fixture could not.

The compiler emits the seven kinds, the split of `offer` into a public
stub and private terms (D3), the total audience rules, the guard order, the
disclosure policy, `observe`, the typed affordances, the newcomer backlog
if D2 is not a foundation audience, and the checker's budget and
invariants. About seventy-five lines against the fixture's 389, and the
only lines about visibility are the `readers` annotations.

**Test.** The sketch compiles to a descriptor that passes the Sale
manifest's predeclared cases and campaign under the unchanged harness.

**Precedent.** Daml templates: signatories, observers, choices with
controllers, `ensure`, and a ledger model that projects each transaction to
its informees. Choreographic languages (Choral, HasChor, MultiChor's
multiply-located values, which are audiences by another name). Erlang's
OTP (`gen_statem`) and Elixir pattern matching for the local syntax.

### D9. A typed, content-addressed package contract as the target

**What.** State the package interface independently of any language: the
exports `init`, `fold`, `observe`, `affordances`, `audience` with their
types; the host imports `holders`, `holdersAt`, `commitmentAt`, `members`,
`modelState`, `origin`, `visible` and `holds`, the last two of which D4 and
D5 make unnecessary for an author to call; config and schemas; the whole
content-addressed. A
WebAssembly Interface Types (WIT) world is the natural spelling. The import
list a package actually uses is its declared cross-read set and belongs in
the binding identity, where `crossReads` already sits. Then JSONata,
TypeScript and Wasm are three runtime profiles for one contract, and any
front end compiles to the contract.

**Removes.** The coupling between "which language" (open in the design
note) and "what a package is". It lets the compiler of D1 to D8 be tested
against the existing harness with no runtime change.

**Precedent.** CosmWasm's fixed entry points (`instantiate`, `execute`,
`query`, `migrate`), which are `init`, `fold`, `observe` and the design
note's explicit migration; Substrate's runtime stored on chain and replaced
at an exact block, which is `dap.attach` marked `foundation_successor`.
WASI's capability imports with no ambient authority, which are gitseq's six
rules for native helpers. For cliff 5, the jets pattern (Nock, Simplicity),
a jet being a native implementation of a function the base language
already specifies: the helper stays specified in the base language and may
be accelerated natively against that specification, so a model stays
declarative content. On the
runtime side, noted only: the component model and WASI 0.3 (June 2026) let
the contract be spelled once for every source language; the WebAssembly
3.0 deterministic profile (completed September 2025), together with an
engine's fuel metering (wasmtime), makes a pinned profile a formally
specified bytecode rather than an evaluator implementation; a concatenative form is attractive as a canonical,
content-addressable intermediate representation and poor as an authoring
surface.

### Algorithms outside the expression profile: where they live

Chess legality, a scheduling solver, a scoring rule, a matching algorithm:
the views note's cliff 5. The wrong answer is the one dap's shape invites
by default. The general-purpose client is where a full language runs, so
the logic ends up there, and the fold, which alone decides effectiveness,
either accepts what the client proposes or cannot judge it. That is
business logic in the UI, and it breaks the property, because two clients
may compute differently and the fold cannot tell.

The question is whether a decomposition, rather than a runtime profile,
makes this better. Three do. They are not alternatives to a profile; they
decide what must be code in the fold at all, and the profile then decides
how that residue runs.

1. **Solver outside, verifier inside.** Most algorithms in business
   applications are searches: a schedule, an allocation, a match, a price.
   Verifying a proposed answer against declared constraints is cheap and
   declarative even when finding it is not. The solver is a principal, a
   client, an agent or a service, that proposes; the fold verifies the
   proposal against the package's constraints and refuses with a reason.
   This is D10's witness pattern applied to computation, and the precedent
   is every verify-not-compute machine, from NP verifiers to the
   validators of unspent-transaction-output (UTXO) ledgers. It moves the algorithm out of the fold without moving the
   decision out of it.

2. **Obligations as the model's outbound interface.** The Elm
   architecture's lesson: the pure update returns effects as data, and the
   runtime performs them. dap already does this twice by accident: Sale's
   `joinDisclosure` and Club's `effects` are declarations the harness's
   client honours. Make them first-class. A guard may `then oblige` a role
   to an act; the obligation is folded state, offered as an affordance to
   holders of the role, and the fold checks the performing event against
   it. "When X happens, do Y in the outside world" then lives in the
   model, with a client, an agent or a plug as a performer, and the
   performance is a signed event the fold judges. gitseq's request,
   promise, report loop and Woah's task obligation model are this pattern in
   a workroom; the language form is smaller. It replaces the harness hooks
   the spike needed, and it is the natural shape for D13's services. An
   obligation is a contract with a named performer, so when the performer
   fails, blame falls on the performer: the model declared, the client did
   not honour. §1 shows the spike charging four such failures to model
   authors. Two further things Racket names that the spike built by hand:
   a kind's expected-binding identity is a contract on a boundary, and
   `stale_binding` is the contract changing under a signed intent; and an
   audience term that reads prior effective state is a dependent contract,
   Racket's `->i` shape, with the same expressive gain and the same
   complexity cliff. What does not transfer is the checking machinery: a
   Racket contract assumes one runtime where the monitor observes both
   parties, and dap's parties see different things.

3. **Code inside the package, behind a typed interface.** The residue,
   chess legality, a cryptographic check, a parser, is verification that is
   itself the algorithm, and it has to run in the fold. The decomposition
   that keeps it honest is the component one: the code is a module the
   package ships, content-addressed, called from a guard as a pure function
   over explicit inputs, so the compiler still sees what the guard reads
   and D1 applies at the interface although the body is opaque. gitseq's
   rule that a package cannot supply code was a rule about native code
   under a trusted host; for dap it would push exactly this logic into the
   UI. A package should be able to ship portable, sandboxed, bounded code,
   with host jets as an optimization for well-known capabilities, not as
   the gate.

Whether that module is TypeScript hashed by source, as the spike did, or a
WebAssembly component matters for determinism across engines, sandboxing
and bounds, which the deterministic profile, an engine's fuel metering and
the component model's import lists supply, and a TypeScript profile does not
without a pinned evaluator. Daml and Move take the other route, a whole
deterministic language, and get purity by construction at the price of a
new language. The recommendation is the declarative shell of D8 for
everything the compiler must see, readers, guards, obligations, and
package-shipped modules for the residue, under the D9 contract, so that
the module language is a profile decision and not an authoring one.

In model-view-controller terms: the Model is the package, its declarative rules, its modules
and its obligations. The Controllers are the performers of obligations and
the proposers of witnesses: clients, agents and services, each a principal
with a role. The View is renderers and queries over `observe`. The client
proposes and performs; it never decides.

### D10. Witness-carrying intents, later

**What.** `expected_binding` and `expected_activation` are already
witnesses: claims the fold verifies rather than computes. An application
intent could carry the positions and header hashes of the facts it rests
on, so that more refusals become header-checkable by every reader
(`no_such_offer` becomes "no position commits to that id"). Bitcoin Script,
Simplicity and the UTXO family are verify-not-compute machines of this
kind. The cost is larger events and a submitting client that must fold to
produce the witness. It does not replace D1, because a witness reveals
positions, not hidden content. Worth a fixture after D1 to D6 land.

## 4. What in the discussion does not transfer

- **Recording normalized effects at commit time.** The discussion's
  cleanest idea, "execute the method once, store its effects, fold the
  effects", assumes a trusted executor. In dap the sequencer never folds and
  every viewer folds its own view under pinned semantics. Effects computed
  by a submitter would be an attestation, not a fold, and would change the
  trust model. D10 keeps the verifiable part.
- **Entity-centric objects with derived fields.** Right for uniform
  visibility (cliff 1), which the views note calls free and the spike did
  not measure. Silent on
  cliffs 2 and 3, where the spike's cost was. Keep the syntax, change the
  unit (D8).
- **Virtual actors, supervision, dataspaces.** Runtime and client
  concerns. Syndicate's facets are a good model for how a general-purpose
  client presents "my participation in this context" over `observe`, not
  for the package language.

## 5. Does this generalize? A sweep of the original use cases

The spike chose three partitioned models on purpose, so its cost finding
is a finding about partitioned visibility. This section sweeps the use
cases dap was designed for, from the design note's thesis and boundary
table, the views note's application table, the soft-edges paper, Woah's
task and workshop notes (the `woo/` repository), and gitseq's own
applications, and asks of each:
what is the visibility shape, what would the author have to notice, does
the spike's cost class apply, and which directions cover it.

The columns: **shape** is the views note's vocabulary; **spike class** is
whether the repairs of §1 would recur; **other cost** is what the author
must get right that the spike never measured; **covered by** names the
directions, with new ones introduced below the table.

| Use case | Shape | Spike class recurs? | Other cost | Covered by |
|---|---|---|---|---|
| Discussion channel; soft-edged room (join briefly, read, contribute, leave) | uniform | no, except the newcomer backlog, which the soft-edges paper makes the point of the exercise | leaving and rejoining; audit of who held what rights when, which the spine already gives | D2 as the default, D8 |
| Kanban with private cards and a WIP limit | partition, one count per column | yes: the WIP guard reads private cards | none beyond the split | D1, D3, D4 |
| Task workflow with handoff, typed per-phase artifacts, reviews (Woah workshop) | uniform within a team, role-gated transitions | no | a lifecycle statechart; derived predicates over children; **policy layered on later** ("two reviewers", "CI must pass") that narrows an existing kind's guard | D4, D5, D8, **D11** |
| Multi-agent workroom (gitseq) | uniform | no | thirteen kinds and an authority table; status as a decision function over the whole log; references that point backwards and propagate staleness; ceremony, measured at 35 of 48 records; affordances that drift from the fold, measured in the toolbar | D4, D5, D6, D8, **D11** for composite acts |
| Roles-heavy organisational workflow (reporter, triage, release manager, human-in-the-loop gates) | uniform | no | authority richness, quorums and gates as guards; policy layering | D5, D8, D11 |
| Chess and rule-heavy games | uniform | no | the fold is the rules: an algorithm outside any expression profile; clocks | D7, D9 modules and jets; guards must admit opaque pure helpers over explicit inputs so D1 still sees what they read |
| Poker and hidden-information games | partition plus a shared decision over hidden hands | yes | commit-and-reveal: the header commitment already exists and `dap.disclose` is the reveal; randomness and fair dealing need a dealer as an observe actor and trust in it; salted commitments against small domains, which the nonce gives | D1, D3, D6, D7; the fairness trust is a design boundary, not a language cost |
| Room booking; multi-room with building capacity | partition; the multi-room case is **cross-context** | yes for one room; the allocator adds a class the spike never counted | admit assertions from room contexts into an allocator, or joined scopes; a non-monotone constraint that needs one owner | D1 to D3, D7, **D12** |
| Sale that accumulates inspection, negotiation, escrow, search and comment packages | partition; **composition across packages** | yes for the sale; the extension packages add cliff 7 | two handlers for one kind with declared cross reads; escrow is money and an external settlement | D1 to D6, **D11**, **D13** |
| Club with dues and other admission policies | partition, role-derived, retroactive | yes | policy variants as composable packages | D1 to D3, D6, D11 |
| Trip planning | mostly uniform, private sub-threads, external bookings, a shared budget | weakly | breadth of small kinds; external services; itinerary time; presentation | D7, D13, **D14** |
| Insurance claim; hospital episode | strict field-level partition across organisations; late-assigned parties; audit | yes, strongly, and the trusted-evidence route becomes common: certificates, lab results | attestations with pinned issuers; each organisation its own context, so **cross-context**; sensors and devices as principals; erasure demands that immutable history cannot meet | D1 to D3, D6 with attestation first-class, D7, D12, D13 |
| Project tasks with bounded budgets; two projects sharing one budget | uniform per project; **cross-context** for the shared budget | no | resource accounting; a non-monotone invariant spanning contexts, which the boundary test says needs one owner | D4, D12 |
| Intent-first interaction, rendezvous, tear-offs (vendor relationship management, soft edges) | one room with private threads, or separate contexts adopting one origin | weakly | **lifecycle**: origin rule, join policy at the route, roles granted on join, close and spawn rules; today these live in harness scripts, not in the package | **D15** |
| Inventory (gitseq) | uniform | no | one numeric guard | D8, free |
| External data surfaces: feeds, sensors, LLM agents (Woah blocks and plugs) | uniform | no | the external system as a principal with an observe capability and a declared fact shape; freshness | D7, **D13** |
| Business merger, joined scopes | cross-context | not measured | the join protocol and reconciliation rules | D12 |

Five directions the sweep adds:

**D11. Policy packages that refine existing kinds.** A package attached
later may narrow the guard of a kind another package owns, add a required
approval, or fuse two acts into one composite. The design allows two
handlers per kind with a declared order and declared cross reads; the
language needs a form for "refine guard of `k` with `G'`" whose readers the
compiler checks as in D1, and a form for one message that asserts several
facts atomically. This is the evolvability goal exercised by an author, and
the spike never authored one.

**D12. Cross-context forms.** Typed exports and admits: "this context
asserts `fact` at head `h`" and "admit `fact` from source `S`, trusting
issuer `I`", compiled to `dap.admit` with the source-prefix binding and the
genesis-pinned trust. The compiler applies the design note's boundary test
as a diagnostic: an invariant that reads facts from two contexts and is not
monotone needs one owner. The design note's boundary test speaks of a
shared exclusive right needing one owner; reading it as a monotonicity
check is this note's framing, and the result it rests on is CALM,
consistency as logical monotonicity, from Bloom.

**D13. External systems as principals, and obligations.** A "service"
form: a named principal, the `dap.observe` fact shapes it may assert, and
the obligations it performs outside the context (§3, algorithms
subsection). Woah's blocks and plugs are the precedent. Idempotent retry
already exists at the ordering layer.

**D14. Presentation declarations.** An `anchor` (title, summary, status,
attributed to the context) and thread grouping, compiled into `observe`.
The narrative note records the anchor as implemented nowhere and typed
affordance targets as missing; D5 supplies the targets, D14 the anchor.

**D15. Lifecycle declarations.** Origin rule, join policy at the route,
grants on join, close rule, spawn and tear-off rules, as part of the
package rather than of the harness. Compiled to genesis bindings, the
serving party's invitation policy and close guards. Cheap per item and,
like ambient inputs, easy to forget.

### What the sweep says about the thesis

The claim in §1, "every repair was a visibility error", is true of the
spike and does not generalize as "visibility is the cost". It generalizes
as three claims.

1. **Where views are partitioned, the spike's cost class recurs, and D1 to
   D3 remove it.** That covers sale, booking, club, kanban with private
   cards, poker, claims and hospital episodes, and private negotiations.
   For uniform-visibility use cases D1 to D3 are inert and cost nothing.
2. **The newcomer backlog is universal, not a Sale quirk.** Every
   soft-edged use case, and every partitioned one, needed effective public
   facts to be readable by later joiners. D2 should be the default audience
   for public application kinds, with members-as-of-position the declared
   exception.
3. **Outside partitioned visibility, four costs dominate, and the spike
   measured none of them:** composition and policy layering (D11),
   cross-context protocols (D12), external systems and ambient inputs (D7,
   D13) and lifecycle (D15). The views note's cliffs 5 to 7 are where the
   broad set lives; cliffs 8 to 10 should be added for cross-context,
   lifecycle and external systems. Guard declarativeness with derived
   affordances (D5, D8) and a typed contract with jets (D9) apply across
   both groups, and gitseq's toolbar drift is independent evidence for D5.

### A broader authoring corpus for the next spike

To test generalization rather than assume it, the rerun in §6 should add
three models chosen for the untested axes, each with its own manifest under the
spike plan's §4.3 counting convention, and each repair classified by the §1 classes
plus composition, cross-context, lifecycle and external:

- **a task workflow with a policy package attached mid-stream** that adds a
  second required reviewer: composition (D11) under uniform visibility;
- **two room contexts and a capacity allocator**: cross-context (D12) and
  a non-monotone invariant with one owner;
- **a claim with a registrar attestation and a late-assigned adjuster**:
  attestation as first-class (D6), retroactive access (D2), field-level
  budget (D3).

Prediction to record before running: the D1 to D3 diagnostics fire on the
claim and not on the workflow; the workflow's and allocator's repairs fall
in classes the compiler does not yet see. If that prediction fails in the
other direction, the compiler covers more than this note claims. If the
composition and cross-context repairs exceed the budget, that is the
residual cost of the design, and the note that reports it should say so.

## 6. A next spike: goal 2 under a compiler

1. Write the package contract of D9 as types the existing harness accepts;
   the flat descriptor is already close.
2. Implement the smallest compiler for the fact, readers, guard and
   invariant form of D8, emitting flat descriptors. D1 to D6 are its
   checks and derivations; D7 may wait.
3. Re-run the spike plan's §4.5 protocol: a fresh agent authors Sale,
   Booking and Club in the source form from the unchanged manifests, and
   the three models of §5 from new manifests frozen before their
   baselines. Count repairs under the plan's §4.3, classified by the §1
   classes plus composition, cross-context, lifecycle and external. Record
   source lines against emitted lines.
4. Acceptance. The compiler rejects the recorded Sale baseline with the
   position-18 diagnostic and the counter-audience diagnostic; rejects the
   Club policy with the unjudgeable-reference diagnostic; the authored Sale
   passes 200 of 200 seeds within the original budget of two repairs and
   one kind. The harness, manifests, checker and corpora are unchanged, so
   the result compares directly with the landed ledgers.

If step 4 fails, the note that reports it should say which repairs the
compiler still could not see, because that is the residual authoring cost
of the design rather than of the language.

## References

- ChatGPT discussion, "Explore VM Event Sourcing Correspondence":
  https://chatgpt.com/share/6aadd67d-1f34-83ea-a017-029956363696. It
  covers the VM and event-sourcing duality, a compiler from behaviour models
  to a transition IR, Syndicate, E, Self and Newspeak, Napier88, Emerald and
  Obliq, Dedalus and Bloom, and OTP, Elixir and Gleam as authoring surfaces.
- Daml ledger model, privacy and projections:
  https://docs.daml.com/concepts/ledger-model/ledger-privacy.html
- Viaduct (Acay, Recto, Gancher, Myers, Shi, PLDI 2021):
  https://www.cs.cornell.edu/andru/papers/viaduct/viaduct.pdf
- Racket contracts: Findler and Felleisen, "Contracts for Higher-Order
  Functions" (ICFP 2002); Dimoulas, Findler, Flanagan and Felleisen,
  "Correct Blame for Contracts: No More Scapegoating" (POPL 2011):
  https://www2.ccs.neu.edu/racket/pubs/popl11-dfff.pdf; Takikawa, Feltey,
  Greenman, New, Vitek and Felleisen, "Is Sound Gradual Typing Dead?" (POPL
  2016): https://popl16.sigplan.org/details/POPL-2016-papers/19/Is-Sound-Gradual-Typing-Dead-
- Jif: https://www.cs.cornell.edu/jif/
- Choreographic programming: HasChor (ICFP 2023)
  https://arxiv.org/abs/2303.00924; Choral https://www.choral-lang.org/;
  MultiChor, "Efficient, Portable, Census-Polymorphic Choreographic
  Programming" (Bates, Kashiwa, Jafri, Shen, Kuper, Near; arXiv, 2024).
- CALM: Hellerstein and Alvaro, "Keeping CALM: When Distributed Consistency
  Is Easy", CACM 2020: https://arxiv.org/abs/1901.01930
- Miniscript: https://bitcoin.sipa.be/miniscript/ and
  https://blog.blockstream.com/miniscript-streamlined-bitcoin-scripting/
- Simplicity on Liquid:
  https://blog.blockstream.com/simplicity-launches-on-liquid-mainnet/;
  Nock and jets: https://docs.urbit.org/
- Elm architecture: https://guide.elm-lang.org/architecture/; Move:
  https://move-language.github.io/move/; Clarity: https://clarity-lang.org/;
  Pact: https://pact-language.readthedocs.io/
- Substrate runtime upgrades: https://docs.substrate.io/maintain/runtime-upgrades/
- CosmWasm entry points: https://docs.cosmwasm.com/docs/smart-contracts/entry-points
- WebAssembly component model: https://component-model.bytecodealliance.org/;
  WASI 0.3: https://bytecodealliance.org/articles/WASI-0.3
- WebAssembly 3.0 specification: https://webassembly.github.io/spec/core/;
  wasmtime deterministic execution:
  https://docs.wasmtime.dev/examples-deterministic-wasm-execution.html
- gitseq notes at 8e77fc25: the JSONata-with-DDL interface
  (../../gitseq/notes/2026-08-26-jsonata-ddl-application-interface.md),
  stable extensions
  (../../gitseq/notes/2026-08-27-jsonata-ddl-stable-extensions.md),
  the first ontology (../../gitseq/notes/2026-08-08-first-ontology.md),
  composite kinds (../../gitseq/notes/2026-08-20-composite-kinds.md), and
  docs/why.md; gitseq-inventory README beside this repository.
- Woah notes, in the `woo/` repository beside this one:
  notes/2026-05-04-task-workflow-model.md,
  notes/2026-05-06-task-obligation-model.md,
  notes/2026-05-06-santas-workshop.md, docs/blocks-and-plugs/README.md.
- Hugh Pyle, *Workspaces with Soft Edges* (2001):
  https://cabezal.com/ppt/soft_edges.pdf
