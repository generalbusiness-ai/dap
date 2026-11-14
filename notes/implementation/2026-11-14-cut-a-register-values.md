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

## Final evidence

The frozen checkpoint is `eadd7c7424a94d9521d2697c176ca79139321502`, tree
`f4676f63e836828f89ad0f96b6be8a0046fb391d`. Focused-evidence commit `56debcee52` added only
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

The full gate ran once at `554187d425e46847f35146e11b45689e5338c70a`,
tree `7f7e180f309750ec0235507aa80bb60ddcb610ae`, after merging reviewed
main `694a8c7f`. It failed with actual exit 1. Static checks, typecheck,
definition pins, kernel, Node and Counter passed. Plain tests reported
4,540 passed, 76 failed and one skipped. All 76 failures belonged to
`examples/repo-in-ai/test/hosted-loop.test.ts`; native was unreached.
The first gate remains failed.

The file used the operator example as its usable fixture. CUT-A had
intentionally replaced the example's hosted register with placeholders,
but the fixture filled only its version. Commit
`d19e945336f8623a728691adae05a4f2d4e3697c`, tree
`4327b264c78888fdf1bb05ca14aa27372a4eb9d2`, changes only that test file.
It supplies a synthetic register, fills it in the owner-only HTTP witness,
and checks that an operator must fill both register and version. It keeps
all 204 original cases, with one title updated and no deadline change.
The example remains unfilled. No production code, configuration,
dependency, shared helper or imported source changes after the failed gate.
No other source imports the test file.

