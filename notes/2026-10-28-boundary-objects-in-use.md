# Boundary objects in use: what the cases pass between parties

Status: current. A proposal to the planner, 28 October 2026, against
main `a78e0981`. Nothing here is built, and this note changes no landed
document. It replaces an earlier draft, references, notes and
ratifications, which was reviewed and never landed, and it keeps that
draft's mechanism in its smallest form in section 9.

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
where the parties' work ends, not where it starts. The start is a thing
on a table that an agent built for one party, and the mechanism follows
from how the parties use it.

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
- **Own room**: a room whose members are one party and its agents. The
  catalogue's groups 3 and 5 give each party one.
- **Shared room**: a room whose members include two or more parties.
- **Crosses**: a thing crosses when a party writes it into a room that
  another party reads. Being read is not being bound. Only a ratification
  binds.
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
at a different amount. The patient reads the table as what they owe and
why. They mark the three unmatched charges and the one mismatch: ask
about these. The
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
| 12 subscription | The account's charges beside who at home uses it, and the exact instruction to cancel | One person's wish to keep it |
| 15 deposit | Each deduction beside the move-in and move-out photos for that room | Each tenant's claim per deduction |
| 16 repair | A timeline of reports, visits, "job complete" and recurrence | The tenant's reading that it is not fixed |
| 17 retrofit | Proposals beside usage data, with the assessor's assumptions shown | The owner's and occupant's different weights |
| 18, 19 clinic, discharge | A brief, or a checklist from discharge papers with inconsistent versions shown | The patient's questions, in their order |
| 22 possessions | An inventory with photos, each row's destination and who decided | Siblings' disagreement per row |
| 23 moving out | A handover checklist by date, with condition reports | Two residents' observations of one room |
| 24 trip | An itinerary with each traveller's constraints | Each traveller's private budget |
| 25 family budget | Estimates beside what each person might contribute | Each person's reason for their amount, and "we agreed" as a claim until each confirms |
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
| 44, 45, 46 counting, lending, grow | Turns, a shelf, readings and alerts | Little. These fit the fold now |
| 50 calendar | Posts on a schedule, each at an exact revision | A reviewer's comment on a draft |
| 47 learning | The plan, chosen submissions, feedback owed | Private practice |
| 48, 49, 51 prospects, bid, market | Notes with sources, a requirement matrix from the request, leads and needs | The reading of the request into rows, unclear rows |

Three things stand out. Almost every thing between parties is a reading
of a pile, lined up or grouped, and not a document and not an act. Each
party keeps marks against it in their own words, and the marks are what
the parties actually exchange. And three of the four cases marked built,
counting, lending and grow, fit the fold almost whole. The fourth, code
review, is this workroom's, and section 3.1 shows what it leaves
outside. That says what the fold is good at, and not that the other
cases need more fold.

## 5. Interfaces that work at the boundary

In each of the five cases, the person had one thing on the table that
they could work in: a table, a list, a grid, a chart, a text with
remarks. Across the whole catalogue those things come in seven shapes.
Each shape below appears through the case it came from: what the person
sees and does, what the agent did to make it, and what goes across to
the other party.

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
text, and that text is what goes to the billing office. The table lives
in the patient's own room, and nothing else in it goes anywhere. The
billing office is outside every room, so the question leaves by the
portal and the receipt comes back as a document. When the office's
letter comes back, the agent adds its explanation to each of the four
rows, and the patient decides row by row.

The same shape serves the two garages' estimates (case 07), the
pharmacies' prices (02), the lenders' offers (04), a renewal beside
other quotes (05 and 06), a receipt beside the bank's transactions (11),
a fee beside the clause in the terms that allows it (13), a
subscription's charges beside who at home uses it (12), a freelancer's
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
the owner's by room, and it is still one list. The rows cross: both
parties read them in the shared room, by those hashes. A column crosses
only when its owner writes it into the shared room, and the record never
merges it with the other's. The owner's private remark on a row, "the
specialist thinks this one is ours", stays in the owner's own room. The
same shape serves each deduction beside the move-in and move-out photos
(15), the inventory of a parent's possessions (22), the handover
checklist (23), the family budget where each contributor's amount is a
column of their own (25), the bulk order's allocation (26), the claim
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
child's details and the carer's terms never cross. Each stays in the own
room of the party who holds it. The same shape serves
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
does not tell that reader the column is empty, and a view that draws on
a party's own room tells another reader that a source is in a room they
do not read.

