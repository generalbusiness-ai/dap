# Roles, flow and instances for hosted agent teams

Design note. Proposed: nothing here is built.

A room is worked by people and agents. Each one acts as a member of the
room's membership, and signs with a key. The journal keeps every act, with
the member and the key that signed it. A hosted agent team puts several
agents to work on one app's lanes: one plans, one builds, one checks. A
person decides what counts.

This note answers two questions for such a team. First, what a role is: what
an agent can do, how it behaves, and where it sits in the flow of work.
Second, how a team runs several copies of one agent at the same time. A copy
is an instance: one more key of the same member. The note amends the hosted
agent teams design (`notes/2026-10-15-hosted-agent-teams-design.md`).

## 1. Terms

- **Member**: an identity in the room's membership, with a kind (person,
  agent or checker), a roster role, and keys
  (`packages/platform/src/membership.ts`).
- **Key**: one signing key of a member. A member can hold several active
  keys at once (`membership.ts:587-591`). There is no bound on keys for one
  member; the bound is on the scope's live keys (`membership.ts:245, 261`).
- **Controller**: the active person who answers for an agent member. A
  checker member has no controller (`membership.ts:415-451`). An act of an
  agent is refused when its controller is not active (`packages/derive/src/grant.ts:311`).
- **Roster role** and **action**: a roster role is a list of actions. An act
  needs its action in the signer's role (`membership.ts:100-114`).
- **Observation**: what each entry keeps about its signer: member, key, key
  state, role, actions, controller, and whether the controller was active
  (`packages/contract/src/observation.ts:17-32`).
- **Role revision**: a model, a system prompt and operating defaults, fixed
  once made (agent teams note, section 2).
- **Role preset**: a role revision together with the authority it needs and
  its place in the flow of work (section 2).
- **Identity**: one member that a team uses for one preset.
- **Instance**: one active key of that member, held by one host process.
- **Slot**: a place in a team configuration for one instance. A slot is a
  key, not a member.
- **Assignment**: one unit of app work that an instance claims, works and
  reports.
- **Attempt**: one try at an assignment by one instance, with a generation
  that fences older tries. The agent teams note calls this an "execution
  instance". This note renames it, so that "instance" means a key.
- **Assignment record**: a row in the team object that admits one instance
  to one unit of work (section 3).

## 2. Role preset

A role preset has three parts.

| Part | Field | Content |
|---|---|---|
| Authority | `kind` | `agent` or `checker`. |
| | `controller` | The person who answers for the identity. Required for `agent`, absent for `checker`. |
| | `actions` | The actions the preset needs. Each must be in the roster role of `kind` (`membership.ts:100-114`). |
| Behaviour | `revision` | A role revision: model, system prompt and defaults. |
| | `skills` | The tools and skills the host gives the instance, by name. |
| Flow | `reads` | The candidate reads: a list of item queries (below). |
| | `eligible` | Named eligibility checks that the host's adapter runs on each candidate. |
| | `admit` | How one instance gets the work before it starts: a lane act, or the host's assignment record (section 3). |
| | `performs` | The acts the preset takes on admitted work. |
| | `hands off` | The item state that the preset leaves for the next role or for a person. |

**Candidate reads.** Each read is one canonical item query: one scope, one
item type, its states, a limit and a cursor
(`packages/contract/src/item-query.ts:17-29`). The query has no party
predicates and no joins. So a read only finds candidates. The eligibility
checks decide which candidates are work for this identity. They read the
candidate's parties, refs and related items, with further item queries when
they need them.

**Coverage.** A read answers with `complete` and an optional cursor
(`item-query.ts:15`). The host follows the cursor to the end of each read on
each wake, up to the attempt's read budget. When a read is refused, or the
budget ends before `complete`, the result is "incomplete read". Only
complete reads with no eligible candidate give "no eligible work". The host
shows the two results apart, as the agent teams note requires (section 5).

**Where a preset lives.** A preset is host configuration. A team
configuration names presets and a count for each. The host checks a preset
against the installed app before it starts any instance:

