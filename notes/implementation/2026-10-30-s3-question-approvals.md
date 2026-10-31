# S3: current question text and requested approvals

An opt-in issueQuestions definition adds versioned question text, approval
requests, person-role verdicts and an explicit decision. Historical issue, demo
and J4 definition bytes stay unchanged. Existing scopes keep their pins. The
ordinary gate passed at the committed source checkpoint; this note keeps
development snapshots and intentional control failures distinct.

This work belongs to request 7951d99800df707ed4a309a818acc16ab03876e0 and
promise 2800149a8a445ab650cc1c7b8f18820ec603a7a0. The current source checkpoint
is 50cafdae8c2514c65554692fbb148d94042de123, tree
f6a113d7dfaaa22e1f67fedbda89c6c36dbff2c1. It repairs five paths after the
reviewed bfca55ea6f77970ae94862d375170e0f0c8eeea1 / tree
0f5ab2e420817bd3c9e8796de266133eaf8d93a4. The S3 task diff from Main base
5068dab458fb1d5c58f3521703ba1311883b348e remains eleven paths. A later
note/manifest-only report tail supplies its own exact review head/tree.

An ask keeps a detached body and bodyAt fact. revise-ask replaces the current
body reference while the journal retains older bodies. An approval request
names the ask, exact body fact and requested member. approve needs the
requested signer, an open request, matching request and current ask bodies, and
the issue.approve grant. Its verdict closes that request. The requester can
withdraw an open request using its own immutable bodyAt, regardless of the
ask's state or current text. Withdrawal supplies no approval. The asker cannot
approve their own question.

decide needs issue.decide, the current body, no current open requests, no
current request-changes verdict and at least one current approval. Old requests
and verdicts remain readable but affect only their own body version. A
successful decision finalizes the ask and records decisionAt. release-block
accepts a decision fact only for the original blocked ask, even when another
ask has a genuine decision in the same issue scope. comment.about can name an
ask, revision, approval or decision.

The successor removes answer and settle-ask only from its own cloned
definition. It keeps unrelated issue rows, whole-definition limits, capability
owners, platform pins and authority rules. The Plain owner checks the complete
definition, exact canonical bytes/digest, derivability and counts, and
validates against the adopted limit of 16 item types. The definition has 14
types; the negative test supplies a synthetic limit of 13 and expects refusal.
The same owner compares retained rows with the historical issue; it does not
replace the Native behavioral journey with per-guard tests.

The current canonical file has 52,161 bytes and definition digest
sha256:88e763abc263caf65397ba2d87ba629d90d3f09e472ce646ea744034e6909174. The
initial candidate had 52,297 bytes and digest
sha256:13ddcf5de9930f47f06e0098772f74d5a5881cfa305e8085f944defb6c1d51f6; its
bytes and outcomes remain historical evidence. These are domain-separated
definition digests, not file SHA256 values. pin.mjs --questions writes only the
successor canonical JSON and digests-questions.ts. It repins no historical
issue/demo/J4 definition. reference.mjs regenerates the reference, still
105,540 bytes. Exports remain issueQuestions and QUESTION_DIGESTS. No Worker,
kernel, contract or Page feature changes.

The actual Native journey creates a workspace-cohort room with an empty caller
roster. Membership8 invites/enrolls two person members through real invitation
proofs, then adds a true controlled agent and enrolls its agent key. It reads
back member kind, role, controller and active key binding. Person keys use the
native device kind. The full person-role action lists gain issue.approve and
issue.decide; agent/checker lists remain exact without either grant. This
proves the configured role boundary, not protection against deliberately
granting a person role or its actions to an agent.

Real Rules activates the successor; real Directory creates the issue. The
journey submits empty caller grants, so production authority reads Membership.
It checks both refusals and successful counterparts, actual head equality
around refusals, detached body/comment readback, old-version exclusion, pending
and request-changes decision barriers, agent refusal, requester withdrawal and
the wrong-ask release refusal. Git setup replies, fixture clock and transport
remain stand-ins. It runs native scope storage/judgment in the Worker test
runtime; it makes no external provider or hosted-deployment claim.

