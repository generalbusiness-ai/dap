# P1: package validation

Request `4e63c67c30e866555e9efcfdf49af75a2c2f92e1`, promise
`0afa98af9294045f7906395d0bc8a206ebf1aa90`. This owned preparation
incorporates reviewed Main `248aab8f`, with landed K1, K2, G5a, S2a and
Grow host-link work. Two ordinary P1 gates have failed; complete review
and landing remain due.
The earlier `32f7537e` integration on Main `8aad37bb` is historical.

Planner decision `b966ef3f`, adopted as `48471bbb`, now governs the format
boundary. New pack/validation requires all seven explicit version 2
composition places. Strict readers still refuse the old published packet.
For the incomplete published shape, the separate published-packet reader's
exception accepts only the exact maintained release and publisher identity,
with existing signed bytes unchanged. Complete composition packets still
use the strict reader and graph checks. Actual consumers select the
published-packet reader explicitly. There is no generic old
format fallback, publisher-only exception, new publisher key, re-signing
or release. Future replacement and retirement need a separate reviewed
release, trust and upgrade commission. No frozen review original is edited
or executed here.

The implemented slice contains the seven explicit version 2 composition
places, strict codec checks, the public byte-based `validatePackage`,
structured CLI findings and the maintained Grow declarations. It also
checks exact sender pins against native birth metadata at delivery and
replay. Groups, sequenced reads, spacing, timed sends, row states,
derivation and parameters refuse as `unsupported-form` until their
owning slices. The approved design's staging table governs that boundary.

The Grow graph refusal pairs run through packing before signing and
independently signed input to the public validator, including the lifetime
fan-in variants. Admitted warnings, byte/count limits and projected counts
have separate witnesses. The current live-item hand count is 606, with ceilings
of ten entries and seven item keys for successful creation paths; lifetime
traffic remains unproved. These figures establish no native admission,
physical memory or provider quota.

The current boundary's eleven graph cases and recorded owning byte,
consumer, archive and native-demo checks pass, with affected compiler
configurations. Their exact heads, failures, corrections and TEST limits
are recorded below. Earlier peer-pin and reservation checks and controls
remain separate. These runs are not one whole gate or a single measured
pipeline; the one final ordinary gate and complete Source review are due.

## Historical checkpoints

The following sections retain their original scope and test boundaries.
A checkpoint's pending-work statement describes that checkpoint; the
current implementation and remaining integration work are stated above.

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

## G3 incorporation while G5a forms are decided

Merge `be49aa2ca` incorporates actual reviewed and audited G3 Main
`426504d89b3140e5b3f769c546e846529cf9f8c3`. The Grow declaration had one
merge conflict. Resolution preserves all reviewed G3 content, including 18
views and 17 projections, together with P1's seven composition places and
the nonfinal conflicted room state in the Site projection. Structural
comparisons checked both sides. The resulting source is 63,214 bytes,
within the unchanged 64 KiB limit.

One focused Vitest invocation passes all 13 cases: graph ten, native Grow
measurements one, and native Grow routing two. Its original process 35898
closed with exit zero; the log is
`/tmp/artroom-p1-g3-merge-owning-20261019.log`. The derive package's two and
CLI's three compiler targets also pass; process 36209 closed with exit
zero, with log `/tmp/artroom-p1-g3-merge-types-20261019.log`. No installs
or package/lock changes. No frozen G3 source or evidence was changed.

G5a contract decisions and the separate durable-presence request remain
pending and take priority over final P1. This is integration evidence,
not a P1 gate or completion claim.

The lifetime matrix now also covers a room retired through the Site's
selected-room reference. Its selection and retirement are native-valid
acts. The graph refuses `fan-in-unproved`, pack signs nothing, and an
independently signed package is refused at the public byte boundary. This
strengthens the existing lifetime witness without adding another test.
All ten graph cases pass in
`/tmp/artroom-p1-alias-lifetime-20261019.log`; the derive compiler targets
pass in `/tmp/artroom-p1-alias-lifetime-types-20261019.log`.

