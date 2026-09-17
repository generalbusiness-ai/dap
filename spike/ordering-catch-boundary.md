# O4 strict replay and proof catch boundaries

This catalogue addresses M1 review `66effd75`, ratified as `919baa74` and
adopted as `739b7bf7`, under the original O4 request. It separates a catch's
contract from evidence that a particular fault reached it. The baseline is
exact `15b660caaf06e1ea4698e83a94e3717cfd48572b`. The independent TypeScript
AST inventory finds **21 runtime catch clauses**, not 20, in the static runtime
import graph from `scope.ts` and `scope-proof.ts`; fixture/test catches are
outside this count. The [retained inventory](manifests/ordering-o4-runs/m1-docs/baseline-catch-inventory.json)
pins its source and discovery method. Baseline line numbers below identify historical sites,
not permanent line numbers in later source. The measured M1 implementation
and its 23-catch inventory are recorded in the current-source section below.

ScopeJournal create/open force strict foundation folding. Scope state replay,
exports and public-proof interpretation also select strict mode. Legacy Context,
Journal and interpretation callers may retain their default error verdicts.
A privately branded codec/canonical validation error is different from a
TypeError that merely has the same message. Typed Scope policy errors and the
wire message allowlist are deliberately broader classifications.

## Baseline catalogue and required M1 behavior

| Baseline site | Reachable phase and classification | Measurement boundary |
|---|---|---|
| `append.ts:131`, encoding preparation | Before transaction/append. All preparation failures become `invalid_envelope`; no bytes are committed. The earlier `snapshot` call is outside this catch and may throw. | Existing codec/prepare fault tests and precommit signature cases; M1 must retain the explicit precommit outcome. |
| `codec.ts:94`, JSON parser | Admission, cold verification and nested proof parsing. Baseline incorrectly converts every parser throw to branded invalid JSON. M1 must distinguish JSON syntax failure from unrelated/opaque errors. | M1 parser seam requires both syntax and unexpected-value injections; crypto-only sweeps did not cover it. |
| `context.ts:210`, submit | Append/fold failure, before or after commit. Marks Context inactive, invalidates its lease and rethrows. Committed bytes survive. | O1 lost-reply/freshness cases and strict replay fault cases; no rollback of committed events is claimed. |
| `foundation.ts:367`, system fold | Live, cold and nested interpretation. Strict mode rethrows; legacy mode converts to `fold_error` plus actor-only audience. | K2 registry sweep and L2 issuance tests exercise strict paths. |
| `foundation.ts:430`, application audience | Live, cold and nested interpretation. Strict mode rethrows; legacy mode restores model state and records `audience_error`. | G2/K2 audience fault checks; strict mode does not silently retain an audience failure. |
| `foundation.ts:567`, issuance commitment bytes | Admission and replay. Only privately branded codec or canonical input errors become malformed issuance; unexpected values rethrow. Hashing is outside this catch. | L2 signed/legacy malformed input and stage faults, including update/digest and opaque values. |
| `foundation.ts:578`, issuance header preimage | Admission and replay. Only privately branded canonical input errors become malformed issuance; unexpected values rethrow. Hashing is outside this catch. | L2 fractional/unsafe header regression and header-preimage stage faults. |
| `foundation.ts:659`, model handler | Live, cold and nested interpretation. Strict mode rethrows; legacy mode records per-model `fold_error` and continues. | G2/K2 handler failures and original strict propagation tests. |
| `journal.ts:129`, constructor | Cold reconstruction/validation after acquiring the backend-object lease. Releases that lease and rethrows. It does not close a caller-owned SQLite handle. | Journal open/lease failures; later Scope construction needs its own cleanup (below). |
| `journal.ts:173`, envelope precheck | Before append. All verification failures become `invalid_envelope`; nothing is stored. | L2 first-verification injection and malformed envelope cases; this is a documented refusal, not unchanged-throw propagation. |
| `journal.ts:182`, submit | Context append/fold or control-result failure. Requires reopen, invalidates lease and rethrows. | O1 lost replies, K2/L2 committed activation recovery, M1 ordering fault cases. |
| `ordering.ts:66`, control admission | Both live ordering admission and cold/view control-chain validation. Baseline converts all throws to `malformed_control`, causing M1 divergence. M1 must return schema refusals explicitly and convert only privately branded malformed writer-key input; key-import faults must rethrow. | M1 must inject ordering key import during S/F open and activation on both stores; earlier issuance-only sweeps missed it. |
| `scope-proof.ts:162`, wire validation | Public-proof verification before semantic replay. Private codec errors and exact `WIRE_REJECTIONS` Error messages become `ScopeProofError`; other values rethrow. | L2 opaque/codec-looking error cases; M1 must separately observe allowlisted-message conversion. |
| `scope-proof.ts:168`, error inspection | Nested within the preceding classifier. Swallows an inspection failure, such as a revoked Proxy's `instanceof`, so the outer catch rethrows the original value. | L2 revoked-value tests; this does not convert the original value to a verdict. |
| `scope.ts:185`, release opening | Nested activation replay. Only private codec errors become `malformed_release_proof`; unexpected values rethrow. | L2 malformed release opening and targeted verification-stage faults. |
| `scope.ts:259`, Scope operation fold | Live, cold and nested Scope replay. `ScopeRefusal`, `ScopeProfileError` and `ScopeProofError` instances become ineffective verdicts; other values rethrow. | Existing policy negative cases, unexpected error cases and deliberate typed-error injection are distinct outcomes. |
| `scope.ts:263`, error inspection | Nested within the preceding classifier. Swallows only inspection failure and preserves the original unexpected thrown value. | L2 revoked-value cases; not a general swallow boundary. |
| `scope.ts:322`, state recomputation | Scope state/cold reconstruction or postcommit replay. Calls `replayFailed`, which disables the facade, closes Journal and rethrows. | K2/L2 state faults and exact retry recovery after healthy reopen. |
| `scope.ts:341`, submit delegation | Journal submission may fail before or after commit. Calls `replayFailed`; no ordinary policy result is synthesized. | K2/L2 append/strict-fold faults and M1 ordering faults. |
| `sqlite.ts:38`, backend constructor | Initialization/index validation. Rolls back an active transaction, closes the database and rethrows. Cleanup failure can itself throw. | Existing SQLite error/index checks; a second fault during cleanup is not covered by ordinary one-fault replay sweeps. |
| `sqlite.ts:70`, transaction | Before commit: rollback then rethrow. After commit: rethrow without rollback. `finally` clears the busy flag. A failing rollback can replace the first error. | Existing transaction/lost-reply checks; simultaneous operation-plus-cleanup failures are not an unchanged-error guarantee. |

