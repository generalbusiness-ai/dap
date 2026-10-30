# J4 workspace holds: source readiness

## What changed

Request `0c3091fa54f38d3709dcb7a741d6754c420ad10c` and promise
`710449ccd016033f1a6b40da348060ad7fe64c4a` own this work. J4 adds explicit hold
version 2, new Issue and Change profiles, and an Artifacts workspace adapter.
Existing lane pins and hold version 1 retain their meanings.

Checker report `8eba6b83351f7a41d9a56e38079c43df6447717c` requested custody
tests, three security seals, a setup-credential cleanup obligation, clearer
kernel documentation, and a smaller evidence manifest. The current source
implements the cleanup under ruling `e7962aa7693d19410b7554503633e850e4b9c3cd`.
The native cleanup file and its revoke control now pass at
`17c14b118ecf3274109727882908bb0b09a69383`, tree
`58526e56594dc5b1aaa736d2df5df94fd142aafb`. The final repair gate passes with
complete 0/0 capture. Earlier failed gates, the unclean diagnostic, and the
isolated repair keep their separate results. Exact-head review and landing
remain pending.

The table uses these historical source labels:

| Label | Commit | Tree |
| --- | --- | --- |
| Baseline S | `31780874d5b1e3f6e5e817e75e6eb7e55765c956` | `b12bc5501a24f0f947a7070ee4c71aef3edeeb6c` |
| Implementation C | `40230449b25f3f8ad970de33c9d184c4013b182a` | `6942d426f2acaee8cdbfc2471708a368a0999b52` |
| Seal follow-up E | `e9da1ba8579989a5f0193deb94fc1dd37fbace6b` | `26f2dd8bd35ba28a40fbe3ff62fe3f67b905c97c` |
| Page output A | `63400786c6ff064957151b35b311883669a6fe9e` | `da672c657e6c31eacb75b67e73cdeec3306ff281` |
| Full gate F | `9d775412bae3eba9b7350a3c4b2daba76e735e08` | `43a4c7587c44d3c0ec51a9508d8d4c6dc9270eb0` |
| Isolated test repair R | `80a742bdb052fca2bca4ec12917d1961f6e19b53` | `7d5f461e16e1d34acdc6aa5a90a74395657cfc2a` |

## Implemented behavior and decisions

### Versioned rules and setup cleanup

The contract declares `hold@2`. Derive keeps separate owner families and
exports `HOLD_V2`, `holdCapabilityV2`, `workspaceOwner`, and `hasAnyWorkspace`.
The first two name and implement version 2. The selectors require a declared
family and listed hold guard or effect. Unsupported versions supply no
workspace authority. V2 carried checks require a full authenticated FactRef of
a confirmed `hold@2:check` outcome. Runtime and replay share these rules.

A confirmed head records the seed commit and opens fork while the actual hold
is held at epoch 1. A null head gives `no-head`; a closed hold gives
`hold-closed`. The first eligible fork answer selects its bounded ID and name.
A late confirmed unselected answer opens deletion for that immutable answer's
exact ID and name, without changing a selected or final fork record. Unknown
fork answers remain unknown. Hold end advances the epoch, makes the instance
past, and opens revocation for live workspace credentials.

The cleanup repair gives each version 2 fork attempt a token record with
purpose `setup`. Its deterministic `workspace:<attempt-name>` handle binds the
same operation and attempt as the host's private custody. The record starts
`minting` before the provider call. A confirmed fork answer moves it directly
to `revoking` and opens the existing revoke operation in that same outcome.
This applies to selected and unselected answers. A refusal ends the setup
record and leaves no issued credential in custody. An unknown answer preserves
the minting record and handle. A late confirmed unselected answer owes both
deletion and revocation.

Only a confirmed revoke ends that token and deletes the held plaintext. An
unknown revoke leaves the token revoking and its operation open. The host
starts no retry or private outbox. Setup cleanup does not delay hold end or
explicit fork retirement, and setup records do not consume the holder's
workspace-token allowance. This statement covers fork setup credentials. It
does not recast every temporary read token minted by the Artifacts helper as
journal-owned or commission that separate convention.

The new head rule declares four effects, one operation, and closure 78. The
fork rule declares five effects, two operations, and closure 12. The
creating-fork reserve is 78 for version 2 and remains 42 for version 1. These
are declared maxima, not observed attempt counts. Historical tests before this
repair exercised the earlier version 2 maxima of three effects and closure 42
for head, and two effects and closure six for fork.

`docs/kernel.md` section 7 names the additions and bounds. The kernel owns
record meaning. Scope and Git supply answers, discovery, and custody. The
registered-only census could not justify changing version 1 in place. This adds
no bare capability name, scope kind, entry form, byte domain, or K item, and
grants no archive policy permission.

### Profiles, lineage, and custody

`issueJ4` and `changeJ4` keep the demo definition names but explicitly select
`hold@2` and `git-read@1`. Issue includes release-hold. Change accepts the
matching foreign Issue check and publishes through unchanged Destination12.
Activation and creation must choose `J4_DIGESTS`; defaults and old pins do not
migrate. `pin.mjs --j4` writes only the two new definitions and digest module.
Its recorded generation produced 23,228 and 43,130 canonical bytes:

- Issue: `sha256:ff901d2e6d25794b1f3719e6786e3c5e73004f1009297dce5f72684b36ac2cc7`.
- Change: `sha256:e6c55417a6d686f34ee05eaa477f0dd6918c997268deb43ae735a2f1d0d3bfb7`.

`Outside.ready` runs before the durable sent mark. Missing target state parks
dependent mints as recorded and unsent until a later commit permits
reconsideration. The hook performs no provider I/O or native judgment.

