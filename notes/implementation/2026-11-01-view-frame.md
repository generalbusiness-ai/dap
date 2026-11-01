# Hold a read's text once in a view_act answer

Status: source implementation. The gate passed at `42c33abf`. No deployed Worker or desktop AI app ran this code. The Worker bundle's bytes change, because `packages/mcp/src/views/session.ts` and `tools.ts` change. No hosted route changes.

Request `7f9de797aebf26d3bb455a5fd3a78e34d0e4a56f` and promise `e93f86a8de35b86afbbdc7bab52d29a8e9fe3ecc` own this head. It comes from the J2 acceptance's run on the real room, reported in `986b0da9`.

## What changed

A read's answer held its text six times, escaped: in the result's `structuredContent`, in the result's own text, in the display, and all three again in the frame's text. By reconstruction from that run, a frame reached about 175 KiB at 40 KiB of text.

- **`packages/mcp/src/views/session.ts`.** `#readExact` returns the read's facts in the result, with no text. The display holds the text. A press still gets commits, truncation and paths in the result.
- **`packages/mcp/src/views/tools.ts`.** `view_read` and `view_act` repeat a display or an answer as text up to 32 KiB. Over that, the text says "The result is in structuredContent", as the service's `ok` does.
- **`packages/mcp/test/view-sessions.test.ts`.** One new test measures a frame at about 40 KiB of text: one copy, and under 44 KiB.

## Decisions

- **The display keeps the text.** The page reads the display. Nothing reads the result's `text`: the page reads only `answer` from a result.
- **32 KiB for the fallback.** `packages/mcp/browser/bridge.ts` parses the text when a host drops `structuredContent`. So an ordinary card keeps its copy, and only a large read gives it up. A frame therefore reaches about 66 KiB by arithmetic, at just under 32 KiB of JSON, and about 44 KiB at the read's bound. 8 KiB would have cut more, and it would have broken ordinary cards on such a host.
- **A failed read keeps its result.** The path for "the card cannot hold this answer" still returns the result with its text. The display holds no text in that case.

## Evidence

The head is `42c33abf6d5eb7403ce3d98aa4e625fedbe8cf0a`, tree `cc91608b`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-view-frame/`, `SHA256SUMS` `8adb8fd9b6291bda4d040e9edbd70168ada204eeedb586f83f457a7c64147460`.

| Check | How taken | Command | Result | Digest |
|---|---|---|---|---|
| Gate | observed run | `npm run gate` | exit 0: 3533 plain and 1013 native tests, 116 Node and 56 Counting | `14f402ff22a4d261` |
| Three controls | observed run, each with `scripts/control.mjs`, source clean afterward | `controls/*.log` hold the output | all 3 exit 0: each restored copy fails the new case | `6fa93ffea52988c5` |
| Focused test | observed run | `npx vitest run --project mcp packages/mcp/test/view-sessions.test.ts` | passed | `a35e8674ccb5f347` |

After the gate, two commits follow. One changes only the source commit's message: its `Promise` trailer lost its prefix and first digit, so I amended it, and tree `cc91608b` stays the same. The other merges main `dea4a192`. That merge adds the card fixture head's files and one more test to `packages/mcp/test/view-sessions.test.ts`, on other lines. It changes no line of this head. I reran that test file, `view-resources.test.ts` and the security seals after the merge, and did not rerun the gate.

The size in the test is a local measure of the result's JSON, and it is not a measure on the wire.

## Open limits

- **A host that drops `structuredContent`.** On such a host, a read over about 32 KiB of JSON gives "The app tool returned no readable card data". The card stays as it was, and the read's credential is spent. MCP Apps passes `structuredContent`, and no run shows what the desktop AI app does. The J2 acceptance owns that.
- **Desktop AI app.** No run shows whether the app takes this answer, at any size. The J2 acceptance `2082efd9` owns that.
- **The landed J2 note says "the answer carries the text twice".** The J2 acceptance's run showed six copies, and this head makes it one. The J2 acceptance's note states the figures.
