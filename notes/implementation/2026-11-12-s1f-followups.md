# S1 follow-ups: creation-table limit, found charge, accounting call

Request `17eb790d` (S1-F). Base: main `a76764a7`.

## Item 1: the creation-table limit

The Serving windows section of `docs/security/entry-points.md` now states
the creation-table limit. Each number matches the source:

| Statement | Source |
|---|---|
| 8,192 windows | `SERVING_WINDOW_CAPACITY = 8192` in `packages/scope/src/serving-limits.ts` |
| for an hour | `#expire(this.#creation, 60 * 60 * 1000, …)` |
| at most 31 per address key | `creationAddress: 30`. `account` charges the address first and returns before it opens a key window, so one address opens its own window and at most 30 key windows |
| about 265 addresses | 8,192 / 31 = 264.3, so the 265th address fills the table |
| 10 creations an hour after that | the overflow cap is `Math.min(keyLimit, addressLimit)` = min(10, 30) |
| IPv4 or IPv6 /64 | `addressKey` keys other IPv6 by its first 64 bits |
| a /48 holds 65,536 /64s | 2^(64 − 48) |

No number differs from the source. The overflow key is unchanged.

## Item 2: every found submit charges the address

`submit` in `packages/scope/src/worker.ts` now calls `admitServing` for
every `found` intent. It passes the bounded copy, or `null` when the intent
is over 1 MiB or fails the strict parse. The oversized value never crosses
to the fixed owner.

`ServingAdmission.admit` refuses a creation that fails the bound, as
before. A `found` request that fails the bound continues as an unverified
attempt: it charges the address and no key. A rate-limited address now
stops the attempt before target work. Otherwise the target receives the
intent and refuses it, as before.

The new test in `packages/scope/test/serving-admission.test.ts` sends three
oversized `found` intents from one address, then one valid `found` intent.
With the small fixture limit of 3 per address, the fourth is rate-limited
and the target sees three submits.

## Item 3: the accounting call stays

A separate creation method does not remove the five-argument call. The
reservation check sits inside the shared identity loop of `account`. A
`creation` method would pass the reservation to a private shared method
that still takes five arguments, or copy the loop. Either way the head
grows, and three calls in `serving-limits.test.ts` change. The call stays
as it is.

## Seals

`scripts/security-entry-points.test.mjs` seals changed. I computed each
new value with that test's own functions, `namedSourceSeals` and
`sourceSeal`, from `scripts/security-entry-points.mjs`:

| Seal | Old | New |
|---|---|---|
| `packages/scope/src/worker.ts:scopedApi` | `589e93aaf890c448dd328ed5615463ca54440231a54937938cd73235acf7cd0c` | `d8a6b3667171d14f601a1f40275064fde975884f6930045b45ca9936e27effce` |
| `packages/scope/src/serving-admission.ts` | `a9915cf54ff03406bd5b2da15fc4e611a066a0ccf06503c1f21e3f4cfac951e7` | `44e8ef11b0bb97a0a2982643152d62d9ec1ab14f9af26a2a687d5a301ccf1168` |

The other `worker.ts` named seals and the `serving-limits.ts` seal are
unchanged.

## Commands and results

| Command | Result |
|---|---|
| `npx vitest run --project scope serving-admission -t "every found submit charges"`, new test on the unfixed source | 1 failed: expected `{ answer: "unavailable", reason: "rate-limited" }`, received `{ answer: "refused", reason: "source-unverified" }` at line 280 |
| `npx tsc -p packages/scope/tsconfig.json --noEmit` | exit 0 |
| `npx tsc -p packages/scope/tsconfig.test.json --noEmit` | exit 0 |
| `npx vitest run --project scope serving-admission serving-limits` | 2 files, 17 tests passed |
| `node scripts/security-entry-points.mjs --check` | exit 0 |
| `node --test scripts/security-entry-points.test.mjs`, before the seal update | 11 of 12 passed; the `scopedApi` seal failed |
| `node --test scripts/security-entry-points.test.mjs`, after the seal update | 12 of 12 passed |

I did not run the gate.
