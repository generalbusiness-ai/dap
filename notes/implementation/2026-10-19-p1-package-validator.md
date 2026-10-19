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

## Composition checkpoint

Planner assertion `3af37117` confirms the Q1 decision `e43b913f`: exercises
remains signed manifest metadata. There is no new definition mark and no
claim that the manifest discovers all writers of a business constraint.

The v2 writer emits all seven composition places. The reader requires
them, checks bounded closed forms and references, and explicitly refuses
nonempty groups, derivation and parameters as `unsupported-form` until
their slices. Default empty composition preserves writer ergonomics, not
old wire compatibility. Named composition findings retain the existing
package-invalid error boundary. Native names, including an own property
named `__proto__`, retain their existing spelling rules. Three codec cases
pass in `/tmp/artroom-p1-composition-codec-own-names-20261019.log`.

A new internal workspace, `@generalbusiness/artroom-package-graph`, holds
the pure composition reader and graph checks so the codec and Derive can
share them without a dependency cycle. Its checks are not yet wired into
the codec or a public `validatePackage` entry point. Port field typing,
cycle acknowledgement, the complete projected-bound report, CLI rows and
the remaining Grow pairs are unfinished. Current graph code checks scope
endpoint declarations and allowed writers, explicit failure clauses,
default grants, declared ownership, order, pending states with written
timed exits, connected handler names/pins, and lifetime fan-in. The pending
and port checks still need their full witnesses. No full P1 claim follows.

`derive/test/package-graph.test.ts` checks actual Grow declarations with
native whole-definition validation before the component graph check. All
four cases pass in `/tmp/artroom-p1-grow-graph-all-endpoints-20261019.log`.
The hand count is one Site and three successful Rooms, each contributing
one retained key. Copies 2 fails. Two nonfinal related items per Room give
six keys: copies 3 fails and copies 6 passes. A creation conflict that
enters `failed`, or a related type with any final state, leaves fan-in
unproved. The other cases distinguish signer-selected endpoints and a
wrong declared child, missing result coverage, default grants, missing
order, wrong right ownership and an admitted `unowned-bound` warning.
These are component witnesses, not package-byte or installation evidence.
The owning Derive test typecheck passes in
`/tmp/artroom-p1-grow-obligations-type-20261019.log`.

The successful-creation control removes final states from that lifetime
proof. The unchanged conflict witness then fails because the graph wrongly
admits the bound; source is restored. See
`/tmp/artroom-p1-grow-final-state-lifetime-control-20261019.log`.
An earlier control disabled only the special conflict test and survived:
the general final-writer restriction still refused that same own-item
conflict. That is not distinguishing evidence for the special alias case;
the diagnostic remains in
`/tmp/artroom-p1-grow-conflict-lifetime-control-20261019.log`.

The new workspace is an intentional source dependency change, with no
third-party additions. An offline lock-only run in a manifests-only scratch
tree produced exactly the same lock JSON and created no node_modules;
`/tmp/artroom-p1-lock-only-offline-20261019.log` and
`/tmp/artroom-p1-lock-scratch-20261019.txt` record it. No install ran in a
checkout. The refreshed private view keeps the same 106 external versions
and adds the fourteenth internal relative workspace link. Audit
`/tmp/artroom-p1-composition-dependency-view-20261019.json`, SHA-256
`ae009c6c1b26e02cf12becb503cc7d24beed578ab232156de71b344da97c3907`;
new lock SHA-256
`a2bc75bcef45041b9ef8110e145680005a41ab39047183858524a13fbbe725c0`.
Earlier dependency evidence remains historical. Graph, Bytes and Scope
owning typechecks passed before the latest component checks; no complete
gate, review, landing or completion is claimed.

## Public validator and maintained-package checkpoint

The shared graph is now called by the v2 writer before signing and by its
reader. The public `validatePackage` byte entry in Derive composes the strict
signed reader, native per-definition validation and graph report. The CLI
resolves composition references only to already captured source files and
prints named findings as rows; it escapes control characters in those rows.
This remains unfinished P1 work, with no final gate, review or landing.

