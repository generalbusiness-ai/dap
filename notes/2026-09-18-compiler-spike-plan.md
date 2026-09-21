---
date: 2026-09-18
revised: 2026-09-20
status: >-
  draft spike plan, revised after codex's review of 2026-09-20 (workroom
  report 1bf0b745, ratified d0c08a31). Not yet approved; it adopts nothing
  and authorizes no implementation. The first draft bundled language
  design, static analysis, code generation, foundation changes and three
  new application domains behind one result. This revision splits that
  into steps with independent stopping points, corrects the acceptance
  gates the review showed to be impossible, and gates the authoring and
  notation steps on the MVP product description Hugh asked for.
origin: >-
  notes/2026-09-18-authoring-language-directions.md §5 and §6; codex's
  review report 1bf0b745 in the dap workroom.
bases: >-
  main e2977c8a; spike/src/descriptor.ts, foundation.ts, script.ts,
  generate.ts, checker.ts; spike/fixtures/{sale,booking,club}.ts;
  spike/manifests/{sale,booking,club}.md and their ledgers;
  spike/corpus/; spike/test/{booking-corpus,sale,club,club-a5}.test.ts;
  notes/2026-09-16-club-admission-decision.md;
  notes/2026-09-15-spike-plan.md, whose conventions this plan reuses.
directions: notes/2026-09-18-authoring-language-directions.md
notation: notes/2026-09-20-notation-spike-plan.md
plan: notes/2026-09-15-spike-plan.md
design: notes/2026-09-14-evolving-spaces-design.md
views: notes/2026-09-14-one-series-many-views.md
---

# Authoring spike plan: three steps with independent stopping points

## In one paragraph

The visibility spike falsified goal 2 with hand-written models. The
directions note says the cost was visibility machinery an author had to
write by hand, and that a compiler could derive it. This plan tests that
in the smallest order that can stop early. **Step 1** builds a
declaration layer on the current foundation, with no parser and no
foundation change: declarations as structured data or a TypeScript
builder, a dependency check over every expression, versioned rows, and
the derivations. It must reproduce the repaired Sale from a declaration,
reject the recorded bad shapes with reproducing scripts, and reject the
original Club as expected. If it cannot, the idea is refuted cheaply.
**Step 2** runs one fresh authoring task with total effort measured from
the first draft, beside a declarative TypeScript control that uses the
same derivations, so that the compiler's help and any new syntax are
measured apart. **Step 3** compares notations under the separate
notation plan. Steps 2 and 3 wait for the MVP product description to say
who authors packages. Composition, admission and the retroactive
audience become their own experiments later, each with its own stopping
point.

## 1. What each step must show

| Step | Claim | Established if | Refuted if |
|---|---|---|---|
| 1 | **A1. The derivations reproduce the repaired Sale.** | A Sale declaration compiles through the layer to a package that passes the unchanged Sale manifest's predeclared cases and 200-seed campaign, with `observe`, affordances, audience rules, backlog and disclosure policy all derived and none hand-written | The declaration cannot express a rule the fixture needs, or the derived package fails a predeclared case |
| 1 | **A2. The check sees what the checker found.** | Each diagnosed shape of §4.2 is refused with the named diagnostic, and the script it carries fails the unchanged checker against the model the table names; each prevention of §4.2 holds under the generator; the original Club is refused with the unjudgeable-reference diagnostic and its A5 script fails the checker | Any diagnosed shape compiles, a script passes the checker (a false positive), a prevention fails under the generator, or Club compiles |
| 1 | **A3. The check is sound on the corpus.** | The derived Sale and a derived Booking pass their campaigns, and no campaign finds a visibility violation the check accepted | A campaign finds a visibility violation in a declaration the check accepted; the report names the expression class the check missed |
| 2 | **A4. Total authoring effort falls.** | A fresh agent authors Sale under §4.4 in the declaration layer; every correction from the first draft is counted, compile-caught and checker-caught alike; the total is at most the landed six semantic repairs, and the compile-caught share is reported | The total exceeds six, or the checker-caught share alone exceeds the original budget of two |
| 2 | **A5. Assistance and syntax are separable.** | The declarative TypeScript control, same derivations and checks and TypeScript surface, is run under the same protocol, and its totals are reported beside the declaration layer's | Not refutable; it is the control that makes A4 interpretable |

Two measurements accompany the claims and are not claims: source lines
against emitted lines, and the number of corrections caught at compile
time against those caught by the checker.

## 2. Order, stopping points and gates

Step 1 first, because it is the technology test of the central claim
and needs nothing from anyone: no parser, no foundation change, no new
domain. Its stopping point is A1 to A3. If A1 or A2 is refuted, the
report says so and nothing further is planned under this note.

Steps 2 and 3 are gated on the MVP product description. If that
description says packages are authored by a few developers from a
catalog, step 2 still runs but its budget is a developer's, not an
agent's, and step 3 may not run at all. If it says agents author
packages on demand, both run as written.

