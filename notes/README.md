# dap — design and implementation notes

Project name for this phase: **dap**; system namespace `ai.generalbusiness.dap.`.

Dated notes (YYYY-MM-DD-title.md) to capture designs, implementation plans,
and discussion summaries.  Frontmatter "status" should be maintained.

dap lets people coordinate around a sale, a booking or any other shared
activity. Each activity records signed actions in one agreed order;
packages supply the rules that turn those actions into state and next
actions; people may read different parts of the history, but their views
must agree on every shared decision.

**The spikes have run and reported.** Both are complete and landed. The
[visibility spike report](../spike/REPORT.md) and the [ordering spike
report](../spike/ORDERING-REPORT.md) say what was established and what was
not; read the opening of the visibility report first if you want the
verdict rather than the design. The short version is that the agreement
property and the privacy bound held in the fixtures that were run, and the
claim that an agent could author these models within a small repair budget
was falsified.

**First reading:** start with the direction and next steps, which says
what the next task is and what waits; then the sale as experienced, the
design note, the views note and ordering for the design itself. The notes describe the design;
the two spike reports say how much of it was demonstrated, and the notes
have not been rewritten to match every spike result. The design note opens
with the goals (§0), in priority order: evolvability, ease of programming
as an agent, comprehension simplicity for a person, lightweight
decentralization. Each has one criterion the spikes report against.

Twelve notes, each owning one concern:

- [Evolving spaces](2026-09-14-evolving-spaces-design.md) — what the things
  are: goals, referents, events, contexts, audiences, packages, authority,
  boundaries, invariants, precedents, and where review findings landed.
- [One series, many views](2026-09-14-one-series-many-views.md) — how many
  views share one order: the consistency property, a worked trace, the same
  property across applications, where authoring gets hard, the visibility spike.
- [Ordering](2026-09-14-ordering.md) — how a context gets, keeps, moves and
  hands over its order: trust and failure, the single-writer implementation,
  split/join protocols, the ordering spike.
- [The sale as experienced](2026-09-15-sale-as-experienced.md) — the trace
  as five people would live it in a general-purpose dap mobile app, with
  every constraint shown. It names the screen fields an app would want and
  is explicit about which of them the spike built: the anchor is
  implemented nowhere, and the thread, the hidden count and the pause come
  from elsewhere than `observe`. Verified against the landed spike.
- [Spike plan](2026-09-15-spike-plan.md) — the fixture decisions, the
  predeclarations, and the task breakdown for the visibility spike and the
  ordering spike. Every task in it is done.
- [Club admission](2026-09-16-club-admission-decision.md) — why the Club
  model's original admission policy was left failing rather than revised,
  and the two alternatives that were not adopted. It owns the spike's one
  outright negative result.
- [Authoring language directions](2026-09-18-authoring-language-directions.md)
  — after goal 2 fell: what a source language and compiler for
  application-behaviour packages should do, ranked, with a sweep of the
  original use cases and a proposed next spike. A research note; it adopts
  nothing.
- [Authoring spike plan](2026-09-18-compiler-spike-plan.md) — a
  declaration layer on the current foundation that must reproduce Sale
  and reject the recorded bad shapes, with a stop if it cannot; then one
  authoring task against a predeclared budget; notation optional after
  that. Revised after review; composition, admission and the retroactive
  audience deferred to their own experiments. A draft; not yet approved.
- [Notation spike plan](2026-09-20-notation-spike-plan.md) — the optional
  step 3 of the authoring plan, commissioned only if notation proves the
  bottleneck: a small first round comparing the TypeScript fixture with
  two renderings on one calibrated question bank, reporting the
  alternatives the evidence supports, at most three, for a person to
  choose from. A draft; not yet approved.
- [Direction and next steps](2026-09-20-direction-and-next-steps.md) —
  useful alone, then one exchange, then one contribution: the product
  framing, the three roles, the participation ladder, the three kinds of
  record, and an ordered set of next steps with stopping points. Revised
  after review; not yet approved.
- [Weixin Mini Programs survey](2026-09-22-weixin-mini-programs-survey.md)
  — the largest working example of situated multi-party software,
  compared with dap in both directions; what people use, ranked; Web
  onboarding, payment and chat without the channel silo as options; the
  competing ways to do the job. A research note; it adopts nothing.
- [Technology spikes plan](2026-09-22-technology-spikes-plan.md) — the
  next tasks: independent spikes on the declaration layer, composition,
  obligations, agents as participants, extensibility, admission and the
  account package, each with claims and a stop rule, carried before
  real-world modelling; what each hands the pilot. A draft; not yet
  reviewed.

Links into gitseq, atseq and noseq assume sibling checkouts beside this repository;
each cited note records the inspected commit.
