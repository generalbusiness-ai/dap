# CB-1: base-family preparation for celld

## What changed

CB-1 source follows request `b5f200f2`, accepted pre-code act `fd0f709e`,
rulings `4ce94d7e` and `4d03ff1d`, and source promise `9b083032`.
The original branch `builder/cb1-base-celld-20261114` starts at reviewed main
`5b342ee9c484c0c653dc1a363b852be83ef1d77b`.
The source-only composition `builder/cb1-on-combined-source-20261114`
starts at combined head `0eb5a1aaf4174b728745d331507900f759f64e00`.
It carries the single CB-1 feature commit without dependency merges or
conflict resolutions. The integration below takes the later main.

## Dated source integration and attestation

Branch `builder/cb1-main-attestation-20261114` preserves source head
`efdb4c874a9664414fae7d51c5cb5cfbc9cc7280` and merges main
`336dd74e990f057834ac8b2edc92a4287315ec8c` without conflicts.
Merge `ef399092a50447e2ca6734534f06d6bce58cdc53` has tree
`30d8309bc1c7a9930b1be5d1d445d3564021f577`.
The original branch, dependency view, and development outputs remain intact.

The only test expectation change adopts the reviewed AST seal
`e13a31cfa361891571369a4b976abe053189285547b9238d2a80bfabb19fc2f0`
for `packages/platform/src/version-questions.ts`.
Ruling `4d03ff1dda006ad8ff50a29ea471001ff46218ae` approved its two Register 28
additions. The source has Git blob `912e80776291071449ddb7eea59db78e4c247612`,
identical to the source reviewed for AE-1 adoption commit
`5e8d4a63284854eabd9c86bdb9e0645f22e6e727`.
The maintained parser, `scripts/security-entry-points.mjs`, has identical
blob `0fe3f77ad139a4e4402b15ad26bc6c9473d1df83` in both lanes.
The existing whole-module selector calls `sourceSeal`, which hashes the
normalized TypeScript AST from `rolldown/parseAst`. This is not a raw-file hash.
This follow-up reuses the reviewed result without recalculating the AST,
changing the selector, or updating any other expectation.

The earlier AE-1 owner failed with actual `e13a31cf` against retained `069eaf4c`.
Its 12 cases ended with 11 passes and one failure. The output remains at
`/Users/hughpyle/play/artroom-evidence/2026-11-14-ae1-development-attempt2/security-entry-points.stdout.log`
with SHA-256 `d4f167e73793c6053324281d0cda925e8247ee6f2dba3a4218978381ebf91c29`.
That failed run supplies the adopted result. The whole security-entry-point
owner then passed all 12 cases at `20609219271fc127f76ef61d30c6a0171eeff8f0`,
tree `abb82b3b024f828ac079fff5226d5882a42df7dd`, with no skipped or cancelled
case. Its process exited 0 in 4.404171417 seconds. END `81308e427d2fd279d7fa37663527c2f4be9788e9`
records that result. This note-only follow-up preserves the checked source.
The other development results below retain their original scope. At that checkpoint, actual
post-C2 integration, gate, fleet and CB-2 results remained open.

## LS-1 source continuation, 15 November

Branch `builder/cb1-ls1-source-20261115` preserves this branch at
`8a5880b6716dab2691a2115498125d06f347d15b` and merges actual main
`4b198d0fc980327d87347b05a3817106974bf8d7` without conflicts.
The new [LS-1 note](2026-11-15-ls1-current-smoke-reference.md) describes
its separate request `3bacbc5e` and promise `630a37a0`.
CB-1's promise remains `9b083032`. The later lifecycle ruling below moves
the fleet witness to a distinct request and preserves the Security review
and CB-2 boundary.
All results above and below retain their dated source boundaries.
Those merged CB-1 and LS-1 runtime checks and gate were UNRUN at that checkpoint; current results follow below.

Lifecycle amendment `3f739d53d5f1aebf98bfd37c2afd5f6c66f37c06` closes
LS-1 at normal joint landing with CB-1: one verdict names both promises,
and the receipt closes them. No real local Worker run stands behind this
head. The LS-1 note records only the bounded binary search. After publication,
the planner checks the actual main branch's **Local Worker smoke** workflow;
a red run opens a new repair request and reopens neither promise.
Later ruling `841b79030689a4b6d3c9d8f4092905c790dbc7ce` removes the fleet
witness as a joint landing condition. The planner files its distinct
request at CB-1 landing; it waits for Hugh's machine and privileged-step
operator selection. CB-1 and LS-1 may land after a passing gate and a review
with the Security conclusion on the closed application settings. The future
gate START answer is: no CB-1 fleet obligation blocks landing after that
passing gate and Security review. That disposition did not relabel the then-UNRUN results.

As of 15 November 2026, no persistent fleet run stands behind the `base`
family yet.

## Current integration, LC3 and Page repair