One targeted control omits final-state writers with an explicit subject
from the lifetime proof. The new selected-room variant then wrongly
receives no finding and fails its unchanged assertion: nine cases pass,
one fails. Restoring the exact original bytes returns ten passes. Driver
and inputs are `/tmp/artroom-p1-alias-lifetime-control-20261019.py` and
the matching directory; `result.json` records both source and test hashes.
The original control process 17458 closed with exit zero. This was a
single proof control, not a mutation sweep.


## Reviewed Main incorporation during G5a review

Merge `37c6ab709229f98c4f3c2ba5e97faead7b4e9bd6` incorporates actual
reviewed Main `3ed2a08a50f31e84ea42b4f6027684e14a8cedb8`. The sole
manifest conflict preserves Main's durable presence and task filtering,
together with all seven P1 composition places and P1's nonfinal
`conflicted` room state. A full parsed-object comparison checks that
union. The manifest is 63,570 bytes, with 18 views and 18 projections.

The literal live-item hand count now includes the Site's 32 presence
items: Site `1+3+32=36`, three Rooms `3*190=570`, total 606. The
successful-creation entry ceiling ten and item-key ceiling seven stay
unchanged. All ten graph cases pass in
`/tmp/artroom-p1-reviewed-main-graph-20261019.log`; the owning Derive test
compiler passes in `...reviewed-main-types-20261019.log`.

The two owning MCP tests pass three cases in
`/tmp/artroom-p1-reviewed-main-local-sqlite-20261019.log`; original process
82293 naturally closed with exit zero. They use the local Core/Node SQLite
fixture with its stated authority and transport boundaries. The initial
command selected `scope` and found no files; its exit one in
`...reviewed-main-native-20261019.log` is a selection error, not a test
failure or native Worker evidence. The corrected command selects `mcp`.

G5a remains frozen in complete exact-head review `5c00e7d4` at
`dfb0268f8`. This P1 work edits or executes none of its sealed source,
dependencies or evidence. No unreviewed G5a code is incorporated. P1's
final gate and Source remain after incorporation of the relevant actual
reviewed landings, including G5a and S2a. This checkpoint has no P1 gate,
review, landing, publication or deployment.


## Package authoring reference

`docs/write-an-application.md` now explains the seven signed composition
places, source-path resolution, exact peer pins, the declared-right
boundary, lifetime relation fan-in, refusal and warning rows, projected
counts and staged `unsupported-form` refusals. The small Grow excerpt is
explicitly partial. It distinguishes local validation from the later
install-time guard and from native or provider authority. The text is
checked against the current codec, source resolver, graph, public validator
and command output. This documentation-only addition runs no further
suite or gate; final dependency incorporation and the P1 gate remain ahead.

## Actual Main integration and release cutover, 20 October

The private integration starts from P1 `0a09b8c5` and incorporates actual
Main `8aad37bb`. The uncommitted merge naturally exits one, with six
conflicts. All available stages are retained under
`/tmp/p1-current-main-conflict-stages-20261020`; the raw merge log and
closed result are `/tmp/p1-integrate-current-main-20261020*`.

The Grow manifest is parsed-equal to current Main plus P1's seven
composition places and the nonfinal `conflicted` Site room projection
state. Its 64,356 source bytes stay below the unchanged 64 KiB limit.
The two room fault scenarios preserve every Main step and assertion; only
their selected definition digest changes to the actual merged Room,
`sha256:5e2d34fa9965662aa508aaaffd83bdcd4198746ae8d4a8dd24654d74289529a4`.
The Site scenario selects the package entry and has no definition member.
The first digest refresh stops on that absent member after updating the
first room file; the corrected refresh starts from exact canonical Main
for both room scenes. Receipts retain this boundary.

