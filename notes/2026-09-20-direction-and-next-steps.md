---
date: 2026-09-20
revised: 2026-09-21
status: >-
  draft direction note, revised after codex's read-only review (workroom
  report 983e1aa6, ratified f06787c7), its service-led framing (report
  b0eacb0c), and a plain-language readability check. Not yet approved. It
  gathers the product framing of 2026-09-20 into one direction and an
  ordered set of next steps with stopping rules. It adopts nothing; each
  step names the request that would adopt it.
origin: >-
  Hugh's framing on 2026-09-20 (the device story, the structural
  disadvantage criterion, the bootstrap paradox, "for each person"); two
  outside views the same day; codex's review and framing named above.
bases: >-
  main e2977c8a; notes/2026-09-14-evolving-spaces-design.md §0, §1, §2,
  §5, §8, §9; notes/2026-09-15-sale-as-experienced.md;
  notes/2026-09-18-authoring-language-directions.md;
  notes/2026-09-18-compiler-spike-plan.md (revised);
  notes/2026-09-20-notation-spike-plan.md; spike/REPORT.md;
  spike/ORDERING-REPORT.md (its limits section);
  spike/src/foundation.ts (NOT_IN_V1); spike/src/context.ts;
  ONC, "Guide to Getting and Using Your Health Records" (healthit.gov);
  NAIC guidance on filing a homeowners insurance claim (naic.org).
design: notes/2026-09-14-evolving-spaces-design.md
narrative: notes/2026-09-15-sale-as-experienced.md
directions: notes/2026-09-18-authoring-language-directions.md
---

# Direction and next steps: useful alone, then one exchange, then one contribution

## In one paragraph

dap is for each person in a situation that does not fit one you-and-them
relationship: a claim, a care episode, a renovation, a sale. Every party
has their own view of one shared thing, and the design exists so that
those views can differ without disagreeing about what was decided. The
product is a coherent place to take part in such a situation as it spans
people, organisations and independently governed dealings. In everyday
words: "we're using this dap to track the claim." What "this dap" means
depends on which participants are talking about it, and the structure
inside it is whatever the relationship between those participants calls
for, from a chat to a checklist. By Hugh's criterion the strongest cases are the ones where one party is
structurally at a disadvantage, and those are the cases where that party
can least bring anyone else in. So the product must not depend on anyone
else adopting it. A person's space must give them a coherent, attributed
account of their dealings and a usable next step, while everyone else
stays on phones, email and portals. From there, participation deepens by
one small exchange at a time. The record keeps a person's own
assertions, captured material and other parties' signed acts apart, and
shows how far each fact can be relied on. The first experiment is one
person-controlled account, one
bounded episode, one real exchange through an ordinary channel, and one
voluntary contribution by another party. The success factor is comprehension: a person must be able to say what
this is about, what they can do now, and what they cannot see and why,
from the screen alone, and every stage is judged on that before
anything else. §8 says what the next tasks are: technology spikes on composition,
interaction, extensibility and agents as participants, carried a long
way before real-world modelling, because Hugh's attention for
coordinating real environments is limited now. The five-stage pilot is
the conditional follow-up, and nothing in it starts until a willing
person and a bounded segment of a real episode exist.

Two project terms are used throughout. A **context** is one governed
scope of decisions with one ordered record of events. A **perspective**
is everything one person can see across the contexts that concern them.

## 1. The problem

Hugh described Groove this way: imagine a service business handed one
customer a device for one purpose and for as long as it took. The device
connected that customer to everyone involved and gave them a shared
place to work. dap is that, for the real world where the parties are
many, the edges move, and nobody is in charge of the whole thing.

By Hugh's criterion the strongest cases are the ones where one party is
at a structural disadvantage: the patient without an advocate,
the claimant against the insurer. Those are also the cases where that
party can least bring anyone else in. The disadvantage belongs to a
position in the situation, not to a kind of person. In a dispute with
the insurer, the contractor is the disadvantaged party.

The product must not depend on suppliers joining. A supplier who sets up
a space for a customer is one good way in. A person who starts alone
must be served just as well.

## 2. The product and the first experiment

