# LV3: the live reads and the watch

Status: in progress. Head LV3 of the [live level note](../2026-11-10-live-level.md),
on branch `builder/lv3-on-lv2-20261121`, based on the LV2 landing
`c20e5315`.

LV3 lets a viewer read the state of an active live scope and watch it
change. The idle measurement records what pinned local workerd did with
an open watch. The whole-state byte bound remains open.

## What changed, and where

| Part | Where | What it does |
|---|---|---|
| The read and watch shapes | `packages/platform/src/live.ts` | `LiveRead`, `LiveSummary`, `LiveLine` and `LiveReadRefusal`, beside LV2's `LiveAnswer`. `packages/platform` exports them. |
| The draft item bound | `packages/platform/src/live.ts`, `liveBytes` and `LIVE_BYTES`, and `packages/scope/src/live.ts`, `HeldState` | See [the O1 item bound](#o1-the-draft-item-bound). |
| The live reads | `packages/scope/src/live-reads.ts`, `LiveReads` | The summary, the final items of one type, and the watch's line, over LV2's `LiveTurns.current()`. |
| One summary and one page for both families | `packages/scope/src/reads.ts`, `summaryOf` and `finalPage` | The summary of the record and the live summary run the same function over a `StateView`: the store for the record, the state in memory for live state. The same holds for the page of final items. |
| The watch | `packages/scope/src/sessions.ts`, `Streams` | A stream now sends a `Line`: a function that gives the line and a key that changes when the line does. The head stream's line is `{ at: head }`, as before. The watch's line is `{ generation, tick }`. |
| The RPC calls | `packages/scope/src/object.ts` | `liveSummary(reader)`, `liveItems(reader, type, cursor?)` and `watch(reader)`. The object passes `LiveTurns.onChanged` to `Streams.publish`. |
| The routes | `packages/scope/src/worker.ts` | `GET /v1/scopes/{scope}/live`, `GET /v1/scopes/{scope}/live-items/{type}` and `GET /v1/scopes/{scope}/live-stream`. `Api` gains `liveSummary`, `liveItems` and `watchExchange`. |
| The comment on `Answer` | `packages/contract/src/result.ts` | See [The change to `contract`](#the-change-to-contract). |

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

## O1: the draft item bound

The measurement candidate bounds the canonical bytes of retained items.
It uses

```
liveBytes = sum over the item types of (type.max × entryBytes)
```

`type.max` is the most live items of a type, from the definition.
`entryBytes` is the bound on one entry, 256 KiB in `PROPOSED_BOUNDS`.
The formula scales the draft budget with the definition's item limits.

`HeldState`, in `packages/scope/src/live.ts`, is the `MemoryState` of a
generation. It counts the canonical bytes of every item that it holds,
final items too, because the state keeps them until the generation ends.
Before `LiveTurns` folds an act, it adds the bytes of the act's entry to
the bytes held. If the sum passes `liveBytes`, the act is refused:

```ts
{ answer: "refused", reason: "scope-full", name: "liveBytes", generation, tick }
```

The refusal leaves the live state untouched. The draft uses the entry
length to estimate the change before the fold.

The measurement candidate lets timed rules bypass the item bound so a
full scope can end its open items. Ruling `4266b531` requires a bound on
all state retained for a generation, including accepted intents and the
writes of timed rules. The item bound is an intermediate step.

### The change to `contract`

The comment on `Answer` in `packages/contract/src/result.ts` gave `name` of
a refusal to "a declared guard reason or the exhausted whole-scope budget".
LV3 adds that the budget counts the state that the scope holds: stored
state, and for a live scope its state in memory. This is a change to
`contract`, as open point O1 rules. It changes no type and no value. The
live answer is `LiveAnswer` and not `Answer`, but the reason
`scope-full` and its `name` keep one meaning in both.

## O3: an idle live scope while a watch is open

The local experiment ran on workerd `1.20260815.1`, compatibility date
`2026-08-15`, at head `9c243705c1c43a1a6c34f8198f22e80308f6b004`, tree
`8397861e776e7a18f4a399c0b88fdec19f363690`. The harness opened two equal
`liveForms.level` scopes with no timed rules. It advanced both to tick 1
and opened one watch through the Worker's HTTP service binding. It left
both scopes idle for 155,001 milliseconds before reading them again.

| Scope | Before idle | After idle |
|---|---|---|
| Unwatched | Tick 1 | New generation at tick 0 |
| Watched | Tick 1, watch pending | Same generation at tick 1, watch still pending |

The harness measured the elapsed idle interval inside the probe. The
full command took 159.91 seconds of wall time and exited 0. This observed
one local workerd run. A live definition makes no retention guarantee.

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
| O1: an act that would pass the bound is refused `scope-full`, and a timed rule still runs | "O1: an act that would pass the byte bound ..." |

The stand-ins are the test authority, the scripted clock, the live timer
and the test readers, which allow every read. The session test uses the
real readers port of `sessions.ts`, under a test secret, with a stand-in
membership reference: a creator-less live scope records no membership.
The test of a new generation uses a stand-in live turn, because the host
gives no way to fault the fold on purpose. The O1 test sets `entryBytes`
to 4,096 bytes, so the bound is 20,480 bytes. The existing head-stream
tests in `sessions.test.ts` cover the `Streams` change.

## Evidence

The local probe used the committed measurement candidate. The focused
run covered the reads, live turns, and sessions in that source. A separate
run included the stronger item-byte assertion after timed drain.

| Check | Command | Exit | Output | SHA-256 |
|---|---|---:|---|---|
| Local idle-watch probe | `run.sh <LV3 worktree> <evidence directory> 155000` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-o3/lv3-o3-natural-idle.log` | `1970d861cab6fc4be6cba6ffa0f9edde5a9e5bc389de897fdc40187f9a79a7c5` |
| Local idle-watch result | `run.sh <LV3 worktree> <evidence directory> 155000` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-o3/lv3-o3-natural-idle.json` | `a5130975b5c954e8d3537ddcc0a069a931f2391400c6308a49936653892b380f` |
| Scope reads, turns, and sessions, 21 tests | From `packages/scope`, `../../node_modules/.bin/vitest run --config vitest.worker.config.ts test/live-reads.test.ts test/live-turn.test.ts test/sessions.test.ts` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-measurement-focused/focused-localhost.log` | `8db62cd7b72ec1b07ef71d601a31d21def85fb908130bc82a0056450a7803090` |
| Updated item witness | From `packages/scope`, `../../node_modules/.bin/vitest run --config vitest.worker.config.ts test/live-reads.test.ts` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-measurement-focused/live-reads-drain.log` | `5eefadc15858f0efc7a26d1b08d4ccb871b3aae429ae46f15b86cfebd85c8cb5` |
| Platform types | `npm run typecheck --workspace @generalbusiness/dap-platform` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-measurement-focused/platform-typecheck.log` | `8e1906f22f3ac7a95ff9fe28fb85bb3e0cdc12b3ff75f3f416de9d1c010998f3` |
| Scope types | `npm run typecheck --workspace @generalbusiness/dap-scope` | 0 | `~/play/artroom-evidence/2026-11-21-lv3-measurement-focused/scope-typecheck.log` | `fb2b1b20daea8ec6bdc1bf8b7eceb9b3703b9e4ffe7530b18d9218bb23d34976` |

The O3 evidence directory holds `run.sh`, `natural-idle.test.ts`, and
`vitest.o3.config.ts`. To repeat the experiment, run the retained script
with the measured worktree at the recorded head and a new directory for
the output.

## Open limits

1. **Final items fill a live scope.** The state in memory keeps final
   items until the generation ends, and they count against `liveBytes`. A
   presence scope whose leases open and end fills its bound after about
   `liveBytes` divided by the bytes of one lease, and then refuses every
   act until the object restarts. Proposed: keep this in version 1, since
   a quiet room restarts often (section 3.7 of the live note). A later
   head can drop final items from live state, which changes the counts
   that a live summary shows.
2. **Full retained state.** Ruling `4266b531` requires room for the accepted
   keys, fixed hashes, other retained indexes, and timed writes. The
   measurement candidate still needs that accounting before final review.
3. **The routes.** The note asks for the watch "on the HTTP stream that
   the head stream uses". LV3 reads that as the same `Streams`, the same
   relay and release, and the same bound, on its own path,
   `/live-stream`, so that `/stream` keeps sending only heads of the
   record. Proposed: keep the three `live` paths. Renaming them is
   reversible until LV4's client reads them.
