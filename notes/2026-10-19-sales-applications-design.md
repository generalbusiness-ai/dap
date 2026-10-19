# Three sales applications: the prospect room, the bid response and the marketing calendar

Design note, 19 October 2026. Proposed functionality: nothing here is
built.

We chose three sales use cases to design around, and this note designs
them:

1. **The prospect room.** One seller and their assistant working a list
   of accounts: research, outreach, replies, a proposal the prospect
   accepts. We would use it ourselves.
2. **The bid response.** A team answering a formal request for
   proposals: an account executive, a sales engineer, product managers,
   legal, security, pricing and a manager, with hosted agents taking
   the heavy lifting. The enterprise case with the most coordination
   in it.
3. **The marketing calendar.** One or two people publishing on a
   schedule with an agent that drafts. The smallest, and the first to
   build, because the site is a repository and publishing to it is the
   one outside operation dap runs today.

Each is a package in the sense of the
[applications note](2026-10-15-self-contained-applications.md), built
on the forms the grow room is landing ([grow note](2026-10-17-grow-operation-application-design.md),
[plan 033](plans/033-2026-10-18-grow-room-demo.md)). Section 1 says
why a room makes selling easier to coordinate; sections 2 and 3 place
the three against personal agents and against the tools people use for
these jobs today; sections 4 to 7 design them; section 8 orders the
work.

## 1. Why coordinating is easier

What slows team selling is not the thinking, which agents increasingly
do. It is the finding, the chasing, the re-telling and the re-keying
between people. The room makes that part easy in two ways.

**Each participant works from their own perspective on the shared
work.** A bid has a hundred rows. The product manager needs the four
that are hers, with the draft, the buyer's related question and the due
time, and nothing else. The sales engineer sees what has been supplied
and waits for review. The manager sees two approvals and a deadline. The
owner sees what is blocked and by whom. One record seen from each seat,
derived rather than maintained: nobody writes a status update, because
the status is the view, and each person's "needs you" list is short
because it is theirs. The agents get the same seats.

**Any participant reaches the specific interaction in one step, from
the app they are already in.** "What did the buyer say about data
residency?" is answered with that exchange, its source and its date.
"Why did we say next quarter for that feature?" lands on the product
manager's signed answer and the roadmap revision it cites. "What is
holding up section 7?" lands on the three rows asked of legal
yesterday. A card in the chat the person is using, not a search across
threads and a "can someone remind me". Agents get the same access,
which is why their drafts are good: the drafting agent reads the
buyer's actual answer and flags the row that contradicts it.

Two consequences follow. Handoffs carry their context: asking an expert
is one act, and the expert's phone shows the row, the draft and the due
time, with no forwarding. Each person's work shrinks to judgement and
signature: the agents decomposed, drafted and prepared each person's
slice, and the person reads, edits and signs.

The alternative is an agent that does the bid for one person. It reads
the spreadsheet, drafts a hundred answers and mails four people. The
replies come back as prose and the agent merges them; the product
manager asks "which row?"; the sales engineer says he answered that in
another thread; the manager approves "the price" without seeing which
version. The work gets done. The coordination was the cost, paid by
people in attention, one message at a time.

The record's other properties, that authority is on the act, that each
statement keeps its author, that the journal replays and is archived,
make this safe: the list offers only the acts the grant admits, and the
exchange you find is the signed one. They are the floor, not the pitch.

## 2. Personal agents today

Three personal agents define the category this month. OpenAI's Dots
(launched 29 September) are always-on agents with their own cloud
computer and browser, connected to thousands of apps, running scheduled
jobs and background research, read-only until a person authorizes a
send or a change, messaging the person in chat when a decision is
needed. Meta's Muse (8 September) takes a goal, plans, launches
subagents, browses, fills forms and completes purchases, keeps working
after the app is closed, returns for approval before sensitive actions,
and keeps an editable memory. Hermes Agent (open source) is a persistent
process on the person's own server with cross-session memory, skills it
writes for itself, scheduled tasks and a gateway to the messaging apps
the person already uses.

Each of the three applications below assumes every member has one of
these. What the room adds is not what the agent does but who it does it
for and where the result lives:

- An agent serves one principal. The product manager's agent works for
  her, the owner's for the owner. The room is where their agents meet,
  and each person's answer stays in their words, signed by them.
