# LV3: the live reads and the watch

Status: in progress. Child request `f7d79745176c0d278e9e0bed3c5ba7a096dcfde9` of LV3 of the [live level note](../2026-11-10-live-level.md),
on branch `builder/lv3-on-lv2-20261121`, based on the LV2 landing
`c20e5315`.

LV3 lets a viewer read the state of an active live scope and watch it
change. The idle measurement records what pinned local workerd did with
an open watch. The parent LV3 owns the whole-state bound under ruling
`4266b531`.

## What changed, and where

| Part | Where | What it does |
|---|---|---|
| The read and watch shapes | `packages/platform/src/live.ts` | `LiveRead`, `LiveSummary`, `LiveLine` and `LiveReadRefusal`, beside LV2's `LiveAnswer`. `packages/platform` exports them. |
| The live reads | `packages/scope/src/live-reads.ts`, `LiveReads` | The summary, the final items of one type, and the watch's line, over LV2's `LiveTurns.current()`. |
| One summary and one page for both families | `packages/scope/src/reads.ts`, `summaryOf` and `finalPage` | The summary of the record and the live summary run the same function over a `StateView`: the store for the record, the state in memory for live state. The same holds for the page of final items. |
| The watch | `packages/scope/src/sessions.ts`, `Streams` | A stream now sends a `Line`: a function that gives the line and a key that changes when the line does. The head stream's line is `{ at: head }`, as before. The watch's line is `{ generation, tick }`. |
| The RPC calls | `packages/scope/src/object.ts` | `liveSummary(reader)`, `liveItems(reader, type, cursor?)` and `watch(reader)`. The object passes `LiveTurns.onChanged` to `Streams.publish`. |
| The routes | `packages/scope/src/worker.ts` | `GET /v1/scopes/{scope}/live`, `GET /v1/scopes/{scope}/live-items/{type}` and `GET /v1/scopes/{scope}/live-stream`. `Api` gains `liveSummary`, `liveItems` and `watchExchange`. |
| The security inventory | `scripts/security-entry-points.mjs` and `docs/security/entry-points.md` | The three routes use the session gate. Source seals cover the route, object, session, and live-read checks. |

The application gateway's stream route (`nativeStream`) and the client
are unchanged. LV4 owns the client call, the tool and `dap act`.

## The reads

A live scope answers two families of read, and they never mix. The reads
of the record answer the creation entries at the journal's head, and each
names that head in `at`. The live reads answer the state in memory, and
each names the generation and the tick that it shows. A live answer holds
no head, no entry and no fact.

```ts
type LiveRead<T> =
  | { ok: true; generation: string; tick: number; value: T; complete: boolean; next?: Cursor }
  | { ok: false; reason: LiveReadRefusal };

interface LiveSummary {
  scope: ScopeRef;
  definition: Digest;
  items: readonly Item[];   // in no final state, at most each type's `max`, by ID
  counts: readonly (readonly [type: string, state: string, n: number])[];
}
```

- `GET /live` answers `LiveRead<LiveSummary>`. Its items and counts are
  what the summary of the record shows of a state, from the same
  function, `summaryOf`.
- `GET /live-items/{type}` answers `LiveRead<readonly Item[]>`: one page of
  the final items of that type, after `?cursor=`, at most
  `RETAINED_ITEMS_PAGE` items. A cursor holds across the ticks of one
  generation, because an item's ID does not change in it. It names nothing
  after a reset, because live IDs repeat from one generation to the next.

`LiveReadRefusal` holds six reasons of `ReadRefusal`: `forbidden`,
`sessions-unavailable`, `clock-behind`, `not-found`, `unavailable` and
`rate-limited`. The HTTP status of each is the status of the same reason
for a read of the record.

### Who may read

A read session authorizes the live reads as it authorizes the reads of the
record. The live summary needs the read `summary`. The live items need the
read `items`. The watch needs `summary`, as the head stream does.
`LiveReads` asks the readers port first. So a refusal says nothing about
whether the scope is live, and a scope that is not an active live scope
answers `not-found` only to a reader who may read it.

A signed read is refused `forbidden`. A signed read names entries of the
record, and live state has none. The Worker refuses one before it looks
up the object. The object refuses one again.

## The watch

`GET /live-stream` opens the watch. It is a stream of `Streams`, the class
of the head stream, opened with the watch's line in place of the head. So
every rule of the head stream holds for it:

- It sends one line of JSON, `{"generation":"…","tick":n}`, when it opens
  and after each change of live state.
- While one line waits unread, later changes send nothing more. When the
  viewer reads, the stream sends the latest generation and tick. A slow
  viewer sees the latest state and not every step.
- A new generation sends a line too. The key of the line is the
  generation and the tick, so a new generation at the same tick is a new
  line.
- Before every send, the stream checks the session again on the scope's
  clock. A session that has ended closes the stream with no byte.
- The watches and the head streams of one scope share one bound:
  `STREAMS`, 64 in all.
- The route releases the subscription when the viewer goes away, once.

`LiveTurns.onChanged` calls `Streams.publish` after each applied act or
timed rule, and when a fault starts a new generation. The object's
existing `#followed` also publishes after each call. A publish with no new
line sends nothing.

## O3: an idle live scope while a watch is open

The child experiment ran on workerd `1.20260815.1`, compatibility date
`2026-08-15`, at head `a73cf24b661c8622147e4f105ccba08575756740`, tree
`2367c61315f73fc0814cec4ca0996e0a500b0898`. The harness opened two equal
`liveForms.level` scopes with no timed rules. It advanced both to tick 1
and opened one watch through the Worker's HTTP service binding. It left
both scopes idle for 155,002 milliseconds before reading them again.

