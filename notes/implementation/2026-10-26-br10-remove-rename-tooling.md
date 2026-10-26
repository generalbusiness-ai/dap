# Remove the completed workspace rename tooling

Request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:d75a32d18bc7edf51ae8c598dba8139668c59106.

## What changed

The completed workspace rename no longer needs its transformation script,
preservation inventory, or operating guide. This cleanup removes these
three files, which together held 782,246 bytes:

- `scripts/rename-workspaces.mjs`
- `scripts/workspace-rename-preservation.json`
- `docs/workspace-rename.md`

The Page's agent invitation instructions name `DAP_HOME`. The existing UI
assertion expects that same name. The regenerated asset serves the updated
instruction. The generated asset changes only that name and its JavaScript digest.

## Decisions and why

Commit `9f5ebc81703ff04d985d3599dfb2780d4cad19eb` retains the exact bytes of
all three removed files. Each file is available with
`git show 9f5ebc81703ff04d985d3599dfb2780d4cad19eb:<path>`.
That commit remains an ancestor of this cleanup's Main base,
`986c712040295bd769c29f870cd49d40b3fc81a0`.

Before this cleanup, no tracked file outside those three files and the
dated review note named the removed tooling. Historical notes retain their
original references. The CLI still accepts `ARTROOM_HOME` as a compatible
alias. This change updates the Page's preferred name without changing
configuration selection.

## Evidence

The dependency copy and Page asset build started at
`a9a0ab7192f89f1f6e6968c00a0bde0052b8ad63`, tree
`c451a4a6dd8d191c8a5b8766c2c128f619b09844`. The generated asset was committed
before owning validation at `9414b878e516386eb93184b5c0a95299de19f309`, tree
`ada045e716dc272baee1da0a6ebb15a5d10328c5`. All owning checks passed and
left that checkpoint clean.

The one ordinary gate ran at `5ff4fc52892c45ba8c6c1d7d0da97a31011f69b4`,
tree `69d166347c5b349d6a177b9a08647f8e79a37afb`. The owning-check tree
`ada045e716dc272baee1da0a6ebb15a5d10328c5` and that gate tree differ only
in this note and the unlanded owning manifest. Source, tests, configuration,
assets, and lock bytes are identical between those two checkpoints.
Final consolidation updates this note and replaces that one unlanded
manifest. It runs no command from the test or gate pipeline.

The gate closed with exit `0`: all gate steps and the five fixed test stages passed.
It took 1440.992162167 seconds elapsed and 1664.5436230000003
child CPU seconds on macOS 27.0.1 arm64, Node v26.12.1, at starting load
`[1.62939453125, 2.2587890625, 2.39892578125]`. These figures come from the gate owner's single monotonic
interval and child resource usage. Cache state: the private exact-lock dependency copy from BR3, with 14 rebound workspace links and named top-level caches omitted; the owning build and checks had run once, with no install or reset.
The public totals in `gate/gate.log` and `gate/stages/test.log` report
57 Node cases passed, 55 Counting cases passed, 2836 plain cases passed
with 1 skipped, and 780 native cases passed with 2 skipped. The kernel
boundary stage passed. `gate/stages/test-evidence/stages.json` records
exit 0 for kernel, Node, Counting, plain, and native. The whole gate and
its clean after-head are recorded in `gate/result.json`, SHA-256
`614f26c800dd2bf5fac80a93ff23488759923ddabd6cafef534c024c4c4df6cd`.
Callback counts below come from the retained `gate/progress.plain.jsonl`
and `gate/progress.native.jsonl`, grouped by the exact `(project, file, id)`
identity for each event. Plain has 2837 actual ready, result, and final
records with no identity gaps. Native has 769 actual ready, 749 result,
and 782 final records. Twenty-two ready identities lack a result, two
result identities lack a ready, thirteen finals lack a ready, and
thirty-three finals lack a result. Both phases have no duplicate or
unidentified callback identities. The missing records remain unknown;
final states do not supply missing starts, results, or execution intervals.
Both Vitest run-end records report zero unhandled errors. No zero count
is inferred for Node or kernel.

The skipped `apps/room/page/test/record.scope.test.ts` module has no
numeric duration in `gate/stages/test-evidence/native.jsonl`. The
maintained summary therefore marks Scope duration coverage partial.
That observation limit is separate from the gate's passed terminal
outcome. Phase and case durations are not summed into whole-gate elapsed
time or assigned the whole command's child CPU.