Normal merge `7521df7f8d37048b7a3a5874d8ac4ca87d702636` takes actual published
main `2055762c3c5aab64850a67fa2017056fef47822f` onto preserved CBLS `c00dbc8e`.
Integration END `2aa5612f6f9ce585f8c06893531b604c53f7a8a6` records exit 0 and
0.357093500 s. All 4,904 tree entries reconcile: seventeen own entries remain
exact; 4,886 other entries remain incoming-exact; the sole shared Security
file keeps CB1's already adopted e13a31cf row alongside incoming NF's
95ab1f1d MCP index row and unchanged E1 judge/expected-value rows. All eighteen
manifest/lock inputs remain exact. No AST refresh, install, copy or restamp ran.

The first merge controller refused before creating its output directory or
launching git merge because core.hooksPath had changed from unset to .githooks.
Its retained record is
`/private/tmp/artroom-cbls-source-merge-prelaunch-hook-change-20261115.json`:
exit 1, tool wall 0.074337666 s. No merge or project hook ran in that attempt.
Root then inspected actual activation and launched the normal hook-aware
merge. The maintained commit-msg hook passed. No pre-merge-commit exists,
so this automatic merge does not claim a pre-commit formatter/helper run.
The successful merge's records remain under
`/private/tmp/artroom-cbls-merge-published-main-attempt1-20261115`.

LC3 request `7b51d924ef241b5fbf20d506c4a062fb38634ee1` and promise
`fa55582bec9dade2d64ef1226b45101781d4194f` joined this head before gate START under ruling
`502d72944ed33e9eb5ee4dd04a1d888e31bf1187`. Commit
`769482ac4ac23f0a5419ee3114bb986e0caaa4e0` changes only the Lending room
configuration, sandbox rollout and their existing pinned-origin assertion.
The installed signed Lending 0.3.0 item 2 has the exact same host object in
both configurations, mapped to the fixed LENDING service alongside unchanged
Grow. The existing whole deployment-smoke owner compares every room descriptor
and sandbox mapping in both directions, including the matching Worker service.
LC3's distinct report remains `apps/room/wrangler.lending.jsonc`; no LC3 note
or duplicate CB1/LS1 report is added.

This mapping admits the canonical screen address under
`https://lending.inguz.space/applications/sc_5hagamavauu5lcejxqxqkd6xl3ol26bke2ipkhaiwxtxono2gujq/2/sha256%3A7217583c00c0548755faa3a83ee9fef194a354624dd29dccf62a7c79cbfd48ef/`.
The bare origin's `/` remains 404 by the existing sandbox route; a configured
host does not add a root redirect. The descriptor names the installed signed
0.3.0 presentation, not the open authored 0.4 source. No packet, trust row,
source version, canonical identifier or authority changed. After landing,
planner deploys dap-lending before sandbox and reads the configured screen.

The original whole Page assets owner failed at 7521: the committed module was
2,481,069 bytes with digest
`9294795b2b4931fec5bbc04ee7711db1d8ff303e16ec3cd83caff28603534c39`, while the
write:false build expected 2,481,169 bytes and
`6d5ea6adb01d3e72a68862fa80d45f5c8bfcf17c0a6f71932c867d9e950800a3`.
Ruling 502d7294 authorized one maintained Page build and an asset-only commit.
The producer exited 0 in 0.377839667 s and wrote that exact expected module.
Its controller then exited 1 because its post-build audit wrongly assumed
OAUTH_JS stayed unchanged. Root preserved that failure and completed an
offline comparison of the same before/after bytes, verification exit 0.
Both JS strings contain only the two approved Register 28 additions, adding
46 bytes each; both HTML strings and surrounding module structure remain
exact apart from corresponding digest comments. No producer reran.
END `892ccbb79a375f344e2ec552560d999cd4ccb070` records both outcomes.

Asset-only commit `25f070a71161fcd69717a95825516bc35d034131`, tree
`b2e9fb982e0c1b74767fad1c2f90b84a17d8bd97`, preserves all 4,903 other entries
from 769482ac. Its ordinary pre-commit helper scan and commit-msg check passed.
The whole repaired assets owner then passed once. The final source below
includes LC3 and this asset; earlier 7521 checks remain dated, not relabelled.
All four required Page routes later passed at 5fd226c6. The original
twenty-two-path diff matches
Page through assets.ts and matches no Card filter; the later two ID files
and testing-rule sentence bring the follow-up diff to twenty-five paths
without adding a Card match.

## Base-family source changes

The normal celld smoke plan now uses the CLI's `base` default.
`celldPreparedNoHostRegister` admits Register 28 beside retained Registers
21 and 25. `celldSmokeOwnedPlanRegister` admits Register 28 beside retained
Register 21. Preparation still consumes an existing retained plan offline.
It does not replace an uncertain plan or change its recorded pins.

