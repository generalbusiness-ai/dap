## S8: Rules, Register and Destination forms

This section adds to the plan filed in `69fed843`. Scope ruling `68356c6c`
still governs the family. Request `93adab52` adds the decisions below.
The planner rules on zero approvals, open founding, and the default certified
policy before family source opens. The separate head remains after
identifiers (c+d) and before the held cutover deployment. Names and digests
come from that actual source. This amendment allocates none.

### Require global checks even when extents exist

The new Destination must judge the union of every globally required check
and every check named by a touched extent. A successful touched extent
cannot hide a missing global check. A single-controller exception cannot
waive a check. This closes November 2.4 and October 3.4 for the new family.

The judgment must preserve full job, deciding-result, checker membership,
key, configuration, and captured-policy provenance. Missing or failed required
jobs refuse `rules-not-met`. Malformed or contradictory evidence refuses
`evidence-invalid`. Successful reservation standing retains the entire union,
not only the names that extents mention. List eligibility retains the same
obligations for the final gate. It does not claim that jobs passed earlier.

`requiredChecksV14` and its mandatory standing judgment already show this
contract. Reuse that decision boundary in the family's Destination without
losing Destination19's fixed one-hour token or the other stable-family
protections. Merely adding global names to an extent's lookup list would
not suffice: the final judgment must require every selected descriptor.

The witness uses the real new-family Native path. It supplies a global
required check that no touched extent names. Missing, failed, forged, or
wrong-configuration evidence must prevent the final reservation. A sound
result must permit it and retain the checker provenance. A duplicate name
must not create two obligations. An optional check on an untouched extent
must not become mandatory. Replay must reproduce the judgment.

### Choose explicit solo-room policy or keep the permissive form

**Recommendation: close the silent forms through the existing certified
policy contract.** The default starts with a positive approval count and
explicit `ownerMayReview`. A zero global count needs `allowZeroApprovals:
true`; each zero-approval extent also needs its own explicit opt-in. Every
extent's approver must be `change.review`. The protected `rules` extent keeps
its positive declared minimum, authority class, and mandatory patterns.
Direct authors never count as their own reviewers. An authoring agent's
controller may review an ordinary extent only when `ownerMayReview` is true.
Protected rules retain controller independence, except for the existing
declared single-controller exception. That exception waives no required
check.

This recommendation preserves an intentional one-person room. Its owner
can explicitly opt ordinary extents into zero approvals. The proposal does
not call that choice independent review or claim that it resists that owner's
key. Nor does it add a rule that counts administrators.

The planner can choose among these costs:

| Choice | Effect and cost |
|---|---|
| Certified explicit zero opt-in, recommended | Refuse implicit zero approvals and arbitrary-action approvers. Solo owners retain an explicit zero-review path. The family must compose the existing policy, certificate, and Destination consumers, and callers must state the choices. |
| Refuse all zero approvals | Ordinary changes need a counted reviewer other than the direct author. A lone human author cannot self-review. A one-person room with an authoring agent can meet positive ordinary approvals when `ownerMayReview: true` permits its controller to review. Otherwise another eligible reviewer is needed. The protected-rules exception does not waive ordinary approvals. |
| Keep the historical permissive form and state it | Preserve current inputs and solo use with no certified-policy integration cost. Any action name can still stand as an approver, and a zero count needs no explicit opt-in. October 3.2 stays open. |

The first choice closes the implicit and arbitrary-approver findings, not
intentional zero review. A witness must demonstrate both sides: unopted zero
and an approver other than `change.review` refuse; the explicit solo policy
admits. It must also show that zero cannot remove the protected rules minimum
and that the existing single-controller exception never waives checks.
A pure decoder test alone does not prove Native publish or reservation.

### Rule whether open founding remains intentional

**Recommendation: state and retain intentional open founding.** Under
`policy: "open"`, any signer may found. A `founders` list does not restrict
that branch. A deployment that requires an allowlist must use `policy:
"keys"`. The family description and the register installation form must say
this directly. October 3.12 stays open by choice. Public founding still needs
its separate serving-limit work; this amendment supplies no rate limit.

To close the bypass instead, the new Register can admit only `policy:
"keys"`, require a nonempty bounded founders list, and refuse an unlisted
signer before any claim or repository operation. This costs the public Start
register's self-service founding flow. The founders value is fixed and has no
update act today. New founders would need another ruled enrollment mechanism
or another register installation. This section proposes no such mechanism.

A narrower guard that rejects `open` with a nonempty `founders` list can
remove a misleading input combination. It does not close the open-signature
bypass, so it must not be reported as closing 3.12. The planner must identify
which behavior the new family promises. If it chooses the closed form, a
Native witness must refuse an unlisted signer and admit a listed one before
outside work. If it retains open, the witness must show that another signer
still admits under open and refuses under keys. Preserve historical rooms'
recorded behavior in either case.

### Keep the ruled administrator authority

November 2.2 is a governance fact, not a new mechanism in this head. Any one
admin holds `rules.publish` and may publish a room's Rules alone. That publish
can lower thresholds outside the fixed minimum of the `rules` extent. The
minimum governs file landings, not the Rules publish act itself.

The threat model must state this authority and its key-compromise consequence.
A certificate proves the accepted policy and its repository binding. It does
not supply approval from another admin. A second key on publish needs a
counting and recovery design for one-admin rooms. Order `fc7576f8` parks that
mechanism. This family adds no such count, quorum, or recovery bypass.

### Put the certified policy in the new default, if the planner agrees

**Recommendation: yes.** Today's default is the failed-claim cohort with
Rules10. Exporting `rules-policy-v11.ts` does not put its policy in that
cohort. The new default should compose that strict policy contract with the
family's required-check Destination fix and the protections in `68356c6c`.
Do not select a higher numbered cohort and assume it carries those features.
Commons keeps its separate Rules line. The new default still refuses
reference fields as already ruled.

The policy contract requires explicit owner-review and zero-review choices,
review-action approvers, the protected rules extent, one catch-all, known
check names, and bounded exact fields. Tree verification rejects an unmatched
pattern unless that exact occurrence carries the existing explicit future
permission. Do not invent that permission during installation.

Include the actual Native certificate and tree-verification consumers and
their full policy observation binding. Importing the pure decoder alone is
not certification. Reuse the existing mechanism rather than inventing a new
admin approval counter. Preserve safe initial values and the certified
Destination's `rules-not-configured` refusal before first certified publish.
Defaults are neither a configured policy nor a certificate. Apply the contract
to every later publish. The cost is coordinated Rules,
Destination, Directory, and Register wiring, retained certificate evidence,
caller compatibility, and meaningful whole-family witnesses. Excluding it is
cheaper to implement but leaves the permissive default forms open unless the
family independently reimplements and proves the same restrictions.

Each finding that this family closes needs its witness in the family's exact
head and checker review. Extend the whole-family witness to prove the actual
default cohort reaches the strict policy and the required-check union, while
failed-claim cleanup, founder and recovery separation, eight controlled
agents, archive and repository binding, and fixed token lifetime still hold.
Existing pure policy witnesses and labelled stand-ins remain useful. They do
not replace a real Native whole-family witness. No source, implementation,
check, new pin, room recreation, deployment, or acceptance claim follows from
this plan amendment alone.
