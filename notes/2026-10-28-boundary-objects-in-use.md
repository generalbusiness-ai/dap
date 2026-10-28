# Boundary objects in use: what the cases pass between parties

Status: draft for review, 28 October 2026, against main `a78e0981`.
Nothing here is built, and this note changes no landed document. It
reconsiders [references, notes and ratifications](2026-10-27-pointing-and-claims.md)
from the other end. That note started from acts the record could define.
This one starts from what the cases pass between people and agents, and
asks what interface works there, before asking what the record should
hold. It defines no act.

## 1. Scene

A patient has a bill, an insurer's statement and a question they cannot
yet put into words. A contractor says the job is done, and the owner has
twenty-three photos that say otherwise. Three siblings have each said
what they could probably do next week. In every case of the
[catalogue](../docs/use-cases.md), the parties work on a thing between
them long before any rule applies to it. Most of that work is one
party's agent making the thing readable to that party.

Star and Griesemer called such a thing a boundary object. It is weakly
structured where the parties share it and strongly structured where each
party uses it. Bowker and Star added what a shared record owes it: a
stable set of such objects that each party can pull from in their own
form, and no category that one party fixes for all, because that is a
standard, and the others work around it. Appleton says the same of
agents from the other side. The interface between a person and an agent
is thin, a line of text each way. The agent should carry the labour of
making it thicker, and the thick interface is the shared thing the two
point at.

dap's fold is the strongly structured side: items, states, acts and
rules that every member runs alike. The cases show that the fold is
where the parties' work ends, not where it starts. This note looks at
the start. Section 3 walks five cases at the level of what is on the
table and who touches it. Section 4 lists what the other cases pass
between parties. Section 5 names the interfaces that work at those
boundaries. Sections 6 to 8 say what the record must hold so that an
agent can build such an interface on demand from raw materials, how
structure enters later, and what this changes in the current direction.

## 2. Terms

- **Party**: one person, one firm, or one agent with its owner, with its
  own reading of the matter.
- **Pile**: the documents a party brings in unchanged, each with where it
  came from. Bills, photos, estimates, letters, meter readings,
  transcripts, a file at a commit.
- **Reading**: what an agent or a person makes of a document. The charges
  parsed from a bill, nine items grouped from photos, a timeline from
  alerts. A reading is the reader's own statement, never the document's.
- **Mark**: a party's remark or choice against one row, region or moment
  of a reading. "Ask about this." "Not in scope." "I was home."
- **Exact thing**: a text or bundle, pinned by hash, that one party puts
  to another. The one question, the submitted claim, the scope a
  contractor agrees to, the candidate a reviewer judges.
- **View**: an interface built over a pile, readings and marks for one
  party. It is the strongly structured side of a boundary object, and an
  agent can build it on demand.
- **Fold**: the record's items, states and rules, which every member
  runs alike.

## 3. Five cases at the table

The first case is observed in this workroom. The other four are walks
through catalogue cards, with details chosen to be concrete. No walk
claims that anyone has done it.

### 3.1 A design note under review, observed

The thing between the parties is a markdown file at a commit. The
planner writes it in a worktree. The person reads the whole file and
answers in chat: too long by a third, the scene does not say why, the
wrong word for the act, wide of the mark. The planner recuts and commits
again. A checker reads the file and signs a verdict with four findings.
The workroom record holds the file as an artifact, a path at a commit,
and the verdict as a review act. In 28 days it holds 34,549 artifacts and
7,877 free-text asserts, and the planner's own recuts stand in it as
commits. The person's remarks are in none of it. They were made against
paragraphs and the record has no paragraph. The evidence table in the
note was built by a script and pasted as text, so the checker can read
it and cannot re-run it.

What fits the fold: the review request, the verdict, the landing. What
does not: the person's marks against the text, the reading of one recut
beside the last, and the evidence as something to query. A thicker
interface here is the note with the person's remarks held against its
paragraphs, the difference between two recuts, and the evidence table as
a live view over the workroom that the checker opens rather than
re-reads.

### 3.2 A medical bill, case 01

The pile: a bill of fourteen charges with procedure codes, the
insurer's statement of the amounts it allowed for eleven of them, and a
coverage document.
The patient's agent reads the bill and the statement into one table.
Each row is one charge on the bill, and each cell says which page it
came from. Three charges match nothing on the statement, and one matches
at a different amount. The patient reads the table as what they owe and why. They mark
the three unmatched charges and the one mismatch: ask about these. The
agent drafts one question that quotes those four charges by page and
code.
The patient approves that exact text, and nothing else. A portal receipt
comes back as a document.

