import type { Projection } from "./types.ts";

/** Whether a card's title opens its detail. An incomplete card holds entries a
 * person can read, and session.ts removes its acts. An unavailable placeholder
 * holds no detail, and offers Retry read instead. */
export function cardOpens(status: Projection["status"]): boolean {
  return status === "ready" || status === "incomplete";
}
