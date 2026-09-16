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