Billing staff read the same four charges as how each was built. A
letter comes back, and it is a document, not their act. The agent sets
the letter's explanation against the four rows. The patient accepts
the explanation for two rows, disputes one, and the fourth waits for an
adjustment the letter promised. The patient closes their own part with
the dispute kept.

What fits the fold: the approval of one exact question, the submission,
the receipt, the patient's closing. What does not: the table, the four
marks, the alignment of the letter against the rows, and the four
different outcomes that one letter produced. The table is the boundary
object. The patient and the billing office read it in different
categories, and it stays the same four charges by page and code.

### 3.3 A snag list, case 30

The pile: twenty-three photos with times and rooms, the accepted scope,
and the contractor's message that the job is done. The owner's agent
groups the photos into nine items, each with a room, a photo and a
sentence. The owner reads the list as what is unfinished and corrects two
groupings. The contractor reads the same nine items as a punch list by
trade. Their agent re-cuts the list that way and adds a column: fixed on
3 November, not in scope, supplier's defect. A specialist writes a signed
opinion against one item. The owner marks each item in their own word:
accepted as is, disputed, fixed. Item six comes back in December and
reopens alone.

What fits the fold: once the two parties want the same state on each
row, a package's item takes the row, and the states become acts under
rules. What does not, and need not: the grouping, the re-cut by trade,
the two columns of status in two parties' words, the specialist's
opinion against a row. The list is one thing because both parties' lists
cite the same photos by hash. It is two things because each party's
columns are their own.

### 3.4 A care rota, case 20

The pile: messages from three siblings and a paid carer's terms, which
stay private to the sibling who holds them. One sibling's agent reads
the messages into a grid of days and people. A cell holds what the
message said: "could probably do Tuesday" is a maybe, "I will take
Thursday" is a commitment, and the grid shows the difference. Two cells
are empty, and the grid shows the gap. The parent reads the grid as who
is coming, and decides which of their preferences the grid may show. A
sibling turns a maybe into a commitment by saying so against the cell.
The paid carer's hours appear as cells without the terms behind them.

What fits the fold: a commitment to a shift, a report that it was done,
the parent's acceptance of the arrangement. What does not: the maybe,
the gap, the disagreement about who carries most, which stays on the
grid as remarks. The rota is re-cut every week and the old one stays.

### 3.5 An electricity bill, case 10

The pile: four bills with their periods, three meter photos with their
times, and the account's tariff. The agent sets the billed units
against the readings on one time axis, with each photo as a point and
each bill as a span. One span has no reading inside it, and the chart
says so. One resident marks a week: "nobody was home". Another marks
two days: "heater on". The provider's agent, within its authority, can
answer the question the residents approve, and it reads the same chart
as periods and estimated readings. A photo of the meter stays an
observation, and the chart shows whose it is.

What fits the fold: the approved question, the provider's answer, an
agreed correction. What does not: the chart, the two residents' marks,
and the theories that the marks support and that the provider need not
settle.

## 4. What the other cases pass between parties

The same shapes repeat. The table names, for each case, the thing between
the parties and the part of its use that the fold does not take.

