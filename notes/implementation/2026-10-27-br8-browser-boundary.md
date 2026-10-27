# BR8 browser package boundary — preparation

BR8 has a browser-only package entry and focused validation. The ordinary gate,
final evidence seal, checker review, and landing remain due. This note records
preparation on working sources based on `aa3ae87393745df7d769f72157d8dd6ae93687d9`.
The base commit alone does not identify those uncommitted bytes. Each retained
receipt records its source state or refers to the retained extraction sources.

Rests-On: `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:eea45d24d009ce962505aba810dc250bdc6fd76c`
(request), `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:561b1b81fb00c8e75277fbbce16a22112ece44a5`
(builder promise), and `git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:14678c96c76920eaf111a2ab50621d22b70cc236`
(ruling). Archive readiness under `0f0eeab7` retains priority.

`@generalbusiness/dap-cli/browser` exposes exactly ten runtime values: the nine
functions `describe`, `expectedOf`, `heldActs`, `linkOf`, `valueOf`, `claim`,
`checkClaim`, `issueInvitation`, and `isInvitationIssueInput`, plus `LINK`.
Required Page types use type-only exports. The existing CLI entry remains public.
Four Page runtime imports and the membership-projection type import now use the
subpath. Two Page test mock targets follow that import change with their existing
cases and assertions intact. No relevant Vitest alias rewrites this subpath.

Portable helpers and claim code move to `browser-helpers.ts` and `claim.ts`.
`command-support.ts` owns shared primitives and the single `Stop` class used by
both moved and retained commands. Invitations import portable helpers directly.
The maintained rolldown parser compared all 129 original top-level declaration
ASTs after relocation, excluding comments, locations, and export wrappers. All
47 legacy commands export names remain. This supports preservation of the moved
claim, recovery, custody, and invitation logic, rather than establishing a new
protocol. Fields, pins, defaults, routes, recorded-entry bytes, and protocol
meaning are preserved. No archive cut, deploy, or authority change is included.

The one new plain witness bundles all ten values through the actual package
subpath with installed esbuild 0.28.1, `platform: browser`, and no configured
externals or shims. It checks API identity against the existing CLI entry and the
input graph before tree shaking. The retained graph has 271 inputs and six CLI
runtime modules: `browser.ts`, `browser-helpers.ts`, `claim.ts`,
`command-support.ts`, `invitations.ts`, and `store-signer.ts`. It excludes
`commands.ts`, `line.ts`, and the named Node adapters. Esbuild reports its embedded
helper as one synthetic `<runtime>` external input edge. Only that observed
internal helper is excepted; all other external input edges are forbidden. The
actual output has no imports and exports exactly the ten runtime values.
`browser-package-graph/metafile.json` retains the complete graph.

The compiled control re-exports the same ten values through `index.ts`. API and
reference checks still pass, but the input assertion fails specifically with
`Runtime input closure must exclude commands.ts`. The helper reports one healthy
baseline pass, mutant child exit 1 with one assertion failure, and exact
restoration. Its outer exit 0 means the control distinguished the defect, not
that the mutant passed. `browser-barrel-control/restoration.json` confirms all
18 recorded integration source hashes match before and after.

The existing Page asset script regenerated `apps/room/page/assets.ts`; the
existing asset equality case passed. Exact generated assets and digests are in
`page-generated-output/`. The Page module is 938,284 bytes, SHA-256
`b4c27825ed7afea9508d0f13defec5c400206a2aa85f7a4469c34762b1ae2732`.
`.gitattributes` marks exactly that file, `packages/mcp/src/views/generated.ts`,
and `apps/room/brand/assets.ts` as `-diff linguist-generated=true`. Only the Page
bundle was regenerated. Deploy-time build changes are outside this request.

