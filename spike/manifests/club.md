# Experiment manifest: Club

Frozen before the baseline (spike plan §4.7). The role-derived-audience
plus retroactive-disclosure shape of the views note (cliffs 2 and 3): an
application is private to the applicant and the committee, votes and
outcomes are public to members, and a committee member added later can
judge only what was disclosed to them. The model is authored by an agent
under spike plan §4.5 from this manifest and the notes; the fix count is
the measurement of design note goal 2.

## Package

`fixtures/club.ts`, pinned by module, config `{quorum: 2}` and schemas.
The kinds, audiences and capability contracts are the policy of spike
plan §4.2 and are predeclared here, not fixes:

| Kind | Audience | Requires | Payload |
|---|---|---|---|
| `com.example.club.apply` | applicant and the committee at that position | none: any participant may apply | `statement` |
| `com.example.club.vote` | members | `vote` (Committee) | `application_id`, `choice` (`yes` or `no`) |
| `com.example.club.admit` | members | `admit` (Committee) | `application_id` |
| `com.example.club.standing` | members | `set_standing` (Treasurer) | `member`, `standing` (`good` or `lapsed`) |
| `com.example.club.standing_reason` | the member concerned and the committee | `set_standing` | `member`, `text` |
| `dap.grant` (system) | spine | `dap.grant` | roles for a participant |
| `dap.disclose` (system) | members | `dap.disclose` | positions shown to recipients |

Roles: Member (`member`, a marker), Committee (`vote`, `admit`),
Treasurer (`set_standing`). Roles are grants in the spine. The
committee is whoever holds `vote` at a position; audience rules ask the
audience context for holders, and the fold context offers the same. The
application id is the content id of the apply event (`ctx.id`). The
model opts in to ambient system events (`ambient: true`) and folds every
effective observation and disclosure, so it can tell which positions were
shown to whom. Standing is good until an effective `standing` event says
otherwise. A model may declare an effect (`config.effects`): after an
effective admit, the fixture's client grants Member to the applicant of
the application named, by a participant holding `dap.grant`.

## Promises

1. An application is admitted when at least `quorum` (2) votes on it are
   effective and the yes votes outnumber the no votes; an admit without
   that is `no_quorum` or `no_majority`.
2. A vote by a committee member not in good standing at that position is
   ineffective (`lapsed`); one vote per committee member per application
   (`already_voted`).
3. A committee member granted `vote` after an application was recorded
   can vote on it only after an effective disclosure of the application
   to them; a vote before that is `unknown_application`.
4. Standing is set by the treasurer and visible to members; the reason is
   visible only to the member concerned and the committee.
5. An effective admission grants Member (by the declared effect); a
   second admit of the same application is `already_admitted`.

## Privacy budget (maximum readers)

- Application contents: the applicant and the committee (whoever holds
  `vote` at the reader's frontier).
- The reason for a standing decision: the member concerned and the
  committee.
- Votes, admits, standing: members. Participation and grants: spine.

The budget is checked on what a participant can read: an application
readable by anyone who is neither its applicant nor a committee member
at the frontier, or a standing reason readable by anyone who is neither
the member concerned nor a committee member, is a violation; and on the
projection: a non-party sees no statement or applicant.

## Projection shape

`observe` for the `club` model returns, for a principal `p`:

```text
{
  applications: [ { id, position: number | null,     // the apply's position if p can read it
                    applicant: string | null,         // null unless p can read the application
                    statement: string | null,
                    votes: { yes: number, no: number },   // effective votes p can see
                    status: 'open' | 'admitted' } ],  // by first appearance to p
  standing: { [member]: 'good' | 'lapsed' },          // members with an effective standing event
  reasons: [ { member, text, position } ]             // only reasons p can read
}
```

Application `status` and vote counts are shared outcomes. Outcome
reasons are compared too; the vocabulary is `no_quorum`, `no_majority`,
`lapsed`, `unknown_application`, `already_voted`, `already_admitted`,
`malformed`, `unhandled`.

## Constraint inventory and budget

Two cross-partition constraints: quorum (admit reads votes) and standing
(vote reads standing). Budget (spike plan §4.3), per constraint: at most
2 fixes and at most 1 added kind; 4 fixes and 2 kinds in all. Fixes are
recorded in `manifests/club.ledger.md`.

## Domain and bounds

At most 6 participants, at most 60 positions, seeds 1 to 200 (the
declared effect adds one grant after each effective admit, outside that
bound). One application type, a committee of three at the start (the founder and two
members), one treasurer (the founder), good or lapsed standing. Other
club policies are out of scope.

## Predeclared cases (spike plan §4.2)

1. **Quorum.** Three committee members, two yes votes, admit is effective
   and the applicant is granted Member.
2. **No quorum.** One vote, admit is `no_quorum`.
3. **Lapsed.** A lapsed committee member's vote is `lapsed`, and an admit
   that relied on it is `no_quorum`.
4. **Late committee member.** A member granted Committee after the
   application votes before any disclosure: `unknown_application`;
   after an effective disclosure of the application to them, their vote
   is effective; every member judges both votes the same way.
5. **The campaign.** Seeds 1 to 200 with applications, votes, admits,
   standing changes with reasons, late committee grants, disclosures
   under the declared policy, joins and a narrow side attach: zero
   violations of the property, the pause rule, the invariants and the
   privacy budget.

## Invariants (evaluated on the oracle's state and the recorded entries)

- Every effective vote is by a holder of `vote` in good standing at its
  position, and is that voter's only effective vote on that application.
- Every effective vote by a member granted `vote` after the application
  was recorded follows an effective disclosure of the application to
  them.
- Every effective admit names an application with at least `quorum`
  effective votes before it, more yes than no, and no earlier effective
  admit.
- Every effective admit is followed by a grant of Member to the
  applicant before the next application event by anyone.
