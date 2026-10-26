# Certified rules policy

Request `0716e75a`, promise `7e959e25`.

Governing request: git:sha1:589bca982736a2361d15d53f7572375ef2f7aaf3#git:sha1:0716e75a7daaf4ea46c71e95ee9a7406d460ff57.

## What changed

The explicit `archive-certified-rules` family is Register 19, Directory 18,
Membership 8, Rules 11, Destination 14 and Inbox 1. Register 18 remains the
default. The public offer and recorded Grow family remain at Register 17.
The planner owns any later creation allowance or deployment.

Rules 11 accepts a complete policy with explicit owner-review and
zero-approval choices. It binds that policy to a bounded repository-tree
proof and a selected native Destination certificate. Destination 14 uses
the authenticated policy for publication and enforces both global required
checks and checks required by touched extents.

The new native journeys now pass through actual family creation,
certificate publication, policy refusal, current required jobs, staged
publication, cleanup, archive Marks, a local Git clone and offline replay.
The checks use real native acts, signatures, capabilities and retained
facts. Their provider, Git-object and host fixtures are TEST stand-ins.
They establish local protocol behavior, not hosted rollout or live-provider
acceptance.

Page validates a coherent Rules 11 signed summary for presentation. The
view is read-only. Unsupported Rules 11 edits refuse before signing.
Native observation and certificate authority remain in the native path.

## Decisions and why

### Keep the complete policy and its authority together

The shared strict decoder returns an owned complete policy and one digest
in `artroom-rules-policy-1`. The digest covers every accepted field and
preserves optional `false` versus absence. A digest alone grants no
authority. Native callers validate the canonical envelope, full member
references and certificate provenance before using the policy.

`ownerMayReview` is mandatory. Zero approvals require explicit opt-in.
Extent approvers require `change.review`; protected rules additionally
require `rules.publish`, the protected minimum and the declared rules
patterns. Owner and controller independence remain part of judgment.
Future patterns require explicit occurrences drawn from the declared
patterns. They do not grant implicit permission to future files.

The tree proof binds the full proposal, Rules and Destination identities,
repository, ref and captured commit. Collection has separate wire and
canonical-byte bounds, checks complete SHA-1 tree coverage and leaves
parents and blobs unfetched. Destination records its actual operation
opening and selected outcome. Rules publication rechecks that provenance
and the full bounded proof. Before configuration, publication refuses
with `rules-not-configured`.

One named `artroom-rules-extents-2` observation envelope carries the complete
policy, proposal and certificate. Destination validates their correspondence
with the fresh authenticated observation. The first answer may establish
an unknown Rules incarnation through the existing `observedOf` contract.
An already pinned incarnation must still match exactly.

### Stage before jobs, then require current jobs before push

Initial list eligibility requires a configured policy. It does not demand
jobs for a tree that has not yet been staged. Destination captures the
complete policy and required descriptors, stages the tree, then requires
current accepted job generations before push. Global required checks join
the touched-extent union. Invalid global evidence takes precedence over
unmet policy, after the earlier head, path, integration and authority
refusals.

The G14 publication stores the captured policy and generations together in
one bounded, validated `passes` record. This preserves the global 12-value
slot limit and all historical publication fields. Updates retain both the
complete policy and generation provenance. The second-step key limit
remains eight.

### Preserve the declared native protocols

Rules 11 writes its publication self-reference through the declared ref
effect. The coded publication effect writes the other ten values. This
avoids treating a numeric local entry number as a retained fact reference.

Each signed certificate request adds and consumes its own operation slot,
as the existing read-token act does. The initial branch no longer supplies
a single lifetime certificate credit. No count is reset, refunded or raised.

The Q11-only `rules-update` callback validates the complete owned policy,
then sends the established five-field extent summary to lanes. Its
unconfigured path delegates to the historical callback. This keeps the
lane protocol compatible with Q11 future-pattern and zero-approval fields
without widening the historical extents grammar or changing the full
native observation envelope.

