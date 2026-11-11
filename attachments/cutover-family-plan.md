# The cutover creation family

Read-only plan for request `9ecd3efa`, addition `710a5d76`, and builder
promise `5e42cce7`. The source checkpoint is main
`6bfb6e16fd537935ed6c116438228972d0c9794e`. The isolated branch is
`builder/cutover-family-plan-20261110`. No source edit, application import,
compiler, test, build, signing operation, network request, deployment, or
acceptance scene ran. This plan applies the technical-writing skill. The
installed skill roots contain no `unslop` skill, so the prose follows the
writing rules directly.

V2 corrects the last-admin analysis after the JP1 source peer review.
The source checkpoint and current pins above remain the basis of this
plan. Comparison main `36d300026b9e8721b4bbbb8b2a8427cd9852cd41`
changes only four of the original 80 pinned inputs, all reader docs.
Main `d7736fa3de1c75d588f003f3d7e467545cf8ed06` adds only the sprint
report after that comparison. `reader-doc-qualifications.json` records
the four updated doc pins and their limited effect. No pinned code,
configuration, or Native declaration changed. The seven planner choices
remain unresolved, and future version allocations and digests remain null.

The four decisions belong in one new creation family before the planner
recreates rooms. They do not upgrade an existing room. The recommendation
is a separate implementation head after identifiers **(c+d)** and before
its cutover deployment. The planner holds that deployment until this
family lands. This keeps the wire-format review separate from the rule
changes and still recreates each room once. It costs one additional
review and gate. Putting the rules inside (c+d) avoids that cost but adds
four policy changes to its already large atomic review. The planner must
choose the placement.

## Current pins and what forces their successors

The current default is `FAILED_CLAIM_COHORT`. The opt-in own-agent family
has a different ancestry. A larger version number does not combine their
features. These are current source facts, not new-family allocations.

| Scope | Current default | Own-agent family | Declaration digest of the own-agent pin |
|---|---|---|---|
| Register | `platform:register@26` | `platform:register@27` | `sha256:fbdc6072c321e201a966a2179a72db4519597dd262c81bd83f366b183e66125c` |
| Directory | `platform:directory@25` | `platform:directory@26` | `sha256:7e0a9d4cb8c2227c35878c0db62dd4bc09b969f2f338fcec16de653b5d443f63` |
| Membership | `platform:membership@12` | `platform:membership@13` | `sha256:ceb8aac80b7b45d007d8b1bf9b26fe7dc877bd281646f70c6ec92beaae9c3c3c` |
| Rules | `platform:rules@10` | `platform:rules@10` | `sha256:e10d8861dd5a80168437187a84d5bb3efe70d73825faa0c61ecc368da359a854` |
| Destination | `platform:destination@19` | `platform:destination@20` | `sha256:400ab350d2593ec2a8c6139810e1a0160fa2842833668ab4f9851043c057542a` |
| Inbox | `platform:inbox@1` | `platform:inbox@1` | `sha256:2d4fb56155ddc0cf02bfc75ac89a261c35aeb3069771e4a51429319ccd204748` |

`current-pins.json` also records every default declaration digest, the
Commons Rules 14 comparator, and the source table's exact rows. The table
comes from `native-declarations.generated.ts`, not a fresh producer run.

The approved identifiers plan changes references, genesis, routing,
archive/clone and fact text together. It turns canonical admission on in
that same head. It does **not** allocate new numbered Native versions.
It therefore establishes no blanket claim that all six scopes already
need a distinct numbered successor. Each uses reference-bearing values or
code, so each needs a cutover audit. A changed data declaration or native
rule needs a new version under `versions.ts:1–13`; a wire-reader change
alone is not evidence that the declaration bytes changed. Canonical
admission may force new declarations. Only the actual (c+d) source and
maintained producer can settle those bytes and digests.