The bytes conflict keeps both complete test cases, for P1 composition and
Main's archive requirement. The platform fixture keeps Main's conditional
archive requirement and P1's explicit complete setup role. Replay keeps
Main's `preparationScopeGrant` and P1's `bound`, with all other merged
hunks. The first compiler run catches the omitted P1 error-class import
when the bytes test is reconstructed from Main; restoring that import
preserves both unchanged cases. The failed original remains retained.

Dependencies are a physical copy of the current K1 finite grant: 5,499
regular files, matching bytes, hashes and modes, with distinct inodes, and
31 contained links. The source originals are rechecked unchanged. The
lock delta is proved to contain exactly four workspace nodes: the new
package graph workspace, its link, and the bytes/derive consumer edges.
Every external dependency record is unchanged. Only then is the owned
copy's lock stamp retargeted and its one contained project-workspace link
added. This installs nothing and changes no external dependency version.
The copy receipt is `/tmp/p1-private-dependency-copy-20261020.json`.

The changed integration checks pass the bytes, derive, CLI and replay
owning typechecks. The selected five Node files first run 34 cases: 29
pass and five graph cases fail because their old package fixture declares
no capabilities while the current maintained Room declares DeviceCommand.
The fixture now takes the actual capability metadata from maintained Grow;
no production guard or assertion is weakened. Its unchanged ten graph
cases then pass, as does the owning derive compiler. These separate runs
are a composite, not one passing pipeline. Raw output and natural closure
are `/tmp/p1-integrated-focused-v2-20261020*` and `...v3-20261020*`.

A separate read-only probe naturally exits one: the new strict v2 reader
requires the seven composition members, and rejects the published signed
Grow packet `71e10ca9` with `application-package-invalid`. The packet and
`DEMO_RELEASE` remain byte-exact Main. The probe signs or rewrites nothing.
Its raw output, exact maintained digests and closed result are
`/tmp/p1-current-main-preflight-20261020*`. Planner request `b32b2f16`
asks for the explicit earlier-v2 reader boundary or a separately reviewed
release/custody cutover before the old reader is retired. Until that
choice, this checkpoint claims no native Worker run, full gate, Source,
activation, publication or deployment. The known failure is not removed
from test selection or relabelled as acceptance.

The new graph workspace's owning compiler and Scope's three owning
compiler projects also pass naturally in
`/tmp/p1-integrated-focused-v4-20261020*`. These compile the merged native
sender-pin path but do not execute it. Source remains distinct from the
pending production format transition and from a native runtime witness.

## Bounded published-release consumption, 20 October

Planner decision `b966ef3f`, ratified `48471bbb`, selects the explicit
earlier-v2 reader boundary. The strict pack input now requires all seven
composition members. The byte packer fills none in; the source reader
requires them before reading definitions or assets. Counter and Lending
sources and the affected TEST pack fixtures now state their empty places
explicitly. Lending's existing outside connection is preserved. V1
fixtures keep their original semantic shape by excluding only the new
composition places before calling the unchanged v1 codec.

`readPublishedApplicationPackage2` and its proof counterpart select the
earlier nine-key semantic shape only for the full existing demo release
`71e10ca9` and its exact public publisher. Every full-composition shape
still uses all strict graph refusals. Both branches check the original
canonical bytes, hashes, signature, closure, projections and presentation;
the earlier branch invents no composition data. Pack and the public
`validatePackage` remain strict. Published consumption is used by the
existing host, client install, native install/projection proof, generic
view, local replay and simulator consumers. The host-side common type
does not falsely promise composition members on an earlier packet; new
source authoring retains its stronger return type.

The simulator's exact published Site/Room pins are selected by the same
full release and publisher. Its ordinary current-source comparison stays
in place for other releases, including TEST packages. This preserves the
existing signed demo while P1's maintained declarations change metadata.
The packet and `demo-release.ts` keep their actual Main bytes. Retirement
requires a separately reviewed replacement release/trust row and an
installed-room upgrade when planner commissions them. No actual publisher
key is read or used; no deployment, activation or hosted completion occurs.

