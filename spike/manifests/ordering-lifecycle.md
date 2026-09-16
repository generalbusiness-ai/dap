# Ordering lifecycle expectations

This O1 manifest fixes the expected observations for O4's formal baseline.
Its sources are the spike plan §4.6 and the ordering
note §7 and §9. The executable companion is `ordering-lifecycle.ts`.
`ORDERING_LIFECYCLE_MANIFEST_ID` hashes the canonical object containing the
content ids of this prose and that module. A change to either is a new
manifest; O4 must cite the identity it executes.

This revision corrects the activation phase and malformed-genesis outcomes
after O1 review, and records the adopted public-proof completeness and
disclosure boundary. It is a **pre-formal-O4-baseline correction**: an O4
prototype and failing development checks already exist. The historical
manifest `sha256:63be83e60036a5936569c478da7a8c7be6b8ab1c744d59ef3296b7d6182b5a9d`
and its run records remain historical evidence, not results for this revision.
Completeness decision:
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:ca04cc02027b9070bb60e3852ac19e21ae7931f4`;
disclosure adoption:
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
assigned audiences; a pure ordering signature does not establish completeness.
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
dormant. When missing proof is supplied, a later attempt may first activate:
the withheld-evidence branch fails at F1 and succeeds at F2. An intervening
attempt to exercise a dormant right is ineffective. After the first success,
later activation has no further effect; an exact retry takes no new position.

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
required audiences and banned fields for `dap.fixture.scope-public-openings/1`.
An authority-kind event with a narrower assigned audience makes the producer
refuse certification, rather than hiding it or widening it. Every other
position stays header-only. `dap.disclose` is excluded because this proof
uses the fixed assigned-audience rule, not source recipient disclosures;
`dap.observe` is excluded because ambient facts are outside this fixture's
release dependencies. A dependency needing either would require a revised
rule. No Sale amount, counter, terms or private inspection-request body
may occur in an activation payload. Required byte-level checks and actual
recipient observations remain O4 evidence obligations.

D exports exactly `{buyer: "bob", delivery_slot: 25}`. F copies these
facts and the explicit rights, unions distinct imports and rejects
duplicates. Activation with D's buyer different from S's winner is
ineffective with `mismatch`. Duplicate inspection imports and duplicate
state exports have no second effect; their source identities are retained.
There is no inferred order between S's earlier events and D's earlier
events. The `imports` list records adopted state identities, including
dormant initialization; `exports` records effective source exports.

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
- **Restart.** Restart before activation preserves the dormant state.
  Restart after activation preserves F's authority and activation count.
  Repeating activation with a fresh action id is ineffective with
  `already_active`; different valid proof material for the same releases
  has the same outcome. An exact retry returns the original receipt and
  takes no position. Timeout recovery is also ineffective when activation
  happened but its reply was withheld; no source regains a right.
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
  destination right. Valid different genesis envelopes fail with
  `destination_mismatch`. The executable expectations distinguish those
  conditional outcomes. A generic catch, unexpected TypeError, storage error
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
