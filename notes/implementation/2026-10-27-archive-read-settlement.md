# Settle archive read reservations

Status: one ordinary gate passed at the source checkpoint below. The
artifact report is ready for exact-head review after sealing. The effective
W1 amendment accepts the four evidence parts described below; its ruling
is no longer pending. Historical received lengths remain unknown, and the
expected live settled total stays conditional until the planner's next
deployed capture. No historical length or fitting total is invented.

The request is
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:0052053d6d3a09aece00dc04737e3f50bc6dd568`,
under promise
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:426f2a348c82e4f2213ef57fc5b175ce42115e24`.
The [measurement](2026-10-27-archive-capacity-measurement.md) found that
the captured Room A plan's used charge, remaining finish and margin sum to
4,673,364 metadata units, above its unchanged 4,194,304 limit. Seven
256 KiB read ceilings alone account for 1,835,008 of those units.

## What changes

`ArchiveBudget.reserve(cost)` admits the full ceiling through the existing
budget before I/O and returns an opaque, budget-owned handle.
`settle(handle, received)` replaces that handle's metadata ceiling with
received bytes and scales its byte-based input work by the same ratio,
rounding up. Calls, nodes, entries and attempts remain charged. A second,
foreign or unknown handle, a negative or nonintegral size, or a size above
the reservation stops the pass without credit. The refusal is recorded.
Fixed input work belongs in `spend`; a zero-metadata reservation releases
no input work.

Outstanding reads stay charged in full. Settlement checks the original
terminal state, deadline and monotone clock before releasing anything.
A throw or late reply cannot refund capacity, start a later read or install
a late result. Lookahead and finish admission use the current charge,
including outstanding ceilings; they create no allowance.

| Read | Settlement unit | Byte-based input work | Counts retained |
|---|---|---|---|
| Target and source births | UTF8 bytes of the checked `proof.bytes` | Eight times proof bytes | One node and call per read |
| Target item queries | UTF8 bytes of a bounded, decoded serialized reply | Four times reply bytes | One call per read |
| Pin SQL queries at every archive call site | Returned scalar payload: UTF8 TEXT, eight bytes per finite number, zero per null | The existing metadata fold, one per payload byte | One call per SELECT |
| Parent-frontier ownership | Length of the checked, owned object body | One per owned byte | Existing reader counts and fees |
| Migration parent and lazy head buffers | Completed bounded POST response bytes; GET advertisement bytes excluded | One per wire byte for this ownership charge | Existing negotiation, decoder and output fees |

A SQL size query settles only its returned labels and numbers. It does not
charge or credit a body merely because an `octet_length` value describes
one. Column names and JavaScript container overhead are outside this
logical scalar-payload unit. Malformed row shapes, getters, unknown values
and oversized payloads receive no credit. The original pin validation
processing allowance remains charged separately.

Null or malformed birth replies provide no trustworthy received size and
keep their full ceilings. The frontier settles only after the existing
reader has checked type, size, owned bytes, hash and deadline. Its separate
body-processing input work is not credited a second time.

The two migration collectors reserve their unchanged 32,768 and 9,216
ceilings before token or source I/O. Each uses a fresh one-exchange source.
`SmartHttpSource.receivedObjectBytes` reports completed bounded POST bytes
after the transport's deadline check; advertisements, oversized and
interrupted bodies and abandoned late replies contribute no receipt. A
received pack can still fail validation, so the archive owner settles only
after the existing parent/head checks and caller fence succeed. Cached
head reuse creates no second refund. Actual wire, inflation, record and
output callbacks keep their existing fees.

This head does not tune ceiling values, reorder planning, change the finish
formula or change row and pin bounds. Actual-size read charges, logical
allocation and processing fees stay on `spend`. Existing input-only
bounded-object and legacy transport tariffs, migration GET fees, local Git
stdout/stderr maxima and logical fixed metadata fees stay unchanged, as
approved by the effective amendment. Input-only tariffs are not refunded.
The converted scope covers metadata-before-read ceilings, including the
seven response, six pin, frontier payload and migration POST ceilings;
the audit does not claim every reader was converted.

## Diagnostics and boundaries

The existing `archive-pass-diagnostic-v1` adds `reservationCosts`:

