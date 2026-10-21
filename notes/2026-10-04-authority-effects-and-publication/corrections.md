# Corrections applied in revision 2

The planner read the first draft at `43b68f5a6d1f1a68bcb494062fa2db0e081f7ef9`
and its evidence file in full and asked for nine groups of corrections
in `f6c4d14bcfe0500cbad4c41764e866f92c0ec98d`. This table says where
each is applied in `notes/2026-10-04-authority-effects-and-publication.md`.
That reading was a planning correction. It is not an independent review.
Decisions that belong to R1, R2 and R4 are named and stay unadopted.

| # | Correction asked | Where applied | What changed |
|---|---|---|---|
| 1 | Complete and qualify the authority proof. | Sections 3.3, 3.4, 3.5; section 6.5; section 7; decisions D2-2, D2-3, D2-7 and D3-2. | An observation now binds the membership scope and incarnation, the head, the key and its state, the member, role, actions and where they apply, the controller relation, any end time and the definition version, and is a retained input. The grant guard checks an active member, the action, where it applies and the end time at commit, not only the key. Its time is when the read began, so a window is a true limit; a negative age proves nothing; a clock that went back needs a new observation. The windows are named grace windows, a product and protocol choice in which an act just after a revocation can be admitted. Delegation is given as a record with its grantor key and deferred from the first delivery, with an owner. A dispatch after reservation is authorized by the destination's own record and needs no member's authority, so a retired revocation after reservation does not stop it; only a compromised one starts an abort. Rules observations are retained the same way. Races add revocation after the observation began, and a delayed or lost compromise notice. |
| 2 | Finish browser, device and private-resource authority. | Sections 3.1, 3.6, 3.7, 3.9, 3.10, 4.1, 4.2; section 9. | A read token names the deployment, the membership scope and incarnation, the member, key, what may be read and an end time, and a scope of another repository refuses it. A revoked device's session is accepted until it ends, at most ten minutes; streams close then; displayed bytes cannot be recalled; the contradictory sentence in section 9 is corrected. Private reads, workspace tokens, export and task control need the controller's or an admin's own device key; each has a stated form and a stated recovery of a lost reply. Device keys are made on the device and not extractable; enrollment is by an admin's single-use invitation with its secret in the link; the last admin key is guarded; the recovery key is enrolled at founding and rotated; a removed member is refused. An owner's last key revoked stops new tools within sixty seconds and new lane acts within five minutes. An act that waited on one device is not applied by another. `ownerMayReview` exempts the controller relation only. |
| 3 | Reconcile task, hold and workspace identities with plural commitments and the checkpoint contract. | Sections 4.3, 5.1, 5.2, 5.6. | A table names what belongs to what and that nothing is reused. A fork for each hold, which is stronger than R2's request for one for each commitment, because a token or a later refusal is not a fence for a push already sent or a process still running. The fence has three parts: nothing reused, the runtime fencing itself before each dispatch and push, and a new instance for a new holder. A command not confirmed stopped is unknown. Retention lists what a checkpoint covers, the deadline's start and renewal, failed saves, reattachment, pins, expiry and deletion, and assigns the experiment to the staged recovery successor. A change requested after a commitment is fulfilled is new work, not a reopened item. |
| 4 | Correct the ledger's settlement rule. | Section 2; section 5.4 rules 2 to 5; section 8.1 and 8.2. | An inventory no longer settles an unknown create. An unknown outcome stays until that request's own authenticated answer or a completion fence. A known token's end time ends that token's cleanup only. The canonical ledger revokes only tokens it can attribute. Provenance is required before a fork or snapshot repository is touched. A deadline ends waiting for a job and proves nothing about the run. E1 lists every resource of the account and deployment, and a missing registry entry is not proof of absence. |
| 5 | Express publication as correlated messages under R1. | Sections 6.3, 6.4, 6.5, 6.7. | One `reserve` request with one result. Progress and the final state are relationship updates the destination owns, with its revisions, so a late update cannot replace a later one. `withdraw` is a request with its own result. Seven cases are given, including a cancel that arrives first, a lost result, a wrong-target update, and lost destination storage, which is unknown and releases nothing. The change lane's `merge` entry carries a complete eligibility statement derived by its fold: every live verdict and job. The destination counts from it and does not accept a chosen subset. Verdicts are counted by member. The freeze starts at `intended` and follows R2 revision 2. |
| 6 | Make dispatch and abort evidence cover every possible send. | Sections 6.1, 6.6, 6.8, 3.11. | The gateway holds one grant for each attempt, records that it is forwarding before it forwards, forwards once and closes. Three evidence classes, each with what it requires: not sent, refused, unknown. A timeout, a lost container, a revoked token or an error after sending is unknown. A mint with a lost answer can leave the push "not sent" while its token duty stays unknown. The upload-revocation behavior is described as an earlier measurement, not a guarantee. `published` settles the operation's effect and gives no answer to each unknown attempt; token duties stay. The read and its route are kept as evidence. Checks: what a job fixes, how its origin is verified, what a result names, sandbox output as data, a runner failure as an error and not a failed check, late results on their own job. |
| 7 | Complete the publication and fence assumptions. | Sections 6.1, 6.8, 6.9, 6.11; section 12 H1, H2, H4. | The compare-and-swap is named as the Git command's contract and not a guarantee by this host. Exclusive ownership of the branch is stated with what it rests on, and H4 says nothing at the host enforces it. A different ref after another writer is not treated as proof; adoption of a head needs every earlier operation final or fenced. A stale read of an integration or fence commit is covered. The fence is a full proposal for this review: the deterministic commit, its operation, its authority, the read outcomes, what others are told, both orders of the race, and that it needs the host to answer. Until adopted, the slot is held. |
| 8 | Finish object staging and receipt ownership. | Section 6.2; section 6.5; section 6.10; section 5.3. | Staging has an owner, a source, its two credentials, a ledger duty, a time, a cleanup and a keeping rule. Every selected commit must be an ancestor of the integration commit, checked at reservation; that is no longer an open choice. The receipt's name is the digest of the operation's fact, never reused; it holds the destination's final fact; it is a duty that outlives the publication and never holds the slot; it is an anchor a caller may trust and not a derivation. |
| 9 | Reconcile founding loss and retirements. | Section 3.8; section 8.2, 8.3; section 11; section 12 U4. | A founding register claims each founded seed. A second founding from the same intent after loss is refused. The ways forward are a restore or a new repository with a new nonce and a new repository at the host. Founding policy and the recovery key are pinned at genesis, and membership is active before any ordinary act. Retirement is resource by resource across the account and deployment. Earlier source is kept only after it is read against this model. Collections and firm authority stay an explicit alignment record. No rollout is designed. |

Reconciled with R1 revision 4 at `665e490b`: one result for a request;
the `delivery-unavailable` finding for lost destination storage; the
three kinds of seed cause. Reconciled with R2 revision 2 at `f146aa2e`:
the job and result items, verdicts by member, the freeze from
`intended`, and a comment that changes no verdict.

# Corrections applied in revision 3

The planner read revision 2 at `de9a1d64b1788cb61ef048e2f6b753a7c8649fd9`
in full and asked for seven groups of corrections in
`5fd1047414dd8915d73d6323815aa3addc7cd2de`. The revision 2 changes are
kept.

| # | Correction asked | Where applied | What changed |
|---|---|---|---|
| 1 | Separate a person's direct authority over private resources from the service's authority to keep an agent's hold supplied. | Section 4.2, rewritten. | Two authorities are named. Private reads and export authorization need the controller's or an admin's own device key. A hold's write token is provisioned for the agent, signed by the task scope's signer with the agent's key, checked against the hold, its end time, its instance and the agent's grant with its controller's standing; no person signs while laptops are closed. A table names signer, receiver, check and custody for each. A stream is checked again every sixty seconds; an export is checked again when the copy starts and before the receiver gets it. Each request is bound to the exact task or lane, its incarnation, the repository and the action. A repeated token request returns the known record or "unknown"; nothing is minted again for the same operation. |
| 2 | Make hold, report and runtime rules consistent. | Sections 4.3, 5.1, 5.2; section 7. | After a hold ends the performer may still report a commit already staged, and may stage nothing new; after a handover the former performer may not report. The race row says the same. Fork, checkpoint and snapshot identities include the lane's incarnation, the hold and the instance. The runtime checks the hold's own end time and instance from the lane before each dispatch; membership's window never extends a lease. A same-holder resume restores the whole checkpoint and Git closure into the new hold's fork; an old instance's callbacks and processes stay unknown. |
| 3 | State staging's admission and ownership. | Section 6.2, rewritten; section 13. | Staging is called a real write before admission. It runs only for an intent that passed signature, time, grant and party and hold guards, with a ledger record before any token; a refused, expired or revoked proposer causes none. R1's agreement is asked for, not assumed. The ref name includes the lane's incarnation. A second staging of the same commit finds the ref and is done. An owner set decides keeping and deletion: accepted reports, inputs and pending integrations pin a ref, and a refused operation never deletes a ref another owns. Fork read and canonical staging tokens are separate duties; provenance and the whole object closure are checked. |
| 4 | Define the founding register's owners and recoverable order. | Section 3.8, rewritten. | The register is a scope with its own history. Six ordered steps: a pending claim bound to the seed and to the exact repository the founding creates at the host; the repository's creation under a seed-derived name; the directory's genesis; the claim made active; the three platform scopes; ordinary acts only after the claim is active and the needed scopes are confirmed. Four failures are given, including loss of the register itself, whose absence proves nothing. A new founding always uses a new repository at the host. What a verifier sees and what it trusts are stated. |
| 5 | Give the publication messages and proof their exact detail. | Section 6.4; the fence table in section 6.8. | Every message is bound to the merge fact, both full scope references and the destination's publication item, with the destination's sealed position as revision. A lane cannot withdraw another lane's operation. A final merge item takes no later update. A table maps each state of the destination's publication to the update sent and to the lane's merge state, including not reserved and withdrawn before arrival. For the fence, both outcomes name what happens to the original operation and to the fence operation, and that unknown attempts and token duties stay recorded. Hold remains the rule. |
| 6 | Define check failure and qualify the host evidence. | Section 3.11; section 12. | A run that could not check anything is a signed `check-error` that sets the job `errored` and tells the author and integrator; a silent checker is a timed `timed-out`; a retry is a new job. The service runs only a `request-check` entry of an activated `change` definition, with configuration bytes that hash to the job's digest. It keeps an outcome until the lane admits it, without running again. H1, H2 and H4 are stated as operational assumptions at the chosen host; a finite witness shows its cases only; a wrong final result from a stale read is an incident that later detection does not repair. |
| 7 | Correct settlement and reset. | Sections 8.2 and 8.3. | New effects are stopped before anything is counted. In-flight dispatches, open routes, containers, outboxes and cleanup actors are counted; prepared work is cancelled by a recorded fence. Only resources that ledgers or provenance identify as Artroom's are inventoried and touched. What settles keeps running and keeps its storage. An unknown mint or create stays unknown even after its publication is final. Unsettled earlier resources do not block a separate new-model workspace. |

# Corrections applied in revision 4

The planner read revision 3 at `4572724895ed4d6159eee1bcdd68e758d6143815`
and asked for five bounded corrections in its reading `def9c326`. The
changes of revisions 2 and 3 are kept. That reading was a planning
correction. It is not an independent review. Every choice below is a
proposal until this note is reviewed and adopted.

| # | Correction asked | Where applied | What changed |
|---|---|---|---|
| 1 | Make staging's permitted path agree with R2 and with the hold's lifecycle. | Section 6.2, rewritten; sections 5.2, 5.3, 6.5, 7, 8.1; decision D3-8; section 12 U7 and U8; section 13. | The issue lane that owns the hold always stages; a change lane never does, and `change` keeps eleven item types with no hold. A report source and an integration source are stated separately, each with its owning lane, hold, instance, who made the commit, what each lane judges and what moves. A new staging needs a held hold; reuse of a live staged root needs none, mints nothing and copies nothing, and a former performer cannot reuse. Only a failure before dispatch leaves no effect; a check that passes before an act that is not admitted leaves real duties. |
| 2 | Give the staged-ref owner set a deletion fence. | Section 6.2: the root, pins, retiring, and the four-row order table; sections 7 and 8.1. | Each staged root has a number that is never reused and is part of the ref name. A root is `creating`, `live`, `retiring` or `retired`, and `retiring` never returns. Pins and retirement are entries of the staging lane, so one is first. A late delete can match only the old name; a new owner gets a new root. A manifest's pin is recorded in the staging lane before the manifest is usable and is released only by the change lane's `unpin` or a settlement answer. An input or a selected report rests on the accepted report's own pin. The lost-answer case is a row of the table. |
| 3 | Make founding's recovery implementable under the ledger rule. | Section 3.8, rewritten; sections 5.1, 7, 8.1; section 12 U9. | The register owns the creation of the repository as numbered attempts, each with its own name, recorded before it is sent. Only a request's own answer makes it `created`. A lost answer stays `unknown`; an existing name is not adopted. "Done once" is removed, and no idempotency contract is claimed. Why a founding may go on with an unknown attempt, and its bound of three, are stated. A result activates a claim only by the exact claim, request, genesis and repository; a later incarnation is a conflict. The directory is provisional until the register confirms it and holds its creations and import. A missing or replaced register refuses every founding at step 1. |
| 4 | Make the fence's results depend on the winner. | Section 6.8, the fence tables; sections 7 and 10. | One two-column table gives, for each winner: both operations' states, the commit the branch holds, the update to P, P's merge item and proposal, what people are told, the one receipt owed and by which operation, later sends, unknown attempts and token duties, and the slot. The losing fence owes no receipt. H1 and H4 stay operational assumptions. |
| 5 | State the private-access boundary. | Section 4.2: the table, the two new parts and the export's recovery; sections 3.6, 7, 8.1; section 12 U10. | A private stream holds a stored end time. Its bound is eighty seconds after membership records a revocation: ten for the observation's age, sixty for the interval and ten for the next check to pass. A check that cannot finish closes the stream at its end time. An export copies to a transfer stage the receiver cannot read, checks again, and then releases. The release is the stated irreversible boundary; nothing later recalls delivered bytes, and an unknown release is shown as possibly delivered. |

Also in revision 4:

- **R2's proposal R2-11: accepted**, in section 3.11. A late authentic
  answer decides a `timed-out` job that no retry has superseded, under
  the conditions of any answer. The reason is given there.
- **R1's rule for a provisional scope: agreed**, in section 3.8, for
  the directory, its three platform scopes, a lane and its forks, and
  the task scope. One conflict is listed and asked of R1: R1 section
  7.1 gives the directory no creator and sends its creations at once.
  A fork's name now includes its creation attempt, so a retry of a lost
  create has its own name (section 5.1).
- Read against R1 revision 5 at `1ebf4a76` and R2 revision 5 at
  `3b2a9cc9`. The names this note derives use scope IDs and
  incarnations, so R1's delivery-cause domain changes none of them.
  The destination sends each `publication` update from its own entry,
  so `duplicate-relation` does not arise. Hold ends and job deadlines
  are timed entries of R1's one drain.

What remains owed, and to whom:

| Owed | To |
|---|---|
| Whether an outside write and a pin in another lane may be made in preparation, before the act's entry; and the pin entry as a retained input. | R1 |
| The register as a scope kind and as the directory's confirmer. | R1 |
| A `source` field on the `propose-manifest` intent. | R2 |
| U7: a change by a member with no commitment in any issue lane. R2 revision 5 gives that member no workspace. | R2 |
| R2-12, the length of a job's deadline with the read token's lifetime below it. Not answered in this revision. | This note's next revision, with R2 |
| The retention for replay, the grace windows, the stream's three numbers and the witnesses for the new race rows. | R4 |
| How the configured register reference is set and kept. | N5 |
| Adoption of the fence, of staging in preparation and of the founding order. | This note's independent review |

# Corrections applied in revision 5

The planner read the changed bytes of revision 4 at
`273125f267a6ad2ba8a5cc646cb33de626c486d7` and asked for four groups of
corrections in its reading `2dc1769b`. The changes of revisions 2 to 4
are kept, except where a line below says a rule is withdrawn. That
reading was a planning correction. It is not an independent review.
Every choice below is a proposal until this note and R2 revision 7 are
reviewed and adopted. Nothing was run.

| # | Correction asked | Where applied | What changed |
|---|---|---|---|
| 1a | A direct one-person change without a mandatory extra issue. | Section 6.2: "A hold in a change lane", "Three sources", "The `source` field", "What a one-person change costs", "Authors"; sections 3.2, 3.10, 4.2, 4.3, 5.1, 5.2, 6.1, 7; decision D3-8; section 12 U7 and U8. | Proposed for reviewed adoption: `change` declares the hold capability that `issue` declares and holds its own commitments and holds. The staging lane is the lane that owns the hold: an issue lane, or the change lane for its own holds. Three sources are stated, each with what is judged, by whom and under which grant. `source` names lane, hold and instance, each authenticated by the staging lane's own state. Three `change` work actions mirror the `issue` ones. A manifest's authors take in the source commitment's attribution. U7's recommendation of revision 4 is withdrawn. Issue-lane sources, the split and assembly stay. |
| 1b | Reconcile the last no-hold "r+1" exception. | Section 6.2: the new staging and reuse table, the order table, "Root r+1 is a new staging, with no exception"; section 5.2; section 7; section 12 U13. | A new root is a new write. It needs the signer's held hold whose fork holds the commit, in every case. The exception for a closure already in the canonical repository is withdrawn. A root-retention operation is named as the other choice and not designed. |
| 2 | The manifest pin's message lifecycle in both orders. | Section 6.2: "Two protections", the pins table, "A manifest's pin in another lane: the messages, in both orders"; sections 7 and 8.1; section 12 U14. | A pin has the states `provisional`, `held` and `released`. Its key is the change lane's reference and the intent's digest. `pin-confirm` and `unpin` are stated with what each names and what the staging lane checks. One two-order table. An `unpin` on a provisional pin is applied, records that the manifest was admitted and is not a never-admitted release. A late confirmation restores nothing. A lost answer and lost storage conclude nothing. A creation duty protects a root being made; a pin is recorded only on a live root. |
| 3 | First repository and fork selection, and a late `created`. | Section 3.8: step 3, the attempt table, "First selection, and a late answer" and its witness table; section 5.1; sections 7 and 8.1; section 12 U9. | The claim's repository, and a hold's fork, are set by the first `created` outcome recorded while the slot is empty. A late `created` settles its own attempt, is recorded as not selected, replaces nothing, sends no `found` and changes no directory. Cleanup addresses only an ID from that attempt's own answer. Duplicate answers return the recorded outcome. No exactly-once claim is made. |
| 4a | Export release: intent, dispatch, confirmation, unknown. | Section 4.2: the table row, the recovery bullet, "When exported bytes become visible"; sections 7 and 8.1; section 12 U12. | The release has the states `intent`, `dispatched`, `confirmed`, `unknown` and `withheld`. The `dispatched` record is the proposed irreversible point. The ten seconds bound the authorizer's staleness at that record, not when bytes become readable. An unknown release keeps both pins, the staged copy and the named hold and instance, and is not dispatched again. The race rows are corrected. |
| 4b | The stream bound's clock and timer assumptions. | Section 4.2: "What the eighty seconds rest on"; sections 3.6 and 7; section 12 H5 and U10. | The sender checks its clock before each send. A reading earlier than the last passing check closes the stream at once. A restart closes it. A stalled or slow clock is not detected: H5 names that operational assumption. Passing checks and closes are retained evidence. |
| 5 | Answer R2-12. | Section 3.11; section 12 U11. | Accepted: one check duration for a definition, 30 minutes proposed, with the read token's lifetime below it. One duration for each check stays open with R1 and R2. |

Read against R1 revision 5 at `1ebf4a76`, which was not changed, and
written together with R2 revision 7.

What remains owed, and to whom:

| Owed | To |
|---|---|
| O1 and O2: staging and the pin entry in preparation, and the pin entry as a retained input. | R1 |
| O3: the two `tell` forms for the pin, and a capability effect for a pin in a handler. | R1 |
| O4: the pin's sends within the bound on sends from one entry (R2-13). | R1, R4 |
| O5: the register as a scope kind and as the directory's confirmer. | R1 |
| O6: a later outcome entry for an attempt first recorded `unknown`, with "not selected". | R1 |
| O7: `hold@1` declared by `change`, and the raised bounds on a definition. | R1 |
| Reviewed adoption of the hold in a change lane, with its forms. | This note's and R2's independent review |
| A duration for each check, read from the rules. | R1 and R2 |
| The stream's boundary under H5, the job duration, the retention for replay, the grace windows, and compact witnesses for the new race rows. | R4 |
| How the configured register reference is set and kept. | N5 |
| Adoption of the fence, of staging in preparation, of the founding order and of the `dispatched` record as the export's irreversible point. | This note's independent review |

# Corrections applied in revision 6

The checker made a full static assessment of revision 5 at
`5ec08fab40d5b7b83c878193f21cf829ec33476b` in its report `4b275a9e`
and found three P2 contract findings. The follow-up `30a4d16a` asks
for a disposition of each. The changes of revisions 2 to 5 are kept,
except where a line below says a rule is withdrawn. Every choice below
is a proposal until this note is reviewed and adopted. Nothing was
run. This revision is not reviewed.

| # | Finding | Where applied | What changed |
|---|---|---|---|
| 1 | Export dispatch rested on another scope's present state, with no retained proof and no order. | Section 4.2: "Who owns what", "The receiving hold: a license", the messages, the order of steps, the dispatch guard, the states, "The order before a dispatch", and the witness table; sections 5.1, 7, 8.1, 10; section 12 U15; section 13 O8. | The task scope no longer judges the receiving hold or a receiver pin. The lane that owns the receiving hold decides, in its own history, and records a license entry and a receiver pin. The task scope dispatches only on that entry, fetched and retained, inside a ten-second window on its own clock, and never after a restart. The receiver pin fixes the target and is released only on the task scope's final entry, so no release precedes a dispatch. The stale case that is accepted is stated: a hold that ends after its license. Dispatch and delivery stay distinct, and an unknown release keeps both pins, the staged copy and the target. |
| 2 | The fork seed used the lane where R2 uses the commitment. | Section 5.2: "The seed of a fork", with its record, rule and witness table; sections 5.1, 7, 10. | The seed is the latest report of the hold's own commitment with a live root, or the destination's head. It is fixed in the fork's creation record, with a guard that the report's or manifest's `under` equals the hold's. The lane-wide rule of revision 5 is withdrawn. No import by seeding is defined. The witness shows two commitments in one issue, and a handover in one commitment. |
| 3 | Only the private stream had a clock qualification. | New section 3.12: one table of every window, with a witness; sections 3.3, 3.5, 3.6, 3.7, 3.9, 3.11, 4.1, 4.2, 4.3, 5.2, 5.3, 5.4 rule 4, 5.6, 6.5, 7, 9, 10; decisions D2-3 and D2-4; section 12 H5, H6, U1, U16; section 13 O10. | Every bound is stated as a bound on a named clock, real only under H5 and H6. H5 now covers every scope and a restart. H6 names the rules that compare two clocks. Three rules are added: an observation is not kept across a restart; it is not reused by a commit whose reading is not later than its last use; a ten-second observation serves one commit. A stream is closed when its clock has not moved by the next check. A lane answers a fence check from its own clock, so a lost timer extends no lease. A host token's duty is settled only after a margin. A slow clock is still not detected, and that is said. |

Also in revision 6:

- **R2 revision 8, `cancel-merge`: agreed**, in section 6.4. The act is
  admitted only while the merge is `intended`. Its `withdrawal` slot
  is empty or `asked`: `asked` records that the request was sent, and
  the destination's answer is the recorded result entry (wording
  corrected in revision 7, to match R2 revision 9). The destination's
  rules do not change.
- **R2's point R2-18: accepted in part, as a proposal**, in section
  6.2. An ancestry check against staged refs refuses a commit of other
  work that no fact names. It does not see copied content, and that is
  stated (section 12, U17).
- **R2 revision 8, authors**: a manifest's authors take in the
  superseded version's authors and the inputs' authors. Sections 3.10
  and 6.2 now say so.
- Read against R2 revision 8 at `1ee107ee` and against sections 5.1,
  5.3, 6.7, 6.8, 6.9 and 13 of R1 revision 6 at `667c3318`. The rest
  of the note was not read again against R1 revision 6.

What remains owed, and to whom:

| Owed | To |
|---|---|
| O1 to O7, unchanged. | R1 |
| O8: the two export messages, their handlers in the hold capability, the license entry as a fetched fact of a task scope, and a lane's answer to a fence check from its own clock. | R1 |
| O9: the ancestry guard as a form of `git-read`. | R1 |
| O10: the three clock rules, read with R1 section 5.3. | R1 |
| The forms: the two export handlers in `issue` and `change`; the `export` item's `done` and `refused`; the task scope recorded on a hold; the seed record; the refusals `unnamed-work` and `ancestry-too-large`; the list F in the pin entry. | R2 |
| Costs and witnesses: reading again after a restart and on a clock that has not moved; the license window; the difference between clocks under H6; the token margin; the ancestry walk and its bounds; compact witnesses for the tables of sections 3.12, 4.2 and 5.2. Also everything owed to R4 in revision 5. | R4 |
| H5 and H6 as operational assumptions. No measurement establishes either. | The operator; N5 for how a deployment's clocks are kept |
| An export to a hold of another lane. Not designed. | A later request |
| Adoption of the export license, the seed rule, the clock rules and the ancestry check; and everything owed to this note's review in revision 5. | This note's independent review |
| Unchanged duties: unknown export, mint, create and push outcomes and credential cleanup, also after an owner ends, a reset and the retirement of old storage. | The owning scope's ledger; E1 for the earlier deployment |

**Alignment after revision 6 (same revision, second commit).** R2 revision 9 (`dc0fdd74`) narrowed the `withdrawal` slot to empty or `asked` and keeps the outcome as the lane's recorded result entry. Sections 6.1 and 6.4 of this note now say the same. No rule of the destination changed.

# Corrections applied in revision 7

The independent reviewer reassessed revision 6 at
`da20beebeccf7950a31e78f876c57de4ba912421`, with R2 revision 9 at
`dc0fdd74`, in its report `fb0d5867`. The follow-up `ebeaddf0` asks
for a disposition of each point. A supplemental assessment `245c4031`
of the same revision, with its follow-up `d31dfefa`, adds one finding
on the ancestry walk. All are static assessments of a design. None is
a verdict or an adoption. The reassessment finds that revision 6's
export license, fork seed and clock qualifications hold in the
proposed design. The changes of revisions 2 to 6 are kept, except
where a line below says a rule is withdrawn. Every choice below is a
proposal until this note is reviewed and adopted. Nothing was run.
This revision is not reviewed.

| # | Finding | Disposition | What changed | Where |
|---|---|---|---|---|
| 1 | P2. The ancestry check kept F and the head, and promised a walk "from the repository as read now". The staged refs are mutable, so a legitimate retirement or a later staging changes F. | Accepted. The historical inputs are kept. | The entry keeps a record: the head read, the digest and count of the snapshot of staged refs, the root's number and state, the recorded stops and F. The snapshot's bytes are a retained input by digest. One order of steps and the commit's guards are stated. A replay judges from the record and the snapshot and never reads the refs again. What it trusts is named: the host's read and the lane's record of it, vouched for by the staging lane's runtime, reported as `trusted: staged-ref-read`. A missing snapshot gives `incomplete`. "As read now" is withdrawn for this check. Witness: a retirement and a later staging. | Section 6.2: "What is read", "The record", "The order of steps", "Replay", the witness; sections 7, 10 and 14; section 12, U18; section 13, O2 and O9. |
| 1a | P2, supplemental `245c4031`. The walk ran after the candidate's root was `live`, started at that commit, and stopped at any own root under the source commitment. The candidate was such a root, so the walk could stop at its start with F empty, and a foreign staged parent was not seen. | Accepted. | The start is never a stop and never in F; every parent of it is visited. An own root is a stop only on a prior check: an earlier entry of the lane that admitted an act for that commit with its ancestry record, or a pin entry whose manifest was since confirmed admitted. A root that is only recorded, `creating`, `live`, refused or provisionally pinned is not a stop. The F of a prior check is carried into the new F, so a stop hides nothing. The stop record names its prior check, and a replay checks it. One order of steps covers a new staging and a reuse, and says that the ancestry check is not a condition of `live`. The rule "any own root under the source commitment" is withdrawn. Selection, authors and independent review are as before: the D, U and I case is now refused `unnamed-work`, and passes only with the selection that records U's authors. | Section 6.2: "When", "The walk", "What a checked own root carries", the judgment table, "The record", "The order of steps", the guards, "Replay", the table "The root", the table of new staging and reuse, and the D, U and I witness; sections 7 and 14; section 13, O9. |
| 2 | P2. An observation had no record of its read. Two fresh reads at one clock reading give equal bytes, so a replay could not tell them from a prohibited reuse. | Accepted, with a narrower claim. | The entry keeps the observation with its read (a run and a number) and its use, `fresh` or `reused`, with the prior entry. Guards in order. A replay checks that this record is consistent with the reuse rules. It does not prove that a read was performed: that is trusted, vouched for by the observing scope's runtime, and reported as `trusted: observation-read`. Section 10 no longer compares values. Witness: six cases. | Section 3.3; section 3.12, W3; section 10; section 12, U19; section 13, O10; section 14. |
| 3 | P2. "Every row then writes and sends nothing" when the clock is behind. R1 section 5.3 lets an input that judges no time be written clamped when no transition is due. | Accepted. The blanket rule is withdrawn. | The rule is R1's, in R1's order: nothing is written while a transition is due; otherwise an input that judges time is answered `clock-behind`, and one that judges none may be written clamped. A table says which of this note's inputs judge time. Three answers that are not entries stay closed, and that is said as this note's own rule. A clamped time opens and closes no window. Witness: seven cases against R1. | Section 3.12: the rules, "The backward clock", the witness, rows W1, W3 and W6; section 7; section 10; section 13, O10; section 14. |
| 4 | Reconciliation. Three rows said a pending or lost answer to a withdrawal freezes P. R2's row and this note's own table of updates free P once the merge item is final. | Accepted. | The freeze reads only the merge item's state. The table of P's records has a row for a final item with a pending answer, and the lost-storage row is split by whether the item is final. Witness: four cases. Residual wording "asked until the result" in section 13, section 14 and this file's revision 6 list is corrected: `asked` records the send, and the answer is the recorded result. | Section 6.4; sections 13 and 14; the revision 6 list above. |
| 5 | Clarification. A withdrawal can reach a publication that is already final and was never reserved. Section 6.4 did not classify it, and R2 showed every refusal as "already reserved". | Accepted. | "G's answer to `withdraw`" gives each state its result and reason: `reserved`; `ended` with the final state and its reason; `not-owner`; `malformed`. A final publication is not opened again and G changes nothing. Witness: the never-reserved case, step by step. R2 revision 10 at `e2b22c24` shows each reason in its own words. | Section 6.4; section 7; section 14. R2 revision 10, sections 4.2 and 7.4. |
| 6 | Minor. W6 and W7 named H6 alone. Two clocks that agree and have stalled satisfy H6. | Accepted. | Both rows name H5 as well. | Section 3.12. |

Trusted claims that revision 7 states, each with who vouches for it:

| Claim | Vouched for by | A replay reports |
|---|---|---|
| The host returned that head and that list of staged refs at the ancestry read, and the lane kept what was returned. | The staging lane's runtime, on the host's read (H2). | `trusted: staged-ref-read`. |
| Each recorded read of membership was performed, began when stated, and a `fresh` value was not a held one. No restart came inside one recorded run. | The observing scope's runtime. | `trusted: observation-read`. |

What remains owed, and to whom. Nothing owed after revision 6 is
dropped.

| Owed | To |
|---|---|
| O1 to O8, unchanged. | R1 |
| O9, wider: the ancestry record and its snapshot as retained inputs, the prior check behind an own-root stop, and a row for the check in R1 section 9.3. | R1 |
| O10, wider: the observation's read and use in `FreshnessProof`; confirmation that this note's backward-clock rule is R1 section 5.3 as written, and that the three answers which are not entries are outside it. | R1 |
| The forms asked in revision 6, unchanged. Added: the refusal `ancestry-stale`; the ancestry record in the pin entry; the reasons `reserved`, `ended`, `not-owner` and `malformed` on a refused `withdraw`. | R2 |
| Costs and witnesses: everything owed in revision 6. Added: the size of the snapshot of staged refs; compact witnesses for the six witness tables of revision 7. No gate and no quota is added. | R4 |
| H1, H2, H4, H5 and H6 as operational assumptions. No measurement establishes any of them. | The operator; N5 for how a deployment's clocks are kept |
| An export to a hold of another lane (U15). Not designed. | A later request |
| Adoption of the ancestry record and stop rule, the observation's read record, the reasons on a refused withdrawal, and everything owed to this note's review in revision 6. | This note's independent review |
| Unchanged duties: unknown export, mint, create, push and delete outcomes, the pins they keep, and credential cleanup, also after an owner ends, a reset and the retirement of old storage. An inventory settles none of them. | The owning scope's ledger; E1 for the earlier deployment |
| Evidence not yet produced: real-host, cold-start, manual and cost evidence. Nothing was run for this revision. | R4 and the owners named in section 12 |

# Corrections applied in revision 8

The independent reviewer reassessed revision 7 at
`524ba4539237b23ce6f85928510cc062ceadfefd`, with R2 revision 10 at
`e2b22c24`, in its report `da88fb08`. The follow-up `6a032249` asks
for a disposition of its one finding and two wording points. It is a
static assessment of a design. It is not a verdict or an adoption. It
confirms the repairs of revision 7: the retained ancestry record and
its replay, the own-root stop on a prior check, the observation's
read record, the backward-clock rule and the withdrawal reasons. All
of those are kept. Every choice below is a proposal until this note
is reviewed and adopted. Nothing was run. This revision is not
reviewed. R2 was not read again for it.

| # | Finding | Disposition | What changed | Where |
|---|---|---|---|---|
| 1 | P2. The start was never in F. A holder could fetch a commit U that another commitment had staged, stage that same commit as an own root, and propose it. U's parent was the branch head, so F was empty. The manifest needed no selection, its authors left out U's contributors, and they could give the counted review. | Accepted. The exclusion of the start is narrowed. No authorship test is added. | The start is still never a stop, and every parent is still visited. The staged refs of the snapshot that target the start are sorted, each by itself: own, when the ref is the staging lane's and its root is recorded under the source commitment; foreign otherwise. An own ref never hides a foreign one. With no foreign ref, nothing more is asked, so an ordinary new or reused commit is not refused. A foreign start needs one basis: an earlier admitted check of the same commit under the same commitment with no foreign start (`own-check`); a `selected` input that names its report (`input`); or the act's own row, with the start in F (`row`). A start that fails its row is refused `unnamed-work`. No new refusal is named. The record keeps `start`: the first foreign ref and the basis. A guard checks it, and a replay derives the sorting and the basis again from the retained snapshot and the lane's history. Git author text is not read. "Never in F" is withdrawn. | Section 6.2: "The walk", "What a checked own root carries", "The start", the judgment table, "The record", "The order of steps", guard 3, the replay row "The start", "What this does not close", and the table of new staging and reuse; sections 7, 10 and 14; section 13, the R2 row. |
| 2 | Wording. Section 3.3 called every entry that retains an observation an act. A reservation retains observations and is not an act. | Accepted. | An entry that retains an observation judges freshness, an act and a reservation alike, and is never written clamped. | Section 3.3. |
| 3 | Wording. "The first four" guards left the refusal of the fifth, the `selected-report` stop, unclassified. | Accepted. | The guards are numbered 1 to 7. Guards 1 to 6 refuse `ancestry-stale`, and the text names guard 6 and the `input` basis of guard 3. Guard 7 refuses `unnamed-work`. | Section 6.2, the guards. |

Witness tables added in section 6.2:

| Table | Cases |
|---|---|
| An exact commit of other work as the start | The reviewer's case, in nine steps: refused directly; admitted with a selection; as a `report`, refused, and admitted with `use-input`; and a replay after the other root is retired. |
| The start, case by case | An own new staging; an own reuse; an own second root; an own commit that another lane staged later; the exact commit of other work, direct, selected, and as an input; a commit attributed by an earlier manifest and reused under another commitment; another commitment's root in the same lane; the D, U and I parent case, still refused; and an own ref that sorts first. |

The D, U and I table of revision 7 is unchanged, and a note under it
says why.

Trusted claims: none is added. The sorting reads the retained
snapshot, which is already reported as `trusted: staged-ref-read`.

Limits that stay, and are stated in section 6.2: a foreign start is
seen only while a foreign ref on it is in the snapshot. A ref that the
host omits, that is created after the read, or whose root is retired
is not seen. Copied content is not seen.

What remains owed, and to whom. Nothing owed after revision 7 is
dropped.

| Owed | To |
|---|---|
| O1 to O10, with their text unchanged. The ancestry record that O9 and O2 name now has the `start` field. Asked with it: that the record's form, its retained snapshot and the replay row of R1 section 9.3 cover the sorting of the refs on the start. | R1 |
| The forms asked in revisions 6 and 7, unchanged. Added, as asked of the lane forms note: the ancestry record in the pin entry carries `start` and the start's mark in F; `unnamed-work` on `report` and `propose-manifest` is also the refusal for a foreign start; the pages that show that refusal name the commit and the two ways forward, a selection or `use-input`. This note did not edit R2. | R2 |
| Costs and witnesses: everything owed in revision 7. Added: compact witnesses for the two witness tables of revision 8. The proposed bounds are unchanged: 4,096 commits walked, 64 in F with carried commits and the start, 64 stops. The snapshot's size stays unbounded and owned (U18). | R4 |
| H1, H2, H4, H5 and H6 as operational assumptions, unchanged. | The operator; N5 |
| An export to a hold of another lane (U15). Not designed. | A later request |
| Adoption of the start rule, with everything owed to this note's review in revision 7. | This note's independent review |
| Unchanged duties: unknown export, mint, create, push and delete outcomes, the pins they keep, and credential cleanup, also after an owner ends, a reset and the retirement of old storage. | The owning scope's ledger; E1 for the earlier deployment |
| Evidence not yet produced: real-host, cold-start, manual and cost evidence. Nothing was run for this revision. | R4 and the owners named in section 12 |

# Corrections applied in revision 9

An independent reviewer made a static reassessment of revision 8 at
`c9153f00`, with R4 revision 6 at `5ad2e73c`, in its report
`999c5262`. The follow-up `86e44a0a` asks for a disposition of its one
finding on this note. It is a static assessment of a design. It is
not a verdict or an adoption. It confirms the repairs of revision 8:
each staged ref on the start is sorted by itself, an own ref does not
hide a foreign one, an unpublished commit of other work is refused
without a basis, and `own-check` needs an earlier admitted check. All
of those are kept. Every choice below is a proposal until this note
is reviewed and adopted. Nothing was run. This revision is not
reviewed. R2 was not read again for it.