The experiments this draft once bundled are listed in §6 with entry
conditions, and each gets its own plan when it is next.

### Simplifications adopted

1. **No parser in step 1.** Declarations are structured data or a
   TypeScript builder API. The syntax question is step 3's.
2. **No foundation change in step 1.** No `dap.admit`, no `roster`, no
   resolution that omits a handler. Those belong to the deferred
   experiments.
3. **Code generation to fixture modules**, so package identity, the
   descriptor rules, the ledger convention and the harness stay as they
   are, and emitted lines are countable.
4. **Sale first, Booking second, Club as an expected rejection.**
5. **Prevention and detection are two tests.** A derived client policy
   is tested by running the generator under it and finding no private
   disclosure; the recorded corpora stay detected violations, as the
   Booking corpus test already asserts.
6. **Total effort from the first draft**, the first spike's boundary,
   with compile-caught corrections as their own class.

## 3. Fixture decisions

The first plan's decisions stand unless a row replaces one.

| Decision | Choice | Why | Does not claim |
|---|---|---|---|
| Declaration layer | `spike/lang/`: a typed builder or structured-data schema for roles, tables with columns, acts with guards and effects, invariants and queries; one command emits a fixture module in the shape of `fixtures/sale.ts` with the source id and layer version in `config` | Everything a compiler must see, without a parser | A surface syntax |
| Readers | Two annotations per row and per column: `readers` at recording and `max` readers after disclosure; role membership is evaluated at the event's position from grants strictly before it, and a later grant never widens an earlier event's readers | D3 needs both; the grammar sketch supplied one | Per-field encryption |
| Dependency check | Every expression that feeds state, an audience, a query result or an affordance carries a dependency set of the rows and relations it reads. Containment, `readers(act) ⊆ readers(dependency)`, is checked for guards, effects, derived columns, queries and affordances alike. An absence test or an aggregate depends on the whole relation, so the relation's readers must contain the act's readers, which is the completeness condition | The review's example: a public column `total = count(private_table)` passes a guard-only check and gives readers different public state | Soundness beyond the corpus; A3 bounds it |
| Versioned rows | An assignment is a row version keyed by the producing position; the visible value is the latest visible version; a disclosure inserts a version at its original position and never overwrites a newer one | Equal verdicts do not make assignments commute; the Sale fixture keeps versions and picks the latest visible, and the layer states that rule | Anything about performance |
| Diagnostics | Name the act, the expression, the dependency, the reader who diverges, the reason that would differ, and a reproducing `Step[]` script the unchanged checker must find failing against the model named | Executable diagnostics | Short scripts |
| Derivations | Audience rule per kind, total over runtime JSON; the split of mixed-reader columns into public and private kinds with linkage; the disclosure policy from `max`; the backlog kinds from the dependency graph; `effects` for grant effects; guard order; `observe`; affordances derived from the same guards the fold uses, so that offered and possible coincide; budget and invariant functions that run beside the manifest's | D3 to D6; the review found offered and possible differ in the landed Sale | Minimal derivations |
| Club | The original policy is an expected rejection; a public-record or trusted-evidence Club is a separately changed experiment under the first plan's §4.7 | The decision note; the review | That Club can be rerun unchanged |
| Counting | Total corrections from the first draft; each classified by the directions note's seven classes, by whether compile-caught or checker-caught, and by blame: fold defect, or a declaration constraining a client | The first spike's boundary; the blame subsection of the directions note | That the budget of two carries over unchanged; A4 states the comparison |
| Control | A declarative TypeScript builder with the same derivations and checks, authored under the same protocol by a second fresh agent | Separates assistance from syntax | Anything about which is better to read; step 3 |
| Harness | Unchanged; one loader test for emitted modules | The measurement must be the same | Anything about the deferred experiments |

## 4. Predeclarations

### 4.1 Counting convention

The baseline is the first draft, before any compile, checker run or
inspection of output, as in the first spike. A correction is one
semantic change after it, whoever found the need, in three
classifications: the directions note's seven classes plus composition,
cross-context, lifecycle and external; compile-caught or checker-caught;
and blame, a fold defect or a declaration that constrains another party.
The report gives totals by each.

### 4.2 Diagnosed shapes, preventions and expected rejections

The builder writes each recorded shape in the declaration layer from the
ledgers and commits it under `spike/lang/baselines/`.

| Shape | Source | Required diagnostic | Script must fail the checker against |
|---|---|---|---|
| Sale: an accept guard reads stubs recorded under `members` | Sale ledger fix 2; prediction 1 | containment on `accept` reading `offer`; the newcomer judges `no_such_offer` where the oracle says `already_decided` | `corpus/sale/run1/seed-72.json`, Erin at 8, and manifest case 3, against the run-1 model |
| Sale: a withdrawal of an unread stub is effective | Sale ledger fix 3; prediction 2 | absence over `offer` without completeness: the reader lacks rows, so "no such stub" is unjudgeable | `corpus/sale/run1/seed-96.json` at 17 and `seed-172.json` at 18, against the run-1 model |
| Sale: a counter's readers from its payload | Sale ledger fixes 1 and 7 | audience from payload | the baseline package at `fd1e23b`, Bob at 10; `corpus/sale/run6/seed-172.json`, 181 or 200 against the kept run-6 model |
| Sale: a counter addressed by a payload `author` field | Sale ledger fix 5 | self-asserted reference | V3-F2's steps against `corpus/sale/run1/model.ts` |
| Club, original policy | decision note A5 | unjudgeable reference: `vote` (members) holds `ref application` whose readers are applicant and committee, and the guard needs the row's kind | the A5 cases in `test/club-a5.test.ts` |

