# J4 workspace holds: source readiness

## What changed

Request `0c3091fa54f38d3709dcb7a741d6754c420ad10c` and promise
`710449ccd016033f1a6b40da348060ad7fe64c4a` own this work.
Source C is `40230449b25f3f8ad970de33c9d184c4013b182a`, tree
`6942d426f2acaee8cdbfc2471708a368a0999b52`.
Its diff from BASE S, `31780874d5b1e3f6e5e817e75e6eb7e55765c956`, tree
`b12bc5501a24f0f947a7070ee4c71aef3edeeb6c`, changes 49 paths with
2,597 additions and 940 removals. The adopted index pins those committed bytes.

C implements the explicit `hold@2` family, J4 lane profiles and Cloudflare Artifacts
workspace adapter. Historical `hold@1` lanes retain their rules.
It migrates no earlier room and enrolls no archive or G17 host.
The production source/doc checkpoint F is
`9d775412bae3eba9b7350a3c4b2daba76e735e08`, tree
`43a4c7587c44d3c0ec51a9508d8d4c6dc9270eb0`.
Its diff from S changes 52 paths, with 2,626 additions and 949 removals plus
the generated Page module. C's kernel and adapter source remain unchanged;
follow-ups adopt reviewed seals, regenerate Page output and explain both.
The C source gate, E unreached-stage follow-up and F full gate all remain
failed. The unchanged-F diagnostic also retains an uncaught teardown error.
The isolated R repair passes its compiler and owner. Ruling 458166da accepts
those follow-ups with the failed F gate under the isolated-test exception.
Exact-head source-readiness review remains pending; live J4 acceptance
remains open after source landing and deployment.

## Implemented behavior and decisions

### Versioned kernel rules

`packages/contract/src/capability.ts` declares the second hold version with the
existing forms and record states. `hold.ts` builds separate owner families.
Public helpers retain the v1 owner. V2 adds head and fork outcomes.
Workspace, reservation, retention and ancestry select the exact declared family.
Unsupported versions acquire no workspace authority.

A confirmed v2 head answer binds a commit to the fork seed while the actual
hold remains held at epoch 1. A null head fails with no-head. A closed hold
fails with hold-closed. Fork answers carry only bounded ID/name metadata.
The ledger selects the first eligible creation. A later confirmed unselected
answer opens deletion for that immutable answer's exact ID/name. It changes
no selected or final fork record, including after retirement.
Hold end still advances the epoch, makes an instance past and opens revocation
for live tokens. It does not automatically delete the fork or sweep unknown
creations. Existing explicit retirement retains its guards.

The head rule declares at most three effects and one operation, with closure
42. Fork declares at most two effects and one operation, with closure six.
These are maxima, not observed attempts. V1 retains its rule set and maxima.
Both versions use existing forms, states and the operation ledger.

V2 carried ancestry checks require the complete authenticated FactRef and an
entry of that exact scope, incarnation, sequence and hash. The source entry
must be a confirmed `hold@2:check` outcome. A record kind or caller owner label
alone supplies no authority. The original v1 carried-check branch remains.

`docs/kernel.md` records the placement rationale under ruling adb1a6ed:
confirmed head/fork answers change the records that runtime and replay derive.
The kernel owns their meaning. The replaceable host supplies answers, not
judgments. Repository discovery, provider requests and credential custody
remain services in Scope/Git. This adds no capability name, scope kind, entry
form or byte domain, closes no K item, and grants no archive policy permission.
The registered-only census did not meet the condition for extending v1 in place.

### Explicit profiles and readiness

`issueJ4` and `changeJ4` retain the demo definitions' names and rows but select
`hold@2` with `git-read@1`. Issue also keeps explicit release-hold. Change
accepts v2 check facts for its manifest. Its publication path remains the
Destination12 path. Creation and Rules activation must choose J4_DIGESTS
explicitly. Defaults, older pins and the Destination17 evidence profile stay
outside this enrollment.

The maintained `pin.mjs --j4` mode writes only the two new definitions and
J4 digest module. Its actual generation reports 23,228 and 43,130 canonical
bytes. Issue digest is
`sha256:ff901d2e6d25794b1f3719e6786e3c5e73004f1009297dce5f72684b36ac2cc7`;
Change digest is
`sha256:e6c55417a6d686f34ee05eaa477f0dd6918c997268deb43ae735a2f1d0d3bfb7`.
Generation is not a runtime test.

