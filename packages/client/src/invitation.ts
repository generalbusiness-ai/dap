/**
 * The invitation link that `artroom invite` prints and `artroom join`, the page and the MCP server's `join` read: the
 * service, the repository's scopes, the invitation's number and secret, the handle, and the membership version the
 * invitation is in. Legacy cohorts present the invitation secret. Membership@6 and @7 treat it as an
 * invitation signing seed that stays private and creates a key-bound proof.
 */
import { invitationServiceUrl } from "./invitation-service.ts";
import { isInvitationMembership, usesInvitationKey } from "./invitation-fields.ts";
import type { ScopeId, ScopeRef } from "@generalbusiness/dap-contract";
import { b64url, isScopeId, isScopeRef, unb64url } from "@generalbusiness/dap-bytes";

/** The repository's scopes as a link names them: no inbox, which `join` creates. */
export interface InvitedRepository { directory: ScopeRef; membership: ScopeRef; rules: ScopeId; destination: ScopeId }

/** `definition`: the explicit supported Membership pin of this invitation. */
export interface InvitationLink { v: 1; service: string; repository: InvitedRepository; invitation: number; secret: string; handle: string; definition: string }

export const INVITATION_LINK = "artroom-invite:";

/** Read one person link, normalize terminal service slashes, and check an expected service when present. */
export function invitationOf(text: string, expectedService?: string): InvitationLink | null {
  if (!text.startsWith(INVITATION_LINK)) return null;
  try {
    const bytes = unb64url(text.slice(INVITATION_LINK.length));
    const link = bytes && (JSON.parse(new TextDecoder().decode(bytes)) as InvitationLink);
    if (!link || link.v !== 1 || typeof link.secret !== "string" || !Number.isSafeInteger(link.invitation)
      || typeof link.definition !== "string" || typeof link.service !== "string") return null;
    const service = link.service.replace(/\/+$/, "");
    if (service.length === 0 || (expectedService !== undefined && service !== expectedService.replace(/\/+$/, ""))) return null;
    return { ...link, service };
  } catch {
    return null;
  }
}

/** Validate the public context and, for invitation-key memberships, the private seed before retaining custody or signing. */
export function wellFormedInvitation(link: InvitationLink): boolean {
  if (!isInvitationMembership(link.definition)) return false;
  if (usesInvitationKey(link.definition)) {
    if (typeof link.secret !== "string" || link.secret.length !== 43 || link.invitation > 1_000_000_000) return false;
    const seed = unb64url(link.secret);
    if (!seed) return false;
    try { if (seed.length !== 32 || b64url(seed) !== link.secret) return false; }
    finally { seed.fill(0); }
  }
  return invitationServiceUrl(link.service) !== null && typeof link.handle === "string" && link.invitation >= 1
    && isScopeRef(link.repository?.directory) && link.repository.directory.kind === "directory"
    && isScopeRef(link.repository?.membership) && link.repository.membership.kind === "membership"
    && isScopeId(link.repository?.rules) && isScopeId(link.repository?.destination);
}
