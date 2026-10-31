# S2 MCP Apps source inventory

Status: inventory draft. Implementation and acceptance remain open.

This first S2 change inventories Main
`c8c7b63172175576116f86ed4f7facfcdd749ec2`, tree
`540f57099bc8e5835b4f1c9423b387b65a1a2edf`. Request `69080f12` and
promise `46b4a8fb` cover the work. Ruling `f15b9b44` releases S2 source
work from the S1 wait. It does not complete S1 or the live witnesses.

The [MVP plan](../2026-10-16-repo-in-ai-mvp-plan.md#s2-mcp-apps-plumbing-and-view-kit-medium-after-s0)
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

No tests, gate, generator, browser, Native run, live room or provider call
ran for this inventory commit. Existing test references identify owners;
they claim no new pass. Source implementation, exact-head review, the final
gate and all S2 acceptance remain due.

Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:69080f128baa8943b60882ce0c61c66490d1bb9b
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:f15b9b44c018b1e345b3efe558fcee29d26bffb0
Rests-On: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:27fc7e77d81a4762a90a1a0e7c2de9f384fb907d
