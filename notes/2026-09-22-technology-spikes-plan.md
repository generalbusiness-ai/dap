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
  spike/src/foundation.ts (dispatch, attach, grant, NOT_IN_V1),
  spike/src/descriptor.ts (attach, AttachResolution, model_conflict),
  spike/src/script.ts (joinDisclosure, applyEffects); checker report
  fd83b1a5 of 2026-09-22; the first spike plan's conventions.
direction: notes/2026-09-20-direction-and-next-steps.md
authoring: notes/2026-09-18-compiler-spike-plan.md
directions: notes/2026-09-18-authoring-language-directions.md
---

# Technology spikes: composition, interaction, extensibility and agents, before real-world modelling

## In one paragraph

The direction note's fourth hypothesis says the larger opportunity is
that useful changes in an arrangement can become understandable
interaction rules at acceptable cost, without losing history or silently
changing who sees what and who may act. The spikes here are technical
tests of that hypothesis's prerequisites on the harness. They are not
evidence of human comprehension or of acceptable adaptation cost; only
a person can supply that, and the pilot asks it. The open questions the
spikes take up: how a later package refines an earlier one; how a model hands
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

Agreement between views is necessary and not sufficient. A wrong result
that every view and the oracle agree on passes the view property, and
the checker's review of this plan found rows that could pass that way.
So every row also freezes literal expectations before the run: the
state, the per-model outcomes, the bindings and the available actions at
named prefixes, asserted beside view equality.

| Spike | Open question | Established if | Refuted if |
|---|---|---|---|
| **T1 Declaration layer** | Can a package be declared with readers and guards such that the view property holds by construction for the checked fragment? | The authoring plan's A1 to A3 | As that plan says; any of the three refuted stops T2 and T5 in their declared form, and they proceed hand-written |
| **T2 Composition** | Can a later package refine a kind an earlier package owns, without backfill, with the property holding for the refined guard? | A policy package narrows an existing kind's guard; the containment check applies to the refined guard; an intent signed under the earlier binding is `stale_binding` at the boundary; earlier outcomes replay unchanged; and on a workflow with state before the attach, whose intended composite outcomes are frozen first, an act the base model accepts and the policy rejects leaves the protected workflow state and the available actions unchanged, a permitted act applies exactly once, and the literal state, the per-model outcomes, the binding changes and view equality are all asserted. Each candidate rule is reported on its own | The refined guard cannot be checked; an earlier outcome changes; or a policy-rejected act leaves a committed change in the workflow state under a candidate rule, which refutes that rule. If both rules pass, both are feasible and this spike chooses neither |
| **T3 Obligations** | Can a model hand work to a participant and judge that it was done, so that the harness's client hooks become declarations in the model? | A guard may oblige a role to an act; the obligation is folded state and an affordance for holders of the role, and grants no capability; the performing event is checked against it; the declaration says what dependent acts may do while the obligation is open or lapsed, and what the client is assumed to do; delayed, missing and mismatched performance are frozen as controls with literal obligation and business-state expectations at the prefixes in between; Sale's join disclosure and Club's grant effect are re-expressed through it, their campaigns pass, and Club's known negative controls still fail | Either existing declaration cannot be expressed; an obligation's state differs across views that can both see it; or a dependent act's outcome while the obligation is open is not what the declaration says |
| **T4 Agents as participants** | Can a personal agent act in a context as a principal with delegated authority, so that every view judges its acts alike and the record shows who granted, who promised and who performed? | An agent principal holds capabilities issued by an authorized grantor under a declared mandate naming the party it acts for; acts in a declared set are checked for approval before they take effect, each approval bound to the exact proposed operation and to the approver's authority; refusal is shown before approval, after revocation, and when an approval is reused for a different act or a second performance; an agent cannot exceed its grant; two agents acting for two parties in one context reach a shared decision under the property; an agent's proposal to attach a package is recorded and the authorized person performs the attach; an agent asks what it may do before acting through affordances and declared queries; and the record shows grantor, promiser and performer | The record cannot distinguish the grantor, the promiser and the performer; an agent act is judged differently by two views that see it; an approval-required act takes effect without its approval; or approval cannot be expressed without a foundation change |
| **T5 Extensibility** | Can a context gain rules mid-stream with explicit state migration, declare its own lifecycle, and give late joiners the public backlog by rule? | Three questions, each with its own fixture, result and stop. Migration: an attach with a declared migration installs the new state and bindings once at an exact boundary, every prior outcome replays unchanged (design §7, rule 4, never tested), and a failed initialization or migration leaves every earlier model state and binding unchanged, asserted literally and under the property. Lifecycle: origin, join and close rules live in the package and compile to genesis bindings and close guards. Roster: the `roster` audience id removes every join disclosure from a campaign with no verdict change at any corresponding act | A migration changes a prior outcome, or a failed one leaves anything installed; a lifecycle rule needs a foundation change beyond the audience id; or `roster` changes a verdict. One question's refutation does not erase the other two results |
| **T6 Admission** | Can a fact cross a context boundary with its provenance, under a stated admitter policy, and can the boundary test be a diagnostic? | `dap.admit` folded with provenance under a trusted-admitter policy the fixture states and labels an experimental choice; two controls frozen first: an authorized admission carrying the exact source prefix, its provenance and its declared readers has the expected local effect, and its unauthorized or untrusted counterpart is ineffective with the expected reason, both checked under the property; the source's permitted export stated, a summary without the private deliberation; the design question of approval-before-finalize versus filtering answered in writing first; a package that reads another context's facts directly is refused with the boundary diagnostic | An admitted fact's readers cannot be stated consistently with the source's permitted export; the untrusted control is effective; or the design question has no answer that keeps one owner for an exclusive right. Nothing here claims that admission verifies the source statement's truth |
| **T7 The account** | Can one package keep a person's own assertions, captured material and other parties' signed acts apart, with standing that changes and never overwrites, and hold the property? | The account package authored under the checker from a manifest frozen first: the three record kinds, capture events, standing, the paired personal-query and rejected-public-decision case, literal expected standing, provenance and readership asserted beside checker equality; its predeclared episodes drawn from events Hugh describes | The standing rule cannot agree with the oracle for some participant and basis, or a described episode cannot be represented without a foundation change |