- `metadataReserved`: metadata admitted before refunds, including ordinary
  fixed charges;
- `metadataSettled`: the current charge, including outstanding reservations
  at their full ceilings;
- `unsettledMetadata`: the still-full outstanding subset;
- `settlementRefusal`: `none`, `invalid-received` or `unknown-reservation`.

The capacity observer keeps net debit attribution at each reservation's
original site and reports nonnegative settlement reductions separately.
Its site totals reconcile with the actual ledger after refunds. Dropped
sites remain in the unattributed bucket. Earlier row, quote and first-finish
snapshots remain copied and frozen. Observation failure cannot replace the
archive outcome or affect admission.

The change touches the archive budget, native pin reads, target/source
discovery, Git frontier ownership and their descriptive observations.
The shared Git budget remains unchanged; only frontier capture and
validation require the refined reservation port. Replay readers gain no
new runtime requirement. The [architecture](../../docs/architecture.md)
and [entry-point inventory](../../docs/security/entry-points.md) describe
the accounting boundary. Existing source and host authority checks,
recorded bytes, retry decisions and publication checks remain in place.
Five affected source seals were recomputed with the maintained parser
after reviewing the changed owners. No deployment was performed.

## Room A evidence limit

The retained capture gives exact read ceilings but not the received sizes
of all five birth proofs, two item replies and six pin SELECTs. The known
frontier ownership is 5,194 bytes against a 12,715 reservation. That single
known reduction is 7,521 on both metadata and input work. With all unknown
reads still charged in full, the historical total including margin would
be 4,665,843 metadata, still above the limit by 471,539.

The actual head's finish and budget code reproduce both controls, including
all six axes. Disabled settlement gives `(2, 68, 53, 192, 4673364, 52849187)`;
known-frontier-only settlement gives `(2, 68, 53, 192, 4665843, 52841666)`.
The order is entries, attempts, nodes, calls, metadata and input work. Both
real admission checks refuse only on metadata. Both use the real opaque
reservation handle; the disabled control leaves it outstanding and never
calls `settle`.

The numeric adapter carries captured patch, append-edge, layout and source
lookup inputs without inventing private paths. It runs the actual finish
formula; source lookups remain inside publication and are not added twice.
Node's strip-only TypeScript support requires two exact, checked constructor
parameter-property lowerings to their field assignments. All arithmetic and
the complete budget class remain unchanged. Twenty public source snapshots,
their exact working hashes, module linkage and constructor substitutions
are retained beside the result. The aggregate control does not reconstruct
I/O order or eleven separate frontier read peaks.

These are numeric admission inputs, not a recovered physical read or
Native replay. No exact historical fitting total or expected live fitting
total follows from them. A fixture that measures actual replies witnesses
the mechanism and cannot fill the missing historical sizes. The planner's
next deployed capture must determine its own actual totals.

A separate, explicitly synthetic capacity check derives the conditional
threshold for the retained checkpoint. Let `B` be the five proof-byte
lengths, `Q` the two serialized query lengths, and `P` the six SQL scalar
payload lengths, each summed over its group. With the retained remainder,
frontier and finish, metadata including margin is
`2726387 + B + Q + P`. It fits exactly when `B + Q + P <= 1467917`.
Input work is `40154306 + 8*B + 4*Q + P`; even the original group ceilings
give 52,841,666, below the unchanged 67,108,864 limit. The other axes remain
entries 2, attempts 68, nodes 53 and calls 192.

Authored aggregate inputs `B=1310720`, `P=6000`, `Q=151197` exercise the
real head's reservation, settlement, finish and admission at exactly
4,194,304 metadata including margin. Increasing only `Q` by one refuses
with a one-unit metadata shortfall. These are capacity arithmetic controls,
not valid proof/query/SQL fixtures, historical measurements or Native
executions. They supply the amended conditional aggregate boundary,
separate from the actual-reader TEST subwitnesses below. Their retained
result still records that historical received sizes are unknown; the
amendment does not turn authored lengths into measured Room A data.

## Checks run so far

