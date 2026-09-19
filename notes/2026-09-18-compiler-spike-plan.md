---
date: 2026-09-18
status: >-
  draft spike plan. Not yet reviewed or approved; it adopts nothing and
  authorizes no implementation. It turns §6 of the authoring-language
  directions note into fixture decisions, predeclarations and a task
  breakdown, in the form of the first spike plan, so that a checker can
  review it against the same conventions.
origin: >-
  notes/2026-09-18-authoring-language-directions.md §5 (the broader
  corpus) and §6 (the next spike), at main af17c061.
bases: >-
  main af17c061; spike/src/descriptor.ts, foundation.ts, script.ts,
  generate.ts, checker.ts; spike/manifests/{sale,booking,club}.md and
  their ledgers; notes/2026-09-16-club-admission-decision.md;
  spike/corpus/ and spike/test/{sale,club,club-a5}.test.ts, which §5.2
  cites; notes/2026-09-15-spike-plan.md, whose conventions this plan
  reuses and does not restate.
directions: notes/2026-09-18-authoring-language-directions.md
plan: notes/2026-09-15-spike-plan.md
design: notes/2026-09-14-evolving-spaces-design.md
views: notes/2026-09-14-one-series-many-views.md
---

# Compiler spike plan: goal 2 under a compiler

## In one paragraph

The visibility spike falsified goal 2 with hand-written TypeScript models.
This spike asks whether a small source language and a compiler change
that result, using the same harness, checker, manifests and corpora, so
that the two measurements compare directly. The compiler reads a package
written as roles, tables with readers, acts with guards, invariants and
queries; checks every guard for reader containment; derives the audience
rules, the kind split, the disclosure policy, the newcomer backlog,
`observe` and the affordances; and emits an ordinary fixture module. Every
diagnostic it raises carries a script the unchanged checker can run, so a
false positive is detectable. Four claims are predeclared with the
conditions that refute them, and three new models extend the corpus to
the axes the first spike did not measure: composition, cross-context and
attestation. Two arms separate the language's effect from a foundation
change: arm A keeps the foundation and derives each model's join
disclosure; arm B adds the retroactive audience and re-freezes the
manifests as a new experiment.

## 1. What the spike must show

Each claim names its refutation. A claim that is refuted is reported as
refuted; the spike does not add mechanism to rescue it.