Two measurements accompany the claims and are not claims: for each
spike, the foundation changes it needed, named; and for T4, the number
of acts that needed a human approval in the fixture, which is what the
pilot's advocate ledger will later count in the real.

The spikes run in parallel on pinned baselines. A result reached on a
stand-in is reported as a stand-in result; a combined T3 and T4 claim
needs a replay on the same accepted obligation form and the same
foundation. T1 stays on its unchanged baseline, as the authoring plan
requires, and any later extension of it gets its own regression result,
so that a foundation change made for another spike cannot silently move
T1's baseline.

## 2. Order and independence

The spikes are independent by design, because independence is what
makes them progress without coordination. The dependencies that remain
are stated once.

- **T1, T3, T4 and T7 start now**, in parallel, on the harness as it
  is. T3 and T4 share the obligation form, so T4 waits for T3's form to
  exist or uses a hand-written stand-in until it does. If T3 stops, T4
  still reports its bounded stand-in result; it does not wait.
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
| Composite verdict, T2 | Two candidate rules are tested: rebinding, where the policy package's model wraps the original guard and the resolution names only the wrapper, which needs the foundation to let a resolution omit a handler; and a declared veto class, where a handler marked as a veto must accept for the kind to be effective. Today `dispatch` makes a kind effective when any handler accepts, `attach` requires the union, and the design note leaves veto undefined, so neither works without a change. Today `dispatch` also commits each accepting model's state before it forms the composite verdict, so under either candidate an act the base model accepts and the policy rejects would leave a committed workflow change unless the commit waits for the composite verdict; both candidates need that change. The rebinding candidate must also say how the wrapper reaches the workflow's existing state, because the descriptor refuses a second definition under a name in use and `attach` initializes only models not yet present; omitting the old handler does not hand its state to the wrapper | The question is decided by literal outcomes on the frozen workflow, not by the property alone; agreement between views and no-backfill can both hold of a wrong result | That a passing rule is the production rule, or that one passing rule is the semantic winner over the other; the report hands both results to the design note |
| Obligation form, T3 | `then oblige <role> to <act> [within <observed clock>]`; folded as an open obligation; an affordance for every holder of the role; grants no capability; the performing event names the obligation and is checked against it; an obligation past its clock is `lapsed`, never silently dropped; the fold never emits system acts itself. The declaration states what dependent acts may do while the obligation is open or lapsed, and what the client is assumed to do. The harness today performs join disclosure and Club's effects synchronously in the script; the Sale trace replayed with join disclosure off shows five property violations, the first at Ivan's frontier 15, where the oracle accepts and his view reports `no_such_offer`. An open obligation card cannot itself stand in for that effect, so the declaration must say what a newcomer's view is entitled to while the disclosure is owed | The design says models cannot emit system acts; the harness hooks did the work by hand and hid the open window | That obligations reach outside the context; notification is the client's |
| Agent principal, T4 | An agent is an ordinary principal (design §1). `dap.grant` today is administrative issuance by an authorized grantor, not attenuated delegation, so the fixture uses an authorized grantor plus a declared mandate linking the agent to the party it acts for, and never infers that relationship from holding a capability. A declared approval rule: acts in a named set are checked for approval before they take effect, each approval bound to the exact proposed operation and to the approver's authority; refusal before approval, after revocation and on reuse are controls. The record identifies grantor, promiser and performer; two agents may hold grants from two parties in one context. The attach example needs no foundation change: the agent proposes, the authorized person performs `dap.attach`, and the agent holds no attach capability. If an agent is ever to perform a system attach itself, the enforcement change is named and tested first, not assumed | Capability says may; obligation says must; the blame discipline of the directions note. Refusing an agent that holds no capability shows nothing about approval; the controls must refuse an otherwise-authorized act that lacks its approval | That an agent's judgment is trusted, or that a delegation subsystem exists; only that its authority is bounded and its acts attributed |
| Agent scenarios, T4 | Sale with a buyer's agent and a seller's agent negotiating within declared limits, and a described episode from Hugh's past events in which a person's agent handles an exchange with a supplier. The agent is scripted. Its output is a replayable transcript driven only by its own projection, its queries and its available actions, never by fixture state it could not see | One fixture the harness already knows, one that comes from life; a scripted agent is enough to test authority and attribution | Anything about a particular agent product |
| Migration, T5 | An attach carries a declared migration from the prior state shape to the new one; activation at the boundary applies it once; the migration is part of the binding identity; replay before the boundary uses the old shape. A failed initialization or migration leaves the old environment, every model state and every binding intact (design §7). Today `attach` installs the new environment before it initializes models and the fold's error handler does not restore it, so a failing initializer reports ineffective and leaves the package installed and the new kind bound; the checker reproduced this. The defect is older than this plan, and this spike's gate requires it resolved | Design §7 rule 4, stated and never tested; atomicity is half of it | General schema evolution |
| Lifecycle, T5 | Origin rule, join policy at the route, grants on join, close rule and spawn rule declared in the package and compiled to genesis bindings, the serving party's invitation policy and close guards | D15; today these live in harness scripts | That the serving party's policy is enforced elsewhere |
| Roster, T5 | The comparison removes join disclosures by the audience id alone. `Script.joinDisclosure=false` is not used for it, because that switch also removes Club's grant effects. Before and after are compared by corresponding logical act, not by numeric position or content id, since removing events shifts both | A count that also removed other effects would compare two different campaigns | That `roster` is the default audience; that is D2's proposal, decided elsewhere |
| Admission, T6 | `dap.admit` with provenance under a trusted-admitter policy the fixture selects and labels an experimental choice; no source verification; the permitted export stated; the allocator question answered in writing first. The design puts ordinary admission trust in the model's folded rule and pins trust in the destination genesis for scope transfer (design §9); this spike does no scope transfer, so the fixture's policy is not the design's invariant and must not be reported as one | A fixture choice must not become a foundation requirement by mistaken attribution; checking readers alone can pass without any trust refusal, so the untrusted control is required | Verified imports, joins or scope transfer; that admission checks the source statement's truth |
| Account, T7 | The direction note's §5 as a manifest: assertion, capture and confirmation kinds; standing derived and versioned; the paired query and decision case; cancellation, correction, retraction and conflicting sources predeclared; literal expectations asserted; two or three episodes described by Hugh as the predeclared cases | The checker reproduced the smallest version on the current runtime; this is the full package without a live person | That a live person would keep it |
| Counting | Each spike's ledger records foundation changes needed, semantic repairs after its baseline under the first plan's §4.3, and what the campaigns found that the claims did not cover. Each spike reports when it ends, as established, counterexample or unresolved per claim, with the costs so far | Comparable with the landed ledgers; a finite checkpoint per spike, not one report after the last | A budget; these are exploratory spikes and their cost is reported, not judged |

