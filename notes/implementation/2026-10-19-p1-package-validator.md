# P1: package validation — sender-pin checkpoint

Request `4e63c67c30e866555e9efcfdf49af75a2c2f92e1`, promise
`0afa98af9294045f7906395d0bc8a206ebf1aa90`. Work starts from audited
Main `1da3f4ca79ad034286ca4d8988bed9dee022369e`, after M2a's delivered
parent supersession `5681c911`. The approved packages draft 8 and its
section 3 staging table govern P1. The original request's all-forms wording
does not pull P1g, P4 or P5 into this slice. This checkpoint has no gate,
review, landing, publication or deployment, and P1 is not complete.

## Exact sender pin

`ReceiveType.from.pin` admits an optional definition digest. A request
whose name and sender kind match but whose actual sender digest differs
gets one native refused decision and authenticated `wrong-pin` result.
It runs no handler effects and advances no source-order frontier. Missing
verified pin metadata is unavailable, with no entry; an exact repeated
decision needs no new metadata. Existing handlers without a pin keep
their read path.

The runtime captures the sender's native birth only for a new delivery to
a handler that declares a pin. It uses the existing bounded native birth
port, checks the original genesis proof, seed, full reference, incarnation
and scope ID through `readNativeBirth`, and supplies that checked pin to
the shared judge. No payload field or producer name stands in for it.
The capture is reused by rule preparation and the commit; the handler is
not executed twice. Replay derives the pin from the sender's checked
genesis with its existing identity frame, never from a retained alias.
The transient judge context gains no public input or journal field.

An advisory has no request result. Its pin is checked for eligibility
under the existing advisory/no-handler behavior: missing metadata retries,
a mismatching peer writes no handler effects. Only requests have the
`wrong-pin` decision/result described above. This boundary must remain
explicit in the complete P1 review; it is not a new advisory result.

Native item-bound handlers reject the pin combination, preserving their
existing declaration otherwise. Their early-refusal settlement composition
is not implemented. Native receiver-pin bookkeeping is different: the
existing refusal path consumes its numbered deciding reservation without
licensing the peer. The focused reservation witness checks that behavior
and exact repeat. There is no blanket claim that a `settles` flag alone
consumes a reservation.

## Witnesses and checks

`derive/test/peer-pin.test.ts` first passed two cases in
`/tmp/artroom-p1-peer-pin-initial-20261018.log`: a genuine second definition
with the same name is refused, its sender consumes the authentic result,
the declared peer applies, missing metadata retries without an entry,
and a non-digest pin fails declaration validation. These use actual native
birth/judge/fold/MemoryState interfaces with fixture per-key grants.

Four cases now pass in
`/tmp/artroom-p1-peer-pin-reservations-20261019.log`, adding the native
item-bound declaration restriction and reserved refusal bookkeeping. The
latter uses the actual hold capability/judge/fold/MemoryState but scripted
task source entries and pin metadata; it is not native birth, object,
authority or provider evidence.

`scope/test/peer-pin.test.ts` passes in
`/tmp/artroom-p1-native-peer-pin-initial-20261018.log`. It uses actual NET
objects and SQLite, two sender definitions with the same name, actual
birth metadata, an authenticated refusal consumed by its sender, eviction
before exact repeat, and a valid peer that applies. The actual journals
replay consistently, and a rehashed tampered final decision is a mismatch.
NET grants, read access and transport remain explicit stand-ins. These
are Directory-kind test roots, not installed Site/Room lanes or enrollment.
No provider or hostile-code claim follows.

The paired control removes only the request pin comparison: both original
cases pass, then the wrong-peer assertion fails, and the file is restored.
The original process ends 0. Log
`/tmp/artroom-p1-peer-pin-control-20261018.log`. The two later native
settlement cases do not change that target or guard. No sweep was run.

Scope owning compilation passed before the new witness files in
`/tmp/artroom-p1-source-pin-scope-type-initial-20261018.log`; Derive and
Replay owning compilation passed in their respective
`/tmp/artroom-p1-peer-pin-*-type-20261019.log` files. Scope compilation with
the new witnesses also passes in
`/tmp/artroom-p1-peer-pin-scope-type-witnesses-20261019.log`, and Derive with
the reservation cases in
`/tmp/artroom-p1-peer-pin-derive-type-reservations-20261019.log`. Final checks,
Page regeneration and the one gate remain ahead. No unchanged whole
suite has been repeated.

## Q1 and remaining work

Builder decision report `e43b913f` keeps `exercises` in the manifest for
P1, following section 2's wire shape. Rights and ownership are package
composition metadata; a reusable definition need not change its digest
just to rename that package's constraint. The validator must check each
listed definition, row, right and owner. It does not discover undeclared
business constraints or claim complete writer coverage. The original
`unowned-bound` warning and scenarios remain. `creates` stays derived;
`exercises` is explicitly declared, not falsely called derived. The report
was submitted to the owning planner and can be amended before exact-head
review. It confers no P1 approval or completion.

The package metadata, composed graph validation, named Grow witness pairs,
fan-in proofs and hand-count report, Grow declarations/conflict-state
change and `dap check` output are still to implement. P1g/P4/P5 forms will
refuse as `unsupported-form` until their own slices. The separate S1 late,
G1 and S2 work is not part of this checkpoint. Its future actual landings
must be incorporated before P1's final gate.

Dependencies are a private APFS COW copy from idle G1: 106 checked versions,
13 internal relative workspace links, zero installs, only clone Vite caches
removed. Audit `/tmp/artroom-p1-dependency-view-20261018.json`, SHA-256
`072dbf5e30da9a7fe1a426eed977b51411760636e8eb17566bcdec94578e45c6`;
unchanged lock SHA-256
`3546b5384c9245fb646c4f7c22cabde0f4351b05dfcec704d1bdeb170666361a`.
This checks versions/links, not tarball integrity or private dependency trees.
The date in early log names records the worktree's preparation day; the
native witness ran after local midnight on 19 October.
