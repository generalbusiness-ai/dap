# Room A entry 150 metadata shortfall

Room A's hosted archive pass refused at entry 150 because its next metadata request exceeded the 4 MiB bound by 1,106 or 1,109 bytes in the retained observations. The implemented fallback uses a later capacity-retry alarm to build exactly the next entry from fresh inputs. A local Native driver witness confirmed 63 through 64 within the original bounds, and the owning checks passed. That local result does not establish a full finish for Room A's unavailable private confirmed-149 context or hosted recovery.

This note records work under parent request `1aedd35b` and promise `3afb5000`. Implementation is tracked under child `f6ba323d` and promise `a2b586e5`. The change preserves archive limits, native authority and recorded entry meaning. No deployment or provider change is claimed.

## Authenticated sample

Planner report `4f00dfdf` records one naturally completed read-only capture on 25 October. The independently audited artifact contains all 51 sample entries from 150 through 200, with chain anchors 148 and 149 linked to the authenticated 147 anchor. All sample identities, canonical bytes and direct retained dependencies reconcile. The sample has 34 acts, 14 deliveries and three preparations.

The recorded capture made 34 requests: one session POST, one log GET and 32 retained GETs, all reporting status 200 without an error code. It retained 32 bodies and reused one deduplicated definition. The log response returned entries 148–347 and was explicitly incomplete; a complete 150–200 sample does not mean a complete log or that 200 was the current head. Direct-input completeness does not include recursive foreign or definition-child closure. The independent audit checks artifact contents, not unstored per-request timing or a new native authorization judgment.

## Hosted refusal and measured components

The retained hosted entry-150 observations report metadata already used of 2,767,868 or 2,767,871 bytes. The next request was 1,427,542 bytes against a bound of 4,194,304, giving the respective 1,106- and 1,109-byte shortfalls. These are observed refusal counters, not a local measurement of the complete finish. The accepted private tail retains four full vectors; this note does not synthesize a new combined vector.

Local diagnostic `66109` closed naturally with exit 0, measured all 51 entries and reported no errors. It used the maintained entry validator and retained planner to check captured dependencies, then measured maintained anchor-count and nonforeign retained-reader components over scratch SQLite. The SQLite state is a local projection of captured rows, not NativeScope state or a reconstructed private archive row. Foreign entry reads were deliberately excluded in 14 trials because captured delivery metadata cannot replace authenticated foreign genesis.

| Actual component maximum | Metadata bytes | Input-work units |
|---|---:|---:|
| Entry anchor candidates | 128 | 279,936 |
| Nonforeign retained reader | 192 | 1,502,138 |

The audit reconciles all 102 exclusive six-axis component deltas. Cumulative after-reader snapshots already include the anchor work and must not be added to it again. Each entry's component budget is fresh; combining these maxima does not produce a production-pass cost. Forecast vectors remain forecasts, not consumed debits.

The largest sampled entry is 4,372 bytes at sequence 150. The largest direct-input byte total is 45,648 at 179. Sequence 153 has five anchor candidates and an upper publication size of 2,816 bytes. These measured geometries narrow the diagnosis; they do not quote privacy, inventory, selection, transfer, bookkeeping or full frontier costs.

## What the evidence does not contain

The confirmed-149 archive row, frontier envelope, retained pass index, target responses/replay scopes and parent Git commit/path trees remain unavailable. The captured journal entry 149 is known; its private archive context is not. Without those inputs, no same-context whole-driver reproduction, full finish measurement or pass-fit claim follows. No synthetic private row/frontier has been installed, and no production pass or hosted recovery was induced by this local diagnostic.

The diagnostic's original before/after records agree at the approved checkpoint with 29 selected pins. Independent audit later rehashed 28; the original Node 26.12.1 executable had been removed after the run. Its original runtime pin remains in the recorded boundaries. That is not a later independent rehash, complete loader closure or continuous-custody proof. A future run must bind its then-current tools; this tool change does not justify repeating the completed measurement.

The initial V1 command failed with exit 9 because Node rejected a flag before evaluation. That failed attempt remains failed and measured no components. Its outer cost was 0.06 seconds wall and 0.06 seconds CPU. The corrected run used 1.17 seconds wall and 0.88 seconds CPU. Inner timings of 0.6022595 seconds wall and 0.547718 seconds CPU overlap the outer command and are not added. These are partial local measurements, not a benchmark or complete delivery cost.

## Implemented fixed-next-entry path

The implementation follows the accepted single-alarm design. It adds no durable hint or extra scout/build alarm. The fixed path is implemented at `6fa5eef0`; the strengthened local witness is committed at `de263bbd`.

For an eligible published, confirmed v2 row without pending Mark or stop, the driver reads the already-validated previous capacity-deferral count. Zero keeps normal adaptive planning. A positive count chooses exactly `confirmed.through.seq + 1` on the later genuine capacity-retry alarm. It does not attempt the fallback after exhausting adaptive planning in the same alarm. The count selects a strategy, never authorizes an input. Confirmation resets the existing wake so normal batching can resume.

Fresh target resolution and source setup remain in their existing order. The fixed path calls `prepare(next)` once on that same current budget before native inventory. It performs complete native inventory once, retaining the module-owned validated result through the remaining quote and build. It does not reuse a previous alarm's route, source authorization, row-snapshot token or inventory, and does not inventory again after quoting.

The admission boundary is actual work already spent plus every remaining operation through confirmation, with an additional 65,536-byte metadata margin. Completed inventory is already charged; omitting its future forecast is not a refund or credit. Body/input reads, publication and journal work, transfer, bookkeeping, frontier and any new handoff work remain paid. All original dimensions, prices, deadlines, row/wake and Mark/frontier comparisons, fresh authority checks and pending-Mark rebuild semantics remain. Initialization, conversion, unpublished-anchor migration and existing pending work retain their paths.

