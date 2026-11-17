# The dap-grow baseline uses the rate measured after AR-11

RB-1 (request `dc85567a`) replaces the inferred `dap-grow` figures of AR-11
(floor 30, limit 34) in `ops/do-rate-baseline.json` with the rate that the
planner measured after the AR-11 deployment. The deployment put
`dap-grow-simulator` version `1adb6271` live at 22:29Z on 2026-11-17
(END `c50f3726`).

## The figures

The rule is the one RR-2 used. The floor is the window's mean, rounded. The
limit is the floor plus 4. Each peak is the highest count seen at that
minute of the hour, plus 4.

| Figure | AR-11 (inferred) | RB-1 (measured) | Source                                        |
| ------ | ---------------- | --------------- | --------------------------------------------- |
| Floor  | 30               | 28              | 22:30 to 23:00Z: 834 requests, mean 27.8      |
| Limit  | 34               | 32              | floor plus 4; no minute outside a peak was 33 |
| :10    | 51               | 50              | 46 at 23:10Z                                  |
| :11    | 45               | 46              | 42 at 23:11Z                                  |
| :35    | 49               | 38              | 34 at 22:35Z                                  |
| :36    | 46               | 36              | 32 at 22:36Z                                  |
| :40    | 40               | 34              | 30 at 22:40Z                                  |
| :41    | 39               | 33              | 29 at 22:41Z                                  |

The window of the request, 22:30 to 23:00Z, holds no :10 or :11 minute.
Those two peaks come from one later read, 22:30 to 23:13Z. Every count
outside the six peak minutes was 23 to 32.

## How the counts were read

`node scripts/do-rate.mjs --worker dap-grow` with the analytics read token,
at the times below. The outputs are in
`artroom-evidence/2026-11-17-rb1-rate/`:

- `before-ar11-baseline.txt`: 22:30 to 23:00Z, read at 23:05Z with the
  AR-11 baseline. Total 827, nothing above the baseline.
- `read-2230-2313.txt`: 22:30 to 23:13Z, read at 23:13Z with no baseline.
  It gives the :10 and :11 counts and 834 for the first 30 minutes.
- `window-2230-2300-rb1-baseline.txt` and `after-rb1-baseline.txt`: the
  same two windows with this head's baseline. Neither flags a minute.

The analytics data answers differently from one read to the next. The
22:30 to 23:00Z total read 827 at 23:05Z and 23:16Z, and 834 at 23:13Z. The
count at 22:35Z read 29 and 34. Each figure above takes the highest
count seen, so the peaks and the limit hold for both answers.

## Checks

- `node --test scripts/do-rate.test.mjs`: 13 of 13.
- The tracked file is formatted with the repository's Prettier 3.9.10.
