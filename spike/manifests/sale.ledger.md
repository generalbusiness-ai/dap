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

Commit "spike V3: Sale baseline, authored by an agent from the manifest (§4.5)", `fd1e23b` on the branch as rebased onto main after V2 landed; the branch was rebased four times while V2 was under review, so hashes cited here are the final ones. Manifest `sha256:4123f7b5f8610fd09ca5042a169b57fff8756dc6d0089ac2196ecdf7c42ac52b`,
package `sha256:3559afefecb923a6e08c2febde25ae4559d1e1b9e6953bc743231d81702c7842`.

The author's own predictions, recorded before any run: (1) a late joiner
after the decision reads a second accept and can only say `no_such_offer`
where the oracle says `already_decided`; (2) tombstone withdrawals (a
withdrawal of a stub the view never read is effective) contradict the
invariant that every effective withdrawal names a stub by its author;
(3) any refusal on a hidden stub (`not_author`, `duplicate_offer`, an
accept of a stub the viewer never read) is inconsistent for late joiners.

## Corrections after the baseline, and how they are counted

Found by checker run 1 on the trace and corrected by the builder before
the findings were handed to the author. Checker's review of the first
candidate (workroom report 8c0d324b, V3-F4) ruled that spike plan §4.3
counts every post-baseline semantic change to the measured model's
audience or fold rules, whoever finds or implements it. So:

- The counter kind's audience function named the seller twice (the
  predeclared kinds table read `seller` from a payload the seller
  writes), so Bob never read position 10. The counter payload now names
  the offer's `author`, and the fold's malformed check reads that field.
  This changed the measured package's audience rule and schema after the
  baseline: **counted as Fix 1** below, although the builder made it.
- The campaign's unrelated side package (a harness fixture, not the
  measured model) had no projection of its own, so a disclosed narrow
  attach showed a member the full count of notes they could not read. It
  now projects visible notes. Not a Sale fix.

## Experiment revisions

Spike plan §4.7 calls a manifest changed after the baseline a new
experiment. The manifest has four post-baseline revisions; each is identified here
and every run cites the identity it ran under.

| Revision | Manifest id | Change |
|---|---|---|
| Frozen, before the baseline | `sha256:4123f7b5f8610fd09ca5042a169b57fff8756dc6d0089ac2196ecdf7c42ac52b` | as frozen |
| Run 1 corrections | `sha256:7e0f89716d6d5d9c40c1a5d0e4692bb605d1ad1504d0ad1a3be0bb59d34116b5` | the counter kind's payload names the offer's author (prose table and trace step 10); the side package projects visible notes; affordance weights so a series is not closed at once |
| Run 3 | `sha256:9ac768d2eedc48f0802d468eac9234d0bfd3b98d58113f850bb3bf70dd132d4a` | the privacy budget is checked on what a participant can read, with the parties of each private event derived from recorded facts (checker's V3-F1) |
| Run 5 | `sha256:847db513a904db2e0de933224d9c4bbabee2a24249e3e81a4030a2f256baabbf` | the budget check's readable-view argument became required; callers may still deliberately pass an empty view for the historical projection-only check; no semantic change |
| Run 6 | `sha256:2377e5df338aaa854a56540092bf286aab0ef2dceb563dff6a0fcbdb4633aec9` | counters derive their offerer from a prior effective stub, using visible outcomes; refused attempts do not make their recorder a party (V3-G1); prose now states the readable-events check |

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
creator here). Package after the fixes:
`sha256:48da26fcab894a9158d1671a77488b248597d4b7309fa10955b09019d6c062a4`.

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

## Run 3

Snapshot commit: see `git log`, "checker run 3". Manifest revision "Run
3" above; package unchanged from run 2
(`sha256:48da26fcab894a9158d1671a77488b248597d4b7309fa10955b09019d6c062a4`).

Checker's review of the first candidate (report 8c0d324b) found that the
run-2 privacy check tested the projection only: a private payload
disclosed to a non-party was readable in their view while their
projection still hid it (V3-F1, reproduced on the trace with Bob's terms
disclosed to Carol, and in seed 7). The harness now gives the budget
check the participant's readable view, and the manifest's check derives
each private event's parties from recorded facts (the listing's actor,
the event's actor, the stub's author for a counter, the named
inspector). Under that check, with no other change, **100 of 200 seeds
fail**: every failure is the fixture's disclosing client (the generator,
acting as the seller's client) widening a private kind (terms, a
counter, an inspection request) to a non-party. The model cannot stop a
seller's client from disclosing; what it can do is declare which kinds
may be widened, for the disclosing client to honour. That is the
author's to decide and is counted if made.

