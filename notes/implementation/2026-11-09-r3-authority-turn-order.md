# Refuse failed authority before foreign work and leave timed drains to alarms

Request `03e5f6d7`; promise `8787bceb`. This head includes published D6 main
`c85a9bae`. R3 changes no recorded format, definition pin or deployment setting.

## What changed

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

## Decisions and witnesses

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

## Evidence

The [pre-gate manifest](evidence/2026-11-09-r3-pre-gate.manifest.json)
seals 50 public files and retains 1,378 private raw files. The first frozen
run remains failed. Its complete Node owner passed all 12 cases, and all
14 compiler contexts passed. Native bail left 20 cases unrun, four unfinished
and one skipped after the creation witness failed. That witness still
expected a refused request to drain a timer. The correction checks that
creation leaves the head fixed, then invokes the real alarm and keeps the
original pinned effects assertion.

The limited follow-up ran the affected Scope test compiler and six complete
owners. It passed all 32 cases. The first run's complete turn owner (27)
and operation owner (11) remain the healthy results for those unchanged
files. Thus eight owners have complete passing results for 70 unique cases;
that count combines retained runs and is not one observed test invocation.

Each control reused its saved healthy whole-owner baseline and changed
only one guard. Each caused its intended assertion failure, restored every
tracked source byte, and closed its owned process group. The first and
third control verifiers returned 1 because their report comparisons assumed
untruncated messages and identical title separators. The same-run complete
diff and structured case records resolve those metadata mismatches.
The original verifier exits remain 1; separate metadata checks return 0.
No test ran again for those checks.

| Check | Command | Exit | Checkpoint head / tree | Output SHA-256 |
|---|---|---|---|---|
| Security owner and 14 compiler contexts | `python3 /private/tmp/artroom-r3-focused-20261109.py` | 0 for each | `fcd53eed / f2b10f8a` | `15dce2fe0d740a7bfcb0eead94aa31703a9a70c21eb184edc241ace50963075c` |
| First Native run: 44 passed, 1 failed; incomplete | `same first focused command` | 1 | `fcd53eed / f2b10f8a` | `cc28b08b04e156e4b7b6a8c69abd6c1db5eb5acec368b5bcd8a398207a9f9eb2` |
| Creation correction: affected compiler and six complete owners, 32 passed | `python3 /private/tmp/artroom-r3-creation-followup-20261109.py` | 0 | `39c6264c / bc3dcf55` | `cf35b2f34d3f8aedc2a21e654fb0448df61c4acf8f1cdc5d77b45dc28202d867` |
| Early refusal control: one intended assertion failure | `python3 /private/tmp/artroom-r3-control-20261109.py /private/tmp/artroom-r3-early-authority-control-20261109.task.json` | owner 1; verifier 1; metadata 0 | `39c6264c / bc3dcf55` | `36c5720b8dec5192db90885eaf4fde87f9a7eb8c1191ee881f23dc1f69228231` |
| Alarm drain control: one intended assertion failure | `python3 /private/tmp/artroom-r3-control-20261109-v2.py /private/tmp/artroom-r3-alarm-drain-control-20261109.v2.task.json` | owner 1; verifier 0 | `39c6264c / bc3dcf55` | `586db0887430f7d24c8a7fc947f1f9a129ed415169cc5dfaab5f4ae735905411` |
| Key bound control: five pass, one intended assertion failure | `python3 /private/tmp/artroom-r3-control-20261109-v2.py /private/tmp/artroom-r3-key-bound-control-20261109.v2.task.json` | owner 1; verifier 1; metadata 0 | `39c6264c / bc3dcf55` | `7c5561ba8858c151cadc144dbee2f009806a217330df82a3d28328d36378f6d9` |
| Final gate: 5,340 pass, 12 fail, 3 skip | `npm run gate` | 1 | `22b5f36f / 8ffde09a` | `526878104bee7a9daa9fc3720146b3b5ca84f64bc29d5df7b10de728906b3614` |

Each pipeline records its own monotonic duration and command timing.
Those measurements include source guards and report work where the driver
states that scope. Summed command or case times are not one measured gate.
The runners keep their original pools, workers and deadlines. The owned
physical dependency view has 14 workspaces and 48 source export bindings.
The final gate ran once at `22b5f36f` / `8ffde09a` and failed with exit 1.
The [failed-gate manifest](evidence/2026-11-09-r3-failed-gate.manifest.json)
seals 16 public files and retains 2,400 private originals. Actual
`gate.exit` contains `exit 1`; it was read before analysis and sealing.
Node passed 144, Counting 56 and Plain 4,028 with one skip. Native recorded
1,112 passes, 12 failures and two skips. The twelve failures belong to
`hosted.scope.test.ts`, `manifest-tree.scope.test.ts`,
`signed-read-standing.scope.test.ts`, `hold.scope.test.ts`,
`device-command-install.test.ts` and the ordered `lending.test.ts` owner.
All 1,126 Native case identities have final states. The summary still calls
the failed Native phase partial; its terminal record reports no interruption.
No report error or unhandled error occurred. Scale stayed omitted under
the unchanged fifteen-path selector.

The gate kept every tracked source byte fixed and closed its owned process
group. The driver measured 1,000.142 seconds from launch through its receipt.
This remains a failed gate. Planner ruling `3da1f865` authorizes the eight-path
repair and one unchanged gate at the repaired head. The proposed limited
pipeline will not run. Only the six failing Native owners, the CLI cleanup
wording and its owner change; every original assertion remains.

The hold and reservation witnesses now show that a due request leaves the
head fixed before an actual alarm records expiry. The recovery-key witness
ends each earlier invitation by the Membership alarm, beginning at round 2,
when a prior invitation is due. It also shows that the alarm's unsigned
entry cannot renew the key's signed-read window. Hosted-agent and Lending
stories run the Membership alarm after their existing clock jumps. Every
new alarm invocation asserts the runner's `true` result: production had to
schedule that alarm. A missing due alarm is a production defect, not a
reason to call the handler directly or weaken the check.

The device probes now state R3's refusal precedence: an already failed
ordinary grant returns `unauthorized` before a withdrawn release can return
`application-revoked`. The original release-refusal assertion remains, with
a valid `command` grant for that probe. The witness then removes the grant
and restarts again before the original reserved-answer settlement, which
still needs only current identity and retains its Membership-only authority.
The CLI now says expired cleanup waits for the next alarm.

The repaired gate has not run. If it fails, ruling `3da1f865` requires a
report before any further change. The original failure and its manifest
remain intact.

## Open limits

Request `03e5f6d7` still owns the repaired gate, independent review and landing.
The planner owns deployment after landing. These Native witnesses use
labelled scripted Membership, admission and provider boundaries. They
establish no live provider effect or hosted-room acceptance.
