# G5a: native device commands

Request: `5aae9b0ab67909ee49118dc49d465fe881a8037a`.
Promise: `79f23cb727ca2ae086f49764b6b8ab7a69d2f950`.
Base: reviewed Main `3ed2a08a50f31e84ea42b4f6027684e14a8cedb8`.
Historical gate and baseline comparisons below ran on Main2127. The later
Main adds only the approved sales-design note; receiptbcfbc8dc and its
exact one-path Git delta were read before incorporation.

G5a adds device-command@1, its bounded native install grant, Grow commands
and owner answers, and shared runtime/replay code. Target, sensor report
and owner outcome have separate writers. No device or provider operation
runs. The delivery is one complete Source head. Three full gates failed;
the corrected full gate and exact-head review remain pending.

## Decisions and native pins

Planner decision `f33619936fa8c1435a73a6d6f2d519bea5aff461` specifies owned
outcome slots, bound-one owner preparations, an existing full MemberRef
chosen at install, one-hop delegation, and targetAt fact binding independent
of item revision. An older answer closes its own command only. Runtime and
replay use the same pure code. No grant means no command opening.

Cohort decision `9192ef3fce43017abb91864c0f87cb76de8a5be9`, adopted by
`84753eff`, permits G5a before S2a and reserves these numbers:

| Work | Register | Directory | Membership | Rules | Destination |
| --- | --- | --- | --- | --- | --- |
| S2a | 14, 15 | 13, 14 | 8 | 7, 8 | 9, 10 |
| G5a | 16 | 15 | 9 | 9 | 11 |

The implemented device-application cohort uses Register16, Directory15,
Rules9 and Destination11, with Membership7 and Inbox1. Membership9 remains
reserved. The pin witness contains 49 names: four additions and all 45
shipped data digests unchanged. Defaults and earlier proof formats remain.
A reserved but unused number is not supported or reassigned.

Local-boundary decision `86916ce87e516b14b57842abe44d5a68a3e33b6e`, adopted
by `ddc894d7`, chooses an explicitly scripted parent proof for local check,
with real child genesis and preparations. Genuine native issuance is proved
separately. Durable G3 has landed and is incorporated. S2a still needs its
own passing gate and review; S2a plus S2b precede the demo archive slice.

## Command, answer and reservation

A target-writing member transition sets target, level and its own targetAt,
then opens one command for the bound device through a declared capability
effect. The record is keyed by that entry and captures device, kind, target,
level, targetAt and the granted full owner. Opening clears the previous
outcome and outcomeAt. Without an install grant, target acts open nothing.
An outside-granted kind is refused as device-kind-ungranted.

Only the capability owns the optional mutable outcome/outcomeAt pair. Its
answer names the exact full local command fact and closes the command once
as confirmed, refused or unknown, recording description and answerAt.
For the current target, it writes outcome and its answer position. An older
answer closes its own record without changing the current device. A sensor
report may advance the item's revision independently. Missing answers leave
outcome and outcomeAt empty.

The validator names capability-slot-owned for ordinary act, receive, timed
or opaque native-rule writers. Target writers must set their own targetAt
and open a command for that same subject. Generic derived-effect checks
also enforce the declared owned slots, answer kind, optional/mutable shape,
valid value, local answer position and at most three derived effects.

The owner preparation uses current native signing identity in the recorded
membership, within its scope and validity window. The trusted capability
table selects scope-granted admission. The intent and transport cannot
select it. Actual role actions remain in the recorded grant; no target
permission or invented answer action is required. Revocation, wrong key or
incarnation, removed member, inactive controller, scope, expiry, age and
high-water guards remain active.

Every open command reserves one complete bounded answer entry. Only the
preparation naming that pending command, closing its record and moving
decided from zero to one spends the reservation. Other preparations remain
new work. Whole-scope admission still enforces its ceiling for settlements.
The preparation index is derived history; no separate retained input is
needed. Finite archive metadata names command records and answer
preparations, with no outside operation owner. Installed Grow archive/export
admission remains S2b work.

## Native install and delegation

The signed package declares device kinds in sorted order and owners=1.
It declares no member identity. At most eight package definitions may use
the finite capability. Install chooses a full existing MemberRef and checks
its membership, active member/key and controller standing. An owner who is
also the signer is served by the actual grant observation; the native
observation rules do not invent a second own-member read.

