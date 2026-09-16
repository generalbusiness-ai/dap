# Club admission: retain the negative result

**Decision: retain the original privacy promise and report the failed
admission acceptance in V6. No revised Club experiment is commissioned.**

Hugh selected this outcome on 2026-09-16: “Keep the negative result and
report it in V6 (Recommended)”. Builder recorded the direct instruction at
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:bdcfbdc00e9861fb9f8e9b3d21f3104796d8be93`.
The alternative designs below explain the tradeoff; they are not adopted.

Request: `git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:659bc09467d9f31adc5cc6afd797877a6082c79f`.
Basis: checker report #512,
`git:sha1:e15db5d98cd3510f3f20f06b3d0e1ec58379d2b1#git:sha1:636030cb538a2fd495a6abe9eed18c7e59f5306e`.

## Decision

**Retain V5's negative result against the original acceptance condition
and carry it into V6.** The narrower
frozen manifest passed its campaign but omitted the applicant's existing
Member status. A research spike need not add mechanisms to erase that
negative result. Keep the current privacy promise and evidence; do not
claim completed-V5 acceptance.

If another experiment is wanted, the simplest coherent route without a
new eligibility authority is a **public application record signed by its
applicant, with private supporting material**. This reveals applicant
identity **before voting**, including applications that never succeed.
That privacy change requires an explicit decision.

| Choice | Ordinary members verify | Consequence |
|---|---|---|
| Retain the negative result | Existing outcomes and the documented counterexamples | No new experiment or revised acceptance claim |
| Public application record | Application existence, applicant, Member holdings, votes and correct grant recipient | Identity public before the first vote; application validity moves to the public record |
| Private application with trusted evidence | Issuer authority, certificate linkage/freshness and shared outcomes | Truth of private application validity, eligibility and grant linkage is trusted |

## Why the present schema fails

**A1:** two Dana applications are admitted at 14 and 18, although the first
grants Member at 15. Every view agrees. The model checks duplicate
*application ids*, not Member holdings [S1–S3].