Initial-candidate history: The original Native journey passed with source
SHA256 09762722b910d4ff40b5cabed3311f300df57b12546833a25c1e60a3e1d505ee. Three
added lines then create a real Vic request before revision, keep it open, and
submit its old body after revision. That strengthened source is SHA256
c730f50db51d15f10bcf675d302e4d1be2c364d529fab915e96f280931118c89. Its
whole-owner control baseline passes. The stronger case isolates the
ask-current-body guard because the requested signer, role grant, open state and
request-body equality all hold.

Initial-candidate history: Two approved controls omit one guard each and repin
only the successor before running the unchanged whole Native owner. The
current-body omission wrongly accepts Vic at
issue-questions.scope.test.ts:128:5 instead of stale-question. The open-request
omission wrongly accepts the person decision at :118:5 instead of
approval-pending, while a current approval exists and the controlled-agent
request remains open. Both fail the ordinary refusal assertion at :92:46. These
are intended counterexamples, not failed setup or timeouts.
controls/result.json records two DISTINGUISHES, no failure and exact source
restoration. The helper preserves original definition, canonical and digest
bytes/modes; its own source hash is recorded in controls/program.json.

Cleanup discovers actual Membership Inbox births, keeps their unique handles
and joins them with the room/lane handles through the existing bounded
drainScheduledFixture. It does not change shared limits or claim physical
process/HTTP drain. Each Native test keeps its 90-second deadline. Control
children retain 180-second bounds, bounded streams, actual leader/group/pipe
observations and exact restoration. Those observations do not prove physical
runtime drain.

Each table label names its exact command.json; neighboring receipt.json and
stdout/stderr bytes govern the recorded outcome. Unprefixed paths resolve under
the original sealed directory. New repair: paths resolve under the separate
repair root in the citation index. Initial development captures own dirty 5068
snapshots; initial clean gate dc27 is historical. Repair focused/generation
captures own dirty bfca snapshots with five repaired paths; only the new gate
owns clean 50caf. The repair selection includes all complete pre/post Source
inventories and raw JSON reports; its compact index lists direct citations.
Generation changes only its exact allowed outputs.

Output digests below are SHA256 of actual retained stdout/stderr bytes; empty
means zero bytes with SHA256
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855. Counts come
from complete test summaries/JSON reports; no phase count is added to its
parent. Wall time uses the collector monotonic interval. CPU uses receipt
host-child CPU and excludes guest/VM CPU; nested control CPU stays unknown. The
enclosing control cost includes its children. Some focused checks ran
concurrently, so their CPU deltas can overlap; no aggregate cost is claimed.
Focused host/load/cache state was not measured. The dependency readback records
a copied lock-matching physical tree, not a fresh installation or cold-cache
measurement.

Initial gate history: The first clean gate passed all five stages and all four
terminal test ledgers. Native has 247 passed files and one skipped file, with
860 passed and two skipped cases. The scope timing profile remains partial
across 246 observed modules; 72 unknown/suite observations and zero
contradictions remain explicit. Terminal complete does not establish complete
callback or timing coverage. The actual inner logs and observation streams
remain whole, not tail extracts.

Initial gate history: The formal source-index declares base
5dc9765fdc6fb6896b736127801944c46ee288f9 and 11 captured regular Source files.
The runner separately compares all 3,545 tracked files / 109,046,603 bytes
before and after the gate; both inventory hashes match. Captured Source bytes
include the strengthened Native test. The final gate uses require_escalated for
its loopback runtime. The retained sources, commands, indexes and
standard-library verifier support later byte readback without temporary project
execution; they do not claim that every repository source byte was copied.

Initial gate cost: The gate command took 1146.459490041 seconds; capture wall
was 1146.564919334 seconds. Command host-child CPU was 2440.137222 seconds and
capture host-child CPU was 2440.279087 seconds. Runner guards raise its total
to 1147.710741 seconds / 2442.122325 host CPU seconds. These are nested
observations, not additive work. Runner-start metadata records Darwin 27.2.0,
arm64, 18 logical CPUs and load averages 2.1328125 / 2.4833984375 /
2.3271484375. The dependency view matched the lockfile and installation was
skipped. Cache state remained uncontrolled; guest/VM CPU is unknown.

