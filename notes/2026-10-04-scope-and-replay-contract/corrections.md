# Corrections applied in revision 2

The planner read the first draft at `8416c414df68f11b2a789ebb686de0bf1895c4d4`
and asked for seven groups of corrections in
`a670d34d6ab3a78b954a50ac4239ffb761c89f92`. This table says where each
is applied in `notes/2026-10-04-scope-and-replay-contract.md`. That
reading was a planning correction. It is not an independent review.

| # | Correction asked | Where applied | What changed |
|---|---|---|---|
| 1 | Remove hash and signature fixed points. State build, sign, seal and deliver order, and the byte domains. One routing rule. Restore keeps the incarnation; loss must not silently make a working replacement. | Sections 2.1 to 2.3; section 3 rule 5; section 4.1; sections 7.1 to 7.3; points R1-7 and R1-10. | Five byte domains. A scope ID is the digest of a seed that names the creator and the digest of the causing input, with no entry hash or position. An intent is addressed to an existing scope, or to nothing when founding; it never names the scope it creates. A fact reference, duty ID and receipt are views built after sealing; an entry names itself only as `self`. Founding, child creation and a relationship update are each given step by step. One namespace; the object is named by the scope ID alone. A created scope is provisional until its creator confirms its incarnation; a creator that holds another incarnation records a conflict and never confirms. |
| 2 | Keep every time dependency sound at commit. Separate a backward clock from freshness. Classify what may be read before the snapshot. One protocol for every writer. Bound retries. | Section 5, all four parts; bounds in section 7.5. | A table of five dependency classes. Immutable inputs are fetched before the turn with a time limit. The commit reads the clock once, applies any transition that has become due and judges again, then derives every guard and effect from that reading. Rules cannot read the clock. Entry order time and validity are separate: an entry that judges time is not written when the clock is behind; a clamped time never proves validity. All writers use the one protocol. Turn restarts are bounded and end in `busy`. |
| 3 | Complete the declared-meaning contract, or name what is missing with an owner. Pin full semantics. State an evolution policy. Authority cannot be "any". | Section 6, parts 6.1 to 6.9. | What a genesis pins, including profile and capability versions. Field types. Item slots with `fixed` and `required`. Acts with a primary item and up to three other named items, expected revisions for each, atomic effects, and receive handlers. A required grant on every act, checked as well as any party guard; the `any` signer form is removed. Guard forms with subjects, `count`, and exact rule inputs. Attention before and after. A table of forms not defined, with R2, R3 or R4 as owner. Several pinned meanings are stated to be normal history, with a first-version policy for upgrades. |
| 4 | Make replay and its limits precise. | Sections 9.3 to 9.5; section 11.4. | A table of what each input kind lets a verifier derive and what it cannot check. A foreign fact is relied on only by replaying its source or by a named anchor. Bounded traversal. A report that states mode, target, coverage, anchors, dependencies and trusts; the word "verified" is not used alone. Equivocation and the other limits are listed. The publication receipt is a proposal for R3 with four open questions. |
| 5 | Separate retryable unavailability, stable refusal and accepted receipt recovery. Reconcile delivery recording. Replace "an entry when a page needs it". Qualify relationship keys. | Section 4.2; sections 7.3 and 7.4; section 6.6. | Four answers with whether each consumes the key. Accepted acts are found from history with no window. No refusal is cached. An intent has `notAfter`. A settlement read returns a receipt and admits nothing. Five delivery cases, with which write an entry. Sends are lifecycle or advisory by their form; a lifecycle result returns as a message and becomes an entry in the sender. A relationship key includes the owner's scope, incarnation, name and item; revisions of different owners are never compared. |
| 6 | Complete interruption, retention and shared-boundary coverage. | Sections 9.1 and 9.2; section 8.5; row 14 of section 8.2. | Budgets reserve room for settlement entries, as a dependency on R4. Definitions, foreign entries, messages, rule inputs and outcome evidence are retained inputs; a missing one gives `incomplete`. Reset needs outside effects settled. Each read is bounded and a whole replay is not. The non-exclusive extent choice is explained as a tradeoff, with what holds, what does not, and what R2 must show. Sole-admin qualification is a grant or commitment under R3. |
| 7 | Fix contribution provenance and inventory claims. | Section 6.7; sections 10.2 and 10.3; section 8.1; section 11 opening and 11.6. | Attribution covers former performers, every holder, the signer and principals; Git author text is not authority; R3 owns the member, key and principal contract. The issue closes on a delivery from the pull request lane's entry that records the destination's confirmed outcome, named exactly, at a stated relationship revision. Five packages are mapped. The audit's "S1" label and its limits are stated. Acceptance is the absence of the earlier meanings, not of a type name. Root, build and guide rewrites stay with R0's successors. |

Carried over from the R0 corrections `b9eb7419`: a hold's end changes no
commitment (section 6.8); outside effects have numbered attempts and an
unknown result that a later attempt cannot settle (section 4.3);
attention is inside the application only (section 6.6); an inbox scope
kind is added for it (section 2.1).

Two places where this revision now differs from R0 revision 2, to be
reconciled in R0: R0 section 2.3 has no inbox scope row; R0 section 9.6
says "one binding per scope kind" where this note proposes one
namespace.

# Corrections applied in revision 3

The planner read revision 2 at `8ceb151059977fcf8f01f6ce63d599a68cba126a`
in full and asked for five further points in
`ba9133500d75ea6f59dbd4409949ab2c3121d0e5`. The revision 2 changes are
kept.

| # | Correction asked | Where applied | What changed |
|---|---|---|---|
| 1 | Close the item-identity ambiguity. | Section 4.1; section 6.3; section 6.4; sections 10.1 and 10.2; point R1-11. | One new item for each entry, checked by the validator. An item's ID is its opening entry's `seq`, which is then unambiguous, and its outside name is that entry's fact. A hold is opened as the primary item of an `open` act. An `open` act has no `on` in its intent; `also` fields select existing items by local ID; `expected` has a key for `on` in a transition and for each `also` name. The witnesses number their items. Atomic effects on several existing items are kept. |
| 2 | Finish the creation control exchange. Founding authority is R3's. Correct the incarnation sentence. | Section 2.2; section 4.1's genesis input; section 7.1; section 7.2. | A provisional child admits only its creator's confirmation, and how that is authenticated is stated. Repeated and mismatched confirmations, the refused child, the conflict and a restart on either side are each given. A child's first parties come from the opener the creator judged and recorded, carried in the creation message; the child's genesis holds the message and its source, not an intent to itself. Every later act needs its own grant. The founding rule, the first admin, and membership before any ordinary lane is active are stated as dependencies on R3. The signature commits to the seed's inputs; the incarnation is minted by the service. |
| 3 | Close delivery result termination and supersession. | Section 6.6; section 7.3; section 7.4; section 7.5; point R1-12. | Four message classes. A result and a control have no result, so every exchange ends. `relate` has a result clause. Every verified request gets exactly one deciding entry, `applied`, `refused` or `superseded`, which sends one result that names the request by source and ordinal; the deciding fact is the result's envelope. The sender records the result as one entry. A permanent `wrong-incarnation` or `not-found` is decided `undeliverable` by the sender in a recorded entry after three attempts. A creation with its confirmation and an out-of-order link are shown as tables. |
| 4 | State the run-time source-authentication boundary apart from replay. | Section 7.4, "What the receiver trusts at run time"; section 9.2; section 9.4. | At run time the receiver makes a bounded read through the deployment's one scope namespace, pinned to the scope ID and incarnation, and checks bytes, hash and the send. The trust is named: that the object behind that name runs the platform's code. It is not a replay. Bad bytes are `source-unverified`. Replay still derives the source or names a caller's anchor, and an anchor binds only that caller. A retained foreign entry is stated not to be its prefix proof; keeping sources replayable is a retention dependency on R4, and a missing source gives `incomplete`. |
| 5 | Reconcile the grammar and the cross-draft contracts. | Section 6.3, opening rules; section 6.4, selecting items and `self`; section 6.7; new section 6.10; section 4.3; the header. | Opening is given exactly: initial state, defaults, effects in order, required slots, no guard on a nascent item, no two effects on one slot, revision 1 and one rise for each entry. `self` is a local reference inside a scope and the envelope's source in a message. A report takes the attribution of the commitment it reports on, so a former performer and holder are included. Eight forms that the R2 draft needs are listed with a proposed answer and are not part of the grammar until R2 is reviewed. A refused attempt releases nothing while an earlier send may arrive. R0 revision 3, with its inbox row, one namespace and the staged C2, is now the basis. |

# Corrections applied in revision 4

The planner read revision 3 at `4b7f77eb3955a9f81a1a502b561f20c86eb7dbc5`
in full against revision 2 and asked for four focused corrections in
`f4ed2dabe965675154216563ede2975e87082266`. The earlier changes are
kept.

| # | Correction asked | Where applied | What changed |
|---|---|---|---|
| 1 | Do not turn loss of the receiver into proof that a request never took effect. | Section 7.4, "When a request cannot be delivered"; sections 6.6, 7.5, 9.2, 9.3, 12; point R1-15. | Two findings replace the one outcome. `undelivered` is terminal and needs proof: the sender's attempt log, written before each attempt under the ledger rule, shows that every attempt was answered by a routing refusal and none went unanswered. `delivery-unavailable` is a diagnosis only: it stops retransmission and runs no clause; the item stays pending; correlation, duties, pins and fences stay; nothing that waited on the request is released and no substitute effect starts. The attempt count is a retry policy, never the proof. Two exchanges are given: applied with the result and then the storage lost, with its three recoveries; and never delivered with routing refused. A scope with such a finding blocks a reset. This agrees with R3's rule that a later attempt never settles an earlier unknown one. |
| 2 | Make the entry inputs and the replay table express what the prose requires. | Section 4.1, `Input` and `Message`; section 7.2; section 7.4; section 9.3. | A delivery of a request records `applied`, `refused` or `superseded`. A delivery of a result records the clause that ran, including `conflict`. A control and an advisory have their own shapes. A `diagnosis` input carries the request it is about and the attempt log. A result is admitted only when its `of` is an owned send, its source scope and incarnation are that request's target, and its source entry is the one that decided the request. A confirmation is admitted only from the creator named in the seed, in the entry that recorded this genesis's result, naming this genesis; anything else records nothing and activates nothing. What a provisional scope and a refused scope admit is stated. The replay table has a row for each kind. |
| 3 | Reconcile the founding children's cause in the replay rule; fix "Five entries". | Section 7.2, "The three kinds of cause"; section 9.3. | A cause is an intent digest, a message digest or a seed digest, by whether an act, a delivery or a genesis asked for the scope. Each case says what the child and a verifier check, and in each the proof is the send in the source entry. No signature is invented for a scope a genesis creates. The table has four entries and the sentence says four. |
| 4 | Complete same-transaction subject validation; reconcile section 6.10 with the R2 corrections. | Section 6.4, "No aliases"; section 6.10; points R1-13 and R1-14. | Subjects are resolved to local items in the commit before any guard or effect. Two names for one item are refused `alias`. Lawful atomic effects on several different items are unchanged. Section 6.10 now lists the twelve forms of R2 revision 2 as proposed, each with the replay rule it would owe, and says plainly that these forms do not make the application executable: redaction's proof and retention, the provenance of a selected report, named check attempts and the frozen source are named with their owners. R2's definitions exceed the proposed bounds, and the recommendation is to raise them. |

Also taken from the R3 draft at `43b68f5a`, as named dependencies and
not adoptions: a task scope kind; the grant as an observation; the
founding rule; a secret for checking read sessions; and the repository
receipt as a second write, which replaces this note's earlier "same
push" proposal.

# Corrections applied in revision 5

An independent reviewer read revision 4 at
`665e490bf474d44065ad6618dce4478c76306623` in full and asked for
changes in `d3b3b041`: one P1 finding, two P2 findings and one
bounded-read clarification, with a request to state a provisional
child's sends. The builder's three errata `0bcdeefc`, acknowledged by
the planner in `49728940`, were corrections of record for revision 4;
this revision carries them into the text. The earlier changes are kept
except where a row below says a statement is replaced.

| # | Finding | Where applied | What changed |
|---|---|---|---|
| P1 | A handler-created child's cause was the message digest alone, so two distinct deliveries with the same bytes derived one scope ID. | Section 2.1, domains, `DeliveryCause` and the seed rules; section 7.2, the table of causes and two witness tables; section 9.3, Genesis row; decision D1-1; point R1-16. | A sixth byte domain, `artroom-delivery-1`, over the delivery cause: the verified incoming source fact, the incoming send's ordinal and the message digest. An exact retransmission keeps its seed; a distinct delivery gets a distinct seed. The cause holds no hash or sequence number of the creating entry. Witnesses: two requests with identical bytes, and an exact retry. This replaces "a message digest" in revision 4's row 3 and "Five byte domains" in revision 2's row 1. |
| P2 | Two relate sends for one key in one owner entry had equal revisions, so arrival order decided the state. | Section 6.4, "One relate send for each key"; section 6.6, the `relate` form; section 7.3, wire meaning and both delivery orders; section 7.4, receiver check and the request table; section 9.3; point R1-17. | An entry whose sends resolve two `relate` sends to one key of target, owner item and name is refused `duplicate-relation`, including aliases through fields, slots or `self`. A receiver and a verifier refuse a source entry that has two. The revision stays the owner's `seq`. Out-of-order updates from distinct entries, exact result correlation and close and reopen deduplication are unchanged. The `relate` form now lists `item`, which section 7.3 already used. |
| P2 | The timed transition's own commit path was not specified: it could meet itself in the drain. | Section 5.2, rewritten; section 5.3, "What is due when the clock is behind"; section 7.5; section 9.3, Timed row; section 12. | One ordered drain for all writers: by deadline, then item ID, then rule name. The selected timed input checks its own item and deadline, the head and one clock reading in its transaction, and is the one exception to the stop, for itself only. Dropped selections, `busy`, a scope restart and a clock that is behind are each defined. No ordinary input commits ahead of a due expiry, and replay checks that. A proposed bound of 64 timed entries for one turn is added. |
| Clarification | A live-item maximum was used as if it bounded what a summary and a range guard read. | Section 6.3, "Live and retained items"; section 6.5, "What the range guards cover" and "Complete evaluation"; section 9.1; section 6.9; section 4.2; point R1-18. | Live and retained final items are defined. `max` bounds live items only. A range guard covers the states it lists, final ones included, and is evaluated completely from an index or a full paged scan, or not at all. A partial scan cannot establish `none` or a complete count; the answer is `guard-incomplete`. A summary lists live items and gives retained final items as exact counts; they are read by pages. The numeric bound on retained final items is owed to R4's proof plan. No number is set and no retained data is deleted. |
| Security note | A provisional child's permitted sends were not explicit. | Section 7.2, "What a provisional child sends"; section 2.2. | A provisional child dispatches its creation result and nothing else. Other duties of its genesis are held until the confirmation. It writes no timed entry. R3's fences must agree; that is a named dependency. |
| Erratum 1 | The Genesis replay row still stated one condition; no advisory row. | Section 9.3. | The Genesis row checks the cause by the kind of the source entry, with the delivery cause of P1. A row for the delivery of an advisory is added. |
| Erratum 2 | The two delivery exchanges used a creation and spoke of an incarnation it named. | Section 7.4, the two exchanges; section 7.2, "A repeated creation after the child's storage is lost"; section 2.2; section 12. | Both exchanges now use a `tell` to an existing scope by its full reference. The repeated creation is its own case in two parts, before and after the creator holds an applied result. A provisional scope also admits a repeat of its creation request, and a refused scope admits only that. |
| Erratum 3 | The attempt log's trust was not stated in full. | Section 7.4, "What the attempt log is trusted for" and "What a finding may not do"; section 6.6; section 9.3, Diagnosis row. | One dispatch for each recorded attempt; a refusal counts only from the resolver of the addressed name; an unrecorded completion is unanswered; a late result matches the original send. Replay reports the log as trusted and does not claim the remote did not execute. The release rule covers the affected operation only. |

Not resolved here, and stated as owed: the numeric bound on retained
final items and on one guard's work (R4); whether R3's ownership and
founding fences accept the provisional-send rule (R3). The cross-draft
dependencies on R2 and R3 are unchanged.

# Corrections applied in revision 6

An independent reviewer read revision 5 at
`1ebf4a76e53e85fa9cc0a051add607c94772d982` and asked for changes in
`e27f9b04`: two P2 findings and one clarification. The planner also
asked that five points which the sibling notes address to this note be
listed as open. The earlier changes are kept except where a row below
says a statement is replaced.

| # | Finding | Where applied | What changed |
|---|---|---|---|
| P2 | A dropped timed selection was charged to no counter, so a drain could repeat for ever with nothing written. | Section 5.2, steps 3 and 7, "A dropped selection", "When the budget is spent" and two witness tables; section 5.3; section 7.5; section 9.3; section 12; point R1-19. | Every selection of step 3 is one timed attempt, charged when it is selected, whether it writes, stops or is dropped. Turns started by an alarm have the same budget. A spent budget ends the turn with nothing new written: `busy` for an act, a retry for a delivery, no answer for an alarm. Committed timed entries are kept and due work stays due. Witnesses: the reviewer's clock sequence, and an alarm-only drain. This replaces revision 5's bound on timed entries written. The number 64 is a proposal owed to R4's proof plan. |
| P2 | A child genesis could open a timed item, whose deadline could pass before the confirmation; the rules then both required and forbade a timed entry. | Section 5.2, "timed item type"; section 6.4, "A genesis opens no timed item", "Time values set by a genesis" and the table of definitions; section 7.2, "What a provisional child sends"; section 9.3, Genesis row and the paragraph on a provisional scope; section 12; point R1-20. | A definition whose genesis act opens a timed item, or has a `hold` effect, is refused `genesis-timed` at validation, and replay checks the same. So no deadline exists before a scope is active, and the confirmation is never ahead of a due transition. A genesis time value is the genesis entry's time plus a duration and is not a deadline. Held duties are unchanged. R2 revision 6 was read: neither genesis, `file` nor `open`, opens a timed item. |
| Clarification | The text let a witness establish `some` or a `min` and also said an incomplete guard is not judged. | Section 6.5, "Complete evaluation" and its table; section 9.3; section 12; point R1-21. | A sufficient witness is a completed Boolean evaluation with the scan unfinished, for the results the table lists. An absence, an upper bound that holds and an exact count need complete evidence. This refines revision 5's "or not at all". |
| Sibling points | Five points addressed to this note were not listed. | Section 13, second table; section 7.5, the sends row; the header. | Listed with their source and not resolved: R2-13, what a `not-found` settlement carries and when absence is terminal, R2-15, staging and the cross-lane pin in preparation, and the register as the directory's confirmer. |

Not resolved here, and stated as owed: the number for the turn's budget
and the delay before a repeated alarm (R4); the five sibling points of
section 13. The admission-read inventory is unchanged.

## Revision 7

Revision 7 changes two passages and nothing else. Both are the nonblocking
editorial notes of the independent approval `b9485893` of revision 6 at
`667c3318`. The planner refiled the request as `4752a1bc`, so this revision is
filed under that request for a review on live bases.

| Note | What changed | Where |
|---|---|---|
| "A turn that ended busy wrote no entry" contradicted the rule that committed timed entries are kept | The sentence now says that no entry records a dropped selection or a `busy` outcome, and that timed entries committed before the turn ended are ordinary entries that replay checks | Section 9.3, last paragraph |
| The exact-budget boundary was not stated | Spending the last timed attempt does not end the turn by itself: step 3 runs again, the waiting input goes on if nothing is due, and the turn ends `busy` only if a transition is still due. A three-row boundary witness is added | Section 5.2, under "Restarts" |

The main note's opening paragraph still describes revisions 2 to 6 as before;
only its revision number changed. The admission read inventory is unchanged.

## Revision 8

Revision 8 is written for the planner's request `1e85696d`, on the
adopted base: revision 7 at `05244cfbcd2619c877cbcfcac5985b47651bb31a`,
adoption `0d1e179a`. It reconciles the contract with the lane design,
the authority design and the proof plan, and with the 78 deltas that
the I1 implementation recorded, eight findings of a static review of
I1's derivation source and four security details. Everything it adds or changes is a
proposal until this revision is independently reviewed and adopted.
The base is kept. Where a row below says a statement is replaced, the
note says so at that place too.

Inputs read, none of them adopted: R2 revision 12 at `03cb4ee5` (the
request names revision 11 at `0c7f8054`; revision 12 changed only its
section 17); R3 revision 9 at `8b8f946d`; R4 revision 7 at `80868139`
(the request names revision 6 at `5ad2e73c`); the I1 note
`2026-10-04-i1-contract-deltas.md` at `fc40b485`; the review report
`d3930ee8`; and the request `82edb034` with its source `0d72ada6`. The note's header says which
sections of each were read.

Corrected in revision 9 (request `687d6524`): "none of them adopted"
was not the status of those inputs. R2 revision 12, R3 revision 9 and
R4 revision 8 at `c3e699a6` are adopted bases, and the note's opening
now has the table. Revision 8 read R4 at revision 7, as this paragraph
says; revision 9 read R4 revision 8 as its opening states. What
revision 8 built on those inputs was, and is, a proposal.

### One row for each point

"A" is adopted, as a form or a rule of this note. "A, base" is adopted
by revision 7 and unchanged in substance. "E" is already expressible,
with the act of the companion file that shows it. "G" is an owned gap.

Every "A" that is not "A, base" is a disposition that the candidate
proposes. Revision 8 was not adopted, so none of them is in force.
Revision 9 keeps each as a proposal, pending its own review and
adoption. The four rows that revision 9 changes in substance are
listed under "Revision 9", below.

| Point | Disposition | Section |
|---|---|---|
| R1-1 Where a definition's bytes are retained | A, base | 9.2 |
| R1-2 Anchoring histories outside the service | G: R3, R4 | 15.1 |
| R1-3 Refused acts as entries | A, base | 4.2 |
| R1-4 The numeric bounds | G: R4 | 15.1 |
| R1-5 A guard over a foreign scope's present state | A | 16.3 |
| R1-6 Hold exclusivity across lanes | G: not designed; R2 shows the demonstration is safe | 15.1 |
| R1-7 A creation's confirm step | A, base | 7.2, 7.1 |
| R1-8 The evaluator profile | G: the builder's review in I1 | 15.1; `rules` in 6.1 |
| R1-9 The `notAfter` bound | G: R4 | 15.1 |
| R1-13 Bounds on a definition | A | 6.1 |
| R1-14 Aliased subjects | A, base | 6.4 |
| R1-15 Proof that a request was never received | A, base | 7.4 |
| R1-11 New items in one entry | A, base | 4.1, 6.11 |
| R1-12 A late lower relationship revision | A, base | 7.3 |
| R1-16 The cause of a scope that a handler creates | A, base, with a fourth row | 7.2 |
| R1-17 Two relationship updates of one key in one entry | A, base | 6.4, 6.6 |
| R1-18 The bound on retained final items | A, as a rule; the number is R4's | 17.1 |
| R1-10 One class for all scopes | A, base | 2.3 |
| R1-19 The budget of timed attempts | A, base; the number is R4's | 5.2 |
| R1-20 A timed item at genesis | A, base | 6.4 |
| R1-21 A sufficient witness with the scan unfinished | A, base, extended | 6.5 |
| Sibling: R2-13 sends from one entry | A | 7.5 |
| Sibling: the `not-found` settlement | A | 9.1 |
| Sibling: R2-15 addressing `pin-confirm` and `unpin` | A | 6.6 |
| Sibling: staging and the cross-lane pin in preparation | A | 5.5, 16.3 |
| Sibling: the register as the directory's confirmer | A | 7.1 |
| G1 Operand paths | A | 6.5 |
| G2 Detached text and redaction | A | 6.2, 6.6, 9.3 |
| G3 A conditional effect | A | 6.6 |
| G4 A send that names an earlier local entry | E: `fulfil` | 6.4 |
| G5 A count bound from a slot | A | 6.5 |
| G6 Every name in a list has an item | A | 6.5 |
| G7 From an acceptance to its report | A, with no `follow` option | 6.5 |
| G8 Guards and attribution over a list of facts | A | 6.5, 6.7 |
| G9 The author, or a wider grant | E: `edit-own`, `edit-any` | 6.5 |
| G10 A sealed plan and manifest completeness | A | 6.5 |
| G11 Who sent the message | A | 6.5 |
| G12 Comments as items | E: `comment` | 6.4 |
| G13 Attribution from inputs and an earlier version | A | 6.7 |
| G14 A list of pairs | A | 6.2 |
| G15 One `relate` for each item of a set | A | 6.6, 7.5 |
| G16 A send made only when its target is set | A | 6.6 |
| G17 A handler's effect on a capability's record | A | 6.11 |
| G18 Authors from a retained preparation input | A | 6.4, 16.3 |
| G19 The ancestry guard and its refusals | A; the walk is R3's | 6.11, 16.4 |
| O1 An outside write in preparation | A | 5.5 |
| O2 The pin entry | A | 5.5, 16.3 |
| O3 The pin's message forms | A | 6.11 |
| O4 Send limits | A | 7.5 |
| O5 The directory's confirmer | A | 7.1 |
| O6 A late answer to an attempt | A | 4.3 |
| O7 A second definition with holds | A | 6.8 |
| O8 The export license | A | 6.11, 16.3, 9.1 |
| O9 The ancestry guard | A | 6.11, 16.4, 9.3 |
| O10 The clock rules | A | 16.1, 9.1 |
| R2-13 The bound on sends from one entry | A | 7.5 |
| R2-14 Where a change's integration work is held | A | 6.8 |
| R2-15 How the pin's messages are addressed | A | 6.6 |
| R2-16 The pin's handler forms | A | 6.11 |
| R2-17 Further handlers of `issue` | E: seven and four are written | Companion file |
| R2-18 Work that no recorded fact names | A, as G19 | 6.11 |
| R2-19 Foreign entries of one `propose-manifest` | A: 128 | 7.5 |
| R2-20 A controller's verdict | E: `review-verdict` | 15.4 |
| R2-21 A slot set from `self` compared with a fact | A | 6.2 |

That is 64 rows and 62 distinct points, because R2-13 and R2-15 are
listed twice. By rows: 54 adopted, 5 expressible, 5 owned gaps. By
distinct points: 52, 5 and 5. Section 15.5 of the note also answers
twelve asks of R4, and section 15.6 the 78 deltas of I1: 50 accepted
as written, 9 accepted and extended, 2 accepted for I1 only, 1
accepted as temporary values, 15 changed and 1 superseded in the
deltas note itself. The coordinator's two decisions are applied: the
idempotency index is checked before `notAfter` (delta 10), and a
definition declares its rules in `rules` (deltas 30 and 44).

### Eight findings on the derivation source, and four security details

The independent static review `d3930ee8` of I1's derivation package
found eight defects. Each row is a rule that the contract now states.

| # | Finding | Rule stated | Section |
|---|---|---|---|
| 1 | Only one operand of an equality validated | Each operand is validated by itself | 6.5 |
| 2 | A copy ignored the destination's bounds | A slot never holds a value outside its type | 6.6 |
| 3 | A reference copy read the wrong kind of source slot | A copy preserves its source | 6.6 |
| 4 | Fact references deduplicated by hash before each was checked | A fact reference is verified whole | 6.5 |
| 5 | A timed effect could refuse and block the drain | A timed rule's effects are total; `timed-partial` | 6.4 |
| 6 | A final secondary subject could be changed | No effect changes an item that was final before the entry | 6.6 |
| 7 | Attribution lost a same-entry holder and a later principal | Attribution within an entry; a principal joins on later authority | 6.7 |
| 8 | Bounded queries scanned all retained items | The index is ordered; no bound on retained items | 6.5 |

The four security details of `82edb034` and `0d72ada6`: invitation
budgets and the shared rate table; member text at the agent and tool
boundary; a person's revocation and existing holds and credentials;
runner provenance and credential transport. Section 15.6b says what
this contract fixes for each, and names R3 with I3, I5, IA and R4 as
owners of the rest. Section 9.4 now states that a verifier needs an
expected scope ID and a known head or anchor.

### What changed in the note

| Subject | Where | What changed |
|---|---|---|
| Header, status and decisions | Opening; section 1 | Revision 8, its inputs and its status. Ten proposed decisions, D8-1 to D8-10. |
| Byte domains and kinds | Section 2.1 | Three domains, for a detached text, a snapshot of staged refs and a checkpoint's state. The scope kind `register`. `to: null` and `creator: null` are for a founding register only. This replaces "null only when founding a repository". |
| Entries | Section 4.1 | The `Effect` list. The inputs `preparation` and `settlement`. `presented` on an act. `Evidence`, `Reason`, `Prepared`. |
| Answers | Section 4.2 | The order of an act's checks, with the idempotency index before `notAfter`. Refusal reasons. |
| Outside effects | Section 4.3 | Operations, attempts, the late answer, selection, and when an operation is settled. |
| Dependencies | Section 5.1 | A sixth class: a retained judgment input. |
| Preparation | Section 5.5, new | An effect before an act only by a `preparation` entry of the owning scope. |
| Definitions | Sections 6.1 to 6.8 | `name`, `timed`, `rules`; the bounds; `record`, detached text, the local fact; `AlsoRule`, `presents`, `settles`, a handler's fields and `opens`, `TimedRule`; operands, parts and the list guards; `if` and `unless`, `redact`, the fan-out, `collect`; sources of `attribute`; the item form of `hold@1`. |
| The lane gaps | Section 6.10 | Rewritten as dispositions. Revision 7's list of twelve proposed forms is replaced. |
| Capabilities | Section 6.11, new | Records, guards, effects and steps, with what `hold@1` and `git-read@1` declare. |
| Founding | Section 7.1 | Rewritten: a register founds, and the directory is its child. Revision 7's order, with a directory that has no creator, is replaced. |
| Causes, copies, bounds | Sections 7.2, 7.3, 7.5 | A fourth cause. Bounded relationship copies. Sends by kind, at most 104; 128 foreign entries; no commit time limit. |
| Reads and retention | Sections 9.1, 9.2 | Settlement at a position and terminal absence; preparation status; a read that reads the clock. More retained inputs. |
| Replay | Sections 9.3 to 9.5 | Rows for preparation and settlement; a table of added checks; an exported source; fixed `trusts` labels and `redacted`. |
| Source map | Sections 11.6 to 11.8 | Section 11.8, new: what touches I1 and what each delivery first needs. |
| Examples, points, witnesses | Sections 12 to 14 | Ten recovery rows. The sibling table answered. Six new points, R1-22 to R1-27. Ten witness rows. |
| New sections | Sections 15 to 18 | Dispositions; retained judgment inputs; capacity accounting; a witness for each new form. |
| Companion | `lane-instantiations.md`, new | `issue` and `change` in these forms, with counts by script and nineteen notes on rows that differ from R2's or could not be written. |

The admission read inventory is unchanged.

### What remains owed

| Owed | To |
|---|---|
| Independent review of the whole revised note and of the companion file, and adoption before any source depends on it | A reviewer who did not write it; the planner |
| That the instantiated definitions are the ones meant; answers to notes N1 to N19 of the companion file | R2 |
| The rules behind each record, guard, effect and step of `hold@1` and `git-read@1`; the platform definitions, with the register and the task scope; each outside effect's evidence; the entry form of a credential request (R1-26); what a definition's name binds (R1-22) | R3 |
| Every number: the bounds of sections 6.1 and 7.5, the five budgets and the byte allowance, R4-B1 and R4-B2, the checkpoint interval (R1-23). What a full lane does next, and backpressure (R1-25) | R4 |
| The replay subject and its closure, and the answer for a malformed platform input, neither of which was read in R4 for this revision | This note's next revision, with R4 |
| Whether `restricted@1` gets an evaluator (R1-8) | The builder, in I1's review |
| Any delta that I1 records after `fc40b485` | This note's next revision |
| The operational assumptions H1, H2, H4, H5 and H6, and all measurements | R3 and R4 |
| The whole workspace, browser, device and demonstration experience | The owners R0 names |

Nothing was compiled, tested, installed, probed or deployed for this
revision. One script outside the repository rendered and counted the
companion file's tables from a data value.

## Revision 9

Revision 9 answers the independent review `bfe096fe` of revision 8 at
`a549aac6ef11a5a529c4e341443b1615eb72c069`, which requested changes,
and five requests of the planner: `a89dcea1`, `687d6524`, `9d55ac57`,
`873621d2` and `1f52493c`. It also disposes of what the I1 deltas note
added between `fc40b485` and `4b91a2e4`. The adopted base is still
revision 7 at `05244cfb`. Revision 8 was not adopted. Everything that
revisions 8 and 9 add or change is a proposal until revision 9 is
independently reviewed and adopted.

Section numbers are those of the main note. "Companion" is
`lane-instantiations.md`.

### One row for each input point

| # | Source | What was wrong | What changed | Where |
|---|---|---|---|---|
| 1 | Review `bfe096fe`, P2 1; planner `a89dcea1` | The fifth capacity dimension counted sends that transport had not acknowledged. Used was said to be derived from history, but an acknowledgment is in no entry and no retained input. With one advisory sent and a budget of one, an acknowledgment turned a refusal into an admission. | The dimension is "pending requests": requests with no recorded result and no `undelivered` diagnosis, from the history. A result, a control and an advisory are counted in their entry's bytes and in no dimension as sends. Transport backpressure is a limit on dispatch, outside both amounts. An acknowledgment is never a result and settles nothing outside. Pending requests, unknown outcomes and every settlement duty are kept. | Sections 5.1, 6.6, 7.4, 17.1, 17.3, 17.5; the capacity row of 9.3; witness 18.14; point R1-31; companion, reservations table |
| 2 | Review `bfe096fe`, P2 2; planner `873621d2`, point 1 | A byte reservation covered the settling entry's own bytes, with the entry size as a stand-in. It did not cover the inputs that the entry newly retains. A handler that checks 32 foreign entries writes a small entry and retains about 2 MiB. | A byte reservation is the entry's own bytes, the inputs it may newly retain, and the duties it starts. A table gives each kind of retained input, the key it is kept under and counted once by, the bound on one, and who states that bound. A second table gives how many of each a form may retain. Nothing shared is assumed. Bytes that exist before the entry that names them are either the turn's working memory or inside a pending duty's reservation. No number is proposed. | Sections 17.1 and 17.2; the second table of 17.4; 9.2; points R1-28 and R1-32; companion, reservations table, last column |
| 3 | Review `bfe096fe`, P2 3; planner `9d55ac57`, first | The `closes` handler assigned the verified source entry, an entry under `change`, to `intent.closedBy`, a slot for entries under `issue`. A normal published update could not apply the closure. | `closedBy` is set from `self`: the issue's own deciding entry, of kind `closes`. The consumed fact is that entry's `from`, retained in its `uses`. The generic check is kept and made explicit: the validator refuses a copy of `{ source: "ref" }` into a slot with another `under`. Publication, closure and the requester's judgment stay three things. The difference from R2's sentence is note N20. | Section 6.6; witness 18.17; companion, `closes` handler and N20; point R1-29 |
| 4 | Review `bfe096fe`, P2 4; planner `9d55ac57`, second | A `merge` entry's statement carried each job's opening fact, name and state, and no entry that decided it. `check` and `check-error` linked nothing to the job. | A timed entry has a kind, `timed:` and its rule's key. `job` has a reference `decidedBy`. `check` and `check-error` set it from `self` when they decide the job; `job-deadline` sets it from `self`. `merge` collects it. A `requested` job has none, a `timed-out` job names its timed entry, a decided job names its first answer, and a superseded job is not listed and keeps its own. `collect` sends a local reference as a fact reference and leaves an empty member out. | Sections 6.2, 6.4, 6.6, 6.10; witness 18.16; companion, `job`, `check`, `check-error`, `job-deadline`, `merge`, N21; point R1-30 |
| 5 | Planner `873621d2`, point 2; review `bfe096fe`, clarification | A handler of class `advisory` could declare sends and attention, while section 7.5 counted none for the delivery of an advisory. | Such a handler declares no sends and no attention. The validator refuses a definition in which one does, as `advisory-sends`, so nothing declared is dropped. The inbox and the directory record a notice or a row by their handler's own effects. | Sections 6.4, 6.6, 7.4, 7.5; the advisory row of 9.3; witness 18.15; delta 64 in 15.6 |
| 6 | Review `bfe096fe`, clarification | "The list forms over fields are always completed" was true of the enumeration only. | The enumeration of an `each` or a `has` is always complete. The form is not completed when a nested guard that it needs is not. | Section 6.5, "Three results" |
| 7 | Review `bfe096fe`, clarification | Two list changes of one party list were listed with the cases in which at most one effect applies. | Two rules: conditions that exclude each other, where at most one applies; and successive changes of one party list, which both apply in the order written. | Section 6.6; delta 33 in 15.6 |
| 8 | Planner `687d6524` | The opening called the R0 base filed and not reviewed, and the R2, R3 and R4 inputs not adopted. It named the first commission as the request. The matrix named R4 revision 7. "Adopted" in the matrix could be read as adoption. | The opening names the current commission `4752a1bc` and follow-through `1e85696d`, and marks the first commission and old invitations as history. A table gives each note's adopted base and adoption. It says what adoption of a base does not adopt. It says how to read "draft", "proposes" and "adopted" in the text below. | The opening; section 13; section 15, first paragraph; this file, two notes in the revision 8 section |
| 9 | Planner `687d6524`, on R4 | The candidate had read R4 revision 7. The adopted base is revision 8, with a changed key L7 and row F30. Two asks of R4 were left as not read. | R4 revision 8 was read as the opening lists: section 9.5 and the catalogue in full, sections 8.6 and 13, the row F30 and every changed line of the main note. The replay subject and the two kinds of failure are answered. Section 16.4 states the own ancestor with no prior check, and that a carried commit comes from the earlier record. What was not read is listed, with its owner. R0 revision 4 was not read; that is stated. | The opening; sections 4.2, 9.5, 15.5, 16.4 |
| 10 | Planner `1f52493c` | A bound on entries with a reserve of one fixed size does not let every admitted duty settle: three holds, twelve entries, a reserve of two, and the third hold's end cannot be written. The section did not say that reserved capacity is derived in the commit, or what a static rule must guarantee. | Both amounts are derived from the folded state inside the commit. A settling entry is admitted against its own reservation. Section 17.3a says why a high-water mark is not the rule, and gives six conditions for a static rule as a temporary step. The planner's case is a witness table, under both rules. | Sections 17.1, 17.3, 17.3a; the third table of 17.4; 9.2; witness 18.9; 11.8; delta 81 in 15.6c |
| 11 | The I1 deltas note at `4b91a2e4`, section 14 | Entries 79 to 95 had no disposition. | One row each: 5 accepted as written, 3 accepted and stated, 1 accepted with a condition, 3 accepted for I1 only, 1 accepted as a temporary value, 1 accepted in one part with one part open, 3 changed, 1 of them in one part. Rules stated for them: what "one input at a time" covers; the pinned definition; a prepared result that does not fit; the foreign-entry bound before any fetch. | Section 15.6c; sections 4.2, 5.2, 6.1, 6.5, 11.6; point R1-33 |
| 12 | The I1 deltas note at `4b91a2e4`, sections 11 to 13 | The eleven repairs, and the decisions listed for review, had no disposition. | One row each: 4 accepted as written, 4 accepted and stated, 1 accepted for I1 only, 2 changed in one part. Rules stated for them: what an entry that records a refusal or a clause retains; what "applied" means for the rule on final items; the bound on a time offset, and no time from the commit clock in a timed rule; a clause brings no principal. `fact-mismatch` and `hold: end` alone stay as revision 8 has them. | Section 15.6d; sections 6.4, 6.5, 6.6, 6.7 |