Rules retains the owner, bounds, root and allowed definitions in the
canonical genesis wrapper, within its existing twelve value slots. The
wrapper is at most 20 KiB and its device grant at most 4096 bytes. Directory
checks exact membership, root and permitted declarations, then emits the
reserved version2 creation context. The root may relay that grant once to
a listed child, with delegation disabled. Domain fields cannot choose it.
Legacy/version1 metadata keeps its earlier meaning.

SDK and MCP retain the full owner in the signed install selection. CLI
supports the explicit device-application cohort and package-install
`--owner <full-member-JSON>`. The host accepts this finite native capability,
not package-supplied capability code. The new destination origin policy
accepts the exact new native factory; the old destination refuses it.
Origin admission is no publication or outside-write claim.

## Grow and local check

Grow's set-vent, set-fan, set-heater and authorize open commands for their
target-writing device. Device and layers projections keep outcome separate
from target and reported values. Portable fact kinds accept known native
capability steps, including device-command@1:answer, and refuse unknown
capability, version and step names.

The maintained fault scenario replaces all eight external owner labels
with native preparations. Its 222 steps retain all 100 benches and the
original fault, restoration, authority and stale-request journey. They
check command closure, exact targetAt/outcomeAt, named non-owner,
unknown/closed refusals and an exact answer retry. It reaches head169 with
eight accepted preparation entries. The same full journey without answers
replays through161: every command stays open and every outcome stays empty.
The small no-grant witness separately opens no record and refuses an answer
as device-command-ungranted.

Local check scripts its parent creation draft before sealing, then runs
actual Core/SQLite child genesis and preparations. It anchors both parent
facts explicitly: creation0 and confirmation1. Anchoring only creation
correctly failed when proving confirmation required replay of that scripted
parent genesis. The actual child journal and preparations are replayed.
The report exposes the full owner and both anchors, labels the boundary as
scripted rather than a native install, and cites the genuine install
witness. Local TEST identity grants are trusted as recorded. No sealed
journal rewrite or production issuer is introduced.

The runner supports native prepare steps, exact named refusal expectations,
capability-record assertions, full `$fact` and saved receipt `$position`.
Exact preparation retries return their original receipt and count once.
A custom factory cannot silently ignore a requested scripted grant. The
independent MCP read fixture retains its real local Site/Room births and
scripted authority, with no install grant; it removes obsolete owner labels.

## Acceptance witnesses and limits

| Requirement | Owning witness |
| --- | --- |
| Set-heater and authorize open and reserve commands | `packages/scope/test/grow-owned-scopes.test.ts`, genuine native install and SQLite |
| Owner closes and writes; reports and late answers stay independent | Same Grow Worker witness; pure command forms also cover unknown as final |
| Full granted owner only, with current identity | `packages/derive/test/forms-device-command.test.ts`, `forms-grant.test.ts`, native install/restart witness |
| Ordinary outcome writers refused by name | Pure command validator cases for act, receive, timed and opaque native rule |
| Unknown/closed and missing/outside grant named refusals | Pure command forms and `packages/cli/test/application-scenarios.test.ts` |
| Fault journey and missing answers replay | `packages/cli/test/application-examples.test.ts`, explicitly scripted local parent; actual check-command run |
| Reserved answer fits when a new act does not | `packages/scope/test/device-command-install.test.ts`, actual sixteen-entry SQLite edge and restart |

The two Worker witnesses use real native scopes, production authority,
Membership, Core and SQLite. Repository creation, Git/package HTTP, clock,
scheduler and setup read access are TEST fixtures. Native Directory creates
Site with delegation enabled; Site creates Room with delegation disabled.
Issued-session projections read the actual answer. Site/Room and the
separate Rules/Directory/device/Membership histories pass strict replay
with proven grants, production code and no anchors.

The quota witness sets its actual child's sixteen-entry ceiling before
exact native creation delivery. It measures Used+Reserved at sixteen,
denies a new report without changing state, removes the owner's target
permission, deletes cached package content and evicts the child. The owner
still answers on current identity and its installed grant. Closure releases
one reservation while preserving the ceiling and independent report.
Replay uses shared default bounds for its foreign Register/Destination
histories; it does not check that smaller child ceiling. Earlier attempts
to impose sixteen globally failed at Register's real duty; 128 globally
failed at Destination's duty. Those failures remain evidence.

Focused evidence before the first gate, each original terminal exit0:

