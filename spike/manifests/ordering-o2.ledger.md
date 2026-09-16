# O2 single-writer, retry and admission record

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:98ff871890cf837d129fd08371ba3a0a83dce890`.
Initial base: `48fb4e2`, O1's first measured integration checkpoint.
Branch: `request/o2-retry-admission`.

## Declared checks

The fixture uses the existing authenticated `Journal` and SQLite backend.
It adds no append, admission, retry, signature, or model implementation.
Each concurrent client input and crash target is signed and saved before
its process starts.

| Named schedule | Expected result |
|---|---|
| `barrier-six-forward`, `barrier-six-reverse`, `barrier-six-rotated` | Six independent OS client processes release together to one local socket writer. Each client sends its requests in one socket write, and the writer applies each received batch contiguously. Each schedule sends 42 requests: 24 distinct offers, 12 copies of one exact intent, and six attempts under one action identity split between two signed contents. There are exactly 26 new entries, 13 replays, and three `changed_content` refusals. Every receipt matches its saved intent, position and predecessor; restart preserves the entire prefix and authenticates the chain. |
| `before-append` | SIGKILL before submission leaves no receipt, entry, consumed token, or publication. The saved intent appends once after restart. |
| `after-consumption` | SIGKILL after the transaction's consumption write rolls the whole append back. Retry appends once and consumes the same invitation. |
| `after-commit` | SIGKILL immediately after SQLite commit and before the reply retains entry, receipt, consumption and outbox row. Exact retry returns the saved receipt with no second action. |
| `after-reply-before-notification` | The child emits the committed receipt and dies before publication. Restart preserves the acknowledged prefix, recovers that receipt, and publishes the saved entry. |
| `after-delivery-before-ack` | A separate publishing process writes the saved wire entry, then dies before outbox acknowledgment. Restart repeats those exact bytes once; delivery acknowledgment and further retries add no action or publication. |
| Removed participant at the admission interface | A real Journal append is committed and its process killed before reply. After authenticated restart, the fixture supplies a current-participant answer excluding the original actor. Exact saved retry without a credential returns the persisted receipt. A fresh action with the old credential is refused as `not_a_participant`; changed content is refused before that admission check. A second restart preserves the same result. |

The three concurrent schedules vary client-local request ordering. They do
not force interleaving between individual requests from different clients;
each socket batch is applied contiguously. OS arrival order is deliberately
unspecified. The schedules establish serialization under the
profile's synchronous signer and single authoritative file, not arrival-time
fairness, asynchronous signing, independent database copies, or malicious
writer exclusion. These concurrent schedules alone do not distinguish
retry-before-admission from the reverse; the consumed-invitation and changed
current-participant cases exercise that boundary.

F0 has no participant-removal event. The removed-participant case exercises
the existing serving-party admission interface with controlled current
membership. The original receipt is committed through a real signed Journal
before the process crash and authenticated reopen. The changed-membership
checks then call shared `append` directly with a controlled `AdmissionContext`,
bypassing `Journal.submit`, the O1 folded-frontier freshness check and the O3
ordering hook. Those calls only replay a receipt or refuse an action; no new
event is sequenced or persisted at this seam. It does **not** establish a
complete removal protocol, alter participation history or prove removal
through the full Journal path. Root accepted this explicit boundary before
the tests were implemented.

The durability scope is unchanged from O1: application-process crash on the
same host with intact local disk. There is no host-loss, disk-loss, malicious
rollback, failover, or replication claim. The SIGKILL cases are named process
schedules, not thrown exceptions or mocked transaction outcomes. O1 retains
the more granular eight-point append atomicity checks.

## Runs

Focused run 1 source: `ea2b65e669c6e5e65970f3b0b6a53dc640779555`.
Command from `spike`: `node --test test/ordering-retry.test.ts`.
Node 26.8.2. Result: **9/9 passed**, zero failures, skips, or TODOs;
1,217.4 ms. The console output is retained in
[run-1.txt](ordering-o2-runs/run-1.txt). Across the three concurrent
schedules, 126 submitted requests produced 78 new entries, 39 exact
replays and nine changed-content refusals. These are deterministic bounded
schedules, not a seeded campaign.

TypeScript and `git diff --check` also passed. Dependencies were installed
from the committed lockfile with `npm ci --ignore-scripts --no-audit --no-fund`.

No append or model change was needed for these checks. This focused run
precedes O1's single-facade ownership correction and the combined V6 source.

Full integration run 2 source:
`d3ff5f1b665e1096efecab08b1952b91fa01c99b`. This merges O1's ownership
repair `bdb275f4c5c9e3fa8756a5a7dd709b76d857e249`, including V6 source
`05c98e2d778124648834b9b00e772a6ad270a870`, before measurement.
Commands from `spike`: `npm test` and `npm run typecheck`.
Node 26.8.2. Result: **189 tests, 188 passed, zero ordinary failures,
one executing/failing Club TODO**, zero skips; exit status 0; 111.3 seconds.
All nine O2 checks passed again. TypeScript passed. The raw test output is
retained unchanged in [run-2.txt](ordering-o2-runs/run-2.txt).

All three 200-seed visibility campaigns completed with zero declared
violations: Sale 11,047 entries (195 offers, 20 effective accepts); Booking
12,000 entries (652 effective occupancies, 471 linked occupancies, 324
effective cancels); Club 11,939 entries (1,001 effective votes, 126 effective
admits). These are legacy visibility-path integration campaigns, not signed
replays of all 600 series. Club's original admission policy failure remains
the executing TODO, as chosen by the user and reported in V6. Sale's repair
budget overrun is unchanged. Ordering success does not reverse either result.

After run 2, O1's final candidate
`c9fe7d5f6f5624dd6407d57ff213038c8e955e0c` was merged to retain its final
ledger and run output. That merge changes only O1 validation records relative
to the measured O2 source. O2 adds only this ledger, its two run logs, and the
two test files. No O2 production change or model-policy fix is claimed.

Whitespace checks pass for O2's source and edited prose. Raw Node output is
preserved, including whitespace-only lines in the retained Club TODO stack
trace; no claim is made that historical corpora or raw logs pass a whole-tree
whitespace check. Independent review remains the completion gate.


## First combined O2/O3/O5 candidate

The first integration on `request/ordering-o2-o3-o5` incorporates corrected
O1/V6 candidate `4cfc69376fbd513c4cacf5baa0d32c316797cf89`, retaining this
O2 request, implementation and historical evidence. Its common source,
merge resolution and focused verification are recorded in
[the integration ledger](ordering-integration.ledger.md). This ledger remains
the O2 reporting artifact at that same candidate head. Component review
approvals and an additional 600-seed run are not claimed.


The common frozen source `671400d8d44b661084918a2a70edb917662ec51e`
passed all 138 focused integration checks and typecheck. The exact output and
scope are in the linked integration record. The final common candidate adds
only evidence after that run; no subsequent source or test repair occurred.


## O1 G1/G2 integration

The common branch now includes final O1 candidate
`aaa447d9e5ac4d88f07f144d46f2f5e63752c399`, retaining this O2 request,
implementation and original measurements. Frozen combined source
`2a57bd2ab0b1e30912f1e2bc044951d71477c5cc` passed all **149 focused integration tests** and typecheck,
including the new Context freshness cases and lifecycle manifest
`sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`.
The exact commands, component scope and outputs are linked from
[focused integration run 2](ordering-integration.ledger.md#focused-integration-run-2).
Only evidence records follow that measurement. No additional 600-seed run or
component review approval is claimed; this ledger remains the O2
reporting artifact at the common candidate head.


## O-H1/O-H2 revised contract and evidence boundary

Ratified review
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:5643a940fde2c3c372d48ae89ee34e8e35593cf3`
found two blocking issues in the combined candidate
`1ba67c39062ddf44508b14c0716817cfa9735964`: movable ordering controls bound
only an entry commitment, permitting relocation to another head, and the
ordering hook reverified the full chain under the write lock on every new
append, including fixed-writer journals. The earlier passing O2 and combined
runs remain their actual measured evidence; they did not establish exact-head
control binding or bounded append work.

