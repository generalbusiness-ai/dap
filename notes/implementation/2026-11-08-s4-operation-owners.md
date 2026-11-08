# Give parked attempts and replies their own owners

Status: source draft under request `12f63139`, promise `50f7d6d7`. Scope `4c53d3ea` records the extraction before edits. No S4 compiler, test or gate has run. Independent review and landing remain ahead. The planner deploys.

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

## Evidence still due

Run the changed compiler contexts and complete operation owners after F1 releases the single validation slot. Then show the strengthened precedence witness fails without the held-answer check and restore the source before classification. Run one final maintained gate before review.

Ruling `217e53e9` keeps archive watch `64552d40` open. Before review, record one line naming every retained full gate since M4 landing `8d9080f3` and its archive-retry observation. Keep failed gates and unreached Native stages distinct from passes. A new archive retry stops S4 for planner classification. No S4 change touches archive or fold code.