The review's note on attribution sources asks for nothing: section 6.7
already says that a missing source adds nothing.

### Rows of the revision 8 matrix that change

| Point | Revision 8 | Revision 9 |
|---|---|---|
| R4's ask: the replay subject and its closure | G: this note's next revision | A, proposed: section 9.5 |
| R4's ask: a malformed input built by the platform | G: this note's next revision | A, proposed: section 4.2 |
| I1 delta 64, an advisory | Accepted | Accepted, and restricted: section 6.4 |
| I1 delta 33, two effects on one slot | Changed: three exceptions | Changed: two rules of different kinds, section 6.6 |

The 64 rows and 62 distinct points of sections 15.1 to 15.4 are
unchanged: 54, 5 and 5 by rows. Over I1's first 78 entries the counts
are now 49 accepted as written, 9 accepted and extended, 1 accepted
and restricted, 2 accepted for I1 only, 1 accepted as temporary
values, 15 changed and 1 superseded.

### What changed in the files

| File | What changed |
|---|---|
| The main note | The opening. Sections 4.2, 5.1, 5.2, 6.1, 6.2, 6.4 to 6.7, 6.10, 7.4, 7.5, 9.2, 9.3, 9.5, 11.6, 11.8, 12, 13, 14, 15, 16.4. Section 17 is rewritten, with a new section 17.3a. Section 18 has four more witnesses, 18.14 to 18.17, and 18.9 names three tables. Sections 15.6c and 15.6d are new. Six open points, R1-28 to R1-33. |
| `lane-instantiations.md` | Six rows of the definition tables, by hand; the reservations table; notes N11 and N17; new notes N20 and N21; its status lines. The script of revision 8 was not run again, and the file says so. |
| `corrections.md` | Two notes in the revision 8 section, and this section. |
| `admission-read-inventory.md` | Unchanged. |

### What remains owed

| Owed | To |
|---|---|
| Independent review of revision 9 and of the companion file, and adoption before any source depends on it | A reviewer who did not write it; the planner |
| Whether `closedBy` names the issue's own deciding entry (R1-29); the job's `decidedBy` (R1-30); answers to notes N1 to N21 of the companion file | R2 |
| What the destination checks of the entry that decided a job (R1-30); the byte bound of each input that a capability or a platform definition retains under a digest (R1-28); the reservations of the platform definitions; everything that revision 8 listed for R3 | R3 |
| Every number, with the bound on each retained input; the bound on pending requests; transport backpressure (R1-31); the size of an attempt log (R1-32); everything that revision 8 listed for R4 | R4 |
| A sound reservation for every admitted duty in source, or a static rule inside section 17.3a's six conditions as a temporary step; the three refusals that I1 names otherwise; I1's stated omissions | The builder, in I1 |
| The definition name of a fetched entry as a retained input (R1-33) | This note's next revision, with R3 |
| R0 revision 4 against the step and variant numbers used here; the parts of R4 revision 8 that the opening lists as not read; any delta that I1 records after `4b91a2e4` | This note's next revision |
| Whether `restricted@1` gets an evaluator (R1-8); the operational assumptions H1, H2, H4, H5 and H6 and all measurements; the whole workspace, browser, device and demonstration experience | As revision 8 lists them |

Nothing was compiled, tested, installed, probed or deployed for this
revision. The companion file's changed rows were edited by hand. A few
lines of script outside the repository added up the made-up numbers of
section 17.4 and counted table rows.

## Revision 10

Revision 10 answers the independent review `114e2cc5` of revision 9 at
`ba556e963b45793001e590fb5a7d0c4ba40669d8`, which requested changes,
and the planner's capacity follow-through `cc570904`. It also disposes
of what the I1 deltas note added between `4b91a2e4` and `d9bcfb33`.
The adopted base is still revision 7 at `05244cfb`. Revisions 8 and 9
were not adopted. Everything that revisions 8, 9 and 10 add or change
is a proposal until revision 10 is independently reviewed and adopted.

Section numbers are those of the main note. "Companion" is
`lane-instantiations.md`.

### One row for each input point

| # | Source | What was wrong, or asked | What changed | Where |
|---|---|---|---|---|
| 1 | Review `114e2cc5`, first P2 | One sentence said that inputs fetched before a turn are discarded, with nothing charged, whenever the input is refused. Section 6.5 requires a written refusal to keep what it read. The companion's `unpin` handler reads a manifest and can then refuse `not-the-owner`. | Fetched inputs are discarded only when the turn writes no entry: a refused act, an input that is not judged, or new work that does not fit. Every written entry keeps what it names, and is charged in its own transaction by its kind. An entry that records a refusal ends no duty, so it is new work, and it does not draw on a reservation that a pending duty still needs. It draws on one only where the duty's owner declares that. | Section 17.2, the table of bytes that exist before their entry; section 17.3, "An entry that records a refusal"; sections 6.5 and 7.4; step 3 of the second witness of 17.4; witness 18.18; companion, the third note under the reservations table |
| 2 | Review `114e2cc5`, second P2 | The temporary static rule reserved the sum of `max` over the timed item types, plus one. One item with two rules, A then B then a final state, needs two timed entries and the closing checkpoint: three, where the formula gave two. | The reserve is, for each timed item type, `max` times the longest chain of its timed rules, plus one, with the bytes of those entries. A chain is defined, and rules that lead to one another in a cycle refuse the definition `reserve-unbounded`. The review's case is the witness, under both formulas. The per-duty rule says the same: a deadline reserves its chain. | Section 17.2, "A chain of timed rules" and row 2; section 17.3a, condition 2, "The rule for a definition with timed rules only" and its witness; section 6.4; companion, the first note under the reservations table |
| 3 | Review `114e2cc5`, its other notes | Use the existing distinction of an entry that is not written, and one finite closure, in place of a second refusal or a second kind of timer. The joint duties R1-28, R1-30 and R1-33 stay open with their owners. | Both corrections use the existing kinds of section 17.3 and the existing refusal `reserve-unbounded`. No form is added. R1-28, R1-30 and R1-33 are unchanged and stay open. | Sections 17.2 and 17.3; section 13 |
| 4 | Planner `cc570904`, first seam | "One checkpoint" was reserved, and nothing said which checkpoint uses the reservation or what follows. A count that owes one checkpoint always, and lets every checkpoint use it, leaves no room for a closing checkpoint after founding, hold, checkpoint and expiry in six entries. | The closing checkpoint reserves 1 entry and the bytes of one checkpoint entry, once for the scope. It is pending from the genesis on, except while the head is a checkpoint and no other duty is pending. Only a checkpoint that is written when no other duty is pending uses it. A checkpoint beside another pending duty is new work. The next entry that is not a checkpoint arms it again, by the admission check. All of it is derived from the head and the pending duties. | Section 17.2, row 8 and "The closing checkpoint"; section 17.3; section 9.1; the fourth witness of 17.4; delta row 5 of 15.6f; companion, the last row of the reservations table |
| 5 | Planner `cc570904`, second seam | A result's clause can set a timer again after `delivery-unavailable` and a late result. A request reserved its two entries and nothing for the duty that its clause starts. An eight-entry trace uses the room before the third timed entry. | The rule is coverage: a request reserves its 2 entries and the largest closure of the duties that one of its clauses can create. Each request reserves that for itself. The named refusal is `reserve-unbounded`, for a closure that is not finite. A runtime that reserves less refuses, as `unsupported-definition`, to found or create a scope under a definition whose clause can create a duty. A `conflict` result and a second diagnosis are new work. | Section 17.2, row 1 and "A request's clauses"; section 6.1; the fifth witness of 17.4; delta row 3 of 15.6f; companion, the second row of the reservations table and the second note under it |
| 6 | The I1 deltas note at `d9bcfb33`, section 17 | Entries 96 to 114 had no disposition. | One row each: 2 accepted as written, 7 accepted and stated, 1 accepted and stated with one part open, 1 accepted with a condition, 1 accepted as temporary values, 3 accepted for I1 only, 1 accepted in one part with one part open, 3 changed. Rules stated for them: the address in an envelope; transport's four answers; the resolver; the read of the source entry; which sends a sender gives up; a clause fetches nothing; an empty store mints nothing. Changed: `under` is compared with a definition's name (100); a child's definition comes from its creator (101); an attempt log must fit its diagnosis (114). | Section 15.6e; sections 2.2, 4.1, 6.1, 6.6, 7.2, 7.4, 7.5, 11.6, 11.8; points R1-34 and R1-36 |
| 7 | The task's named decision, on I1 delta 101 | Where a new child's declaration comes from was not stated. I1 asks a port that a deployment does not supply. | A child reads the bytes of its declared definition from its creator, by digest, before its genesis turn, as an immutable input. It checks them against the digest, validates and retains them. The creator retains the bytes of each definition that its creations name. A creation under a definition that does not validate is refused `unsupported-definition` at the creator. A read that fails decides nothing and is retried. | Section 7.2, "Where the child's definition comes from"; sections 4.2, 5.2, 9.2, 9.5, 17.1 and 17.2; witness 18.19; point R1-35 |
| 8 | The I1 deltas note at `d9bcfb33`, sections 15 and 16, with the corrected entries 81 and 94 | The three repairs of the runtime and the two of the rule evaluator had no disposition. Entries 81 and 94 had changed under their rows. | Eleven rows: 1 accepted as written, 2 accepted and stated, 4 accepted for I1 only, 2 changed in one part, 1 changed, 1 recorded as limits. Rules stated for them: a timed entry always fits; an accepted key is answered before any fetch. The rows of entries 81 and 94 follow the corrected entries, and keep their kinds. | Sections 15.6c and 15.6f; sections 5.2, 6.4 and 17.3a |
| 9 | The I1 deltas note at `d9bcfb33`, section 12, the paragraph added after event `fb6f8e03`, which the planner's follow-through asks to carry | A refused genesis that had read a fact before the field that refused it recorded the source entry only. | It is the rule of section 6.5 that a written refusal keeps what was read, and I1 repaired it. The row of that repair names the branch. | Section 6.5; the ninth row of 15.6d |

### Rows of the revision 9 matrix that change

| Point | Revision 9 | Revision 10 |
|---|---|---|
| I1 delta 47, the address of a delivery | Accepted; the `Envelope` view unchanged | Accepted; the view carries the send's `to` (section 4.1) |
| I1 delta 81, the scope's budget | Changed; a high-water mark | Changed; the row follows the corrected entry, and section 15.6f has the parts |
| I1 delta 94, the inputs of the step | Accepted for I1; deliveries and diagnoses omitted | Accepted for I1; only outcomes are omitted |
| What a result clause may newly retain | One foreign entry for each fact that its effects read | None: a clause reads what the origin entry retained (sections 6.6 and 17.2) |

The counts over I1's first 78 entries, over entries 79 to 95, and over
the eleven repairs of section 15.6d are unchanged. The I1 note now has
114 entries, and each has one row: 78, 17 and 19.

### What changed in the files

| File | What changed |
|---|---|
| The main note | The opening. Sections 2.2, 4.1, 4.2, 5.2, 6.1, 6.4, 6.5, 6.6, 7.2, 7.4, 7.5, 9.1, 9.2, 9.5, 11.6, 11.8, 12, 13, 14, 15, 15.6, 15.6c, 15.6d and 15.8. In section 17: the opening, 17.1, 17.2, 17.3, 17.3a, 17.4 and 17.5. In section 18: the heading and 18.9. New: sections 15.6e and 15.6f; the fourth and fifth witnesses of 17.4; witnesses 18.18 and 18.19; three open points, R1-34 to R1-36. |
| `lane-instantiations.md` | Its status lines; a paragraph on what revision 10 changed; in the reservations table, the first row, a row for the `create` of `add-concern` and a row for the closing checkpoint; three notes under that table. No row of a definition table. |
| `corrections.md` | This section. |
| `admission-read-inventory.md` | Unchanged. |

### What remains owed

| Owed | To |
|---|---|
| Independent review of revision 10 and of the companion file, and adoption before any source depends on it | A reviewer who did not write it; the planner |
| A sound reservation for every admitted duty in source: every dimension, the closure of each duty, and the closing checkpoint. Until then, a refusal to found or create a scope under a definition that the count does not cover. A refusal of timed rules that lead to one another in a cycle. A child's definition read from its creator. The three refusals that I1 names otherwise. I1's stated omissions | The builder, in I1 |
| The bound on one member's handle; where a creator reads a declared definition that is not its own (R1-35); what starts retransmission again after `delivery-unavailable`, and who notices an acknowledged request with no result (R1-36); whether a refused request uses up an entry that a capability record reserved; everything that revisions 8 and 9 listed for R3 | R3 |
| Every number, now with the retry policy of section 7.4 and the size of one checkpoint entry; the size of an attempt log (R1-32); whether a budget may change under a scope that exists; everything that revisions 8 and 9 listed for R4 | R4 |
| A delivery whose entry would pass the entry size (R1-34); the definition name of a fetched entry (R1-33); R0 revision 4 against the step and variant numbers used here; the parts of R4 revision 8 that the opening lists as not read; any delta that I1 records after `d9bcfb33` | This note's next revision, with R3 and R4 |
| Answers to notes N1 to N21 of the companion file, with R1-29 and R1-30 | R2 |
| Whether `restricted@1` gets an evaluator (R1-8), with a review of its list of names when the engine changes; the operational assumptions H1, H2, H4, H5 and H6 and all measurements; the whole workspace, browser, device and demonstration experience | As revisions 8 and 9 list them |

Nothing was compiled, tested, installed, probed or deployed for this
revision. No source of I1 was read, and neither was the static review
`41484d04`: its two seams are as the planner's follow-through reports
them. The companion file's reservations table was edited by hand. A
few lines of script outside the repository added up the made-up
numbers of sections 17.3a, 17.4 and 18.18 and counted table rows.

## Revision 11

Revision 11 is the successor of revision 10 at
`f52573e7908a9a63755071b9dcb668240b0ffdae`. Revision 10 was reviewed,
approved (`98b470c3`) and adopted (`85c18b66`), and it is the contract
in force. Revision 11 is written for the planner's request `108ea663`.
It keeps the whole of revision 10. Everything that it adds or changes
is a proposal until revision 11 is independently reviewed and adopted.
The adoption act is as the planner gives it, and the approval is as
the authority note's revision 12 names it. This revision checked
neither.

The sections "Revision 8", "Revision 9" and "Revision 10" above say
that the adopted base was revision 7, and that what they added was
proposed. That was so when each was written. The adoption of revision
10 decided what those three revisions proposed. The sections are
history, and they are not changed.

Section numbers are those of the main note. "Companion" is
`lane-instantiations.md`. The authority note in force is its revision
13 at `2709006c`, adopted by `d7acffc9`. This revision read its
revision 12 at `80f390fc`, which was then a candidate in review. The
section "Revision 11, refiled" below says what differs.

### The input snapshot

| Input | Read at | Covered |
|---|---|---|
| The I1 implementation's choices | The deltas note at `97518f68`, the source delivery that was filed for review | Entries 115 to 152, with every correction of an earlier entry that the note makes after `d9bcfb33`. Entries 1 to 114 keep the dispositions of revision 10. |
| The I1 delivery note | `97518f68` | In full. Its sections 5 to 7 have rows below. |
| I1's source | `97518f68`, read and not run | Only where an entry's wording was unclear. The main note's opening lists the files. It is not a review of the source. |
| R3, the authority note | Revision 12 at `80f390fc`. When it was read it was a candidate in review, and the adopted base was revision 9. | What it asks of this contract in its section 13.4, and its gaps G15 to G18, with the passages that those rest on. The main note's opening lists them. |
| R3, the authority note, as adopted | Revision 13 at `2709006c`, adopted by `d7acffc9`. Compared with revision 12 at the refiling. | The two sentences that differ. The section "Revision 11, refiled" below names them. |
| The review `74b21dc8` of R3's revision 10 | As the planner supplied it | In full. |
| R4, the proof plan | Revision 8 at `c3e699a6`, adopted | The keys and rows that this revision's changes touch. |
| R2, lane forms | Revision 12 at `03cb4ee5`, adopted | Not read again. Its revision 13 is in preparation and was not available. |
| R0, the demo contract | Revision 4 at `3b6e1ad7`, adopted | Not read. Still owed. |

Not covered, because it arrived after the snapshot or was not
available: entries 153 to 155 of the I1 deltas note, which its working
copy held when this revision was written; any source change after
`97518f68`; R3's revision 13, which its working copy had begun, and
which the refiling compared with revision 12 after it was adopted
("Revision 11, refiled", below); and R2's revision 13.

### One row for each I1 entry, 115 to 152

Entries with one disposition and one subject share a row. Section
15.6g has one row for each entry.

| Entries | Disposition | What the contract says now, or what changes | Where |
|---|---|---|---|
| 115, 117 | Accepted, and stated | A scope retains its definition's whole named closure from its genesis, and a child reads it from its creator, by digest. That replaces revision 10's rule for a declared definition, that a creator retains a named definition with the first entry that names it. A read that fails decides nothing: `retry`, with `dependency-unavailable` or `unsupported-definition`, and never a routing refusal. | 7.2, 7.4, 9.2, 17.1; witness 18.19 |
| 116 | Changed in one part | Accepted for I1: the declarations travel beside a signed founding. Changed: a founding that lacks a named declaration is not written, and is answered `dependency-unavailable`. A creation that nothing can supply is a duty that can never settle. | 7.2 |
| 118 | Changed in one part | A bound on a named closure is adopted as a structure, and 16 is accepted as a temporary value. Changed: each retained declaration is inside the bound on a definition's bytes. | 6.1; point R1-37 |
| 119, 120, 121, 122, 125 | Accepted, and stated | The verifier's two reads; a known head, exactly; what integrity mode checks; how a judgment is derived again; the result for each kind of failure. | 9.1, 9.3, 9.4, 9.5; witness 18.24 |
| 123 | Accepted | Revision 8 had it: a rule's digest and its result are both compared. | 6.5 |
| 124 | Changed in one part | What an anchor covers is as implemented. Changed: the definition name of a fetched entry is inside the using entry, as `under` of its `FactUse`, and it is the definition's stated name. | 4.1, 9.3, 9.4; point R1-33 |
| 126, 147 | Accepted as temporary values | A verifier's four limits, its bounds on one read and its deadline for one read. The structure is stated. A target that cannot be read gives no report. | 9.4 |
| 127, 128, 129 | Accepted for I1 only | Stated omissions of I1's replay: the fact that issued a grant, an outcome's evidence, the capacity amounts, a start at a checkpoint, a sealed segment. The `Report` type does not change. | 9.3, 9.5 |
| 130 | Changed in one part | The values of the reads are accepted as I1's shapes, until R2's pages use them. Changed: settlement's result type is `Settlement`. | 9.6; point R1-41 |
| 131, 132, 139, 150 | Accepted for I1 only | A client's default lifetime; what a signer is; the transport's own refusal of a path; which versions of its runtime run the replay command. No rule of this contract. | 9.6 |
| 133, 134, 136, 138, 143, 144, 152 | Accepted, and stated | A reply is an answer only when it is a value of its operation's result type, to the depth of the contract's types. No answer shows nothing. A receipt is followed against its whole fact reference. The body is the answer. A request body is bounded in bytes. | 9.1, 9.6; witness 18.22 |
| 135 | Accepted | A client reads a definition as a retained input, and checks its digest. | 9.1, 9.6 |
| 137 | Accepted with a condition | A copied party list is counted at every member that it can hold. The condition: the fold enforces the bound that the validator counted. | 6.4 |
| 140 | Accepted | The closing checkpoint, as revision 10 has it. | 17.2 |
| 141, 142 | Accepted, and stated | A runtime may reserve more than a duty's closure, and never less, with what "never less" means for a request. An item that holds two deadlines reserves the longer chain. | 17.2; witness 18.23 |
| 145 | Accepted, and stated | A signer signs bytes that are already fixed. | 2.1 |
| 146, 148, 149 | Accepted, and stated | Every reply is untrusted, and limits count raw bytes as they arrive. A bound is on what a read takes in. No entry is larger than the entry size of the bounds that a replay was given. | 9.1, 9.3, 9.4 |
| 151 | Accepted | No rule changes. The counts in I1's witness are no budget. | 6.1 |

Counts, over the 38: 4 accepted as written; 20 accepted and stated; 7
accepted for I1 only; 2 accepted as temporary values; 1 accepted with
a condition; 4 changed in one part. None is rejected whole, and none
is deferred.

The deltas note also corrects earlier entries after `d9bcfb33`: entry
101, five parts of the repair "Room to settle", and the repair "A
timed entry always fits". Section 15.6h has a row for each. In each,
the source now follows what revision 10 changed, for entries.

### One row for each ask of the authority note

Read from the authority note's revision 12, section 13.4, and its
gaps G15 to G18. Its revision 13, which is adopted, asks the same.

| # | Ask | Disposition | What changed | Where |
|---|---|---|---|---|
| 1 | The unit of the bound on a member's handle | Adopted | The unit is the bytes of the handle's UTF-8 form. The static bound on a timed entry counts the canonical form, which may be longer. No number is adopted. | 6.4 |
| 2 | The form of a receiver pin's `decided` value, and whether a refused deciding entry may hold that one `record` effect (G15). The first repair of the review `74b21dc8`. | Adopted | A count of decisions, as a form for any capability record: the request, the bound, the count and the binding. `decided` is a value of `receiver-pin`. The deciding entry of a bound request is a settling entry whatever it decides, and holds one `record` effect that moves the count. The five conditions that a declaration must meet. The declaration is R3's, stated in the authority note's adopted revision 13. | 6.11, 7.4, 9.3, 17.2 row 6, 17.3; witness 18.20; companion, the reservations table |
| 3 | The wording of the companion's note N21. The second repair of `74b21dc8`. | Adopted | A later answer is history only on a job that is `passed`, `failed`, `errored` or `superseded`. The first authentic answer on a `timed-out` job that no retry superseded decides it. No row of a definition changed. | Companion, N21 |
| 4 | Dispositions for the I1 choices after entry 114 (G18) | Adopted | The table above. | 15.6g, 15.6h |
| 5 | Where a creator reads a declared definition that is not its own (R1-35; G16) | Adopted in one part | Decided for a declared definition. A platform scope that takes a name from an input stays R3's. | 7.2 |
| 6 | What starts retransmission again, and who notices an acknowledged request with no result (R1-36; G17) | Adopted in one part | A new dispatch is bookkeeping and no entry. No second diagnosis is written. The recorded act that revision 10 recommended is withdrawn. The operator's procedure, and who is told, stay with R3 and the installation design. | 7.4, 17.2; witness 18.21 |
| 7 | The two incident answers on a pin | Adopted | Refusals of the guard `pin`: `no-pin`, and the new `never-admitted`. | 6.11; companion, N22 |
| 8 | A byte domain for a check's configuration | Expressible | The owner of a retained value declares its domain. | 2.1 |
| 9 | The retained input for a definition's name (G7; R1-33) | Adopted in one part | The name is inside the using entry. That the definition was activated stays R3's. | 4.1, 9.3 |
| 10 | O13: whether a retry rule may read the free budget (G3) | Adopted in one part | It may not: the budget decides only whether new work is written. What opens a further attempt is open. | 17.3; point R1-40 |
| 11 | O11: an effect that a read decides (G1) | Owned gap | Not decided. Section 4.3 stands. | Point R1-38 |
| 12 | O12: a token whose end time has passed (G2) | Owned gap | Not decided. | Point R1-39 |
| 13 | A reason that carries more than one value with `ended` (G8) | Owned gap | `Reason` is unchanged. A mapping onto the `publication` update is recommended. | 15.3a; point R1-27 |
| 14 | A reservation that would use more foreign entries than the bound (G5) | Owned gap | Not decided. | Point R1-34 |

Counts, over the 14: 5 adopted; 1 expressible; 4 adopted in one part
with an owned gap in one part; 4 owned gaps. R3's second declaration,
a publication's one `withdraw`, asks nothing of this contract's forms.
The five conditions of section 17.3 are what it has to meet.

### One row for each shortfall of the I1 delivery note

The planner asked this contract to speak to five. Section 15.6h has
the other rows of the delivery note's sections 5 to 7.

| Shortfall | Decision | Where |
|---|---|---|
| A `conflict` result waits for a free entry, and draws on no reservation | That is the rule. A creation request reserves for its clauses `applied`, `refused`, `superseded` and `undelivered`, and not for `conflict`: a `conflict` is not a way in which the request settles; nothing bounds how many may come; and a reservation for one would never be released. | 17.2 |
| Retransmission does not resume after a `delivery-unavailable` diagnosis | It need not. The request is settled only by its result. It may be sent again at any time, by a retry policy or by an operator's instruction, as a dispatch that is bookkeeping and no entry. No input of section 4.1 resumes it. | 7.4; witness 18.21 |
| The reserve for a request is one maximum for the definition | A runtime may reserve more, and never less. "Never less" is stated for a request: at every head at which it is pending, and in every dimension that the runtime counts, at least its own two entries, or one after the diagnosis, and the largest closure of a clause of its own send form. | 17.2, 17.3; witness 18.23 |
| Preparation runs outside the turn's queue | Revision 9 had the rule. Revision 11 adds what it promises and what it does not: the exclusion is of steps 3, 4 and 6; the history is the order of commits; an input holds nothing between its snapshot and its commit; an input that is passed too often is answered `busy`. | 5.2 |
| The `where` index on item slots is written and not read | Three kinds of evidence complete a guard with a `where`: every page read in the commit; an index that meets four conditions; a witness. An index that is not read makes no judgment wrong. | 6.5; witness 18.2 |

### Rows of the revision 10 matrix that change

| Point | Revision 10 | Revision 11 |
|---|---|---|
| The status of the contract | Revision 7 in force; revisions 8 to 10 proposed | Revision 10 adopted and in force; revision 11 proposed |
| A creator's named definition | Retained by the first entry that names it. Where that entry reads the bytes was open. | A declared definition's whole named closure, at the genesis, from the creator. The first-entry rule stays only for a platform scope that takes a name from an input. |
| `unsupported-definition` | The answer to an input that would send a creation under bytes that do not validate | For a declared definition, found at the genesis. Also a `retry` reason of transport. |
| A refused deciding entry | No effect | One `record` effect, where a count of decisions binds the request |
| Whether a refused request uses a reserved entry | R3's to declare, with no stated limits | The five conditions, and the form of section 6.11 |
| Row 2 of section 17.2 | A chain for each deadline | The longer chain, for an item that holds two deadlines |
| Row 6 of section 17.2, a `receiver-pin` | 1 entry for each license request that may still come, and 1 for `export-settled` | 1 entry for each number above `decided`. `export-settled` is reserved once, by the `export` item. |
| After `delivery-unavailable` (R1-36) | An operator's recorded act, which is new work and reserves a further diagnosis | A dispatch that is bookkeeping. No second diagnosis is written. |
| The definition name of a fetched entry (R1-33) | Open. Kept beside the retained copy. | Inside the using entry, as `under` of its `FactUse` |
| Where a creator reads a definition (R1-35) | Open, with R3 | Decided for a declared definition |
| The refusals of the guard `pin` | `no-pin`, `pin-mismatch` | Also `never-admitted` |
| The checks of replay on every entry | Three | Four: the entry size of the bounds given |
| The `trusts` labels | Eight | Ten: `bounds` and `service-head` are added |
| I1 deltas 87, 99, 101 and 108 | One part open, or changed | The same dispositions. Each row has a note that points to revision 11's decision. |

The counts over sections 15.1 to 15.4, over I1's entries 1 to 114,
and over the repairs of sections 15.6d and 15.6f are unchanged. The I1
note has 152 entries at the snapshot, and each has one row: 78, 17, 19
and 38.

### What changed in the files

| File | What changed |
|---|---|
| The main note | The opening, with a status table, what revision 11 read and the input snapshot. Sections 1, 2.1, 4.1, 4.2, 5.2, 6.1, 6.4, 6.5, 6.11, 7.2, 7.4, 9.1 to 9.5, 11.8, 12, 13, 14, 15, 15.5, 15.6 and 15.8. One sentence of section 17.1 on a request's origin entry. One row of section 16.2. Notes in four rows of sections 15.6c and 15.6e. In section 17: the opening, 17.1, 17.2, 17.3, 17.3a and 17.5. In section 18: the heading, 18.2 and 18.9, and 18.19, which is rewritten. New: sections 9.6, 11.9, 15.3a, 15.6g and 15.6h; witnesses 18.20 to 18.24; decisions D11-1 to D11-6; open points R1-37 to R1-41. |
| `lane-instantiations.md` | Its status lines; a paragraph on what revision 11 changed; one new row and one changed row of the reservations table; the third note under that table; the note N21; a new note N22. No row of a definition table, and no count. |
| `corrections.md` | This section. |
| `admission-read-inventory.md` | Unchanged, byte for byte. Its SHA-256 is `a2b8f683ff81d48d3136d8a484da1dacc26f858709223c5b2bf6d75a5da7e26f`. |

### What remains owed

Nothing that revision 10 listed as owed is dropped, apart from what a
row below says is decided.

| Owed | To |
|---|---|
| Independent review of revision 11: the main note, the companion file and this file. Adoption before any source depends on what revision 11 adds. | A reviewer who did not write it; the planner |
| The source changes of the list below. A sound reservation in every dimension, and not only entries. I1's stated omissions. | The builder, in I1 |
| The two declarations of a refusal that uses a reserved entry, inside the five conditions, and confirmation of the form of section 6.11 and of `never-admitted`. Where a platform scope reads a declared definition that an input names (R1-35). The operator's procedure for sending a diagnosed request again, and who is told of an acknowledged request with no result (R1-36). The number of a handle, and its characters. The domain of a check's configuration. That a named definition was activated (R1-22). Everything that revisions 8 to 10 listed for R3. | R3 |
| Every number, now with: the bound on a named closure and on a definition's name (R1-37); the bound on one retained read and on a request body; a verifier's limits and its deadline for one read; whether a diagnosed request is sent again by a policy. A fourth check in its key S13, if this candidate is adopted. Everything that revisions 8 to 10 listed for R4. | R4 |
| Answers to the companion's notes N1 to N22, with R1-29 and R1-30. Whether the read values of section 9.6 are the ones its pages need (R1-41). Whether `ended` needs more than one name. | R2 |
| A delivery whose entry would pass the entry size (R1-34). An effect that a read decides (R1-38). The end of a token's cleanup (R1-39). What opens a further attempt (R1-40). Each of the last three with R3, whose revision 13 is now adopted. | This note's next revision, with R3 and R4 |
| R0 revision 4 against the step and variant numbers used here. The parts of R4 revision 8 that the opening lists as not read. R2's revision 13, when it exists. Entries 153 to 155 of the I1 deltas note, and anything after `97518f68`. | This note's next revision |
| Whether `restricted@1` gets an evaluator (R1-8). The operational assumptions H1, H2, H4, H5 and H6, and all measurements. The whole workspace, browser, device and demonstration experience. A tenfold economy of useful tests, and whether a first release is ready. | As revisions 8 to 10 list them; the builder for the last two |

### Source impact

What the source at `97518f68` must change if this candidate is
adopted. Section 11.9 has the full table, with the rules that only
state what the source already does.

1. A founding that lacks a declaration of its definition's named
   closure is answered `dependency-unavailable`, and is not written.
   A child whose creator holds no bytes for a definition of the
   closure is not created; the creation is retried.
2. A scope is not founded or created under a definition whose
   `create` send names a platform version that the runtime does not
   implement: `unsupported-definition`.
3. Each retained declaration is inside the bound on a definition's
   bytes.
4. `FactUse` gains `under`. The name moves from beside the retained
   copy into the entry, and an entry's bytes change with it.
5. Settlement returns the contract's `Settlement`. The client's table
   of answers follows.
6. An act that is sent to a name which is not a scope ID is refused
   by the transport in its own terms, and not answered `unavailable`.
7. A client's transport returns a reply only when each fixed record
   in it has every member that its type requires, each name from a
   closed set is one of that set, and the reason of a refusal is one
   that the operation can give. At `97518f68` an effect with only its
   name, an input with only its type, an empty use, preparation or
   send, and a refused act with the reason `source-unverified` or
   `unsupported-definition` were each returned as an answer. Owner:
   I1, in its source delivery (request `2186c3c2`). I1 changed these
   checks after the snapshot, in `c8e44ea6` and `ebad6f0c`. Those
   commits are outside the snapshot, and their disposition is owed to
   the next revision. Added after the review `bba379e5`.
8. A report lists the fixed labels of `trusts`, with `service-head`
   and `bounds`.
9. Owed before a deployment relies on a restored receiver: a way to
   send a diagnosed request again.
10. No change now, and owed by I3 with I2: the count of decisions,
    the `record` effect of a refused deciding entry, and
    `never-admitted`.

Still owed under the adopted revision 10, and found unchanged at
`97518f68` in the three places that this revision checked: `under` is
compared with what the seed names; the bounds hold revision 7's
values, with none on timed rules, on rules or on a definition's bytes;
and settlement at a position is not built.

### Limits of this revision

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run.
- I1's source was read at `97518f68` in the files that the main
  note's opening lists, to settle wording. No other source was read,
  and none is certified.
- The authority note's revision 13 is adopted (`d7acffc9`). This
  revision read its revision 12, and the refiling compared the two.
  Each rule that this revision carries from that note is labelled,
  and is R3's. The forms of sections 6.11 and 17.3 are proposals of
  this candidate, and that adoption adopts neither. If R3 changes a
  rule, they are reconciled again.
- R2 was not read again, and its revision 13 was not available. The
  lane reconciliation is limited to revision 12 and to the companion
  file.
- R0 revision 4 is still not read.
- The companion file was edited by hand. Its script of revision 8 was
  not run again.
- A script outside the repository applied the edits to the three
  files. A few lines of script added up the made-up numbers of
  witnesses 18.20 and 18.23 and counted table rows.
- Every number in this revision is made up for a witness, is a
  temporary value of I1, or is a proposal of a sibling. None is
  measured, and none is a guarantee.

## Revision 11, refiled

This is still revision 11. The refiling changes statements of standing
and nothing else. No form, rule, witness or disposition changed. The
unchanged file `admission-read-inventory.md` is not edited.

**Why.** The request `108ea663`, for which revision 11 was written, is
stale: its route ran through an invitation that was retired. The
request `9cd074ad` replaces it on a new route and keeps its whole
task. It asks that the candidate state the current standing of the
authority note, keep the ledger of what was read, and keep the I1
snapshot fixed. Revision 11 at `6fde0856` said that the authority
note's revision 9 was in force and that its revision 12 at `80f390fc`
was a candidate in review. That was so when it was written. The
authority note in force is now its revision 13 at `2709006c`, adopted
by `d7acffc9` after the approval `5417af1d`. Those identifiers are as
the request and the planner give them. No adoption act was checked
here.

**What revision 13 changed, and the check.** The difference between
`80f390fc` and `2709006c` was read in full. The authority note's main
file differs in three lines: the revision number, and two sentences.

| Where in the authority note | Revision 12 | Revision 13 | What this contract relies on there |
|---|---|---|---|
| Section 3.11, the row for the change lane at `request-check` | It called the intent that carries the digest, and the guard on it, proposed in this contract's revision 10 and pending adoption. | It attributes both to this contract's adopted revision 10, in the companion file's `request-check` row, and leaves R2's row to R2's follow-through. | Nothing in that sentence. The sentence describes this contract. The companion file's `request-check` row has the field, the guard and the name `not-a-check-of-the-rules`, as revision 10 had them. This note cites section 3.11 for the byte domain of a check's configuration and for what the destination checks. |
| Section 3.1, on the canonical form of a handle | "256 ASCII bytes" | "256 unescaped ASCII bytes" | Nothing in that sentence. Section 6.4 of this note states the canonical length in its own words: at most six bytes for each byte, and two for the quotes. |

The authority note's corrections file gains a section "Revision 13" and
the word "unescaped" in one row. Nothing else differs. So every rule
that this revision carries from the authority note is the same text in
revision 13 as in revision 12. A rule that this contract takes from
that note is now taken from an adopted note. The label "proposed in
the authority note's candidate revision 12, in review" is now "stated
in the authority note's adopted revision 13".

**What the authority note's adoption does not adopt.** Nothing here.
The forms that this revision adds for R3's rules, in sections 6.11,
7.4 and 17.3, and every other thing that revision 11 adds or changes,
stay proposals until this candidate is itself reviewed and adopted.

**Statements changed.** A statement is one passage that a single
replacement changed: a sentence, a paragraph, a heading or a table
cell. A script outside the repository made each replacement, required
that its old text occurred exactly once, and counted them. Four
things were then done by hand: one cell of this file was changed, and
is counted by hand; two passages were wrapped again; and the sentence
that names the owner of everything after the snapshot was put back.

| File | Where | Statements changed |
|---|---|---|
| The main note | The opening: the sentence on what revision 11 answers; the head of the table of standing; its rows for R2, R3 and R4; the fourth reading rule; the R3 row of "What revisions 8 to 10 read"; the R3 row of "What revision 11 read"; the paragraph on the input snapshot | 9 |
| The main note | Section 2.1 | 1 |
| The main note | Section 6.4 | 1 |
| The main note | Section 6.11: the `receiver-pin` row, the `license` row, and "The license requests of a receiver pin" | 3 |
| The main note | Section 12 | 1 |
| The main note | Section 13, point R1-38 | 1 |
| The main note | Section 14 | 1 |
| The main note | Section 15.3a: the heading, the paragraph under it, rows 2, 6 and 7, and the paragraph after the counts | 6 |
| The main note | Section 15.8 | 1 |
| The main note | Section 17.2, row 6 | 1 |
| The main note | Section 17.3 | 1 |
| The main note | Section 17.3a | 1 |
| The main note | Section 18.20 | 1 |
| This file, "Revision 11" | The head: two | 2 |
| This file, "Revision 11" | "The input snapshot": the R3 row, and the paragraph on what is not covered | 2 |
| This file, "Revision 11" | "One row for each ask": the heading with its first line, and row 2 | 2 |
| This file, "Revision 11" | "What remains owed" | 1 |
| This file, "Revision 11" | "Limits of this revision" | 1 |
| The companion file | The opening, "Read from": two | 2 |
| The companion file | Section 1, the row for a `receiver-pin` that is `standing` | 1 |

That is 28 in the main note, 8 in this file and 3 in the companion
file: 39. Of the 39, three are about the other siblings and not about
the authority note: the head of the table of standing and its rows for
R2 and R4.

**Added.** Three passages are new, and are not among the 39: the
sentence in the main note's first paragraph that names the refiling
and the request `9cd074ad`; a row of "What revision 11 read" in the
main note, on revision 13 as adopted; and a row of "The input
snapshot" in this file, on the same. The changed paragraph on the
input snapshot also gains the sentences that the request asks for: the
snapshot is the I1 source through implementation choice 152, and every
later choice, from 153 on, with the three repairs of the source made
after the independent source review `2d706f18`, is owed to the next
revision.

