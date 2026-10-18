# G0: grow definitions and the fault scenario

Preparation for request `d3a42cb233e365ee2fa982a44101f25d05d359b1`,
accepted by `f46668cfd700e2fb5aee76eed7704cb91e81f4bc`. Runtime baseline:
reviewed Main `6dac9c76339ece16a99275d5360818a32a4dcf4c`.
The complete 608-line grow design was read at
`7bbd272e810539794c326a0274858d74448b64d5`, and plan 033 at
`46f256ae5a0005ecaaf2c51cb9eb8fe50c65c850`. The design has not yet landed
in this baseline; this note uses its explicit immutable source.

G0 supplies site/room definitions and a simulated fault scenario, with no
view code or deployment. The simulator is the demo's command owner and
reported-state source. A target is intent, a reported state is the sensors'
observation, and a command outcome belongs to its owner record. None may
silently stand in for another. Photo custody and a real device owner wait.

## Current forms and reusable code

- `packages/contract/src/definition.ts:186` makes a guard's refusal reason
  a string. Written rule guards read exact prepared inputs; their values
  are rechecked at commit (`packages/derive/src/rules.ts:30`).
- `packages/contract/src/definition.ts:219` lists declared effects. They
  update items or call the fixed hold/git-read capability forms. They do
  not declare an arbitrary operation owner.
- `packages/contract/src/capability.ts:19` admits only hold/git-read names.
  A device-command capability is absent. Adding a fake operation through
  a raw folded entry would not witness a judged command.
- `packages/derive/test/fixtures.ts:381` provides the existing in-memory
  ledger, real judges, seal/fold and timed drain. Its default all-actions
  grants are stand-ins and must be replaced by explicit per-actor scenario
  grants to witness the grow authority separation. It is not native
  enrollment, provider or production sensor evidence.
- `examples/lending/test-support.ts:1` shows the current rule preparation
  and evaluation path. G0 can use that runner before M1's `dap check` exists,
  while keeping a replayable scenario rather than a view-only simulation.

The site's presence acts and the room's observe act remain comments as
the design requires. Comments cannot maintain mutable zone/presence items.
Application names `site` and `room` are definitions; they do not add new
values to the contract's fixed native ScopeKind union.

## Concrete decisions requested

1. **Command outcomes on today's runtime.** Plan 033 names the simulator
   as command owner but the declared capability forms cannot open a
   device-command operation. Please choose the intended G0 evidence
   boundary: a separately labelled scenario-owner record, explicitly not
   a native capability record; or a separately commissioned bounded demo
   capability with its own native opening/outcome/reservation/replay rules.
   The latter is additional runtime work and cannot be supplied merely by
   using another capability's name. Recommend the first for G0, with the
   target and sensor acts judged normally and the simulated outcome record
   explicitly distinct until the owner protocol is designed.
2. **Reading evidence for guards and recovery timers.** Section 6.1 makes
   observe a comment, so it cannot update the zone state read by a guard
   or timed rule. Recommend a sensors-only `report-zone` transition that
   cites the exact observe fact and records its guarded band status and
   summary time. It does not turn every outside sample into an entry.
   The declared summary cadence remains 300 seconds, with threshold entries
   on band crossings. This gives alert/recovery guards a recorded subject
   without silently adding effects to observe. Confirm this addition or
   specify how the guards consume the comment-only projection instead.
3. **Recovering and closing.** The G0 request explicitly asks for recovering
   and closed timed rules; the design instead says the climate agent takes
   close-incident when all zone cells are in band, and names no recovery
   delay. Hold is explicitly 60 seconds and stale bench is 48 hours. Which
   governs incident closure? If timed closure is intended, please state
   its start condition and duration. A concrete option is a recorded
   all-cells-in-band observation starting recovery, then 60 seconds stable
   in band before timed closure; another out-of-band report cancels that
   recovery. This option is proposed, not adopted.
4. **The quoted error refusal.** The generic refusal reason is static.
   Recommend `device-error` plus the sensors' exact stored description in
   the scenario's refusal explanation/read result, bound to the refused
   device revision. This preserves the distinction between a command
   refusal and the sensors' evidence without changing the judge's reply
   schema. Confirm that this meets the note's requirement to quote the
   description, or name an existing supported wire form that should do so.

No choice above has been encoded in definitions, a capability or fixtures.
No test or gate was run for this document. The rest of the declared items,
typed target/reported fields, role grants and source layout can be prepared
independently while these decisions are pending.

## Required scenario evidence

The scenario must distinguish early/unauthorized alerts from the eligible
alert, a failing device from an unchanged last target, a heater command
from a sensor report and from its owner's outcome, and a held revision
from the new revision after the timed re-raise. An old authorization must
fail; the operator's current authorization must command the heater without
granting the climate agent heater authority. Late reported-on evidence
must remain beside the already-commanded-off target.

Recovery and closure must cite their actual triggering observations and
entry range. Pure replay must reproduce the same recorded result. The
simulator, grants, device owner and any unimplemented capabilities must
be labelled at their actual boundaries. No fictional sample, view card or
fixture owner is evidence of a real device, trusted host install, native
member enrollment or production operation custody.