`workspace-lineage.ts` authenticates the lane genesis, Directory send, Register
birth and found claim, and Destination birth. It binds exact scope,
incarnation, source, send, and sibling pins. Repository host, namespace, and
branch come from these records rather than caller fields. Discovery uses at
most five bounded immutable reads under a five-second monotonic budget.
Internal birth discovery grants no actor read authority.

The service accepts declared hold version 2, not just the two J4 digests, and
verifies the immutable opening. Fork names include lane incarnation, hold,
opening, and attempt. The adapter confirms the seed commit and keeps setup
plaintext for the journal-owned revoke. Partial initialization stays unknown.

Workspace tokens request at most 900 seconds. Fork-read and staging tokens
request at most 120 seconds. Remaining hold time can shorten those requests.
The provider returns the recorded expiry. Private SQL custody accepts a judged
live mint and never journals plaintext. Credential handoff requires the
preparing key, actual holder, current held instance, and selected fork with
matching ID and name. It clears plaintext before its one-time return. Expired
or ineligible custody is not returned. Unknown provider revocation is not
completion.

Stage copies the selected fork's bounded closure into the room staged ref with
separate scoped read and internal write credentials, then confirms that exact
ref. Publication retains the Destination's checks and push path. The performer
receives no room write credential. Child-concern and GitHub workspaces,
automatic deletion at hold end, and unknown-fork sweeping remain outside J4.

### Closed repair captures and the production branch fix

The producer `/private/tmp/artroom-j4-review-repair-evidence-20261030` retains
25 closed focused captures across the original index and supplement. Each keeps
its command, source index, streams, receipt, and clean guards. Paired controls
pass only when ordinary assertions distinguish the controlled change and source
is restored. They do not pass the changed source.

At `53a7f211b83ebdf406c0deba3674a3dc33d77841`, scope-pool preparation closes
0/0 and security-owner-1 passes ten cases. The first credential test compiler
fails because its fixture assigns null where FieldValue excludes it. At
`9a23e92b7a5a0e00f9e83c892ba765a7de825852`, the corrected compiler passes and
workspace-credential-owner-1 passes all three cases against the real
WorkspaceHost and SQL custody. The preparing-key control's unchanged baseline
passes three. Removing the checks causes the named wrong-key assertion to fail
while the other two pass, and the control restores source. The wrapper
therefore closes 0/0. This is no provider-enforcement proof.

At cleanup source `497b1604825b2196f562b6a592f4f09323b2d5f8`, the Scope test
compiler passes, the security owner passes ten, the derive file passes five,
and the three host files pass nine cases. These runs precede the later
production branch fix. The native test compiler passes at its five recorded
checkpoints. It neither executes tests nor generates Page output.

Native cleanup owners 1 through 5 all fail three cases and remain failed. Owner
1 observes retry rather than the expected recorded answer. Owner 2 observes an
unavailable offer. Owners 3 through 5 exceed the finite observation bound. The
intervening fixture and diagnostic changes do not turn those captures into
passes.

Owner 5 exposes a production defect: the authenticated branch is stored as
main, but WorkspaceHost passes that bare name to branchRef, which requires
refs/heads/main. The fix at `17c14b118ecf3274109727882908bb0b09a69383` adds the
prefix at both head and check reads and updates its security seal. The three
tests stay unchanged. Native owner 6 then passes all three with clean source
guards. Its receipt SHA-256 is
`f6a7dd5dcc96fe40b6885ed6784c593dad36d3a3214909fb7584f281f0170b2e`. This is a
host fix, not a relaxation of the witness or a native rule change.

The lane genesis, acts, outcomes, ledger, and SQL are native. Ancestors,
authority, clock, provider, and Git packets are stand-ins. This proves no real
Membership, Directory, provider, or physical drain. Its three cases show an
open native revoke with held plaintext after an unanswered provider revoke,
later confirmed cleanup, a refused attempt with no custody, and late unselected
confirmation owing both deletion and revoke.

The revoke control at that same source first passes the unchanged three cases.
Removing the setup revoke opening then causes two ordinary invariant assertions
to fail: the orphan setup credential has no native revocation operation, and
the late unselected answer opens deletion without revoke. The refusal case
still passes. The control restores the source and closes 0/0. Final Scope test
compilation and the ten-case security owner also pass at that exact head.
Neither compiler run generates Page output.

Page generation runs separately at `5dc988c853123edfb1cc5f38c402241231ebd044`
through `npm run build --workspace @generalbusiness/dap-page`. Its receipt
records exit 0, direct-child closure, group absence, and only assets.ts
changing. The output grows from 1,204,952 to 1,205,748 bytes, with SHA-256
`310205a14477933b9b69bb32a6e28d20147421e12760cece9c018eba6833174d`. The gate
retains it at `r/gate-final-repair-1/source/apps/room/page/assets.ts`. At
`fa529b41ca9d531b7168ea6ed8d7a8bad8926f96`, its owning asset case passes. The
later WorkspaceHost-only branch fix does not enter the Page bundle. The passing
final gate includes the committed asset's owner.

The provider dry-info run observes only existing room-b information in dap-demo
through Wrangler 4.147.0. The managed Wrangler dev child exits 143 during
SIGTERM cleanup; both outer and channel commands exit 0. Group absence and
natural pipe closure are observed. Only the public receipt and channel-result
projection enter the evidence. The run creates no fork or token, writes or
deploys nothing, and proves no live J4 completion, new Native authority, or
physical drain. Private streams and custody stay out.

## Historical observations and debug qualifications

