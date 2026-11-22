# E3 client view rehearsal

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

E3 is ordered behind SG-1, and this rehearsal has not passed a full gate.
