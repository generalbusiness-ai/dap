# Split command, hosted MCP and archive wiring owners

Request `c7853c21`, promise `1d4473a5`. The source starts at main
`f1f6a8b97d02fd961a54ee62ae7fad1a8b0fa41a`.

`commands.ts` forwards its existing public names to modules for installation,
membership, scope reads, verification, repository access, changes and issues.
`command-context.ts` owns shared types. `command-targets.ts` owns existing
scope lookup and local input helpers. `command-support.ts` keeps its runtime
declarations and the single `Stop` identity, with its context type import
following the new type owner.

`worker-mcp.ts` owns the hosted route, body reader, observation and SQL
adapters, `McpRegistry` and `McpAgent`. `worker.ts` keeps their public exports.
`object-archive.ts` owns archive configuration, driver construction and the
fixture floor callback. These moves separate the owners of unrelated edits
while preserving the command, HTTP and RPC surfaces.

The recorded CLI comparison retains all 135 original declarations byte for
byte, excluding export wrappers needed between modules. The Worker retains
all 36 original declarations. All 90 moved CLI and MCP runtime declarations
keep their original named hashes. Imports and explicit facade exports connect
the new owners. The context module uses only type imports. Each new owner has a
module seal, and its runtime declarations each keep one named seal. The
existing support module retains its whole-file seal.

The MCP module imports the hoisted `route` function from `worker.ts`. Only an
agent's lazy fetch callback calls it; module initialization does not call the
route. The archive constructor still configures the archive, assigns
`archiveRestart`, assigns the driver, then reads the floor policy. The factory
keeps its `wiring` receiver. Clock, policy, pin, SQL transaction and discovery
reads retain their timing and receivers. The scope, chains and read-SQL fields
passed to the helper are readonly object fields.

The security inventory follows the new hosted owner. Its first focused run
rejected the Worker re-export form, so the finite model now accepts only the
exact MCP forward, its four exported declarations and its direct
`DurableObject` import. Controls reject missing, renamed or aliased forwards,
an extra hosted export and a hosted RPC base. Existing direct RPC, route,
method, gate, body and seal controls remain. The display-body control follows
`entryLine` to `command-scope.ts`; the import control uses the surviving
`readPublicOrigin` import. The CLI story/claim, archive, restart and object
test assertions stay unchanged.

The first final gate found two stale settings-document reader paths. Under
planner ruling `33ff7a38`, the correction changes readers in ten existing rows
and regenerates the lookup. Every setting kind, value, deployment, parser and
missing/invalid/health rule stays fixed. A read-only in-memory classification
reported 313 deployment/name rows, 1,602 source reads and 13 configurations.

The final gate and required Card workflow ran at
`d0b362adab7823fb6c72fb805dc3b9daef7110b0`, tree
`36d92484cf069908481d17cfe5938eb674b2e3ff`. The review head adds only this note
and evidence manifests. Production, test and seal bytes have not changed
since the first gate at `2ca326b594`; the settings correction is documentation.

The final gate's actual `gate.exit` says 0. The driver closed with unchanged
source and no owned process left. Complete ledgers report Node 144, Counting
56, Plain 4,028 passed plus one skip, and Native 1,124 passed plus two skips.
There are no failed or unhandled cases, contradictions or report errors.
The unchanged selector omits Scale for these 23 paths. Its 105 unknown Node
observations are the normal enqueue/dequeue/complete triples for 35 file
wrappers. The wholly skipped Page recorder has no measured final module
duration. The summary retains that unknown duration. The outer driver measured
985.341 seconds with a monotonic clock; command CPU and case durations remain
separate observations.

The focused plan pins tracked source, 14 owned workspace links, 48 source
export aliases, tool bytes and external inputs. Its selected runtime tests
match the terminal R3 gate's frozen bytes. Saved complete case identities
avoid a discovery run, and the same-run reporter verifies actual project,
file, pool and full title. Original pools, workers and deadlines remain.