Mac preparation adds an optional `--application-trust-file` input.
Its nonsecret JSON names the exact release, publisher and canonical Git
host that the operator trusts. A project with that input stages exactly
one `APPLICATION_CONTENT` R2 binding and the `APPLICATION_TRUST` variable.
GitHub staging preserves and checks the pair before reading its private
key. Deployment validates the same pair before it can deploy a project.
The maintained template stays unchanged, so existing projects may still
omit both settings.

The guides describe `base`, retained plans, persistent package storage,
and the separate archive-provider limit. They no longer claim that celld
must use an older family or lacks the base-family features.

## Decisions and why

The staging change is the Security scope of CB-1. The only additional
non-variable field is `r2_buckets`, with exactly this single row:

```json
[{"binding":"APPLICATION_CONTENT","bucket_name":"application-content"}]
```

The only additional variable is `APPLICATION_TRUST`. It is a string of at
most 64 KiB of UTF-8 JSON, containing at most 128 exact
`release`, `publisher`, and `host` rows. Releases are unique canonical
SHA-256 digests. Publishers and hosts use the production canonical forms.
An empty array trusts no release. A partial binding/trust pair, another
bucket, an extra row field, malformed trust or an unrelated added setting
refuses the project. Existing Worker, variable, GitHub and installed-root
checks retain their scope.

Both JavaScript helpers use the production trust parser. The Python
deployment guard first checks the closed project shape, then gives only
the bounded nonsecret trust string to the same parser through a local
Node helper's stdin. The helper has no network or private-key input and
prints no trust data. A missing Node/parser, timeout or rejected input
refuses deployment. This uses the guide's existing Node and locked
dependencies; it installs no tool. Legacy projects start no helper.
GitHub staging also rejects duplicate project keys before it reads a key,
so staging cannot normalize away ambiguous trust settings.

These settings do not grant membership, produce a packet, change package
admission, or add a host port. The existing `ApplicationContentStore`,
signature checks and exact release trust still decide installation.
celld maps `application-content` objects to `r2/application-content/` in
its fleet object-store bucket. Without a fleet bucket, R2 methods fail.
`celld dev` therefore supplies no package-installation witness.

Ruling `4ce94d7e` moves archive-provider work and the later archive scene
to CB-2. A CB-1 room has no repository. Its Directory reserves declared
prefixes, but publication and `bind-archive` refuse `no-repository`.
A repository binding alone would supply no celld archive provider.
CB-1 introduces no GitHub archive mint or replacement provider.

Ruling `4d03ff1d` originally split source and fleet evidence in time, when
no public Counter packet existed. At that checkpoint, Counter `0.2.0` was signed and on main
since `863ca6b2`. This head selects no operator release. The distinct fleet
witness must use the exact approved public release and publisher; neither
a TEST packet nor Grow can substitute for it.
Hugh has selected no machine or operator, and no fleet exists for the
witness. The previously recorded Mac mini remains unavailable. This
source lane makes no fleet connection, reads no private key or credential,
runs no privileged step, and sends Hugh no prompt.

## Dated and current evidence

The source supplies owning tests for the default base plan, both Register 28
version questions, retained old-family preparation, the exact paired
application settings, and refusal of another added field. Filesystem
staging tests use synthetic retained plans and public TEST trust rows.
The cases cover helper boundaries, not an installed room or object
store. Each row names its measured source boundary. Earlier current-owner
rows bind 25f070a7/tree b2e9fb98. Comparison/apply/docs rows name their own
source or resulting commit; follow-up preflight and stages bind 5fd226c6/tree
388bbbac. All use the same published main 2055762c.

`E=/Users/hughpyle/play/artroom-evidence`;
`T=E/2026-11-15-cb1-ls1-lc3-final-source-preflight-attempt1`,
`B=E/2026-11-15-cb1-ls1-lc3-bounded-owners-attempt1`,
`P=E/2026-11-15-cb1-ls1-page-assets-owner-attempt1`,
`R=E/2026-11-15-cb1-ls1-page-regeneration-attempt1`,
`A=E/2026-11-15-cb1-ls1-page-assets-repair-owner-attempt1`,
`G=E/2026-11-15-cb1-ls1-lc3-full-gate-attempt1`.
`K=G/controls/cb1-closed-content-row` and
`L=G/controls/ls1-finite-operation` name the retained native control streams.
Each result.json retains exact argv, cwd, exit and process wall. Control copies
retain the actual byte digests; originals remain intact. The seventeen safe
copied records exclude the private synthetic fixture trees.