- each act in `admit` and `performs` exists in the app's definitions;
- each item type in `reads` exists;
- each act's action is in the roster role of `kind`.

A preset never grants an action. Authority comes from membership, as before
(agent teams note, section 3). An application package declares default roles
and their actions (`notes/2026-10-15-self-contained-applications.md:88`). It
holds no model, prompt or spending, because those belong to the host (agent
teams note, section 6).

## 3. Planner, builder and checker

The three presets below work the issue lane (`apps/room/lanes/src/issue.ts`)
and the change lane (`apps/room/lanes/src/change.ts`). The `agent` roster
role holds `issue.open`, `issue.request`, `issue.promise`, `issue.work`,
`change.open`, `change.propose` and `change.edit-own`. It does not hold
`issue.plan`, `change.review` or `change.merge`. The `checker` role holds
`change.check` (`membership.ts:101-108`).

Each issue is its own scope. Its `file` act sends an index row to the
room's directory (`issue.ts:206`). An index row is a `lane` item in state
`listed`, with `kind` and `state` as values and the lane's scope as a ref
(`packages/platform/src/directory.ts:196-214`). So every issue preset
starts with one candidate query: the directory's `lane` items in state
`listed`. Its eligibility filters keep the rows with `kind` `issue` and
`state` `open`. The index is advisory. The preset then reads each kept
lane scope itself, for its current state and coverage.

**Admission.** Two kinds of admission exist.

- **A lane act.** When the first act on the work changes an item's state,
  the lane admits one instance and refuses the others. `accept` needs the
  commitment `offered` (`issue.ts:383-398`), and `take-hold` refuses
  `hold-held` (`issue.ts:530-549`). The losing instance reads the refusal,
  reads the board again, and takes other work.
- **The host's assignment record.** Some work has no lane act before the
  work is done. `offer` checks only that the issue is open
  (`issue.ts:350-364`), so it does not stop a second offer. `check` and
  `check-error` settle a job after the check has run (`change.ts:1038-1116`).
  For such work, the team object keeps an assignment record: one row for
  each identity and item reference, with the owning key, a generation and a
  lease. The team object is one Durable Object for each team, and it changes
  one row at a time. So the first instance that asks gets the row, and its
  siblings read it and take other work. The row is the host's admission. It
  grants nothing in the room, and the lane still judges every act. When an
  instance stops renewing the lease, the row ends at the lease end. The
  generation fences the old attempt. The record is durable, so a restart of
  the team object keeps every row.

No preset needs a lane claim that does not exist, and no preset needs a hold
on every kind of work.

**Planner** (kind `agent`):

| Branch | Candidate reads | Eligible when | Admit | Performs |
|---|---|---|---|---|
| P1 | The directory's `lane` items in state `listed`, kept when `kind` is `issue` and `state` is `open`; then each issue's `commitment` items, all states | The issue has no commitment in a state that is not final: `offered`, `proposed` or `accepted` (`issue.ts:55`) | Assignment record for the issue | `offer`, with `offeree` the builder identity when the team has one |
| P2 | Each open issue's `report` items in state `reported` (`issue.ts:70`) | The commitment's `requester` is this member | Assignment record for the report | `accept-report` or `refuse-report` |

Hands off: an offered commitment to the builder; an accepted report, with
its change, to the person.

**Builder** (kind `agent`):

| Branch | Candidate reads | Eligible when | Admit | Performs |
|---|---|---|---|---|
| B1 | Each open issue's `commitment` items in state `offered` | `offeree` is this member, or unset | `accept` | then branch B2 |
| B2 | Each open issue's `commitment` items in state `accepted`, its `hold` items in state `held`, and its `report` items in every state | `performer` is this member; no hold is held under the commitment; and no report under the commitment is `reported` or `accepted` | `take-hold` | `open` a change and `propose-manifest` on an exact base; `request-review-own`; `report`; `block` and `input`; `renew-hold` and `release-hold` |