The actual `sourceSeal` probe retained the original commands owner and computed
seals for `commands.ts`, `browser-helpers.ts`, `claim.ts`, and
`command-support.ts`. The Node inventory passed four cases with those four
owners protected. The inventory implementation and reviewed route table match
the base byte for byte. These AST tripwires do not independently prove runtime
authority. `packages/cli/README.md` received a module-map documentation update
after the focused Native run. Its update changes no source behavior and did not
cause another test run.

All paths in the table are relative to
`/Users/hughpyle/play/artroom-evidence/2026-10-27-br8-browser-boundary`.
Each command reference contains the recorded argv and cwd. Output hashes are
SHA-256; separate stderr hashes are in receipts that split the streams. The two
editing-tool diagnostics are explicitly transcript-derived records, not raw
process logs or recovered failed-source snapshots. The first failed before a
source write because the TypeScript parser path was unavailable. The second
failed before a source write on an empty trailing import specifier. Compiler v1
and v2 therefore retained the same missing-import and unused-import diagnostics;
v3 passed after repair. Their raw compiler outputs are retained.

The combined browser/Page run exited 1: eight Page cases passed, including the
asset equality case, while the initial browser witness rejected esbuild's
synthetic helper edge. The witness repair excepted only `<runtime>` and retained
the stronger output-import check. The later selected baseline passed within the
control. Earlier failures remain part of the evidence.