| Case | The thing between parties | What stays outside the fold |
|---|---|---|
| 02 prescriptions | A price table from several pharmacies with each price's conditions | Missing assumptions, marked by the patient |
| 03 groceries | A proposed basket beside receipts | Each person's exclusions against a basket item |
| 04 card debt | Balances from statements, and plan versions | Which plan the household can bear, a remark per version |
| 05, 06 insurance, internet | The renewal or offer beside other quotes, with dates on one axis | The gap in cover, the household's split reading |
| 07 car repair | Two itemised estimates matched item by item, with a specialist's opinion on each | Which items the driver questions |
| 08 assistance | A checklist with the evidence found for each item | Each household member's choice of what to disclose |
| 09 lease | The offer, the cost of moving, and maintenance evidence | Two tenants' different readings |
| 11, 13, 14 charges and fees | A receipt or fee entry beside the transaction or the terms passage | The holder's recognition, or not |
| 15 deposit | Each deduction beside the move-in and move-out photos for that room | Each tenant's claim per deduction |
| 16 repair | A timeline of reports, visits, "job complete" and recurrence | The tenant's reading that it is not fixed |
| 17 retrofit | Proposals beside usage data, with the assessor's assumptions shown | The owner's and occupant's different weights |
| 18, 19 clinic, discharge | A brief, or a checklist from discharge papers with inconsistent versions shown | The patient's questions, in their order |
| 22 possessions | An inventory with photos, each row's destination and who decided | Siblings' disagreement per row |
| 23 moving out | A handover checklist by date, with condition reports | Two residents' observations of one room |
| 24 trip | An itinerary with each traveller's constraints | Each traveller's private budget |
| 26 bulk order | An allocation table with the minimum-order progress | Each household's maximum, before it is a commitment |
| 27, 28 claim, accident | A bundle of photos, inventory and receipts; three timelines kept apart | Accept part and dispute the rest, item by item |
| 29 renovation | Quote versions side by side, the drawing, marked-up photos | Unclear items marked, an adviser's challenge |
| 31, 32 car, guitar | A listing, documents, an inspection report with limits | A buyer's conditions, private until offered |
| 33, 21 booking, childcare | A grid of slots, with purpose or the child's details kept out | Why a slot is wanted |
| 34 code review | A candidate at a base, findings against the code | Exploration, chatter, a reviewer's doubt short of a finding |
| 35 release | Build identity, checks and a rollout plan | Risk as the owner weighs it |
| 36 incident | A timeline of alerts and observations, hypotheses beside it | The disputed root cause |
| 37, 39, 41 award, hiring, review | Requirements or criteria beside each offer, application or manuscript | An assessor's private reasoning |
| 38 invoice | The agreed scope, evidence of work and the invoice, matched item by item | The disputed balance named by both |
| 40 school plan | Observations from home and classroom, and the plan | A specialist's private notes |
| 42 community budget | Proposal versions and budget options | Members' priorities, private reasons |
| 43 investigation | Findings with contradictions left standing | A critic's confidence, which is not a veto |
| 44, 45, 46, 50 counting, lending, grow, calendar | Turns, a shelf, readings and alerts, posts | Little. These fit the fold now |
| 47 learning | The plan, chosen submissions, feedback owed | Private practice |
| 48, 49, 51 prospects, bid, market | Notes with sources, a requirement matrix from the request, leads and needs | The reading of the request into rows, unclear rows |

Three things stand out. Almost every thing between parties is a reading
of a pile, lined up or grouped, and not a document and not an act. Each
party keeps marks against it in their own words, and the marks are what
the parties actually exchange. And the four cases that fit the fold now
are the four that were built, which says what the fold is good at and
not that the others need more fold.

## 5. Interfaces that work at the boundary

In each of the five cases, the person had one thing on the table that
they could work in: a table, a list, a grid, a chart, a text with
remarks. Across the whole catalogue those things come in seven shapes.
This section tells each shape through the case where it appeared, in
three parts: what the person sees and does, what the agent did to make
it, and what goes across to the other party.

**A table that matches one document against another.** The patient's
bill lists fourteen charges, each with a code and an amount. The
insurer's statement lists the amounts the insurer allowed, for eleven of
those charges. The agent makes one table with a row for each charge on
the bill. In each row it puts the charge, the insurer's amount for that
charge if it found one, and the page of each document it took the
figures from. Three rows have no insurer's amount. One row has two
amounts that differ. The patient reads the table as what they owe and
marks those four rows: ask about these. The agent writes one question
that quotes the four charges by code and page. The patient approves that
text, and that text is what goes to the billing office. Nothing else in
the table goes anywhere. When the office's letter comes back, the agent
adds its explanation to each of the four rows, and the patient decides
row by row.

The same shape serves the two garages' estimates (case 07), the
pharmacies' prices (02), the lenders' offers (04), a renewal beside
other quotes (05 and 06), a receipt beside the bank's transactions (11),
a fee beside the clause in the terms that allows it (13), a freelancer's
agreed scope beside their invoice (38), and a buyer's request broken into
requirements with one answer each (49). In every one of them the person
marks rows, the agent cites a source for every figure, and what crosses
is one exact text that quotes the marked rows.

