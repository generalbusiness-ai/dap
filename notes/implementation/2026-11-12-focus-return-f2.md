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

| Check | Command | Exit | Output digest |
| --- | --- | --- | --- |
| Scripts type check | `npx tsc -p scripts/tsconfig.json` | TODO | TODO |
| Create-room witness | `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --claim-witness --out <dir>` with `PLAYWRIGHT_CORE` and `CHROMIUM` set as in `.github/workflows/page-browser.yml` | TODO | TODO |
| Page browser workflow | `.github/workflows/page-browser.yml`, push run at this head | TODO | TODO |

The evidence directory and manifest follow once root runs these checks.

## Open limits

- No run has observed the second draw landing inside the old two-step read.
  The cause above is a reconstruction from source. Request F-2 (`0f327b6b`)
  owns it.
- A redraw while the opener holds focus replaces the focused node within one
  task. A screen reader can announce the new button again. This head does not
  change that. No request owns it yet.