**The other siblings.** The table of standing now names R2's revision
14 at `4b3bf5da` and R4's revision 9 at `85be9f0b`, both in review.
Their adopted bases are unchanged: R2 revision 12 at `03cb4ee5` and R4
revision 8 at `c3e699a6`. R0 is adopted at revision 4, `3b6e1ad7`, as
the table already said. This revision read none of those later texts.
Only the table was changed for them. A sentence elsewhere that says
R2's revision 13 is in preparation, or does not exist yet, describes
the time when revision 11 was written, and the table says so.

**Limits of the refiling.**

- Only the difference between the authority note's revisions 12 and
  13 was read. Revision 13 was not read again in full.
- The passages of R3 that revisions 8 and 9 of this note read at R3's
  revision 9, and that revision 11 did not read again at revision 12,
  were not compared with revision 13. Citations of "R3 revision 9" for
  those passages are citations of what was read. Owner: this note's
  next revision.
- The source review `2d706f18`, the three repairs after it and the I1
  choices from 153 on were not read.
- Nothing was compiled, tested or run, and no workroom command was
  run.

## Revision 11, corrected after review bba379e5

This is still revision 11. The independent review `bba379e5` read the
refiled text at `92c992b7` and asked for one correction, a P2. It made
no other material finding. This section says what was corrected. No
form, rule or witness changed, and the snapshot did not move. The
unchanged file `admission-read-inventory.md` is not edited.

**The finding.** Section 11.9 said that the I1 source at `97518f68`
agreed with section 9.6 on an answer across a transport, apart from
settlement and from a name that is not a scope ID, and it named no
owner. That was wrong for the snapshot.

**The rule, which is unchanged.** Section 9.6, points 2 to 4. A fixed
record of the contract is checked: every member that its type requires
is there and is of its kind, and a name from a closed set is one of
that set. What the contract's types leave to a definition stays
opaque. A reason is one that the contract names for that answer of
that operation.

**What the source at `97518f68` did not check.** Read in
`packages/client/src/answers.ts`, against
`packages/contract/src/entry.ts` and `packages/contract/src/result.ts`
of the same commit.

| In a reply | What was checked | What passed, and is no answer under the rule |
|---|---|---|
| An effect, in a receipt or in an entry | That `effect` is text | A name that is no effect of the contract. An effect without the members of its variant, such as `{ effect: "state" }` with no `item` and no `state`. |
| An entry's input | That `type` is text | A type that is no input of the contract. An input without the members of its variant, such as an act with no signed intent and no `authority`. |
| Each element of an entry's `uses`, `prepared` and `sends`, and of an item's `attributed` | That it is an object | An empty object. |
| The reason of a refused act | That it is in one table, which a founding shares | `source-unverified` and `unsupported-definition`. The source's type `Answer` names neither for an act. Its type `Founded` names both for a founding. |

Section 4.2 names `source-unverified` for no act. It names
`unsupported-definition` for an act only in a platform scope that
takes a definition's name from an input.

**The owner.** I1, in its source delivery (request `2186c3c2`). I1
changed these checks after the snapshot, in `c8e44ea6` and `ebad6f0c`
on `request/i1-scope-substrate`. At `a3e5a77e`,
`packages/bytes/src/records.ts` has one guard for each fixed record,
which reads each case of the table, and
`packages/client/src/answers.ts` has a table of reasons for an act
that is apart from a founding's. Those commits are outside this
revision's snapshot. They show nothing about the source at
`97518f68`, and their disposition is owed to this note's next
revision. The review names the existing repair as `5fc07d88`. That
identifier is as the review gives it, and it was not checked here.

**What changed.**

| File | Where | What changed |
|---|---|---|
| The main note | The opening, first paragraph | One sentence added: that this correction was made. |
| The main note | "What revision 11 read" | The row for I1's source: its sentence "No other source was read" now speaks of the time when revision 11 was written. One row added: what this correction read. |
| The main note | "The input snapshot, and what arrived later" | Three sentences added: the two later commits that were read, why, and that they have no disposition. |
| The main note | Section 9.6, the bullet on settlement | One sentence added: the checks of points 2 and 3 are a separate matter. |
| The main note | Section 11.9 | One row added, marked "must change", after the row on a name that is not a scope ID. The row "An answer across a transport; following a receipt" is corrected: "Agrees in part", with what agrees, the three rows that do not, and the owner I1 in place of "None". |
| The main note | Section 15.6g, rows 143 and 152 | Two sentences added to each. The dispositions are unchanged: each is "Accepted, and stated". The counts over the 38 entries are unchanged. |
| This file, "Revision 11", "Source impact" | The list | Item 7 added. The former items 7, 8 and 9 are now 8, 9 and 10, with the same words. |
| This file | This section | New. |
| The companion file | None | Unchanged. |

**Counts.** Section 11.9 had 7 rows marked "must change". It has 8.
The list "Source impact" in this file had 9 items. It has 10: 8 that
the source must change, 1 owed before a deployment relies on a
restored receiver, and 1 with no change now. Neither count was stated
as a number in the main note or in this file before, so no stated
count changed.

**What is already covered, and is not changed.** In the main note,
section 15.8 lists as owed by the builder, in I1, "Everything in
section 11.9 that is marked 'must change'". In this file, "What
remains owed" lists "The source changes of the list below". Both now
include the new row and item. Both also list, for this note's next
revision, any source change after `97518f68`.

**Limits of the correction.**

- The source was read, and not run. The main note's table "What
  revision 11 read" lists each file and commit that this correction
  read. No other source was read, and none is certified.
- The table above is of members and of names from closed sets.
  Whether a text member has its fixed form, such as a timestamp, was
  not compared at `97518f68`.
- The later commits were read to name a repair and its owner. This is
  not a review of them, and it does not say that they are complete.
- The finding is about what a transport returns as an answer. It says
  nothing about whether a receipt is true of a history, and it asserts
  no way around a check of authority.
- Nothing was compiled, tested or run, and no workroom command was
  run.

## Revision 12

Revision 12 is the successor of revision 11 at
`996c3e5824ba7b15ba6b34c99503c8cd4c7d21f5`. Revision 11 was reviewed
and approved (`52fac973`), and it is adopted, as the commission
`d56d7f65` states. This revision did not check the adoption act, and
does not hold its identifier. Revision 12 is written for that
commission. It keeps the whole of revision 11. Everything that it adds
or changes is a proposal until revision 12 is independently reviewed
and adopted.

The sections "Revision 11", "Revision 11, refiled" and "Revision 11,
corrected after review bba379e5" above say that revision 10 was in
force and that revision 11 was a candidate. That was so when each was
written. They are history, and they are not changed.

Section numbers are those of the main note. "Companion" is
`lane-instantiations.md`.

### The input snapshot

| Input | Read at | Covered |
|---|---|---|
| The I1 implementation's choices | The deltas note at `a3e5a77e`, with the source that each entry describes, at the same commit. The commit is fixed. | Entries 153 to 157. Entries 1 to 152 keep the dispositions of revision 11. |
| I1's source | `a3e5a77e`, read and not run. Approved by its own review (`5019cff4`), and not landed. | The files that the main note's table "What revision 12 read" lists. It is not a review of the source, and this contract accepts none of it. |
| R2, lane forms | Revision 14 at `4b3bf5da`, adopted | By a second reader, in full; by the writer, the lines that the main note lists. |
| R4, the proof plan | Revision 9 at `85be9f0b`, adopted | By a second reader: the main note, its corrections, its invariants and its audit rules, in full. |
| C2, the recovery design | Revision 2 at `dafb5b0c`, adopted | By a second reader, in full. |
| R3, the authority note | Revision 13 at `2709006c`. A historical input: it was reviewed and adopted (`d7acffc9`), and that adoption now shows as stale. | By a second reader, in part. The main note lists the lines that were read and the lines that were not. It is not revived here, and no new authority for any source is taken from it. |
| R0, the demo contract | Revision 4 at `3b6e1ad7` | Not read. Still owed. |

Not covered: any choice of I1 after entry 157; any change of its
source after `a3e5a77e`; and the lines of R3's revision 13 that were
not read.

### One row for each I1 entry, 153 to 157

Section 15.6i has the dispositions, and section 11.10 the reading of
the source.

| Entry | Disposition | What the contract says now, or what changes | The source at `a3e5a77e` | Where |
|---|---|---|---|---|
| 153 | Accepted, and stated | A name that a definition, an intent or a message chooses is data. It is a member of its own record, compared by its bytes, and no name is refused for what it spells. | Agrees in part. The rule profile's three reserved keys are the difference. Owner: the builder, with point R1-8. | 6.1 |
| 154 | Accepted, and stated | A fixed record in a reply has exactly the members of its variant, and the list of what stays opaque is exact. | Agrees in part. It agrees with the rule, against its own types. Where those types differ from the contract, the rows are already owed. Owner: I1, with I2 and I3. | 9.6 |
| 155 | Changed in one part | A reply is read as raw bytes under a byte limit and one deadline, and a failure never says that nothing was recorded. Changed: a transport over a binding owes the deadline too. | Agrees in part. The transport over HTTP agrees. The transport over a binding has no deadline. Owner: I1; the numbers, R4. | 9.6; 11.10, row 9 |
| 156 | Accepted, and stated | A signature and a key ID each have one text form, and each identifier inside a fixed record is read in its form. | Agrees. | 2.1, 9.6 |
| 157 | Accepted, and stated | What a reader holds after its deadline, in points 2 to 5, with what it cannot promise. | Agrees. | 9.6; witness 18.25 |

Counts, over the 5 dispositions: 4 accepted and stated; 1 changed in
one part. Over the 5 readings of the source: 2 agree; 3 agree in part;
none differs whole.

### One row for each seam that the commission names

Section 15.10 has the full rows.

| # | Seam | Disposition | Owner of what is not decided here | Where |
|---|---|---|---|---|
| 1 | A counted license request, a refusal that is malformed and still bound, and R3's narrower triggers | Decided for the form: a request is covered exactly when it is bound, and an owner covers less by a narrower binding. Not decided: the binding of R3's license request. | R3's next revision (R1-44) | 6.11 |
| 2 | A late answer on a job that timed out, and what replaces the entry that decided it | Stated exactly, with no new rule | R3 for the rule, R2 for the rows; R2 for R1-45 | 6.10; witness 18.16 |
| 3 | A publication's 35 sends beside the earlier 34 | Decided: 35, with the result at ordinal 34. The bound and the reservation of a merge do not change. | R2 for the row; R4 for row F23; R3's next revision for its row O4 | 7.5, 17.2; witness 18.6 |
| 4 | A definition's bytes, name and activation; a creator's closure | Set apart, with no new rule | R3's next revision (R1-22, R1-35); R4 (R1-37); I1 for rows 1 to 3 of 11.10 | 7.2 |
| 5 | The budget in five dimensions, beside I1's count of entries | Set apart, with no new rule | The builder; R4 for every number | 17.5 |
| 6 | The life of a client's reader, and witnesses under a controlled scheduler | Decided: one deadline and a byte limit, in six points; a binding owes the deadline | R4 for the numbers; I1 for the binding and for its own witnesses | 9.6; witness 18.25 |
| 7 | Trust, a known head, an anchor and a whole replay, by cost | Set apart, with no new rule | R4 for every measurement | 9.4 |
| 8 | In R2: a renewal by a member who already holds, after a merge | Stated for the capability only | R2 (R1-46) | 6.8 |
| 9 | In C2: the checkpoint and the journal, where they join common identities and receipts | Twelve joins listed; three readings asked | C2's next step, with R3 | 15.9 |

Over the 9: 3 hold a decision of this note (1, 3 and 6); 5 are stated
or set apart with no new rule (2, 4, 5, 7 and 9); 1 is stated for this
note's own part only (8). Each has an owner for what is not decided.

### One row for each ask of the lane design's revision 14

| # | Ask | Disposition | Where |
|---|---|---|---|
| 1 | An `if` on `index` (G20) | Adopted | 6.6 |
| 2 | A reason with more than one value (G21) | Owned gap | Point R1-42 |
| 3 | A platform check of a detached text (G25) | Owned gap | Point R1-43 |
| 4 | The base of `attribute` for an unbound subject (G27) | Adopted | 6.7 |
| 5 | The index row of the entry that records `published` | Adopted | 7.5; witness 18.6 |
| 6 | The form that carries `decided` | Adopted in revision 11 | 6.11 |
| 7 | The unit of the bound on a handle | Adopted in revision 11 | 6.4 |
| 8 | A byte domain for a check's configuration | Expressible, in revision 11 | 2.1 |
| 9 | How `unnamed-work` carries the commit | Owned gap | Point R1-42 |
| 10 | The form of a job's dispatch | Owned gap | R3 |

Counts, over the 10: 3 adopted; 2 adopted in revision 11; 1
expressible, in revision 11; 4 owned gaps. R4's revision 9 asks
nothing new (section 15.5). C2's revision 2 has 12 joins and 3
readings to confirm (section 15.9).

### Rows of the revision 11 matrix that change

| Point | Revision 11 | Revision 12 |
|---|---|---|
| The status of the contract | Revision 10 adopted and in force; revision 11 proposed | Revision 11 adopted and in force; revision 12 proposed |
| The I1 snapshot | `97518f68`, entries 1 to 152 | `a3e5a77e`, entries 1 to 157 |
| The sends of the entry that records `published` | 34, with the result at ordinal 33 | 35, with the result at ordinal 34; 34 when the lane staged the manifest itself |
| An `index` send | No `if` | May carry `if` |
| The base of `attribute` when its subject is unbound | Not stated | The signer and its principal |
| What a count of decisions covers | Every first decision of a bound request. R3 was asked to confirm the wider cover. | The same, stated as one rule. One question is named for R3: point R1-44. |
| A fixed record in a reply | Every member that its type requires, each of its kind | Exactly the members of its variant, each identifier in its form |
| The reader of a reply | A rule for a verifier only | One rule for a client and a verifier: a byte limit and one deadline, in six points |
| The rows marked "must change" | 8, all owed at `97518f68` | 10: those 8, of which the later source repairs 1, and 2 new. The second was added before review. 9 are owed at `a3e5a77e`. |
| Points R1-29, and R1-30 for the slot | Owed to R2 | Confirmed by R2's adopted revision 14 |
| The authority note's ask 13, on `ended` | An owned gap, with point R1-27 | An owned gap, with its own point: R1-42 |
| The open points | R1-37 to R1-41 are the newest | R1-42 to R1-47 are added. R1-48 and R1-49 were added before review. |
| The companion file beside R2 | Evidence at R2's revision 12. R2's revision 13 was not available. | Evidence at R2's revision 12. R2's adopted revision 14 is the statement of the lanes, and differs in 30 rows. |

The counts over sections 15.1 to 15.4, over section 15.3a, and over
I1's entries 1 to 152 are unchanged. The I1 note has 157 entries at
`a3e5a77e`, and each has one row: 78, 17, 19, 38 and 5.

### What changed in the files

| File | Where | What changed |
|---|---|---|
| The main note | The opening | The first paragraph and the revision line. A paragraph and eight points on what revision 12 changes. A new table of standing, with three limits; the older table is marked as history, and its third limit is reworded. A table of what revision 12 read, with three limits of the reading. The input snapshot of revision 12. "How to read two words below" and "Status" are brought up to the adoption of revision 11. |
| The main note | Section 1 | The sentence over the table of D11 decisions. A new table, D12-1 to D12-6. |
| The main note | Section 2.1 | One point: a signature and a key ID each have one text form. |
| The main note | Section 6.1 | One point: a chosen name is data. |
| The main note | Section 6.6 | `if` on `index`, in the type and in the point on a conditional send. |
| The main note | Section 6.7 | One point: the base of `attribute` for an unbound subject. |
| The main note | Section 6.8 | One paragraph: a renewal by the member who already holds. |
| The main note | Section 6.10 | A passage of six points: what replaces the entry that decided a job. |
| The main note | Section 6.11 | "Bound means covered", with a table of five rows. Sentences added to "The license requests of a receiver pin". |
| The main note | Section 7.2 | "Four facts about a definition, kept apart", with a table of four rows and four points. |
| The main note | Section 7.5 | The paragraph on the entry that R2 counts: 35 sends. |
| The main note | Section 9.4 | "What a check can rest on, and what each reads", with a table of five rows and four points. One sentence in "Every reply is untrusted". |
| The main note | Section 9.6 | Points 3 and 4 of "What a transport hands to its caller". New: "The reader of a reply". |
| The main note | Sections 11.9 and 11.10 | A note at the head of 11.9. Section 11.10 is new. |
| The main note | Section 12 | Four rows. |
| The main note | Section 13 | A sentence in the row R2-13. A table of six open points, R1-42 to R1-47. A paragraph on the points that a sibling has answered. |
| The main note | Section 14 | One row extended; three rows added; the row "Nothing was run" extended. |
| The main note | Section 15 | The opening. Notes under the tables of 15.2, 15.3a and 15.4. In 15.5, a passage and a table on R4's revision 9. One sentence in the opening of 15.6. In 15.8: a paragraph of counts; four rows of the table of what is owed are changed, and four are added. New: sections 15.3b, 15.6i, 15.9 and 15.10. |
| The main note | Section 17 | A paragraph in the opening. Sentences in 17.2, on the entry that records a merge. In 17.5, "The rule and the source, kept apart", with a table of five rows. |
| The main note | Section 18 | The heading. Witness 18.6 is changed. One point in witness 18.16. Witness 18.25 is new. |
| `lane-instantiations.md` | The opening; section 1; section 2 | Its status lines. Two points in the opening: what revision 12 changed, and how the file stands beside R2's adopted revision 14. One note under the table of sends. One sentence at the end of each of the notes N20 and N21. No row of a definition table, no count, and no row of the reservations table. |
| `corrections.md` | This section | New. |
| `admission-read-inventory.md` | None | Unchanged, byte for byte. Its SHA-256 is `a2b8f683ff81d48d3136d8a484da1dacc26f858709223c5b2bf6d75a5da7e26f`, as revision 11 records. |

### What remains owed

Nothing that revision 11 listed as owed is dropped, apart from what a
row below says is done.

| Owed | To |
|---|---|
| Independent review of revision 12: the main note, the companion file and this file. Adoption before any source depends on what revision 12 adds. | A reviewer who did not write it; the planner |
| The source changes of the list below. A sound reservation in every dimension, and not only entries. A controlled timer in the witnesses of the reader of a reply. I1's stated omissions. | The builder, in I1 or the delivery that follows it |
| Each owed to R3's next revision, and none claimed as agreed: the binding of a license request (R1-44); the reading of `not-owner` and `malformed` on a `withdraw` as not bound; activation, and a platform creator's read of a definition (R1-22, R1-35); its row O4, which still counts 34 sends; the task definition's reservations and evidence for the recovery design. Everything that revisions 8 to 11 listed for R3. | R3 |
| Every number, now with the byte limit and the deadline of the reader of a reply. Row F23 at 35 sends and 33 results. What each thing that a check can rest on costs. The two `trusts` labels of revision 11 in its own list. Everything that revisions 8 to 11 listed for R4. | R4 |
| What ends the pending state of a `timed-out` job that nobody answers (R1-45). Whether a hold may be renewed in a merged pull request (R1-46). Whether the read values of section 9.6 are the ones its pages need (R1-41). Done since revision 11: `closedBy` and the job's `decidedBy` are confirmed, and the companion's notes N1 to N21 have R2's own dispositions. | R2 |
| The three readings of section 15.9, and a reading of this contract at revision 11 | The recovery design's next step (`1e651244`), with R3 |
| A delivery whose entry would pass the entry size (R1-34). An effect that a read decides (R1-38). The end of a token's cleanup (R1-39). What opens a further attempt (R1-40). What a refusal carries beside a code and one name (R1-42). A platform check of a detached text (R1-43). | This note's next revision, with R2, R3 and R4 |
| R0 revision 4 against the step and variant numbers used here. The lines of R3's revision 13 that were not read. A reading by the writer of R2's revision 14, R4's revision 9 and C2's revision 2. Any choice of I1 after entry 157, and anything after `a3e5a77e`. | This note's next revision |
| Whether `restricted@1` gets an evaluator (R1-8), with its three reserved keys. The operational assumptions H1, H2, H4, H5 and H6, and all measurements. The whole workspace, browser, device and demonstration experience. A tenfold economy of useful tests, and whether a first release is ready. | As revisions 8 to 11 list them; the builder for the last two |

### Source impact

The list "Source impact" of "Revision 11" has 10 items. Read against
the source at `a3e5a77e` (section 11.10):

1. Items 1 to 6, and item 8: not repaired. The files that hold each
   are the same bytes as at `97518f68`, or differ only in how a name
   is read.
2. Item 7, what a client's transport returns as an answer: repaired in
   the later source, in `packages/bytes/src/records.ts`,
   `packages/bytes/src/ids.ts` and `packages/client/src/answers.ts`,
   against the source's own types. This is a reading. It accepts no
   source.
3. Item 9, owed before a deployment relies on a restored receiver:
   unchanged.
4. Item 10, no change now: unchanged.
5. One item is new, and it is the eleventh: a transport over a binding
   gives each exchange a deadline. `packages/client/src/binding.ts`
   has none.
6. One item was added before review, and it is the twelfth: a genesis
   input holds `kind`, the genesis act of the pinned definition, and a
   reader takes the kind of a genesis entry from the entry.
   `packages/contract/src/entry.ts` has no such member at `a3e5a77e`,
   on main at `c9a16778` or in the I2 base at `744f2447`. Owner: the
   I2 delivery (request `efb4e323`), after adoption.

So the list has 12 items: 10 that the source must change, of which the
later source repairs 1; 1 owed before a deployment relies on a
restored receiver; and 1 with no change now. At `a3e5a77e`, 9 of the
10 are still owed.

### Limits of this revision

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run.
- I1's source was read at `a3e5a77e` in the files that the main note's
  opening lists. No test and no guide was read, so no witness that an
  entry names was read. No source is certified, and none is accepted.
- The three newly adopted sibling notes were read by a second reader,
  which reported with line numbers. The writer read only the lines of
  R2 that the main note lists. What this revision says of those notes
  rests on the reports.
- The authority note was read in part, and by a second reader. Most of
  its section 6.2 and all of its section 7 were not read. It is a
  historical input whose adoption shows as stale. Every confirmation
  that this revision needs from R3 is named as owed to R3's next
  revision.
- The text in which the commission's eighth seam was first named was
  not available. Section 15.10 says how the seam was read.
- R0 revision 4 is still not read.
- The companion file was edited by hand, in its opening and its notes
  only. Its script of revision 8 was not run again. It is not brought
  up to R2's revision 14.
- A script outside the repository applied the edits to the three
  files, and a few lines of script counted table rows. No number in
  this revision is measured. The two numbers that it names, 4 MiB and
  30 seconds, are temporary values of I1.

## Revision 12, amended before review

2026-10-05. Revision 12 was filed for review at `aeda54f7`. No
reviewer had claimed it. This amendment is two commits on top of that
head, and the text is still revision 12. The second commit corrects
the capability rule of the first: see "The capability rule, corrected"
below. It holds two decisions of the
note's author on questions that the I2 delivery (request `efb4e323`)
raised. Both are proposals, with the rest of revision 12, until
revision 12 is reviewed and adopted. Nothing else of revision 12
changes.

### The two changes

| # | Input | Before the amendment | After it | Where |
|---|---|---|---|---|
| 1 | I2 deltas D21 and DK5, with D4 | Section 6.2 compared a fact's `kind` with the act kind of a genesis entry, and a genesis entry held its seed and not its act kind. A reader could derive the kind only when it pinned the same definition. A `change` lane refused a manifest whose goal was an issue's `file` entry. | The genesis input holds `kind`: one JSON string, the genesis act of the pinned definition, always present. The scope that writes the genesis sets it from the definition that it pins. Every reader reads it from the entry. A replay checks it, and a difference is a `mismatch`, `genesis-kind`. What it does not prove is stated, and the `under` check stays. Two other ways are named, with why each was not taken. | 4.1, 6.2, 9.3, 9.4, 11.10 row 10; witness 18.26 |
| 2 | I2 deltas D3 and DJ14 | Section 6.1 gave `unsupported-definition` for a version that a runtime does not implement. It did not say what a runtime must have code for, or whether a test may script a capability. | A runtime must have code for every capability form that the pinned definition uses. When it lacks code for one, it answers `unsupported-definition` for the whole scope, and a verifier the same at the genesis. A definition that lists `hold@1` and uses only its item form runs on a runtime that derives the item form. The validator's list of what cannot be derived is the test. A scripted capability is a labelled stand-in, from test support that the production entry does not import, and its results prove nothing about the capability. The authority note's successor (request `406983fe`) owns the real rules and is asked to confirm. | 6.1, 6.11; witness 18.27 |

### Counts

| Count | Revision 12 as filed | After the amendment |
|---|---|---|
| Rows marked "must change" in sections 11.9 and 11.10 | 9 | 10 |
| Of those, still owed at `a3e5a77e` | 8 | 9 |
| Items of the list "Source impact" in this file | 11 | 12 |
| Open points, newest | R1-47 | R1-49 |
| Decisions D12 | 6 | 8 |
| Witnesses of section 18 | 18.1 to 18.25 | 18.1 to 18.27 |
| Entries of the I2 deltas note with a disposition | None | 5 of 165 |

### What changed in the files

| File | Where | What changed |
|---|---|---|
| The main note | The opening | One sentence in the first paragraph. A dated passage, "Revision 12, amended before review". Section 15.6j is named in "How to read two words below". |
| The main note | Section 1 | One sentence over the table of D12 decisions. Rows D12-7 and D12-8. |
| The main note | Section 4.1 | The member `kind` in the genesis input. A passage of six points, "A genesis states its act kind". |
| The main note | Section 4.2 | One sentence in the row `unsupported-definition`. |
| The main note | Section 6.1 | One point, "A capability form with no code", with six parts. |
| The main note | Section 6.2 | A clause in "The kind of an entry". A passage of six points, "The kind of a genesis entry is in the entry". |
| The main note | Section 6.11 | Two passages after the first table: "Code for the forms that a definition uses", and "A scripted capability is a stand-in", with seven points. |
| The main note | Sections 7.1, 7.2 and 10.1 | Four places that list what a genesis entry holds now name the kind of its genesis act. |
| The main note | Sections 9.3 and 9.4 | In 9.3: a clause in the Genesis row, and one row in the second table. In 9.4: one row changed and one row added in the table of results. |
| The main note | Section 11.10 | Row 10, in a table of its own, and the count under it. |
| The main note | Section 13 | A table of two open points, R1-48 and R1-49. |
| The main note | Section 14 | One row extended; two rows added; the row "Nothing was run" extended. |
| The main note | Section 15 | Section 15.6j is new, and the opening names it. In 15.8: one sentence of counts, one row changed and two rows added. |
| The main note | Section 18 | Witnesses 18.26 and 18.27 are new. |
| `lane-instantiations.md` | The opening | One point, on what the amendment states about the rows. No row of a definition table, no count and no note changed. |
| `corrections.md` | "Revision 12" | Two rows of "Rows of the revision 11 matrix that change". One item and the closing count of "Source impact". |
| `corrections.md` | This section | New. |
| `admission-read-inventory.md` | None | Unchanged. |

### The capability rule, corrected

The first commit of this amendment, `c584ae55`, stated the rule by the
version: a runtime with no code for a capability version that a
definition lists refused the whole scope, and the item form was not
the version. The note's author decided that this wording was wrong and
that the sources are right. The second commit states the rule by the
forms that a definition uses.

| Where | In `c584ae55` | Now |
|---|---|---|
| 6.1 | "A capability version with no code", seven parts. The item form was not the version. One case in which the source differed. | "A capability form with no code", six parts. A definition that uses only the item form of `hold@1` runs. The validator's list is the test. The part on a case in which the source differs is removed: none differs. |
| 6.11 | "Implementing a version": code for all four kinds of form | "Code for the forms that a definition uses": code for each form that is used, and for nothing else |
| 4.2, 9.4 | A capability version that the definition lists | A capability form that the definition uses |
| 1, 14, 15.6j, 15.8, the opening | The rule by the version | The rule by the forms |
| 13, R1-49 | Whether the item form alone may run a definition that lists `hold@1` | Reworded, and not removed: whether the rules of `hold@1` add anything to an entry that uses only its item form. No number changed. |
| Witness 18.27 | Seven cases | Eight cases. Case 2 is new: a definition that lists `hold@1` and uses only the item form is founded and runs under the production wiring, beside case 1, which is refused. |
| `lane-instantiations.md` | A runtime with no code for either listed version | Both definitions use forms that need the code |

No other count changes. The rows marked "must change" stay at 10, with
9 owed at `a3e5a77e`. The open points still end at R1-49, the D12
decisions are 8, and the witnesses are 18.1 to 18.27.

### What was found in the note that did not agree, and how it was reconciled

| Found | Reconciled |
|---|---|
| Section 6.2 said "the act kind of an act or a genesis entry" with no place where a genesis entry holds one. | The sentence is kept, with a clause that names the member. |
| Four places listed what a genesis entry holds, without a kind: step 3 of the register and step 3 of the table in section 7.1, step 2 of the table in section 7.2, and I.0 in section 10.1. | Each now names the kind of the genesis act. |
| Sections 4.2 and 9.4 gave `unsupported-definition` for a platform version, and section 9.3 for a capability version. Neither the row of section 4.2 nor the table of results in section 9.4 named a capability. | Both rows now name a capability form that the definition uses and the runtime, or the verifier, does not derive. |
| Section 11.8 records that I1 built the item form of `hold@1`, and section 6.8 lets a definition that lists `hold@1` use the `hold` effect. Both sources run such a definition. The first commit of this amendment said that the item form is not the version, which would refuse it. | That wording was wrong, and the second commit removes it. The rule is by the forms that a definition uses, so sections 6.8 and 11.8 and both sources agree with it. Point R1-49 is kept, reworded to the one question that remains for the owner of `hold@1`. |
| The note called I1's source "not landed". The I2 delivery note names main at `c9a16778` as its base, and that commit holds I1's packages. | The standing table of the opening is not changed. Row 10 says where the genesis input was read, with each commit. |
| The companion file's rows for `goal` list `file`, the genesis act of `issue`. | They agree with the decision. No row changes. |

### What remains owed, beside the list of "Revision 12"

| Owed | To |
|---|---|
| The member `kind` of the genesis input in source, the reader that takes it from the entry, and the replay's check | The I2 delivery (request `efb4e323`), as a follow-up after revision 12 is adopted |
| Confirmation of the runtime rule and of the evidence rule. The genesis act of each platform definition (R1-48). Whether the rules of `hold@1` add anything to an entry that uses only its item form (R1-49). | The authority note's successor (request `406983fe`) |
| The 160 entries of the I2 deltas note that have no disposition, and the parts of entry D21 that section 15.6j leaves | This note's next revision |
| Nothing. The rows for `goal` stand. The `fact` guard on a goal that is an issue's `file` entry holds when row 10 is built, and the act still needs the capabilities. | R2 |

### Limits of this amendment

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run.
- Read at `744f2447`: the I2 deltas note's table of sections, its
  entries D3, D4, D21, DJ14 and DK5 with the text around the last two,
  and its section 23 for those five; the I2 delivery note, sections 1
  to 4; and three source files in full and two in part, which section
  15.6j names. No test was read, so the scenario T3 and the founding
  test are cited as the I2 notes report them.
- The request `406983fe` was not read. It is named as the I2 notes
  give it.
- R2's revision 14 was not read again. Its sections 5.1 and 5.2 are
  cited as the I2 deltas note quotes them.
- The main note was not read again in full. Read for the amendment:
  its opening, sections 1, 2.1, 4.1, 4.2, 6.1, 6.2, part of 6.4 and
  6.5, 6.8, 6.11, 7.1, 7.2, 9.3 to 9.5, 10.1, 11.8 to 11.10, 13, 14,
  15.6i, 15.8, 15.10, 16.2 and parts of 18. Every other place was
  found by a search for the words of the changed rules. A restatement
  in other words could have been missed.
- A script outside the repository applied the edits to the three
  files, and a few lines of script counted table rows.

## Revision 13

2026-10-05. Revision 13 is the successor of revision 12 as amended, at
`53f0e183`, which was reviewed (verdict `0e346ba7`) and adopted on
2026-10-05 (act `b2833098`). It is written for the commission
`c75205df`. It is a proposal until it is reviewed and adopted.

It was written in two steps. A first draft, at `e0082616`, was written
before the commission existed and before revision 12 was reviewed. This
section was then headed "Revision 13, a draft". The completion answers
the commission, and this section now describes both steps. Revision 12
was adopted at the commit on which the first draft stands, so nothing
was to be carried from its review.

It does four things. It gives each of the 165 entries of the I2 deltas
note, at the fixed snapshot `744f2447`, one disposition by its own ID.
It states each rule that those entries needed, in the section that owns
it. It decides the points R1-50 and R1-52. It decides this contract's
part of the thirteen forms that the authority note's revision 15 asks
for.

Section numbers are those of the main note. "Companion" is
`lane-instantiations.md`.

### The input snapshot

| Input | Read at | Covered |
|---|---|---|
| The commission | `c75205df`, as filed | In full. |
| The I2 implementation's choices | The deltas note at `744f2447` on `request/i2-lane-forms` | All 165 entries, each read whole by the writer: 26 D, 5 DL, 14 DF, 29 DG, 21 DH, 23 DI, 25 DJ, 11 DK, 5 DM and 6 DN. |
| I2's source | `744f2447`, read and not run | For 121 entries, by four second readers, each of whom compared an entry with the functions that it names. For point R1-52 and for the rows of section 11.11, by the writer. The first draft read the source at `40bf1e33`; seven source files differ between the two commits, each for the genesis kind, and every other file is the same bytes. It is not a review of the source, and this contract accepts none of it. |
| The two pinned definitions | `packages/lanes/definitions/issue.json` and `change.json`, at `744f2447` | Read as JSON by scripts, for the counts that the main note cites. |
| The I2 delivery note and plan | At `744f2447` | In part: the delivery note's sections 1, 4, 5, 6, 10 and 11, and the plan's section 8. |
| R3, the authority note | Revision 15 at `8dfda899`. It was proposed, and not adopted, when it was read. Its revision 16 at `7bc60cf6` is now adopted, and was not read ("Revision 13, corrected after review a7f1c108", below). | Its section 12.1 as far as the table of messages, its section 12.1.8 in full, and its sections 13.6 and 13.7. A design input, and no authority. |
| R2, lane forms | Revision 14 at `4b3bf5da`, adopted | By a search, for the lines that the main note lists. |
| This note | Revision 12 as amended, at `53f0e183`, adopted | The sections that the main note lists. |

Not covered: any change of the I2 source after `744f2447`, which
includes the follow-up at `40bf1e33` with its entries DP1 to DP5 and
the review repairs, both now in the I2 delivery's second head, which is
filed at `50bba45c` and is under review; rows 1 to 3, 5, 6, 8 and 9 of the list of
sections 11.9 and 11.10 at the snapshot; the tests of I2; R0, R4 and
the recovery design, which were not read again; and everything that
"Revision 12" above lists as not covered.

### One row for each line of the I2 list: the first draft's table

Section 15.6k of the main note. The row numbers are kept. Row 8 is
later than the snapshot. Rows 7, 8 and 16 were revised by the
completion.

| # | Entries | Disposition | Where applied | What changed in the text |
|---|---|---|---|---|
| 1 | D1, DG11 | Accepted, and stated | 4.1, 6.6; witness 18.28 | A passage in 4.1, "A party list that is set whole": `list` records, removals and then additions, each group in byte order of member identifier. No record form is added. |
| 2 | D3, DJ14 | Answered in revision 12 | 6.1, 6.11 | Nothing. |
| 3 | D4 | Answered in revision 12 | 6.2, 11.11 | Nothing in 11.8. The kinds of the other entries are stated in 6.2, and 11.11 says that the source agrees. |
| 4 | D5, D14 | Accepted, and stated | 6.1; witness 18.32 | One point: a declared definition's name does not begin with `platform:`. |
| 5 | D13 | Accepted in part | 6.1 | The same point: the name is a text that is not empty. The number of a bound stays R4's (R1-37). |
| 6 | D17 | Changed in one part | 4.2, 11.11 row 12 | A passage, "The answer to a refused act, and the path of a guard": the member `path`. |
| 7 | D21, DK5 | Answered in revision 12, and the rest accepted | 6.2, 6.5; 11.10 row 10; witness 18.32 | In 6.2, a table of nine rows, "Which entries have a kind, exactly". In 6.5, one point on the `where` of a `fact` guard. |
| 8 | DP3, which is later than the snapshot and is not one of the 165 | Changed | 9.4, 9.5, 11.11 row 13 | The member `name` of a report, with one passage in each section. The completion took the entry's name out of the two passages, which now stand on section 9.4's own names. |
| 9 | DF8 | Accepted, and stated | 6.8 | One paragraph, "Only the `hold` effect changes a hold". |
| 10 | DG26 | Changed | 6.4, 6.6, 6.7, 11.11 row 11 | The rule of revision 12 is kept. Sentences in 6.6 and 6.7, and one rule in 6.4, set it beside the rules for an unbound guard and an absent source. |
| 11 | DH6, DH10 | Accepted, and stated | 6.4 | One point, "A type that is not `many`, with more than one item". |
| 12 | DH8 | Accepted, and stated | 6.4; witness 18.29 | One sentence of revisions 8 to 12 is replaced. One point, "The order of the names". |
| 13 | DH12 | Accepted, and stated | 6.6; witness 18.30 | One point, "How a clause finds its form and its subjects", with seven parts. |
| 14 | DH19 | Accepted, and stated | 6.6; witness 18.30 | The same point. |
| 15 | DH20 | Accepted, and stated | 6.6 | One point: a notice of a timed rule has no `if`. |
| 16 | DH21, DI15 | Changed in one part. The first draft said: accepted in part. | 7.5, 6.2, 6.8; 11.11 rows 18, 19 and 20; R1-50 | One paragraph: the validator counts the whole entry. The completion replaced the first draft's paragraph on the depth with a decision, "The depth of the decomposition chain is withdrawn", and one cell of the table of bounds. Two points, DF4 in 6.2 and DF9 in 6.8, state the rules for the two other things that entry DI15 names. |
| 17 | DI6 | Accepted, and stated | 6.4, 6.6 | One point in 6.4, with eight parts, and one sentence in 6.6. |
| 18 | DI10 | Accepted, and stated | 6.6; witness 18.30 | The part on `each` of the point on a clause. |
| 19 | DI12 | Accepted, and stated | 4.2, 6.2; witness 18.32 | The row `unknown-message` of 4.2 is made exact. Two rows and one point of the passage on kinds in 6.2. |
| 20 | DI14 | Accepted, and stated | 6.5 | One point: a `reason` on a nested guard names nothing. |
| 21 | DJ3 | Changed | 4.2, 6.2, 6.6, 9.3, 11.11 row 15; witness 18.31 | One point in 6.6, "A text that a request carries", with seven parts. The refusal `text-in-use` in 4.2. A part of the passage on detached text in 6.2. One sentence in a row of 9.3. |
| 22 | DJ5 | Accepted, and stated | 6.2 | A part of the same passage: what "reads a detached value" means. |
| 23 | DJ7 | Accepted in part | 6.2, 9.1, 9.2; R1-51 | Parts of the same passage. In 9.2, a paragraph, "A retained text, exactly", with two limits. One sentence in 9.1. |
| 24 | DJ9 | Accepted, and stated | 6.6, 9.2; witness 18.31 | One point in 6.6, "A redaction, made exact", with six parts. Two sentences in 9.2 on the folded state. |
| 25 | DJ17 | Changed | 6.1, 6.2, 11.11 row 14; witness 18.32 | One point in 6.1, and one point of the passage on kinds in 6.2: the form of a step kind. |
| 26 | DJ21 | Changed | 6.1, 11.11 row 16 | Two cells of the table of bounds. A passage of five points, "How guards are counted, and the example of `propose-manifest`". |