A complete quote that cannot fit uses the existing prepaid capacity retry/backoff. Malformed or unsupported inventory remains a hard refusal; an unexpected actual overrun remains a failed bound or forecast witness. Neither the measured components nor the old hosted quote proves that this new boundary will fit Room A entry 150. The closed local witness below measures its own finish; it does not reconstruct the missing hosted context.

Independent design review V2 found no material design blocker. It corrected the earlier source-order assessment: normal source setup can remain in place because entry-specific reads occur inside `prepare(next)`. This is a design review, not implementation verification or authentic approval of a completed candidate.

## Closed local validation

Owning run `8132` completed naturally with both Scope compiler contexts passing and all 47 cases passing across six whole files: driver, build, row, frontier store, installed archive and input work. All 47 collected, started, terminal and JSON case records agree, with no unhandled errors or retries. Nineteen intermediate result callbacks are absent, all in the driver file. Their terminal and JSON records pass; the missing callbacks are not inferred.

The Native driver witness uses declared target, source and provider stand-ins. After a genuine capacity deferral, it confirms exactly the next entry, from 63 to 64. Its quote covers all six budget dimensions. The complete quote uses 830,681 metadata bytes, including work already spent; actual completion uses 648,076. The final 4 MiB metadata headroom is 3,546,228 bytes, exceeding the required 65,536-byte margin. These are costs for this local witness, not the hosted entry-150 pass.

The same witness refuses a 524,288-byte metadata cap with a 371,929-byte shortfall. A second cap of 863,449 bytes admits the quoted 830,681 bytes but not the additional margin: 896,217 bytes are required, leaving a 32,768-byte shortfall. Fresh source withdrawal reports retry/unavailable without a fixed-finish quote. The hard-refusal diagnostic reports stopped/other; its masked reason is not evidence of a more specific public error.

Node run `64240` completed naturally with all four entry-point inventory cases passing and compatibility accepted. It ran at implementation checkpoint `6fa5eef0`. The later `de263bbd` change only strengthens the driver test, so this is carried evidence, not a second Node run at that later head.

The negative control `26505` disables only the fixed-path selection. Its whole driver file records 18 passing cases and one intended failure at `archive-driver.test.ts:474`: `fixedFinish` is null where the witness requires a quote. The old adaptive route reaches its constrained finish refusal instead. Later assertions in that failed case are unreached. The control remains exit 1; it is not relabelled as a passing test run. Root restored the exact clean positive head and tree. Independent closed audits of the affected run and control are accepted.

The strengthened installed old-register-17 Grow witness also completed after a fixture correction. Its first run, `75547`, passed the test compiler but recorded seven passing cases and one failure. The new assertion assumed `candidate.entry.uses.length > 0`, while the actual signed entry has zero uses. That failure occurred before the capacity or fixed-path checks and earns no entry-147 progress claim.

The test-only correction preserves the actual device-target prepared rule and one inline authority grant without claiming a retained foreign-use body. Follow-up `61908` passed the test compiler and all eight cases in the whole installed file. It first forces a genuine zero-entry capacity retry at `scout-open`, with a one-entry shortfall. The archive row, confirmed receipt and peer side effects remain unchanged.

On the next pass, a fresh budget with the original allowance lets the real Grow source ports confirm exactly entry 147 from confirmed 146. The complete quote uses 2,930,245 metadata bytes; actual completion uses 2,633,486, leaving 1,560,818 bytes of headroom. The quote and actual costs satisfy all six original dimensions, including the 65,536-byte metadata margin. The following normal pass drains entries 148–152 with `fixedFinish: null`, showing normal batching resumes after confirmation resets the capacity wake.

This witness runs at test-only correction `9ecfafb0`. Its provider is the fixture Artifacts peer. It covers the actual rule and device-target geometry with zero retained foreign uses, not Room A's missing private inputs. Its new branch returns after draining, before that case's later clone/offline assertions. Other existing cases retain their own coverage; no new Room A clone result is claimed. The closed result and counters are Root-verified. The independent pair audit reconciles all eight started, terminal and JSON cases, with no unhandled errors. Its three clean finite Source boundaries per run do not establish continuous physical dependency custody. Root accepted that audit in event `473f861c` after authenticating all leaves and reading the full receipt.

The maintained affected-run guards compare four clean boundaries, including 1,730 active Source/configuration hashes, two external inputs, 14 workspaces and 41 export aliases. They are finite boundary checks, not a physical dependency-pool census, environment vector or continuous-custody proof. The control's two finite guards likewise do not establish physical restoration to the same inode.

| Closed local command | Wall seconds | CPU seconds |
|---|---:|---:|
| Two Scope compilers and 47 owning cases | 65.64 | 79.27 |
| Compatibility and four Node inventory cases | 1.49 | 1.84 |
| Whole-driver negative control | 12.61 | 14.50 |
| First installed-witness run, failed | 56.14 | 69.54 |
| Corrected installed-witness follow-up | 56.10 | 69.47 |

These outer commands are separate. Their nested compiler, body and child timings overlap and are not added. The earlier component costs remain separate partial measurements, not a complete edit-to-review cost or portable performance benchmark.

## Remaining evidence and rollout

The ordinary gate, authentic Architecture, Security and Simplification review, and planner rollout remain pending. The private confirmed-149 context is still missing, so hosted entry-150 fit and recovery remain unproved. No prior failure is reclassified by these local successes. Private evidence grants do not authorize publication of raw entry, rule or provider bodies, environment values, credentials or physical snapshots.
