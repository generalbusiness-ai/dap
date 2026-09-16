# O6 bootstrap demonstration and report

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:b269e2d81af32bdd4089968fd8a31065f44adcf8`.
Input: O5 candidate `598170fa5907655bc48c346a2dd4dd98853314a8`,
including O3, O2, O1 and V6.

## Declared demonstration

The new `test/fixtures/o6-bootstrap.ts` is an executable in-process route
registry. The initial experiment uses movable profile `/2`, the existing
codec, Journal, SQLite, invitation
admission and recipient interpretation. It introduces no foundation kind,
admission rule, production dispatcher or network service.

The fixture signs standalone listing L before signing genesis G, which
adopts L. L contains no genesis reference. After Journal creation commits
both signed envelopes, the registry publishes their exact canonical bytes
as `{L,G,route}`. A newcomer reaches that route, receives Alice's actual
signed invitation, verifies its delivered journal view, and independently
signs a redemption using the published genesis and invitation. Admission
must succeed at position 3. The newcomer verifies the resulting headers,
actor signatures, origin adoption, interpretation and participant set.
An exact retry and another after SQLite close/reopen must return the same
receipt without adding entries, consuming another invitation or adding
outbox records. The complete demonstration must run in one process.

Negative cases reject noncanonical/malformed publications, extra fields,
signature tampering, an unadopted signed L, mismatched routes, a different
signed G, an unavailable route, a journal/envelope mismatch and route
replacement. Rejected resolution must leave the initial two-entry journal
unchanged. These checks precede invitation issuance.

Source will be committed before the first measured test and CLI execution.
Results, failures and any repair will be recorded separately. Final report
completion waits for O4's implemented lifecycle, actual measurements and
integration; its expected manifest alone is not evidence of goal 1.

## Limits

The registry trusts the published author's identity as a bootstrap input
and pins that envelope's genesis and initial writer before verifying the
view. It supports one signed listing, one author, one route and one local
database per context. A route is a discovery name, not a capability or
authority to substitute a genesis. The listing and genesis both sign it.

Keys are deterministic test keys. Route delivery uses direct calls, not
HTTP, DNS, a public rendezvous deployment, authenticated transport or a UI.
Invitation issuance is a fixed Seller policy in the fixture. Reopening
requires re-registering the same published envelope; this is not durable
discovery. Close/reopen is not a process-crash experiment; O1–O3 own those
crash measurements. Outbox records are retained, not delivered to an
external service. No production confidentiality, freshness, user study,
host/disk-loss durability or automatic failover is claimed.

## Focused run 1

Source snapshot: `c75894b8312b9046ac5975b4cda1c67149ed850d`.
Dependencies were installed from the committed lockfile with
`npm ci --ignore-scripts --no-audit --no-fund` before execution.
Node `v26.8.2`, Darwin. From `spike/`:

```sh
node --test test/ordering-bootstrap.test.ts
npm run typecheck
node test/fixtures/o6-bootstrap.ts /absolute/path/to/new-journal.db
```

Both tests passed, with zero failures, skips or TODOs. Typecheck passed.
The direct demonstration also exited 0 in one process (recorded PID 28461)
and used a new local SQLite file. Its complete output preserves actual
canonical envelope bytes, signatures, receipt headers and verified view;
it is not a hand-written success transcript.

| Measured item | Value |
|---|---|
| Context | `sha256:0bfc9037fbd0189013eee796dfdb15e98a59cf5a11c7cd7977fcb3d756c235ad` |
| Standalone origin | `sha256:1a2a4d30944bc14b399a54f9c19419201730d6874aed4c4fcb5c697fccca1fd6` |
| Published route | `fixture:ordering-o6/guitar` |
| Positions | 0 genesis, 1 adopted listing, 2 issued invitation, 3 effective redemption |
| Saved receipt on initial append, retry and reopened retry | `sha256:e6ac6a751ec148523bdb59fddf7d7fc641a6c833ae44bc9e66d8017b83bc6839` |
| After reopen | 4 entries, the same 4 pending outbox records, verified view unchanged |

Outputs: [run-1-tests.txt](ordering-o6-runs/run-1-tests.txt),
[typecheck-1.txt](ordering-o6-runs/typecheck-1.txt),
[run-1-demo.json](ordering-o6-runs/run-1-demo.json), and
[run-1.json](ordering-o6-runs/run-1.json) with the exact commands and exits.
The demonstration's stderr was empty and is retained separately.
No implementation repair was needed after the first frozen source.
These are two focused tests and a CLI execution, not a full-suite campaign.
O4 results and integration remain pending.

## Combined integration input

O6 merges measured O4 candidate
`7d9efba41747e3c3bbd19b32dc238f6b4444247b` and measured O2/O3/O5
integration candidate `3dc6b0953f91661edcc059b56157d349ff31c5b1`.
O4 contains the repaired O1 Context/Journal lease and approved V6 evidence
follow-up `d95e097b1d38a5242754922fe4c8b977462f5555`, with all four
executing Club negative TODOs. The original O6 bootstrap files are retained.

The O4 merge is clean. The second merge conflicts only on two blank lines
in `src/journal.ts`; the resolution retains the exact O4 file bytes. Journal,
Context, ownership and foundation therefore remain byte-for-byte O4 inputs.
O5 adds only its independent control verifier to the runtime source set.
The scope implementation remains
`sha256:96f811a0a50ec77a81f14768d01565ce3d38dd2ae1472c722c6ae96422bdae03`
and the public opening rule remains
`sha256:475b415bbf8b16ccdb1bea078174712c57f2b2955ece9338d762abd60228bad8`.
No performance or application-policy source change is included.

Report QA found a concrete coverage gap in O4's initial replay regression:
it compares only Alice at frontier 10 across completion, while its original
Sale 0–19 comparison stops at sale-closed. The O4 owner is adding the required
reader/frontier follow-up before O6's final source freeze. The initial O4
measurements remain intact and will not be described as that wider check.

After integrating that measured follow-up, O6 will freeze and run the full
noncampaign suite, typecheck and the standalone bootstrap CLI. The three
200-seed campaign tests will be excluded by name because production sources
are unchanged from the measured O4 input; all other current tests remain
selected, including four executing/failing Club TODOs. Results will be
recorded after the frozen input, without relabelling earlier campaigns.

The completed O4 follow-up is now integrated at exact candidate
`4ea7d966cc44fc2641e4f99516403bb46d50ba7f`, measured source
`faf26c07d1cadf073a92bac0bb7b01ed3d6333ec`. Its six bounded checks and
typecheck passed. For each backend it covers 55 actual-reader questions at
bases 0–10 across attach/completion and 100 at bases 0–19 after completion;
143 questions across the attach include all 13 fixture principals. The
original unsuccessful set-order comparison at `e11e334e` is retained in
O4's run-3 record. The correction sorts recipients only across key/alias
representations; exact signed before/after equality remains required.
Runtime, profile, manifest and fixtures are unchanged from O4's full run.

This combined source freezes the inputs for O6 run 2 below. No runtime
conflict or behavior change requires another 600-seed campaign; the complete
noncampaign suite and actual CLI will validate integration of the measured
components and the retained bootstrap.

## Combined run 2 — before G1/G2 repairs

Frozen source: `f9995e8761f23bbf0e71f004b29199c05ee35663`.
Node `v26.8.2`, Darwin. From `spike/`:

```sh
node --test --test-skip-pattern='case [57], the campaign:' test/**/*.test.ts
npm run typecheck
node test/fixtures/o6-bootstrap.ts /absolute/path/to/new-journal.db
```

The selected suite exits 0: 371 tests, 367 pass, zero ordinary failures,
four executing/failing Club TODOs, zero counted skips. The three campaign
tests were excluded by name; Node does not include them in the skipped count.
Typecheck exits 0. The standalone demonstration exits 0 in one process
(PID 73291), with empty stderr and a new local SQLite file. Its output equals
run 1 except for PID and database path: all signed bytes, receipts, views,
participant state and pending publications are identical.

Outputs: [run-2-tests.txt](ordering-o6-runs/run-2-tests.txt),
[typecheck-2.txt](ordering-o6-runs/typecheck-2.txt),
[run-2-demo.json](ordering-o6-runs/run-2-demo.json), and
[run-2.json](ordering-o6-runs/run-2.json) with exact commands and exits.
No runtime or test source changed after this freeze. No 600-seed campaign
was repeated; the full campaign boundary remains O4 run 2 at
`b35b267ea5392e5361905018ee350ec4df07aa55`.

This result is not acceptance. O1's ratified second review,
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:3d76d2b9d7f1fce8c577243ba330e15208b975c4`,
requests G1 and G2 repairs. G1 exposes a stale raw Context that writes again
after a Journal closes on memory, plus a raw Context that remains active
after its own lost reply. Backend wrappers also bypass the object-keyed
ownership guard; its precise trust boundary must be stated. G2 exposes an
O4 `activation_order` rule that permanently blocks activation after an
intervening non-activate entry, conflicting with the intended activation
phase. The review also requires O4 to stop treating arbitrary thrown errors
as successful recognized rejections.