Raw evidence is in
`/Users/hughpyle/play/artroom-evidence/2026-10-27-archive-read-settlement/`.
The collector is indexed and sealed read-only: 194 files,
105959768 bytes, including the root `SHA256SUMS` (which excludes
itself). The complete committed-manifest candidate has SHA-256
`92efbf056da1957e03d26553150325080930a767584b7d200bf680d2056915fd`. No existing raw report was overwritten. The focused run used the working source before
two comment clarifications and the documentation changes; its receipt
records every tracked working-file hash before and after the run.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| Historical numeric refusal controls | `node /private/tmp/artroom-archive-read-settlement-numeric-W1-20261027.mjs --output /Users/hughpyle/play/artroom-evidence/2026-10-27-archive-read-settlement/numeric-W1-final/w1.json` | 0 | `numeric-W1-final/w1.json`: `99600c763ff55b6bc7232414fc9e742cdfd4a1ec490b40672a809e13d94b678c` |
| Synthetic conditional capacity boundary | `node /private/tmp/artroom-archive-conditional-admission-20261027.mjs --output /Users/hughpyle/play/artroom-evidence/2026-10-27-archive-read-settlement/conditional-admission/w1-conditional.json` | 0 | `conditional-admission/w1-conditional.json`: `bfb50ce5ab3e14056b789e32d626a88bba77e3b7dd6c26960d8f138823057466` |
| Seven owning files; 65 passed | `python3 /private/tmp/artroom-archive-settlement-focused-20261027.py` | 0 | `focused.log`: `9deee1108c4bbc261d38ef232f66bbe5ee1fbf28b7e3e8d7ccf106f29255e01f` |
| Migration and transport owners; 35 passed | `python3 /private/tmp/artroom-archive-settlement-migration-focused-20261027.py` | 0 | `migration-focused.log`: `8d573d6ec7244b76cad4202934d47264ddd322ebf63af00ee8c355f1e3501f5f` |
| Migration source and test types | `npm run typecheck --workspace @generalbusiness/dap-scope --workspace @generalbusiness/dap-git` | 0 | `migration-typecheck.log`: `a22bebe45957389503f81a89065b1a2e6ff61209f53dd26348ed7dbc15e68ff3` |
| Migration owner seal and inventory; eight passed | `node --test scripts/security-entry-points.test.mjs` | 0 | `migration-security-seals.log`: `946bfbf18dea4610f08fdef345ad50fe8ba86e008d6fa37a7ab337116f694d27` |
| Scope code and final test types | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `scope-typecheck-final.log`: `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| Git code and test types | `npm run typecheck --workspace @generalbusiness/dap-git` | 0 | `git-typecheck.log`: `f7177ec41c5d59d1082d62357947755dcabdd6fe7cf48d36315c02839393bb49` |
| Security inventory and reviewed seals; eight passed | `node --test scripts/security-entry-points.test.mjs` | 0 | `security-seals.log`: `a99c26b91819514d955506a4766237f699c04b360c454225808b48545acb310f` |
| Verified private test-pool preparation | `node scripts/cloudflare-pool-compat.mjs` | 0 | `preparation-cache.log`: `d03b9b803f377477f526a8d6cc240c8e18b71beffd9163bb0960c4d91268de65` |
| Initial root-only dependency copy: CLI symlinks refused | Same preparation command | 1 | `preparation.log`: `72618d31217a4c868c0d5177eac1bffb5a6797fc3070c8501b0d2074937a03a2` |
| Initial root-only copy lacked workspace-local Worker types | Scope typecheck command above | 1 | `scope-typecheck.log`: `4e9156a3a2db534a93618805d3fd8f01a7856c4abe4dc28fb2afd814d156445b` |
| First ordinary gate: FAILED; retained separately | `npm run gate; ordinary-gate/result.json` | 1 | `ordinary-gate/output.log`: `8f88343ef0a7e241ab8ece0f7391d7b1d6fd8e8b8b3e9585d5249a71c8ed0b10` |
| Failed-gate analyzer: actual separate execution | `gate-failure-analysis-run.json; actual argv` | 0 | `gate-failure-analysis.json`: `595ab865081a52785547e6da65407c3c8bcd97ff2fd1054b5d935116cfcc594f` |
| Initial repair compiler context: failed | `npm run typecheck --workspace @generalbusiness/dap-scope` | 1 | `repair-typecheck.log`: `9799d20a7b3a1136694af525f75b5b7609e5c7cd01d1a6fcf0a98678c917f4db` |
| Corrected repair compiler context | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `repair-typecheck-followup.log`: `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| Initial repair selection: failed; retained | `repair-focused-receipt.json; actual argv` | 1 | `repair-focused.log`: `72adec7adbfa5ce41da4f6cb3f56f4266e6f8308231f75505472cad2ddca129a` |
| Lending isolated follow-up; two passed | `lending-isolated-receipt.json; actual argv` | 0 | `lending-isolated.log`: `f59013e811ba84186fc94b654c791cbea11203abb30f9c22b894ca3c46d22bac` |
| Corrected installed/lending; ten passed; five historical controls | `repair-followup-receipt.json; actual argv` | 0 | `repair-followup.log`: `907c89e87bd380b782ca3a2e6ab99cf706fa6693c05ccbb57e2e5875974db1d8` |
| Repaired ordinary gate: natural pass | `npm run gate; ordinary-gate-repaired/result.json` | 0 | `ordinary-gate-repaired/output.log`: `78b920d04e2165819535c18b5e381ebd546e69ac4b83a47c482d1fe97e01e0f9` |
| Closed repaired-gate analysis | `analysis-run-repaired.json; actual analyzer argv` | 0 | `ordinary-gate-repaired-analysis.json`: `970d85f076d00327ccff3b772e11f14b5626b135df965fd0cbd4a28ed5f8c6e5` |
| Every other tracked blob/mode and numeric source binding | `Retained source binding; verified by continuation` | 0 | `finalization/source-binding.json`: `5d2f0a260930c40a37f41a28cf57860c9a24cb4a061cc104c990cf1bbaae0a47` |
| First evidence assembly: root-attested failure | `Original argv in assembly-receipt.json; root-attested tool result` | 1 | `finalization/first-attempt-failure.json`: `2ec535d90e7148b1ca1f08a7c3dcf552abf2c1c6965e8b7f97ebc0b26e0e21d5` |
| Ordering-only partial collector verification | `Retained continuation; direct path/hash comparison` | 0 | `finalization/partial-state-verification.json`: `d4e514dbc6e9d51db43ca70aa732969e399f58df7279ad17d6208ae6efe39c77` |

