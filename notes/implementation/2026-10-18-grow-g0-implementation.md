# G0 implementation checkpoints

Work under Source child `abdf653c79af7645db1bcbc0fda450919dd2c475`
and promise `f14b646ab796957d2ab016728d97cb7a47808c42`, within parent
`d3a42cb2` / `f46668cf`. The developer branch includes reviewed Main
`fd198c724a53a1f86ee1270fe477ab1d505f4b3f`; the refresh is
`27576a600e8b616019f8639b7c4fc8b7b92d55db`, tree
`54fec58e1d5d8b4e9c471a4cf76dd9d6ea31384b`.

The complete current 608-line Grow design was reread here. Repaired Plan033
at `dd6a6942` was read first and in full (153 lines), as was checker approval
`fe797ecd`. It adds separate prerequisites, not G0 authority: G5a must supply
the native device-command owner before G5; real demo-room archive admission,
permission, policy/configuration, destination/token, wiring and disclosure
must be commissioned/reviewed before G4. A2/A3 fixture evidence is unchanged.

Planner G0 decision `e72e4e8334be3ed52a70cf2a9728942ebe5e77a0` was previously
read in full and ratified by `8de949096f5778601b1d9e87eb6933f6b735cc75`.
It governs the earlier preparation questions: the outcome is a separately
labelled non-native scenario-owner record; sensors-only `report-zone` cites
an exact observe summary on band crossings; observe remains a comment;
there is no recovering state, recovery delay or timed closure. Hold expiry
is 60 seconds and bench staleness 48 hours. The climate agent closes an
incident from recorded in-band evidence. Device error refusals use the static
`device-error` name plus the exact stored sensor description in a read result
bound to the refused revision. The native reply schema stays unchanged.

## Device declaration foundation

`examples/grow/device.ts` supplies a data fragment for the room, not a
complete room or site definition. It declares up to twelve devices (four
zones with three kinds), percentage levels from 0 to 100, initial target
intent, fixed commission-time limits, and separate target/report references.
Absent reports remain native empty slots (`null`); commissioning invents no
observation. It adds no outcome slot or capability. The optional additional
target-writer names let the full room bind `authorize` when that act exists.

Operator setup uses an explicit `grow.configure` action. The device acts
use `grow.climate` for vents/fans, `grow.heat` for heaters and `grow.sense`
for reports. Kind guards refuse a vent command aimed at a heater. Restricted
rules enforce kind/state/level consistency and command limits. Reported error
refuses commands with `device-error`; the sensors' description is arbitrary
bounded text, not an enumeration of faults. Reports may truthfully exceed a
command limit without changing that limit or the target. A normal report
clears its old error description. This defines intent and evidence only;
no physical device call or native command operation is made.

Command acts write only target, level and their own entry reference. The
sensor act writes only the report state/level/description/time and its own
entry reference. Their `self` references are native local sequence numbers;
a read resolves that number through the actual scope history to quote an
exact fact. A late on report remains next to an already-commanded off target.
The test's labelled scenario-owner outcome records its command fact outside
the native state and changes neither the target nor the report.

## Evidence

Two focused cases pass (`0cd15d`, exit 0). They use the real validator with
`RULE_PROFILES`, evaluator, native judges, seal/fold and replay verifier.
Operator, climate and sensors have explicit per-key grant lists; the ledger's
all-actions default is replaced. Controllers and grants are scripted fixture
data, not native enrollment or freshness. Replay explicitly uses as-recorded
authority and reports that trust. Both cases replay the actual canonical
journal, definition and retained inputs, without inventing a missing input.

The cases distinguish a failing device from unchanged target intent, an
operator's command from a sensor report and from a non-native owner outcome,
late evidence, wrong-kind commands, an agent's lack of heater authority,
sensor-only reporting and application command limits. The refusal explanation
keeps the original description, device revision, refused head and actual
sensor fact after later reports/commands.

The first run (`3810df`, exit 1) had two fixture failures: an absent native
slot was expected as undefined rather than null, and replay lacked the
actual prepared-rule input bytes. The next run (`d84828`, exit 1) passed the
second case but exposed the first case's mistaken expectation that a `self`
reference was already an expanded FactRef. The fixture now resolves its
native local sequence through the recorded history. These failed runs remain
failures. No native validator, rule, reference, judging or replay behavior
was relaxed to make them pass.

