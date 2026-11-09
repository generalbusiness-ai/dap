# Select the control runner from the requested file

Request `30b5d71d` records a control that selected Node for a TypeScript
witness because the CLI package runs both Vitest and Node in its test
script. Implementation request `116694e3`, under Hugh's order `afdebb86`,
tracks this repair.

An explicit `.mjs` or `.cjs` test file selects Node. An explicit TypeScript
test file selects Vitest. Other selections keep the package-script fallback.
The control keeps its existing baseline, assertion and inconclusive checks.

The two new cases run a real Node witness and a real Vitest witness from a
scratch package with the same mixed test script. The Vitest case replaces
only `npx` resolution with a local executable that forwards to the checkout's
existing Vitest CLI. It installs no package. Both cases require an assertion
failure after the source change and verify source restoration.

The original Buffer-diff, forged-diagnostic and incomplete-diagnostic cases
remain in the same owner. No Worker or application source changes.

## Validation

At source `738d80134e8fb4bbae0de0ac74ef3b45c6d14ccd`, tree
`8f06f1f67f9ee2b09428261ca7b82a41ea637aa1`, the complete owner passed all
five cases. The old-selection control then failed only the TypeScript case,
by assertion at `scripts/control.test.mjs:85:10`. The control's owner exit
remains 1. Its driver exited 0 because that failure matched the intended
result. Both process groups closed, and every tracked byte matches the
starting source. No restored rerun ran.

The [focused manifest](evidence/2026-11-08-control-runner-focused.manifest.json)
has SHA-256 `6ee09febc0f7516f7d6d3caf4c442dc1f23e2b9ccf8f338c60dca316fe973d20`.
It lists all 51 read-only files from these two units:

| Unit under `~/play/artroom-evidence/` | Result files |
|---|---|
| `2026-11-08-control-runner-focused` | `owner.exit`, `owner.stdout`, `receipt.json` |
| `2026-11-08-control-runner-control` | `owner.exit`, `owner.stdout`, `classification.json`, `receipt.json` |

The gate has not run yet. One gate follows at the clean candidate before
review. No live acceptance or deployment follows from these local checks.
