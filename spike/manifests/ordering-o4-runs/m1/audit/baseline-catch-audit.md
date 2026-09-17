# O4-M1 reachable catch audit

Frozen source: `15b660caaf06e1ea4698e83a94e3717cfd48572b` in `/tmp/dap-o4-transfer-lifecycle`. Original O4 request `1b6384e2`, promise `18ba74b0`; M1 adoption `739b7bf7`.

Baseline static audit; proposed M1 changes reported by owner, not independently measured here. No project source files were edited and no new fault tests or campaign were run for this catalogue. The checker review and its retained probes provide the prior executed evidence; the injection methods below are coverage requirements, not claimed passes.

## Findings

There are **21 runtime catch clauses**, plus one fault-fixture catch outside the runtime import graph. The initial task estimate was 20; the AST inventory and the review’s enumerated sites total 21. Twelve try bodies can convert exceptions in some mode; the three foundation legacy catches rethrow in the strict mode. Two other catches protect exception inspection; five perform propagation/cleanup; two belong only to SQLite.

The blocking gaps at this source are the catch-all ordering admission path and catch-all JSON parser. The ordering path is reachable during cold authentication and nested public-proof verification: `publicKeyOf` fault → `malformed_control` → `Journal view: malformed_control` → allowlisted `ScopeProofError` → ineffective scope action. This can leave a facade usable until clean replay changes the verdict. The parser can similarly turn an arbitrary runtime value into a privately branded codec refusal. Scope construction also lacks lease cleanup after its additional setup fails.

The repair owner reports explicit ordering shape refusals, private-brand-only handling around key import, guarded `SyntaxError` handling around JSON.parse, and constructor cleanup that preserves the original. Those reports are not a frozen repaired-source verdict. A nominal `SyntaxError` remains a declared parser exception class; an injected instance is indistinguishable at that boundary.

## Inventory and coverage contract

The AST inventory is retained at `/tmp/dap-o4-m1-catch-inventory.json`. It searched all TypeScript sources and fixtures and followed runtime imports from Scope and public-proof modules. It does not enumerate arbitrary external package code. Both-store means the same shared runtime catch is reached with each backend, not that a MemoryBackend fallback called from a SQLite fixture proves SQLite coverage.

| ID | Frozen site | Function | Phase |
|---|---|---|---|
| C01 | `spike/src/append.ts:131` | append: encoding.prepare | precommit, before serialized append |
| C02 | `spike/src/codec.ts:94` | parseCanonical: JSON.parse | precommit or wire replay, depending caller |
| C03 | `spike/src/context.ts:210` | Context.submit | precommit through postcommit fold |
| C04 | `spike/src/foundation.ts:367` | foldEntry: foldSystem | strict restore/replay or postcommit fold |
| C05 | `spike/src/foundation.ts:430` | foldEntry: audience callback | strict restore/replay or postcommit fold |
| C06 | `spike/src/foundation.ts:567` | verifyIssuance: embedded envelope serialization | precommit invitation admission; strict replay and postcommit fold |
| C07 | `spike/src/foundation.ts:578` | verifyIssuance: header preimage serialization | precommit invitation admission; strict replay and postcommit fold |
| C08 | `spike/src/foundation.ts:659` | dispatch: model.fold | strict restore/replay or postcommit fold |
| C09 | `spike/src/journal.ts:129` | Journal constructor | open/restore; create may already have persisted genesis |
| C10 | `spike/src/journal.ts:173` | Journal.submit: initial verifyEnvelope | precommit |
| C11 | `spike/src/journal.ts:182` | Journal.submit: Context and control verdict | precommit through postcommit |
| C12 | `spike/src/ordering.ts:66` | orderingAdmission | precommit admission AND cold/read-only wire replay |
| C13 | `spike/src/scope-proof.ts:162` | wireInput: validate callback | wire proof verification, standalone or nested replay |
| C14 | `spike/src/scope-proof.ts:168` | wireInput: exception inspection guard | while classifying a caught wire error |
| C15 | `spike/src/scope.ts:185` | replayScopeView: release opening verifyEnvelope | strict replay, including after activation append |
| C16 | `spike/src/scope.ts:259` | replayScopeView: scope semantic action | strict replay/postcommit, also standalone interpretation |
| C17 | `spike/src/scope.ts:263` | replayScopeView: exception inspection guard | while classifying a semantic exception |
| C18 | `spike/src/scope.ts:322` | ScopeJournal.state | managed replay of existing or newly committed history |
| C19 | `spike/src/scope.ts:341` | ScopeJournal.submit: Journal call | precommit through Journal postcommit handling |
| C20 | `spike/src/sqlite.ts:38` | SQLiteBackend constructor | backend initialization/open, before Scope facade exists |
| C21 | `spike/src/sqlite.ts:70` | SQLiteBackend.serialized | transaction before write through after COMMIT |

