# Explicit recovery of expired custody (CE-2)

Public MCP `settle` and a repeated CLI install can end an expired
original after a checked session journal proves its actor and idempotency key absent.
Expiry and a settlement `not-found` alone still end nothing. Card checks
keep their separate route: resend the exact expired original and retain
the scope's actual answer.

Request: `2ed36d706990a34cde46cfa05bf3404aa1391fce`.
Promise: `b1a1385d80e5c4a0059c35cdb697062d4c56c694`.
Precode `ad5955ea` and rulings `d264dea5`, `bc7d46d5`, `98c1dba9`
and `d41b97c3` bind the explicit callers, scope-time proof and Card case.

## Source and behavior

CE2 source checkpoint `8a08f2a5cad246fc02c2387343eceb689cc540fe`, tree
`7ec4d8b42bd456b30d07428e821d329598257c4f`, has fourteen CE2 paths and
parent `ed48b64d747f3af750a5f5d2a2a26ebed9a5a104` (LW-1). Its normal
commit hooks passed in 0.781430 s: 950 source files and 159 bytes exports.
The development records below bind their actual working-source hashes;
they do not claim one earlier clean CE2 head. The later CLI fixture repair
and four-case pass remain distinct from its earlier three-case pass.

The joined implementation checkpoint is
`38fec867b7c6034bf1319ddb23783ba73d445123`, tree
`b569f041c290f56f1f0be601e0aa0eb6a25ce228`, parent `8a08f2a5`. It
adds only the two permitted measured presentation fields.

Gate attempt 1 ran at `31d337778ea5275f6d338f1f1198fe022f7355f1`, tree
`5cbfba863564b669d70b94bfcaee604c4d7c7c17`, against published main
`ce6f02ba164982dce9ead6b85c9e482ca1829f07`. START was
`f8a3720988a203c39147394f674ea7b974ec8c55`; END
`f67e825bb021934e0995e2c80a7ba0c922f96ed4` records FAIL. The sole
failure is the inventory owner's stale generic settle description in
the documentation. Native was unreached in that gate. The document-owner
and Native follow-up also failed, at `d1beb6f05988100a3f9321d1eb34f69a10c25f08`,
tree `1771e678e35ec771bba651bf9de6e69cf7c8fb95`, under END
`3743d64a20e3ab8a0a25de4f34a10d2fc9c710fb`. Neither route supplies a
gate PASS. The production repair is committed at
`b59fca7541b3809c08768f93b5b1681792e1afbc`, tree
`27a37e0fa18db79e9e5009600cb2731d00c33809`. Focused validation passed at
its note-only successor `480508d8f7fcb68d9a0dad3385ecb2e8850cd5aa`, tree
`9306be3136c716ae7e91c97c2009d1810f9e2963`. Gate attempt 2 started at
that exact head under START `b600fdace92f87b54e2f50c77fa2c220f67d3e27`.
END `97cec6f0d96e4551f671c2f1de18d40be30a3c5a` records PASS. The head,
tree and published main stayed clean and exact. Both earlier FAIL results stand.

`Reads.recoverAbsent` uses the caller's session and the existing checked
log reader. It checks the complete continuous chain from genesis to one
fixed head, its scope and pinned definition, and the absence of any entry with the
kept actor and key. The verified head entry's time must reach the signing's
`notAfter`. A local clock past expiry and margin is only eligibility to
ask. Filtered, refused, archived, incomplete, malformed or contradictory
history supplies no absence proof.

`Custody.absentIf` rechecks the exact latest signing, attempt, meaning,
pinned definition and incarnation under the existing lock before committing the
local `unsent` ending. The scope reads run outside that lock. A failed or
stale proof itself closes no signing and creates no `unsent`. Ordinary settlement
may separately retain a real Native outcome; that is not absence evidence.
The original envelope and history stay under custody. Admission bounds,
storage locks and the guidance to settle earlier records stay unchanged.
No full-trigger scan, timer recovery or eviction was added.

The CLI opts in only on an explicit repeated install. It asks for the
actual Native settlement first, so a landed original does not loop on a
mere journal-present result. MCP install does not opt in; public MCP
`settle` is its recovery entry. A later tool call on an already-unsent
record returns a truthful custody diagnostic without another proof or
ACT. Only proved absence uses NF-2's existing `{error,message,next}`
custody failure with the `unsent` wording. Local absence supplies no Native
answer, receipt or new success tag.

