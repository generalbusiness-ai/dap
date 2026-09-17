# O4-M1 repaired catch audit

Frozen final test/source boundary: `37a3e12178923b8198950a332b76c7503fc13c15`. Runtime implementation unchanged from `57745b99b7908ee499426ce4553484dfde572b9d`. Baseline: `15b660caaf06e1ea4698e83a94e3717cfd48572b`.

Relevant records commit: pending; both source boundaries and all raw outputs are hash-pinned, with final external audit awaiting the records-only commit.

No additional blocking catch-coverage gap found within the stated bounded M1 contract; independent static and retained-record audit only. I did not modify source or execute another test suite. I inspected the changes and tests, measured the AST, matched all15 runtime-file hashes to the frozen source metadata, and reconciled the owner’s retained outputs.

## Result and evidence

The AST contains **23 runtime catches**, adding the parser exception-inspection guard and Scope constructor cleanup to the21 baseline sites. Every one of the12 baseline converting try bodies has a distinct reached seam on both memory and SQLite. The formal output contains72 rows per store, six sentinel families per body, with a reached stack for each Error sample. The two precommit rows intentionally refuse; the other ten preserve original values and require reopening. All matrix rows verify the durable bytes and exact saved retry after clean reopen.

The retained focused command reports **41 passed, 0 failed**, and typecheck exits0. Both final output hashes match `run-2/results.json`; the eight prior output hashes separately match `run-1/results.json`. Cold checks report36 cases per store; constructor checks24 per store; four intentional policy classifications and two inspection guards per store; SQLite24 cleanup double-fault cases; six committed lost-reply recoveries per store. Original checker, parser and cleanup reproductions report repaired observations at the prior runtime source `57745b9`; runtime files are byte-identical at the final test-only successor. These are inspected owner-run results, not a second execution by this audit.

Records directory: `/tmp/dap-o4-m1-faults/spike/manifests/ordering-o4-runs/m1/run-2`. Machine audit: `/tmp/dap-o4-m1-repaired-catch-audit.json`; AST: `/tmp/dap-o4-m1-repaired-catch-inventory.json`; extracted observed diagnostics: `/tmp/dap-o4-m1-repaired-observed-diagnostics.json`.

## Test-only successor and coverage equivalence

Commit `37a3e12178923b8198950a332b76c7503fc13c15` changes only the fault-hook test file. Its early operation-kind filter matches all15 existing seam alternatives. Audience/model-fold hooks still capture a stack at the actual reached hit. All11 parsed diagnostics are exactly equal across runs, including144 converter outcomes and24 runtime stack samples, without normalization. Source-file hashes confirm all15 runtime-graph files are unchanged. The23-catch inventory therefore applies to both boundaries.

The same focused command took56.7204seconds at `57745b9` and18.3150seconds at `37a3e12`, with41 checks passing in each. This is one observed pair, not an isolated performance benchmark or a runtime speed claim. The original run and outputs remain separate and unchanged.

## Twelve converting-body mappings

