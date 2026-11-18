# CS1: Counter's installed screen host

Counter's installed signed 0.4.0 host keeps its eleven-case Node and ten-case
sandbox passes. Both gates remain failed. At da8a7337, the AE1 development
passes two compilers, corpus 1541 and Native 212 in 39 files, with two undiagnosed
cross-DO log errors. Whole Node again fails 205 pass/1 fail; preflight3/gate3, review,
deployment and hosted acceptance remain UNRUN/owed.
Source basis is main
`6728059211cee75dc0f6fdd104ef52a44c5f7da0`; the Node checkpoint is `7808c064`,
and the sandbox checkpoint is `027b16439aefcec90024d7209fb1cb70f0550b16`,
tree `f77baa86eada63118eb4e6aafa08aaccc28428db`. Later AE1 repairs preserve the
CS1 config and sandbox test file.

Request `5759be859222d5b4caac870ebcb8cc845e2e9bb1` and promise `37a3f98ea8703306e51b974fd7454a9350ba6001` govern this separate delivery. Root selected an AE1 rider before that head's gate. The request records that Counter 0.4.0 is active as install item 2 in `counter-witness` on dap-lending. That planner record supplies the installation facts; this checkpoint performs no hosted lookup.

The exact six-field host names `https://counter.inguz.space`, room origin `https://dap-lending.inguz.workers.dev`, directory `sc_rgtlrioy5eckfikcapmqdteiw7y4b4lrc7k6use4rqdktn4lnabq`, item 2 and presentation `sha256:52378055c218a42c6808af21fea097b69e42b9cc52877f3cec12ad432df8ff9e`. `apps/room/wrangler.lending.jsonc` appends that object to `APPLICATION_SCREEN_HOSTS`. The actual rollout file, `apps/sandbox/wrangler.rollout.jsonc`, appends `{host: <the same object>, service: "LENDING"}` to `SCREEN_HOSTS`. Its existing `LENDING` binding already targets dap-lending's `ApplicationScreenService`.

Both existing Lending host objects remain byte-equal. The existing Grow sandbox row also remains byte-equal. The conservative `apps/sandbox/wrangler.jsonc` stays closed with an empty mapping. No Worker code, binding, route, trust row, signed packet, version, current identifier, native request payload, capability, record model or authority rule changes.

The existing deployment-smoke owner now pins the third origin and checks the exact Counter descriptor and `LENDING` service inside its existing correspondence case. Its original bidirectional equality still checks every room and sandbox row. No test file, case or deadline was added. The existing sandbox Native owner remains unchanged; its package cases use labelled installation/binding stand-ins and its separate RPC case exercises real Native session/stream behavior. Neither owner establishes the real deployed screen address.

## Evidence

`G` is `artroom-evidence/2026-11-16-ae1-cs1-development-attempt1`. These are development results, not gate or hosted results. `H` is `artroom-evidence/2026-11-16-ae1-cs1-development-attempt2`; it holds the actual safe sandbox result while raw stays private. `G1` is `artroom-evidence/2026-11-16-ae1-cs1-gate-attempt1`.
`G2` is `artroom-evidence/2026-11-16-ae1-cs1-gate-attempt2`, at `1c01a94f0b80d87c4d45f1db4cc8322f2f4536f8`, tree `bfeb3ee0544507be4491d3a660303b936dd74390`.

