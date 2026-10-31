# S2 MCP Apps source inventory

Status: source inventory, focused owners and a corrected-host fixture witness.
The full gate, exact-head review and real-room acceptance remain open.

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

The ten original rows keep their exact text. The next thirteen use `B/` for
`/Users/hughpyle/play/artroom-evidence/2026-10-31-s2-corrected-host-browser/`.
Each label owns its exact `command.json` or `argv.json` command array, receipt
and streams. These records preserve original execution paths. Exit cells in
these new rows show child/capture. Browser wall and CPU use the owned Node
child fields, not the slightly longer outer capture. The preflight receipt
includes its wrapper and source guards. Syntax checks prove no runtime import.
Builds produce scratch host assets, not product acceptance. No sum of these
rows measures one pipeline. Current Source for all thirteen is clean
`1d30d34ccd1896f47ed983e66d99b1141135f84c`, tree
`b4e31ee74dce4c6435469ec64110d74bb1f8cb8f`.

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
| B/builds-v1/captures/corrected-host-build-index | `command.json`; corrected host build | 0/0 | `de43d9c521f6fe9fb43bb00df2d4d8e2b218828ead5fc5c3c1a3cf1b733c992b` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `4b616c4931bb8f92040b3f3a4f41c9275b930b1df317db818db27a1bb53ea59a` | 1.014065584; 1.217009 |
| B/builds-v1/captures/corrected-host-build-sandbox | `command.json`; corrected host build | 0/0 | `c691ddb4ece9e82f58aa4924aca06466c606b5ea191fc1faa148e0020c282c4c` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `0306bb2806c94ed60ce2d49e4f1ffcc7e26b68d9695e6f2686f7458926ea0771` | 0.418770125; 0.694878 |
| B/builds-v1/captures/syntax-browser-driver | `command.json`; syntax only | 0/0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `302e9b2051efbddc25044b88b4aa4220ffb2dc82b00392db18927a89e9fbce80` | 0.086289833; 0.080941 |
| B/builds-v1/captures/syntax-browser-wrapper | `command.json`; syntax only | 0/0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `9f754b303fbd69f1851f38d5850ee1c78f7c79d4232b99b2d9c1e0b908b9faee` | 0.027951000; 0.025068 |
| B/builds-v1/captures/syntax-fixture-adapter | `command.json`; syntax only | 0/0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `50fc2f357c7b8461cc4a25b1d967a4e5277216d0dc9444d9531160c18e3f549c` | 0.079605917; 0.077585 |
| B/builds-v1/captures/syntax-host-owner | `command.json`; syntax only | 0/0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `c725be556a33cc2263bd53f3a95037b79f696046e4de7b35b0fef6552b4ff3c1` | 0.075852667; 0.074127 |
| B/syntax-v2/captures/syntax-browser-driver-v2 | `command.json`; syntax only | 0/0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `56b5ff611ef40b9ffa67740a80a31a873f2f41ed2272bbf0e77e4030755e1171` | 0.072496084; 0.071240 |
| B/syntax-v2/captures/syntax-browser-wrapper-v2 | `command.json`; syntax only | 0/0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `40120d95764e68a675bc05b1cc8dbf4aa66748a66bd4496b3a7d093a60194ca2` | 0.024128750; 0.021479 |
| B/command-v2 | `command.json`; V2: first case failed, 17 unreached | 1/1 | `919089c77f6b2d0cfa1c714e589b9d7e322715e3192eb6f29e0b078f2e6592fc` | `f225e01c96351daa22c2fb65a50b9d2c8238c678f88999adbd697b2f89f8fd93` | `1e22565c630b0c51bc01d6ffb850ce0a95c55d1a67d6c3aa4a34520c4b9808f9` | 8.541937000; 1.658530 |
| B/command-v3 | `command.json`; V3: first case failed, 17 unreached | 1/1 | `8404e0728d7f69911502bd04492158784197c03955e51ec169637acc6d902b5e` | `a556953ef472b6d6f7a1d3bbbd3f29641cf563a256a40f8dc047e61dbad1dbdb` | `d7d1d4f3fcf4f2d4271ea0f37d786b64779a31a2222b54f17759762e6ee1a7eb` | 8.090313625; 1.675306 |
| B/command-v4 | `command.json`; V4: first case failed, 17 unreached | 1/1 | `80d353502051e02188a624ab2374fa0e7d4116f76e1a3d91b9eb982b035bd3f5` | `7de0774ef31aa196a549b30112cb8412cecd88e1bf3b40accf5ada52d22e290f` | `1c5408c28d820fc3a90de4d005faa6890200ad69d0fcb0d3654b0f82d892e2bb` | 8.914771042; 1.664901 |
| B/command-v5 | `command.json`; V5: 18 passed | 0/0 | `17bd351a434386f64f040f279c44cdec20d28353fdee1f0cc63583bfe327d50e` | `95735ad180b72b43e748dcb3081aee2099841ef9e0c78fecc07c1292c2fa9f59` | `75bdec4ffcf3637e23bdccabf4f8491c67bc2dd4e39a840d64fa5420bb117b9a` | 30.829128084; 11.946833 |
| B/preflight-v4/execution | `argv.json`; synthetic admission preflight | 0/0 | `371a7dc83769ebfc88e12d5416d2bed49071867b4d522dd273f4cd3f39543c9f` | `65d9b4ea1f960c658990acb8a7324bc3c99e255d19dd4e8337f1ebe5b10d8367` | `44d85c36efb80005db6db601bfa7e39891a2d9a86b64590ddf0abcca08cacf6c` | 0.678463959; 0.780000 |

