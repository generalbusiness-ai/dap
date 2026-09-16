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

Choices present in the committed baseline source and its header:

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
  `already_admitted`, `no_quorum`, `no_majority`.
- A voter is shown an application when they held `vote` at its position
  or an effective disclosure before the vote named its position with them
  as recipient. A reader who cannot see the apply knows the application
  only by id and cannot map the id to a hidden position, so the baseline
  estimated: the voter is taken to have been on the committee when the
  application was recorded unless an earlier effective vote or admit on it
  shows otherwise; a voter shown to be late needs a disclosure to them of
  a position the reader cannot account for.

The baseline header records two predicted failure shapes before any
checker run:

1. A late committee member whose vote is the first effective mention of
   an application recorded before their grant, with no disclosure. A
   reader who cannot see the application may estimate the vote effective
   while the oracle says `unknown_application`.
2. A late committee member disclosed one application who votes on another.

The statement that the baseline deliberately omitted an "applicant
already a member" check first appears in this ledger at `09d5ebc`, after
runs 1 and 2. The source lacks that check, but the baseline header and
commit message do not record the omission as an intentional pre-run
choice. Similarly, the caveat about no revocation and the need to chain
join disclosures first appears in the run-2 ledger; it was not a third
baseline prediction. Earlier ledger versions wrongly attributed both
statements to the pre-run record and numbered the caveat as prediction 4.

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
application row. The campaign also has readers who disagree about
another member's vote: **3 of 200 seeds** fail (81, 107 and 182). In seed
81 at 54, Dana and Erin disagree with the oracle about Frank's vote;
Frank's own view does not disagree. Seed 107's first violation is Erin's
view of Frank's vote at 50. Seed 182 includes Dana's view of Erin's vote.
These readers estimate a vote effective where the oracle says
`unknown_application`; the disagreement is not confined to the voter's
own view. No other family was recorded in this campaign: the pause rule,
the invariants and the privacy budget hold throughout. Baseline prediction
2, a late member disclosed one application who votes on another, did not
appear as a separate family in the corpus.

## Run 2

Snapshot commit: `09d5ebcc64d02ac178475984f32d38e2e6201e01`,
"checker run 2". Manifest unchanged
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

## Harness changes and experiment scope

These changes affect the experiment independently of the Club package
and manifest ids:

- `57aad39`, the Club manifest freeze, changed `dap.disclose` from
  `recipients_actor` to `members`: every member can read the positions and
  recipients of a disclosure act, while the disclosed payload still goes
  only to its recipients. Club's public vote verdicts depend on that
  members-visible evidence. The same commit added role-derived audiences,
  ambient disclosure folding, declared grant effects and capability-bound
  disclosure policies. It updated the Sale and descriptor tests to match
  the new readable sets; Sale's package and manifest ids did not change.
  This is a post-freeze harness change for Sale and Booking, not a Club
  model repair. A passing Club campaign does not compare the old and new
  disclosure-audience policies.
- `4d38cf1` seeded the genesis and action nonces and replayed system steps
  deterministically. The run-1 count of three failing seeds is for this
  corrected stream. Assessment #512 independently found 196 of 200
  failing seeds at the earlier `8557249` tree, before that repair; those
  failures were about votes naming applications absent from replay.
- `7cd0467` added `commitmentAt` and `holdersAt`. Fix 1 consumes that
  public-chain surface; it does not add an application-kind proof or
  reveal the actor behind a hidden commitment.

## Known limits and unresolved acceptance gaps

The following limits were checked in assessment #512
(`636030cb538a2fd495a6abe9eed18c7e59f5306e`). Listing them does not repair
or remove the plan's requirements.

- **A5, application validity:** a vote naming any earlier commitment may
  be effective, even if the event is not an application or is an
  ineffective malformed application. Two such votes can support an admit,
  and the effect executor selects the named event's actor without checking
  its kind or verdict. The manifest's unknown-application invariant finds
  this, but the generator uses only application ids. Together with A1's
  existing-Member check, this requires the revised experiment; no fix is
  made or counted here.
- A newcomer shown a vote without the disclosure that made it effective
  for the voter judges it `unknown_application` instead of pausing. The
  checker finds the mismatch. Dependency pauses cover hidden activation
  and attach requirements, not every model-level prerequisite; the
  fixture's complete join disclosure avoids this generated case.
- Application schemas do not reject extra fields. A vote carrying an
  extra `statement` or `applicant` field is readable by members and is not
  flagged by the present budget. The bounded builders do not emit those
  fields. The privacy result applies to their payload shapes, not arbitrary
  application JSON.
- Revocation is not generated. After a committee member has read an
  application, revoking `vote` can produce a budget false positive: the
  budget uses current holders, although knowledge of an earlier payload
  cannot be revoked.
- The standing-reason readable-event budget admits its actor (the
  treasurer), in addition to the member concerned and the committee. In
  this fixture the founder is both treasurer and committee member, so the
  extra allowance does not add a reader. The broader policy remains open.
- A vote after admission is effective and increases the tally; the frozen
  policy contains no closing rule for voting after admission.
