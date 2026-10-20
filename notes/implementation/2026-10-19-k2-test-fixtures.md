# Shared test fixtures

K2's MCP preparation shares the scope-service loopback transport, native
application-room claim and recipe-row parser in `test/fixtures.ts`.
The current selected checks pass 21 Node cases and five native cases,
with both owning compiler targets passing. Derive, Platform and Scope
consolidation and the final module layout remain ahead.

The first preparation moved the identical loopback transport out of
`http.test.ts` and `wire.test.ts`. Each caller keeps its own stand-in, server, hook,
configuration holds and close order. The factory returns the server before
the listen gate is awaited, preserving the caller's retained server during
setup. Request-body concatenation, JSON response header, streamed response
copy and loopback address stay the same. This is real Node HTTP over the
existing SCRIPTED scope service, not native scope evidence.

Request: `6578efa9e9da839bf0bbb0961ba00b243a8ea06c`.
Builder promise: `d387f722298edf53bf9d6776d9445b930900d422`.
Base: actual Main `dba3e76237250b6ce205d511691554de3d809baf`.
This is interruptible work behind G5a, S2a and G5. No frozen review view
was executed or changed. Dependencies are a private COW copy of unsealed
Main; no package was installed.

The AST-based source inventory finds all 77 outer `expect` chains in the
HTTP file and all 68 in the wire file byte-for-byte unchanged. It parses
TypeScript with the already locked Rolldown parser and executes no test or
repository source. This protects the selected assertion text; it is not a
runtime case-count or complete assertion-helper proof. Imports and setup
are the only changes to those existing test files. No case or deadline is
added or changed.

The owning MCP Node-test TypeScript project passes, and both unchanged
files pass all 21 cases at code/test checkpoint
`4558659714b49d721e07869585bd87ffcb35ff6a`, tree
`41a85b1b8225960d5f65f49721308886f61466ef`. Original process 84481 naturally
exited zero. It ran after the CLI listing's failed gate and documentation
follow-up had closed, with loopback allowed. The raw log reports 4.98
seconds wall and 6.85 summed test time; these are not a measured whole
pipeline or CPU figure. Logs: `/tmp/artroom-k2-mcp-peer-types-20261019.log`
and `/tmp/artroom-k2-mcp-peer-focused-20261019.log`.

These are real Node HTTP/stdio transports and clients over the existing
SCRIPTED scope service. They prove no native scope judgment, provider or
deployment. K2 has no final gate, Source, review, approval or landing.

## Shared MCP room and recipe builders

Matching code checkpoint `7d2779561c6472dfdf6f87f3bff5aafbeb916813`, tree
`2a4610b0dc5117d35363f3e52a2830cb702fdd43`, adds the common room-claim and
recipe builders. Counter and lending keep their explicit distinct cohorts,
activation, role actions, configuration bytes, idempotency keys, clock
advance and scenario bodies. The two identical setup assertions move
unchanged into the common helper, called once by each original room builder.
All remaining expectation expressions and complete actual test-call source
are exact. The Node files retain all 145 expectation chains. The AST
mapping is `/tmp/artroom-k2-mcp-shared-assertion-map-20261019.json`; it is
source evidence, not a runtime case-count proof.

The shared module receives Node's server constructor explicitly. It has no
runtime Node-server or Worker-implementation import. An initial type-only
import of native `Room`/`Agent` still pulled Worker-only source into the
Node compiler. That actual compiler failure is retained in
`/tmp/artroom-k2-mcp-shared-node-types-20261019.log`. Narrow structural
tool/room interfaces corrected the dependency graph; no compiler setting
or ambient type allowance was widened. Both Node-test and native-story
compiler targets now pass.

Original process 40444 naturally exited zero after two sequential focused
commands: HTTP/wire, two files and 21 cases; Counter/lending, two files and
five native cases. Their unchanged case bodies still exercise the real
Node clients/transports and native MCP/scopes respectively, with their
existing scope-service, Git host, scheduler, clock and ownership boundaries
labelled. Private pool adoption ran before the native checks, changing
`8d3d1150…` to `cd50d18a…`, without an install.

Measured outer Node command: 5.26 seconds wall and 4.62 CPU. Native command:
6.92 seconds wall and 6.96 CPU. These are separate commands, not a summed
pipeline. The working source stayed unchanged during them; the matching
code checkpoint was saved afterward. Its starting Git HEAD did not yet
contain those uncommitted edits. Exact final file hashes and this limit
are in `/tmp/artroom-k2-mcp-shared-checkpoint-20261019.json`. Raw compiler,
runtime and timing logs use `/tmp/artroom-k2-mcp-shared-*20261019*`.

## Scope and counts

Before counts include every `.ts` file under each package's `test/`
directory, including case files and support files. They are an explicit
inventory, not a claim that every domain scenario is duplicated.

| Package | Before | First peer checkpoint | Shared MCP checkpoint |
| --- | ---: | ---: | ---: |
| Derive | 10,312 | 10,312 | 10,312 |
| Platform | 5,851 | 5,851 | 5,851 |
| Scope | 21,402 | 21,402 | 21,402 |
| MCP | 7,829 | 7,834 | 7,850 |

The first peer extraction adds five lines overall; the portable shared
MCP module now adds 21 in total, including explicit runtime ports and
boundary comments. No overall line reduction is claimed.
Full per-file baseline counts/hashes are in
`/tmp/artroom-k2-before-lines-20261019.json`; the selected assertion
inventories and tool are `/tmp/artroom-k2-expect-*20261019*`.

The remaining work covers the other duplicated builders and the requested
final fixture module layout. The planner has been asked whether one
supported package fixture entry may retain private domain modules and
separate runtime boundaries. Scope's pure packet helpers are imported by
Node MCP tests; its native lifetime code imports Worker-only APIs and
ownership hooks. An eager physical merge would change which runtime can
load those helpers. The independent Node peer extraction does not depend
on that choice. The read-only inventory and concrete Node consumers are
recorded in `/tmp/artroom-k2-fixture-survey-20261019.json` and
`/tmp/artroom-k2-fixture-runtime-boundary-20261019.json`.

Actual Main's passing Vitest count is 1,926 with three existing skips. The
request's survey cites the unlanded G5a head's 1,939; its extra cases are
not silently imported or claimed here. The final gate must retain the
actual integrated base's case count and all existing assertions/limits.
