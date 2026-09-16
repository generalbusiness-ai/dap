# Repair ledger: Club

Spike plan §4.3. The baseline is the agent's first draft, committed before
any checker run. A fix is one semantic change after the baseline to the
model's audience rule, kind set, dependency declaration or fold rule,
whoever found the need. One snapshot commit per checker run. The manifest
and the package are cited by content id at each run.

Author: a fresh general-purpose agent (Claude), given design note §§1 to 4
and §8, the views note, spike plan §4.2 to §4.5, the harness README and
types, the Discussion, Sale and Booking examples with their ledgers, and
the frozen manifest (prose and executable part); no test, checker or
oracle access before the baseline. About fifteen tool turns to the
baseline, one write and two edits.

## Baseline

Commit `8557249`, "spike V5: Club baseline, authored by an agent from the
manifest (§4.5)". Manifest
`sha256:806ae62febaa0b28f35fcc7099bcb00db73a61d0921806c911e993b6db808fde`,
package `sha256:6aeac545386d59b2d4645bfa9d951b576ae66119484f723d1fb765ff1a02a08f`.

Design choices the author recorded before any run:

- A join disclosure of effective votes, admits, standing events and
  `dap.disclose` events (`config.joinDisclosure`), citing the Sale
  ledger's late-joiner finding; the disclosures included so a newcomer
  can tell who was shown which positions. None of these kinds carries an
  applicant, a statement or a reason.
- A disclosure policy (`config.disclosurePolicy`): an application only to
  a holder of `vote`; otherwise votes, admits, standing, `dap.disclose`
  and `dap.attach`. A standing reason is not disclosable: no rule needs
  it.
- The declared effect (`config.effects`): after an effective admit the
  founder's client grants Member to the applicant.
- Every well-formed application is effective, because a reader who cannot
  see an application could not tell an ineffective one from an effective
  one when judging the votes that name it.
- An `application_id` that is not a content id is `malformed` for every
  reader, so the generator's placeholder id is never judged from the
  payload alone.
- Vote refusals in the order `lapsed`, `already_voted`,
  `unknown_application`: the members' facts first, so a refusal every
  reader can check is never replaced by an estimate. Admit refusals
  `already_admitted`, `no_quorum`, `no_majority`; no standing check on
  the admitter and no "applicant already a member" check, neither being a
  manifest promise.
- A voter is shown an application when they held `vote` at its position
  or an effective disclosure before the vote named its position with them
  as recipient. A reader who cannot see the apply knows the application
  only by id and cannot map the id to a hidden position, so the baseline
  estimated: the voter is taken to have been on the committee when the
  application was recorded unless an earlier effective vote or admit on it
  shows otherwise; a voter shown to be late needs a disclosure to them of
  a position the reader cannot account for.