Club A1 is a missing business guard, not a visibility error; the layer
is predicted not to catch it, and its test in `test/club.test.ts` bounds
what the check can see.

**Preventions.** A derived declaration is tested by prevention, since a
policy cannot change a recorded event.

| Derived | Source | Prevention test | Detection stays |
|---|---|---|---|
| Booking's disclosure policy with authorized-only | Booking fixes 1 and 2 | the generator under the derived policy produces no private disclosure across 200 seeds | every entry of `corpus/booking/run2/` remains a detected violation, as `test/booking-corpus.test.ts` asserts |
| Sale's backlog | Sale fix 2 | the derived backlog, with the absence rule above, clears run-1 signatures 1, 2 and 4; signature 3 is cleared by the absence rule alone | the run-1 corpus remains detected against the run-1 model |

### 4.3 Predictions, recorded before any run

1. A1 holds and the derived Sale is under a fifth of the fixture's 389
   lines of hand-written source.
2. Every §4.2 shape is refused and every script fails the checker.
3. A3 holds on Sale and Booking; if it fails, the missed class is an
   aggregate or an absence, not a guard.
4. In step 2 the total is at most six, and at least four of the six are
   compile-caught.
5. The TypeScript control's total is within one of the declaration
   layer's, which would mean the derivations and not the syntax carry the
   result.

### 4.4 Authoring protocol

As the first spike's §4.5: a fresh agent per model, given the design
note §§1 to 4 and §8, the views note, the layer's README with Discussion
as the worked example, the harness README and the frozen manifest; it
may run the layer and sees each diagnostic's text and script, not the
checker's verdict on it; it may not run the checker, the invariant tests
or the campaign before the first draft is committed; it is not given the
directions note, the landed fixtures or the ledgers. Recorded: the first
draft; every correction under §4.1; source and emitted lines.

## 5. Work breakdown

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| A1 Declaration layer | This plan approved | The builder or schema, the dependency check over all five expression sites with completeness for absence and aggregates, versioned rows, the derivations, the emitter, the loader test; the layer's README | Checker verifies the dependency rule against the review's counterexamples and the versioning rule against the Sale fixture |
| A2 Reproduce and reject | A1 | A Sale declaration whose emitted package passes the unchanged Sale manifest; a Booking declaration likewise; the §4.2 shapes committed and refused with scripts that fail the checker; the preventions holding; Club refused; one derived audience rule broken and found by the checker; A1 to A3 decided | Checker reproduces one result table and two scripts |
| Stop | A2 | If A1 or A2 is refuted, the report and nothing more | |
| A3 One authoring task, with control | A2, and the MVP description's answer on who authors | Sale by a fresh agent in the layer and by a second fresh agent in the TypeScript control, both under §4.4; totals by class, catch site and blame; A4 and A5 decided | Checker verifies the ledgers and the class assignments |
| A4 Notation | A3, and the MVP description's answer | The notation plan's N1 to N4 | As that plan says |
| A5 Report | A4, or the Stop | Claims and predictions first; per-step tables; what the check missed; what is not established | Checker verifies every claim against committed runs |

## 6. Deferred experiments, each with its own plan when it is next

- **Composition.** A policy package refining another's kind. Needs the
  foundation change the review confirmed: a resolution may omit a
  handler, because `attach` requires the union and `dispatch` makes a
  kind effective when any handler accepts. Entry: A2 held.
- **Admission.** Two rooms and an allocator over admitted facts. As
  drafted it is admission filtering: an over-capacity occupancy stays
  effective in its room and only its import is refused. Whether an
  allocator should approve before a room finalizes is the design
  question to settle first. Needs `dap.admit` folded. Entry: a written
  answer to that question.
- **Retroactive audience.** `roster`, spine when effective and otherwise
  as `members`, with re-frozen manifests and disclosure events counted.
  Entry: A2 held and the MVP description wanting late joiners to read
  public history.
- **A revised Club.** Public record or trusted evidence, as the decision
  note sets out. Entry: a decision to change Club's privacy promise.

## 7. Out of scope, and why

- A surface syntax: step 3's question, under its own plan.
- The runtime, WebAssembly, helper modules, the MCP surface, obligations,
  presentation, lifecycle beyond origin and close.
- Any foundation change: none is needed for step 1, and each deferred
  experiment names its own.
- Human comprehension, which is goal 3.