## Per-site audit

### C01 — spike/src/append.ts:131

**append: encoding.prepare**. Phase: precommit, before serialized append.

Call path: ScopeJournal.submit → Journal.submit → Context.submit → append → encoding.prepare.

Conversion: Every thrown value becomes {refused:true, reason:"invalid_envelope"}; nothing is rethrown from this catch.

Limit: Intentional blanket precommit refusal. No original-value propagation claim at this boundary. The event snapshot immediately before the try is outside it.

Concrete injection: Gate crypto.verify or createPublicKey to encoding.prepare, after the initial Journal verify has succeeded. Alternatively inject a throwing prepare encoder in a direct append test. Record the reached stack, so a prior verify is not mistaken for this site.

Expected result: No new entry/receipt or invitation consumption; the refusal normally leaves the facade usable. Clean reopen sees the old head. A snapshot exception before this try instead propagates and poisons Context.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C02 — spike/src/codec.ts:94

**parseCanonical: JSON.parse**. Phase: precommit or wire replay, depending caller.

Call path: verifyEnvelope / snapshot / verifyWireEntry → parseCanonical; reachable during Journal.open and nested verifyPublicProof.

Conversion: At the baseline, EVERY JSON.parse exception is replaced by a privately branded codec TypeError("codec: invalid JSON").

Limit: Blocking conversion gap: a runtime Error, opaque value or revoked Proxy becomes declared malformed input. Text decoding and subsequent canonicalization are outside this try. Planned M1 repair narrows to guarded instanceof SyntaxError; that remains a nominal class boundary, not proof that the native parser generated the exception.

Concrete injection: Temporarily replace global JSON.parse, gating the stack to parseCanonical and the desired cold-open or nested-proof phase. Throw each sentinel. Also pass genuinely malformed JSON. Do not inject at SQLite raw JSON.parse and claim this site.

Expected result: Baseline loses the original value. At cold Journal.open cleanup runs but the error is substituted. In a nested proof it can become ScopeProofError and an ineffective scope verdict, leaving a facade usable. Repair should preserve non-SyntaxError originals and poison only the enclosing managed replay path; malformed JSON and injected SyntaxError remain declared refusals.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C03 — spike/src/context.ts:210

**Context.submit**. Phase: precommit through postcommit fold.

Call path: ScopeJournal.submit → Journal.submit → Context.submit.

Conversion: Rethrows the original; first sets inactive and invalidates its lease.

Limit: No conversion; access/inactive guards precede the try. Failure during invalidation could itself mask the original, although the current lease implementation has no throwing external callback.

Concrete injection: Throw from backend.head inside assertCurrent, commit before write, encoding.committed after durability, or a model fold after the accepted entry. Use each backend separately.

Expected result: Context cannot write again. Through Scope.submit the Scope facade also closes. Clean restore determines whether the append actually committed: no new receipt for a prewrite fault; saved receipt for a postcommit fault. Memory writes already made are not rolled back by serialized().

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C04 — spike/src/foundation.ts:367

**foldEntry: foldSystem**. Phase: strict restore/replay or postcommit fold.

Call path: Context.restore/fold or interpretView → foldEntry → foldSystem.

Conversion: Strict throwOnError=true rethrows unchanged. Legacy false catches all and creates unauthorized, ineffective fold_error plus actor-only audience.

Limit: The legacy conversion is outside the strict static Scope factory contract. TypeScript-private Scope construction can be bypassed in JavaScript, so that contract must identify its entry points.

Concrete injection: Use an effective dap.attach whose registry package lookup or new model.init throws while foldSystem is on the stack. A registry Proxy/getter gated to packageIn inside foldSystem avoids earlier admission lookup. Do not rely only on a nested issuance fault intercepted at C06/C07.

