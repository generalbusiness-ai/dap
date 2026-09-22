# T3 obligations: counterexample checkpoint

T3 ends with a counterexample to this public-obligation candidate. Sale's delayed,
missing and mismatched performance controls pass. Club's public admission card
cannot be replayed by a later reader who lacks the earlier members-only votes.
The combined T3 acceptance claim is not established. This does not establish
that no obligation form can express Club.

Request: dap #7441 (`0bd3df1c`). Baseline: main `9c4e04e5`. The contract was
committed at `d9512024`, then corrected at `bc3e594c`, before any fixture ran.
The correction removed a proposed public copy of Club's private target body.
Both versions remain in history. The implementation and executable fixtures are frozen at `b4f18e3b`. The implemented form is
`dap.fixture.obligations/1`; the committed identity file records its exact
foundation and package ids.

## Results against the checklist

| Claim | Result and evidence |
|---|---|
| Declared role, performing act and observed deadline; folded open, fulfilled and persistent lapsed records | Established on the generic exact-operation and Sale controls. `ObligationForm` declares `on`, `thenOblige`, an optional matcher, and its contract; each draft names role, act/input, blocked kinds and optional absolute observed clock. The fixture fold creates no events. |
| An obligation grants no capability | Established on the control: Ivan holds the service role and sees its obligation affordance, lacks disclose authority, and his attempt is `unauthorized`; the card stays open. A capable actor lacking the role is separately refused. |
| Contract before fixtures, including Ivan's disclosure window | Established as process evidence by the two contract commits. While disclosure is owed, Ivan gains no prior stub; all dependent Sale operations are blocked. The original trace's replacement at logical Ivan@15 is `obligation_open` for every reader, with only `o1` and `o2` retained. |
| Delayed, missing and mismatched performance with literal intermediate state | Established on the committed controls, beside full-prefix checker equality. At the deadline the card is open; strictly after it the card is lapsed; late performance is refused. Wrong kind, actor, id, recipient and the other of two live obligation ids fail without a protected-state change. Duplicate performance is refused. |
| Sale disclosure re-expression | Established only under the written conforming-client contract and executed fixtures. The package has no legacy join-disclosure hook. Its ordinary performing client interprets its own view, selects the declared public dependency kinds, and emits a named `dap.disclose`. Empty disclosure can still fulfil the recipe; the negative control then reproduces Ivan's mismatch. Complete-backlog authentication is not established. |
| Club grant re-expression | Counterexample for the candidate. Existing readers correctly retain an admission, no Member capability while open, and a grant on performance. A later reader cannot validate the public admission trigger without the votes. Also, the recipe does not authenticate which actor authored the private target: the negative wrong-principal grant fulfils the card without granting Dana Member. Exact hidden-target matching remains unresolved. |
| Both campaigns pass | Counterexample: Sale is clean in 200 seeds; Club has 874 checker violations in 41 of 200 seeds. A green regression test that asserts Club's counterexample does not mean the Club candidate campaign passed. |
| Club's known V5-A5 negatives still fail | Established. The invitation-acceptance, malformed-application and standing-reason targets still produce invalid votes/admission and the original invariant findings. They are not silently repaired by the new form. |
| View property and identical visible obligation state | Established on generic and Sale controls; refuted for the Club candidate by the late-reader trace. No universal or by-construction claim is made. |
| Named foundation changes and frozen T1 baseline | Established as implementation evidence below. Original Sale/Club package files and baseline F0 identity remain unchanged; the form selects a distinct genesis foundation identity. T1 is not rebased onto this experiment. |

## The Club counterexample

The minimal case has seven logical steps, expanding to 13 recorded positions:
Bob joins the committee; Dana joins; Dana applies; Alice and Bob vote yes;
Alice admits Dana; Erin joins. At Erin's frontier 10, the oracle accepts the
admission and creates an open grant obligation. Erin reads the candidate's
public admission but cannot read its earlier members-only votes, so her fold
reports `no_quorum` and creates no grant obligation. The test removes each of
the seven logical steps in turn and confirms the mismatch disappears. This is
deletion-minimal over those declared steps, not a proof of a globally shortest
trace.

A longer delayed-performance fixture retains exactly five mismatches for Erin.
The first is `no_quorum` at frontier 13; the named grant is subsequently
`unknown_obligation` in her view at frontier 15. Literal business checks still
show one accepted admission, no Member before performance, and Member after
the conforming grant in the full fold.

The candidate deliberately requires public obligation triggers and completion
records, so their status can be reconstructed by later joiners. Its attempted
Club re-expression therefore makes **only the candidate admission** spine
readable. The original admission remains members-only, and the candidate's
votes and standing records remain members-only too. That attempted adaptation
is precisely what this case refutes. Broadening the other Club records would
change the readership experiment and is not done here. A future candidate
could investigate a public witness of an effective trigger or a different
obligation visibility contract; either requires its own frozen expectations.

## What the clients assume

Sale's recipe checks the recipient, cutoff, unique earlier positions and act
shape. It does not prove that a hidden public dependency was included. The
client must supply every effective declared dependency it can read. The
negative empty-backlog case demonstrates the consequence of breaking that
assumption: the card is fulfilled and the subsequent replacement is effective
in the full fold, while Ivan reports `no_such_offer`.

