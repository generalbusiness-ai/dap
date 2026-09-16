# Repair ledger: Sale

Spike plan §4.3. The baseline is the agent's first draft, committed before
any checker run. A fix is one semantic change after the baseline to the
model's audience rule, kind set, dependency declaration or fold rule,
whoever found the need. One snapshot commit per checker run. The manifest
and the package are cited by content id at each run.

Author: a fresh general-purpose agent (Claude), given design note §§1 to 4
and §8, the views note, the harness README and types, the Discussion
example and the frozen manifest; no test, checker or oracle access before
the baseline. About ten tool turns to the baseline, one write.

## Baseline

Commit `cbdaf2b`. Manifest `sha256:4123f7b5f8610fd09ca5042a169b57fff8756dc6d0089ac2196ecdf7c42ac52b`,
package `sha256:3559afefecb923a6e08c2febde25ae4559d1e1b9e6953bc743231d81702c7842`.

The author's own predictions, recorded before any run: (1) a late joiner
after the decision reads a second accept and can only say `no_such_offer`
where the oracle says `already_decided`; (2) tombstone withdrawals (a
withdrawal of a stub the view never read is effective) contradict the
invariant that every effective withdrawal names a stub by its author;
(3) any refusal on a hidden stub (`not_author`, `duplicate_offer`, an
accept of a stub the viewer never read) is inconsistent for late joiners.

## Predeclaration corrections (harness, not fixes)

Found by checker run 1 on the trace, corrected by the builder before the
findings were handed to the author, because they are defects in the
harness's predeclared fixture, not in the model:

- The counter kind's audience function named the seller twice (the V1
  kinds table read `seller` from a payload the seller writes), so Bob
  never read position 10. The counter payload now names the offer's
  `author`; the manifest's kind table and trace say so. Manifest id after
  the correction: `sha256:7e0f89716d6d5d9c40c1a5d0e4692bb605d1ad1504d0ad1a3be0bb59d34116b5`.
- The campaign's unrelated side package (a harness fixture) had no
  projection of its own, so a disclosed narrow attach showed a member the
  full count of notes they could not read. It now projects visible notes.

## Run 1

Snapshot commit: see `git log`, "checker run 1". Package
`sha256:a0dc4f54f23781bda007b7aab781cddbc6c62f8f9d1d076be7e74b772b1cc595`
(the counter correction changes the package id; the model's own text is
the baseline's except the counter's field name).

Trace (case 1), hidden predecessor (case 2), late joiner on a hidden fact
(case 4): pass. Case 3: fail, as predicted, `already_decided` against
`no_such_offer` for Dana. Campaign: 17 of 200 seeds fail
(8, 65, 72, 74, 79, 96, 103, 129, 138, 146 and others; see
`node scripts/sale-campaign.ts`). Signatures:

1. An accept of a stub the viewer never read: oracle effective, view
   `no_such_offer`; the viewer's `status`, `accepted` and affordances
   then diverge. The position-18 contradiction for late joiners.
2. A withdrawal or replacement of a stub the viewer never read, by a
   non-author: oracle `not_author` or `replaced`, view `no_such_offer`
   (reason mismatch), or oracle ineffective and view effective (tombstone
   rule).
3. Tombstone withdrawals of unknown ids are effective: invariant
   "withdrawal of unknown stub" fails.
4. A second withdrawal of a stub whose first withdrawal the viewer never
   read: oracle `withdrawn`, view effective.

## Fixes

(none yet)

Totals: 0 fixes, 0 added kinds, budget within