No package can declare these views in advance. The table for the bill
depends on which bill and which statement arrived. The grid for the rota
depends on who wrote and what they said. So an agent builds the view on
demand, for one party, in that party's own room, from what is on the
table that day. A package can
keep a view once the parties want it every time. Until then the host's
job is to show the agent's view, let the person work in it, and let the
person share it.

## 6. What the record holds so that an agent can build them

Take the bill table again and ask what the agent needed from the record
to build it, and what it needs to put back. Six things. The first three
and the last have designs already.

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

**The party's own room.** The patient's table, their marks and the
letter's alignment live in the patient's own room, which they share with
their agent and nobody else. When the other party is a member of a
shared room, as the contractor is, the owner's pile, readings and
private marks stay in the owner's own room, and the owner writes into
the shared room what the contractor is meant to read: the nine rows,
the photos they cite, the owner's column. That is what crosses. The
catalogue's group 3 already keeps each party's private part in a room
of its own, and group 5 starts every case in one person's own room.

That is all: documents, readings, marks, recipes, exact texts and a room
of one's own. The workroom record is already made of the first and the
second, by count. A reference to a thing at a version and free text
resting on it are six statements in seven. The cases ask for the same
two things with a shape and a place: a reading that is a table, and a
remark that sits on a row.

## 7. How structure enters later

The owner and the contractor can work the snag list for weeks with two
columns. Structure enters on the day they want one meaning for "fixed":
the contractor says it, the owner confirms it, and a rule reads both.
Then they install a package. Its item takes each row of the list, its
states are the words the two agreed, and the item cites the same photos
the row cited. The list does not change. It gains a third column that a
rule keeps. A kept recipe becomes a package's view by the path the
composed-views note already gives.

A note, which is a reading or a mark, a ratification and a closing are
the three things that a rule or a projection reads in every case above,
and section 9 gives them as the three acts of the commons. Nothing else
gets a kind of its own until a case shows a rule that must read it. The
order in every case of section 4 is the same: the documents first, then
readings, marks and an exact text, and an act under rules last. The four
built cases took that last step first, and section 3.1 shows what one of
them leaves outside.

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
files slices gain places inside a document.

## 9. Minimal mechanism

Sections 5 to 8 need one value shape, three acts, one rule and one room
shape. They replace the earlier draft's four acts and per-member
presentations.

**A place inside a document.** A reference to a retained document is its
digest. A locator is that digest with a place: a page number, a region
of a page or a photo as four integers, a row number of a table, a time
range of a recording in milliseconds, or an entry range of a journal as
`{ scope, from, to }`. A locator is a value, not an act. It appears
wherever a reference appears: in a note's `about`, in a recipe's
sources, and in an exact text's quotations. The capture and retained
files designs gain the locator and nothing else.

**Three acts in every room.** A native definition, `platform:commons@1`,
pinned in every creation cohort beside the directory, membership, rules
and destination definitions, gives every room three comment acts. They
have no guards and no effects: the entry is the fact. One grant,
`commons.write`, is given to every member role when the room is created,
and the room's membership can narrow it later. The `about` list holds at
most 16 entries.

| Act | Fields | What it is |
|---|---|---|
| `note` | `text`: detached, at most 64 KiB, prose or data. `about`: a list of locators, of facts of kind `note`, `ratify` or `close` under the commons, and of entries of any other definition. `replaces`: a `note` fact, optional. | A reading, when the text is data and `about` names the documents read. A mark, when `about` names one row or region of a reading and the text is short. A brief, when it replaces the signer's earlier note. A re-cut, when it replaces a reading and names the same locators. |
| `ratify` | `of`: a `note` fact. `for`: a fact reference to the opening entry of one item, optional. `text`: optional, at most 1,024 bytes. | One party's signature on another party's words. It is the only act that binds its signer to those words. With `for`, it is consent to enter one party slot of one item. |
| `close` | `about`: as on `note`. `outcome`: text, at most 64 bytes. `text`: detached, optional. | One party's statement that its own part of a matter is closed, in its own word. It ends no item. |

The commons gains no kinds and holds no enumerations. A reading that is
a table is still a note, and an outcome is still the party's word. The
commons verifies no locator and merges nothing. A reference needs no act
of its own: the retained document is the reference, and the locator says
where in it.

**The commons in a party's own room.** The commons is created with every
room, including a room of one party. A party's pile, readings and
private marks live in the party's own room until the party writes them
into a shared room. A reading in the shared room cites the same hashes,
so a document retained in both rooms is one document. Every member of a
room reads every scope in it, so the own room is the only private side,
and it needs nothing new: the catalogue's group 3 rooms are own rooms.