Six owning test compiler projects pass. The first pass correctly catches
the affected TEST inputs' omitted composition; exact inputs are retained
in `/tmp/p1-published-boundary-compiler-v1-input-20261020`. The corrected
compiler results are `...focused-v2-20261020*`. That wrapper's two Vitest
commands use the wrong working directory and find no files: these are
startup failures, not passing tests. Corrected package-directory commands
in `...cases-v3-20261020*` naturally pass five bytes cases and eleven graph
cases. The graph boundary case verifies the actual committed demo bytes,
strict pack/validation refusal with zero signatures, refusal of a valid
TEST-signed earlier-shaped release and preservation of graph refusals for
complete shapes.

One targeted control removes only the exact publication-identity guard.
The unchanged boundary case then fails with an assertion because the
unrelated, correctly TEST-signed earlier shape is accepted. The baseline
passes and exact source bytes are restored. The original control closes
naturally zero with `distinguishes`; its evidence is
`/tmp/p1-published-boundary-control-20261020*`. No sweep or whole-suite
control is run.

The first native run stops in Node capture because the old Counter source
omits the newly required fields; no native case executes. After explicit
source preparation, five native files run twelve cases: seven pass and
five fail. The signed demo installs, but its simulator still compares
against evolving maintained definition digests; three Device cases refuse
the old standalone TEST fixture's unconnected receiver. These actual
failures and input snapshots are retained in `...native-v4-20261020*` and
`...native-v5-20261020*`. They are not gate passes.

The standalone Device package now uses a separately named TEST definition
that omits that unrelated receiver. The original pure-judgment/delivery
fixture and all its handlers remain unchanged. Native install and local
scenario cases use the package fixture's actual digest without removing
an assertion. With that preparation and the exact published simulator
pins, the two affected native files pass all five cases naturally in
17.300439125 seconds wall / 19.319401 seconds child CPU
(`...native-v7-20261020*`). The seven earlier passing cases remain a
separate run; this is a composite, not one passing pipeline or a full gate.
The owning CLI pack file separately passes all eleven cases, including
refusal of omitted source composition before signing; original process
10397 closes naturally zero (`...cli-pack-v6-20261020.log`).

The private dependency pool guard recognizes the copied pinned 0.22.0
bundle, hash `cd50d18adce92adb54a3f00410d646b2fe09b3f12c5b833c492bcf5857621b39`,
without copying or patching it. These local checks read no frozen original
and install nothing. Native tests retain their stated TEST Git/HTTP,
clock, scheduler and owner-actor boundaries; they establish no provider,
browser or hosted acceptance. Final current-Main incorporation, remaining
owning checks, one ordinary gate, Source and complete review are still due.

Follow-up `...consumers-v8-20261020*` passes all five selected compiler
projects, four platform proof cases, seventeen MCP cases and the simulator
release case. CLI scenarios pass ten cases and refuse the scripted device
fixture's empty default-role map before execution. Its exact failed input
is `/tmp/p1-published-boundary-cli-v8-input-20261020.ts`. That TEST package
now declares `operator: ["command", "start"]`, matching the scenario's
existing explicit actor actions; no production or native membership grant
changes. Its selected unchanged scenario then naturally passes in
`...cli-device-v9-20261020.log` (one pass, ten outside the explicit
selection). The earlier ten cases are not rerun or merged into a claim
that v8 passed. No whole gate has run at this cutover checkpoint.

The archive-install consumer of the standalone Device TEST package also
passes its two unchanged native cases naturally: 4.702404500 seconds wall,
5.897221 seconds child CPU, original process 38627
(`...archive-v10-20261020*`). This checks that consumer after its shared
fixture changes; it repeats no whole suite.

## Incorporate landed K2, 20 October