The explicit design decision
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:c2982a6e6756f4fed08e5a82acc8b05a65127745`
allows otherwise admissible intervening entries while transferred rights
remain dormant, retains ordinary authorization/closed-context gates, and
requires later activation to check genesis-pinned inputs independently of
those entries. Exact retry of a failed attempt retains its failed receipt;
a fresh complete attempt may first activate. This decision is not yet a
measured repair in run 2. Final O6 integration and acceptance await the
revised O1 and O4 inputs and their separately recorded checks.

## G1/G2 integration input for run 3

O6 now merges O4 candidate `2b48c4c4484ecd722aa891cd6efa5362121c0f6e`
and O2/O3/O5 candidate `1ba67c39062ddf44508b14c0716817cfa9735964`.
Both include O1 candidate `aaa447d9e5ac4d88f07f144d46f2f5e63752c399`.
O4's measured source `91941fa55928668a7a25413bedd3b38f15677b4e`
passes 341 of 345 selected tests, with zero ordinary failures and four
executing Club TODOs; its 122 O4 tests pass within that same invocation.
The aggregate's source `2a57bd2ab0b1e30912f1e2bc044951d71477c5cc`
passes 149 focused tests. Both typechecks pass. These inputs exclude the
campaigns and do not claim independent acceptance.

The O4 merge is clean. The aggregate conflicts only on appended profile
prose; the resolution retains O4's complete document with O3 handover,
completeness obligations and G2 activation/error semantics. All runtime
files equal O4's measured input except for the already measured O5 control
verifier addition. The O6 bootstrap source and tests are unchanged.

The lifecycle manifest is
`sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`;
the scope implementation is
`sha256:1090e6c785ebf4e8060be60672a9503ae4bcbb4220a31f2c117bf42b6532f8db`;
the Scope package is
`sha256:fd46665bc03857cadf6cec9e4964018780c93639482d42dccfb2b891195b2ed6`.
The opening rule, Sale and Inspection packages and fixed join policy remain
unchanged. Old proof packets still require their old source snapshots.

One new source freeze will precede the complete noncampaign suite, typecheck
and real SQLite bootstrap CLI. It retains all four executing Club TODOs and
excludes only the three named campaigns; the prior 600 seeds remain measured
at O4 `b35b267` before G1/G2. No performance patch, policy repair or extra
O6 runtime change is included. Run 2's source and outputs remain intact.

Before freezing, O6 also incorporates O4's final aggregate wrapper
`d4decf8f6e1d67f02c711bfb67ff772ecbf069bf`. Its source `ca2d105d`
preserves all 76 existing O4 runtime/test/fixture/manifest blobs and adds
the unchanged O5 verifier and its tests. The separate narrow check passes
55 O5 tests and typecheck. In O6 those O5 files were already present, so this
last merge adds only the O4 integration ledger and run-6 evidence. Runtime,
profile and manifest bytes equal that final O4 wrapper exactly.

## Final combined run 3

Frozen source: `19b6d4346fcb13d33e71ee3d2fbdbb780c44ee67`.
Node `v26.8.2`, Darwin. The exact commands use run 2's noncampaign filter,
whole-tree typecheck and the standalone bootstrap CLI with a new SQLite file.

The complete selected suite exits 0: **402 tests, 398 pass, zero ordinary
failures, four executing/failing Club TODOs**, zero counted skips. The three
200-seed campaigns are excluded by name; no reduced-seed substitute ran.
Typecheck and the real CLI demonstration both exit 0. The selected tests
include all 122 O4 checks, 55 O5 checks and both O6 bootstrap checks, within
one invocation. Exact commands, exits and timing are in
[run-3.json](ordering-o6-runs/run-3.json); complete output is in
[run-3-tests.txt](ordering-o6-runs/run-3-tests.txt) and
[typecheck-3.txt](ordering-o6-runs/typecheck-3.txt).

The [actual CLI output](ordering-o6-runs/run-3-demo.json) equals run 1 except
for PID and the new database path. All envelope bytes, signatures, receipt
hashes, participant state, verified views and four pending publications are
unchanged. Stderr is empty and retained. This preserves the goal-4 evidence
under the repaired runtime, without claiming a new process-crash experiment
or network deployment.

No source changed during measurement and no repair followed it. The frozen
runtime, profile and lifecycle identities remain those of final O4 `d4decf8`;
the bootstrap source remains `c75894b8`. The only subsequent changes are this
record, raw output and the final report. Earlier O6 runs, both G1/G2 failure
records and every historical manifest/source identity are retained. The full
600-seed boundary remains O4 `b35b267`, before G1/G2; no passing full campaign
is claimed for the final source.

Bounded internal factual QA of the report at `19b6d43` found no contradiction
in component counts, corrected identities, failures or trust boundaries.
It made no edits and ran no tests. This QA and the measurements are not
independent workroom approval or landing; those remain separate actions.

## H1/H2 integration and declared run 4

O6 now integrates frozen O4 source
`e8ccb2ef2c21510b84d0466193c2b3381f89316b`, including aggregate source
`773a38ec8367d0b563f7741d1ff902aceb72350c` and the test-only type correction
`713315d17030fbafae275dbde3e04c7c1e7dd2f4`. The merge is clean and all
runtime, profile and lifecycle-manifest bytes equal O4's frozen source.
O4's owner is measuring its five lifecycle/proof suites separately.

H1 selects movable profile `dap.fixture.single-writer/3`, with exact control
predecessors `{position, headerHash}` and repeated-commitment rejection.
Historical `/2` inputs require their original source and are not migrated.
H2 replaces repeated full-chain append authentication with a verified-prefix
cache; retained identifier memory is O(n), while membership checks are
expected constant-time. Existing history materialization and fold work still
grow with the prefix. Those repairs belong to the aggregate, not O6.

The O6 bootstrap source and tests are unchanged. Their imported
`HANDOVER_PROFILE` now selects `/3`, so a new measured run must regenerate G,
its context identity and every genesis-bound invitation, receipt and view.
The standalone L, route and existing Sale package are unchanged. The old
CLI outputs and their exact `/2` signed bytes remain historical evidence;
the new transcript is not required or expected to equal those bytes.

The scope implementation is
`sha256:f17f15a85088f645191959d8b1c21b0f415aa7b74449d7b13ee82e2e48dc8bea`,
and Scope package is
`sha256:edea788ed6dab13a1a5ae255909dfa607f9d67a4c38571a35e04c7c9bb8eb623`.
Manifest `d94090b2`, opening rule `475b415b`, join policy `ac852eba`, and
Sale/Inspection package identities are unchanged. Actual new O4 results and
proof identities will be cited from the owner's measured source and records.

After freezing this input, O6 will run its two bootstrap tests, whole-tree
typecheck and the direct SQLite CLI with a new database. This validates
creation, invitation, view authentication, retry/reopen and the malformed
publication/route boundary under `/3`. It does not repeat O4's concurrent
suite, the aggregate's tests or the 600-seed campaigns. No final aggregate
acceptance, O4 acceptance, publication or landing is implied.

## Profile /3 run 4

Frozen source: `8c5598ff79c017067ae5eed117ad6d0c05f46400`.
Node `v26.8.2`, Darwin. Both O6 bootstrap tests pass with zero failures,
skips or TODOs. Whole-tree typecheck and the direct SQLite CLI exit 0.
This is a focused O6 measurement, not another combined suite or campaign.
Exact commands and exits: [run-4.json](ordering-o6-runs/run-4.json).
Raw output: [run-4-tests.txt](ordering-o6-runs/run-4-tests.txt),
[typecheck-4.txt](ordering-o6-runs/typecheck-4.txt), and
[run-4-demo.json](ordering-o6-runs/run-4-demo.json). CLI stderr is empty.

The actual demonstration uses profile `dap.fixture.single-writer/3` and
context `sha256:080afaa386822dba15e5f694e16c554cf305ff06f031df9709b8a01935b1503c`.
Initial admission, retry and reopened retry share receipt
`sha256:c6e06aeedc59bac6120eaba9d463ea2ffe3d3d76a520e08a15167a8c4daf91e6`.
After reopen there are four entries and four unchanged pending publications.
The exact signed standalone L and route equal run 3; G and its descendants
are newly generated and signed under `/3`. Their old identities and complete
transcripts remain in runs 1–3. No fixture implementation repair was needed.

Runtime, fixture, test and manifest source remained unchanged during this
run. Only evidence and report updates follow it. The source includes O4's
frozen `e8ccb2e` inputs; O4's own concurrent run and upstream independent
acceptance must be recorded separately. The four Club negatives are untouched
but were not selected by this two-test O6 command.

The final evidence wrapper
`edacc32db1495504d10ae7a92f02af272e49e9f2` is now integrated. It contains
O4 run 7 at `e8ccb2ef`: 124/124 focused checks and typecheck pass, with 80
actual observation files. Each backend records 20 healthy boundaries,
29 adverse branches and 209 materialized-genesis variants; the historical
55/100/143 question matrices pass under the newly signed `/3` contexts.
The duplicate-release-commitment fault is refused before a fresh honest
proof succeeds. No full suite or campaign was repeated for this O4 run.

The same wrapper retains final aggregate
`936acce94e5cd024b0164fc6cd2af027f611545e`, its source-separated full/focused
checks and the independent H2 benchmark. All 83 O4 runtime/test/fixture/
manifest files are byte-identical to `e8ccb2ef`, and O6's own fixture/test
files remain unchanged. The merge adds only evidence and prose, so no
runtime change requires another O6 run. Source `8c5598ff` remains the exact
O6 measurement boundary; upstream independent acceptance is not inferred
from these component passes.

## Independent aggregate approval

Checker report
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:7f5bacc35253bb774945606e5bc76bf7e75dc9b2`
approves exact O2/O3/O5 candidate
`936acce94e5cd024b0164fc6cd2af027f611545e`. Ratification:
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:bcb1e3ccd81d0be362d619cafd8b89e37fa15a6d`.
The review explicitly addresses its stale provenance basis and the 68 live
exact-head artifacts. It verifies H1/H2 and finds no new blocking defect.
This approval covers that aggregate, not O4 or O6, whose separate reviews
and landing actions are not supplied by this record.

The checker's own `npm test` at `936acce` reports 328 tests, 324 pass,
zero ordinary failures and four retained Club TODOs; typecheck passes.
Its separate reproduction of the builder's noncampaign command selects
325 tests, with 321 pass and four TODOs, at `773a38e`, `713315d` and `936acce`.
It confirms the recorded typecheck failure at `773a38e`, the correction at
`713315d`, matching hashes for all 19 runtime modules and unchanged old logs.
These are independent reviewer measurements, not new builder runs or a
relabelled O4/O6 measurement.

An independently implemented Python verifier, including its own JCS and
RFC 8032 Ed25519, agrees with all 76 vectors, the real-journal proof and
21 new attack proofs, and reproduces the recorded valid signatures. The
review also checks cache faults before/after commit, live/cold equivalence
through repeated handovers, and suite failures when retry order, cache commit
timing or head comparison is deliberately broken. Its O2 concurrency/retry,
O3 control races/crashes and O5 isolation checks retain their own scope.
It reproduces H2's deterministic counters: two verifications per ordinary
append for `/1` and `/3` at each measured length versus the reviewed
aggregate's 222/822/2022 window averages. A separate reviewer control test
also counts two verifications for a seal or assign at 1,020 entries. This
does not convert the builder's ordinary-offer benchmark into a control test.

Material nonblocking boundaries and known follow-ups from the review:

- The cache authenticates the stored prefix at open. It does not notice an
  older row rewritten underneath a live Journal when the head is unchanged;
  live offer/seal may proceed, while cold open rejects the tampered row.
  This is the accepted O1 trust boundary, not continuous storage integrity
  monitoring. In-place replacement with an older file or fork is also outside
  the guarantee. The ordering getter's authentication comment needs that
  precise qualification in a future source revision.
- A control key can sign two assignments for one sealed head, each valid on
  a separate copy. Identical control envelopes remain valid on byte-identical
  copies. Assignment uniqueness is within one journal; it does not prevent
  forks or control-key equivocation. Both racing processes may also fail on
  SQLite locking, an availability limitation rather than double assignment.
- The live duplicate-commitment guard throws and disables the facade instead
  of returning a refusal; it appends nothing. A committed-callback exception
  can occur after a durable commit and still requires cold recovery. Reusing
  a closed Journal's encoding after another append is now refused, a stricter
  result than the accepted O1 baseline's leftover-encoding path.
- Cold SQLite reopen remains slow: the reviewer observed roughly three
  seconds at 1,020 entries and faster-than-linear growth. Neither this review
  nor the builder benchmark establishes bounded reopen cost. A move between
  two distinct stores remains unexercised.
- Two small documentation/type follow-ups remain: the foundation sequencing
  type union still lists `/2` and omits `/3`; the benchmark README omits the
  `SOURCE` file required above `spike/` by the harness. Codec failures remain
  `TypeError`, and fixed `/1` genesis still accepts an extra control field.

Only report/ledger notes record these findings here. Runtime, types, fixture
bytes, O4 `edacc32` identities and O6 measured source `8c5598ff` are unchanged.
No tests or campaigns were run for this documentation update. The Sale
repair-budget failure and Club's original A1/A5 negatives remain intact.


## K1–K4 integration and declared run 5

O6 integrates frozen O4 source
`2ee1b43a9fc7c3af2b99d991f36d78a4dbcde443` without a conflict. All runtime,
fixture, profile and lifecycle-manifest bytes equal that O4 source. The O6
bootstrap fixture and tests are unchanged. Earlier O6 candidate `4be9b2c`
and runs 1–4 remain historical; its 22 early published path artifacts cannot
serve as exact-head artifacts for this successor.

Ratified independent review
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:10521cbe232b5d7eb00b6dd2d79436e208ec4f1a`
requested four O4 repairs despite reproducing 449 selected tests, 445 pass,
zero ordinary failures and four retained Club TODOs, with typecheck passing.
That was a reviewer measurement at edacc, not approval and not a new builder
run. The earlier aggregate `936acce` was separately approved and landed as
`6881b6a5a22584d534f2729002da0c582c97876a`; that acceptance does not cover
these O4 changes.