Also found by the same review, handed to the author: V3-F2, an
effective counter may name the wrong offerer and be delivered to them
(the fold gave `author` no meaning); V3-F3, the private audience
functions throw on a null payload, so a malformed private attempt made
the series unreplayable (the harness now also records an audience
error as an ineffective, actor-only event, so a model bug cannot break
replay).

## Run 4

Snapshot commit: see `git log`, "checker run 4". Manifest revision "Run
3"; package after fixes 4 to 6:
`sha256:0b252fc3b30ddf7d3b7a57ac2630b8cc1ac682b253da1118f8d3706f8953dde7`.

The author's fixes 4 to 6 applied (a disclosure policy for the fixture's
client; a counter must name the stub's author; total audience rules).
The trace, cases 2 to 4, checker's three reproduced counterexamples
(kept as tests V3-F1 to V3-F3) and the run-1 corpus pass. The campaign
fails **60 of 200 seeds**, all one signature, and none of them the
model's: a `com.example.inspection.request` emitted by the generator's
ineffective-attempt path in a series that never attached the Inspection
package. The foundation recorded an application kind with no binding
under the default `members` audience with an `unhandled` verdict, so its
private payload was readable by every member. The author reported it as
a foundation finding: an unbound kind's payload cannot be judged and
should not be readable beyond its actor (design note §8: refusing an act
must not disclose its payload). The 100 run-3 failures from disclosures
are gone: the declared policy is honoured.

## Run 5

Snapshot commit: see `git log`, "checker run 5". Foundation corrected,
not a model fix: an application event whose kind has no binding at its
position is recorded with an actor-only audience (design note §8). The
budget checks now require the readable view as an argument, so callers must supply a view explicitly. An empty view still selects
the projection-only check: the run-1 corpus test and shrink script use
`[]` deliberately to reproduce that historical semantics. Manifest revision "Run 5" (the signature change only); package
as at run 4, `sha256:0b252fc3b30ddf7d3b7a57ac2630b8cc1ac682b253da1118f8d3706f8953dde7`.

The trace, cases 2 to 4, the three reproduced counterexamples, the run-1
corpus and the campaign pass: **200 of 200 seeds** with zero violations
of the property, the pause rule, the invariants and the privacy budget on
readable events, over 11171 entries with 946 joins, 199 narrow side
attaches, 1716 disclosures (of public kinds only), 273 stubs (31
replacements), 175 withdrawals, 159 counters, 111 accepts (18 effective)
and 279 closes.

## Run 6

Snapshot commit: `56f7aa3` ("checker run 6 snapshot: type hostile payload records").
The prior preparation commit `62b9f13` stopped at typecheck before any
checker run; its test payload annotation was then corrected. Review report
796c6510 (V3-G1) found that the privacy guard treated the first recorded
stub with an id as effective. The executable manifest now checks the
visible outcome and requires an effective Sale stub recorded before the
counter. A refused stub's recorder is not a party unless independently
the seller or counter's actor; a later stub cannot authorize an earlier
counter. Both the failed-replacement and unauthorized-stub reproductions
are kept in `test/sale.test.ts`.

This is a new experiment revision under §4.7, not a model repair. The
fixture's comment corrections change its pinned module identity but no
audience, dependency, fold, schema or kind. The same snapshot includes
foundation correction `cae54b5`: when an audience rule throws, discard
model effects before recording the actor-only refusal. That is a harness
repair, not a Sale fix.

Manifest `sha256:2377e5df338aaa854a56540092bf286aab0ef2dceb563dff6a0fcbdb4633aec9`;
package `sha256:5ec9a10356ed47b1bc13ca4242631eefc69c9898f5c507e22639325eaeb6b48f`.
Results: **9 of 200 seeds fail**, all privacy-budget violations from
counters delivered to someone without an effective stub: 42, 112, 141,
160, 172, 181, 193, 197 and 200. These contain 11 distinct counter
misdeliveries (seeds 172 and 181 each contain two). The predeclared cases, F1 to F3, both G1
reproductions and the asserted literal-trace failures pass (10 tests
pass; the campaign test fails). Typecheck passes. The campaign's
zero-violations assertion is retained, and this snapshot does not meet
that exit condition.

Coverage remains 11171 entries, 946 joins, 199 side attaches, 1716
disclosures, 273 stubs (31 replacements), 175 withdrawals, 159 counters,
111 accepts (18 effective) and 279 closes. There are **zero private
disclosures and zero Inspection-package attaches**. All 120 inspection
requests are unbound attempts, so the generated campaign exercises
private delivery but not the Inspection model; the hand-written trace
and F3 regression exercise the attached Inspection package.

