# Kernel hygiene: K2, K3 and K11

The production kernel no longer depends on package graph or application codecs. Contract, bytes and derive form the workspace boundary. The documented exact noble and jsonata pins are its external dependencies. The structural check and paired control passed, as did SDK production and consumer checks, the Page build and its asset check. All 28 affected compiler roots and all 129 cases in 25 whole files passed. The ordinary gate and exact-head checker review remain pending.

Request `30c7c3ec` and promise `79ee2bae` cover moves only, with no intended change to encoded bytes, digests, pinned definitions, recorded entries or behavior. Ruling `9ed512c0` limits the structural boundary to production module edges and manifests. Tests and tooling remain outside it; production code cannot import an excluded file to evade the check. No deployment is included.

## Implementation

K2 gives `fieldAssignable` one home in `derive/src/field-types.ts`, exported as `dap-derive/field-types`. Package graph imports that implementation. Package validation and its 11 existing integration cases move to platform, exported as `dap-platform/package-validation`. The definition corpus stays in derive.

K3 moves 20 codec modules from bytes into `platform/src/application-codec/`, exposed through `dap-platform/application` and `dap-platform/application-v2`. Eight whole test files move with their 32 existing cases. Importers, exports, manifests, release order and workspace lock records follow the new homes. The existing native `platform/src/application.ts` is preserved. Bytes retains canonical JSON, hashes, signatures and byte domains, without compatibility re-exports of the moved codecs. Source comparisons preserve implementation and witness bodies apart from the reviewed imports; all 32 moved codec cases passed in the affected run.

K11 removes the two tracked files below `examples/demo-repo`. The active policy guide removes its command and link and states the removal. Dated notes and reports remain unchanged. K1, K4, K5, K6 and K10 remain open; other items keep their existing status.

## Completed checks and remaining work

The implementation checkpoint is `fb105fa777a7769ce67f7660e7d7ac5af5720423`. Page regeneration produced identical committed assets, so no empty checkpoint commit was needed. The owning-validation checkpoint is `8bfdc37eff766d2e242cd8ea9bbb674fab185273`, tree `b3d165cb65f4b71ef8800b86c8e628fe12bef349`. Its only change from the implementation checkpoint is seven source-seal map values.

| Check | Actual outcome |
|---|---|
| Dependency preparation | Private copy passed with 6,072 namespace records and 32 relative links. Only the lock stamp payload changed. Compatibility readiness carries from the prior successful maintained invocation and unchanged package, script and patched bundle; it was not rerun. |
| Structural boundary and release modules | Checker passed. Two parser/resolver cases and three release-module cases passed. The paired derive-to-platform import control exited 1 with the intended file-naming refusal; the original file was restored. |
| SDK | The maintained producer and checker both exited 0. This proves the checks they performed, without package publication, installation or browser execution. |
| Page | The build and whole asset check passed. The generated asset bytes match the committed output. No browser or deployment claim follows. |
| Source seals | One maintained producer returned six actual values. Object was parsed once; its value fills two of the seven adopted slots. All four archive values and outside map bytes were preserved. |
| Affected compilers and cases | All 28 compiler roots and the body exited 0. All 129 cases in 25 whole files passed, with no unexpected cases or coverage issues. The full guards remained stable apart from the declared selected cache cells and empty temporary-directory timestamps. |
| Ordinary gate | Pending at the final documentation checkpoint. |
| Exact-head checker review and landing | Pending. The review must cite `docs/kernel.md` section 7. |

The [compact evidence index](2026-10-24-kernel-hygiene-evidence.json) pins the closed results and adoption. The affected run closed naturally with exit 0 at that owning-validation checkpoint. Its measured outer wall time was 60.32 seconds, with 59.96 user seconds and 10.13 system seconds. These costs include nested work and are not additive with child timings. The ordinary gate and exact-head review remain separate obligations.

## Measured local command costs

Root recorded these original outer-command measurements, in seconds. The commands are disjoint. User and system columns are separate CPU observations; nested child timings are not added.

| Runtime command | Wall | User | System |
|---|---:|---:|---:|
| Dependency copy | 6.61 | 3.66 | 2.51 |
| Structural checks and control | 7.15 | 4.80 | 2.15 |
| SDK | 8.30 | 7.43 | 2.92 |
| Page | 4.44 | 3.29 | 1.31 |
| Six source seals | 2.41 | 1.67 | 0.76 |
| Affected compilers and cases | 60.32 | 59.96 | 10.13 |

Metadata captures are separate measured commands:

| Capture | Wall | User | System |
|---|---:|---:|---:|
| Dependencies | 1.80 | 1.12 | 0.68 |
| Structural | 1.51 | 0.97 | 0.50 |
| SDK | 1.72 | 1.00 | 0.58 |
| Page | 1.56 | 0.99 | 0.55 |
| Six source seals | 1.50 | 0.98 | 0.51 |
| Affected compilers and cases | 2.18 | 1.00 | 0.64 |

These are rounded local measurements, not total edit-to-review time or portable performance claims. The ordinary gate has not run and contributes no measured cost here.

The structural check proves dependency placement, not native authority or universal byte compatibility. Existing codec witnesses cover their registered values and contexts. K2, K3 and K11 are not reported closed before the remaining validation and exact-head review satisfy the request.

The [retained validation evidence](2026-10-24-kernel-hygiene-evidence/manifest.json) contains the compact results and their source hashes. The final gate result is recorded separately in Gitseq.
