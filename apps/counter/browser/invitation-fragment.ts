/** Read a recognized invitation without changing the address before an attempt. */
export function invitationFragment(location: Pick<Location, "hash">): string | null {
  return location.hash.startsWith("#artroom-invite:") ? location.hash.slice(1) : null;
}

/** Remove only the invitation used by this attempt, preserving other URL state. */
export function clearInvitationFragment(location: Pick<Location, "hash" | "pathname" | "search">,
  history: Pick<History, "replaceState" | "state">, invitation: string): void {
  if (location.hash !== `#${invitation}` || !invitation.startsWith("artroom-invite:")) return;
  history.replaceState(history.state, "", location.pathname + location.search);
}

/** Keep the fragment during enrollment and clear it when that attempt fails. */
export async function attemptInvitation<T extends { device?: unknown }>(location: Pick<Location, "hash" | "pathname" | "search">,
  history: Pick<History, "replaceState" | "state">, invitation: string, attempt: () => Promise<T>): Promise<T> {
  try {
    const result = await attempt();
    if (!result.device) clearInvitationFragment(location, history, invitation);
    return result;
  } catch (error) {
    clearInvitationFragment(location, history, invitation);
    throw error;
  }
}
