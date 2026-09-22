---
date: 2026-09-22
status: >-
  draft spike plan. Not yet reviewed or approved; it adopts nothing and
  authorizes no implementation. It sets the next tasks as independently
  progressing technology spikes on composition, interaction,
  extensibility and agents as participants, to be carried a long way
  before real-world modelling, and it makes the five-stage pilot a
  conditional follow-up. Hugh chose this order on 2026-09-22 because his
  attention for coordinating real environments is limited now, and
  because personal agents can take part in dap in ways the product
  framing had not anticipated.
origin: >-
  Hugh's instruction of 2026-09-22 after checker review 39167931; the
  direction note §2 hypothesis (d); the authoring plan's deferred
  experiments; the directions note D11 to D15.
bases: >-
  main e9cd0089; notes/2026-09-20-direction-and-next-steps.md;
  notes/2026-09-18-compiler-spike-plan.md §5 and §6;
  notes/2026-09-18-authoring-language-directions.md D5, D6, D11 to D15
  and the obligations subsection; notes/2026-09-14-evolving-spaces-design.md
  §1 (assistants are ordinary principals), §3, §6, §7, §8, §9;
  spike/src/foundation.ts (dispatch, NOT_IN_V1), spike/src/descriptor.ts
  (attach, AttachResolution); the first spike plan's conventions.
direction: notes/2026-09-20-direction-and-next-steps.md
authoring: notes/2026-09-18-compiler-spike-plan.md
directions: notes/2026-09-18-authoring-language-directions.md
---

# Technology spikes: composition, interaction, extensibility and agents, before real-world modelling

## In one paragraph

The direction note's fourth hypothesis says the larger opportunity is
that useful changes in an arrangement can become understandable
interaction rules at acceptable cost, without losing history or silently
changing who sees what and who may act. That hypothesis is tested on the
harness, not on a phone, and its open questions are the ones this plan
takes up: how a later package refines an earlier one; how a model hands
work to a participant and checks it was done; how a personal agent takes
part as a principal with delegated authority; how a context gains rules,
migrates state and declares its own lifecycle; how facts cross a context
boundary; and how a person's account keeps three kinds of record apart.
Each spike runs on its own with its own claims, refutations and stop
rule, needs no live person, and uses episodes Hugh describes from past
events as fixture material where a scenario is needed. The five-stage
pilot stays in the direction note as the conditional follow-up, and each
spike says what it hands that pilot when it comes.

## 1. The spikes, and what each must show

Seven spikes. The first is the authoring plan's step 1, unchanged and
restated here only for its place in the order. Each row names the
question, the claim, and what refutes it. Claims are established on the
executed fixtures only, as the first spike's were.

| Spike | Open question | Established if | Refuted if |
|---|---|---|---|
| **T1 Declaration layer** | Can a package be declared with readers and guards such that the view property holds by construction for the checked fragment? | The authoring plan's A1 to A3 | As that plan says; any of the three refuted stops T2 and T5 in their declared form, and they proceed hand-written |
| **T2 Composition** | Can a later package refine a kind an earlier package owns, without backfill, with the property holding for the refined guard? | A policy package narrows an existing kind's guard; the containment check applies to the refined guard; an intent signed under the earlier binding is `stale_binding` at the boundary; earlier outcomes replay unchanged; the composite verdict rule is stated, tested under two candidate rules, and the property holds under the chosen one | The refined guard cannot be checked; an earlier outcome changes; or no composite rule keeps the property, in which case the veto question is answered in the negative and reported |
| **T3 Obligations** | Can a model hand work to a participant and judge that it was done, so that the harness's client hooks become declarations in the model? | A guard may oblige a role to an act; the obligation is folded state and an affordance for holders of the role; the performing event is checked against it; an unmet obligation is visible; Sale's join disclosure and Club's grant effect are re-expressed through it and their campaigns pass | Either existing declaration cannot be expressed, or an obligation's state differs across views that can both see it |
| **T4 Agents as participants** | Can a personal agent act in a context as a principal with delegated authority, so that every view judges its acts alike and the record shows who granted, who promised and who performed? | An agent principal holds capabilities granted by a person; acts needing approval become obligations on the person; an agent cannot exceed its grant; two agents acting for two parties in one context reach a shared decision under the property; an agent's proposal to attach a package is an act a person approves; an agent can ask what it may do before acting through affordances and declared queries | The record cannot distinguish the grantor, the promiser and the performer; an agent act is judged differently by two views that see it; or approval cannot be expressed without a foundation change |
| **T5 Extensibility** | Can a context gain rules mid-stream with explicit state migration, declare its own lifecycle, and give late joiners the public backlog by rule? | An attach with a declared migration activates at an exact boundary and every prior outcome replays unchanged (design §7, rule 4, never tested); origin, join and close rules live in the package and compile to genesis bindings and close guards; the `roster` audience id removes every join disclosure from a campaign with no verdict change at any visible position | A migration changes a prior outcome; a lifecycle rule needs a foundation change beyond the audience id; or `roster` changes a verdict |
| **T6 Admission** | Can a fact cross a context boundary with its provenance, under the design's trust rule, and can the boundary test be a diagnostic? | `dap.admit` folded with provenance and the genesis-pinned trust; the two foundation-level cases; the design question of approval-before-finalize versus filtering answered in writing first; a package that reads another context's facts directly is refused with the boundary diagnostic | The admitted fact's readers cannot be stated consistently with its source audience, or the design question has no answer that keeps one owner for an exclusive right |
| **T7 The account** | Can one package keep a person's own assertions, captured material and other parties' signed acts apart, with standing that changes and never overwrites, and hold the property? | The account package authored under the checker from a manifest frozen first: the three record kinds, capture events, standing, the paired personal-query and rejected-public-decision case, literal expected standing, provenance and readership asserted beside checker equality; its predeclared episodes drawn from events Hugh describes | The standing rule cannot agree with the oracle for some participant and basis, or a described episode cannot be represented without a foundation change |

