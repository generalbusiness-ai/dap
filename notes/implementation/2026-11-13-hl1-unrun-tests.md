# HL-1: every tracked test file runs in the gate or is excluded

Planner ruling `7bf2c93b` (HL-1). Builder act `e1844d08` lists the tracked
test files that no gate step ran at `65ade11a`.

This note records the original HL-1 checkpoint. The
[14 November follow-up](2026-11-14-hl1-followups.md) records later source
repairs and the checks still owed.

## What changed

`scripts/test.mjs` exports `nodeFiles` and a new `excludedTests` list. Each
`excludedTests` entry names a tracked test file and the reason that no gate
step runs it.

`apps/views/test/j5.test.mjs` passed alone, so `nodeFiles` now includes it.
The four other files from the run below failed, so no gate list includes
them. `excludedTests` lists each of them with its failure.

The new `scripts/test-selection.test.mjs` runs in the Node stage. It
collects the files that each gate step selects:

- the two `node --test` steps in `scripts/gate.sh`
- `nodeFiles` in `scripts/test.mjs`
- the four Counting witnesses named in `apps/counter/scripts/test-browser.mjs`
- the plain and native phase files, from `vitest list --filesOnly` with
  `vitest.plain.config.ts` and `vitest.native.config.ts`, with
  `ARTROOM_SCALE_MODE=run`

The test fails when a tracked `*.test.*` or `*.spec.*` file is neither
selected nor in `excludedTests`. It also fails when an exclusion has no
reason, names an untracked file, or names a file that a gate step selects.
Vitest itself lists the phase files, so the project configs stay the one
source of the Vitest selection.

[What the gate runs](../../docs/testing-reference.md#what-the-gate-runs)
now says where to add a new test file.

`scripts/test-selection.test.mjs` passed alone in 1.07 s wall time
(2026-11-13 21:51 UTC, AC power, `powermode 0`). That time includes the
two `vitest list` runs. A control with `scripts/control.mjs` removed the
`spikes/typed-surface/lib.test.ts` exclusion. The test then failed by its
assertion, and the control reported `DISTINGUISHES`.
`scripts/test.test.mjs` and `scripts/test-phases.test.mjs` passed, 7 of 7,
in 2.33 s.

## Runs of the five unrun files

Each file ran alone in worktree `hl1-unrun-tests-20261113` at `65ade11a`,
on 2026-11-13. The `.mjs` files ran under `node --test` with
`ARTROOM_TEST_PHASE=node`, as the gate's Node stage runs them. Each
`storage.browser.test.ts` file ran under Vitest 4.1.12 with its own
package config (`apps/counter/vitest.config.ts` and
`examples/lending/vitest.config.ts`), with `include` set to that one file.
Every run read `Now drawing from 'AC Power'`, battery 100% charged, and
`powermode 0`. Durations are the wall time from `/usr/bin/time -p`.

| File | Result | Wall time | Started (UTC) |
|---|---|---|---|
| `apps/views/test/j5.test.mjs` | passed, 6 of 6 | 1.38 s | 17:06:40 |
| `apps/views/test/two-process.test.mjs` | failed, 0 of 3 | 90.82 s | 17:06:48 |
| `scripts/demo-git-host.test.mjs` | failed to load | 0.20 s | 17:08:26 |
| `apps/counter/browser/storage.browser.test.ts` | failed to load, no test cases | 0.37 s | 17:09:03 |
| `examples/lending/browser/storage.browser.test.ts` | no test suite found | 0.96 s | 17:09:07 |

`j5.test.mjs` adds about 1.4 s of wall time to the Node stage.

### Failures

`two-process.test.mjs`: each of the three cases waits 30 s and fails with
`Error: initialize: no answer. S4 local service could not start. Check the
explicit Brief and existing room configuration.` The error comes from the
request timer at `apps/views/test/two-process.test.mjs:41`.

`demo-git-host.test.mjs`: Node's type stripping refuses
`packages/client/src/declared.ts:89` with
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` (a parameter property). The test needs
the `tsx` loader, which the gate's Node stage does not give. A second run
with `node --import tsx --test` (1.64 s, same power readings, 17:08:37)
passed one case and failed the other, `owner-only exclusive preparation
keeps keys off stdout and locks one genuinely signed install plan`, with
`DemoPreparationError: invalid-register-receipt` from `buildCreation` at
`scripts/demo-git-host.mjs:164`.

`apps/counter/browser/storage.browser.test.ts`: the import of
`@generalbusiness/dap-derive/field-types` resolves through the Counting
alias to `packages/derive/src/index.ts/field-types` and fails with
`ENOTDIR`. The file also declares no test cases. It exports
`durableForgetWitness` for a browser page to call, and no runner in the
repository calls it.

`examples/lending/browser/storage.browser.test.ts`: the module loads, and
Vitest reports `No test suite found`. The file exports `storageWitness`
for a browser page to call, and no runner in the repository calls it.

## Exclusions

| File | Reason |
|---|---|
| `spikes/typed-surface/lib.test.ts` | spike, own config |
| `spikes/typed-surface/surface.test.ts` | spike, own config |
| `spikes/typed-surface-before/surface.test.ts` | spike, own config |
| `apps/room/celld/mac/test/certificate.test.mjs` | `scripts/mac-host-kit.test.mjs` runs it as a child, on Darwin only |
| `apps/room/celld/mac/test/prepare-github.test.mjs` | same |
| `apps/room/celld/mac/test/prepare-project.test.mjs` | same |
| `apps/counter/browser/storage.browser.test.ts` | browser witness module with no test cases, and no runner calls it |
| `examples/lending/browser/storage.browser.test.ts` | same |
| `apps/views/test/two-process.test.mjs` | fails: each case times out waiting for the initialize answer |
| `scripts/demo-git-host.test.mjs` | fails: needs the `tsx` loader, and with it fails on `invalid-register-receipt` |

## Run by hand or not run

These files hold test code without the `.test.` name, so the selection
test does not cover them.

- `apps/room/page/test/issue-questions-browser.mjs`,
  `mcp-second-device.mjs`, `needs-you-browser.mjs`, `no-session-screens.mjs`
  and `two-devices.mjs`: browser scripts that no gate step or workflow
  runs.
- `packages/mcp/test/declared-members-browser.mjs`,
  `declared-surfaces-browser.mjs`, `grow-measurements-browser.mjs`,
  `grow-members-browser.mjs` and `grow-views-browser.mjs`: browser scripts
  that no gate step or workflow runs.
- `packages/checkers/test/container.acceptance.mjs`: only
  `scripts/test-j3-runner.mjs`, a manual command, imports it.
- `packages/checkers/runner/relay_test.go`: no step runs `go test`.