Port fields reuse native type inclusion and native literal-value guards;
the guards moved to shared code without new third-party dependencies. The
graph refuses an unproved field fit, including an optional value required
by a recipient. A declaration tree has a 64-level graph allowance and its
native count limits are checked before graph joins. Endpoint writers are
indexed by the full definition/item/slot tuple. Cycle acknowledgement
removes state-conditioned edges and looks for any remaining automatic
send/create cycle; it claims no termination or storm bound.

Eight Grow component cases pass, including a signed public-byte case and
a codec refusal before signing. Additional pairs cover field mismatch,
same-name wrong peer, unknown message, unreachable handler, pending work
without its timed exit, and an unacknowledged automatic create/report cycle.
The first cycle fixture correctly failed because its birth field was
optional; making that source required made the intended pair valid. The
literal hand count is 574 live item slots, and ceilings of ten entries and
seven item keys on successful creation paths. Failed attempts, repeated
input, timed work and outside scopes are excluded; lifetime traffic and
recyclable key counts remain unproved. These figures promise no host
admission, physical heap, provider quota or consent. See
`/tmp/artroom-p1-grow-projected-hand-count-20261019.log` and the preceding
cycle/pending logs. CLI owning typecheck passes in
`/tmp/artroom-p1-cli-findings-type-initial-20261019.log`.

The maintained Grow package declares connections, rights, exercises and
order. Site pins its actual Room definition; conflict keeps its backing
slot in nonfinal `conflicted`, and request failures have explicit clauses.
The source-reader fixture now takes a pin from its actual ledger genesis;
the missing-metadata peer test omits it explicitly. Fifteen peer/graph/Grow
cases pass in `/tmp/artroom-p1-grow-verified-genesis-source-20261019.log`.
The fault scenario's selected-definition input was repinned; its literal
outcome expectations were not derived or changed.

Existing v2 consumers initially failed the new obligations. Counter and
Lending now list their establishment grant in the admin role; test packets
list otherwise uncovered actions in a separate setup role, retaining their
selected member/control role contents. Lending declares its Destination
endpoint outside the package and explicitly lists no-op failure clauses.
Its native bytes, pin and maintained runbook were regenerated. The owned
child fixture declares its child endpoint and undelivered clause. These
are intentional source/metadata changes to comply with P1, not compatibility
exceptions. Native install/MCP consumers pass seven cases in
`/tmp/artroom-p1-codec-native-consumers-covered-20261019.log`; CLI maintained
examples, packaging and Lending definition checks pass sixteen cases in
`/tmp/artroom-p1-maintained-composition-covered-20261019.log`. Their earlier
failure logs remain diagnostics. The first native owned-scope run stopped
during maintained-package preparation at the missing Counter grant; no
native scenario pass is claimed for that attempt. The unsupported Node
transform-types probe is not evidence; the later diagnostics used the
already pinned tsx/esbuild tools without installing anything.

Remaining work includes the full signed Grow refusal matrix, the remaining
lifetime fan-in variants (especially relation before creation failure),
staged-form and bounds witnesses, owning native regressions, actual Main
incorporation, final Page generation and one final gate before review.

Actual S1 Main `bdda6bd0f4a152a65763f6493a7b729cd13d6c68` is incorporated.
Four conflicts preserve both late and wrong-pin reason tables, both codec
cases, P1's item-bound pin refusal and the landed independent late-body
validation with its reservation-identity guard. Thirty-two cases across
five owning files pass in `/tmp/artroom-p1-main-late-merge-focused-20261019.log`;
Derive's owning test typecheck passes in
`/tmp/artroom-p1-main-late-merge-type-20261019.log`.
The native owned-scope regression now passes its one case in
`/tmp/artroom-p1-owned-scopes-codec-regression-covered-20261019.log`, after
the maintained package preparation corrections. These are focused passes,
not P1's final gate or a claim that its remaining work is done.


## Complete lifetime variants at the byte boundary

Main's reviewed documentation-only landing `a93b6359` is incorporated in
merge `3bb9e945`. P1 still has no gate, review or completion. The approved
staging table explicitly gives P2 the cycle edges carrying `late` and
`spacing`; P1's structural state-condition witness remains its current slice.

