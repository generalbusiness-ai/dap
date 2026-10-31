# S4: bounded room reads and a local review mark

S4 adds the local `apps/views` application, four bounded MCP reads, and a
Decision card over actual Question records. It also adds an opt-in Question
profile that records one immutable Brief digest. Existing S3 definitions and
pins remain unchanged.

The focused checks and controls describe source checkpoint
`8653d6b1421a1a9b85982c57a27f2f1738ae179a`, tree
`c6195dfb0a30b636a2597482528e8ab14fb763ee`. The final focused application,
Plain integration, and security owners passed. The pre-documentation
reconciliation is `4aa8de96fcc296f026a8540b44a5907089259acc`, tree
`af53e0a337a07e2d19621044f7bae4ebf75b4eac`. That merge changes six
documentation files and preserves production and test bytes. The full gate has
not run. The source needs the gate and exact-head checker review before
acceptance. The real S1-room rendering remains owed. This note makes no
hosted, provider, deployment, landing, or live acceptance claim.

## Changes

`apps/views/src/reads.ts` admits configured Membership and Directory refs
before reading their exact incarnations. It supports the declared flat
Directory16 and Directory22 profiles and Membership8 and Membership9. Each
call reads at most eight scopes, including support scopes. It caps output at
50 rows, live items at 512, history at 50 entries, pages at 16, and HTTP
attempts at 64. A default request has a five-second deadline and the
collection has a 20-second deadline. Replies have a four-MiB bound, with a
16-MiB aggregate bound. Refusals, omissions, unknown totals, and changed heads
remain visible. The collection is a vector of observed heads, not an atomic
room snapshot.

`apps/views/src/repo-in-ai.ts` implements `needs_you`, `work`, `context`, and
`since`. Attention names the actual rule, definition, item, and head. It
distinguishes requests, assignments, unread heads, and permission. Work
retains each actual agent controller beside commitment terms, conditions,
blocks, and exact Change links. It does not invent a native Task or treat a
controller as the acting agent.

Context resolves local `bodyAt` positions through contiguous, hash-checked
sealed entries. Missing text, history gaps, an incomplete required read, or a
changed head prevents a complete context. Question selection names the full
ScopeRef and ask ID. Decision uses the existing bound native approve and
decide paths with the captured body and expected revision. The new adapter
offers no generic native-act registration.

`packages/mcp/src/read-tools.ts` adds a trusted local read catalogue. Its
immutable descriptors support static list and watch checks without room
inventory. Descriptor, argument, result, name, and count limits remain
explicit. Read-only annotations describe the adapter. They grant no native
authority. Ordinary services keep their existing catalogue.

`apps/views/src/decision.ts`, MCP view types, and `views/session.ts`
distinguish native actions from the server-held local mark action. The local
action rechecks the displayed cut and observed heads, then publishes through
synchronous final admission. It creates no native intent, fact, receipt,
credential, or custody row. Decision native actions continue through the
existing service admission and signed-request engine.

`apps/views/src/review-store.ts` stores reviewed heads in one owner-only file
beneath the existing DAP_HOME. Its format binds service, Directory, viewer key
and MemberRef, and full scope incarnation and head. It refuses rollback,
conflicting equal-sequence hashes, unsafe links, uncertain locks, and capacity
overflow. The store permits 64 heads and 32 KiB. Duplicates return the
existing mark. A restart reads the same file.

`apps/room/lanes/src/issue-questions-brief.ts` derives a new opt-in profile
from S3. `ask` requires one digest-valued `brief`. `revise-ask` may omit
`brief` and retain the stored digest, or repeat that digest. It cannot replace
it. `QUESTION_BRIEF_DIGESTS` and the canonical definition bind the new bytes.
The historical S3 profile remains separate and reads as Brief-unbound.