K1 makes the Inspection audience total for malformed participant payloads.
K2 opts ScopeJournal and every nested proof/export interpretation into strict
exception propagation, preserving the original thrown value and refusing to
serve an indeterminate facade until healthy reopen. Ordinary legacy Journal
and interpretation retain their error-verdict behavior. K3 revises the public
opening rule to `/2`: a listed-kind attempt may stay hidden only when its
assigned audience is exactly the actor and its source verdict is known and
determinately ineffective. Unknown, placeholder/error and effective authority
cases do not qualify. The source writer is trusted for this classification
as well as completeness; the destination cannot independently classify an
opaque hidden body. K4 names the already-delivered Inspection mandate and
result, including Bob's S20 access and Kim's F1 access, without claiming
requester anonymity or narrowing the delivered proof.

Combined lifecycle manifest:
`sha256:a766fe56564b026a96c37630d261512c0f608adf5ec7c5ee2d11aca23eaf45fe`.
Scope implementation:
`sha256:942f4d202400bcbb1d9fe8a008785acd4f7650112e9f775baaa3f711d5cb131e`.
Scope package:
`sha256:0a3201eade9021c0898e20f41b3b4a16c2f6add3dea8a8ad3161cd7d83312572`.
Inspection package:
`sha256:18a886c149b383b8630836307195c1a89b90c463e7e32df6e0663b5d4ecc3030`.
Opening rule:
`sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c`.
The certificate envelope remains `dap.fixture.public-proof-completeness/1`;
movable writer profile remains `/3`. Sale and the fixed join policy are
unchanged. Old signed scope packets retain their old source boundary.

