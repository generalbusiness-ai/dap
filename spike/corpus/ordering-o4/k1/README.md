# K1 malformed participant input

The unchanged checker reproduction and its output are retained before repair.
Both runs used clean source `edacc32db1495504d10ae7a92f02af272e49e9f2`,
Node v26.8.2, and the real signed lifecycle fixture at `inspection-attached`.
The storage arguments were `memory` and `sqlite`. Both commands exited 0;
the script catches the failures and prints them, so that exit status is not a
passing lifecycle result.

```sh
WT=/tmp/dap-o4-k1-repair node spike/corpus/ordering-o4/k1/participant-poison.mjs memory
WT=/tmp/dap-o4-k1-repair node spike/corpus/ordering-o4/k1/participant-poison.mjs sqlite
```

Carol is an admitted Buyer. Her signed null Inspection request occupies S@12.
Inspection's fold would refuse it as malformed, but its audience callback
throws when it reads `seller` from null. Foundation records `audience_error`;
Scope escalates it and closes the facade. Cold scope state and export also
throw. A later admitted Bob offer occupies S@13 before scope replay throws.
The memory output can still inspect the closed backend; the SQLite output
instead records its closed-database error. Both cold attempts reproduce the
persistent scope failure.

The original script assumes its failed cold state read closes the facade.
It opens another facade without an explicit close. Keep it as a historical
reproduction at this source, not as the repaired success test: that assumption
would violate single-facade ownership once the state read succeeds.
The repair regression will explicitly close and reopen each facade.

This is pre-repair evidence, not a formal rerun of the O4 lifecycle matrix.
The request remains
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:1b6384e27d6dbfd5a22da3330378776d32ad23ab`.

## Focused source boundary

Source `df6e5e7ab54a6cc6ae306aab56a80c64941b0a3d` freezes the new
participant-input test while leaving Inspection unchanged. From `spike/`:

```sh
node --test --test-reporter=tap test/ordering-scope-participant-input.test.ts
node --test --test-reporter=tap --test-name-pattern='unexpected|thrown' test/ordering-scope-phase.test.ts
```

The new test failed on null at S@12 in both backends (0/2 passed, exit 1),
matching the checker reproduction. The existing unexpected replay, fold and
audience exception checks passed 6/6 (exit 0). Exact output is retained in
`regression-before.txt` and `faults-before.txt`.

The repair validates each audience party as a string and otherwise uses the
request actor, including null, primitives, arrays and malformed party fields.
The existing fold still returns `malformed`. Valid request audiences remain
the requester, seller and inspector. No scope, foundation or interpreter error
handling changes in K1; unexpected failures remain failures. The revised module
has a new Inspection package identity. Old journals pinned to the old package
retain their historical behavior; this does not silently replace old package
code or migrate existing signed histories.

The focused test contains 21 malformed inputs per backend. It checks the real
admitted refusal, actor-only audience for these inputs, stable receipt/verdict
on immediate and cold retries, cold scope state and export, then proceeds
through valid Inspection, Sale, writer handover, release, destination activation
and both spends. It uses actual shifted release positions, reopens all four
journals, and retries every old malformed request again after completion.
The final source will be frozen before its measurements are recorded.
