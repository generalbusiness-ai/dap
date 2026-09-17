# Ordering lifecycle expectations

This O1 manifest fixes the expected observations for O4's formal baseline.
Its sources are the spike plan §4.6 and the ordering
note §7 and §9. The executable companion is `ordering-lifecycle.ts`.
`ORDERING_LIFECYCLE_MANIFEST_ID` hashes the canonical object containing the
content ids of this prose and that module. A change to either is a new
manifest; O4 must cite the identity it executes.

This revision covers participant-input resilience, strict unexpected-error
propagation, availability of certified transfer after ineffective member
attempts, and explicit Inspection disclosure accounting (K1–K4, L1–L3 and M1).
Opening rule `/3` additionally distinguishes an application kind proved
unbound at the event position from a bound but unavailable or indeterminate
kind. The mandate and result disclosed by S20/F1 remain explicitly public;
that disclosure repair does not remove delivered content. These are
post-review corrections. Component and combined measurements remain at
their own sources and are not implementation approval. The earlier revision defined intervening destination events and
retry of failed activation, retaining the malformed-genesis outcomes and
adopted public-proof completeness boundary. The activation phase is
a **builder design decision for Hugh**, made under his instruction to make
normal spike decisions and complete unattended:
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:c2982a6e6756f4fed08e5a82acc8b05a65127745`.
It is not a design change commissioned by the checker or an implementation
approval. That activation-phase correction was a **pre-formal-O4-baseline
revision**: an O4 prototype and failing development checks already existed.
The following manifest identities and their runs remain historical evidence, not results for this revision:

- `sha256:63be83e60036a5936569c478da7a8c7be6b8ab1c744d59ef3296b7d6182b5a9d`;
- `sha256:d7419b5d85d9acd4767b8733b47729c29f49088a0495ee246c60c2da658a7613`;
- `sha256:75de2a860b049b5d9dcad3dab234be14d7a965d53df2e0d0eae8de6f05a1b327`;
- `sha256:fc55bfa123891e750f7bbe3a0d9cb33b5f65c07750db08bc984544ed2dd6b378`;
- `sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`;
- `sha256:a766fe56564b026a96c37630d261512c0f608adf5ec7c5ee2d11aca23eaf45fe` (combined K1–K4, source `2ee1b43a`);
- `sha256:92ad0023e387cd4a6305d074ab99f7a29cbcc1699cd88b8dcf439a446ef58828` (combined L1–L3, source `f8987d22`).

Component-only manifests also remain historical: K4
`sha256:b2501d040c87c31fee574549254902cc00b3a86d98a94098d7b8296bef2c59e6`
at `e90b64b`; initial K3
`sha256:e97568583079211cb99cdd572fa5e23b749e8a95c621324e1fec56858d387e53`
at `0aa8687`/`813c84c`; refined K3
`sha256:bdb831b32915c0b209afcbcdfc8c24e671dcd60eb4dd1ffca17a2b6300ae5746`
at `82119b5`/`1bf5355`. Those component results are not combined validation.

Their source and run boundaries remain in the [O1 ledger](ordering-o1.ledger.md)
and [O4 ledger](ordering-o4.ledger.md).
Ratified checker design assessment:
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:ca04cc02027b9070bb60e3852ac19e21ae7931f4`;
builder adoption, including the disclosure boundary:
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:42ffb3413ded6c33fb39d25296cd04ce0f005d6a`.

The tests in `test/ordering-lifecycle.test.ts` check the specification's
shape, coverage, literal boundary outcomes and safety assertions. They also
plant bad observations to check that the comparison detects them. These
tests do not run a transfer protocol, verify release proofs, or establish
crash safety. O4 must execute the actions through the real codec, journal,
source semantics and grants, then compare observations with this manifest.

## Fixed domain and identities

S is Alice's guitar sale. Its writer starts as W0 and moves to W1. I is
Ivan's inspection of offer o2, with writer WI; it owns no exclusive right.
D arranges delivery, with writer WD, buyer Bob, slot 25 and courier Kim.
F joins fulfilment and delivery, with writer WF and participants Alice,
Bob and Kim. All four remain separate context identities and histories.

R_sell permits Alice to accept one offer in S. Acceptance at S17 spends
that right and creates R_fulfil, owned by Alice. R_deliver belongs to Kim
in D. The one join transfers R_fulfil from S and R_deliver from D to F.
An owner is a principal within a context; moving S's writer changes no
owner, genesis, earlier position, outcome or retry receipt.

Names such as `S`, `S@23`, `S-export`, `F`, `join-manifest` and
`S-valid-A` are explicit symbolic references. O4 must resolve them to real
genesis ids, header hashes, signed exports, a pinned transition manifest
and independently checked proofs. The destination template is not a wire
schema or a cryptographic vector. Its grants of transferred rights remain
conditional until activation. Scope authorization and application rights
are separate: Alice may release for S and activate F; Kim may release for
D; Bob has neither release authority.

F's complete signed genesis is prepared before either release and is the
destination commitment. It binds the foundation, runtime, sequencing
profile and writer, grants, bindings, origins, referents, route and
transition. The transition binds both source identities, exact source
prefixes S23 and D0, the manifest, rights, exports, transformation and
retained dependencies. It contains no release receipt or proof. A release
receipt proves ordering only: O4 must verify the source's effective release
and authority, including its semantic package and grant basis. This fixture
uses that verification path rather than a trusted summary attestation.
F additionally trusts the source writer's signed completeness certificate
for the set of public openings under the named rule, not for any release
effect. F's genesis must pin that trust, source identity and export prefix.
The producer performs a serving-party function that reads event kinds and
assigned audiences and source verdicts; a pure ordering signature does not
establish completeness. Classification of an ineffective actor-only attempt
is part of that serving trust; a hidden failed attempt supplies no authority.
O4's profile and formal baseline must pin the exact implemented rule content
id and certificate checks before this expectation is claimed as executed.

## Healthy trace and complete owner boundaries

The Sale trace keeps its original positions 0–19. Inspection is attached
at 11 and requested at 14. Its child records a result before the remaining
Sale events; that result has no effect in S until the explicit import at
20. Offer o3's public stub is at 15, its private terms at 16, and its public
acceptance at 17. The second acceptance attempt at 18 is ineffective and
the sale closes at 19.

The table lists every healthy boundary. An absent or spent right has no
active owner. “None” means no context may exercise that right. The
executable snapshots also state every context's head, writer, right status,
Sale decision, Inspection result, imports, release evidence and activation
count at each row.

The `owners` arrays record actual context/principal pairs separately from
right statuses. O4 must populate them from the runtime's authority state;
it must not infer Alice or Kim from this manifest when reporting an owner.
The comparison therefore detects a right given to the wrong principal as
well as duplicate live copies and incorrect right statuses.

| Boundary | Heads S / I / D / F | R_sell active owner | R_fulfil active owner | R_deliver active owner |
|---|---|---|---|---|
| sale-started | 1 / — / — / — | S, Alice | none | none |
| before-attach | 10 / — / — / — | S, Alice | none | none |
| inspection-attached | 11 / — / — / — | S, Alice | none | none |
| inspection-requested | 14 / — / — / — | S, Alice | none | none |
| inspection-spawned | 14 / 0 / — / — | S, Alice | none | none |
| inspection-result-recorded | 14 / 1 / — / — | S, Alice | none | none |
| sale-accepted | 17 / 1 / — / — | none | S, Alice | none |
| sale-closed | 19 / 1 / — / — | none | S, Alice | none |
| inspection-imported | 20 / 1 / — / — | none | S, Alice | none |
| writer-sealed | 21 / 1 / — / — | none | S, Alice | none |
| writer-assigned | 22 / 1 / — / — | none | S, Alice | none |
| writer-continued | 23 / 1 / — / — | none | S, Alice | none |
| delivery-started | 23 / 1 / 0 / — | none | S, Alice | D, Kim |
| destination-described | 23 / 1 / 0 / — | none | S, Alice | D, Kim |
| sale-released | 24 / 1 / 0 / — | none | none | D, Kim |
| delivery-released | 24 / 1 / 1 / — | none | none | none |
| destination-started | 24 / 1 / 1 / 0 | none | none | none |
| destination-activated | 24 / 1 / 1 / 1 | none | F, Alice | F, Kim |
| delivery-confirmed | 24 / 1 / 1 / 2 | none | F, Alice | none |
| sale-fulfilled | 24 / 1 / 1 / 3 | none | none | none |

The seal is S21, signed under the retiring assignment and bound to S20.
The authorized assign is S22, bound to the committed seal. W1's first
entry is S23, bound to the committed assign. Between seal and assign no
writer may append application work. Neither of two client nominations
alone grants a successor authority. W0 cannot resume after the move.

F starts at 0 with dormant rights and copied initial facts. Its activation
phase begins after genesis and any adopted origins. Both proofs must
establish effective releases to the same F and
the same transition. At F1 the two rights become live together, exactly
once. Kim confirms delivery at F2 and Alice fulfils at F3; both rights are
then spent. This is the healthy progress check.
An admitted unsuccessful activation takes a position but leaves the rights
dormant. When missing proof is supplied, a later fresh attempt may first
activate: the withheld-evidence branch fails at F1 and succeeds at F2.
Otherwise admissible unrelated destination events may occur before success,
under ordinary admission, authorization and effect rules. An otherwise
authorized exercise of a transferred right is ineffective with `dormant_right`.
Mere intervening history, including an ineffective event by another participant,
must not permanently block activation. Each attempt still verifies the
transition, source identities, exact export prefixes and retained inputs
pinned by F's genesis and independently proven releases. Current authorization
and closed-context gates still apply; intervening history cannot replace the
genesis pins. After the first success, later activation has no further effect.
An exact retry of a failed or successful attempt returns that attempt's saved
receipt with no new position, even after a later attempt succeeds.

## Export, import and privacy rules

S exports exactly `{accepted_offer: "o3", winner: "bob"}` from public
facts S15 and S17. It exports no amount, counter, private terms or private
payload. The accepted amount 780 remains readable only by Alice and Bob;
Kim, F and I gain no access to that amount through the transfer. Public
fact references and headers may travel; the payload at S16 may not. O4 must inspect actual
serialized exports, proof disclosures and destination observations, not
merely the normalized snapshots.

The public proof carries more than the two-field state export. Under the
existing subject-to-disclosure clause, this fixture explicitly discloses
the following S authority bodies, when present with an assigned `spine` or
`members` audience, to **every reader of F's spine `dap.scope.activate`**,
including current Alice, Bob and Kim and future F readers:

- `ai.generalbusiness.dap.genesis`, `accept_invite`, `grant`, `revoke`,
  `attach`, `close`, `scope.release`, `scope.activate`, `admit`,
  `seq.request`, `seq.seal`, and `seq.assign` (all abbreviated names after
  the first use that same `ai.generalbusiness.dap.` prefix);
- `com.example.sale.listing`, `offer`, `withdraw`, `accept`, and `close`
  (the latter names use `com.example.sale.`);
- `com.example.scope.result`, `exercise`, `import-export`, and `recover`
  (the latter names use `com.example.scope.`).

This includes Carol's o2 stub and participation, and accepted invitations'
embedded issuance proofs. Kim is not a member of S. The disclosure therefore
extends original members-at-recording visibility; the report must count it
and must not claim that the original reader set remained unchanged.
`publicOpeningRule` in the executable manifest names the exact kind list,
required audiences and banned fields for `dap.fixture.scope-public-openings/3`.
Its `ineffectiveActorOnly` exception requires a known, determinate source
verdict with `effective === false` and an audience of exactly the actor alone.
The rule explicitly excludes `model_unavailable`, `not_in_v1`, `package_unavailable`,
`scope_runtime_required`, `unhandled`, and `audience_error:` / `fold_error:`
reason prefixes, including per-model reasons. `model_unavailable` is a
synthetic diagnostic control: the fixed fixture registry does not reach an
actually unavailable bound model. The separate `unboundActorOnly`
exception requires a listed application kind absent from the effective binding
history before its event position and the exact foundation outcome
`known:false`, `authorized:false`, `effective:false`, `reason:unhandled`,
without per-model diagnostics. It requires the same exact actor-only audience.
A later attachment does not alter that earlier classification. A caller's
expected binding or an unavailable registry entry cannot establish absence;
bound placeholders/errors and system kinds cannot use this second exception.
Both qualifying positions stay header-only. Every other narrower
listed-kind audience still makes the producer refuse certification, including
an effective actor-only body; it may not hide or widen that body. An absent verdict or other
indeterminate outcome cannot qualify. Every unlisted position stays
header-only. `dap.disclose` is excluded because this proof
uses the fixed assigned-audience rule, not source recipient disclosures;
`dap.observe` is excluded because ambient facts are outside this fixture's
release dependencies. A dependency needing either would require a revised
rule. No Sale amount, counter, terms or private inspection-request body
may occur in an activation payload. Required byte-level checks and actual
recipient observations remain O4 evidence obligations.

The admitted proof at S20 carries I's signed genesis and I1 result. Its
mandate discloses `{source: S, prefix: 14, offer: "o2", inspector: "ivan"}`,
where S resolves to the actual source genesis, and its result is
`{offer: "o2", result: "pass:o2"}`. It also names Ivan as I's founder.
S14 was readable by Alice, Carol and Ivan; S20's members audience additionally
reveals these facts to Bob. F1's spine audience reveals them to every F
reader, including current participants Alice, Bob and Kim and future readers.
S14 remains header-only in the proof, and neither the
mandate nor result explicitly attributes the request to Carol. This is not
request-content secrecy or an unlinkability claim: Carol's public identity
and offer stub are separately disclosed. `inspectionDisclosure` fixes these
literal observations. The focused memory/SQLite check must verify the signed
openings and current recipient views before and after cold reopen, including
Bob's hidden S14 but readable S20 and Kim's readable nested proof in F1.

D exports exactly `{buyer: "bob", delivery_slot: 25}`. F copies these
facts and the explicit rights, unions distinct imports and rejects
duplicates. Activation with D's buyer different from S's winner is
ineffective with `mismatch`. Duplicate inspection imports and duplicate
state exports have no second effect; their source identities are retained.
There is no inferred order between S's earlier events and D's earlier
events. The `imports` list records adopted state identities, including
dormant initialization; `exports` records effective source exports.

## O4 completeness contract and required tests

Ratified checker assessment `ca04cc02027b9070bb60e3852ac19e21ae7931f4` and
builder adoption `42ffb3413ded6c33fb39d25296cd04ce0f005d6a` require all seven
profile obligations, defined fully in
[O4: public-proof completeness](../ordering-profile.md#o4-public-proof-completeness):

- **A1 — Serving-party trust:** F pins trust in completeness only; release
  effect remains independently replayed.
- **A2 — Exact public-data rule:** the 21 authority kinds, assigned audiences,
  excluded disclose/observe kinds, banned fields and named rule content id.
- **A3 — Exact certificate format:** canonical packet digest, type, rule,
  genesis and frontier; strict fields and private-data checks.
- **A4 — Frontier header signer:** W0 through assign H+2, W1 from H+3.
- **A5 — Genesis-pinned release boundary:** source and export prefix p come
  from F's genesis; r = p+1; frontier >= r; effect evaluated through r.
- **A6 — Independent destination checks:** shapes, chains, signatures,
  actor proofs, dependency pause, grants, release authority and effect.
- **A7 — Remaining trust limits:** malicious omission or tailoring,
  historical retired-key trust, forks and copies; member recomputation and
  transferable signed evidence of an incomplete packet.

The O4 formal baseline must execute all nine groups using actual signed
journals on **memory and SQLite**, retaining observed outcomes:

1. **Removed authority openings.** Refuse a certified packet with a grant,
   revoke, withdraw or attach body removed. The five original failing
   development checks must become refusals.
2. **Stripped branches cannot activate.** Neither the withdraw-stripped nor
   the revoke-stripped source branch may activate F.
3. **Release frontier coverage.** Refuse a certificate below r. A valid
   certificate at a later frontier gives the same release verdict at r.
4. **Wrong frontier signer.** Refuse a non-writer, the successor at or before
   H+2, and W0 from H+3 onward; the assign header at H+2 still belongs to W0.
5. **Certificate and packet mutations.** Refuse changed type, rule, genesis
   or frontier, and extra fields in the certificate or public proof.
6. **Capped authority audience.** An effective authority-kind event with a
   narrower assigned audience, even exactly actor-only, makes the producer
   refuse certification. Bob's unauthorized acceptance/close and Carol's
   malformed grant remain hidden, confer no authority, and do not block a
   later authorized release, certification and activation on memory or SQLite.
   Ordinary member attempts at both system scope operations and all four
   application Scope kinds must likewise preserve later certification. A listed
   application kind proved unbound before the event qualifies only under the
   exact `unboundActorOnly` rule. Other unknown and all bound placeholder/error
   actor-only outcomes must refuse, not masquerade as determinate failures.
7. **Malicious valid signature.** Record a writer's signed omission as
   outside destination protection, potentially creating duplicate live rights;
   a source member with all relevant openings can recompute and detect it.
8. **Full/public differential.** For every certified packet, compare public
   replay with full-journal verdicts at every opened position and at release r.
9. **Activation bytes and derived disclosures.** Check actual serialized
   activate payloads for absence of amounts, counters, terms and the S14
   inspection-request body. Check the admitted I genesis mandate and result
   that remain present, and their actual S and F recipient views, against
   `inspectionDisclosure`. Absence of the request body does not mean absence
   of its derived content.

These are required evidence groups, not results of O1's manifest-shape tests.
The disclosure accounting above records the decision's B1/B2 specification
obligations; actual recipient observations and byte checks remain O4's work.

The fixture's authority uniqueness assertion is local to its selected
journals. The same signed destination genesis can be opened on separate
copies and activate independently; it does not name one unique physical
instance. An authorized source owner can also release after ordinary source
`dap.close`; closure does not revoke that release authority. These are
existing limits, not additional healthy-trace steps or a changed policy.
A scope-bearing genesis intentionally opts into shared-foundation setup and
founder semantics even through plain Journal; full ScopeJournal validation
remains a separate facade contract.

## Independent branches and adverse cases

Each `lifecycleCases` item branches from its named healthy snapshot.
Its steps carry full expected observations, verdicts and reasons.
An optional `variant` rebuilds that branch's inputs before signing; its
`initial` snapshot, when present, states the resulting starting observation.
“Ineffective” means an admitted attempt takes a local position but changes
no business authority. “Refused” and an exact retry take no new position.
`verifiedProofs` is diagnostic evidence available at F, not a grant or a
claim that an ineffective attempt changed business state. A missing-proof
attempt records which source proof was available. Error reasons here are
fixture expectations for O4 to implement or explicitly revise before its
baseline.

- **One release missing.** Start F after S releases but before D does, then
  attempt activation with only S's proof. It is ineffective with
  `missing_release`. R_fulfil has no active owner; D still owns R_deliver;
  both rights in F stay dormant. Draft initial facts confer no authority.
- **Withheld evidence.** Both sources released, but D's proof is withheld.
  Activation is ineffective and both rights stay dormant. A timeout
  cannot revive S. Supplying both proofs later activates F once.
- **Intervening dormant exercise (`intervening-dormant-exercise`).** Start
  from `destination-started`. Alice's missing-proof activation at F1 is
  ineffective with `missing_release`. An exact retry returns F1's saved
  receipt. Alice's exercise at F2 is ineffective with `dormant_right`, and
  retrying failed F1 still takes no position. A fresh activation with both
  valid proofs succeeds at F3. Exact retries of successful F3 and failed F1
  both return their own saved receipts and keep the head at F3.
- **Another participant's event (`intervening-participant-event`).** Bob is
  an admitted F founder but has no observe capability. His signed
  `dap.observe` of `{fact: {note: "waiting"}}` takes F1 and is ineffective
  with `unauthorized` under the ordinary foundation rule. Alice's fresh
  activation with both valid proofs succeeds at F2. Bob's ineffective event
  creates no permanent activation barrier and changes no genesis pin.
  O4 must execute both intervening cases on memory and SQLite, using actual
  authenticated entries and saved retry receipts.
- **Restart.** Restart before activation preserves the dormant state.
  Restart after activation preserves F's authority and activation count.
  Repeating activation with a fresh action id is ineffective with
  `already_active`; different valid proof material for the same releases
  has the same outcome. An exact retry of a failed or successful attempt
  returns that attempt's original receipt and takes no position. Timeout
  recovery is also ineffective when activation happened but its reply was
  withheld; no source regains a right.
- **Source-bound proposals.** Bob's offer signed for S while open at S14
  stays bound to S. S's already closed Sale judges it ineffective with the
  per-model reason `not_open`; its observed Sale status remains `closed`.
  F refuses the same envelope with `wrong_genesis`; it is never retargeted.
  A release proposal naming stale source prefix S22 instead of S23 is
  ineffective with `stale_export`.
- **Release authority and effect.** Bob cannot release S's right. D cannot
  release R_fulfil because it never owned it. S cannot release R_fulfil
  again. An authenticated receipt for an ineffective or unauthorized
  release cannot activate F. A valid release to another destination also
  cannot activate F. Claims by two sources to export R_fulfil are rejected
  as `duplicate_right`, without making a second copy live.
- **Before activation.** Exercises in S or D after release are ineffective
  with `released_right`; exercises in F are ineffective with
  `dormant_right`. The origin variant prepares an F genesis containing an
  origin that attempts R_fulfil, recomputes the destination commitment
  before the source releases, and adopts that origin at F1. The origin
  cannot exercise the right; activation may first be attempted at F2.
- **Changed genesis.** `changedGenesisCases` enumerates replacement and
  removal of every field and container in the complete signed template,
  and addition of an extra field. The changed destination cannot use the
  releases to the original commitment. This covers actor, nonce,
  signature, all nested grant/binding/transition fields and empty arrays,
  as well as foundation, runtime, assignment and source identities. O4
  must apply this enumeration to its fully materialized genesis too, so
  additional fields cannot escape the check. Malformed or badly signed
  candidates may fail earlier at a specifically recognized codec or profile
  validation boundary; no changed candidate may activate or hold an active
  destination right. For a valid different genesis, an admitted authorized
  attempt must fail with `destination_mismatch`. An unauthorized attempt may
  instead fail earlier with actual reason `unauthorized`, backed by the
  foundation verdict's `authorized:false`. Removing the creator's activation
  grant and re-signing can produce such a valid genesis; a missing grant is
  not itself a malformed-profile condition. Both branches require zero
  activations and no active destination rights. This is a pre-baseline
  expectation correction from the materialized-genesis development test;
  its failed evidence is retained, and no profile restriction is added to
  force a different refusal order. The executable expectations distinguish
  these conditional outcomes. A generic catch, unexpected TypeError, storage error
  or other unrecognized exception is a test failure, never evidence of safe
  rejection. O4 must retain the exact diagnostic and its recognized class.

The mismatch branch constructs D's state with buyer Carol before preparing
and committing that branch's genesis and releases. Proof aliases are
resolved within each branch: they do not stand for a forged proof over the
healthy export. Similarly, alternate origin, duplicate-right and bad
release evidence branches must construct the stated source evidence; a
test double that simply returns the expected reason does not execute O4.

The snapshots have three deliberate representation limits. A source's
`released` status is not destination dormancy: F's right is `absent` before
F exists, then `dormant` until activation. The origin variant compares logical
fold prefixes inside atomic genesis-plus-origins initialization; its F0/F1
observations are not separately committed initialization transactions or a
post-creation origin append. Finally, destination participants are absent
from `LifecycleSnapshot`; its owner table alone does not verify their
admission. O4 must observe actual participants separately. These caveats
add no removal, discovery or general migration protocol.

## Replay checks and limits

O4 records event identities, verdicts, audiences and observations at every
frontier 0–10, then replays across the attach and compares them at those
same frontiers and visibility bases. It also compares all original Sale
outcomes through 19 after handover and transfer. The manifest fixes the
pre-attach public stubs and each private terms reader set separately.
Importing I1 affects S from 20 only. Retrying S17 through W1 returns the
original receipt. Every source order stays verifiable independently.

This small fixture claims no general merger, migration, reconciliation,
automatic failover or nonblocking join. The release-then-activate protocol
may block indefinitely. A timeout supplies no evidence for safe recovery.
Its eventual O4 result concerns this lifecycle; passing the present O1
manifest tests establishes only that these expectations are consistent,
complete for the listed cases, and checked against deliberate mutations.


K3 revises the named public-opening rule under builder decision
`b70fbd1f1ee8ed3d6a7008456d0292330d92c263` following review `10521cbe`.
The former manifest `sha256:d94090b21ce42f2eec4a046558b3a776895d82905c2096a19df1f5f02e011f86`
and `/1` opening-rule packets remain evidence at their original sources.
The new exception does not prove its own classification: a dishonest writer
can misclassify effective authority, including unbound status. Hiding a
revocation can make an unauthorized release appear effective and create live
copies of one right at both source and destination. Source members with complete openings
can recompute the effect and audience and retain the conflicting signed
packets; the destination cannot discover the lie from an opaque header.


L3 extends this rule under adoption `794a913979b8e34c5b32d9e1d401f6300730ee34`
following review `869821de`. The new content id is `sha256:9e9bcbdd74fe244fb63c5e339256ab508b2b3251d2e8fa642b3309cd1f1049e6`.
The certificate envelope remains `dap.fixture.public-proof-completeness/1`.
Two historical declarations shared the `/2` type name: provisional
`sha256:614f837e0f4f795625bc69d690a13c3d2a38c28e1a349bc49ed6db35cc972a71`
at `0aa8687`/`813c84c`, and refined
`sha256:701403e9c51e6449ca797545818a8b63602a20a9b43c2ace064e9a38ab55b66c`
at `82119b5` and combined `2ee1b43a`. The certificate pins the exact content
id; neither declaration nor any historical packet is migrated to `/3`.

Required L3 regressions submit Bob's unbound Sale offer in D on both stores,
then certify, release, activate once and spend both destination rights, with
exact retry and cold-reopened proof equality. I and F separately check unbound
member attempts followed by a successful result or spends and certification;
these are source-proof parity checks, not a new transfer protocol for I or F.
A later attachment must preserve an earlier unbound proof while a later
bound unavailable/placeholder attempt still prevents certification. Effective
narrow authority and existing authentication/completeness checks stay enforced.
The writer remains trusted for classification; a recipient cannot prove it
from an opaque header, and source detection requires all relevant openings.


## M1 resource, disclosure and coverage limits

M1 follows review `66effd75`, ratification `919baa74` and adoption `739b7bf7`
in the same O4 workroom. It requires classification of every catch reachable
from strict replay or proof verification, including ordering admission;
[the catch catalogue](../ordering-catch-boundary.md) gives the source and
measured coverage rather than claiming that a passing crypto sweep covers all
error boundaries. The public-opening rule remains `/3` (`9e9bcbdd`) and the
completeness certificate remains `/1`. Updating this prose yields a new
lifecycle manifest without changing those protocol declarations.

Activation carries complete source packets inside one signed envelope and
therefore shares the existing 65,536-byte envelope bound. The fixture has no
proof chunking or pre-release size reservation. At reviewed `15b660ca`, about
100 ordinary unknown attempts produced a 65,408-byte S proof and activation
was refused with `envelope_bounds` after both releases became effective;
F remained dormant. With 80 attempts the 57,828-byte proof activated. These
reviewer measurements, also reproduced at `e0467ae9`, are content-dependent
examples, not an event-count limit or new builder run. A long honest history
can reach the same barrier. No timeout reverses releases.

There is no declared nesting-depth bound. Review's roughly 2,076-level array
input passed envelope checks and overflowed `structuredClone` before append,
storing no bytes but requiring a fresh facade. M1 documents this input-resource
limit; it adds no new depth protocol. Runtime/input shape affect the threshold.

A refused Inspection request still adds any string seller/inspector values to
its assigned audience along with its actor. Non-string values fall back to the
actor. The named recipients can therefore read such an ineffective request;
refusal is not an assurance of actor-only visibility. The healthy S14/S20/F1
request-derived disclosure contract above is unchanged.

The core own-property repair is bounded. Scope destination-author facts and
package names have a separate M1 repair; the frozen Club standing projection
still mishandles a `__proto__` member after a privileged `set-standing` event.
O4 neither changes Club nor relabels its earlier positive or negative result.
The private Scope constructor constrains TypeScript callers, not JavaScript
execution. Postfault proof/view reads on memory and the final-verification
exception that leaves a successfully replayed facade usable remain limits.
Deliberately thrown Scope policy classes and allowlisted Journal/control Error
messages remain intentional conversions, as detailed in the catch catalogue.

The materialized-genesis test asserts its already-computed 209 outcomes:
30 `destination_mismatch`, five actual `unauthorized`, 154 recognized invalid
genesis, 18 malformed envelopes and two unsupported profiles. These assertions
reuse the existing sweep. The frontier-at-least-r, prefix-pin, r = p+1 and
replay-limit guards remain defence in depth: later checks duplicate them,
so the existing tests do not isolate each first guard. These are not four
independent negative cases. The S23-frontier packet still
returns `ineffective_release` because it cannot establish the S24 release.