A person's perspective spans several contexts about the same thing,
not one context with one event order (design note §1). Those
contexts need not share decision authority. What a person sees is an
**anchor**: one screen composed across all of them. A claim, a repair and a rental car can be three contexts governed by three
parties, and one screen can show a person their place in all three. The
screen's layout does not force those three parties into one permission
scheme.

- **The product** is a coherent place to take part in a situation that
  spans people, organisations and independently governed dealings. It
  has several contexts, one perspective per person, and anchors composed
  across contexts.
- **The first experiment** is one person-controlled account for one
  bounded episode, with selected exchanges and contributions. It is a
  pilot choice, not the architecture.

**Four hypotheses, kept apart.** The Weixin survey supports the first
two directly and the third not at all. The third is dap's entry point.
The fourth is the larger opportunity, and the one the authoring work
exists for.

- (a) People will use light structure around a real activity.
- (b) An organiser or professional can introduce a tool through an
  existing relationship, and it saves their bookkeeping.
- (c) A person values a retained, attributed account across independent
  providers enough to maintain it, contribute to it, or pay for it.
- (d) An organiser, a developer or an assistant can turn a useful change
  in an arrangement into understandable interaction rules at acceptable
  total cost, while preserving earlier outcomes, appropriate views and
  authority.

The first three concern the personal-account entry point. The fourth is
about evolving interactions: acquiring and changing small,
relationship-specific rules without replacing the workspace, losing
history, or silently changing who sees what and who may act. A
successful static account does not establish (d); a failed entry route
does not refute it. The language work in the authoring plan is a way to
make such adaptation affordable, not something an end user is expected
to type.

The pilot is designed so that (c) can be observed on its own: what
currently stands, who said it, what is still disputed, and what the
person retains and can share when a helper or provider changes. Neither
aggregation nor a different architecture establishes that advantage by
itself, and existing products already offer parts of it; §7 names them
as the bar. For (d) the pilot carries one cheap observation, in stage 1
and stage 2 below, and no build.

The design's agreement property is about recorded decisions: everyone who can see a decision judges it the same way. It
does not mean agreement about what actually happened, what is owed, or
whose interpretation is right. Those stay open; §5 says how the record keeps them open.

### Comprehension is the success factor

The design's third goal, comprehension simplicity for a person, ranks
above lightweight decentralization and has never been measured.
Comprehension is the first design gate. Google Wave is the warning: its
mechanics were close to dap's, a replayable shared timeline with private
replies and attachable structure, and Google closed it in 2010 for
inadequate adoption. Why it was not adopted is commentary, not
established; what the closure shows is that sophisticated collaboration
mechanics alone do not ensure adoption. A record that is correct,
attributed and private, and that nobody understands, would fail the
same way.

dap has five hazards of the same shape, and each needs a legibility rule
the screens obey.

| Hazard | The person's experience | The rule |
|---|---|---|
| partial views | "some of this is missing and I don't know why" | the limits of the view are made clear: known hidden positions are shown, with whatever explanation the person is entitled to see, and where the source or the route to access is unknown the screen says so. The header of a hidden position carries no actor, audience or route, and disclosure can itself be private, so the screen never invents an explanation |
| structure arriving mid-stream | "this changed shape while I wasn't looking" | orientation is preserved when structure arrives: the person can still answer the three questions, and the new structure is announced as a change. Whether it appears as a card in the thread or as a compact case-and-next-action screen is tested, not assumed |
| standing that changes | "was Friday confirmed or not?" | every fact shows who said it, when, and how far it can be relied on; a change of standing is shown as a change, with the old evidence still visible |
| roles that are multiple and nebulous | "who is this person, and what can they do here?" | each participant is shown as what they are in this relationship, in the person's own words where possible, and their permissions are visible before they act |
| the anchor over several contexts | "which of these is the real one?" | one screen answers the three questions at the top; the threads beneath are labelled by relationship, and nothing on the screen uses the substrate's vocabulary |

The test is the five screen questions of §7, asked unaided. The stage 2
gate in §8 is a pass condition, not a record-keeping step. Familiar
forms are the first candidates to test: a numbered chain in a chat, an
email thread with comments, a checklist, a card on a board, a receipt, a
"forwarded" label. The Weixin survey shows such forms in mass use, but
their adoption also depended on the platform and the relationship around
them, so the form is a candidate, not a proven cause.