| Check | Result at its named boundary | Evidence or remaining work |
|---|---|---|
| Original changed version-question and smoke tests | Dated DEV passed: 328 Vitest cases and 5 Node cases | Owed |
| Original Mac preparation and deployment-boundary tests | Dated DEV passed: 6 project-preparation, 9 GitHub-preparation, and 12 Python cases | Owed |
| Original Platform compilers and helper syntax | Dated DEV passed: both platform contexts and four production MJS syntax checks | Owed |
| Whole security-entry-point owner at `20609219` | 12 passed; exit 0; process wall 4.404171417 s | DEV only; raw `2026-11-14-cb1-attestation-development-attempt1/stdout.log`; SHA-256 `6aa8b99c86f2aa241fe307c043ca0d5a31cccea19bd3f4267b5c2527c9a56de4` |
| Final documentation checks | Final documentation-check END accompanies the final source act | Root runs the four maintained citation, link, note and commit-message checks once after this note-only commit; the external record names the actual head and results. |
| Original combined gate, END a18e2cecc1eb733b26f89189cfc00c0eaed2abbc | FAIL at 25f070a7; child exit 1, wall 338.286502750 s; outer 338.526280500 s. Node 204 PASS, Counting 56 PASS, Plain 4857 PASS/1 FAIL/1 skip; Native unreached | `G/gate.log` — `2e6bfdb8c8e32101358471deaf74bef3c6f23e75336e6b37837d5ea9390e2979`; `G/result.json` — `3f11a1cc8d5c4965a0a19bbeaf2fe8b8c37a3f57c853f4a0c842dba84e4e28f5`. Static/kernel/typecheck/pins passed; notes 0 warnings; install skipped. Scale omitted, no Scale command/result. |
| Persistent-fleet Counter witness | Moved to a distinct request by `841b7903` | Planner files it at CB-1 landing; Hugh's machine/operator choice remains owed; this head selects no release |
| Earlier preflight at 7521 | Fetch/helpers/whole typecheck all exit 0; 0.352830083/0.941164625/16.765234875 s, outer 18.370618209 s | `E/2026-11-15-cb1-ls1-exact-head-preflight-attempt1/result.json`; helper/typecheck stdout digests equal the final preflight row, but source was 7521. |
| Original Page owner at 7521 | Compatibility exit 0 in 0.087477916 s, copied:false/cd50 unchanged; whole owner 1 FAIL, exit 1 in 0.723053625 s; outer 0.971222708 s | `P/page-assets.stdout.log` — `202329b4562b84e35ce208309e882f4d4d91955268eb72d2e9f7c1fc032a467d`; stderr `5f2b01d6c3ab12dc2ceb865b4c37efb05c29dda8570c7def8ba4f671879c92c0`. Actual mismatch at assets.test.ts:13:174; later owners did not run in that failed sequence. |
| One Page producer and corrected audit, END 892ccbb79a375f344e2ec552560d999cd4ccb070 | Producer exit 0 in 0.377839667 s; controller post-audit exit 1; separate offline completion 0, no producer rerun | `R/result.json`, `R/export-correspondence-completion.json`, `R/commit-result.json`; producer stdout `b96c840e297c748720fa67b4d3d0f1d030038fd59eae1c364d6e6150d52b5217`; exact new module digest `6d5ea6adb01d3e72a68862fa80d45f5c8bfcf17c0a6f71932c867d9e950800a3`. |
| Whole repaired Page assets at 25f070a7 | 1 PASS, exit 0 in 0.345288500 s; outer 0.457681750 s | `A/page-assets.stdout.log` — `dbd0afd7c2373c2742ef45e856e4bb0813d2704783a3f0af95a28d4ff80b6d7e`; actual write:false comparison, no second standalone producer. |
| Final exact-head preflight at 25f070a7 | Fetch/helpers/whole typecheck all exit 0; 0.353881625/0.565040750/16.343570000 s, outer 17.573380333 s | `T/result.json`; helpers stdout `af00848d1b94433533085adfecd184e68584914cce159b58ead29f4dab584502`; whole-TC stdout `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a`. Whole TC supersedes a separate focused-context sweep. |
| Whole Security at 25f070a7 | 12 PASS; exit 0, process wall 3.938380625 s | `B/security.stdout.log` — `8ae3fc7e9e7fd2801f8c79181e09f55304df261570326fecaf761c1a88776a40`. Exact argv/cwd in `B/result.json`. |
| Whole Platform version-questions at 25f070a7 | 328 PASS; exit 0, process wall 0.867491959 s | `B/platform-version-questions.stdout.log` — `cf2a89afc4a810808cac2fa93813ba2cd3723d384f244bb6a9c5694bb9dd0f1f`. Exact argv/cwd in `B/result.json`. |
| Whole Mac host kit at 25f070a7 | Parent 1 PASS; real child Node 20 and Python 24, all exit 0; exit 0, process wall 15.981742334 s | `B/mac-host-kit.stdout.log` — `0d0d502ccc9437c57a601ea95a32112ff92bb791f2214a3b88c526c467264d33`. Exact argv/cwd in `B/result.json`. |
| LC3 whole deployment smoke at 25f070a7 | 11 PASS; exit 0, process wall 0.172260333 s | `B/lc3-deploy-smoke.stdout.log` — `c2c54a48d9db13f2a4cabe959bc0a65a9f212b77bcdb0359e2250cef46312dc0`. Exact argv/cwd in `B/result.json`. |
| LC3 whole sandbox at 25f070a7 | 10 PASS; exit 0, process wall 10.005418583 s | `B/lc3-sandbox.stdout.log` — `7c847189a1b6e4b526b7cd8a231056a5f1f7e1276b8ce91abed8d1c123d58d2d`. Exact argv/cwd in `B/result.json`. |
| LC3 whole CLI config at 25f070a7 | 6 PASS; exit 0, process wall 1.113520625 s | `B/lc3-cli-config.stdout.log` — `423324ffd2ddb481902030cf96f949502b46b75e65dcd467f5679e22f171b2de`. Exact argv/cwd in `B/result.json`. |
| Six-owner aggregate | All exited 0; outer 32.693266125 s, all stderr empty, verification 0 | `B/result.json`; no standalone GitHub 9 or smoke 7 green preceded the controls. Mac child results remain nested diagnostics, not extra parent cases. |
| CB1 closed-row control, END ad4c8a58518affe60d0ca67b83a2eef5264ea575 | DISTINGUISHES: baseline 9 PASS; mutant 8 PASS/1 direct ERR_ASSERTION at prepare-github.test.mjs:121; helper exit 0 in 6.472222959 s | `K/before.tap` — `70917e8acdf9faddbde701ad4a97113e13a4872f3cc0f4e9ee434766440420f5`; `K/after.tap` — `d6fe28fffb76f0002669a0980e9ee8085a5d87fa920c9cf76bfbd71d6954f64c`; `K/stderr.log` — `bb239114b9eff771e6d8b6f2cc2b93b4010953e04fbbf4a3a32703e983ef8bdc`. |
| LS1 finite-operation control, same END | DISTINGUISHES: baseline 7 PASS; mutant 6 PASS/1 direct ERR_ASSERTION at celld-smoke.test.mjs:168; helper exit 0 in 1.849805833 s | `L/before.tap` — `f573060b78fe51121797aebfa05e6e59843695ee1890510cfc7d4fe081f09042`; `L/after.tap` — `ebe99072ac6a1623a99569b0694e6fc21eb62c451979f9cfb8e473ae59b004af`; `L/stderr.log` — `8fd1fe0036698d686899d0095e31be05e348a84389f491c330e7cf1fe05a996b`. |
| Shared control restoration | Both original source digests and 0644 modes exact; no third green; outer 8.531697667 s, verification 0 | `G/controls/result.json` — `9d0a4fd445bf1c2f5eb6e4d2973fc72c9d39ea7edf75fc3bcbdbcc84182dd43e`. Retained helper `d427d567599c45b69c4e7faf55fbf93956602b1ab02d897cd7163dbf2a925140` differs from original `8d7ba44b672b1c84c2272dd185661c77ecc06b958e59fb83b5b4a0d0562aa818` only by preserveScratch false to true. |
| Normal canonical comparison, END 7720b98d503916380ddc5314f203651a76bf78ef | Exit 0 in 1.774753375 s at clean 25f070a7; Grow exact, Lending/Counter only presentation | `I/comparison.json` — `82b1b7f5b696796ddbb303c1af062009b80248f0a2305475d1ca8fd787cb6962`; comparison stdout `17ea4aa9dbc2c81aeda91d737cdcae79202627d09460b05beedf8900f1f68aef`; originals/candidates retained. |
| Conditional apply and required docs sentence | Apply exit 0 in 0.262223584 s; two IDs committed in 2159cf25; docs-only rule in 5fd226c6 | `I/apply-result.json`, apply stdout `ef65a50a0e094964f5e8011ef41094c344d329edaf307578d4840370840fabc8`; `I/docs-commit-result.json`, commit stdout `5e4e170aebe11a83c91b491169fe0385df168f90be56667564210b1df1dae9f5`. Normal hooks passed, no unrelated edit. |
| Exact follow-up-head preflight, END 99cfe22590daf8de8e1699430908f8d665c74be5 | Fetch/helpers/whole typecheck all 0; 0.352330958/0.602859667/16.258310917 s; outer 17.517902000 s | `U/result.json`; helpers stdout `af00848d1b94433533085adfecd184e68584914cce159b58ead29f4dab584502`; typecheck stdout `a9abf7e40e10fbda74447d08a5ea3b33733361ecd9ac199658065cfbc874936a`. No test stage ran in preflight. |
| Whole reproduction owner in ruled follow-up | 1 PASS, exit 0 in 2.859250208 s | `F/reproduction-owner.stdout.log` — `cf36e984b334f121f52fdf40ff5ef3a87233c5620fac4671378dc5d82b81e93f`; actual native JSON `F/reproduction-owner.json`. |
| Whole Plain in ruled follow-up | 4858 PASS/1 skip, exit 0; measured wall 176.948182167 s | `F/plain.stdout.log` — `023a394d9f69e94aae260b1092b5de9c557b9b96ec0c16d5f8b7d9e8ce8e8858`; actual maintained descriptor/environment in result/fixed-descriptors. |
| Whole Native in ruled follow-up | 1136 PASS/2 skips, exit 0; measured wall 513.306287250 s; natural Scale omit | `F/native.stdout.log` — `a3817fd160d667de4dae7c9035e5421a2794f2dce793aa45b0c72eb6b61a9764`; stderr `8183c096c03cf9ab1019732c1d461981681d59e98bb41998ca82506f4b8eac78`, named negative witnesses. |
| Follow-up PASS, END 2005b6dd95727162ff69c94cf3c75b5bcc71fcf2 | Summary exit 0 in 0.105646375 s; overall measured 693.980114667 s; source unchanged and all children reaped | `F/result.json` — `dbac1bb7bfc9824e1ed73a2d40696e942e723d9c4278f4f027b57f1137e24025`; summary stdout `b32a7e24a0fcab282d2c1cd5057a953012828d31471dbeb07e87413bc30a09fd`. Root verified these hashes; original gate remains FAIL. |
| Page route: page-screens at 5fd226c6 | `node apps/room/page/test/screens.mjs`; exit 0 in 18.757593208 s | `D/page-screens/checks.json` — `ced623df6c5d92f5dab5caf8fe2a276809d85fcb28ff2a03049222462fc90c3b`. |
| Page route: demo-captures at 5fd226c6 | `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --out J/demo-captures`; exit 0 in 39.253146208 s | `D/demo-captures/checks.json` — `629cf087d83e19a25711785398982d8ca0d5100c3184bfd5f4e2e8253fa6a372`. |
| Page route: claim-witness at 5fd226c6 | `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --claim-witness --out J/claim-witness`; exit 0 in 39.151146458 s | `D/claim-witness/claim-checks.json` — `fa9de3ccc70da9d058e520c7f2c2f88b7deea1ce065e6535ec47d5bba1f8ee03`. |
| Page route: label-witness at 5fd226c6 | `node --import tsx --no-warnings scripts/demo-captures.ts --recorded --label-witness --out J/label-witness`; exit 0 in 38.985484000 s | `D/label-witness/label-checks.json` — `5896455a253e34847b75ca769b11af9ba97c8890425c942f06de34941e360bd0`. |
| Four Page routes and root QA, END 718f2d46cc6d30b4a2587cb8160ca9a2e707cc97 | All four exit 0; outer 137.321146292 s; ten exact clean-source guards, all children and session 96824 reaped | `D/result.json` — `3e660bb31909b27337a6eb8495100db05a6f4e89891d6fdf0c009324b1971ba7`; `D/root-qa-safe-export.json` — `8098f24657bd21a062ee15797f8e58625cc97e75926a4623c7fa4feb55575668`. Root read all four reports, streams and two capture documents, and viewed seven PNGs. |