- An agent's approval is a line in a transcript that only that agent
  holds. In the room the authority is on the act, so a discount, a
  roadmap claim and a submission are signed by their holders at an
  exact revision, and no agent can sign them.
- An agent's memory is its own. The room's record is shared, exact and
  readable by the next person after the agent has been replaced.
- An agent's schedule is a promise to itself. The room's timed rules
  fire for every member whether or not any agent is up.

What an agent alone does well: one person's work with no commitment to
anyone else and nothing to prove later. The prospect room's research
and drafting are that, and the owner's agent does them.

## 3. The field today, for each use case

The 2026 roundups below are mostly vendor-written; the shape of each
market is clear even where the rankings are not.

**Bid response.** The established products ([one ranking](https://loopio.com/blog/best-ai-software-rfp-responses/),
[another](https://autogenai.com/blog/the-best-rfp-software-in-2026/),
[a workflow comparison](https://www.arphie.ai/blog/top-30-rfp-proposal-software-in-2026))
are content-library platforms: Loopio, Responsive, AutogenAI, with
Tribble, Conveyor, 1Up, DeepRFP and AutoRFP.ai behind them. They keep
an answer library, draft with a model, assign questions to contributors
and route reviews, and export into the buyer's format. They are bought
per team at enterprise prices (one lists its entry tier at twenty
thousand dollars a year) with onboarding measured in weeks, and they
are a portal the contributors must go to. The room differs in where
the work happens and who signs: each contributor answers from their
own AI app, the expert's answer and the team's review are two
attributed signatures, routing is a grant rather than an assignment
list, and the agents are members. What those products do that the
first version does not: files and custody, large matrices, formatting,
and integrations.

**Prospect room.** Solo sellers today pair a light CRM (folk, Attio,
Zoho Bigin, a free HubSpot tier) with an agent for outreach and
follow-up (Lindy, Relay with a human approval step, Unify) and a
sequencing tool (Apollo, Instantly, Lemlist) ([a founder's guide](https://www.folk.app/articles/ai-crms-for-solo-founders),
[a stack guide](https://www.unifygtm.com/explore/best-ai-sales-tools-solo-founders)).
Every one of them is a database the seller maintains plus an agent that
sends. The room keeps the prospect's words as theirs, lets the prospect
accept a proposal at an exact revision from their own AI app, and makes
the seller's assistant work inside the record rather than beside it.
What those tools do that the first version does not: send mail and run
sequences, which here stay the owner's statements until the general
design of outside operations exists.

**Marketing calendar.** Small teams use a calendar with publishing
(CoSchedule, Buffer, Planable, which attaches review to the content and
publishes to nine channels), a work tool with approval chains (Monday,
Notion) or an agent that drafts the whole calendar (RankYak, Velocity)
([a comparison](https://asana.com/resources/best-content-calendar-software),
[another](https://planable.io/blog/content-calendar-tools/)). The room
differs in one thing worth having: the approval is bound to the exact
text that is published, and the publication to the site is the
repository write dap already does. Channels beyond the site are
recorded statements, which is less than those tools do, and the first
version says so.

## 4. What the three share

- **A commitment** is an item with an owner and a decision taken by a
  holder of a grant at an exact revision.
- **An outside party's word** is either their own signed act as a
  member, or a member's signed report of what they said, with its
  source. The record never shows a report as the party's act.
- **Deadlines are timed rules** that write attention to the owner,
  never an invented state.
- **Routing is a view rule** over the item's state, the viewer's grants
  and, where it matters, presence, as the grow room's routing decides;
  it offers an act, and only the grant and the guards admit it.
- **Documents stay outside the record** until custody exists
  ([roadmap](../docs/roadmap.md#evidence-capture-and-private-custody)):
  a link and a digest.
- **Integrations are out of scope.** Mail, calendars, sales systems
  and channels wait for a general design of outside operations
  ([roadmap](../docs/roadmap.md#outside-parties-and-systems)); the one
  operation that exists, publication to a Git destination, is used
  where it fits, and everything else that crosses the boundary enters
  as a member's statement.

## 5. The prospect room

| Member | Kind | Does |
|---|---|---|
| Owner | person | Signs outreach, records replies, proposes, decides stages |
| Assistant | agent, the owner's | Drafts outreach and proposals, summarizes, asks "what next" |
| Researcher | agent | Writes research notes on an account, each with a source |
| Prospect contact | person, optional member | Accepts or declines a proposal from their own AI app |

| Grant | Held by | Acts |
|---|---|---|
| `sell.own` | owner | `open-account`, `send-outreach`, `record-reply`, `propose`, `set-stage`, `defer`, `close` |
| `sell.draft` | assistant, researcher | `research-note`, `draft-outreach`, `draft-proposal` |
| `sell.accept` | prospect contact | `accept-proposal`, `decline-proposal` |

The owner names an account and the researcher writes notes on it, each
refused without a source. The assistant drafts an opening message; the
owner edits and signs `send-outreach`, which records the draft's
revision as sent. Five days with no reply, and a timed rule marks the
account "waiting" and puts it in the owner's carousel with the sent
text. The prospect replies by mail; the owner records the reply in its
words with `record-reply`, so a later "what did they say" is answered
from their words. The assistant drafts a proposal; the owner signs
`propose`, fixing its revision. A prospect who is a member sees the
proposal card with Accept and Decline, and their act is the acceptance;
otherwise the owner records their answer with its source. A changed
proposal needs a new `propose`; the old revision stays as declined or
superseded. The week's review is the assistant reading the journal.

**Shape.** Items: `account` (researching, contacted, waiting,
in-conversation, proposed, won, lost, dormant), `note`, `touch`,
`proposal` (drafted, sent, accepted, declined, superseded). Rules: no
reply for five days, no touch for twenty-one days, a proposal's
validity passed. Views: the owner's account carousel (oldest touch
first, with the last text and its age), the account record, the
proposal card, the week's log.

**Needs.** Nothing beyond the forms the grow room uses. The prospect as
a member needs an invitation, which exists. Sending mail is the owner's
statement. A proposal document beyond its text needs custody; until
then, a link and a digest.

## 6. The bid response

| Member | Kind | Does |
|---|---|---|
| Bid owner | person, the account executive | Takes in the request, assigns, asks the buyer, assembles |
| Experts | people: product managers, legal, security, finance | Supply the answers in their domain, signed as their own statements |
| Sales engineer | person | Supplies technical answers, asks experts, reviews every answer into the response |
| Approvers | people: pricing, management | Grant or refuse the price and the terms, decide go or no-go and submission |
| Buyer | not a member in the first version | Their questions, answers and the award enter as the owner's recorded reports with sources |
| Intake agent | agent, hosted ([hosted agent teams](2026-10-15-hosted-agent-teams-design.md)) | Decomposes the request's spreadsheets into requirements, renders the answers back into the buyer's layout |
| Drafting agent | agent | Drafts answers from the answer library, flags inconsistencies, chases due dates |

| Grant | Held by | Acts |
|---|---|---|
| `bid.own` | bid owner | `intake`, `assign`, `ask-buyer`, `record-buyer-answer`, `confirm-mapping`, `remap`, `open-price-approval`, `open-terms-approval`, `assemble`, `withdraw-bid`, `record-outcome` |
| `bid.decide` | management | `decide-go`, `decide-no-go`, `submit` |
| `bid.review` | bid owner, sales engineer | `ask-expert`, `review-answer`, `send-back`, `decline-requirement` |
| `bid.technical` | sales engineer | `supply-technical` |
| `bid.product` | product managers | `supply-product` |
| `bid.legal` | legal | `supply-legal`, `approve-terms`, `refuse-terms` |
| `bid.security` | security | `supply-security` |
| `bid.price` | pricing | `approve-price`, `refuse-price` |
| `bid.intake` | intake agent | `import`, `open-requirement`, `propose-mapping`, `render-response` |
| `bid.draft` | drafting agent | `draft-answer`, `flag` |

An act carries one fixed grant string, so supply is four acts, one per
domain, each guarded by the requirement's domain and by the signer
being the assigned expert; a roadmap claim is refused without a source
ref to the roadmap revision it rests on. Review is one act under one
grant held by the owner and the sales engineer, and makes no claim of
its own. The record keeps both signatures: the claim is the expert's,
the response is the team's. Neither agent holds a supply, review or
approval grant, and asking an expert is a person's act.

**The interaction.** The request arrives as spreadsheets: a compliance
matrix of rows with an identifier, a text, a response kind and
sometimes a weight. The owner records it with `intake` and management
decides go or no-go with reasons. The hosted intake agent records the
import (link, digest, sheets, row counts) and opens one requirement per
row with its row reference, identifier, text, kind, a proposed domain
and a due time. The requirement is the simple data model: those fields,
an expert, a reviewer, an answer and a source, and nothing else from the
sheet. Rows the agent could not place, merged or split wait in the
owner's carousel to be confirmed or remapped; a duplicate row is refused
by name.

The drafting agent writes first drafts from the answer library and
flags the ones that need an expert. The sales engineer supplies
technical answers himself and signs `ask-expert` for the rest, naming
the expert and a due time; the requirement appears in that expert's
carousel with the draft. The expert edits and signs the supply act of
their domain. The supplied answer appears in the sales engineer's
carousel, who reviews it into the response or sends it back with a
comment. Questions to the buyer are items; the owner records the
buyer's answers with their sources, and the agent flags a draft that
contradicts one.

The price and the terms each have an approval item, opened by the owner
once the requirement it covers exists and granted by pricing or legal
at that answer's exact revision; a later supply puts the approval back
to requested. Assembly is complete or refused: the import confirmed
with every row reviewed or declined with a reason, both approvals
present and granted at current revisions, and the intake agent's
rendering of the answers back into the buyer's layout at those
revisions. Management signs `submit`, which seals that exact assembly
and sends it to the bid's Git destination with `publish-file`.

Sealing is local; publication is not, and the first version is honest
about how far the record can see. The send's result proves admission,
that the destination decided the request, and the clause writes that
outcome with the destination as sender. The push and the public receipt
happen later, outside what today's result carries, so no native state
says "published". A member who reads the destination's public receipt
file and compares path and digest signs `report-receipt-check`, shown
as their statement with their name. A native completion protocol is a
named dependency (section 8).

The answer library is a second scope: supplied answers with their
expert, date and source, drafted from next time, stale on a rule. The
win or loss review reads the entry range from intake to outcome.

**Shape.** Items: `bid`, `import` (one per bid room), `requirement`
(unassigned, assigned, drafted, asked, supplied, reviewed, declined),
`mapping`, `question`, `approval` (price, terms), `assembly`,
`submission` (pending, admitted, refused, superseded). Rules: a
requirement asked and not supplied two days before its due time; a
supplied answer not reviewed in two days; the deadline in five days
with rows unresolved; a library answer past its stale period. Views:
the bid record, the owner's mapping carousel, the expert's carousel
(what is asked of me, due soonest first), the sales engineer's carousel
(answers to review), the approval card, the question log, the
submission record.

**Boundaries of the first version.**

- One import and at most fifty requirements per bid room, with each
  requirement's queried representation at most two kibibytes (text 512
  bytes, draft and answer 640 bytes each) and the sealed rendering at
  most sixty-four kibibytes, the file write's limit; a request over any
  bound is refused at import by name, an oversized draft or answer is
  refused before it strands the queue, a second import is refused, and
  a changed spreadsheet is a new bid room with the old one withdrawn.
- The buyer stays outside the room, so the team reads the whole
  record, price included, and no private view is needed. Inviting the
  buyer is a later version and brings that question with it.
- The intake agent as a hosted member is the hosted agent teams
  design, not built; until then the same agent runs from the owner's
  machine under the same grant.
- Files need custody: the record keeps links and digests, and the
  sealed response is text.
- Routing by grant, the per-member carousel and several scopes in one
  package are landed (the grow room's routing; M2a's interface and
  M2b's ownership work).

## 7. The marketing calendar

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

The owner plans a month, a post per slot with a channel, a date and a
brief. The writer drafts; the owner or the reviewer comments; the
writer revises, which resets any approval; the owner signs `approve` at
the exact revision. Two days before the date, an unapproved post is in
the owner's carousel. On the date the owner signs `publish`, which sends
the approved text to the site's Git destination as `publish-file`; the
post is `publishing` until the destination's result, which the clause
writes as the post's request outcome: `admitted`, `refused` with the
reason, or `superseded`, in which case the post returns to `approved`
for a new publish. Whether the file is on the site is a member's check,
shown with their name, as in the bid. For a channel dap cannot write to, the owner posts
by hand and records it with the link. Retiring a post replaces its file
with a short notice and rewrites the index, each a publication of its
own, since today's file write has no delete.

**Shape.** Items: `campaign`, `post` (states planned, drafted,
approved, publishing, admitted, refused, retired; a request outcome
value of pending, admitted, refused or superseded, written only by the
publish send's result clause), `comment`. Rules: two days before the
date without approval; past the date and not admitted. Views: the
owner's calendar carousel, the post card (Approve; Publish when
approved), the campaign record, the log of admitted publications with
checks by name.

**Bounds of the first version.** A calendar room holds one quarter: at
most twenty-four posts in all, retired ones included, each with a text
of at most four kibibytes and a queried representation of at most six
kibibytes, so the carousel's complete source stays under 144 kibibytes,
well inside the native query payload limit; a longer text or a
twenty-fifth post is refused by name, and the next quarter is a new
room. Longer posts are deferred.

**Needs.** Nothing beyond today's forms and today's publication. This
is the smallest of the three and the first to build, and it can run for
dap's own site.

## 8. Order and slices

After the grow demo of plan 033, and ahead of none of it. Sizes are
estimates from the grow slices.

| Slice | What | Done when | Size |
|---|---|---|---|
| C1 | The marketing calendar: definitions, scenario, views, publication to a site repository | a post planned in the room is approved, published to a test destination and admitted, with a member's check recorded by name; a refused result leaves the post refused with its reason; a late post reaches the owner's carousel; a twenty-fifth post and an oversized text are refused by name | 2 days |
| C2 | The prospect room: definitions, scenario, views; the prospect as an invited member | an account goes from research to a proposal accepted by a member in the test host; the five-day rule reaches the owner | 2 days |
| C3 | The bid response: definitions in two scopes, the intake agent's decomposition and rendering, routing by domain, approvals, assembly and submission | a two-sheet request of forty rows is decomposed, three rows remapped and a duplicate refused; oversized and second imports refused by name; assembly refused while a mapping is proposed, a row unresolved or an approval missing or stale; then every row reviewed or declined, six supplied by asked experts across three domains, an unsourced roadmap claim refused, both approvals granted, the answers rendered back, assembled and submitted, the submission admitted and a member's receipt check recorded by name | 5 days |
| C4 | The hosted rooms and a page for each on the homepage, after the demo-room pattern of plan 033 | a person in their AI app takes an act in each | 2 days |

Named and deferred: custody for documents; private price views; the
buyer as a member; requests over fifty rows, longer texts, and more
than twenty-four posts a quarter; deleting
published files; a native completion protocol for publication, in
which the destination's later receipt reaches the room as its own
authenticated fact; integrations, which wait for the general design of
outside operations; the answer library as a shared resource across bid
rooms; the roll-up of many prospect accounts or bids under a site.

## 9. Open questions

1. **When the buyer joins.** A later version may invite the buyer so
   their answers are their own acts; that version needs a separate
   buyer room or private views, since a member reads the whole record.
2. **The answer library's authority.** Who may supply a library answer
   outside a bid, and whether a supply in one bid refreshes the library
   automatically or by a separate act.
3. **Publication completion.** Whether the first users need the room
   itself to know the file is on the site, and so need the completion
   protocol before the calendar is useful.
4. **The mapping's confirmation.** Whether the owner confirms every row
   the agent mapped, or only the flagged ones. The first version asks
   for the flagged rows only.
5. **Many accounts, one owner.** A team of sellers wants one scope per
   seller or private views; the manager's roll-up is a site-level
   projection, as the grow site reads its rooms.

## Sources

Personal agents, read 19 October 2026:
[OpenAI Dots](https://www.vellum.ai/blog/official-openai-dots-breakdown),
[Meta Muse](https://www.vellum.ai/blog/official-muse-breakdown),
[Hermes Agent](https://www.vellum.ai/blog/official-hermes-agent-breakdown).
Markets: the roundups linked in section 3, plus
[a solo-founder prospecting review](https://www.crono.one/academy/ai-tools-for-sales-prospecting/)
and [a small-team calendar review](https://storyflow.so/blog/best-content-calendar-tools-2026).