Checker review 9a44d98b requested one repair: open approval requests could
become permanently live after revision or ask finalization. Correction 85e018c2
withdraws the earlier bound-edge claim and the unverified comparison of
withdrawn-ask blocks with the old lane. The repair removes only the ask-state
and ask-current-body guards from withdraw-approval-request. Open request,
requester signer and equality to the request's own bodyAt remain. Final
met/withdrawn states free live request capacity without raising max 64; no
stress matrix or new cleanup act was added.

The same Native journey now withdraws a stale request with its original body,
refuses a nonrequester who has issue.comment, refuses the requester supplying
the newer body fact, and withdraws a surviving request after the ask is
decided. It reads both final withdrawn states and original ask/body references.
Every previous assertion, the person/controlled-agent authority setup and the
90-second deadline remain. Approve and decide retain all current-text checks.
The repaired Native source is SHA256
02b606aa26f34392f02259c054046ccdf1e23e098b23f49f6abdfb5e90add5e4.

One new control restores only the old ask-current-body withdrawal equality,
repins only questions, and runs the unchanged whole Native owner. Its baseline
passes one case; the mutant fails one ordinary AssertionError at did():81:22,
called by the positive stale withdrawal at :132:5, because it refuses where
accepted is required. Exact three-file byte/mode and whole-Source restoration
passed. The two earlier controls were not repeated. Nested control CPU stays
unknown; the enclosing capture includes its children.

The repair gate passes all five stages and four terminal ledgers: Node 80,
Counting 56, Plain 3,146 with one skip and Native 860 with two skips. Native
files are 247 passed plus one skipped. Scope timing remains partial across 246
observed modules, with 72 unknown/suite observations and zero contradictions.
Complete terminals do not prove complete callback or timing coverage. Root's
closed metadata readback separately checks all 13 formal blobs against the
collector's actual 5dc base, all 3,547 tracked identities, 27 inner files /
50,776,421 bytes and six Counting leaves / 1,020,193 bytes. The task diff
against 5068 is still eleven paths; two earlier Main plan/report documents
explain the collector-base difference. Its initial prewrite assumption of
eleven blobs is retained as metadata preparation history, not a project/gate
failure or formal failed-audit receipt.

The new command wall is 1011.807637458 seconds / 2149.114483 host-child CPU
seconds. Capture wall is 1011.921726166 seconds / 2149.286176 CPU seconds;
runner guards raise the observation to 1012.816968416 / 2150.707283. These
nested costs are not additive. Runner start records Darwin 27.2.0 arm64, 18
logical CPUs and load averages 1.2578125 / 1.4921875 / 1.60595703125. The
lock-matching dependency view skipped installation; cache state is uncontrolled
and guest CPU unknown. No focused Source byte was attributed to the later clean
head retroactively.

Two nonblocking limits remain explicit. Approval verdicts use max 256 and
submitted is nonfinal, so they accumulate within an issue and later approval
fails closed at that live-item bound; no verdict retirement was added. A block
on a withdrawn ask cannot obtain a new decide fact because decide requires
asked. The repair adds no alternative release. No claim about equivalence with
the old lane's block behavior survives the checker correction.