| Boundary | Maintained command or owner | Actual result |
|---|---|---|
| Deployment configuration pins | `/opt/homebrew/bin/node --test scripts/deploy-smoke.test.mjs`, whole existing Node owner | PASS, exit 0, 11/11; zero failed/cancelled/skipped/todo; 0.168906375 s at `7808c064`. `G/cs1-node/result.json` SHA-256 `98a1862c7e923a4a9feae87f66cd46e39a5437f0d6c16d977fd5a113d7a3c859`; stdout `7be0e48fe72bcef09ddde1a049ae3f3049ef8aaa2377067d09e390db9cbde6ec`; stderr empty. |
| Sandbox routing and named RPC | Carried successful compatibility prerequisite, then `/opt/homebrew/bin/node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts --project scope packages/scope/test/application-sandbox.test.ts --reporter=default --reporter=json`, actual output path in result | PASS, exit 0, whole owner 10/10; zero failed/pending/todo. Child 8.691526667 s, outer 9.395261625 s at 027b. `H/sandbox-result.json`, SHA `88d387cecfb8a9967b35e6decbf3d36c172578b99ea0a3a53aa4838640d8a63b`; stdout `2a74b845360ff294a7a75d37c22da132ce442f6f16ea918d4db6062f9718371e`; stderr EMPTY. |
| Integrated AE1 rider | Gate1 at 1f0498aa/tree50da6240 after all0 preflight; `npm run gate` | FAILED exit1; child64.276236917s/outer64.418330042s, KernelPASS, Node203PASS/3FAIL of206; later pools UNREACHED. `G1/gate.result.json` SHA `d1ec1116e8c49c1dbc58da7555527de4bffa29c52082beebe1aa7f3800e66bd0`. c8 repairs only MJS/docs. Whole Node/preflight2 later pass; Gate2 also fails. No review/hosted result. |
| Whole maintained Node at `1c01a94f` | Exact `fixedStages` Node descriptor alone; actual argv in `G2/whole-node.result.json` | Exit 0; 206/206, zero failed/cancelled/skipped/todo; child 131.715873458 s, outer 131.811788792 s. Public result SHA `d6284ab06873ffaba2ddb56e326e0706ded6cf8a3929a3f24dd146f23da47340`; stderr empty, streams private. |
| Preflight2 at `1c01a94f` | Fetch origin/main; shared helpers; whole `npm run typecheck`; `npm run pins`; exact argv in `G2/preflight.result.json` | All four exit 0; helpers 0.634325500 s, TC 16.540657625 s, pins command 17.109324542 s; total 35.229670291 s. Result SHA `38cddba05839748f8cc463cf8a312ca0707208e89024966e6bf9e6ec2bf13e1e`; all groups reaped/empty. |
| Gate2 at `1c01a94f` | `npm run gate`; START `9ab6812709a5ad852417b34428a7c1a93730ef59`; END `8614277786e258be2a8396695b527527aea9d6a1` | FAIL, exit 1; child 1806.755506542 s/outer 1806.906823458 s. Kernel pass; Node 206, Counting 56, Plain 4913 pass/1 skip, Native 1171 pass/1 fail/2 skip. All 22 Scale cases/13 owners pass. Sole stale 64-node inventory failure; no CS1 failure. `G2/gate.result.json` SHA `2de5dee8a4f5f44444271ae9c8d53833d72978c9ee869ff92af55d8de57d786a`; log `67baf048adc57046bf64665c5f26a62be19592b51c5908c45e54da42ef845c34`. Reaped/group empty. |
| AE1 attempt3 development | Exact five commands/39-file Native union in PRIVATE `artroom-private-evidence/2026-11-16-ae1-attempt3-development-attempt1/result.json` | Both compilers, compat, corpus 1541 and Native 212/39 files pass at `da8a7337ac1e87a6d5432b6e73809df899da86d3`/tree `28c60e7095fe3715e6f45909891a80bd6cfa69f6`; Native child 466.359220208 s, outer 471.751190958 s. SHA `ef3701ea4f981643c98f97ffc0b547287d49cb33ae98ef4bd7d3a0ef2c974796`; END `e85be982d960806ba9873db3b58519f77bc561e0`. Two uncaught cross-DO log errors remain undiagnosed. No hosted result. |
| Whole Node again | Maintained Node alone at da8a; PRIVATE `artroom-private-evidence/2026-11-16-ae1-node-stage-attempt2/result.json` | FAIL exit 1, 205 pass/1 fail/206; child 133.845142459 s/outer 133.916273459 s. Derive's Git import violates active-source.test.mjs:114. SHA `fa42d6e95a2735ee8a0fb9f71f7efceccf9fe2a7e3fcf97057804ca66caeccf3`; END `a8d20fcc91d8e7a57ee5d032642581f2faa74c6d`. Reaped/empty/source clean; no preflight3/gate3. |
| Hosted screen | Planner deploys dap-lending first, sandbox second, then reads `https://counter.inguz.space/` | UNRUN. No browser, network, deployment or NF7 acceptance claim. |

Earlier AE1 END `2ae3212a80b1ca7680e2f38e583915d885ea4317` preserves its
97-pass/4-fail Native result and dependent followers; root stopped before
sandbox then. Repaired 027b later passes 102/102 Native cases and the coupled
Scale pair. The separate sandbox 10/10 result does not erase that history.
Its package cases use labelled installation/binding stand-ins; named RPC covers
real Native session/stream plus cancellation and release, not the deployed
Counter address. Source/dependencies remain unchanged and owned groups end
without cleanup actions. Later preflight1 passes but Gate1 fails in Node. The c8 scanner/docs repair
precedes the passing whole Node and preflight2 checks;
Gate2 stays failed; later development does not earn review, deployment or a hosted Counter claim
follows from these local checks.

The configured rows refer to the installed signed 0.4.0 presentation, not current authored open 0.5.0 identifiers. This CS1 rider preserves AE1 source and unrelated configuration. The planner owns the later deployment and address read after landing; NF7 keeps its own browser-witness scope.

The five-path AE1 fixture/doc repair at `d38275d047fdd8c44e5da5046ac301542ae2cc31`,
tree `5b42dab41b6bdc213a6f0e6c45da09e974e491da`, changes no CS1 runtime/config,
installed signed Counter 0.4.0 presentation, owner or authority. Planner a1c5
requires 39 whole Native files, whole Node again, exact-head old-cap audit and
fresh preflight3 before gate3. Native passed at da8a; Node then failed and
preflight3/gate3 remain UNRUN. Gate2's 38 raw files stay
private, bound by `G2/raw-gate-retention.json` SHA `e3f4988723e59a7f671187ad72646d83a62abd6a7edfc0247d025944d2731490`.

Ruling `c461110c34123bb5071324064a84f7ecf52c5799` leaves the ceiling in Git and
allowlist unchanged. Native uses it; Derive's proposed corpus successor uses
its independent TEST bound 53/property, no Git import. The four-path repair is committed at 35de; new validation is UNRUN.
The da8a pass remains historical. No new CS1/hosted result follows.

Current code is `35de4110c8a694bf18f6327c70e17497a42bee05`, tree
`d1fc38df0bc26402b054b48247e0a0d86693cc13`; it changes no CS1 host or authority.
