# LS5: recognize room-owned storage before initialization

Planner ruling `6f86063486bcd88ed631b449c44cbaa8bed18284` accepts the positive room-table predicate after Linux finding `812256f971b33d884528704ff34865573d4048fe`. This source draft has not been applied, compiled, tested, gated or deployed. It changes Worker bundles and no presentation identifier. It adds no kernel form, platform definition, read authority or host-table blacklist.

The failed Linux diagnostic, run 43789667876 at `86221eb3372aa9df999f225e2b30ecb823968959`, received a complete backend 410 with the room-retired shape. Its catalog returned one aggregate row, `any_table=1, format_table=0`; the word reader did not run. That is not evidence of exactly one table. Pinned celld v0.6.3 initializes host tables before the application constructor. The old predicate therefore called unused room storage retired. Both diagnostic heads remain unlanded; this change preserves their failure status.

## Source and historical coverage

The private classifier list has 66 distinct earlier owned names, including `room_record_format`. It changes only the first EXISTS to recognize those names. The existing result shape, numeric checks, exact bounded word query, fail-closed results and both public APIs remain unchanged. ScopeObject and McpAgent still call the same classifier. No extra SQL read precedes them.

The source audit covers Scope `59c019ef47756733d055b985a43feee015cb164d^..5784e23d8197d5cbea819849af3830131449c874` and MCP `a866c9aa699677555985d403e2071c6ed260046c^..5784e23d8197d5cbea819849af3830131449c874`. All 52 historical SqliteStore source versions execute a schema that creates `meta`. All 176 HostedAgent constructors create `agent` before any branch. Complete CREATE/ALTER/DROP history adds no removed or renamed table beyond the recorded current names. The two independent ScopeIndex tables stay outside room ownership. The shared `record` name enters the union once.

The maintained historical fixture records those ranges and names. One Node Security case derives current names from the seventeen actual schema sources and checks the closed classifier list against current plus historical ownership. New unclassified CREATE sites, unsupported targets, missing historical names and duplicates fail. It classifies every candidate CREATE case-insensitively, accepts existing fixed INDEX/TRIGGER headers separately, and rejects computed or unsupported fragments even after a valid statement. Within-case fixed-index and negative split/mixed fixtures exercise that boundary. It imports no production module and executes no SQL.

Storage with every room-owned table erased from outside reads as unused. This classifier cannot recover evidence that no longer exists. It does not migrate an old room or read its old journal into the new format.

## Actual-caller witnesses

The TEST Worker seeds storage before either real constructor without replacing a query result. One case creates host storage through the actual synchronous KV API, proves real fresh install/rollback and current restart, and retains the host value. A second case seeds only the original `meta` table and proves Scope stays retired without schema or word writes. The third uses the original isolated `agent` schema and the actual McpAgent entry, proving no hosted initialization or migration. The old cases and deadlines stay unchanged.

The one control removes only the unique quoted `meta` element and runs the whole creation-versions Worker owner. The required distinction is the named real SQLite retired assertion, not a source-pin failure or generic exception. The control restores exact source bytes and mode. No third green or sweep is planned.

## Validation and deployment

All new-head validation is UNRUN. The following table records the reported failure and the commands still owed; it claims no new counts, walls or digests.

| Check | Command or source | Result and limit |
| --- | --- | --- |
| Second Linux diagnostic | Planner-owned Local Worker workflow run 43789667876; local argv not inspected; assertion `812256f971b33d884528704ff34865573d4048fe` | FAIL: complete backend 410, retired-stop, aggregate cells 1/0, no word read. Not a source acceptance result. |
| Affected compilers | Pinned local TypeScript with each existing affected `-p` context; root binds final head | UNRUN. No compiler result inferred from source. |
| Whole Scope owner | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/creation-versions.test.ts` | UNRUN, including both new Scope cases and all old cases. |
| Whole Agent owner | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope-stories packages/mcp/test/hosted.scope.test.ts` | UNRUN, including the actual retired Agent case and all old cases. |
| Whole Security owner | `node --test scripts/security-entry-points.test.mjs` | UNRUN, including the source pin. No seal calculation or adoption claimed. |
| Meta control | `node scripts/control.mjs packages/scope/src/room-format.ts '  "meta",' '' --expect 'an earlier Scope meta table keeps the actual room retired without writes' -- packages/scope --config vitest.worker.config.ts test/creation-versions.test.ts` | UNRUN. Its baseline covers the positive Scope owner; no duplicate positive required. |
| Required preflight and gate | Maintained shared-helper check, whole typecheck, then `npm run gate` at root-bound source | UNRUN. One gate after the three approved heads, before E4/A1/CR2. |
| Planner Linux workflow and review | Planner runs Local Worker smoke on the gated diagnostic head, then checker review | UNRUN. A green workflow must precede review. |

The deployment requires the planner to probe one retired room on each room Worker for HTTP 410 before deployment and after deployment. The planner owns those probes and the later deployment. No local test substitutes for them. The change waits for no global version decision and carries no old diagnostic branch into main. No operator credential, private home or provider input belongs in evidence.