Expected result: Strict errors escape unchanged. During managed Scope.state or submit, facade closes; during Journal.open its lease is released. A standalone proof replay has no facade to invalidate. Legacy mode deliberately emits a verdict.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C05 — spike/src/foundation.ts:430

**foldEntry: audience callback**. Phase: strict restore/replay or postcommit fold.

Call path: Context.fold or interpretView → foldEntry → binding.audience/capped.

Conversion: Strict mode rethrows unchanged. Legacy mode restores the previous model state and emits ineffective audience_error with actor-only audience.

Limit: The catch covers the declaring-package lookup, allowed-model list, audience callback and capped result. It does not cover the earlier application fold.

Concrete injection: Use a registered application binding.audience callback that throws each sentinel, or its modelState access. Reach it with an authorized event to avoid earlier actor-only publication selection.

Expected result: Managed strict replay invalidates/closes; cold reopen after removing the fault deterministically reconstructs the persisted event. Standalone interpret/proof calls preserve the original without owning a facade.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C06 — spike/src/foundation.ts:567

**verifyIssuance: embedded envelope serialization**. Phase: precommit invitation admission; strict replay and postcommit fold.

Call path: Context.issuedInvite or foldAccept → verifyEmbeddedInvite → verifyIssuance.

Conversion: Only exact codec or canonical private-WeakSet error identities become {ok:false,reason:"malformed"}; all other values rethrow unchanged.

Limit: Brands identify object identity, not causal origin. Reusing an actual branded error remains recognized; a copied message/type or proxy around it is not a brand. Baseline parser C02 can manufacture a brand from an arbitrary parser fault.

Concrete injection: For signed issuance, gate createPublicKey to envelopeBytes/bodyShape inside verifyIssuance. For legacy serialization, gate Object.keys or JSON.stringify inside canonicalize. The commitment hash after the catch is NOT an inside-try injection.

Expected result: Branded malformed evidence is a normal refusal or ineffective acceptance according to caller. Unexpected faults propagate: precommit admission leaves no new entry and Context becomes inactive; strict replay follows the managed-facade rules.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C07 — spike/src/foundation.ts:578

**verifyIssuance: header preimage serialization**. Phase: precommit invitation admission; strict replay and postcommit fold.

Call path: verifyIssuance → canonicalize(header without seq_sig).

Conversion: Only the exact canonical private-WeakSet error identity becomes malformed; codec-branded errors and all other values rethrow.

Limit: No crypto operation is inside this try. The header digest occurs afterward. A crypto-only sweep does not cover this catch.

Concrete injection: Gate Object.keys or JSON.stringify to the legacy canonicalize of the header preimage while verifyIssuance is on the stack. Use a real branded unsafe-integer canonicalization error as a positive control.

Expected result: Same managed error/receipt behavior as C06. An injected unbranded TypeError must remain the same object, despite resembling canonical validation errors.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C08 — spike/src/foundation.ts:659

**dispatch: model.fold**. Phase: strict restore/replay or postcommit fold.

Call path: foldApplication / ambient or origin dispatch → dispatch → model.fold.

Conversion: Strict mode rethrows unchanged. Legacy mode catches all and records an ineffective per-model fold_error.

Limit: The try contains structuredClone(before), model.fold and its immediate result use. model.init and findModel occur outside this try and need separate propagation checks, not attribution to this catch.

Concrete injection: Inject a registered model.fold callback or gate structuredClone to dispatch. Include an effective signed action on both stores and a cold replay of that action.

Expected result: Strict error is unchanged, and enclosing managed Scope replay closes. The durable action remains if the exception followed commit; cold replay after removing the fault restores its actual verdict.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C09 — spike/src/journal.ts:129

**Journal constructor**. Phase: open/restore; create may already have persisted genesis.

Call path: Journal.open/create → constructor → verifyEntries, Context.restore and SQLite index check.

Conversion: Releases the acquired cooperative lease then rethrows the original.

Limit: The acquire call is outside the try. This catch does not close the SQLite handle. Lower C13/C02 conversions can already have replaced the original. A throwing release could mask it, although the current implementation has no external callback.

Concrete injection: Throw from backend.entries after acquisition, authenticated key import inside verifyEntries, or strict restore callback. Arm only after any create preflight, or use cold open for a clear boundary.