The [final delivery manifest](evidence/2026-10-26-br10-cleanup.manifest.json)
indexes 60 read-only files under
`/Users/hughpyle/play/artroom-evidence/2026-10-26-br10-cleanup-delivery`,
including the top-level `SHA256SUMS`. Its SHA-256 is
`de2dbd1dd4af875de3db315ff10178396617dee4261be0befc1f827b17af6040`. The `owning/` and `gate/` subdirectories
retain all original source-directory files and indexes. The original
read-only home directories remain in place. `provenance/owning-manifest.json`
retains the superseded unlanded manifest with SHA-256
`6c7b1b06f9dcd47788d879837a3dbedf3b7b91073223288e4c42baded8f6af9a`.
Owner scripts, tested reporter sources, and the consolidation driver are
retained under `owners/`. `delivery-summary.json` records both exact
checkpoints and the source inventories. Raw failures and missing observations
retain their original status.

The dependency copy used BR-3's real private installation at
`cbb08aff65dfbf68008bf27b979b4e4a989ffd38`. Source and target lock bytes and
the earned stamp matched SHA-256
`645224923cabfd70b51b8add2a43be12673444779d18002a42ed4254b3216d6e`.
The driver rebound all 14 workspace links and moved the private physical
copy into this checkout's real `node_modules` directory. It omitted the
source's top-level `.vite` and `.vite-temp` caches. No package installation
ran. The comparison does not authenticate every installed byte or claim
cache ownership. Pool preparation found the supported patch already present
and changed no bytes.

The Page test command below ran from `apps/room/page`, using its own Node
configuration. Its two complete files reported two passed cases. The
active-source Node report separately counted 11 passed cases. The retained
owning driver and `owning/result.json` record exact arguments, working
directories, outcomes, elapsed time, child CPU, machine, and load.

| Check | Command | Exit | Output SHA-256 | Checkpoint |
| --- | --- | --- | --- | --- |
| Private dependency copy | `python3 /private/tmp/artroom-br10-owning-validation-20261026.py copy --source-head cbb08aff65dfbf68008bf27b979b4e4a989ffd38 --head a9a0ab7192f89f1f6e6968c00a0bde0052b8ad63` | 0; 14 links rebound | `670d1bfa473b6b7a912153d7cbd43d32f6b92ab34da2931f4f2bf1e391eeb34e` (`owning/dependency-provenance.json`) | `a9a0ab71` |
| Page asset build | `npm run build --workspace @generalbusiness/dap-page` | 0 | `bf59b1655d939a0103ef0de1963ad6edba58892d1e303408571c6120f04e451d` (`owning/page-build.log`) | `a9a0ab71` |
| Pool preparation | `node scripts/cloudflare-pool-compat.mjs` | 0 | `789f2a3719021f6725b19b5ea52eb3ac436b14f6b084b416d1d6e396e5165289` (`owning/pool-preparation.log`) | `9414b878` |
| Page source compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`owning/page-source-compiler.log`) | `9414b878` |
| Page test compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`owning/page-test-compiler.log`) | `9414b878` |
| Page scope compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.scope.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`owning/page-scope-compiler.log`) | `9414b878` |
| Whole Page UI and asset files | `node /private/tmp/artroom-builder-br10-cleanup-20261026/node_modules/vitest/vitest.mjs run --config vitest.config.ts test/start-ui.test.ts test/assets.test.ts --reporter=default --reporter=json --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-10-26-br10-owning-validation/page-tests.json --reporter=/private/tmp/artroom-builder-br10-cleanup-20261026/scripts/test-progress.mjs` | 0; 2 passed | `3c439db91c734c0d6fd00ccd1ed4cf0297ac46ec06b2a626db85c869c3f382d0` (`owning/page-owning-tests.log`) | `9414b878` |
| Active source | `node --test scripts/active-source.test.mjs` | 0; 11 passed | `7fa958fb3c4fdfb89b0d2f04780cfbeb458b35160bf2dc9a9b442cea0543d46d` (`owning/active-source.log`) | `9414b878` |
| Ordinary gate | `npm run gate` | 0; all stages passed | `32885cd9e2dcc96d2b604b7f6dfe3a18f5c0338a733d287cb1c75311d41fbf68` (`gate/gate.log`) | `5ff4fc52` |

## Open limits

Request `d75a32d18bc7edf51ae8c598dba8139668c59106` owns review of the exact
candidate and landing after review. This evidence follow-up does not complete
the request.
