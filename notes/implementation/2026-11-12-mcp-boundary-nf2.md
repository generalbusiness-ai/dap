# MCP result types, the bounded description and fixed tool schemas

For request `9a321a0a` (NF-2) and promise `b7f2ffaa`.
Planner request `0916128e` states the six problems and the three parts.
The base is main `33836693`, the NF-1 landing.
The gated source is `9d3a4fd5`, tree `3dd5e0283c14f1c51ade2bcd2e8a99a42516e483`.
This note changes only documents from that source.

## What changed

**The bounded tool description moves to MCP.**
`DESCRIPTION_CHARS`, `Described`, `describeAct` and its helper `indented` move from `packages/client/src/describe.ts` to `packages/mcp/src/describe.ts`.
`descriptionsOf` in the Client no longer returns `describeAct`.
The sentences, field lines, guard sentences and `describeActLine` stay in the Client.
`packages/mcp/src/describe.ts` no longer re-exports Client names, and `packages/mcp/src/shape.ts` no longer re-exports `expectedOf`, `viaLeft`, `effectiveFields` and `finalStates`.
Each importer in `packages/mcp`, `apps/views` and `examples/repo-in-ai` takes a name from its owner: `ActLike`, `DefinitionLike`, `grantAction`, `onOf`, `inline`, `sentenceNamed` and `expectedOf` from `@generalbusiness/dap-client`.

**One typed act result.**
The new `packages/mcp/src/act-result.ts` declares `ActResult` and one function, `projectAnswer`.
`projectAnswer` takes `{ answer }` or `{ archivedSettlement }` and an optional `AnswerContext`.
It builds the result of an act tool, `act`, `create`, `join`, `install_application`, a prepared step and the last outcome in `settle`.
It replaces `#answerOf`, `#archivedSettlementOf` and the old untyped `projectAnswer` in `packages/mcp/src/service.ts`.
`ACT_OUTPUT` moves from `packages/mcp/src/catalogue.ts` to the same file.
`satisfies Record<keyof ActResult, JsonSchema>` makes its properties name every member of `ActResult`.
`satisfies Record<RequiredKeys<ActResult>, true>` makes its `required` list name every required member.
The `answer` and `phase` enums come from tables that satisfy `Record<Answer["answer"], true>` and `Record<Phase, true>`.

**Typed call results.**
`packages/mcp/src/results.ts` adds `Success<T>`, `Failure`, `CallOutcome<T>`, `TypedCallResult<T>` and `dataOf`.
`ok` returns `Success<T>`, and `failed` returns `Failure`.
`DispatchContext.prepare` returns `() => Failure | null`.
`#perform`, `#settle`, `#installApplication`, `#withCredential` and `#exactAnswer` return `CallOutcome` of a named type: `ActResult`, `PreparedStep`, `CustodyReport` or `ExactReadData`.
`#viewExact` reads the accepted `fact` through `dataOf`, not through a cast of `structuredContent`.
`packages/mcp/src/views/session.ts` and `apps/views/src/decision.ts` read their results through `dataOf`.

**Fixed tool schemas.**
The input schemas in `#genericTools` gain these conditions and patterns:

| Tool | Field | Before | After |
|---|---|---|---|
| `create` | `membership` | string or object | a scope ID pattern, or a `ScopeRef` object (`scopeRefArg`) |
| `settle` | `membership` | refused: not a property | the same schema as `create` |
| `install_application` | `owner` | any object | a `MemberRef` object (`memberRefArg`) |
| `install_application` | `release` | any string | `^sha256:[0-9a-f]{64}$` |
| `application_installation` | `item` | integer, minimum 0 | adds maximum `Number.MAX_SAFE_INTEGER` |
| `prepare` | `capability`, `step` | any string | `maxLength` 128 |
| `prepare` | whole input | none | with `kind`, `target` is required and `on` has maximum `Number.MAX_SAFE_INTEGER` |
| `settle` | whole input | none | `anyOf` `target` or `definition` |
| `diff` | `base`, `integration` | any string | `^[0-9a-f]{40}$` |
| `act` | `on` | integer, minimum 0 | adds maximum `Number.MAX_SAFE_INTEGER` |

The `tool` helper in `#genericTools` takes `output?, conditions?, meta?`.
It spreads `conditions` into the input schema, and `meta` replaces `_meta`.
`credential` and `diff` keep main's `{ ui: { visibility: ["model"] } }` as `meta`.

