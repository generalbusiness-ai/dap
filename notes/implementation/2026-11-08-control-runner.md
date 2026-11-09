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

No focused check or gate has run at this source checkpoint. The next check
runs the complete five-case `scripts/control.test.mjs` owner. One gate follows
before review. This note will cite the retained results.