A B1 admission leaves the commitment `accepted`, with this member as its
performer. The same instance then goes on to B2.

**After a report.** `report` opens a report and leaves the commitment
`accepted` (`issue.ts:551-591`). `accept-report` and `refuse-report` change
only the report (`issue.ts:592-635`). A hold can end while a report waits
(`shared.ts:145-156`, `:177-182`). So B2 reads the commitment's reports, and
the reports decide:

- A report `reported` is handed off to the planner. B2 is not eligible.
- A report `accepted` is handed off to the person, for review and merge. B2
  is not eligible.
- When the latest report is `refused`, the work is open again. B2 is
  eligible, and the instance reads the refusal before it starts.
- With no report, a commitment with no held hold is work that stopped
  before it reported: a released hold, an ended hold or a lost key. B2 is
  eligible, so a sibling instance recovers it.

Eligibility reads only the app's items. So after a restart of the team
object, the host reads the reports again and reaches the same decision.
The host keeps nothing that the app does not show. A sibling that lost the
`accept` can still win the `take-hold` race. That is correct: both are the
same member, with the same mandate.

Hands off: a report to the planner, and a manifest with a review request
for checks and review.

**Checker** (kind `checker`, no controller):

| Branch | Candidate reads | Eligible when | Admit | Performs |
|---|---|---|---|---|
| C1 | Each change scope's `job` items in state `requested` (`change.ts:126-128`) | The job's check names this member as its checker in the rules | Assignment record for the job | `check` with its result, or `check-error` |

Hands off: the check result. A required check of the rules consumes it.

The item types and states above are the lanes' names at main `afe0c319`.

**Where a person decides.** Three acts stay with people, because the
`agent` and `checker` roles do not hold them:

1. The counted approval: `review-verdict` (`change.review`) by the owner.
   When the agents are the owner's, the rules set `ownerMayReview: true`
   so that the owner's approval counts (`notes/2026-10-16-repo-in-ai-mvp-plan.md:111-117`).
2. The merge: `merge` (`change.merge`).
3. Plans: `open-plan` and `decision` (`issue.plan`). A planner agent drafts a
   plan as a comment or a proposed change, and a person opens it.

Each handoff is an item state in the journal. No handoff is a private
message between instances (agent teams note, section 5).

## 4. Instances

**Rule.** Same mandate, same member, more keys. Different mandate,
different member.

- A team configuration lists, for each preset, one identity and a desired
  count of instances.
- The desired count is the number of active keys of that member.
- Each slot is one key. The host runs one process for each key.
- Each key holds at most one active assignment.

**Enrol the Nth instance.** The host asks for a key with membership's
`invite-key` for the existing member, with kind `agent` or `checker`
(`membership.ts:360-379`). The new key signs `enrol` (`membership.ts:399-414`).
`invite-key` needs `membership.invite`, and only `admin` holds it by default.
So in the first version, an admin signs `invite-key`, and the controller
starts the host operation with a control request, as for hosted agent
creation (`docs/mcp.md:1743-1786`). Today no tool issues `invite-key` for an
existing agent member. `dap invite --kind agent-key` always adds a new member
first (`packages/cli/src/invitations.ts:269-270`), and hosted `create` makes a
new member each time (`packages/mcp/src/hosted.ts:213-256`). Slice RI1 adds
both.

**Claim.** Lanes see members, not keys. A hold is keyed by its commitment,
and its performer and holder are members (`issue.ts:530-549`;
`apps/room/lanes/src/shared.ts:29`). Two instances of one member race for
the same work through the admission of section 3: a lane act, or the host's
assignment record. One instance is admitted. The other reads the refusal or
the record, reads the board again, and picks other eligible work (agent
teams note, section 5, step 3). The host keeps one assignment for each key,
so an instance never takes a second item while it holds one.

**What a second instance reads.** It reads the hold as held by its own
member. The entry that took the hold shows which key signed it. The second
instance does not work that commitment. It leaves it to the instance that
holds the assignment.

**Drain and stop.**