Counts, over the 26 rows: 14 accepted and stated; 2 answered in
revision 12; 1 answered in revision 12, with the rest accepted; 2
accepted in part; 7 changed, of which 2 in one part.

### One row for each group of the 165 entries: the completion's table

Section 15.6l of the main note has one row for each entry. This table
has one row for each group, with what the group changed in the text. A
"point" is a point of a passage "Made exact in revision 13".

| Group | Entries | Accepted, and stated | Accepted | Changed | Not this note's | Where applied | What changed in the text |
|---|---|---|---|---|---|---|---|
| D | 26 | 18 | 4 | 2 | 2 | 6.1, 6.2, 6.5, 6.6; 15.6k | Points D9, D10 and D15 in 6.1; D16, D22 and D25 in 6.2; D18, D19, D20 and D26 in 6.5; one point for D23 in 6.6. The rest are rows of 15.6k, or source choices. |
| DL | 5 | 0 | 0 | 0 | 5 | None | Nothing. Each is the lane forms', the builder's or the authority note's. |
| DF | 14 | 10 | 1 | 2 | 1 | 6.2, 6.5, 6.6, 6.8; 11.11 rows 18 and 19 | Points DF1, DF4 and DF5 in 6.2; one point for a member of a field or a slot in 6.5; points DF7, DF9, DF10, DF11, DF12 and DF13 in 6.8. |
| DG | 29 | 25 | 2 | 1 | 1 | 6.3, 6.5, 6.6, 6.7 | Point DG22 in 6.3; DG2 to DG8 and DG10 in 6.5; DG12 to DG16, DG18, DG19, DG21 and DG27 in 6.6; DG24 and DG25 in 6.7. |
| DH | 21 | 19 | 1 | 1 | 0 | 6.4, 6.6, 7.5; 11.11 row 20 | Points DH1, DH2, DH3, DH4, DH5, DH9 and DH11 in 6.4; DH13, DH15, DH16, DH17 and DH18 in 6.6. In 7.5, the depth is withdrawn. |
| DI | 23 | 17 | 3 | 1 | 2 | 5.3, 6.4, 6.5, 6.8, 17.2, 17.3 | Point DI13 in 5.3; DI17 in 6.4; DI16 in 6.5; DI2 in 6.8; DI18 and DI19 in 17.2; DI21 in 17.3. The rest name a point of another group. |
| DJ | 25 | 15 | 2 | 3 | 5 | 4.1, 6.2, 6.4, 6.5, 6.11, 9.3 | Points DJ1, DJ4 and DJ6 in 6.2; one point for DJ11 and DJ12 in 6.4; DJ16 in 6.5; DJ15, DJ18 and one for D11 and DJ19 in 6.11; DJ10 in 9.3. In 4.1, the order of an entry's effects. |
| DK | 11 | 0 | 1 | 0 | 10 | None | Nothing. Arrangements of tests, observations and stand-ins. |
| DM | 5 | 0 | 0 | 0 | 5 | None | Nothing. Removal and guides. |
| DN | 6 | 0 | 0 | 0 | 6 | 6.6, 15.3c | Nothing for the entries. The address of an attention send, which DN6 leaves, is decided with the authority note's row P23. |
| All | 165 | 104 | 14 | 10 | 37 | | 69 points in 13 sections |

No entry is left open whole. Two rows leave one part open: DJ7 (R1-51)
and DI17 (R1-45).

### The forms that the proposed authority note asks for

Section 15.3c of the main note. The input is revision 15 at `8dfda899`,
which was proposed when it was read. Revision 16 is now adopted, and
was not read.

| Rows | This contract's part | Where applied |
|---|---|---|
| P1 to P12 | Nothing is asked of this contract. | 15.3c |
| P20, P23 | Adopted as forms: `membership` in the body of a `create`, and an attention send that is addressed to a member. | 4.1, 6.6 |
| P13 to P18, P22, P24, P25 | Stay platform code, each with its reason. For P25, one rule is stated: a declared field for a `collect` list is bound by 32 elements. | 15.3c |
| P19, and the bytes of P21 | Open: points R1-53 and R1-54. | 13 |

### Rows of the revision 12 matrix that change

| Point | Revision 12 as amended | Revision 13 |
|---|---|---|
| The status of the contract | Revision 11 adopted and in force; revision 12 proposed, and filed for review | Revision 12 adopted and in force. Revision 13 proposed. |
| The I2 input | 5 entries of 165, at `744f2447` | All 165, at `744f2447`. What is later is set apart, with its owner. |
| A party list that is set whole | A form in 6.6, and no record for it in 4.1 | `list` records, in one stated order |
| A record for an effect that changes nothing | "An effect that would change nothing is not recorded" | A form that is applied writes its record. Four forms record a difference. |
| The order of an entry's effects | Four groups | Five: the ends of the holds under a closed item stand after the capability's records |
| The names of `also` | Resolved in the order written | Resolved by dependency. A cycle refuses the definition. |
| The answer to a refused act | A code and a name. The path was "part of the answer", with no member. | The member `path`, for two codes |
| A replay report | No member for the name of a mismatch | The member `name`, for two names |
| The refusal reasons | As revision 12 lists them | One more: `text-in-use` |
| The kind of an entry | Stated for each sort of entry in one sentence | A table of nine rows. A request that no handler received has none. |
| A detached text | Kept by digest until a redaction | One input for each digest; which entries keep it; a redaction by digest for the whole scope; two rules that end the wait of a delivery |
| Which foreign facts are fetched | A fact field, "when a `fact` guard or a part reads it" | Every foreign fact that a declared field names |
| A send whose target is none | Refused `send-unresolved` when it has no `if` | Refused `send-unresolved`, with an `if` or without |
| The body of a `create` | `{ fields, directory }` | `{ fields, directory, membership }` |
| The address of a send | A scope reference or a seed | Also a member, for an attention send |
| The example of `propose-manifest` | 23 guards, 70 with the nested ones, 7 deep, from the companion file | 24, 73 and 7, from the pinned row |
| The depth of a decomposition chain | 4 | Withdrawn |
| The base of `attribute` when its subject is unbound | The signer and its principal | Unchanged. The source differs, and has a row. |
| An `index` send | May carry `if` | Unchanged. The source refuses the `if`, and has a row. |
| The rows marked "must change" | 10. 9 are owed at `a3e5a77e`. | 20. 19 are owed. Row 7 is repaired at `a3e5a77e`. Row 10 is prepared at `40bf1e33`, in a follow-up that was read before it was filed. It is now inside the filed head `50bba45c`, which is under review and was not read. Row 10 is counted as owed. |
| The open points | R1-48 and R1-49 are the newest | R1-50 to R1-54 are added. R1-50 and R1-52 are decided, and R1-42 in one part. |

### Counts

| Count | Revision 12 as amended | The first draft | Revision 13 |
|---|---|---|---|
| Rows marked "must change" in sections 11.9 to 11.11 | 10 | 17 | 20 |
| Of those, owed | 9, at `a3e5a77e` | 15 | 19 |
| Items of the list "Source impact" in this file | 12 | 19 | 22 |
| Open points, newest | R1-49 | R1-52 | R1-54 |
| Decisions of the newest table of section 1 | D12-1 to D12-8 | D13-1 to D13-13 | D13-1 to D13-17 |
| Witnesses of section 18 | 18.1 to 18.27 | 18.1 to 18.32 | 18.1 to 18.33 |
| Entries of the I2 deltas note with a disposition | 5 of 165 | 31 of 165, and DP3 | 165 of 165 |
| Lines of that note's section 23 that are addressed to this contract, with a row | None | 25 of 25 | 25 of 25 |
| Points "Made exact in revision 13" | None | None | 69 |

The first draft counted 26 lines, 32 entries and 170 entries, at
`40bf1e33`. At the snapshot the numbers are 25, 31 and 165: the
difference is the entry DP3 and the five entries DP1 to DP5. Each
number of the last column was counted by a script over the rows of the
main note. The same script checked that the first cells of the tables
of section 15.6l are the 165 IDs of the I2 deltas note at `744f2447`,
each once.

### What changed in the files

The first draft, against revision 12 as amended:

| File | Where | What changed |
|---|---|---|
| The main note | The opening | Two sentences in the first paragraph, and the revision line. A dated passage with thirteen decisions, a table of what was read and five limits. Sentences added to "How to read two words below" and to "Status". |
| The main note | Section 1 | A table of thirteen decisions, D13-1 to D13-13. |
| The main note | Section 4.1 | A passage, "A party list that is set whole". |
| The main note | Section 4.2 | `text-in-use` in row 11 of the order of checks. The row `unknown-message` is made exact, and a row `text-in-use` is added. A passage, "The answer to a refused act, and the path of a guard". |
| The main note | Section 6.1 | Two points: a definition's name, and a name of the form of a step kind. Two cells of the table of bounds. A passage, "How guards are counted, and the example of `propose-manifest`". |
| The main note | Section 6.2 | Two passages: "Which entries have a kind, exactly", and "Detached text, made exact". |
| The main note | Section 6.4 | One sentence replaced. Three points: the order of the names; an unbound subject inside a list form and in a condition; a type that is not `many`, with more than one item. |
| The main note | Section 6.5 | Two points: a `reason` on a nested guard, and the `where` of a `fact` guard. |
| The main note | Section 6.6 | Two sentences in "An absent source", and one in "`if` and `unless`". Four points: a redaction, made exact; a text that a request carries; a notice of a timed rule; how a clause finds its form and its subjects. |
| The main note | Sections 6.7 and 6.8 | In 6.7, three sentences at the end of the point on an unbound subject. In 6.8, one paragraph. |
| The main note | Section 7.5 | One cell of the table of bounds, and two paragraphs. |
| The main note | Sections 9.1 to 9.5 | One sentence in 9.1. In 9.2, a paragraph with two limits, and two sentences on the folded state. In 9.3, two sentences in the row of a detached text. In 9.4, one paragraph. In 9.5, the member `name`, and one paragraph. |
| The main note | Sections 11.10 and 11.11 | One sentence at the end of the count in 11.10. Section 11.11 was new. |
| The main note | Section 12 | Three rows. |
| The main note | Section 13 | One sentence in the row R1-42. A table of three open points, R1-50 to R1-52, and one paragraph. |
| The main note | Section 14 | Two rows extended, and five rows added. |
| The main note | Section 15 | The opening. Section 15.6k was new. In 15.8: one paragraph of counts, and five rows of the table of what is owed. |
| The main note | Section 18 | The heading. Witnesses 18.28 to 18.32 were new. |
| `lane-instantiations.md` | The opening | One point, on what revision 13 states. No row of a definition table, no count and no note changed. |
| `corrections.md` | This section | New. |

The completion, against the first draft:

| File | Where | What changed |
|---|---|---|
| The main note | The opening | The first paragraph and the revision line say that revision 12 is adopted. The dated passage is rewritten as "Revision 13": the two steps, seventeen decisions, the counts, a table of what was read with who read it, and seven limits. A table of where each note stands for revision 13 is added, and the table for revision 12 is headed as history. Sentences in "How to read two words below" and in "Status". |
| The main note | Section 1 | The heads of the tables of revisions 12 and 13. One cell of D13-11. Four rows, D13-14 to D13-17. |
| The main note | Section 4.1 | One sentence replaced over the `Effect` list, and one extended under it. Two passages: "A record for each form that is applied", and "The order of an entry's effects, exactly". One more form of `to` in the type `Send`. |
| The main note | Sections 5.3, 6.1 to 6.8, 6.11, 9.3, 17.2 and 17.3 | In each, one passage, "Made exact in revision 13, from the I2 source choices", at the end of the section: 69 points in all. |
| The main note | Section 6.1 | Two sentences of the passage on guards name the snapshot. |
| The main note | Section 6.6 | One sentence on the body of a `create`. Two passages: "The address of an attention send", and "`membership` in a `create`". Two sentences name the snapshot. |
| The main note | Section 7.5 | One cell of the table of bounds. The first draft's paragraph on the depth is replaced by "The depth of the decomposition chain is withdrawn". |
| The main note | Sections 9.4 and 9.5 | Each passage on a named mismatch no longer cites the later entry DP3 as its ground. |
| The main note | Sections 11.10 and 11.11 | The count at the end of 11.10. Section 11.11 is rewritten at `744f2447`: row 10 is not built there; a table of what is later than the snapshot; rows 18 to 20; one row of the table of where the source agrees; and a paragraph on three things that a second reader found. |
| The main note | Section 13 | The rows R1-50, R1-51 and R1-52. Two rows added, R1-53 and R1-54. The paragraph on the points that revision 13 answers. |
| The main note | Section 14 | Two rows reworded, and one row added. |
| The main note | Section 15 | The opening. Section 15.3c is new. One sentence at the end of 15.6j. In 15.6k: the heading, the head, rows 7, 8 and 16, and the counts. Section 15.6l is new. In 15.8: one paragraph of counts, and the rows of what is owed. |
| The main note | Section 18 | Witness 18.33 is new. |
| `lane-instantiations.md` | The opening | The same point is reworded: it no longer says "the draft", it names the snapshot, and it says that no rule of the completion changes a row. |
| `corrections.md` | This section | Renamed and rewritten. |
| `admission-read-inventory.md` | None | Unchanged, byte for byte, in both steps. Its SHA-256 was computed again, and it is `a2b8f683ff81d48d3136d8a484da1dacc26f858709223c5b2bf6d75a5da7e26f`, as revision 11 records. No rule of this revision changes what a read at admission is. |

### What was found in the note that did not agree, and how it was reconciled

| Found | Reconciled |
|---|---|
| Section 6.4 resolved the names of `also` "in the order written". The canonical bytes of a definition keep no such order. | The sentence is replaced by a rule on dependency. |
| Section 6.1 cited the companion file's row for the guards of `propose-manifest`, 23 and 70, while the pinned row and R2's adopted revision 14 have 24 and 73. | The two cells cite the pinned row, and a passage says where each number comes from. The companion file's own counts are not changed. |
| Section 4.2 said that the path of a guard is part of the answer, and no type gave it a member. | The answer has the member `path`. |
| Section 6.6 let an effect set a party list whole, and section 4.1 had no record for it. | The records are the `list` records, in a stated order. |
| Section 9.1 said that the kinds of retained input in source are three. Section 9.2 lists the bytes of a detached text. | The kind `text` is stated. |
| Section 9.2 listed what the folded state holds, without the digests that a slot has held. Section 6.6 needs them for a redaction. | They are added to the list, with what that changed in the I2 source. |
| Section 15.6g, row 128, says that the `Report` type does not change. | The row is history and is kept. Section 9.5 says that one member is added, and why. |
| Section 7.5 gave a depth of the decomposition chain, and no rule read it. | The first draft named it as point R1-50. The completion withdraws the number. |
| The sentence over the `Effect` list of section 4.1 said that an effect which would change nothing is not recorded. The source records a `state`, `party`, `ref` or `value` effect whenever its form is applied. | The first draft named it as point R1-52. The completion decides for the record, and replaces the sentence. |
| Section 4.1 gave four groups for the order of an entry's effects. Section 6.8 has the ends of the holds under a closed item, which are in none of the four. | Five groups, in a stated order. |
| Section 6.4 fetched a fact field "when a `fact` guard or a part reads it". Section 6.6 checks the kind of a fact that is only copied into a slot, which needs the entry. | Every foreign fact that a declared field names is fetched. |
| Section 6.6 refused `send-unresolved` for a send "with no `if`" whose target is none. A send whose `if` held and whose target is none was not covered. | Refused, with an `if` or without. |
| Section 16.1 reads a grant from the membership scope "named in the observing scope's genesis", and section 6.6 gave the body of a `create` no such member. | The body has `membership`. |
| Sections 6.4 and 7.4 send a notice to "the member's inbox", and the type of a send had no address that the sender can know. | An attention send is addressed to the member. |
| The first draft's sections 11.11 and 15.6k rested on `40bf1e33`, and said that row 10 was built. The commission fixes the snapshot at `744f2447`. | Both rest on the snapshot. Row 10 is owed there, and the later head has a named next reading. |
| The first draft counted 26 lines and 32 entries of 170. | 25 lines and 31 entries of 165, with the later entry DP3 kept in row 8 and marked. |

### What remains owed, beside the lists of "Revision 12"

| Owed | To |
|---|---|
| Independent review of revision 13, of its four subjects. Then the originating delivery, and the planner's adoption. | A reviewer who did not write it; then the planner |
| The ten source rows 11 to 20 of section 11.11, and row 10 in a filed head | The I2 delivery (request `efb4e323`), after revision 13 is adopted |
| A reading of what is later than the snapshot: `40bf1e33`, with DP1 to DP5, and the review repairs. Both are in the I2 delivery's second head, filed at `50bba45c` and under review. | This note's next revision, with the I2 delivery |
| Confirmation that every platform definition's name begins with `platform:`. Who may ask a scope for a text that it sent. The required arguments and the record names of each capability. How an inbox is found, and which scope `membership` names for a scope that is created beside it. Its parts of R1-53 and R1-54. Everything that "Revision 12, amended before review" lists for this owner; its revision 15 proposes answers to R1-48 and R1-49. They were not adopted when revision 15 was read, and this note has not read them in the adopted revision 16. | The authority note's successor (request `406983fe`) |
| Whether four levels of sub-issues are enforced (R1-50). Whether a row needs to remove a text that no slot holds (R1-51). The reading of its notation (DL1). Whether `settles` should list a final state (R1-45). | R2 |
| The cost of the check that no pending request carries a text. How long a text is kept. The most for `copies` and for the sources of an `attribute`. Every number of the source's table of bounds. Whether a settling entry at a full budget is to be shown on a lane definition (DK7). | R4 |
| Capacity in source beyond entries, and the amounts that the runtime holds for a pending request | The capacity follow-through `cc570904` |
| The 37 entries that are another owner's and ask nothing of this contract | The builder, with the owners that section 15.6l names |
| The forms of R1-53 and R1-54 | This note's next revision, with the authority note's successor |

### Source impact

The list "Source impact" of "Revision 12" has 12 items after its
amendment. Revision 13 reads the twelfth again, and adds ten.

1. The twelfth item, a genesis input that holds `kind`: owed at the
   snapshot `744f2447`. It is prepared at `40bf1e33`, in a follow-up of
   the I2 delivery that was not filed and not reviewed when the first
   draft read it. It is now inside the delivery's second head, filed at
   `50bba45c` and under review, which was not read. It accepts no
   source, and the item is counted as owed.
2. The thirteenth: an `attribute` effect whose named subject is unbound
   is applied, with the signer and its principal as the base.
3. The fourteenth: the answer to a refused act carries `path`.
4. The fifteenth: a report carries `name`.
5. The sixteenth: an act kind or a message name does not have the form
   of a step kind.
6. The seventeenth: no redaction of a text that a pending request
   carries, with the reason `text-in-use`; and no send of a text that
   the scope does not hold.
7. The eighteenth: the depth bound is a bound on guards.
8. The nineteenth: an `index` send may carry `if`. This is a form of
   revision 12, found while the I2 source was read.
9. The twentieth: equality puts a local fact in normal form at any
   depth, also inside a record that a part read.
10. The twenty-first: the parts `opened` and `set` read what a `hold`
    record set.
11. The twenty-second: the depth of a decomposition chain is no bound
    of the contract, and the configured value is removed.

The owner of the thirteenth to the twenty-second is the I2 delivery
(request `efb4e323`), after adoption. So the list has 22 items: 20 that
the source must change, of which 1 is repaired in a source that was
read; 1 that is owed before a deployment relies on a restored receiver;
and 1 with no change now. 19 of the 20 are owed.

Two forms that revision 13 adopts are in no item, because no delivered
source has the thing that they belong to: `membership` in a creation
message waits for the authority port, and an attention send waits for
the inbox definition. Both are I3's, and each changes bytes when it is
built. No disposition of revision 13 changes the bytes of an entry that
the I2 source writes at `744f2447`, or the digest of either pinned
definition.

### Limits of revision 13

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- The first draft was read by the writer alone. For the completion the
  writer set four second readers to compare 121 entries with the source
  at `744f2447`. A second reader's line is a report. The writer did not
  read those files again, apart from the lines that the main note
  lists. Where a row rests on a second reader, it says so.
- The source was read to dispose an entry. No test was read beyond its
  name. No source is certified, and none is accepted. The I2 base is
  under its own review, and this revision does not interrupt it.
- The witnesses, controls and timings that the I2 entries report are
  the producer's observations. A scripted capability and a scripted
  peer are stand-ins. None is evidence of a rule here.
- The authority note's revision 15 was proposed when it was read. Its
  revision 16 is now adopted, and was not read. Revision 15 was read in
  the four sections named, and its seven tables of entries were not
  read. The
  two forms that this revision adopts from its asks are this contract's
  own decisions.
- R0, the proof plan and the recovery design were not read again. The
  capacity follow-through `cc570904` was not read.
- The main note was not read again in full. Every place outside the
  sections that the opening lists was found by a search for the words of
  a changed rule. A restatement in other words could have been missed.
- The decision on the depth of a decomposition chain withdraws a number
  that the adopted lane forms cite. It is a judgment of this revision,
  and its reviewer may prefer the form that point R1-50 names.
- A script outside the repository applied the edits to the three files,
  built the tables of section 15.6l from one data value, and counted
  table rows and the forms of the two pinned definition files. No number
  in this revision is measured.

## Revision 13, corrected after review a7f1c108

2026-10-05. This is still revision 13. The independent review
`a7f1c108` read revision 13 at `7efb0f7f` and requested changes: one
finding, a P2, and five points of wording. This section says what was
corrected. It is one commit on that head. One count of section 17.2
changed. One witness, and five cells of the companion's reservations
table, follow that count. No disposition, decision, open point or form
changed, no witness was added, and the snapshot did not move. The file
`admission-read-inventory.md` is not edited. Its SHA-256 was computed
again, and it is
`a2b8f683ff81d48d3136d8a484da1dacc26f858709223c5b2bf6d75a5da7e26f`.

Section numbers are those of the main note. "Companion" is
`lane-instantiations.md`.

### The finding, and the count

**The finding.** Section 6.4, point DH4, says that every foreign fact
that a declared field names is fetched before the turn and recorded in
`uses`, whether or not a guard or a part reads it. Revision 13 made
that exact. Section 17.2 still counted, for the bytes of a reservation,
only the facts that a `fact` guard or a part reads. A settling form
could declare a bounded list of facts and read none of them. The count
then held none of the list, and admission retained all of it. So the
count was not a maximum, and the statement of section 17.3 that a
settling entry fits its own duty's reservation in every dimension did
not follow from it. The review claims no overflow at any number, and
neither does this section.

**The count, before and after.**

| | Revision 13 as filed | After the correction |
|---|---|---|
| A fact field | Counted when a `fact` guard reads it, or a part that needs the entry's bytes | Counted because the form declares it, read or not |
| A list of facts | The list's `max`, when it is read | The list's `max`, always |
| A fact inside a record, or in a list inside a record | Not stated | The sum over the record's members, and `max` times the element's count for a list, at any depth |
| A presented fact | Counted when it is read | Counted because `presents` declares it |
| The source entry of a delivery | One | One, once |
| A result clause | None | None |
| The most, in all | The bound on foreign entries of section 7.5 | The same |

**The formula, in section 17.2.** For a settling form f: n(t) is 1 for
a `fact`, `max` times n of the element type for a `list`, the sum of n
over the members for a `record`, and 0 for every other type. D(f) is
the sum of n(t) over the declared fields of f. P(f) is the number of
facts that its `presents` declares. S(f) is 1 for a handler or a
delivery, and 0 for an act. B is the bound on the foreign entries of
one entry. The count is F(f), the smaller of B and D(f) + P(f) + S(f),
and the bytes are F(f) times the bound on one foreign entry.

**Why the guarantee follows.** An entry's `uses` holds only the source
entry and the foreign facts that its input names in a declared field
or presents: no part causes a fetch, a clause fetches none, and an
input cannot name a fact in a place that the form does not declare. A
list holds at most its `max`. An input that names more than B is
refused before any fetch, and a refusal is not the settling entry.
Each entry is at most the bound on one. So F(f) entries, each at that
bound, cover what the settling entry can retain. A local fact, an
absent field and an entry that is already kept add no bytes, and that
part is released, by the rule "Nothing shared is assumed", which is
unchanged.

**Nothing is added.** The maxima are the declared ones of section 6.2
and the bound of section 7.5. No form, bound, refusal or check is new.
The source counts no bytes, so no row of what the source must change
is added or changed. Bytes in source stay with the capacity
follow-through `cc570904`, and every number with the proof plan.

### The companion's reservations table, with the arithmetic

The last column of the table is the foreign entries that a duty's
settling entries may newly retain. A script counted the fact fields of
each row of the companion. No row of these forms has a list, a record
or a presented fact, so D(f) is the number of its fact fields.

| Pending duty | The settling form | D(f) | S(f) | Before | After | The arithmetic |
|---|---|---|---|---|---|---|
| A concern that is `created` | The `result` handler of `issue` | 5 | 1 | 1 | 6 | 5 + 1. The old count left out the five fact fields, because the handler reads inside none. |
| The `create` that `add-concern` sent | The delivery of its result; then the `result` handler | 0; 5 | 1; 1 | 2 | 7 | 1 for the result's source entry, and the 6 of the row above. |
| A merge that is `intended`, `committed` or `unknown` | The `publication` handler; then the results of 33 requests | 1; 0 | 1; 1 each | 34 | 35 | 1 + 1, and 33 x 1. The field is `operation`. |
| An export that is `authorized` | The `export-settled` handler | 1 | 1 | 1 | 2 | 1 + 1. The field is `export`. |
| A `receiver-pin` that is `standing` | The `export-license` handler, for each license number | 1 | 1 | 1 for each | 2 for each | 1 + 1. The field is `export`. |

Rows that do not change, with the same arithmetic:

| Pending duty | The settling form | D(f) | S(f) | Before and after |
|---|---|---|---|---|
| A request that was sent, other than the `create` of `add-concern` | The delivery of its result, which the platform builds | 0 | 1 | 1 |
| A hold that is `held`; the deadline of a job | A timed entry | 0 | 0 | 0 |
| A job that is `requested` or `timed-out` | The acts `check` and `check-error` | 0 | 0 | 0 |
| A `closes` copy that is `set` | The `closes` handler | 1 | 1 | 2. Its one fact field, `plan`, was already counted, because an effect reads it. |
| A `pin` that is `provisional` or `held` | `pin-confirm`; `unpin`; a settlement entry | 0; 2; none | 1; 1; none | 1 + 3 + 2 = 6. Both fact fields of `unpin` were already counted. A settlement entry retains at most 2, as section 17.2 says. |
| The closing checkpoint | A checkpoint | 0 | 0 | 0 |

In three of the five changed rows the added field selects an item by
`by`. Its value is then a local fact, which is not fetched, and that
part of the reservation is released. It is counted because the form
does not say which value will arrive. Witness 18.18 uses the row of a
pin, 6, which does not change, so its numbers stand.

### The witness

No witness is added. The second witness of section 17.4, "Retained
inputs with the deciding entry", is the pure reservation witness for
bytes, and witness 18.9 names it. Its act `prove` had one field: a
list of at most 32 facts, each read by a guard. It now has a list of
at most 24 that a guard reads, and a list of at most 8 that nothing
reads. The claim reserves (1 + 24 + 8) x 256 = 8,448 KiB, as before,
so no number of the table changes. A paragraph under the table says
what the old count would have reserved: (1 + 24) x 256 = 6,400 KiB,
with nothing for the 8 unread facts, which are 8 x 256 = 2,048 KiB at
the bound.

### The five points of wording

| # | The review's point | Before | After | Where |
|---|---|---|---|---|
| 1 | Point DH15 abbreviates, and must not read as discharging the rule for a local reference inside a nested typed record | "A value whose type the definition states as `item` or `fact`, or as a list of them, is sent as section 6.4 says" | The same sentence, and a passage after the point: the words are an abbreviation; a local reference in a typed record, at any depth, is a whole fact reference on the wire; the I2 delivery's repair for nested records is owed to review at its next head, and is not read or accepted here | 6.6, point DH15; 15.8 |
| 2 | Point DI21 said "every refusal" | "a second answer on an item that is settled, and every refusal are new work" | Every refusal by a form that declares `settles` is new work. The two refusals that draw on a reservation by an owner's declaration are named as outside those words: a capability's count of decisions, and the destination's one `withdraw` | 17.3, point DI21 |
| 3 | Stale filing prose: "Neither is filed" | The follow-up at `40bf1e33` and the review repairs were called not filed, or filed with no status | Both are in the I2 delivery's second head, filed at `50bba45c` and under review. It is later than the snapshot, it was not read, and its reading is owed to this note's next revision | The opening, in five places; 11.11, one paragraph and two rows; 15.8, two rows; four places in "Revision 13" of this file |
| 4 | The authority note's standing | Revision 15 at `8dfda899`: proposed, under review, not adopted. "The proposed authority note" | Revision 16 at `7bc60cf6` is adopted (act `d6e7e878`, as the review cites it). This revision read revision 15, and the reading of revision 16 is owed to this note's next revision. The label "the proposed authority note" is "the authority note's revision 15" | The opening: the two steps, the list of decisions, the table of what was read, one limit, the table of standing, and "How to read two words below". Section 1, row D13-17. 6.6, two passages. 13, row R1-53 and one paragraph. 14, one row. 15.3c, the heading and the head. 15.6l, rows DL5 and DJ14. 15.8, one row changed and one added. Five places in "Revision 13" of this file |
| 5 | The recovery design's standing | Revision 2 at `dafb5b0c`: adopted | Revision 4 at `16777d97` is adopted (act `2621bc2f`, as the review cites it). This revision did not read it, and the reading is owed to this note's next revision | The opening: the table of what was read and the table of standing. 15.8, the added row |

Neither adoption closes a debt of source implementation. The rows of
section 15.6l that were touched keep their dispositions: DL5 is still
"not this note's", and DJ14 is still "accepted, and stated". The points
R1-48 and R1-49 stay open, as filed. No decision changed: the row
D13-17 has the same choice, with one label reworded.

### Counts

Counted again by a script over the rows of the main note, after the
correction.

| Count | Revision 13 as filed | After the correction |
|---|---|---|
| Entries of the I2 deltas note with a disposition | 165: 104 accepted and stated, 14 accepted, 10 changed, 37 another owner's | The same |
| Rows marked "must change" in sections 11.9 to 11.11 | 20 | 20 |
| Of those, owed | 19 | 19 |
| Open points of section 13 | R1-1 to R1-54 | The same |
| Witnesses of section 18 | 18.1 to 18.33 | The same |
| Points "Made exact in revision 13" | 69 | 69 |
| Cells of the companion's reservations table with another number | | 5 |

### What changed in the files

| File | Where | What changed |
|---|---|---|
| The main note | The opening | One sentence in the first paragraph. A dated passage, "Revision 13, corrected after review a7f1c108". The two steps: two phrases. The list of decisions: one phrase. The paragraph of counts: the status of row 10. The table of what was read: four rows. One limit of the seven. The table of standing: its head and three rows. One sentence each in "How to read two words below" and in "Status". |
| The main note | Section 1 | One label in the row D13-17. No decision is added, and none changes. |
| The main note | Section 6.4 | One sentence added to the point "A message's fields", which says that point DH4 replaces the sentence before it. |
| The main note | Section 6.6 | A passage at the end of point DH15. One phrase in each of "The address of an attention send" and "`membership` in a `create`". |
| The main note | Section 11.11 | The paragraph "What is later than the snapshot", and two rows of its table. No row of what the source must change. |
| The main note | Sections 13 and 14 | In 13: one phrase in the row R1-53, and the paragraph on the points that revision 13 answers. In 14: one phrase in one row. |
| The main note | Section 15 | 15.3c: the heading and the head. 15.6l: one sentence in each of the rows DL5 and DJ14. 15.8: three rows reworded, and one row added, for the two readings that are owed. |
| The main note | Section 17 | The head: one paragraph. 17.2: one sentence of "Bytes of a reservation"; the row "Foreign entries"; and a new point, "Every fetched fact is counted". 17.3: one sentence in the row "Settling"; a paragraph, "The guarantee, restated"; and point DI21. 17.4: the second witness, in its head, its step 4 and one paragraph under its table. |
| The main note | Section 18 | Witness 18.9: four sentences. |
| `lane-instantiations.md` | The opening | One point, "What the correction of revision 13 changed, by hand". |
| `lane-instantiations.md` | Section 1 | One sentence on what the `result` handler fetches. Four sentences over the reservations table. The last column of five rows. |
| `corrections.md` | "Revision 13" | Status labels in nine places: the head, the table of the input snapshot, "Not covered", the head of "The forms that the proposed authority note asks for", one row of the table of rules, two rows of what remains owed, one item of "Source impact", and one limit. Each says what is so now, and keeps what was read. |
| `corrections.md` | This section | New. |
| `admission-read-inventory.md` | None | Unchanged, byte for byte. |

### What remains owed, beside the lists of "Revision 13"

| Owed | To |
|---|---|
| Independent review of the corrected revision 13. Then the originating delivery, and the planner's adoption. | A reviewer who did not write it; then the planner |
| A reading of the authority note's adopted revision 16 at `7bc60cf6`, and of the recovery design's adopted revision 4 at `16777d97` | This note's next revision |
| A reading of the I2 delivery's second head, `50bba45c`, which is under review; and of its next head, with the repair of the wire form of a local reference inside a nested typed record | This note's next revision, with the I2 delivery |
| The bytes of a reservation in source, by the corrected count | The capacity follow-through `cc570904` |
| Every number: the bound on one foreign entry, the bound on the foreign entries of one entry, and the budgets | The proof plan |

### Limits of the correction

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- The correction read the verdict in full, and the parts of the three
  files that the main note's dated passage lists. The main note was not
  read again in full. Every other place was found by a search for the
  words of the old count and of each stale label. A restatement in
  other words could have been missed.
- The authority note's revision 16, the recovery design's revision 4
  and the I2 head `50bba45c` were not read. No adoption act was
  checked. The two acts are named as the review `a7f1c108` cites them.
- The count is by declaration, and so it counts a fact field that will
  hold a local fact. That reserves more than is needed, it is finite,
  and it is released. A reviewer may prefer a count that leaves out a
  field which a `by` name reads. This correction did not make that
  change, because it would add a rule of derivation.
- One sentence was seen and not changed. Witness 18.18 says, of its
  case 2, that a `merge` fact which the message had named would not be
  in `uses` of the written refusal, because no guard had read it. Point
  DH4 of section 6.4 records every fetched fact in `uses`, and says
  that a written refusal records what was read. Whether a written
  refusal keeps a fetched fact that no guard reached is not decided
  here. A refusal is new work and draws on no reservation, so the
  finding does not turn on it. Owner: this note's next revision.
- A script outside the repository applied the edits to the three files,
  counted the fact fields of the companion's rows, and counted table
  rows. No number in this correction is measured.

## Revision 14

2026-10-05. Revision 13, as corrected at `86c6aabd`, was approved
(`636df0ac`) and adopted. Revision 14 is its successor, for the
commission `10e7093d`. The commission is bounded, and this section says
where each thing that it names was done. Revision 14 is a proposal until
it is reviewed and adopted. Section numbers are those of the main note.
"Companion" is `lane-instantiations.md`.

Two of the four subjects did not change. The companion is unchanged,
byte for byte: no row of it follows from a rule of this revision, and
its reservation of a pin already counts the `merge` of an `unpin`. Its
SHA-256 is
`399359e9ce160952cda10ece1d3729a833d19d0ad5b96764130a7b0556f1af05`. The
file `admission-read-inventory.md` is unchanged, byte for byte: no rule
of this revision changes what a read at admission is. Its SHA-256 was
computed again, and it is
`a2b8f683ff81d48d3136d8a484da1dacc26f858709223c5b2bf6d75a5da7e26f`, as
revision 11 records.

### What the commission names, and where each was done

| # | The commission asks | What revision 14 decides | Where | An entry's bytes |
|---|---|---|---|---|
| 1 | Resolve P19 and point R1-53, observation ancestry, for I3's retained interfaces | An `act`, an `outcome` and a delivery of a result may hold `observed`, a list of `ObservationUse` records. An observation is of a key, of a member or of the rules. Each is judged by the guards of a grant's observation, and its entry is never clamped. Three rules relate the observations of one scope: reads are numbered in a run, runs do not return, and the heads that are retained for one subject do not go back. A later entry reads an earlier entry's observations as history only. | 4.1; 16.1, "An observation outside a grant"; 9.3; 9.4; witness 18.34; D14-1 and D14-2 | An entry that retains such an observation has the member `observed` in its input. No other entry changes, and no grant changes. No source writes one today. |
| 2 | Resolve P21 and point R1-54, non-text bytes | `Beside` is `{ texts?, presented?, values? }`. A value is matched by its digest in the domain that a stated place names, is one retained input under that domain and digest, is never redacted, and is counted like a text. No byte domain of this contract is added. No value travels beside a message. | 6.2, "A value beside an intent"; 17.1; 17.2; witness 18.35; D14-3 | None. The entry holds the digest in an ordinary field. |
| 3 | Reconcile witness 18.18 with eager fetch and custody | Both of the commission's ways are taken, in different cases. Cases 2 to 4 leave the optional `merge` out, and say so: 116 KiB stands. Cases 5 and 6 are new, and count a `merge` of 40 KiB: 156 KiB. The rule: an entry that is written for an input keeps every foreign entry that was fetched for it, and a fetched declared fact is never dropped from a written refusal. | 6.5, "A written entry records every entry that was fetched for its input"; 17.2; 17.3; witness 18.18; D14-4 | The `uses` of a request that is refused by the reading of a field, when a later field named a foreign fact: row 23. |
| 4 | Decide the canonical rule for reading a field of another scope's entry | A reader knows the entry's bytes, its kind and the name of its definition. A field is the value that the bytes hold, with no declaration of the reader. The mark is a record there. A record with a boolean member `self` stays a record. The mark is read as the sender's entry only by the scope that received the message, in a field that it declares as a fact or a list of facts. The wire form does not change, and no point is opened for it. | 6.2, "What a reader knows of another scope's entry" and point DR6; 6.5, point DR9 with its table; 6.6, "Why the mark stays"; witness 18.36; D14-5 | None. |
| 5 | Decide the first item of entry DR15 | A number that a part reads in another scope's entry is no item of the reader. An effect that would put it in a slot of type `item` is refused `bad-field`, and it equals no value of type `item` in a comparison. | 6.5, point DR15; D14-6 | None today. Row 21 changes what is admitted. |
| 6 | Carry the target-chain depth through settlement, and the nested item and equality rules, into the ledger | Each of the 20 later entries, DP1 to DP5 and DR1 to DR15, has one disposition. Depth counts the chain of foreign facts from the target in both phases, and a limit that is reached in the settlement gives `incomplete`. | 15.6m; 9.4, "What depth counts, in both phases"; 6.2 to 6.6 and 7.4, the points "Made exact in revision 14"; 11.12; witness 18.37; D14-7 and D14-8 | None. |
| 7 | Coordinate with the authority note's successor, request `f1142e84` | What it may rely on, what stays its own, and what is asked of it, are listed. Activation, the license binding, the `withdraw` exception and the workspace predicate are not decided. | 15.3d | None. |
| 8 | Read the adopted authority note's revision 16, the adopted recovery design's revision 4 and the I2 source at `58465dbf` | Read, in the parts that the opening lists, by the writer and by second readers. | The opening, "What revision 14 read"; 11.12; 15.9 | None. |
| 9 | No second capacity mechanism, and no source review | No mechanism, no dimension and no number is added. One existing number is given a second use: an entry retains no more observations than the bound on its foreign entries. The source is read to state what it does, and is not accepted. | 16.1; 17.1; 17.2; 11.12 | None. |

