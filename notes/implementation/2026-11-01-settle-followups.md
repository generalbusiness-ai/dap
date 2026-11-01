# State what settle claims, and move the local loops to it

Status: test-helper change. The gate passed at `a4db16ae`. No file outside a `test` directory changes, so no Worker bundle changes.

Request `187f478d3ab698c2987475b364dc131e8f13fd08` and promise `ef1e2eac6c501700a918c988db5e911a36970e66` own this head. They come from the checker's approval `8dfea252` of the settle repair in [the flaky-finding note](2026-11-01-flaky-finding.md).

## What settle claims

`settle` returns after one round that made no dispatch and moved no head of its list. That is the whole claim. A send can still be on its way when that round ends, in three cases:

1. **A pass starts behind the round.** An alarm or a background pass starts after this round's call to that scope, and no commit moves a head before the second read. The round never joined that pass.
2. **The sender is off the list.** `settle` neither calls nor reads a scope outside its list.
3. **The send waits for the clock.** A retry or busy answer, or no answer at all, leaves the send due at a later time on the scripted clock. Nothing is due now, so the next round counts 0. A delivery that throws counts as no answer: `namespace.ts` turns the error into `null`.

A scratch test forced each case and read the outbox when `settle` returned. In the first case the platform's own alarm made a second attempt, and `settle` returned with that attempt unanswered. The same send landed when the gate opened, with no further `settle`. The second and third cases also left the send unanswered. In the third case a second `settle` at the same clock did not send it, and moving the clock did. The third case ran with no answer. The retry and busy paths come from reading `Dispatcher.#dispatch`.

These forced orders show that the condition allows such a return. No run shows that one happened in a gate.

## What changed

- **`quiet`** in `packages/scope/test/net.ts` now holds the two head reads and the condition. `settle` and the new `settleDriving` call it. `settleDriving` runs each scope's operations driver before its dispatcher.
- **The comments.** The comment on `quiet`, the comment on `Graph.settle` and the header of `settle.test.ts` state the claim above. They no longer say that no send is in flight.
- **The eight loops.** All eight loops that the flaky-finding note names now use the helper:

| Loop | Now calls |
|---|---|
| `Graph.created` in `apps/room/lanes/test/support/graph.ts` | `settle` |
| `pause` in `apps/room/lanes/test/demo.scope.test.ts` | `settleDriving` |
| `pause` in `apps/room/lanes/test/issues.scope.test.ts` | `settleDriving` |
| `pause` in `packages/cli/test/claim.scope.test.ts` | `quiet` |
| The founding drivers in `packages/scope/test/github-creation.test.ts` | `quiet` |
| `fixturePasses` in `packages/scope/test/support/native-fixture-lifetime.ts` | `quiet` |
| `drainScheduledFixture` in the same file | `quiet` |
| The paired worlds in `packages/scope/test/observability-native.test.ts` | `quiet` |

- **The finding test's print.** When a withdrawal does not reach `aborted`, `finding.scope.test.ts` prints each outbox of the room with its attempts, then runs the same assertion. Each scope prints its first page, of at most 100 sends, and says whether that page is complete.

## Decisions

- **`quiet` takes the round as a function.** The loops differ in what a round does: effects, callback joins, concurrent calls. They agree on the condition, so the condition has one home.
- **Each loop keeps its ceiling.** The round counts its own passes and fails with the message it had. `demo` and `issues` had no failing ceiling: after 64 passes they fell through to `settle`, which has none. `settleDriving` also has none, so the case's time limit bounds them.
- **`quiet` takes a `wait`.** The fixtures that own their work wrap every call in their owner. The head reads go through the same wrapper.
- **`quiet` reads the list each time.** `drainScheduledFixture` finds new scopes as it runs. A new scope has no earlier head to match, so its round is not quiet.
- **No test's observation changed.** Every test file listed below passed on its first run after its move, and no assertion changed.
- **The print goes to stdout and leaves the assertion alone.** A read that throws prints its error, and the assertion still decides. The test reads `state` once, as before.
- **The limits have no committed test.** A committed test of case 1 would pin a helper's gap as if it were required. The scratch test stays with the evidence.

## Evidence

The checkpoint is `a4db16aee8c447d2d4f22510a7c79440f28f43fb`, tree `330f90a4`. It includes main `e5069ee6`. Raw evidence is in `~/play/artroom-evidence/2026-11-01-settle-followups/`, `SHA256SUMS` `976c159e2ca822976b2708ad9fad5c8b4cdd105af9b87dd397242ebe0f9d6ba5`. The gate ran there. The focused runs and controls ran at `4d66156d`, which holds the same test changes before the merge of main, and each log under `runs/` names that head and has no dirty path. The reviewed head adds this note and its manifest, and merges main `cf617842`. That merge changes `packages/mcp`, the page and its bundle, documents and seals, and no file of this head, so I did not run the gate again. Each digest is the first 16 hex digits of the sha256 of the named files, read in name order.