After a clean source freeze, run 5 will execute only the two O6 bootstrap
checks, whole-tree typecheck and the actual SQLite CLI against a new database.
The fresh output will retain its real signed bytes even if they match run 4:
the ordinary Sale bootstrap does not select the Scope or Inspection package.
O4 owns the combined noncampaign validation and regenerated scope evidence;
O6 does not repeat that suite or the 600-seed campaigns. Final O4/O6 independent
acceptance remains pending.


## K1–K4 run 5

Frozen O6 source: `b6c7ab7a2f93d3c0393143bf19cbbbe4746dc21d`.
Node `v26.8.2`, Darwin. Both bootstrap tests pass, with zero failures, skips
or TODOs. Whole-tree typecheck and the actual SQLite CLI each exit 0; CLI
stderr is empty. [run-5.json](ordering-o6-runs/run-5.json) records commands,
exits, elapsed time and the combined scope identities. Raw outputs are
[tests](ordering-o6-runs/run-5-tests.txt), [typecheck](ordering-o6-runs/typecheck-5.txt)
and the [new CLI transcript](ordering-o6-runs/run-5-demo.json).

The complete transcript equals run 4 except for process id and the new local
database path. Its ordinary Sale-only genesis does not select the revised
Inspection or Scope package. Fresh generation therefore retains G
`sha256:080afaa386822dba15e5f694e16c554cf305ff06f031df9709b8a01935b1503c`,
L `sha256:1a2a4d30944bc14b399a54f9c19419201730d6874aed4c4fcb5c697fccca1fd6`
and the same immediate/reopened retry receipt
`sha256:c6e06aeedc59bac6120eaba9d463ea2ffe3d3d76a520e08a15167a8c4daf91e6`.
The view is verified again, with four entries and four pending publications
after reopen. This is a new measured execution, not reused run-4 output.