The I3 deltas note is not named by the commission. The builder asked for
its entries E1 to E13 to be answered where they ask this contract a
question: section 15.6n, with one rule stated in section 9.3 (D14-9).

### The point of the approval `636df0ac`

The approval names one thing that does not block: lines 10611 to 10613
of revision 13, in witness 18.18, said that a fetched `merge` fact would
not be in `uses` of a written refusal, and would be discarded. That was
against point DH4 of section 6.4 and against section 17.3. The sentence
is removed, and witness 18.18 is rewritten.

The numbers of the witness, as a script added them up. They are made up,
and none is measured. All are in KiB.

| Case | Used before | Free before | The entry and what it retains | Fits | After |
|---|---|---|---|---|---|
| The reservations | | | The pin: (3 + 6) x 256 = 2,304. The closing checkpoint: 256. Reserved: 2,560. | | |
| 2 | 7,000 | 10,000 - 7,000 - 2,560 = 440 | 6 + 20 + 90 = 116 | Yes | Used 7,116 |
| 3 | 7,340 | 10,000 - 7,340 - 2,560 = 100 | 116 | No | Nothing written, nothing charged |
| 4, settling | 7,340 | 100 | 116, from the pin's reservation | Yes, whatever is free | Used 7,456. Released 2,304 - 116 = 2,188. Reserved 256. |
| 5, new | 7,000 | 440 | 6 + 20 + 90 + 40 = 156 | Yes | Used 7,156 |
| 6, new | 7,340 | 100 | 156 | No | Nothing written, nothing charged |

Cases 1 to 4 keep the numbers that revision 10 gave them. Three
statements now agree. Section 6.5: a written entry holds, in `uses`,
every foreign entry that was fetched for its input. Section 17.2: a turn
that writes discards no fetched entry. Section 17.3: fetched bytes are
discarded in one case only, when the turn writes no entry. One sentence
of revision 8 in section 6.5, "An entry is fetched when a `fact` guard
names it", is marked as replaced by point DH4.

### The list of what the source must change

Counted by a script over the rows of sections 11.9 to 11.12.

| | Revision 13 | Revision 14 |
|---|---|---|
| The source that was read | `744f2447`, with the follow-up at `40bf1e33` | `58465dbf`, with its notes at `77555943`. Under review. Not accepted. |
| Rows marked "must change" | 20 | 23 |
| Built or repaired in a source that was read | 1: row 7, at `a3e5a77e` | 3: row 7; row 10, the genesis kind; and row 18, equality in normal form inside a record, built by the repair that entry DR12 records |
| Owed | 19 | 20: rows 1 to 6, 8 and 9; rows 11 to 17, 19 and 20; and rows 21 to 23 |
| Rows added | 10: rows 11 to 20 | 3: row 21, a number of another scope is no item; row 22, an own request whose body states no name is read from its bytes; row 23, a written refusal holds every fetched entry in `uses` |

Row 10 was read in `kindOf` of `operand.ts`, which was read whole, and
by a search for the line of each of its other four parts. Row 18 was
read in `equal` of the same file. Rows 11 to 16, 19 and 20 were checked
by a search for the words of each, and are not built. Row 17 was not
reached, and is counted as owed. Rows 1 to 3, 5, 6, 8 and 9 were not
read again.

### The later entries of the I2 deltas note

Section 15.6m has one row for each of DP1 to DP5 and DR1 to DR15.
Counted by a script.

| Disposition | DP | DR | Both | With the 165 of section 15.6l |
|---|---|---|---|---|
| Accepted, and stated | 1: DP1 | 13: DR2 to DR14 | 14 | 118 |
| Accepted | 0 | 1: DR1 | 1 | 15 |
| Changed | 1: DP3, row 13 | 1: DR15, row 21 | 2 | 12 |
| Not this note's | 3: DP2, DP4, DP5 | 0 | 3 | 40 |
| All | 5 | 15 | 20 | 185 |

13 points state the rules, under the words "Made exact in revision 14",
in seven passages: section 2.1, DR5; section 6.2, DR6 and DR12; section
6.4, DR8 and DR14; section 6.5, DR9 and DR15; section 6.6, "DR2, DR13"
and DR11; section 7.4, "DR3, DR7" and the handler restated; section 9.3,
E13 and the inputs that retain observations. The depth of a traversal,
for DR4 and DR10, is a passage of its own in section 9.4.

### The I3 deltas

Section 15.6n has six rows: E1, E2, E8, E9, E10 and E13. Four are
accepted: E1 as a report, E2, E8 with its rule stated, and E9 inside one
condition. E13 is accepted and stated. E10 is left open, with its
question for the authority note's successor. E7 is answered by section
16.1. E5 is the builder's. E3, E4, E6, E11 and E12 are the authority
note's. No row of what a source must change is added for I3.

### What changed in the files

| File | Where | What changed |
|---|---|---|
| The main note | The opening | Two sentences of the first two paragraphs. A dated passage, "Revision 14", with its list of decisions, its counts, what changes in an entry's bytes, the table "What revision 14 read" with six limits, and the table of standing. Sentences in "How to read two words below" and in "Status". |
| The main note | Section 1 | The head of the table of revision 13. A new table, D14-1 to D14-9. |
| The main note | Section 2.1 | Point DR5. |
| The main note | Section 4.1 | The member `observed` in three inputs of the type listing. A passage, "An input may retain observations". |
| The main note | Section 6.2 | One sentence in point DJ1. Two passages: "A value beside an intent" and "What a reader knows of another scope's entry". Points DR6 and DR12. |
| The main note | Section 6.4 | Points DR8 and DR14. |
| The main note | Section 6.5 | Sentences that mark the revision 8 rule of a fetch as replaced. A point, "A written entry records every entry that was fetched for its input". Point DR9, with the table of what `{ field }` reads. Point DR15. |
| The main note | Section 6.6 | Points "DR2, DR13" and DR11. A passage, "Why the mark stays". |
| The main note | Section 7.4 | Point "DR3, DR7", and the handler restated. |
| The main note | Sections 9.3 and 9.4 | In 9.3: the row "An observation", and two points, E13 and the inputs that retain observations. In 9.4: a passage, "What depth counts, in both phases"; three rows of the table of failures; one sentence on a named mismatch. |
| The main note | Section 11 | 11.10 and 11.11: one sentence each. 11.12: new. |
| The main note | Sections 13 and 14 | In 13: the rows R1-53 and R1-54, decided; a table with R1-55 and R1-56; a paragraph on what revision 14 answers. In 14: five rows, and one more sentence in the row "Nothing was run". |
| The main note | Section 15 | The head: three sentences. 15.3c: two cells and one sentence. 15.3d: new. 15.6l: one sentence. 15.6m and 15.6n: new. 15.8: one paragraph, one row changed, three rows extended and five rows added. 15.9: a passage, "Read again at revision 4, for revision 14". |
| The main note | Section 16 | 16.1: two lines of the type listing, one sentence, one cell, and the passage "An observation outside a grant". 16.5: one row. |
| The main note | Section 17 | 17.1: one row and one sentence. 17.2: one row; one sentence on what an outcome retains; three places in the row of entries fetched before the turn. 17.3: two sentences. |
| The main note | Section 18 | The heading. Witness 18.18, rewritten. Witnesses 18.34 to 18.37, new. |
| `corrections.md` | This section | New. |
| `lane-instantiations.md` | None | Unchanged, byte for byte. |
| `admission-read-inventory.md` | None | Unchanged, byte for byte. |

### Counts

Counted again by a script over the rows of the main note.

| Count | Revision 13, as adopted | Revision 14 |
|---|---|---|
| Entries of the I2 deltas note with a disposition | 165: 104 accepted and stated, 14 accepted, 10 changed, 37 another owner's | 185: 118, 15, 12 and 40 |
| Rows marked "must change" in sections 11.9 to 11.12 | 20 | 23 |
| Of those, owed | 19 | 20 |
| Open points of section 13 | R1-1 to R1-54 | R1-1 to R1-56. Two are decided, R1-53 and R1-54, and two are added. |
| Witnesses of section 18 | 18.1 to 18.33 | 18.1 to 18.37. One is rewritten, 18.18. |
| Decisions of section 1 | Through D13-17 | D14-1 to D14-9 are added |
| Points "Made exact in revision 14" | | 13, in seven passages |
| Rows of section 15.6n, for the I3 deltas | | 6 |
| Forms P13 to P25 of the authority note | 2 adopted, 9 platform code, 2 open | 4 adopted, 9 platform code, none open |

### The adversarial reading of items 1, 2 and 4

Before filing, the writer read the three decisions again as a party that
wants to break them. Three questions were asked. Each answer names the
rule that holds it, and what was changed because of the reading.

**Can a sender make a reader keep bytes without a reservation?**

- *Observations.* No sender supplies one. A scope reads them itself, and
  no intent, message, envelope or `Beside` carries one. They are inside
  the entry, so the entry size bounds them, and the static size of the
  entry form counts the most that its specification states. A sender can
  raise the number that one entry reads only inside that most: the
  checks of a `publish`, at most 32, or the verdicts of a `reserve`,
  which the authority note bounds before any fetch. An entry that
  retains observations as a settling entry draws on a reservation that
  was sized with them.
- *Values.* A scope reads at most as many values as the act's stated
  places can name, none longer than the bound of its domain, and only
  after the signature holds. *Changed by this reading:* the passage now
  says that the values are checked with the fields, after the signature.
  A value is kept only with a written entry. The two acts that name one
  are new work, so admission counts the value, and `scope-full` keeps
  nothing. A scope under a declared definition has no place, reads no
  value and keeps none. No value travels beside a message, so no other
  scope can push one. A definition's closure is bounded by the bound on
  a closure, whatever the definition's bytes name.
- *A written refusal.* It now keeps every entry that was fetched for its
  input. A sender of a kind and a definition that a handler receives can
  so make a scope retain up to the bound on foreign entries with one
  refused request. That is not new: a refusal is new work, it is written
  only if the entry and what it retains fit in the room that is free,
  and otherwise nothing is kept. The exposure that remains is the old
  one, that such a sender can use up free room. It is R4's, with what a
  full lane does next.
- *A message that no handler receives.* Nothing is fetched and no text
  is kept for it (section 6.4, point DR14). That closes a way in which a
  sender under another definition made a scope fetch and keep bytes.

**Can a reader be made to accept wrong evidence by how another scope's
entry is shaped?**

- *The mark.* A scope that records a message cannot make another reader
  take a record for a fact, or a fact for a record: the other reader
  applies no type. The I2 base let a reader's own handler of the same
  name turn a record into the sender's fact reference, and a `fact`
  guard with `where` passed on it. The rule removes that.
- *A whole reference in a field.* A scope can record any whole fact
  reference in a field of its own entry. A reader reads it as what that
  entry holds, and never as "who sent the message": no part reads the
  `from` of another scope's delivery.
- *A number.* *Changed by this reading.* The first draft of point DR15
  refused a number of another scope as the source of an `item` slot, and
  left a comparison with the reader's own item as an open point. A party
  that chooses which entry to present can choose one whose number equals
  the reader's item. So the comparison is decided too: such a number
  equals no value of type `item`. A script over the two pinned files
  found one such comparison, in the `closes` handler of `issue`, and it
  stands beside a comparison of the scopes. So no pinned outcome
  changes, and the open point was not filed.
- *What the rule does not close.* A definition's name is not proof that
  a repository activated it (point R1-22). A scope under another
  definition of the same name passes an `under` check. That is the
  authority note's, and nothing here makes it worse: the reader now
  applies none of its own types to such an entry.

**Can an observation be replayed across runs?**

- *By an honest runtime: no.* An observation is used only in the run
  that read it (guard 2), and a scope holds none after a restart.
- *In a history.* The entries of one run are not separated by an entry
  of another, or the history is `run-returned`. An observation that is
  copied into a later run under its old read is found when an entry of
  the new run lies between. One that is copied under a new number, with
  no read made, is not found. That is the claim that a report lists as
  `trusted: observation-read`, and the operator vouches for it. This
  revision does not narrow that trust.
- *What the new rule adds.* The heads that are retained for one subject
  do not go back, across runs too. So a copied observation cannot show a
  standing older than one that the scope already retained. In particular
  it cannot show a key active after an entry retained its revocation,
  because the value at any head that is not lower shows the revocation.
- *From another scope.* An observation names no observer. A runtime that
  copied one from another scope's entry would claim a read that it did
  not make. An honest runtime reads no observation from any entry, and
  the claim is again the trusted one. The value is still checked against
  membership's history at its head, and the window against the entry's
  time.
- *Changed by this reading:* the passage on a failed guard said that a
  settling entry waits. It now says that a settling entry is never
  refused for want of an observation, and that what it does without one
  is the definition's.

### What remains owed, beside the lists of "Revision 13"

| Owed | To |
|---|---|
| Independent review of revision 14. Then the originating delivery, and the planner's adoption. | A reviewer who did not write it; then the planner |
| Rows 21 to 23, after adoption, with the 17 rows that were owed before and are not built | The I2 delivery (request `efb4e323`), and I1 for its rows |
| The forms `observed` and `values` in source, and the guard of a grant's freshness proof | I3 |
| For each row that needs an observation: its window, its subject and the most of one entry. The members of the two further kinds of observation (R1-55). Confirmation of the order of heads. Which entry records `dispatched`. Activation, the license binding, the `withdraw` exception and the workspace predicate. | The authority note's successor (request `f1142e84`) |
| The four seams of the recovery design that ask for a form (R1-56) | This note's next revision, with the authority note's successor |
| The bound on one value of each domain, the limit on depth, and the bound of 64 containers | R4 |
| The sections of the recovery design that nobody read for this revision, and the corrections and facts files of the authority note | This note's next revision |

### Limits of revision 14

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- The source was read at `58465dbf` by its commit, in the lines that
  section 11.12 lists. Where a row says "by a search", the function
  around the line was not read. No test was read. This is not a review
  of that source, and it accepts none of it.
- The authority note's revision 16 was read by the writer in the parts
  that decide the two forms, and by four second readers elsewhere. The
  recovery design was read by one second reader only. A second reader's
  report is a summary.
- The authority note states two things about the entry that records
  `dispatched`, and its row for `open-task` does not say whether the
  worker's standing is a second observation. The form covers each
  reading. Which is meant is that note's.
- The members of an observation of a member and of the rules are this
  note's reading of that note's prose. Only the tag and the four common
  members are this contract's rule.
- The order of heads is stricter than the authority note's text in one
  case, and costs one more read there. It is asked of that note, and is
  not claimed as agreed.
- A script outside the repository applied the edits to the two files
  that changed, added up the made-up numbers of witness 18.18, read the
  two pinned definition files as JSON, counted table rows and points,
  and computed two SHA-256 values. No number in this revision is
  measured.

## Revision 15

2026-10-05. On the adopted revision 14 at `fa6417e6`. It is filed with
the authority note's revision 20. It is a proposal until it is reviewed
and adopted. It was written in two parts, each one commit. The sections
from here to "Limits of revision 15" are the first part. "The second
part of revision 15" follows them. Section numbers are those of the main
note. "The deltas note" is `notes/2026-10-05-i3-contract-deltas.md` at
`5e5583e7`. "Revision 19" and "revision 20" are the authority note's:
revision 19 at `c3f2f103` was reviewed (`d2068c05`), changes were
requested, and it is not adopted. Revision 20 answers that verdict and
holds revision 19's content. The first part was written before the
verdict was known here, and says "if revision 19 is adopted". Read: if
revision 20 is adopted.

The companion `lane-instantiations.md` and the file
`admission-read-inventory.md` are unchanged, byte for byte. Their
SHA-256 values were computed again, and are the two that the section
"Revision 14" records: `399359e9` and `a2b8f683`. No row of either
follows from a rule of this revision: a declared definition holds no
mark.

### What was asked, and where each thing was done

| # | Asked | What revision 15 decides | Where | An entry's bytes |
|---|---|---|---|---|
| 1 | What platform code is, and how it joins a row (the deltas note, entry EC6, questions 1 and 2) | A platform definition is data and rules. The data holds a mark at each place where a rule is needed. The rule is run where a form of that kind would be derived, and replaces no written form. Seven places. | Section 6.1, "Platform code: a mark, and its rule"; section 15.3e | None changes |
| 2 | How a definition marks a place | In the data: a record `{ code, row }` at the place itself, and the member `outcomes` for the operation kinds. No table beside the data. | Section 6.1; section 11.13, row I3-3 | The data of a platform definition. No digest is pinned for one. |
| 3 | What the validator does at a mark | With its platform option it accepts the mark, lists it and derives nothing. Without the option it refuses it. | Section 6.1 | None |
| 4 | Where a rule runs among the checks (EC6, question 3) | At the check of its place, 7 to 12. A rule at `grant` stands in place of check 9. | Section 4.2: six cells of the table, and "Marks in the order of checks" | An act entry that such a rule passed records `authority: []` |
| 5 | The order of rules (EC6, question 4) | The order of the checks, and inside a written list the order of the list | Section 6.1 | None |
| 6 | The forms of what a rule returns, and the refusal reasons | Members of `Effect` and `Send`, a `Reason`, an item, or a yes or no. Three rows of the table of reasons are extended. No code is added. | Sections 4.2 and 6.1 | None: no member is added |
| 7 | What a replay does | It derives each entry again with the same data and rules, from what the history, the retained inputs and the caller's bounds hold. Without a rule: `unsupported-definition`, at the genesis. It trusts that its rules are the version's, and says so. | Section 9.3: one row and two points | None |
| 8 | The whole-scope refusal when a rule is absent (EC4) | Confirmed, with the words of the rule for a capability form | Section 6.1 | None |
| 9 | What "a slot typed by code" means for the commit's type check (P22) | The type is a mark, the value is still a `FieldValue`, and the mark's rule makes the type check, for each effect that sets the slot. A slot whose type the forms can write is not typed by code. | Section 6.1; section 15.6o, entry E10 | None |
| 10 | The four things that revision 19 asks | Each is taken, and each depends on that revision's adoption. One is taken in both directions, which is stricter than asked. | Sections 15.3e and 16.1 | An observation of a member gains `activeKey`, and `content` has a type, if revision 19 is adopted. No source writes either yet. |
| 11 | Witnesses | Two, pure, at the judge and at the validator | Section 18: 18.38 and 18.39 | None |
| 12 | The open points | Four are added: R1-57 to R1-60. R1-55 is answered for this contract's part. | Section 13 | None |
| 13 | What the I3 source must change | A list of its own, 9 rows | Section 11.13 | None |

### What changed in the files

| File | Where | What changed |
|---|---|---|
| The main note | The opening | One sentence of the first paragraph, and the first words of the second. A dated passage, "Revision 15, a draft", with its list of decisions, its counts, what changes in bytes, the table "What revision 15 read" and four limits. |
| The main note | Section 1 | A new table, D15-1 to D15-5. |
| The main note | Section 4.2 | Six cells of the table of checks, 7 to 12, each with one sentence, and one reason added to the cell of check 11. A passage, "Marks in the order of checks". Three rows of the table of reasons, each with one or two sentences: `unauthorized`, `guard-failed` and `unsupported-definition`. |
| The main note | Section 6.1 | A passage at its end, "Platform code: a mark, and its rule", with a type listing and a table of seven places. |
| The main note | Section 6.11 | One paragraph, "Platform code is no capability". |
| The main note | Section 9.3 | One row of the second table. Two points, under "Made exact in revision 15". |
| The main note | Section 11 | 11.13: new. |
| The main note | Sections 13 and 14 | In 13: a table with R1-57 to R1-60, and a paragraph on what revision 15 answers. In 14: two rows. |
| The main note | Section 15 | 15.3e and 15.6o: new. 15.8: one paragraph, and four rows of what is owed. |
| The main note | Section 16.1 | Two lines of the type listing, and one type added to it, with a paragraph under it. Two cells of the table of rows. Two passages: "A key's observation is also of its member" and "What the authority note's revision 19 states". |
| The main note | Section 18 | The heading. Witnesses 18.38 and 18.39, new. |
| `corrections.md` | This section | New. |
| `lane-instantiations.md` | None | Unchanged, byte for byte. |
| `admission-read-inventory.md` | None | Unchanged, byte for byte. |

Nothing else was changed. No sentence of an earlier revision was
rewritten, apart from the cells and lines that this table names.

### Counts

Counted by a script over the rows of the main note.

| Count | Revision 14, as adopted | Revision 15 |
|---|---|---|
| Rows marked "must change" in sections 11.9 to 11.12 | 23, of which 20 owed | 23, of which 20 owed. Not counted again against a source. |
| Rows of section 11.13, for the I3 source | | 9, all owed. One is built in part. |
| Open points of section 13 | R1-1 to R1-56 | R1-1 to R1-60. Four are added. |
| Witnesses of section 18 | 18.1 to 18.37 | 18.1 to 18.39. Two are added. |
| Decisions of section 1 | Through D14-9 | D15-1 to D15-5 are added |
| Rows of section 15.3e | | 4 for the questions of EC6, 3 for what was weighed, 13 for P13 to P25, 4 for revision 19's asks |
| Rows of section 15.6o, for the deltas note | | 12: 3 decided, 1 confirmed, 1 not adopted, 5 accepted, 2 another owner's |
| Places where a mark may stand | | 7 |
| Forms P13 to P25 of the authority note | 4 adopted, 9 platform code, none open | The same. 11 of the 13 now name a place, and 2 have no mark. |

### The adversarial reading

Before this draft was written down as finished, the writer read the
decision again as a party that wants to break it. Five questions were
asked. Each answer names the text that holds it, and what stays open.

**1. Can a platform rule write an entry form that the contract lacks?**

- A rule returns a value of its place's type: effects that are members
  of `Effect`, requests that are a `Send`, a `Reason`, an item, or a yes
  or no. No place returns an input, an entry or a member of one.
- Of `Effect`, a rule returns eight members and no other. It returns no
  `record`, which is a capability's; no `redact`, which is an act's
  written form with its own rule on pending requests; no `relation`,
  `activate` or `index`, which the common judges derive; and no `hold`.
- A result outside those is a fault of the rule. Nothing is written.
  Witness 18.38, cases 5 and 6.
- What was changed by this reading: the list of the eight members. The
  first wording said "members of `Effect`", which would have let a rule
  write a capability's record.
- Open: an entry of a rule can still hold more effects than a written
  row may. That is point R1-59.

**2. Can a rule read anything that the entry does not retain?**

- The list of what a rule is given has six parts. Parts 1, 2, 4 and 5
  are the history and the entry's retained inputs. Part 3 is the entry's
  time. Part 6 is derived from them, with the caller's bounds, which a
  replay already reports as configuration.
- A rule is not given the bytes of a detached text. A redaction removes
  them, and a rule that read them could not be derived again. It reads
  the digest.
- A rule reads an observation only from the grant or from `observed`. A
  standing that a rule needs and the input lacks leaves a guard rule not
  completed, and nothing is written.
- What was changed by this reading: the sentence on detached texts, and
  "the result of a read that the entry does not retain" in the list of
  what a rule is not given.
- Open, and stated: a rule that validates a definition's bytes reads the
  bounds. A verifier with other bounds may derive another answer, as it
  may for any entry (section 9.3, "How a judgment is derived again").

**3. Can a declared definition reach a mark?**

- A mark is a form that the validator refuses without its platform
  option. The option is reachable from no input (section 15.6n, entry
  E9). A founding, a creation, an `activate` and a value beside an
  intent each validate without it. Witness 18.39, cases 1 and 5.
- A declared definition cannot name a rule by another route. A `fact`
  type and a handler's `from.under` name a definition and read entries.
  A message to a platform scope runs the handler that the platform
  definition's own data holds.
- A declared definition cannot pass for a platform one: its name does
  not begin `platform:` (section 6.1, revision 13).
- Open: none found. The control that the option is reached from no input
  is the I3 source's, and it was not read.

**4. Does any row behave differently from its published data, without
the data saying so?**

- A written form in a row with marks is derived as it is anywhere. A
  rule replaces none, removes none and changes the result of none. A
  rule's effect that conflicts with a written one is a fault.
- Each place that is code holds a mark in the data. The validator lists
  them, and a runtime that lacks one rule runs nothing.
- Three things act on a scope and are no mark. They derive nothing of an
  entry: how transport finds an inbox (P23), which membership scope a
  scope names (P20), and what membership answers an observation with.
  Section 15.3e says so for the first two. The third is the authority
  note's.
- The outcome entries of an operation have no row in a definition's
  data. The member `outcomes` names each kind, so the data says that
  such entries exist and that a rule derives them.
- What was changed by this reading: `outcomes` was added. Without it the
  outcome entries were code that no part of the data named.
- Open, and stated: the data of a platform definition has no digest. So
  "published" means the text of the authority note and the data value of
  the version. Point R1-60.

**5. Is the rule at `grant` a way to act with no authority at all?**

- Who may send such an act: any key. Nothing is read about the signer
  before check 9, as for any act.
- A row has a mark at `grant` only in platform data, which no input
  supplies. The specification names the other authority for each such
  row, and the rule checks it. The authority note's revision 20 lists
  them: a founding policy, the key that a genesis recorded, an
  invitation's secret, and the recovery key.
- A rule that passed leaves `authority: []` in the entry. A replay runs
  the same rule on the same input, so an entry that no authority covers
  is a `mismatch`. Witness 18.38, cases 2, 8 and 9.
- Checks 1 to 8 are made first, and `notAfter` and the idempotency index
  with them. A rule does not change them.
- What was changed by this reading: the sentence that a mark which
  states no action reads no observation, so that a join is not answered
  `authority-unavailable` for a key that membership does not know; and
  the point "The rule is no way around check 9".
- Open, and it is the authority note's: one of its rows says "the
  recovery key when no admin can act". The records do not show that no
  admin can act. Its revision 20 says what the rule checks.

### What remains owed, beside the lists of "Revision 14"

| Owed | To |
|---|---|
| Independent review of revision 15, with the authority note's revision 20. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| The adoption of the authority note's revision 19. Four answers depend on it. | That note's review |
| The 9 rows of section 11.13, after adoption | The I3 delivery |
| Each rule of the seven platform definitions, with the most that it returns (R1-59). The name of a refusal at `grant` (R1-57). Confirmation of the order of heads in both directions. | The authority note's successor |
| Whether a platform version is also named by a digest (R1-60) | The planner, with N5 and R4 |
| The 29 entries of the deltas note that section 15.6o does not name, and the entries that it gained after `5e5583e7` | This note's next revision |
| The three confirmations of point R1-56 | This note's next revision |

### Limits of revision 15

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One writer wrote it, with no second reader. The opening's table "What
  revision 15 read" says what was read.
- The I3 source was read at `5e5583e7`, in six files. No test was read,
  and `packages/replay` and `packages/bytes` were not read. The rows of
  section 11.13 that name them say so. This is not a review of that
  source.
- The deltas note gained a section after `5e5583e7`, with entries of the
  prefix ED. It was seen and was not read.
- Revision 19 of the authority note is not adopted. What this draft
  takes from it is marked in each place.
- The seven places were checked against each cell of the authority
  note's section 12.1 that begins "Code". That inventory, and the cells
  that the rule did not fit, are in revision 20 of that note. For the
  task definition only the lines that hold the word "Code" were read.
- The two witnesses are tables. No judge and no validator ran them.
- A script outside the repository applied the edits, counted table rows,
  points and witnesses, and computed two SHA-256 values. No number in
  this revision is measured.

### The second part of revision 15

Two inputs came after the first part: the verdict `d2068c05` on the
authority note's revision 19, and the entries ED1 to ED17 of the deltas
note, at `ae3ea555`. One more commit carries them. The companion and the
admission read inventory are still unchanged, byte for byte.

| # | Asked | What the second part decides | Where | An entry's bytes |
|---|---|---|---|---|
| 1 | The revision record, brought up to date | Revision 15 is on the adopted revision 14. What it takes from the authority note depends on that note's revision 20, which holds revision 19's content with its repairs. The recovery design's revision 6 is adopted, and was not read. | The opening, "The second part of revision 15" | None |
| 2 | The corrected size of a rules observation's `content` | 16 KiB is withdrawn. By a script: 16,621, 24,749 and 48,813 bytes with a member ID, and 21,421, 29,549 and 53,613 with a member reference. No guard enforces less. | Section 16.1, "The bound"; section 15.3e, one cell; point R1-61 | None |
| 3 | ED2: the form of `within`, and what the read carries | `ScopeFilter` is `{ membership }`. A scope is covered by its own recorded reference. The request names no asker. The answer is the observation without `at`. | Section 16.1, "The form of `within`, and of the read"; D15-6 | None: an entry holds the observation, and `within` now has a form in it |
| 4 | ED8: a revoked answer against the guards | A revocation refuses first. The order has four steps. | Section 16.1, "A revocation refuses first"; D15-7 | None |
| 5 | ED12: the order of heads after a restart | The folded state holds the highest head for each subject. | Section 16.1, "The fold holds the highest head"; D15-7 | None. The state digest of a checkpoint covers it as it covers the index of accepted keys. |
| 6 | ED1, ED5, ED9, ED11, ED13, ED16 | Each accepted, five of the eight with the rule stated. The other eight entries are another owner's. | Section 15.6p | None |
| 7 | What the source must change | Two rows more: I3-10 and I3-11. | Section 11.13 | None |
| 8 | A witness | 18.40. | Section 18 | None |

What changed in the files, in the second part. The main note: the
opening, with one passage and the counts; section 1, two rows; section
11.13, two rows and its closing paragraph; section 13, two rows and one
sentence; section 14, one row; section 15.3e, one cell; section 15.6o,
one sentence; section 15.6p, new; section 15.8, one sentence; section
16.1, one sentence under the guards, the point "The bound", and three
passages; section 18, witness 18.40. `corrections.md`: three sentences
of this section's opening, and this part.

Counts after both parts, by a script: 62 open points, R1-1 to R1-62; 40
witnesses; 11 rows in section 11.13, all owed; decisions D15-1 to D15-7;
17 rows in section 15.6p: 2 decided, 5 accepted and stated, 2 accepted,
8 another owner's.

**The adversarial reading of the second part.** Three questions.

- *Can a scope be covered by a grant of another repository?* A filter
  covers a scope only when its `membership` is the reference that the
  scope's own genesis records, with the incarnation. The scope reads
  that from its own history. An answer from another membership scope
  fails guard 1 before the value is read. Witness 18.40, cases 2 and 3.
  What was changed by this reading: the request names no asker. The
  first wording had the asker in the request, which would have let the
  observed scope's answer depend on a statement that it cannot check.
- *Does the form of `within` drop a condition that the role table has?*
  Yes, on purpose, and it is stated. "For tasks they control" and "for
  its own task" are not in the grant. The authority note makes each a
  guard of the acting scope's row. In a platform definition that guard
  is a mark. In a declared row no form reads the signer's role, so the
  admin's wider case is open: point R1-62. Until it is decided a source
  judges the narrower case. That refuses an admin who is not the
  controller, and admits nobody more.
- *Can a revocation be hidden by a guard that discards?* Not after this
  part. A revocation is judged before the guards on freshness, so an
  observation that is too old to authorize still refuses. And after a
  restart the fold, and not memory, holds the highest head, so an answer
  from before the revocation is discarded in the commit.

Limits of the second part. The deltas note's sections 6 and 7 were read
in full, and the source that they describe was not: rows I3-10 and I3-11
rest on the note's words. The verdict was read as the builder gave it.
The sizes are the authority note's script's, run for both notes: it
builds the largest values and measures their canonical JSON, and it
assumes that a text may hold a control character. Witness 18.40 is a
table that nothing ran. Nothing was compiled, tested or pushed, and no
workroom command was run.

## Revision 16

2026-10-05. On revision 15 at `7f1ea903`, which is approved (verdict
`ac9b09f0`) and awaits adoption. Revision 14 is still the contract in
force. Written for the request `a23dc307`. It is a proposal until it is
reviewed and adopted. Section numbers are those of the main note. "The
deltas note" is `notes/2026-10-05-i3-contract-deltas.md` at `5d05de6f`.
The authority note's revision 21 is written with this revision, for the
same request.

The companion `lane-instantiations.md` and the file
`admission-read-inventory.md` are unchanged, byte for byte: their
SHA-256 values were computed again, and begin `399359e9` and `a2b8f683`.
The companion writes no outcome entry and no capability's maximum, so no
row of it follows from this revision.

### What was asked, and where each thing was done

| # | Asked | What revision 16 decides | Where | An entry's bytes |
|---|---|---|---|---|
| 1 | EH9: the kind of an outcome entry. Derive it from the entry's one record, or add the owner and the kind to the outcome input. | The second. The input holds `owner` and `kind`, which the judge reads from the `operation` effect that opened the operation. | Section 4.1, "An outcome states its owner and its kind"; one line of the type of `Input` | Every outcome entry gains two members. No deployed history holds one. |
| 2 | What `kindOf` does, and what a `fact` guard over such an entry may check | The kind is the owner, a `:` and the operation's kind. A guard checks the kind and the definition's name, and reads the parts `ref`, `scope`, `seq`, `kind` and `carried`. The kind says nothing of the result. | Section 6.2: the table of kinds, one row made two; two points | None |
| 3 | That no sender and no definition gives an entry such a kind | The rule on the form of a step kind stands. One rule is added: no act kind and no message name begins with `platform:`. | Section 6.2; section 11.13, row I3-14 | None. No pinned row is refused. |
| 4 | EH10, this contract's side: where the bound on one entry's derived effects is stated, and its shape | Each rule declares three maxima. The validator counts them into the bounds of the entry. A refusable entry past a bound is refused. For an entry that cannot be refused, a state bound is held by refusing its opening. | Section 6.1, "A declared maximum for everything that derives" | None |
| 5 | EH2: where the workspace effects stand | A sixth group, after the ends of holds and before attention. | Section 4.1, "A sixth group" | None for an entry that a pinned lane writes today |
| 6 | EH4: a bound request refused `unknown-message` | Covered: a settling entry with the one record. | Section 6.11, "A bound request that no handler receives" | None |
| 7 | The approval's wording, first point | "The membership reference, or the rules reference, that this scope records", in the first step of "A revocation refuses first" and in witness 18.40, case 2. | Sections 16.1 and 18.40 | None |
| 8 | The second point | In the row ED16: "rise" is of the reads that a run began, and so of `fresh` uses, and not of the order of entries. | Section 15.6p | None |
| 9 | The third point | Row I3-11 and "The fold holds the highest head" say that a replay finding a lower head is what the rule asks, and that no source's replay does it yet. | Sections 11.13 and 16.1 | None |
| 10 | The fourth point | The short reference to "nine rows" names the four rows that the authority note's revision 20 adds, eleven of which state a window. | Section 16.1 | None |
| 11 | The source rows | I3-12 to I3-16. | Section 11.13 | None |

What changed in the files. The main note: the opening, with one
sentence and one passage; section 1, a table of three rows; section 4.1,
one line of the type and two passages; section 6.1, one sentence and one
passage; section 6.2, one row made two and two points; section 6.11, one
passage; section 9.3, one sentence in the row of an outcome; section
11.13, five rows, one sentence in row I3-11 and its closing paragraph;
section 13, one paragraph; section 14, one row; section 15.6p, one
sentence; section 15.6q, new; section 15.8, one sentence and four rows;
section 16.1, three sentences; section 18, the heading, one cell of
18.40 and witness 18.41. `corrections.md`: this section. Nothing else
was changed.

### Counts

Counted by a script over the rows of the main note.

| Count | Revision 15 | Revision 16 |
|---|---|---|
| Rows of section 11.13, for the I3 source | 11, all owed | 16. 15 are marked "must change" and are owed. One is built. |
| Open points of section 13 | R1-1 to R1-62 | The same 62. R1-59 is decided in its shape. |
| Witnesses of section 18 | 18.1 to 18.40 | 18.1 to 18.41 |
| Decisions of section 1 | Through D15-7 | D16-1 to D16-3 are added |
| Rows of section 15.6q | | 5: 3 decided, 2 accepted and stated |
| Groups of an entry's effects | 5 | 6 |
| Places in the two lane definitions that name a kind of the form of a step kind | | 2, both `hold@1:check`, in `change`. No act and no handler's message of either lane has that form or begins with `platform:`. |

### The adversarial reading

One question was asked of this revision, and two of the paired
revision of the authority note, which records them.

**Can an outcome entry be given a kind that lets a forged or a foreign
entry pass a `fact` guard?**

- *By the component that offers the outcome.* No. The judge reads
  `owner` and `kind` from the opening effect in the scope's own
  history. An outcome that is offered with other values is `bad-input`.
  Witness 18.41, case 3.
- *By a definition, with an act of that kind.* No. A capability's kinds
  have the form of a step kind, which no act kind and no message name
  may have. A platform definition's kinds begin with `platform:`, which
  is refused from this revision. What was changed by this reading: that
  second rule. The rule of revision 13 does not cover a text whose
  first part holds a `:`, so `platform:register@1:create-repository`
  was a name that an act could have had. No scope under a declared
  definition has a platform owner, and a `fact` type also compares the
  definition's name. So nothing passed. The rule closes it by form, and
  not by that argument.
- *By a sender, with a message of that name.* No. No handler can
  declare the name, so the request is `refused`, `unknown-message`, and
  its entry has no kind. Case 6.
- *By a scope under another definition that writes a true outcome of
  the same kind.* The kind matches. The `fact` guard also compares the
  name of the source's definition, which the using entry records. A
  manifest's pin must be under `issue`.
- *By a true outcome that did not confirm.* The kind matches, and this
  is stated: a kind says nothing of the result. The rows that need a
  completed check read the carried record and its state. Case 4. What
  was weighed: giving a kind only to a `confirmed` outcome. It was not
  taken. It would make the kind depend on the result, and the two
  guards that read a presented pin already read the record.