The first pure judge attempt includes an inconclusive fork setup. The corrected
judge case passes separately. Census observed only 11, 11, and eight registered
rows, without a complete legacy negative. Health version IDs do not
authenticate Git source.

The original room's accepted sequence-7 founding survives its early wait and
later pre-seat Membership refusal. The sixteen-minute legacy Register test is
not that exact Membership case and proves no universal packet impossibility.
The planner's fresh-room create, activation, and readbacks close 0 in one
session. Its actual namespace is dap-demo, correcting the old artroom-demo
designation. Deployed source is planner-attested. Register17 is an inferred
inverse pin in that observation, not an independently authenticated Register
definition.

The offline generator reproduces observed commit
`29c702da13a1805b22a04adeee2a19db411cc9ed` and tree
`c9c0383248ddfdd0289bc101bd0206d1c3d88deb`. This is DERIVED provenance from the
unchanged public head projection. Its sequence-10 claim is projected, not
independently settled. It establishes no provider object or ref read.

The baseline hosted staging witness satisfies the required ordering before
extension. Its actual lane is
`sc_5q66w72ggsq5sp73p5vghop57h6utz4cgg75niey2kff252bho7q`, incarnation
`in_e4zs4j3vyuvb3unek7o627jyga`. The sequence-5 instance has epoch 1 and uses
that lane ScopeRef as the Task stand-in under ruling 70d1c9ab. It claims no
native Task or export. A future Task needs a new instance and a past
transition, rather than rewriting these records.

The sequence-6 preparation establishes root 1. Stage operation 6:0 has an
attempt bound of three. Mints 6:1 and 6:2 each have a bound of one. These are
bounds rather than actual counts. No outcome appears through head 6 in the
observation window. Stage remains pending. Joined logical Fetch and body tasks
prove no provider send, refusal, unsent status, physical cancellation, or
drain.

The table keeps every debug failure and later pass. D01 uses local {k:0} where
the fixture expects a numbered string; D02 passes separately. D03's
foreign-fact assertion fails before D04 passes. Each pair keeps unchanged
production bytes while its test changes. D12 fails on localhost EPERM before
D13 passes. D28 and D33 retain their type errors despite later compiler passes.

Native debug D37 fails setup with EPERM and no case summary. D38 fails its
Rules-policy assertion. D39 passes after the fixture supplies first extents.
Its real Scope, Membership, Rules, and Destination records cover two holds,
distinct selected forks, lane-kind instances, revoke, and chosen-manifest
publication. The fixture uses person members with role agent. This establishes
no controlled agent-kind proof. Provider replies, credentials, and Git walking
are stand-ins, so this is no live adapter enforcement result.

The gate at implementation C closes 1/1 with clean unchanged source. Prechecks,
typecheck, and kernel pass. Node reports 78 passes and two security-seal
failures. The expected parser seal is
`54cd1a42de7dc10191191a46a03326ee8c7ecd5ee3afed596bdace1e37fc5d00`; the actual
seal is `b13c0ec0476fbbf1155d85eeaecedf1f9917cb9063078955cfe11712bd15015d`.
Counting, Plain, and Native remain unreached. The seal follow-up at E passes
its security owner ten cases. The original gate stays failed.

The separate continuation at E also closes 1/1. Counting passes 56 cases. Plain
reports 3,144 passes, one failure, and one skip across 329 files. Native
remains unreached. Only the Page asset assertion fails. Its committed module
has 1,187,777 bytes and SHA-256
`553d0303a89d30dc57b526691075bdff9dde7c89c8d6414e15b6f988e8a636ad`. The
maintained build expects 1,204,952 bytes and SHA-256
`a859bd6bf1af271585fb17179e3f182a53a25c9a88bd0d2dc5db8cb9653c3b67`. The Page
imports capability code, so this source change requires regeneration.

The recorded F03 build runs `npm run build --workspace
@generalbusiness/dap-page`. It exits 0 and changes only assets.ts, producing
those expected bytes. The output lands at checkpoint A, where the asset owner
and full compiler pass. Ruling `1d0ffcab14471eaffb59da72baaff2b0cc298094`
requires a new full gate because generated production output falls outside the
isolated-test exception. The later page-regeneration-final-1 capture at F
reproduces the committed output under clean source guards. Generation alone is
no gate pass.

The full gate at F closes 1/1 with clean unchanged guards, no timeout, and no
dropped bytes. The table retains its wall and host CPU measurements.
Installation skips against the verified lock stamp. Prechecks, typecheck,
kernel, Node 80, and Counting 56 pass. Plain reports 3,145 passes and one skip.
Native reports 244 passed files and one skipped file, with 853 passed cases and
two skipped cases. An unhandled RPC EnvironmentTeardownError closes resolve
while pending. Native therefore fails and its terminal evidence is partial.
Vitest's attribution to join-version.scope.test.ts does not prove that file
caused or threw the error. Case counts establish no aggregate gate pass.

The unchanged-F diagnostic closes 0/0 and prints two passed cases, then the
same uncaught teardown error. Its zero exit does not make it a clean result or
successful repair. Its row remains separate from the later repair.

Only apps/room/page/test/join-version.scope.test.ts changes from F to R. The
adopted index records a computed immutable Git diff of 3,854 bytes, with
SHA-256 `3b7634c3649444ee78e4f5a4df728ef3aac03a7bcb99bc40e6ce21357230686f`.
This cites computed metadata, not a retained diff file. The repaired test has
6,193 bytes and SHA-256
`a97916c1e3fd3923de8ac87125f6d1c81e8d3a7ed3ec9c0a3e2c38f9b11dfb60`. Its two
cases, assertions, and deadlines stay intact. Production, dependencies,
configuration, and shared fixtures do not change. No other test imports it.
Independent exact-diff review reports PASS as source review, not runtime proof.