**A5:** votes and admits can name an invitation acceptance, an ineffective
apply or a standing reason. The fold recognizes any header commitment;
the effect executor grants Member to that entry's actor. The invariant
finds this, but the generator omits these targets [S2, S4, S5; #512].

Adding `applicant` only to `admit` is insufficient: it neither proves the
link to an effective private apply nor validates earlier votes. It also
reveals the supplied name on failed attempts. Headers reveal no actor or
kind, and the later grant cannot validate an earlier admission [S6].
These are failures of this schema and information boundary, not proof
that every privacy-preserving protocol is impossible.

## Two concrete revised routes, if commissioned

**Public record.** Add members-visible
`club.application {attachment_id}`, signed by the applicant; its own
content id becomes `application_id`. Retain private `club.apply {statement}`
as supporting material. The new record has a closed schema and names an
earlier committed attachment. Its validity does **not** depend on the
private attachment's kind, author or effectiveness: the committee judges
its contents through votes. This changes the definition of application.
A valid public record with poor supporting material is distinct from a
vote naming a bare non-application id.

Only an effective public application qualifies for votes or admission.
To retain the private-disclosure exercise without inferring a hidden
event's audience, require an effective public `dap.disclose` receipt for
the referenced attachment and voter before each vote, including original
committee members. The reference itself grants no reading rights.

At approval position `n`, after schema, binding and authority checks, use
only the prefix through `n-1`: require an effective application, no earlier
approval of it, no pending admission, applicant not currently Member,
at least two distinct effective votes, and more yes than no. Fix refusal
precedence in that order: `unknown_application`, `already_admitted`,
`admission_pending`, `already_member`, `no_quorum`, `no_majority`.
Statements and standing reasons stay private; applicant visibility and
application identity explicitly change in both privacy budgets [S8].

**Trusted evidence.** Keep private apply identity. Pin a registrar and its
spine authority. Two members-visible `dap.observe` fact shapes suffice
as a proposal:

```text
{type:"club.application_valid", application_id, application_position,
 basis:{genesis, position, header_hash}, valid:true}
{type:"club.admission_eligible", application_id, registration_id,
 basis:{genesis, position, header_hash},
 admit_action_id, admit_binding, eligible:true}
```

Require registration before votes. Check issuer authority at issuance,
closed schemas, commitment/position linkage and exact context. Eligibility
issued at `c` describes prefix `c-1`; approval must be at `c+1` and match
its action id and binding. The admit carries
`{application_id, eligibility_id}`. Any intervening event requires fresh
evidence.
Use the preceding predicate, with application validity and non-membership
established by certificates; retain the existing late-committee disclosure
rule. Every fold, including the oracle, consumes the same assertions.

An authorized **false certificate can satisfy this predicate**. It must
fail an independent truthfulness invariant over actual recorded
applications and Member holdings. It cannot be represented as something
ordinary members independently disprove. The registrar also attests the
correct grant recipient; require its completion grant under its grant
authority. This is a changed trust contract, not an unconditional
implementation of the original rule [S7]. Private payloads
and `applicant:null` can remain, but the public Member grant and its timing
still reveal or correlate the successful applicant. No anonymity after
completion is promised.

## Acceptance boundaries for either new experiment

- **Grant completion:** retain ordinary `dap.grant`, with explicit
  `pending_grant` status at effective approval `n`. A required authorized
  grant at `n+1` completes membership; missing or refused grants do not.
  The public route rejects a wrong recipient. In the private route, a
  wrong recipient is a false registrar attestation caught by the independent
  truthfulness check, not by an ordinary reader. Block another approval
  while pending. Use an approval-bound grant action id for exact retries,
  with no interleaved continuation.
  These are two observable prefix states, not an atomic two-position
  transition. Write this timing into the revised promise explicitly.
  Single-position atomic membership would need a separate runtime decision.
- **A1/A5 cases:** predeclare two applications by one person, an already
  Member applicant, a second approval before the grant, all three wrong-id
  examples, unknown/future ids, invalid registrations, and false certificates.
  Assert the business predicate independently of agreement and test that
  invalid raw targets never trigger admission grants.
- **A2 cases:** Frank is an ordinary Member, never committee or applicant,
  holding only the private apply's header. He judges a late committee vote
  `unknown_application` before disclosure and effective afterward, and
  judges approval plus the actual Member grant. Assert private statement
  secrecy and the chosen applicant-visibility rule explicitly.
- **Frontiers:** test exact retries, grant interruption, certificate replay,
  stale basis/binding, late join/disclosure and dependency pause/resume.
  Check current Member and issuer authority after revocation. Prior votes
  and approvals remain historical; after completed membership is revoked,
  a different application may qualify, but the same application cannot
  be approved twice. Revocation cannot erase an earlier reader's knowledge.
- **Research record:** §4.7 makes any revised manifest a new experiment.
  Freeze its policy, privacy/trust budget, projection, independent invariants,
  adversarial generator and constraint inventory before its baseline.
  Count the new obligations; do not presume the old fix budget covers them.
  Preserve the original runs. A3's passing-policy-failure test and A4's
  historical wording/provenance corrections were completed in the V5
  evidence at `772a514a08c2fac72fe534c8490c8d33a3e1c2d1`: A3 now executes
  the correct acceptance assertion as a failing TODO, and A4 corrects the
  reader and provenance descriptions. Those corrections do not resolve
  the retained A1/A5 policy failures or commission a revised experiment.

The chosen outcome adds no protocol machinery. This decision makes no
model change, revised manifest or new checker claim.

## Examined evidence

References S1–S8 are to exact commit
`70bd4064a7d41ba592ccceb54b95d0e895a02d57`; line numbers refer to that tree.
The exact report #512 above was inspected; its reproductions were not rerun.
The later [V5 correction record](https://github.com/generalbusiness-ai/dap/blob/772a514a08c2fac72fe534c8490c8d33a3e1c2d1/spike/manifests/club.ledger.md#L314-L361)
records completion of A3/A4 and the still-failing original acceptance.

| Ref | File and lines |
|---|---|
| S1 | [notes/2026-09-15-spike-plan.md:240–276,278–300,365–374](notes/2026-09-15-spike-plan.md@70bd4064a7d41ba592ccceb54b95d0e895a02d57:240) |
| S2 | [spike/fixtures/club.ts:177–194,215–266](spike/fixtures/club.ts@70bd4064a7d41ba592ccceb54b95d0e895a02d57:177) |
| S3 | [spike/test/club.test.ts:199–217](spike/test/club.test.ts@70bd4064a7d41ba592ccceb54b95d0e895a02d57:199); [spike/manifests/club.ledger.md:202–206,229–246](spike/manifests/club.ledger.md@70bd4064a7d41ba592ccceb54b95d0e895a02d57:202) |
| S4 | [spike/src/script.ts:81–121](spike/src/script.ts@70bd4064a7d41ba592ccceb54b95d0e895a02d57:81); [spike/src/foundation.ts:258–276,476–494](spike/src/foundation.ts@70bd4064a7d41ba592ccceb54b95d0e895a02d57:258) |
| S5 | [spike/manifests/club.ts:107–159,225–250](spike/manifests/club.ts@70bd4064a7d41ba592ccceb54b95d0e895a02d57:107) |
| S6 | [spike/src/types.ts:12–44](spike/src/types.ts@70bd4064a7d41ba592ccceb54b95d0e895a02d57:12) |
| S7 | [notes/2026-09-14-evolving-spaces-design.md:208–224,711–717](notes/2026-09-14-evolving-spaces-design.md@70bd4064a7d41ba592ccceb54b95d0e895a02d57:208); [notes/2026-09-14-one-series-many-views.md:186–205](notes/2026-09-14-one-series-many-views.md@70bd4064a7d41ba592ccceb54b95d0e895a02d57:186) |
| S8 | [spike/manifests/club.md:17–88](spike/manifests/club.md@70bd4064a7d41ba592ccceb54b95d0e895a02d57:17); [spike/manifests/club.ts:170–197](spike/manifests/club.ts@70bd4064a7d41ba592ccceb54b95d0e895a02d57:170) |

The retained manifest is
`sha256:806ae62febaa0b28f35fcc7099bcb00db73a61d0921806c911e993b6db808fde`;
its repaired package is
`sha256:ef19bdaf2a70813266ab7e490ac3759580df0613efc382bef8bf5b4a96523f4e`.