- Drain one instance: the host stops new claims for its key. When the
  current assignment ends, an admin signs `revoke-key` with `as: retired`
  (`membership.ts:498-523`). The member and its other keys stay.
- Lower the count from three to two: drain one instance.
- Stop the identity: drain every instance. Remove the member only when the
  preset leaves the team. Raising the count again enrols a new key for the
  same member; it never reuses a revoked key.

**Recovery when a key is lost mid-assignment.** The host fences the lost
instance's attempt by its generation. An admin revokes the key: `retired`
when the key is gone, `compromised` when it leaked. A sibling instance of the
same member takes the assignment. It can renew or release the hold, because
the holder is the member (`shared.ts:128-156`). With no sibling, the hold
ends at its time (`shared.ts:177-182`), and the work returns to the board.

**What the record shows.** Every entry keeps the member and the key
(`observation.ts:17-32`). So the journal already tells one instance from
another, with no change.

**What the views show.** The member record lists the member's keys and their
states (`notes/2026-10-18-member-and-presence-ui.md:287-288`). Presence stays
one badge for each member (`member-and-presence-ui.md:89`). The badge gains a
line under it: instances active and working, for example "3 instances, 2
working". The team view lists each slot with its key, state and current
assignment.

## 5. Independence and limits

- **Approvals count by member.** A change's approvals are counted as distinct
  members (`packages/platform/src/reservation.ts:270-274`). So instances of one
  member are one approval at most.
- **One controller is one owner.** Agents do not hold `change.review`, so an
  agent's approval never counts. A later membership version that lets agents
  review must also refuse to count an agent whose controller controls an
  author. This is not in the first version.
- **No lane guard needs the key.** Lane guards and rules read the signer's
  member (`packages/derive/src/guards.ts:183-184`). Holds stay per
  commitment, held by the member, so that a sibling instance can recover
  one. Independence is by member and controller. Per-key rules are not
  needed for any act in this note.
- **Shared limits.** The app ceiling and a preset's budget are shared by
  all instances of the identity (agent teams note, section 6). The first
  version has no limit for one key. The host's one assignment for each key
  bounds how many run at once.
- **A prompt is not independence.** A reviewer or checker prompt does not
  make a review independent. The checker kind, with no controller, is the
  recorded independence (agent teams note, section 3).
- **Scope caps.** Under `platform:membership@5`, a scope holds at most 16
  members and 32 keys, invitations included (`membership.ts:550-558`). Under
  `membership@6`, the bound is 10,000 each. A team that needs many instances
  uses `membership@6` or later.

## 6. The Counter as the first test

The Counter's participant row is keyed by member. `participate` refuses a
second live row for the same member, and the definition holds at most 16
participant rows (`apps/counter/commitments.ts:45-53`, `:134-150`). So
instances do not use participant rows: one identity with three instances has
one row.

A pledge needs no other pledge open, and needs the signer to differ from the
last speaker unless one participant is active (`commitments.ts:270-290`). So:

- With the agent identity as the only active participant, its instances take
  turns in any order. Each pledge is signed by one instance's key.
- With a person also active, the identity and the person take turns. Two
  instances of the identity never take two turns in a row, because they are
  one speaker.
- Instances race to pledge. One succeeds, and the others reread the board.

This is the first exit test: one agent identity with three instances counts
through a game, and the journal shows each turn's key. The Counter contracts
change in revision 4 (section 8).

The second exit test is a Room team: a planner, a builder with two
instances, and a checker, on one issue through review, with the owner's
counted approval and merge.

## 7. Amendments to the agent teams note

This head amends `notes/2026-10-15-hosted-agent-teams-design.md`:

- **Demo 1.** The hosted agents join the Counter as instances of one
  identity, not as distinct participants. The 16-participant limit counts
  members, so instances do not use it. The link to the old Counter path is
  corrected to `apps/counter/`.
- **Section 2.** "Agent" is an identity: one member. A new row, "Instance",
  is one active key of that member. "Execution instance" is renamed
  "Attempt". One active assignment is held per instance, not per agent.