There are also finalizers in `append.ts` (MemoryBackend serialized busy flag),
`sqlite.ts` (busy flag) and `scope.ts` (`replayFailed` closes then rethrows).
They must not be confused with input-error conversion. Runtime calls outside
these catches may still throw. In particular, final `verifyEnvelope` after
Scope replay can throw while leaving the already reconstructed facade usable.

## Additional M1 boundaries

M1's parser classification is based on the host parser's SyntaxError type,
not the codec's private validation identity. A SyntaxError deliberately injected
at that exact parser seam is therefore classified as malformed JSON; unrelated
Error/TypeError or opaque values must retain identity. Exception inspection
does not replace a revoked Proxy with a new TypeError. The measured inventory
includes the new parser-inspection catch.

Scope setup runs after Journal create/open has acquired a lease. At the
baseline, a key-import failure in the Scope constructor escapes before cleanup,
so an identical memory backend cannot reopen; SQLite needs caller cleanup.
M1 closes the acquired Journal when subsequent Scope setup fails and preserves
the original exception through a secondary cleanup error. Both factories are
measured on both stores; the resource-recovery limits are stated below.
A private TypeScript constructor is not a JavaScript sandbox. Scope.open
restores/authenticates the base Journal and setup; it does not eagerly compute
full Scope.state. A probe that accesses state afterward must be labelled
“open plus state”, not attributed entirely to open.

The `WIRE_REJECTIONS` list in `scope-proof.ts` intentionally recognizes exact
messages from Journal genesis/origin/profile/commitment checks, ordering schema
validation, and Journal-view header/envelope/control-chain refusals. It does
not privately brand those Error instances. Deliberately injecting a plain Error
with one of those messages can therefore produce a policy verdict, as can a
thrown Scope policy-error instance. These are explicit classification limits,
not claims of preserving every arbitrary thrown value.

Memory-backed `proof()` and retained `context.view()` may still read history
after a replay failure. Submit, retained Context writes, interpret and export
are blocked as specified in the profile. Precommit envelope refusals add no
bytes; they are distinct from postcommit errors that require reconciliation.
Deep input and oversized activation limits remain documented in the profile.
An interpret/export operation checks availability but does not automatically
poison the facade if its own standalone replay throws; the managed state/submit
error path is the one that closes the facade.

The two SQLite catches are structurally not applicable to MemoryBackend; its
serialized try/finally is a separate analogue with no rollback of writes
already performed. Shared runtime catches still need actual memory and SQLite
fixtures for both-store coverage. The extra catch in
`fixtures/ordering-scope-faults.ts:54` belongs to a deliberate faulty-writer
helper, outside the runtime graph: it falls back from a producer error to a
forged projection, and its source fork always uses MemoryBackend. That fallback
must not establish runtime exception propagation or SQLite-site coverage.

