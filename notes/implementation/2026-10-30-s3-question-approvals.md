# S3: current question text and requested approvals

An opt-in issueQuestions definition adds versioned question text, approval
requests, person-role verdicts and an explicit decision. Historical issue, demo
and J4 definition bytes stay unchanged. Existing scopes keep their pins. The
ordinary gate passed at the committed source checkpoint; this note keeps
development snapshots and intentional control failures distinct.

This work belongs to request 7951d99800df707ed4a309a818acc16ab03876e0 and
promise 2800149a8a445ab650cc1c7b8f18820ec603a7a0. The final source checkpoint
is dc27a154819a1dc09a1f0db7d71b433903e7eed4, tree
672c459607d4217aa15c1d6499b1f7dea4770d19. Nine paths changed from base
5068dab458fb1d5c58f3521703ba1311883b348e, tree
85fa2ba3792411a6543fd942b6ca40f1c4f4cc5f. The later report tail adds only this
note and its citation manifest; the final review record supplies that docs-only
head/tree.

An ask keeps a detached body and bodyAt fact. revise-ask replaces the current
body reference while the journal retains older bodies. An approval request
names the ask, exact body fact and requested member. approve needs the
requested signer, an open request, matching request and current ask bodies, and
the issue.approve grant. Its verdict closes that request. The requester can
withdraw an open request; withdrawal supplies no approval. The asker cannot
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
definition, exact canonical bytes/digest, derivability and counts, then proves
the adopted item-type bound by lowering it by one. It compares retained rows
with the historical issue; it does not replace the Native behavioral journey
with per-guard tests.

The separate canonical file has 52,297 bytes. Its definition digest is
sha256:13ddcf5de9930f47f06e0098772f74d5a5881cfa305e8085f944defb6c1d51f6; that
is the domain-separated definition digest, not the file SHA256. pin.mjs
--questions writes only the successor canonical JSON and digests-questions.ts.
It does not repin historical definitions. reference.mjs includes the successor;
the final generated reference has 105,540 bytes. src/index.ts exports
issueQuestions and QUESTION_DIGESTS. No Worker, kernel, contract, Page screen
or generic question UI changes.

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

The original Native journey passed with source SHA256
09762722b910d4ff40b5cabed3311f300df57b12546833a25c1e60a3e1d505ee. Three added
lines then create a real Vic request before revision, keep it open, and submit
its old body after revision. That strengthened source is SHA256
c730f50db51d15f10bcf675d302e4d1be2c364d529fab915e96f280931118c89. Its
whole-owner control baseline passes. The stronger case isolates the
ask-current-body guard because the requested signer, role grant, open state and
request-body equality all hold.

Two approved controls omit one guard each and repin only the successor before
running the unchanged whole Native owner. The current-body omission wrongly
accepts Vic at issue-questions.scope.test.ts:128:5 instead of stale-question.
The open-request omission wrongly accepts the person decision at :118:5 instead
of approval-pending, while a current approval exists and the controlled-agent
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

Each row below identifies its exact retained command.json, which contains
argv/cwd and the capture bounds. The neighboring receipt.json and
source-before/source-after records govern development provenance. All closed
focused and generation captures began at base 5068dab4 with dirty S3 source;
their byte inventories distinguish the original and strengthened journeys. They
are not clean dc27 captures. The final gate alone targets dc27. Generation
receipts allow only their explicit output paths. The initial reference and
final reference are separate actual generations, not failed and repaired gates.

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

The final gate passed all five stages and all four terminal test ledgers.
Native has 247 passed files and one skipped file, with 860 passed and two
skipped cases. The scope timing profile remains partial across 246 observed
modules; 72 unknown/suite observations and zero contradictions remain explicit.
Terminal complete does not establish complete callback or timing coverage. The
actual inner logs and observation streams remain whole, not tail extracts.

