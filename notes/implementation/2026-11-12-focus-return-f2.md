# Create-room focus witness reads one page state

Request F-2 (`0f327b6b`) reports one failed Page browser run at `bfc67122`:
the create-room witness threw "Escape did not return focus to the opener."
The fault is in the witness, not in the Page. The Page returns focus to the
opener in the same task that hides the dialog. The witness read focus in two
protocol steps, and a scheduled room redraw can replace the opener between
them.

## What changed

`scripts/demo-captures.ts` checks the focus after Escape with one
`tab.evaluate` call. The call reads `document.activeElement` and requires a
visible `Create room` button outside any dialog. Before this change, the
check was `opener.evaluate((element) => document.activeElement === element)`.

The Page source is unchanged.

## The decisions and why

### When the Page returns focus

Escape on the open dialog fires its `cancel` event. The handler in
`claimDialog` (`apps/room/page/src/main.ts:524`) calls `preventDefault()` and
then `close()`. `close()` (`main.ts:522`) runs these steps in order, in one
task:

1. `releaseDialog(dialog)`
2. `dialog.close()`, which hides the dialog
3. `dialog.remove()`
4. `returnToControl(openerKey)` (`main.ts:239`), which calls `restoreFocus`
   (`apps/room/page/src/focus.ts:24`). `restoreFocus` finds the visible
   control with the opener's `data-focus-key` and calls `focus()` on it
   (`focus.ts:38`).

No `await`, timer or animation frame separates the hide from the focus. The
browser paints no frame in which the dialog is hidden and focus is
elsewhere. A keyboard or screen reader user meets focus on the opener when
the dialog goes away. The Page needs no repair.

### Why the witness failed

After the first room render, the Page draws the room a second time. The
render calls `observeView` (`main.ts:209`) for the directory without a head.
`PageObservation.bind` loads the initial snapshot. Its first `accept`
(`apps/room/page/src/page-observation.ts:90`) finds no head, records one and
calls `binding.changed()`. That callback is `startWorkbench(() => draw())`
(`main.ts:216`). The second draw waits on network reads, so it finishes at a
time that the witness does not control.

Each draw builds new shell elements. `showFor` (`main.ts:137`) replaces the
root's children, so the `Create room` button is a new node after each draw.
`showFor` keeps focus in the same task: `keepFocus` records the focused
control's key, and `restoreFocus` focuses the new control with that key.
Focus stays on an opener at every task boundary.

Playwright's `Locator.evaluate` takes two protocol calls. `_withElement`
first resolves the selector to an element handle (`waitForSelector`, state
`attached`), and then `ElementHandle.evaluate` runs the function. The
playwright-core client `lib/client/locator.js` shows this in `_withElement`
and `evaluate`; this note read version 1.57.0, and the workflow pins 1.63.0.
When the second draw lands between those two calls, the handle points at the
removed button and focus is on its replacement. The comparison is then
false, although the Page is correct.

The push run and the dispatched run at `bfc67122` used the same Page and
the same script. Only the arrival time of the second draw differed. This
account is a reconstruction from source. No run in this head observed it.

### Why the repair is a single page read

The request offers a wait under the existing deadline when the Page cannot
show focus elsewhere. A wait is not needed here. The Page holds focus on an
opener at every task boundary, so one atomic read of the page state is
correct whichever draw is current. One `tab.evaluate` resolves the active
element and tests it in the same page task. The check still runs at once
after the dialog hides, so it asserts the same thing as before: Escape puts
focus on the visible `Create room` opener. The change adds no retry, no
sleep and no wait.

The page-side test identifies the opener as the locator does: a button whose
name is exactly `Create room`, with a layout box. `!active.closest("dialog")`
excludes the dialog's submit button, which has the same text; the Page has
already removed that dialog at this point.

## Final evidence

The [manifest](evidence/2026-11-12-focus-return-f2.manifest.json) lists each
cited file with its bytes and SHA-256. Paths are relative to
`~/play/artroom-evidence`. The gated head is `e3563420`, tree
`8800c4b3018f6a7295f2212b69ffda11fb982706`. It is the witness repair
`0a62e2cb` plus the custody test clock fix, cherry-picked from NF-1 under
ruling `0f1ef8ea`. Main `33836693` now carries that fix.

| Check | Head and command | Exit and result | Output |
| --- | --- | --- | --- |
| Scripts type check | `0a62e2cb`: `node node_modules/typescript/bin/tsc -p scripts/tsconfig.json` | 0 | `2026-11-12-ops2-f2-working/f2-tsc-scripts.exit` |
| Page browser workflow, create-room witness included | `0a62e2cb`: branch push, run 43306959043 | Success. The step "Run the create room witness" runs `scripts/demo-captures.ts --recorded --claim-witness` | `2026-11-12-f2-ci-0a62e2cb/page-job.log` |
| Gate | `e3563420`: `npm run gate` | 0. Node 169 of 169, Counting 56 of 56, Plain 4,545 of 4,546 with 1 skip, Native 1,132 of 1,134 with 2 skips. START `73186e52`, END `0eb72306` | `2026-11-12-f2-gate-e3563420/gate.stdout` |

The Page run stands for `e3563420`: from `0a62e2cb` to `e3563420` only
`packages/mcp/test/sqlite-custody.test.ts` changes, and the Page workflow's
path filter does not include it. The witness ran once in CI and passed. The
failure it repairs was intermittent, so one pass does not show the race is
gone. The source trace above carries that claim.

## Open limits

- No run has observed the second draw landing inside the old two-step read.
  The cause above is a reconstruction from source. Request F-2 (`0f327b6b`)
  owns it.
- A redraw while the opener holds focus replaces the focused node within one
  task. A screen reader can announce the new button again. This head does not
  change that. No request owns it yet.