**Rooms created before the commons.** A pin in the creation cohorts
reaches only rooms created after it. A room created before has no
commons scope, and a package that declares the commons endpoint is
refused there at install with `commons-missing`. Such a room gains the
commons only by succession to a new scope, under the
[definition succession](2026-10-22-definition-succession.md) note,
which is designed and not built. BO1 creates new rooms for its
witnesses, and the hosted rooms keep their pins until then.

**How a package binds a party.** A package that takes a row from a view
declares a connection to the commons as an `outside` endpoint, in the
form of the [application packages](2026-10-18-application-packages-and-builder-room.md)
note, and any of its acts can carry `about`, so that an item cites the
hashes the row cited. A party slot in its item types carries a `consent`
rule with one of three values.

- `signer`, the default. Only the act's signer enters the slot.
- `ratified`. A member enters the slot only on their own ratification of
  the terms, given for that item. One act opens the item and fills the
  proposer's slot as signer. The other party then writes `ratify` of the
  terms note, with `for` naming the item, in the shared room. A later
  act fills the ratified slot. It presents the `note` fact as `terms`
  and the `ratify` fact as `consent`, and the validator proves four
  guards: the ratification's `of` is the terms note, or `consent-terms`;
  its `for` is this item, or `consent-item`; its signer is the member
  written, or `consent-signer`; and the terms note's text digest equals
  the act's own `terms` field. An act that presents no ratification is
  refused `consent-missing`.
- `declared`. The package writes the slot without the member's
  signature, and the install screen lists every such slot with the acts
  that write it.

A slot with no `consent` and an effect that writes it is refused
`consent-unstated`. The marker that spends a ratification is the slot
itself. The slot holds the member and the ratification's reference,
written in the same entry as the act, so a second presentation finds
the slot filled and is refused `consent-consumed`. A ratification whose
`for` names one item fills a slot of no other item, so no member can
spend it on another act. The state is one reference in each filled
slot, bounded by the slot's `max`, and no guard scans history. The
certified-rules hardening keeps one increasing marker for each
Destination for the same reason. Reading a presented entry's signer
needs one new part in the contract, `signer`, beside `kind`, `intent`,
`on` and `time`.

**A recipe for a view.** The composed-views design keeps a chart's
declaration as a `view` item in the Rules scope, with `keep-view`,
`share-view` and `drop-view`. The same item keeps the recipes of section
5. A recipe's sources are locators and `note` facts named by hash and by
room, as well as a package's projections, and its kind is one of
`table`, `list`, `grid`, `timeline`, `compare`, `image` or `brief`. The
host mounts a recipe for a member over the rooms that member reads. A
source in a room the member does not read appears as unreadable, with
the room named and nothing else shown. The host draws the view in the
person's AI app and in the browser. A mark made in a view is a `note`
act placed by locator, in the room the member chooses, which the host's
server signs as it signs any act from a view. Two parties' recipes that
name the same hashes are recipes for one thing, and the host says so.

**Item ends and party closings.** An item's final state ends the item
and never a party's part of the matter. A package does not declare a
final state whose description says that the matter is closed. A
projection that shows a matter as closed reads the parties' `close`
acts, and a closing ends no item.

**Witnesses.** The host runs the first two with no package installed.
`dap check` runs all four for a package that connects to the commons.

| Witness | Scenario | Passes when |
|---|---|---|
| W1 | **The bill table.** In a member's own room, the member's agent retains two documents and writes a `note` whose text is a table and whose `about` names pages of both. The member writes four marks against rows of it. The agent writes an exact text that quotes four locators. | Every act is recorded with its signer. A projection of either document lists the reading, the marks and the exact text, each with its author, and nothing of the member's is attributed to the agent. |
| W2 | **One list, two recipes.** A and B share a room that holds nine notes citing photos. A keeps a recipe of kind `list` over them in the shared room and writes a private mark on row six in A's own room. B keeps a recipe over the same hashes in B's own room, sorted differently, and writes a mark on row six in the shared room. | Both recipes mount for their keepers, and the host names them as recipes for one thing. For B, A's recipe shows A's private mark as unreadable, with A's room named. Row six in the shared room shows B's mark with B as its author, and A's private mark appears to A alone. |
| W3 | **Consent before binding.** A package with a `ratified` slot `owner` is installed in the shared room. B opens an item from row six and enters its `contractor` slot as signer. A writes `ratify` of B's terms note with `for` naming the item. B then presents a ratification to write A into `owner` six times: none, B's own ratification of the terms, A's ratification of another note, A's ratification whose `for` names another item, A's ratification of the terms for this item, and that same ratification again. | The first four are refused `consent-missing`, `consent-signer`, `consent-terms` and `consent-item`. The fifth takes effect, the slot holds A and the ratification, and the item cites the row's hashes. The sixth is refused `consent-consumed`. |
| W4 | **Close without agreement.** C's package item ends `decided`. A writes `close` with outcome `disputed` about it. B writes `close` with outcome `done`. | All three stand. A projection shows the matter closed for A and B in their own words and C's item ended, and none of the three changed another. |