`packages/mcp/src/package-brief.ts` serves one fixed non-executable
`text/plain` resource at `dap://package/brief`. It copies the configured UTF-8
bytes, limits them to 64 KiB, and checks their raw `digestBytes` value.
Context compares that value with the ask's stored Brief digest. The existing
`ui://` HTML, integrity, and policy behavior remains intact. There is no
generic URI loader, external fetch, or question-body fallback.

The Node entry composes the maintained MCP transport, configured signer, and
explicit local package file. Importing the factory does not open a home, load
a key, bind a port, or provision a room. README documents the local
invocation. The fixed Node list includes the application owner. The root
typecheck includes its compiler context. Maintained generators produce the
lane reference, Page asset, and MCP view output.

## Decisions and integration

Request `a7d77a9bb52f9b490fe002d3d4684851b3ca640e` defines S4. Ruling
`2c938074fbe65a0ac8a32a6fdb738adf31da861f` adopts the native Brief binding and
amends that scope. An approval names the Question text version. It does not
approve the Brief or the conditions. A different Brief requires a new
Question.

The profile uses existing digest fields, acts, guards, and effects. It changes
no kernel contract, judge, capability, or historical pin. [Kernel section
7](../../docs/kernel.md#7) remains the filing boundary. The new native profile
and generic MCP extensions require source review.

The integration preserves Main's full minimum-head propagation alongside S4's
local action and neutral `CallResult` boundary. The service retains the exact
accepted receipt object and passes its full scope and head minimum to the next
projection. The application passes that minimum into the authenticated summary
read and rejects an older coherent cut. Native authority and read admission
still precede the barrier. Local review publication neither fabricates a
native receipt nor erases a retained native receipt.

The first integration application attempt exposed a missing fixture action at
the new minimum-head assertion. The next attempt reported a wrapped refresh
refusal. Source review found that separately loaded `Unread` classes could
fail the production `instanceof` check. That error-class identity hazard is an
inferred explanation, not the observed cause of the discarded inner exception.
The shared-namespace fixture repair passed all seven cases. These results do
not establish production native authority. The final five-file Plain owner
also retains S2's capability and agent-controller cases alongside DX-A2's
minimum-head owner.

## Validation and retained evidence

The [citation manifest](evidence/2026-10-31-s4-journey-reads.manifest.json)
maps each unit below to its exact command, receipt, streams, and public report
where one exists. File rows contain bytes and full SHA-256 values. `H` names
the sealed historical collection: 593 files and 56,976,280 bytes. `I` names
the sealed integration collection: 316 files and 27,205,563 bytes. Each
external manifest binds its complete inventory. The compact citation manifest
records both external manifest and sums bindings, then the directly cited
leaves. The old collection remains separate and unchanged. The temporary copy
command receipt and outside-unit readback are not retained citations.

Every row records one actual outer command. A maintained control invokes its
own baseline and fault runs inside that row. The seal-calculation receipts
have their own lighter schema and do not claim formal process terminal fields.
Phase wrappers and the refused no-child invocation are not extra test
commands.

All commands ran in the S4 worktree. `tsc` means `node
node_modules/typescript/bin/tsc`. `vitest` means `node
node_modules/vitest/vitest.mjs`. `[R]` expands to the actual verbose and JSON
reporters and unit-specific output path in `command.json`. `[C]` expands to
the unchanged whole-owner control command recorded in that unit. The command
artifact preserves every original argument, including inert temporary paths.
Times use receipt values, rounded to three decimal places. The linked SHA-256
column identifies `receipt.json`, never a stream. The manifest separately
binds each actual stdout and stderr digest.

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

The 50 receipt durations sum to 138.129578 seconds of command wall time and
216.518923 seconds of host child CPU time. Those sums include failed attempts
and nested control work. They are not an end-to-end elapsed-time measurement.
Shared host load and caches were uncontrolled. Host CPU excludes guest CPU and
does not measure remote work.

The historical broad typecheck failed in imported compiler contexts, including
Disposable declarations, typed fetch bodies, and Node metrics types. Later
targeted contexts include the actual application context. Its first targeted
compiler failed because the existing generic Reads implementation signature
was not a visible overload. The added overload exposes that existing behavior
without changing its implementation.

The first application owner passed five cases and failed one fixture query.
Its successor passed all six. The initial security pair passed 12 and failed
one reviewed seal. The successor entry-point owner passed ten. The eight-file
Plain run passed 25 cases and failed the legacy Brief resource fixture, which
omitted `notifications/initialized`. The corrected whole resource owner passed
four. The separate real Scope Brief owner passed one case under actual
Membership8 person authority, native lane judgments, and SQLite. Its clock,
Git answers, and transport come from the labelled fixture. It proves the
immutable Brief guard and detached body retention, not package-resource or
provider behavior.

The first local-admission control remains inconclusive: child 2 and capture
125. Its parser did not classify the printed failure as an assertion. The
corrected boolean byte-equality assertion keeps the same publication
invariant. The second control distinguishes the inserted `await admit()` fault
and restores exact source bytes and mode. Neither record replaces the first
result. A separate invocation refused unsupported `--mode` before any check or
raw capture. Its retained public record describes that refusal and does not
fabricate a receipt.

The final integration receipts report complete closure, unchanged source, and
child and capture zero. The builder's independent public readback binds their
hashes and all 3,598 tracked source entries, 109,858,546 bytes, to this
checkpoint. The prior generator that changed only the declared lane reference
reports that accepted generator delta separately.

## Limits and work still owed

No native Brief guard mutation control ran because changing canonical
definition bytes changes the pinned profile digest and masks a naive guard
mutation. The existing native wrong-Brief-B case asserts the named
`brief-fixed` refusal and unchanged head and item under actual native
judgment. It provides no distinguishing control result for that guard.

The full integrated gate and exact-head review remain pending. The actual
receipt-floor control passed its seven-case baseline. Dropping only the
summary minimum produced six passes and one ordinary assertion: the full
accepted receipt did not reach the application summary wire. The helper
classified that fault as distinguishes and restored exact source bytes and
modes. Its retained diagnostic is not raw child TAP. Any later gate needs its
own closed evidence and note update. The final review request must name the
actual documentation-tail head. This draft does not predict that hash.

The application owner exercises real adapters, codecs, the default fetch
boundary, and filesystem publication over scripted native read answers. Its
canonical signed entries are not a native authority replay. Generic MCP owners
use their declared stand-ins. The separate native Brief case does not exercise
a real S1 room, a provider, a rendered Decision card, or real operator
custody. The S1-room rendered witness remains owed under S1 request
`449c58c7f7b76f25c5575bbb9f30403f7e0d3960` and ruling
`f152f847ca5dc1a009f735aa6ddc862a1eb7bcb9`.

The catalogue offers personal reads only after actual key and member binding.
It supports the named flat Directory families, not arbitrary partitions or
unknown profiles. Omitted scopes remain unread. Complete required selection
can still fail within the finite bounds. The injected fetch port is a trusted
test boundary. The default fetch owns redirects, abort, request, and reply
bounds. No hostile injected port cancellation or physical process-drain
guarantee follows from these tests.

Mark reviewed covers displayed scope heads only. It does not mark omitted
scopes, every retained body, all history, or an atomic room cut. A native
entry after the final check remains new. A pre-publication failure keeps the
prior file. After rename, directory flush or readback failure can leave the
new mark visible with uncertain durability. That outcome stops for inspection
and does not automatically repeat or create a native fallback.

S4 request `a7d77a9bb52f9b490fe002d3d4684851b3ca640e` owns the gate and
exact-head review still owed here. S6 request
`ddf2a597876b00342f7481941ca7571a1705d83e` owns the later version-bound
Decision seam. Parser request `0bcf9984a08c175522c784852a38fd2623104bde` owns
the failure-block parser repair and raw child TAP retention on an inconclusive
result. That separate repair does not reclassify S4’s first control. No S6
wire, new native act, provider operation, hosted route, identity creation,
deployment, or settings change belongs to this slice.