| Check | Checkpoint | Command | Exit | Output SHA-256 |
|---|---|---|---|---|
| Initial finite export inventory: 6 passed, 6 failed; compilers/runtime unreached | `811d3ba98e` | `node --test --test-reporter=tap scripts/security-entry-points.test.mjs` | 1 | `49759cf220f48dac38ff3f02c48e268a0908ae8ef9751e6a4300aad199742f52` |
| Corrected finite inventory: all 12 cases | `911ca2a141` | `Same Node owner` | 0 | `c328103f9796d2cd590b7bef062476a597a91107593b01c05c832c1ae669f857` |
| All 16 affected compiler contexts, then 105 cases in 19 whole owners | `911ca2a141` | `node scripts/focused-check.mjs <frozen-plan> <new-evidence>/focused` | 0 | `1caaff538e545bca816708dcb376215747453da15919201fef7b98e5d4d9dd82` |
| Complete 105-case runtime ledger, with no extra or unfinished case | `911ca2a141` | `Same focused invocation and structured reporter` | 0 | `5aa25e007f46a89903c68389c114f3675ebd9b0131d087d6fb9926e3c579fc3f` |
| First full gate: Node 142 passed, 2 settings-document failures; later test phases unreached | `2ca326b594` | `npm run gate` | 1 | `00166c46d9c4ca2f0185e4ae8604e0e1a0e1ee363ee0f844ceedbb963f7f9e80` |
| Page workflow 42680761832: all four browser scripts | `2ca326b594` | `Existing page-browser.yml workflow` | 0 | `12aebe5febc6fe98a2c6c7af47f49828eaa2e3c3b7efc123e7b0d45a792cb238` |
| Card workflow 42680775846: Grow routing timed out at the chat wait | `2ca326b594` | `Existing views-browser.yml workflow` | 1 | `8eadddc5b48b76e445010749e1ea21fae73263dd863c509090ed5ece204703a6` |
| One unchanged local Grow-routing owner: both widths, consistent replay, no browser errors | `2ca326b594` | `node --import tsx packages/mcp/test/grow-routing-browser.mjs` | 0 | `52df3104b2b17894580e6b684fb1b2e7ca9208d1a20f0af2b4a3b19c87b145d8` |
| Authorized second gate: 5,352 passed, 3 skipped; all phases complete | `d0b362adab` | `npm run gate` | 0 | `71b23c8ef9ece2d5848277cfe7a4374376de30e8ab69d29f980fd15ef391e80d` |
| Required final Card workflow 42686766157: all three browser scripts and generated-card equality | `d0b362adab` | `Existing views-browser.yml workflow, once` | 0 | `bfbdd2f3e56b87a3f76d94bd23150acd9958dfe25eca5644bbb86054bcb90f90` |

The first gate remains failed. Its first metadata analysis also failed because
Counting had never produced a source map. Both errors remain in the raw unit.
A corrected reader analyzed that same run with Counting marked unreached.
No test rerun took place during analysis or sealing.

The first [Card run](https://github.com/generalbusiness-ai/dap/actions/runs/42680775846)
passed generated-card equality, the card browser and Grow room scripts, then
timed out after 30 seconds waiting for one chat message after **Report in
chat**. The CI log did not retain the actual message count or bridge errors.
Under ruling `41db04f1`, the unchanged Grow-routing owner ran once locally,
with the original fixtures, 320 and 592 widths and 30-second wait. Playwright
1.63.0 and Chromium revision 1243 ran on macOS arm64 because the Browser plugin
was unavailable. Both widths passed with consistent replay and no recorded
browser errors. Source and tool hashes matched, and the process group closed.
I inspected both completed-task screenshots. The required final
[Card run](https://github.com/generalbusiness-ai/dap/actions/runs/42686766157)
then passed every script at the final gate head. The earlier timeout remains
unexplained; these passes do not establish its cause. The earlier
[Page run](https://github.com/generalbusiness-ai/dap/actions/runs/42680761832)
passed, and its runtime source has not changed since then.

The following six manifests name all 128 public files. Every listed hash and
read-only mode has been checked. Complete raw output, frozen inputs, TEST
signing custody and host proof stay private. The raw and public units remain
read-only for at least 30 days after landing.

- [pre-gate](evidence/2026-11-09-br14-pre-gate.manifest.json): 48 public files, SHA-256 `cbe163ad97759f01044783a0ce30d8fd629f439491f5fa2bf1d1eaccb1208957`.
- [failed-gate](evidence/2026-11-09-br14-failed-gate.manifest.json): 19 public files, SHA-256 `0a42b67e264b15478c6e4497260a7249e3e0606623fe1fbda994172e905e4f0c`.
- [browser-workflows](evidence/2026-11-09-br14-browser-workflows.manifest.json): 12 public files, SHA-256 `7bbc3e2b3b81cbbafc80000685a5c8c1a61afffb8eed43e02e6118a1b8857b41`.
- [grow-routing-validation](evidence/2026-11-09-br14-grow-routing-validation.manifest.json): 26 public files, SHA-256 `8904ca95c22d60636e523e0b04a3ad88e8e92b0452323f2f2823c0823ae07007`.
- [gate2](evidence/2026-11-09-br14-gate2.manifest.json): 16 public files, SHA-256 `5dc1d1f86dc7b0d8f0cbc24e553c29ddb89a462259e3beb3e3386ec1bb9dcaf6`.
- [final-card](evidence/2026-11-09-br14-final-card.manifest.json): 7 public files, SHA-256 `a49034ed80b1b80822170b07c74e31fe19b05edd54279df64e6029cbd49f190c`.

Request `80424be8` owns the retained unexplained CI timeout; ruling `41db04f1`
specifies the passing diagnostic and final workflow required before review.
R3a request `31f98f33` owns the existing denied-key exhaustion fix. This split
leaves that authority behavior unchanged. BR-14 still requires exact-head
review under `c7853c21`. No recorded format, definition pin or setting changes,
and no hosted scene, provider custody or live acceptance follows from these
fixture checks. The planner deploys after an approved landing.
