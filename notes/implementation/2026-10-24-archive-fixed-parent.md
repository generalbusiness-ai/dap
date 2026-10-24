# Fixed-cost parent reads for native archives

The repaired append path passed all four Git/Scope compiler contexts and **17 cases across six whole files**, including installed Grow, its public archive command, native store races, current-parent migration and Native300. The tested head is `7bca0d489771e56cd42c1e60a5e02b104db9c2b4`, against accepted Main `d7aea0b0`. Both new distinguishing controls matched their intended failures. The final ordinary gate remains **PENDING**. These local results do not establish hosted recovery or capacity for every permitted workload.

Earlier, the Native witness completed 200 appends with 400 retained files and zero remote parent reads. Disabling only native dispatch made its whole-file control fail at pass 25 when the remote tree exceeded the stopgap bound; the other two cases passed. Those results keep their original Source bindings.

Request `fc2548ae1ab9c7c5e859d422611f8a34fd0ff13c`; promise `28cdea0d83a29e9a02c5107d89c6e21b10341fc2`.

## Bound local state without changing authority

The chosen design retains a local Merkle witness rather than fetching growing history on every append. Its eleven objects are a commit, nine trees and a head blob: at most 28,828 raw bytes and 604 rows. Unchanged subtrees remain opaque hashes. Reads check hashes, types, exact scope/incarnation/head, path geometry, ordering and commit parent. This is append state, not export authority or a complete history proof.

Confirmed and pending keys each retain their 64 KiB cap; canonical encoding fits 42,536 bytes. `ArchiveRow` keeps its schema and limits: 2 MiB + 16 KiB for a general row, 1 MiB for a manifest, and 32 KiB for compact checked confirmation state. Original per-pass limits remain 4 MiB metadata, 64 MiB input work and 64 nodes. Other limits and deadlines are unchanged.

Private tokens own validated bytes. Stage follows `markAttempt`; promotion precedes confirmation in the same outer SQL transaction. Both compare exact prior key bytes or absence, repository, receipt and Mark. Public copied views confer no authority. Corrupt or forged state refuses without remote fallback. An authenticated contradiction of the current pending Mark stops as `rebuild-mismatch`; transient failures keep retrying. Pending state survives eviction, and exact remote readback remains first.

Cost reductions remove actual work. Size-first SQL BLOB comparisons avoid projecting and reparsing already owned bytes. Receipt-position profiles bound numeric-tree reads, row parsing and encoding before work; defaults keep full geometry. Preparation reuse shares paid private parent trees across legacy anchor lookup and append, with a busy guard across awaited work. Old manifest, range and local authority replay checks remain.

Source-owned preparation snapshots the Mark before awaiting, hashes and owns the new witness once, checks its actual commit parent, then privately encodes it before exposing a separate copied view. Unknown input, persisted frontiers, pending readback and migration bootstrap retain full validation. No spent work is refunded.

The final append repair shares six previously duplicated fixed-prefix validator visits. Hash, path, append-edge and head checks remain. Native row checks pay for a numeric-size query before projecting bounded context strings, then repeat exact measured-length fences in the final SQL query. A private scheduling ceiling narrows projection work but conveys no identity authority. Full-row scan work, returned metadata, parsing, digest, receipt and Mark comparisons remain charged. The passing store case checks larger raced context, same-size wrong identities, exact rollback and actual-versus-forecast debits.

## Migrate the current parent in a separate alarm

Planner ruling `63a9216f` replaces complete-closure bootstrap with one depth-one `blob:none` fetch of the exact confirmed commit and current companion trees, then at most one exact head-blob fetch. Limits include 18 KiB aggregate tree bodies, a 1,024-byte commit, bounded counts/framing and a separately bounded 1,024-byte head blob. The ordinary 8,487-byte stopgap and archive budgets are unchanged. Extra trees are bounded and charged; the frontier validator authenticates the selected path, rather than claiming every companion is reachable.

Wire, decoder work, object metadata, fixed buffers and returned copies consume the same remaining budget after policy checks. The private context captures the checked old row and absent keys. Prepare validates the receipt-bound witness; installation compares exact row/key bytes before a confirmed-only insert. It creates no receipt, Mark, attempt, wake or authority. The seed alarm returns before selection, mint or send. Over-bound or inconsistent input leaves native state unchanged; a later alarm appends from native state. Compatible old pending readback stays first.