| Scope | Family change independent of (c+d) | Allocation rule |
|---|---|---|
| Membership | Self-revoke and bounded multiple keys change authority. | New pin required. |
| Rules | Ordinary v2 proof and publication declaration change install judgment and retained data. | New pin required. `rules@15` is the next unused name at this checkpoint, **not an allocated pin**. |
| Destination | Publication prefixes change judged publication policy. | New pin required. |
| Directory | It selects the new Membership, Rules and Destination and relays both ordinary and device installs. | New pin required. |
| Register | It selects and proves that exact Directory; the family must retain failed-claim behavior. | New pin required. |
| Inbox | None of these four changes alters its data or rules. | Reuse the (c+d)-approved Inbox pin unless that head changes it. |

The next unused names at this checkpoint are Register 28, Directory 27,
Membership 14, Rules 15 and Destination 21. They are planning candidates
only. Do not reserve or publish them until the planner settles placement
and the actual (c+d) allocations. Future digests remain null.

The new family must compose current protections explicitly. R27 reuses
the repository-binding Register; its Membership derives from M7, and its
Destination derives from the unpublished/binding line. Selecting R27 as
the new default would not retain R26's failed-claim final state, its
founder/recovery separation, or Destination19's fixed one-hour token.
Keep those protections, eight controlled agents, archive binding, and
the required repository-binding behavior in the new family. Whether the
base also combines Commons Rules14's `reference` install opt-in is a
planner choice. The existing `reference-requires-rules14` gate does not
admit future pins by their version number.

## Self-revoke: settle the target before implementation

The request says a member retires their own **membership**. Deferred R15
describes retiring the agent's **key**. Those are different effects:
`remove-member` ends standing for all the member's keys, while
`revoke-key` changes one active key. This plan does not silently choose
between them.

The minimum rule that closes the deferred R15 key case is this proposed
authorization in the new Membership only:

> An active enrolled key may retire or mark compromised that same key.
> The target belongs to the signer's active member in this Membership.
> The existing administrator and recovery authorization also remains.
> A self-authorized act cannot remove the last active key of the last
> active administrator.

Reuse `revoke-key`, its `as` field, `revokedBy` fact and compromised notice.
Preserve its active-state requirement, expected revision, signature and
receipt checks. A new grant mark, proposed `self-key-or-recovery`, may
fall back to the current recovery route. Its self branch compares the
target's key ID to the actual signed actor and returns the exact member
reference for signer attribution. Returning that member does not preserve
the last-admin guard. Current `membership.ts:764` bypasses
`last-admin-kept` whenever `input.grant === null`. In
`derive/src/judge.ts:359,361,378`, every successful grant-mark fallback
retains a null grant, including an answer with a non-null member.
`derive/src/marks.ts:599–605` keeps member attribution separate from the
presented grant. The new Membership must explicitly check last-admin
before every self or controller branch returns pass, or reserve the
guard's bypass for proved recovery authorization. A member-wide leave
branch, if chosen, needs the same enforcement. Preserve the existing
administrator-grant and actual recovery behavior. Another key of the
same member does not qualify as the target key by coincidence. Proposed refusal
`not-own-key` identifies that narrow self branch; existing
`unauthorized`, `last-admin` and inactive/final-state refusals keep their
meaning. Exact fallback/refusal ordering belongs in the reviewed rule.

If Hugh's decision means member-wide withdrawal, add a separate proposed
`leave` act on the active member, not a broader exception in
`remove-member`. Its signer must be that exact member of this Membership,
and it retains `last-admin`. Its sole state effect is `removed`;
existing standing observations then refuse every key of that member.
Proposed refusal `not-own-member` distinguishes another target. The
planner must decide whether this replaces or accompanies self-key
revocation, and whether agents and checkers may use it. No client UI or
new ordinary controller authority follows from this proposal alone.

R15's hosted rule remains: retirement disables the endpoint and erases
the seed first. The endpoint never signs a revoke after retirement.
It keeps only the caller's first supplied envelope. A changed Membership
can admit that envelope; an empty retirement still cannot manufacture
one. Other scopes retain their existing bounded grant lifetime, so a
witness needs a fresh authority read before claiming direct-key refusal.

## Several keys for one own agent

Current `own-agent-key-capacity` refuses as soon as it finds one invited
or active key for the target member. Replace that predicate only in the
new Membership with a count below an explicit bound **B**. Suggested
starting choice: **B = 4**, counting invited and active keys together.
The number is a proposal for the planner, not a measured capacity result.
Keep the global key-item bound of 10,000 unless another reviewed change
needs it. Keep the eight-active-controlled-agent bound separately.