Two controls distinguish and restore source: removing the reported-error
guard (`df2f03`/`ec6b49`, exit 0) changes two intended refusals to writes;
removing the target-limit guard (`e74587`/`ff2b68`, exit 0) admits the
out-of-limit command. Both normal runs pass two cases, with assertion failures
under the respective faults. The root Grow project runs the same two cases
once and passes (`5d51fd`). The Grow source/test typecheck passes (`b6ca37`).
Evidence logs use `/tmp/artroom-g0-device-`.

The root test projects and typecheck script include Grow so the final gate
will not silently omit it. There is no new workspace, resolved dependency,
package-lock change or package installation. Dependencies are a private COW
copy of the owned A3 view, with all thirteen workspace links rebound and
verified within this checkout and the lock bytes matched. Its audit is
`/tmp/artroom-g0-dependency-view-20261018.log`.

## Zone evidence foundation

`examples/grow/zone.ts` now provides the room's recorded zone data and acts.
Temperature values use integer centidegrees Celsius; a zone represents 25
cells. `observe` remains a guard/effect/send-free comment with one room-level
list of up to four zone summaries and the sensors' sample time. Periodic
summaries have a 300-second cadence; the fixture records an additional summary
when it needs exact threshold evidence between periodic observations. Raw
samples are not journal entries.

`report-zone` is sensors-only. It verifies an actual `observe` fact from this
same scope, copies that entry's exact summary list and sample time, selects
the named zone once, and checks the supplied statistics against it. Min/mean/
max and in-band counts must be coherent: the extrema themselves rule out
impossible counts, although these remain sensor claims rather than a proof
from all raw samples. Old entry references and backdated sample times cannot
replace a later accepted classification. A same-band periodic summary stays
a comment rather than producing another classification transition.

Implementation choice: a zone starts `unobserved`, with empty statistics.
Operator `set-band` also invalidates its old classification to `unobserved`
while preserving the old evidence. This introduces no recovering state or
recovery timer. Only a subsequent sensors report writes `in-band` or
`out-of-band`. This avoids inventing an initial observation or presenting an
old band's classification as valid under a changed band. The same last
summary can be explicitly reclassified after invalidation, but an older one
cannot displace it. These checks establish provenance and ordering, not a
maximum-age policy, trusted sensor clock or physical accuracy.

Four zone cases and the two existing device cases pass together (`c5a7dc`,
exit 0); Grow typecheck passes (`26aaf6`). The common native fixture runner
now retains actual prepared inputs for both fragments, still with explicit
per-key scripted grants and as-recorded authority replay. A second actual
fixture scope supplies the cross-room negative case; identical local zone
numbers do not make its observation evidence for this room.

The first combined run (`8db506`, exit 1) passed the device cases but failed
the three initial zone cases. Diagnostic `80f1fe` identified the named
zone-evidence guard: inside a JSONata filter, `subjects` was looked up on the
element instead of at the root. Binding the zone id before filtering fixes
the expression (`f58c58`, three passes). The later provenance run passes six
cases (`240356`), and the final count-coherence run passes four zone cases
(`9b8243`). No native evaluator/judge behavior changed.

Five targeted controls distinguish and restore source, each with four normal
zone passes and one intended assertion failure: same-room guard
(`7cc87e`/`5e6c5d`), exact summary bytes (`a50b7e`/`8c27e5`), evidence order
(`560357`/`4127cb`), band crossing (`c83ff6`/`6d8504`) and statistic/evidence
consistency (`32c91f`/`cd48c6`). Each exits 0. The count-coherence refinement
adds only necessary bounds from the recorded extrema, without claiming raw
sample verification. Evidence logs use `/tmp/artroom-g0-zone-`.

The zone fragment has not yet been connected to the full room. A cross-private-
branch actual CLI witness now passes (`6f9348`, exit 0): M1 at `12ccfa380`
checks G0's zone data at `a800ac829`, which includes the audited Plan033 Main
`bb3d3062`. Five declarative steps commission a zone, record an observe
comment, cite its accepted `$fact` in report-zone, assert the recorded state
and retry the same signed report. Native Core/SQLite replay is consistent
through sequence 3. The fixture uses public TEST actors and a labelled static
page, with invalid custody environment variables to witness that check reads
no operator custody. It writes no release package.

