# Reuse private Artifacts credentials for Site reads

This implements R4's Site token reuse slice at source checkpoint `9c482743a7`. Repeated Artifacts page reads can share an unexpired read credential instead of minting and revoking one for each request. The affected run and fixture follow-up are closed. The original failures remain part of the record. The key-capacity control distinguished its fault and the source is integrated with approved Main; seals and final gate results are pending.

The existing fixed `ScopeIndex` owns the private SQLite custody through binding-only `acquireSiteRead`. No public token endpoint, new setting or binding is added. GitHub reads keep their existing path. The key binds the current canonical Artifacts configuration, full repository identity and validated published ref. Branch aliases use the selected native ref. Immutable reads use their written receipt ref; the versions page uses the recorded branch ref.

Credential reuse does not authorize publication or cache a successful proof. Each request still checks room and publication identity, written receipts and Git objects. Configuration and provider-reported remote identity are checked again on credential acquisition, including ready hits and followers. The route rechecks native eligibility before returning content or a conditional 304. A changed binding/configuration, remote mismatch or stale publication cannot be justified by a cached credential.

The owner retains at most 256 keys and 32 unresolved mint reservations. One live in-memory flight can have eight followers, with 64 followers across the owner. The leader is separate from those follower counts. Full capacity refuses with 503; it never evicts a live key to admit another. Expired rows can be reclaimed.

A durable generation reservation precedes provider awaits. Successful replies must have read scope, bounded printable plaintext and a valid future provider-reported expiry. That actual expiry is stored and never extended by reads. Ready custody survives owner eviction. Expiry maintenance runs on acquisition and the fixed owner's alarm, retaining an earlier platform alarm. If scheduling fails after a token is installed, plaintext is cleared while its known expiry and key remain reserved.

Before `createToken` is entered, failure releases only the request's own reservation. Once minting is entered, an ambiguous or invalid answer keeps the reservation until its start plus the requested 120-second TTL and a 60-second hold. Reads during that hold return finite 503. One successor can reserve after the hold; generation/state/expiry compare-and-set checks prevent an old reply from installing into that successor. No read retries minting inline or remints because Git returned 401 or a network failure. Request close drops its local source and secret references without revoking shared custody.

Planner ruling `3fdb03b9` accepts that bounded interrupted-mint hold. The provider offers no idempotency key or lookup for this operation. These checks establish local custody ownership, not physical provider exactly-once behavior. A late inaccessible provider token can exist after the hold; no remote cancellation or no-overlap claim follows.

## Validation retained so far

Original session `26298` failed the first production compiler because the new alarm method lacked `override`. Other compilers and bodies were unrun. Commit `897c276e` adds that modifier.

Original session `20781` then passed all three Scope compiler contexts. Its ten whole files had 42 passing and two failing cases, with zero unhandled errors. All five new token reuse cases passed, using actual SQLite, fixed-owner RPC and eviction/alarm paths with scripted provider answers and controlled clocks. They cover custody reuse, expiry, stale replies, bounds, configuration/remote changes and local close. They do not establish hosted provider behavior.

The two failures were an immutable Site read receiving 503 because its scripted provider reached only the local Site environment, and a blanket revoke-count assertion that included legitimate creation-token cleanup. The fixture repair at `9c482743a7` shares the exact provider binding with the fixed owner and checks specifically that minted Site read tokens are not revoked. It preserves publication/content assertions, deadlines and production bytes. The independent source review found no material blocker.

Follow-up session `52820` closed with exit 0 at that same checkpoint. Scope-test and Page-scope compilers passed. Eleven whole files produced 29 passes and the one ordinary recorder skip, with all 30 actual case IDs reconciled, no callback gaps and zero unhandled errors. Both previously failing cases passed. Eight unchanged healthy files with 28 passing cases carry from `20781`; the follow-up did not rerun or re-earn them. The closed follow-up was independently audited.

The follow-up outer invocation used 31.07 seconds wall time and 38.06 seconds inclusive CPU. Compiler, body and owner timings are nested and are not added again. This is a local measured invocation, not a provider-performance or complete edit-to-review cost claim.

## Remaining review evidence

Fixture continuation: **complete at `9c482743a7`**, with the ordinary recorder skip and the prior evidence carry described above. Original sessions `26298` and `20781` remain failed; the later pass does not relabel either run.

Control session `27754` closed naturally with exit 1: four cases passed and the capacity case failed by `AssertionError` at line 115. Changing only `>= 256` to `> 256` admitted the 257th key where the unchanged test expected a capacity refusal. All five ready, result and final callback IDs matched the JSON outcomes, with no skip or unhandled error. The later assertions in that case were unreached on the mutant. The earlier positive run remains the baseline. The outer invocation used 4.93 seconds wall time and 6.15 seconds inclusive CPU. The exact positive source was restored and verified after the control; the mutant was not pushed. Independent closed-data audit is pending.

Approved Main `6c0a9a4d` was integrated without conflict at `53d3fd0`. All eight R4 files retain their positive checkpoint bytes, and Main's current seal map is preserved. Actual AST seals, integrated source/fixture closure, the ordinary gate and exact-head review: **pending**. No native authority change, Main landing, hosted rollout or deployment success is claimed. Final reporting must bind actual results and the final head, preserve both original failures and include the accepted source review. The retained external evidence inventory accompanies this draft; no raw token, provider payload or physical snapshot belongs in the public note.