> An active person may invite another key for an active agent they
> control, while the agent has fewer than B invited-or-active keys.
> The agent's current action set must remain a subset of that person's
> current role, except for the existing administrator case. The
> invitation ends after the act time and within 24 hours.

Keep `not-controller`, `not-agent`, `not-active-person`,
`agent-role-wider`, `own-agent-invitation-window`, `member-removed`,
`own-agent-limit` and `own-agent-key-limit`. Keep the declaration's
invitation proof and the client's exact retained opening/invitation
verification. A key remains counted until its final lapse/revoke is
recorded. Do not infer expiry from the wall clock without its Native
transition.

The planner must choose who can release an active key slot. Recommended:
an active person can revoke a key of their own controlled agent, under
a separate narrow grant, while admins and recovery retain their current
route. Do not require the current role-subset check to disable a key:
that would prevent a controller from retiring an agent after the agent's
role grew. Require active-person identity, exact controller and target
agent instead. This branch must enforce last-admin explicitly or use the
new recovery-specific bypass described above. An exact member result
alone cannot stop the current null-grant bypass. The agent's self branch
covers its own signing key only.
An invited key can still lapse within 24 hours. Early cancellation of an
unredeemed invitation is an additional choice, not an implicit extension
of the active-only `revoke-key` act. No team, runner or model object enters
this change.

## Declared publication prefixes

R16's host reservation of control paths remains mandatory in every room.
The new family adds the deferred per-application policy; it does not
replace that reservation or modify old outcomes. There is no legacy
prefix map in this plan. Old-format rooms retire at the cutover, and old
signed packages keep their original bytes at the retained reader commit.

Starting encoding, for planner approval:

```json
{"name":"publication-paths@1","bounds":{"prefixes":["shelf/"]}}
```

This is signed semantic metadata, not an ambient member grant. Suggested
bounds are one to eight distinct literal directory prefixes, at most 256
UTF-8 bytes each, with one trailing slash. No glob, empty/root prefix,
absolute path, dot segment, `.git` path, or reserved control prefix is
admitted. Prefixes compare as canonical path segments, so `shelf/` does
not authorize `shelf-other/`. These limits and the exact encoding are
proposals. The current package codecs have no publication reader.

Admitting two applications that both declare `shelf/` would still permit
one to overwrite the other. To deliver the stated protection, recommended
installation policy reserves non-overlapping prefixes per created
application within its Directory. Count pending creations as well as
created applications, so concurrent installs cannot claim one prefix.
Release a pending claim only through a recorded failed creation. A
created application's claim stays held even if its current client stops.
The planner must decide whether exact sharing or later reassignment is
ever allowed. Neither follows from a signed prefix alone.

Proposed rule flow:

1. The new Rules proof accepts and retains only the bounded canonical
   signed declaration, bound to semantic/release/definition IDs. A new
   guard `application-publication-paths` refuses
   `invalid-publication-paths`; no declaration means no file-publication
   authority. A pure Counter package still installs.
2. Authenticated Rules-to-Directory staging/creation carries those exact
   retained prefixes. Directory reserves them against other pending or
   created applications. Proposed refusal `publication-prefix-in-use`
   covers overlap; malformed or mismatched provenance refuses
   `invalid-application-creation`.
3. Directory retains the reservation and places its exact approved
   publication metadata in the authenticated application creation proof.
   The existing closed `creationContextOf` reader accepts only ordinary
   v1 and device v2 markers. A new closed marker or equivalent reviewed
   retained-proof carrier is required. Do not add unrecognized domain
   fields to the application's declared genesis. The final marker shape
   needs the same source/seed/Directory proof as the current device grant.
4. Destination proves this exact room, new family, source sequence,
   installation, and prefixes. Extend the current exact-tuple
   `installedApplicationOrigin` path, rather than trusting a declared
   name or a bare scope address. Missing proof holds as
   `dependency-unavailable`; a contradictory proof refuses
   `invalid-publication-policy`.