The retained bridge project is
`/tmp/artroom-g0-zone-m1-bridge-20261018-pfPU1Y`; the harness is
`/tmp/artroom-g0-zone-m1-bridge-20261018.mjs`. Its result and exact eight-file
inventory are `/tmp/artroom-g0-zone-m1-bridge-result-20261018.json` and
`/tmp/artroom-g0-zone-m1-bridge-proof-20261018.json`. The parent loader's
DEP0205 deprecation warning is retained in the result; the actual CLI's
stderr is empty. Ten native judge/rule/fixture/Core/SQLite/turn/replay paths
are verified byte-exact with reviewed Main in both branches. This is an
integration witness for unlanded development code, not public Main CLI
availability, a hosted room/lane birth or full G0 acceptance.

Plan033 sealed receipt `d28318c4`, planner publication survey `db10e8d7` and
checker audit `1ffa6555` were read in full. The audited Main is
`bb3d3062abce958f03f9c9aba7335c4891880940`, tree
`238bd4db23ea33c357a37aaf5bf28296b83ddc5a`, preserving the separately approved
fixture milestone note. Its three documentation changes were merged privately
into this branch at `a800ac829`, tree `c4fcefce466febd4288e59e60405466545ec875b`.
G0 source/tests are unchanged from code checkpoint `34883d72b`, tree
`18d22f462a51c01264da50bd4b174806146498b6`; no unchanged suite or gate was
repeated for that documentation merge. No unprovided planner process handle
or exit is claimed.

## Room and climate-incident foundation

`examples/grow/room.ts` now composes zones and devices with alerts and
incidents. A device is commissioned into exactly one zone, with at most one
active device of each kind per zone. Device bindings check both kind and
zone. The four-zone fixture commissions twelve devices through native acts.
These are definition data, not a host setup cohort or a running device owner.

An alert needs a recorded out-of-band zone and vents/fans at their command
limits or reported unavailable. It names the zone and heater and records its
raising member and first entry. Another active alert for the same zone is
refused. `open-incident` is an explicit climate act over that exact local
raise fact: today's forms cannot open both rows in one act. It records a
single incident for that alert and its first entry. No row is inserted into
folded state by fixture code.

Hold and authorization need `grow.heat`. Hold lasts 60 seconds and expires
to a new open revision. Authorization uses the stored proposal, current alert
and heater revisions, the heater kind, reported-error refusal and configured
limits. It writes the target in that same operator-signed act; it adds no
grant. The sensor report stays independent, including a late on report beside
the already-commanded off target.

Implementation choice: `propose-restoration` reopens the same authorized
alert after a recorded healthy vent report, keeping its incident and first
entry. Its fixed proposal is heater on at full level; it commands nothing.
Another operator authorization is required and remains subject to the same
heater guards. This supplies the story's second card without a new incident
or a recovering state. `close-incident` needs the raising member, the correct
open incident, an in-band zone, and an observe summary recorded after the
alert's raise. It closes both rows and records the exact last entry. A cool
comment queued before the alert cannot establish later recovery.

Four room cases now pass, and all ten Grow cases pass together
(`24fe7d`/`03e604`, exit 0). Typecheck passes (`8e22a8`). The climate thread
walks initial in-band refusal, insufficient-agent-work refusal, vent error,
fan trip, cross-draft, alert and incident, hold/expiry, stale refusal, heater
cut, separate labelled heater outcomes and reports, recovery, restored
cross-draft, restoration proposal/authorization and closure. Fan 2 remains
reported in error for maintenance. Native replay is consistent. Other cases
cover duplicate kinds, wrong-zone binding, errored/disabled heater refusal,
climate authority, an unknown vent report, duplicate incident and old recovery
evidence. The tender/task and watering threads are still due.

