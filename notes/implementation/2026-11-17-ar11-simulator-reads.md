# The Grow simulator opens one session and reuses its summary

AR-11 (request `ce2d68f0`) takes proposal P1 of the AR-7 trace (`f6882052`).
Each minute, the Grow simulator opened a session for the climate agent and
never used it. It also read the Room summary again after phases that sent
no act.

## The change

`examples/grow/simulator-host.ts` opens only the sensors session. That
session reads the Room and submits every act. Each act carries its own
agent's signature, and the Room checks that key's standing in the
Membership. The climate agent therefore needs no session of its own.
Session issuance (`issueSession` in `packages/scope/src/sessions.ts`) writes
no state, so no record changes.

`examples/grow/simulator-tick.ts` counts the acts the tick sends. A call
to `snapshot()` returns the last snapshot when the tick has sent no act
since that read. Otherwise it reads the summary as before.

Two reads change in a tick that answers no command:

- The read after the owner phase reuses the first snapshot. Its check for
  concurrent tick progress then compares a snapshot with itself. A
  concurrent tick still stops this one: the `observe` act names the root's
  revision from that snapshot, and the Room refuses a stale revision.
- The read before the climate phase reuses the snapshot when no act
  followed it. In a normal minute the `observe` act precedes it, so that
  read stays.

A tick that sends no act reads the summary once. A normal minute saves one
session and one summary read.

## Named reds

`packages/scope/test/grow-demo-tick.test.ts` records each request the
simulator makes, by method and path. The duplicate tick at minute 0 sends
no act. The test now requires one `POST …/sessions` and one summary read
(`GET /v1/scopes/<scope>`) in that tick.

- With the old host and the new tick: 2 sessions. The test fails on the
  session count.
- With the new host and the old tick: 3 summary reads. The test fails on
  the summary count.
- With both changes: the test passes (2 of 2 in the file).

## Release and operator action

The change is host-only. The signed Grow release packet
(`examples/grow/demo/application.dap.json`) and its identifiers in
`examples/grow/demo-release.ts` do not change. The host checks that packet
at start and does not embed its own source in it. The application version
rule therefore needs no new version.

The operator deploys the `dap-grow-simulator` Worker
(`examples/grow/wrangler.jsonc`). No room Worker and no installed
application changes.

## Seal

`scripts/security-entry-points.test.mjs` seals `simulatorHost`. The seal
moves from `25147890` to `d63e3ce4`. The diff adds one comment and removes
one session request. The simulator's `fetch` stays an unconditional 404.

## Baseline

RR-2 landed first, so this head lowers `dap-grow` in
`ops/do-rate-baseline.json` by the saving the reds count: one session and
one summary read a minute.

| Figure           | Before (RR-2)          | After (AR-11)          |
| ---------------- | ---------------------- | ---------------------- |
| Floor            | 32                     | 30                     |
| Limit            | 36                     | 34                     |
| Peaks :10 to :41 | 53, 47, 51, 48, 42, 41 | 51, 45, 49, 46, 40, 39 |

The figures are inference from the per-tick count, not a measured rate.
The rate read after the AR-11 deployment replaces them. This head also
rewraps one paragraph in step 7 of `docs/operate-a-service.md` and one in
the RR-2 note, as the RR-2 review asked.

## Rate

Before: `dap-grow` 32 Durable Object requests a minute (END `5995bf0a`,
20:37 to 20:52Z). The simulator's session goes to the Membership object.
The summary read goes to Room A. Since AR-8 and AR-10, a warm isolate
answers the ScopeIndex question from memory. Expected after (inference): about
30 a minute. AR-7 estimated 6 a minute before the ScopeIndex cache. That
cache already removed the ScopeIndex part of the saving.