5. Before opening a provider push, the new Destination judges the
   requested path and bounded inspection of aliases in both trees.
   Its new file-judge evidence must carry the required bounded
   `JudgeChanges` facts; today's `{head,present,tree}` evidence alone
   cannot prove an alias stays inside a prefix. Record specific
   `publication-path-not-declared` or `reserved-publication-path`
   decisions in the new pin. Preserve the actual observed head and
   truthful not-sent evidence. Replay must derive the same refusal.

The exact recorded refusal placement, prefix bounds, exclusive claim
rule, and reserved-proof carrier need planner decisions before source
work. Raw `activate` plus `establish-application` has no signed package
declaration. Recommended minimum: it gains no `publish-file` authority
under the new family without an equally authenticated declaration. Do
not retain a hidden unrestricted route. Any new declaration route for
raw activation is a separate choice.

## Ordinary version 2 packages beside device commands

The new Rules successor, provisionally the next unused Rules 15 name,
accepts a v2 ordinary proof with zero native capabilities. It also
accepts the existing finite `device-command@1` proof. If the publication
encoding above is adopted, the admitted capability sets are exactly:
empty, publication-only, device-only, or device plus publication. Reject
duplicates, unknown capabilities and malformed bounds. The publication
metadata creates no device grant. Keep the signed release/semantic IDs,
exact definition text values, whole canonical Native validation,
projection checks, selected role additions, and archive requirements.
The new pin explicitly chooses whether it admits reference fields; do
not let its higher number bypass `requireReferenceInstall`.

This requires a complete branch through these existing boundaries:

- `device-application-rules.ts:38,58,67,75,85,98,114` currently
  requires a device capability, a device owner, a grant and a wrapped
  genesis. New ordinary proofs require no owner or device grant.
  Device proofs still require the exact active observed owner and the
  finite grant. A claimed grant on the ordinary branch refuses.
- `device-application-directory.ts:10,18,33,35` currently requires the
  `deviceGrant` field, validates it and always emits device context.
  The new receive uses a closed ordinary-or-device branch: ordinary
  creates the ordinary Native context, while device retains its exact
  grant/delegation proof. Invalid or cross-branch data refuses
  `invalid-device-command-grant` or `invalid-application-creation`.
- `publishing-provenance.ts:175–202` currently checks exact family pins
  and requires device context for the modern family. Its new tuple
  must prove the appropriate ordinary/device branch and any publication
  declaration. Do not simply set `deviceCommand:false` for both.
- `application-install.ts:221–251`, `archive-binding.ts:81–94`, and
  the new Directory preserve the exact grant/context/result exchange
  and typed destination/archive requirements.
- `scope/src/applications/admission.ts:19–47` already admits an ordinary
  zero-capability package, but its nonempty-capability branch and
  `deviceApplicationRequirement` need the exact finite publication
  combinations if that declaration is adopted. Codec, CLI and client
  selectors need the corresponding explicit new pin.

Register and Directory pin the final new Membership/Rules/Destination
tuple. `native-catalog.ts`, `DIRECTORY_OF`, `SIBLINGS_OF`, the BR13
question/relationship tables, catalog vocabulary, current declarations,
creation admission and CLI/Page/MCP selectors must all select that exact
family. No numeric `>=` admission or register13 reopening is allowed.
Keep the old R13 ordinary install proof as a source reference, not as a
second deployable code line.

The first required witness packs `apps/counter` through the maintained
`dap pack` command with public TEST publisher custody, installs that
exact signed v2 package into a room of the new family, performs one
native act, and replays its whole journey. It must prove no device grant
was supplied or created. A device package must still install and execute
its existing bounded command through its exact observed owner. These are
future witnesses. None ran for this plan.

The host needs an `APPLICATION_CONTENT` R2 bucket and exact
`APPLICATION_TRUST` rows for release, publisher and immutable URI host.
The current dap-demo config has one trust row and no content bucket.
`worker.ts:605` closes the application outside adapter without those
bindings; `applications/wiring.ts:19–21` refuses without a bucket.
The planner owns the cutover config change, release signing, trust rows
and first real installation. This plan reads no private host setting or
publisher key and changes no Worker config.

