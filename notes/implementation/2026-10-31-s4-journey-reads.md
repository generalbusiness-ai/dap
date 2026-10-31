# S4: bounded room reads and a local review mark

Status: integrated source; final validation pending. Implementation commit
`3fd9cc28bf9f68d2f9afafc2191abdff3a3bf336`, tree
`78e0c1feece4cbab87c9e5ab6ca33bf556e7da9a`, joins S4 A8
`a8c409dff0edca5a29b04f7a51f7259ea001cd12` and landed Main
`112eff124e7a51d2ebdd2d100ae24b52d03848ac`. The original S4 branch remains at
A8. No new full gate or final review
result exists for the combined source. Root must bind the actual clean
post-documentation checkpoint when it releases the gate.

The 61 rows below preserve historical results at their own checkpoints.
Neither failed ordinary gate becomes a pass. The incomplete Native capture
stays inconclusive; the directed V5 Native completion passed at A8. Those
results do not establish coverage of the new Main production changes. The
older documentation-only reconciliation and isolated-test follow-up do not
apply to this integration. S1-room rendering and live acceptance remain owed.

## Behavior and boundaries

S4 adds `apps/views`, four bounded MCP reads and a Decision card over actual
Question records. Authenticated reads bind the active viewer key, MemberRef,
controller and full scope incarnations. Supported families are Membership8
and Membership9 with flat Directory16 and Directory22. Unknown profiles or
partitions remain unsupported. Each collection counts all support scopes in
its eight-scope limit: Membership, Directory and at most six lanes.

Limits remain 50 returned rows, 512 live items, 50 sealed history entries,
16 pages and 64 HTTP attempts. A request has a five-second deadline; a
collection has twenty seconds. Replies are bounded to four MiB and aggregate
bytes to sixteen MiB. Changed heads, omissions and unavailable totals stay
visible. A collection is a vector of observed heads, not an atomic room cut.
The default fetch owns redirect refusal, abort, deadline and byte bounds. An
injected fetch port is trusted; these tests prove no hostile-port cancellation
or physical process drain.

`repo-in-ai.ts` implements `needs_you`, `work`, `context` and `since`.
Attention identifies the pinned declaration/source clause, item, full ref and
head. It distinguishes a request or assignment from permission. Work shows
actual agent controllers, commitment terms, conditions, blocks and exact
Change links. It invents no Native Task or agent authority for a controller.
Context resolves local `bodyAt` positions through contiguous canonical,
hash-checked entries into full FactRefs. A missing body, history gap, required
unread scope or changed head prevents complete context.

Decision uses existing native approve/decide paths with the captured Question
body version and expected revision. The accepted receipt's full scope and
head minimum reaches the next authenticated summary; an older coherent cut
refuses. Native authority and read admission precede that barrier. The local
mark action rechecks the displayed cut and heads, then publishes through
synchronous final admission. It signs no native act and creates no Native
fact, receipt, credential or custody row. It neither erases nor fabricates a
retained native receipt. `since` remains a pure read: repeated reads show the
same new head until an explicit local mark.

`review-store.ts` keeps one owner-only file under DAP_HOME, bound to service,
Directory, viewer key and MemberRef, full incarnation and head. It caps marks
at 64 heads and 32 KiB. It rejects rollback, conflicting equal-sequence hashes,
links, uncertain locks and overflow; duplicates and restart retain the same
mark. A pre-publication failure keeps the prior bytes. After rename, directory
flush or readback failure can leave the new mark visible with uncertain
durability. That result stops for inspection without automatic repeat or a
Native fallback. A later entry remains new. The mark covers displayed heads,
not omitted scopes, every body, all history or an atomic room snapshot.

The trusted local catalogue in `read-tools.ts` supplies bounded immutable tool
descriptors and static list/watch checks without a room inventory. Its
annotations grant no native authority. Ordinary services retain their
catalogue. Native Decision actions keep the service admission and signed
request engine; S4 adds no generic native-act registration.