Expected result: No facade is returned; the exact backend object should be leasable again. SQLite handle remains caller-owned and should be explicitly closed before opening a fresh handle. Creation may have committed genesis before construction failed; assert the actual head.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C10 — spike/src/journal.ts:173

**Journal.submit: initial verifyEnvelope**. Phase: precommit.

Call path: ScopeJournal.submit → Journal.submit → verifyEnvelope.

Conversion: Every thrown value becomes invalid_envelope refusal.

Limit: Intentional blanket precommit boundary, not a propagation promise. Closed/needsReopen guards are outside the try.

Concrete injection: Gate crypto.verify/createPublicKey or parseCanonical to this first verification, and prove encoding.prepare was not reached.

Expected result: No append, no new receipt, no invitation consumption; normal facade remains usable, and clean reopen has the original head.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C11 — spike/src/journal.ts:182

**Journal.submit: Context and control verdict**. Phase: precommit through postcommit.

Call path: Journal.submit → Context.submit; then controlVerdictAt for accepted control entry.

Conversion: Marks needsReopen, invalidates the lease and rethrows unchanged.

Limit: Catches neither the initial verifyEnvelope conversion nor failures after Journal.submit returns to Scope.submit.

Concrete injection: Inject backend.head at Context freshness/admission, backend commit, committed-cache update or controlVerdictAt current-head verification. Distinguish precommit from durable postcommit injection.

Expected result: Journal cannot serve further submissions. Through Scope.submit it is closed. Clean reopen returns the persisted saved receipt exactly when the entry committed; a precommit failure consumes no position.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C12 — spike/src/ordering.ts:66

**orderingAdmission**. Phase: precommit admission AND cold/read-only wire replay.

Call path: append encoding.admission; Journal.verifyEntries; verifyJournalView inside verifyPublicProof/wireInput.

Conversion: Baseline catches ALL values from payload validation and publicKeyOf and returns malformed_control.

Limit: Blocking M1 gap. Journal.open replaces it with plain Error("Journal: malformed_control"); view verification replaces it with Error("Journal view: malformed_control"), which C13 message-allowlists and Scope converts to an ineffective verdict. These read paths were missed by the prior crypto sweep.

Concrete injection: Gate crypto.createPublicKey to orderingAdmission while authenticating a valid ASSIGN successor. Exercise source cold open, destination activation with nested proof, and destination cold open/state. Object.keys inside the payload-shape portion is a second concrete inside-try seam.

Expected result: Baseline loses original identity, and nested proof failure can return an ineffective activation with a still-usable facade; clean replay later becomes effective. M1 must preserve unexpected faults in every route, while actual malformed control fields/principals remain declared refusals. The repair owner reports explicit shape returns plus a private-codec-branded key-import catch; this audit has not measured that repair.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C13 — spike/src/scope-proof.ts:162

**wireInput: validate callback**. Phase: wire proof verification, standalone or nested replay.

Call path: assertPublicData committed opening or verifyPublicProof wire callback → wireInput.

Conversion: Exact codec brand OR an Error whose message equals WIRE_REJECTIONS becomes a new ScopeProofError. All other originals rethrow. Existing ScopeProofError is normally rethrown to the enclosing scope semantic catch.

Limit: The 29-string allowlist intentionally accepts an injected plain Error with a matching message; it is not origin-branded. The semantic interpretView after the wire callback is outside this catch. Source claims must not call every runtime Error unexpected at this boundary.

Concrete injection: Gate Object.getOwnPropertyDescriptors, crypto.createPublicKey/verify, or digest to a call inside the wire callback. Inject unknown sentinel, exact allowlisted Error, codec-branded error, and Error with throwing message getter. Avoid the semantic replay after wireInput returns.

Expected result: Declared wire failures become scope-proof rejection and, when nested in a scope action, an ordinary ineffective verdict. Unknown errors retain identity; managed Scope.state/submit closes, standalone proof verification has no facade. Postcommit nested activation retains its saved action for clean replay.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C14 — spike/src/scope-proof.ts:168

**wireInput: exception inspection guard**. Phase: while classifying a caught wire error.

Call path: wireInput outer catch → codec brand / instanceof Error / error.message inspection.

Conversion: Swallows ONLY the secondary inspection exception, then rethrows the original outer value because no reason was assigned.

Limit: Not an input-error conversion. Preserving an outer revoked Proxy or opaque value must not be confused with preserving the secondary TypeError thrown while inspecting it.