The security-owner path above resolves under
`/Users/hughpyle/play/artroom-evidence/`. Its `command.json` and `result.json`
retain the actual command, source worktree, UTC interval, exit, process wall,
and stream hashes. The command was
`/opt/homebrew/bin/node --test scripts/security-entry-points.test.mjs`.
Its stderr stream was empty. No AST calculation, control, compiler, build,
gate, deployment or fleet action accompanied that run.

The first Python run completed 12 tests with one failed subtest: the
negative hostname table expected the production parser to refuse `xn--`.
One bounded probe through `application-settings.mjs --check-trust`
accepted the exact public TEST row. The production grammar checks a
canonical URL spelling; it does not add a DNS-label validity rule.
The fixture now includes that row in positive acceptance and byte-preservation
coverage. Its specimen indices identify rows even when diagnostic text
truncates. No production parser changed.

The whole Python owner then passed once, followed by the compatibility
prerequisite and the whole version-question owner. Compatibility left its
already patched bundle unchanged. The successful compilers, syntax checks
and 20 Node cases did not rerun. Those earlier runs were ordinary development results,
not gate evidence. The original failed output and separate successful
outputs remain in scratch. No control, build, deployment or fleet check
ran in that historical sequence. Source review must assess the Security boundary and state the distinct
fleet witness's remaining scope.

