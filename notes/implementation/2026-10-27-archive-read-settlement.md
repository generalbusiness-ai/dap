# Settle archive read reservations

Status: focused checks and numeric controls passed; the ordinary gate and
exact-head review remain due. The historical Room A settled total cannot
be recovered from the retained capture because several reply sizes were
not recorded. Decision request `70b830a6b9c4ac3a662b1baff18845e63dbd7a25`
asks the planner to resolve that acceptance gap and the boundary for other
reader tariffs.

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
bounded-object and legacy transport tariffs and local Git output collectors
are outside the metadata-based settlement conversion
pending the planner's scope answer. The source audit does not claim that
every reader in the repository was converted.

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
executions. They do not satisfy historical W1. Their result explicitly
records that the missing historical sizes remain unknown.

## Checks run so far

Raw evidence is in
`/Users/hughpyle/play/artroom-evidence/2026-10-27-archive-read-settlement/`.
It remains writable while the delivery is assembled. A final manifest and
SHA256SUMS seal remain due. The focused run used the working source before
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