## 3. Participants, and the relationship a space serves

The everyday experience is "we're using this dap to track the claim",
together with a weak or strong offer or request to become a participant:
a link someone can open, an invitation carrying a role, a request to be
let in. "This dap" is a name the participants share. What it means
depends on who is talking. To the claimant and the adjuster it is the
claim. To the claimant and a sibling it is the claim together with the
family's own arrangements around it. To the adjuster and the contractor
it is the repair. The design's word for the shared thing is the
referent, and each person's view of it is their perspective. One name,
many meanings. No person's screen shows the whole situation, and
contexts and permissions remain distinct.

**Participation roles are multiple and may be nebulous.** For any one
space three questions can be asked, and the answers differ for each
kind of interaction and each space:

- who introduced it, or pays for it;
- whose interests it serves;
- who controls it: who holds the founding permissions, who chooses who
  runs it, and who can take the whole record away.

One person may answer all three. Several people may share one answer. In
the device story the insurer introduces and the customer is served; in a
family's arrangements nobody introduces and everyone is served; in the
first experiment the person who starts alone answers all three. A
supplier may introduce dap while the person it was introduced to keeps
their space, their history and their choice of representatives. None of
these roles is fixed by the product.

**The semantics in a space are for the relationship those participants
share.** They may be very unstructured or quite structured, and one
substrate carries both.

| Relationship | What passes between them | Structure | What dap enforces |
|---|---|---|---|
| siblings arranging who visits when | informal chat | no prescribed workflow | signed messages in a shared order, with access governed by the declared audience and disclosure rules and the stated hosting trust |
| a patient and a specialist | what-if questions, answers, a decision | light: a question has an answer, a decision has a date | the same, plus the few declared facts: this answer belongs to that question, this decision stands |
| a claimant and an insurer | the insurer's checklist, evidence, deadlines | strong: items, guards, standing | the checklist's rules, judged the same way by everyone who can see them |

Where the dap provides structure, it enforces it. Where it provides
only affordances for unstructured communication, enforcement is the
assurance that people can share in a trustworthy way: attribution,
order, and audience. In the design's terms that spectrum runs from the
Discussion package to the Sale package on one foundation, and a space
can gain structure part-way through by attaching a package, which is
the design's first goal.

**Help** is participation too, and it comes in three kinds. §6's test
records which kind supplied each thing a person could not do alone, so
the kinds must stay distinct.

| Kind of help | What it brings | What it does not establish by itself |
|---|---|---|
| a **human representative**: a family member, a friend, an appointed helper | attention, judgment, and authority to act for the person where the person grants it | expertise |
| a **service professional**, acting for a firm under a mandate | expertise, capacity, reputation, and colleagues who can take over | the person's own judgment or authority |
| a **personal agent** | administrative work, capture, drafting, reminders and the next step; and, with granted authority, participation: it may act in a context as a principal, hand work to others and take it through obligations, negotiate within declared limits with another party's agent, ask what it may do before acting, and propose changes to the arrangement for the person to approve | the person's judgment, or authority the person did not grant; every act it takes is attributed to it, and every act that needs approval waits for the person |

Personal agents can take part in dap in ways the Weixin comparison did
not anticipate, because in dap an assistant is an ordinary principal
(design note §1). A person may delegate a bounded authority to their
agent, the record shows who granted it, what the agent promised and what
it performed, and two people's agents can reach a shared decision in one
context that every view judges alike. That is the technology spike T4 in
the spikes plan, and it is why the row above says participation and not
only administration.

Hugh's phrase "through an agent of their choosing" is not yet an account
of control. The first experiment must say which of the three kinds of
help it supplies, what each may do without asking, what needs the
person's approval, and what happens when a helper disappears.

A **capability** says what someone may do. An **obligation** says what
they are expected or committed to do. Delegation to a helper is a
capability, granted by whoever holds the authority to grant it. A
promise the helper makes is an obligation. The record identifies who
granted the authority, who made a promise, and who performed it.

## 4. Participation deepens per relationship

Each relationship in a situation sits on its own rung. Different
parties are on different rungs at the same time, and stay there. A
rung says how deeply the other party takes part, not how structured the
space is; a chat and a checklist can each sit at any rung.