The first room run (`06b747`, exit 1) had one failure: JSONata subjects for
named items use keys `also.vent`, `also.fan`, and so on. Quoted full keys fixed
those expressions. The next run (`ee9e87`, exit 1) found the supposed stale
signature had expired exactly at hold expiry. A valid 300-second signed
lifetime made the intended revision check reachable (`86720a`, exit 1,
because the test still expected the informal word stale). The fixture now
asserts the actual native `revision-moved` reason (`188a1a`, exit 0).
The initial typecheck's unused import was removed. These failed attempts are
retained; no native reason, lifetime check, alias or judging rule changed.

Four targeted controls distinguish and restore source: escalation eligibility
(`e7ef33`/`2c9b0f`), authorization's device-error check (`9fc6cc`/`8d79dd`),
authorization's level limit (`d99c61`/`c1e65c`) and recovery evidence
(`5aaae6`/`85cddb`). Each exits 0 with four normal room passes and one intended
assertion failure. Evidence logs use `/tmp/artroom-g0-room-`. Device-error
guards are shared as data with explicit subjects, so operator authorization
does not bypass the guard used by direct device commands.

## Bench, maintenance and watering checkpoint

`work.ts` adds up to 100 bench cells, with unique row/column addresses,
explicit zone references and no initial invented probe. Moisture is percent;
EC is integer microsiemens/cm (2100 means 2.1 mS/cm); pH is in hundredths;
height is millimetres. Insects and bounded text notes are optional. Every
supplied reading keeps its own actual probe reference. An EC-only update
preserves the old moisture/pH values and their references; zero is a reading.
The bench's latest probe starts the native 48-hour stale deadline. Individual
measurement ages remain separate even when another measurement refreshes the
bench. Unprobed benches start stale and have no scheduled deadline.

Maintenance tasks name an active alert and a device from its zone. A tender
takes the offered task; only that tender can record its completion report.
The report changes no device observation. A separate sensors act records the
device's later observed state. These are text reports; photo custody is due
later. The report's signer and exact entry remain available in native history.

`watering.ts` records member statements of watering work. An operator
configures one room policy, and the head grower can change it. Scheduled
watering needs a policy, an amount within its cap, and native after/before
guards. Both time endpoints are excluded: this checkpoint deliberately uses
the existing strict native guards. This is an absolute configured window,
not an invented recurring scheduler or cumulative consumption budget.

An exception records an exact accepted probe fact, its bench and that bench's
zone, together with the requested amount and reason. Another room's probe or
another bench's reading is refused. The head grower approves or declines;
the irrigation member can record fulfillment only after approval. The
approved amount stays fixed. Done and declined records are native final
items and cannot be fulfilled again. The chemical `apply` act is a
head-grower comment and changes no items. Neither act operates a pump or
handles chemicals; no outside-effect owner is introduced.

Text-only probes, task reports and exception reasons must start with a
non-whitespace character. The caller can trim text before signing. This
bounded wire choice uses the admitted length/contains/substring functions:
`$trim` and a range expression were refused by the existing rule profile in
failed probes `bf403a` and `41234a`. The native profile was not extended.
The admitted prefix expression was checked separately (`c7b4fd`, exit 0).
Numeric probes may also carry an optional note, including an empty one.

Three work cases pass (`7a98a1`). The first watering run `e863ca` had
one test failure because it expected guard-failed for a native final item.
Its earlier syntax error is retained in
`/tmp/artroom-g0-watering-initial-typecheck-20261018.log`. The corrected
watering run `24d4a8` passes two cases. Typecheck then exposed a nonexistent
fixture items property: the comment test now compares actual
`state.all().items` snapshots, rather than two absent properties. The
probe-bound watering refinement passes (`8178e4`), including the final
same-room/bench/zone and authority cases in later control normal runs.
No failed run is counted as a pass.

Seven hand-written controls distinguish and restore source, each with one
intended assertion failure after a passing normal run: empty probe
(`092866`/`c1545a`), task performer (`e6725e`/`011850`), stale deadline
(`d6f6a0`/`2031df`), closing-time guard (`6cf371`/`141637`), watering
amount (`9bb667`/`509fcb`), approval before fulfillment
(`b91c4f`/`22e1ee`), and probe-to-bench binding
(`e70a74`/`52f146`). Each control exits 0. Logs use
`/tmp/artroom-g0-control-` and retain the exact injected change's assertion.