- *By a forged entry.* A reader verifies a fetched entry against the
  hash in the fact reference, and at run time trusts the scope that
  answered (section 7.4). The two members add nothing to that trust,
  and take nothing from it. A replay of the source derives them again.
  Case 7.
- Open: none found for the kind. The trust in a fetched entry at run
  time is section 7.4's, as before.

**Can an entry that cannot be refused pass a bound?** Not under the
rule, if the version is valid: its maximum is a constant, or a constant
times a state bound that a refusable opening holds. What is not shown
here: that each existing version has such an opening for each state.
Two are named. The validator must check the rest, and no number exists
yet, so the count cannot be made today. That is said in section 6.1.

### What remains owed, beside the lists of "Revision 15"

| Owed | To |
|---|---|
| Independent review of revision 16, with the authority note's revision 21. The adoption of revision 15, and then of this one. | A reviewer who did not write it; then the planner |
| Rows I3-12 to I3-15 of section 11.13 | The I3 delivery, at its step 16 |
| The bound on the derived effects of one entry, each state bound, and each rule's maximum | R4, with `cc570904` and the owner of each rule |
| The I3 deltas EF1 and EF13, and any entry after EH12 | This note's next revision |
| That every capability and platform version states an opening for each state bound | The authority note's successor |

### Limits of revision 16

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One writer wrote it, with no second reader.
- Revision 15 is approved and not adopted. Revision 14 is in force.
- The source was read at `5d05de6f` in two files. `packages/bytes`, the
  validator and every test were not read. Rows I3-12 and I3-14 say so.
- The choice between the two forms of an outcome's kind rests on the
  texts and on two operations of `hold@1`. No outcome of a platform
  owner exists in any source.
- The rule on a maximum has no number, and section 7.5 was not read
  again: the new bound is named in section 6.1 and is not yet a row of
  that section's table.
- Witness 18.41 is a table that nothing ran.
- A script outside the repository applied the edits, counted rows,
  points and witnesses, listed the names and the kinds of two JSON
  files, and computed two SHA-256 values. No number in this revision is
  measured.

## Revision 17

2026-10-05. On the adopted revision 16 at `54420b41`. Written for two
inputs: the commission `9626787f`, for a canonical URI, and the entries
EJ1 to EJ15 of the I3 deltas note at `3d06620b`. It is a proposal until
it is reviewed and adopted. Section numbers are those of the main note.
The authority note's revision 22 is written with this revision.

The companion `lane-instantiations.md` and the file
`admission-read-inventory.md` are unchanged, byte for byte: their
SHA-256 values were computed again, and begin `399359e9` and `a2b8f683`.

### What was asked, and where each thing was done

| # | Asked | What revision 17 decides | Where | An entry's bytes |
|---|---|---|---|---|
| 1 | The grammar of a URI for a scope, a fact and an item | ABNF, with the exact characters of a scope ID, an incarnation, a position and a hash, and one encoding of an item type. No user information, query or fragment. | Section 3.1, "The grammar" | None. No entry holds a URI. |
| 2 | Normal form and equivalence: case, percent-encoding, a trailing slash, the default port | Five rules of normal form. Three relations: identical, the same scope ID, the same reference. The host is in neither of the last two. | Section 3.1 | None |
| 3 | What "same" means when incarnations differ or are absent; a fact's hash | Two incarnations of one ID are not one reference. An absent one names the scope as the host holds it, and is no `ScopeRef`. A fact URI is verified by its hash, whatever the host. | Section 3.1 | None |
| 4 | Resolution: the mapping, what each form answers, not-found, what to verify, redirects, no authority | One table of three requests, and eight points. | Section 3.1, "Resolution" | None |
| 5 | How an index row resolves | A label is no URI and no identity. Two reads, of the register and of the directory's index, give a scope URI. | Section 3.1, "A label" | None |
| 6 | The relation to the reference classes | A presentation, and no fifth class. No entry holds a URI, with the three reasons. | Section 3.1 | None |
| 7 | Unusual hosts, and bounds | A-labels, compared by bytes. 253 bytes for a host and 2,048 for a URI, as proposals. | Section 3.1 | None |
| 8 | Witnesses, open points and source rows | Witness 18.42. Points R1-64 and R1-65. Rows I3-17 to I3-20. | Sections 11.13, 13 and 18 | None |
| 9 | EJ1 | An outcome's mark holds one `send`, with clauses of effect marks. The cause of a scope that it creates is the fourth cause, which section 7.2 already has. | Section 6.1; witness 18.43 | None |
| 10 | EJ2 | The member `membership` is written by the step that builds a directory's creations, and not with the filter. A directory records its reference in a slot, and before that is covered by no filter. | Section 15.6r | None: section 6.6 stands |
| 11 | EJ3, EJ4, EJ5, EJ7, EJ10, EJ11 | Each confirmed as the source has it, with one fault added to EJ10. | Section 6.1 | None |
| 12 | EJ6, EJ8 | A mark states `refusals`, `most` and `clock` as data, and the validator counts `most`. | Section 6.1: the type of a mark, and "Marks, made exact" | The data of a platform definition |
| 13 | EJ13 | A rule at `grant` passes with no member. | Sections 4.2 and 6.1 | None |
| 14 | The sentence "I3-1 to I3-9" | Corrected: it names the whole list. | Section 11.13; section 15.6r | None |

What changed in the files. The main note: the opening, with one sentence
and one passage; section 1, a table of four rows; section 3.1, new;
section 4.2, one sentence; section 6.1, three lines of the type listing,
one cell, one item and one passage; section 11.13, one sentence, ten
rows and one paragraph; section 13, a table of three rows; section 14,
two rows; section 15.6r, new; section 15.8, one sentence and one row;
section 18, the heading and witnesses 18.42 and 18.43. `corrections.md`:
this section. Nothing else was changed.

### Counts

Counted by a script over the rows of the main note.

| Count | Revision 16 | Revision 17 |
|---|---|---|
| Rows of section 11.13 | 16 | 26. 24 are marked "must change" and are owed. Two are built. |
| Open points of section 13 | R1-1 to R1-62 | R1-1 to R1-65 |
| Witnesses of section 18 | 18.1 to 18.41 | 18.1 to 18.43 |
| Decisions of section 1 | Through D16-3 | D17-1 to D17-4 are added |
| Rows of section 15.6r | | 15: 6 decided, 4 confirmed, 3 accepted, 1 another owner's, 1 that asks nothing |
| The greatest length of a scope part and of a fact tail, in bytes | | 85 and 89, added up by the script |

### The adversarial reading

**1. Can a host answer for a scope that it does not hold, in a way that
a careful reader accepts?**

- *For a fact URI.* No. The reader holds the hash. A host that does not
  hold the entry cannot produce bytes with that hash. A host that does
  produce them has returned the entry, wherever it got it, and that is
  the meaning of a self-verifying reference. Witness 18.42, cases 4 and
  5.
- *For a scope URI with an incarnation.* A host that holds another
  incarnation must answer `wrong-incarnation`. A host that lies about
  the incarnation is caught by a reader that reads entry 0: the genesis
  input holds `inc`, and the entry's hash is in the chain. It is not
  caught by a reader that reads the summary alone. The section says so:
  the head and the definition are the host's word until verified.
- *For a scope URI with no incarnation.* A host can mint a replacement
  under the same seed and answer with it. Its entry 0 holds a seed whose
  digest is the scope ID, so that check passes. What it cannot forge:
  the creator's entry that confirmed another incarnation, and the
  signatures of acts. A careful reader reads the creator's entry, as a
  fact, or asks with the incarnation. What was changed by this reading:
  the point "What a reader must not trust of a host" first said only
  that the head may be stale. It now names the replacement.
- *For an item URI.* It is a view on the host's word, and the section
  says that it proves nothing.
- *For a label.* A directory, or a host, can answer a label with any
  scope URI. The reader can check that the lane's seed names that
  directory as its creator. It cannot check the number, which is in no
  lane's bytes. Stated.
- Open: a reader that verifies nothing trusts the host for everything
  but a fact's bytes. That is the trust of section 7.4 and of a head
  that the service states, and it is not new.

**2. Can two different scopes share a URI in normal form?**

- A normal form holds the scope ID whole, and nothing is folded in it. A
  text with an upper-case letter in an ID is refused, and not repaired,
  so no two IDs fold to one. What was changed by this reading: the first
  wording lower-cased the whole URI, which would have accepted a text
  that the guard of a scope ID refuses.
- The two tails cannot be confused: `items` is no position.
- An item type has one encoding. Two types that differ in one byte have
  two encodings, also when a page would show them alike.
- Two hosts whose names look alike are two hosts, and the scope ID is
  compared apart from the host in any case.
- Two scopes share an ID only if two seeds share a digest. That is the
  assumption of section 2.1, and it is not new.

**3. Does a mark's new data open anything?** A mark is still in platform
data only. `most`, `refusals` and `clock` narrow what a rule may do, and
a rule that passes them has a fault. The one widening is the request of
an outcome's rule, with a `create`: its cause is checked by the child
and by a verifier against the act that opened the operation, as section
7.2's fourth row has it since revision 8.

### What remains owed, beside the lists of "Revision 16"

| Owed | To |
|---|---|
| Independent review of revision 17. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| Rows I3-17 to I3-25 of section 11.13 | The I3 delivery; the client's owner for I3-17 |
| The bound on a URI's length and on redirects | R4 |
| Points R1-63, R1-64 and R1-65 | As section 13 names them |
| The size in bytes of an outcome entry with a rule, and the other four dimensions | The capacity work `cc570904` |
| The I3 deltas EK1 to EK5, EF1 and EF13 | This note's next revision, where one is this note's |

### Limits of revision 17

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One writer wrote it, with no second reader.
- Revision 16 is adopted as the builder states it. No adoption act was
  read.
- The routes were read in one file. The namespace, the reads and the
  readers port behind them were not read. Rows I3-18 to I3-20 say what
  was seen.
- The grammar follows RFC 3986, RFC 5234, RFC 5952 and the A-labels of
  the DNS as the writer knows them. No parser checked it, and one
  A-label of a witness was computed by a script.
- The judges, the validator and the platform package were not read for
  the entries EJ1 to EJ15. "As built" means as the deltas note says.
- The two witnesses are tables that nothing ran.
- A script outside the repository applied the edits, counted rows,
  points and witnesses, added up two lengths, and computed two SHA-256
  values. No number in this revision is measured.

## Revision 18

2026-10-05. It answers the verdict `8645c22b` on revision 17 at
`5a15b9b0`, which requested changes. Revision 17 is not adopted, and
revision 16 is the contract in force. Revision 18 holds all of revision
17 with the repairs below, and nothing else. It is a proposal until it
is reviewed and adopted. The companion and the admission read inventory
are unchanged, byte for byte: their SHA-256 values begin `399359e9` and
`a2b8f683`, computed again.

### One row for each thing that the verdict asks

| # | The verdict asks | The change | Where |
|---|---|---|---|
| 1 | P2: one reversible encoding of an item type, with one grammar, one normal form and one mapping, for every chosen name; the cases in witness 18.42 | One rule of five steps. Every byte but a letter, a digit, `-`, `_` and `.` is percent-encoded, with no exception for `:`, `@` or `~`. The names `.` and `..` are written `~.` and `~..`. The normal form decodes only a byte that the rule writes as itself. The request carries the component unchanged, and the route reads it by the same rule. The grammar and rule 3 of the normal form are replaced to say that. | Section 3.1: four lines of the grammar; two points under it, of which one is replaced; "The item type, as one component"; rules 3 and 4 of the normal form. Witness 18.42, cases 18 to 40. |
| 2 | The same finding: how a standard parser and the route treat an encoded dot | The URL standard that browsers and the serving platform follow reads `%2E` as a dot segment. So `%2E` cannot carry the name `.`, and the rule does not use it. No parser was run: a check is owed in row I3-19. | The same passage, "Why `~.` and not `%2E`"; section 11.13, row I3-19 |
| 3 | P2: two item links with no incarnation are not the same reference | A fourth relation, the same selector. The same reference of two item URIs needs both incarnations, equal, or two resolved answers with one opening fact. The answer to an item URI states the incarnation and the opening fact. | Section 3.1: the table of relations, two points under it, one cell of the table of requests. Section 1, row D17-2. Witness 18.42, cases 15 to 17. |
| 4 | A fact reference from a URI needs the kind | From the seed, or from the verified entry's `at`. With neither, no `FactRef`. | Section 3.1, "From a URI to a reference" |
| 5 | The numeric own position, against `effects.ts` line 191 and row I3-26 | What a rule returns and what an entry records are kept apart. The sentence that made the number a fault of the rule is withdrawn. Row I3-26 no longer calls it built, and row I3-27 owes the check. | Section 6.1, item 6; section 11.13, rows I3-26 and I3-27 |
| 6 | The commission's outputs as source rows | Rows I3-28, I3-29 and I3-30: canonical URIs in notes, logs, a replay's report and the client's output; the URI in a label's answer; and the duties of a destination and a publication for a copy between installations, which is listed as not designed. | Section 11.13 |
| 7 | The owners of rows I3-17 to I3-20 | Unchanged. Row I3-19 gains text and keeps its owner. | Section 11.13 |

What changed in the files. The main note: the opening, with one sentence
and one passage; section 1, one cell; section 3.1, as rows 1 to 4 list;
section 6.1, one sentence of item 6; section 11.13, one sentence, two
cells, four rows and one paragraph; section 15.8, one sentence; witness
18.42, one cell, 26 rows and its last paragraph. `corrections.md`: this
section. Nothing else was changed.

### Counts

Counted by a script over the rows of the main note.

| Count | Revision 17 | Revision 18 |
|---|---|---|
| Rows of section 11.13 | 26 | 30. 26 are marked "must change" and 1 "to be checked": 27 are owed. 1 is not designed. 2 are built. |
| Open points of section 13 | R1-1 to R1-65 | The same |
| Witnesses of section 18 | 18.1 to 18.43 | The same. Witness 18.42 has 40 cases, where it had 14. |
| Relations of two URIs | 3 | 4 |
| Names that a script wrote as a component and read back | | 17, each to the same name |

### The adversarial reading

**Ten hostile names, each written and read back on paper.** The rule
was applied by hand, and then by a script that gave the same texts.

| # | The name | Step 1 | Step 2 | The component | Read back, by step 3 | What it attacks |
|---|---|---|---|---|---|---|
| 1 | `.` | `.` | It is exactly `.` | `~.` | `~.` is the name `.` | A dot segment, which a parser removes |
| 2 | `..` | `..` | It is exactly `..` | `~..` | `..` | A dot segment that climbs to the scope |
| 3 | `%2E` | `%252E` | No | `%252E` | `%25` is `%`, then `2E`: `%2E` | A name that looks like an encoded dot. It is not decoded twice. |
| 4 | `~.` | `%7E.` | No | `%7E.` | `%7E` is `~`, then `.`: `~.` | A name that looks like the marker of the name `.` |
| 5 | `a/b` | `a%2Fb` | No | `a%2Fb` | `a/b` | A second path part. The path is split before the component is decoded. |
| 6 | `x:y` | `x%3Ay` | No | `x%3Ay` | `x:y` | A character that revision 17 both encoded and left as itself |
| 7 | `17/sha256:00` | `17%2Fsha256%3A00` | No | `17%2Fsha256%3A00` | The same name | A name that looks like a fact tail. It is one component after `items`. |
| 8 | `?x#y` | `%3Fx%23y` | No | `%3Fx%23y` | `?x#y` | A query and a fragment, which a URI of this kind never has |
| 9 | `é` and `e` with a combining accent | `%C3%A9`, and `e%CC%81` | No | Two components | Two names | Two names that a page shows alike. They stay two, because a name is compared by its bytes. |
| 10 | `A` and `a` | `A`, and `a` | No | Two components | Two names | Case folding. The host is folded, and a component never is. |

- Each of the ten reads back to itself, and no two of them share a
  component.
- One thing was changed by this reading. The first rule of this
  revision kept `~` as a byte that stands as itself. The name `~.`
  would then have been written `~.`, which is also the name `.`. So a
  `~` of a name is always encoded.
- What is not closed, and is stated: a server between the reader and
  the route that decodes `%2F`, and whether the platform's parser
  changes any component of the rule. The second is owed as a check, in
  row I3-19. Neither can give a reader a false proof, because an item
  URI gives none.
- An empty name does not exist, so an empty component is refused. A
  name with bytes that are no UTF-8 does not exist either: a definition
  is JSON.

**Two hosts, one seed, two incarnations.** Host `a` holds the scope `S`
in the incarnation `I`. Host `b` does not hold it, and mints a
replacement under the same seed, `S@J`. Item 0 of the type `t` exists in
both, opened by two different entries 0.

| The two URIs | Revision 17 | Revision 18 |
|---|---|---|
| `a/S/items/t/0` and `b/S/items/t/0` | The same reference. That was the fault: they are two items of two lives. | The same selector. Not the same reference. Resolved, the answers state `I` and `J` and two opening facts: two items. |
| `a/S@I/items/t/0` and `b/S@I/items/t/0` | The same reference. | The same reference. Host `b` answers `wrong-incarnation`, so a reader is not given `S@J` for it. |
| `a/S@I/items/t/0` and `b/S/items/t/0` | Not the same reference, by its words "equal or both absent". | The same selector. The same reference only if `b`'s answer states `I` and the same opening fact, which it does not here. |
| `a/S@I/items/t/0` and `b/S@J/items/t/0` | Not the same reference. | Not the same reference, and not the same selector: both state an incarnation, and they differ. The same scope ID. |
| `a/S/0/H` and `b/S/0/H`, as facts | The same reference. | The same reference. Host `b`'s entry 0 has another hash, so its answer is used for nothing. |

- Can host `b` make a careful reader take its item for `a`'s? Not by a
  URI that states the incarnation. Not by a resolved comparison, which
  reads the opening fact. A reader that compares two unresolved links
  with no incarnation is told "the same selector", and the name of the
  relation says that this is no identity.
- Does the repair remove discovery? No. A URI with no incarnation still
  resolves at each host, and "the same selector" and "the same scope
  ID" still compare what two hosts hold under one seed.
- Every use of "the same reference" in the main note was listed by a
  search and read: the table, its two points, the row D17-2 and the
  witness's cases 2, 3, 4, 15, 16 and 17. Each agrees with the table.

### What remains owed, beside the lists of "Revision 17"

| Owed | To |
|---|---|
| Independent review of revision 18. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| Rows I3-27 to I3-29, and the check in row I3-19 | The I3 delivery, with the owners that the rows name |
| Row I3-30: what a copy between installations is, and what a destination and a publication owe for one | The authority note's successor, with N5 |

### Limits of revision 18

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One writer wrote it, with no second reader.
- No parser of URLs was run. That a standard parser reads `%2E` as a
  dot segment, and that it leaves `~.`, `%2F` and the other components
  as they are, is the writer's knowledge of the URL standard.
- The source was read in twenty lines of one file. Whether its judge
  records `"self"` was not read.
- The commission's text was read as the builder gave it for revision
  17. What it says of a copy between installations is known here only
  through the verdict's words, and row I3-30 says so.
- A script outside the repository applied the edits, counted rows,
  cases and points, wrote and read seventeen components, and computed
  two SHA-256 values. No number in this revision is measured.

## Revision 19

2026-10-05. Revision 18, at `be90ff05`, is adopted and in force.
Revision 19 is on that text, keeps all of it, and is a proposal until it
is reviewed and adopted. One delegated author wrote it. It has three
parts: what the authority note's adopted revision 24, at `d5616522`,
asks of this contract; two corrections of wording that the checker left
on revision 18; and the contract-owned entries of the I3 deltas note's
sections 13 to 18, at `4f771d90`. The companion and the admission read
inventory are unchanged, byte for byte: their SHA-256 values begin
`399359e9` and `a2b8f683`, computed again. The pinned lane bytes and
digests are not changed by this note.

### What was asked, and where each thing was done

| # | Asked | The change | Where |
|---|---|---|---|
| 1 | One table of present standing, and every other mention dated or pointing to it | "The standing in force, for revision 19", with its rule. 14 sentences outside the opening are dated beside the text, and one sentence of the opening is changed. | The opening; "The places where a standing is dated", below |
| 2 | Part 1: the bound on the elements of a list. One number for all lists, or stated for each type by a definition within a contract maximum; and what the capacity dimensions count | Each list type states its `max`, within one maximum of this contract, 64. No count reads the length of a value: the validator reads the `max`, a reservation counts a list at its `max`, and used bytes count the entry as written. | Section 6.1, the row and "The bound on the elements of a list"; section 6.2, the listing; sections 6.5 and 6.6, one sentence each; section 17.1; witness 18.44; row D19-1 |
| 3 | Part 1: the form rows P26 and P27, and the place of `role-table` under P10 | Each stated as P13 to P25 are: this contract's part, why, and the place. All three stay platform code. | Section 15.3f; row D19-2 |
| 4 | Part 1: the missing form 14 | One member of `RulesContent`, by the value that a rules definition's data states, and its size as a sum. The slot and the field are forms that exist. | Section 16.1; section 15.3f, row 5; row D19-3; row I3-36 |
| 5 | Part 1: a grant's `within` cannot yet name one destination | One owed row, with the form that would let it, and nothing more. | Section 13, point R1-66; section 15.3f |
| 6 | Part 1: any other ask of revision 24 | Its missing forms 2 and 11 are listed as open, with what blocks each. EM9 is answered from the point on EJ3. | Section 15.3f, rows 6 to 8 |
| 7 | Part 2: row I3-17 says four relations | Done, and marked in the row. | Section 11.13 |
| 8 | Part 2: "one text" near the canonical component rule says one canonical component | Done, with the reason: accepted aliases are brought to the normal form first. | Section 3.1, "One name, one component" |
| 9 | Part 3: EM1 | Decided: the type of the field states the place. | Section 6.2; rows D19-4 and I3-32 |
| 10 | Part 3: EM2 | Open, with the built reading confirmed and what blocks the form. | Section 15.6s; point R1-67 |
| 11 | Part 3: EM4, with EL7 | Decided: the kinds `value`, with `domain`, and `snapshot`. | Sections 9.2 and 9.6; rows D19-5 and I3-33 |
| 12 | Part 3: EP1 | Decided, as built: a fetched fact among the creation's fields. | Section 7.2; row D19-6 |
| 13 | Part 3: EP6, with EJ4 | Decided: several send marks when at most one does not state `always`. No operand for a sibling's scope ID. Point R1-63 is decided. | Section 6.1; rows D19-7 and I3-34 |
| 14 | Part 3: every other entry whose owner names this contract | One row each. Answered only where an existing rule gives the answer. | Section 15.6s; section 6.1, "Marks and rules, from the later I3 source"; rows I3-35, I3-37 and I3-38 |

What changed in the files. The main note: the opening, with two changed
sentences and one passage; section 1, four dated sentences and one
table; section 3.1, one sentence; section 6.1, one row, one passage on
the bound, two lines of the listing of `Mark`, one sentence on EJ4 and
one passage on marks; section 6.2, two lines of the listing and three
points; sections 6.5 and 6.6, three places; section 7.2, one passage;
sections 9.2 and 9.6, one passage, one listing and one sentence; section
11.13, three sentences, one changed row, eight rows and one paragraph;
section 13, one passage with two rows; section 14, two rows; section 15,
one dated sentence, the new sections 15.3f and 15.6s, three dated
sentences in 15.3d and 15.3e, and in 15.8 one sentence, six rows and one
paragraph; section 16.1, two lines of a listing, two passages and four
dated sentences; section 17.1, one paragraph; section 18, its heading
and two witnesses. `corrections.md`: this section. Nothing else was
changed. Seventeen lines of revision 18 were removed or replaced, and
two of them are rows of a table: the row of the bound in section 6.1,
and row I3-17. Every other row of every table is byte for byte as
revision 18 has it.

### Counts

Each count was made by a script over the main note after the last edit.
The script splits the note at its headings and counts the rows of a
table by the first cell of each row.

| Count | Revision 18 | Revision 19 | How it was counted |
|---|---|---|---|
| Rows of section 11.13 | 30 | 38. 33 are marked "must change" and 1 "to be checked": 34 are owed. 1 is not designed. 3 are built. | Rows that begin `I3-`, by the first words of the fourth cell |
| Open points of section 13 | R1-1 to R1-65 | R1-1 to R1-67. R1-63 is decided. | The distinct numbers of rows that begin `R1-`, checked to be 1 to 67 with none missing |
| Witnesses of section 18 | 18.1 to 18.43 | 18.1 to 18.45. Witness 18.44 has 8 cases, and 18.45 has 11. | Headings that begin `### 18.`, and rows that begin with a number |
| Rows of section 1 for this revision | | 8, D19-1 to D19-8. The 4 rows D17-1 to D17-4 are unchanged. | Rows that begin `D19-` and `D17-` |
| Rows of section 15.3f | | 9 asks and 3 forms | Rows that begin with a number, and rows that begin `P2` or `role-table` |
| Rows of section 15.6s | | 33: 6 decided, 14 confirmed, 2 answered, 2 that ask nothing new, 9 open. 29 are entries, and 4 are rows of the deltas note's table of checks. | Rows that begin `E`, by the third cell |
| Rows of section 15.6r | 15 | 15, unchanged | Rows that begin `EJ` |
| Rows of section 14 | 61 | 63 | Rows of its table |
| Sentences of standing that are dated | | 14 | The list of the edit script, below |
| Lines of revision 18 that the difference removes | | 17, of which 2 are rows of a table | `git diff -U0`, the lines that begin `-` |

Four sizes are sums, computed by a script and not measured: 4,289,
24,769 and 123,845 bytes for lists of 64 texts of 64 bytes, and 48,847
bytes for the largest `content` with the new member. The last adds 34 to
a number that the authority note's script counted.

### The places where a standing is dated

Each of these 14 sentences called a text a draft, a proposal, filed,
under review or not adopted, or made an answer wait for an adoption, and
that text is adopted now. Each has a sentence beside it that begins
"Dated in revision 19, 2026-10-05" and points to the table of the
opening.

| # | Where |
|---|---|
| 1 | Section 1, the decisions of revision 14 |
| 2 | Section 1, the decisions of revision 16 |
| 3 | Section 1, the decisions of revision 17 |
| 4 | Section 1, the decisions of revision 15 |
| 5 | Section 11.13, its opening |
| 6 | Section 15, its opening |
| 7 | Section 15.3d, "What the successor may rely on" |
| 8 | Section 15.3e, its opening |
| 9 | Section 15.3e, "What the authority note's revision 19 asks" |
| 10 | Section 15.8, the table of what is owed |
| 11 | Section 16.1, under the listing of the two further kinds |
| 12 | Section 16.1, under the table of rows that need the form |
| 13 | Section 16.1, "A key's observation is also of its member" |
| 14 | Section 16.1, "What the authority note's revision 19 states" |

Not dated, and why. The records of each revision in the opening, and the
tables "What revision N read" and "Where each note stands", are dated by
their headings. Sentences of sections 11.11, 11.12 and 15.6m that say
the I2 source "is under review" give the standing of a source delivery,
which this revision did not check and its table does not state.
Sentences of sections 15.3a to 15.6l that call a row "a proposal of this
candidate" are covered by the opening of section 15, which says that the
adoption of each revision decided its rows.

### The adversarial reading

**The sweeps, one for each fault kind that a checker has found in these
notes.**

| Fault kind | What was swept, and how | Found |
|---|---|---|
| A stale standing of a sibling | A script listed every line after the opening with one of seventeen phrases of standing, of which the opening names ten, and marked each that has no dated sentence within nine lines. Each unmarked line was read. | 14 places dated. The unmarked lines are of three kinds: a different sense of the word, as in "the entry being written"; the standing of a source delivery; and "a proposal of this candidate" for a revision that the opening of section 15 covers. |
| A table of forms that disagrees with prose | Each listing or table that this revision changes was read against every sentence that a search gave for its subject: "32" with a list, "one mark", `RetainedInput`, `RulesContent`, and the places 4, 5 and 6 | Four older sentences are marked: the listing of `FieldType`, the guard `every`, the point on `collect`, and the point on EJ4. Three older rows say "at most one mark" and are left as written: D17-4, I3-26 and R1-63. Each has a later row or passage that states the change. The row P25 of section 15.3c says "more than 32 records" of a `collect` list, which this revision does not change. |
| A refusal name in prose that no row states | Each name in the added text was searched for in section 4.2 and in the rows that state it | No name is new. `bad-handle` is a name beside the code `bad-field`, stated in the row P27. `configuration-mismatch` is named only as the authority note's. |
| A count sentence that is off | Every number of the added text against the script of "Counts" | The first draft of section 15.3f said that a script counted its answers by kind. It counted the rows only, and the sentence now says so. Section 18's heading said "revisions 8 to 17". |
| A capability or a bound stated by a version's name | The added text was searched for "version 1", "of membership" and "for membership" | Two sentences of the draft were changed. The bound is stated by the `max` of a list type, and the member of `RulesContent` by the value that a rules definition's data states. The rows of section 15.3f name the authority note's rules by their names, which is that note's statement and no bound of this contract. |

**Five attacks on what this revision decides.**

- *Can two entries of a row with several send marks record the same
  sends from different forms?* No. Every written send is made exactly
  once, every mark that states `always` makes one, and a fault writes
  nothing. So the count of recorded sends is the number of forms or one
  less, and in the second case only one form can be the one that made
  none. With two marks that do not state `always`, one less would have
  two readings, and that list is refused.
- *Does a bound of 64 let any entry pass the entry size that fitted
  before?* Not an entry of a pinned lane: no list of either states more
  than 32, so no static size of either changes. A definition that states
  `max: 64` is counted at 64 by the validator, which refuses it when a
  timed entry or an outcome entry could then pass the entry size. A
  refusable entry is checked on its bytes.
- *Does a longer list fetch more?* No. The bound on the foreign entries
  of one entry stays 128, and an input that names more is refused before
  any is fetched. Witness 18.44, case 8.
- *Can a declared definition give itself a place that names a value?*
  No. The member `value` of a `digest` type is read only with the
  platform option, which no input reaches. Witness 18.45, case 7.
- *Can a creator name another act than the one that opened the
  operation?* The fact must be at the position that the operation's ID
  states, and the judge sets an outcome's operation from the effect at
  that position. The act there must have the intent digest that is the
  seed's cause. So only the opening entry passes, unless the creator's
  own history is false, which is the limit that section 9.4 states for
  every fetched fact.

One thing that this reading did not close. The member
`singleControllerException` makes two fixed records for one value of
`asked`, told apart by the observation's `definition`. That is sound
only while one platform name and version means one data value, which is
point R1-60 and is open.

### What remains owed, beside the lists of "Revision 18"

| Owed | To |
|---|---|
| Independent review of revision 19. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| Rows I3-31 to I3-36 and I3-38 of section 11.13 | The I3 delivery, with the owners that the rows name |
| The rows that state `value`, `always` and `singleControllerException`; whether the role table is written as data; its missing forms 2 and 11; the I3 deltas EM11, EM14, EP15, EP16 and ER10 | The authority note's next revision |
| The number 64, the largest size of a key's observation, and the bound on `content` | R4 |
| Points R1-66 and R1-67; ER7 with R1-38; a rule's `list` change after a list that is set whole; what a mark in a result clause reserves | This note's next revision, with the authority note and `cc570904` |

### Limits of revision 19

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One delegated author wrote it, with no second reader.
- The authority note's revision 24 was read by a search, with the
  passage around each hit. Its section 3.3 was not read, apart from two
  rows.
- The I3 deltas note was read in the rows whose owner names this
  contract. Of the other rows of its sections 13 to 18, only the owner
  cell was read.
- The I3 source was read in a few lines of five files, and the two
  pinned lane definitions by a script. "As built" is by the word of the
  deltas note.
- No adoption act was read. The standing is as the instruction for this
  revision gives it.
- A script outside the repository applied the edits, counted rows,
  points, witnesses and cases, added four sizes and computed two SHA-256
  values. No number in this revision is measured.

## Revision 20

2026-10-06. Revision 19, at `1ca8a59b`, is adopted and in force.
Revision 20 is on that text, keeps all of it, and is a proposal until it
is reviewed and adopted. One delegated author wrote it. It has three
parts: two forms without which a destination cannot judge and cannot
reserve; the eight asks of the authority note's adopted revision 26, at
`f7175296`; and the contract-owned entries of the I3 deltas note's
sections 26 to 30, at `44172770`. The companion and the admission read
inventory are unchanged, byte for byte: their SHA-256 values begin
`399359e9` and `a2b8f683`, computed again. The pinned lane bytes and
digests are not changed by this note.

### What was asked, and where each thing was done

| # | Asked | The change | Where |
|---|---|---|---|
| 1 | One table of present standing, with the basis stated exactly, and every other mention dated or pointing to it | "The standing in force, for revision 20", with its rule. The table of revision 19 is dated at its heading. 10 sentences outside the opening are dated beside the text. | The opening; "The places where a standing is dated", below |
| 2 | Part 1(a): the form by which data states the subjects that an entry observes: the source, the kind, the window, the bound and what follows past it, what the entry retains and what a replay checks; and the order of reads | Rows of `observes` on an act, a kind of `outcomes` and a clause of a result. Eight sources in one table. Seven checks of the validator. An order of four parts before the turn, and the list derived again in the commit. A row that is over. An entry retains the observations of the subjects that its rows give. Point R1-67 is decided. | Section 16.1, "The subjects that an entry observes"; section 6.1, "What platform data states for the turn, and for capacity"; witness 18.46; row D20-1 |
| 3 | Part 1(a): the window of ten seconds and `fresh` for an outcome, to confirm or correct | Confirmed for the two rows that the authority note states. Corrected in where it comes from: the row, and no constant by kind of input. | Section 16.1, "The windows of the rows that exist"; row I3-39 |
| 4 | Part 1(a): what an outcome's `uses` holds (FC3) | One origin, and a copy of its `uses`. | Section 6.1, "The origin of an outcome"; row D20-2; row I3-41 |
| 5 | Part 1(b): a reservation that an admission-checked entry takes for a whole publication, in data, as counts; how later entries draw; what holds the count; the answer with no room; the release; what `covered` then means | `holds` on an item type, `adds` on an act, and `for` on an `operation` effect. The folded state holds the counts and the operations of each item. A held kind is in no closure. A draw past a count is a fault. Release by what the open operations can reach. | Section 17.2a; sections 4.1, 6.1 and 17.1; witness 18.47; row D20-3; row I3-44 |
| 6 | Part 1(b): a request that an outcome entry sends (FC2) | Counted with its operation, once with `once`; under `holds`, with the item. | Section 17.2, "A request that an outcome sends"; section 17.2a; row D20-4; row I3-45 |
| 7 | Part 1(b): the five dimensions | One table, with what each counts. | Section 17.2a, "What a holder reserves" |
| 8 | Part 1(b): the authority note's numbers, and where its rows are no upper bound | Named as that note's. One instance of the arithmetic, by a script: 72. The rows that it owes are listed. | Section 17.2a, "The numbers are the authority note's"; section 15.8 |
| 9 | Part 2: the eight asks | One row each: 4 decided, 1 confirmed, 2 answered, 1 carried. | Section 15.3g; sections 3, 9.3 and 16.1; witness 18.48; rows D20-5 to D20-8 |
| 10 | Part 3: the contract-owned entries of the deltas note's sections 26 to 30 | 21 rows: 11 decided, 4 confirmed, 3 answered, 2 decided in part, 1 that is not this contract's. | Section 15.6t; section 6.1; rows I3-39 to I3-50 |
| 11 | The source table gains a row for each thing that the I3 source must now change | 12 rows, I3-39 to I3-50: 10 "must change", 1 "to be checked" and 1 built. | Section 11.13 |

What changed in the files. The main note: the opening, with three
changed lines, one dated paragraph and one passage; section 1, one dated
sentence and one table; section 3, one passage; section 4.1, one line of
the listing of `Effect` and two points; section 6.1, one line of the
listing of `PlatformData`, one sentence on ER6 and one passage; section
9.3, one paragraph and one point; section 9.4, one paragraph under its
table of results; section 11.13, one changed line, one dated paragraph,
twelve rows and one paragraph of counts; section 13, one passage with
two rows; section 14, three rows; section 15, one dated sentence, two
dated paragraphs in 15.3f and 15.6s, the new sections 15.3g and 15.6t,
and in 15.8 one paragraph, five rows and one dated paragraph; section
16.1, one changed line and two added passages of its listings, two dated
sentences, two paragraphs under the guards and under "Replay", and four
passages; section 17, one passage of its opening, one paragraph in 17.1,
three points in 17.2, the new section 17.2a, two dated sentences in 17.3
and one sentence in 17.5; section 18, its heading and three witnesses.
`corrections.md`: this section. Nothing else was changed. Eight lines of
revision 19 were removed or replaced, and none of them is a row of a
table: three lines of the note's first paragraphs, three lines of
listings, one sentence of section 11.13 and the heading of section 18.
Every row of every table of revision 19 is byte for byte as it was.

### Counts

Each count was made by a script over the main note after the last edit.
The script splits the note at its headings and counts the rows of a
table by the first cell of each row.

| Count | Revision 19 | Revision 20 | How it was counted |
|---|---|---|---|
| Rows of section 11.13 | 38 | 50. 43 are marked "must change" and 2 "to be checked": 45 are owed. 1 is not designed. 4 are built. | Rows that begin `I3-`, checked to be 1 to 50 with none missing, by the first words of the fourth cell |
| Open points of section 13 | R1-1 to R1-67 | R1-1 to R1-69. R1-61 and R1-67 are decided. | The distinct numbers of rows that begin `R1-`, checked to be 1 to 69 with none missing |
| Witnesses of section 18 | 18.1 to 18.45 | 18.1 to 18.48. Witness 18.46 has 16 cases, 18.47 has 15 and 18.48 has 10. | Headings that begin `### 18.`, and rows that begin with a number |
| Rows of section 1 for this revision | | 9, D20-1 to D20-9. The 8 rows D19-1 to D19-8 are unchanged. | Rows that begin `D20-` and `D19-` |
| Rows of section 15.3g | | 8 | Rows that begin with a number |
| Rows of section 15.6t | | 21: 11 decided, 4 confirmed, 3 answered, 2 decided in part, 1 that is not this contract's | Rows that begin `EY`, `EZ`, `FA`, `FB` or `FC`, by the third cell |
| Rows of sections 15.3f and 15.6s | 9 and 33 | 9 and 33, unchanged | The same script |
| Rows of section 14 | 63 | 66 | Rows of its table |
| Sentences of standing that are dated | 14 | 10 more | The list below |
| Lines of revision 19 that the difference removes | | 8, of which none is a row of a table | `git diff -U0`, the lines that begin `-` |

Six numbers are sums, computed by a script and not measured. 237 bytes:
the longest text of a fact, built as a value and counted. 86 bytes: a
ref's name of 22 characters and 64. 84 bytes: the member `extents` with
a digest. 48,931 bytes: 48,847 and 84. 72 entries: 66 for 17 operations
and 6 for 3 requests, as an instance of the table of section 17.2a. 8
entries: the made-up `holds` of witness 18.47.

