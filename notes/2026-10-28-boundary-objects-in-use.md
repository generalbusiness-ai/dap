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
- **Reading**: what an agent or a person makes of a document. The lines
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

The pile: a bill of fourteen lines with procedure codes, the insurer's
statement of eleven lines with allowed amounts, and a coverage document.
The patient's agent reads the bill and the statement into one table.
Each row is a bill line, and each cell says which page it came from.
Three bill lines match no statement line, and one matches at a different
amount. The patient reads the table as what they owe and why. They mark
the three unmatched lines and the one mismatch: ask about these. The
agent drafts one question that quotes those four lines by page and code.
The patient approves that exact text, and nothing else. A portal receipt
comes back as a document.

Billing staff read the same four lines as how the charge was built. A
letter comes back, and it is a document, not their act. The agent lines
the letter's explanation up against the four rows. The patient accepts
the explanation for two rows, disputes one, and the fourth waits for an
adjustment the letter promised. The patient closes their own part with
the dispute kept.

What fits the fold: the approval of one exact question, the submission,
the receipt, the patient's closing. What does not: the table, the four
marks, the alignment of the letter against the rows, and the four
different outcomes that one letter produced. The table is the boundary
object. The patient and the billing office read it in different
categories, and it stays the same four lines by page and code.

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
times, and the account's tariff. The agent lines up the billed units
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
| 03 groceries | A proposed basket beside receipts | Each person's exclusions against a line |
| 04 card debt | Balances from statements, and plan versions | Which plan the household can bear, a remark per version |
| 05, 06 insurance, internet | The renewal or offer beside other quotes, with dates on one axis | The gap in cover, the household's split reading |
| 07 car repair | Two itemised estimates aligned line by line, with a specialist's opinion per line | Which lines the driver questions |
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
| 27, 28 claim, accident | A bundle of photos, inventory and receipts; three timelines kept apart | Accept part and dispute the rest, line by line |
| 29 renovation | Quote versions side by side, the drawing, marked-up photos | Unclear items marked, an adviser's challenge |
| 31, 32 car, guitar | A listing, documents, an inspection report with limits | A buyer's conditions, private until offered |
| 33, 21 booking, childcare | A grid of slots, with purpose or the child's details kept out | Why a slot is wanted |
| 34 code review | A candidate at a base, findings against lines | Exploration, chatter, a reviewer's doubt short of a finding |
| 35 release | Build identity, checks and a rollout plan | Risk as the owner weighs it |
| 36 incident | A timeline of alerts and observations, hypotheses beside it | The disputed root cause |
| 37, 39, 41 award, hiring, review | Requirements or criteria beside each offer, application or manuscript | An assessor's private reasoning |
| 38 invoice | Scope lines, evidence of work, and invoice lines, aligned | The disputed balance named by both |
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

Seven kinds of view cover the table. Each names what the person does in
it, what the agent does, and what crosses to the other party.

- **Lined-up table**: lines from one document against lines from another.
  Cases 01, 02, 04 to 07, 11, 13, 37, 38, 49. The person marks rows. The
  agent builds the table from the pile, cites a page or a code in every
  cell, drafts the exact thing from the marked rows, and re-lines the
  reply. The marked rows cross, as one exact text.
- **List with a column per party**: rows, each with every party's own
  status and remark. Cases 08, 15, 22, 23, 26, 27, 30. The person sets
  their own column. The agent groups the pile into rows, re-cuts the
  rows the way the other party reads them, and keeps both columns. Rows
  cross by the hashes they cite, and a column never crosses.
- **Grid**: slots by time against people or places. Cases 20, 21, 33,
  and the grow plan. The person fills or confirms a cell. The agent reads
  messages into cells, shows maybes apart from commitments, and shows the
  gaps. A confirmed cell crosses. A purpose or a child's details do not.
- **Timeline**: events from several sources on one axis, in lanes. Cases
  10, 16, 27, 28, 36, 48. The person marks a span. The agent places
  documents and observations by their times, keeps lanes apart, and shows
  a span with nothing in it. An observation crosses with its author.
- **Side by side**: one text or quote at two revisions with the
  differences marked. Cases 04, 09, 29, 34, 39, 41, 42, and this
  workroom. The person marks a difference. The agent computes the
  differences and carries the earlier marks forward. The accepted
  revision crosses, by hash.