The opt-in `issue-questions-brief` profile uses existing digest fields, guards
and effects. `ask` records one required Brief digest. `revise-ask` can omit its
comparison or repeat that digest; it cannot replace it. A different Brief
requires a new Question. Historical S3 bytes and pins remain unchanged and
read as Brief-unbound. Approval names the Question text, not the Brief or
conditions. No kernel contract, judge, capability or historical pin changes.
[Kernel section 7](../../docs/kernel.md#7) remains the review boundary.

`package-brief.ts` serves one fixed, non-executable `text/plain` resource at
`dap://package/brief`: copied UTF-8 bytes, at most 64 KiB, checked with raw
`digestBytes`. Context compares that digest with the ask's stored Brief. The
operator selects the local package file at startup. There is no generic URI
loader, client URI selection, external fetch, executable body or Question-body
fallback. Existing `ui://` HTML integrity and policy stay intact. The Node
factory remains inert on import: no home/key read, port or room creation.
The maintained transport and configured signer perform the actual work.

## Source integration and evidence

Request `a7d77a9bb52f9b490fe002d3d4684851b3ca640e`, promise
`185054c48cd88f847085bf417d43df15648e1f49`, and ruling
`2c938074fbe65a0ac8a32a6fdb738adf31da861f` own S4 and its Brief binding.
Earlier Main integration preserved DX's exact minimum-head fences alongside
S4's local action and neutral `CallResult`. The new merge brings Main's
workspace ancestry, fixed-stage diagnoses and safe single-read error-name
repair. The union retains both MCP service seals and all three Scope seals.
It is a production integration, not the historical six-file documentation
reconciliation at `4aa8de96fcc296f026a8540b44a5907089259acc`.

The citation manifest binds six sealed historical collections. `H` is focused
history: 593 files, 56,976,280 bytes. `I` is integration history: 316 files,
27,205,563 bytes. `G1` is the first failed gate: 250 files, 8,747,551 bytes.
`G2` is the second failed gate and helper history: 378 files, 24,642,590 bytes.
`F` retains the incomplete follow-up and rejected analysis: 138 files,
42,239,919 bytes. `N5` retains the successful A8 Native completion: 79 files,
47,127,555 bytes. Every full inventory and SUMS remains immutable.

The compact manifest preserves all 61 command-unit objects and all 208
original H/I file objects. It selects 263 material file objects, omitting only
32 redundant extras that have no direct note link or literal file digest.
Those raw leaves remain available through their unchanged full inventories;
no evidence was deleted. Every note link and file digest remains directly
bound. Both retention-failure receipts, their provenance and diagnoses, the
rejected-plan PLAN/PINS and interrupted-run proof stay selected. The future
gate has no collection, citation, command row or outcome yet.

Each table row records one actual outer command. Controls contain their own
healthy and fault runs. Seal calculations use their lighter receipt schema,
not formal process terminals. Phase wrappers and no-child refusals are not
extra tests. `tsc` expands to `node node_modules/typescript/bin/tsc`; `vitest`
to `node node_modules/vitest/vitest.mjs`. `[R]` and `[C]` name the exact retained
reporter/control arguments in `command.json`. The linked digest identifies
`receipt.json`; each unit also binds its actual command and streams. Durations
use command receipt values, rounded to three decimals.

| Unit and retained prefix | Actual command | Outcome | Wall s | Host child CPU s | Receipt SHA-256 |
|---|---|---|---:|---:|---|
| U01 `H/control-capture-v1/checks/local-admit-control` | `node scripts/control.mjs [C]` | child 2; capture 125; inconclusive; exact restoration | 4.522 | 5.279 | [0913894a0cec82755845cf4dd411c23e1ca04dbdf642e5aa53fa779adf6ed94a](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/control-capture-v1/checks/local-admit-control/receipt.json) |
| U02 `H/control-capture-v2/checks/local-admit-control` | `node scripts/control.mjs [C]` | child 0; capture 0; distinguishes; exact restoration | 4.401 | 4.865 | [46ab4d421c7de5824d1b4777c6455d7be18ff6fd2e6c7edeac82151453505982](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/control-capture-v2/checks/local-admit-control/receipt.json) |
| U03 `H/focused-v1/checks/compatibility` | `node scripts/cloudflare-pool-compat.mjs` | child 0; capture 0 | 0.088 | 0.077 | [39cdbcf8a58764b7c63057a91f921add315a5147733423e098190d06fef7f28e](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v1/checks/compatibility/receipt.json) |
| U04 `H/focused-v1/checks/typecheck` | `npm run typecheck` | child 1; capture 1 | 10.797 | 42.597 | [fbf8d3d7ef2103a230e135d0a8ffcc9d9606b5c179ddeff132a00077963d47d7](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v1/checks/typecheck/receipt.json) |
| U05 `H/focused-v1/generate/lane-reference` | `node apps/room/lanes/scripts/reference.mjs` | child 0; capture 0; declared lane-reference delta | 0.221 | 0.339 | [cfa0f1cd02ce738072d2635d2622b23eadaa7aa30607d9310ff36eb5d9e0d634](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v1/generate/lane-reference/receipt.json) |
| U06 `H/focused-v1/generate/mcp-views` | `node packages/mcp/scripts/views.mjs` | child 0; capture 0; tracked bytes unchanged | 0.311 | 0.158 | [6ff0bb173f62f002e56013464eb78db6e779c6911d6a9b4ca3124efa843a0ed8](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v1/generate/mcp-views/receipt.json) |
| U07 `H/focused-v1/generate/page-assets` | `npm run build --workspace @generalbusiness/dap-page` | child 0; capture 0; tracked bytes unchanged | 0.322 | 0.233 | [811ffa6fa4ebb5fd6c28708450106f08fbdc4fa460dc20a5cff4ea52fd703d28](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v1/generate/page-assets/receipt.json) |
| U08 `H/focused-v2/checks/types-commons-bill` | `tsc -p examples/commons-bill/tsconfig.json` | child 0; capture 0 | 0.268 | 1.047 | [ef0e640c5816f3de775982098542175c6f125a18a7133486b232d84c11c59e13](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-commons-bill/receipt.json) |
| U09 `H/focused-v2/checks/types-counter` | `tsc -p apps/counter/tsconfig.json` | child 0; capture 0 | 0.193 | 0.684 | [f7e09c93e690197bed133ca64ca496ddda34209532a70caca17dbef08ec5ff0f](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-counter/receipt.json) |
| U10 `H/focused-v2/checks/types-counter-browser` | `tsc -p apps/counter/browser/tsconfig.json` | child 0; capture 0 | 0.176 | 0.580 | [bf5992f98aa57a48d1f3a087eeb739c81a029bc01e375b5d648e89923be75823](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-counter-browser/receipt.json) |
| U11 `H/focused-v2/checks/types-grow` | `tsc -p examples/grow/tsconfig.json` | child 0; capture 0 | 0.416 | 1.626 | [51617e3cdcb6499e46da39875f413ee02c9071b58295475b856ba318d56005be](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-grow/receipt.json) |
| U12 `H/focused-v2/checks/types-lending` | `tsc -p examples/lending/tsconfig.json` | child 0; capture 0 | 0.184 | 0.721 | [3424bf939e3c15a74fb17b9021d4ba161dd14566fe6ff85a856cf0f4f0b33d3a](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-lending/receipt.json) |
| U13 `H/focused-v2/checks/types-lending-browser` | `tsc -p examples/lending/browser/tsconfig.json` | child 0; capture 0 | 0.219 | 0.795 | [b6401d15a62b155ba616a46f8c80b260b74443ab510c9748d401617530690c3b](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-lending-browser/receipt.json) |
| U14 `H/focused-v2/checks/types-mcp` | `tsc -p packages/mcp/tsconfig.json` | child 0; capture 0 | 0.282 | 1.120 | [0e69f63c479a7101ce6edd36b11711c78fd6eb50cc8218448bd96f53336ac2da](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-mcp/receipt.json) |
| U15 `H/focused-v2/checks/types-mcp-browser` | `tsc -p packages/mcp/tsconfig.browser.json` | child 0; capture 0 | 0.132 | 0.285 | [ea705b3c9dcf724dc6fd87f825aa2eb8ee1b90971e00d402932e829a10fc0a49](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-mcp-browser/receipt.json) |
| U16 `H/focused-v2/checks/types-mcp-scope` | `tsc -p packages/mcp/tsconfig.scope.json` | child 0; capture 0 | 0.567 | 2.466 | [fad48657f00a3d02ee82a8349bc185e9f7b577d2d773de4e719f5a1543130999](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-mcp-scope/receipt.json) |
| U17 `H/focused-v2/checks/types-mcp-test` | `tsc -p packages/mcp/tsconfig.test.json` | child 0; capture 0 | 0.523 | 2.353 | [6d7f35cbe3396c6fad774c68762710a7a1c8badaa4dc52d9c5055e749581d0be](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-mcp-test/receipt.json) |
| U18 `H/focused-v2/checks/types-sandbox` | `tsc -p apps/sandbox/tsconfig.json` | child 0; capture 0 | 0.148 | 0.331 | [aad65ceefae561fb2469f2b151077d68abadc818c75a9438185ca5acb9f3ec2f](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-sandbox/receipt.json) |
| U19 `H/focused-v2/checks/types-scripts` | `tsc -p scripts/tsconfig.json` | child 0; capture 0 | 0.403 | 1.597 | [2c55292e732c5be34070eec2c1900cf9cbb4e1b2ac3d92b2fa9955a9a0b2465a](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-scripts/receipt.json) |
| U20 `H/focused-v2/checks/types-views` | `tsc -p apps/views/tsconfig.json` | child 1; capture 1 | 0.329 | 1.301 | [5d26582dd3fdc322a50fe62ba693798cce217c604cee768b8d3ff747bf94f03b](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v2/checks/types-views/receipt.json) |
| U21 `H/focused-v3/checks/app-node-owner` | `node --test apps/views/test/s4.test.mjs` | child 1; capture 1; 5 pass, 1 fail | 3.435 | 4.066 | [33af6e3b43fa2907b1ba3d6d4ff202a81f515b9f6312fec28554833c2ae14544](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v3/checks/app-node-owner/receipt.json) |
| U22 `H/focused-v3/checks/types-mcp` | `tsc -p packages/mcp/tsconfig.json` | child 0; capture 0 | 0.544 | 1.308 | [42ab37bb07ec2dcea017b37e5fe63d37424b6b1112f50de9153e0b06bc3cf1ab](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v3/checks/types-mcp/receipt.json) |
| U23 `H/focused-v3/checks/types-mcp-browser` | `tsc -p packages/mcp/tsconfig.browser.json` | child 0; capture 0 | 0.149 | 0.306 | [c39a859ec0abe27d3601f98cf4a914aab476206a9028f456a0054153c0f3bb8b](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v3/checks/types-mcp-browser/receipt.json) |
| U24 `H/focused-v3/checks/types-mcp-scope` | `tsc -p packages/mcp/tsconfig.scope.json` | child 0; capture 0 | 0.608 | 2.524 | [f7f889e9db0a91cec17741a4f0685f6b10f062cb4d59536618b727673386b03c](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v3/checks/types-mcp-scope/receipt.json) |
| U25 `H/focused-v3/checks/types-mcp-test` | `tsc -p packages/mcp/tsconfig.test.json` | child 0; capture 0 | 0.484 | 2.027 | [da3a9e615b16ae73726d0924198c30db21be1b6a2c2e69822ef16e7c27a8ee40](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v3/checks/types-mcp-test/receipt.json) |
| U26 `H/focused-v3/checks/types-views` | `tsc -p apps/views/tsconfig.json` | child 0; capture 0 | 0.379 | 1.540 | [5533643c12ac81be40c55e31d8504bebaef246fe0d57685d8c2fcb407953af43](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v3/checks/types-views/receipt.json) |
| U27 `H/focused-v4/checks/app-node-owner` | `node --test apps/views/test/s4.test.mjs` | child 0; capture 0; 6 pass, 0 fail | 3.791 | 3.473 | [b2287b229dfc274d0aec9dea9d486bb9c2ce4ba5f44ee31d18b2d2161fef2eab](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v4/checks/app-node-owner/receipt.json) |
| U28 `H/focused-v4/checks/fixed-stage-owner` | `node --test scripts/test.test.mjs` | child 0; capture 0; 6 pass, 0 fail | 2.366 | 2.286 | [a961515212ef8e27510db093003e6e1b8b970367a88d89d4ae6bd24f88d5da93](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v4/checks/fixed-stage-owner/receipt.json) |
| U29 `H/focused-v4/checks/security-owners` | `node --test scripts/security-entry-points.test.mjs scripts/security-settings.test.mjs` | child 1; capture 1; 12 pass, 1 fail | 72.394 | 85.250 | [641703d177ae3eae39427327bdf2b75e2060cc4ab479c16369394d78a157b589](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v4/checks/security-owners/receipt.json) |
| U30 `H/focused-v5/checks/plain-owners` | `vitest run --project mcp --project lanes --project page packages/mcp/test/read-tools.test.ts packages/mcp/test/view-resources.test.ts packages/mcp/test/view-sessions.test.ts packages/mcp/test/declared-views.test.ts apps/room/lanes/test/issue-questions-brief.test.ts apps/room/lanes/test/issue-questions.test.ts apps/room/lanes/test/definitions.test.ts apps/room/page/test/assets.test.ts [R]` | child 1; capture 1; 25 pass, 1 fail | 2.720 | 5.957 | [8b112d1d37d4dc2ed2bc96a77b1bcc790a8b7604cc92c1efded511ffc65eaa5a](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v5/checks/plain-owners/receipt.json) |
| U31 `H/focused-v5/checks/security-entry-points` | `node --test scripts/security-entry-points.test.mjs` | child 0; capture 0; 10 pass, 0 fail | 2.879 | 3.584 | [4493f6a4c712685ceaac9c3d8604c1e4724d5a4ea11bcaaa0a5e3fcce5abb751](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v5/checks/security-entry-points/receipt.json) |
| U32 `H/focused-v6/checks/native-brief-owner` | `vitest run --project scope apps/room/lanes/test/issue-questions-brief.scope.test.ts [R]` | child 0; capture 0; 1 pass, 0 fail | 7.445 | 8.231 | [b5ccbf3da1d5942024e5e83f1bcef9571d870d0368b20a39d90924f8ece0b00f](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v6/checks/native-brief-owner/receipt.json) |
| U33 `H/focused-v6/checks/types-mcp-test` | `tsc -p packages/mcp/tsconfig.test.json` | child 0; capture 0 | 0.563 | 2.223 | [33f5d5bf3be13e13ea9c1ab91c2abe1e10d0a31b74f03f6d3004aa17e42635d3](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v6/checks/types-mcp-test/receipt.json) |
| U34 `H/focused-v6/checks/view-resources-owner` | `vitest run --project mcp packages/mcp/test/view-resources.test.ts [R]` | child 0; capture 0; 4 pass, 0 fail | 1.811 | 2.397 | [ebaeaefd874877a315ce26a3c9a5e4a6175bfb79c460e8f432ded4faff1ece8d](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/focused-v6/checks/view-resources-owner/receipt.json) |
| U35 `H/security-seal-calculation/calculation-1` | `node H/security-seal-calculation/calculate.mjs` | child 0; calculation only | 0.462 | 0.533 | [55ddc7d523439dfe2e55b8d97b4c66ae5a9e10db5575ece5e23b7b8cc6aea79c](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-focused-history/security-seal-calculation/calculation-1/receipt.json) |
| U36 `I/integration-v1/checks/app-node-owner` | `node --test apps/views/test/s4.test.mjs` | child 1; capture 1; 6 pass, 1 fail | 2.283 | 2.541 | [dee74775d2b0729fef41e09c179974dd1b9cb233f5c614cf51bfdb4f4b6ee991](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/checks/app-node-owner/receipt.json) |
| U37 `I/integration-v1/checks/types-app-views` | `tsc -p apps/views/tsconfig.json --noEmit` | child 0; capture 0 | 0.325 | 1.300 | [a96835381d62a2ee314797ba33bfc3f20d27ae79f8084488e3c76d61a6c939bb](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/checks/types-app-views/receipt.json) |
| U38 `I/integration-v1/checks/types-mcp` | `tsc -p packages/mcp/tsconfig.json --noEmit` | child 0; capture 0 | 0.280 | 1.045 | [0a3fcbee8ce7e0c2544a216a3a4d017afef12f89fbb189cd6111ec8509a85690](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/checks/types-mcp/receipt.json) |
| U39 `I/integration-v1/checks/types-mcp-browser` | `tsc -p packages/mcp/tsconfig.browser.json --noEmit` | child 0; capture 0 | 0.121 | 0.273 | [ce6e826c1d0dacc234e487a8453fe391e5abd52e74dcb4e12302208e6cb3a655](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/checks/types-mcp-browser/receipt.json) |
| U40 `I/integration-v1/checks/types-mcp-scope` | `tsc -p packages/mcp/tsconfig.scope.json --noEmit` | child 0; capture 0 | 0.469 | 2.387 | [a455b939a107023c5a75d79670cee7b86ea41c65cd20448df93b68ff2e676c34](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/checks/types-mcp-scope/receipt.json) |
| U41 `I/integration-v1/checks/types-mcp-test` | `tsc -p packages/mcp/tsconfig.test.json --noEmit` | child 0; capture 0 | 0.420 | 1.984 | [442f60ff0f2e454c619f326f326ac507b1333b72d3abba4cde3a74d7afa0a7e9](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/checks/types-mcp-test/receipt.json) |
| U42 `I/integration-v1/generate/lane-reference` | `node apps/room/lanes/scripts/reference.mjs` | child 0; capture 0; tracked bytes unchanged | 0.187 | 0.293 | [08a24d670459675e2f9de2cbad74888fc0aa1ef7cbe2d1ef7376d3b3296db1fe](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/generate/lane-reference/receipt.json) |
| U43 `I/integration-v1/generate/mcp-views` | `node packages/mcp/scripts/views.mjs` | child 0; capture 0; tracked bytes unchanged | 0.110 | 0.076 | [de6ca9126748e1d98a31dc9cd7d88ba8100e62a07ed88c9aeb0d8d6c1f4760ce](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/generate/mcp-views/receipt.json) |
| U44 `I/integration-v1/generate/page-assets` | `npm run build --workspace @generalbusiness/dap-page` | child 0; capture 0; tracked bytes unchanged | 0.322 | 0.224 | [ccb1d331784d3260dd6f8c029d1c9a2758b0d43f4b387d1fd9ca92742b3e1f85](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v1/generate/page-assets/receipt.json) |
| U45 `I/integration-v2/checks/app-node-owner` | `node --test apps/views/test/s4.test.mjs` | child 1; capture 1; 6 pass, 1 fail | 2.131 | 2.416 | [77b3fceea6a40ef0d05155503e9507ecd7792600569d06c1fbbcba2a987828f0](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v2/checks/app-node-owner/receipt.json) |
| U46 `I/integration-v3/checks/app-node-owner` | `node --test apps/views/test/s4.test.mjs` | child 0; capture 0; 7 pass, 0 fail | 0.760 | 0.870 | [9152391819c354ab7dac3b111e794e6a366a18533fdcb15936ee78e7cc2a94f5](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v3/checks/app-node-owner/receipt.json) |
| U47 `I/integration-v3/checks/plain-integration-owners` | `vitest run --project mcp --project client packages/mcp/test/read-tools.test.ts packages/mcp/test/view-resources.test.ts packages/mcp/test/view-sessions.test.ts packages/mcp/test/declared-views.test.ts packages/client/test/read-minimum.test.ts [R]` | child 0; capture 0; 27 pass, 0 fail | 1.639 | 3.544 | [106b3c8fed68d66a4b4c3215751a71469125c81709200ba539405d42f3679c1d](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v3/checks/plain-integration-owners/receipt.json) |
| U48 `I/integration-v3/checks/security-entry-points` | `node --test scripts/security-entry-points.test.mjs` | child 0; capture 0; 10 pass, 0 fail | 2.584 | 3.201 | [d15ede3cd796997bd55fc8319d057e67f2c71fd374b28bb013521f096deee06e](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-v3/checks/security-entry-points/receipt.json) |
| U49 `I/integration-seals/calculation-1` | `node I/integration-seals/calculate.mjs` | child 0; calculation only | 0.376 | 0.435 | [73bfe698e50850604491f2b0d15fc739b576e36b67bd75f33bc03b97f3e5aad7](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/integration-seals/calculation-1/receipt.json) |
| U50 `I/control-capture/checks/decision-minimum-control` | `node scripts/control.mjs [C]` | child 0; capture 0; distinguishes; exact restoration | 1.590 | 1.771 | [e13f16e393d03e1b43e2727b98b215e8d2529ded7b74b842119e6a118ff6f5f1](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-integration/control-capture/checks/decision-minimum-control/receipt.json) |
| U51 `G1/gate/outer/gate-1` | `npm run gate` | child 1; capture 1; helpers failed; compilers and test stages unreached | 1.573 | 1.572 | [0bc93c0240bf7ae4df79981361721cb5e5395092f91c3422ad03c110a1c866fe](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate1-failed/gate/outer/gate-1/receipt.json) |
| U52 `G2/helper-repair/checks/checks/shared-helpers` | `node scripts/check-shared-helpers.mjs` | child 0; capture 0 | 0.453 | 0.565 | [7b9351642fd92dddf0db9e7e3c2e63748536927c157c775c40f1dcddf7244ba4](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate2-failed/helper-repair/checks/checks/shared-helpers/receipt.json) |
| U53 `G2/helper-repair/checks/checks/types-app-views` | `tsc -p apps/views/tsconfig.json --noEmit` | child 0; capture 0 | 0.364 | 1.365 | [62566cbf204f6df5d7a6d1ef7ea937ce3d8af1a5c9d39a1d6147ff1512c3c2b2](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate2-failed/helper-repair/checks/checks/types-app-views/receipt.json) |
| U54 `G2/helper-repair/checks/checks/app-node-owner` | `node --test apps/views/test/s4.test.mjs` | child 0; capture 0; 7 pass | 0.853 | 0.907 | [5d54760f6fdf58a8e4f1c9538b4d84ab3d800e27b0a183b12ae60337ae7ec0e1](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate2-failed/helper-repair/checks/checks/app-node-owner/receipt.json) |
| U55 `G2/gate/outer/gate-1` | `npm run gate` | child 1; capture 1; Plain 3201 pass, 1 fail, 1 skip; Native unreached | 158.206 | 420.024 | [8de7bf5b43d8ae7527641120dd90f403c6c552f77d50d5926abf248d352d7aea](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate2-failed/gate/outer/gate-1/receipt.json) |
| U56 `F/followup/checks/types-mcp-test` | `tsc -p packages/mcp/tsconfig.test.json --noEmit` | child 0; capture 0 | 0.413 | 1.870 | [176b696862ef06ae2213ad560fe7cf13b8fed8a941e5f3d5ce992d924dc50d2c](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-isolated-followup/followup/checks/types-mcp-test/receipt.json) |
| U57 `F/followup/checks/compatibility` | `node scripts/cloudflare-pool-compat.mjs` | child 0; capture 0 | 0.076 | 0.074 | [5933f73315c958fa9f3c41aaa8d9e354245771ac022a78e50e7ceed845d4622d](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-isolated-followup/followup/checks/compatibility/receipt.json) |
| U58 `F/followup/checks/wire-owner` | `vitest run --project mcp packages/mcp/test/wire.test.ts [R]` | child 0; capture 0; 12 pass | 6.159 | 4.797 | [6811c6e919f7e0edce4fc7a944e8a82ee8aa31cb759643cf96c347b0443d3a4b](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-isolated-followup/followup/checks/wire-owner/receipt.json) |
| U59 `F/followup/checks/native-phase` | `node /private/tmp/artroom-s4-isolated-followup-source-20261031-v2/run-native.mjs` | child 1; capture 125; stdout-limit; Native child 143 after SIGTERM; inconclusive | 680.287 | 1383.085 | [97701d33cdf6291b75e1b8026bcb1b4d58b4c216b0bce1114624c8a5c91a9ff4](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-isolated-followup/followup/checks/native-phase/receipt.json) |
| U60 `N5/native-v5/checks/compatibility` | `node scripts/cloudflare-pool-compat.mjs` | child 0; capture 0 | 0.082 | 0.074 | [fef0888373f494961f578fa4f1d40f22e1c4abbeab27427c403f298f3e6c6584](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-native-v5-completion/native-v5/checks/compatibility/receipt.json) |
| U61 `N5/native-v5/checks/native-phase` | `node /private/tmp/artroom-s4-isolated-followup-source-20261031-v5/run-native.mjs` | child 0; capture 0; Native 880 pass, 2 skip; 253 modules terminal | 1137.252 | 2285.221 | [f876398f268cdad55733729dca7019acaff643cbf768f5315ec7d3ec1d644643](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-native-v5-completion/native-v5/checks/native-phase/receipt.json) |

The 61 command receipts total 2,123.847197 seconds of command wall time and
4,316.072311 seconds of host child CPU. They include failures, inconclusive
attempts and nested controls, not packaging. These sums are not one
end-to-end duration. Command, collector and runner boundaries must not be
added. Host CPU excludes guest and remote work; host load and caches were
uncontrolled. No cold-cache or future-gate cost is claimed.

## What the historical checks show

The initial broad typecheck failed in imported contexts, including Disposable,
typed fetch-body and Node metrics declarations. Later targeted contexts
include the application itself. Its first compiler failed because the generic
Reads implementation signature was not a visible overload; the added overload
exposes the same implementation without changing fallback or decoding.

The first application owner passed five cases and failed one noncanonical
fixture reply; canonical encoding repaired the fixture and all six passed.
The initial security pair passed twelve and failed one reviewed seal; the
successor entry owner passed ten. An eight-file Plain run passed twenty-five
and failed a Brief resource fixture missing `notifications/initialized`; its
corrected whole owner passed four. The separate Native Brief owner passed
one under actual Membership8 person authority, native lane judgments and
SQLite, with labelled clock, Git and transport. It proves the immutable Brief
guard and retained detached bodies, not package serving, provider or browser
behavior. No Brief guard mutation control ran: changing canonical definition
bytes changes its pin and masks a naive guard omission. The actual wrong-B
refusal still asserts `brief-fixed` with unchanged head and item.

The first integration application attempt failed before an item action because
the fixture remained on a summary page. The next failed with a wrapped refresh
error. Separate TS loader graphs could give `Unread` distinct class identities;
that is an inferred explanation, not an observed inner exception. The shared
loader fixture passed all seven cases. The five-file Plain integration also
preserves S2 capability/controller cases and DX's minimum-head owner. These
scripted reads do not prove production native authority.

The first local-admission control remains inconclusive: child two, capture
125; its parser did not classify the printed failure. The corrected boolean
assertion keeps the same invariant. Its control distinguishes `await admit()`
and restores exact source bytes and modes. The retained no-child invocation
refused unsupported `--mode`; it is not a test or fabricated receipt.

The receipt-floor control passed its seven-case baseline. Dropping ONLY the
summary minimum produced six passes and one named ordinary receipt-wire
assertion: the exact accepted receipt did not reach the application summary
wire. The helper reported distinguishes and restored exact source bytes and
modes. Its retained outer diagnostic is not raw child TAP. Neither successful
control replaces an earlier failure.

Gate 1 failed helpers before compilers and all test stages. Four application
modules now call the optional comparison `sameOptional`; defined values still
delegate to `bytes.same`, and the undefined branch stays unchanged. Focused
helpers, application types and all seven application cases passed before
Gate 2. Gate 2 passed prechecks, compilers, Kernel, Node91 and Counting56;
Plain had 3,201 passes, one failure and one skip, so Native was unreached.

That Plain failure came from the wire cancellation fixture: its fake supplied
`snapshot` while production awaited asynchronous `catalogueGeneration`.
The missing method threw before the fake's deferred gate. Changing only the
fake method restored disconnect-before-read-completion ordering. At A8, the
MCP test compiler and whole twelve-case wire owner passed with unchanged
production, configuration, dependencies, cases, assertions and deadlines.
This isolated test-only result stays attached to that historical source; it
is not the combined-head validation now owed.

The two Gate 2 packaging refusals happened before destination writes. The
[first receipt](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate2-failed/retention-failed-attempt/execution/receipt.json)
records a guard expecting TAP `# pass 7` instead of Node's `ℹ pass 7` spec
line. The [second receipt](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate2-failed/retention-failed-attempt-2/execution/receipt.json)
records the source-parent overlap fence because the old manifest sat above
the destination. Exact old public anchors were staged with
[provenance](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-full-gate2-failed/prior-failed/original-anchor-provenance.json),
keeping the copy guards. These are retained metadata failures, not extra
project commands or changed gate outcomes. Successful temporary copy receipts
and outside-unit retention readbacks are not retained citations.

The first Native attempt remains inconclusive. Its wrapper exited one,
capture 125 and signalled child 143. It read 33,559,772 stdout bytes, kept
33,554,432 and dropped 5,340. SIGTERM and process closure supply no complete
phase: the stream has 149 file-local module passes and 641 case observations,
without final rows, run end or terminal unhandled-error count. Later worker
and global teardown cannot be inferred.

The proposed 149-result/104-file complement never ran. Checker
`3c5d30556992fcb69d179aa5e70d6aa9dbbf8a5e` rejected it; planner survey
`87491c9ef138e7e672b2bee11afb6c285acf943d` kept that verdict. They directed
one full Native completion, treating it as completion of an unfinished step.
V5 ran the unchanged 253-file phase at A8, with the same configurations,
project order, worker limits, cases, assertions, deadlines and 2,400-second
command budget, using 128 MiB per stream. It closed 0/0: 880 passed cases and
two skipped; 252 modules passed and the expected Page recorder skipped. The
end record reports passed and zero unhandled errors. Neither failed ordinary
gate nor the earlier output-limited capture becomes a pass.

The [retained V5 Root proof](/Users/hughpyle/play/artroom-evidence/2026-10-31-s4-native-v5-completion/public-support/artroom-s4-native-v5-root-readback-20261031-v1.json)
binds 3,603 tracked files, 109,999,502 bytes, exact pre/post bytes and modes,
both receipts and the complete Native ledger. Native stdout is 40,930,694
bytes and stderr 2,865 bytes, with no drops. Compatibility cost 0.081510625
seconds of command wall time and 0.074059 seconds of host child CPU; Native
cost 1,137.251548 and 2,285.221191 seconds respectively. Public terminals and
final records do not promise complete live callbacks or physical drain.

## Final validation and remaining obligations

The new Main integration changes runtime and test inputs. The 61 historical
rows remain valid at their recorded heads; their snapshots do not certify
`3fd9cc28` or a later documentation head. One new full gate at the actual clean
integrated source and exact-head review remain pending. No old isolated-test
exception or documentation-only tail substitutes for them. This note predicts
no gate result, collection or final review head.

Application owners use real adapters, codecs, bounded default fetch and file
publication over scripted native replies; their signed canonical entries are
not a Native authority replay. Generic MCP owners retain their stand-ins. The
separate Native Brief case proves no real S1-room render, provider, package
resource, browser or operator custody. The S1 witness remains owed under
request `449c58c7f7b76f25c5575bbb9f30403f7e0d3960` and ruling
`f152f847ca5dc1a009f735aa6ddc862a1eb7bcb9`.

S4 request `a7d77a9bb52f9b490fe002d3d4684851b3ca640e` owns final validation
and review. S6 `ddf2a597876b00342f7481941ca7571a1705d83e` owns the later
version-bound Decision seam. Parser request
`0bcf9984a08c175522c784852a38fd2623104bde` owns failure-block parsing and
raw child TAP retention; it does not reclassify the first control. No S6
wire, new native act, provider operation, hosted route, identity creation,
deployment, settings change or live acceptance belongs to this slice.