Checkpoint `8a858e4c` records the bounded published-reader work above.
Its mutable private branch then incorporates actual K2 Main `d2088d23`.
The original no-commit merge naturally exits one with two import conflicts;
all six original stages are retained in
`/tmp/p1-k2-main-conflict-stages-20261020/manifest.json`.

Both resolutions start from exact incoming Main. The native Device case
keeps K2's complete `fixtures-native` imports and binding helper, with
only P1's standalone package-definition alias. Its shared package fixture
keeps K2's `fixedSigner` helper and original public TEST seed, plus P1's
explicit composition members and definition alias. No assertion, matrix,
deadline or production grant is removed. The resolution receipt is
`/tmp/p1-k2-main-conflict-resolution-20261020.json`.

The full project typecheck naturally passes, original process 23160
(`/tmp/p1-k2-main-types-20261020.log`). After those actual integration
changes, the owning graph file passes eleven cases and the two Device
and archive native files pass five cases. Original process 73578 closes
naturally zero: graph 1.818196208 seconds wall / 2.397470 child CPU;
native 6.741912333 / 8.127650. Logs and natural closure are
`/tmp/p1-k2-main-focused-20261020*`. These local checks preserve the
existing TEST host/clock/actor boundaries and prove no hosted acceptance.
Current-Main incorporation continues before the one final ordinary gate.

Published Grow host-link Main `c7aaa3ab` then incorporates cleanly with a
natural-zero no-commit merge. All six incoming URL/config/docs/report
paths match that reviewed published head byte for byte. The existing
built-homepage case passes naturally for all six pages in 0.170102958
seconds wall / 0.174896 child CPU. The original merge/check wrapper and
its exact source comparison are `/tmp/p1-integrate-g5-main-20261020*`.
This private-branch incorporation performs no Cloudflare deployment and
does not repeat a whole gate.

## Incorporate K1 shared helpers, 20 October

From clean P1 `9cc60d14`, the private integration takes actual Main
`13193f31`. The original no-commit merge naturally exits one at
`application-package-v2.ts`; all three original stages are retained in
`/tmp/p1-k1-main-conflict-stages-20261020/manifest.json`.

The resolution keeps P1's complete strict composition checks, explicit
published-release selection and common consumption types. It imports
Main's owned-JSON `freeze` helper and removes only the old duplicate
freezer. All calls still freeze the parsed caller-owned JSON in place.
The exact two conflict blocks and resolution hash are in
`/tmp/p1-k1-main-conflict-resolution-20261020.json`.

The shared-helper guard passes (542 source files, 177 byte exports), as
does the full project typecheck. Original process 19449 naturally closes
zero; logs are `/tmp/p1-k1-main-checks-20261020*`.
Original runtime process 3953 then naturally passes five byte cases,
eleven graph cases and both native demo-tick cases. The native phase uses
15.473643792 seconds wall / 17.118584 child CPU, on the same shared warm
macOS arm64/Node 26.12/npm 11.20 host. No exclusivity or performance
generalization follows. Logs and natural closure are
`/tmp/p1-k1-main-runtime-checks-20261020*`.

The common runtime wrapper's B1-specific member-selection sentence does
not describe this P1 invocation: its actual four listed phases are bytes,
graph, pool and the signed native demo. No member-display case is claimed
here. No frozen original, actual publisher key or provider was executed
or accessed, and no whole gate was repeated. One final ordinary gate and
complete Source review remain ahead.


## Generated Page module before the final gate

The owned Page generator closes naturally zero before this branch's first
final gate. It refreshes `apps/room/page/assets.ts` for this combined source.
The old Main module is retained at `/tmp/p1-k1-main-page-module-before-20261020.ts`,
SHA-256 `d3ca772c082c78a456657eae9119d78b01d59290018427c1383f9ce449d4cab7`. The fresh module is SHA-256
`353e8019cdb21c8e15e800299c6d5336d1eed6c9bc1e248a2ec2c416d7b2e672`. No Page source, test, assertion, budget,
permission or signed package changes. Raw build output is
`/tmp/p1-k1-main-page-build-20261020.log`; natural wall/child CPU are
0.308653125 / 0.215249000 seconds.
The closed preflight result is
`/tmp/builder-current-main-page-assets-preflight-20261020.json`.

