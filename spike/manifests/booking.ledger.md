# Repair ledger: Booking

Spike plan §4.3. The baseline is the agent's first draft, committed before
any checker run. A fix is one semantic change after the baseline to the
model's audience rule, kind set, dependency declaration or fold rule,
whoever found the need. One snapshot commit per checker run. The manifest
and the package are cited by content id at each run.

Author: a fresh general-purpose agent (Claude), given design note §§1 to 4
and §8, the views note, spike plan §4.1, the harness README and types,
the Discussion and Sale examples with Sale's ledger, and the frozen
manifest; no test, checker or oracle access before the baseline. About
ten tool turns to the baseline, one write and one edit.

## Baseline

Commit "spike V4: Booking baseline, authored by an agent from the manifest
(§4.5)". Manifest
`sha256:8dc4524c99d2e7c17d1bdd7c12fa2679db83596a3176e580cc298a0f10b82bf3`,
package `sha256:2377b1c0dff725e4cd599cf8680729fb066d81d395d1fb6b608b1ff397964790`.

Design choices the author recorded before any run: a join disclosure of
occupancies, frees and clock ticks declared in the baseline
(`config.joinDisclosure`), with the Sale ledger's late-joiner finding as
the stated reason; the clock included so a disclosed occupancy does not
look unexpired to a newcomer; `now` as the maximum tick folded; an
unknown request id on a cancel read as `not_booker` because a reader who
cannot see a request is not its booker; `freed` over `expired` over
`active`; requests projected only to their booker and the admin they
name. The author's own predictions of failure: a cancel naming a
different admin than its request; a second cancel whose first the
reader cannot see; requests addressed to a non-admin; join disclosure
widening a narrowed observation.

## Run 1

Snapshot commit: see `git log`, "checker run 1". Manifest and package as
at the baseline.

All six predeclared cases pass (two requests for one slot, free exactly
one, duplicate publication, only the admin publishes, expiry, the
cross-view case from checker's review 05048fbb). The campaign passes:
200 of 200 seeds with zero violations of the property, the pause rule,
the invariants and the privacy budget, over 12000 entries with 974
joins, 197 narrow side attaches, 1646 disclosures, 2564 requests, 1425
publications (653 effective), 401 frees, 439 cancels and 1581 clock
ticks.

The privacy budget of this run is the frozen manifest's: it checks the
projection only. Checker's V3 review (report 8c0d324b, V3-F1) showed
that a projection-only check misses private payloads a participant can
read after a disclosure; the harness's budget now also receives the
participant's readable view, and the Booking manifest's check is
amended to use it in the next run. That amendment changes the manifest
identity and is recorded there as a revised experiment.

## Run 2

Snapshot commit: see `git log`, "checker run 2". Manifest revised: the
budget is now checked on what a participant can read (checker's V3-F1,
report 8c0d324b), manifest id
`sha256:771a9cb82aff7b03bf50b55b490e35710da3e3072bd8877a7b79a13100bfc3f7`
(run 1 ran under `sha256:8dc4524c99d2e7c17d1bdd7c12fa2679db83596a3176e580cc298a0f10b82bf3`);
package unchanged from the baseline.

All six predeclared cases still pass. The campaign fails **139 of 200
seeds**, every violation a budget one: a request (3413 occurrences) or a
cancel (443) readable by a member who is neither its booker nor the
admin, because the fixture's disclosing client (the generator, acting as
the admin's client) discloses random earlier positions to members. The
model cannot stop a client from disclosing; whether to declare a
disclosure policy for the fixture's client to honour is the author's
decision and is counted if made.

## Run 3

Snapshot commit: see `git log`, "checker run 3". Manifest as at run 2;
package after fix 1:
`sha256:622a120962da35c370b093161848677fe086a5d1fa729655fc3ce2ced855bc9b`.

All six predeclared cases pass. The campaign passes: 200 of 200 seeds
with zero violations of the property, the pause rule, the invariants and
the privacy budget, over 12000 entries with 974 joins, 197 narrow side
attaches, 1638 disclosures, 2569 requests, 1426 publications (654
effective), 401 frees, 439 cancels and 1582 clock ticks.

## Fixes

### Fix 1: a disclosure policy naming the public kinds

- Discovery source: checker run 2, readable-events budget, after
  checker's V3-F1
- Counterexample: seed 1, erin, position 31: Erin can read Dana's
  request (parties dana+alice) from frontier 57 on, after the fixture's
  disclosing client, acting as the admin's client, disclosed that
  position to her. Also seed 3, bob, position 40: Bob can read Erin's
  cancel. Every run-2 failure has this shape; the property, the pause
  rule and the invariants held throughout.
- Constraint affected: none (no overlap is untouched); the privacy
  budget for purpose and booker
- Added kind: no
- Before/after: before, the model declared nothing about disclosure, so
  the fixture's client could widen any earlier position to any member,
  including a request or a cancel, whose payloads carry the booker and
  the purpose. After, the model declares `config.disclosurePolicy`: a
  client may disclose `booking.occupancy`, `booking.free`, the clock
  observation `dap.observe` and `dap.attach` beyond their audience, and
  nothing else. Occupancies, frees and ticks are the public facts the
  join disclosure already relies on; an attach is part of any
  disclosure's dependency closure (design note §8). Requests and
  cancels are forbidden: their readers are fixed at the booker and the
  admin by the budget. The fixture's disclosing client honours the
  declaration (`disclosableKinds` in `src/script.ts`); the checker still
  judges what is readable, so a client that ignored the policy would
  still be caught. The fold and the projection are unchanged. Discloses
  nothing more; it narrows what a client may widen.

Known limit of the predeclared schema, not counted: a cancel's readers
are its actor and the admin the cancel names; the request it cancels is
readable by its booker and the admin the request names. If a booker
named different admins in the two events, the cancel's admin would read
the cancel without the request and judge `not_booker` where the oracle
judges effective (and likewise `already_cancelled` for a second cancel
whose first that admin cannot read). No fold rule closes this at no
cost, because that reader holds no evidence of the request; the only
repairs are a rule the reader cannot check (refuse a cancel whose admin
differs from the request's, which the same reader cannot see) or a
change to the predeclared audience rule. The generator always names the
real admin, so the campaign does not exercise it, and the model leaves
the rule as written.

Totals: 1 fix, 0 added kinds, budget within