The follow-up uses the isolated-file rule in
[File test evidence](../../docs/evidence-filing.md#follow-up-after-a-gate).
The changed compiler and whole owning file pass, including all 204 cases.
The exact unreached native stage passes 1,155 cases with two skipped;
all six scale cases run because the original selection included them for
`scripts/test.mjs`. No previously passed suite or whole gate reruns.
The native command takes 1,318.08 seconds by `/usr/bin/time`; its case
records retain each duration. The separate case-correspondence audit
checks that no case was added or removed. This is a failed gate with a
passing limited follow-up, for the reviewer's assessment.

All 13 in-run samples of the failed gate and all 67 of the follow-up read
actual AC Power and power mode 0. Both records retain endpoint readings.
The repair checkpoint is clean after validation. The final evidence note
and manifests change documents only.

| Check | Command | Exit | Output and SHA256 |
|---|---|---|---|
| Attempt 1: CLI compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json --incremental false` | 1 | `2026-11-14-cut-a-focused-attempt1/cli-compiler.stdout`: `75a715d6e0d9875bd9c16791f3ad80a8dfbbb83bf7236f4e80d981ddd9f566e3` |
| Attempt 2: CLI compiler | `node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.test.json --incremental false` | 0 | `2026-11-14-cut-a-focused-attempt2/cli-compiler.stderr`: `e8da59f3df1e472e58e41b3a2a8013a7291bc123bc5ab5b5b31ae658f06f5686` |
| Selected Node files | `node --test --test-isolation=none --test-reporter=tap scripts/register-values.test.mjs scripts/deploy-smoke.test.mjs scripts/test.test.mjs` | 0 | `2026-11-14-cut-a-focused-attempt2/node-files.stdout`: `57ba8198c40c3cb06828f84e5800349a7118d90950f587f03a780d656a1b9ea6` |
| Pool compatibility | `node scripts/cloudflare-pool-compat.mjs` | 0 | `2026-11-14-cut-a-focused-attempt2/pool-compat.stdout`: `d0615699e8ac329e0727516dbc6cf9a950fc9f0454704756838653c9872da8f2` |
| CLI config witness | `node node_modules/vitest/vitest.mjs run test/demo-config.test.ts --reporter=verbose --reporter=json --outputFile.json=<evidence>/cli-tests.json (cwd packages/cli)` | 0 | `2026-11-14-cut-a-focused-attempt2/cli-config.stdout`: `26e23f35b5b2f849d6b248f9b75e15827387123989cee8ce93f5d6dc9131c0f5` |
| Namespace control | `node scripts/control.mjs scripts/register-values.mjs <namespace guard> "if (false)" --expect "production parser disagreement" -- . scripts/register-values.test.mjs` | 0 | `2026-11-14-cut-a-focused-attempt2/namespace-control.stderr`: `082243e2eeca3d04459e7eadcfd783ea3c9fe0acbace0efe5690d52a06d8b010` |
| Whitespace | `git diff --check` | 0 | `2026-11-14-cut-a-focused-attempt2/whitespace.stderr`: `f5d04e3f394dbde846fb5bf863e4e5541e917ef60e9e5b8a7a746282662ee215` |
| Full gate attempt 1 | `npm run gate` | 1, one plain file failed | `2026-11-14-cut-a-gate-attempt1/gate.stdout`: `4563d529db9e4310f7b9d1d7cbc47d7ce42d0866c8090efa0a50744dd008f856` |
| Repair compiler | `node node_modules/typescript/bin/tsc -p examples/repo-in-ai/tsconfig.json --incremental false` | 0 | `2026-11-14-cut-a-fixture-followup/compiler.result.json`: `7fa323da33a7bc2fa085df7871a0ac2b86f8763da5cb9e49cd647fb86cf46852` |
| Follow-up compatibility | `node scripts/cloudflare-pool-compat.mjs` | 0 | `2026-11-14-cut-a-fixture-followup/compatibility.result.json`: `a773c7caa0e9695e04cb2dbdc6a9a03f0a63da1739ed6d7beecfb783f6baa9c4` |
| Whole repaired owner | `ARTROOM_TEST_PHASE=plain node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts --project repo-in-ai examples/repo-in-ai/test/hosted-loop.test.ts` | 0 | `2026-11-14-cut-a-fixture-followup/owning-file.stdout`: `dbde24e81683c7269a15b8e823421617fc54ae9417d84427cbe8661276e4f983` |
| Exact unreached native stage | `ARTROOM_TEST_PHASE=native ARTROOM_SCALE_MODE=run node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts` | 0 | `2026-11-14-cut-a-fixture-followup/unreached-native.stdout`: `6801666ab91276dbf0e8d8f8eee17ee8966d711263174ed389bfa8fd54d47314` |
| Notes | `node scripts/check-notes.mjs origin/main HEAD` | 0 | `2026-11-14-cut-a-doc-checks/notes.stdout`: `35f5140f008ef3bf10327a6430f244281b40bdfa97fd8e95da1c9634089d74d1` |
| Links | `node scripts/check-doc-links.mjs` | 0 | `2026-11-14-cut-a-doc-checks/links.stdout`: `0b62886e12f396ee8cf60e4cfe3f4112ecc75879da8508427692a1367191bbc9` |
| Messages | `node scripts/check-commit-messages.mjs origin/main HEAD` | 0 | `2026-11-14-cut-a-doc-checks/messages.stdout`: `2fe2fa15ac7bb6c4dbbe6ed404cb2d1a56d8c574b1f5ce311350bd0b24086f37` |
| Whitespace after evidence | `git diff --check origin/main HEAD` | 0 | `2026-11-14-cut-a-doc-checks/whitespace.stdout`: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The manifest also lists the exact command vectors, dependency provenance,
power samples, process preflight, checkpoint and result ledgers, CLI JSON
case report and both checksum files. Check counts come from Node TAP and
the Vitest JSON reporter; no separate discovery run supplied them.


The focused manifest above retains 28 files in its two directories.
[The failed-gate manifest](evidence/2026-11-14-cut-a-gate.manifest.json)
retains 43 files, SHA-256
`61f4d89cf1a233f90413ebb5b3b5eaec1915b8e2455fdb82334ca6e490598675`.
[The fixture-follow-up manifest](evidence/2026-11-14-cut-a-fixture-followup.manifest.json)
retains 43 files, SHA-256
`4c336ee01ed17d1eeb2c5d4d44e199908a7892b7f4b209db7b253f79f8ecb814`.
Each directory holds `SHA256SUMS` and is read-only. The manifests list
every cited output, command, checkpoint and power record. Counts come
from the same-invocation ledgers; the separate audit compares those
ledgers and runs no test.


Cheap documentation and Git checks ran at
`9b1a733ed5cd6c2e9dffb842016e7b095ddc8cc2`, tree
`65300650861328a25497a537f2f1dc4609928bb8`: zero note warnings, 1,246
links with zero broken, seven messages with zero flagged, and clean
whitespace. Their ten-file record is
[the documentation-check manifest](evidence/2026-11-14-cut-a-doc-checks.manifest.json),
SHA-256 `d45c76ffdedb936471b82c22ae16df2ea70fa7f266682b04ef97367b188f47b0`.
This final filing changes the note and that manifest only.

## Open limits

- Checker review remains owed under request `50137f0c`. The original gate
  remains failed; the reviewer must assess the isolated-file repair and
  the separately completed unreached stage under the documented rule.
- Head A must use the planner's values from cutover END `53d5a148` after
  CUT-A. No deployment or live-value application ran here. That END holds
  deployments of the three room Workers until Head A lands.
- Grow's archive disposition remains outside this helper change; AE-1
  (`0c265d01`) owns the shared driver and ARC-1 (`53e13060`) owns the later
  supported-entry cohort and permanent stop. This head adds neither.
