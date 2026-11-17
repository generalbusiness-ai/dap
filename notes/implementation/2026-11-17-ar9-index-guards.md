# Two more guards for the cached index answers

AR-9 (request `99e7dd62`) closes the limit that the checker recorded in the
AR-8 approval (`b389835e`). AR-8 keeps positive `ScopeIndex.has()` answers
in isolate memory. Its check, `scripts/known-scope-insert-only.test.mjs`,
reads SQL text only. Two other ways to empty the index pass that check:

- a `storage.deleteAll()` or `storage.delete()` call in the `ScopeIndex`
  Durable Object class;
- a wrangler migration that deletes, renames or transfers the `ScopeIndex`
  class.

Either one empties the index while warm isolates keep their positive
answers. AR-9 adds both guards to the same check. No runtime source
changes.

## The storage guard

`indexClassBody` takes the `ScopeIndex` class from
`packages/scope/src/worker.ts`, from its declaration to the first closing
brace in column one. `deletesStorage` matches `storage.delete(` and
`storage.deleteAll(`. It does not match `storage.deleteAlarm()`, which the
class calls to clear its alarm.

The test fails when the class is missing or when its body does not reach
the class's storage use. These failures stop a moved class from passing
with an empty body.

## The migration guard

The test reads every tracked `wrangler*.json` and `wrangler*.jsonc` file.
`parseWranglerJsonc` removes comments and trailing commas outside strings,
then parses the JSON. `indexMigrationRemovals` collects each `migrations`
step at the top level or under any environment. It reports a step whose
`deleted_classes` names `ScopeIndex`, or whose `renamed_classes` or
`transferred_classes` moves a class `from` `ScopeIndex`. A class renamed
to `ScopeIndex` is not a removal.

A tracked TOML wrangler file fails the test, because this check has no TOML
parser. No such file is tracked today.

## Named reds

- Storage: the matcher case names `deleteAll()`, `delete(key)` and a spaced
  form. It rejects `deleteAlarm()`. The class case adds a `deleteAll()`
  method to the real class body and finds it.
- Migration: a JSONC sample with comments, a block comment, trailing commas
  and a `//` inside a string. Its steps delete, rename and transfer
  `ScopeIndex`, and the matcher names each one. It ignores a step that only
  creates `ScopeIndex` and a step that renames another class to
  `ScopeIndex`.

The checks against the tree pass: the class has no storage delete, and no
tracked configuration removes `ScopeIndex`.

`docs/security/threat-model.md` names both guards in the AR-8 paragraph.

## The grow rate after AR-8

The planner read the rate after deploying AR-8 (END `0859c7d3`, 19:30 to
19:45Z). The floor on `dap-grow` fell from 49 to 34 requests a minute. The
AR-8 note forecast 27 to 30, so about 7 a minute remain above the forecast.

These counts are from the Cloudflare analytics API, 15 minutes before and
after the deployment:

| Source                             | 18:31 to 18:46Z | 19:31 to 19:46Z |
| ---------------------------------- | --------------- | --------------- |
| ScopeIndex object `71671c0f`       | 382             | 133             |
| Room A `e90a0152`                  | 216             | 215             |
| Membership, Site, Directory (each) | 60 to 62        | 60 to 62        |
| dap-grow Worker requests           | 192             | 177             |
| dap-grow Worker subrequests        | 384             | 204             |

The gap is all ScopeIndex: about 9 a minute against the forecast of 2 to 5.
Every other object holds its earlier rate.

The Worker side is not the cause. Before AR-8, each Worker request made two
subrequests: `has()` and the target call. After AR-8 it makes about 1.15.
So the Worker sends at most about 2 ScopeIndex requests a minute, and these
include signed-read serving admission (`admitServing`), which is a rate
limit and not cached by design.

The remaining ScopeIndex requests come from scope objects that the platform
constructs again each minute. The cache lives in module memory, keyed by
the scopes binding object. If a new object instance brings a new `env`
binding object, its first call to each name misses the cache. This is
inferred, not observed. The sampled logs show the
per-minute cycle (19:36 to 19:40Z): Membership's archive alarm, an
`observed` call to Room A, and `nativeBirth` calls to Site and Directory.
The AR-5 note records that the Directory is constructed once a minute.

A new instance that reads one birth by name asks ScopeIndex twice: once
with the kind for `nativeBirthByName`, and once without it for the general
admission (`packages/scope/src/scope-index.ts:172` and `:176`). The two
answers have different keys. For the Site and the Directory, that is about
4 requests a minute, and the `observed` call adds about 1. With the Worker's
2, this accounts for about 7 of the 9. This is an inference from the
sampled logs and the counts above. Cloudflare does not report the RPC
method of each ScopeIndex request.

Two changes would close most of the gap. Neither is part of AR-9:

- Let a positive answer with a kind also answer the plain question. This
  removes one request per new instance per name.
- Key the cache by the index name instead of the binding object, so that a
  new object instance in the same isolate keeps the answers. Isolates that
  the platform evicts still start empty.

The planner decides whether either becomes a lane.