No implementation changed during or after this measurement. O4's combined
run 8 is a separate source/invocation; its final record will be incorporated
before the final report. No aggregate, O4 or campaign test was repeated here.
The 22 early artifacts at old head `4be9b2c` remain historical and cannot be
reused as this candidate's delivery. All old O6 and O4 records are retained;
O4/O6 independent approval remains pending.


Final O4 evidence candidate `e0467ae9c44d99e10f38916b74f047b4e9183c5c`
is integrated by O6 merge `a861624b7636eaea2dc9f9654bee85f72b46a9ba`. O4 run 8 at `2ee1b43a`
passes 469 selected tests, 465 pass, zero ordinary failures and four retained
Club TODOs; all 144 O4 checks pass within that same noncampaign invocation.
Whole-tree typecheck passes. The 92 fresh observations repeat 20 healthy
boundaries, 29 adverse cases and 209 genesis variants per backend, alongside
55/100/143 historical matrices and the K1–K4 regressions. K2 reports 120
original exceptions and 120 exact retry recoveries per backend. These are
O4's measurements, not an O6 rerun; the 600-seed boundary remains historical.

Local integration verification matches all 88 blobs in O4's run-8 source
index and all 92 observation hashes. The O6 bootstrap and every run-1 through
run-4 evidence file remain byte-identical to `4be9b2c`; run 5 remains pinned
to `b6c7ab7a`. This final O4 merge adds only evidence and documentation after
those measured sources, so no additional test run is required. The final
report cites these exact records and preserves the independent-review
boundary: repaired O4 and O6 are still candidates awaiting their own approval.