| Check / command record | Actual outcome | Wall seconds / host-child CPU seconds | Output bytes / SHA256 |
|---|---|---|---|
| Dependency view: `preparation/dependency/artroom-s3-dependency-readback-20261030-v1.json` | Operator readback: copied lock-matching tree; 14 aliases; no install. No command/exit receipt. | unknown / unknown | JSON 3208 B / `dc631021b585b8a5b5ba90e7271fd67d62505153c0767b1fae7c9f1d4734fd91`; no stream record |
| Production compiler: `checks/lane-types-1/command.json` | 0/0; pass | 0.505857833 / 0.459346 | empty; stderr empty |
| Plain test compiler: `checks/lane-plain-types-1/command.json` | 0/0; pass | 0.569266750 / 2.257777 | empty; stderr empty |
| Native test compiler, original journey: `checks/lane-native-types-1/command.json` | 0/0; pass | 0.726739292 / 3.030923 | empty; stderr empty |
| Whole successor + historical definitions owners: `checks/lane-plain-owners-1/command.json` | 0/0; 5 passed / 2 files | 1.821369417 / 2.273334 | 1543 B / `db1498554174af0205cd5f374867b978fd52e930e26483fd0461d57467991964`; stderr empty |
| Original Native journey: `checks/native-question-journey-1/command.json` | 0/0; 1 passed | 7.066113125 / 7.518933 | 8017 B / `9d20be98e8d105a7b5986f1444d107c067a072ae6fe3b8b9d54e93f0ed5c2405`; stderr empty |
| Native test compiler, strengthened journey: `checks/lane-native-types-after-old-request/command.json` | 0/0; pass | 0.539169208 / 2.619732 | empty; stderr empty |
| Control enclosing capture: `checks/question-controls/command.json` | 0/0; two DISTINGUISHES; exact restoration | 18.272920125 / 22.858660 | empty; stderr empty |
| Historical definitions owner after final reference: `checks/definitions-owner-after-reference/command.json` | 0/0; 4 passed | 1.416484417 / 1.951397 | 263 B / `741c30165e4d90619e888045689b90df20ed30168bf203aad5c8d9563a70928c`; stderr empty |
| Initial successor pin generation: `generation/captures/pin-questions/command.json` | 0/0; intended two-file generation | 0.126932542 / 0.180635 | 112 B / `f95cdf34453ef9e8239b7c416e5d1ab96d97be235fa080728d8504a807998a67`; stderr empty |
| Initial reference generation: `generation/captures/reference/command.json` | 0/0; intended documentation generation | 0.187150084 / 0.294227 | 44 B / `7bc410f3dfc846875018cee99986dd63e5a00cbaf704c43436098f1b72dba7c5`; stderr empty |
| Final reference regeneration: `generation/captures/reference-2/command.json` | 0/0; intended documentation generation | 0.203590708 / 0.310115 | 44 B / `044ec708b7aa1543d9a439da0c41482fd935812cafda5f7e143258450122b82d`; stderr empty |
| Strengthened Native baseline: `controls/baseline/command.json` | 0; 1 passed | 5.379338833 / unknown | 8115 B / `f7f74743ad2207f43123a55ea7c32b19c0446fa181de3354eb5ba0d54135421c`; stderr empty |
| Approval mutant successor repin: `controls/approve-current-body-pin/command.json` | 0; pin completed | 0.119182916 / unknown | 112 B / `16d599af8077cffbca15e9888a6610b5f560250d96274250ec023b23739cf57c`; stderr empty |
| Approval current-body guard omitted: `controls/approve-current-body/command.json` | 1; 1 ordinary AssertionError; DISTINGUISHES | 5.234642166 / unknown | 8271 B / `7b3067ab040b5afbb66d9b8b6e4e8698a002fb5218ef32c8b940f9e1f9b0539b`; stderr 1121 B / `830273c24a95f7e5e73737a4ccfeeba34c2253eee026d4dd8e7f8e4de6ad3c4b` |
| Decision mutant successor repin: `controls/decide-open-request-pin/command.json` | 0; pin completed | 0.124956792 / unknown | 112 B / `9cb25c6dff38209cc264c41f44b661a63f898af29875866ed6b84e5c223764b7`; stderr empty |
| Decision open-request guard omitted: `controls/decide-open-request/command.json` | 1; 1 ordinary AssertionError; DISTINGUISHES | 5.241820167 / unknown | 8270 B / `2b27557d9a16a7da0271d96f68805ed59bf165a230c6c0a31b658cbd621b62e3`; stderr 1123 B / `d5e06fcd2a8098ad34fd35bb910f1f93a53e42ddf3f31ff84c48a6c297ea3012` |
| Historical initial gate (dc27): `gate/gate-1/command.json` | 0/0; complete; Node 80, Counting 56, Plain 3146 + 1 skipped, Native 860 + 2 skipped | 1146.459490041 / 2440.137222 command CPU | 6283 B / `2485a10baa7ba8ca8f1a5103c11a987d12e293125c750cf6babfe02c60f4c17b`; stderr empty |
| Repair question-only pin: `repair:repair-generation/captures/pin-questions/command.json` | 0/0; intended two-file generation | 0.120168833 / 0.177090 | 112 B / `1984d5ecca86f546941f5c5067b6f81657c6007eb0c17e1ba234a9d4eca799d0`; stderr empty |
| Repair reference generation: `repair:repair-generation/captures/reference/command.json` | 0/0; intended documentation generation | 0.183092375 / 0.287783 | 44 B / `044ec708b7aa1543d9a439da0c41482fd935812cafda5f7e143258450122b82d`; stderr empty |
| Repair production compiler: `repair:repair-checks/captures/lane-types/command.json` | 0/0; pass | 0.207722083 / 0.461445 | empty; stderr empty |
| Repair Plain test compiler: `repair:repair-checks/captures/lane-plain-types/command.json` | 0/0; pass | 0.510002083 / 2.133630 | empty; stderr empty |
| Repair Native test compiler: `repair:repair-checks/captures/lane-native-types/command.json` | 0/0; pass | 0.642660750 / 2.794080 | empty; stderr empty |
| Repair whole Plain owners: `repair:repair-checks/captures/lane-plain-owners/command.json` | 0/0; 5 passed | 1.258067167 / 1.933776 | 1664 B / `d5c606b810895e252bfee4e6cfd38227ba2d15f65402cc0e2f60e049a625143d`; stderr empty |
| Repair whole Native journey: `repair:repair-checks/captures/native-withdraw-journey/command.json` | 0/0; 1 passed | 5.346816375 / 6.814058 | 8144 B / `2852ffd2ad7ecc39b9e0dd19d3fc9b5f7a11cfde54fa544adbc84d73fd0c3b53`; stderr empty |
| Stale-withdraw control enclosing capture: `repair:repair-checks/captures/withdraw-guard-control/command.json` | 0/0; DISTINGUISHES; exact restoration | 12.268819584 / 15.266262 | empty; stderr empty |
| Stale-withdraw baseline: `repair:repair-control/baseline/command.json` | 0; 1 passed | 5.346989000 / unknown | 8121 B / `a3c5bf83aafe1d77cb7967cb0cf4ae5f67298265917330dd2852df1dbfed063d`; stderr empty |
| Old withdrawal guard repin: `repair:repair-control/withdraw-current-body-pin/command.json` | 0; pin completed | 0.120920541 / unknown | 112 B / `4bfb9a11d1274a07a05c92a9d5ffcd8a8481c21b29800862f03502f50e470406`; stderr empty |
| Old ask-current withdrawal guard restored: `repair:repair-control/withdraw-current-body/command.json` | 1; 1 ordinary AssertionError; DISTINGUISHES | 5.319299041 / unknown | 8270 B / `59e12ad8eb6b15c6497e72da48ca351f9e4fc3b695810868e8d250255a9169ba`; stderr 1081 B / `8f7dd4037b06e1c432b8af8b70f4809e76b3a32e0e93f1c73836b2e18248519f` |
| Root gate/Source/Counting metadata readback: `repair:repair-root-audit/audit.json` | PASS recorded; no formal command/exit receipt | unknown / unknown | JSON 7337 B / `b5e2dd262c7bfbf84d0cbe2dccdc9e42d6986acc8c8d6a92bf4ce271771d7a1b`; no stream record |
| Repair gate: `repair:repair-gate/gate-1/command.json` | 0/0; complete; Node 80, Counting 56, Plain 3146 + 1 skipped, Native 860 + 2 skipped | 1011.807637458 / 2149.114483 command CPU | 6283 B / `cd6c12c163ab55ccba56bfcbea0847ce33fae76d96532c819db28760c9f7c289`; stderr empty |

