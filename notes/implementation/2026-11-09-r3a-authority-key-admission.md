# Reserve authority cache places for keys with standing

Request `31f98f33`, promise `cf19eb3a`. Planner ruling `dbf97956`
accepts the design in proposal `849ab1d5`. This branch includes BR14 main
`86179b0c` before validation.

## What changed

`observing` reserves a signer-key place only after a checked Membership
observation grants current standing. Unknown keys and unanswered reads take
no place and keep no signer observation. Once-only grants count because a
sealed entry can retain their highest observed heads. The run answers
`limit` to a new key after 4,096 keys with standing enter it.

An admitted key's observed irreversible denial stays for the run. A
separate FIFO keeps at most 4,096 revoked keys that were never admitted.
Eviction advances a generation. Standing handles and reads that began
before that eviction cannot grant authority. A later miss reads Membership
again. The commit retains its authority, head and clock checks.

`cacheCounts()` returns only the four internal signer-key structure sizes.
It exposes no key, observation or credential and adds no wire route. The
threat model and the authority-port comment describe the changed limit.
No recorded format, definition pin, setting or deployment changes here.

## Decisions

The capacity check and insertion run synchronously after the awaited read.
Two concurrent final-place reads therefore cannot both reserve a place.
Admitted keys retain denial for the whole run. Never-admitted revoked keys
use the FIFO because Membership never reverses retirement or removal.
After eviction, authority relies on a fresh trusted read. Distinct real
revocations can cause eviction and another read. Unknown or unanswered
throwaway keys cannot evict a denial.

The capacity witness includes once-only grants and resolves the two final
arrivals in reverse order. The newcomer witness makes 4,100 scripted
unknown, unanswered or failed reads, then grants a new member standing.
The eviction witness holds an older active answer in flight while a later
revocation leaves the FIFO. These cases exercise the actual authority port
below signature admission. Synthetic key IDs and scripted Membership
answers are stand-ins. The five existing authority cases retain their
assertions, and the focused body also runs the real Membership and early
refusal owners.

The first control wrapper rejected its successful baseline because it
expected the structured reporter's title separator and pending-state word.
The built-in JSON uses space-joined titles and skipped states. No fault ran
in that attempt. Its exit remains 1. The corrected wrapper verifies and
reuses that existing baseline, then runs only the three remaining bodies.
Restoring pre-read admission makes the newcomer receive `limit`. Removing
`generation++` makes the old active answer grant standing. Both fail by
the intended assertion. Every source byte returns to the frozen value.

## Evidence

The focused checks and controls use checkpoint
`de03d2b319c4b0f32908e166bafe6ccdde6262e5`, tree
`4f07930b896bf49c3be667331bb3cd92e15b8a5e`. The next commit adds only this
note and its manifest. Original pools, worker limits and deadlines apply.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| Complete entry-point owner, 12 passed | `node --test --test-reporter=tap scripts/security-entry-points.test.mjs` | 0 | `436154eae4d695b939f676fc80d19eac15cada88e51c9cf5a66a05a06c92439e` |
| Fourteen compiler contexts, then 14 cases in three whole Native owners | `node scripts/focused-check.mjs /private/tmp/artroom-r3a-focused-20261109.plan.json <evidence>/focused` | 0 | `b9ec83bf782cdd76e84de4fb8345178d84592d081f41f4ca2c82355aa7f135b3` |
| First control wrapper, before any fault | `python3 /private/tmp/artroom-r3a-controls-20261109.py` | 1 | `0c6868c2c44f053619cef1cc383e1d530743b574ca192ace9168a9ccf46a86e3` |
| Two precise controls, existing newcomer baseline reused | `python3 /private/tmp/artroom-r3a-controls-continuation-20261109.py` | 0 | `dd24bbfc746c3136c095ce7f3dd906d138c1cc577a0e8f0d8ec1c5d49c96007b` |
| First full gate at `62d33377` | `npm run gate` | 0 | `b34adb7538b1e22cbb8778a192e95ab6eaf25b8a78110f130969dd302869650e` |

The complete Node owner has no skipped or cancelled case. All compiler
commands exited 0. The same-run structured ledger and JSON agree on all
14 Native-pool cases: authority 8, Membership 5 and early refusal 1.
They report no missing, extra, unfinished, retried or repeated case, module
error or unhandled error. Source guards match and process groups closed.
Counts come from those reports. The outer timing file records monotonic
elapsed time and driver and waited-child CPU separately from phase timings.

The [pre-gate manifest](evidence/2026-11-09-r3a-pre-gate.manifest.json)
hashes to `bbe20b50d48de701670ff4ea333ba7ebc02e7b761950d36a5512e0cd9066e256`.
Its 24 public files contain metadata and first assertion lines. Full raw
reports, failure payloads and TEST custody remain in three private,
read-only units. Each has its own SHA256SUMS and inventory. Keep them for
at least 30 days after landing. The public credential scan found no match.
The first wrapper's failed result remains separate from the controls that
distinguish. The full gate follows below.

The first full gate ran at `62d33377ffce1025369b98b483add4e233d03a59`,
tree `6d6b51966de3c51f2696f67cd8ca34a7c4dda8b4`. The actual `gate.exit`
reads `exit 0`. Node passed 144, Counting passed 56, Plain passed 4,028
with one skip, and Native passed 1,126 with two skips: 5,354 passed and
three skipped. All stages and case phases completed, with no failed or
unfinished case, report error or unhandled error. Source stayed fixed and
the process group closed. Python measured 1,106.973570375 seconds elapsed
for the gate. The unchanged seven-path selector omitted Scale.

The [gate manifest](evidence/2026-11-09-r3a-gate.manifest.json) hashes to
`2a2a29fd9c2029193af49b43cb789e75c3be17e3d7fe8084963f542445a3cdfb`.
Its 16 public files contain metadata. The private unit retains 2,421 files,
including its inventory, read-only. The credential scan found no match in
the public packet. All 105 unknown observations are 35 Node file wrappers,
each with one enqueue, dequeue and completion. The wholly skipped Page
recorder has no final duration, so the Scope module-duration sum remains
partial. Its skip stays explicit. The review head changes only this note
and the gate manifest after that gate, with source and tests unchanged.

## Open limits

Request `22b57b9e` owns the separate `Further.read` reusable-observation map.
Planner ruling `19647eda` keeps that map outside R3a. Definitions choose its
rows and per-input limits, while act fields can choose its subjects.
`listedBy` checks a typed member reference and its Membership identity,
without restricting the ID to a fixed list. Directory `open-task` reads
`worker`. Rules `publish` reads `checks[*].checker`, and Rules13 reads
`checkers`. Membership returns a valid unknown-member record for an absent
member, and `Further.read` keeps non-once answers before later guards.
That map still has no run-wide bound in this head. This patch bounds the
four signer-key structures, not every observation cache.

The port witnesses establish no signed Native flood acceptance. The planner
deploys after exact-head review and landing. No live acceptance closes here.
