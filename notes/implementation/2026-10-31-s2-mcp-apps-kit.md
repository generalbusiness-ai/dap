# S2 MCP Apps source inventory

Status: source inventory and focused test owners. Acceptance remains open.

This first S2 change inventories Main
`c8c7b63172175576116f86ed4f7facfcdd749ec2`, tree
`540f57099bc8e5835b4f1c9423b387b65a1a2edf`. Request `69080f12` and
promise `46b4a8fb` cover the work. Ruling `f15b9b44` releases S2 source
work from the S1 wait. It does not complete S1 or the live witnesses.

The [MVP plan](../2026-10-16-repo-in-ai-mvp-plan.md), section S2,
and [compact cards design](../2026-10-17-compact-cards-design.md) define
S2. The table identifies existing source, not a new validation result.
Line numbers refer to the source base above.

| S2 deliverable | Current file and line | Existing behavior and remaining work |
| --- | --- | --- |
| Resources on both wire revisions | `packages/mcp/src/wire.ts:249` and `:277` | Both `2025-11-25` and `2026-07-28` dispatch resource listing and reads to `ViewResources`. Keep both paths. |
| Four packaged HTML views with the MCP Apps MIME type | `packages/mcp/src/views/resources.ts:5`, `:8`, `:47`; `packages/mcp/scripts/views.mjs:10`, `:19` | The package supplies Needs you, Work, Decision and Change at the four requested `ui://dap/` names. Each resource carries the requested MIME type. Real journey data remains separate from this generic kit. |
| One inline document per view, digest integrity and empty journey CSP | `packages/mcp/scripts/views.mjs:18`; `packages/mcp/src/views/resources.ts:35`, `:53`; `packages/mcp/test/view-resources.test.ts:12`, `:44` | The generator bundles script and style into each HTML document and declares an empty CSP. The reader checks actual text against its declared digest. Arbitrary package policy stays intact. Existing owners cover corruption and generated-byte freshness. |
| Resource metadata and app-only view actions | `packages/mcp/src/views/tools.ts:20`, `:46`, `:72`, `:79`; `packages/mcp/test/view-resources.test.ts:57` | Opening tools name their resource. Private reads and actions declare app-only visibility. Capability negotiation hides those tools from a host without UI support. Metadata is not native authorization or proof that a real host hides them from the model. |
| Standard bridge and compact cards | `packages/mcp/browser/bridge.ts:13`, `:78`, `:91`; `packages/mcp/browser/main.ts:78`, `:151`, `:247` | The browser uses the standard host relay, quiet model context, detail navigation and Back. No replacement bridge or card implementation is needed. Actual host conformance remains to be witnessed. |
| Absent, stale and unavailable states | `packages/mcp/src/views/session.ts:10`, `:99`, `:195`; `packages/mcp/browser/main.ts:236`, `:240`; `packages/mcp/src/views/types.ts:97` | The kit represents and renders these states. A stale display cut cannot dispatch. A journey source still has to supply honest current state, omissions and exact revisions. |
| Captured actions and original-request custody | `packages/mcp/src/views/session.ts:247`, `:266`; `packages/mcp/src/service.ts:515`, `:535` | Dispatch uses server-retained input and the normal signing and custody path. S2 still owes its same-revision model-act and real-host duplicate-write witnesses. |
| Person, agent with controller, and checker chip | `packages/mcp/src/views/session.ts:64`; `packages/mcp/browser/main.ts:257`; `packages/mcp/src/views/member-text.ts:5`; `packages/mcp/browser/member.ts:26` | Generic actors and native member references have display paths. Agents retain their controller and member kind. Missing identity or controller evidence stays explicit. The S1-room actor witness remains open. |
| Views hold no signing keys | `packages/mcp/browser/bridge.ts:91`; `packages/mcp/src/service.ts:48`, `:535`; `packages/mcp/scripts/views.mjs:1` | The browser asks the host to call a tool. The service signs and retains the native request. Production resource inputs exclude credentials and fixture histories. Preserve that separation in the journey adapter. |
| Host-specific code stays in one module | `packages/mcp/src/views/hosts.ts:5`; `packages/mcp/src/views/resources.ts:3`, `:44`; `packages/mcp/browser/bridge.ts:13` | The sandbox-domain rule lives in `hosts.ts`; the bridge needs no provider global. Resource metadata currently calls that module unconditionally. Basic-host acceptance must demonstrate the required host-neutral path rather than assume it. |
| All views work in basic-host | `packages/mcp/test/support/views-host.ts:1`; `packages/mcp/test/views-browser.mjs:9`, `:19` | The maintained local browser host scripts scope answers and card projections. It is not basic-host or S1-room acceptance. A bounded actual basic-host owner is still missing. |
| Desktop and narrow layouts in both themes against S1 | `packages/mcp/test/views-browser.mjs:15`; `packages/mcp/browser/style.css:1`; `packages/mcp/src/service.ts:71`, `:247`; `packages/mcp/src/node.ts:454` | Existing browser machinery exercises fixture projections. The service accepts a `ViewSource` or a declared package, but the maintained Node entry supplies neither journey source. This base has no `examples/repo-in-ai/views/` directory. Bind real inputs and retain actual rendered acceptance later. |