Original retention history: the initial selection preserved its 146 development
leaves, complete 21-file gate, 27-file inner runner and six Counting generated
leaves. That history is sealed in
/Users/hughpyle/play/artroom-evidence/2026-10-30-s3-question-approvals and
remains unchanged. The repair selection retains that whole 237-file unit under
prior-unit plus its external full manifest under prior-metadata. Only actual
finalizer output may establish the new repair unit's count, sums or seal.

Keep both evidence units for at least 30 days after landing; later removal
needs a planner act naming their manifests. The compact index preserves all 145
old file objects and default directory exactly. Only new rows use root repair
and its explicit root map. The new finalizer must copy, inventory, seal and
read back before artifact delivery; this raw report/index claims no future
custody result.

S3 request 7951d99800df707ed4a309a818acc16ab03876e0 owns this profile and
evidence. Hosted operation, provider actions and UI integration remain unproved
and outside this source witness. Local fixture keys are test data; no operator
custody is exercised. The repair changes no historical platform pin, authority
rule or people/agent role policy.

Original sealed custody: The public evidence now resides in the read-only
directory named above. Packaging with the unchanged reviewed program completed
with exit 0; independent byte/mode/inventory readback matches 237 regular files
/ 77,322,503 bytes. SHA256SUMS has 25,402 bytes and SHA256
48fc9f760c3d68559a40256f0c21dc19e20e6a68240836645974efe39d866495. The external
full inventory manifest at
/Users/hughpyle/play/artroom-evidence/2026-10-30-s3-question-approvals.manifest.json
has 47,590 bytes and SHA256
f684ff371c2bd58281646e6727943640198ece363a08878fb0cfe39d95c4e250. The manifest
covers every RAW file, including the sums; it does not hash itself.

