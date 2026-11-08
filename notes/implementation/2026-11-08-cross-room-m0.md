# M0: a declared send between two rooms

Status: the witness is drafted. No compiler, test, control, gate or review
has run for this head. M8 currently owns the validation slot.

Request `7542970fb47e57ae9360f297bdfe8c49e3752c24` asks whether a declared
application can send between rooms with different members. This head starts
from main `8faa38dcf31855a0a6264e5912b58061b5eda223`. It changes test fixtures
and documentation only. It changes no production package or derive source.

## The witness follows native installation and delivery

[`application-cross-room.test.ts`](../../packages/scope/test/application-cross-room.test.ts)
creates two native rooms. Rita joins the sending room, and Vic joins the
receiving room. Both install the same v1 application through Rules and
Directory. The receiver's genesis saves the sending scope's full reference.

The declared handler compares the verified sender with that reference.
The test sends the same declared message from the named scope and from
another scope that runs the same definition. It checks the admitted effect,
the named refusal, the returned result, and the receiver's state before and
after refusal.

Planner ruling `99f628a5e18b382413576ac05e4125210163dc3f` corrects the
request's phrase “records nothing.” A verified request keeps one deciding
entry and one result, even when the receiver refuses it. The refused entry
must carry no handler effect or other send, and must change no business item
or scope state. The proposed declaration uses the existing `guard-failed`
code with the application reason `not-the-sender`.

The final reads use a real session issued by the receiving membership and
the native Worker's HTTP routes. The test reads the receiving scope's
admitted and refused entries and their retained source copies. It checks
that the same session cannot read the sending room's scope state, members,
history, or original entries. Setup inspection does not authorize these
final reads.

The fixture uses real SQLite scopes, installation, message delivery and
session issuance. Git and package peers, the clock, and the scheduler are
stand-ins. The witness starts no live room and makes no deployment claim.

## M0 uses the v1 installation contract

Planner ruling `d3f960abca88df13af8e6acc81f3397c2118c16a` accepts the
existing v1 codec for M0. This witness does not establish v2 composition
admission for a cross-room receive port.

The v2 graph accepts a named endpoint only when its reference comes from a
declared child or creator. See
[`check.ts`](../../packages/package-graph/src/check.ts). Independently
installed roots have neither relationship. Marking the endpoint `outside`
avoids that restriction, but
[`ports.ts`](../../packages/package-graph/src/ports.ts) refuses a receiving
handler without an in-package sender as `unreachable-handler`.

A v2 package therefore cannot yet declare a receive port for a sender in
another room. The planner assigns that design to market slice M1. The
initial v2 draft stays outside this head. M0 does not change either graph
rule to admit it.

## A verified refusal still costs one entry

Under the current contract, any verified sender can cost the receiver one
refusal entry per request. Whether a cross-room receiver should refuse
before that deciding entry remains a design question for M1 and M2. M0
preserves the existing entry and result guarantee.

## Validation remains due

The one native owner covers the four requested cross-room facts. Its
validation, a control that removes the sender guard, and the final full gate
remain due. The roadmap will state the observed v1 behavior and the v2
limitation only after the witness passes. No acceptance claim follows from
this draft.