| Rung | The one who starts | Another party | What the space does |
|---|---|---|---|
| 0, alone | keeps their account: source material, questions, decisions awaiting them, a usable next step; invites a family member or appoints a helper | nothing | holds the account with attribution, offers the next step |
| 1, one exchange | sends a concise question, the relevant evidence or a proposed arrangement through the other party's ordinary channel | replies by email, portal or phone | composes the outgoing message; captures the reply with its source |
| 2, one action | asks "can you confirm this arrangement?" with a link | confirms an appointment, corrects a detail, supplies an estimate, introduces a colleague, because it is easier there | shows the other party their slice; records their act as theirs |
| 3, collaboration | works in the space | works in the space | the partitioned, evolving context the design describes |

**A generality check, not a first-pilot requirement.** The product must
still accommodate the service-led story the device analogy came from:

> A customer works with a named professional backed by a firm. A
> colleague takes over. A second, independent firm contributes. Another
> party stays outside.

Every product decision below is checked against this story. It adds
five requirements the personal-account entry point does not.

- The professional furnishes useful starting arrangements and actions,
  not an empty space.
- Each firm's engagement has its own scope, representative, authority
  and lifecycle.
- Replacing a representative does not silently cancel or recreate the
  firm's undertaking.
- The record identifies the acting person, the firm represented and the
  mandate.
- Trust evidence comes from existing relationships, introductions and
  attributed references. A platform score is not evidence. A signing key
  proves control of a key and nothing about competence or standing.

## 5. Three kinds of record, and standing that can change

The space keeps three records apart:

- "I understood the adjuster to say Friday."
- "This email from the adjuster says Friday."
- "The adjuster confirmed Friday in this space."

The first is an **assertion by the person keeping the account**: an
ordinary application event with them as actor. The third is a **signed
act by the other party as a participant**. An ordinary email carries no signature and no authority from
another dap context, so none of the design's import mechanisms apply to
it.[^import] It begins as a **capture event**: this person imported
these bytes, from this claimed source, at this time. The bytes are kept
unchanged. Any extraction or interpretation is recorded separately and
attributed to whoever did it. The other party is never credited with the
importer's assertion.

A fact's **standing** is derived from which records support it, and it
must be able to change. Evidence is immutable; conclusions are not.
Suppose Friday was confirmed in the space, and then the person reports
that the appointment was cancelled by phone. The confirmation stays
authentic and stays in the record. The current arrangement is now
disputed or uncertain, and the screen must say so. Weaker evidence never
erases stronger provenance. It changes what it is prudent to rely on. So
the account's cases include not only missing confirmation but
cancellation, correction, retraction and conflicting sources. A person's
own coherent account never requires the other party's agreement.

One boundary follows, and it is a specification to state before the
account package is written. A query indexed by a viewer describes that
viewer's selected view, not the whole relation: "my evidence disputes
Friday" is a valid personal query. The constraint is on validation
rules, not on anyone's private grounds for choosing an act: a person may
decide to act on evidence only they hold, but a rule that decides
whether a shared act is effective may not depend on evidence that is
not readable by everyone the act binds. A public decision whose guard
reads undisclosed reports is rejected. The account's cases pair the
two.

A history of what an insurer said helps the person who kept it, and
harms the same person if it is wrong. So the screen always shows
standing, and an act a helper performed is recorded as the helper's.

[^import]: In the design's terms: an email is neither an adopted origin,
    which must be a signed event, nor a `dap.admit`, which imports an
    assertion from another context at an exact prefix of its record.
    Admission is needed only when material arrives with authority of its
    own, such as a signed assertion from another dap context, and that is
    not on the first experiment's path.

## 6. The cases, and the test of an absent advocate

### A care episode

There is no advocate, and the patient should control their own
encounters and histories. Begin
with preparing for one encounter and following through afterward.
Patient control means control of their space, retained copies,
delegation, sharing and continuity across providers. It cannot mean
control over records held elsewhere, or recalling what was already
disclosed. The first tasks are the ones in the ONC guide: obtain, check
and use your records.

Role in the experiment: the purpose test, and the hardest case to bring
providers into.

### A bounded property claim