| Check and observed result | Recorded command reference | Exit | Output and SHA-256 |
|---|---|---:|---|
| Editing-tool start: unavailable TypeScript parser path | `cli-extraction-source/preparation-failures.json`, failure 1 | 1 | Transcript-derived diagnostic only: `a9aee66b4db3214e7689021d95ccf23f84dde225bbd6bdbbe2902b92165de303`; no raw output retained |
| Editing-tool start: trailing-comma import parsing | `cli-extraction-source/preparation-failures.json`, failure 2 | 1 | Transcript-derived diagnostic only: `a9aee66b4db3214e7689021d95ccf23f84dde225bbd6bdbbe2902b92165de303`; no raw output retained |
| CLI source compiler, failed extraction imports | `cli-source-types-v1/result.json` | 1 | `cli-source-types-v1/output.log`: `637134b34f29a28399d48f1bc2cc9be7f01866a0ec48a4dafaf85ae12b5fd91f` |
| CLI source compiler, same failure after tool start failed | `cli-source-types-v2/result.json` | 1 | `cli-source-types-v2/output.log`: `637134b34f29a28399d48f1bc2cc9be7f01866a0ec48a4dafaf85ae12b5fd91f` |
| CLI source compiler, passed after import repair | `cli-source-types-v3/result.json` | 0 | `cli-source-types-v3/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 129 declarations and 47 legacy exports | `mechanical-proof-v1/result.json` | 0 | `mechanical-proof-v1/output.log`: `0778f360e0c20a116f5cd526ec6553649fb8ef68806d7f66c94cb0b102faf29d` |
| CLI plain test compiler | `cli-plain-types/result.json` | 0 | `cli-plain-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| CLI Native test compiler only | `cli-native-types/result.json` | 0 | `cli-native-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| CLI pool compatibility preparation | `pool-compatibility/result.json` | 0 | `pool-compatibility/output.log`: `edff9c2a8ba1db69ef680497c5313b0f2783b27f9cc81f8302095d6f6b6eba82` |
| CLI plain: four files, 16 passed | `cli-focused-plain/result.json` | 0 | `cli-focused-plain/output.log`: `04ff0fe586c7f152d08b0b19309eb65122afb42edf35812972bbbc84bf8d2bbf` |
| Page source compiler | `page-source-types/result.json` | 0 | `page-source-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Page plain test compiler | `page-plain-types/result.json` | 0 | `page-plain-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Page Native test compiler only | `page-native-types/result.json` | 0 | `page-native-types/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Existing Page asset generation | `page-assets-build/result.json` | 0 | `page-assets-build/output.log`: `3e43ebec3e4d48212f1ac405df28742f979c81b0a6883c30be8d805e05911505` |
| Integration pool preparation | `browser-integration-pool-compat/result.json` | 0 | `browser-integration-pool-compat/output.log`: `edff9c2a8ba1db69ef680497c5313b0f2783b27f9cc81f8302095d6f6b6eba82` |
| Eight Page cases passed; browser case failed | `browser-page-focused/result.json` | 1 | `browser-page-focused/output.log`: `8271f1cf1e4f3fbfc760919ff95dcf60cfe579ec6d49959860651e31692f947e` |
| CLI test compiler after witness repair | `browser-test-types-followup/result.json` | 0 | `browser-test-types-followup/output.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Actual browser package graph capture | `browser-graph-capture/result.json` | 0 | `browser-graph-capture/output.log`: `06c2e580a47601d528ce556d3648419ba2f7a2e453923d6a961c8ff3b6304eda` |
| Control pool preparation | `browser-control-pool-compat/result.json` | 0 | `browser-control-pool-compat/output.log`: `edff9c2a8ba1db69ef680497c5313b0f2783b27f9cc81f8302095d6f6b6eba82` |
| Control: baseline pass, mutant assertion failure, restored | `browser-barrel-control-run/result.json` | 0 | `browser-barrel-control-run/output.log`: `92539c60c4ac5b85035aa350ec08fd21267f4e5c32d5bbc610f5129f7d9fc341` |
| Actual four-owner source seals; route inventory unchanged | `source-seal-probe/result.json` | 0 | `source-seal-probe/stdout.log`: `8f6c7fa8c654ac57f21d27fcbd6e929c3dda465614b64a56a67e54afb0dd5d15` |
| Security entry-point inventory: four Node cases passed | `source-seal-node/result.json` | 0 | `source-seal-node/stdout.log`: `0cec9f95bb4d629d61054706e2eaa442c5e65c8465c80b7d2e4233f26ac87172` |
| Native pool preparation | `owning-native-pool-compat/result.json` | 0 | `owning-native-pool-compat/stdout.log`: `edff9c2a8ba1db69ef680497c5313b0f2783b27f9cc81f8302095d6f6b6eba82` |
| Native: four files, ten cases passed | `native-claim-focused/result.json` | 0 | `native-claim-focused/stdout.log`: `7b3743747ba3437a3db7a1ff46070659b1302a9fbc8163151b4c9e1ced3adbed` |
| Three generated-file attributes | `root-acceptance/attributes.json` | 0 | `root-acceptance/attributes.log`: `74cdc150ccbd1785ea1bcc29520ea554a69baf1d6eabc03f8ec9bac5d32dae8f` |
| Source whitespace check | `root-acceptance/whitespace.json` | 0 | `root-acceptance/whitespace.log`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The focused Native run used configured Worker and SQL execution for the existing
CLI claim, outsider claim, agent-key recovery, and Page claim interfaces. All four
modules and ten cases passed, with zero unhandled errors, zero missing ready or
result callbacks, and no duplicate finals. The run took 8.345897833 seconds wall
and 12.556283 seconds child CPU. Git host, scheduler, browser storage and locks,
and deliberate loss or refusal stand-ins remain qualified by the owning tests.
This is neither a live deployment nor browser UI validation.

The retained integration environment records Node v26.12.1 on Darwin 27.2.0,
arm64, 18 logical CPUs, with starting load averages 1.294921875, 1.61669921875,
and 2.06103515625. Per-run wall and child CPU measurements are in the receipts;
they are observations, not performance claims. Dependencies came from the
verified cache with 14 workspace links rebound and no installation. Native
before/after snapshots report unchanged source and dependency hashes.

The adjacent manifest is an open preparation snapshot of every currently
retained raw file, including nested indexes. It is not a final sealed manifest.
The latest-base check fetched Main, which remains `aa3ae873`; the work already
uses that base. The source checkpoint, ordinary gate, gate analysis, final index
and seal, review, and landing remain delivery work.
No gate success is inferred from these focused passes.
