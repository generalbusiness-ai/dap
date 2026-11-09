# Split command, hosted MCP and archive wiring owners

Request `c7853c21`, promise `1d4473a5`. The source starts at main
`f1f6a8b97d02fd961a54ee62ae7fad1a8b0fa41a`.

`commands.ts` forwards its existing public names to command modules for
installation, membership, scope reads, verification, repository access,
changes and issues. `command-context.ts` holds the shared types.
`command-targets.ts` holds the existing scope lookup and local input helpers.
`command-support.ts` keeps its original runtime declarations and the single
`Stop` identity. Its context type import follows the new type owner.

The CLI move retains all 135 original declarations byte for byte, apart from
the export wrappers that expose helpers between these modules. Imports and
exports change to connect the moved declarations. The context module has
only type imports, so reading its types adds no runtime dependency.

`worker-mcp.ts` owns the hosted route, its body reader, the observation and
SQL adapters, and `McpRegistry` and `McpAgent`. `worker.ts` keeps their public
exports. All 36 original Worker declarations retain their bytes. The MCP
module imports the hoisted `route` function from `worker.ts`; only an agent's
lazy fetch callback calls it. Module initialization does not call the route.

`object-archive.ts` holds archive configuration, driver construction and the
fixture floor callback. The object still configures the archive, assigns
`archiveRestart`, assigns the driver, then reads the floor policy. The
factory keeps its `wiring` receiver. Clock, policy, pin, SQL transaction and
discovery reads retain their original timing and receivers. The scope,
chains and read-SQL fields passed to the helper are readonly object fields.

The security inventory reads the hosted route from its new owner. Every
runtime declaration keeps a named seal, and each module has a module seal.
The moved CLI and MCP runtime declarations keep their original hashes.
The existing structural controls follow the new display-helper path and a
surviving Worker import. Route and gate assertions retain their meanings.
The CLI stories, claim, archive, restart and object tests remain unchanged.

The first focused pipeline stopped at the security inventory: six cases
passed, and six rejected the new Worker re-export form. No compiler or
runtime test started. The raw unit `2026-11-09-br14-focused` retains exit 1.
The finite export model now checks the exact MCP forward, the hosted module's
four exported declarations and its direct `DurableObject` import. Controls
reject a missing, renamed or aliased forward, an extra hosted export and a
hosted RPC base. The existing direct RPC export control remains.

The planner closed the R3 deployment window in `247c9435` and released the
local slot for focused checks and the final gate. The focused follow-up passed at `911ca2a1410405672ff9eff26efbaab567324085`,
tree `f327a6d51330fa692aac58ff1d05e785ddd57f29`. Its actual pipeline and
driver exit files both say 0. The source guard matched before and after,
and no owned process remained. The final gate has not run yet.
This split changes no recorded format, definition pin or deployment setting.

The following digests name files in the sealed pre-gate unit. The focused
plan pins every tracked source file, the 14 workspace links, 48 export
aliases, tool bytes and external inputs. Its case ledger comes from the
completed R3 gate after every selected runtime test matches that gate's
frozen test bytes. The same invocation records actual project, file, pool
and full title. It reports all 105 cases passed, with no extra, unfinished
or unrun case and no unhandled error. The outer driver measures elapsed
and CPU time separately from individual case durations.

| Check | Command | Exit | Output SHA-256 |
|---|---|---|---|
| Initial finite export inventory, 6 passed and 6 failed; compiler and runtime phases unreached | `node --test --test-reporter=tap scripts/security-entry-points.test.mjs` | 1 | `49759cf220f48dac38ff3f02c48e268a0908ae8ef9751e6a4300aad199742f52` |
| Corrected finite inventory, all 12 cases | Same command, at the follow-up checkpoint | 0 | `c328103f9796d2cd590b7bef062476a597a91107593b01c05c832c1ae669f857` |
| All 16 affected compiler contexts, then the unchanged runtime owners | `node scripts/focused-check.mjs <frozen-plan> <evidence>/focused` | 0 | `1caaff538e545bca816708dcb376215747453da15919201fef7b98e5d4d9dd82` |
| Complete runtime coverage: 105 cases in 19 whole owners | Same focused invocation and its structured reporter | 0 | `5aa25e007f46a89903c68389c114f3675ebd9b0131d087d6fb9926e3c579fc3f` |

