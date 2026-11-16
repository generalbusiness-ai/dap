# Keep card controls in place across a render

An MCP card renders again after each read, and the Grow card reads every
2000 ms. Before CB-2, each render removed the whole card tree and built a
new one. A member who pressed a button during a render lost the press: the
browser sends the click to the element under the pointer at both mousedown
and mouseup, and the old button was no longer in the document.

CB-2 keeps each unchanged element in place and changes only what differs.
The button under a held press stays the same element, so the native click
arrives.

## The reconciler

`packages/mcp/browser/reconcile.ts` replaces `root.replaceChildren()` in
`main.ts`. `reconcile(root, desired)` compares the live tree with the next
tree, child by child:

- A live child matches a wanted child when both carry the same key, or when
  neither has a key and both have the same tag and `class`. A matched
  element keeps its identity. The reconciler copies the wanted attributes
  and text onto it, then reconciles its children.
- A wanted child with no match enters as a new element. A live child that no
  wanted child matches leaves the document, and its control state ends.
- The reconciler builds the complete plan before it changes the live tree.
  If the next tree reorders matched elements, the plan throws, and the live
  tree stays as it was. No path removes an element and inserts it again.
- A surface that the card holds open, such as an embedded host, stays in
  its parent. The plan throws if the next tree moves it to another parent.

## The gesture binding

Each button and link binds its action through `bindControl`. The press
captures the action when it starts:

- A pointer press captures it at `pointerdown`. The click then runs that
  captured action, even when a render has updated the button since.
- An Enter or Space press captures it at the first `keydown`. Key repeats do
  not capture again. A blur cancels the key gesture, and a later assistive
  click uses the current action.
- A press on a disabled button captures nothing.

The captured action checks the card before it sends anything. If the card
changed during the press, the action sends no message and shows "The card
changed during this press, so nothing was sent. Check the card, then press
again."

## Messages for an earlier revision

`docs/mcp.md` now states what a host does with a card message that names an
earlier revision. The host keeps that revision as the message's subject. It
does not treat the message as the latest revision or as authorization.
Before a typed submission, the host reads the current card and states any
difference. The typed-submission guard still refuses a stale revision
before signing.

## Evidence

- `packages/mcp/browser/bridge.test.ts` passes 11 of 11, with the new
  held-key case.
- The Grow routing browser witness
  (`packages/mcp/test/grow-routing-browser.mjs`) holds a native press on
  "Report in chat" through two background reads, at widths 320 and 592. It
  asserts one click, no removal of the button or an ancestor, and the same
  element before and after.
- The control: `reconcile(root, desired)` changed to
  `root.replaceChildren(); reconcile(root, desired);`, with the card
  resources built again. The witness then fails at "The original Report
  button receives the native click after two refreshes". The sources were
  restored byte for byte afterwards.
- Pins pass. The presentation IDs of Lending and Counter do not change.

## A race in the witness

The first witness runs failed 5 of 9 times at the click assertion. In each
failure the button stayed in the document, and it received `pointerup` and
`mouseup` but no `pointerdown` or `mousedown`. Every read sets
`disabled = busy` on every control (`main.ts`, since 2026-10-17). The
witness had pressed while a background read ran, so the press missed the
disabled button.

The witness now starts the press just after a read ends, and it asserts
that the press reached the enabled button before the two reads. After that
change, the click assertion passed in both runs that reached it. A third
run failed earlier, in `layout()` (see Limits).

## Limits

- A press that starts while a read runs still misses the button, with no
  notice to the member. CB-2 does not change that. The planner decides
  whether controls stay enabled during a background read.
- One witness run failed earlier, in `layout()`, which reads the card's
  width right after the viewport changes. That code is on main and CB-2
  does not change it.