`docs/mcp.md` and `docs/mcp-tools.json` hold the tool list as the server sends it.
The maintained reference writer produced `docs/mcp-tools.json`.
The security inventory takes 17 seal changes, listed under Evidence.
`apps/room/page/assets.ts` is the Page build of the smaller Client.

## Decisions and why

**`effects` is on every accepted result.**
Ruling of `9a321a0a`: `projectAnswer` sets `effects` whenever the answer took effect.
An act tool result, `act`, `create` and `join` now carry `effects` too. Before, only a step and an install carried it.

**`phase` stays top level and uses the eight custody words.**
Its description says that it is where this client's kept request stands. The description of `answer` says that it is the room's decision.
`install_application` now reports `kept.record.phase`, not the literal `"recorded"`.
An accepted install therefore reports `accepted`.
The accepted install result also gains `outboxIds` and `effects`, because `projectAnswer` builds it.
`errors.test.ts` checks that `recorded` is no `Phase` with `@ts-expect-error`.

**The description of `answer` names every value.**
The `answer` enum is `accepted`, `archived`, `refused`, `unavailable` and `mismatch`.
A lost reply stays a custody finding. It is not an `answer` value.

**`ACT_OUTPUT` requires only `answer`.**
A step's `last` and `answer` and a projection with no context carry no `sentence` and `next`.
Before, `ACT_OUTPUT` required all three, although these results omitted two of them.

**An archived result keeps its members in a new order.**
`projectAnswer` puts the context members before `archived`, `fact`, `phase` and `retained`.
The members and their values are unchanged. The text content is JSON, so its bytes change order.

**A schema change fixes only a schema that admits a value the parser refuses, and one schema that refuses an input its parser reads.**
Each row of the table above narrows a schema to its parser: `isScopeId` and `isScopeRef` for `membership`, `isMemberRef` for `owner`, `isDigest` for `release`, `Number.isSafeInteger` for `item` and `on`, `COMMIT_ID` for `diff`, and the `target` refusal of `settle`.
The scope ID and incarnation patterns end in a character whose bits past the last byte are zero. `isScopeId` and `isIncarnation` decode base32 with the alphabet `abcdefghijklmnopqrstuvwxyz234567` and refuse set bits there. A scope ID has 52 characters, 260 bits for 32 bytes, so its last character is `a` or `q`. An incarnation has 26 characters, 130 bits for 16 bytes, so its last character is one of `aeimquy4`.
`settle` now admits `membership`, because `#settle` reads it through `#membershipRef` for a creation. `create` and `settle` share one membership schema in `#genericTools`.
`maxLength` on `capability` and `step` is a necessary character bound. The server still refuses more than `NAME_BYTES` (128) UTF-8 bytes. `budget.test.ts` checks a 65-character name of two-byte characters.

**The schema stays inline.**
The ruling says to report the bytes before trying `$defs`. The figures follow.

## Tool list size

The tool list grows by 74,746 bytes in compact JSON, from 170,890 to 245,636 bytes.
I measured both sizes with `jq -c . docs/mcp-tools.json` minus its newline, at `33836693` and at `9d3a4fd5`.
The formatted file grows from 267,101 to 435,063 bytes.

- The act output schema grows from 607 to 1,854 bytes in compact JSON. It appears 59 times: 73,573 bytes.
- The input schemas grow by 1,153 bytes.
- The `application_installation` description grows by 20 bytes.
- The largest tool grows from 5,276 to 6,523 bytes.

The MCP budget caps each `tools/list` page at 256 KiB (`LIST_PAGE_BYTES`) and puts no limit on the whole list.
`the list per role, in bytes and tokens` in `packages/mcp/test/budget.test.ts` passed in `plain-2`.
A shared `$defs` entry for the act output schema would remove most of the 73,573 bytes. That waits for the planner.

## Schema audit

Request part 3 asks for each fixed tool's input schema against its parser.
The table lists every difference I found at `9d3a4fd5`, apart from the fixes above.
Commit `c2377a06` fixes the two rows marked fixed.
"Parser admits more" means that the schema is stricter than the parser.