Run 1's 17 shrunk failures are kept in [the run-1 corpus](../corpus/sale/run1/).
The nine newly exposed failing series were shrunk at snapshot `736ce30`
and are kept in [the run-6 corpus](../corpus/sale/run6/) with that run
identity and the kept model. Six reduce to five steps, three to three
steps; each fails under the kept model and no single step can be deleted
while keeping a violation.
The historical run-5 passing result remains a result under its older,
incorrect guard; it is not evidence of a clean campaign under run 6.

## Run 7

Snapshot commit: see `git log`, "checker run 7 snapshot". Manifest
unchanged from run 6:
`sha256:2377e5df338aaa854a56540092bf286aab0ef2dceb563dff6a0fcbdb4633aec9`.
Package after Fix 7:
`sha256:cd32a3f52b025b04a885280cebf3078689d505a67d2168dcf6c5f899a51e8a85`.

Foundation snapshot `65d8e63` supplies the already specified
`audience(state, event)` contract through `AudienceCtx.modelState(id)`:
a frozen clone of the preceding state in the local fold, restricted to
the active audience declaration's original handlers. A later handler
attachment does not broaden those reads; their scope is part of the
binding identity. Client replay receives its own preceding state, not
oracle state. This runtime repair is not counted as a Sale fix. The
Sale counter's actual audience change is counted below as Fix 7.

The generator and the stricter privacy budget are unchanged. The kept
run-6 model retains the failures, including both hostile G1 shapes; the
current model must prevent their delivery. The run-6 corpus test also
checks deletion minimality and requires every case to be clean under
the current model. Results will be recorded after the snapshot run.

## Result

Sale, the partition-plus-decision shape: **7 fixes recorded, 6 of them
semantic, 0 added kinds, against a budget of 2 fixes and 1 kind: budget
exceeded.** Of the six semantic fixes, one (fix 1) corrected the
predeclared counter kind, two (fixes 2 and 3) made newcomers complete by
a declared join disclosure and dropped the tombstone rule, one (fix 4)
declared a disclosure policy once the privacy budget was checked on
readable events, one (fix 5) refuses a counter naming the wrong author,
and one (fix 7) derives actual counter recipients from effective stub
state so refusal cannot misdeliver the payload. The experiment's manifest has four post-baseline revisions, identified
above. Run 6 corrects a false negative in the privacy guard and exposes
counter misdeliveries; that snapshot does not meet the predeclared
zero-violations campaign gate. Run 7 adds the counted audience repair. The views note's trace
as literally drawn is dependency-incomplete for Ivan under the fixed
model and passes only with the declared join disclosure added; both
results are kept visible in the tests.

## Fixes

### Fix 1: the counter names the offer's author, so its audience is seller and author

- Discovery source: checker run 1 (the trace, position 10 unreadable by Bob) | builder
- Counterexample: the trace; Bob's readability was `rrrrhrrrrhhrhrhrrrrr`
  against the table's `rrrrhrrrrhrrhrhrrrrr`
- Constraint affected: none
- Added kind: no
- Before/after: before, the predeclared counter kind carried `seller`
  and its audience named the actor (the seller) and the seller; after,
  it carries `author` and the audience names the seller and that
  author. Made by the builder as a correction of the predeclared kinds
  table, counted as a fix per checker's V3-F4.

Fixes 2 and 3 answer one finding: every run-1 signature is a member who
joined after a stub, withdrawal or accept was recorded and must judge a
later event about that stub. No fold rule can close that gap, because
nothing the newcomer can read says the stub exists; the views note's rule
("any state a participant's fold depends on must be reachable through
events that participant can see") is met by making the backlog reachable.

### Fix 2: join disclosure of the public sale events

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

### Fix 3: an unknown stub does not exist

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
  withdrawal of a hidden stub as the oracle does. With fix 2 every
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

### Fix 4: a disclosure policy for the sale's public kinds

- Discovery source: checker review 8c0d324b, V3-F1
- Counterexample: the trace with Bob's terms at 7 disclosed by Alice to
  Carol: Carol reads 700 while her projection hides it; seed 7 likewise.
  Under the readable-view budget, 100 of 200 seeds failed with no model
  change, every one a disclosure of terms, a counter or an inspection
  request to a non-party by the fixture's disclosing client.
- Constraint affected: none
- Added kind: no
- Before/after: before, the model said nothing about what a client may
  disclose, so the seller's client widened any position. After, the
  model declares `config.disclosurePolicy.kinds`: a client may disclose
  beyond its audience only `sale.listing`, `sale.offer`, `sale.withdraw`,
  `sale.accept` and `sale.close` (the sale's public kinds, already
  "members when recorded, subject to disclosure" in the budget) and the
  foundation's `dap.invite` and `dap.attach` (an invitation reveals
  participation and grants, which are public by the spine; a narrow
  attach must stay disclosable for the pause and stale-binding cases).
  It forbids disclosing `sale.offer_terms`, `sale.counter` and
  `com.example.inspection.request`, whose readers the budget fixes at
  recording. The policy binds a conforming client; the checker still
  judges what is readable, so a non-conforming client is still caught.