- **Section 4.** A desired count is a number of active keys of one member. A
  slot is a key. Reducing the count drains an instance and retires its key.
  Increasing it enrols a new key for the same member.
- **Section 5.** The losing contender is another instance of the same member
  or another member. Each instance holds one assignment. Step 3's claim is
  a lane act when the first act changes an item's state, and otherwise the
  team object's assignment record (section 3 of this note).
- **Acceptance.** Racing two agents for one assignment becomes racing two
  instances of one identity, and two identities. Revoking an agent becomes
  two cases. Retiring one instance's key stops that instance, and the
  identity and its other instances continue. Removing the member or its
  controller stops every instance.

## 8. Changes to the Counter contracts

Revision 4 of `notes/2026-10-15-hosted-counter-contracts.md` follows this
note, after it lands:

- The `agent` item is one identity for each role, with a desired instance
  count, not one row for each agent with an ordinal (contracts, section 4).
- Enrolment adds keys to that member: "No second key is enrolled" becomes
  "each slot enrols one key of the identity" (contracts, section 5).
- The runtime picks one eligible instance for each turn, and the other
  instances reread (contracts, section 7.2).
- The witnesses check one member with three keys, instead of one member and
  one key for each row (contracts, section 8).

## 9. Witnesses

Each admission branch of section 3 has a witness with two instances of one
identity:

1. **P1.** Two planner instances read one open issue with no commitment.
   The assignment record admits one. One `offer` is recorded, and the other
   instance takes no action on that issue.
2. **P2.** Two planner instances read one `reported` report. The record
   admits one, and one `accept-report` or `refuse-report` is recorded.
3. **B1.** Two builder instances read one `offered` commitment. Both sign
   `accept`. One takes effect, and the other is refused by the state guard
   and reads the board again.
4. **B2.** Two builder instances read one `accepted` commitment with no
   hold. Both sign `take-hold`. One hold opens, and the other is refused
   `hold-held`.
5. **C1.** Two checker instances read one `requested` job. The record
   admits one, and one `check` result is recorded.
6. **Restart.** The team object restarts while a planner row is held. The
   row stays. A sibling takes the work only after the lease ends, and the
   old attempt's generation is refused after that.
7. **Lost key.** A builder instance holding a hold loses its key. A sibling
   renews and then releases the hold, and the record shows both keys.
8. **Incomplete read.** A read refused, or stopped by its budget before
   `complete`, shows as an incomplete read, not as no eligible work.
9. **Reported work.** A builder instance reports, and its hold is then
   released, and in a second run ends at its time. Two builder instances
   run, and the team object restarts. While the report is `reported`, and
   then `accepted`, no builder assignment, change or report appears. The
   requester then refuses the report. One builder instance is admitted by
   `take-hold`, reads the refusal, and works the commitment again.

## 10. Slices

| Slice | Content | Done when |
|---|---|---|
| RI1 | Enrol a further key for an existing agent or checker member: `dap invite --kind agent-key --member @handle` signs only `invite-key`; hosted MCP enrols a further key for an existing member through a control request; docs/mcp.md recipe. | A member with three active keys acts with each one; each entry's observation names its key; retiring one key leaves the member and the other two working. |
| RI2 | The Counter contracts revision 4 slices. They carry the team runtime: presets, slots as keys, the assignment record, one assignment per key, drain, recovery by a sibling instance. | Exit test 1 (section 6) passes on a hosted Worker, with witnesses 6, 7 and 8 of section 9. |
| RI3 | Views: the instance line under the member badge, and the team view's slots. | The member and team views show three instances of one member, with their keys and states. |
| RI4 | The Room team: the planner, builder and checker presets of section 3 on the issue and change lanes. | Witnesses 1 to 5 and 9 of section 9 pass, and exit test 2 (section 6) passes on a hosted Worker. |

The slices run in this order. RI2 follows the Counter contracts revision 4.
The planner writes that revision after this note lands.
