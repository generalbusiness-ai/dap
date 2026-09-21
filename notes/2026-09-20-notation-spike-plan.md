---
date: 2026-09-20
status: >-
  draft spike plan, revised 2026-09-20 after codex's review (workroom
  report 1bf0b745). Not yet approved; it adopts nothing and authorizes
  no implementation. It is step 3 of the authoring spike plan, gated on
  that plan's step 2 and on the MVP product description, and its product
  is three alternative source shapes with their tradeoffs for a person to
  choose from.
origin: >-
  Hugh's question of 2026-09-20: how to measure the ability to reason about
  candidate authoring languages cheaply enough to try many large and small
  differences in expression and pick a good result with its tradeoffs.
bases: >-
  main e2977c8a; notes/2026-09-18-authoring-language-directions.md §3 D8
  and the Sale sketch; notes/2026-09-18-compiler-spike-plan.md §3 (the
  declaration layer) and §4.4; spike/src/{oracle,observe,
  foundation,checker,generate,script}.ts; spike/fixtures/{sale,booking,
  club}.ts and their manifests and corpora.
directions: notes/2026-09-18-authoring-language-directions.md
compiler-plan: notes/2026-09-18-compiler-spike-plan.md
---

# Notation spike plan: choosing the shape of the source language

## In one paragraph

The authoring spike's declaration layer has no surface syntax; step 3
chooses one, and this plan says how, with evidence rather than a sketch. It
renders one package in several candidate notations that all mean the same
thing, asks the same generated questions of each rendering, and grades
the answers against the harness, which already computes affordances,
audiences, verdicts, projections and judgeability for every principal at
every frontier. The reasoner is the system under test, the notation is
the variable, and the harness is the answer key, so nothing is graded by
hand. Two rounds, large differences then small ones, end in a report
that offers **three alternatives** with their measured tradeoffs rather
than a winner. A person chooses one, and that choice becomes the surface
syntax over the declaration layer. The spike also says what it cannot measure: human comprehension, and
familiarity as a cost that no baseline can remove.

## 1. What the spike must show

| Claim | Established if | Refuted if |
|---|---|---|
| **N1. Notation is a lever.** | At least one candidate beats the TypeScript fixture baseline on the non-local questions of §4 by ten points of accuracy at the small model, outside the sampling interval, on held-out situations, with the same semantics underneath | No candidate beats the baseline on non-local questions; then the notation is not where authoring cost moves, and the declaration layer keeps its structured form. An improvement under ten points, or inside the interval, is reported as not established, which is neither verdict |
| **N2. The questions discriminate.** | The spread of non-local accuracy across candidates, best minus worst, exceeds the spread of local accuracy by at least ten points at the small model; ranking is not the test, since two banks can rank alike and separate differently | The non-local spread is within ten points of the local spread; the bank is not measuring what the spike found expensive |
| **N3. Reading and writing can pull apart.** | Some candidate ranks differently on the reading bank and on the writing tasks | Every candidate ranks the same on both; then one number would have done and the tradeoff report is simpler than planned |

Two measurements accompany the claims and are not claims: source length
per candidate in tokens, and the gap between the large and the small
model, which is the familiarity and clarity signal §3 explains.

## 2. Order and rationale

The generator and grader come first, because they are small and reuse
the harness, and because a bank whose answers do not change under a
semantic mutation of the fixture is not worth running candidates
through. Round one renders the Sale package in six to eight
shapes that differ in kind, prunes to three or four, and round two makes
small mutations of the survivors and adds a Club rendering of each, so
that references by commitment, folded disclosures and grant effects are
exercised before anything is chosen. The report follows, then the human
choice, then the chosen rendering becomes the surface syntax over the
declaration layer.

### Simplifications adopted

1. **Hand-written renderings, reviewed for faithfulness.** No surface
   parser exists; the declaration layer of the authoring plan's step 1
   is this spike's entry condition. Each rendering is a text that claims
   to describe one situation's program, and a reviewer checks that claim
   line by line. When a parser exists, equivalence becomes by
   construction; until then it is a review obligation named in §6.
2. **One trace notation for every candidate.** A situation is presented
   in a fixed neutral format, so the trace's own notation is not a second
   variable.
3. **Sale for every candidate, Club for the finalists.** Sale covers
   partition, decision and split kinds; Club adds references resolved by
   commitment, disclosures the model folds, and a declared effect.
   Booking is held back; its clock is one primitive and not a shape
   question.
