# Transport-neutral Client form and one field checker

For request `6050f6ea` (NF-1) and promise `90c57c85`.
Planner request `1a9330c2` states the problems. Ruling `df45027e` sets the order.
The base is main `28aa0446`.
The gated source is `1fa60702`, tree `afbcc1364ae67518832eba6ed3400dcb826f57e3`.
This note and its manifest change only documents from that source.

## What changed

The Client `Form` no longer carries an MCP envelope schema.
`Form` loses `inputSchema`, and `FormContext` loses `target`.
`Form` gains the declared `presents` and the `beside` flags from `besideOf`.
This revises the `formFor` contract of ruling `0be8be71`.

MCP owns its envelope schemas.
`actInputSchema`, `AT_INPUT`, `presentedSchema` and `schemaOf` move from `packages/client/src/describe.ts` to the new `packages/mcp/src/input-schema.ts`.
`actTool` in `packages/mcp/src/catalogue.ts` builds the tool's `inputSchema` from the form and the binding's target.
`packages/mcp/src/describe.ts` re-exports the moved names, so the MCP module exports stay the same.

One checker shapes declared fields.
`packages/mcp/src/shape.ts` loses its per-type `switch` and calls `shapeFieldsOf` from `packages/client/src/declared.ts`.
The Client checker takes three options, each off by default:

- `member` turns an `@handle` into a member reference.
- `texts` accepts a detached text that the caller gives by its digest.
- `platformMarks` passes a platform-mark field as given. The scope's rule decides it.

A refused value throws `FieldShapeError` with a fault code and the field path as segments.
MCP maps each code to its existing words through `FIELD_REFUSALS`.
`satisfies Record<ShapeFaultCode, …>` makes the table cover every code.

The two `time` schemas in `docs/mcp-tools.json` gain the pattern of `TIME` from `packages/bytes/src/ids.ts` and a description.
The maintained reference writer produced both changes.

The security inventory in `scripts/security-entry-points.test.mjs` takes three refreshed seals: the service module, the catalogue and the Client describe owner.
It adds one whole-owner seal for `packages/mcp/src/input-schema.ts`, so the moved schema code stays covered.

`apps/room/page/assets.ts` is the Page build of the smaller Client.
The SQLite custody test that archives records past the count now reads the test clock. The evidence section says why.

## Decisions and why

**MCP refuses `-0` at the field path.**
The kernel and the Client already refuse it.
Before this change, MCP accepted `-0`, and canonical encoding refused it later with no path.
The Client checker's `int` case now decides for both transports.

**The `time` schema states the one form that `timeMs` accepts.**
The schema keeps `format: "date-time"`, adds the `TIME` pattern and says: UTC, ending in Z, no fraction for whole seconds, otherwise three digits.
The pattern also admits `.000Z`, which `timeMs` refuses.
The checker refuses that value at the field path with the existing words.

**No other MCP refusal wording changes.**
`FIELD_REFUSALS` keeps every word MCP sent before.
The wording comes from the declaration, never from the refused value.

**A new field type stops the build.**
The Client checker ends with `const unhandled: never = type`.
MCP passes the whole Contract `FieldType` union to the Client checker and keeps no list of its own.
The old MCP `default` branch passed an unknown type through unchecked. That branch is gone.

**The default Client API keeps its behaviour.**
Without options, an `@handle` is not a member reference, a digest is checked as text, and a platform mark is refused.
Only MCP turns the three options on.

**Out of scope.**
The request leaves out `fitsFieldType`, `mostBytes`, `fieldAssignable`, the two parsers of a declared type, the room page's `Offered` builder and the typed fold. Request `5b2628b6` parks the typed fold.

## Evidence

The [manifest](evidence/2026-11-12-neutral-form-nf1.manifest.json) lists every cited file with its bytes and SHA-256.
Paths are relative to `~/play/artroom-evidence`.