Unpublished old v2 receipts retain an explicit bounded remote source for old pass manifests and authority migration. It is separate from the fixed native append source. Published steady state does not silently reread or skip historical authority proof.

## Keep closed failures and passing continuations distinct

Earlier focused runs cover 51 distinct passing cases across separate Source-bound invocations. Failed runs remain failed; passing subsets are not added into a synthetic successful whole run.

The ordinary gate at `d33eba01` passed preflight, including 40 compiler commands, then reported **3,516 PASS / 3 FAIL / 3 SKIP** across 494 files. Legacy input work failed before planning; installed Grow exceeded metadata and its command follower lacked the producer handoff. Node37 and Counting55 were unreached. The preceding gate stopped at whitespace checking before compilers or bodies. Both outcomes remain retained.

| Repair run | Actual result |
| --- | --- |
| Two-owner seal V2 | Driver/host parser calls exited 0; no tests ran. Later driver changes required new actual results. |
| Owning V2 | Git production/test and Scope production compiled; Scope test failed on two fixture annotations. All 47 bodies were unrun. Both annotations were corrected. |
| Owning V3 | Scope test compiled; 22 cases passed, then Grow failed its first append after confirming genesis zero. Its reservation needed 29 + 43 = 72 nodes against 64; other axes fit. |
| Owning V4 | 20 cases passed. The fourth bootstrap case failed while constructing its first manual historical pass, before the intended migration assertions. |
| Single-capture focused21 | All four compilers passed; eight bodies passed, Grow failed at sequence 2 after confirming through 1, and 12 cases were unfinished. Its quote exceeded the cap by one node and 49,349 metadata units. |
| Remaining9 | Store4, bootstrap4 and Native300 passed with complete callbacks. This did not change the focused21 failure. |
| Append/row focused17 | All four compilers and all 17 bodies passed, with complete collected/started/result callbacks, six passed modules, no errors, retries, repeats or signals. |

The V4 fixture had serialized zero selection attempts while selecting retained objects. The decoder correctly refused `input`. Its correction debits one selection attempt per chosen object in the same fixture budget; producer read attempts remain separate. Genuine publication/blob/Mark correspondence, assertions, caps and deadlines were preserved.

The latest owning run used the exact tested head and exited naturally 0. Its independent audit confirms full fixed Source/private dependency/tool/environment/Main/preparation/binding guards, within only the six declared cache-cell and empty Vite-temp timestamp allowances. It did not repeat healthy HTTP, host, frontier or scale cohorts outside the affected closure.

## Actual local measurements

The production Grow cohort recorded 37 prefix steps across five scopes, with 38 original/rebuild invocations: one intentional first-send retry followed by 37 confirmations. Final recorded through positions were 5, 3, 13, 10 and 1. Directory sequence 2, previously refused, now confirmed at **57 nodes, 3,566,747 metadata and 54,544,992 input work**. Across the cohort, separate dimension maxima were 57 nodes, 3,566,747 metadata and 62,328,993 input work; these need not occur in the same pass. The Directory sequence-2 scalar observer overflowed and marked its data incomplete. Confirmation and total cost are known; a complete internal quote or exact decomposition is not inferred.

The genuine Native300 backlog drained in **nine prefixes: 34, 35, 35, 35, 35, 34, 35, 34, 23**, with exact contiguous range 2–301, receipt hashes and zero remainder. The first unpublished append used two legacy parent reads; the remaining eight used none. Pass maxima were **47 nodes, 3,465,411 metadata and 38,828,099 input work**. First preplanning work stayed 6,192,246, below the retained 16 MiB assertion. The separate seed alarm archived zero entries and used 18 nodes, 267,749 metadata and 921,455 input work; its cost was not refunded or included in prefix totals.

The corrected migration witness passed six-pass, 37-pass and padded 37-pass histories. Independently measured tree bodies were **1,754 / 9,349 / 16,433 bytes**; the padded history had 77 distributed extra retained files. Each seed used 18 nodes, with respective metadata 294,205 / 455,674 / 475,240 and input work 1,037,315 / 1,727,987 / 2,155,747. These use real Native receipts and SQLite with mechanical retained selections and a scripted HTTP/token host, not arbitrary-history or hosted measurements.