## 4. Work breakdown

Each spike is one builder request and one checker review, with a
manifest frozen before authoring where a model is authored. Exits are
what the checker verifies at an exact head.

| Task | Entry | Exit | Review gate |
|---|---|---|---|
| T1 | This plan approved | The authoring plan's A1 and A2 tasks, unchanged | As that plan says |
| T3 | This plan approved | The obligation form in the descriptor and foundation, with its open-and-lapsed contract stated; Sale's join disclosure and Club's grant effect re-expressed; both campaigns pass and Club's negative controls still fail; delayed, missing and mismatched performance shown in fixtures with literal expectations at the prefixes in between; the property holds | Checker verifies the two re-expressions, the three performance controls and the negative controls |
| T4 | This plan approved; T3's form or a hand-written stand-in | Agent principals with grants, mandates and approval rules; the Sale negotiation fixture and one described episode, each a replayable transcript; the grantor, promiser and performer visible in `observe`; an over-reach refused; approval checked before effect, with refusal before approval, after revocation and on reuse; a two-agent shared decision under the property; an agent-proposed attach performed by the authorized person; affordances and queries answered to the agent before it acts | Checker verifies attribution, the over-reach and the three approval refusals, and that no view judges an agent act differently |
| T7 | This plan approved; episodes from Hugh | The account manifest frozen; the package authored under the checker; literal expectations and checker equality both asserted; the paired case; the described episodes replayed | Checker verifies the manifest's literal expectations against the runs |
| T2 | T1's A1 and A2 held, or hand-written after a T1 stop | The two composite rules implemented behind flags, with model state committed only on the composite verdict; the workflow-with-policy fixture with its intended outcomes frozen first; the base-accept, policy-reject control; the in-flight `stale_binding` case; no-backfill shown; each rule's result reported on its own | Checker verifies both rules' literal outcomes and that no policy-rejected transition is committed |
| T5 | T1's A1 and A2 held, or hand-written after a T1 stop | Migration at a boundary with prior outcomes unchanged, and a failed migration leaving the old state and bindings; lifecycle declarations compiled; `roster` on, six manifests re-frozen, join disclosures counted before and after, no verdict change at any corresponding act; three results, each reported | Checker verifies replay equality, the failed-migration postconditions and the counts |
| T6 | Hugh's written answer to the allocator question | `dap.admit` folded; the authorized and the untrusted control; the allocator fixture with the multi-context driver; the boundary diagnostic exercised | Checker verifies both controls' outcomes and the admitted facts' readers against the source's permitted export |
| Report | Each spike as it ends; a closing report at the last landing or stop | Per spike, when it ends: established, counterexample or unresolved for each claim, foundation changes named, repairs, costs so far, what the campaigns found. At the close: the answers handed to the design note, namely the composite verdict results, the obligation form, the agent approval rule, the migration rule, the lifecycle forms and the admission controls; and what each spike hands the pilot | Checker verifies every claim against committed runs |

## 5. What the spikes hand the pilot

The five-stage pilot in the direction note stays as it is and waits for
attention. When it comes, it starts with more than it has today.

| Pilot stage | From the spikes |
|---|---|
| stage 1, the brief | T4 says what an agent may do without asking and what needs approval, in tested terms; T7 supplies the account's cases |
| stage 2, the screens | T3 and T4 supply the obligation and approval cards to storyboard; T5 supplies the join and close flows; T2 supplies the one rule-change scene to storyboard, and whether people understand it is the pilot's question, not T2's |
| stage 3, one complete path | T7 is the account package; T3 replaces manual scaffolding with declared obligations; T1 provides the declaration checks it established |
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