All fifteen Grow cases pass through the root project
(`690afb`/`8418ce`, exit 0), with native replay of accepted histories
and explicit scripted per-actor grants. Grow typecheck passes
(`7e7830`, exit 0). These focused checks cover this source checkpoint;
the full gate remains reserved for the completed submission. Dependencies
and lockfile are unchanged; no package installation was performed.

## Site, presence and room-summary checkpoint

`site.ts` is the second application definition. The site uses native
directory creation; its three room rows each make a native lane creation
request for the exact native digest of `room.ts`. A pending row becomes
active only after the child's actual applied result, and stores that
child's scope from the verified sender. Refusal/conflict makes it failed.
The child's actual confirmation activates it. This is a declaration and an
in-memory native exchange, not an installed multi-scope package, enrollment
or a hosted birth. M2a still supplies the application's hosted scope work.

Room genesis may carry a site and its exact create-room fact together.
Standalone room fixtures omit both. The fact is verified and must belong to
the named site. A wire item reference expands to its opening fact: it must
not be misread as a bare integer in another scope.

Sensors take `report-site` on the room row, with a claimed open-alert count.
An exact native range-count guard counts open, held and authorized alerts.
It refuses a wrong count and sends a relation to the site. The site admits
it only from that registered row's actual room scope, under the room
definition name. The relation's native monotonic revisions supersede an
older update delivered later. The stored count is unknown until a report;
it is the last reported snapshot, not an atomic cross-scope counter. A
later alert change needs another report. The record keeps that report fact.

Arrive and leave are tender-only signed comments and write no items.
`presence.ts` reads accepted site entries in journal order and derives
each signing member's latest location. Moving to another room replaces the
old location; leaving the old room afterwards does not erase the new one.
One tender's leave does not erase another tender. The controller named by
a delegated grant is not substituted for the signing member. This small
projection is for the site journal; it is not the future host read tool.

Three focused cases pass (`fe771c`), including three native child births,
results/confirmations, exact definition closure, independent presence,
sender binding, count refusal and out-of-order relation delivery. The
wrong-sender case uses alternate declared sender data that deliberately
addresses row 1: its creation and source send are judged normally. No entry,
message or state row is inserted by hand to fake that proof.

The first run (`80031b`) failed because the declaration used a raw hash
instead of the native domain-separated definition digest. The next run
(`92e30c`, diagnosed by `331f80`) failed because the opening reference
on the wire was declared as an integer. After correcting that fact type,
both cases reached replay but lacked the consumer's retained foreign entry
bytes (`158e43`, diagnosed by `55c607`). The fixture now retains the
exact entries named by each native `uses`, verifying both original entry
hash and content digest. The fixed run `da3603` passes. All these earlier
failures remain failures. No native digest, judge, transport or replay rule
was changed.

Three hand controls distinguish and restore source: registered sender
(`174f74`/`de1f4f`), exact count (`6d3ebb`/`c70c15`) and leaving
only the named current room (`6b5726`/`af2dac`). Each normal run passes
three cases, then one intended assertion fails under the respective fault;
each control exits 0. Logs use `/tmp/artroom-g0-control-site-`.
All eighteen Grow cases pass together (`2d2628`/`b44b25`), and typecheck
passes (`e59a28`). Multi-scope replay now reads the actual retained foreign
entries and every scope's declaration/prepared inputs, with explicit
as-recorded fixture authority. Dependencies and native kernels are unchanged.

## Combined native fault history

The existing four-zone climate case now runs inside Room A of an actually
judged three-room site fixture. Room A commissions four zones, twelve devices
and 100 distinct bench cells, with exactly 25 benches per zone. No rows,
genesis entries or confirmations are fabricated. The other two rooms have
their own native histories; they are not simulated by a second label on A.

The day tender arrives and probes C4. After the vent fault, fan trip and
cross-draft, the incident's alert is reported to the site with count 1.
The tender takes its repair task. While the operator holds the alert, a D4
probe records high EC and the irrigation member asks the head grower for
early watering. The one room history contains the held alert, taken task and
asked watering request together. Hold expiry still refuses the original
signed authorization by its moved revision. The operator's current act cuts
the heater, while the head grower approves the independent fixed watering
amount and the irrigation member records fulfillment.

