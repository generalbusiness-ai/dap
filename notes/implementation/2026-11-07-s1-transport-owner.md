# Hosted MCP transport ownership

Status: the characterization baseline has one passing case and one assertion
failure. The scope compiler passes. The full S1 lifecycle refactor, source-seal
review, gate, independent review, and landing remain pending.
Request `e39e7cef7b8ed71c445ae1285de6dec9b2fbe1ae` and promise `54aa90b3`
own this branch. Parallel order `0d6d0fba` permits its start.

## A held opening loses its restored row after abrupt disposal

The first actual run of `packages/mcp/test/oauth-http.scope.test.ts` uses
baseline `80a91d4e8926fb4a3702a607baa54ec0180f81f7`, which includes the
reviewed M4 landing. The existing deadline and cancellation case passes.
The added held-opening case fails by assertion: the expected restored
`TEST-late-abrupt` row is absent. Production source and the test stay unchanged
during the run. The branch later integrates the reviewed S2 landing.

The test holds a factory that already has a restored HTTP session. It abruptly
disposes the OAuth layers, then releases the factory. The late opening must
return null, and its restored row must remain. The test joins only close
operations that production starts. It calls no graceful close as cleanup before
checking the row.

The component uses production OAuthAccess over DO SQLite and production
OAuthHttpLayers, McpHttp, and Wire. Its standing service, scope service, and
session persistence are explicit stand-ins. The result establishes this
component order. It establishes no HostedAgent ingress reachability or live
loss. HostedAgent still checks its captured transport epoch before restoring
or installing a late layer and before dispatch.

The earlier component probe remains separate in act `a8301c66`. This run executes
the newly committed two-case owner. It repeats neither that probe nor its
loader refusal.

The [baseline manifest](evidence/2026-11-07-s1-characterization-baseline.manifest.json),
SHA-256 `81483e20dbd812499e722d5536630bafc1a3968a426658f1715d2e9779778cc6`,
seals 20 read-only files. They retain the exact source and test hashes,
compiler output, owner report, assertion failure, and unchanged-source receipt.

## S1 still requires the complete lifecycle owner

The delivery still includes all three parts of the request:

1. One owner controls each generation's opening, open, closing, and closed
   state, with named graceful close, detach, and abrupt discard transitions.
2. That owner holds the stream slots and persisted-session write chain. It
   rejects late writes and streams after retirement, while an explicit later
   authorized graceful retirement can still remove retained rows.
3. OAuth and hosted opening share that owner, or the note explains the exact
   authority boundary that remains separate.

The existing deadline, idle-expiry, bearer-epoch, write-order, and stream
replacement witnesses remain required. The implementation must preserve their
assertions and deadlines. The three production source owners and their source-seal
baselines remain unchanged at this checkpoint. The exact seal patch requires
its standing approval before a baseline refresh. The planner owns deployment.
