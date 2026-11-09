# Read authority before receiver work and drain timers only from alarms

Request `03e5f6d7`; promise `8787bceb`; source starts at main `29926a3a`.
This head contains source and dependency preparation with maintained seal
metadata. No compiler, test, control or gate has run for R3. It now includes
published D6 main `c85a9bae`.

An ordinary act whose held observation already denies its grant now
returns `unauthorized` before application provenance, receiver policy,
foreign facts or a queued turn. Signature and shape checks still come first.
Native grant marks keep their own fallback, including recovery-key and
action-null rules. No successful act relies on the early check alone:
the commit still checks authority, revisions, time and current application
admission. The port documentation states that `held` can run before the
turn and again at a commit; only `sealed` consumes a recorded use. A key
accepted during the asynchronous standing read retains its historical
receipt or mismatch path.

Only `Turns.run(null)`, called by the native alarm, drains timed work.
A waiting input does not pass a due transition: it waits with `busy`, and
its exact retry can follow the alarm's timed entries. A backward clock
still refuses a due waiting input without writing. Alarm budgets, item
ordering, entry meanings and every existing definition pin stay intact.

The remote authority run admits at most 4,096 distinct signing keys.
A bounded key set covers ordinary, once-only and discarded observations,
so neither the kept-observation nor retained-head map grows by cycling
those forms. A new key at the bound gets the private port answer `limit`
before a Membership read. Core maps that answer to the existing `limit`
refusal for an act or preparation. Consumers of `Authority.read` now handle
that literal result as well as standing and null. Existing keys remain usable. A new
object run starts with no cached keys or observations. Own-Membership
standing uses no remote observation map and keeps its existing rules.

## Witnesses and validation due

The new Native order witness uses real ScopeObject, SQLite, a real foreign
entry and a timed alarm. Its Membership and release-admission ports are
labelled stand-ins. It checks zero provenance, receiver and foreign reads
and no new entry on a failed observation. An authorized input reaches those
boundaries but leaves due timers unchanged until the alarm; its retry then
writes the act. The actual receiver-policy method is instrumented, with a
positive call to distinguish an unused counter. A final scripted port-limit
answer reaches the signed Core boundary as `limit`, with no additional
provenance, receiver or foreign read and no new entry. The separate budget
owner fills the real observation map.

The authority owner adds one pure budget witness using synthetic key IDs
below signature admission. It mixes ordinary, once-only and failed reads.
It admits the real 4,096-key limit once and refuses key 4,097 before a read.
Existing keys retain ordinary reuse, once-only reads and recovery after a
failed read. A new run permits the new key. The Core witness covers the
signed-input boundary separately.

The complete turn owner keeps its alarm budget, clock, timed ordering,
listener and restart assertions. Its application-admission race now
withdraws trust during an asynchronous foreign read after early standing,
so it still distinguishes the final commit check. Existing Membership and
creation owners must retain recovery-key and action-null witnesses. The
composition restart witness gives its scripted clock the additional early
standing read before its deliberately earlier dispatch reading. Its
outbox, alarm, eviction and duplicate-delivery assertions stay intact.

The operation owner retains both late-reply custody and FIFO witnesses.
Late callbacks now leave the journal head unchanged while timers are due.
Real alarms drain one transition per configured budget before the retained
answers can be recorded. The owner still checks exact unknown and confirmed
entries, duplicate replies, no second provider send, first-answer retention,
one-owner failure isolation and the reserved cleanup duty. Its two names
now state the alarm boundary. D6's inventory adds the new order and bound
witnesses to its nine original rows: eleven witnesses in nine source files.

The maintained producer at `7431eb21` changes only the named Core `Scope`
seal and the whole authority seal, and supplies a new whole-file turn seal.
Those actual parser outputs now appear in the inventory. Every route and
gate assertion remains in place. These structural tripwires establish no
runtime result.

Focused compiler contexts, complete owners, meaningful controls and one
final gate all remain due. This preparation claims no runtime result.
R3 includes the security documentation landing and replaces D6's queued-R3
wording with the current branch's order and bound.

## Kernel filing and deployment

This is the filed R3 security remediation under
[Kernel section 7.1](../../docs/kernel.md#71-filing-while-parts-fail-the-test).
It adds no kernel package, export, scope kind, platform name, capability,
record field, reason code or tool family. It changes the runtime's order
before recording, not a recorded entry's judgment or replay meaning. A
platform service or application guard cannot stop reads that the native
runtime performs before reaching it. The exact-head review must assess
that boundary and cite section 7.

This head introduces no environment setting or redeploy step beyond the
reviewed code deployment. The planner owns deployment. The generic runtime
behavior applies to existing pins; it creates no new cohort. Earlier
review or hosted evidence establishes no result for this head.
