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

Validation has not run yet. The planner closed the R3 deployment window in
`247c9435` and released the local slot for the focused checks and final gate.
This split changes no recorded format, definition pin or deployment setting.
