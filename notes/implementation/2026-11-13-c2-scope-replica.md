# C2: the replica of a declared scope

Request `208a0378` builds step C2 of the client design note
(`notes/2026-11-13-scope-client.md`, sections 6, 9, 11 and 12). Ruling
`b1b1d492`, carry `556eca2b`, the builder's list `dd21b684` and rulings
`7c8774a2` and `b258370c` bind it. C2 holds no custody record and sends
nothing.

## Current pre-gate state

C2 contains landed main `0166423ac8abe7ffe955a9c8ddf1a319cba75712`.
Merge `351a5da0c45137fbfc7c6302c392b81bd9bde1f8`, tree
`1cdf4bd06ea6c8f59a5e70d5f6186c7af2121343`, had no conflict. It adds
main's 40 paths to source checkpoint `5994abd7`. All C2 client source,
owning tests, package metadata, release mapping and lock bytes equal
that checkpoint. The owned dependency view remains unchanged, with lock
SHA-256 `8b2ae5f7108ce36cf84753d99d4248d59cc21251d5e01da3da37a111bb495e20`.
The delta to main has 16 C2 paths. Original branches and evidence remain
intact; the replay kept C2's four original commits and lifecycle repair,
dropping the two old dependency merges.

Three client compiler contexts and 33 cases passed in ordinary DEV at
`5994abd7`. Those results describe that source graph. The main merge did
not rerun them. The two lifecycle controls below ran at `351a5da0` and
restore the source exactly. This follow-up changes this note only.

**The full C2 gate is UNRUN.** Planner ruling `d8f9e590` permits C2 to
take the next gate if it is ready before NF-5. Root grants the execution
slot and START separately. A passing control does not replace that gate.