**Separate option cost, not part of this plan:** a publisher-key trust
row would replace exact-release approval with authority for every valid
release that key signs on the allowed immutable host. It needs a closed
new trust-row variant, explicit ambiguity rules, and changes to
`client/application-trust.ts`, pre-fetch checks in `applications/resolve.ts`,
both checks in `applications/content.ts`, and `readTrustedApplication`'s
release lookup. Checking only `admission.ts` is insufficient because the
current resolver and cache reject an unlisted release first. The host
would still verify signatures, canonical bytes, host support and Native
bounds. The operator would trust the publisher's future releases until
the row is removed; removing it would not erase recorded installations
or cached bytes. A compromised publisher key could supply another
release without a new Worker version. The owner must choose this option.

## Candidate witnesses and source scope

These are properties and likely whole-owner homes, not a frozen selector
or a case count. The implementation must derive the actual import and
read-input closure after (c+d), preserve old cases, and strengthen existing
witnesses where possible.

| Change | Required meaningful witness | Existing owner or boundary |
|---|---|---|
| Self-key revoke | Own active key retires; another key/member cannot use the narrow branch; last-admin self authorization refuses even when a successful grant mark returns a non-null member and retains a null grant; existing administrator and actual recovery routes keep their behavior; fresh-read direct act refuses; replay shows the exact revoke. | `packages/scope/test/membership.test.ts`; new-family Membership data/rules; hosted retirement owner only if its behavior changes. |
| Member-wide leave, if chosen | Exact member removes itself; all its keys lose standing; another member and the last admin remain protected; replay derives removal. | Membership Native owner, with existing authority observation fixtures. |
| Several keys | One controlled agent enrolls two distinct keys with equal bounded role; both act; B+1 counts pending and active; another controller and wider role refuse; a controller grant-mark route cannot bypass last-admin through a null grant; lapse/revoke frees one slot; replay derives all entries. | `packages/scope/test/own-agent-membership.test.ts`, retained issuer and enrollment paths. |
| Prefix declaration | Malformed, excessive and unknown declarations refuse; two applications cannot overlap; ordinary package with no publication still installs. | Native install owners and package codec owner. |
| Prefix publication | Own prefix publishes; another prefix, boundary lookalike and alias escape refuse before push; reserved control path remains refused; restart and replay preserve the new specific decision. | `packages/scope/test/application-publication.test.ts`, `publication-policy.test.ts`, maintained Git/provider boundary. |
| Ordinary v2 | Actual Counter pack bytes install, one act is accepted, Native replay is consistent, and no device grant appears. | `packages/cli/test/application-pack.test.ts`; real Native install journey. |
| Device preservation | Existing finite device package installs, resolves its observed owner and runs its command; forged/ordinary grant mixing refuses. | `packages/scope/test/archive-device-install.test.ts`. |
| Whole family | Exact Register→Directory→siblings; failed claims free capacity; founder and recovery differ; one-hour token remains fixed; archive and repository binding work; all new declarations admit canonically. | `failed-claim-cohort.test.ts`, `own-agent-membership.test.ts`, archive owners, platform whole-definition owner. |

Likely source areas are the new cohort/data modules; the existing
Membership, install, Directory, Destination and publication provenance
owners listed above; package/creation-context codecs; BR13 exact-pin
tables; CLI, Page and MCP selection; and reader docs. The implementation
must report shared paths before edits. The family is likely to overlap
G/H's authoring/packaging work, identifiers (c+d)'s references and archive
admission, JP1's membership pin readers, and OPS2's bundled CLI closure.
No OPS1 deployment source change belongs here. All input files actually
read for this plan are hashed in `source-pins.json`.

Each eventual implementation head needs its affected compilers, complete
whole-owner tests and meaningful controls, the required static checks,
one gate and exact-head review. The F/G/H/(b)/JP1/OPS gate order still
applies. This read-only plan claims no passing check. It does not book a
gate, sign a release or close J5 acceptance.

## Planner decisions before source work

1. Separate head after (c+d), or reviewed commits inside that head.
2. Self-revoke means one own key, member-wide leave, or both; which
   non-person members may leave; keep the last-admin rule.
3. Key bound B; controller authority to revoke an own agent's active
   key; whether an invited key has an early cancellation path.
