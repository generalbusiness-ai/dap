# Fixed-cost parent reads for native archives

The local Native witness completed 200 appends with 400 retained files and zero remote parent reads. Disabling only native dispatch made the same whole-file control fail at pass 25 on an oversized remote tree; its other two cases passed. The chosen path bounds local parent state per pass without raising receipt, authority or work limits. This does not establish hosted capacity or oversized legacy recovery.

Request `fc2548ae1ab9c7c5e859d422611f8a34fd0ff13c`. Promise `28cdea0d83a29e9a02c5107d89c6e21b10341fc2`. Accepted Main is `d7aea0b0`. Current checked fixture checkpoint is `62e76a4992c9671a802a30c5f0cbe91cb4b6513a`, tree `483c829f8cc3896e7f7e5e1a8873192701bee3af`.

**Focused validation completed in separate runs.** Earlier 29 passing cases, 16 preparation-reuse passes and six continuation passes retain their separate Source bindings. The reuse run itself failed with five unfinished cases; the corrected continuation passed. Both controls matched; the ordinary gate is pending.

## Exact state has a fixed bound

The request considered three options. (a) Accepting hash-checked companion trees keeps their integrity checks, but response size and history traversal still grow. (b) The chosen bounded native frontier retains only the exact local path state needed for the next append, with opaque hashes for unchanged subtrees. (c) Unfiltered fetching returns blobs as well as trees and brings unbounded historical content into the response. Hash checking alone does not make either remote-history option fixed-cost.

The eleven-object witness contains a commit, nine trees, and a head blob, at most 28,828 raw bytes and 604 rows. Parsers verify hashes, repository and scope binding, head, ordering, and commit parent.

Confirmed and pending keys each cap at 64 KiB. Canonical encoding fits 42,536 bytes. `ArchiveRow` keeps its schema and limits: 2 MiB + 16 KiB general row, 1 MiB manifest, and 32 KiB only for checked compact confirmation state.

Opaque tokens preserve private validated bytes. Stage follows `markAttempt`. Promotion precedes confirmation in the same outer SQL transaction. Both recheck exact prior key bytes or absence, receipt, and Mark. Corrupt or forged state refuses without remote fallback. Authenticated contradictions stop the exact current Mark as `rebuild-mismatch`. Transient failures retain retries. Pending state survives eviction. Exact readback remains first.

## Cost reductions correspond to less work

Paid SQL BLOB comparison checks captured trusted bytes without projecting and reparsing the same bodies. Type, size, existence, exact byte equality and transaction checks remain. Initial untrusted loads and validation are unchanged. Three maximum comparisons save 263,376 forecast metadata and add 255,504 input work; spent work is never refunded.

Frontier capture gives `JournalObjectReader.tree` its geometry bound. Excess rows refuse before decode, allocation or row debit; generic readers retain 4,096 rows. Postparse checks remain. Valid and rejected captures reserve at most 604 rows instead of the malformed-prefix 957-row forecast, saving 361,472 metadata and input-work units. No cap is raised. Some shapes can still exceed budget.

## Legacy migration remains bounded

A confirmed v2 receipt with both keys absent may seed once through complete-closure `objects`, under original ceilings of 8 MiB and 8,192 objects and tighter remaining-budget admission before credentials or HTTP. It allows one GET and POST, with no missing-object retry or isolated-read tariff. Installation rechecks exact row/key state and inserts only confirmed frontier metadata. It creates no receipt, Mark, attempt or wake; the driver retries before selection, mint or send. Old pending readback can confirm without bootstrap or another send. Over-cap archives still refuse.

The genuine preparation repair reuses one receipt-bound `JournalPassPreparation` for `journalLegacyCopyCount` and append preparation. Already parsed private parent trees are reused; paid work is not credited back. Preparation, forecasting and consumption share a busy guard across awaited work. Overlapping operations refuse before spending or corrupting the session. Emission still requires the exact selected prepared paths. Published appends use the native frontier.

The real bootstrap witness now confirms its first append at 62 nodes (4 entries, 91 attempts, 243 calls, 1,986,052 metadata and 35,815,082 input work). This is a measured small-archive success, not a capacity promise. Missing-state bootstrap still uses a budget-derived complete-closure bound; an oversized closure can refuse before any read.

## Keep failed runs and completed coverage distinct

Audits retain original status, costs, guards, and identities. Pending reporter rows do not prove executed bodies.

Earlier audits retain two compiler failures with no bodies, a driver failure, scale failures at pass 1 (metadata 83,680 and 15,393 over cap), and pass 98 (1,591 over cap). The bounded-tree run passed 29, failed bootstrap and left five unfinished. Its diagnostic measured finish nodes 38 + 36 = 74 against 64; other dimensions fit. Temporary diagnostics are removed. These distinct local failures do not establish a hosted cause. Original failure audits are selected in the evidence manifest; none is relabelled successful.

