# O2 live-target retry cutoff

Planner ruling `876695ba` places the cutoff in the
platform dispatcher. A recorded sender uses its authored timed rule and
the existing `delivery-unavailable` finding. Replay judges the same
diagnosis from its attempt log. An authentic late result remains eligible.

## Authored binding and target proof

The recognizer reads the pinned opening act and checks its accepted
origin entry. The supported form has one unconditional tell at ordinal
zero. The tell and a fixed scope slot use the same typed field, and one
fixed time slot uses a typed opening field. Exactly one rule for that
type and deadline applies to the opened item's resulting state. The
origin effect, item ID, full destination, request ordinal, and due point
must agree. Ambiguity keeps the ordinary dispatch schedule.

After a real retry, the dispatcher can ask for proof of that exact
target. The internal native read reaches only a known scope and checks
its applied genesis and active pin in one bounded capture. The caller
reads the birth against the full target reference. A positive declaration
level lets the dispatcher use the cutoff. A missing reply, unsupported
peer, or recorded pin keeps ordinary dispatch. The proof describes the
immutable declaration pin. It reads no live application state.

## Timed transition and diagnosis

The sender's timed transaction checks the recognized origin, exact
pending send, rule, item, and due point. It stores a private receipt of
the sealed timed entry in that same transaction. Receipt storage is
created lazily by an eligible sender. Acknowledgment, result, diagnosis,
or removal releases the receipt. It is outside the journal and replay.

Once the exact-target proof succeeds and a real retry exists, the next
dispatch wakes by the authored deadline. The sender can drain the normal
timer when the deadline arrives. If a wake update crosses the cutoff,
the dispatcher checks again before logging or starting another attempt.
An already committed receipt still establishes the local cutoff after
clock rollback. An attempt already in flight can complete. The diagnosis
turn rechecks the current outbox row and judges the real log through
`judgeDiagnosis`. If the item moved and produced no matching timed
receipt, the request keeps its ordinary schedule.

## Source correspondence

The O2 source commit is `5d265ee80fc0587313779b260c9d5f534a480fd4`.
It carries the same code and tests as the earlier integrated focused run.
Commit `f4450a11b802433193be186cf525496e736113f2` corrects the
live-level status sentence in [Kernel section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel).
The following metadata commit refreshes Effects correspondence from
that exact source.

The covered Operations owner matches the previous reviewed source
byte for byte. `SqliteStore.markSent` also matches. The new cutoff
receipt uses separate SQLite storage. Recovery still reads the
durable sent mark. A first dispatch still follows its durable mark
and readback. The reply path still waits for judgment.

At clean head `abbc80da04ff2fbcdf9bef8268a5f6c2075f2d7a`,
tree `10b114ba6333ce523d794eafabae0a9f72f46b85`, the Effects
check exited 0 in 9.13 seconds and T19 passed. TLC reported 13
generated states, seven distinct states and depth four. The statechart
check exited 0 in 1.52 seconds and recorded seven states and 12
steps. It checked `AtMostOneSend`, `MarkBeforeEffect` and
`NoDeadlock`. The five-state chart omits two same-label steps and
two transitions hidden by its view. The model covers one attempt
and arbitrary restart. Provider retries, fairness and eventual
completion remain outside its scope.

## Evidence

The baseline recorded repeated retry through 63 seconds and left the
receiver's journal equal to its creation entries. Its fixture did not
author a cutoff. The new scheduler witness receives a real retry from
an active live scope. Its controlled proof port and clock exercise
interruption after the timed commit, eviction, clock rollback, and an
alarm update that reaches the cutoff before transport starts. Separate
native proof tests verify the actual target capture and that it leaves
stored rows and the alarm equal. The filtered floor witness records a
late authentic result through the existing diagnosis path.

The focused integration ran at `8fc6ce3a87c2912725d79369b5e555bacf6ba96e`,
tree `3a01c291217b678e957f782148516f793b1e80d8`. The O2 patch kept
its source bytes when carried onto landed LV5. The formal and gate
head carries the kernel sentence and reviewed Effects metadata as
separate commits. Logs are under
`~/play/artroom-evidence/2026-11-21-o2-on-lv5-gate/`.

| Check | Command | Exit and result | Log | SHA-256 |
|---|---|---|---|---|
| Recognizer, target proof, receipt and scheduler | Scope Vitest for authored-cutoff-native, authored-cutoff, live-cutoff-receipt and native-live-target | 0, 13 passed | `integrated-focused/o2-four.log` | `8783d80e1dc82b72c41d6924a68de2a7dd41e3d981eb5b0882ec5882163be3c4` |
| Scope types | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `integrated-focused/scope-types.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| Native late result | Scope Vitest, `test/floor-requests.test.ts -t 'legitimate late result'` | 0, 1 passed | `integrated-focused/late-result.log` | `82a34acb027fb0473d0b239e23b9ea45269b3280427d523f206fe939f3b70f54` |
| Security inventory | `node --test scripts/security-entry-points.test.mjs` | 0, 13 passed | `integrated-focused/entry-points.log` | `484b019c5c58fb5d4db70096e134ef4cf73e1d2fce133d8530389f562f04dfaa` |
| Effects model and T19 | `node verification/state-machines/check.mjs Effects` | 0, seven distinct states and 1 native case passed | `effects-check.log` | `864356fd20c56d1912897e071aad962c672dd3b2fad8b44defd11e5f3351da0a` |
| Effects statechart | `statechart Effects.tla --config Effects.cfg --view view.mjs --out chart` | 0, all three rules hold | `statechart.log` | `5709f660c87ab42df68617e1f16f6b8cb9033187812bbcf30aeed62fa33a62f6` |
| Effects report | Same statechart invocation | 0 | `chart/report.md` | `c78cbb151c613d5001721f615e9642161a54691486e96eef8bb9f6c0c0ed8ad7` |
| Effects diagram | Same statechart invocation | 0 | `chart/chart.mmd` | `304ab93ded45fbab7aa9e4079798aa9fcbde78e30345e3d51627bef6f82c117a` |

| Full gate | `npm run gate` | 0, 1,401.57 s wall | `gate.txt` | `341366b8dc0f7639fc9569f69256dd164ecb1c6e46fa735a0f6f3ee5fbf038b2` |

The gate ran once at the clean Effects head above. It measured wall
time with `/usr/bin/time -p`. It selected nine scale modules for the
moved scope paths against fetched `origin/main` at
`cfcfb7c93b2c8b1d6ef037535d61d548ea6aac4f`. The kernel check,
246 Node cases and 58 counting cases passed. The plain suite passed
5,074 cases and skipped one. The native suite passed 1,243 cases
and skipped two. Native timeout crossings were zero lost, four
stale and zero unowned. GATE START `719e19f1` and END `e52d3fc0`
record the run. The review head adds only this evidence to the
note. Source and test files match the gated head.

## Limits

The cutoff applies only to the supported authored binding after an
actual retry and a committed timed rule. The proof tests exercise
native capture. The scheduler witness supplies its clock and proof
port. An unsupported or unproven live target keeps ordinary retry
behavior. The formal model checks the durable dispatch order for one
attempt and does not cover the cutoff policy. Deployment and hosted
readback belong to the planner.