Concrete injection: From the same wire callback as C13 throw a revoked Proxy, or an Error with a message getter that throws a distinct marker. Assert caught value === the outer original and that the inspection path ran.

Expected result: Original outer value reaches the caller unchanged. Nested managed replay closes; standalone verify has no facade. Same reached-site check on both stores.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C15 — spike/src/scope.ts:185

**replayScopeView: release opening verifyEnvelope**. Phase: strict replay, including after activation append.

Call path: replayScopeView activate branch → verifyEnvelope(release.committed).

Conversion: Exact codec-branded errors become local ScopeRefusal("malformed_release_proof: ..."); all others rethrow.

Limit: The local refusal is then caught by C16. Codec private-identity and parser-origin limits apply; no broad Error/TypeError classification here.

Concrete injection: Gate crypto.verify/createPublicKey/parseCanonical to the release opening in the activate branch, after prior full-public-proof verification. Supply genuine malformed signed opening as a positive control.

Expected result: Declared malformed release is an ineffective activation. Unexpected value escapes unchanged and closes the managed facade through state; the committed attempt and retry receipt remain. Cold replay after removing a runtime fault restores the actual verdict.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C16 — spike/src/scope.ts:259

**replayScopeView: scope semantic action**. Phase: strict replay/postcommit, also standalone interpretation.

Call path: replayScopeView per-entry scope-kind try: release, activate, admit, scoped results/exercise.

Conversion: ScopeRefusal, ScopeProfileError or ScopeProofError instances become a known, authorized, ineffective scope verdict using error.message. All other values rethrow.

Limit: ScopeRefusal is local; ScopeProfileError and ScopeProofError are exported nominal classes. A runtime-injected instance of either exported class is intentionally converted. Full-prefix interpretView and init before this per-entry try are outside it.

Concrete injection: Gate hashing or nested proof verification to validateExport/exportFrom inside a scope action, or inject an unexpected registered callback reached by nested replay. Also inject actual exported error instances and distinct-message-getter errors as policy controls.

Expected result: Nominal typed refusals leave the managed facade usable with an ineffective recorded action. Unknown originals escape and poison the enclosing managed state/submit path. Standalone replay/interpret/export calls have no blanket poisoning guarantee.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C17 — spike/src/scope.ts:263

**replayScopeView: exception inspection guard**. Phase: while classifying a semantic exception.

Call path: outer scope catch → instanceof local/exported error classes and message read.

Conversion: Swallows secondary inspection errors only, then rethrows original outer value if no reason was obtained.

Limit: Same outer-value distinction as C14. An Error message getter is accessed only after a recognized class match; use a ScopeProofError/ScopeProfileError with a throwing getter to reach that branch.

Concrete injection: Inside the C16 body throw a revoked Proxy, or a recognized exported scope error with a getter throwing a different marker. Assert original identity and site reach on each store.

Expected result: Original outer value propagates. A managed state/submit call then closes; standalone replay simply throws.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C18 — spike/src/scope.ts:322

**ScopeJournal.state**. Phase: managed replay of existing or newly committed history.

Call path: state getter → replayScopeView(fullView), inspection postprocessing and snapshot.

Conversion: Any escaped value invokes replayFailed: mark unavailable; try Journal.close; finally throw the original.

Limit: Unlike most cleanup catches, the finally deliberately preserves the replay error even if close throws. It cannot undo a committed append, and it does not guard every read API.

Concrete injection: Throw from backend.entries in fullView, scopeSetup key import, strict model callback or nested proof. Separately make close throw to verify original preservation and document resource cleanup limitations.

Expected result: state/submit/guarded operations refuse afterward. Memory proof() and underlying context.view() can still read because they lack that Scope guard; SQLite storage closure can prevent reads for a different reason. Remove fault and reopen to reconstruct actual durable state and receipts.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C19 — spike/src/scope.ts:341

**ScopeJournal.submit: Journal call**. Phase: precommit through Journal postcommit handling.

Call path: ScopeJournal.submit try Journal.submit.

Conversion: Escaped value goes through replayFailed, preserving original via finally while marking unavailable and closing Journal.

Limit: Refusal return values do not enter this catch. Subsequent state replay is protected by C18, but the final verifyEnvelope(input) is outside both catches.

