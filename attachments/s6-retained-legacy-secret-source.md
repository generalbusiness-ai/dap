# S6 retained legacy invitation secret

Planner ruling `ecc6a4c168ecd5ba28e389317588fd14108ea660` defers deletion. It requires a source-checked custody statement before the S6 head. The cleanup and durability designs remain future records. This note proposes no Store capability, cleanup patch, writer-hardening task or version change.

## Finding for the planner before a head

The exact invitation that a successful join or enrol consumed cannot admit another person or key. This conclusion follows from Native state, not the word “spent”. All legacy credential pins previously targeted here share these guards and effects:

- `membership.ts:229–235` defines invitationOpen. A known invitation must still be invited or lapsed, must be before inviteEnds, then must be invited. An active, removed or revoked item fails the first state guard with invitation-used. Lapsed fails expiry.
- `membership.ts:401–416` makes the successful person join's invited member active and opens the new active device key.
- `membership.ts:420–431` makes the successful enrol's invited key active. The member must already be active. This is the agent/device path and includes the legacy checker form if one exists, but the CLI has no fabricated legacy checker cohort.
- `membership.ts:659–684` checks the independently signing key and resolves the separately named invitation item by textDigest(secret). The secret is grant input, not the enrolled signing-key seed.
- `judge.ts:211–212` independently verifies the complete signed intent. `membership.ts:616–620` reads the signing identity from signed.intent.actor. The retained secret cannot sign as that independently generated enrolled key.

There is one important source-permitted qualification. Native does not globally consume a secret or forbid reuse of its hash. `invite-member` and `invite-key` accept an authorized issuer's supplied inviteHash (`membership.ts:357–395`). Their guards check handle/member eligibility, not inviteHash uniqueness. The invitation mark checks the separately supplied invitation ID and that item's hash (`membership.ts:677–684`). An authorized issuer can therefore put the same hash into a different still-invited item. Possession of the retained secret could redeem that item with a separate valid new joining-key signature and the other applicable conditions.

This is a conditional source argument, not an observed reuse, exploit run or evidence that any actual retained CLI secret matches another live invitation. Ordinary CLI issuance generates fresh random secret bytes. Still, “a spent secret admits nobody” without limiting the claim to its consumed invitation is too broad. Root has this finding and must notify the planner before a head as ecc6 requires. This note allocates no corrective task.

The source argument can be read without a body: a privileged issuer makes two different invited items with the same permitted inviteHash and suitable distinct handles or key slots. Redeeming the first activates only that first item. The second item can remain invited, unexpired and eligible. Its separately named invitation then matches the same secret. No state change, hash registry or effect consumes the value globally. The same argument applies in another Membership scope if its authorized issuer selected that hash.

## Exact legacy lineage

| Pin | Actual maintained Native data/rules |
| --- | --- |
|Membership1 and Membership2|native-catalog.ts:222–223 selects the same membership and membershipRules.|
|Membership4|application.ts:9–12 fixes APPLICATION_COHORT.membership to Membership4. native-catalog.ts:211 selects the same membership and membershipRules.|
|Membership5|counting-cohort.ts:5–8 fixes its Membership5 pin. native-catalog.ts:213–215 selects membership5 with membershipRules. membership.ts:569–576 changes only member/key capacity and inherits the same acts and guards.|

`invitation-fields.ts:8–18,25–39` selects those exact legacy pins and emits `{invitation,secret}`. Membership6 and later invitation-key cohorts instead emit a proof bound to the joining key and references. Preserve their retained originals and all current behavior byte-for-byte. This note makes no broad claim about the capability of a current invitation signing seed.

## What local file retains the value

`command-membership.ts:116–123` writes the person's exact signed JSON envelope before send under a randomly named `join-...` private record. Its successful tail saves the usable connection without that pending pointer and does not remove the private record (`:156–159`).

`invitations.ts:457–462,480–500` derives an agent/device request name `a-` plus the first30 hexadecimal characters of the existing complete-link digest and saves the canonical wrapper `{v:1,link,signed}`. Legacy fields.secret remains inside signed.intent.fields. The accepted device finalization removes its public pending pointer but not the private file (`:533–541`). Agent finalization retains its accepted join pointer for Check and does not remove the file (`:561–566`). A supported old bare envelope follows the same named custody path.

`files.ts:55–58,95–103` maps a validated private name to `<selected config directory>/private/<name>.data` and writes base64url-encoded original bytes plus a newline. The directory/file modes are0700/0600. It keeps signing-key seeds separately in `keys/<name>.key` (`:51–54,109–118`), and neither enrollment path replaces that signing identity with the invitation secret. This note reads no user's private directory or actual secret.

The original signed envelope can still confirm its original admitted result through the existing same-link settle/follow path. That retained signature is fixed evidence for the same request, not permission to sign another request or admit through the consumed invitation. Legacy accepted history also retains its protocol fields.secret, as docs/cli.md already says. Local deletion alone would not change Native hash-reuse behavior.

## Proposed custody-page text, pending the planner's qualification ruling

Place after the existing legacy-history paragraph in `docs/cli.md` under `dap join`, or in the custody page selected by root:

> After a successful legacy join, the CLI keeps the original request, including the invitation secret, in `private/join-<id>.data` for a person or `private/a-<link-digest-prefix>.data` for an agent or device, under the selected config directory. That secret cannot redeem the consumed invitation or sign as the enrolled key. It could redeem a different live invitation if an authorized issuer reused the same secret hash.

If the planner wants a shorter first sentence, keep the file patterns and the consumed-invitation qualifier. Do not replace them with an unqualified “admits nobody and signs nothing”. The full signing key remains separately kept in keys/<name>.key. The absence of a new signature or admission is a protocol-authority statement, not a claim that arbitrary bytes cannot be fed to a cryptographic key-derivation function.

## Evidence boundary

This is a source-only proposal under the existing S6 request `76997ff13bb432be5014a5898058dca434eb9704` and promise `d4ed5360b7ddae340dae4c3370e6042e8b4478f7`. No helper, parser, application import, compiler, test, signing, crypto operation, filesystem experiment, network operation, Native mutation, checkout edit, workroom publication or validation body ran. The two older design packets remain unchanged and are not authority to implement deletion or hardening.
