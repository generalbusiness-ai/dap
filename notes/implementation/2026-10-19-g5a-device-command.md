# G5a: native device commands

Request: `5aae9b0ab67909ee49118dc49d465fe881a8037a`.
Promise: `79f23cb727ca2ae086f49764b6b8ab7a69d2f950`.
Preparation base: actual Main `426504d89b3140e5b3f769c546e846529cf9f8c3`.

The chosen delivery is one complete Source head for the capability, its
manifest and install grant, the Grow scenario, and replay. A split requires
an explicit decision before filing. The separate durable-presence head may
take priority. Both precede G5 and P1 to P3.

## Existing forms and gaps

Preparation inspected the contract capability table, definition declarations,
capability validation and derivation, preparation judgments, native Core
preparation, reservation admission, package metadata, and the v2 installer.
Assertion `f2d1280e04b309ea9997e69439545476586f70b7` asks planner to decide
the required extensions before implementation:

- A capability effect returns records only. It cannot write an item's
  outcome slots. `StepDerived` also permits records and operations only.
- Preparation is explicitly new work. The reserved-request declaration
  admits `tell` messages only. An owner preparation cannot consume the
  requested bound-one answer reservation through these forms.
- The manifest already carries capability names and bounds. The v2 install
  proof explicitly refuses every nonempty capability list. It retains no
  capability grant or owner binding.
- The item's revision changes on sensor reports as well as commands.
  `targetAt` identifies the target-writing entry. Planner must settle which
  revision binds a command and how a late answer affects the current item.
- A full owner `MemberRef` names a membership scope. A signed manifest
  cannot implicitly bind a bare member name to a future install membership.
  The precise bounded owner binding needs a decision.

The proposed version is `device-command@1`: one open command record per
target act, final confirmed/refused/unknown answers, a named owner step,
and one reserved answer per pending command. The command keeps the device,
target, level, target-writing revision, and exact owner binding. Without an
install grant, target acts retain their present behavior and open nothing.
Only the capability writes outcome and outcomeAt. Target and sensor report
writers remain separate. No physical device or outside operation is claimed.

## Acceptance evidence to collect

The owning witnesses must show command opening by set-heater and authorize;
owner admission and record closure; named refusal of a non-owner and an
ordinary outcome writer; a superseded answer retained on its own record;
an unanswered command left unanswered; the G0 fault scenario and journal
replay without the simulator; and reserved answer admission when a new act
cannot fit. The review must distinguish native storage, pure judgments,
scripted sensor inputs, and any browser observation. Run focused owning
tests during development and one final gate before exact-head review.

## Dependency preparation

The fresh checkout owns an APFS copy-on-write dependency view copied from
the frozen G3 candidate. Only the new view's 13 workspace links and Vite
caches were changed. All 106 maintained external manifests and four named
nested manifests have equal bytes and different inodes from the donor.
There were no installs and no lockfile change. The donor remains frozen.

Audit: `/tmp/artroom-g5a-dependency-view-20261019.json`, SHA-256
`3fcdee9504104a0f7040b357b7851e2820044edfe05fd17a9e849e9e37ea70bc`.
Lock SHA-256:
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
This preparation is not implementation or acceptance evidence. No G5a
implementation or tests had run when this section was written.
