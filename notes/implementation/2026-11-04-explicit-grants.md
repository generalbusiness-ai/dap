# Refusal tests name the check that decides

Request `0ca130695021c4f74be45b21ee9901a855ba23ac` asks for one guarantee: a test that expects refusal identifies the check that refuses the act. A missing grant cannot satisfy an expectation about a business guard.

## Make the fixture authority visible

The shared pure `Ledger` fixture now calls its broad default `allActionGrants()`. That method grants every declared action to every fixture actor. `presentedGrants()` supplies the effective grants to `context()`, so Grow can keep per-key permissions and Replay can keep its fresh scripted proofs. Eight references in four consumer files use the effective provider. An explicit `context({ grants })` still overrides that provider.

The Counter and Lending guides now explain this default beside their fixture examples. These grants stand in for membership. The change neither expands native authority nor changes production behavior, configuration, dependencies, or package exports.

## Match the intended refusal

The pre-change inventory found **64 physical assertion sites** in the pure fixture and its consumers: 35 checked only the refusal state, 21 checked `guard-failed` without identifying the guard, and eight checked aggregate or formatted judgments. This count does not expand loops into cases. The retained classification includes each old assertion and five excluded lifecycle or capability-outcome checks. Other outcome, preparation, delivery, and profile-compatibility boundaries remain outside this signer-judgment audit.

Those 64 sites now match the refusal reason. Guard expectations also match the guard's name or detail. Checks that decide before a guard, such as input validation, moved revisions, and final-item refusal, keep their own reasons.

Two setups could previously pass for the wrong reason. The Counter test asked a non-controller to start only after the controller had started, so the board-state check could decide first. It now asks while the board is paused and requires the controller guard. The Lending final-item loop passed `reason` to `borrow` and `return`, which reject that unknown field before checking final state. Only `cancel` now receives `reason`.

One new paired judge test submits the same wrong requester's signed `assign` intent. With an explicit grant, the real pure judge returns `guard-failed` at `guards.1`. Without that actor's grant, it returns `unauthorized`. Each local expectation also rejects the other real answer. The witness uses ordinary Vitest matchers and scripted grants. It introduces no assertion framework or history generator and proves no native membership enrollment.

## Keep failed expectations in the evidence

The first derive compiler attempt found the old Grow provider assignments. A later broad compiler attempt found the three Replay overrides. Both attempts stopped before their test bodies. The effective provider remains a method so Replay can override it.

The first full focused body ran 20 affected owner files: 217 cases passed and three failed assertions. Source inspection identified the checks that the unchanged scenarios reach:

- Missing install text metadata fails `bad-field` at `definitionText0` before the package guard.
- The saved late Counter callback fails `revision-moved` before final-state and guard checks.
- Watering without actual policy evidence fails the named `watering-exceeds-schedule` guard at `guards.3`.

Only those three isolated test files changed. Their compiler contexts and complete owner files then passed all 14 cases. The final affected union contains **220 cases**, rather than the sum of repeated runs. Two later edits changed guide prose only. The sealing check compares every other final focused input with frozen Git source `af21a3f4adb7a9d3274f767b9bcfc3a20048a978`, tree `44a7ba382282addfd859dcdc3e7b98ce4a394ce3`.

An unused inventory probe tried a TypeScript API path absent from TypeScript 7.0.2 and exited before any audit or test body. Its metadata records that limit and claims no durable raw-error file. The actual audit uses the retained pre-edit `rg` output and manual classification.

## Evidence

The focused [manifest](evidence/2026-11-04-explicit-grants-focused-validation.manifest.json) names ten sealed public files. Its retention record names 621 private original files, including compiler failures, full reports, source snapshots, command logs, and their hashes. The files began in durable storage. The original tooling-probe error has only tool-transcript custody, as stated above. Retain the evidence for at least 30 days and record any later removal in a workroom act.

| Check | Command or record | Outcome and retained file |
|---|---|---|
| Pre-change assertion count | `rg -n` command in `inventory-command.json`, followed by manual source classification | 64 sites; `classified-assertions.json` |
| Focused commands | Exact commands, exits, and separate wall and CPU times in `commands.json` | Both compiler failures, the historical 48-case judge pass, 217-pass/3-fail body, and 14-case follow-up retained |
| Final affected union | Twenty owner files, replacing only the three repaired owners | 220 passing cases; `focused-result.json` |
| Source identity and custody | SHA-256 comparison of raw snapshots, final Git inputs, and retained originals | Two guide-prose differences only; `focused-result.json` and `private-retention.json` |

The complete [gate manifest](evidence/2026-11-04-explicit-grants-gate-validation.manifest.json) names thirteen public files and inventories 2,277 private originals. I read the actual `gate.exit` as `exit 0`. The unchanged gate ran once at the frozen source above, in 1,637.35 seconds on the shared Mac with existing cloned dependencies. All four terminal phases completed: 135 Node, 56 Counting, 3,912 plain with one skip, and 1,078 Native with two skips. There were no contradictory records or unhandled errors. The record retains 99 suite or unknown observations and the skipped Page recorder's missing final module duration.

Source and dependency snapshots match, and the owned process group closed. Every gate log began in durable storage. The recorded `mktemp` wrapper changes only output placement. The archive owner passed in 261,200 ms with its already-landed instrumentation; request `64552d40` still has no established historical cause.

The focused manifest SHA-256 is `c935ec6a1e0471c0e21552d4c0ee90dc58f45bb0f79935300316f7be7eb60811`. The gate manifest SHA-256 is `783ffe65eb56c7274f9b32675009f54782ce7737e392fa468d9bb77430d30976`. All 23 public files match their digests and remain read-only.

Only this note and the two manifests follow gate tree `44a7ba382282addfd859dcdc3e7b98ce4a394ce3`. Source and tests remain unchanged. The review records the candidate tree and the documentation checks. [Test dap](../../docs/testing.md#follow-up-after-a-gate) requires no repeated whole gate for this documentation-only follow-up. These paths require no Card workflow, and this fixture-only change needs no deployment.
