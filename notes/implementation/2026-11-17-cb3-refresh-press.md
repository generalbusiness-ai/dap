# Keep card controls enabled during a background read

The Grow card reads its view every 2000 ms. Before CB-3, each of those
reads set `busy`, and `busy` disables every control on the card. A member
who pressed a button during a background read pressed a disabled button,
and the card ignored the press with no notice. The planner ruled in
436a613f that controls stay enabled during a background read.

## The change

`packages/mcp/browser/main.ts` now separates two kinds of read:

- **A background read.** The refresh timer starts it through `refresh()`.
  It does not set `busy`, so the controls stay enabled and `aria-busy`
  stays `false`. The card keeps the read's promise in `refreshing`. The
  promise never rejects: `refresh()` shows its own error.
- **A member's read or act.** `read()`, `act()` and `openDeclared()` wait
  for a background read to end, then set `busy` as before. These still
  disable the controls.

A press on a button or on the card title passes through `whenSettled()`.
With no background read, the press runs at once, as before. During a
background read, the press waits for the read to end. It then checks the
card with `currentGesture()`:

- If the read left the card unchanged, the action runs.
- If the read changed the card, the card shows "The card changed during
  this press, so nothing was sent. Check the card, then press again." This
  is the `CHANGED_GESTURE` notice from CB-2.

The timer does not start a background read while `busy` is set or while
another background read runs. It schedules the next interval instead.

A background read clears the last notice when it starts, except the
changed-card notice. CB-4 keeps that notice through background reads,
after the planner's ruling in 7c80ab85. It stays until the member's next
press, read or act. Before CB-4, the next background read cleared it,
about 2 s later on the Grow card.

## Evidence

The Grow routing browser witness, `packages/mcp/test/grow-routing-browser.mjs`,
has two new cases at each width. The fixture host,
`packages/mcp/test/support/views-host.ts`, gets a test-only
`holdRefresh()`. It holds the next background read in the host until the
witness calls `releaseRefresh()`.

1. **Unchanged card.** The witness holds a background read. It asserts
   `aria-busy="false"` and an enabled "Report in chat" button, then clicks
   the button. No chat message goes out while the read is held. After the
   release, the message goes out with the card's revision.
2. **Changed card.** The witness holds a background read and clicks
   "Report in chat". The model then reports the task done. After the
   release, the read shows the empty view, the card shows the
   `CHANGED_GESTURE` notice, and no second chat message goes out.

Results:

- Before the rebase onto LW-1, the witness ran 19 times on this change,
  12 of them at width 320 only. 17 passed. One failed in `layout()`,
  the width race that LW-1 fixes. One failed before the new cases: after
  the click on "Read points", the section stayed closed for 30 s. LW-1's
  third run before CB-2 failed at the same step. Twelve runs with click
  and toggle logging did not reproduce it, so its cause is still open.
- Three controls ran the same witness at width 320 on a temporary
  `main.ts`. Their logs are in `artroom-evidence/2026-11-17-cb3-gate/witness/`.
  - With `main.ts` from main 1e251f11, the witness failed at case 1: "A
    background read leaves the card idle"
    (`control-main-main-ts.log`).
  - Control B treats every card as changed after a background read. It
    failed at case 1, waiting for the second chat message: an unchanged
    card no longer runs the press (`control-b-always-changed.log`).
  - Control C makes `currentGesture()` accept every card. It failed at
    case 2, waiting for the changed-card notice: a changed card no longer
    stops the press (`control-c-gesture-always-current.log`).
- CB-4 adds one step after case 2. The witness waits until the host has
  answered one more background read, then asserts that the changed-card
  notice still shows. With `main.ts` from CB-3 (main 3a0daab0), the step
  fails: "A background read keeps the changed-card notice". Logs are in
  `artroom-evidence/2026-11-17-cb4-gate/witness/`. The host counts its
  answers to background reads in `proof.refreshReplies`.
- `main.ts` runs only in the card page, and no unit test loads it. The
  witness carries these cases. `bridge.test.ts` tests the reconciler and
  the bridge, which CB-3 does not change.

## Limits

- One witness run in 19 lost the click on "Read points" (see Evidence).
  The cause is not known.

- An arrow key during a background read waits for the read, then moves by
  one position from the position before the read. If the read moved the
  card, the move starts from the earlier position.