Club's recipe checks the obligation, role, current-participant principal and
sole Member role grant. Its client must select the actor of the named target
from its own readable body. Embedding that private body in a public grant would
leak the application statement. The wrong-principal negative control preserves
this limitation visibly; this report does not equate that matcher with an
exact grant-effect check. Both limitations matter even when all tested views
happen to agree.

## Foundation changes and implementation boundary

The extension adds a separate foundation identity derived from baseline F0,
its form version and the foundation source hash. `Context.create` selects it
only when a genesis binding uses the form. A baseline genesis cannot later
attach an obligation package; it receives `foundation_mismatch`. The identity
file and profile test pin this distinction. The existing scope profile is not
extended or claimed here.

The descriptor hashes obligation trigger names, contract and callback code into
model identity. The foundation stores obligation records and observed time,
checks named performance and role separately from normal capability, refuses
blocked dependent kinds, and advances completion or lapse only on effective
acts. Roles are nonempty declared capability sets; this experiment does not
supply a separate role-membership store.

This candidate's clock must be a public `dap.observe` carrying only
`{fact:{clock: integer}}`. Narrow or mixed-content clocks are refused before
state change and remain actor-only. Obligation application performances must
already have a spine audience; a private one is refused and rolled back.
Named disclosure performance is explicitly public protocol metadata (positions
and recipients), while the disclosed bodies retain their individual readership.
Generic declaration and matcher callbacks operate on copies. The optional
form stages the fold and rolls back failures, including model state, grants
and disclosures; strict verification still propagates the original exception.

`observe` adds visible cards and a separate list of obligation ids available to
the role holder, and suppresses dependent affordances while a blocking card is
open or lapsed. This exposes owed work even to a holder lacking permission to
perform it. The fixture's `performObligations` client is outside the fold and
reads each performer's interpreted view. It is independent of
`Script.joinDisclosure` and `applyEffects`; the re-expressed packages omit both
legacy configuration declarations. The generator reserves room for the client
performance. Original packages retain their previous hooks and campaigns.

## Repairs and cost so far

One candidate form and two package re-expressions were authored. Pre-run review
removed the leaking Club target-body proposal. Initial controls found that a
rejected mixed-content clock still inherited members readership; the refusal
was repaired to actor-only before the final run. Callback inputs were then
copied to prevent a matcher from mutating a retained card. Test bookkeeping was
also corrected to fetch the current arrays after a staged fold, and the Sale
trace driver was corrected to leave the disclosure missing through the later
steps. Those driver corrections are not semantic model repairs.

The Club readership failure was retained, reduced and reported instead of
repairing it by broad disclosure. Two early campaign runs were interrupted
while the controls and identity handling were being settled; neither is cited
as a passing campaign. The final committed runs cover the controls, candidate
campaigns, profile guard and the unchanged descriptor/interpreter/Sale/Club
regressions. This checkpoint does not implement notifications, recovery from
lapse, a private-obligation protocol, or a combined T3/T4 result.

## Reproduction and committed results

From the repository root:

```sh
npm --prefix spike run typecheck
node --test spike/test/obligations.test.ts
node --test spike/test/obligations-profile.test.ts
node --test spike/test/descriptor.test.ts spike/test/interpreter.test.ts spike/test/sale.test.ts spike/test/sale-trace.test.ts spike/test/sale-corpus.test.ts spike/test/club.test.ts spike/test/club-corpus.test.ts spike/test/club-a5.test.ts
node --test spike/test/append.test.ts spike/test/audience-state.test.ts spike/test/audience-throw.test.ts spike/test/context-freshness.test.ts spike/test/invitation.test.ts spike/test/journal.test.ts spike/test/origin.test.ts spike/test/regressions.test.ts
```

Results are retained in `manifests/t3-obligations-runs/`. The candidate test
suite asserts the observed counterexamples intentionally. Exact campaign
counts and regression totals follow; `summary.json` provides the machine-readable
counts and each failing Club seed with its first finding.

Completed baseline checks: 65 descriptor/interpreter/Sale/Club tests, 61 passed,
zero failed, and four pre-existing Club TODO controls retained (three V5-A5 and
one V5-A1). The core foundation run passed 76 of 76 tests. The separate profile
separation test passed. Typecheck and `git diff --check` passed. The parent
builder independently reproduced the minimal Club case, exact matching,
private-clock refusal and profile separation at `b4f18e3b`.

The final candidate run passed all 18 **regression assertions**, including its
intentional negative cases, in 915.5 seconds. Sale: 200 seeds, 11,273 recorded
positions, 938 fulfilled obligations, zero violations. Club: 200 seeds, 11,785
positions, 1,103 fulfilled obligations, 41 failing seeds and 874 checker
violations. The first Club campaign finding is seed 1, Dana at frontier 15:
the oracle accepts the public admission while Dana reports `no_quorum`.
Every generated obligation was performed by the conforming client; that fact
did not make the Club view property hold. The Club count is a failed campaign,
not a successful obligation result.

The retained results cover 160 test assertions across these runs: 156 passed,
zero unexpected failures, and the four existing Club TODO failures retained.
No end-to-end T3/T4 replay or successful private-obligation protocol is claimed.
The checkpoint hands the design note an exact public form candidate, its
passing Sale evidence, and the Club reader/trigger counterexample that a
successor must resolve. Checker review is requested for this counterexample
exit; the combined implementation acceptance checklist remains unmet.