Two measurements accompany the claims and are not claims: for each
spike, the foundation changes it needed, named; and for T4, the number
of acts that needed a human approval in the fixture, which is what the
pilot's advocate ledger will later count in the real.

## 2. Order and independence

The spikes are independent by design, because independence is what
makes them progress without coordination. The dependencies that remain
are stated once.

- **T1, T3, T4 and T7 start now**, in parallel, on the harness as it
  is. T3 and T4 share the obligation form, so T4 waits for T3's form to
  exist or uses a hand-written obligation until it does.
- **T2 and T5 wait for T1** in their declared form, because a refined
  guard and a lifecycle declaration are things the declaration layer
  expresses; either may proceed hand-written if T1 stops.
- **T6 waits for a written answer** to the allocator design question,
  which Hugh gives.
- **Nothing waits for the pilot.** The pilot waits for the spikes it
  needs, and §5 says which.

Hugh's part is guidance, not coordination: a written answer for T6, a
described episode or two for T7 and T4's scenarios, and approval of each
plan and each landing. Nothing here requires him to arrange a real
environment.

## 3. Fixture decisions

The first spike plan's decisions stand. These rows add to them.

| Decision | Choice | Why | Does not claim |
|---|---|---|---|
| Composite verdict, T2 | Two candidate rules are tested: rebinding, where the policy package's model wraps the original guard and the resolution names only the wrapper, which needs the foundation to let a resolution omit a handler; and a declared veto class, where a handler marked as a veto must accept for the kind to be effective. Today `dispatch` makes a kind effective when any handler accepts and `attach` requires the union, so neither works without a change, and the design note leaves veto undefined | The question is decided by which rule keeps the property and the no-backfill invariant on the fixtures | That the chosen rule is the production rule; the report hands the answer to the design note |
| Obligation form, T3 | `then oblige <role> to <act> [within <observed clock>]`; folded as an open obligation; an affordance for every holder of the role; the performing event names the obligation and is checked against it; an obligation past its clock is `lapsed`, never silently dropped; the fold never emits system acts itself | The design says models cannot emit system acts; the harness hooks did the work by hand | That obligations reach outside the context; notification is the client's |
| Agent principal, T4 | An agent is an ordinary principal (design §1) holding capabilities granted by a person through `dap.grant`, with a declared approval rule: acts in a named set become obligations on the grantor before they take effect; the record identifies grantor, promiser and performer; two agents may hold grants from two parties in one context | Capability says may; obligation says must; the blame discipline of the directions note | That an agent's judgment is trusted; only that its authority is bounded and its acts attributed |
| Agent scenarios, T4 | Sale with a buyer's agent and a seller's agent negotiating within declared limits, and a described episode from Hugh's past events in which a person's agent handles an exchange with a supplier | One fixture the harness already knows, one that comes from life | Anything about a particular agent product |
| Migration, T5 | An attach carries a declared migration from the prior state shape to the new one; activation at the boundary applies it once; the migration is part of the binding identity; replay before the boundary uses the old shape | Design §7 rule 4, stated and never tested | General schema evolution |
| Lifecycle, T5 | Origin rule, join policy at the route, grants on join, close rule and spawn rule declared in the package and compiled to genesis bindings, the serving party's invitation policy and close guards | D15; today these live in harness scripts | That the serving party's policy is enforced elsewhere |
| Admission, T6 | As the authoring plan's deferred experiment: `dap.admit` with provenance, trusted admitters pinned in the destination genesis, no source verification; the allocator question answered in writing first | The design's trust rule | Verified imports, joins or scope transfer |
| Account, T7 | The direction note's §5 as a manifest: assertion, capture and confirmation kinds; standing derived and versioned; the paired query and decision case; cancellation, correction, retraction and conflicting sources predeclared; literal expectations asserted; two or three episodes described by Hugh as the predeclared cases | The checker reproduced the smallest version on the current runtime; this is the full package without a live person | That a live person would keep it |
| Counting | Each spike's ledger records foundation changes needed, semantic repairs after its baseline under the first plan's §4.3, and what the campaigns found that the claims did not cover | Comparable with the landed ledgers | A budget; these are exploratory spikes and their cost is reported, not judged |