The focused run took 15.373 seconds wall and 22.983 child CPU seconds;
all tracked working bytes were unchanged during it. It ran ten frontier,
13 budget, 12 observation, 19 driver, one Native backlog, three pin and
seven target cases. W2 retains a throwing SQL read's full reservation and
refuses further reads; a separate outstanding-read case refuses at the
limit before SQL. W3 records bad sizes and invalid ownership with no
credit. Deterministic clock and gated lookahead cases cover late receipts
and the protected finish allowance. The Native SQL check measures actual
returned pin cells. Tests use their existing labelled host/clock stand-ins;
they make no hosted performance claim.

The separate migration selection took 9.793 seconds wall and 12.859 child
CPU seconds, with all tracked working bytes unchanged during it. It ran
14 HTTP transport, 15 archive host and six real migration bootstrap cases.
The new receipt witnesses retain full charges on invalid packs, a revoked
caller fence and the original deadline, and show that cached head reuse
receives no second refund. Fragmented successful POSTs count their complete
wire bytes; GET advertisements and incomplete or late bodies are excluded.

The failed initial dependency view was replaced with a private clone of
the existing verified exact-lock cache, with 14 workspace links rebound.
No package was installed and no lockfile changed. The initial failures,
successful follow-ups, JSON test report and process receipt are retained.
The first numeric harness and its diagnostic follow-up both exited 1 before
arithmetic: this Node rejects TypeScript `transform` mode. Their original
drivers, logs and receipts remain in `numeric-W1/` and
`numeric-W1-followup/`. The reviewed strip-only repair exited 0 in 0.276
seconds wall and 0.305 child CPU seconds. Its driver SHA-256 is
`dbcb4fc602be57745acde32f06cb5c42c8f3b9970eb1a80f35c3a0ebc0f2bd20`.

## First gate and isolated repairs