| Claim | Established if | Refuted if |
|---|---|---|
| **C1. The compiler sees what the checker found.** | Given the recorded baseline shapes of §5.2, the compiler refuses each diagnosed shape with the named diagnostic, and the script each diagnostic carries fails under the unchanged checker against the uncorrected model named there; for each listed derivation, the derived declaration applied to the kept model clears the corpus named | Any diagnosed shape compiles without the named diagnostic, a diagnostic's script passes the checker (a false positive), or a derivation fails to clear its corpus |
| **C2. Authoring cost falls within the original budget.** | Sale, Booking and Club, authored by a fresh agent in the source form from the unchanged manifests under §5.5, pass their predeclared cases and 200-seed campaigns with at most two post-baseline repairs and one added kind per constraint (the first plan's §4.3 budget), and the emitted descriptors pass the existing tests | Any of the three needs more than the budget, or a post-baseline repair is of a visibility class the compiler should have seen (§5.1) |
| **C3. The residual cost is where §5 of the directions note says.** | For the three new models, the D1 to D3 diagnostics fire on the claim model and not on the workflow model, and the workflow's and allocator's post-baseline repairs fall in the composition, cross-context, lifecycle or external classes | The prediction fails in either direction; either is reported as the finding |
| **C4. The harness is unchanged in what it measures.** | The property, the pause rule, the invariants and the privacy budgets are evaluated by the existing checker over emitted descriptors with no checker change. The manifests' own budget and invariant functions remain the measurement; the compiler's generated ones run beside them and must find the same violations | The checker had to change to accept an emitted package, or a generated function disagrees with the manifest's |

Two measurements accompany the claims and are not claims: source lines
against emitted lines per model, and, in arm B, the number of disclosure
events removed from each campaign by the retroactive audience.

## 2. Order and rationale

The compiler comes first, because C1 is checkable against the recorded
baselines before any agent writes anything, and because a compiler that
cannot reproduce the first spike's findings would make C2 uninteresting.
The reruns of the three landed models come next, under the unchanged
manifests, so that C2 compares with the landed ledgers. The three new
manifests are frozen while the reruns proceed, and their authoring
follows. Arm B runs last, on re-frozen manifests, because it changes the
foundation and the readability every manifest predeclares.

### Simplifications adopted

1. **Code generation, not interpretation.** The compiler emits a
   TypeScript fixture module of the same shape as `fixtures/sale.ts`,
   committed as the snapshot for each checker run. Package identity, the
   descriptor rules, the ledger convention and the harness stay as they
   are, and emitted lines are countable.
2. **A hand-written parser over a small fixed grammar.** The source form
   is the D8 shape of the directions note, fixed in §3 for this spike. No
   parser generator, no extensibility, no editor support.
3. **The package contract is the existing descriptor.** D9's typed
   contract is written down as a document in `spike/lang/CONTRACT.md`
   naming the exports and host imports the emitted module may use, and
   checked by a test that the emitted module uses nothing else. No
   WebAssembly, no WIT tooling.
4. **Derived backlog in arm A; the foundation changes only in arm B.**
5. **Composition by rebinding**, with one foundation change so that a
   resolution may omit a handler (§3, composition).
6. **Trusted admission**, with the three additions §3 names, and no
   verification against the source chain.
7. **Queries as functions**, no SQL engine and no transport.
8. **One author per model**, the first spike's protocol; the measurement
   is repairs, not people.

## 3. Fixture decisions

Each row is a decision, the reason, and what it does not claim. The
first plan's decisions stand unless a row here replaces one.

| Decision | Choice | Why | Does not claim |
|---|---|---|---|
| Source form | One file per package, `spike/lang/models/<name>.dap`, in the grammar below | The D8 shape; small enough to parse by hand | A general language, a stable grammar, or editor tooling |
| Compiler | `spike/lang/`: parse, resolve, check, derive, emit; one command, `node lang/compile.ts <file>`; deterministic output | One pipeline to test and to cite | Incremental compilation or a language server |
| Emitted module | `spike/fixtures/generated/<name>.ts`, exporting a `PackageDescriptor` in the shape of the hand-written fixtures; header comment names the source content id and the compiler's module hash | The harness reads it as it reads any fixture; identity rules unchanged | Readable code beyond what a reviewer needs to check a diagnostic |
| Package identity | The descriptor's own rules over the emitted module, plus the source's content id and the compiler's module hash in the descriptor's `config`, so that a ledger can cite them without hashing the module | Two authors with the same source get the same package; a compiler change changes every package | Identity across compilers |
| Audience terms | `spine`; `members` (as of the position); `roster` (arm B only: `spine` when the verdict is effective, otherwise exactly as `members`, so refusals stay as readable as today); a set built from roles and from fields of rows the act names, such as `{author, sale.seller}` | The containment check needs a lattice it can compare symbolically; a set that names a row field is evaluated from effective state, never from the payload | Per-field encryption or any audience the foundation cannot express |
| Containment check | For each act `a` and each fact `f` its guards read: `readers(a) ⊆ readers(f)`, evaluated over the terms above with the join rule; `members@n ⊄ members@t` for `n > t` unless `f` is backlog; a failed check is a diagnostic | The directions note's D1 | Soundness beyond the corpus; §7 reports what the campaigns found that the check did not |
| Diagnostic | Names the act, the fact, the reader who diverges, the reason that would differ, and a **reproducing script**: a `Step[]` in the harness's own vocabulary that the unchanged checker runs against the uncorrected model and must find failing | Turns a static claim into an executable one, and makes false positives visible | That every diagnostic has a short script; a script may be long |
| Derivations | Audience rule per kind, total over runtime JSON; the split of one table with mixed column readers into a public kind and a private kind with a linkage rule; the disclosure policy from maximum readers; the backlog kinds from the containment graph (arm A) or none (arm B); the `effects` config for grant effects; a canonical guard order, broadest audience first; `observe` as rows at visible positions with cells masked by readers; `affordances` as the acts whose guards can pass for the principal, as kind names, since the contract returns kind names and typed targets are out of scope; budget and invariant functions that run beside the manifest's | The directions note's D3 to D6 | That any derivation is minimal; a derived join disclosure may over-disclose within the budget, and the report counts it |
| References | `ref <table>` fields resolve through effective rows; where the referring act's readers cannot read the row, the compiler resolves the position by header commitment and the authority at it, as the Club fixture does; where a guard needs the row's content, a diagnostic names the two routes of the Club decision note | D6 | A general reference language |
| Ambient inputs | `clock` compiles to `dap.observe` by a declared actor with the maximum-of-ticks rule; `draw` is out of scope | D7, as far as Booking needs | Randomness or commitments |
| Backlog, arm A | The compiler emits `config.joinDisclosure` for the backlog kinds; the harness's client honours it as today | Keeps the foundation and the manifests unchanged for C2 | Anything about ceremony |
| Backlog, arm B | The foundation recognizes audience id `roster` in `foldEntry`, between the verdict and the audience block: `spine` if the verdict is effective, otherwise the `members` audience; the six manifests are re-frozen with `roster` where they said "members when recorded, subject to disclosure" | D2 in its foundation form; the smallest change, since the bootstrap entitlement already delivers the spine and the `Audience` type needs no new member; effective events grow more readable, refusals do not change | That `roster` is the production audience; a new experiment under the first plan's §4.7 |
| Composition | `policy <name> refines <package>` in the source; the compiler emits a package whose model wraps the refined kind's guard with the policy's, attached with a resolution that names only the wrapper as handler; the wrapper's readers are containment-checked against the original's | `dispatch` makes a kind effective when any handler accepts, so a second handler cannot veto; and `attach` requires a resolution to name the union of handlers, so a wrapper cannot replace the original. C1 adds one foundation change: a resolution may omit an existing handler. The omission changes the binding id, which is what makes an in-flight advance `stale_binding`. The design note's "effectiveness is per handling model" leaves veto undefined | That independent packages can compose without one seeing the other's source; the report raises the veto question for the design note |
| Admission | `admit <fact> from <source> trusted <role>` in the source; the foundation folds `dap.admit` `{source_genesis, source_head, statement}` as the named kind with the admitter as actor, under that kind's binding audience, effective only if the admitter holds `dap.admit` and the source genesis is named in the destination genesis; no source verification. Three additions, all in C1: a genesis field `admits: [{source_genesis, admitters}]`, a payload validator for `dap.admit`, and the folding itself, since today the kind is `not_in_v1` and its `declared` audience falls back to `members` | Design note §9 makes whose assertions a model admits the model's folded rule and pins trusted attestation in the genesis for scope transfer; the plan borrows the transfer rule because a folded rule here would be a list of principals, and pinning it makes admission verifiable without a fold | Verified imports, joins, or scope transfer, which O4 covered separately |
| Queries | `query <name>(<params>) = <select>` over the package's tables; compiled to a function `(principal, basis, args) → rows` over the projected tables; the property test compares its result over the view fold and over the oracle | D4's functional interface, in the smallest form | SQL, MCP, or any transport |
| Reason vocabulary | Reasons are declared on guards or derived from status branches; the compiler refuses a package whose reasons are not a subset of the manifest's | The checker compares reasons | A general reason language |
| Harness | Unchanged for the reruns: `Context`, `interpretView`, `checkContext`, `generate`, the scripts and the shrinker. Additions, each named in a task exit: the `roster` audience id (arm B); `dap.admit` folding; a resolution that may omit a handler; a test that loads emitted modules; and, for the allocator only, a driver that steps three contexts from one script, builds each admit from a room's real head, evaluates the cross-context invariant on the allocator's oracle state, and shrinks the combined script | C4 | Anything about the ordering spike's code |

### The grammar, sketched; fixed at C2's exit

```text
package   := 'package' name text? roles lifecycle tables acts invariants queries policies? admits?
roles     := 'roles' (role text?)+
lifecycle := 'lifecycle' ('opens with' act 'an origin')? ('closes with' act)? ('after close' text 'reason' reason)?
tables    := 'tables' table+
table     := name 'readers' audience column+ | name '(' column* ')' ('at most one row')? 'readers' audience
column    := name type ('primary key')? ('nullable')? ('readers' audience)? ('=' expr | 'from' act)?
audience  := 'spine' | 'members' | 'roster' | '{' (role | field) (',' (role | field))* '}'
acts      := 'acts' ('common' guard+)? act+
act       := target '.' name 'by' (role | field) '(' param* ')' ('readers' audience)? guard+ 'then' effect+
guard     := 'when' expr 'else' reason ('|' reason)*
effect    := 'insert' table '{' assignments '}' | 'update' table 'set' assignments | 'grant' role 'to' expr
invariants:= 'invariants' expr+
queries   := 'queries' (name '(' param* ')' '=' select)+
select    := 'select' fields 'from' table ('join' table 'on' expr)? ('where' expr)? ('order by' field)?
policies  := 'policy' name 'refines' package ('act' target '.' name guard+)+
admits    := 'admit' table 'from' source 'trusted' role
expr      := comparisons, boolean connectives, 'exists' table 'where' expr, 'count' '(' table ')', 'every' table ':' expr, field paths, 'actor'
comment   := '--' to end of line
```

Types are `text`, `integer`, `principal`, `ref <table>`, `clock`. A
derived column is `= expr` with `|` alternatives read top to bottom. The
registrar's certificate in the claim model is an ordinary act by the
Registrar role, not an observed fact, so no `dap.observe` form is needed
beyond `clock`. C2's exit fixes the grammar in `spike/lang/README.md`;
this sketch must cover the D8 sketch of the directions note and the three
manifests of §5.3. Helper functions are out of scope for this spike; a
package that needs one is refused, and the refusal is reported as a
finding under the views note's cliff 5, fold complexity beyond the
expression profile.

## 4. Components

| Component | Responsibility | Satisfies |
|---|---|---|
| Parser | Source text to a syntax tree with positions for diagnostics | §3 grammar |
| Resolver | Names to roles, tables, columns, acts; reference targets; the reason vocabulary against the manifest | §3 |
| Reader checker | Audience terms per row, column and act; containment for every guard; backlog graph; the two-route diagnostic for unjudgeable references | D1, D2, D6 |
| Deriver | Audience rules, kind split and linkage, disclosure policy, backlog config, guard order, `observe`, affordances, budget and invariant functions, query functions | D3 to D6 |
| Emitter | The fixture module, deterministic and formatted; the source id and compiler hash in `config` | §3 identity |
| Diagnostic scripts | For each reader-check failure, a `Step[]` the harness runs; a test asserts the script fails the unchanged checker on the uncorrected model | C1 |
| Contract test | The emitted module uses only the exports and imports `spike/lang/CONTRACT.md` names | D9 |
| Foundation additions | `roster` audience id (arm B); `dap.admit` folding as a named kind under the trust rule; a resolution that may omit a handler | §3 |
| Multi-context driver | Steps three contexts from one script for the allocator; admits from real room heads; the cross-context invariant; shrinking over the combined script | §3 harness row, §5.3 |
| Mutation run | One derived audience rule broken per model and found by the checker, as the first plan's V6 did for hand-written rules | C4 |
| Manifests | The three landed manifests unchanged (arm A) and re-frozen (arm B); three new manifests (§5.3) | §5 |
| Report | Per model: pre-baseline diagnostics by class, post-baseline repairs by class, lines, campaign results; C1 to C4 verdicts; the veto question; what the campaigns found that the checker did not | §7 |

## 5. Predeclarations

### 5.1 Counting convention, extended

The first plan's §4.3 stands: the baseline is the first draft committed
before any checker run, a fix is one semantic change after it, the ledger
is the measurement. Two additions:

- **The baseline is the first draft that compiles.** Diagnostics the
  author resolves before the baseline are recorded in the ledger under
  their own heading, with the diagnostic text and the class, and are not
  fixes. They are the cost the compiler moved before the baseline, and
  the report gives both numbers.
- **Repair classes.** Each post-baseline fix is classified as one of the
  seven classes in the directions note's §1 table, or as composition,
  cross-context, lifecycle or external. A fix counts once as a repair
  under §4.3; if its class is one of the seven, it also refutes C2 on
  its own.

### 5.2 Diagnostics the compiler must produce on the recorded baselines

Before any agent authors anything, the builder writes each recorded
baseline shape in the source form, from the ledgers, and commits it under
`spike/lang/baselines/`. The compiler must refuse each as follows. The
script each diagnostic carries must fail the unchanged checker against
the corresponding kept model in the corpora.

| Baseline shape | Source | Required diagnostic | Script must reproduce |
|---|---|---|---|
| Sale: an accept guard reads stubs recorded under `members` | Sale ledger, fix 2; prediction 1 | containment: `accept` (members) reads `offer` (members at an earlier position); a member joining after the stub judges `no_such_offer` where the oracle says `already_decided` | `corpus/sale/run1/seed-72.json`, Erin at 8, against `corpus/sale/run1/model.ts`; or manifest case 3, Dana at 20 |
| Sale: a withdrawal of an unknown stub is effective (tombstone) | Sale ledger, fix 3; prediction 2 | containment on `withdraw` reading `offer`, and an invariant conflict: an effective withdrawal must name a stub by its author | `corpus/sale/run1/seed-96.json` at 17 and `seed-172.json` at 18, against the run-1 model |
| Sale: a counter's readers taken from its payload | Sale ledger, fixes 1 and 7 | audience from payload: a `readers` set that names a payload field, not a row field | the baseline package at commit `fd1e23b` on the trace, Bob at 10 (fix 1); `corpus/sale/run6/seed-172.json`, 181 or 200 against the kept run-6 model (fix 7); the other six run-6 series are clean under the kept model and are not evidence |
| Sale: a counter addressed by a payload `author` field | Sale ledger, fix 5 | self-asserted reference: a `principal` field where the act names a row whose field supplies it | the steps of V3-F2 (`test/sale.test.ts`) against `corpus/sale/run1/model.ts`, which precedes fix 5; the test as written runs against the kept run-6 model, which already refuses |
| Club: a vote names a commitment that may not be an application | Club decision note, A5 | unjudgeable reference: `vote` (members) has `ref application` whose row readers are applicant and committee; the guard needs the row's kind; the diagnostic names the public-record route and the trusted-evidence route | the A5 cases in `test/club-a5.test.ts` |

Club A1, a second admission of an applicant who already holds Member, is
a missing business guard (decision note, "Why the present schema fails"),
not a visibility error. The compiler is predicted **not** to catch it
(§5.4), and its test in `test/club.test.ts` is cited as the boundary of
what the reader check can see.

**Derivations the baselines lacked.** These are not refusals; the
compiler derives the declaration, and C1 requires the derivation to clear
the corpus named.

| Baseline lacked | Source | Derived declaration | Must clear |
|---|---|---|---|
| Booking: a disclosure policy | Booking ledger, fixes 1 and 2 | the disclosure policy from maximum readers, with authorized verdicts only | every entry in `corpus/booking/run2/`, the 139 seeds that failed the readable-events budget in run 2, applied to the kept run-2 model |
| Sale: the join disclosure | Sale ledger, fix 2 | the backlog kinds from the containment graph (arm A) | `corpus/sale/run1/`, all seventeen, applied to the run-1 model |

If the compiler produces a diagnostic the table does not list on a
recorded baseline, the report records it and the builder checks whether
its script fails the checker; one that does is a finding the first spike
missed, one that does not is a false positive and counts against C1.

### 5.3 The three new manifests, in outline

Each is frozen under the first plan's §4.7 before its baseline, with
promises, privacy or trust budget, projection shape, constraint
inventory, corpus bounds, predeclared cases and a generator. The outline
here fixes what each tests; the manifest fixes the rest.

**Workflow with a policy attached mid-stream.** Uniform visibility; roles
Reporter, Developer, Reviewer, Lead. Kinds: `task.open`, `task.submit`,
`task.review {task, verdict}`, `task.advance`, `task.close`, all
`members`. Promise: a task advances only after one approving review; after
the policy package `two-reviewers` is attached mid-stream, only after two
approving reviews by distinct reviewers, and an advance judged under the
earlier binding is `stale_binding`. Constraint inventory: one composition
constraint. Tests D11 and the veto question. Budget as §4.3. Predeclared
cases: an advance in flight across the attach; two reviews by one
reviewer; the policy attached narrowly to a subset and a shared advance
under it, which the checker must catch.

**Two rooms and a capacity allocator.** Three contexts: room A and room B
as Booking contexts under the landed Booking model, and an allocator
context whose genesis names both room writers as trusted admitters.
Kinds in the allocator: `capacity.set {limit}` (spine), admitted
`occupancy` and `free` facts from each room. Promise: the sum of live
occupancies across both rooms never exceeds the limit at any allocator
frontier, and a room occupancy that would exceed it is `over_capacity` in
the allocator while remaining effective in its room, which the manifest
states as the boundary the design note's §9 table names: capacity needs an
allocator, and a room cannot enforce it. Constraint inventory: one
cross-context constraint. Tests D12: the compiler's boundary diagnostic on
a package that tries to read another context's facts directly, and the
admit form. Needs the multi-context driver of §4, built in C4. Predeclared
cases: an admit citing a source not named in the genesis and an admit by a
non-holder, both foundation-level and tested in C1; two rooms filling
concurrently and a free admitted before the occupancy it frees, tested in
C5. The campaign is bounded to forty positions per context.

**A claim with a registrar attestation and a late-assigned adjuster.**
Roles Claimant, Insurer, Adjuster, Registrar. Kinds: `claim.file
{statement}` readers claimant and insurer; `claim.certificate {claim}` by
the Registrar, `members`, an ordinary act whose authority is the
Registrar role; `claim.assess {claim, amount}` readers insurer and
adjuster; `claim.settle {claim}` `members`. Promises:
settlement only for a claim with an effective certificate; an adjuster
assigned after the claim was filed judges every later assessment and
settlement as the oracle does; amounts reach claimant, insurer and the
adjuster only. Constraint inventory: two, attestation and retroactive
access. Tests D2, D3 and D6's trusted-evidence route, and a field-level
budget across three roles. Predeclared cases: a settlement before the
certificate; a false certificate by a non-registrar, refused; the adjuster
assigned late and judging a settlement whose claim they never read; a
disclosure of the claim to the adjuster with and without its dependencies.

### 5.4 Predictions, recorded before any run

1. The compiler refuses every §5.2 baseline shape with the named
   diagnostic, and every script fails the checker.
2. Sale, Booking and Club in the source form pass within budget; Sale's
   pre-baseline diagnostic count is at least six, the landed count of
   semantic repairs.
3. The claim model raises D1 to D3 diagnostics before its baseline and
   needs at most one post-baseline repair, in the attestation class.
4. The workflow model raises no D1 to D3 diagnostic and its post-baseline
   repairs are in the composition class, at least one of them about the
   in-flight advance across the attach.
5. The allocator's repairs are in the cross-context class; the
   over-capacity boundary is stated in the manifest and not discovered by
   the checker.
6. Arm B removes every join disclosure from every campaign and changes no
   verdict at any position; readability grows only for later joiners of
   effective events under a re-frozen kind.
7. The compiler does not catch Club A1, the missing `already_member`
   guard; it is a business-rule omission the invariant finds, not a
   visibility error.

A prediction that fails is reported with what happened instead.

### 5.5 Agent-authoring protocol, revised

The author of each model is a fresh agent, given: design note §§1 to 4
and §8; the views note; the source-form reference `spike/lang/README.md`
with the Discussion package as the worked example; the harness README; the
model's frozen manifest; and the compiler, which it may run: it sees each
diagnostic's text and script, not the checker's verdict on that script.
It may not run the checker, the invariant tests or the campaign, or read
any checker output, until the baseline is committed. It is **not** given the
directions note, whose D8 sketch is a Sale model, nor the landed fixtures,
nor the ledgers. Recorded: every compiler diagnostic resolved before the
baseline, with its class; the baseline; each checker run; each fix under
§5.1; source lines and emitted lines at the baseline and at the end.

### 5.6 Corpus bounds

The landed bounds stand for the reruns: at most six participants, sixty
positions, seeds 1 to 200. The new manifests use the same bounds per
context; the allocator fixture holds three contexts of at most forty
positions each, so that a campaign stays comparable.

## 6. Work breakdown

Each task is one builder request and one checker review; the exit
condition is what the checker verifies at the exact head. Tasks are
sequential unless noted.

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| C1 Contract, foundation additions | This plan approved | `spike/lang/CONTRACT.md`; the contract test; `dap.admit` folded under the trust rule with the genesis `admits` field and payload validator, and the two foundation-level admit cases; a resolution may omit a handler, with a test that the omission changes the binding id and stales an in-flight intent; `roster` audience id behind a flag, off; the harness test suite passes unchanged | Checker verifies against design §2, §3 and §9 and this plan's §3 |
| C2 Compiler and baselines | C1 | Parser, resolver, reader checker, deriver, emitter; the grammar fixed in `spike/lang/README.md`; Discussion in the source form compiles to a module that passes the Discussion tests and the query property test; the §5.2 diagnosed shapes committed and refused with the named diagnostics, every script failing the checker against the model named; the §5.2 derivations clearing their corpora; one derived audience rule broken and found by the checker; the emitted Sale sketch is **not** committed, so the author is not primed | Checker verifies C1's claim table and the false-positive rule |
| C3 Sale, Booking, Club by agent, arm A | C2 | Each authored under §5.5 from the unchanged manifests; predeclared cases, campaigns and the query property test pass; the generated budget and invariant functions agree with the manifest's; ledgers with pre-baseline diagnostics and post-baseline repairs by class; lines recorded | Checker verifies the ledgers, the manifest ids and the class assignments |
| C4 Three new manifests and the driver | C2, in parallel with C3 | Workflow, allocator and claim manifests frozen per §5.3 with generators and predeclared cases; ids recorded; the multi-context driver with admits from real room heads, the cross-context invariant and combined-script shrinking, tested on a fixture without any allocator model | Checker approves the manifests independently of any model and verifies the driver |
| C5 New models by agent | C4 | Each authored under §5.5; results, ledgers, classes and query tests as C3; the two model-level admit cases; the veto question written up from the workflow evidence; the allocator's boundary diagnostic exercised | Checker verifies against §5.3 and the predictions |
| C6 Arm B | C3, C5 | `roster` on; the six manifests re-frozen as new experiments with `roster` where they said "members when recorded, subject to disclosure"; campaigns rerun; disclosure events counted before and after; any verdict change reported | Checker verifies the re-freeze is complete and the counts are reproducible |
| C7 Report | C6 | Opens with the C1 to C4 verdicts and the predictions that failed. Per model: pre-baseline diagnostics by class, post-baseline repairs by class with ledger entries, source and emitted lines, campaign results with manifest and package ids, and for arm B the disclosure events removed and any verdict that changed. The two questions handed to the design note: whether a handler may veto, and how an admitted statement is verified when the trust rule is not enough. What the campaigns found that the reader check did not. What it does not establish: the runtime, the MCP surface, obligations, presentation, lifecycle beyond origin and close, performance | Checker verifies every claim against committed runs |

## 7. Out of scope, and why

- **A runtime profile, WebAssembly, or helper modules.** D9's contract is
  a document and a test; the emitted code is TypeScript because the
  harness is. A package needing a helper is refused and reported.
- **Typed affordance targets.** The contract returns kind names; D5's
  targets need a contract change and wait.
- **Obligations, presentation, lifecycle beyond origin and close, external
  systems.** D13 to D15 need forms this spike does not fix; the workflow
  and allocator manifests will show what they cost without them.
- **Queries beyond functions.** No SQL, no MCP; one property test per
  model.
- **Verified admission, joins, scope transfer.** Trusted admission is
  enough to author the allocator; O4 covered transfer.
- **Performance.** Arm B counts events; nothing is timed.
- **A second author or a human trial.** Repairs are the measurement.