## Open limits

Ruling `841b7903` replaces the earlier condition that kept CB-1 open until
the fleet witness. The distinct request needs an approved public Counter
release and Hugh's actual machine and privileged-step operator selection.
It uses normal helpers and CLI to prepare and deploy the base plan, finish
installation, create a room,
join a member, and record an active Counter installation with a verified
application journal. A fleet restart must load the stored package bytes
again. The witness also checks declared-prefix reservation and the two
`no-repository` refusals.

The retained old-family preparation check belongs to the source tests.
CB-2 owns the archive-provider design and the later room-to-repository
archive scene. The fleet witness and CB-2 remain distinct from joint source
landing. The planner's post-publication Local Worker smoke check stays as
defined above.

## Failed gate and ruled identifier follow-up

The one original full gate, START
`dca2d2af6d84b3f22a985a7acf4ed1b736475477`, ended **FAIL** under END
`a18e2cecc1eb733b26f89189cfc00c0eaed2abbc` at unchanged 25f070a7/tree b2e9fb98.
Node 204 and Counting 56 passed. Plain had 4,857 passes, one failure and one
skip; Native was unreached. The sole direct AssertionError at reproduction
owner line 32 compared Lending's current presentation d78b401a with actual
c817e926. Entry, definitions and semantic matched. Grow's first tuple passed;
Counter preparation and later packet/trust assertions were unreached in that
failed case. Those later assertions receive no pass claim from the failed gate.
The failed Plain stage wall was 177.751232916 s. Its terminal observations
remain partial, with 129 unknown/suite observations and zero contradictions;
Native was missing because it never ran.

