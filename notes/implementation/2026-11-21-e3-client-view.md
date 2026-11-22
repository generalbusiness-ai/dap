# E3 checked client views

The E3 client rehearsal at `44c531ba33bcc98fd9a2c3bc3e693f5428abf837` builds on checked E5 `b77be3f95b91714ed8dab8c5056dd033f08fe8ab`. The case-7 witness is checkpoint `653a3841883f8ca79a64df4023eec0d1e8070754`; the checked-session and immutable-cut helpers are checkpoint `b85754c73e55888f68dc693626bc520886b23b51`.

A view's `explore` and `offers` use one immutable checked cut and clock. The optional `viewAuthority` adapter supplies a checked session and acquisition start; its notification invalidates a pending publication. Optional `ticks` request a new publication. The client checks exact session provenance and fails closed when authority or the clock is unavailable.

`projectedRow` and `projectedRows` present the checked `ActRow` values and symbolic source references. A modern pending row without a proven projection has `unavailable: "source"` and no `ref`. A legacy pending row has `unavailable: "legacy-custody"`, `ref: null`, and `recorded: null`. Custody v1 upgrades and v2 signings created outside the authorization instance can lack provenance. The existing C4 `row` and `rows` surface keeps numeric rows. E5's unsigned authorization request arm stays in `requests`.

## Focused evidence

The exact case-7 selector passed one test, and client test typecheck passed. The two immutable-cut and view-judge owners passed two tests, and client production and test typechecks passed. The five public-view owners passed eight tests. Their initial production and test typechecks failed on TS7022 and TS2352 in `scope-client.ts`; a type-only annotation and predicate repaired those errors, and both typechecks then passed. The five owners ran before that type-only repair.

The evidence directories under `~/play/artroom-evidence/` are
`2026-11-22-e3-case7-after-e5/`, `2026-11-22-e3-helpers-after-e5/`, and
`2026-11-22-e3-public-rehearsal/`.

| Evidence | File | SHA-256 |
|---|---|---|
| Case 7 | `test.log` | `1e317f46ac70ee5d9d9207adffa38198fa5203c524022491fe62df833ddde06d` |
| Case 7 | `tsc.log` | `8b60c58550ab926058ddb14a57b9bb9a5653b5a59f502854d4012a0170044c0e` |
| Helpers | `vitest.log` | `742712175feb9df5aefa4380b4dde751a08b2379c03bab235e2a0ed183b5d8b3` |
| Helpers | `tsc-0.log` | `3aca49600b8b81f923fd7718ccdef5ea4df9663101807900a1f3bf3977cea2c4` |
| Helpers | `tsc-1.log` | `6c5b568d9096388566fb6a148d03b3ba32280cb87edd66c8ca28a366f7048c2d` |
| Public, first | `first/vitest.log` | `5fcd9597559fa4076be7c4df00f1e5fa9a7313eb0a1887835ab62e73c78980dd` |
| Public, first | `first/tsc-0.log` | `cf7fb71487b5a38d5f3c35ddb04e0f87d29862fa62457d93e7bcfb6168b84c3a` |
| Public, first | `first/tsc-1.log` | `4de71babf192b23d5fb64978ea088563f86d70bee7e55002a09009ed5291da8f` |
| Public, repaired | `types/production.log` | `239a364dd0ef28e5f4b75560999902af155146bd4b699a9a33465184c826f09b` |
| Public, repaired | `types/test.log` | `7689fd11541653d209201c0a5a6db569f6f8e04271d66a95826d26f5dfa92208` |

The native symbolic fixture installs a fixed self-referencing declaration and obtains sessions from the real E2 issuer. Its public `projectedRows` witness checks the symbolic self-reference and numeric C4 value at the same cut. A second session has no standing. With that session, exploration returns `authority-unavailable` before the pending send and `source` when it cannot project that pending send. The lower-level `ActView` control also passes.

