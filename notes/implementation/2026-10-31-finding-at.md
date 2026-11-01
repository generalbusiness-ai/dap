# Answer a finding on an earlier version with no `at`

Status: source implementation. The gate passed at `dbc98ed0`. No Worker runs this code yet. The planner deploys it in a later deployment.

Request `4411ba400a59153a22a2ae1b96f91593a2cbdab1` and promise `18b69ca597ae2e37d803fa82ac7e08b6b1b3129f` own this head.

## What changed

A caller can now answer a finding on an earlier version through `change.resolve-finding-any` or `change.mark-finding-irrelevant` with no `at`.

- **The read.** With no `at`, `#viaFinal` in `packages/mcp/src/service.ts` finds each item that an act's `via` rule selects and the live summary lacks. It reads that item by ID from the scope's final items and signs its revision.
- **A refused read.** The server returns a `read` error and signs nothing.
- **A given `at`.** It takes no read and works as before. The scope refuses it if a subject has moved.
- **Reference.** The Change card, `apps/views/README.md` and `docs/mcp.md` state the new route. This replaces the route that [the finding views' note](2026-10-31-finding-views.md) records.

The scope, its guards and the definitions do not change. The seals of the `McpService` class and of the `service.ts` module move, and each new value comes from the owner's failure output. The page bundle does not change.

## Decisions

- **The rule covers every `via` rule, not only the two tools.** `service.ts` names no application, so a rule for these two acts by name would not fit it. The other acts with a `via` rule are `check`, `check-error`, `renew-hold`, `resolve-concern`, `seal-plan`, `approve`, `withdraw-approval-request`, `propose-manifest` and membership's `revoke-key`. When such an act's `via` target is final, the scope now judges the act, where the server used to omit the key and draw `bad-intent`. An explicit `at` could already reach that judgment, so this grants nothing new. A precise refusal also says more than `bad-intent` did.
- **Keep `answerAt`.** It binds what a read showed: with it, the scope refuses the act if a subject has moved since that read.
- **A name that a field selects stays out.** The caller named that item, and the summary alone answers for it. `merge` naming a superseded manifest with no `at` still draws `bad-intent`, by the code.

## Evidence

The checkpoint is `dbc98ed0b3b76c707f65373613d83344353b9a6b`, tree `4973378a`. It includes main. Raw evidence is in `~/play/artroom-evidence/2026-10-31-finding-at-card/`, `SHA256SUMS` `16247bf6a369af9e51aa3bf467d7b9fffadb49706c279333094d9208d7ad18f6`. The reviewed head adds only this note and its manifest.

Controls F1 to F11 ran at `923d6456`, tree `756fd360`, and each turned its test red by an assertion. They are in the sealed unit `~/play/artroom-evidence/2026-10-31-finding-at/`, `SHA256SUMS` `04a7c0d8646f4b349b2d4ff65142bcd9182a68928acdab5a3578a354fb055a1c`, whose `controls/summary.json` holds one row per run. That unit also holds the gate at `6a2f581a`, tree `784e987d`. The checkpoint adds to that gate's tree the card's sentence, the test's assertion on it and one comment on the read. F12 ran at the checkpoint's source.

| Done-when item | Test | Controls |
|---|---|---|
| Earlier version, resolve, with no `at` | `NO AT, RESOLVE` | F1, F2 |
| Earlier version, irrelevant, also through `act` | `NO AT, IRRELEVANT` | F3 |
| Live version answers as before, with no extra read | `NO AT, LIVE VERSION` | F4, F5 |
| A given `at` signs unchanged, with no read | `EXPLICIT AT` | F6, F7 |
| The scope stays the judge: a version's author reaches the guard | `THE SCOPE JUDGES` | F8 |
| A refused read signs nothing, and the same key answers later | `READ REFUSED` | F9 |
| The real lane's whole flow | `a real lane on the finding definition` | F10 |
| The plain decision | `viaLeft names an item` | F11 |
| The card states the same route as the docs | `THE CARD'S ROUTE`, in the real lane's case | F12 |

| Check | Command | Exit | Digest |
|---|---|---|---|
| Gate | `npm run gate` | 0 | `f45837c0cbbb1361` |
| Control F12 and its baseline | `controls/run-controls.mjs` | 0 | `702c1e0412956fcb` |

The gate reports 3241 plain and 907 native tests, 115 Node and 56 Counting.

## Open limits

- **The other `via` acts.** No test runs each of them with a final target. The scope's rules are unchanged.
- **A final item's revision.** Effects and transitions on a final item are refused, and nobody traced whether a comment moves a revision. An act with a stale number is refused as `revision-moved`, so a wrong number signs nothing that lands.
- **The refused read is a stand-in.** The scope forbids signed reads of final items, so this read needs a session. Blocking sessions stops the agent earlier with `unknown-tool`, so `READ REFUSED` strips the reader from the item query only. The refusal comes from the real scope.
- **A chain of two `via` rules.** The read is one pass, so a `via` of a `via` whose first link is final stays as before. No current definition has that chain.
- **The `dap` command line.** It has its own `expectedOf`, which this head does not change or check.
- **Not run.** No browser host, Worker or real room ran this code. The tests use OwnGit and WorkspaceStandIn, with no runner.