The Platform question change also enters application presentation bundles;
root's earlier footprint missed that consequence. Rulings
`7e4bf8ba4e6702d9e1783cfe391bc56b0bb9d79a` and
`42140027ceb491bd6571ea1a0df747f9a654bc35` permit one normal three-package
comparison, conditional open-0.4 presentation repair and a targeted follow-up.
Gate 1 stays FAIL; Node and Counting do not repeat. The ruled route runs the
whole reproduction owner, then whole Plain and Native. Plain repeats whole
because its prior stage did not pass. A failed follow-up would end this route
and require a new full gate; this follow-up passed.

Comparison END `7720b98d503916380ddc5314f203651a76bf78ef` records exit 0 in
1.774753375 s with a public TEST signer and no public packet output. Root read
all three actual tuples: Grow 2.0.0 is byte-exact; Lending and Counter remain
open 0.4.0 and change only presentation. The measured values are:

- Lending: `sha256:c817e92660888e283be1c9b7c425f63a92d1b8e9909bf58eef9001195567e813`.
- Counter: `sha256:3f45ee49b20d9699e9d8f801edebb0d017abeceddee075fc4b8a19a83498afe3`.

Apply exited 0 in 0.262223584 s. Commit
`2159cf25b193a0ef6ffc2b35f3d008bbd9ec06bd`, tree
`3a52ee9ba849de0c344a2f6abd332bc487e4247e`, writes only those two presentation
fields; all 4,902 other entries stay exact. CB1 carries the two ID files because
its version-question change caused this drift. Entry, definitions, semantic,
Grow, signed 0.3 packets/trust, source versions and LC3's installed-0.3 descriptor
remain unchanged. The comparison did not repeat. The apply step changed no
signature or signed release; comparison retained only identifiers and exported
no public packet.

Commit `5fd226c6c1a758b793d86055b2ae755637ba0b16`, tree
`388bbbac70a97e57a8bb22e568b06a6c74f52b27`, adds only the required sentence to
`docs/testing.md`: before gate START, package-source or example-source changes
run the whole `packages/cli/test/application-release-reproduction.test.ts`
owner and state its result. It preserves all 4,903 other entries from 2159cf25.
The public rule names the maintained owner, not the private comparison wrapper.

Fresh helpers and whole typecheck passed at that exact follow-up head under
END `99cfe22590daf8de8e1699430908f8d665c74be5`. Follow-up START
`528493f77399a886a327454c162179570997ab87` and END
`2005b6dd95727162ff69c94cf3c75b5bcc71fcf2` bind the whole reproduction owner,
whole Plain, whole Native and summary, all exit 0. The original full gate has
not become a pass. The direct owner passed once, and the required complete
Plain run naturally includes it again. No Node, Counting or kernel rerun ran.
Source/main/origin stayed exact and all children terminated and root reaped them.
After the planner's note-gate END, all four Page routes passed as recorded below.

`I=E/2026-11-15-cb1-ls1-lc3-open04-compare-attempt1`,
`U=E/2026-11-15-cb1-ls1-lc3-followup-preflight-attempt1` and
`F=E/2026-11-15-cb1-ls1-lc3-plain-native-followup-attempt1`.
Actual comparison originals/candidates and apply/docs records remain retained.
The root-verified output hashes in the evidence table supplement the records; they
are not claimed as fields originally emitted by the follow-up controller.

## Completed local Page routes

START `9abbba9e85652c4e0363c7c112d5e66a9d3d1b94` and END
`718f2d46cc6d30b4a2587cb8160ca9a2e707cc97` bind all four routes and root QA to
`5fd226c6c1a758b793d86055b2ae755637ba0b16`, tree
`388bbbac70a97e57a8bb22e568b06a6c74f52b27`, main 2055762c. All exited 0;
no script or guard failed and none was unreached. No source or binding changed.
`D=E/2026-11-15-cb1-ls1-lc3-page-four-safe-attempt1` retains the inspected
outputs. In the table, node means `/opt/homebrew/bin/node` and
`J=/private/tmp/artroom-cbls-page-browser-5fd226c6c1a7-attempt1` names the actual
private runtime output root. Exact argv, cwd and capture environment remain
in result.json. Playwright 1.63.0 used Chromium revision 1243; only screens
reported actual Chrome 153.0.8010.12, while the other report fields stay null.
Browser scripts ran locally on macOS at this head. The Linux workflows have
not run at this head. No Card workflow result is claimed.