## L1–L3 integration and declared run 6

O6 integrates frozen O4 source
`f8987d22890e7cf2471d7124544c539d69c0a835` cleanly. Runtime, shared fixtures,
profile and lifecycle manifest match that source exactly; the O6 bootstrap
and tests are unchanged. Candidate `864fc8b` and all five prior O6 runs remain
historical evidence, with no reuse of their exact-head artifact identities.

Independent review
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:869821dee977b1697050fb09ba8f80f8112425f3`
requested changes at O4 `e0467ae9`, despite reproducing its 469 selected tests,
465 pass, four retained Club TODOs, passing typecheck and all 92 observations.
Root ratification `04ea60627a747adfa56f518bfde5fbc7096a262e` and adoption
`794a913979b8e34c5b32d9e1d401f6300730ee34` are in that same workroom. This
review confirmed the original K1–K4 cases, then found further routes in the
same classes. It did not approve O4 or O6.

L1 resolves string-keyed registries through own properties. Unbound inherited
names stay unhandled; unknown roles retain empty-capability behavior; declared
own property-name kinds/models/roles still work. L2 preserves unexpected
issuance hash/key faults and recognizes declared codec/canonical input errors
by private identity, including the later malformed-header repair. Its strict
construction API is private at the TypeScript boundary, not a JavaScript
sandbox. L3's opening rule `/3` adds a separate exact actor-only unbound
application classification using the effective binding history before the
event; a missing registry or caller-supplied binding does not prove absence.
It also excludes `model_unavailable` from the known-ineffective exception.
Both omission classifications remain serving-writer trust. A dishonest
certificate can create duplicate live rights; source-reader detection needs
all relevant openings. Postfault proof/view read access and precommit refusal
boundaries remain documented in the profile, not claimed universally blocked.

Current identities:

- lifecycle manifest `sha256:92ad0023e387cd4a6305d074ab99f7a29cbcc1699cd88b8dcf439a446ef58828`;
- scope runtime `sha256:cbc58a25deebafd4bcb6318c8eace26027ffa09ed796061efdf27770feee67fe`;
- Scope package `sha256:21195fc775e76dd7bcc0e0dc57488527c01260de4cb17b7f0de021d00161bed5`;
- opening rule `sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6`.

Inspection remains `18a886c1`, Sale `cd32a3f5` and the fixed join policy
`ac852eba`. Movable writer profile stays `/3`; this is distinct from the
new public-opening rule `/3`. The certificate envelope stays completeness/1.
Both historical rule-/2 ids (`614f837e` and `701403e9`) and their component
sources remain separate; neither is silently reinterpreted under rule /3.

A clean source freeze precedes only the two bootstrap checks, whole-tree
typecheck and a fresh SQLite CLI demonstration. Fresh signed output is
compared with run 5 without requiring a changed genesis: this ordinary
Sale-only fixture selects no Scope or Inspection package. O4 owns the one
combined noncampaign run and fresh lifecycle evidence. Final report counts
will come from that actual result; no campaign or duplicate full suite runs
here, and independent O4/O6 acceptance remains pending.


## L1–L3 run 6

Frozen O6 source: `1ea700b15ded453fdeed52dbae25c2d4dd8057db`.
Node `v26.8.2`, Darwin. Both bootstrap tests pass with zero failures, skips
or TODOs. Whole-tree typecheck and the actual fresh-database SQLite CLI exit
0; CLI stderr is empty. Exact commands, exits and combined identities are
in [run-6.json](ordering-o6-runs/run-6.json); raw outputs are
[tests](ordering-o6-runs/run-6-tests.txt), [typecheck](ordering-o6-runs/typecheck-6.txt)
and the [actual transcript](ordering-o6-runs/run-6-demo.json).

The complete generated transcript matches run 5 except for process id and
new database path. The Sale-only bootstrap selects neither Scope nor
Inspection, so its signed G remains
`sha256:080afaa386822dba15e5f694e16c554cf305ff06f031df9709b8a01935b1503c`,
L remains `sha256:1a2a4d30944bc14b399a54f9c19419201730d6874aed4c4fcb5c697fccca1fd6`,
and append, immediate retry and reopened retry retain receipt
`sha256:c6e06aeedc59bac6120eaba9d463ea2ffe3d3d76a520e08a15167a8c4daf91e6`.
The verified reopened view still has four entries and four pending outbox
records. This is a fresh execution at the new source, not reused old output.

No source changed during measurement. O4's combined run 9 is a separate
invocation and will be incorporated at its actual result boundary. No
O4/full suite or campaign was repeated here. Historical O6 candidates and
measurements remain intact; independent O4/O6 approval remains pending.


Final O4 records candidate `15b660caaf06e1ea4698e83a94e3717cfd48572b`
is integrated in O6 by merge `ee15bba119e48e517c8cc3a610af9ce3d6796ebe`. Local verification matches
all 94 source/configuration blobs pinned at `f8987d22` and all 100 new
observation hashes. O4 retains all 475 prior e046 evidence files. The 25
historical O6 run-1 through run-5 files and both bootstrap files remain
byte-identical to candidate `864fc8b`. No runtime or test edit followed O6's
measured `1ea700b1` source; this O4 tail adds records and documentation only.

O4 run 9's complete terminal TAP establishes 492 selected tests, 488 pass,
zero ordinary failures, four retained Club TODOs and all 167 O4 checks within
one invocation. The reporting wrapper failed afterward while parsing one
TAP-escaped V6 diagnostic, before persisting the child's exit code. That code
is null/unknown; it is not reported as zero. Recovery kept 34 parsed JSON
diagnostics and one verbatim line and ran only typecheck, which exited 0.
The original wrapper exit 1, raw TAP, runner, recovery script and error are
preserved with the run. Neither recovery nor this O6 integration reran the
noncampaign suite or a campaign.

Those O4 measurements are distinct from O6 run 6's recorded exit-zero
bootstrap tests, typecheck and actual CLI. Updated runtime/rule/proof ids do
not change the ordinary Sale-only demonstration's signed output. The report
names both bounded hidden-entry classifications and their writer trust,
possible duplicate live rights under a false certificate, source-reader
limits, the TypeScript-only construction restriction and remaining postfault
read-access/precommit refusal boundaries. Internal factual QA found and
corrected a historical source-equality wording ambiguity; it was read-only
and is not independent checker approval. O4/O6 remain unapproved candidates.