## Historical focused-stage interoperability

These paragraphs record the focused stage before the corrected-host runs.
Their unexecuted and pending browser statements remain historical. The next
section records the later browser observations and actual public retention.

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

## Corrected basic-host browser witness

Ruling `f152f847ca5dc1a009f735aa6ddc862a1eb7bcb9` permits a separately pinned
corrected upstream host and scratch headless browser. The host remains upstream
commit `82221c0c8ce7661efa6771c9d461511b1650495f`, version 2.0.3, with two
Client-constructor changes. Both now advertise the standard
`io.modelcontextprotocol/ui` extension and MCP Apps MIME type. The exact patch
is `B/corrected-host/capability-construction.patch`, SHA-256
`27189d5e86c3ea5dae7ee8aba4ff0a397867e2a6419b477a26618aa6df26e040`.
The separate loopback listener patch binds both host ports to 127.0.0.1.
Production dap negotiation and its no-UI fallback remain unchanged. This is
corrected-host acceptance against a scripted fixture, not acceptance by the
unmodified host.

The synthetic browser endpoint accepts only the exact localhost:8080 Origin,
then removes that header before unchanged internal McpHttp handling. The
standalone admission preflight returned allowed OPTIONS 204, initialize 200
and foreign-Origin 403, with zero signatures and submissions. It ran no
browser. The V3 preflight wrapper also has one Root-observed prelaunch refusal
before that formal run. Its Source remains under `B/preflight-source-v3`;
no formal receipt or successful provider call is invented for the refusal.

V2, V3 and V4 browser captures each closed child/capture 1/1. Each failed the
first of eighteen cases and left seventeen unreached. V2 recorded HTTP 403 and
failed host connection before its Tool wait expired. Its fixture forwarded
Origin into McpHttp, whose internal boundary refuses every Origin-bearing
request. V3 moved browser admission to the exact-Origin adapter and removed
that header before forwarding. Its run then exposed the separate exact Tool
label failure. V4 used the actual Tool combobox accessible name, then timed
out at the exact Input label. V5 uses the actual Input textbox name. Both corrected selectors require
exactly one match. V5 also records bounded synthetic DOM diagnostics on failure.
The original success assertions and deadlines remain. These earlier failures
stay failures rather than partial render passes.

V5 closed child/capture 0/0 with all eighteen obligations passed: sixteen
resource, theme and width combinations, a normal accepted action, and the
lost-response Check original case. The combinations cover Needs you, Work,
Decision and Change at widths 1280 and 390, in light and dark themes. Each
opens the real host, enters both iframe boundaries, reads q7 model context,
navigates to q8 at the same revision and renders Builder controlled by Rita
as an agent. The driver checks actual theme, inner and outer no-overflow,
absence of an error overlay and zero signatures during those render cases.

These four resources all use the same scripted card, projection, actors and
completion callback through actual McpService, Wire, internal HTTP and
AppBridge. Their distinct resource/frame coverage is finite. It proves neither
S4 journey adapters nor Native, provider, S1-room or production Origin-policy
authority. The service signs only from its synthetic server-side custody;
the browser receives no signing key.

The normal action changes signatures and submissions from zero to one. It
waits for an accepted receipt and the next card. The loss case exposes Check
original, then settles with exactly one signature and one submission. The
public calls are primary followed by check-1; no second original is sent.
The corrected host negotiated `2025-11-25` with the explicit UI capability.
The earlier unmodified-host negotiation remains a separate result.