The ordinary gate at `340af95709eb807c4f3df575b33efc376ec4a844`
(tree `754163f0fedae5883628727f9d2ec05945dccb48`) exited 1.
All prechecks and compiler contexts passed. Node had 70 passes, Counting
had 55, and plain had 2,869 passes and one skip. Native had 805 passes,
four failures across three files, and two skips. One pending Vitest
resolver also failed during teardown in the lending file's context. Its
cause is unconfirmed. The closed raw gate directory is read-only.

The repairs retain the original gross cost vectors in separate controls,
while testing settled charges separately. Inventory now measures full
outstanding reservation peaks for its exact-limit and one-unit-short
checks; final net charges cannot serve as pre-read limits. No production
source changed after the first gate. A first repair attempt exposed an
incorrect selection field in the added control and reproduced the resolver
error. Both failures remain recorded. The corrected compiler context
passed. The prefix and inventory files passed all 24 cases. The corrected
installed and lending files then passed all 10 cases in a shared runtime
with no unhandled error. The five historical controls took 155 ms in total,
measured around each separate plan; this is fixture timing, not a production
performance result. Lending also passed its two cases alone. These passes
do not identify or repair the earlier resolver's cause.

The required new ordinary gate passed at the exact repaired checkpoint
reported below. Its `ordinary-gate-repaired/` evidence stays separate from
the failed `ordinary-gate/` and all failed follow-ups. The final evidence
table and manifest include both runs; the RPC teardown cause remains unknown.

## Ordinary gate and reporting tail

The earlier gate remains a failed run: exit1,
1145.764902958 seconds wall and
2407.359166000 child CPU seconds. Its final counts
retain 4 failed cases in 3
failed modules, with recorded unhandled counts
`{"native": [1], "plain": [0]}`. Nothing in
the follow-ups or this new gate changes that historical result or establishes
the RPC teardown cause was fixed.

The repair compiler exits1 and0 were observed by root at invocation. Their
retained logs are `repair-typecheck.log` and `repair-typecheck-followup.log`;
no separate source-run receipts were produced for those two commands. The
failed-gate analyzer has its own actual exit0 receipt, source and output
digests in `gate-failure-analysis-run.json`. That analyzer success does not
change the historical gate's failure.

The new `npm run gate` naturally closed with exit0, no forwarded signal and clean
source before and after at `970737665a85bb548495404c2fcf3a2265c93459`, tree
`f2483f95ed91c2fd2da81a8d9c78dfdfa3387511`. It ran from 2026-10-27T19:11:03.544230Z
to 2026-10-27T19:26:00.636859Z: 896.996736542 seconds wall and
1904.755274000 child CPU seconds. Stage wall observations:
kernel 0.190s; node 38.174s; counting 1.942s; plain 67.567s; native 769.467s. Final identities reconcile to the public terminals:
node: 70 passed; counting: 55 passed; plain: 2,869 passed, 1 skipped cases, 282 passed modules; native: 809 passed, 2 skipped cases, 233 passed, 1 skipped modules. Plain and Native terminals each report zero unhandled errors.

Actual callback gaps stay explicit: plain: 0 finals without ready, 0 without result, 0 duplicate ready and 0 duplicate result identities; native: 13 finals without ready, 35 without result, 0 duplicate ready and 0 duplicate result identities.
Ready/result callbacks and final identities are separate observations. Missing
callbacks do not establish cause or missing durations. Case/module duration
sums are concurrent work, not elapsed wall or CPU. The shared machine record
is `{"architecture": "arm64", "cpus": 18, "release": "27.2.0", "system": "Darwin"}`, Node `v26.12.1`;
load before/after is `[1.77197265625, 2.20703125, 2.2529296875]` /
`[3.935546875, 3.83837890625, 3.30126953125]`. No runtime speed comparison follows.

The full39-file gate input inventory and its hashes are checked against the
actual analyzer output and receipt. Focused65 and migration35 remain separate
runs; the failed first gate, historical numeric refusals and the authored conditional boundary are
not counted as gate cases or promoted to measured historical received lengths.
`finalization/source-binding.json` records every tracked Git blob and mode
except exactly this note and manifest equal to the gate, including all other
notes. Both twenty-source numeric snapshot sets equal those gate blobs.
Only these two reporting files follow the gate. The final head and tree must
be bound later by root's publication, not by a self-hash in this note.