| # | Finding | Disposition | What changed | Where |
|---|---|---|---|---|
| 1 | P2. The start rule of revision 8 had no test for the branch. A commit D that is the destination's head, and on which another commitment still keeps a staged root for the retention for replay, was a foreign start. A new commitment that staged D and reported it had no earlier check, no input and no selection, so the basis was `row`, F = [D], and the report was refused `unnamed-work`. The same section says that a commit reachable from the branch is published history and is never listed, and that a foreign start may proceed once its work is on the branch. | Accepted. The exemption for published history is applied to the start as it is to an ancestor. No basis is added: a published start needs none. | A foreign start is first tested against the head that the check read. If the start is reachable from it, the start is published: it is not in F, no basis is asked, and the record marks `start` as `published` with the first foreign ref. The refs are still sorted, each by itself. If it is not reachable, the three bases of revision 8 apply unchanged, so an unpublished commit of other work is still refused without one. Guard 3 and the replay derive `published` again from the recorded `head` and the commits. No branch is read again. | Section 6.2: "The start", with "A published start"; the record; step 5 of the order; guard 3; the replay row "The start"; the table of a new staging and a reuse; "What this does not close". Sections 7, 10, 13 (R2, R4, O9) and 14. |
| 2 | Found while applying 1. The same boundary was not stated for two other places. A commit that is both on the branch and a checked own root could be recorded as either stop, and as an own-root stop it carried its earlier F. A commit carried from a prior check could have been published since. | Corrected, by the same rule. | The branch is tried first: a commit reachable from the head is a stop at the branch, and nothing is carried through it. A commit of a prior check's F that is reachable from this check's head is not carried. Guards 4 and 5 and the replay row "The stops" say so. | Section 6.2: "The walk", "What a checked own root carries", guards 4 and 5, the replay row "The stops". |

Witness table added in section 6.2, "Published history, as the start
and as a parent":

| Case | Outcome |
|---|---|
| p. A report of published D while another commitment's root on D is still live | Admitted. `published` is recorded, and F is empty. Revision 8 refused it. |
| q. The same after that root is retired | Admitted, with no foreign ref. The same outcome as p. |
| r. A replay of case p after the retirement | Agrees, from the retained snapshot and the recorded head. |
| s. A clean commit I on a published parent U that another commitment staged | Admitted, with F empty. Unchanged. |
| t. Unpublished U as the start | Refused `unnamed-work`, with U. Unchanged from revision 8. |
| u. Unpublished U as a parent | Refused `unnamed-work`, with U. Unchanged from revision 7. |
| v. A commit published after the check read the head | Not published for this check. Refused, and prepared again. |
| w. A checked own root that has been published | A stop at the branch. Nothing is carried. |

No row of the three earlier ancestry witness tables changed. A note
above the new table says that their cases a to k are of unpublished
commits.

Trusted claims: none is added. The published test reads the recorded
head, which is already reported as `trusted: staged-ref-read`, on H2.

Limits that stay: every limit of revision 8. One is stated more
exactly: "published" means reachable from the head that the check
read, so a commit published after that read is treated as unpublished
until a later preparation.

What remains owed, and to whom. Nothing owed after revision 8 is
dropped.

| Owed | To |
|---|---|
| O1 to O10, with their text unchanged apart from O9, which now names the `published` mark and the rule for carried commits. Asked with it: that the record's form and the replay row of R1 section 9.3 cover the published test. | R1 |
| The forms asked in revisions 6, 7 and 8, unchanged. Added, as a proposal: the ancestry record's `start` carries `published` in place of a basis; a published start is not refused `unnamed-work`; no form and no refusal is added. This note did not edit R2. | R2 |
| Costs and witnesses: everything owed in revision 8. Added: compact witnesses for the table of revision 9, with at least cases p, s and t. The cost of the reachability test from the head is part of the ancestry check's cost, already asked. The proposed bounds are unchanged. The snapshot's size stays unbounded and owned (U18). | R4 |
| H1, H2, H4, H5 and H6 as operational assumptions, unchanged. | The operator; N5 |
| An export to a hold of another lane (U15). Not designed. | A later request |
| Adoption of the start rule and of the published test, with everything owed to this note's review in revisions 7 and 8. | This note's independent review |
| Unchanged duties: unknown export, mint, create, push and delete outcomes, the pins they keep, and credential cleanup, also after an owner ends, a reset and the retirement of old storage. | The owning scope's ledger; E1 for the earlier deployment |
| Evidence not yet produced: real-host, cold-start, manual and cost evidence. Nothing was run for this revision. | R4 and the owners named in section 12 |

# Revision 10

Revision 10 is a follow-through on the adopted base. It answers the
planner's request `1026ed6a`, with the requests it carries: `82edb034`
and its source `0d72ada6`, and `9d55ac57`. It also answers the rows
that the review dispositions, at `7aa072a7`, list as owed in this
revision.

The base is revision 9 at `8b8f946d2b7e2e060f7a34ce76960eeee709448d`.
It is adopted, and it is the text in force. Every rule and every
scope of it is kept. Everything that revision 10 adds or changes is a
proposal until this revision is independently reviewed and adopted.
This revision is not reviewed. Nothing was run, built, installed,
probed or deployed for it.

It reads the scope contract's candidate revision 9, at `ba556e96`,
which is filed for review and is not adopted. The contract in force
is revision 7 at `05244cfb`. Where a row below says "rests on the
candidate", the form is proposed in the scope contract's candidate
revision 9, pending its review and adoption, and no source may treat
it as adopted. The note's opening lists what was read of each input,
and what was not.

The three subjects are the files of the base. The main note and this
file are revised. `publication-and-authority-facts.md` is unchanged,
byte for byte: it is the dated reading of an earlier candidate's
source at `d691e6e9`, and its SHA-256 is
`12db56d1ba4a9681e47408ebfc7cbfa75495163592a3e54bed4b85f71e76f8e0`.

## One row for each item of the request

| # | Asked | Disposition | Where |
|---|---|---|---|
| 1 | A disposition for each of O1 to O10, shown in the contract's actual forms, with every use of the candidate labelled. | Done: one row for each point, with its types, validation, retained inputs, replay, and what is in force today. | Section 13.1; the table below |
| 2 | A disposition for each thing the candidate, the proof plan and the review ask of this note. | Done: 34 rows, each marked as decided here, as resting on the candidate, or as a gap. | Section 13.2 |
| 3 | The agreements between the notes, on eight subjects. | Done: one row for each, with what still differs and who owns it. | Section 13.3 |
| 4 | Capacity: the first essential result stays recordable, with finite reservations; later history and new jobs are bounded apart; numbers stay proposals. | Done for what has a stated number of attempts. Four chains of attempts have no number, and that is an owned gap. | Section 5.8; section 12, G3 |
| 5 | The exact authority for a required check's configuration, and the refusal that stops a requester weakening it. | Done: the rules scope fixes it, and five places guard it. The destination's check is the one that holds. | Section 3.11 |
| 6 | A judged pass and a judged fail kept apart from install, runner, listening and incomplete-report errors, a retry and a time-out, in the siblings' actual states. | Done: one table, with R2's states and no new one. An install failure and a missing lock file are a `check-error`. | Section 3.11 |
| 7 | The exact Node version, and the discovery and listening witness, assigned to the commissioning and evidence owner. | Assigned. No version is chosen and nothing is shown here. | Section 3.11 |
| 8 | `ObservationUse` with its read and run identity; `FreshnessProof` with authority, trust, clock, one commit and restart. | Done: one table that adds no rule. Revision 7 already leaves the type to this note. | Section 3.3 |
| 9 | The immutable ancestry fields: start, head, snapshot, stops, the carried set, published. | Done: one table, field by field. | Section 6.2 |
| 10 | R2's older summary of `start` uses the reviewed rule. | Stated. R2 is asked to restate its summary. No form changes. | Sections 6.2 and 13.4 |
| 11 | The control for an own ancestor that has no check, as a witness table. | Done: six steps, with the control and two ways forward. | Section 6.2 |
| 12 | Case w acknowledged, with no matrix of cases. | Done. No new row is asked of R4. | Section 6.2 |
| 13 | The work of reachability from the head, the snapshot's size, a whole replay, and the shared, hot-lane and destination workloads, with no invented bound or figure. | Done: named and placed. No bound and no figure is given. | Section 6.2; section 12, U17, U18 and U21 |
| 14 | Each of H1 to H6 as an operational obligation, with its contract, its owners and its source boundary. | Done. No assumption is established by being stated. | Section 12 |
| 15 | The source-impact map for I3, IA and later work. | Done: twelve rows, and what no source may take as settled. | Section 11.1 |
| 16 | U4, U6 and U15 owned; for U15 a disposition and an owner. | Done. U15 has a boundary table. It denies nothing in one lane and is no gate of the first Jam release. | Section 12 |
| 17 | Every live job collected with the result that decided it: this note's side. | Done: what the statement holds for each job, and eight checks that the destination makes of each required one. | Sections 6.3 and 6.5 |
| 18 | An offline device is not a revoked one; another authorized key; the last key; recovery. | Done, in the policy and in the map. | Sections 3.5, 3.6 and 11.1 |
| 19 | No unknown attempt, token or writer duty is settled by a restart, a listing, a replacement scope, the removal of a root or a new ref. | Stated for all source. It restates the base. | Sections 5.4 and 11.1 |
| 20 | The opening names revision 10 and where each sibling stands. | Done. | The opening |

## The points O1 to O13

| Point | Disposition | Rests on the candidate | Where |
|---|---|---|---|
| O1 Preparation | Accepted in the candidate's form: an operation that a sealed `preparation` entry opens. | Yes | Sections 6.2, 5.7 and 13.1 |
| O2 The pin entry | Accepted: it is the candidate's check entry, presented and retained. | Yes | Section 13.1 |
| O3 The pin's message forms | Accepted. Two incident answers are not written as forms yet. | Yes | Sections 13.1 and 13.4 |
| O4 Send limits | Accepted. Under revision 7 the entry that records `published` with 32 links does not fit. | Yes | Section 13.1 |
| O5 The directory's confirmer | Accepted: the register is the directory's creator. | Yes | Sections 3.8 and 13.1 |
| O6 A late answer to an attempt | Accepted, with a derived selection. | Yes | Sections 5.7 and 13.1 |
| O7 A second definition with holds | Accepted. Under revision 7 `change` is over the bounds on a definition. | Yes | Section 13.1 |
| O8 The export license | Accepted. R2's adopted definitions do not have the two handlers. | Yes | Sections 13.1 and 13.3 |
| O9 The ancestry guard | Accepted, with the record as this note has it. | Yes | Sections 6.2 and 13.1 |
| O10 The clock rules | Accepted. The type is this note's under revision 7 as well. | In part | Sections 3.3 and 13.1 |
| O11 An effect that a read decides. New. | Asked of the candidate's review. Until then an owned gap. | It is a difference from the candidate | Sections 5.7 and 13.1; G1 |
| O12 A token whose end time has passed. New. | Asked. An owned gap. | The same | Sections 5.7 and 13.1; G2 |
| O13 Attempts without a stated number. New. | Asked. An owned gap. | The same | Sections 5.8 and 13.1; G3 |

## The four security details of `82edb034`

| # | Detail | Disposition | Where | Source owners |
|---|---|---|---|---|
| 1 | An invitation's budget used before authentication; a shared table that locks a whole room out. | No counter and no limit is keyed by an invitation. The signature and the secret are checked before an invitation's state is read. Three limits, in memory, none of which can use an invitation up. A full table drops its oldest window and refuses nobody. The review's remedies were weighed and not copied. | Section 3.6 | I3; I1's review of the rate-limit module it keeps |
| 2 | Text that a member wrote, at the agent and tool boundary. | It is data. Authorship is kept, a summary holds none of it, and it grants nothing. No resistance to an injected instruction is claimed. | Section 4.4 | I5, IA |
| 3 | A person's revoked device or removal, for holds, fork credentials and duties in flight. | A policy for a person, apart from the agent-key rule: no revocation ends a hold; a hold is taken and renewed only on a standing read for that commit; the writer is fenced within sixty seconds; the token is revoked when the hold ends; nothing in flight is settled. | Sections 3.5 and 5.2 | I3, IA |
| 4 | The runner image that ran; credentials in transport; pinned tools that carry a credential. | The record of what ran, signed with the result, and an error when the image or the environment is not the one the rules name. No credential in an argument or a URL. An operator's tool at its pinned version. | Sections 3.11, 5.3 and 5.5 | I3, I5, IA; the operator, under N5 |

## The rows that the review dispositions list as owed

| Row | The rule | Guard or refusal | Witness | Where |
|---|---|---|---|---|
| M1 | A person's revocation ends no hold. `take-hold` and `renew-hold` are ten-second kinds. The runtime fences the writer. The token is revoked at the hold's end. | A renewal by a revoked key is refused on a read made for that commit. | Nine steps, with a control for a second key. | Sections 3.5 and 5.2 |
| M3 | Nothing is counted against an invitation. | Check 2, the signature, and check 6, the secret, come before the invitation's state is read. A failure is counted for the address only. | Cases a to d. | Section 3.6 |
| M4 | The table of address windows never refuses for lack of a window. Under load a join is answered `busy`, and no act of membership is behind that bound. | `rate-limited` for one address; `busy` for the scope. Neither changes an invitation. | Cases g to i. | Section 3.6 |
| Info 1 | Whether an invitation exists, is used or has ended is answered only to a caller with the secret. | One answer, `invitation-refused`, for an unknown ID and a wrong secret. | Cases c to e. | Section 3.6 |
| M6 | Tool results and summaries keep authorship, and text grants nothing. | No path takes text as a control or as a request for a credential. | Five cases. | Section 4.4 |
| M7 | Each deployment secret has a least strength and a stated reach. | `sessions-unavailable` for a session secret that is absent or shorter than 32 bytes. `key-in-use` for a key enrolled twice. | The table of four secrets. | Section 5.5 |
| L1 | The recovery key cannot join, and a member's key cannot become the recovery key. | `recovery-key`; `key-in-use`. | Four cases. | Section 3.1 |
| L4 | No credential in a process argument or in a URL. | The command-line client has no such parameter. `credential-in-url`. | The table of credentials; the boundary witness beside R4's key O3. | Section 5.3 |
| L6 | A renewal of a hold keeps the token. A second token is a separate request, and the first is revoked only after the gateway confirms the second. | `renew-hold` opens no token operation. | Five steps. | Section 5.3 |
| L11 | The resolved image is recorded and signed. | `check-error`, `image-mismatch` or `image-unresolved`. | Four cases. | Section 3.11 |
| Info 7 | The runner's environment is the configuration's own list. The gateway matches the path exactly. | `check-error` for a variable outside the list. | The fourth case. | Section 3.11 |

## Rules that this revision makes stricter, or states more exactly

Each is a change to the adopted text, and each needs this revision's
review.

| Rule | In the base | In revision 10 | Where |
|---|---|---|---|
| The window for `take-hold` and `renew-hold` | An ordinary act: 300 seconds. | A ten-second kind, read for that commit. | Sections 3.3, 3.5 and 3.12, W3 |
| What an agent's revoked key does to its holds | "Its holds end", with no entry named. | Its holds are not renewed. Each ends by its timed entry, or with its commitment. | Section 4.3 |
| The reason on a refused join | "Refused, with the reason." | The reason depends on the order: an invitation's state is told only after the secret matched. | Section 3.6 |
| A merge whose `reserve` was never received | Not stated. | `refused`, with the reason `undelivered`. | Section 6.4 |
| At most one run for a job | Not stated. | A second delivery starts no runner. A lost run is a `check-error`. | Section 3.11 |
| The cross-reference for "Retention ends" | Section 5.5. | Section 5.6, which is where retention is. R2 cites this note's section 5.5 for the retention deadline in its section 10.5; that reference also means section 5.6. | Section 4.3 |
| The row of section 8.1 for a check job | Settled by a `check` act. | By a `check` or a `check-error` act. | Section 8.1 |

Trusted claims: no new label is added. What ran in a check is the
checker member's signed statement. A replay checks its signature and
does not derive it, and section 3.11 says so.

Numbers: revision 10 proposes two, and neither is a measurement. An
invitation's secret and the session secret are each at least 32
bytes. Every count in section 5.8 is derived from bounds that the
base already proposed. The budget in its witness is made up, and is
labelled so.

## What remains owed, and to whom

Nothing owed after revision 9 is dropped.

| Owed | To |
|---|---|
| Independent review of revision 10: the main note and this file, with the facts file by its identity. Adoption before any source depends on what it adds. | A reviewer who did not write it; the planner |
| Review and adoption of the scope contract's candidate revision 9, on which sections 5.7, 5.8, 13.1 and parts of 3.3, 3.6, 3.11, 6.2, 6.3 and 6.4 rest. The points O11, O12 and O13. A byte domain for a check's configuration. A reason that carries more than one value. The two incident answers on a pin. | R1 |
| The two export handlers in each definition. The slot for a job's deciding entry. The `rules` item as records. `details` on `check-error`. The `undelivered` clause of `reserve`. The summary of `start` with `published`. | R2 |
| One witness row each for M1, for the limits of M3 and M4, and for L1. The boundary witnesses of sections 4.4 and 5.3. Its key O10 without a limit for each invitation. The measurements of section 6.2. Every number. No gate, no quota and no number of runs is added. | R4 |
| The owned gaps G1 to G14 of section 12, each to the owner that its row names. Among them: the number of attempts of four retried effects; the form of a job's dispatch; the entries that one reservation fetches, against R1's bound; the snapshot's bound; what a definition's name binds; the environment of a person's hold; the platform definitions in full; whether founding writes a first commit; whether an observation at its window is inside it. | The owners in section 12 |
| U20 and U21, with every choice of section 12 that the base left open. | This note's review; R4 for the numbers |
| The requests for U4, U6 and U15. The Node record, before the baseline's source request is commissioned. | The planner; R4 as the evidence owner; I3 and IA as the producers |
| The deployment's secrets, their replacement and the incident work; the record of who can write to the repository at the host; how a deployment's clocks are kept; pinned operator tools. | N5 and the operator |
| H1 to H6 as operational assumptions. No measurement establishes any of them. | The operator; R4 for what a run can show |
| Unchanged duties: unknown export, mint, create, push and delete outcomes, the pins they keep, and credential cleanup, also after an owner ends, a reset and the retirement of old storage. A revocation, a token's expiry and a hold's end settle none of them. | The owning scope's ledger; E1 for the earlier deployment |
| Evidence not yet produced: real-host, real-runner, cold-start, manual, device and cost evidence. Nothing was run for this revision. | R4 and the owners named in sections 11.1 and 12 |

## Limits of this revision

- The scope contract's candidate was read as the note's opening
  lists. Sections of it that were not read may hold a form that
  changes a row of section 13.1.
- The candidate was read at `ba556e96` only. If it is revised, every
  statement here that rests on it is read again against the new
  text: sections 5.7, 5.8 and 13.1 first.
- R0 revision 4 was not read. What section 13 asks of R0 is as
  revision 9 wrote it.
- R4's follow-through was not read. The witness rows that the review
  dispositions ask of it are described here by their content only.
- The mapping of this note's steps onto entries, in section 5.7, was
  made by reading. No validator and no source checked it.

# Revision 11

This section is history from revision 12 on. Revision 11 was reviewed
(`3e65c824`). Changes were requested, and it was not adopted. What
this section said of the scope contract's standing was wrong, and
revision 12 corrects it here, in the four places marked "Corrected in
revision 12". The rest is as revision 11 wrote it.

Revision 11 answers the independent review `74b21dc8` of revision 10
at `49e6321eaae56c3f23b884c9bd2a0cd5194bdbdc`. That review requested
changes: two findings of priority P2, and one capacity correction
that does not block. Its other paragraphs are on architecture,
security, simplification and coverage, and each has a row below.

The base is still revision 9 at
`8b8f946d2b7e2e060f7a34ce76960eeee709448d`. It is adopted, and it is
the text in force. Revision 10 was reviewed and was not adopted.
Everything that revisions 10 and 11 add or change is a proposal until
revision 11 is independently reviewed and adopted. This revision is
not reviewed. Nothing was run, built, installed, probed or deployed
for it.

It reads the scope contract's revision 10 at `f52573e7`. Corrected in
revision 12: revision 11 said here that this revision of the contract
was approved by review (`98b470c3`) and awaited adoption, and that
the contract in force was still revision 7 at `05244cfb`. The review
`3e65c824` found that the contract's revision 10 was already adopted
(`85c18b66`). So where a row below says "rests on the candidate",
"pending adoption" or "not adopted", it gives the label that revision
11 used. The form is the adopted contract's. Revision 10 of this note
was written against the contract's revision 9 at `ba556e96`. Every
statement that rested on it was read again.

It also reads the review dispositions as corrected at `bd24f413`. The
main note's opening lists what was read of each input, and what was
not.

The main note and this file are revised.
`publication-and-authority-facts.md` is unchanged, byte for byte, and
its SHA-256 is
`12db56d1ba4a9681e47408ebfc7cbfa75495163592a3e54bed4b85f71e76f8e0`.

Revision 10's section above is history. Its counts are those of
revision 10: 34 rows in section 13.2, 8 subjects in section 13.3, 12
rows in section 11.1 and 14 owned gaps. Revision 11 has 43, 10, 14
and 18. A script counted the table rows.

## One row for each point of the review `74b21dc8`

| # | Point | What was wrong, or asked | What changed | Where |
|---|---|---|---|---|
| 1 | First P2: a refused license cannot settle its reserved entry | A standing receiver pin reserves one entry for each numbered license request that may still come. The contract's revision 10 makes a written refusal new work, unless the duty's owner declares that the refusal uses the reservation, and it leaves that declaration to this note. Revision 10 of this note did not make it. So a refusal of request 2, at a lane with no free room, was not written, the task scope got no decision, and the pin stayed. | The declaration. A request is bound to a standing pin by four things: the task scope with its incarnation, the export, a number higher than every number decided and at most 3, and the first delivery of its envelope. The first decision of a bound request, applied or refused, uses that request's own reserved entry. The pin holds the highest number decided, so a duplicate uses nothing more. A request that is not bound, and request 1, are new work. A witness table of five rows, with its control. | Section 4.2, "A reserved license decision"; section 5.8, the export row, the two classes and "A refusal that is written"; section 5.7; section 13.1, O8; section 12, G15 |
| 2 | Second P2: the deciding-fact prose contradicts a legal late answer | Section 6.3 said that a later answer on a job that is already decided is history and never becomes the deciding entry. Read with its table, a job that timed out kept its deadline's entry for good, and check 4 of section 6.5 then refused a legal late pass. | The states are named. A `timed-out` job that no retry superseded is decided once more by its first authentic answer, and that entry replaces the deadline's entry as the deciding entry. An answer on a job that is `passed`, `failed`, `errored` or `superseded` is history only. A witness of six steps: deadline, late pass, a second answer, a statement that names the late check, and the destination's checks; with a control and the retry case. The companion file's rows are right and are not to change; the prose of its note N21 is asked of R1. | Section 6.3, "Which entry decides" and the witness; section 3.11; section 6.5; section 5.8, the two classes; sections 13.3 and 13.4 |
| 3 | The capacity witness, which does not block | The fourteen entries of publication 7 were right. The table of Used, Reserved and Free left out the closing checkpoint that the contract reserves for each scope. | The destination reserves 1 more entry. Reserved is 15, 12, 10 and 9, where revision 10 had 14, 11, 9 and 8. Free is 0, 2, 3 and 3, where it had 1, 3, 4 and 4. Used does not change, and no outcome changes: the request that needs 25 entries does not fit. The table of duties has a row for the closing checkpoint, for every scope. | Section 5.8: the row "Every scope", "The closing checkpoint" and the witness |
| 4 | Architecture | The candidate was written against the contract's revision 9. Reconcile it with revision 10 at `f52573e7`, and with all 139 current I1 choices, before claiming a completed dependent delivery. O1 to O10 and G1 to G14 are named work and not guards. H1 to H6 stay obligations. | Reconciled with the contract's revision 10: the table below. The I1 choices after entry 114 were not read, by the contract's revision 10 or by this note. That is the owned gap G18, and no completed dependent delivery is claimed. O1 to O10, the gaps and H1 to H6 are kept as they were. | The opening; section 12, G18; the next table |
| 5 | Security | One revoked device does not cancel a hold that another device of the member keeps. A revocation does not end a hold at once. Renewal windows and the writer's fence keep what is unknown about pushes and tokens. The form G9 for a person's runtime is owed. An invitation's secret check must not let another caller block a valid invitation. Prose that a member wrote is not evidence under R4's key O4. The five fixes that landed certify nothing of the whole. U4, U6 and U15 stay later, owned work. | No rule changes. The witness for text that members wrote is now stated as owed and not shown, and key O4 is no longer called its neighbour. The rest is as revision 10 had it, and the rows for M1, M3 and M4 below say what was made explicit. | Sections 3.5, 3.6 and 4.4; section 12 |
| 6 | Simplification | Repair inside the existing bounded lane of requests and the existing rule for a job's deciding fact. No new gate and no second mechanism. The existing owners keep their gaps. | Both repairs use the contract's own kinds: a settling entry that a pending capability record reserved, and the entry whose own effects set the job's state. No refusal name, state, message or timer is added. One value is added to the receiver pin, and its form is asked of R1. G1 to G14 keep their owners. | Sections 4.2 and 6.3; section 12 |
| 7 | Coverage | A static review of the design. It certifies no source, no execution and no cost. | Nothing here claims otherwise. Nothing was run for this revision. | "Limits", below |

## One row for each reliance on the scope contract, read against its revision 10

| Reliance | As revision 10 of this note had it, from the contract's revision 9 | In the contract's revision 10 | What changed here | Where |
|---|---|---|---|---|
| The label, and what "the candidate" means | "Proposed in the scope contract's candidate revision 9, pending its review and adoption." | Revision 10 at `f52573e7`. Corrected in revision 12: revision 11 wrote here "approved by review `98b470c3`, not adopted". It was adopted (`85c18b66`). | In revision 11, the label reads "proposed in the scope contract's revision 10, approved by review `98b470c3`, pending adoption" in all thirteen places where the note uses it. "The candidate" is defined once, as revision 10. The table of where each note stands, and the table of what was read, say so. Revision 12 removes the label and the name. | The opening; sections 3.3, 3.6, 3.11, 4.2, 5.7, 5.8, 6.2, 6.3, 6.4, 13.1 and 13.2 |
| Section and row numbers | Cited from revision 9. | Sections 15.6e, 15.6f, 18.18 and 18.19 are new. No section or row that this note cites was renumbered. | None of the cited numbers changed. Witness 18.18 is cited where a written refusal is used. | Sections 5.8, 11.1 and 13.1 |
| What a reservation covers | The settling entry, the inputs that it newly retains, and the duties that it starts. | The duty's whole closure, with two cases written out: a chain of timed rules, and what a request's clauses can start. A closure that is not finite is refused `reserve-unbounded`. | Stated for this note's duties. Every chain of timed rules that this note names is 1. No clause of a request in the table starts a duty beyond its row. Both are conditions on platform definitions that are not written. | Section 5.8, "The closure of each duty"; section 12, G12 |
| An entry that records a refusal | Not used: this note reserved entries for requests and did not say whether a refusal uses them. | It keeps what it read, is charged for it, and is new work. It draws on a reservation only where the duty's owner declares that. | Two declarations, and no more: a bound license request, and a publication's one `withdraw`. Every other written refusal is new work, and with no free room it is not written and the request is retried. A refused act and a refused step write no entry. | Sections 4.2 and 5.8, "A refusal that is written" and "A request to a full scope"; section 6.4; section 5.7 |
| The closing checkpoint | "One closing checkpoint", with no exact rule. This note's table and witness left it out. | 1 entry and the bytes of one checkpoint entry, once for the scope; used only by a checkpoint that is written when no other duty is pending; armed again by the next entry that is not a checkpoint. | A row for every scope, a paragraph, and the corrected witness. | Section 5.8 |
| A temporary static rule | Not used. | Its reserve follows the chains of timed rules. Its domain excludes a capability that opens an operation. What `hold@1` does to records at a hold's end is left to this note. | Answered: a hold's end creates no record, changes `instance` and `token`, and opens a revocation. A hold with a fork or a token is outside the static rule's domain. | Section 5.8 |
| The receiver pin's values | The checkpoint's digest, the hold and instance, the holder, the task scope, and the latest number applied. | The same. A refused deciding entry has no effect. | One value more is needed, `decided`. Its form is asked of R1. | Section 4.2; section 12, G15; section 13.4 |
| The job's `decidedBy`, and note N21 | The slot, set by `check`, `check-error` and the timed rule. | The same rows: they set the slot when the job is `requested` or `timed-out`. Witness 18.16 has the late answer. The prose of N21 says "a decided job". | This note's prose now agrees with those rows. R1 is asked to make N21's prose exact. | Section 6.3; section 13.4 |
| The order of an act's checks | The signature first, and the index of accepted keys before `notAfter`. | The same, and an accepted key is answered before anything is fetched. | Stated beside the join's check 4. No rule changes. | Section 3.6 |
| A timed entry always fits | Not used. | The validator bounds each timed entry's bytes, which needs a bound on one member's handle. The bound is left to this note. | Proposed: 256 bytes, the value that I1 holds as temporary. | Section 3.1 |
| Where a child's definition comes from | Not stated. | From its creator, by digest. Where a creator reads a definition that is not its own is point R1-35, left to this note. | Not decided. A new owned gap. | Section 12, G16 |
| After `delivery-unavailable` | Retransmission stops and nothing is released. | The same. Nothing starts it again by itself. What does is an operator's recorded act, point R1-36, left to this note. | Stated in the publication's case. The act is not designed. A new owned gap. | Section 6.4; section 12, G17 |
| The `undelivered` finding | Only when every attempt was answered by a routing refusal. | The same. A sender gives up on the number of routing refusals of section 7.5, consecutive or not. A message to a scope whose genesis was refused is answered `not-found`. | Read again. No change here. | Section 6.4 |
| Transport's answers, the envelope's address, the resolver, and what a clause reads | Not cited. | Stated in sections 4.1, 6.6 and 7.4. A clause fetches nothing, so the entry that records a result retains only its source entry. | Read again. This note's "transport answers retry" agrees. A license decision retains one foreign entry, its source entry. | Sections 4.2 and 5.8 |
| What authenticates a reader | Not asked. | Left to this note (entry 111 of section 15.6e). | Answered from the base: a read session, or a signed request for a private read. | Section 13.2 |
| The points O11, O12 and O13, and the gaps G1 to G14 | Addressed to R1's review. | Not read: the contract's revision 10 read no sibling again. | They stand, addressed to R1's next revision. | Sections 12, 13.1 and 13.4 |

## The review dispositions, as corrected at `bd24f413`

| Row | In revision 10 of this note | In the corrected dispositions | What changed here | Where |
|---|---|---|---|---|
| M1 | A person's revocation ends no hold; one revoked device takes nothing from the member. | The same, with the qualification written in: one revoked device, with another active, does not end the member's hosted work. | The row of section 13.2 says so. No rule changes. | Sections 3.5 and 13.2 |
| M3 and M4 | Nothing is counted against an invitation; a full table drops its oldest window. | The same, with: a valid invitation stays redeemable under hostile load, and a limiter record that was evicted decides nothing. | One sentence states that a dropped window decides nothing. | Sections 3.6 and 13.2 |
| M6 | R4's keys O4 and O13 were "the neighbours of the witness". | The witness is owed. Key O4 is device safety. It does not show who wrote a text, or that prose grants nothing. One compact boundary row is owed in the proof plan's follow-through, with I5 and IA. The instruction sentence mitigates by being present. | The witness is stated as owed and not shown. The five cases are called a design and no evidence. The ask of R4 is exact. | Sections 4.4, 11.1, 13.2, 13.4 and 14 |
| Info 6 | Not mentioned. The dispositions at `7aa072a7` routed it to this note's section 3.9. | The cleanup of an abandoned reader is routed to R4's adopted key O12. A session's end is a separate bound, with its clock qualifications. Owners: I5 and I3. | A bullet in section 3.9, a row in the map and a row in section 13.2. R4's key O12 is told apart from this note's point O12. | Sections 3.9, 11.1 and 13.2 |
| L13 | Not mentioned. | Four parts with four routes. Parts 2 and 3, the object and parent checks and the Git argument check, are I3's under R4's key O15, and I1's step S5 only if the replay command uses the Git reader. | A row in the map and a row in section 13.2. This note adds no rule. | Sections 11.1 and 13.2 |
| L4, and the fix F3 | No credential in an argument or a URL. | The row tells a Git push from a tool client's header. | Read again. Section 5.3 covers both: no text that the service shows holds a command with a credential in its arguments. No change. | Section 5.3 |
| "Owed in design this sprint" | Seven rows for this note. | The same seven, with the qualifications of M1, M3 and M4. The proof plan's row gains M6. A new row for L13. | As the rows above. | Section 13.2 |

## Rules that this revision makes stricter, or states more exactly

Each is a change to revision 10, which was not adopted, and each
needs this revision's review.

| Rule | In revision 10 | In revision 11 | Where |
|---|---|---|---|
| A refusal of a license request that a standing pin reserved | Not stated. Under the contract's revision 10 it was new work. | Its first decision uses that request's reserved entry. | Section 4.2 |
| What a refusal of `export-license` changes | "A refusal records no pin and changes none." | It changes no pin's state, target or k. A bound refusal sets `decided`. | Section 4.2 |
| A lane's one `withdraw`, refused | Not stated. | Its first decision uses the entry that the publication reserved, while the publication holds it. | Sections 5.8 and 6.4 |
| The deciding entry of a job that an answer decided after its deadline | The deadline's entry, by the wording of section 6.3. | That answer's entry. | Section 6.3 |
| What each scope reserves | No closing checkpoint. | 1 entry, once. | Section 5.8 |
| The length of a handle | Not stated. | At most 256 bytes, proposed. | Section 3.1 |

Numbers: revision 11 proposes one, the length of a handle. It is the
value that I1 holds as temporary, and it is not a measurement. The
budgets of 100 and 500 entries in the two capacity witnesses are made
up, and are labelled so. A few lines of script outside the repository
added up their rows.

Trusted claims: no new label is added. Operational assumptions: none
is added, and H1 to H6 are unchanged.

## What remains owed, and to whom

Nothing owed after revision 10 is dropped.

| Owed | To |
|---|---|
| Independent review of revision 11: the main note and this file, with the facts file by its identity. Adoption before any source depends on what revisions 10 and 11 add. | A reviewer who did not write it; the planner |
| Corrected in revision 12: nothing is owed in this row. Revision 11 listed here the adoption of the scope contract's revision 10, on which sections 5.7, 5.8, 13.1 and parts of 3.1, 3.3, 3.6, 3.11, 4.2, 6.2, 6.3 and 6.4 rest. It was already adopted (`85c18b66`). | Nobody |
| The form that carries a receiver pin's highest decided license number (G15). The prose of the companion file's note N21. Dispositions for the I1 choices after entry 114 (G18). The points O11, O12 and O13, a byte domain for a check's configuration, a reason that carries more than one value, and the two incident answers on a pin, as revision 10 asked. | R1, in its next revision |
| Where a platform creator reads a declared definition that is not its own (G16). An operator's recorded act that starts retransmission again, and who notices an acknowledged request with no result (G17). The platform definitions in full, with the mark that a publication's `withdraw` was decided, the characters of a handle, and each definition's timed rules and clauses against the rows of section 5.8 (G12). | This note's next revision, with the owners in section 12 |
| Every other owned gap of section 12, G1 to G14, each to the owner that its row names. U20 and U21, with every choice of section 12 that the base left open. | The owners in section 12; this note's review; R4 for the numbers |
| What a full scope does next. Until that is decided, a first license request, and every other new work, waits at a scope with no free room. | R4, as the contract's section 17.5 says |
| One compact boundary row for section 4.4, with I5 and IA, which is owed and not shown. One witness row each for M1, for the limits of M3 and M4, and for L1. The two compact witnesses of revision 11, folded into existing rows. The number for a handle's length. Every other number. No gate, no quota and no number of runs is added. | R4 |
| The checks of the retained Git reader under R4's key O15. The cleanup of an abandoned reader under R4's key O12, in the service. | I3 |
| The same cleanup in the client. The fields of a tool's result and its summary line. | I5 |
| The two export handlers in each definition, the slot for a job's deciding entry, and the rest that revision 10 asked. | R2 |
| The requests for U4, U6 and U15. The Node record. | The planner; R4 as the evidence owner; I3 and IA as the producers |
| H1 to H6 as operational assumptions. The deployment's secrets, clocks and access. | The operator and N5; R4 for what a run can show |
| Unchanged duties: unknown export, mint, create, push and delete outcomes, the pins they keep, and credential cleanup. A revocation, a token's expiry, a hold's end and a later attempt settle none of them. | The owning scope's ledger; E1 for the earlier deployment |
| Evidence not yet produced: real-host, real-runner, cold-start, manual, device and cost evidence. | R4 and the owners named in sections 11.1 and 12 |

## Limits of this revision

- The scope contract's revision 10 was read as the main note's
  opening lists: its sections 5.2, 6.11, 7, 15.8 and 17 and most of
  18 in full, and every other line only where it differs from
  revision 9. A line that did not change was not read again.
- Corrected in revision 12: revision 11 said here that the
  contract's revision 10 was not yet adopted, and gave that as the
  planner's report. It was adopted (`85c18b66`). Revision 11 checked
  neither the approval `98b470c3` nor any adoption act.
- The I1 deltas note was not read. The count of 139 choices is the
  review's.
- R0, R2 and R4 were not read again. R4's keys O4, O12 and O15 are
  cited as the corrected review dispositions give them.
- The two declarations on refusals, and the conditions on chains and
  clauses in section 5.8, were made by reading. No validator and no
  source checked them. The platform definitions that they are about
  are not written.
- The value `decided` is a form that the contract's revision 10 does
  not have. Until R1 answers, the rule is this note's, and its form
  is an owned gap.

# Revision 12

Revision 12 answers the independent review `3e65c824` of revision 11
at `332dd485059cddb4c946f9c53c054ddbe91a7dcc`. That review requested
changes: one finding of priority P2, on the standing of the scope
contract, and one correction that does not block, on the unit of a
handle's length. It found the two P2 findings of `74b21dc8` repaired.
Its other paragraphs are on architecture, security, simplification
and coverage, and each has a row below.

The base is still revision 9 at
`8b8f946d2b7e2e060f7a34ce76960eeee709448d`. It is adopted, and it is
the text in force. Revisions 10 and 11 were reviewed and were not
adopted. Everything that revisions 10, 11 and 12 add or change is a
proposal until revision 12 is independently reviewed and adopted.
This revision is not reviewed. Nothing was run, built, installed,
probed or deployed for it.

The scope contract's revision 10 at `f52573e7` is adopted. The
adoption is the planner's act `85c18b66`. It followed the approval
`98b470c3` and the delivery `1a2b9102`, which `c24fdfa0` ratifies.
These are as the review `3e65c824` and the planner give them. This
revision checked none of those acts itself. The contract's adoption
adopts nothing of this note.

The main note and this file are revised.
`publication-and-authority-facts.md` is unchanged, byte for byte, and
its SHA-256 is
`12db56d1ba4a9681e47408ebfc7cbfa75495163592a3e54bed4b85f71e76f8e0`.

The sections "Revision 10" and "Revision 11" above are history.
"Revision 10" is not changed. "Revision 11" is changed in four
places, each marked, where it said in the present tense that the
contract's revision 10 was not adopted. The counts of revision 11
stand: 43 rows in section 13.2, 10 subjects in section 13.3, 14 rows
in section 11.1 and 18 owned gaps. Section 14 has 46 rows, where
revision 11 had 45. A script counted the table rows.