The nineteen Page layouts and six recorded-demo screens were meaningful,
without horizontal overflow or error overlays. Root read all reports and
streams, the Page README and demo captures document, and individually viewed
seven PNGs: desktop Issues, narrow creation dialog, dark Rules, prepared text
editor, demo room, pending creation retry and dark local label. The only
explained 422 was author-cannot-review; no unexplained error or unanswered
request remained. Recorded unread-lane and unavailable-live-update warnings
remain explicit. These displays are not proof of a complete list, fresh
browser POST admission or immutable rendered publication.

The claim route reports saved-envelope reuse, three attempted requests,
two-tab Web Locks, explicit resume and changed-settings blocking over a
founding transport-loss stand-in. It admits no founding request to Scope and
proves no native completion. The label route uses native readonly room data
and a private browser TEST label. Its personal-label switch truncates the
label as expected while the report preserves the full fixed label; light and
dark 320px cases show no overflow and ignore a stale incarnation label.
Neither route establishes hosted installation, provider, fleet, physical
device or NF7 success.

Root retained twenty-two explicitly inspected safe files plus the QA/export
index, including the seven viewed PNGs. No raw recorder payload file was
found in the four output directories. No recorder encodings, keys, signed
request bodies or raw journals were selected or exported. Other images and
temporary/cache files remain unselected; that does not classify them as
secrets. Original private outputs remain intact. No screenshot or raw payload
enters Git. The safe result's initial “awaits root inspection” status describes
its creation; the later QA index and END record the completed inspection.

## Current controls and remaining closure

The CB1 control removes only the content row's exact-key predicate. The
otherwise valid preview_bucket_name specimen then reaches private-key rather
than project refusal, and the unchanged assert.rejects predicate directly
fails. It neither reads an actual operator key nor proves the later no-output
assertions in that fault run; those assertions are unreached after line 121.
Deleting only the pair-presence XOR guard would be masked by the production
trust/closed-variable checks; no additional fault sweep ran.

The LS1 control removes only the finite operation-set return. The genuine
CelldSmokeError carrying a synthetic private stage returns that sentinel
instead of null; the strict equality at line 168 fails. Later loop specimens
are not claimed as reached in the fault run. Baselines supply the whole
GitHub 9 and smoke 7 development results. Both controls retain complete case
counts, with no unloaded test, timeout, cancellation or skip. Their separate
child stderr pairs contain only Node DEP0205 warnings. Root reaped all
children and verified exact source/mode restoration before gate START.

The Mac parent separately reports the actual twenty Node and twenty-four
Python results. Its exact child argv, statuses and streams remain in the
parent diagnostics; they are not forty-four additional Node-stage cases.
The GitHub nine-case child repeats only through that required maintained
parent. Private preparation, test TLS and scripted deployment boundaries do
not prove a real celld Worker, persistent store, public installation or fleet.

The original gate remains FAIL at 25f070a7. The separately ruled follow-up
passes at 5fd226c6/tree 388bbbac/main 2055762c. Its complete Plain/Native
terminal records have zero unknown/suite observations and zero contradictions;
scope-stories duration observations remain partial. Natural Scale selection
is omit/outside-scale-paths, with all matched arrays empty across twenty-five
paths. No Scale command or result exists; this is not a zero-case pass.
Native's 513.306287250 s is measured child wall, not a concurrent module sum.
Native stderr contains the named negative-refusal and outside-call witnesses;
the other three follow-up stderr streams are empty. Root read all of them.

Four Page routes passed within their local recorded boundaries. Artifact
filing, joint review and landing remain owed. The Security owner pass is not
the independent Security conclusion on closed APPLICATION_CONTENT and
APPLICATION_TRUST settings.

The gate START's landing-obligation answer under 3f739d53 and 841b7903 is:
no fleet obligation blocks landing after a passing gate and a review with
that required Security conclusion. The dated bounded celld-binary absence
remains explicit. Planner checks actual published-main Local Worker smoke
after landing; red opens a new repair request. Fleet/machine/operator,
Counter release selection and CB2 keep their separate dispositions.

The limited documentation successor changes only the two existing CB1 and
LS1 notes and preserves all 4,902 other entries. Root's final source act binds
the two-note successor and documentation-check END; all 23 non-note paths
and modes preserve 5fd226c6/tree 388bbbac. The four maintained citation, link,
note and commit-message checks run once after this note-only commit and
record the actual head and results externally. No future result or self-hash
is supplied here, and no project-owner or producer rerun follows.

## FW-1

The persistent fleet witness of 17 November, with both restarts, is in
[2026-11-17-fw1-fleet-witness.md](2026-11-17-fw1-fleet-witness.md).