The next implementation should reuse these owners and change only missing
plumbing. The maintained runtime lives under `packages/mcp/src/views/` and
`packages/mcp/browser/`. The plan's example directory is not an existing
implementation to copy. S4 owns the concrete Needs you, Work and Decision
reads under its separate request.

S4 also requires a Brief whose byte digest matches a digest pinned by the
question. The landed S3 question schema has a detached body and `bodyAt`,
but no Brief field (`apps/room/lanes/src/issue-questions.ts:15`, `:50`).
`ViewResources` accepts only HTML `ui://` resources. Neither the body digest
nor an invented URI supplies the missing relation. A separate source-only
proposal presents the binding choice for planner review before that work.

This inventory adds no kernel part. Any later kernel addition must follow
[Kernel section 7](../../docs/kernel.md#7-rule-for-adding-to-the-kernel).
Keep native authority, current revision checks and private request custody
on their existing server paths.

The first inventory commit ran no tests, gate, generator, browser, Native
run, live room or provider call. Its references identify existing owners.
The following sections record the later focused witness work separately.

## Focused witness work

The test-only checkpoint is
`891179d56223f4871521342536ef2514c552e1e9`, tree
`f95ea7b3f2e8ea0fe83b07e878736c397e49601c`. It adds two assertions to
existing owners and exposes the existing scripted fixture with optional
file custody. It changes no production module, package or lock.

The resource owner checks direct same-key wire callability separately
from the host's tool listing in both protocol and capability paths. The
view-session owner pairs a controlled agent card with an unavailable card
when controller evidence is missing, before any write. Both whole files
passed: five cases in two files. The MCP test compiler also passed.
Existing Native stale-revision and member-read owners remain separate;
this change did not repeat them or relabel their fixture projections.

All ten command captures observed the same 3,572 source files, including
bytes, executable modes and symlink kinds. Those files equal the clean
test-only checkpoint. This later note update changes only this report.
The summary retains the command arrays, stream hashes and source proof:
`/private/tmp/artroom-s2-kit-validation-20261031-v1/SUMMARY.json`, SHA-256
`74b8601597e40ee47f118ddcd245155f90b4b7304caf258c4521d859c43dc13e`.
These are closed scratch captures awaiting final public retention.

In the table, `R/` expands to
`/private/tmp/artroom-s2-kit-validation-20261031-v1/captures/`, `T/` to
`/private/tmp/artroom-s2-basic-host-tool-20261031-v1/`, and `P/` to
`/private/tmp/artroom-s2-basic-host-packet-20261031-v1/`.
Each label names its `R/label/command.json`, `receipt.json`, `stdout.log`
and `stderr.log`. Command cells abbreviate those exact path prefixes.
The receipt records actual argv and the command's own measured wall and
host child CPU. Their values do not measure one end-to-end pipeline.

| Capture | Command | Exit | Stdout SHA-256 | Stderr SHA-256 | Receipt SHA-256 | Wall seconds; child CPU seconds |
| --- | --- | --- | --- | --- | --- | --- |
| basic-host-build-index | `["env","INPUT=index.html","node","T/node_modules/vite/bin/vite.js","build","T/upstream/examples/basic-host","--config","T/upstream/examples/basic-host/vite.config.ts"]` | 1 | `ed389ff853fd8a25a9db13015364af12f14caae655333367f0ff65a427b9de61` | `4f937c231fc8f1f4711628ecd7b32cfff46e147cbbe5af06061367a81920b84f` | `931114bc7aa067f2c34d24df36ac82cb3897996a08a95ddb05b4e718677715bf` | 0.462832167; 0.184815 |
| basic-host-build-index-2 | `["env","INPUT=T/upstream/examples/basic-host/index.html","node","T/node_modules/vite/bin/vite.js","build","T/upstream/examples/basic-host","--config","T/upstream/examples/basic-host/vite.config.ts"]` | 0 | `c5d76c158ab005ff278077f4d97ffc92ce2a73970b22f5b5ef1edff458d6223d` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `b385c89ba0d35e4db3eeb9d06cc3c5d2aef4fa2c2a61078889a1ccb3b1155f3c` | 0.628433333; 1.099351 |
| basic-host-build-sandbox | `["env","INPUT=T/upstream/examples/basic-host/sandbox.html","node","T/node_modules/vite/bin/vite.js","build","T/upstream/examples/basic-host","--config","T/upstream/examples/basic-host/vite.config.ts"]` | 0 | `ad4761a28cb48d6a77e2f4e37c0cec7c9f33347cbc58283df86fc1efefebdf0a` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `d0cf3ea2256c262fbef7918c8ca6aaa24d0b0d0e99aeff12b0d5720473e2a79d` | 0.360893042; 0.596686 |
| basic-host-tool-install | `["env","-u","NPM_TOKEN","-u","NODE_AUTH_TOKEN","npm_config_registry=https://registry.npmjs.org","npm_config_userconfig=T/empty.npmrc","npm_config_cache=T/npm-cache","npm","install","--prefix","/private/tmp/artroom-s2-basic-host-tool-20261031-v1","--ignore-scripts","--no-audit","--no-fund"]` | 0 | `6ba2bc76cd02906398545d637fbe2107291c14b867b523a87283768a32c69049` | `cd5ca9e3de4b9ada42211336319f8fce15ea47e43de722ad38b17564260eb963` | `1f02001c87d33c2cdf01200d037d2123280d6a605dad68c0f9053da89aca63dd` | 6.681108042; 3.543369 |
| compatibility | `["node","scripts/cloudflare-pool-compat.mjs"]` | 0 | `45978ea0483beb9eb5891669029eb1a38a245eb63a83930340be9b85c0d4f6f1` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `b9f215ab09999b4997177ad0b70a6fc16c6a41e1b132529e0785d48ecdbb9999` | 0.081939292; 0.074442 |
| plain-kit-owners | `["node","node_modules/vitest/vitest.mjs","run","--project","mcp","packages/mcp/test/view-resources.test.ts","packages/mcp/test/view-sessions.test.ts","--reporter=verbose","--reporter=json","--outputFile","R/plain-kit-owners/report.json"]` | 0 | `cc26b32f091246f8a586c668453774563af29068bfcddb0dee129b184c7efb42` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `f8d6cc1218f9c2c3cc5333e5adce88d8d8412ec2dcd4989e8ff8cc3bd256a187` | 2.053606959; 2.418794 |
| sdk-negotiation | `["node","--import","tsx","P/qualify-negotiation.mjs"]` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `2acdd7d78d46dba87da3c041080a27a17f1b2fa041e1e68c73a3d19d73a8ee0a` | `3e94275d2882a8945cc4299c2021609e7082bfd0ecabad8b9c877dd6bf25751a` | 1.263531209; 1.523602 |
| syntax-mcp-fixture | `["node","--check","P/mcp-fixture.mjs"]` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `cd1eba5cdcb5962ebeac9d3b9918b9d018db1fb0e6e6e7a2aa710ce4b55eaf18` | 0.067001125; 0.065647 |
| syntax-negotiation | `["node","--check","P/qualify-negotiation.mjs"]` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e903847146a99a157cf7abdf4ad17dc4f374b0a7afd2ecd3d3b2b5d9a07366b3` | 0.069131917; 0.068005 |
| types-mcp-test | `["node","node_modules/typescript/bin/tsc","-p","packages/mcp/tsconfig.test.json"]` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `36014e106978c8335de93cb40632a2cfd92ef5e4acdbf6c505be43b4fb61ffe1` | 0.998018542; 2.024385 |

## Interoperability and acceptance limits

The exact upstream basic-host source is commit
`82221c0c8ce7661efa6771c9d461511b1650495f`, version 2.0.3. Its two
Client constructors supply no UI capabilities. The actual SDK diagnostic
negotiated `2025-11-25` with empty capabilities and received no opening
resource links. A separate explicit UI-capability comparison received all
four links and both app-only tools on the same protocol. Direct authorized
view reads worked in both cases. The diagnostic signed no Native act.

The diagnostic result is `R/sdk-negotiation/result.json`, SHA-256
`6c2ab8143484b38a9a9426fb43d759c2d036be6be59c68c8de3c46dc93ece3ee`.
Production service, wire and HTTP session code executed with scripted scope
answers and card projections, synthetic HTTP admission, and a fresh
owner-only scratch custody home. This establishes SDK negotiation only.
It does not establish a rendered basic-host pass or failure.

The pinned [MCP Apps specification][mcp-apps-capabilities]
requires host negotiation and recommends a text-only server fallback when
that capability is absent. Production negotiation stays unchanged. A
separate unexecuted two-constructor capability proposal retains the exact
upstream delta and diagnostic pins for planner review. No corrected host
was imported, built or rendered. The prepared upstream host and sandbox
HTML built with only an explicit loopback listener adaptation; neither
server launched. The first build's relative-entry failure remains failed.

All dependencies stay in the worktree's own lock-matching copied namespace
or the separate non-Git tool directory. Installation touched no checkout.
The measured child CPU excludes VM CPU. Shared machine load and OS cache
remain uncontrolled; these are warm dependency views, not benchmarks.

No Browser plugin was available. Root reported Cua with no browsers and a
Chrome creation failure. This head makes no new browser claim. The actual
basic-host renderer, desktop and narrow layouts in both themes, and every
S1-room witness remain open. The custom fixture host proves none of them.
No real signing home, room reference or provider entered this work. Both
actual S1 rooms remain stopped. The Brief binding decision is still open.
The full gate, exact-head review and all S2 completion claims remain due.

[mcp-apps-capabilities]: https://github.com/modelcontextprotocol/ext-apps/blob/82221c0c8ce7661efa6771c9d461511b1650495f/specification/2026-01-26/apps.mdx#clientserver-capability-negotiation

Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:69080f128baa8943b60882ce0c61c66490d1bb9b
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f15b9b44c018b1e345b3efe558fcee29d26bffb0
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:27fc7e77d81a4762a90a1a0e7c2de9f384fb907d
