# O4-M1 strict replay exception boundaries

This isolated component repairs the ordering-admission blocker and constructor lease cleanup identified by review `66effd75` of exact source `15b660caaf06e1ea4698e83a94e3717cfd48572b`. It uses original O4 request `1b6384e27d6dbfd5a22da3330378776d32ad23ab` and promise `18ba74b01cbbea27e2d8c18b063ff482428c95aa`; ratification `919baa74` and adoption `739b7bf7` retain the existing authorization. No main/shared-profile/lifecycle-manifest/Club changes are included here.

## Before evidence

`ordering-o4-runs/m1/before` preserves both original checker scripts and their memory/SQLite output at exact15b. The ordering key-import exception became `malformed_control`; activation and open-plus-state returned an ineffective result while cold replay and exact retry were effective. Scope constructor failure leaked the MemoryBackend lease. The new parser reproduction also ran before any source edit: a fault inside JSON.parse on valid bytes was converted to declared invalid JSON during open and standalone proof on both stores.

The SQLite cleanup reproduction ran in a separate archive of exact15b. Constructor rollback/close and serialized rollback faults replaced the original operation error. Its first diagnostic attempted to inspect `isTransaction` on an already closed handle and failed; those files remain explicitly labelled `failed-harness`. The corrected diagnostic is separately retained with its hashes and original-source archive path. This diagnostic mistake is not a separate product failure.

## Repair

Ordering shape failures now return `malformed_control` directly. The only ordering conversion catch encloses key validation and recognises the codec's private validation-error identity; unexpected key-import errors propagate unchanged during live admission, cold chain authentication and nested proof replay.

The parser converts only nominal SyntaxError into declared invalid JSON. Error, TypeError, opaque and revoked values propagate, including when inspecting their exception type itself throws. This boundary cannot distinguish an injected SyntaxError from a native parser SyntaxError; that nominal-class limit is tested and retained.

After Journal creation/open has acquired its lease, the Scope constructor closes that Journal if setup validation throws. A finally rethrows the original value even if cleanup throws. Both create and open use this constructor. SQLite constructor cleanup now attempts close even after rollback failure; both SQLite catches preserve the original operation value through secondary cleanup errors. A failed serialized rollback can leave an open transaction: the caller must close/discard that handle and reopen. Preserving the error is not a claim that fallible cleanup always succeeds.

## Complete catch catalogue

The independent baseline audit and TypeScript AST inventory are retained under `m1/audit`. They classify all 21 baseline runtime catch clauses, plus the dishonest-writer fixture catch outside the runtime graph. Their baseline statements are historical, not repaired-source results. This repair adds two clauses: guarded parser-exception inspection and Scope constructor cleanup, for 23 runtime clauses.

| Audit ID | Repaired boundary | Classification and measured seam |
|---|---|---|
| C01 | append encoding.prepare | Documented blanket precommit invalid_envelope; crypto.verify inside prepare, no stored action, same-facade recovery. |
| C02 | codec JSON.parse | Nominal SyntaxError conversion only; parser injection in cold authentication and nested wire proof. New inspection guard preserves revoked outer values. |
| C03 | Context.submit | Inactivate/rethrow; committed serialized lost reply reaches it on both stores. |
| C04 | foundation foldSystem | Strict rethrow; independent package lookup inside packageIn -> foldSystem, not the nested issuance seam. Legacy mode retains its error verdict. |
| C05 | foundation audience | Strict rethrow; registered audience callback. Legacy mode retains its error verdict. |
| C06 | issuance envelope bytes | Private codec/canonical validation identity only; createPublicKey inside envelopeBytes. Hashing lies outside this try. |
| C07 | issuance header bytes | Private canonical validation identity only; Object.keys inside legacy header canonicalization. Hashing lies outside this try. |
| C08 | foundation dispatch | Strict rethrow; registered model.fold callback. Legacy mode retains its error verdict. |
| C09 | Journal constructor | Release lease/rethrow; key/parser fault in verifyEntries. Failed-open SQLite handle remains caller-owned. |
| C10 | Journal envelope precheck | Documented blanket precommit invalid_envelope; initial crypto.verify, no stored action, same-facade recovery. |
| C11 | Journal submit | Invalidate/rethrow; committed serialized lost reply reaches it. |
| C12 | ordering admission | Private codec validation identity only; successor createPublicKey on source open and nested activation/destination open-plus-state. |
| C13 | proof wireInput | Private codec identity or existing exact Error-message allowlist; key import in wire validation. Allowlisted injected Error remains an intentional policy conversion. |
| C14 | proof exception inspection | Preserve outer value; revoked values and an Error message getter throwing a second error. |
| C15 | release opening | Private codec identity only; key import in release verifyEnvelope outside wireInput. |
| C16 | scope semantic action | Existing ScopeRefusal/ScopeProfileError/ScopeProofError class conversions; unexpected fault inside object(payload) and explicit injected policy-class controls. |
| C17 | scope exception inspection | Preserve outer value; revoked values and recognised Scope error with a throwing message getter. |
| C18 | Scope state | Mark unavailable, close, rethrow original; postcommit matrix faults pass through managed state. |
| C19 | Scope submit | Mark unavailable, close, rethrow original; committed serialized lost reply under Journal call. |
| C20 | SQLite constructor | Attempt rollback and close, preserve original; original operation plus secondary rollback/close failures. Structurally N/A for memory. |
| C21 | SQLite serialized | Rollback attempt, preserve original, release busy in finally; secondary rollback failure. Structurally N/A for memory; its lost-reply analogue is tested separately. |
| New | Scope constructor | Release acquired Journal lease on setup error, original survives close failure; create/open on both stores. |

