# Reach every lane through since and needs_you

Status: source implementation. The gate passed at `3f85721e`. No Worker runs this code yet.

Request `ca74f78b02437337ee11f989f7c09e1e3cfcd601` and promise `04996c9877bd69fd490cf0d517f1d22c88fbd99a` own this head.

## What changed

A person with more than six lanes can now reach every lane, and mark what they saw, without the same lanes staying omitted.

- **Cursor.** `since` and `needs_you` take `after`, a lane. Each answer gives `next`, the last lane of its window, or null at the last window. `apps/views/src/reads.ts` selects the lanes after the cursor in the existing stable order, and `apps/views/src/repo-in-ai.ts` carries it. A call refuses a bad cursor with `after-selector`.
- **Omitted.** Each answer still lists the lanes it left out, and the list holds every lane outside the window.
- **Card.** The Decision card opens at `next` as its `scope`, in `apps/views/src/decision.ts`, through `listsAfterScope` in `packages/mcp/src/views/`. Its text says how many lanes are left. A mark covers only the displayed heads, and the card offers it only when nothing in the window is unread or omitted.
- **Clock statement.** `docs/mcp.md` and `apps/views/README.md` now say that a lagging scope clock can let the same signed act land at the check, bound by its signed revisions. The planner asked for this in `a6ffd787`, and S6 landed without it.

## Decisions

- **A stateless cursor, not a mark that moves the selection.** `needs_you` has no mark, so a mark-moved selection could not serve it. A mark-moved selection also stalls on a window with nothing to mark. The planner accepted the cursor in `2745582c`.
- **`work` keeps the first window.** `work` has no list to walk. The docs say so.
- **The mark selects no lane.** `markReviewed` reads each captured head again, so the capture's own lanes can be the window it displayed. It refuses `outside-room` for a lane outside the room and `head-changed` for a moved head.

## Evidence

The checkpoint is `3f85721e3b2c397ae2f913ace78b2494fa72daa0`, tree `2e0a88cb9cba1d8db1e67fa399371dc9021f6226`. Raw evidence is in `~/play/artroom-evidence/2026-10-31-omitted-lanes/`, `SHA256SUMS` `5b3af9a0870be4d4625f749ac3285914e654069953d7abb1cae833286f21e8d4`. The reviewed head adds this note, its manifest, a merge of main `074255e8` and one number in `docs/security/settings.md`. That merge adds hosted loop reads. It touches `docs/mcp.md` on both sides, and this head's other paths on neither. After the merge, I ran the owners once: `apps/views/test/s4.test.mjs`, `decision.test.mjs`, `scripts/security-entry-points.test.mjs` and `security-settings.test.mjs` passed 25 of 25, and `tsc` is clean in `packages/mcp` and `apps/views`. No gate ran after the merge.

The case is `nine lanes: repeated calls reach every lane, each call says what it left out, and a mark leaves other lanes unreviewed`, in `apps/views/test/s4.test.mjs`. The controls ran at `dd87f073`. After that commit, only `docs/mcp.md`, `apps/views/README.md` and a merge of main changed. The merge adds the finding item's paths, and none of them is on this head's list.

| Done-when item | Controls |
|---|---|
| With nine lanes, repeated calls reach all nine | C1, C6 |
| A mark leaves the lanes it did not display unreviewed | C2, C4, C5 |
| A call says what it left out | C3 |
| The card reaches the next window | C7 |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `edbea71b5180f03e` |
| C1, cursor ignored | `node scripts/control.mjs` | 0 | `bac8ba7cc8755692` |
| C2, card offers a mark on `complete` alone | `node scripts/control.mjs` | 0 | `3b8201171f8c230a` |
| C3, omitted lists only following lanes | `node scripts/control.mjs` | 0 | `b83e955d1be9fc83` |
| C4, mark selects the first window | `node scripts/control.mjs` | 0 | `e9f646c44588e765` |
| C5, capture outside the room | `node scripts/control.mjs` | 0 | `21ce974f9181305a` |
| C6, `next` always null | `node scripts/control.mjs` | 0 | `e9f646c44588e765` |
| C7, session refuses the scope | `node scripts/control.mjs` | 0 | `21ce974f9181305a` |

The gate reports 3218 plain and 899 native tests, 99 Node and 56 Counting.

## Open limits

- **Marks.** The store holds at most 64 marks, so a room over 62 lanes reaches `full`. No open request holds this. The planner files one if a real room nears that size.
- **A moving room.** The cursor walks the lanes as each call reads them. A lane that opens behind the cursor appears on the next walk from the start. That follows from the code, and no test covers it.
- **Live.** No Worker or real room has run this.
