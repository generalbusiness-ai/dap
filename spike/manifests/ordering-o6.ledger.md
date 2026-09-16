# O6 bootstrap demonstration and report

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:b269e2d81af32bdd4089968fd8a31065f44adcf8`.
Input: O5 candidate `598170fa5907655bc48c346a2dd4dd98853314a8`,
including O3, O2, O1 and V6.

## Declared demonstration

The new `test/fixtures/o6-bootstrap.ts` is an executable in-process route
registry. It reuses the ordinary v2 codec, Journal, SQLite, invitation
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
