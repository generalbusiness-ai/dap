# Hosted MCP transport ownership

Status: the shared generation owner is drafted. The HTTP and idle owners pass
14 cases. The two-case OAuth transport owner passes, and the added held-loader
case passes on both the previous source and the draft. Both deliberate controls
fail at the intended assertions. The complete hosted and OAuth selection passes 50 cases in nine files. Together
with the HTTP and idle owners, 64 distinct focused cases pass. The exact source-seal patch is applied. The single full gate passes. Independent review and landing remain pending. The planner owns deployment.

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
their recorded checkpoints. The final gate below validates the integrated candidate.

The [focused manifest](evidence/2026-11-07-s1-focused.manifest.json), SHA-256
`ee9c53780b49b14f622d80cd9108111f9416f04f0ee43bf3a0f17a8ba88186f8`,
seals 111 read-only files. It includes both controls, the localhost refusal,
compiler checkpoints, the previous-source epoch characterization, the final
draft, and the 17-entry witness map.

## The exact source seals follow the standing instruction

Planner act `c858a1d1` and its live refile `3655896d` retire the earlier prompt requirement and assign seal review to the checker. Hugh also directly approved S1's exact patch in this builder session and instructed future patch work to continue without permission prompts. Questions go to the planner.

Commit `42fabdd3` changes only the three parser-seal literals in `scripts/security-entry-points.test.mjs`. Every route and gate assertion remains. Patch SHA-256 is `787934346a8752c8bbbd472391ee700221904eccb3b2e1e9bd03c7023ec5208d`.

| Source owner | Old literal | New literal |
|---|---|---|
| `packages/mcp/src/http.ts` | `5c6fa6500e539648bb5f9d4a97307ebe07609b76a60883511557dd6d79f30adb` | `c1280b58349e7137359b710f7021ce85882e0e9b6a16163f9f043f96bbe5554d` |
| `packages/mcp/src/oauth-http.ts` | `f04810c38e299cdf9e25d7e2022f095023b5bae6dfe9797ff6970e4871998836` | `1c87328b4e9c5d66e07ae8017b22482816bf26c1d71e047fdf8e67b03b87924a` |
| `packages/mcp/src/hosted.ts` | `a3db0a94298fdc34f622511152dd86748308fcbe4b344ac10db4bfa555f9229c` | `2d337cd0bf5263432433cd3f2a41d2e9c43105fd81c34ccaf473b1b7323d1082` |

The [seal manifest](evidence/2026-11-07-s1-approved-source-seals.manifest.json), SHA-256 `b5dcf9f9c3b27ce659f04f101fba420a7a33a330436e325893346c9296360ba1`, binds the exact patch, source, approval and integration checkpoint. It records no test pass.

The branch now includes published main `903ed961`, which contains M6 `5a0e5660` and the three-path Register 26 record. That integration leaves all three S1 source owners byte-for-byte equal to the focused checkpoint. The single full gate validates that integrated candidate. Live planner act `3655896d` assigns S1 the first gate slot and M7 the next slot. Independent review and audited landing remain required. The planner deploys.

## One full gate validates the integrated source

The gate at `446e50d4b9fdebafeee019d829ea427981acac66`, tree `c179e22f37a978f753ab9eb36664e3bb5e32033e`, exits 0. The driver read `gate.exit`, compared every tracked input before and after, and found no source change or remaining owned process. The gate captured main base `903ed961`; its message check excludes M6's historical merge exception and passes every S1 message.

All pre-test stages and typechecking pass. Reports record 5,320 passed cases: 135 Node, 56 counting, 4,016 plain and 1,113 native cases. Three cases skip: one plain and two native. All four phase reports are terminal and complete, with no failed cases, report issues, contradictions or unhandled errors. The 99 additional observations are the enqueue, dequeue and completion wrappers of 33 successful Node files. Only a skipped module lacks its final duration.

The [gate manifest](evidence/2026-11-07-s1-gate-validation.manifest.json), SHA-256 `3b908ced33cb75c07c5453b81ac1342b0bbf2fb6cf70ba2785241070ea09bd4b`, binds 18 read-only public files and the hash inventory of 2,315 private retained files. The private originals keep TEST request bodies and custody out of the public packet. No gate, phase or owner ran again during analysis or sealing.

| Check | Command | Exit | Retained output SHA-256 |
|---|---|---:|---|
| Full integrated gate | `npm run gate` | 0 | `28d3b9e880a77975493dc7e359144c0295a4f694cfe0af4f928c22307bc5c320` |
| Structured phase and case analysis | `node analysis-driver.mjs <test-evidence> <private-analysis> 0` | 0 | `ae580381eb518836db467a51bc66051b26f1fcad9e41b6930ac5da820023f36d` |
| Unchanged inputs and closed processes | Compare the driver's before/after snapshots and terminal process group | 0 | `689ed9dca78bfae74bc8b1539ab9d181bad913ad84df86034bfef9cbc37e185a` |

The following main advance adds only the sprint report. The final review head also adds this note update and the gate manifest. The final input comparison records their exact trees; runtime source, tests, dependencies, configuration and test scripts must match the gated head. Independent review and audited landing remain required. This head proves no live-room outcome or deployment. The planner deploys.
