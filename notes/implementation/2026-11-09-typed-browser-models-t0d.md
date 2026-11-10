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

| Check | Result | Exit |
|---|---|---|
| Affected and owning compiler contexts | Four passed | 0 |
| Lending model | Four existing cases passed | 0 |
| Maintained Counter runner | 56 existing cases passed | 0 |
| Native application projections | Two existing cases passed | 0 |
| Historical Native Lending owner | One existing case passed in its own pool | 0 |
| Exported value comparison | 109 printed rows equal main's values | 0 |

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
JSON values, source/tool/input hashes, and empty owned process groups.
This follow-up adds exported-value evidence only. The linked manifest
records the exact capture argv.

| Check | Command | Exit | Output digest |
|---|---|---|---|
| Final-head exported values | Node/TSX, `headFinal` ([exact argv](evidence/2026-11-10-t0d-final-head-values.manifest.json)) | 0 | `4cdb8f7b44326340f9a18e4f1f05691df8f628ee01eec46683a09259e2d5de8d` |
| Gate before review | `npm run gate` | Not run | Pending |

Ruling `ac586d65` accepts the four compiler contexts and 63 maintained
runtime cases as D's whole runtime witness. It requires no Lending DOM
fixture or real-Native browser scene. This head claims no Lending DOM
result or live acceptance. The planner checks the hosted Counter and
Lending pages after deployment.

## Remaining checks

The Page workflow must pass on the integrated review head. The final
`npm run gate` remains owed. Its whitespace, commit-message and JSON-format
prechecks must pass at the actual gate source. D lands last among the
DX-T0 heads and closes the parent only after required evidence and review.

No kernel, definition pin, retained JSON, manifest behavior, client API,
or authoring package changes here. The planner owns deployment.
