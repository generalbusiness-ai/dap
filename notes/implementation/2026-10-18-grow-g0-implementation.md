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

## Remaining G0 work

The full room and site, zones and exact summary references, alert/hold/
authorization/closure, benches/probes/tasks/watering/presence and the complete
fault scenario remain due. M1's `dap check` now exists on its separate
unlanded developer branch; G0's final package/scenario witness depends on
that reviewed public path, without copying unlanded M1 implementation into
this Source. No G0 gate or Source submission has run yet. Gate runs once on
the completed submitted head before independent review and local landing.
This is not G0 acceptance, a host install, a native device owner, a real
sensor/device, photo custody, production archive admission or a deployment.
