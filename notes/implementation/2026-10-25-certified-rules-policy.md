# Certified rules policy

Request `0716e75a`, promise `7e959e25`.

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

The first ordinary gate ran at `d0453d10`, tree `0c1305bf`. This candidate
retains that Source with two single-byte EOF removals and the updated
note and evidence index. The table keeps each execution checkpoint distinct.
The completed Page owning checkpoint remains `1f8ed9ef`. Each output
bundle index below names preserved logs, command arguments, outcomes and
case identities. Commands with a bound plan use the exact arguments in
that bundle's command ledger. The command descriptions are not replacement
shell scripts. Full hashes identify bundle indexes, not declaration
values or a synthesized total of earlier runs.

| Check | Actual command or bound command set | Original exit and outcome | Output bundle digest | Execution checkpoint |
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
| Ordinary gate V2 | `npm run gate` | HELD: corrected checkpoint not yet run | HELD | HELD |

The first ordinary gate stopped at whitespace: one extra blank line at
EOF in each of `packages/git/src/pure-names.ts` and
`packages/scope/test/certified-rules-fixture.ts`. Its outer span was
1.48 seconds elapsed and 1.45 CPU seconds. It reached no compatibility,
compiler or test body, so it establishes no new test result.

Root removed exactly one terminal newline byte from each file. Every
other byte remains unchanged. The subsequent `git diff --check` passed.
The repair changes no policy, assertion, deadline or fixture behavior.
The original gate stays failed, and the corrected ordinary gate remains
pending. The repair receipt records byte correspondence, not a passing
rerun.

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

## Open limits

Request `0716e75a` still owns the ordinary gate, final evidence index and
exact-head review. The kernel control, Page build and Page owning outcomes
are closed. Gate V1 remains failed. Gate V2 remains held until its actual closed
outcome is authenticated. No final review head, approval, landing or deployment is
implied.

This family addresses findings 3.2, 3.3 and 3.4. Their closure remains
conditional on the ordinary gate and exact-head review of the final
candidate. Finding 2.2 belongs to the earlier R6 work recorded in
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