**A list where each party has its own column.** The snag list has nine
rows, one for each unfinished thing, and each row cites its photos. The
owner's column says accepted as is, disputed or fixed. The contractor's
column says fixed on 3 November, not in scope, or supplier's defect.
Neither party writes in the other's column, and the record never
decides between them. What makes it one list for both is that both
columns hang on the same nine rows, and each row names the same photos
by their hashes. The contractor's agent can sort the rows by trade, and
the owner's by room, and it is still one list. What crosses is the rows,
by those hashes. A column never crosses, because it is one party's own
reading. The same shape serves each deduction beside the move-in and
move-out photos (15), the inventory of a parent's possessions (22), the
handover checklist (23), the bulk order's allocation (26), the claim
bundle (27), and the assistance checklist where each household member
decides what to disclose (08).

**A grid of days against people.** The rota is a grid with a column for
each day and a row for each person. The agent reads the siblings'
messages into cells, and the cell keeps the difference between "could
probably do Tuesday" and "I will take Thursday". Two cells are empty,
and the grid shows the gap. The parent sees who is coming and chooses
which of their own preferences the grid may show. A sibling turns a
maybe into a commitment by saying so against the cell. The paid carer's
hours appear as cells, and the terms behind them do not. What crosses is
a confirmed cell, with who confirmed it. The reason a slot is wanted, a
child's details and the carer's terms never cross. The same shape serves
a booked room (33), the childcare gap (21), and the plan of benches in
the grow room.

**A timeline.** For the electricity bill, the agent draws one time axis.
Each bill is a span on it, and each meter photo is a point. One span has
no photo inside it, and the chart says so. One resident marks a week:
nobody was home. Another marks two days: heater on. The provider's agent
reads the same axis as billing periods and estimated readings. What
crosses is an observation with its author and its time, and a marked
span with its remark. The same shape serves the defect that keeps coming
back, with its reports, visits and "job complete" in order (16), the
incident with its alerts and observations (36), the claim and the
accident, where the insurer, the garage and the hire car each get a lane
of their own (27 and 28), and a prospect's history of touches (48).

**Two versions of one text.** In this workroom the thing on the table is
a note at two commits. The person reads the later version with the
differences from the earlier one marked, and with their earlier remarks
still attached to the paragraphs that survived. What crosses is the
version they accept, by its hash. The remarks stay with their author. The
same shape serves a contractor's quote at two revisions (29), a lease
offer and its revision (09), a repayment plan and its versions (04), a
candidate and its fix (34), a manuscript and its revision (41), a
proposal to a community (42), and the versions of a job application
(39).

**A photo or a page with marked regions.** The owner draws around the
unfinished skirting on a photo and writes what is wrong. The contractor's
reply attaches to that region. In the renovation, the wall to be removed
is marked on the drawing. In the electricity case, the dial is marked on
the meter photo. What crosses is the region, with the photo's hash and
the author of the remark. The same shape serves the deposit photos (15)
and the claim photos (27).

**A brief.** For the specialist appointment, the patient writes their
questions in their own order and chooses the records to attach. The
agent drafts the brief from the pile, and the patient's own words stay
as the patient wrote them. The clinician reads the brief whole. The
learner's plan (47), the rollout plan (35), the family's itinerary (24),
and the planner's page of current intentions in this workroom are briefs
too. The person writes it. The agent reads it before acting and never
overwrites it. What crosses is the whole brief, as the person's own
statement.

Three rules hold for all seven shapes. They come from Bowker and Star's
study of how classification works in practice. First, a view shows what
it left out: the charges that matched nothing, the span with no photo,
the rows cut from a long list. Second, every figure, row and remark can
be traced to who made it: a document, the agent that read it, or the
person who marked it. Third, what a party may not read appears as
unreadable, never as absent. A list that hides a column for one reader
does not tell that reader the column is empty.

No package can declare these views in advance. The table for the bill
depends on which bill and which statement arrived. The grid for the rota
depends on who wrote and what they said. So an agent builds the view on
demand, for one party, from what is on the table that day. A package can
keep a view once the parties want it every time. Until then the host's
job is to show the agent's view, let the person work in it, and let the
person share it.

## 6. What the record holds so that an agent can build them

Take the bill table again and ask what the agent needed from the record
to build it, and what it needs to put back. Five things, and the first
three have designs already.

**The documents themselves.** The agent needed the bill and the
insurer's statement, unchanged, with where each came from. The
[capture](2026-10-21-capture-with-source.md) design keeps a document that
way. But every figure in the table cites a page, and in other cases a
region of a photo, a row of a spreadsheet or a minute of a recording. So
a reference to a document needs to be able to name a place inside it,
not only the whole.