The first packaging attempt exited 1 with ValueError at the dependency
source-root depth guard, before either destination existed. Root recorded its
0.043896457995288074-second outer wall as a posthoc tool observation, not a
formal collector receipt. The exact original failed plan/argv remains in
history/finalization-data-v1;
history/retention-attempt-1/retention-attempt-1.json retains the failure
statement. The second plan moves only public metadata provenance to deeper
roots and retains that history. This retention failure did not change the
passed S3 source gate, run application/provider actions or require a new gate.

The initial bfca repository report extended the original sealed 14,686-byte
note and 25,963-byte index, retained at adopted/implementation-note.md and
adopted/public-input-index.json in the old unit. That initial report changed
only note/manifest after dc27. The present five-path repair changes source
after bfca and therefore has its own new full gate. This raw repair report and
its index will remain immutable inputs to later docs-only custody adoption;
their eventual repository report head is supplied separately.

A later repository report may add only actual custody anchors after the repair
unit is sealed. The raw input report/index and original unit must remain
unchanged. Exact-head review, Source publication and landing remain separate
from gate and retention results.

Repair custody: The reviewed copy completed with exit 0. The new read-only
unit at /Users/hughpyle/play/artroom-evidence/2026-10-30-s3-question-approvals-review-repair
contains 419 regular files and 148,259,732 bytes, including the complete prior
237-file unit. Its external full manifest has 86,885 bytes and SHA256
c9c785c06c36138f4d516387517edf042498968e19d17483def498d1a7dfedef. Its
48,387-byte SHA256SUMS has SHA256
609356da900981e44035273321cc30fdcc62f21333db1beb22b8a2f559ef10e3. The retained
portable verifier and independent full byte/hash/mode/index readback passed.
The copy and these readbacks are retention operations; no formal project
collector receipt or additional test result is claimed.

The repair unit retains its 23,289-byte raw note at adopted/implementation-note.md,
SHA256 008aa3dbe78a99f52453dd8ccc0605c42ef5abbab1989ed398b3a453802b0d3a,
and its 36,581-byte raw index at adopted/public-input-index.json, SHA256
d96c4186ee5d4d97329c51508b9f5a3cca7eea44f408dfb897a0fb0c2c4ee1a0. Those inputs
remain unchanged. This repository report adds actual custody anchors after
the copy. Only note and citation manifest change after the passing 50caf source
checkpoint; source and tests remain exact. Gitseq Source and review records
supply the later report head and tree.
