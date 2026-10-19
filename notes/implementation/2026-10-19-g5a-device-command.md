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

The next checkpoint implements command records, owner preparation, slot
ownership and reserved-answer admission. Native installation and Grow
integration are still required before the complete Source head is filed.

## Command and answer checkpoint

The native pure code opens one command keyed by its target-writing entry.
It reads the authenticated grant from exact retained genesis, captures the
bound device after ordinary target writes, and clears its previous outcome.
The owner answer names the full local command fact. It closes that record
once as confirmed, refused or unknown. Only the current target's answer
sets outcome/outcomeAt; an older answer closes its own record only. Sensor
reports can advance the device revision independently.

The validator names `capability-slot-owned` for ordinary act, receive, timed
or opaque native-rule outcome writers. Only the optional mutable outcome
and outcomeAt pair can be capability owned. Target/level writers must also
write their own targetAt and open the same subject's command. The native
version declares the finite answer refusals and three derived effects at
most for opening or answering.

A scope-granted answer still requires current signing identity in the same
membership, within its scope and validity window. It does not require the
owner's role to contain a target-setting action or an invented answer
permission. The trusted capability table selects this route; neither the
intent nor a transport can select it. The recorded grant retains its actual
role actions. Native authority and strict replay call the same grant guard.

One open command reserves one bounded entry, with its full Amount. The
answer replaces existing keys and slots and retains no separate input.
Only a preparation naming the pending command, moving its decided count
from zero to one and closing that exact record, spends the bound-one
reservation. All other preparations remain new work. Whole-scope admission
continues to enforce its ceiling for settlements too.

Finite archive classification metadata names only command and answer.
It adds no device operation owner. The owning SQLite metadata test uses a
synthetically damaged record row, explicitly proving classification only;
installed Grow archive/export admission remains S2b work.

Evidence at this checkpoint:

- Command/validator file: five passing cases in
  `/tmp/artroom-g5a-command-reservation-20261019.log`; original 68657 closed
  exit 0. An earlier run with the existing preparation file passed ten
  cases together. Parent creation metadata and membership grants are
  explicitly scripted in these pure fixtures; native installation and
  actual Membership are not yet proved.
- Identity guard: three passing cases, including the new scope-granted
  current-identity table, in `current-identity-20261019.log`; original
  39241 closed exit 0. Revocation, removed member, wrong key/incarnation,
  scope filter, expiry, inactive controller, age and high-water checks stay.
- Archive metadata: five passing native SQLite cases in
  `/tmp/artroom-g5a-archive-command-metadata-20261019.log`; original 4444
  closed exit 0. The device row is synthetic; this is no integrity or
  replay proof.
- Derive's two, Scope's three and Replay's three compiler targets pass in
  the corresponding command/reservation/identity/archive type logs.
  Initial retained failures were a ref-effect field typo, an incomplete
  preparation union narrowing, a widened legacy effect API that broke
  direct callers, a missing declaration-name union member, and a window
  string used where the native Window object is required. Those were fixed.
  A first focused invocation used the package config from the wrong root
  and found no tests; the corrected root-project selection passed.

One targeted owner control changes only the answer's full MemberRef
comparison to a member-name comparison. The unchanged foreign-incarnation
assertion fails because the mutant writes an answer. Exact restoration
returns all five command cases to passing. Driver
`/tmp/artroom-g5a-owner-control-20261019.py`, matching directory, original
44132 closed exit 0. Its baseline is a copied preceding exact-source pass,
not a fresh baseline execution. Source SHA-256
`bbda040a70ee70ded921f20788c1b5c78ac14abe539fd9df7ec35606a01df9ee`;
unchanged command-test SHA-256
`c3a84a537d6b7db30ee83d1b0a6025c566b817b2b96497d2d4ef3c8ce7b3284d`.
This is one targeted control, not a sweep.

No G5a gate, exact-head review, production install/grant, complete strict
replay, physical device execution or deployment is claimed. The next work
is the new native install cohort, existing-owner observation, Grow command
forms and fault scenario, real Core/SQLite admission and strict replay.
The latest accepted Main is expert-note landing `2127d5c5`; its audit
`0e776482` was read in full, including its original merge-process evidence
limit. That later prose-only Main is not incorporated at this checkpoint.

## Native install checkpoint

The opt-in `device-application` cohort uses Register 16, Directory 15,
Rules 9 and Destination 11. It reuses Membership 7; Membership 9 stays
reserved. The 49-pin literal witness adds only those four names, preserves
all 45 shipped data digests and leaves default founding unchanged. Rules 5
and 6 keep their earlier package proofs and capability refusal behavior.