Outcome effect validation now retains the original native type callbacks.
Synthetic effect and send codes receive deterministic unused names when a
native registry already contains `effects` or `send.0`. Free names retain
their existing spelling. Invalid coded slot values still fail validation.
The permanent owning witness checks valid writes, invalid refusal, both
name collisions and unchanged state after pure judgment.

The exact new declaration pins are Q11
`sha256:e98867a65659630c9181a16c2a45441a128010f1ee8544264869bd9d39f9767f`
and G14
`sha256:fe3cd527ae7f38b2d1132a9ee170459c0f96b7bfb0c80c7caa0904de57b1433b`.
Their generation and adoption checkpoints remain distinct in the evidence.
Historical declarations, evaluators and selector results retain their
existing identities.

## Evidence

The [evidence manifest](evidence/2026-10-25-certified-rules-policy.manifest.json) indexes the retained files and execution checkpoints.

Three ordinary gates failed at distinct checkpoints, as recorded below.
Gate V3 reached the plain tests and found one obsolete unsupported-version
expectation. The repair at `ae49c5a6` changes only that expectation and its
comment in `packages/platform/test/rules-scope.test.ts`: Rules 12, rather
than the newly supported Rules 11, must remain unsupported. All nine cases,
assertions and deadlines remain. No other test imports that file.
Production source, dependencies, configuration and shared helpers are unchanged.

Native then found the same stale-negative pattern at
`packages/scope/test/archive-target.test.ts:52`, in two parameterized cases.
Register 19 is now supported. Commit `8b85ece5` changes only that negative
sentinel to Register 20. The positive actual-family check and every assertion,
case and deadline remain. No test imports the repaired file. That second
repair has not run. Planner question `53707834`, filed under the two-failure
guidance in `34c8885a`, owns the choice between a second bounded follow-up
and a new gate.

The initial limited follow-up followed docs/testing.md: the owning compiler, the
whole failed test file, and the native stage that V3 never reached. The
failed gate remains failed. The first follow-up attempt passed the compiler,
then stopped before test execution because I used an invalid reporter phase.
The corrected attempt uses the maintained `plain` and `native` phase names.
The [final evidence manifest](evidence/2026-10-26-certified-rules-followup.manifest.json)
records both attempts and V3 at their actual execution checkpoints. The
earlier manifest remains the historical index for accepted evidence.

The completed Page owning checkpoint remains `1f8ed9ef`. Each output
bundle index below names preserved logs, command arguments, outcomes and
case identities. Commands with a bound plan use the exact arguments in
that bundle's command ledger. The command descriptions are not replacement
shell scripts. The output column names each hash as a bundle index or an
individual log. Neither is a declaration value or a synthesized total of
earlier runs.

