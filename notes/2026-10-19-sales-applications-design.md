# Three sales applications: the prospect room, the bid response and the marketing calendar

Design note, 19 October 2026. Proposed functionality: nothing here is
built. The three applications are packages in the sense of the
[applications note](2026-10-15-self-contained-applications.md), built
on the forms the grow room is landing ([grow note](2026-10-17-grow-operation-application-design.md),
[plan 033](plans/033-2026-10-18-grow-room-demo.md)). The sales motions
they cover are the ordinary ones: finding and talking to prospects,
answering a formal request for proposals as a team, and publishing
marketing on a schedule.

## 1. Why

Selling is teamwork with commitments. An account executive owns the
deal, but a sales engineer answers the technical questions, a product
manager vouches for what ships when, legal and security review the terms,
and a manager decides whether to bid and approves the price. The buyer
asks questions and expects the answers to hold. Later, someone asks what
was promised, by whom, and on which version of the proposal.

Today's tools keep most of this in documents, chat threads and a record
that one person updates by hand. Three things get blurred that dap keeps
apart:

- **Who said it.** An assistant's draft, a person's signed statement and
  the other party's confirmed answer are
  [three kinds of statement](../docs/use-cases.md#three-kinds-of-statement).
  A roadmap claim in a bid is worth something only when the product
  manager signed it, with the roadmap version it rests on, and the
  sales engineer who reviewed it into the response is a second, separate
  signature.
- **Who may decide.** A discount, a go or no-go, a submission and a
  published post each need a holder of the right authority, at an exact
  version. Dap's acts carry their grant, so the question "could this
  person do that" never needs a tool's settings page.
- **What needs me.** Each member's part is a short list: the
  requirements asked of me that I have not yet answered, the proposals waiting
  for my decision, the posts due this week. The grow room's per-member
  carousel is the same view with different nouns.

Agents do most of the drafting, chasing and checking. People sign the
commitments. The record answers "what happened" without anyone having
written it up.

## 2. Why not just an agent

A personal agent now holds context about you, keeps working after you
close the window and acts on your behalf: it browses, fills forms,
drafts, chases, schedules its own tasks, asks you before a sensitive
step and remembers across tasks. The best ones run on your own machine
or server. Each application below assumes every member has one. The
question is what the room adds that the agent cannot supply by itself,
however good it gets.

- **The agent is one party. Selling is several.** Your agent works for
  you; the product manager's works for her; the buyer's for the buyer.
  An agent that "does the bid for me" reaches the others through mail
  and chat, waits, and merges their replies into its own notes, where
  each person's answer becomes its paraphrase. The room is where their
  agents and yours meet: each person answers in their own app, under
  their own name, and the record keeps their words. Nothing is re-keyed
  and nothing is paraphrased.
- **A yes in a chat is not authority.** The agent asks "shall I send
  this?", you say yes, and that yes lives in a transcript only the agent
  holds. In the room the authority is on the act: a discount is granted
  by a holder of the pricing grant at an exact revision, a roadmap claim
  is signed by the product manager with its source, a submission is
  sealed by management. The agent cannot sign any of these, not because
  it was told not to but because it holds no grant, and "could the agent
  have done that" has a checkable answer: no. The same guard decides
  what the agent may propose and what each person is offered.
- **An agent's memory is private and fallible. The record is shared
  and exact.** An agent remembers what it noticed and summarizes the
  rest; two agents remember differently; what the buyer said becomes
  the agent's summary of a mail. The record is a journal of signed acts
  with the revision each decision bound to, replayable without any
  agent and archived in Git. "What did we promise in row 212, and who
  signed it" is a lookup, a year later, by the next account executive,
  after the agent that did the work has been replaced.
- **Rules run in the room, not in an agent's loop.** The stale account,
  the two-day reminder, the deadline: these are the room's timed rules,
  visible to every member and firing whether or not any agent is up. An
  agent's scheduled task is a promise it makes to itself.
- **Routing is a rule, not a judgement.** Who may answer a security
  requirement is a grant; who should is a rule over grants, presence
  and state. An agent can propose, and a misroute is a visible refusal.
  A personal agent routes by what it believes about people.
- **Agents are replaceable, and many.** Because authority and the
  record live in the room, each member brings their own agent, a team
  runs several (intake, drafting, chasing) from different makers, swaps
  one out, and removes a bad one while its acts stay attributed and
  visible. The room does not care which agent did the work; it cares
  who signed.
- **Done means the same thing to everyone.** Each person's "needs you"
  is derived from the same record, so the sales engineer's list and the
  product manager's list agree, and "done" for the bid is a state with
  a guard, not an agent's opinion.

What an agent alone does well: one person's work, with no commitment to
anyone else and nothing to prove later. The prospect room's research and
drafting are that, and the owner's agent does them. The moment a second
person's signature matters, or a decision must be found later, the
record is the thing an agent cannot be.

## 3. What the three share

Each application is its own package. They share a vocabulary, not code:

- **A commitment** is an item with an owner, a state, and a decision
  taken by a holder of a grant at an exact revision. Its acts are
  propose, verify, approve, submit, accept and close, in the sense the
  [use cases](../docs/use-cases.md#what-a-reusable-application-needs-to-say)
  give those words.
- **An outside party's word** enters the record in one of two ways. If
  the party is a member, it is their own signed act, from their own AI
  app or browser. If not, it is a member's signed report of what the
  party said, with its source named. The record never shows a reported
  reply as the party's act.
- **Deadlines are timed rules.** A reminder, a stale mark and an expiry
  are rules on the item, and they write attention to the owner, never an
  invented state.
- **Routing is a view rule.** Who sees an item in their "needs you"
  carousel follows from the item's state, the viewer's grants and, where
  it matters, the viewer's presence, as the grow room's routing decides
  ([decision 72c9d5e5](plans/033-2026-10-18-grow-room-demo.md)).
- **Documents stay outside the record** until custody exists
  ([roadmap](../docs/roadmap.md#evidence-capture-and-private-custody)).
  The record keeps a link and a digest, and says so.
- **Integrations are out of scope.** Mail, calendars, sales systems and
  channels are not built as point integrations for these applications;
  they wait for a general design of outside operations
  ([roadmap](../docs/roadmap.md#outside-parties-and-systems)). The one
  operation that exists today, publication to a Git destination, is
  used where it fits. Everything else that crosses the boundary enters
  as a member's statement that they did it, with its source.

## 4. The prospect room

For one seller, or a small team, with their own assistant. The
assistant does the research, the drafting and the chasing; the room adds
the signed sends, the prospect's words kept as theirs, the proposal
accepted at an exact revision, and the record the next assistant reads.

### 4.1 Parties and authority

| Member | Kind | Does |
|---|---|---|
| Owner | person | Signs outreach, records replies, proposes, decides stages |
| Assistant | agent, the owner's | Drafts outreach and proposals, summarizes, asks "what next" |
| Researcher | agent | Writes research notes on an account from public sources, each with its source |
| Prospect contact | person, optional member | Accepts or declines a proposal from their own AI app |

| Grant | Held by | Acts |
|---|---|---|
| `sell.own` | owner | `open-account`, `send-outreach`, `record-reply`, `propose`, `set-stage`, `defer`, `close` |
| `sell.draft` | assistant, researcher | `research-note`, `draft-outreach`, `draft-proposal` |
| `sell.accept` | prospect contact | `accept-proposal`, `decline-proposal` |

A draft never leaves the room by itself: `send-outreach` is the owner's
act, and the act records the draft's revision that was sent. The
researcher's notes carry a source each and are refused without one.

### 4.2 The interaction

The owner names an account and the researcher writes three notes on it.
The assistant drafts an opening message; the owner edits and signs
`send-outreach`, which records the text as sent. Five days pass with no
reply: a timed rule marks the account "waiting" and the carousel shows
it with the sent text and the date. The prospect replies by mail; the
owner records the reply with `record-reply`, quoting it, so a later
"what did they say" is answered from their words. A call is booked and
recorded the same way.

The assistant drafts a proposal from the notes and the replies. The
owner signs `propose`, which fixes the proposal's revision. If the
prospect is a member, they see the proposal card in their AI app with
Accept and Decline, and their act is the acceptance. If not, the owner
records their answer with its source. Accepting a changed proposal needs
a new `propose`; the old revision stays in the record as declined or
superseded.

The week's review is the assistant reading the journal: which accounts
moved, which are waiting, which the owner has not touched in two weeks.

### 4.3 Definitions

**Items.** `account` (states `researching`, `contacted`, `waiting`,
`in-conversation`, `proposed`, `won`, `lost`, `dormant`; values: name,
stage note, last touch time; refs: last touch, current proposal),
`note` (a researcher's finding with its source), `touch` (one outreach
or reply, with its text, direction and the revision of the draft it
sent), `proposal` (states `drafted`, `sent`, `accepted`, `declined`,
`superseded`; values: summary, terms text; refs: the account, the
acceptance entry).

**Acts.** `open-account`, `research-note` (guard: a source), `draft-outreach`,
`send-outreach` (writes a `touch` and moves the account to `contacted`
or keeps `in-conversation`), `record-reply` (writes a `touch` with the
quoted text and its source), `draft-proposal`, `propose` (fixes the
revision, moves to `proposed`), `accept-proposal` and `decline-proposal`
(the prospect member's, guarded by `sell.accept`), `record-answer` (the
owner's report of a non-member's answer, with source), `set-stage`,
`defer` (to a date), `close` (won or lost, with a reason).

**Timed rules.** No reply for five days after a sent touch: the account
becomes `waiting` with attention to the owner. No touch for twenty-one
days: `dormant`, attention to the owner. A proposal's stated validity
passes: the proposal is `superseded` and the owner is told.

**Views.** The account carousel for the owner (accounts needing a
decision or a touch, oldest first, with the last text and its age), the
account record (notes, touches, proposals, in order), the proposal card
(for the prospect member: summary, terms, Accept and Decline; for the
owner: the same without acts), the week's log.

### 4.4 What it needs

Everything in 3.3 is within the forms the grow room uses: items, acts
with grants and guards, timed rules, declared views and the generic
interface. Sending mail is the owner's statement, not an operation. The
prospect as a member needs an invitation, which exists. A proposal
document beyond its text needs custody; until then the record keeps a
link and a digest.

## 5. The bid response

For a team answering a formal request: an account executive who owns
the bid, a sales engineer, product managers, legal, security and
pricing, a manager who decides, and the buyer. The intake and drafting
agents do the heavy lifting; the room is where the team's signatures,
grants and deadlines live, so the response is the team's, and provably
so.

### 5.1 Parties and authority

| Member | Kind | Does |
|---|---|---|
| Bid owner | person, the account executive | Takes in the request, assigns requirements, asks the buyer, assembles and submits |
| Experts | people: product managers, legal, security, finance | Supply the answers in their domain, signed as their own statements |
| Sales engineer | person | Supplies technical answers, asks experts, and reviews every answer into the response |
| Approvers | people: pricing, management | Grant or refuse the price and the go or no-go, decide submission |
| Buyer | not a member in the first version | Their questions, answers and the award enter as the bid owner's recorded reports, each with its source |
| Intake agent | agent, hosted ([hosted agent teams](2026-10-15-hosted-agent-teams-design.md)) | Decomposes the request's spreadsheets into requirements, and renders the verified answers back into the buyer's layout |
| Drafting agent | agent | Drafts answers from the answer library, flags inconsistencies, chases due dates |

| Grant | Held by | Acts |
|---|---|---|
| `bid.own` | bid owner | `intake`, `assign`, `ask-buyer`, `record-buyer-answer`, `confirm-mapping`, `remap`, `assemble`, `record-outcome` |
| `bid.decide` | management | `decide-go`, `decide-no-go`, `submit` |
| `bid.review` | bid owner, sales engineer | `ask-expert`, `review-answer`, `send-back`, `decline-requirement` |
| `bid.technical` | sales engineer | `supply-technical` |
| `bid.product` | product managers | `supply-product` |
| `bid.legal` | legal | `supply-legal`, `approve-terms`, `refuse-terms` |
| `bid.security` | security | `supply-security` |
| `bid.price` | pricing | `approve-price`, `refuse-price` |
| `bid.intake` | intake agent | `import`, `open-requirement`, `propose-mapping`, `render-response` |
| `bid.draft` | drafting agent | `draft-answer`, `flag` |

An act carries one fixed grant string, and the judge checks that action
before the item's guards, so nothing here chooses a grant at run time.
Supply is four acts, one per domain, each guarded by the requirement's
domain being that domain and by the signer being the requirement's
assigned expert: a sales engineer cannot vouch for a roadmap date and a
product manager cannot vouch for a security control, and a roadmap claim
is refused without a source ref to the roadmap revision it rests on.
Review is one act under one grant held by the owner and the sales
engineer, guarded by the signer being the requirement's reviewer when
one is set; it accepts the supplied answer into the response, checked
against the rest, and makes no claim of its own. Approvals are per kind,
each under its own grant. The record keeps both signatures: the claim
is the expert's, the response is the team's. Neither agent holds a
supply, review or approval grant: the intake agent's mapping and the
drafting agent's text are drafts until a person signs them, and asking
an expert is a person's act, not the agent's. A view's routing offers
an act; only the grant and the guards admit it. The intake agent is
hosted, so the decomposition of a long request does not wait for
anyone's laptop.

### 5.2 The interaction

The request arrives. The bid owner records it with `intake`: the
buyer, the deadline, the document's link and digest. Management decides
go, with reasons, which opens the work; no-go closes the bid with its
reasons kept.

The request's documents are usually spreadsheets: a compliance matrix
of tens to hundreds of rows, each with an identifier, a requirement
text, a response kind (yes or no, a narrative, an attachment) and
sometimes a weight, across several sheets. The intake agent takes that
load. In the first version an import holds at most one hundred rows
across its sheets, which is the bound of the complete reads a routed
carousel needs; a larger request is refused at import with its row
count before any requirement is opened, and larger matrices are
deferred (section 8). The agent records the import (the file's link and
digest, its sheets and their row counts), then opens one requirement
per row with the row's
reference, identifier, text, kind, a proposed domain and the due time
the deadline implies. The requirement is the simple data model: those
fields, an owner, an answer and a source, and nothing else from the
sheet; the import keeps the rest by reference. The agent proposes a
mapping for what it could not classify, for rows it merged or split,
and for apparent duplicates, and those rows wait in the owner's carousel
to be confirmed or remapped. A duplicate of a row already opened is
refused by name.

The owner assigns experts by domain, or accepts the agent's proposal.
The drafting agent writes a first draft of each answer from the answer
library and flags the ones that need an expert. For a technical
requirement the sales engineer edits the draft and signs
`supply-technical`. For a product, legal or security requirement the
sales engineer signs `ask-expert`, naming the expert and a due time, and
the requirement appears in that expert's carousel with the draft. The
expert edits and signs the supply act of their domain: a product manager
confirming that a feature ships next quarter signs `supply-product` and
cites the roadmap revision, and without it the act is refused and the
requirement shows "needs a source". The supplied answer then appears in
the sales engineer's carousel, who signs `review-answer` to accept it
into the response, or `send-back` with a comment, which asks the expert
again. A requirement is `reviewed` when it has a supplied answer and a
review.

Questions to the buyer are items: the owner asks through whatever
channel the request names, and records the buyer's answer with its
source. The agent flags a drafted answer that contradicts a buyer's
answer or another supplied answer, which puts both in their owners'
carousels.

Every bid has two approvals, which `intake` creates in state
`requested`: one for the price, bound to the pricing requirement, and
one for the terms, bound to the terms requirement. Pricing signs
`approve-price` at the exact revision of the pricing answer; legal signs
`approve-terms` the same way. A later supply on either requirement puts
its approval back to `requested`, so an approval is never older than
what it approves.

Assembly is complete or refused. `assemble` is guarded on all of: every
row of every confirmed import has a requirement that is `reviewed` or
`declined` with a reason; no mapping is still `proposed`; both
approvals are `granted` at the current revisions of the requirements
they cover; and a rendering exists at those exact revisions. The intake
agent produces that rendering, the reviewed answers back in the buyer's
layout, one row per requirement in the sheet's order. `assemble` then
writes the response as one revision that names the rendering's digest,
each answer's revision and both approvals' entries. Management signs
`submit`, which names that exact assembly revision and seals it; an
assembly made stale by any later change cannot be submitted, and no
missing approval, unaccounted row or edited answer can become an
apparently complete submission.

Sealing is local; publication is not. `submit` sends `publish-file`
with the sealed bytes to the bid's Git destination, and the submission's
publication is `pending` from that send. It becomes `confirmed` only
when the destination's receipt, which binds the sending scope and
incarnation, the source fact, the send ordinal, the path and the
content digest, is read back into the room and its digest matches the
sealed bytes. An unknown outcome holds the slot and is not resent; a
refusal is recorded with its reason; a later submission has its own send
and its own receipt and never inherits an earlier one. "What went out"
in this note means the confirmed receipt, not the send. Clarifications
after submission are new questions; a revised offer is a new assembly
and a new submission, and the earlier one stays.

The award or the loss is recorded by the owner with its source. The
win or loss review reads the entry range from intake to outcome: which
answers were supplied late, which questions went unanswered, what the
price approval said.

The answer library is a second scope the team keeps: supplied answers
with the expert who signed them, the date and the source, which the
agent drafts from next time. A library answer goes stale on a rule, say
after one hundred and eighty days, and the carousel asks its expert to
supply it again or retire it.

### 5.3 Definitions

**Items.** `bid` (states `received`, `open`, `assembled`, `submitted`,
`clarifying`, `awarded`, `lost`, `withdrawn`; values: buyer, deadline,
document link and digest; refs: the decision, the submission),
`import` (states `read`, `mapped`, `confirmed`; values: link, digest,
sheet names, row counts), `requirement` (states `unassigned`,
`assigned`, `drafted`, `asked`, `supplied`, `reviewed`, `declined`;
values: identifier, row reference, text, kind, weight, domain, due time,
draft, answer; parties: expert, reviewer; refs: the import, the
supplying entry, the reviewing entry, the source), `mapping`
(the agent's proposal for a row it could not place, merged or split;
states `proposed`, `confirmed`, `remapped`), `rendering` (the answers
in the buyer's layout at an exact set of revisions), `question` (states
`asked`, `answered`; values: the buyer's answer and its source), `approval` (kind price or
terms, one of each per bid; states `requested`, `granted`, `refused`;
refs: the requirement it covers and the revision approved),
`assembly` (the rendering's digest, each answer's revision, both
approvals' entries), `submission` (the sealed assembly; publication
states `pending`, `confirmed`, `unknown`, `refused`, `superseded`;
refs: the assembly, the receipt).

**Acts.** `intake` (also creates the two approvals), `decide-go`,
`decide-no-go`, `import` (the intake agent; records the digest; guard:
at most one hundred rows), `open-requirement` (the intake agent; guard:
an import ref and a row reference, and no requirement with that row,
refused `row-exists`), `propose-mapping`, `confirm-mapping` and `remap`
(the owner; a remap names its reason), `assign` (sets the expert and
reviewer parties), `draft-answer` and `flag` (the drafting agent),
`ask-expert` (`bid.review`; names the expert party and a due time; moves
to `asked`), `supply-technical`, `supply-product`, `supply-legal` and
`supply-security` (each under its grant; guards: the requirement's
domain is that domain, the signer is the expert party, a source for
roadmap claims; moves to `supplied`), `review-answer` (`bid.review`;
guard: the signer is the reviewer party when set; moves to `reviewed`),
`send-back` (`bid.review`; back to `asked` with a comment),
`decline-requirement` (`bid.review`; with a reason), `ask-buyer`,
`record-buyer-answer` (the owner's report with source), `approve-price`
and `refuse-price` (`bid.price`; at the pricing answer's revision),
`approve-terms` and `refuse-terms` (`bid.legal`; at the terms answer's
revision), `render-response` (the intake agent; guard: every row's
requirement `reviewed` or `declined`), `assemble` (guards as above;
writes the assembly), `submit` (`bid.decide`; names the exact assembly
revision, seals it, sends `publish-file`), `record-publication` (the
destination's receipt read back: `confirmed` when its digest matches,
else `refused` or `unknown`), `record-outcome`.

**Timed rules.** A requirement asked and not supplied two days before
its due time: attention to its expert and the sales engineer. A supplied
answer not reviewed in two days: attention to the reviewer. The bid's
deadline in five days with requirements not yet reviewed: attention to
the bid owner and management. A library answer older than its stale
period: attention to its expert.

**Views.** The bid record (counts by state, deadline, approvals, the
import's rows mapped and confirmed), the mapping carousel for the owner
(rows to confirm or remap, with the agent's reason), the
expert's carousel (the requirements asked of me, due soonest first,
with the draft and the Supply act, or Decline), the sales engineer's
carousel (supplied answers to review, with Accept and Send back, and
technical requirements to supply), the
approval card for approvers (Grant and Refuse at the named revision),
the question log, the submission record (the sealed assembly, its
publication state and the confirmed receipt), and the win or loss log.

### 5.4 What it needs

- The team's routing by domain grant, by the asked expert and by the
  reviewer, with the per-member carousel: the grow room's routing,
  landed.
- Several scopes in one package: the bid room and the answer library
  as two scopes, landed with M2a's interface and M2b's ownership work.
- Publication of the sealed response: today's Git publication, with the
  destination's receipt read back as the publication outcome.
- The intake's bound: one hundred rows per import in the first version,
  within the complete-read limit of the routed carousel; bigger requests
  are refused at import and deferred.
- The intake agent as a hosted member: the hosted agent teams design,
  not yet built. Until then the same agent runs from the owner's
  machine under the same grant, and the record does not change.
- Reading the spreadsheet: the agent is given the file and reads it
  outside the record; only the digest, the row references and the
  texts enter. A spreadsheet that changes after import is a new import.
- The buyer stays outside the room in the first version: their
  questions, answers and the award are the owner's recorded reports
  with sources, which need nothing new. Inviting the buyer as a member
  is a later version, and brings the whole-record visibility question
  with it.
- Documents: the request, attachments and the response's files need
  custody. Until then the record keeps links and digests, and the
  sealed response is text.
- Price visibility: with no buyer in the room, the team reads the
  whole record, price included, and no private view is needed. If a
  later version invites the buyer, pricing moves to a third scope that
  only the team joins, until
  [private views](../docs/roadmap.md#private-views-in-one-record) exist.

This is the application with the most coordination value and the most
members. Its first version has no files and no buyer member.

## 6. The marketing calendar

For one person, or two, publishing on a schedule, with an agent that
writes drafts. The writer drafts; the room keeps the approval at an
exact revision and the publication receipt, so what is on the site is
what was approved, and nothing else.

### 6.1 Parties and authority

| Member | Kind | Does |
|---|---|---|
| Owner | person | Plans, approves the exact text, publishes |
| Reviewer | person, optional | Comments and approves copy |
| Writer | agent | Drafts and revises posts from a plan and a brief |

| Grant | Held by | Acts |
|---|---|---|
| `publish.plan` | owner, reviewer | `plan`, `brief`, `comment` |
| `publish.write` | writer | `draft`, `revise` |
| `publish.approve` | owner, reviewer | `approve` |
| `publish.send` | owner | `publish`, `record-posting`, `retire` |

### 6.2 The interaction

The owner plans a month: a post item per slot, with a channel, a date
and a brief. The writer drafts each one; the owner or the reviewer
comments, the writer revises, and the owner signs `approve` at the
exact revision. Two days before the date, a post that is drafted and not
approved appears in the owner's carousel. On the date the owner signs
`publish`: for the site, the act sends the approved text to the site's
Git destination as `publish-file`, and the post is `publishing` until
the destination's receipt for that exact content digest is read back,
when it becomes `published`; an unknown outcome holds, and a refusal is
recorded with its reason. A text changed after publication needs a new
approval and a new `publish` with its own receipt. For a channel dap
cannot write to, the owner posts it by hand and records that with the
link, which stays a statement. Retiring a post replaces its file with a
short retirement notice and rewrites the index without it, each a
publication with its own outcome, since today's file write has no
delete; removing the file from the repository is deferred.

"What went out this month" is the published log. "What is late" is the
carousel.

### 6.3 Definitions

**Items.** `campaign` (a name and a period), `post` (states `planned`,
`drafted`, `approved`, `publishing`, `published`, `retired`; values:
title, channel, date, brief, text, path, content digest; refs: the
campaign, the approving entry, the confirmed receipt), `comment`.

**Acts.** `plan`, `brief`, `draft`, `revise` (resets `approved` to
`drafted`: a changed text needs a new approval), `comment`, `approve`
(fixes the revision), `publish` (guard: `approved` at the current
revision; sends `publish-file` with the text at the post's path; moves
to `publishing`), `record-publication` (the receipt read back: `published`
when the digest matches, else refused or unknown), `record-posting`
(for other channels, with the link), `retire` (sends the notice and the
index rewrite as publications of their own).

**Timed rules.** Two days before a post's date without approval:
attention to the owner. A post past its date and not published:
attention to the owner. No invented state either way.

**Views.** The calendar carousel for the owner (upcoming posts needing
approval or publication), the post card (text, channel, date; Approve;
Publish when approved), the campaign record, the published log of confirmed publications, with
pending and unknown ones shown apart.

### 6.4 What it needs

Nothing beyond today's forms and today's publication: the site is a
repository, so publishing a post is the same operation the lending
library's shelf uses. Posting to channels outside Git stays a recorded
statement. This is the smallest of the three and the first to build,
and it can run for dap's own site.

## 7. How they are built

Each is a package installed into a room, as the grow package is:
definitions, declared projections and views, no view code in the host.
The prospect room and the calendar are one scope each. The bid response
is two scopes, the bid and the answer library, and a third for pricing
when a team wants it. All three run in the kit's test host first, with a
scenario that `dap check` replays, and then on the hosting deployment
as rooms a person joins from their AI app.

The views are the declared kinds the grow room uses: `carousel` for what
needs the viewer, `card` for one item with at most two acts, `record`
for a full item, `log` for entries. The routing rule of the bid
requirement carousel is the grow room's routing rule with the domain
grant in place of presence.

## 8. Order and slices

After the grow demo of plan 033, and ahead of none of it. Sizes are
estimates from the grow slices.

| Slice | What | Done when | Size |
|---|---|---|---|
| C1 | The marketing calendar: definitions, scenario, views, publication to a site repository | a post planned in the room is approved, published to a test destination and read back; a late post reaches the owner's carousel | 2 days |
| C2 | The prospect room: definitions, scenario, views; the prospect as an invited member | an account goes from research to a proposal accepted by a member in the test host; the five-day rule reaches the owner | 2 days |
| C3 | The bid response: definitions in two scopes, the intake agent's decomposition and rendering, routing by domain, approvals, assembly and submission with publication | a two-sheet request of forty rows is decomposed into requirements, three rows remapped by the owner and a duplicate refused, and a one-hundred-and-one-row request refused at import; assembly is refused while a row is unresolved and while the terms approval is stale; then all forty rows are reviewed or declined with reasons, six of them supplied by asked experts across three domains, an unsourced roadmap claim is refused, price and terms are approved at their current revisions, the answers are rendered back in the request's layout, assembled and submitted; the submission stays pending until the destination's receipt for its exact digest is read back, then confirmed | 5 days |
| C4 | The hosted rooms and a page for each on the homepage, after the demo-room pattern of plan 033 | a person in their AI app takes an act in each | 2 days |

Named and deferred: custody for documents; private price views; the
buyer as a member; requests over one hundred rows; deleting published
files; integrations, which wait for the general design of outside
operations; the answer library as a shared resource across bid rooms;
the roll-up of many prospect accounts or bids under a site.

## 9. Open questions

1. **When the buyer joins.** The first version keeps the buyer outside
   the room and records their words as the owner's reports. A later
   version may invite them, so their answers are their own acts; that
   version needs either a separate buyer room or private views, since a
   member reads the whole record, price included.
2. **The answer library's authority.** Who may supply a library answer
   outside a bid, and whether a supply in one bid refreshes the library
   automatically or by a separate act.
3. **Integrations.** Out of scope for all three. Outreach, chasing,
   posting to channels and writing to a sales system stay members'
   statements until the general design of outside operations exists;
   no point integration is built for one application.
4. **The mapping's confirmation.** Whether the owner confirms every
   row the agent mapped, or only the rows the agent flagged, is a
   question of how good the decomposition is on real requests. The
   first version asks for the flagged rows only and records the rest as
   the agent's proposal.
5. **Many accounts, one owner.** The prospect room keeps all of one
   owner's accounts in one scope. A team of sellers wants one scope per
   seller or private views; the roll-up for a manager is a site-level
   projection, as the grow site reads its rooms.
