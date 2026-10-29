# Boundary objects in use: what the cases pass between parties

Status: current. A proposal to the planner, 28 October 2026, revised 29
October 2026 against main `2be6ca74`. Nothing here is built, and this
note changes no other document.

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
standard, and the others work around it.
[Appleton](https://maggieappleton.com/planning-agents) says the same of
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
  another party reads. Being read is not being bound. In the commons
  nothing binds. A party is bound by a package act that the party signs.
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
table that day.

Between the first message in a room and a package there are steps, and
each step asks a little more of the person than the last. People upload
documents, write messages, reply, react with a glyph and draw on a
photo. An agent reads the documents into rows. The host shows all of
that as threads, tables, timelines and marked images without anyone
declaring a view. Then the agent builds a view for one party, and the
person works in it. Then the person changes the view: sorts it, adds a
column, or adds a column that the host computes, such as "fixed" where
both parties' columns say so. The view's declaration is a short text
that the person can read, and the agent drafts it. Then the agent writes
a view as code, the host runs that code in its sandbox over the same
sources, and the person can edit the code. Last, a package keeps the
view once the parties want it every time, with rules that read the
marks. MacLean's rule for tailorable systems is that each step up in
power costs a small step in skill, and these steps keep to it. A view
made in a room also gains what a view pasted into a chat does not. The
record keeps it, signs it, shares it with the room and offers it to the
next view. Gawande describes a department that built its own faster
screen for its own visits over the hospital's record. That is the step
before the package, and the record does not change shape when a room
takes it.

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
which reading it draws from, named by hash, and what shape to draw. A
recipe is a short text, so the record keeps it the way it keeps a
reading: as a note whose text is the recipe and whose sources are what
the note is about. The [chat-composed
views](2026-10-20-chat-composed-views.md) design keeps such a recipe for
a chart as an item of its own, and this note keeps it as a note. For the
two parties, the identity of the list is the set of hashes the recipe
names. Its shape is each party's own, so the contractor's agent re-cuts
the owner's list by trade from the same hashes, and both know they are
looking at one list.

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

A reading, a mark, an agreement and a closing are one thing in the
record: a signed note about something. Section 9 gives the commons that
one act. Nothing gets a kind of its own until a case shows a rule that
must read it, and then the kind is a package's. The order in every case
of section 4 is the same: the documents first, then readings, marks and
an exact text, and an act under rules last. The four built cases took
that last step first, and section 3.1 shows what one of them leaves
outside.

## 8. What this changes

dap has one way today for an agent to build an interface while it works:
the composed views of the chat-composed views note. A chat model writes
a small recipe, the host checks it, and the host draws a chart of a
package's data in the person's AI app. It is the right instrument, and
it draws the wrong things. It reads only what a package has declared, so
it can draw the grow room's moisture and cannot draw the patient's bill.
Five changes point it at the boundary.

- A view is a note. The composed-views design keeps a recipe as a `view`
  item with three acts of its own. A note already holds a text and names
  what it is about, so the `view` item and its acts go, and the host
  reads views from notes. Keeping a view is writing the note. Sharing it
  is writing the note into the shared room. Reusing it in another room
  is a note there that names it.
- A view can read notes and documents by reference, with a fragment for
  the place inside, and not only a package's items.
- The host shows threads, tables, timelines, marked images and two
  versions of a text over notes with no declaration at all. A
  declaration adds a shape or a computed column, in the expression
  profile the host already compiles filters to, and the person edits it
  in the generic interface. Code adds anything. A computed column reads
  notes and writes nothing.
- A view can write any act its member may sign. The host shows the act
  to the member and signs it on their action, as it signs any act from a
  card. Today a composed view has no acts, and a tap on a mark only
  opens a card.
- The host shows the view where the person is: in their AI app through
  the hosted endpoint, and in the browser, by the path the views
  prototype and the sandbox domain already give.

After that, the matter package of the file-first direction starts from
documents and a view, not from item types, and it carries only what
rules must read: a party slot. The capture and retained files slices
gain the fragment.

## 9. Minimal mechanism

Sections 5 to 8 need two things in the record: a fragment on a
reference, and one act. The rule that shapes them is the one the Web
learned from Xanadu: one-way references, one relation, no types, and
every meaning read from the content by the reader, never kept by the
record.

**A fragment on a reference.** A reference to a retained document is its
digest, and a reference to an entry is its fact reference. Either may
carry a fragment: a string after the reference, in the form of the W3C
Media Fragments URI, such as `page=3`, `xywh=120,80,300,200`, `t=90,120`
or `row=7`. The record stores the string and checks nothing. The media
type of the referenced thing says what the fragment means, and a reader
that does not know the media type ignores it. A note's fact never
changes, so a fragment into a note never drifts. The capture and
retained files designs gain the fragment and nothing else.

**One act in every room.** A native definition, `platform:commons@1`,
pinned in every creation cohort beside the directory, membership, rules
and destination definitions, gives every room one comment act, `note`.
It has two fields. `text` is a detached text with a media type, at most
64 KiB. `about` is a list of references, each with an optional fragment,
to documents and entries in any room the signer reads, and the entry's
size bounds the list. The act has no guards and no effects: the entry is
the fact. One grant, `commons.write`, is given to every member role when
the room is created, and the room's membership can narrow it later. The
commons gains no kinds, verifies no fragment, merges nothing, and holds
no notion of a thread, a reply, a current version or an agreement. Those
are readings.

**What a note is, by its media type and by what it is about.** The host
reads these. The record does not.

| A note that is | Its text | About |
|---|---|---|
| a message | prose | nothing |
| a reply | prose | a note |
| a reaction | one glyph | a note |
| a reading | data: a table, a grouping, a timeline | the documents read, by digest and page |
| a row of a reading | data | the places the row came from |
| a mark | a short remark or a choice | a row, a note, or a document with a fragment |
| a drawing | strokes | a photo or a page with a fragment |
| a brief | prose | nothing, or the matter |
| a view | a declaration, or code | its sources |
| a revision | the same media type as an earlier note by the same signer | that note |
| an agreement | prose or one glyph | another party's words |
| a closing | one word | the matter |

**Threads, revisions and current are readings.** A note by the same
signer, in the same media type, about an earlier note is a revision, and
a view shows the newest as current. A note in another media type about a
note is a comment on it. A note by another signer about a note is that
party's own statement, and two parties' statements about one row stand
side by side. A thread is the host drawing the graph of what is about
what. When the reading is wrong, for instance two tables by one agent
that are alternatives and not a revision, the text says so and a view
shows both. The record keeps no `replaces`, no thread and no current.

**Identity at the grain of pointing.** A reading that the parties will
work row by row, such as the snag list, is written as one note per row,
each about the photos it came from, and one note that lists the rows.
Each row then has a fact of its own, a mark names it, and a re-cut by
the other party is a new list note about the same row notes. A reading
that is read at a glance is one note, and a mark on a row of it carries
a fragment. The record allows both, and the agent chooses by what will
be pointed at. Block-based document tools make the same choice by giving
every block an identity, and a database in such a tool is a view over
blocks.

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
refused there at install. If the install already refuses an absent
connection target by name, that name serves. Otherwise the refusal is
`commons-missing`. Such a room gains the commons only by succession to a
new scope, under the [definition
succession](2026-10-22-definition-succession.md) note, which is designed
and not built. BO1 creates new rooms for its witnesses, and the hosted
rooms keep their pins until then.

**How a package binds a party.** In the commons nothing binds. A glyph
about another party's terms note is that party's statement that they
agree, and the parties read it as such, which is how agreement is given
in chat today. When a rule must read agreement, the agreement is an act
of a package, as this workroom's own `ratify` is an act of a package
with rules. A package that takes a row from a view declares a connection
to the commons as an `outside` endpoint, in the form of the [application
packages](2026-10-18-application-packages-and-builder-room.md) note, and
its acts carry reference fields, so that an item cites the notes and
documents the row cited.

A party enters a party slot of an item by signing the package's act
whose effect writes the slot from the signer, `from: { signer: true }`,
which the contract has today, and that act names the terms note by
reference. The package grants that act to the role that fills the slot.
The record then holds the party's signature on an entry that names the
words, and no act signed by anyone else can write that party into the
slot. A slot that an effect writes from a field or from another slot is
one the package fills on a member's behalf. The Counter writes
`controller` from the opener's field and `speaker` from another slot,
and the lanes write `author`, `requested` and `informed` the same way.
The install screen lists every such slot with the acts that write it.
The contract gains no word for this, and no package on main changes.

**Views.** A view is a note the host runs. Its text is a declaration in
the form the [chat-composed views](2026-10-20-chat-composed-views.md)
note gives, or code that the host runs in the sandbox domain, and its
`about` names its sources: notes and documents by reference and
fragment, and a package's projections. The host ships views that need no
declaration, a thread, a table over notes that are data, a timeline, an
image with regions, and two versions of a text side by side, and a
declaration adds a shape or a column to one of them. A column can be an
expression over the sources, in the `restricted@1` profile the view
session compiles filters to, and an expression reads notes and writes
nothing. The host mounts a view for a member over the rooms that member
reads. A source in a room the member does not read appears as
unreadable, with the room named and nothing else shown. A view in a
shared room names a private note by its fact reference and never by the
digest of its text, so that the other party cannot confirm a short
private mark by hashing guesses. A view may write any act its member may
sign. The host shows the act to the member and signs it on their action,
as it signs any act from a card, and a mark from a view is a note about
a reference with a fragment. The person edits a declaration in the
generic interface, and the edit is a new note about the old. Two views
that name the same references are views of one thing, and the host says
so. The kinds a view can take are the host's, not the record's.

**Item ends and party closings.** An item's final state ends the item
and never a party's part of the matter. A package does not declare a
final state whose description says that the matter is closed. A party's
closing is their note about the matter, in their own word, and the
matter view shows each party's last word beside the item's state.

**Witnesses.** The host runs the first two with no package installed.
`dap check` runs all four for a package that connects to the commons.

| Witness | Scenario | Passes when |
|---|---|---|
| W1 | **The bill table.** In a member's own room, the member's agent retains two documents and writes fourteen row notes, each about a page of the bill and a page of the statement, and one note that lists them as a table. The member writes four marks, each about one row note. The agent retains the question as a document and writes a note about it and the four row notes. | Every act is recorded with its signer. The host's table view shows the fourteen rows with their pages. A view of either document lists the rows, the marks and the question, each with its author, and nothing of the member's is attributed to the agent. |
| W2 | **One list, two views.** A and B share a room that holds nine row notes about photos. A writes a view note about them in the shared room and a private mark about row six in A's own room. B writes a view note about the same nine in B's own room, sorted differently, with a column computed from both parties' marks, and writes a mark about row six in the shared room. | Both views mount for their keepers, and the host names them as views of one thing. For B, A's view shows A's private mark as unreadable, with A's room named. Row six in the shared room shows B's mark with B as its author, and A's private mark appears to A alone. B's computed column reads B's mark and the shared marks only. |
| W3 | **Consent before binding.** A package whose `owner` slot is written only by an effect `from: { signer: true }` is installed in the shared room. B opens an item from row six and enters its `contractor` slot the same way, and the act names B's terms note. A writes a glyph about B's terms note in the shared room. A signs the package's `accept` act, which names the same terms note and writes the signer into `owner`. B signs `accept` on a second item. A second package, whose effect writes `owner` from a field, is offered for install. | A's glyph stands as a note and fills no slot. A's act takes effect, `owner` holds A, the entry names the terms note, and the item cites the row note. B's act writes B, and not A, into `owner` of the second item, and no act of B's can write A. The install screen for the second package lists `owner` as a slot the package fills from a field, with the act that writes it. |
| W4 | **Close without agreement.** C's package item ends `decided`. A writes a note `disputed` about the matter. B writes a note `done` about it. | All three stand. The matter view shows A's and B's last words and C's item ended, and none of the three changed another. |

**What changes where.** The slices change these with their code. This
head changes nothing.

| Where | Today | After |
|---|---|---|
| `packages/contract/src/definition.ts` | A reference has no fragment. | A reference can carry a fragment. Nothing else. |
| `packages/contract/src/scope.ts` | `PlatformDefinition` names eight platform parts. | It gains `commons`. |
| [kernel page](../docs/kernel.md), K1, and `platform/src/native-catalog.ts` | The catalog pins 80 versions. | 81, with `platform:commons@1`. |
| `scope/src/creation-versions.ts` and each Worker's `PLATFORM_CREATION_PINS` | The newest cohort has no commons. Each Worker's setting lists six historical pins. | The newest cohort gains `platform:commons@1`. The setting does not change. |
| [capture](2026-10-21-capture-with-source.md) and retained files | A reference is a digest and a source. | A reference can carry a fragment. |
| [chat-composed views](2026-10-20-chat-composed-views.md) | Five chart kinds over a package's projections, kept as a `view` item with three acts. No acts in a view. | A view is a note. Sources by reference. Built-in views over notes. Computed columns. A view writes acts the member signs. |
| The host's generic interface and sessions | Shows a room's items. | Shows notes as threads, tables, timelines, marked images and versions, lets a member edit a view, and lists at install the party slots a package fills from a field or another slot, in the browser and over MCP. |
| [write an application](../docs/write-an-application.md) and [roadmap](../docs/roadmap.md) | Declare the item types first. No roadmap row. | Cite notes and documents first, write a party slot from the signer when the party must consent, final states end items. One roadmap row. |
| [use cases](../docs/use-cases.md), "Pointing at things, and claims of agreement" and "Three kinds of statement" | "Pointing" and "a claim of agreement" as a signed act by several. | A reading, a mark and an agreement as notes, with a link to this note. |

**Slices.** Each is a request to the builder, in this order. The four
requests filed on 28 October, BO1 `f34cec9f`, BO2 `13f354c0`, BO3
`5fafd151` and BO4 `df9b925b`, describe the first version of this
section. The planner replaces them when this revision lands.

- **BO1. The fragment and the commons.** The fragment on references, the
  `note` act, `platform:commons@1` in the newest creation cohort and in
  the catalog, the refusal at install in an older room, and the generic
  interface's thread and table over notes. Witness W1, in a new room.
- **BO2. Views as notes.** The host's built-in views over notes,
  declarations with computed columns, view editing in the generic
  interface, and views that write acts the member signs. Witness W2.
  After declared views reach the generic server and the hosted endpoint.
- **BO3. Parties by their own signature.** The install screen's list of
  party slots a package fills from a field or another slot, with the
  acts that write them, and the first two-party item in a package, the
  snag list, whose `owner` is written from the signer. Witness W3. No
  contract change.
- **BO4. The matter view.** Each party's last word beside the item's
  state, and the four witnesses in `dap check`. Witness W4, and the
  renovation exit test with the matter package of the file-first
  direction.
- **BO5. Views as code.** A view whose text is code, run in the sandbox
  domain over its sources, with the same way to write an act. After BO2.

## Source

Written from `docs/use-cases.md`, `docs/roadmap.md` and the
chat-composed views, capture, retained files and self-contained
applications and application packages notes, and from
`packages/contract/src/definition.ts`, at main `a78e0981`, and
rechecked at main `2be6ca74` on 29 October 2026. The workroom
counts are a script count over `gs status -json` of the artroom
workroom on 28 October 2026, at frontier depth 81838: 34,549 artifacts
and 7,877 asserts among 49,090 statements. The observed case is this
session's work on the earlier draft. The walks in section 3 are readings
of the catalogue cards, and no case was built or run. The commons and the
witnesses are cut down from the earlier draft, which this note
replaces.
Boundary objects are Star and Griesemer's (1989). Weakly and strongly
structured, standards against boundary objects, what a view must show
it left out and whose voice it keeps are Bowker and Star's, Sorting
Things Out (1999), chapters 9 and 10. Thin and thick interfaces, the
agent's translation labour and the plan as the shared thing to point at
are Appleton's, "Planning with Agents" (2026), with Suchman's plan as a
weak resource (1987).
The revision of 29 October follows two reviews of the first version. The
first was against Ink & Switch's "Malleable software: restoring user
agency in a world of locked-down apps" (Litt, Horowitz, van Hardenberg
and Matthews, 2025), with the gentle slope of MacLean and others (1990)
as that essay presents it, "Potluck: dynamic documents as personal
software" (Litt, Schoening, Shen and Sonnentag, 2022), and Webstrates
(Klokmose and others, 2015, with the project's overview). The second was
against block-based document tools, where a block has an identity and a
database is a view over blocks, the affordances of chat, that is upload,
reply, thread, reaction and markup, Sutherland's Sketchpad (1963),
Dynamicland's Realtalk, where a program is claims about pointed-at
things, Gawande's account of a department that built its own screen over
the hospital's record ("Why Doctors Hate Their Computers", 2018), and
Nelson's Xanadu as the warning. The steps of section 5 are the gentle
slope. A computed column that writes nothing is Potluck's annotation
layer. A view named by reference and reused by reference is Webstrates'
tool shared by reference. One set of references under two views is
Webstrates' asymmetric collaboration. The fragment on a reference is the
W3C Media Fragments URI, read by the media type and ignored by the
record.