## Historical evidence

Historical K2/L2 tests are bounded: K2 injects 120 activation registry accesses
per backend; final L2 source `8f48a39e` covers 9 issuance crypto/key calls during
cold open and 135 during one activation, all 51 cold-open signature calls,
three selected activation verifications and one signing call. Its direct
checks include update/digest and multiple thrown-value types. Those results
do not prove coverage of the ordering or parser catches found later. Update
and digest occur outside both issuance serialization try bodies. In particular,
only a reached in-body serialization seam, such as Object.keys or JSON.stringify,
can establish coverage of the header-preimage catch at `foundation.ts:578`.

Independent review `66effd75` reports a wider crypto sweep at the baseline and
finds the ordering conversion. That reviewer measurement and the builder's
M1 measurement must stay separate. The [machine-readable baseline audit](manifests/ordering-o4-runs/m1-docs/baseline-catch-audit.json)
retains the per-site in-try injection seams, exact 29-message baseline wire
allowlist and expected cleanup behavior. It is static analysis, not a new
fault run. The original documentation component at `a9d27c3d` ran only the
manifest and existing mutation-count checks; it did not measure runtime faults.

## Measured M1 source and coverage

Runtime source `57745b99b7908ee499426ce4553484dfde572b9d` and the test-only
successor `37a3e12178923b8198950a332b76c7503fc13c15` are preserved in component
records head `32b69bc8ab9dc150ea6e68198e8871b74dcb9a6e`.
The [component ledger](manifests/ordering-o4-m1.ledger.md) and
[independent source-and-record audit](manifests/ordering-o4-runs/m1-integration-audit/repaired-catch-audit.md)
record the exact sources, commands, hashes and sampled stacks. This audit
inspected retained executions; it did not run a second suite or grant workroom
approval. The separate Scope own-entry component is recorded in its
[ledger](manifests/ordering-o4-m1-own-entries.ledger.md). Combined results and
identities belong to the main O4 ledger, not either isolated component.

Both M1 focused runs passed 41 checks and typechecking. Each of the 12
converting try bodies listed above has six unexpected thrown-value cases on
memory and on SQLite: 72 cases per store. The test asserts one reached injection
per case and retains a stack for each Error sample, 12 per store. C01 and C10
intentionally return a precommit refusal and preserve the old head; the other
ten preserve the original thrown value and disable the managed facade.
Every case checks the exact saved bytes and healthy cold retry. C04 injects
directly through `packageIn` inside `foldSystem`; C07 injects `Object.keys`
inside header serialization; C12 reaches ordering admission through nested
Journal-view proof verification. This is coverage of each catch body, not
every operation or crypto call within it.

The same runs include 36 cold-open cases and 24 constructor cases per store,
four deliberate policy conversions and two exception-inspection controls per
store, 24 SQLite-only cleanup cases, and six committed lost-reply recoveries
per store. Four malformed JSON strings, a valid JSON control, nine malformed
assignment payloads per store followed by valid handover, and existing codec
and handover checks retain declared-input behavior. Older malformed issuance
and release-proof tests remain separate source-bound evidence until the
combined run executes them.

The exact runtime inventory has 23 catches: all 21 baseline sites, the parser
inspection guard at `codec.ts:99`, and Scope constructor cleanup at
`scope.ts:302`. The parser conversion is now at `codec.ts:95`; Scope state
and submit catches moved to lines 328 and 347; SQLite's transaction catch is
at line 75. Other baseline line locations are unchanged. The accompanying
AST inventory records all sites; the own-entry merge changes neither these
catch clauses nor their line locations.

SQLite now preserves the original error through secondary rollback/close
failure and attempts close even if constructor rollback fails. Failed
transaction rollback can leave an open transaction, which the tests observe
before explicit caller disposal. Close-fault mocks perform the real close
before throwing: they measure original-error preservation, not automatic
recovery from a native close that never releases resources. SQLite catches
remain inapplicable to memory. The new parser guard preserves revoked outer
values; nominal SyntaxError, exported Scope policy classes and allowlisted
Error messages still intentionally convert. One of the 29 allowlisted
messages is dynamically sampled, not all 29.

The successor test hook rejects irrelevant operation kinds before constructing
a stack. All 11 diagnostic objects, including all 144 converter outcomes and
24 sampled stacks, are exactly equal across the two runs. The focused command
took 56.7204 seconds before and 18.3150 seconds after this test-only change.
That is one observed pair, not a controlled benchmark or full-suite speed
claim. Runtime bytes and all assertions remain unchanged by the optimization.