The test had restored settings through synchronous life.release() without
joining scheduled callbacks, and omitted the two created Inboxes from its
tracked handles. The repair uses external lifetime ownership, discovers those
actual Inboxes from Membership history, and joins bounded callbacks before
release. Failed setup or join keeps ownership. Production uses neither this
test-owned lifetime nor Vitest's resolver. The precise callback that triggered
the RPC error remains unknown.

At R, the compiler and whole two-case file close 0/0 with clean source guards.
Neither stream contains the teardown error, and stderr is empty. The clean
follow-ups support this bounded repair, not physical drain or a retroactive
full-gate pass. Ruling `458166daf08ebd3d36d56c81604ffd182329bc0d` accepts that
isolated repair with the failed F gate. It requires no further gate for that
test-only change. The new checker-requested production repair falls outside
that exception and needs another full gate.

## Evidence

The new repair collection is
`/Users/hughpyle/play/artroom-evidence/2026-10-30-j4-review-repair`.
The sealed historical collection is
`/Users/hughpyle/play/artroom-evidence/2026-10-30-j4-workspaces-source`. It has
1,471 files and 98,061,085 bytes. Its existing root SHA256SUMS has 196,996
bytes and SHA-256
`375a2d0078400d4c418c817f741ee08712b0238001fe945e7be04742911fc936`. No
historical subdirectory has its own listed SHA256SUMS. The new collection binds
this old root once and keeps it unchanged.

The copy plan selects 317 old files, 4,034,704 bytes. Source verification in
`n/citation-readback.json` checks their sizes, hashes, nonlink status, and
read-only modes. It created no copies or seal. Package verification checks the
destinations in the separate repair collection.

Ruling `4e199bd8cf50191b892fc2372afb13d1d5f0aa05` requires cited file rows and
one binding for each whole cited collection. The copy map preserves original
relative paths, sizes, and hashes. Internal index dependencies are not
automatically direct citations. The old adopted note stays historical.

The adopted index is `adopted/public-input-index.json`, 158,115 bytes, SHA-256
`e5db0688911d458ae56727528fffc0867475d8f398728422a8848d1aca06b657`. It maps
sixteen original public roots and pins source snapshots, ten follow-ups, and
Page repair metadata. Its runner binding covers 27 copied files and 50,920,138
bytes, with digest
`4429821baaa6f0fd6860ef0a26015085a83576748fe3e7595199617f75b2a4a3`. This is
retained evidence, not another run or physical-drain proof.

The final index is `n/index.json`, 37,748 bytes, SHA-256
`241a0a10a9e291d6857f184f5146301887f6919a48a15545e440bd2a498b35cb`. It binds
closed captures, gate evidence, reviewed programs, Page generation, provider
metadata, and host observations. It excludes this note and the new seal. Base
and focused supplements are `n/focused-base.json` and
`n/focused-supplement.json`. The final note is `n/note.md`. `n/old-map.json`
resolves the 317 historical aliases to original paths.

All 74 attempt rows below remain unchanged. Their compact keys locate files:

- RAW means the old root. P means its producer directory. W names the old
  execution checkout, not evidence storage. C(L) means the producer capture's
  command.json for label L, with every original argument and environment.
- I means the adopted index. In a debug row, I.argv, I.stdout, I.stderr,
  I.output, and I.record locate that record's command, streams, and receipt.
  U means an unrecorded deadline. E in a stream cell means zero bytes with
  SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
  Source checkpoint E has a separate meaning fixed by its column.
- Program keys J1, J2, CTX(n), PROBE(n), and TREE(n) resolve through the
  index's retentionMapping.programAliases. Each row supplies the exact
  retained program path and source binding. The citation inventory and copy
  map preserve that resolution without following original scratch paths.

Each program unit retains its source binding. JUDGE, CENSUS, HEALTH, CHECK,
AST, GENERATE, and HOST identify the recorded command kinds. The first 23
formal rows use the baseline. D01–D40 are mutable debug or generation runs, not
clean final-head checks. F03 intentionally generates source. Only each run's
recorded guards apply. Unknown CPU, closure, or source state remains unknown.
No total of these timings describes one measured pipeline.

Formal exit pairs give command then capture exit. Debug rows give one exit.
Formal wall time includes post-guards and host CPU includes collector Git
children, not unknown guest CPU. The inputs establish no controlled load or
cache result. The collector's SHA-256 is
`3de7e83a5376d9d7897d911f4373949d1be1e82bc62cf0981074424d83e52bed`. Its limits
are 40,000 files, 2 GiB total, and 128 MiB for snapshots and each stream. The
historical gate timeout is 7,200 seconds. Health bounds are four-second
connect, eight-second transfer, 65,536 response bytes, and no redirects. Judge
uses one worker and ten-second cases. Hosted staging bounds are 180 seconds, 96
requests, 1 MiB per response, 8 MiB total, 8,192 chunks, sixteen pages, 512
entries, and twelve polls. Its eight-second abort and five-second logical join
prove no physical drain. U marks unknown deadlines.