| Scope | Before idle | After idle |
|---|---|---|
| Unwatched | Tick 1 | New generation at tick 0 |
| Watched | Tick 1, watch pending | Same generation at tick 1, watch still pending |

The harness measured the elapsed idle interval inside the probe. The
full command took 159.86 seconds of wall time and exited 0. The earlier
measurement at `9c243705c1c43a1a6c34f8198f22e80308f6b004` observed the same
transition pattern on its draft item-bound source. Both runs describe
pinned local workerd. The live level makes no watch retention guarantee.

## Wake floor and requests per room per hour

The figures come from the code of this head.

| What | Storage alarms | Timers | Requests to the object |
|---|---|---|---|
| An open watch, no change | 0 | 0 | 0 |
| One change of live state, `w` watches open | 0 | 0 | 0. The publish runs inside the request or the timer firing that made the change. It checks `w` sessions, in memory, and sends at most one line on each watch. |
| One viewer that reads again after each line | 0 | 0 | at most 1 read per line received. A slow viewer receives at most one line per read, so it makes at most `min(changes, its own reads)` reads per hour. |
| Opening and leaving a watch | 0 | 0 | 1 to open, 1 to release |

So the watch adds no wake. For a room with `w` watching viewers and `c`
changes of live state per hour, the watch adds at most `w × c` live reads
per hour and `2w` requests for each time a viewer opens a watch. The lines
travel on the open stream and are no request.

## Witnesses

Every test is in `packages/scope/test/live-reads.test.ts`, on real
SQLite storage and the Worker's routes in workerd.

| Witness | Test |
|---|---|
| Two viewers receive a line for a change | "two viewers receive a line for a change" |
| A slow viewer reads the latest state | "a slow viewer reads the latest state: one line waits, and the changes behind it send nothing more" |
| A read names the generation and the tick | "a read names the generation and the tick, and the reads of the record and of live state never mix" |
| A viewer with no session is refused | "a viewer with no session is refused: the real read sessions authorize the live reads and the watch" |
| A new generation sends a line | "a new generation sends a line, at the same tick" |

The stand-ins are the test authority, the scripted clock, the live timer
and the test readers, which allow every read. The session test uses the
real readers port of `sessions.ts`, under a test secret, with a stand-in
membership reference: a creator-less live scope records no membership.
The test of a new generation uses a stand-in live turn, because the host
gives no way to fault the fold on purpose. The existing head-stream
tests in `sessions.test.ts` cover the `Streams` change.

## Evidence

The first five rows cover the historical measurement candidate. The
remaining rows cover the reads and watch child.

| Check | Command | Exit | Output | SHA-256 |
|---|---|---:|---|---|
| Local idle-watch probe | `run.sh <LV3 worktree> <evidence directory> 155000` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-o3/lv3-o3-natural-idle.log` | `1970d861cab6fc4be6cba6ffa0f9edde5a9e5bc389de897fdc40187f9a79a7c5` |
| Local idle-watch result | `run.sh <LV3 worktree> <evidence directory> 155000` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-o3/lv3-o3-natural-idle.json` | `a5130975b5c954e8d3537ddcc0a069a931f2391400c6308a49936653892b380f` |
| Scope reads, turns, and sessions, 21 tests | From `packages/scope`, `../../node_modules/.bin/vitest run --config vitest.worker.config.ts test/live-reads.test.ts test/live-turn.test.ts test/sessions.test.ts` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-measurement-focused/focused-localhost.log` | `8db62cd7b72ec1b07ef71d601a31d21def85fb908130bc82a0056450a7803090` |
| Platform types | `npm run typecheck --workspace @generalbusiness/dap-platform` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-measurement-focused/platform-typecheck.log` | `8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3` |
| Scope types | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-measurement-focused/scope-typecheck.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| Child reads, turns, and sessions, 20 tests | From `packages/scope`, `../../node_modules/.bin/vitest run --config vitest.worker.config.ts test/live-reads.test.ts test/live-turn.test.ts test/sessions.test.ts` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-reads-gate/focused.log` | `7300d611fd88996c1dbf6e5493447e6b040aff26d492e9aa4b08692e75298925` |
| Child platform types | `npm run typecheck --workspace @generalbusiness/dap-platform` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-reads-gate/platform.log` | `8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3` |
| Child scope types | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-reads-gate/scope.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |
| Child entry-point inventory, 13 tests | `node --test scripts/security-entry-points.test.mjs` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-reads-gate/inventory.log` | `9969387fe3dd0509b4063bc23f8d464cdc7f48f432ec4b8b71288bfcde77628c` |
| Child local idle-watch probe | `run.sh <LV3 worktree> <evidence directory> 155000` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-reads-gate/o3/lv3-o3-natural-idle.log` | `7283231cae215263f4d707f0bc6910cacaea55b6fe4b51d01fb208d51bf4543a` |
| Child local idle-watch result | `run.sh <LV3 worktree> <evidence directory> 155000` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-reads-gate/o3/lv3-o3-natural-idle.json` | `16ecd3637a7d5a62d204f7b965a746d253a060524b63bf78cc0d2ca87c369476` |

The O3 evidence directory holds `run.sh`, `natural-idle.test.ts`, and
`vitest.o3.config.ts`. To repeat the experiment, run the retained script
with the measured worktree at the recorded head and a new directory for
the output.

## Open limits

The parent LV3 owns the whole-state bound under ruling `4266b531`. The
bound must account for accepted keys, retained indexes, and timed writes.

The watch uses the same `Streams`, relay, release, and bound as the head
stream, on `/live-stream`. The `/stream` route keeps sending record heads.