An identifiable beginning, and concrete exchanges of evidence,
estimates, requests and decisions. The material already exists in the
process: NAIC's guidance describes inventories, photographs, receipts and
coordination between homeowner, contractor and adjuster. The homeowner
benefits before the insurer adopts anything, and the parties the
homeowner pays have a reason to climb the ladder.

Role in the experiment: the provisional operational test. Actual access
to a willing person may reasonably favour the care episode instead.

### A renovation

An effective general contractor already coordinates. The dap moments are
where the owner's interests cross that arrangement: disputed scope,
independent advice, changing contractors, carrying the history forward
afterward.

Role in the experiment: the comparison case.

### Testing the absence of an advocate

If the prototype succeeds because a diligent person quietly notices
everything, it has not shown that an unsupported person gains agency. So
the experiment records what the person could not get done without
someone acting for them, which of the three kinds of help supplied it,
and which of those dap changed. The report names each need as met,
unmet, or supplied by a human.

## 7. What exists, and what does not

What the first experiment needs, the state of each piece, and what to
do. "Demonstrated" means shown in the executed fixtures, which is what
the spike reports claim. Nothing here is proven in general.

The screen questions referred to below are the design's three, from goal
3: what is this about, what can I do now, and what can I not see and
why. The experiment adds two: who said this, and what remains
unconfirmed. Every screen also obeys the legibility rules of §2.

| Needed by | Piece | State | What to do |
|---|---|---|---|
| rung 0 | partitioned views, disclosure to a late-joining helper, attaching a package mid-stream | demonstrated in the executed fixtures | reuse |
| rung 0 | invite a family member, appoint a helper with a role | foundation invite and grant | reuse; what the helper may do without asking is a product decision (§3) |
| rung 0 | the account package: the three record kinds, capture events, standing that can change | not designed | design and author it as the first package, under the checker, with the §5 cases predeclared |
| rung 0 | the five screen questions and the anchor | the narrative note says the anchor is implemented nowhere and offered actions carry no targets | build a minimal client over the projection, with derived actions that name their targets |
| rung 0 | a personal agent as an ordinary principal with granted authority and approval rules | in the design; obligations proposed in the directions note; spikes T3 and T4 | not a prerequisite for the pilot; manual steps are acceptable scaffolding if visible and counted; the spikes build the form |
| rung 1 | capture of external material with its source, and an outgoing message composed from the account | nothing | the capture event is application-level, in the account package; the message is a rendered query; no transport |
| rung 2 | another party's slice by link, and their act recorded as theirs | test keys and fixture routing only; nothing authenticated (see below) | before any real link: the four prerequisites listed below |
| any real episode | a provisional operator, storage, export, recovery, a stated privacy boundary | nothing | choose them before the episode; long-term deployment can wait |
| any real episode | the baseline: existing chat and email plus a shared document, calendar or checklist, selected with the person | exists everywhere | this is what "less burden than the previous method" is measured against |
| any real episode | the bar for useful-alone: products that already offer parts of it, such as care coordination with calendars, tasks and messages, a person-held health record with imported documents and time-limited sharing, a client hub tied to quotes and appointments, a shared inbox with internal discussion and guest conversations, and assistants that draft across apps with named approval | exist; advertised capability, not evaluated here | the pilot's distinguishing observation is what stands, who said it, what is disputed, and what the person retains and can share when a helper or provider changes |
| rung 1 and 2 | the path to test first: an ordinary link, an understandable page, one scoped confirmation, an explicit receipt back through the existing channel; manual return, capture and notification allowed if counted | nothing | build this path; the survey's four chat designs and its identity and payment options are background, not stages |
| any card | preview data authored separately and public-safe, never the private anchor's title, status or summary, since chat platforms crawl links and a crawler must neither consume an invitation nor gain access | nothing | required before any card is shared |
| any | packages whose view property holds for the checked fragment | the authoring plan's step 1, claims A1 to A3 including the corpus check | run it independently beside the product work |
| later | a helper who joins late reads the public history | the retroactive audience | its own experiment; now product-motivated |
| later | continuity across episodes and providers | design §1, unbuilt | after the first episode |
| later | assertions imported with their own authority from another context | `dap.admit`, `not_in_v1` | when a concrete need arises |
| later | agent adaptation of packages per case | the authoring plan's steps 2 and 3 | gated, as revised |