| Tool | Field | Schema admits | Parser admits | Kind |
|---|---|---|---|---|
| all keyed tools | `idempotencyKey` | 1 to 128 characters | 1 to 128 UTF-8 bytes (`keyBytes`) | Schema admits more. JSON Schema counts characters |
| `prepare` | `capability`, `step` | at most 128 characters | at most 128 UTF-8 bytes | Schema admits more. JSON Schema counts characters |
| `create`, `install_application` | scope IDs in `scopeRefArg` | `^sc_[a-z2-7]{52}$`, `^in_[a-z2-7]{26}$` | the same, with zero bits past the last byte (`decodeBits`) | Fixed in `c2377a06`: `^sc_[a-z2-7]{51}[aq]$`, `^in_[a-z2-7]{25}[aeimquy4]$` |
| `settle` | `membership` | refused: not a property, and `additionalProperties` is false | `#settle` reads it for a creation | Fixed in `c2377a06`: the `create` membership schema |
| `inspect`, `step`, `text` | `offset` | integer, minimum 0 | `Number(...)` of any value | Parser admits more |
| `wait` | `seconds` | integer 1 to 60 | any value, clamped to 1 to `WAIT_MOST_SECONDS` | Parser admits more |
| `step` | `seq` | integer, minimum 0 | `Number(...)` of any value | Parser admits more |
| `credential`, `diff` | `entry` | integer, minimum 1 | `Number(...)` of any value | Parser admits more |
| `text` | `kind` | the six names | `String(...)` of any value | Parser admits more |

I did not audit `scopeArg`, which `#scope` resolves, or the `cursor` of each paged tool.

## Evidence

Paths are relative to `~/play/artroom-evidence`.

| Check | Head and command | Exit and result | Output |
|---|---|---|---|
| Typecheck | `2ef00924`: `npm run typecheck` | 0 | `2026-11-12-nf2-working-8d00dbbc/typecheck-4.stdout` |
| Seals before the refresh | `2ef00924`: `node --test scripts/security-entry-points.test.mjs` | 1. 11 of 12 passed. The owner test stopped at `packages/mcp/src/index.ts` | `2026-11-12-nf2-working-8d00dbbc/seal-1.stdout` |
| Seals after the refresh | `70ab6509`: `node --test scripts/active-source.test.mjs scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | 0. 27 of 27 passed | `2026-11-12-nf2-working-8d00dbbc/seal-2.stdout` |
| Plain, stale docs | `70ab6509`: `vitest run --config vitest.plain.config.ts --project mcp --project client --project repo-in-ai` | 1. 696 passed, 1 failed, 1 skipped. `the tool reference is the list as sent` found the old `create` schema in `docs/mcp.md` | `2026-11-12-nf2-working-8d00dbbc/plain-1.stderr` |
| Plain | `9b2ee641` (the same command, before its commit) | 0. 71 files, 697 passed, 1 skipped | `2026-11-12-nf2-working-8d00dbbc/plain-2.stdout` |
| Node checks | `70ab6509`: `node --test` on `apps/views/test/s4.test.mjs`, `apps/views/test/decision.test.mjs`, `examples/repo-in-ai/test/custody.test.mjs` and `examples/repo-in-ai/test/session.test.mjs` | 0. 36 of 36 passed | `2026-11-12-nf2-working-8d00dbbc/node-1.stdout` |
| Native | `9b2ee641`: `vitest run --config vitest.native.config.ts --project scope --project scope-stories` on `hosted-cards.test.ts`, the 24 MCP `*.scope.test.ts` files and `host-none.scope.test.ts` | 0. 26 files, 96 of 96 passed | `2026-11-12-nf2-working-8d00dbbc/native-1.stdout` |
| Page build | `9d3a4fd5`: `npm run build --workspace @generalbusiness/dap-page` | 0. The module is 2,428,953 bytes, SHA `ff6cb448` | `2026-11-12-nf2-working-8d00dbbc/page-build.stdout` |
| Gate | `9d3a4fd5`: `npm run gate` | PENDING | `2026-11-12-nf2-gate-9d3a4fd5/gate.stdout` |
| CI | `9d3a4fd5`: branch push | PENDING | PENDING |

Each Vitest and Node test command ran with `env -u VITEST_MAX_WORKERS`. The Native command also set `ARTROOM_SCALE_MODE=omit`.
The skipped Plain test is `a dead reclaimer under a long ARTROOM_HOME`, which skips on macOS.

The rebase from NF-1 intermediate `d3cbab38` onto `33836693` conflicted only in the `tool` helper of `#genericTools`.
`git range-diff` shows no other change.
The first source commit `8d00dbbc` failed the typecheck with seven errors. Main caused none of them.
Commit `2ef00924` repairs them without casts: `ok<CustodyReport>` at the not-found settle answer, a readonly `ExactReadData.paths`, `Failure` stops in `hosted-cards.test.ts`, one renamed `said` in `errors.test.ts`, and the new imports and `projectAnswer` input in `examples/repo-in-ai/review-control.ts`.