Rulings `206d7d21f7dbb7836cd8cd5f90937559defa3aee` and
`41b4ba66ad115fd82713696bfd06f069ef5e4d58` preserve the ordinary
NF-2 report. After non-ending recovery, MCP reads custody once more and
reports that current record. An unresolved record keeps the `ok` shape,
`answer: "unknown"`, phase, steps, `outcomes` and `attempt`; the reason
belongs in `sentence`. A replaced snapshot receives changed-record
wording. A terminal record supplies its actual kept outcome through the
ordinary report builder, and a missing record supplies `not-found`.
No second absence proof runs.

For unchanged unresolved proof results, `next` names both deliberate
routes: call the original tool with the same key to resend the same
envelope, or call `settle` after a later journal entry. A changed
unresolved record directs a later `settle`.

The repeated CLI install keeps its unknown first line and exit code 1
only while custody remains unresolved, then adds the reason. A recovered
terminal answer uses the existing receipt and entry verifier in the same
invocation. A missing record gets truthful not-found wording. Every
recovery branch returns before build or send; no new ACT or package
preparation follows recovery. MCP install still omits this opt-in hook.

The original Native assertion of `answer: "unknown"` and
`phase: "unknown"` remains an acceptance fact. The test-only `01d`
repair's reported 19-case pass accepted the wrong contract and is
superseded. It supplies no acceptance evidence. The production repair restores that old assertion and adds the reason,
unchanged record, capacity and exact-envelope retry assertions beside it.
The repaired default-256 witness and proof at 1 ms before expiry now
expect the unknown report with its reason. Their focused owner passed
at `480508d8`. The earlier passes and gate 1 measurements remain bound
to their earlier source; they do not validate the repaired report shape.

Ruling `d41b97c3` extends the existing Native Card case without adding a
case or deadline. It restarts McpService on the same custody, loses a late
resend before delivery, and exercises the recursive
`resendExpired:false` check while the original stays unresolved. A later
deliberate check sends the original POST bytes once and gets Native's
`expired` refusal. Each check attempts at most one envelope; no new ACT
signature, proof call, full-log read or `unsent` ending appears.
Read-session authentication may sign a session request; that is not an ACT
signature.

## Evidence

The table separates development, controls, both failed routes, measured
recovery phases and the repaired-source checks. Walls measure the actual
commands, rounded to six decimals. Phase rows keep their reported milliseconds; they are not
independent commands or a sum that replaces gate wall time.
The table gives full SHA-256 values and the actual argv location in each
record. Root retained the reviewed safe development files permanently.
The control rows cite their actual safe gate 2 copies. Those files retain
the original bytes and hashes; no fresh control ran.