The task report leaves the vent in reported error until the sensors'
separate healthy report. The original late heater-on observation, cooling,
cross-draft restoration, new restoration proposal, operator authorization and
exact incident closure remain. Count 0 then reaches the site, and the tender
leaves. C4 and D4 become stale at their own actual probe deadlines. Eight
separately labelled non-native owner records cite eight distinct accepted
target-command facts, including the vent owner's refusal. They are outside
the journal, device state and native operation protocol.

The four room cases pass (`c2a519`/`7a76ee`, then the strengthened
25-benches-per-zone assertion in `6cc562`/`30e4da`, exit 0).
Typecheck passes (`05f261`). Every actual site/room history replays
consistently from canonical entries, exact retained foreign bytes and actual
prepared-rule inputs under explicit as-recorded fixture authority. This
extends the existing full climate witness rather than creating another
parallel version of that same story. The application definitions are
unchanged from the preceding eighteen-case site checkpoint.

## Full private M1 package and declarative scenario bridge

The committed G0 code at `08d2445d6` now passes the actual M1 check bin at
`7a1d04bc4`. The retained fixture package contains both exact native
definitions, with site as the package entry and room in its create closure.
The site scenario has seven steps; the room scenario explicitly selects that
room definition and has 199 steps. It commissions all 100 benches, records
the concurrent fault/task/watering story, submits the authorization signed
before the hold, and asserts the original moved-revision refusal, separate
device evidence, exact incident range and independent stale deadlines.
Agents name their explicit TEST controllers. The eight simulated owner
outcomes remain separately labelled side records.

The actual command exits 0 (`ac35f6`/`1f5c49`): both definitions validate,
and native Core/Node SQLite replay is consistent through sequence 5 for the
site fixture and 160 for the room fault. The fault input is 37,887 bytes,
within M1's existing 64 KiB/256-step allowances. The process runs in an
external scratch directory with invalid empty custody variables; it reads
no operator setup or key and writes no release package.

Semantic id:
`sha256:c000fdac0decf912cd03f37e087638f59e7bf1c6821c9566c4fce04f599d3245`.
Presentation id:
`sha256:923b11ed38f7771ba6a010b18e61a69f46367194f00c0e4b77171000fdbbba9c`.
The presentation is a labelled static fixture page, with no production
screen claim. The site root's creation sends stay queued in M1's single-root
adapter; actual native child births/delivery/confirmation remain the separate
G0 fixture witness above. This is not a public Main CLI, trusted install,
M2a, enrollment, hosted room, device owner, real sensor, archive admission or
deployment witness.

The harness is `/tmp/artroom-g0-full-m1-bridge-20261018.mjs`; the retained
project is `/tmp/artroom-g0-full-m1-bridge-20261018-Y8yXRM`. Result log:
`/tmp/artroom-g0-full-m1-bridge-result-20261018.log`. Actual CLI stderr is
empty. The parent loader's DEP0205 deprecation warning remains in the log.
The exact eight-file, 81,354-byte inventory is
`/tmp/artroom-g0-full-m1-bridge-proof-20261018.json`, SHA-256
`27089d602e76908a7602fe07de79d8a54d0802a5639661d9ee3a9acee859e156`.
It records both clean code heads/trees and verifies ten native judge, genesis,
guard, rule, fixture, Core, SQLite, turn and replay paths byte-exact with
reviewed Main `bb3d3062`. There is no copied M1 implementation in G0.

## Maintained standard-check input

`examples/grow/check/` now keeps the config, labelled static fixture page,
site scenario and room fault scenario. `examples/grow/prepare-check.ts`
writes a new private directory with those files and canonical native JSON
generated from the maintained `site.ts` and `room.ts` declarations. There is
no second hand-maintained copy of either native definition. An explicit
destination must not exist. Existing files are never replaced.

From the repository root, the preparation command is
`node --import tsx --disable-warning=DEP0205 examples/grow/prepare-check.ts`.
The CLI's existing pinned loader supplies tsx. No package is installed.
The command prints the new directory. That directory is input for the
reviewed public `dap check` once the M1 foundation lands.