The 12 converting try bodies are C01, C02, C04–C08, C10, C12, C13, C15 and C16. Each matrix row uses signed actual Scope data with both backends, asserts one reached injection and records a representative stack inside the intended try. Six unexpected sentinels are tested: Error, validation-looking TypeError, undefined, plain object, string and revoked Proxy. The matrix is complete by catch-body catalogue; it is not an exhaustive sweep of every operation or crypto call within each body.

## Controls and limits

Positive controls preserve real malformed JSON, malformed control shapes/keys followed by valid handover, and existing codec vectors. Existing private issuance/release validation controls remain in the L2 component evidence. Separate injected SyntaxError, exact allowlisted Error and exported Scope error instances intentionally convert to policy outcomes; cold replay can differ after those deliberate policy-class injections. They are not counted as unexpected-fault preservation successes.

The static Scope create/open methods select strict folding. Its TypeScript-private constructor is not a JavaScript security boundary. Source open authenticates/restores; destination tests that force nested semantics explicitly read state after open. No blanket claim covers standalone interpret/export poisoning, proof()/retained context.view() after memory-backed failure, or the final verifyEnvelope after successful Scope state replay. The exact WIRE_REJECTIONS message list and these limits are preserved in the baseline audit. Arbitrary external package code is outside the repository catch inventory.

## Frozen measurements

Runtime source `57745b99b7908ee499426ce4553484dfde572b9d` passed 41 focused tests, with zero failures, skips or TODOs, and typecheck. [Run 1](ordering-o4-runs/m1/run-1/results.json) retains exact commands, durations, output hashes and the unchanged-source check. Its [source record](ordering-o4-runs/m1/run-1/source.json) pins all 91 source, fixture, test and configuration files. The original checker ordering/open-and-lease scripts and the parser/SQLite cleanup reproductions were run against this frozen repair; all six commands exited zero and their outputs remain separate from the original failure logs.

Test-only successor `37a3e12178923b8198950a332b76c7503fc13c15` filters fault-hook operation kinds before constructing a stack, and captures direct callback stacks only at the actual hit. Runtime, fixtures and configuration are byte-identical to `57745b`. It passed the same 41 checks and typecheck in [run 2](ordering-o4-runs/m1/run-2/results.json), using these commands from `spike`:

```
node --test test/ordering-scope-catch-boundaries.test.ts test/ordering-scope-cleanup.test.ts test/codec.test.ts test/ordering-handover.test.ts
npm run typecheck
```

The 41 tests comprise 14 new catch/cleanup tests, 15 existing codec tests and 12 existing handover tests. The [comparison](ordering-o4-runs/m1/run-2/comparison.json) establishes that all 11 emitted diagnostic objects are exactly equal across the two runs, including 144 converting-body rows, 24 sampled runtime stacks, 72 cold-open cases, 48 constructor cases, 24 SQLite cleanup cases and 12 committed lost-reply cases. Each converting-body row asserts exactly one injection hit. The original-value, durability, unavailable-state and exact-retry assertions are unchanged. Both stores also retain the four intentional nominal/message/class policy controls, exception-inspection controls, and malformed-control recovery cases. SQL catch clauses are structurally absent from MemoryBackend; no memory case is counted as a hit on them.

Focused wall time was 56.72 seconds at `57745b` and 18.32 seconds at `37a3e12`. This single sequential pair measures the test-helper change, not an isolated benchmark or a production-runtime speedup. No full suite or campaign was run for this component. Root will integrate the separate own-entry/doc components and run the combined noncampaign suite once.

The independent audit inventories 23 repaired runtime catches at `57745b`; the runtime source is unchanged at `37a3e12`. Its separate reconciliation confirmed each intended try-body stack and all output hashes, then confirmed exact diagnostic equality after the helper change. Root retains its final externally pinned audit after the component records commit, avoiding a circular evidence-head reference here.

The constructor secondary-close mocks call the real close before throwing. They establish preservation of the original setup failure after successful cleanup followed by a secondary error; they do not establish resource release when native close itself refuses. Failed SQLite rollback coverage explicitly checks the residual transaction and then cleans it up before reopening. These limits apply to both recorded runs.

## Component identities

Both [run 1](ordering-o4-runs/m1/run-1/identities.json) and [run 2](ordering-o4-runs/m1/run-2/identities.json) compute identical component identities:

| Component | Identity |
|---|---|
| Scope runtime | `sha256:3dd5aa628ab6c7318fce24fdccb599edb3ec3ee3e2aad951ec430cf7ac0e27b1` |
| Scope package | `sha256:96dea7ead5f5185c75471ce5618311dd8020f3320623acc22823ab0492ae68bb` |
| Public proof rule | `sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6` |
| Join policy | `sha256:ac852ebab4f55816e55cd0fd71b7280267bffaca097046d4880b24ac63b01455` |
| Foundation | `sha256:5a7be1514529bac249c683ada733e64273f94b2700abf8a55c47dcb7ebfb8d78` |

These are isolated component identities. The separate own-entry repair changes scope source bytes, so root must recompute combined runtime, package, genesis and proof identities before publication. Historical source and failure records have not been rewritten. The final commit after `37a3e12` contains only this ledger and run/audit records.
