# Make the witness wait for asynchronous page state

NF-7 run 5 (END `d339333d`) failed one check: after Check, the witness read
the Counter's custody record as `unknown`. The cause was in the witness, not
the Counter.

## Cause

`apps/room/page/test/custody-witness.mjs` waited for an accepted record with
`page.waitForFunction` and a predicate that read IndexedDB and returned a
Promise. Playwright treats a returned Promise as a truthy value and resolves at
once, even when the Promise yields `false`. With playwright-core 1.63.0, a
Promise of `false` resolved after 30 ms
(`artroom-evidence/2026-11-17-nf7-run5-diagnosis/probe-output.txt`).

Run 5 took 17 seconds in all, so the wait never ran to its 30-second timeout.
The witness read custody and took its screenshot right after the click, before
Check could settle the record. The room's journal held the participate act
under the key, with signed bytes equal to custody.

The local lock-queue cases used the same pattern with
`navigator.locks.query().then(…)`, so those checks also went on without
waiting for the queued lock.

## The change

`apps/room/page/test/witness-poll.mjs` exports `pollUntil(read, holds, { what,
timeout, interval })`:

- It awaits each read, then judges the value.
- It returns the first value that holds.
- After the timeout, it throws an error that names what it waited for.
- A read that throws ends the wait with that error.

The witness uses `pollUntil` in three places:

- After Check, it waits up to 60 seconds for an accepted Counter record. The
  read is `records()`, which the witness already uses for custody.
- In each of the two lock-queue cases, it waits for the queued admission lock
  through `page.evaluate`.

The remaining `waitForFunction` calls in the witness have synchronous
predicates.

## Tests

`apps/room/page/test/witness-poll.test.mjs` covers the three behaviors: a read
that resolves `false` does not satisfy the wait, the wait returns the first
value that holds, and a read that throws ends the wait. The named red runs
these tests against a poll that judges the unawaited read, as Playwright does.
Two of the three fail.

The local witness ran with these witness files and passed every check,
including the seven multi-tab cases
(`artroom-evidence/2026-11-17-nf11-local-witness/`).

NF-7 run 6 ran the hosted half from this head against `counter.inguz.space`
item 20 (END `e2cf6f13`) and passed. After the reload, Check settled the
record as accepted, with no second POST. The journal holds one act under the
key, and its signed bytes equal custody
(`artroom-evidence/2026-11-17-nf7-counter-witness-run6/`).
