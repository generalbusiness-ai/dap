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
people, organisations and independently governed dealings. By Hugh's criterion the strongest cases are the ones where one party is
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
voluntary contribution by another party. §8 lists the steps. Nothing
starts until a willing person and a bounded segment of a real episode
exist.

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

The design's agreement property is about recorded decisions: everyone who can see a decision judges it the same way. It
does not mean agreement about what actually happened, what is owed, or
whose interpretation is right. Those stay open; §5 says how the record keeps them open.

## 3. Who introduces it, who it serves, who controls it, and who helps

Every space has three roles. Any party may hold all three for a space of
their own.

| Role | In the device story | In dap | In the first experiment |
|---|---|---|---|
| introduces or pays | the insurer, the realtor | whoever sets up the space and publishes its address | nobody, or the person's helper |
| whose interests it serves | the customer | the person the space is built to show things to | the person who starts alone |
| controls | left ambiguous | holds the founding permissions, chooses who runs the space, and can take the whole record away | that person |

A supplier may introduce dap while the person it was introduced to keeps
their space, their history and their choice of representatives.

Help comes in three kinds. §6's test records which kind supplied each
thing the person could not do alone, so the kinds must stay distinct.

| Kind of help | What it brings | What it does not establish by itself |
|---|---|---|
| a **human representative**: a family member, a friend, an appointed helper | attention, judgment, and authority to act for the person where the person grants it | expertise |
| a **service professional**, acting for a firm under a mandate | expertise, capacity, reputation, and colleagues who can take over | the person's own judgment or authority |
| a **software assistant** | administrative work: capture, drafting, reminders, the next step | judgment, expertise, or authority to intervene |

Hugh's phrase "through an agent of their choosing" is not yet an account
of control. The first experiment must say which of the three kinds of
help it supplies, what each may do without asking, what needs the
person's approval, and what happens when a helper disappears.

A **capability** says what someone may do. An **obligation** says what they are expected or committed to do.
Delegation to a helper is a capability, granted by whoever holds the
authority to grant it. A promise the helper makes is an obligation. The
record identifies who granted the authority, who made a promise, and who
performed it.

## 4. Participation deepens per relationship

Each relationship in a situation sits on its own rung. Different
parties are on different rungs at the same time, and stay there.

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
unconfirmed.

| Needed by | Piece | State | What to do |
|---|---|---|---|
| rung 0 | partitioned views, disclosure to a late-joining helper, attaching a package mid-stream | demonstrated in the executed fixtures | reuse |
| rung 0 | invite a family member, appoint a helper with a role | foundation invite and grant | reuse; what the helper may do without asking is a product decision (§3) |
| rung 0 | the account package: the three record kinds, capture events, standing that can change | not designed | design and author it as the first package, under the checker, with the §5 cases predeclared |
| rung 0 | the five screen questions and the anchor | the narrative note says the anchor is implemented nowhere and offered actions carry no targets | build a minimal client over the projection, with derived actions that name their targets |
| rung 0 | a software assistant as an ordinary principal | in the design; obligations proposed in the directions note | not a prerequisite; manual steps are acceptable scaffolding if visible and counted; add the obligation form when a concrete need arises |
| rung 1 | capture of external material with its source, and an outgoing message composed from the account | nothing | the capture event is application-level, in the account package; the message is a rendered query; no transport |
| rung 2 | another party's slice by link, and their act recorded as theirs | test keys and fixture routing only; nothing authenticated (see below) | before any real link: the four prerequisites listed below |
| any real episode | a provisional operator, storage, export, recovery, a stated privacy boundary | nothing | choose them before the episode; long-term deployment can wait |
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

## 8. Next steps

Product evidence comes before general machinery. A fixed observation
window around the episode means the real exchange is sought early, not
after the whole case has run.

**How the steps depend on each other.** R1 selects the segment. R2
finalizes the pilot trust boundary for that segment, so it needs R1. R3
needs R1 and may use sanitized or invented material before R2; no real
material is used before R2. R4 and R5 may be prototyped together against
an agreed contract, but R5 completes only after it runs over R4's
package. E1 needs R2, R4 and R5. E2 happens inside E1's window. E3 needs
the four rung-2 prerequisites of §7, which become their own small request
once E2 has shown that an exchange is wanted. P6 runs on its own. R6
happens when the observation window ends or an earlier stop is reached,
whether or not E2 and E3 completed. Deployment and runtime choices wait
for R6.

