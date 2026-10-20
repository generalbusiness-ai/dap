# Shared test fixtures

K2's first preparation moves the identical MCP scope-service loopback
transport out of `http.test.ts` and `wire.test.ts` into the package's
`test/fixtures.ts`. Each caller keeps its own stand-in, server, hook,
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

No compiler or runtime result is claimed for this first checkpoint. The
CLI listing's first required gate is still running; K2's affected tests
will run after that process closes. K2 has no final gate, Source, review,
approval or landing.

## Scope and counts

Before counts include every `.ts` file under each package's `test/`
directory, including case files and support files. They are an explicit
inventory, not a claim that every domain scenario is duplicated.

| Package | Before | Current first checkpoint |
| --- | ---: | ---: |
| Derive | 10,312 | 10,312 |
| Platform | 5,851 | 5,851 |
| Scope | 21,402 | 21,402 |
| MCP | 7,829 | 7,834 |

The MCP extraction currently adds five lines overall after its shared
declaration and boundary comment. No overall line reduction is claimed.
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