### Fix 5: a counter must name the offerer

- Discovery source: checker review 8c0d324b, V3-F2
- Counterexample: Bob's stub o1; Alice counters
  `{offer_id: 'o1', amount: 780, author: 'carol'}`: effective, Carol
  reads 780 and Bob holds a header.
- Constraint affected: none
- Added kind: no
- Before/after: before, the fold type-checked `author` and gave it no
  meaning, while the predeclared audience delivered the counter to
  whoever it named. After, a counter whose `author` is not the stub's
  author is ineffective with `not_author` (checked after `no_such_offer`,
  before `already_decided`), so no effective counter is ever addressed
  to a non-party. The delivery itself still happens before the fold and
  the budget reports it; that is the predeclared schema's cost, and the
  fixture's clients never do it. Discloses nothing more.

### Fix 6: the private audience rules are total

- Discovery source: checker review 8c0d324b, V3-F3
- Counted: no. Who reads a malformed private attempt is unchanged: the
  audience rule threw, and the harness now records a thrown rule as
  readable by the actor alone; the total rule returns the actor alone
  for the same inputs. The change is robustness of the rule's code, not
  of any audience or fold outcome; it does change the binding identity,
  as any edit to the rule's text does.
- Counterexample: `sale.offer_terms` or `sale.counter` with payload
  `null`: `sellerAndAuthor` and `counterParties` threw, and the series
  could not be replayed.
- Constraint affected: none
- Added kind: no
- Before/after: before, both rules read a field of the payload without
  checking it was an object. After, a shared `namedParty` reads the field
  only from an object payload and returns the actor when the field is
  not a string, so both rules are total over runtime JSON; the fold then
  refuses the event as `malformed`.

Verification after fixes 4 to 6 (package printed by the test run):
the trace and cases 2, 3 and 4 pass; the campaign fails 60 of 200
seeds, every violation of one signature: a member who is not a party
can read a `com.example.inspection.request` whose verdict is `unhandled`
because the Inspection package is bound in none of the 200 generated
series, and the foundation records an application kind with no binding
under the default `members` audience (`foldEntry`: `binding ? capped(...)
: MEMBERS`). The Sale model binds no such kind and has no rule that can
narrow it; the author reports it as a foundation finding: an unbound
kind's payload cannot be judged, so it should not be readable beyond its
actor (design note §8, "refusing an act must not disclose its private
payload"), or the generator should not emit a kind that no visible
binding resolves except as a deliberately unhandled attempt with a
public payload.

### Fix 7: a counter's audience comes from the preceding effective stub

- Discovery source: checker review 796c6510, V3-G1; corrected guard in run 6
- Counterexample: both kept hostile G1 cases (a failed replacement or an
  unauthorized stub followed by a valid same-id stub), and 11 counter
  misdeliveries across the nine failing seeds in [the run-6 corpus](../corpus/sale/run6/).
- Constraint affected: none
- Added kind: no
- Before/after: before, the audience trusted `payload.author` even when
  no effective stub existed, or when the effective stub belonged to
  somebody else. The fold's refusal happened too late to protect the
  payload. After, the counter's readers are its actor, the listing's
  seller and the matching effective stub's author from the preceding
  Sale state. If there is no effective stub, only actor and seller read
  it. The payload cannot name an additional reader. The schema and
  `not_author` refusal remain unchanged. Malformed, unauthorized and
  stale attempts use the same audience rule. The declared public-stub
  backlog supplies the state on which a late member's audience depends.
- Counted: yes; this changes the measured model's audience after the
  baseline. It is a sixth semantic fix, the seventh recorded fix. It
  adds no kind and does not change or filter the generator.

Totals: 7 fixes, 0 added kinds, budget exceeded (fixes 1 to 5 and 7 are semantic; fix 6 is recorded but not counted as semantic, see its entry)