The service adds `Outside.ready` before the driver's durable sent mark.
The workspace implementation parks dependent mints until the selected fork,
held state and current instance are available. An unavailable dependency leaves
that attempt recorded and unsent until a committed change permits reconsideration.
The hook performs no provider I/O or native judgment. It changes no outcome
rule or kernel eligibility. Existing Outside implementations default to ready.

### Authenticated lineage and private custody

`workspace-lineage.ts` authenticates the lane's own applied genesis, its
Directory creation send, Register birth and found claim, and Destination birth.
It checks exact scope/incarnation/source/send bindings and the pinned sibling
cohort. It obtains repository host, namespace and branch from that lineage,
not caller repository fields or mutable summaries. It uses at most five bounded
immutable reads under a five-second monotonic budget and existing proof-byte
bounds. Internal birth-by-name discovery supplies raw checked genesis metadata;
the caller still authenticates lineage. It grants no actor read authority.

`WorkspaceHost` accepts only explicit hold@2 operations on eligible lane pins.
It verifies the opening entry's hash and exact operation identity before sending.
A fork name includes lane incarnation, hold, opening and attempt, so a lost
answer can remain unknown without reusing another attempt's name.
Artifacts fork confirmation requires the exact seed commit on the branch and
confirmed revocation of the binding's initial creation credential.
Object closure reads use bounded count/bytes. Failure to prove revocation keeps
the answer unconfirmed; it does not invent cleanup success.

The host mints purpose-bound tokens for the selected fork or internal staged
ref. It rechecks hold/instance eligibility and caps token lifetime by purpose
and remaining hold time. Plaintext enters private SQL custody only after the
judged live mint. It never enters a journal. The existing credential route
checks the preparing actor and current held instance, returns only a workspace
credential for the selected fork, and clears that plaintext before return.
It does not deliver a room write credential to the performer.
Expired or ineligible custody is not returned. Confirmed provider revocation
settles the existing revoke operation; unknown revocation is not called complete.

Stage reads the selected fork with a scoped read credential and copies its
bounded closure to the room staged ref using an internal write credential.
It confirms by reading that exact ref. Check uses a bounded staged-ref snapshot
and maintained ancestry walker. Publication keeps the Destination's existing
checks and push path. Child-concern workspaces, GitHub workspace hosting,
automatic fork deletion and unknown-fork sweeps remain outside J4.
No current result establishes actual provider token enforcement or connectivity.

## Historical observations and debug qualifications

The fixture-bound judge baseline and its earlier inconclusive fork setup remain
separate in the table. Census reports only 11/11/8 registered rows, not a full
legacy negative. Health version IDs do not authenticate Git source.

The old room's accepted founding at sequence 7 survives its early wait and
later pre-seat Membership refusal. The sixteen-minute legacy Register test
is not that exact Membership witness. No universal packet-impossibility claim
follows. Planner's fresh-room create, activate and readbacks close 0 in one
session. Native namespace dap-demo corrects the old nominal artroom-demo field.
Deployed Git source remains planner-attested; Register@17 is an inferred inverse
pin, not an independently authenticated Register definition in that observation.

The actual offline generator reproduces observed commit
`29c702da13a1805b22a04adeee2a19db411cc9ed` and tree
`c9c0383248ddfdd0289bc101bd0206d1c3d88deb` with DERIVED provenance.
Its input is the unchanged public head projection. The sequence-10 founding
claim is projected, not an independently settled acknowledgement. No provider
object/ref read follows from that derivation.

The first hosted preparation at S fulfills first-witness ordering.
Its actual lane is
`sc_5q66w72ggsq5sp73p5vghop57h6utz4cgg75niey2kff252bho7q`, incarnation
`in_e4zs4j3vyuvb3unek7o627jyga`. The instance at sequence 5 has epoch 1 and
uses its lane ScopeRef as the Task stand-in under ruling 70d1c9ab. No native
Task or export is claimed. A future real Task requires a new instance and a
past transition, not rewritten old records.
Stage preparation at sequence 6 establishes root 1. Stage operation 6:0 has
attempt bound three; mints 6:1 and 6:2 each have bound one. These are not actual
attempt counts. No outcome appears through head 6 in the bounded window.
The staging outcome remains pending. Joined logical Fetch/body tasks establish
no provider send, refusal, unsent status, physical cancellation or drain.

The new debug runs preserve separate failures and passes. D01 has eight passes
and one failed draft-effect expectation; the draft used local operation {k:0}
where the fixture expected its numbered string. D02 passes five cases.
D03 has two passes and one failed foreign-fact fixture assertion; D04 passes
three cases. Their recorded production snapshots stay unchanged between each
pair while the named test bytes change. This does not relabel the first runs.