4. **Two model sizes, fixed sampling.** A large and a small model, three
   samples per question, temperature fixed and recorded. The small model
   is the sharper instrument because the large one compensates for a bad
   notation.
5. **Writing tasks graded against a reference until the compiler
   exists.** Reading answers are harness-graded, exact match. Writing
   answers are graded by a second model against a builder-prepared
   reference edit, and the report marks them as the weaker signal.
6. **Three alternatives, not one.** The selection rule of §5 produces a
   front, and a person chooses from it.

## 3. Fixture decisions

| Decision | Choice | Why | Does not claim |
|---|---|---|---|
| Semantic ground truth | Per situation, a frozen tuple: the model version (landed, or the kept run-1 or run-6 program), the harness and client versions, the trace, package availability, the rendering shown, and the matching answer key. Keys come from `foldPrefix` and `oracleObserve`, the foundation's audience assignment, `checkContext`, the declared `config.joinDisclosure`, and the Sale trace's Inspection attach. Every notation renders that same situation's program, historical variants included, so a reasoner is never scored against a key for a program it was not shown | The kept run-1 program permits a withdrawal the landed fixture refuses; scoring a correct reading of one against the key of the other would be a source and key mismatch, not a reasoning error | That the fixtures are the only possible semantics for the notations |
| Candidates, round one | Six to eight renderings of Sale differing in kind: the directions note's DDL-and-acts shape; an entity-shaped form with acts as methods; a role-grouped form ("Seller may …"); a rule form with facts and guards as clauses; a tabular form with one row per act; the directions note's D8 sketch as written; and the TypeScript fixture itself | Large differences first, so the pruning is about shape and not punctuation | That the set is complete |
| Candidates, round two | Small mutations of each survivor: readers on columns versus on acts; reasons inline versus in one table; guard order explicit versus derived; comments present versus absent; keyword and layout choices; and a Club rendering of each survivor | Small differences are cheap to try once the shape is fixed | That every small difference was tried |
| Situations | Thirty per package, drawn from campaign seeds at chosen frontiers, plus the hand-written trace, mixed on purpose: cases where every view agrees, cases from the kept run-1 and run-6 models where a view diverges, and cases that pause on a missing package; a held-out set of ten is kept back for the finalists | The harness reproduces any of them from seed and frontier; a bank built only on the repaired fixture answers "agrees" almost every time and measures nothing | Coverage of the state space |
| Trace notation | Positions, kind, actor and payload where the answering principal can read it, in one fixed layout for every candidate. Readability is **not** shown: the who-can-read question would otherwise be answered by the trace | Simplification 2; the review | That this is a good notation for people |
| Question bank | §4, generated from the situations, with the harness answer stored beside each question | Exact grading | Anything about questions a person would ask |
| Answer format | One fixed JSON shape per question type, so grading is mechanical; a malformed answer is wrong | Cheapness | Partial credit |
| Controls | The TypeScript fixture as the familiarity baseline; a scrambled-identifier copy of each candidate as a naming control only; a no-source condition to measure guessing; question order shuffled per run | Without these a result is a result about the model's training set | That familiarity can be subtracted; it is a real cost and the report says so |
| Calibration | Before any candidate runs: the original and a mutated fixture, one broken guard and one broken audience rule, must produce different keys on a preselected set of mutation-sensitive questions; a reasoner shown the mutated rendering is scored against the mutated key, and a correct reasoner should stay correct; a separate, deliberate mismatch control, mutated rendering against the original key, must show a predeclared decrease of at least ten points; the no-source and trivial-predictor thresholds are stated before any candidate runs. Scrambling is a naming control only, never a calibration gate | A bank that shortcuts must be caught before it is used, without penalizing correct reasoning | Anything about people |
| Models and sampling | One large and one small model, three samples per question, temperature fixed and recorded, prompts identical across candidates except for the rendering | Variance and the clarity signal | Anything about a model not run |
| Writing tasks | Three per package: change one manifest promise and edit the declaration; locate the wrong declaration from a checker counterexample; author one new act from a one-line specification | Goal 2 is writing; reading alone would miss it | Rigor equal to the reading bank, until the compiler grades edits |
| Metrics | Accuracy per candidate, per question type, per model, with intervals from the samples; source length in tokens; the large-versus-small gap; writing task score; time to answer, recorded and not scored | The tradeoff table needs all of them | A single score |
| Selection rule | §5 | | |

## 4. The question bank

Each row names the question, where the harness gets the answer, and its
locality, which is how far the answer lies from the declaration that
governs it. The spike's cost lived in the non-local rows, and claim N2
says those are the rows that should separate candidates.

