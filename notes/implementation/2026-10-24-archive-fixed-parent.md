# Fixed-cost parent reads for native archives

The local Native witness completed 200 appends with 400 retained files and zero remote parent reads. Disabling only native dispatch made the same whole-file control fail at pass 25 on an oversized remote tree; its other two cases passed. The chosen path bounds local parent state per pass without raising receipt, authority or work limits. This does not establish hosted capacity or oversized legacy recovery.

Request `fc2548ae1ab9c7c5e859d422611f8a34fd0ff13c`. Promise `28cdea0d83a29e9a02c5107d89c6e21b10341fc2`. Accepted Main is `d7aea0b0`. The earlier checked fixture checkpoint was `62e76a4992c9671a802a30c5f0cbe91cb4b6513a`, tree `483c829f8cc3896e7f7e5e1a8873192701bee3af`. The later gate ran at `d33eba016678a911fbc27e245d40eaa22e4c92d7`.

**Focused validation completed in separate runs.** Earlier 29 passing cases, 16 preparation-reuse passes and six continuation passes retain their separate Source bindings. The reuse run itself failed with five unfinished cases; the corrected continuation passed. Both controls matched. The later ordinary gate failed three cases; the current repair has not yet run its owning checks, controls or gate.

## Exact state has a fixed bound

The request considered three options. (a) Accepting hash-checked companion trees keeps their integrity checks, but response size and history traversal still grow. (b) The chosen bounded native frontier retains only the exact local path state needed for the next append, with opaque hashes for unchanged subtrees. (c) Unfiltered fetching returns blobs as well as trees and brings unbounded historical content into the response. Hash checking alone does not make either remote-history option fixed-cost.

The eleven-object witness contains a commit, nine trees, and a head blob, at most 28,828 raw bytes and 604 rows. Parsers verify hashes, repository and scope binding, head, ordering, and commit parent.

Confirmed and pending keys each cap at 64 KiB. Canonical encoding fits 42,536 bytes. `ArchiveRow` keeps its schema and limits: 2 MiB + 16 KiB general row, 1 MiB manifest, and 32 KiB only for checked compact confirmation state.

Opaque tokens preserve private validated bytes. Stage follows `markAttempt`. Promotion precedes confirmation in the same outer SQL transaction. Both recheck exact prior key bytes or absence, receipt, and Mark. Corrupt or forged state refuses without remote fallback. Authenticated contradictions stop the exact current Mark as `rebuild-mismatch`. Transient failures retain retries. Pending state survives eviction. Exact readback remains first.

## Cost reductions correspond to less work

Paid SQL BLOB comparison checks captured trusted bytes without projecting and reparsing the same bodies. Type, size, existence, exact byte equality and transaction checks remain. Initial untrusted loads and validation are unchanged. Three maximum comparisons save 263,376 forecast metadata and add 255,504 input work; spent work is never refunded.

Frontier capture gives `JournalObjectReader.tree` its geometry bound. Excess rows refuse before decode, allocation or row debit; generic readers retain 4,096 rows. Postparse checks remain. Valid and rejected captures reserve at most 604 rows instead of the malformed-prefix 957-row forecast, saving 361,472 metadata and input-work units. No cap is raised. Some shapes can still exceed budget.

The current repair also bounds each numeric frontier level by the confirmed or selected receipt position. That bound constrains reads, tree parsing, validation and encoding before the corresponding work. The maximum remains 604 rows and 28,828 bytes; unspecified forecast callers retain that maximum. At position zero, Source arithmetic reduces the failed finish forecast by 1,013,760 metadata units. The projected 260,609-unit margin is not an observed successful pass.

## Legacy migration remains bounded

Planner ruling `63a9216f` replaces the former complete-closure bootstrap. A confirmed v2 receipt with both keys absent seeds through one depth-one, `blob:none` read of its exact current commit and trees, followed by at most one exact head-blob read. It does not walk history or fall back to ordinary remote parent reads. The fixed migration limits and actual admission measurements will be recorded after the owning run; the ordinary 8,487-byte stopgap allowance and original pass budgets remain unchanged.