The author's own predictions of failure, recorded in the baseline's header
comment and report: (1) a late committee member whose vote is the first
effective mention of an application recorded before their grant, with no
disclosure: the oracle says `unknown_application`, a reader who cannot see
the apply (including the voter's own view before the disclosure) says
effective; (2) a late member disclosed one application who votes on
another; (4) the estimate assumes no revocation, and the join disclosure
of `dap.disclose` events must chain through the join disclosures
themselves.

## Run 1

No separate run-1 snapshot was committed. The baseline and harness
commits are preserved, and run 2 records the results retrospectively;
this does not meet the plan's one-snapshot-per-run protocol. Manifest and package as
at the baseline; the harness commit `4d38cf1` ("a generated series
replays to identical content ids") preceded the run: generated ids did
not survive replay because nonces were random, so generated votes named
applications that never existed. A harness defect, not counted.

Cases 1, 2 and 3 pass (quorum and the Member grant effect; `no_quorum`
and `no_majority`; `lapsed` and `already_voted`). Case 4 fails exactly as
predicted in (1): Erin, granted Committee after Dana's application, votes
before any disclosure; the oracle says `unknown_application`, and Erin's
own view at that frontier judges her vote effective and shows the
application row. The campaign fails on the same shape only (for example
seed 81, Dana at 54; seed 107, Erin at 50, with the vote count diverging
too): **3 of 200 seeds** fail (81, 107 and 182), every violation the late
member's own view judging their pre-disclosure vote effective while the
oracle says `unknown_application`. No other family of violation: the
property holds everywhere else, and the pause rule, the invariants and
the privacy budget hold throughout. Prediction (2), a late member
disclosed one application who votes on another, did not appear as a
separate family in the corpus.

## Run 2

Snapshot commit: see `git log`, "checker run 2". Manifest unchanged
(`sha256:806ae62febaa0b28f35fcc7099bcb00db73a61d0921806c911e993b6db808fde`);
harness commit `7cd0467` ("the fold context offers the chain's public
facts: commitmentAt and holdersAt") added the contract fix 1 reads;
package after fix 1
`sha256:ef19bdaf2a70813266ab7e490ac3759580df0613efc382bef8bf5b4a96523f4e`.

All four predeclared cases pass, case 4 included: every member, the late
member's own view before the disclosure among them, judges the early vote
`unknown_application` and the later one effective. The campaign passes:
**200 of 200 seeds** with zero violations of the property, the pause
rule, the invariants and the privacy budget, over 11939 entries with 991
joins, 200 narrow side attaches, 1939 disclosures, 629 applications, 1575
votes (1001 effective), 343 admits (126 effective, each followed by the
declared Member grant), 514 standing events and 246 grants. Quick loop
`CLUB_SEEDS=20`: the same, 20 of 20.

## Fixes

### Fix 1: the fold reads the hidden header's commitment, so an application id maps to its position for every reader

- Discovery source: checker run 1, case 4 and the campaign | author
  (predicted in the baseline: item 1)
- Counterexample: case 4, Erin's own view at the frontier of her early
  vote: view effective with reason null, oracle ineffective with
  `unknown_application`; campaign seed 81, Dana at 54, the same shape.
- Constraint affected: standing (the vote rule), through the
  `unknown_application` branch that reads the application's position
- Added kind: no
- Before/after: before, a reader who could not see the apply estimated
  whether the voter had been shown the application (baseline design
  choice above), and the estimate was wrong whenever the late member's
  vote was the first effective mention of an application recorded before
  their grant. After, the fold context offers what the design already
  makes public: `ctx.commitmentAt(position)`, the content id committed
  in the authenticated header of every position up to the current one,
  hidden or not, and `ctx.holdersAt(capability, position)`, the
  participants holding a capability by grants before that position (the
  same set the audience rule read there). The application id is that
  commitment, so every reader finds the apply's position without reading
  its payload, and the one rule serves everyone: the voter held `vote` at
  that position, or an effective disclosure before the vote named that
  position with the voter as recipient. The estimate and the per-record
  committee snapshots are removed. Discloses nothing more: the header
  commitment and the grant history are public in every view by design
  (design note §1, "Audience and view"; views note, "Serving a view").

Why the header route rather than a stub kind: the design established the
split-kind pattern for field-level visibility, where a public fact must
be carried separately from a private one (the Sale stub, the Booking
occupancy). Here the public fact, "the event with this id is at this
position", already exists in every view as the chain commitment that
verifies hidden positions; a stub would restate it as a second event
with its own linkage and partial-completion rules (an apply without a
stub, a stub naming a wrong position, which the apply's readers could
check and nobody else could), and the manifest's frozen generator would
not emit it. Reading the commitment adds harness surface but no new
event and no widening.

## Known limits, not fixes

- A vote naming the content id of an event that is not an application is
  judged by position like any other: effective if the voter held `vote`
  at that position. The apply's readers could see the kind; a hidden
  header says nothing about it, so no fold rule can refuse it for every
  reader alike. The generator names only application ids, and a
  non-content-id is `malformed`.
- The rules assume tenure is not revoked: `dap.revoke` is not generated.
- The join disclosure names `dap.disclose` events, including earlier join
  disclosures, so a newcomer's knowledge of who was shown what chains
  through them; exercised by the campaign's joins after disclosures.

Totals: 1 fix, 0 added kinds, budget within

## Validation run 3: evidence recovery and acceptance audit

Input snapshot: commit named "spike V5: freeze validation run 3 evidence".
This run reconstructs the three recorded baseline failures (81, 107, 182)
from the exact baseline source, preserved at `fixtures/club-baseline.ts`
so its imports and package identity do not change. These are newly
reconstructed traces, not files retained from the original run. The
script checks that the linked representation reproduces every original
entry before shrinking. Corpus replay preserves application-id and
disclosure-position links when deleting a producer or changing the
package; a use whose producer was removed is omitted. Minimality means
no single step deletion under those rules preserves the mismatch.

The candidate and frozen manifest are unchanged from run 2. The run adds
explicit disclosure-before/after-activation checks, the incomplete
dependency pause and resumption, and a counterexample to plan §4.2's
already-Member condition. The counterexample is reported as a known
acceptance failure, not a successful policy test. Results will be
recorded in the corresponding result snapshot.

### Acceptance gap: a second application admits an existing Member

Plan §4.2 requires an admission to be ineffective when the applicant
already holds Member. The frozen manifest omitted that condition, and
the baseline design choices above explicitly declined to enforce it.
Two applications by Dana can each gain two yes votes; the first admission
grants Dana Member, and the second admission still succeeds. The
`already_admitted` rule applies only to the same application id.

Ordinary members can read the votes, admissions and Member grants, but
cannot link the opaque application id to its private applicant. A fold
that checks the private applicant only where readable would break view
consistency. Implementing the plan's rule needs additional public
evidence or a changed trust/schema contract, declared in a revised
manifest. Under plan §4.7 that is a new experiment. The existing passing
campaign and one-fix result apply only to the narrower frozen manifest;
V5 is incomplete against the approved plan until this gap is resolved.
No model fix or experiment revision is included in validation run 3.