This adds the generated module to this branch's changed paths. The earlier
prepared gate helper still names the pre-refresh head and remains unrun;
it must not be used as a result for this source. The one ordinary final
gate and full exact-head Source review remain due. No failed full gate is
claimed or concealed on this branch, and no unchanged suite is repeated.


## Reviewed homepage wording Main incorporation

The owned merge of actual Main `248aab8f`, tree `ba40d47e`, closes
naturally zero in 0.038027625 seconds, with no conflicts. All nine imported
wording/preview paths match that reviewed Main exactly. All 79 authored
source, test, generated and prior-report paths keep their bytes and modes
during the merge. No runtime implementation, assertion, deadline, package,
lock or permission changes. Exact original argv/log/closure and protected
hashes are `/tmp/p1-integrate-tagline-main-20261020*`; shared preparation
is `/tmp/builder-incorporate-tagline-main-20261020.py` and its closed result.
The final source gate remains due at this clean integration checkpoint.

## Incorporate reviewed S2b and market Main

The isolated P1 branch now incorporates actual reviewed and published
Main `7bc1490c286a360a1198d144674998b704c167ad`, tree `d6782922`.
Original no-commit merge closes naturally zero in 0.037244334 seconds,
without conflicts. All 23 incoming S2b and market design/docs paths match
Main exactly; all 79 authored paths keep their bytes and modes. Original
argv/log/closure and preserved path sets are
`/tmp/p1-integrate-s2b-main-20261020*`. This changes no shared Main/ref,
credential, provider or deployment state.

The owning integration check passes all three Scope compiler
configurations, the pool prerequisite and both native installed-archive
cases, including Grow. That new S2b witness therefore works with P1's
strict package composition and existing maintained-package selection;
no test or published-package exception is added. Original `91329`
closes naturally zero. Native wall/CPU is 6.013669791/6.957035 seconds
on shared warm macOS 27.0.1 arm64, starting load
1.3823/1.7119/2.1406. Every recorded source byte/mode remains unchanged,
the lock stamp matches and no package installs. Exact commands, source
inputs, logs and closure are `/tmp/p1-s2b-main-focused-20261020*`.
These separate phases are not a gate. P1's first ordinary final gate and
complete exact-head Source review remain required.

## Combine the approved member surface before the first gate

P1 and the then-pending immutable B1 repair `9b7896c2` overlap in four
paths. The isolated P1 merge closes naturally one with three actual
conflicts and preserves all nine original stages before any resolution.
The remaining MCP declared-view file merges automatically. Original
commands and stage manifest are
`/tmp/p1-b1-candidate-integration-20261020*` and
`/tmp/p1-b1-candidate-original-stages-20261020/manifest.json`. This never
changes or executes the permanently frozen B1 originals or shared Main.
B1 is subsequently approved by `c0ff23d8` and lands at actual Main
`9c6d344cbf498835c2811c98d9981e4a55930b36`, tree `d04e2d4b`, under
native receipt `466651e2`; the integrated B1 candidate is unchanged.

The Grow source manifest combines all seven P1 composition values with
exactly the four B1 nullable `lastProber` fact-signer fields. Removing
those four additions recovers the entire P1 JSON value. The native story
combines P1's explicit published-package reader with B1's text digest and
journal-source imports; the merged scenario's assertions, limits and
timeouts are untouched. The generated Page conflict first keeps exact
P1 bytes only as a temporary starting point. After all conflict markers
and unmerged stages are cleared, the actual Page and four-card generators
rebuild both served modules from combined source. No minified module is
hand-merged. Resolution: `/tmp/p1-b1-candidate-resolution-20261020.json`.

