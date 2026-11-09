# Give parked attempts and replies their own owners

Status: gate passed, review pending. Focused checkpoint under request `12f63139`, promise `50f7d6d7`. Scope `4c53d3ea` records the extraction before edits. Both scope compiler contexts and 27 cases in six complete owners pass at `f10b1b63`. The precedence control distinguishes after restoring clean source. Main integration, the final full gate and the retained-gate archive audit now pass as recorded below. Independent review and landing remain ahead. The planner deploys.

## Change

`Operations` previously held dispatch, the parked-attempt walk and answers in hand in one class. Two private owners now hold the memory for the latter jobs in `packages/scope/src/operations.ts`.

`ParkedAttempts` owns the walk, the waiting flag and the bounded refused-kind queue. It reads one parked page independently of the due batch. A commit restarts its walk only when an attempt waits for readiness. A later accepted kind restarts the same walk. Its narrow store type exposes only `parked`; its outside type exposes only `accepts`.

`ReplyCustody` owns answers in hand and retained-reply paging. It snapshots a bounded pending batch, keeps the first late answer, rotates an unavailable answer behind its successors, and preserves a newer answer that arrives during judgment. It validates the whole retained page before the driver offers any answer. Its outside type exposes only `replies`.

The driver keeps every durable write, publication check, sent-mark readback, send and recovery await, judgment and outside notification. It asks both owners for their wake and combines those requests in one place. A parked page or retained successor wakes immediately. An answer in hand uses the existing drain delay. An unavailable definition requests no wake. The extraction preserves the outside port's method receiver and reads the existing bounds object.

The source changes no diagnosis name or message. It changes no archive, fold, ledger rule, public interface or dependency.

## Preserve the guarantees at their current boundaries

All witnesses below use the existing real scope and SQLite fixture unless the row states otherwise. Their scripted outside ports and owner metadata prove the driver boundary, not provider custody or native authority.

| Guarantee | Existing witness and assertion |
|---|---|
| Durable mark before a send, one original send, and unknown after process loss | `operations.test.ts`, T19: abort after the request reaches the port, preserve the stored mark, record unknown after restart, and accept only the original late answer. T20's outside factory reads back the actual mark before returning an answer. |
| Cancellation during an await and restart after the mark preserve duty | T19 aborts the real Durable Object during the held original send, then checks the mark and later unknown entry. |
| Late completion after invocation retirement | `operations.test.ts`, “a late original send answer under a closed invocation…”: the old invocation has no users, then the late result writes one native outcome through a fresh dispatch turn without another send. |
| Nothing due writes nothing | T20 checks an idle pass, head, alarm and send count, including after a recovery page throws. |
| A closed attempt can retain its original answer in hand | The late-answer/unavailable-turn case checks the exact later outcome input, one original send and no extra wake after judgment. |
| One unavailable answer cannot block its successor | The held-answer fairness case uses batch 1, checks the next answer at the second pass and later records the original mint evidence. |
| An answer in hand wins over a retained reply | The same fairness case now offers one competing retained refusal for the mint while its original answer stays unavailable. Its existing head and later original-evidence assertions remain. One bounded retained page must run. No registration or deadline changes. |
| Restart visits every parked attempt despite due work | The restart-walk case checks the unsupported prefix, independent page and due batch, all original send ordinals and the final empty wake. |
| A later accepted kind runs without restart | The bounded-reaccepted-kind case places it behind an unsupported prefix, then checks one send after reads find it. The restart-accepted-kind case separately checks the first read after restart. |
| Readiness parks before the durable mark and a commit resumes it | `operation-before-send.test.ts`, host-readiness case: the unsent mark stays null, then one accepted act wakes the same attempt and exactly one send. Its other case preserves known local refusal before the mark and the unknown original afterwards. |
| Missing publication origin keeps the same recovery/late answer pending | Both rows of `operation-recovery-origin.test.ts` check unchanged sent time, no recovery send and the exact original answer after an accepted act restores origin proof. |
| Retained pages resume without another mutation | T20 checks two bounded pages across restart, unchanged unknown-entry bytes, the immediate successor wake and original send counts. |

The competing retained answer strengthens an existing witness for a previously uncovered combination. No new test registration repeats the extraction's private methods.

## Focused evidence

The frozen plan at `f10b1b63`, tree `a4aefee3`, runs scope source and test compilers, then all 27 cases across six complete operation and outside owners. The canonical scope and later scope-denial groups keep separate runtimes and their original setup, limits and deadlines. Both compilers and every case pass. I read the actual `pipeline.exit`: `exit 0`. Each case runs once, with no skips, retries, errors or unexpected cases.

The source guard retains all 2,189 inputs, the lock, 14 owned workspace bindings and 48 exports. The checkout stays clean, and no owned process remains. The outer observation is 12.635 seconds; separate command timings remain in the evidence. The maintained compatibility preparation passes before the body. No package installs.

The isolated control removes only the held-answer check before retained replies. It runs the strengthened fairness case, which fails by `AssertionError` at `operations.test.ts:332`: the head advances to 16 instead of staying at 15. I read actual owner exit 1 and driver exit 0. One case fails, no case passes, and ten cases remain unselected. The driver restores every tracked input before classification, leaving both worktrees clean and no owned process. It runs no baseline again.

