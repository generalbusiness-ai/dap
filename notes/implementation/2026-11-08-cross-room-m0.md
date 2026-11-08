# M0: a declared send between two rooms

Status: the corrected v1 fixture passes both Scope compiler contexts and its
complete native case at `63bb22a3`. The sender-guard control distinguishes.
The first fixture failure and the control's parser failure remain retained.
Final integration, the full gate, independent review and landing remain due.

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

The one native owner covers the four requested cross-room facts. The
focused witness and sender-guard control now have evidence below. The
roadmap states the observed v1 behavior and the v2 limitation. The final
full gate and independent review still remain due.

## The first run finds a cohort mismatch in the fixture

At `6824e90725806343cfb9224a4b8cdf5ca31bf402`, both Scope compiler contexts
pass. The one native case fails its first installation assertion because the
package resolver refuses the package bytes or install bounds. I read the
actual `pipeline.exit`: `exit 1`. Source stays clean and unchanged, and no
owned process remains. This run reaches no cross-room acceptance.

The fixture paired its v1 package with `DECLARED_APPLICATION_COHORT`.
`McpService` selects `signedApplicationInstall2` for that cohort's Rules pin,
which requires a v2 package. The correction selects
`TRUSTED_APPLICATION_COHORT`, the existing v1 native installation cohort.
It changes no package codec, graph rule or production admission behavior.
The corrected witness still needs its own result.

The [first-run manifest](evidence/2026-11-08-m0-initial.manifest.json) hashes
to `e0e5586f3efb2a330ac14d555c9c1aa29affd9ebe569299f712724fb35cfc9d8`.
It retains five public files and inventories 252 private originals under
`~/play/artroom-evidence/2026-11-08-m0-initial-*`. The original failed run
remains failed. M0 will validate the correction after M8's active gate ends.

## The corrected native witness passes

At `63bb22a39ec0607790710537c87d55cbb6a6bc6c`, tree
`0f002ad8083300aeae33c1d25c21f5d6b9b29218`, both Scope compiler contexts and
the complete native case pass once. I read the actual `pipeline.exit`:
`exit 0`. The reports have no unexpected cases, skips, retries, repeats or
unhandled errors. Source remains clean and unchanged, and no owned process
remains. The outer observation takes 9.335 seconds.

This run requires no production change. The existing v1 native cohort,
declared send, sender guard, retained inputs and membership read checks
supply the behavior. The [cohort manifest](evidence/2026-11-08-m0-cohort.manifest.json)
hashes to `446a796da9c6028395fe7e852dbee07a2f4fea9e4e666b7045a253a785316fba`.
It names seven public files and inventories 258 read-only private originals
and inventory files under `~/play/artroom-evidence/2026-11-08-m0-cohort-*`.
The first installation failure remains failed.

## The sender guard changes the witnessed outcome

The control removes only the receiver's sender guard in the TEST declaration.
It runs the unchanged one-case native owner. I read its actual `owner.exit`:
`exit 1`. The wrong sender now applies, and the assertion at
`application-cross-room.test.ts:106` fails. That assertion requires decision
`refused` with `guard-failed` and reason `not-the-sender`.

The driver restores the fixture and compares every tracked input before
classification. Its classifier then fails because it requires the word
`refused` in Vitest's error text, which abbreviates the expected object.
The original `control.exit` remains `exit 1`. A separate read-only classifier
checks the saved stack location against the unchanged assertion, verifies
the single guard fault and one failed case, and confirms restored source
and closed processes. I read its `classification.exit`: `exit 0`.
No baseline, compiler or test runs again.

The [sender-control manifest](evidence/2026-11-08-m0-sender-control.manifest.json)
hashes to `d6cc26435159d54d946806666a9aefee3ce93307043bb56c323f95860ee3c648`.
It names seven public files and inventories 252 read-only private originals
and inventory files under `~/play/artroom-evidence/2026-11-08-m0-sender-*`.
The intended test failure, parser failure and independent classification
remain separate. The final gate and independent review remain due.
