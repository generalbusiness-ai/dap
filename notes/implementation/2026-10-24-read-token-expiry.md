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

Planner decision `21a8e35b103dd0280ea711d78d167db0d355cafd` accepts partial
legacy coverage. An untagged row enrolls only with bounded retained proof of
its current full incarnation, owned read-mint operation, opening and confirmed
own outcome. Missing, pruned, oversized, invalid or unproved old-incarnation
evidence leaves the row unchanged: no retained discriminator safely separates
those rows from write credentials needed for provider revocation. A held legacy
read whose confirmation arrives after its once-through backfill scan also stays
retained; `judged()` alone does not enroll it. All newly minted reads use explicit
`putRead` enrollment and remain queued across restarts and incarnations. No
further search for legacy proof is required. This is not complete legacy cleanup
or a hosted rollout claim.

Both current provider adapters record a provider-reported expiry. The
[Artifacts adapter](../../packages/scope/src/artifacts-host.ts) sends the
requested lifetime to `createToken("read", seconds)` and normalizes the returned
`expiresAt`; it does not derive an end from the requested lifetime. The
[GitHub adapter](../../packages/scope/src/github-host.ts) requests a
repository-restricted installation token and records its returned expiry,
without sending the requested seconds. The [GitHub client](../../packages/git/src/github.ts)
requires that expiry to be in the future and no more than 65 minutes from its
local clock. These are source contracts for current minting, not a measurement
of deployed expiry enforcement or proof of any unknown legacy row's provider
or expiry. Local plaintext removal does not revoke a provider token.

The archive integration keeps constructor expiry scheduling behind the
once-per-activation diagnostic. The bounded expiry-wake predicate still runs
once in the constructor; only shared alarm scheduling waits for the log.
Expiry cleanup remains alarm-owned. The four existing cold-activation
witnesses now enroll a labelled TEST read through the real custody API before
eviction and retain their log-before-recovery assertions. A held rollback
control restores immediate scheduling; its outcome remains unproved.

## Verification status

V7 received static Source review only; its review receipt is
`/private/tmp/artroom-r13-read-token-expiry-v7-narrow-independent-review-20261024-v1.json`
(SHA256 `6afcf14419623e037e82f0d9a8a3fd6380ce0f32225a1d94b55d6e27f63a360f`).
The authored witnesses cover unread expiry through a real native alarm,
read-mint conflict and interrupted-insert recovery, bounded restart-safe
maintenance, exact fractional end, earlier wake arbitration and preservation
of write-token revocation. These witnesses have not run. Affected compilers,
paired control, actual maintained Source seals and the final gate remain
unrun. Private dependencies were copied from the verified same-lock archive
wake checkout without installing packages or executing project code. The
copy passed its before/after checks and took 2.66 seconds wall and 2.23
seconds CPU. No deployment or provider measurement is recorded.
