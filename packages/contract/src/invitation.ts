/** The first membership version whose invitation credential stays out of history. */
import type { PlatformDefinition } from "./scope.ts";
export const INVITATION_KEY_MEMBERSHIP = "platform:membership@6" satisfies PlatformDefinition;
export const INVITATION_PROOF_DOMAIN = "artroom-invitation-proof-1";

/** Exact native pins that redeem a private invitation seed by signature. */
export const INVITATION_KEY_MEMBERSHIPS = [INVITATION_KEY_MEMBERSHIP, "platform:membership@7"] as const satisfies readonly PlatformDefinition[];