| Check and source | Actual result and wall | Raw record, full SHA-256 and argv location |
|---|---|---|
| Initial shared Client/MCP source snapshots | Client source, Node and test compilers passed; MCP source and test compilers passed. Client owners: 24 passed, exit 0, 1.710543 s. MCP group: 32 passed, 1 failed, exit 1, 2.306083 s. Reads' 11 cases, the default-256 case and install words passed; errors retained an old unsent expectation. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-focused-attempt1-20261115/result.json` (`dd61a884214eb32c0bfa66122285fda3f5bfe88afbbabe8267ee117654d5707c`); its sourceBefore/sourceAfter maps retain the actual input hashes. Actual argv: `results[*].argv` in that record. |
| Repaired errors expectation | Whole errors owner: 20 passed, exit 0, 1.678349 s. The earlier group remains FAIL. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-errors-followup-attempt1-20261115/result.json` (`bb9702d43112750fccf618dcd67f56df532ed007043316c5cc5e0e8f03e4db9b`). Actual argv: `[*].argv` in that record. |
| Initial CLI/Card compiler interval | MCP scope and CLI source compilers passed. CLI test compiler failed TS2353 on the fixture's unsupported `platform` property, exit 1, 0.487452 s. Later commands UNREACHED. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-card-dev-attempt1-20261115/result.json` (`ffee95a9fee03d52d88dcf8893e9cec0d9c6f7abb766c827fa0c46185471eb6c`). Actual argv: `results[*].argv` in that record. |
| Corrected CLI fixture; loopback setup refusal | CLI test and scope compilers passed. CLI owner failed beforeAll on OS `listen EPERM` at 127.0.0.1: no case body ran; all three cases skipped. Exit 1, 11.622660 s; Card UNREACHED. This was a setup failure, not three failed behavioral cases. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-card-dev-attempt2-20261115/result.json` (`cf6c32b4e07106870d3476ec2f27548e636957d96c15d6d3ebf593332e5eede0`). Actual argv: `results[*].argv` in that record. |
| Exact permission retry on unchanged inputs | CLI owner: 3 passed, exit 0, 5.034856 s. Whole Native Card owner: 21 passed, exit 0, 56.577145 s. Card stderr retained two existing Native fixture lines. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-card-dev-attempt3-20261115/result.json` (`23433111c900bc2d6e7cdfc954b725ca0712cfaa5768e328f65ff248e2587ebc`). Actual argv: `results[*].argv` in that record. |
| Checked-head time control | DISTINGUISHES, helper exit 0, 3.540921 s. Reads owner: baseline 11 passed; mutant 10 passed and 1 assertion failed, returning absent where unproved was required. | Gate 2 copy: `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt2/controls/expiry-control.stderr`, SHA-256 `e5f3cd315e5ad299dda961b7ea741b84e846208b1c25122eeea076c9cea0a042`; actual argv: retained control result.json `results[0].argv` below. |
| Snapshot attempt control | DISTINGUISHES, helper exit 0, 3.583646 s. Custody-signings owner: baseline 20 passed; mutant 19 passed and 1 assertion failed, applying a stale proof. | Gate 2 copy: `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt2/controls/attempt-control.stderr`, SHA-256 `fdd8e8273c3ca9559dbeca1be2b4fefe62f7762fd3ed06abf3978c4ba17d192c`; actual argv: retained control result.json `results[1].argv` below. |
| Card exclusion control | DISTINGUISHES, helper exit 0, 111.856159 s. Card owner: baseline 21 passed; mutant 20 passed and 1 assertion failed because recoverAbsent was called once. | Safe-only gate 2 copy: `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt2/controls/card-control.safe.txt`, SHA-256 `9552f839c921e79cc16ae3d4df524b315350d88068cd7695f4884de0f6c2caf1`. Actual argv: control result.json `results[2].argv` in the control directory below. Signed-request dump WITHHELD privately. |
| Page freshness and Security | Page assets owner: 1 passed, exit 0, 0.769151 s; no asset changed. Whole Security owner: 12 passed, exit 0, 3.885271 s. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-page-security-attempt1-20261115/result.json` (`6ed960873853f7ab699cd2b9ab7a02c05d3706748a824e65d1bdee2bd1d886ff`). Actual argv: `results[*].argv` in that record. |
| Reviewed MCP source seals | One maintained calculation: exit 0, 0.212509 s; complete 39-record inventory. Four changed/new records: module, McpService, unsentRequest and absenceRecovery. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-mcp-seals-20261115/result.json` (`928876fd39cfb0b23411f03c10e5ea59cb1ceddc2342d762e7f072b00155dcf0`), with execution.json beside it; service source SHA-256 `65f74e018bcdeec72c466c725d299e9d632855492a7b0e70a5fb061f897630b8`. Actual argv: execution.json in that directory, SHA-256 `a967c88970129a73363ce9148268a346209e9edbaa9dc5ec435ec507c4efb7d8`. |
| Native-settlement-first CLI extension | All three CLI compiler contexts passed. Extended owner: 3 passed, 1 failed, exit 1, 4.759609 s. The new landed-original fixture omitted required Counter target 7; the prior three-case pass remains historical. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-liveness-dev-attempt1-20261115/result.json` (`f1d1f11d20e6301310c0235acdee1594096deb2b8832b8871b8ee44eb14b7158`). Actual argv: `results[*].argv` in that record. |
| Corrected landed-original fixture | Fixture supplies the required `--values` target and asserts actual judged acceptance. Affected CLI test compiler passed; whole CLI owner: 4 passed, exit 0, 4.393699 s, empty stderr. Source and scope compiler passes cover that historical runtime source. END `0b3d46ff`. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-cli-liveness-dev-attempt2-20261115/result.json` (`a759850fe766b3351899e6e7b073814ed3f1e265f1d9215106cde5694e9423db`). Actual argv: `results[*].argv` in that record. |
| `8a08f2a5`: once-only normal three-way comparison | PASS, exit 0, 1.888492 s. Grow 2.0 exact; all entries, definition lists and semantic IDs exact. Only Lending and Counter 0.4 presentations changed. END `b7f7ded2` initially stopped adoption for planner disposition. Stderr retains DEP0205. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-compare-attempt1-20261115/comparison/comparison.json` (`8f61f97b3d4768aa6ce4505ec49e95f75bb8b42cbfdde52d26a5af684a2868f9`), with execution.json in its parent directory. Actual argv: ../execution.json, SHA-256 `00c9eac0da06aa58de1183d650a9f9049cbe612563b49eba4d97638197dd2ed3`. |
| `38fec867`: permitted identifier apply | PASS. Normal apply: exit 0, 0.266111 s; only Lending and Counter presentation fields changed. Normal formatting hooks and commit passed in 1.216504 s; source clean. END `de371b383e5a807e63eed01c106c4797f96c5009`. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-id-adoption-attempt1-20261115/result.json` (`4c1dcee01470991cb47cd3692dc3569dc9b55768b50d55b67c2e03e8e84516af`); actual command and commit streams beside it. Actual argv: `results[*].argv` in that record. |
| `38fec867`: whole CLI examples and release reproduction owners | PASS: examples 3 plus reproduction 1, all 4 passed; exit 0, 7.245860 s, empty stderr. Normal preparation reproduces all three committed tuples. Compatibility passed. END `eee6f777083cd17a9d595a3a839de32e2b5ac273`. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-lw1-reproduction-attempt1-20261115/result.json`, SHA-256 `9d66bd799434f9f6634e85bdf1f98995ff2a69da72fd9b6136cfb546484d3049`; actual argv: `results[*].argv`. |
| Permanent safe development retention | 61 explicitly reviewed files; no full Card request/display dump copied. Metadata record, not a test command. | `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/retention-index.json`, SHA-256 `06bb9e468eb9aff6dbaf213b16689a5bdc13df69291d88cef325d520c2caf3b2`. |
| `31d33777`: ordinary `npm run gate`, attempt 1 | FAIL; child exit 1, verification exit 1, signal null, reaped. Child wall 344.323734 s; outer wall 344.617307 s; printed test step 314.6 s. Preliminary checks passed. Kernel passed; Node 204 passed; Counting 56 passed; Plain 4,872 passed, 1 failed, 1 skipped across 418 passed files and 1 failed file. Sole failure: `packages/mcp/test/inventory.test.ts:98`, stale `settle` prose. Native UNREACHED; natural Scale has no executed result or wall. | `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt1/result.json`, SHA-256 `ab99da9b708d412f8ae0fc0ff43aa4af11f1ec25af87bd003fa750100dbb9fb1`; actual argv: `step.argv`. Public gate.log in that directory, SHA-256 `765324afcc13b99f820054aae9be253abba15501bf281c47067ecc1dd990d94e`. |
| Gate 1 stage observations | Kernel 242.606334 ms; Node 132401.136542 ms; Counting 488.039458 ms; Plain 181086.245958 ms; Native status unreached, exit/wall null. Node and Counting terminal evidence complete; Plain partial; 129 unknown/suite observations, zero contradictions. Concurrent module/case sums are not stage walls. | `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt1/stage-status-summary.json`, SHA-256 `69930be7f134c5200dfab23537bbb367661c39ce7b2fe1fb11ab96f7a94fa8f2`; same gate `step.argv`. |
| Historical gate 1 numeric phases | All eight original metric objects remain historical evidence at `31d33777`, whose gate failed. They do not validate the repaired report shape. No rerun supplied that dataset. The detailed rows below instead describe current gate 2. | `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt1/ce2-phase-metrics.jsonl`, SHA-256 `5d200fe643d67864e72f230a03641346451dc24a206109340c982d22bd8fcb66`; original index SHA-256 `db3fb52b9145c04dd25629c3a1f96347d1186fe5f914ad245f1f8769c4b6e4ba`. |
| Gate 2 numeric-phase source | All eight closed numeric/route-count objects retained byte-exact from this gate's private test log; complete coverage, no unexported phase. No request body or assertion dump exported; no extra witness run. The next eight rows summarize those objects. | `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt2/ce2-phase-metrics.jsonl`, SHA-256 `86f377c68f0f3550be3ce8c301a576557edf43e18ee7eb4a64341f63ed7124c6`; index in the same directory, `ce2-phase-metrics-index.json`, SHA-256 `1158e3a4dc66724125b7dec0fcb58c21abf9fc6fba5a1b8fd4422fb71cd1fc53`. Actual gate `step.argv`; phase rows are not separate runs. |
| Gate 2 CE2 phase 1: SQLite and real destination setup | 19.354333 ms; target entries 4; `used` 0 B, `reserved` 0 B. This setup object reports no RPC/signature counters. | Current safe metric stream, row 1; index `rows[0]`. |
| Gate 2 CE2 phase 2: initialization | 2.353625 ms; ACT signatures 0, session signatures 1, dispatches 0, helper calls 0. Requests: POST sessions 1, GET summary 3; log rows/bytes 0. Target entries 4, unresolved 0; `used` 0 B, `reserved` 0 B. | Current safe metric stream, row 2; index `rows[1]`. |
| Gate 2 CE2 phase 3: one real 256 load | 805.434542 ms; ACT signatures 256, session signatures 0, dispatches 256, helper calls 0. Requests: GET summary 1,024, POST acts 256; log rows/bytes 0. Target entries 4, unresolved 256; `used` 507,648 B, `reserved` 670,720,256 B. | Current safe metric stream, row 3; index `rows[2]`. |
| Gate 2 CE2 phase 4: not-found-only remains full | 2.884500 ms; ACT signatures 0, dispatches 0, helper calls 0. Requests: GET summary 4, POST settle 1, POST acts 0; log rows/bytes 0. Target entries 4, unresolved 256; `used` 507,648 B, `reserved` 670,720,256 B. | Current safe metric stream, row 4; index `rows[3]`. |
| Gate 2 CE2 phase 5: verified head before expiry | 13.693417 ms; ACT signatures 0, dispatches 0, helper calls 1. Requests: GET summary 6, POST settle 1, GET log 1; served 5 log rows, 11,843 B. Target entries 5, unresolved 256; `used` 507,648 B, `reserved` 670,720,256 B. | Current safe metric stream, row 5; index `rows[4]`. |
| Gate 2 CE2 phase 6: verified head at expiry | 11.773083 ms; ACT signatures 0, dispatches 0, helper calls 1. Requests: GET summary 2, POST settle 1, GET log 1; served 6 log rows, 14,185 B. Target entries 6, unresolved 255; `used` 507,824 B, `reserved` 668,100,255 B. | Current safe metric stream, row 6; index `rows[5]`. |
| Gate 2 CE2 phase 7: retained proof reused | 3.383709 ms; ACT signatures 0, dispatches 0, helper calls 0. Requests: GET summary 5, POST settle 0, GET log 0; log rows/bytes 0. Target entries 6, unresolved 255; `used` 507,824 B, `reserved` 668,100,255 B. | Current safe metric stream, row 7; index `rows[6]`. |
| Gate 2 CE2 phase 8: fresh 257th signs and dispatches | 3.684209 ms; ACT signatures 1, dispatches 1, helper calls 0. Requests: GET summary 4, POST acts 1, POST settle 0, GET log 0; log rows/bytes 0. Target entries 6, unresolved 256; `used` 509,819 B, `reserved` 670,720,244 B. | Current safe metric stream, row 8; index `rows[7]`. |
| `d1beb6f0`: document-owner and Native follow-up | FAIL under authority `8dfbb11d3f060f434b5929655ed1b09b3e14bbd9`. Compatibility exit 0, 81.831834 ms; whole unchanged inventory owner 5 passed, exit 0, 1481.329417 ms. Native exit 1, 610313.331375 ms: 1,135 passed, 1 failed, 2 skipped; files 286 passed, 1 failed, 1 skipped. Outer wall 612237.832375 ms. All children reaped, no signal or spawn error. END `3743d64a20e3ab8a0a25de4f34a10d2fc9c710fb`. Original gate remains FAIL. | `artroom-evidence/2026-11-15-ce2-lw1-doc-native-followup-attempt1/result.json`, SHA-256 `a906559499e2df3101e42029f193687352e7fdffe2e1b63d8127c2dda9772050`; exact argv: `controllerArgv` and `commands[*].argv`. |
| Follow-up Native acceptance failure | The existing page-first case at `apps/room/page/test/mcp-original.scope.test.ts:401` expected `['unknown','unknown']` and received `[undefined,undefined]`. Ruling `206d7d21` preserves that assertion and requires a production answer repair. The old assertion did not become stale. | `artroom-evidence/2026-11-15-ce2-lw1-doc-native-followup-attempt1/native-final-failure.safe.txt`, SHA-256 `1c3b97c10a1099c5cffd03ee5b522545b7e0f4383df79f33e47adcba9eaf423c`. Exact inspected 1,118-byte assertion/count excerpt. Full Native log WITHHELD privately. |
| Follow-up summary and natural Scale | Summary exit 0, 88.024583 ms; Native terminal evidence partial, zero unknown/suite observations and zero contradictions. Other phases were unreached in this follow-up, not repeated passes. Natural Scale `omit`, reason `outside-scale-paths`, all match sets empty. No Scale command or result ran. Concurrent duration sums are not wall time. | `artroom-evidence/2026-11-15-ce2-lw1-doc-native-followup-attempt1/summary.log`, SHA-256 `087fbdb4532c6658920a580f2fbd3c260406e28cac3831124d7953a8b791f954`; actual selection and summary argv in the same public `result.json`. |
| Superseded test-only `01d` repair | Historical whole owner: exit 0, 19 passed, 25.386832 s. Ruling `206d7d21` supersedes its changed expectation as the wrong contract; no acceptance or gate PASS follows. | `artroom-evidence/2026-11-15-ce2-nf2-repair-dev-attempt1/2026-11-15-ce2-page-original-owner-attempt1/result.json`, SHA-256 `4ef8ee45d712ccae48946dd021969b9fb50fc027833e9bfb123269e318541e1b`; actual argv `commands[*].argv`. Raw fixture output stays private. |
| `b59fca75`: current-record production repair | Normal commit hooks exited 0, 0.928933 s. Only the module, absenceRecovery and McpService seals changed in the maintained 39-selector calculation; calculation exit 0, 0.232031 s, experimental type-stripping warning retained. No tool description changed. The focused results below cover the repaired source; no gate PASS follows from them. | Commit metadata `artroom-evidence/2026-11-15-ce2-nf2-repair-dev-attempt1/artroom-ce2-nf2-current-record-commit-20261115/result.json`, SHA-256 `0bf8109432f754fbdff2ad7aeaf81dfcf0361946ab71df92784789f5dfc66d2a`; seal execution `artroom-evidence/2026-11-15-ce2-nf2-repair-dev-attempt1/artroom-ce2-mcp-seals-ruling206-20261115/execution.json`, SHA-256 `0e2315973bdb774f7f02660948b3057039564238a6d0ac6614a63ca56aa24d12`, actual argv in both records. |
| `480508d8`: repaired Client, MCP and CLI whole owners | PASS. Client install 4 passed, exit 0, 1.096498 s. MCP absence, errors and inventory 30 passed, exit 0, 2.035818 s. CLI install 4 passed, exit 0, 4.131070 s. Compatibility exit 0, 0.083077 s. All children reaped; separate stderr streams empty. | `artroom-evidence/2026-11-15-ce2-nf2-repair-dev-attempt1/2026-11-15-ce2-nf2-focused-owners-attempt1/result.json`, SHA-256 `a84f66b592aac911c1976137731d8fdc0b0449d00267da3b00c436071cc5c2fe`; actual argv: `commands[0..3].argv`. |
| `480508d8`: restored Native Page assertion, assets and Security | PASS. Whole Native Page original owner 19 passed, exit 0, 24.334797 s. Assets 1 passed, exit 0, 0.298247 s; no module changed. Whole Security 12 passed, exit 0, 4.050549 s. All reaped; stderr empty. Security stdout retains its experimental type-stripping warning. The Page owner is a new repaired-source pass, distinct from superseded `01d`. | Same safe focused result, SHA-256 `a84f66b592aac911c1976137731d8fdc0b0449d00267da3b00c436071cc5c2fe`; actual argv: `commands[4..6].argv`. Full fixture output remains private. |
| `480508d8`: whole examples and reproduction | PASS. Examples 3 plus reproduction 1, all 4 passed, exit 0, 6.629733 s. All tuples reproduce unchanged; no further comparison or apply ran. All focused commands together took 43.217284 s. | Same safe focused result, SHA-256 `a84f66b592aac911c1976137731d8fdc0b0449d00267da3b00c436071cc5c2fe`; actual argv: `commands[7].argv`; outer wall: `wallSeconds`. |
| `480508d8`: ordinary full gate attempt 2 | PASS, exit 0 and verification exit 0; signal null, reaped. Child wall 835.491364 s; outer wall 835.811380 s; printed test step 804.8 s. Kernel passed; Node 204 passed; Counting 56 passed; Plain 4,877 passed and 1 skipped; Native 1,136 passed and 2 skipped. Source/main stayed clean and exact. END `97cec6f0d96e4551f671c2f1de18d40be30a3c5a`. Earlier failures remain FAIL. | `artroom-evidence/2026-11-15-ce2-lw1-full-gate-attempt2/result.json`, SHA-256 `edb3450ed7e22486e737a7a70dce0af85a432bea8ddeff169c11137848f0f98c`; actual argv `step.argv`. Root inspected and released the exact gate.log, SHA-256 `93c76571a112f9501dc53b34d46775a54f601f89abee05db9204a1f0dbed4a1a`. Shared helpers and whole typecheck also passed at this exact head before START `b600fdac`. |
| Gate 2 stage evidence and natural Scale | Kernel 246.406500 ms; Node 131486.293417 ms; Counting 485.461083 ms; Plain 176049.611875 ms; Native 496107.263708 ms. All four case terminal ledgers complete; scope-stories module summary partial. 129 unknown/suite observations, zero contradictions and report errors. Per-phase user/system times remain unknown in the runner ledger; concurrent case/module sums are not walls. Natural Scale omit, outside scale paths, all match sets empty. No Scale command/result/wall. | Same gate directory's stage-status-summary.json, SHA-256 `aac1dc6cfa0ca1489d1f4e16b8b39921cf0fa5f5e6f35eed85bd7de49292a3a3`; scale-selection.json, SHA-256 `d6dabca6232aef2369de1dfda78a7f64c68f4e9c424389990bcea5f5330b316a`; inspected gate.log. |
| `480508d8`: Card workflow commands | PASS, all seven commands exit 0 and reaped. Producer 0.253745 s; generated equality 0.259816 s; compatibility 0.255022 s; views 65.674397 s; declared views 6.428988 s; owned scopes 4.617963 s; Grow routing 51.204707 s. Outer wall 129.689435 s. Generated bytes and mode unchanged; source clean. Four Node browser commands each retain the existing 191-byte DEP0205 warning in stderr. | `artroom-evidence/2026-11-15-ce2-lw1-card-browser-attempt1/workflow-result.json`, SHA-256 `124db2549c714e258ae7612f3a303acdc73443255eba3f9d9e02b0ce0fea7f34`; exact argv/cwd/environment and walls: `stages[*]`. START `89f8cbd40aa32b1eb342fe38859b406b17ee8cd9`; END `6f299703cdf96532f7f287241fe1737aff5bc8c2`. |
| Card visual and route QA | Root QA PASS on Chromium 153.0.8010.12 with Playwright 1.63.0. Views 104 cases and 59 contracts, zero recorded errors; declared views 7; owned scopes 4; Grow 2 width cases at 320 and 592, zero recorded errors. Fifteen inspected images show meaningful pages/controls, no framework overlay or horizontal clipping. At 200%, the 1,213 px card uses expected vertical scrolling in a 1,000 px viewport. | Same public directory's qa-summary.json, SHA-256 `40ffe7d85708d68b4bd32220b696ccbd29524266b39765377e3ea262ae7b6b95`; `visualReview.images` records all 15 reviewed public PNG paths and hashes. Scoped console/pageerror assertions passed. |
| Card process and privacy QA | Root QA PASS. No observed task descendant, direct stage process or browser profile remains; cached headless browser process count 0. All 113 capture originals and full streams remain private. Only 15 reviewed image copies and closed workflow/QA/process metadata entered public evidence. | Same public directory's process-check.json, SHA-256 `05beb3c68662b6515ed658b35a9c0a3560fb776b6c4896385be11ebc131f7db8`; qa-summary.json records the private-retention boundary. No process was signalled by the read-only process check. |

Each control changed only its named guard and restored exact source bytes
and mode 0644. No third green ran. The retained helper changed only its
retention at exit; classification, runner and deadlines stayed unchanged.
The retained control metadata directory is
`artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-guard-controls-attempt1-20261115`.
Its result.json (SHA-256 `48675c0575ce2facb4e84fa406d87f9065718d423e962a11bf11ec7943ebfaf1`)
retains actual argv in `results[0..2].argv` and the helper identity.

The Card control's full stderr and after.json contain a full signed
fixture custody/request dump. Root retained eight original files under
`artroom-private-evidence/2026-11-15-ce2-card-control-attempt1`;
those payloads are WITHHELD from public evidence. The approved safe source
is `artroom-evidence/2026-11-15-ce2-lw1-dev-attempt1/artroom-ce2-control-safe-retention-20261115/card-control.safe.txt`.
It retains only byte-exact allowlisted counts, verdict and assertion
headline, with the SHA-256 in the table. No rerun supplied that summary.

The passing Native Card owner's full stdout can also hold ACTOR-RECORD
display/envelope dumps. Its originals stay in the private tree's
`native-owner`; the table cites only safe driver metadata. Its two finite fixture stderr events are safe, and root
can separately export inspected exact pass/count lines. No recursive raw
copy is authorized. Full gate stages likewise stay private; root must
inspect gate.log before any release and retain safe numeric CE-phase
records separately.

The failed follow-up's full Native log exceeds 4 MB and stays private at
`artroom-private-evidence/2026-11-15-ce2-lw1-doc-native-followup-attempt1/native.log`
(SHA-256 `3f7f19179b5a204b8efa35e92d9791c8d672609f8ef49670cf6cf33ded62db4f`).
Its timing rows and inventory report also stay private. Public evidence
contains only the safe result metadata, summary and exact inspected
1,118-byte final assertion/count excerpt. Root retained the complete private original separately.

## Limits and remaining work

The default-256 witness uses real SQLite custody, real signatures and
McpService admission. Its other-signer destination entries use the actual
in-memory Platform/Derive judgment, seal and fold. Membership, session and
HTTP authority remain scripted. This is not a hosted-service, Native
Worker or sealed-floor acceptance proof. Rejecting floor-shaped history
and the source audit do not supply such runtime evidence.

The initial development reporter hid the default-256 cost log; those
earlier costs remain unmeasured. Gate 1's eight objects remain in the
historical dataset. The detailed rows above now use all eight actual
objects from the passing gate 2 Plain run. The 256 lost requests are
custody records, not 256 journal entries: the target starts with four
entries, and the two checked proofs serve five and six rows. The successful
expiry proof frees one unresolved count slot while retained bytes remain
charged. Its byte counters do not prove recovery of an arbitrary aggregate
budget. These are fixture measurements, not remote SQL prices or a bound
for larger journals. No separate load rerun supplied them.

The CLI recovery rows reopen real file custody through the runtime
callback; they create no new process. They do not prove Native Worker
session authority. The older CLI launcher witness separately covers its
stated process/module boundary. No provider, live Git host or production
key ran.

The model audit found no changed protected observe/http/oauth lifecycle
function. No model execution, coverage-pin advance or new formal claim
follows. Existing formal assumptions do not prove journal absence or
storage atomicity.

The once-only comparison measured Lending presentation `188f7b84…` and
Counter presentation `52378055…`. Counter's presentation changes because
its browser bundle includes the Custody class that CE2 changes.
Planner ruling `0955cc13b38a32a23ba27e2d2d5b0384a0f3935c` authorizes
applying both measured fields once, with both versions open at 0.4.0.
The normal apply committed those fields once at `38fec867`; it changed
no version, pin, definition, scenario or signed packet. The exact adopted
Lending presentation is
`sha256:188f7b84e6b1ba29c2090265f4d7884a29884beff6ea58774a34ce8fbeef9f81`;
Counter's is
`sha256:52378055c218a42c6808af21fea097b69e42b9cc52877f3cec12ad432df8ff9e`.
The stop rule still covers Grow and every entry, definition list and
semantic identifier. Whole reproduction passed at `38fec867`.
Gate 1 remains FAIL on the stale documentation assertion. Its two coupled
snapshots, `docs/mcp.md` and `docs/mcp-tools.json`, changed under the
document-reader route. The unchanged inventory owner then passed, but
Native failed on the preserved unknown-answer acceptance assertion.
Ruling `206d7d21` ends that route and requires a production repair and one
new full gate. Focused validation of the production repair passed at
`480508d8`; the new full gate passed at that same head under END
`97cec6f0`. Natural Scale omitted; no Scale result ran. The required Card
browser workflow and root visual, privacy and process QA passed under END
`6f299703`. Browser scripts ran locally on macOS at this head. The Linux
workflows have not run at this head.

The browser fixtures use scripted host, transport and report-text inputs
and public TEST keys. The OwnedCore/SQLite route covers its stated
scope, signature, custody and replay boundary. The results claim no LLM
backend, provider, physical device, hosted deployment or release authority.
Full contexts, receipts, signed material, Native actor records and raw
captures remain private; the public evidence contains only inspected
copies and closed metadata.

The final source act and artifact reports record the documentation checks,
reviewed head and final note tree. Guarded review and landing follow this
evidence filing. Earlier RS1/LS2 results
discharge none of those obligations.

RS1 and LS2 landed at `ce6f02ba164982dce9ead6b85c9e482ca1829f07`,
with reviewed tree `04cd7584658e2e0874344b391cb2aeb045a88c29` and normal
receipt `fdb8fbee7c175e3896360898ec76f65d32708fc6`. Both original promises
are satisfied. Checker `f2af19af` found the landing clean, and planner
origin act `6b7b421e` published that exact main. Planner reported that
each dry-run Worker bundle equals its deployed bundle, so no deployment
followed. The builder made no push or deployment.

The private integration at `7eeef11e32bfc7a8b7abe7b0475a669b5c720d7a`
preserved its full tree `4f60bede997e90fed310cd53615a989f2450ab45`.
That is the implementation checkpoint plus the two evidence notes.
Rulings `df8040e5` and `6b7b421e` end the pre-origin gate allowance
and release one gate for the head that contains published main.
Planner owns later 0.4 signing from main that carries the joined head.

The final follow-up changes only these two implementation notes. Source,
tests, configuration, dependencies and generated modules keep the exact
Git blobs and modes from tested tree
`9306be3136c716ae7e91c97c2009d1810f9e2963`. Artifact reports and the
final source act bind the final note-only head and tree separately. The
[document-only follow-up rule](../../docs/evidence-filing.md#follow-up-after-a-gate)
applies; no additional full gate follows these note changes.
