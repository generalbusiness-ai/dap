/** Exact cohort selection for private invitation handoff and public redemption. */
import { INVITATION_KEY_MEMBERSHIPS } from "@generalbusiness/dap-contract";
import type { FieldValue, KeyId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, isRecord, isSignature, keyIdOfSecret, signInvitationProof, textDigest, unb64url } from "@generalbusiness/dap-bytes";

export { INVITATION_KEY_MEMBERSHIP, INVITATION_KEY_MEMBERSHIPS } from "@generalbusiness/dap-contract";
const LEGACY = ["platform:membership@1", "platform:membership@2", "platform:membership@4", "platform:membership@5"] as const;
/** Exact person-invitation pins with an implemented redemption encoding.
 * Callers must also have the native definition's join path. */
export const INVITATION_MEMBERSHIPS = [...LEGACY, ...INVITATION_KEY_MEMBERSHIPS] as const;
export type InvitationMembership = (typeof INVITATION_MEMBERSHIPS)[number];
export const isInvitationMembership = (value: unknown): value is InvitationMembership =>
  (INVITATION_MEMBERSHIPS as readonly unknown[]).includes(value);
export const usesInvitationKey = (definition: unknown): boolean => (INVITATION_KEY_MEMBERSHIPS as readonly unknown[]).includes(definition);
function privateSeed(secret: string): Uint8Array {
  const seed = unb64url(secret);
  if (!seed || seed.length !== 32 || b64url(seed) !== secret) throw new Error("Invalid private invitation seed.");
  return seed;
}
function supported(definition: string): void {
  if (!isInvitationMembership(definition)) throw new Error("Unsupported invitation membership version.");
}
/** Only the new cohort's public key, or the exact legacy digest, enters an invitation act. */
export function invitationIssueFields(definition: string, secret: string): Record<string, FieldValue> {
  supported(definition);
  if (!usesInvitationKey(definition)) return { inviteHash: textDigest(secret) };
  const seed = privateSeed(secret);
  try { return { inviteKey: keyIdOfSecret(seed) }; }
  finally { seed.fill(0); }
}
export function invitationRedemptionFields(definition: string, scope: ScopeRef, invitation: number, joiningKey: KeyId, secret: string): Record<string, FieldValue> {
  supported(definition);
  if (!usesInvitationKey(definition)) return { invitation, secret };
  const seed = privateSeed(secret);
  try { return { invitation, proof: signInvitationProof(seed, scope, invitation, joiningKey) }; }
  finally { seed.fill(0); }
}
/** Custody shape only. Native membership still verifies the invitation signature and state. */
export function isInvitationRedemptionFields(definition: string, fields: unknown): boolean {
  if (!isRecord(fields) || !Number.isSafeInteger(fields["invitation"]) || Number(fields["invitation"]) < 1 || Number(fields["invitation"]) > 1_000_000_000) return false;
  const property = usesInvitationKey(definition) ? "proof" : "secret";
  if (!isInvitationMembership(definition)) return false;
  return Object.keys(fields).length === 2 && Object.hasOwn(fields, property)
    && (property === "proof" ? isSignature(fields[property]) : typeof fields[property] === "string");
}