- **Marked image**: regions on a photo, a drawing or a page, each with a
  remark. Cases 10, 15, 27, 29, 30. The person draws a region and says
  what it is. The agent attaches the region to the row it belongs to.
  The region crosses with the photo's hash and the remark's author.
- **Brief**: a short document the person edits directly and the agent
  reads before acting. Cases 18, 19, 24, 35, 47, and the person's page
  of current intentions in this workroom. The person writes it. The agent
  drafts from the pile and never overwrites the person's words. The brief
  crosses whole, as the person's own statement.

Three demands from Bowker and Star apply to every kind. The view shows
what it left out: the lines that matched nothing, the span with no
reading, the rows cut from a list. Every cell's author is retrievable:
the document, the agent's reading of it, or the person's mark. And what a
party may not read appears as unreadable, never as absent, so a view
that hides a column does not claim the column is empty.

An agent generates these on demand because no package can declare them
in advance. The lined-up table for case 01 depends on which bill and
which statement arrived. The grid for case 20 depends on who wrote and
what they said. A package can keep a view once the parties want it
every time. Until then the view is the agent's work for one party, and
the host's job is to show it, let the person work in it, and let the
person share it.

## 6. What the record holds so that an agent can build them

Five things, and the first three already have designs.

- **The pile, with locators finer than a file.** Capture keeps a document
  with its source. A cell in a view cites a page, a region of a page or a
  photo, a row of a table, or a time range of a recording or a journal.
  So a retained document needs locators the record can cite, and a
  reference to a document carries one.
- **Readings as data.** The agent's parse of a bill into fourteen rows is
  its statement. The record keeps free text as a statement today; the
  cases need a table, a list of groups or a timeline kept the same way,
  attributed to the reader and resting on the document's hash. The
  reading is never merged with the document.
- **Marks, attributed and placed.** A remark or a choice against one row,
  region or moment, by one party, resting on the reading and the
  document. Two parties' marks on one row stand side by side and are
  never reconciled.
- **Views as data, kept and shared.** A declaration that names its
  sources by hash and its form by kind, kept in the room and shareable,
  as [chat-composed views](2026-10-20-chat-composed-views.md) keeps a
  chart. The identity of the view for the parties is the set of hashes
  it cites. Its form is each party's own, and the other party's agent can
  re-cut it from the same hashes.
- **Exact things.** A text or bundle pinned by hash, with the locators it
  quotes, which an approval, a submission or an acceptance names. These
  exist as detached texts.

This is the pile, the reading and the mark of section 2, and nothing
more. It is also what the workroom record already is, by count: a
reference to a thing at a version, and free text that rests on it, make
up nine statements in ten. The cases ask for the same two with a shape
and a place: a reading that is a table, and a mark that is against a
row.

## 7. How structure enters later

Structure enters when two parties want the same reading of a row's
state. Then a package's item takes the row, the states become acts under
rules, and the item cites the same hashes the view cited. A kept view
becomes a package view by the path the composed-views note already
gives. The other note's four acts, reference, note, ratify and close, are
one encoding of a reading, a mark and an agreement. Whether the record
needs them as kinds is decided after the views exist and show which
marks a rule must read, not before.

So the order is: pile, reading, marks, exact thing, and only then an act
under rules. Every case in section 4 runs that order, and the four built
cases are the ones whose parties had already agreed on the rules before
dap existed.

## 8. What this changes

The [chat-composed views](2026-10-20-chat-composed-views.md) design is
the right instrument and it is pointed at the wrong end. It composes
five chart kinds over a package's projections, so it can show only what
the fold already schematised. The cases need:

- **Sources beyond projections.** Captured documents, readings, marks
  and journal rows, not only a package's items.
- **Kinds beyond charts.** The seven kinds of section 5. A table, a list
  with party columns, a grid, a timeline, a side-by-side, a marked image
  and a brief.
- **Marks that write back.** A composed view contains no acts today, and
  a tap opens a card. A view at the boundary takes the person's mark and
  records it, attributed and placed, without a package act.
- **Identity by hashes.** Two parties' views of one thing are known to be
  of one thing by the hashes they cite, so that "look at this" means the
  same rows on both sides.
- **The host shows the view where the person is.** In their AI app
  through the hosted endpoint, and in the browser, which is the path the
  views prototype and the sandbox domain already provide.

The matter package of the file-first direction then starts from a pile
and a view, not from item types. The [capture](2026-10-21-capture-with-source.md)
and retained-files slices gain locators. The references note is kept as
one possible encoding and not landed until the views show what the
record must read.

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
