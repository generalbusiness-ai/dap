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

## Fixes

(none)

Totals: 0 fixes, 0 added kinds, budget within