D12 fails during localhost listen setup; D13 later passes the two readiness
cases. D33 first reports integration type errors and D28 a missing held field
in the lineage fixture. Later compiler records pass. All intermediate records
remain in the table and index, including repeated compiler passes.
Native v1 (D37) fails setup with EPERM and no case summary. V2 (D38) reaches
one failed Rules-policy assertion. V3 (D39) passes one complete native scenario
after the fixture supplies explicit first extents. Its real Scope/Membership/
Rules/Destination ledger and authority checks cover two agent holds, distinct
selected forks, lane-kind instances, one confirmed revoke and the other's
manifest publication through Destination12. Provider replies, credentials and
Git walking remain labelled stand-ins. This is no live adapter enforcement test.

Gate-source-1 at C completes with exit/capture 1/1 and clean unchanged source.
All prechecks, full typecheck and kernel stage pass. Node observes 80 cases:
78 pass and two fail in security-entry-points.test.mjs on the shared Scope
object module seal. Expected seal is
`54cd1a42de7dc10191191a46a03326ee8c7ecd5ee3afed596bdace1e37fc5d00`;
actual is `b13c0ec0476fbbf1155d85eeaecedf1f9917cb9063078955cfe11712bd15015d`.
Counting, plain and native stages remain unreached.
Seal checkpoint E is `e9da1ba8579989a5f0193deb94fc1dd37fbace6b`, tree
`26f2dd8bd35ba28a40fbe3ff62fe3f67b905c97c`.
It adopts the reviewed owner seals in the failing test file and explanatory
security documentation. Its whole security owner passes 10/10.
This does not turn the original C gate into a pass.

The separate unreached-stage follow-up at E fails. Counting passes 56 cases.
Plain passes 3,144, fails one and skips one across 329 files; Native remains
unreached. Only the Page asset case fails: the committed 1,187,777-byte module
has SHA-256 553d0303a89d30dc57b526691075bdff9dde7c89c8d6414e15b6f988e8a636ad,
while the maintained build expects 1,204,952 bytes with SHA-256
`a859bd6bf1af271585fb17179e3f182a53a25c9a88bd0d2dc5db8cb9653c3b67`.
The Page bundle imports the updated capability code, so its served module needs
regeneration after this change.

The maintained build at F03 exits 0 and changes only apps/room/page/assets.ts.
It produces exactly the expected bytes. That production output is committed at
A `63400786c6ff064957151b35b311883669a6fe9e`, tree
`da672c657e6c31eacb75b67e73cdeec3306ff281`.
At A, the asset owner passes its one case and the full typecheck passes.
Ruling 1d0ffcab requires a new full gate: generated production output is outside
the isolated-test exception. These partial passes supply no aggregate gate pass.

At F, page-regeneration-final-1 reproduces the committed output with clean
unchanged source guards. It is a source-generation capture, not a gate.
Gate-final-1 at F now completes with exit/capture 1/1, clean unchanged source,
no timeout and no dropped bytes. It takes 1,298.392491500 seconds elapsed and
2,666.825785 seconds host child CPU. Installation skips against the verified
lock stamp. All prechecks, typecheck, kernel, Node 80 and Counting 56 pass.
Plain reports 3,145 passes and one skip.
Native reports 244 passed files and one skipped file, with 853 passed cases
and two skipped cases. One unhandled RPC `EnvironmentTeardownError` closes
resolve while pending, so Native fails and its terminal evidence is partial.
Vitest attributes the error to the time join-version.scope.test.ts was running;
that attribution does not establish that the file itself threw or caused it.
No aggregate pass follows from the case counts.

The unchanged-F page-join-teardown-diagnostic-1 closes 0/0 and prints two passed
cases. Its stdout then prints the same uncaught RPC teardown error after the
Vitest summary. Zero exit is not a clean diagnostic result.
It is triage evidence, not a successful repair or a passing gate follow-up.
The later R records below remain separate from this unclean diagnostic.

R is `80a742bdb052fca2bca4ec12917d1961f6e19b53`, tree
`7d5f461e16e1d34acdc6aa5a90a74395657cfc2a`.
Only apps/room/page/test/join-version.scope.test.ts changes from F to R.
Its immutable Git diff has 3,854 bytes and SHA-256
`3b7634c3649444ee78e4f5a4df728ef3aac03a7bcb99bc40e6ce21357230686f`.
The repaired test has 6,193 bytes and SHA-256
`a97916c1e3fd3923de8ac87125f6d1c81e8d3a7ed3ec9c0a3e2c38f9b11dfb60`.
The fixture captures external lifetime ownership, discovers the actual Inbox
seeds from Membership history, and uses the existing bounded scheduled-callback
join before releasing ownership. Failed setup or join retains ownership.
The two cases, original assertions and deadlines stay intact. Imported helper
code, production, configuration, dependencies and shared fixtures stay unchanged;
the test adds imports of existing helpers. No other test imports this file.
Independent exact-diff review reports PASS; that is source review, not runtime
acceptance or proof of the original error's precise cause.

