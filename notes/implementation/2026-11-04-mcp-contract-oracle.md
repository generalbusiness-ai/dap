# Check the card's outbound messages against pinned upstream contracts

The card browser owner now validates captured outbound messages against
upstream MCP Apps schemas. The oracle derives payload shapes from those
schemas, independently of dap's types and scripted host handlers. The
existing strict-host handoff witness remains in place.

Request `dc800768` follows the testing-strategy report `7f7def61`.
The invariant is that the generated card sends a valid JSON-RPC envelope
and the declared payload for each offered or negotiated protocol revision.
The [test-only oracle](../../packages/mcp/test/support/mcp-apps-contract.ts)
runs in the Node browser owner. Product code and the generated card module
remain unchanged.

## Each protocol revision keeps its own upstream schema

The vendored generated JSON schemas come from
[`modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps).
The source commits are `cf599cc462406accc90ec3ca7879e3a22a9fc2a8` for
`2026-01-26` and `4c51eb0301aece4fe55ae6136bf6444f6a484569` for
`2025-11-21`. Their SHA-256 digests are, respectively,
`3823abdec2ab00069420812520c20f561428e1bf328c8f61189094f5160e33d9`
and `0cf806f95572908e472a68baba92a5a5b351af2c28703bff40563b897f73bae9`.
[Provenance and licenses](../../packages/mcp/test/support/mcp-apps-upstream/provenance.json)
travel with the unmodified files. The loader checks each digest before it
builds validators through Zod's JSON Schema reader.

The oracle takes method names and payload definitions from upstream
`$defs`. It validates the initial offer against the offered revision,
then later messages against the negotiated revision. The pinned MCP core
schemas check JSON-RPC envelopes, request and notification identity, and
`tools/call`. The seven exercised methods are `ui/initialize`,
`ui/notifications/initialized`, `ui/notifications/size-changed`,
`ui/update-model-context`, `ui/request-display-mode`, `ui/message`, and
`tools/call`. The complete owner requires coverage of all seven.

The older schema declares no `ui/update-model-context`. For a specimen
that negotiates `2025-11-21`, the oracle admits that newer extension only
when the host actually answers its request with `-32601`. It validates
the request's newer shape and records a refused extension. This does not
establish older-revision conformance for that method or a Goose defect.

The MCP workspace now declares two direct test dependencies:
`@modelcontextprotocol/core@2.3.1` and `zod@4.4.3`. Both already existed in
the installed dependency graph. Every resolved package version, integrity,
and package node remains unchanged. Offline `npm ls` exits 0. No package
installation took place in a checkout.

## The generated caller runs through bounded host cases

The browser owner captures actual `postMessage` traffic from the generated
production card. It runs two revisions, two optional-capability cases,
and three identities: ordinary text, a manifest identity, and Unicode
with quotes and a newline. These twelve cases retain the exact identity
in the explicit handoff text.

Context updates and navigation leave the fixture's model-turn count at
zero. One accepted **Ask in chat** press records one turn; a refused
press records none. Each case then tears down the resource and checks
the reply envelope without another turn. Two malformed initialization
cases show an error and send no follow-up request.

The bridge's ten focused unit cases include both supported revisions,
absent optional capabilities, malformed replies, and teardown while
initialization, input, or a tool reply waits. They use event delivery
and promises without added sleeps or wider deadlines. The unit checks
use MCP core's universal envelope schema; the independent payload oracle
stays in the Node owner.

The host and scope answers are scripted. The model-turn counter measures
fixture routing, not provider behavior. These cases establish no Native
authority, desktop-host acceptance, or real model response.

## Restoring the real caller's object shape fails the oracle

The focused run passed fifteen browser cases and 27 contract checks:
the existing explicit handoff, twelve bounded cases, and two malformed
replies. The browser owner still asserts the exact content array and the
strict host still rejects an object.

The distinguishing control changed the actual caller from
`content: [{ type: "text", text }]` to `content: { type: "text", text }`,
rebuilt the card, and ran the unchanged oracle and owner cases. It exited
1 by assertion `INDEPENDENT MCP CONTRACT McpUiMessageRequest`, at
`params.content`. The strict host returned `-32602` and recorded no chat
message or model turn. Exact source and generated-bundle hashes confirm
restoration. This control did not substitute a hand-written message for
the caller.

## Focused evidence preserves failures and visible errors

The [focused manifest](evidence/2026-11-04-mcp-contract-focused.manifest.json)
covers 69 read-only public files across upstream provenance, dependency
preparation, and safe validation metadata. It indexes 773 owner-only raw
originals, including browser reports, the controlled failure, and loader
caches. Public metadata contains no fixture custody.

The first compiler run exposed a Node-only import in browser compilation.
The oracle moved to the Node runner. The next run exposed a revision
literal type, which the implementation narrowed. The browser and Node
test compilers then exited 0, and all ten bridge cases passed. No compiler
option changed.

The first malformed-reply screenshots hid the error because the fixture
iframe stayed one pixel high. The fixture now reserves 220 pixels only
when it deliberately sends a malformed reply. The affected compiler and
both malformed cases passed afterward. The retained screenshots show
the error and **Read card again**. Product layout did not change.

The focused harness uses the maintained owner's exact helpers and fifteen
cases. It directs output to durable storage and omits unrelated Native
actor setup. Browser tooling uses the existing scratch installation of
Playwright `1.63.0` and Chromium revision `1243`; the Browser plugin was
unavailable. Full exact-head Card CI and the single gate remain pending.