The later genuine reuse run at `54607417` passed all four compilers, Git 13 and bootstrap 3. It failed the first publication case and left five cases unfinished: **16 PASS / 1 FAIL / 5 unfinished**. Its [audit](evidence/2026-10-24-archive-fixed-parent/audits/reuse-outcome-audit.json) preserves that failure and exact fixed guards. Owner wall was 16.564348 seconds and inclusive CPU 25.143211 seconds; nested child costs overlap.

That fixture had a legacy receipt through 108: 109 entries consisting of genesis, eight remarks and 100 checkpoints. Its absent native frontier required a closure larger than the admitted bootstrap profile. The exact first internal refusing budget site was not captured. The test-only correction initializes genuinely validated pre-existing native frontier state using the real Git capture, codec and confirmed-only installer, paid by the ordinary fixture budget. It preserves the old row, receipt and absent pending key without granting publication authority or proving oversized recovery.

At `62e76a49`, Scope test compilation and the whole publication 3 plus parent-state 3 passed: **6 PASS, no errors or signals**. The original focused child exited 0. Owner wall was 11.225245 seconds and inclusive CPU 15.508597 seconds; child wall 8.962115 seconds is nested. The [independent continuation audit](evidence/2026-10-24-archive-fixed-parent/audits/continuation-outcome-audit.json) verifies all six identities, callbacks and full fixed guards within the declared cache allowance; root accepted it as `5a4acd54`.

The parent-state witness uses native SQLite, production appends and a scripted host; it checks the 801-file final graph. Its other cases cover exact Mark recovery/readback after eviction and legacy pending confirmation without another send. Publication cases retain floor blocking, real signed backfill, nonempty anchors, exact Mark rebuilding and restart preservation.

The [geometry control](evidence/2026-10-24-archive-fixed-parent/audits/geometry-control-audit.json) matched the intended extra 512-unit row debit in case six: five passed, mutant child exited 1, owner exited 0. Exact original inode/bytes and full guards were restored. Its prerequisite was healthy Git six, not the failed whole baseline.

The native-dispatch denial control also matched on the whole parent-state file. Disabling only the native seam made the 200-append case fail its accepted-build assertion with `unavailable` at pass 25 (25 completed). The actual refusal was `too-large` / `inflated bytes`, tree type, request ordinal 2: 8,703 inflated bytes across 59 trees exceeded maximum 295 + 8,192 = 8,487. The other two cases passed. This demonstrates the old remote-parent path's growing cost in this fixture; it is not a hosted threshold.

Root observed session `22865` naturally exit 0 (`78ea10`), mutant child `78982` exit 1 without a signal. Raw assertion, observation and progress are retained. Original source was restored, checkout clean, errors/signals empty. Owner wall was 9.247072 seconds, inclusive CPU 10.701100; nested child wall was 6.197554 seconds. The [independent audit](evidence/2026-10-24-archive-fixed-parent/audits/native-control-outcome-audit.json) confirms the sole intended assertion, two passes and full guards. Original inode and mtime were preserved; only target ctime changed. The accepted final-union Source review is pinned in the evidence manifest.

## Actual seals and hosted context

Earlier parser session `54692` exited 0 with exact guards. Its [audit](evidence/2026-10-24-archive-fixed-parent/audits/history-artroom-archive-fixed-parent-final-seal-independent-audit-20261024-v4.json) retains driver and host attribution. Current values are:

- Current `archive-build.ts`: `e1111bfef1fe94cc8436498679395ba1b9b8adba3db8651f4f24d87d68696853`.
- `archive-driver.ts`: `a3d1bc20aeab36e4153fd40fef3437f6d53b7c3ff432097c68a126ac289a4249`.
- `archive-host.ts`: `ab91d539daf94c381886d515e9510322e3d79e7cdf48cfd3efe20f2e88a4c75b`.

The [single build-seal audit](evidence/2026-10-24-archive-fixed-parent/audits/build-seal-audit.json) verifies the new actual build value, adopted map-only at `54607417`. Original session `5000` exited 0; full snapshots were exact. Stderr contained only Node’s experimental stripping warning. Owner wall was 2.319065 seconds and inclusive CPU 2.331611 seconds. Unchanged `archive-row.ts` carries its prior actual seal. Seals do not establish test or gate success.

Planner report `462f064f` observed Room A stall at a tree of 8,698 bytes against 8,487. That is attributed hosted context, not candidate recovery.

## Remaining validation

The measured edit subtotal will be added with the gate outcome. Its cost ledger is not part of this evidence adoption.

Ordinary `npm run gate`, its outcome audit, measured edit subtotal and final review are **PENDING**. Coverage comprises 51 distinct cases in separate Source-bound runs: earlier 29, genuine reuse 16, then continuation 6. This is not a single whole-owning PASS. Full multi-megabyte guards remain external, pinned by the audits. The compact evidence manifest records retained results, coverage and audits. No hosted execution or capacity is established.