The migration adapter charges bounded framing, actual object counts, input work and returned copies to the same remaining budget after the existing policy checks. The existing private capture, validation and compare-and-swap installer bind commit, receipt, scope, incarnation, paths and head. Installation writes only confirmed frontier metadata. It creates no receipt, Mark, attempt or wake, and retries before selection, mint or send. Over-bound or inconsistent inputs leave the native state unchanged. Old pending readback remains first.

The genuine preparation repair reuses one receipt-bound `JournalPassPreparation` for `journalLegacyCopyCount` and append preparation. Already parsed private parent trees are reused; paid work is not credited back. Preparation, forecasting and consumption share a busy guard across awaited work. Overlapping operations refuse before spending or corrupting the session. Emission still requires the exact selected prepared paths. Published appends use the native frontier.

Before this migration repair, the real bootstrap witness confirmed its first append at 62 nodes (4 entries, 91 attempts, 243 calls, 1,986,052 metadata and 35,815,082 input work). This is a measured small-archive success, not a capacity promise. That result used the superseded complete-closure migration and does not validate the new current-parent route.

## Keep failed runs and completed coverage distinct

Audits retain original status, costs, guards, and identities. Pending reporter rows do not prove executed bodies.

Earlier audits retain two compiler failures with no bodies, a driver failure with metadata 83,680 over cap, scale failures at pass 1 (including a 15,393-unit diagnostic excess), and pass 98 (1,591 over cap). The bounded-tree run passed 29, failed bootstrap and left five unfinished. Its diagnostic measured finish nodes 38 + 36 = 74 against 64; other dimensions fit. Temporary diagnostics are removed. These distinct local failures do not establish a hosted cause. Original failure audits are selected in the evidence manifest; none is relabelled successful.

The later genuine reuse run at `54607417` passed all four compilers, Git 13 and bootstrap 3. It failed the first publication case and left five cases unfinished: **16 PASS / 1 FAIL / 5 unfinished**. Its [audit](evidence/2026-10-24-archive-fixed-parent/audits/reuse-outcome-audit.json) preserves that failure and exact fixed guards. Owner wall was 16.564348 seconds and inclusive CPU 25.143211 seconds; nested child costs overlap.

That fixture had a legacy receipt through 108: 109 entries consisting of genesis, eight remarks and 100 checkpoints. Its absent native frontier required a closure larger than the admitted bootstrap profile. The exact first internal refusing budget site was not captured. The test-only correction initializes genuinely validated pre-existing native frontier state using the real Git capture, codec and confirmed-only installer, paid by the ordinary fixture budget. It preserves the old row, receipt and absent pending key without granting publication authority or proving oversized recovery.

At `62e76a49`, Scope test compilation and the whole publication 3 plus parent-state 3 passed: **6 PASS, no errors or signals**. The original focused child exited 0. Owner wall was 11.225245 seconds and inclusive CPU 15.508597 seconds; child wall 8.962115 seconds is nested. The [independent continuation audit](evidence/2026-10-24-archive-fixed-parent/audits/continuation-outcome-audit.json) verifies all six identities, callbacks and full fixed guards within the declared cache allowance; root accepted it as `5a4acd54`.

The parent-state witness uses native SQLite, production appends and a scripted host; it checks the 801-file final graph. Its other cases cover exact Mark recovery/readback after eviction and legacy pending confirmation without another send. Publication cases retain floor blocking, real signed backfill, nonempty anchors, exact Mark rebuilding and restart preservation.

The [geometry control](evidence/2026-10-24-archive-fixed-parent/audits/geometry-control-audit.json) matched the intended extra 512-unit row debit in case six: five passed, mutant child exited 1, owner exited 0. Exact original inode/bytes and full guards were restored. Its prerequisite was healthy Git six, not the failed whole baseline.

The native-dispatch denial control also matched on the whole parent-state file. Disabling only the native seam made the 200-append case fail its accepted-build assertion with `unavailable` at pass 25 (25 completed). The actual refusal was `too-large` / `inflated bytes`, tree type, request ordinal 2: 8,703 inflated bytes across 59 trees exceeded maximum 295 + 8,192 = 8,487. The other two cases passed. This demonstrates the old remote-parent path's growing cost in this fixture; it is not a hosted threshold.

