# Change one hosted register in its tracked configuration

CUT-A (request `50137f0c`) makes a hosted register change the output of one
helper. `scripts/register-values.mjs` uses the existing hosted-name map and
JSONC reader in `deploy-config.mjs`; it adds no register manifest or second
name-to-file map. A call changes only `demo`, `grow` or `lending` in that
Worker's tracked configuration. It preserves unrelated JSONC bytes and
prints the diff before the final file rename. No live register value or
Start setting changes in this source head.

The helper updates the primary and Artifacts roots together. It appends the
new installed root once under the existing 32-root bound. `--only` writes
the new root alone. The production parsers check the complete candidate
before the helper writes a tracked byte. Invalid references, duplicate
keys, namespace disagreement, a dirty target and an invalid root list
refuse without changing tracked files.

The config tests read hosted identities from the tracked files. Generated
specimens exercise file writes and refusals in temporary Git checkouts.
The five active documents and two example inputs no longer copy hosted
register IDs. The example runbooks require a reviewed scope and genesis.
Historical notes and signed packets retain their recorded identifiers.

## Decisions and their boundaries

Ruling `3f9b8d30` accepts the inventory and the script. Cutover END
`53d5a148` replaces its tracked-deployment requirement: dap-demo's
`DEPLOYMENT` remains a secret binding. The helper requires explicit
`--deployment` when creating or rotating Start metadata and validates the
offer against that argument through `demoCreationConfig`. It adds no
`DEPLOYMENT` variable. An existing conflicting tracked value still
refuses. The new witness checks that both bootstrap and rotation keep
that variable absent. Source validation cannot inspect a live secret;
the planner's deployment evidence supplies that correspondence.

The helper derives no origin, deployment identity or definition. Start
bootstrap needs all three arguments. Existing-offer rotation keeps its
metadata and requires the explicit deployment again. The Head A live
values belong to the planner's later configuration head, not this change.

## Focused evidence

The frozen checkpoint is `eadd7c7424a94d9521d2697c176ca79139321502`, tree
`f4676f63e836828f89ad0f96b6be8a0046fb391d`. This evidence commit adds only
this note and its [manifest](evidence/2026-11-14-cut-a.manifest.json).
The manifest lists 28 files across two separately sealed directories under
`/Users/hughpyle/play/artroom-evidence`. Both directories retain their own
`SHA256SUMS`. Raw reports stay outside the checkout.

Attempt 1 failed its first compiler because the shared root dependency
view lacked the existing `@generalbusiness/dap-define` workspace binding.
The compiler reported module-resolution errors and related inferred-type
errors. The run stopped immediately; no test, control or compatibility
step ran. Its command took 0.825 seconds by the wrapper's monotonic clock.
This failed record remains evidence of that attempt.

The root authorized one resumed attempt with the verified real dependency
view from `builder/ie1-fg1-derive-20261113`. `cp -cR` cloned it into CUT-A.
Both package locks and the inherited `.artroom-lock-sha256` equal
`f2885ca573c095141efbca99a7260d211beb9ae38a7f1b139ce234dc79568b54`.
All 15 relative workspace links resolve strictly inside CUT-A and their
package names agree. The `dap-define` root and package subpath exports
name existing source files. The provenance file records these checks.
No package install, link rewrite or stamp fabrication occurred.

Attempt 2 passed the compiler, 21 Node tests across the three selected
files, six CLI config tests and one targeted control. The control replaces
the namespace agreement guard with `if (false)`: the unchanged baseline
passes five tests, then the namespace specimen fails by assertion, with
four tests still passing. The tool restores the source. It reports
`DISTINGUISHES`; no sweep ran.

The resumed wrapper took 12.482 seconds overall. Its command wall times
were compiler 0.842 seconds, Node 5.153, compatibility 0.211, CLI config
1.644, control 3.742 and whitespace 0.208. These command times are separate
measurements, not a sum claimed as the pipeline duration. `/usr/bin/time`
records real, user and system time in each stderr file. TAP retains every
Node case duration; the CLI JSON reporter retains every Vitest case.
The five new helper witnesses took 2327.390, 144.311, 59.237, 243.025 and
0.931 milliseconds in their source order. Those are observed times, not
deadlines or worst-case guarantees.

Actual escalated `pmset` samples record AC Power and power mode 0: one
sample in the stopped first attempt and seven in the resumed attempt.
The process preflight found no matching validation process. Commands ran
sequentially. The source checkpoint remained unchanged throughout both
attempts and after the control restored its file.

| Check | Command | Exit | Output and SHA256 |
|---|---|---|---|
| Attempt 1: CLI compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json --incremental false` | 1 | `2026-11-14-cut-a-focused-attempt1/cli-compiler.stdout`: `75a715d6e0d9875bd9c16791f3ad80a8dfbbb83bf7236f4e80d981ddd9f566e3` |
| Attempt 2: CLI compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json --incremental false` | 0 | `2026-11-14-cut-a-focused-attempt2/cli-compiler.stderr`: `e8da59f3df1e472e58e41b3a2a8013a7291bc123bc5ab5b5b31ae658f06f5686` |
| Selected Node files | `node --test --test-isolation=none --test-reporter=tap scripts/register-values.test.mjs scripts/deploy-smoke.test.mjs scripts/test.test.mjs` | 0 | `2026-11-14-cut-a-focused-attempt2/node-files.stdout`: `57ba8198c40c3cb06828f84e5800349a7118d90950f587f03a780d656a1b9ea6` |
| Pool compatibility | `node scripts/cloudflare-pool-compat.mjs` | 0 | `2026-11-14-cut-a-focused-attempt2/pool-compat.stdout`: `d0615699e8ac329e0727516dbc6cf9a950fc9f0454704756838653c9872da8f2` |
| CLI config witness | `node node_modules/vitest/vitest.mjs run test/demo-config.test.ts --reporter=verbose --reporter=json --outputFile.json=<evidence>/cli-tests.json (cwd packages/cli)` | 0 | `2026-11-14-cut-a-focused-attempt2/cli-config.stdout`: `26e23f35b5b2f849d6b248f9b75e15827387123989cee8ce93f5d6dc9131c0f5` |
| Namespace control | `node scripts/control.mjs scripts/register-values.mjs <namespace guard> "if (false)" --expect "production parser disagreement" -- . scripts/register-values.test.mjs` | 0 | `2026-11-14-cut-a-focused-attempt2/namespace-control.stdout`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Whitespace | `git diff --check` | 0 | `2026-11-14-cut-a-focused-attempt2/whitespace.stderr`: `f5d04e3f394dbde846fb5bf863e4e5541e917ef60e9e5b8a7a746282662ee215` |

The manifest also lists the exact command vectors, dependency provenance,
power samples, process preflight, checkpoint and result ledgers, CLI JSON
case report and both checksum files. Check counts come from Node TAP and
the Vitest JSON reporter; no separate discovery run supplied them.

## Open limits

- CUT-A's full gate and checker review remain owed under request
  `50137f0c`. This focused pass does not replace them. The root owns the
  next full gate.
- Head A must use the planner's values from cutover END `53d5a148` after
  CUT-A. No deployment or live-value application ran here. That END holds
  deployments of the three room Workers until Head A lands.
- Grow's archive disposition remains outside this helper change; AE-1
  (`0c265d01`) owns the shared driver and ARC-1 (`53e13060`) owns the later
  supported-entry cohort and permanent stop. This head adds neither.