Preparation and the Grow typecheck pass (`36c6ff`). Formatting keeps one
room step per line and stays within the scenario allowance: 38,915 bytes
for 199 steps. The site has seven steps. A focused comparison (`69b4e7`)
shows both generated declarations and every scenario value equal to the
retained private bridge. Reusing the output directory refuses with EEXIST
and preserves a marker. This compares prepared data only. It does not claim
a new native execution or a public check result.

Prepared output is
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/dap-grow-check-1XdNRb`.
Its preparation log is `/tmp/artroom-g0-maintained-prepare-formatted-20261018.log`.
No test process remains live against this Grow source. The independently
frozen M1 foundation gate uses its own worktree and dependency links.

## Landed Main check witness

M1 foundation now lands at Main
`feccbbcfef618ed560e441a7711ce80941b57c22`, tree
`b5a0a28f1b0809bf5b090689761ff5557f3c5998`, under durable receipt
`b44d7c7561d3ff77d20334861e3cb3d5fc74616d`. Its exact-head approval and
Main audit pass. G0 refreshes that Main without changing its native data.

The first root dependency audit (`f3e7cd`) found a lock mismatch before any
CLI run or stamp write. A read-only audit records two mismatched installed
versions. The root view remains untouched. A new isolated checkout at exact
Main uses a COW copy of the approved dependency view, with thirteen links
rebound locally and 106 installed versions verified (`841654`), zero installs.
Audit: `/tmp/artroom-m1-public-main-verified-view-20261018.json`.
G0's separate view also verifies thirteen links, 106 versions and the sole
CLI scope dependency reclassification before refreshing its ignored stamp
(`61f592`). No package is fetched or installed.

The maintained fixture is prepared at
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/dap-grow-check-606d4f`.
The actual Main CLI at
`/tmp/artroom-builder-public-m1-main-20261018/packages/cli/bin/dap.js`
runs from outside the repository with empty custody variables. It passes
(`9a0071`/`679b8e`, exit 0): two declarations validated, site seven steps
through entry 5, room fault 199 steps through entry 160, eight labelled
non-native owner records, empty stderr. Semantic and presentation ids equal
the earlier private bridge. Raw stdout/stderr logs use
`/tmp/artroom-g0-public-main-check-20261018.`. Grow typecheck passes after
the Main refresh (`e65a0c`). No unreviewed M1 developer code is used.

The [G0 review primary](2026-10-18-grow-g0-review.md) describes the completed
data boundary and the remaining production milestones. The earlier sections
retain their historical checkpoint limits rather than changing those records.

## Functional witness time budgets

The first completed G0 gate (`1cedb0`/`83719` through terminal `51894a`)
fails at head `69f3c4c6b41003f5c165a0474986d5059950d1d6`.
Install is skipped, whitespace/typecheck pass, and all eighteen Grow cases
pass. Two other tests time out at five seconds: the CLI's six-command
scenario witness and Git's two-format validated-parent archive witness.
The test phase records 1,778 passed, two failed and three skipped tests.
The Node and Counter follow-on commands do not run after that failure.
Raw logs are
`/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.SzwZXKXn4F`.

Only those two functional test budgets change to thirty seconds. No assertion,
fixture, child-command limit or native archive limit changes. Both selected
witnesses pass (`aef1e2`/`9e076f`, `0c4d0d`/`71b0a3`), with the owning
test typechecks (`b11036`). Logs are `/tmp/artroom-g0-cli-budget-20261018.log`
and `/tmp/artroom-g0-git-budget-20261018.log`. Git reports that confstr cannot
read its Darwin temp directory and falls back to `/tmp`; that warning remains.
This permits bounded subprocess work under the harness. It is no performance
measurement or runtime stability cure. Production package source remains Main's.

## Remaining G0 review work

The public Main check path now passes the maintained input. G0 still needs
its required gate, Source submission, independent review and local landing.
Gate runs once at the completed submitted head. M1's broader developer half
and installation acceptance remain separate open work.
This is not G0 acceptance, a host install, a native device owner, a real
sensor/device, photo custody, production archive admission or a deployment.
