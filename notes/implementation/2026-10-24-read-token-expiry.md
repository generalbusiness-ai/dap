# Expire unread read-token plaintext

Request `ab2efe97626f59fd7367fac58df9cdf20a2fb64f`, under R13 request
`908786011e5c0acae29e7b2a7c70b87b0680a948` and promise
`0e27a687c4836c8616ac0307c391dec3a9b99db1`.

An unread member read token needs private cleanup at its end even if nobody
calls the credential route. This change schedules that cleanup. It does
not change the requested native read-token lifetime of 1 to 24 hours.

Only the destination adapter's `mint-read` path calls `putRead` in
[`CredentialStore`](../../packages/scope/src/credential-store.ts). Its
nonsecret durable marker binds the full scope and incarnation, credential
ID, mint operation, attempt and exact end. An ID beginning with `read:`
is not enough. Identity and marker conflicts refuse before enrollment;
a repeated read cannot restore plaintext already taken or dropped.

A new empty indexed queue holds numeric expiry times. Its insertion is
atomic with the credential insert through a trigger matching the marker.
Whole seconds and the three millisecond digits are handled as integers.
A crash before the credential insert can leave a nonsecret marker, which
only the exact immutable read-mint binding can reuse.

The native object's alarm owns maintenance. Each quantum examines at most
64 legacy metadata rows in primary-key order and clears at most 64 due
read-token plaintexts. It selects no plaintext for cleanup. A malformed
legacy key can block that backfill cursor, but an independent due-queue
quantum still runs. The existing [wake arbitration](../../packages/scope/src/outbox.ts)
includes this durable expiry separately from native deadlines, operations,
signer maintenance and archive wakes. Empty custody requests no maintenance
alarm. Platform alarm delivery is not an exact-wall-clock guarantee.

Write credentials are not enrolled. Their plaintext remains available to
[the provider revoke path](../../packages/scope/src/destination-host.ts),
including when a provider chooses an ID resembling a read handle. Cleanup
retains read-token metadata and state; it does not claim provider revocation,
append an entry or grant new authority.

Legacy coverage is incomplete. An untagged row enrolls only with bounded
retained proof of its current full incarnation, owned read-mint operation,
opening and confirmed own outcome. Missing, pruned, oversized, invalid or
unproved old-incarnation evidence leaves the row unchanged. The once-through
backfill also leaves a read unchanged if confirmation arrives after its
first scan: `judged()` alone does not enroll it. Explicitly tagged reads
remain scheduled across restarts and incarnations. Whether conservative
unknown-legacy retention is acceptable is pending planner decision
`35728fff7c46dbe3135b5cc93986e06d721d2319`. This is not a complete legacy
cleanup or hosted rollout claim.

## Verification status

V7 received static Source review only; its review receipt is
`/private/tmp/artroom-r13-read-token-expiry-v7-narrow-independent-review-20261024-v1.json`
(SHA256 `6afcf14419623e037e82f0d9a8a3fd6380ce0f32225a1d94b55d6e27f63a360f`).
The authored witnesses cover unread expiry through a real native alarm,
read-mint conflict and interrupted-insert recovery, bounded restart-safe
maintenance, exact fractional end, earlier wake arbitration and preservation
of write-token revocation. These witnesses have not run. Affected compilers,
paired control, actual maintained Source seals and the final gate remain
unrun. No dependency setup, deployment or provider measurement is recorded.