Root observed session `22865` naturally exit 0 (`78ea10`), mutant child `78982` exit 1 without a signal. Raw assertion, observation and progress are retained. Original source was restored, checkout clean, errors/signals empty. Owner wall was 9.247072 seconds, inclusive CPU 10.701100; nested child wall was 6.197554 seconds. The [independent audit](evidence/2026-10-24-archive-fixed-parent/audits/native-control-outcome-audit.json) confirms the sole intended assertion, two passes and full guards. Original inode and mtime were preserved; only target ctime changed. The accepted final-union Source review is pinned in the evidence manifest.

## Actual seals and hosted context

Earlier parser session `54692` exited 0 with exact guards. Its [audit](evidence/2026-10-24-archive-fixed-parent/audits/history-artroom-archive-fixed-parent-final-seal-independent-audit-20261024-v4.json) retains driver and host attribution. Values at the failed gate were:

- `archive-build.ts`: `e1111bfef1fe94cc8436498679395ba1b9b8adba3db8651f4f24d87d68696853`.
- `archive-driver.ts`: `a3d1bc20aeab36e4153fd40fef3437f6d53b7c3ff432097c68a126ac289a4249`.
- `archive-host.ts`: `ab91d539daf94c381886d515e9510322e3d79e7cdf48cfd3efe20f2e88a4c75b`.

The [single build-seal audit](evidence/2026-10-24-archive-fixed-parent/audits/build-seal-audit.json) verifies the new actual build value, adopted map-only at `54607417`. Original session `5000` exited 0; full snapshots were exact. Stderr contained only Node’s experimental stripping warning. Owner wall was 2.319065 seconds and inclusive CPU 2.331611 seconds. Unchanged `archive-row.ts` carries its prior actual seal. Seals do not establish test or gate success.

Planner report `462f064f` observed Room A stall at a tree of 8,698 bytes against 8,487. That is attributed hosted context, not candidate recovery.

## Failed gate and remaining validation

The first gate at `05ec70ff` stopped at whitespace checking: a copied raw stderr log ended with an extra blank line. No compiler or test ran. The corrected evidence stores that log in a reversible UTF-8 JSON record; its decoded bytes and original hash are unchanged.

The next gate at `d33eba01` naturally exited 1. All seven preflight stages passed, including 40 compiler commands. Vitest reported **3,516 PASS / 3 FAIL / 3 SKIP** across 494 files. The later 37 Node cases and 55 Counting checks were unreached. There were no unhandled errors or signals. Missing progress callbacks for terminal passing cases remain reporting gaps, with no inferred body start or physical drain.

The legacy input-work case failed before its first planning observation. Its migration and append phases are now separated in the proposed witness. The installed Grow budget assertion expected two entry units but recorded one: used metadata 2,382,306 plus forecast finish 2,565,149 exceeded the 4,194,304 cap by 753,151. Its public command follower then failed because the producer had not published its handoff. These are retained failures, not successful prerequisites.

The gate owner measured 1,452.932674 seconds elapsed and 1,641.400524 seconds inclusive CPU. Its child cost is nested and must not be added. Full fixed guards were exact except the declared same-inode Vitest results-cache cell. The compact failure companion and independent audit retain original assertions, metadata, byte-offset excerpts, input bindings and costs; the large raw log remains external.

The measured subtotal for 21 retained invocations is 1,983.285161 seconds elapsed and 2,238.259532 seconds CPU. This is a sum of separately measured invocations, not end-to-end calendar time. It excludes unmeasured Source preparation, reviews, metadata captures and tool overhead; cache and load were not controlled. Earlier 19 rows remain unchanged, with the two failed gates appended.

Current repair validation is **PENDING**: affected compilers and seven whole test files; migration and frontier-cost controls; actual seals for changed driver and host; then one ordinary gate and exact review. The existing 200-append and native-dispatch results retain their original Source bindings. The new tests must measure seed-only migration separately from the same 300-checkpoint Native drain, including actual prefixes, sequence advance, per-pass costs and pass count. No hosted execution, Room A recovery or capacity claim is established.
