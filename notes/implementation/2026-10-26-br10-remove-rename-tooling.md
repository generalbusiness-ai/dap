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
instruction. Its JavaScript changes only that name and its generated digest.

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
before validation. All owning checks ran at
`9414b878e516386eb93184b5c0a95299de19f309`, tree
`ada045e716dc272baee1da0a6ebb15a5d10328c5`. They passed and left that
checkpoint clean. This follow-up changes only this note and its manifest.

The [owning-validation manifest](evidence/2026-10-26-br10-owning-validation.manifest.json)
indexes 15 read-only files under
`/Users/hughpyle/play/artroom-evidence/2026-10-26-br10-owning-validation`,
including its top-level `SHA256SUMS`. Its SHA-256 is
`6c7b1b06f9dcd47788d879837a3dbedf3b7b91073223288e4c42baded8f6af9a`.
The retained driver and `result.json` record the exact arguments, working
directories, outcomes, elapsed time, child CPU, machine, and load. Timings
come from each command's monotonic interval and child resource usage.

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
active-source Node report separately counted 11 passed cases.

| Check | Command | Exit | Output SHA-256 | Checkpoint |
| --- | --- | --- | --- | --- |
| Private dependency copy | `python3 /private/tmp/artroom-br10-owning-validation-20261026.py copy --source-head cbb08aff65dfbf68008bf27b979b4e4a989ffd38 --head a9a0ab7192f89f1f6e6968c00a0bde0052b8ad63` | 0; 14 links rebound | `670d1bfa473b6b7a912153d7cbd43d32f6b92ab34da2931f4f2bf1e391eeb34e` (`dependency-provenance.json`) | `a9a0ab71` |
| Page asset build | `npm run build --workspace @generalbusiness/dap-page` | 0 | `bf59b1655d939a0103ef0de1963ad6edba58892d1e303408571c6120f04e451d` (`page-build.log`) | `a9a0ab71` |
| Pool preparation | `node scripts/cloudflare-pool-compat.mjs` | 0 | `789f2a3719021f6725b19b5ea52eb3ac436b14f6b084b416d1d6e396e5165289` (`pool-preparation.log`) | `9414b878` |
| Page source compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`page-source-compiler.log`) | `9414b878` |
| Page test compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`page-test-compiler.log`) | `9414b878` |
| Page scope compiler | `node node_modules/typescript/bin/tsc -p apps/room/page/tsconfig.scope.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`page-scope-compiler.log`) | `9414b878` |
| Whole Page UI and asset files | `node /private/tmp/artroom-builder-br10-cleanup-20261026/node_modules/vitest/vitest.mjs run --config vitest.config.ts test/start-ui.test.ts test/assets.test.ts --reporter=default --reporter=json --outputFile.json=/Users/hughpyle/play/artroom-evidence/2026-10-26-br10-owning-validation/page-tests.json --reporter=/private/tmp/artroom-builder-br10-cleanup-20261026/scripts/test-progress.mjs` | 0; 2 passed | `3c439db91c734c0d6fd00ccd1ed4cf0297ac46ec06b2a626db85c869c3f382d0` (`page-owning-tests.log`) | `9414b878` |
| Active source | `node --test scripts/active-source.test.mjs` | 0; 11 passed | `7fa958fb3c4fdfb89b0d2f04780cfbeb458b35160bf2dc9a9b442cea0543d46d` (`active-source.log`) | `9414b878` |

## Open limits

Request `d75a32d18bc7edf51ae8c598dba8139668c59106` owns the ordinary gate,
its retained evidence, and review of the exact candidate. The owning checks
do not establish a passing gate. No ordinary gate has run for BR-10 yet,
and this evidence follow-up does not complete the request.
