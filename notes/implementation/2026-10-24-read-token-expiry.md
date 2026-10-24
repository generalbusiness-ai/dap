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

The retained V7 static Source review is
`/private/tmp/artroom-r13-read-token-expiry-v7-narrow-independent-review-20261024-v1.json`
(SHA256 `6afcf14419623e037e82f0d9a8a3fd6380ce0f32225a1d94b55d6e27f63a360f`).
The following affected runs preserve both original failures before the
healthy continuation. They are separate natural invocations, not retries
hidden inside one passing result.

| Original | Actual outcome | Outer wall / CPU seconds |
| --- | --- | --- |
| `50749` | Scope production compiler failed; test compiler and all 23 bodies unrun | 1.18 / 1.91 |
| `86333` | Both compilers passed; one destination fixture assertion failed; 22 cases unfinished/pending after bail | 8.25 / 12.15 |
| `72343` | Scope test compiler and all 23 cases in five whole files passed | 9.74 / 14.14 |

The first run stopped at `a7c49158257ea51f1bdd7fc6d8dd34bdcbd29d41`.
Two TS7053 errors identified a legacy receipt body narrowed to `{}` before
indexing `token` and `ends`. The existing `isRecord` helper supplies the same
object, null and array checks with the required record type. The correction
changed only that predicate and its import.

At `64318364bb59d2fb3e8000c0a1d2736e94a5c204`, the second run passed both
Scope compilers, then failed at destination-host test line 150: the scripted
mint used `read:provider-token-1`, but its revoke reply still named the old
ID. The adapter returned no answer rather than the expected confirmation.
The fixture correction matches that revoke ID and retains all assertions.
Earlier shorthand that the other 22 cases were unrun is too strong: all 23
started and result callbacks exist, but 22 results are pending after bail.
They establish neither completed cases nor completed assertions in those
22 bodies. This original invocation remains failed.

The healthy continuation ran at
`276963a0ed1deeebbd9251a252567b9db0eff99d`, tree
`b6d2609d52f4661da4181144193cee15713013e3`. Its Scope test compiler passed,
then all 23 semantic cases were collected, started, completed and passed
exactly once. All 23 result callbacks are present. The maintained end event
and Vitest JSON agree, with zero unhandled errors, no added or missing
semantic identities, no repeats and no retries. The five whole files are
credential custody (3), destination adapter (6), read-token expiry (1),
archive operator (10), and owned item-query bounds (3). Original deadlines
and configurations remain unchanged.

The production compiler pass carries from `86333`; it was not rerun in
`72343`. Between the two tested commits, only the destination test fixture
and this note changed. Every production Source/configuration, tool, workspace,
alias and lock hash is identical. The changed fixture was recompiled by
Scope test. Three maintained clean guards passed in the healthy run,
each checking 3,124 tracked Source inputs, one external owner input,
14 workspaces and 41 aliases. These are standard boundary guards, not a
full physical dependency-pool or continuous memory proof. Numeric framework
task IDs are not supplied by this focused reporter and are not invented.

The witnesses now include passing unread-expiry cleanup through a real
native alarm, read-mint conflict and interrupted-insert recovery, bounded
restart-safe maintenance, exact fractional end, earlier wake arbitration
and preservation of write-token revocation. The Git providers, token
responses and test clocks are stand-ins; no deployed provider expiry or
hosted cleanup outcome was measured. Paired controls and the ordinary final
gate remain pending.

The three external Python owner envelopes total 19.17 seconds wall and
28.20 seconds CPU, each printed at 0.01-second precision. These runs used
the local macOS 27.0.1 arm64 machine and verified private dependency view
with existing caches. System load and cache temperature were uncontrolled;
these are validation costs, not a performance comparison. Focused Node and
phase times are nested and are not added again. This is a subtotal of
these three affected invocations, excluding dependency preparation, seals,
future controls/gate and edit-to-review time. Exact closed input pins,
semantic outcomes, failure excerpts and carry comparison are held at
`/private/tmp/artroom-r13-read-token-focused-independent-audit-20261024-v1/manifest.json`.

The maintained producer computed the object and destination Source seals
at clean `3a090dfbaefcb425dbec8e64b8143ff054b147bf`, tree
`a992f369167b00d2360e5b0ffe729221033566ff`; only their three existing map
slots were updated. The producer checked its pinned inputs and clean
checkpoint before and after both calls. Its output is held at
`/private/tmp/artroom-r13-read-token-seal-actual-20261024-v1.json`.
Private dependencies were copied from the verified same-lock archive
wake checkout without installing packages or executing project code. The
copy passed its before/after checks and took 2.66 seconds wall and 2.23
seconds CPU. No deployment or provider measurement is recorded.


## Integration with the approved archive restart

Approved Main `55e4be6cdc0300b0a1865c237be3097cfb232edd` is merged
with the R13 source. The composed object preserves both credential expiry
scheduling after the activation diagnostic and restart consumption after
that same diagnostic, before archive recovery. The operator witness keeps
the real private expiry fixture and the restart snapshot and digest fields.

The earlier 23-case results above apply to the earlier R13 source, not this
composition. New 30-case affected checks, composed Source seals, the two
existing R13 controls rebound to final Source, and the ordinary gate remain
pending. No new validation was executed for this merge. The two object map
slots currently retain the historical incoming Main value and are explicitly
stale for the composed object until the actual maintained producer runs.
The R13 destination seal and incoming archive values are preserved; neither
parent's object value is claimed as the composed seal.