**What changes where.** The slices change these with their code. This
head changes nothing.

| Where | Today | After |
|---|---|---|
| `packages/contract/src/definition.ts` | No locator value. `EntryPart` has no signer. `ItemType.parties` is `SlotRule & { list, max, author }`. | A `locator` value. `EntryPart` gains `"signer"`. Party slots gain `consent?: "signer" \| "ratified" \| "declared"`. |
| `packages/contract/src/scope.ts` | `PlatformDefinition` names eight platform parts. | It gains `commons`. |
| [kernel page](../docs/kernel.md), K1, and `platform/src/native-catalog.ts` | The catalog pins 76 versions. | 77, with `platform:commons@1`. |
| `scope/src/creation-versions.ts` and each Worker's `PLATFORM_CREATION_PINS` | The newest cohort has no commons. Each Worker's setting lists six historical pins. | The newest cohort gains `platform:commons@1`. The setting does not change. |
| [capture](2026-10-21-capture-with-source.md) and retained files | A reference is a digest and a source. | A reference can carry a locator. |
| [chat-composed views](2026-10-20-chat-composed-views.md) | Five chart kinds over a package's projections. No acts in a view. | Seven more kinds. Sources by hash. A mark from a view is a `note`. |
| The host's generic interface and sessions | Shows a room's items. | Shows notes, marks, closings and recipes, in the browser and over MCP. |
| [write an application](../docs/write-an-application.md) and [roadmap](../docs/roadmap.md) | Declare the item types first. No roadmap row. | Cite locators first, declare `consent` on each party slot, final states end items. One roadmap row. |
| [use cases](../docs/use-cases.md), "Pointing at things, and claims of agreement" and "Three kinds of statement" | "Pointing" and "a claim of agreement" as a signed act by several. | A reading, a mark and a ratification, with a link to this note. |

**Slices.** Each is a request to the builder, in this order. None is
filed by this note.

- **BO1. Locators and the commons.** The locator value, the three acts,
  `platform:commons@1` in the newest creation cohort and in the catalog,
  `commons-missing` at install in an older room, and the commons shown
  by the generic interface. Witness W1, in a new room.
- **BO2. Recipes over hashes.** The `view` item with document and note
  sources, the seven kinds, and marks that write back. Witness W2. After
  declared views reach the generic server and the hosted endpoint.
- **BO3. Consent on party slots.** The rule, the `signer` part, the
  validator's checks, consumption, the install screen's list of
  `declared` slots, and the first `ratified` slot in a package, the snag
  list. Witness W3.
- **BO4. Closings and the matter projection.** Closings in the room's
  views, the matter projection, and the four witnesses in `dap check`.
  Witness W4, and the renovation exit test with the matter package of
  the file-first direction.

## Source

Written from `docs/use-cases.md`, `docs/roadmap.md` and the
chat-composed views, capture, retained files and self-contained
applications and application packages notes, and from
`packages/contract/src/definition.ts`, at main `a78e0981`. The workroom
counts are a script count over `gs status -json` of the artroom
workroom on 28 October 2026, at frontier depth 81838: 34,549 artifacts
and 7,877 asserts among 49,090 statements. The observed case is this
session's work on the earlier draft. The walks in section 3 are readings
of the catalogue cards, and no case was built or run. The commons, the
consent rule and the witnesses are cut down from the earlier draft,
which this note replaces.
Boundary objects are Star and Griesemer's (1989). Weakly and strongly
structured, standards against boundary objects, what a view must show
it left out and whose voice it keeps are Bowker and Star's, Sorting
Things Out (1999), chapters 9 and 10. Thin and thick interfaces, the
agent's translation labour and the plan as the shared thing to point at
are Appleton's, "Planning with Agents" (2026), with Suchman's plan as a
weak resource (1987).
