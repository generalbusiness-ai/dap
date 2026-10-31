# Reach every lane through since and needs_you

Status: source implementation. The gate passed at `1f220d10`. No Worker runs this code yet.

Request `ca74f78b02437337ee11f989f7c09e1e3cfcd601` and promise `04996c9877bd69fd490cf0d517f1d22c88fbd99a` own this head.

## What changed

A person with more than six lanes can now reach every lane, and mark what they saw, without the same lanes staying omitted.

- **Cursor.** `since` and `needs_you` take `after`, a lane. Each answer gives `next`, the last lane of its window, or null at the last window. `apps/views/src/reads.ts` selects the lanes after the cursor in the existing stable order, and `apps/views/src/repo-in-ai.ts` carries it. A call refuses a bad cursor with `after-selector`.
- **Omitted.** Each answer still lists the lanes it left out, and the list holds every lane outside the window.
- **Card.** The Decision card opens at `next` as its `scope`, in `apps/views/src/decision.ts`, through `listsAfterScope` in `packages/mcp/src/views/`. Its text says how many lanes are left. A mark covers only the displayed heads, and the card offers it only when nothing in the window is unread or omitted.
- **Clock statement.** `docs/mcp.md` and `apps/views/README.md` now say that a lagging scope clock can let the same signed act land at the check, bound by its signed revisions. The planner asked for this in `a6ffd787`, and S6 landed without it.

## Decisions

- **A stateless cursor, not a mark that moves the selection.** `needs_you` has no mark, so a mark-moved selection could not serve it. A mark-moved selection also stalls on a window with nothing to mark. The planner accepted the cursor in `2745582c`.
- **`work` keeps the first window.** `work` takes no cursor. Its card says it reads only the first lanes and offers no scope, and its tool answer has no `next`. Checker report `a6787cf0` found the card offering a scope that it then refused, and this head repairs that.
- **The mark selects no lane.** `markReviewed` reads each captured head again, so the capture's own lanes can be the window it displayed. It refuses `outside-room` for a lane outside the room and `head-changed` for a moved head.

## Evidence

The checkpoint is `1f220d105d36315b7f0144b7837ef8827de7e06d`, tree `1ce92ac605d9e610b0d6cb8abbb78374cd15a506`, and it includes main `074255e8`. Raw evidence is in `~/play/artroom-evidence/2026-10-31-omitted-lanes-repair/`, `SHA256SUMS` `92fd2a8c1b8fd3d443df4dd38dabe8f4d9a11760c40f1f5cca0f868e29360f28`. The reviewed head adds only this note and its manifest, so the source and tests are the tree above. The sealed directory `2026-10-31-omitted-lanes` keeps the gate at `3f85721e`, before the repair.

The case is `nine lanes: repeated calls reach every lane, each call says what it left out, and a mark leaves other lanes unreviewed`, in `apps/views/test/s4.test.mjs`. The controls ran at `dd41e4e6`. One later commit gives the second mark's assertion a message, and C4 ran again at that commit, `1f220d10`, so its log names the assertion.

| Done-when item | Controls |
|---|---|
| With nine lanes, repeated calls reach all nine | C1, C6 |
| A mark leaves the lanes it did not display unreviewed | C2, C4, C5 |
| A call says what it left out | C3 |
| The card reaches the next window | C7 |
| The Work list names its omission and offers no scope | C8, C9 |
| A second mark keeps the first window's marks | C10 |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `1fee25bac725f698` |
| Earlier gate at the same head | `npm run gate` | 1 | `72780ba976affb0e` |
| C1, cursor ignored | `node scripts/control.mjs` | 0 | `bac8ba7cc8755692` |
| C2, card offers a mark on `complete` alone | `node scripts/control.mjs` | 0 | `3b8201171f8c230a` |
| C3, omitted lists only following lanes | `node scripts/control.mjs` | 0 | `b83e955d1be9fc83` |
| C4, mark selects the first window | `node scripts/control.mjs` | 0 | `deac9b3ebaa022f8` |
| C5, capture outside the room | `node scripts/control.mjs` | 0 | `8499e17782e07699` |
| C6, `next` always null | `node scripts/control.mjs` | 0 | `5b2359146fe73dfb` |
| C7, session refuses the scope | `node scripts/control.mjs` | 0 | `9f312332b0597d97` |
| C8, Work list offers a scope | `node scripts/control.mjs` | 0 | `77d83fb76b6bcf2b` |
| C9, Work answer has `next` | `node scripts/control.mjs` | 0 | `e996f3d1c6fc1334` |
| C10, a second mark drops the first | `node scripts/control.mjs` | 0 | `257c3bfe1839ebba` |

The gate reports 3218 plain and 900 native tests, 99 Node and 56 Counting.

## Open limits

- **One unexplained gate failure.** The first gate at this head exited 1. All 900 native cases that ran passed, with 2 skipped, and Vitest reported one unhandled `EnvironmentTeardownError` that it attributed to `packages/mcp/test/lending.scope.test.ts`. Two focused runs of that file passed with no error, and the later gate at the same head passed. This head does not change that file. Other work was running on the machine. The cause is not established.
- **Marks.** The store holds at most 64 marks, so a room over 62 lanes reaches `full`. No open request holds this. The planner files one if a real room nears that size.
- **A moving room.** A null `next` ends the walk. A lane that opens behind the cursor stays in `omittedScopes` and appears on the next walk from the start. The docs say so, and no test covers it.
- **Rows beyond a window.** The cursor moves by lanes. In `needs_you`, a window over 50 rows or over the byte limit counts `omittedRows`, and no call reaches those rows. A `rows-output-limit` error reaches the card as `unavailable`, with no route to `next`. Checker report `a6787cf0` names this, it predates this head, and no open request holds it.
- **Live.** No Worker or real room has run this.
