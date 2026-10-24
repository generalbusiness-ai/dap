# Recover an archive alarm after a reset

Request: `ea2bfc00f2f264cebd008627b8cffcc463904f4b`.
Promise: `610cea676c9b4f7dee78610d43c588960d011179`.

A live scope can retain an archive wake after its platform alarm disappears.
Ordinary reads now reconcile that wake with the platform alarm. Recovery only
schedules work; the actual alarm still runs the archive pass.

## Diagnosis and limits

The planner reported a bootstrap pass on object `7efb5613` at 04:23:16,
followed by a cancelled alarm and continued `nativeBirth` traffic without
another archive diagnostic. The deployed source was Main `e63b2a7b`.

The pass completed confirmed-frontier installation. In the shipped Grow
wiring, the bootstrap return for a missing context spends zero attempts.
The observed 22 attempts account for 11 captured objects and their independent
validation. With reason and caught error both `none`, the matching return is
after `installConfirmedBootstrap`, which commits the checked frontier in a
transaction. Zero entries and unchanged journal refs are expected: migration
installs local state and leaves publication to a later pass. Parent-read phase
`none` does not mean that migration performed no network reads.

That conclusion concerns the successful pass. The object's scope name,
current hosted frontier, stored wake and platform alarm have not been read.
Evidence request `c2c76bf86959e28f642f219a60d1d031cebb12c3` asks the planner
for the mapping and existing hosted observations. They remain unknown here.

Before host I/O, the driver persists its next retry in the separate archive
wake index. A migration-only pass leaves that wake intact. The old object
constructor and alarm's final scheduling step both re-armed it, but ordinary
reads on an already-live object did not. Losing the platform alarm could
therefore strand the saved wake while read traffic continued.

This is a source diagnosis and local reset reconstruction. It does not prove
why Cloudflare cancelled the production alarm or that a version change caused
it. Cloudflare's [tail outcome documentation](https://developers.cloudflare.com/workers/runtime-apis/handlers/tail/)
provides the cancellation outcome, not a specific cause for this event.

## Change

Ingress checks the saved archive wake and schedules the earliest native owner
when the platform alarm is missing or later than that wake. It preserves an
earlier alarm and future retry backoff. Quiet scopes skip the asynchronous
alarm lookup. The raw birth read also performs this scheduling check.

An in-memory counter suppresses recovery throughout an active alarm handler,
including its final scheduling step. This matters because
[`getAlarm()` can return null during a running handler](https://developers.cloudflare.com/durable-objects/api/alarms/).
A revision check rejects an alarm read overtaken by another local scheduling
action. Concurrent ingress shares one recovery operation. Recovery failures
leave the read answer unchanged and permit a later ingress to try again.

The change reuses the existing arbitration among all native wake owners. It
does not run an archive pass from the read, change journal state, fetch host
objects, or change retry limits. Recovery requires an ingress or activation;
it does not create an independent timer outside the platform alarm service.

## Validation

The native witness deliberately deletes the real scope's platform alarm while
retaining its saved pending archive work. It checks the exact future backoff,
preserves an earlier alarm, corrects a later reset, restores a due wake and dispatches the actual
alarm to confirm the same pending commit. Before that dispatch, the archive
row, head and host call counters remain unchanged. This is a reset test, not
a reproduction of Cloudflare's cancellation cause.

In this reconstruction, the saved retry is `2099-01-01T00:00:01Z`
(`4070908801000` milliseconds). The platform alarm is null immediately after
the deliberate deletion. Recovery restores that exact value, both before and
after the fixture clock advances to it. These are fixture values, not the
current hosted state.

Scope production and test compilers passed. The whole driver and bootstrap
files passed 18 cases. With only the raw birth read's recovery call removed,
the driver file produced 13 passes and one assertion failure: the alarm was
null instead of the saved `4070908801000` value. Production bytes were restored.
After adding the later-reset assertion, the test compiler and all 14 driver
cases passed. The four entry-point inventory tests also passed after adopting
the maintained parser's actual object seal in its two slots.

The first sandboxed native launch failed on loopback `listen EPERM` before
test bodies. Its logs remain alongside the successful launch; it is not a
test result. No dependency install occurred.

The [affected validation receipt](evidence/2026-10-24-archive-alarm-recovery/affected.json)
records source hashes and outcomes. Raw logs and JSON remain at
`/private/tmp/artroom-archive-wake-recovery-validation-20261024-v1`.
The ordinary gate will run once on the committed candidate; its natural result
will be added before review.