The [pre-gate manifest](evidence/2026-11-09-br14-pre-gate.manifest.json),
SHA-256 `cbe163ad97759f01044783a0ce30d8fd629f439491f5fa2bf1d1eaccb1208957`,
names all 48 public files under
`~/play/artroom-evidence/2026-11-09-br14-pre-gate/`. The two raw units keep
complete outputs, guards, timing, reports, frozen scratch inputs and TEST
custody privately. Both raw units and the public unit are read-only and
remain for at least 30 days after landing. The public packet contains no
private request or signer body.

BR-14 still owes the final gate and exact-head review under `c7853c21`.
The planner's R3a request `31f98f33` owns the existing denied-key exhaustion
fix. This split leaves that authority behavior unchanged. No hosted scene,
provider custody, deployment or live acceptance follows from these checks.

The first final gate ran at `2ca326b5942b073575e7198a77aaa9882a37bf35`,
tree `eb6947de93a7e9a9e18b14ba2f10f694774bff62`. Its actual `gate.exit`
says 1. Pre-test checks and typecheck passed. Node finished with 142 passed
and two failed settings-inventory cases. Counting, Plain and Native never
started. The settings document still listed `worker.ts` for bindings whose
reads moved into `worker-mcp.ts`. The source stayed fixed and the process
group closed. The [failed-gate manifest](evidence/2026-11-09-br14-failed-gate.manifest.json),
SHA-256 `0a42b67e264b15478c6e4497260a7249e3e0606623fe1fbda994172e905e4f0c`,
keeps all 19 public files and the private raw inventory. The first analysis
script also failed because Counting had never produced a source map. That
error remains. A corrected reader analyzed the same gate without a test
rerun and treated Counting as unreached.

Page workflow [42680761832](https://github.com/generalbusiness-ai/dap/actions/runs/42680761832)
passed at that head. Card workflow [42680775846](https://github.com/generalbusiness-ai/dap/actions/runs/42680775846)
passed generated-card equality, the card browser and Grow room scripts,
then timed out after 30 seconds in the Grow routing script. It waited for
one chat message after **Report in chat**. The CI log did not retain the
observed message count or bridge errors. Its cause remains unexplained.
The [browser manifest](evidence/2026-11-09-br14-browser-workflows.manifest.json),
SHA-256 `7bbc3e2b3b81cbbafc80000685a5c8c1a61afffb8eed43e02e6118a1b8857b41`,
keeps the terminal results and original failed log in 12 public files.

Planner ruling `41db04f1` authorized one unchanged local Grow routing owner
before another gate. The original 320 and 592 widths, fixtures and 30-second
wait ran with Playwright 1.63.0 and Chromium revision 1243 on macOS arm64.
The Browser plugin was unavailable. Both widths passed, replay reported
consistent and the recorded browser error lists were empty. Actual owner
and driver exits both say 0. Source and tool hashes matched before and
after, and the process group closed. I inspected the two completed-task
screenshots. This local pass does not explain the Linux CI timeout.
The [diagnostic manifest](evidence/2026-11-09-br14-grow-routing-validation.manifest.json),
SHA-256 `8904ca95c22d60636e523e0b04a3ad88e8e92b0452323f2f2823c0823ae07007`,
keeps 26 public files, including screenshots. Raw signed TEST requests and
host proof stay private. Its result digest is
`52df3104b2b17894580e6b684fb1b2e7ca9208d1a20f0af2b4a3b19c87b145d8`.

Planner ruling `33ff7a38` authorizes the reader-path correction and one new
unchanged full gate. The correction changes reader paths in ten existing
settings rows and regenerates the lookup. It changes no setting value,
deployment, parser or missing/invalid/health rule. A read-only check with an
in-memory document override classified 313 deployment/name rows, 1,602
source reads and 13 configurations. Runtime, test and declaration-seal
bytes stay fixed. The second gate has not run yet. After it passes, the
planner requires one Card workflow at the final source head. Another Card
failure requires a report before further work.