- Native capacity/origin/replay: original16737,
  `/tmp/artroom-g5a-native-device-capacity-origin-replay-20261019.log`.
- Native Grow delegation, both command reservations, projection and two
  proven replays: original17618, `grow-native-outcome-projection` log.
- Seven owning local files/29 cases: original17760,
  `grow-scripted-preparations-focused` log. The complete unanswered run
  passed in original51502; its title filter skipped MCP routing, later
  covered in the complete owning selection.
- Four MCP inventory/read files/nine cases: original55561,
  `grow-mcp-inventory-and-reads` log. Actual MCP metadata generates the
  documented install schema and catalogue.
- Actual check-command over both maintained scenarios: original16523,
  `grow-dap-check` log, eight preparations and both explicit parent anchors.
- Pure command/reservation five cases: original68657; current-identity
  three cases:39241; finite archive classification five cases:4444. The
  archive row is synthetic and proves classification only.

Log stems above have prefix `/tmp/artroom-g5a-` and suffix
`-20261019.log`. Owning compiler targets also passed. No new G5a browser
screenshot is claimed; projection observations are programmatic SDK/MCP
reads. There is no simulator, device/provider execution or deployment proof.

Two targeted controls distinguish plausible wrong behavior. Removing only
the delegation check fails the unchanged second-hop assertion, then exact
restoration passes six cases (original4368, onehop-control driver). Replacing
full owner comparison with bare member name fails the unchanged foreign
incarnation assertion, then restoration passes five (44132, owner-control).
Their baselines copy preceding exact-source passes, not fresh baseline
executions. Historical one-hop source/test SHA-256:
`bcf61ac1027db310d0dfa956b790a3d7ee6f8d391d6bd890024d4890af26880b` /
`82124643f32b983b88c9f6947eff6ba9ad33bd17ffc55ab7c09702b18e0d9759`.
Historical owner source/test SHA-256:
`bbda040a70ee70ded921f20788c1b5c78ac14abe539fd9df7ec35606a01df9ee` /
`c3a84a537d6b7db30ee83d1b0a6025c566b817b2b96497d2d4ef3c8ce7b3284d`.
Neither is a mutation sweep.

## Gate failures and corrections

First gate head461c1e3fca3a0dbe9586c5488bf73456de96d648,
tree7556440081af4621993e4986a0e5f3b044a67b30: original80923 naturally
closed exit1. It passed whitespace and full typecheck, skipped install,
and reported 1929 passed, ten failed and three skipped cases across402
files. Two failures were stale generated MCP/Page assets. Eight were native
timeouts: seven at five seconds and dense proof residency at sixty.
Test step elapsed1285.6s, CPU1512.3s; typecheck8.5s, CPU32.6s. A brief
read-only Worker stack sample was taken after failures; these are observed
run costs, not clean performance benchmarks. No outer timing wrapper was
used and no source/dependency edit occurred while the original ran.

Raw logs: `/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.HoVDOGeXRq`.
Outer log: `/tmp/artroom-g5a-complete-gate-20261019.log`. The original
process receipt, machine/load metadata and two-second sample are retained.
No interruption or infrastructure dismissal is claimed.

The unchanged eight-case selection reproduced seven timeouts (43216);
application establishment passed, while the alarm case still timed out.
Lending alone also timed out at five seconds (50443). A diagnostic-only
30-second allowance completed its unchanged assertions in10.53s (5053).
That diagnostic is not gate acceptance.

A clean separate Main2127 checkout, with private version-identical COW
dependencies, passed Lending at its normal limit in3.73s (94359).
The new validator had scanned every item slot for every opaque native
rule, including definitions without the capability. The fix limits those
device-specific cross-effect scans to definitions declaring device-command.
For legacy validation, repeated ownership work changes from rules times
slots to one constant check per rule. Item-slot validation still rejects
unlisted ownership, and ordinary writer/runtime protections remain active.
Lending then passed its unchanged limit in3.77s (34252), and all five owned
command-form cases passed. Shared-machine timings support the diagnosis;
they are not a general performance guarantee.

After that fix, the eight-case selection had seven passes and one different
Lending failure: no native query reply (85898). The same selection passed
all eight on Main (61011). That interaction remains unexplained and is
retained; it is not called a baseline defect. The existing broad stability
request1d3a13e3 is not claimed complete.

