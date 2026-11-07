# Hosted MCP transport ownership

Status: the shared generation owner is drafted. The HTTP and idle owners pass
14 cases. The two-case OAuth transport owner passes, and the added held-loader
case passes on both the previous source and the draft. Both deliberate controls
fail at the intended assertions. The complete hosted and OAuth selection passes 50 cases in nine files. Together
with the HTTP and idle owners, 64 distinct focused cases pass. Source-seal
approval, the gate, independent review, and landing remain pending. The planner owns deployment.

Request `e39e7cef7b8ed71c445ae1285de6dec9b2fbe1ae` and promise `54aa90b3`
own this branch. Parallel order `0d6d0fba` permits its start. The branch includes
the reviewed M4 and S2 landings.

## One generation owns loading and transport resources

`HttpGeneration` in `packages/mcp/src/http.ts` owns the opening promise, HTTP
resource, opening/open/closing/closed state, and terminal disposal choice.
`McpHttp` keeps protocol parsing and SSE encoding. OAuth and hosted factories
receive the generation before they load a service and attach their HTTP resource
to that same owner. A factory cannot return another generation's resource.

The owner also holds sessions, stream slots, pending legacy replacements,
modern listens, committed rows, write tails, and timer cancellation handles.
A retired owner refuses queued updates and late stream attachment. Graceful
removal follows an admitted write. Overlapping legacy replacements keep one
slot until neither a stream nor an opening remains.

The three named transitions preserve different durable outcomes:

- `graceful()` ends streams with their final results and queues row removal.
- `detach()` sends final stream events and retains rows for a new credential.
- `abrupt()` ends streams without final events and retains rows after eviction.

An automatic late-result rejection preserves the transition that retired its
owner. A later explicit graceful retirement can still remove retained rows.
The owner cancels both HTTP lifetime and OAuth standing timers by exact handle
identity, so an old callback cannot cancel or close a replacement.

OAuth still chooses standing policy. HostedAgent still owns `httpEpoch` and
`oauthEpoch`: these fence agent and credential authority before row restoration,
service installation, and dispatch. A transport generation cannot replace those
authority decisions. Hosted control transactions delete durable session rows
before advancing epochs and retiring the old owner.

## The characterization baseline exposes late abrupt row deletion

The first actual run of `packages/mcp/test/oauth-http.scope.test.ts` uses
baseline `80a91d4e8926fb4a3702a607baa54ec0180f81f7`, which includes the
reviewed M4 landing. The existing deadline and cancellation case passes.
The added held-opening case fails by assertion: the expected restored
`TEST-late-abrupt` row is absent. Production source and the test stay unchanged
during that run.

The test holds a factory that already has a restored HTTP session. It abruptly
disposes the OAuth layers, then releases the factory. The late opening must
return null, and its restored row must remain. The test joins only close
operations that production starts. It calls no graceful close as cleanup before
checking the row. The shared-owner fixture preserves that order and every
behavioral assertion.

The component uses production OAuthAccess over DO SQLite and production
OAuthHttpLayers, McpHttp, and Wire. Its standing service, scope service, and
session persistence are explicit stand-ins. The result establishes this
component order. It establishes no HostedAgent ingress reachability or live
loss. The earlier component probe remains separate in act `a8301c66` and has
not run again.

The [baseline manifest](evidence/2026-11-07-s1-characterization-baseline.manifest.json),
SHA-256 `81483e20dbd812499e722d5536630bafc1a3968a426658f1715d2e9779778cc6`,
seals 20 read-only files with the exact input hashes, compiler output, owner
report, assertion failure, and unchanged-source receipt.

## A held loader cannot adopt the replacement bearer's sessions

No existing MCP case held `applicationContent` across bearer rotation. The added
case in `oauth-hosted.scope.test.ts` holds an installed-application loader
stand-in after eviction. It rotates the bearer through the signed production
control, initializes a replacement transport, and releases the old loader.
The old request must return 401. The replacement's SQL row, HTTP resource,
service identity, and resumable stream must survive.

This case passes on main `3cb223b8` and on the draft. Removing the complete
pre-restoration fence makes its literal row assertion fail: the replacement's
row disappears. The fence includes both the generation state and the existing
authority epoch. Removing only one redundant predicate would not test the
required refusal.

Controls, HTTP, and DO SQLite are production code. The loader, identity rows,
authority answers, and clock are explicit stand-ins. This case proves neither
installed-package validation nor live hosted behavior. The first attempt stopped
before test collection because the sandbox denied localhost binding. The next
run used localhost access and passed.

The second control changes automatic late abrupt rejection to graceful cleanup.
The retained-row characterization then fails by assertion. Both controls restore
the exact draft bytes before the next run.

## Existing witnesses retain their guarantees

| Guarantee | Owning witness |
|---|---|
| Overlapping GET replacement keeps one slot and refuses a fifth stream | `http.test.ts`: the held-opening and R1/R2/R3 replacement cases |
| Exact idle expiry, durable activity, and removal after admitted writes | `http-idle.test.ts`: activity renewal and restored idle deadlines |
| Hard expiry, canceled callbacks, deferred initialization, and admitted custody settlement | `http-idle.test.ts`: hosted lifetime and hosted expiry |
| A held standing read cannot extend its previous deadline | `oauth-http.scope.test.ts`: grant stream cancellation |
| A retired controller cannot revive a grant | `oauth-access.scope.test.ts`: removed controller |
| Late listing cannot recreate a deleted row across reset | `hosted.scope.test.ts`: listing pending while its session is deleted |
| Bearer rotation, refresh retention, and scoped revocation | `hosted.scope.test.ts`: H2/H3/H4; `oauth-hosted.scope.test.ts`: refresh and revocation |

The existing assertions and deadlines stay in place. The generation constructor
and the cleanup spy in the OAuth transport fixture now target the shared owner.
Production source, scope-test, Node-test, and browser compiler checks pass at
their recorded checkpoints. The final gate still remains.

The [focused manifest](evidence/2026-11-07-s1-focused.manifest.json), SHA-256
`ee9c53780b49b14f622d80cd9108111f9416f04f0ee43bf3a0f17a8ba88186f8`,
seals 111 read-only files. It includes both controls, the localhost refusal,
compiler checkpoints, the previous-source epoch characterization, the final
draft, and the 17-entry witness map.

## Source seals need the exact standing approval

The draft changes the three sealed owners `http.ts`, `oauth-http.ts`, and
`hosted.ts`. Their parser seals differ from whole-file SHA-256 hashes.
The proposed patch changes exactly their three literals in
`scripts/security-entry-points.test.mjs`. It keeps every route and gate
assertion. Ruling `1311f76e` requires Hugh's approval in this session before
refreshing a sealed owner's baseline. No seal has changed at this checkpoint.

The unapplied patch is `/private/tmp/artroom-s1-transport-source-seals-20261107.patch`,
SHA-256 `787934346a8752c8bbbd472391ee700221904eccb3b2e1e9bd03c7023ec5208d`.
Accepting it records the changed source as the reviewed structural baseline.
The subsequent full gate and independent source review remain required.