At R, the changed Page scope compiler and whole two-case owner both close 0/0
with clean source guards. Neither captured stream contains the teardown error;
the owner's stderr is empty. These are passing own follow-ups only.
F's full gate remains failed, and every stage had reached its end.

The test restored its fixture settings through synchronous life.release()
without joining scheduled callbacks, and the two created Inboxes were absent
from its tracked handles; the captured run then reported a pending Vitest
resolve RPC at teardown. Production uses neither this test-owned lifetime nor
Vitest's module resolver, and Membership/Inbox code is unchanged.
The exact callback that triggered the RPC error remains unknown.
The source comparison and clean R owner streams support this bounded repair;
they establish no physical drain.

Ruling `458166daf08ebd3d36d56c81604ffd182329bc0d` resolves question da1ba9e4.
Root read it in full and retired that question in
`1b9abf04d6af1f149a5618fd58b25754d4a2da02`.
The docs/testing.md isolated failing-test exception applies. The checker reads
failed gate F with the separately passing R compiler and whole-owner records.
No further full gate or stage runs for this repair; no stage was unreached.
The ruling reads condition 1 of `1d0ffcab14471eaffb59da72baaff2b0cc298094` as
including this maintained exception. The Page production regeneration had
required a new gate; R changes only the isolated failing test.
Review must use R or a later documents-only commit. Any source change beyond
this test repair requires a new full gate. This disposition resolves test scope,
not exact-head review, evidence closure or live J4 acceptance.

The closed runner unit `operator-inputs/gate-final-1-runner` retains 27 leaves,
50,920,138 bytes. Its binding SHA-256 is
`4429821baaa6f0fd6860ef0a26015085a83576748fe3e7595199617f75b2a4a3`.
The adopted index checks the retained copies against that binding; this draft
reopens no original runner temp directory. Retention adds no test result,
physical drain proof, final RAW seal or hosted acceptance.

## Evidence

RAW is the retained public evidence root
`/Users/hughpyle/play/artroom-evidence/2026-10-30-j4-workspaces-source`.
P resolves to RAW/producer. W remains the original execution checkout,
`/Users/hughpyle/play/artroom/.builder-worktrees/j4-workspace-holds-20261030`;
W is not evidence storage. For formal label L, C(L) resolves to
P/L/command.json, which preserves the original execution command.
The first 23 rows use S; gate-source-1 uses C. Later formal rows name E, A, F or R.
F03 is the intentional generator operation at base E, not a clean-source test.
Their deadlines, elapsed/host CPU, both streams and receipts retain the compact
scaffold's full digest cells. The command display is an index, not an invocation.
Program aliases resolve to selected public copies under P/operator-inputs.
J1 is baseline-judge-source; J2 is baseline-judge-source-v2.
CTX(v) is scratch-context-source-v plus v, for v = 2, 3 or 4.
PROBE(1) is staging-probe-source-v3/prior-v1/probe.mjs.
PROBE(2) and PROBE(3) are staging-probe-source-v2/probe.mjs and
staging-probe-source-v3/probe.mjs. TREE(1) is
candidate-tree-source/derive-candidate-tree.mjs. TREE(2) and TREE(3) use
candidate-tree-source-v2 and candidate-tree-source-v3 with that same filename.
Each unit's source-binding.json pins its copied programs and source inputs.
These aliases identify evidence copies, not commands to execute.
JUDGE, CENSUS, HEALTH, CHECK, AST, GENERATE and HOST name their recorded
Vitest, CLI census, curl health, Node syntax, Python AST, offline generator and
hosted phase commands. C(L) retains every original argument and environment
assignment. No private path from those records was followed for this draft.