4. Publication declaration encoding and bounds; no-declaration behavior;
   exclusive prefix claims, failed-creation release and any future
   reassignment; raw-activation publication policy.
5. The closed retained-proof carrier and new Destination evidence/refusal
   placement needed for judged prefix and alias checks.
6. Which current protections form the stable default, including Commons
   reference support and repository binding, with no regression of
   failed claims, recovery separation or fixed token lifetime.
7. Actual new names/digests after (c+d); Inbox reuse depends on that
   head's audited declaration/rules, not this planning candidate list.

The publisher-key trust option remains a separate owner decision. The
archive driver/drill also remains separate and starts after (c+d)'s new
archive key. All four Workers will share one driver; the drill is
`dap clone --archive`, then `artroom-replay --git --all`. Host `none` has
no outside copy and stays outside the drill. No restore command exists.
The planner still inventories retired rooms, names the last old reader,
signs canonical releases, deploys, recreates Grow/Lending/J5 Site and
records fresh J5 acceptance. This plan performs none of those acts.

Builder identity only. Never as_planner. Never run `rm -rf` or `rm -f`.

## S8: Rules, Register and Destination forms

This section adds to the plan filed in `69fed843`. Scope ruling `68356c6c`
still governs the family. Request `93adab52` adds the decisions below.
The planner rules on zero approvals, open founding, and the default certified
policy before family source opens. The separate head remains after
identifiers (c+d) and before the held cutover deployment. Names and digests
come from that actual source. This amendment allocates none.

### Require global checks even when extents exist

The new Destination must judge the union of every globally required check
and every check named by a touched extent. A successful touched extent
cannot hide a missing global check. A single-controller exception cannot
waive a check. This closes November 2.4 and October 3.4 for the new family.

The judgment must preserve full job, deciding-result, checker membership,
key, configuration, and captured-policy provenance. Missing or failed required
jobs refuse `rules-not-met`. Malformed or contradictory evidence refuses
`evidence-invalid`. Successful reservation standing retains the entire union,
not only the names that extents mention. List eligibility retains the same
obligations for the final gate. It does not claim that jobs passed earlier.

`requiredChecksV14` and its mandatory standing judgment already show this
contract. Reuse that decision boundary in the family's Destination without
losing Destination19's fixed one-hour token or the other stable-family
protections. Merely adding global names to an extent's lookup list would
not suffice: the final judgment must require every selected descriptor.

The witness uses the real new-family Native path. It supplies a global
required check that no touched extent names. Missing, failed, forged, or
wrong-configuration evidence must prevent the final reservation. A sound
result must permit it and retain the checker provenance. A duplicate name
must not create two obligations. An optional check on an untouched extent
must not become mandatory. Replay must reproduce the judgment.

### Choose explicit solo-room policy or keep the permissive form

**Recommendation: close the silent forms through the existing certified
policy contract.** The default starts with a positive approval count and
explicit `ownerMayReview`. A zero global count needs `allowZeroApprovals:
true`; each zero-approval extent also needs its own explicit opt-in. Every
extent's approver must be `change.review`. The protected `rules` extent keeps
its positive declared minimum, authority class, and mandatory patterns.
Direct authors never count as their own reviewers. An authoring agent's
controller may review an ordinary extent only when `ownerMayReview` is true.
Protected rules retain controller independence, except for the existing
declared single-controller exception. That exception waives no required
check.

This recommendation preserves an intentional one-person room. Its owner
can explicitly opt ordinary extents into zero approvals. The proposal does
not call that choice independent review or claim that it resists that owner's
key. Nor does it add a rule that counts administrators.

The planner can choose among these costs:

| Choice | Effect and cost |
|---|---|
| Certified explicit zero opt-in, recommended | Refuse implicit zero approvals and arbitrary-action approvers. Solo owners retain an explicit zero-review path. The family must compose the existing policy, certificate, and Destination consumers, and callers must state the choices. |
| Refuse all zero approvals | Ordinary changes need a counted reviewer other than the direct author. A lone human author cannot self-review. A one-person room with an authoring agent can meet positive ordinary approvals when `ownerMayReview: true` permits its controller to review. Otherwise another eligible reviewer is needed. The protected-rules exception does not waive ordinary approvals. |
| Keep the historical permissive form and state it | Preserve current inputs and solo use with no certified-policy integration cost. Any action name can still stand as an approver, and a zero count needs no explicit opt-in. October 3.2 stays open. |