The existing lifetime case now covers all five named negative variants after
native whole-definition validation: a retire act, repeated creation from the
singleton Site, a refusal that also frees a previous confirmed slot,
recyclable related items, and creation conflict freeing its backing slot.
The alias variants include a separate no-send opening for a reachable initial
backing slot; that opening adds no second child creator. The child's birth
field and retained reference list the matching opening kinds. An initial
fixture changed only the field, so native validation correctly refused its
assignment to the narrower slot; that failed log remains
`/tmp/artroom-p1-lifetime-matrix-initial-20261019.log`.

Each negative is refused `fan-in-unproved` by the component and by packing
before any signer call. A deliberately unchecked TEST producer separately
constructs canonical v2 bytes using the literal one-edge Site → Room topology,
independently verifies its real signature, and submits those bytes to the
public validator. The positive package passes; all five correctly signed
negative envelopes refuse with the structured finding. This is adversarial
input to byte validation, not an installation or live authority witness.
Eight cases pass in
`/tmp/artroom-p1-lifetime-matrix-signed-bytes-20261019.log` and the owning test
compiler passes in `...lifetime-matrix-signed-type-20261019.log`.

`/tmp/artroom-p1-transition-creator-control-20261019.log` disables the one
opening-row requirement. Seven cases pass; the unchanged lifetime case fails
by assertion because repeated creation from the singleton Site is admitted.
The control restores the source. Ordinary whitespace inspection also caught
extra EOF blank lines in the two extracted shared guards; removing them
changes no behavior. This checkpoint still does not cover the separate
pre-failure relation-order witness or the complete P1 refusal matrix.

## Native relation before a creation result (checkpoint)

The shared Grow graph fixture now admits a third, declared Leaf definition.
A Room opens a probe and records both a Leaf creation request and an independent
relation to its Site in that one entry. With no final probe state, nine keys
are proved (three Rooms, each with its root and two probe items). Making only
creation-refusal `failed` final leaves Leaf instances bounded at six but makes
relation fan-in unproved.

`package-relation-order.test.ts` uses actual native in-memory Site/Room births,
confirmation, judgments, relation delivery and replay, with explicit per-key
fixture grants and manual delivery. The negative definition deliberately
bypasses package admission as a counterexample. The Site accepts and retains
the probe's relation while the independent creation request's result is still
null. No Leaf is created and no refusal outcome is simulated: this witnesses
the pre-result ordering, not a completed failing creation, SQLite lifecycle,
installation or a provider. Both journals replay consistently.

Two owning files pass nine cases in
`/tmp/artroom-p1-pre-failure-relation-focused-20261019.log`; the corrected
owning compiler passes in `...pre-failure-relation-type-corrected-20261019.log`.
Its initial typecheck caught an import left unused after fixture extraction
and a message union access that needed narrowing; both are corrected. This
checkpoint has no new guard control, final gate or review. G1 checker feedback
now takes priority, and P1 is saved for continuation afterward.


## Refuse later declaration forms explicitly

The shared graph preflight now recognizes the later-slice forms before it
builds rows: act/handler `states` (P4), their `reads` (P1g), handler `spacing`
(P2), timed `sends` (P3), and definition level `sequenced` (S3/P1g). It refuses
each as `unsupported-form`, with its source row and owning slice, rather than
silently ignoring it during packing and leaving a later native shape error.
Nonempty groups, group order, derivation and parameters already refuse through
the composition reader. This implements none of those later semantics; landed
S1 `late` forms remain native and unchanged.

One matrix intentionally bypasses native validation in its fixture for these
future-form inputs. The ordinary Grow package passes. Each future form fails
with its named finding before the pack signer runs, and also fails from an
independently verified signed wire package. Two files pass ten cases in
`/tmp/artroom-p1-staged-native-forms-initial-20261019.log`; graph, derive-test
and bytes-test compilers pass in `...staged-native-forms-type-20261019.log`.
Three maintained CLI/package/Lending files pass 16 cases in
`...staged-maintained-codec-regression-20261019.log`.

Disabling the single staged-return guard gives eight passes and one unchanged
assertion failure for P4 states; the source is restored:
`/tmp/artroom-p1-staged-form-control-20261019.log`. The separate pre-result
relation control also distinguishes: disabling the final-state key restriction
makes its unchanged `fan-in-unproved` assertion fail, then restores the source
(`...pre-failure-related-key-control-20261019.log`). No final P1 gate or review
yet. This work used P1's private view while the G1 correction gate was frozen
and running; it changed no G1 source or dependency file.