Builder decision for Hugh under his unattended spike instruction,
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:2d7edc9c76b3d657a2a9fbb3fa6ffa819cb25492`,
adopts movable `dap.fixture.single-writer/3`. Seal and assign bind exact
`{position, headerHash}` predecessors; journal, view and control proof checks
also reject an entry commitment repeated at another position. Exact retry
continues to return the original receipt without an append. Old movable `/2`
pins, fixtures and measurements remain historical and are unsupported by
the revised authenticated boundary. Fixed-writer O1 wire bytes do not change.

The O-H2 repair requires full verification at create/open, incremental
verification or a cache of the verified ordering prefix during append, and
no ordering-admission hook for fixed-writer journals. The accepted O1
freshness and error-invalidation guarantees remain. Bounded work at 100, 400
and 1,000 entries must be measured on both memory and SQLite at a named frozen
source; no result or speedup is inferred from the earlier short schedules.
The intended bound concerns added ordering/authentication work. The existing
application fold still materializes history, so it is not a claim of globally
constant-time Context or SQLite append.

The shared runtime and independent-verifier owners retain their own code and
failure evidence. Their subsequent frozen validation and benchmark boundaries
belong in [the integration ledger](ordering-integration.ledger.md) and the
[O3 record](ordering-o3.ledger.md); this section records the revised contract
and O2 scope, not completion or independent approval of the repair. No new
600-seed campaign or removal protocol is claimed. The original O2 request
and its historical run files remain unchanged.

The H1/H2 corrected integration's full noncampaign run at
`773a38ec8367d0b563f7741d1ff902aceb72350c` includes all nine O2 tests, which
pass unchanged. The shared total is 325 selected, 321 passed, zero ordinary
failures and four retained Club TODOs. The type-only handover test correction
at `713315d17030fbafae275dbde3e04c7c1e7dd2f4` passes its 12 affected tests
and whole-tree typecheck, with identical runtime bytes. The
[integration ledger](ordering-integration.ledger.md#o-h1o-h2-final-validation-and-benchmark-boundaries)
retains the exact commands, source boundaries and bounded authentication-work
measurements. This is not a new O2 campaign run or independent approval.