What "nothing authenticated" means for the rung-2 row:

- the fixtures use deterministic per-person test keys and fixture
  routing;
- the ordering report excludes authenticated transport and production
  onboarding from what it demonstrated;
- the view function is not network access control;
- a signature proves control of a key, not that its holder represents a
  firm.

So before any real link, four prerequisites: a reachable invitation
flow, authenticated reads, contribution rights scoped to one act, and a
plain statement of what "confirmed as theirs" establishes.

## 8. Next tasks: technology spikes now, the pilot when attention allows

**The next task** is the set of technology spikes in the spikes plan
(`2026-09-22-technology-spikes-plan.md`): the declaration layer,
composition, obligations, agents as participants, extensibility,
admission and the account package, each independent, each on the
harness, each with its own stop rule, and none needing a real
environment. Hugh chose this order on 2026-09-22: his attention for
coordinating real environments is limited now, and the open questions
around composition, interaction and extensibility should be carried a
long way before real-world modelling, with his guidance from past events
supplying the episodes the spikes need.

**The conditional follow-up** is the pilot below, unchanged in shape. It
starts when attention allows and a willing person exists, and by then
the spikes will have handed it tested forms for obligations, approvals,
joining, closing and the account itself; the spikes plan's §5 says
which. Product evidence still comes before general infrastructure: the
spikes settle rules on fixtures, they do not build a platform.

Each stage is one workroom request when it is next; none is filed by
this note. A fixed observation window around the episode means the real
exchange is sought early, not after the whole case has run.

The stages run in order. Stage 2 may use sanitized or invented material
before stage 1's trust boundary is settled; no real material is used
before it. Stage 3 builds against stage 2's record. Stage 4 needs stages
1 and 3. Stage 5 happens when the observation window ends or an earlier
stop is reached, whether or not an exchange was answered. Deployment and
runtime choices wait for stage 5.

### Stage 1: choose the episode and the operating boundary

Owner: Hugh, with builder for the boundary.

Produces, in one brief: a willing person; a bounded segment of a real
episode, a week, one encounter or one claim exchange, not the whole case;
their current method, recorded; the help they will be supplied under §3
and what needs their approval; the ordinary channels involved; the
immediate outcome they want; who introduces the space, whose work it
saves, and the concrete request that gives another party a reason to
act, since a card is an access mechanism and "join our space" is not a
reason; a fixed observation window; a fixed budget of screen revisions
and fresh recruits for stage 2; and the pilot's operating boundary: a
provisional operator, storage, export and recovery arrangements, and the
privacy boundary stated in plain words, with who can read what during
the pilot and how that is enforced. The claim is preferred; whichever
case a willing person can be found for decides. The preferred introducer
is an aligned, recurring organiser or professional who is already
reachable, not a new sales effort. The brief also says who writes and
maintains the package for this pilot; a small hand-written catalog is a
legitimate start and is not to be confused with agent-created rules. And
it asks the introducer for two recent cases and one exception their
current template handles poorly, distinguishing ordinary configuration
from an actual new rule; the absence of a useful exception is a finding
too.

Stop when: no willing person with a bounded segment exists, or the
boundary cannot be stated honestly for the chosen segment. Then choose
another segment or wait; no later stage starts.

### Stage 2: test the screens

Owner: builder, then five people.

Produces: a storyboard on a phone using the chosen segment, asking the
five screen questions of §7 unaided, including a changed arrangement,
a change of standing, and selected sharing with one other party; five
people asked, none of them involved in building it; the observed
answers, the revisions they caused and the remaining blockers recorded.
Where stage 1 supplied a useful exception, one more scene tests
hypothesis (d): an informal request gains a confirmation that names its
target, the arrangement changes, and the participants can still say what
stands, who may act, and what is private. If the episode supplied no
exception, that scene is a clearly separated follow-up.

Passes when: four of the five answer all five questions correctly,
unaided, on every screen shown, and each performs one useful action on
it. The five are plausible users of the chosen episode. A screen that
fails is revised and asked again of fresh people, within the revision
and recruitment budget set in stage 1. If the budget is exhausted, the
learning is recorded and the work returns to the episode and its
framing without proceeding to build. A failing screen is a design
revision, not a verdict on the direction. Five people find problems;
they do not estimate adoption.