## One row for each point of the review `3e65c824`

| # | Point | What was wrong, or asked | What changed | Where |
|---|---|---|---|---|
| 1 | P2: the standing of the scope contract | Revision 11 said that the contract's revision 7 was in force, that its revision 10 was not adopted, and that an unqualified "R1 section" meant revision 7. It held its own license declaration, its capacity accounting and a source condition "pending adoption". The contract's revision 10 was already adopted (`85c18b66`). An implementer who followed the prose would have gone to the replaced contract, and would have held back adopted forms: preparation, retained inputs and settlement accounting. | Every statement of the contract's standing now says revision 10, adopted, with its adoption act. An unqualified "R1 section" means revision 10. The label "pending adoption" is removed, and "the candidate" is "the contract". What an earlier revision of the contract read is kept as history, in the past tense. A new paragraph says what the adoption does not adopt: this note's own declarations stay proposals, G1 to G18 stay open, the form of G15 is not supplied, and the reconciliation of G18 is not complete. No gate is added. The next table lists each place. | The opening; sections 3.3, 3.6, 3.8, 4.2, 5.7, 5.8, 6.2, 6.3, 6.4, 6.5, 11.1, 12, 13.1, 13.2, 13.3 and 14; the section "Revision 11" of this file |
| 2 | The two P2 findings of `74b21dc8` | Found repaired: the first decision of a bound license request uses that request's own reservation, and the first authentic answer on a `timed-out` job that no retry superseded becomes its deciding entry. Request 1 stays new work. The form of G15 stays owed. | No rule changes. Both rules stay this note's proposals. | Sections 4.2, 5.8, 6.3 and 6.5; section 12, G15 |
| 3 | The declaration on a publication's one `withdraw` | Revision 11 added it beyond the verdict that it answered. The review read it as limited to one reserved decision, for the right operation and the right sender, with every other written refusal as new work. It did not object. Revision 11 showed no case of it. | The declaration is kept, unchanged. A witness of four steps is added, with its control: the covered refusal at a destination with none free; a repeat; another sender; a second envelope. Used, reserved and free add up to 500 at every step. | Section 5.8, the witness "a refused withdrawal at a destination with no free room"; sections 6.4, 11.1, 13.4 and 14 |
| 4 | The unit of a handle's length, which does not block | Revision 11 proposed "256 bytes in its canonical form" and called that I1's temporary value. At `97518f68`, I1 counts the bytes of the handle's UTF-8 form. Apart from that bound, it allows up to six canonical bytes for each byte of a handle. A handle of 256 unescaped ASCII bytes takes 258 bytes as a quoted canonical string. So the attribution was wrong, and the canonical unit was another, stricter proposal. | The unit is the bytes of the handle's UTF-8 form, which is I1's. The attribution is corrected, with the three places of I1's source that were read. The canonical form is said to be longer and counted apart. No bound of I1 changes, and no migration is asked. R1 is asked to state the unit in its section 6.4. R4 still owns the number, and G12 the characters. | Section 3.1; section 13.2, the row on a handle; section 13.4, the rows R1 and I1 |
| 5 | Architecture | The whole scope remains. Both repairs reuse existing deciding entries and reservations. G15 to G18 keep their owned work. The count of 139 I1 choices is history, and the present count of 152 stands under the contract's successor work `108ea663` and the existing owners. No reading and no declaration of this note closes an implementation. | No scope is removed and no rule changes. G18 gives both counts as the reviews' and names `108ea663`. It says that the contract's adoption does not complete that reconciliation. That successor work was not read. | The opening; section 12, G18 |
| 6 | Security | A new credential, a session's end, a revocation and a final publication settle no unknown writer and no cleanup. Text that a member wrote grants nothing, and its boundary witness is owed. H1 to H6 are operational assumptions. No further defect was found. | Nothing changes. Each stands as revision 11 had it. | Sections 4.4, 5.4, 6.6 and 12 |
| 7 | Simplification | Keep the shared rules for a first decision and for a reservation. Correct the contract's standing in every place, and add no approval gate, timer or settlement mechanism. Finish the owned gaps without reducing scope. | Done as asked. No gate, timer, state, message or refusal name is added. The one condition on source that named the contract's adoption is removed, because the adoption happened. The condition that this note must itself be adopted is the one that was already in its status. | Section 11.1; the opening |
| 8 | Coverage | A static review of the design and its provenance. No project execution, no provider effect and no cost proof. It closes no implementation duty. | Nothing here claims otherwise. Nothing was run for this revision. | "Limits", below |

## Each statement of the contract's standing that changed

"The label" is "proposed in the scope contract's revision 10,
approved by review `98b470c3`, pending adoption". The count is of
statements: sentences, and table cells. It is 39 in the main note and
4 in this file. Beside them, 124 uses of "the candidate" for the
contract's revision 10 are now "the contract", "R1" or "R1 section".
A script counted those.

| Where | In revision 11 | In revision 12 | Statements |
|---|---|---|---|
| The opening: the table of where each note stands | Revision 7 in force; revision 10 approved and not adopted. | Revision 10 in force, adopted (`85c18b66`); revision 7 is history. | 1 |
| The opening: how this note uses the contract | "It is not adopted." The label is defined. "Until that adoption the contract in force is revision 7." | It is adopted and in force. The label is removed. What the adoption does not adopt is stated. | 2 |
| The opening: what "R1 section" means | The adopted revision 7. | The adopted revision 10. Every heading of revision 7 has the same number there. | 1 |
| The opening: the table of what was read | "R1, adopted revision 7". | "R1, revision 7, which was in force when revision 10 of this note read it". | 1 |
| Sections 3.3, 3.6, 4.2, 5.7, 5.8, 6.2 (twice), 6.3 and 6.4; the openings of sections 13.1 and 13.2; one row of section 14 | The label. In sections 3.3, 5.7 and 6.2, also "revision 7, which is in force". In sections 3.3, 5.7, 6.2 and 6.3, also that no source may build on the form until its adoption. | The form is the adopted contract's. What this note declares on top of it is named as this note's proposal. | 12 |
| Section 3.8 | "Revision 7, which is in force", gives the directory no creator. | The conflict is closed: the adopted contract makes the register the creator. | 1 |
| Section 6.5 | The bound of 128 is "proposed in the candidate". | It is the contract's, as its proposal for R4. | 1 |
| Section 11.1, the row on the capability and reservations | "Only after the scope contract's revision 10 is adopted." | The contract's forms and accounting are adopted, and source builds on them as the contract states them. This note's own declarations wait on this note's adoption. | 1 |
| Section 13.1: the heading of the last column, and its ten cells | "In force today": what revision 7 has. Two cells said that a count does not fit "until the candidate is adopted". | "What revision 7 had", in the past tense. The two counts fit the contract's bounds. | 11 |
| Section 13.3: the opening, the headings of two columns, and five cells | The candidate "is not in force". "The form is not in force. Owner: R1's adoption", and the like. | The contract is adopted and in force. Each cell says what still differs, or that nothing does. | 8 |
| This file, "Revision 11": the opening, one row of the table of reliances, one row of what is owed, and one limit | Revision 10 of the contract awaits adoption. Its adoption is owed by the planner. | Each is marked "Corrected in revision 12", with what revision 11 said and what is so. | 4 |

Section 12 gains one sentence: "the contract" in the table of owned
gaps is the adopted revision 10, and its adoption decides none of
those rows.

## Rules that this revision makes stricter, or states more exactly

Each is a change to revision 11, which was not adopted, and each
needs this revision's review.

| Rule | In revision 11 | In revision 12 | Where |
|---|---|---|---|
| The unit of a handle's length | Canonical bytes. | The bytes of the handle's UTF-8 form. The number, 256, does not change. | Section 3.1 |
| A lane's one `withdraw`, refused | Declared, with no witness. | The same declaration, with a witness and its control. | Section 5.8 |

No other rule changes. Numbers: revision 12 proposes none. The
budget of 500 entries in the new witness is the made-up budget of the
witness beside it, and is labelled so. A few lines of script outside
the repository added up its rows.

Trusted claims: no new label is added. Operational assumptions: none
is added, and H1 to H6 are unchanged.

## What remains owed, and to whom

Nothing owed after revision 11 is dropped, apart from the adoption of
the scope contract's revision 10, which had already happened.

| Owed | To |
|---|---|
| Independent review of revision 12: the main note and this file, with the facts file by its identity. Adoption before any source depends on what revisions 10 to 12 add. | A reviewer who did not write it; the planner |
| The unit of the bound on a handle, stated in the contract's section 6.4, so that the contract, I1 and this note agree in words. The form that carries a receiver pin's highest decided license number (G15). The prose of the companion file's note N21. Dispositions for the I1 choices after entry 114 (G18). The points O11, O12 and O13, a byte domain for a check's configuration, a reason that carries more than one value, and the two incident answers on a pin. | R1, in its next revision |
| Where a platform creator reads a declared definition that is not its own (G16). An operator's recorded act that starts retransmission again, and who notices an acknowledged request with no result (G17). The platform definitions in full, with the mark that a publication's `withdraw` was decided, the characters of a handle, and each definition's timed rules and clauses against the rows of section 5.8 (G12). Any I1 choice after entry 114 that touches this note's subject (G18). | This note's next revision, with the owners in section 12 |
| Every other owned gap of section 12, G1 to G14, each to the owner that its row names. U20 and U21, with every choice of section 12 that the base left open. | The owners in section 12; this note's review; R4 for the numbers |
| What a full scope does next. Until that is decided, a first license request, and every other new work, waits at a scope with no free room. | R4, as the contract's section 17.5 says |
| One compact boundary row for section 4.4, with I5 and IA, which is owed and not shown. One witness row each for M1, for the limits of M3 and M4, and for L1. The three compact witnesses of revisions 11 and 12, folded into existing rows. The number for a handle's length. Every other number. No gate, no quota and no number of runs is added. | R4 |
| The checks of the retained Git reader under R4's key O15. The cleanup of an abandoned reader under R4's key O12, in the service. | I3 |
| The same cleanup in the client. The fields of a tool's result and its summary line. | I5 |
| The two export handlers in each definition, the slot for a job's deciding entry, and the rest that revision 10 asked. | R2 |
| The requests for U4, U6 and U15. The Node record. | The planner; R4 as the evidence owner; I3 and IA as the producers |
| H1 to H6 as operational assumptions. The deployment's secrets, clocks and access. | The operator and N5; R4 for what a run can show |
| Unchanged duties: unknown export, mint, create, push and delete outcomes, the pins they keep, and credential cleanup. A revocation, a token's expiry, a hold's end and a later attempt settle none of them. A lost reply shows nothing about what happened. | The owning scope's ledger; E1 for the earlier deployment |
| Evidence not yet produced: real-host, real-runner, cold-start, manual, device and cost evidence. | R4 and the owners named in sections 11.1 and 12 |

## Limits of this revision

- The adoption act `85c18b66`, the approval `98b470c3`, the delivery
  `1a2b9102` and its ratification `c24fdfa0` are as the review
  `3e65c824` and the planner give them. None was checked here.
- Of the scope contract's revision 10, this revision read again only
  the clause on a handle in section 6.4, and the section headings,
  beside those of revision 7. It changed what the note says of the
  contract's standing. It did not read again what the note cites.
- The text that revisions 2 to 9 of this note wrote cites R1 as each
  of them read it. Those sentences were not all read again against
  the contract's revision 10. Sections 13.1 to 13.3 say where each
  such point stands.
- I1's source was read at `97518f68` in three places only, for the
  unit and the value of a handle's bound. Nothing was run. The I1
  deltas note was not read. The counts of 139 and 152 choices are the
  reviews', and the successor work `108ea663` was not read.
- R0, R2 and R4 were not read again.
- The new witness was made by reading. No validator and no source
  checked it. The destination definition that it is about is not
  written, and the form of the mark that it uses is an owned gap.

## Revision 13

Revision 13 answers the independent review `8bb426f7` of revision 12 at
`80f390fc`. It changes two sentences of the main note and one of this file,
and nothing else. No rule changes.

| # | Point | What was wrong | What changed | Where |
|---|---|---|---|---|
| 1 | P2: one row still misstated the standing of the scope contract | Section 3.11's row for the change lane at `request-check` still called the digest-bearing intent and its guard "proposed ... pending adoption". The contract's revision 10 is adopted (`85c18b66`) and its companion file's `request-check` row already requires that field and guard. An implementer who followed the row could have deferred an adopted guard. | The row now attributes the field and the guard to the adopted contract, and says that R2's adopted row still has the earlier form and that bringing it to the contract's form is R2's follow-through (`cb523654`). | Section 3.11, the table of who may set a configuration, second row |
| 2 | Precision, not blocking | "256 ASCII bytes takes 258 bytes" is true only of unescaped ASCII. | "unescaped" is added. | Section 3.1; row 4 of "Revision 12" in this file |

The count of statements of the contract's standing that revision 12 changed
is therefore 40 in the main note, not 39: this row was the one it missed. The
table "Each statement of the contract's standing that changed" in the
"Revision 12" section is otherwise as written.

Still owed, unchanged: the form of G15, gaps G12 and G16 to G18, and the
contract's successor work under `108ea663`.

# Revision 14

Revision 14 is written for the planner's request `406983fe`. It is a
complete successor of revision 13 at `2709006c`, for dependent source
in the deliveries I3 and IA. It is design only. Nothing was run,
built, installed, probed or deployed for it.

The base is revision 13. That revision and its adoption record
`d7acffc9` are recorded input with stale dependency provenance:
revision 13 was written against the scope contract's revision 10, the
lane forms' revision 12 and the proof plan's revision 8, before the
recovery design existed. This revision does not rest on that adoption
and does not revive it. Everything that it adds or changes is a
proposal until it is independently reviewed and adopted.

It was written against these texts, each as the request gives its
standing: the scope contract's revision 11 at `996c3e58`, the lane
forms' revision 14 at `4b3bf5da`, the proof plan's revision 9 at
`85be9f0b`, the recovery design's revision 2 at `dafb5b0c`, the demo
contract's revision 4 at `3b6e1ad7`, and the I1 source at `a3e5a77e`.
The main note's opening says what was read of each, and by whom.

All three files of the package are revised. The main note has 6,477
lines, where revision 13 had 5,039. This file gains this section. The
facts file gains a section 10, and its sections 1 to 9 are unchanged.
The sections "Revision 10" to "Revision 13" above are history, and
none is changed.

Counts, each made by a script over the main note: 18 rows in the
table of gaps; 21 rows in "U1 to U21 at revision 14"; 7 platform
definitions; 25 rows in section 12.1.8, of which the first 12 are
forms of the contract that the I1 validator refuses and the last 13
have no form; 17 rows in "Messages between scopes"; 15 rows in the
table of subjects of section 11.2, and 7 in its table of deliveries;
55 rows in section 14, where revision 13 had 46. In each of the two
capacity witnesses of section 5.8, used, reserved and free add up to
500 in every row.

## One row for each thing that the request asks

| # | Asked | What revision 14 does | Where |
|---|---|---|---|
| 1 | Read and declare the complete current subjects, and the I1 choices through 157, with fresh source kept apart from historical input | The opening has one table of what was read, at which commit, and whether the author or a delegated reader read it. The I1 source was read at `a3e5a77e`. Earlier readings are kept as history. | The opening; section 11.2 |
| 2 | An accepted substrate review implements no grant, no platform effect and none of the eight later rows | Stated, with the ports that refuse and the rows of the contract's section 11.9. | Sections 11.2 and 12.1.8 |
| 3 | No blanket gate on the agreed I2 base source | Stated in the status. A table says what I2 can build now and what cannot run until I3 or IA exists. | The opening; section 11.2 |
| 4 | A disposition for each of G1 to G18, with the ownership of U1 to U21 and H1 to H6 | One table of gaps, with three kinds of disposition. One table of the choices. One paragraph on the assumptions' evidence. | Section 12 |
| 5 | An effect confirmed by a read against an attempt that is unknown; a token's end | Both are owed to the contract's next revision, as its points R1-38 and R1-39, with exactly what is asked. This note's own rule stands meanwhile. | Section 12, G1 and G2 |
| 6 | A bounded policy for further attempts, with no reading of free room | Each operation states its attempts. A further try is a new operation that only new work opens. The capacity witnesses are counted again. | Section 12, G3; sections 5.4, 5.7, 5.8 and 6.6 |
| 7 | The checker's dispatch, its read token and snapshot, and an immutable configuration | The dispatch is no send and no operation. A step `job-read` opens the token and the snapshot. The configuration has a byte domain. | Section 3.11; section 12, G4 |
| 8 | A reservation that would use too many foreign entries | The destination answers `evidence-too-large`, from the message alone. | Section 6.5; G5 |
| 9 | The snapshot of staged refs, and a check's details | The snapshot has the bound of one retained input. A lane does not retain a check's details. | Sections 3.11 and 5.8; G6 |
| 10 | A definition's name, its repository and its activation; a creator's closure | Activation is judged by the directory, on an observation of the rules. The bytes are read from the rules scope. The repository of a fetched entry is owed as a form. | Sections 12.1.2 and 12.1.4; G7 and G16 |
| 11 | A reason that carries a final state | Closed with the siblings: the one name `ended`. | Section 6.4; G8 |
| 12 | A hold that a person holds | Its authority is decided: a task whose worker is that person, with each operation signed by that person's device. | Section 12.1.7; G9 |
| 13 | Precedence of an observed revocation | Decided: it discards an older observation of that key, for the rest of the run. | Section 3.3; G10 |
| 14 | A bounded fanout for a compromise and for the rules | One notice, to the destination. No fan-out of rules: a lane asks. | Sections 3.5 and 12.1.4; G11 |
| 15 | Incidents and attention | An entry where one is written, and an operator's record. Shown, and not sent. | Section 12, "Incidents"; G13 |
| 16 | Equality at a window | Outside. One rule for every bound. | Section 3.3; G14 |
| 17 | A bound license's deciding number and effect, with every refusal of a bound request | Closed by the contract's revision 11. The wider cover is confirmed. | Section 4.2; G15 |
| 18 | A receiver that does not answer, and an operator's retry | A list, and an instruction that sends the same envelope again as bookkeeping. | Section 12, "A request that waits"; G17 |
| 19 | The later I1 choices that touch authority | One table, entries 115 to 157. | Section 12, "The I1 choices that touch authority"; G18 |
| 20 | The 35 sends, the 33 results and their ordinals | Confirmed for R2's adopted row. The one difference from R1 and R4 is named, with who changes. | Section 13.5 |
| 21 | A `cancel-merge` after an `undelivered` diagnosis | A second `withdraw` is its own request. The mark decides which one is bound. | Sections 5.8 and 12.1.5 |
| 22 | The seven platform definitions, with the task's release, final, control, journal and recovery records | Written in the contract's forms, each with its items, entries, sends, timed rules, reservations and cases. What no form says is listed with an owner. | Section 12.1 |
| 23 | Founding and a first commit; a report with no commit | The destination writes a first head. A report names a commit in the first version, and the rule for one that names none waits on R2. | Section 12.2 |
| 24 | The recovery design's cuts, and its device, key, recovery, export and takeover cases | One table of terms, one order for a new instance, one table of cases, and an answer to each of its eight asks. | Section 5.9 |
| 25 | Own-device custody, a read session against control, an agent's own lifecycle, delegation's later scope | Kept, each with its row. | Section 5.9 |
| 26 | The retained observation, the freshness proof, the ancestry record, a published start, author and reviewer independence, a late deciding entry, every trusted label | Unchanged. No rule of sections 3.3, 3.10, 6.2 or 6.3 is weakened. | Sections 3.3, 3.10, 6.2 and 6.3; section 12, "H1 to H6 at revision 14" |
| 27 | Evidence owners for H1 to H6, coordinated with the recovery design's preparation | One reading of primary documentation, by the builder. No probe is asked. | Section 12 |
| 28 | Values stay proposals | Every number is labelled a proposal or an example. No gate, no quota and no number of runs is added. | Throughout |
| 29 | A map to I3, IA, I2, I5, I6, I7 and E1, with removal and acceptance | Three tables. | Section 11.2 |
| 30 | The earlier stories, retargeted whole | One table: C1, C4, the device story, the workspace story, the publication story, and the later scopes. | Section 11.2 |
| 31 | Later collections, firm authority, delegation and an export across lanes | Kept, each with its owner. | Section 12, U4, U6 and U15 |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 13 | Revision 14 | Why |
|---|---|---|---|
| Where a `compromised` notice goes | To the destination, and to each task scope of the key's member. | To the destination only, through the directory. A task scope sees a revocation by its own observation, within sixty seconds. | No entry can send an unbounded number of requests. The base promised a shorter path and rested no rule on it. This narrows decision D2-4, and section 1 says so. |
| An age that equals its window | Both wordings. | Outside. | R4 asks. It is the stricter reading. |
| A read that shows a revocation | Not stated. | It discards an older observation of that key for the rest of the run. | G10. |
| The characters of a handle | Owed. | `@`, then lowercase ASCII letters, digits and hyphens. | G12. No handle then needs an escape. |
| The role table | The rows of revision 9. | Three more rows: `destination.adopt` and `ledger.retry`; `task.operate`; `inbox.own`. | Every act of a definition names an action. |
| The founder's first key | "Membership's genesis makes the founder's key the first key of the first admin." | Two acts after the genesis, `seat` and `first-key`. | A genesis opens one item. |
| An invitation's end | No timer. | The comparison still decides. A timed entry also marks it `lapsed`. | So that its reservation and its place are released. |
| A job's dispatch and its read token | A capability effect was proposed, and not decided. | No send and no operation. A step `job-read`, signed by the checker. | G4. |
| A check's details | Not decided. | Not retained by the lane. | G6. |
| A private stream's check | The task scope checks every sixty seconds. | The reader's device signs each check. The bound of eighty seconds is unchanged. | The contract gives a timed entry no observation. |
| An export's license request, and a withheld release | The task scope asks by itself, and writes the final entry by itself. | The authorizer's device signs each request. A withheld release is closed by a signed act. | Only an act, a request's delivery, a genesis and an outcome may send. |
| The mark `fenced` in a task scope | "It then marks the instance fenced." | A record that the worker, the controller or an admin writes. The fence itself is the lane's answer and the worker's grant. | A worker with no grant can sign nothing. |
| A checkpoint's identity | Five members. | Seven: the hold's epoch and the save job are added. | The recovery design. |
| A seed from the destination's head | Always a commit. | With no branch yet: the `fork` is `failed`, `no-head`. | Section 12.2. |
| The deployment's secrets | Four. | Five: the credential of owned checkpoint storage. | The recovery design's RU-16. |
| Attempts | A revocation, a delete, an unresolved push and a receipt write had no count. A further attempt was new work "when the scope has room". | Each has a stated number, and the opening reserves for all of them. A further try is a new operation that new work opens. | The contract's revision 11: nothing that an entry holds may depend on the free room. |
| The capacity witnesses of section 5.8 | 14 entries for publication 7; 25 for a new `reserve`; used 485, reserved 15. | 38; 73; used 461, reserved 39. No outcome of either table changes. | The stated attempts. |
| The bound on a snapshot | None proposed. | The bound on one retained input. | G6. |
| A refused `withdraw`'s reason | `ended` with two more values, whose form was open. | The one name `ended`. `malformed` is the contract's `bad-field`. | G8. |
| How often a lane sends `withdraw` | "Once for a merge." | Once, or a second time after an `undelivered` diagnosis of the first. | R2's revision 14 asks. |
| A reservation with too many foreign entries | Not decided. | `evidence-too-large`. | G5. |
| The first value of a branch | Not stated. An import was the directory's effect. | The destination writes it. An import copies objects and writes no branch. | D3-1 and H4 hold from the first value. |
| A rules change | Sent to every open change lane, with no form. | Sent to no lane. A lane asks. | G11. |
| "Admins are told" of an incident | Not designed. | It is on the admin page. No notice is sent in the first version. | G13. |
| The publication entry's sends | 34. | 35, for R2's adopted row. | Section 13.5. |

## What remains owed, and to whom

| Owed | To |
|---|---|
| The points R1-38 and R1-39. A fetched entry's directory, and one repository as the default of a `fact` type. The index row of the publication entry, counted. Dispositions for I1's entries 153 to 157. The thirteen forms P13 to P25. The general form of point R1-34. | The scope contract's next revision |
| The lane's side of `rules-wanted`. Whether a `report` may name no commit. Whether the live verdicts of one manifest are bounded. The address of a `notify`. | R2 |
| Every number: the windows, the attempts, the bound on one retained input, the retention of staged roots. F23 with 35 sends. The witness rows that section 13.6 lists. | R4 |
| The four differences of section 12.1.7, and the order of a new instance. One reading of primary documentation for its assumptions and for H1, H2, H5 and H6. | The recovery design and the builder |
| The source: six definitions, the authority port, the ledger, the gateways, the checker's side, the operator's record. | I3 |
| The source: the task definition and its runtime. The runtime of a hold that a person holds. | IA |
| The pages, the tool server's fields, a read session in the replay command. The boundary row of section 4.4, which is still not shown. | I5, with R4 |
| Who may install a register. The credential of owned checkpoint storage. The operator's steps for an incident and for a request that waits. | N5 and the operator |
| Collections and firm authority. Delegation. An export to a hold of another lane. A later choice on a pin with no answer, and on a hold of a revoked member. | The planner, each on its own request |
| Every unknown duty of the earlier deployments. | E1 |
| Evidence that no run has produced: the real host, the real runner, a cold start, devices, cost. | R4 and the owners in sections 11.1 and 11.2 |

## Limits of this revision

- No adoption act was read. The standing of each sibling is as the
  request `406983fe` gives it. The requests `d56d7f65`, `cc570904`
  and `1e651244` that it names were not read.
- The contract's next revision is being written while this one is.
  It was not read. Every seam that is owed to it is named and not
  decided.
- Much of the sibling notes was read by delegated readers, and not
  by the author. The opening says which parts. The recovery design
  was read only so: the author read all of the reader's extract, and
  none of that note's own lines.
- The I1 deltas note's entries 1 to 114 were read as one line each,
  by a delegated reader. Of the I1 source the author read the files
  that the opening lists, and the rest was read by delegated readers.
- Sentences of revisions 2 to 13 that this revision did not change
  cite the contract as each of them read it. They were not read
  again against revision 11.
- The seven definitions were written and checked by reading. No
  validator, no script and no source read them. The I1 validator at
  `a3e5a77e` would refuse each of them today, for the reasons that
  section 12.1.8 lists. No canonical bytes and no digest exist.
- The capacity witnesses of section 5.8 were counted again by hand,
  and their sums were checked by a script. No source derived them.
- This file's own earlier sections, and the facts file's sections 1
  to 9, were not read again in full.
- Nothing shows any property of the Git host, of a storage provider
  or of a clock. A derivation that is run again over recorded inputs
  shows none.

# Revision 15

Written for the review `14ad7c42` of revision 14 at `b3e55edb`, which
requested changes: two findings on the task definition's liveness,
and one clarification on a private stream that it did not make a
condition. The base is revision 14. Design only: nothing was run,
built, installed or probed.

Revision 15 keeps every rule and every scope of revision 14, with the
changes that the tables below list. It keeps all seven platform
definitions, the ownership of G1 to G18, U1 to U21 and H1 to H6, and
the 25 rows of section 12.1.8. It adds no gate, no timed rule, no
second lifecycle and no number of runs. Everything that it adds or
changes is a proposal until it is independently reviewed and adopted.

All three files of the package are revised. The main note has 6,870
lines, where revision 14 had 6,477. This file gains this section. The
facts file gains a section 10.4, and its sections 1 to 10.3 are
unchanged. The sections "Revision 10" to "Revision 14" above are
history, and none is changed.

Counts, each made by a script over the main note: 59 rows in section
14, where revision 14 had 55; 25 rows in section 12.1.8, of which 8
are now marked as supplied by the I2 base and 1 in part; 9 cases
under the task definition, a to i, where revision 14 had 5; 18 rows
in the task definition's table of entries, where revision 14 had 16;
8 item types in the task definition, as before; 7 platform
definitions, as before.

## One row for each thing that the review asks

Every row answers the review `14ad7c42`.

| The review asks | The change | Where |
|---|---|---|
| P2. Give restore an admission path that works before readiness, bounded, in a replayable order, bound to genuine worker authority and the exact new hold, epoch and instance. Keep ordinary tools and pushes behind `ready`. | The order is the lane's step `instance`, `register`, `intend` for the restore, and its outcome. `register` reads no earlier registration, so a fresh task can take it. `intend` for a restore is a row of its own: the worker's key, `task.operate` (W2), the task `running`, and a registration that is `starting` with no restore opened, or `restore-failed` with fewer than 3. It names the hold, the epoch and the instance, which must equal the registration's. The registration counts its restores in a new value, `restores`, from 0 to 3. A restore whose outcome is `unknown` is not replaced under its registration. Every other `intend`, and every save, still needs `ready`. | Section 5.9, the four steps and "Corrected in revision 15". Section 12.1.7: the `registration` item; the rows `register`, `intend` for a restore, `intend` for any other operation, and the outcome of any other operation; "A restore before readiness" with its table of states; the reservations; cases f and g. Section 14. |
| P2. Complete an already-admitted admin stop control after worker authority ends, as a control-bound outcome or a narrow admin completion, without reviving worker authority or permitting a new tool. Reconcile the prose that calls completion a runtime outcome with the table that defines `apply`. | A control-bound outcome is chosen. The entry of a `pause` or a `cancel` opens its own stop and reserves that outcome. The outcome has no signer, reads no grant and no registration, applies that one control, and moves the task only toward a stop. The worker's `apply` now applies the six other kinds only. From the stop's own entry on, no `intend` is admitted. A control of another kind that no worker can apply becomes `void`, a new final state, in the outcome of a `cancel`. A table says what ends each queued control in five cases. | Section 4.1, the third point. Section 4.3, two rows. Section 5.8, the row of a task scope's control. Section 5.9, the row for a last key. Section 12.1.7: the `control` item; the rows of the controls, of the outcome of a `pause` or a `cancel`, and of `apply`; "What ends a queued control" with its table; "What I2 and IA read"; the fourth difference from the base; case h. Section 14. |
| Not a condition. State the binding of a private stream to its opening device before source implementation. | The stream holds the key that signed `open-read`. `continue-read` is guarded on that key. `close-read` is guarded on the reader. A revoked key's open stream passes no later check and closes at its stored end time. Another key of the same member opens a stream of its own. | Section 4.2, the last point of the stream's bound. Section 12.1.7: the `stream` item; the row of the read acts; the first difference from the base; case i. Section 14. |

## Each statement of the contract's standing that changed

The scope contract's revision 12, as amended before its review, at
`53f0e183`, is adopted by the planner's act `b2833098` of 2026-10-05.
That is as the commission for this revision states it. The act was
not read. No row here answers the review `14ad7c42`: each follows
from that adoption.

| Where | Revision 14 said | Revision 15 says |
|---|---|---|
| The opening: the status, the table of where each note stands, and the paragraph kept from revision 12 | Revision 11 at `996c3e58` is in force, and the next revision is in preparation. | Revision 12 as amended is in force. Revisions 10 and 11 are history. Revision 14 of this note was reviewed and not adopted. |
| The opening, "How revision 14 uses the contract" | "The contract in force is R1 revision 11". | That was so when revision 14 was written. A new paragraph, "How revision 15 uses the contract", says what "R1's next revision" now means, what revision 12 answered, and what it asks of this note that revision 15 does not answer. A new table says what revision 15 read. |
| Section 11.2, two rows | The count of the publication entry waits on R1's answer. | The adopted contract counts 35 as well. |
| Section 13, its opening | Sections 13.1 to 13.4 are stated against revision 10. | The same, with one sentence that the contract in force is revision 12 and that sections 13.5 to 13.7 are stated against it. |
| Section 13.1, row O4 | The entry needs 34 in the contract's count and 35 in R2's row. | It needs 35 in both. Revisions 8 to 11 of the contract counted 34. |
| Section 13.5 | The three notes do not agree by one. R1's revision 11 counts 34. R1's count is owed to its next revision. | The contract's revision 12 counts 35, with the result at ordinal 34, and it is adopted. The column for revision 11 is kept as history. No source may assert 34 for the entry with an `unpin`. |
| Section 13.6, the rows for R1 and R4 | The index row is asked of R1. F23 waits until R1 has answered. | R1's revision 12 answered the index row. The other asks of that row stand against the revision after 12. F23 no longer waits on R1. |
| Section 14, three rows | Text of revision 14 cites revision 11. One difference from R1 and R4 is named. | Text of revision 15 cites revision 12. The count is the adopted contract's as well. The last row names what revision 15 read. |
| The facts file, section 10.4 | Not present. | Six rows read at `53f0e183` and at `744f2447`. The row of section 10.2 on revision 11's count of 34 is kept, as true of revision 11. |

## Three answers to the adopted contract

Each is asked by the contract's revision 12, in the passages that it
marks "added before its review". None answers the review `14ad7c42`.

| Asked | Answer | Where |
|---|---|---|
| Its point R1-48: the genesis act of each platform definition | `install` for the register, and `establish` for each of the other six. Each table of entries already had the row. One fact type names a platform genesis by its kind: the register's slot `genesis`. | Section 12.1, a new point under the table of names. Section 13.7. |
| Its point R1-49: whether the rules of `hold@1` add anything to an entry that uses only its item form | Nothing is added, and the contract's section 6.8 stands. Section 5.7 had three things happen in entries that the item form also writes: the `fork` record at a hold's opening, the `instance` record at its end, and a token's revocation. They are now stated as forms beyond the item form. How a row states their use is owed with the row P9. | Section 5.7, a new point under the records. Section 13.7. |
| Its section 6.11 and I2 delta DJ14: a scripted capability; and its section 6.1: the answer `unsupported-definition` | Both confirmed. A result with a scripted capability is evidence only about what a definition's rows do after a capability has answered. The real evidence that I3 owes for `hold@1` and for `git-read@1` is listed. It adds no gate. | Section 13.7. |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 14 | Revision 15 | Why |
|---|---|---|---|
| The order of a new instance | `intend`, the lane's step, `register`, the outcome. | The lane's step, `register`, `intend`, the outcome. | The review's first finding. A restore is now bound to a registration that exists. |
| `register` | The presented entry names this task and this instance. | Also: no registration of this task holds that instance. | So that "the exact new instance" is checked, and a presented entry registers once. |
| An `intend` while a stop is queued | Admitted until the worker applied the stop. | Refused from the stop's own entry on. | That entry is the next tool boundary. Nothing depends on the worker to stop new tools. |
| A control once a `cancel` is applied | Admitted while the task is `cancelling`. | Refused. | So that no control is queued after the entry that makes the others `void`. |
| What a control reserves | 1 entry for "the runtime's outcome", for every control. | 1 entry for the outcome of a `pause` or a `cancel`. The worker's `apply` of another kind is new work. | The reserved entry is the stop's outcome. An act of the worker was never an outcome. |
| When a `cancelling` task ends | The page shows "cancelling" until every effect is known. No row made the task `ended` afterwards. | The outcome entry that leaves no operation unsettled makes it `ended`. | Stated so that a `cancel` has an end in the table, as section 4.3 already said in prose. |
| What a restore restores for a fresh task | Not stated. | The environment starts from the hold's fork alone, when the pointer names no checkpoint. | A fresh task has no checkpoint, and its first restore is the review's witness. What the environment holds is the recovery design's. |
| The rows P14, P17 and P24 of section 12.1.8 | Used by the rows that revision 14 lists. | Each has one more use: a stream's `key`, a registration's `restores`, and the controls that a `cancel`'s outcome makes `void`. | Three rules of this revision are platform code under forms that are already listed. No row is added. |
| The rows P1, P3 to P8, P10 and P11 of section 12.1.8 | Refused or absent at `a3e5a77e`. | Also marked "supplied by the I2 base at `744f2447`, under review", P11 in part. | The I2 delivery note lists them as implemented. The source is not accepted, and no row is removed. |

## What remains owed, and to whom

| Owed | Owner |
|---|---|
| The four things that the contract's revision 12 asks and that revision 15 does not answer: the binding of a license request (R1-44); its reading of `not-owner` and `malformed` on a `withdraw`; activation, with a platform creator's read of a definition (R1-22 and R1-35); the task definition's reservations and evidence where the recovery design joins. | This note's successor |
| The form by which a row states that a hold has a workspace, so that the `fork`, `token` and `instance` records are forms that a definition uses. | I3, with R1 for the form and R2 for the rows |
| The points R1-38, R1-39 and R1-34, and the thirteen forms P13 to P25. | The scope contract's revision after 12 |
| The new order of a new instance, and the first restore of a fresh task from the hold's fork alone. | The recovery design and IA |
| The numbers: at most 3 restores for one registration, and the `max` of registrations and of controls. Row F23 at 35 sends and 33 results. | R4 |
| The real evidence for `hold@1` and `git-read@1` that section 13.7 lists. | I3 |
| Everything that the section "Revision 14" lists as owed, apart from the count of the publication entry. | As that section says |

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 15 read" says what was read. Revision 14 was not
  read again in full: sections 6 to 10, most of section 3 and most of
  section 12 were read only by search for the words that changed.
- The contract's revision 12 was read in the parts that the table
  lists. Its section 15.9, on the recovery design, and its section
  15.6i were not read. Sentences of revisions 10 to 14 that this
  revision did not change were not read again against revision 12.
- The planner's act `b2833098` was not read. The contract's standing
  is as the commission for this revision states it.
- The recovery design was not read again. The new order of section
  5.9, the value `restores` and the first restore from the hold's
  fork are this note's, and that design has not seen them.
- The marks on section 12.1.8 rest on the I2 delivery note and on the
  I2 plan's table of forms. No I2 source file and no test was read.
  For P7 the reading is by two rows of that plan, and the `relate`
  whose `to` is the sender was not found there by name.
- A task whose 64 controls are all `queued` admits no further
  control, a stop included, if the item type's `max` counts items
  that are not final. Revision 15 does not decide that. The number
  and its reading are R4's and the contract's. Added in revision 16:
  the adopted contract had already settled the reading, in its
  section 6.3, and revision 16 decides the rule. The section
  "Revision 16", below, has it.
- The task definition was changed and checked by reading. No
  validator, no script and no source read it. The scripts that
  revision 15 ran counted rows and lines of the notes, and nothing
  else.

# Revision 16

Written for the review `60c940f3` of revision 15 at `8dfda899`, which
requested changes: two findings on the task definition, and one
question of order that it did not make a condition. The base is
revision 15. Design only: nothing was run, built, installed or
probed.

Revision 16 keeps every rule and every scope of revision 15, with the
changes that the tables below list. It keeps all seven platform
definitions, the ownership of G1 to G18, U1 to U21 and H1 to H6, the
25 rows of section 12.1.8, and the three answers of section 13.7. The
four things that the contract's revision 12 asks and that revision 15
left open stay open, as the opening of the main note states them. It
adds no gate, no timed rule, no second lifecycle and no number of
runs. Everything that it adds or changes is a proposal until it is
independently reviewed and adopted.

Two files of the package are revised. The main note has 7,247 lines,
where revision 15 had 6,870. This file gains this section, and one
bullet of the section "Revision 15" gains a sentence that points
here. The facts file is unchanged. The other sections above are
history, and none is changed.

