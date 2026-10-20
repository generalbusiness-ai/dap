# G5: Grow host link and public configuration

The Grow page currently opens the shared scope-service origin. Planner's
provisioning record `740b21d9` identifies the running Grow room on the
separate `dap-grow` Worker. This head points the page to that Worker's
invitation screen and records its public deployment configuration.

Request `91985004`, builder promise `24427bec`; hosting decision
`39a3be6d`. The isolated worktree starts from audited/published Main
`8aad37bb`. The native D1 landing audit `0e7d0edc` is adopted by
`1f15a3d0`. No pending runtime implementation is imported.

## Public changes

The Grow page's existing link and its built-output assertion now name
`https://dap-grow.inguz.workers.dev/page/#/invitation`. The page copy,
layout, assets and other destinations keep their existing bytes.

`apps/room/wrangler.grow.jsonc` uses the same Worker entry, compatibility,
Durable Object classes/migrations, metrics/version, R2 and Artifacts
bindings as `wrangler.jsonc`. Its Worker name is `dap-grow`; its public
variables match the commissioning request: deployment `dap-grow-v1`, the
exact Register17/Artifacts settings and the single existing signed demo
release/publisher trust row. `SESSION_SECRET` is set separately from stdin.
The comment shows the pinned Wrangler command from a scratch directory.

The runbook and deployment page name the Worker and config. The runbook
attributes its dated provisioning status to planner's public record:
confirmed room siblings, active install 2, Site/Room A, three enrolled
members and a simulator ticking every UTC minute. The recorded visitor,
person-authorize and recovery acceptance remains open. This source change
performs no deployment or hosted acceptance step.

## Verification

The owning built-output homepage case passes for all six built pages,
including the changed Grow destination. The independent public-config
comparison passes: every base binding, migration and compatibility field
matches; the three public variables match the request; release/publisher
match the actual demo constants; secret fields are absent; the exact
changed-path set is these six files. The packet remains byte-exact Main,
SHA-256 `b1563c946435c2aad7173b5ae8a32da52c33d2a03b90faee80784c79ebcd96e9`.

The original focused wrapper closes naturally zero. Its homepage phase
uses 0.157468583 seconds wall / 0.167076 CPU; the config phase uses
0.235617750 / 0.236725 seconds. Raw logs and natural closure are
`/tmp/g5-host-link-focused-20261020*`; the config result is
`/tmp/g5-host-link-config-check-20261020.json`. These are local source
checks, not a live settings readback or visitor acceptance.

Dependencies are a verified physical copy of the current K1 finite grant:
5,499 regular files, matching hashes/bytes/modes and distinct inodes, plus
31 contained links. All originals are rechecked unchanged. The owned lock
stamp matches; only the owned Vitest result cache is cleared. Zero installs.
Receipt: `/tmp/g5-host-link-private-dependency-copy-20261020.json`.
The original `npm run gate` closes naturally zero at code head
`2cafe68a568415ece40083d035356b0a83376b91`, tree
`539455e8af84eeaa2d3e964c93c373fb6b2e7113`: 1,977 Vitest cases pass,
three existing cases skip, and 31 Node checks and 55 Counter checks pass.
The gate uses 553.540497292 seconds wall / 788.647495 seconds child CPU.
Its outer wrapper uses 554.979235959 seconds including inventories.
This is macOS 27.0.1 arm64, Node 26.12, npm 11.20, on a shared host with
warm private dependencies; starting load averages are 2.113281, 1.839355
and 1.882324. All 2,552 tracked source files keep their bytes and modes;
only the owned Vitest result cache changes among dependencies. The lock
stamp remains exact, the checkout remains clean, and no install occurs.

The raw test log retains scripted reset and retention faults, four Git
content-type warnings, an RPC disposal warning and an uncaught
cross-Durable-Object I/O error involving `RefcountedCanceler`. The last
two diagnostics remain unclassified. A passing exit does not establish
runtime stability, disposal or drain completion.

The closed gate log, preflight, postflight, closure and validation are
`/tmp/g5-host-link-final-gate-20261020*`. The six phase files are in
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.f8X22Fpv9m`;
Counter output is in the exact `artroom-counting-node-0sz5nG` directory
under that same temporary root. Review custody is limited to the explicit
closed evidence map, not these path prefixes or adjacent files.

Only this report changes after the code gate. Source and tests retain the
gated tree's bytes; the final report commit records its separate tree.
The document-only rule in `docs/testing.md` therefore keeps this original
gate instead of repeating the whole suite.