The first choice closes the implicit and arbitrary-approver findings, not
intentional zero review. A witness must demonstrate both sides: unopted zero
and an approver other than `change.review` refuse; the explicit solo policy
admits. It must also show that zero cannot remove the protected rules minimum
and that the existing single-controller exception never waives checks.
A pure decoder test alone does not prove Native publish or reservation.

### Rule whether open founding remains intentional

**Recommendation: state and retain intentional open founding.** Under
`policy: "open"`, any signer may found. A `founders` list does not restrict
that branch. A deployment that requires an allowlist must use `policy:
"keys"`. The family description and the register installation form must say
this directly. October 3.12 stays open by choice. Public founding still needs
its separate serving-limit work; this amendment supplies no rate limit.

To close the bypass instead, the new Register can admit only `policy:
"keys"`, require a nonempty bounded founders list, and refuse an unlisted
signer before any claim or repository operation. This costs the public Start
register's self-service founding flow. The founders value is fixed and has no
update act today. New founders would need another ruled enrollment mechanism
or another register installation. This section proposes no such mechanism.

A narrower guard that rejects `open` with a nonempty `founders` list can
remove a misleading input combination. It does not close the open-signature
bypass, so it must not be reported as closing 3.12. The planner must identify
which behavior the new family promises. If it chooses the closed form, a
Native witness must refuse an unlisted signer and admit a listed one before
outside work. If it retains open, the witness must show that another signer
still admits under open and refuses under keys. Preserve historical rooms'
recorded behavior in either case.

### Keep the ruled administrator authority

November 2.2 is a governance fact, not a new mechanism in this head. Any one
admin holds `rules.publish` and may publish a room's Rules alone. That publish
can lower thresholds outside the fixed minimum of the `rules` extent. The
minimum governs file landings, not the Rules publish act itself.

The threat model must state this authority and its key-compromise consequence.
A certificate proves the accepted policy and its repository binding. It does
not supply approval from another admin. A second key on publish needs a
counting and recovery design for one-admin rooms. Order `fc7576f8` parks that
mechanism. This family adds no such count, quorum, or recovery bypass.

### Put the certified policy in the new default, if the planner agrees

**Recommendation: yes.** Today's default is the failed-claim cohort with
Rules10. Exporting `rules-policy-v11.ts` does not put its policy in that
cohort. The new default should compose that strict policy contract with the
family's required-check Destination fix and the protections in `68356c6c`.
Do not select a higher numbered cohort and assume it carries those features.
Commons keeps its separate Rules line. The new default still refuses
reference fields as already ruled.

The policy contract requires explicit owner-review and zero-review choices,
review-action approvers, the protected rules extent, one catch-all, known
check names, and bounded exact fields. Tree verification rejects an unmatched
pattern unless that exact occurrence carries the existing explicit future
permission. Do not invent that permission during installation.

Include the actual Native certificate and tree-verification consumers and
their full policy observation binding. Importing the pure decoder alone is
not certification. Reuse the existing mechanism rather than inventing a new
admin approval counter. Preserve safe initial values and the certified
Destination's `rules-not-configured` refusal before first certified publish.
Defaults are neither a configured policy nor a certificate. Apply the contract
to every later publish. The cost is coordinated Rules,
Destination, Directory, and Register wiring, retained certificate evidence,
caller compatibility, and meaningful whole-family witnesses. Excluding it is
cheaper to implement but leaves the permissive default forms open unless the
family independently reimplements and proves the same restrictions.

Each finding that this family closes needs its witness in the family's exact
head and checker review. Extend the whole-family witness to prove the actual
default cohort reaches the strict policy and the required-check union, while
failed-claim cleanup, founder and recovery separation, eight controlled
agents, archive and repository binding, and fixed token lifetime still hold.
Existing pure policy witnesses and labelled stand-ins remain useful. They do
not replace a real Native whole-family witness. No source, implementation,
check, new pin, room recreation, deployment, or acceptance claim follows from
this plan amendment alone.