### The places where a standing is dated

Each of these 10 sentences called a text a proposal, said that something
was owed by a text's next revision or after an adoption, or named a
declaration that an adopted revision has since narrowed. Each has a
sentence beside it that begins "Dated in revision 20, 2026-10-06".

| # | Where |
|---|---|
| 1 | Section 1, the decisions of revision 19 |
| 2 | Section 11.13, its opening, with row I3-36 |
| 3 | Section 15, its opening |
| 4 | Section 15.3f, under its counts |
| 5 | Section 15.6s, under its counts |
| 6 | Section 15.8, under the table of what is owed |
| 7 | Section 16.1, "The slot and the field" of the single-controller exception |
| 8 | Section 16.1, "What this does not decide" |
| 9 | Section 17.3, the two declarations of the five conditions |
| 10 | Section 17.3, point DI21 |

The table "The standing in force, for revision 19" is dated at its
heading, in the opening, and is not among the 10. Not dated, and why.
The records of each revision in the opening, and the tables "What
revision N read", are dated by their headings. A "Dated in revision 19"
sentence says what was so on 2026-10-05, and points to the table of
revision 19, which now points on. A row of section 15.6s or 15.8 that
names "the authority note's next revision" is left as written: the dated
paragraph under each table says which of them that note's revision 26
answered.

### The older statements that this revision changes

Eight sentences or rows of revision 19 state a rule that revision 20
changes. Each is marked beside the text, or under its table. No row was
edited.

| # | Where | The older statement | The mark |
|---|---|---|---|
| 1 | Section 4.1, "Who may write one" | "For the entries that its specification names" | "Made exact in revision 20" |
| 2 | Section 6.1, the point on ER6 | An `operation` effect gains no member | "Changed in revision 20" |
| 3 | Section 9.3, the row "An observation" | The entry holds exactly the observations that its judgment reads | A paragraph under the table |
| 4 | Section 9.4, the table of results, one row | "Not exactly what its judgment reads" | A paragraph under the table |
| 5 | Section 16.1, guard 3, and the tables that say "a ten-second kind" | A kind of the authority note's prose | "Made exact in revision 20" |
| 6 | Section 16.1, "Replay", the last check | As row 3 | "Changed in revision 20" |
| 7 | Section 17.2, the point on a closure | A cycle of settling forms refuses a definition | "Changed in revision 20" |
| 8 | Section 17.2, "Bytes of a reservation" | An outcome retains what its owner declares | "Made exact in revision 20" |

Three listings gain lines: `Effect`, `PlatformData` and the listings of
section 16.1. The rows EM2 and ER6 of section 15.6s state the older rule
and are left as written: the dated paragraph under that table says so.

### The adversarial reading

**The sweeps, one for each fault kind that a checker has found in these
notes.**

| Fault kind | What was swept, and how | Found |
|---|---|---|
| A stale standing of a sibling | A search of the main note, after the opening, for the phrases of revision 19's sweep and for "next revision", "after its adoption", "is approved", "being landed", "revision 24" and "revision 25". Each hit with no dated sentence beside it was read. | 10 places dated. The hits that are left are of four kinds: another sense of the words, as in "the entry being written"; a "Dated in revision 19" sentence; a row of a table, which the dated paragraph under it covers; and "until that note writes the row as data", which is still so. |
| A table of forms that disagrees with prose | A search for "seven places", "seven forms", "exactly the observations", "judgment reads", "a rule read", "ten-second kind", "gains no member", "An outcome retains", "in a cycle", "three kinds" and "two further kinds". Each hit was read against the new listings. | The eight statements above. "Seven places" stands where it did and is true: no place is added, and a source of `observes` is an operand or the rule of place 7. "Three kinds, one envelope" is stated to hold for four kinds, in the passage on the holders. |
| A refusal name in prose that no row states | A script listed every word in code marks of the added text. Each that is a reason, an answer or a result of a replay was looked for in the two tables of names. | No name is new. `incomplete` was used in the text of the extents and had no row: one was added. `bad-input` and `too-large` stand beside the section that states each. `not-reserved` and `evidence-too-large` are named as the authority note's. |
| A count sentence that is off | Every number of the opening, of sections 11.13, 13, 15.3g, 15.6t and 15.8, of the witnesses and of this file, against the script of "Counts" | The first draft said 9 dated places and six changed statements. Two more of each were found by the sweeps, and both sentences now say 10 and eight. The draft of section 15.6t said 10 decided: the script counted 11. Witness 18.47 gave an act room for 2 entries where it needs 3. |
| A capability or a bound stated by a version's name | The added text was searched for "the destination", "for membership", "version 1" and the names of the seven platform definitions | The forms are stated by the members `observes`, `origin`, `holds`, `adds` and `once` of a definition's data, and by "a rules definition whose data states the slot". Where the destination, a publication or a rule of the authority note is named, it is an example, a number of that note, or a row that the note owes. Three sentences of the draft were changed. |
| A permission that is derived from a count or a state | The added text, for "because", "when the count", "is 1" and "room" | Two guards in words. An observation of the holders of an action permits nothing by its count (section 16.1). A rule may read what an item still holds, and a count that is not used up permits nothing (section 6.1). One more place was checked and stands: the release of a holder is derived from a state, and it permits no entry. It only frees room. |
| An exemption by a flag, where a checked reservation is required | A search of the whole note for "exempt", "always fits", "never refused", "not asked", "whatever", "static rule", "temporary step" and "platform option" | The list below. |

**Every place where an entry is not asked whether it fits, or a check is
lifted, and what stands behind it.**

| Where | What is not asked or is lifted | What stands behind it |
|---|---|---|
| The flag `covered` of the I3 source (I3 delta FA3) | The closure of five kinds | Nothing. Replaced in revision 20 by section 17.2a. |
| Section 17.3: a settling entry is never refused for capacity | Whether it fits | Its own duty's reservation, in every dimension, which was checked when the duty was admitted. |
| Sections 6.4 and 17.2: a timed entry always fits | Whether it fits, and its size | The chain of timed rules of its item, reserved when the deadline is created; and a size that the validator bounds. |
| Section 6.1, "An entry that cannot be refused" | The size and the counts of an outcome, a result, a confirmation and the end of a hold | A declared maximum; and where that is a constant times a state bound, an opening that can be refused and holds the state within its bound. |
| Section 17.3: a refusal that uses a reserved entry | Whether the refusal fits | A count of decisions under the five conditions, for a capability. From revision 20 no platform definition has one for a refusal. |
| Sections 17.2 and 17.3a: a runtime that reserves less than a closure, and a static rule | The exact accounting | Each is a labelled temporary step, with conditions, and a refusal to found or create a scope under any definition that it does not cover. |
| Section 17.5: the four dimensions that the source does not count | Everything in those dimensions | Nothing. The section calls it the rule absent, and it is owed. |
| Section 6.1: the validator's platform option | The rule on a definition's name, and the refusal of marks and of the five members of revision 20 | No reservation: it is no capacity check. The option is reachable from no input. |

**Six attacks on what this revision decides.**

- *Can a definition state a small `holds` and let its rules open more?*
  Not without a sign. The amounts are computed from the counts, so a
  total cannot be lower than its counts. A rule that opens one more of a
  kind than the count has a fault, and its entry is not written. What
  the validator cannot show is that each count is enough: that is a
  witness of the definition.
- *Can an outcome at a full scope still be written?* Yes, where its
  operation is for a holder. The taking entry was admitted with the
  whole, and each draw moves an amount from the holder to the duty that
  the entry creates. Used plus reserved does not grow.
- *Can a publication that is final hold room for ever?* Only for the
  kinds that an operation with a lost answer can still reach, and for
  the one entry of that answer. That is the cost of point R1-38, and it
  is in the data.
- *Can a caller choose what an outcome's rule reads?* No. An outcome's
  `uses` is a copy of its origin's, and the origin is the opening entry
  or a position that the rule gives from the state. Nothing that is
  offered with the outcome names an entry.
- *Can a runtime leave out an observation that would refuse?* For a row
  that states `wait`, no: the entry is not written without it. For a
  row that states `write`, the entry shows that the row is absent, and
  the rule must decide without it. That the read could not be made is
  the runtime's word, under `observation-read`. A definition that must
  not go on without a subject states `wait`.
- *Can two facts give one ref name?* Only if two entries have one hash.
  A reference with a true hash and a false `at` gives the same name and
  another line, and a rule builds both from a verified fact only.

Three things that this reading did not close. A source of `observes`
uses the operand forms of section 6.5, whose prose was not read again:
whether every operand that a guard may read is safe to evaluate before
check 9 was reasoned and not checked against that text. A row with
`without: "write"` rests on the runtime's word that a read failed. And
the first notice of a compromised key has no reserved entry: point
R1-68.

### What remains owed, beside the lists of "Revision 19"

| Owed | To |
|---|---|
| Independent review of revision 20. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| Rows I3-39 to I3-49 of section 11.13 | The I3 delivery, with the owners that the rows name |
| The rows of `observes`, the `origin` of each kind, the `holds` and the `adds` with their counts, `settles` on the rows of membership, the register and the directory, the byte domain of the extents, the rows that use the holders and the authors, and where a receipt's records stand | The authority note's next revision |
| Every count, the ceiling on a count, the size of each kind of observation and the bound on one retained read | R4, with the capacity follow-through `cc570904` |
| Points R1-38, R1-66, R1-68 and R1-69; the form of a runner's report | This note's next revision, with the owners that each names |

### Limits of revision 20

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One delegated author wrote it, with no second reader.
- The authority note's revision 26 was read in its sections 5.8, 13.15
  and 13.16, in the second half of its section 12.1.5, and in single
  rows elsewhere. Its section 6.5 was not read.
- The I3 deltas note was read in its sections 26 to 30. Its earlier
  sections were not read again.
- The I3 source was read in a few lines of five files, and the two
  pinned lane definitions by a script. "As built" is by the word of the
  deltas note.
- The prose of section 6.5 on operands was not read again.
- No adoption act was read. The standing is as the instruction for this
  revision gives it.
- No Git command was run to check a ref's name, and no parser of JSON
  was run on a text of a fact beyond the script that built one.
- A script outside the repository applied the edits, counted rows,
  points, witnesses and cases, added six sizes and computed two SHA-256
  values. No number in this revision is measured.

## Revision 21

2026-10-06. Revision 20, at `9dbd3039`, was reviewed in the verdict
`0cf59056`, which asked for changes. It is not adopted, and revision 19,
at `1ca8a59b`, is still in force. Revision 21 is on revision 20, keeps
all of it apart from what it marks, and is a proposal until it is
reviewed and adopted. One delegated author wrote it. It repairs the two
findings of the verdict, writes in the planner's four answers of the act
`1f8aba72`, answers the four items that do not block, and puts two
sweeps in the note as tables. The companion and the admission read
inventory are unchanged, byte for byte: their SHA-256 values begin
`399359e9` and `a2b8f683`, computed again. The pinned lane bytes and
digests are not changed by this note. Every row of every earlier section
of this file is byte for byte as it was.

### What was asked, and where each thing was done

| # | Asked | The change | Where |
|---|---|---|---|
| 1 | P2 1: a held kind may open a kind that no item holds, and nothing reserves it | One operation of a held kind reserves `one(k)`, which holds the closure C(j) of each such kind, in the five dimensions. The holder has it from the taking entry. It moves to the operation, and then to the child. Check 5 refuses the edge from a kind that no item holds to a held kind, as `reserve-unbounded`. The closure of an operation is counted by outcome entry. | Section 17.2a, checks 4 and 5, "What a holder reserves, in full" and "The moves, by entry"; section 17.2, "The closure of an operation"; witness 18.49; rows D21-1, D21-2 and I3-51 |
| 2 | P2 1: the induction, against every kind of edge | One table of 8 edges, each with what reserves the second and when. One edge is refused. | Section 17.3, "The induction, by edge" |
| 3 | P2 2: a value that an observation names is not reserved for a clause of a result | A row states `retains`. One rule counts each record at its `max`, for every form that states the row. A clause's bytes are reserved when the entry that sends its request is admitted, as the largest over its clauses. Sections 16.1, 17.1, 17.2 and 17.2a say the same. | Section 16.1, "A value that a row may retain" and "What it counts in capacity"; section 17.1, one more row; section 17.2, "A value that an observation names"; witness 18.50; rows D21-3 and I3-53 |
| 4 | The sweep of capacity: everything that an entry may retain or start, against the five dimensions | A table of 18 rows, with the sentence that reserves each cell and the admission at which it is checked. Six cells had no sentence. Each is repaired. | Section 17.2b; section 17.2, "What a mark may start"; row I3-52 |
| 5 | The sweep of the observes form: every place where a row may stand | A table of 10 rows. Five things had no statement. Each is stated. | Section 16.1, "Where a row may stand, and what holds there" |
| 6 | The planner's answer 1: a draw past a count is a fault | Written as decided. The state is shown by a read, which is owed by the authority note and the lane forms. The way out is an act with `adds`, or a revision of the definition. | Section 17.2a, "A draw past a count, as the planner decided"; row D21-4 |
| 7 | The planner's answer 2: R1-68 by its smaller option | `settles` by a mark: the grammar, the validator, the judge, the reservation and the replay. A table of 13 rules that read `settles`, each with how it reads the form. | Section 6.4, "`settles` by a mark"; section 17.3; witness 18.51; rows D21-5 and I3-54 |
| 8 | The planner's answer 3: a rightful `withdraw` takes its room from what the request held | `decisions` in a `holds`, and `bound` on a handler. The fold derives the draw from the deciding entry. What stays new work is listed. | Section 15.3g, "A rightful `withdraw`"; section 17.2a, "A request that is bound to a holder"; witness 18.51; rows D21-6 and I3-55 |
| 9 | The planner's answer 4: the name of a public ref | The exact form: two fixed parts and the 64 characters as one component. The rules of Git that it relies on, as attributed and not executed. | Section 3, "The name, exactly"; row D21-7 |
| 10 | Not blocking: the size passage of section 16.1 | Qualified: it is about the compact `RulesContent`. A `publish` that is too large is refused `entry-too-large`. | Section 16.1, "Qualified in revision 21"; row D21-10 |
| 11 | Not blocking: `Report.name` against the named mismatches of observations | The union has six names. | Section 9.5, "Reconciled in revision 21"; rows D21-10 and I3-57 |
| 12 | Not blocking: rows that overlap, and operands that the signer gives, before the grant | Each row is whole, over or absent for itself. A source reads no `signer` and no name that a mark binds. The signer's own member is served by the grant's observation, by a stated comparison. | Section 16.1, "Rows that give one subject, and a subject that the signer gives"; check 10; witness 18.52; rows D21-9 and I3-56 |
| 13 | Not blocking: the order of the reads, against the authority note's section 6.5 | Decided. Two steps of observations in an outcome. No fetch at an outcome, with the reason and its cost. Three changes that the authority note owes. R1-69 is decided in part. | Section 16.1, "A second step, in an outcome" and "The order of the reads, and the judge of a destination"; witness 18.52; row D21-8 |
| 14 | The source table gains a row for each thing that the source must now change | 7 rows, I3-51 to I3-57: 6 "must change" and 1 "to be checked". | Section 11.13 |

What changed in the files. The main note: the opening, with three
changed lines, one dated paragraph and one passage; section 1, one
table; section 3, one point; section 6.1, six lines of a listing, one
paragraph with a table and one sentence; section 6.4, one line of a
listing, one sentence and one point with a table; section 9.5, one line
of a listing and one paragraph; section 11.13, one changed line, one
dated paragraph, seven rows and one paragraph of counts; section 13, one
passage; section 14, four rows; section 15, one passage in 15.3g, one
dated paragraph in 15.6s, and in 15.8 one paragraph and five rows;
section 16.1, three lines of a listing, ten marked sentences or
paragraphs and five new passages; section 17, one passage of its
opening, one row in 17.1, one marked paragraph and three points in 17.2,
three lines of a listing and ten marked or new passages in 17.2a, the
new section 17.2b, and two passages in 17.3; section 18, its heading,
one note under witness 18.48 and four witnesses. `corrections.md`: this
section. Nothing else was changed. Five lines of revision 20 were
removed or replaced, and none of them is a row of a table: three lines
of the note's first paragraphs, one sentence of section 11.13 and the
heading of section 18. Every row of every table of revision 20 is byte
for byte as it was.

### Counts

Each count was made by a script over the main note after the last edit.
The script splits the note at its headings and counts the rows of a
table by the first cell of each row. It also made each sum of the new
witnesses, and it searched the added lines for a dash that is no hyphen,
for trailing spaces and for one phrase that this project does not write.

| Count | Revision 20 | Revision 21 | How it was counted |
|---|---|---|---|
| Rows of section 11.13 | 50 | 57. 49 are marked "must change" and 3 "to be checked": 52 are owed. 1 is not designed. 4 are built. | Rows that begin `I3-`, checked to be 1 to 57 with none missing, by the first words of the fourth cell |
| Open points of section 13 | R1-1 to R1-69 | R1-1 to R1-69. None is new. R1-68 is decided, and R1-69 is decided in part. | The distinct numbers of rows that begin `R1-`, checked to be 1 to 69 with none missing |
| Witnesses of section 18 | 18.1 to 18.48 | 18.1 to 18.52. Witness 18.49 has 12 cases, 18.50 has 11, 18.51 has 14 and 18.52 has 12. | Headings that begin `### 18.`, and rows that begin with a number |
| Rows of section 1 for this revision | | 10, D21-1 to D21-10. The 9 rows D20-1 to D20-9 are unchanged. | Rows that begin `D21-` and `D20-` |
| Rows of section 14 | 66 | 70 | Rows of its table |
| Rows of the table of section 17.2b | | 18, each with 8 cells | Rows that begin with a number |
| Rows of the table of places in section 16.1 | | 10, each with 6 cells | The rows under its heading row |
| Rows of the table of rules that read `settles`, in section 6.4 | | 13 | The same |
| Rows of the table of edges in section 17.3 | | 8 | The same |
| Rows of section 15.8 that begin "From revision 21" | | 5 | The first words of the row |
| Older statements that this revision marks | | 29 | The rows of the table below |
| Lines of revision 20 that the difference removes | | 5, of which none is a row of a table | `git diff -U0`, the lines that begin `-` |

Fourteen numbers are sums or products, computed by a script and not
measured. Witness 18.49: 6 entries, which is 2 times 3; 14, which is 2
times (1 + 6); 15, which is 1 and 14; 7, which is 1 and 6; and 16, which
is 14 and 2. Witness 18.50: 1,186,432 bytes, which is three times
262,144 and 400,000; 786,432, which is three times 262,144; 1,188,432,
which is 2,000 more; 304,500, which is 3,000, 1,500 and 300,000;
881,932, which is 1,186,432 less 304,500; and 4,500. Witness 18.51: 3
entries. Section 16.1: 33,554,432 bytes, which is 128 times 262,144, and
is 32 MiB.

### The older statements that this revision changes

29 sentences, rows or tables of revision 20, or of an earlier revision
that it carries, state a rule that revision 21 changes or makes exact.
Each is marked beside the text, or under its table. No row was edited.

| # | Where | The older statement | The mark |
|---|---|---|---|
| 1 | Section 3, "In a ref's name" | The 64 characters, without the prefix, as a name of 86 bytes | The next point, "The name, exactly. Made exact in revision 21" |
| 2 | Section 6.1, under "Place 7, completed" | The functions of the fifth and the sixth row read no observation | "Changed in revision 21" |
| 3 | Section 6.1, "What platform data states for the turn, and for capacity" | Five members are added | "Added in revision 21", with a table of four more |
| 4 | Section 6.4, the listing of `Settles`, the point "`settles`" and point DI17 | `settles` has two forms | A comment line, a sentence, and the point "`settles` by a mark" |
| 5 | Section 9.5, the listing of `Report` | `name` is one of two names | A comment line, and "Reconciled in revision 21" |
| 6 | Section 15.3g, "No effect of a refused deciding entry" | A bound request that is refused is new work | "Changed in revision 21", in the passage that follows it |
| 7 | Section 16.1, "Bytes, and capacity" | An observation adds no row to the table of bytes, and nothing to a reservation beside the entry's own bytes | "Changed in revision 21" |
| 8 | Section 16.1, "What the validator checks" | Seven checks | "Three more checks. New in revision 21" |
| 9 | Section 16.1, "The order before the turn" | A subject never depends on another observation | "Changed in revision 21" |
| 10 | Section 16.1, "In the commit" | The judge derives one list | "Changed in revision 21" |
| 11 | Section 16.1, "One subject, once" | A subject counts once against the row that gives it first; the signing key as a subject | "Made exact in revision 21" |
| 12 | Section 16.1, "When no observation can be had" | The entry never holds some of the subjects of one row | "Made exact in revision 21" |
| 13 | Section 16.1, "What it counts in capacity" | Bytes only, and inside the entry | "Changed in revision 21" |
| 14 | Section 16.1, "What a row cannot say" | A subject that depends on another observation | "Changed in revision 21" |
| 15 | Section 16.1, the extents, "The bytes" | The bound that the owner of the domain states | "From revision 21" |
| 16 | Section 16.1, the extents, the size of `content` | No guard on the size of the fields of `publish` is asked | "Qualified in revision 21" |
| 17 | Section 17.1, "Bytes, exactly" | A table with no row for a value that an observation names | "One more row, from revision 21" |
| 18 | Section 17.2, "Bytes of a reservation" | A delivery of a result newly retains only its source entry; an observation adds nothing to amount 2; a value at the bound of its domain | "Changed in revision 21, in three sentences" |
| 19 | Section 17.2, row 5 of the table of duties | "The records and operations that its outcomes derive", with no count | The point "The closure of an operation. Made exact in revision 21" |
| 20 | Section 17.2, "A request's clauses", and the open row of section 15.6s | Three duties that a clause can create; a mark in a clause is in no reservation | The point "What a mark may start"; "Dated in revision 21" under the table of section 15.6s |
| 21 | Section 17.2a, checks 4 and 5 | A held kind's mark may list any kind with a finite closure; a failure of check 5 does not validate | "Changed in revision 21" |
| 22 | Section 17.2a, the table "What a holder reserves" | A held kind counts its own attempts | "What a holder reserves, in full. Changed in revision 21", which replaces it |
| 23 | Section 17.2a, after "How the two amounts move" | An operation of a held kind reserves nothing for what its outcomes open | "Corrected in revision 21" |
| 24 | Section 17.2a, "Release" | Three counts | "Added in revision 21" |
| 25 | Section 17.2a, "An attempt that stays `unknown`" | It keeps the 1 entry of its late answer, and no more | "Made exact in revision 21" |
| 26 | Section 17.2a, "What this form does not cover" | A notice that sets a mark, and a bound request that is refused, are new work | "Changed in revision 21" |
| 27 | Section 17.2a, the table of names | `unsupported-definition` for a failure of check 5 | "Added in revision 21", with three rows |
| 28 | Section 17.3, the table of the two kinds | The row "Settling" | "Changed in revision 21: two more settling inputs" |
| 29 | Witness 18.48, cases 6 to 8 | The bound of the owner of the domain | "Read with revision 21" |

Three more places are dated and state no rule: the table "The standing
in force, for revision 20", in the opening; the opening of section
11.13; and the paragraph under the table of section 15.6s. Five listings
gain comment lines and lose none: the members of revision 20 in section
6.1, `Settles`, `Report`, `Observe` and `Held`. The rows D20-1, D20-3,
D20-5, D20-7 and D20-8 of section 1, the rows I3-39, I3-40, I3-44 and
I3-46 of section 11.13, and the rows of sections 15.3g and 15.6t state
the rule of revision 20 and are left as written: rows D21-1 to D21-10
and I3-51 to I3-57 say what changes.

### The adversarial reading

**The two sweeps that the instruction asked for.** Each is a table in
the note.

| Sweep | How it was made | Found |
|---|---|---|
| Capacity: every thing that an entry of every kind may newly retain or start, against the five dimensions (section 17.2b) | The things were listed from the listing of `Input` and of `Effect` in section 4.1, from the table of retained inputs of section 17.1, and from the table of duties of section 17.2. For each thing and each dimension the sentence of section 17 that reserves it was looked for, with the admission at which the room is checked. | Six cells with no sentence. An operation of a kind that no item holds under a held kind, and a value that an observation names for a clause: the verdict's two. How often one operation's outcomes may open a kind. An operation that an effect mark of a clause opens. What an item that a mark opens then reserves. A change of state by a rule. Each is repaired in section 17.2 or 17.2a. One more beside the table: a kind that no item holds could open a held kind for a holder that had released its counts, and check 5 now refuses that edge. No cell is empty, and no row is owed for one. |
| The observes form: every place where a row may stand, against what is read, retained, reserved and derived in a replay (section 16.1) | The places were listed from the listing of `Input` in section 4.1: every input that is judged. For each the six cells were filled from section 16.1, section 6.5 and section 17. | Five things with no statement. A value that a row names was reserved for no act that settles and for no clause. A clause `conflict` may state rows, and is new work. `signer` was not refused as a source. A name that a mark binds was not refused as a source. Two rows that give one subject did not say which is absent. Each is stated. |

**The sweeps of revision 20, made again on the added text.**

| Fault kind | What was swept, and how | Found |
|---|---|---|
| A stale standing of a sibling | The added text, for the phrases of revision 20's sweep. The standing of each sibling, against the table of revision 20. | No sibling's standing changed. The table of revision 20 is dated. One paragraph of section 11.13 is dated, because revision 20 is not adopted and its rows are owed with those of revision 21. |
| A table of forms that disagrees with prose | A search of the whole note for "seven checks", "four parts", "fetches nothing", "retains none", "two forms", "copy of", "nothing for what", "Bytes only", "whole or absent", "gives it first" and "no observation". Each hit was read against the new text. | The statements of the table above. "Four parts" stands: the parts stay four, and parts 3 and 4 are done twice in an outcome. "Fetches nothing" and "nothing is fetched" stand: an outcome still fetches nothing. |
| A refusal name in prose that no row states | Every word in code marks of the added text that is a reason, an answer or a result of a replay | No name is new. `reserve-unbounded` is used in one more case, and the table of names of section 17.2a has the row. `too-late` is a made-up reason of a guard in witness 18.51. `not-reserved`, `evidence-too-large`, `evidence-invalid` and `rules-not-met` are named as the authority note's. |
| A count sentence that is off | Every number of the opening, of sections 11.13, 13 and 15.8, of the new witnesses and of this file, against the script of "Counts" | The first run counted no case for three of the new witnesses: the script's own pattern stopped at a blank line. It was corrected, and the counts are those of the table. The draft of the opening said one new table in section 16.1, where there are four: the sentence now names the table of places. |
| A capability or a bound stated by a version's name | The added text, for "the destination", `judge`, `withdraw`, `compromised` and `publish` | The forms are stated by the members `retains`, `second`, `sets`, `decisions` and `bound`. A row of the authority note is named as the case that asks for a form, or as what that note owes, and never as the rule. |
| A permission that is derived from a count or a state | The added text, for a rule that lets something happen because a number or a state is so | One guard in words was added. Whether a request is bound depends on a count, and that decides only against which room its entry is admitted: the handler's guards decide the request the same way, and no rule reads the count (section 17.2a, "It decides nothing"). A mark that is `true` permits nothing by this contract: what a definition does with it is in its own guards. |
| An exemption by a flag, where a checked reservation is required | Each input that revision 21 makes settling | Two are added, and each has a reservation that an admission checked: row 3 for an entry that sets a mark, and `dec(m)` of a holder for a bound decision. No flag is added. |

**Seven attacks on what this revision decides.**

- *Can a definition still hide a child under a held kind?* Not one that
  the data shows. A kind that the mark lists is held, and draws on a
  count, or is not, and its closure is inside `one(k)`. A kind that the
  mark does not list cannot be opened: that is a fault. What the
  validator cannot see is how a rule's effects change states, and that
  is counted at the worst case.
- *Can a rules scope make an observer keep bytes that it did not
  reserve?* No. The observer keeps a value only in a domain that its own
  row states, within that row's `max`. Any other answer is no answer,
  and no byte of it is stored.
- *Can a sender fill a full destination with requests that are "bound"?*
  No. One item has a stated count of decisions for a message. A request
  past it, a request of another sender and a malformed request are not
  bound, and wait for free room.
- *Can a mark be set twice, to take two reserved entries?* No. No effect
  sets it back, so an item awaits it at most while it is `false`, and
  one entry sets it.
- *Can the second step of observations run without end?* No. There are
  two steps. A changed first step restarts the turn, inside the bound on
  restarts, and then the row's `without` holds.
- *Can a lane choose which keys a destination observes?* Only among the
  keys behind entries that its own message names, and only inside the
  row's `max`. More than that makes the row over, and the rule is told.
- *Can one item be drained by the outcomes of another?* A rule gives
  `for`, so a rule of the definition could draw on any holder. That is
  the definition's own code, a draw past a count is a fault, and the
  planner's answer says what follows.

Six things that this reading did not close. The operand types that check
3 relies on are those of sections 6.2 and 6.5, and section 6.2 was not
read again. The worst case of a rule's changes of state may be a large
number for a definition with many timed rules, and no number was
counted. A late answer is counted as an outcome entry that may open what
a first outcome may: that is never less, and may be much more than a
definition needs. The authority note's section 5.8 and its rows of
`withdraw` were not read again. The rules of Git were not executed. And
the verdict's note that indexes, work and cached records should be
accounted under the five dimensions is answered only by the older rule
that derived storage is in no dimension (section 17.1): charged work
stays R4's.

### Where this text differs from the verdict

- The verdict's first witness finds that used plus reserved rises by 5,
  with one child. This revision reserves 14 entries for that holder, and
  not 8, because a late answer is an outcome entry too and its rule may
  open the child again. That is more than the verdict's arithmetic asks,
  and never less.
- The verdict asks to keep mixed graphs working. They work from a held
  kind down to kinds that no item holds. One edge is now refused that
  revision 20 allowed in words and did not reserve: from a kind that no
  item holds up to a held kind. The verdict did not ask for that. It
  follows from the release of a holder, and section 17.2a gives the
  reason.
- The verdict says that an unconditional wider fetch is not shown to
  equal the adopted behaviour of the authority note's section 6.5. This
  revision does not claim that it is equal. It decides that an outcome
  fetches nothing, says why, and lists three changes of that section as
  owed. The other way is a question for the planner.
- The verdict lists R1-38, R1-66, the binding of a first incarnation to
  the directory and the semantics of a reset as outstanding. They are
  outstanding here too, and this revision changes none of them.

### Questions for the planner

1. The order of the reads. Should an outcome fetch entries that an
   observation selects, with the room reserved at the entry size for
   each outcome entry? Or do the three changes of the authority note's
   section 6.5 stand: every named entry is fetched at the delivery of
   `reserve`, the count is made there, and a message over the bound is
   refused `bad-field`? This revision decides the second (section 16.1).
2. A change of state by a rule is counted at the worst case of the
   definition. Is that cost accepted, or should a mark name the states
   that its rule may set, as a member of `most`?
3. A late answer is counted as an outcome entry that may open what a
   first outcome may. Should a kind be able to state that only a first
   outcome opens, so that a holder reserves half?
4. A `withdraw` for a publication that is final is not bound, and is new
   work. Is that the wanted end of the planner's answer 3?
5. The state of a fault is a read, owed by the authority note, and what
   a member sees is owed by the lane forms. Is that split of owners the
   wanted one?

### What remains owed, beside the lists of "Revision 20"

| Owed | To |
|---|---|
| Independent review of revision 21. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| Rows I3-51 to I3-57 of section 11.13, with rows I3-39 to I3-49 as revision 21 reads them | The I3 delivery, with the owners that the rows name |
| The three changes of its section 6.5; the `retains` of its row of the rules; the rows that state `second`; `settles` by a mark on `compromised`; the `decisions` and the `bound` of `withdraw`; the read that shows a fault and the act that adds to a holder; the fixed parts of each ref's name; and its counts again, with the closure of each kind that no item holds | The authority note's next revision |
| What a member is shown at the lane for a fault at a destination | The lane forms' next revision |
| Every count, each `max` of `retains`, the cost of the worst case of a mark, and a check of each ref's name with `git check-ref-format` | R4, with the capacity follow-through `cc570904`; the builder of row I3-46, for the last |
| Points R1-38 and R1-66, and the part of R1-69 for an act and a clause | This note's next revision, with the owners that each names |

### Limits of revision 21

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One delegated author wrote it, with no second reader.
- This note was read in the parts that its opening lists: sections 6.5,
  16.0, 16.1 and 17 to 17.3 whole, with the passages of sections 3, 6.1,
  6.4, 9.5 and 15.3g that the revision changes, and witnesses 18.46 to
  18.48. Everything else was found by a search or was not read again.
- The authority note's revision 26 was read in its section 6.5, whole,
  and in parts of its section 12.1.5. Its section 5.8 was not read
  again.
- The I3 source was not read, apart from the two pinned lane
  definitions, by a script. The I3 deltas note was not read.
- No adoption act was read. The standing is as the instruction and the
  verdict give it.
- No Git command was run to check a ref's name. The rules of Git are
  stated as the writer knows them.
- A script outside the repository applied the edits, counted rows,
  points, witnesses and cases, made fourteen sums and computed two
  SHA-256 values. No number in this revision is measured.

## Revision 22

2026-10-06. Revision 21, at `b68ce5e3`, was reviewed in the verdict
`dc1da38a`, which asked for changes. It is not adopted, and revision 19,
at `1ca8a59b`, is still in force. Revision 22 is on revision 21, keeps
all of it apart from what it marks, and is a proposal until it is
reviewed and adopted. One delegated author wrote it. The verdict found
the two repairs of revision 21 sound, and this revision changes neither
rule: three cells of the table of `one(k)` gain a sentence that says
what its definition already counted. It repairs the verdict's two new
findings, which are both in what revision 21 added from the planner's
answers. It answers the clarifications that do not block, writes in the
planner's five answers of the act `39749e26`, and puts one sweep in the
note as a table. The companion and the admission read inventory are
unchanged, byte for byte: their SHA-256 values begin `399359e9` and
`a2b8f683`, computed again. The pinned lane bytes and digests are not
changed by this note. Every row of every earlier section of this file is
byte for byte as it was.

### What was asked, and where each thing was done

| # | Asked | The change | Where |
|---|---|---|---|
| 1 | P2 1: the binding form cannot state the adopted rightful withdrawal, because the publication is found by a mark | A mark at place 2 may be the source of `bound.of`, as a binding selector. It is given the items of its type and the fields of the message, and nothing else. It returns one item or none. Its work is bounded by the items of the type, within the budget of items. An index is allowed and not required. The validator refuses any other mark as that source, as `bound-source`. A table gives each condition of the binding with the answer when it fails. A request before its opening request, a repeat and several items at once are each stated. | Section 17.2a, "The source of `bound.of`"; section 6.1, "A binding selector is given less"; section 15.3g; witness 18.53; rows D22-1 and I3-58 |
| 2 | P2 1: which of the two routes | The mark, and not a written selector. The reason is in the note: a fourth way of naming an item would be a form for every definition, and the adopted row has the mark already. | Section 17.2a, "Why this, and not a written selector" |
| 3 | P2 2: independent marks have no determinate reservation identity | One rule of 11 parts. A marker duty is an item and a slot. Alternatives are of one duty. Distinct duties are summed, with the state duty and the deadline. A completed mark is in no later closure, which is why the count ends. A cycle is looked for by state and by timed rule only. The duty is reserved when it becomes pending, which is the opening where the initial state is listed. | Section 17.2, "A marker duty"; section 6.4, "Several marks on one item"; witness 18.54; rows D22-2 and I3-59 |
| 4 | P2 2: reconcile the "largest" sentence of section 6.4, point DI18 and the row of the table | Each is marked, and each now reads by the one rule | Section 6.4, "Changed in revision 22" and "Four rows of the table above"; section 17.2, "Changed in revision 22, in points DI18 and DI19" |
| 5 | P2 2: mirror it in the admission formula and in the cells of `one(k)` | The duty of an entry that settles by a mark is one marker duty. "What an item in a state reserves" is the sum of rule 6, in `one(k)`, in `itm` and for a mark. | Section 17.3, "Changed in revision 22"; section 17.2a, "Changed in revision 22, in three cells"; section 17.2, rule 11 |
| 6 | P2 2: the planner's purpose, checked | The first notice is recordable at a full destination: the mark `aborting`, reserved from the taking entry inside `one(k)` of `judge`, and the publication's own duty from the outcome that sets `reserved`. On three things that the authority note owes. | Section 17.2, "The case that the form exists for, checked" |
| 7 | Not blocking: check 5 by request and clause edges and by every other edge | A table of 6 edges of a closure. Three are refused, one is refused by check 2, one cannot hold a mark, and one is not refused by this check, with the reason. The verdict's path is shown as refused. | Section 17.2a, "Check 5, by every edge of a closure"; the note under witness 18.49; rows D22-4 and I3-60 |
| 8 | Not blocking: the induction, checked again by kind of edge, and whether an adopted flow needs the refused edge | 4 rows of what changes. None of the adopted rows that were read needs the refused edge. One condition on the destination's branch is stated. One open thing is stated. | Section 17.3, "The induction, checked again in revision 22" |
| 9 | Not blocking: the cells of `one(k)` for items, records and pending requests | Each names what a change of state starts | Section 17.2a, the table of `one(k)` |
| 10 | Not blocking: superseded smaller formulas stay visibly replaced | Four places are marked: the table of revision 20, two sentences on what an operation and a request reserve, the sum of 72, and witness 18.47 | Section 17.2a; witness 18.47 |
| 11 | Not blocking: the planner's five answers of the act `39749e26`, where the text still asks | Each is written as decided, beside the sentence that asked | Section 16.1, "The other way, not taken"; section 17.2, "The closure of an operation" and "What a mark may start"; section 17.2a, "A draw past a count" and "What is not bound"; section 13; section 15.8; row D22-5 |
| 12 | The family sweep: each added form against its adopted case | One table of 10 rows in the opening. Two rows had a "no", and both are repaired. Three more things were found. | The opening, "The sweep of revision 22" |
| 13 | The source table gains a row for each thing that the source must now change | 3 rows, I3-58 to I3-60, each "must change" | Section 11.13 |

What changed in the files. The main note: the opening, with five changed
lines, one dated paragraph and one passage; section 1, one table;
section 6.1, one point; section 6.4, two marked sentences and one
passage; section 11.13, one changed line, one dated paragraph, three
rows and one paragraph of counts; section 13, one passage; section 14,
three rows; section 15, one paragraph in 15.3g, and in 15.8 one
paragraph, four rows and one dated paragraph; section 16.1, one marked
sentence; section 17, one passage of its opening, three marked
sentences, one point and one marked paragraph in 17.2, one line of a
listing, ten marked or new passages and three cells of one table in
17.2a, one paragraph in 17.2b, and two passages in 17.3; section 18, its
heading, a note under each of the witnesses 18.47, 18.49 and 18.51, and
two witnesses. `corrections.md`: this section. Nothing else was changed.
10 lines of revision 21 were removed or replaced. Three of them
are rows of one table: the rows of `one(k)` for items, records and
pending requests, each of which gained one sentence in one cell and lost
no word. The others are five lines of the note's first paragraphs, one
sentence of section 11.13 and the heading of section 18. Every other row
of every table of revision 21 is byte for byte as it was.