| Question | Answer source | Locality |
|---|---|---|
| What is p offered at frontier n? | the model's `affordances` under the oracle state | guard evaluation |
| What could p make effective at n, offered or not? | the oracle fold over each act with a witness payload | guards plus state; in the landed Sale these two answers differ, since terms on a declined offer succeed while not offered |
| Who can read the event at position k? | the foundation's audience at k, with disclosures through n | one declaration |
| If p does act A with payload P at n, what is the verdict and its reason? | the oracle fold one step on | guards plus state |
| What does p's projection show at n, for a named field? | `oracleObserve` | state plus readers |
| Will reader r judge the event at k as the oracle does, and if not, with which reason? | `checkContext` at r and n | cross-view: the property |
| What does the declared client policy supply to a participant who joins at n? | `config.joinDisclosure` as declared | package-wide; the answer is what the package declares, not a proved minimal set |
| After the attach at position a, which of the answers above change for p? | the same questions before and after a | cross-package |

Local questions are kept, because they are the floor: a candidate that
loses on them has a problem with legibility rather than with shape.

**Predictions, recorded before any run.**

1. The non-local spread across candidates is at least fifteen points at
   the small model; the local spread is under five.
2. The TypeScript baseline wins or ties on local questions and loses on
   judgeability and backlog questions to at least one candidate.
3. Readers declared on columns beat readers declared on acts for the
   who-can-read question and lose for the verdict question.
4. The scrambled-identifier copy of the best candidate loses more on
   non-local questions than the baseline does, which means shape carries
   part of the result and naming carries the rest.

A prediction that fails is reported with what happened instead.

## 5. Selection: three alternatives

The report does not pick. It computes the front of candidates that no
other candidate beats on all of: non-local reading accuracy at the small
model, writing task score, and source length. From that front it offers
three, chosen to differ from each other in shape, each with a one-page
tradeoff: where it wins, where it loses, the large-versus-small gap, the
familiarity baseline beside it, and the Club rendering's result. Where
the front has fewer than three members the report says so and fills from
the nearest candidates, marked as such. A person chooses one, and the
chosen rendering and its Club counterpart become the surface syntax over
the declaration layer.

## 6. Work breakdown

Each task is one builder request and one checker review.

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| N1 Generator and grader | The authoring plan's step 2 done, and the MVP description's answer on who authors | `spike/notation/`: a situation generator over seeds, frontiers and the kept divergent models; the neutral trace renderer without readability; the question generator for the eight types with harness answers stored; the exact grader; the run script; the calibration gate of §3 passed on the Sale trace | Checker verifies the answers against the harness by hand for one situation, and reruns the calibration |
| N2 Round one candidates | N1 | Six to eight Sale renderings under `spike/notation/candidates/`, each with a faithfulness review that walks the fixture line by line and names any construct the rendering cannot express; the round-one run at both model sizes; the pruning to three or four with the numbers that did it | Checker verifies faithfulness independently for two candidates and reproduces one result table |
| N3 Round two | N2 | Small mutations of each survivor and a Club rendering of each, with faithfulness reviews; the round-two run; the writing tasks run on the survivors with their reference edits committed | Checker reproduces one candidate's numbers and checks two writing gradings against the reference |
| N4 Report and the three | N3 | The claims N1 to N3 decided; the predictions against outcomes; the full result tables; the front; three alternatives with their tradeoff pages; what the spike does not establish | Checker verifies every number against the committed runs |
| Choice | N4 | Hugh names one alternative; it becomes the surface syntax over the declaration layer of the authoring plan | none; a human act |

## 7. Cost

Round one at eight candidates, thirty situations, seven question types,
three samples and two models is about ten thousand short calls, each a
rendering of under a hundred lines plus a trace. Round two is smaller.
The whole spike is tens of dollars of inference and a few days of
builder time, most of it writing and reviewing renderings.

## 8. Out of scope, and why

- **Human comprehension.** That is goal 3 and needs people; the report
  says which alternative it would test on them first.
- **Familiarity as something to subtract.** The baseline shows it; the
  tradeoff pages state it as a cost of every new notation.
- **The compiler, the runtime, and the harness.** Nothing here changes
  them; the generator reads the harness and writes beside it.
- **Booking and any further models.** One primitive and unauthored
  models; the finalists meet them in separately commissioned
  experiments.
- **A general benchmark.** The bank is built for these fixtures and
  these questions; it is not offered as a measure of anything else.
