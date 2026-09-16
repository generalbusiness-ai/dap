# K1 focused run 2

Measured source: `9250db72f6003aeb92a8481a09b6b248d09d03f0`, with tracked
source unchanged throughout. Node v26.8.2. TypeScript dependencies came from a
temporary local link to the frozen O4 worktree's installed `node_modules`;
the link was removed after validation. Commands from `spike/`:

```sh
DAP_O4_RECORD_DIR=/tmp/dap-o4-k1-run2/observations node --test --test-reporter=tap test/ordering-scope-participant-input.test.ts
npm run typecheck
```

Both lifecycle tests passed (2/2, no failures/skips/TODOs, exit 0); typecheck
passed (exit 0). Each backend admitted and correctly refused all 21 malformed
Inspection requests, then checked their exact receipt/verdict on 21 immediate,
21 cold and 21 post-completion retries. No retry added a position. Every
malformed request's committed bytes, original receipt and cold/completed
retries are retained in `observations/`.

Both backends completed valid Inspection and result import, Sale acceptance
and close, /3 handover to W1, releases at actual S@45 and D@1, destination
activation F@1 and both spends F@2–3. After all four journals reopened, the
snapshot was identical. Both sources' transferred rights were released;
both destination rights were spent, activation count was one, and fulfilment
and delivery flags were true. Old malformed requests stayed private/hidden in
the public source proof consumed by activation. The valid Inspection request
retained its requester/seller/inspector audience.

`identities.json` pins the changed Inspection package and unchanged runtime,
Scope, Sale, manifest and public-rule IDs. Each observation also records actual
S/I/D/F genesis and final header hashes. The two backends generated identical
signed identities for this fixture.

The runtime/model bytes and six existing unexpected-exception test cases are
identical to run 1, where all six passed; run 2 only corrected the premature
export assertion and added its clean-prefix counterpart. Those six checks were
not repeated. This records a focused K1 repair, not a full O4 matrix or campaign
rerun, and does not include the separate K2 strict-replay change. Integration
must regenerate identities and validate the combined source independently.
