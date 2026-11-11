/** Application-owned recorded presence. No journal scan or native extension. */
import type { FactRef, Item, MemberRef } from "@generalbusiness/dap-contract";
import { isFactRef, isMemberRef } from "@generalbusiness/dap-bytes";

export const PRESENCE_LIMIT = 32;
export interface Presence { member: MemberRef; room: number; since: FactRef }
/** Only known present reports. Missing/unknown items are not proof of absence. */
export function sitePresence(items: readonly Item[], localFact: (position: number) => FactRef): Presence[] {
  return items.flatMap(item => item.type === "presence" && item.state === "present"
    && isMemberRef(item.parties["member"]) && typeof item.refs["room"] === "number"
    && (typeof item.refs["reportedAt"] === "number" || isFactRef(item.refs["reportedAt"]))
    ? [{ member: item.parties["member"] as MemberRef, room: item.refs["room"],
      since: typeof item.refs["reportedAt"] === "number" ? localFact(item.refs["reportedAt"]) : item.refs["reportedAt"] as FactRef }] : []);
}
