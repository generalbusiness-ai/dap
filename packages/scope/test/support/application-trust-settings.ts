/** Explicit per-scope deployment settings for Native application fixtures.
 * Readers stay live across object eviction; fixture ownership removes them.
 * No entry here means the Worker's original environment is used unchanged. */
export const applicationTrustSettings = new Map<string, () => unknown>();