Counts, each made by a script over the main note: 62 rows in section
14, where revision 15 had 59; 25 rows in section 12.1.8, as before,
of which 3 have one more use; 13 cases under the task definition, a
to m, where revision 15 had 9; 19 rows in the task definition's table
of entries, where revision 15 had 18; 9 item types in the task
definition, where revision 15 had 8; 6 rows in the table of what ends
a queued control, where revision 15 had 5; 7 platform definitions, as
before.

The standing of the recovery design, as the commission for this
revision states it: revision 2 at `dafb5b0c` is adopted. Revision 4
at `16777d97` was approved by review on 2026-10-05 (verdict
`d432a424`), and its adoption is pending. Revision 16 rests on
revision 2. The rule that it takes, in section 8.2, reads the same in
revision 4.

## One row for each thing that the review asks

Every row answers the review `60c940f3`.

| The review asks | The change | Where |
|---|---|---|
| P2. Keep an authorized stop admissible when ordinary controls fill the item limit. Account for its item and entry duties in the existing model. Do not only raise 64. Do not revive worker authority, erase retained controls, or settle outside effects by cancellation. | Two places of the 64 are kept for stops. A control of the six other kinds is admitted only while fewer than 62 of those kinds are `queued`, or it is refused `controls-full`. At most one `pause` and one `cancel` are `queued` at once: a second of the same kind is refused `stop-pending`, or is answered as a repeat. So the `queued` controls are at most 62 + 1 + 1 = 64, and a stop is never refused `type-full`. A task also reserves the entries of a stop before it is signed: one `cancel` from the task's genesis, and one `pause` from the `apply` that makes the task run. Each is the control's entry and item, its outcome and its save. A short argument in three steps, and a table of seven rows, show that an authorized stop is admitted or is a repeat in every state of the queue. A separate item type for a stop, and a stop that makes the queue `void` in its own entry, were weighed and not chosen. The stop's outcome is as revision 15 has it. A control that becomes `void` stays as an item in that final state. | Section 4.1, the third point. Section 5.8: the list of essential inputs, three rows of the table and "The room of a stop". Section 12.1.7: the row of the controls; "What ends a queued control", the corrected point and closing paragraph and one more row of its table; "Room for a stop"; the reservations; case j. Section 12.1.8, P11. Section 14. |
| P2. Bind a replacement after a failed recovery to a person's recorded decision, as the adopted recovery design asks. Keep the first restore before readiness, and ordinary recovery after a host is lost. Add no blanket approval of every restore. | A restore's `refused` outcome with one of the recovery design's five reasons opens a new item, `failure`, in the state `undecided`. It holds the registration with its hold, epoch and instance, the restore's operation, the reason and the checkpoint. While a failure is `undecided`, every `intend` for a restore is refused `recovery-undecided`, under that registration or a new one. The controller or an admin signs `decide-recovery`, with `task.control`, which names the failure and repeats its six values, and chooses `repair` or `abandon`. `repair` admits one replacement, and the `intend` that opens it makes the failure `retried`. `abandon` empties the pointer, keeps the abandoned checkpoint, fences the registration, and leaves the task in its state: the next chain starts from the hold's fork with no prior. A first restore, a restore after a host is lost, a new instance after an `unknown` outcome, and a replacement after a `refused` outcome with another reason need no decision. The bound of 3 restores for one registration stays as an upper limit. A late answer of a restore whose registration was replaced or fenced opens the failure too. | Section 3.2, one sentence. Section 4.3, a new row. Section 5.8, one row. Section 5.9: its opening, steps 3 and 4, "A recovery that failed", one more case, and what is asked of the recovery design. Section 12.1.7: the `failure` item; the rows `intend` for a restore, the outcome of any other operation, and `decide-recovery`; "A restore before readiness" with its table of states; "A failed recovery, and the person's decision" with its table; "What I2 and IA read"; the reservations; cases g, k and m. Section 12.1.8, P16. Section 13.6. Section 14. |
| Not a condition. Say whether a later `pause` supersedes an earlier `resume` or `start` that is not yet applied. | It does. The outcome of a `pause` makes every `start` and every `resume` that is `queued` `void`. The outcome of a `cancel` already made every queued control `void`. A `start` or a `resume` is refused `stop-pending` while a stop is `queued`, so each one that a stop makes `void` was signed before it. A `steer`, an `answer`, an `authorize-attempt` and a `set-read-only` stay `queued` through a `pause`. A task runs again only by a control that is signed after the last stop. | Section 4.3, the row "Pause". Section 12.1.7: the rows of the controls and of a stop's outcome; "What ends a queued control", the point "A stop ends an earlier order to run" and one row of its table; case l. Section 12.1.8, P24. Section 14. |

## Each statement of a sibling's standing that changed

| Where | Revision 15 said | Revision 16 says |
|---|---|---|
| The opening: the status, and the row for R3 | Revision 15 is this text, proposed. | Revision 15 at `8dfda899` was reviewed (`60c940f3`) and not adopted. Revision 16 is this text, proposed. |
| The opening: the row for C2. Section 5.9, its opening. | Revision 2 at `dafb5b0c` is adopted. Its branch is being amended, and nothing after it was read. | Revision 2 is adopted. Revision 4 at `16777d97` was approved by review on 2026-10-05 (verdict `d432a424`), and its adoption is pending. It is no authority here. Its section 8.2 was read, and reads as revision 2's. |
| The opening: two new parts | Not present. | "How revision 16 uses its siblings" and the table "What revision 16 read". |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 15 | Revision 16 | Why |
|---|---|---|---|
| How many controls of the six kinds that are not a stop may be `queued` | 64, with the stops. | 62. The 63rd is refused `controls-full`. | The review's first finding. Two places are a stop's. |
| A second `pause`, or a second `cancel`, while one of that kind is `queued` | Admitted, as one more item. | Refused `stop-pending`, or answered as a repeat. | So that the stops that are not final are at most two. The one that is `queued` has a reserved outcome. |
| A `start` or a `resume` while a stop is `queued` | Admitted. | Refused `stop-pending`. | So that a stop makes `void` only an order that was signed before it. |
| A `start` or a `resume` that is `queued` when a `pause` is applied | It stayed `queued`, and the worker could apply it later. | `void`, in the outcome of the `pause`. | The review's question of order. |
| The `apply` of a `start` or a `resume` | New work that reserves nothing. | New work that reserves the room of one `pause`, and is admitted only with it. | So that a task that runs can always be paused. |
| A replacement restore after a `refused` outcome with one of the five reasons | Admitted to the worker while `restores` is under 3. | Refused `recovery-undecided` until a person's `decide-recovery`. One decision admits one. | The review's second finding. |
| A first restore under a new registration, while a failure is `undecided` | Admitted. | Refused `recovery-undecided`. | So that a new instance does not stand in for the decision. |
| A late `refused` answer of a restore whose registration was replaced or fenced | It changed nothing. | It opens the `failure`, under three stated conditions. | So that a new `register` or a `fence` before the answer does not avoid the record. |
| The final state `void` of a control | A `cancel` was applied first. | A stop was applied first: a `cancel` for any kind, or a `pause` for a `start` or a `resume`. | Stated for the new use. |
| What an admitted stop reserves | 1 entry for its outcome. | The same, and the save that it opened. Before it is signed, the task holds the room of its entry, its item, its outcome and its save. | The review asks for the stop's whole duties. Revision 15 did not count the save in this row. |
| The rows P11, P16 and P24 of section 12.1.8 | Used by the rows that revisions 14 and 15 list. | Each has one more use: the room of a stop that is not yet signed; the `failure` that an outcome opens, with the entries that make one `lapsed` or `retried`; and the controls that a `pause`'s outcome makes `void`. | Rules of this revision that are platform code under forms that are already listed. No row is added. |

Nothing is made wider. One thing is new that a person may do:
`decide-recovery`, under the grant `task.control` that the same
people already hold.

## What remains owed, and to whom

| Owed | Owner |
|---|---|
| The four things that the contract's revision 12 asks and that revisions 15 and 16 do not answer: the binding of a license request (R1-44); its reading of `not-owner` and `malformed` on a `withdraw`; activation, with a platform creator's read of a definition (R1-22 and R1-35); the task definition's reservations and evidence where the recovery design joins. | This note's successor. Answered in revision 17: the section "Revision 17", below. |
| The form of a reservation that a task holds for an act that is not yet signed, and that the act's own entry does not settle. The contract's `settles` asks that the settling entry take its subject out of the listed state. | The scope contract's revision after 12, with the row P11 |
| That the `failure` item and `decide-recovery` are the record that its section 8.2 asks for; that `repair` may use the same instance or a new one; whether a `refused` restore can have a reason outside its five. | The recovery design and IA |
| The numbers: 62 and 2 of the 64 controls; the `max` of 2 for `failure`. | R4 |
| The page's words for `controls-full`, `stop-pending` and `recovery-undecided`, and how it shows a failure with its six values for the person who decides. | R2 and I5 |
| Everything that the section "Revision 15" lists as owed. | As that section says |

## What the adversarial reading checked

Each new guard was read for two faults: a legal state in which an
authorized person cannot act, and a state in which an agent acts with
no person's decision.

- *`controls-full`.* It refuses only the six kinds that a worker
  applies. A person who is refused can still sign a stop. With a
  worker present, each `apply` frees a place.
- *`stop-pending` on a stop.* It is given only while a stop of that
  kind is `queued`, and that one has a reserved outcome that needs no
  key. So the refused signer's stop takes place.
- *`stop-pending` on a `start` or a `resume`.* It ends with the
  stop's outcome, which is the scope's next entry. The signer then
  signs again.
- *A `pause` as new work.* A `pause` of a task that is `idle` or
  `paused` may be refused `scope-full`. The `apply` that would make
  that task run needs more room than the `pause`, so the task cannot
  run where the `pause` is refused. A `cancel` is admitted there.
- *`recovery-undecided`.* An agent cannot sign `decide-recovery`: the
  role `agent` holds no `task.control`. It cannot pass the guard by a
  new instance, because the guard reads the task's failures and no
  registration. It cannot avoid the record by `register` or `fence`
  before the answer, because a late answer opens the failure. First
  found in this reading: the draft opened the failure only when the
  outcome made a registration `restore-failed`, and both of those
  paths avoided it.
- *A decision used twice.* A `repair` failure is `retried` by the
  `intend` that it admits. A failure that is reported while a
  `repair` one stands makes that one `lapsed`, so an old decision
  does not admit a replacement for a new failure. Also found in this
  reading.
- *A person locked out of the decision.* `decide-recovery` reads no
  task state, no queue and no worker's grant. Its entry is reserved
  with the restore. A person who chose `repair` and then wants to
  abandon must wait for the replacement to fail. If no worker can
  sign that replacement, the task cannot run in any case, and a
  `cancel` ends it.
- *A restore that was already opened.* A restore that was in flight
  when a failure was recorded keeps its own outcome. If it is
  `confirmed`, the failure is `lapsed` with no decision. That restore
  checked every byte of the same checkpoint, and it was opened before
  the failure was known.
- *Not closed.* The reason of a `refused` restore is the runtime's
  report. A runtime that reports a fault of the checkpoint under
  another reason opens no failure. This note trusts an outcome's
  evidence as it does elsewhere, and asks the recovery design whether
  such a reason exists.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 16 read" says what was read. Revision 15 was not
  read again in full: sections 6 to 11, most of section 3 and most of
  section 12 were read only by search for the words that changed.
- The contract was read in section 6.3, in parts of sections 6.4 and
  6.5, and in sections 17.2 and 17.3 as far as the five conditions.
  That an act may use a standing reservation that its own entry ends
  is this note's reading of section 17.3, and the contract has not
  seen it.
- The recovery design was read in sections 8.1 and 8.2 and in two
  other passages. Its list of five reasons is taken as complete for
  faults of a checkpoint. Whether a restore can be `refused` for
  another reason was not found there. The `failure` item,
  `decide-recovery` and both ends of a decision are this note's, and
  that design has not seen them.
- The verdict `d432a424` and every adoption act were not read. Each
  sibling's standing is as the commission for this revision states
  it.
- The task definition was changed and checked by reading. No
  validator, no script and no source read it. The scripts that
  revision 16 ran counted rows and lines of the notes, and nothing
  else.

# Revision 17

Written for the planner's request `f1142e84`, on the adopted revision
16 at `7bc60cf6`. The request is bounded: five decisions and one
coordination. Design only: nothing was run, built, installed or
probed.

Revision 17 keeps every rule and every scope of revision 16, with the
changes that the tables below list. It keeps all seven platform
definitions, and the ownership of G1 to G18, U1 to U21 and H1 to H6.
It adds no gate, no timed rule, no second lifecycle and no test
quota. It changes no byte of either pinned lane definition, and no
pinned digest. It adds one section to the main note, 13.8, which is
the index of this revision. One row of the section "Revision 16",
above, gains a sentence that points here. The facts file is
unchanged. The other sections above are history, and none is changed.

Counts, each made by a script over the main note: 70 rows in section
14, where revision 16 had 62; 25 rows in section 12.1.8, as before;
14 cases under the task definition, a to n, where revision 16 had 13;
6 cases under the directory, a to f, where revision 16 had 5; 24 rows
in the table of pending duties in section 5.8, where revision 16 had
22; 74 headings, where revision 16 had 73; 7 platform definitions, as
before. Counted by a script over the two lane definitions as data: 11
forms of `hold@1` in `issue`, 5 guards and 6 effects, on 6 rows; and
8 in `change`, 3 guards and 5 effects, on 4 rows. In both, the 4 hold
rows write the `hold` effect and no capability form.

## One row for each thing that the request asks

Every row answers the request `f1142e84`, and the last two also
answer the approval `33787163`.

| The request asks | The change | Where |
|---|---|---|
| Q3. What declaration makes a hold require a workspace, and what authorizes deriving the `fork`, `token` and `instance` records. Decide the predicate, where it applies and the exact source changes. Do not infer them from the `hold` effect alone. | The holds of a definition have a workspace exactly when the definition lists `hold@1` and uses at least one guard or effect of it. The predicate is read from the definition's bytes alone, for the whole definition. The scope's commit derives the records, as code of the capability, at the opening, at an end, at an expiry and at a renewal that changes the holder. A renewal by the holder derives nothing. A definition that uses only the item form gets the item form, and its steps `instance` and `token` are refused `no-workspace`. No definition's bytes and no pinned digest change. The builder's proposal is taken, for the definition and not for an item type: no capability form names an item type. The I3 plan's step 18 no longer waits. | Section 5.7: one new point under the records, "When a hold has a workspace", the table of the two lanes, "What is derived, and at which entry", and two cells of the table of steps. Section 13.7: the last point of "The item form of `hold@1`". Section 12.1.8: the row P9. Section 5.8: the point on the static rule. Section 14. |
| R1-44. Whether a license request is bound by source, export and number alone, and what a bound request that is malformed decides. | By those three alone. The binding is the four rows that revision 11 wrote. A bound request that is malformed in another field is refused `bad-field`, or `no-item` when its `hold` names no item, on the entry that the pin reserved for its number. The entry's one effect sets `decided` to that number. The highest number that decides is 3. | Section 4.2: one new point, with a table of seven rows and a case. |
| The binding of a `withdraw` that is `not-owner` or `malformed`, and its capacity exception. | Neither is bound, and each is new work. The contract's reading is confirmed. The binding has four rows. The exception is stated exactly: the deciding entry of the first bound `withdraw` of a publication is a settling entry, also when it refuses. It uses 1 entry that the publication reserved at its `reserve`, once. The five conditions and the bound are written out. | Section 5.8: "The exception for one `withdraw`, stated exactly", with two tables and a case. Section 12.1.5: one sentence. |
| Activation, and a platform creator's read of a retained definition, as one consistent answer (R1-22 and R1-35). | One table of eleven questions, with the answers that G7, G16 and section 12.1.2 already gave: who retains, who activates, what the directory reads, from whom, by digest, with what freshness, and each way that it fails. No rule changes. | Section 12.1.2: "Activation and the creator's read, as one answer", and case f. Section 12: the rows G7 and G16. |
| The task's save and restore reservations and its checkpoint evidence, against the recovery design's revision 4 and the task definition. Keep IA's ownership. | A save and a restore in each of the five dimensions. A save's closure is at most 30 entries, 3 `cut` items and 1 `checkpoint` item. A restore is 9 entries and 1 `failure` item. Neither has a record or a pending request, and neither retains an input under a digest. A table of where the two notes' records meet, with what a replay derives and what it takes on trust. Six things are asked of the recovery design. | Section 12.1.7: "What a save and a restore reserve, and what a receipt is evidence of", and case n. Section 5.8: two rows. Section 5.9: its opening and its last paragraph. |
| Coordinate P19 and P21, which the contract's revision 13 leaves open as R1-53 and R1-54, and P20 and P23, which it proposes. Adopt no proposed byte by building on it. | One table: what this note needs of each form, what that revision gives, whether it meets the need, and what I3 does. Corrected in the second commit: that revision was adopted while this one was written. P20 and P23 are adopted forms, so a lane's membership reference and a notice from a lane are no longer blocked. P19 and the bytes of P21 stay blocked, with the plan's split and one addition for P19. | Section 13.8. Section 12.1.8: one paragraph. Section 12.1: one sentence on the membership reference. |
| The approval's first precision. The sentence that a stop is always admitted must keep the exception for a `pause` while the task is `idle` or `paused`. | The exception is stated in each place that has the sentence, with the three things that hold together: a `cancel` is reserved from the genesis, a `pause` holds room while the task runs, and no task runs without that room. No rule changes. | The opening, in the record of revision 16. Section 4.1. Section 12.1.7: the heading of the argument, its third step, and one paragraph. Section 14: one row. |
| The approval's second precision. Refresh the wording that the recovery design's revision 4 awaits adoption. | Revision 4 at `16777d97` is adopted, by the planner's act `2621bc2f`. Each statement of what is in force says so. | The next table. |
| Q12. The standing of the fence of section 6.8. | Not adopted. The part of section 6.8 above the fence is adopted, and "hold" is the rule in force. The fence stays a proposal, because the adopted text offers it as one and no review ruled on it. I3 builds the hold only. | Section 6.8: "The standing of this section". Section 12: both rows for U2. |

## Each statement of a sibling's standing that changed