The first symbolic run failed its no-standing assertion after the pending send; `first/vitest.log` has SHA-256 `d4d236cb2c6c600cf3e79832ea58eaf613c43e0b82e65961a49433b3d127b0c0`. The paired follow-up passed both tests; `followup/vitest.log` has SHA-256 `6e7df430fa9a40ecfd929b0f14b6ab6f5f36692df7d02893471ec0181411e52e`, and its passing test typecheck log has SHA-256 `88beb138434316abae65a266427fc58c633f4d69fa4de051c89a06960a249490`. These logs are under `~/play/artroom-evidence/2026-11-22-e3-symbolic-focused/`.

At base `0efdc2069a497ebfccfe88557aecf5637b8a15a5`, the generated invariant 12 owner passed 12 deterministic cases using an E2-issued session. Each case compares a held view with an independent E1 judgment at the same captured cut. Four cases advance the head, four advance the clock with a tick, and four invalidate and restore authority. From `packages/client`, `../../node_modules/.bin/vitest run --config vitest.config.ts test/e3-generated-cuts.test.ts --maxWorkers=1` passed; from the worktree root, `./node_modules/.bin/tsc --noEmit -p packages/client/tsconfig.test.json` passed. The test file SHA-256 is `1e315261e8f10d94d4e8c22ec1489bbeba9e8db8ca0184e2785cfd9194aa87d8`. In `~/play/artroom-evidence/2026-11-22-e3-generated-cuts-focused/`, `vitest-first.log` has SHA-256 `36234f80605b809c3e925b4cd3784c1ff50a3ef6b637a72d0428f0be66d3d877`, and `tsc.log` has SHA-256 `001880ae4a6eae263f6b1aeb921f7a4d9ef52efa56cb3a554693a88486ddcff`.

## Gate failure and isolated follow-up

The full gate failed on `65e9d5ea0e08657ce121605ef54007ca5c608e5c`, tree `b0d2ac38fbc4b42f495494a9b9c1bf4dfcf1696b`. The follow-up uses `96401fe9530ae77f6dbb277c3721a09ef1325bfe`, tree `6a6743012992f42728e9eb9142c8fe5cca3efb91`. The only source diff between these heads is the Counter test's bounded listener observation. This final note changes no executable source or tests from `96401fe9`. Paths in the table are under `~/play/artroom-evidence/2026-11-22-96401fe-e3-review/`.

| Period | Command and result | Evidence |
|---|---|---|
| First gate, `65e9d5ea` | `npm run gate` exited 1 in 226.37 seconds. Static checks, types, definition pins, pins and Kernel passed. Node passed 245 of 246 cases. Counting, Plain and Native were unreached. | `failed-gate/gate.txt`, SHA-256 `edbabfa577c9ac1f697cd1755732f13db7338d0e5bc986bb6f12e15f5774c1d0` |
| Isolated Counter repair, `96401fe9` | Twenty separate focused runs each passed four cases. The maximum owned-listener refusal was 0.8 ms. A separate whole-owner run passed four cases in 3.67 seconds. | `counter-stability/run-01.log` through `run-20.log`; `counter-stability/run-digests.txt`, SHA-256 `fe0863b9c36c6d3c01ce3ca4b4e2ba7bd30607fea79fa0f402bbee6c6bae1cfd`; `counter-stability/owner.log`, SHA-256 `1ad0afd8bcc3460a70fc289a317b27ddf078ee1bfed5f8f9dffdb80d7c2b6c3c` |
| Continuation, `96401fe9` | Counting exit 0: 60 passed in 0.512 s. Plain exit 0: 5,140 passed and one skipped in 539.287 s. Native exit 0: 1,240 passed and two skipped in 618.596 s. Total wall time was 1,158.61 s. Scale was omitted. Native crossings were zero lost, five stale and zero without an owner. | `continuation/counting.log` SHA-256 `5061d3ce5b0c5a0d7f365dde024585c1341429c0c907fef8a8f683db198691a4`; `continuation/plain.log` SHA-256 `0e83dab2360918cf5dcd9fb2c8a2cf161e1dc1f3cbe031df3c03f145018298a3`; `continuation/native.log` SHA-256 `19c49a25b27b663c8aff2a58ce47a836c99cebeba8a92d7bd8a7fad2d206b432` |