| Capture or debug ID | Command record/index | Outcome; exits | Deadline s | Wall; host CPU s | Stdout or merged reference | Stderr reference | Receipt digest or indexed record |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dependency-setup-1` | npm ci | SETUP 0/0; npm warnings | 600 | 2.127466833; 2.917470 | 270; `242bf16ca621fb2d804b21dba33abde81f94e4583ad41bb524d57552c08830ec` | 533; `50add94063c86dd023413e8f3b7675c71eaeede581ec7c89e78d48e9a74c568f` | `f27e14eb3a2f9fd0a432d74c3a68e1c59794e0bf56a6d130152028c6fc4090bc` |
| `pre-extension-judge-1` | JUDGE(J1) | FAIL 1/1; 1 pass, 1 setup fail; fork INCONCLUSIVE | 60 | 0.897175500; 0.920194 | 474; `55fc45efc88e0310bda399d99aa9a105216e95f01fc9866e466d7d1036a70a1b` | 1087; `704fdb353b4e0ca62756717ffc2855ef2ae3895ee53658631ac45f29e16302ea` | `4ad7bcceb8bad775e230073c8718886c3b1531baba275a7f8f4fb2452f80f8e3` |
| `pre-extension-judge-2` | JUDGE(J2) | PASS 0/0; 2 pure judge cases | 60 | 0.550429792; 0.849445 | 2209; `d43b6124087fa2ff3ee3abe14546b6565cf34208c39fb34380f0ba70707e76c2` | E | `96f8d9d033a72eb98ae12a193e3be9f9abe08a155f0238cfa9a421d3fbb65559` |
| `census-grow-1` | CENSUS(grow) | OBSERVED 0/0; registered 11, one page | 60 | 1.505017167; 1.565007 | 140; `98d2b2f5529ae81401a08c6c28ce80d3064cb54d7751d916f9eeeab4a6a788f2` | E | `2381047f618ce050728f0e839d302041d94892ad7a4c6a484772d28169392bd6` |
| `census-demo-1` | CENSUS(demo) | OBSERVED 0/0; registered 11, one page | 60 | 1.639062250; 0.884919 | 140; `b7d5c67102b01b4b7725ef6d4eecdac58e1f551c14e1a225835f59ddd1251601` | E | `fe304b26866227e33f7d682e307f62decdb0f71d0f9322eeeb7a4e3de69f3c9d` |
| `census-lending-1` | CENSUS(lending) | OBSERVED 0/0; registered 8, one page | 60 | 1.770873209; 0.905342 | 139; `663319177c3b8015304596b3c50c46505f4db86fcba5f23451d88348a260fa45` | E | `67e166b2b28c9e89f120216cbd9b8dc78861469a6e419d4ba5601f70a8515910` |
| `health-grow-1` | HEALTH(grow) | OBSERVED 0/0; HTTP 200 | 30 | 1.183100167; 0.186152 | 16; `d7638f0945966bbc61e8e0aeae080b3fb4a9d3912f834f390596dc64c395d656` | E | `cc8075082963607d6d0b09e48b9ab82d5577a4f0bf32a965b105a11ba54954c1` |
| `health-demo-1` | HEALTH(demo) | OBSERVED 0/0; HTTP 200 | 30 | 0.626590542; 0.176299 | 16; `d7638f0945966bbc61e8e0aeae080b3fb4a9d3912f834f390596dc64c395d656` | E | `ddb090fa809734854f00e6e30090702cd0b9e6369d70b4e85aa24324dc77ce6c` |
| `health-lending-1` | HEALTH(lending) | OBSERVED 0/0; HTTP 200 | 30 | 0.695811917; 0.173187 | 16; `d7638f0945966bbc61e8e0aeae080b3fb4a9d3912f834f390596dc64c395d656` | E | `1ceaaa4f8277954fdb22072fb61af70407d1d57d3d962db045b2828016949521` |
| `probe-syntax-1` | CHECK(PROBE(2)) | SYNTAX 0/0 | 30 | 0.099350958; 0.214190 | E | E | `00b1fa7867555d81d590454ea1a4ad7f39397df0ce6313fe53b3c70a90378564` |
| `context-js-syntax-1` | CHECK(CTX(2)/scratch-context.mjs) | SYNTAX 0/0 | 30 | 0.103379000; 0.230794 | E | E | `63c539ff5ad0a05e87a910b6419b4c30ef3e77830a87cde8754c81df2cd08cad` |
| `context-python-syntax-1` | AST(CTX(2)/run-once.py) | SYNTAX 0/0 | 30 | 0.055299875; 0.182572 | 52; `1a1190aae6b92305c1b6dd1412017b34c1f5dba136a6b0fbb88f748f7555c58b` | E | `71d1d30c7ee8c8ee346122f2d8e8805ed41a6bdeaba10817dc8beb97ca97c30e` |
| `context-v3-js-syntax-1` | CHECK(CTX(3)/scratch-context.mjs) | SYNTAX 0/0 | 30 | 0.103983917; 0.258451 | E | E | `1e762378c87fa97275d35eb60ba22edb835492cfd1ceef6aac514eec88f7945b` |
| `context-v3-python-syntax-1` | AST(CTX(3)/run-once.py) | SYNTAX 0/0 | 30 | 0.056265542; 0.210973 | 52; `1a1190aae6b92305c1b6dd1412017b34c1f5dba136a6b0fbb88f748f7555c58b` | E | `08072bf041d035276ffb443ac2c311cac851c132d1db0e3325b6358fd087103f` |
| `probe-v3-syntax-1` | CHECK(PROBE(3)) | SYNTAX 0/0 | 30 | 0.099418000; 0.218244 | E | E | `397c33972f935604ddc5c18589e10afd68168acaadbf757307895fd8b1c35527` |
| `candidate-tree-syntax-1` | CHECK(TREE(1)) | SYNTAX 0/0 | 30 | 0.100309417; 0.216624 | E | E | `a98d5dbf37bd4a616feca615e35745a163506fab9dc9ec3c24035b04f0ca801b` |
| `context-v4-js-syntax-1` | CHECK(CTX(4)/scratch-context.mjs) | SYNTAX 0/0 | 30 | 0.112001375; 0.273029 | E | E | `1bdc6c4f4c09b902f2cfe12cee7ec4903488492d38da7ce21ab6662ed2ce88f9` |
| `context-v4-python-syntax-1` | AST(CTX(4)/run-once.py) | SYNTAX 0/0 | 30 | 0.062437000; 0.223181 | 52; `1a1190aae6b92305c1b6dd1412017b34c1f5dba136a6b0fbb88f748f7555c58b` | E | `421dc02a88eb3d78cfd23c8b2467c903378a4ebb775782b92a40f0d44ff46f9f` |
| `candidate-tree-v2-syntax-1` | CHECK(TREE(2)) | SYNTAX 0/0 | 30 | 0.099225792; 0.219380 | E | E | `4e98df84e519789f855fe9d54415f6e572b64876e4195c6f404e678cabaf21cd` |
| `candidate-tree-v3-syntax-1` | CHECK(TREE(3)) | SYNTAX 0/0 | 30 | 0.105300125; 0.227043 | E | E | `43a3aa16dd6bbf3fd95080007a8d9d1649eda1a17414a08be9680e7ddaebebde` |
| `candidate-tree-derive-1` | GENERATE(TREE(3)) | AVAILABLE 0/0; offline SDK; DEP0205 | 30 | 0.542744708; 0.686386 | 137; `a23c30d2c95f18696c5f6a4d6d4601d84b4074bf9be02206cb70cf40e93464b3` | 190; `d48a7f5bbf5995039d7a15fc96228d79ff2d6c248d187dc8f600997101b4531c` | `4d2661602d7f40813d35dc99536c91e8a1eb8f711b3d52e34b6d22e7e83f6cc7` |
| `hosted-first-staging-setup-b-1` | HOST(setup) | OBSERVED 0/0; setup, no stage sent | 240 | 8.111404792; 0.815528 | 8980; `363b253a7c7843dc8b8f8c7ec717f87b1d8ab6802044a62926f95835e8e309f2` | 191; `f0a0d0e84652b24370a968122efc4ff7a19019d640248d00fc672c5cd096e4ea` | `cfc42b90f616f0430ef5694c35d9ee9efe55d1afabacbd66513df6f5ace40ba8` |
| `hosted-first-staging-stage-b-1` | HOST(stage) | PENDING 0/0; no outcome; no acceptance | 240 | 16.240012125; 0.838722 | 6606; `2e89037a385c075a7b9a4844c2ed887353bb287cd17aa0e48532d3854090a63a` | 191; `9a35751a989297781b433c5d5446f0b1878be0530e68025d7b36a02f69f7d5ac` | `78b2185d2dad15a72628b074bebd9fde8df6c218ac759cfc316612ee785f9ac6` |
| `D01` hold2 + records | I.argv | DEBUG exit 1; 1 failed; 8 passed (9) | U | 0.704486416; unknown | I.stdout | I.stderr | I.record |
| `D02` hold2 owner | I.argv | DEBUG exit 0; 5 passed (5) | U | 0.527102125; unknown | I.stdout | E | I.record |
| `D03` dispatch owner | I.argv | DEBUG exit 1; 1 failed; 2 passed (3) | U | 0.570214708; unknown | I.stdout | I.stderr | I.record |
| `D04` dispatch owner | I.argv | DEBUG exit 0; 3 passed (3) | U | 0.540088709; unknown | I.stdout | E | I.record |
| `D05` contract types | I.argv | DEBUG exit 0 | U | 0.321014208; 0.163850 | E | E | I.record |
| `D06` floor owner | I.argv | DEBUG exit 0; 4 passed (4) | U | 1.004311375; 1.278275 | I.stdout | E | I.record |
| `D07` kernel boundary | I.argv | DEBUG exit 0; 126 sources, 0 refusals | U | 0.315755667; 0.289877 | I.stdout | E | I.record |
| `D08` derive owners | I.argv | DEBUG exit 0; 18 passed (18) | U | 1.151584666; 2.456956 | I.stdout | E | I.record |
| `D09` derive production | I.argv | DEBUG exit 0 | U | 0.381094792; 0.492737 | E | E | I.record |
| `D10` derive test types | I.argv | DEBUG exit 0 | U | 0.597123750; 1.959104 | E | E | I.record |
| `D11` derive test types | I.argv | DEBUG exit 0 | U | 0.415940500; 1.995444 | E | E | I.record |
| `D12` dispatcher readiness | I.argv | DEBUG exit 1; setup EPERM; no case summary | U | 1.285395875; 1.674238 | I.stdout | I.stderr | I.record |
| `D13` dispatcher readiness | I.argv | DEBUG exit 0; 2 passed (2) | U | 5.230023958; 6.318810 | I.stdout | E | I.record |
| `D14` lane definitions | I.argv | DEBUG exit 0; 6 passed (6) | U | 1.412125833; 1.987960 | I.stdout | E | I.record |
| `D15` lanes production | I.argv | DEBUG exit 0 | U | 0.365663083; 0.473194 | E | E | I.record |
| `D16` lanes scope types | I.argv | DEBUG exit 0 | U | 0.665816875; 2.911131 | E | E | I.record |
| `D17` lanes test types | I.argv | DEBUG exit 0 | U | 0.491779250; 1.871660 | E | E | I.record |
| `D18` scope production | I.argv | DEBUG exit 0 | U | 0.368225834; 1.504180 | E | E | I.record |
| `D19` Artifacts owner | I.argv | DEBUG exit 0; 5 passed (5) | U | 3.862358875; unknown | I.stdout | E | I.record |
| `D20` Git host owner | I.argv | DEBUG exit 0; 5 passed (5) | U | 0.719795834; unknown | I.stdout | E | I.record |
| `D21` Git production | I.argv | DEBUG exit 0 | U | 0.196178709; unknown | E | E | I.record |
| `D22` Git test types | I.argv | DEBUG exit 0 | U | 0.311376292; unknown | E | E | I.record |
| `D23` Scope owners | I.argv | DEBUG exit 0; 20 passed (20) | U | 5.099977875; unknown | I.stdout | E | I.record |
| `D24` Scope production | I.argv | DEBUG exit 0 | U | 0.418098292; unknown | E | E | I.record |
| `D25` Scope production | I.argv | DEBUG exit 0 | U | 0.406785625; unknown | E | E | I.record |
| `D26` Scope production | I.argv | DEBUG exit 0 | U | 0.418529584; unknown | E | E | I.record |
| `D27` Scope production | I.argv | DEBUG exit 0 | U | 0.422806833; unknown | E | E | I.record |
| `D28` Scope test types | I.argv | DEBUG exit 1; fixture type error | U | 0.774742959; unknown | I.stdout | E | I.record |
| `D29` Scope test types | I.argv | DEBUG exit 0 | U | 0.781389625; unknown | E | E | I.record |
| `D30` Scope test types | I.argv | DEBUG exit 0 | U | 0.778397375; unknown | E | E | I.record |
| `D31` Scope test types | I.argv | DEBUG exit 0 | U | 0.766951000; unknown | E | E | I.record |
| `D32` Scope test types | I.argv | DEBUG exit 0 | U | 0.828957208; unknown | E | E | I.record |
| `D33` Scope production | I.argv | DEBUG exit 1; integration type errors | U | 0.775236209; unknown | I.stdout | E | I.record |
| `D34` Scope production | I.argv | DEBUG exit 0 | U | 0.369574084; unknown | E | E | I.record |
| `D35` lineage owner | I.argv | DEBUG exit 0; 3 passed (3) | U | 4.738470125; unknown | I.stdout | E | I.record |
| `D36` lineage owner | I.argv | DEBUG exit 0; 4 passed (4) | U | 4.941513167; unknown | I.stdout | E | I.record |
| `D37` Native room v1 | I.argv | DEBUG exit 1; setup EPERM; no case summary | U | 0.597202063; 0.743810 | merged I.output | not separate | I.record |
| `D38` Native room v2 | I.argv | DEBUG exit 1; 0 pass, 1 fail | U | 3.232926130; 3.913521 | merged I.output | not separate | I.record |
| `D39` Native room v3 | I.argv | DEBUG exit 0; 1 pass, 0 fail | U | 3.967417002; 4.728081 | merged I.output | not separate | I.record |
| `D40` J4 pin generator | I.argv | SOURCE GENERATION exit 0 | U | 0.132178068; 0.185249 | merged I.output | not separate | I.record |
| `gate-source-1`; C | npm run gate; C(L) | FAIL 1/1; Node 78 pass, 2 seal failures; later stages unreached | 7200 | 78.684697583; 140.998645 | 8144; `bbc24a2a53f8ddd467a19fc4dda17606de00b4005875bbf1f8d3baf9c16405bc` | E | `94a7a21bf20294143126b17c4e6bb1e689335f18f4219162d79fe49b500f7c3f` |
| `gate-security-followup-1`; E | node --test security owner; C(L) | PASS 0/0; security owner 10/10 | 180 | 2.553055875; 3.216499 | 1302; `e5d360a44819ca1f8be719ee13c1eb71734eaa1a9ea54da8b9b2985175952454` | E | `1f636254a1f370e6016d747d2abf92abaf3edea053ea49e94367c98163777d69` |
| `gate-unreached-followup-1`; E | run-unreached.mjs; C(L) | FAIL 1/1; Counting 56; Plain 3144 pass, 1 fail, 1 skip; Native unreached | 7200 | 64.915325375; 241.023055 | 492269; `067196e8a1c4ad5f4ef176a5fead2a46e7523fe8a8ab3be566fd119b2dc35483` | 1201; `7b3ba37242683a7189c1e9525e89d04e7f481fed18bde40a52d4f97b5da972ff` | `118eb9e7bcb9749be0dbc71ddf2e1050e14a4813fa892559152452c8ca1b1404` |
| `F03` Page build | I.argv | SOURCE GENERATION exit 0; only assets.ts changed | U | 0.333593667; 0.214773 | I.stdout | E | I.record |
| `page-asset-owner-followup-1`; A | Vitest Page asset owner; C(L) | PASS 0/0; Page asset owner 1 case | 180 | 0.747079458; 1.331248 | 257; `5c49e1038124af93c597e0c13d5ea198a2a9ca6faf4fff68412ccce600e05201` | E | `343058ce9862e41d06f5a6bd42f5b2e34e671561d259135500c61b5208ec0cbc` |
| `page-asset-typecheck-followup-1`; A | npm run typecheck; C(L) | PASS 0/0; full typecheck | 600 | 11.307177792; 46.336864 | 1987; `62170bbe0cd055cff4699debd9470a886c0f98f328e7c9517d899c021a3788d0` | E | `34e79b2d3f742f76e8c1be421b37b606f240f745187778ce0da66409f4f1b49e` |
| `page-regeneration-final-1`; F | npm run build --workspace @generalbusiness/dap-page; C(L) | SOURCE GENERATION 0/0; reproduced committed asset | 180 | 0.309797792; 0.344762 | 214; `c8e9918af96c2ecec3c417d2a07c845e6849215f3e968d71e8acd13b6957c4da` | E | `e61e037a1b48d20621960993f86bf5249ee37864ad1b66b172d9c7d16ea1f4dd` |
| `gate-final-1`; F | npm run gate; C(L) | FAIL 1/1; Node 80, Counting 56, Plain 3145 pass/1 skip; Native 853 pass/2 skip, 1 unhandled error | 7200 | 1298.392491500; 2666.825785 | 8601; `2d6cbe4fa72ed4288d6ba71f2293995551b174f320c67183a058a0356f211835` | E | `e721ddfaea3a418dc4f25da937628da487a3d017e36d014a9dec63113d1dc7bf` |
| `page-join-teardown-diagnostic-1`; F | Vitest native join-version; C(L) | DIAGNOSTIC 0/0; 2 cases pass; same uncaught error after summary | 180 | 5.486361500; 6.863420 | 1483; `3ed52aa7d94a0f1dc2aa7762614275dd0e89f1e32809470e00cac0cfbdb07444` | E | `1097635b07579e83d3418c3d7174e897c248918f5d85daf1f5bc9b957be46bf3` |
| `page-join-types-followup-1`; R | tsc Page scope; C(L) | PASS 0/0; changed Page scope compiler | 180 | 0.525856500; 2.417195 | E | E | `88fcc43df72d65d04d9113b3d07d33b5708a0366dcd2139324fdf961640c023c` |
| `page-join-owner-followup-1`; R | Vitest native join-version; C(L) | PASS 0/0; whole owner 2 cases; no captured teardown error | 180 | 5.264865166; 6.801055 | 260; `373a283edaf20b933cf7ad168951f7ae29fcc82eae8f50101ed3f4e5b7d2ee6a` | E | `74d0d56960a27801782824ccc0846bdcad12a0a9ce456cadc9e39183db16e814` |

## Final repair gate

The full gate at `17c14b118ecf3274109727882908bb0b09a69383`, tree
`58526e56594dc5b1aaa736d2df5df94fd142aafb`, passes with complete 0/0 capture
and clean unchanged source guards. Stdout contains 6,377 bytes, stderr is
empty, and neither stream drops bytes. There is no timeout or unhandled
teardown error. All prechecks exit 0. The old 326,560-byte manifest still
produces one advisory; the citation-only recut addresses its form. Kernel
passes. Node passes 80 cases, Counting 56, Plain 3,145 with one skip, and
Native 859 with two skips. Plain has 329 passed files. Native has 246 passed
files and one skipped file. No stage remains unreached.

`r/gate-final-repair-1/command.json`, `source-index.json`, `receipt.json`,
`stdout.log`, and `stderr.log` retain the actual outer capture. The inner stage
record is `g/test-evidence/stages.json`, and `g/test.log` retains the terminal
counts. The index binds all 27 inner files, totalling 50,890,135 bytes. Its
receipt has SHA-256
`e67f0aa72a10e70b06a0f2ecfcdedb93a599f9cfef60a3f722b2caf4882d84f0`.

Elapsed time is 1,045.522246917 seconds. Collector wall time is 1,045.667600208
seconds. Host child CPU is 2,214.762076 seconds, including 2,214.623919
command-only seconds. Guest CPU is unknown. Timing retains 72 unknown or suite
observations, zero contradictory records, and partial Scope timing. The pass
establishes no complete timing or physical drain.

The host is Mac17,7, 18 physical CPUs, 64 GiB RAM, macOS 27.2 arm64, Node
26.13.0, and npm 11.20.0. Load 3.41, 3.19, and 2.35 was observed at 14:29:46
UTC during the gate. Initial sandbox sysctl probes were refused; the elevated
follow-up succeeded. Earlier focused tests mean caches were not cold. Exact
cache state remains unknown. The index binds both host observations. This is
cost context, not a controlled benchmark.

## Open limits and owning request

Ruling `241248a9df92998e89fa57e6a50bfab6c3a5c854` requires source review and
landing before the planner deploys all three Workers from landed Main and runs
live J4. Request `0c3091fa54f38d3709dcb7a741d6754c420ad10c` and promise
`710449ccd016033f1a6b40da348060ad7fe64c4a` close on source landing under
workroom rules. Their closure does not establish live acceptance. A live defect
becomes a child request.

The full gate and focused native cleanup, control, compiler, and security
checks pass at the branch fix. Page generation and its owner pass at their
recorded earlier checkpoints. Replacement exact-head review remains pending.
Earlier failed native attempts and gates keep their original results.

Live J4 requires two holders pushing to separate real forks, an old token
refused after hold end, and publication from the chosen fork. The local
scenario uses person members with role agent and provider, credential, and Git
stand-ins. It establishes no controlled agent-kind proof. The lane remains the
Task stand-in. The baseline preparation still has no observed outcome.

Ruling `e7962aa7693d19410b7554503633e850e4b9c3cd` assigns setup cleanup to hold
version 2's existing token and revoke rules. Its live timeout control applies
only if the provider offers a way to force it. Otherwise the scope witness
supplies that control and the final note must say so. No live provider fault
injection has occurred in this draft. The ruling commissions no change to the
separate temporary read-token helper convention.

Keep both evidence collections read-only after their last writes, for at least
30 days after landing. Later removal needs a planner act naming the manifest.
Private homes, vaults, keys, sessions, credentials, and original hosted request
bodies stay outside public retention. Historical metadata paths grant no
permission to follow or copy them. After successful package readback, the
selected files reside in the new retained collection. The old collection stays
unchanged. The separately committed citation manifest supplies actual counts,
bytes, seal digests, and the tested checkpoint. The reporting Source records
the documentation-only review delta. The manifest lives outside the retained root.
