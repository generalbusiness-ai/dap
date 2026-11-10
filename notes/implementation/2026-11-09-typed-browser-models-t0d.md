# Browser models from authored definitions

Request `6f87a4e3`, item 3. Promise `00b5bef0`. Placement `176190ba`
and coverage `b8b6248d` assign the two browser models and their annotations.

## What changed

Counter and Lending derive their act names, field types, enums, and limits
from the authored definition values. Lending also derives its state action
lists. Refusal words live in per-act annotation tables, with unchanged
wording. Native reason keys remain open until DX-B1 supplies their types.

The models retain application-specific value selection. Existing
`shapeDeclaredAct` checks the selected fields, and `expectedOf` captures
revisions from the held view. A local inferred field parameter preserves
the selected object's type without a cast or client API change.

Today's fields contain ordinary required values. The shaper's list and
record copies preserve those values. The models return the selected fields
and actual shaped `on`; revision capture uses the shaped fields. The
unchanged signing clients shape again and retain actual `beside` data.
No current act has detached text, defaulted input, or presented facts.

The six source owners received static peer review. Compiler-only examples
reject genesis commands, invalid field types, unknown failure enums, and
unknown annotation act keys. No runtime case was added.

## Evidence

The [first focus](evidence/2026-11-09-t0d-focused.manifest.json) remains
failed at `8292fe9a`. Its first compiler rejected the broad `Members`
return type's optional string index at the Lending test helper. The other
three compiler contexts and all 63 runtime cases remained unreached.
The local inferred field parameter fixes that return boundary.

The [repaired focus](evidence/2026-11-09-t0d-focused-continuation-1.manifest.json)
passed at `dcfa6686`. Independent audits checked actual exits, complete
case identities, built-in reports, source and tool hashes, and process
closure. The 12 Counting file wrappers remain unknown observations and
do not enter the case count.

The [value capture](evidence/2026-11-09-t0d-paired-values.manifest.json)
uses identical saved synthetic inputs in two fresh Node processes. Each
process uses its own source root, dependency namespace, and pinned loader.
The clean C baseline has the exact full tree of named main `19ddc868`.
The 109 rows cover exported limits, enums, action lists, proposals, and
refusal words. They are value comparisons, not test cases.

The [final-head value capture](evidence/2026-11-10-t0d-final-head-values.manifest.json)
passed at `1088dc06` after the approved B and BR13 main merges. One fresh
`headFinal` process printed the same 109 values as the sealed `main19dd`
baseline. The baseline did not run again. The independent audit checked
all four actual exits, the ordered row identities and complete stable
JSON values, source, tool and input hashes, and empty owned process groups.
This follow-up adds exported-value evidence only.

The [Page and Card workflow receipt](evidence/2026-11-10-t0d-browser-ci.manifest.json)
records both successful push runs at `1088dc06`, attempt 1. All 25 job
steps succeeded, and both check runs have zero annotations. The receipt
keeps the full job logs and excludes the automatic main-branch polls.

Full argv and retained output paths appear in the linked manifests.
Compiler and Vitest digests identify their timed logs. Value digests
identify the actual Node stdout. CI digests identify the sealed job receipts.