- Commitments are plain hashes of event bodies. If the other body fields,
  including the nonce, are known, candidate applicants can be tested by
  rehashing; the hash alone is not an unconditional privacy guarantee.
- `applyEffects` is run only when the `joinDisclosure` option is true;
  setting that option false disables grants as well as join disclosures.
  All passing Club traces here use the declared effects and full join
  disclosure.

Totals: 1 fix, 0 added kinds, budget within

## Validation run 3: evidence recovery and acceptance audit

Input snapshot: `c94ae6e`, "spike V5: freeze validation run 3 evidence".
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
acceptance failure, not a successful policy test.

Validation under Node 26.8.2:

- `node scripts/club-shrink.ts`: all three recorded run-1 seeds reproduced.
  Seeds 81 and 182 shrank from 56 steps to 7, seed 107 from 55 to 7.
  Every preserved series fails on the baseline and passes on the repaired
  model. `node --test test/club-corpus.test.ts` also verifies every single
  deletion and the exact recorded violation, 1/1 test passed.
- `node --test --test-name-pattern='^(?!case 5,)' test/club.test.ts`:
  10/10 tests passed. This Node version matched the file-level name too,
  so the command ran the full 200-seed campaign despite the intended
  exclusion. All 200 seeds passed in 110284 ms, with exactly the run-2
  counts: 11939 entries, 991 joins, 200 side attaches, 1939 disclosures,
  629 applications, 1575 votes (1001 effective), 343 admits (126
  effective), 514 standing events, 246 generated grants. The
  already-Member test is successful *reproduction of a plan failure*:
  Dana's first admit is at 14, Member grant at 15, and second admit at
  18 is effective. Both applications were recorded before either admit.
  An ordinary Member, Erin, cannot read either applicant field but
  agrees with the oracle on both admissions.
- `node --test --test-skip-pattern='the campaign' 'test/**/*.test.ts'`:
  all 95 selected non-campaign tests passed, including the Club corpus,
  activation cases, and the recorded acceptance gap. The three model
  campaigns were excluded from this regression pass.
- `npm run typecheck`: passed.

Manifest `sha256:806ae62febaa0b28f35fcc7099bcb00db73a61d0921806c911e993b6db808fde`;
baseline package `sha256:6aeac545386d59b2d4645bfa9d951b576ae66119484f723d1fb765ff1a02a08f`;
repaired package `sha256:ef19bdaf2a70813266ab7e490ac3759580df0613efc382bef8bf5b4a96523f4e`.

The reconstructed corpus also corrects run 1's overly narrow account:
not every mismatch is the late voter's own view. At seed 81 position 54,
Frank votes and Dana's view diverges; at seed 107 position 50, Frank
votes and Erin's view diverges; seed 182 includes Dana's view of Erin's
vote. Shrinking preserves the same missing
application-position evidence, and the recorded first mismatches are
Dana@7, Frank@7 and Erin@7 for seeds 81, 107 and 182 respectively.

Run 3 makes no model fix: totals remain 1 standing-related fix, 0 quorum
fixes and 0 added kinds, within each constraint's budget. It does not
repair the missing historical run-1 snapshot or make the original
protocol fully conformant.

### Acceptance gap: a second application admits an existing Member

Plan §4.2 requires an admission to be ineffective when the applicant
already holds Member. The frozen manifest omitted that condition, and
the baseline did not implement it. An explicit rationale for the omission
was first recorded after runs 1 and 2 at `09d5ebc`, not in the baseline.
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


## Validation run 4: assessment #512 record and test corrections

Input snapshot: commit named "spike V5: freeze assessment 512 verification".
The model, harness, frozen manifest and corpus remain unchanged. No
campaign or corpus regeneration is needed for these test and record
corrections. The last 200-seed campaign remains validation run 3.

- **A2:** the frozen manifest and original cases omitted the plan's two
  dedicated cross-view tests. Case 4 included the committee, applicant
  and late voter; case 1 included the committee and applicant. Neither had
  an ordinary Member who could not read the application. Two tests now
  add Frank with Member and without Committee: he checks the late vote's
  `unknown_application` before private disclosure and effectiveness after
  it, and separately checks an effective admit followed by Dana's Member
  grant while the application stays hidden. Each checks Frank's actual
  interpretation, literal expected outcomes, hidden applicant and
  statement fields, and all-frontier consistency and privacy. These are
  post-baseline verification of plan requirements, not retroactive
  predeclarations. Adding them to a revised manifest remains pending the
  A1/A5 policy decision; the frozen manifest has not been edited.
- **A3:** the two-application case now asserts the plan's expected
  ineffective second admission and is marked TODO for A1. Its known
  failure is not counted as a passing policy test. Run 3's pass count is
  the historical runner output before this correction.
- **A4:** the baseline provenance, both run-1 descriptions and README
  distinguish another reader's view from the voter's own. Only the two
  predictions present in the baseline header are labelled as predictions.
  The historical missing run-1 snapshot remains disclosed. The README
  ends with one newline.

Results will be recorded after the input snapshot. V5 remains incomplete
against §4.2, with A1, A5 and the revised A2 predeclarations unresolved.
Totals remain 1 fix and 0 added kinds; this run makes no model repair.
