# O2 sender settlement after a live receiver asks for retry

Request `a9455de4` asks the sender to settle at its own deadline and stop retrying. The active live receiver still answers `retry` with reason `unavailable` and leaves its stored rows untouched. LV3 and LV5 precede any change to the dispatcher.

The sender has two separate obligations. An authored timed rule can move its item out of a pending state. Only an acknowledgment, a result, or a diagnosis removes an eligible send from automatic dispatch. The existing timed rule grammar cannot do both.

## The three timers have different owners

- `LiveTurns.#arm` in `packages/scope/src/live.ts` schedules the receiver's in-memory timed rules. A reset drops their state and deadlines. Delivery to an active live receiver does not enter this turn.
- The recorded sender's `Turns.#wake` in `packages/scope/src/turn.ts` uses the earliest deadline held by an item. `ScopeObject.alarm` drains that turn before dispatch. `Wakes` in `packages/scope/src/outbox.ts` combines both wake times in one alarm.
- `Dispatcher.#dispatch` uses the configured attempt timeout and schedules the next attempt. The default timeout is 30 seconds. The delay starts at one second and doubles up to 300 seconds. `judgeAct` in `packages/derive/src/judge.ts` checks the signed intent's `notAfter` at admission. Neither clock reading sets an expiry on the resulting send.

The baseline sender is the fixture ticket. Its `ask` opens a `request` item with no deadline slot. It has an `undelivered` clause that moves the item to `failed`. The ticket declares no timed rule. See `packages/derive/test/definition-corpus/fixture-data.ts`, `ticket.items.request`, `ticket.acts.ask`, and `ticket.timed`.

## An authored deadline changes the item and leaves the send due

A sender can define a deadline slot and a timed rule that marks its item `timed-out` or moves it to a final state. `judgeTimed` in `packages/derive/src/judge.ts` checks the selected deadline and applies the declared effects with `sends: []`. The native test “an act at two holds' deadline waits” in `packages/scope/test/turn.test.ts` shows the alarm writing due transitions before the next act. The pending-job test in `packages/derive/test/compose.test.ts` moves a job to `timed-out` at its deadline, preserves room for its later answer, and compares the folded and replayed state.

The outbox has its own state. `SqliteStore.outgoing` in `packages/scope/src/sqlite.ts` selects a due row when `held = 0` and `ack`, `result`, and `diagnosis` are null. Item state does not participate in that query. The fold in `packages/derive/src/fold.ts` changes request rows on a result delivery or diagnosis. A timed input can change an item but has no effect that sets any of those outbox fields. No authored timed rule can stop the current retry loop.

The native composition test “another incarnation records nothing” in `packages/scope/test/compose.test.ts` shows the two diagnosis outcomes. Only routing refusals yield terminal `undelivered` and run the failure clause. A log with an unanswered attempt yields `delivery-unavailable` and leaves the item `asked`. `judgeDiagnosis` in `packages/derive/src/settle.ts` treats a retry in the same way as an unanswered attempt. Either diagnosis removes the row from automatic dispatch. The judge of a later authentic result accepts it after `delivery-unavailable` and answers with the diagnosis after `undelivered`. See `packages/derive/src/delivery.ts` and the scope contract, section 7.4.

## The baseline crosses intent expiry

The reproduction starts from LV2 source `f35d0e4f` plus the retained test-only patch. It uses the real NET scopes and their dispatchers with the shared scripted clock. The patch moves that clock by 1, 2, 4, 8, 16, and 32 seconds after the first attempt. At age 63 seconds, after the intent's 60-second expiry, the test finds seven `retry` attempts, no acknowledgment, no result, and no diagnosis. The receiver's stored rows equal its creation snapshot.

The selected native test passed. Vitest reports one test passed and five skipped. The time file reports 10.20 seconds of wall time. The retained files are under `/Users/hughpyle/play/artroom-evidence/2026-11-21-lv2-o2-baseline/`.

| File | SHA-256 |
| --- | --- |
| `reproduction.patch` | `8ca335dc6d7d7d56b35430078c6c7728ccb10242fdb3d358432b5b6da7bdd52d` |
| `native-repeat-after-intent-expiry.log` | `4a3736865d895d71eb8ac89f0513df61828c3d645b944f22902a46cd6e1613c5` |
| `native-repeat-after-intent-expiry.time` | `ab83a83509c41b2128b28d875e56fc40c2e0f9f43383b49b237e2ce3775fb347` |

## Replay can check the pieces of a live-target proof

The outbox records the full `ScopeRef` in `Outgoing.to`. `routed` in `packages/scope/src/namespace.ts` checks the addressed scope and genesis. It conveys no durability level. The dispatcher records the generic answer `retry`, which recorded receivers can also return.

`admitSequenceGenesis` in `packages/bytes/src/sequence.ts` binds the full reference to its canonical genesis and seed. The seed names the definition by digest. Canonical declaration bytes validated at that digest establish `level: { name: "live", version: 1 }`. A retained fact's `under` names its producer and carries no proof of the declaration or level. The fixture ticket's `ask` retains no target genesis use.

The archive fixture demonstrates both checks. `FixtureArchiveSourcePins` in `packages/scope/src/archive-source-pins.ts` checks the full reference, genesis bytes, and declaration digest. The archive test “missing source or inline policy and a conflicting retained genesis pin” rejects an incomplete or conflicting source. That fixture has no production delivery role.

`Verifier.#identityFrame` in `packages/replay/src/verify.ts` advances a foreign journal through its genesis and checks its pinned definition and exact reference. The diagnosis case calls `judgeDiagnosis` with the recorded attempt log and the sender's own origin. It does not join the target's genesis to its declaration. Replay trusts the sender's account of each attempt and derives the finding from the log. A local item deadline can be replayed as a timed entry. Replay has no evidence that the destination of an ordinary retry is live.

## Decision for the planner

**If O2 requires terminal request settlement, choose a live-only diagnosis backed by the target's immutable pin.** Limit the proof to a `tell` or `relate` addressed to an existing incarnation. A live scope can record creation, so the same argument does not apply to `create`. Require the diagnosis to bind the original send's exact target to checked genesis bytes and its validated live declaration. Retain the evidence for replay and keep the receiver's existing answer. The cutoff needs a specified owner, clock origin, and duration or opt-in field. The sender should make no new attempt at or after that cutoff for a proven-live target. If the evidence is missing, the ordinary retry path applies.

That decision changes what a terminal diagnosis can prove. It needs review under `docs/kernel.md` section 7 for the diagnosis form in `packages/contract/src/entry.ts`, its admission in `packages/bytes/src/records.ts`, and the shared judge in `packages/derive/src/settle.ts`. The scope must retain the proof, and replay must reconstruct it before calling the judge. Existing journals keep the meaning of their original diagnosis. A recorded receiver that gives the same retry remains eligible for ordinary dispatch.

**If O2 only needs to stop automatic retries, approve a narrower sender policy.** At an explicit cutoff for a proven-live target, the sender could use the existing `delivery-unavailable` diagnosis. That keeps the request and its late-result path open. If an application also needs its item to show a timeout, its own timed rule can provide that state independently. This option needs a change to O2's terminal-settlement condition. A generic deadline on every retry would also affect recorded receivers.

Keep the 63-second reproduction as the baseline for either choice. The implementation witness should cross the chosen cutoff on the sender's scripted clock, check the item and outbox separately, and confirm that no later automatic attempt occurs. Use the same `retry/unavailable` response from a recorded receiver as the control. Check the live receiver's rows against its creation snapshot again.