## 4. Work breakdown

Each spike is one builder request and one checker review, with a
manifest frozen before authoring where a model is authored. Exits are
what the checker verifies at an exact head.

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| T1 | This plan approved | The authoring plan's A1 and A2 tasks, unchanged | As that plan says |
| T3 | This plan approved | The obligation form in the descriptor and foundation; Sale's join disclosure and Club's grant effect re-expressed; both campaigns pass; a lapsed obligation shown in a fixture; the property holds | Checker verifies the two re-expressions and the lapse case |
| T4 | This plan approved; T3's form or a hand-written stand-in | Agent principals with grants and approval rules; the Sale negotiation fixture and one described episode; the grantor, promiser and performer visible in `observe`; an over-reach refused; a two-agent shared decision under the property; an agent-proposed attach approved by a person; affordances and queries answered to an agent before it acts | Checker verifies attribution and the over-reach case, and that no view judges an agent act differently |
| T7 | This plan approved; episodes from Hugh | The account manifest frozen; the package authored under the checker; literal expectations and checker equality both asserted; the paired case; the described episodes replayed | Checker verifies the manifest's literal expectations against the runs |
| T2 | T1's A1 and A2 held, or hand-written after a T1 stop | The two composite rules implemented behind flags; the workflow-with-policy fixture; the in-flight `stale_binding` case; no-backfill shown; the rule that keeps the property chosen and reported | Checker verifies both rules' results and the choice |
| T5 | T1's A1 and A2 held, or hand-written after a T1 stop | Migration at a boundary with prior outcomes unchanged; lifecycle declarations compiled; `roster` on, six manifests re-frozen, join disclosures counted before and after, no verdict change | Checker verifies replay equality and the counts |
| T6 | Hugh's written answer to the allocator question | `dap.admit` folded; the two foundation cases; the allocator fixture with the multi-context driver; the boundary diagnostic exercised | Checker verifies the admitted facts' readers against the source audience |
| Report | The last spike landed, or a stop | Per spike: claim verdicts, foundation changes named, repairs, what the campaigns found; the answers handed to the design note: the composite verdict rule, the obligation form, the agent approval rule, the migration rule, the lifecycle forms, the admission trust rule; and what each spike hands the pilot | Checker verifies every claim against committed runs |

## 5. What the spikes hand the pilot

The five-stage pilot in the direction note stays as it is and waits for
attention. When it comes, it starts with more than it has today.

| Pilot stage | From the spikes |
|---|---|
| stage 1, the brief | T4 says what an agent may do without asking and what needs approval, in tested terms; T7 supplies the account's cases |
| stage 2, the screens | T3 and T4 supply the obligation and approval cards to storyboard; T5 supplies the join and close flows; T2 supplies the one rule-change scene that tests hypothesis (d) |
| stage 3, one complete path | T7 is the account package; T3 replaces manual scaffolding with declared obligations; T1 is what makes the package cheap to trust |
| stage 4, the episode | T4's approval ledger becomes the advocate ledger; T6 is the exchange with a supplier's own context when there is one |
| stage 5, review | the spike reports are the technical evidence behind the pilot's findings |

## 6. Out of scope, and why

- **Live people and real environments.** By Hugh's choice for now; the
  pilot is the conditional follow-up.
- **The runtime, WebAssembly, notation, bridges, payment and identity
  choices.** Background in the survey; nothing here needs them.
- **The retroactive audience beyond T5's measurement**, cross-context
  joins and scope transfer beyond T6's admission, and a general agent
  framework beyond T4's principal, grant and approval rule.
