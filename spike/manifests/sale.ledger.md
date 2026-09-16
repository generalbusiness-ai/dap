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

## Run 2

Snapshot commit: see `git log`, "checker run 2". The author's two fixes
applied; the harness gained the join-disclosure hook the model declares
(`config.joinDisclosure`, honoured by `applyStep` after every effective
join as one `dap.disclose` by a holder of the disclose capability, the
creator here). Package id after the fixes is printed by the test run.

Results: the trace, cases 2, 3 and 4, and the campaign pass: 200 of 200
seeds with zero violations of the property, the pause rule, the
invariants and the privacy budget, over 11171 entries with 946 joins,
199 narrow side attaches, 1716 disclosures, 273 stubs (31 replacements),
175 withdrawals, 159 counters, 111 accepts (18 effective) and 279 closes.

Finding recorded, not counted as a fix: the views note's trace as drawn,
without the declared join disclosure, is dependency-incomplete for Ivan
under the fixed model: at 15, o3 replacing the hidden o1 is effective for
the oracle and `no_such_offer` for Ivan. The views note expected Ivan to
"interpret the new stub as open"; that expectation and the invariant
"every effective replacement names a stub by its author" cannot both hold
in one fold, so the model made newcomers complete instead. With the
declared disclosure the trace has 21 positions (Ivan's backlog at 14)
and reproduces the table with every later position shifted by one; the
test asserts that reproduction and reports the literal trace's
violations as a diagnostic.

## Fixes

Both fixes answer one finding: every run-1 signature is a member who
joined after a stub, withdrawal or accept was recorded and must judge a
later event about that stub. No fold rule can close that gap, because
nothing the newcomer can read says the stub exists; the views note's rule
("any state a participant's fold depends on must be reachable through
events that participant can see") is met by making the backlog reachable.

### Fix 1: join disclosure of the public sale events

- Discovery source: checker run 1 (signatures 1, 2, 4) | author
  (predicted in the baseline: item 3)
- Counterexample: seed 72, erin, position 8 (an accept of a stub Erin
  never read): oracle effective, view `no_such_offer`; then Erin's
  `status`, `accepted` and affordances diverge. Also case 3: Dana at 20,
  oracle `already_decided`, view `no_such_offer`.
- Constraint affected: one accepted offer
- Added kind: no
- Before/after: before, a newcomer held only headers for every
  `sale.offer`, `sale.withdraw` and `sale.accept` recorded before their
  join. After, the model declares a dependency (`saleModel.config.
  joinDisclosure`): on every join, the seller discloses to the newcomer
  every effective position of those three kinds recorded before the join.
  It discloses to one more reader what the privacy budget already allows
  ("members when recorded, subject to disclosure"); terms, counters and
  inspection requests are never part of it. The harness honours the
  declaration with a `dap.disclose` by the seller after each
  `dap.accept_invite`; the model cannot emit it.

### Fix 2: an unknown stub does not exist

- Discovery source: checker run 1 (signature 3) | invariant | author
  (predicted in the baseline: item 2)
- Counterexample: seed 96, position 17, withdrawal of an id no stub
  carries: oracle effective (baseline tombstone rule), invariant
  "withdrawal of unknown stub" fails; seed 172, position 18, replacement
  of unknown `o10`, likewise. Seed 8, erin, position 50: a second
  withdrawal whose first withdrawal Erin never read, oracle `withdrawn`,
  view effective.
- Constraint affected: none
- Added kind: no
- Before/after: before, a withdrawal or a `replaces` naming a stub the
  view had not read was effective and recorded against the id (a
  tombstone), because manifest case 4 needed a newcomer to judge a
  withdrawal of a hidden stub as the oracle does. With fix 1 every
  reader knows every effective stub, so the tombstone is unnecessary
  and wrong: a withdrawal or a replacement of an unknown stub is now
  `no_such_offer`, and an id is taken only by an effective stub.
  Discloses nothing more.

Verification of the two fixes together, before the harness hook exists:
a scratchpad script inserted the seller's disclosure after every join in
the generated scripts and in the hand-built cases 2 to 4, then ran the
real checker: cases 2, 3 and 4 pass and 200 of 200 seeds pass with zero
violations of the property, the pause rule, the invariants and the
budget. Without the hook, the trace itself now fails at 15 for Ivan (o3
replaces the hidden o1: `no_such_offer` against effective), so cases 1
to 4 and the campaign all depend on the harness applying the declared
disclosure on every join, including the joins in the predeclared cases.

Totals: 2 fixes, 0 added kinds, budget within