| Check | Command | Exit | Digest |
|---|---|---|---|
| `settle.test.ts` | `npx vitest run --project scope packages/scope/test/settle.test.ts` | 0 | `80e55bd599bd436c` |
| `finding.scope.test.ts`, passing | `npx vitest run --project scope apps/room/lanes/test/finding.scope.test.ts` | 0 | `0856093de3b51c5c` |
| `demo.scope.test.ts` | `npx vitest run --project scope apps/room/lanes/test/demo.scope.test.ts` | 0 | `458d8acf282df4b4` |
| `issues.scope.test.ts` | `npx vitest run --project scope apps/room/lanes/test/issues.scope.test.ts` | 0 | `5751ec4a8257f5b7` |
| `claim.scope.test.ts` | `npx vitest run --project scope packages/cli/test/claim.scope.test.ts` | 0 | `37f6d515017cc618` |
| `github-creation.test.ts` | `npx vitest run --project scope packages/scope/test/github-creation.test.ts` | 0 | `ec63dfdd906cfcc8` |
| `observability-native.test.ts` | `npx vitest run --project scope packages/scope/test/observability-native.test.ts` | 0 | `a19cb26681df26e3` |
| Eight users of `Graph.created`, one file at a time, logs `runs/1*` | `npx vitest run --project scope <file>` | 0 | `e1cf8470c8fa339a` |
| Fifteen users of the fixture schedulers, one file at a time, logs `runs/2*` and `runs/3*` | `npx vitest run --project scope <file>` | 0 | `a82ef4417684202c` |
| Forced failure with printed attempts | `item1/forced-failure.patch`, then `ARTROOM_TEST_PROGRESS=<file> npx vitest run --config vitest.native.config.ts --project scope finding.scope` | 1 | `77e8424711a532e2` |
| Control: the assertion still decides, with the print in place | `node scripts/control.mjs` on `finding.scope.test.ts`, adding the same hold | 0 | `fe4301de997404f2` |
| Control: the head half of the condition | `node scripts/control.mjs` on `net.ts`, condition reduced to `made === 0` | 0 | `258b30cff15d9aa0` |
| Control: the dispatch half of the condition | `node scripts/control.mjs` on `net.ts`, condition reduced to the head comparison | 1 | `339ff489bc2275ad` |
| Scratch test of the three cases | `item3/settle-limits.test.ts`, then `npx vitest run --project scope --silent=false --reporter=verbose packages/scope/test/settle-limits.test.ts` | 0 | `e800d37fbf678dc6` |
| Gate | `npm run gate` | 0 | `37b7ea4fe453ce10` |

The gate reports 3467 plain and 963 native tests, 116 Node and 56 Counting.

The second control exits 0 and names `the send's delivery was answered`. The third exits 1, the result `survives`: `settle.test.ts` does not tell the `made === 0` half of the condition from its absence, because the head half alone ends that test the same way. That control ran on that one file.

The forced failure holds every send from the withdrawal on, so the state stays `intended`. Its log shows `expected 'intended' to be 'aborted'` and 47 sends. The hold stopped two of them, each with one `none` attempt and no acknowledgement: the lane's request `39.0` and the destination's result `8.0`. The run used the gate's config and reporter. In a passing run the guard skips the print. The passing log has no such line, and Vitest also hides a passing test's console output in this configuration.

`item3/` keeps three earlier scratch runs that show nothing about `settle`. Runs 1 and 3 failed with workerd's I/O error while the test awaited a promise that the object resolved. A read loop in the test's place ended that error. Run 2 called `alarm` over RPC, and workerd refused the call as a reserved method.

## Open limits

- **The cause stays open.** Request `c5f0cff9` owns it. The print answers it only when the assertion fails again, and no run here repeats that failure.
- **The three cases stay in the helper.** A test that needs one of those sends finished must wait on that send. Request `187f478d` asks for this statement and no more.
- **The operations driver is outside `settle`.** `settle` never calls `effect`, so it joins no operations pass. A commit from that pass counts only if it lands before the second head read. `settleDriving` calls `effect`, and a pass that starts after that call has the limit of case 1. No request owns this.
- **The runs are a selection.** 193 files name `native-fixture-lifetime.ts` or `fixtures-native.ts`. This head ran the files in the table one at a time, and the gate ran the rest.
- **Cost.** Nobody measured the added head reads in the eight loops: one read per listed scope per round, plus any extra round after a head moved. No request owns this.