Concrete injection: Inject backend freshness/commit/cache or Context fold fault under Journal.submit, after the initial verification refusal boundary. Check close-error behavior separately.

Expected result: Scope becomes unavailable and the original value is thrown; cold reopen exposes exactly the actual durable prefix. Exact retry can return its original receipt if committed. No blanket claim covers the later final-envelope verification.

Stores: Run the same fault and malformed-input control with MemoryBackend and SQLiteBackend; the catch itself is shared runtime code.

### C20 — spike/src/sqlite.ts:38

**SQLiteBackend constructor**. Phase: backend initialization/open, before Scope facade exists.

Call path: caller creates SQLiteBackend → PRAGMA/DDL/metadata/COMMIT/checkIndexes.

Conversion: If in a transaction, roll back; close database; rethrow original.

Limit: DatabaseSync construction is outside the try. A rollback or close exception can replace the original. This is SQLite-only, not a shared Scope catch.

Concrete injection: Inject DatabaseSync.prototype.exec/prepare after native creation (for example first PRAGMA), or JSON.parse specifically inside checkIndexes. Retain the database path and inspect clean reopen once the injection is removed.

Expected result: No Scope facade is returned. Original is preserved if cleanup succeeds; clean reopen validates committed storage. Metadata may already have committed before checkIndexes fails; do not assert all constructor failures leave an empty file.

Stores: SQLite: exercise this exact catch. Memory: NOT APPLICABLE; MemoryBackend construction has no equivalent try/catch. Do not fabricate a memory hit.

### C21 — spike/src/sqlite.ts:70

**SQLiteBackend.serialized**. Phase: transaction before write through after COMMIT.

Call path: Context append or other backend operation → SQLiteBackend.serialized.

Conversion: Roll back if transaction remains open, rethrow original, finally clear busy.

Limit: Rollback failure can mask the original. The post-COMMIT fault hook is inside the try, so it throws even though the data is durable. A thenable callback is rejected; busy guard is outside the try.

Concrete injection: Use documented SQLite fault hooks before write, before commit and after commit. Also inject a transactional exec failure. Arm one fault at a time and record whether COMMIT completed.

Expected result: Before-commit SQL failure rolls back and consumes no position; after-commit failure retains one saved receipt. Enclosing Context/Journal/Scope becomes unavailable. Busy clears through finally. Clean reopen and exact retry distinguish the two cases.

Stores: SQLite: exact catch. Memory: NOT APPLICABLE to this SQL catch; test MemoryBackend.serialized try/finally as an analogue and explicitly record that it cannot roll back an already-performed write.

## WIRE_REJECTIONS: exact baseline allowlist

There are 29 messages. `error instanceof Error` and exact `.message` equality are sufficient; provenance is not checked. A privately branded codec error also converts independently of this list.

- `Journal: expected genesis`
- `Journal: wrong writer (initial assignment)`
- `Journal: invalid origins`
- `Journal: unsupported profile`
- `Journal: duplicate commitment`
- `ordering: malformed control payload`
- `ordering: invalid v3 sequencing fields`
- `ordering: control key must differ from writer`
- `Journal view: genesis must be readable`
- `Journal view: non-dense positions`
- `Journal view: wrong header hash`
- `Journal view: duplicate commitment`
- `Journal view: missing actor proof`
- `Journal view: envelope bounds`
- `Journal view: body disagrees with signed bytes`
- `Journal view: unadopted origin`
- `Journal view: hidden position contains an envelope`
- `Journal view: missing assignment opening after seal`
- `Journal view: retired_writer`
- `Journal view: handover_not_enabled`
- `Journal view: writer_sealed`
- `Journal view: wrong_control_predecessor`
- `Journal view: wrong_ordering_epoch`
- `Journal view: wrong_seal_authority`
- `Journal view: assignment_without_seal`
- `Journal view: wrong_control_authority`
- `Journal view: control_key_is_writer`
- `Journal view: writer_already_used`
- `Journal view: malformed_control`

## Other coverage boundaries

**N01 — `spike/src/scope.ts:299-309`.** ScopeJournal constructor calls scopeSetup after Journal.open/create has acquired a lease, without cleanup. A key-import fault there leaks the memory backend lease; the SQLite caller may recover by closing its handle. This is a missing catch, not one of the 21. The repair owner reports a close-in-finally cleanup preserving the original; this audit has not measured it.