| Check | Head and command | Exit and result | Output |
|---|---|---|---|
| Working checks | `6d12e6cf`: compatibility, 26 compilers, one Plain body over six owners with `MCP_WRITE_DOCS=1`, five document checks | All 33 commands exited 0. The Plain body passed 45 tests and skipped 1 existing budget test. START `00c2bf16`, END `bc93b7ad` | `2026-11-12-nf1-working-6d12e6cf-00c2bf16/04-focused-and-generated-reference.stdout` |
| Seal refresh and source inventory | `6d12e6cf`: maintained seal functions, then `node --test scripts/active-source.test.mjs scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | 0. All 38 maintained values match the committed literals. 27 tests passed. START `6be5a3ad`, END `4687a885` | `2026-11-12-nf1-maintained-seals-6be5a3ad/security-source.stdout` |
| `-0` control | `77e534cc`: `node scripts/control.mjs packages/client/src/declared.ts` with the `-0` guard removed, `--expect` the MCP shaping test, on `packages/mcp test/shape.test.ts` | 0, distinguishes. Before: 4 passed. After: 3 passed and 1 failed by assertion at `shape.test.ts:106`, the refusal at `fields.payload.counts.1`. START `f0e1b3c9`, END `dcc15466` | `2026-11-12-nf1-control-77e534cc-f0e1b3c9/control.stderr` |
| First gate | `77e534cc`: `npm run gate` | 1. Plain failed 2 of 4,547 tests, and Native was not reached. START `691f83e1`, END `6975f5f2` | `2026-11-12-nf1-gate-77e534cc/gate.stdout` |
| Repairs | `1fa60702`: `npm run build --workspace @generalbusiness/dap-page`, then the two failed owners in one Plain body | Both exit 0. The rebuilt module is 2,431,533 bytes, SHA `830c9af9`. 21 tests passed | `2026-11-12-nf1-gate-repair-77e534cc/owners.stdout` |
| Fresh gate | `1fa60702`: `npm run gate` | 0. Node 169 of 169, Counting 56 of 56, Plain 4,546 of 4,547 with 1 skip, Native 1,132 of 1,134 with 2 skips. START `8c80d9de`, END `6f6c5e35` | `2026-11-12-nf1-gate-1fa60702/gate.stdout` |
| Card CI | `77e534cc`: branch push | Success, run 43305737220. The repairs change no path in the Card filter | `2026-11-12-nf1-ci-1fa60702/run-43305737220.json` |
| Page CI | `1fa60702`: branch push | Success, run 43306679834 | `2026-11-12-nf1-ci-1fa60702/run-43306679834.json` |

The first gate failed on two files.
The committed Page module was older than its source. NF-1 moves code out of Client, which the Page bundles, so commit `2ede55f5` runs the Page build again.
The SQLite custody test that archives records past the count read the wall clock.
Its records are stamped 2026-10-13 with `ageDays: 30`, so from 2026-11-12T20:00Z every record was past the age, at main `28aa0446` too.
Commit `1fa60702` gives the store the test clock `T`. Production code is unchanged.
Two files failed and Native was not reached, so a fresh gate ran. The first gate stays failed.
Each gate's internal temp directory moved into its evidence directory under ruling `63368b81`. Each directory's `internals-move.json` records both paths.

The witnesses for the request are:

- A new `FieldType` case fails to compile in the MCP path. The never-run call at the end of `MCP field shaping preserves its words, nested paths and explicit value adaptations` in `packages/mcp/test/shape.test.ts` passes a whole `FieldType` to `shapeFields`. The Client checker's `never` assignment refuses an unhandled case. The compilers ran in the working checks and in the gate's typecheck.
- The `-0` refusal names its field path. The same MCP test refuses `[1, -0]` at `fields.payload.counts.1`, and the control above shows that only the Client guard decides it. `packages/client/test/declared.test.ts` refuses `-0` at `fields.outer.amount` through the default API.
- A `time` with an offset fails the schema and the checker alike. `packages/mcp/test/describe.test.ts` tests `2026-11-11T13:00:00+01:00` against the schema pattern and `shapeFields`.
- `docs/mcp-tools.json` differs from main only at the two `inviteEnds` schemas. The maintained writer produced them, and `packages/mcp/test/inventory.test.ts` compares the file in the working checks and the gate.

The tool list grows by 348 bytes in compact JSON, from 170,542 to 170,890 bytes. I measured both sizes with `jq -c . docs/mcp-tools.json` minus its newline, at `28aa0446` and at `77e534cc`. The formatted file grows by 420 bytes. The MCP budget caps each `tools/list` page at 256 KiB and puts no limit on the whole list. `the list per role, in bytes and tokens` in `packages/mcp/test/budget.test.ts` passed in the working checks.

## Open limits

- Request `5b2628b6` owns the typed fold over field types. It stays parked.
- The planner deploys after the landing. `MCP_ENABLED` stays off.
- NF-2 follows this landing, under ruling `df45027e`.