The first combined pipeline passes both generators, ten Scope/MCP/Page
compiler configurations and 23 owning Node cases in five files, including
both generated-resource freshness checks. Its native fixture preparation
fails before any case starts: the resolution's whole-file two-space JSON
format expands the Grow source from 64,356 to 144,783 bytes, beyond its
existing allowance. It is not a native assertion failure. That exact
oversized source and both full 2,611-file generation/validation inputs are
physically preserved. The first compact-format helper then stops at an
inline-object formatting guard before writing a file. The separate
corrected helper inserts only the four compact member properties into
the original P1 text, producing 64,776 bytes with an exactly equal JSON
value. Every other source byte and every limit stays unchanged. Records:
`/tmp/p1-b1-combined-focused-20261020*`,
`/tmp/p1-b1-combined-focused-inputs-20261020/{generation,validation}` and
`/tmp/p1-b1-compact-grow-source-v2-20261020.json`.

The separate corrected native-only run passes six cases in four files:
the owned Grow member surface, native projection and SQLite boundary,
both installed-archive cases, and declared member resolution. Original
`13139` closes naturally zero in 12.501363708 wall / 14.064925 CPU seconds
on shared warm macOS 27.0.1 arm64, initial load
1.3931/1.6470/1.7993. All recorded source bytes/modes remain exact, the
lock stamp matches and no package installs. Its full 2,611-file source
input is preserved separately. The preceding pipeline's start load is
1.9463/1.8262/1.9448; each phase has its own wall/CPU record, not a sum
called one passing pipeline. Exact later logs and closure are
`/tmp/p1-b1-native-v2-20261020*`. No unchanged compiler or Node suite is
repeated. P1's first ordinary gate and full Source review remain due.

Actual Main `9c6d344c` is then incorporated through a separate no-commit
merge after the combined checks. It closes naturally zero in
0.024168000 seconds. All 2,611 tracked source bytes/modes and the exact
index tree remain unchanged at `021dd9764b02de071ce5a7e881f8fa3cf59d49ca`;
this imports the native landing ancestry of code already present, with
no regenerated, runtime or test change. Original command, pre-execution
inventory and closure are `/tmp/p1-b1-actual-main-integration-20261020*`.
This report update records that boundary before P1's first ordinary gate.


## Repair raw Node loading after the first gate

The first ordinary P1 gate at `2a817097`, tree `c2064455`, closes
naturally one. All compiler, helper and whitespace checks pass. Vitest
reports 2,012 passed, three failed and three skipped cases, in 420 passed,
two failed and one skipped files. The three failures are the unchanged
Replay raw Node executable checks: disconnected SHA-1 and SHA-256 clones,
and no-argument usage. Node and Counting checks are not reached. Original
`51343` takes 518.319865375 wall / 761.776017 CPU seconds on shared warm
macOS 27.0.1 arm64, Node 26.12.0, npm 11.20.0; initial load is
3.0986/2.0815/1.8838. All 2,611 source files remain exact, dependency
changes are confined to the owned Vite cache, the lock stamp matches,
and no packages install. Raw warnings are retained without attribution.
Original records are `/tmp/p1-b1-main-gate-20261020*`; all gate inputs
are preserved at `/tmp/p1-first-gate-inputs-20261020`.

The new package-graph error uses a TypeScript parameter property, which
Node's strip-only loader rejects. Explicit readonly fields and constructor
assignments preserve its reason, path and message. The first focused
repair then exposes another import issue: derive's new package validator
makes Bytes' application error classes reachable from Replay's raw Node
entrypoint. Five such classes also use parameter properties. That focused
run closes naturally one with 30 passed and the same three failed CLI
assertions; generators and package-graph typechecking pass. Its exact
2,611-file generation and validation inputs are preserved separately at
`/tmp/p1-node-strip-v1-inputs-20261020`, with original phase records at
`/tmp/p1-node-strip-repair-focused-20261020*`. Nothing is replayed or
classified as a passing combined pipeline.

