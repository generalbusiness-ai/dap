# The scope-index adapter keeps positive answers

AR-8 (request `0ca6374b`, ruling `96a70605`) cuts the ScopeIndex requests on
`dap-grow`. AR-7 (`f6882052`) found that ScopeIndex took about 24 of grow's
49 Durable Object requests a minute. The `indexedScopes` adapter
(`packages/scope/src/scope-index.ts`) asked `ScopeIndex.has(name)` before
every call on a scope object. That covered Worker ingress and every
scope-to-scope RPC, and no answer was kept.

## The change

`cachedHas` keeps positive `has()` answers in isolate memory.

- It keys each answer by the scopes binding, the index binding, the mode,
  the name and the kind.
- It holds at most `KNOWN_SCOPE_CACHE_LIMIT` (4,096) answers per scopes and
  index binding pair, and drops the oldest first.
- It never keeps a negative answer or an error. An unknown name still
  reaches the index, and the adapter refuses it before any target.
- Creation does not read the cache. A creating call skips `has()` as before.

The rewritten note at the top of the adapter says what it caches and why
that is safe.

## Why a kept answer stays true

`known_scope` rows are insert-only. `register()` writes
`INSERT ... ON CONFLICT(scope) DO NOTHING` and stores the genesis and kind
once. No code deletes or updates a row. A name that the index once knew,
with its kind, stays known. A retired room still answers its retired stop
from the object itself.

`scripts/known-scope-insert-only.test.mjs` keeps this true. It fails when a
source in `packages`, `apps`, `scripts` or `examples` deletes, updates,
replaces, alters or drops `known_scope` rows, or upserts one with
`DO UPDATE`. Its first case checks the matcher against each form.
`docs/security/threat-model.md` gains a paragraph on the cache, and its
invariant list names the new adapter test under `verified-genesis`. A future
delete path must clear this cache.

## Tests

- New in `scope-index.test.ts`:
  - A positive answer is asked once per isolate. A negative answer is asked
    again each time and refused before any target. A failed lookup is
    refused and asked again on the next call.
  - The cache drops its oldest answer past 4,096. A kind-checked answer and
    a register-mode answer each have their own key.
- Changed in `scope-index.test.ts` ("unknown scope gate ..."): the test
  deletes an index row to stand for a registration that never happened. The
  same isolate now keeps its earlier positive answer, so the test reads the
  deleted name through a fresh binding. That binding stands for an isolate
  without the answer, and the read is still refused.
- Changed in `health.test.ts`: the test asserted that the adapter "stores no
  has() answer". It now asserts the AR-8 rule. A second RPC to an admitted
  name asks the index no more, and a binding without the answer asks again
  on each call and is refused.

Without the source change, the three AR-8 cases fail
(`artroom-evidence/2026-11-17-ar8-red/red.txt`). With it,
`scope-index.test.ts` passes, as do the adapter's other suites:
`demo-register`, `creation-lineage`, `creation-versions`,
`archive-publication`, `commons` and `health`.

The `scope-index.ts` seal takes the new value, named AR-8.

## Rate for grow

| Object     | Before, a minute | After, expected |
| ---------- | ---------------- | --------------- |
| ScopeIndex | 24               | 2 to 5          |
| grow total | 49               | 27 to 30        |

The "after" figures are expected, not measured. Warm Worker and Durable
Object isolates hit the cache. A cold isolate asks once for each name it
meets. The planner reads the rate after deployment.
