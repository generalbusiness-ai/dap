# G5a: native device commands

Request: `5aae9b0ab67909ee49118dc49d465fe881a8037a`.
Promise: `79f23cb727ca2ae086f49764b6b8ab7a69d2f950`.
Preparation base: actual Main `426504d89b3140e5b3f769c546e846529cf9f8c3`.

The chosen delivery is one complete Source head for the capability, its
manifest and install grant, the Grow scenario, and replay. A split requires
an explicit decision before filing. The separate durable-presence head may
take priority. Both precede G5 and P1 to P3.

## Preparation findings

Preparation inspected the contract capability table, definition declarations,
capability validation and derivation, preparation judgments, native Core
preparation, reservation admission, package metadata, and the v2 installer.
Assertion `f2d1280e04b309ea9997e69439545476586f70b7` asked planner to decide
the required extensions before implementation. These were the initial gaps:

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
target, level, target-writing fact, and exact owner binding. Without an
install grant, target acts retain their present behavior and open nothing.
Only the capability writes outcome and outcomeAt. Target and sensor report
writers remain separate. No physical device or outside operation is claimed.

## Adopted form and cohort decisions

Planner assertion `f33619936fa8c1435a73a6d6f2d519bea5aff461` decides the
bounded extensions: capability-owned outcome/outcomeAt item effects with
named validator refusal of ordinary writers; one reserved owner-answer
preparation per pending command, with all other preparation remaining new
work; a package capability declaration containing device kinds and exactly
one owner requirement, with the actual existing full MemberRef chosen at
install and retained in the authenticated proof; checked Site-to-Room
delegation; targetAt fact binding independent of sensor reports; late
superseded answers closing their own records without rewriting the current
device; and finite command/preparation metadata in the archive owner table.
Runtime and replay must use the same pure code. No grant means no command
opening; existing independent target/report behavior remains available.

Planner report `9192ef3fce43017abb91864c0f87cb76de8a5be9`, adopted by
`84753eff`, allows G5a before S2a and reserves new numbers above S2a's
unpublished cohort. The reservations are:

| Work | Register | Directory | Membership | Rules | Destination |
| --- | --- | --- | --- | --- | --- |
| S2a | 14, 15 | 13, 14 | 8 | 7, 8 | 9, 10 |
| G5a | 16 | 15 | 9 | 9 | 11 |

These numbers are never reassigned, including a reservation not used by
this head. A gap is allowed; one task never renumbers another's pins.
Existing shipped IDs retain their exact data and meaning. The implementation
will register only the new pins it actually needs and keep any unused
reservation for a later G5a head. The existing Membership 7 may be reused
where its current forms already suffice. No new pin is supported merely
because its number is reserved; the pin table must reject duplicates.

Landing order remains durable G3, then G5a. S2a still needs its own passing
gate and exact review, and S2a plus S2b precede the demo archive slice.
The G5a preparation checkout has incorporated audited Main `9060775e`.
G3's exact `3f7cce84` subsequently passed review and landed at Main
`f6d402b0`; that actual landing is now incorporated here. No G5a code was
changed during either G3 gate.

## Grant metadata foundation

The first implementation checkpoint defines a bounded device grant with
the exact capability ID, one full owner MemberRef, one-to-three device
kinds, the root definition and at most eight allowed definitions. Native
creation metadata version 2 carries that grant and a one-hop delegation
flag, outside the application's domain fields. A granting root must match
the recorded root definition. A receiving child must match the allowed
definition list and retains the exact owner, bounds and full membership.
The native send form forwards the grant once with delegation disabled;
unlisted children receive the existing membership context without a grant.
Domain fields cannot select this metadata. Version 1 remains unchanged.

The pure native genesis/send witness now passes six cases, including a
same-definition second hop that cannot inherit the grant, later sends from
retained genesis, an unlisted child, and mismatched owner membership
incarnation/root/child definition refusals before any child send. This
fixture labels its parent metadata and authority as scripted: no native
installer emission or actual existing-owner membership check is proved yet.
Log `/tmp/artroom-g5a-grant-context-first-20261019.log`, original 47470
closed exit 0. Both derive compiler targets pass in the matching
`grant-context-types-first` log.

One control removes only the send relay's delegation flag check. The
unchanged same-definition second-hop assertion fails (five pass, one fail).
Exact restoration returns six passing cases. Original control 4368 closed
exit 0; driver `/tmp/artroom-g5a-onehop-control-20261019.py` and matching
directory retain both runs. Its baseline log is copied from the preceding
exact-source pass, not another baseline execution. Source SHA-256
`bcf61ac1027db310d0dfa956b790a3d7ee6f8d391d6bd890024d4890af26880b`;
unchanged test SHA-256
`82124643f32b983b88c9f6947eff6ba9ad33bd17ffc55ab7c09702b18e0d9759`.
This is one targeted control, not a mutation sweep.

The capability's command records, owner preparation and slot ownership,
reservation admission, actual native install producer and owner observation,
archive metadata and Grow scenario integration remain to implement. No G5a
gate, exact-head review, production grant or device execution is claimed.

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
