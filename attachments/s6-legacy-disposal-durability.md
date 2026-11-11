# S6 completion durability before secret deletion

This source-only refinement qualifies the legacy completion design `98b91be5`. It changes no source and runs no storage or validation operation.

## What the maintained implementations provide

`fileStore` is the maintained disk-backed CLI Store. Its common writer writes a whole temporary file, chmods it, then publishes by hard link or rename and removes the temporary name. It performs no file or directory sync. `save`, `keep` and `keepPrivate` therefore expose no durable ordering barrier. Reading the new config back proves current visible bytes, not that those bytes or their namespace links survive a machine failure.

`memoryStore` preserves cloned values only in memory and models persistence in tests. The Page adapters in connection-custody, oauth-custody and claim publish their browser journals through their existing storage API. They expose no disk sync capability and must not acquire legacy CLI cleanup by accident. Custom Store implementations also have no implicit durability promise.

There are two separate maintained publication patterns to follow without importing their owners: `scope-index-command.ts:32–44` syncs its file before exclusive publication and syncs the parent directory afterward. `apps/views/src/review-store.ts:89–96` syncs temporary bytes, renames, syncs the directory and reads back. Neither supplies a Store barrier, key-custody ordering or a transaction across config and deletion.

## Smallest recommended cleanup contract

Keep one optional discard capability, but strengthen its expected guard with the exact completed-config snapshot:

`discardPrivate?(name, {digest, bytes, afterConfig: {digest, bytes}})`

`afterConfig` describes canonical complete Config bytes, including the nonsecret completion record and usable connection. It is not a public authority claim. Proposed canonical and on-disk config limits are each 262144 bytes. An oversized or unreadable config leaves the secret and reports cleanup pending. The original private-record bound remains 32768 bytes. Root must approve these local cleanup eligibility bounds before implementation.

The shared completion helper saves and reads back the intended complete config, computes this exact guard, and establishes the original/native/context proof. The storage capability then performs one synchronous ordered transition under the same cooperating-writer boundary as the V2 design:

1. Open the current config, selected signing-key file and relevant directories through the validated identity/no-follow path. Require the complete config to match afterConfig and its valid completion to name this exact private original. Read no other private record and discover no key catalog. Confirm the selected existing key still matches the original actor. Do not create or sign anything.
2. Revalidate the actual original file's bounded existing envelope and signed semantic identity, then its exact byte digest and length. Preserve the prior regular-file, single-link, owner, parent and descriptor-identity guards.
3. Sync the selected key file and keys directory first. The key can predate this implementation, so it cannot be treated as durable merely because it is old or was read successfully.
4. Sync the already-published exact config file and its directory. Also persist the known ancestor directory links that make the config root reachable. Do not assume a recently created recursive config path already has durable ancestors. A bounded bottom-up walk to the filesystem mount anchor can do this without creating files or scanning contents. Proposed maximum is 128 components. Refuse cleanup if an identity changes, the bound is exceeded, a required directory cannot be opened or any sync fails.
5. Recheck exact config, key and parent/leaf identities. Only after every required recovery artifact and namespace barrier succeeds may the method unlink the one verified legacy record.
6. Sync the private directory before reporting durable removal. If this final sync fails after unlink, report cleanup incomplete with the already-synced usable connection and completion. A later same-link retry can safely recheck an absent or reappeared original. It must never create another Native enrollment.

This keeps the new barrier inside the proposed files.ts/store.ts/shared-completion owners. It does not globally change every Store.save or key/private writer. The guard must cover the entire expected config rather than merely the presence of a completion-shaped field. Unsupported stores retain the original. MemoryStore can model exact snapshot comparison and ordered disposal for tests, but cannot claim machine persistence. A nonexportable or external production store must implement its own equivalent durable barrier before offering this capability.

No independent-process atomicity appears here. Another process with the same local access can replace names after the final check or publish a stale name later. One cooperating writer owns this config directory for the transition. The new snapshot guard detects observed changes; it is not a lock or compare-and-unlink transaction. The design adds no lock/custody file.

## What this does and does not prove

After successful recovery-artifact syncs and before unlink, a machine failure should leave either the original record or the persisted key, usable config and public reconstruction hint, assuming the filesystem honors its sync acknowledgements and stable namespace contract. After unlink but before private-directory sync, the original may reappear after recovery; the durable completion lets the same explicit link finish local cleanup. Refused or unsupported barriers never intentionally delete the original.

This is an OS-acknowledged file-and-directory ordering contract. The existing code provides no F_FULLFSYNC/native hardware-flush adapter, and the proposal does not add one. It cannot promise survival of arbitrary device-cache loss, broken storage, rollback or filesystem corruption. An ordinary unit test cannot prove physical power-loss persistence.

The existing unsynced initial `keep`, `keepPrivate` and pending `save` also leave a preexisting machine-failure gap before completion and before Native send. The focused barrier prevents the new cleanup from deleting the last recovery material after completion. It does not retroactively make every earlier enrollment transition machine-crash durable. A whole-lifecycle machine-crash claim would require hardening the common writer before dispatch, including key, original, pointer and ancestor publication. That broadens I/O and regression obligations beyond this bounded cleanup.

## Scope and witness cost for root or planner

Recommended bounded choice: add the guarded completion barrier above, treat unsuccessful or unsupported sync as pending cleanup, and limit the claim to acknowledged ordering at secret disposal. Reuse the exact same-link reconstruction and no-new-signature/key/deadline rules from V2.

If the planner requires stronger or whole-lifecycle persistence, the specific question is: “Does S6 item6 require only a durable recovery barrier before spent-secret disposal, using acknowledged file and directory sync, or must it harden all earlier key/original/pending writes and add platform-specific power-loss flushing? The latter changes the common writer and every affected Store witness; current readback/rename does not establish it.” Do not ask Hugh for another patch approval.

The bounded barrier costs reads and syncs of one known key, one known config and known directories. It never sweeps keys or issuer originals. Up to 128 ancestor syncs is an explicit proposed bound, not a measured latency. Root can select a smaller approved stable anchor if deployment provisioning proves it durable.

Extend the existing files.test.ts private-record case with ordered sync-before-unlink observations, failure of each required barrier leaving the original intact, and final-directory-sync failure retaining the completion and cleanup-incomplete result. Use test-side filesystem instrumentation around maintained Node calls, not a production test flag or a new native helper. Keep a real filesystem positive path. These are source/order and failure witnesses, not a machine power-cut experiment. Existing enrollment stories recheck that a failed barrier leaves the usable connection and performs no additional Native mutation or signature. No case, timeout or measured result is allocated by this refinement.
