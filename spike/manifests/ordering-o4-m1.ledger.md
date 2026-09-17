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

Measured-source results, identities, source/config blobs and output hashes will be appended after this source is frozen. Root will integrate the separate own-entry/doc components and run the combined noncampaign suite once; no campaign is requested here.