The public result `B/browser-v5/result.json` has 93,078 bytes, SHA-256
`32025e54cc44df199c269c68fcc147525195a812e37b987a3710c54f8c3bf511`.
Its capture receipt is
`75bdec4ffcf3637e23bdccabf4f8491c67bc2dd4e39a840d64fa5420bb117b9a`.
All nineteen PNG hashes and dimensions match. Root visually reviewed desktop
Needs you and narrow dark Work, plus the two loss-state images. The unknown
image shows the scrolled viewport without a visible Check button. The checked
image shows the next card while the host result panel still says Loading.
Those images alone do not establish the intermediate control or receipt.
Actual DOM assertions and call/count records supply that evidence. The other
sixteen render-image bindings remain valid without a claim of full visual
inspection. The independent public audit remains under `B/independent-audit`.

The pinned browser reported 153.0.8010.12 and Node v26.13.0. The run kept all
3,572 checkout Source entries unchanged and matched forty-five indexed public
Source/binary pins. Both host groups deliberately terminated their child with
SIGTERM after their cases and recorded no cleanup error. The outer capture
closed its owned group, kept all four mandatory raw bindings, and recorded no
stream drops, console errors or network failure. Its elapsed time is
31.033520625 seconds. The owned command took 30.829128084 seconds and
11.946833 host child CPU seconds. Host load and cache were not recorded for
this invocation. These costs are not a benchmark. Deadlines exclude cleanup,
reaping, group observation and I/O; they prove no escaped-process or physical
descendant drain. The prior six-case inert ProcessOwner qualification is
reused without a new process qualification.

## Post-merge source status

S2 reconciles with landed Main at
`e0c3e133246cb694d1853f141c2437ee0649b326`, tree
`33e0c2eb4a8cfa76a7a492b47d572a454ee8f33c`. Against Main
`0f0a949eb5bd59b13691947fc695073b2c304759`, only the original four S2 paths
differ: this note and the three MCP test or fixture files. The full gate is
pending. This merge adds no test result. The ten earlier focused captures keep
their test-only `891179d5` binding. The thirteen corrected-host build, syntax,
preflight and browser captures keep their `1d30d34c` binding. None was rerun.

## Public custody and remaining acceptance

Two read-only public units remain separate. The focused unit is
`/Users/hughpyle/play/artroom-evidence/2026-10-31-s2-focused-kit-source`:
122 files and 16,465,681 bytes. Its external full inventory is 25,413 bytes,
SHA-256 `cfae14691a93eeee20a40a9e68078baf8d38bd69332ef3a6ce0efa228501b863`.
Its SUMS has SHA-256
`6e6fc4cde8f8002bad3d01bb8600960e6e04281e7d335435bb312e0aebe4f43a`.
The old R/ paths resolve inside that unit's `captures/captures` tree. The old
T/ and P/ paths remain original command provenance, with retained host-tool and
host-packet Source copies. None requires a temporary directory for readback.

The browser unit B contains 302 files and 22,379,034 bytes. Its external full
inventory is 59,383 bytes, SHA-256
`fa4dcd25a3a45feed758734ca437025d389da3fcc6cc0297dca5dd5721672114`.
Its 31,931-byte SUMS has SHA-256
`9b7897bce1ff8e895bddf79faa83777bab4801033e653019ed2e73cebbe29b6e`.
The compact Git manifest binds both complete inventories and SUMS, then lists
exact cited leaves. Those full inventories bind every remaining selected
public leaf. Root reports copy 0/0 and portable verification of all 300 copied
Source leaves. These are custody metadata operations, not project tests.
The public unit excludes private fixture homes, custody bytes, keys, tool
caches, dependencies and the browser executable. No live capture is included.

Keep both units at least thirty days after landing. Removal requires a planner
act naming their manifests. The full gate and exact-head review remain pending.
S1 stays stopped. S4 real journey data, Brief binding and real-room actor and
write witnesses remain separate obligations. This bounded corrected-host
fixture pass grants no landing, deployment, provider or S2 completion claim.

[mcp-apps-capabilities]: https://github.com/modelcontextprotocol/ext-apps/blob/82221c0c8ce7661efa6771c9d461511b1650495f/specification/2026-01-26/apps.mdx#clientserver-capability-negotiation

Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:69080f128baa8943b60882ce0c61c66490d1bb9b
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f15b9b44c018b1e345b3efe558fcee29d26bffb0
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:27fc7e77d81a4762a90a1a0e7c2de9f384fb907d

Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f152f847ca5dc1a009f735aa6ddc862a1eb7bcb9