Both generated assets were rebuilt by their owning scripts. Freshness
checks passed four cases in two files (26800). Lending and both genuine
native device/Grow witnesses then passed together at their original limits
(95626). No test deadline or assertion was changed. Derive's two compiler
targets and all five ownership cases also pass after the fix. The corrected
full gate is still required before review.

The exact corrected-head mixed selection then passed all eight cases with
six unselected skips (74561, corrected-native-mixed-selection log). Its
original limits remained. Gate554cb1bb839f3b46cb3392c785a2177cad0def8d,
tree86d82c6e5b8b55beb6ff7307b394a24d91545b77 naturally closed89612 exit1:
1938 passed, one failed, three skipped across402 files. All stale assets
and eight original timeouts cleared. The prior Lending query-reply error
did not recur. Typecheck8.4s/CPU32.2s; test481.1s/CPU678.9s. No profiling
or source/dependency edit occurred during that gate.

The remaining assertion was hosted MCP H5 at line396: an offline inventory
change expected one reconciliation notification, but the background SSE
reader still held zero after a fixed30ms sleep. Stream opening first awaits
an asynchronous inventory snapshot. Positive SSE checks in that existing
case now await the observed header or notification with its existing
bounded until helper. Exact counts, quiet-period checks and test deadlines
remain. No production MCP code changes. The focused case passes (11560,
with a retained resolve-pending teardown warning); the complete owning
hosted file passes all twelve cases (97781, hosted-observed-events-file
log). This is a concrete synchronization correction, not a general closure
of the separate stability request.

Second gate outer log: `/tmp/artroom-g5a-corrected-complete-gate-20261019.log`.
Raw: `/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.Ug7IT3AcXU`.
Both failed gates remain evidence. The final corrected full gate is pending.

Attempt3 at b5120d5f772d119261ecba816ed2e0f463388d4e,
tree5015f6e603cd22b16e9e99dc6070497180e154f0 naturally closed88101 exit1.
It passed1932 cases with seven framework5000ms timeouts and three skips,
across402 files. H5 and all other behavior assertions passed. Failures were
application establishment, Lending, manifest T3, native3 publication, Page
source preview and both Page task-data stories. Stage traces show real
setup/publication/review progress before the framework limit. This recurrence
means the prior focused/gate passes do not establish full-suite stability.
No profiling or source/dependency edit occurred during the run. Typecheck
8.4s/CPU32.4s; test941.2s/CPU1152.6s. Outer log is
`/tmp/artroom-g5a-event-synchronized-gate-20261019.log`; raw logs are in
`/private/var/folders/2x/wylr59t17ds36l1l7ng25y7w0000gn/T/tmp.YfkOY40xim`.

Host load and memory observations are retained without a cause claim.
The memory-pressure query reported59% free; a low instantaneous free-RAM
sample alone is not proof of pressure. Decision request34bc30df asks planner
whether to give the functional workerd project an explicit bounded framework
allowance, preserving case-specific limits and every modeled protocol,
read, clock, capacity and latency assertion, or put the broader stability
investigation first. It also asks which Source owns that correction.
No test limit or acceptance condition has been changed. The ownership
validator witness was strengthened to reject unlisted owned slots in both
ordinary and opaque-rule definitions; all five cases pass (74252), as do
Derive's two compiler targets (81347). All three failed gates remain
evidence. No seal, Source or review has been filed.

## Dependency preparation

The G5a checkout owns an APFS COW dependency copy from the frozen G3 view:
106 maintained and four named nested manifests have equal bytes and
different inodes; thirteen workspace links are relative and local. There
were zero installs and no lockfile change. The donor remains frozen and
was never executed for this work. This verifies manifests and links, not
full tarball integrity.

Audit `/tmp/artroom-g5a-dependency-view-20261019.json`, SHA-256
`3fcdee9504104a0f7040b357b7851e2820044edfe05fd17a9e849e9e37ea70bc`.
Lock SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.

The separate Main comparison copies only the current private dependencies,
with110 identical manifest bytes/different inodes and thirteen local links,
zero installs, and its own cleared Vite caches. Its audit is
`/tmp/artroom-g5a-baseline-main-dependency-view-20261019.json`, SHA-256
`2bf06b9fca26f30eb69502f84b6e287c7398e9763370ab1ab016c97de51d90a5`.
Every listed original diagnostic process is terminal. Frozen earlier
candidate, dependency and evidence views were neither changed nor executed.