The seal changes in `scripts/security-entry-points.test.mjs` come from the test's failure output. Each one names a reviewed source change.

| Seal | Before | After | Change |
|---|---|---|---|
| `packages/mcp/src/index.ts` | `e8381ad3` | `3758cff2` | exports `input-schema.ts`, `act-result.ts` and the result types |
| `packages/mcp/src/hosted.ts` | `edc37968` | `64f14a28` | `denied` returns `Failure` |
| `service.ts:$module` | `0ad79a64` | `e969bd8c` | imports from their owners; new types |
| `service.ts:callResultText` | `7a858143` | `fc1a4824` | parameter type `object` |
| `service.ts:ok` | `0c1818e2` | `d01886e7` | returns `Success<T>` |
| `service.ts:failed` | `2e151881` | `077c51d8` | returns `Failure` |
| `service.ts:Stop` | `be559905` | `3840d5e6` | holds a `Failure` |
| `service.ts:McpService` | `31471582` | `120cb251` | `projectAnswer`, typed outcomes, the schema fixes |
| `service.ts:commitIdFault` | `3614f1ad` | `36b75703` | returns `Failure` |
| `service.ts:projectAnswer` | `ab287949` | removed | moved to `act-result.ts` |
| `service.ts:scopeRefArg` | new | `54297e6f` | new schema constant |
| `service.ts:memberRefArg` | new | `80b4a763` | new schema constant |
| `packages/mcp/src/catalogue.ts` | `f2100e66` | `32f361d4` | `ACT_OUTPUT` moved out |
| `packages/mcp/src/inventory.ts` | `9128f3b2` | `dad209ef` | type import from the Client |
| `packages/client/src/describe.ts` | `2ea35fc7` | `43c62d2c` | the bounded description moved out |
| `packages/mcp/src/act-result.ts` | new | `df3f0746` | whole-owner seal for the moved projection and `ACT_OUTPUT` |
| `packages/mcp/src/describe.ts` | new | `a1708220` | whole-owner seal for the moved bounded description |

The witnesses for the request are:

- `ACT_OUTPUT` and `ActResult` agree. The `satisfies` clauses in `packages/mcp/src/act-result.ts` fail the typecheck when a member is missing. `archived submit and settlement stay explicit and terminal without inventing missing facts` in `packages/mcp/test/errors.test.ts` checks the `answer` and `phase` enums, `effects` on all three projections and the retained wording.
- `the tool reference is the list as sent` in `packages/mcp/test/inventory.test.ts` compares `docs/mcp.md` and `docs/mcp-tools.json` with the served list. It failed in `plain-1` and passed in `plain-2`.
- `an over-long capability or step name is refused whole, within the bound` in `packages/mcp/test/budget.test.ts` checks the `prepare` `maxLength` and the byte refusal.

## Open limits

- `@generalbusiness/dap-mcp` changes its public exports. It no longer exports `expectedOf`, `viaLeft`, `effectiveFields` and `finalStates`, or the Client names that `describe.ts` re-exported, such as `ActLike`, `DefinitionLike`, `inline`, `typeWords`, `fieldLines`, `sentence` and `guardSentences`. `projectAnswer` now takes `{ answer }` or `{ archivedSettlement }` and returns `ActResult`. `examples/repo-in-ai/review-control.ts` shows the change for a caller.
- `@generalbusiness/dap-client` no longer exports `DESCRIPTION_CHARS` and `Described`, and `descriptionsOf` no longer returns `describeAct`.
- The tool list grows by 74,746 bytes. The planner decides on `$defs`.
- Commit `c2377a06` fixes the two audit faults in source and adds `fixed-tool scope references: the ID patterns refuse set trailing bits, and settle takes a creation's membership` to `packages/mcp/test/describe.test.ts`. No test or compiler has run on it yet. `docs/mcp.md`, `docs/mcp-tools.json` and the seals for `service.ts:scopeRefArg` and `service.ts:McpService` follow after the gate at `9d3a4fd5` ends. The tool list figures above are at `9d3a4fd5`.
- Two in-process reads by string key remain: `result.structuredContent["error"]` in `#stoppedEarly` in `packages/mcp/src/service.ts`, and `result.structuredContent["localStatus"]` in `packages/mcp/src/views/session.ts`. Before NF-2 there were eight.
- The planner deploys after the landing. `MCP_ENABLED` stays off.
