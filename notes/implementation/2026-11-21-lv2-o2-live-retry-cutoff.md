# O2 live-target retry cutoff

Status: in progress. Planner ruling `876695ba` places the cutoff in the
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

## Focused evidence

The baseline recorded repeated retry through 63 seconds and left the
receiver's journal equal to its creation entries. Its fixture did not
author a cutoff. The new scheduler witness receives a real retry from
an active live scope. Its controlled proof port and clock exercise
interruption after the timed commit, eviction, clock rollback, and an
alarm update that reaches the cutoff before transport starts. Separate
native proof tests verify the actual target capture and that it leaves
stored rows and the alarm equal. The filtered floor witness records a
late authentic result through the existing diagnosis path.

Logs under `~/play/artroom-evidence/2026-11-21-lv2-o2-focused/`.

| Check | Result | Log | SHA-256 |
|---|---|---|---|
| Recognizer, target proof, receipt, and scheduler | 13 passed | `tests.log` | `a5b0047f9137e46a5acb38ff2be03c4b063793ed43aa63864b923ab0fcad777c` |
| Scope types | exit 0 | `typecheck-final.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| Native late result after floor | 1 passed | `artroom-o2-floor-late-result.log` | `f6755a74cb89bf7ef7795eeeb4ef2150d654933ec287088c38d886bf74dbebfa` |
| Security inventory after Turn seal review | 13 passed | `artroom-o2-security-reseal.log` | `705be89db557a7aab9fdbe64b1882a7ba583b0df362a1dfbfd6d4f75119cac0f` |

The SQLite source changes outside the model's protected `markSent`
method. Its checked method body and the operations owner match the base
bytes. The mapped file hash still needs a correspondence refresh and
the Effects model and source check on the integrated O2 tree. The O2
gate follows the main live heads.