| Baseline ID | Repaired catch | Reached seam | Observed behavior |
|---|---|---|---|
| C01 | `spike/src/append.ts:131` | crypto.verify in Journal encoding.prepare | precommit invalid_envelope; head remains0; same facade then accepts healthy attempt; six originals and saved-retry checks per store |
| C02 | `spike/src/codec.ts:95` | JSON.parse inside parseCanonical and wireInput | unknown originals propagate; managed facade unavailable; new parser inspection guard preserves revoked Proxy; six originals and saved-retry checks per store |
| C04 | `spike/src/foundation.ts:367` | registry get via descriptor.own → packageIn → foldSystem | strict original propagation; direct registry seam is distinct from nested issuance; six originals and saved-retry checks per store |
| C05 | `spike/src/foundation.ts:430` | registered binding.audience callback within foldEntry try | strict original propagation; six originals and saved-retry checks per store |
| C06 | `spike/src/foundation.ts:567` | createPublicKey via envelopeBytes inside verifyIssuance | unbranded originals propagate; private-brand malformed-input classification retained; six originals and saved-retry checks per store |
| C07 | `spike/src/foundation.ts:578` | Object.keys via canon.canonicalize(header preimage) | unbranded originals propagate; this is inside serialization, unlike hashing afterward; six originals and saved-retry checks per store |
| C08 | `spike/src/foundation.ts:659` | registered model.fold invoked inside dispatch try | strict original propagation; six originals and saved-retry checks per store |
| C10 | `spike/src/journal.ts:173` | crypto.verify in initial Journal.submit verifyEnvelope | precommit invalid_envelope; no new entry; same facade accepts healthy retry; six originals and saved-retry checks per store |
| C12 | `spike/src/ordering.ts:66` | createPublicKey in orderingAdmission → verifyJournalView → wireInput | unexpected originals now propagate; only private codec errors convert at remaining catch; six originals and saved-retry checks per store |
| C13 | `spike/src/scope-proof.ts:162` | createPublicKey during assertPublicData committed-opening verification | unknown originals propagate; intentionally broad message policy documented separately; six originals and saved-retry checks per store |
| C15 | `spike/src/scope.ts:185` | createPublicKey in verifyEnvelope at replayScopeView release-opening try | unknown originals propagate; private codec malformed release remains typed refusal; six originals and saved-retry checks per store |
| C16 | `spike/src/scope.ts:259` | Array.isArray in scope.object(payload with proofs), called within per-action try | unknown originals propagate; nominal Scope classes retain intentional refusal behavior; six originals and saved-retry checks per store |

The sampled C04 stack includes `packageIn → foldSystem → foldEntry`, independent of the issuance seam. C07 includes `canon.canonicalize → verifyIssuance` at the header serialization line. C12 includes `orderingAdmission → verifyJournalView → wireInput → verifyPublicProof → replayScopeView`, which is the previously missed nested authentication route. Both stores show these actual stack frames.

## Remaining and new catches

- **C03, C11, C19** (`context.ts:210`, `journal.ts:182`, `scope.ts:347`): Six lost-reply originals per store after backend.serialized successfully returns; observed original equality, retained Context write refusal, Scope unavailable, clean reopen and exact saved retry. This covers propagation catches, not the SQLite transaction catch itself.
- **C09** (`journal.ts:129`): 36 cold cases per store across S/F, ordering key/open key/parser and six sentinels. S exercises Journal.open; F includes first Scope.state when a nested source proof is required. Original equality and clean lease/reopen recovery are asserted.
- **C14, C17** (`scope-proof.ts:168`, `scope.ts:263`): Throwing message getters exercise both exception-inspection catches on each store; observed getter counts wire2/scope1. Matrix revoked Proxy cases independently require preserving the outer original. These are not ordinary policy verdicts.
- **C18** (`scope.ts:328`): Ten non-precommit converter rows × six sentinels per store reach managed postcommit state replay, which makes Scope unavailable; exact cold retry then reconstructs an effective activation. Reached Error samples show get state and Scope.submit.
- **C20, C21** (`sqlite.ts:38`, `sqlite.ts:75`): 24 SQLite-only double-fault cases: constructor rollback, constructor close, both constructor cleanup stages, serialized rollback × six originals. All preserve original identity. Failed serialized rollback explicitly leaves an open transaction until caller disposes it. Structurally N/A for MemoryBackend.
- **M1-parser-inspection** (`codec.ts:99`): New guard around instanceof SyntaxError is reached by revoked Proxy in nested proof and cold parser cases on both stores; original-value equality would fail without the guard. Injected nominal SyntaxError deliberately converts.
- **M1-scope-constructor** (`scope.ts:302`): 24 cases per store: create/open × six original values × with/without secondary close throw. Original preserved; exact memory Backend object reopens, SQLite uses a fresh handle to the same durable genesis. Close mock completes actual close before throwing, so resource-release failure before close is not proven recoverable.

