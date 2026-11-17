# A kind answer also answers the plain question

AR-10 (request `247358cf`) takes the first follow-up of the AR-9 note. A
new scope object instance that reads a birth by name asked ScopeIndex twice:
once with the kind for `nativeBirthByName`, then once without it for the
general admission (`packages/scope/src/scope-index.ts`). The AR-8 cache
kept the two answers under different keys.

## The change

When `cachedHas` keeps a positive answer for a name and a kind, it also
keeps a positive answer for the name alone, under the same mode and in the
same map. The plain admission that follows `nativeBirthByName` then asks
the index nothing.

This is safe because `ScopeIndexRows.has` answers true for a name and kind
only when the row exists, is valid and has that kind. Its plain answer
needs only the first two. A kind answer therefore implies the plain answer.
The reverse does not hold, so a plain answer never answers a kind question.

The cache key stays as AR-8 made it: the scopes binding object, the index
binding object, the mode, the name and the kind. A kind answer can add two
entries, so the bound now removes the oldest entries until the map holds at
most 4,096.

The `scope-index.ts` seal takes the new value, named AR-10. The
threat-model paragraph on the cache names the rule. The AR-8 and AR-9
guards are unchanged and pass.

## Tests

A new case in `packages/scope/test/scope-index.test.ts`:

- A birth by name asks once, with the kind. A plain call on the same name
  then asks nothing.
- A plain positive does not answer a kind question. The kind question goes
  to the index.
- A name known with another kind is refused for the asked kind, asked again
  each time, and never reaches its target.

Without the source change, the first step fails: the index sees two
questions, not one (`artroom-evidence/2026-11-17-ar10-red/red.txt`).

## Rate for grow

| Object     | Before, a minute (`0859c7d3`, AR-9 note) | After, expected |
| ---------- | ---------------------------------------- | --------------- |
| ScopeIndex | about 9                                  | about 7         |
| grow total | 34                                       | about 32        |

The "after" figures are expected, not measured. The AR-9 note infers that
the Site and the Directory are each read by name once a minute from a new
instance, at two index requests each. AR-10 removes one of the two. The
planner reads the rate after deployment.