The baseline `npm run pins` at published `c9038871` passed in 21.87 seconds wall time. The post-adoption pins at `65e9d5ea` passed in 20.63 seconds wall time, both measured by `/usr/bin/time`. Their retained logs are `baseline-pins/pins.log`, SHA-256 `b636cc22c6032eb999c16c9bb74aec8a7f13b66e148f4de7ca6e5710bd56cf3a`, and `adoption-pins/pins.log`, SHA-256 `93ca448a3acd72940eb4bf8db5787ae799c421f7f7437594f69925fb7ddacbe6`.

The generated Page asset file changed from SHA-256 `7bb232ebeef71fdcb205e3430c96389c934ce3dd6fc0cd7731ff8e1c5879568b` to `d8371485e3ab8c3b19e7c2da516ea4e4255e73be307aa61b77390280e1cc8594`. Its Page JavaScript changed from `d8406c0d56c26c9bde2070a08cab3ab3e6d3aad69c0255eb1a3f82cd664aa28c` to `2f2eede23fba043d1f09397a9f3f63c0b13f6af8e42fc40168a23900f7adbb46`. The OAuth JavaScript changed from `e89becafa25623f0b2db17a66941e7e318e34b938c2372646c64d3e0939f902b` to `4deb56ef8f85b21faa3393e51013f8715caab83ca0e437b54653205514e838a4`. The Page HTML stayed at `62339a1ea0bcea8af96184debab781bb20f679b51116a88551c94701a7a9a754`, and OAuth HTML stayed at `87e3ea59858b3221b250910eaa6d5c2189e6185ace47a930f1c06479f73feb0a`.

The approved open Lending presentation changed from `sha256:c3ba4ba634c21a9918e118009624164c481731a35d0f0e38f08d7b5c4f7bf03e` to `sha256:c0d9b2fb6d2367800aa14cede3d1d6954059074b5cf81017677730f0f2e5fb72`. The open Counter presentation changed from `sha256:8c4a18a5e41ae42aa0444d21b8589b2ac69a52e2c56f36c60dc40ae29a7ce12f` to `sha256:6abe81e23c3822d188442034e643ff8ca14441efeb8e59fdda0abec8d68dab0c`. Signed releases remain unchanged. The security inventory covers both the existing session request owner and the new checked session provenance owner.

The published-SG replay at `e9613cb3c48e2dddd36298b3394dc002bf18c3d5` passed 51 client tests across ten owners and both client production and test TypeScript contexts. Its logs in `replay-focus/` have SHA-256 `bc3a2a9f3def7d8b5807a3891fc5d448af3c9619921381920e769a9ed5baeedd` for `client-vitest.log`, `83d93eddf926e4377f990d3b45b94b56504a70656cd417ed71b025b0d0aa0e85` for `tsc-production.log`, and `db39d87df730511342c2d4502b5ccc6fd3e758fa97119970ae17b4b9412f657a` for `tsc-test.log`. The earlier focused entries above are historical source checkpoints.

The continuation record `continuation/continuation.json` has SHA-256 `a31a8cc84bf4ef21935ec50734562839f653c2745b574733eb0cb28d71cae9ac`; `continuation/driver.log` has SHA-256 `02744f089eef01a1b0f8f0fcab5482753f1d1ec1b9a34eb44d9184f147547eff`. The record contains exact stage commands, exit codes and measured durations. `continuation/counting-sources.json` has SHA-256 `77ce9629cc9c4b8f59a88a23c76bf22b5c0da9d62701872043d681007bbe4819`, and `continuation/scale-selection.json` has SHA-256 `6b72ca0d22fad069f78c6ddf64c73d856130907190c43f8b261dc7ef2757d932`. The Counting, Plain and Native event files respectively hash to `ffe0052de1e636395db5edfbf97bbe46585677f5a98a9ab08a82df76c4f9aac8`, `3d61d8d30ee0bbc517a96f05fdd205a3024dbcb95d2b8058cab031487475eded`, and `63bae8781345a5565be1d7595d351e0de55ccfdd5a6e8636143e31dfcf8c5cb6`.

The evidence and decisions are recorded by `e8da2959`, `a6c66ba1`, `430dc931`, `7f9211c4`, `ab860675`, and continuation report `cd989ad3`.