The signed v2 package declares only device-command@1, one-to-three ordered
kinds and one owner requirement. At most eight package definitions may
use the capability. The new install act chooses a full existing owner
MemberRef and checks its current membership and active key. For an owner
who is also the signer, native observation rules serve this member from
the actual judged key observation; no second member read is invented.

Rules retains the owner, bounds, root and allowed definitions in its fixed
canonical genesis record. Its existing twelve value slots stay within the
native bound. The wrapper allows at most 20 KiB, including a device grant
of at most 4096 bytes and the existing bounded genesis fields. Directory
checks the exact membership, root and catalog declarations before its
native create emits version 2 context with one-hop delegation enabled.
The new destination's origin policy accepts that exact factory and grant;
the old declared destination refuses the new factory. Origin admission
alone is not a publication or outside-write claim.

The SDK has a separate device install selection with an explicit full
owner. MCP retains that selection in the signed request's meaning. CLI
supports the explicit cohort and `--owner <full-member-JSON>` for package
installation. The host accepts only this finite native capability beside
ordinary packages. It runs no package-supplied capability code.

The owning native witness uses genuine Register, Directory, Membership,
Rules, Destination and declared child scopes, production authority and
Core, actual SQLite, native creation and MCP custody. Repository creation,
Git/package HTTP, clock, scheduler and setup read access are labelled TEST
fixtures. It demonstrates:

- A missing owner is refused by name before install effects. A valid
  existing owner is retained in the actual grant observation and native
  creation context, with exact capability, kinds and definition list.
- A command opens its native record. Sensor reports advance the device
  revision without changing its targetAt binding.
- The actual child starts under a sixteen-entry fixture ceiling. Its
  native creation packet is held until that bound is set, then delivered
  exactly to the actual receiver. This is an explicit scheduler action,
  not an outbox retry-timing witness.
- At the capacity edge, SQLite shows one pending owner answer and Used
  plus Reserved equal to sixteen. A new report is refused with scope-full
  and changes no head or reservation. Removing the target action, deleting
  cached package content and evicting the child still allows the owner to
  answer on current identity and the installed grant. The recorded role
  actions remain exactly membership.manage; no answer action is invented.
- The answer closes that exact command, changes decided from zero to one,
  releases its reservation, leaves Used plus Reserved at sixteen and keeps
  the independent reported value. Its new outcome names its answer entry.
- Rules, Directory, device and Membership journals pass strict replay with
  proven grants, the actual native platform table and production capability
  code, without a device simulator or provider execution.

Replay has one bounds argument for every dependency. It uses the native
shared defaults for these four runs, including Register and Destination
proof histories. The child's smaller sixteen-entry admission edge is
proved directly by actual SQLite counters; this replay does not claim to
check that smaller ceiling. Attempts to impose sixteen globally failed at
Register's genuine repository-creation duty in entry 1. An exploratory
128-entry child/global replay failed at Destination's genuine genesis duty.
Both are retained, not represented as successful quota replays. No anchor
or grant-as-recorded exception was used in the passing strict native runs.

Current evidence:

- `/tmp/artroom-g5a-native-device-capacity-origin-replay-20261019.log`:
  original 16737 closed exit 0, one native case with the four strict
  journal replays and both factory-origin checks. Earlier native passes
  55853 and 85890 are retained; they are not an extra gate.
- `/tmp/artroom-g5a-device-cohort-focused-20261019.log`: original 27066
  closed exit 0, three files and ten cases for native pin literals, explicit
  CLI cohort custody and pure command forms.
- `/tmp/artroom-g5a-native-device-cohort-types-20261019.log`: original
  12603 closed exit 0, Platform's two and Scope's three compiler targets.
  Derive's two targets also pass in the native-checkpoint-derive log.
  Client, MCP and CLI owning compiler targets passed during wiring.

Retained integration failures exposed a missing v2 fixture projection,
an attempted thirteenth installation value slot, an incorrect expectation
of a separate own-member observation, missing listed-version/answer-kind
capability implementation, use of a full object where MCP resolves a scope
ID, fixture bounds installed after the child's construction, and a held
send whose retry time the finite scheduler had not advanced. These were
corrected in source or fixture; no test assertion was weakened to permit
an incorrect owner, budget or answer. The quota replay limits above remain
explicit. The first MCP compiler run also caught an insufficiently narrowed
owner option; reparsing the already owned device selection fixes it.

The generic local CLI scenario currently creates a scripted single root,
not a native installation. It therefore has no install grant to open these
commands. Planner decision request `80218ee2` asks for its evidence boundary
before adding native owner preparations: explicit scripted creation proof
and replay anchor, a full local native install graph, or a separate actual
runtime fault witness. No domain field, package manifest or silent genesis
rewrite will mint a grant. Independent Grow declaration work can proceed.
No complete G5a gate, review, landing, push or deployment is claimed.

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