**N02 — `spike/src/scope.ts:347`.** Final verifyEnvelope(input) after accepted append and successful this.state replay is outside submit/state catches. A fault propagates original but leaves the facade usable and the append durable. Record this distinct scope limit and a saved-retry expectation; do not call it covered by C19.

**N03 — `spike/src/scope.ts:324-334; Context.view; Journal.close`.** interpret/export have availability checks but no catch that poisons on their own replay faults. proof() has no Scope availability check; underlying context.view() is likewise outside Scope guards. Memory postfault reads can remain usable. SQLite closed-handle failures are not evidence of a general replay-read guard.

**N04 — `spike/src/scope.ts:299,303,309`.** Strict guarantee belongs to static ScopeJournal.create/open paths and their true throwOnFoldError option. The TypeScript-private constructor is callable from JavaScript and can wrap a non-strict Journal. Scope.open authenticates/restores Journal and setup but does not itself eagerly evaluate full Scope.state; label an open-plus-state probe accurately.

**N05 — `spike/src/scope-proof.ts:135; foundation genesis/model.init; scope init/full-prefix replay`.** Several semantic operations intentionally occur outside converting try bodies. Their faults still require original-value propagation but cannot establish reached-catch coverage. Current AST inventory covers repository runtime callbacks, not arbitrary externally supplied package implementations.

**N06 — `spike/src/append.ts:203; spike/src/sqlite.ts:71; spike/src/scope.ts:314`.** Memory serialized finally releases busy but supplies no rollback. SQLite finally also clears busy. Scope replayFailed finally preserves the original even if close throws; constructor/transaction cleanup lacks this stronger protection. Distinguish resource cleanup from facade logical unavailability.

**N07 — `spike/fixtures/ordering-scope-faults.ts:54`.** One extra catch outside the static runtime graph: alternateRelease catches any producer proof error, reads .message, and falls back to faultyWriterProof. An unexpected signing/hash error can therefore masquerade as producerRefusal, and null/undefined/revoked values or close-finally errors can mask the original. Its forkSource always uses MemoryBackend even when the original world used SQLite. Do not use this deliberate dishonest-writer helper to establish runtime or SQLite conversion coverage.

## Required evidence assertions

1. For each reachable shared site, run both MemoryBackend and SQLiteBackend with actual signed data. Mark the two SQLite-only catches structurally N/A for memory and separately exercise its try/finally analogue.
2. Inject Error, string, undefined, plain object, revoked Proxy and unbranded validation-looking TypeError. Use a caught boolean plus strict identity, because throw undefined must not be confused with no throw.
3. Record a reached counter and stack/site evidence inside the intended try body. A crypto fault in an earlier guard, a digest after a serialization catch, or a model.init outside dispatch does not cover that try.
4. Add positive controls for malformed JSON, genuine private codec/canonical brands, ordinary control-shape refusals, local/exported typed scope refusals, exact WIRE_REJECTIONS Error messages and throwing inspection getters.
5. After fault removal, assert durable head and original saved receipt/no receipt, facade guard behavior, exact retry position, and clean reopen verdict. Separate precommit, in-transaction and durable postcommit outcomes.
6. Retain deliberate policy limits: broad precommit invalid_envelope conversion, exact-message plain Error allowlist, exported Scope error instances, and nominal SyntaxError if adopted. These are not private origin brands.
7. Run cold source open, nested destination activation, and cold destination open plus state. The ordering key import occurs inside proof/header-chain paths as well as append admission.
8. Record every command/source/output boundary honestly. This catalogue is static inspection plus referenced prior checker evidence; it contains no newly executed fault matrix or test pass claim.

## Provenance

- Baseline review: `/tmp/dap-o4-15b-review-66effd75.md`.
- Retained checker reproductions: `/tmp/claude-501/-Users-hughpyle-play-dap/55890269-4b7b-4cda-8c2b-ab7134ad403a/scratchpad/o4r3-fault-repros/`; `l2-ordering.mjs` was read, not rerun by this audit.
- Inventory: `/tmp/dap-o4-m1-catch-inventory.json`.
- Machine-readable catalogue: `/tmp/dap-o4-m1-catch-audit.json`.
- Reproducible catalogue writer: `/tmp/write-o4-m1-audit.py`.
- No new runtime result is inferred from static inspection or from the repair owner’s development status.