### Counts

Each count was made by a script over the main note after the last edit.
The script splits the note at its headings and counts the rows of a
table by the first cell of each row. It also made each sum of witness
18.54, found each line number of the table of the sweep, and searched
the added lines for a dash that is no hyphen, for trailing spaces and
for one phrase that this project does not write.

| Count | Revision 21 | Revision 22 | How it was counted |
|---|---|---|---|
| Rows of section 11.13 | 57 | 60. 52 are marked "must change" and 3 "to be checked": 55 are owed. 1 is not designed. 4 are built. | Rows that begin `I3-`, checked to be 1 to 60 with none missing, by the first words of the fourth cell |
| Open points of section 13 | R1-1 to R1-69 | R1-1 to R1-69. None is new, and none changes its standing. | The distinct numbers of rows that begin `R1-`, checked to be 1 to 69 with none missing |
| Witnesses of section 18 | 18.1 to 18.52 | 18.1 to 18.54. Witness 18.53 has 17 cases, and 18.54 has 15. | Headings that begin `### 18.`, and rows that begin with a number |
| Rows of section 1 for this revision | | 6, D22-1 to D22-6. The 10 rows D21-1 to D21-10 are unchanged. | Rows that begin `D22-` and `D21-` |
| Rows of section 14 | 70 | 73 | Rows of its table |
| Rows of the table of the sweep, in the opening | | 10, each with 7 cells | Rows that begin with a number, under its heading row |
| Rows of the table of edges of a closure, in section 17.2a | | 6 | The same |
| Rows of the table of the conditions of a binding, in section 17.2a | | 6: 5 conditions, and the row where all hold | The rows under its heading row |
| Rows of the table of the induction, checked again, in section 17.3 | | 4 | The same |
| Rows of section 15.8 that begin "From revision 22" | | 4 | The first words of the row |
| Older statements that this revision marks | | 26 | The rows of the table below |
| Lines of revision 21 that the difference removes | | 10, of which 3 are rows of a table | `git diff -U0`, the lines that begin `-` |

Fourteen numbers of witness 18.54 are sums, computed by a script and
not measured. Case 1: 3, which is 1 and 2; and 5, which is 3, 1 and 1.
Case 2: 6, which is 1 and 5. Case 3: 2, which is 1 and 1. Case 4: 4,
which is 3 and 1. Case 5: 5, which is 1, 3 and 1. Case 8: 4, which is 3
and 1. Case 9: 3, which is 1, 1 and 1; 4, which is 1 and 3; and 8, which
is 3, 1 and 4. Case 10: 2, which is 1 and 1; 3, which is 1 and 2; and 4,
which is 1 and 3. Case 11: 2, which is 1 and 1. The script computes each
from the forms of the witness by the rule of section 17.2, "A marker
duty", and compares it with the number in the table.

### The older statements that this revision changes

26 sentences, rows or tables of revision 21, or of an earlier
revision that it carries, state a rule that revision 22 changes, makes
exact or records as decided. Each is marked beside the text, or under
its table. Three cells of one table gained a sentence. No other row was
edited.

| # | Where | The older statement | The mark |
|---|---|---|---|
| 1 | Section 6.1, "What a rule is given" | Every rule is given six things | The point "A binding selector is given less. New in revision 22" |
| 2 | Section 6.4, "`settles` by a mark", "What the validator checks" | Where several forms settle one item the largest reservation counts | "Changed in revision 22" |
| 3 | Section 6.4, the same, "What it reserves" | Row 3, for the settling act or handler | "Made exact in revision 22" |
| 4 | Section 6.4, the table of 13 rules, rows 3 to 6 | The mark is taken as `false`; the form's own mark is not counted, and the subject's states are counted as for any other subject | "Four rows of the table above, read with this", in the passage that follows the table |
| 5 | Section 15.3g, "A rightful `withdraw` draws on what its publication holds" | The handler states `bound`, with no word on how the publication is found | "Changed in revision 22" |
| 6 | Section 16.1, "The other way, not taken" | Whether it is wanted is the planner's to say | "Decided in revision 22" |
| 7 | Section 17.2, "The closure of an operation" | A late answer is counted like a first outcome | "Decided in revision 22" |
| 8 | Section 17.2, "What a mark may start", "A change of state" | A form that names the states would count less, and no row asks for it | "Decided in revision 22", and "Read with revision 22" |
| 9 | Section 17.2, the same, "A settling form" | A mark of a settling form counts as every mark | "Changed in revision 22" |
| 10 | Section 17.2, points DI18 and DI19 | The largest over the states that the list can set; a state of the settled subject that the form's own `settles` lists is not counted | "Changed in revision 22, in points DI18 and DI19" |
| 11 | Section 17.2a, the listing of `Held` and `bound` | `bound` with no word on its source | A comment line |
| 12 | Section 17.2a, checks 2 and 5 | From a kind that no item holds no held kind is reached, checked on the mark of the kind | "Check 5, by every edge of a closure. Made exact in revision 22" |
| 13 | Section 17.2a, the table "What a holder reserves" | The attempts of a held kind, as the amount | "Replaced. Marked in revision 22" |
| 14 | Section 17.2a, the table of `one(k)`, three cells | Items, records and pending requests of each C(j) only | "Revision 22" in each cell, and "Changed in revision 22, in three cells" |
| 15 | Section 17.2a, "How the two amounts move" | The operation reserves the same 2 entries for each attempt, and the request the same | "Marked in revision 22" |
| 16 | Section 17.2a, "A draw past a count, as the planner decided" | Two rows are owed, by two owners | "Confirmed in revision 22" |
| 17 | Section 17.2a, "The numbers are the authority note's" | 72 entries, by the table above | "Marked in revision 22" |
| 18 | Section 17.2a, the tables of names | No name is new | "Added in revision 22", with two rows |
| 19 | Section 17.2a, "A request that is bound to a holder", "What the validator checks" | Its `of` is a name that a written rule binds, and no mark | "Changed in revision 22", and the passage "The source of `bound.of`" |
| 20 | Section 17.2a, the same, "What is not bound, and is new work" | Five cases in one sentence | "Stated in revision 22, case by case" |
| 21 | Section 17.2b, rows 2, 3, 13 and 15 | A settlement (row 3); `dec(m)` | "Read with revision 22" |
| 22 | Section 17.3, "The induction, by edge", rows 5 and 8 | Every clause may open an operation by a mark | "The induction, checked again in revision 22" |
| 23 | Section 17.3, the table of the two kinds, with "Changed in revision 21: two more settling inputs" | Row 3 as the duty of an entry that sets a mark | "Changed in revision 22: the duty of an entry that settles by a mark" |
| 24 | Witness 18.47 | 8 entries for three operations and a request | "Read with revisions 21 and 22" |
| 25 | Witness 18.49 | 12 cases | "Read with revision 22", with one more control |
| 26 | Witness 18.51 | A name of `also` with no stated source | "Read with revision 22" |

Three more places are dated and state no rule: the table "The standing
in force, for revision 21", in the opening; the opening of section
11.13; and the paragraph under the table of section 15.8. One listing
gains a comment line and loses none: `Held`, in section 17.2a. The rows
D21-1, D21-2, D21-4, D21-5, D21-6 and D21-8 of section 1, and the rows
I3-51, I3-52, I3-54 and I3-55 of section 11.13, state the rule of
revision 21 and are left as written: rows D22-1 to D22-6 and I3-58 to
I3-60 say what changes.

### The adversarial reading

**The sweep that the instruction asked for.** It is a table in the
opening of the note.

| Sweep | How it was made | Found |
|---|---|---|
| Each form that revisions 20 and 21 added, against the adopted case that it exists for: `observes` with `second`, `retains`, `holds` with `adds` and `decisions`, `for`, `bound`, `settles` with `sets`, `once` and `always`, `HoldersObservation`, and the text of a fact with a ref's name | For each form the adopted case was named, and its rows were read in the authority note's revision 26, as the opening lists them. Two things were asked: whether every selector, source and field of the case is in the grammar, and whether the reservation says what is reserved, keyed by what, when it is taken and when it is released. The line that states the identity was found by a script. | Two rows at "no", which are the verdict's two findings. Three more things of the same kind. A form that declares `settles` and holds an effect mark did not have a finite count at the worst case: repaired by one rule. An effect mark of a bound handler may open an item, and `dec(m)` counted none: stated. The branch must hold two kinds, and one act must be on the branch: a condition on rows that the authority note owes. |

**The sweeps of revision 20, made again on the added text.**

| Fault kind | What was swept, and how | Found |
|---|---|---|
| A stale standing of a sibling | The added text, for the phrases of revision 20's sweep. The standing of each sibling, against the table of revision 21. | No sibling's standing changed. The table of revision 21 is dated. One paragraph of section 11.13 is dated, because revision 21 is not adopted and its rows are owed with those of revision 22. |
| A table of forms that disagrees with prose | A search of the whole note for "largest", "no mark", "written rule binds", "taken as", "own attempts", "2 entries for each attempt", "reserves the same", "no held kind" and "bound handler". Each hit was read against the new text. | The statements of the table above. "Where several forms settle one state, the largest" stands, in row 3 of the table of duties and in point DI18: it is about a state duty. |
| A refusal name in prose that no row states | Every word in code marks of the added text that is a reason, an answer or a result of a replay | One name is new: `bound-source`, a refusal of the validator, with its row in the table of names of section 17.2a. `reserve-unbounded` is used in two more cases, and the table has the row. `too-late` and `not-owner` are made-up reasons of guards in witness 18.53. `ended`, `not-owner` and `bad-field` on a `withdraw` are named as the authority note's and this contract's own. |
| A count sentence that is off | Every number of the opening, of sections 11.13, 13, 14 and 15.8, of the new witnesses and of this file, against the script of "Counts" | None after the last run. |
| A capability or a bound stated by a version's name | The added text, for "the destination", `judge`, `withdraw`, `compromised` and `publication-of` | The forms are stated by the members and by the place of a mark. A row of the authority note is named as the case that a form exists for, as what was read, or as what that note owes, and never as the rule. |
| A permission that is derived from a count or a state | The added text, for a rule that lets something happen because a number or a state is so | None is added. Whether a request is bound still decides only against which room its entry is admitted. A mark that is `true` ends a duty, and permits nothing. |
| An exemption by a flag, where a checked reservation is required | Each input that revision 22 makes settling, and each count that it lowers | No input is made settling that revision 21 did not make settling. One count is lowered: an effect mark of a form that declares `settles` counts no change of state. It is lowered by a rule that the judge holds the rule to, with a fault, and not by a flag. |

**Seven attacks on what this revision decides.**

- *Can a binding selector read something outside the scope, or something
  that changes between a runtime and a replay?* No. It is given the
  items of one type as the state before the entry holds them, and the
  fields as read. It is given no clock, no observation, no value and no
  entry.
- *Can a lane use up another lane's reserved decision by naming its
  publication?* No. The selector finds the item that the message names,
  whoever sent it. The `where` then fails, the request is not bound, and
  no count moves.
- *Can a request that arrives before its item take room that nothing
  reserved?* No. The selector gives none, the request is new work, and
  it waits for free room.
- *Can two marks of one item share one reserved entry, or one mark take
  two?* No. Each pair of an item and a slot is one duty with its own
  amount, and a mark is set once.
- *Can marks make a closure that does not end?* Not on one item: each
  step by a mark completes that mark for the rest of the path. On
  another item no mark is completed, and a form that reaches its own
  duty there is refused.
- *Can a rule of a settling form start a duty that nothing reserved?* It
  can open the operations and the item of its `most`, which are counted.
  A change of state is a fault.
- *Can an entry with no account draw on a holder that has released?* An
  outcome of a kind that no item holds, and a clause of its request,
  cannot: the validator refuses the definition. A clause of a request
  that an act with no account sent still can. That is the open thing of
  section 17.3, and the first question below.

Six things that this reading did not close. The number of sets of
completed marks that a validator must count grows with the marks of one
type, and no bound on the marks of a type is proposed. The search of a
binding selector is bounded by the budget of items, which may be large,
and no cost was counted. The authority note has `open-withdrawn` open a
publication "as `not-reserved`", and section 6.1 of this note makes an
opening in another state than the initial one a fault of a rule: how
that row is written is that note's, and it was not followed further. The
rows of the task were read in two tables only. The lane forms' note was
not read. And charged work stays R4's, as in revision 21.

### Where this text differs from the verdict

- The verdict offers two routes for its first finding, and a third by a
  change of the message. This revision takes one: the mark, under
  restrictions. It writes no written selector.
- The verdict asks that check 5 cover "request/result-clause and every
  other closure edge" if that is the intended condition. This revision
  states every edge, and refuses three of the six. It does not refuse a
  settlement by an act or a delivery whose mark lists a held kind, where
  the item was opened or left in its state by a closure. That entry is
  judged like any entry of its form, and the same edge is permitted for
  every other act.
- The verdict asks to avoid "a narrower form merely to make conservation
  easy". This revision adds one restriction that the verdict did not ask
  for: a rule of a form that declares `settles` returns no change of
  state. It is not for ease. Under the worst case that the verdict
  credits as part of the first repair, such a form with an effect mark
  had no finite count at all, and the form that the planner asked for is
  such a form. The other way is a mark that names the states that its
  rule may set, which the planner has put later. It is the second
  question below.
- The verdict says that the second finding is a conflict of the
  specification, and no proved overflow. This revision treats it so. The
  control of witness 18.54 shows what the item-wide largest would allow,
  and claims nothing of a source.
- The verdict prefers explicit transferable claims if a required flow
  needs the edge from a kind that no item holds to a held kind. No
  adopted row that was read needs it, so none is added.

### The planner's answers, and questions for the planner

The planner answered the five questions of revision 21 by the act
`39749e26`. Each is written into the note as decided.

| # | The question of revision 21 | The planner's answer | Where it is written |
|---|---|---|---|
| 1 | The order of the reads: a fetch at an outcome, or three changes of the authority note's section 6.5 | The three changes, as the note decides | Section 16.1, "The other way, not taken" |
| 2 | A change of state by a rule, counted at the worst case | Accepted | Section 17.2, "What a mark may start" |
| 3 | A kind that states that only a first outcome opens | It may be a declared, validated property of a kind. The default stays full. | Section 17.2, "The closure of an operation" |
| 4 | A `withdraw` for a final publication is new work | Yes | Section 17.2a, "What is not bound", and the table of the conditions of a binding |
| 5 | The owners of the state of a fault | The split is right | Section 17.2a, "A draw past a count" |

Four questions of this revision.

1. A clause of a request that an entry with no account sent may open a
   held kind for a holder. If that holder became final first, the draw
   is a fault, the result stays undecided, and no act adds to a final
   holder. Should the validator refuse that edge too, should a holder
   keep a count while such a request is pending, or does the fault stand
   as the answer?
2. A rule of a form that declares `settles` returns no change of state.
   Is that the wanted rule, or should a mark name the states that its
   rule may set, now and not later, so that such a rule may set some?
3. A binding selector may read every item of its type, within the budget
   of items, and an index is the builder's choice. Should the contract
   require an index, with a stated bound on a selection?
4. The branch of a destination must hold `first-head` and `adopt-read`,
   and `adopt-head` must be an act on the branch. This revision lists
   that as owed by the authority note. Is that the wanted owner, or
   should `adds` name its holder by a subject, so that the row can stay
   as it is?

### What remains owed, beside the lists of "Revision 21"

| Owed | To |
|---|---|
| Independent review of revision 22. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| Rows I3-58 to I3-60 of section 11.13, with rows I3-39 to I3-57 as revision 22 reads them | The I3 delivery, with the owners that the rows name |
| That `publication-of` is a binding selector, and the `where` of `withdraw`; the name of `also` for the `settles` of `compromised`; the `holds` of the branch with `first-head` and `adopt-read`, and `adopt-head` as an act on the branch; the three changes of its section 6.5; and its counts again, with a marker duty and `dec(m)` | The authority note's next revision |
| The four questions above | The planner |
| The cost of a selector's search, a bound on the marks of one type, and every count | R4, with the capacity follow-through `cc570904` |
| Points R1-38 and R1-66, and the part of R1-69 for an act and a clause | This note's next revision, with the owners that each names |

### Limits of revision 22

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One delegated author wrote it, with no second reader.
- This note was read in the parts that its opening lists: section 6.4
  whole, section 17 from its opening to point DI21, the passages of
  sections 6.1, 15.3g and 16.1 that bear on a mark, on a selector and on
  a row of `observes`, and witnesses 18.47 to 18.52. Everything else was
  found by a search or was not read again.
- The authority note's revision 26 was read in the rows that its opening
  row lists: its exception for one `withdraw`, its section 6.5 and its
  section 12.1.5 for the destination, and the two tables of rules of its
  section 12.1.8 with most rows cut.
- The I3 source was not read, apart from the two pinned lane
  definitions, by a script. Of the I3 deltas note two entries were read,
  by a search.
- No adoption act was read. The standing is as the instruction and the
  verdict give it.
- A script outside the repository applied the edits, counted rows,
  points, witnesses and cases, made the sums of witness 18.54, found
  twelve line numbers and computed two SHA-256 values. No number in this
  revision is measured.

## Revision 23

2026-10-06. Revision 22, at `a1c709e4`, was reviewed in the verdict
`675776bc`, which asked for changes. It is not adopted, and revision 19,
at `1ca8a59b`, is still in force. Revision 23 is on revision 22, keeps
all of it apart from what it marks, and is a proposal until it is
reviewed and adopted. One delegated author wrote it. The verdict has one
finding, a P2, and credits everything else of revision 22. This revision
repairs that finding, writes in the planner's four answers of the act
`2d3fa911`, and puts one sweep in the note as a table. The companion and
the admission read inventory are unchanged, byte for byte: their SHA-256
values begin `399359e9` and `a2b8f683`, computed again. The pinned lane
bytes and digests are not changed by this note. Every row of every
earlier section of this file is byte for byte as it was.

### What was asked, and where each thing was done

| # | Asked | The change | Where |
|---|---|---|---|
| 1 | The P2: reconcile the binding selector with the planner's required indexed lookup | A binding selector uses an index that its item type declares, and the validator refuses one that names none. Revision 22 said in six places that it may read every item, that an index is not required, or that the validator checks none. Each place in the note now states the planner's rule. | Section 17.2a, "An index that an item type declares" and "The source of `bound.of`"; section 6.1; rows D23-1, D23-2 and I3-61; witness 18.53 |
| 2 | The index declaration | `indexes` on an item type of platform data: 1 to 4 slots of `refs` or `values`, each fixed and required, each of one of seven types. Why fixed and required: each item has one key for each indexed slot for all its life, no row moves, and "no value" is never a key. | Section 17.2a, "The form", "Which slots" and "Why fixed and required"; section 6.1, the listing and one table |
| 3 | The equality of a key | The equality of section 6.2. For a fact of another scope: the whole `FactRef`, which is its text of section 3, byte for byte. No part matches alone. | Section 17.2a, "When two keys are equal" |
| 4 | What the selector states, and the validator's refusal | The mark states `index` and `key`. `key` is a required field of the handler whose type is the type of the slot. `bound-source` in four more cases: no index, an index that is not declared, a key of another type, and the two members on a mark that is no binding selector. An ill-stated `indexes` is `unsupported-definition`, as for check 1. | Section 17.2a, "What the validator checks", twice, and the table of names |
| 5 | What the rule is given | The items that the index returns for the value of the field: live and final, as the state before the entry holds them, in order of item ID, at most 8. And the fields of the message. No other item, and still no sender, clock, observation, value, fetched entry or item of another type. | Section 17.2a, "What it is given" and "What it is not given"; section 6.1, "A binding selector is given less" |
| 6 | The policy for no match, one match and several | None returned: the selector gives none and no rule runs. 1 to 8: the rule chooses one of them, or none. More than 8: a fault. In the adopted rows one key finds at most one item. | Section 17.2a, "None, one, several, and more than 8" |
| 7 | The index and query contract | Derived state of the fold. One row for each item, written in the transaction that opens it. Complete at every head, so an item that an earlier entry of the same turn opened is found. Final items stay indexed for as long as they are retained. One lookup, and no other query. A checkpoint holds the items and no row of the index. A replay rebuilds it by folding. | Section 17.2a, "What it holds" to "Replay"; section 17.1, one sentence |
| 8 | The work of a lookup, and where it is counted | At most 9 rows of the index and 8 items, whatever the scope retains. A count of records read, in no dimension. Whether it is charged is R4's. | Section 17.2a, "The work of one lookup" |
| 9 | How this index relates to the operations indexed by item, of revision 20 | They are two relations. That one is part of the folded state that every other rule is given. A declared index is of the same kind as the index on the slots of a `where`. | Section 17.2a, "The two other indexes", and one sentence under "What holds the count" |
| 10 | The narrower interface, made explicit | One point says what a binding selector can no longer do, by whose direction, and that the adopted row needs none of it. | Section 17.2a, "What a binding selector can no longer do" |
| 11 | Other marks at place 2 | Not required to use an index. The planner's words name a binding selector. The adopted marks at place 2 are listed. | Section 17.2a, "A mark at place 2 that is no binding selector" |
| 12 | Witness 18.53 | 25 cases. The setup states the index. 8 cases are stated again and 8 are new: no index, an index that is not declared, a key of the wrong type, an ill-stated `indexes`, two matches of which one is final, the index at the head, more than 8, and the whole reference among many. The controls of the wrong owner and of a repeat are kept, with the target that neither reference of the board names. | Witness 18.53 |
| 13 | What the authority note owes | One sentence, as an owed row: `publication` declares the index on `operation`, and `publication-of` states it with its key. | Section 17.2a, "What the authority note owes"; section 15.3g; section 15.8 |
| 14 | The planner's four answers of the act `2d3fa911`, where the text still asks | Each is written as decided, beside the sentence that asked | Section 17.3, "One open thing" and "One condition that the check puts on the destination"; section 6.4; rows D22-3, D22-4 and D23-3; section 15.8 |
| 15 | The sweep | One table of 11 rows in the opening | The opening, "The sweep of revision 23" |
| 16 | The source table gains a row for what the source must now change | 1 row, I3-61, "must change". Row I3-58 is marked. | Section 11.13 |

What changed in the files. The main note: the opening, with four changed
lines, three marked sentences, one dated paragraph and one passage;
section 1, three changed rows and one table; section 6.1, one line of
one listing, three lines of another, one table and one changed point;
section 6.4, one marked sentence; section 11.13, one changed row, one
dated paragraph, one row and one paragraph of counts; section 13, one
passage; section 14, one row; section 15, one paragraph in 15.3c, one in
15.3g, and in 15.8 four rows and one dated paragraph; section 17, one
passage of its opening, one sentence in 17.1, one paragraph in 17.2b,
two marked passages in 17.3, and in 17.2a one line of a listing, one
sentence, one table of names, one new passage, and in "The source of
`bound.of`" three rewritten points, three new points and eight marked
ones; section 18, its heading and witness 18.53. `corrections.md`: this
section. Nothing else was changed. 77 lines of revision 22 were
removed or replaced. 13 of them are rows of tables: D22-1, D22-3,
D22-4 and I3-58, and nine cases of witness 18.53. The others are four
lines of the note's first paragraphs, one line of the opening, the
points of sections 6.1 and 17.2a that are rewritten, the heading of
section 18, and the setup and the closing of witness 18.53.

### Counts

Each count was made by a script over the main note after the last edit.
The script splits the note at its headings and counts the rows of a
table by the first cell of each row. It also found each line number of
the table of the sweep, and searched the added lines for a dash that is
no hyphen, for trailing spaces and for one phrase that this project does
not write.

| Count | Revision 22 | Revision 23 | How it was counted |
|---|---|---|---|
| Rows of section 11.13 | 60 | 61. 53 are marked "must change" and 3 "to be checked": 56 are owed. 1 is not designed. 4 are built. | Rows that begin `I3-`, checked to be 1 to 61 with none missing, by the first words of the fourth cell |
| Open points of section 13 | R1-1 to R1-69 | R1-1 to R1-69. None is new, and none changes its standing. | The distinct numbers of rows that begin `R1-`, checked to be 1 to 69 with none missing |
| Witnesses of section 18 | 18.1 to 18.54 | 18.1 to 18.54. None is new. Witness 18.53 has 25 cases, where it had 17: cases 18 to 25 are new. | Headings that begin `### 18.`, and rows that begin with a number, checked to be 1 to 25 with none missing |
| Rows of section 1 for this revision | | 3, D23-1 to D23-3. The 6 rows D22-1 to D22-6 are still 6, and 3 of them are marked. | Rows that begin `D23-` and `D22-` |
| Rows of section 14 | 73 | 74 | Rows of its table |
| Rows of the table of the sweep, in the opening | | 11, each with 4 cells | Rows that begin with a number, under its heading row |
| Rows of section 15.8 that begin "From revision 23" | | 4 | The first words of the row |
| Older statements that this revision marks | | 30 | The rows of the table below |
| Lines of revision 22 that the difference removes | | 77, of which 13 are rows of a table | `git diff --numstat`, and the removed lines that begin with a cell |

No number of this revision is a sum. Four numbers are proposals of this
note, and none is measured: 4 indexed slots for a type, 8 items for a
selection, 9 rows for a lookup, and the 40 jobs of case 25 of the
witness, which is made up.

### The older statements that this revision changes

30 sentences, rows or passages of revision 22, or of an earlier
revision that it carries, state a rule that revision 23 changes, makes
exact or records as decided. Each is marked beside the text, or under
its table. Where a point of revision 22 stated the opposite of the
planner's rule, the point is rewritten in place and says what it said
before, so that no place of the note still states the older rule as the
rule.

| # | Where | The older statement | The mark |
|---|---|---|---|
| 1 | The opening, "Revision 22", Part 1 | A selector that is given the scope's own items of one type | "Changed in revision 23" |
| 2 | The opening, the decisions of revision 22 | Its rule is given the items of one type | "Changed in revision 23" |
| 3 | The opening, "What changes in an entry's bytes", of revision 22 | No member is added to the data of a definition | "Changed in revision 23" |
| 4 | Section 1, row D22-1 | The rule is given the items of the type, its work is one read of each, and an index is allowed and not required | The three statements are taken out of the cell, which says so: "Changed in revision 23" |
| 5 | Section 1, row D22-3, "Left to" | Whether a mark should name the states: the planner | "Decided in revision 23" |
| 6 | Section 1, row D22-4, "Left to" | A draw by a clause of a request that an entry with no account sent: the planner | "Decided in revision 23" |
| 7 | Section 6.1, "A binding selector is given less" | The items of the type that the mark states | "Changed in revision 23" |
| 8 | Section 6.4, "A rule of a form that declares `settles` sets no state" | The rule, as a proposal with a question | "Confirmed in revision 23" |
| 9 | Section 11.13, row I3-58 | The scan is inside the bound, and an index is the builder's choice | "Changed in revision 23", in the row |
| 10 | Section 15.3c, row P15 | A selection by value needs an index on that slot, and a rule for no match and for several | "Read with revision 23, for P15" |
| 11 | Section 15.3g, "Changed in revision 22" | A binding selector that is given only the items of its type | "Changed in revision 23" |
| 12 | Section 15.8, the last row "From revision 22" | Three questions for the planner | "Dated in revision 23" |
| 13 | Section 17.1, "Storage that is derived" | Indexes are in no dimension | "Confirmed in revision 23" |
| 14 | Section 17.2a, "What holds the count" | The operations of one item: an index of the fold | "Read with revision 23" |
| 15 | Section 17.2a, the tables of names | One name is new, and one is used in two more cases | "Added in revision 23", with two rows |
| 16 | Section 17.2a, "Why this, and not a written selector" | A written selector would need an index that every runtime keeps, and this changes no adopted row | "Read with revision 23" |
| 17 | Section 17.2a, "Which mark is one" | The data says it, with no new member | "Changed in revision 23" |
| 18 | Section 17.2a, "What it is given" | The items of the type that the mark states, live and final | The point is rewritten: "Changed in revision 23" |
| 19 | Section 17.2a, "What it is not given" | Items of another type | "Added in revision 23" |
| 20 | Section 17.2a, "Its work, and its bound" | At most one read of each item of the type, within the budget of items | The point is rewritten: "Changed in revision 23" |
| 21 | Section 17.2a, "An index is allowed, and not required" | The contract asks for no index, the data states none, and the validator checks none | The point is rewritten as "An index is required. Changed in revision 23" |
| 22 | Section 17.2a, "What the validator checks", of the source | The mark states `code`, `row` and `item` and no other member | "Changed in revision 23" |
| 23 | Section 17.2a, "What the judge does" | It runs the selector with its two things | "Changed in revision 23" |
| 24 | Section 17.2a, the table of the conditions of a binding, row 2 | It selects none: the scope holds no item for what the message names | "Read with revision 23" |
| 25 | Section 17.2a, "Replay", of the source | The verifier is given the folded state before the entry | "Changed in revision 23" |
| 26 | Section 17.2a, "What the authority note owes" | That `publication-of` is a binding selector, and the `where` | "Added in revision 23" |
| 27 | Section 17.2b, rows 2, 3 and 18 | The indexes of the fold; the holder that a binding selector finds | "Read with revision 23" |
| 28 | Section 17.3, "One condition that the check puts on the destination" | Owed by the authority note | "Confirmed in revision 23" |
| 29 | Section 17.3, "One open thing, stated plainly" | It is a question for the planner | "Decided in revision 23" |
| 30 | Witness 18.53 | 17 cases, of which case 1 accepts a mark with no index and case 16 has a runtime that reads every job | "Changed in revision 23", with the cases that are stated again |

Four more places are dated and state no rule: the first paragraphs of
the note; the table "The standing in force, for revision 22", in the
opening; the opening of section 11.13; and the heading of section 18.
Two listings gain comment lines and lose none: the seven places of a
mark with the members of platform data, in section 6.1, and `Held`, in
section 17.2a. Section 6.1 gains one table of two members. The rows of
this file's section "Revision 22" that state the older rule are left as
written, as every earlier row is: row 1 of its table of what was asked,
the first of its seven attacks, the second of the six things that its
reading did not close, its question 3 and the fifth row of what it owed.
This section says what replaces each.

### The adversarial reading

**The sweep that the instruction asked for.** It is a table in the
opening of the note, with 11 rows.

| Sweep | How it was made | Found |
|---|---|---|
| Every place of revisions 20 to 22 where the text says that a validator checks none, that something is not required, that a rule may scan or search, or that leaves the way of an access to the runtime | A search of the whole note for eleven phrases, which the opening lists. Each hit was read against the planner's answer. | The six places of the finding, which are all of one statement. Three places leave an access to a rule that is given the folded state whole, and one lets a guard read every page: none is a binding selector, and none is changed. The index of operations by item and the highest head by subject are parts of the folded state and are read by their key. |
| Every answer of the planner's acts `1f8aba72`, `39749e26` and `2d3fa911`, against the rules and the witnesses | The place of each answer was read, and each witness that it names. | The 4 answers of the first act and the 5 of the second are in the rules, and no witness contradicts one. Of the third act, one answer was contradicted by the rules and by witness 18.53, which is the finding, and the other three were still written as questions in four places. All are written as decided now. |

**The sweeps of revision 20, made again on the added text.**

| Fault kind | What was swept, and how | Found |
|---|---|---|
| A stale standing of a sibling | The added text, for the phrases of revision 20's sweep. The standing of each sibling, against the table of revision 22. | No sibling's standing changed, as far as the instruction says. The table of revision 22 is dated. One paragraph of section 11.13 is dated. The planner's answers name a revision 27 of the authority note: it was not read, and the table says so. |
| A table of forms that disagrees with prose | A search of the whole note for "index", "selector", "every item", "of the type that the mark states", "the three jobs" and "no other member". Each hit was read against the new text. | The statements of the table above. The index on the slots of a `where`, the directory's index, the index of accepted keys and the `index` send are other things, and are left. |
| A refusal name in prose that no row states | Every word in code marks of the added text that is a reason, an answer or a result of a replay | No name is new. `bound-source` and `unsupported-definition` are used in more cases, and the table of names of section 17.2a has a row for each. `required-unset`, `final`, `mismatch` and `guard-incomplete` are named as earlier sections state them. `too-late` and `not-owner` are made-up reasons of guards in witness 18.53. |
| A count sentence that is off | Every number of the opening, of sections 11.13, 13, 14 and 15.8, of witness 18.53 and of this file, against the script of "Counts" | None after the last run. |
| A capability or a bound stated by a version's name | The added text, for "the destination", `withdraw`, `reserve`, `publication` and `publication-of` | The forms are stated by the members and by the place of a mark. A row of the authority note is named as the case that a form exists for, as what was read, or as what that note owes, and never as the rule. |
| A permission that is derived from a count or a state | The added text, for a rule that lets something happen because a number or a state is so | None is added. The number of items that an index returns decides whether a rule is run, and a fault writes nothing. It permits nothing. |
| An exemption by a flag, where a checked reservation is required | Each input that revision 23 makes settling, and each count that it lowers | None. No input is made settling, and no count of the budget changes. |

**Six attacks on what this revision decides.**

- *Can a binding selector still read every item of its type?* No. It is
  given the at most 8 items that one lookup returns, and a rule is a
  function of what it is given. A runtime that reads every item in place
  of the index does not follow the contract, although it would select
  the same item.
- *Can two runtimes give the rule different items, or another order?*
  No. The rows of one key are a function of the items of the folded
  state, in order of item ID. A runtime whose index does not hold every
  item of the type answers no lookup.
- *Can a part of a fact reference match?* No. A key is the whole
  reference: the scope, the incarnation, the kind, the position and the
  hash.
- *Can an item escape the index, or stay in it wrongly?* An indexed slot
  is fixed and required. So every item has its key from the entry that
  opens it, and the key never changes. A final item keeps its row.
- *Can a sender stop another sender's request by filling one key?* Only
  where the definition lets a sender open an item under a key that is
  not its own. In witness 18.53 a ticket is a fact of the sender's own
  lane, and in the adopted row a `reserve` is refused `not-owner` unless
  the operation's fact is in its sender. A definition that lets any
  sender open items under any key can be stopped at 9. That is the
  definition's guard to state, and the validator does not check it.
- *Does the index move an amount of the budget?* No. It is derived
  storage, in no dimension, with at most 4 rows for each item.

Five things that this reading did not close. The fault at more than 8
items of one key does not end by itself, and this note chose it over
giving the rule a part of the matches: the planner may prefer another
answer. The seven types of an indexed slot are a choice of this note,
and a `text` or an `int` could be asked for later. That the value which
a checkpoint digests holds final items with their slots is read from one
paragraph of section 9.2 with section 6.3. The type of the field
`operation` of the adopted `withdraw` was not found in the rows that
were read. And charged work stays R4's, as in revision 22.

### Where this text differs from the verdict, and from the planner's answer

- The planner's answer 3 says that a selector with no index is a scan of
  the scope's items "that no count bounds". This revision does not state
  that. As the verdict says, the scan of revision 22 was finite: the
  budget of items bounded it. The note states the requirement, and not
  that reason.
- The verdict asks for a policy for no match, a unique match and several
  matches. This revision adds a fourth case that neither text names:
  more than 8 items of one key, which is a fault. It is a new limit of
  liveness, and it is stated as one.
- The verdict asks that any narrower interface be explicit, with the
  owner's disposition, and with no silent reduction. The interface is
  narrower. The note says what a binding selector can no longer do, that
  the planner's answer 3 is the disposition, and that the one adopted
  row needs none of what is lost.
- The instruction for this revision says that the adopted case can have
  several publications for one operation over time. The adopted rows
  that were read say otherwise: `reserve` is refused while any
  publication for the operation exists, in any of its seven states, and
  `withdraw` opens one only when none exists. So the note states the
  rule for several matches as the contract's, and says that the adopted
  rows do not use it.
- Neither text asks what a mark at place 2 that is no binding selector
  does with `index` or `key`. This revision refuses them there, as
  `bound-source`, so that the two members have one meaning.
- The verdict asks that the accepted fault of a clause for a final
  holder stay visible as a limit of liveness. It is stated so in section
  17.3, with what the fault does not waive.

### The planner's answers

The planner answered the four questions of revision 22 by the act
`2d3fa911`. Each is written into the note as decided.

| # | The question of revision 22 | The planner's answer | Where it is written |
|---|---|---|---|
| 1 | A clause of a request that an entry with no account sent opens a held kind for a holder that became final | The fault stands. Nothing is written, the outcome stays offered, and the fault is shown as a state that a member can see. Neither a refusal of the edge nor a count kept alive on a final holder is wanted. | Section 17.3, "One open thing, stated plainly"; row D23-3 |
| 2 | A rule of a form that declares `settles` sets no state | It is the wanted rule. A mark that names the states is a later optimization. | Section 6.4, the point of that name; rows D22-3 and D23-3 |
| 3 | Should a binding selector be required to use an index | Yes, or the validator refuses it | Section 17.2a; rows D23-1 and D23-2; witness 18.53 |
| 4 | The owner of the rows of the branch and of `adopt-head` | The authority note's, to restate. The contract gives the forms. | Section 17.3, "One condition that the check puts on the destination"; row D23-3 |

This revision asks the planner nothing that blocks. One choice of it is
the planner's to change if it is not wanted: the fault at more than 8
items of one key.

### What remains owed, beside the lists of "Revision 22"

| Owed | To |
|---|---|
| Independent review of revision 23. Then the planner's adoption. | A reviewer who did not write it; then the planner |
| Row I3-61 of section 11.13, with rows I3-39 to I3-60 as revision 23 reads them | The I3 delivery, with the owners that the rows name |
| That `publication` declares the index on `operation`, and that `publication-of` states it with the field `operation` of `withdraw` as its key, of the slot's type. The read that shows the fault of a clause for a final holder. And everything that the list of "Revision 22" names for that note. | The authority note's next revision |
| What a member is shown for that fault | The lane forms' next revision, with the authority note |
| The numbers 4 and 8, whether a lookup is charged, and every count | R4, with the capacity follow-through `cc570904` |
| Points R1-38 and R1-66, and the part of R1-69 for an act and a clause | This note's next revision, with the owners that each names |

### Limits of revision 23

- Nothing was compiled, tested, installed, probed or deployed. No
  workroom command was run. Nothing was pushed.
- One delegated author wrote it, with no second reader.
- This note was read in the parts that its opening lists: the passages
  of sections 6.1, 6.2, 6.3, 6.5, 9.2, 17.1, 17.2a and 17.3 that bear on
  a mark, a slot, an index, a checkpoint and a binding, and witnesses
  18.52 to 18.54. Everything else was found by a search or was not read
  again.
- The authority note's revision 26 was read in 17 lines of its section
  12.1.5 and of its section 12.1.8, and by a search. Its revision 27 was
  not read.
- The I3 source was not read, apart from the two pinned lane
  definitions, by a script. The I3 deltas note was not read.
- No adoption act was read. The standing is as the instruction and the
  verdict give it.
- A script outside the repository applied the edits, counted rows,
  points, witnesses and cases, found three line numbers and computed two
  SHA-256 values. No number in this revision is measured.
