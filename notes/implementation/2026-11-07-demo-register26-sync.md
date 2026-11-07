# Keep dap-demo's checked-in configuration on both installed roots

Request `4d262a0d`, promise `291c178b`. The checked-in demo configuration
still selected Register 17 after the planner switched dap-demo to Register
26. A deployment from that old file would drop the new rooms' host root.
This change records the live offer settings in the ordinary deployment file.
The planner deploys after review and landing.

## The file matches the retained offer settings

Only four variables change in
[`wrangler.demo.jsonc`](../../apps/room/wrangler.demo.jsonc):
`REGISTER_SCOPE`, `INSTALLED_REGISTER_SCOPES`, `ARTIFACTS_CONFIG`, and
`DEMO_START_CONFIG`. Register 26 becomes current, Register 17 stays
installed, and the Page offer names the actual installed incarnation.
The entrypoint stays `worker.ts`.

The retained nonsecret offer configuration has SHA-256
`14fb81a152cf646867ddcd9a3ddfab83e816f8c5fe054f4e1f6ce83983e0bca6`.
Every complete variable string matches that file. All other configuration
fields match after resolving the entrypoint path. The source keeps the
existing bindings, migrations, namespace, serving limits, and compatibility
settings. The creation-policy parser admits the new cohort and keeps the
explicit old-family allowance.

The [historical packet](2026-11-05-failed-claim-register/deploy.md) now limits
its install and rollback commands to the 6 November switch. Its original
base digest stays fixed, so its renderer refuses the synchronized file.
A runtime rollback from the synchronized configuration must keep both roots
and the current offer. A later selector change needs a reviewed plan.

The observer's two remote assertions now select dap-demo's Artifacts host.
The script matches the planner's previously exercised corrected copy exactly,
SHA-256 `dba7ef31599026ce06e3e9b9d95b708840a22ff627e5d6cdad5ebbf5c6f2bae5`.
This head runs no live token or clone scene.

## Focused checks and dry runs pass

The CLI test compiler passes. A single control restores the old config;
the updated demo witness fails by assertion. The exact new config then
restores, and the complete three-case owner passes. The observer syntax
check passes. The actual production parsers accept the installed-root list,
host roots, creation policy, and Page offer. The historical renderer refuses
the changed base digest as required.

Wrangler 4.147.0 runs from a scratch tool directory. Two deployments with
`--dry-run --keep-vars`, using scratch copies of the synchronized and retained
offer configurations, both exit 0. Their 20 emitted binding rows match.
The complete variable comparison covers the values that Wrangler truncates
for display. The manifest records both bundle digests; their bytes differ,
while both source maps contain the same 524 source contents.

The [focused manifest](evidence/2026-11-07-demo-register26-sync-focused.manifest.json),
SHA-256 `a8c896b1bd95ac988f332a18f0de742322c8edddb1521da8db5c66f146dca10d`,
seals 21 public evidence files and retains 64 raw files privately. Source
hashes stay unchanged during the commands. The named offer config's digest
stays unchanged. The config probe reads no credential or custody file.

One complete gate and independent exact-head review remain due. This record
claims no deployment or parent acceptance.