The formal source-index declares base 5dc9765fdc6fb6896b736127801944c46ee288f9
and 11 captured regular Source files. The runner separately compares all 3,545
tracked files / 109,046,603 bytes before and after the gate; both inventory
hashes match. Captured Source bytes include the strengthened Native test. The
final gate uses require_escalated for its loopback runtime. The retained
sources, commands, indexes and standard-library verifier support later byte
readback without temporary project execution; they do not claim that every
repository source byte was copied.

The gate command took 1146.459490041 seconds; capture wall was 1146.564919334
seconds. Command host-child CPU was 2440.137222 seconds and capture host-child
CPU was 2440.279087 seconds. Runner guards raise its total to 1147.710741
seconds / 2442.122325 host CPU seconds. These are nested observations, not
additive work. Runner-start metadata records Darwin 27.2.0, arm64, 18 logical
CPUs and load averages 2.1328125 / 2.4833984375 / 2.3271484375. The dependency
view matched the lockfile and installation was skipped. Cache state remained
uncontrolled; guest/VM CPU is unknown.

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
| Final gate: `gate/gate-1/command.json` | 0/0; complete; Node 80, Counting 56, Plain 3146 + 1 skipped, Native 860 + 2 skipped | 1146.459490041 / 2440.137222 command CPU | 6283 B / `2485a10baa7ba8ca8f1a5103c11a987d12e293125c750cf6babfe02c60f4c17b`; stderr empty |

The explicit public selection preserves all 146 historical closed leaves
unchanged. It adds the complete gate root (21 files / 2,199,795 bytes),
complete actual inner root (27 files / 51,236,879 bytes), all six actual
Counting generated leaves (1,020,193 bytes), reviewed preparation programs and
exact final note/index inputs. These are selected input counts, not an observed
seal. The durable target is
/Users/hughpyle/play/artroom-evidence/2026-10-30-s3-question-approvals. The
finalizer must verify the reviewed ready plan, copy to a new directory, retain
that plan, write SHA256SUMS and the external full inventory manifest, then seal
and read back before artifact delivery. The final artifact report records
resulting hashes; this note does not embed a self-referential seal hash.

Keep the sealed evidence for at least 30 days after landing; later removal
needs a planner act naming its manifest. The compact repository manifest binds
every directly cited command/receipt/stream/source artifact and points to the
complete external inventory and SHA256SUMS. The finalizer records actual RAW
membership including its automatic plan and sums. The intentional mutant
failures remain evidence. This note does not claim review acceptance or
landing.

S3 request 7951d99800df707ed4a309a818acc16ab03876e0 owns this source profile
and its evidence. Hosted operation and UI integration have no witness here;
this note does not add either feature to the accepted source scope. The
finalizer must complete retention before artifact delivery. Gitseq records
exact-head review and landing status separately. Local fixture keys are test
data. The profile does not replace older pins; Native authority, membership
policy and historical scope semantics remain unchanged.

The public evidence now resides in the read-only directory named above.
Packaging with the unchanged reviewed program completed with exit 0;
independent byte/mode/inventory readback matches 237 regular files / 77,322,503
bytes. SHA256SUMS has 25,402 bytes and SHA256
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

This repository note extends the sealed 14,686-byte input note; its original
bytes remain at adopted/implementation-note.md. The sealed 25,963-byte input
index remains at adopted/public-input-index.json. The repository citation
manifest keeps their 140 direct citations and adds actual custody anchors and
these input bindings. It does not replace either sealed input or write into
RAW. Only the note and citation manifest form the report tail after source
checkpoint dc27a154819a1dc09a1f0db7d71b433903e7eed4 / tree
672c459607d4217aa15c1d6499b1f7dea4770d19. Source/tests and the passed gate stay
unchanged; no additional full gate applies to this docs-only adoption.

Retention remains at least 30 days after landing. Later removal needs a planner
act naming the manifest. The exact-head review and landing records supply the
report head/tree separately; neither custody readback nor this proposal claims
review acceptance or publication.