| Check | Command | Exit or conclusion | Output/log SHA-256 |
|---|---|---|---|
| First compiler at `8292fe9a` (failed) | `tsc -p examples/lending/tsconfig.json` | 1 | `7e51d3e98a309d6d5ac3b6c6fd9ecd06b5db8dd70dc376cab82cf0717b1bec67` |
| DCFA compiler 1 | `tsc -p examples/lending/tsconfig.json` | 0 | `cb8dc7a2b118da50f368af75b43fac786650db7a11653c7292146607ecd69b3f` |
| DCFA compiler 2 | `tsc -p examples/lending/browser/tsconfig.json` | 0 | `3710c9355883fe9e3892d55fce94b4efe0f9bf182bc4e07f399e5e80922dd3e0` |
| DCFA compiler 3 | `tsc -p apps/counter/browser/tsconfig.json` | 0 | `d9fea4258e0cec95faea746008858b72d13510767276f436a3344234dd23d86f` |
| DCFA compiler 4 | `tsc -p packages/scope/tsconfig.test.json` | 0 | `1b97d8c678be8c51a87285bd420795d386c0e8d947ee86726bef450bd37547be` |
| DCFA Lending model (4 cases) | `vitest run examples/lending/browser/model.test.ts` | 0 | `d254a892d26da6655141df3bd39a3a0751f7824fb0a20825ff555b0d28e0aa29` |
| DCFA Counter runner (56 cases) | `node apps/counter/scripts/test-browser.mjs` | 0 | `04aaee150c9375561c4b8b95e029bd562bb09ad66f36ef6081942c4345a36c1c` |
| DCFA Native projections (2) and Lending (1) | `vitest run packages/scope/test/maintained-application-projections.test.ts packages/scope/test/lending.test.ts` | 0 | `fd9744f9734e7f7366494c49c574baf654126c1befd91ed695e7f601dbca7fa6` |
| Original 109 values: `main19dd` | [Node/TSX argv](evidence/2026-11-09-t0d-paired-values.manifest.json) | 0 | `65293eb4cc03985b986aa0eb160eeba038aab69faf0b13876b0e6a165f021122` |
| Original 109 values: `headDcfa` | [Node/TSX argv](evidence/2026-11-09-t0d-paired-values.manifest.json) | 0 | `3cff3cd5e3b5d7c5c281926385a9c83bb27c7291ebd1a2dda32917c4731dc838` |
| Integrated 109 values at `1088dc06` | [Node/TSX argv](evidence/2026-11-10-t0d-final-head-values.manifest.json) | 0 | `4cdb8f7b44326340f9a18e4f1f05691df8f628ee01eec46683a09259e2d5de8d` |
| Page browser workflow | [Page run](https://github.com/generalbusiness-ai/dap/actions/runs/42805991861) | Success | `c67efff3be2d02364d9cca068de857b2b4b29f6f9378b9e14f00a68866256c3a` |
| Card browser workflow | [Card run](https://github.com/generalbusiness-ai/dap/actions/runs/42805991887) | Success | `c67efff3be2d02364d9cca068de857b2b4b29f6f9378b9e14f00a68866256c3a` |
| Whitespace at gate source | `git diff --check a5b82ee0 9b92bd28` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Commit messages at gate source | `node scripts/check-commit-messages.mjs a5b82ee0 9b92bd28` | 0 | `70b235d629dedfb1f76eb6b8a46feb6d4145fef5efa7705ba09b8874f78d7662` |
| JSON format at gate source | `npm run format:check` | 0 | `6b858014bbe6926fbcfb41b3c9377ec28b3138bf83ce53de8790e5ed46af9d79` |
| Final full gate | `npm run gate` | 0 | `3a965d2e4f57d15b2a8473ae4eba1f320828c67662043e2153f3ca6ef1a0c8b5` |

Ruling `ac586d65` accepts the four compiler contexts and 63 maintained
runtime cases as D's whole runtime witness. It requires no Lending DOM
fixture or real-Native browser scene. This head claims no Lending DOM
result or live acceptance. The planner checks the hosted Counter and
Lending pages after deployment.

## Final gate and review

The [final gate](evidence/2026-11-10-t0d-final-gate.manifest.json) passed
at `9b92bd28`, with all actual gate and outer exits zero. The independent
analysis reconciled 5,841 unique obligations: 5,838 passed and three
skipped. All 45 compiler contexts and 16 typecheck scripts completed.
The 111 file wrappers remain unknown observations outside the case count.
The maintained selector omitted all six Scale cases. The analysis found
no unexpected cases, report errors or deadline diagnostics. Source, tool
and input hashes stayed fixed, and owned process groups closed.

The [three static prechecks](evidence/2026-11-10-t0d-static-preflight.manifest.json)
passed; the commit check read six commits and flagged zero. Their interval
overlapped deployment START for 11.068016 seconds, as correction
`370217ef` records. The full gate began after deployment END `66ed9ae9`.

The gate's outer interval was 947.428568833 seconds; its inner interval was
945.087629209 seconds. The 95 passive RSS samples recorded single-process
maxima of 2,630,800 KiB for Node and 3,510,832 KiB for workerd. These are
sampled RSS values, not heaps, process sums, instantaneous peaks or memory
thresholds. The earlier BR13 run used a different source scope.

The Page and Card receipts name their actual source `1088dc06`.
The change from `1088dc06` to gated `9b92bd28` contains only the capture
note and manifest; all 4,533 other earlier blobs and modes match. The final
evidence update contains this note and the CI, static-precheck and gate
manifests. The review records the final evidence commit and checks every
other blob and mode against `9b92bd28`.

D lands last among the DX-T0 heads and closes the parent only after
required evidence and review.

No kernel, definition pin, retained JSON, manifest behavior, client API,
or authoring package changes here. The planner owns deployment.