The exact append case measured 10 nodes, 25 object reads, 50 port calls, 19,312 metadata and 39,198 input work. Measured edge and fixed components reconciled exactly. Prior Native300 results remain separate: the nine-case continuation used ten prefixes and up to 53 nodes; the earlier V4 run used ten and up to 62. These are Source-bound observations, not throughput or deployment comparisons, a 13,031-entry backlog drain or proof at the 4,096-entry cap.

## Controls, seals and remaining limits

The parent-binding control observed five passing Git cases and the intended wrong-parent failure. Its wrapper still failed because the promise-rejection error was named `Error` rather than the required `AssertionError`. Root accepted the semantic proof and restoration; the wrapper failure remains failed, with no retry or relabelled owner success.

Disabling only the new migration dispatch matched its distinct control: **3 FAIL / 1 PASS**, child exit 1 and owner matched. Three seed assertions observed `unavailable`; the direct over-bound adapter case passed. The exact first frame was line 164, column 75, within the authenticated seed expression. Its healthy four-case baseline came from the original remaining9 run, without a duplicate healthy baseline child. All messages and restoration guards remain retained; this was not a sole-failure control.

Disabling only the append head-seen guard matched its control: the existing Git append case accepted the no-op rewrite instead of refusing `parent` at line 83, column 66. The child exited 1 and the owner matched. Weakening only the final SQL repository-length equality likewise matched: the whole store file had **3 PASS / 1 intended FAIL**. One raced projected row crossed SQL at line 270, column 104, where the unchanged assertion required zero. Later identity checks still rejected the row; the control does not claim accepted altered custody. Both controls restored exact Source bytes and physical custody, apart from the recorded target ctime, with full guards and only declared cache/temp allowances.

Root retired the obsolete through-profile budget-only installed-suite control without capturing or running it. Its old first-genesis failure oracle was no longer proved after the later repairs. The original proposal and reassessment remain retained; existing profile limit/debit witnesses remain. This retirement is neither a matched control nor a pending execution.

The current actual driver seal is `df3ecc92e8853edd1abfb0fb47bfbe0553f2fd90bf872fe9a083ee18a6826d06`, adopted map-only at the tested head. The host carries `e376746b…`; unchanged build and row carry their prior actual seals. Earlier driver `d1a0f810…` belongs to the prior single-capture checkpoint. Seals establish Source-parser correspondence, not test or gate success.

The frozen 34-invocation ledger records **2,132.8075965412426588 seconds elapsed and 2,424.7507110000000714 seconds inclusive CPU**. Its first 30 rows remain exact; current driver seal, focused17 and the two matched controls are appended once. This is a partial local measurement account, excluding captures, Source preparation/review and unmeasured overhead. Nested child times are already included in owner totals. Load and cache were not controlled.

Validating the native base and capturing its successor still cost nine nodes each. Sharing six append-prefix visits removes different duplicated work; it does not turn the frontier's 18-node subtotal into 12. The matched published path still costs 12 more nodes than Main. On nodes alone, that creates a fit-risk band for workloads costing Main 53–64 nodes, against the unchanged 64-node cap. This is not a demonstrated new valid-workload regression or a universal bound for other shapes. Broader legal shapes and first-entry capacity remain open with the planner. Adaptive protects an already admitted prefix, but an over-budget first entry has no smaller prefix. Passing these selected fixtures is not a general progress theorem.

One ordinary final gate remains **PENDING**. Existing healthy results and controls carry only with justified Source/input correspondence. Planner report `462f064f` remains attributed hosted context: Room A reached a tree of 8,698 bytes against the old 8,487-byte allowance. No candidate deployment, hosted recovery or production throughput is claimed. The [compact repair evidence manifest](evidence/2026-10-24-archive-fixed-parent/post-gate-repair/manifest.json) pins the measured results, independent audits, controls, costs and attributed decisions. The [measurement summary](evidence/2026-10-24-archive-fixed-parent/post-gate-repair/measurement-summary.md) and [cost ledger](evidence/2026-10-24-archive-fixed-parent/post-gate-repair/cost-ledger.json) retain their limits. Original failed-run and earlier gate evidence remain in the existing subtree. No future outcome is inferred.