| Step | Who | Needs |
|---|---|---|
| R1 Choose the person and the segment | Hugh | nothing |
| R2 Pilot trust and control | Hugh with builder | R1 |
| R3 Phone mock on that episode | builder, then five people | R1 |
| R4 Account package | builder, checker | R3 |
| R5 Smallest end-to-end | builder | R3, and R4 to complete |
| E1 The episode, alone | the person, with the help chosen in R1 | R2, R4, R5 |
| E2 One exchange, early | the same person | inside E1 |
| E3 One contribution | the same person and one other party | E2, and the rung-2 prerequisites |
| P6 Authoring step 1 | builder, checker | nothing |
| R6 Direction review | Hugh | the window's end, or an earlier stop |

Each is one workroom request when it is next. None is filed by this
note.

### R1 Choose the person and the segment

Produces:

- a willing person;
- a bounded segment of a real episode: a week, one encounter, or one
  claim exchange, not the whole case;
- their current method, recorded;
- the help they will be supplied under §3, and what needs their
  approval;
- the ordinary channels involved;
- the immediate outcome they want;
- a fixed observation window.

The claim is preferred. Whichever case a willing person can be found for
decides.

Stop when: no willing person with a bounded segment exists. Then the
pilot waits, and no later product step starts; P6 is unaffected.

### R2 Pilot trust and control

Produces: a provisional operator; storage, export and recovery
arrangements; the privacy boundary stated in plain words; who can read
what during the pilot, and how that is enforced.

Stop when: the boundary cannot be stated honestly for the chosen
segment. Then choose another segment.

### R3 Phone mock on that episode

Produces: a storyboard on a phone using the chosen segment, asking the
five screen questions of §7, including a changed arrangement and
selected sharing with one other party; five people asked.

Ends when: the observed answers, the revisions they caused and the
remaining blockers are recorded. A failing screen means a design
revision, not a verdict on the direction, and implementation does not
proceed until the record exists.

### R4 Account package

Produces: a manifest frozen before authoring, with the three record
kinds, capture events, and standing that can change; the cases of §5
predeclared, including cancellation, correction, retraction and
conflicting sources; a privacy budget; the package authored under the
checker.

Stop when: for some participant and visibility basis, the standing that
participant's own view derives differs from the oracle's projection for
that same participant. Different evidence may support different
standing for different participants; shared visible outcomes must agree.
A mismatch sends the account rules and their visibility dependencies
back for revision.

### R5 Smallest end-to-end

Produces: a minimal client over the account package for the chosen
segment, with the anchor and actions that name their targets. Manual
capture and confirmation are allowed, if visible and counted.

Ends when: the client runs the chosen segment over R4's package.

### E1 The episode, alone

Produces: the account kept through the window with every other party
outside, and these measurements:

- the total burden of capture, correction, approvals, permissions and
  helper or operator work, counted separately for the person, any
  helper and the operator;
- whether a usable next step existed when one was due, allowing that
  waiting is sometimes the right step;
- comprehension and useful action, against the person's previous
  method;
- whether the three record kinds stayed distinct;
- the advocate ledger of §6.

Stop when: the burden exceeds the previous method with no gain in
comprehension or action. Then it is a filing system, and the first
experiment of §2 is redesigned.

### E2 One exchange, early

Produces, inside the window: one concise question or proposed
arrangement sent through an ordinary channel; the reply captured with
its source; standing updated.

A failure means: if the reply cannot be captured without re-keying, that
is a finding about ingestion usability, not about the foundation.

### E3 One contribution

Produces, after the rung-2 prerequisites: one "can you confirm this
arrangement?" link; the other party acts once; measurements of whether
they did, what they saw, the friction, and whether it deepened.

A failure means: a refusal is recorded as a finding. One party is not a
market test.

### P6 Authoring step 1

Produces: the revised authoring plan's claims A1 to A3. The declaration
layer can express the Sale package, rejects the known bad shapes, and
holds across the existing package corpus.

Stop when: any of A1, A2 or A3 is refuted. Then packages stay
hand-written and the catalog is small.

### R6 Direction review

Produces: what E1 to E3 established, with each exchange and contribution
classified as completed, declined, unanswered or not attempted, and why;
the advocate ledger; the generality story of §4 checked against every
product decision made; whether to proceed to deployment and runtime
choices, and with which constraints.

Stop when: never. This is the decision point.

## 9. What this note does not decide

- Which real episode R1 uses. The claim is the provisional operational
  test and the care episode the purpose test; access decides.
- Which of the three kinds of help the pilot supplies, and what each may
  do. R1 decides.
- A surface syntax for packages, the runtime, WebAssembly, payment,
  discovery, identity beyond an engagement, and deployment
  infrastructure.
- Whether the multi-organisation story of §4 becomes the second
  experiment. It is a design check now; the second experiment is chosen
  at R6.