**The agent's readings, kept as data.** The table of fourteen rows is
the agent's reading of two documents. The record keeps a reading today
when it is prose: a note, or a free-text assert in the workroom. The
cases need the same for a table, a grouping of photos or a timeline:
kept as data, signed by the agent that made it, resting on the hashes of
the documents it read, and never mixed with the documents themselves.

**The person's marks, placed on a row.** The patient's "ask about these"
is a choice and a remark against four rows of the agent's reading. Each
mark is the patient's own. When the billing office's letter comes back,
the agent's placing of its explanation on the rows is a reading again,
and the patient's accept or dispute on each row is a mark again. Two
parties' marks on one row stand side by side. The record never
reconciles them, and a rule reads them only when the parties have asked
for one.

**The view's recipe, kept and shared.** For the owner to show the snag
list to the contractor, the record keeps a recipe: which photos and
which reading it draws from, named by hash, and what shape to draw. The
[chat-composed views](2026-10-20-chat-composed-views.md) design keeps
such a recipe for a chart. For the two parties, the identity of the list
is the set of hashes the recipe names. Its shape is each party's own, so
the contractor's agent re-cuts the owner's list by trade from the same
hashes, and both know they are looking at one list.

**The exact text.** The one question is a text pinned by its hash that
quotes four rows by page and code. Approvals, submissions and
acceptances name such texts, and the record keeps them as detached texts
today.

That is all: documents, readings, marks, recipes and exact texts. The
workroom record is already made of the first and the second, by count. A
reference to a thing at a version and free text resting on it are nine
statements in ten. The cases ask for the same two things with a shape
and a place: a reading that is a table, and a remark that sits on a row.

## 7. How structure enters later

The owner and the contractor can work the snag list for weeks with two
columns. Structure enters on the day they want one meaning for "fixed":
the contractor says it, the owner confirms it, and a rule reads both.
Then they install a package. Its item takes each row of the list, its
states are the words the two agreed, and the item cites the same photos
the row cited. The list does not change. It gains a third column that a
rule keeps. A kept recipe becomes a package's view by the path the
composed-views note already gives.

The references note proposed four acts: reference, note, ratify and
close. They are one way to encode a reading, a mark and an agreement.
Whether the record needs them as kinds of their own is decided after the
views exist, when the cases show which marks a rule must read. The order
in every case of section 4 is the same: the documents first, then
readings, marks and an exact text, and an act under rules last. The four
cases that fit the fold now are the ones whose parties had agreed the
rules before dap existed.

## 8. What this changes

dap has one way today for an agent to build an interface while it
works: the composed views of the chat-composed views note. A chat model
writes a small recipe, the host checks it, and the host draws a chart of
a package's data in the person's AI app. It is the right instrument, and
it draws the wrong things. It reads only what a package has declared, so
it can draw the grow room's moisture and cannot draw the patient's bill.
Five changes point it at the boundary.

- A recipe can read documents, readings, marks and journal rows, not
  only a package's items.
- The seven shapes of section 5 join its five kinds of chart.
- The person's marks go from the view into the record, signed by the
  person and placed on a row. Today a composed view has no acts, and a
  tap on a mark only opens a card.
- A recipe names its sources by hash, so that two parties' views of one
  thing are known to be of one thing.
- The host shows the view where the person is: in their AI app through
  the hosted endpoint, and in the browser, by the path the views
  prototype and the sandbox domain already give.

After that, the matter package of the file-first direction starts from
documents and a view, not from item types. The capture and retained
files slices gain places inside a document. The references note waits
until the views show what the record must read.

## Source

Written from `docs/use-cases.md`, `docs/roadmap.md` and the
chat-composed views, capture, retained files and self-contained
applications notes at main `a78e0981`. The workroom counts are the
script count of 28 October 2026 given in the references note. The
observed case is this session's work on that note. The walks in section
3 are readings of the catalogue cards, and no case was built or run.
Boundary objects are Star and Griesemer's (1989). Weakly and strongly
structured, standards against boundary objects, what a view must show
it left out and whose voice it keeps are Bowker and Star's, Sorting
Things Out (1999), chapters 9 and 10. Thin and thick interfaces, the
agent's translation labour and the plan as the shared thing to point at
are Appleton's, "Planning with Agents" (2026), with Suchman's plan as a
weak resource (1987).