I is RAW/adopted/public-input-index.json: 158,115 bytes, SHA-256
`e5db0688911d458ae56727528fffc0867475d8f398728422a8848d1aca06b657`.
Its retentionMapping maps sixteen public roots to RAW aliases. The complete
explicit selection is retained as RAW/packaging-plan.json; the committed
manifest, not a matching root alone, names every selected file.
It preserves all original path fields. Resolve retained payloads through that
mapping after restart. Original argv, cwd and source paths remain historical
metadata; they do not require the execution checkout or scratch programs.
Within a D or F03 row, I denotes its indexed record; I.argv/cwd are original.
I.stdout, I.stderr and I.output resolve to outputs[stdout.log],
outputs[stderr.log] and outputs[output.log]. I.record pins the original receipt
or result. These objects retain full paths, bytes and SHA-256 without truncation.
U means an unrecorded deadline. The index pins C's 49, F's 52 and R's 53 files.
It preserves the F-to-R one-file diff binding.
Its ten follow-up records preserve exact commands, guards, streams and receipts.
Its runnerRetention section indexes the 27 copied runner leaves and binding.
It is an adoption index, not a final manifest or validator result.

D01–D40 are mutable debug or source-generation observations, not checks at a
clean final checkpoint. Selected-source guards apply only where recorded.
Receipt HEAD/tree can be S while uncommitted source differs.
Missing guard, closure or CPU stays unknown. Native v1–v3 and pin generation
retain merged output. D40 is source generation, not acceptance.

Formal exit pairs give command/capture status; debug rows give one actual exit.
E means zero bytes with SHA-256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
Formal elapsedSeconds includes post-run guards; hostChildCpuSeconds includes
collector Git children, not unknown guest CPU. Debug timing uses each record's
own fields. Four early judge debug CPUs and adapter debug CPUs are unrecorded.
No sum here is one observed pipeline wall time. Machine/load/cache remain
unrecorded in these inputs; they establish no controlled performance result.

Formal collector pin is
`3de7e83a5376d9d7897d911f4373949d1be1e82bc62cf0981074424d83e52bed`.
Its bounds are 40,000 files, 2 GiB total, 128 MiB snapshots and 128 MiB per stream.
Health adds 4/8-second connection/transfer bounds and a 65,536-byte HTTPS response
limit with no redirects. The judge config has one worker and ten-second cases.
Hosted inner bounds are 180 seconds after setup, 96 requests, 1 MiB per response,
8 MiB total, 8,192 chunks, sixteen history pages, 512 entries and twelve polls.
Eight-second abort requests and a five-second logical join prove no physical drain.
Debug deadlines are unrecorded here. Gate's outer ceiling is 7,200 seconds.

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

## Open limits and owning request

Ruling `241248a9df92998e89fa57e6a50bfab6c3a5c854`, acknowledged by retirement
`0d7d2b99e64fa604a6e4155f847fcdc650d16d34`, separates source landing from live J4.
It requires source-readiness review and landing first. The original request
`0c3091fa54f38d3709dcb7a741d6754c420ad10c` and promise
`710449ccd016033f1a6b40da348060ad7fe64c4a` close on that landing under workroom
rules. Their closure records source landing, not completed live J4 acceptance.
Planner then deploys all three Workers from landed Main and files the live
witness as a separate report. No unlanded candidate rehearsal deployment is
part of that sequence. A live defect becomes a child request.

Exact-head source-readiness review remains pending.
Test scope is resolved by ruling 458166da. C and F gates and E continuation
remain failed. R's compiler and whole owner pass their own bounds and supply
the isolated follow-up that the checker assesses with failed F.
The first hosted ordering requirement is fulfilled; the S preparation has no
observed outcome. Live J4 still requires two holders pushing to separate real
forks, actual token refusal after hold end, and publication from the chosen
fork after deployment. Local provider stand-ins do not prove those conditions.
Archive/G17 enrollment, child-concern/GitHub workspaces, automatic deletion and
unknown-fork sweeping remain outside scope.

The checker must assess the exact review head. That head changes only this
note and its evidence manifest from R; the review request records both tree
hashes. Source and tests remain R's. Live J4 remains open for its separate
post-landing deployment and report under ruling 241248a9.

Public evidence is copied with the retained packager, checked against its
complete byte/hash inventory, and made read-only after the last write.
RAW/SHA256SUMS covers all retained payloads except itself; the committed
manifest also covers SHA256SUMS:
`notes/implementation/evidence/2026-10-30-j4-workspaces-source.manifest.json`.
The manifest names F for the full gate. Each command retains its actual
checkpoint, including BASE preparation and R's isolated follow-ups. Copying
changes no outcome. Earlier drafts and inspections remain in RAW/adopted/history.
Keep the directory read-only for at least 30 days after landing. Later removal
requires a planner act naming the manifest. Private vaults, operator homes,
keys, sessions, plaintext credentials and original hosted request bodies are
withheld. Metadata paths grant no permission to follow or copy their contents.