The [focused manifest](evidence/2026-11-08-s4-operations-focused.manifest.json) hashes to `81250792ba213c7f0f30eb8e587ea4649994ea32ef8d917f3aca7e189771a853`. It names 14 public files and inventories 528 read-only private originals in four units under `~/play/artroom-evidence/2026-11-08-s4-`. They retain the complete reports, compiler logs, compatibility preparation, exact source comparison, control fault and restoration. Sealing reruns no validation. These results establish the selected boundaries; they do not replace the final gate or archive audit.

## Integrate M8 and complete the final gate

S4 integrates published main `0914c89e` at `d9927a103a9c1678cef33467f04210e83c0458aa`, tree `c7b7bf7d81dcf59e8a664b9ff19deb59f89618e2`. Only the four S4 paths differ from that main. Both changed operation files retain the focused checkpoint bytes. No focused test or control repeats.

Booking `8be9bf3fc08122ea2d9dbfe057bd85cb2a0ec598` runs one maintained `npm run gate`. I read the actual `gate.exit`: `exit 0`. All stages pass. Node passes 135, Counting passes 56, Plain passes 4026 with 1 skip, and Native passes 1117 with 2 skips. The reports contain no contradiction or unhandled error. All tracked inputs stay unchanged, the checkout stays clean, and every owned process closes. Process checks before and during the gate find no other validation body; those observations do not prove continuous exclusivity. The outer monotonic observation takes 1323.109 seconds, separate from command and runner timings.

The [gate manifest](evidence/2026-11-08-s4-gate.manifest.json) hashes to `565bc5dda0a56486f13ed0db6b59dfb046a809956de28f150eec6d0bf4ef8774`. It names 20 public files and inventories 2334 read-only private files. It retains the frozen task, source snapshots, complete raw stages, actual exit, command timings, report classification and archive audit. Sealing runs no tests.

Archive watch audit since M4: `2026-11-07-m5-gate` (a14c4150): Native unreached, no archive observation; `2026-11-07-m6-gate` (71863e06): archive scale passed, no retry observed; `2026-11-07-m7-gate` (6da48104): archive scale passed, no retry observed; `2026-11-07-s1-gate` (446e50d4): archive scale passed, no retry observed; `2026-11-07-s2-gate` (39b996b9): archive scale passed, no retry observed; `2026-11-07-s3-gate` (4f4944ae): Native unreached, no archive observation; `2026-11-08-s1-f1-cleanup-gate` (2f8b80af): archive scale passed, no retry observed; `2026-11-08-s1-f1-gate` (821f4ec3): archive scale passed, no retry observed; `2026-11-08-m8-final-gate` (136708cd): Native unreached, no archive observation; `2026-11-08-m8-repaired-final-gate` (0c416f8b): archive scale passed, no retry observed; `2026-11-08-m8-isolated-final-gate` (0c416f8b): archive scale passed, no retry observed; `2026-11-08-m8-cache-final-gate` (d54c8842): archive scale passed, no retry observed; `2026-11-08-s4-final-gate` (d9927a10): archive scale passed, no retry observed.

The thirteen held full gates contain ten archive-scale passes and three Native-unreached failures. Other Native failures remain failures, including the two M8 archive-scale passes inside failed gates. This audit closes no archive watch. No S4 source changes archive or fold code. Independent review and landing remain due. The planner deploys.

## Final evidence

The focused pipeline and control use source `f10b1b6393517f28b3ca9ed2fa8efdadd067f48d`, tree `a4aefee380d217bbf6d0a5506f498dc69d20a86c`. The gate uses `d9927a10` and its full tree recorded above. The table names retained driver copies where the original invocation used a temporary path. Those copies identify preserved command bytes, not a new invocation. Output paths are relative to the corresponding public manifest directory. Complete command arguments remain in the retained originals.

| Check | Command or retained driver | Actual exit | Output and SHA-256 |
|---|---|---|---|
| Scope source compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.json` | 0 | `phase-outcomes.json`: `26a9df8273c772adf1c56c6575171f238cf4ab066c97b6678c138f3969d63711` |
| Scope test compiler | `node node_modules/typescript/bin/tsc -p packages/scope/tsconfig.test.json` | 0 | `phase-outcomes.json`: `26a9df8273c772adf1c56c6575171f238cf4ab066c97b6678c138f3969d63711` |
| Complete 27-case body | Recorded body command in `phase-outcomes.json` | 0 | `coverage-summary.json`: `ac4e9818888f3b9e13da9315e941970eb7b5ec7c24aa226e220f08bef060c790` |
| Held-answer precedence control | Retained `2026-11-08-s4-control/driver.py` | Owner 1 at the intended assertion; driver 0 | `control-summary.json`: `5f2e0db0ff9fe7ed2a3a5d20dc38f350523ac54d33df3ea33181b024475c9548` |
| Final maintained gate | `npm run gate` | 0 | `test-summary.json`: `684f12fd7f5ea96eb879640d815dd79038ee6c8fa981569d6b6326fd31a9f17d` |
| Thirteen-gate archive audit | Retained gate audit in `archive-watch-audit.json` | 0 | `archive-watch-audit.json`: `27931e72c40e4877aad517f9f928f6340a7ea4efe434dcb745bc969e60682ecd` |

## Open limits

Request `12f63139` still requires independent exact-head review and a merge-plan retirement audit before landing. Ruling `217e53e9` keeps archive watch `64552d40` open. The audit above meets its retained-gate reporting requirement and does not close the watch. A new archive retry stops S4 for planner classification. The planner owns deployment.