The original finalizer and its pre-write assembly receipt remain unchanged.
That receipt still has `exit:null` and does not claim successful completion.
The continuation has its own source and pre-write phase receipt; its actual
post-seal terminal status is reported outside the sealed collector. No test, numeric control, capture, provider query or deployed
pass was rerun during finalization. Historical received lengths remain
unknown; the expected live settled total remains conditional until the
planner's post-deployment capture. The W1 and ceiling-scope
question is answered by the effective amendment; exact-head review and
the planner's post-deployment capture remain due. This artifact report
does not claim request completion, deployment or a live fitting total.

## Effective W1 and ceiling-scope amendment

The planner's effective answer is
`git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:ecefed5c49bdaee8fc6869ac59377c5bc873fcf6`,
answering decision request `70b830a6b9c4ac3a662b1baff18845e63dbd7a25`.
Its four parts are accounted for separately:

- (a) Disabled settlement through the real admission code reproduces
  4,673,364 metadata including margin and refuses.
- (b) The one measured frontier credit replaces 12,715 with 5,194, giving
  4,665,843; this partial remains refused.
- (c) Separate TEST subwitnesses execute the actual readers with measured
  reply bytes. `packages/scope/test/archive-target.test.ts` covers three
  birth reads and two serialized queries with exact UTF8 net charges.
  `packages/scope/test/archive-pin.test.ts` uses real SQLite, four SELECTs,
  `readArchivePin` and `archivePinReadBytes` to reconcile actual scalar cells.
  `packages/git/test/journal-v2-frontier.test.ts` covers eleven actual
  SHA1/SHA256 frontier body lengths through capture, validation and the
  archive ledger with a labelled synthetic Git source. These are multiple
  TEST subwitnesses, not one shared Native Room A replay. Their cardinalities
  differ from the unretained historical groups. The separate synthetic
  aggregate witnesses the 1,467,917 threshold and Q+1 refusal; it supplies
  no historical received length.
- (d) The expected live settled total stays conditional until the planner
  deploys the landed head and retains the next capture under this request.

The amendment approves the metadata-ceiling scope and unchanged input-only
fees described above. No ceiling value, formula, row bound or pin bound
changes. The original five first-attempt finalization records retain their
old pending labels as historical records; they are not the current ruling
status and were not retroactively edited.

## Evidence assembly failure and continuation

Root observed the first `--write-and-seal` command exit1 with
`ValueError: Written raw inventory differs from plan` at line622 of the
retained `finalization/finalizer.py`. It had written five finalization files
and the first root index, before writing this note or its manifest and before
sealing. `finalization/first-attempt-failure.json` records that root-attested
tool result. No separate failure timing, CPU or process-capture receipt is
invented. The original pre-write receipt is not a final execution result.

Read-only verification found exactly188 valid, unique index rows covering all
other files in the189-file partial collector. Every indexed hash matched;
there were no missing or extra paths. The failure was an ordering comparison:
`Path` component order placed `numeric-W1/` before `numeric-W1-final/`, while
the planned rows used relative POSIX strings. The corrected continuation uses
relative POSIX string order for every new inventory and preserves the original
input-inventory bytes and order. All3264 other tracked blobs/modes and both
20-source snapshot sets still match the gate.

The first index, SHA-256 `1c7669c71403ab90556e14188db140fcce912bb0d2f912d5561308a8a9321eb9`, is preserved byte-for-byte
at `finalization/first-attempt-SHA256SUMS`. Its old entries remain relative to the collector root, not the
backup directory. The new root index covers that backup, the unchanged five
first-attempt files, continuation source, verification and phase records, and
all other raw evidence. Only the new root index excludes itself. The complete
manifest indexes it too. All predictable checks and final note/manifest/index
serialization finished before the continuation's first mutation.

The continuation verifies the final index, complete manifest inventory,
read-only modes and unchanged gate sources before printing its actual terminal
result. Neither assembly attempt runs a test or changes source semantics.
The W1 amendment is effective; historical received lengths remain unknown,
and the expected live settled total remains conditional on the planner's
post-deployment capture. The RPC teardown cause remains unknown. The artifact
report is ready for exact-head review after sealing; no request completion
or deployed result follows from this assembly.
