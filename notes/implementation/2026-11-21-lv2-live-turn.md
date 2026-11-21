# LV2: the live turn

Status: current. Head LV2 of the [live level note](../2026-11-10-live-level.md),
on branch `builder/lv2-live-turn-20261121`, based on main `f9ff3958`.

LV2 runs the acts and the timed rules of an active live scope in memory,
with the judges of `derive`, and writes nothing to storage after the
scope's creation. Section 8 of the live note lists what the head owns. This
note says where each part is, which kernel change the judges needed, what
the scope wakes for, and which test witnesses each claim.

## What changed, and where

| Part | Where | What it does |
|---|---|---|
| Runtime admission | `packages/derive/src/capability.ts`, `derivable` | A live definition is derivable. Ruling `a1fe9aaf` kept it non-derivable until this head. A sequenced definition stays non-derivable. |
| The live fold | `packages/derive/src/fold.ts`, `applyLive` and `liveActive` | See [The kernel change](#the-kernel-change-that-the-judges-need). |
| The four answers | `packages/platform/src/live.ts`, `LiveAnswer` | The answer type, outside `packages/contract`. `packages/platform` exports it. |
| The live turn | `packages/scope/src/live.ts`, `LiveTurns` | The generation, the state in memory, the turn of an act, the timed rules and the timer. |
| The live mode | `packages/scope/src/core.ts`, `Scope.live` | Each `Scope` holds one `LiveTurns`. The pinned level selects it: for a scope of another level, `act` answers `unavailable`. |
| The RPC call | `packages/scope/src/object.ts`, `ScopeObject.live` | `live(signed, grants, generation)` answers a `LiveAnswer`. No Worker route calls it yet: LV4 owns the client call and the tool. |
| The seam for LV3 | `packages/scope/src/live.ts`, `liveTurnsOf`, `LiveGeneration` | `instance[liveTurnsOf]()` gives the object's `LiveTurns` inside its isolate. `current()` gives the generation, the tick and a `StateView` of the state in memory. `onChanged` tells a listener the generation and the new tick after each change. |
| The memory timer | `packages/scope/src/ports.ts`, `LiveTimer` and `Ports.liveTimer` | One timer for the earliest deadline. The default is `setTimeout` (`timeoutTimer` in `live.ts`). The test ports replace it with a timer that the test fires. |
| Recorded paths of a live scope | `packages/scope/src/turn.ts`, `core.ts`, `delivery.ts` | After the confirmation, the recorded turn of a live scope seals nothing, drains no timed rule and sets no alarm. `Scope.submit` answers `unavailable`. A new delivery gets `retry` with the reason `unavailable` (O2). |
| `heldBy` | `packages/scope/src/core.ts`, now exported | The recorded act and the live act read the authority port's second phase through one function. |

### The generation and the tick

`LiveTurns` mints a generation of 16 random bytes, as hex, when the object
starts. It builds the state in memory on first use: a `MemoryState` that
folds the stored creation entries with `applyEntry`. That state is the fold
of the genesis and the confirmation, as section 3.1 of the live note
requires. A creator-less live scope has one creation entry, its genesis,
because its genesis makes it active.

The state in memory keeps a head like any folded state. Its `seq` is the
tick. For each applied input, `LiveTurns` builds the entry that the input
would be with `entryOf`, at the current tick and the commit's clock
reading, and hashes it with `entryHash`. `applyLive` folds that entry, and
the entry goes nowhere else. So the judges read `scope.head.seq + 1` as the
ID of an item that an act opens, as they do in a recorded scope, and that
ID is the new tick. `Item.opened` holds the hash of that unsealed entry. It
names no fact, and a live scope sends nothing that could cite it.

### The turn of an act

`LiveTurns.act` follows section 3.3 of the live note, in this order:

1. A scope that is not live answers `unavailable`. A provisional scope
   answers `unavailable` with the reason `scope-provisional`.
2. A generation other than the current one answers `reset` with the
   current generation. Nothing is judged.
3. The signature and the shape are checked.
4. Unless this generation already applied the intent, the authority port
   reads the signer's standing once, and deployment admission
   (`freshActAdmission`) is read, as for a recorded act.
5. In one synchronous section: what is due drains first, and
   `prepareRules` finds the rules that the act's guards meet.
6. The rules are evaluated within `preparationSeconds`. This is the one
   wait.
7. In a second synchronous section: if the tick moved, the act starts
   again from step 5, at most `turnRestarts` times. Otherwise `judgeAct`
   judges the act at the commit's one clock reading, and `applyLive` folds
   a written draft.

A draft that is not canonical, or that is larger than `entryBytes` as an
entry, is refused as the recorded turn refuses it: `unauthorized` or
`bad-field`. A fold that throws leaves the state in memory with part of an
input. `LiveTurns` then drops that state and mints a new generation, and
the act answers `unavailable`.

### Timed rules from memory

Before each act's rules are found, `LiveTurns` applies each due timed rule
with `judgeTimed` and `applyLive`, within `timedAttemptsPerTurn`. Each
applied rule adds one to the tick. After each change, `LiveTurns` sets the
memory timer for the earliest deadline that the state holds. When the
timer fires, `LiveTurns.drain` runs the same drain and sets the timer
again. A deadline that has passed when the timer is set, because the clock
is behind or the budget is spent, is retried after `drainRetrySeconds`. A
reset drops every deadline with the state that held it.

A recorded act does not drain: it answers `busy` while a transition is due,
and the scope's alarm drains. A live act drains first and then applies.
Both orders write the same transitions before the act.

## The kernel change that the judges need

Section 4.1 of the live note asks the head to name each change that a
judge needs to run with no sealed entry. The judges need none: `judgeAct`,
`judgeTimed`, `prepareRules`, `entryOf` and the grant, guard and effect
code run unchanged over a `MemoryState`. The fold needs one change.

- **`applyLive`** in `packages/derive/src/fold.ts`. LV1 made `applyEntry`
  refuse every entry after a live scope's confirmation, so that the runtime
  and replay agree that such a journal is wrong. `applyLive` is the same
  fold without that refusal, behind three checks of its own: the scope is
  live and active (`liveActive`), the input is an act or a timed
  transition, and the entry sends nothing. Otherwise it throws `FoldError`.
  `applyEntry` keeps the refusal, so replay still reports a third entry.
  Both run the one fold body, so a live run and a recorded run of one input
  change state the same way.

`liveActive` is the predicate of that refusal, exported so that the
runtime's recorded paths read the same rule. The change adds no entry kind,
no field type, no capability and no `contract` type. It is kernel because
it is in `fold.ts`. The review of this head is its review.

## The four answers

`LiveAnswer` in `packages/platform/src/live.ts` has the four shapes of
section 3.4 of the live note:

| Answer | Shape | When |
|---|---|---|
| `applied` | `{ answer, generation, tick }` | The act changed live state at `tick`. A repeat of an applied intent in the same generation gets the same tick. |
| `refused` | `{ answer, reason, name?, generation, tick }` | The judge refused the act at `tick`. The reason is a `RefusalReason` of the recorded contract. |
| `reset` | `{ answer, generation }` | The act named another generation. The answer names the current one. |
| `unavailable` | `{ answer, reason }` | The act was not judged now. The reason is an `UnavailableReason`. |

The recorded answer `mismatch` has no live shape. A live act whose key
belongs to another intent of the same signer in this generation answers
`refused` with the reason `bad-intent` and the name `idempotency-mismatch`.
Open question 1 asks the planner to confirm that answer.

## O2: a delivery after the confirmation

An active live scope answers a new delivery `retry`, with the reason
`unavailable`, before it reads the source entry. `retry` is the delivery
answer for "not judged now": the `Delivery` type has no `unavailable`
answer, and LV2 changes no contract type. A repeat of a delivery that the
scope recorded still gets its recorded answer. The live scope's stored rows
do not change.

The planner's ruling also asks for a test that shows the sender's own
deadline settles its request. Under the current dispatcher, no such test
can pass:

- The dispatcher (`packages/scope/src/outbox.ts`) gives a request up only
  when its log holds `routingRefusals` routing refusals (`wrong-genesis` or
  `not-found`). A `retry` answer is no routing refusal.
- So a request that the live scope answers `retry` stays outstanding. The
  dispatcher offers it again after a delay that doubles up to
  `dispatchRetryMaxSeconds` (300 seconds), and no diagnosis is written.
- At that cap, each such request costs the sender 12 alarms an hour and
  the live scope 12 delivery requests an hour, with no end.

The O2 test in `live-turn.test.ts` shows this behavior: four `retry`
attempts, no diagnosis, no result, and no stored change in the live scope.
Open question 5 asks the planner to choose a fix.

## Wake floor and requests per room per hour

The figures come from the code of this head.

| Live scope | Storage alarms | Memory timer firings | Requests to the object |
|---|---|---|---|
| At rest, no deadline held | 0 | 0 | 0 |
| Under timed rules | 0 | 1 at each distinct earliest deadline. A firing applies every rule that is due then. | 0 |
| A deadline that stays due (clock behind, or `timedAttemptsPerTurn` spent) | 0 | at most 3,600 per hour, one each `drainRetrySeconds` (1 second in `PROPOSED_BOUNDS`) | 0 |

- A live scope sets no storage alarm for its timed rules. `Turns.#close`
  skips `#wake` for an active live scope. An alarm that a live scope stored
  before its confirmation fires once, drains nothing and is not set again.
- The memory timer is a `setTimeout` inside the object. A firing is no
  request to the Durable Object, and it writes nothing.
- The host may evict the object while a timer is pending. The timer and the
  state end together, and nothing wakes the object again. Whether a pending
  timer keeps an idle object in memory is not measured here. LV3 owns that
  measurement (open point O3).
- The live acts are the only requests. Each act is one request, with one
  read of the authority port and at most one rule evaluation.

## Witnesses

| Witness | Test |
|---|---|
| One definition and one sequence of acts: the live run and the recorded run reach the same items and states | `packages/scope/test/live-turn.test.ts`, "one definition and one sequence of acts" |
| An applied act, on native storage | `live-turn.test.ts`, "an applied act, a refused stale expected, a reset after eviction, ..." |
| A refused stale `expected` | the same test |
| An act that names an old generation after an eviction, answered `reset` | the same test |
| A repeat of an applied intent after a reset applies again | the same test |
| The stored rows after many live acts equal the stored rows after creation | the same test, and the timed-rule test |
| Timed rules from memory: the timer fires at the deadline, and an act drains what is due first | `live-turn.test.ts`, "a timed rule runs from memory" |
| O2: a delivery after the confirmation is answered `retry` and recorded nothing. The ruled witness, that the sender's own deadline settles the request, does not hold (open question 5) | `live-turn.test.ts`, "O2: an active live scope answers a delivery retry ..." |
| `applyLive` folds an act at the next tick, and refuses a checkpoint and a recorded scope; `applyEntry` keeps the LV1 refusal | `packages/derive/test/forms-live.test.ts`, "applyLive folds a judged act ..." |
| Runtime creation admits live | `packages/scope/test/live-creation.test.ts`. LV1's witness, with the live answer changed to admission, as ruling `a1fe9aaf` asks |
| A live definition is derivable | `forms-live.test.ts`, "LV2 derives a live definition as it derives the recorded one" |

The test ports' `liveTimer` is a stand-in for `setTimeout`. The tests fire
it by hand, so no test waits on the wall clock.

## Open questions

1. **A key that another intent holds.** The live answers have no
   `mismatch`. Proposed: `refused`, reason `bad-intent`, name
   `idempotency-mismatch`. The choice is reversible until a client reads it.
2. **The first generation.** A sender that has read no generation sends any
   value and gets `reset` with the current one. Proposed: keep this, so a
   live act always names a generation and LV3's reads give the usual one.
3. **Detached texts.** The live turn gives the judge no detached texts, so
   an act with a detached text field answers `unavailable`. Retaining the
   bytes would write to storage. Proposed: the validator refuses a detached
   text field in a live definition, in a later kernel head.
4. **A port that keeps a read.** The live turn never calls
   `Standing.sealed`, because no entry is sealed. The production
   observation read (`observing` in `packages/scope/src/authority.ts`)
   notes there which entry last used an observation, so that a later entry
   retains it as `reused`. A live act leaves that note unset. Proposed: no
   change. A live act retains nothing, so no entry needs the note, and each
   live act reads standing again.
5. **O2: what settles the sender's request.** A `retry` answer never ends
   the sender's dispatch (see [O2](#o2-a-delivery-after-the-confirmation)).
   Two fixes are possible. Proposed: the live scope answers a new delivery
   as a routing refusal, `not-found`, so that the sender writes an
   `undelivered` diagnosis after `routingRefusals` attempts, and the send's
   `undelivered` clause settles its item. The other fix gives the
   dispatcher a deadline for a request that only gets `retry`, which
   changes every scope. Until the planner rules, LV2 keeps the ruled
   `retry`. The package check of LV4 refuses such a send before it is made.
