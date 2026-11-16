# CS1: Counter's installed screen host

This source-only checkpoint adds the requested screen descriptor for installed Counter 0.4.0 to dap-lending and its matching sandbox mapping. Validation, gate, review and deployment remain UNRUN. The source basis is main `6728059211cee75dc0f6fdd104ef52a44c5f7da0`; the final AE1 rider head and tree remain unbound.

Request `5759be859222d5b4caac870ebcb8cc845e2e9bb1` and promise `37a3f98ea8703306e51b974fd7454a9350ba6001` govern this separate delivery. Root selected an AE1 rider before that head's gate. The request records that Counter 0.4.0 is active as install item 2 in `counter-witness` on dap-lending. That planner record supplies the installation facts; this checkpoint performs no hosted lookup.

The exact six-field host names `https://counter.inguz.space`, room origin `https://dap-lending.inguz.workers.dev`, directory `sc_rgtlrioy5eckfikcapmqdteiw7y4b4lrc7k6use4rqdktn4lnabq`, item 2 and presentation `sha256:52378055c218a42c6808af21fea097b69e42b9cc52877f3cec12ad432df8ff9e`. `apps/room/wrangler.lending.jsonc` appends that object to `APPLICATION_SCREEN_HOSTS`. The actual rollout file, `apps/sandbox/wrangler.rollout.jsonc`, appends `{host: <the same object>, service: "LENDING"}` to `SCREEN_HOSTS`. Its existing `LENDING` binding already targets dap-lending's `ApplicationScreenService`.

Both existing Lending host objects remain byte-equal. The existing Grow sandbox row also remains byte-equal. The conservative `apps/sandbox/wrangler.jsonc` stays closed with an empty mapping. No Worker code, binding, route, trust row, signed packet, version, current identifier, native request payload, capability, record model or authority rule changes.

The existing deployment-smoke owner now pins the third origin and checks the exact Counter descriptor and `LENDING` service inside its existing correspondence case. Its original bidirectional equality still checks every room and sandbox row. No test file, case or deadline was added. The existing sandbox Native owner remains unchanged; its package cases use labelled installation/binding stand-ins and its separate RPC case exercises real Native session/stream behavior. Neither owner establishes the real deployed screen address.

## Evidence

No run output exists at this checkpoint. This single table records the actual UNRUN obligations; later evidence must name its real source head, commands, outputs, exits, walls and SHA values.

| Boundary | Maintained command or owner | Actual result |
|---|---|---|
| Deployment configuration pins | `node --test scripts/deploy-smoke.test.mjs`, whole existing Node owner | UNRUN. No output or hash. |
| Sandbox routing and named RPC | `node scripts/cloudflare-pool-compat.mjs`, then root `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/application-sandbox.test.ts`, whole existing owner | UNRUN. No output or hash. |
| Integrated AE1 rider | Normal exact-head shared-helper check, whole typecheck, pins and one `npm run gate` | UNRUN. No gate/review result. |
| Hosted screen | Planner deploys dap-lending first, sandbox second, then reads `https://counter.inguz.space/` | UNRUN. No browser, network, deployment or NF7 acceptance claim. |

The proposed rows refer to the installed signed 0.4.0 presentation, not current authored open 0.5.0 identifiers. Root must preserve all AE1 source and unrelated current configuration during application. The planner owns the later deployment and address read after landing; NF7 keeps its own browser-witness scope.
