/** Hosted retirement keeps a caller's revoke, never an agent's signing seed. */
import type { KeyId, ScopeRef, SignedIntent } from "@generalbusiness/dap-contract";
import { canonicalize, isRecord, isSignedIntentShape, parseStrict, same, verifySignedIntent } from "@generalbusiness/dap-bytes";
import { isAgentKeyMembership } from "@generalbusiness/dap-client";
import type { Identity, StoredCustodyRecord } from "@generalbusiness/dap-client";

export type RetirementBody = { valid: true; revoke: SignedIntent | null } | { valid: false };

/** The control signature binds these bytes. Native membership still judges the revoke. */
export function retirementBody(bytes: Uint8Array, membership: ScopeRef, actor: KeyId): RetirementBody {
  if (bytes.byteLength === 0) return { valid: true, revoke: null };
  try {
    const body: unknown = parseStrict(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes));
    if (isRecord(body) && Object.keys(body).length === 0) return { valid: true, revoke: null };
    if (!isRecord(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, "revoke")) return { valid: false };
    const revoke = body["revoke"];
    if (!isSignedIntentShape(revoke) || !verifySignedIntent(revoke)) return { valid: false };
    const intent = revoke.intent;
    if (intent.actor !== actor || !same(intent.to, membership) || intent.kind !== "revoke-key"
      || typeof intent.on !== "number" || !Number.isSafeInteger(intent.on) || intent.on < 1
      || Object.keys(intent.fields).length !== 1 || intent.fields["as"] !== "retired") return { valid: false };
    return { valid: true, revoke };
  } catch { return { valid: false }; }
}

/** In these pinned memberships, invite-key opens the key at its own sequence.
 * Only the endpoint's verified accepted enrolment identifies that invitation.
 * An absent or unresolved record supplies no substitute target. */
export function enrolledKeyItem(record: StoredCustodyRecord | null, identity: Identity): number | null {
  if (!record || record.phase !== "accepted" || canonicalize(record.identity) !== canonicalize(identity)
    || !isAgentKeyMembership(record.binding.pinned) || record.binding.kind !== "enrol") return null;
  const signed = record.envelope.signed, intent = signed.intent;
  if (!verifySignedIntent(signed) || intent.actor !== identity.signer || intent.kind !== "enrol"
    || !same(intent.to, identity.target)) return null;
  const invitation = intent.fields["invitation"];
  return typeof invitation === "number" && Number.isSafeInteger(invitation) && invitation >= 1 ? invitation : null;
}