### Stage 3: build one complete path

Owner: builder, with checker on the package.

Produces, in one implementation request with internal checks: the
account package, from a manifest frozen before authoring, with the three
record kinds, capture events, standing that can change, the cases of §5
predeclared including cancellation, correction, retraction and
conflicting sources, the paired personal-query and rejected-public-decision
case of §5, and a privacy budget, with literal expected standing,
provenance and readership asserted as well as checker equality, since a
consistently wrong account can still agree with itself; authored under
the checker, with specification, authoring and repair, human review and
operating effort recorded;
and a minimal client over it for the chosen segment, with the anchor and
actions that name their targets. Manual capture and confirmation are
allowed, if visible and counted.

Stop when: for some participant and visibility basis, the standing that
participant's own view derives differs from the oracle's projection for
that same participant. Different evidence may support different
standing for different participants; shared visible outcomes must agree.
A mismatch sends the account rules and their visibility dependencies
back for revision. Otherwise the stage ends when the client runs the
chosen segment over the package.

### Stage 4: run the bounded episode

Owner: the person, with the help chosen in stage 1.

One pilot, three kinds of value observed inside one window, so that
hypothesis (c) of §2 is seen on its own:

- organiser value: the current arrangement, its source and the next
  step found with less total burden than the previous method;
- contribution value: one specific confirmation or correction another
  party answers because it helps their own immediate work;
- continuity and control value: a real or clearly labelled simulated
  handoff to a helper, using a selected slice, without reconstructing
  the case or exposing unrelated material.

And three observations:

- **Alone.** The account kept with every other party outside. Measured:
  the total burden of capture, correction, approvals, permissions and
  helper or operator work, counted separately for the person, any helper
  and the operator; whether a usable next step existed when one was due,
  allowing that waiting is sometimes the right step; comprehension and
  useful action against the person's previous method; whether the three
  record kinds stayed distinct; the advocate ledger of §6.
- **One ordinary exchange, early.** One concise question or proposed
  arrangement sent through an ordinary channel; the reply captured with
  its source; standing updated. If the reply cannot be captured without
  re-keying, that is a finding about ingestion usability, not about the
  foundation.
- **One direct contribution, optional.** After the four rung-2
  prerequisites of §7, which become their own small request once the
  exchange has shown one is wanted: one "can you confirm this
  arrangement?" link; the other party acts once; whether they did, what
  they saw, the friction, whether it deepened. A refusal is a finding.
  One party is not a market test.

Also recorded: the work replaced and the work added; whether the person
returns unprompted when another need arises; whether the introducer
wants to use it for another case. A reply through an external channel
is captured evidence, never that party's signed act. Failure to get a
direct contribution does not refute useful-alone value, and useful-alone
success does not establish the collaboration hypothesis.

Stop when: the burden exceeds the previous method with no gain in
comprehension or action. Then it is a filing system, and the first
experiment of §2 is redesigned.

### Stage 5: review

Owner: Hugh.

Produces, when the window ends or an earlier stop is reached: what the
pilot established, with each exchange and contribution classified as
completed, declined, unanswered or not attempted, and why; the advocate
ledger; the generality story of §4 checked against every product
decision made; whether to proceed to deployment and runtime choices, and
with which constraints. This is the decision point.

### Beside the pilot: the authoring step

Owner: builder, checker. Independent of the stages.

Produces: the revised authoring plan's claims A1 to A3. The declaration
layer can express the Sale package, rejects the known bad shapes, and
holds across the existing package corpus.

Stop when: any of A1, A2 or A3 is refuted. Then packages stay
hand-written and the catalog is small.

## 9. What this note does not decide

- Which real episode stage 1 uses, and which of the three kinds of help
  the pilot supplies. Stage 1 decides.
- A surface syntax for packages, the runtime, WebAssembly, payment,
  discovery, identity beyond an engagement, and deployment
  infrastructure.
- Whether the multi-organisation story of §4 becomes the second
  experiment. It is a design check now; the second experiment is chosen
  at stage 5.