## Classifier and cleanup assessment

Ordering schema checks now return explicit refusals outside a catch; the remaining key-import catch recognizes only the codec’s private validation brand. Runtime key-import faults therefore escape in append admission, cold Journal verification and public-proof view verification. JSON parsing now catches native-class SyntaxError and preserves other originals, including revoked values whose instanceof inspection itself throws. Genuine malformed JSON remains a branded input error.

The new Scope constructor uses close-in-finally propagation after setup fails. SQLite constructor cleanup attempts close even if rollback fails, then rethrows the original through finally; serialized cleanup likewise preserves the original even if rollback fails. These changes protect error identity. They do not promise rollback or native resource release can always succeed. The tests distinguish residual open transactional state from eventual caller cleanup.

## Limits and remaining unmeasured space

1. This is an independent static/source-and-record audit, not a new executed test run, workroom ratification or general correctness approval. It covers the repository runtime graph and supplied registered fixture callbacks, not arbitrary external package implementations.
2. Reach counters are asserted once for every matrix injection. Full stack samples are retained for the Error row only: 12 per store, 24 total. Six sentinel outcomes per seam do not imply every operation/call index within that try was swept.
3. The two blanket precommit verification catches intentionally replace arbitrary faults with invalid_envelope. They add no position and retain a usable facade; do not claim unchanged exception propagation there.
4. SyntaxError at the JSON.parse boundary is nominal, not origin-branded. Exported ScopeProofError/ScopeProfileError and an exact allowlisted plain Error message intentionally become policy verdicts. The new test samples one of29 allowlisted messages; it does not dynamically exercise all29.
5. Scope/SQLite close-fault mocks call actual close before throwing. Original identity is protected by finally even for a failure before release by static reasoning, but automatic resource recovery in that case is not measured or promised. Failed transactional rollback leaves an observed open transaction until explicit caller disposal.
6. SQLite constructor and transaction catch coverage is SQLite-only. The memory lost-reply test exercises its own serialization wrapper without pretending MemoryBackend supplies SQL rollback. The dishonest-writer fixture fallback remains outside this runtime graph and always forks memory.
7. Strict foundation propagation is tied to the documented Scope static factories; a JavaScript caller can bypass TypeScript-private construction and wrap a non-strict Journal. No new runtime construction sandbox is added.
8. Final verifyEnvelope at scope.ts:353 remains outside managed submit/state catches. interpret/export have no catch that poisons on their own replay fault; proof() and retained Context.view() can remain readable on memory after a managed replay fault. These are preserved profile limits, not repaired claims.
9. Four malformed JSON strings plus one valid canonical control, nine malformed assign payloads per store followed by valid handover/restart, and existing codec/handover checks ran in the41 focused tests. The retained malformed issuance/private-brand and malformed release-proof tests remain in unchanged source; they are not among this focused run’s four files, so this audit makes no fresh pass claim for those cases.
10. Normal Scope.state replay failure cannot roll back an already accepted action. The formal matrix confirms durable bytes and cold saved retry; it does not declare a transient injected nominal-policy verdict stable after removing the injection.

## Exact source inventory

| File | Catch lines |
|---|---|
| `spike/src/append.ts` | 131 |
| `spike/src/codec.ts` | 95, 99 |
| `spike/src/context.ts` | 210 |
| `spike/src/foundation.ts` | 367, 430, 567, 578, 659 |
| `spike/src/journal.ts` | 129, 173, 182 |
| `spike/src/ordering.ts` | 66 |
| `spike/src/scope-proof.ts` | 162, 168 |
| `spike/src/scope.ts` | 185, 259, 263, 302, 328, 347 |
| `spike/src/sqlite.ts` | 38, 75 |

No additional blocking issue was found in this bounded static and evidence reconciliation. The existing profile limitations above remain part of the contract. This statement does not replace the independent workroom review.
