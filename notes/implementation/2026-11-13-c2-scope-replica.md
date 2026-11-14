# C2: the replica of a declared scope

Request `208a0378` builds step C2 of the client design note
(`notes/2026-11-13-scope-client.md`, sections 6, 9, 11 and 12). Ruling
`b1b1d492`, carry `556eca2b`, the builder's list `dd21b684` and rulings
`7c8774a2` and `b258370c` bind it. C2 holds no custody record and sends
nothing.

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

`packages/client/test/replica.test.ts` (25 cases with
`scope-entry.test.ts`):

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
The reconnect test, the 400-seed suite on AC, and the gate remain due.