All five Bytes constructors now use explicit fields and assignments,
with the same error class inheritance, defaults, messages and values.
Bytes and package-graph enable `erasableSyntaxOnly` to reject this syntax
during compilation. The separate changed-code focused run `18438` closes
naturally zero: both actual generators, Bytes source/test typechecking,
and 33 owning cases in six files pass. These include both raw Node clone
cases, usage, package graphs, codecs and generated Page/MCP freshness.
The owning test phase takes 13.051191459 wall / 16.412188 CPU seconds;
initial load is 2.1274/1.8848/1.9233 on the same shared warm host. Source
bytes/modes remain exact during validation, the lock stamp matches, and
no packages install. Records are
`/tmp/p1-node-strip-repair-focused-v2-20261020*`; exact generation and
validation inputs are `/tmp/p1-node-strip-v2-inputs-20261020`.

No CLI assertions, expected statuses, bounds, timeouts or cohorts change.
The original real executable failures distinguish the loader fault; no
mutation sweep is run. Actual generators rebuild served assets from the
changed source. A new ordinary gate on the changed code and complete
exact-head review remain due.


## Require a current projection before the refusal scenario

The changed-code ordinary gate `32164` at `b24acf354`, tree `02281535`,
closes naturally one. All three prior raw Node CLI assertions now pass.
Compiler, helper and whitespace phases pass. Vitest reports 2,014 passed,
one failed and three skipped cases, in 421 passed, one failed and one
skipped files. The failure is the existing lending story at line 248:
the gateway returns `nothing-sent` because its list is not current,
where the scenario expects the unauthorized cancellation refusal. Node
and Counting checks are not reached. Original wall / child CPU time is
521.259619875 / 763.948453 seconds, with shared warm starting load
1.8008/1.8677/1.9116. All 2,611 source files remain exact and clean;
only the owned Vite cache changes among 5,531 dependency rows, the lock
stamp matches, and no package installs. Original logs and closure are
`/tmp/p1-b1-main-gate-v2-20261020*`; the exact source input is
`/tmp/p1-changed-gate-inputs-20261020`. Raw warnings remain unclassified.

One unchanged focused lending run then passes in 7.301891625 wall /
8.802306 CPU seconds. The previously unreached 33 Node and 55 Counting
checks pass separately in 3.698681125 / 3.914157 and 1.905248750 /
3.058842 wall / CPU seconds. This is an honest composite of separate
outcomes, not a passing original gate, a reproduced cause or stability
evidence. Original `43887` records, exact source inventory and the
Counting evidence path are
`/tmp/p1-lending-gate-triage-and-remainder-20261020*`;
`/tmp/p1-lending-unchanged-triage-inputs-20261020` preserves all inputs.

The refusal segment previously called `g.look()` without asserting its
result, then drained the donation's publication replies. The historical
projection route makes several authenticated reads, so the scenario
needs the drain before the projection. It now settles the same L/G
fixture dispatcher first and asserts that `g.look()` is current before
the original unauthorized-refusal, custody and unchanged-head assertions.
There is no gateway, production, grant, cohort, retry, sleep or timeout
change. This strengthens the scenario's precondition without claiming
the original failure's cause. It is a narrow P1 integration prerequisite,
not the broader queued gate-stability task.

The corrected fixture's separate focused run `93995` passes Scope test
typechecking and its one native scenario. The scenario takes
7.342362417 wall / 8.858656 CPU seconds; initial shared warm load is
2.0142/2.4399/2.3486. All source bytes/modes and checkout status remain
unchanged during that run, the lock stamp matches, and no package
installs. Records are `/tmp/p1-lending-ordered-refusal-focused-20261020*`;
all 2,611 source inputs are preserved at
`/tmp/p1-lending-ordered-refusal-inputs-20261020`. The new changed-code
ordinary gate and complete review remain due; no unchanged whole-suite
replay or mutation sweep is run.