| Where | Revision 16 said | Revision 17 says |
|---|---|---|
| The opening: the status, and the row for R3 | Revision 13 is recorded as adopted, with stale provenance. Revision 16 is this text, proposed. | Revision 16 at `7bc60cf6` was approved (`33787163`) and is adopted. Revision 17 is this text, proposed. Where text of revisions 14 to 16 calls itself a proposal, that was its standing when it was written. |
| The opening: the row for C2. Section 5.9, its opening. | Revision 2 at `dafb5b0c` is adopted. Revision 4 at `16777d97` is approved, and its adoption is pending. | Revision 4 is adopted (the planner's act `2621bc2f`), and it is the text in force. Revision 2 is history. By its own record, revision 4 changes no rule of its sections 5 to 10 and nothing of its stage two. |
| The opening: the row for R1 | Revision 12, as amended, is adopted. | Revision 13, as corrected, at `86c6aabde`, is adopted (verdict `636df0ac`; the planner's request `10e7093d` states it). The first commit of revision 17 said that it was under review and not adopted, which was so when it was written. Its revision 14 is in progress and is not filed. |
| The opening: the status | Not stated. | The act that adopted this note's revision 16 is `d6e7e878`, as the contract's review cites it. It was not read. |
| The opening: two new parts | Not present. | "How revision 17 uses its siblings", and the table "What revision 17 read". |
| The opening: one row of "What revision 16 read" | "C2, revision 4, not adopted". | The same, with a sentence that it has been adopted since. |
| This file, "Revision 16": the standing of the recovery design, and one row of its table of standings | Revision 4's adoption is pending. | Not changed here: it was so when it was written. The rows above are the present statement. |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 16 | Revision 17 | Why |
|---|---|---|---|
| When a hold has a `fork`, a `token` and an `instance` | Under a definition "whose rows use the workspace forms". How a row states that was owed. | Exactly when the definition uses at least one guard or effect of `hold@1`. | The request's first decision. |
| The steps `instance` and `token`, under a definition that uses only the item form | Not stated. | Refused `capability-refused`, named `no-workspace`. | So that no record of the capability is made where the predicate is false. |
| The steps `instance` and `token`, for a hold whose holder a renewal changed | Admitted to the new holder, on the old fork. | Refused `capability-refused`, named `holder-changed`: the hold's `epoch` must be 1. The renewal makes the instance `past` and opens the revocation of each live token. | Found in the adversarial reading. A fork moves to another member only by `authorize-export`. Neither pinned lane writes such a renewal. |
| A token that is `minting` when its hold ends | Not stated. | The outcome entry that records its mint's answer opens its revocation. | Stated for the table of entries. It follows from the rule for a credential that a host returned. |
| A license request that is bound and is malformed in another field | Said in one sentence of revision 14, and listed as owed in revision 15. | Decided, with its result, its effect and its capacity in a table. | The contract's point R1-44. |
| The binding of a `withdraw` | Three conditions, in section 12.1.5. | Four rows. Added in words: the message is whole, with no member beside `operation`; and the publication's last duty has not ended. Both were in revision 12's text of section 5.8. | The contract asks for the binding in its own terms. |
| What a save reserves for the attempts of its set | "One outcome for each attempt of its set, at most 8", beside the entry that each attempt's own `intend` reserved. | The same entries, counted once: each attempt's own `intend` reserved its first outcome. | Narrowed. The two sentences counted one entry twice. A runtime may still hold more. |
| What a save reserves for a deletion | Not counted for a save. A deletion was reserved with a retention deadline only. | One deletion for each save of the closure, with at most 3 attempts. | A commit can make its prior `expired` with no deadline entry, and a save that fails leaves bytes with no root. |
| A stop's save, when `cut` or `checkpoint` has no place under its `max` | Opened whenever a registration is `ready`. | Opened only when each type has a place. The stop is applied either way. | An outcome entry cannot be refused, so it must not open an item above a `max`. |
| An `intend` that cannot hold a place in a type that it needs | Not stated. | Refused `type-full`. The `count` guards are owed with the row P11. | The approval names this as owed. |
| The outcome of a `pause`, and the clock | Not stated. | It judges no time and may be written clamped. Its deadline is then later, by the rule of section 3.12. | The contract's second reading of its section 15.9. |
| "In its creation's fields", of a lane's membership reference | Read by the I3 plan as a declared field. | In its creation, set by the creator. No lane definition declares it. | Neither pinned lane has such a field. |
| "An authorized stop is always admitted" | Said in four places. The exception was in one. | The exception is in each. | The approval's first precision. |

Nothing is made wider. No person and no agent may do anything that
revision 16 did not allow. One thing that revision 16 allowed is now
refused: the step `instance` or `token` after a renewal that changed
the holder.

## What remains owed, and to whom

| Owed | Owner |
|---|---|
| The four things that the section "Revision 16" lists first as owed to this note's successor. | Answered here. None stays owed by this note. |
| The form for an observation in an entry that is no act, or beside an act's one grant (P19; the contract's R1-53). The form for bytes beside an intent that are not a text (P21; its R1-54). | The scope contract's revision 14, which is in progress under the request `10e7093d`, with this note |
| One question for P20, whose form is adopted: may the member name a scope ID with no incarnation, or be absent, for a scope that is created in the same entry as its membership scope? Nothing is owed for P23. | The scope contract's revision 14 |
| The repository part of G7: the directory that a fetched entry's scope recorded at its genesis, as a member of the entry's use. Its points R1-38 and R1-39. | The scope contract's next revision |
| The form of a place that is held for an entry which is not yet signed, and of a place in a type under its `max`. The `count` guards that keep a place in `cut`, `checkpoint` and `pin`. | The row P11, under `cc570904`, with IA for the guards |
| The six things of section 12.1.7, "Asked of the recovery design", and the three that revision 16 asked. | The recovery design and IA |
| A bound on the tokens of one hold that may be `live` at once. The other numbers: the 30 and the 9 are derivations, and every bound under them is a proposal. | R4 |
| The fence of section 6.8. | A review that is asked about it by name |
| The I3 plan's question Q10, on a platform option of the validator. This note states its side in section 13.8 and decides nothing. | The scope contract's owner |
| What the contract's revision 13 asks of this note and this revision does not answer: which arguments of a capability guard or effect are required, the key and the value names of each record, and the preparation entry of the kind `hold@1:check`. That revision is adopted, so these are asked. | This note's successor |
| Everything else that the sections "Revision 15" and "Revision 16" list as owed. | As those sections say |

## What the adversarial reading checked

Each new rule was read for three faults. Can the author of a
definition get a workspace, a token or a license that they should not
have, by how they write a row? Can they avoid a reservation? Can an
authorized person be locked out?

- *A workspace by one form.* An author can make the predicate true
  with one capability form, even on a row that can never be
  admitted. Each hold then gets a fork. That gives nobody a token: a
  token is minted only by the step `token`, on the holder's grant,
  observed within ten seconds. The fork is the hold's own, and
  nothing leaves it without `staged`. And no lane exists under the
  definition until a holder of `rules.activate` activates it. The
  cost is one fork for each hold.
- *No workspace by no form.* An author who writes no capability form
  gets the item form. The steps are refused, so no token exists, and
  no reservation of a fork or a token is avoided, because there is
  none to make.
- *A fork handed over by a renewal.* Found in this reading, and
  closed. A renewal row that another member may sign would have
  given that member the old holder's fork, with work that was never
  reported. The condition on `epoch` refuses the steps, and the
  renewal ends the instance and the tokens.
- *A holder locked out.* Under the two pinned lanes the predicate is
  true, and every hold has its fork as before. Under a definition
  with only the item form a holder can stage nothing, which is what
  that definition says. A definition that uses the guard `ancestry`
  of `git-read@1` and no form of `hold@1` can never pass that guard
  on its own records. That is a fault of the definition, it is
  visible in its bytes, and nobody gains by it.
- *Two readers of the predicate.* It reads only the validated
  definition. The same list of forms serves the validator, the
  commit and the replay. A form inside a result clause, or nested in
  `each`, `has` or `anyOf`, counts. A rule text of the profile is no
  capability form.
- *A license by a malformed request.* A bound request that is
  malformed licenses nothing and moves no target. Only the pin's
  task scope can be bound. It can use at most the 2 entries that
  were reserved for its own numbers. If it wastes them, its own
  export is licensed no more. Nobody else's is touched.
- *A reserved entry taken by another lane.* A `withdraw` from a
  scope that does not own the operation is never bound, and neither
  is one that is not whole. Neither sets the mark. So a third party
  cannot use up the entry that a publication holds for its own lane.
- *The owner locked out of its one `withdraw`.* A faulty message from
  the owning lane is not bound, so it leaves the entry for a whole
  one.
- *Not closed: refusals that fill a destination.* A lane may send
  many requests that G refuses as new work. Each is written from the
  free room. A lane of another repository, under a definition named
  `change`, is not kept out today. That is the limit of G7, and its
  owner is unchanged.
- *A lane under bytes that nobody activated.* The signer names a
  digest and supplies no bytes that count. The directory takes the
  bytes from its own repository's rules scope and checks them
  against the digest. The name inside the bytes is the author's
  claim, and `activate` is an admin's act.
- *A creator locked out.* When the rules scope cannot be read, no
  lane is created, and every lane that exists goes on. The first act
  under a digest needs room for the bytes, and is refused
  `scope-full` at a full directory.
- *A reservation avoided in a task.* The task definition is the
  platform's, and no author writes its rows. A worker cannot open a
  save without its room: the `intend` is new work.
- *Not closed: a full task scope after `repair`.* The person's
  decision is reserved and is always admitted. The replacement
  restore is new work, and a scope with no free room refuses it. So
  does a first restore after `abandon`. This is the standing gap of
  a full scope, which R4 owns. A `cancel` is admitted there.
- *A stop with no save.* When `cut` or `checkpoint` has no place, a
  stop is still applied, and its save is not opened. The person
  stops the task. What the instance holds is not saved by that stop.
- *Not closed: the size of the entry that ends a hold.* It changes
  each live token of the hold. This note states no bound on how many
  may be live at once. Each was reserved when it was asked for, so
  the budget bounds them. A static bound is asked of R4.
- *The fence.* Nothing was added. The reading checked that no
  reservation and no row of a definition depends on a fence being
  built.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 17 read" says what was read. Revision 16 was not
  read again in full. Sections 3, 6.2 to 6.7, 7 to 11 and most of
  section 12 were read only by search for the words that changed.
  Long table cells were read in part, as that table says.
- The predicate was checked against the two lane definitions as
  data, by a script that lists forms by row. No validator ran. That
  the validator's own list of capability forms is the same list was
  not checked in source.
- The contract's section 7 was not read again. What this revision
  says of a creator's read at a genesis, and of a decided delivery,
  rests on earlier readings.
- The contract's revision 13 was read in its section 15.3c and in
  the few other places that the opening lists. It was under review
  then and is adopted now. The rest of it was not read, so this note
  may still differ from it somewhere that was not seen. Its revision
  14 was not read. When that revision gives its forms, the table of
  section 13.8 is read again.
- The recovery design's revision 4 was read in its sections 7, 8.1,
  8.2, 10, 12.1, 12.2 and 12.6. That it changes no rule of revision
  2 is its own statement, and the two were not compared line by
  line. The counts of a save and of a restore, the basis of each
  receipt and the rule for a place in a type are this note's, and
  that design has not seen them.
- The number of deletions that one save can cause is taken as one
  for each save. The recovery design is asked to confirm it.
- No adoption act was read. Each sibling's standing is as the
  commission and the approval state it, and for the contract's
  revision 13 as the builder's message for the second commit states
  it. The act that adopted revision 16 of this note is named as the
  contract's review cites it.
- The I3 plan was read in four sections. Its step numbers are cited
  as that commit has them.
- Nothing was run. The scripts that revision 17 ran listed forms in
  two data files and counted rows and lines of the notes.

# Revision 18

Written for the review `545feb91` of revision 17 at `63409e73`, which
requested changes: one finding of priority P2, and three
clarifications that it did not make findings. The base is revision
17. Design only: nothing was run, built, installed or probed.

Revision 18 keeps every rule and every scope of revision 17, with the
changes that the tables below list. It keeps all seven platform
definitions, and the ownership of G1 to G18, U1 to U21 and H1 to H6.
It adds no gate, no timed rule, no second lifecycle and no test
quota. It changes no byte of either pinned lane definition, and no
pinned digest. It adds no section and no witness of its own. The
facts file is unchanged. The sections above are history, and none is
changed.

Counts, each made by a script over the main note, and each as in
revision 17: 70 rows in section 14; 25 rows in section 12.1.8; 14
cases under the task definition; 6 cases under the directory; 24 rows
in the table of pending duties in section 5.8; 74 headings; 7
platform definitions. Three tables are new, and none of them is one
of those: 5 steps that continue the witness of section 5.3, 4 rows of
closures in section 5.7, and 3 rows of what revision 18 read.

## One row for each thing that the review asks

| The review asks | The change | Where |
|---|---|---|
| P2. Revoke a pending mint after a renewal that changes the holder. Carry the obligation of a hold's end into that renewal. Keep the mint unknown until its own answer, then derive the revocation by the returned ID from the duty that is already reserved. Define the shared late-answer transition for the commit and for replay. Do not settle, repeat or transfer the unknown operation at the renewal. Put the late confirmation in the existing lifecycle witness. | One rule, stated once. A token's use has ended when its hold is `ended`, or the hold's `epoch` is above 1, or the instance that its request named is `past`. The entry that ends the use does nothing to a token that is `minting`. The entry that records the mint's own `confirmed` answer then records the ID and the end time, makes the token `revoking` straight from `minting`, and opens the revocation with attempt 1. The token is never `live`, and its plaintext goes to no gateway. The code is the capability's, in the commit and in a replay. The room is the token's own row of section 5.8, made by the step that opened the mint. The witness "A renewal keeps the token" has a rule 6 and steps 5 to 9, with the other order, three variants and a control. | Section 5.7: one cell of the `token` record, two rows of the table of entries, and the point "A mint that is answered after its use has ended". Section 5.3: rule 6 and the continued witness. Section 5.8: the row for a `token`. Section 14: one row. |
| The same finding, for every other way that an instance closes. | A table of four kinds of closure against a mint, a fork's creation, the read of a head, and a revocation or a deletion. Three more gaps were found and closed: a mint whose instance was replaced by a new one; a `created` answer after a renewal that changed the holder; and the read of a head that is answered after the hold closed. A closure in the task scope has a stated reason: the lane writes no entry at it. | Section 5.7: "The same line for a fork", and the table of closures. |
| Not a finding. A stop opens its save only with places for the whole remaining closure, 3 `cut` and 1 `checkpoint`, or with those places already held. The wording "one free place" must not override the whole-closure rule. | The sentence is rewritten to say exactly that. | Section 12.1.7: the point "A place in a type". |
| Not a finding. Keep the statement that a stop without a save does not save transient work, and keep the stopped-but-unsaved distinction visible. | The statement of the section "Revision 17", above, stands. A new point says what such a stop leaves: the last good checkpoint, the unsaved work and each unknown duty in the custody that they had, and no completion and no cleanup. The recovery design's revision 5, under the request `d33a258e`, is named as in progress. | Section 12.1.7: "A stop that opens no save". The opening: the row for C2. |
| Not a finding. The counts of 30 and 9 stay symbolic and conditional, with the question of one deletion operation for each save or root. | Each place that states them says so. | Section 12.1.7: "Both counts are conditional", and case n. Section 5.8: two rows. Section 13.8: the index row 2d, and one new point of what stays open. |
| The head news that the review cites. A scope's budget alone does not bound the fan-out of one end or expiry entry. | Stated, with its owners: R4 and the capacity follow-through bound and count every token record and revocation of one entry, before an entry that cannot be refused is built. | Section 5.7: "The fan-out of one entry is not bounded by the budget". Section 13.8: one point. |

## Each statement of a sibling's standing that changed

| Where | Revision 17 said | Revision 18 says |
|---|---|---|
| The opening: the status, and the row for R3 | Revision 17 is this text, proposed. | Revision 17 at `63409e73` was reviewed (`545feb91`) and not adopted. Revision 18 is this text, proposed. |
| The opening: the row for C2 | Revision 4 is adopted. | The same. Added: its revision 5 is being written under the request `d33a258e`. It is in progress and was not read. |
| The opening: one new part | Not present. | The table "What revision 18 read". |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 17 | Revision 18 | Why |
|---|---|---|---|
| A mint that is `confirmed` after a renewal that changed the holder | The token became `live`, and its plaintext went to its instance's gateway. No entry revoked it before the hold's end. | The token becomes `revoking` in that entry, and its plaintext is dropped. | The review's finding. |
| A mint that is `confirmed` after its instance was replaced by a new instance of the same hold | The token became `live`. | The same as the row above. | Found in the adversarial reading. Narrowed: the holder asks for a token for the new instance by a new request. A token that was already `live` is not touched, as before. |
| A mint that is `confirmed` after its hold ended | Its revocation was opened by that outcome entry. Which state the token took was not said. | `revoking`, and never `live`. | Stated exactly, as part of the one rule. |
| When a mint's plaintext is given to a gateway | From the mint's answer to the gateway of the instance that the request names. | Only after the outcome entry is sealed, and only when that entry made the token `live`. | So that a token that is revoked at once is never usable. |
| A fork's creation that is answered `created` after a renewal that changed the holder | It selected the fork, because the hold was `held`. | It selects nothing. That fork is deleted by its own ID. | Found in the adversarial reading. The workspace of that hold is closed. |
| The read of a destination's head for a seed, answered after the hold ended or its holder changed | It opened the fork's creation. | It opens none. The `fork` record is `failed`, named `hold-closed`. | Found in the adversarial reading. One refusal name is new. |
| When a stop opens its save | When `cut` and `checkpoint` each have a place. | Only with places for the whole remaining closure, 3 and 1, or with those places already held. | The review's first clarification. Narrowed: one free place of each is not enough. |
| The counts 30 and 9 | Stated as derivations. | Stated as conditional on the recovery design's grouping, at each place. | The review's third clarification. |

Nothing is made wider. No person and no agent may do anything that
revision 17 did not allow.

## What remains owed, and to whom

| Owed | Owner |
|---|---|
| A bound on the tokens of one hold that may be `live` or `minting` at once, and an account of every `record` effect and revocation that one end, expiry or holder-changing renewal can hold, against the bound on one entry. Before an entry that cannot be refused is built. | R4 and the capacity follow-through `cc570904` |
| Confirmation of the grouping under the counts 30 and 9. Its side of a stop that opens no save: what the instance may still do with unsaved work. | The recovery design, in its revision 5 under `d33a258e`, and IA |
| The order in the driver: a mint's plaintext is given to a gateway only after the outcome entry is sealed and shows `live`. | I3, in the driver of its step 19 |
| The words of the page for "stopped" beside "stopped and saved". | R2 and I5 |
| Everything that the section "Revision 17" lists as owed. | As that section says |

## What the adversarial reading checked

The reading took every way that an instance closes, and set it
against every operation that can be pending at that moment: a mint, a
fork's creation, the read of a head, a revocation and a deletion.
Section 5.7 has the table. This is what was found.

- *A hold's end, by release, by expiry or with what it is under.* A
  pending mint had its rule in revision 17. A pending creation had
  its rule in section 5.1. A pending read of a head had none: its
  outcome would have opened a creation for a hold that had ended.
  Closed.
- *A renewal that changes the holder.* A pending mint is the
  review's finding. Closed. A pending creation would have selected a
  fork for a hold whose workspace is closed. Closed. A pending read
  of a head: closed with the row above.
- *A new instance of the same hold.* A pending mint that named the
  earlier instance became `live`, with a route to an instance that
  was `past`. Closed, and narrowed. A token that is already `live`
  keeps the rule of section 5.3: it is revoked when a second token
  replaces it, or at the hold's end. That was read again and is not
  changed.
- *A closure in the task scope: a fence, an abandonment, a cancel, a
  pause, the runtime's own fence.* The lane is sent nothing and
  writes no entry, so no rule of the lane can be derived at it. A
  mint that is answered then makes a `live` token whose route the
  runtime has closed. Its revocation is owed at the hold's end, which
  is reserved and cannot be refused. Not changed, with that reason.
- *A revocation or a deletion that is pending at any closure.* Each
  keeps its own attempts and its own answer. No closure settles one,
  and none opens a second for the same token or fork.
- *The same token revoked twice.* The entry that ends a use opens a
  revocation only for a token that is `live`. The late answer opens
  one only for a token that is `minting`. A token is in one state,
  so it gets one revocation operation.
- *Room for the late entry.* The token's row of section 5.8 is made
  by the step that opens the mint, and it holds while the token is
  `minting`. So the late answer and the revocation never need free
  room, at a full lane too.
- *A mint that is never answered.* The token stays `minting` and its
  duty stays. No ID is known, so nothing can be revoked, and rule 4
  of section 5.4 cannot end it. That is the standing rule for an
  unknown mint, and it is not changed.
- *An author's row.* A definition's author cannot keep a token
  alive by the order of a renewal and a mint: both orders end in
  `revoking`. An author cannot get the first holder's token for the
  second: the mint is not transferred, and the steps are refused at
  epoch 2.
- *A holder locked out.* After a new instance, the same holder asks
  for a token again, and the step is admitted at epoch 1. After a
  renewal that changed the holder, the new holder takes a new hold,
  as revision 17 says.
- *Not closed.* How many tokens one entry may change. It is owed, as
  the table above says.
- *A stop without a save.* The rewritten sentence was read against
  the table of a save and the room of a stop. A stop's standing room
  holds the whole closure, so a stop on that room opens its save. A
  `pause` that is new work, in a task that is `idle` or `paused`,
  may find fewer places, and is then applied with no save.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 18 read" says what was read. Sections 5.1, 5.2 and
  5.4 were not read again. What this revision says of a fork's
  selection, of the runtime's fence and of rule 4 rests on revision
  17's reading of them.
- The head news `9c170f78` was not read. Its content is as the
  review gives it.
- The recovery design's revision 5 is in progress and was not read.
  The point on a stop that opens no save is this note's side only.
- That a fork-read token's request names an instance is taken from
  the table of staging sources in section 6.2, which was read in
  revision 17 by search only.
- The contract was not read again. That a late answer is one more
  outcome entry after an `unknown` is as its section 4.3 was read by
  earlier revisions.
- Nothing was run. The script that revision 18 ran counted rows and
  lines of the notes.

# Revision 19

Written for the planner's request `837943bb`, on the adopted revision
18 at `99bc48e8`. The contract's revision 14, at `fa6417e6`, is
adopted. The recovery design's revision 5, at `c254e207`, is proposed
and under review. Its requests are read as requests. Its review is
independent, and its verdict is to be folded in when it exists.
Design only: nothing was run, built, installed or probed.

Revision 19 keeps every rule and every scope of revision 18, with the
changes that the tables below list. It keeps all seven platform
definitions, and the ownership of G1 to G18, U1 to U21 and H1 to H6.
It keeps the three connected stories of R0, and every acceptance
obligation at a real provider, browser and device. IA keeps the task
runtime. It adds no gate, no timed rule, no suite and no test quota.
It changes no byte of either pinned lane definition, and no pinned
digest. It adds one section to the main note, 13.9, which is the
index. The facts file is unchanged. The sections above are history,
and none is changed.

Counts, each made by a script over the main note: 76 rows in section
14, where revision 18 had 70; 25 rows in section 12.1.8, as before;
16 cases under the task definition, a to p, where revision 18 had
14; 6 cases under the directory, as before; 28 rows in the table of
pending duties in section 5.8, where revision 18 had 24; 75
headings, where revision 18 had 74; 22 rows in the task definition's
table of entries, where revision 18 had 19; 9 item types in the task
definition and 7 platform definitions, as before.

## One row for each thing that the request asks

| The request asks | The change | Where |
|---|---|---|
| R1-55: the members and the content of each kind of observation. | `Observation` is unchanged. `MemberObservation` is the contract's proposal with one member added, `activeKey`. `RulesObservation.content` is typed: one of two fixed records, by what was asked. | Section 3.3, "The three kinds of observation". |
| The subject of an observation, and the bound sizes. | One scope in one incarnation, with the key, the member, or nothing more for the rules. Each kind is a fixed record. `content` is under 16 KiB by the rules definition's own types, and stays inside the entry. | The same. |
| The rule that heads do not go back, across runs. | The contract's guard stands, and this note's rule G10 yields to it in the one case where the two differ. The cost is one read. It also refuses one act that G10 admitted while membership cannot be reached. One thing is asked of the contract: that a key's observation is also of its member. | Section 3.3, "The order of heads, and G10", with a case. |
| The identity of the entry that records `dispatched`. | One entry: the delivery of the license result. The table of section 4.2 had two, and is corrected. | Section 4.2, "Which entry records `dispatched`". |
| The actual windows, against the common forms. | One table: for each entry, the kind, the place, the window, the use and the most in one entry. `publish` and `open-task` had no stated window. 80 seconds is named as no window of an observation. An outcome holds its observations in `observed`, and not in its evidence. | Section 3.3, the table of nine rows. Section 13.8, two cells. |
| The four seams of R1-56, with the recovery design and I3. | One table: this note's side, what the recovery design's revision 5 says, and who decides. None stops a step of I3. | Section 13.9. |
| The recovery design's revision 5, B1 to B10, each reconciled against adopted revision 18. | One table of ten answers. Eight change a row. B9 changes none and names two owners. | Section 12.1.7, "The recovery design's ten asks". |
| A coherent authorized path that saves and does nothing else, with its whole reserved closure, also when the three saves are used up. | The act `save`. In a stopped task a person signs it. It opens one save and no tool. The task holds the room of one such act while it is stopped. | Section 12.1.7: the row `save`, the block, case o. Section 5.8. |
| Retention and cost, and the final destruction as a decision. A host that is lost before its cut is durable. | No stop ends a host. A host ends after a save that was cut after the stop, or by a person's `end-host`, which says whether work is unsaved. `hostEnds` is a visible end time, and `extend-host` moves it by a signature. Who pays is stated. A lost host makes nothing saved, and what is shown and recoverable is listed. | Section 12.1.7: the rows `end-host` and `extend-host`, "A host that is kept", case p. Section 4.3, two rows. |
| The whole closure, with the common capacity owner. | Four rows of new duties in the five dimensions. A statement that the sums prove no bound for a whole path, with the four things that are missing and their owner. | Section 5.8. |

## Each statement of a sibling's standing that changed

| Where | Revision 18 said | Revision 19 says |
|---|---|---|
| The opening: the status, and the row for R3 | Revision 18 is this text, proposed. | Revision 18 at `99bc48e8` was approved (`ff495a98`) and is adopted. Revision 19 is this text, proposed. |
| The opening: the row for R1. Section 12.1.8. Section 13.8, two cells. | Revision 13 is adopted, and its revision 14 is in progress. P19 and the bytes of P21 are open. | Revision 14 at `fa6417e6` is adopted. P19 and the bytes of P21 have an adopted form. |
| The opening: the row for C2. Section 12.1.7. | Its revision 5 is in progress and was not read. | Its revision 5 at `c254e207` is proposed and under review. It answers the six asks and asks ten back. |
| The opening: one new part | Not present. | The table "What revision 19 read". |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 18 | Revision 19 | Why |
|---|---|---|---|
| A held observation of a key, after an entry retained a later read of that key at a higher head | Used for the next ordinary act, inside its window. | Discarded and read again. | The contract's order of heads. Stricter. |
| Where the outcome of `judge` holds its observations | In its evidence. | In `observed`. | The adopted form. |
| The window of the members that `publish` and `open-task` observe | Not stated. | 300 seconds, as the act's own grant. | The contract asks. |
| The entries of an export's dispatch in the task scope | Two in section 4.2, one in section 12.1.7. | One. | The contract asks. |
| A `pin` for an interrupted operation | For every class that is not read-only. | Not for an operation that is confined to the root. | B6. Narrowed. |
| The outcome `unknown`, basis `none` | For an attempt whose instance was replaced. | Also for one whose instance was `fenced`, once no save of it is open. | B5. |
| A `refused` cut of a save | Not said to count. | It is one of the 3, and opens the next. | B4. |
| The basis `read` of a save's outcome | "The stored head was read back". | Every value, and the head last. | B7. |
| What `retry` may open | A deletion, a host's destruction or a push whose attempts are used. | Also a new deletion after a confirmed one, on the runtime's report that a key is present again. | B8. |
| A `kept` checkpoint with no deadline | It kept its bytes without end. | `abandon`, and the release of its last pin, set one. | B10. |
| When a task is `ended` | When no operation is unsettled. | Also only when its registration is `stale` or absent, or its host's destruction is `confirmed`. | So that a cancelled task with a live host is not closed over it. Stricter. |
| When a stop's host ends | "Compute stops", with no entry for the host. | By the commit of a save that was cut after the stop, or by `end-host`. | B3. |
| Whether a stop's room holds the places of its save | "Or when the stop's room already holds those places". | It holds them. | B1. |

Three things are new that a person may do, each under the grant
`task.control` that the same people already hold: `save` in a
stopped task, `end-host` and `extend-host`. One thing is new for a
worker: `save` in a task that runs, under `task.operate`. It starts
no tool.

## What is asked back

| Asked | Of |
|---|---|
| To take `activeKey` in `MemberObservation`, the type of `content`, and the windows of `publish` and `open-task`. That an `Observation` is also of its `member` for the order of heads. Confirmation of the first three seams of R1-56. | The scope contract's next revision |
| To take `save`, `end-host` and `extend-host` in its section 7.6. What a host costs for each day, and the longest that the provider keeps one. Confirmation of the 7 entries for a `kept` checkpoint, and of one operation for a host's destruction. The names of the reasons outside the five, and the order among the five. Whether a cut may name more than 8 attempts. | The recovery design, at or after its review, with IA |
| The composition of the whole path in five dimensions, with each standing room and each place counted once. Whether the restore's own destruction and the registration's are one reservation. | The common capacity work under `cc570904`, with R4 |
| Whether an installation may end an overdue host by a rule of its own. | The planner, with N5 |
| Everything that the sections "Revision 17" and "Revision 18" list as owed and that this section does not close. | As those sections say |

## What the adversarial reading checked

- *Can `save` run a tool?* No. It opens the two operations of a save
  and no operation of the worker. No `intend` is admitted by it, and
  in a stopped task none is admitted at all. Its outcomes need no
  key, so it gives no key a use.
- *Can `save` extend a hold?* No. It reads no lane and writes none.
  A hold ends at its time whatever the task scope saves. A
  checkpoint that is made after the hold's end is private.
- *Can a partial save pass as a save?* No rule of a save changes.
  The commit's guards are the same eight. A cut that was not stored
  whole does not commit in any part.
- *Can an agent sign what only a person may?* In a stopped task,
  `save`, `end-host` and `extend-host` need `task.control`, which
  the role `agent` does not hold. In a task that runs, an agent may
  sign `save`, and it only saves. An agent cannot sign
  `decide-recovery`, as before.
- *Can a host be destroyed with no signed decision while work is
  unsaved?* Not by a rule of this note, in a stopped task: no stop,
  no timed rule and no outcome opens it, apart from the commit of a
  save that leaves nothing unsaved. Two things remain, and both are
  stated. The provider may end a host by its own event, which is no
  decision and saves nothing. And in a task that runs, the worker's
  signed `register` and `intend` replace an instance, and that
  restore destroys the old host. That is the adopted path after a
  host is lost. It is signed by the worker, which may be an agent.
  It is not changed here.
- *Can a cancelled task keep a host without bound, or with nobody
  paying or deciding?* Each day inside `hostEnds` has a signer, and
  the operator pays. Past `hostEnds` nothing destroys the host. So a
  host can stay, overdue and shown, until a person signs or the
  provider ends it. Not closed, by choice: the other rule would
  destroy unsaved work with no decision. The owner of that choice is
  named.
- *Is a trusted claim shown as derived?* Five were read for it.
  `unsaved` is derived from the records, and says nothing of what
  the root holds. The basis `read` is the runtime's evidence, and
  the row says that it makes nothing derived. The report that a key
  is present again, the reason of a `refused` restore, and that an
  operation is confined to the root are each labelled trusted.
- *A person locked out.* One `save` and one `end-host` are reserved,
  so both are admitted at a full scope. A second `save`, an
  `extend-host` and a `retry` are new work and may be refused
  `scope-full`. A `fenced` instance cannot be saved by anyone, and
  only `end-host` follows.
- *The order of heads.* It refuses one act that G10 admitted: an
  ordinary act on a held observation, after a ten-second commit,
  while membership cannot be reached. That is the stricter side, and
  it is stated. It admits nothing new.
- *A member removed, and a key of that member.* The contract's guard
  does not relate them. G10 does, in the runtime. A replay cannot
  check it. Asked of the contract.
- *One entry for `dispatched`.* With no observation the entry is
  still written, and dispatches nothing. So a membership that cannot
  be reached delays a release and never licenses one.
- *Two reservations for one destruction.* A restore reserves the old
  host's destruction, and from this revision so does the old
  registration. That is more than is needed and never less. Left to
  the composition.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 19 read" says what was read.
- The contract's revision 14 was read in its sections 16.1 and
  15.3d, and in two rows and one decision. Its sections on `values`
  were not read. What this revision says of the bytes of P21 is as
  its section 15.3d describes them.
- The recovery design's revision 5 was read in its sections 7.6,
  8.2, 12.1 and 12.9, and its table 14.8. Its sections 10 and 13,
  which its answers cite, were not read. It is proposed. It reads
  this note at revisions 16 and 17, and not at 18.
- The three new acts and the value `hostEnds` were written and
  checked by reading. No validator and no source read them. The
  count guards and the form of a standing room are still owed.
- The 24 hours and the 16 KiB are proposals with no measurement.
  The 16 KiB was estimated from the declared maxima, and was not
  computed by a script.
- No adoption act and no verdict was read.
- Nothing was run. The script that revision 19 ran counted rows and
  lines of the notes.

# Revision 20

The successor of the adopted revision 18 at `99bc48e8`. Revision 19,
at `c3f2f103`, was reviewed, and the verdict `d2068c05` requested
changes. It is not adopted. Revision 20 holds revision 19's content
with the repairs that the verdict asks. The contract's revision 14,
at `fa6417e6`, is adopted. Its revision 15 is written with this one.
The recovery design's revision 6, at `e354a24c`, is approved and
adopted, as the verdict cites the planner's acts `f30903d3` and
`b0625ccf`. Design only: nothing was run, built, installed or
probed.

Revision 20 was written in two parts, each one commit. The sections
from here to "Limits of this revision" are the first part. "The
second part" follows them: the verdict, and the I3 deltas ED1 to
ED17. The first part does two things. It states how the code of a platform
definition joins the data of its row, for the question that stops
the I3 source (its deltas note, entry EC6). And it carries the
planner's answer on an overdue host into `end-host`. It keeps every
rule and every scope of revision 19 otherwise. It keeps all seven
platform definitions, and the ownership of G1 to G18, U1 to U21 and
H1 to H6. It adds no gate, no timed rule, no suite and no test
quota. It changes no byte of either pinned lane definition, and no
pinned digest. It adds one section to the main note, 13.10, which is
the index. The facts file is unchanged. The sections above are
history, and none is changed.

Counts, each made by a script over the main note, after both parts:
82 rows in section 14, where revision 19 had 76; 25 rows in section
12.1.8's table of forms, as before; 57 rows in the new table of
cells, and 10 in the table of further marks; 19 cases under the task
definition, a to s, where revision 19 had 16; 76 headings, where
revision 19 had 75; 22 rows in the task definition's table of
entries, as before; 7 platform definitions, as before; 9 rows in the
index of section 13.10.

## One row for each thing that is asked

| Asked | The change | Where |
|---|---|---|
| Whether a rule replaces the guard or the effect that its cell marks, is added after the row, or replaces the whole row (EC6, question 1) | None of the three, exactly. A rule is one form of its row, at a place. It replaces no written form. | Section 12.1, "Platform code: marks and rules" |
| What the data holds at a marked place (EC6, question 2) | A mark, `{ code, row }`, and no data form. The validator derives nothing there, and the judge runs the rule. | The same |
| Where a rule runs, and in what order (EC6, questions 3 and 4) | At the check of its place, in the contract's order of checks, and inside a written list at its position. The rule at `grant` stands in place of the grant check. | The same, with the table of seven places. The contract's revision 15, sections 4.2 and 6.1. |
| How a definition marks a place | In its data, at the place. The data of a platform definition gains `outcomes` and the marks. No table beside the data. | Section 12.1, "The canonical form" and the passage |
| Every "Code" cell of the seven definitions, as a table | 57 rows, one for each cell: 53 with a mark and 4 with none. Seven further marks that no cell names. Counts by place and by key. | Section 12.1.8 |
| Any cell that the decision shows to be inexact | Three are corrected: the inbox's `source`, `join` and `enrol`. Three more things are stated as owed. | Sections 12.1.3 and 12.1.6; section 12.1.8, "Where the rule did not fit a cell as it was written" |
| The form of a notice's `source` (the I3 deltas note, entry E10) | A record of four values whose type is data. Not typed by code, and no fact reference. A rule's effect sets it. | Section 12.1.6 |
| Who may send an act that no grant judges, and what the rule checks | One table: the authority of each of the ten cells of P13 | Section 12.1, "The acts that no grant judges" |
| The planner's answer on an overdue host, applied exactly | `end-host` may name an installation's rule. The signer, what the act names, the notice window, the retention period and what "saved state" means when work was unsaved are each stated. | Section 12.1.7: two cells of the row `end-host`, and one more; "An overdue host, ended by rule"; case q |

## Each statement of a sibling's standing that changed

| Where | Revision 19 said | Revision 20 says |
|---|---|---|
| The opening: the first line, the status, and one new passage | Revision 19 is this text, proposed. | Revision 19 was reviewed (`d2068c05`), and changes were requested. Revision 20 answers it, as the successor of the adopted revision 18. Nothing of it is in force. |
| The opening: one new part | Not present. | The table "What revision 20 read". |
| Section 12.1 | A platform definition's data is a `DeclaredDefinition`. | It is the `PlatformData` of the contract's revision 15, a draft. |
| Section 13.9, one point | Whether an installation may end an overdue host by rule is open, with the planner and N5. | The planner answered. Revision 20 carries the answer. |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 19 | Revision 20 | Why |
|---|---|---|---|
| How a cell that begins "Code" joins its row | Not stated. The rule "is specified by the table that uses it". | A mark in the data at one of seven places, with a rule that is run at that place. | EC6. Stated. |
| A version of a platform definition of which a runtime lacks one rule | Not stated here. | It runs nothing: no scope is founded under it, and one that exists admits nothing. | The builder's decision EC4, which the planner confirmed. |
| The effect on a notice's `source` | The envelope's source fact. | A rule's effect, which gives the record of four values. | A fact reference is no value of the slot's type. |
| How a `join` finds its invitation | As an item that the act names, with written guards on it and a written guard on a field `key`. | By a mark of `also`, with the rule at `grant` for checks 5 and 6 of section 3.6. | So that an unknown ID and a wrong secret get one answer, as section 3.6 requires. Stricter. |
| The recovery key's acts | "When no admin can act". | The rule checks the key alone, and the condition is stated as one that no record shows. | Stated. Not narrowed. |
| An overdue host | Nothing ends it but a person's `end-host`, at any time. Whether an installation may set a rule: open. | The same, and one way more: an `end-host` that names an installation's rule, signed by the installation's controller, admitted only after the notice window, with the saved state kept for the retention period. | The planner's answer. |
| The checkpoint of a task whose host a rule ended | Its `expires` is as a pause or an abandonment set it. | It is no earlier than the entry's time plus the retention period. | The planner's answer. |

Nothing new may be done by a role that could not do it before. An
admin could already sign `end-host` at any time while a task is
stopped. An `end-host` that names a rule is admitted later than that,
never earlier, and it promises more: the retention.

## What is asked back

| Asked | Of |
|---|---|
| The adoption of the contract's revision 15. The name of a refusal at `grant` (its point R1-57). The most that one rule returns (R1-59). Whether a platform version is also named by a digest (R1-60). | The scope contract and its review; the planner, for the last |
| The rule and the name of the guard "except by the recovery key". A name for each of three guards. Whether "when no admin can act" is a condition that a record can show. | This note's next revision, with the planner |
| The numbers of the notice window and of the retention period | R4, with IA |
| Where an installation states its rules. Whether its controller is a role of its own. Any tighter bound. | N5, with the second planner |
| Two forms for the row `end-host`, or a second time slot | IA, with the recovery design |
| The I3 deltas E3, E4, E6, E11 and E12, and the entries after EC6 | This note's next revision |
| Everything that the section "Revision 19" lists as asked back and that this section does not close | As that section says |

## What the adversarial reading checked

- *Can a platform rule write an entry form that the contract lacks?*
  No. A rule returns effects and requests in the contract's forms,
  and of the effects only eight members: `open`, `state`, `party`,
  `list`, `ref`, `value`, `operation` and `attempt`. Every row of
  the table of 57 was read for it. The widest are the outcome of a
  stop, which gives one `state` effect for each queued control, and
  `index-row`. Each is a list of ordinary effects. No row needs a
  member of an entry that does not exist. What is not closed: the
  outcome of a stop may give up to 62 effects, more than a written
  row may hold. That is the contract's point R1-59.
- *Can a rule read anything that its entry does not retain?* Each
  row's column "It reads" was checked against the contract's list.
  Every observation is read from `observed` or from the grant. The
  bytes of a definition and of a configuration are values beside the
  intent, which the entry retains. `compromised` reads an earlier
  entry of its own history, which the contract's section 16.1
  allows. `index-row` reads the delivery's `from`. One row reads the
  clock, `dispatch`, and its entry judges time. No row reads a
  detached text's bytes, the provider, the operator's record or
  another scope's present state. One thing was found and stated:
  `definition-bytes` validates, and so reads the judge's bounds,
  which a replay is given as configuration.
- *Can a declared definition reach a mark?* No. The validator
  refuses each mark without its platform option, and no input
  reaches the option. Neither lane definition holds one, and no
  pinned digest changes. A lane reaches a platform rule only by
  sending a request that the platform definition's own handler
  receives: `reserve`, `withdraw`, `rules-wanted`, `index` and
  `notify`.
- *Does any row behave differently from its published data, without
  the data saying so?* Each of the 57 cells was asked this. 53 hold
  a mark, so the data says it. Four hold none, and each derives
  nothing of an entry: rows 1, 23, 39 and 43. Three cells were
  found where the data, as written, said one thing and the rule had
  to do another: the inbox's effect on `source`, and the invitation
  of a `join` and of an `enrol`. Each is corrected. One guard was
  found that no cell marks, "except by the recovery key", and it is
  stated as owed. The outcome entries have no row in the data, and
  `outcomes` now names each kind. What is not closed: the data of a
  platform definition has no digest, so "published" means this text
  and the data value of the version.
- *Is the stand-in for the grant check a way to act with no
  authority at all?* Any key may send such an act. The table "The
  acts that no grant judges" gives, for each of the ten cells, the
  authority that the rule checks, and each is in the scope's own
  history: the seed's cause, the founding policy, the founding key,
  the invitation's hash, the recovery key. None passes a key on
  nothing. A pass leaves `authority: []`, and a replay runs the same
  rule. Two things are not closed. Who may sign an `install` is
  N5's, and the rule checks only that the intent is the seed's
  cause. And "when no admin can act" is not checked, because no
  record shows it: the recovery key can invite, remove and revoke
  while admins can act. That was so in revision 18. It is now
  stated.
- *Can a clock destroy a host?* No. No timed rule is added. The rule
  of an installation is applied only by a signed `end-host`. The
  clock is read by one guard, which admits the act later and never
  earlier.
- *Can a rule end a host that is being saved, or hide unsaved work?*
  No. Every guard of `end-host` holds with a rule: no save is open,
  and `unsaved` must equal the records. The entry names the rule.
- *Can the holder be shut out of the notice window?* A `save` has
  its reserved room while the task is stopped. An `extend-host` is
  new work and may be refused `scope-full`, as revision 19 says. So
  at a full scope the holder can save and cannot extend. Not closed,
  and stated: it is the composition that revision 19 leaves to the
  capacity work.
- *Can a rule be named that the installation never set?* Yes, by an
  admin. The name is a trusted claim. The act is still an admin's
  signed `end-host`, which an admin could sign with no rule. So the
  claim gives no power. It gives a false reason, which the history
  shows with its signer. Where an installation states its rules is
  asked of N5.
- *Does "retained" promise more than exists?* The retention is of
  the last committed checkpoint. With none, nothing is kept, and the
  entry shows `unsaved: true` and no checkpoint.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 20 read" says what was read.
- Revision 19 was not adopted. Its content stands here as proposed
  text, with the repairs of the second part.
- The contract's revision 15 is a draft by the same author. The two
  were written together, and neither was reviewed.
- Section 12.1.7 was read in its 18 cells that begin "Code", in the
  rows of revision 19 and in "A host that is kept". Its other rows
  and blocks were not read again. The rows 40 to 57 of the new table
  rest on that reading, and they are IA's to build.
- The names of the rules are proposals. No validator and no source
  read the marks. The table was checked by reading each cell in its
  row, after a script found the lines.
- Three guards had no refusal name, and one guard had no cell. The
  second part names each, as a proposal.
- The planner's answer was read as the builder gave it. Its act was
  not read. "The installation's controller" is read as an admin
  under `task.control`, and that reading is asked of N5.
- No number is proposed for the notice window or for the retention
  period.
- The I3 source was read at `5e5583e7`, and not run. Its deltas note
  gained entries after that commit, which were not read.
- Nothing was run. The script that revision 20 ran found lines that
  hold a word, and counted rows and headings of the notes.

## The second part: the verdict `d2068c05`, and the I3 deltas ED1 to ED17

### One row for each thing that is asked

| Asked | The change | Where |
|---|---|---|
| The verdict's first finding: a narrowly authorized preservation of the current fenced unsaved root | `save` has a field `fenced`. With `fenced: true` a person, and never the worker, saves the whole root of the fenced registration. The registration stays `fenced`. The commit's guards are kept, with `fenced` beside `ready` for this one case. The cut names no attempt, so it settles nothing and releases no pin. | Section 12.1.7: two cells of the row `save` and of the commit's row; "A save of a fenced root"; case r |
| The same finding: the claims "always admitted" | Replaced by the conditions. Eight states are listed, six of them with work that nobody can save, each with what would close it. | Section 12.1.7: "How many, and what bounds them", "In which states", "Where nothing can save" |
| The second finding: a historical cut is no proof that destruction loses nothing | A cut has a member `final`. A commit fences and destroys only on a final cut. The freeze is held, and the destruction names its cut. `unsaved` is derived from a final cut only. Where no final cut can be established, custody stays. | Section 12.1.7: the item `cut`; the commit's row; "When a task is stopped and not saved"; "The final cut"; case s |
| The same: align the supervisor duties, as asks | Three asks of the recovery design and one of IA. None is decided for them. Until they answer, no cut is final. | "The final cut", its last point; section 13.10 |
| A cross-reference where `ended` has the shorter wording | Added. | The row "The outcome of any other operation" |
| The size of `content` | The claim "under 16 KiB" is withdrawn. A script counts 16,621 and 21,421 bytes for the verdict's case, as the verdict does, and 48,813 and 53,613 bytes for the largest value by the types. No guard enforces a bound. | Section 3.3, "The size of `content`, counted" |
| Three cancel, three pause and three operation cuts against 8, with the standing save | Stated as unproved, with the open choices and the owners. No source may promise an operation that cannot be refused. | Section 5.8 |
| B12 of the recovery design's revision 6 | Answered: under revision 19 a pause could set a deadline on a pinned checkpoint. No entry now sets `expires` while a pin stands. | Section 12.1.7: the outcome of a stop; the table of B11 and B12 |
| The planner's answer, kept apart from the custody repairs | One sentence in the opening. The rule's text is unchanged, apart from the deadline of a pinned checkpoint. | The opening; "An overdue host, ended by rule" |
| ED2: what `within` is | The scopes of one repository: `{ membership }`. A scope recognises itself by its own recorded reference. The request is `{ of, key }`. The task conditions of the role table are row guards. | Section 3.3, "What the I3 source asks of this section" |
| ED4, ED3: the windows | Four rows for what the table of nine left out, and a rule by form for a ten-second kind of a declared definition. | The same |
| ED1, ED5 to ED17 | One line each: decided, confirmed, the contract's, or the builder's. | The same |
| Three refusal names, and the guard "except by the recovery key" | Named, as proposals. Three further marks: rows h, i and j. | Section 12.1.8 |

### Rules that the second part makes narrower or stricter, or states more exactly

| Rule | Revision 19, or the first part | The second part | Why |
|---|---|---|---|
| Who may save a fenced instance | Nobody. | A person, by `save` with `fenced: true`. | The verdict's first finding. Wider, for a person only. |
| When a commit ends a host | When its cut was opened after the stop. | Only when its cut is also final. | The second finding. Stricter. |
| "Stopped and not saved" | No checkpoint from a cut after the stop. | No checkpoint from a final cut after the stop, or a destruction for that cut was refused. | The same. Stricter. |
| A background job in a stopped task | Thawed after the cut is read, by the recovery design. | Asked: left frozen until a resume or the destruction. | The same. Asked, and not decided. |
| A deadline on a pinned checkpoint | A later pause could set one. | No entry sets one while a pin stands. | B12. Stricter. |
| The size of a rules observation's `content` | "Under 16 KiB." | Up to 48,813 bytes by the types. | The verdict. Corrected. |
| `within` | "This repository, or one task." | The repository, as the membership scope. A task's condition is a row guard. | ED2. Stated. |
| A ten-second kind in a lane | Three named acts and the steps. | By form: a `hold` effect that opens or renews, or the grant `work.export` or `change.check`. | ED3. One act is added that section 3.11 already put there. |
| A window for an act that the table does not name | Not stated. | 300 seconds, or 60 in a task scope. Membership judges its own acts on its own head. | ED4. |

### What the adversarial reading of the two custody repairs checked

- *Can the save of a fenced root be used to write?* No. The
  supervisor reads the root and stores bytes in checkpoint storage.
  No operation of the worker is opened. The registration stays
  `fenced`, so no `intend` is admitted, before, during or after.
- *To run a tool?* No. A tool is an operation of the worker, and
  `save` opens none. The signer is a person, and the act carries no
  command. The cut freezes or ends every process and thaws none.
- *To extend a hold?* No. The save reads no lane and writes none. A
  hold that ended stays ended, and the checkpoint is private.
- *To publish or export?* No. A push needs an `intend` on a `ready`
  registration. An export needs `start-export`, with `work.export`
  and the lane's own `authorize-export` entry. The save gives
  neither. One thing follows, and it is stated: the new checkpoint
  can later be the subject of an export that is authorized in full
  in its own right, like any private checkpoint.
- *To settle an unknown effect, or release a pin?* No. The act is
  refused while an attempt of that instance has no outcome, so the
  cut names no attempt. An `unknown` stays `unknown`, with its pin.
  What was changed by this reading: the first wording let the cut
  name attempts with no outcome. A commit would then have confirmed
  attempts of an instance that had been fenced under them.
- *To save part of a root?* No. The whole-head read-back and the
  rule that nothing commits in part are unchanged.
- *By an agent?* No. With `fenced: true` the signer is a person in
  every state of the task. Case r has the refusal.
- *Can destruction follow a save while any writer could still
  write?* By this note's rule, no: only a final cut ends a host, the
  freeze is held, and the destruction names its cut and is refused
  after any thaw. All of that rests on the supervisor, whose side is
  asked and not agreed. So the note says what holds until then: no
  cut is final, and no commit ends a host. What stays trusted, and
  is labelled: that the census saw every process. A writer outside
  every recorded unit that the census misses is not excluded by any
  record. The recovery design says the same of its step 4.
- *Is a receipt shown as proof of the present root?* Not by a rule
  of this note. `unsaved` is false only on a final cut. The page's
  words are R2's and IA's, and the rule is stated for them.
- *Is there a state where dirty work exists, nobody can save it, and
  only an `end-host` with stated loss remains?* Yes: six. They are
  rows 1 to 6 of "Where nothing can save": a lost host; a root that
  cannot be made quiescent; a destruction that is already open; a
  store that refuses three times at a full scope; a fenced
  registration in a running task at a full scope; and a worker's
  `register` over a fenced registration, which lets a restore
  destroy the old host. Each row says what would close it. The last
  is the widest, because an agent can sign it. It was in revision
  19, it is not closed here, and a guard for it is asked.
- *Does the repair open a way to keep a host for ever?* A save of a
  fenced root is one closure, signed, with one room. A host that
  gives no final cut is kept until a person signs. That is the
  custody that the verdict asks for, and the planner's rule on an
  overdue host bounds it by a signed act.

### What the second part did not read, and other limits

- The verdict was read as the builder gave it. Its seals, its
  readers' reports and the planner's acts were not read.
- The recovery design's revision 6 was read in the lines that the
  opening lists. Its section 7.4 was not read: that it has a guard
  that an instance is `ready` is as revision 19 states it.
- The mechanism of a final cut, and of a cut of a fenced instance,
  is stated for this note's rows. Whether a host can do either was
  not established by anything. Both are asks.
- The sizes were counted by a script from the declared maxima, with
  one assumption that is stated: a text may hold a control
  character. The script built the values and measured their
  canonical JSON. Nothing of the source was run.
- The I3 deltas ED1 to ED17 were read in full. The source that they
  describe was not read. "As built" in an answer means as the
  deltas note says.
- `within` is decided for the grant of a key. How an admin's "for
  any task" is read in a declared row is open, with R2.
- The names of three refusals and of three further rules are
  proposals.

# Revision 21

On revision 20 at `4ef1a5e3`, which is approved (verdict `827329ea`)
and awaits adoption. Written for the request `a23dc307`. The adopted
text is still revision 18. The contract's revision 15, at `7f1ea903`,
is approved (`ac9b09f0`) and awaits adoption, and its revision 16 is
written with this one. Design only: nothing was run, built, installed
or probed.

Revision 21 is bounded. It carries five silences that the I3 source
found in the rules of `hold@1` and `git-read@1`, and three points of
wording. It keeps every rule and every scope of revision 20
otherwise. It changes no row, no byte and no digest of either pinned
lane definition. It adds no gate, no timed rule, no suite and no test
quota. It adds one step, `retire`, and one section to the main note,
13.11, which is the index. The facts file is unchanged. The sections
above are history, and none is changed.

Counts, each made by a script over the main note: 84 rows in section
14, where revision 20 had 82; 77 headings, where revision 20 had 76;
6 rows in the index of section 13.11; 5 steps in the table of steps
of section 5.7, where revision 20 had 4.

## One row for each thing that is asked

| Asked | The change | Where | The builder's smallest decision |
|---|---|---|---|
| EH6: how a step reads its request from the signed intent | A table of four rows, by the fields that the rows carry. A report's hold is the one held hold under its commitment, and its instance that hold's current one. A manifest's source is its four fields, in two shapes. The intents of `instance`, `token` and `retire` have a kind of the form of a step kind, and stated fields. | Section 5.7, "What a step reads of its signed intent"; two cells of the table of steps | Kept. |
| EH7: `pin-release` with a commit alone | The `held` pin whose `admitted` entry opened the item that the commit was read from. At most one matches. With none, nothing is released. | Section 5.7, "Which pin a commit alone releases" | Kept for which pin. Changed for no match: the entry is written and releases nothing, and nothing is refused. |
| EH8: the guard `ancestry` with `commit` and `row` only | An input is found by the stop's fact, as an item of this scope with the state `selected` and the slot `for`. A table says what the admitting commit judges and what the walk and a replay judge. No scope retains commit objects for it. | Section 6.2, "How the guard finds a selected input, and where reachability is judged" | Kept. |
| EH11: which entry and input makes a staging's two tokens, a root's `retiring` and a fork's `deleting`, with what each reserves | The entry that opens an attempt of a staging makes the two tokens. The step `retire`, signed under `ledger.retry`, makes the other two. | Section 5.7: the row `retire`, and "Which entry makes a token, a retirement and a deletion". Section 5.8: two cells. | Decided, as asked. |
| EH10, this note's side | A bound exists. Its floor is 2. R4 owns the number, with `cc570904`. The step `token` is refused `tokens-full`. An ending entry holds at most 1 + 3N effects of the capability. | Section 5.7, "The bound on the tokens of one hold" | Kept. |
| The approval's three points of wording | The empty `authority` by branch, in section 12.1 and in section 14. The destruction after a save of a fenced root, limited to the stopped and final branch. The fenced case named in the receipt's row. And the request for a final cut, made exact for a fenced root in a task that runs. | Sections 12.1, 12.1.7 and 14 | Not applicable. |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 20 | Revision 21 | Why |
|---|---|---|---|
| Where an intent names its source | "In its `source` field." | By the fields that the two rows carry. | No act has a field `source`. Stated. |
| The hold of a report | Not stated. | The one held hold under the report's commitment, used only when the signer's member holds it. | EH6. |
| A step with no act | "A signed request." | A signed intent whose kind is `hold@1:` and the step, with stated fields. | EH6. |
| A commit alone, in `pin-release` | Not stated. The source released a pin only when exactly one was `held` on the commit. | The pin of the entry that opened the item. | EH7. It now releases after two reports of one commit, each its own. |
| A record with a `selected-report` stop or the basis `input` | Judged "in the commit", which holds no commit object. The source refused every such record. | The commit judges the lane's items and the ledger. The walk and a replay judge reachability. | EH8. |
| A staging's tokens | Reserved, and made by no entry. | Made by the entry that opens the attempt. Not counted on the hold. | EH11. |
| Retiring a root, deleting a fork | "S records `retiring` in an entry." A deletion "follows". | The step `retire`, signed under `ledger.retry`. | EH11. One step is new. |
| The step `token` at the bound | Not stated. The source refuses with no name. | Refused `tokens-full`. | EH10. |
| A save of a fenced root in a task that runs | "The commit opens the host's destruction." | It ends no host. | The approval's point. Narrowed to what the commit's row already said. |

One thing is new that a key may do: sign `retire`, under
`ledger.retry`, which an admin holds. It deletes a staged ref that no
pin holds, or a fork of a hold that has ended. It gives no read and
no write of any work.

## What is asked back

| Asked | Of |
|---|---|
| The number of tokens of one hold. The bound on one entry's derived effects. The retention before a root is retired. | R4, with `cc570904` |
| Whether a task's checkpoint or an export keeps a fork beyond the six conditions of `retire`. | IA, with the recovery design |
| Who signs `retire` in an installation. | N5 |
| Confirmation that a report's hold is found by its commitment, and of the names `selected` and `for`. | R2 |
| The adoption of the contract's revision 16, for the kind of an outcome entry and the rule on a rule's maximum. | The scope contract, and its review |
| The entries EF1, EF3 to EF6, EF8, EF11 to EF13 and EH1 and EH4, where they are this note's. | This note's next revision |
| Everything that the section "Revision 20" lists as asked back. The verdict `827329ea` says that the planner's act `cf117077` answers one of them: the recovery key acts with no condition that all admins are unavailable. That act was not read, and the text of section 12.1 already checks the key alone. | As that section says |

## What the adversarial reading checked

- *Can a step read a hold that the signer does not hold?* Each row
  of the table of section 5.7 was asked this. A manifest names its
  hold, and `stage` uses it only when its holder is the signer's
  member. A report names a commitment, and the hold is found under
  it. That hold may be another member's: a performer who holds no
  hold, or a member who knows a commitment's ID, can sign such an
  intent. The step uses the hold only when its holder is the
  signer's member, and refuses `not-staged` otherwise, with no entry
  and no outside effect. The foreign shape names a hold of this lane
  by a number that the signer chose. The same check holds, and the
  field `lane` must be this scope's own reference, so an intent for
  another staging lane is refused here. What was changed by this
  reading: the row for the foreign shape first read the hold without
  the check on `lane`. `check` needs no held hold, and reads a root
  only when its staging hold's holder was the signer's member, as
  before. `instance`, `token` and `retire` name a hold or a root by
  a number: the first two need the signer to hold it, and `retire`
  needs `ledger.retry`, and changes only what no pin and no live
  token holds.
- *Can a pin of another intent be released?* Not by a commit alone.
  The pin is found by `admitted`, which is one entry, and that entry
  opened the item that the row's own subject names. Two pins on one
  commit have two entries. A pin of another consumer is not this
  scope's own, and is released only by the form with a consumer and
  an intent, in the handler `unpin`. A pin that is `provisional` is
  never released by a commit alone: it has no `admitted` yet. What
  was changed by this reading: the case of no match. A refusal there
  would have let a missing pin stop the record of a publication.
- *Can a selected input of another lane, or one that was replaced,
  pass the guard?* The fact must be local, by its scope, incarnation
  and hash. The item must be in the state `selected` at the commit,
  and its `for` must be the source commitment. An input that was
  `replaced` fails, and the act is refused `ancestry-stale`. What is
  not closed in the commit: that the stop's commit is the commit of
  that input's report. The walk and a replay judge it, and the table
  says so.
- *Does the admitting commit claim what it cannot judge?* No longer.
  The right column of the table is the walk's and the replay's, and
  at run time it is a trusted claim of the staging lane's runtime,
  with its label.
- *Can `retire` delete something that is in use?* A root: only when
  no pin on it is `provisional` or `held`, and from that entry on no
  pin is accepted on it. A fork: only after its hold has ended, with
  no token, no current instance, no staging in flight and no
  standing receiver pin. What is not closed: whether a task's
  private state still needs the fork. It is asked of IA.
- *Can the bound on tokens be passed?* The only entry that makes a
  hold's token `minting` is the step `token`, and it is refused at
  the bound. A staging's tokens are counted on their root, and are
  bounded by its 3 attempts.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 21 read" says what was read.
- Revision 20 is approved and not adopted. Revision 18 is the text
  in force.
- `ancestry.ts`, `gitread.ts` and `prepare.ts` of the I3 source were
  not read. The table of what the commit judges was made from this
  note's seven guards and from the deltas note's entries EF10 and
  EH8.
- The lane forms were read only in the passage on a manifest's
  source. That `report` omits `selected` on purpose is as the deltas
  note reports the lane forms' section 5.5.
- The step `retire` is this note's choice among several. No lane row
  and no source was checked against it, because none exists.
- That each attempt of a delete has one staging token is read from
  section 6.2's words "its own token". Its mint was not designed
  further.
- No number is proposed.
- Nothing was run. The script that revision 21 ran listed rows of
  two JSON files, and counted rows and headings of the notes.

# Revision 22

On revision 21 at `f9ec25e4`, which is adopted, as the builder's
instruction states. Revision 20, at `4ef1a5e3`, is adopted too. No
adoption act was read. The contract's revision 16, at `54420b41`, is
adopted, and its revision 17 is written with this one. The recovery
design's revision 7, at `e865fd05`, is the text that asks C1 to C5.
Design only: nothing was run, built, installed or probed.

Revision 22 is bounded to four inputs: the I3 deltas EJ1, EJ8 and EJ9;
the recovery design's asks C1 to C5; the capacity finding; and the
planner's request `42de9e34`, for extents, in its design side. It
keeps every rule and every scope of revision 21 otherwise. It changes
no row, no byte and no digest of either pinned lane definition. It
adds no gate, no timed rule, no suite and no test quota. It adds two
sections to the main note: 12.1.4a, and 13.12, which is the index.
The facts file is unchanged. The sections above are history, and none
is changed.

Counts, each made by a script over the main note: 86 rows in section
14, where revision 21 had 84; 79 headings, where revision 21 had 77;
6 rows in the index of section 13.12; 14 rows in the table of further
marks, where revision 21 had 10; 10 rows in "Where nothing can save",
where revision 21 had 8; 10 rows of missing forms in section 12.1.4a.

## One row for each thing that is asked

| Asked | The change | Where |
|---|---|---|
| EJ1, this note's side: the register's `create` and the `relate` of `judge` are sent by an outcome's rule, which had no clauses and, by the source's reading, no cause | Four further marks, k to n: the send of an outcome, with its clauses as effect marks. The three written effects of "The result of the `create`" are the effects of one rule, `claim-active`. The cause is the `found` intent's digest, as section 3.8 and the contract's section 7.2 already have it. | Section 12.1, "What a mark states, and what an outcome sends"; section 12.1.8 |
| EJ8: the form in which a version states a rule's refusals, its most and its use of the clock | Members of the mark. The values are the columns of the table of marks. One rule reads the clock. The counts that the table does not state are named as owed, by row. | The same passage |
| EJ9: "with the kind of the sending scope" | Corrected. The record has four members and no kind. | Section 12.1.6 |
| With the contract's revision 17: a rule at `grant` passes with no member | One cell of the table of seven places. | Section 12.1 |
| C1 | Agreed. `register` and a restore's `intend` are refused `unsaved-undecided`. What "undecided" and "unsaved" mean for a fenced registration is stated. | Section 12.1.7: two rows, and the table of C1 to C5 |
| C2 | Agreed. `end-host` may name a `stale` registration whose host is not being destroyed, with `unsaved: true`. Such a host is overdue from the entry that made it stale. | The row `end-host`; the same table |
| C3 | Agreed. The destruction's request names the cut, the save's job and the checkpoint. An `unknown` attempt leaves the task "not saved". | "The final cut"; "When a task is stopped and not saved" |
| C4 | Agreed. Row 9 of "Where nothing can save". | That table |
| C5 | Kept. | The table of C1 to C5 |
| The capacity composition | One save of a task is open at a time, for every opener. One place of `cut` for a task. One place of `checkpoint` for each stop that may commit. The standing `save` holds no place of its own. The arithmetic is shown for three states. | Section 12.1.7, "One save at a time, and the places of a save"; three cells of section 5.8; two rows of section 12.1.7 |
| Extents, the design side | A new section: what the adopted texts state, an extent, a pattern, the changed set, the judgment at the destination, how a repository changes its extents, the first three, and ten missing forms. | Section 12.1.4a |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 21 | Revision 22 | Why |
|---|---|---|---|
| A rule at `grant` | Passes "with a member or none". | Passes with no member. | The contract's revision 17, for EJ13. Narrowed. No rule gave one. |
| When an entry opens a save | The act `save` is refused while a save is open. A stop and an operation each open their own. | No entry opens a save while one is open. A stop waits for the open one, or takes it as its own. An operation joins it, or is refused `save-open` while a cut is `frozen`. | The capacity finding. Stricter. |
| The places of a save | "3 `cut` items and 1 `checkpoint` item, with their places", for each room. | One place of `cut` for the task. One place of `checkpoint` for a `cancel` and one for a `pause`. | The same. Corrected. |
| `register`, and a restore, over a fenced registration | Admitted. | Refused while it is unsaved and undecided, or a save of it is open. | C1. Stricter. |
| Which registration `end-host` names | The one that `task.registration` names. | Also a `stale` one whose host stands. | C2. Wider, for a person, to end what nothing else can. |
| A destruction that a commit opened and that got no answer | Not stated. | The task is "not saved". | C3. Stricter. |
| A notice's `source` | Read as holding the kind. | Four members. | EJ9. Corrected. |

Nothing new may be done by a worker or an agent. Two things are
refused that were admitted: a `register` or a restore over an
undecided fenced registration, and an `intend` while a cut is frozen.
One thing is new for a person: `end-host` on a stale registration.

## What is asked back

| Asked | Of |
|---|---|
| That the supervisor runs one save of an instance at a time. An operation of the supervisor alone for a root that the store refuses. Confirmation of the answers to C1 to C5 in its revision 8. | The recovery design, with IA |
| The entries and the bytes of a task's closures, and the form of a held place. Each number of section 12.1.4a. | R4, with `cc570904` |
| The missing forms 4 to 7 and 10 of section 12.1.4a: the lane's side, the author's own review, what a class requires, an approver by name, and a symbolic link in an `authority` extent. | R2 for the first; the planner for the rest, with IA |
| Whether the controller of the rules scope is a role of its own. | N5 |
| The type of `extents` in `RulesContent`, and the size of `content` counted again. The adoption of the contract's revision 17. | The scope contract |
| The reason `save-open`, and the extent's name in a publication's reason, for a page. | R2 |

## What the adversarial reading checked

**Extents.**

- *Can a change avoid the rules extent by a rename?* No. A rename is
  the old path and the new path, and no rename is detected. Moving a
  workflow file out of its folder touches the old path, which
  matches. Moving a file into the folder touches the new one.
- *By letter case?* A pattern matches an ASCII letter in either case,
  so `agents.md` is in the extent. What is not closed: a name that
  differs by a Unicode form, on a file system that folds it. It is
  missing form 8.
- *By a path that is added and removed within the change?* No. The
  set is taken for each commit that the manifest brings, against
  each of its parents, and not only between the two ends. What was
  changed by this reading: the first wording compared the base's
  tree with the integration's tree alone, and a workflow that one
  commit adds and the next removes would have been published in the
  history with no review of the extent.
- *By a symbolic link?* In one direction no, and in one yes. Making
  `AGENTS.md` a link changes that path, which matches. But where
  `AGENTS.md` is already a link to another file, a change to that
  file does not touch the extent. This is not closed. It is missing
  form 10, with the smallest rule that would close it. The same
  limit holds for whatever a workflow file reads from another path:
  an extent is a set of paths, and a repository names them.
- *By a merge commit?* A merge is compared with each parent, so what
  it brings from either side is in the set.
- *By a submodule?* Its entry is a path, and a change of the
  submodule's commit touches that path. What is inside it is another
  repository.
- *By an oversized change?* A changed set past its bound is not
  reserved, `evidence-too-large`. The bound is owed.
- *Can a rule change lower its own bar?* The rules are in the rules
  scope, and in no file. So no change in a lane changes them, and
  the change that is judged cannot alter what judges it. The rules
  change by `publish`, under `rules.publish`. `publish` is refused
  if it would remove the `rules` extent, a pattern of its minimum,
  its one approval, its approver or its class. What an admin can
  still do: add no pattern for a file that a repository's agents
  read, or lower the bar of another extent. That is the authority of
  the rules scope's controller, which the request gives it. One
  thing is stated as open: whether the controller may be the one
  reviewer of the controller's own change (missing form 5).
- *Can the lane admit what the destination refuses?* Yes, and it is
  said plainly. The `change` lane reads no path and one number. Its
  `merge` is admitted, and the reservation is then refused with the
  extent's name. Nothing is published. The cost is a late answer.
  Closing it needs a successor of the lane forms.
- *Is anything enforced by adopting this?* No. The judgment needs
  the missing forms 1 to 3. Until then one bar holds, as before. The
  section says so, so that no page and no source claims extents.

**The one open save.** Is there an interleaving where two saves are
open?

- Each entry that opens a save was listed, and each now opens none
  while one is open: an `intend` for an operation that changes the
  root; the entry of a stop; a person's `save`, with or without
  `fenced: true`; and the outcome that ends one save of a closure,
  which opens the next only as it ends the one before, in one entry.
- The outcome that ends a save may open a waiting stop's save. It
  does so in the entry that ends the other, so the two are never
  open together.
- Two entries of one scope are ordered. So "no save is open" is
  judged on one head, and two openers cannot both see none.
- A restore opens no save. A `register` opens none.
- What was not read: the last checkpoint of a hold that ends
  (section 5.2). If an entry of the task scope opens it, the rule
  covers it, because the rule is of every entry that opens a save.
  That section was not read to see which entry does.
- One state follows from the rule, and it is listed: a save whose
  commit is `unknown` is open until it is answered, and nothing else
  can save meanwhile. Row 10 of "Where nothing can save", with the
  read that settles it.
- What the rule costs: an operation that changes the root is refused
  while a cut is frozen. A worker waits for the commit.

**C1 and C2.** Can the guard `unsaved-undecided` lock a task out? A
fenced registration with a lost host can never be saved. It is
decided by `end-host` with `unsaved: true`, which a person signs on
reserved room. So the way out exists, and it is a person's. An agent
cannot take it. That is the custody that C1 asks for. Can `end-host`
on a stale registration destroy a host in use? A stale registration
is one that a later `register` replaced. Its host runs nothing of the
task.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 22 read" says what was read.
- The recovery design was read in five rows of one table. The
  sections that those rows cite were not read, and its revision 8
  does not exist yet.
- The rule of one save at a time is this note's, for its own rows.
  That the supervisor can serve it is asked, and not established.
  Section 5.2's last checkpoint, and "Room for a stop" beyond its
  row B1, were not read again.
- The arithmetic counts places under two types' `max`. It counts no
  entry, no byte, no record and no request.
- The lane forms were not read. What the `change` lane does with the
  rules is read from three rows of its data. Section 3.11, on
  checks, was not read again.
- Section 12.1.4a designs. It changes no row of section 12.1.4, and
  nothing of it is in force for a source. Its patterns and its
  numbers are examples.
- The judges, the validator and the platform package were not read
  for EJ1, EJ8 and EJ9.
- Nothing was run. The script that revision 22 ran added up places,
  read rows of one JSON file, and counted rows and headings.

# Revision 23

It answers the verdict `6f9cc0c7` on revision 22 at `55e41dfc`, which
requested changes: one finding, and one point that does not block. It
also applies three decisions of the planner on extents. Revision 22 is
not adopted, and revision 21 is the text in force. The scope
contract's revision 18, at `be90ff05`, is filed and under review, and
its revision 16 is in force. The recovery design's revision 6, at
`e354a24c`, is adopted, and its revision 9, at `cd10946c`, is under
review. Design only: nothing was run, built, installed or probed.

Revision 23 holds all of revision 22, with the repairs below and
nothing else. It changes no row, no byte and no digest of either
pinned lane definition. It adds no gate, no timed rule, no suite and
no test quota. It adds one section to the main note, 13.13, which is
the index. The facts file is unchanged. The sections above are
history, and none is changed.

Counts, each made by a script over the main note: 88 rows in section
14, where revision 22 had 86; 80 headings, where revision 22 had 79;
7 rows in the index of section 13.13; 13 rows of missing forms in
section 12.1.4a, where revision 22 had 10, of which 3 are answered
and 10 are owed; 7 rows in the count of "The attempts of one cut", and
6 in its table of a stop and a retry.

## One row for each thing that is asked

| Asked | The change | Where |
|---|---|---|
| The finding: bound or partition the attempts that are admitted into one save | A bound, and no partition. The join that revision 22 added is withdrawn: an `intend` for an operation that changes the root is refused `save-open` while a save is open, whether a cut is frozen or not. A cut names every unsaved attempt of such operations, or the save is refused. At most 8 are unsaved at once, and the `intend` that would be the ninth is refused `cut-full`. The count is shown. | Section 12.1.7: one cell of the row of `intend`; one row of the table of "One save at a time"; "The attempts of one cut" |
| That the two notes agree, and what each owns | The recovery design's "mutations are serialized" is the same rule from the supervisor's side. This note owns the admission, and that design the supervisor. Its sentence on more than eight unsaved attempts has no case under the bound. Three things are asked of it. | The same passage, its last point |
| That every admitted attempt and stop reach its closure; that no partial set mark a root saved | A refused `intend` leaves nothing. A cut names all unsaved attempts or none. | The same passage |
| The point: a waiting stop and a refused save's retry | One table of six cases. One successor save. The retry first, which is also the stop's save. | The same passage |
| The planner's first decision | No review of a change to the `rules` extent by its author, or by the controller of an agent among the authors. The single-controller exception, with when it holds, what then meets the obligation, and its record in the reservation's entry, the publication's update and the receipt. | Section 12.1.4a, "What the planner decided" |
| The planner's second decision | A table of the four obligations of the classes `deployment` and `authority`, with the record that carries each for a landing on a branch, and what is missing. | The same |
| The planner's third decision | An approver is an action. A single member is a grant in membership. | The same |
| The three questions marked as answered, with the planner as the decider | Rows 5, 6 and 7 of the list of missing forms. Three rows are added, 11 to 13, for what the decisions need and no record gives. | Section 12.1.4a |
| The lane forms' successor, `fdc3d7e2` | A passage: three things that the lane must read, when a merge is admitted, and when it is reserved. Row 4 names the request. | Section 12.1.4a |
| The symbolic link | Kept as a named, known gap, with its owner. | Row 10; the same passage |
| The standing of the siblings | Stated. | The opening |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 22 | Revision 23 | Why |
|---|---|---|---|
| An `intend` for an operation that changes the root, while a save is open | Admitted while no cut is frozen, and promised a place in the open save's cut. | Refused `save-open`. | The verdict. Stricter, and it is the adopted recovery design's rule. |
| The attempts with no outcome that a cut must name | Not bounded at the admission. | At most 8. The ninth `intend` is refused `cut-full`. | The verdict. Stricter. |
| A stop that waits, and a retry | Each was said to open a save. | One save, with the order stated. | The verdict's point. |
| The review of a change to the `rules` extent | Whether the author's own may count was open. | It may not. `ownerMayReview` is read as false for this extent. | The planner. Stricter. |
| A repository with one controller | Not stated. | The controller's own `merge` meets the `rules` extent, and the landing records it. | The planner. An exception, and it is recorded. |
| A class | A label. | A label, with four obligations that a landing on a branch already meets by its records. | The planner. Stated. |
| An approver | An action. A person by name was open. | An action, always. | The planner. |

Nothing new may be done by a worker or an agent. One thing is new for
a person: the one controller of a repository may land a change to the
`rules` extent with no second controller's review, and the landing
says so.

## What is asked back

| Asked | Of |
|---|---|
| To take the refusals `save-open` and `cut-full`, and the rule that a cut names every unsaved attempt of an operation that changes the root. To confirm that the supervisor starts no save job but the one that is open. | The recovery design, in its revision 9 or the next, with IA |
| The design of the change lane's reading of extents, with the three things that this note asks it to read. | R2, under the request `fdc3d7e2` |
| The missing forms 11 and 13: a count of the holders of an action, and an action given to one member. | This note's next revision, with the contract for the first |
| The missing form 12: a destination for an effect that is not a branch. The symbolic link, form 10. | The planner, with N5 and IA |
| The reasons `save-open` and `cut-full`, and the words "single-controller" in a publication's reason, for a page. | R2 |
| Everything that the section "Revision 22" lists as asked back and that this section does not close. | As that section says |

## What the adversarial reading checked

**The save group.** Each history tries to leave an admitted attempt
outside every cut.

- *Nine `intend`s before the freeze.* The first opens the operation
  and its save. The second is refused `save-open`, because a save is
  open from that entry on, frozen or not. So is each of the next
  seven. Nothing was admitted that the cut does not name. Under
  revision 22 all nine were admitted, and the cut held eight.
- *An `intend` that races the freeze.* There is no moment to race.
  Entries of one scope are ordered. The `intend` is judged on a head
  at which the save is open, and is refused, or on a head at which
  the closure has ended, and then it opens a new save whose cut is
  taken after it. What was changed by this reading: the first repair
  kept the join and bounded it at 8. An `intend` admitted after the
  supervisor had begun the cut, and before the cut's own entry, would
  then have had no outcome and no place in that cut. So the join is
  withdrawn whole.
- *A stop that arrives with eight members.* With no save open, the
  stop's entry opens its save, and the cut names all eight: it fits.
  With a save open, the stop opens none, and the table of six cases
  says which save is its own. A stop is never refused by `cut-full`:
  that refusal is of `intend` alone.
- *A refused cut with eight members, and a ninth waiting.* No ninth
  waits: it was refused at its admission and left nothing. The retry
  names the same eight. After the third refusal the closure ends, the
  eight stay unsaved, and the next `intend` is refused `cut-full`. A
  stop or a person's `save` is still admitted, and its cut names
  them.
- *Can the bound lock a task?* With eight unsaved attempts and every
  save refused, no further operation that changes the root is
  admitted. That is right: the root holds work that no checkpoint
  holds. A person's `save`, a stop, a `fence` and `end-host` are still
  admitted. An operation that does not change the root is too.
- *Can a partial set mark the root saved, or end a host?* A cut names
  every unsaved attempt or the save is refused, so no committed cut
  is partial. The final-cut rule is unchanged: a commit ends a host
  only on a final cut.
- *An attempt of an instance that was fenced or replaced.* It gets its
  `unknown` outcome, as before, and then no longer counts among the
  eight. Its pin stays.
- *What was not checked.* Whether an operation that does not change
  the root is ever in a cut. The rule here says that it is not, from
  the row of the commit, which gives each attempt of a cut a
  `confirmed` outcome with the commit as its evidence. The recovery
  design's own definition of the set was not read.

**The single-controller exception. Can it be used when a second
controller exists?**

- Not by the rule. It needs exactly one active member with an active
  key who holds `rules.publish`, at the head that the destination
  observes within ten seconds. With two, the obligation needs a
  review by the other.
- *By removing the second.* An admin can change another admin's role,
  and then be the only one. That is a signed act in membership, by a
  member who holds `membership.manage`, and the rule that the last
  admin keeps its role stops the last step only. So two admins who do
  not agree can each remove the other first. The exception does not
  make this possible: an admin could already publish any rules. What
  the exception adds is recorded: the landing says "single-controller"
  with the head, and membership's history shows the act before it.
- *By a controller whose key is lost.* A member with no active key is
  not counted. So a repository with two admins, one of whom has lost
  every device, has one controller for this rule. That is the case
  that the exception is for, and it is recorded like any other.
- *By an author who is not the controller.* No. The exception is met
  by the controller's own `merge`. An author who is no controller
  cannot use it, and a controller who is an author uses it only when
  alone.
- *Is it judged at all today?* No. The count needs the missing form
  11. Until then a change to the `rules` extent needs a second
  controller, which fails closed.

**The classes.** Does "each has its record" claim more than exists?
For a landing on a branch, three of the four are records of sections
6.5 to 6.10, and the fourth, a preview, has none because the
destination offers none. For an effect beyond the branch, none of the
four has a record, and the note says so in the same table.

## Limits of this revision

- One author wrote it, with no delegated reader. The opening's table
  "What revision 23 read" says what was read.
- The recovery design was read at its adopted revision 6, in two
  passages. Its revision 9, which is under review, was not read. So
  whether it already states one of the three things that are asked is
  not known here.
- The count of attempts is of a made-up history in which every save
  is refused. It counts attempts and nothing else. The entries of a
  closure for eight attempts were not counted again.
- The planner's decisions were read as the builder gave them. The
  request `fdc3d7e2` was read in the same text, and R2's design under
  it does not exist yet.
- The record of the exception is designed as members of three
  existing records. The body of the evidence of `judge` is not typed
  yet (the missing form 1), so the first of the three has no form.
- Nothing of section 12.1.4a is in force for a source.
- Nothing was run. The script that revision 23 ran counted attempts,
  rows and headings.

# Revision 24

It answers the verdict `546fa613` on revision 23 at `d2639ad9`, which
requested changes: one finding, one disposition on the request
`fdc3d7e2`, and two points that do not block. It also names three
rules that the I3 source found missing for membership (its deltas
EM6, EM7 and EM8). Revision 23 is not adopted, and revision 21 at
`f9ec25e4` is the text in force. The scope contract's revision 18, at
`be90ff05`, and the recovery design's revision 9, at `cd10946c`, are
adopted, as the builder's instruction for this revision states.
Design only: nothing was run, built, installed or probed.

Revision 24 holds all of revision 23, with the changes below and
nothing else. The save admission of revision 23 is not touched: one
operation that changes the root is open at a time with its save, a
cut names every unsaved attempt, and the ninth is refused. Revision
24 changes no row, no byte and no digest of either pinned lane
definition. It adds no gate, no timed rule, no suite and no test
quota. It adds one section to the main note, 13.14, which is the
index. The facts file is unchanged: no fact of it changed. The
sections above are history, and none is changed.

Counts, each made by a script over the main note after the edits,
with the same script run over revision 23 for the earlier number: 92
rows in section 14, where revision 23 had 88; 81 headings, where
revision 23 had 80; 14 rows of missing forms in section 12.1.4a,
where revision 23 had 13, of which 3 are answered and 11 are owed; 27
rows in the table of forms of section 12.1.8, where revision 23 had
25; 57 rows of cells in the table of marks, unchanged, and the word
"Code" 65 times in section 12.1 in both revisions; 18 further marks,
where revision 23 had 14; 9 rows in the index of section 13.14, and 8
rows for EM9 to EM16; 34, 25, 22, 18 and 2 actions for the five
roles. The main note's opening, "The counts of revision 24", says how
each was counted.

## One row for each thing that is asked

| Asked | The change | Where | Why |
|---|---|---|---|
| The finding: require the installation's declared exception, and not one controller alone | Three conditions at the reservation: the observed rules declare the exception; membership shows one controller; that member is among the authors or controls an agent among them. | Section 12.1.4a, the first decision, "The exception" | The planner's assertion `19cd4a03` lets an installation with one controller declare the exception in its rules. Revision 23 applied a summary that had lost those words, and made a count into a permission. |
| Absence means that the exception cannot be used | With no declaration: `not-reserved`, `rules-not-met`, with the extent's name. No new reason. | The same, "With no declaration" | The verdict. The ordinary refusal of an unmet extent is the smallest answer. |
| Bind the record to the observed rules revision as well as to the head of membership | The reservation's entry, the publication's `reason` and the receipt each name the head and the revision of the rules that declared the exception, with the head of membership. A replay derives both. | The same, "Its record" | The verdict. A record shows a use, and does not allow it. |
| Name the unbuilt form of the declaration, and its owner | The missing form 14: a value of the item `rules`, a field of `publish`, and a member of `RulesContent`. The count sentence is corrected to 14 rows, 3 answered and 11 owed. Rows 5 and 11 point to it. | Section 12.1.4a, the list of missing forms | The verdict. |
| What happens when the declaration is added or withdrawn while a change is judged | The rules that the destination observes for the reservation decide. No change in a lane sets them. A `publish` that withdraws the declaration is ordered against the observation as section 6.5 orders a revocation. | The same, "Which rules declare it" | The author's direction for this revision. The note's model of revision 22 already fixed it ("How a repository changes its extents"), and the passage follows the note and says so. |
| Keep the ordinary bar, the default ban on author review, the other extents and checks | Kept. "The rule" and "It agrees with section 3.10" are not changed, and "When a second controller exists" is not changed. | Section 12.1.4a | The verdict. |
| The planner's words | The assertion's own sentence is quoted beside the summary that revision 23 quoted. | The same, the head of the first decision | The summary was the source of the finding. |
| The family of the finding | Two sweeps and a third reading of the three decisions, with a row for each place checked. | The opening, "The sweeps of revision 24" | Asked by the note's author. |
| The head-news disposition: the request `fdc3d7e2` against lines 8039 to 8044 of revision 23 | The two points "When a `merge` is admitted" and "When it is reserved" are withdrawn. One point replaces them, with a table of three states, the scope that judges each and the rules that it judges under; the duty across a change of the rules; and what R2 must state. Row 4 of the missing forms says how its older words are read. | Section 12.1.4a, "Three states of a merge" | Revision 23 let "admitted" name a judgment on rules that may be behind, against the request's "met and reserved". |
| The witness that cites the contract's revision 15 as a draft | It cites the adopted revision 18. | Section 14, one row | The verdict's point. The two witnesses 18.38 and 18.39 were found in revision 18's table of claims. |
| The standing of the siblings, in one place | One table, and one rule for every other mention. Nine sentences of revisions 18 to 23 are dated beside the text. | The opening, "The standing in force"; the list below | The verdict's point. It has been a finding of several reviews. |
| EM6: 34 actions against lists of 32 | The table is counted and listed. The lists hold 64. The contract owes the bound. The rule `role-table`. | Section 3.2, "The table, counted"; section 12.1.3, four cells; section 12.1.8, rows P10 and o | The texts fix whole names and every action under any condition (section 3.3), so no name can go. |
| EM7: the party `member` from a handle | The rule `member-of`, with its row P26. | Section 12.1.8, rows P26 and p; section 12.1.3, three cells | No operand makes a member reference from a text. |
| EM8: the form of a handle | The rule `handle-form`, with its row P27, in membership and in the register. | Section 12.1.8, rows P27, q and r; sections 12.1.1 and 12.1.3 | A text type states a length only. Section 3.1 has had both scopes refuse since revision 14. |
| EM9 to EM16 | Two answered from text that exists, six open with an owner. | Section 13.14 | Asked: no mechanism is invented. |
| The counts | The table of marks' two count sentences, the count of missing forms, and three older sentences that give a count. | Section 12.1.8; section 12.1.4a; sections 13.12 and 13.13 | Each was false after the edits, and is corrected or dated. |

**Each passage of the main note that revision 24 changed.** Every one
is marked in the text with "revision 24". Line numbers are those of
revision 23 at `d2639ad9`.

| Lines of revision 23 | The passage | The change |
|---|---|---|
| 7 | The first line of the opening | It names revision 24 and its verdict. |
| After 465 | The opening | The summary of revision 24. New. |
| Before 470 | The opening | "The standing in force", with its rule. New. |
| Before 496 | The status | "Stated in revision 24". New. |
| 538 to 540 | "Where each note stands" | One sentence: the table is history. |
| Before 684 | The opening | "The sweeps of revision 24", "The counts of revision 24" and "What revision 24 read". New. |
| Before 1079 | Section 3.2 | "The table, counted". New. |
| 1382 to 1384 | Section 3.3, "The bound on each" | One sentence: 34 names. |
| After 7536 | Section 12.1.1 | The register's guard on `founderHandle`. New. |
| 7640 | Section 12.1.3, the item `roster` | `max: 64`, where it had 32. |
| 7651, 7652, 7654, 7658, 7660 | Section 12.1.3, five rows of entries | Each names its rule, or the longer list. |
| After 7692 | Section 12.1.3 | "Three rules that the rows need". New. |
| 7913 to 7916 | Section 12.1.4a, the first decision | The assertion's words, beside the summary. |
| 7928 to 7944 | "The exception" and "Its record" | Corrected, with "With no declaration", "Which rules declare it" and "Who declares" between them. |
| 7952 to 7955 | "What is missing for it" | Two forms, where it had one. |
| 7968, and 7972 to 7978 | The second decision | The reach of the grant; what recording a class does not do. |
| 8003, 8004 and 8016 | Rows 4, 5 and 11 of the missing forms | One sentence each. |
| 8020 to 8021 | The count of missing forms | The row 14, and the corrected count. |
| 8037 to 8045 | "What this note asks of the lane forms' successor" | Two points withdrawn, and "Three states of a merge" in their place. |
| Before 9457 | Section 12.1.8 | The paragraph "Revision 24". New. |
| 9497, and after 9512 | The table of forms | One more use of P10; the rows P26 and P27. |
| 9588 to 9590 | The table of further marks | "Eighteen", and rows o to r, with the table of what they read and return. |
| 9613 to 9615 | The counts of marks | The places of the eighteen rows. |
| 5091, 7317 to 7321, 8667 to 8669, 8741, 9224 to 9226, 9463, 10205 and 10231 | Eight sentences on a sibling's standing | Each is dated, and points to "The standing in force". |
| 10378, 10414, 10417 and 10418 | Four rows of sections 13.12 and 13.13 | Each points to section 13.14. The row on the siblings' standing is the ninth dated sentence. |
| Before 10426 | Section 13.14 | New. |
| 10505, 10512 and 10517 | Three rows of section 14 | The exception's witness points on; the contract's revision 18; what revision 24 read. Four rows are new beside them. |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 23 | Revision 24 | Why |
|---|---|---|---|
| The single-controller exception | It held when membership showed one controller. | It holds only when the observed rules declare it, membership shows one controller, and that member is among the authors or controls an agent among them. | The verdict, and the planner's own words. Stricter. |
| A repository that declared nothing | Its one controller could land a change to the `rules` extent alone. | It cannot. `not-reserved`, `rules-not-met`. | Stricter. |
| The one controller who is no author | That member's `merge` met the extent, with no review. | That member's review is asked, as the ordinary rule has it. | Stricter. The exception is for the case that the ordinary bar cannot meet. |
| The record of the exception | The extent, the words, the member and the head of membership. | The same, and the head and the revision of the rules. | The verdict. More exact. |
| When a merge is admitted | When the lane's own count met each obligation, on the rules that the lane held. | Only in the destination's entry that reserves it, under the rules observed for that reservation. The lane's judgment is advisory. | The request `fdc3d7e2`. Stricter in its words. What the destination reserves is unchanged. |
| The grant of the second decision | Said to carry "a standing grant on that destination". | The same record, with its reach stated: the repository. | More exact. Not repaired: it needs a form. |
| The five lists of the roster, and `actions` of `set-actions` | At most 32. | At most 64, with 34 in an admin's. | The I3 delta EM6. Wider as a bound. No role gains an action: the names are those of the table of section 3.2. |
| The party `member`, and the form of a handle | Stated by a row, with no rule. | Two rules, with their refusals. | The I3 deltas EM7 and EM8. More exact. |
| The register's refusal of a `founderHandle` that is no handle | Stated in section 3.1 only. | A guard of `found`, by the rule `handle-form`. | More exact. |

Nothing new may be done by a person, a worker or an agent. One thing
that revision 23 let a person do is taken away: the one controller of
a repository lands a change to the `rules` extent alone only where
the repository's rules declare the exception.

## What is asked back

| Asked | Of |
|---|---|
| The form of the declaration: the type of `RulesContent` with one more member, and the size of `content` counted again (the missing form 14). | The contract, with this note's next revision |
| Whether a `publish` may declare the exception while more than one controller exists. Whether the second decision asks for a grant on one destination alone. | The planner |
| The lane side of the three states of a merge: what the `merge` row reads, that its judgment is advisory, and what a page shows before and after G's update. | R2, under the request `fdc3d7e2` |
| The bound on the elements of a list, in the table "Bounds on a definition" of its section 6.1: at least 34, and 64 as asked. | The contract; R4 for the number |
| The forms P26 and P27. | The contract's next revision, with this note |
| To move the three stand-in rules into the platform package under the names `role-table`, `member-of` and `handle-form`, with the rows P10, P26 and P27 in place of EM6, EM7 and EM8; to add `handle-form` to the register's `found`; and to check whether a constant list can say the role table as data. | I3, once this revision is adopted |
| EM9, EM11, EM13, EM14 and EM15, and the written guard of EM16. | This note's next revision |
| EM12. | R4, with the request `cc570904` |
| Whether its adopted revision 9 holds `save-open`, `cut-full` and the rule that a cut names every unsaved attempt. | The recovery design, with IA |
| Everything that the section "Revision 23" lists as asked back and that this section does not close. | As that section says |

## What the adversarial reading checked

**The exception. Can it still be used with no declared permission?**

- *A repository that never declared it, whose controllers fall to
  one.* This is the verdict's case. Condition 1 fails. The answer is
  `rules-not-met`. A second controller must review, or the one
  controller must first publish the declaration, which is a signed
  entry of the rules scope before the landing.
- *A change that brings the declaration with it.* It cannot. The
  rules are in no file. Nothing in a manifest sets a value of the
  rules scope.
- *The author publishes the declaration, lands, and withdraws it.*
  All three are signed entries: two of the rules scope and one
  reservation. The reservation names the revision that declared it. A
  replay finds the declaration at that revision. This is a use that
  the planner permits to an installation with one controller, and it
  is visible. It is not prevented.
- *Two controllers. One publishes the declaration, and then removes
  the other.* The declaration gives nothing while both are
  controllers. The removal is an act of membership under
  `membership.manage`, which the last-admin rule bounds at the last
  step only. After it the three conditions can hold. Revision 23's
  reading answered this with "what the exception adds is recorded",
  and the verdict rightly did not take a record for a permission.
  Revision 24 does not claim to prevent the sequence. It says what
  holds: two signed entries come before the landing, one in each of
  two histories. Whether a declaration may be published while more
  than one controller exists is asked of the planner.
- *A controller whose key is lost.* A member with no active key is
  not counted, so two admins of whom one has lost every device are
  one controller. Revision 23 called that "the case that the
  exception is for". Under revision 24 it is that case only where the
  rules declare the exception.
- *A declaration that is withdrawn in the ten seconds before the
  reservation's commit.* The reservation stands on the revision that
  it observed, and records it. That is the window of section 6.5, and
  it is the same for a revoked merger.
- *A reservation's entry that claims the exception falsely.* A replay
  reads the rules scope's history at the named revision and
  membership's at the named head. Either one that does not agree
  makes the entry not verify.
- *Is any of it judged today?* No. The forms 11 and 14 are missing.
  Until both exist a change to the `rules` extent needs a second
  controller's review, which fails closed.

**The three states. Can a merge be admitted under rules that are
behind?**

- *The lane holds revision 5 of the rules, and revision 6 adds an
  extent.* The lane writes its `merge` entry. The item is `intended`.
  The destination observes revision 6 and finds the new extent unmet:
  `not-reserved`, `rules-not-met`, with its name. Nothing was
  admitted in the request's sense.
- *The lane holds revision 6, and revision 5 was laxer.* Not
  possible as an order: revisions rise.
- *The rules change after the reservation.* The publication is
  reserved under the revision that it records. Section 6.5 judges
  nothing again after that entry.
- *Does the new wording change what a destination reserves?* No. The
  destination judged under its own observed rules in revision 22 and
  in revision 23. What changes is the word "admitted", and that the
  lane's judgment is named advisory.

**The role table. Can a longer list give a role more than the table
gives?** The rule `role-table` sets the five lists from the table of
section 3.2 and nothing else. `set-actions` could always set a list
whole, under `membership.manage`. The bound of 64 lets it hold more
names than 32 did. It names no action that no row grants.

**The handle. Can a member be opened from a text that is no handle?**
In `invite-member` and `add-member` the rule `handle-form` is a guard
of the same entry, before the effects. In `seat` the handle is
`roster.foundingHandle`, which the register's `found` checked, by the
same rule, before the directory and membership were created.

**What was not checked.** The validator and the judges of the I3
source. The register's data in that source. The recovery design's
revision 9. The lane definitions. Any passage of the main note that
"What revision 24 read" does not list.

## Limits of this revision

- One delegated author wrote it, for the note's author, with no other
  reader. The opening's table "What revision 24 read" says what was
  read in full, what in part and what by search.
- The planner's assertion was read as the builder gave it. The act
  was not read. The verdict was read as the builder gave its text.
- The standing of the four texts in "The standing in force" is as the
  builder's instruction states it. No adoption act was read.
- The contract's revision 18 was read by search, in the passages that
  the table lists. The recovery design's revision 9 was not read.
- The sweeps are searches for stated words. A permission or a record
  that is worded otherwise was not found by them.
- The dating of sentences on a sibling's standing covers revisions 18
  to 23. Older sentences are covered by the rule of "The standing in
  force" and were not each marked.
- The declaration, the count of controllers and the typed evidence of
  `judge` are forms that do not exist. Nothing of section 12.1.4a is
  in force for a source.
- The number 64 is this note's request. No size was counted again
  for it.
- Nothing was run. The script that revision 24 ran counted actions,
  rows and headings of the main note.

# Revision 25

It is on revision 24 at `d5616522b72bb53dce4a258fee5a22b7eff40022`,
which is adopted and in force, as the builder's instruction for this
revision states. The scope contract's revision 19 at `1ca8a59bf`, the
lane forms' revision 15 at `f4889d47` and the recovery design's
revision 9 at `cd10946c` are adopted, by the same instruction. It
answers three groups of questions that the I3 build put to this note
(its deltas note, sections 16 to 18, 22 and 23): the directory and
the register, the destination, and extents. Design only: nothing was
run, built, installed or probed.

Revision 25 holds all of revision 24, with the changes below and
nothing else. It changes no row, no byte and no digest of either
pinned lane definition. It adds no gate, no timed rule, no suite and
no test quota. It adds one section to the main note, 13.15, which is
the index. The facts file is unchanged: no fact of it changed. The
sections above are history, and none is changed.

Counts, each made by a script over the main note after the edits,
with the same script run over revision 24 for the earlier number: 100
rows in section 14, where revision 24 had 92; 82 headings, where
revision 24 had 81; 14 rows of missing forms in section 12.1.4a, as
in revision 24, of which 4 are answered by the planner, 3 are given
as rows, 1 is given in part, 1 is given by a sibling and 5 are owed;
29 rows in the table of forms of section 12.1.8, where revision 24
had 27; 57 rows of cells in the table of marks, unchanged; 26 further
marks, where revision 24 had 18; 15, 12 and 13 rows for the three
parts of the index of section 13.15, and 11 rows carried. The
difference between the two revisions has 82 places, and each holds
the words "revision 25". The main note's opening, "The counts of
revision 25", says how each was counted.

## One row for each thing that is asked

| Asked | The change | Where | Why |
|---|---|---|---|
| The two creation rules of the directory (EX4, EP6) | Two send marks with `always`: `create-rules` and `create-destination`. The fields of each creation, confirmed. A sibling's scope ID is the contract's `ScopeId` of the sibling's seed. | Section 12.1.2; section 12.1.8, rows s and t | The contract's revision 19 decided the form and left the names and the derivation to this note. |
| Where `claim.policy` comes from (EP3) | A written effect from `register.policy`. Confirmed as built. | Section 12.1.1 | The row stated no source. |
| `revoke-credential` and `delete-repository` (EP4) | No read is decisive. The bodies of the evidence are stated. | Section 12.1.1 | No statement of a host makes a read decisive for either. |
| A signed intent in the register's `create` (EP5) | The field `founding` is withdrawn. The `create` names the claim by its fact. | Sections 12.1, 12.1.1 and 3.8; section 12.1.8, rows P21 and k | The contract: no field type holds a signed intent. |
| The register's rule that every founding waits on (EJ1) | `create-repository` is stated whole, with its send and the effect mark `claim-active`. | Section 12.1.1; section 12.1.8, row v | The form and the cause exist since the contract's revision 17. Only this note's row was missing. |
| The guard of `retry-import` (EP7) | The rule `import-spent`, refused `import-not-spent`. An `unknown` attempt counts as used. | Section 12.1.2; section 12.1.8, rows P29 and u | No guard form reads an operation. The adopted row's words are "used". |
| The fields of `open-issue` and `open-pr` (EP8) | As the lane forms' revision 15 lists them. | Section 12.1.2 | Asked with the lane design. |
| The evidence of `import`, and "the last" (EP9) | `{ commit }`. "The last `refused`" as built. New: the kind selects one result. | Section 12.1.2 | A late answer and a retried operation could each be `confirmed`. |
| `worker-standing` (EP11), `index-row` (EP12), one lane for each revision (EP13) | Each confirmed as built. `activeKey` is added to the first. The third is named as a cost. | Section 12.1.2 | Asked to confirm. |
| The refusals of `definition-active` (EP15) | A second refusal, `unsupported-definition`. | Section 12.1.2; section 12.1.8, row 9 | The same bytes get the same answer at a creation, and the condition does not pass with time. |
| An advisory from another repository (EP16) | The row's sentence is no check, and is withdrawn as a claim. | Section 12.1.2 | No form reads the sender's recorded directory. |
| The row `open-task` (EP17) | Nothing more is asked of the row. | Section 12.1.2 | It is the contract's section 7.2. |
| Where the rules scope and the destination record their membership reference (EM21, EU6, EQ7) | The ID is a fixed value. The incarnation is that of the first retained observation, read from the folded state. The first read asks by the ID alone. | Sections 12.1 and 3.3 | The contract leaves it to this note. A read's scope part need not state an incarnation. |
| The names of the destination's kinds and rules (ER1) | Eight kinds and eight rules, as built. None for a fence. | Section 12.1.5 | The fence is not adopted. |
| A second `judge` (ER2) | The slot `branch.judging`. One attempt, and no `unknown`. The next `judge` is opened by each rule that frees the way. | Section 12.1.5 | The slot stayed empty until the outcome, and a queued publication could wait for the next `reserve`. |
| The lists of `reserve` (ER3) | Three, each with `collect-list`. The numbers and members are constants of the rule. A verdict takes `extent`. | Section 12.1.5; section 12.1.8, rows P25 and b | The lane forms' revision 15. |
| `resend` (ER4) | The rule `resend-due`, refused `resend-not-due`. A `resend` opens its attempt's mint. | Section 12.1.5; section 12.1.8, row z | No guard form reads an operation. Every attempt of a write has a mint. |
| `abort-if-behind` (ER5) | The entry of `compromised` sets `aborting`. The live token is the slot `token`. The reservation entry is at `reservedAt`. | Section 12.1.5 | The contract gives a retry rule the folded state. |
| What an operation is for (ER6) | The entry that opened it, and six slots. | Section 12.1.5 | The contract lets a rule read the opening entry, and leaves a slot to the specification. |
| Who opens the mint, the revocation and the deciding read (ER7) | Stated for each. The read back is evidence of the attempt's outcome. A read decides the publication and never an attempt. | Section 12.1.5 | The ledger opens attempt n + 1 only in the outcome entry of attempt n. The contract's R1-38 stays open. |
| The evidence of `judge` (ER8) | Its body, and what the rule reads of `observed` and `uses`. | Section 12.1.5 | No text stated the body. A rule is given a fetched entry by its bytes. |
| The two commits, and the receipt's operations (ER9) | Each part of each commit, and the two receipts. Two details are asked of the contract. | Section 12.1.5 | No text stated the parts. |
| The mark on a refused `withdraw` (ER10) | A refusal sets nothing. Case d is corrected. The exception of section 5.8 covers an applied `withdraw` until the contract has a form. | Sections 12.1.5, 5.8 and 7; section 14, two rows | The contract: no place adds an effect to a refused delivery. |
| Small places (ER13) | Two refusal names, two fields of `adopt-head`, three confirmations. | Section 12.1.5 | A rule's refusal has a name that its row states. |
| The two contradictions | Section 6.1 is corrected. Three `collect` lists. | Sections 6.1 and 12.1.5 | The build found them. |
| The rows of the missing forms 2 and 3 | The slot and the field `extents`, with the bounds of an extent; the marks `extent-list` and `extents-hold`; the part of `judge`. | Section 12.1.4; section 12.1.8, rows P28, w and x | Owed by revision 24. |
| The rows of the missing form 14 | The slot `singleControllerException` and the field of `publish`. | Section 12.1.4 | The contract's revision 19 gave the member of `RulesContent`. |
| The missing form 1, as far as this note owns it | The member `changes` of the evidence of `judge`: the changed set and the links. | Section 12.1.4a | Owed by revision 24. The numbers are the proof plan's. |
| The planner's words on the exception | The one controller is the author. The clause on the controller of an agent is withdrawn. The declaration may be made at any time. | Section 12.1.4a | The planner's assertion `7d7b6a78`. |
| The grant of the second decision | Recorded as an owed row of this note. | Section 12.1.4a; section 13.15 | The planner's answer, and the contract's point R1-66. |
| The symbolic link (G30) | The planner's rule, in seven parts. "Its target is not followed" is withdrawn. | Section 12.1.4a | The planner's decision and its refinement. |
| EV13 to EV16 | Two cases of a pattern; exactly one extent with no pattern; the checks of the `rules` extent stand; nothing new for an activation. | Sections 12.1.4 and 12.1.4a | Each is decided only where a form exists. |
| What the lane forms' revision 15 asks | Asks 1 to 4 are given. Asks 5 and 11 are carried, each with its reason. | Sections 12.1.4 and 12.1.4a | Its section 20.2. |
| Everything else | Listed as carried to revision 26, with nothing decided. | Section 13.15 | Asked. |
| The standing of the siblings | The one table is restated. Four places of revision 24 are dated: the table itself; the opening of section 13.14; and, in section 12.1.4a, "The planner has commissioned it" and row 4 of the missing forms. | The opening, "The standing in force" | The rule of revision 24. |

**Each passage of the main note that revision 25 changed.** A script
made this table from the difference between the two revisions. Every
place holds the words "revision 25". Line numbers are those of
revision 24 at `d5616522b`. "New" is text that is added after the
line named. "Changed" is a line that gained words: no line of
revision 24 lost a word but for the first line of the opening and the
passage "The standing in force", which is restated.

| Lines of revision 24 | Where | The change |
|---|---|---|
| 7 | The opening | 1 line changed |
| After 512 | The opening | New: 34 lines |
| 516 to 519 | The opening | 4 lines changed, 3 added |
| 523 to 526 | The opening | 4 lines changed |
| 530 to 540 | The opening | 11 lines changed, 3 added |
| 543 to 547 | The opening | 5 lines changed |
| After 574 | The opening | New: 8 lines |
| After 774 | The opening | New: 114 lines |
| After 1641 | Section 3.3 | New: 6 lines |
| 1800 | Section 3.3 | 1 line changed |
| After 2234 | Section 3.8 | New: 10 lines |
| After 2390 | Section 3.8 | New: 3 lines |
| 4653 | Section 5.8 | 1 line changed |
| After 4747 | Section 5.8 | New: 4 lines |
| After 4949 | Section 5.8 | New: 5 lines |
| 5023 | Section 5.8 | 1 line changed |
| After 5038 | Section 5.8 | New: 4 lines |
| After 5048 | Section 5.8 | New: 3 lines |
| After 5332 | Section 6.1 | New: 6 lines |
| 6978 | Section 7 | 1 line changed |
| After 7715 | Section 12.1 | New: 55 lines |
| 7722 to 7724 | Section 12.1 | 3 lines changed |
| 7731 | Section 12.1 | 1 line changed |
| 7733 | Section 12.1 | 1 line changed |
| 7735 | Section 12.1 | 1 line changed |
| 7759 to 7760 | Section 12.1.1 | 2 lines changed |
| After 7779 | Section 12.1.1 | New: 119 lines |
| 7794 to 7796 | Section 12.1.2 | 3 lines changed |
| 7798 to 7799 | Section 12.1.2 | 2 lines changed |
| After 7865 | Section 12.1.2 | New: 199 lines |
| 7952 | Section 12.1.4 | 1 line changed |
| 7959 | Section 12.1.4 | 1 line changed |
| 7963 | Section 12.1.4 | 1 line changed |
| After 7995 | Section 12.1.4 | New: 132 lines |
| After 8007 | Section 12.1.4a | New: 3 lines |
| After 8039 | Section 12.1.4a | New: 3 lines |
| After 8045 | Section 12.1.4a | New: 2 lines |
| 8049 | Section 12.1.4a | 1 line changed, 2 added |
| 8074 | Section 12.1.4a | 1 line changed, 2 added |
| After 8085 | Section 12.1.4a | New: 2 lines |
| After 8094 | Section 12.1.4a | New: 2 lines |
| After 8104 | Section 12.1.4a | New: 1 lines |
| After 8148 | Section 12.1.4a | New: 2 lines |
| After 8188 | Section 12.1.4a | New: 1 lines |
| After 8198 | Section 12.1.4a | New: 4 lines |
| After 8247 | Section 12.1.4a | New: 1 lines |
| After 8278 | Section 12.1.4a | New: 2 lines |
| 8291 | Section 12.1.4a | 1 line changed |
| 8328 to 8331 | Section 12.1.4a | 4 lines changed |
| 8337 | Section 12.1.4a | 1 line changed |
| 8344 to 8345 | Section 12.1.4a | 2 lines changed |
| 8353 | Section 12.1.4a | 1 line changed |
| After 8357 | Section 12.1.4a | New: 3 lines |
| After 8365 | Section 12.1.4a | New: 5 lines |
| After 8424 | Section 12.1.4a | New: 1 lines |
| After 8433 | Section 12.1.4a | New: 344 lines |
| 8442 to 8443 | Section 12.1.5 | 2 lines changed |
| 8452 to 8461 | Section 12.1.5 | 10 lines changed |
| After 8472 | Section 12.1.5 | New: 3 lines |
| After 8483 | Section 12.1.5 | New: 2 lines |
| 8494 to 8495 | Section 12.1.5 | 2 lines changed, 438 added |
| After 9825 | Section 12.1.8 | New: 4 lines |
| After 9841 | Section 12.1.8 | New: 8 lines |
| 9903 to 9904 | Section 12.1.8 | 2 lines changed |
| 9908 | Section 12.1.8 | 1 line changed |
| After 9910 | Section 12.1.8 | New: 2 lines |
| 9928 | Section 12.1.8 | 1 line changed |
| 9936 to 9938 | Section 12.1.8 | 3 lines changed |
| 9957 to 9960 | Section 12.1.8 | 4 lines changed |
| 9962 to 9964 | Section 12.1.8 | 3 lines changed |
| After 9990 | Section 12.1.8 | New: 2 lines |
| 9995 to 9998 | Section 12.1.8 | 4 lines changed |
| 10004 | Section 12.1.8 | 1 line changed |
| 10007 | Section 12.1.8 | 1 line changed |
| After 10011 | Section 12.1.8 | New: 8 lines |
| After 10036 | Section 12.1.8 | New: 37 lines |
| After 10048 | Section 12.1.8 | New: 6 lines |
| After 10863 | Section 13.14 | New: 2 lines |
| After 10905 | Section 13.14 | New: 136 lines |
| 10948 | Section 14 | 1 line changed |
| 10974 | Section 14 | 1 line changed |
| 11001 | Section 14 | 1 line changed, 8 added |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 24 | Revision 25 | Why |
|---|---|---|---|
| Who may use the single-controller exception | The one controller, where that member is among the authors or controls an agent among them | The one controller, where that member is among the authors | The planner's words. Stricter. |
| A review and its extents | One review may count for several extents. | A review counts for the one extent that it states. | The lane forms' revision 15. Stricter. |
| A link that leaves the tree | Not followed, and a named gap | Refused where a change creates it or gives a link that target. Judged in the `rules` extent where a change removes or replaces it. | The planner's decision. Stricter. |
| A file behind a link | Judged at its own path | Judged at its own path and at the path of every link that resolves to it | The planner's decision. Stricter. |
| A repository before its first `publish` | One bar for the repository | The three extents of the first definition | This note's reading of the owner's direction. Stricter. Asked of the planner. |
| The rules content | Any list of extents with the `rules` extent | Also exactly one extent with no pattern, and each named check a check of the same act | So that no path is unclassified. Stricter. |
| A `publish` that does not state the declaration | Not stated | The declaration is withdrawn | Fails closed. |
| A refused `withdraw` at a destination with no free room | Written against the reserved entry, and the mark set | New work, and not decided without free room | No form sets the mark. Narrower: the exception covers the applied case until the contract has a form. |
| `judge` | Opened whenever the slot was empty and the branch `ready` | One at a time | Stricter. |
| A further attempt of a push | When the read showed the base | When the read back shows the base and no abort is recorded | More exact. |
| `adopt-head` | Recorded the commit that the read saw | Sets the head only when the read shows the commit that the act names | Stricter. |
| `retry-import` | "The import's stated attempts are used, and none is `confirmed`" | The same, as a rule. An `unknown` attempt counts as used. | More exact. Wider than the source's stand-in, and as wide as the adopted row. |
| `import` | Each `confirmed` outcome set `imported` | The first selected one does | Stricter. |
| `definition-active` | One refusal | Two | More exact. |
| A scope's first read of membership | Not stated | By the scope ID alone, and the entry that retains the answer fixes the incarnation | More exact. |
| A provisional rules scope | Not stated | It answers no observation of the rules | Stricter. |
| The register's `create` | Carried the founder's signed intent as a field | Names the claim's entry, which holds it | More exact. No form held the field. |

Nothing new may be done by a person, a worker or an agent. One thing
is wider than the I3 source's stand-in and not wider than the adopted
text: an admin may sign `retry-import` when an attempt of the import
is `unknown`. Three things that revision 24 let a person do are taken
away: a review no longer counts for an extent that it does not state;
the controller of an authoring agent no longer uses the exception
without being an author; and a change may not create a link that
leaves the tree.

## What is asked back

| Asked | Of |
|---|---|
| The member `extents` of `RulesContent`, with the size of `content` counted again. An effect of a refused deciding entry, for the count of one bound `withdraw`. The observation that counts the holders of one action. The text of a fact reference, and the byte domain of the digest of a fact. That the function which gives a scope's membership reference is reported under `platform-code`. Whether a `list` may be a member of a `record`. | The contract's next revision |
| The numbers of the member `changes` and of the largest `extents`. The cost of one lane for each revision of the repository item. A read of operations by kind. What its row O9 asks an activation to record. | The proof plan, with the request `cc570904` |
| The reader that compares two trees and resolves links. How a path that is no text is carried. | IA |
| Four questions: an agent's change under one controller; whether "refused" for a link is never met; a path that is no text; and the first definition as the default. | The planner |
| To build what section "What revision 25 lets the I3 source do next" lists, once this revision is adopted; and to change four things that the source has otherwise: the stand-in of `import-spent`, the answer of `definition-active` for bytes that do not validate, the exception for the controller of an agent in `judgeExtents`, and the mint of a `resend`. | I3 |
| Whether its adopted revision 9 holds what revision 24 asked of it. | The recovery design, with IA. This note did not read that revision. |
| Everything that the section "Revision 24" lists as asked back and that this section does not close. | As that section says |

## What the adversarial reading checked

**The creation rules. Can a directory name the wrong sibling?**

- *The rule builds a seed that differs from the one that the judge
  builds for the written `create`.* Then the rules scope would hold
  the ID of a scope that does not exist, and every act there would be
  answered `authority-unavailable`. It fails closed. The row states
  the four values and the ordinal, so a source builds the same seed.
- *The bare digest in place of the scope ID.* The deltas note's
  words could be read so. The row says that the ID is the contract's
  `ScopeId`, with its prefix and its base32 form.
- *A first read that is answered by another incarnation.* Only a
  confirmed scope answers, and the directory confirms one
  incarnation. A replay compares with the directory's history.

**The register. Can a founding now use two repositories, or none?**

- *Two `confirmed` outcomes.* The kind selects, and the local guard
  is the empty slot. The second opens a deletion.
- *A body that names another repository.* `bad-input`: the name must
  be the attempt's own, which a replay derives.
- *A `create` with a field `founding`.* Refused `bad-field`. The
  directory reads the founder's key from the claim's entry.

**The destination. Can two publications hold the branch, or a send
land after an abort?**

- *Two `judge` operations.* One is open at a time, by the slot
  `judging`. The slot `branch.slot` is set only in the outcome of a
  `judge`, which is one entry.
- *A late answer after `published`.* The rule yields nothing for a
  publication that is final. The attempt keeps its own result.
- *`aborted` while a send may still land.* It needs a read that
  shows the base, no open attempt, and every attempt `refused`. An
  `unknown` attempt holds the slot, as section 6.8 has it.
- *A token with no revocation.* The slot `token` is set when a mint
  is `confirmed` and emptied by the entry that opens the revocation.
  A mint that is answered late opens its revocation in its own
  outcome. A mint whose answer never arrives made no token that this
  service holds.
- *A further attempt after a `compromised` notice.* The rule for a
  further attempt reads `aborting`.
- *A second refused `withdraw` on one reserved entry.* It cannot
  happen now: a refusal is new work.

**Extents. Can a change lower its own bar?**

- *A change that brings the rules.* It cannot. The rules are in no
  file.
- *A link that points a protected path at an unprotected file.* The
  file is judged at the link's path too.
- *A link that leaves the tree, to dodge the match.* Refused where it
  is created.
- *An agent of the one controller.* Not reserved, unless the
  controller is an author.
- *A verdict by a member without the approver.* It states an extent,
  and it does not count.
- *Rules with no catch-all, so that a path is in no extent.* Refused
  at `publish`.
- *A `publish` that leaves out the declaration.* The declaration is
  withdrawn.

## Limits of this revision

- One delegated author wrote it, for the note's author, with no other
  reader. The opening's table "What revision 25 read" says what was
  read in full, what in part and what by search.
- The planner's four later decisions were read as the builder gave
  them. No act was read.
- The contract's revision 19 was read in the passages that the table
  lists, and not in full. A rule of it that this revision did not
  read may bear on a row of section 12.1.5.
- For the destination, sections 5.7, 6.2, 6.3, 7 and 8 of this note
  were not read again. The rows of section 12.1.5 were checked
  against sections 5.8, 6.4 to 6.10 and 12.2. Section 5.8's sums were
  not added again, and its witness of a destination at its budget was
  not recomputed for the narrowed exception.
- Section 3.10 was not read again. The words "the manifest's
  authors, as section 3.10 lists them" rest on revision 24's reading.
- The sweeps are searches for stated words, over the lines that this
  revision adds. A permission or a record that is worded otherwise
  was not found by them.
- The numbers of an extent, of the member `changes` and of a link's
  chain are examples.
- Nothing of sections 12.1.4a and 12.1.5 is in force for a source
  before this revision is adopted, and the destination judges no
  extent before the contract states the member `extents`.
- Nothing was run. The scripts that revision 25 ran counted rows and
  headings of the main note, listed its changed lines, and counted the
  bytes of a made-up value.

# Revision 26

It answers the verdict `f456b67c` on revision 25 at
`a1d18e51745b26beb85ba00ea12af5cbafde1e7e`, which requested changes:
one finding, and one duty of the source that it names. Revision 25 is
not adopted, and revision 24 at `d5616522b` is the text in force.
Design only: nothing was run, built, installed or probed.

Revision 26 holds all of revision 25, with the changes below and
nothing else. It changes no row, no byte and no digest of either
pinned lane definition. It adds no gate, no timed rule, no suite and
no test quota. It adds one section to the main note, 13.16, which is
the index. The facts file is unchanged: no fact of it changed. The
sections above are history, and none is changed: every earlier line
of this file is as it was. Where a row of the section "Revision 25"
no longer holds, the table "The rows of the section "Revision 25"
that this revision overrides", below, names it and says what holds.

Counts, each made by a script over the main note after the edits,
with the same script run over revision 25 for the earlier number: 15
rows of missing forms in section 12.1.4a, where revision 25 had 14,
of which 4 are answered by the planner, 3 are given as rows, 1 is
given in part, 1 is given by a sibling and 6 are owed; 101 rows in
section 14, where revision 25 had 100; 83 headings, where revision 25
had 82; 7, 4 and 4 rows in the three tables of section 13.16; 4
questions for the planner in section 13.15, each answered. The
difference between the two revisions has 30 places, and each holds
the words "revision 26". The main note's opening, "The counts of
revision 26", says how each was counted.

## One row for each thing that is asked

| Asked | The change | Where | Why |
|---|---|---|---|
| Restore the condition on the controller of an authoring agent, in the normative conditions | The third condition is stated as revision 24 had it: the one controller is among the manifest's authors, or is the controller of an agent among them. Revision 25's withdrawal is withdrawn. | Section 12.1.4a: the first decision, condition 3; the row D1; "The exception, in the planner's words" | The verdict `f456b67c`. The planner's act `5a036318`: "who is the author" was shorthand, and no narrowing. The reason is the demonstration's own case, in which one person directs agents and must be able to change the rules without a commit written by hand. |
| The refusals and the witnesses that changed with the withdrawal | An agent's change under the one controller is reserved when the three conditions hold and that controller signed the `merge`. | Section 12.1.4a, "An agent's change whose controller is the sole controller"; section 13.15, Part C and question 1; section 14, one row corrected; the opening, one row of the sweeps of revision 25 | The same. |
| The instruction to the source | Withdrawn. `judgeExtents` keeps the clause. | The opening: "What revision 26 changes for the I3 source", and the row of the extents milestone; section 12.1.4a: "The source keeps the clause", and "How the rule `judge` judges extents" | The same. |
| Keep the declaration false by default, the observed count of one active controller, that controller's signed `merge`, and every other extent, check and obligation of independence | Each is kept, and is restated beside the three conditions. | Section 12.1.4a, "The exception, in the planner's words" | The verdict. |
| Keep the controller relation replayable | Stated: membership holds the relation in the fixed party `controller` of an agent's item `member`, and a replay derives it. The destination retains no observation of an author. That is the missing form 15, with its owner. Until it exists the second clause is shown for nobody. | Section 12.1.4a: "What makes the relation replayable", and the list of missing forms; section 12.1.5; section 14, one new row | The verdict. No row of this note states the retained input, so it is named as owed and nothing is designed. |
| The four questions for the planner | Each is marked answered, with its answer. Questions 2, 3 and 4 are decided as revision 25 wrote the text. | Section 13.15; section 13.16; sections 12.1.4 and 12.1.4a, three passages | The planner's act `5a036318`, as the instruction gives its content. |
| The duty of the source on the body of an outcome's evidence | Recorded as an owed row of the source. Not designed. | The opening, "What revision 26 changes for the I3 source"; section 13.16 | The verdict names it as a duty of the implementation. |
| The family of the finding | One sweep, in 14 rows, and one search for a sentence that states the exception without the clause. | The opening, "The sweep of revision 26" | Asked. |
| The standing of this note | Revision 25 was reviewed and is not adopted. Revision 26 is proposed. | The opening: the row for R3 of "The standing in force", and "Status" | The rule of revision 24. |

**Each passage of the main note that revision 26 changed.** A script
made this table from the difference between the two revisions. Every
place holds the words "revision 26". Line numbers are those of
revision 25 at `a1d18e517`. "New" is text that is added after the
line named. "Changed" is a line that gained or lost words. Words of
revision 25 were taken out in four places, and each says beside it
what was there: the first line of the opening; the row of the extents
milestone; "The exception, in the planner's words"; and the sentence
on `judgeExtents` under "How the rule `judge` judges extents".

| Lines of revision 25 | Where | The change |
|---|---|---|
| 7 | The opening | 1 line changed |
| After 546 | The opening | New: 41 lines |
| 562 | The opening | 1 line changed |
| After 614 | The opening | New: 7 lines |
| After 822 | The opening | New: 84 lines |
| 836 | The opening | 1 line changed |
| 850 | The opening | 1 line changed |
| 979 | The opening | 1 line changed |
| After 8676 | Section 12.1.4 | New: 5 lines |
| After 8930 | Section 12.1.4a | New: 4 lines |
| After 9013 | Section 12.1.4a | New: 2 lines |
| After 9096 | Section 12.1.4a | New: 10 lines |
| After 9191 | Section 12.1.4a | New: 4 lines |
| 9195 | Section 12.1.4a | 1 line changed |
| After 9265 | Section 12.1.4a | New: 4 lines |
| After 9289 | Section 12.1.4a | New: 3 lines |
| 9301 | Section 12.1.4a | 1 line changed, 1 added |
| 9304 to 9314 | Section 12.1.4a | 11 lines changed, 26 added |
| 9317 to 9332 | Section 12.1.4a | 16 lines changed, 49 added |
| After 9342 | Section 12.1.4a | New: 2 lines |
| 9442 to 9443 | Section 12.1.4a | 2 lines changed, 5 added |
| After 9522 | Section 12.1.4a | New: 15 lines |
| After 9765 | Section 12.1.5 | New: 4 lines |
| 12566 | Section 13.15 | 1 line changed |
| After 12595 | Section 13.15 | New: 3 lines |
| After 12623 | Section 13.15 | New: 3 lines |
| 12627 to 12630 | Section 13.15 | 4 lines changed |
| After 12641 | Section 13.15 | New: 41 lines |
| 12742 | Section 14 | 1 line changed |
| 12745 | Section 14 | 1 line changed, 1 added |

## The rows of the section "Revision 25" that this revision overrides

No line of that section is edited. Line numbers are those of this
file.

| Lines | The row | What it says | What holds from revision 26 |
|---|---|---|---|
| 2876 | "One row for each thing that is asked": the planner's words on the exception | The one controller is the author, and the clause on the controller of an agent is withdrawn. | The clause is not withdrawn. The one controller is among the authors, or is the controller of an agent among them. The rest of the row holds: the declaration may be made at any time. |
| 2981 | "Rules that this revision makes narrower or stricter": who may use the exception | Revision 25: the one controller, where that member is among the authors. Stricter. | The cell of revision 24 in the same row is the rule. Nothing is made stricter. |
| 3002 to 3006 | The paragraph under that table | Three things are taken away, and the second is that the controller of an authoring agent no longer uses the exception without being an author. | Two things are taken away. The controller of an authoring agent uses the exception as revision 24 has it. |
| 3015 | "What is asked back": four questions, of the planner | Asked. | All four are answered, by the act `5a036318`. Nothing of them is asked back. |
| 3016 | "What is asked back": of I3 | To change four things that the source has otherwise, and the third is the exception for the controller of an agent in `judgeExtents`. | Three things. `judgeExtents` keeps the clause, and nothing of it is asked for the exception. |
| 3074 to 3075 | "What the adversarial reading checked": an agent of the one controller | Not reserved, unless the controller is an author. | Reserved when the observed rules declare the exception, membership shows that one controller, and that controller signed the `merge`. Not reserved otherwise. |
| 2985 | "Rules that this revision makes narrower or stricter": a repository before its first `publish` | This note's reading. Asked of the planner. | Decided by the planner: the three extents of the first definition, from before the first `publish`. |
| 2833 to 2835 | The counts: 14 rows of missing forms, of which 5 are owed | So in revision 25. | 15 rows, of which 6 are owed. |

## Rules that this revision makes narrower or stricter, or states more exactly

| Rule | Revision 25 | Revision 26 | Why |
|---|---|---|---|
| Who may use the single-controller exception | The one controller, where that member is among the authors | The one controller, where that member is among the authors or controls an agent among them | The planner's act `5a036318`. Wider than revision 25, which is not adopted, and exactly as wide as revision 24, which is in force. |
| What shows that the one controller controls an authoring agent | Not stated, in revision 24 or in revision 25 | Only an observation that the reservation's entry retains. None is retained today, so the clause is shown for nobody until the missing form 15 exists. | This note's own choice, and no decision of the planner. Its reason: a replay must derive the relation from membership's history, and a permission must not rest on a caller's word. It fails closed. In effect it is narrower than revision 24 until the form exists. No exception is judged before the missing form 11 exists in any case. |
| A link that leaves the tree | Never met. The note's reading, asked of the planner. | Never met. Decided. | The planner's act `5a036318`. No change of the rule. |
| A changed path that is no text | Not met, with `rules` named. The note's reading, asked of the planner. | The same. Decided, until IA carries such a path's name. | The same act. No change of the rule. |
| A repository before its first `publish` | The three extents of the first definition. The note's reading, asked of the planner. | The same. Decided. | The same act. No change of the rule. |

Nothing may be done by a person, a worker or an agent that the
adopted revision 24 does not allow. One thing that revision 25 took
away is given back: the one controller of a repository whose rules
declare the exception may land an agent's change to the `rules`
extent by a signed `merge`, where that member controls the agent.

## What is asked back

| Asked | Of |
|---|---|
| The row of the missing form 15, with its bound: an observation of each authoring agent, with its controller, that the outcome of `judge` retains. And from which retained record the destination reads that relation where it refuses a review. | This note's next revision, with the contract for the bound, R4 for the number and R2 for what a lane carries |
| To keep the clause in `judgeExtents`, and to fill its input for the second clause only from a retained observation, once the row exists. To supply deterministic evidence of the request's context in the generic driver, and to compare with that context, wherever an owner's rule checks the body of an outcome's evidence. | I3 |
| The identifiers of the planner's two acts on a symbolic link. | The builder, for the next revision |
| Everything that the section "Revision 25" lists as asked back and that the table of overridden rows does not close. | As that section says |

## What the adversarial reading checked

**The restored clause. Can a member now land a change to the rules
alone who could not under revision 24?**

- *The words.* The third condition is revision 24's sentence. Nothing
  is added to it.
- *A repository that declared nothing.* Not reserved. The value is
  false by default, and the clause changes nothing without it.
- *Two controllers, one of whom directs the agent.* Condition 2
  fails. The other controller reviews.
- *The one controller directs the agent, and another member signs the
  `merge`.* Not met. The extent is met by that controller's own
  signed `merge`.
- *The controller's review in place of the `merge`.* It does not
  count. The rule counts no review by the controller of an agent
  among the authors.
- *The checks of the `rules` extent, and the other extents.* Each
  stands. The exception stands for the approvals of the `rules`
  extent alone.

**The relation. Can a caller state it?**

- *A merger who says that an author is their agent.* No member of the
  merge is read for it. The relation is the party `controller` of the
  agent's item in membership.
- *A controller that is changed after the fact.* The party is fixed.
  No row of membership changes it.
- *A source that fills the input from somewhere else.* The rule may
  show the clause only from an observation that the entry retains.
  None is retained, so the clause is shown for nobody. That is
  stricter than revision 24 in effect, and it is stated as this
  note's choice.
- *The same relation where a review is refused.* Not established.
  Revision 26 found no passage that says from which retained record
  the destination reads it there. It is listed as open, and no rule
  is changed.

## Limits of this revision

- One delegated author wrote it, for the note's author, with no other
  reader. The opening's table "What revision 26 read" says what was
  read in full, what in part and what by search.
- The planner's act `5a036318` was not read. Its content is as the
  instruction for this revision gives it. The file that was to hold
  the answers holds another assertion of the planner, which says that
  the restoration is owed and that the planner's answers agree.
- The verdict was read as the builder gave its text.
- Sections 6.2, 6.3 and 6.5 of the main note, and the lane forms, were
  not read for how the destination learns the controller of an
  authoring agent. Section 6.5 was read for its first table only. So
  "the destination retains no observation of an author" rests on the
  table of nine rows in section 3.3, on "The evidence of `judge`, and
  what the rule reads" in section 12.1.5, and on a search.
- The missing form 15 is named and not designed. How the destination
  learns which authors are agents is part of what is owed.
- The sweep is a search for stated words, over the lines that
  revision 25 added. A narrowing or a widening that is worded
  otherwise was not found by it.
- The I3 source was read by search in one file. Nothing of it was run
  or changed.
- Nothing of section 12.1.4a is in force for a source before a
  successor of revision 24 is adopted.
- Nothing was run. The scripts that revision 26 ran listed the lines
  that revision 25 added, counted rows and headings of the main note,
  and listed its changed lines.

# Revision 27

It is on revision 26 at `f7175296cd0750df6629b72fc5cd073ed2ec6bff`,
which is adopted and in force, as the builder's instruction for this
revision states. It is written so that the I3 source can complete the
destination and a founding. Design only: nothing of the project was run,
built, installed or probed.

Revision 27 states the rows that four forms of the scope contract's
revision 21, at `b68ce5e3c2c98e6064fbb8af8859bf4020fcc42c`, need from
this note. That revision of the contract is not adopted: it is under
repair as revision 22, after the verdict `dc1da38a`. So each row that
uses one of its forms says so in the main note, and takes effect only
when a contract revision that carries the form is adopted. The main
note's opening, "The rows of revision 27, and when each takes effect",
names the row of revision 26 that stays in force until then.

Revision 27 has two commits. The first, at `8fa5954a6`, was not filed:
at its numbers the rows of `judge` did not fit an entry by the declared
types, and it carried the source of the revision of the rules. The
second commit decides both, restates the rows of the branch against the
contract's revision 22 at `a1c709e46431f1d891fe12382eca472b5e339cbc`,
which is filed, in review and not adopted, and brings the ten asks of
the contract to five. The section "The second commit", below, has a row
for each. Everything else in this section describes revision 27 as it
stands after both.

Revision 27 holds all of revision 26, with the changes below and nothing
else. It changes no row, no byte and no digest of either pinned lane
definition. It adds no gate, no timed rule, no suite and no test quota.
It adds one section to the main note, 13.17, which is the index. The
facts file is unchanged: no fact of it changed. The sections above are
history, and none is changed: every earlier line of this file is as it
was. Where a row of the section "Revision 25" or "Revision 26" no longer
holds, the table "The rows of earlier sections that this revision
overrides", below, names it and says what holds.

Counts, each made by a script over the main note after the edits, with
the same script run over revision 26 for the earlier number: 15 rows of
missing forms in section 12.1.4a, as before, of which 4 are answered by
the planner, 5 are given as rows, 1 is given in part, 1 is given by a
sibling and 4 are owed; 29 rows in the table of forms and 57 cells that
begin "Code", each as before; 27 further marks, where revision 26 had
26; 113 rows in section 14, where revision 26 had 101; 84 headings,
where revision 26 had 83; and 10, 17, 11, 3, 8, 12, 5, 5, 5 and 4 rows
in the ten tables of section 13.17. The difference between the two
revisions has 71 places. The main note's opening, "The counts of
revision 27", says how each was counted, and has the sums of the
reservations.

## One row for each thing that is asked

| Asked | The change | Where | Why |
|---|---|---|---|
| The basis, in the one status table | The table is restated: this note's revision 26 adopted and in force; the contract's revision 19 adopted, and its revision 21 not adopted, with what its verdict credited and what it asked to change; the lane forms' revision 15 and the recovery design's revision 9 adopted; the I3 source on main. Four stale sentences are dated beside the text. | The opening: "The standing in force", "Status", and four places that the sixth sweep lists | The instruction, and the rule of revision 24 |
| Part A: the founding commit and the receipt's commit, part by part, with exact bytes | Seven lines for each, with each part's bytes; the text of a fact as its canonical JSON, at most 237 bytes on one line; the two ref names, with their fixed parts and the 64 lower-case hexadecimal characters of the fact's hash; a made-up case with its two commit IDs | Section 12.1.5, "The founding commit and a receipt's commit, byte for byte"; sections 6.10 and 12.2, one note each | The delta ER9. The contract's revision 21 answers this note's ask 4 (its section 3; its section 15.3g). |
| Part A: the operations that each opens, their evidence, and the rules `first-head` and `receipt` as rows | One table of two columns: the place, what each reads, what each yields for each value of `seen`, `most`, the holder of each operation, and the names. The evidence bodies are revision 25's. | Section 12.1.5, "The rules `first-head` and `receipt`, whole"; section 12.1.8, row e | The deltas ER9 and FA14 |
| Part A, FA6: where a receipt's records stand, with the reason, and the rows that change | On an item of its own, `receipt`. The slot `publication.receipt` is withdrawn, and `publication.token` serves a push alone. `resend` is on an `unresolved` publication, and a new act `resend-receipt` is on the branch. One guard of `reserve` keeps a place for each receipt. | Section 12.1.5: "Where a receipt's records stand", "The rows that change, and three new acts", and cases f to l | The delta FA6. The contract keeps the rule that a final item takes no effect (its section 6.6; its section 15.6t, the row FA6). |
| Part B: the rows of `observes` for the table of section 3.3 | Ten rows, each with its kind, source, `max`, window, use, and what follows with no observation | Section 3.3, "The rows of `observes`" | The contract's section 16.1 of its revision 21; the deltas FC4 and FC6 |
| Part B: the license result reads both members always | Rows 6 and 7 | The same | The contract's point R1-69 |
| Part B: the first and the second step of `judge`, with the missing forms 11 and 15 | Rows 1 to 5. Row 3 is the holders of `rules.publish`. Row 4 is each author as a member. The record from which a controller's review of their own agent's change is refused, which revision 26 listed as open, is row 4. | Section 3.3; section 12.1.4a, five notes and "The missing forms, after revision 27"; section 12.1.5, "What the rule `judge` reads, with the missing forms 11 and 15" | The deltas FA9 and FC6; the verdict `f456b67c` on revision 25, which asked that the relation stay replayable |
| Part B: the three changes of section 6.5, with its affected passages whole | Five passages are rewritten in one block: the opening, the fetch, a job that is not required, custody and replay, and the cost. Each reason of the section is set against its inputs. | Section 6.5, "Section 6.5 in the contract's order of reads" | The planner's act `39749e26`, answer a; the contract's section 16.1, "The order of the reads, and the judge of a destination" |
| Part B: the `origin` of each kind of outcome | `judge` states `origin: "rule"`. No other kind of the destination, of the register or of the directory states one. | Section 12.1.5, "What each kind of operation states" | The delta FC3, as the contract's revision 20 decides it |
| Part B, in the second commit: the rows of `judge` fit an entry | 65 authors and 8 keys. A table of eight parts, 248,629 bytes at the most against 262,144. | Section 3.3, "The size of the outcome of `judge`" | The contract's check 7. The builder's instruction for the second commit. |
| Part B: `retains`, the byte domain and the bound of the extents, and what a reader of the rules gets | The domain `artroom-rules-extents-1`, with a bound of 262,144 bytes on one value, and a table of five readers | Section 12.1.4, "A second byte domain" and the table of readers; section 3.3, row 1 | The delta FB2; the contract's section 16.1 of its revision 21 |
| Part C: `holds` for a publication and for a branch, and `adds` for `resend` and `adopt-head`, each count derived from the rules | Two tables of counts, each with "Why no more"; a table of what five acts add; and a table of amounts | Section 5.8, "The reservations of the platform definitions, in the contract's forms"; section 12.1.5, "What a holder holds" | The deltas FA3, FC1 and FC2; the row P11 |
| Part C: the three faults of the old table | One read for an operation; a row for `resend`; the receipt at 32 entries, with its rule | Section 5.8, the table "What the old two rows got wrong"; section 12.1.5 | The delta FC1, rows 4 to 6 |
| Part C: the arithmetic by a script, labelled as sums | 74 entries for a publication and 64 for a branch, with each act's addition, by one script | Section 5.8, "The amounts, as sums"; the opening, "The counts of revision 27" | Asked |
| Part C: `settles` on the rows that the contract says need it | Four declarations of membership. None for the register and the directory, with the reason for each. | Section 5.8, "`settles` on the rows of membership"; sections 12.1.1 and 12.1.3, one note each | The delta FC2, its second finding |
| Part C: the fault when a draw passes a count, the read that shows it, and the way out | The record `Stopped`, and the acts `add-room` and `add-branch-room` | Section 12.1.5, "A draw past a count" | The planner's act `1f8aba72`, answer 1 |
| Part D: the missing form 14 | Nothing remains to give | Section 13.17, Part D | Asked, "if any" |
| Part D, ask 2: no effect of a refused deciding entry | This note's ask for one is withdrawn. Ten places that waited on it are dated. | Sections 5.8, 12.1.5 and 14 | The contract declines the place (its revision 19, section 15.6s; its revision 21, section 15.3g) |
| Part D, ask 6: a list as a member of a record | One of the two reasons for the mark `extent-list` falls away. The type stays a mark. | Section 12.1.4; section 12.1.8, row P28 | The contract's section 6.2, point DF1, adopted since its revision 13 |
| What is carried, in one table with nothing decided | 12 rows, of which the first three say what the next revision must state | Section 13.17 | Asked |
| What each decision lets the I3 source do next, by plan step and deltas entry | 11 rows | The opening, "What revision 27 lets the I3 source do next" | Asked |
| The sweeps, the counts and what was read | Seven sweeps, 17 counts and 11 rows of readings | The opening | Asked |

**Each passage of the main note that revision 27 changed.** A script
made this table from the difference between the two revisions. Line
numbers are those of revision 26 at `f7175296c`. "New" is text that is
added after the line named. "Changed" is a line that gained or lost
words. Words of revision 26 were taken out in two places, and each says
beside it what was there, or is the restated table: the first line of
the opening, and the table "The standing in force" with the paragraph
above it. Every other changed line is a row of a table that gained a
note of revision 27 at its end.

| Lines of revision 26 | Where | The change |
|---|---|---|
| 7 to 8 | The opening | 2 lines changed, 1 added |
| After 587 | The opening | New: 82 lines |
| 591 to 597 | The opening | 7 lines changed, 1 added |
| 601 to 604 | The opening | 4 lines changed, 1 added |
| After 618 | The opening | New: 7 lines |
| After 628 | The opening | New: 4 lines |
| After 655 | The opening | New: 9 lines |
| After 870 | The opening | New: 203 lines |
| After 872 | The opening | New: 2 lines |
| After 957 | The opening | New: 3 lines |
| After 1568 | Section 3.2 | New: 10 lines |
| After 1941 | Section 3.3 | New: 5 lines |
| After 1964 | Section 3.3 | New: 7 lines |
| After 2152 | Section 3.3 | New: 161 lines |
| 4966 | Section 5.8 | 1 line changed |
| After 4987 | Section 5.8 | New: 7 lines |
| After 5064 | Section 5.8 | New: 3 lines |
| After 5271 | Section 5.8 | New: 231 lines |
| 5345 | Section 5.8 | 1 line changed |
| After 5364 | Section 5.8 | New: 8 lines |
| After 5377 | Section 5.8 | New: 3 lines |
| After 6928 | Section 6.5 | New: 5 lines |
| After 7021 | Section 6.5 | New: 169 lines |
| After 7210 | Section 6.10 | New: 9 lines |
| After 8155 | Section 12.1.1 | New: 4 lines |
| 8582 | Section 12.1.3 | 1 line changed |
| 8602 | Section 12.1.3 | 1 line changed |
| After 8633 | Section 12.1.3 | New: 3 lines |
| After 8643 | Section 12.1.3 | New: 2 lines |
| 8660 | Section 12.1.4 | 1 line changed |
| 8667 | Section 12.1.4 | 1 line changed |
| After 8692 | Section 12.1.4 | New: 17 lines |
| After 8766 | Section 12.1.4 | New: 9 lines |
| After 8831 | Section 12.1.4 | New: 50 lines |
| 9207 | Section 12.1.4a | 1 line changed |
| 9222 | Section 12.1.4a | 1 line changed |
| 9245 | Section 12.1.4a | 1 line changed |
| After 9565 | Section 12.1.4a | New: 7 lines |
| After 9584 | Section 12.1.4a | New: 3 lines |
| After 9655 | Section 12.1.4a | New: 4 lines |
| After 9729 | Section 12.1.4a | New: 5 lines |
| After 9738 | Section 12.1.4a | New: 5 lines |
| 9749 | Section 12.1.4a | 1 line changed |
| After 9784 | Section 12.1.4a | New: 18 lines |
| After 9825 | Section 12.1.5 | New: 3 lines |
| After 9874 | Section 12.1.5 | New: 6 lines |
| After 9979 | Section 12.1.5 | New: 7 lines |
| After 10034 | Section 12.1.5 | New: 5 lines |
| After 10166 | Section 12.1.5 | New: 2 lines |
| After 10236 | Section 12.1.5 | New: 7 lines |
| After 10292 | Section 12.1.5 | New: 465 lines |
| After 11642 | Section 12.1.8 | New: 13 lines |
| 11703 | Section 12.1.8 | 1 line changed |
| 11711 | Section 12.1.8 | 1 line changed |
| 11717 | Section 12.1.8 | 1 line changed |
| 11720 to 11721 | Section 12.1.8 | 2 lines changed |
| 11771 | Section 12.1.8 | 1 line changed |
| 11775 | Section 12.1.8 | 1 line changed |
| 11808 | Section 12.1.8 | 1 line changed |
| 11811 | Section 12.1.8 | 1 line changed |
| 11832 | Section 12.1.8 | 1 line changed, 1 added |
| After 11872 | Section 12.1.8 | New: 10 lines |
| After 11894 | Section 12.1.8 | New: 9 lines |
| After 11912 | Section 12.1.8 | New: 5 lines |
| After 11969 | Section 12.2 | New: 7 lines |
| After 12785 | Section 13.15 | New: 4 lines |
| After 12918 | Section 13.16 | New: 4 lines |
| After 12954 | Section 13.16 | New: 159 lines |
| 12997 | Section 14 | 1 line changed |
| 13023 | Section 14 | 1 line changed |
| 13059 | Section 14 | 1 line changed, 12 added |

The new lines after line 12954 are the new section 13.17. The longest
passage of new lines in the opening holds five things: the rows and when
each takes effect, what the source can do next, the sweeps, the counts
and what was read.

## The second commit

| Asked | The change | Where | Why |
|---|---|---|---|
| EQ8: decide the source of the revision of the rules | A reference slot `published` on the item `rules`, of the type `fact`, which `publish` sets from `self`. The revision is its position, and 0 before the first `publish`. The answer of a rules scope to an observation, as "rules" and as "definitions", and what a replay derives. | Section 12.1.4, "The revision of the rules, and the answer to an observation"; two rows of its tables | The deltas EQ8 and FB10. Both forms are of the adopted contract: membership sets `revokedBy` so. |
| FA8: the source of `rules` in a `publication` update | The revision of the rules observation that the reservation's entry retains | Section 12.1.5 | It follows from the row above. |
| The rows of `judge` must fit an entry by the declared types, with the evidence | 65 authors and 8 keys, with the sizes in a table by a script: 248,629 bytes against 262,144, a margin of 13,515. A reservation that needs more is `not-reserved`, `evidence-too-large`, which is the name that section 6.5 has. | Section 3.3, "The size of the outcome of `judge`", and the rows 4 and 5 of its table | The contract's check 7 |
| What makes it fit, first | One mark of membership, `action-list`, at place 3: a name of an action is 1 to 64 bytes of lower-case letters, digits, a hyphen and a full stop. With it an observation of a key is at most 5,718 bytes, where it was 26,198 by the types alone. | Sections 3.2 and 12.1.3; section 12.1.8, row aa and the table under the rows s to z | Computed first: by the types alone one key fits beside 65 authors. |
| What makes it fit, second | The changed set of the evidence is kept under a digest, in a domain that the destination declares, `artroom-changed-set-1`. | Section 12.1.5, "The changed set, kept under a digest"; section 12.1.4a, one note | Its bound was 256 KiB, the size of a whole entry. The adopted contract has the form: evidence under a digest, apart from its entry. |
| The branch and `adopt-head`, against the contract's revision 22 | Restated: the branch holds `first-head`, `adopt-head` is on the branch and adds `adopt-read`. The guard of `adopt-head` is written without `also.branch`. | Section 12.1.5 | That revision's sweep, row 3, and its section 17.3 |
| The carried rows of `withdraw` and of `compromised`, with exactly what each will need | `decisions`, `bound`, the selector `publication-of` and an index by `operation`; and `settles` with `sets: "aborting"`. A sum of 248 entries that the next revision must weigh. | Section 13.17, the table of what is carried | The planner's act `2d3fa911`; the contract's revision 22 |
| The `settles` of membership, against the rule that a settling form's rule sets no state | Checked: none of the four has a rule that returns a change of state. | Section 5.8 | The same act |
| The ten asks, against the contract's revision 22 | Five are kept and five are withdrawn, each with its reason. | Section 13.17 | Asked |
| One more question for the planner | The numbers of approvals, checks and authors that one reservation may carry | Section 13.17 | Asked |
| The status table, and what the source can do next | The contract's revision 22 is filed and in review, and revision 21 is superseded by it. The rule `judge` waits no longer on the delta EQ8 or on an ask. | The opening | Asked |

Words of the first commit were taken out in these places, and each is
replaced by the text that the rows above name: the passage of section
3.3 that said the two numbers wait; the asks 4, 5, 8, 9 and 10 of
section 13.17, which are listed there as withdrawn; the row of what is
carried for the delta EQ8; and two points of section 12.1.5, on a kind
that only an `adds` lists and on a final holder. The first commit is in
the history of the branch.

## The rows of earlier sections that this revision overrides

No line of those sections is edited. Line numbers are those of this
file.

| Lines | The row | What it says | What holds from revision 27 |
|---|---|---|---|
| 3012 | The section "Revision 25", "What is asked back": of the contract | Eight things are asked, among them an effect of a refused deciding entry, the member `extents`, the holders' observation, and the text of a fact with a byte domain. | The contract's revision 21, which is not adopted, answers each: the main note's section 13.17 has the table. The ask for an effect of a refused deciding entry is withdrawn. No byte domain is asked for a fact's digest. |
| 3220 | The section "Revision 26", "Rules that this revision makes narrower or stricter": what shows that the one controller controls an authoring agent | None is retained today, so the clause is shown for nobody until the missing form 15 exists. | The row is given: row 4 of "The rows of `observes`". It takes effect with a contract revision that carries the form. Until then the cell stands. |
| 3235 | The section "Revision 26", "What is asked back": the row of the missing form 15, and the record from which a review is refused | Asked of this note's next revision. | Given, as that row 4. The bound of the row waits on the contract (ask 9). |
| 3132 to 3134 | The section "Revision 26", the counts: 3 missing forms given as rows and 6 owed | So in revision 26. | 5 given as rows and 4 owed. |

## Rules that this revision makes narrower or stricter, or states more exactly

Each row says on what the change rests. No row rests on a reading of a
person's words.

| Rule | Revision 26 | Revision 27 | Why, and on what it rests |
|---|---|---|---|
| Where a receipt's token and state are recorded | On the `published` publication, which cannot take them | On an item `receipt` | The contract's rule on a final item, which is adopted. Revision 26's rows could not run (the delta FA6). Nothing that could be done is taken away. |
| What a `resend` may act on | An `unresolved` publication, or a `published` one whose receipt is not written | An `unresolved` publication. A receipt that is owed, by `resend-receipt`. | The same. The second half of the old rule was refused `final` in the source. |
| A `reserve` at a destination with 65 receipts owed | Admitted | Refused `receipts-owed` | This note's choice. Stricter. Its reason: the entry that opens a receipt cannot be refused, so a place under the type's `max` must be kept by one that can. Put to the planner. |
| How many reads one push operation opens | One after each outcome that decides nothing while no attempt is open | At most one | This note's choice, so that a count can be an upper bound (the delta FC1, row 4). Stricter. A `resend` adds one. |
| A `reserve` that lists 65 to 126 verdicts | Could be reserved | Refused `bad-field` | Not a choice of this note: the contract fetches a fact only under a written type, and bounds a list type at 64. Stricter. It takes effect only with the contract's form. Asked of the contract, and put to the planner. |
| A `reserve` that names more entries than the bound | The publication ends `not-reserved`, `evidence-too-large`, by an update | The request is refused `bad-field`, and no publication is opened | The planner's act `39749e26`, answer a; the contract's point DH4. As wide as before: the same messages are stopped, at another place. |
| The keys that one reservation may ask | All the observations of one entry together, to the contract's ceiling of 128, with no check that they fit an entry | 8 distinct keys behind approvals and listed checks, beside the merger's key, the holders and up to 65 authors | The contract's check 7: the entry of an outcome must fit by the declared types. Narrower. The number is a proposal for the proof plan, and is put to the planner. |
| A name of an action, in a role list and in `set-actions` | Any text of at most 64 bytes | 1 to 64 bytes of lower-case letters, digits, a hyphen and a full stop | This note's choice, so that an observation of a key has a size that fits. Stricter. Every name of an action in this note passes it. |
| Where the changed set of a reservation is kept | Inside the evidence, in the outcome's entry | Under a digest, apart from the entry, with the same bound | The adopted contract's form for evidence under a digest. The same changed sets are judged. |
| A checker of another repository, in `publish` | Refused `not-a-checker` | Refused `bad-field` | The contract's form of `observes`. It takes effect only with it. The same act is refused, with another name. |
| The reason `evidence-too-large`, for a count of entries | One case | No case. The evidence `{ over: "entries" }` is withdrawn. | It follows from the row above on `reserve`. |
| What the register reserves for a pending claim | 44 entries, as a sum | 80 entries, as a sum | The contract's counting by outcome entry, which the planner accepted (the act `39749e26`, answer b). The rule opens no more than before. |
| What an invitation reserves | The join, with the records of one key and one member | The closure of the join: the new key's revocation and notice, the new member's removal and the inbox's creation | The contract's row 3 with its closure, which is adopted. More is reserved. Nothing more is opened. |

Nothing may be done by a person, a worker or an agent that the adopted
revision 26 does not allow, but for three acts that an admin may sign
with the grant `ledger.retry`, which an admin holds already:
`resend-receipt`, `add-room` and `add-branch-room`. The first replaces
the half of `resend` that could not run. The other two add room to a
reservation and decide nothing.

## What is asked back

| Asked | Of |
|---|---|
| Five things, each with the smallest change that would do: a longer list type for a `collect` list; whether a field that names the source entry counts again; a holder that is final when it is opened; a release for a holder with no final state; and a `settles` whose subject a mark binds | The contract, after its revision 22. The main note's section 13.17 has the table, and the five asks of the first commit that are withdrawn. |
| Four questions: the bound of 64 verdicts; whether a destination with 65 receipts owed refuses a `reserve`; whether `reserve` should name each selected report; and how many approvals, checks and authors one reservation may carry | The planner |
| To confirm the table "Which member of which entry holds each fact", and to say how the authors are read from the manifest's entry. What a member sees at the lane for a publication whose destination shows `Stopped`. | R2 |
| Every number of this revision, and first the sizes of the table in section 3.3, with its allowance of 16,384 bytes | The proof plan, with the request `cc570904` |
| To check the two tree IDs, the made-up commit and each ref name with Git | The builder |
| To build rows 6 and 7 of "The rows of `observes`" | IA |
| The rows of `withdraw` and of `compromised`, once the contract's revision 22 has its verdict, with the sum that the table of what is carried names; and each other row of that table | This note's next revision |
| Everything that the section "Revision 26" lists as asked back and that the table of overridden rows does not close | As that section says |

## What the adversarial reading checked

**The receipt's item. Can a receipt now be lost, written twice, or hold
the branch?**

- *The publishing entry cannot open the item.* It can: the guard of
  `reserve` keeps a place for it, and the publication holds 1 item for
  it. A draw past either is a fault that stays offered, and is shown.
- *A second receipt for one publication.* The item is opened by the
  entry that makes the publication `published`, which happens once. A
  `resend-receipt` opens an operation for the same item, and the write
  is the same create of one ref.
- *A receipt that holds the slot.* It holds no slot and no place of the
  type `publication`. It holds a place of its own type until it is
  `written` or `conflict`.
- *A `resend-receipt` on a receipt of another branch.* A destination has
  one branch, and the act names an item of its own scope.

**The count of controllers. Does a count permit anything?**

- *One controller, no declaration.* No exception. The rule reads the
  declaration first.
- *A declaration, two controllers.* No exception.
- *A holders observation that lists one ID and counts two.* The rule
  reads `count`.
- *A merger who is no controller.* The extent is met only by the one
  controller's own signed `merge`.

**The authors' observation. Can a caller state who controls an agent?**

- *The rule names the authors from the manifest's entry, and the scope
  reads each from membership.* The controller is membership's answer at
  the observed head, and a replay derives it.
- *An author of another repository.* Left out, and the rule then counts
  no review where the second point of independence is asked.
- *More authors than the row's `max`.* The row is over, and the
  publication is not reserved.

**The fetch at the delivery. Can an entry now be read that was not
fetched by an entry that could be refused?**

- *A verdict's entry, and a job's two entries.* Each is named under a
  written type of fact, so the contract fetches it at the delivery.
- *A link's entry.* Not fetched, and the rule reads none.
- *The commit of a selected report.* Not at hand in any entry. Stated,
  and carried. It was so before.
- *A message of 130 named entries.* Refused before any is fetched.

**The counts. Is each an upper bound of what the rules open?**

- *A late answer after the last attempt.* It opens no second read, by
  the rule of one read for an operation.
- *A mint that is answered late.* It opens the revocation of its own
  token, which is counted with the mint.
- *The next `judge`.* It draws on the publication that it judges, and
  not on the one whose outcome opened it.
- *A `resend`.* It adds what its one attempt can open.
- *A publication that is withdrawn before its `reserve`.* It is final
  when it is opened, and by the rule of release holds nothing. Asked of
  the contract.
- *A branch that never ends.* It keeps what it did not draw. Stated,
  counted and asked.

**The static size. Do the rows of `judge` fit an entry?**

- *By the declared types, with the evidence.* Yes, from the second
  commit: 248,629 bytes at the most against 262,144. The first commit
  did not fit, and said so.
- *A role list of names with control characters.* It cannot be set: the
  mark `action-list` refuses it. Without that rule one key's observation
  is 26,198 bytes.
- *A changed set of 2,048 paths.* It is not in the entry. Its digest is.
- *The copy of `uses`.* Counted at the contract's bound of 128 records.
- *The rest of the entry.* An allowance of 16,384 bytes, which nothing
  measured. The margin is 13,515 beside it.
- *Nine distinct keys.* Row 5 is over, and the publication is not
  reserved, with `evidence-too-large`.

**The revision of the rules. Can an answer state a revision that no
`publish` made?**

- *Before a first `publish`.* The revision is 0. Position 0 is the
  genesis, so no `publish` has it.
- *A `publish` that is refused.* It writes nothing, and the slot keeps
  the last one.
- *An answer with another revision.* A replay folds the rules scope to
  the head and compares.
- *A provisional rules scope.* It answers none.

**A form of the unadopted contract. Is any row offered as in force?**

- Each block that uses one says so at its head, and the opening names
  what stays in force.
- No row uses `bound`, `decisions` or a `settles` by a mark.

## Limits of this revision

- One delegated author wrote it, for the note's author, with no other
  reader. The opening's table "What revision 27 read" says what was read
  in full, what in part and what by search.
- The contract's revision 21 is not adopted, and it is under repair. A
  form that revision 22 changes changes the rows here that use it. The
  verdict `dc1da38a` was not read: what it credited and what it asked is
  as the instruction states.
- The contract's revision 21 was not read in full. Its sections 6.6, 6.7
  and 9.1 were not read. So three things rest on other passages of it:
  what a clause of a result may read, for rows 6 and 7; how an
  `attribute` effect is recorded, for the authors; and the bound on one
  retained read, for the 262,144 bytes.
- The table "Which member of which entry holds each fact" is a reading
  of the pinned `change` lane as data. The lane forms were not read, and
  R2 has not confirmed it.
- The I3 source was read in two files and one data file. Nothing of it
  was run or changed. The deltas' section 28 was not read.
- No Git command was run. The two tree IDs and the made-up commit were
  computed with a hash function, and the rules of a ref's name are as
  the contract states them.
- Every amount of a reservation is a sum by a script, and none is
  measured. The source counts entries only, so nothing of bytes was
  checked against a source.
- The counts of a `holds` are upper bounds by this note's reading of its
  own rules. No validator and no test has drawn on them.
- Three acts, one item and one guard are new, and one read rule is
  stricter. Each is a proposal until revision 27 is adopted.
- The contract's revision 22 was read in part, for the second commit:
  its opening passage, four passages that the opening's table names, and
  a search for each ask. It is in review, and a change to it changes the
  rows here that use a form which it carries.
- The sizes of section 3.3 are sums over records that a script built
  from the declared types. The allowance for the rest of the entry is
  this note's guess, and the contract leaves the size of an entry's
  header to the proof plan.
- The mark `action-list` and the digest of the changed set are new in
  the second commit. No source has either.
- The sweeps are searches for stated words over the added lines. A fault
  that is worded otherwise was not found by them.
- Nothing was run. The scripts that revision 27 ran applied the edits,
  listed the added lines, counted rows and headings of the main note,
  compared the cells of each table with its header, made the sums of the
  reservations and the sizes of the largest records, and computed the
  hashes of made-up values.

# Revision 28

It answers the verdict `af0d0a5e` on revision 27 at
`1f3cfca5e3cf72c01ccf94721d5111c672dd8a9b`, which asked for changes.
Revision 27 is not adopted, and revision 26, at
`f7175296cd0750df6629b72fc5cd073ed2ec6bff`, is the text in force. Design
only: nothing of the project was run, built, installed or probed.

Revision 28 holds all of revision 27, with the changes below and nothing
else. Each changed passage of the main note says "revision 28". It
changes no row, no byte and no digest of either pinned lane definition.
It adds no gate, no timed rule, no suite and no test quota. It adds no
mark, and it changes no count of the main note's section 5.8. It adds
one section to the main note, 13.18, which is the index. The facts file
is unchanged: no fact of it changed. The sections above are history, and
none is changed: every earlier line of this file is as it was. Where a
row of the section "Revision 27" no longer holds, the table "The rows of
earlier sections that this revision overrides", below, names it and says
what holds.

The scope contract in force is its revision 19, at
`1ca8a59bf6b88f6f38b18b2fe36ae5d2cd2afb7e`. Its revision 23, at
`3b3e394fc6807c33211ac80db813621253c38f5c`, is filed and in review, and
supersedes its revisions 20 to 22. Where the section "Revision 27" says
"a contract revision that carries the form", revision 23 is one, when it
is adopted.

Counts, each made by a script over the main note after the edits, with
the same script run over revision 27 for the earlier number: 30 rows in
the sweep of the family, of which 6 are repaired and 1 is stated; 8
rules of a token; 20 cases in section 12.1.5, where revision 27 had 12;
129 rows in section 14, where revision 27 had 113; 85 headings, where
revision 27 had 84; 57 cells that begin "Code" and 27 further marks,
each as before; and 14, 7, 8, 3, 3, 3 and 3 rows in the tables of
section 13.18. The outcome entry of `judge` is at most 236,087 bytes and
the entry that records a `reserve` at most 193,612, each as a sum by a
script against 262,144, and neither is measured. The main note's
opening, "The counts of revision 28", says how each was counted.

## One row for each thing that is asked

| Asked | The change | Where | Why |
|---|---|---|---|
| Finding 1: a mint's outcome must know that its target is final | Three words: the target of a write, a closed target, and the holder of a mint. Eight rules, T1 to T8. A `confirmed` mint whose target is closed, or whose attempt has an outcome, records `{ token, ends }` in its own outcome and opens the revocation, and sets no slot. | Section 12.1.5, "A token whose write can no longer act, and who cleans it up"; the row `mint` of "What each rule of an outcome yields" | The verdict. The adopted contract: no effect changes an item that was final before the entry, and such an effect of an outcome's rule is a fault. |
| Finding 1: where the minted token's record stands | In the mint's own `confirmed` outcome entry, with the revocation that the ledger holds, found from one of three opening entries. The slot says only which token is in use, and on a final item it is history. One derived read, `Tokens`, for an operator. | The same block, "Where the record of a token stands"; "Six more slots", one note | The verdict: a replay and an operator must find and revoke it. |
| Finding 1, the other order: reconcile "a revocation inherits its mint's holder" with "an outcome's duty belongs to its own operation's holder" | No entry of one holder opens a revocation for another. The entry that closes a target opens none and touches no token (T6). The first outcome of the token's own attempt opens it (T4), and sets nothing on a target that was final. So the holder of the mint is the holder of the opening entry's operation, and the next `judge` stays the only exception. | The same block, "One holder for each cleanup", with a table of six writes; the tables of kinds, two notes | The verdict |
| Keep: admitted attempts, unknown duties, the provenance of each credential, the first holder of each mint and write | Kept, and said so. An `unknown` attempt stays `unknown`. `not-sent` is written only for a request that the gateway did not send (T7). | The same block, the points under the table of rules | The verdict |
| Do not block recovery behind an unknown read | No guard is added to `resend-receipt` or to `resend`. | The same block; the points under "The rows that change, and three new acts" | The verdict |
| Both serial orders as tables of entries, and the control | Three tables: each entry, its rule and arm, the slot or state that changes, what it opens, and the holder that pays. | The same block, "The verdict's case, in both orders, as entries" | The instruction |
| Sweep the family through sections 12.1.5, 12.1.1 and 12.1.2, with the table in the note | 30 rows: each rule of an outcome and each clause of a result, what it may set, whether it can arrive late, what revision 27 did and what holds now. | The same block, "The family of this fault, swept"; sections 12.1.1 and 12.1.2, one note each | The instruction: reviews of this note find one member of a family in each round. |
| Repair each case found, the same way | A mint for a push after a `resend` and an older read. A mint for a first head after an `adopt-head`. The token's step of a push and of a receipt on a final target. `adopt-read` after a reservation, which now yields only while its act's guards hold. And no further attempt for a closed target, which was not shown to be reachable. | The same block: rows 3, 4, 6, 8, 14 and 16, with cases p, q and r | The same |
| The one holder that reserved the cleanup of each operation | A table of the 8 kinds of the destination, the 3 of the register and the 1 of the directory. | The same block | The instruction |
| Finding 2: `reserve` names each selected report | A sixth field, `reports`: a written list of at most 32 facts of the kind `report` under `issue`. | Section 6.5, "`reserve` names each selected report"; the table of messages in section 12.1; the row `reserve` of section 12.1.5 | The verdict. The planner's act `53ecfb42`, answer c. |
| Bind them exactly to the manifest's selections, and say how a mismatch is refused | The rule `judge` asks the same number and, place by place, the same fact as the member `report` of the manifest's `selected`. A mismatch is `not-reserved`, `evidence-invalid`. No name and no mark is new. | Section 6.5 | The verdict |
| Fetch and retain at delivery, copy through `uses`, derive each commit in `judge` and in replay | Stated. The evidence member `ancestors` stays as the host's answer on ancestry alone, and a commit in it that no report holds is `bad-input`. | Section 6.5; section 12.1.5, two notes | The verdict |
| The count, with reports, and every carried restatement | 2 + v + j + d + r, at most 2 + v + 2j + r. Each place that said 2 + v + 2j is dated beside the text. | Section 6.5; the opening; section 13.17, two rows | The instruction |
| The ceiling, as an inequality, and the answer over it | v + j + d + r is at most 126, under the contract's 128, which is not raised. Over it: `refused`, `bad-field`, with nothing fetched. A table of eight mixes. | Section 6.5, "The ceiling on the foreign entries of one entry" | The verdict |
| The duplicate policy and the source policy | The count is by naming. A table of four repeats, and a table of where each named entry must come from, with the check and the name of each failure. | Section 6.5 | The verdict |
| The lane's duty to send the reports | Asked of the lane forms: the act `merge`, its first send, one more field. One form is asked of the contract for its source. | Section 6.5, "What the lane must send"; section 13.18 | The instruction |
| The size, recomputed whole, as tables, by a script | Two tables of parts with no allowance, a table of what each value is taken at, and a table of what each entry retains beside itself. 236,087 and 193,612 bytes at the most. 65 authors and 8 keys stand. | Section 3.3, "The size of both entries, recomputed whole" | The verdict: the allowance of 16,384 was a guess, so the margin was no bound. |
| The planner's answers a, b and d | 64 verdicts stand. A `reserve` at 65 receipts owed is refused and not queued. 65 authors and 8 keys stand, with splitting the change as the way out and where a member sees it. | Sections 6.5, 12.1.5 and 3.3; section 13.18 | The planner's act `53ecfb42` |
| The index on `publication.operation`, and its statement by `publication-of` | `indexes` on the item type, and `index` and `key` on the mark, in the form of the contract's revision 23, to take effect only with a contract revision that carries it. The carried row for the binding of a `withdraw` says what is stated and what waits. | Section 12.1.5, "The index on `publication.operation`"; section 12.1.8, row 34; sections 13.17 and 13.18 | The contract's revision 23. The planner's act `2d3fa911`, answer 3. |
| The read of a fault | It is `Stopped`, for a clause of a result as for an outcome. | The same block, its last point | The planner's act `2d3fa911`, answer 1 |
| The object format, and the Git test values | The rule reads the format from `seen` and computes no ID where `seen` is `absent` or `failed`. The writer's input is owed by the I3 source. The test values are said plainly to be unverified, with the witness that checks them. | Section 12.1.5, two points under "The founding commit and a receipt's commit, byte for byte" | The verdict's remarks |
| The status table, and what the source can do next | Restated: the contract's revision 19 adopted and its revision 23 in review; this note's revision 26 adopted and its revision 27 reviewed and not adopted. A table of seven rows for the I3 source. | The opening | The instruction |

## The rows of earlier sections that this revision overrides

No line of those sections is edited. Line numbers are those of this
file.

| Lines | The row | What it says | What holds from revision 28 |
|---|---|---|---|
| 3370, 3479 | The section "Revision 27": the rows of `judge` fit an entry | 248,629 bytes at the most, a margin of 13,515 | 236,087 bytes, a margin of 26,057, with every part listed and no allowance |
| 3542 | "What is asked back": four questions for the planner | Asked | Answered, by the act `53ecfb42`. The main note's section 13.18 has each answer. |
| 3544 | "What is asked back": the sizes, with an allowance of 16,384 bytes | Asked of the proof plan | Asked without the allowance: the two tables of section 3.3 |
| 3594 to 3595 | "What the adversarial reading checked": the commit of a selected report | Not at hand in any entry, and carried | At hand: `reserve` names each report, and the rule derives the commit |
| 3602 to 3603 | The same: a mint that is answered late | It opens the revocation of its own token | So it does, and now also where its attempt has no outcome and its target is closed |
| 3615 to 3616, 3623 to 3624 | The same: the static size | 248,629 bytes, with an allowance of 16,384 and a margin of 13,515 | As the first row |
| 3679 to 3681 | "Limits of this revision": the allowance is a guess | So in revision 27 | No allowance is used. Three values that no listing bounds are assumptions, and are asked of the contract. |

## Rules that this revision makes narrower or stricter, or states more exactly

Each row says on what the change rests. No row rests on a reading of a
person's words.

| Rule | Revision 27 | Revision 28 | Why, and on what it rests |
|---|---|---|---|
| When a `confirmed` mint puts its token in use | Its attempt has no outcome, and the publication is not `aborting` | And the target of the write is not closed | The contract's rule on a final item. Narrower: a token that cannot be used is revoked and not put in a slot. Nothing that could act is taken away. |
| When a request of a write is sent | After its mint's `confirmed` outcome | Only while the slot names that mint and the target is not closed | The same. Narrower. |
| When the first outcome of an attempt empties the slot `token` | Always, when the slot is set | Only where the slot names its own mint and the target was not final before the entry | The same |
| When `adopt-read` sets the head | `seen` is the act's commit | And the guards of the act still hold | The base of a reserved publication must not move. Narrower: the admin signs again. |
| What `reserve` must hold | Five fields | Six: a `reserve` with no field `reports` is `bad-field` | The planner's answer c. It takes effect with the lane's row. |
| Which mixes of verdicts and jobs a `reserve` may name | v + j + d at most 126 | v + j + d + r at most 126 | The contract's ceiling, which is not raised. Narrower by the number of reports. |
| What a reservation needs of its reports | That the runtime found each commit to be an ancestor | That the named reports are the manifest's selections, exactly, and that each commit, read from its entry, is an ancestor by the host's answer | The verdict. Stricter. |

## What is asked back

| Asked | Of |
|---|---|
| Three things beside the five that stand: a send source that gives one member of each record of a list; whether an entry that is named twice has one record in `uses`; and bounds for the ID of a run, the form of a time and the `prepared` of an outcome | The contract |
| One row: the act `merge`, its send `reserve`, one more field `reports`. And the words shown for `evidence-too-large` and for `receipts-owed`. | The lane forms |
| Three questions: whether a reason that names what is counted is enough for answer b; what to do if the contract declines the form of the first ask; and whether an `adopt-head` whose read answers late should change nothing | The planner |
| The rules T1 to T8 and row 16 in source, with a witness for each of the cases m to r; `Tokens`; a witness with Git on a real local repository; the object format as an input of the host port | The I3 source |
| Every number of this revision, with the table of what each value is taken at | The proof plan, with the request `cc570904` |
| Everything that the section "Revision 27" lists as asked back and that the table of overridden rows does not close | As that section says |

## What the adversarial reading checked

**A token. Can one be minted and left with no record, with two
revocations, or with a holder that did not reserve it?**

- *A mint that confirms for a final receipt.* Its outcome is written,
  with the token's ID and end, and opens the revocation. No slot is set.
  - *A mint that confirms, and then its receipt is made final by an
  older read.* The slot names it. The read touches nothing of it. The
  attempt's first outcome opens the revocation. - *Two revocations of
  one token.* A mint takes T1 or T2 once. After T1 only T4 or T5 opens
  the revocation, and T5 empties the slot that T4 reads. - *A revocation
  that a publication pays for a token of the branch.* None: an entry
  that the publication holds opens no revocation for a mint that the
  branch holds. - *An attempt that never gets a first outcome, so that
  T4 never runs.* Each attempt gets one: its own answer, `unknown`, or
  `not-sent` where the gateway did not send. - *A request that is sent
  for a receipt that is already final.* The gateway reads the state when
  it sends, and does not send for a closed target. Where it had sent
  before, the attempt has its own answer. - *A `not-sent` that is
  written for a request that was sent.* T7 writes it only for a request
  that the gateway did not send. - *A `resend-receipt` that waits for
  ever.* It waits for no read. - *A slot of an open target that is
  overwritten while it names a live token.* `resend-due` asks that every
  earlier attempt has an outcome, and each first outcome empties the
  slot. - *A draw on `revoke` past a count.* Each mint has one
  revocation at the most, and each `holds` and `adds` states as many of
  `revoke` as of `mint`.

**The reports. Can a report count that the manifest did not select, or a
commit that no entry holds?**

- *A `reserve` that names other reports than the manifest's.*
  `not-reserved`, `evidence-invalid`. - *A `reserve` that names the
  right reports in another order.* The same: the binding is by place. -
  *A report whose entry holds no commit.* `evidence-invalid`. - *An
  evidence whose `ancestors` holds a commit of no report.* `bad-input`.
  - *33 reports.* `bad-field`, by the type. - *64 verdicts, 16 decided
  jobs and 32 reports.* 130 entries: `bad-field`, with nothing fetched.
  - *That an ancestor is an ancestor.* Still the host's answer, as the
  closure and the tree are. Stated.

**The size. Is anything of an entry left out of the sum?**

- *The header, each effect, the send, `prepared`.* Each is a row. - *The
  largest message of a `reserve`.* Found by trying each mix under the
  ceiling, and not by taking each list at its `max`, which the ceiling
  does not admit. - *A value that no listing bounds.* Three: the ID of a
  run, the form of a time, and `prepared`. Each is an assumption, said
  so, and asked. - *The sum against the entry built whole.* The sum is 5
  and 7 bytes above, for the first element of each list.

## Limits of this revision

- One delegated author wrote it, for the note's author, with no other
  reader. The opening's table "What revision 28 read" says what was read
  in full, what in part and what by search. - The sweep read sections
  12.1.1, 12.1.2 and 12.1.5. Membership, the rules scope, the inbox and
  the task scope were not swept. A late outcome there was not looked
  for. - Row 8 of the sweep is stated and was not shown to be reachable.
  Row 16 rests on a reading of the guards of `adopt-head`, and section
  6.9 was read for it and not changed. - The field `reports` cannot be
  sent by the lane until the contract has a send source that gives one
  member of each record of a list. If it declines, the count of entries
  changes. - The contract's revision 23 is not adopted. The rows of the
  index, and every row of revision 27 in a form of the contract, wait
  for a contract revision that carries the form. - The sizes are sums by
  a script from the declared types and from three assumptions. None is
  measured. The proof plan measures them. - No Git command was run. The
  test values of the founding commit are not verified. - Nothing was
  run. The scripts that revision 28 ran applied the edits, listed the
  added lines, counted rows and headings of the main note, compared the
  cells of each table with its header, and made the sizes and the sums.