| Current check | Actual result | Retained output and SHA-256 |
| --- | --- | --- |
| Client neutral, Node and test compiler contexts | Three exits 0 in prior ordinary DEV | `/private/tmp/artroom-c2-ordinary-dev-20261114/client-neutral.log`, `client-node.log`, `client-test.log`; each empty log has `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Whole replica owner | 26 passed in prior ordinary DEV | `/private/tmp/artroom-c2-ordinary-dev-20261114/replica.log`; `44ef30701616490a36653ea66c9caf5cfc65be6219c33484708399c579d10743` |
| Root-entry isolation owner | 1 passed in prior ordinary DEV | `/private/tmp/artroom-c2-ordinary-dev-20261114/scope-entry.log`; `963e1d2b70b70e980e4b064837a8898e3c436301f5e93e16f028708a298ac90b` |
| Whole generated replica owner | 1 passed: all 400 fixed seeds of 80 steps; test body 17.51 s, Vitest total 18.65 s | `/private/tmp/artroom-c2-ordinary-dev-20261114/replica-generated.log`; `8c2c908952332f6f184d844d8be05dda45bdadcd7f1838224d06070493d85340` |
| Whole public-release module owner | 5 passed in prior ordinary DEV | `/private/tmp/artroom-c2-ordinary-dev-20261114/public-release-modules.log`; `2fb32c274687e83df8cf510495e50fde0a5b6b76d8a985d7702a636dc925f0b2` |
| Synchronous observation ownership control | Baseline 26 passed; mutant 25 passed and 1 direct assertion failed; helper exit 0, real 3.12 s | `~/play/artroom-evidence/2026-11-14-c2-lifecycle-gate-attempt1/controls/observation-cancellation/helper.stderr`; `45f30a4f82646e277140c348fc0df048c4be41e8fb426ff89dd117edbeaf9f84` |
| Read-owner handoff control | Baseline 26 passed; mutant 25 passed and 1 direct assertion failed; helper exit 0, real 5.28 s | `~/play/artroom-evidence/2026-11-14-c2-lifecycle-gate-attempt1/controls/read-handoff/helper.stderr`; `d88655ebf92dff3d38f80f3983cbaeb75a4b0bebcf5e6f4a4d0b2ee91cb58f78` |

The generated owner retains its 400-by-80 loop and invariants: after each
step, the replica equals the `MemoryState` fold of the same entries, its
head and rows equal a fresh view, and its current/behind state matches
the feed and held head. Predictions agree with `judgeAct`; close leaves
no observation or timer. The current body duration above comes from the
actual DEV output, not the earlier 18.9-second measurement below.

Each control ran the unchanged whole 26-case `replica.test.ts` owner,
with its exact expected title and no test filter. Omitting only
`if (this.#stopped) observation.cancel()` failed the existing
forbidden-before-Observe-return witness: zero cancellation calls instead
of one. Deferring only `this.#reading = null` to `queueMicrotask` failed
the subscriber next-head witness: cursors `[4]` instead of `[4, 5]`.
The finishing promise settled; the cursor assertion showed the lost
read without a timeout or a new test gate.

Both controls retain all 26 cases, with no skipped or unloaded case and
no timeout. Each ran its baseline and mutant once; neither added a third
restored-green run. Each case directory above contains the actual child
JSON and stdout/stderr under `tmp/artroom-control-*`, original and retained
helper copies, their diff, and before/after source-restoration records.
The external helper changes only successful exit cleanup to retain raw
output. It preserves the CTL1 classifier, runner, deadlines and source
restoration. Source bytes and mode match exactly after both controls, and
the checkout was clean. Checkpoint `5c45c148` records the results.

Compatibility ran once before the controls. It reported `copied: false`
and the same bundle hash before and after, `cd50d18a`; raw output is in
the controls directory. No model, browser, generator or full gate ran in
that interval. Neither wrapper repair belongs to the Observation model.

## The entry

`packages/client/package.json` adds the entry
`@generalbusiness/dap-client/scope` (`src/scope.ts`) and the dependency
`@generalbusiness/dap-derive`. `scripts/public-release.json` names the
entry and the dependency, and `scripts/public-release-modules.test.mjs`
expects the entry. The entry exports `scopeReplica`, `Replica`, `judged`,
`intentMeaning`, `UnheldEntry` and their types. It exports no test seam.

`test/scope-entry.test.ts` follows each relative static import from
`src/index.ts`. It fails when the root entry reaches `scope.ts`,
`replica.ts`, `replica-own.ts` or `replica-judged.ts`.

## The replica

`src/replica.ts` holds the replica.

- `scopeReplica(handle, { observe })` takes the `DeclaredHandle<D>` that
  checked the definition's digest, and a function that opens the
  observation with the replica's `emit`. In a page, `observe` is
  `(emit) => observeScope({ ...options, emit })`.
- The replica validates the definition one time. It reads the journal
  with `ScopeHandle.log`, page by page from the genesis entry, and folds
  each entry with `applyEntry`. A notice of a later head starts a read.
  `read(head)` starts a read for a head that an answer names. Each
  `streaming` state starts a read when the replica lacks a known head
  and no read runs (ruling `aa12ecdd`).
- The state is `starting` until the replica holds the genesis entry. It
  is `current` when the feed streams and the replica holds the latest
  head that the feed or a caller named. It is `behind` in each other
  case. A read that fails keeps it `behind`.
- One fold failure makes the state `folding`. The replica then folds
  again from the genesis entry on a new `MemoryState`. A failure in that
  fold stops it with `fold`.
- The replica stops with `definition` when the definition does not
  validate, or when a page names another definition. It stops with
  `forbidden` when the log or the observation answers `forbidden`, or
  when a page is `filtered`. It stops with `archived` when the log
  answers `archived` or an entry is a `floor` entry. `protocol(reason)`
  stops it for a refusal of class `protocol`. `close()` stops it with
  `close`.
- Each stop cancels the observation. The replica holds no timer.
- A view holds the state, the head, `rows(type)` and `row({ item })`. The
  replica builds the index of rows one time for each view, when the state
  or the head changes. A view does not change after a later fold.
- `signed(seq)` and `accepted(actor, key)` give, for an entry of one
  signer, the fact, the actor, the key, the intent digest, the meaning
  and the item that the entry opened. The meaning is `meaningOf` of the
  intent's `kind`, `on` and `fields`.

## `Own` and its record

`src/replica-own.ts` holds the entry store and its one `Own`, on the
pattern of `floorOwn` (`packages/replay/src/floor.ts:7`) for a journal
with no floor.

- `Own(seq)` answers each held entry and null above the replica's head
  (ruling `7c8774a2`, c).
- For a position that the store lacks below its head, `Own` throws
  `UnheldEntry` and records the throw. `retained` throws `UnheldEntry`
  for each copy, because the replica keeps no retained copy. Its only
  reader in `packages/derive` is the fold of a `floor` entry, and a floor
  stops the replica first.
- `positions` gives each held position, `sizeProofs` gives none and
  `archived` answers null.
- The `Own` object stays the same for the life of the replica, through a
  fold again from the genesis entry.
- The store keeps the parsed entry and its hash. It keeps the bytes of
  no entry. It reads the bytes of the genesis entry one time, to admit
  the sequence.
- `lack(seq)` is the test seam. `seamOf(replica)` in `replica.ts` gives a
  test the store and the state. The package entry exports neither.

After each fold of an entry and each call of the judge, the replica takes
the record. A record that is not empty makes the fold fail, or makes the
prediction `not-judged`, whatever the call returned.

## `Judged`

`judgedOn` in `src/replica-judged.ts` calls `judgeAct` on the replica's
state. It gives the stand-in grant of `predictionGrant`, the replica's
`Own`, `PROPOSED_BOUNDS`, the client's clock, and the sizes of the texts
beside the intent.

| `judgeAct` answers | `Judged` |
|---|---|
| `write` | `write`, with the draft's effects |
| `accepted-before` | `recorded`, with the fact of the held entry |
| `refused`, of class `never` | `never` |
| `refused`, of class `head` or `protocol` | `refused-here`, with the class |
| `unavailable`, `due` or `mismatch` | `not-judged` |
| a throw, with an empty record | the throw goes to the caller |

A throw goes to the author's own call and to no subscriber. It does not
stop the replica or the feed.

## Bundle and memory

esbuild 0.28.1 bundled each entry with `--bundle --format=esm
--platform=browser --minify`.

| Entry | Minified | gzip -9 |
|---|---|---|
| `scope` | 360,833 bytes | 123,212 bytes |
| root (`.`) | 1,082,096 bytes | 311,435 bytes |

`packages/derive` is 294,706 bytes of the `scope` bundle. The root entry
already holds `packages/derive`, through `@generalbusiness/dap-platform`.
So a page that loads both entries loads `derive` one time.

One replica folded 20,000 entries of a lane: one remark each, 36,645,888
bytes of entries. The heap grew as follows, measured after two forced
collections before and after the fold.

| Runtime | Heap of the replica | For each entry | Fold |
|---|---|---|---|
| Node 26.13.1 | 92,738,360 bytes | 4,637 bytes | 0.83 s |
| Headless Chrome 157 | 65,073,016 bytes | 3,254 bytes | 1.04 s |

A page can hold that, so C2 proposes no smaller form. An earlier build
also kept the bytes of each entry: 129,935,120 bytes in Node. The scripts
are in the builder's scratchpad (`c2-memory`). Each run was on battery
power, powermode 0.

## Tests

The earlier C2 checks covered `packages/client/test/replica.test.ts`
(25 cases with `scope-entry.test.ts`):

- Each change of state: `starting` to `current`, `behind` before the feed
  streams, `current` to `behind` and back, `behind` until an answer's
  head, and `folding` to `current`.
- A failed read to a known head retries when the observation reconnects,
  and reaches `current` with no new entry and no caller read.
- Each cause of `stopped`: `close`, `protocol`, `definition`,
  `forbidden`, `archived` and `fold`.
- `close()` with a real `observeScope` under fake timers: no timer
  remains, and the observation emits `cancelled`. A page that arrives
  after `close()` is not folded.
- Typed rows, the entry of one signer, and each case of `Judged`.
- The catch sites of `dd21b684`, item 6: `run` and `unjudged` with a
  `gateRules` guard that reads the lacking entry, one platform catch that
  catches the throw, the direct throw of a local fact field, and the fold
  of an entry whose settlement reads the lacking entry.

`packages/client/test/replica-generated.test.ts` runs the part of the
generated suite that needs no request: 400 fixed seeds of 80 steps, over
the lane with one more act, `cite`. After each step, the replica's state
equals a `MemoryState` that `applyEntry` folds to the replica's head, and
the view equals the view computed again from that state. A prediction of
`cite` gives the same `judgeAct` on the replica as on the scope's state
(ruling `b1b1d492`). The run made 32,000 steps, 10,356 entries, 650
predictions and 1,886 reloads in 18.9 s, on battery power.

## Focused evidence for the reconnect repair

The three client compiler contexts and the whole `replica.test.ts` file
passed at commit `8dba5200c99e0c1ba0b4581fad676b563aa85fbb`, tree
`73dae91de1e13dfe7b49ac981f92aae60a13f367`. The test file passed all 24
cases, including reconnect after a failed read. No timeout occurred.
The commands ran sequentially in the single test slot. The escalated
process recorded Battery Power and `powermode 0` at both ends. The
sandbox's AC Power reading does not describe that run.

The [manifest](evidence/2026-11-13-c2-reconnect.manifest.json) holds the
14 sealed files in
`~/play/artroom-evidence/2026-11-13-c2-reconnect-8dba5200`. Each row below
names the output file and its SHA-256. Compiler commands ran from the
checkout root. The Vitest command ran from `packages/client`.

| Check | Command | Exit | Output and SHA-256 |
|---|---|---|---|
| Client source types | `node node_modules/typescript/bin/tsc -p packages/client/tsconfig.json` | 0 | `tsconfig.json.log`: `b0a4bf0896505585c076e33e7502b51a5e2e488e6cee5d27cebf9f56795f7e26` |
| Client Node types | `node node_modules/typescript/bin/tsc -p packages/client/tsconfig.node.json` | 0 | `tsconfig.node.json.log`: `de3d1a92f879aeb251563c4e5d8c3bcc9cec1d0525ec9774f402079eca5e3b22` |
| Client test types | `node node_modules/typescript/bin/tsc -p packages/client/tsconfig.test.json` | 0 | `tsconfig.test.json.log`: `aaf99757d7206ff4dfacc035019c92d80662116e319c54ada9a7c83a7f518798` |
| Replica behavior | `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts test/replica.test.ts` | 0 | `replica.test.ts.log`: `7c4569849b33b27e9308d0b016dbddd38824a842cb419fc4d777b90a5b49ebdf` |

## Historical lifecycle repair source checkpoint

Ruling `bd699704` assigns both wrapper repairs from audit `2cadf894` to
C2 before integration. Branch `builder/c2-lifecycle-repair-20261114`
starts at published `0bce0973`. It preserves the original C2 branch, its
four own commits and all earlier evidence. No dependency merge or
rebase runs in this checkpoint.

The replica now keeps the returned `Observation` locally until the
factory returns. If a synchronous observation callback already stopped
the replica, it cancels that returned observation. Otherwise it takes
ownership. The stop cause stays unchanged, and later `close()` calls
cannot cancel it again.

The read loop now releases its active owner in the same synchronous
continuation as its final pending-read decision. A caller after that
decision starts a new read instead of joining a finished loop whose
separate `finally` callback has not released ownership. The answer stays
`Promise<void>`, and the replica adds no timer.

Two new witnesses in the existing `replica.test.ts` exercise the real
Replica against its scripted observation and log ports. One emits
`forbidden` before the observation factory returns, then closes twice
and checks one cancellation, the original stop cause and no log read.
The other requests a newer head from a subscriber during read completion
through deterministic microtasks. It checks the two log cursors, the
newest published head and fold equality without a third trigger.

At that source-only repair checkpoint, all validation was UNRUN while
C1 held the single validation slot. No compiler, test, formatter, model,
control, build or generator ran then, and no dependency changed. The
current pre-gate section above records the later DEV and control results;
the older evidence describes only its recorded heads.

The Observation model covers neither repair. Its protected source is
`observe.ts`: `RefreshCoordinator.check`, `RefreshCoordinator.read`,
`ObservationConnection.cancel` and `ObservationConnection.emit`. The
model checks obsolete painting for one read and cancellation; it does
not cover Replica's factory ownership or its read-completion handoff.
This checkpoint changes no protected function, API, model or seal.

That checkpoint waited for PG-1 main. The current replay and main merge
now include the landed prerequisites. Planner ruling `d8f9e590` replaces
the earlier requirement to wait for NF-5's gate.

## Limits

A `TransportError` from `ScopeHandle.log` keeps the replica `behind`
without stopping it. Reconnection retries a missing known head. If the
feed stays up and the scope has no new entry, the replica stays `behind`
until a caller calls `read`. The replica holds no timer. C3 calls `read`
on each member call (ruling `aa12ecdd`).

`mismatch` reads `not-judged`. C3 closes the custody record from the
replica's entry for the key before publishing that prediction. Its test
keeps a request whose key holds another intent out of every published
view with `predicted: { is: "not-judged" }` (ruling `aa12ecdd`).

`refused-here` and `never` carry the guard's `name` when the judge gives
one. Section 9 of the client note now names both fields.

The reconnect repair changes no protected function of `observe.ts`.
The Observation model covers obsolete callbacks and cancellation, and
excludes reconnect behavior. Its source correspondence stays unchanged.
The current ordinary DEV result covers all 400 seeds of 80 steps, with
its actual duration above. The full gate, exact-head review and landing
remain due under request `208a0378`. Ruling `f45b355a` retires the earlier
power and formal evidence-interval conditions; it does not change the
generated suite, its assertions or its deadline.