| Check | Actual command or bound command set | Original exit and outcome | Output digest | Execution checkpoint |
| --- | --- | --- | --- | --- |
| Q11 declaration generation | `node --import node_modules/tsx/dist/loader.mjs packages/platform/scripts/pin-native-declarations.mjs`, then the bound output observer | 0; producer and observer passed | `7971acb724d63ebebf1bedc12b8899ecb797e0325803cd73b453153b9031dc64` (`generation-v4/retention-manifest.json`) | `89eca884`, tree `773c7ce3`; later adoption `b67ba2b8` |
| Latest G14 declaration generation | `node --import node_modules/tsx/dist/loader.mjs packages/platform/scripts/pin-native-declarations.mjs`, then the bound output observer | 0; producer and comparison passed | `cb463dfcb2c1a65f8b33cbc5dd757c47f631303b2ffb94327543d8e021149922` (`generation-v5/retention-manifest.json`) | `eddc1771`; later adoption `d2e88bea` |
| Eleven native Source seals | Pinned Node and bound maintained structural-seal producer | 0; eleven actual values produced at that cut | `83b8db1519e311fd643f56d8a79d50518899a4636a57ea94bbb57bd7ddf90da8` (`source-seals-v3/retention-manifest.json`) | `0830ff8c` |
| Later DestinationHost seal | Pinned Node and bound `produce-host-seal.mjs` | 0; one actual host value produced | `fab9e8e529da67519d047ab2816d1672d485d1b5599323d9c9ea8acd41e5220a` (`source-host-seal-v1/retention-manifest.json`) | `3fa657ff`; later map adoption `f24de3bd` |
| Earlier combined owning run | 23 bound `tsc -p` commands, then root Vitest with the recorded whole-file selection | 1; compilers passed, 35 plain cases passed, first native case failed and 22 were pending | `57fe556d3d530365a8d90d1a7767a011899059b2305f046aeac1348469849eeb` (`combined-owning-v1/manifest.json`) | `635de029` |
| Current focused owning run V17 | Eight bound `tsc -p` commands, then root Vitest whole forms-marks and seven native files with `--bail=1` | 0; eight compilers and all 69 cases passed: forms-marks 46 and native 23 | `dc4fe3ba68ef2caa37e7b6ebd08908601e49ce935e46745d5a44a8a6be0a8476` (`native-fixture-v17/manifest.json`) | `c64dc766` |
| Global required-check control | Root Vitest whole `certified-rules.scope.test.ts`, using the V17 healthy baseline and one guarded fault | 1 retained; one pass and one intended assertion failure. Fault published and cleaned where policy required refusal. Distinctness established | `1ce26c0fded53a5731808037579091cfb4c83b638dd3606fe706bbbaa7b65cdf` (`global-required-control-v1/manifest.json`) | Fault `399beb3d`; positive bytes restored and isolated at `c64dc766` |
| Kernel native-type control | Package-local Vitest whole `test/forms-marks.test.ts`, `--config vitest.config.ts`, threads and default bail 0; baseline then one guarded fault | Baseline 0, 46 passed. Fault and owner 1 retained, 45 passed and one intended AssertionError at 388:8. Distinctness established | `372d2e516a9399c345d0bce2d95997b3e9b95f3a850ca82f4b2f6cac6433b809` (`kernel-control-v1/manifest.json`) | Positive `c64dc766`; exact Source and modes restored |
| Page build after the kernel repair | `npm run build --workspace @generalbusiness/dap-page` (maintained `node scripts/assets.mjs`), then the bound output comparison | 0; build, owner and capsule passed, outputs matched retained copies | `091d0e7a7bbb6b807991f1f4d691c3c9a6174ce04282a14c58cb7ea9b37f89d0` (`page-build-v5/manifest.json`) | Built `c64dc766`, tree `f9b6bf03`; assets adopted at `1f8ed9ef` |
| Page owning checks | `tsc -p apps/room/page/tsconfig.json`, then `tsconfig.test.json`; root Vitest whole `apps/room/page/test/assets.test.ts` with the recorded config and reporters | 0; both compilers and the one existing case passed | `f3f0d1967b1aad5873691ba18f90331280046d850b21c03a5160905938037ae4` (`page-owning-v1/manifest.json`) | `1f8ed9ef`, tree `a5ecf677` |
| Ordinary gate V1 | `npm run gate` | npm child 2, owner 1; whitespace failed. Compatibility, compilers and tests were unreached, with zero observed cases. Install skipped | `865b67da905aa86d34e4af136cdf047efeeabbc3b18b8e0b0f7d7dc41cd63cd0` (`gate-v1/manifest.json`) | `d0453d10`, tree `0c1305bf` |
| Ordinary gate V2 | `npm run gate` | npm child 1, owner 1; shared-helper check failed. Whitespace and both commit checks passed. Later checks, compilers and main tests were unreached; install skipped | `a9800b3e2a08e0e1c83676deadfe826bad2e07239b582deb9bd56f55998f8aa6` (`gate-v2/manifest.json`) | `52c2714c`, tree `03a8f8c2` |
| Shared-helper owning check | `node scripts/check-shared-helpers.mjs` | 0; 670 Source files and 134 shared exports checked | `a61f51ffa69345c1eb015c7a3873dab38cc89b54f75ec28550b416c0b434b881` (`helper-names-owning-v1/helpers.log`) | Six-identifier repair of `52c2714c`; no invented commit |
| Section-citation owning check | `node scripts/check-section-citations.mjs --report <recorded report path>` | 0; existing advisories retained | `44dcc5d03529e09f48ccb955750fed904f81a0b7eeb2b519aa6ac0e98f28af5e` (`helper-names-owning-v1/citations.log`) | Same repaired Source |
| Documentation-link owning check | `node scripts/check-doc-links.mjs` | 0; 705 checked, zero broken links | `e198314d887740ef75cca348b8928e3400173f99638c20791df13e2f804a461c` (`helper-names-owning-v1/doc-links.log`) | Same repaired Source |
| Page freshness after the helper rename | Pinned Node and root Vitest whole `apps/room/page/test/assets.test.ts`, `--config vitest.config.ts` and the recorded reporters | 0; one existing case passed and the current bundle matched | `73070b7b6145f5f2ad704be86fdb639ed2eef5a9a3fa906d0b29b493bfb55dce` (`helper-name-page-assets-v1/manifest.json`) | Intentional dirty `52c2714c` plus six identifier replacements |
| Ordinary gate V3 | `npm run gate` | 1; kernel, Node, Counting and prechecks passed. Plain: 2834 passed, 1 failed, 1 skipped. Native unreached | `63ff38cbe07f219b0c8ca22a9fcab6fe2bea542251d9d1815c30abc7141b75e0` (`gate-v3/result.json`) | `8ba23a34`, tree `1fe50e37` |
| Follow-up compiler | `node node_modules/typescript/bin/tsc -p packages/platform/tsconfig.test.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (`2026-10-26-certified-rules-followup/compiler.log`) | `ae49c5a6`, tree `96975fe5` |
| First follow-up reporter startup | Root Vitest whole rules-scope file with the invalid observation phase `rules-scope` | 1; startup error, no assertions ran | `c709d1bd60432718c09b2515e6f7eb662971eb19b3167b178f9b104317b97f07` (`2026-10-26-certified-rules-followup/rules-scope.log`) | `ae49c5a6`, tree `96975fe5` |
| Repaired whole test file | `node node_modules/vitest/vitest.mjs run --config vitest.plain.config.ts --project platform packages/platform/test/rules-scope.test.ts` | 0; 9 passed | `ab330e1b3e6415162cc3ace17142b1a5db2dbc69ebf90168934b92574fecf43d` (`2026-10-26-certified-rules-followup-v2/rules-scope.log`) | `ae49c5a6`, tree `96975fe5` |
| Previously unreached native stage | `node node_modules/vitest/vitest.mjs run --config vitest.native.config.ts` | 1; 778 passed, 2 failed, 2 skipped in final records; zero reported unhandled errors | `e22e1589b62197f6209671def03d7d0411b3f6a8520dd444ec1a6fe9fd38d902` (`2026-10-26-certified-rules-followup-v2/native.log`) | `ae49c5a6`, tree `96975fe5` |

The first ordinary gate stopped at whitespace: one extra blank line at
EOF in each of `packages/git/src/pure-names.ts` and
`packages/scope/test/certified-rules-fixture.ts`. Its outer span was
1.48 seconds elapsed and 1.45 CPU seconds. It reached no compatibility,
compiler or test body, so it establishes no new test result.

Root removed exactly one terminal newline byte from each file. Every
other byte remains unchanged. The subsequent `git diff --check` passed.
The repair changes no policy, assertion, deadline or fixture behavior.
Gate V1 stays failed. Gate V2 also failed later, as recorded below. The repair receipt records byte correspondence, not a passing
rerun.

Gate V2 passed whitespace, commit messages and the commit-message test,
then stopped at `check-shared-helpers.mjs`. Two local SHA-1 format
predicates used the name of the shared byte-hash function. The npm child
exit was 1 and the owner exit was 1, with no guard errors. Its outer span
was 2.61 seconds elapsed and 2.67 CPU seconds. Citations, documentation
links, compilers, main tests and pretest compatibility were unreached.
There were zero observed main cases. Their unhandled-error state is
unknown, not zero.

Root renamed the local predicates from `sha1` to `isSha1Hex`: two identifier
occurrences in `rules-certificate.ts` and four in `rules-policy-tree.ts`.
The exact inverse restores every original byte. The regular expressions,
decisions and binding checks stay unchanged. This Source-only rename
changes no declaration data and requires no declaration generation.
It establishes no new compiler, native or Page-build result.

The three static owning commands then passed on that deliberately repaired
Source. Their separate elapsed and CPU spans were 0.40 and 0.50 seconds
for shared helpers, 5.64 and 5.91 for citations, and 0.09 and 0.09 for
links. No outer aggregate was measured. Gate V3 later failed at the
whole-definition test described above.

A subsequent whole assets witness passed on the deliberate six-identifier
repair of `52c2714c`. It confirmed that the current Page bundle is exact;
all 3199 Source hashes were unchanged across the command. The one actual
`page` case has complete ready, result and final records, with zero
reported module and unhandled errors. The 0.72-second elapsed and
1.19-CPU-second measurement covers the Node command only, with no wrapper
outer span. The progress schema has no observed retry or repeat fields.
The run used the default settings without overrides. This witness
establishes freshness of the existing bundle, so the rename requires no
new Page build.

V17 has 69 actual ready, result and final identities, no pending cases and
zero reported unhandled errors. Ten finite clean cuts passed. Its outer
span was 18.47 seconds elapsed and 30.86 CPU seconds. This is the current
focused baseline, not a sum of earlier passes.

The global required-check fault failed at the intended line 288 with an
actual cleaned publication and no reason, instead of the required
`not-reserved` and `rules-not-met`. Its outer span was 7.31 seconds elapsed
and 8.99 CPU seconds. The kernel fault removed only native registry
preservation, retained the fresh-name allocator and failed the valid coded
write at line 388. Its outer span was 4.13 seconds elapsed and 5.11 CPU
seconds. Five finite cuts passed: three clean positive cuts and two cuts
with the one explicitly allowed fault. All 3198 tracked Source bytes and
Git modes were restored. The negative child, owner and capsule exits remain 1;
the distinguishing result is recorded separately.

The canonical Page build ran at `c64dc766` and its assets-only adoption is
`1f8ed9ef`. The three after-copies match the actual output. The resulting
asset module is 906139 bytes, the JavaScript is 849583 bytes, and the
26184-byte HTML is unchanged. The build outer span was 0.70 seconds elapsed
and 0.64 CPU seconds.

The subsequent Page owning run passed both production and test compilers
and the whole existing assets case. The actual command had no `--project`
flag. Its recorded selection and actual callbacks establish the one
`page` project case under `threads`. Four clean cuts passed, with no extra
cases or reported module or unhandled errors. The outer span was
3.53 seconds elapsed and 5.98 CPU seconds. This is not a browser test.

Each outer span includes its nested commands. Nested spans are not added.
These local measurements are not portable benchmarks. Private copied
dependencies, process scheduling and operating-system cache state limit
comparison. Package cache records were earned by the actual control
commands without cache reset or priming.

Earlier failures remain failures in the historical phase indexes. The
first two owning runs stopped after two and thirteen compiler passes,
respectively; their bodies were unrun. Later compiler, selection and
native fixture failures retain their original outcomes and bail-pending
cases. The whole-definition failure exposed the actual G14 13-versus-12
slot violation. The combined run above and native V1 through V16 are not
relabeled by V17. Generation V3 and the initial Source-seal attempt also
remain failed. Callback records for pending cases do not establish that
their assertions ran.

The archive witness confirms four actual native archive frontiers and
Marks, clones the resulting Git repository, runs `fsck`, and replays the
four scopes offline. Removing each exact policy, proof or observation
blob from a copied offline map proves those retained dependencies. The
stand-ins supply repository objects and transport answers. They do not
prove hosted-provider durability or production archive permission for an
arbitrary value.

Temporary birth, delivery and field diagnostics were removed before V17.
The pure whole-definition witness and the native security assertions stay.
The evidence retains bounded diagnostic outputs from failed runs. Raw
environment, private bindings and physical Source, tool and dependency
vectors are withheld from the portable bundles.

The follow-up ran on macOS-27.0.1-arm64-arm-64bit-Mach-O, Node v26.12.1.
Existing private dependencies and earned caches were reused without reset.
The initial load averages were [2.10791015625, 2.6318359375, 2.552734375]. Separate command intervals were:
rules-scope 0.85 seconds elapsed and 1.28 child CPU seconds.
native 1315.81 seconds elapsed and 1329.90 child CPU seconds.
These are separate command measurements, not one measured gate.
Native has 769 ready, 749 result and 782 final callback identities. The
terminal summary and final records agree on 778 passed, two failed and two
skipped. Earlier callback gaps remain unknown and are not reconstructed.
The final callback counts, states and unhandled errors are in the retained
`2026-10-26-certified-rules-review-index/summary.json`, indexed by the final
manifest. No production source or test changed during those commands.

### Required witnesses and rollout

The request's witnesses remain at their existing boundaries:

- `packages/scope/test/creation-versions.test.ts` pairs refusal of old new
  genesis with accepted new genesis and repeat creation, reads and acts on a
  sealed live old scope. The earlier R6 note records its accepted evidence.
- `packages/platform/test/rules-policy-v11.test.ts` pairs accepted complete
  policy with missing owner choice, zero approvals without each opt-in,
  forbidden approver actions and missing protected coverage. Each refusal
  has its asserted reason. Historical permissive extents remain unchanged.
- `packages/platform/test/rules-policy-tree.test.ts` pairs an unmatched
  pattern refusal with the same pattern explicitly marked for a future path.
- The first `certified-rules.scope.test.ts` case pairs a signed publication
  without `ownerMayReview` with an accepted publication using the same real
  certificate and retained values. The refused attempt changes no Rules row.
- The second case uses a stale lane rules copy and fresh Destination policy.
  Destination requires current global and touched-extent jobs before push.
  The retained global required-check fault removes that enforcement and
  publishes where the unchanged case requires refusal. The table records
  the assertion failure and restored baseline separately.

No existing live scope changes its pinned definition. This family affects
only new scopes explicitly created as Register 19, Directory 18, Rules 11
and Destination 14. The public and recorded Grow families remain at Register
17, and the default remains Register 18. The planner owns creation allowances,
the scheduled demo cohort and deployment after landing under `0716e75a`.

## Open limits

Request `0716e75a` owns exact-head review and any repair it identifies.
The index records the failed V3 gate, the passing whole Rules file and the
failed native phase separately. The one-line archive test repair at
`8b85ece5` follows the execution checkpoint and remains unverified.
Planner question `53707834` owns the next validation choice. This note and
its manifest add no production source changes. No approval or landing is implied.

This family addresses findings 3.2, 3.3 and 3.4. Their closure remains
conditional on the checker accepting the failed gate with its limited
follow-up and reviewing the exact final candidate. Finding 2.2 belongs to the earlier R6 work recorded in
[versioned publication](2026-10-25-security-r6-versioned-publication.md).

Native tests establish the real family and protocol with explicit TEST
hosts. They do not independently establish a foreign-Membership-incarnation
path because Q11 refuses that policy earlier at its same-sibling checker
boundary. No authority or incarnation is fabricated. This qualification
does not add a new acceptance task. Browser interaction, live provider
acceptance and hosted deployment remain outside the local evidence.

Finite before and after cuts establish the recorded files and metadata at
those cuts. They do not establish continuous custody, full dependency-byte
equivalence or a physical inode guarantee. Historical Page build records
V1 through V3 are observations-only with unknown execution checkpoints;
they do not replace the actual V5 build above. The planner controls rollout.
