# O2 single-writer, retry and admission record

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:98ff871890cf837d129fd08371ba3a0a83dce890`.
Initial base: `48fb4e2`, O1's first measured integration checkpoint.
Branch: `request/o2-retry-admission`.

## Declared checks

The fixture uses the existing authenticated `Journal` and SQLite backend.
It adds no append, admission, retry, signature, or model implementation.
Every submitted intent is signed and saved before its client is released.

| Named schedule | Expected result |
|---|---|
| `barrier-six-forward`, `barrier-six-reverse`, `barrier-six-rotated` | Six independent OS client processes release together to one local socket writer. Each schedule sends 42 requests: 24 distinct offers, 12 copies of one exact intent, and six attempts under one action identity split between two signed contents. There are exactly 26 new entries, 13 replays, and three `changed_content` refusals. Every receipt matches its saved intent, position and predecessor; restart preserves the entire prefix and authenticates the chain. |
| `before-append` | SIGKILL before submission leaves no receipt, entry, consumed token, or publication. The saved intent appends once after restart. |
| `after-consumption` | SIGKILL after the transaction's consumption write rolls the whole append back. Retry appends once and consumes the same invitation. |
| `after-commit` | SIGKILL immediately after SQLite commit and before the reply retains entry, receipt, consumption and outbox row. Exact retry returns the saved receipt with no second action. |
| `after-reply-before-notification` | The child emits the committed receipt and dies before publication. Restart preserves the acknowledged prefix, recovers that receipt, and publishes the saved entry. |
| `after-delivery-before-ack` | A separate publishing process writes the saved wire entry, then dies before outbox acknowledgment. Restart repeats those exact bytes once; delivery acknowledgment and further retries add no action or publication. |
| Removed participant at the admission interface | A real Journal append is committed and its process killed before reply. After authenticated restart, the fixture supplies a current-participant answer excluding the original actor. Exact saved retry without a credential returns the persisted receipt. A fresh action with the old credential is refused as `not_a_participant`; changed content is refused before that admission check. A second restart preserves the same result. |

The three concurrent schedules vary client-local request ordering. OS arrival
order is deliberately unspecified. They establish serialization under the
profile's synchronous signer and single authoritative file, not arrival-time
fairness, asynchronous signing, independent database copies, or malicious
writer exclusion.

F0 has no participant-removal event. The removed-participant case exercises
the existing serving-party admission interface with controlled current
membership. It does **not** establish a complete removal protocol or alter
participation history. Root accepted this explicit boundary before the tests
were implemented.

The durability scope is unchanged from O1: application-process crash on the
same host with intact local disk. There is no host-loss, disk-loss, malicious
rollback, failover, or replication claim. The SIGKILL cases are named process
schedules, not thrown exceptions or mocked transaction outcomes. O1 retains
the more granular eight-point append atomicity checks.

## Runs

Source will be committed before the first O2 run. Results are recorded in a
separate commit. Final integration waits for the accepted O1/V6 source.