## P1 refusal reasons through both byte paths (checkpoint)

The actual Grow matrix now pairs passing and failing packages for twelve
additional graph reasons: copies exceeded, unbound endpoint, wrong peer,
unhandled result, ungranted act, wrong right owner, undeclared order, unknown
message, field mismatch, unreachable handler, unacknowledged cycle and
unsettled pending work. Each pair keeps native definitions valid. A validly
signed unchecked wire preserves the sole refusal reason at public validation;
the production packer refuses before any signer call. The cycle and pending
fixtures are shared with their existing component witnesses. This supplements
the five unproved lifetime variants and the staged-form matrix; it is not a
whole-suite or final P1 acceptance claim.

Two files pass 11 cases in
`/tmp/artroom-p1-refusal-byte-matrix-initial-20261019.log`; the owning compiler
passes in `...refusal-byte-matrix-type-20261019.log`. G1's correction is now
approved, so this checkpoint is saved before its landing. Warning/report byte
witnesses, the remaining CLI diagnostics and the final P1 review gate remain.

## G1 incorporation and CLI diagnostics (checkpoint)

P1 incorporates actual audited G1 Main `b54f8880` in merge `d464d80fc`.
The two overlaps preserve G1's complete views/projections and explicit shared
guard exports, together with P1's seven composition places and conflicted-room
selection. The merged Grow config is 61,956 bytes. The new owned-room scene's
selected definition identity is repinned to P1's Room digest `491dca8e`; no
literal business outcomes or positional expectations change. Five owning files
pass 25 cases in `/tmp/artroom-p1-g1-landing-merge-focused-20261019.log` and
four compilers pass in `...g1-landing-merge-types-20261019.log`.

The public byte witness now explicitly admits and reports `unowned-bound`
as a warning, and maps byte/count limit refusals to `bounds`, with the exact
byte limit as a passing control. The ten-case graph file passes in
`...warning-report-byte-boundaries-20261019.log`.

`pack` now prints the same structured finding table as `check`, rather than
reducing a graph refusal to `application-package-invalid`. Check reports the
computed lifetime item-key bound when proved, retaining `unproved` for entries
and unknown counts. A real local one-note source/scenario proves the literal
one-key count, then adds an ungranted native act whose name includes a pipe,
newline, quote and backslash. Both commands return the same escaped physical
line, preserve the stored TEST key and write no package output. Eleven cases
pass in `...cli-finding-rows-comment-revisions-20261019.log`; CLI and derive
owning compilers pass in `...cli-finding-rows-types-20261019.log`.

Fixture attempts before that pass had a missing JSON-object brace, then an
invalid guard on a native comment, then a comment expectation naming an
unneeded revision. Those failures remain in the initial/syntax/native-comment
logs; no production guard was relaxed. The standard control driver selected
Node's runner for the CLI's mixed Vitest/Node script, so its baseline was
inconclusive and never changed source. A bounded manual driver then ran the
unchanged Vitest file before, without cell escaping, and restored. Counts are
11 pass, 10 pass/one unchanged assertion failure, 11 pass; exact test titles
and source bytes match. Evidence is
`/tmp/artroom-p1-cli-cell-control-20261019/` and its driver/log. This is one
formatter control, not a sweep. P1 still has no final gate or review.

## G2 incorporation while G3 is reviewed

Merge9dafc6d63857aff1bab30d75ba1bbb852e9d0059 incorporates actual reviewed,
audited and published G2 Main4b4d58b0. The merge is clean. It preserves P1's
seven composition places and Native pin/conflict changes, together with G2's
scalar forms, ordered measurements, fact timestamps, layers and SDK parity.
The Grow source is63,562bytes, within the unchanged64KiB source bound.

The ten graph cases pass in
`/tmp/artroom-p1-g2-merge-graph-20261019.log`; the real Core/SQLite Grow
measurement case passes in `*-measurements-20261019.log` under the same
prefix. Derive's two and CLI's three compiler targets pass in
`*-types-20261019.log`. Zero installs and no package/lock mutation.

G3 remains higher priority and in exact-head review49f191c4 at its frozen
2a80a300f candidate. No G3 original is edited or executed by this P1 work.
P1 still needs incorporation of later actual landings, remaining proof review
and its own final gate before Source review. No P1 completion is claimed.
